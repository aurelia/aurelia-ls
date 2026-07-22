/**
 * Operational currentness for a read or publication view.
 * A transient view may become unusable without denoting a durable generation identity.
 */
export interface CurrentnessAuthority {
  isCurrent(): boolean;
  requireCurrent(): void;
}

/**
 * Currentness for a durable analysis generation.
 * The witness covers every independently revocable monotonic generation position; semantic input equality remains a
 * typed computation-read concern rather than collapsing into this identity proof.
 */
export interface GenerationAuthority extends CurrentnessAuthority {
  readonly currentnessWitness: GenerationCurrentnessWitness;
}

interface GenerationCurrentnessCheck {
  readonly key: string;
  readonly clock: GenerationCurrentnessClock;
  readonly ordinal: number;
}

const generationCurrentnessOrdinals = new WeakMap<GenerationCurrentnessClock, number>();
const generationCurrentnessChecks = new WeakMap<GenerationCurrentnessWitness, readonly GenerationCurrentnessCheck[]>();
const generationCurrentnessWitnessAuthority = Object.freeze({});

/** Kernel-owned monotonic identity source for one independently revocable generation position. */
export class GenerationCurrentnessClock {
  constructor() {
    generationCurrentnessOrdinals.set(this, 0);
    Object.freeze(this);
  }

  get currentOrdinal(): number {
    return requireGenerationCurrentnessOrdinal(this);
  }

  advance(): number {
    const next = requireGenerationCurrentnessOrdinal(this) + 1;
    if (!Number.isSafeInteger(next)) {
      throw new Error('Generation currentness ordinal exceeded the safe integer range.');
    }
    generationCurrentnessOrdinals.set(this, next);
    return next;
  }

  capture(key: string): GenerationCurrentnessWitness {
    if (key.trim().length === 0) {
      throw new Error('Generation currentness witness keys must not be empty.');
    }
    return mintGenerationCurrentnessWitness([Object.freeze({
      key,
      clock: this,
      ordinal: requireGenerationCurrentnessOrdinal(this),
    })]);
  }
}

/** Nominal immutable proof over one or more kernel-owned monotonic generation positions. */
export class GenerationCurrentnessWitness {
  constructor(authority: object) {
    if (authority !== generationCurrentnessWitnessAuthority) {
      throw new Error('Generation currentness witnesses can only be minted by kernel-owned clocks.');
    }
    Object.freeze(this);
  }

  isCurrent(): boolean {
    return invalidGenerationCurrentnessKeys(this).length === 0;
  }
}

/** One failed monotonic generation proof, containing every invalid logical authority key. */
export class GenerationCurrentnessChangedError extends Error {
  readonly invalidKeys: readonly string[];

  constructor(invalidKeys: readonly string[]) {
    const normalized = Object.freeze([...new Set(invalidKeys)].sort((left, right) => left.localeCompare(right)));
    super(`Generation currentness changed for ${normalized.join(', ')}.`);
    this.invalidKeys = normalized;
  }
}

export const emptyGenerationCurrentnessWitness = mintGenerationCurrentnessWitness([]);

/** Combine independent currentness positions without introducing a second generation counter. */
export function combineGenerationCurrentnessWitnesses(
  witnesses: readonly GenerationCurrentnessWitness[],
): GenerationCurrentnessWitness {
  if (witnesses.length === 0) {
    return emptyGenerationCurrentnessWitness;
  }
  if (witnesses.length === 1) {
    requireGenerationCurrentnessChecks(witnesses[0]!);
    return witnesses[0]!;
  }
  return mintGenerationCurrentnessWitness(witnesses.flatMap((witness) => [
    ...requireGenerationCurrentnessChecks(witness),
  ]));
}

/** Bind an authority-owned witness to the consuming guard's logical key. */
export function rekeyGenerationCurrentnessWitness(
  witness: GenerationCurrentnessWitness,
  key: string,
): GenerationCurrentnessWitness {
  if (key.trim().length === 0) {
    throw new Error('Generation currentness witness keys must not be empty.');
  }
  return mintGenerationCurrentnessWitness(requireGenerationCurrentnessChecks(witness).map((check) => Object.freeze({
    key,
    clock: check.clock,
    ordinal: check.ordinal,
  })));
}

/** Inspect a nominal witness through module-private clocks only; no owner callback participates. */
export function invalidGenerationCurrentnessKeys(
  witness: GenerationCurrentnessWitness,
): readonly string[] {
  const invalid = new Set<string>();
  for (const check of requireGenerationCurrentnessChecks(witness)) {
    if (requireGenerationCurrentnessOrdinal(check.clock) !== check.ordinal) {
      invalid.add(check.key);
    }
  }
  return Object.freeze([...invalid].sort((left, right) => left.localeCompare(right)));
}

/** Reject a stale witness through the callback-free kernel currentness path. */
export function requireGenerationCurrentness(witness: GenerationCurrentnessWitness): void {
  const invalidKeys = invalidGenerationCurrentnessKeys(witness);
  if (invalidKeys.length > 0) {
    throw new GenerationCurrentnessChangedError(invalidKeys);
  }
}

function mintGenerationCurrentnessWitness(
  checks: readonly GenerationCurrentnessCheck[],
): GenerationCurrentnessWitness {
  const witness = new GenerationCurrentnessWitness(generationCurrentnessWitnessAuthority);
  generationCurrentnessChecks.set(witness, Object.freeze([...checks]));
  return witness;
}

function requireGenerationCurrentnessChecks(
  witness: GenerationCurrentnessWitness,
): readonly GenerationCurrentnessCheck[] {
  const checks = generationCurrentnessChecks.get(witness);
  if (checks == null) {
    throw new Error('Generation currentness witness was not minted by the kernel.');
  }
  return checks;
}

function requireGenerationCurrentnessOrdinal(clock: GenerationCurrentnessClock): number {
  const ordinal = generationCurrentnessOrdinals.get(clock);
  if (ordinal == null) {
    throw new Error('Generation currentness clock was not minted by the kernel.');
  }
  return ordinal;
}
