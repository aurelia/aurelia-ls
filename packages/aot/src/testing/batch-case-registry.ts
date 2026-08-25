import type { BatchCase, BatchCasePlan, BatchRunOptions, BatchShard } from "./batch-contracts.js";

/** Validated deterministic case registry and selection authority for one runner. */
export class BatchCaseRegistry<TContext> {
  readonly #cases: readonly BatchCase<TContext>[];
  readonly #families: ReadonlySet<string>;
  readonly #tags: ReadonlySet<string>;

  public constructor(cases: readonly BatchCase<TContext>[]) {
    validateCases(cases);
    this.#cases = [...cases].sort((left, right) => left.id.localeCompare(right.id));
    this.#families = new Set(this.#cases.map((candidate) => candidate.family));
    this.#tags = new Set(this.#cases.flatMap((candidate) => [...candidate.tags]));
  }

  public plan(options: BatchRunOptions = {}): BatchCasePlan<TContext> {
    this.#validateFilters(options);
    const queryTokens = normalizedQueryTokens(options.query);
    const idPatterns = normalizedIdPatterns(options.idPatterns);
    const filterTags = options.tags == null ? [] : [...options.tags];
    const shard = normalizedShard(options.shard);
    const eligible = this.#cases.filter((candidate) => {
      const lowerId = candidate.id.toLowerCase();
      if (idPatterns.length > 0 && !idPatterns.some((pattern) => lowerId.includes(pattern))) {
        return false;
      }
      if (options.families != null && options.families.size > 0 && !options.families.has(candidate.family)) {
        return false;
      }
      if (filterTags.length > 0 && !filterTags.some((tag) => candidate.tags.includes(tag))) {
        return false;
      }
      if (queryTokens.length === 0) {
        return true;
      }
      const searchable = `${candidate.id} ${candidate.family} ${candidate.tags.join(" ")} ${candidate.requirement}`
        .toLowerCase();
      return queryTokens.every((token) => searchable.includes(token));
    });

    return {
      discoveredCaseCount: this.#cases.length,
      eligible,
      selected: shard == null
        ? eligible
        : eligible.filter((candidate) => stableCaseHash(candidate.id) % shard.count === shard.index),
    };
  }

  #validateFilters(options: BatchRunOptions): void {
    if (options.families != null) {
      for (const family of options.families) {
        if (!isCanonicalToken(family)) {
          throw new Error(`Invalid batch family filter: ${family || "<empty>"}`);
        }
        if (!this.#families.has(family)) {
          throw new Error(`Unknown batch family: ${family}`);
        }
      }
    }
    if (options.tags != null) {
      for (const tag of options.tags) {
        if (!isCanonicalToken(tag)) {
          throw new Error(`Invalid batch tag filter: ${tag || "<empty>"}`);
        }
        if (!this.#tags.has(tag)) {
          throw new Error(`Unknown batch tag: ${tag}`);
        }
      }
    }
  }
}

function validateCases<TContext>(cases: readonly BatchCase<TContext>[]): void {
  const ids = new Set<string>();
  for (const candidate of cases) {
    if (!isCanonicalToken(candidate.id) || !isCanonicalToken(candidate.family)) {
      throw new Error(`Batch case ${candidate.id || "<empty>"} must use canonical lowercase id/family tokens.`);
    }
    if (candidate.requirement.trim().length === 0) {
      throw new Error(`Batch case ${candidate.id} must declare a requirement.`);
    }
    if (candidate.tags.length === 0 || candidate.tags.some((tag) => !isCanonicalToken(tag))) {
      throw new Error(`Batch case ${candidate.id} must declare canonical lowercase tags.`);
    }
    if (new Set(candidate.tags).size !== candidate.tags.length) {
      throw new Error(`Batch case ${candidate.id} declares duplicate tags.`);
    }
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate batch case id: ${candidate.id}`);
    }
    ids.add(candidate.id);
  }
}

function normalizedQueryTokens(query: string | undefined): readonly string[] {
  if (query == null) {
    return [];
  }
  if (query.trim().length === 0) {
    throw new Error("Batch query filters must be non-blank.");
  }
  return query.toLowerCase().split(/\s+/u).filter((token) => token.length > 0);
}

function normalizedIdPatterns(patterns: readonly string[] | undefined): readonly string[] {
  if (patterns == null) {
    return [];
  }
  return patterns.map((pattern) => {
    const normalized = pattern.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new Error("Batch id filters must be non-blank.");
    }
    return normalized;
  });
}

function normalizedShard(shard: BatchShard | undefined): BatchShard | undefined {
  if (shard == null) {
    return undefined;
  }
  if (!Number.isInteger(shard.count) || shard.count < 1) {
    throw new Error(`shard.count must be a positive integer; received ${shard.count}.`);
  }
  if (!Number.isInteger(shard.index) || shard.index < 0 || shard.index >= shard.count) {
    throw new Error(`shard.index must be between 0 and ${shard.count - 1}; received ${shard.index}.`);
  }
  return shard;
}

function stableCaseHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; ++index) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function isCanonicalToken(value: string): boolean {
  return /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(value);
}
