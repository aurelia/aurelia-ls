import { runPromotedBaseline } from './baseline.js';

const [command, ...arguments_] = process.argv.slice(2);

if (command !== 'baseline' || arguments_.length > 0) {
  throw new Error('Usage: node out/cli.js baseline');
}

const outcome = await runPromotedBaseline();
process.stdout.write([
  `[aot-benchmark] Completed ${outcome.runId}`,
  `[aot-benchmark] Run: ${outcome.runFile.path}`,
  `[aot-benchmark] Result: ${outcome.resultFile.path}`,
  `[aot-benchmark] Report: ${outcome.reportFile.path}`,
  `[aot-benchmark] Root: ${outcome.runRoot}`,
  '',
].join('\n'));
