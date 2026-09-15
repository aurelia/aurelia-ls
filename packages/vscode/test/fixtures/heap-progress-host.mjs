import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { createWorkerMessageTransports } from '../../out/worker-transport.js';

const fixture = fileURLToPath(new URL('../../../language-server/test/fixtures/heap-progress-worker.mjs', import.meta.url));
const messages = [];
let failure = null;
const transport = createWorkerMessageTransports(fixture, {
  createWorker: (module) => new Worker(module, {
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16 }, stdout: true, stderr: true,
  }),
  onEvent: (event) => {
    if (event.type === 'error') {
      failure = { code: event.error.code ?? null, message: event.error.message, lastProgress: event.lastProgress ?? null };
    }
  },
});
transport.reader.listen((message) => { messages.push(message); });
const deadline = setTimeout(() => { throw new Error('Heap fixture exceeded its deadline.'); }, 20_000);
try {
  const exitCode = await transport.exited;
  process.stdout.write(JSON.stringify({ exitCode, failure, messages }));
} finally {
  clearTimeout(deadline);
  transport.reader.dispose();
  transport.writer.dispose();
  await transport.terminate();
}
