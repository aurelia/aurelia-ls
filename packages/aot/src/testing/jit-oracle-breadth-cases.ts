import {
  BindingMode,
  itHydrateElement,
  itHydrateLetElement,
  itHydrateTemplateController,
  itInterpolation,
  itLetBinding,
  itPropertyBinding,
  itSetClassAttribute,
  itTextBinding,
} from "@aurelia/template-compiler";
import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  includesJitInvariant,
  inlineCompilerWorld,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerCase,
  CompilerEffectPosture,
  CompilerWorld,
} from "./compiler-case.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const auSlotSource = "packages/runtime-html/src/resources/custom-elements/au-slot.ts";
const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const auSlotSuite = "packages/__tests__/src/3-runtime-html/template-compiler.au-slot.spec.ts";
const conventionSuite = "packages/__tests__/src/3-runtime-html/template-compiler.convention.spec.ts";
const localElementsSuite = "packages/__tests__/src/3-runtime-html/template-compiler.local-templates.spec.ts";

const auSlotFallbackCase = withEffects(
  jitCharacterizationCase({
    id: "projection.au-slot.interpolation-fallback",
    family: "projection",
    tags: ["breadth", "projection", "au-slot", "interpolation"],
    requirement: "A default au-slot compiles its interpolated children into one fallback projection definition.",
    provenance: [
      compilerAuthority(auSlotSuite, 92, 106, "behavior", {
        suiteName: "3-runtime-html/template-compiler.au-slot.spec.ts",
        testName: "compiles default <au-slot> with [interpolation] fallback",
        summary: "The focused compiler test asserts the render location and nested fallback text binding.",
      }),
      compilerAuthority(auSlotSource, 17, 43, "implementation", {
        symbolName: "AuSlot.processContent",
        summary: "StandardConfiguration supplies AuSlot and its processContent metadata effect.",
      }),
      compilerAuthority(templateCompilerSource, 1385, 1464, "implementation", {
        symbolName: "TemplateCompiler._extractProjections",
        summary: "Projection content is grouped and compiled in a child compilation context.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.projection.fallback", "primary", "The interpolation becomes the default fallback definition."),
      compilerObligation("compiler.projection.nested-compilation", "interaction", "Fallback content owns a separately compiled row."),
      compilerObligation("compiler.projection.slot-metadata", "interaction", "AuSlot processContent records the default slot name."),
      compilerObligation("compiler.wire.hydrate-element", "interaction", "The top-level AuSlot hydration retains data and projections."),
    ],
    world: shadowCompilerWorld(
      "aot-au-slot-interpolation-fallback",
      "<au-slot>${message}</au-slot>",
    ),
    invariants: [
      ...compiledDefinitionEnvelope("aot-au-slot-interpolation-fallback", 1),
      equalJitInvariant(
        "au-slot.template",
        "The AuSlot host becomes one containerless render location.",
        { kind: "template-outer-html" },
        "<template><!--au--><!--au-start--><!--au-end--></template>",
      ),
      equalJitInvariant("au-slot.row-width", "The render location owns one hydration instruction.", {
        kind: "instruction-row-width",
        row: 0,
      }, 1),
      equalJitInvariant("au-slot.type", "The instruction hydrates the AuSlot element.", instructionFieldSelector(0, 0, "type"), itHydrateElement),
      equalJitInvariant("au-slot.resource", "Name-valued resource output remains au-slot.", instructionFieldSelector(0, 0, "res"), "au-slot"),
      equalJitInvariant("au-slot.data", "The framework effect records the default slot name.", instructionFieldSelector(0, 0, "data"), {
        name: "default",
      }),
    ],
    contrasts: [{
      caseId: "slot.native.nested-has-slots",
      relation: "interaction-control",
      difference: "AuSlot creates a fallback projection and slot metadata; native slot changes root hasSlots under shadow DOM.",
    }],
  }),
  [{
    id: "effect.framework.au-slot-process-content",
    kind: "process-content",
    oracle: "executed-by-framework",
    conservation: "open",
    affectedProducts: ["hydrate-element.data", "hydrate-element.projections", "effective-template"],
    summary: "The JIT executes framework-owned AuSlot.processContent; no semantic-runtime effect comparison is claimed.",
  }],
);

const inputValueAsNumberCase = jitCharacterizationCase({
  id: "binding.property.input-value-as-number",
  family: "property-binding",
  tags: ["breadth", "binding", "native-control", "attribute-mapping"],
  requirement: "Input value-as-number.bind maps to valueAsNumber and selects the native two-way default.",
  provenance: [
    compilerAuthority(conventionSuite, 24, 60, "behavior", {
      suiteName: "3-runtime-html/template-compiler.convention.spec.ts",
      testName: "compile <input value-as-number.bind=\"...\" type=\"number\" />",
      summary: "The convention matrix jointly asserts property mapping and the native default mode.",
    }),
    compilerAuthority(templateCompilerSource, 937, 970, "implementation", {
      symbolName: "TemplateCompiler._classifyAttributes",
      summary: "Plain command attributes are mapped and lowered through the active binding command.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.attribute.plain-binding-command", "primary", "The bind command owns this ordinary input attribute."),
    compilerObligation("compiler.instruction.property-binding", "primary", "The output retains source, mapped target, and mode."),
    compilerObligation("compiler.binding-mode.native-default", "primary", "The native input policy selects two-way."),
    compilerObligation("compiler.attribute.dom-removal", "interaction", "The consumed command attribute is absent from non-debug output."),
  ],
  world: inlineCompilerWorld(
    "aot-input-value-as-number",
    "<input value-as-number.bind=\"value\" type=\"number\"></input>",
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-input-value-as-number", 1),
    equalJitInvariant("input-number.template", "The dynamic attribute is consumed while static type remains.", {
      kind: "template-outer-html",
    }, "<template><!--au--><input type=\"number\"></template>"),
    equalJitInvariant("input-number.type", "The result is a property binding.", instructionFieldSelector(0, 0, "type"), itPropertyBinding),
    equalJitInvariant("input-number.target", "The convention maps the target to valueAsNumber.", instructionFieldSelector(0, 0, "to"), "valueAsNumber"),
    equalJitInvariant("input-number.mode", "Input valueAsNumber defaults to two-way.", instructionFieldSelector(0, 0, "mode"), BindingMode.twoWay),
    equalJitInvariant("input-number.source", "The source is parsed as a property expression.", instructionFieldSelector(0, 0, "from"), accessScope("value")),
  ],
  contrasts: [{
    caseId: "binding.property.label-for",
    relation: "nearest-neighbor",
    difference: "Both map authored attributes to DOM properties; label.for remains to-view while input.valueAsNumber defaults two-way.",
  }],
});

const labelForCase = jitCharacterizationCase({
  id: "binding.property.label-for",
  family: "property-binding",
  tags: ["breadth", "binding", "attribute-mapping"],
  requirement: "Label for.bind maps to htmlFor without acquiring a native two-way default.",
  provenance: [
    compilerAuthority(conventionSuite, 63, 108, "behavior", {
      suiteName: "3-runtime-html/template-compiler.convention.spec.ts",
      testName: "compile <label for.bind=\"...\"  />",
      summary: "The attribute-to-property convention matrix asserts for to htmlFor mapping in to-view mode.",
    }),
    compilerAuthority(templateCompilerSource, 937, 970, "implementation", {
      symbolName: "TemplateCompiler._classifyAttributes",
      summary: "Plain command attributes spend the active DOM attribute mapper before instruction construction.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.attribute.plain-binding-command", "primary", "The bind command owns the ordinary label attribute."),
    compilerObligation("compiler.instruction.property-binding", "primary", "The output retains the mapped htmlFor target."),
    compilerObligation("compiler.command.default-mode", "interaction", "The non-input mapping retains to-view mode."),
    compilerObligation("compiler.attribute.dom-removal", "interaction", "The consumed command attribute is absent from non-debug output."),
  ],
  world: inlineCompilerWorld("aot-label-for", "<label for.bind=\"value\"></label>"),
  invariants: [
    ...compiledDefinitionEnvelope("aot-label-for", 1),
    equalJitInvariant("label-for.template", "The command attribute is consumed from the marked label.", {
      kind: "template-outer-html",
    }, "<template><!--au--><label></label></template>"),
    equalJitInvariant("label-for.type", "The result is a property binding.", instructionFieldSelector(0, 0, "type"), itPropertyBinding),
    equalJitInvariant("label-for.target", "The convention maps for to htmlFor.", instructionFieldSelector(0, 0, "to"), "htmlFor"),
    equalJitInvariant("label-for.mode", "Label htmlFor remains to-view.", instructionFieldSelector(0, 0, "mode"), BindingMode.toView),
    equalJitInvariant("label-for.source", "The source is parsed as a property expression.", instructionFieldSelector(0, 0, "from"), accessScope("value")),
  ],
  contrasts: [{
    caseId: "binding.property.input-value-as-number",
    relation: "nearest-neighbor",
    difference: "Both map authored attributes to DOM properties; only the native input target selects two-way.",
  }],
});

const duplicateLocalBindableCase = jitCharacterizationCase({
  id: "diagnostic.local.duplicate-bindable-attribute",
  family: "compiler-diagnostic",
  tags: ["breadth", "diagnostic", "local-element", "error"],
  requirement: "Two local bindables cannot expose the same attribute name.",
  provenance: [
    compilerAuthority(localElementsSuite, 406, 417, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "throws error if duplicate bindable attributes are found",
      summary: "The source test supplies two distinct properties with one duplicate local attribute.",
    }),
    compilerAuthority(templateCompilerSource, 1134, 1157, "implementation", {
      symbolName: "TemplateCompiler._compileLocalElement",
      summary: "Local bindable extraction tracks property and attribute uniqueness before definition synthesis.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.local-element.validation", "primary", "Local bindable uniqueness is checked during cohort discovery."),
    compilerObligation("compiler.diagnostic.local-bindable-duplicate", "primary", "The rejection retains AUR0712 authority."),
  ],
  world: inlineCompilerWorld(
    "aot-duplicate-local-bindable-attribute",
    '<template as-custom-element="foo-bar">'
      + '<bindable name="prop1" attribute="bar"></bindable>'
      + '<bindable name="prop2" attribute="bar"></bindable>'
      + "</template><div></div>",
  ),
  expectedProduct: "compiler-error",
  invariants: [
    equalJitInvariant("local-duplicate.code", "The compiler reports the exact local-bindable duplicate code.", {
      kind: "compiler-error-code",
    }, "AUR0712"),
    includesJitInvariant("local-duplicate.attribute", "The compiler retains the duplicate attribute identity.", {
      kind: "compiler-error-message",
    }, "bar"),
  ],
  contrasts: [{
    caseId: "diagnostic.slot.without-shadow",
    relation: "interaction-control",
    difference: "Both reject before a compiled definition is published, but local metadata validation and slot policy are separate phases and codes.",
  }],
});

const nestedSlotCase = jitCharacterizationCase({
  id: "slot.native.nested-has-slots",
  family: "native-slot",
  tags: ["breadth", "slot", "shadow-dom", "template-controller"],
  requirement: "A native slot nested inside a compiled template controller propagates hasSlots to the shadow root definition.",
  provenance: [
    compilerAuthority(directCompilerSuite, 112, 115, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "recognizes slot in nested <template>",
      summary: "The focused test proves nested controller content updates the root definition field.",
    }),
    compilerAuthority(templateCompilerSource, 474, 505, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "Native slot validation records the fact on the root compilation context.",
    }),
    compilerAuthority(templateCompilerSource, 142, 153, "implementation", {
      symbolName: "TemplateCompiler.compile",
      summary: "Final definition assembly publishes the rooted hasSlots value.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.element.shadow-slot", "primary", "Native slot is admitted under root shadow options."),
    compilerObligation("compiler.definition.has-slots", "primary", "Nested discovery propagates to the root definition."),
    compilerObligation("compiler.template-controller.child-context", "interaction", "The nested slot is visited through the controller child context."),
  ],
  world: shadowCompilerWorld(
    "aot-nested-native-slot",
    '<template><template if.bind="true"><slot></slot></template></template>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-nested-native-slot", 1),
    equalJitInvariant("nested-slot.has-slots", "The root definition records native slot use.", {
      kind: "definition-field",
      field: "hasSlots",
    }, true),
    equalJitInvariant("nested-slot.template", "The controller host becomes one render location.", {
      kind: "template-outer-html",
    }, "<template><!--au--><!--au-start--><!--au-end--></template>"),
    equalJitInvariant("nested-slot.type", "The outer row hydrates the if controller.", instructionFieldSelector(0, 0, "type"), itHydrateTemplateController),
    equalJitInvariant("nested-slot.resource", "Name-valued output retains the if resource.", instructionFieldSelector(0, 0, "res"), "if"),
  ],
  contrasts: [{
    caseId: "diagnostic.slot.without-shadow",
    relation: "metamorphic",
    difference: "Providing root shadow options changes native slot use from AUR0717 rejection to a compiled hasSlots definition.",
  }],
});

const slotWithoutShadowCase = jitCharacterizationCase({
  id: "diagnostic.slot.without-shadow",
  family: "compiler-diagnostic",
  tags: ["breadth", "diagnostic", "slot", "error"],
  requirement: "Native slot use without root shadow options is rejected exactly.",
  provenance: [
    compilerAuthority(directCompilerSuite, 128, 130, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "throws when <slot> is used without shadow dom",
      summary: "The framework test proves the rejection boundary, though it originally asserts only that an error occurs.",
    }),
    compilerAuthority(templateCompilerSource, 490, 496, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "The active producer throws AUR0717 before recording native slot use.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.element.shadow-slot", "primary", "Native slot policy depends on root shadow options."),
    compilerObligation("compiler.diagnostic.slot-without-shadow", "primary", "The rejection is strengthened to the exact AUR0717 code."),
  ],
  world: inlineCompilerWorld(
    "aot-slot-without-shadow",
    "<template><slot></slot></template>",
  ),
  expectedProduct: "compiler-error",
  invariants: [
    equalJitInvariant("slot-without-shadow.code", "The compiler reports the exact slot policy code.", {
      kind: "compiler-error-code",
    }, "AUR0717"),
    includesJitInvariant("slot-without-shadow.component", "The rejection retains the owning definition name.", {
      kind: "compiler-error-message",
    }, "aot-slot-without-shadow"),
  ],
  contrasts: [{
    caseId: "slot.native.nested-has-slots",
    relation: "metamorphic",
    difference: "Adding root shadow options admits slot compilation and produces hasSlots instead of this rejection.",
  }],
});

const letBindingCase = jitCharacterizationCase({
  id: "let.bind-interpolation",
  family: "let-element",
  tags: ["breadth", "let", "binding", "interpolation"],
  requirement: "One let element retains ordered bind and interpolation declarations inside its hydration instruction.",
  provenance: [
    compilerAuthority(directCompilerSuite, 489, 501, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "compiles with attributes",
      summary: "The focused test asserts one property let binding followed by one interpolated let binding.",
    }),
    compilerAuthority(templateCompilerSource, 402, 470, "implementation", {
      symbolName: "TemplateCompiler._compileLet",
      summary: "Let lowering parses declarations, preserves order, and wraps them in one hydration row.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.let.bind", "primary", "The bind declaration uses property-expression semantics."),
    compilerObligation("compiler.let.interpolation", "primary", "The interpolation remains a complete interpolation expression."),
    compilerObligation("compiler.wire.hydrate-let", "primary", "The hydration wire retains ordered nested declarations and its context flag."),
    compilerObligation("compiler.node.row-target-alignment", "interaction", "One marked let target owns one hydration row."),
  ],
  world: inlineCompilerWorld(
    "aot-let-bind-interpolation",
    '<let a.bind="b" c="${d}"></let>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-let-bind-interpolation", 1),
    equalJitInvariant("let.template", "Let declarations remain authored while a target marker is inserted.", {
      kind: "template-outer-html",
    }, '<template><!--au--><let a.bind="b" c="${d}"></let></template>'),
    equalJitInvariant("let.row-width", "The target owns one hydrate-let instruction.", {
      kind: "instruction-row-width",
      row: 0,
    }, 1),
    equalJitInvariant("let.type", "The outer instruction is hydrate-let.", instructionFieldSelector(0, 0, "type"), itHydrateLetElement),
    equalJitInvariant("let.to-binding-context", "No binding-context redirect was authored.", instructionFieldSelector(0, 0, "toBindingContext"), false),
    equalJitInvariant("let.instructions", "The hydration retains both declarations and their exact expression entry products.", instructionFieldSelector(0, 0, "instructions"), [
      { type: itLetBinding, from: accessScope("b"), to: "a" },
      { type: itLetBinding, from: interpolation("d"), to: "c" },
    ]),
  ],
  contrasts: [{
    caseId: "interpolation.text.ten-hole",
    relation: "interaction-control",
    difference: "Let keeps multiple declarations nested in one target row; text expansion creates one top-level row per expression hole.",
  }],
});

const tenHoleTextCase = jitCharacterizationCase({
  id: "interpolation.text.ten-hole",
  family: "interpolation",
  tags: ["breadth", "interpolation", "text", "target-order"],
  requirement: "Ten adjacent text-expression holes expand into ten ordered marker/placeholder pairs and ten independent rows.",
  provenance: [
    compilerAuthority(directCompilerSuite, 575, 587, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "compiles 10 text interpolations with sequential markers",
      summary: "The stress test asserts per-hole marker and row cardinality.",
    }),
    compilerAuthority(templateCompilerSource, 983, 1016, "implementation", {
      symbolName: "TemplateCompiler._compileText",
      summary: "The implementation emits a marker, nonempty placeholder, and row for every interpolation expression.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.node.text-expansion", "primary", "Each expression hole becomes an independent compiler target."),
    compilerObligation("compiler.node.row-target-alignment", "primary", "All ten rows retain document order and exact cardinality."),
    compilerObligation("compiler.text.interpolation-expansion", "primary", "The authored aggregate does not survive as one row."),
    compilerObligation("compiler.tree.marker.text-target", "interaction", "Every row addresses one marker placeholder."),
    compilerObligation("compiler.wire.text", "interaction", "Every text instruction retains its own parsed expression."),
  ],
  world: inlineCompilerWorld(
    "aot-text-ten-hole",
    "${a}${b}${c}${d}${e}${f}${g}${h}${i}${j}",
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-text-ten-hole", 10),
    equalJitInvariant("text-ten.template", "Every adjacent hole receives a marker and nonempty placeholder.", {
      kind: "template-outer-html",
    }, "<template><!--au--> <!--au--> <!--au--> <!--au--> <!--au--> <!--au--> <!--au--> <!--au--> <!--au--> <!--au--> </template>"),
    ...textHoleInvariants(),
  ],
  contrasts: [{
    caseId: "let.bind-interpolation",
    relation: "interaction-control",
    difference: "Text multiplicity expands top-level target rows; multiple let declarations stay nested under one physical target.",
  }],
});

const dataAttributesNonDebugCase = dataAttributesCase(false);
const dataAttributesDebugCase = dataAttributesCase(true);

const staticSurrogateCase = jitCharacterizationCase({
  id: "surrogate.static-class",
  family: "surrogate",
  tags: ["breadth", "surrogate", "static", "class"],
  requirement: "A nonempty static root class produces one flat surrogate instruction while remaining visible on the template root.",
  provenance: [
    compilerAuthority(directCompilerSuite, 144, 154, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "compiles surrogate plain class attribute",
      summary: "The direct test asserts one SetClassAttribute instruction with value h-100.",
    }),
    compilerAuthority(templateCompilerSource, 325, 362, "implementation", {
      symbolName: "TemplateCompiler._compileSurrogate",
      summary: "Surrogate classification emits static host-transfer instructions as one flat row.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.attribute.surrogate-static", "primary", "Static root class is lowered instead of treated as ordinary inert markup."),
    compilerObligation("compiler.surrogate.static-class", "primary", "The host-transfer instruction retains the class text."),
    compilerObligation("compiler.definition.surrogates", "primary", "The compiled definition publishes a nonempty surrogate product."),
    compilerObligation("compiler.surrogate.flat-wire", "boundary", "The live producer supplies the currently flat surrogate wire without resolving its type conflict."),
    compilerObligation("compiler.wire.static-dom", "interaction", "The static DOM instruction retains its exact value."),
  ],
  world: inlineCompilerWorld(
    "aot-static-class-surrogate",
    '<template class="h-100"></template>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-static-class-surrogate", 0, 1),
    equalJitInvariant("surrogate.template", "The root template retains the authored class in the JIT product.", {
      kind: "template-outer-html",
    }, '<template class="h-100"></template>'),
    equalJitInvariant("surrogate.type", "The flat surrogate row contains a class-set instruction.", {
      kind: "surrogate-field",
      instruction: 0,
      field: "type",
    }, itSetClassAttribute),
    equalJitInvariant("surrogate.value", "The surrogate instruction retains the authored class text.", {
      kind: "surrogate-field",
      instruction: 0,
      field: "value",
    }, "h-100"),
  ],
  contrasts: [{
    caseId: "debug.data-attributes.removed",
    relation: "interaction-control",
    difference: "An ordinary static attribute stays inert in element markup; a root static class additionally produces a surrogate host-transfer instruction.",
  }],
});

/** Setup-free breadth cases that StandardConfiguration can execute in an isolated JIT world. */
export const JIT_ORACLE_BREADTH_CASES: readonly CompilerCase[] = [
  auSlotFallbackCase,
  inputValueAsNumberCase,
  labelForCase,
  duplicateLocalBindableCase,
  nestedSlotCase,
  slotWithoutShadowCase,
  letBindingCase,
  tenHoleTextCase,
  dataAttributesNonDebugCase,
  dataAttributesDebugCase,
  staticSurrogateCase,
];

function shadowCompilerWorld(name: string, markup: string): CompilerWorld {
  return {
    configuration: "standard",
    entry: {
      kind: "compile",
      definition: {
        name,
        type: "custom-element",
        template: { kind: "markup", value: markup },
        shadowOptions: { mode: "open" },
      },
    },
    compiler: { debug: false, resolveResources: false },
    setups: [],
    registrations: [],
  };
}

function dataAttributesCase(debug: boolean): CompilerCase {
  const id = debug ? "debug.data-attributes.preserved" : "debug.data-attributes.removed";
  const name = debug ? "aot-debug-data-attributes" : "aot-non-debug-data-attributes";
  const counterpart = debug ? "debug.data-attributes.removed" : "debug.data-attributes.preserved";
  return jitCharacterizationCase({
    id,
    family: "debug-mode",
    tags: ["breadth", "debug", "binding", "static-markup"],
    requirement: debug
      ? "Debug compilation retains static and dynamic authored data attributes while emitting their semantic instructions."
      : "Non-debug compilation retains static data attributes and removes dynamic compiler attributes after emitting instructions.",
    provenance: [
      compilerAuthority(directCompilerSuite, 1000, 1038, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: `[debug: ${debug}] compiles data-* attributes`,
        summary: "The paired source cases assert the exact template delta and identical instruction products.",
      }),
      compilerAuthority(templateCompilerSource, 746, 752, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Debug mode substitutes a no-op for consumed-attribute removal.",
      }),
      compilerAuthority(templateCompilerSource, 937, 970, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Static, interpolation, and command branches still classify identically.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.entry.debug", "primary", "The compiler option intentionally changes authored-attribute retention."),
      compilerObligation("compiler.attribute.debug-preservation", debug ? "primary" : "contrast", debug
        ? "Dynamic authored attributes remain in the effective template."
        : "This non-debug neighbor proves the retention is debug-specific."),
      compilerObligation("compiler.attribute.dom-removal", debug ? "contrast" : "primary", debug
        ? "Debug mode suppresses removal without suppressing lowering."
        : "Consumed dynamic attributes are removed after lowering."),
      compilerObligation("compiler.attribute.plain-static", "interaction", "The static data-a attribute remains in both modes."),
      compilerObligation("compiler.attribute.plain-interpolation", "interaction", "The data-c interpolation lowers in both modes."),
    ],
    world: inlineCompilerWorld(
      name,
      '<div data-a="b" data-b.bind="1" data-c="${hey}">',
      { debug },
    ),
    invariants: [
      ...compiledDefinitionEnvelope(name, 1),
      equalJitInvariant("debug.template", debug
        ? "Static and dynamic data attributes remain byte-visible."
        : "Only the static data attribute remains byte-visible.", {
        kind: "template-outer-html",
      }, debug
        ? '<template><!--au--><div data-a="b" data-b.bind="1" data-c="${hey}"></div></template>'
        : '<template><!--au--><div data-a="b"></div></template>'),
      equalJitInvariant("debug.row-width", "Both modes emit the same two semantic instructions.", {
        kind: "instruction-row-width",
        row: 0,
      }, 2),
      equalJitInvariant("debug.binding-type", "data-b.bind remains a property binding.", instructionFieldSelector(0, 0, "type"), itPropertyBinding),
      equalJitInvariant("debug.binding-target", "The data-b target remains stable.", instructionFieldSelector(0, 0, "to"), "data-b"),
      equalJitInvariant("debug.binding-mode", "The ordinary target remains to-view.", instructionFieldSelector(0, 0, "mode"), BindingMode.toView),
      equalJitInvariant("debug.interpolation-type", "data-c remains an interpolation instruction.", instructionFieldSelector(0, 1, "type"), itInterpolation),
      equalJitInvariant("debug.interpolation-target", "The data-c target remains stable.", instructionFieldSelector(0, 1, "to"), "data-c"),
    ],
    contrasts: [{
      caseId: counterpart,
      relation: "metamorphic",
      difference: debug
        ? "Enabling debug retains the two dynamic authored attributes without changing the asserted instruction shape."
        : "Disabling debug removes the two consumed attributes without removing their asserted instructions.",
    }],
  });
}

function textHoleInvariants() {
  return [..."abcdefghij"].flatMap((name, row) => [
    equalJitInvariant(`text-ten.row-${name}-width`, `Text hole ${name} owns one instruction.`, {
      kind: "instruction-row-width",
      row,
    }, 1),
    equalJitInvariant(`text-ten.row-${name}-type`, `Text hole ${name} emits a text binding.`, instructionFieldSelector(row, 0, "type"), itTextBinding),
    equalJitInvariant(`text-ten.row-${name}-source`, `Text hole ${name} retains its own parsed source.`, instructionFieldSelector(row, 0, "from"), accessScope(name)),
  ]);
}

function accessScope(name: string) {
  return { $kind: "AccessScope", name, ancestor: 0 } as const;
}

function interpolation(name: string) {
  const expression = accessScope(name);
  return {
    $kind: "Interpolation",
    isMulti: false,
    firstExpression: expression,
    parts: ["", ""],
    expressions: [expression],
  } as const;
}

function withEffects(candidate: CompilerCase, effects: readonly CompilerEffectPosture[]): CompilerCase {
  return {
    ...candidate,
    effects,
    closure: candidate.closure.map((claim) => claim.dimension === "compiler-extensions"
      ? {
          dimension: claim.dimension,
          state: "open",
          reason: "The framework JIT executes an extension effect that the semantic-runtime lane has not conserved yet.",
          blockerEffectIds: effects.map((effect) => effect.id),
        }
      : claim),
  };
}
