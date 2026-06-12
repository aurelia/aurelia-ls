import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
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
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:package-exports",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        "Inspect source behind this Aurelia framework package export.",
        "Source declaration behind an Aurelia framework package export.",
        { basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram] },
      ),
    );
    continuations.push(
      builder.typeFacts(
        "type",
        source,
        "Inspect TypeChecker facts for this Aurelia framework package export.",
        "Type facts for an Aurelia framework package export.",
      ),
    );
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
      continuations.push(
        builder.effects(
          "effects",
          effectSource,
          "Trace static invocation effects inside this export's register member.",
          "Static invocation effects for a framework registry export.",
          { filters: { memberName: "register" } },
        ),
      );
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
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:observers:binding-effects",
      "binding-effects",
      "Inspect binding observer/accessor lookup rows that consume ObserverLocator-style APIs.",
      {
        lens: LensId.FrameworkRendering,
        filters: { effectKind: FrameworkBindingEffectKind.ObserverLookup },
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        priority: ContinuationPriority.Secondary,
        summary:
          "Binding observer lookup rows connected to observer-system entities.",
      },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForTarget(
      concreteExportTarget(row.exportEntry.targets),
    );
    const evidence = evidenceForObserverEntity(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:observers",
      index,
      evidence,
    );
    if (source !== null) {
      continuations.push(
        builder.source(
          "source",
          source,
          "Inspect source behind this observer-system export.",
          "Source behind an observer-system export.",
        ),
        builder.typeFacts(
          "type",
          source,
          "Inspect TypeChecker facts for this observer-system export.",
          "Type facts for an observer-system export.",
        ),
      );
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
          NavigationRelation.RefinementOf,
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
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      options.sourceIdPrefix,
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        options.sourceRationale,
        options.sourceSummary,
      ),
      builder.typeFacts(
        "type",
        source,
        options.typeRationale,
        options.typeSummary,
      ),
    );
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
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:di-interfaces",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        "Inspect source behind this DI interface creation call.",
        "Source behind a DI interface creation call.",
      ),
      builder.callSites(
        "type",
        source,
        "Inspect TypeChecker call-site facts for this DI interface creation call.",
        "Exact call-site facts behind a DI interface creation call.",
      ),
    );
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
    const semanticRoute = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.discovery:resource-carriers",
      index,
      evidence,
    );
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:resource-carriers",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this framework resource carrier.",
        "Source behind a framework resource carrier.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this framework resource carrier.",
        "Type facts for a framework resource carrier.",
      ),
    );
    continuations.push(
      semanticRoute.continuation(
        FrameworkSemanticRoutes.ResourceToMaterializationResourceInstantiations,
        "instantiation",
        {
          filters: {
            packageId: row.packageId,
            resourceName: row.targetName ?? row.sourceExportName,
          },
          rationale:
            "Follow this resource carrier toward runtime/compiler/evaluator materialization sites.",
          routeSummary: "Resource carrier to materialization sites.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
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
    const semanticRoute = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.discovery:resources",
      index,
      evidence,
    );
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:resources",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this framework resource carrier.",
        "Source behind a framework resource carrier.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this framework resource carrier.",
        "Type facts for a framework resource carrier.",
      ),
    );
    continuations.push(
      semanticRoute.continuation(
        FrameworkSemanticRoutes.ResourceToMaterializationResourceInstantiations,
        "instantiation",
        {
          filters: {
            packageId: row.packageId,
            resourceName: row.targetName ?? row.carrier.sourceExportName,
          },
          rationale:
            "Follow this resource export toward runtime/compiler/evaluator materialization sites.",
          routeSummary: "Resource export to materialization sites.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
  return continuations;
}

export function frameworkCatalogBundleContinuations(
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
    continuations.push({
      id: `framework.discovery:bundles:${index}:di-world`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        "Spend this exact configuration, registry, or catalog export through the framework DI-world projection.",
      inquiry: {
        lens: LensId.FrameworkDi,
        locus: inquiry.locus,
        projection: "world",
        filters: {
          configurationPackageId: row.packageId,
          configurationExportName: row.exportEntry.exportName,
        },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
        "Bundle export to DI-world spending.",
      ),
    });
    if (source !== null) {
      const builder = new FrameworkRowContinuationBuilder(
        inquiry,
        "framework.discovery:bundles",
        index,
        evidence,
      );
      continuations.push(
        builder.effects(
          "effects",
          source,
          "Trace raw evaluator effects behind this bundle's register member.",
          "Raw evaluator effects behind a framework bundle association row.",
          { filters: { memberName: "register" } },
        ),
      );
    }
    const firstAssociation = row.associations[0];
    if (firstAssociation !== undefined) {
      const builder = new FrameworkRowContinuationBuilder(
        inquiry,
        "framework.discovery:bundles",
        index,
        evidenceForBundleAssociation(firstAssociation),
      );
      continuations.push(
        builder.source(
          "association-source",
          firstAssociation.source,
          "Inspect source behind the first evaluated registration association.",
          "Source behind an evaluated bundle association.",
          {
            priority: ContinuationPriority.Secondary,
            basis: [BasisKind.SourceText, BasisKind.StaticEvaluator],
          },
        ),
      );
    }
  }
  return continuations;
}
