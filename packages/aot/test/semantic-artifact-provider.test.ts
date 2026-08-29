import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  SemanticAotArtifactProvider,
  type SemanticAotBuildSession,
} from '../src/index.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const fixtureRoot = path.resolve(
  repositoryRoot,
  'packages/semantic-runtime/fixtures/pressure/app-pattern-convention-minimal-app',
);
const templatePath = path.resolve(fixtureRoot, 'src/my-app.html');
const temporaryDirectories: string[] = [];
const provider = new SemanticAotArtifactProvider();
let session: SemanticAotBuildSession;

beforeAll(async () => {
  session = await provider.openBuild({
    root: fixtureRoot,
    mode: 'production',
    environmentName: 'client',
    sourcemap: true,
  });
});

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

describe('semantic AOT artifact provider', () => {
  it('detaches a real paired-file compiler handoff and emits one executable template module', async () => {
    const artifact = await session.artifactFor({ sourcePath: templatePath });

    expect(artifact.sourcePath).toBe(templatePath);
    expect(artifact.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(artifact.map.sources).toEqual([templatePath]);
    expect(artifact.map.sourcesContent[0]).toContain('${message}');
    expect(artifact.code).toContain('needsCompile: false');
    expect(artifact.code).toContain('$document.createComment("au")');
    expect(artifact.code).toContain('"$kind": "AccessScope"');

    const outputRoot = await mkdtemp(path.resolve(repositoryRoot, 'packages/aot/.tmp-artifact-'));
    temporaryDirectories.push(outputRoot);
    const outputPath = path.resolve(outputRoot, 'my-app.aot.mjs');
    await writeFile(outputPath, artifact.code, 'utf8');
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const previousDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
    let module: {
      readonly name: string;
      readonly template: HTMLTemplateElement;
      readonly needsCompile: boolean;
      readonly instructions: readonly (readonly { readonly type: number; readonly from: unknown }[])[];
    };
    try {
      module = await import(`${pathToFileURL(outputPath).href}?digest=${artifact.digest}`) as typeof module;
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: previousDocument });
      dom.window.close();
    }

    expect(module.name).toBe('my-app');
    expect(module.needsCompile).toBe(false);
    expect(module.template.outerHTML).toBe('<template><main>\n  <h1><!--au--> </h1>\n</main>\n</template>');
    expect(module.instructions).toEqual([[{
      type: 30,
      from: { $kind: 'AccessScope', name: 'message', ancestor: 0 },
    }]]);
    expect(provider.evidence()).toMatchObject({
      analysisCount: 1,
      artifacts: [{ sourcePath: templatePath, definitionName: 'my-app', needsCompile: false }],
    });
  }, 15_000);

  it('fails closed for a template that does not belong to the analyzed project', async () => {
    await expect(session.artifactFor({ sourcePath: path.resolve(fixtureRoot, 'src/missing.html') }))
      .rejects.toMatchObject({ code: 'AOT_ARTIFACT_INVALID_HANDOFF' });
  }, 15_000);
});
