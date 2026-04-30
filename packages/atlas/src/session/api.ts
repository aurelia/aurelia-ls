import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { InquiryRuntimeRequest, SelfValue } from "../inquiry/runtime/index.js";
import type { InquirySurfaceMap } from "../inquiry/surface-map.js";
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
