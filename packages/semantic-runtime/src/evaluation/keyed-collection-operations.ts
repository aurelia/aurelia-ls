import type ts from 'typescript';

import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationKeyedCollectionEntryState,
  EvaluationKeyedCollectionShape,
  EvaluationMapEntry,
  EvaluationSetElement,
  EvaluationUndefined,
  canonicalEvaluationKeyedCollectionKey,
  type EvaluationMapValue,
  type EvaluationSetValue,
  type EvaluationValue,
} from './values.js';
import {
  EvaluationValueRelationKind,
  evaluationSameValueZeroDecision,
} from './value-relation.js';
import { EvaluationValueEvidence } from './value-pressure.js';

export const enum EvaluationKeyedCollectionLookupKind {
  /** One definitely active entry has the requested key. */
  Match = 'match',
  /** Closed membership proves that no active entry has the requested key. */
  Miss = 'miss',
  /** Key pressure or open collection membership prevents an honest decision. */
  Open = 'open',
}

export class EvaluationSetLookup {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly kind: EvaluationKeyedCollectionLookupKind,
    readonly element: EvaluationSetElement | null = null,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export class EvaluationMapLookup {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly kind: EvaluationKeyedCollectionLookupKind,
    readonly entry: EvaluationMapEntry | null = null,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export function evaluationSetLookup(
  receiver: EvaluationSetValue,
  key: EvaluationValueEvidence,
): EvaluationSetLookup {
  if (
    receiver.exactSize === 0
    && receiver.shape.hasExactMembership
    && key.openSeams.length === 0
  ) {
    return new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Miss);
  }
  if (key.openSeams.length > 0 || !canDriveKeyedCollectionIdentity(key.value)) {
    return new EvaluationSetLookup(
      EvaluationKeyedCollectionLookupKind.Open,
      null,
      [...key.openSeams, ...receiver.shape.membershipOpenSeams],
    );
  }
  const openSeams: EvaluationOpenSeam[] = [];
  for (let index = receiver.elements.length - 1; index >= 0; index -= 1) {
    const element = receiver.elements[index]!;
    if (element.openSeams.length > 0 || !canDriveKeyedCollectionIdentity(element.value)) {
      if (element.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      openSeams.push(...element.openSeams, ...element.presenceOpenSeams);
      continue;
    }
    const decision = evaluationSameValueZeroDecision(element.value, key.value);
    if (decision === EvaluationValueRelationKind.Match) {
      if (element.state === EvaluationKeyedCollectionEntryState.Deleted) {
        return openSeams.length === 0
          ? new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Miss, element)
          : new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Open, element, openSeams);
      }
      return element.state === EvaluationKeyedCollectionEntryState.Present
        ? new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Match, element)
        : new EvaluationSetLookup(
            EvaluationKeyedCollectionLookupKind.Open,
            element,
            element.presenceOpenSeams,
          );
    }
    if (decision === EvaluationValueRelationKind.Open) {
      openSeams.push(...element.openSeams, ...element.presenceOpenSeams);
    }
  }
  return receiver.shape.hasExactMembership && openSeams.length === 0
    ? new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Miss)
    : new EvaluationSetLookup(
        EvaluationKeyedCollectionLookupKind.Open,
        null,
        [...openSeams, ...receiver.shape.membershipOpenSeams],
      );
}

export function evaluationMapLookup(
  receiver: EvaluationMapValue,
  key: EvaluationValueEvidence,
): EvaluationMapLookup {
  if (
    receiver.exactSize === 0
    && receiver.shape.hasExactMembership
    && key.openSeams.length === 0
  ) {
    return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Miss);
  }
  if (key.openSeams.length > 0 || !canDriveKeyedCollectionIdentity(key.value)) {
    return new EvaluationMapLookup(
      EvaluationKeyedCollectionLookupKind.Open,
      null,
      [...key.openSeams, ...receiver.shape.membershipOpenSeams],
    );
  }
  const openSeams: EvaluationOpenSeam[] = [];
  for (let index = receiver.entries.length - 1; index >= 0; index -= 1) {
    const entry = receiver.entries[index]!;
    if (entry.keyOpenSeams.length > 0 || !canDriveKeyedCollectionIdentity(entry.key)) {
      if (entry.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      openSeams.push(...entry.keyOpenSeams, ...entry.presenceOpenSeams);
      continue;
    }
    const decision = evaluationSameValueZeroDecision(entry.key, key.value);
    if (decision === EvaluationValueRelationKind.Match) {
      if (entry.state === EvaluationKeyedCollectionEntryState.Deleted) {
        return openSeams.length === 0
          ? new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Miss, entry)
          : new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Open, entry, openSeams);
      }
      return entry.state === EvaluationKeyedCollectionEntryState.Present
        ? new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Match, entry)
        : new EvaluationMapLookup(
            EvaluationKeyedCollectionLookupKind.Open,
            entry,
            entry.presenceOpenSeams,
          );
    }
    if (decision === EvaluationValueRelationKind.Open) {
      openSeams.push(...entry.keyOpenSeams, ...entry.presenceOpenSeams);
    }
  }
  return receiver.shape.hasExactMembership && openSeams.length === 0
    ? new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Miss)
    : new EvaluationMapLookup(
        EvaluationKeyedCollectionLookupKind.Open,
        null,
        [...openSeams, ...receiver.shape.membershipOpenSeams],
      );
}

export function addEvaluationSetElement(
  receiver: EvaluationSetValue,
  evidence: EvaluationValueEvidence,
  expression: ts.Expression | null,
): EvaluationSetLookup {
  const canonical = new EvaluationValueEvidence(
    canonicalEvaluationKeyedCollectionKey(evidence.value),
    evidence.openSeams,
  );
  const keyIsExact = canonical.openSeams.length === 0
    && canDriveKeyedCollectionIdentity(canonical.value);
  const lookup = evaluationSetLookup(receiver, canonical);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    return lookup;
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Miss && keyIsExact) {
    const element = new EvaluationSetElement(canonical.value, expression);
    receiver.replaceElements(
      [...receiver.elements, element],
      receiver.shape.withExactSizeDelta(1),
    );
    return new EvaluationSetLookup(
      EvaluationKeyedCollectionLookupKind.Match,
      element,
    );
  }

  const wasDefinitelyEmpty = receiver.exactSize === 0;
  const openSeams = collectionMutationOpenSeams(canonical.openSeams, lookup.openSeams);
  if (keyIsExact) {
    const elements = [...receiver.elements];
    let presentElement: EvaluationSetElement;
    if (lookup.element != null) {
      const index = elements.indexOf(lookup.element);
      presentElement = lookup.element.withState(EvaluationKeyedCollectionEntryState.Present);
      elements[index] = presentElement;
    } else {
      presentElement = new EvaluationSetElement(canonical.value, expression);
      elements.push(presentElement);
    }
    receiver.replaceElements(elements, receiver.shape.withOpenMembership(openSeams, null, false));
    return new EvaluationSetLookup(
      EvaluationKeyedCollectionLookupKind.Match,
      presentElement,
    );
  }
  const element = new EvaluationSetElement(
    canonical.value,
    expression,
    openSeams,
    wasDefinitelyEmpty
      ? EvaluationKeyedCollectionEntryState.Present
      : EvaluationKeyedCollectionEntryState.Conditional,
    wasDefinitelyEmpty ? [] : openSeams,
  );
  receiver.replaceElements(
    [...receiver.elements, element],
    receiver.shape.withOpenMembership(
      openSeams,
      wasDefinitelyEmpty ? 1 : null,
      wasDefinitelyEmpty,
    ),
  );
  return new EvaluationSetLookup(EvaluationKeyedCollectionLookupKind.Open, element, openSeams);
}

export function setEvaluationMapEntry(
  receiver: EvaluationMapValue,
  keyEvidence: EvaluationValueEvidence,
  valueEvidence: EvaluationValueEvidence,
  keyExpression: ts.Expression | null,
  valueExpression: ts.Expression | null,
): EvaluationMapLookup {
  const canonicalKey = new EvaluationValueEvidence(
    canonicalEvaluationKeyedCollectionKey(keyEvidence.value),
    keyEvidence.openSeams,
  );
  const keyIsExact = canonicalKey.openSeams.length === 0
    && canDriveKeyedCollectionIdentity(canonicalKey.value);
  const lookup = evaluationMapLookup(receiver, canonicalKey);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    const index = receiver.entries.indexOf(lookup.entry!);
    const entry = lookup.entry!.withValue(valueEvidence.value, valueExpression, valueEvidence.openSeams);
    const entries = [...receiver.entries];
    entries[index] = entry;
    receiver.replaceEntries(entries);
    return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Match, entry);
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Miss && keyIsExact) {
    const entry = new EvaluationMapEntry(
      canonicalKey.value,
      valueEvidence.value,
      keyExpression,
      valueExpression,
      [],
      valueEvidence.openSeams,
    );
    receiver.replaceEntries(
      [...receiver.entries, entry],
      receiver.shape.withExactSizeDelta(1),
    );
    return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Match, entry);
  }

  const wasDefinitelyEmpty = receiver.exactSize === 0;
  const openSeams = collectionMutationOpenSeams(canonicalKey.openSeams, lookup.openSeams);
  if (keyIsExact) {
    const entries = [...receiver.entries];
    let entry: EvaluationMapEntry;
    if (lookup.entry != null) {
      const index = entries.indexOf(lookup.entry);
      entry = lookup.entry.withValue(valueEvidence.value, valueExpression, valueEvidence.openSeams);
      entries[index] = entry;
    } else {
      entry = new EvaluationMapEntry(
        canonicalKey.value,
        valueEvidence.value,
        keyExpression,
        valueExpression,
        [],
        valueEvidence.openSeams,
      );
      entries.push(entry);
    }
    receiver.replaceEntries(entries, receiver.shape.withOpenMembership(openSeams, null, false));
    return new EvaluationMapLookup(
      EvaluationKeyedCollectionLookupKind.Match,
      entry,
    );
  }
  let entries = receiver.entries;
  if (!wasDefinitelyEmpty) {
    entries = entries.map((entry) => entry.state === EvaluationKeyedCollectionEntryState.Present
      ? entry.withValueOpenSeams(openSeams)
      : entry);
  }
  const entry = new EvaluationMapEntry(
    canonicalKey.value,
    valueEvidence.value,
    keyExpression,
    valueExpression,
    openSeams,
    valueEvidence.openSeams,
    wasDefinitelyEmpty
      ? EvaluationKeyedCollectionEntryState.Present
      : EvaluationKeyedCollectionEntryState.Conditional,
    wasDefinitelyEmpty ? [] : openSeams,
  );
  receiver.replaceEntries(
    [...entries, entry],
    receiver.shape.withOpenMembership(
      openSeams,
      wasDefinitelyEmpty ? 1 : null,
      wasDefinitelyEmpty,
    ),
  );
  return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Open, entry, openSeams);
}

export function deleteEvaluationSetElement(
  receiver: EvaluationSetValue,
  key: EvaluationValueEvidence,
  expression: ts.Expression | null,
): EvaluationSetLookup {
  const lookup = evaluationSetLookup(receiver, key);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    const elements = [...receiver.elements];
    const index = elements.indexOf(lookup.element!);
    elements[index] = lookup.element!.withState(EvaluationKeyedCollectionEntryState.Deleted);
    elements.push(new EvaluationSetElement(
      canonicalEvaluationKeyedCollectionKey(key.value),
      expression,
      key.openSeams,
      EvaluationKeyedCollectionEntryState.Deleted,
    ));
    receiver.replaceElements(elements, receiver.shape.withExactSizeDelta(-1));
    return lookup;
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Open) {
    const openSeams = collectionMutationOpenSeams(key.openSeams, lookup.openSeams);
    const elements = receiver.elements.map((element) =>
      element.state === EvaluationKeyedCollectionEntryState.Deleted
        ? element
        : element.withState(EvaluationKeyedCollectionEntryState.Conditional, openSeams)
    );
    if (key.openSeams.length === 0 && canDriveKeyedCollectionIdentity(key.value)) {
      elements.push(new EvaluationSetElement(
        canonicalEvaluationKeyedCollectionKey(key.value),
        expression,
        [],
        EvaluationKeyedCollectionEntryState.Deleted,
      ));
    }
    receiver.replaceElements(elements, receiver.shape.withOpenMembership(
      openSeams,
      receiver.exactSize === 0 ? 0 : null,
      false,
    ));
  }
  return lookup;
}

export function deleteEvaluationMapEntry(
  receiver: EvaluationMapValue,
  key: EvaluationValueEvidence,
  expression: ts.Expression | null,
): EvaluationMapLookup {
  const lookup = evaluationMapLookup(receiver, key);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    const entries = [...receiver.entries];
    const index = entries.indexOf(lookup.entry!);
    entries[index] = lookup.entry!.withState(EvaluationKeyedCollectionEntryState.Deleted);
    entries.push(new EvaluationMapEntry(
      canonicalEvaluationKeyedCollectionKey(key.value),
      EvaluationUndefined,
      expression,
      null,
      key.openSeams,
      [],
      EvaluationKeyedCollectionEntryState.Deleted,
    ));
    receiver.replaceEntries(entries, receiver.shape.withExactSizeDelta(-1));
    return lookup;
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Open) {
    const openSeams = collectionMutationOpenSeams(key.openSeams, lookup.openSeams);
    const entries = receiver.entries.map((entry) =>
      entry.state === EvaluationKeyedCollectionEntryState.Deleted
        ? entry
        : entry.withState(EvaluationKeyedCollectionEntryState.Conditional, openSeams)
    );
    if (key.openSeams.length === 0 && canDriveKeyedCollectionIdentity(key.value)) {
      entries.push(new EvaluationMapEntry(
        canonicalEvaluationKeyedCollectionKey(key.value),
        EvaluationUndefined,
        expression,
        null,
        [],
        [],
        EvaluationKeyedCollectionEntryState.Deleted,
      ));
    }
    receiver.replaceEntries(entries, receiver.shape.withOpenMembership(
      openSeams,
      receiver.exactSize === 0 ? 0 : null,
      false,
    ));
  }
  return lookup;
}

export function clearEvaluationSet(receiver: EvaluationSetValue): void {
  receiver.replaceElements(
    receiver.elements.map((element) => element.withState(EvaluationKeyedCollectionEntryState.Deleted)),
    EvaluationKeyedCollectionShape.exact(0),
  );
}

export function clearEvaluationMap(receiver: EvaluationMapValue): void {
  receiver.replaceEntries(
    receiver.entries.map((entry) => entry.withState(EvaluationKeyedCollectionEntryState.Deleted)),
    EvaluationKeyedCollectionShape.exact(0),
  );
}

export function canDriveKeyedCollectionIdentity(value: EvaluationValue): boolean {
  return evaluationSameValueZeroDecision(value, value) !== EvaluationValueRelationKind.Open;
}

function collectionMutationOpenSeams(
  primary: readonly EvaluationOpenSeam[],
  fallback: readonly EvaluationOpenSeam[],
): readonly EvaluationOpenSeam[] {
  return compactEvaluationOpenSeams(primary.length > 0 ? primary : fallback);
}
