/** Detached build-consumer contract; ordinary semantic-runtime imports do not load the HTML parser. */
export type { RuntimeExpressionAstValue } from '../expression/runtime-ast-value.js';

/** Explicit browser oracle helpers retained for standards-parity assurance. */
export { browserTemplateStructure } from './browser-template-draft.js';
export { parseBrowserTemplateFragmentDraft } from './browser-template-parser.js';

export {
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeElementDataKind,
} from './template-instruction-runtime-value.js';

export {
  TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION,
  type TemplateCompilerCompiledHandoffAddress,
  type TemplateCompilerCompiledHandoffAttribute,
  type TemplateCompilerCompiledHandoffBindable,
  type TemplateCompilerCompiledHandoffDependencyReference,
  type TemplateCompilerCompiledHandoffDefinition,
  type TemplateCompilerCompiledHandoffElement,
  type TemplateCompilerCompiledHandoffInstructionValue,
  type TemplateCompilerCompiledHandoffTree,
  type TemplateCompilerCompiledHandoffValue,
} from './template-compiler-compiled-handoff-value.js';

export {
  materializeSemanticAppTemplateCompilerHandoffs,
  TemplateCompilerCompiledHandoffState,
  type SemanticAppTemplateCompilerHandoffResource,
} from './semantic-app-template-compiler-handoff.js';

export {
  materializeSemanticAppStandardConfigurationSourceAttachments,
  StandardConfigurationSourceCarrierKind,
  StandardConfigurationSourceNonReplaceableReasonKind,
  type StandardConfigurationSourceAttachment,
} from '../configuration/standard-configuration-source-attachment.js';

export { ResourceCarrierKind } from '../resources/resource-kind.js';
