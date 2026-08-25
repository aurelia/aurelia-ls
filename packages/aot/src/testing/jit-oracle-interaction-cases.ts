import {
  itHydrateElement,
  itHydrateTemplateController,
  itIteratorBinding,
  itPropertyBinding,
  itTextBinding,
} from "@aurelia/template-compiler";
import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  inlineCompilerWorld,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerFocusedInvariant,
  CompilerWorld,
} from "./compiler-case.js";
import { CUSTOM_ELEMENT_SETUP_ID } from "./jit-oracle-setups.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const staleGeneratorSource = "scripts/generate-tests/template-compiler.static.ts";
const generatedIfElseSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.spec.ts";
const generatedIfElseDoubleSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.double.spec.ts";
const generatedRepeatSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.repeat.spec.ts";
const generatedRepeatDoubleSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.repeat.double.spec.ts";

const renderLocation = "<!--au--><!--au-start--><!--au-end-->";
const twoRenderLocations = `<template>${renderLocation}${renderLocation}</template>`;
const fourRenderLocations = `<template>${renderLocation}${renderLocation}${renderLocation}${renderLocation}</template>`;

const nestedIfElseCase = jitCharacterizationCase({
  id: "interaction.generated.nested-if-else-template",
  family: "generated-interaction",
  tags: ["interaction", "checked-artifact", "if-else", "nested", "template-host"],
  requirement: "Nested if/else template hosts retain two sibling root rows and independently ordered inner branch rows.",
  provenance: [
    compilerAuthority(generatedIfElseSuite, 786, 795, "behavior", {
      suiteName: "3-runtime-html/generated/static.if-else.spec.ts",
      testName: "tag$02 text$03 if$02 else$05 nested$01 _",
      summary: "The pinned checked artifact supplies the exact nested template world and characterizes runtime text b.",
    }),
    compilerAuthority(templateCompilerSource, 557, 645, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "The live compiler wraps controller hosts into nested definitions and assigns child rows.",
    }),
    compilerAuthority(staleGeneratorSource, 689, 701, "history", {
      symbolName: "generateTests",
      summary: "The stale generator records the nested if/else design dimension but is not current execution authority.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.interaction.if-else", "primary", "The checked nested branch world is compiled directly."),
    compilerObligation("compiler.interaction.controller-nesting", "primary", "Both outer branches own an inner if/else pair."),
    compilerObligation("compiler.template-controller.siblings", "primary", "Root if and else remain separate ordered targets."),
    compilerObligation("compiler.template-controller.child-context", "primary", "Inner branch and text rows belong to the correct nested definitions."),
    compilerObligation("compiler.node.row-target-alignment", "interaction", "Root and child rows retain exact document order."),
    compilerObligation("compiler.wire.hydrate-template-controller", "interaction", "Each controller wire retains its resource and nested definition."),
  ],
  world: inlineCompilerWorld(
    "aot-generated-nested-if-else",
    '<template><template if.bind="false">'
      + '<template if.bind="false">${msg}</template><template else>${not}</template>'
      + "</template><template else>"
      + '<template if.bind="false">${msg}</template><template else>${not}</template>'
      + "</template></template>",
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-generated-nested-if-else", 2),
    templateHtml("nested-if-else.template", twoRenderLocations),
    rowWidth("nested-if-else.row-0-width", 0, 1),
    rowWidth("nested-if-else.row-1-width", 1, 1),
    instructionField("nested-if-else.outer-if-type", 0, 0, "type", itHydrateTemplateController),
    instructionField("nested-if-else.outer-if-resource", 0, 0, "res", "if"),
    instructionField("nested-if-else.outer-else-type", 1, 0, "type", itHydrateTemplateController),
    instructionField("nested-if-else.outer-else-resource", 1, 0, "res", "else"),
    instructionPath("nested-if-else.if-child-row-count", 0, 0, ["def", "instructions", "length"], 2),
    instructionPath("nested-if-else.else-child-row-count", 1, 0, ["def", "instructions", "length"], 2),
    ...nestedIfElseBranchInvariants(0, "outer-if"),
    ...nestedIfElseBranchInvariants(1, "outer-else"),
  ],
  contrasts: [{
    caseId: "interaction.generated.double-sibling-if",
    relation: "nearest-neighbor",
    difference: "Both have two independent root controller rows; this world pairs if/else inside each branch while the neighbor duplicates two nested-if chains.",
  }],
});

const doubleSiblingCase = jitCharacterizationCase({
  id: "interaction.generated.double-sibling-if",
  family: "generated-interaction",
  tags: ["interaction", "checked-artifact", "template-controller", "siblings", "nested"],
  requirement: "Two sibling nested-if trees retain independent root targets and independently restarted child rows.",
  provenance: [
    compilerAuthority(generatedIfElseDoubleSuite, 84, 91, "behavior", {
      suiteName: "3-runtime-html/generated/static.if-else.double.spec.ts",
      testName: "tag$01 text$01 if$01 if$01 nested$01 double$05 _",
      summary: "The pinned checked artifact supplies two identical nested-if siblings and characterizes runtime text aa.",
    }),
    compilerAuthority(templateCompilerSource, 557, 681, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "Controller wrapping and root traversal create independent sibling definitions and rows.",
    }),
    compilerAuthority(staleGeneratorSource, 483, 530, "history", {
      symbolName: "generateTests",
      summary: "The stale generator retains the nested/double design coordinates but no longer reproduces the checked artifact tree.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.interaction.controller-siblings", "primary", "Two generated sibling chains are characterized together."),
    compilerObligation("compiler.template-controller.siblings", "primary", "Each outer if owns a separate root row."),
    compilerObligation("compiler.template-controller.nested-definition", "primary", "Each outer and inner if publishes a closed nested definition."),
    compilerObligation("compiler.node.row-target-alignment", "primary", "Sibling and child row counts restart independently."),
    compilerObligation("compiler.wire.hydrate-template-controller", "interaction", "All four if hydrations retain their nested definitions."),
  ],
  world: inlineCompilerWorld(
    "aot-generated-double-sibling-if",
    '<template><div if.bind="true"><div if.bind="true">a</div></div>'
      + '<div if.bind="true"><div if.bind="true">a</div></div></template>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-generated-double-sibling-if", 2),
    templateHtml("double-sibling.template", twoRenderLocations),
    ...doubleSiblingInvariants(0, "first"),
    ...doubleSiblingInvariants(1, "second"),
  ],
  contrasts: [{
    caseId: "interaction.generated.nested-if-else-template",
    relation: "nearest-neighbor",
    difference: "Both have two independent root controller rows; this world duplicates nested-if chains without else pairing.",
  }],
});

const sameNodeIfRepeatCase = jitCharacterizationCase({
  id: "interaction.generated.same-node-if-repeat-custom-element",
  family: "generated-interaction",
  tags: ["interaction", "checked-artifact", "if-else", "repeat", "same-node", "custom-element"],
  requirement: "Co-located if/else and repeat controllers preserve outer branch order, iterator ownership, and custom-element bindable hydration.",
  provenance: [
    compilerAuthority(generatedRepeatSuite, 4008, 4024, "behavior", {
      suiteName: "3-runtime-html/generated/static.if-else.repeat.spec.ts",
      testName: "tag$03 text$03 if$01 repeat$13 variant$03 _",
      summary: "The pinned checked artifact supplies same-node if/repeat and else/repeat hosts around my-foo and characterizes runtime text abc.",
    }),
    compilerAuthority(templateCompilerSource, 557, 645, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "Authored controller order determines the inside-out definition chain before CE hydration.",
    }),
    compilerAuthority(staleGeneratorSource, 809, 873, "history", {
      symbolName: "generateTests",
      summary: "The stale generator records repeat variant$03 and its same-element intent; the checked artifact remains execution authority.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.interaction.if-else", "primary", "The root branch pair remains if followed by else."),
    compilerObligation("compiler.interaction.repeat", "primary", "Both branch definitions contain an array repeat controller."),
    compilerObligation("compiler.template-controller.same-element", "primary", "Co-located branch and repeat attributes become separate nested definitions."),
    compilerObligation("compiler.template-controller.inside-out-order", "primary", "If or else remains outside repeat according to authored order."),
    compilerObligation("compiler.command.iterator", "interaction", "Repeat retains its iterator instruction and item declaration."),
    compilerObligation("compiler.element.hydration", "interaction", "The repeat leaf hydrates my-foo with its item bindable."),
    compilerObligation("compiler.wire.iterator", "interaction", "The iterator wire remains nested under repeat."),
  ],
  world: customElementInteractionWorld(
    "aot-generated-same-node-if-repeat",
    '<template><template if.bind="true" repeat.for="item of [\'a\', \'b\', \'c\']">'
      + '<my-foo item.bind="item"></my-foo></template>'
      + '<template else repeat.for="item of [\'a\', \'b\', \'c\']">'
      + "<my-foo item.bind=\"item\"></my-foo></template></template>",
    false,
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-generated-same-node-if-repeat", 2),
    definitionDependencies("same-node-if-repeat.dependencies", 1),
    templateHtml("same-node-if-repeat.template", twoRenderLocations),
    instructionField("same-node-if-repeat.outer-if-resource", 0, 0, "res", "if"),
    instructionField("same-node-if-repeat.outer-else-resource", 1, 0, "res", "else"),
    ...ifRepeatBranchInvariants(0, "if"),
    ...ifRepeatBranchInvariants(1, "else"),
  ],
  contrasts: [{
    caseId: "interaction.generated.containerless-repeat-controller",
    relation: "interaction-control",
    difference: "Both compose branch, repeat, and my-foo hydration; the neighbor adds definition-level containerless behavior and four asymmetric sibling chains.",
  }],
});

const containerlessRepeatCase = jitCharacterizationCase({
  id: "interaction.generated.containerless-repeat-controller",
  family: "generated-interaction",
  tags: ["interaction", "checked-artifact", "containerless", "repeat", "template-controller", "siblings"],
  requirement: "A containerless custom-element leaf retains render locations through four asymmetric if/else/repeat controller chains.",
  provenance: [
    compilerAuthority(generatedRepeatDoubleSuite, 5170, 5187, "behavior", {
      suiteName: "3-runtime-html/generated/static.if-else.repeat.double.spec.ts",
      testName: "tag$04 text$03 if$02 repeat$13 variant$12$double$02 _",
      summary: "The pinned checked artifact supplies four asymmetric branch chains around containerless my-foo and characterizes runtime text abc.",
    }),
    compilerAuthority(templateCompilerSource, 557, 681, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "Controller and definition-level containerless rules produce nested render-location templates.",
    }),
    compilerAuthority(staleGeneratorSource, 1055, 1085, "history", {
      symbolName: "generateTests",
      summary: "The stale generator records variant$12 double permutations; its obsolete output path and scaffold make it history rather than oracle authority.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.interaction.containerless", "primary", "The generated containerless host interaction is characterized at definition level."),
    compilerObligation("compiler.interaction.repeat", "primary", "Two selected else chains retain repeat definitions."),
    compilerObligation("compiler.interaction.controller-siblings", "primary", "Four root branch chains retain independent row identities."),
    compilerObligation("compiler.template-controller.same-element", "interaction", "The longest chain preserves co-located else, if, and repeat controllers."),
    compilerObligation("compiler.element.containerless", "primary", "Definition-level containerless metadata changes the leaf effective tree."),
    compilerObligation("compiler.node.render-location", "primary", "Root, controller, and containerless leaf targets retain exact render locations."),
    compilerObligation("compiler.node.row-target-alignment", "interaction", "Four root rows and all nested single rows remain aligned."),
  ],
  world: customElementInteractionWorld(
    "aot-generated-containerless-repeat-controller",
    '<template><template if.bind="false"><my-foo item.bind="item"></my-foo></template>'
      + '<template else if.bind="false" repeat.for="item of [\'a\', \'b\', \'c\']">'
      + '<my-foo item.bind="item"></my-foo></template>'
      + '<template if.bind="false"><my-foo item.bind="item"></my-foo></template>'
      + '<template else repeat.for="item of [\'a\', \'b\', \'c\']">'
      + "<my-foo item.bind=\"item\"></my-foo></template></template>",
    true,
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-generated-containerless-repeat-controller", 4),
    definitionDependencies("containerless.dependencies", 1),
    templateHtml("containerless.template", fourRenderLocations),
    ...rootResourceOrder(["if", "else", "if", "else"]),
    instructionPath("containerless.first-leaf-type", 0, 0, ["def", "instructions", 0, 0, "type"], itHydrateElement),
    instructionPath("containerless.first-leaf-resource", 0, 0, ["def", "instructions", 0, 0, "res"], "my-foo"),
    instructionPath("containerless.first-leaf-usage-flag", 0, 0, ["def", "instructions", 0, 0, "containerless"], false),
    instructionPath("containerless.long-chain-if", 1, 0, ["def", "instructions", 0, 0, "res"], "if"),
    instructionPath("containerless.long-chain-repeat", 1, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "res"], "repeat"),
    instructionPath("containerless.long-chain-leaf", 1, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "def", "instructions", 0, 0, "res"], "my-foo"),
    instructionPath("containerless.third-leaf", 2, 0, ["def", "instructions", 0, 0, "res"], "my-foo"),
    instructionPath("containerless.fourth-repeat", 3, 0, ["def", "instructions", 0, 0, "res"], "repeat"),
    instructionPath("containerless.fourth-leaf", 3, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "res"], "my-foo"),
  ],
  contrasts: [{
    caseId: "interaction.generated.same-node-if-repeat-custom-element",
    relation: "interaction-control",
    difference: "Both compose branch, repeat, and my-foo hydration; this case adds definition-level containerless behavior and asymmetric sibling depth.",
  }],
});

/** Checked-artifact interaction worlds; the stale generator is retained only as history provenance. */
export const JIT_ORACLE_INTERACTION_CASES: readonly CompilerCase[] = [
  nestedIfElseCase,
  doubleSiblingCase,
  sameNodeIfRepeatCase,
  containerlessRepeatCase,
];

function customElementInteractionWorld(name: string, markup: string, containerless: boolean): CompilerWorld {
  const setupSymbol = "generated-my-foo";
  return {
    configuration: "standard",
    entry: {
      kind: "compile",
      definition: {
        name,
        type: "custom-element",
        template: { kind: "markup", value: markup },
      },
    },
    compiler: { debug: false, resolveResources: false },
    setups: [{
      symbol: setupSymbol,
      factory: CUSTOM_ELEMENT_SETUP_ID,
      args: {
        name: "my-foo",
        template: "<template>${msg}${not}${item}</template>",
        bindables: [{ name: "msg" }, { name: "not" }, { name: "item" }],
        capture: false,
        containerless,
        shadowMode: null,
      },
    }],
    registrations: [{
      site: "definition-dependency",
      value: { setup: setupSymbol, export: "resource" },
      cardinality: "single",
    }],
  };
}

function nestedIfElseBranchInvariants(row: number, label: string): readonly CompilerFocusedInvariant[] {
  return [
    instructionPath(`nested-if-else.${label}-inner-if`, row, 0, ["def", "instructions", 0, 0, "res"], "if"),
    instructionPath(`nested-if-else.${label}-inner-else`, row, 0, ["def", "instructions", 1, 0, "res"], "else"),
    instructionPath(`nested-if-else.${label}-if-text-type`, row, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "type"], itTextBinding),
    instructionPath(`nested-if-else.${label}-if-text-source`, row, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "from", "name"], "msg"),
    instructionPath(`nested-if-else.${label}-else-text-type`, row, 0, ["def", "instructions", 1, 0, "def", "instructions", 0, 0, "type"], itTextBinding),
    instructionPath(`nested-if-else.${label}-else-text-source`, row, 0, ["def", "instructions", 1, 0, "def", "instructions", 0, 0, "from", "name"], "not"),
  ];
}

function doubleSiblingInvariants(row: number, label: string): readonly CompilerFocusedInvariant[] {
  return [
    rowWidth(`double-sibling.${label}-row-width`, row, 1),
    instructionField(`double-sibling.${label}-outer-type`, row, 0, "type", itHydrateTemplateController),
    instructionField(`double-sibling.${label}-outer-resource`, row, 0, "res", "if"),
    instructionPath(`double-sibling.${label}-child-row-count`, row, 0, ["def", "instructions", "length"], 1),
    instructionPath(`double-sibling.${label}-inner-type`, row, 0, ["def", "instructions", 0, 0, "type"], itHydrateTemplateController),
    instructionPath(`double-sibling.${label}-inner-resource`, row, 0, ["def", "instructions", 0, 0, "res"], "if"),
    instructionPath(`double-sibling.${label}-leaf-row-count`, row, 0, ["def", "instructions", 0, 0, "def", "instructions", "length"], 0),
  ];
}

function ifRepeatBranchInvariants(row: number, label: string): readonly CompilerFocusedInvariant[] {
  const repeat = ["def", "instructions", 0, 0] as const;
  const leaf = [...repeat, "def", "instructions", 0, 0] as const;
  return [
    rowWidth(`same-node-if-repeat.${label}-row-width`, row, 1),
    instructionField(`same-node-if-repeat.${label}-outer-type`, row, 0, "type", itHydrateTemplateController),
    instructionPath(`same-node-if-repeat.${label}-repeat-type`, row, 0, [...repeat, "type"], itHydrateTemplateController),
    instructionPath(`same-node-if-repeat.${label}-repeat-resource`, row, 0, [...repeat, "res"], "repeat"),
    instructionPath(`same-node-if-repeat.${label}-iterator-type`, row, 0, [...repeat, "props", 0, "type"], itIteratorBinding),
    instructionPath(`same-node-if-repeat.${label}-iterator-target`, row, 0, [...repeat, "props", 0, "to"], "items"),
    instructionPath(`same-node-if-repeat.${label}-leaf-type`, row, 0, [...leaf, "type"], itHydrateElement),
    instructionPath(`same-node-if-repeat.${label}-leaf-resource`, row, 0, [...leaf, "res"], "my-foo"),
    instructionPath(`same-node-if-repeat.${label}-bindable-type`, row, 0, [...leaf, "props", 0, "type"], itPropertyBinding),
    instructionPath(`same-node-if-repeat.${label}-bindable-target`, row, 0, [...leaf, "props", 0, "to"], "item"),
    instructionPath(`same-node-if-repeat.${label}-bindable-source`, row, 0, [...leaf, "props", 0, "from", "name"], "item"),
  ];
}

function rootResourceOrder(resources: readonly string[]): readonly CompilerFocusedInvariant[] {
  return resources.flatMap((resource, row) => [
    rowWidth(`containerless.root-${row}-width`, row, 1),
    instructionField(`containerless.root-${row}-type`, row, 0, "type", itHydrateTemplateController),
    instructionField(`containerless.root-${row}-resource`, row, 0, "res", resource),
  ]);
}

function templateHtml(id: string, expected: string): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The checked interaction produces the exact root effective template.", {
    kind: "template-outer-html",
  }, expected);
}

function definitionDependencies(id: string, expected: number): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The generated custom-element world has the exact dependency count.", {
    kind: "definition-dependencies-count",
  }, expected);
}

function rowWidth(id: string, row: number, expected: number): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The interaction target row has the exact instruction width.", {
    kind: "instruction-row-width",
    row,
  }, expected);
}

function instructionField(
  id: string,
  row: number,
  instruction: number,
  field: string,
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return equalJitInvariant(
    id,
    `The interaction instruction retains ${field}.`,
    instructionFieldSelector(row, instruction, field),
    expected,
  );
}

function instructionPath(
  id: string,
  row: number,
  instruction: number,
  path: readonly (string | number)[],
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return equalJitInvariant(id, `The nested interaction product retains ${path.join(".")}.`, {
    kind: "instruction-path",
    row,
    instruction,
    path,
  }, expected);
}
