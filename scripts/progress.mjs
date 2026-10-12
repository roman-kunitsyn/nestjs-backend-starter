#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const implementation = path.join(root, 'docs/implementation');
const allowedStatuses = new Set(['pending', 'in_progress', 'blocked', 'completed']);

export function selectNextMilestone(progress) {
  const milestones = progress.milestones;
  const active = milestones.filter(({ status }) => status === 'in_progress' || status === 'blocked');
  if (active.length > 1) return null;
  if (active.length === 1) return active[0].id;
  return milestones.find(({ status, dependencies }) => status === 'pending' &&
    dependencies.every((id) => milestones.find((item) => item.id === id)?.status === 'completed'))?.id ?? null;
}

export function validateProgress({ progress, rootDir, roadmap, matrix }) {
  const errors = [];
  const milestones = progress.milestones ?? [];
  const stages = progress.stages ?? [];
  const ids = milestones.map(({ id }) => id);
  const known = new Set(ids);
  if (new Set(ids).size !== ids.length) errors.push('Milestone IDs must be unique.');
  const stageIds = stages.map(({ id }) => id);
  if (new Set(stageIds).size !== stageIds.length) errors.push('Stage IDs must be unique.');
  for (const milestone of milestones) {
    if (!allowedStatuses.has(milestone.status)) errors.push(`${milestone.id}: invalid status ${milestone.status}.`);
    if (milestone.status === 'completed' && (!milestone.completion?.date || !milestone.completion?.verification?.length)) errors.push(`${milestone.id}: completed milestone is missing its completion record.`);
    if (!stageIds.includes(milestone.stage)) errors.push(`${milestone.id}: unknown stage ${milestone.stage}.`);
    if (!milestone.contract || !exists(rootDir, path.join('docs/implementation', milestone.contract))) errors.push(`${milestone.id}: missing contract ${milestone.contract ?? '(unset)'}.`);
    else {
      const contract = readFileSync(path.join(rootDir, 'docs/implementation', milestone.contract), 'utf8');
      if (!contract.includes(`# ${milestone.id} —`)) errors.push(`${milestone.id}: contract title does not match its ID.`);
      if (!contract.includes('## Acceptance criteria') || !contract.includes('## Verification')) errors.push(`${milestone.id}: contract is missing acceptance or verification requirements.`);
    }
    for (const dependency of milestone.dependencies ?? []) {
      if (!known.has(dependency)) errors.push(`${milestone.id}: unknown dependency ${dependency}.`);
      else if (milestones.find((item) => item.id === dependency).status !== 'completed' && milestone.status === 'completed') errors.push(`${milestone.id}: completed while dependency ${dependency} is incomplete.`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`Dependency cycle includes ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of milestones.find((item) => item.id === id)?.dependencies ?? []) if (known.has(dependency)) visit(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  for (const stage of stages) {
    if (!allowedStatuses.has(stage.status)) errors.push(`${stage.id}: invalid status ${stage.status}.`);
    for (const id of stage.milestones ?? []) {
      const milestone = milestones.find((item) => item.id === id);
      if (!milestone) errors.push(`${stage.id}: unknown milestone ${id}.`);
      else if (milestone.stage !== stage.id) errors.push(`${id}: stage mismatch (${milestone.stage} vs ${stage.id}).`);
    }
    const expected = milestones.filter(({ stage: owner }) => owner === stage.id).map(({ id }) => id);
    if (expected.join(',') !== (stage.milestones ?? []).join(',')) errors.push(`${stage.id}: stage milestone order/list does not match roadmap data.`);
    const statuses = (stage.milestones ?? []).map((id) => milestones.find((item) => item.id === id)?.status);
    if (stage.status === 'completed' && statuses.some((status) => status !== 'completed')) errors.push(`${stage.id}: completed stage contains unfinished milestone.`);
    if (stage.status === 'pending' && statuses.some((status) => status === 'in_progress' || status === 'blocked' || status === 'completed')) errors.push(`${stage.id}: pending stage contains started milestone.`);
    if (stage.status === 'in_progress' && !statuses.some((status) => status === 'in_progress' || status === 'blocked')) errors.push(`${stage.id}: in_progress stage has no active/blocked milestone.`);
  }
  const active = milestones.filter(({ status }) => status === 'in_progress' || status === 'blocked');
  if (active.length > 1) errors.push('At most one milestone may be in_progress or blocked.');
  const selected = selectNextMilestone(progress);
  if (progress.project?.next_milestone !== selected) errors.push(`Wrong next milestone: recorded ${progress.project?.next_milestone ?? 'none'}, expected ${selected ?? 'none'}.`);
  if (!['preparation', 'in_progress', 'blocked', 'completed'].includes(progress.project?.status)) errors.push('Invalid project status.');
  const selectedStage = stages.find(({ milestones: stageMilestones }) => stageMilestones.includes(selected));
  const expectedProjectStatus = stages.every(({ status }) => status === 'completed') ? 'completed' :
    active.some(({ status }) => status === 'blocked') ? 'blocked' : selectedStage?.id === 'stage-00' ? 'preparation' : 'in_progress';
  if (progress.project?.status !== expectedProjectStatus) errors.push(`Project status ${progress.project?.status} is inconsistent; expected ${expectedProjectStatus}.`);
  if (selectedStage && progress.project?.current_stage !== `Stage ${selectedStage.id.slice(-2)} — ${selectedStage.title}`) errors.push(`Project current_stage does not match selected milestone ${selected}.`);
  if (!selected && !stages.every(({ status }) => status === 'completed')) errors.push('No eligible milestone exists while unfinished work remains.');
  if (progress.project?.status === 'completed' && !stages.every(({ status }) => status === 'completed')) errors.push('Project is completed while a stage remains unfinished.');
  const roadmapIds = [...roadmap.matchAll(/\|\s*\d+\s*\|\s*(M\d{3})\s*[^|]*\|/g)].map((match) => match[1]);
  if (roadmapIds.join(',') !== ids.join(',')) errors.push('Roadmap milestone ordering does not match progress.json.');
  const roadmapStages = [...roadmap.matchAll(/\|\s*\[(\d{2})\s+—/g)].map((match) => `stage-${match[1]}`);
  if (roadmapStages.join(',') !== stages.map(({ id }) => id).join(',')) errors.push('Roadmap stage ordering does not match progress.json.');
  const covered = new Set(matrix.split('\n').filter((line) => line.startsWith('|')).map((line) => line.split('|')[3] ?? '').flatMap((cell) => [...cell.matchAll(/M\d{3}/g)].map((item) => item[0])));
  for (const id of ids) if (!covered.has(id)) errors.push(`Requirements matrix does not cover ${id}.`);
  return errors;
}

function exists(base, relative) {
  const target = path.resolve(base, relative);
  return Boolean(base) && target.startsWith(`${path.resolve(base)}${path.sep}`) && existsSync(target);
}

export function renderDashboard(progress) {
  const { project, stages, milestones } = progress;
  const selected = selectNextMilestone(progress);
  const active = milestones.find(({ id }) => id === selected);
  const lines = ['# Implementation progress', '', '> Generated from `progress.json` by `pnpm progress:dashboard`. Do not edit by hand.', '',
    `**Project status:** ${project.status}`, `**Current stage:** ${project.current_stage}`,
    `**Next milestone:** ${active ? `${active.id} — ${active.title} (${active.status})` : 'none'}`, '', '## Stage 00 — Preparation', '',
    '| ID | Milestone | Status | Dependencies |', '| --- | --- | --- | --- |'];
  for (const item of milestones.filter(({ stage }) => stage === 'stage-00')) lines.push(`| ${item.id} | ${item.title} | ${item.status} | ${item.dependencies.join(', ') || '—'} |`);
  lines.push('', '## Implementation stages', '', '| Stage | Title | Milestones | Status |', '| --- | --- | --- | --- |');
  for (const stage of stages.filter(({ id }) => id !== 'stage-00')) {
    const range = stage.milestones.length > 1 ? `${stage.milestones[0]}–${stage.milestones.at(-1)}` : stage.milestones[0];
    lines.push(`| ${stage.id.replace('stage-', '')} | ${stage.title} | ${range} | ${stage.status} |`);
  }
  lines.push('', `Stage 00 is ${stages.find(({ id }) => id === 'stage-00')?.status}. M004 validates tracking and execution readiness; M005 begins application implementation.`, '');
  return lines.join('\n');
}

async function main() {
  const command = process.argv[2] ?? 'validate';
  const progress = JSON.parse(await readFile(path.join(implementation, 'progress.json'), 'utf8'));
  if (command === 'dashboard') {
    await writeFile(path.join(implementation, 'progress.md'), renderDashboard(progress));
    return;
  }
  const [roadmap, matrix, dashboard] = await Promise.all([
    readFile(path.join(implementation, 'roadmap.md'), 'utf8'),
    readFile(path.join(implementation, 'requirements-matrix.md'), 'utf8'),
    readFile(path.join(implementation, 'progress.md'), 'utf8'),
  ]);
  const errors = validateProgress({ progress, rootDir: root, roadmap, matrix });
  if (dashboard !== renderDashboard(progress)) errors.push('progress.md is stale; run pnpm progress:dashboard.');
  if (command === 'select') {
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; return; }
    console.log(selectNextMilestone(progress) ?? 'No eligible milestone.');
    return;
  }
  if (command !== 'validate') { console.error(`Unknown command: ${command}`); process.exitCode = 2; return; }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; return; }
  console.log(`Progress valid. Next milestone: ${selectNextMilestone(progress) ?? 'none'}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
