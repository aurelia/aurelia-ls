import { itPropertyBinding } from "@aurelia/template-compiler";
import {
  compiledDefinitionEnvelope,
  compilerAuthority,
  compilerObligation,
  equalJitInvariant,
  inlineCompilerWorld,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerCase,
  CompilerCaseContrast,
  CompilerFocusedInvariant,
} from "./compiler-case.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const checkedObserverSource = "packages/runtime-html/src/observation/checked-observer.ts";
const selectObserverSource = "packages/runtime-html/src/observation/select-value-observer.ts";
const checkedObserverSuite = "packages/__tests__/src/3-runtime-html/checked-observer.spec.ts";
const selectObserverSuite = "packages/__tests__/src/3-runtime-html/select-value-observer.spec.ts";

/** Setup-free JIT witnesses for observer-sensitive native instruction order. */
export const JIT_ORACLE_ORDER_CASES: readonly CompilerCase[] = [
  inputOrderCase({
    id: "native-order.checkbox.checked-before-model",
    name: "native-order-checkbox-checked-model",
    inputType: "checkbox",
    attributes: 'checked.bind="selected" model.bind="item"',
    expectedTargets: ["model", "checked"],
    behaviorRange: [23, 101],
    behaviorSummary: "Checkbox array, Set, and Map integration uses model before checked observer construction.",
    contrasts: [{
      caseId: "native-order.checkbox.model-before-checked",
      relation: "metamorphic",
      difference: "Reversing the authored pair converges on the same model-before-checked runtime order.",
    }],
  }),
  inputOrderCase({
    id: "native-order.checkbox.model-before-checked",
    name: "native-order-checkbox-model-checked",
    inputType: "checkbox",
    attributes: 'model.bind="item" checked.bind="selected"',
    expectedTargets: ["model", "checked"],
    behaviorRange: [23, 101],
    behaviorSummary: "The already-safe checkbox order remains stable.",
    contrasts: [{
      caseId: "native-order.checkbox.checked-before-model",
      relation: "metamorphic",
      difference: "The unsafe authored pair is the reorder control for this already-safe pair.",
    }],
  }),
  inputOrderCase({
    id: "native-order.checkbox.checked-before-matcher",
    name: "native-order-checkbox-checked-matcher",
    inputType: "checkbox",
    attributes: 'checked.bind="selected" matcher.bind="matchItems"',
    expectedTargets: ["matcher", "checked"],
    behaviorRange: [105, 195],
    behaviorSummary: "Checkbox object collection integration consumes matcher during checked comparison.",
    contrasts: [],
  }),
  inputOrderCase({
    id: "native-order.radio.checked-before-value",
    name: "native-order-radio-checked-value",
    inputType: "radio",
    attributes: 'checked.bind="selected" value.bind="item"',
    expectedTargets: ["value", "checked"],
    behaviorRange: [200, 232],
    behaviorSummary: "Radio integration consumes the element value before checked selection behavior.",
    contrasts: [{
      caseId: "native-order.radio.value-before-checked",
      relation: "metamorphic",
      difference: "Reversing the authored pair converges on the same value-before-checked runtime order.",
    }],
  }),
  inputOrderCase({
    id: "native-order.radio.value-before-checked",
    name: "native-order-radio-value-checked",
    inputType: "radio",
    attributes: 'value.bind="item" checked.bind="selected"',
    expectedTargets: ["value", "checked"],
    behaviorRange: [200, 232],
    behaviorSummary: "The already-safe radio order remains stable.",
    contrasts: [{
      caseId: "native-order.radio.checked-before-value",
      relation: "metamorphic",
      difference: "The unsafe authored pair is the reorder control for this already-safe pair.",
    }],
  }),
  inputOrderCase({
    id: "native-order.checkbox.checked-before-model-matcher",
    name: "native-order-checkbox-checked-model-matcher",
    inputType: "checkbox",
    attributes: 'checked.bind="selected" model.bind="item" matcher.bind="matchItems"',
    expectedTargets: ["matcher", "model", "checked"],
    behaviorRange: [105, 195],
    behaviorSummary: "Model and custom matcher must both exist before checked constructs its observer behavior.",
    contrasts: [{
      caseId: "native-order.checkbox.checked-before-model",
      relation: "nearest-neighbor",
      difference: "Adding matcher makes the JIT swap checked with the last initialization predecessor it encounters.",
    }],
  }),
  selectOrderCase({
    id: "native-order.select.value-matcher-multiple",
    name: "native-order-select-value-matcher-multiple",
    attributes: 'value.bind="selected" matcher.bind="matchItems" multiple.bind="isMultiple"',
    expectedTargets: ["multiple", "matcher", "value"],
    contrasts: [{
      caseId: "native-order.select.multiple-matcher-value",
      relation: "metamorphic",
      difference: "Reversing value and multiple around matcher converges on the same multiple-before-value order.",
    }],
  }),
  selectOrderCase({
    id: "native-order.select.multiple-matcher-value",
    name: "native-order-select-multiple-matcher-value",
    attributes: 'multiple.bind="isMultiple" matcher.bind="matchItems" value.bind="selected"',
    expectedTargets: ["multiple", "matcher", "value"],
    contrasts: [{
      caseId: "native-order.select.value-matcher-multiple",
      relation: "metamorphic",
      difference: "The unsafe authored order is the reorder control for this already-safe order.",
    }],
  }),
  selectOrderCase({
    id: "native-order.select.matcher-value-multiple",
    name: "native-order-select-matcher-value-multiple",
    attributes: 'matcher.bind="matchItems" value.bind="selected" multiple.bind="isMultiple"',
    expectedTargets: ["matcher", "multiple", "value"],
    contrasts: [{
      caseId: "native-order.select.value-matcher-multiple",
      relation: "nearest-neighbor",
      difference: "Moving matcher outside the swapped pair proves the JIT swaps endpoints instead of globally sorting targets.",
    }],
  }),
  staticMultipleSelectCase(),
];

interface InputOrderCaseInput {
  readonly id: string;
  readonly name: string;
  readonly inputType: "checkbox" | "radio";
  readonly attributes: string;
  readonly expectedTargets: readonly string[];
  readonly behaviorRange: readonly [startLine: number, endLine: number];
  readonly behaviorSummary: string;
  readonly contrasts: readonly CompilerCaseContrast[];
}

interface SelectOrderCaseInput {
  readonly id: string;
  readonly name: string;
  readonly attributes: string;
  readonly expectedTargets: readonly string[];
  readonly contrasts: readonly CompilerCaseContrast[];
}

function inputOrderCase(input: InputOrderCaseInput): CompilerCase {
  return jitCharacterizationCase({
    id: input.id,
    family: "native-input-order",
    tags: ["native-control", "input", input.inputType, "checked", "instruction-order"],
    requirement: `A ${input.inputType} initializes model/value/matcher dependencies before checked without disturbing unrelated order.`,
    provenance: [
      compilerAuthority(templateCompilerSource, 1208, 1246, "implementation", {
        symbolName: "TemplateCompiler._shouldReorderAttrs/_reorder",
        summary: "The JIT detects checkbox/radio inputs and swaps checked with a later model/value/matcher predecessor.",
      }),
      compilerAuthority(checkedObserverSource, 54, 64, "runtime-consequence", {
        symbolName: "CheckedObserver",
        summary: "CheckedObserver requires the model/value observer established on the input.",
      }),
      compilerAuthority(checkedObserverSource, 292, 303, "runtime-consequence", {
        symbolName: "CheckedObserver._observe",
        summary: "CheckedObserver discovers model before value and subscribes to that observer.",
      }),
      compilerAuthority(checkedObserverSuite, input.behaviorRange[0], input.behaviorRange[1], "behavior", {
        suiteName: "3-runtime-html/checked-observer.spec.ts",
        summary: input.behaviorSummary,
      }),
    ],
    obligations: [
      compilerObligation("compiler.order.input-checked-dependencies", "primary", "Observer initialization dependency order is exact."),
      compilerObligation("compiler.attribute.stable-order", "primary", "Only the JIT-authorized swap changes authored order."),
      compilerObligation("compiler.wire.property", "runtime-consequence", "Every ordered target remains a PropertyBindingInstruction."),
      compilerObligation("compiler.order.target-row-correspondence", "interaction", "Reordering stays within the one physical input target row."),
    ],
    world: inlineCompilerWorld(
      input.name,
      `<template><input type="${input.inputType}" ${input.attributes}></template>`,
    ),
    invariants: orderInvariants(
      input.name,
      `<template><!--au--><input type="${input.inputType}"></template>`,
      input.expectedTargets,
    ),
    contrasts: input.contrasts,
  });
}

function selectOrderCase(input: SelectOrderCaseInput): CompilerCase {
  return jitCharacterizationCase({
    id: input.id,
    family: "native-select-order",
    tags: ["native-control", "select", "multiple", "value", "matcher", "instruction-order"],
    requirement: "A dynamic select.multiple binding initializes before value while matcher retains its unconstrained relative position.",
    provenance: selectProvenance(),
    obligations: selectObligations(),
    world: inlineCompilerWorld(input.name, `<template><select ${input.attributes}></select></template>`),
    invariants: orderInvariants(
      input.name,
      "<template><!--au--><select></select></template>",
      input.expectedTargets,
    ),
    contrasts: input.contrasts,
  });
}

function staticMultipleSelectCase(): CompilerCase {
  const name = "native-order-select-static-multiple";
  return jitCharacterizationCase({
    id: "native-order.select.static-multiple-value-matcher",
    family: "native-select-order",
    tags: ["native-control", "select", "multiple", "static", "matcher", "instruction-order"],
    requirement: "A static multiple attribute activates select ordering but emits no synthetic multiple instruction.",
    provenance: selectProvenance(),
    obligations: selectObligations(),
    world: inlineCompilerWorld(
      name,
      '<template><select multiple value.bind="selected" matcher.bind="matchItems"></select></template>',
    ),
    invariants: orderInvariants(
      name,
      '<template><!--au--><select multiple=""></select></template>',
      ["value", "matcher"],
    ),
    contrasts: [{
      caseId: "native-order.select.multiple-matcher-value",
      relation: "nearest-neighbor",
      difference: "Replacing multiple.bind with static multiple removes its instruction while retaining multiple-mode admission.",
    }],
  });
}

function selectProvenance() {
  return [
    compilerAuthority(templateCompilerSource, 1208, 1214, "implementation", {
      symbolName: "TemplateCompiler._shouldReorderAttrs",
      summary: "Static or dynamically bound multiple activates select order handling.",
    }),
    compilerAuthority(templateCompilerSource, 1248, 1270, "implementation", {
      symbolName: "TemplateCompiler._reorder",
      summary: "The JIT swaps multiple and value when value appears first.",
    }),
    compilerAuthority(selectObserverSource, 110, 118, "runtime-consequence", {
      symbolName: "SelectValueObserver.getValue",
      summary: "SelectValueObserver branches between scalar and collection value based on the live multiple flag.",
    }),
    compilerAuthority(selectObserverSource, 143, 159, "runtime-consequence", {
      symbolName: "SelectValueObserver.syncOptions",
      summary: "Select option synchronization consumes matcher independently from multiple/value initialization.",
    }),
    compilerAuthority(selectObserverSuite, 302, 325, "behavior", {
      suiteName: "3-runtime-html/select-value-observer.spec.ts",
      testName: "multiple and value binding order gh #1724",
      summary: "Runtime integration requires multiple/value correctness across authored permutations and intervening bindings.",
    }),
  ];
}

function selectObligations() {
  return [
    compilerObligation("compiler.order.select-multiple-before-value", "primary", "multiple/value initialization order is exact."),
    compilerObligation("compiler.attribute.stable-order", "primary", "Matcher and other unconstrained targets retain relative position."),
    compilerObligation("compiler.wire.property", "runtime-consequence", "Every ordered target remains a PropertyBindingInstruction."),
    compilerObligation("compiler.order.target-row-correspondence", "interaction", "Reordering stays within the one physical select target row."),
  ];
}

function orderInvariants(
  name: string,
  expectedTemplate: string,
  expectedTargets: readonly string[],
): readonly CompilerFocusedInvariant[] {
  return [
    ...compiledDefinitionEnvelope(name, 1),
    equalJitInvariant("order.template", "All binding attributes are removed while static native-control attributes remain.", {
      kind: "template-outer-html",
    }, expectedTemplate),
    equalJitInvariant("order.row-width", "One native target owns every ordered property instruction.", {
      kind: "instruction-row-width",
      row: 0,
    }, expectedTargets.length),
    ...expectedTargets.flatMap((target, index) => [
      equalJitInvariant(`order.${index}.type`, `Instruction ${index} remains a PropertyBindingInstruction.`,
        instructionFieldSelector(0, index, "type"), itPropertyBinding),
      equalJitInvariant(`order.${index}.target`, `Instruction ${index} targets ${target}.`,
        instructionFieldSelector(0, index, "to"), target),
    ]),
  ];
}
