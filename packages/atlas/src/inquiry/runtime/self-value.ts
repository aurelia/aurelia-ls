import { LensFamily, LensId, LensStage } from "../lens.js";
import type {
  SourceProject,
  SourceProjectSummary,
} from "../../source/index.js";
import type {
  AtlasSelfAnalysis,
  AtlasSelfAnalysisPhaseProfileRow,
  AtlasSelfAxisPressureRow,
  AtlasSelfClassSurfaceRow,
  AtlasSelfContractStringRow,
  AtlasSelfContinuationRow,
  AtlasSelfEnumMappingRow,
  AtlasSelfEnumReferenceRow,
  AtlasSelfEnumRow,
  AtlasSelfEnumValueOccurrenceRow,
  AtlasSelfEnumValueSpaceRow,
  AtlasSelfFunctionControlFlowShapeGroupRow,
  AtlasSelfFunctionShapeGroupRow,
  AtlasSelfFunctionSurfaceRow,
  AtlasSelfFunctionWrapperRow,
  AtlasSelfModuleDependencyRow,
  AtlasSelfProjectionBranchRow,
  AtlasSelfRelationshipSurfaceRow,
  AtlasSelfRowSurfaceRow,
  AtlasSelfSemanticRouteRow,
  AtlasSelfSourceFileSurfaceRow,
  AtlasSelfStringLiteralRow,
  AtlasSelfSubstrateSurfaceRow,
  AtlasSelfVariableSurfaceRow,
} from "./self-analysis.js";
import type { SelfContractRow } from "./self-contracts.js";
import type { AtlasSelfRecipeRow } from "./self-recipes.js";
import type { InquiryWorld } from "./world.js";

/** Summary returned by the atlas.self runtime lens. */
export interface SelfValue {
  /** Lens count grouped by implementation stage. */
  readonly lensesByStage: Readonly<Record<LensStage, number>>;
  /** Lens count grouped by broad family. */
  readonly lensesByFamily: Readonly<Record<LensFamily, number>>;
  /** Number of substrate contracts in the world. */
  readonly substrateContracts: number;
  /** Number of vocabulary definitions in the world. */
  readonly vocabularyDefinitions: number;
  /** Number of declared navigation route specs in the world. */
  readonly navigationRoutes: number;
  /** Number of contracted lenses without runtime implementations. */
  readonly unimplementedContractedLenses: number;
  /** Compact source project rollup held by the runtime substrate context. */
  readonly sourceProjectRollup: SourceProjectRollup;
  /** Full hot source project summary; omitted unless the caller asks for full source project details. */
  readonly sourceProject?: SourceProjectSummary;
  /** Runtime-implemented lens ids observed by the engine. */
  readonly implementedLensIds: readonly LensId[];
  /** Contracted lens ids that still need runtime implementations. */
  readonly unimplementedLensIds: readonly LensId[];
  /** Source-backed Atlas taxonomy rollup when requested or useful for orientation. */
  readonly taxonomy?: SelfTaxonomyValue;
  /** Calibrated hop graphs for using Atlas to analyze and evolve Atlas itself. */
  readonly recipes?: readonly AtlasSelfRecipeRow[];
  /** Enum declaration rows for enum/taxonomy projections. */
  readonly enums?: readonly AtlasSelfEnumRow[];
  /** Exact Enum.Member reference rows. */
  readonly enumReferences?: readonly AtlasSelfEnumReferenceRow[];
  /** Enum value-space overlap rows. */
  readonly enumValueSpaces?: readonly AtlasSelfEnumValueSpaceRow[];
  /** Exact raw literal occurrences whose values overlap enum member values. */
  readonly enumValueOccurrences?: readonly AtlasSelfEnumValueOccurrenceRow[];
  /** Exact enum-to-enum mapping rows. */
  readonly enumMappings?: readonly AtlasSelfEnumMappingRow[];
  /** Grouped string literal rows for magic-string projections. */
  readonly strings?: readonly AtlasSelfStringLiteralRow[];
  /** Relationship-like row/interface surfaces discovered in Atlas source. */
  readonly relationshipSurfaces?: readonly AtlasSelfRelationshipSurfaceRow[];
  /** Structural row/interface/type surfaces discovered in Atlas source. */
  readonly rowSurfaces?: readonly AtlasSelfRowSurfaceRow[];
  /** Class declaration surfaces discovered in Atlas source. */
  readonly classSurfaces?: readonly AtlasSelfClassSurfaceRow[];
  /** Function and method declaration surfaces discovered in Atlas source. */
  readonly functionSurfaces?: readonly AtlasSelfFunctionSurfaceRow[];
  /** Top-level variable declaration surfaces discovered in Atlas source. */
  readonly variableSurfaces?: readonly AtlasSelfVariableSurfaceRow[];
  /** Repeated AST/control-flow function body-shape groups. */
  readonly functionShapeGroups?: readonly AtlasSelfFunctionShapeGroupRow[];
  /** Shared switch-dispatch topology function groups. */
  readonly functionControlFlowShapeGroups?: readonly AtlasSelfFunctionControlFlowShapeGroupRow[];
  /** Shallow constructor/call wrapper rows. */
  readonly functionWrapperRows?: readonly AtlasSelfFunctionWrapperRow[];
  /** Source file module surfaces discovered in Atlas source. */
  readonly sourceFileSurfaces?: readonly AtlasSelfSourceFileSurfaceRow[];
  /** Lens contract rows joined to runtime implementation paths. */
  readonly contracts?: readonly SelfContractRow[];
  /** Runtime projection branches observed in source. */
  readonly projectionBranches?: readonly AtlasSelfProjectionBranchRow[];
  /** Continuation object literals observed in source. */
  readonly continuationRows?: readonly AtlasSelfContinuationRow[];
  /** Declared framework semantic route topology rows. */
  readonly semanticRoutes?: readonly AtlasSelfSemanticRouteRow[];
  /** Relative module dependency rows. */
  readonly moduleDependencies?: readonly AtlasSelfModuleDependencyRow[];
  /** Substrate reader, builder, and schema surface rows. */
  readonly substrateSurfaces?: readonly AtlasSelfSubstrateSurfaceRow[];
  /** Contract-bearing string rows. */
  readonly contractStrings?: readonly AtlasSelfContractStringRow[];
  /** Exact axis/mapping/stringly-surface pressure rows. */
  readonly axisPressure?: readonly AtlasSelfAxisPressureRow[];
  /** Measured cold-build phase rows for the Atlas self-analysis substrate. */
  readonly phaseProfileRows?: readonly AtlasSelfAnalysisPhaseProfileRow[];
}

/** Compact source project summary without per-package rows. */
export type SourceProjectRollup = Omit<SourceProjectSummary, "packages">;

/** Compact source-backed self taxonomy attached to atlas.self answers. */
export interface SelfTaxonomyValue {
  /** Self-analysis schema marker. */
  readonly version: AtlasSelfAnalysis["version"];
  /** Analyzed Atlas source files. */
  readonly sourceFileCount: number;
  /** Stable rollup counts for enum/string/relationship-source surfaces. */
  readonly rollup: AtlasSelfAnalysis["rollup"];
  /** Cold-build phase timings for the source-backed self-analysis substrate. */
  readonly profile: AtlasSelfAnalysis["profile"];
  /** Pressure signals that should guide future cleanup without claiming semantic bugs. */
  readonly pressure: {
    readonly unreferencedEnumMembers: number;
    readonly enumReferences: number;
    readonly enumValueSpaces: number;
    readonly enumMappings: number;
    readonly enumLiteralReuses: number;
    readonly magicStringValues: number;
    readonly relationshipSurfacesWithoutSourceField: number;
    readonly relationshipSurfacesWithoutRelationAxis: number;
    readonly rowSurfacesWithoutSourceField: number;
    readonly axisPressureRows: number;
  };
}

export function buildSelfBaseValue(
  world: InquiryWorld,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
  unimplemented: readonly { readonly id: LensId }[],
  analysis: AtlasSelfAnalysis,
  includeSourceProject: boolean,
  includeTaxonomy: boolean = true,
): SelfValue {
  const sourceProjectSummary = sourceProject.snapshot().summary;
  return {
    lensesByStage: countByEnum(
      world.lenses.map((lens) => lens.stage),
      [
        LensStage.Implemented,
        LensStage.Contracted,
        LensStage.Planned,
        LensStage.Deprecated,
      ],
    ),
    lensesByFamily: countByEnum(
      world.lenses.map((lens) => lens.family),
      [
        LensFamily.Repo,
        LensFamily.TypeScript,
        LensFamily.Product,
        LensFamily.Framework,
        LensFamily.Bridge,
        LensFamily.Atlas,
      ],
    ),
    substrateContracts: world.substrates.length,
    vocabularyDefinitions: world.vocabulary.length,
    navigationRoutes: world.navigation.routes.length,
    unimplementedContractedLenses: unimplemented.length,
    sourceProjectRollup: sourceProjectRollup(sourceProjectSummary),
    sourceProject: includeSourceProject ? sourceProjectSummary : undefined,
    implementedLensIds: [...implementedLensIds],
    unimplementedLensIds: unimplemented.map((lens) => lens.id),
    taxonomy: includeTaxonomy ? selfTaxonomyValue(analysis) : undefined,
  };
}

function sourceProjectRollup(
  summary: SourceProjectSummary,
): SourceProjectRollup {
  const { packages: _packages, ...rollup } = summary;
  return rollup;
}

function selfTaxonomyValue(
  analysis: AtlasSelfAnalysis,
): SelfTaxonomyValue {
  return {
    version: analysis.version,
    sourceFileCount: analysis.sourceFileCount,
    rollup: analysis.rollup,
    profile: analysis.profile,
    pressure: {
      unreferencedEnumMembers: analysis.rollup.unreferencedEnumMemberCount,
      enumReferences: analysis.rollup.enumReferenceCount,
      enumValueSpaces: analysis.rollup.enumValueSpaceCount,
      enumMappings: analysis.rollup.enumMappingCount,
      enumLiteralReuses: analysis.enums.reduce(
        (sum, row) => sum + row.literalReuseCount,
        0,
      ),
      magicStringValues: analysis.rollup.magicStringValueCount,
      relationshipSurfacesWithoutSourceField:
        analysis.relationshipSurfaces.filter((row) => !row.hasSource).length,
      relationshipSurfacesWithoutRelationAxis:
        analysis.relationshipSurfaces.filter((row) => !row.hasRelation).length,
      rowSurfacesWithoutSourceField: analysis.rowSurfaces.filter(
        (row) => !row.hasSource,
      ).length,
      axisPressureRows: analysis.rollup.axisPressureCount,
    },
  };
}

/** Count enum values while preserving all declared buckets. */
function countByEnum<TValue extends string>(
  values: readonly TValue[],
  buckets: readonly TValue[],
): Readonly<Record<TValue, number>> {
  const counts = Object.fromEntries(
    buckets.map((bucket) => [bucket, 0]),
  ) as Record<TValue, number>;
  for (const value of values) {
    counts[value] += 1;
  }
  return counts;
}
