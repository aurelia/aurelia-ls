import { describe, it, expect } from "vitest";
import ts from "typescript";
import { extractDefineCalls, resolveFromDefine } from "@aurelia-ls/resolution";
import type { SourceFacts } from "@aurelia-ls/resolution";
import type { NormalizedPath } from "@aurelia-ls/compiler";

/**
 * Tests for the `.define()` resolver.
 *
 * This resolver handles the official Aurelia API for imperative resource definition:
 * - CustomElement.define({ name, bindables }, Class)
 * - CustomAttribute.define({ name, bindables }, Class)
 * - BindingBehavior.define('name', Class)
 * - ValueConverter.define('name', Class)
 */

function createSourceFile(code: string, fileName = "test.ts"): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
}

function createFacts(code: string, path: NormalizedPath = "/test.ts" as NormalizedPath): SourceFacts {
  const sf = createSourceFile(code);
  const defineCalls = extractDefineCalls(sf);
  return {
    path,
    classes: [],
    registrationCalls: [],
    defineCalls,
    imports: [],
    exports: [],
    variables: [],
    functions: [],
    siblingFiles: [],
    templateImports: [],
  };
}

describe("extractDefineCalls", () => {
  describe("CustomElement.define()", () => {
    it("extracts element with name and string array bindables", () => {
      const code = `
        export class ViewportCustomElement {}
        CustomElement.define({
          name: 'au-viewport',
          bindables: ['name', 'usedBy', 'default', 'fallback'],
        }, ViewportCustomElement);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.resourceType).toBe("CustomElement");
      expect(call.className).toBe("ViewportCustomElement");
      expect(call.name).toBe("au-viewport");
      expect(call.bindables).toEqual([
        { name: "name" },
        { name: "usedBy" },
        { name: "default" },
        { name: "fallback" },
      ]);
    });

    it("extracts element with object-style bindables", () => {
      const code = `
        export class LoadCustomAttribute {}
        CustomAttribute.define({
          name: 'load',
          bindables: {
            route: { mode: bmToView, primary: true },
            params: { mode: bmToView },
            attribute: { mode: bmToView },
            active: { mode: bmFromView },
            context: { mode: bmToView }
          }
        }, LoadCustomAttribute);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.resourceType).toBe("CustomAttribute");
      expect(call.className).toBe("LoadCustomAttribute");
      expect(call.name).toBe("load");
      expect(call.bindables?.length).toBe(5);

      const routeBindable = call.bindables?.find(b => b.name === "route");
      expect(routeBindable?.mode).toBe("toView");
      expect(routeBindable?.primary).toBe(true);

      const activeBindable = call.bindables?.find(b => b.name === "active");
      expect(activeBindable?.mode).toBe("fromView");
    });

    it("extracts element with template and containerless", () => {
      const code = `
        export class MyElement {}
        CustomElement.define({
          name: 'my-element',
          template: '<div>Hello</div>',
          containerless: true,
        }, MyElement);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.template).toBe("<div>Hello</div>");
      expect(call.containerless).toBe(true);
    });
  });

  describe("CustomAttribute.define()", () => {
    it("extracts attribute with isTemplateController", () => {
      const code = `
        export class MyIfCustomAttribute {}
        CustomAttribute.define({
          name: 'my-if',
          isTemplateController: true,
        }, MyIfCustomAttribute);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.resourceType).toBe("CustomAttribute");
      expect(call.name).toBe("my-if");
      expect(call.isTemplateController).toBe(true);
    });

    it("extracts attribute with noMultiBindings", () => {
      const code = `
        export class HrefCustomAttribute {}
        CustomAttribute.define({
          name: 'href',
          noMultiBindings: true,
        }, HrefCustomAttribute);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.noMultiBindings).toBe(true);
    });
  });

  describe("BindingBehavior.define()", () => {
    it("extracts binding behavior with short form", () => {
      const code = `
        export class StateBindingBehavior {}
        BindingBehavior.define('state', StateBindingBehavior);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.resourceType).toBe("BindingBehavior");
      expect(call.className).toBe("StateBindingBehavior");
      expect(call.name).toBe("state");
    });
  });

  describe("ValueConverter.define()", () => {
    it("extracts value converter with short form", () => {
      const code = `
        export class JsonValueConverter {}
        ValueConverter.define('json', JsonValueConverter);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);

      expect(calls.length).toBe(1);
      const call = calls[0]!;
      expect(call.resourceType).toBe("ValueConverter");
      expect(call.className).toBe("JsonValueConverter");
      expect(call.name).toBe("json");
    });
  });

  describe("binding mode extraction", () => {
    it("extracts numeric binding modes", () => {
      const code = `
        export class MyAttr {}
        CustomAttribute.define({
          name: 'my-attr',
          bindables: {
            oneTime: { mode: 1 },
            toView: { mode: 2 },
            fromView: { mode: 4 },
            twoWay: { mode: 6 },
          }
        }, MyAttr);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);
      const bindables = calls[0]?.bindables ?? [];

      expect(bindables.find(b => b.name === "oneTime")?.mode).toBe("oneTime");
      expect(bindables.find(b => b.name === "toView")?.mode).toBe("toView");
      expect(bindables.find(b => b.name === "fromView")?.mode).toBe("fromView");
      expect(bindables.find(b => b.name === "twoWay")?.mode).toBe("twoWay");
    });

    it("extracts BindingMode.* property access", () => {
      const code = `
        export class MyAttr {}
        CustomAttribute.define({
          name: 'my-attr',
          bindables: {
            value: { mode: BindingMode.twoWay },
          }
        }, MyAttr);
      `;
      const sf = createSourceFile(code);
      const calls = extractDefineCalls(sf);
      const bindables = calls[0]?.bindables ?? [];

      expect(bindables[0]?.mode).toBe("twoWay");
    });
  });
});

describe("resolveFromDefine", () => {
  it("creates element candidate from CustomElement.define()", () => {
    const facts = createFacts(`
      export class ViewportCustomElement {}
      CustomElement.define({
        name: 'au-viewport',
        bindables: ['name', 'usedBy', 'default', 'fallback'],
      }, ViewportCustomElement);
    `);

    const result = resolveFromDefine(facts);

    expect(result.value.length).toBe(1);
    const candidate = result.value[0]!;
    expect(candidate.kind).toBe("element");
    expect(candidate.name).toBe("au-viewport");
    expect(candidate.className).toBe("ViewportCustomElement");
    expect(candidate.resolver).toBe("define");
    expect(candidate.confidence).toBe("explicit");
    expect(candidate.bindables.length).toBe(4);
    expect(candidate.bindables.map(b => b.name)).toEqual(["name", "usedBy", "default", "fallback"]);
  });

  it("creates attribute candidate from CustomAttribute.define()", () => {
    const facts = createFacts(`
      export class LoadCustomAttribute {}
      CustomAttribute.define({
        name: 'load',
        bindables: {
          route: { mode: 2, primary: true },
          params: { mode: 2 },
        }
      }, LoadCustomAttribute);
    `);

    const result = resolveFromDefine(facts);

    expect(result.value.length).toBe(1);
    const candidate = result.value[0]!;
    expect(candidate.kind).toBe("attribute");
    expect(candidate.name).toBe("load");
    expect(candidate.className).toBe("LoadCustomAttribute");
    expect(candidate.resolver).toBe("define");
    expect(candidate.primary).toBe("route");

    const routeBindable = candidate.bindables.find(b => b.name === "route");
    expect(routeBindable?.mode).toBe("toView");
    expect(routeBindable?.primary).toBe(true);
  });

  it("creates binding behavior candidate from BindingBehavior.define()", () => {
    const facts = createFacts(`
      export class StateBindingBehavior {}
      BindingBehavior.define('state', StateBindingBehavior);
    `);

    const result = resolveFromDefine(facts);

    expect(result.value.length).toBe(1);
    const candidate = result.value[0]!;
    expect(candidate.kind).toBe("bindingBehavior");
    expect(candidate.name).toBe("state");
    expect(candidate.className).toBe("StateBindingBehavior");
    expect(candidate.resolver).toBe("define");
  });

  it("creates value converter candidate from ValueConverter.define()", () => {
    const facts = createFacts(`
      export class JsonValueConverter {}
      ValueConverter.define('json', JsonValueConverter);
    `);

    const result = resolveFromDefine(facts);

    expect(result.value.length).toBe(1);
    const candidate = result.value[0]!;
    expect(candidate.kind).toBe("valueConverter");
    expect(candidate.name).toBe("json");
    expect(candidate.className).toBe("JsonValueConverter");
    expect(candidate.resolver).toBe("define");
  });

  it("handles multiple define calls in same file", () => {
    const facts = createFacts(`
      export class ViewportCustomElement {}
      CustomElement.define({ name: 'au-viewport' }, ViewportCustomElement);

      export class HrefCustomAttribute {}
      CustomAttribute.define({ name: 'href' }, HrefCustomAttribute);

      export class StateBindingBehavior {}
      BindingBehavior.define('state', StateBindingBehavior);
    `);

    const result = resolveFromDefine(facts);

    expect(result.value.length).toBe(3);
    expect(result.value.find(c => c.kind === "element")?.name).toBe("au-viewport");
    expect(result.value.find(c => c.kind === "attribute")?.name).toBe("href");
    expect(result.value.find(c => c.kind === "bindingBehavior")?.name).toBe("state");
  });

  it("returns high confidence", () => {
    const facts = createFacts(`
      export class MyElement {}
      CustomElement.define({ name: 'my-element' }, MyElement);
    `);

    const result = resolveFromDefine(facts);

    expect(result.confidence).toBe("high");
    expect(result.gaps.length).toBe(0);
  });
});
