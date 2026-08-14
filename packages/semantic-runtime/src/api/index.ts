export * from './app-builder.js';
export * from './app-builder-continuations.js';
export * from './app-query-catalog.js';
export * from './app-query-continuations.js';
export {
  semanticAppQueryBatchMaterializationPolicy,
  semanticAppQueryMaterializationPolicy,
} from './app-query-policy.js';
export * from './app-overview.js';
export * from './app-topology.js';
export * from './contracts.js';
export * from './diagnostic-presentation.js';
export * from '../findings/analysis-limitation-policy.js';
export * from './i18n-projections.js';
export * from './managed-workspace-session.js';
export * from './runtime.js';
export * from './workspace-descriptor.js';
export * from './router-overview.js';
export * from './source-reference.js';
export * from './state-projections.js';
export * from './typescript-environment.js';
export * from './typescript-diagnostics.js';
export * from '../inquiry/continuation-intent.js';
export {
  InquiryContinuationKind,
} from '../inquiry/answer.js';
export {
  TypeSystemTypeScriptVersionRelation,
} from '../type-system/typescript-environment.js';
export type {
  InquiryContinuationKindValue,
} from '../inquiry/answer.js';
export {
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SemanticAppAnalysisDepth,
} from '../configuration/app-analysis.js';
export {
  BUILT_IN_RESOURCE_PACKAGES,
} from '../resources/built-in-resources.js';
export {
  FRAMEWORK_REGISTRATION_CAPABILITIES,
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilityFromString,
  isFrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
export {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputGeneration,
  SemanticRuntimeInputReadScope,
  SemanticRuntimeProjectInputReadKind,
  SemanticRuntimeWorkspaceInputGeneration,
} from '../kernel/project-input.js';
export {
  SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE,
  SemanticRuntimeAnalysisCurrentnessError,
  isSemanticRuntimeAnalysisCurrentnessError,
  semanticRuntimeAnalysisCurrentnessFailure,
} from '../kernel/analysis-currentness.js';
export type {
  SemanticRuntimeAnalysisCurrentnessFailure,
  SemanticRuntimeAnalysisCurrentnessReason,
} from '../kernel/analysis-currentness.js';
export {
  SOURCE_FILE_ROLE_VALUES,
  SOURCE_LANGUAGE_VALUES,
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
export {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
export {
  canonicalTypeSystemPath,
  normalizeTypeSystemPath,
} from '../type-system/source-file-path.js';
export {
  OpenSeamBoundaryKind,
  OpenSeamReasonKind,
  openSeamBoundaryKindForReason,
} from '../kernel/open-seam.js';
export {
  RouterNavigationTargetKind,
} from '../router/model.js';
export type {
  OpenSeamReasonSource,
} from '../kernel/open-seam.js';
export type {
  SemanticRuntimeProjectInputCurrentnessPolicy,
  SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadCurrentness,
  SemanticRuntimeProjectInputReadDescriptor,
  SemanticRuntimeProjectInputScope,
  SemanticRuntimeSourceTextOverlay,
  SemanticRuntimeWorkspaceInputScope,
} from '../kernel/project-input.js';
export {
  RESOURCE_DEFINITION_KINDS,
  registrationResourceKindFor,
} from '../resources/resource-kind.js';
export {
  SemanticProjectAnalysisKind,
  SemanticProjectAureliaDependencyScope,
  SemanticProjectAureliaSourceSignalKind,
  SemanticProjectShapeKind,
} from '../boot/project-shape.js';
export {
  AuthoredSourceBoundary,
} from '../boot/source-boundary.js';
export {
  ProjectRootAdmissionOriginKind,
} from '../boot/project-root-admission.js';
export type {
  ProjectRootAdmissionOrigin,
  ProjectRootMarkerAdmissionOrigin,
  ProjectRootPolicyAdmissionOrigin,
} from '../boot/project-root-admission.js';
export {
  AURELIA_PROJECT_CONFIGURATION_CATALOG,
  AURELIA_PROJECT_CONFIGURATION_FILE_NAME,
  AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS,
  AURELIA_PROJECT_CONFIGURATION_VERSION,
  SemanticProjectConfigurationDiagnosticKind,
} from '../boot/project-configuration.js';
export type {
  SemanticProjectConfigurationDiagnostic,
  SemanticProjectConfigurationSourcePosition,
  SemanticProjectConfigurationSourceSpan,
} from '../boot/project-configuration.js';
export {
  SEMANTIC_SOURCE_WORLD_SCHEMA_VERSION,
  ResolvedSemanticSourceWorld,
  SemanticSourceWorldCurrentnessKind,
  SemanticSourceWorldInputReceipt,
  resolveSemanticSourceWorld,
} from '../boot/source-world.js';
export type {
  CurrentSemanticSourceWorldResult,
  EquivalentSemanticSourceWorldResult,
  FreshBootRequiredSemanticSourceWorldResult,
  ResolvedSemanticSourceWorldFile,
  ResolvedSemanticSourceWorldProject,
  SemanticSourceWorldCurrentnessResult,
  SemanticSourceWorldReceiptValidation,
  SemanticSourceWorldResolutionInput,
} from '../boot/source-world.js';
