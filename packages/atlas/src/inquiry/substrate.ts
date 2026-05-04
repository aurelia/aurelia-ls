import { BasisKind } from "./basis.js";
import { EvidenceKind } from "./evidence.js";

/** Stable id for one substrate contract. */
export const enum SubstrateId {
  /** Static repository terrain map. */
  RepoTerrain = "repo.terrain",
  /** Source files and source text. */
  SourceFiles = "source.files",
  /** TypeScript program and declaration structure. */
  TypeScriptProgram = "typescript.program",
  /** TypeScript TypeChecker facts. */
  TypeScriptChecker = "typescript.checker",
  /** Product-owned vocabulary terms and slots. */
  ProductVocabulary = "product.vocabulary",
  /** Product-to-framework auLink anchors. */
  ProductAuLink = "product.aulink",
  /** Framework static evaluator substrate. */
  FrameworkStaticEvaluator = "framework.static-evaluator",
  /** Framework DI substrate. */
  FrameworkDi = "framework.di",
  /** Framework resource convergence substrate. */
  FrameworkResources = "framework.resources",
  /** Framework configuration/bundle admission substrate. */
  FrameworkAdmission = "framework.admission",
  /** Atlas static contracts. */
  AtlasContracts = "atlas.contracts",
}

/** Broad substrate family. */
export const enum SubstrateKind {
  /** Repository map or terrain declarations. */
  RepoMap = "repo-map",
  /** Source text and source addressing. */
  Source = "source",
  /** TypeScript program or checker substrate. */
  TypeScript = "typescript",
  /** Product-owned semantic substrate. */
  Product = "product",
  /** Framework semantic substrate. */
  Framework = "framework",
  /** Atlas self-description substrate. */
  Atlas = "atlas",
}

/** Trust model for interpreting substrate output. */
export const enum SubstrateTrust {
  /** Substrate is exact within its declared contract. */
  Exact = "exact",
  /** Substrate derives facts from a compiler/checker/source model. */
  Derived = "derived",
  /** Substrate derives facts from an explicit static model and records unmodeled cases as open seams. */
  ModeledStatic = "modeled-static",
  /** Substrate is a steering signal rather than proof. */
  Steering = "steering",
}

/** Static contract for one substrate used by one or more lenses. */
export interface SubstrateContract {
  /** Stable substrate id. */
  readonly id: SubstrateId;
  /** Broad substrate family. */
  readonly kind: SubstrateKind;
  /** Trust model for answers produced from this substrate. */
  readonly trust: SubstrateTrust;
  /** Grounded explanation of the substrate's responsibility. */
  readonly summary: string;
  /** Basis kinds this substrate can spend. */
  readonly basisKinds: readonly BasisKind[];
  /** Evidence kinds this substrate can produce. */
  readonly produces: readonly EvidenceKind[];
  /** Other substrates this substrate depends on. */
  readonly dependsOn?: readonly SubstrateId[];
}

/** Runtime snapshot identity for a substrate implementation. */
export interface SubstrateSnapshot {
  /** Contract this snapshot implements. */
  readonly contractId: SubstrateId;
  /** Session, project, commit, or snapshot identity. */
  readonly identity: string;
  /** Optional schema or source version. */
  readonly version?: string;
  /** Grounded summary of what this snapshot contains. */
  readonly summary: string;
}

/** Port implemented by future hot-session substrates. */
export interface SubstratePort<
  TSnapshot extends SubstrateSnapshot = SubstrateSnapshot,
> {
  /** Static contract this port satisfies. */
  readonly contract: SubstrateContract;
  /** Read the current snapshot identity without running a lens. */
  snapshot(): TSnapshot;
}

/** Substrate contracts known to Atlas. */
export const SubstrateCatalog: readonly SubstrateContract[] = [
  {
    id: SubstrateId.RepoTerrain,
    kind: SubstrateKind.RepoMap,
    trust: SubstrateTrust.Exact,
    summary: "Static map of active, deferred, and external repository terrain.",
    basisKinds: [BasisKind.AtlasContract],
    produces: [EvidenceKind.MaintenanceSignal],
  },
  {
    id: SubstrateId.SourceFiles,
    kind: SubstrateKind.Source,
    trust: SubstrateTrust.Exact,
    summary:
      "Filesystem or git-tree source text, source ranges, and file identity.",
    basisKinds: [BasisKind.SourceText, BasisKind.GitTree],
    produces: [EvidenceKind.SourceSpan],
  },
  {
    id: SubstrateId.TypeScriptProgram,
    kind: SubstrateKind.TypeScript,
    trust: SubstrateTrust.Derived,
    summary:
      "TypeScript program structure, module graph, symbols, and declarations.",
    basisKinds: [BasisKind.TypeScriptProgram],
    produces: [EvidenceKind.Symbol, EvidenceKind.SourceSpan],
    dependsOn: [SubstrateId.SourceFiles],
  },
  {
    id: SubstrateId.TypeScriptChecker,
    kind: SubstrateKind.TypeScript,
    trust: SubstrateTrust.Derived,
    summary:
      "TypeChecker facts: apparent types, signatures, reference roles, and typed flow evidence.",
    basisKinds: [BasisKind.TypeScriptChecker],
    produces: [
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.Symbol,
    ],
    dependsOn: [SubstrateId.TypeScriptProgram],
  },
  {
    id: SubstrateId.ProductVocabulary,
    kind: SubstrateKind.Product,
    trust: SubstrateTrust.ModeledStatic,
    summary:
      "Product vocabulary definitions and allowed self-description terms.",
    basisKinds: [BasisKind.ProductVocabulary],
    produces: [
      EvidenceKind.VocabularyTerm,
      EvidenceKind.ProductClaim,
      EvidenceKind.SourceSpan,
    ],
    dependsOn: [SubstrateId.TypeScriptProgram],
  },
  {
    id: SubstrateId.ProductAuLink,
    kind: SubstrateKind.Product,
    trust: SubstrateTrust.ModeledStatic,
    summary: "Narrow product-to-framework anchors declared through auLink.",
    basisKinds: [BasisKind.AuLink],
    produces: [EvidenceKind.AuLinkAnchor, EvidenceKind.SourceSpan],
    dependsOn: [SubstrateId.TypeScriptChecker],
  },
  {
    id: SubstrateId.FrameworkStaticEvaluator,
    kind: SubstrateKind.Framework,
    trust: SubstrateTrust.ModeledStatic,
    summary:
      "Static evaluator for framework world-construction closures and explicit open seams.",
    basisKinds: [BasisKind.StaticEvaluator],
    produces: [
      EvidenceKind.OpenSeam,
      EvidenceKind.SourceSpan,
      EvidenceKind.TypeFact,
    ],
    dependsOn: [SubstrateId.TypeScriptChecker],
  },
  {
    id: SubstrateId.FrameworkDi,
    kind: SubstrateKind.Framework,
    trust: SubstrateTrust.ModeledStatic,
    summary:
      "Framework DI keys, registration writes, lookup reads, provider associations, and evaluator-backed closure limits.",
    basisKinds: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
    produces: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    dependsOn: [
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
  },
  {
    id: SubstrateId.FrameworkResources,
    kind: SubstrateKind.Framework,
    trust: SubstrateTrust.ModeledStatic,
    summary:
      "Framework resource carriers, package exports, bundle admissions, syntax products, and materialization convergence rows.",
    basisKinds: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
    produces: [
      EvidenceKind.ResourceDefinition,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    dependsOn: [
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
  },
  {
    id: SubstrateId.FrameworkAdmission,
    kind: SubstrateKind.Framework,
    trust: SubstrateTrust.ModeledStatic,
    summary:
      "Framework configuration and bundle admissions derived from evaluator effects and TypeChecker-classified DI/resource/registry targets.",
    basisKinds: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
    produces: [
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    dependsOn: [
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
  },
  {
    id: SubstrateId.AtlasContracts,
    kind: SubstrateKind.Atlas,
    trust: SubstrateTrust.Exact,
    summary:
      "Atlas answer, lens, terrain, vocabulary, and substrate contracts.",
    basisKinds: [BasisKind.AtlasContract],
    produces: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.OpenSeam,
    ],
    dependsOn: [SubstrateId.RepoTerrain],
  },
];

/** Return one substrate contract or fail loudly on static contract drift. */
export function findSubstrateContract(id: SubstrateId): SubstrateContract {
  const contract = SubstrateCatalog.find((entry) => entry.id === id);
  if (contract === undefined) {
    throw new Error(`Unknown substrate contract: ${id}`);
  }
  return contract;
}
