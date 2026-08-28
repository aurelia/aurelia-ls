import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  inlineCompilerWorld,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type { CompilerCase, CompilerElementDefinition, CompilerWorld } from "./compiler-case.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const customElementSource = "packages/runtime-html/src/resources/custom-element.ts";
const captureSuite = "packages/__tests__/src/3-runtime-html/custom-elements.decorator.spec.ts";
const containerlessSuite = "packages/__tests__/src/3-runtime-html/containerless.spec.ts";

const captureAllHeaderCase = jitCharacterizationCase({
  id: "definition.header.capture-all",
  family: "definition-header",
  tags: ["breadth", "definition", "header", "capture"],
  requirement: "Boolean capture metadata survives root compilation independently of template instruction rows.",
  provenance: [
    compilerAuthority(captureSuite, 5, 11, "behavior", {
      suiteName: "3-runtime-html/custom-elements.decorator.spec.ts",
      testName: "retrieves capture on class annotated",
      summary: "The resource-definition test pins boolean capture as runtime custom-element metadata.",
    }),
    compilerAuthority(templateCompilerSource, 112, 153, "implementation", {
      symbolName: "TemplateCompiler.compile",
      summary: "The root compiler view spreads input metadata and overrides only compiler-owned fields.",
    }),
    compilerAuthority(customElementSource, 218, 316, "implementation", {
      symbolName: "CustomElementDefinition.create",
      summary: "Runtime rehydration retains the root capture field after compiler output is wrapped.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.definition.capture", "primary", "The root compiled view retains capture metadata."),
    compilerObligation("compiler.definition.needs-compile", "interaction", "Header preservation accompanies final compile state."),
  ],
  world: definitionHeaderWorld("aot-definition-capture-all", { capture: true, containerless: false }),
  invariants: [
    ...compiledDefinitionEnvelope("aot-definition-capture-all", 0),
    equalJitInvariant(
      "definition.capture",
      "The root compiler view retains boolean capture metadata.",
      { kind: "definition-field", field: "capture" },
      true,
    ),
    equalJitInvariant(
      "definition.containerless-control",
      "Capture metadata does not imply definition-owned containerless behavior.",
      { kind: "definition-field", field: "containerless" },
      false,
    ),
  ],
  contrasts: [{
    caseId: "definition.header.containerless",
    relation: "nearest-neighbor",
    difference: "Both preserve root-only metadata; capture affects attribute forwarding while containerless affects host realization.",
  }],
});

const containerlessHeaderCase = jitCharacterizationCase({
  id: "definition.header.containerless",
  family: "definition-header",
  tags: ["breadth", "definition", "header", "containerless"],
  requirement: "Definition-owned containerless metadata survives root compilation without changing the view's own rows.",
  provenance: [
    compilerAuthority(containerlessSuite, 41, 82, "behavior", {
      suiteName: "3-runtime-html/containerless.spec.ts",
      testName: "execution order: customElement -> containerless",
      summary: "The runtime integration pins definition-owned containerless metadata independently of usage syntax.",
    }),
    compilerAuthority(templateCompilerSource, 112, 153, "implementation", {
      symbolName: "TemplateCompiler.compile",
      summary: "The root compiler view spreads input metadata and overrides only compiler-owned fields.",
    }),
    compilerAuthority(customElementSource, 218, 316, "implementation", {
      symbolName: "CustomElementDefinition.create",
      summary: "Runtime rehydration retains the root containerless field after compiler output is wrapped.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.definition.containerless", "primary", "The root compiled view retains containerless intent."),
    compilerObligation("compiler.definition.needs-compile", "interaction", "Header preservation accompanies final compile state."),
  ],
  world: definitionHeaderWorld("aot-definition-containerless", { capture: false, containerless: true }),
  invariants: [
    ...compiledDefinitionEnvelope("aot-definition-containerless", 0),
    equalJitInvariant(
      "definition.containerless",
      "The root compiler view retains definition-owned containerless metadata.",
      { kind: "definition-field", field: "containerless" },
      true,
    ),
    equalJitInvariant(
      "definition.capture-control",
      "Containerless metadata does not imply attribute capture.",
      { kind: "definition-field", field: "capture" },
      false,
    ),
  ],
  contrasts: [{
    caseId: "definition.header.capture-all",
    relation: "nearest-neighbor",
    difference: "Both preserve root-only metadata; containerless affects host realization while capture affects attribute forwarding.",
  }],
});

const explicitBindableHeaderCase = jitCharacterizationCase({
  id: "definition.header.bindable.explicit",
  family: "definition-header",
  tags: ["breadth", "definition", "header", "bindable"],
  requirement: "Explicit bindable name, attribute, and numeric mode survive the pre-rehydration compiler view.",
  provenance: [
    compilerAuthority("packages/template-compiler/src/interfaces-template-compiler.ts", 6, 24, "implementation", {
      symbolName: "IElementComponentDefinition",
      summary: "The compiler input contract carries root bindable metadata.",
    }),
    compilerAuthority(templateCompilerSource, 112, 153, "implementation", {
      symbolName: "TemplateCompiler.compile",
      summary: "The root compiler view spreads input bindable metadata and overrides only compiler-owned fields.",
    }),
    compilerAuthority("packages/runtime-html/src/bindable.ts", 180, 203, "implementation", {
      symbolName: "BindableDefinition",
      summary: "Runtime rehydration expands partial bindable metadata into its full definition value.",
    }),
    compilerAuthority(customElementSource, 257, 299, "implementation", {
      symbolName: "CustomElementDefinition.create",
      summary: "Runtime rehydration converts the compiler-view bindable input into the full root definition.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.definition.bindables", "primary", "The root compiler view retains bindable metadata."),
    compilerObligation("compiler.definition.needs-compile", "interaction", "Bindable preservation accompanies final compile state."),
  ],
  world: bindableHeaderWorld(),
  invariants: [
    ...compiledDefinitionEnvelope("aot-definition-bindable", 0),
    equalJitInvariant(
      "definition.bindable-count",
      "The compiler view retains one explicit bindable.",
      { kind: "definition-bindable-count" },
      1,
    ),
    equalJitInvariant(
      "definition.bindable-name",
      "The runtime property name survives compilation.",
      { kind: "definition-bindable-field", bindable: 0, field: "name" },
      "displayValue",
    ),
    equalJitInvariant(
      "definition.bindable-attribute",
      "The public attribute name survives compilation.",
      { kind: "definition-bindable-field", bindable: 0, field: "attribute" },
      "public-value",
    ),
    equalJitInvariant(
      "definition.bindable-mode",
      "The explicit numeric two-way mode survives compilation.",
      { kind: "definition-bindable-field", bindable: 0, field: "mode" },
      6,
    ),
  ],
  contrasts: [{
    caseId: "definition.header.capture-all",
    relation: "interaction-control",
    difference: "Bindable partial-wire metadata requires rehydration normalization; boolean capture is already a scalar common field.",
  }],
});

export const JIT_ORACLE_DEFINITION_HEADER_CASES: readonly CompilerCase[] = [
  captureAllHeaderCase,
  containerlessHeaderCase,
  explicitBindableHeaderCase,
];

function definitionHeaderWorld(
  name: string,
  header: Pick<CompilerElementDefinition, "capture" | "containerless">,
): CompilerWorld {
  const world = inlineCompilerWorld(name, "<section></section>");
  if (world.entry.kind !== "compile") throw new Error("Definition-header world must use the compile entry.");
  return {
    ...world,
    entry: {
      kind: "compile",
      definition: { ...world.entry.definition, ...header },
    },
  };
}

function bindableHeaderWorld(): CompilerWorld {
  const world = inlineCompilerWorld("aot-definition-bindable", "<section></section>");
  if (world.entry.kind !== "compile") throw new Error("Bindable-header world must use the compile entry.");
  return {
    ...world,
    entry: {
      kind: "compile",
      definition: {
        ...world.entry.definition,
        capture: false,
        containerless: false,
        bindables: [{ name: "displayValue", attribute: "public-value", mode: 6 }],
      },
    },
  };
}
