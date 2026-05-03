import type { SourceRange } from "../inquiry/locus.js";
import type { FrameworkAdmissionRelationshipRow } from "./admission.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "./relationships.js";

/** Bridge class from admission rows to runtime-existence/materialization rows. */
export const enum FrameworkAdmissionMaterializationLinkKind {
  /** An admitted DI key has visible provider/runtime-existence evidence. */
  DiKeyInstantiation = "di-key-instantiation",
  /** An admitted framework resource has visible runtime/compiler/evaluator materialization evidence. */
  ResourceInstantiation = "resource-instantiation",
}

/** Exact matching basis used to join admission rows to materialization rows. */
export const enum FrameworkAdmissionMaterializationMatchBasis {
  /** The admitted DI key name exactly matched a key-instantiation row. */
  DiKeyName = "di-key-name",
  /** The admitted DI target name exactly matched the provider endpoint. */
  DiProviderName = "di-provider-name",
  /** The admitted resource source range matched the resource carrier. */
  ResourceSourceCarrier = "resource-source-carrier",
  /** The admitted resource target matched the local resource target name. */
  ResourceTargetName = "resource-target-name",
  /** The admitted resource target matched the exported carrier name. */
  ResourceExportName = "resource-export-name",
  /** The admitted resource target matched the static resource lookup name. */
  ResourceLookupName = "resource-lookup-name",
}

/** World-formation class derived from admission rows without claiming final container state. */
export const enum FrameworkAdmissionWorldFormationKind {
  /** Admission joined to visible DI/resource runtime-existence evidence. */
  RuntimeExistence = "runtime-existence",
  /** Admission joined to AppRoot lifecycle task execution evidence. */
  AppTaskExecution = "app-task-execution",
  /** Catalog/array admission was statically expanded by evaluator evidence. */
  CatalogExpansion = "catalog-expansion",
  /** Admission has no matching materialization/execution row or only names a deferred admission target. */
  AdmissionOnly = "admission-only",
}

/** Whether an admission row has been spent into visible world evidence. */
export const enum FrameworkAdmissionWorldFormationStatus {
  /** A DI key or resource has visible materialization evidence. */
  Materialized = "materialized",
  /** An AppTask has visible lifecycle execution evidence. */
  Executed = "executed",
  /** A catalog was statically expanded by the evaluator. */
  Expanded = "expanded",
  /** The row is intentionally only an admission fact at this layer. */
  AdmissionOnly = "admission-only",
  /** Atlas expected a downstream fact but did not find one. */
  Open = "open",
}

/** Compact row joining admission to visible world-formation evidence, or preserving an admission-only boundary. */
export interface FrameworkAdmissionWorldFormationRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the admitting source. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Exported configuration or bundle name. */
  readonly exportName: string;
  /** Source admission relationship row id. */
  readonly admissionRelationshipId: string;
  /** Admission relation that produced this row. */
  readonly admissionRelation: FrameworkRelationshipRelation;
  /** Source bundle association classifier that admitted the target. */
  readonly associationKind: string;
  /** World-formation interpretation class. */
  readonly formationKind: FrameworkAdmissionWorldFormationKind;
  /** Whether downstream world evidence was found or intentionally deferred. */
  readonly status: FrameworkAdmissionWorldFormationStatus;
  /** Target endpoint admitted by configuration or bundle evaluation. */
  readonly admittedTarget: FrameworkRelationshipEndpoint;
  /** Endpoint that exists, executes, expands, or remains admission-only. */
  readonly formedTarget: FrameworkRelationshipEndpoint;
  /** Source range for the admission expression. */
  readonly source: SourceRange;
  /** Source range for downstream materialization or execution evidence. */
  readonly formationSource?: SourceRange;
  /** Stable id of the materialization row when this joined materialization evidence. */
  readonly materializationId?: string;
  /** Materialization kind when this joined materialization evidence. */
  readonly materializationKind?: string;
  /** Admission-to-materialization bridge class. */
  readonly linkKind?: FrameworkAdmissionMaterializationLinkKind;
  /** Exact match basis for the admission-to-materialization join. */
  readonly matchBasis?: string;
  /** Resource definition kind for resource world-formation rows. */
  readonly resourceKind?: string;
  /** Materialization site kinds observed downstream. */
  readonly materializationSiteKinds?: readonly string[];
  /** Stable id of the lifecycle execution row when this joined AppTask execution. */
  readonly lifecycleExecutionId?: string;
  /** AppTask execution kind when this joined lifecycle evidence. */
  readonly appTaskExecutionKind?: string;
  /** Concrete AppTask slot name when visible. */
  readonly slotName?: string;
  /** Closure class for the world-formation interpretation. */
  readonly closure: FrameworkRelationshipClosure;
  /** Explanation for open admission-only rows. */
  readonly openReason?: string;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Admission-only interpretation before any downstream materialization or lifecycle evidence is joined. */
export interface FrameworkAdmissionOnlyWorldFormationInterpretation {
  /** World-formation class to assign to the preserved admission row. */
  readonly formationKind: FrameworkAdmissionWorldFormationKind;
  /** Status to assign before downstream evidence is found. */
  readonly status: FrameworkAdmissionWorldFormationStatus;
  /** Closure class for the admission-only row. */
  readonly closure: FrameworkRelationshipClosure;
  /** Open reason when the status is open. */
  readonly openReason?: string;
  /** Human-facing summary for the preserved admission-only row. */
  readonly summary: string;
}

type AdmissionOnlySummary = (
  relationship: FrameworkAdmissionRelationshipRow,
) => string;

/**
 * Boundary interpretation for an admission row before downstream world evidence
 * has been joined.
 */
export class FrameworkAdmissionWorldFormationDisposition {
  private static readonly catalogExpansion =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.CatalogExpansion,
      FrameworkAdmissionWorldFormationStatus.Expanded,
      undefined,
      (relationship) =>
        `${relationship.exportName} expands catalog ${relationship.to.name} during static admission evaluation.`,
    );

  private static readonly missingDiMaterialization =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.Open,
      "Admitted DI key has no matching materialization row in the current Atlas indexes.",
      downstreamOpenSummary,
    );

  private static readonly missingResourceMaterialization =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.Open,
      "Admitted resource has no matching resource materialization row in the current Atlas indexes.",
      downstreamOpenSummary,
    );

  private static readonly missingAppTaskExecution =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.Open,
      "Admitted AppTask has no concrete AppRoot slot execution row joined from the helper name.",
      downstreamOpenSummary,
    );

  private static readonly unclassifiedOpen =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.Open,
      "Admission remains unclassified for world formation.",
      downstreamOpenSummary,
    );

  private static readonly registryAdmission =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.AdmissionOnly,
      undefined,
      (relationship) =>
        `${relationship.exportName} admits registry/configuration export ${relationship.to.name}; execution is a separate world-formation path.`,
    );

  private static readonly admissionOnly =
    new FrameworkAdmissionWorldFormationDisposition(
      FrameworkAdmissionWorldFormationKind.AdmissionOnly,
      FrameworkAdmissionWorldFormationStatus.AdmissionOnly,
      undefined,
      (relationship) =>
        `${relationship.exportName} admits ${relationship.to.name}; Atlas preserves this as an admission-only fact.`,
    );

  private constructor(
    /** World-formation class to assign to the preserved admission row. */
    readonly formationKind: FrameworkAdmissionWorldFormationKind,
    /** Status to assign before downstream evidence is found. */
    readonly status: FrameworkAdmissionWorldFormationStatus,
    /** Open reason when the disposition expects downstream evidence. */
    readonly openReason: string | undefined,
    private readonly summarize: AdmissionOnlySummary,
  ) {}

  /** Classify the admitted target into an admission-only boundary disposition. */
  static forAdmittedTarget(
    target: FrameworkRelationshipEndpoint,
  ): FrameworkAdmissionWorldFormationDisposition {
    switch (target.kind) {
      case FrameworkRelationshipEndpointKind.RegistrationCatalog:
        return FrameworkAdmissionWorldFormationDisposition.catalogExpansion;
      case FrameworkRelationshipEndpointKind.DiKey:
        return FrameworkAdmissionWorldFormationDisposition.missingDiMaterialization;
      case FrameworkRelationshipEndpointKind.Resource:
        return FrameworkAdmissionWorldFormationDisposition.missingResourceMaterialization;
      case FrameworkRelationshipEndpointKind.AppTask:
        return FrameworkAdmissionWorldFormationDisposition.missingAppTaskExecution;
      case FrameworkRelationshipEndpointKind.Unknown:
        return FrameworkAdmissionWorldFormationDisposition.unclassifiedOpen;
      case FrameworkRelationshipEndpointKind.RegistryExport:
        return FrameworkAdmissionWorldFormationDisposition.registryAdmission;
      default:
        return FrameworkAdmissionWorldFormationDisposition.admissionOnly;
    }
  }

  /** Interpret one relationship using this boundary disposition. */
  interpret(
    relationship: FrameworkAdmissionRelationshipRow,
  ): FrameworkAdmissionOnlyWorldFormationInterpretation {
    return {
      formationKind: this.formationKind,
      status: this.status,
      closure: FrameworkRelationshipClosure.Partial,
      ...(this.openReason === undefined
        ? {}
        : { openReason: this.openReason }),
      summary: this.summarize(relationship),
    };
  }
}

/** Interprets admission rows as world-formation boundaries without performing runtime joins. */
export class FrameworkAdmissionWorldFormationInterpreter {
  /** Interpret one admission relationship before downstream materialization/execution rows are joined. */
  interpretAdmissionOnly(
    /** Admission relationship row to preserve or mark open. */
    relationship: FrameworkAdmissionRelationshipRow,
  ): FrameworkAdmissionOnlyWorldFormationInterpretation {
    return FrameworkAdmissionWorldFormationDisposition.forAdmittedTarget(
      relationship.to,
    ).interpret(relationship);
  }
}

/** Shared interpreter for admission-to-world formation boundary rows. */
export const frameworkAdmissionWorldFormation =
  new FrameworkAdmissionWorldFormationInterpreter();

function downstreamOpenSummary(
  relationship: FrameworkAdmissionRelationshipRow,
): string {
  return `${relationship.exportName} admits ${relationship.to.name}; no downstream world-formation row is currently joined.`;
}
