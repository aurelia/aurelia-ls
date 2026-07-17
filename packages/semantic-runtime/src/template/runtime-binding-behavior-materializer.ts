import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  ImmediateKernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  ArrayLiteralExpression,
  PrimitiveLiteralExpression,
  TemplateExpression,
  type IsAssign,
} from '../expression/ast.js';
import type { SourceSpan } from '../expression/source-span.js';
import { SourceSpanRole } from '../kernel/address.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import { TemplateProductDetails } from './product-details.js';
import {
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
} from './runtime-binding.js';
import type { RuntimeControllerBindEmission } from './runtime-controller-bind-materializer.js';
import {
  RuntimeBindingBehaviorApplication,
  RuntimeBindingBehaviorApplicationPhase,
  RuntimeBindingBehaviorIssue,
  RuntimeBindingBehaviorIssuePhase,
  type BuiltInBindingBehaviorBindIssue,
} from './runtime-binding-behavior.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
import { appendRuntimeBindingProductValue } from './runtime-binding-product-index.js';
import type {
  RuntimeBindingBehaviorPlanEntry,
  RuntimeExpressionResourcePlan,
} from './runtime-expression-resource-plan.js';
import {
  RuntimeExpressionResourceLifecycleEffectKind,
  RuntimeExpressionResourceLifecycleEffects,
  RuntimeExpressionResourceBindReachability,
  RuntimeExpressionResourcePhaseReachability,
  RuntimeExpressionResourceSignal,
  RuntimeExpressionResourceValueState,
} from './runtime-expression-resource.js';
import { bindingModeForBindingBehaviorName } from './runtime-binding-mode-behavior.js';

export class RuntimeBindingBehaviorMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    readonly controllerBind: RuntimeControllerBindEmission,
  ) {}
}

export class RuntimeBindingBehaviorEmission {
  private readonly applicationsByBinding = new Map<string, RuntimeBindingBehaviorApplication[]>();
  private readonly issuesByBinding = new Map<string, RuntimeBindingBehaviorIssue[]>();

  constructor(
    readonly applications: readonly RuntimeBindingBehaviorApplication[],
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const application of applications) {
      if (application.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.applicationsByBinding, application.binding.productHandle, application);
    }
    for (const issue of issues) {
      if (issue.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.issuesByBinding, issue.binding.productHandle, issue);
    }
  }

  readApplicationsForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorApplication[] {
    return this.applicationsByBinding.get(productHandle) ?? [];
  }

  readIssuesForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorIssue[] {
    return this.issuesByBinding.get(productHandle) ?? [];
  }
}

class RuntimeBindingBehaviorSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeBindingBehaviorPublication {
  constructor(
    readonly applications: readonly RuntimeBindingBehaviorApplication[],
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class RuntimeBindingBehaviorLifecyclePublication {
  constructor(
    readonly bind: RuntimeExpressionResourceLifecycleEffects,
    readonly unbind: RuntimeExpressionResourceLifecycleEffects,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes runtime binding-behavior applications from the pre-bind plan after target facts exist. */
export class RuntimeBindingBehaviorMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext = new ImmediateKernelPublicationContext(store),
  ) {}

  materialize(input: RuntimeBindingBehaviorMaterializationRequest): RuntimeBindingBehaviorEmission {
    const emission = this.recordsForBindingBehaviors(input);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `binding-behavior:${input.localKey}`),
      [
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingBehaviorApplication, emission.applications),
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingBehaviorIssue, emission.issues),
      ],
    ));
    return emission;
  }

  private recordsForBindingBehaviors(
    input: RuntimeBindingBehaviorMaterializationRequest,
  ): RuntimeBindingBehaviorEmission {
    const source = this.recordsForSource(input.localKey);
    const applications: RuntimeBindingBehaviorApplication[] = [];
    const issues: RuntimeBindingBehaviorIssue[] = [];
    const records: KernelStoreRecord[] = [...source.records];

    for (const entry of input.expressionResourcePlan.behaviorEntries) {
      const targetAccess = firstTargetAccess(input.controllerBind, entry.binding);
      const publication = this.bindingBehaviorPublication(
        `${input.localKey}:binding:${entry.bindingIndex}:expression:${entry.expressionIndex}:behavior:${entry.behaviorIndex}:${entry.occurrence.expression.name.name}`,
        input.expressionResourcePlan,
        entry,
        targetAccess,
        source,
      );
      applications.push(...publication.applications);
      issues.push(...publication.issues);
      records.push(...publication.records);
    }

    return new RuntimeBindingBehaviorEmission(applications, issues, records);
  }

  private bindingBehaviorPublication(
    local: string,
    plan: RuntimeExpressionResourcePlan,
    entry: RuntimeBindingBehaviorPlanEntry,
    targetAccess: RuntimeBindingTargetAccess | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorPublication {
    const behavior = entry.occurrence.expression;
    const expressionSource = sourceAddressForRuntimeExpressionSpan(
      this.store,
      local,
      entry.binding.sourceAddressHandle,
      behavior.name.span,
    );
    const lifecycle = this.lifecyclePublication(`${local}:lifecycle`, entry);
    const applications = [
      RuntimeBindingBehaviorApplicationPhase.Bind,
      RuntimeBindingBehaviorApplicationPhase.Unbind,
    ].map((phase) => this.applicationProduct(
      `${local}:phase:${phase}`,
      plan,
      entry,
      targetAccess,
      phase,
      phase === RuntimeBindingBehaviorApplicationPhase.Bind ? lifecycle.bind : lifecycle.unbind,
      expressionSource.handle,
    ));
    const bindApplication = applications[0]!;
    const issueProduct = entry.issue == null
      ? null
      : this.issueProduct(
          `${local}:issue:${entry.issue.issueKind}`,
          bindApplication,
          entry.binding,
          targetAccess,
          entry.issue,
          expressionSource.handle,
          source,
        );
    return new RuntimeBindingBehaviorPublication(
      applications,
      issueProduct == null ? [] : [issueProduct],
      [
        ...expressionSource.records,
        ...lifecycle.records,
        ...applications.flatMap((application) =>
          recordsForApplication(application, entry.binding.identityHandle, source.provenanceHandle)
        ),
        ...(issueProduct == null
          ? []
          : recordsForIssue(issueProduct, bindApplication.identityHandle, source.provenanceHandle)),
      ],
    );
  }

  private applicationProduct(
    local: string,
    plan: RuntimeExpressionResourcePlan,
    entry: RuntimeBindingBehaviorPlanEntry,
    targetAccess: RuntimeBindingTargetAccess | null,
    phase: RuntimeBindingBehaviorApplicationPhase,
    lifecycleEffects: RuntimeExpressionResourceLifecycleEffects,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeBindingBehaviorApplication {
    const behavior = entry.occurrence.expression;
    const phaseReachability = bindingBehaviorPhaseReachability(plan, entry, phase);
    return new RuntimeBindingBehaviorApplication(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      entry.binding.toReference(),
      entry.resource?.toReference() ?? null,
      targetAccess?.toReference() ?? null,
      phase,
      entry.origin,
      behavior.name.name,
      behavior.args.length,
      behavior.args.flatMap(staticArgumentValueForArg),
      entry.expressionProductHandle,
      entry.occurrence.chainIndex,
      entry.authoredChainDepth,
      entry.runtimeChainDepth,
      entry.bindReachability,
      phaseReachability,
      entry.bindOrder,
      phaseReachability === RuntimeExpressionResourcePhaseReachability.Reached
        ? entry.phaseOrder
        : null,
      phaseReachability === RuntimeExpressionResourcePhaseReachability.Reached && entry.issue == null
        ? lifecycleEffects
        : RuntimeExpressionResourceLifecycleEffects.none,
      behavior.args.map((argument) => argument.span),
      sourceAddressHandle,
    );
  }

  private lifecyclePublication(
    local: string,
    entry: RuntimeBindingBehaviorPlanEntry,
  ): RuntimeBindingBehaviorLifecyclePublication {
    const records: KernelStoreRecord[] = [];
    const addresses = new Map<string, AddressHandle | null>();
    const signalAddressForSpan = (span: SourceSpan): AddressHandle | null => {
      const key = `${span.start}:${span.end}`;
      if (addresses.has(key)) {
        return addresses.get(key) ?? null;
      }
      const source = sourceAddressForRuntimeExpressionSpan(
        this.store,
        `${local}:signal:${addresses.size}`,
        entry.binding.sourceAddressHandle,
        span,
        SourceSpanRole.Value,
      );
      addresses.set(key, source.handle);
      records.push(...source.records);
      return source.handle;
    };
    return new RuntimeBindingBehaviorLifecyclePublication(
      lifecycleEffectsForBindingBehavior(
        entry,
        RuntimeBindingBehaviorApplicationPhase.Bind,
        signalAddressForSpan,
      ),
      lifecycleEffectsForBindingBehavior(
        entry,
        RuntimeBindingBehaviorApplicationPhase.Unbind,
        signalAddressForSpan,
      ),
      records,
    );
  }

  private issueProduct(
    local: string,
    application: RuntimeBindingBehaviorApplication,
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    issue: BuiltInBindingBehaviorBindIssue,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorIssue {
    return new RuntimeBindingBehaviorIssue(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      application.toReference(),
      binding.toReference(),
      targetAccess?.toReference() ?? null,
      RuntimeBindingBehaviorIssuePhase.Bind,
      issue.issueKind,
      issue.message,
      issue.frameworkErrorCode,
      sourceAddressHandle,
    );
  }

  private recordsForSource(local: string): RuntimeBindingBehaviorSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-behavior:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-behavior:${local}`);
    return new RuntimeBindingBehaviorSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime binding-behavior publication from the pre-bind plan and Controller.bind target facts.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function bindingBehaviorPhaseReachability(
  plan: RuntimeExpressionResourcePlan,
  entry: RuntimeBindingBehaviorPlanEntry,
  phase: RuntimeBindingBehaviorApplicationPhase,
): RuntimeExpressionResourcePhaseReachability {
  if (entry.bindReachability !== RuntimeExpressionResourceBindReachability.Reached) {
    return RuntimeExpressionResourcePhaseReachability.BlockedByOuterFailure;
  }
  if (phase === RuntimeBindingBehaviorApplicationPhase.Unbind) {
    return plan.readPostBindPhaseReachability(entry);
  }
  return RuntimeExpressionResourcePhaseReachability.Reached;
}

function lifecycleEffectsForBindingBehavior(
  entry: RuntimeBindingBehaviorPlanEntry,
  phase: RuntimeBindingBehaviorApplicationPhase,
  signalAddressForSpan: (span: SourceSpan) => AddressHandle | null,
): RuntimeExpressionResourceLifecycleEffects {
  const behavior = entry.occurrence.expression;
  const builtIn = entry.builtInResource;
  if (builtIn == null) {
    const effectKinds = phase === RuntimeBindingBehaviorApplicationPhase.Bind
      && entry.bindEffects.directTargetSubscriberCalls > 0
      ? [RuntimeExpressionResourceLifecycleEffectKind.TargetSubscriber]
      : [];
    return new RuntimeExpressionResourceLifecycleEffects(
      effectKinds,
      RuntimeExpressionResourceValueState.Absent,
      [],
      null,
      null,
      null,
      `Binding behavior '${behavior.name.name}' is app-owned; lifecycle effects beyond statically proven direct calls remain runtime-dependent.`,
    );
  }

  if (bindingModeForBindingBehaviorName(builtIn.name) != null) {
    return closedLifecycleEffects([RuntimeExpressionResourceLifecycleEffectKind.BindingMode]);
  }

  switch (builtIn.name) {
    case BuiltInBindingBehaviorName.Attr:
    case BuiltInBindingBehaviorName.UpdateTrigger:
      return phase === RuntimeBindingBehaviorApplicationPhase.Bind
        ? closedLifecycleEffects([RuntimeExpressionResourceLifecycleEffectKind.TargetObserver])
        : RuntimeExpressionResourceLifecycleEffects.none;
    case BuiltInBindingBehaviorName.Self:
      return closedLifecycleEffects([RuntimeExpressionResourceLifecycleEffectKind.ListenerSelfFilter]);
    case BuiltInBindingBehaviorName.Signal:
      return lifecycleEffectsForSignals(behavior.args, signalAddressForSpan, null);
    case BuiltInBindingBehaviorName.Debounce:
    case BuiltInBindingBehaviorName.Throttle:
      return lifecycleEffectsForRateLimit(behavior.args, signalAddressForSpan);
    case BuiltInBindingBehaviorName.Validate:
      return closedLifecycleEffects([
        RuntimeExpressionResourceLifecycleEffectKind.ValidationConnection,
        RuntimeExpressionResourceLifecycleEffectKind.TargetSubscriber,
      ]);
    case BuiltInBindingBehaviorName.State:
      return closedLifecycleEffects([RuntimeExpressionResourceLifecycleEffectKind.StateScopeConnection]);
    case BuiltInBindingBehaviorName.Translation:
    case BuiltInBindingBehaviorName.DateFormat:
    case BuiltInBindingBehaviorName.NumberFormat:
    case BuiltInBindingBehaviorName.RelativeTime:
      return phase === RuntimeBindingBehaviorApplicationPhase.Bind
        ? closedLifecycleEffects([RuntimeExpressionResourceLifecycleEffectKind.ExpressionProjection])
        : RuntimeExpressionResourceLifecycleEffects.none;
    case BuiltInBindingBehaviorName.OneTime:
    case BuiltInBindingBehaviorName.ToView:
    case BuiltInBindingBehaviorName.FromView:
    case BuiltInBindingBehaviorName.TwoWay:
      return RuntimeExpressionResourceLifecycleEffects.none;
  }
}

function lifecycleEffectsForRateLimit(
  args: readonly IsAssign[],
  signalAddressForSpan: (span: SourceSpan) => AddressHandle | null,
): RuntimeExpressionResourceLifecycleEffects {
  const delay = staticRateLimitDelay(args[0] ?? null);
  const signals = staticSignalValue(args[1] ?? null);
  const effectKinds = [RuntimeExpressionResourceLifecycleEffectKind.RateLimit];
  if (signals.state !== RuntimeExpressionResourceValueState.Absent) {
    effectKinds.push(RuntimeExpressionResourceLifecycleEffectKind.SignalSubscription);
  }
  return new RuntimeExpressionResourceLifecycleEffects(
    effectKinds,
    signals.state,
    signals.values.map((signal) =>
      new RuntimeExpressionResourceSignal(signal.name, signalAddressForSpan(signal.span))
    ),
    delay.value,
    delay.state,
    null,
    [delay.openReason, signals.openReason].filter((reason): reason is string => reason != null).join(' ') || null,
  );
}

function lifecycleEffectsForSignals(
  args: readonly IsAssign[],
  signalAddressForSpan: (span: SourceSpan) => AddressHandle | null,
  openReason: string | null,
): RuntimeExpressionResourceLifecycleEffects {
  const signals: StaticSignal[] = [];
  let state = RuntimeExpressionResourceValueState.Closed;
  for (const arg of args) {
    const value = staticStringExpression(arg);
    if (value == null) {
      state = RuntimeExpressionResourceValueState.Open;
    } else {
      signals.push({ name: value, span: arg.span });
    }
  }
  return new RuntimeExpressionResourceLifecycleEffects(
    [RuntimeExpressionResourceLifecycleEffectKind.SignalSubscription],
    state,
    signals.map((signal) =>
      new RuntimeExpressionResourceSignal(signal.name, signalAddressForSpan(signal.span))
    ),
    null,
    null,
    null,
    state === RuntimeExpressionResourceValueState.Open
      ? openReason ?? 'One or more signal names depend on runtime expression values.'
      : openReason,
  );
}

function closedLifecycleEffects(
  effectKinds: readonly RuntimeExpressionResourceLifecycleEffectKind[],
): RuntimeExpressionResourceLifecycleEffects {
  return new RuntimeExpressionResourceLifecycleEffects(
    effectKinds,
    RuntimeExpressionResourceValueState.Absent,
    [],
    null,
    null,
    null,
    null,
  );
}

interface StaticSignalValue {
  readonly state: RuntimeExpressionResourceValueState;
  readonly values: readonly StaticSignal[];
  readonly openReason: string | null;
}

interface StaticSignal {
  readonly name: string;
  readonly span: SourceSpan;
}

function staticSignalValue(expression: IsAssign | null): StaticSignalValue {
  if (expression == null || (expression instanceof PrimitiveLiteralExpression && expression.value == null)) {
    return {
      state: RuntimeExpressionResourceValueState.Absent,
      values: [],
      openReason: null,
    };
  }
  const single = staticStringExpression(expression);
  if (single != null) {
    return {
      state: RuntimeExpressionResourceValueState.Closed,
      values: [{ name: single, span: expression.span }],
      openReason: null,
    };
  }
  if (expression instanceof ArrayLiteralExpression) {
    const values = expression.elements.flatMap((element): readonly StaticSignal[] => {
      const value = staticStringExpression(element);
      return value == null ? [] : [{ name: value, span: element.span }];
    });
    return values.length === expression.elements.length
      ? {
          state: values.length === 0
            ? RuntimeExpressionResourceValueState.Absent
            : RuntimeExpressionResourceValueState.Closed,
          values,
          openReason: null,
        }
      : {
          state: RuntimeExpressionResourceValueState.Open,
          values,
          openReason: 'The rate-limit signal list contains runtime-dependent values.',
        };
  }
  return {
    state: RuntimeExpressionResourceValueState.Open,
    values: [],
    openReason: 'The rate-limit signal list depends on a runtime expression value.',
  };
}

interface StaticRateLimitDelay {
  readonly state: RuntimeExpressionResourceValueState;
  readonly value: number | null;
  readonly openReason: string | null;
}

function staticRateLimitDelay(expression: IsAssign | null): StaticRateLimitDelay {
  if (expression == null || (expression instanceof PrimitiveLiteralExpression && expression.value == null)) {
    return {
      state: RuntimeExpressionResourceValueState.Closed,
      value: 200,
      openReason: null,
    };
  }
  if (expression instanceof PrimitiveLiteralExpression && typeof expression.value === 'number') {
    return {
      state: RuntimeExpressionResourceValueState.Closed,
      value: expression.value,
      openReason: null,
    };
  }
  return {
    state: RuntimeExpressionResourceValueState.Open,
    value: null,
    openReason: 'The rate-limit delay depends on a runtime expression value.',
  };
}

function staticStringExpression(expression: IsAssign): string | null {
  if (expression instanceof PrimitiveLiteralExpression && typeof expression.value === 'string') {
    return expression.value;
  }
  return expression instanceof TemplateExpression
    && expression.expressions.length === 0
    && expression.cooked.length === 1
    ? expression.cooked[0] ?? ''
    : null;
}

function recordsForApplication(
  application: RuntimeBindingBehaviorApplication,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      application.identityHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      ownerIdentityHandle,
      application.sourceAddressHandle,
      application.behaviorName,
    ),
    new MaterializedProduct(
      application.productHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      application.identityHandle,
      application.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function recordsForIssue(
  issue: RuntimeBindingBehaviorIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function firstTargetAccess(
  controllerBind: RuntimeControllerBindEmission,
  binding: RuntimeBinding,
): RuntimeBindingTargetAccess | null {
  return controllerBind.readTargetAccessesForBinding(binding.productHandle)[0] ?? null;
}

function staticArgumentValueForArg(arg: IsAssign): readonly string[] {
  if (arg.$kind === 'PrimitiveLiteral') {
    return [String(arg.value)];
  }
  if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
    const cooked = arg.cooked[0];
    return cooked == null ? [] : [cooked];
  }
  return [];
}
