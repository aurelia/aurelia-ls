import { OpenSeamEvidence } from '../provenance/evidence.js';
import type { ContainerWorldRef, KeyRef, SourceNodeRef } from '../refs.js';
import type { LookupModifierKind } from '../di/lookup-modifier.js';
import { ContainerStateEntry } from './container-state-entry.js';
import { LookupRequest } from './lookup-request.js';

export const CONTAINER_STATE_LOOKUP_STATUS_KINDS = [
  'hit',
  'miss',
  'open',
] as const;

export type ContainerStateLookupStatusKind =
  typeof CONTAINER_STATE_LOOKUP_STATUS_KINDS[number];

export const CONTAINER_STATE_LOOKUP_OPEN_SEAM_KINDS = [
  'unsupported-regime',
  'unsupported-modifier',
  'missing-key',
  'missing-scope-world',
] as const;

export type ContainerStateLookupOpenSeamKind =
  typeof CONTAINER_STATE_LOOKUP_OPEN_SEAM_KINDS[number];

export class ContainerStateLookupOpenSeam {
  readonly evidence: OpenSeamEvidence<ContainerStateLookupOpenSeamKind>;

  constructor(
    readonly kind: ContainerStateLookupOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly note: string,
  ) {
    this.evidence = OpenSeamEvidence.fromSourceNode(kind, source, null, note);
  }
}

export class ContainerStateLookupScope {
  constructor(
    readonly id: string,
    readonly world: ContainerWorldRef | null,
    readonly entries: readonly ContainerStateEntry[] = [],
    readonly parent: ContainerStateLookupScope | null = null,
    readonly note: string | null = null,
  ) {}

  get root(): ContainerStateLookupScope {
    return this.parent?.root ?? this;
  }

  createChild(
    id: string,
    world: ContainerWorldRef | null,
    entries: readonly ContainerStateEntry[] = [],
    note: string | null = null,
  ): ContainerStateLookupScope {
    return new ContainerStateLookupScope(id, world, entries, this, note);
  }
}

export class ContainerStateLookupResult {
  constructor(
    readonly status: ContainerStateLookupStatusKind,
    readonly request: LookupRequest | null,
    readonly selectedEntries: readonly ContainerStateEntry[] = [],
    readonly selectedSlots: readonly import('./container-state-slot.js').ContainerStateSlot[] = [],
    readonly openSeams: readonly ContainerStateLookupOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
export class ContainerStateLookupEvaluator {
  lookup(
    scope: ContainerStateLookupScope,
    request: LookupRequest,
  ): ContainerStateLookupResult {
    // TODO: this first evaluator closes only slot-selection semantics over
    // materialized keyed state. It does not yet execute provider behavior
    // (throwing/null/default/callback activation), and it does not yet build the
    // full scope chain automatically from CE/CA/TC/AppRoot runtime-shaped shells.
    const unsupportedModifiers = request.modifiers.filter((current) =>
      current !== 'optional' && current !== 'all' && current !== 'own'
    );
    if (unsupportedModifiers.length > 0) {
      return new ContainerStateLookupResult(
        'open',
        request,
        [],
        [],
        unsupportedModifiers.map((current) =>
          new ContainerStateLookupOpenSeam(
            'unsupported-modifier',
            null,
            `Lookup modifier ${current} still needs a later evaluator slice over materialized container state.`,
          )),
        'Lookup stayed open because one or more request modifiers do not yet have materialized-state evaluator support.',
      );
    }

    const regime = request.resourceRegime?.kind;
    if (regime != null) {
      return this.lookupByResourceRegime(scope, request, regime);
    }

    const ownRequested = request.regime === 'own' || request.modifiers.includes('own');

    switch (request.regime) {
      case 'direct':
        return this.lookupDirect(scope, request, ownRequested ? false : request.includeAncestors);
      case 'own':
        return this.lookupDirect(scope, request, false);
      case 'ancestor':
        return this.lookupAncestor(scope, request);
      default:
        return new ContainerStateLookupResult(
          'open',
          request,
          [],
          [],
          [
            new ContainerStateLookupOpenSeam(
              'unsupported-regime',
              null,
              `Lookup regime ${request.regime} still needs a later evaluator slice over materialized container state.`,
            ),
          ],
          'Lookup stayed open because the requested regime is not yet evaluated over materialized container state.',
        );
    }
  }

  private lookupDirect(
    scope: ContainerStateLookupScope,
    request: LookupRequest,
    includeAncestors: boolean,
  ): ContainerStateLookupResult {
    const matchingScopes = collectMatchingScopes(scope, request.key, includeAncestors);
    if (matchingScopes.length === 0) {
      return new ContainerStateLookupResult(
        hasOptionalModifier(request.modifiers) ? 'miss' : 'miss',
        request,
        [],
        [],
        [],
        'No keyed container-state entry matched this lookup request in the current scope chain.',
      );
    }

    if (hasAllModifier(request.modifiers)) {
      const entries = matchingScopes.flatMap((current) => current.entries);
      const slots = entries.flatMap((current) => current.slots);
      return new ContainerStateLookupResult(
        'hit',
        request,
        entries,
        slots,
        [],
        includeAncestors
          ? 'Lookup aggregated slots across the current scope chain.'
          : 'Lookup aggregated slots from the current scope only.',
      );
    }

    const selected = matchingScopes[0] ?? null;
    const entry = selected?.entries.at(-1) ?? null;
    const slot = entry?.slots.at(-1) ?? null;
    return new ContainerStateLookupResult(
      entry == null || slot == null ? 'miss' : 'hit',
      request,
      entry == null ? [] : [entry],
      slot == null ? [] : [slot],
      [],
      includeAncestors
        ? 'Lookup selected the nearest matching keyed state in the scope chain.'
        : 'Lookup selected keyed state from the current scope only.',
    );
  }

  private lookupAncestor(
    scope: ContainerStateLookupScope,
    request: LookupRequest,
  ): ContainerStateLookupResult {
    const parent = scope.parent;
    if (parent == null) {
      return new ContainerStateLookupResult(
        'miss',
        request,
        [],
        [],
        [],
        'Ancestor lookup missed because there is no parent scope.',
      );
    }
    return this.lookupDirect(parent, request, true);
  }

  private lookupByResourceRegime(
    scope: ContainerStateLookupScope,
    request: LookupRequest,
    regime: import('./resource-lookup-regime.js').ResourceLookupRegimeKind,
  ): ContainerStateLookupResult {
    const ownEntries = findOwnEntries(scope, request.key);
    const rootEntries = scope.root === scope
      ? ownEntries
      : findOwnEntries(scope.root, request.key);

    switch (regime) {
      case 'resource':
      case 'optional-resource': {
        const preferred = ownEntries.length > 0 ? ownEntries : rootEntries;
        const entry = preferred.at(-1) ?? null;
        const slot = entry?.slots.at(-1) ?? null;
        return new ContainerStateLookupResult(
          entry == null || slot == null ? 'miss' : 'hit',
          request,
          entry == null ? [] : [entry],
          slot == null ? [] : [slot],
          [],
          ownEntries.length > 0
            ? 'Resource lookup selected the current scope entry before considering the root scope.'
            : 'Resource lookup fell back to the root scope entry.',
        );
      }
      case 'all-resources': {
        const entries = [
          ...ownEntries,
          ...(scope.root === scope ? [] : rootEntries),
        ];
        const slots = entries.flatMap((current) => current.slots);
        return new ContainerStateLookupResult(
          entries.length === 0 ? 'miss' : 'hit',
          request,
          entries,
          slots,
          [],
          'All-resources lookup aggregated matching entries from the current scope and the root scope.',
        );
      }
      default:
        return new ContainerStateLookupResult(
          'open',
          request,
          [],
          [],
          [
            new ContainerStateLookupOpenSeam(
              'unsupported-regime',
              null,
              `Resource lookup regime ${regime} still needs a later evaluator slice over materialized container state.`,
            ),
          ],
          'Lookup stayed open because the requested resource lookup regime is not yet supported.',
        );
    }
  }
}

function collectMatchingScopes(
  scope: ContainerStateLookupScope,
  key: KeyRef,
  includeAncestors: boolean,
): readonly { readonly scope: ContainerStateLookupScope; readonly entries: readonly ContainerStateEntry[] }[] {
  const matches: { scope: ContainerStateLookupScope; entries: readonly ContainerStateEntry[] }[] = [];
  let current: ContainerStateLookupScope | null = scope;
  let first = true;
  while (current != null) {
    if (first || includeAncestors) {
      const entries = findOwnEntries(current, key);
      if (entries.length > 0) {
        matches.push({ scope: current, entries });
      }
    }
    if (!includeAncestors) {
      break;
    }
    first = false;
    current = current.parent;
  }
  return matches;
}

function findOwnEntries(
  scope: ContainerStateLookupScope,
  key: KeyRef,
): readonly ContainerStateEntry[] {
  return scope.entries.filter((current) => current.key.id === key.id);
}

function hasAllModifier(
  modifiers: readonly LookupModifierKind[],
): boolean {
  return modifiers.includes('all');
}

function hasOptionalModifier(
  modifiers: readonly LookupModifierKind[],
): boolean {
  return modifiers.includes('optional');
}
