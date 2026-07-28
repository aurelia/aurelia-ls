import type { AddressHandle } from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';

export const enum RuntimeExpressionResourceBindReachability {
  /** `astBind` reaches this authored wrapper and attempts resource resolution/application. */
  Reached = 'reached',
  /** An outer wrapper failed during `astBind`, so this authored wrapper is structurally present but not visited. */
  BlockedByOuterFailure = 'blocked-by-outer-failure',
}

export const enum RuntimeExpressionResourceApplicationOrigin {
  /** The application comes from an authored binding-behavior or value-converter wrapper. */
  Authored = 'authored',
  /** A reached binding behavior inserted the value-converter wrapper during `astBind(...)`. */
  BindingBehaviorProjection = 'binding-behavior-projection',
}

export const enum RuntimeExpressionResourceLifecycleEffectKind {
  /** A binding-mode behavior replaces or restores the binding mode. */
  BindingMode = 'binding-mode',
  /** A behavior replaces or reconfigures the binding's target observer/accessor. */
  TargetObserver = 'target-observer',
  /** A behavior installs a target subscriber consumed by PropertyBinding. */
  TargetSubscriber = 'target-subscriber',
  /** A behavior or converter adds or removes named ISignaler listeners. */
  SignalSubscription = 'signal-subscription',
  /** A behavior installs or disposes debounce/throttle state. */
  RateLimit = 'rate-limit',
  /** The self behavior enables or resets listener-origin filtering. */
  ListenerSelfFilter = 'listener-self-filter',
  /** The validate behavior starts or stops validation observation and registration. */
  ValidationConnection = 'validation-connection',
  /** The state behavior selects a store-backed source scope and observes store changes. */
  StateScopeConnection = 'state-scope-connection',
  /** A binding behavior rewrites the runtime expression resource chain. */
  ExpressionProjection = 'expression-projection',
}

export const enum RuntimeExpressionResourceValueState {
  /** The lifecycle field is not present and has no runtime effect. */
  Absent = 'absent',
  /** The lifecycle field has an exact statically known value. */
  Closed = 'closed',
  /** The lifecycle field exists or may exist, but its runtime value is not closed. */
  Open = 'open',
}

/** One statically retained signal listener together with its authored declaration site. */
export class RuntimeExpressionResourceSignal {
  constructor(
    readonly name: string,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Phase-local effects owned by one reached expression resource application. */
export class RuntimeExpressionResourceLifecycleEffects {
  static readonly none = new RuntimeExpressionResourceLifecycleEffects(
    [],
    RuntimeExpressionResourceValueState.Absent,
    [],
    null,
    null,
    null,
    null,
    [],
  );

  constructor(
    /** Closed framework effects performed during this phase. */
    readonly effectKinds: readonly RuntimeExpressionResourceLifecycleEffectKind[],
    /** Whether named signal subscriptions are absent, exact, or runtime-dependent. */
    readonly signalState: RuntimeExpressionResourceValueState,
    /** Exact signal subscriptions, or retained known members when signal state is open. */
    readonly signals: readonly RuntimeExpressionResourceSignal[],
    /** Effective debounce/throttle delay after framework defaulting, when applicable. */
    readonly rateLimitDelayMilliseconds: number | null,
    /** Whether the rate-limit delay is exact or runtime-dependent. */
    readonly rateLimitDelayState: RuntimeExpressionResourceValueState | null,
    /** Exact source for resource-owned lifecycle configuration such as the converter `signals` property. */
    readonly configurationSourceAddressHandle: AddressHandle | null,
    /** Why app-owned lifecycle effects or values remain open. */
    readonly openReason: string | null,
    /** Machine-readable lower-level reasons that kept lifecycle effects open. */
    readonly openReasonKinds: readonly OpenSeamReasonKind[],
  ) {}
}
