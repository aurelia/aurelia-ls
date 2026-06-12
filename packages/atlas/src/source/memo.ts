import type { SourceProject } from "./project.js";

/** Source-epoch-scoped memo for one derived value per SourceProject. */
export class SourceProjectMemo<TValue> {
  readonly #values = new WeakMap<SourceProject, TValue>();

  read(sourceProject: SourceProject, create: () => TValue): TValue {
    if (this.#values.has(sourceProject)) {
      return this.#values.get(sourceProject)!;
    }
    const value = create();
    this.#values.set(sourceProject, value);
    return value;
  }

  get(sourceProject: SourceProject): TValue | undefined {
    return this.#values.get(sourceProject);
  }

  set(sourceProject: SourceProject, value: TValue): TValue {
    this.#values.set(sourceProject, value);
    return value;
  }
}

/** Source-epoch-scoped memo for many keyed values per SourceProject. */
export class SourceProjectKeyedMemo<TKey, TValue> {
  readonly #values = new WeakMap<SourceProject, Map<TKey, TValue>>();

  read(
    sourceProject: SourceProject,
    key: TKey,
    create: () => TValue,
  ): TValue {
    const values = this.#valuesFor(sourceProject);
    if (values.has(key)) {
      return values.get(key)!;
    }
    const value = create();
    values.set(key, value);
    return value;
  }

  get(sourceProject: SourceProject, key: TKey): TValue | undefined {
    return this.#values.get(sourceProject)?.get(key);
  }

  set(sourceProject: SourceProject, key: TKey, value: TValue): TValue {
    this.#valuesFor(sourceProject).set(key, value);
    return value;
  }

  #valuesFor(sourceProject: SourceProject): Map<TKey, TValue> {
    const existing = this.#values.get(sourceProject);
    if (existing !== undefined) {
      return existing;
    }
    const values = new Map<TKey, TValue>();
    this.#values.set(sourceProject, values);
    return values;
  }
}
