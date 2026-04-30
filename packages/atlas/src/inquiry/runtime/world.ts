import type { Evidence, OpenSeam } from "../evidence.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole } from "../evidence.js";
import type { LensSpec } from "../lens.js";
import { LensCatalog } from "../lens.js";
import type { SubstrateContract } from "../substrate.js";
import { SubstrateCatalog } from "../substrate.js";
import type { RepoArea } from "../terrain.js";
import { RepoTerrain, activeTerrain } from "../terrain.js";
import type { InternalVocabularyDefinition } from "../vocabulary.js";
import { InternalVocabularyDefinitions } from "../vocabulary.js";

/** In-memory contract world used by the inquiry engine. */
export interface InquiryWorld {
  /** Package identity for the world. */
  readonly packageName: "@aurelia-ls/atlas";
  /** Repository terrain rows available to contract lenses. */
  readonly terrain: readonly RepoArea[];
  /** Terrain rows currently active for semantic inquiry. */
  readonly activeTerrain: readonly RepoArea[];
  /** Substrate contracts available to lens validation. */
  readonly substrates: readonly SubstrateContract[];
  /** Lens contracts available to inquiry routing. */
  readonly lenses: readonly LensSpec[];
  /** package-owned vocabulary declarations available to self-analysis. */
  readonly vocabulary: readonly InternalVocabularyDefinition[];
  /** Static evidence rows describing the contract world itself. */
  readonly evidence: readonly Evidence[];
  /** Static open seams known before any thick substrate implementation runs. */
  readonly openSeams: readonly OpenSeam[];
}

/** Build the default static world from package-local contract catalogs. */
export function createDefaultInquiryWorld(): InquiryWorld {
  const terrain = RepoTerrain;
  const substrates = SubstrateCatalog;
  const lenses = LensCatalog;
  const vocabulary = InternalVocabularyDefinitions;

  return {
    packageName: "@aurelia-ls/atlas",
    terrain,
    activeTerrain: activeTerrain(),
    substrates,
    lenses,
    vocabulary,
    evidence: [
      {
        id: "contract:lens-catalog",
        kind: EvidenceKind.MaintenanceSignal,
        role: EvidenceRole.Subject,
        confidence: EvidenceConfidence.Exact,
        summary: "Lens contracts are loaded from the static Atlas lens catalog.",
      },
      {
        id: "contract:substrate-catalog",
        kind: EvidenceKind.MaintenanceSignal,
        role: EvidenceRole.Support,
        confidence: EvidenceConfidence.Exact,
        summary: "Substrate contracts are loaded from the static atlas substrate catalog.",
      },
      {
        id: "contract:terrain",
        kind: EvidenceKind.MaintenanceSignal,
        role: EvidenceRole.Support,
        confidence: EvidenceConfidence.Exact,
        summary: "Repository terrain is loaded from the static atlas terrain map.",
      },
      {
        id: "contract:vocabulary",
        kind: EvidenceKind.VocabularyTerm,
        role: EvidenceRole.Support,
        confidence: EvidenceConfidence.Exact,
        summary: "Atlas self-description vocabulary is loaded from the static vocabulary declarations.",
      },
    ],
    openSeams: [],
  };
}
