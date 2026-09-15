import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const run = promisify(execFile);
const runtimeUrl = new URL('../out/index.js', import.meta.url).href;
const fixtureRoot = fileURLToPath(new URL('../fixtures/pressure/app-pattern-convention-minimal-app', import.meta.url));

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
