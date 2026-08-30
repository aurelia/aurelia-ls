import type { ProductHandle, IdentityHandle } from '../kernel/handles.js';
import type { TemplateCompilerContextFamilyValue } from './template-compiler-context-family-value.js';
import type { TemplateCompilerRuntimeInstructionFamilyValue } from './template-instruction-runtime-value.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';

export const SEMANTIC_APP_RUNTIME_REGISTRATION_REQUIREMENTS_VERSION =
  'semantic-runtime/runtime-registration-requirements/v2' as const;

export const enum RuntimeRegistrationRequirementSelectionKind {
  ExactLeaves = 'exact-leaves',
  ConservativeGroup = 'conservative-group',
}

export const enum RuntimeRegistrationRequirementGroupKind {
  RuntimeHtmlDefaultResources = 'runtime-html-default-resources',
  RuntimeHtmlDefaultRenderers = 'runtime-html-default-renderers',
  EventModifierRegistration = 'event-modifier-registration',
}

export const enum RuntimeRegistrationRequirementReasonKind {
  CompilerHandoffUnavailable = 'compiler-handoff-unavailable',
  CompilerCohortIncomplete = 'compiler-cohort-incomplete',
  ResourceReferenceOpen = 'resource-reference-open',
  ProviderAttributionAmbiguous = 'provider-attribution-ambiguous',
  RegistrationPressureOpen = 'registration-pressure-open',
  CustomRendererRegistration = 'custom-renderer-registration',
  RuntimeInstructionAbiUnmodeled = 'runtime-instruction-abi-unmodeled',
  RuntimeRendererClaimMismatch = 'runtime-renderer-claim-mismatch',
  RuntimeRendererUnavailable = 'runtime-renderer-unavailable',
  RuntimeInstructionCreatedAtRuntime = 'runtime-instruction-created-at-runtime',
  RuntimeInstructionLaneOpen = 'runtime-instruction-lane-open',
  RuntimeSpreadCompilationRequired = 'runtime-spread-compilation-required',
  RuntimeTemplateCompilationRequired = 'runtime-template-compilation-required',
  PackageExportUnavailable = 'package-export-unavailable',
  ProgrammaticRuntimeRegistrationUse = 'programmatic-runtime-registration-use',
  ProgrammaticUseOpen = 'programmatic-use-open',
}

export interface RuntimeRegistrationRequirementReason {
  readonly reasonKind: RuntimeRegistrationRequirementReasonKind;
  readonly summary: string;
  readonly stableKeys: readonly string[];
}

/** One importable runtime registration target with its semantic and provider identities. */
export interface RuntimeRegistrationRequirementLeaf {
  readonly moduleSpecifier: string;
  readonly exportName: string;
  readonly productHandle: ProductHandle | null;
  readonly identityHandle: IdentityHandle | null;
  readonly definitionProductHandle: ProductHandle | null;
  readonly definitionIdentityHandle: IdentityHandle | null;
  readonly catalogProductHandle: ProductHandle | null;
  readonly providerAdmissionProductHandle: ProductHandle | null;
  readonly providerAdmissionIdentityHandle: IdentityHandle | null;
  readonly ordinal: number;
  readonly staticUseCount: number;
}

export interface RuntimeRegistrationRequirementGroupReference {
  readonly moduleSpecifier: string;
  readonly exportName: string;
}

export type RuntimeRegistrationRequirementSelection =
  | {
      readonly selectionKind: RuntimeRegistrationRequirementSelectionKind.ExactLeaves;
      readonly groupKind: RuntimeRegistrationRequirementGroupKind;
      readonly conservativeGroup: RuntimeRegistrationRequirementGroupReference;
      readonly leaves: readonly RuntimeRegistrationRequirementLeaf[];
      readonly reasons: readonly [];
    }
  | {
      readonly selectionKind: RuntimeRegistrationRequirementSelectionKind.ConservativeGroup;
      readonly groupKind: RuntimeRegistrationRequirementGroupKind;
      readonly conservativeGroup: RuntimeRegistrationRequirementGroupReference;
      readonly leaves: readonly [];
      readonly reasons: readonly RuntimeRegistrationRequirementReason[];
    };

/** Detached app-wide registration requirements produced from browser-final compiler families. */
export class SemanticAppRuntimeRegistrationRequirements {
  readonly schemaVersion = SEMANTIC_APP_RUNTIME_REGISTRATION_REQUIREMENTS_VERSION;

  constructor(
    readonly resources: RuntimeRegistrationRequirementSelection,
    readonly renderers: RuntimeRegistrationRequirementSelection,
    readonly eventModifier: RuntimeRegistrationRequirementSelection,
  ) {}
}

export interface RuntimeRegistrationRequirementCompilerInput {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly family: TemplateCompilerContextFamilyValue | null;
  readonly instructions: TemplateCompilerRuntimeInstructionFamilyValue | null;
  readonly unavailableReasons: readonly RuntimeRegistrationRequirementReason[];
}

/** Internal constructor shared by the positive projector and closure-pressure collector. */
export function runtimeRegistrationRequirementReason(
  reasonKind: RuntimeRegistrationRequirementReasonKind,
  summary: string,
  stableKeys: readonly (string | number)[],
): RuntimeRegistrationRequirementReason {
  return { reasonKind, summary, stableKeys: stableKeys.map(String) };
}

/** Preserve first evidence order while collapsing duplicate reason identities. */
export function dedupeRuntimeRegistrationRequirementReasons(
  reasons: readonly RuntimeRegistrationRequirementReason[],
): readonly RuntimeRegistrationRequirementReason[] {
  return [...new Map(reasons.map((entry) => [
    JSON.stringify([entry.reasonKind, entry.stableKeys]),
    entry,
  ])).values()];
}
