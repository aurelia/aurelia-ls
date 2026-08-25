import { BindingMode, itListenerBinding, itPropertyBinding, itTextBinding } from "@aurelia/template-compiler";
import {
  BASELINE_CHARACTERIZATION_CLOSURE,
  COMPILER_CASE_SCHEMA_VERSION,
  COMPILER_CORPUS_FRAMEWORK_REVISION,
  type CompilerAuthorityReference,
  type CompilerCase,
  type CompilerCaseContrast,
  type CompilerCaseData,
  type CompilerFocusedInvariant,
  type CompilerObligationWitness,
  type CompilerWorld,
} from "./compiler-case.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const bindingCommandSource = "packages/template-compiler/src/binding-command.ts";
const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const conventionSuite = "packages/__tests__/src/3-runtime-html/template-compiler.convention.spec.ts";

/** Initial JIT characterizations, migrated into the runner-neutral compiler case dialect. */
export const JIT_ORACLE_CASES: readonly CompilerCase[] = [
  characterizationCase({
    id: "entry.bypass.needs-compile-false",
    family: "compile-entry",
    tags: ["smoke", "entry", "bypass"],
    requirement: "A needsCompile=false definition passes through unchanged before hooks or DOM work.",
    provenance: [
      authority(templateCompilerSource, 112, 119, "implementation", {
        symbolName: "TemplateCompiler.compile",
        summary: "The compiler returns null-template and needsCompile=false definitions before context or hook creation.",
      }),
      authority(directCompilerSuite, 94, 103, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "does not do anything if needsCompile is false",
        summary: "Direct compiler test proves the bypass occurs before compiler hooks.",
      }),
    ],
    obligations: [
      obligation("compiler.entry.bypass", "primary", "needsCompile=false preserves the definition and bypasses hooks."),
    ],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "aot-bypass",
          type: "custom-element",
          template: { kind: "markup", value: "<template>" },
          needsCompile: false,
          instructions: [],
          surrogates: [],
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [],
      registrations: [],
    },
    expectedProduct: "unchanged-definition",
    invariants: [
      equalInvariant("bypass.name", "The same definition name is returned.", {
        kind: "definition-field",
        field: "name",
      }, "aot-bypass"),
      equalInvariant("bypass.needs-compile", "The bypass flag remains false.", {
        kind: "definition-field",
        field: "needsCompile",
      }, false),
      equalInvariant("bypass.template", "The authored template string is not materialized or rewritten.", {
        kind: "definition-field",
        field: "template",
      }, "<template>"),
      equalInvariant("bypass.rows", "Authored empty instruction rows are preserved.", {
        kind: "instruction-row-count",
      }, 0),
      equalInvariant("bypass.surrogates", "Authored empty surrogates are preserved.", {
        kind: "surrogate-count",
      }, 0),
    ],
    contrasts: [{
      caseId: "binding.property.input-value",
      relation: "nearest-neighbor",
      difference: "The compileable definition enters DOM/lowering work; needsCompile=false returns before it.",
    }],
  }),
  characterizationCase({
    id: "diagnostic.surrogate.unique-id",
    family: "compiler-diagnostic",
    tags: ["smoke", "diagnostic", "surrogate", "error"],
    requirement: "A root surrogate id is rejected with the exact framework compiler diagnostic.",
    provenance: [
      authority(templateCompilerSource, 335, 362, "implementation", {
        symbolName: "TemplateCompiler._compileSurrogate",
        summary: "Root surrogate compilation rejects attributes whose identity must remain unique.",
      }),
      authority(directCompilerSuite, 194, 202, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "throws on attributes that require to be unique",
        summary: "Direct compiler test exercises a root template id surrogate rejection.",
      }),
    ],
    obligations: [
      obligation("compiler.surrogate.validation", "primary", "Unique root attributes cannot be transferred as surrogates."),
      obligation("compiler.diagnostic.invalid-surrogate", "primary", "The rejection retains AUR0702 authority."),
    ],
    world: inlineWorld("aot-invalid-surrogate", '<template id="id"></template>'),
    expectedProduct: "compiler-error",
    invariants: [
      equalInvariant("error.code", "The compiler reports the exact invalid-surrogate code.", {
        kind: "compiler-error-code",
      }, "AUR0702"),
      includesInvariant("error.attribute", "The diagnostic identifies the offending id attribute.", {
        kind: "compiler-error-message",
      }, "id"),
    ],
    contrasts: [{
      caseId: "markup.static.platform-attribute",
      relation: "interaction-control",
      difference: "A static attribute on an ordinary element is retained; the same category at the root surrogate boundary may be forbidden.",
    }],
  }),
  characterizationCase({
    id: "binding.listener.trigger",
    family: "listener-binding",
    tags: ["smoke", "binding", "listener"],
    requirement: "A trigger command lowers to one listener-binding instruction.",
    provenance: [
      authority(bindingCommandSource, 393, 408, "implementation", {
        symbolName: "TriggerBindingCommand.build",
        summary: "Framework-owned trigger command builds a non-capturing listener instruction from IsFunction syntax.",
      }),
      authority(directCompilerSuite, 343, 358, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "enables binding commands to override custom attribute",
        summary: "Direct compiler test proves trigger-command classification and listener output.",
      }),
    ],
    obligations: [
      obligation("compiler.attribute.plain-binding-command", "primary", "A plain DOM attribute resolves a built-in command."),
      obligation("compiler.instruction.listener-binding", "primary", "Trigger emits the complete listener instruction fields."),
      obligation("compiler.tree.marker.element-target", "interaction", "The bound element receives one compiler marker target."),
    ],
    world: inlineWorld(
      "aot-listener-binding",
      '<template><button click.trigger="submit()">Save</button></template>',
    ),
    invariants: [
      ...compiledEnvelope("aot-listener-binding", 1),
      equalInvariant(
        "listener.template",
        "The bound button follows one marker in the transformed template.",
        { kind: "template-outer-html" },
        '<template><!--au--><button>Save</button></template>',
      ),
      equalInvariant("listener.row-width", "The target owns one instruction.", {
        kind: "instruction-row-width",
        row: 0,
      }, 1),
      equalInvariant("listener.type", "The instruction is a listener binding.", instructionField(0, 0, "type"), itListenerBinding),
      equalInvariant("listener.to", "The event target remains click.", instructionField(0, 0, "to"), "click"),
      equalInvariant("listener.capture", "Trigger does not capture.", instructionField(0, 0, "capture"), false),
      equalInvariant("listener.modifier", "No event modifier was authored.", instructionField(0, 0, "modifier"), null),
      equalInvariant("listener.from", "The function expression is parsed before runtime.", instructionField(0, 0, "from"), {
        $kind: "CallScope",
        name: "submit",
        args: [],
        ancestor: 0,
        optional: false,
      }),
    ],
    contrasts: [{
      caseId: "binding.property.input-value",
      relation: "nearest-neighbor",
      difference: "Both remove a command attribute, but listener and property commands use distinct expression entry families and instruction fields.",
    }],
  }),
  characterizationCase({
    id: "binding.property.input-value",
    family: "property-binding",
    tags: ["smoke", "binding", "property-binding", "native-control"],
    requirement: "An input value.bind command lowers to a two-way property binding.",
    provenance: [
      authority(conventionSuite, 20, 60, "behavior", {
        suiteName: "3-runtime-html/template-compiler.convention.spec.ts",
        testName: "compile <input value.bind=\"...\"  />",
        summary: "Convention matrix proves input.value defaults to two-way binding.",
      }),
      authority(bindingCommandSource, 289, 307, "implementation", {
        symbolName: "TwoWayBindingCommand.build",
        summary: "Framework-owned two-way command emits PropertyBindingInstruction from IsProperty syntax.",
      }),
    ],
    obligations: [
      obligation("compiler.attribute.plain-binding-command", "primary", "A plain DOM property resolves the bind command."),
      obligation("compiler.instruction.property-binding", "primary", "The command emits a property-binding instruction."),
      obligation("compiler.binding-mode.native-default", "primary", "Input value.bind selects the native two-way default."),
      obligation("compiler.tree.marker.element-target", "interaction", "The bound input receives one marker target."),
    ],
    world: inlineWorld("aot-property-binding", '<template><input value.bind="message"></template>'),
    invariants: [
      ...compiledEnvelope("aot-property-binding", 1),
      equalInvariant(
        "property.template",
        "The binding attribute is removed and a marker precedes the input.",
        { kind: "template-outer-html" },
        "<template><!--au--><input></template>",
      ),
      equalInvariant("property.row-width", "The target owns one instruction.", {
        kind: "instruction-row-width",
        row: 0,
      }, 1),
      equalInvariant("property.type", "The instruction is a property binding.", instructionField(0, 0, "type"), itPropertyBinding),
      equalInvariant("property.to", "The runtime target remains value.", instructionField(0, 0, "to"), "value"),
      equalInvariant("property.mode", "Native input value defaults to two-way.", instructionField(0, 0, "mode"), BindingMode.twoWay),
      equalInvariant("property.from", "The source expression is parsed before runtime.", instructionField(0, 0, "from"), {
        $kind: "AccessScope",
        name: "message",
        ancestor: 0,
      }),
    ],
    contrasts: [{
      caseId: "markup.static.platform-attribute",
      relation: "nearest-neighbor",
      difference: "Adding .bind changes retained static markup into a marker, parsed expression, and instruction row.",
    }],
  }),
  characterizationCase({
    id: "markup.static.platform-attribute",
    family: "static-markup",
    tags: ["smoke", "static", "platform-attribute"],
    requirement: "Static platform markup stays in the template without a runtime instruction row.",
    provenance: [
      authority(templateCompilerSource, 938, 962, "implementation", {
        symbolName: "TemplateCompiler._classifyAttributes",
        summary: "Plain non-interpolated attributes remain on ordinary elements and emit no instruction.",
      }),
      authority(directCompilerSuite, 1018, 1038, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "[debug: false] compiles data-* attributes",
        summary: "Combination test retains a static platform attribute while compiling dynamic neighbors.",
      }),
    ],
    obligations: [
      obligation("compiler.attribute.plain-static", "primary", "Static platform attributes remain authored DOM."),
      obligation("compiler.tree.no-target.static-only", "contrast", "Static-only content creates no hydration target."),
    ],
    world: inlineWorld("aot-static-attribute", '<template><div title="hello"></div></template>'),
    invariants: [
      ...compiledEnvelope("aot-static-attribute", 0),
      equalInvariant(
        "static.template",
        "The static title attribute remains byte-visible after JIT serialization.",
        { kind: "template-outer-html" },
        '<template><div title="hello"></div></template>',
      ),
    ],
    contrasts: [{
      caseId: "binding.property.input-value",
      relation: "nearest-neighbor",
      difference: "A binding command introduces a target and removes the authored attribute; a static attribute does neither.",
    }],
  }),
  characterizationCase({
    id: "interpolation.text.single-hole",
    family: "interpolation",
    tags: ["smoke", "binding", "interpolation", "text"],
    requirement: "One text interpolation lowers to one marker/text pair and one text-binding row.",
    provenance: [
      authority(templateCompilerSource, 983, 1016, "implementation", {
        symbolName: "TemplateCompiler._compileText",
        summary: "Each interpolation expression becomes a marker, placeholder text, and separate TextBindingInstruction row.",
      }),
      authority(directCompilerSuite, 575, 587, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "compiles 10 text interpolations with sequential markers",
        summary: "Stress case proves per-hole marker and row expansion; this local case is its one-hole basis.",
      }),
    ],
    obligations: [
      obligation("compiler.text.interpolation-expansion", "primary", "Every text-expression hole owns a separate binding row."),
      obligation("compiler.tree.marker.text-target", "primary", "The transformed tree contains a marker and nonempty placeholder text."),
      obligation("compiler.expression.property-entry", "interaction", "The interpolation expression is parsed with property semantics."),
    ],
    world: inlineWorld("aot-text-interpolation", "<template><div>${message}</div></template>"),
    invariants: [
      ...compiledEnvelope("aot-text-interpolation", 1),
      equalInvariant(
        "text.template",
        "The text hole becomes one marker followed by a single-space placeholder.",
        { kind: "template-outer-html" },
        "<template><div><!--au--> </div></template>",
      ),
      equalInvariant("text.row-width", "The text target owns one instruction.", {
        kind: "instruction-row-width",
        row: 0,
      }, 1),
      equalInvariant("text.type", "The instruction is a text binding.", instructionField(0, 0, "type"), itTextBinding),
      equalInvariant("text.from", "The source expression is parsed before runtime.", instructionField(0, 0, "from"), {
        $kind: "AccessScope",
        name: "message",
        ancestor: 0,
      }),
    ],
    contrasts: [{
      caseId: "markup.static.platform-attribute",
      relation: "nearest-neighbor",
      difference: "Static text creates no target; one interpolation hole creates one marker/placeholder and one row.",
    }],
  }),
];

interface CharacterizationInput {
  readonly id: string;
  readonly family: string;
  readonly tags: readonly string[];
  readonly requirement: string;
  readonly provenance: readonly CompilerAuthorityReference[];
  readonly obligations: readonly CompilerObligationWitness[];
  readonly world: CompilerWorld;
  readonly expectedProduct?: "compiled-definition" | "unchanged-definition" | "compiler-error";
  readonly invariants: readonly CompilerFocusedInvariant[];
  readonly contrasts: readonly CompilerCaseContrast[];
}

function characterizationCase(input: CharacterizationInput): CompilerCase {
  return {
    schemaVersion: COMPILER_CASE_SCHEMA_VERSION,
    id: input.id,
    family: input.family,
    tags: input.tags,
    requirement: input.requirement,
    provenance: input.provenance,
    obligations: input.obligations,
    world: input.world,
    effects: [],
    closure: BASELINE_CHARACTERIZATION_CLOSURE,
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: input.expectedProduct ?? "compiled-definition" }],
      claims: [],
    },
    invariants: input.invariants,
    contrasts: input.contrasts,
  };
}

function authority(
  filePath: string,
  startLine: number,
  endLine: number,
  role: CompilerAuthorityReference["role"],
  detail: Omit<CompilerAuthorityReference, "repository" | "revision" | "role" | "filePath" | "startLine" | "endLine">,
): CompilerAuthorityReference {
  return {
    repository: "aurelia",
    revision: COMPILER_CORPUS_FRAMEWORK_REVISION,
    role,
    filePath,
    startLine,
    endLine,
    ...detail,
  };
}

function obligation(
  id: CompilerObligationWitness["id"],
  role: CompilerObligationWitness["role"],
  summary: string,
): CompilerObligationWitness {
  return { id, role, summary };
}

function inlineWorld(name: string, markup: string): CompilerWorld {
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
    setups: [],
    registrations: [],
  };
}

function compiledEnvelope(name: string, instructionRowCount: number): readonly CompilerFocusedInvariant[] {
  return [
    equalInvariant("definition.name", "The compiled definition preserves its explicit name.", {
      kind: "definition-field",
      field: "name",
    }, name),
    equalInvariant("definition.type", "The compiler returns a custom-element definition.", {
      kind: "definition-field",
      field: "type",
    }, "custom-element"),
    equalInvariant("definition.needs-compile", "The compiler closes the JIT handoff.", {
      kind: "definition-field",
      field: "needsCompile",
    }, false),
    equalInvariant("definition.template-node", "The compiled template remains an HTML template element.", {
      kind: "template-node-name",
    }, "TEMPLATE"),
    equalInvariant("definition.rows", "The case has the expected number of hydration targets.", {
      kind: "instruction-row-count",
    }, instructionRowCount),
    equalInvariant("definition.surrogates", "The case contributes no root surrogate instructions.", {
      kind: "surrogate-count",
    }, 0),
  ];
}

function equalInvariant(
  id: string,
  description: string,
  selector: CompilerFocusedInvariant["selector"],
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return {
    id,
    description,
    lanes: ["framework-jit"],
    selector,
    assertion: { kind: "equal", expected },
  };
}

function includesInvariant(
  id: string,
  description: string,
  selector: CompilerFocusedInvariant["selector"],
  expected: string,
): CompilerFocusedInvariant {
  return {
    id,
    description,
    lanes: ["framework-jit"],
    selector,
    assertion: { kind: "includes", expected },
  };
}

function instructionField(
  row: number,
  instruction: number,
  field: string,
): CompilerFocusedInvariant["selector"] {
  return { kind: "instruction-field", row, instruction, field };
}
