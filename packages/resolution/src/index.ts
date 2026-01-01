// Resolution package public API
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the AOT compiler uses for template compilation.
//
// Architecture:
// - File Discovery (Layer 0): File enumeration, sibling detection
// - Extraction (Layer 1): AST → SourceFacts (with optional sibling info)
// - Inference (Layer 2): SourceFacts → ResourceCandidate[]
// - Registration (Layer 3): ResourceCandidate[] → RegistrationIntent[]
// - Scope (Layer 4): RegistrationIntent[] → ResourceGraph
//
// See docs/resolution-architecture.md for details.
// See docs/file-discovery-design.md for Layer 0 details.

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
  // Directory Conventions
  DirectoryConventionConfig,
  ConventionBuilder,
} from "./project/index.js";

// === Extraction (Layer 1) ===
export { extractAllFacts, extractSourceFacts } from "./extraction/index.js";
export type { ExtractionOptions } from "./extraction/index.js";
export type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  StaticAuFact,
  StaticDependenciesFact,
  BindableMemberFact,
  RegistrationCallFact,
  BindingMode,
} from "./extraction/index.js";

// === Inference (Layer 2) ===
export { createResolverPipeline, resolveFromDecorators, resolveFromStaticAu, resolveFromConventions } from "./inference/index.js";
export type { ResourceCandidate, BindableSpec, ResolverResult, ResolverDiagnostic, ResolverPipeline } from "./inference/index.js";

// === Registration (Layer 3) ===
export { createRegistrationAnalyzer, buildImportGraph } from "./registration/index.js";
export type { RegistrationIntent, RegistrationEvidence, ImportGraph, RegistrationAnalyzer } from "./registration/index.js";

// === Scope (Layer 4) ===
export { buildResourceGraph } from "./scope/index.js";

// === Conventions ===
export type { ConventionConfig, SuffixConfig, FilePatternConfig } from "./conventions/index.js";
export {
  // Decorator names (used by transform package)
  DECORATOR_NAMES,
  RESOURCE_DECORATOR_NAMES,
  // Suffix patterns
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
  // Functions
  getResourceTypeFromClassName,
  stripResourceSuffix,
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
