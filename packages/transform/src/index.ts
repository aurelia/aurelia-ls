/**
 * @aurelia-ls/transform
 *
 * Transform TypeScript source files to inject AOT-compiled Aurelia artifacts.
 *
 * @example
 * ```typescript
 * import { transform } from "@aurelia-ls/transform";
 *
 * const result = transform({
 *   source: originalCode,
 *   filePath: "src/my-app.ts",
 *   aot: aotCompilationResult,
 *   resource: {
 *     kind: "custom-element",
 *     name: "my-app",
 *     className: "MyApp",
 *     declarationForm: "decorator",
 *     bindables: [],
 *   },
 * });
 *
 * console.log(result.code); // Transformed source with injected $au
 * ```
 */

// Main transform function
export { transform } from "./transform/index.js";
export type {
  TransformOptions,
  TransformResult,
  TransformWarning,
  TransformMeta,
  TransformError,
  TransformErrorCodeType,
  SourceMapOptions,
  SourceMapResult,
} from "./transform/index.js";
export { TransformErrorCode } from "./transform/index.js";

// Model types
export type {
  ResourceDefinition,
  CustomElementDefinition,
  CustomAttributeDefinition,
  ValueConverterDefinition,
  BindingBehaviorDefinition,
  BindableDefinition,
  BindingMode,
  TemplateSource,
  ShadowDOMOptions,
  ResourceKind,
  DeclarationForm,
} from "./model/index.js";

// Emit utilities (for advanced use)
export {
  emitStaticAu,
  emitExpressionTable,
  emitDefinition,
  hasEmittableContent,
  generateAuAssignment,
  escapeString,
  toIdentifierPrefix,
  formatValue,
} from "./emit/index.js";
export type {
  EmitStaticAuOptions,
  EmitStaticAuResult,
} from "./emit/index.js";

// TypeScript utilities (for advanced use)
export {
  parseSource,
  findClasses,
  findClassByName,
  detectDeclarationForm,
  isConventionName,
  deriveResourceName,
} from "./ts/index.js";
export type {
  ClassInfo,
  DecoratorInfo,
  Span,
  Position,
  Range,
  TypedSourceEdit,
  InjectionStrategy,
  InjectionPoint,
  DetectedDeclarationForm,
} from "./ts/index.js";

// Edit utilities (for advanced use)
export {
  applyEdits,
  applySingleEdit,
  replace,
  insert,
  del,
  deleteWithWhitespace,
  validateEdits,
} from "./ts/index.js";
