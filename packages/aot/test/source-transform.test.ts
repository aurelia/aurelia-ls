import { ResourceCarrierKind } from '@aurelia-ls/semantic-runtime/browser-template';
import { describe, expect, it } from 'vitest';

import {
  AotSourceTransformEmitter,
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
