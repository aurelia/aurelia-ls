export {
  AotCompilerPatchModuleEmitter,
  type AotCompilerPatchModuleArtifact,
  type AotCompilerPatchModuleEmissionRequest,
} from './compiler-patch-module-emitter.js';
export {
  AOT_COMPILER_PATCH_RUNTIME_MODULE_ID,
  AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE,
} from './compiler-patch-runtime-module.js';
export {
  AotArtifactError,
  AotTemplateModuleEmitter,
  type AotArtifactErrorCode,
  type AotRawSourceMap,
  type AotTemplateModuleArtifact,
  type AotTemplateModuleEmissionRequest,
} from './template-module-emitter.js';
export {
  AOT_COMPILER_PATCH_PAYLOAD_MODULE_PREFIX,
  SemanticAotArtifactProvider,
  SemanticAotBuildSession,
  type SemanticAotArtifactEvidence,
  type SemanticAotBuildRequest,
  type SemanticAotSourceTransformArtifact,
  type SemanticAotSourceTransformRequest,
  type SemanticAotTemplateArtifact,
  type SemanticAotTemplateRequest,
  type SemanticAotVirtualModuleArtifact,
  type SemanticAotVirtualModuleRequest,
} from './semantic-artifact-provider.js';
export {
  AOT_RUNTIME_MODULE_SPECIFIER,
  AotSourceTransformEmitter,
  AotSourceTransformError,
  type AotSourceTransformArtifact,
  type AotSourceTransformErrorCode,
  type AotSourceTransformRequest,
  type AotSourceTransformResourcePlan,
  type AotSourceTransformSlice,
  type AotTransformedResource,
} from './source-transform.js';
