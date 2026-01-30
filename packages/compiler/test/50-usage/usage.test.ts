import { describe, it, expect } from "vitest";

import { compileTemplate, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

describe("FeatureUsageSet", () => {
  it("captures used resources, syntax, and flags", () => {
    const markup = `
      <template>
        <div if.bind="show"></div>
        <div repeat.for="item of items"></div>
        <div show.bind="isVisible"></div>
        <input value.bind="name | sanitize & debounce" @click="onClick" :class="isOn" t="hello">
        <au-compose component.bind="Cmp"></au-compose>
      </template>
    `;

    const result = compileTemplate({
      html: markup,
      templateFilePath: "/app.html",
      isJs: false,
      vm: createVmReflection(),
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: NOOP_MODULE_RESOLVER,
    });

    const usage = result.usage;
    expect(usage.elements).toEqual(expect.arrayContaining(["au-compose"]));
    expect(usage.attributes).toEqual(expect.arrayContaining(["show"]));
    expect(usage.controllers).toEqual(expect.arrayContaining(["if", "repeat"]));
    expect(usage.commands).toEqual(expect.arrayContaining(["bind", "for", "trigger", "t"]));
    expect(usage.patterns).toEqual(expect.arrayContaining(["PART.PART", ":PART", "@PART", "t"]));
    expect(usage.valueConverters).toEqual(expect.arrayContaining(["sanitize"]));
    expect(usage.bindingBehaviors).toEqual(expect.arrayContaining(["debounce"]));
    expect(usage.flags).toEqual(expect.objectContaining({
      usesCompose: true,
      usesDynamicCompose: true,
      usesTemplateControllers: true,
    }));
  });
});
