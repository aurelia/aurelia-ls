import type { OutcomeKind } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import type { LensId } from "../inquiry/lens.js";

/** Schema marker for the on-disk inquiry session manifest. */
export const INQUIRY_SESSION_MANIFEST_VERSION = "atlas-session-v1" as const;

/** Loopback endpoint used by the local inquiry session daemon. */
export interface InquirySessionEndpoint {
  /** Host address; kept on loopback so no auth token is needed for local use. */
  readonly host: "127.0.0.1";
  /** Ephemeral TCP port selected by the daemon. */
  readonly port: number;
}

/** On-disk lease and identity for the active inquiry session daemon. */
export interface InquirySessionManifest {
  /** Versioned manifest schema id. */
  readonly schemaVersion: typeof INQUIRY_SESSION_MANIFEST_VERSION;
  /** Package identity for the daemon implementation. */
  readonly packageName: "@aurelia-ls/atlas";
  /** Process id of the daemon that owns this manifest. */
  readonly pid: number;
  /** Loopback endpoint where the daemon accepts line-delimited JSON requests. */
  readonly endpoint: InquirySessionEndpoint;
  /** Content hash of the compiled build output the daemon is running. */
  readonly buildHash: string;
  /** Absolute path to the daemon entrypoint used to start this process. */
  readonly daemonEntry: string;
  /** Absolute package root for atlas. */
  readonly packageRoot: string;
  /** Absolute repo root used for ignored runtime files. */
  readonly repoRoot: string;
  /** Absolute manifest path for this session. */
  readonly manifestPath: string;
  /** ISO timestamp when this daemon started. */
  readonly startedAt: string;
  /** ISO timestamp of the last manifest heartbeat. */
  readonly heartbeatAt: string;
  /** ISO timestamp of the last request handled by this daemon. */
  readonly lastRequestAt: string;
  /** Idle timeout after which the daemon exits itself. */
  readonly idleTtlMs: number;
  /** Heartbeat interval used to refresh the manifest lease. */
  readonly heartbeatIntervalMs: number;
}

/** Methods understood by the local inquiry session protocol. */
export const enum InquirySessionMethod {
  /** Return daemon identity, build hash, and world summary. */
  Status = "status",
  /** Ask the repo.map lens through the runtime API. */
  Map = "map",
  /** Ask one transport-neutral inquiry through the runtime API. */
  Ask = "ask",
  /** Follow one continuation through the runtime API. */
  Follow = "follow",
  /** Run lightweight self-coherence checks inside the daemon. */
  SelfCheck = "self.check",
  /** Politely stop the daemon after responding. */
  Shutdown = "shutdown",
}

/** Request envelope for one line-delimited protocol call. */
export interface InquirySessionRequest<TMethod extends InquirySessionMethod = InquirySessionMethod, TParams = unknown> {
  /** Caller-assigned request id echoed by the response. */
  readonly id: string;
  /** Method to invoke. */
  readonly method: TMethod;
  /** Method-specific parameters. */
  readonly params?: TParams;
}

/** Successful response envelope for one protocol call. */
export interface InquirySessionSuccess<TResult = unknown> {
  /** Request id being answered. */
  readonly id: string;
  /** Success discriminator. */
  readonly ok: true;
  /** Method-specific result payload. */
  readonly result: TResult;
}

/** Error payload returned when a protocol call fails. */
export interface InquirySessionErrorPayload {
  /** Stable broad error code. */
  readonly code: string;
  /** Human-readable error summary. */
  readonly message: string;
  /** Optional structured diagnostic details. */
  readonly data?: unknown;
}

/** Failed response envelope for one protocol call. */
export interface InquirySessionFailure {
  /** Request id being answered. */
  readonly id: string;
  /** Failure discriminator. */
  readonly ok: false;
  /** Structured error payload. */
  readonly error: InquirySessionErrorPayload;
}

/** Response envelope returned by the local inquiry session protocol. */
export type InquirySessionResponse<TResult = unknown> =
  | InquirySessionSuccess<TResult>
  | InquirySessionFailure;

/** Parameters accepted by the map protocol method. */
export interface InquirySessionMapParams {
  /** Optional focus value carried as the map inquiry subject. */
  readonly focus?: string;
}

/** Parameters accepted by the follow protocol method. */
export interface InquirySessionFollowParams {
  /** Continuation returned by a previous answer. */
  readonly continuation: Continuation;
}

/** Parameters accepted by the shutdown protocol method. */
export interface InquirySessionShutdownParams {
  /** Optional caller-supplied shutdown reason for logs and diagnostics. */
  readonly reason?: string;
}

/** Status result returned by the daemon. */
export interface InquirySessionStatus {
  /** Package identity for the daemon implementation. */
  readonly packageName: "@aurelia-ls/atlas";
  /** Process id of the daemon serving requests. */
  readonly pid: number;
  /** Build hash the daemon was started with. */
  readonly buildHash: string;
  /** Loopback endpoint currently serving requests. */
  readonly endpoint: InquirySessionEndpoint;
  /** Milliseconds since daemon start. */
  readonly uptimeMs: number;
  /** Milliseconds since the most recent handled request. */
  readonly idleMs: number;
  /** World summary exposed for cheap session inspection. */
  readonly world: InquirySessionWorldSummary;
  /** Runtime-implemented lens ids in this daemon. */
  readonly implementedLensIds: readonly LensId[];
}

/** Compact world summary used by status and self-check results. */
export interface InquirySessionWorldSummary {
  /** Terrain rows loaded into the runtime world. */
  readonly terrainAreas: number;
  /** Active terrain rows loaded into the runtime world. */
  readonly activeTerrainAreas: number;
  /** Substrate contracts loaded into the runtime world. */
  readonly substrateContracts: number;
  /** Lens contracts loaded into the runtime world. */
  readonly lensContracts: number;
  /** Atlas vocabulary definitions loaded into the runtime world. */
  readonly vocabularyDefinitions: number;
}

/** Self-check result returned by the daemon. */
export interface InquirySessionSelfCheckResult {
  /** Current daemon status after checks ran. */
  readonly status: InquirySessionStatus;
  /** Outcome returned by the map call. */
  readonly mapOutcome: OutcomeKind;
  /** Outcome returned by the terrain call. */
  readonly terrainOutcome: OutcomeKind;
  /** Outcome returned by the self-maintenance call. */
  readonly selfOutcome: OutcomeKind;
  /** Outcome returned by following the first map continuation, when available. */
  readonly followedOutcome?: OutcomeKind;
  /** Number of open seams surfaced by atlas.self. */
  readonly selfOpenSeams: number;
}

/** Result returned after accepting a shutdown request. */
export interface InquirySessionShutdownResult {
  /** True when the daemon accepted the shutdown request. */
  readonly accepted: true;
  /** Reason recorded for this shutdown. */
  readonly reason: string;
}
