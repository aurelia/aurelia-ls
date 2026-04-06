import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import type { CurrentWorldPublication } from "../snapshots/current-world-publication.js";
import type { TypeScriptWorldConstruction } from "../registration/typescript-world-construction.js";

export const enum RescanReasonKind {
  None = 0,
  WorkspaceChanged = 1 << 0,
  BoundaryPlanChanged = 1 << 1,
  WorldFrameShifted = 1 << 2
}

export interface WorldFrameHandle {
  readonly kind: WorldFrame["kind"];
  readonly version: number;
}

export interface WorldSnapshotSummary {
  readonly kind: WorldFrame["kind"];
  readonly version: number;
  readonly publishedClaimCount: number;
  readonly consultedPackageCount: number;
  readonly recognizedResourceCount: number;
  readonly admittedResourceCount: number;
  readonly activeResourceCount: number;
  readonly underclosedResourceCount: number;
  readonly activeExtensionCount: number;
  readonly admittedGeneratedVocabularyCount: number;
  readonly underclosedGeneratedVocabularyCount: number;
  readonly associatedTemplateCount: number;
  readonly explicitNoViewCount: number;
  readonly underclosedTemplateAssociationCount: number;
}

export interface RescanBasis {
  readonly reasonMask: RescanReasonKind;
}

export interface CurrentWorldContext {
  readonly worldFrameHandle: WorldFrameHandle;
  readonly snapshotSummary: WorldSnapshotSummary;
  readonly rescanBasis: RescanBasis;
  readonly currentWorldPublication?: CurrentWorldPublication;
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
  readonly associatedTemplateCount?: number;
  readonly explicitNoViewCount?: number;
  readonly underclosedTemplateAssociationCount?: number;
  readonly rescanReasonMask?: RescanReasonKind;
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
    const summary = publication === undefined
      ? {
          publishedClaimCount: this.#seed.publishedClaimCount ?? 0,
          consultedPackageCount: this.#seed.consultedPackageCount ?? 0,
          recognizedResourceCount: this.#seed.recognizedResourceCount ?? 0,
          admittedResourceCount: this.#seed.admittedResourceCount ?? 0,
          activeResourceCount: this.#seed.activeResourceCount ?? 0,
          underclosedResourceCount: this.#seed.underclosedResourceCount ?? 0,
          activeExtensionCount: this.#seed.activeExtensionCount ?? 0,
          admittedGeneratedVocabularyCount: this.#seed.admittedGeneratedVocabularyCount ?? 0,
          underclosedGeneratedVocabularyCount: this.#seed.underclosedGeneratedVocabularyCount ?? 0,
          associatedTemplateCount: this.#seed.associatedTemplateCount ?? 0,
          explicitNoViewCount: this.#seed.explicitNoViewCount ?? 0,
          underclosedTemplateAssociationCount: this.#seed.underclosedTemplateAssociationCount ?? 0
        }
      : {
          publishedClaimCount: 1,
          consultedPackageCount: 1,
          recognizedResourceCount: publication.recognizedResourceCount,
          admittedResourceCount: publication.admittedResourceCount,
          activeResourceCount: publication.activeResourceCount,
          underclosedResourceCount: publication.underclosedResourceCount,
          activeExtensionCount: publication.activeExtensionCount,
          admittedGeneratedVocabularyCount: publication.admittedGeneratedVocabularyCount,
          underclosedGeneratedVocabularyCount: publication.underclosedGeneratedVocabularyCount,
          associatedTemplateCount: publication.associatedTemplateCount,
          explicitNoViewCount: publication.explicitNoViewCount,
          underclosedTemplateAssociationCount: publication.underclosedTemplateAssociationCount
        };
    const reasonMask = (
      this.#seed.rescanReasonMask ?? RescanReasonKind.None
    ) | inferWorldFrameShift(worldFrame, publication);

    return {
      worldFrameHandle: {
        kind: worldFrame.kind,
        version: worldFrame.version
      },
      snapshotSummary: {
        kind: worldFrame.kind,
        version: worldFrame.version,
        publishedClaimCount: summary.publishedClaimCount,
        consultedPackageCount: summary.consultedPackageCount,
        recognizedResourceCount: summary.recognizedResourceCount,
        admittedResourceCount: summary.admittedResourceCount,
        activeResourceCount: summary.activeResourceCount,
        underclosedResourceCount: summary.underclosedResourceCount,
        activeExtensionCount: summary.activeExtensionCount,
        admittedGeneratedVocabularyCount: summary.admittedGeneratedVocabularyCount,
        underclosedGeneratedVocabularyCount: summary.underclosedGeneratedVocabularyCount,
        associatedTemplateCount: summary.associatedTemplateCount,
        explicitNoViewCount: summary.explicitNoViewCount,
        underclosedTemplateAssociationCount: summary.underclosedTemplateAssociationCount
      },
      rescanBasis: {
        reasonMask
      },
      currentWorldPublication: publication
    };
  }
}

const EMPTY_CURRENT_WORLD_CONTEXT_SEED: CurrentWorldContextSeed = {};

export { EMPTY_CURRENT_WORLD_CONTEXT_SEED };

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
