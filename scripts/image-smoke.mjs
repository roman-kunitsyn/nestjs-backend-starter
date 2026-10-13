#!/usr/bin/env node
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const image = process.env.IMAGE_SMOKE_TAG ?? 'nestjs-backend-starter:local';
const name = `nestjs-backend-starter-smoke-${process.pid}`;
const databaseUrl =
  process.env.IMAGE_SMOKE_DATABASE_URL ??
  'postgresql://app:local_dev_only_change_me@host.docker.internal:5432/app';
const keyPair = generateKeyPairSync('ed25519');
const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' });
const secret = () => randomBytes(32).toString('base64url');
const childEnv = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: databaseUrl,
  AUTH_JWT_PRIVATE_KEY: privateKey,
  AUTH_JWT_PUBLIC_KEY: publicKey,
  AUTH_REFRESH_TOKEN_KEY: secret(),
  RESOURCE_CURSOR_SECRET: secret(),
  SMTP_HOST: '127.0.0.1',
  SMTP_USER: 'image-smoke',
  SMTP_PASSWORD: secret(),
  SMTP_FROM: 'image-smoke@example.invalid',
};

function docker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    env: childEnv,
    timeout: options.timeout ?? 40_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `docker ${args[0]} failed`);
  }
  return result.stdout.trim();
}

async function waitForHealth(port) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const startup = await fetch(`http://127.0.0.1:${port}/health/startup`);
      const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (startup.ok && ready.ok) return;
      lastError = `startup=${startup.status}, readiness=${ready.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `image did not become ready within 30s (${lastError ?? 'no response'})`,
  );
}

let container;
try {
  container = docker([
    'run',
    '--detach',
    '--name',
    name,
    '--publish',
    '127.0.0.1::3000',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,size=16m,mode=1777',
    '--add-host',
    'host.docker.internal:host-gateway',
    '--env',
    'NODE_ENV',
    '--env',
    'DATABASE_URL',
    '--env',
    'AUTH_JWT_PRIVATE_KEY',
    '--env',
    'AUTH_JWT_PUBLIC_KEY',
    '--env',
    'AUTH_REFRESH_TOKEN_KEY',
    '--env',
    'RESOURCE_CURSOR_SECRET',
    '--env',
    'SMTP_HOST',
    '--env',
    'SMTP_USER',
    '--env',
    'SMTP_PASSWORD',
    '--env',
    'SMTP_FROM',
    image,
  ]);
  const portMapping = docker(['port', container, '3000/tcp']);
  const port = Number(portMapping.match(/:(\d+)$/)?.[1]);
  if (!port)
    throw new Error(
      `could not determine published container port: ${portMapping}`,
    );

  await waitForHealth(port);
  docker([
    'exec',
    container,
    'node',
    '-e',
    "const fs=require('node:fs');const p=JSON.parse(fs.readFileSync('/app/package.json'));if(process.getuid()!==1000||p.devDependencies||p.scripts||fs.existsSync('/app/src')||fs.existsSync('/app/test')||fs.existsSync('/app/scripts')||fs.existsSync('/app/node_modules/.pnpm/lock.yaml')||fs.existsSync('/app/node_modules/.bin/nest')||fs.existsSync('/app/node_modules/.bin/drizzle-kit'))process.exit(1)",
  ]);
  docker(['stop', '--time', '30', container]);
  const state = JSON.parse(
    docker(['inspect', container, '--format', '{{json .State}}']),
  );
  if (state.ExitCode !== 0 || state.OOMKilled || state.Error) {
    throw new Error(`container did not stop cleanly: ${JSON.stringify(state)}`);
  }
  console.log(
    'Image smoke passed: read-only root, non-root production runtime, readiness, and SIGTERM shutdown.',
  );
} catch (error) {
  if (container) {
    const logs = spawnSync('docker', ['logs', container], {
      encoding: 'utf8',
      env: childEnv,
      timeout: 5_000,
    });
    if (logs.stdout || logs.stderr) {
      console.error(
        `Container startup output:\n${logs.stdout ?? ''}${logs.stderr ?? ''}`,
      );
    }
  }
  throw error;
} finally {
  if (container)
    spawnSync('docker', ['rm', '--force', container], { stdio: 'ignore' });
}
