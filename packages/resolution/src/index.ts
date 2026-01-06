// Resolution package public API
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the AOT compiler uses for template compilation.
//
// Architecture:
// - File Discovery (Layer 0): File enumeration, sibling detection
// - Extraction (Layer 1): AST → SourceFacts (with DependencyRef.resolvedPath: null)
// - Import Resolution (Layer 1.5): Populate DependencyRef.resolvedPath
// - Inference (Layer 2): SourceFacts → ResourceCandidate[]
// - Registration (Layer 3): SourceFacts + ResourceCandidate[] → RegistrationAnalysis
// - Scope (Layer 4): RegistrationAnalysis → ResourceGraph
//
// See docs/resolution-architecture.md for details.
// See docs/registration-analysis-design.md for the three-phase model.

// === Re-export compiler types for convenience ===
export type {
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
  ElementRes,
  AttrRes,
  Bindable,
  ValueConverterSig,
  BindingBehaviorSig,
  Semantics,
  NormalizedPath,
} from "@aurelia-ls/compiler";

// === Main entry point ===
export { resolve, type ResolutionConfig, type ResolutionResult, type ResolutionDiagnostic, type TemplateInfo, type InlineTemplateInfo } from "./resolve.js";

// === Shared types ===
export type { Logger } from "./types.js";

// === File Discovery (Layer 0) ===
export {
  // File System Context
  createNodeFileSystem,
  createMockFileSystem,
  getFileType,
  createProjectFile,
  pathsEqual,
  getBaseName,
  getExtension,
  getDirectory,
  // Sibling Detection
  detectSiblings,
  findTemplateSibling,
  findStylesheetSibling,
  classMatchesFileName,
  toSiblingFacts,
  buildFilePair,
  detectSiblingsBatch,
  findOrphanTemplates,
  findSourcesWithoutTemplates,
  // Project Scanner
  createProjectScanner,
  createProjectScannerFromProgram,
  // Directory Conventions
  DEFAULT_CONVENTIONS,
  matchDirectoryConventions,
  matchDirectoryConvention,
  buildConventionList,
  describeScope,
  isGlobalScope,
  isRouterScope,
  conventionBuilder,
  // Constants
  FILE_EXTENSIONS,
  DEFAULT_TEMPLATE_EXTENSIONS,
  DEFAULT_STYLE_EXTENSIONS,
  DEFAULT_DIRECTORY_CONVENTIONS,
  DEFAULT_SCANNER_OPTIONS,
  DEFAULT_EXTRACTION_OPTIONS,
} from "./project/index.js";

export type {
  // Core Types
  SiblingFile,
  SiblingFileFact,
  ProjectFile,
  ProjectFileType,
  ProjectStructure,
  FilePair,
  PairingDetection,
  DirectoryConvention,
  DirectoryScope,
  DirectoryMatch,
  ProjectScannerOptions,
  ProjectExtractionOptions,
  // File System Context
  FileSystemContext,
  FileSystemContextOptions,
  GlobOptions,
  WatchCallback,
  WatchEvent,
  Disposable,
  FileStat,
  // Mock
  MockFileSystemOptions,
  MockFileSystemContext,
  // Sibling Detection
  SiblingDetectionOptions,
  FilePairOptions,
  // Project Scanner
  ProjectScanner,
  // Directory Conventions (internal)
  DirectoryConventionListConfig,
  ConventionBuilder,
} from "./project/index.js";

// === Extraction (Layer 1) ===
export { extractAllFacts, extractSourceFacts, extractDefineCalls, resolveImports } from "./extraction/index.js";
export type { ExtractionOptions } from "./extraction/index.js";
export type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  StaticAuFact,
  StaticDependenciesFact,
  BindableMemberFact,
  RegistrationCallFact,
  DefineCallFact,
  BindingMode,
  DependencyRef,
} from "./extraction/index.js";

// === Export Binding Resolution (Layer 1.5) ===
export { buildExportBindingMap, lookupExportBinding } from "./binding/index.js";
export type {
  ResolvedExport,
  FileExportBindings,
  ExportBindingMap,
  ExportLookupResult,
} from "./binding/index.js";

// === Inference (Layer 2) ===
export { createResolverPipeline, resolveFromDecorators, resolveFromStaticAu, resolveFromDefine, resolveFromConventions } from "./inference/index.js";
export type { ResourceCandidate, BindableSpec, ResolverPipeline } from "./inference/index.js";

// === Registration (Layer 3) ===
export { createRegistrationAnalyzer, buildImportGraph } from "./registration/index.js";
export type { RegistrationAnalyzer, ImportGraph } from "./registration/index.js";
// New registration model (see types.ts for design rationale)
export type {
  RegistrationAnalysis,
  RegistrationSite,
  RegistrationScope,
  ResourceRef,
  RegistrationEvidence,
  OrphanResource,
  UnresolvedRegistration,
  UnresolvedPattern,
  LocalRegistrationSite,
  ResolvedRegistrationSite,
} from "./registration/index.js";
export {
  isLocalSite,
  isGlobalSite,
  isResolvedSite,
  isUnresolvedSite,
} from "./registration/index.js";

// === Scope (Layer 4) ===
export { buildResourceGraph } from "./scope/index.js";

// === Conventions ===
export type {
  // Core config
  ConventionConfig,
  SuffixConfig,
  FilePatternConfig,
  // Directory conventions (user-friendly)
  DirectoryConventionConfig,
  DirectoryRule,
  DirectoryScopeKind,
  // File pairing
  TemplatePairingConfig,
  StylesheetPairingConfig,
} from "./conventions/index.js";
export {
  // Decorator names (used by transform package)
  DECORATOR_NAMES,
  RESOURCE_DECORATOR_NAMES,
  // Suffix patterns and defaults
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
  // Functions
  getResourceTypeFromClassName,
  stripResourceSuffix,
  // Normalization (user-friendly → internal)
  normalizeScope,
  normalizeDirectoryRule,
  normalizeDirectoryConventions,
} from "./conventions/index.js";

// === Utilities ===
export {
  toKebabCase,
  toCamelCase,
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalBindableName,
  canonicalAliases,
  canonicalPath,
  isKindOfSame,
} from "./util/index.js";

// === Fingerprint ===
export { hashObject, stableStringify, normalizeCompilerOptions } from "./fingerprint/index.js";

// === Routes (SSG route discovery) ===
export {
  extractRouteConfig,
  extractFromDecorator,
  extractFromStaticProperty,
  extractComponentRef,
  extractPathParams,
  hasGetRouteConfigMethod,
  buildRouteTree,
} from "./routes/index.js";
export type {
  ExtractedRouteConfig,
  ExtractedChildRoute,
  ComponentRef,
  RouteTree,
  RouteNode,
  RouteSource,
  ParameterizedRoute,
  DynamicRouteComponent,
  RouteTreeOptions,
} from "./routes/index.js";

// === Plugins (Known plugin manifests) ===
export {
  ROUTER_MANIFEST,
  STANDARD_CONFIGURATION_MANIFEST,
  DEFAULT_PLUGIN_MANIFESTS,
  getPluginManifest,
  hasPlugins,
  createPluginResolver,
  createPluginResolverWithManifests,
  isCustomizeCall,
  mightBePluginByName,
  traceIdentifierImport,
  traceMemberAccessImport,
} from "./plugins/index.js";
export type {
  ImportOrigin,
  PluginManifest,
  PluginManifestRegistry,
  PluginResolution,
  PluginResolver,
} from "./plugins/index.js";

// === Diagnostics (Error codes and conversion) ===
export {
  // Orphan codes
  RES0001_ORPHAN_ELEMENT,
  RES0002_ORPHAN_ATTRIBUTE,
  RES0003_ORPHAN_VALUE_CONVERTER,
  RES0004_ORPHAN_BINDING_BEHAVIOR,
  // Unanalyzable codes
  RES0010_UNANALYZABLE_FUNCTION_CALL,
  RES0011_UNANALYZABLE_VARIABLE,
  RES0012_UNANALYZABLE_CONDITIONAL,
  RES0013_UNANALYZABLE_SPREAD,
  RES0014_UNANALYZABLE_PROPERTY_ACCESS,
  RES0019_UNANALYZABLE_OTHER,
  // Import/resolution codes
  RES0020_UNRESOLVED_IMPORT,
  RES0021_NOT_A_RESOURCE,
  // Plugin codes
  RES0030_PLUGIN_REQUIRED,
  // Helpers
  getOrphanCode,
  getUnanalyzableCode,
  // Conversion (for custom diagnostic processing)
  orphansToDiagnostics,
  unresolvedToDiagnostics,
  unresolvedRefsToDiagnostics,
  // Plugin-aware hints (for compiler error messages)
  lookupElementPluginHint,
  lookupAttributePluginHint,
  formatPluginHintMessage,
} from "./diagnostics/index.js";
export type { PluginHint, PluginHintResult, UnresolvedResourceInfo } from "./diagnostics/index.js";

// === NPM Package Analysis ===
// Extracts Aurelia resource semantics from npm packages.
// Used by app mode to understand dependencies, and by library mode to generate manifests.
// See docs/npm-analysis-design.md for architecture.
export {
  analyzePackage,
  analyzePackages,
  isAureliaPackage,
  // Package scanner
  scanPackage,
  getSourceEntryPoint,
  // Utility functions
  success,
  partial,
  combine,
  gap,
} from "./npm/index.js";
export type {
  // Analysis result types
  AnalysisResult,
  Confidence,
  AnalysisGap,
  GapLocation,
  GapReason,
  // Package analysis types
  PackageAnalysis,
  ExtractedResource,
  ResourceKind,
  ResourceSource,
  ResourceEvidence,
  ExtractedBindable,
  BindableEvidence,
  ExtractedConfiguration,
  ConfigurationRegistration,
  AnalysisOptions,
  // Package scanner types
  PackageInfo,
  EntryPoint,
} from "./npm/index.js";
