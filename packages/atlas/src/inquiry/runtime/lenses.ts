import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind } from "../basis.js";
import { ContinuationKind, ContinuationPriority, type Continuation } from "../continuation.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole, OpenSeamKind, type OpenSeam } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensFamily, LensId, LensStage } from "../lens.js";
import { LocusKind, RepoRootLocus } from "../locus.js";
import { createSurfaceMap, type InquirySurfaceMap } from "../surface-map.js";
import { RepoAreaStatus } from "../terrain.js";
import type { SourceProject, SourceProjectSummary } from "../../source/index.js";
import type { InquiryWorld } from "./world.js";

/** Summary returned by the repo.terrain runtime lens. */
export interface RepoTerrainValue {
  /** Total terrain areas known to Atlas. */
  readonly totalAreas: number;
  /** Active terrain areas that currently shape semantic inquiry. */
  readonly activeAreas: number;
  /** Deferred terrain areas intentionally excluded from current semantic inquiry. */
  readonly deferredAreas: number;
  /** External terrain areas that should not be edited by Atlas work. */
  readonly externalAreas: number;
  /** Terrain rows returned by this projection. */
  readonly areas: InquiryWorld["terrain"];
}

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
  /** Number of contracted lenses without runtime implementations. */
  readonly unimplementedContractedLenses: number;
  /** Hot source project summary held by the runtime substrate context. */
  readonly sourceProject: SourceProjectSummary;
  /** Runtime-implemented lens ids observed by the engine. */
  readonly implementedLensIds: readonly LensId[];
  /** Contracted lens ids that still need runtime implementations. */
  readonly unimplementedLensIds: readonly LensId[];
}

/** Answer the repo.map lens from the static inquiry world. */
export function answerRepoMap(world: InquiryWorld, inquiry: Inquiry): Answer<InquirySurfaceMap> {
  return createAnswer(inquiry, OutcomeKind.Hit, "Returned the Atlas surface map.", {
    value: createSurfaceMap(world),
    basis: [contractBasis("Answered from the in-memory contract world.")],
    evidence: world.evidence,
    continuations: [
      {
        id: "repo.map:terrain",
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect the repository terrain rows behind the surface map.",
        inquiry: {
          lens: LensId.RepoTerrain,
          locus: RepoRootLocus,
          projection: "areas",
        },
      },
      {
        id: "repo.map:self",
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect contract pressure and implementation status.",
        inquiry: {
          lens: LensId.AtlasSelf,
          locus: RepoRootLocus,
          projection: "summary",
        },
      },
    ],
  });
}

/** Answer the repo.terrain lens from static terrain declarations. */
export function answerRepoTerrain(world: InquiryWorld, inquiry: Inquiry): Answer<RepoTerrainValue> {
  const value: RepoTerrainValue = {
    totalAreas: world.terrain.length,
    activeAreas: world.terrain.filter((area) => area.status === RepoAreaStatus.Active).length,
    deferredAreas: world.terrain.filter((area) => area.status === RepoAreaStatus.Deferred).length,
    externalAreas: world.terrain.filter((area) => area.status === RepoAreaStatus.External).length,
    areas: world.terrain,
  };

  return createAnswer(inquiry, OutcomeKind.Hit, `Returned ${world.terrain.length} repository terrain area(s).`, {
    value,
    basis: [contractBasis("Answered from the static repository terrain contract.")],
    evidence: [{
      id: "repo.terrain:areas",
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Subject,
      confidence: EvidenceConfidence.Exact,
      summary: "Repository terrain rows are static declarations in Atlas.",
    }],
    continuations: [{
      id: "repo.terrain:map",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Return to the full inquiry surface map.",
      inquiry: {
        lens: LensId.RepoMap,
        locus: RepoRootLocus,
        projection: "summary",
      },
    }],
  });
}

/** Answer the atlas.self lens from contract-world status. */
export function answerSelf(
  world: InquiryWorld,
  inquiry: Inquiry,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
): Answer<SelfValue> {
  const unimplemented = world.lenses.filter((lens) => lens.stage === LensStage.Contracted && !implementedLensIds.has(lens.id));
  const value: SelfValue = {
    lensesByStage: countByEnum(world.lenses.map((lens) => lens.stage), [
      LensStage.Implemented,
      LensStage.Contracted,
      LensStage.Planned,
      LensStage.Deprecated,
    ]),
    lensesByFamily: countByEnum(world.lenses.map((lens) => lens.family), [
      LensFamily.Repo,
      LensFamily.TypeScript,
      LensFamily.Product,
      LensFamily.Framework,
      LensFamily.Bridge,
      LensFamily.Atlas,
    ]),
    substrateContracts: world.substrates.length,
    vocabularyDefinitions: world.vocabulary.length,
    unimplementedContractedLenses: unimplemented.length,
    sourceProject: sourceProject.snapshot().summary,
    implementedLensIds: [...implementedLensIds],
    unimplementedLensIds: unimplemented.map((lens) => lens.id),
  };
  const openSeams: OpenSeam[] = unimplemented.map((lens) => ({
    id: `atlas.self:lens:${lens.id}`,
    kind: OpenSeamKind.MissingLens,
    summary: `Lens ${lens.id} has a static contract but no runtime implementation yet.`,
    basis: contractBasis("Observed while inspecting the in-memory lens registry."),
  }));

  return createAnswer(
    inquiry,
    openSeams.length === 0 ? OutcomeKind.Hit : OutcomeKind.Partial,
    `Returned contract status: ${implementedLensIds.size} implemented lens(es), ${unimplemented.length} contracted lens(es) without implementations.`,
    {
      value,
      basis: [contractBasis("Answered from the in-memory lens registry and static catalogs.")],
      evidence: world.evidence,
      openSeams,
      continuations: [{
        id: "atlas.self:map",
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Return to the full inquiry surface map.",
        inquiry: {
          lens: LensId.RepoMap,
          locus: RepoRootLocus,
          projection: "summary",
        },
      }],
    },
  );
}

/** Build an unsupported answer for cataloged lenses without runtime implementation. */
export function answerUnimplementedLens(world: InquiryWorld, inquiry: Inquiry): Answer {
  const spec = world.lenses.find((lens) => lens.id === inquiry.lens);
  const requiredSubstrates = spec?.requiredSubstrates ?? [];

  return createAnswer(inquiry, OutcomeKind.Unsupported, `Lens ${inquiry.lens} is cataloged but not implemented yet.`, {
    basis: [{
      kind: BasisKind.Unsupported,
      closure: BasisClosure.Unsupported,
      summary: "This lens is part of the inquiry catalog but does not have a runtime implementation yet.",
      limitations: [`Required substrates: ${requiredSubstrates.join(", ")}`],
    }],
    openSeams: [{
      kind: OpenSeamKind.MissingLens,
      summary: `Implement lens ${inquiry.lens} against the inquiry runtime contracts.`,
    }],
    continuations: [{
      id: `${inquiry.lens}:map`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale: "Return to the implemented surface map while choosing the next lens to implement.",
      inquiry: {
        lens: LensId.RepoMap,
        locus: RepoRootLocus,
        projection: "summary",
      },
    }],
  });
}

/** Shared exact Atlas contract basis for runtime lenses over static catalogs. */
function contractBasis(summary: string) {
  return {
    kind: BasisKind.AtlasContract,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Contract,
    freshness: BasisFreshness.Static,
    summary,
    identity: "@aurelia-ls/atlas",
  };
}

/** Count enum values while preserving all declared buckets. */
function countByEnum<TValue extends string>(values: readonly TValue[], buckets: readonly TValue[]): Readonly<Record<TValue, number>> {
  const counts = Object.fromEntries(buckets.map((bucket) => [bucket, 0])) as Record<TValue, number>;
  for (const value of values) {
    counts[value] += 1;
  }
  return counts;
}

/** Return true when the selected locus is rooted at the whole repo or one terrain area. */
export function isRepoLikeLocus(kind: LocusKind): boolean {
  return kind === LocusKind.Repo || kind === LocusKind.RepoArea || kind === LocusKind.Package;
}
