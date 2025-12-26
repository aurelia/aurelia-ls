/**
 * Entry Point Transform Module
 *
 * Analyzes and transforms Aurelia entry points (main.ts) to enable
 * tree-shaking of unused framework features.
 */

// Types
export type {
  EntryPointAnalysis,
  ConfigLocation,
  PreservedRegistration,
  ImportAnalysis,
  AureliaImport,
  ImportSpecifier,
  InitChain,
  ChainMethod,
  ConfigBuildOptions,
  ConfigBuildResult,
  RequiredImport,
  EntryTransformOptions,
  EntryTransformResult,
  KnownConfiguration,
} from "./types.js";

export { KNOWN_CONFIGURATIONS, isKnownConfiguration } from "./types.js";

// Analysis
export { analyzeEntryPoint, shouldTransformEntryPoint } from "./analyze.js";

// Config building
export {
  buildAotConfiguration,
  generateImportStatements,
  generateInitialization,
  generateEntryPointCode,
} from "./build-config.js";

// Transformation
export { transformEntryPoint, transformSimpleEntryPoint } from "./transform.js";
