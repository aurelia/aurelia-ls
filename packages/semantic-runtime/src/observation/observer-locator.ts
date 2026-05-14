import ts from 'typescript';
import { auLink } from '../kernel/au-link.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  checkerCollectionSymbolName,
} from '../type-system/checker-related-types.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  classifyCheckerTypeShape,
  type CheckerTypeCarrier,
} from '../type-system/type-shape.js';
import {
  RuntimeBindingTargetAccessAuthority,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetTypeSource,
} from '../template/runtime-binding.js';
import {
  HtmlNamespaceKind,
  normalizeHtmlTagName,
} from '../template/html-ir.js';
import { isStandardSvgAttribute } from './svg-analyzer-data.generated.js';
import { RuntimeHtmlObservationFrameworkErrorCode } from './framework-error-code.js';

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
      [],
      input.targetType,
      input.targetType == null ? null : RuntimeBindingTargetTypeSource.Reference,
      null,
      null,
      null,
      false,
      RuntimeBindingTargetAccessAuthority.Open,
      reason,
      null,
    );
  }

  constructor(
    readonly lookup: RuntimeBindingTargetAccessLookup,
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetProperty: string,
    readonly strategy: RuntimeBindingTargetAccessStrategy,
    readonly eventNames: readonly string[],
    readonly targetType: CheckerTypeReference | null,
    readonly targetTypeSource: RuntimeBindingTargetTypeSource | null,
    readonly propertyType: CheckerTypeReference | null,
    readonly propertyExists: boolean | null,
    readonly isWritable: boolean | null,
    readonly isObservable: boolean,
    readonly authority: RuntimeBindingTargetAccessAuthority,
    readonly openReason: string | null = null,
    readonly frameworkErrorCode: RuntimeHtmlObservationFrameworkErrorCode | null = null,
  ) {}

  get supportsCallback(): boolean {
    return observerStrategySupportsCallback(this.strategy);
  }

  get supportsCoercer(): boolean {
    return observerStrategySupportsCoercer(this.strategy);
  }
}

type TypeResolution = {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly reference: CheckerTypeReference | null;
  readonly location: ts.Node | null;
  readonly source: RuntimeBindingTargetTypeSource;
};

type PropertyResolution = {
  readonly symbol: ts.Symbol | null;
  readonly type: ts.Type | null;
  readonly typeReference: CheckerTypeReference | null;
  readonly exists: boolean | null;
  readonly isWritable: boolean | null;
};

export type NodeObserverConfig = {
  readonly type?: typeof ValueAttributeObserver | typeof CheckedObserver | typeof SelectValueObserver;
  readonly events: readonly string[];
  readonly readonly: boolean;
  readonly default: unknown;
};

export class NodeObserverLocatorNodeConfig {
  constructor(
    /** Runtime nodeName lane consumed by NodeObserverLocator.useConfig. */
    readonly tagName: string,
    /** Target property key configured on the node. */
    readonly propertyName: string,
    /** Runtime observer config selected for the node/property pair. */
    readonly config: NodeObserverConfig,
  ) {}
}

export class NodeObserverLocatorGlobalConfig {
  constructor(
    /** Target property key configured globally. */
    readonly propertyName: string,
    /** Runtime observer config selected for every node with this property. */
    readonly config: NodeObserverConfig,
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
 * The framework reaches this when object observer creation sees an accessor descriptor. The static variant approximates
 * that branch through TypeChecker writability: a readable but non-writable member is treated as computed/readonly.
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
  private config: NodeObserverConfig = { events: inputEvents, readonly: false, default: '' };

  constructor() {}

  useConfig(config: NodeObserverConfig): void {
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
    this.value = newValue ?? this.config.default;
    this.hasChanges = true;
    if (!this.config.readonly) {
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
  private config: NodeObserverConfig = { events: checkedEvents, readonly: false, default: false };

  constructor() {}

  useConfig(config: NodeObserverConfig): void {
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
  private config: NodeObserverConfig = { events: selectEvents, readonly: false, default: '' };

  constructor() {}

  useConfig(config: NodeObserverConfig): void {
    this.config = config;
  }

  getValue(): unknown {
    return this.value ?? this.config.default;
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

  private readonly events = new Map<string, Map<string, NodeObserverConfig>>();
  private readonly globalEvents = new Map<string, NodeObserverConfig>();
  private readonly overrides = new Map<string, Set<string>>();
  private readonly globalOverrides = new Set<string>();
  private readonly svg = 'runtime-html:ISVGAnalyzer';

  constructor(
    private readonly observerLocator: ObserverLocator,
    configuration: NodeObserverLocatorConfiguration = NodeObserverLocatorConfiguration.empty,
  ) {
    const inputEventsConfig: NodeObserverConfig = { events: inputEvents, readonly: false, default: '' };
    this.useConfig({
      INPUT: {
        value: inputEventsConfig,
        valueAsNumber: { events: inputEvents, readonly: false, default: 0 },
        checked: { type: CheckedObserver, events: inputEvents, readonly: false, default: false },
        files: { events: inputEvents, readonly: true, default: '' },
      },
      SELECT: {
        value: { type: SelectValueObserver, events: selectEvents, readonly: false, default: '' },
      },
      TEXTAREA: {
        value: inputEventsConfig,
      },
    });

    const contentEventsConfig: NodeObserverConfig = { events: contentEvents, readonly: false, default: '' };
    const scrollEventsConfig: NodeObserverConfig = { events: scrollEvents, readonly: false, default: 0 };
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

  useConfig(config: Record<string, Record<string, NodeObserverConfig>>): void;
  useConfig(nodeName: string, key: string, events: NodeObserverConfig): void;
  useConfig(
    nodeNameOrConfig: string | Record<string, Record<string, NodeObserverConfig>>,
    key?: string,
    eventsConfig?: NodeObserverConfig,
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

  useConfigGlobal(config: Record<string, NodeObserverConfig>): void;
  useConfigGlobal(key: string, events: NodeObserverConfig): void;
  useConfigGlobal(
    configOrKey: string | Record<string, NodeObserverConfig>,
    eventsConfig?: NodeObserverConfig,
  ): void {
    if (typeof configOrKey === 'string') {
      this.globalEvents.set(configOrKey, eventsConfig ?? { events: [], readonly: false, default: undefined });
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

  getNodeObserverConfig(tagName: string, key: string): NodeObserverConfig | undefined {
    return this.events.get(tagName)?.get(key)
      ?? this.globalEvents.get(key);
  }

  getNodeObserver(input: ObserverLocatorLookupRequest): RuntimeBindingTargetAccessStrategy | null {
    const tagName = input.tagName == null ? null : normalizeHtmlTagName(input.tagName);
    if (tagName == null) {
      return null;
    }
    const config = this.getNodeObserverConfig(tagName, input.targetProperty);
    return config == null ? null : nodeObserverStrategyForConfig(config);
  }

  private lookup(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    const tagName = input.tagName == null ? null : normalizeHtmlTagName(input.tagName);
    const config = tagName == null ? undefined : this.getNodeObserverConfig(tagName, input.targetProperty);
    const hasAccessorOverride = tagName != null && this.hasAccessorOverride(tagName, input.targetProperty);
    return this.observerLocator.createObserver(input, config, this.allowDirtyCheck, hasAccessorOverride);
  }

  private setNodeConfig(
    nodeName: string,
    key: string,
    config: NodeObserverConfig | undefined,
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
  private readonly nodeObserverLocator: NodeObserverLocator;
  private readonly adapters: unknown[] = [];

  constructor(
    private readonly store: KernelStore,
    nodeObserverLocatorConfiguration: NodeObserverLocatorConfiguration = NodeObserverLocatorConfiguration.empty,
  ) {
    this.projector = new CheckerTypeProjector(store);
    this.nodeObserverLocator = new NodeObserverLocator(this, nodeObserverLocatorConfiguration);
  }

  addAdapter(adapter: unknown): void {
    this.adapters.push(adapter);
  }

  getAccessor(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Accessor));
  }

  getObserver(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    return this.lookup(input.withLookup(RuntimeBindingTargetAccessLookup.Observer));
  }

  getExpressionObserver(): null {
    return null;
  }

  getComputedObserver(): ComputedObserver {
    return new ComputedObserver();
  }

  getArrayObserver(): null {
    return null;
  }

  getMapObserver(): null {
    return null;
  }

  getSetObserver(): null {
    return null;
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
    config: NodeObserverConfig | undefined,
    nodeAllowDirtyCheck: boolean,
    hasAccessorOverride: boolean,
  ): ObserverLocatorLookupResult {
    const tagName = input.tagName == null ? null : normalizeHtmlTagName(input.tagName);
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
    const openReason = targetAccessOpenReason(tagName, input.targetProperty, strategy, frameworkErrorCode);

    return new ObserverLocatorLookupResult(
      input.lookup,
      input.targetKind,
      input.targetProperty,
      strategy,
      nodeAccessEvents(strategy, config),
      targetType?.reference ?? null,
      targetType?.source ?? null,
      property?.typeReference ?? null,
      property?.exists ?? null,
      property?.isWritable ?? null,
      isSubscribableStrategy(strategy),
      authorityFor(strategy, targetType, true),
      openReason,
      frameworkErrorCode,
    );
  }

  private lookupObject(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    const targetType = this.resolveReferenceType(input, input.targetType);
    const property = targetType == null ? null : this.resolveProperty(input, targetType);
    const strategy = objectAccessStrategy(input.lookup, input.targetProperty, targetType, property);

    return new ObserverLocatorLookupResult(
      input.lookup,
      input.targetKind,
      input.targetProperty,
      strategy,
      [],
      input.targetType ?? targetType?.reference ?? null,
      input.targetType != null || targetType != null ? RuntimeBindingTargetTypeSource.Reference : null,
      property?.typeReference ?? null,
      property?.exists ?? null,
      property?.isWritable ?? null,
      isSubscribableStrategy(strategy),
      authorityFor(
        strategy,
        targetType,
        input.lookup === RuntimeBindingTargetAccessLookup.Accessor
          && strategy === RuntimeBindingTargetAccessStrategy.PropertyAccessor,
      ),
      null,
      null,
    );
  }

  private resolveReferenceType(
    input: ObserverLocatorLookupRequest,
    reference: CheckerTypeReference | null,
  ): TypeResolution | null {
    if (input.typeSystem == null || reference?.productHandle == null) {
      return null;
    }
    const shape = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    const targetReference = shape?.toReference() ?? reference;
    return {
      checker: carrier.checker,
      type: carrier.type,
      reference: targetReference,
      location: firstDeclaration(carrier),
      source: RuntimeBindingTargetTypeSource.Reference,
    };
  }

  private resolveNodeType(
    input: ObserverLocatorLookupRequest,
    tagName: string,
    namespace: HtmlNamespaceKind,
  ): TypeResolution | null {
    const typeSystem = input.typeSystem;
    if (typeSystem == null) {
      return null;
    }
    const location = checkerLocation(typeSystem);
    const mapType = this.resolveNodeTypeFromTagNameMap(typeSystem, tagName, namespace, location);
    if (mapType != null) {
      return {
        checker: typeSystem.checker,
        type: mapType,
        reference: transientTypeReference(typeSystem.checker, mapType, input.sourceAddressHandle),
        location,
        source: RuntimeBindingTargetTypeSource.DomTagNameMap,
      };
    }
    const fallbackType = globalDeclaredType(typeSystem, namespace === HtmlNamespaceKind.Svg ? 'SVGElement' : 'HTMLElement', location);
    if (fallbackType == null) {
      return null;
    }
    return {
      checker: typeSystem.checker,
      type: fallbackType,
      reference: transientTypeReference(typeSystem.checker, fallbackType, input.sourceAddressHandle),
      location,
      source: RuntimeBindingTargetTypeSource.DomGlobalFallback,
    };
  }

  private resolveNodeTypeFromTagNameMap(
    typeSystem: TypeSystemProject,
    tagName: string,
    namespace: HtmlNamespaceKind,
    location: ts.Node | null,
  ): ts.Type | null {
    const lowerTagName = tagName.toLowerCase();
    for (const mapName of tagNameMapNames(namespace)) {
      const mapType = globalDeclaredType(typeSystem, mapName, location);
      const tagSymbol = mapType == null
        ? null
        : typeSystem.checker.getPropertyOfType(mapType, lowerTagName) ?? null;
      if (tagSymbol != null) {
        return typeSystem.checker.getTypeOfSymbolAtLocation(
          tagSymbol,
          location ?? firstSymbolDeclaration(tagSymbol) ?? undefinedNode(typeSystem.checker),
        );
      }
    }
    return null;
  }

  private resolveProperty(
    input: ObserverLocatorLookupRequest,
    target: TypeResolution,
  ): PropertyResolution {
    const symbol = target.checker.getPropertyOfType(target.type, input.targetProperty) ?? null;
    if (symbol == null) {
      return {
        symbol: null,
        type: null,
        typeReference: null,
        exists: false,
        isWritable: null,
      };
    }
    const propertyType = target.checker.getTypeOfSymbolAtLocation(symbol, target.location ?? firstSymbolDeclaration(symbol) ?? undefinedNode(target.checker));
    return {
      symbol,
      type: propertyType,
      typeReference: this.projectTypeReference(input, target.checker, propertyType, `property:${localKeyPart(input.targetProperty)}`, target.location),
      exists: true,
      isWritable: isWritableProperty(symbol),
    };
  }

  private projectTypeReference(
    input: ObserverLocatorLookupRequest,
    checker: ts.TypeChecker,
    type: ts.Type,
    suffix: string,
    sourceNode: ts.Node | null,
  ): CheckerTypeReference {
    const shape = this.projector.ensureProjection({
      localKey: `${input.localKey}:observer-locator:${suffix}`,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      sourceAddressHandle: input.sourceAddressHandle,
    } satisfies CheckerTypeProjectionRequest);
    return shape.toReference();
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
  config: NodeObserverConfig | undefined,
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
  config: NodeObserverConfig | undefined,
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
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  }
  if (targetProperty === 'model') {
    return RuntimeBindingTargetAccessStrategy.SetterObserver;
  }
  if (isAttributeAccessorProperty(targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.AttributeAccessor;
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
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.DataAttributeAccessor;
  }
  if (isAttributeAccessorProperty(targetProperty)) {
    return RuntimeBindingTargetAccessStrategy.AttributeAccessor;
  }
  return RuntimeBindingTargetAccessStrategy.ElementPropertyAccessor;
}

function targetAccessOpenReason(
  tagName: string,
  targetProperty: string,
  strategy: RuntimeBindingTargetAccessStrategy,
  frameworkErrorCode: RuntimeHtmlObservationFrameworkErrorCode | null,
): string | null {
  if (frameworkErrorCode != null) {
    return `Aurelia runtime ${frameworkErrorCode} cannot observe '${tagName}.${targetProperty}' because dirty checking is disabled and no node observer strategy is configured.`;
  }
  return strategy === RuntimeBindingTargetAccessStrategy.Unknown
    ? `NodeObserverLocator could not close '${tagName}.${targetProperty}' through built-in config or TypeChecker surface.`
    : null;
}

function nodeObserverStrategyNotFound(
  tagName: string,
  namespace: HtmlNamespaceKind,
  targetProperty: string,
  lookup: RuntimeBindingTargetAccessLookup,
  allowDirtyCheck: boolean,
  property: PropertyResolution | null,
  config: NodeObserverConfig | undefined,
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
  if (isDataAttributeAccessorProperty(tagName, namespace, targetProperty)) {
    return false;
  }
  return !isAttributeAccessorProperty(targetProperty);
}

function objectAccessStrategy(
  lookup: RuntimeBindingTargetAccessLookup,
  targetProperty: string,
  targetType: TypeResolution | null,
  property: PropertyResolution | null,
): RuntimeBindingTargetAccessStrategy {
  if (lookup === RuntimeBindingTargetAccessLookup.Accessor) {
    return RuntimeBindingTargetAccessStrategy.PropertyAccessor;
  }
  const collectionStrategy = collectionAccessStrategy(targetType, targetProperty);
  if (collectionStrategy != null) {
    return collectionStrategy;
  }
  if (isComputedObserverProperty(property)) {
    return RuntimeBindingTargetAccessStrategy.ComputedObserver;
  }
  return RuntimeBindingTargetAccessStrategy.SetterObserver;
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

function isComputedObserverProperty(property: PropertyResolution | null): boolean {
  return property?.exists === true && property.isWritable === false;
}

function nodeObserverStrategyForConfig(config: NodeObserverConfig): RuntimeBindingTargetAccessStrategy {
  if (config.type === CheckedObserver) {
    return RuntimeBindingTargetAccessStrategy.CheckedObserver;
  }
  if (config.type === SelectValueObserver) {
    return RuntimeBindingTargetAccessStrategy.SelectValueObserver;
  }
  return RuntimeBindingTargetAccessStrategy.ValueAttributeObserver;
}

function nodeAccessEvents(
  strategy: RuntimeBindingTargetAccessStrategy,
  config: NodeObserverConfig | undefined,
): readonly string[] {
  switch (strategy) {
    case RuntimeBindingTargetAccessStrategy.CheckedObserver:
    case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
    case RuntimeBindingTargetAccessStrategy.ValueAttributeObserver:
      return config?.events ?? [];
    default:
      return [];
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
  return targetProperty.startsWith('data-')
    || targetProperty.startsWith('aria-')
    || (namespace === HtmlNamespaceKind.Svg && isStandardSvgAttribute(tagName, targetProperty));
}

function tagNameMapNames(namespace: HtmlNamespaceKind): readonly ('HTMLElementTagNameMap' | 'SVGElementTagNameMap')[] {
  if (namespace === HtmlNamespaceKind.Svg) {
    return ['SVGElementTagNameMap'];
  }
  if (namespace === HtmlNamespaceKind.Html) {
    return ['HTMLElementTagNameMap'];
  }
  return ['HTMLElementTagNameMap', 'SVGElementTagNameMap'];
}

function authorityFor(
  strategy: RuntimeBindingTargetAccessStrategy,
  targetType: TypeResolution | null,
  frameworkConfig: boolean,
): RuntimeBindingTargetAccessAuthority {
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
    case RuntimeBindingTargetAccessStrategy.DirtyCheck:
    case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
    case RuntimeBindingTargetAccessStrategy.SetterObserver:
    case RuntimeBindingTargetAccessStrategy.ValueAttributeObserver:
      return true;
    default:
      return false;
  }
}

function observerStrategySupportsCallback(strategy: RuntimeBindingTargetAccessStrategy): boolean {
  return strategy === RuntimeBindingTargetAccessStrategy.SetterObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ComputedObserver;
}

function observerStrategySupportsCoercer(strategy: RuntimeBindingTargetAccessStrategy): boolean {
  return strategy === RuntimeBindingTargetAccessStrategy.SetterObserver
    || strategy === RuntimeBindingTargetAccessStrategy.ComputedObserver;
}

function globalDeclaredType(
  typeSystem: TypeSystemProject,
  name: string,
  location: ts.Node | null,
): ts.Type | null {
  const symbol = typeSystem.checker.resolveName(
    name,
    location ?? undefinedNode(typeSystem.checker),
    ts.SymbolFlags.Interface,
    false,
  ) ?? null;
  return symbol == null ? null : typeSystem.checker.getDeclaredTypeOfSymbol(symbol);
}

function checkerTypeExtendsCollection(
  checker: ts.TypeChecker,
  type: ts.Type,
  collectionNames: readonly string[],
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const names = new Set(collectionNames);
  if (names.has(checkerCollectionSymbolName(type) ?? '')) {
    return true;
  }
  if ((names.has('Array') || names.has('ReadonlyArray')) && (checker.isArrayType(type) || checker.isTupleType(type))) {
    return true;
  }
  return checker.getBaseTypes(type as ts.InterfaceType)
    ?.some((base) => checkerTypeExtendsCollection(checker, base, collectionNames, seen)) ?? false;
}

function isArrayIndexProperty(property: string): boolean {
  if (property.trim() !== property || property.length === 0) {
    return false;
  }
  const index = Number(property);
  return Number.isInteger(index) && index >= 0 && String(index) === property;
}

function transientTypeReference(
  checker: ts.TypeChecker,
  type: ts.Type,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeReference {
  const display = checker.typeToString(type);
  return new CheckerTypeReference(
    null,
    null,
    display,
    display,
    classifyCheckerTypeShape(type),
    CheckerTypeProjectionOrigin.TypeChecker,
    sourceAddressHandle,
  );
}

function isWritableProperty(symbol: ts.Symbol): boolean | null {
  const declarations = symbol.declarations ?? [];
  if (declarations.length === 0) {
    return null;
  }
  const hasSetter = declarations.some((declaration) => ts.isSetAccessorDeclaration(declaration));
  if (hasSetter) {
    return true;
  }
  const hasGetter = declarations.some((declaration) => ts.isGetAccessorDeclaration(declaration));
  if (hasGetter) {
    return false;
  }
  if (declarations.some(hasReadonlyModifier)) {
    return false;
  }
  return true;
}

function hasReadonlyModifier(declaration: ts.Declaration): boolean {
  return ts.canHaveModifiers(declaration)
    && ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true;
}

function firstDeclaration(carrier: CheckerTypeCarrier): ts.Declaration | null {
  return carrier.declarations[0] ?? null;
}

function firstSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | null {
  return symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
}

function checkerLocation(typeSystem: TypeSystemProject): ts.SourceFile | null {
  return typeSystem.program.getSourceFiles().find((sourceFile) => !sourceFile.isDeclarationFile)
    ?? typeSystem.program.getSourceFiles()[0]
    ?? null;
}

function undefinedNode(checker: ts.TypeChecker): ts.Node {
  return checker.getSymbolAtLocation(checkerLocationFromProgram(checker))?.valueDeclaration
    ?? checkerLocationFromProgram(checker);
}

function checkerLocationFromProgram(checker: ts.TypeChecker): ts.SourceFile {
  return checker.getAmbientModules()[0]?.declarations?.[0]?.getSourceFile()
    ?? ts.createSourceFile('semantic-runtime-observer-locator.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
}
