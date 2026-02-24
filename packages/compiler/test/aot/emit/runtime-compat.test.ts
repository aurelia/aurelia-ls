/**
 * AOT Runtime Compatibility Tests
 *
 * Verifies that AOT-emitted instructions are compatible with Aurelia runtime.
 * These tests exercise actual resolution of resources like `au-viewport`.
 *
 * Key scenarios:
 * - Custom elements from @aurelia/router resolve correctly
 * - Resolution uses BUILTIN_SEMANTICS properly
 * - Emitted instructions have correct structure for runtime consumption
 */

import { test, describe, expect } from "vitest";
import { lowerDocument } from "../../../out/analysis/10-lower/lower.js";
import { linkTemplateSemantics } from "../../../out/analysis/20-link/resolve.js";
import { buildSemanticsSnapshot } from "../../../out/schema/snapshot.js";
import { bindScopes } from "../../../out/analysis/30-bind/bind.js";
import { planAot } from "../../../out/synthesis/aot/plan.js";
import { emitAotCode } from "../../../out/synthesis/aot/emit.js";
import { emitTemplate, collectNestedTemplateHtmlTree, type NestedTemplateHtmlNode } from "../../../out/synthesis/aot/emit-template.js";
import { getExpressionParser } from "../../../out/parsing/expression-parser.js";
import { DEFAULT_SYNTAX } from "../../../out/parsing/attribute-parser.js";
import { BUILTIN_SEMANTICS } from "../../../out/schema/registry.js";
import { DiagnosticsRuntime } from "../../../out/diagnostics/runtime.js";
import { INSTRUCTION_TYPE } from "../../../out/synthesis/aot/constants.js";
import type { SerializedDefinition, SerializedInstruction, SerializedHydrateElement, SerializedHydrateTemplateController } from "../../../out/synthesis/aot/types.js";
import { noopModuleResolver } from "../../_helpers/test-utils.js";

// =============================================================================
// Test Helpers
// =============================================================================

interface CompileResult {
  definition: SerializedDefinition;
  allInstructions: SerializedInstruction[];
  /** Template HTML with hydration markers */
  templateHtml: string;
  /** Nested template HTML tree */
  nestedHtmlTree: NestedTemplateHtmlNode[];
  // Include the raw result for deeper inspection
  raw: ReturnType<typeof emitAotCode>;
}

function compileTemplate(markup: string): CompileResult {
  const exprParser = getExpressionParser();
  const diagnostics = new DiagnosticsRuntime();

  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: "test.html",
    name: "test",
    catalog: BUILTIN_SEMANTICS.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
  const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(BUILTIN_SEMANTICS), {
    moduleResolver: noopModuleResolver,
    templateFilePath: "test.html",
    diagnostics: diagnostics.forSource("link"),
  });
  const scope = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });
  const plan = planAot(linked, scope, { templateFilePath: "test.html" });

  // Emit both instructions AND template HTML (both are needed for runtime)
  const codeResult = emitAotCode(plan, { name: "test" });
  const templateResult = emitTemplate(plan);
  const nestedHtmlTree = collectNestedTemplateHtmlTree(plan);

  const allInstructions: SerializedInstruction[] = [];

  function collectInstructions(instructions: SerializedInstruction[][]) {
    for (const row of instructions) {
      for (const inst of row) {
        allInstructions.push(inst);
        if ("instructions" in inst && Array.isArray(inst.instructions)) {
          for (const nested of inst.instructions) {
            allInstructions.push(nested);
          }
        }
      }
    }
  }

  collectInstructions(codeResult.definition.instructions);

  if (codeResult.definition.nestedTemplates) {
    for (const nested of codeResult.definition.nestedTemplates) {
      if (nested.instructions) {
        collectInstructions(nested.instructions);
      }
    }
  }

  return {
    definition: codeResult.definition,
    allInstructions,
    templateHtml: templateResult.html,
    nestedHtmlTree,
    raw: codeResult,
  };
}

function findInstructionsByType<T extends SerializedInstruction>(
  instructions: SerializedInstruction[],
  type: number
): T[] {
  return instructions.filter((i) => i.type === type) as T[];
}

// =============================================================================
// Core Resolution Tests - Does the compiler recognize au-viewport?
// =============================================================================

describe("au-viewport Resolution", () => {
  test("au-viewport is recognized as a custom element (not plain HTML)", () => {
    const result = compileTemplate(`<au-viewport></au-viewport>`);

    // Should produce a hydrateElement instruction, NOT be ignored as unknown HTML
    const hydrateElements = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    );

    expect(hydrateElements.length).toBe(1);
    expect(hydrateElements[0]!.res).toBe("au-viewport");
  });

  test("au-viewport in BUILTIN_SEMANTICS has correct structure", () => {
    // Directly verify the semantics entry
    const viewport = BUILTIN_SEMANTICS.resources.elements["au-viewport"];

    expect(viewport).toBeDefined();
    expect(viewport?.kind).toBe("element");
    expect(viewport?.name).toBe("au-viewport");
    expect(viewport?.package).toBe("@aurelia/router");
    expect(viewport?.bindables).toHaveProperty("name");
  });

  test("au-viewport with name attribute produces correct instructions", () => {
    const result = compileTemplate(`<au-viewport name="main"></au-viewport>`);

    const hydrateElements = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    );

    expect(hydrateElements.length).toBe(1);
    const inst = hydrateElements[0]!;
    expect(inst.res).toBe("au-viewport");

    // Should have a setProperty instruction for the name attribute
    expect(inst.instructions.length).toBeGreaterThan(0);
  });

  test("au-viewport with bound name produces binding instruction", () => {
    const result = compileTemplate(`<au-viewport name.bind="viewportName"></au-viewport>`);

    const hydrateElements = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    );

    expect(hydrateElements.length).toBe(1);
    const inst = hydrateElements[0]!;
    expect(inst.res).toBe("au-viewport");

    // Should have a propertyBinding instruction
    const bindingInst = inst.instructions.find(
      (i) => i.type === INSTRUCTION_TYPE.propertyBinding
    );
    expect(bindingInst).toBeDefined();
  });

  test("multiple au-viewports each get their own hydrateElement", () => {
    const result = compileTemplate(`
      <au-viewport name="header"></au-viewport>
      <au-viewport name="main"></au-viewport>
      <au-viewport name="footer"></au-viewport>
    `);

    const hydrateElements = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    );

    expect(hydrateElements.length).toBe(3);
    for (const inst of hydrateElements) {
      expect(inst.res).toBe("au-viewport");
    }
  });

  test("au-viewport inside if.bind is correctly nested", () => {
    const result = compileTemplate(`
      <div if.bind="showRouter">
        <au-viewport></au-viewport>
      </div>
    `);

    // Should have an if controller
    const controllers = findInstructionsByType<SerializedHydrateTemplateController>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateTemplateController
    );
    expect(controllers.some((c) => c.res === "if")).toBe(true);

    // The nested template should contain the au-viewport
    expect(result.definition.nestedTemplates).toBeDefined();
    expect(result.definition.nestedTemplates!.length).toBeGreaterThan(0);

    // Check that au-viewport is in the nested template's instructions
    const nestedInstructions = result.definition.nestedTemplates![0]!.instructions;
    const flatNested: SerializedInstruction[] = [];
    for (const row of nestedInstructions) {
      flatNested.push(...row);
    }
    const nestedViewport = flatNested.find(
      (i) => i.type === INSTRUCTION_TYPE.hydrateElement && (i as SerializedHydrateElement).res === "au-viewport"
    );
    expect(nestedViewport).toBeDefined();
  });
});

// =============================================================================
// Instruction Structure Tests - Runtime expects specific shapes
// =============================================================================

describe("Instruction Structure for Runtime", () => {
  test("hydrateElement uses 'res' not 'resource'", () => {
    const result = compileTemplate(`<au-viewport></au-viewport>`);

    const inst = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    )[0]!;

    // Runtime expects 'res' field
    expect(inst).toHaveProperty("res");
    expect((inst as Record<string, unknown>)["resource"]).toBeUndefined();
  });

  test("hydrateTemplateController uses 'res' not 'resource'", () => {
    const result = compileTemplate(`<div if.bind="show">content</div>`);

    const inst = findInstructionsByType<SerializedHydrateTemplateController>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateTemplateController
    )[0]!;

    expect(inst).toHaveProperty("res");
    expect(inst.res).toBe("if");
    expect((inst as Record<string, unknown>)["resource"]).toBeUndefined();
  });

  test("instruction type constants match runtime values", () => {
    // These must match @aurelia/runtime-html constants
    expect(INSTRUCTION_TYPE.hydrateElement).toBe(0);
    expect(INSTRUCTION_TYPE.hydrateAttribute).toBe(1);
    expect(INSTRUCTION_TYPE.hydrateTemplateController).toBe(2);
  });
});

// =============================================================================
// Template HTML Output Tests - For hydration
// =============================================================================

describe("Template HTML for Hydration", () => {
  test("au-viewport produces marker in template HTML", () => {
    const result = compileTemplate(`<au-viewport></au-viewport>`);

    // Template HTML should be generated with hydration markers
    expect(result.templateHtml).toBeDefined();
    expect(result.templateHtml.length).toBeGreaterThan(0);

    // Template should contain <!--au--> marker before au-viewport
    expect(result.templateHtml).toContain("<!--au-->");
    // Template should preserve the au-viewport element
    expect(result.templateHtml).toContain("<au-viewport");
  });

  test("template with multiple elements has correct target count", () => {
    const result = compileTemplate(`
      <au-viewport name="a"></au-viewport>
      <div>static content</div>
      <au-viewport name="b"></au-viewport>
    `);

    // targetCount should reflect elements that need hydration
    expect(result.definition.targetCount).toBeGreaterThanOrEqual(2);

    // Template HTML should have markers for each target
    const markerCount = (result.templateHtml.match(/<!--au-->/g) || []).length;
    expect(markerCount).toBeGreaterThanOrEqual(2);
  });

  test("template controller produces start/end markers", () => {
    const result = compileTemplate(`<div if.bind="show">content</div>`);

    // Template controllers use <!--au-start--> and <!--au-end--> markers
    expect(result.templateHtml).toContain("<!--au-start-->");
    expect(result.templateHtml).toContain("<!--au-end-->");

    // Nested template should have the controller content
    expect(result.nestedHtmlTree.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Debug: Log actual output for inspection
// =============================================================================

describe("Debug Output Inspection", () => {
  test("log full instruction structure for au-viewport", () => {
    const result = compileTemplate(`<au-viewport name="main"></au-viewport>`);

    // This test exists to make the actual output visible when debugging
    const hydrateElements = findInstructionsByType<SerializedHydrateElement>(
      result.allInstructions,
      INSTRUCTION_TYPE.hydrateElement
    );

    console.log("HydrateElement instruction:", JSON.stringify(hydrateElements[0], null, 2));
    console.log("Template HTML:", result.templateHtml);
    console.log("Target count:", result.definition.targetCount);
    console.log("Nested HTML tree:", JSON.stringify(result.nestedHtmlTree, null, 2));

    // Always pass - this is for inspection
    expect(hydrateElements.length).toBe(1);
  });
});


