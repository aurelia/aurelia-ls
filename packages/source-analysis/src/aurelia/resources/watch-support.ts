import type { SourceNodeRef } from '../refs.js';

export const WATCH_DECLARATION_ORIGIN_KINDS = [
  'class-decorator',
  'method-decorator',
] as const;

export type WatchDeclarationOriginKind =
  typeof WATCH_DECLARATION_ORIGIN_KINDS[number];

export const WATCH_EXPRESSION_KINDS = [
  'string-expression',
  'property-key-reference',
  'dependency-collector',
  'open',
] as const;

export type WatchExpressionKind =
  typeof WATCH_EXPRESSION_KINDS[number];

export const WATCH_CALLBACK_TARGET_KINDS = [
  'named-method',
  'decorated-method',
  'inline-callback',
  'open',
] as const;

export type WatchCallbackTargetKind =
  typeof WATCH_CALLBACK_TARGET_KINDS[number];

export const WATCH_FLUSH_KINDS = [
  'async',
  'sync',
] as const;

export type WatchFlushKind =
  typeof WATCH_FLUSH_KINDS[number];

export class WatchExpressionPlan {
  constructor(
    readonly kind: WatchExpressionKind,
    readonly source: SourceNodeRef | null,
    readonly text: string | null = null,
    readonly referenceName: string | null = null,
    readonly dependencyPath: readonly string[] = [],
    readonly usesWatcherParameter: boolean | null = null,
    readonly note: string | null = null,
  ) {}
}

export class WatchCallbackTarget {
  constructor(
    readonly kind: WatchCallbackTargetKind,
    readonly source: SourceNodeRef | null,
    readonly name: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class WatchDeclaration {
  constructor(
    readonly origin: WatchDeclarationOriginKind,
    readonly source: SourceNodeRef | null,
    readonly expression: WatchExpressionPlan,
    readonly callback: WatchCallbackTarget,
    readonly flush: WatchFlushKind = 'async',
    readonly note: string | null = null,
  ) {}
}

// NOTE: runtime watch registration mutates a weak-map registry and, in some
// decorator-order cases, patches CE/CA definitions after the fact. The
// clean-room keeps a direct declaration-local surface instead so author edits
// can be traced without reproducing runtime's ordering workaround.
//
// NOTE: this is also intentionally declaration-local. If later runtime study
// shows inherited watch definitions matter in practice, that should be modeled
// as a later aggregation layer rather than by hiding it inside this surface.
export class WatchSurface {
  constructor(
    readonly declarations: readonly WatchDeclaration[] = [],
    readonly note: string | null = null,
  ) {}

  readByCallbackName(
    name: string,
  ): readonly WatchDeclaration[] {
    return this.declarations.filter((current) => current.callback.name === name);
  }
}
