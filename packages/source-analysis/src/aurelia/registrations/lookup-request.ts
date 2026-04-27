import type { KeyRef } from '../refs.js';
import type { LookupModifierKind } from '../di/lookup-modifier.js';
import type { LookupRegimeKind } from './container-state-qualification.js';
import type { ResourceLookupRegime } from './resource-lookup-regime.js';

export type LookupRequestRegimeKind =
  Exclude<LookupRegimeKind, 'resource'>;

export class LookupRequest {
  constructor(
    readonly id: string,
    readonly key: KeyRef,
    readonly regime: LookupRequestRegimeKind,
    readonly modifiers: readonly LookupModifierKind[] = [],
    readonly resourceRegime: ResourceLookupRegime | null = null,
    readonly includeAncestors: boolean = true,
  ) {}
}
