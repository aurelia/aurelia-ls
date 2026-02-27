import { describe, test, expect } from "vitest";

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
import type { SerializedDefinition, SerializedHydrateTemplateController } from "../../../out/synthesis/aot/types.js";
import { noopModuleResolver } from "../../_helpers/test-utils.js";

type DefinitionTree = {
  definition: SerializedDefinition;
  html: string;
  nested: DefinitionTree[];
};

const CASES = [
  {
    name: "repeat + if on same element",
    markup: "<div repeat.for=\"item of items\" if.bind=\"item.active\">${item}</div>",
  },
  {
    name: "repeat + if + with stacked",
    markup: "<div repeat.for=\"item of items\" if.bind=\"item.active\" with.bind=\"item\">${name}</div>",
  },
  {
    name: "if + repeat on same element",
    markup: "<div if.bind=\"show\" repeat.for=\"item of items\">${item}</div>",
  },
  {
    name: "switch with repeat in case",
    markup: "<div switch.bind=\"mode\"><template case=\"list\"><ul repeat.for=\"item of items\"><li>${item}</li></ul></template></div>",
  },
  {
    name: "promise with repeat in then",
    markup: "<div promise.bind=\"load()\"><template then=\"items\"><span repeat.for=\"item of items\">${item}</span></template></div>",
  },
];

describe("AOT Emit Invariants", () => {
  for (const testCase of CASES) {
    test(testCase.name, () => {
      const tree = compileDefinitionTree(testCase.markup);
      assertDefinitionTree(tree, "root");
    });
  }
});

function compileDefinitionTree(markup: string): DefinitionTree {
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
  const code = emitAotCode(plan, { name: "test" });
  const template = emitTemplate(plan);
  const nestedHtml = collectNestedTemplateHtmlTree(plan);

  return attachHtml(code.definition, template.html, nestedHtml);
}

function attachHtml(
  definition: SerializedDefinition,
  html: string,
  nestedHtml: NestedTemplateHtmlNode[] | undefined,
): DefinitionTree {
  const nestedDefs = definition.nestedTemplates ?? [];
  const nestedHtmlNodes = nestedHtml ?? [];

  const nested = nestedDefs.map((child, index) => {
    const htmlNode = nestedHtmlNodes[index];
    return attachHtml(child, htmlNode?.html ?? "", htmlNode?.nested ?? []);
  });

  return { definition, html, nested };
}

function assertDefinitionTree(node: DefinitionTree, path: string): void {
  const controllers = collectControllers(node.definition);
  const nestedDefs = node.definition.nestedTemplates ?? [];

  expect(
    nestedDefs.length,
    `${path}: nested template count mismatch`
  ).toBe(controllers.length);

  expect(
    node.nested.length,
    `${path}: nested HTML tree count mismatch`
  ).toBe(nestedDefs.length);

  for (const ctrl of controllers) {
    expect(
      ctrl.templateIndex,
      `${path}: controller templateIndex should be defined`
    ).toBeTypeOf("number");
    expect(
      ctrl.templateIndex,
      `${path}: controller templateIndex out of range`
    ).toBeLessThan(nestedDefs.length);
  }

  for (let i = 0; i < node.nested.length; i++) {
    assertDefinitionTree(node.nested[i]!, `${path}.nested[${i}]`);
  }
}

function collectControllers(definition: SerializedDefinition): SerializedHydrateTemplateController[] {
  const controllers: SerializedHydrateTemplateController[] = [];
  for (const row of definition.instructions) {
    for (const inst of row) {
      if (inst.type === INSTRUCTION_TYPE.hydrateTemplateController) {
        controllers.push(inst as SerializedHydrateTemplateController);
      }
    }
  }
  return controllers;
}


