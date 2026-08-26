import {
  BASELINE_CHARACTERIZATION_CLOSURE,
  COMPILER_CASE_SCHEMA_VERSION,
  COMPILER_CORPUS_FRAMEWORK_REVISION,
  type CompilerAuthorityReference,
  type CompilerCase,
  type CompilerCaseContrast,
  type CompilerCaseData,
  type CompilerEffectPosture,
  type CompilerFocusedInvariant,
  type CompilerObligationWitness,
  type CompilerOracleExpectedProduct,
  type CompilerWorld,
} from "./compiler-case.js";

export interface JitCharacterizationCaseInput {
  readonly id: string;
  readonly family: string;
  readonly tags: readonly string[];
  readonly requirement: string;
  readonly provenance: readonly CompilerAuthorityReference[];
  readonly obligations: readonly CompilerObligationWitness[];
  readonly world: CompilerWorld;
  readonly expectedProduct?: Extract<
    CompilerOracleExpectedProduct,
    "compiled-definition" | "unchanged-definition" | "compiler-error" | "spread-instructions"
  >;
  readonly effects?: readonly CompilerEffectPosture[];
  readonly invariants: readonly CompilerFocusedInvariant[];
  readonly contrasts: readonly CompilerCaseContrast[];
}

export function jitCharacterizationCase(input: JitCharacterizationCaseInput): CompilerCase {
  return {
    caseKind: "compiler-world",
    schemaVersion: COMPILER_CASE_SCHEMA_VERSION,
    id: input.id,
    family: input.family,
    tags: input.tags,
    requirement: input.requirement,
    provenance: input.provenance,
    obligations: input.obligations,
    world: input.world,
    effects: input.effects ?? [],
    closure: BASELINE_CHARACTERIZATION_CLOSURE,
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: input.expectedProduct ?? "compiled-definition" }],
      claims: [],
    },
    invariants: input.invariants,
    contrasts: input.contrasts,
  };
}

export function compilerAuthority(
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

export function compilerObligation(
  id: CompilerObligationWitness["id"],
  role: CompilerObligationWitness["role"],
  summary: string,
): CompilerObligationWitness {
  return { id, role, summary };
}

export function inlineCompilerWorld(
  name: string,
  markup: string,
  options: Partial<CompilerWorld["compiler"]> = {},
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
      debug: options.debug ?? false,
      resolveResources: options.resolveResources ?? false,
    },
    setups: [],
    registrations: [],
  };
}

export function compiledDefinitionEnvelope(
  name: string,
  instructionRowCount: number,
  surrogateCount = 0,
): readonly CompilerFocusedInvariant[] {
  return [
    equalJitInvariant("definition.name", "The compiled definition preserves its explicit name.", {
      kind: "definition-field",
      field: "name",
    }, name),
    equalJitInvariant("definition.type", "The compiler returns a custom-element definition.", {
      kind: "definition-field",
      field: "type",
    }, "custom-element"),
    equalJitInvariant("definition.needs-compile", "The compiler closes the JIT handoff.", {
      kind: "definition-field",
      field: "needsCompile",
    }, false),
    equalJitInvariant("definition.template-node", "The compiled template remains an HTML template element.", {
      kind: "template-node-name",
    }, "TEMPLATE"),
    equalJitInvariant("definition.rows", "The case has the expected number of hydration targets.", {
      kind: "instruction-row-count",
    }, instructionRowCount),
    equalJitInvariant("definition.surrogates", surrogateCount === 0
      ? "The case contributes no root surrogate instructions."
      : "The case has the expected root surrogate instruction count.", {
      kind: "surrogate-count",
    }, surrogateCount),
  ];
}

export function equalJitInvariant(
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

export function includesJitInvariant(
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

export function instructionFieldSelector(
  row: number,
  instruction: number,
  field: string,
): CompilerFocusedInvariant["selector"] {
  return { kind: "instruction-field", row, instruction, field };
}
