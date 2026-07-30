import ts from 'typescript';
import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  AppTaskSlot,
  appTaskSlotHasRun,
} from '../configuration/app-task.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  checkerTypeExtendsCollection,
} from '../type-system/checker-collection-types.js';
import {
  CheckerTypeReference,
  CheckerTypeMemberKind,
  type CheckerTypeShape,
  type CheckerTypeCarrier,
} from '../type-system/type-shape.js';
import {
  CheckerRuntimeMemberPresence,
  CheckerTypeShapeAccess,
  CheckerTypeShapeMemberValueAccessKind,
  CheckerTypeShapeMemberWriteAccessKind,
  checkerRuntimeAccessorDescriptorPresence,
  type CheckerTypeShapeMemberValueAccess,
  type CheckerTypeShapeMemberWriteAccess,
} from '../type-system/checker-type-shape-access.js';
import {
  CheckerDomNodeTypeSource,
  checkerLookupLocation,
  resolveCheckerDomNodeType,
} from '../type-system/dom-node-type.js';
import {
  RuntimeBindingTargetAccessAuthority,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetObserverCacheDisposition,
  RuntimeControllerObserverSetupOutcome,
  RuntimeObjectObservationAdapterReference,
  RuntimeNodeObserverConfig,
  RuntimeNodeObserverConfigFieldState,
  RuntimeNodeObserverKind,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetTypeSource,
  type RuntimeBindingTarget,
} from '../template/runtime-binding.js';
import {
  HtmlNamespaceKind,
} from '../template/html-ir.js';
import { runtimeNodeName } from '../template/runtime-dom-name.js';
import { isStandardSvgAttribute } from './svg-analyzer-data.generated.js';
import { RuntimeHtmlObservationFrameworkErrorCode } from './framework-error-code.js';
import {
  isNodeNamespaceAttribute,
  nodeNamespaceAttribute,
} from './node-namespace-attributes.js';
import {
  ComputedObserverRuntimeKind,
  type ComputedObserverSource,
  type ComputedObserverSourceProjectResult,
} from './computed-observer-source.js';
import {
  ObservableDescriptorRecognitionState,
  observableDescriptorRecognitionForMember,
} from './observable-decorator-recognition.js';
import {
  ComputedObservationDependencyMode,
} from './computed-observation.js';

export class ObserverLocatorLookupRequest {
  constructor(
    /** Store-local key for checker projections forced by this observer lookup. */
    readonly localKey: string,
    /** Runtime ObserverLocator method selected by the binding. */
    readonly lookup: RuntimeBindingTargetAccessLookup,
    /** Runtime target lane selected by renderer/controller emulation. */
    readonly targetKind: RuntimeBindingTargetKind,
    /** Runtime property key passed to ObserverLocator. */
    readonly targetProperty: string,
    /** Current TypeChecker epoch, when available. */
    readonly typeSystem: TypeSystemProject | null,
    /** Static type of an object/controller target, when the caller already has one. */
    readonly targetType: CheckerTypeReference | null = null,
    /** HTML tag name for native node targets. */
    readonly tagName: string | null = null,
    /** Authored node namespace for native node targets. */
    readonly namespace: HtmlNamespaceKind | null = null,
    /** Source address for provenance and checker projection records. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Runtime option for node observers that would otherwise throw on property observers. */
    readonly allowDirtyCheck: boolean = false,
    /** Whether this lookup needs a projected property type product, or only observer strategy/writability facts. */
    readonly projectPropertyType: boolean = true,
    /** Latest AppTask slot whose observer-service mutations have executed before this lookup. */
    readonly objectAdapterBoundary: AppTaskSlot = AppTaskSlot.Activating,
  ) {}

  withLookup(lookup: RuntimeBindingTargetAccessLookup): ObserverLocatorLookupRequest {
    return new ObserverLocatorLookupRequest(
      this.localKey,
      lookup,
      this.targetKind,
      this.targetProperty,
      this.typeSystem,
      this.targetType,
      this.tagName,
      this.namespace,
      this.sourceAddressHandle,
      this.allowDirtyCheck,
      this.projectPropertyType,
      this.objectAdapterBoundary,
    );
  }
}

export class ObserverLocatorLookupResult {
  static open(
    input: ObserverLocatorLookupRequest,
    reason: string,
  ): ObserverLocatorLookupResult {
    return new ObserverLocatorLookupResult(
      input.lookup,
      input.targetKind,
      input.targetProperty,
      RuntimeBindingTargetAccessStrategy.Unknown,
      null,
      RuntimeBindingTargetObserverCacheDisposition.Open,
      null,
      input.targetType,
      input.targetType == null ? null : RuntimeBindingTargetTypeSource.Reference,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      RuntimeBindingTargetAccessAuthority.Open,
      reason,
      null,
      null,
      null,
      [],
    );
  }

  constructor(
    readonly lookup: RuntimeBindingTargetAccessLookup,
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetProperty: string,
    readonly strategy: RuntimeBindingTargetAccessStrategy,
    readonly fallbackStrategy: RuntimeBindingTargetAccessStrategy | null,
    readonly observerCacheDisposition: RuntimeBindingTargetObserverCacheDisposition,
    readonly nodeObserverConfig: RuntimeNodeObserverConfig | null,
    readonly targetType: CheckerTypeReference | null,
    readonly targetTypeSource: RuntimeBindingTargetTypeSource | null,
    readonly propertyType: CheckerTypeReference | null,
    readonly propertyExists: boolean | null,
    readonly isWritable: boolean | null,
    readonly isObservable: boolean | null,
    readonly supportsCallback: boolean | null,
    readonly supportsCoercer: boolean | null,
    readonly observerSourceProductHandle: ProductHandle | null,
    readonly observerSourceIdentityHandle: IdentityHandle | null,
    readonly observerSourceAddressHandle: AddressHandle | null,
    readonly objectObservationAdapters: readonly RuntimeObjectObservationAdapterReference[],
    readonly authority: RuntimeBindingTargetAccessAuthority,
    readonly openReason: string | null = null,
    readonly frameworkErrorCode: RuntimeHtmlObservationFrameworkErrorCode | null = null,
    readonly diagnosticReason: string | null = null,
    readonly controllerObserverSetupOutcome: RuntimeControllerObserverSetupOutcome | null = null,
    readonly selectionProvenanceHandles: readonly ProvenanceHandle[] = [],
  ) {}

  /** Apply a renderer- or binding-behavior-supplied target observer over ordinary ObserverLocator selection. */
  withTargetObserver(
    strategy: RuntimeBindingTargetAccessStrategy | null,
    eventNames: readonly string[] | null,
    authority: RuntimeBindingTargetAccessAuthority,
  ): ObserverLocatorLookupResult {
    const selectedStrategy = strategy ?? this.strategy;
    const nodeObserverConfig = strategy != null
      ? null
      : eventNames == null
        ? this.nodeObserverConfig?.withEventNames(
          [],
          RuntimeNodeObserverConfigFieldState.Open,
          'Binding behavior target-observer event names depend on runtime expression values.',
        ) ?? null
        : this.nodeObserverConfig?.withEventNames(
          eventNames,
          RuntimeNodeObserverConfigFieldState.Closed,
          null,
        ) ?? null;
    return new ObserverLocatorLookupResult(
      this.lookup,
      this.targetKind,
      this.targetProperty,
      selectedStrategy,
      null,
      RuntimeBindingTargetObserverCacheDisposition.NotApplicable,
      nodeObserverConfig,
      this.targetType,
      this.targetTypeSource,
      this.propertyType,
      this.propertyExists,
      this.isWritable,
      isSubscribableStrategy(selectedStrategy),
      observerStrategySupportsCallback(selectedStrategy),
      observerStrategySupportsCoercer(selectedStrategy),
      null,
      null,
      null,
      [],
      authority,
      this.openReason,
      null,
      null,
      null,
      this.selectionProvenanceHandles,
    );
  }

  /** Reuse the observer installed during controller hydration, including for a later getAccessor request. */
  forControllerSetupAccess(
    lookup: RuntimeBindingTargetAccessLookup,
    outcome: RuntimeControllerObserverSetupOutcome,
    setupProvenanceHandles: readonly ProvenanceHandle[] = [],
  ): ObserverLocatorLookupResult {
    return new ObserverLocatorLookupResult(
      lookup,
      this.targetKind,
      this.targetProperty,
      this.strategy,
      this.fallbackStrategy,
      this.observerCacheDisposition,
      this.nodeObserverConfig,
      this.targetType,
      this.targetTypeSource,
      this.propertyType,
      this.propertyExists,
      this.isWritable,
      this.isObservable,
      this.supportsCallback,
      this.supportsCoercer,
      this.observerSourceProductHandle,
      this.observerSourceIdentityHandle,
      this.observerSourceAddressHandle,
      this.objectObservationAdapters,
      outcome === RuntimeControllerObserverSetupOutcome.Open
        ? RuntimeBindingTargetAccessAuthority.Open
        : this.authority,
      outcome === RuntimeControllerObserverSetupOutcome.Open
        ? this.openReason ?? `Controller observer setup for '${this.targetProperty}' remained open.`
        : this.openReason,
      this.frameworkErrorCode,
      this.diagnosticReason,
      outcome,
      [...new Set([...this.selectionProvenanceHandles, ...setupProvenanceHandles])],
    );
  }
}

type TypeResolution = {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly shape: CheckerTypeShape;
  readonly reference: CheckerTypeReference | null;
  readonly location: ts.Node;
  readonly source: RuntimeBindingTargetTypeSource;
};

type PropertyResolution = {
  readonly valueAccess: CheckerTypeShapeMemberValueAccess;
  readonly writeAccess: CheckerTypeShapeMemberWriteAccess;
  readonly exists: boolean | null;
  readonly hasAccessorDescriptor: boolean | null;
  readonly isWritable: boolean | null;
};

interface ObjectAccessSelection {
  readonly strategy: RuntimeBindingTargetAccessStrategy;
  readonly fallbackStrategy: RuntimeBindingTargetAccessStrategy | null;
  readonly cacheDisposition: RuntimeBindingTargetObserverCacheDisposition;
  readonly isObservable: boolean | null;
  readonly supportsCallback: boolean | null;
  readonly supportsCoercer: boolean | null;
  readonly observerSource: ComputedObserverSource | null;
  readonly objectAdapters: readonly ObjectObservationAdapterRegistration[];
  readonly openReason: string | null;
  readonly provenanceHandles: readonly ProvenanceHandle[];
}

type ComputedObserverExplicitDependency =
  | string
  | symbol
  | ((obj: unknown, observer?: unknown) => unknown);

export class NodeObserverLocatorNodeConfig {
  constructor(
    /** Runtime nodeName lane consumed by NodeObserverLocator.useConfig. */
    readonly tagName: string,
    /** Target property key configured on the node. */
    readonly propertyName: string,
    /** Runtime observer config selected for the node/property pair. */
    readonly config: RuntimeNodeObserverConfig,
  ) {}
}

export class NodeObserverLocatorGlobalConfig {
  constructor(
    /** Target property key configured globally. */
    readonly propertyName: string,
    /** Runtime observer config selected for every node with this property. */
    readonly config: RuntimeNodeObserverConfig,
  ) {}
}

export class NodeObserverLocatorAccessorOverride {
  constructor(
    /** Runtime nodeName lane consumed by NodeObserverLocator.overrideAccessor. */
    readonly tagName: string,
    /** Target property key that must be observed through NodeObserverLocator rather than a direct accessor. */
    readonly propertyName: string,
  ) {}
}

/**
 * Static service state produced by app-authored NodeObserverLocator customizations.
 *
 * Aurelia mutates a singleton service during AppTask execution. Semantic-runtime carries the same state explicitly so
 * runtime binding analysis can construct a per-world ObserverLocator without global mutable leakage.
 */
export class NodeObserverLocatorConfiguration {
  static readonly empty = new NodeObserverLocatorConfiguration([], [], [], [], null);

  constructor(
    readonly nodeConfigs: readonly NodeObserverLocatorNodeConfig[],
    readonly globalConfigs: readonly NodeObserverLocatorGlobalConfig[],
    readonly accessorOverrides: readonly NodeObserverLocatorAccessorOverride[],
    readonly globalAccessorOverrides: readonly string[],
    readonly allowDirtyCheck: boolean | null,
  ) {}

  get isEmpty(): boolean {
    return this.nodeConfigs.length === 0
      && this.globalConfigs.length === 0
      && this.accessorOverrides.length === 0
      && this.globalAccessorOverrides.length === 0
      && this.allowDirtyCheck == null;
  }

  applyTo(locator: NodeObserverLocator): void {
    for (const entry of this.nodeConfigs) {
      locator.useConfig(entry.tagName, entry.propertyName, entry.config);
    }
    for (const entry of this.globalConfigs) {
      locator.useConfigGlobal(entry.propertyName, entry.config);
    }
    for (const entry of this.accessorOverrides) {
      locator.overrideAccessor(entry.tagName, entry.propertyName);
    }
    locator.overrideAccessorGlobal(...this.globalAccessorOverrides);
    if (this.allowDirtyCheck != null) {
      locator.allowDirtyCheck = this.allowDirtyCheck;
    }
  }
}

/** App-authored IObjectObservationAdapter registration retained without executing the adapter. */
export class ObjectObservationAdapterRegistration extends RuntimeObjectObservationAdapterReference {}

/** Complete app-scoped ObserverLocator configuration visible to one compiler/runtime world. */
export class ObserverLocatorConfiguration {
  static readonly empty = new ObserverLocatorConfiguration(
    NodeObserverLocatorConfiguration.empty,
    [],
  );

  constructor(
    readonly node: NodeObserverLocatorConfiguration,
    readonly objectAdapters: readonly ObjectObservationAdapterRegistration[],
  ) {}
}

/**
 * Semantic-runtime model of Aurelia's runtime PropertyAccessor.
 *
 * Aurelia's object getAccessor path falls back to this accessor for ordinary object keys; TypeChecker facts are
 * evidence for tooling policy, not the rule that admits or rejects the framework accessor.
 */
@auLink('runtime:PropertyAccessor')
export class PropertyAccessor {
  readonly type = RuntimeBindingTargetAccessStrategy.PropertyAccessor;
  private value: unknown = undefined;

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    this.value = value;
  }
}

/**
 * Semantic-runtime model of Aurelia's DataAttributeAccessor.
 *
 * The accessor identity is separate from RuntimeBindingTargetAccess records: the accessor owns the framework operation
 * shape, while target-access records own per-binding provenance and TypeChecker facts.
 */
@auLink('runtime-html:DataAttributeAccessor')
export class DataAttributeAccessor {
  readonly type = RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  private value: string | null = null;

  getValue(): string | null {
    return this.value;
  }

  setValue(newValue: string | null): void {
    this.value = newValue;
  }

  subscribe(): void {}

  unsubscribe(): void {}
}

/**
 * Semantic-runtime model of Aurelia's AttributeNSAccessor.
 *
 * Runtime-html selects this accessor for a small XML namespace table before falling back to the generic SVG/data
 * attribute accessor. The semantic model keeps the namespace URI visible so future projections can explain why an
 * authored `xlink:*`, `xml:*`, or `xmlns*` target did not follow the ordinary attribute path.
 */
@auLink('runtime-html:AttributeNSAccessor')
export class AttributeNSAccessor {
  readonly type = RuntimeBindingTargetAccessStrategy.AttributeNSAccessor;
  private value: string | null = null;

  constructor(
    readonly namespace: string,
  ) {}

  getValue(): string | null {
    return this.value;
  }

  setValue(newValue: string | null): void {
    this.value = newValue;
  }

  subscribe(): void {}

  unsubscribe(): void {}
}

/**
 * Semantic-runtime model of Aurelia's SetterObserver.
 *
 * Runtime creates a setter observer for ordinary data properties and for missing object keys. The static emulator keeps
 * the property-exists fact beside the selected observer so a later policy layer can decide how strict to be.
 */
@auLink('runtime:SetterObserver')
export class SetterObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.SetterObserver;
  readonly doNotCache = true;
  readonly subs: readonly unknown[] = [];
  private value: unknown = undefined;
  private callback: ((newValue: unknown, oldValue: unknown) => void) | null = null;

  constructor() {}

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    const oldValue = this.value;
    this.value = value;
    this.callback?.(value, oldValue);
  }

  start(): void {}

  stop(): void {}

  subscribe(): void {}

  unsubscribe(): void {}

  useCallback(callback: (newValue: unknown, oldValue: unknown) => void): void {
    this.callback = callback;
  }

  useCoercer(): void {}

  useFlush(): void {}
}

/**
 * Semantic-runtime model of Aurelia's ComputedObserver branch.
 *
 * The framework reaches this when object observer creation sees a configurable accessor descriptor or receives a
 * function key directly. The static variant uses TypeScript accessor declarations as the descriptor signal; `readonly`
 * data fields are TypeScript write-policy facts, not proof that runtime `ObserverLocator` would choose this branch.
 */
@auLink('runtime:ComputedObserver')
export class ComputedObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.ComputedObserver;
  readonly doNotCache = true;
  readonly obs: readonly unknown[] = [];
  readonly oL: ObserverLocator | null = null;
  readonly subs: readonly unknown[] = [];
  $get: (() => unknown) | null = null;
  $set: ((value: unknown) => void) | null = null;
  private value: unknown = undefined;

  constructor() {}

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    this.value = value;
  }

  compute(): unknown {
    return this.value;
  }

  handleChange(): void {}

  handleCollectionChange(): void {}

  handleDirty(): void {}

  init(): void {}

  observe(): void {}

  observeCollection(): void {}

  observeExpression(): void {}

  run(): void {}

  subscribe(): void {}

  subscribeTo(): void {}

  unsubscribe(): void {}

  useCallback(): void {}

  useCoercer(): void {}

  useFlush(): void {}
}

/**
 * Semantic-runtime model of Aurelia's ControlledComputedObserver branch.
 *
 * The public target-access strategy is still computed-observer shaped, but the framework uses this separate observer
 * when computed metadata provides explicit dependencies. Keep it named so source-observer projection work can
 * distinguish explicit dependency observation from proxy/body collection without routing through decorator metadata
 * alone.
 */
@auLink('runtime:ControlledComputedObserver')
export class ControlledComputedObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.ComputedObserver;
  readonly doNotCache = false;
  readonly observers: readonly unknown[] = [];
  private value: unknown = undefined;
  private callback: ((newValue: unknown, oldValue: unknown) => void) | null = null;

  constructor(
    readonly dependencies: readonly ComputedObserverExplicitDependency[] = [],
    readonly flush: 'sync' | 'async' = 'async',
    readonly deep = false,
  ) {}

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    const oldValue = this.value;
    this.value = value;
    this.callback?.(value, oldValue);
  }

  handleChange(): void {}

  handleCollectionChange(): void {}

  subscribe(): void {}

  unsubscribe(): void {}

  useCallback(callback: (newValue: unknown, oldValue: unknown) => void): void {
    this.callback = callback;
  }

  useCoercer(): void {}

  useFlush(): void {}
}

/** Semantic-runtime model of Aurelia's array `length` observer branch. */
@auLink('runtime:CollectionLengthObserver')
export class CollectionLengthObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.CollectionLengthObserver;

  getValue(): number {
    return 0;
  }

  setValue(_newValue: number): void {}

  subscribe(): void {}

  unsubscribe(): void {}
}

/** Semantic-runtime model of Aurelia's map/set `size` observer branch. */
@auLink('runtime:CollectionSizeObserver')
export class CollectionSizeObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.CollectionSizeObserver;

  getValue(): number {
    return 0;
  }

  setValue(): void {}

  subscribe(): void {}

  unsubscribe(): void {}
}

/** Semantic-runtime model of Aurelia's array index observer branch. */
@auLink('runtime:ArrayIndexObserver')
export class ArrayIndexObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.ArrayIndexObserver;

  getValue(): unknown {
    return undefined;
  }

  setValue(_newValue: unknown): void {}

  subscribe(): void {}

  unsubscribe(): void {}
}

/**
 * Semantic-runtime model of Aurelia's ValueAttributeObserver.
 *
 * This mirrors NodeObserverLocator's built-in value observer config for input, textarea, content, and scroll targets.
 */
@auLink('runtime-html:ValueAttributeObserver')
export class ValueAttributeObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.ValueAttributeObserver;
  private value: unknown = '';
  private oldValue: unknown = '';
  private hasChanges = false;
  private config = frameworkNodeObserverConfig(
    RuntimeNodeObserverKind.ValueAttribute,
    'ValueAttributeObserver',
    RuntimeNodeObserverConfigFieldState.Absent,
    inputEvents,
    false,
    RuntimeNodeObserverConfigFieldState.Absent,
    '',
    RuntimeNodeObserverConfigFieldState.Closed,
  );

  constructor() {}

  useConfig(config: RuntimeNodeObserverConfig): void {
    this.config = config;
  }

  getValue(): unknown {
    return this.value;
  }

  setValue(newValue: string | null): void {
    if (Object.is(newValue, this.value)) {
      return;
    }
    this.oldValue = this.value;
    this.value = newValue ?? this.config.defaultValue;
    this.hasChanges = true;
    if (this.config.readonlyValue !== true) {
      this.flushChanges();
    }
  }

  handleEvent(): void {
    this.oldValue = this.value;
    this.hasChanges = false;
  }

  private flushChanges(): void {
    this.hasChanges = false;
  }
}

/**
 * Semantic-runtime model of Aurelia's CheckedObserver selection branch.
 *
 * The static model owns the observer identity and event surface; value-domain closure is materialized later by the
 * binding value-channel pass because it needs the authored input plus source expression facts.
 */
@auLink('runtime-html:CheckedObserver')
export class CheckedObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.CheckedObserver;
  readonly oL: ObserverLocator | null = null;
  private value: unknown = undefined;
  private oldValue: unknown = undefined;
  private config = frameworkNodeObserverConfig(
    RuntimeNodeObserverKind.Checked,
    'CheckedObserver',
    RuntimeNodeObserverConfigFieldState.Closed,
    checkedEvents,
  );

  constructor() {}

  useConfig(config: RuntimeNodeObserverConfig): void {
    this.config = config;
  }

  getValue(): unknown {
    return this.value;
  }

  setValue(newValue: unknown): void {
    this.oldValue = this.value;
    this.value = newValue;
  }

  handleCollectionChange(): void {}

  handleChange(): void {}

  handleEvent(): void {
    this.oldValue = this.value;
  }
}

/**
 * Semantic-runtime model of Aurelia's SelectValueObserver selection branch.
 *
 * The observer owns the target-access choice. Single/multiple option value semantics stay with value-channel
 * materialization, where the authored option graph and TypeChecker-visible source value can be joined.
 */
@auLink('runtime-html:SelectValueObserver')
export class SelectValueObserver {
  readonly type = RuntimeBindingTargetAccessStrategy.SelectValueObserver;
  private value: unknown = undefined;
  private oldValue: unknown = undefined;
  private hasChanges = false;
  private config = frameworkNodeObserverConfig(
    RuntimeNodeObserverKind.Select,
    'SelectValueObserver',
    RuntimeNodeObserverConfigFieldState.Closed,
    selectEvents,
    false,
    RuntimeNodeObserverConfigFieldState.Absent,
    '',
    RuntimeNodeObserverConfigFieldState.Closed,
  );

  constructor() {}

  useConfig(config: RuntimeNodeObserverConfig): void {
    this.config = config;
  }

  getValue(): unknown {
    return this.value ?? this.config.defaultValue;
  }

  setValue(newValue: unknown): void {
    this.oldValue = this.value;
    this.value = newValue;
    this.hasChanges = !Object.is(newValue, this.oldValue);
    this.flushChanges();
  }

  handleCollectionChange(): void {
    this.syncOptions();
  }

  syncOptions(): void {}

  syncValue(): boolean {
    this.oldValue = this.value;
    return !Object.is(this.value, this.oldValue);
  }

  handleEvent(): void {
    if (this.syncValue()) {
      this.flush();
    }
  }

  private flushChanges(): void {
    if (this.hasChanges) {
      this.hasChanges = false;
      this.syncOptions();
    }
  }

  private flush(): void {}
}

const inputEvents = ['change', 'input'] as const;
const contentEvents = ['change', 'input', 'blur', 'keyup', 'paste'] as const;
const scrollEvents = ['scroll'] as const;
const checkedEvents = ['change'] as const;
const selectEvents = ['change'] as const;

function frameworkNodeObserverConfig(
  observerKind: RuntimeNodeObserverKind,
  observerConstructorName: string,
  typeState: RuntimeNodeObserverConfigFieldState,
  eventNames: readonly string[],
  readonlyValue = false,
  readonlyState = RuntimeNodeObserverConfigFieldState.Absent,
  defaultValue: RuntimeNodeObserverConfig['defaultValue'] = undefined,
  defaultState = RuntimeNodeObserverConfigFieldState.Absent,
): RuntimeNodeObserverConfig {
  return new RuntimeNodeObserverConfig(
    observerKind,
    observerConstructorName,
    eventNames,
    readonlyValue,
    defaultValue,
    {
      type: typeState,
      events: RuntimeNodeObserverConfigFieldState.Closed,
      readonly: readonlyState,
      default: defaultState,
    },
    null,
  );
}

/**
 * Semantic-runtime model of Aurelia's ObserverLocator.
 *
 * The runtime framework shape is the public product noun; the implementation remains TypeChecker-backed because this
 * substrate needs static closure rather than live DOM/JS mutation.
 */
@auLink('runtime-html:NodeObserverLocator')
export class NodeObserverLocator {
  static readonly register = 'runtime-html:INodeObserverLocator';

  /** Aurelia defaults node observers to dirty-checking unknown native properties. */
  allowDirtyCheck = true;

  private readonly events = new Map<string, Map<string, RuntimeNodeObserverConfig>>();
  private readonly globalEvents = new Map<string, RuntimeNodeObserverConfig>();
  private readonly overrides = new Map<string, Set<string>>();
  private readonly globalOverrides = new Set<string>();
  private readonly svg = 'runtime-html:ISVGAnalyzer';

  constructor(
    private readonly observerLocator: ObserverLocator,
    configuration: NodeObserverLocatorConfiguration = NodeObserverLocatorConfiguration.empty,
  ) {
    const inputEventsConfig = frameworkNodeObserverConfig(
      RuntimeNodeObserverKind.ValueAttribute,
      'ValueAttributeObserver',
      RuntimeNodeObserverConfigFieldState.Absent,
      inputEvents,
      false,
      RuntimeNodeObserverConfigFieldState.Absent,
      '',
      RuntimeNodeObserverConfigFieldState.Closed,
    );
    this.useConfig({
      INPUT: {
        value: inputEventsConfig,
        valueAsNumber: frameworkNodeObserverConfig(
          RuntimeNodeObserverKind.ValueAttribute,
          'ValueAttributeObserver',
          RuntimeNodeObserverConfigFieldState.Absent,
          inputEvents,
          false,
          RuntimeNodeObserverConfigFieldState.Absent,
          0,
          RuntimeNodeObserverConfigFieldState.Closed,
        ),
        checked: frameworkNodeObserverConfig(
          RuntimeNodeObserverKind.Checked,
          'CheckedObserver',
          RuntimeNodeObserverConfigFieldState.Closed,
          inputEvents,
        ),
        files: frameworkNodeObserverConfig(
          RuntimeNodeObserverKind.ValueAttribute,
          'ValueAttributeObserver',
          RuntimeNodeObserverConfigFieldState.Absent,
          inputEvents,
          true,
          RuntimeNodeObserverConfigFieldState.Closed,
        ),
      },
      SELECT: {
        value: frameworkNodeObserverConfig(
          RuntimeNodeObserverKind.Select,
          'SelectValueObserver',
          RuntimeNodeObserverConfigFieldState.Closed,
          selectEvents,
          false,
          RuntimeNodeObserverConfigFieldState.Absent,
          '',
          RuntimeNodeObserverConfigFieldState.Closed,
        ),
      },
      TEXTAREA: {
        value: inputEventsConfig,
      },
    });

    const contentEventsConfig = frameworkNodeObserverConfig(
      RuntimeNodeObserverKind.ValueAttribute,
      'ValueAttributeObserver',
      RuntimeNodeObserverConfigFieldState.Absent,
      contentEvents,
      false,
      RuntimeNodeObserverConfigFieldState.Absent,
      '',
      RuntimeNodeObserverConfigFieldState.Closed,
    );
    const scrollEventsConfig = frameworkNodeObserverConfig(
      RuntimeNodeObserverKind.ValueAttribute,
      'ValueAttributeObserver',
      RuntimeNodeObserverConfigFieldState.Absent,
      scrollEvents,
      false,
      RuntimeNodeObserverConfigFieldState.Absent,
      0,
      RuntimeNodeObserverConfigFieldState.Closed,
    );
    this.useConfigGlobal({
      scrollTop: scrollEventsConfig,
      scrollLeft: scrollEventsConfig,
      textContent: contentEventsConfig,
      innerHTML: contentEventsConfig,
    });

    this.overrideAccessorGlobal('css', 'style', 'class');
    this.overrideAccessor({
      INPUT: ['value', 'checked', 'model'],
      SELECT: ['value'],
      TEXTAREA: ['value'],
    });
    configuration.applyTo(this);
  }

  handles(input: ObserverLocatorLookupRequest): boolean {
    return input.targetKind === RuntimeBindingTargetKind.Node;
  }

  useConfig(config: Record<string, Record<string, RuntimeNodeObserverConfig>>): void;
  useConfig(nodeName: string, key: string, events: RuntimeNodeObserverConfig): void;
  useConfig(
    nodeNameOrConfig: string | Record<string, Record<string, RuntimeNodeObserverConfig>>,
    key?: string,
    eventsConfig?: RuntimeNodeObserverConfig,
  ): void {
    if (typeof nodeNameOrConfig === 'string') {
      this.setNodeConfig(nodeNameOrConfig, key ?? '', eventsConfig);
      return;
    }
    for (const [nodeName, config] of Object.entries(nodeNameOrConfig)) {
      for (const [propertyKey, events] of Object.entries(config)) {
        this.setNodeConfig(nodeName, propertyKey, events);
      }
    }
  }

  useConfigGlobal(config: Record<string, RuntimeNodeObserverConfig>): void;
  useConfigGlobal(key: string, events: RuntimeNodeObserverConfig): void;
  useConfigGlobal(
    configOrKey: string | Record<string, RuntimeNodeObserverConfig>,
    eventsConfig?: RuntimeNodeObserverConfig,
  ): void {
    if (typeof configOrKey === 'string') {
      this.globalEvents.set(configOrKey, eventsConfig ?? RuntimeNodeObserverConfig.open('Node observer global config was not provided.'));
      return;
    }
    for (const [key, config] of Object.entries(configOrKey)) {
      this.globalEvents.set(key, config);
    }
  }

  overrideAccessor(overrides: Record<string, readonly string[]>): void;
  overrideAccessor(tagName: string, key: string): void;
  overrideAccessor(
    tagNameOrOverrides: string | Record<string, readonly string[]>,
    key?: string,
  ): void {
    if (typeof tagNameOrOverrides === 'string') {
      this.overrideNodeAccessor(tagNameOrOverrides, key ?? '');
      return;
    }
    for (const [tagName, keys] of Object.entries(tagNameOrOverrides)) {
      for (const propertyKey of keys) {
        this.overrideNodeAccessor(tagName, propertyKey);
      }
    }
  }

  overrideAccessorGlobal(...keys: string[]): void {
    for (const key of keys) {
      this.globalOverrides.add(key);
    }
  }

  getAccessor(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Accessor));
  }

  getObserver(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Observer));
  }

  getNodeObserverConfig(tagName: string, key: string): RuntimeNodeObserverConfig | undefined {
    return this.events.get(tagName)?.get(key)
      ?? this.globalEvents.get(key);
  }

  getNodeObserver(input: ObserverLocatorLookupRequest): RuntimeBindingTargetAccessStrategy | null {
    const tagName = input.tagName == null
      ? null
      : runtimeNodeName(input.tagName, input.namespace ?? HtmlNamespaceKind.Html);
    if (tagName == null) {
      return null;
    }
    const config = this.getNodeObserverConfig(tagName, input.targetProperty);
    return config == null ? null : nodeObserverStrategyForConfig(config);
  }

  private lookup(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    const tagName = input.tagName == null
      ? null
      : runtimeNodeName(input.tagName, input.namespace ?? HtmlNamespaceKind.Html);
    const config = tagName == null ? undefined : this.getNodeObserverConfig(tagName, input.targetProperty);
    const hasAccessorOverride = tagName != null && this.hasAccessorOverride(tagName, input.targetProperty);
    return this.observerLocator.createObserver(input, config, this.allowDirtyCheck, hasAccessorOverride);
  }

  private setNodeConfig(
    nodeName: string,
    key: string,
    config: RuntimeNodeObserverConfig | undefined,
  ): void {
    if (config == null || key === '') {
      return;
    }
    const nodeNameKey = nodeName;
    let nodeConfig = this.events.get(nodeNameKey);
    if (nodeConfig == null) {
      nodeConfig = new Map();
      this.events.set(nodeNameKey, nodeConfig);
    }
    nodeConfig.set(key, config);
  }

  private overrideNodeAccessor(tagName: string, key: string): void {
    if (key === '') {
      return;
    }
    const tagNameKey = tagName;
    let overrides = this.overrides.get(tagNameKey);
    if (overrides == null) {
      overrides = new Set();
      this.overrides.set(tagNameKey, overrides);
    }
    overrides.add(key);
  }

  private hasAccessorOverride(tagName: string, key: string): boolean {
    return this.globalOverrides.has(key) || this.overrides.get(tagName)?.has(key) === true;
  }
}

@auLink('runtime:IObserverLocator')
@auLink('runtime:ObserverLocator')
export class ObserverLocator {
  private readonly projector: CheckerTypeProjector;
  private readonly typeAccess: CheckerTypeShapeAccess;
  private readonly nodeObserverLocator: NodeObserverLocator;

  constructor(
    private readonly store: KernelStore,
    projector: CheckerTypeProjector,
    private readonly configuration: ObserverLocatorConfiguration = ObserverLocatorConfiguration.empty,
    private readonly computedObserverSources: ComputedObserverSourceProjectResult | null = null,
  ) {
    this.projector = projector;
    this.typeAccess = new CheckerTypeShapeAccess(store, projector);
    this.nodeObserverLocator = new NodeObserverLocator(this, configuration.node);
  }

  getAccessor(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Accessor));
  }

  getObserver(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Observer));
  }

  /** Whether updateTrigger can reconfigure the native observer for this exact runtime target/property pair. */
  hasNodeObserverConfig(target: RuntimeBindingTarget, targetProperty: string): boolean {
    if (target.targetKind !== RuntimeBindingTargetKind.Node || target.tagName == null) {
      return false;
    }
    const tagName = runtimeNodeName(target.tagName, target.namespace ?? HtmlNamespaceKind.Html);
    return this.nodeObserverLocator.getNodeObserverConfig(tagName, targetProperty) != null;
  }

  private lookup(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    if (input.lookup === RuntimeBindingTargetAccessLookup.Open) {
      return this.open(input, 'Binding mode did not close to an ObserverLocator accessor or observer lookup.');
    }

    if (input.targetKind === RuntimeBindingTargetKind.Node) {
      if (input.lookup === RuntimeBindingTargetAccessLookup.Accessor) {
        return this.nodeObserverLocator.getAccessor(input);
      }
      return this.nodeObserverLocator.getObserver(input);
    }

    if (input.targetKind === RuntimeBindingTargetKind.ControllerViewModel) {
      return this.lookupObject(input);
    }

    return this.open(input, 'Runtime target kind is not closed enough to resolve ObserverLocator lookup.');
  }

  createObserver(
    input: ObserverLocatorLookupRequest,
    config: RuntimeNodeObserverConfig | undefined,
    nodeAllowDirtyCheck: boolean,
    hasAccessorOverride: boolean,
  ): ObserverLocatorLookupResult {
    const tagName = input.tagName == null
      ? null
      : runtimeNodeName(input.tagName, input.namespace ?? HtmlNamespaceKind.Html);
    if (tagName == null) {
      return this.open(input, 'Native node target did not carry a closed HTML tag name.');
    }

    const namespace = input.namespace ?? HtmlNamespaceKind.Unknown;
    const targetType = this.resolveNodeType(input, tagName, namespace);
    const property = targetType == null ? null : this.resolveProperty(input, targetType);
    const strategy = nodeAccessStrategy(
      tagName,
      namespace,
      input.targetProperty,
      input.lookup,
      input.allowDirtyCheck || nodeAllowDirtyCheck,
      property,
      config,
      hasAccessorOverride,
    );
    const frameworkErrorCode = nodeObserverStrategyNotFound(
      tagName,
      namespace,
      input.targetProperty,
      input.lookup,
      input.allowDirtyCheck || nodeAllowDirtyCheck,
      property,
      config,
      hasAccessorOverride,
    )
      ? RuntimeHtmlObservationFrameworkErrorCode.NodeObserverStrategyNotFound
      : null;
    const openReason = frameworkErrorCode == null
      ? targetAccessOpenReason(tagName, input.targetProperty, strategy, config)
      : null;
    const diagnosticReason = targetAccessDiagnosticReason(tagName, input.targetProperty, frameworkErrorCode);

    return new ObserverLocatorLookupResult(
      input.lookup,
      input.targetKind,
      input.targetProperty,
      strategy,
      null,
      observerCacheDisposition(input.lookup, strategy),
      config ?? null,
      targetType?.reference ?? null,
      targetType?.source ?? null,
      property?.valueAccess.valueReference ?? null,
      property?.exists ?? null,
      property?.isWritable ?? null,
      isSubscribableStrategy(strategy),
      observerStrategySupportsCallback(strategy),
      observerStrategySupportsCoercer(strategy),
      null,
      null,
      null,
      [],
      authorityFor(strategy, targetType, true, frameworkErrorCode),
      openReason,
      frameworkErrorCode,
      diagnosticReason,
      null,
      [],
    );
  }

  private lookupObject(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    const targetType = this.resolveReferenceType(input, input.targetType);
    const property = targetType == null ? null : this.resolveProperty(input, targetType);
    const selection = this.objectAccessSelection(input, targetType, property);

    return new ObserverLocatorLookupResult(
      input.lookup,
      input.targetKind,
      input.targetProperty,
      selection.strategy,
      selection.fallbackStrategy,
      selection.cacheDisposition,
      null,
      input.targetType ?? targetType?.reference ?? null,
      input.targetType != null || targetType != null ? RuntimeBindingTargetTypeSource.Reference : null,
      property?.valueAccess.valueReference ?? null,
      property?.exists ?? null,
      property?.isWritable ?? null,
      selection.isObservable,
      selection.supportsCallback,
      selection.supportsCoercer,
      selection.observerSource?.productHandle ?? null,
      selection.observerSource?.identityHandle ?? null,
      selection.observerSource?.sourceAddressHandle ?? null,
      selection.objectAdapters,
      authorityFor(
        selection.strategy,
        targetType,
        input.lookup === RuntimeBindingTargetAccessLookup.Accessor
          && selection.strategy === RuntimeBindingTargetAccessStrategy.PropertyAccessor,
        null,
      ),
      selection.openReason,
      null,
      null,
      null,
      selection.provenanceHandles,
    );
  }

  private objectAccessSelection(
    input: ObserverLocatorLookupRequest,
    targetType: TypeResolution | null,
    property: PropertyResolution | null,
  ): ObjectAccessSelection {
    if (input.lookup === RuntimeBindingTargetAccessLookup.Accessor) {
      return closedObjectAccessSelection(
        RuntimeBindingTargetAccessStrategy.PropertyAccessor,
        RuntimeBindingTargetObserverCacheDisposition.NotApplicable,
      );
    }
    const collectionStrategy = collectionAccessStrategy(targetType, input.targetProperty);
    if (collectionStrategy != null) {
      return closedObjectAccessSelection(
        collectionStrategy,
        observerCacheDisposition(input.lookup, collectionStrategy),
      );
    }
    const observableDescriptor = observableDescriptorRecognitionForMember(
      targetType?.shape.carrier?.declarations ?? [],
      property?.valueAccess.declarations ?? [],
      input.targetProperty,
    );
    const objectAdapters = this.configuration.objectAdapters.filter((adapter) =>
      appTaskSlotHasRun(adapter.appTaskSlot, input.objectAdapterBoundary)
    );
    if (observableDescriptor === ObservableDescriptorRecognitionState.Exact
      || property?.hasAccessorDescriptor === true) {
      const fallback = observableDescriptor === ObservableDescriptorRecognitionState.Exact
        ? closedObjectAccessSelection(
            RuntimeBindingTargetAccessStrategy.ObservableSetterNotifier,
            RuntimeBindingTargetObserverCacheDisposition.Cached,
            null,
            false,
            false,
          )
        : this.objectAccessorFallbackSelection(input, property!);
      if (objectAdapters.length > 0) {
        return openObjectAccessSelection(
          fallback,
          objectAdapters,
          `Ordered object-observation adapters may override the '${fallback.strategy}' fallback for '${input.targetProperty}'.`,
        );
      }
      return fallback;
    }
    if (observableDescriptor === ObservableDescriptorRecognitionState.Open) {
      const fallback = property?.hasAccessorDescriptor === false
        ? closedObjectAccessSelection(
            RuntimeBindingTargetAccessStrategy.SetterObserver,
            RuntimeBindingTargetObserverCacheDisposition.Cached,
          )
        : property == null
          ? closedObjectAccessSelection(
              RuntimeBindingTargetAccessStrategy.SetterObserver,
              RuntimeBindingTargetObserverCacheDisposition.Cached,
            )
          : this.objectAccessorFallbackSelection(input, property);
      return openObjectAccessSelection(
        fallback,
        objectAdapters,
        `Dynamic @observable class configuration may install a getter-owned observer for '${input.targetProperty}'.`,
      );
    }
    return closedObjectAccessSelection(
      RuntimeBindingTargetAccessStrategy.SetterObserver,
      RuntimeBindingTargetObserverCacheDisposition.Cached,
    );
  }

  private objectAccessorFallbackSelection(
    input: ObserverLocatorLookupRequest,
    property: PropertyResolution,
  ): ObjectAccessSelection {
    const declarationIdentityHandle = property.valueAccess.member?.declarationIdentityHandle ?? null;
    const observerSource = declarationIdentityHandle == null
      ? null
      : this.computedObserverSources?.readComputedObserverForMember(declarationIdentityHandle) ?? null;
    const strategy = observerSource?.observerKind === ComputedObserverRuntimeKind.ControlledComputedObserver
      ? RuntimeBindingTargetAccessStrategy.ControlledComputedObserver
      : RuntimeBindingTargetAccessStrategy.ComputedObserver;
    if (observerSource?.dependencyMode === ComputedObservationDependencyMode.DependencyFunction
      || observerSource?.dependencyMode === ComputedObservationDependencyMode.Open) {
      return {
        strategy: RuntimeBindingTargetAccessStrategy.Unknown,
        fallbackStrategy: strategy,
        cacheDisposition: RuntimeBindingTargetObserverCacheDisposition.Open,
        isObservable: null,
        supportsCallback: null,
        supportsCoercer: null,
        observerSource,
        objectAdapters: [],
        openReason: observerSource.dependencyMode === ComputedObservationDependencyMode.DependencyFunction
          ? `Computed dependency functions for '${input.targetProperty}' are source-proved, but the current framework runtime contract does not close their observer construction.`
          : `Computed dependencies for '${input.targetProperty}' are not statically closed enough to select an observer.`,
        provenanceHandles: observerSource.provenanceHandle == null
          ? []
          : [observerSource.provenanceHandle],
      };
    }
    return closedObjectAccessSelection(
      strategy,
      RuntimeBindingTargetObserverCacheDisposition.Cached,
      observerSource,
    );
  }

  private resolveReferenceType(
    input: ObserverLocatorLookupRequest,
    reference: CheckerTypeReference | null,
  ): TypeResolution | null {
    if (input.typeSystem == null || reference?.productHandle == null) {
      return null;
    }
    const shape = this.projector.publication.readProductDetail(
      TypeSystemProductDetails.TypeShape,
      reference.productHandle,
    );
    if (shape == null || shape.carrier == null) {
      return null;
    }
    const carrier = shape.carrier;
    const location = firstDeclaration(carrier) ?? checkerLookupLocation(input.typeSystem);
    if (location == null) {
      return null;
    }
    const targetReference = shape.toReference();
    return {
      checker: carrier.checker,
      type: carrier.type,
      shape,
      reference: targetReference,
      location,
      source: RuntimeBindingTargetTypeSource.Reference,
    };
  }

  private resolveNodeType(
    input: ObserverLocatorLookupRequest,
    tagName: string,
    namespace: HtmlNamespaceKind,
  ): TypeResolution | null {
    const resolution = input.typeSystem == null
      ? null
      : resolveCheckerDomNodeType(
        input.typeSystem,
        tagName,
        namespace,
        this.projector,
        `${input.localKey}:observer-locator:target-type`,
        input.sourceAddressHandle,
      );
    if (resolution == null) {
      return null;
    }
    const shape = resolution.reference.productHandle == null
      ? null
      : this.projector.publication.readProductDetail(
        TypeSystemProductDetails.TypeShape,
        resolution.reference.productHandle,
      );
    if (shape == null) {
      return null;
    }
    return {
      checker: resolution.checker,
      type: resolution.type,
      shape,
      reference: resolution.reference,
      location: resolution.location,
      source: resolution.source === CheckerDomNodeTypeSource.TagNameMap
        ? RuntimeBindingTargetTypeSource.DomTagNameMap
        : RuntimeBindingTargetTypeSource.DomGlobalFallback,
    };
  }

  private resolveProperty(
    input: ObserverLocatorLookupRequest,
    target: TypeResolution,
  ): PropertyResolution {
    const valueAccess = this.typeAccess.memberValueAccess(
      target.shape,
      input.targetProperty,
      `${input.localKey}:observer-locator:property:${localKeyPart(input.targetProperty)}`,
    );
    const writeAccess = this.typeAccess.memberWriteAccess(target.shape, input.targetProperty);
    const exists = valueAccess.accessKind === CheckerTypeShapeMemberValueAccessKind.Missing
      ? false
      : valueAccess.member != null
        || valueAccess.memberKind === CheckerTypeMemberKind.IndexSignature
        ? true
        : null;
    const accessorDescriptor = checkerRuntimeAccessorDescriptorPresence(target.shape, valueAccess);
    return {
      valueAccess,
      writeAccess,
      exists,
      hasAccessorDescriptor: accessorDescriptor === CheckerRuntimeMemberPresence.Present
        ? true
        : accessorDescriptor === CheckerRuntimeMemberPresence.Absent
          ? false
          : null,
      isWritable: checkerWriteAccessIsWritable(writeAccess),
    };
  }

  private open(
    input: ObserverLocatorLookupRequest,
    reason: string,
  ): ObserverLocatorLookupResult {
    return ObserverLocatorLookupResult.open(input, reason);
  }
}

function nodeAccessStrategy(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
  lookup: RuntimeBindingTargetAccessLookup,
  allowDirtyCheck: boolean,
  property: PropertyResolution | null,
  config: RuntimeNodeObserverConfig | undefined,
  hasAccessorOverride: boolean,
): RuntimeBindingTargetAccessStrategy {
  if (lookup === RuntimeBindingTargetAccessLookup.Observer
    || hasAccessorOverride) {
    return nodeObserverStrategy(tagName, namespace, targetProperty, allowDirtyCheck, property, config);
  }
  return nodeAccessorStrategy(tagName, namespace, targetProperty);
}

function nodeObserverStrategy(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
  allowDirtyCheck: boolean,
  property: PropertyResolution | null,
  config: RuntimeNodeObserverConfig | undefined,
): RuntimeBindingTargetAccessStrategy {
  if (targetProperty === 'class') {
    return RuntimeBindingTargetAccessStrategy.ClassAttributeAccessor;
  }
  if (targetProperty === 'style' || targetProperty === 'css') {
    return RuntimeBindingTargetAccessStrategy.StyleAttributeAccessor;
  }
  if (config != null) {
    return nodeObserverStrategyForConfig(config);
  }
  if (isNodeNamespaceAttribute(targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.AttributeNSAccessor;
  }
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  }
  if (targetProperty === 'model') {
    return RuntimeBindingTargetAccessStrategy.SetterObserver;
  }
  if (property?.exists === true && allowDirtyCheck) {
    return RuntimeBindingTargetAccessStrategy.DirtyCheck;
  }
  if (property?.exists === false) {
    return RuntimeBindingTargetAccessStrategy.SetterObserver;
  }
  return RuntimeBindingTargetAccessStrategy.Unknown;
}

function nodeAccessorStrategy(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
): RuntimeBindingTargetAccessStrategy {
  if (isNodeNamespaceAttribute(targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.AttributeNSAccessor;
  }
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  }
  if (isAttributeAccessorProperty(targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  }
  return RuntimeBindingTargetAccessStrategy.ElementPropertyAccessor;
}

function targetAccessOpenReason(
  tagName: string,
  targetProperty: string,
  strategy: RuntimeBindingTargetAccessStrategy,
  config: RuntimeNodeObserverConfig | undefined,
): string | null {
  return strategy === RuntimeBindingTargetAccessStrategy.Unknown
    ? config?.fieldState('type') === RuntimeNodeObserverConfigFieldState.Open
      ? config.openReason ?? `NodeObserverLocator config for '${tagName}.${targetProperty}' did not close its observer constructor.`
      : `NodeObserverLocator could not close '${tagName}.${targetProperty}' through built-in config or TypeChecker surface.`
    : null;
}

function targetAccessDiagnosticReason(
  tagName: string,
  targetProperty: string,
  frameworkErrorCode: RuntimeHtmlObservationFrameworkErrorCode | null,
): string | null {
  return frameworkErrorCode == null
    ? null
    : `Aurelia runtime ${frameworkErrorCode} cannot observe '${tagName}.${targetProperty}' because dirty checking is disabled and no node observer strategy is configured.`;
}

function nodeObserverStrategyNotFound(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
  lookup: RuntimeBindingTargetAccessLookup,
  allowDirtyCheck: boolean,
  property: PropertyResolution | null,
  config: RuntimeNodeObserverConfig | undefined,
  hasAccessorOverride: boolean,
): boolean {
  if (lookup !== RuntimeBindingTargetAccessLookup.Observer && !hasAccessorOverride) {
    return false;
  }
  if (allowDirtyCheck || property?.exists !== true || config != null) {
    return false;
  }
  if (targetProperty === 'class' || targetProperty === 'style' || targetProperty === 'css') {
    return false;
  }
  if (isNodeNamespaceAttribute(targetProperty)) {
    return false;
  }
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return false;
  }
  return true;
}

function collectionAccessStrategy(
  targetType: TypeResolution | null,
  targetProperty: string,
): RuntimeBindingTargetAccessStrategy | null {
  if (targetType == null) {
    return null;
  }
  if (targetProperty === 'length' && checkerTypeExtendsCollection(targetType.checker, targetType.type, ['Array', 'ReadonlyArray'])) {
    return RuntimeBindingTargetAccessStrategy.CollectionLengthObserver;
  }
  if (targetProperty === 'size' && checkerTypeExtendsCollection(targetType.checker, targetType.type, ['Map', 'ReadonlyMap', 'Set', 'ReadonlySet'])) {
    return RuntimeBindingTargetAccessStrategy.CollectionSizeObserver;
  }
  if (isArrayIndexProperty(targetProperty) && checkerTypeExtendsCollection(targetType.checker, targetType.type, ['Array', 'ReadonlyArray'])) {
    return RuntimeBindingTargetAccessStrategy.ArrayIndexObserver;
  }
  return null;
}

function nodeObserverStrategyForConfig(config: RuntimeNodeObserverConfig): RuntimeBindingTargetAccessStrategy {
  switch (config.observerKind) {
    case RuntimeNodeObserverKind.ValueAttribute:
      return RuntimeBindingTargetAccessStrategy.ValueAttributeObserver;
    case RuntimeNodeObserverKind.Checked:
      return RuntimeBindingTargetAccessStrategy.CheckedObserver;
    case RuntimeNodeObserverKind.Select:
      return RuntimeBindingTargetAccessStrategy.SelectValueObserver;
    case RuntimeNodeObserverKind.Custom:
      return RuntimeBindingTargetAccessStrategy.CustomNodeObserver;
    case RuntimeNodeObserverKind.Open:
      return RuntimeBindingTargetAccessStrategy.Unknown;
  }
}

function isAttributeAccessorProperty(targetProperty: string): boolean {
  switch (targetProperty) {
    case 'href':
    case 'maxLength':
    case 'minLength':
    case 'pattern':
    case 'placeholder':
    case 'popovertarget':
    case 'popovertargetaction':
    case 'role':
    case 'size':
    case 'src':
    case 'title':
      return true;
    default:
      return false;
  }
}

function isDataAttributeAccessorProperty(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
): boolean {
  if (nodeNamespaceAttribute(targetProperty) != null) {
    return false;
  }
  return targetProperty.startsWith('data-')
    || targetProperty.startsWith('aria-')
    || (namespace === HtmlNamespaceKind.Svg && isStandardSvgAttribute(tagName, targetProperty));
}

function authorityFor(
  strategy: RuntimeBindingTargetAccessStrategy,
  targetType: TypeResolution | null,
  frameworkConfig: boolean,
  frameworkErrorCode: RuntimeHtmlObservationFrameworkErrorCode | null,
): RuntimeBindingTargetAccessAuthority {
  if (frameworkErrorCode != null) {
    return RuntimeBindingTargetAccessAuthority.FrameworkErrorCode;
  }
  if (strategy === RuntimeBindingTargetAccessStrategy.Unknown) {
    return RuntimeBindingTargetAccessAuthority.Open;
  }
  if (frameworkConfig && targetType != null) {
    return RuntimeBindingTargetAccessAuthority.FrameworkConfigAndTypeChecker;
  }
  if (frameworkConfig) {
    return RuntimeBindingTargetAccessAuthority.FrameworkConfig;
  }
  return targetType == null
    ? RuntimeBindingTargetAccessAuthority.Open
    : RuntimeBindingTargetAccessAuthority.TypeChecker;
}

function isSubscribableStrategy(strategy: RuntimeBindingTargetAccessStrategy): boolean {
  switch (strategy) {
    case RuntimeBindingTargetAccessStrategy.ArrayIndexObserver:
    case RuntimeBindingTargetAccessStrategy.CheckedObserver:
    case RuntimeBindingTargetAccessStrategy.CollectionLengthObserver:
    case RuntimeBindingTargetAccessStrategy.CollectionSizeObserver:
    case RuntimeBindingTargetAccessStrategy.ComputedObserver:
    case RuntimeBindingTargetAccessStrategy.ControlledComputedObserver:
    case RuntimeBindingTargetAccessStrategy.CustomNodeObserver:
    case RuntimeBindingTargetAccessStrategy.DirtyCheck:
    case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
    case RuntimeBindingTargetAccessStrategy.SetterObserver:
    case RuntimeBindingTargetAccessStrategy.ObservableSetterNotifier:
    case RuntimeBindingTargetAccessStrategy.ValueAttributeObserver:
      return true;
    default:
      return false;
  }
}

function observerStrategySupportsCallback(strategy: RuntimeBindingTargetAccessStrategy): boolean {
  return strategy === RuntimeBindingTargetAccessStrategy.SetterObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ComputedObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ControlledComputedObserver;
}

function observerStrategySupportsCoercer(strategy: RuntimeBindingTargetAccessStrategy): boolean {
  return strategy === RuntimeBindingTargetAccessStrategy.SetterObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ComputedObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ControlledComputedObserver;
}

function isArrayIndexProperty(property: string): boolean {
  if (property.trim() !== property || property.length === 0) {
    return false;
  }
  const index = Number(property);
  return Number.isInteger(index) && index >= 0 && String(index) === property;
}

function checkerWriteAccessIsWritable(
  access: CheckerTypeShapeMemberWriteAccess,
): boolean | null {
  switch (access.accessKind) {
    case CheckerTypeShapeMemberWriteAccessKind.Writable:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable:
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexWritable:
      return true;
    case CheckerTypeShapeMemberWriteAccessKind.Readonly:
    case CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter:
    case CheckerTypeShapeMemberWriteAccessKind.MethodLike:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly:
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexReadonly:
      return false;
    case CheckerTypeShapeMemberWriteAccessKind.DeclarationMissing:
    case CheckerTypeShapeMemberWriteAccessKind.Missing:
      return null;
  }
}

function closedObjectAccessSelection(
  strategy: RuntimeBindingTargetAccessStrategy,
  cacheDisposition: RuntimeBindingTargetObserverCacheDisposition,
  observerSource: ComputedObserverSource | null = null,
  supportsCallback: boolean | null = observerStrategySupportsCallback(strategy),
  supportsCoercer: boolean | null = observerStrategySupportsCoercer(strategy),
): ObjectAccessSelection {
  return {
    strategy,
    fallbackStrategy: null,
    cacheDisposition,
    isObservable: isSubscribableStrategy(strategy),
    supportsCallback,
    supportsCoercer,
    observerSource,
    objectAdapters: [],
    openReason: null,
    provenanceHandles: observerSource?.provenanceHandle == null
      ? []
      : [observerSource.provenanceHandle],
  };
}

function openObjectAccessSelection(
  fallback: ObjectAccessSelection,
  objectAdapters: readonly ObjectObservationAdapterRegistration[],
  openReason: string,
): ObjectAccessSelection {
  return {
    strategy: RuntimeBindingTargetAccessStrategy.Unknown,
    fallbackStrategy: fallback.strategy,
    cacheDisposition: RuntimeBindingTargetObserverCacheDisposition.Open,
    isObservable: null,
    supportsCallback: null,
    supportsCoercer: null,
    observerSource: fallback.observerSource,
    objectAdapters,
    openReason,
    provenanceHandles: [
      ...fallback.provenanceHandles,
      ...objectAdapters.flatMap((adapter) =>
        adapter.provenanceHandle == null ? [] : [adapter.provenanceHandle]
      ),
    ],
  };
}

function observerCacheDisposition(
  lookup: RuntimeBindingTargetAccessLookup,
  strategy: RuntimeBindingTargetAccessStrategy,
): RuntimeBindingTargetObserverCacheDisposition {
  if (lookup !== RuntimeBindingTargetAccessLookup.Observer) {
    return RuntimeBindingTargetObserverCacheDisposition.NotApplicable;
  }
  switch (strategy) {
    case RuntimeBindingTargetAccessStrategy.ArrayIndexObserver:
    case RuntimeBindingTargetAccessStrategy.ClassAttributeAccessor:
      return RuntimeBindingTargetObserverCacheDisposition.NotCached;
    case RuntimeBindingTargetAccessStrategy.Unknown:
      return RuntimeBindingTargetObserverCacheDisposition.Open;
    default:
      return RuntimeBindingTargetObserverCacheDisposition.Cached;
  }
}

function firstDeclaration(carrier: CheckerTypeCarrier): ts.Declaration | null {
  return carrier.declarations[0] ?? null;
}
