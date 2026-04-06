import type {
  ClaimHomeKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import type { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import type { AuthoredOccurrenceBasis } from "../../syntax/occurrences/authored-occurrence-basis.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";

export interface SubstrateClaimRef {
  readonly home: ClaimHomeKind;
  readonly worldVersion: number;
  readonly localIdentity?: string;
}

export interface CurrentWorldSummaryValue {
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

export interface PublishedSubstrateClaim {
  readonly ref: SubstrateClaimRef;
  readonly outcome: ClaimOutcomeKind;
  readonly qualifier: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly currentWorldSummary?: CurrentWorldSummaryValue;
  readonly currentWorldPublication?: CurrentWorldPublication;
  readonly authoredOccurrenceBasis?: AuthoredOccurrenceBasis;
}

export function createSubstrateClaimRef(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity?: string
): SubstrateClaimRef {
  return {
    home,
    worldVersion,
    localIdentity
  };
}
