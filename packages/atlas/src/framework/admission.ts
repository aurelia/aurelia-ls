import type { EvaluationEffectCertainty } from "../evaluation/index.js";
import type { SourceRange } from "../inquiry/locus.js";
import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "./relationships.js";

/** Schema marker for evaluator-derived framework admission relationship rows. */
export const FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION =
  "framework-admission-relationships-v1";

/** Bundle association kind produced by evaluating registry/configuration exports. */
export const enum FrameworkBundleAssociationKind {
  /** A register argument contributes a DI InterfaceSymbol registration key. */
  DiInterfaceRegistration = "di-interface-registration",
  /** A register argument contributes an Aurelia resource carrier. */
  ResourceRegistration = "resource-registration",
  /** A register argument is an array/catalog whose elements are expanded separately. */
  RegistrationCatalog = "registration-catalog",
  /** A register argument contributes another registry/configuration export. */
  RegistryExportRegistration = "registry-export-registration",
  /** A register argument is a static helper-produced registration product. */
  RegistrationHelper = "registration-helper",
  /** A register argument contributes an Aurelia AppTask lifecycle admission. */
  AppTaskRegistration = "app-task-registration",
  /** A container factory registration contributes a DI key/factory admission. */
  FactoryRegistration = "factory-registration",
  /** A register argument is a concrete value/class/function accepted by registration. */
  RegistrationArgument = "registration-argument",
  /** A register argument is visible but not yet semantically classified. */
  UnknownRegistrationArgument = "unknown-registration-argument",
}

/** Minimal source association shape needed to classify admission axes. */
export interface FrameworkAdmissionAssociationInput {
  /** Bundle association classifier. */
  readonly associationKind: FrameworkBundleAssociationKind;
  /** Registration helper call name, when the association came through one. */
  readonly helperName: string | null;
  /** Name of the surrounding catalog/array export, when this came from one. */
  readonly catalogName: string | null;
  /** Path inside nested array/catalog expansion. */
  readonly path: readonly string[];
}

/** Canonical shared relationship axes for a framework admission association. */
export interface FrameworkAdmissionClassification {
  /** Semantic relation expressed by the association. */
  readonly relation: FrameworkRelationshipRelation;
  /** Source/runtime mechanism that exposed the association. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Coarse world phase where the association participates. */
  readonly phase: FrameworkRelationshipPhase;
}

/** One relationship row describing a value admitted by a framework configuration/bundle. */
export interface FrameworkAdmissionRelationshipRow {
  /** Stable row id inside the current source basis. */
  readonly id: string;
  /** Schema marker for compaction-safe consumers. */
  readonly version: typeof FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION;
  /** Package that owns the admitting bundle/configuration source. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Exported configuration or bundle name. */
  readonly exportName: string;
  /** Semantic relation. */
  readonly relation: FrameworkRelationshipRelation;
  /** Runtime/source mechanism. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Coarse world phase. */
  readonly phase: FrameworkRelationshipPhase;
  /** Bundle association classifier that produced this row. */
  readonly associationKind: FrameworkBundleAssociationKind;
  /** Static evaluator certainty for the admission path. */
  readonly certainty: EvaluationEffectCertainty;
  /** Evaluator effect id that exposed this row. */
  readonly effectId: string;
  /** Evaluator effect sequence number. */
  readonly effectSequence: number;
  /** Register/helper argument index that produced this row. */
  readonly argumentIndex: number;
  /** True when the original register argument was syntactically spread. */
  readonly spread: boolean;
  /** Path inside nested array/catalog expansion. */
  readonly path: readonly string[];
  /** Name of surrounding catalog/array export, when present. */
  readonly catalogName: string | null;
  /** Registration helper call name, when present. */
  readonly helperName: string | null;
  /** Best visible target name for the admitted value. */
  readonly targetName: string | null;
  /** Admission source endpoint. */
  readonly from: FrameworkRelationshipEndpoint;
  /** Admitted target endpoint. */
  readonly to: FrameworkRelationshipEndpoint;
  /** Exact source range for the admitted expression or expanded catalog member. */
  readonly source: SourceRange;
  /** Source bundle-association id. */
  readonly bundleAssociationId: string;
  /** Source bundle row id. */
  readonly bundleId: string;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Classify evaluator bundle associations into shared relationship axes. */
export function classifyFrameworkAdmissionAssociation(
  association: FrameworkAdmissionAssociationInput,
): FrameworkAdmissionClassification {
  return {
    relation: admissionRelationForAssociation(),
    mechanism: admissionMechanismForAssociation(association),
    phase: admissionPhaseForAssociation(association),
  };
}

function admissionRelationForAssociation(): FrameworkRelationshipRelation {
  return FrameworkRelationshipRelation.AdmitsValue;
}

function admissionMechanismForAssociation(
  association: FrameworkAdmissionAssociationInput,
): FrameworkRelationshipMechanism {
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.FactoryRegistration
  ) {
    return FrameworkRelationshipMechanism.RegisterFactory;
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.UnknownRegistrationArgument
  ) {
    return FrameworkRelationshipMechanism.UnknownArgument;
  }
  if (
    association.helperName !== null ||
    association.associationKind ===
      FrameworkBundleAssociationKind.RegistrationHelper
  ) {
    return FrameworkRelationshipMechanism.RegistrationHelper;
  }
  if (
    association.catalogName !== null ||
    association.path.length > 1 ||
    association.associationKind ===
      FrameworkBundleAssociationKind.RegistrationCatalog
  ) {
    return FrameworkRelationshipMechanism.CatalogExpansion;
  }
  return FrameworkRelationshipMechanism.RegisterCall;
}

function admissionPhaseForAssociation(
  association: FrameworkAdmissionAssociationInput,
): FrameworkRelationshipPhase {
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.AppTaskRegistration
  ) {
    return FrameworkRelationshipPhase.LifecycleTaskAdmission;
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.FactoryRegistration
  ) {
    return FrameworkRelationshipPhase.FactoryAdmission;
  }
  if (
    association.associationKind ===
      FrameworkBundleAssociationKind.RegistrationCatalog &&
    association.path.length <= 1
  ) {
    return FrameworkRelationshipPhase.ConfigurationEvaluation;
  }
  if (
    association.catalogName !== null ||
    association.path.length > 1 ||
    association.associationKind ===
      FrameworkBundleAssociationKind.RegistrationCatalog
  ) {
    return FrameworkRelationshipPhase.CatalogExpansion;
  }
  return FrameworkRelationshipPhase.RegistrationAdmission;
}
