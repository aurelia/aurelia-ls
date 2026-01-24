/**
 * Value Model for Partial Evaluation
 *
 * This module provides the core IR for static value analysis in the resolution
 * pipeline. It represents "what we know about a value at compile time."
 *
 * Usage:
 * ```typescript
 * import { AnalyzableValue, ref, call, isRegistryShape } from './value';
 *
 * // Create values
 * const configRef = ref('Config');
 * const registerCall = call(propAccess(ref('container'), 'register'), [configRef]);
 *
 * // Type guards
 * if (isRegistryShape(resolved)) {
 *   const method = resolved.methods.get('register');
 * }
 * ```
 */

// Re-export all types
export type {
  // Core value types
  AnalyzableValue,
  LiteralValue,
  ArrayValue,
  ObjectValue,
  FunctionValue,
  ClassValue,
  DecoratorApplication,
  BindableMember,
  ReferenceValue,
  ImportValue,
  PropertyAccessValue,
  CallValue,
  SpreadValue,
  NewValue,
  UnknownValue,

  // Method and statement types
  MethodValue,
  ParameterInfo,
  StatementValue,
  ReturnStatement,
  ExpressionStatement,
  VariableStatement,
  VariableDeclaration,
  IfStatement,
  ForOfStatement,
  UnknownStatement,

  // Scope types
  LexicalScope,
  ImportBinding,
  ResolutionContext,
  OnDemandResolver,
  ExtractedString,
} from './types.js';

// Re-export cross-file resolution types from canonical locations
export type { ExportBindingMap } from '../../22-export-bind/types.js';

// Re-export type guards
export {
  isResolved,
  hasMethod,
  isRegistryShape,
  getRegisterMethod,
  isClassValue,
  isResolvedClassRef,
  getResolvedValue,
} from './types.js';

// Re-export value constructors
export {
  literal,
  array,
  object,
  ref,
  importVal,
  propAccess,
  call,
  spread,
  classVal,
  unknown,
  method,
} from './types.js';

// Re-export value extraction helpers (for pattern matching)
export {
  extractString,
  extractStringWithSpan,
  extractBoolean,
  extractStringArray,
  getProperty,
  getPropertyKeySpan,
  extractStringProp,
  extractStringPropWithSpan,
  extractBooleanProp,
  extractStringArrayProp,
} from './types.js';

// Re-export statement constructors
export {
  returnStmt,
  exprStmt,
  varStmt,
  varDecl,
  ifStmt,
  forOfStmt,
  unknownStmt,
} from './types.js';

// Re-export transformation functions (Layer 1)
export {
  transformExpression,
  transformStatement,
  transformMethod,
  transformExportedValue,
  transformModuleExports,
  transformParameters,
  transformBlock,
} from './transform.js';

// Re-export scope functions (Layer 2)
export {
  buildFileScope,
  enterFunctionScope,
  createChildScope,
  lookupBinding,
  isImportBinding,
  resolveInScope,
} from './scope.js';

// Re-export cross-file resolution functions (Layer 3)
export {
  buildResolutionContext,
  resolveImportsCrossFile,
  resolveImport,
  fullyResolve,
} from './resolve.js';

export type { BuildContextOptions } from './resolve.js';

// Re-export class extraction (enriched ClassValue)
export { extractClassValue } from './class-extraction.js';
