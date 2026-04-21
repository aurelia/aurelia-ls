import type { SourceNodeRef } from '../refs.js';

export const CHILDREN_DECLARATION_ORIGIN_KINDS = [
  'field-decorator',
] as const;

export type ChildrenDeclarationOriginKind =
  typeof CHILDREN_DECLARATION_ORIGIN_KINDS[number];

export const CHILDREN_QUERY_KINDS = [
  'default-elements',
  'selector-string',
  'all-nodes',
  'open',
] as const;

export type ChildrenQueryKind =
  typeof CHILDREN_QUERY_KINDS[number];

export const CHILDREN_CALLBACK_TARGET_KINDS = [
  'default-name',
  'named-method',
  'property-key-reference',
  'open',
] as const;

export type ChildrenCallbackTargetKind =
  typeof CHILDREN_CALLBACK_TARGET_KINDS[number];

export const CHILDREN_TRANSFORM_KINDS = [
  'none',
  'inline-function',
  'function-reference',
  'open',
] as const;

export type ChildrenTransformKind =
  typeof CHILDREN_TRANSFORM_KINDS[number];

export class ChildrenQueryPlan {
  constructor(
    readonly kind: ChildrenQueryKind,
    readonly source: SourceNodeRef | null,
    readonly selectorText: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class ChildrenCallbackTarget {
  constructor(
    readonly kind: ChildrenCallbackTargetKind,
    readonly source: SourceNodeRef | null,
    readonly name: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class ChildrenTransformPlan {
  constructor(
    readonly role: 'filter' | 'map',
    readonly kind: ChildrenTransformKind,
    readonly source: SourceNodeRef | null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class ChildrenDeclaration {
  constructor(
    readonly origin: ChildrenDeclarationOriginKind,
    readonly source: SourceNodeRef | null,
    readonly propertyName: string | null,
    readonly propertySource: SourceNodeRef | null,
    readonly query: ChildrenQueryPlan,
    readonly callback: ChildrenCallbackTarget,
    readonly filter: ChildrenTransformPlan,
    readonly map: ChildrenTransformPlan,
    readonly note: string | null = null,
  ) {}
}

// NOTE: runtime @children does not surface a declarative definition row. It
// mutates decorator metadata by pushing a ChildrenLifecycleHooks dependency and
// later materializes ChildrenBinding during hydrating. The clean-room keeps a
// declaration-local surface instead so edits to selector/callback/filter/map
// remain traceable without reproducing runtime metadata mutation.
//
// NOTE: this remains declaration-local. Missing children declarations do not
// yet prove runtime absence across inheritance or later decorator indirection.
export class ChildrenSurface {
  constructor(
    readonly declarations: readonly ChildrenDeclaration[] = [],
    readonly note: string | null = null,
  ) {}

  readByPropertyName(
    propertyName: string,
  ): readonly ChildrenDeclaration[] {
    return this.declarations.filter((current) => current.propertyName === propertyName);
  }
}
