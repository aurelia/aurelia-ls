import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { createMessageConnection } from 'vscode-jsonrpc/node';
import { AURELIA_WORKER_PROGRESS_SCHEMA } from '@aurelia-ls/language-server/protocol';
import { createWorkerCancellationStrategy, createWorkerMessageTransports } from '../../out/worker-transport.js';

const workspace = path.resolve(process.argv[2]);
const mode = process.argv[3] ?? 'unrelated';
if (mode !== 'unrelated' && mode !== 'captured') throw new Error('Unknown heap-stress workload.');
const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const temporaryParent = path.resolve(packageRoot, '../semantic-runtime/.temp');
if (path.dirname(workspace) !== temporaryParent || !path.basename(workspace).startsWith('vscode-worker-heap-')) {
  throw new Error('Expected a uniquely owned semantic-runtime heap-stress fixture.');
}
const sourceRoot = path.join(workspace, 'src');
mkdirSync(sourceRoot, { recursive: true });
const write = (name, text) => writeFileSync(path.join(workspace, name), text);
write('package.json', JSON.stringify({
  name: 'worker-heap-stress', private: true, type: 'module', dependencies: { aurelia: '2.0.0-rc.1' },
}));
write('tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM'],
    strict: true, skipLibCheck: true, experimentalDecorators: true, noEmit: true,
  },
  include: ['src'],
}));
write('src/assets.d.ts', "declare module '*.html' { const template: string; export default template; }\n");
// Both unrelated closure captures and genuinely used data previously grew with registry size times call count.
write('src/data.ts', `export const registry = {\n${Array.from({ length: 2000 }, (_, index) =>
  `item${index}: { id: ${index}, name: 'Item ${index}', stats: { attack: ${index % 10}, defense: ${index % 5} } },`
).join('\n')}\n};\n`);
write('src/helpers.ts', `import { registry } from './data';
export function identity(value: number) { return value; }
export const data = registry;
${mode === 'captured' ? `const arrayRegistry = Object.values(registry);
function lookup(value: number) { return registry.item0.id + value; }
function argument(value: typeof registry) { return value.item0.id; }
function envelope(value: number) { return { registry, value }; }
function arrayLookup(value: number) { return arrayRegistry[0].id + value; }` : ''}
${Array.from({ length: 100 }, (_, index) => {
  const expression = mode === 'unrelated' ? `identity(${index})`
    : [`lookup(${index})`, 'argument(registry)', `envelope(${index})`, `arrayLookup(${index})`][index % 4];
  return `export const result${index} = ${expression};`;
}).join('\n')}
`);
for (let index = 0; index < 5; index++) {
  write(`src/item-${index}.ts`, `import { customElement, bindable } from '@aurelia/runtime-html';
import template from './item-${index}.html';
@customElement({ name: 'item-${index}', template })
export class Item${index} { @bindable value = 'value'; title = 'Item ${index}'; }
`);
  write(`src/item-${index}.html`, '<template><span>${title}: ${value}</span><span>${title}: ${value}</span></template>\n');
}
const template = `<template>${Array.from({ length: 5 }, (_, index) =>
  `<item-${index} value.bind="message"></item-${index}>`
).join('\n')}</template>\n`;
write('src/app.html', template);
write('src/app.ts', `import { customElement } from '@aurelia/runtime-html';
import template from './app.html';
${Array.from({ length: 5 }, (_, index) => `import { Item${index} } from './item-${index}';`).join('\n')}
import { data } from './helpers';
@customElement({ name: 'stress-app', template, dependencies: [Item0, Item1, Item2, Item3, Item4] })
export class StressApp { message = 'hello'; registry = data; }
`);
write('src/main.ts', `import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StressApp } from './app';
new Aurelia().register(StandardConfiguration).app({ host: document.body, component: StressApp }).start();
`);

const configuredOldGenerationMiB = 768;
const workerErrors = [];
let workerOnlineCount = 0;
let logs = '';
const appendLog = (text) => { logs = `${logs}${text}`.slice(-16384); };
const server = fileURLToPath(new URL('../../../language-server/out/main.js', import.meta.url));
const transport = createWorkerMessageTransports(server, {
  createWorker: (module) => new Worker(module, {
    stdout: true, stderr: true, execArgv: [],
    workerData: { aureliaWorkerProgress: AURELIA_WORKER_PROGRESS_SCHEMA },
    resourceLimits: { maxOldGenerationSizeMb: configuredOldGenerationMiB, maxYoungGenerationSizeMb: 16 },
  }),
  onEvent: (event) => {
    if (event.type === 'online') workerOnlineCount++;
    else if (event.type === 'stdout' || event.type === 'stderr') appendLog(event.text);
    else if (event.type === 'error') workerErrors.push({
      code: event.error.code ?? null, message: event.error.message, lastProgress: event.lastProgress ?? null,
    });
  },
});
// Production unrefs its Worker; this standalone host must remain alive through the exit handshake.
const keepAlive = setInterval(() => undefined, 1000);
const connection = createMessageConnection(transport.reader, transport.writer, undefined, {
  cancellationStrategy: createWorkerCancellationStrategy(),
});
connection.onNotification('window/logMessage', (params) => appendLog(`${params.message}\n`));
connection.listen();
const request = (method, params) => Promise.race([
  connection.sendRequest(method, params),
  transport.exited.then((code) => { throw new Error(`Worker exited (${code}) during ${method}: ${JSON.stringify(workerErrors)}\n${logs}`); }),
]);
try {
  const initialized = await request('initialize', {
    processId: process.pid, rootUri: pathToFileURL(workspace).href,
    capabilities: { textDocument: { hover: { contentFormat: ['markdown'] } } },
  });
  if (initialized.capabilities.hoverProvider !== true) throw new Error('Expected a real language-server hover provider.');
  await connection.sendNotification('initialized', {});
  const before = await request('aurelia/supportSnapshot', { identitySalt: randomBytes(32).toString('base64url') });
  const effectiveHeapLimitBytes = before.process.memory.heapLimitBytes;
  if (effectiveHeapLimitBytes > 800 * 1024 * 1024) throw new Error('Worker heap constraint was overridden.');
  const textDocument = { uri: pathToFileURL(path.join(sourceRoot, 'app.html')).href };
  await connection.sendNotification('textDocument/didOpen', {
    textDocument: { ...textDocument, languageId: 'html', version: 1, text: template },
  });
  const hover = await request('textDocument/hover', { textDocument, position: { line: 0, character: 13 } });
  const inventory = await request('aurelia/resourceInventory', { projectSelection: 'default-app', includeTypeSurfaces: false });
  const tokens = await request('textDocument/semanticTokens/full', { textDocument });
  const diagnostics = await request('textDocument/diagnostic', { textDocument });
  await request('shutdown', null);
  await connection.sendNotification('exit');
  const exitCode = await transport.exited;
  process.stdout.write(JSON.stringify({
    configuredOldGenerationMiB, effectiveHeapLimitBytes, hover,
    inventoryProjects: inventory.projects.map((project) => ({
      status: project.status,
      hasExpectedResources: ['stress-app', 'item-0', 'item-1', 'item-2', 'item-3', 'item-4']
        .every((name) => project.resources?.some((resource) => resource.name === name)),
    })),
    semanticTokenCount: tokens?.data?.length ?? 0,
    diagnostics: { kind: diagnostics.kind, count: diagnostics.items?.length },
    workerOnlineCount, workerErrors, exitCode,
  }));
} finally {
  clearInterval(keepAlive);
  connection.end();
  connection.dispose();
  await transport.terminate();
}
