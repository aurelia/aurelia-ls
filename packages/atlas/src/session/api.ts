import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import { LensId } from "../inquiry/lens.js";
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
  /** Daemon identity, build hash, and cheap runtime-world counts. */
  readonly status: InquirySessionStatus;
  /** Surface-map answer returned by the same runtime as normal inquiries. */
  readonly map: Answer<InquirySurfaceMap>;
  /** Atlas self-maintenance answer for contract and implementation pressure. */
  readonly self: Answer<SelfValue>;
  /** Surface-map continuations lifted for quick first follow-up selection. */
  readonly continuations: readonly Continuation[];
  /** API usage guide derived from the live orientation answers. */
  readonly guide: OrientationGuide;
}

/** First-call usage guide that should keep callers out of Atlas source files. */
export interface OrientationGuide {
  /** What the orientation bundle is for. */
  readonly purpose: string;
  /** Stable package API calls available after orientation. */
  readonly entrypoints: OrientationEntrypoints;
  /** Shared request and answer lanes every lens uses. */
  readonly contract: OrientationContractGuide;
  /** Runtime-implemented lenses and their projections. */
  readonly implementedLenses: readonly OrientationLensGuide[];
  /** Contracted lenses that are not callable yet. */
  readonly unavailableLenses: readonly OrientationLensGuide[];
  /** Repository terrain and ownership rows that bound edit policy. */
  readonly terrain: readonly OrientationTerrainGuide[];
  /** Exact first inquiries a caller can ask next without opening source. */
  readonly firstMoves: readonly OrientationFirstMove[];
  /** Explicit open seams discovered during orientation. */
  readonly openSeams: readonly OrientationOpenSeamGuide[];
  /** Compact source-project footing behind TypeScript-backed inquiries. */
  readonly sourceProject: OrientationSourceProjectGuide;
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
}

/** Compact lens contract row for first-call orientation. */
export interface OrientationLensGuide {
  readonly id: string;
  readonly family: string;
  readonly stage: string;
  readonly summary: string;
  readonly projections: readonly OrientationProjectionGuide[];
  readonly requiredSubstrates: readonly string[];
}

/** Compact projection contract row for first-call orientation. */
export interface OrientationProjectionGuide {
  readonly id: string;
  readonly summary: string;
  readonly defaultBudget?: unknown;
}

/** Compact terrain row for first-call orientation. */
export interface OrientationTerrainGuide {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly ownership: string;
  readonly root: string;
  readonly summary: string;
}

/** Exact first move a caller can ask after orientation. */
export interface OrientationFirstMove {
  readonly id?: string;
  readonly kind: string;
  readonly priority?: string;
  readonly rationale: string;
  readonly ask: InquiryRuntimeRequest;
  readonly route?: Continuation["route"];
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
  readonly packageRoots: readonly OrientationPackageRootGuide[];
}

/** Compact admitted package root row for first-call orientation. */
export interface OrientationPackageRootGuide {
  readonly id: string;
  readonly rootPath: string;
  readonly tsconfigPath: string;
  readonly external: boolean;
  readonly sourceFileCount: number;
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
        status,
        map,
        self,
        continuations: map.continuations,
        guide: createOrientationGuide(status, map, self, map.continuations),
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
    purpose: "Use this bundle as the first Atlas read: choose a lens/projection, ask exact inquiries, follow continuations, and inspect seams without opening Atlas source.",
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
    },
    implementedLenses: lenses.filter((lens) => implementedIds.has(lens.id)).map(toLensGuide),
    unavailableLenses: lenses.filter((lens) => unavailableIds.has(lens.id)).map(toLensGuide),
    terrain: (map.value?.terrain ?? []).map((area) => ({
      id: area.id,
      kind: area.kind,
      status: area.status,
      ownership: area.ownership,
      root: area.root,
      summary: area.summary,
    })),
    firstMoves: continuations.map((continuation) => ({
      id: continuation.id,
      kind: continuation.kind,
      priority: continuation.priority,
      rationale: continuation.rationale,
      ask: continuation.inquiry,
      route: continuation.route,
    })),
    openSeams: self.openSeams.map((seam) => ({
      id: seam.id,
      kind: seam.kind,
      summary: seam.summary,
    })),
    sourceProject: sourceProjectGuide(status.world.sourceProject),
  };
}

function toLensGuide(lens: NonNullable<InquirySurfaceMap["lenses"][number]>): OrientationLensGuide {
  return {
    id: lens.id,
    family: lens.family,
    stage: lens.stage,
    summary: lens.summary,
    projections: lens.projections.map((projection) => ({
      id: projection.id,
      summary: projection.summary,
      ...(projection.defaultBudget === undefined ? {} : { defaultBudget: projection.defaultBudget }),
    })),
    requiredSubstrates: lens.requiredSubstrates,
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
    packageRoots: summary.packages.map((sourcePackage) => ({
      id: sourcePackage.id,
      rootPath: sourcePackage.rootPath,
      tsconfigPath: sourcePackage.tsconfigPath,
      external: sourcePackage.external,
      sourceFileCount: sourcePackage.sourceFileCount,
    })),
  };
}
