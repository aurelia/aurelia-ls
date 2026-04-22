export {
  AuSlotsInfo,
} from './au-slots-info.js';
export {
  COMPILER_CAPABILITY_KINDS,
  AttributePatternCapability,
  BindingCommandCapability,
  TemplateCompilerHookCapability,
  type CompilerCapability,
  type CompilerCapabilityKind,
} from './compiler-capability.js';
export {
  COMPILER_ATTRIBUTE_CLASSIFICATION_LANE_KINDS,
  COMPILER_ATTRIBUTE_CLASSIFICATION_OPEN_SEAM_KINDS,
  CompilerAttributeClassification,
  CompilerAttributeClassificationProvenance,
  CompilerAttributeClassificationOpenSeam,
  CompilerAttributeClassifier,
  CompilerAuthoredAttribute,
  CompilerElementAttributeClassification,
  type CompilerAttributeClassificationLaneKind,
  type CompilerAttributeClassificationOpenSeamKind,
} from './attribute-classification.js';
export {
  COMPILER_ATTRIBUTE_SYNTAX_PROVENANCE_KINDS,
  CompilerAttributeSyntax,
  CompilerAttributeSyntaxProvenance,
  type CompilerAttributeSyntaxProvenanceKind,
} from './compiler-attribute-syntax.js';
export {
  AUTHORED_TEMPLATE_NODE_KINDS,
  AUTHORED_TEMPLATE_OPEN_SEAM_KINDS,
  AuthoredElementNode,
  AuthoredTemplate,
  AuthoredTemplateAttribute,
  AuthoredTemplateFragment,
  AuthoredTemplateNodeProvenance,
  AuthoredTemplateOpenSeam,
  AuthoredTextNode,
  type AuthoredTemplateNode,
  type AuthoredTemplateNodeKind,
  type AuthoredTemplateOpenSeamKind,
} from './authored-template.js';
export { AuthoredTemplateParser } from './authored-template-parser.js';
export {
  ATTRIBUTE_INVOCATION_CONTEXT_OPEN_SEAM_KINDS,
  AttributeInvocationContext,
  AttributeInvocationContextOpenSeam,
  type AttributeInvocationContextOpenSeamKind,
} from './attribute-invocation-context.js';
export { HydrationContext } from './hydration-context.js';
export {
  HYDRATION_LOOKUP_ROUTE_KINDS,
  HydrationConstructionContract,
  HydrationConstructionContractMaterializer,
  HydrationLookupRequirement,
  HydrationConstructionRequirement,
  type HydrationLookupRouteKind,
} from './hydration-construction.js';
export {
  HYDRATION_PUBLICATION_AVAILABILITY_KINDS,
  HYDRATION_PUBLICATION_BOUNDARY_KINDS,
  HYDRATION_PUBLICATION_TOKEN_KINDS,
  HydrationPublication,
  HydrationPublicationContract,
  HydrationPublicationStateMaterializer,
  type HydrationPublicationAvailabilityKind,
  type HydrationPublicationBoundaryKind,
  type HydrationPublicationTokenKind,
} from './hydration-publication.js';
export {
  ELEMENT_INVOCATION_CONTEXT_OPEN_SEAM_KINDS,
  ElementInvocationContext,
  ElementInvocationContextOpenSeam,
  type ElementInvocationContextOpenSeamKind,
} from './element-invocation-context.js';
export {
  COMPILER_CHILD_WORLD_REQUEST_MODE_KINDS,
  COMPILER_CHILD_WORLD_FORMATION_OPEN_SEAM_KINDS,
  CompilerChildWorldBuilder,
  CompilerChildWorldFormation,
  CompilerChildWorldFormationOpenSeam,
  type CompilerChildWorldFormationOpenSeamKind,
  type CompilerChildWorldRequestModeKind,
} from './child-world-formation.js';
export { LookupScopeAssemblyBuilder } from './lookup-scope-assembly.js';
export { ControllerLocalStateMaterializer } from './controller-local-state.js';
export {
  CONTROLLER_OWNED_TEMPLATE_BRANCH_KINDS,
  CONTROLLER_OWNED_TEMPLATE_BRANCH_OPEN_SEAM_KINDS,
  CONTROLLER_TEMPLATE_REALIZATION_POLICY_KINDS,
  ControllerOwnedTemplateBranch,
  ControllerOwnedTemplateBranchOpenSeam,
  type ControllerOwnedTemplateBranchKind,
  type ControllerOwnedTemplateBranchOpenSeamKind,
  type ControllerTemplateRealizationPolicyKind,
} from './controller-owned-template-branch.js';
export {
  CONTROLLER_KINDS,
  AttributeController,
  Controller,
  ElementController,
  RenderLocation,
  SyntheticView,
  type ControllerKind,
} from './controller.js';
export type { Controller as ControllerShape } from './controller.js';
export {
  COMPILER_ATTRIBUTE_BINDABLE_INFO_ORIGIN_KINDS,
  COMPILER_ATTRIBUTE_PRIMARY_BINDABLE_MODE_KINDS,
  COMPILER_ATTRIBUTE_BINDABLES_INFO_OPEN_SEAM_KINDS,
  CompilerAttributeBindableInfoEntry,
  CompilerAttributeBindablesInfo,
  CompilerAttributeBindablesInfoOpenSeam,
  CompilerAttributePrimaryBindableProvenance,
  type CompilerAttributeBindableInfoOriginKind,
  type CompilerAttributePrimaryBindableModeKind,
  type CompilerAttributeBindablesInfoOpenSeamKind,
} from './custom-attribute-bindables-info.js';
export {
  COMPILER_ATTRIBUTE_HANDLER_STATUS_KINDS,
  CompilerAttributeHandlerMaterializer,
  CompilerAttributeHandlerResult,
  type CompilerAttributeHandlerStatusKind,
} from './compiler-attribute-handler-materializer.js';
export {
  COMPILER_ATTRIBUTE_BINDABLE_ASSIGNMENT_SOURCE_KINDS,
  COMPILER_ATTRIBUTE_BINDABLE_VALUE_KINDS,
  COMPILER_ATTRIBUTE_BINDING_LOWERING_OPEN_SEAM_KINDS,
  CompilerAttributeBindableAssignment,
  CompilerAttributeBindableAssignmentProvenance,
  CompilerAttributeBindingLowering,
  CompilerAttributeBindingLoweringOpenSeam,
  CompilerCustomAttributeBindingLowerer,
  type CompilerAttributeBindableAssignmentSourceKind,
  type CompilerAttributeBindableValueKind,
  type CompilerAttributeBindingLoweringOpenSeamKind,
} from './custom-attribute-binding-lowering.js';
export {
  COMPILER_ANONYMOUS_ELEMENT_TEMPLATE_KINDS,
  COMPILED_TEMPLATE_OPEN_SEAM_KINDS,
  CompiledElementNode,
  CompilerProjectionExtraction,
  CompilerProjectionSlot,
  CompiledTemplate,
  CompiledTemplateOpenSeam,
  CompiledTextNode,
  CompilerAnonymousElementDefinition,
  CompilerElementStructuralCarrier,
  CompilerHydrateTemplateControllerInstruction,
  TemplateControllerStructuralLowering,
  type CompiledTemplateNode,
  type CompiledTemplateOpenSeamKind,
  type CompilerAnonymousElementTemplateKind,
} from './compiled-template.js';
export {
  COMPILER_VALUE_PARSE_STATUS_KINDS,
  CompilerValueParseRequest,
  CompilerValueParseResult,
  CompilerValueParser,
  type CompilerValueParseStatusKind,
} from './compiler-value-parser.js';
export {
  PREPARED_RESOURCE_HYDRATION_BUNDLE_MODE_KINDS,
  PREPARED_RESOURCE_HYDRATION_BUNDLE_OPEN_SEAM_KINDS,
  PREPARED_RESOURCE_HYDRATION_INSTRUCTION_KINDS,
  PreparedHydrateAttributeInstruction,
  PreparedHydrateElementInstruction,
  PreparedHydrateTemplateControllerInstruction,
  PreparedResourceHydrationBundle,
  PreparedResourceHydrationBundleOpenSeam,
  type PreparedResourceHydrationBundleModeKind,
  type PreparedResourceHydrationBundleOpenSeamKind,
  type PreparedResourceHydrationInstructionKind,
} from './prepared-resource-hydration.js';
export {
  COMPILER_WORLD_OPEN_SEAM_KINDS,
  COMPILER_ATTRIBUTE_PARSE_CANDIDATE_STATUS_KINDS,
  COMPILER_ATTRIBUTE_PARSE_RESULT_STATUS_KINDS,
  CompilerAttributeParseCandidate,
  CompilerAttributeParseResult,
  CompilerAttributePatternMatch,
  CompilerAttributeParser,
  CompilerBindingCommandResolver,
  CompilerConsultedWorld,
  CompilerResourceAdmissionProvenance,
  CompilerResourceResolver,
  CompilerServiceLocator,
  CompilerTemplateCompilerHooks,
  CompilerWorldOpenSeam,
  type CompilerAttributeParseCandidateStatusKind,
  type CompilerAttributeParseResultStatusKind,
  type CompilerConsultedWorldState,
  type CompilerWorldOpenSeamKind,
} from './compiler-consulted-world.js';
export {
  CompilerCapabilityScanner,
  type CompilerCapabilityScannerOptions,
  type CompilerCapabilityScannerState,
} from './compiler-capability-scanner.js';
export { CompilationContext } from './compilation-context.js';
export { TemplateCompilationEngine } from './template-compilation-engine.js';
export {
  TEMPLATE_CONTROLLER_PREPARATION_OPEN_SEAM_KINDS,
  TemplateControllerPreparation,
  TemplateControllerPreparationOpenSeam,
  TemplateControllerRenderer,
  type TemplateControllerPreparationOpenSeamKind,
} from './template-controller-renderer.js';
export {
  BUILTIN_TEMPLATE_CONTROLLER_FAMILY_KINDS,
  TEMPLATE_CONTROLLER_LINKAGE_KINDS,
  TEMPLATE_CONTROLLER_PROFILE_KINDS,
  TEMPLATE_CONTROLLER_SCOPE_EFFECT_KINDS,
  TEMPLATE_CONTROLLER_TRIGGER_SURFACE_KINDS,
  TEMPLATE_CONTROLLER_VIEW_REALIZATION_POLICY_KINDS,
  BuiltinTemplateControllerProfile,
  CustomTemplateControllerProfile,
  TemplateControllerProfileResolver,
  type BuiltinTemplateControllerFamilyKind,
  type TemplateControllerLinkageKind,
  type TemplateControllerProfileKind,
  type TemplateControllerScopeEffectKind,
  type TemplateControllerTriggerSurfaceKind,
  type TemplateControllerViewRealizationPolicyKind,
} from './template-controller-profile.js';
export type { TemplateControllerProfile } from './template-controller-profile.js';
export {
  TemplateControllerStructuralLowerer,
  type TemplateControllerStructuralParticipant,
} from './template-controller-structural-lowering.js';
export { ViewFactory } from './view-factory.js';
export {
  CURRENT_TARGET_PREPARATION_MODE_KINDS,
  CURRENT_TARGET_PREPARATION_OPEN_SEAM_KINDS,
  AU_SLOT_PREPARATION_OPEN_SEAM_KINDS,
  AuSlotPreparation,
  AuSlotPreparationOpenSeam,
  CurrentTargetPreparation,
  CurrentTargetPreparationOpenSeam,
  type AuSlotPreparationOpenSeamKind,
  type CurrentTargetPreparationModeKind,
  type CurrentTargetPreparationOpenSeamKind,
} from '../rendering/index.js';
export {
  CustomAttributePreparation,
  CustomAttributePreparationOpenSeam,
  CustomAttributeRenderer,
  CustomElementPreparation,
  CustomElementPreparationOpenSeam,
  CustomElementRenderer,
  Rendering,
  type CustomAttributePreparationOpenSeamKind,
  type CustomElementPreparationOpenSeamKind,
} from '../rendering/index.js';
export type { InstructionRenderer } from '../rendering/index.js';
