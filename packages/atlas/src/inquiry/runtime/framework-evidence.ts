import {
  FrameworkAnchorResolutionStatus,
  sourceRangeForFrameworkAnchorCandidate,
  sourceRangeForFrameworkFlowCallEdge,
  sourceRangeForFrameworkFlowCallSite,
  type FrameworkAnchorResolution,
  type FrameworkFlowCallEdgeRow,
  type FrameworkFlowCallSiteRow,
  type FrameworkFlowCallTargetRow,
  type FrameworkFlowDefinition,
  type FrameworkFlowSeedRow,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
} from "../../framework/index.js";
import { FrameworkBundleAssociationKind } from "../../framework/admission.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import {
  type FrameworkAppTaskEntityRow,
  type FrameworkBindingAdmissionRow,
  type FrameworkBindingEffectRow,
  type FrameworkBindingProductRow,
  type FrameworkBindingSetupRow,
  type FrameworkBundleAssociationRow,
  type FrameworkBundleExportRow,
  type FrameworkControllerCreationRow,
  type FrameworkDiInterfaceExportRow,
  type FrameworkExpressionEntityRow,
  type FrameworkInstructionDispatchRow,
  type FrameworkInstructionSlotRow,
  type FrameworkObserverEntityRow,
  type FrameworkPackageExportRow,
  type FrameworkRenderingStructureEntityRow,
  type FrameworkResourceCarrierRow,
  type FrameworkResourceExportRow,
  type FrameworkRouterEntityRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryRecipeRow } from "./framework-recipes.js";
import type { FrameworkHydrationFlowRow } from "./framework-rendering-hydration-flow.js";
import type { FrameworkRenderConsequenceRow } from "./framework-rendering-consequences.js";
import { sourceRangeForObserverEntity } from "./framework-observer-entities.js";
import {
  bindingAdmissionSummaryRow,
  bindingProductSummaryRow,
  controllerCreationSummaryRow,
  instructionDispatchSummaryRow,
  instructionSlotSummaryRow,
  syntaxProductSummaryRow,
} from "./framework-rendering-public-rows.js";
import type { FrameworkRenderingRelationshipRow } from "./framework-rendering-relationships.js";
import {
  concreteExportTarget,
  sourceRangeForCallSiteEntry,
  sourceRangeForTarget,
} from "./framework-support.js";

/** Evidence profile for presenting a DI relationship atom in an answer. */
export class FrameworkDiRelationshipEvidenceProfile {
  private static readonly registration =
    new FrameworkDiRelationshipEvidenceProfile(EvidenceKind.DiRegistration);

  private static readonly lookup =
    new FrameworkDiRelationshipEvidenceProfile(EvidenceKind.DiLookup);

  private static readonly typeFact =
    new FrameworkDiRelationshipEvidenceProfile(EvidenceKind.TypeFact);

  private constructor(
    /** Answer-layer evidence kind for the relationship profile. */
    readonly evidenceKind: EvidenceKind,
  ) {}

  /** Classify a DI relationship relation into its answer evidence profile. */
  static forRelation(
    relation: FrameworkRelationshipRelation,
  ): FrameworkDiRelationshipEvidenceProfile {
    switch (relation) {
      case FrameworkRelationshipRelation.LooksUpKey:
      case FrameworkRelationshipRelation.ResolvesKey:
      case FrameworkRelationshipRelation.DelegatesLookup:
        return FrameworkDiRelationshipEvidenceProfile.lookup;
      case FrameworkRelationshipRelation.MaterializesKey:
      case FrameworkRelationshipRelation.ConstructsInstance:
      case FrameworkRelationshipRelation.CreatesFactory:
        return FrameworkDiRelationshipEvidenceProfile.typeFact;
      default:
        return FrameworkDiRelationshipEvidenceProfile.registration;
    }
  }

  /** Build answer evidence for one DI relationship atom. */
  evidenceFor(row: FrameworkRelationshipAtom): Evidence {
    return {
      id: row.id,
      kind: this.evidenceKind,
      role: EvidenceRole.Subject,
      confidence: evidenceConfidenceForDiRelationship(row),
      summary: row.summary,
      source: row.source,
      data: row,
    };
  }
}

/** Build answer evidence for one DI relationship atom. */
export function evidenceForDiRelationship(
  row: FrameworkRelationshipAtom,
): Evidence {
  return FrameworkDiRelationshipEvidenceProfile.forRelation(
    row.relation,
  ).evidenceFor(row);
}

export function evidenceForFlow(flow: FrameworkFlowDefinition): Evidence {
  return {
    id: `framework.flow:${flow.flow}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${flow.flow}: ${flow.summary}`,
    data: flow,
  };
}

export function evidenceForFrameworkDiscoveryRecipe(
  recipe: FrameworkDiscoveryRecipeRow,
): Evidence {
  return {
    id: recipe.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${recipe.title}: ${recipe.question}`,
    data: recipe,
  };
}

export function evidenceForAnchorResolution(
  resolution: FrameworkAnchorResolution,
): Evidence {
  const firstCandidate = resolution.candidates[0];
  return {
    id: resolution.id,
    kind:
      resolution.anchor.source.auLinkId === undefined
        ? EvidenceKind.Symbol
        : EvidenceKind.AuLinkAnchor,
    role: EvidenceRole.Subject,
    confidence:
      resolution.status === FrameworkAnchorResolutionStatus.Resolved
        ? EvidenceConfidence.Exact
        : EvidenceConfidence.Strong,
    summary: `${resolution.anchor.source.packageId}:${resolution.anchor.source.symbolName} is ${resolution.status}`,
    source: firstCandidate === undefined
      ? undefined
      : sourceRangeForFrameworkAnchorCandidate(firstCandidate),
    data: resolution,
  };
}

export function evidenceForFlowSeed(seed: FrameworkFlowSeedRow): Evidence {
  const firstCandidate = seed.candidates[0];
  return {
    id: seed.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence:
      firstCandidate === undefined
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: `${seed.anchorResolution.anchor.source.packageId}:${seed.anchorResolution.anchor.source.symbolName} -> ${seed.flow} is ${seed.status}`,
    source: firstCandidate === undefined
      ? undefined
      : sourceRangeForFrameworkAnchorCandidate(firstCandidate),
    data: seed,
  };
}

export function evidenceForCallEdge(row: FrameworkFlowCallEdgeRow): Evidence {
  const source = sourceRangeForFrameworkFlowCallEdge(row);
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flowSeed.flow}: ${row.edge.direction} call ${row.edge.from.name} -> ${row.edge.to.name}`,
    source: source ?? undefined,
    data: row,
  };
}

export function evidenceForCallTarget(
  row: FrameworkFlowCallTargetRow,
): Evidence {
  const firstEdge = row.edges[0];
  const source =
    firstEdge === undefined
      ? null
      : sourceRangeForFrameworkFlowCallEdge(firstEdge);
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flow}: ${row.direction} calls to ${
      row.targetPackageId ?? "<unknown>"
    }:${row.targetName} from ${row.anchorIds.length} anchor(s), ${
      row.edgeCount
    } edge row(s)`,
    source: source ?? undefined,
    data: row,
  };
}

export function evidenceForFrameworkFlowCallSite(row: FrameworkFlowCallSiteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flowSeed.flow}: ${row.callSite.kind} ${row.callSite.calleeName} with ${row.callSite.argumentCount} argument(s)`,
    source: sourceRangeForFrameworkFlowCallSite(row),
    data: row,
  };
}

export function evidenceForPackageExport(
  row: FrameworkPackageExportRow,
): Evidence {
  const firstTarget = row.exportEntry.targets[0];
  const source =
    firstTarget === undefined ||
    firstTarget.file === undefined ||
    firstTarget.span === undefined
      ? null
      : {
          filePath: firstTarget.file.repoPath,
          start: {
            line: firstTarget.span.startLine - 1,
            character: firstTarget.span.startCharacter - 1,
          },
          end: {
            line: firstTarget.span.endLine - 1,
            character: firstTarget.span.endCharacter - 1,
          },
        };
  return {
    id: row.id,
    kind: EvidenceKind.Symbol,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName}`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

export function evidenceForDiInterface(
  row: FrameworkDiInterfaceExportRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName} creates DI interface ${row.interfaceKey}`,
    source: sourceRangeForCallSiteEntry(row.createInterfaceCall),
    data: row,
  };
}

export function evidenceForResourceCarrier(
  row: FrameworkResourceCarrierRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.sourceExportName} carries ${
      row.resourceKind
    }${row.resourceName === null ? "" : ` '${row.resourceName}'`} via ${
      row.carrierKind
    }`,
    source: row.source,
    data: row,
  };
}

export function evidenceForResourceExport(
  row: FrameworkResourceExportRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName} carries ${
      row.resourceKind
    }${row.resourceName === null ? "" : ` '${row.resourceName}'`} via ${
      row.carrierKind
    }`,
    source: row.source,
    data: row,
  };
}

export function evidenceForBundle(row: FrameworkBundleExportRow): Evidence {
  const firstAssociation = row.associations[0];
  const firstTarget = concreteExportTarget(row.exportEntry.targets);
  const source =
    sourceRangeForTarget(firstTarget) ?? firstAssociation?.source ?? null;
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} is a ${row.bundleKind} bundle with ${row.associations.length} evaluated registration association(s) from ${row.effectCount} effect(s)`,
    source: source ?? undefined,
    data: row,
  };
}

export function evidenceForBundleAssociation(
  row: FrameworkBundleAssociationRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.associationKind ===
      FrameworkBundleAssociationKind.ResourceRegistration
        ? EvidenceKind.ResourceDefinition
        : EvidenceKind.DiRegistration,
    role: EvidenceRole.Support,
    confidence:
      row.associationKind ===
      FrameworkBundleAssociationKind.UnknownRegistrationArgument
        ? EvidenceConfidence.Unknown
        : EvidenceConfidence.Strong,
    summary: `${row.exportName} ${row.associationKind}${
      row.targetName === null ? "" : ` ${row.targetName}`
    }`,
    source: row.source,
    data: row,
  };
}

export function evidenceForSyntaxProduct(
  row: FrameworkSyntaxProductRow,
): Evidence {
  const data = syntaxProductSummaryRow(row);
  const product =
    row.instructionName ??
    row.bindingName ??
    row.instructionTarget ??
    row.expression.text;
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.producerName} ${row.productKind} ${product}`,
    source: row.source,
    data,
  };
}

export function evidenceForInstructionSlot(
  row: FrameworkInstructionSlotRow,
): Evidence {
  const data = instructionSlotSummaryRow(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${data.summary}`,
    source: row.source,
    data,
  };
}

export function evidenceForInstructionDispatch(
  row: FrameworkInstructionDispatchRow,
): Evidence {
  const data = instructionDispatchSummaryRow(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${data.summary}`,
    source: row.source,
    data,
  };
}

export function evidenceForControllerCreation(
  row: FrameworkControllerCreationRow,
): Evidence {
  const data = controllerCreationSummaryRow(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.rendererName} creates ${row.resourceKind} controller ${row.childControllerExpression}`,
    source: row.source,
    data,
  };
}

export function evidenceForHydrationFlow(
  row: FrameworkHydrationFlowRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.ownerName}.${row.methodName} ${row.operation} ${row.targetName ?? row.targetKind}: ${row.summary}`,
    source: row.source,
    data: row,
  };
}

export function evidenceForBindingProduct(
  row: FrameworkBindingProductRow,
): Evidence {
  const data = bindingProductSummaryRow(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${data.summary}`,
    source: row.source,
    data,
  };
}

export function evidenceForBindingAdmission(
  row: FrameworkBindingAdmissionRow,
): Evidence {
  const data = bindingAdmissionSummaryRow(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${data.summary}`,
    source: row.source,
    data,
  };
}

export function evidenceForBindingEffect(
  row: FrameworkBindingEffectRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.bindingName}.${row.methodName} exposes ${row.effectKind} ${row.effectName}`,
    source: row.source,
    data: row,
  };
}

export function evidenceForBindingSetup(
  row: FrameworkBindingSetupRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.producerName} calls ${row.bindingName}.${row.setupMethodName} via ${row.setupKind}`,
    source: row.source,
    data: row,
  };
}

export function evidenceForRenderingTypeFact(
  row: FrameworkRenderingRelationshipRow | FrameworkRenderConsequenceRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

export function evidenceForObserverEntity(
  row: FrameworkObserverEntityRow,
): Evidence {
  const source = sourceRangeForObserverEntity(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${
      row.exportEntry.exportName
    } observer roles [${row.observerKinds.join(
      ", ",
    )}] capabilities [${row.observerCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

export function evidenceForAppTaskEntity(
  row: FrameworkAppTaskEntityRow,
): Evidence {
  const source = sourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
  );
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${
      row.exportEntry.exportName
    } AppTask roles [${row.appTaskKinds.join(
      ", ",
    )}] capabilities [${row.appTaskCapabilities.join(", ")}]`,
    source: source ?? undefined,
    data: row,
  };
}

export function evidenceForRouterEntity(
  row: FrameworkRouterEntityRow,
): Evidence {
  const source = sourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
  );
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${
      row.exportEntry.exportName
    } router roles [${row.routerKinds.join(
      ", ",
    )}] capabilities [${row.routerCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

export function evidenceForExpressionEntity(
  row: FrameworkExpressionEntityRow,
): Evidence {
  const source = sourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
  );
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${
      row.exportEntry.exportName
    } expression roles [${row.expressionKinds.join(
      ", ",
    )}] capabilities [${row.expressionCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

export function evidenceForRenderingStructure(
  row: FrameworkRenderingStructureEntityRow,
): Evidence {
  const source = sourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
  );
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${
      row.exportEntry.exportName
    } rendering roles [${row.renderingStructureKinds.join(
      ", ",
    )}] capabilities [${row.renderingCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

export function evidenceForQuestion(question: string, index: number): Evidence {
  return {
    id: `framework.question:${index}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: question,
  };
}

function evidenceConfidenceForDiRelationship(
  row: FrameworkRelationshipAtom,
): EvidenceConfidence {
  switch (row.closure) {
    case "exact":
      return EvidenceConfidence.Exact;
    case "modeled":
      return EvidenceConfidence.Strong;
    case "partial":
    case "open":
      return EvidenceConfidence.Unknown;
  }
  return EvidenceConfidence.Unknown;
}
