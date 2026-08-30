import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ResourceCarrierKind } from '@aurelia-ls/semantic-runtime/browser-template';
import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  SemanticAotArtifactProvider,
  type SemanticAotBuildSession,
} from '../src/index.js';
import {
  collapseEquivalentAotResourcePlans,
  validateAotCarrierPatchHandoff,
} from '../src/semantic-artifact-provider.js';
import type { AotSourceTransformResourcePlan } from '../src/source-transform.js';

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

    const outputRoot = await makeTemporaryDirectory('artifact-');
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

    const runtime = await session.virtualModuleFor({ specifier: transformed!.runtimeModuleSpecifier! });
    expect(runtime).toMatchObject({
      specifier: 'virtual:aurelia-aot/runtime',
      map: null,
    });
    expect(runtime?.code).toContain('export function applyCompiledCustomElement');
  }, 15_000);

  it('bridges paired decorator template imports to their source-owned compiler payloads', async () => {
    const root = path.resolve(repositoryRoot, 'fixtures/hello-world');
    const decoratorProvider = new SemanticAotArtifactProvider();
    const decoratorSession = await decoratorProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
    });
    const sourcePath = path.resolve(root, 'src/my-app.ts');
    const pairedTemplatePath = path.resolve(root, 'src/my-app.html');
    const bridge = await decoratorSession.artifactFor({ sourcePath: pairedTemplatePath });
    if (bridge.payload == null) throw new Error('Expected an artifact-first compiler payload reference.');
    expect(decoratorProvider.evidence()).toMatchObject({
      analysisCount: 1,
      artifacts: [expect.objectContaining({
        sourcePath: pairedTemplatePath,
        definitionName: 'my-app',
        needsCompile: false,
        digest: bridge.payload.payloadDigest,
      })],
    });

    const transformed = await decoratorSession.transformSource({
      sourcePath,
      code: await readFile(sourcePath, 'utf8'),
    });
    const resource = transformed?.resources[0];
    if (resource == null) throw new Error('Expected the decorated my-app resource transform.');

    expect(bridge.code).toBe(
      `export { template, template as default } from ${JSON.stringify(resource.payloadSpecifier)};\n`,
    );
    expect(bridge.map.sources).toEqual([pairedTemplatePath]);
    expect(bridge.code).not.toContain('dependencies');
    expect(bridge.code).not.toContain('@aurelia/runtime-html');
    expect(bridge.payload).toMatchObject({
      carrierSourcePath: sourcePath,
      resourceKey: resource.resourceKey,
      compilerVariantKey: resource.compilerVariantKey,
      definitionName: 'my-app',
      payloadSpecifier: resource.payloadSpecifier,
      payloadDigest: resource.payloadDigest,
    });
    const payload = await decoratorSession.virtualModuleFor({ specifier: resource.payloadSpecifier });
    expect(payload?.code).toContain('export const template = $definition0.template;');
    expect(payload?.code).toContain('export default $definition0;');
    expect(payload?.code).not.toContain('DisplayHint');
    expect(decoratorProvider.evidence()?.artifacts).toHaveLength(1);
  }, 20_000);

  it('activates an explicitly nominated exported app factory without rewriting its source shape', async () => {
    const root = await makeTemporaryDirectory('nominated-entry-');
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
      runtimeConfiguration: 'require-replaceable',
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
    expect(transformed?.configurations).toHaveLength(1);
    expect(transformed?.code).toContain('const App = __auAotApply(CustomElement.define({');
    expect(transformed?.code).toContain('import { AotConfiguration as __auAotConfiguration0 }');
    expect(transformed?.code).toContain('.register(__auAotConfiguration0).app(');

    const configurationSpecifier = transformed!.configurations[0]!.moduleSpecifier;
    const configuration = await nominatedSession.virtualModuleFor({ specifier: configurationSpecifier });
    expect(configuration).toMatchObject({
      specifier: configurationSpecifier,
      digest: transformed!.configurations[0]!.expectedDigest,
      map: null,
    });
    expect(configuration?.code).not.toContain('StandardConfiguration');
    expect(configuration?.code).not.toContain('DefaultBindingLanguage');
    expect(configuration?.code).not.toContain('DefaultBindingSyntax');
    expect(configuration?.code).toContain('"enableCoercion": false');
    expect(nominatedProvider.evidence()?.runtimeConfiguration).toMatchObject({
      mode: 'require-replaceable',
      occurrences: [{
        carrierKind: 'explicit-registration-value',
        coverageState: 'closed',
        openSummary: null,
        nestedDiCoverageState: 'partial',
        nestedDiOpenSummary: expect.any(String),
        disposition: 'replaced',
        moduleSpecifier: configurationSpecifier,
      }],
      modules: [{
        moduleSpecifier: configurationSpecifier,
        enableCoercion: false,
        coerceNullish: false,
      }],
    });
  }, 20_000);

  it('emits a customized configuration for a configuration-only source module', async () => {
    const root = await makeTemporaryDirectory('configuration-only-');
    temporaryDirectories.push(root);
    const sourceRoot = path.resolve(root, 'src');
    const sourcePath = path.resolve(sourceRoot, 'configuration.ts');
    await mkdir(sourceRoot, { recursive: true });
    const code = [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      'const configured = new Aurelia().register(StandardConfiguration.customize((options) => {',
      '  options.coercingOptions.enableCoercion = true;',
      '  options.coercingOptions.coerceNullish = true;',
      '}));',
      'declare const dynamicFlag: boolean;',
      'const open = new Aurelia().register(StandardConfiguration.customize((options) => {',
      '  if (dynamicFlag) options.coercingOptions.enableCoercion = true;',
      '}));',
      'void [configured, open];',
    ].join('\n');
    await Promise.all([
      writeFile(path.resolve(root, 'package.json'), JSON.stringify({
        name: 'aot-configuration-only-fixture',
        private: true,
        type: 'module',
      }), 'utf8'),
      writeFile(path.resolve(root, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src'],
      }), 'utf8'),
      writeFile(sourcePath, code, 'utf8'),
    ]);

    const configurationProvider = new SemanticAotArtifactProvider();
    const configurationSession = await configurationProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
      runtimeConfiguration: 'replace-explicit',
    });
    const transformed = await configurationSession.transformSource({ sourcePath, code });

    expect(transformed).not.toBeNull();
    expect(transformed?.resources).toEqual([]);
    expect(transformed?.runtimeModuleSpecifier).toBeNull();
    expect(transformed?.configurations).toHaveLength(1);
    expect(transformed?.code).toContain('import { AotConfiguration as __auAotConfiguration0 }');
    expect(transformed?.code).toContain('.register(__auAotConfiguration0);');
    expect(transformed?.code).toContain('.register(StandardConfiguration.customize(');

    const configurationEvidence = configurationProvider.evidence()!.runtimeConfiguration;
    const occurrence = configurationEvidence.occurrences.find((candidate) =>
      candidate.disposition === 'replaced'
    )!;
    const openOccurrence = configurationEvidence.occurrences.find((candidate) =>
      candidate.reasonKind === 'open-coercion'
    )!;
    const moduleEvidence = configurationProvider.evidence()!.runtimeConfiguration.modules[0]!;
    expect(occurrence).toMatchObject({
      carrierKind: 'explicit-registration-value',
      sourcePath,
      disposition: 'replaced',
      moduleSpecifier: moduleEvidence.moduleSpecifier,
    });
    expect(openOccurrence).toMatchObject({
      carrierKind: 'explicit-registration-value',
      coverageState: 'closed',
      openSummary: expect.stringContaining('coercion customization retains open'),
      nestedDiCoverageState: 'partial',
      sourcePath,
      disposition: 'non-replaceable',
      moduleSpecifier: null,
      reasonKind: 'open-coercion',
    });
    expect(moduleEvidence).toMatchObject({
      enableCoercion: true,
      coerceNullish: true,
      digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
    });
    const module = await configurationSession.virtualModuleFor({ specifier: moduleEvidence.moduleSpecifier });
    expect(module).toMatchObject({
      specifier: moduleEvidence.moduleSpecifier,
      digest: moduleEvidence.digest,
      map: null,
    });
    expect(module?.code).toContain('"enableCoercion": true');
    expect(module?.code).toContain('"coerceNullish": true');

    await expect(new SemanticAotArtifactProvider().openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
      runtimeConfiguration: 'require-replaceable',
    })).rejects.toMatchObject({
      code: 'AOT_ARTIFACT_UNSUPPORTED_VALUE',
      message: expect.stringContaining('coercion is not statically closed'),
    });
  }, 20_000);

  it('preserves a browser-facade default by default and replaces its exact reference under the strict profile', async () => {
    const root = await makeTemporaryDirectory('browser-facade-');
    temporaryDirectories.push(root);
    const sourceRoot = path.resolve(root, 'src');
    const sourcePath = path.resolve(sourceRoot, 'main.ts');
    await mkdir(sourceRoot, { recursive: true });
    const code = [
      "import Aurelia from 'aurelia';",
      'const app = new Aurelia();',
      'void app;',
    ].join('\n');
    await Promise.all([
      writeFile(path.resolve(root, 'package.json'), JSON.stringify({
        name: 'aot-browser-facade-fixture',
        private: true,
        type: 'module',
      }), 'utf8'),
      writeFile(path.resolve(root, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src'],
      }), 'utf8'),
      writeFile(sourcePath, code, 'utf8'),
    ]);

    const preservingProvider = new SemanticAotArtifactProvider();
    const preservingSession = await preservingProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
    });
    expect(await preservingSession.transformSource({ sourcePath, code })).toBeNull();
    expect(preservingProvider.evidence()?.runtimeConfiguration).toMatchObject({
      mode: 'preserve',
      occurrences: [{
        carrierKind: 'browser-facade-default',
        disposition: 'preserved',
        reasonKind: null,
      }],
      modules: [],
    });

    const replacingProvider = new SemanticAotArtifactProvider();
    const replacingSession = await replacingProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
      runtimeConfiguration: 'require-replaceable',
    });
    const transformed = await replacingSession.transformSource({ sourcePath, code });
    expect(transformed?.browserFacades).toEqual([expect.objectContaining({
      referenceStart: code.indexOf('Aurelia', code.indexOf('new Aurelia')),
      referenceEnd: code.indexOf('Aurelia', code.indexOf('new Aurelia')) + 'Aurelia'.length,
      exportName: 'AotBrowserAurelia',
    })]);
    expect(transformed?.code).toContain('new __auAotBrowserFacade0()');
    expect(replacingProvider.evidence()?.runtimeConfiguration).toMatchObject({
      mode: 'require-replaceable',
      occurrences: [{
        carrierKind: 'browser-facade-default',
        disposition: 'replaced',
        reasonKind: null,
        sourcePath,
        start: code.indexOf('new Aurelia()'),
        end: code.indexOf('new Aurelia()') + 'new Aurelia()'.length,
      }],
      modules: [expect.objectContaining({
        moduleSpecifier: transformed?.browserFacades[0]?.moduleSpecifier,
      })],
    });
    const moduleSpecifier = transformed?.browserFacades[0]?.moduleSpecifier;
    expect(moduleSpecifier).toBeDefined();
    const module = await replacingSession.virtualModuleFor({ specifier: moduleSpecifier! });
    expect(module?.code).toContain('export class AotBrowserAurelia extends RuntimeHtmlAurelia');
    expect(module?.code).not.toContain('StandardConfiguration');
  }, 20_000);

  it('collapses byte-identical compiler-world variants and refuses divergent global patches', () => {
    const first = variantPlan('resource', 'variant-b', 'same-digest');
    const second = variantPlan('resource', 'variant-a', 'same-digest');
    const collapsed = collapseEquivalentAotResourcePlans(componentPath, [first, second]);

    expect(collapsed).toEqual([second]);
    expect(() => collapseEquivalentAotResourcePlans(componentPath, [
      first,
      { ...second, payloadDigest: 'different-digest' },
    ])).toThrow(expect.objectContaining({
      code: 'AOT_SOURCE_INVALID_PLAN',
      resourceKey: 'resource',
    }));
  });

  it('collapses one real resource compiled under two equivalent app-root worlds', async () => {
    const root = path.resolve(
      repositoryRoot,
      'packages/semantic-runtime/fixtures/pressure/binding-uncertainty-explanation',
    );
    const multiRootProvider = new SemanticAotArtifactProvider();
    const multiRootSession = await multiRootProvider.openBuild({
      root,
      mode: 'production',
      environmentName: 'client',
      sourcemap: true,
    });
    const sourcePath = path.resolve(root, 'src/shared-app.ts');
    const transformed = await multiRootSession.transformSource({
      sourcePath,
      code: await readFile(sourcePath, 'utf8'),
    });

    expect(transformed?.resources).toHaveLength(1);
    expect(transformed?.resources[0]?.definitionName).toBe('binding-explanation-shared-app');
  }, 20_000);

  it('refuses conventional in-file dependencies before conventions can relocate the target class', () => {
    const handoff = {
      schemaVersion: 'semantic-runtime/template-compiler-compiled-handoff/v1',
      resourceName: 'moving-app',
      rootDefinitionId: 'definition:0',
      address: {
        sourceAttachment: {
          carrierKind: 'convention',
          owningModuleKey: 'src/app.ts',
        },
      },
      source: { source: { path: 'src/app.html' } },
      definitions: [{
        definitionId: 'definition:0',
        header: {
          dependencies: [{ moduleKey: 'src/app.ts', localName: 'LocalCard' }],
        },
      }],
    } as unknown as Parameters<typeof validateAotCarrierPatchHandoff>[0];

    expect(() => validateAotCarrierPatchHandoff(handoff, componentPath)).toThrow(
      expect.objectContaining({
        code: 'AOT_ARTIFACT_UNSUPPORTED_HEADER',
        message: expect.stringContaining("in-file dependency 'LocalCard'"),
      }),
    );
  });
});

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

async function makeTemporaryDirectory(prefix: string): Promise<string> {
  const temporaryRoot = path.resolve(repositoryRoot, 'packages/aot/out/aot-provider-tests');
  await mkdir(temporaryRoot, { recursive: true });
  return mkdtemp(path.resolve(temporaryRoot, prefix));
}

function variantPlan(
  resourceKey: string,
  compilerVariantKey: string,
  payloadDigest: string,
): AotSourceTransformResourcePlan {
  return {
    resourceKey,
    compilerVariantKey,
    definitionName: 'resource',
    carrierKind: ResourceCarrierKind.DefineCall,
    carrier: { start: 0, end: 1, oldText: 'x' },
    targetLocalName: null,
    targetDeclaration: null,
    payloadSpecifier: `virtual:aurelia-aot/payload/${compilerVariantKey}`,
    payloadDigest,
  };
}
