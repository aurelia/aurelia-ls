import type { NormalizedPath } from "../model/identity.js";
import type { ConvergenceRef, ResourceDef } from "../schema/types.js";

/**
 * A convergence entry: the resolved state of a single resource.
 *
 * In the L2 target, the SemanticModel stores entries directly as
 * `Map<string, ConvergenceEntry>`. Currently backed by ResourceDef
 * from the discovery result. This bridge type will evolve toward the
 * full L2 ConvergenceEntry (observations, decision, gaps, ref).
 */
export interface ConvergenceEntry {
  readonly kind: string;
  readonly name: string;
  readonly key: string;
  readonly def: ResourceDef;
  readonly file?: NormalizedPath;
  /** Opaque identity ref for provenance queries. */
  readonly ref: ConvergenceRef;
}
