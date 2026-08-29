import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const componentPath = path.resolve(fixtureRoot, 'src/my-app.ts');
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

  it('transforms the owning resource module and serves resource-addressed patch modules', async () => {
    const code = await readFile(componentPath, 'utf8');
    const transformed = await session.transformSource({ sourcePath: componentPath, code });

    expect(transformed).not.toBeNull();
    expect(transformed?.sourcePath).toBe(componentPath);
    expect(transformed?.resources).toHaveLength(1);
    expect(transformed?.resources[0]).toMatchObject({
      definitionName: 'my-app',
      carrierKind: 'convention',
      payloadDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      payloadSpecifier: expect.stringMatching(/^virtual:aurelia-aot\/payload\/[0-9a-f]{64}$/u),
    });
    expect(transformed?.code).toContain('applyCompiledCustomElement as __auAotApply');
    expect(transformed?.code).toContain('__auAotApply(MyApp, __auAotPatch0);');
    expect(transformed?.map.sources.map(normalizePath)).toEqual([normalizePath(componentPath)]);
    expect(transformed?.map.sourcesContent).toEqual([code]);

    const payloadSpecifier = transformed!.resources[0]!.payloadSpecifier;
    const payload = await session.virtualModuleFor({ specifier: payloadSpecifier });
    expect(payload).toMatchObject({
      specifier: payloadSpecifier,
      digest: transformed!.resources[0]!.payloadDigest,
      map: expect.objectContaining({ sources: [templatePath] }),
    });
    expect(payload?.code).toContain('export default $definition0;');
    expect(payload?.code).not.toContain('export const dependencies');

    const runtime = await session.virtualModuleFor({ specifier: transformed!.runtimeModuleSpecifier });
    expect(runtime).toMatchObject({
      specifier: 'virtual:aurelia-aot/runtime',
      map: null,
    });
    expect(runtime?.code).toContain('export function applyCompiledCustomElement');
  }, 15_000);

  it('activates an explicitly nominated exported app factory without rewriting its source shape', async () => {
    const root = await mkdtemp(path.resolve(repositoryRoot, 'packages/aot/.tmp-nominated-entry-'));
    temporaryDirectories.push(root);
    const sourceRoot = path.resolve(root, 'src');
    const sourcePath = path.resolve(sourceRoot, 'index.js');
    await mkdir(sourceRoot, { recursive: true });
    await Promise.all([
      writeFile(path.resolve(root, 'package.json'), JSON.stringify({
        name: 'aot-nominated-entry-fixture',
        private: true,
        type: 'module',
        dependencies: { '@aurelia/runtime-html': '2.0.0-rc.2' },
      }), 'utf8'),
      writeFile(path.resolve(root, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          allowJs: true,
          checkJs: false,
        },
        include: ['src'],
      }), 'utf8'),
      writeFile(sourcePath, [
        "import { Aurelia, CustomElement, StandardConfiguration } from '@aurelia/runtime-html';",
        'let requestedCount = 0;',
        'const App = CustomElement.define({',
        "  name: 'benchmark-app',",
        "  template: '<div repeat.for=\"item of items\">${item}</div>',",
        '}, class { items = Array.from({ length: requestedCount }, (_, index) => index); });',
        'export const start = (host, count = 0) => {',
        '  requestedCount = count;',
        '  return new Aurelia().register(StandardConfiguration).app({ component: App, host });',
        '};',
      ].join('\n'), 'utf8'),
    ]);
    const nominatedProvider = new SemanticAotArtifactProvider();
    const nominatedSession = await nominatedProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
      nominatedEntry: {
        sourceFilePath: 'src/index.js',
        callable: { kind: 'export', name: 'start' },
        arguments: [
          { kind: 'host-environment', path: 'benchmark.host' },
          { kind: 'primitive', value: 10 },
        ],
      },
    });
    const code = await readFile(sourcePath, 'utf8');
    const transformed = await nominatedSession.transformSource({ sourcePath, code });

    expect(transformed?.resources).toHaveLength(1);
    expect(transformed?.resources[0]).toMatchObject({
      definitionName: 'benchmark-app',
      carrierKind: 'define-call',
    });
    expect(transformed?.code).toContain('const App = __auAotApply(CustomElement.define({');
  }, 20_000);
});

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}
