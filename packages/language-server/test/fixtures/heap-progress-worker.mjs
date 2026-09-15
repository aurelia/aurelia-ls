import { parentPort } from 'node:worker_threads';
import { getHeapStatistics } from 'node:v8';
import { installWorkerProgress } from '../../out/worker-progress.js';
import { observeSemanticRuntimePhase } from '../../../semantic-runtime/out/index.js';

installWorkerProgress((message) => parentPort.postMessage(message));
if (getHeapStatistics().heap_size_limit > 200 * 1024 * 1024) throw new Error('Heap test requires an isolated 128 MiB Worker limit.');
parentPort.postMessage({ jsonrpc: '2.0', method: 'test/ready' });
observeSemanticRuntimePhase('static-evaluation', () => {
  const retained = [];
  while (true) retained.push(new Array(128 * 1024).fill(retained.length));
});
