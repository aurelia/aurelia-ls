import type { Answer } from "../answer.js";
import type { Continuation } from "../continuation.js";
import { LensId } from "../lens.js";
import { RepoRootLocus } from "../locus.js";
import type { InquirySurfaceMap } from "../surface-map.js";
import { createSourceProject, type SourceProject } from "../../source/index.js";
import { InquiryEngine, type InquiryRuntimeRequest } from "./engine.js";
import { createDefaultInquiryWorld, type InquiryWorld } from "./world.js";

/** Options for creating an in-memory runtime. */
export interface CreateInMemoryApiOptions {
  /** Contract world used by the inquiry engine. */
  readonly world?: InquiryWorld;
  /** Hot source project shared by source, checker, and TypeChecker-driven semantic lenses. */
  readonly sourceProject?: SourceProject;
}

/** In-memory API for asking and following inquiries inside one process. */
export interface InMemoryApi {
  /** Contract world used by this API instance. */
  readonly world: InquiryWorld;
  /** Hot source project used by source-backed substrates. */
  readonly sourceProject: SourceProject;
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
export function createInMemoryApi(
  /** Optional runtime construction options for tests or local experiments. */
  options: CreateInMemoryApiOptions = {},
): InMemoryApi {
  const world = options.world ?? createDefaultInquiryWorld();
  const sourceProject = options.sourceProject ?? createSourceProject();
  const engine = new InquiryEngine(world, { sourceProject });
  return {
    world,
    sourceProject,
    implementedLensIds: engine.implementedLensIds(),
    ask: (input) => engine.ask(input),
    follow: (continuation) => engine.follow(continuation),
    map: (focus) =>
      engine.ask({
        lens: LensId.RepoMap,
        locus: RepoRootLocus,
        projection: "summary",
        ...(focus === undefined ? {} : { subject: focus }),
      }) as Promise<Answer<InquirySurfaceMap>>,
    isImplemented: (lens) => engine.isImplemented(lens),
  };
}
