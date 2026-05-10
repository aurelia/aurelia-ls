import { readFrameworkDiIndex } from "../../framework/di-index.js";
import {
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { BasisKind } from "../basis.js";
import { LensId } from "../lens.js";
import { readFrameworkCompilerRelationships } from "./framework-compiler-products.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import { readFrameworkExpressionRelationships } from "./framework-expression-relationships.js";
import { readFrameworkLifecycleRelationships } from "./framework-lifecycle-lenses.js";
import { readFrameworkMaterializationIndex } from "./framework-materialization-lenses.js";
import {
  readFrameworkObservationRelationships,
  type FrameworkObservationFilters,
} from "./framework-observation-lenses.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipFilters,
} from "./framework-rendering-relationships.js";
import { readFrameworkRouterAnalysis } from "./framework-router-analysis.js";
import { routerRelationshipsFromRows } from "./framework-router-relationships.js";
import { readFrameworkStructuralRelationships } from "./framework-structural-relationships.js";
import type {
  FrameworkEmulationFilters,
  FrameworkEmulationLayer,
  FrameworkEmulationMode,
  FrameworkEmulationObligationKind,
  FrameworkEmulationObligationRow,
} from "./framework-emulation-view.js";

/** Relationship-derived framework obligations that attach auLink mirrors to emulation work. */
export function readFrameworkRelationshipEmulationObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return [
    ...diRelationshipObligations(sourceProject, filters),
    ...materializationRelationshipObligations(sourceProject, filters),
    ...expressionObligations(sourceProject, filters),
    ...routerObligations(sourceProject, filters),
    ...structuralEntityObligations(sourceProject, filters),
    ...renderingRelationshipObligations(sourceProject, filters),
    ...observationRelationshipObligations(sourceProject, filters),
    ...compilerRelationshipObligations(sourceProject, filters),
    ...lifecycleRelationshipObligations(sourceProject, filters),
  ];
}

function diRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkDiIndex(sourceProject).relationships
    .filter((row) => relationshipRowMatches(row, filters))
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:di-relationship:${row.id}`,
      layer: "di-world",
      mode: "ecmascript-evaluation",
      obligationKind: obligationForDiRelation(row.relation),
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.to.kind,
      packageId: row.to.packageId ?? row.packageId,
      packageName: row.to.packageName ?? row.packageName,
      closure: closureForRelationship(row.closure),
      sourceLens: LensId.FrameworkDi,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Emulate DI relationship ${row.relation} from ${row.from.name} to ${row.to.name}.`,
    }));
}

function materializationRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkMaterializationIndex(sourceProject, filters).relationships
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:materialization-relationship:${row.id}`,
      layer: "di-world",
      mode: "ecmascript-evaluation",
      obligationKind: obligationForDiRelation(row.relation),
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.to.kind,
      packageId: row.to.packageId ?? row.packageId,
      packageName: row.to.packageName ?? row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkMaterialization,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Emulate materialization relationship ${row.relation} from ${row.from.name} to ${row.to.name}.`,
    }));
}

function expressionObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkExpressionRelationships(sourceProject, filters)
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:expression:${row.id}`,
      layer: "expression-language",
      mode: "semantic-runtime-emulator",
      obligationKind: "model-expression",
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.to.kind,
      packageId: row.packageId,
      packageName: row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkDiscovery,
      sourceProjection: "expression-entities",
      detailFilters: { targetName: row.to.name },
      basis: [BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Model expression/parser entity ${row.to.name} as semantic-runtime expression language surface.`,
    }));
}

function routerObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  const analysis = readFrameworkRouterAnalysis(sourceProject);
  return routerRelationshipsFromRows(analysis.flows, analysis.routeRecognizerMechanics, filters)
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:router:${row.id}`,
      layer: "router-runtime",
      mode: "semantic-runtime-emulator",
      obligationKind: "model-router",
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.to.kind,
      packageId: row.packageId,
      packageName: row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkRouter,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Model router relationship ${row.relation} for ${row.to.name} during ${row.flowStage}.`,
    }));
}

function structuralEntityObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkStructuralRelationships(sourceProject, filters)
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:structural-entity:${row.id}`,
      layer: layerForStructuralRelation(row.relation),
      mode: modeForStructuralRelation(row.relation),
      obligationKind: obligationForStructuralRelation(row.relation),
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.relation,
      packageId: row.packageId,
      packageName: row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkDiscovery,
      sourceProjection: "structural-relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Model structural framework entity ${row.to.name} from relationship ${row.relation}.`,
    }));
}

function renderingRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkRenderingRelationships(
    sourceProject,
    filters as FrameworkRenderingRelationshipFilters,
  ).map((row): FrameworkEmulationObligationRow => ({
    id: `framework-emulation:rendering-relationship:${row.id}`,
    layer: layerForRenderingRelation(row.relation),
    mode: modeForRenderingRelation(row.relation),
    obligationKind: obligationForRenderingRelation(row.relation),
    ownerName: row.from.name,
    targetName: row.to.name,
    targetKind: row.to.kind,
    packageId: row.from.packageId ?? row.to.packageId ?? row.packageId,
    packageName: row.from.packageName ?? row.to.packageName ?? row.packageName,
    closure: closureForRenderingRelation(row.relation),
    sourceLens: LensId.FrameworkRendering,
    sourceProjection: "relationships",
    detailFilters: {
      relation: row.relation,
      targetName: row.to.name,
    },
    basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
    source: row.source,
    sourceRowId: row.id,
    summary: `Model rendering relationship ${row.relation} from ${row.from.name} to ${row.to.name}.`,
  }));
}

function observationRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  const obligationRelations = new Set<FrameworkRelationshipRelation>([
    FrameworkRelationshipRelation.DefinesObserver,
    FrameworkRelationshipRelation.LooksUpObserver,
    FrameworkRelationshipRelation.StoresWatchDefinition,
    FrameworkRelationshipRelation.ReadsWatchDefinition,
  ]);
  return readFrameworkObservationRelationships(
    sourceProject,
    filters as FrameworkObservationFilters,
  )
    .filter((row) => obligationRelations.has(row.relation))
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:observation-relationship:${row.id}`,
      layer: "typechecker-reactivity",
      mode: "typescript-handoff",
      obligationKind: "model-observation",
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.to.kind,
      packageId: row.packageId,
      packageName: row.packageName,
      closure: "handoff",
      sourceLens: LensId.FrameworkObservation,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Model observation relationship ${row.relation} for ${row.to.name}.`,
    }));
}

function compilerRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkCompilerRelationships(sourceProject, filters as FrameworkCompilerFilters)
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:compiler-product:${row.id}`,
      layer: layerForCompilerRelation(row.relation),
      mode: "semantic-runtime-emulator",
      obligationKind: obligationForCompilerRelation(row.relation),
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.relation,
      packageId: row.to.packageId ?? row.packageId,
      packageName: row.to.packageName ?? row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkCompiler,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Emulate compiler product relationship ${row.from.name} -> ${row.to.name}.`,
    }));
}

function lifecycleRelationshipObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkLifecycleRelationships(sourceProject, filters)
    .map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:lifecycle-relationship:${row.id}`,
      layer: layerForLifecycleRelation(row.relation),
      mode: modeForLifecycleRelation(row.relation),
      obligationKind: obligationForLifecycleRelation(row.relation),
      ownerName: row.from.name,
      targetName: row.to.name,
      targetKind: row.relation,
      packageId: row.to.packageId ?? row.packageId,
      packageName: row.to.packageName ?? row.packageName,
      closure: "modeled",
      sourceLens: LensId.FrameworkLifecycle,
      sourceProjection: "relationships",
      detailFilters: {
        relation: row.relation,
        targetName: row.to.name,
      },
      basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Model lifecycle relationship ${row.relation} from ${row.from.name} to ${row.to.name}.`,
    }));
}

function layerForStructuralRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationLayer {
  switch (relation) {
    case FrameworkRelationshipRelation.DefinesObserver:
      return "typechecker-reactivity";
    case FrameworkRelationshipRelation.DefinesRouterEntity:
      return "router-runtime";
    case FrameworkRelationshipRelation.DefinesRenderingStructure:
    default:
      return "rendering-runtime";
  }
}

function modeForStructuralRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationMode {
  return relation === FrameworkRelationshipRelation.DefinesObserver
    ? "typescript-handoff"
    : "semantic-runtime-emulator";
}

function obligationForStructuralRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationKind {
  switch (relation) {
    case FrameworkRelationshipRelation.DefinesObserver:
      return "model-observation";
    case FrameworkRelationshipRelation.DefinesRouterEntity:
      return "model-router";
    case FrameworkRelationshipRelation.DefinesRenderingStructure:
    default:
      return "model-rendering";
  }
}

function layerForRenderingRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationLayer {
  switch (relation) {
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
    case FrameworkRelationshipRelation.PerformsBindingEffect:
    case FrameworkRelationshipRelation.LooksUpObserver:
      return "typechecker-reactivity";
    default:
      return "rendering-runtime";
  }
}

function modeForRenderingRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationMode {
  switch (relation) {
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
    case FrameworkRelationshipRelation.PerformsBindingEffect:
    case FrameworkRelationshipRelation.LooksUpObserver:
      return "typescript-handoff";
    default:
      return "semantic-runtime-emulator";
  }
}

function obligationForRenderingRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationKind {
  switch (relation) {
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      return "model-binding";
    case FrameworkRelationshipRelation.LooksUpObserver:
      return "model-observation";
    case FrameworkRelationshipRelation.DefinesRenderingStructure:
    case FrameworkRelationshipRelation.DispatchesInstruction:
    case FrameworkRelationshipRelation.CreatesController:
    case FrameworkRelationshipRelation.AdmitsChildController:
    default:
      return "model-rendering";
  }
}

function closureForRenderingRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationRow["closure"] {
  switch (relation) {
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
    case FrameworkRelationshipRelation.PerformsBindingEffect:
    case FrameworkRelationshipRelation.LooksUpObserver:
      return "handoff";
    default:
      return "modeled";
  }
}

function obligationForDiRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationKind {
  switch (relation) {
    case FrameworkRelationshipRelation.InvokesRegistry:
    case FrameworkRelationshipRelation.CreatesRegistration:
    case FrameworkRelationshipRelation.RegistersProvider:
      return "evaluate-registration";
    case FrameworkRelationshipRelation.LooksUpKey:
    case FrameworkRelationshipRelation.ResolvesKey:
    case FrameworkRelationshipRelation.DependsOnKey:
    case FrameworkRelationshipRelation.DelegatesLookup:
      return "resolve-dependency";
    default:
      return "materialize-di-key";
  }
}

function layerForCompilerRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationLayer {
  switch (relation) {
    case FrameworkRelationshipRelation.ParsesExpression:
      return "expression-language";
    case FrameworkRelationshipRelation.RegistersResource:
      return "resource-catalog";
    default:
      return "jit-compilation";
  }
}

function obligationForCompilerRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationKind {
  switch (relation) {
    case FrameworkRelationshipRelation.ParsesExpression:
      return "model-expression";
    case FrameworkRelationshipRelation.RegistersResource:
      return "admit-built-in-resource";
    case FrameworkRelationshipRelation.LooksUpResource:
    case FrameworkRelationshipRelation.CollectsDependency:
      return "classify-template-attribute";
    default:
      return "compile-template";
  }
}

function layerForLifecycleRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationLayer {
  switch (relation) {
    case FrameworkRelationshipRelation.LooksUpKey:
    case FrameworkRelationshipRelation.ResolvesKey:
      return "application-world";
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      return "typechecker-reactivity";
    default:
      return "resolved-hydration";
  }
}

function modeForLifecycleRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationMode {
  switch (relation) {
    case FrameworkRelationshipRelation.LooksUpKey:
    case FrameworkRelationshipRelation.ResolvesKey:
      return "ecmascript-evaluation";
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      return "typescript-handoff";
    default:
      return "semantic-runtime-emulator";
  }
}

function obligationForLifecycleRelation(
  relation: FrameworkRelationshipRelation,
): FrameworkEmulationObligationKind {
  switch (relation) {
    case FrameworkRelationshipRelation.LooksUpKey:
    case FrameworkRelationshipRelation.ResolvesKey:
      return "resolve-dependency";
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      return "model-binding";
    default:
      return "hydrate-runtime";
  }
}

function closureForRelationship(
  closure: FrameworkRelationshipAtom["closure"],
): FrameworkEmulationObligationRow["closure"] {
  switch (closure) {
    case "exact":
    case "modeled":
    case "partial":
    case "open":
      return closure;
    default:
      return "modeled";
  }
}

function relationshipRowMatches(
  row: {
    readonly packageId: string;
    readonly from: { readonly name: string };
    readonly to: { readonly name: string };
    readonly summary: string;
  },
  filters: FrameworkEmulationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}
