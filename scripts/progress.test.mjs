import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateProgress, selectNextMilestone } from './progress.mjs';

const rootDir = path.resolve(import.meta.dirname, '..');
const [progressJson, roadmap, matrix] = await Promise.all([
  readFile(path.join(rootDir, 'docs/implementation/progress.json'), 'utf8'),
  readFile(path.join(rootDir, 'docs/implementation/roadmap.md'), 'utf8'),
  readFile(path.join(rootDir, 'docs/implementation/requirements-matrix.md'), 'utf8'),
]);
const baseline = JSON.parse(progressJson);
const input = (progress) => ({ progress, rootDir, roadmap, matrix });
const broken = (mutate, fragment) => {
  const progress = structuredClone(baseline);
  mutate(progress);
  assert.ok(validateProgress(input(progress)).some((error) => error.includes(fragment)));
};

test('valid repository progress selects the earliest eligible milestone', () => {
  assert.deepEqual(validateProgress(input(baseline)), []);
  assert.equal(selectNextMilestone(baseline), baseline.project.next_milestone);
});

test('rejects duplicate milestone IDs', () => broken((p) => { p.milestones[1].id = p.milestones[0].id; }, 'unique'));
test('rejects invalid milestone status', () => broken((p) => { p.milestones[4].status = 'started'; }, 'invalid status'));
test('rejects unknown dependency references', () => broken((p) => { p.milestones[4].dependencies = ['M999']; }, 'unknown dependency'));
test('rejects dependency cycles', () => broken((p) => { p.milestones[0].dependencies = ['M004']; }, 'Dependency cycle'));
test('rejects multiple active milestones', () => broken((p) => { p.milestones[5].status = 'in_progress'; p.milestones[6].status = 'in_progress'; p.stages[1].status = 'in_progress'; }, 'At most one'));
test('rejects completed milestones with incomplete dependencies', () => broken((p) => { p.milestones[7].status = 'completed'; }, 'incomplete'));
test('rejects an incorrect recorded next milestone', () => broken((p) => { p.project.next_milestone = 'M004'; }, 'Wrong next milestone'));
test('resumes blocked work before pending milestones', () => {
  const progress = structuredClone(baseline);
  progress.milestones[5].status = 'blocked';
  assert.equal(selectNextMilestone(progress), 'M005');
});
test('resumes in-progress work before pending milestones', () => {
  const progress = structuredClone(baseline);
  progress.milestones[5].status = 'in_progress';
  assert.equal(selectNextMilestone(progress), 'M005');
});
