import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type {
  CheckerTypeReference,
  CheckerTypeShape,
} from './type-shape.js';

export const enum CheckerExpressionTypeEvaluationResultKind {
  Type = 'type',
  Open = 'open',
}

export const enum CheckerExpressionTypeOpenKind {
  MissingBindingScope = 'missing-binding-scope',
  MissingAncestor = 'missing-ancestor',
  MissingContext = 'missing-context',
  MissingContextType = 'missing-context-type',
  HostContextNotFound = 'host-context-not-found',
  MissingSlotType = 'missing-slot-type',
  MissingTypeDetail = 'missing-type-detail',
  MissingMember = 'missing-member',
  MissingMemberValueType = 'missing-member-value-type',
  MissingIterableElementType = 'missing-iterable-element-type',
  MissingChecker = 'missing-checker',
  UnsupportedGlobalAccess = 'unsupported-global-access',
  UnsupportedKeyedAccess = 'unsupported-keyed-access',
  UnsupportedCallTarget = 'unsupported-call-target',
  UnsupportedConstruct = 'unsupported-construct',
  IncrementInConnectableEvaluation = 'increment-in-connectable-evaluation',
  NullishMemberAccess = 'nullish-member-access',
  NullishKeyedAccess = 'nullish-keyed-access',
  NullishCallTarget = 'nullish-call-target',
  UnsupportedBindingPattern = 'unsupported-binding-pattern',
  UnsupportedExpression = 'unsupported-expression',
  MissingValueConverterResource = 'missing-value-converter-resource',
  MissingBindingBehaviorResource = 'missing-binding-behavior-resource',
  DuplicateBindingBehavior = 'duplicate-binding-behavior',
  OpenValueConverter = 'open-value-converter',
}

export class CheckerExpressionType {
  readonly kind = CheckerExpressionTypeEvaluationResultKind.Type;

  constructor(
    /** Projected type shape reached by the expression. */
    readonly typeShape: CheckerTypeShape,
    /** Handle-sized reference to the projected type. */
    readonly typeReference: CheckerTypeReference,
    /** Compact explanation of the route used to reach the type. */
    readonly summary: string,
  ) {}
}

export type CheckerExpressionTypeOpenSubjectKind =
  | 'scope-slot'
  | 'scope-context'
  | 'type-member'
  | 'resource'
  | 'expression';

export class CheckerExpressionTypeOpenSubject {
  constructor(
    /** Runtime or TypeChecker surface that should be repaired or inspected, distinct from the selected member token. */
    readonly subjectKind: CheckerExpressionTypeOpenSubjectKind,
    /** Authored/runtime name of the subject, when the open result reached a named surface. */
    readonly name: string | null,
    /** Source address for the repairable subject, not necessarily the diagnostic cursor span. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Static type carried by the subject, when one exists but could not be fully projected. */
    readonly typeReference: CheckerTypeReference | null = null,
  ) {}
}

export class CheckerExpressionTypeOpen {
  readonly kind = CheckerExpressionTypeEvaluationResultKind.Open;

  constructor(
    /** Why the evaluator could not honestly close the type. */
    readonly openKind: CheckerExpressionTypeOpenKind,
    /** AST kind that produced or exposed the open result. */
    readonly expressionKind: ExpressionAstNode['$kind'],
    /** Compact explanation for inquiry answers or tooling projection. */
    readonly summary: string,
    /** Partial type reference, when the evaluator reached one but could not hydrate/project it. */
    readonly partialTypeReference: CheckerTypeReference | null = null,
    /** Specific open subject that should be repaired or inspected, when it is narrower than the expression span. */
    readonly subject: CheckerExpressionTypeOpenSubject | null = null,
  ) {}
}

export type CheckerExpressionTypeEvaluation =
  | CheckerExpressionType
  | CheckerExpressionTypeOpen;

export interface CheckerExpressionTypeEvaluationCacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly entriesByBucket: Readonly<Record<string, number>>;
  readonly hitsByBucket: Readonly<Record<string, number>>;
  readonly missesByBucket: Readonly<Record<string, number>>;
  readonly writesByBucket: Readonly<Record<string, number>>;
}

export class CheckerExpressionTypeEvaluationCacheMarker {
  constructor(
    readonly entries: number,
    readonly hits: number,
    readonly misses: number,
    readonly writes: number,
    readonly entriesByBucket: Readonly<Record<string, number>>,
    readonly hitsByBucket: Readonly<Record<string, number>>,
    readonly missesByBucket: Readonly<Record<string, number>>,
    readonly writesByBucket: Readonly<Record<string, number>>,
  ) {}
}

/**
 * Hot cache for Aurelia-expression TypeChecker evaluations within one runtime-analysis pass.
 *
 * The evaluator supplies a key that combines the caller-owned semantic local key with the modeled BindingScope,
 * TemplateResourceScope, expression span/kind, runtime evaluation mode, and contextual type. Call sites should still
 * choose a meaningful local key for projection handles and cache bucketing, but correctness must not depend on every
 * caller remembering all scope dimensions.
 */
export class CheckerExpressionTypeEvaluationCache {
  private readonly evaluations = new Map<string, CheckerExpressionTypeEvaluation>();
  private hits = 0;
  private misses = 0;
  private writes = 0;
  private readonly hitsByBucket = new Map<string, number>();
  private readonly missesByBucket = new Map<string, number>();
  private readonly writesByBucket = new Map<string, number>();

  read(localKey: string): CheckerExpressionTypeEvaluation | null {
    return this.evaluations.get(localKey) ?? null;
  }

  write(
    localKey: string,
    evaluation: CheckerExpressionTypeEvaluation,
  ): CheckerExpressionTypeEvaluation {
    this.evaluations.set(localKey, evaluation);
    this.writes += 1;
    incrementCacheBucket(this.writesByBucket, cacheKeyBucket(localKey));
    return evaluation;
  }

  readOrEvaluate(
    localKey: string,
    evaluate: () => CheckerExpressionTypeEvaluation,
  ): CheckerExpressionTypeEvaluation {
    const existing = this.read(localKey);
    if (existing != null) {
      this.hits += 1;
      incrementCacheBucket(this.hitsByBucket, cacheKeyBucket(localKey));
      return existing;
    }
    this.misses += 1;
    incrementCacheBucket(this.missesByBucket, cacheKeyBucket(localKey));
    return this.write(localKey, evaluate());
  }

  snapshot(): CheckerExpressionTypeEvaluationCacheStats {
    return {
      entries: this.evaluations.size,
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      entriesByBucket: cacheEntriesByBucket(this.evaluations.keys()),
      hitsByBucket: cacheBucketSnapshot(this.hitsByBucket),
      missesByBucket: cacheBucketSnapshot(this.missesByBucket),
      writesByBucket: cacheBucketSnapshot(this.writesByBucket),
    };
  }

  mark(): CheckerExpressionTypeEvaluationCacheMarker {
    const snapshot = this.snapshot();
    return new CheckerExpressionTypeEvaluationCacheMarker(
      snapshot.entries,
      snapshot.hits,
      snapshot.misses,
      snapshot.writes,
      snapshot.entriesByBucket,
      snapshot.hitsByBucket,
      snapshot.missesByBucket,
      snapshot.writesByBucket,
    );
  }

  snapshotSince(marker: CheckerExpressionTypeEvaluationCacheMarker): CheckerExpressionTypeEvaluationCacheStats {
    const snapshot = this.snapshot();
    return {
      entries: Math.max(0, snapshot.entries - marker.entries),
      hits: Math.max(0, snapshot.hits - marker.hits),
      misses: Math.max(0, snapshot.misses - marker.misses),
      writes: Math.max(0, snapshot.writes - marker.writes),
      entriesByBucket: subtractCacheBucketSnapshot(snapshot.entriesByBucket, marker.entriesByBucket),
      hitsByBucket: subtractCacheBucketSnapshot(snapshot.hitsByBucket, marker.hitsByBucket),
      missesByBucket: subtractCacheBucketSnapshot(snapshot.missesByBucket, marker.missesByBucket),
      writesByBucket: subtractCacheBucketSnapshot(snapshot.writesByBucket, marker.writesByBucket),
    };
  }
}

function cacheKeyBucket(localKey: string): string {
  const contextual = localKey.includes(':contextual:') ? ':contextual' : '';
  if (localKey.includes(':owner:')) {
    return `member-owner${contextual}`;
  }
  if (localKey.includes(':iterator-')) {
    return `iterator${contextual}`;
  }
  if (localKey.includes(':scope:template-controller:')) {
    return `template-controller${contextual}`;
  }
  if (localKey.startsWith('let:')) {
    return `let${contextual}`;
  }
  if (localKey.startsWith('checker-expression-type:')) {
    return `binding-expression${contextual}`;
  }
  return `other${contextual}`;
}

function cacheEntriesByBucket(keys: Iterable<string>): Readonly<Record<string, number>> {
  const buckets = new Map<string, number>();
  for (const key of keys) {
    incrementCacheBucket(buckets, cacheKeyBucket(key));
  }
  return cacheBucketSnapshot(buckets);
}

function incrementCacheBucket(buckets: Map<string, number>, bucket: string): void {
  buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
}

function cacheBucketSnapshot(buckets: ReadonlyMap<string, number>): Readonly<Record<string, number>> {
  return Object.fromEntries([...buckets.entries()].sort((left, right) =>
    right[1] - left[1] || left[0].localeCompare(right[0])
  ));
}

function subtractCacheBucketSnapshot(
  snapshot: Readonly<Record<string, number>>,
  marker: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const buckets = new Map<string, number>();
  for (const key of new Set([...Object.keys(snapshot), ...Object.keys(marker)])) {
    const value = (snapshot[key] ?? 0) - (marker[key] ?? 0);
    if (value > 0) {
      buckets.set(key, value);
    }
  }
  return cacheBucketSnapshot(buckets);
}
