import { emptyDiscoveryResult } from "./shared.js";
import type { DiscoveryResult } from "./types.js";
import type { Logger } from "../../types.js";
import type ts from "typescript";

/**
 * Placeholder for DI registration/local dependency scanning.
 * Will eventually surface resource registrations for scoped graphs.
 */
export function runDiRegistryDiscovery(_program: ts.Program, _logger: Logger): DiscoveryResult {
  return emptyDiscoveryResult();
}
