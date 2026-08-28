/** Explicit compiler-conservation surface; ordinary semantic-runtime consumers do not load its HTML parser. */
export * from '../expression/runtime-ast-value.js';
export * from './browser-template-draft.js';
export * from './browser-template-parser.js';
export * from './browser-template-selection.js';
export * from './browser-template-correspondence.js';
export * from './browser-effective-template-materializer.js';
export {
  CompilerTransformedTemplateAttribute,
  CompilerTransformedTemplateComment,
  CompilerTransformedTemplateElement,
  CompilerTransformedTemplateFragment,
  CompilerTransformedTemplateText,
  CompilerTransformedTemplateTree,
  type CompilerTransformedTemplateNode,
} from './template-structure.js';
export {
  expressionProductHandlesForInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';
export {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
export * from './template-compiler-deterministic-execution.js';
export * from './template-compiler-root-site-cursor-observation.js';
export * from './template-compiler-context-family-compilation.js';
export {
  TemplateCompilerContextFamilyMarkerGeometry,
  TemplateCompilerContextFamilyRenderLocationGeometry,
  TemplateCompilerContextFamilyValue,
  TemplateCompilerContextFamilyValueContext,
  TemplateCompilerContextFamilyValueGeometryKind,
  TemplateCompilerContextFamilyValueOwner,
  TemplateCompilerContextFamilyValueOwnerKind,
  TemplateCompilerContextFamilyValueRow,
  type TemplateCompilerContextFamilyValueGeometry,
} from './template-compiler-context-family-value.js';
export { TemplateCompilerContextFamilyExpressionValue } from './template-compiler-context-family-expression-value.js';
export * from './template-instruction-runtime-value.js';
export * from './template-compiler-occurrence-target-execution.js';
export * from './template-compiler-occurrence-target-schedule.js';
export * from './template-compiler-occurrence-hydrate-element-allocation.js';
