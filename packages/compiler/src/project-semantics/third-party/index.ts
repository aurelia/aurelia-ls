/**
 * Third-party resource discovery and merge.
 *
 * Shared between Vite plugin and semantic workspace.
 */

// Types
export type {
  ThirdPartyOptions,
  ThirdPartyPolicy,
  ThirdPartyPackageSpec,
  ExplicitResourceConfig,
  ExplicitElementConfig,
  ExplicitAttributeConfig,
  ThirdPartyResolutionResult,
  ResolvedPackageSpec,
  ThirdPartyLogger,
} from "./types.js";

// Merge utilities
export {
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
} from "./merge.js";

// Resolution
export {
  resolveThirdPartyResources,
  applyThirdPartyResources,
  collectThirdPartyPackages,
  shouldScanPackage,
  buildAnalysisFingerprint,
  type ThirdPartyResolutionContext,
} from "./resolution.js";
