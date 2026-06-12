/**
 * Public package root for the AOT source transform helpers.
 *
 * The package manifest exports `out/index.*`, so this file is the source
 * contract for consumers such as the Vite plugin and transform tests.
 */

export { transform } from "./transform/transform.js";
export {
  TransformError,
  TransformErrorCode,
  type SourceMapOptions,
  type SourceMapResult,
  type TemplateImport,
  type TemplateImportNamedAlias,
  type TransformErrorCodeType,
  type TransformMeta,
  type TransformOptions,
  type TransformResult,
  type TransformWarning,
} from "./transform/types.js";

export type {
  BindableDefinition,
  BindingBehaviorDefinition,
  BindingMode,
  CustomAttributeDefinition,
  CustomElementDefinition,
  DeclarationForm,
  ResourceDefinition,
  ResourceKind,
  ShadowDOMOptions,
  TemplateSource,
  ValueConverterDefinition,
} from "./model/types.js";

export {
  emitDefinition,
  emitExpressionTable,
  emitStaticAu,
  escapeString,
  formatValue,
  generateAuAssignment,
  hasEmittableContent,
  toIdentifierPrefix,
  type EmitStaticAuOptions,
  type EmitStaticAuResult,
} from "./emit/index.js";

export {
  deriveResourceName,
  detectDeclarationForm,
  findClassByName,
  findClasses,
  isConventionName,
  parseSource,
} from "./ts/analyze.js";
export {
  applyEdits,
  applySingleEdit,
  del,
  deleteWithWhitespace,
  insert,
  replace,
  validateEdits,
} from "./ts/edit.js";
export {
  extractBindables,
  extractDecoratorConfig,
  extractDependencies,
  type ExtractedBindable,
  type ExtractedDecoratorConfig,
  type ExtractedDependency,
} from "./ts/extract.js";
export {
  analyzeInjectionPoint,
  findRemovableDecorators,
  generateImportCleanupEdits,
  generateInjectionEdits,
  needsTransformation,
  type ImportCleanupResult,
  type InjectOptions,
  type InjectResult,
} from "./ts/inject.js";
export type {
  ClassInfo,
  DecoratorInfo,
  DetectedDeclarationForm,
  InjectionPoint,
  InjectionStrategy,
  Position,
  Range,
  Span,
  TypedSourceEdit,
} from "./ts/types.js";

export {
  analyzeEntryPoint,
  shouldTransformEntryPoint,
} from "./entry/analyze.js";
export {
  buildAotConfiguration,
  generateEntryPointCode,
  generateImportStatements,
  generateInitialization,
} from "./entry/build-config.js";
export {
  transformEntryPoint,
  transformSimpleEntryPoint,
} from "./entry/transform.js";
export {
  isKnownConfiguration,
  KNOWN_CONFIGURATIONS,
  type AureliaImport,
  type ChainMethod,
  type ConfigBuildOptions,
  type ConfigBuildResult,
  type ConfigLocation,
  type EntryPointAnalysis,
  type EntryTransformOptions,
  type EntryTransformResult,
  type ImportAnalysis,
  type ImportSpecifier,
  type InitChain,
  type KnownConfiguration,
  type PreservedRegistration,
  type RequiredImport,
} from "./entry/types.js";

export {
  compileModule,
  deriveNamesFromPath,
  fixImportExtensions,
  transpileToJs,
  type CompileModuleOptions,
  type CompileModuleResult,
  type DerivedNames,
  type TranspileOptions,
} from "./compile/compile.js";
