import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import { LensId, type LensFamily, type LensStage } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { InquiryRuntimeRequest, SelfValue } from "../inquiry/runtime/index.js";
import type { InquirySurfaceMap } from "../inquiry/surface-map.js";
import type { SourceProjectSummary } from "../source/index.js";
import { ensureInquirySession, type EnsureInquirySessionOptions } from "./client.js";
import type {
  InquirySessionSelfCheckResult,
  InquirySessionShutdownResult,
  InquirySessionStatus,
} from "./protocol.js";

/** First orientation bundle a Codex-facing entrypoint should read for this repo. */
export interface Orientation {
  /** Compact daemon and hot-world footing. */
  readonly session: OrientationSessionGuide;
  /** Compact usage guide derived from live orientation answers. */
  readonly guide: OrientationGuide;
  /** Compact answer summaries for the orientation probes. */
  readonly answers: OrientationAnswerBundle;
}

/** First-call usage guide that should keep callers out of Atlas source files without flooding context. */
export interface OrientationGuide {
  /** Stable package API calls available after orientation. */
  readonly entrypoints: OrientationEntrypoints;
  /** Shared request and answer lanes every lens uses. */
  readonly contract: OrientationContractGuide;
  /** Runtime-implemented lenses and compact projection ids. */
  readonly implementedLenses: readonly OrientationLensGuide[];
  /** Contracted lens ids that are not callable yet. */
  readonly unavailableLensIds: readonly string[];
  /** Repository terrain and ownership rows that bound edit policy. */
  readonly terrain: readonly OrientationTerrainGuide[];
  /** Exact first inquiries a caller can ask next without opening source. */
  readonly firstMoves: readonly OrientationFirstMove[];
  /** Curated capability doors that teach larger inquiry families on demand. */
  readonly capabilityMoves: readonly OrientationCapabilityMove[];
  /** Explicit open seams discovered during orientation. */
  readonly openSeams: readonly OrientationOpenSeamGuide[];
  /** Compact source-project footing behind TypeScript-backed inquiries. */
  readonly sourceProject: OrientationSourceProjectGuide;
}

/** Compact daemon and hot-world footing. */
export interface OrientationSessionGuide {
  readonly packageName: "@aurelia-ls/atlas";
  readonly pid: number;
  readonly buildHash: string;
  readonly uptimeMs: number;
  readonly world: {
    readonly terrainAreas: number;
    readonly activeTerrainAreas: number;
    readonly substrateContracts: number;
    readonly lensContracts: number;
    readonly vocabularyDefinitions: number;
  };
}

/** Compact answer summaries for the orientation probes. */
export interface OrientationAnswerBundle {
  readonly map: OrientationAnswerGuide;
  readonly self: OrientationAnswerGuide;
}

/** Compact answer row for orientation output. */
export interface OrientationAnswerGuide {
  readonly outcome: string;
  readonly lens: string;
  readonly projection?: string;
  readonly summary: string;
  readonly basis: readonly string[];
  readonly evidenceCount: number;
  readonly openSeamCount: number;
  readonly continuationCount: number;
}

/** Stable package API calls available after orientation. */
export interface OrientationEntrypoints {
  readonly orient: "createApi().orient()";
  readonly status: "createApi().status()";
  readonly map: "createApi().map(focus?)";
  readonly ask: "createApi().ask({ lens, locus?, subject?, projection?, filters?, budget?, page? })";
  readonly follow: "createApi().follow(continuation)";
  readonly selfCheck: "createApi().selfCheck()";
}

/** Shared request and answer lanes every lens uses. */
export interface OrientationContractGuide {
  readonly requestFields: readonly string[];
  readonly answerFields: readonly string[];
  readonly continuationFields: readonly string[];
  readonly routeClaimFields: readonly string[];
  readonly basisTransitionFields: readonly string[];
}

/** Compact lens contract row for first-call orientation. */
export interface OrientationLensGuide {
  readonly id: string;
  readonly family: LensFamily;
  readonly stage: LensStage;
  readonly projectionIds: readonly string[];
}

/** Compact terrain row for first-call orientation. */
export interface OrientationTerrainGuide {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly ownership: string;
  readonly root: string;
}

/** Exact first move a caller can ask after orientation. */
export interface OrientationFirstMove {
  readonly id?: string;
  readonly kind: string;
  readonly priority?: string;
  readonly rationale: string;
  readonly ask: InquiryRuntimeRequest;
}

/** Curated capability move exposed by orientation without expanding the full guide. */
export interface OrientationCapabilityMove {
  readonly id: string;
  readonly family: string;
  readonly summary: string;
  readonly ask: InquiryRuntimeRequest;
}

/** Compact open seam row for first-call orientation. */
export interface OrientationOpenSeamGuide {
  readonly id?: string;
  readonly kind: string;
  readonly summary: string;
}

/** Compact source-project footing behind TypeScript-backed inquiries. */
export interface OrientationSourceProjectGuide {
  readonly snapshotKind: string;
  readonly identity: string;
  readonly packageCount: number;
  readonly rootFileCount: number;
  readonly programSourceFileCount: number;
  readonly ownedSourceFileCount: number;
  readonly declarationCount: number;
  readonly topLevelDeclarationCount: number;
  readonly configDiagnosticCount: number;
  readonly packageRoots: Record<string, string>;
}

/** Session-backed API that auto-starts the daemon before each request. */
export interface Api {
  /** Return the normal first orientation bundle for Codex-facing work. */
  orient(): Promise<Orientation>;
  /** Return daemon identity and cheap world summary. */
  status(): Promise<InquirySessionStatus>;
  /** Return the surface map through the daemon-held runtime API. */
  map(focus?: string): Promise<Answer<InquirySurfaceMap>>;
  /** Ask one inquiry through the daemon-held runtime API. */
  ask(input: InquiryRuntimeRequest): Promise<Answer>;
  /** Follow one continuation through the daemon-held runtime API. */
  follow(continuation: Continuation): Promise<Answer>;
  /** Run lightweight self-coherence checks inside the daemon. */
  selfCheck(): Promise<InquirySessionSelfCheckResult>;
  /** Politely stop the daemon after it responds. */
  shutdown(reason?: string): Promise<InquirySessionShutdownResult>;
  /** True when a lens id is implemented by the daemon's runtime. */
  isImplemented(lens: LensId): Promise<boolean>;
}

/** Create the default session API, backed by an auto-ensured daemon. */
export function createApi(
  /** Session startup and probing options. */
  options: EnsureInquirySessionOptions = {},
): Api {
  return {
    orient: async () => {
      const session = await ensureInquirySession(options);
      const [status, map, self] = await Promise.all([
        session.status(),
        session.map("orient"),
        session.ask({
          lens: LensId.AtlasSelf,
          locus: RepoRootLocus,
          projection: "summary",
        }) as Promise<Answer<SelfValue>>,
      ]);
      return {
        session: sessionGuide(status),
        guide: createOrientationGuide(status, map, self, map.continuations),
        answers: {
          map: answerGuide(map),
          self: answerGuide(self),
        },
      };
    },
    status: async () => {
      const session = await ensureInquirySession(options);
      return session.status();
    },
    map: async (focus) => {
      const session = await ensureInquirySession(options);
      return session.map(focus);
    },
    ask: async (input) => {
      const session = await ensureInquirySession(options);
      return session.ask(input);
    },
    follow: async (continuation) => {
      const session = await ensureInquirySession(options);
      return session.follow(continuation);
    },
    selfCheck: async () => {
      const session = await ensureInquirySession(options);
      return session.selfCheck();
    },
    shutdown: async (reason) => {
      const session = await ensureInquirySession(options);
      return session.shutdown(reason);
    },
    isImplemented: async (lens) => {
      const session = await ensureInquirySession(options);
      return session.isImplemented(lens);
    },
  };
}

function createOrientationGuide(
  status: InquirySessionStatus,
  map: Answer<InquirySurfaceMap>,
  self: Answer<SelfValue>,
  continuations: readonly Continuation[],
): OrientationGuide {
  const lenses = map.value?.lenses ?? [];
  const implementedIds = new Set(status.implementedLensIds);
  const unavailableIds = new Set(self.value?.unimplementedLensIds ?? []);
  return {
    entrypoints: {
      orient: "createApi().orient()",
      status: "createApi().status()",
      map: "createApi().map(focus?)",
      ask: "createApi().ask({ lens, locus?, subject?, projection?, filters?, budget?, page? })",
      follow: "createApi().follow(continuation)",
      selfCheck: "createApi().selfCheck()",
    },
    contract: {
      requestFields: ["lens", "locus?", "subject?", "projection?", "filters?", "budget?", "page?"],
      answerFields: ["schemaVersion", "inquiry", "outcome", "summary", "value?", "basis", "evidence", "openSeams", "page?", "continuations"],
      continuationFields: ["id?", "kind", "priority?", "rationale", "inquiry", "evidence?", "route?"],
      routeClaimFields: ["specId?", "plane", "relation", "basis?", "basisTransition?", "summary?"],
      basisTransitionFields: ["kind", "from", "to", "summary"],
    },
    implementedLenses: lenses.filter((lens) => implementedIds.has(lens.id)).map(toLensGuide),
    unavailableLensIds: lenses
      .filter((lens) => unavailableIds.has(lens.id))
      .map((lens) => lens.id),
    terrain: (map.value?.terrain ?? []).map((area) => ({
      id: area.id,
      kind: area.kind,
      status: area.status,
      ownership: area.ownership,
      root: area.root,
    })),
    firstMoves: continuations.map((continuation) => ({
      id: continuation.id,
      kind: continuation.kind,
      priority: continuation.priority,
      rationale: continuation.rationale,
      ask: continuation.inquiry,
    })),
    capabilityMoves: orientationCapabilityMoves(),
    openSeams: self.openSeams.map((seam) => ({
      id: seam.id,
      kind: seam.kind,
      summary: seam.summary,
    })),
    sourceProject: sourceProjectGuide(status.world.sourceProject),
  };
}

function orientationCapabilityMoves(): readonly OrientationCapabilityMove[] {
  return [
    {
      id: "typescript.ide-guide",
      family: "typescript",
      summary:
        "Learn exact TypeScript source, structure, checker, reference, call, and edit-affordance request shapes.",
      ask: {
        lens: LensId.TsType,
        locus: RepoRootLocus,
        projection: "guide",
      },
    },
    {
      id: "typescript.framework-exports",
      family: "typescript",
      summary:
        "Start with checker-visible exports from the Aurelia kernel package admitted from the in-repo submodule.",
      ask: {
        lens: LensId.TsStructure,
        locus: { kind: "package", packageId: "kernel" },
        projection: "exports",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.entities",
      family: "framework",
      summary:
        "Enter the Aurelia entity catalogs before asking semantic relationship or flow questions.",
      ask: {
        lens: LensId.FrameworkDiscovery,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.recipes",
      family: "framework",
      summary:
        "Use calibrated hop graphs that combine framework semantics with TypeScript source, type, and call-site reads.",
      ask: {
        lens: LensId.FrameworkDiscovery,
        locus: RepoRootLocus,
        projection: "recipes",
        budget: { rows: 12, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.compiler",
      family: "framework",
      summary:
        "Inspect compiler instruction-production rows before following them into renderer dispatch and controller hydration.",
      ask: {
        lens: LensId.FrameworkCompiler,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 20, evidencePerSubject: 3 },
      },
    },
    {
      id: "bridge.aulink",
      family: "bridge",
      summary:
        "Inspect product-to-framework anchors when semantic-runtime obligations need framework targets.",
      ask: {
        lens: LensId.BridgeAuLink,
        locus: RepoRootLocus,
        projection: "anchors",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "atlas.self",
      family: "self",
      summary:
        "Inspect Atlas architectural surfaces, taxonomy pressure, and continuation coherence.",
      ask: {
        lens: LensId.AtlasSelf,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "atlas.self-recipes",
      family: "self",
      summary:
        "Use calibrated hop graphs that combine Atlas self-analysis with TypeScript source, module, and checker reads.",
      ask: {
        lens: LensId.AtlasSelf,
        locus: RepoRootLocus,
        projection: "recipes",
        budget: { rows: 12, evidencePerSubject: 3 },
      },
    },
  ];
}

function sessionGuide(status: InquirySessionStatus): OrientationSessionGuide {
  return {
    packageName: status.packageName,
    pid: status.pid,
    buildHash: status.buildHash,
    uptimeMs: status.uptimeMs,
    world: {
      terrainAreas: status.world.terrainAreas,
      activeTerrainAreas: status.world.activeTerrainAreas,
      substrateContracts: status.world.substrateContracts,
      lensContracts: status.world.lensContracts,
      vocabularyDefinitions: status.world.vocabularyDefinitions,
    },
  };
}

function answerGuide(answer: Answer): OrientationAnswerGuide {
  return {
    outcome: answer.outcome,
    lens: answer.inquiry.lens,
    ...(answer.inquiry.projection === undefined
      ? {}
      : { projection: answer.inquiry.projection }),
    summary: answer.summary,
    basis: answer.basis.map((basis) => basis.kind),
    evidenceCount: answer.evidence.length,
    openSeamCount: answer.openSeams.length,
    continuationCount: answer.continuations.length,
  };
}

function toLensGuide(lens: NonNullable<InquirySurfaceMap["lenses"][number]>): OrientationLensGuide {
  return {
    id: lens.id,
    family: lens.family,
    stage: lens.stage,
    projectionIds: lens.projections.map((projection) => projection.id),
  };
}

function sourceProjectGuide(summary: SourceProjectSummary): OrientationSourceProjectGuide {
  return {
    snapshotKind: summary.snapshotKind,
    identity: summary.identity,
    packageCount: summary.packageCount,
    rootFileCount: summary.rootFileCount,
    programSourceFileCount: summary.programSourceFileCount,
    ownedSourceFileCount: summary.ownedSourceFileCount,
    declarationCount: summary.declarationCount,
    topLevelDeclarationCount: summary.topLevelDeclarationCount,
    configDiagnosticCount: summary.configDiagnosticCount,
    packageRoots: Object.fromEntries(
      summary.packages.map((sourcePackage) => [
        sourcePackage.id,
        sourcePackage.rootPath,
      ]),
    ),
  };
}
