import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { uniqueStrings } from '../kernel/collections.js';

/**
 * Diagnostics-to-action ontology.
 *
 * Diagnostic actions are not source edits. They are the typed handoff between observed diagnostics/open seams and
 * later planners that can inspect, strengthen, rewrite, or defer a source change.
 */

export enum DiagnosticActionKind {
  /** Declare a missing member on an existing owner type or view-model surface. */
  DeclareMissingMember = 'declare-missing-member',
  /** Declare or infer the type for a template/runtime scope slot that currently exists only at runtime. */
  DeclareScopeSlotType = 'declare-scope-slot-type',
  /** Replace an `any`/unknown/broad owner with a named surface that template tooling can inspect. */
  StrengthenOwnerType = 'strengthen-owner-type',
  /** Rewrite a binding source expression whose runtime assignment semantics are no-op or too weak to author safely. */
  RewriteBindingSource = 'rewrite-binding-source',
  /** Rewrite authored template syntax that the Aurelia parser or template compiler rejects. */
  RewriteTemplateSyntax = 'rewrite-template-syntax',
  /** Align the source member/slot type with the value that the binding observer writes back. */
  AlignAssignmentType = 'align-assignment-type',
  /** Make a target-to-source binding source writable, or point the binding at a writable source. */
  MakeSourceWritable = 'make-source-writable',
  /** Inspect an owner/source type before choosing whether the app source or semantic substrate should change. */
  InspectTypeSurface = 'inspect-type-surface',
  /** Inspect an open semantic seam before claiming an app-source repair is available. */
  InspectOpenSeam = 'inspect-open-seam',
  /** Resolve a runtime-dependent boundary by adding explicit source/configuration or by leaving it intentionally open. */
  ResolveRuntimeBoundary = 'resolve-runtime-boundary',
  /** Register a framework/plugin capability that authored template syntax or resources already demand. */
  RegisterFrameworkCapability = 'register-framework-capability',
  /** Improve semantic-runtime substrate because the app shape appears legitimate but the emulator cannot model it yet. */
  ExtendSemanticSubstrate = 'extend-semantic-substrate',
}

export enum DiagnosticActionEvidenceKind {
  /** Action pressure came from a template diagnostic row. */
  TemplateDiagnostic = 'template-diagnostic',
  /** Action pressure came from an open semantic seam. */
  OpenSeam = 'open-seam',
}

export enum DiagnosticActionPlanKind {
  /** Add or confirm declared members on a TypeScript-visible owner surface. */
  SourceMemberDeclaration = 'source-member-declaration',
  /** Replace an `any`/unknown/broad owner with a named type surface that can be checked and navigated. */
  SourceOwnerTypeStrengthening = 'source-owner-type-strengthening',
  /** Give a runtime template scope slot a TypeScript-visible type surface. */
  TemplateScopeSlotTyping = 'template-scope-slot-typing',
  /** Rewrite an authored binding expression whose runtime write semantics are unsupported or misleading. */
  TemplateExpressionRewrite = 'template-expression-rewrite',
  /** Rewrite authored template syntax rejected by Aurelia parser/compiler semantics. */
  TemplateSyntaxRewrite = 'template-syntax-rewrite',
  /** Change a source member/slot type so observer writeback is TypeScript-assignable. */
  SourceAssignmentTypeAlignment = 'source-assignment-type-alignment',
  /** Change source mutability or choose a writable binding source for observer writeback. */
  SourceWriteabilityAlignment = 'source-writeability-alignment',
  /** Make a runtime-dependent value boundary explicit in app source/configuration, or intentionally keep it open. */
  RuntimeBoundaryDeclaration = 'runtime-boundary-declaration',
  /** Register an Aurelia framework/plugin configuration or registration group in app source. */
  FrameworkCapabilityRegistration = 'framework-capability-registration',
  /** Improve semantic-runtime/Atlas substrate because the app shape appears legitimate but is not modeled yet. */
  SemanticSubstrateExtension = 'semantic-substrate-extension',
  /** Inspect the source/type/runtime context before choosing app-source or substrate work. */
  ManualInspection = 'manual-inspection',
}

export enum DiagnosticActionChangeDomain {
  /** The likely work belongs in user-authored app/package source. */
  AppSource = 'app-source',
  /** The likely work belongs in semantic-runtime, Atlas, or framework-grounding substrate. */
  SemanticRuntimeSubstrate = 'semantic-runtime-substrate',
  /** The likely work is a product/user decision around static treatment of runtime values. */
  RuntimePolicy = 'runtime-policy',
  /** The cluster is not ready to name a change domain without more inspection. */
  Inspection = 'inspection',
}

export enum DiagnosticActionPlanReadiness {
  /** The cluster is specific enough to feed a future edit planner once that planner exists. */
  ReadyToPlan = 'ready-to-plan',
  /** Source-edit placement/formatting/import policy is still the blocker, not semantic understanding. */
  SourceEditPolicyOpen = 'source-edit-policy-open',
  /** Some rows have a concrete action-target source and some do not. */
  TargetSourcePartial = 'target-source-partial',
  /** The cluster targets app source, but no action-target source is available yet. */
  TargetSourceMissing = 'target-source-missing',
  /** A runtime-dependent boundary needs user/product intent before the product should suggest an edit. */
  RuntimeIntentRequired = 'runtime-intent-required',
  /** The app shape points at missing semantic-runtime/Atlas substrate before app-source repair is honest. */
  SubstrateWorkRequired = 'substrate-work-required',
  /** The cluster only promises inspection until the source/type context is understood. */
  InspectionRequired = 'inspection-required',
}

export enum DiagnosticActionRuntimeBoundaryKind {
  /** The value is supplied by the host environment rather than authored source. */
  HostEnvironment = 'host-environment',
  /** The value crosses an external module boundary that the current source program cannot inspect. */
  ExternalModule = 'external-module',
  /** The value is produced by async execution that static app-world construction does not run. */
  AsyncExecution = 'async-execution',
  /** A binding source expression needs live runtime state to produce a concrete value. */
  BindingSourceValue = 'binding-source-value',
  /** A binding source slot exists at runtime but has no statically projected value. */
  BindingSourceSlot = 'binding-source-slot',
  /** A binding source member exists only as a runtime member read, not a static value. */
  BindingSourceMember = 'binding-source-member',
  /** A binding source expression shape is outside the static value reader's modeled expression set. */
  BindingSourceExpression = 'binding-source-expression',
  /** A binding source expression has a checker-visible type surface that remains open. */
  BindingSourceType = 'binding-source-type',
  /** A binding source expression depends on a missing/ambiguous Aurelia resource such as a converter or behavior. */
  BindingSourceResource = 'binding-source-resource',
  /** Select observer modeling could not close the target element or observer value carrier. */
  SelectTarget = 'select-target',
  /** Select observer modeling could not close an option's value/model product. */
  SelectOptionValue = 'select-option-value',
  /** Select observer modeling could not close the option value domain. */
  SelectOptionDomain = 'select-option-domain',
  /** Select observer modeling could not statically decide the select's multiple-value behavior. */
  SelectMultipleState = 'select-multiple-state',
  /** Router instruction materialization lacks the route context needed to resolve navigation. */
  RouterContext = 'router-context',
  /** Router instruction materialization needs a statically enumerable target value. */
  RouterStaticInstruction = 'router-static-instruction',
  /** Router href materialization cannot decide whether the href is external or router-owned. */
  RouterHrefClassification = 'router-href-classification',
  /** Router href click handling is disabled by host element state while href value generation remains active. */
  RouterHrefClickInterception = 'router-href-click-interception',
  /** Router instruction materialization did not receive a usable navigation value. */
  RouterInstructionValue = 'router-instruction-value',
  /** Router instruction parsing failed before a navigation product could be formed. */
  RouterInstructionSyntax = 'router-instruction-syntax',
  /** Router viewport resolution cannot close the target viewport/agent edge. */
  RouterViewport = 'router-viewport',
  /** Router redirect materialization cannot close the redirect target. */
  RouterRedirect = 'router-redirect',
}

export enum DiagnosticActionRuntimeIntentKind {
  /** Add or point at a source-visible contract for host-provided values. */
  DeclareHostContract = 'declare-host-contract',
  /** Add or point at a source-visible contract for external module values. */
  DeclareImportContract = 'declare-import-contract',
  /** Add an explicit async/loading boundary instead of treating the value as static. */
  DeclareAsyncBoundary = 'declare-async-boundary',
  /** Strengthen the source/type surface so binding values are visible without executing runtime state. */
  StrengthenBindingSource = 'strengthen-binding-source',
  /** Register or disambiguate the Aurelia resource used by a binding source expression. */
  RegisterBindingResource = 'register-binding-resource',
  /** Rewrite an expression into a modeled binding expression shape. */
  RewriteBindingExpression = 'rewrite-binding-expression',
  /** Strengthen select value/option/domain typing or admit that the live DOM state remains dynamic. */
  StrengthenSelectDomain = 'strengthen-select-domain',
  /** Declare or select the route context used to interpret a navigation instruction. */
  DeclareRouterContext = 'declare-router-context',
  /** Declare a static route/navigation target or typed pattern that the route recognizer can enumerate. */
  DeclareStaticNavigationTarget = 'declare-static-navigation-target',
  /** Decide whether a dynamic href is external-link intent, internal-router intent, or intentionally runtime-only. */
  ChooseRouterHrefOwnership = 'choose-router-href-ownership',
  /** Mark a router-managed href as native/external when the app intends ordinary browser navigation. */
  DeclareExternalHref = 'declare-external-href',
  /** Rewrite malformed or unsupported router instruction syntax. */
  FixRouterInstructionSyntax = 'fix-router-instruction-syntax',
  /** Declare the viewport or viewport-agent target that owns a routed component activation. */
  DeclareViewportTarget = 'declare-viewport-target',
  /** Declare a redirect target or leave it intentionally runtime-dependent. */
  DeclareRedirectTarget = 'declare-redirect-target',
}

export enum DiagnosticActionTargetSourceCoverage {
  /** Every row in the cluster has an action-target source. */
  All = 'all',
  /** Some rows in the cluster have an action-target source. */
  Some = 'some',
  /** No row in the cluster has an action-target source. */
  None = 'none',
  /** The cluster does not need an app-source edit target. */
  NotApplicable = 'not-applicable',
}

export function diagnosticActionKindForDiagnosticSuggestion(
  suggestionKind: string | null | undefined,
): DiagnosticActionKind {
  switch (suggestionKind) {
    case 'fix-expression-syntax':
    case 'fix-template-syntax':
      return DiagnosticActionKind.RewriteTemplateSyntax;
    case 'declare-explicit-member':
    case 'declare-assignable-member':
      return DiagnosticActionKind.DeclareMissingMember;
    case 'declare-scope-slot-type':
      return DiagnosticActionKind.DeclareScopeSlotType;
    case 'align-assignment-type':
      return DiagnosticActionKind.AlignAssignmentType;
    case 'make-source-writable':
      return DiagnosticActionKind.MakeSourceWritable;
    case 'replace-any-owner':
      return DiagnosticActionKind.StrengthenOwnerType;
    case 'register-resource':
    case 'resolve-runtime-boundary':
    case 'configure-node-observer':
    case 'make-method-trackable':
      return DiagnosticActionKind.ResolveRuntimeBoundary;
    case 'register-framework-capability':
      return DiagnosticActionKind.RegisterFrameworkCapability;
    case 'remove-duplicate-binding-behavior':
    case 'use-assignable-expression':
      return DiagnosticActionKind.RewriteBindingSource;
    case 'inspect-owner-type':
    default:
      return DiagnosticActionKind.InspectTypeSurface;
  }
}

export function diagnosticActionKindForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): DiagnosticActionKind {
  if (reasonKinds.some((reasonKind) =>
    reasonKind === OpenSeamReasonKind.BindingSourceUnsupportedExpression
  )) {
    return DiagnosticActionKind.RewriteBindingSource;
  }
  if (diagnosticActionRuntimeBoundaryKindsForOpenSeamReasons(reasonKinds).length > 0
    || diagnosticActionRuntimeIntentKindsForOpenSeamReasons(reasonKinds).length > 0) {
    return DiagnosticActionKind.ResolveRuntimeBoundary;
  }
  if (reasonKinds.length > 0) {
    return DiagnosticActionKind.ExtendSemanticSubstrate;
  }
  return DiagnosticActionKind.InspectOpenSeam;
}

export function diagnosticActionPlanKindForAction(
  diagnosticActionKind: DiagnosticActionKind | `${DiagnosticActionKind}`,
  suggestionActionKind: string | null,
  actionTargetKind: string | null,
): DiagnosticActionPlanKind {
  switch (diagnosticActionKind) {
    case DiagnosticActionKind.DeclareMissingMember:
      return actionTargetKind === 'scope-slot'
        ? DiagnosticActionPlanKind.TemplateScopeSlotTyping
        : DiagnosticActionPlanKind.SourceMemberDeclaration;
    case DiagnosticActionKind.DeclareScopeSlotType:
      return DiagnosticActionPlanKind.TemplateScopeSlotTyping;
    case DiagnosticActionKind.StrengthenOwnerType:
      return DiagnosticActionPlanKind.SourceOwnerTypeStrengthening;
    case DiagnosticActionKind.RewriteBindingSource:
      return suggestionActionKind === 'rewrite-expression'
        ? DiagnosticActionPlanKind.TemplateExpressionRewrite
        : DiagnosticActionPlanKind.ManualInspection;
    case DiagnosticActionKind.RewriteTemplateSyntax:
      return DiagnosticActionPlanKind.TemplateSyntaxRewrite;
    case DiagnosticActionKind.AlignAssignmentType:
      return DiagnosticActionPlanKind.SourceAssignmentTypeAlignment;
    case DiagnosticActionKind.MakeSourceWritable:
      return DiagnosticActionPlanKind.SourceWriteabilityAlignment;
    case DiagnosticActionKind.ResolveRuntimeBoundary:
      return DiagnosticActionPlanKind.RuntimeBoundaryDeclaration;
    case DiagnosticActionKind.RegisterFrameworkCapability:
      return DiagnosticActionPlanKind.FrameworkCapabilityRegistration;
    case DiagnosticActionKind.ExtendSemanticSubstrate:
      return DiagnosticActionPlanKind.SemanticSubstrateExtension;
    case DiagnosticActionKind.InspectTypeSurface:
    case DiagnosticActionKind.InspectOpenSeam:
    default:
      return DiagnosticActionPlanKind.ManualInspection;
  }
}

export function diagnosticActionChangeDomainForPlan(
  planKind: DiagnosticActionPlanKind | `${DiagnosticActionPlanKind}`,
): DiagnosticActionChangeDomain {
  switch (planKind) {
    case DiagnosticActionPlanKind.SourceMemberDeclaration:
    case DiagnosticActionPlanKind.SourceOwnerTypeStrengthening:
    case DiagnosticActionPlanKind.TemplateScopeSlotTyping:
    case DiagnosticActionPlanKind.TemplateExpressionRewrite:
    case DiagnosticActionPlanKind.TemplateSyntaxRewrite:
    case DiagnosticActionPlanKind.SourceAssignmentTypeAlignment:
    case DiagnosticActionPlanKind.SourceWriteabilityAlignment:
    case DiagnosticActionPlanKind.FrameworkCapabilityRegistration:
      return DiagnosticActionChangeDomain.AppSource;
    case DiagnosticActionPlanKind.RuntimeBoundaryDeclaration:
      return DiagnosticActionChangeDomain.RuntimePolicy;
    case DiagnosticActionPlanKind.SemanticSubstrateExtension:
      return DiagnosticActionChangeDomain.SemanticRuntimeSubstrate;
    case DiagnosticActionPlanKind.ManualInspection:
    default:
      return DiagnosticActionChangeDomain.Inspection;
  }
}

export function diagnosticActionPlanReadinessForCluster(
  planKind: DiagnosticActionPlanKind | `${DiagnosticActionPlanKind}`,
  actionTargetSourceCoverage: DiagnosticActionTargetSourceCoverage,
  openReasonKinds: readonly string[],
): DiagnosticActionPlanReadiness {
  switch (diagnosticActionChangeDomainForPlan(planKind)) {
    case DiagnosticActionChangeDomain.SemanticRuntimeSubstrate:
      return DiagnosticActionPlanReadiness.SubstrateWorkRequired;
    case DiagnosticActionChangeDomain.RuntimePolicy:
      return DiagnosticActionPlanReadiness.RuntimeIntentRequired;
    case DiagnosticActionChangeDomain.Inspection:
      return DiagnosticActionPlanReadiness.InspectionRequired;
    case DiagnosticActionChangeDomain.AppSource:
      break;
  }

  if (
    planKind === DiagnosticActionPlanKind.FrameworkCapabilityRegistration
    && openReasonKinds.length === 0
  ) {
    return DiagnosticActionPlanReadiness.SourceEditPolicyOpen;
  }

  if (
    actionTargetSourceCoverage === DiagnosticActionTargetSourceCoverage.None
    || actionTargetSourceCoverage === DiagnosticActionTargetSourceCoverage.NotApplicable
  ) {
    return DiagnosticActionPlanReadiness.TargetSourceMissing;
  }
  if (actionTargetSourceCoverage === DiagnosticActionTargetSourceCoverage.Some) {
    return DiagnosticActionPlanReadiness.TargetSourcePartial;
  }
  return openReasonKinds.includes('source-edit-policy-open')
    ? DiagnosticActionPlanReadiness.SourceEditPolicyOpen
    : DiagnosticActionPlanReadiness.ReadyToPlan;
}

export function diagnosticActionRuntimeBoundaryKindsForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): readonly DiagnosticActionRuntimeBoundaryKind[] {
  return uniqueStrings(reasonKinds.flatMap((reasonKind) => runtimeBoundaryKindsForOpenSeamReason(reasonKind)), 'sorted');
}

export function diagnosticActionRuntimeIntentKindsForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): readonly DiagnosticActionRuntimeIntentKind[] {
  return uniqueStrings(reasonKinds.flatMap((reasonKind) => runtimeIntentKindsForOpenSeamReason(reasonKind)), 'sorted');
}

function runtimeBoundaryKindsForOpenSeamReason(
  reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`,
): readonly DiagnosticActionRuntimeBoundaryKind[] {
  switch (reasonKind) {
    case OpenSeamReasonKind.HostEnvironmentValue:
      return [DiagnosticActionRuntimeBoundaryKind.HostEnvironment];
    case OpenSeamReasonKind.ExternalModuleValue:
      return [DiagnosticActionRuntimeBoundaryKind.ExternalModule];
    case OpenSeamReasonKind.AsyncExecutionValue:
      return [DiagnosticActionRuntimeBoundaryKind.AsyncExecution];
    case OpenSeamReasonKind.BindingSourceNeedsRuntimeValue:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceValue];
    case OpenSeamReasonKind.BindingSourceSlotNoStaticValue:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceSlot];
    case OpenSeamReasonKind.BindingSourceMemberNoStaticValue:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceMember];
    case OpenSeamReasonKind.BindingSourceUnsupportedExpression:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceExpression];
    case OpenSeamReasonKind.BindingSourceTypeOpen:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceType];
    case OpenSeamReasonKind.BindingSourceResourceOpen:
      return [DiagnosticActionRuntimeBoundaryKind.BindingSourceResource];
    case OpenSeamReasonKind.BindingValueChannelSelectTargetOpen:
      return [DiagnosticActionRuntimeBoundaryKind.SelectTarget];
    case OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen:
      return [DiagnosticActionRuntimeBoundaryKind.SelectOptionValue];
    case OpenSeamReasonKind.BindingValueChannelSelectOptionDomainOpen:
      return [DiagnosticActionRuntimeBoundaryKind.SelectOptionDomain];
    case OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen:
    case OpenSeamReasonKind.BindingValueChannelDynamicSelectMultiple:
      return [DiagnosticActionRuntimeBoundaryKind.SelectMultipleState];
    case OpenSeamReasonKind.RouterInstructionNeedsRouteContext:
      return [DiagnosticActionRuntimeBoundaryKind.RouterContext];
    case OpenSeamReasonKind.RouterInstructionNeedsStaticValue:
      return [DiagnosticActionRuntimeBoundaryKind.RouterStaticInstruction];
    case OpenSeamReasonKind.RouterHrefExternalityOpen:
      return [DiagnosticActionRuntimeBoundaryKind.RouterHrefClassification];
    case OpenSeamReasonKind.RouterHrefClickInterceptionDisabled:
    case OpenSeamReasonKind.RouterHrefClickInterceptionTargetOpen:
      return [DiagnosticActionRuntimeBoundaryKind.RouterHrefClickInterception];
    case OpenSeamReasonKind.RouterInstructionMissingValue:
      return [DiagnosticActionRuntimeBoundaryKind.RouterInstructionValue];
    case OpenSeamReasonKind.RouterInstructionParseFailure:
      return [DiagnosticActionRuntimeBoundaryKind.RouterInstructionSyntax];
    case OpenSeamReasonKind.RouterViewportResolutionOpen:
      return [DiagnosticActionRuntimeBoundaryKind.RouterViewport];
    case OpenSeamReasonKind.RouterRedirectTargetOpen:
      return [DiagnosticActionRuntimeBoundaryKind.RouterRedirect];
    default:
      return [];
  }
}

function runtimeIntentKindsForOpenSeamReason(
  reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`,
): readonly DiagnosticActionRuntimeIntentKind[] {
  switch (reasonKind) {
    case OpenSeamReasonKind.HostEnvironmentValue:
      return [DiagnosticActionRuntimeIntentKind.DeclareHostContract];
    case OpenSeamReasonKind.ExternalModuleValue:
      return [DiagnosticActionRuntimeIntentKind.DeclareImportContract];
    case OpenSeamReasonKind.AsyncExecutionValue:
      return [DiagnosticActionRuntimeIntentKind.DeclareAsyncBoundary];
    case OpenSeamReasonKind.BindingSourceNeedsRuntimeValue:
    case OpenSeamReasonKind.BindingSourceSlotNoStaticValue:
    case OpenSeamReasonKind.BindingSourceMemberNoStaticValue:
    case OpenSeamReasonKind.BindingSourceTypeOpen:
      return [DiagnosticActionRuntimeIntentKind.StrengthenBindingSource];
    case OpenSeamReasonKind.BindingSourceResourceOpen:
      return [DiagnosticActionRuntimeIntentKind.RegisterBindingResource];
    case OpenSeamReasonKind.BindingSourceUnsupportedExpression:
      return [DiagnosticActionRuntimeIntentKind.RewriteBindingExpression];
    case OpenSeamReasonKind.BindingValueChannelSelectTargetOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectOptionDomainOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen:
    case OpenSeamReasonKind.BindingValueChannelDynamicSelectMultiple:
      return [DiagnosticActionRuntimeIntentKind.StrengthenSelectDomain];
    case OpenSeamReasonKind.RouterInstructionNeedsRouteContext:
      return [DiagnosticActionRuntimeIntentKind.DeclareRouterContext];
    case OpenSeamReasonKind.RouterInstructionNeedsStaticValue:
    case OpenSeamReasonKind.RouterInstructionMissingValue:
      return [DiagnosticActionRuntimeIntentKind.DeclareStaticNavigationTarget];
    case OpenSeamReasonKind.RouterHrefExternalityOpen:
      return [DiagnosticActionRuntimeIntentKind.ChooseRouterHrefOwnership];
    case OpenSeamReasonKind.RouterHrefClickInterceptionDisabled:
      return [DiagnosticActionRuntimeIntentKind.DeclareExternalHref];
    case OpenSeamReasonKind.RouterHrefClickInterceptionTargetOpen:
      return [DiagnosticActionRuntimeIntentKind.DeclareHostContract];
    case OpenSeamReasonKind.RouterInstructionParseFailure:
      return [DiagnosticActionRuntimeIntentKind.FixRouterInstructionSyntax];
    case OpenSeamReasonKind.RouterViewportResolutionOpen:
      return [DiagnosticActionRuntimeIntentKind.DeclareViewportTarget];
    case OpenSeamReasonKind.RouterRedirectTargetOpen:
      return [DiagnosticActionRuntimeIntentKind.DeclareRedirectTarget];
    default:
      return [];
  }
}
