// Project Semantics Pipeline
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the AOT compiler uses for template compilation.
//
// Architecture (discovery stage map):
// - Pre-stage 0: File discovery (enumeration, sibling detection)
// - extract: AST -> FileFacts (classes, imports, exports, registrations)
// - exports: FileFacts -> ExportBindingMap
// - evaluate: FileFacts -> resolved FileFacts + gaps
// - recognize: FileFacts -> ResourceDef[] + gaps
// - assemble: ResourceDef[] -> Semantics + Catalog + Syntax
// - register: ResourceDef[] + FileFacts -> RegistrationAnalysis
// - scope: RegistrationAnalysis -> ResourceGraph
// - snapshot: Semantics + ResourceGraph -> snapshots
// - templates: RegistrationAnalysis + ResourceGraph -> templates
//
// Key types:
// - FileFacts: Unified extraction output
// - ClassValue: Enriched class metadata with AnalyzableValue
// - ResourceDef: Unified resource definition (compiler-facing, Sourced<T>)
//

// === Main entry point ===
export { discoverProjectSemantics, type ProjectSemanticsDiscoveryConfig, type ProjectSemanticsDiscoveryResult, type ProjectSemanticsDiscoveryDiagnostic } from "./resolve.js";
export type { TemplateInfo, InlineTemplateInfo } from "./templates/types.js";
export {
  DISCOVERY_STAGES,
  DISCOVERY_STAGE_ORDER,
  type DiscoveryStageKey,
  type DiscoveryStageOutputs,
  type PatternMatchOutput,
} from "./pipeline/index.js";
export { buildSemanticsArtifacts, type SemanticsArtifacts } from "./assemble/build.js";

// === Snapshots ===
export { buildSemanticSnapshot, buildApiSurfaceSnapshot, type SemanticSnapshotOptions, type SnapshotIdOptions } from "./snapshot/index.js";

// === Shared types ===
export type { Logger } from "./types.js";

// === Compile-time Defines ===
export type { DefineMap, DefineValue } from "./defines.js";
export { ssrDefines, csrDefines, mergeDefines } from "./defines.js";

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

export type {
  FileFacts,
  ImportDeclaration,
  ExportDeclaration,
  VariableDeclaration,
  FunctionDeclaration,
  RegistrationCall,
  DefineCall,
  FileContext,
  // SiblingFile exported from project/index.js (canonical source)
  TemplateImport,
  MatchContext,
} from "./extract/file-facts.js";
export { emptyFileFacts, emptyFileContext } from "./extract/file-facts.js";

// === Value Model Types ===
// Core types for static value analysis (used by FileFacts.classes)
export type {
  AnalyzableValue,
  ArrayValue,
  ObjectValue,
  ClassValue,
  DecoratorApplication,
  BindableMember,
  LexicalScope,
} from "./evaluate/index.js";
export {
  extractStringProp,
  getProperty,
} from "./evaluate/index.js";

// === Pattern Matchers (New) ===
// Pattern matchers operate on ClassValue -> ResourceDef.
export { matchAll, matchFile, matchExpected, matchDefineCalls, matchFileFacts, type MatchResult, type FileMatchResult } from "./recognize/index.js";
export { matchDecorator, type DecoratorMatchResult } from "./recognize/index.js";
export { matchStaticAu, type StaticAuMatchResult } from "./recognize/index.js";
export { matchDefine, type DefineMatchResult } from "./recognize/index.js";
export { matchConvention, type ConventionMatchResult } from "./recognize/index.js";

// === Unified Resolution API (New) ===
// Convenient API that combines extraction + pattern matching.
export {
  resolveFile,
  resolveProgram,
  extractResources,
  type FileResolutionResult,
  type ProgramResolutionResult,
  type FileResolutionOptions,
} from "./resolve-files.js";

// === Extraction (Layer 1) ===
// Unified extraction (FileFacts with enriched ClassValue)
export { extractAllFileFacts, extractFileFacts, extractFileContext } from "./extract/index.js";
export type { ExtractionOptions } from "./extract/index.js";

// === Analysis (Layer 2) ===
export { evaluateFileFacts } from "./evaluate/index.js";
export type { PartialEvaluationResult, PartialEvaluationFileResult, PartialEvaluationOptions } from "./evaluate/index.js";

// === Export Binding Resolution (Layer 1.5) ===
export { buildExportBindingMap, lookupExportBinding } from "./exports/index.js";
export type {
  ResolvedExport,
  FileExportBindings,
  ExportBindingMap,
  ExportLookupResult,
} from "./exports/index.js";

// === Registration (Layer 3) ===
export { createRegistrationAnalyzer, buildImportGraph, buildRegistrationPlan } from "./register/index.js";
export type { RegistrationAnalyzer, ImportGraph } from "./register/index.js";
export type { UsageByScope } from "./register/index.js";
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
} from "./register/index.js";
export {
  isLocalSite,
  isGlobalSite,
  isResolvedSite,
  isUnresolvedSite,
} from "./register/index.js";

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
  // Normalization (user-friendly -> internal)
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

// === Diagnostics (conversion + hints) ===
export {
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
export {
  analyzePackage,
  analyzePackages,
  inspect,
  detectMonorepo,
  isAureliaPackage,
  // Package scanner
  scanPackage,
  getSourceEntryPoint,
  resolveWorkspaceImport,
  resolveWorkspaceImportWithReason,
  buildPackageRootMap,
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
  ExtractedConfiguration,
  ConfigurationRegistration,
  SourceLocation as PackageSourceLocation,
  AnalysisOptions,
  // Package scanner types
  PackageInfo,
  EntryPoint,
} from "./npm/index.js";

// === Third-Party Resolution ===
// Shared logic for discovering and merging npm package resources.
export {
  resolveThirdPartyResources,
  applyThirdPartyResources,
  collectThirdPartyPackages,
  shouldScanPackage,
  buildAnalysisFingerprint,
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
} from "./third-party/index.js";
export type {
  ThirdPartyOptions,
  ThirdPartyPolicy,
  ThirdPartyPackageSpec,
  ExplicitResourceConfig,
  ExplicitElementConfig,
  ExplicitAttributeConfig,
  ThirdPartyDiscoveryResult,
  ResolvedPackageSpec,
  ThirdPartyLogger,
  ThirdPartyDiscoveryContext,
} from "./third-party/index.js";

