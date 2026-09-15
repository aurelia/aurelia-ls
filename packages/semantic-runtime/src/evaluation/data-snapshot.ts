import type ts from 'typescript';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';
import { evaluationValueHasMutableGraph } from './evaluation-graph.js';
import { staticEvaluationRuntimeHostCanShareSnapshotValue } from './runtime-host.js';
import { createSnapshotArray } from './snapshot-array.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  type EvaluationArrayShape,
  EvaluationObjectProperty,
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

export type StaticDataSnapshotValue = EvaluationObjectValue | EvaluationArrayValue;
export type StaticDataSnapshot = StaticObjectSnapshot | StaticArraySnapshot;
type StoredValue = EvaluationValue | StaticDataSnapshot;

interface StoredProperty {
  /** Source descriptor supplies immutable syntax and pressure, never the property's live value. */
  readonly property: EvaluationObjectProperty;
  readonly value: StoredValue;
}

/** Immutable data state; the source supplies identity and syntax, never live contents during restoration. */
export class StaticObjectSnapshot {
  constructor(
    readonly source: EvaluationObjectValue,
    readonly properties: ReadonlyMap<string, StoredProperty>,
  ) {}
}

interface StoredElement {
  readonly element: EvaluationArrayElement;
  readonly runtimeIndex: number;
  readonly value: StoredValue;
}

export class StaticArraySnapshot {
  constructor(
    readonly source: EvaluationArrayValue,
    readonly elements: readonly StoredElement[],
    readonly shape: EvaluationArrayShape,
  ) {}
}

/** Latest exact state per live object. Prior states live only as long as their recorded occurrences need them. */
export class StaticDataSnapshotPool {
  private readonly latest = new WeakMap<StaticDataSnapshotValue, StaticDataSnapshot>();
  private createdStates = 0;

  get createdStateCount(): number { return this.createdStates; }

  capture(source: EvaluationObjectValue, host: StaticEvaluationRuntimeHost): StaticObjectSnapshot | null;
  capture(source: EvaluationArrayValue, host: StaticEvaluationRuntimeHost): StaticArraySnapshot | null;
  capture(source: EvaluationValue, host: StaticEvaluationRuntimeHost): StaticDataSnapshot | null;
  capture(source: EvaluationValue, host: StaticEvaluationRuntimeHost): StaticDataSnapshot | null {
    const visited = new Map<StaticDataSnapshotValue, StaticDataSnapshot | null>();
    const active = new Set<StaticDataSnapshotValue>();
    const capture = (value: EvaluationValue): StoredValue | null => {
      if (!evaluationValueHasMutableGraph(value)) return value;
      if (!isClosedData(value) || !staticEvaluationRuntimeHostCanShareSnapshotValue(host, value)) return null;
      if (active.has(value)) return null;
      if (visited.has(value)) return visited.get(value) ?? null;
      active.add(value);
      try {
        const candidate = this.latest.get(value);
        if (value.kind === EvaluationValueKind.Array) {
          const previous = candidate instanceof StaticArraySnapshot ? candidate : null;
          const dense = value.elements.length === value.exactLength;
          let unchanged = previous?.shape === value.shape && previous.elements.length === value.elements.length;
          let lastIndex = -1;
          for (let index = 0; index < value.elements.length; index++) {
            const element = value.elements[index];
            if (element == null || element.openSeams.length > 0) { visited.set(value, null); return null; }
            const runtimeIndex = dense ? index : element.runtimeIndex;
            if (runtimeIndex == null || runtimeIndex <= lastIndex || runtimeIndex >= value.exactLength!) {
              visited.set(value, null); return null;
            }
            lastIndex = runtimeIndex;
            const child = capture(element.value);
            if (child == null) { visited.set(value, null); return null; }
            const retained = previous?.elements[index];
            if (retained?.element !== element || retained.runtimeIndex !== runtimeIndex || retained.value !== child) {
              unchanged = false;
            }
          }
          if (unchanged && previous != null) { visited.set(value, previous); return previous; }
          const elements = value.elements.map((element, index): StoredElement => ({
            element,
            runtimeIndex: dense ? index : element.runtimeIndex!,
            value: storedChild(element.value),
          }));
          return retain(value, new StaticArraySnapshot(value, elements, value.shape));
        }
        const previous = candidate instanceof StaticObjectSnapshot ? candidate : null;
        let unchanged = previous != null && previous.properties.size === value.properties.size;
        const previousKeys = previous?.properties.keys();
        // The first scan proves child state without allocating replacement entries for an unchanged registry.
        for (const [key, property] of value.properties) {
          if (!isClosedProperty(property)) { visited.set(value, null); return null; }
          const child = capture(property.value);
          if (child == null) { visited.set(value, null); return null; }
          const retained = previous?.properties.get(key);
          if (previousKeys?.next().value !== key || retained?.property !== property || retained.value !== child) {
            unchanged = false;
          }
        }
        if (unchanged && previous != null) {
          visited.set(value, previous);
          return previous;
        }
        const properties = new Map<string, StoredProperty>();
        for (const [key, property] of value.properties) {
          properties.set(key, { property, value: storedChild(property.value) });
        }
        return retain(value, new StaticObjectSnapshot(value, properties));
      } finally {
        active.delete(value);
      }
    };
    const storedChild = (value: EvaluationValue): StoredValue => {
      const child = evaluationValueHasMutableGraph(value)
        ? visited.get(value as StaticDataSnapshotValue)
        : value;
      if (child == null) throw new Error('Snapshot capture lost a proved child state.');
      return child;
    };
    const retain = (value: StaticDataSnapshotValue, snapshot: StaticDataSnapshot): StaticDataSnapshot => {
      this.latest.set(value, snapshot);
      this.createdStates++;
      visited.set(value, snapshot);
      return snapshot;
    };
    const result = capture(source);
    return isSnapshot(result) ? result : null;
  }
}

/** A mutation domain belongs to one fork, never to the shared data state. */
export class StaticDataSnapshotDomain {
  private dirty = false;
  private readonly views = new Set<StaticDataSnapshotValue>();
  private readonly dependencies = new Set<StaticDataSnapshotDomain>();

  constructor(private readonly host: StaticEvaluationRuntimeHost) {}

  changed(): void { this.dirty = true; }
  retain(value: StaticDataSnapshotValue): void { this.views.add(value); }
  dependsOn(domain: StaticDataSnapshotDomain): void {
    if (domain !== this) this.dependencies.add(domain);
  }

  isPristine(host: StaticEvaluationRuntimeHost = this.host, seen = new Set<StaticDataSnapshotDomain>()): boolean {
    if (this.dirty || host !== this.host) return false;
    if (seen.has(this)) return true;
    seen.add(this);
    // Metadata can be installed without changing a visible property. Only materialized views can acquire it.
    for (const value of this.views) {
      if (!isClosedData(value) || !staticEvaluationRuntimeHostCanShareSnapshotValue(this.host, value)) return false;
    }
    for (const dependency of this.dependencies) if (!dependency.isPristine(host, seen)) return false;
    return true;
  }
}

export interface SnapshotSourceMapping {
  read(snapshot: StaticDataSnapshot): StaticDataSnapshotValue;
  peek(snapshot: StaticDataSnapshot): StaticDataSnapshotValue | null;
  recordFor(value: EvaluationValue): StaticDataSnapshot | null;
}

interface DataSnapshotView {
  readonly snapshot: StaticDataSnapshot;
  readonly domain: StaticDataSnapshotDomain;
  readonly sources: SnapshotSourceMapping;
}

const dataSnapshotViews = new WeakMap<StaticDataSnapshotValue, DataSnapshotView>();

export function dataSnapshotDomainFor(value: EvaluationValue): StaticDataSnapshotDomain | null {
  return value.kind === EvaluationValueKind.Object || value.kind === EvaluationValueKind.Array
    ? dataSnapshotViews.get(value)?.domain ?? null : null;
}

export function dataSnapshotViewFor(value: EvaluationValue): DataSnapshotView | null {
  return value.kind === EvaluationValueKind.Object || value.kind === EvaluationValueKind.Array
    ? dataSnapshotViews.get(value) ?? null : null;
}

const snapshotIndexes = new WeakMap<StaticDataSnapshot, ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot>>();

/** Shared identity index, independent of the number of occurrences viewing one stored state. */
export function dataSnapshotIndex(root: StaticDataSnapshot): ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot> {
  const cached = snapshotIndexes.get(root);
  if (cached != null) return cached;
  const children = new Set<StaticDataSnapshot>();
  for (const child of root instanceof StaticObjectSnapshot ? root.properties.values() : root.elements) {
    if (isSnapshot(child.value)) children.add(child.value);
  }
  const indexes = [...children].map(dataSnapshotIndex);
  const base = indexes.reduce<ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot> | null>(
    (largest, index) => largest == null || index.size > largest.size ? index : largest, null);
  const own = new Map<StaticDataSnapshotValue, StaticDataSnapshot>([[root.source, root]]);
  for (const child of indexes) {
    if (child === base) continue;
    for (const [source, record] of child) {
      const existing = base?.get(source) ?? own.get(source);
      if (existing == null) own.set(source, record);
      else if (existing !== record) throw new Error('One snapshot contains conflicting states for the same source.');
    }
  }
  // New small return wrappers borrow the large child's index instead of flattening it for every call.
  const index = new SnapshotIdentityIndex(base, own);
  snapshotIndexes.set(root, index);
  return index;
}

class SnapshotIdentityIndex implements ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot> {
  constructor(
    private readonly base: ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot> | null,
    private readonly own: ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot>,
  ) {}

  get size(): number { return (this.base?.size ?? 0) + this.own.size; }
  get(key: StaticDataSnapshotValue): StaticDataSnapshot | undefined { return this.own.get(key) ?? this.base?.get(key); }
  has(key: StaticDataSnapshotValue): boolean { return this.own.has(key) || this.base?.has(key) === true; }
  *entries(): MapIterator<[StaticDataSnapshotValue, StaticDataSnapshot]> {
    yield* this.own;
    if (this.base != null) yield* this.base;
  }
  *keys(): MapIterator<StaticDataSnapshotValue> { for (const [key] of this) yield key; }
  *values(): MapIterator<StaticDataSnapshot> { for (const [, value] of this) yield value; }
  [Symbol.iterator](): MapIterator<[StaticDataSnapshotValue, StaticDataSnapshot]> { return this.entries(); }
  forEach(
    callback: (value: StaticDataSnapshot, key: StaticDataSnapshotValue,
      map: ReadonlyMap<StaticDataSnapshotValue, StaticDataSnapshot>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this);
  }
}

export function readPristineObjectSnapshotView(
  value: EvaluationValue,
  host?: StaticEvaluationRuntimeHost,
): DataSnapshotView | null {
  if (value.kind !== EvaluationValueKind.Object) return null;
  return readPristineDataSnapshotView(value, host);
}

export function readPristineDataSnapshotView(value: EvaluationValue, host?: StaticEvaluationRuntimeHost): DataSnapshotView | null {
  if (value.kind !== EvaluationValueKind.Object && value.kind !== EvaluationValueKind.Array) return null;
  const view = dataSnapshotViews.get(value);
  return view != null && view.domain.isPristine(host) ? view : null;
}

/** Select authored child rows from stored syntax before allocating their occurrence-local values. */
export function snapshotObjectPropertiesWhere(
  value: EvaluationObjectValue,
  select: (node: ts.Node | null) => boolean,
): Iterable<EvaluationObjectProperty> | null {
  const view = readPristineDataSnapshotView(value);
  if (!(view?.snapshot instanceof StaticObjectSnapshot)) return null;
  const properties = view.snapshot.properties;
  return (function* () {
    for (const [key, entry] of properties) if (select(entry.property.node)) yield value.properties.get(key)!;
  })();
}

export function snapshotArrayElementsWhere(
  value: EvaluationArrayValue,
  select: (expression: ts.Expression | null) => boolean,
): Iterable<EvaluationArrayElement> | null {
  const view = readPristineDataSnapshotView(value);
  if (!(view?.snapshot instanceof StaticArraySnapshot)) return null;
  const elements = view.snapshot.elements;
  return (function* () {
    for (let index = 0; index < elements.length; index++) {
      if (select(elements[index]!.element.expression)) yield value.elements[index]!;
    }
  })();
}

/** Materialize one occurrence's independently writable facade; property children stay lazy. */
export function createObjectSnapshotView(
  snapshot: StaticObjectSnapshot,
  domain: StaticDataSnapshotDomain,
  sources: SnapshotSourceMapping,
): EvaluationObjectValue {
  const properties = new SnapshotPropertyMap(snapshot.properties, (value) =>
    isSnapshot(value) ? sources.read(value) : value, () => domain.changed());
  const target = new EvaluationObjectValue(properties, false, snapshot.source.node);
  return retainDataView(target, snapshot, domain, sources);
}

export function createDataSnapshotView(
  snapshot: StaticDataSnapshot,
  domain: StaticDataSnapshotDomain,
  sources: SnapshotSourceMapping,
): StaticDataSnapshotValue {
  if (snapshot instanceof StaticObjectSnapshot) return createObjectSnapshotView(snapshot, domain, sources);
  const elements = createSnapshotArray(snapshot.elements, (stored) => new EvaluationArrayElement(
    isSnapshot(stored.value) ? sources.read(stored.value) : stored.value,
    stored.element.expression, stored.element.openSeams, stored.runtimeIndex,
  ), () => domain.changed());
  return retainDataView(new SnapshotArrayValue(snapshot, elements), snapshot, domain, sources);
}

/** Stored elements already carry the normalized indices proved at capture; do not expand the lazy carrier. */
class SnapshotArrayValue extends EvaluationArrayValue {
  override readonly elements: EvaluationArrayElement[];

  constructor(snapshot: StaticArraySnapshot, elements: EvaluationArrayElement[]) {
    super([], snapshot.source.node, snapshot.shape);
    this.elements = elements;
  }
}

function retainDataView<T extends StaticDataSnapshotValue>(
  target: T,
  snapshot: StaticDataSnapshot,
  domain: StaticDataSnapshotDomain,
  sources: SnapshotSourceMapping,
): T {
  // Scalar shape writes must invalidate the same domain as a nested collection write.
  const view = new Proxy(target, {
    set(object, key, value, receiver) {
      domain.changed();
      return Reflect.set(object, key, value, receiver);
    },
    defineProperty(object, key, descriptor) {
      domain.changed();
      return Reflect.defineProperty(object, key, descriptor);
    },
    deleteProperty(object, key) {
      domain.changed();
      return Reflect.deleteProperty(object, key);
    },
  });
  dataSnapshotViews.set(view, { snapshot, domain, sources });
  domain.retain(view);
  return view;
}

function isSnapshot(value: StoredValue | null): value is StaticDataSnapshot {
  return value instanceof StaticObjectSnapshot || value instanceof StaticArraySnapshot;
}

/**
 * Shared base rows plus occurrence-local edits. No placeholder allocation per base key.
 * Append records preserve native Map iteration through deletion, reinsertion and clear during iteration.
 */
class SnapshotPropertyMap extends Map<string, EvaluationObjectProperty> {
  private readonly resolved = new Map<string, EvaluationObjectProperty>();
  private readonly replacements = new Map<string, EvaluationObjectProperty>();
  private readonly deleted = new Set<string>();
  private readonly appended: { readonly key: string }[] = [];
  private readonly activeAppends = new Map<string, { readonly key: string }>();
  private baseCleared = false;
  private count: number;

  constructor(
    private readonly base: ReadonlyMap<string, StoredProperty>,
    private readonly resolve: (value: StoredValue) => EvaluationValue,
    private readonly changed: () => void,
  ) {
    super();
    this.count = base.size;
  }

  override get size(): number { return this.count; }

  override has(key: string): boolean {
    return this.activeAppends.has(key) || this.baseHas(key);
  }

  override get(key: string): EvaluationObjectProperty | undefined {
    const replacement = this.replacements.get(key);
    if (replacement != null) return replacement;
    if (!this.baseHas(key)) return undefined;
    let property = this.resolved.get(key);
    if (property == null) {
      const stored = this.base.get(key)!;
      const source = stored.property;
      property = new EvaluationObjectProperty(
        source.name, this.resolve(stored.value), source.node, source.state,
        source.openSeams, source.presence, source.presenceOpenSeams,
      );
      this.resolved.set(key, property);
    }
    return property;
  }

  override set(key: string, value: EvaluationObjectProperty): this {
    this.changed();
    if (!this.has(key)) {
      const entry = { key };
      this.appended.push(entry);
      this.activeAppends.set(key, entry);
      this.count++;
    }
    this.replacements.set(key, value);
    return this;
  }

  override delete(key: string): boolean {
    if (!this.has(key)) return false;
    this.changed();
    this.deleted.add(key);
    this.activeAppends.delete(key);
    this.replacements.delete(key);
    this.resolved.delete(key);
    this.count--;
    return true;
  }

  override clear(): void {
    this.changed();
    this.baseCleared = true;
    this.activeAppends.clear();
    this.replacements.clear();
    this.resolved.clear();
    this.count = 0;
  }

  override *keys(): MapIterator<string> {
    for (const key of this.base.keys()) if (this.baseHas(key)) yield key;
    for (const entry of this.appended) if (this.activeAppends.get(entry.key) === entry) yield entry.key;
  }

  override *entries(): MapIterator<[string, EvaluationObjectProperty]> {
    for (const key of this.keys()) yield [key, this.get(key)!];
  }

  override *values(): MapIterator<EvaluationObjectProperty> {
    for (const key of this.keys()) yield this.get(key)!;
  }

  override [Symbol.iterator](): MapIterator<[string, EvaluationObjectProperty]> { return this.entries(); }

  override forEach(
    callback: (value: EvaluationObjectProperty, key: string, map: Map<string, EvaluationObjectProperty>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this);
  }

  private baseHas(key: string): boolean {
    return !this.baseCleared && !this.deleted.has(key) && this.base.has(key);
  }
}

function isClosedObject(value: EvaluationValue): value is EvaluationObjectValue {
  return value.kind === EvaluationValueKind.Object && !value.mayHaveUnknownProperties
    && value.uncertainties.length === 0 && value.shapeOpenSeams.length === 0
    && value.propertyOrderOpenSeams.length === 0;
}

function isClosedData(value: EvaluationValue): value is StaticDataSnapshotValue {
  return isClosedObject(value) || (value.kind === EvaluationValueKind.Array && value.hasExactElementPositions
    && value.uncertainties.length === 0 && value.extentOpenSeams.length === 0
    && value.elementOpenSeams.length === 0 && value.orderOpenSeams.length === 0);
}

function isClosedProperty(property: EvaluationObjectProperty): boolean {
  return property.state === EvaluationObjectPropertyState.Closed
    && property.presence === EvaluationObjectPropertyPresence.Present
    && property.openSeams.length === 0 && property.presenceOpenSeams.length === 0;
}
