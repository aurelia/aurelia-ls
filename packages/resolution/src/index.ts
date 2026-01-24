// Resolution package public API
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the AOT compiler uses for template compilation.
//
// Architecture (resolution stage map):
// - Pre-stage 0: File discovery (enumeration, sibling detection)
// - 21-extract: AST -> FileFacts (classes, imports, exports, registrations)
// - 22-export-bind: FileFacts -> ExportBindingMap
// - 23-partial-eval: FileFacts -> resolved FileFacts + gaps
// - 24-patterns: FileFacts -> ResourceDef[] + gaps
// - 25-semantics: ResourceDef[] -> Semantics + Catalog + Syntax
// - 26-registration: ResourceDef[] + FileFacts -> RegistrationAnalysis
// - 27-graph: RegistrationAnalysis -> ResourceGraph
// - 28-snapshots: Semantics + ResourceGraph -> snapshots
// - 29-templates: RegistrationAnalysis + ResourceGraph -> templates
//
// Key types:
// - FileFacts: Unified extraction output
// - ClassValue: Enriched class metadata with AnalyzableValue
// - ResourceDef: Unified resource definition (compiler-facing, Sourced<T>)
//

// === Re-export compiler types for convenience ===
export type {
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
  FeatureUsageSet,
  FeatureUsageFlags,
  RegistrationPlan,
  RegistrationScopePlan,
  RegistrationPlanDirective,
  ResourceDef,
  ResourceKind,
  ElementRes,
  AttrRes,
  Bindable,
  ValueConverterSig,
  BindingBehaviorSig,
  Semantics,
  SemanticsWithCaches,
  ResourceCatalog,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
  ApiSurfaceSnapshot,
  ApiSurfaceSymbol,
  ApiSurfaceBindable,
  SymbolId,
  TemplateSyntaxRegistry,
  NormalizedPath,
} from "@aurelia-ls/compiler";

// === Main entry point ===
export { resolve, type ResolutionConfig, type ResolutionResult, type ResolutionDiagnostic } from "./resolve.js";
export type { TemplateInfo, InlineTemplateInfo } from "./templates/types.js";
export { RESOLUTION_STAGES, RESOLUTION_STAGE_ORDER, type ResolutionStageKey, type ResolutionStageOutputs, type PatternMatchOutput } from "./pipeline/index.js";
export { buildSemanticsArtifacts, type SemanticsArtifacts } from "./semantics/build.js";

// === Snapshots ===
export { buildSemanticSnapshot, buildApiSurfaceSnapshot, type SemanticSnapshotOptions, type SnapshotIdOptions } from "./snapshots/index.js";

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
} from "./extraction/file-facts.js";
export { emptyFileFacts, emptyFileContext } from "./extraction/file-facts.js";

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
} from "./analysis/index.js";
export {
  extractStringProp,
  getProperty,
} from "./analysis/index.js";

// === Pattern Matchers (New) ===
// Pattern matchers operate on ClassValue -> ResourceDef.
export { matchAll, matchFile, matchExpected, matchDefineCalls, matchFileFacts, type MatchResult, type FileMatchResult } from "./patterns/index.js";
export { matchDecorator, type DecoratorMatchResult } from "./patterns/index.js";
export { matchStaticAu, type StaticAuMatchResult } from "./patterns/index.js";
export { matchDefine, type DefineMatchResult } from "./patterns/index.js";
export { matchConvention, type ConventionMatchResult } from "./patterns/index.js";

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
export { extractAllFileFacts, extractFileFacts, extractFileContext } from "./extraction/index.js";
export type { ExtractionOptions } from "./extraction/index.js";

// === Analysis (Layer 2) ===
export { evaluateFileFacts } from "./analysis/index.js";
export type { PartialEvaluationResult, PartialEvaluationFileResult, PartialEvaluationOptions } from "./analysis/index.js";

// === Export Binding Resolution (Layer 1.5) ===
export { buildExportBindingMap, lookupExportBinding } from "./binding/index.js";
export type {
  ResolvedExport,
  FileExportBindings,
  ExportBindingMap,
  ExportLookupResult,
} from "./binding/index.js";

// === Registration (Layer 3) ===
export { createRegistrationAnalyzer, buildImportGraph, buildRegistrationPlan } from "./registration/index.js";
export type { RegistrationAnalyzer, ImportGraph } from "./registration/index.js";
export type { UsageByScope } from "./registration/index.js";
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
  ExtractedConfiguration,
  ConfigurationRegistration,
  SourceLocation,
  AnalysisOptions,
  // Package scanner types
  PackageInfo,
  EntryPoint,
} from "./npm/index.js";

