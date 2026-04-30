import type { Answer } from "../answer.js";
import type { Continuation } from "../continuation.js";
import { LensId } from "../lens.js";
import { RepoRootLocus } from "../locus.js";
import type { InquirySurfaceMap } from "../surface-map.js";
import { InquiryEngine, type InquiryRuntimeRequest } from "./engine.js";
import { createDefaultInquiryWorld, type InquiryWorld } from "./world.js";

/** In-memory API for asking and following Atlas inquiries inside one process. */
export interface InMemoryAtlasApi {
  /** Contract world used by this API instance. */
  readonly world: InquiryWorld;
  /** Lens ids with runtime implementations in this API instance. */
  readonly implementedLensIds: readonly LensId[];
  /** Ask one inquiry or transport-shaped request. */
  ask(input: InquiryRuntimeRequest): Promise<Answer>;
  /** Follow one continuation returned by a previous answer. */
  follow(continuation: Continuation): Promise<Answer>;
  /** Return the surface map through the same runtime engine as normal inquiries. */
  map(focus?: string): Promise<Answer<InquirySurfaceMap>>;
  /** True when a lens id has a runtime implementation. */
  isImplemented(lens: LensId): boolean;
}

/** Create the default package-local in-memory inquiry API. */
export function createInMemoryAtlasApi(
  /** Optional contract world for tests or local experiments. */
  world: InquiryWorld = createDefaultInquiryWorld(),
): InMemoryAtlasApi {
  const engine = new InquiryEngine(world);
  return {
    world,
    implementedLensIds: engine.implementedLensIds(),
    ask: (input) => engine.ask(input),
    follow: (continuation) => engine.follow(continuation),
    map: (focus) => engine.ask({
      lens: LensId.RepoMap,
      locus: RepoRootLocus,
      projection: "summary",
      ...(focus === undefined ? {} : { subject: focus }),
    }) as Promise<Answer<InquirySurfaceMap>>,
    isImplemented: (lens) => engine.isImplemented(lens),
  };
}
