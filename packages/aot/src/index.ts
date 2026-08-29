export {
  AotArtifactError,
  AotTemplateModuleEmitter,
  type AotArtifactErrorCode,
  type AotRawSourceMap,
  type AotTemplateModuleArtifact,
  type AotTemplateModuleEmissionRequest,
} from './template-module-emitter.js';
export {
  SemanticAotArtifactProvider,
  SemanticAotBuildSession,
  type SemanticAotArtifactEvidence,
  type SemanticAotBuildRequest,
  type SemanticAotTemplateArtifact,
  type SemanticAotTemplateRequest,
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
