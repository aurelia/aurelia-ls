import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { StaticCallableSlot } from '../src/evaluation/function-execution.js';
import {
  ResourceCompilerHookEffectKind,
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
  resourceCompilerHookEffectKind,
} from '../src/resources/resource-reference.js';
import {
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookMembershipState,
  TemplateCompilerHookOpenReasonKind,
} from '../src/template/compiler-hook-world.js';
import { TemplateCompilerReadKind } from '../src/template/compiler-read-view.js';
import { BrowserEffectiveTemplateMaterializer } from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  executeDeterministicTemplateCompiler,
  TemplateCompilerDeterministicExecutionReasonKind,
  TemplateCompilerDeterministicExecutionState,
} from '../src/template/template-compiler-deterministic-execution.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('component-local compiler-hook registry dependencies', () => {
  let workspaceRoot: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-compiler-hook-dependencies-'));
    await writeWorkspaceFiles(workspaceRoot, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          experimentalDecorators: false,
          strict: true,
        },
        include: ['src'],
      }),
      'src/hooks.ts': [
        "import { templateCompilerHooks as compilerHook } from './hook-barrel.js';",
        "import * as templateCompiler from './hook-barrel.js';",
        'export class DirectHook { compiling(): void {} }',
        '@compilerHook',
        'export class DecoratedBareHook { compiling(): void {} }',
        '@templateCompiler.templateCompilerHooks()',
        'export class DecoratedCalledHook { compiling(): void {} }',
        '@compilerHook',
        'export class DecoratedBaseHook { compiling(): void {} }',
        'export class InheritedHook extends DecoratedBaseHook {}',
      ].join('\n'),
      'src/hook-barrel.ts': [
        "export { TemplateCompilerHooks, templateCompilerHooks } from '@aurelia/template-compiler';",
      ].join('\n'),
      'src/hook-app.ts': [
        "import type { IRegistry } from '@aurelia/kernel';",
        "import { cssModules, customElement, shadowCSS } from '@aurelia/runtime-html';",
        "import generatedClasses from './classes.module.css';",
        "import { TemplateCompilerHooks as HookRegistry } from './hook-barrel.js';",
        "import { DecoratedBareHook, DecoratedCalledHook, DirectHook, InheritedHook } from './hooks.js';",
        'declare const opaqueRegistry: IRegistry;',
        'declare const maybeRegistries: IRegistry[];',
        'class ImplementsRegistry implements IRegistry { register(): void {} }',
        'class StructuralRegistry { register(): void {} }',
        'class StaticRegistry { static register(): void {} }',
        'function RegistryFunction(): void {}',
        'RegistryFunction.register = (): void => {};',
        'const structuralRegistry = { register(): void {} };',
        "const spreadMappings = [{ spread: 'spread_hash' }];",
        "@customElement({ name: 'actual-resource', template: '' })",
        'export class ActualResource {}',
        '@customElement({',
        "  name: 'hook-host',",
        "  template: '<div class=\"mapped\"></div>',",
        '  dependencies: [',
        '    HookRegistry.define(DirectHook),',
        '    DecoratedBareHook,',
        '    DecoratedCalledHook,',
        '    InheritedHook,',
        "    cssModules({ mapped: 'mapped_hash' }),",
        "    cssModules({ secondary: 'secondary_hash' }),",
        "    shadowCSS(':host { display: block; }'),",
        '    opaqueRegistry,',
        '    new ImplementsRegistry(),',
        '    new StructuralRegistry(),',
        '    StaticRegistry,',
        '    RegistryFunction,',
        '    structuralRegistry,',
        '    ActualResource,',
        '  ],',
        '})',
        'export class HookHost {}',
        '@customElement({',
        "  name: 'css-hook-host',",
        "  template: '<template as-custom-element=\"local-hook-child\"><span class=\"mapped\"></span></template><local-hook-child></local-hook-child>',",
        "  dependencies: [cssModules({ mapped: 'mapped_hash' })],",
        '})',
        'export class CssHookHost {}',
        '@customElement({',
        "  name: 'css-payload-host',",
        "  template: '<div class=\"exact generated spread\"></div>',",
        '  dependencies: [cssModules(',
        "    { exact: 'exact_hash', replaced: 'old_hash' },",
        "    { replaced: 'new_hash' },",
        '    generatedClasses,',
        '    ...spreadMappings,',
        '  )],',
        '})',
        'export class CssPayloadHost {}',
        '@customElement({',
        "  name: 'open-deps-host',",
        "  template: '<div>open</div>',",
        '  dependencies: [...maybeRegistries, ActualResource],',
        '})',
        'export class OpenDepsHost {}',
      ].join('\n'),
      'src/main.ts': [
        "import { Registration } from '@aurelia/kernel';",
        "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { ITemplateCompilerHooks, TemplateCompilerHooks, templateCompilerHooks } from '@aurelia/template-compiler';",
        "import { CssHookHost, CssPayloadHost, HookHost, OpenDepsHost } from './hook-app.js';",
        'const hookWithoutCompilerMember = {};',
        'const rootCompilerHook = { compiling(): void {} };',
        'class RootDefinedHook { compiling(): void {} }',
        '@templateCompilerHooks',
        'class RootDecoratedHook { compiling(): void {} }',
        "@customElement({ name: 'compiler-hook-app', template: '<hook-host></hook-host><css-hook-host></css-hook-host><css-payload-host></css-payload-host><open-deps-host></open-deps-host>', dependencies: [HookHost, CssHookHost, CssPayloadHost, OpenDepsHost] })",
        'class CompilerHookApp {}',
        'new Aurelia()',
        '  .register(',
        '    StandardConfiguration,',
        '    Registration.instance(ITemplateCompilerHooks, hookWithoutCompilerMember),',
        '    Registration.instance(ITemplateCompilerHooks, rootCompilerHook),',
        '    TemplateCompilerHooks.define(RootDefinedHook),',
        '    RootDecoratedHook,',
        '  )',
        '  .app({ host: document.body, component: CompilerHookApp })',
        '  .start();',
      ].join('\n'),
      'src/classes.module.css': '.generated { color: rebeccapurple; }\n',
      'src/style-assets.d.ts': [
        "declare module '*.module.css' {",
        '  const classes: Record<string, string>;',
        '  export default classes;',
        '}',
      ].join('\n'),
    });
  });

  afterAll(async () => {
    if (workspaceRoot != null) await rm(workspaceRoot, { force: true, recursive: true });
  });

  test('separates exact hook producers, non-hook registries, resources, and opaque registry pressure', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:resource-compiler-hook-dependencies:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    const rootHooks = app.emission.appWorld.compilerWorlds[0]?.compilerHooks;
    if (rootHooks == null) throw new Error('Expected app-root compiler hooks.');
    expect(rootHooks.membershipState).toBe(TemplateCompilerHookMembershipState.Open);
    expect(rootHooks.openReasons.map((reason) => reason.summary)).toEqual(expect.arrayContaining([
      expect.stringContaining('TemplateCompilerHooks.define'),
      expect.stringContaining('@templateCompilerHooks'),
    ]));
    expect(rootHooks.entries).toMatchObject([
      { callable: { authorityKind: TemplateCompilerHookCallableAuthorityKind.Absent } },
      {
        callable: {
          authorityKind: TemplateCompilerHookCallableAuthorityKind.StaticCallable,
          callableSlotKey: expect.stringContaining(':compiler-hook:'),
        },
      },
    ]);
    const callableSlotKey = rootHooks.entries[1]?.callable.callableSlotKey ?? null;
    if (callableSlotKey == null) throw new Error('Expected exact root hook callable slot authority.');
    const callableTarget = app.emission.appWorld.compilerWorlds[0]!.callableBindings.target(
      new StaticCallableSlot(callableSlotKey),
    );
    expect(callableTarget?.receiver).not.toBeNull();
    const definition = app.emission.resources.sources
      .flatMap((source) => source.convergence.definitions)
      .find((candidate) => 'name' in candidate && candidate.name === 'hook-host');
    if (definition == null || !('dependencies' in definition)) {
      throw new Error('Expected the hook-host custom-element definition.');
    }

    expect(definition.dependencies.map((dependency) => ({
      dependencyKind: dependency.dependencyKind,
      registryKind: dependency.registryKind,
      keyName: dependency.keyName,
      localName: dependency.localName,
      compilerHookEffect: resourceCompilerHookEffectKind(dependency),
    }))).toEqual([
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.TemplateCompilerHook,
        keyName: 'TemplateCompilerHooks',
        localName: 'DirectHook',
        compilerHookEffect: ResourceCompilerHookEffectKind.TemplateCompilerHook,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.TemplateCompilerHook,
        keyName: 'TemplateCompilerHooks',
        localName: 'DecoratedBareHook',
        compilerHookEffect: ResourceCompilerHookEffectKind.TemplateCompilerHook,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.TemplateCompilerHook,
        keyName: 'TemplateCompilerHooks',
        localName: 'DecoratedCalledHook',
        compilerHookEffect: ResourceCompilerHookEffectKind.TemplateCompilerHook,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.TemplateCompilerHook,
        keyName: 'TemplateCompilerHooks',
        localName: 'DecoratedBaseHook',
        compilerHookEffect: ResourceCompilerHookEffectKind.TemplateCompilerHook,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.CssModules,
        keyName: 'cssModules',
        localName: 'cssModules',
        compilerHookEffect: ResourceCompilerHookEffectKind.CssModules,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.CssModules,
        keyName: 'cssModules',
        localName: 'cssModules',
        compilerHookEffect: ResourceCompilerHookEffectKind.CssModules,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.ShadowCss,
        keyName: 'shadowCSS',
        localName: 'shadowCSS',
        compilerHookEffect: ResourceCompilerHookEffectKind.None,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: 'opaqueRegistry',
        localName: 'opaqueRegistry',
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: null,
        localName: null,
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: null,
        localName: null,
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: 'StaticRegistry',
        localName: 'StaticRegistry',
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: 'RegistryFunction',
        localName: 'RegistryFunction',
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Registry,
        registryKind: ResourceRegistryDependencyKind.OpaqueRegistry,
        keyName: 'structuralRegistry',
        localName: 'structuralRegistry',
        compilerHookEffect: ResourceCompilerHookEffectKind.OpenRegistry,
      },
      {
        dependencyKind: ResourceDependencyReferenceKind.Resource,
        registryKind: null,
        keyName: 'ActualResource',
        localName: 'ActualResource',
        compilerHookEffect: ResourceCompilerHookEffectKind.None,
      },
    ]);
    expect(definition.dependencies[4]?.cssModulesInput).toEqual({
      mappingArguments: [{
        entries: [{ className: 'mapped', mappedClassName: 'mapped_hash' }],
        mayHaveUnknownMappings: false,
        sourceModuleKey: null,
      }],
      mayHaveUnknownArguments: false,
      mayHaveUnknownArgumentOrder: false,
    });
    expect(definition.dependencies[5]?.cssModulesInput).toEqual({
      mappingArguments: [{
        entries: [{ className: 'secondary', mappedClassName: 'secondary_hash' }],
        mayHaveUnknownMappings: false,
        sourceModuleKey: null,
      }],
      mayHaveUnknownArguments: false,
      mayHaveUnknownArgumentOrder: false,
    });

    const cssPayloadDefinition = app.emission.resources.sources
      .flatMap((source) => source.convergence.definitions)
      .find((candidate) => 'name' in candidate && candidate.name === 'css-payload-host');
    if (cssPayloadDefinition == null || !('dependencies' in cssPayloadDefinition)) {
      throw new Error('Expected the css-payload-host custom-element definition.');
    }
    const cssPayload = cssPayloadDefinition.dependencies[0]?.cssModulesInput;
    expect(cssPayload).not.toBeNull();
    expect(cssPayload).toMatchObject({
      mappingArguments: [
        {
          entries: [
            { className: 'exact', mappedClassName: 'exact_hash' },
            { className: 'replaced', mappedClassName: 'old_hash' },
          ],
          mayHaveUnknownMappings: false,
          sourceModuleKey: null,
        },
        {
          entries: [{ className: 'replaced', mappedClassName: 'new_hash' }],
          mayHaveUnknownMappings: false,
          sourceModuleKey: null,
        },
        {
          entries: [],
          mayHaveUnknownMappings: true,
          sourceModuleKey: expect.stringMatching(/classes\.module\.css$/u),
        },
        {
          entries: [{ className: 'spread', mappedClassName: 'spread_hash' }],
          mayHaveUnknownMappings: false,
          sourceModuleKey: null,
        },
      ],
      mayHaveUnknownArguments: false,
      mayHaveUnknownArgumentOrder: false,
    });

    const opaqueSeams = runtime.workspace.store.readOpenSeams().filter((seam) =>
      seam.summary === 'Resource dependency is a registry whose registration effects remain opaque.'
    );
    expect(opaqueSeams).toHaveLength(6);
    expect(opaqueSeams.every((seam) =>
      seam.reasonKinds.length === 1
      && seam.reasonKinds[0] === OpenSeamReasonKind.ResourceDefinitionDependencyEntryOpen
    )).toBe(true);

    const compilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'hook-host'
    )?.compilation;
    if (compilation == null) throw new Error('Expected hook-host template compilation.');
    expect(compilation.compilerWorld.compilerHooks.membershipState)
      .toBe(TemplateCompilerHookMembershipState.Open);
    expect(compilation.compilerWorld.compilerHooks.entries.map((entry) => ({
      lane: entry.lane,
      ordinal: entry.sourceOrdinal,
      hookKind: entry.hookKind,
      callable: entry.callable.authorityKind,
    }))).toEqual([
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 0, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 1, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 2, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 3, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 4, hookKind: TemplateCompilerHookKind.CssModules, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Leaf, ordinal: 5, hookKind: TemplateCompilerHookKind.CssModules, callable: TemplateCompilerHookCallableAuthorityKind.Open },
      { lane: TemplateCompilerHookLane.Root, ordinal: 0, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.Absent },
      { lane: TemplateCompilerHookLane.Root, ordinal: 1, hookKind: TemplateCompilerHookKind.Registered, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
    ]);
    const dependencyHookReasons = compilation.compilerWorld.compilerHooks.openReasons.filter((reason) =>
      reason.reasonKind === TemplateCompilerHookOpenReasonKind.RegistryDependency
    );
    expect(dependencyHookReasons).toHaveLength(6);
    expect(dependencyHookReasons.every((reason) =>
      reason.reasonKind === TemplateCompilerHookOpenReasonKind.RegistryDependency
      && reason.lane === TemplateCompilerHookLane.Leaf
      && reason.openSeamHandles.length === 1
    )).toBe(true);
    expect(compilation.registeredReads).toContainEqual(expect.objectContaining({
      readKind: TemplateCompilerReadKind.CompilerHooks,
      canonicalKey: 'all',
    }));

    const cssCompilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'css-hook-host'
    )?.compilation;
    if (cssCompilation == null) throw new Error('Expected css-hook-host template compilation.');
    expect(cssCompilation.compilerWorld.compilerHooks).toMatchObject({
      membershipState: TemplateCompilerHookMembershipState.Open,
      entries: [
        {
          lane: TemplateCompilerHookLane.Leaf,
          sourceOrdinal: 0,
          hookKind: TemplateCompilerHookKind.CssModules,
          provider: { openSeamHandles: [expect.stringMatching(/^kernel:/u)] },
          callable: {
            authorityKind: TemplateCompilerHookCallableAuthorityKind.Open,
            openSeamHandles: [expect.stringMatching(/^kernel:/u)],
          },
        },
        {
          lane: TemplateCompilerHookLane.Root,
          sourceOrdinal: 0,
          hookKind: TemplateCompilerHookKind.Registered,
          callable: { authorityKind: TemplateCompilerHookCallableAuthorityKind.Absent },
        },
        {
          lane: TemplateCompilerHookLane.Root,
          sourceOrdinal: 1,
          hookKind: TemplateCompilerHookKind.Registered,
          callable: { authorityKind: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
        },
      ],
      openReasons: expect.arrayContaining([
        expect.objectContaining({
          reasonKind: TemplateCompilerHookOpenReasonKind.CompilerWorld,
          lane: TemplateCompilerHookLane.Root,
        }),
      ]),
    });
    const localHookCompilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'local-hook-child'
    )?.compilation;
    if (localHookCompilation == null) throw new Error('Expected local-hook-child template compilation.');
    expect(localHookCompilation.compilerWorld.compilerHooks.entries).toEqual([
      expect.objectContaining({
        lane: TemplateCompilerHookLane.Leaf,
        laneOrdinal: 0,
        hookKind: TemplateCompilerHookKind.CssModules,
      }),
      expect.objectContaining({ lane: TemplateCompilerHookLane.Root, laneOrdinal: 0 }),
      expect.objectContaining({ lane: TemplateCompilerHookLane.Root, laneOrdinal: 1 }),
    ]);
    const openDependenciesCompilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'open-deps-host'
    )?.compilation;
    if (openDependenciesCompilation == null) throw new Error('Expected open-deps-host template compilation.');
    expect(openDependenciesCompilation.compilerWorld.compilerHooks.membershipState)
      .toBe(TemplateCompilerHookMembershipState.Open);
    expect(openDependenciesCompilation.compilerWorld.compilerHooks.entries).toEqual([
      expect.objectContaining({ lane: TemplateCompilerHookLane.Root, sourceOrdinal: 0 }),
      expect.objectContaining({ lane: TemplateCompilerHookLane.Root, sourceOrdinal: 1 }),
    ]);
    expect(openDependenciesCompilation.compilerWorld.compilerHooks.openReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reasonKind: TemplateCompilerHookOpenReasonKind.RegistryDependency,
        lane: TemplateCompilerHookLane.Leaf,
        openSeamHandles: [expect.stringMatching(/^kernel:/u)],
      }),
    ]));
    const markup = cssCompilation.unit.templateSource.markup;
    if (markup == null || cssCompilation.html.draft == null) {
      throw new Error('Expected retained css-hook-host browser replay authority.');
    }
    const replayRun = runtime.computationLifecycle.begin({
      kind: 'compiler-hook-admission-test',
      reconciliationKey: 'compiler-hook-admission-test',
      summary: 'Prove that conservative root hook membership blocks structural replay before browser mutation.',
    });
    try {
      const browser = parseBrowserTemplateFragmentDraft(markup);
      const browserTemplate = new BrowserEffectiveTemplateMaterializer(replayRun).materialize({
        localKey: 'compiler-hook-admission:css-hook-host',
        sourceRevision: cssCompilation.definition.template?.authoredSourceRevision ?? 'test:css-hook-host',
        templateSource: cssCompilation.unit.templateSource,
        authoredHtml: cssCompilation.html,
        browser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
      });
      const replay = executeDeterministicTemplateCompiler({ browserTemplate, compilation: cssCompilation });
      expect(replay.state).toBe(TemplateCompilerDeterministicExecutionState.Open);
      expect(replay.reasons.map((reason) => reason.reasonKind)).toContain(
        TemplateCompilerDeterministicExecutionReasonKind.CompilerHookMembershipOpen,
      );
    } finally {
      replayRun.abort();
    }
  }, 30_000);
});

async function writeWorkspaceFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}
