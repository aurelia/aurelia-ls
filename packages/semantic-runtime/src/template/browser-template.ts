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
export * from './template-compiler-context-family-compilation.js';
export {
  TemplateCompilerContextFamilyMarkerGeometry,
  TemplateCompilerContextFamilyDefinitionLocation,
  TemplateCompilerContextFamilyRenderLocationGeometry,
  TemplateCompilerContextFamilyValue,
  TemplateCompilerContextFamilyValueContext,
  TemplateCompilerContextFamilyValueGeometryKind,
  TemplateCompilerContextFamilyValueOwner,
  TemplateCompilerContextFamilyValueOwnerKind,
  TemplateCompilerContextFamilyValueRow,
  orderTemplateCompilerContextFamilyDefinitions,
  type TemplateCompilerContextFamilyValueGeometry,
} from './template-compiler-context-family-value.js';
export { TemplateCompilerContextFamilyExpressionValue } from './template-compiler-context-family-expression-value.js';
export * from './template-instruction-runtime-value.js';
export * from './template-compiler-compiled-definition-value.js';
export * from './template-compiler-compiled-handoff-value.js';
export * from './semantic-app-template-compiler-handoff.js';
export * from '../configuration/standard-configuration-source-attachment.js';
export { CustomElementCaptureKind } from '../resources/custom-element-definition.js';
export {
  ResourceDefinitionAuthoredSourceSpan,
  ResourceDefinitionSourceAttachment,
  ResourceDefinitionSourceOpenReason,
} from '../resources/resource-definition-source-attachment.js';
export { ResourceCarrierKind } from '../resources/resource-kind.js';
export * from './template-compiler-occurrence-target-execution.js';
export * from './template-compiler-occurrence-target-schedule.js';
export * from './template-compiler-occurrence-hydrate-element-allocation.js';
