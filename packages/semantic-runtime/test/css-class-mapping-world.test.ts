import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticApp } from '../src/api/runtime.js';
import {
  CssClassMappingAuthorityState,
  CssClassMappingPropertyState,
} from '../src/template/css-class-mapping.js';
import {
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
} from '../src/template/compiler-hook-world.js';
import { TemplateCompilerReadKind } from '../src/template/compiler-read-view.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('component-world CSS class mapping integration', () => {
  test('shares one raw leaf mapping across generated hooks and replays it for local elements', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.css-class-mapping-world-'));
    try {
      await writeWorkspaceFiles(workspaceRoot, {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
          },
          include: ['src'],
        }),
        'src/main.ts': [
          "import { Aurelia, cssModules, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
          '',
          "@customElement({ name: 'ordinary-child', template: '<span class=\"a\">ordinary</span>' })",
          'class OrdinaryChild {}',
          '',
          '@customElement({',
          "  name: 'mapping-host',",
          "  template: '<template as-custom-element=\"local-child\"><span class=\"a\">local</span></template><ordinary-child></ordinary-child><local-child></local-child>',",
          '  dependencies: [',
          "    cssModules({ a: 'b' }),",
          "    cssModules({ b: 'c' }),",
          '    OrdinaryChild,',
          '  ],',
          '})',
          'class MappingHost {}',
          '',
          "@customElement({ name: 'mapping-app', template: '<mapping-host></mapping-host>', dependencies: [MappingHost] })",
          'class MappingApp {}',
          '',
          'new Aurelia()',
          '  .register(StandardConfiguration)',
          '  .app({ host: document.body, component: MappingApp });',
        ].join('\n'),
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `test:css-class-mapping-world:${path.basename(workspaceRoot)}`,
      });
      try {
        const app = await runtime.openApp({
          analysisDepth: 'runtime-topology',
          telemetry: { inquiryProfile: 'aot' },
        });
        const host = requireCompilation(app, 'mapping-host');
        const ordinary = requireCompilation(app, 'ordinary-child');
        const local = requireCompilation(app, 'local-child');

        expect(host.compilerWorld.cssClassMapping.authorityState)
          .toBe(CssClassMappingAuthorityState.Exact);
        expect(host.compilerWorld.cssClassMapping.lookup('a')).toEqual({
          propertyState: CssClassMappingPropertyState.Value,
          mappedClassName: 'b',
        });
        expect(host.compilerWorld.cssClassMapping.lookup('b')).toEqual({
          propertyState: CssClassMappingPropertyState.Value,
          mappedClassName: 'c',
        });
        const hostCssHooks = host.compilerWorld.compilerHooks.entries.filter((entry) =>
          entry.lane === TemplateCompilerHookLane.Leaf
          && entry.hookKind === TemplateCompilerHookKind.CssModules
        );
        expect(hostCssHooks).toHaveLength(2);
        expect(hostCssHooks.every((entry) =>
          entry.callable.authorityKind === TemplateCompilerHookCallableAuthorityKind.BuiltIn
          && entry.cssClassMapping?.productHandle === host.compilerWorld.cssClassMapping.productHandle
        )).toBe(true);
        expect(host.registeredReads).toContainEqual(expect.objectContaining({
          readKind: TemplateCompilerReadKind.CssClassMapping,
          canonicalKey: 'all',
        }));

        expect(ordinary.compilerWorld.cssClassMapping).toMatchObject({
          authorityState: CssClassMappingAuthorityState.Exact,
          properties: [],
          defaultPropertyState: CssClassMappingPropertyState.Absent,
        });
        expect(ordinary.compilerWorld.compilerHooks.entries.some((entry) =>
          entry.lane === TemplateCompilerHookLane.Leaf
          && entry.hookKind === TemplateCompilerHookKind.CssModules
        )).toBe(false);

        expect(local.compilerWorld.cssClassMapping.productHandle)
          .not.toBe(host.compilerWorld.cssClassMapping.productHandle);
        expect(local.compilerWorld.cssClassMapping.properties)
          .toEqual(host.compilerWorld.cssClassMapping.properties);
        const localCssHooks = local.compilerWorld.compilerHooks.entries.filter((entry) =>
          entry.lane === TemplateCompilerHookLane.Leaf
          && entry.hookKind === TemplateCompilerHookKind.CssModules
        );
        expect(localCssHooks).toHaveLength(2);
        expect(localCssHooks.every((entry) =>
          entry.cssClassMapping?.productHandle === local.compilerWorld.cssClassMapping.productHandle
        )).toBe(true);
      } finally {
        runtime.retireWorkspaceIncarnation();
      }
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);
});

function requireCompilation(
  app: SemanticApp,
  name: string,
) {
  const compilation = app.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === name
  )?.compilation ?? null;
  if (compilation == null) throw new Error(`Expected template compilation '${name}'.`);
  return compilation;
}

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
