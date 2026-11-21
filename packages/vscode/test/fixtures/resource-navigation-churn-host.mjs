import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { CancellationTokenSource, createMessageConnection } from 'vscode-jsonrpc/node';
import { AURELIA_WORKER_PROGRESS_SCHEMA } from '@aurelia-ls/language-server/protocol';
import { LspFacade } from '../../out/core/lsp-facade.js';
import { openResourceNavigation } from '../../out/features/resource-discovery/navigation.js';
import { createWorkerCancellationStrategy, createWorkerMessageTransports } from '../../out/worker-transport.js';

const workspace = path.resolve(process.argv[2]);
const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const temporaryParent = path.resolve(packageRoot, '../semantic-runtime/.temp');
if (path.dirname(workspace) !== temporaryParent || !path.basename(workspace).startsWith('vscode-worker-navigation-')) {
  throw new Error('Expected a uniquely owned semantic-runtime navigation fixture.');
}
mkdirSync(path.join(workspace, 'src'), { recursive: true });
const write = (name, text) => writeFileSync(path.join(workspace, name), text);
write('package.json', JSON.stringify({
  name: 'worker-navigation-churn', private: true, type: 'module', dependencies: { aurelia: '2.0.0-rc.1' },
}));
write('tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM'],
    strict: true, skipLibCheck: true, experimentalDecorators: true, noEmit: true,
  },
  include: ['src'],
}));
write('src/assets.d.ts', "declare module '*.html' { const template: string; export default template; }\n");
const componentCount = 20;
const componentText = (index, edit = 0) => `import { customElement, bindable } from '@aurelia/runtime-html';
import template from './item-${index}.html';
@customElement({ name: 'item-${index}', template })
export class Item${index} { @bindable value = 'value-${edit}'; }
`;
for (let index = 0; index < componentCount; index++) {
  write(`src/item-${index}.ts`, componentText(index));
  write(`src/item-${index}.html`, '<template><span>${value}</span></template>\n');
}
write('src/app.html', `<template>${Array.from({ length: componentCount }, (_, index) =>
  `<item-${index} value.bind="message"></item-${index}>`
).join('\n')}</template>\n`);
const appText = `import { customElement } from '@aurelia/runtime-html';
import template from './app.html';
${Array.from({ length: componentCount }, (_, index) => `import { Item${index} } from './item-${index}';`).join('\n')}
@customElement({ name: 'navigation-app', template, dependencies: [${Array.from({ length: componentCount }, (_, index) => `Item${index}`).join(',')}] })
export class NavigationApp { message = 'hello'; }
`;
write('src/app.ts', appText);
write('src/main.ts', `import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { NavigationApp } from './app';
new Aurelia().register(StandardConfiguration).app({ host: document.body, component: NavigationApp }).start();
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
// Production unrefs the Worker. Keep this isolated host alive, but bound even a stuck worker or shutdown.
const keepAlive = setInterval(() => undefined, 1000);
const watchdog = setTimeout(() => {
  appendLog('Navigation Worker exceeded its 45 second watchdog.\n');
  void transport.terminate();
}, 45_000);
const connection = createMessageConnection(transport.reader, transport.writer, undefined, {
  cancellationStrategy: createWorkerCancellationStrategy(),
});
connection.onNotification('window/logMessage', (params) => appendLog(`${params.message}\n`));
connection.onNotification('aurelia/analysisChanged', () => undefined);
connection.onNotification('textDocument/publishDiagnostics', () => undefined);
connection.listen();
const request = (...args) => Promise.race([
  connection.sendRequest(...args),
  transport.exited.then((code) => {
    throw new Error(`Worker exited (${code}) during ${String(args[0])}: ${JSON.stringify(workerErrors)}\n${logs}`);
  }),
]);

const wireCalls = [];
const navigationTokens = new Set();
const client = {
  sendRequest(...args) {
    wireCalls.push({ method: args[0], arity: args.length, tokenSupplied: args[2] != null });
    if (args[2] != null) navigationTokens.add(args[2]);
    // Faithfully preserve LanguageClient's variadic argument shape, including token-less requests.
    return request(...args);
  },
  onNotification: (method, callback) => connection.onNotification(method, callback),
};
const session = {
  workspace: { key: workspace, uri: pathToFileURL(workspace).href, name: 'worker-navigation-churn' },
  incarnation: 1, client,
};
const clients = {
  sessions: [session], sessionForUri: () => session,
  onDidChangeSessions: () => ({ dispose() {} }),
};
const requestFailures = [];
const logger = {
  child() { return this; }, debug() {},
  warn(event, detail, error) {
    if (event === 'request.failed') requestFailures.push({ ...detail, message: error?.message });
  },
};
const facade = new LspFacade(clients, logger);
let navigationCancellations = 0;
class NavigationCancellationTokenSource extends CancellationTokenSource {
  cancel() { navigationCancellations++; super.cancel(); }
}
class Position {
  constructor(line, character) { this.line = line; this.character = character; }
}
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
}
const openedDocuments = [];
const shownDocuments = [];
const informationMessages = [];
const vscode = {
  CancellationTokenSource: NavigationCancellationTokenSource,
  Uri: { parse: (value) => new URL(value) }, Position, Range, ViewColumn: { Beside: -2 },
  workspace: {
    async openTextDocument(uri) {
      openedDocuments.push(uri.href);
      return { uri, getText: () => readFileSync(fileURLToPath(uri), 'utf8') };
    },
  },
  window: {
    async showTextDocument(document, options) { shownDocuments.push({ uri: document.uri.href, ...options }); },
    async showInformationMessage(message) { informationMessages.push(message); },
  },
};
function inventoryProject(snapshot) {
  const selected = snapshot?.workspaces[0];
  const project = selected?.status === 'ready'
    ? selected.response.projects.find((candidate) => candidate.status === 'ready') : undefined;
  if (project == null) throw new Error(`Expected a ready isolated project: ${JSON.stringify(snapshot)}`);
  return { workspace: selected, project };
}
try {
  await request('initialize', { processId: process.pid, rootUri: session.workspace.uri, capabilities: {} });
  await connection.sendNotification('initialized', {});
  const cold = inventoryProject(await facade.getResourceInventory({ projectSelection: 'default-app' }));
  const target = cold.project.resources.find((resource) => resource.name === 'navigation-app');
  if (target?.navigation.state !== 'available') throw new Error('Missing authored navigation target.');
  const navigationRequest = {
    workspaceKey: session.workspace.key, projectKey: cold.project.project.projectKey,
    fingerprint: cold.workspace.response.fingerprint, resourceIdentityKey: target.identityKey, role: 'resource',
  };
  const notifications = [];
  const navigations = [];
  // One host turn makes supersession deterministic: no predecessor can resume its await and focus the editor
  // before all four intents have been issued. The real Worker concurrently observes changed files and tokens.
  for (let index = 0; index < 4; index++) {
    write(`src/item-${index}.ts`, componentText(index, index + 1));
    const changes = [{ uri: pathToFileURL(path.join(workspace, `src/item-${index}.ts`)).href, type: 2 }];
    if (index === 3) {
      write('src/app.ts', `// current navigation target\n\n${appText}`);
      changes.push({ uri: pathToFileURL(path.join(workspace, 'src/app.ts')).href, type: 2 });
    }
    notifications.push(connection.sendNotification('workspace/didChangeWatchedFiles', { changes }));
    navigations.push(openResourceNavigation(vscode, facade, logger, navigationRequest));
  }
  await Promise.all(notifications);
  const outcomes = await Promise.all(navigations);
  const current = inventoryProject(await facade.getResourceInventory({ projectSelection: 'default-app' }));
  const currentTarget = current.project.resources.find((resource) => resource.identityKey === target.identityKey);
  if (currentTarget?.navigation.state !== 'available') throw new Error('Missing current authored navigation target.');
  const support = await request('aurelia/supportSnapshot', { identitySalt: randomBytes(32).toString('base64url') });
  await request('shutdown', null);
  await connection.sendNotification('exit');
  const exitCode = await transport.exited;
  process.stdout.write(JSON.stringify({
    configuredOldGenerationMiB, effectiveHeapLimitBytes: support.process.memory.heapLimitBytes,
    outcomes, openedDocuments, shownDocuments, informationMessages, navigationCancellations,
    navigationTokenCount: navigationTokens.size,
    cancelledNavigationTokens: [...navigationTokens].filter((token) => token.isCancellationRequested).length,
    wireCalls, requestFailures,
    inventoryRequests: support.requests.aggregates.find((aggregate) => aggregate.feature === 'resourceInventory'),
    fingerprintChanged: current.workspace.response.fingerprint !== cold.workspace.response.fingerprint,
    coldLocation: target.navigation.location, currentLocation: currentTarget.navigation.location,
    hasExpectedResources: ['navigation-app', ...Array.from({ length: componentCount }, (_, index) => `item-${index}`)]
      .every((name) => current.project.resources.some((resource) => resource.name === name)),
    hasNullTokenFailure: logs.includes("Cannot read properties of null (reading 'isCancellationRequested')"),
    workerOnlineCount, workerErrors, exitCode,
  }));
} finally {
  clearInterval(keepAlive);
  clearTimeout(watchdog);
  facade.dispose();
  connection.end();
  connection.dispose();
  await transport.terminate();
}
