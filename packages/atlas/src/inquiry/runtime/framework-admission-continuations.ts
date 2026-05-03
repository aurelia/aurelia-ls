import type { FrameworkAdmissionRelationshipRow } from "../../framework/admission.js";
import {
  FrameworkAdmissionMaterializationLinkKind,
  FrameworkAdmissionWorldFormationKind,
  type FrameworkAdmissionWorldFormationRow,
} from "../../framework/admission-world.js";
import { FrameworkRelationshipEndpointKind } from "../../framework/relationships.js";
import {
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import {
  type FrameworkAdmissionMaterializationLinkRow,
} from "./framework-admission-materialization.js";
import { FrameworkSemanticRouteBuilder } from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";

/** Builds semantic next-hop continuations for admission relationship and world-formation rows. */
export class FrameworkAdmissionContinuationPlanner {
  /** Build semantic hops from an admission relationship row into downstream framework lenses. */
  relationshipSemanticContinuations(
    /** Parent inquiry whose locus should be preserved. */
    inquiry: Inquiry,
    /** Admission relationship row to navigate from. */
    row: FrameworkAdmissionRelationshipRow,
    /** Page-local row index used for stable continuation ids. */
    index: number,
    /** Evidence row to preserve across the hop. */
    evidence: Evidence,
  ): readonly Continuation[] {
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.admission:relationships",
      index,
      evidence,
    );
    switch (row.to.kind) {
      case FrameworkRelationshipEndpointKind.DiKey:
        return [
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToMaterializationInstantiations,
            "materialization",
            {
              filters: { key: row.to.name },
              rationale:
                "Follow the admitted DI key toward visible runtime-existence rows.",
              routeSummary: "Admitted DI key to runtime-existence rows.",
            },
          ),
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToDiProviders,
            "di",
            {
              filters: { key: row.to.name },
              rationale:
                "Inspect DI provider and registration atoms behind the admitted key.",
              routeSummary: "DI provider atoms behind an admitted DI key.",
              priority: ContinuationPriority.Secondary,
            },
          ),
        ];
      case FrameworkRelationshipEndpointKind.Resource:
        return [
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToMaterializationResourceInstantiations,
            "resource-instantiation",
            {
              filters: {
                packageId: row.to.packageId,
                resourceKind: row.to.resourceKind,
                resourceName: row.to.name,
              },
              rationale:
                "Follow the admitted resource toward visible runtime/compiler/evaluator materialization sites.",
              routeSummary: "Admitted resource to materialization sites.",
            },
          ),
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToDiscoveryResourceCarriers,
            "resource",
            {
              filters: {
                resourceKind: row.to.resourceKind,
                query: row.to.name,
              },
              rationale:
                "Follow the admitted resource into the framework resource catalog.",
              routeSummary:
                "Admitted resource to framework resource carrier catalog.",
              priority: ContinuationPriority.Secondary,
            },
          ),
        ];
      case FrameworkRelationshipEndpointKind.RegistryExport:
        return [
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToRelationships,
            "registry",
            {
              filters: {
                packageId: row.to.packageId,
                exportName: row.to.name,
              },
              rationale:
                "Inspect admission relationships owned by the admitted registry/configuration export.",
              routeSummary:
                "Registry/configuration admission to its own admitted values.",
            },
          ),
        ];
      case FrameworkRelationshipEndpointKind.AppTask:
        const slotName = appTaskSlotName(row);
        return [
          ...(slotName === null
            ? []
            : [
                route.continuation(
                  FrameworkSemanticRoutes.AdmissionToLifecycleAppTasks,
                  "app-task-execution",
                  {
                    filters: { slotName },
                    rationale:
                      "Follow the admitted AppTask slot to the AppRoot lifecycle execution sites.",
                    routeSummary:
                      "Admitted AppTask slot to AppRoot lifecycle execution sites.",
                  },
                ),
              ]),
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToDiscoveryAppTasks,
            "app-task",
            {
              filters: { query: row.to.name },
              rationale:
                "Follow the admitted lifecycle task into the AppTask entity catalog.",
              routeSummary: "Admitted AppTask to framework AppTask catalog.",
              priority: ContinuationPriority.Secondary,
            },
          ),
        ];
      default:
        return [];
    }
  }

  /** Build semantic hops from an admission world-formation row into downstream framework lenses. */
  worldFormationSemanticContinuations(
    /** Parent inquiry whose locus should be preserved. */
    inquiry: Inquiry,
    /** World-formation row to navigate from. */
    row: FrameworkAdmissionWorldFormationRow,
    /** Page-local row index used for stable continuation ids. */
    index: number,
    /** Evidence row to preserve across the hop. */
    evidence: Evidence,
  ): readonly Continuation[] {
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.admission:world-formation",
      index,
      evidence,
    );
    if (
      row.formationKind ===
      FrameworkAdmissionWorldFormationKind.RuntimeExistence
    ) {
      if (
        row.linkKind ===
        FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation
      ) {
        return [
          route.continuation(
            FrameworkSemanticRoutes.AdmissionToMaterializationResourceInstantiations,
            "materialization",
            {
              filters: {
                resourceKind: row.resourceKind,
                resourceName:
                  row.admittedTarget.resourceName ?? row.admittedTarget.name,
              },
              rationale:
                "Inspect the materialization detail rows behind this world-formation row.",
              routeSummary: "World-formation row to materialization detail.",
            },
          ),
        ];
      }
      return [
        route.continuation(
          FrameworkSemanticRoutes.AdmissionToMaterializationInstantiations,
          "materialization",
          {
            filters: { key: row.admittedTarget.name },
            rationale:
              "Inspect the materialization detail rows behind this world-formation row.",
            routeSummary: "World-formation row to materialization detail.",
          },
        ),
      ];
    }
    if (
      row.formationKind ===
        FrameworkAdmissionWorldFormationKind.AppTaskExecution &&
      row.slotName !== undefined
    ) {
      return [
        route.continuation(
          FrameworkSemanticRoutes.AdmissionToLifecycleAppTasks,
          "app-task-execution",
          {
            filters: { slotName: row.slotName },
            rationale:
              "Inspect lifecycle AppTask execution rows for this admitted slot.",
            routeSummary: "World-formation row to AppRoot lifecycle execution.",
          },
        ),
      ];
    }
    if (row.admittedTarget.kind === FrameworkRelationshipEndpointKind.RegistryExport) {
      return [
        route.continuation(
          FrameworkSemanticRoutes.AdmissionToRelationships,
          "registry-admission",
          {
            filters: {
              packageId: row.admittedTarget.packageId,
              exportName: row.admittedTarget.name,
            },
            rationale:
              "Inspect admission relationships owned by the admitted registry/configuration export.",
            routeSummary:
              "Registry/configuration admission to its owned admissions.",
          },
        ),
      ];
    }
    return [];
  }

  /** Build the detail hop from an admission/materialization bridge to its materialization lens. */
  materializationDetailContinuation(
    /** Parent inquiry whose locus should be preserved. */
    inquiry: Inquiry,
    /** Admission-to-materialization link row to navigate from. */
    row: FrameworkAdmissionMaterializationLinkRow,
    /** Page-local row index used for stable continuation ids. */
    index: number,
    /** Evidence row to preserve across the hop. */
    evidence: Evidence,
  ): Continuation {
    const isResource =
      row.linkKind ===
      FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation;
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.admission:materializations",
      index,
      evidence,
    );
    if (isResource) {
      return route.continuation(
        FrameworkSemanticRoutes.AdmissionToMaterializationResourceInstantiations,
        "detail",
        {
          filters: {
            resourceKind: row.resourceKind,
            resourceName:
              row.admittedTarget.resourceName ?? row.admittedTarget.name,
          },
          rationale:
            "Inspect resource materialization rows for this admitted resource.",
          routeSummary: "Admitted target to visible materialization rows.",
        },
      );
    }
    return route.continuation(
      FrameworkSemanticRoutes.AdmissionToMaterializationInstantiations,
      "detail",
      {
        filters: {
          key: row.admittedTarget.name,
        },
        rationale: "Inspect DI key instantiation rows for this admitted key.",
        routeSummary: "Admitted target to visible materialization rows.",
      },
    );
  }
}

/** Shared planner for framework.admission semantic continuation families. */
export const frameworkAdmissionContinuationPlanner =
  new FrameworkAdmissionContinuationPlanner();

function appTaskSlotName(row: FrameworkAdmissionRelationshipRow): string | null {
  if (row.helperName?.startsWith("AppTask.") !== true) {
    return null;
  }
  return row.helperName.slice("AppTask.".length);
}
