import type { StringBindingMode } from "@aurelia/template-compiler";
import type { BatchCaseDescriptor } from "./batch-contracts.js";

export const COMPILER_CASE_SCHEMA_VERSION = "aurelia-ls/compiler-case/v1" as const;
export const COMPILER_CORPUS_FRAMEWORK_REVISION = "4ff60906593bdedc9f9dc6003606ba138df87f0e";

/** Stable semantic obligation key, independent of current source line numbers. */
export type CompilerObligationId = `compiler.${string}`;

/** Canonical case data accepted by setup arguments, invariants, and receipts. */
export type CompilerCaseData =
  | null
  | boolean
  | number
  | string
  | readonly CompilerCaseData[]
  | { readonly [key: string]: CompilerCaseData };

export type CompilerAuthorityRepository = "aurelia" | "aurelia-ls2";
export type CompilerAuthorityRole =
  | "behavior"
  | "implementation"
  | "runtime-consequence"
  | "regression"
  | "history";

/** Exact authority link. SHA + file + range is the provenance identity; titles are descriptive only. */
export interface CompilerAuthorityReference {
  readonly repository: CompilerAuthorityRepository;
  readonly revision: string;
  readonly role: CompilerAuthorityRole;
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine?: number;
  readonly symbolName?: string;
  readonly suiteName?: string;
  readonly testName?: string;
  readonly summary: string;
}

export type CompilerObligationWitnessRole =
  | "primary"
  | "interaction"
  | "contrast"
  | "boundary"
  | "runtime-consequence";

export interface CompilerObligationWitness {
  readonly id: CompilerObligationId;
  readonly role: CompilerObligationWitnessRole;
  readonly summary: string;
  /** Exact closed dimension/claims this witness may satisfy once an evaluated receipt proves them. */
  readonly closureEvidence?: {
    readonly dimension: CompilerClosureDimension;
    readonly claimIds: readonly string[];
  };
}

export interface CompilerWorldRef {
  readonly setup: string;
  readonly export: string;
}

export type CompilerTemplateSource =
  | { readonly kind: "markup"; readonly value: string }
  | { readonly kind: "setup-ref"; readonly value: CompilerWorldRef };

/** Plain bindable data. Executable setters are supplied through a referenced setup definition. */
export interface CompilerCaseBindableDefinition {
  readonly name: string;
  readonly attribute?: string;
  readonly mode?: StringBindingMode | number;
  readonly set?: CompilerWorldRef;
}

/** Consumer-neutral element definition input for either compiler lane. */
export interface CompilerElementDefinition {
  readonly name: string;
  readonly type: "custom-element";
  readonly template?: CompilerTemplateSource | null;
  readonly instructions?: readonly (readonly CompilerCaseData[])[];
  readonly surrogates?: readonly CompilerCaseData[];
  readonly needsCompile?: boolean;
  readonly containerless?: boolean;
  readonly hasSlots?: boolean;
  readonly shadowOptions?: { readonly mode: "open" | "closed" } | null;
  readonly enhance?: boolean;
  readonly capture?: boolean | CompilerWorldRef;
  readonly processContent?: CompilerWorldRef | null;
  readonly Type?: CompilerWorldRef;
  readonly bindables?: readonly CompilerCaseBindableDefinition[];
}

export interface CompilerAttributeSyntax {
  readonly rawName: string;
  readonly rawValue: string;
  readonly target: string;
  readonly command: string | null;
  readonly parts?: readonly string[];
}

export type CompilerDomTarget =
  | { readonly kind: "element"; readonly tagName: string }
  | { readonly kind: "setup-ref"; readonly value: CompilerWorldRef };

export type CompilerEntry =
  | {
      readonly kind: "compile";
      readonly definition: CompilerElementDefinition;
    }
  | {
      readonly kind: "compile-spread";
      readonly requestor: CompilerElementDefinition;
      readonly attributes: readonly CompilerAttributeSyntax[];
      readonly target: CompilerDomTarget;
      readonly targetDefinition?: CompilerElementDefinition;
    };

/** Named invocation of setup data; execution is implemented independently for each oracle lane. */
export interface CompilerSetupInvocation {
  readonly symbol: string;
  readonly factory: string;
  readonly args?: CompilerCaseData;
}

/** Versioned exports advertised by one setup factory without executing it. */
export interface CompilerSetupManifest {
  readonly factoryId: string;
  readonly version: number;
  readonly exports: readonly string[];
}

/** Neutral setup contract shared by lane-specific materializers. */
export interface CompilerSetupFactory extends CompilerSetupManifest {
  validate(args: CompilerCaseData | undefined): void;
  describe(args: CompilerCaseData | undefined): CompilerCaseData;
}

export type CompilerRegistrationSite =
  | "definition-dependency"
  | "root-before-standard-configuration"
  | "root-after-standard-configuration"
  | "compilation-local";

export interface CompilerRegistration {
  readonly site: CompilerRegistrationSite;
  readonly value: CompilerWorldRef;
  readonly cardinality: "single" | "many";
}

/** One declared compiler/resource/container world, independent of either adapter. */
export interface CompilerWorld {
  readonly configuration: "standard";
  readonly entry: CompilerEntry;
  readonly compiler: {
    readonly debug: boolean;
    readonly resolveResources: boolean;
  };
  readonly setups: readonly CompilerSetupInvocation[];
  readonly registrations: readonly CompilerRegistration[];
}

export type CompilerEffectKind =
  | "browser-tree-construction"
  | "browser-recovery"
  | "template-compiler-hook"
  | "process-content"
  | "custom-pattern"
  | "custom-command"
  | "resource-resolution"
  | "compiler-built-in";

export type CompilerEffectConservation =
  | "statically-modeled"
  | "build-executed"
  | "runtime-retained"
  | "refused"
  | "open";

export interface CompilerEffectPosture {
  readonly id: `effect.${string}`;
  readonly kind: CompilerEffectKind;
  readonly introducedBy?: CompilerWorldRef;
  readonly oracle: "observed" | "executed-by-framework";
  readonly conservation: CompilerEffectConservation;
  readonly affectedProducts: readonly string[];
  readonly summary: string;
}

export type CompilerClosureDimension =
  | "browser-tree"
  | "compiler-world"
  | "syntax-lowering"
  | "dom-tree-effects"
  | "compiler-extensions"
  | "compiled-output"
  | "runtime-dynamic-compilation"
  | "runtime-expression-strings"
  | "extern-execution";

export interface CompilerClosureClaim {
  readonly dimension: CompilerClosureDimension;
  readonly state: "closed" | "open" | "not-claimed";
  readonly reason: string;
  readonly evidenceClaimIds?: readonly string[];
  readonly blockerEffectIds?: readonly `effect.${string}`[];
}

export type CompilerOracleLaneId = "framework-jit" | "semantic-runtime" | "chromium-parser" | "runtime-behavior";
export type CompilerOracleExpectedProduct =
  | "compiled-definition"
  | "unchanged-definition"
  | "spread-instructions"
  | "compiler-error"
  | "effect-boundary"
  | "browser-tree";

export interface CompilerOracleLane {
  readonly id: CompilerOracleLaneId;
  readonly expectedProduct: CompilerOracleExpectedProduct;
}

export interface CompilerProductRef {
  readonly lane: CompilerOracleLaneId;
  readonly product: CompilerOracleExpectedProduct;
}

export interface CompilerEquivalenceClaim {
  readonly id: string;
  readonly description: string;
  readonly kind: "equivalent";
  readonly left: CompilerProductRef;
  readonly right: CompilerProductRef;
  readonly comparator: string;
}

export interface CompilerExpectedDivergenceClaim {
  readonly id: string;
  readonly description: string;
  readonly kind: "expected-divergence";
  readonly left: CompilerProductRef;
  readonly right: CompilerProductRef;
  readonly comparator: string;
  readonly reasonCode: string;
  readonly reason: string;
  readonly authorityVersions: { readonly [authority: string]: string };
}

export type CompilerOracleClaim = CompilerEquivalenceClaim | CompilerExpectedDivergenceClaim;

export interface CompilerOraclePlan {
  readonly lanes: readonly CompilerOracleLane[];
  readonly claims: readonly CompilerOracleClaim[];
}

export type CompilerInvariantSelector =
  | { readonly kind: "definition-field"; readonly field: "name" | "type" | "template" | "needsCompile" | "hasSlots" }
  | { readonly kind: "instruction-row-count" }
  | { readonly kind: "surrogate-count" }
  | { readonly kind: "template-node-name" }
  | { readonly kind: "template-outer-html" }
  | { readonly kind: "instruction-row-width"; readonly row: number }
  | { readonly kind: "instruction-field"; readonly row: number; readonly instruction: number; readonly field: string }
  | {
      readonly kind: "instruction-path";
      readonly row: number;
      readonly instruction: number;
      readonly path: readonly (string | number)[];
    }
  | { readonly kind: "surrogate-field"; readonly instruction: number; readonly field: string }
  | { readonly kind: "definition-dependencies-count" }
  | { readonly kind: "spread-instruction-count" }
  | { readonly kind: "spread-instruction-field"; readonly instruction: number; readonly field: string }
  | { readonly kind: "compiler-error-code" }
  | { readonly kind: "compiler-error-message" }
  | { readonly kind: "browser-serialization" }
  | {
      readonly kind: "browser-tree-path";
      readonly path: readonly (string | number)[];
    };

export type CompilerInvariantAssertion =
  | { readonly kind: "equal"; readonly expected: CompilerCaseData }
  | { readonly kind: "includes"; readonly expected: string };

export interface CompilerFocusedInvariant {
  readonly id: string;
  readonly description: string;
  readonly lanes: readonly CompilerOracleLaneId[];
  readonly selector: CompilerInvariantSelector;
  readonly assertion: CompilerInvariantAssertion;
}

export type CompilerContrastRelation = "nearest-neighbor" | "metamorphic" | "interaction-control";

export interface CompilerCaseContrast {
  readonly caseId: string;
  readonly relation: CompilerContrastRelation;
  readonly difference: string;
}

export type CompilerConservationCaseKind = "compiler-world" | "browser-tree";

/** Evidence shared by executable compiler worlds and independent conservation oracles. */
export interface CompilerConservationCase extends BatchCaseDescriptor {
  readonly caseKind: CompilerConservationCaseKind;
  readonly schemaVersion: typeof COMPILER_CASE_SCHEMA_VERSION;
  readonly provenance: readonly CompilerAuthorityReference[];
  readonly obligations: readonly CompilerObligationWitness[];
  readonly effects: readonly CompilerEffectPosture[];
  readonly closure: readonly CompilerClosureClaim[];
  readonly oracles: CompilerOraclePlan;
  readonly invariants: readonly CompilerFocusedInvariant[];
  readonly contrasts: readonly CompilerCaseContrast[];
}

/** Declarative executable compiler-world case. Oracle execution lives outside this record. */
export interface CompilerCase extends CompilerConservationCase {
  readonly caseKind: "compiler-world";
  readonly world: CompilerWorld;
}

/** Honest JIT-only posture before semantic-runtime and browser comparison lanes exist. */
export const BASELINE_CHARACTERIZATION_CLOSURE: readonly CompilerClosureClaim[] = [
  {
    dimension: "browser-tree",
    state: "not-claimed",
    reason: "The JIT lane uses JSDOM; independent Chromium/browser lineage comparison is not active yet.",
  },
  {
    dimension: "compiler-world",
    state: "not-claimed",
    reason: "Only JIT world construction exists; cross-lane world equivalence is not active yet.",
  },
  {
    dimension: "syntax-lowering",
    state: "not-claimed",
    reason: "The case characterizes JIT lowering but does not yet compare semantic-runtime output.",
  },
  {
    dimension: "dom-tree-effects",
    state: "not-claimed",
    reason: "The final JIT template is asserted without authored/browser/compiler effect lineage.",
  },
  {
    dimension: "compiler-extensions",
    state: "not-claimed",
    reason: "No cross-lane effect-conservation claim exists yet, even when the declared case has no extension rows.",
  },
  {
    dimension: "compiled-output",
    state: "not-claimed",
    reason: "The JIT output is characterized; the consumer-neutral semantic-runtime definition is not compared yet.",
  },
];
