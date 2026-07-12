/**
 * Diagnostics-to-action ontology.
 *
 * Diagnostic actions are not source edits. They are the typed handoff between source diagnostics and later planners
 * that can inspect, strengthen, rewrite, or defer a source change.
 */

export enum DiagnosticSuggestionKind {
  /** Replace or retarget an expression whose selected value is not callable. */
  UseCallableExpression = 'use-callable-expression',
  /** Admit a missing Aurelia resource into the compiler-visible resource scope. */
  RegisterResource = 'register-resource',
  /** Register a DI service required by the modeled framework operation. */
  RegisterDiService = 'register-di-service',
  /** Remove a repeated binding behavior that Aurelia rejects on one expression. */
  RemoveDuplicateBindingBehavior = 'remove-duplicate-binding-behavior',
  /** Guard or narrow a nullish expression before strict Aurelia evaluation. */
  GuardNullishExpression = 'guard-nullish-expression',
  /** Replace an observed increment whose assignment semantics are unsafe or misleading. */
  AvoidObservedIncrement = 'avoid-observed-increment',
  /** Make a runtime-dependent value boundary explicit or intentionally leave it dynamic. */
  ResolveRuntimeBoundary = 'resolve-runtime-boundary',
  /** Replace a repeat source with a value Aurelia can iterate. */
  UseRepeatableSource = 'use-repeatable-source',
  /** Replace a destructuring source with one safe for the authored binding pattern. */
  UseSafeDestructuringSource = 'use-safe-destructuring-source',
  /** Repair expression grammar rejected before semantic evaluation. */
  FixExpressionSyntax = 'fix-expression-syntax',
  /** Repair authored template syntax rejected by the Aurelia compiler. */
  FixTemplateSyntax = 'fix-template-syntax',
  /** Register a framework or plugin capability already demanded by authored syntax. */
  RegisterFrameworkCapability = 'register-framework-capability',
  /** Repair a template-authored router instruction without inventing a destination. */
  FixRouterInstruction = 'fix-router-instruction',
  /** Declare a missing source member when its owner and insertion target are provable. */
  DeclareExplicitMember = 'declare-explicit-member',
  /** Declare a missing member that must accept observer writeback. */
  DeclareAssignableMember = 'declare-assignable-member',
  /** Give a framework-created template scope slot a source-visible type. */
  DeclareScopeSlotType = 'declare-scope-slot-type',
  /** Replace an `any` owner with a source-visible type surface. */
  ReplaceAnyOwner = 'replace-any-owner',
  /** Align a source member type with the value Aurelia assigns to it. */
  AlignAssignmentType = 'align-assignment-type',
  /** Make an observer writeback target writable or choose a writable target. */
  MakeSourceWritable = 'make-source-writable',
  /** Replace an expression that Aurelia cannot assign through. */
  UseAssignableExpression = 'use-assignable-expression',
  /** Make method dependencies explicit when an ordinary template call cannot observe its body. */
  MakeMethodTrackable = 'make-method-trackable',
  /** Configure the node observer strategy required by a binding target. */
  ConfigureNodeObserver = 'configure-node-observer',
  /** Inspect an owner type before claiming a safe source mutation. */
  InspectOwnerType = 'inspect-owner-type',
}

export enum DiagnosticSuggestionActionKind {
  /** Change app resource registration or visibility. */
  RegisterResource = 'register-resource',
  /** Change app DI registration. */
  RegisterService = 'register-service',
  /** Declare source or policy for a value that remains runtime-dependent. */
  DeclareRuntimeBoundary = 'declare-runtime-boundary',
  /** Add a source-visible member to a proven owner. */
  DeclareMember = 'declare-member',
  /** Add type information for a framework-created scope slot. */
  DeclareScopeSlot = 'declare-scope-slot',
  /** Strengthen or replace the type of an expression owner. */
  ReplaceOwnerType = 'replace-owner-type',
  /** Change a member type to satisfy value transport. */
  ChangeMemberType = 'change-member-type',
  /** Change member writability to satisfy observer assignment. */
  ChangeMemberMutability = 'change-member-mutability',
  /** Change observation metadata or observer configuration. */
  ConfigureObserver = 'configure-observer',
  /** Rewrite an authored Aurelia expression. */
  RewriteExpression = 'rewrite-expression',
  /** Rewrite authored template structure or attribute syntax. */
  RewriteTemplateSyntax = 'rewrite-template-syntax',
  /** Change framework or plugin capability admission in app configuration. */
  RegisterFrameworkCapability = 'register-framework-capability',
  /** Inspect type facts before selecting a mutating action. */
  InspectOwnerType = 'inspect-owner-type',
}

export enum DiagnosticSuggestionValueTypeSource {
  /** The suggested value type came from the member selected at the diagnostic locus. */
  SelectedMember = 'selected-member',
  /** The suggested value type came from the binding target channel. */
  BindingTarget = 'binding-target',
  /** The suggested value type came from the source assignment target. */
  AssignmentTarget = 'assignment-target',
}

export enum DiagnosticSuggestionActionTargetKind {
  /** An Aurelia resource definition or registration surface. */
  Resource = 'resource',
  /** A DI service registration or declaration surface. */
  Service = 'service',
  /** A value boundary that cannot be closed without runtime or author intent. */
  RuntimeBoundary = 'runtime-boundary',
  /** Observation metadata or node-observer configuration. */
  ObserverConfig = 'observer-config',
  /** Framework or plugin capability admission in app configuration. */
  FrameworkCapability = 'framework-capability',
  /** The source-visible type that owns an expression member. */
  OwnerType = 'owner-type',
  /** A framework-created name in Aurelia template scope. */
  ScopeSlot = 'scope-slot',
  /** An authored Aurelia expression span. */
  Expression = 'expression',
  /** Authored template structure or attribute syntax. */
  TemplateSyntax = 'template-syntax',
}

export interface DiagnosticSuggestionActionTarget<TSource = unknown> {
  readonly targetKind: DiagnosticSuggestionActionTargetKind | `${DiagnosticSuggestionActionTargetKind}`;
  readonly source: TSource | null;
  readonly memberName: string | null;
  readonly typeDisplay: string | null;
}

export interface DiagnosticSuggestion<TSource = unknown> {
  readonly suggestionKind: DiagnosticSuggestionKind | `${DiagnosticSuggestionKind}`;
  readonly actionKind: DiagnosticSuggestionActionKind | `${DiagnosticSuggestionActionKind}`;
  readonly actionTarget: DiagnosticSuggestionActionTarget<TSource> | null;
  readonly summary: string;
  readonly targetMemberName: string | null;
  readonly ownerTypeDisplay: string | null;
  readonly valueTypeDisplay: string | null;
  readonly valueTypeSource: DiagnosticSuggestionValueTypeSource | `${DiagnosticSuggestionValueTypeSource}` | null;
}

export enum DiagnosticActionKind {
  /** Declare a missing member on an existing owner type or view-model surface. */
  DeclareMissingMember = 'declare-missing-member',
  /** Declare or infer the type for a template/runtime scope slot that currently exists only at runtime. */
  DeclareScopeSlotType = 'declare-scope-slot-type',
  /** Replace an `any`/unknown/broad owner with a named surface that template tooling can inspect. */
  StrengthenOwnerType = 'strengthen-owner-type',
  /** Rewrite an authored template expression whose syntax or runtime semantics are unsafe or unsupported. */
  RewriteExpression = 'rewrite-expression',
  /** Rewrite authored template syntax that the Aurelia parser or template compiler rejects. */
  RewriteTemplateSyntax = 'rewrite-template-syntax',
  /** Repair a template-authored router instruction without claiming that a validated edit plan exists. */
  RewriteRouterInstruction = 'rewrite-router-instruction',
  /** Align the source member/slot type with the value that the binding observer writes back. */
  AlignAssignmentType = 'align-assignment-type',
  /** Make a target-to-source binding source writable, or point the binding at a writable source. */
  MakeSourceWritable = 'make-source-writable',
  /** Inspect an owner/source type before choosing whether app source or runtime policy should change. */
  InspectTypeSurface = 'inspect-type-surface',
  /** Register or import an Aurelia resource into the compiler-visible app scope. */
  RegisterResource = 'register-resource',
  /** Register an app DI service required by an Aurelia runtime feature. */
  RegisterService = 'register-service',
  /** Configure observation behavior or make a source member explicitly trackable. */
  ConfigureObserver = 'configure-observer',
  /** Resolve a runtime-dependent boundary by adding explicit source/configuration or by leaving it intentionally open. */
  ResolveRuntimeBoundary = 'resolve-runtime-boundary',
  /** Register a framework/plugin capability that authored template syntax or resources already demand. */
  RegisterFrameworkCapability = 'register-framework-capability',
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
  /** Rewrite or retarget a template-authored router instruction. */
  RouterInstructionRewrite = 'router-instruction-rewrite',
  /** Change a source member/slot type so observer writeback is TypeScript-assignable. */
  SourceAssignmentTypeAlignment = 'source-assignment-type-alignment',
  /** Change source mutability or choose a writable binding source for observer writeback. */
  SourceWriteabilityAlignment = 'source-writeability-alignment',
  /** Make a runtime-dependent value boundary explicit in app source/configuration, or intentionally keep it open. */
  RuntimeBoundaryDeclaration = 'runtime-boundary-declaration',
  /** Register an Aurelia framework/plugin configuration or registration group in app source. */
  FrameworkCapabilityRegistration = 'framework-capability-registration',
  /** Register or import an Aurelia resource into an app/compiler resource scope. */
  ResourceRegistration = 'resource-registration',
  /** Register an app-owned DI service needed by a framework feature. */
  ServiceRegistration = 'service-registration',
  /** Configure observation or annotate/restructure a member so its dependencies are trackable. */
  ObservationConfiguration = 'observation-configuration',
  /** Inspect the source/type/runtime context before choosing app-source or substrate work. */
  ManualInspection = 'manual-inspection',
}

export enum DiagnosticActionChangeDomain {
  /** The likely work belongs in user-authored app/package source. */
  AppSource = 'app-source',
  /** The likely work is a product/user decision around static treatment of runtime values. */
  RuntimePolicy = 'runtime-policy',
  /** The diagnostic does not yet prove which change domain owns the repair. */
  Inspection = 'inspection',
}

export enum DiagnosticActionPlanReadiness {
  /** The diagnostic suggestion is specific enough to feed a future edit planner once that planner exists. */
  ReadyToPlan = 'ready-to-plan',
  /** Source-edit placement/formatting/import policy is still the blocker, not semantic understanding. */
  SourceEditPolicyOpen = 'source-edit-policy-open',
  /** The suggestion targets app source, but no action-target source is available yet. */
  TargetSourceMissing = 'target-source-missing',
  /** A runtime-dependent boundary needs user/product intent before the product should suggest an edit. */
  RuntimeIntentRequired = 'runtime-intent-required',
  /** The suggestion only promises inspection until the source/type context is understood. */
  InspectionRequired = 'inspection-required',
}

export enum DiagnosticActionTargetSourceCoverage {
  /** The suggestion has an action-target source. */
  All = 'all',
  /** The suggestion has no action-target source. */
  None = 'none',
  /** No suggestion exists, so action-target coverage does not apply. */
  NotApplicable = 'not-applicable',
}

export enum DiagnosticRepairActionability {
  /** The diagnostic can name a concrete repair direction without claiming an edit exists. */
  Guided = 'guided',
  /** The diagnostic requires developer inspection before a repair direction is honest. */
  Manual = 'manual',
}

export interface DiagnosticRepairAffordance {
  readonly actionKind: DiagnosticActionKind | `${DiagnosticActionKind}`;
  readonly planKind: DiagnosticActionPlanKind | `${DiagnosticActionPlanKind}`;
  readonly changeDomain: DiagnosticActionChangeDomain | `${DiagnosticActionChangeDomain}`;
  readonly readiness: DiagnosticActionPlanReadiness | `${DiagnosticActionPlanReadiness}`;
  readonly targetSourceCoverage: DiagnosticActionTargetSourceCoverage | `${DiagnosticActionTargetSourceCoverage}`;
  readonly actionability: DiagnosticRepairActionability | `${DiagnosticRepairActionability}`;
}

export function diagnosticRepairAffordanceForSuggestion(
  suggestion: DiagnosticSuggestion<unknown> | null | undefined,
): DiagnosticRepairAffordance {
  const actionKind = diagnosticActionKindForSuggestion(suggestion);
  const planKind = diagnosticActionPlanKindForAction(
    actionKind,
    suggestion?.actionTarget?.targetKind ?? null,
  );
  const targetSourceCoverage = diagnosticActionTargetSourceCoverageForSuggestion(suggestion);
  const changeDomain = diagnosticActionChangeDomainForPlan(planKind);
  const readiness = diagnosticActionPlanReadinessForAffordance(
    planKind,
    targetSourceCoverage,
  );
  return {
    actionKind,
    planKind,
    changeDomain,
    readiness,
    targetSourceCoverage,
    actionability: diagnosticRepairActionabilityForAffordance(
      changeDomain,
      readiness,
    ),
  };
}

export function diagnosticActionTargetSourceCoverageForSuggestion(
  suggestion: DiagnosticSuggestion<unknown> | null | undefined,
): DiagnosticActionTargetSourceCoverage {
  if (suggestion == null) {
    return DiagnosticActionTargetSourceCoverage.NotApplicable;
  }
  return suggestion.actionTarget?.source == null
    ? DiagnosticActionTargetSourceCoverage.None
    : DiagnosticActionTargetSourceCoverage.All;
}

function diagnosticRepairActionabilityForAffordance(
  changeDomain: DiagnosticActionChangeDomain | `${DiagnosticActionChangeDomain}`,
  readiness: DiagnosticActionPlanReadiness | `${DiagnosticActionPlanReadiness}`,
): DiagnosticRepairActionability {
  if (
    changeDomain === DiagnosticActionChangeDomain.Inspection
    || readiness === DiagnosticActionPlanReadiness.InspectionRequired
  ) {
    return DiagnosticRepairActionability.Manual;
  }
  return DiagnosticRepairActionability.Guided;
}

function diagnosticActionKindForSuggestion(
  suggestion: DiagnosticSuggestion<unknown> | null | undefined,
): DiagnosticActionKind {
  const actionKind = suggestion?.actionKind;
  switch (actionKind) {
    case DiagnosticSuggestionActionKind.DeclareMember:
      return DiagnosticActionKind.DeclareMissingMember;
    case DiagnosticSuggestionActionKind.DeclareScopeSlot:
      return DiagnosticActionKind.DeclareScopeSlotType;
    case DiagnosticSuggestionActionKind.ChangeMemberType:
      return DiagnosticActionKind.AlignAssignmentType;
    case DiagnosticSuggestionActionKind.ChangeMemberMutability:
      return DiagnosticActionKind.MakeSourceWritable;
    case DiagnosticSuggestionActionKind.ReplaceOwnerType:
      return DiagnosticActionKind.StrengthenOwnerType;
    case DiagnosticSuggestionActionKind.RegisterResource:
      return DiagnosticActionKind.RegisterResource;
    case DiagnosticSuggestionActionKind.RegisterService:
      return DiagnosticActionKind.RegisterService;
    case DiagnosticSuggestionActionKind.ConfigureObserver:
      return DiagnosticActionKind.ConfigureObserver;
    case DiagnosticSuggestionActionKind.DeclareRuntimeBoundary:
      return DiagnosticActionKind.ResolveRuntimeBoundary;
    case DiagnosticSuggestionActionKind.RegisterFrameworkCapability:
      return DiagnosticActionKind.RegisterFrameworkCapability;
    case DiagnosticSuggestionActionKind.RewriteExpression:
      return suggestion?.suggestionKind === DiagnosticSuggestionKind.FixRouterInstruction
        ? DiagnosticActionKind.RewriteRouterInstruction
        : DiagnosticActionKind.RewriteExpression;
    case DiagnosticSuggestionActionKind.RewriteTemplateSyntax:
      return DiagnosticActionKind.RewriteTemplateSyntax;
    case DiagnosticSuggestionActionKind.InspectOwnerType:
    case undefined:
      return DiagnosticActionKind.InspectTypeSurface;
    default:
      return assertUnreachableSuggestionAction(actionKind);
  }
}

function assertUnreachableSuggestionAction(value: never): never {
  throw new Error(`Unsupported diagnostic suggestion action kind: ${String(value)}`);
}

function diagnosticActionPlanKindForAction(
  diagnosticActionKind: DiagnosticActionKind | `${DiagnosticActionKind}`,
  actionTargetKind: DiagnosticSuggestionActionTargetKind | `${DiagnosticSuggestionActionTargetKind}` | null,
): DiagnosticActionPlanKind {
  switch (diagnosticActionKind) {
    case DiagnosticActionKind.DeclareMissingMember:
      return actionTargetKind === DiagnosticSuggestionActionTargetKind.ScopeSlot
        ? DiagnosticActionPlanKind.TemplateScopeSlotTyping
        : DiagnosticActionPlanKind.SourceMemberDeclaration;
    case DiagnosticActionKind.DeclareScopeSlotType:
      return DiagnosticActionPlanKind.TemplateScopeSlotTyping;
    case DiagnosticActionKind.StrengthenOwnerType:
      return DiagnosticActionPlanKind.SourceOwnerTypeStrengthening;
    case DiagnosticActionKind.RewriteExpression:
      return DiagnosticActionPlanKind.TemplateExpressionRewrite;
    case DiagnosticActionKind.RewriteTemplateSyntax:
      return DiagnosticActionPlanKind.TemplateSyntaxRewrite;
    case DiagnosticActionKind.RewriteRouterInstruction:
      return DiagnosticActionPlanKind.RouterInstructionRewrite;
    case DiagnosticActionKind.AlignAssignmentType:
      return DiagnosticActionPlanKind.SourceAssignmentTypeAlignment;
    case DiagnosticActionKind.MakeSourceWritable:
      return DiagnosticActionPlanKind.SourceWriteabilityAlignment;
    case DiagnosticActionKind.ResolveRuntimeBoundary:
      return DiagnosticActionPlanKind.RuntimeBoundaryDeclaration;
    case DiagnosticActionKind.RegisterFrameworkCapability:
      return DiagnosticActionPlanKind.FrameworkCapabilityRegistration;
    case DiagnosticActionKind.RegisterResource:
      return DiagnosticActionPlanKind.ResourceRegistration;
    case DiagnosticActionKind.RegisterService:
      return DiagnosticActionPlanKind.ServiceRegistration;
    case DiagnosticActionKind.ConfigureObserver:
      return DiagnosticActionPlanKind.ObservationConfiguration;
    case DiagnosticActionKind.InspectTypeSurface:
      return DiagnosticActionPlanKind.ManualInspection;
    default:
      return assertUnreachableDiagnosticActionKind(diagnosticActionKind);
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
    case DiagnosticActionPlanKind.RouterInstructionRewrite:
    case DiagnosticActionPlanKind.SourceAssignmentTypeAlignment:
    case DiagnosticActionPlanKind.SourceWriteabilityAlignment:
    case DiagnosticActionPlanKind.FrameworkCapabilityRegistration:
    case DiagnosticActionPlanKind.ResourceRegistration:
    case DiagnosticActionPlanKind.ServiceRegistration:
    case DiagnosticActionPlanKind.ObservationConfiguration:
      return DiagnosticActionChangeDomain.AppSource;
    case DiagnosticActionPlanKind.RuntimeBoundaryDeclaration:
      return DiagnosticActionChangeDomain.RuntimePolicy;
    case DiagnosticActionPlanKind.ManualInspection:
      return DiagnosticActionChangeDomain.Inspection;
    default:
      return assertUnreachableDiagnosticActionPlanKind(planKind);
  }
}

function diagnosticActionPlanReadinessForAffordance(
  planKind: DiagnosticActionPlanKind | `${DiagnosticActionPlanKind}`,
  actionTargetSourceCoverage: DiagnosticActionTargetSourceCoverage,
): DiagnosticActionPlanReadiness {
  switch (diagnosticActionChangeDomainForPlan(planKind)) {
    case DiagnosticActionChangeDomain.RuntimePolicy:
      return DiagnosticActionPlanReadiness.RuntimeIntentRequired;
    case DiagnosticActionChangeDomain.Inspection:
      return DiagnosticActionPlanReadiness.InspectionRequired;
    case DiagnosticActionChangeDomain.AppSource:
      break;
  }

  if (
    planKind === DiagnosticActionPlanKind.FrameworkCapabilityRegistration
  ) {
    return DiagnosticActionPlanReadiness.SourceEditPolicyOpen;
  }

  if (
    actionTargetSourceCoverage === DiagnosticActionTargetSourceCoverage.None
    || actionTargetSourceCoverage === DiagnosticActionTargetSourceCoverage.NotApplicable
  ) {
    return DiagnosticActionPlanReadiness.TargetSourceMissing;
  }
  return DiagnosticActionPlanReadiness.ReadyToPlan;
}

function assertUnreachableDiagnosticActionKind(value: never): never {
  throw new Error(`Unsupported diagnostic action kind: ${String(value)}`);
}

function assertUnreachableDiagnosticActionPlanKind(value: never): never {
  throw new Error(`Unsupported diagnostic action plan kind: ${String(value)}`);
}
