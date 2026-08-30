import { ResourceCarrierKind } from '@aurelia-ls/semantic-runtime/browser-template';
import { describe, expect, it } from 'vitest';

import {
  AotSourceTransformEmitter,
  type AotSourceTransformBrowserFacadePlan,
  type AotSourceTransformConfigurationPlan,
  type AotSourceTransformResourcePlan,
} from '../src/source-transform.js';

describe('AOT source transform', () => {
  it('attaches distinct compiler payloads after decorator and static targets without rewriting metadata', () => {
    const sourcePath = 'C:/app/src/resources.ts';
    const code = [
      "import { customElement } from '@aurelia/runtime-html';",
      '',
      "@customElement({ name: 'decorated-card', template: '<p>${value}</p>' })",
      'export class DecoratedCard { value = 1; }',
      '',
      'export class StaticCard {',
      "  static $au = { type: 'custom-element', name: 'static-card', template: '<p>static</p>' };",
      '}',
      '',
    ].join('\n');
    const decoratedCarrier = slice(code, "@customElement({ name: 'decorated-card', template: '<p>${value}</p>' })");
    const decoratedTarget = slice(code, 'export class DecoratedCard { value = 1; }');
    const staticCarrier = slice(code, "static $au = { type: 'custom-element', name: 'static-card', template: '<p>static</p>' }");
    const staticTarget = slice(code, [
      'export class StaticCard {',
      "  static $au = { type: 'custom-element', name: 'static-card', template: '<p>static</p>' };",
      '}',
    ].join('\n'));

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath,
      code,
      resources: [
        resource({
          resourceKey: 'decorated',
          variant: 'decorated:world',
          name: 'decorated-card',
          carrierKind: ResourceCarrierKind.Decorator,
          carrier: decoratedCarrier,
          targetLocalName: 'DecoratedCard',
          targetDeclaration: decoratedTarget,
        }),
        resource({
          resourceKey: 'static',
          variant: 'static:world',
          name: 'static-card',
          carrierKind: ResourceCarrierKind.StaticAu,
          carrier: staticCarrier,
          targetLocalName: 'StaticCard',
          targetDeclaration: staticTarget,
        }),
      ],
    });

    expect(artifact).not.toBeNull();
    expect(artifact?.code).toContain("import { applyCompiledCustomElement as __auAotApply } from \"virtual:aurelia-aot/runtime\";");
    expect(artifact?.code).toContain('import __auAotPatch0 from "virtual:aurelia-aot/payload/decorated%3Aworld";');
    expect(artifact?.code).toContain('import __auAotPatch1 from "virtual:aurelia-aot/payload/static%3Aworld";');
    expect(artifact?.code).toContain("@customElement({ name: 'decorated-card', template: '<p>${value}</p>' })");
    expect(artifact?.code).toContain('__auAotApply(DecoratedCard, __auAotPatch0);');
    expect(artifact?.code).toContain("static $au = { type: 'custom-element', name: 'static-card', template: '<p>static</p>' };");
    expect(artifact?.code).toContain('__auAotApply(StaticCard, __auAotPatch1);');
    expect(artifact?.resources.map((entry) => entry.resourceKey)).toEqual(['decorated', 'static']);
    expect(artifact?.map.sources).toEqual([sourcePath]);
    expect(artifact?.map.sourcesContent).toEqual([code]);
  });

  it('composes nested define-call wrappers without requiring target names', () => {
    const child = "CustomElement.define({ name: 'hello', template: 'hello ${message}', bindables: ['message'] })";
    const outer = `CustomElement.define({ name: 'app', template: '<hello></hello>', dependencies: [${child}] }, class App {})`;
    const code = [
      "import { CustomElement } from '@aurelia/runtime-html';",
      `const App = ${outer};`,
    ].join('\n');
    const outerStart = code.indexOf(outer);
    const childStart = code.indexOf(child, outerStart);
    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/index.js',
      code,
      resources: [
        resource({
          resourceKey: 'app',
          variant: 'app:world',
          name: 'app',
          carrierKind: ResourceCarrierKind.DefineCall,
          carrier: { start: outerStart, end: outerStart + outer.length, oldText: outer },
        }),
        resource({
          resourceKey: 'hello',
          variant: 'hello:world',
          name: 'hello',
          carrierKind: ResourceCarrierKind.DefineCall,
          carrier: { start: childStart, end: childStart + child.length, oldText: child },
        }),
      ],
    });

    expect(artifact?.code).toContain(
      "const App = __auAotApply(CustomElement.define({ name: 'app', template: '<hello></hello>', dependencies: [__auAotApply(CustomElement.define({ name: 'hello', template: 'hello ${message}', bindables: ['message'] }), __auAotPatch1)] }, class App {}), __auAotPatch0);",
    );
  });

  it('allocates non-colliding generated names and rejects stale carrier text', () => {
    const call = "CustomElement.define({ name: 'app', template: '<p></p>' })";
    const code = [
      "import { CustomElement } from '@aurelia/runtime-html';",
      'const __auAotApply = 1;',
      'const __auAotPatch0 = 2;',
      `export const App = ${call};`,
    ].join('\n');
    const carrier = slice(code, call);
    const plan = resource({
      resourceKey: 'app',
      variant: 'app:world',
      name: 'app',
      carrierKind: ResourceCarrierKind.DefineCall,
      carrier,
    });
    const emitter = new AotSourceTransformEmitter();

    const artifact = emitter.emit({ sourcePath: 'C:/app/src/index.ts', code, resources: [plan] });
    expect(artifact?.code).toContain('applyCompiledCustomElement as __auAotApply1');
    expect(artifact?.code).toContain('import __auAotPatch01 from');

    expect(() => emitter.emit({
      sourcePath: 'C:/app/src/index.ts',
      code: code.replace("name: 'app'", "name: 'changed'"),
      resources: [plan],
    })).toThrow(expect.objectContaining({ code: 'AOT_SOURCE_STALE', resourceKey: 'app' }));
  });

  it('replaces configuration values without importing the resource patch runtime', () => {
    const sourcePath = 'C:/app/src/main.ts';
    const code = [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      'new Aurelia().register(StandardConfiguration).app({ component: App });',
    ].join('\n');
    const plan = configuration(code, 'StandardConfiguration', 'virtual:aurelia-aot/configuration/build-a');

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath,
      code,
      resources: [],
      configurations: [plan],
    });

    expect(artifact?.code).toContain(
      'import { AotConfiguration as __auAotConfiguration0 } from "virtual:aurelia-aot/configuration/build-a";',
    );
    expect(artifact?.code).toContain('new Aurelia().register(__auAotConfiguration0).app({ component: App });');
    expect(artifact?.runtimeModuleSpecifier).toBeNull();
    expect(artifact?.resources).toEqual([]);
    expect(artifact?.configurations).toEqual([{
      valueStart: plan.value.start,
      valueEnd: plan.value.end,
      moduleSpecifier: plan.moduleSpecifier,
      expectedDigest: plan.expectedDigest,
      exportName: plan.exportName,
      localName: '__auAotConfiguration0',
    }]);
    expect(artifact?.map.sources).toEqual([sourcePath]);
    expect(artifact?.map.sourcesContent).toEqual([code]);
    expect(artifact?.map.mappings.length).toBeGreaterThan(0);
  });

  it('composes configuration replacement with nested resource carrier edits', () => {
    const child = "CustomElement.define({ name: 'child', template: 'child' })";
    const parent = `CustomElement.define({ name: 'app', template: '<child></child>', dependencies: [${child}] }, class App {})`;
    const code = [
      "import { Aurelia, CustomElement, StandardConfiguration } from '@aurelia/runtime-html';",
      `const App = ${parent};`,
      'new Aurelia().register(StandardConfiguration).app({ component: App });',
    ].join('\n');
    const parentStart = code.indexOf(parent);
    const childStart = code.indexOf(child, parentStart);

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [
        resource({
          resourceKey: 'app',
          variant: 'app:world',
          name: 'app',
          carrierKind: ResourceCarrierKind.DefineCall,
          carrier: { start: parentStart, end: parentStart + parent.length, oldText: parent },
        }),
        resource({
          resourceKey: 'child',
          variant: 'child:world',
          name: 'child',
          carrierKind: ResourceCarrierKind.DefineCall,
          carrier: { start: childStart, end: childStart + child.length, oldText: child },
        }),
      ],
      configurations: [configuration(code, 'StandardConfiguration')],
    });

    expect(artifact?.code).toContain(
      "const App = __auAotApply(CustomElement.define({ name: 'app', template: '<child></child>', dependencies: [__auAotApply(CustomElement.define({ name: 'child', template: 'child' }), __auAotPatch1)] }, class App {}), __auAotPatch0);",
    );
    expect(artifact?.code).toContain('register(__auAotConfiguration0)');
    expect(artifact?.runtimeModuleSpecifier).toBe('virtual:aurelia-aot/runtime');
    expect(artifact?.resources).toHaveLength(2);
    expect(artifact?.configurations).toHaveLength(1);
    expect(artifact?.map.sourcesContent).toEqual([code]);
  });

  it('imports multiple build-specific configuration modules with collision-safe bindings', () => {
    const code = [
      "import { StandardConfiguration } from '@aurelia/runtime-html';",
      'const __auAotConfiguration0 = false;',
      'const first = StandardConfiguration;',
      'const second = StandardConfiguration;',
    ].join('\n');
    const first = code.indexOf('StandardConfiguration', code.indexOf('const first'));
    const second = code.indexOf('StandardConfiguration', code.indexOf('const second'));
    const expression = 'StandardConfiguration';

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/configurations.ts',
      code,
      resources: [],
      configurations: [
        {
          value: { start: first, end: first + expression.length, oldText: expression },
          moduleSpecifier: 'virtual:aurelia-aot/configuration/first',
          expectedDigest: 'digest:first',
          exportName: 'AotConfiguration',
        },
        {
          value: { start: second, end: second + expression.length, oldText: expression },
          moduleSpecifier: 'virtual:aurelia-aot/configuration/second',
          expectedDigest: 'digest:second',
          exportName: 'BuildConfiguration',
        },
      ],
    });

    expect(artifact?.code).toContain('AotConfiguration as __auAotConfiguration01');
    expect(artifact?.code).toContain('BuildConfiguration as __auAotConfiguration1');
    expect(artifact?.code).toContain('const first = __auAotConfiguration01;');
    expect(artifact?.code).toContain('const second = __auAotConfiguration1;');
    expect(artifact?.configurations.map((entry) => entry.moduleSpecifier)).toEqual([
      'virtual:aurelia-aot/configuration/first',
      'virtual:aurelia-aot/configuration/second',
    ]);
  });

  it('refuses a stale configuration value slice', () => {
    const code = 'bootstrap(StandardConfiguration);';
    const plan = configuration(code, 'StandardConfiguration');

    expect(() => new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code: 'bootstrap(ChangedConfiguration);',
      resources: [],
      configurations: [plan],
    })).toThrow(expect.objectContaining({ code: 'AOT_SOURCE_STALE', resourceKey: null }));
  });

  it('replaces static browser-facade app and register receivers through one build-specific import', () => {
    const sourcePath = 'C:/app/src/main.ts';
    const code = [
      "import { Aurelia } from 'aurelia';",
      'Aurelia.register(Feature);',
      'Aurelia.app({ component: App, host });',
    ].join('\n');
    const moduleSpecifier = 'virtual:aurelia-aot/configuration/browser-static';
    const first = code.indexOf('Aurelia', code.indexOf('Aurelia.register'));
    const second = code.indexOf('Aurelia', code.indexOf('Aurelia.app'));

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath,
      code,
      resources: [],
      browserFacades: [
        browserFacade(code, first, moduleSpecifier),
        browserFacade(code, second, moduleSpecifier),
      ],
    });

    expect(artifact?.code.match(/import \{ AotBrowserAurelia as __auAotBrowserFacade0 \}/g)).toHaveLength(1);
    expect(artifact?.code).toContain('__auAotBrowserFacade0.register(Feature);');
    expect(artifact?.code).toContain('__auAotBrowserFacade0.app({ component: App, host });');
    expect(artifact?.runtimeModuleSpecifier).toBeNull();
    expect(artifact?.browserFacades).toEqual([
      {
        referenceStart: first,
        referenceEnd: first + 'Aurelia'.length,
        moduleSpecifier,
        expectedDigest: `digest:${moduleSpecifier}`,
        exportName: 'AotBrowserAurelia',
        localName: '__auAotBrowserFacade0',
      },
      {
        referenceStart: second,
        referenceEnd: second + 'Aurelia'.length,
        moduleSpecifier,
        expectedDigest: `digest:${moduleSpecifier}`,
        exportName: 'AotBrowserAurelia',
        localName: '__auAotBrowserFacade0',
      },
    ]);
  });

  it('replaces an aliased browser-facade constructor reference', () => {
    const code = [
      "import { Aurelia as BrowserAurelia } from 'aurelia';",
      'const app = new BrowserAurelia();',
    ].join('\n');
    const referenceStart = code.lastIndexOf('BrowserAurelia');

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [],
      browserFacades: [browserFacade(code, referenceStart)],
    });

    expect(artifact?.code).toContain('import { AotBrowserAurelia as __auAotBrowserFacade0 }');
    expect(artifact?.code).toContain('const app = new __auAotBrowserFacade0();');
  });

  it('allocates a collision-safe browser-facade binding', () => {
    const code = [
      "import { Aurelia } from 'aurelia';",
      'const __auAotBrowserFacade0 = false;',
      'const app = new Aurelia();',
    ].join('\n');
    const referenceStart = code.lastIndexOf('Aurelia');

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [],
      browserFacades: [browserFacade(code, referenceStart)],
    });

    expect(artifact?.code).toContain('AotBrowserAurelia as __auAotBrowserFacade01');
    expect(artifact?.code).toContain('const app = new __auAotBrowserFacade01();');
  });

  it('composes browser-facade, configuration, and compiler-payload edits', () => {
    const call = "CustomElement.define({ name: 'app', template: '<p></p>' })";
    const code = [
      "import { Aurelia, CustomElement, StandardConfiguration } from '@aurelia/runtime-html';",
      `const App = ${call};`,
      'new Aurelia().register(StandardConfiguration).app({ component: App });',
    ].join('\n');
    const facadeStart = code.indexOf('Aurelia', code.indexOf('new Aurelia'));
    const moduleSpecifier = 'virtual:aurelia-aot/configuration/composed';

    const artifact = new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [resource({
        resourceKey: 'app',
        variant: 'app:world',
        name: 'app',
        carrierKind: ResourceCarrierKind.DefineCall,
        carrier: slice(code, call),
      })],
      configurations: [configuration(code, 'StandardConfiguration', moduleSpecifier)],
      browserFacades: [browserFacade(code, facadeStart, moduleSpecifier)],
    });

    expect(artifact?.code).toContain('applyCompiledCustomElement as __auAotApply');
    expect(artifact?.code).toContain('AotConfiguration as __auAotConfiguration0');
    expect(artifact?.code).toContain('AotBrowserAurelia as __auAotBrowserFacade0');
    expect(artifact?.code).toContain(
      'new __auAotBrowserFacade0().register(__auAotConfiguration0).app({ component: App });',
    );
    expect(artifact?.resources).toHaveLength(1);
    expect(artifact?.configurations).toHaveLength(1);
    expect(artifact?.browserFacades).toHaveLength(1);
  });

  it('refuses stale and overlapping browser-facade replacement plans', () => {
    const code = 'Aurelia.app({ component: App });';
    const plan = browserFacade(code, 0);
    const emitter = new AotSourceTransformEmitter();

    expect(() => emitter.emit({
      sourcePath: 'C:/app/src/main.ts',
      code: 'Changed.app({ component: App });',
      resources: [],
      browserFacades: [plan],
    })).toThrow(expect.objectContaining({ code: 'AOT_SOURCE_STALE', resourceKey: null }));

    expect(() => emitter.emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [],
      configurations: [{
        value: plan.reference,
        moduleSpecifier: plan.moduleSpecifier,
        expectedDigest: plan.expectedDigest,
        exportName: 'AotConfiguration',
      }],
      browserFacades: [plan],
    })).toThrow(expect.objectContaining({
      code: 'AOT_SOURCE_INVALID_PLAN',
      message: expect.stringContaining('replacement slices overlap'),
    }));
  });

  it('refuses conflicting runtime-module digests across configuration and facade plans', () => {
    const code = 'new Aurelia().register(StandardConfiguration);';
    const moduleSpecifier = 'virtual:aurelia-aot/configuration/conflict';
    const facade = browserFacade(code, code.indexOf('Aurelia'), moduleSpecifier);
    const configured = configuration(code, 'StandardConfiguration', moduleSpecifier);

    expect(() => new AotSourceTransformEmitter().emit({
      sourcePath: 'C:/app/src/main.ts',
      code,
      resources: [],
      configurations: [{ ...configured, expectedDigest: 'digest:configuration' }],
      browserFacades: [{ ...facade, expectedDigest: 'digest:facade' }],
    })).toThrow(expect.objectContaining({
      code: 'AOT_SOURCE_INVALID_PLAN',
      message: expect.stringContaining('conflicting expected digests'),
    }));
  });
});

function resource(input: {
  readonly resourceKey: string;
  readonly variant: string;
  readonly name: string;
  readonly carrierKind: ResourceCarrierKind;
  readonly carrier: { readonly start: number; readonly end: number; readonly oldText: string };
  readonly targetLocalName?: string | null;
  readonly targetDeclaration?: { readonly start: number; readonly end: number; readonly oldText: string } | null;
}): AotSourceTransformResourcePlan {
  return {
    resourceKey: input.resourceKey,
    compilerVariantKey: input.variant,
    definitionName: input.name,
    carrierKind: input.carrierKind,
    carrier: input.carrier,
    targetLocalName: input.targetLocalName ?? null,
    targetDeclaration: input.targetDeclaration ?? null,
    payloadSpecifier: `virtual:aurelia-aot/payload/${encodeURIComponent(input.variant)}`,
    payloadDigest: `digest:${input.variant}`,
  };
}

function slice(code: string, text: string): { readonly start: number; readonly end: number; readonly oldText: string } {
  const start = code.indexOf(text);
  if (start < 0) throw new Error(`Missing source slice '${text}'.`);
  return { start, end: start + text.length, oldText: text };
}

function configuration(
  code: string,
  oldText: string,
  moduleSpecifier = 'virtual:aurelia-aot/configuration/proof',
): AotSourceTransformConfigurationPlan {
  const start = code.lastIndexOf(oldText);
  if (start < 0) throw new Error(`Missing configuration source slice '${oldText}'.`);
  return {
    value: { start, end: start + oldText.length, oldText },
    moduleSpecifier,
    expectedDigest: `digest:${moduleSpecifier}`,
    exportName: 'AotConfiguration',
  };
}

function browserFacade(
  code: string,
  start: number,
  moduleSpecifier = 'virtual:aurelia-aot/configuration/proof',
): AotSourceTransformBrowserFacadePlan {
  const oldText = code.slice(start, start + (code.startsWith('BrowserAurelia', start) ? 'BrowserAurelia'.length : 'Aurelia'.length));
  return {
    reference: { start, end: start + oldText.length, oldText },
    moduleSpecifier,
    expectedDigest: `digest:${moduleSpecifier}`,
    exportName: 'AotBrowserAurelia',
  };
}
