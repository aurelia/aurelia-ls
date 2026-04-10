import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import type { CurrentWorldPublication } from "../snapshots/current-world-publication.js";
import type { TypeScriptWorldConstruction } from "../registration/typescript-world-construction.js";
import { ConsultedBoundaryKind, ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import {
  AdmissionRegimeKind,
  ConsultationRoleKind,
  ConstructorArchetypeKind,
  LookupRegimeKind,
  MaterializationTimingKind,
  NamingSurfaceKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "../registration/consulted-world.js";
import {
  ChangedBasisClassKind,
  ContributorClassKind,
  CurrentWorldActivityStatusKind,
  RescanBasis,
  RescanScopeKind,
  RescanSignal,
  RescanTriggerKind,
  SummaryReachabilityScopeKind,
  SummaryStatusKind,
  WorldFrameHandle,
  WorldSnapshotSummary
} from "./world-context-shapes.js";

const SYNTHETIC_WORLD_REF_PREFIX = "synthetic-world";
const WORLD_SEED_PREFIX = "world-seed";
const SYNTHETIC_WORLD_BASIS = "synthetic-world-basis";
const SYNTHETIC_BOUNDARY_ID = "/";

export const enum RescanReasonKind {
  None = 0,
  WorkspaceChanged = 1 << 0,
  BoundaryPlanChanged = 1 << 1,
  WorldFrameShifted = 1 << 2
}

export {
  ChangedBasisClassKind,
  ContributorClassKind,
  CurrentWorldActivityStatusKind,
  RescanBasis,
  RescanScopeKind,
  RescanSignal,
  RescanTriggerKind,
  SummaryReachabilityScopeKind,
  SummaryStatusKind,
  WorldFrameHandle,
  WorldSnapshotSummary
};

export class CurrentWorldContext {
  public constructor(
    public readonly worldFrameHandle: WorldFrameHandle,
    public readonly snapshotSummary: WorldSnapshotSummary,
    public readonly rescanBasis: RescanBasis,
    public readonly currentWorldPublication?: CurrentWorldPublication
  ) {}
}

export interface CurrentWorldContextSeed {
  readonly publishedClaimCount?: number;
  readonly consultedPackageCount?: number;
  readonly recognizedResourceCount?: number;
  readonly admittedResourceCount?: number;
  readonly activeResourceCount?: number;
  readonly underclosedResourceCount?: number;
  readonly activeExtensionCount?: number;
  readonly admittedGeneratedVocabularyCount?: number;
  readonly underclosedGeneratedVocabularyCount?: number;
  readonly activeRegistrationPatternCount?: number;
  readonly closedRegistrationPatternCount?: number;
  readonly qualifiedRegistrationPatternCount?: number;
  readonly underclosedRegistrationPatternCount?: number;
  readonly openRegistrationPatternCount?: number;
  readonly unsupportedRegistrationBoundaryCount?: number;
  readonly runtimeOnlyRegistrationBoundaryCount?: number;
  readonly associatedTemplateCount?: number;
  readonly explicitNoViewCount?: number;
  readonly underclosedTemplateAssociationCount?: number;
  readonly scannedContributorClasses?: readonly ContributorClassKind[];
  readonly scannedContributorRefs?: readonly string[];
  readonly supportingBoundaries?: readonly ConsultedBoundaryRef[];
  readonly outOfBoundaryCandidateRefs?: readonly string[];
  readonly recognitionStatus?: SummaryStatusKind;
  readonly admissionStatus?: SummaryStatusKind;
  readonly currentWorldActivityStatus?: CurrentWorldActivityStatusKind;
  readonly reachabilityScopes?: readonly SummaryReachabilityScopeKind[];
  readonly declarationWitnessStatus?: SummaryStatusKind;
  readonly searchedWorldCompletenessStatus?: SummaryStatusKind;
  readonly openStateStatus?: SummaryStatusKind;
  readonly worldRef?: string;
  readonly inheritedWorldSeedRef?: string;
  readonly consultedBoundary?: ConsultedBoundaryRef;
  readonly searchedBoundaries?: readonly ConsultedBoundaryRef[];
  readonly consultationRole?: ConsultationRoleKind;
  readonly worldRegime?: WorldRegimeKind;
  readonly worldOwnerOrConstructorBasis?: string;
  readonly registrationPath?: RegistrationPathKind;
  readonly constructorArchetypes?: readonly ConstructorArchetypeKind[];
  readonly admissionRegime?: AdmissionRegimeKind;
  readonly lookupRegime?: LookupRegimeKind;
  readonly materializationTiming?: MaterializationTimingKind;
  readonly namingSurfaces?: readonly NamingSurfaceKind[];
  readonly rescanReasonMask?: RescanReasonKind;
  readonly rescanSignals?: readonly RescanSignal[];
}

export class CurrentWorldContextPort {
  readonly #seed: CurrentWorldContextSeed;
  readonly #worldConstruction?: TypeScriptWorldConstruction;

  public constructor(
    seed: CurrentWorldContextSeed = EMPTY_CURRENT_WORLD_CONTEXT_SEED,
    worldConstruction?: TypeScriptWorldConstruction
  ) {
    this.#seed = seed;
    this.#worldConstruction = worldConstruction;
  }

  public publishCurrentWorldContext(
    questionRoute: QuestionRoute,
    worldFrame: WorldFrame
  ): CurrentWorldContext {
    const publication = this.#worldConstruction?.publishCurrentWorldPublication(
      questionRoute,
      worldFrame
    );
    const worldFrameHandle = publication === undefined
      ? createSeedWorldFrameHandle(worldFrame, this.#seed)
      : publication.createWorldFrameHandle(worldFrame);
    const snapshotSummary = publication === undefined
      ? createSeedWorldSnapshotSummary(worldFrame, this.#seed)
      : publication.createWorldSnapshotSummary(
          worldFrame,
          this.#seed.publishedClaimCount ?? 1
        );
    const reasonMask = (
      this.#seed.rescanReasonMask ?? RescanReasonKind.None
    ) | inferWorldFrameShift(worldFrame, publication);
    const rescanBasis = new RescanBasis(
      reasonMask,
      mergeRescanSignals(
        this.#seed.rescanSignals ?? [],
        inferSignalsFromReasonMask(reasonMask)
      )
    );

    return new CurrentWorldContext(
      worldFrameHandle,
      snapshotSummary,
      rescanBasis,
      publication
    );
  }
}

const EMPTY_CURRENT_WORLD_CONTEXT_SEED: CurrentWorldContextSeed = {};

export { EMPTY_CURRENT_WORLD_CONTEXT_SEED };

export function isSyntheticWorldOwnerOrConstructorBasis(ref: string): boolean {
  return ref === SYNTHETIC_WORLD_BASIS;
}

function createSeedWorldFrameHandle(
  worldFrame: WorldFrame,
  seed: CurrentWorldContextSeed
): WorldFrameHandle {
  const consultedBoundary = seed.consultedBoundary ?? createSyntheticBoundary();

  return new WorldFrameHandle(
    worldFrame.kind,
    worldFrame.version,
    seed.worldRef ?? createSyntheticWorldRef(worldFrame),
    seed.inheritedWorldSeedRef ?? createWorldSeedRef(worldFrame),
    consultedBoundary,
    seed.searchedBoundaries ?? [consultedBoundary],
    seed.consultationRole ?? ConsultationRoleKind.Unspecified,
    seed.worldRegime ?? WorldRegimeKind.Unspecified,
    seed.worldOwnerOrConstructorBasis ?? SYNTHETIC_WORLD_BASIS,
    seed.registrationPath ?? RegistrationPathKind.Unspecified,
    seed.constructorArchetypes ?? [],
    seed.admissionRegime ?? AdmissionRegimeKind.Unspecified,
    seed.lookupRegime ?? LookupRegimeKind.Unspecified,
    seed.materializationTiming ?? MaterializationTimingKind.Unspecified,
    seed.namingSurfaces ?? []
  );
}

function createSeedWorldSnapshotSummary(
  worldFrame: WorldFrame,
  seed: CurrentWorldContextSeed
): WorldSnapshotSummary {
  return new WorldSnapshotSummary(
    worldFrame.kind,
    worldFrame.version,
    seed.publishedClaimCount ?? 0,
    seed.consultedPackageCount ?? 0,
    seed.recognizedResourceCount ?? 0,
    seed.admittedResourceCount ?? 0,
    seed.activeResourceCount ?? 0,
    seed.underclosedResourceCount ?? 0,
    seed.activeExtensionCount ?? 0,
    seed.admittedGeneratedVocabularyCount ?? 0,
    seed.underclosedGeneratedVocabularyCount ?? 0,
    seed.activeRegistrationPatternCount ?? 0,
    seed.closedRegistrationPatternCount ?? 0,
    seed.qualifiedRegistrationPatternCount ?? 0,
    seed.underclosedRegistrationPatternCount ?? 0,
    seed.openRegistrationPatternCount ?? 0,
    seed.unsupportedRegistrationBoundaryCount ?? 0,
    seed.runtimeOnlyRegistrationBoundaryCount ?? 0,
    seed.associatedTemplateCount ?? 0,
    seed.explicitNoViewCount ?? 0,
    seed.underclosedTemplateAssociationCount ?? 0,
    seed.scannedContributorClasses ?? [],
    seed.scannedContributorRefs ?? [],
    seed.supportingBoundaries ?? [seed.consultedBoundary ?? createSyntheticBoundary()],
    seed.outOfBoundaryCandidateRefs ?? [],
    seed.recognitionStatus ?? SummaryStatusKind.OpenPlaceholder,
    seed.admissionStatus ?? SummaryStatusKind.OpenPlaceholder,
    seed.currentWorldActivityStatus ?? CurrentWorldActivityStatusKind.Closed,
    seed.reachabilityScopes ?? [],
    seed.declarationWitnessStatus ?? SummaryStatusKind.OpenPlaceholder,
    seed.searchedWorldCompletenessStatus ?? SummaryStatusKind.OpenPlaceholder,
    seed.openStateStatus ?? SummaryStatusKind.OpenPlaceholder
  );
}

function inferWorldFrameShift(
  worldFrame: WorldFrame,
  publication: CurrentWorldPublication | undefined
): RescanReasonKind {
  if (publication === undefined) {
    return RescanReasonKind.None;
  }

  return publication.consultedWorld.worldRef.endsWith(`:${worldFrame.version}`)
    ? RescanReasonKind.None
    : RescanReasonKind.WorldFrameShifted;
}

function inferSignalsFromReasonMask(
  reasonMask: RescanReasonKind
): readonly RescanSignal[] {
  const rescanSignals: RescanSignal[] = [];

  if ((reasonMask & RescanReasonKind.WorkspaceChanged) !== 0) {
    rescanSignals.push(
      new RescanSignal(
        RescanTriggerKind.LocalDeclarationEdit,
        RescanScopeKind.OwnerLocalThenPackage,
        ChangedBasisClassKind.Declaration
      )
    );
  }

  if ((reasonMask & RescanReasonKind.BoundaryPlanChanged) !== 0) {
    rescanSignals.push(
      new RescanSignal(
        RescanTriggerKind.BoundaryPlanEdit,
        RescanScopeKind.BoundaryStackThenContributorPlanning,
        ChangedBasisClassKind.BoundaryPlan
      )
    );
  }

  if ((reasonMask & RescanReasonKind.WorldFrameShifted) !== 0) {
    rescanSignals.push(
      new RescanSignal(
        RescanTriggerKind.TimingOrBranchActivationEdit,
        RescanScopeKind.CurrentWorldActivityAndReachability,
        ChangedBasisClassKind.TimingBranch
      )
    );
  }

  return rescanSignals;
}

function mergeRescanSignals(
  left: readonly RescanSignal[],
  right: readonly RescanSignal[]
): readonly RescanSignal[] {
  const merged = new Map<string, RescanSignal>();

  for (const signal of [...left, ...right]) {
    const key = `${signal.trigger}:${signal.scope}:${signal.changedBasisClass}`;
    merged.set(key, signal);
  }

  return [...merged.values()];
}

function createSyntheticBoundary(): ConsultedBoundaryRef {
  return new ConsultedBoundaryRef(
    ConsultedBoundaryKind.Package,
    SYNTHETIC_BOUNDARY_ID
  );
}

function createSyntheticWorldRef(
  worldFrame: WorldFrame
): string {
  return `${SYNTHETIC_WORLD_REF_PREFIX}:${worldFrame.kind}:${worldFrame.version}`;
}

function createWorldSeedRef(
  worldFrame: WorldFrame
): string {
  return `${WORLD_SEED_PREFIX}:${worldFrame.kind}:${worldFrame.version}`;
}
