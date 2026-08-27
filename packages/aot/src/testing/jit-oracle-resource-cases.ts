import {
  itHydrateElement,
  itHydrateTemplateController,
  itListenerBinding,
  itPropertyBinding,
  itRefBinding,
  itSetProperty,
  itSpreadValueBinding,
} from "@aurelia/template-compiler";
import {
  compiledDefinitionEnvelope,
  compilerAuthority,
  compilerObligation,
  equalJitInvariant,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerFocusedInvariant,
  CompilerSetupInvocation,
  CompilerWorld,
} from "./compiler-case.js";
import {
  CUSTOM_ATTRIBUTE_SETUP_ID,
  CUSTOM_ELEMENT_SETUP_ID,
} from "./jit-oracle-setups.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const bindingCommandSource = "packages/template-compiler/src/binding-command.ts";
const attributePatternSource = "packages/template-compiler/src/attribute-pattern.ts";
const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const auSlotSuite = "packages/__tests__/src/3-runtime-html/template-compiler.au-slot.spec.ts";
const refSuite = "packages/__tests__/src/3-runtime-html/template-compiler.ref.spec.ts";

/**
 * Resource-backed breadth witnesses mined from the direct framework compiler corpus.
 *
 * These cases use metadata-only generic setup factories. They execute no custom hook, pattern,
 * command, setter, or processContent body, so they intentionally declare no extension effects.
 */
export const JIT_ORACLE_RESOURCE_CASES: readonly CompilerCase[] = [
  asElementPhysicalTagCase(),
  asElementEmptyOverrideCase(),
  jitCharacterizationCase({
    id: "resource.command-override.same-name-attribute",
    family: "resource-precedence",
    tags: ["resource", "custom-attribute", "binding-command", "precedence"],
    requirement: "An ignoreAttr binding command takes precedence over a same-named custom attribute.",
    provenance: [
      compilerAuthority(bindingCommandSource, 393, 408, "implementation", {
        symbolName: "TriggerBindingCommand.build",
        summary: "Trigger owns the complete attribute and emits ListenerBindingInstruction.",
      }),
      compilerAuthority(templateCompilerSource, 804, 812, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "ignoreAttr commands run before custom-attribute resource lookup.",
      }),
      compilerAuthority(directCompilerSuite, 343, 358, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "enables binding commands to override custom attribute",
        summary: "The direct test registers custom attribute foo and compiles foo.trigger as a listener.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.attribute.command-override", "primary", "ignoreAttr command precedence is exercised."),
      compilerObligation("compiler.attribute.precedence", "primary", "Command classification wins before resource lookup."),
      compilerObligation("compiler.command.listener", "primary", "Trigger emits the complete listener fields."),
      compilerObligation("compiler.wire.listener", "runtime-consequence", "Listener runtime-consumed fields are retained."),
    ],
    world: resourceWorld("resource-command-override", '<template><el foo.trigger="1"></el></template>', [
      customAttributeSetup("foo-attribute", "foo"),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope("resource-command-override", 1),
      templateHtml("command-override.template", '<template><!--au--><el></el></template>'),
      rowWidth("command-override.row-width", 0, 1),
      instructionField("command-override.type", 0, 0, "type", itListenerBinding),
      instructionField("command-override.to", 0, 0, "to", "foo"),
      instructionField("command-override.capture", 0, 0, "capture", false),
      instructionField("command-override.modifier", 0, 0, "modifier", null),
      instructionPath("command-override.from-kind", 0, 0, ["from", "$kind"], "PrimitiveLiteral"),
      instructionPath("command-override.from-value", 0, 0, ["from", "value"], 1),
    ],
    contrasts: [],
  }),
  jitCharacterizationCase({
    id: "resource.element-bindable.same-name-attribute",
    family: "resource-precedence",
    tags: ["resource", "custom-element", "custom-attribute", "bindable", "precedence"],
    requirement: "A custom-element bindable takes precedence over a same-named custom attribute.",
    provenance: [
      compilerAuthority(templateCompilerSource, 837, 869, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Element bindables are lowered before custom-attribute lookup.",
      }),
      compilerAuthority(directCompilerSuite, 1668, 1694, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "lets custom element bindable override custom attribute with the same name",
        summary: "The direct test proves same-name resource precedence and bindable prop lowering.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.attribute.element-bindable", "primary", "The CE bindable branch wins."),
      compilerObligation("compiler.attribute.precedence", "primary", "Same-name custom-attribute lookup is suppressed."),
      compilerObligation("compiler.wire.hydrate-element", "interaction", "The bindable instruction is nested in HydrateElement props."),
      compilerObligation("compiler.wire.set-property", "runtime-consequence", "Literal bindable value and property target are retained."),
    ],
    world: resourceWorld("resource-element-bindable-precedence", '<template><my-el my-prop="value"></my-el></template>', [
      customElementSetup("my-element", "my-el", [{ name: "myProp", attribute: "my-prop" }]),
      customAttributeSetup("my-prop-attribute", "my-prop"),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope("resource-element-bindable-precedence", 1),
      templateHtml("element-bindable.template", '<template><!--au--><my-el></my-el></template>'),
      rowWidth("element-bindable.row-width", 0, 1),
      instructionField("element-bindable.element-type", 0, 0, "type", itHydrateElement),
      instructionField("element-bindable.resource", 0, 0, "res", "my-el"),
      instructionPath("element-bindable.props-length", 0, 0, ["props", "length"], 1),
      instructionPath("element-bindable.prop-type", 0, 0, ["props", 0, "type"], itSetProperty),
      instructionPath("element-bindable.prop-to", 0, 0, ["props", 0, "to"], "myProp"),
      instructionPath("element-bindable.prop-value", 0, 0, ["props", 0, "value"], "value"),
    ],
    contrasts: [{
      caseId: "resource.command-override.same-name-attribute",
      relation: "interaction-control",
      difference: "Both suppress custom-attribute hydration, through different earlier classifier branches.",
    }],
  }),
  jitCharacterizationCase({
    id: "resource.capture.value-bind-syntax",
    family: "resource-capture",
    tags: ["resource", "custom-element", "capture", "attr-syntax"],
    requirement: "capture:true retains every value.bind AttrSyntax field on HydrateElementInstruction.",
    provenance: [
      compilerAuthority(templateCompilerSource, 773, 795, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Capture retains capturable parsed syntax before ordinary lowering.",
      }),
      compilerAuthority(directCompilerSuite, 1748, 1759, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "captures normal attributes",
        summary: "The direct compiler test expects value.bind syntax in HydrateElement captures.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.capture.enablement", "primary", "Boolean capture admission is exercised."),
      compilerObligation("compiler.capture.syntax-preservation", "primary", "Raw and classified syntax fields are retained."),
      compilerObligation("compiler.attribute.capture", "primary", "Capture occurs before plain binding lowering."),
      compilerObligation("compiler.wire.hydrate-element", "runtime-consequence", "HydrateElement captures remain runtime-visible."),
    ],
    world: resourceWorld("resource-capture-syntax", '<template><capture-el value.bind="message"></capture-el></template>', [
      customElementSetup("capture-element", "capture-el", [], { capture: true }),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope("resource-capture-syntax", 1),
      templateHtml("capture.template", '<template><!--au--><capture-el></capture-el></template>'),
      rowWidth("capture.row-width", 0, 1),
      instructionField("capture.element-type", 0, 0, "type", itHydrateElement),
      instructionPath("capture.count", 0, 0, ["captures", "length"], 1),
      instructionPath("capture.raw-name", 0, 0, ["captures", 0, "rawName"], "value.bind"),
      instructionPath("capture.raw-value", 0, 0, ["captures", 0, "rawValue"], "message"),
      instructionPath("capture.target", 0, 0, ["captures", 0, "target"], "value"),
      instructionPath("capture.command", 0, 0, ["captures", 0, "command"], "bind"),
    ],
    contrasts: [],
  }),
  spreadBindablesCase({
    id: "resource.spread-bindables.item-shorthand",
    name: "resource-spread-item-shorthand",
    markup: '<template><spread-el ...item></spread-el></template>',
    provenanceStart: 1823,
    provenanceEnd: 1830,
    testName: "compiles shorthand spread syntax",
  }),
  spreadBindablesCase({
    id: "resource.spread-bindables.reserved-shorthand",
    name: "resource-spread-reserved-shorthand",
    markup: '<template><spread-el ...$bindables="item"></spread-el></template>',
    provenanceStart: 1832,
    provenanceEnd: 1839,
    testName: "compiles shorthand $bindables syntax",
  }),
  jitCharacterizationCase({
    id: "resource.ref.component-custom-element",
    family: "resource-ref",
    tags: ["resource", "custom-element", "ref", "component"],
    requirement: "component.ref on a custom element emits a sibling RefBindingInstruction targeting the view model.",
    provenance: [
      compilerAuthority(attributePatternSource, 307, 329, "implementation", {
        symbolName: "RefAttributePattern",
        summary: "component.ref parses to target component and command ref.",
      }),
      compilerAuthority(bindingCommandSource, 495, 504, "implementation", {
        symbolName: "RefBindingCommand.build",
        summary: "Ref command emits from and target fields.",
      }),
      compilerAuthority(refSuite, 83, 91, "behavior", {
        suiteName: "3-runtime-html/template-compiler.ref.spec.ts",
        testName: "basic ref usage with a custom element view model [view-model.ref]",
        summary: "The runtime corpus proves a custom-element view-model reference; component.ref is its canonical syntax.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.command.ref", "primary", "component.ref lowers through the ref command."),
      compilerObligation("compiler.wire.ref", "primary", "Ref expression and target fields are retained."),
      compilerObligation("compiler.order.element-attribute-plain", "interaction", "HydrateElement precedes the sibling ref instruction."),
      compilerObligation("compiler.element.hydration", "interaction", "The physical CE is hydrated before its reference is resolved."),
    ],
    world: resourceWorld("resource-component-ref", '<template><ref-el component.ref="component"></ref-el></template>', [
      customElementSetup("ref-element", "ref-el"),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope("resource-component-ref", 1),
      templateHtml("component-ref.template", '<template><!--au--><ref-el></ref-el></template>'),
      rowWidth("component-ref.row-width", 0, 2),
      instructionField("component-ref.element-type", 0, 0, "type", itHydrateElement),
      instructionField("component-ref.ref-type", 0, 1, "type", itRefBinding),
      instructionField("component-ref.ref-target", 0, 1, "to", "component"),
      instructionPath("component-ref.from-kind", 0, 1, ["from", "$kind"], "AccessScope"),
      instructionPath("component-ref.from-name", 0, 1, ["from", "name"], "component"),
    ],
    contrasts: [],
  }),
  jitCharacterizationCase({
    id: "resource.projection.default-and-named",
    family: "resource-projection",
    tags: ["resource", "custom-element", "projection", "named-slot", "default-slot"],
    requirement: "Default and named projection contributors become two closed projection definitions on the CE instruction.",
    provenance: [
      compilerAuthority(templateCompilerSource, 1385, 1464, "implementation", {
        symbolName: "TemplateCompiler._extractProjections",
        summary: "Eligible child nodes are grouped and compiled into per-slot definitions.",
      }),
      compilerAuthority(auSlotSuite, 183, 192, "behavior", {
        suiteName: "3-runtime-html/template-compiler.au-slot.spec.ts",
        testName: "compiles auto projection with named projection",
        summary: "The direct compiler test proves simultaneous default and named projection definitions.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.projection.default", "primary", "Unannotated content enters the default projection."),
      compilerObligation("compiler.projection.named", "primary", "au-slot content enters its named projection."),
      compilerObligation("compiler.projection.nested-compilation", "primary", "Both projection definitions are closed compiler products."),
      compilerObligation("compiler.wire.hydrate-element", "runtime-consequence", "Projection definitions remain on HydrateElementInstruction."),
    ],
    world: resourceWorld(
      "resource-default-named-projection",
      '<template><projection-el><span>default</span><span au-slot="header">named</span></projection-el></template>',
      [customElementSetup("projection-element", "projection-el")],
    ),
    invariants: [
      ...compiledDefinitionEnvelope("resource-default-named-projection", 1),
      templateHtml("projection.template", '<template><!--au--><projection-el></projection-el></template>'),
      rowWidth("projection.row-width", 0, 1),
      instructionField("projection.element-type", 0, 0, "type", itHydrateElement),
      instructionPath("projection.default-closed", 0, 0, ["projections", "default", "needsCompile"], false),
      instructionPath("projection.default-rows", 0, 0, ["projections", "default", "instructions", "length"], 0),
      instructionPath("projection.header-closed", 0, 0, ["projections", "header", "needsCompile"], false),
      instructionPath("projection.header-rows", 0, 0, ["projections", "header", "instructions", "length"], 0),
    ],
    contrasts: [],
  }),
  jitCharacterizationCase({
    id: "resource.template-controller.inside-out-order",
    family: "resource-template-controller",
    tags: ["resource", "custom-attribute", "template-controller", "nesting", "order"],
    requirement: "Two generic template controllers preserve authored outer-to-inner order and child instruction ownership.",
    provenance: [
      compilerAuthority(templateCompilerSource, 557, 645, "implementation", {
        symbolName: "TemplateCompiler._compileElement",
        summary: "Template controllers are assembled inside-out while preserving authored outermost order.",
      }),
      compilerAuthority(directCompilerSuite, 1329, 1491, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "TemplateCompiler - combinations -- nested template controllers (multiple per element)",
        summary: "Direct combinations prove multiple controller chains on div and template hosts.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.template-controller.multiple", "primary", "Two controller definitions form one nested chain."),
      compilerObligation("compiler.template-controller.inside-out-order", "primary", "The first authored controller remains outermost."),
      compilerObligation("compiler.template-controller.child-context", "primary", "The leaf element binding belongs to the innermost definition."),
      compilerObligation("compiler.wire.hydrate-template-controller", "runtime-consequence", "Nested def, res, and props remain runtime-consumable."),
    ],
    world: resourceWorld(
      "resource-template-controller-order",
      '<template><div outer.bind="a" inner.bind="b" title.bind="c"></div></template>',
      [
        customAttributeSetup("outer-controller", "outer", { isTemplateController: true, bindables: [{ name: "value" }] }),
        customAttributeSetup("inner-controller", "inner", { isTemplateController: true, bindables: [{ name: "value" }] }),
      ],
    ),
    invariants: [
      ...compiledDefinitionEnvelope("resource-template-controller-order", 1),
      templateHtml("template-controller.template", '<template><!--au--><!--au-start--><!--au-end--></template>'),
      rowWidth("template-controller.row-width", 0, 1),
      instructionField("template-controller.outer-type", 0, 0, "type", itHydrateTemplateController),
      instructionField("template-controller.outer-resource", 0, 0, "res", "outer"),
      instructionPath("template-controller.outer-prop-type", 0, 0, ["props", 0, "type"], itPropertyBinding),
      instructionPath("template-controller.outer-prop-to", 0, 0, ["props", 0, "to"], "value"),
      instructionPath("template-controller.inner-type", 0, 0, ["def", "instructions", 0, 0, "type"], itHydrateTemplateController),
      instructionPath("template-controller.inner-resource", 0, 0, ["def", "instructions", 0, 0, "res"], "inner"),
      instructionPath("template-controller.inner-prop-to", 0, 0, ["def", "instructions", 0, 0, "props", 0, "to"], "value"),
      instructionPath("template-controller.leaf-binding-type", 0, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "type"], itPropertyBinding),
      instructionPath("template-controller.leaf-binding-to", 0, 0, ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "to"], "title"),
    ],
    contrasts: [],
  }),
];

function asElementPhysicalTagCase(): CompilerCase {
  const name = "resource-as-element-physical-tag";
  return jitCharacterizationCase({
    id: "resource.as-element.physical-tag-resource",
    family: "resource-as-element",
    tags: ["resource", "custom-element", "as-element", "physical-tag", "presence"],
    requirement: "Without as-element, a custom-element resource registered under the physical tag name is hydrated.",
    provenance: [
      compilerAuthority(templateCompilerSource, 474, 489, "implementation", {
        symbolName: "TemplateCompiler._compileElement",
        summary: "The JIT falls back to nodeName only when getAttribute('as-element') returns null.",
      }),
      compilerAuthority(directCompilerSuite, 410, 427, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "understands [as-element] / does not throw when element is not found",
        summary: "The direct suite fixes resource lookup through as-element and its missing-resource control.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.element.resource-lookup", "primary", "Physical tag lookup selects the registered resource."),
      compilerObligation("compiler.element.hydration", "runtime-consequence", "The selected resource produces HydrateElement."),
      compilerObligation("compiler.element.as-element", "contrast", "This is the absent-attribute control for the empty override."),
    ],
    world: resourceWorld(name, '<template><div></div></template>', [
      customElementSetup("native-div-resource", "div"),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope(name, 1),
      templateHtml("as-element-physical.template", '<template><!--au--><div></div></template>'),
      rowWidth("as-element-physical.row-width", 0, 1),
      instructionField("as-element-physical.type", 0, 0, "type", itHydrateElement),
      instructionField("as-element-physical.resource", 0, 0, "res", "div"),
    ],
    contrasts: [{
      caseId: "resource.as-element.present-empty",
      relation: "metamorphic",
      difference: "A present empty override suppresses physical-tag lookup instead of behaving like absence.",
    }],
  });
}

function asElementEmptyOverrideCase(): CompilerCase {
  const name = "resource-as-element-present-empty";
  return jitCharacterizationCase({
    id: "resource.as-element.present-empty",
    family: "resource-as-element",
    tags: ["resource", "custom-element", "as-element", "empty", "presence"],
    requirement: "A present empty as-element value performs the empty-string lookup and does not fall back to the physical tag.",
    provenance: [
      compilerAuthority(templateCompilerSource, 474, 489, "implementation", {
        symbolName: "TemplateCompiler._compileElement",
        summary: "Nullish fallback preserves an empty present getAttribute result as the effective lookup name.",
      }),
      compilerAuthority(templateCompilerSource, 746, 765, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "as-element is removed as compiler control after it has selected the lookup name.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.element.as-element", "primary", "Presence and empty scalar semantics are exercised independently."),
      compilerObligation("compiler.element.resource-lookup", "primary", "The empty lookup misses despite a physical-tag resource."),
      compilerObligation("compiler.attribute.special-control", "interaction", "The empty compiler-control attribute is removed."),
    ],
    world: resourceWorld(name, '<template><div as-element=""></div></template>', [
      customElementSetup("native-div-resource", "div"),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope(name, 0),
      templateHtml("as-element-empty.template", '<template><div></div></template>'),
    ],
    contrasts: [{
      caseId: "resource.as-element.physical-tag-resource",
      relation: "metamorphic",
      difference: "Removing the empty override admits the physical-tag resource and one hydration row.",
    }],
  });
}

interface GenericResourceSetup {
  readonly invocation: CompilerSetupInvocation;
  readonly export: string;
}

interface CustomElementOptions {
  readonly template?: string;
  readonly capture?: boolean;
  readonly containerless?: boolean;
  readonly shadowMode?: "open" | "closed" | null;
}

interface CustomAttributeOptions {
  readonly bindables?: readonly { readonly name: string; readonly attribute?: string; readonly mode?: string | number }[];
  readonly isTemplateController?: boolean;
  readonly noMultiBindings?: boolean;
  readonly defaultProperty?: string | null;
  readonly aliases?: readonly string[];
}

interface SpreadBindablesCaseInput {
  readonly id: string;
  readonly name: string;
  readonly markup: string;
  readonly provenanceStart: number;
  readonly provenanceEnd: number;
  readonly testName: string;
}

function spreadBindablesCase(input: SpreadBindablesCaseInput): CompilerCase {
  return jitCharacterizationCase({
    id: input.id,
    family: "resource-spread-bindables",
    tags: ["resource", "custom-element", "spread", "bindables", "shorthand"],
    requirement: "Custom-element bindable shorthand emits one exact SpreadValueBindingInstruction.",
    provenance: [
      compilerAuthority(templateCompilerSource, 815, 824, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Custom-element shorthand spread lowers to target $bindables.",
      }),
      compilerAuthority(directCompilerSuite, input.provenanceStart, input.provenanceEnd, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: input.testName,
        summary: "The direct compiler test expects one spread-value prop on HydrateElementInstruction.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.attribute.spread-bindables", "primary", "The shorthand branch is exercised."),
      compilerObligation("compiler.command.spread-value", "primary", "Source and $bindables target are retained."),
      compilerObligation("compiler.wire.spread-value", "runtime-consequence", "The exact runtime spread-value wire is witnessed."),
      compilerObligation("compiler.wire.hydrate-element", "interaction", "Spread value remains nested in element props."),
    ],
    world: resourceWorld(input.name, input.markup, [
      customElementSetup("spread-element", "spread-el", [{ name: "item" }]),
    ]),
    invariants: [
      ...compiledDefinitionEnvelope(input.name, 1),
      templateHtml("spread-bindables.template", '<template><!--au--><spread-el></spread-el></template>'),
      rowWidth("spread-bindables.row-width", 0, 1),
      instructionField("spread-bindables.element-type", 0, 0, "type", itHydrateElement),
      instructionPath("spread-bindables.props-length", 0, 0, ["props", "length"], 1),
      instructionPath("spread-bindables.type", 0, 0, ["props", 0, "type"], itSpreadValueBinding),
      instructionPath("spread-bindables.target", 0, 0, ["props", 0, "target"], "$bindables"),
      instructionPath("spread-bindables.from", 0, 0, ["props", 0, "from"], "item"),
    ],
    contrasts: [],
  });
}

function resourceWorld(
  name: string,
  markup: string,
  resources: readonly GenericResourceSetup[],
): CompilerWorld {
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
    compiler: {
      debug: false,
      resolveResources: false,
    },
    setups: resources.map((resource) => resource.invocation),
    registrations: resources.map((resource) => ({
      site: "definition-dependency",
      value: { setup: resource.invocation.symbol, export: resource.export },
      cardinality: "single",
    })),
  };
}

function customElementSetup(
  symbol: string,
  name: string,
  bindables: readonly { readonly name: string; readonly attribute?: string; readonly mode?: string | number }[] = [],
  options: CustomElementOptions = {},
): GenericResourceSetup {
  return {
    invocation: {
      symbol,
      factory: CUSTOM_ELEMENT_SETUP_ID,
      args: {
        name,
        template: options.template ?? "<template></template>",
        bindables,
        capture: options.capture ?? false,
        containerless: options.containerless ?? false,
        shadowMode: options.shadowMode ?? null,
      },
    },
    export: "resource",
  };
}

function customAttributeSetup(
  symbol: string,
  name: string,
  options: CustomAttributeOptions = {},
): GenericResourceSetup {
  return {
    invocation: {
      symbol,
      factory: CUSTOM_ATTRIBUTE_SETUP_ID,
      args: {
        name,
        bindables: options.bindables ?? [],
        isTemplateController: options.isTemplateController ?? false,
        noMultiBindings: options.noMultiBindings ?? false,
        defaultProperty: options.defaultProperty ?? null,
        aliases: options.aliases ?? [],
      },
    },
    export: "resource",
  };
}

function templateHtml(id: string, expected: string): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The final JIT template has the exact resource-driven tree shape.", {
    kind: "template-outer-html",
  }, expected);
}

function rowWidth(id: string, row: number, expected: number): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The resource target has the exact instruction width.", {
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
    `The resource instruction retains ${field}.`,
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
  return equalJitInvariant(id, `The nested instruction retains ${path.join(".")}.`, {
    kind: "instruction-path",
    row,
    instruction,
    path,
  }, expected);
}
