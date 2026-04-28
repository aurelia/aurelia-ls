import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import type { ResourceTargetReference } from './resource-reference.js';

export const enum WatchFlushMode {
  Async = 'async',
  Sync = 'sync',
}

export const enum WatchExpressionKind {
  PropertyKey = 'property-key',
  DependencyCollectionFunction = 'dependency-collection-function',
  Open = 'open',
}

export const enum WatchCallbackKind {
  MethodName = 'method-name',
  Function = 'function',
  Open = 'open',
}

export const enum WatchPropertyKeyKind {
  String = 'string',
  Number = 'number',
  Symbol = 'symbol',
  Open = 'open',
}

export type WatchDefinitionField =
  | 'expression'
  | 'callback'
  | 'flush';

export class WatchPropertyKeyDefinition {
  constructor(
    readonly kind: WatchPropertyKeyKind,
    readonly text: string | null,
    readonly number: number | null = null,
    readonly target: ResourceTargetReference | null = null,
  ) {}
}

export class WatchExpressionDefinition {
  constructor(
    readonly kind: WatchExpressionKind,
    readonly propertyKey: WatchPropertyKeyDefinition | null,
    readonly target: ResourceTargetReference | null = null,
  ) {}
}

export class WatchCallbackDefinition {
  constructor(
    readonly kind: WatchCallbackKind,
    readonly methodName: WatchPropertyKeyDefinition | null,
    readonly target: ResourceTargetReference | null = null,
  ) {}
}

@auLink('runtime-html:WatchDefinition')
export class WatchDefinition {
  constructor(
    readonly expression: WatchExpressionDefinition,
    readonly callback: WatchCallbackDefinition,
    readonly flush: WatchFlushMode,
    readonly fieldProvenance: readonly FieldProvenance<WatchDefinitionField>[] = [],
  ) {}
}

export const enum WatchContributionKind {
  Decorator = 'decorator',
  StaticWatches = 'static-watches',
  InheritedMetadata = 'inherited-metadata',
}

export class WatchDefinitionContribution {
  constructor(
    readonly contributionKind: WatchContributionKind,
    readonly expression: WatchExpressionDefinition | null,
    readonly callback: WatchCallbackDefinition | null,
    readonly flush: WatchFlushMode | null,
    readonly fieldProvenance: readonly FieldProvenance<WatchDefinitionField>[] = [],
  ) {}
}
