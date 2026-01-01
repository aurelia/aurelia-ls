/**
 * Normalization functions for convention configuration.
 *
 * Converts user-friendly configuration types to internal types used by
 * the resolution pipeline.
 */

import type { DirectoryConvention, DirectoryScope } from "../project/types.js";
import type {
  DirectoryConventionConfig,
  DirectoryRule,
  DirectoryScopeKind,
} from "./types.js";
import { DEFAULT_DIRECTORY_CONVENTIONS } from "../project/types.js";

/**
 * Convert user-friendly scope string to internal discriminated union.
 */
export function normalizeScope(scope: DirectoryScopeKind): DirectoryScope {
  switch (scope) {
    case "global":
      return { kind: "global" };
    case "local":
      return { kind: "local" };
    case "router":
      return { kind: "router" };
  }
}

/**
 * Convert user-friendly DirectoryRule to internal DirectoryConvention.
 */
export function normalizeDirectoryRule(rule: DirectoryRule): DirectoryConvention {
  return {
    pattern: rule.pattern,
    scope: normalizeScope(rule.scope),
    priority: rule.priority ?? 0,
    description: rule.description,
  };
}

/**
 * Convert user-friendly DirectoryConventionConfig to internal DirectoryConvention[].
 *
 * Handles merging with defaults based on `replaceDefaults` option.
 */
export function normalizeDirectoryConventions(
  config: DirectoryConventionConfig | undefined
): readonly DirectoryConvention[] {
  if (!config?.rules?.length) {
    return DEFAULT_DIRECTORY_CONVENTIONS;
  }

  const normalized = config.rules.map(normalizeDirectoryRule);

  if (config.replaceDefaults) {
    return normalized;
  }

  // Merge: user rules take precedence (added after defaults)
  return [...DEFAULT_DIRECTORY_CONVENTIONS, ...normalized];
}
