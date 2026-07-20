import type ts from 'typescript';

import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationKeyedCollectionEntryState,
  EvaluationKeyedCollectionShape,
  EvaluationMapEntry,
  EvaluationSameValueZeroDecisionKind,
  EvaluationSetElement,
  EvaluationUndefined,
  canonicalEvaluationKeyedCollectionKey,
  evaluationSameValueZeroDecision,
  type EvaluationMapValue,
  type EvaluationSetValue,
  type EvaluationValue,
} from './values.js';
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
    if (decision === EvaluationSameValueZeroDecisionKind.Match) {
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
    if (decision === EvaluationSameValueZeroDecisionKind.Open) {
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
    if (decision === EvaluationSameValueZeroDecisionKind.Match) {
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
    if (decision === EvaluationSameValueZeroDecisionKind.Open) {
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
    receiver.elements.push(new EvaluationSetElement(canonical.value, expression));
    receiver.replaceShape(receiver.shape.withExactSizeDelta(1));
    return new EvaluationSetLookup(
      EvaluationKeyedCollectionLookupKind.Match,
      receiver.elements.at(-1) ?? null,
    );
  }

  const wasDefinitelyEmpty = receiver.exactSize === 0;
  const openSeams = collectionMutationOpenSeams(canonical.openSeams, lookup.openSeams);
  if (keyIsExact) {
    let presentElement: EvaluationSetElement;
    if (lookup.element != null) {
      const index = receiver.elements.indexOf(lookup.element);
      presentElement = lookup.element.withState(EvaluationKeyedCollectionEntryState.Present);
      receiver.elements[index] = presentElement;
    } else {
      presentElement = new EvaluationSetElement(canonical.value, expression);
      receiver.elements.push(presentElement);
    }
    receiver.replaceShape(receiver.shape.withOpenMembership(openSeams, null, false));
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
  receiver.elements.push(element);
  receiver.replaceShape(receiver.shape.withOpenMembership(
    openSeams,
    wasDefinitelyEmpty ? 1 : null,
    wasDefinitelyEmpty,
  ));
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
    lookup.entry!.replaceValue(valueEvidence.value, valueExpression, valueEvidence.openSeams);
    return lookup;
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
    receiver.entries.push(entry);
    receiver.replaceShape(receiver.shape.withExactSizeDelta(1));
    return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Match, entry);
  }

  const wasDefinitelyEmpty = receiver.exactSize === 0;
  const openSeams = collectionMutationOpenSeams(canonicalKey.openSeams, lookup.openSeams);
  if (keyIsExact) {
    if (lookup.entry != null) {
      lookup.entry.replaceValue(valueEvidence.value, valueExpression, valueEvidence.openSeams);
    } else {
      receiver.entries.push(new EvaluationMapEntry(
        canonicalKey.value,
        valueEvidence.value,
        keyExpression,
        valueExpression,
        [],
        valueEvidence.openSeams,
      ));
    }
    receiver.replaceShape(receiver.shape.withOpenMembership(openSeams, null, false));
    return new EvaluationMapLookup(
      EvaluationKeyedCollectionLookupKind.Match,
      lookup.entry ?? receiver.entries.at(-1) ?? null,
    );
  }
  if (!wasDefinitelyEmpty) {
    for (const entry of receiver.entries) {
      if (entry.state === EvaluationKeyedCollectionEntryState.Present) {
        entry.retainValueOpenSeams(openSeams);
      }
    }
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
  receiver.entries.push(entry);
  receiver.replaceShape(receiver.shape.withOpenMembership(
    openSeams,
    wasDefinitelyEmpty ? 1 : null,
    wasDefinitelyEmpty,
  ));
  return new EvaluationMapLookup(EvaluationKeyedCollectionLookupKind.Open, entry, openSeams);
}

export function deleteEvaluationSetElement(
  receiver: EvaluationSetValue,
  key: EvaluationValueEvidence,
  expression: ts.Expression | null,
): EvaluationSetLookup {
  const lookup = evaluationSetLookup(receiver, key);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    const index = receiver.elements.indexOf(lookup.element!);
    receiver.elements[index] = lookup.element!.withState(EvaluationKeyedCollectionEntryState.Deleted);
    receiver.elements.push(new EvaluationSetElement(
      canonicalEvaluationKeyedCollectionKey(key.value),
      expression,
      key.openSeams,
      EvaluationKeyedCollectionEntryState.Deleted,
    ));
    receiver.replaceShape(receiver.shape.withExactSizeDelta(-1));
    return lookup;
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Open) {
    const openSeams = collectionMutationOpenSeams(key.openSeams, lookup.openSeams);
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index]!;
      if (element.state !== EvaluationKeyedCollectionEntryState.Deleted) {
        receiver.elements[index] = element.withState(EvaluationKeyedCollectionEntryState.Conditional, openSeams);
      }
    }
    receiver.replaceShape(receiver.shape.withOpenMembership(
      openSeams,
      receiver.exactSize === 0 ? 0 : null,
      false,
    ));
    if (key.openSeams.length === 0 && canDriveKeyedCollectionIdentity(key.value)) {
      receiver.elements.push(new EvaluationSetElement(
        canonicalEvaluationKeyedCollectionKey(key.value),
        expression,
        [],
        EvaluationKeyedCollectionEntryState.Deleted,
      ));
    }
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
    lookup.entry!.setState(EvaluationKeyedCollectionEntryState.Deleted);
    receiver.entries.push(new EvaluationMapEntry(
      canonicalEvaluationKeyedCollectionKey(key.value),
      EvaluationUndefined,
      expression,
      null,
      key.openSeams,
      [],
      EvaluationKeyedCollectionEntryState.Deleted,
    ));
    receiver.replaceShape(receiver.shape.withExactSizeDelta(-1));
    return lookup;
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Open) {
    const openSeams = collectionMutationOpenSeams(key.openSeams, lookup.openSeams);
    for (const entry of receiver.entries) {
      if (entry.state !== EvaluationKeyedCollectionEntryState.Deleted) {
        entry.setState(EvaluationKeyedCollectionEntryState.Conditional, openSeams);
      }
    }
    receiver.replaceShape(receiver.shape.withOpenMembership(
      openSeams,
      receiver.exactSize === 0 ? 0 : null,
      false,
    ));
    if (key.openSeams.length === 0 && canDriveKeyedCollectionIdentity(key.value)) {
      receiver.entries.push(new EvaluationMapEntry(
        canonicalEvaluationKeyedCollectionKey(key.value),
        EvaluationUndefined,
        expression,
        null,
        [],
        [],
        EvaluationKeyedCollectionEntryState.Deleted,
      ));
    }
  }
  return lookup;
}

export function clearEvaluationSet(receiver: EvaluationSetValue): void {
  for (let index = 0; index < receiver.elements.length; index += 1) {
    receiver.elements[index] = receiver.elements[index]!.withState(EvaluationKeyedCollectionEntryState.Deleted);
  }
  receiver.replaceShape(EvaluationKeyedCollectionShape.exact(0));
}

export function clearEvaluationMap(receiver: EvaluationMapValue): void {
  for (const entry of receiver.entries) {
    entry.setState(EvaluationKeyedCollectionEntryState.Deleted);
  }
  receiver.replaceShape(EvaluationKeyedCollectionShape.exact(0));
}

export function canDriveKeyedCollectionIdentity(value: EvaluationValue): boolean {
  return evaluationSameValueZeroDecision(value, value) !== EvaluationSameValueZeroDecisionKind.Open;
}

function collectionMutationOpenSeams(
  primary: readonly EvaluationOpenSeam[],
  fallback: readonly EvaluationOpenSeam[],
): readonly EvaluationOpenSeam[] {
  return compactEvaluationOpenSeams(primary.length > 0 ? primary : fallback);
}
