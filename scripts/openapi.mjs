import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const outputDir = resolve(root, 'artifacts');
const jsonPath = resolve(outputDir, 'openapi.json');
const yamlPath = resolve(outputDir, 'openapi.yaml');
const check = process.argv[2] === 'check';

if (check) {
  const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const [{ NestFactory }, { FastifyAdapter }, { AppModule }, openApiModule, routingModule, requestModule] = await Promise.all([
  import('@nestjs/core'),
  import('@nestjs/platform-fastify'),
  import('../dist/app.module.js'),
  import('../dist/common/openapi.js'),
  import('../dist/common/api-routing.js'),
  import('../dist/common/http/request-id.js'),
]);

const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
routingModule.configureApiRouting(app);
requestModule.configureRequestCorrelation(app);
await app.init();
const document = openApiModule.createOpenApiDocument(app);
await app.close();

validateDocument(document);
const json = `${JSON.stringify(document, null, 2)}\n`;
const yaml = `${YAML.stringify(document, { lineWidth: 0 })}`;
validateDocument(YAML.parse(yaml));

if (check) {
  const [currentJson, currentYaml] = await Promise.all([
    readFile(jsonPath, 'utf8').catch(() => ''),
    readFile(yamlPath, 'utf8').catch(() => ''),
  ]);
  if (currentJson !== json || currentYaml !== yaml) {
    console.error('OpenAPI artifacts are stale. Run pnpm openapi:generate and review the contract diff.');
    process.exitCode = 1;
  } else {
    console.log('OpenAPI artifacts are valid and up to date.');
  }
} else {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([writeFile(jsonPath, json), writeFile(yamlPath, yaml)]);
  console.log('Generated artifacts/openapi.json and artifacts/openapi.yaml.');
}

function validateDocument(value) {
  if (value.openapi !== '3.1.0') throw new Error(`Expected OpenAPI 3.1.0; got ${value.openapi}`);
  if (value.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base') {
    throw new Error('Missing OpenAPI 3.1 JSON Schema dialect declaration.');
  }
  if (!value.paths || Object.keys(value.paths).length === 0) throw new Error('OpenAPI document has no routes.');
  for (const [path, pathItem] of Object.entries(value.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)) continue;
      if (!operation.operationId) throw new Error(`Missing operationId for ${method.toUpperCase()} ${path}`);
      if (!operation.responses || Object.keys(operation.responses).length === 0) {
        throw new Error(`Missing responses for ${method.toUpperCase()} ${path}`);
      }
    }
  }
}
