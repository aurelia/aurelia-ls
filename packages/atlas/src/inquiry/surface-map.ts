import { ANSWER_SCHEMA_VERSION, OUTCOME_KINDS, OutcomeKind, createAnswer, type Answer } from "./answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind } from "./basis.js";
import { CONTINUATION_KINDS } from "./continuation.js";
import type { Inquiry } from "./inquiry.js";
import { LensCatalog, LensId, type LensSpec } from "./lens.js";
import { RepoRootLocus } from "./locus.js";
import { SubstrateCatalog, type SubstrateContract } from "./substrate.js";
import { RepoTerrain, activeTerrain, type RepoArea } from "./terrain.js";
import { InternalVocabularyDefinitions, type InternalVocabularyDefinition } from "./vocabulary.js";

/** Contract rows needed to project the public inquiry surface map. */
export interface SurfaceMapContracts {
  /** Package identity for the surface being projected. */
  readonly packageName: "@aurelia-ls/atlas";
  /** Controlled vocabulary terms available to inquiry lenses. */
  readonly vocabulary: readonly InternalVocabularyDefinition[];
  /** Full repository terrain declaration. */
  readonly terrain: readonly RepoArea[];
  /** Terrain areas currently active for semantic inquiry. */
  readonly activeTerrain: readonly RepoArea[];
  /** Substrate contracts available to lenses. */
  readonly substrates: readonly SubstrateContract[];
  /** Lens contracts known to the inquiry surface. */
  readonly lenses: readonly LensSpec[];
}

/** High-level map of Atlas's static inquiry contracts. */
export interface InquirySurfaceMap {
  /** Package identity for the Atlas contract surface. */
  readonly packageName: "@aurelia-ls/atlas";
  /** Answer schema version emitted by inquiry lenses. */
  readonly contractVersion: typeof ANSWER_SCHEMA_VERSION;
  /** Principles that explain the current contract shape. */
  readonly activePrinciples: readonly string[];
  /** Shared answer and continuation classifier lists. */
  readonly contractShape: {
    /** Outcome values carried by every answer. */
    readonly outcomes: typeof OUTCOME_KINDS;
    /** Continuation values used for next-question edges. */
    readonly continuations: typeof CONTINUATION_KINDS;
  };
  /** Controlled vocabulary terms Atlas declares about itself. */
  readonly vocabulary: readonly InternalVocabularyDefinition[];
  /** Full repository terrain declaration. */
  readonly terrain: readonly RepoArea[];
  /** Terrain areas currently active for semantic inquiry. */
  readonly activeTerrain: readonly RepoArea[];
  /** Substrate contracts available to lenses. */
  readonly substrates: readonly SubstrateContract[];
  /** Lens contracts known to the inquiry surface. */
  readonly lenses: readonly LensSpec[];
}

/** Create the static surface map answer payload. */
export function createSurfaceMap(
  /** Optional world rows to project instead of the default static catalogs. */
  contracts: Partial<SurfaceMapContracts> = {},
): InquirySurfaceMap {
  return {
    packageName: contracts.packageName ?? "@aurelia-ls/atlas",
    contractVersion: ANSWER_SCHEMA_VERSION,
    activePrinciples: [
      "Prefer a small inquiry algebra over a large operation/aspect matrix.",
      "Treat product substrate and vocabulary as the allowed product self-description layer.",
      "Make basis, evidence, open seams, and continuations explicit on every answer.",
      "Let TypeScript, product, framework, bridge, and Atlas maintenance lenses compose through one answer shape.",
      "Declare Atlas intent through controlled vocabulary so self-analysis can inspect design pressure directly.",
    ],
    contractShape: {
      outcomes: OUTCOME_KINDS,
      continuations: CONTINUATION_KINDS,
    },
    vocabulary: contracts.vocabulary ?? InternalVocabularyDefinitions,
    terrain: contracts.terrain ?? RepoTerrain,
    activeTerrain: contracts.activeTerrain ?? activeTerrain(),
    substrates: contracts.substrates ?? SubstrateCatalog,
    lenses: contracts.lenses ?? LensCatalog,
  };
}

/** Create the implemented repo.map answer over the static surface map. */
export function createSurfaceMapAnswer(focus?: string): Answer<InquirySurfaceMap> {
  const inquiry: Inquiry = {
    lens: LensId.RepoMap,
    locus: RepoRootLocus,
    subject: focus,
    projection: "summary",
  };

  return createAnswer(inquiry, OutcomeKind.Hit, "Returned the Atlas surface map.", {
    value: createSurfaceMap(),
    basis: [{
      kind: BasisKind.AtlasContract,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Contract,
      freshness: BasisFreshness.Static,
      summary: "Answered from the in-package inquiry lens catalog.",
      identity: "@aurelia-ls/atlas",
    }],
  });
}
