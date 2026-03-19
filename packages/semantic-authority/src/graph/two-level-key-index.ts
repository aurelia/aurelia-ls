export class TwoLevelKeyIndex {
  readonly #buckets = new Map<string, Map<string, Set<string>>>();

  public clear(): void {
    this.#buckets.clear();
  }

  public delete(primaryKey: string, secondaryKey: string, value: string): boolean {
    const secondaryBuckets = this.#buckets.get(primaryKey);
    if (secondaryBuckets == null) {
      return false;
    }

    const bucket = secondaryBuckets.get(secondaryKey);
    if (bucket == null) {
      return false;
    }

    const deleted = bucket.delete(value);
    if (bucket.size === 0) {
      secondaryBuckets.delete(secondaryKey);
    }
    if (secondaryBuckets.size === 0) {
      this.#buckets.delete(primaryKey);
    }

    return deleted;
  }

  public get(primaryKey: string, secondaryKey?: string): readonly string[] {
    const secondaryBuckets = this.#buckets.get(primaryKey);
    if (secondaryBuckets == null) {
      return [];
    }

    if (secondaryKey != null) {
      return [...(secondaryBuckets.get(secondaryKey) ?? [])];
    }

    const values: string[] = [];
    for (const bucket of secondaryBuckets.values()) {
      values.push(...bucket);
    }

    return values;
  }

  public scanByPrimaryPrefix(primaryPrefix: string, secondaryKey?: string): readonly string[] {
    const values: string[] = [];

    for (const [primaryKey, secondaryBuckets] of this.#buckets) {
      if (!primaryKey.startsWith(primaryPrefix)) {
        continue;
      }

      if (secondaryKey != null) {
        values.push(...(secondaryBuckets.get(secondaryKey) ?? []));
        continue;
      }

      for (const bucket of secondaryBuckets.values()) {
        values.push(...bucket);
      }
    }

    return values;
  }

  public set(primaryKey: string, secondaryKey: string, value: string): void {
    let secondaryBuckets = this.#buckets.get(primaryKey);
    if (secondaryBuckets == null) {
      secondaryBuckets = new Map<string, Set<string>>();
      this.#buckets.set(primaryKey, secondaryBuckets);
    }

    let bucket = secondaryBuckets.get(secondaryKey);
    if (bucket == null) {
      bucket = new Set<string>();
      secondaryBuckets.set(secondaryKey, bucket);
    }

    bucket.add(value);
  }
}
