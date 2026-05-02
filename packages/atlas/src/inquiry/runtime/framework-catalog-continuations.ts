import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind } from "../locus.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import {
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import {
  FrameworkBindingEffectKind,
  type FrameworkAppTaskEntityRow,
  type FrameworkBundleExportRow,
  type FrameworkDiInterfaceExportRow,
  type FrameworkExpressionEntityRow,
  type FrameworkObserverEntityRow,
  type FrameworkPackageExportRow,
  type FrameworkRenderingStructureEntityRow,
  type FrameworkResourceCarrierRow,
  type FrameworkResourceExportRow,
  type FrameworkRouterEntityRow,
} from "./framework-entities.js";
import {
  evidenceForAppTaskEntity,
  evidenceForBundle,
  evidenceForBundleAssociation,
  evidenceForDiInterface,
  evidenceForExpressionEntity,
  evidenceForObserverEntity,
  evidenceForPackageExport,
  evidenceForRenderingStructure,
  evidenceForResourceCarrier,
  evidenceForResourceExport,
  evidenceForRouterEntity,
} from "./framework-evidence.js";
import {
  concreteExportTarget,
  route,
  sourceRangeForCallSiteEntry,
  sourceRangeForTarget,
} from "./framework-support.js";
export function packageExportContinuations(
  inquiry: Inquiry,
  packageExports: readonly FrameworkPackageExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:package-exports:next-page",
        "Continue Aurelia framework package export rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of packageExports.slice(0, 3).entries()) {
    const firstTarget = row.exportEntry.targets[0];
    if (
      firstTarget === undefined ||
      firstTarget.file === undefined ||
      firstTarget.span === undefined
    ) {
      continue;
    }
    const source = {
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
    const evidence = evidenceForPackageExport(row);
    continuations.push({
      id: `framework.discovery:package-exports:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this Aurelia framework package export.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptProgram],
        "Source declaration behind an Aurelia framework package export.",
      ),
    });
    continuations.push({
      id: `framework.discovery:package-exports:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for this Aurelia framework package export.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for an Aurelia framework package export.",
      ),
    });
    const effectTarget =
      row.exportEntry.targets.find(
        (target) =>
          target.declarationKind !== "interface" &&
          target.declarationKind !== "type-alias",
      ) ?? firstTarget;
    const effectSource =
      effectTarget.file === undefined || effectTarget.span === undefined
        ? source
        : {
            filePath: effectTarget.file.repoPath,
            start: {
              line: effectTarget.span.startLine - 1,
              character: effectTarget.span.startCharacter - 1,
            },
            end: {
              line: effectTarget.span.endLine - 1,
              character: effectTarget.span.endCharacter - 1,
            },
          };
    if (row.exportEntry.memberNames.includes("register")) {
      continuations.push({
        id: `framework.discovery:package-exports:effects:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Trace static invocation effects inside this export's register member.",
        inquiry: {
          lens: LensId.FrameworkEvaluator,
          locus: { kind: LocusKind.SourceRange, range: effectSource },
          projection: "effects",
          filters: {
            memberName: "register",
          },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.EffectsOf,
          [
            BasisKind.StaticEvaluator,
            BasisKind.TypeScriptChecker,
            BasisKind.SourceText,
          ],
          "Static invocation effects for a framework registry export.",
        ),
      });
    }
  }
  return continuations;
}

export function observerEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:observers:next-page",
        "Continue Aurelia framework observer-system export rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:package-exports",
      "package-exports",
      "Return to raw package exports behind observer-system rows.",
    ),
  );
  continuations.push({
    id: "framework.discovery:observers:binding-effects",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale:
      "Inspect binding observer/accessor lookup rows that consume ObserverLocator-style APIs.",
    inquiry: {
      lens: LensId.FrameworkDiscovery,
      locus: inquiry.locus,
      projection: "binding-effects",
      filters: { effectKind: FrameworkBindingEffectKind.ObserverLookup },
      budget: inquiry.budget,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      "Binding observer lookup rows connected to observer-system entities.",
    ),
  });
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForTarget(
      concreteExportTarget(row.exportEntry.targets),
    );
    const evidence = evidenceForObserverEntity(row);
    if (source !== null) {
      continuations.push({
        id: `framework.discovery:observers:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect source behind this observer-system export.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.SourceFor,
          [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          "Source behind an observer-system export.",
        ),
      });
      continuations.push({
        id: `framework.discovery:observers:type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for this observer-system export.",
        inquiry: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "facts",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.TypeFactsFor,
          [BasisKind.TypeScriptChecker],
          "Type facts for an observer-system export.",
        ),
      });
    }
    for (const [
      implementationIndex,
      implementationName,
    ] of row.defaultImplementationNames.slice(0, 2).entries()) {
      continuations.push({
        id: `framework.discovery:observers:implementation:${index}:${implementationIndex}`,
        kind: ContinuationKind.Narrow,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect the default implementation named by this observer DI interface.",
        inquiry: {
          lens: LensId.FrameworkDiscovery,
          locus: inquiry.locus,
          projection: "observers",
          filters: {
            exportName: implementationName,
          },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.ProjectionOf,
          [BasisKind.TypeScriptChecker],
          "Default implementation named by an observer DI interface.",
        ),
      });
    }
  }
  return continuations;
}

export function appTaskEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAppTaskEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "app-tasks",
    nextPageId: "framework.discovery:app-tasks:next-page",
    nextPageRationale:
      "Continue Aurelia framework AppTask/lifecycle task rows.",
    sourceIdPrefix: "framework.discovery:app-tasks",
    sourceRationale:
      "Inspect source behind this AppTask/lifecycle task export.",
    typeRationale:
      "Inspect TypeChecker facts for this AppTask/lifecycle task export.",
    sourceSummary: "Source behind an AppTask/lifecycle task export.",
    typeSummary: "Type facts for an AppTask/lifecycle task export.",
    evidenceFor: evidenceForAppTaskEntity,
  });
}

export function routerEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRouterEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "router-entities",
    nextPageId: "framework.discovery:router-entities:next-page",
    nextPageRationale: "Continue Aurelia framework router entity rows.",
    sourceIdPrefix: "framework.discovery:router-entities",
    sourceRationale: "Inspect source behind this router export.",
    typeRationale: "Inspect TypeChecker facts for this router export.",
    sourceSummary: "Source behind a router export.",
    typeSummary: "Type facts for a router export.",
    evidenceFor: evidenceForRouterEntity,
  });
}

export function expressionEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkExpressionEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "expression-entities",
    nextPageId: "framework.discovery:expression-entities:next-page",
    nextPageRationale:
      "Continue Aurelia framework expression/parser entity rows.",
    sourceIdPrefix: "framework.discovery:expression-entities",
    sourceRationale: "Inspect source behind this expression/parser export.",
    typeRationale:
      "Inspect TypeChecker facts for this expression/parser export.",
    sourceSummary: "Source behind an expression/parser export.",
    typeSummary: "Type facts for an expression/parser export.",
    evidenceFor: evidenceForExpressionEntity,
  });
}

export function renderingStructureContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRenderingStructureEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "rendering-structures",
    nextPageId: "framework.discovery:rendering-structures:next-page",
    nextPageRationale:
      "Continue Aurelia framework rendering/lifecycle structural rows.",
    sourceIdPrefix: "framework.discovery:rendering-structures",
    sourceRationale:
      "Inspect source behind this rendering/lifecycle structural export.",
    typeRationale:
      "Inspect TypeChecker facts for this rendering/lifecycle structural export.",
    sourceSummary: "Source behind a rendering/lifecycle structural export.",
    typeSummary: "Type facts for a rendering/lifecycle structural export.",
    evidenceFor: evidenceForRenderingStructure,
  });
}

export function catalogEntityContinuations<
  TRow extends FrameworkPackageExportRow,
>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  options: {
    readonly projection: string;
    readonly nextPageId: string;
    readonly nextPageRationale: string;
    readonly sourceIdPrefix: string;
    readonly sourceRationale: string;
    readonly typeRationale: string;
    readonly sourceSummary: string;
    readonly typeSummary: string;
    readonly evidenceFor: (row: TRow) => Evidence;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        options.nextPageId,
        options.nextPageRationale,
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:package-exports",
      "package-exports",
      "Return to raw package exports behind these catalog rows.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForTarget(
      concreteExportTarget(row.exportEntry.targets),
    );
    if (source === null) {
      continue;
    }
    const evidence = options.evidenceFor(row);
    continuations.push({
      id: `${options.sourceIdPrefix}:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: options.sourceRationale,
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        options.sourceSummary,
      ),
    });
    continuations.push({
      id: `${options.sourceIdPrefix}:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: options.typeRationale,
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        options.typeSummary,
      ),
    });
  }
  return continuations;
}

export function diInterfaceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiInterfaceExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:di-interfaces:next-page",
        "Continue Aurelia framework DI interface export rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:package-exports",
      "package-exports",
      "Return to package exports behind these DI interface rows.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForCallSiteEntry(row.createInterfaceCall);
    const evidence = evidenceForDiInterface(row);
    continuations.push({
      id: `framework.discovery:di-interfaces:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this DI interface creation call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a DI interface creation call.",
      ),
    });
    continuations.push({
      id: `framework.discovery:di-interfaces:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker call-site facts for this DI interface creation call.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "call-sites",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Flow,
        NavigationRelation.CallSitesOf,
        [BasisKind.TypeScriptChecker, BasisKind.SourceText],
        "Exact call-site facts behind a DI interface creation call.",
      ),
    });
  }
  return continuations;
}

export function resourceCarrierContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceCarrierRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:resource-carriers:next-page",
        "Continue Aurelia framework resource carrier rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:resources",
      "resources",
      "Inspect which resource carriers are public package exports.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForResourceCarrier(row);
    continuations.push({
      id: `framework.discovery:resource-carriers:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this framework resource carrier.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a framework resource carrier.",
      ),
    });
    continuations.push({
      id: `framework.discovery:resource-carriers:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for this framework resource carrier.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a framework resource carrier.",
      ),
    });
    continuations.push({
      id: `framework.discovery:resource-carriers:instantiation:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Follow this resource carrier toward runtime/compiler/evaluator materialization sites.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkMaterialization,
        projection: "resource-instantiations",
        filters: {
          packageId: row.packageId,
          resourceName: row.targetName ?? row.sourceExportName,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker],
        "Resource carrier to materialization sites.",
      ),
    });
  }
  return continuations;
}

export function resourceExportContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:resources:next-page",
        "Continue Aurelia framework resource export rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:package-exports",
      "package-exports",
      "Return to package exports behind these resource rows.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForResourceExport(row);
    continuations.push({
      id: `framework.discovery:resources:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this framework resource carrier.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a framework resource carrier.",
      ),
    });
    continuations.push({
      id: `framework.discovery:resources:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for this framework resource carrier.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a framework resource carrier.",
      ),
    });
    continuations.push({
      id: `framework.discovery:resources:instantiation:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Follow this resource export toward runtime/compiler/evaluator materialization sites.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkMaterialization,
        projection: "resource-instantiations",
        filters: {
          packageId: row.packageId,
          resourceName: row.targetName ?? row.carrier.sourceExportName,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker],
        "Resource export to materialization sites.",
      ),
    });
  }
  return continuations;
}

export function bundleContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBundleExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:bundles:next-page",
        "Continue Aurelia framework bundle rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:registry-exports",
      "registry-exports",
      "Return to structural registry/configuration exports.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:resource-carriers",
      "resource-carriers",
      "Inspect source-level resources used by bundle associations.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBundle(row);
    const firstTarget = concreteExportTarget(row.exportEntry.targets);
    const source = sourceRangeForTarget(firstTarget);
    if (source !== null) {
      continuations.push({
        id: `framework.discovery:bundles:effects:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Trace raw evaluator effects behind this bundle's register member.",
        inquiry: {
          lens: LensId.FrameworkEvaluator,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "effects",
          filters: { memberName: "register" },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.EffectsOf,
          [
            BasisKind.StaticEvaluator,
            BasisKind.TypeScriptChecker,
            BasisKind.SourceText,
          ],
          "Raw evaluator effects behind a framework bundle association row.",
        ),
      });
    }
    const firstAssociation = row.associations[0];
    if (firstAssociation !== undefined) {
      continuations.push({
        id: `framework.discovery:bundles:association-source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect source behind the first evaluated registration association.",
        inquiry: {
          lens: LensId.TsSource,
          locus: {
            kind: LocusKind.SourceRange,
            range: firstAssociation.source,
          },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidenceForBundleAssociation(firstAssociation)],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.SourceFor,
          [BasisKind.SourceText, BasisKind.StaticEvaluator],
          "Source behind an evaluated bundle association.",
        ),
      });
    }
  }
  return continuations;
}
