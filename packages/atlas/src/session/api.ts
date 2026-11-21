import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import type { LensId } from "../inquiry/lens.js";
import type {
  FrameworkEmulationSymbolsReport,
  InquiryRuntimeRequest,
} from "../inquiry/runtime/index.js";
import type { InquirySurfaceMap } from "../inquiry/surface-map.js";
import { ensureInquirySession, shutdownExistingInquirySession, type EnsureInquirySessionOptions, type InquirySessionClient } from "./client.js";
import { ownsInquirySessionManifest } from "./manifest.js";
import type {
  InquirySessionSelfCheckResult,
  InquirySessionShutdownResult,
  InquirySessionStatus,
} from "./protocol.js";

/** Session-backed API whose source reads and continuations share one immutable TypeScript epoch. */
export interface Api {
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

/** Create an API that selects the current epoch on first use. Create another after editing source or rebuilding Atlas. */
export function createApi(
  /** Session startup and probing options. */
  options: EnsureInquirySessionOptions = {},
): Api {
  let pinned: InquirySessionClient | undefined;
  let opening: Promise<InquirySessionClient> | undefined;
  async function sessionForRead() {
    if (pinned === undefined) {
      opening ??= ensureInquirySession(options).then((client) => {
        pinned = client;
        return client;
      }).finally(() => { opening = undefined; });
      return opening;
    }
    if (!ownsInquirySessionManifest(pinned.manifest)) {
      throw new Error("The pinned Atlas session ended. Create a new API and restart the inquiry.");
    }
    return pinned;
  }
  return {
    status: async () => {
      const session = await sessionForRead();
      return session.status();
    },
    map: async (focus) => {
      const session = await sessionForRead();
      return session.map(focus);
    },
    ask: async (input) => {
      const session = await sessionForRead();
      return session.ask(input);
    },
    follow: async (continuation) => {
      const session = await sessionForRead();
      return session.follow(continuation);
    },
    frameworkEmulationSymbolsReport: async () => {
      const session = await sessionForRead();
      return session.frameworkEmulationSymbolsReport();
    },
    selfCheck: async () => {
      const session = await sessionForRead();
      return session.selfCheck();
    },
    shutdown: async (reason = "client requested shutdown") => {
      if (opening !== undefined) await opening;
      if (pinned === undefined) {
        return { accepted: await shutdownExistingInquirySession({ ...options, reason }), reason };
      }
      return ownsInquirySessionManifest(pinned.manifest) ? pinned.shutdown(reason) : { accepted: false, reason };
    },
    isImplemented: async (lens) => {
      const session = await sessionForRead();
      return session.isImplemented(lens);
    },
  };
}
