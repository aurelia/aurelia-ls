/**
 * INVESTIGATION: Understanding actual SSR behavior
 *
 * This file investigates real behavior to understand gaps, NOT to freeze current state.
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { createComponent } from "./_helpers/test-utils.js";
import { compileTemplate } from "@aurelia-ls/compiler/facade.js";
import { BUILTIN_SEMANTICS } from "@aurelia-ls/compiler/schema/registry.js";
import type { VmReflection } from "@aurelia-ls/compiler/shared/vm-reflection.js";
const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

describe("INVESTIGATION: Checkbox vs Radio binding behavior", () => {
  it("checkbox checked.bind - what actually happens?", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="checkbox" checked.bind="isChecked">',
      { isChecked: true },
    );

    const result = await compileAndRenderAot(TestApp);
    console.log("\n=== CHECKBOX INVESTIGATION ===");
    console.log("HTML:", result.html);
    console.log("Contains 'checked' anywhere?", result.html.includes("checked"));

    // What's ACTUALLY in the HTML?
    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");
    console.log("DOM checked property:", input?.checked);
    console.log("DOM checked attribute:", input?.getAttribute("checked"));
    console.log("DOM hasAttribute('checked'):", input?.hasAttribute("checked"));
    dom.window.close();
  });

  it("radio checked.bind - what actually happens?", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="radio" checked.bind="isChecked">',
      { isChecked: true },
    );

    const result = await compileAndRenderAot(TestApp);
    console.log("\n=== RADIO INVESTIGATION ===");
    console.log("HTML:", result.html);
    console.log("Contains 'checked' anywhere?", result.html.includes("checked"));

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");
    console.log("DOM checked property:", input?.checked);
    console.log("DOM checked attribute:", input?.getAttribute("checked"));
    console.log("DOM hasAttribute('checked'):", input?.hasAttribute("checked"));
    dom.window.close();
  });

  it("plain HTML checkbox with checked attribute - baseline", async () => {
    // What does a plain checkbox look like when we just have HTML?
    const TestApp = createComponent(
      "test-app",
      '<input type="checkbox" checked>',
      {},
    );

    const result = await compileAndRenderAot(TestApp);
    console.log("\n=== PLAIN CHECKBOX BASELINE ===");
    console.log("HTML:", result.html);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");
    console.log("DOM hasAttribute('checked'):", input?.hasAttribute("checked"));
    dom.window.close();
  });
});

describe("INVESTIGATION: Switch/case compilation", () => {
  it("what does switch/case compile to?", () => {
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
      <span case="b">B</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    console.log("\n=== SWITCH/CASE COMPILATION ===");
    console.log("Template:", aot.template);
    console.log("Target count:", aot.targetCount);
    console.log("Instructions length:", aot.instructions.length);

    // Check the nested definitions (case templates)
    console.log("\nNested definitions count:", aot.nestedDefs.length);
    for (const nested of aot.nestedDefs) {
      console.log(`  ${nested.name}: template="${nested.template}", targetCount=${nested.targetCount}`);
      console.log(`    Nested count: ${nested.nestedTemplates?.length ?? 0}`);
      if (nested.nestedTemplates && nested.nestedTemplates.length > 0) {
        for (const inner of nested.nestedTemplates) {
          console.log(`      ${inner.name}: template="${inner.template}"`);
        }
      }
    }

    // Check raw data from compiler
    console.log("\n=== RAW DATA ===");
    console.log("nestedHtmlTree:", JSON.stringify(aot.raw.nestedHtmlTree, null, 2));
    console.log("serialized nestedTemplates:", JSON.stringify(aot.raw.codeResult.definition.nestedTemplates, (k, v) =>
      k === 'instructions' ? `[${v.length} rows]` : v, 2));

    // The error AUR0757 says "0 targets and N instructions" - let's see what's happening
    const markerCount = (aot.template.match(/<!--au-->/g) || []).length;
    console.log("Marker count in template:", markerCount);
  });

  it.skip("trace switch/case through pipeline", () => {
    // SKIPPED: This debug test uses compileTemplate directly with a partial mock.
    // Use compileWithAot for actual testing.

    // Use compileTemplate to get intermediate artifacts
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
      <span case="b">B</span>
    </div>`;

    // Compile the template
    const vm: VmReflection = {
      lookupProperty: () => undefined,
      getQualifiedVmTypeExpr: () => "unknown",
      getRootVmTypeExpr: () => "unknown",
      lookupTypeAtPos: () => undefined,
    };
    const result = compileTemplate({
      html: template,
      templateFilePath: "test.html",
      isJs: false,
      vm,
      semantics: BUILTIN_SEMANTICS,
      moduleResolver: NOOP_MODULE_RESOLVER,
    });

    const ir = result.ir;
    const linked = result.linked;

    console.log("\n=== STEP 1: IR ===");
    console.log("ir.templates count:", ir.templates.length);
    for (let i = 0; i < ir.templates.length; i++) {
      const t = ir.templates[i];
      console.log(`  [${i}] name=${t.name}, rows=${t.rows.length}, dom.kind=${t.dom.kind}`);
      for (const row of t.rows) {
        for (const ins of row.instructions) {
          if (ins.type === "hydrateTemplateController") {
            console.log(`    -> HydrateTC: ${ins.res}, def.dom.id=${ins.def.dom.id}`);
          }
        }
      }
    }

    console.log("\n=== STEP 2: LINKED ===");
    console.log("linked.templates count:", linked.templates.length);
    for (let i = 0; i < linked.templates.length; i++) {
      const t = linked.templates[i];
      console.log(`  [${i}] name=${t.name}, rows=${t.rows.length}, dom.id=${t.dom.id}`);
      for (const row of t.rows) {
        for (const ins of row.instructions) {
          if (ins.kind === "hydrateTemplateController") {
            console.log(`    -> LinkedTC: ${ins.res}, def.dom.id=${ins.def.dom.id}`);
          }
        }
      }
    }

    // Check if case template DOMs match linked.templates DOMs
    console.log("\n=== DOM IDENTITY CHECK ===");
    const linkedDomIds = new Set(linked.templates.map((t: any) => t.dom.id));
    console.log("Linked template DOM IDs:", [...linkedDomIds]);

    // Find case instructions and check their def.dom.id
    for (const t of linked.templates) {
      for (const row of t.rows) {
        for (const ins of row.instructions as any[]) {
          if (ins.kind === "hydrateTemplateController" && (ins.res === "case" || ins.res === "default-case")) {
            const caseDefDomId = ins.def.dom.id;
            const foundInLinked = linkedDomIds.has(caseDefDomId);
            console.log(`  Case '${ins.res}' def.dom.id=${caseDefDomId}, in linked.templates? ${foundInLinked}`);
          }
        }
      }
    }
  });

  it("compare to if/else which works", () => {
    const template = `<div>
      <span if.bind="showA">A</span>
      <span else>B</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    console.log("\n=== IF/ELSE COMPILATION (works) ===");
    console.log("Template:", aot.template);
    console.log("Target count:", aot.targetCount);
    console.log("Instructions length:", aot.instructions.length);

    console.log("\nNested definitions count:", aot.nestedDefs.length);
    for (const nested of aot.nestedDefs) {
      console.log(`  ${nested.name}: template="${nested.template}", targetCount=${nested.targetCount}`);
    }

    const markerCount = (aot.template.match(/<!--au-->/g) || []).length;
    console.log("Marker count in template:", markerCount);
  });
});

describe("INVESTIGATION: Multiple switches", () => {
  it("what does multiple switches compile to?", () => {
    const template = `<div>
      <div switch.bind="status1">
        <span case="a">S1-A</span>
        <span case="b">S1-B</span>
      </div>
      <div switch.bind="status2">
        <span case="x">S2-X</span>
        <span case="y">S2-Y</span>
      </div>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    console.log("\n=== MULTIPLE SWITCHES COMPILATION ===");
    console.log("Template:", aot.template);
    console.log("Target count:", aot.targetCount);
    console.log("Instructions length:", aot.instructions.length);

    console.log("\nNested definitions count:", aot.nestedDefs.length);
    for (let i = 0; i < aot.nestedDefs.length; i++) {
      const nested = aot.nestedDefs[i];
      console.log(`  [${i}] ${nested.name}: template="${nested.template}", targetCount=${nested.targetCount}`);
      console.log(`    Instructions: ${nested.instructions.length} rows`);
      console.log(`    Nested count: ${nested.nestedTemplates?.length ?? 0}`);
      if (nested.nestedTemplates && nested.nestedTemplates.length > 0) {
        for (let j = 0; j < nested.nestedTemplates.length; j++) {
          const inner = nested.nestedTemplates[j];
          console.log(`      [${j}] ${inner.name}: template="${inner.template}"`);
        }
      }
    }

    // Check raw data from compiler
    console.log("\n=== RAW nestedHtmlTree ===");
    console.log(JSON.stringify(aot.raw.nestedHtmlTree, null, 2));

    console.log("\n=== RAW serialized nestedTemplates ===");
    console.log(JSON.stringify(aot.raw.codeResult.definition.nestedTemplates, (k, v) =>
      k === 'instructions' ? `[${v.length} rows]` : v, 2));
  });
});

describe("INVESTIGATION: Value binding in SSR", () => {
  it("text input value.bind - does the property sync?", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" value.bind="name">',
      { name: "John" },
    );

    const result = await compileAndRenderAot(TestApp);
    console.log("\n=== TEXT INPUT VALUE.BIND ===");
    console.log("HTML:", result.html);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input") as HTMLInputElement;
    console.log("DOM value property:", input?.value);
    console.log("DOM value attribute:", input?.getAttribute("value"));
    dom.window.close();
  });
});
