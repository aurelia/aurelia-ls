import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import { LensId, type LensFamily, type LensStage } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type {
  FrameworkEmulationSymbolsReport,
  InquiryRuntimeRequest,
  SelfValue,
} from "../inquiry/runtime/index.js";
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
  /** Local package scripts that are useful before opening source files. */
  readonly scripts: readonly OrientationScriptGuide[];
  /** Compact docs that preserve current intent and should be read after orient when context allows. */
  readonly docs: readonly OrientationDocumentGuide[];
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
  readonly frameworkEmulationSymbolsReport: "createApi().frameworkEmulationSymbolsReport()";
  readonly selfCheck: "createApi().selfCheck()";
}

/** Compact package-script row for first-call orientation. */
export interface OrientationScriptGuide {
  readonly id: string;
  readonly command: string;
  readonly summary: string;
}

/** Compact documentation pointer for follow-up orientation. */
export interface OrientationDocumentGuide {
  readonly id: string;
  readonly path: string;
  readonly summary: string;
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
  /** Non-external package roots that are safe to expose in first-pass orientation. */
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
  /** Build the deterministic framework emulation symbols Markdown report. */
  frameworkEmulationSymbolsReport(): Promise<FrameworkEmulationSymbolsReport>;
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
    frameworkEmulationSymbolsReport: async () => {
      const session = await ensureInquirySession(options);
      return session.frameworkEmulationSymbolsReport();
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
      frameworkEmulationSymbolsReport: "createApi().frameworkEmulationSymbolsReport()",
      selfCheck: "createApi().selfCheck()",
    },
    scripts: orientationScripts(),
    docs: orientationDocs(),
    contract: {
      requestFields: ["lens", "locus?", "subject?", "projection?", "filters?", "budget?", "page?"],
      answerFields: ["schemaVersion", "inquiry", "outcome", "summary", "value?", "basis", "evidence", "openSeams", "page?", "continuations"],
      continuationFields: ["id?", "kind", "priority?", "rationale", "inquiry", "evidence?", "route?"],
      routeClaimFields: ["specId?", "semanticRouteId?", "plane", "relation", "basis?", "basisTransition?", "summary?"],
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

function orientationDocs(): readonly OrientationDocumentGuide[] {
  return [
    {
      id: "repo.agents",
      path: "AGENTS.md",
      summary:
        "Repo-level agent policy: Atlas-first workflow, semantic-runtime ownership, external checkout boundary, and commit style.",
    },
    {
      id: "atlas.agent-handoff",
      path: "packages/atlas/workbench/agent-handoff.md",
      summary:
        "Compact post-orient handoff for future sessions: fast lanes, product architecture costs, mapping policy, and current pressure pointers.",
    },
    {
      id: "atlas.readme",
      path: "packages/atlas/README.md",
      summary:
        "Atlas package overview and high-level inquiry/substrate ownership notes.",
    },
    {
      id: "atlas.framework-workbench",
      path: "packages/atlas/src/framework/WORKBENCH.md",
      summary:
        "Near-work framework-emulation notes and pressure pointers for Atlas framework lenses.",
    },
    {
      id: "semantic-runtime.workbench",
      path: "packages/semantic-runtime/src/WORKBENCH.md",
      summary:
        "Semantic-runtime workbench notes for the current product substrate.",
    },
    {
      id: "semantic-runtime.controller-binding-lifecycle",
      path: "packages/semantic-runtime/src/WORKBENCH-controller-binding-lifecycle.md",
      summary:
        "Durable controller, binding, observer-locator, target-operation, and recursive hydration pressure notes.",
    },
  ];
}

function orientationScripts(): readonly OrientationScriptGuide[] {
  return [
    {
      id: "orient",
      command: "pnpm --filter @aurelia-ls/atlas orient",
      summary:
        "Print a compact live orientation through the auto-starting session API.",
    },
    {
      id: "orient:json",
      command: "pnpm --filter @aurelia-ls/atlas orient:json",
      summary:
        "Print the full request-shaped orientation bundle for tools that need machine-readable detail.",
    },
    {
      id: "pressure:self",
      command: "pnpm --filter @aurelia-ls/atlas pressure:self",
      summary:
        "Print compact Atlas source-file, class, function, duplicate-helper, and high-axis-pressure rows before maintenance refactors.",
    },
    {
      id: "profile:self",
      command: "pnpm --filter @aurelia-ls/atlas profile:self",
      summary:
        "Profile major atlas.self projection timings before cache, split, or phase-boundary work.",
    },
    {
      id: "memory",
      command: "pnpm --filter @aurelia-ls/atlas memory",
      summary:
        "Print queryable Atlas memory: durable intent records joined to live source pressure, stale status, reuse guidance, and path filters.",
    },
    {
      id: "memory:json",
      command: "pnpm --filter @aurelia-ls/atlas memory:json",
      summary:
        "Print the exact atlas.memory answer payload for tools that need machine-readable memory records.",
    },
    {
      id: "memory:next",
      command: "pnpm --filter @aurelia-ls/atlas memory:next",
      summary:
        "Print ranked next actions computed from Atlas memory, stale records, and live source pressure.",
    },
    {
      id: "pressure:self:detail",
      command: "pnpm --filter @aurelia-ls/atlas pressure:self:detail",
      summary:
        "Print the detailed Atlas self-pressure rows when compact output is not enough.",
    },
    {
      id: "pressure:product-architecture",
      command: "pnpm --filter @aurelia-ls/atlas pressure:product-architecture",
      summary:
        "Print compact semantic-runtime structure, function, kernel-record, and provenance pressure before product cleanup passes.",
    },
    {
      id: "pressure:product-architecture:detail",
      command: "pnpm --filter @aurelia-ls/atlas pressure:product-architecture:detail",
      summary:
        "Print the detailed semantic-runtime pressure rows when compact output is not enough.",
    },
    {
      id: "expression:coverage",
      command: "pnpm --filter @aurelia-ls/atlas expression:coverage",
      summary:
        "Print semantic-runtime expression AST kind construction, overlay support, and evaluator/observer consumer coverage.",
    },
    {
      id: "pressure:framework-resources",
      command: "pnpm --filter @aurelia-ls/atlas pressure:framework-resources",
      summary:
        "Print framework resource convergence, lane, and exact source-site role pressure.",
    },
    {
      id: "framework:capabilities",
      command: "pnpm --filter @aurelia-ls/atlas framework:capabilities -- --projection=catalog --detail",
      summary:
        "Query curated Aurelia capability terrain before deriving app-builder or MCP guidance.",
    },
    {
      id: "pressure:framework-corpus",
      command: "pnpm --filter @aurelia-ls/atlas pressure:framework-corpus",
      summary:
        "Print compact public Aurelia docs and framework test corpus pressure.",
    },
    {
      id: "framework:corpus",
      command: "pnpm --filter @aurelia-ls/atlas framework:corpus -- --projection=doc-snippets --concept=forms",
      summary:
        "Query framework.corpus docs/test rows for targeted fixture and authoring seeds.",
    },
    {
      id: "pressure:framework-observation",
      command: "pnpm --filter @aurelia-ls/atlas pressure:framework-observation",
      summary:
        "Print framework observer, binding-lookup, binding-setup, flow-site, and observation relationship pressure.",
    },
    {
      id: "pressure:bridge-aulink",
      command: "pnpm --filter @aurelia-ls/atlas pressure:bridge-aulink",
      summary:
        "Print product-to-framework auLink coverage, role evidence, emulation obligation, and usage-divergence pressure.",
    },
    {
      id: "pressure:framework-errors",
      command: "pnpm --filter @aurelia-ls/atlas pressure:framework-errors",
      summary:
        "Print framework error/event code definitions, mapped messages, usage mechanisms, and effects for diagnostic grounding.",
    },
    {
      id: "pressure:framework-router",
      command: "pnpm --filter @aurelia-ls/atlas pressure:framework-router",
      summary:
        "Print framework router flow, relationship-axis, and flow self-audit pressure.",
    },
    {
      id: "pressure:plugin-architecture",
      command: "pnpm --filter @aurelia-ls/atlas pressure:plugin-architecture",
      summary:
        "Print public Aurelia plugin package and source-surface aggregate pressure.",
    },
    {
      id: "pressure:workspace-architecture",
      command: "pnpm --filter @aurelia-ls/atlas pressure:workspace-architecture",
      summary:
        "Print clean-room workspace, external-root, and Aurelia source-surface aggregate pressure.",
    },
    {
      id: "profile:workspace-architecture",
      command: "pnpm --filter @aurelia-ls/atlas profile:workspace-architecture",
      summary:
        "Profile workspace architecture manifest/file-inventory, source scan, attribution, profile inference, and rollup phases.",
    },
    {
      id: "profile:product-architecture",
      command: "pnpm --filter @aurelia-ls/atlas profile:product-architecture",
      summary:
        "Profile structure, core, symbol, and full product.architecture lanes before cache or split work.",
    },
    {
      id: "report:framework-emulation",
      command: "pnpm --filter @aurelia-ls/atlas report:framework-emulation",
      summary:
        "Regenerate the deterministic framework emulation Markdown report.",
    },
    {
      id: "self-check",
      command: "pnpm --filter @aurelia-ls/atlas self-check",
      summary:
        "Validate the live inquiry surface map, contracted lenses, continuations, and answer invariants.",
    },
  ];
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
      id: "framework.api",
      family: "framework",
      summary:
        "Inspect exact Aurelia API subjects, implementation shapes, normalized member slots, and repo-wide usage rows.",
      ask: {
        lens: LensId.FrameworkApi,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 20, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.composition",
      family: "framework",
      summary:
        "Compose high-salience framework classes and interfaces with auLink anchors and signed relationship claims.",
      ask: {
        lens: LensId.FrameworkComposition,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 20, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.capabilities",
      family: "framework",
      summary:
        "Inspect curated Aurelia capability terrain before deriving consumer-specific app-builder or public MCP guidance.",
      ask: {
        lens: LensId.FrameworkCapabilities,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 30, evidencePerSubject: 2 },
      },
    },
    {
      id: "framework.router",
      family: "framework",
      summary:
        "Inspect router route-config/navigation flow, flow self-audit rows, normalized relationships, route-context, route-tree, viewport-agent, route-recognizer, DI, resource, lifecycle surfaces, and semantic route hops before semantic-runtime router modeling.",
      ask: {
        lens: LensId.FrameworkRouter,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 30, evidencePerSubject: 3 },
      },
    },
    {
      id: "framework.observation",
      family: "framework",
      summary:
        "Inspect observer entities, binding observer lookups/setups, observation flow sites, and flow-to-entity relationships before semantic-runtime observer work.",
      ask: {
        lens: LensId.FrameworkObservation,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 30, evidencePerSubject: 3 },
      },
    },
    {
      id: "workspace.architecture",
      family: "repo",
      summary:
        "Inspect admitted package topology, Aurelia entrypoint signals, build-tool hints, resource/configuration surfaces, and external-root pressure.",
      ask: {
        lens: LensId.WorkspaceArchitecture,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "plugin.architecture",
      family: "framework",
      summary:
        "Inspect import/receiver-aware public Aurelia plugin packages, resources, registries, DI registrations, AppTasks, router hooks, resolve calls, and template references.",
      ask: {
        lens: LensId.PluginArchitecture,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
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
      id: "product.vocabulary",
      family: "product",
      summary:
        "Inspect semantic-runtime vocabulary definitions, exact source usages, claim signatures, and product-kind adjacency.",
      ask: {
        lens: LensId.ProductVocabulary,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "product.architecture",
      family: "product",
      summary:
        "Inspect semantic-runtime areas, modules, declarations, implementation bodies, imports, checker-backed calls, and symbol coupling.",
      ask: {
        lens: LensId.ProductArchitecture,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
    },
    {
      id: "product.architecture-profile",
      family: "product",
      summary:
        "Profile full cold product.architecture phase costs; use profile:product-architecture for all lanes.",
      ask: {
        lens: LensId.ProductArchitecture,
        locus: RepoRootLocus,
        projection: "profile",
        budget: { evidencePerSubject: 20 },
      },
    },
    {
      id: "product.architecture-pressure",
      family: "product",
      summary:
        "Inspect semantic-runtime function call pressure rows; use pressure:product-architecture for the broader structure/function/product-record bundle.",
      ask: {
        lens: LensId.ProductArchitecture,
        locus: RepoRootLocus,
        projection: "functions",
        filters: {
          minLineCount: 35,
          minCallSiteCount: 5,
          minCrossAreaCallSiteCount: 2,
          orderBy: "crossAreaCallSiteCount",
        },
        budget: { rows: 30, evidencePerSubject: 2 },
      },
    },
    {
      id: "atlas.self",
      family: "self",
      summary:
        "Inspect exact Atlas source surfaces, value spaces, and continuation rows.",
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
        "Use stored self-maintenance recipes when they fit the current architecture question.",
      ask: {
        lens: LensId.AtlasSelf,
        locus: RepoRootLocus,
        projection: "recipes",
        budget: { rows: 12, evidencePerSubject: 3 },
      },
    },
    {
      id: "atlas.self-pressure",
      family: "self",
      summary:
        "Inspect high source-backed Atlas axis pressure before maintenance refactors.",
      ask: {
        lens: LensId.AtlasSelf,
        locus: RepoRootLocus,
        projection: "axis-pressure",
        filters: { pressure: "high" },
        budget: { rows: 12, evidencePerSubject: 2 },
      },
    },
    {
      id: "atlas.memory",
      family: "self",
      summary:
        "Inspect durable agent/maintainer memory joined to live source pressure before relying on markdown workbenches.",
      ask: {
        lens: LensId.AtlasMemory,
        locus: RepoRootLocus,
        projection: "summary",
        budget: { rows: 20, evidencePerSubject: 3 },
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
    projection: answer.inquiry.projection,
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
      summary.packages
        .filter((sourcePackage) => !sourcePackage.external)
        .map((sourcePackage) => [
          sourcePackage.id,
          sourcePackage.rootPath,
        ]),
    ),
  };
}
