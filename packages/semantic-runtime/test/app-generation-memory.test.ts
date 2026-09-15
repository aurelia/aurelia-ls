import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const run = promisify(execFile);
const runtimeUrl = new URL('../out/index.js', import.meta.url).href;
const fixtureRoot = fileURLToPath(new URL('../fixtures/pressure/app-pattern-convention-minimal-app', import.meta.url));

test('releases unused snapshot state while the generation pool remains alive', async () => {
  const script = `
    import { setImmediate } from 'node:timers/promises';
    import { StaticDataSnapshotPool, dataSnapshotIndex } from ${JSON.stringify(new URL('../out/evaluation/data-snapshot.js', import.meta.url).href)};
    import { StaticEvaluationSessionFork } from ${JSON.stringify(new URL('../out/evaluation/evaluation-session.js', import.meta.url).href)};
    import { EvaluationObjectValue, EvaluationObjectProperty, EvaluationNumberValue } from ${JSON.stringify(new URL('../out/evaluation/values.js', import.meta.url).href)};
    const pool = new StaticDataSnapshotPool();
    const host = {};
    const create = () => {
      const child = new EvaluationObjectValue(new Map([['count', new EvaluationObjectProperty('count', new EvaluationNumberValue(1), null, 0)]]), false);
      const source = new EvaluationObjectValue(new Map([['child', new EvaluationObjectProperty('child', child, null, 0)]]), false);
      const record = pool.capture(source, host);
      const index = dataSnapshotIndex(record);
      const first = new StaticEvaluationSessionFork(host, 'complete', pool);
      const view = first.forkValue(source);
      const second = new StaticEvaluationSessionFork(host);
      const next = second.forkValue(view);
      return [source, child, record, index, first, view, second, next].map(value => new WeakRef(value));
    };
    const references = create();
    for (let attempt = 0; attempt < 4; attempt++) { await setImmediate(); globalThis.gc(); }
    console.log(JSON.stringify({ released: references.every(reference => reference.deref() == null), retainedPoolStatesCreated: pool.createdStateCount }));
  `;
  const { stdout } = await run(process.execPath, ['--expose-gc', '--input-type=module', '-e', script], {
    timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  expect(JSON.parse(stdout.trim())).toEqual({ released: true, retainedPoolStatesCreated: 2 });
}, 35_000);

test.each(['clear', 'dispose-app'] as const)(
  'releases the app object graph after %s without requiring another app lookup',
  async (mode) => {
    const script = `
      import { setImmediate } from 'node:timers/promises';
      import { createSemanticRuntime } from ${JSON.stringify(runtimeUrl)};
      const runtime = await createSemanticRuntime({ workspaceRoot: ${JSON.stringify(fixtureRoot)} });
      let app = await runtime.openApp({ analysisDepth: 'binding-observation', templateAnalysisBreadth: 'resource-local' });
      const projectKey = app.project.projectKey;
      const generation = new WeakRef(runtime.appAnalysisComputations.authorityFor(projectKey).current());
      const emission = new WeakRef(app.emission);
      app = null;
      if (${JSON.stringify(mode)} === 'clear') {
        runtime.clearAnalysisCache();
      } else {
        await runtime.answerAppQuery({ kind: 'app-diagnostics', projectKey, templateAnalysisBreadth: 'resource-local', appRetention: 'dispose-app' });
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        await setImmediate();
        globalThis.gc();
      }
      // Keep the session reachable. Only its retired app graph should have been released.
      console.log(JSON.stringify({ generationReleased: generation.deref() == null, emissionReleased: emission.deref() == null, workspaceAlive: runtime.workspace.projects.length > 0 }));
    `;
    const { stdout } = await run(process.execPath, ['--expose-gc', '--input-type=module', '-e', script], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    expect(JSON.parse(stdout.trim())).toEqual({
      generationReleased: true,
      emissionReleased: true,
      workspaceAlive: true,
    });
  },
  65_000,
);
