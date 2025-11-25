import { emptyDiscoveryResult } from "./shared.js";
import type { DiscoveryResult } from "./types.js";
import type { Logger } from "../../types.js";
import type ts from "typescript";

/**
 * Placeholder for convention-based resource discovery (e.g., filename/dir-based).
 * Currently returns no resources; structure is ready for future heuristics.
 */
export function runConventionDiscovery(_program: ts.Program, _logger: Logger): DiscoveryResult {
  return emptyDiscoveryResult();
}
