import {
  unwrapSourced,
  type BindableDef,
  type ResourceDef,
  type Sourced,
} from "../compiler.js";
import { stableStringify } from "../fingerprint/fingerprint.js";
import { canonicalSourceSortKey } from "./source-id.js";
import { sourcePriorityRank, type DefinitionSourceKind } from "./solver.js";

export interface ResourceDefinitionCandidate {
  readonly resource: ResourceDef;
  readonly sourceKind: DefinitionSourceKind;
  /**
   * Lower is stronger evidence.
   */
  readonly evidenceRank: number;
  readonly candidateId?: string;
}

export function sortResourceDefinitionCandidates(
  candidates: readonly ResourceDefinitionCandidate[],
): ResourceDefinitionCandidate[] {
  return [...candidates].sort(compareResourceDefinitionCandidates);
}

export function compareResourceDefinitionCandidates(
  left: ResourceDefinitionCandidate,
  right: ResourceDefinitionCandidate,
): number {
  const sourceDelta = sourcePriorityRank(left.sourceKind) - sourcePriorityRank(right.sourceKind);
  if (sourceDelta !== 0) return sourceDelta;

  const evidenceDelta = left.evidenceRank - right.evidenceRank;
  if (evidenceDelta !== 0) return evidenceDelta;

  const completenessDelta = resourceKnownFieldCount(right.resource) - resourceKnownFieldCount(left.resource);
  if (completenessDelta !== 0) return completenessDelta;

  const canonicalDelta = canonicalSourceSortKey(left).localeCompare(
    canonicalSourceSortKey(right),
  );
  if (canonicalDelta !== 0) return canonicalDelta;

  // Canonical source-id ties intentionally fall through to payload ordering.
  // This forbids arrival-order tie-breaks while still producing deterministic
  // order when one source identity yields multiple candidate payload variants.
  const payloadDelta = canonicalCandidatePayloadKey(left).localeCompare(canonicalCandidatePayloadKey(right));
  if (payloadDelta !== 0) return payloadDelta;

  return 0;
}

function resourceKnownFieldCount(resource: ResourceDef): number {
  let count = 0;
  count += knownSourcedScore(resource.className);
  count += knownSourcedScore(resource.name);

  switch (resource.kind) {
    case "custom-element":
      count += knownSourcedListScore(resource.aliases);
      count += knownSourcedScore(resource.containerless);
      count += knownSourcedScore(resource.shadowOptions);
      count += knownSourcedScore(resource.capture);
      count += knownSourcedScore(resource.processContent);
      count += knownSourcedScore(resource.boundary);
      count += knownSourcedListScore(resource.dependencies);
      if (resource.inlineTemplate) count += knownSourcedScore(resource.inlineTemplate);
      count += bindableMapKnownFieldCount(resource.bindables);
      return count;

    case "custom-attribute":
      count += knownSourcedListScore(resource.aliases);
      count += knownSourcedScore(resource.noMultiBindings);
      if (resource.primary) count += knownSourcedScore(resource.primary);
      count += bindableMapKnownFieldCount(resource.bindables);
      return count;

    case "template-controller":
      count += knownSourcedArrayScore(resource.aliases);
      count += knownSourcedScore(resource.noMultiBindings);
      count += bindableMapKnownFieldCount(resource.bindables);
      return count;

    case "value-converter":
      if (resource.fromType) count += knownSourcedScore(resource.fromType);
      if (resource.toType) count += knownSourcedScore(resource.toType);
      return count;

    case "binding-behavior":
      return count;
  }
}

function bindableMapKnownFieldCount(bindables: Readonly<Record<string, BindableDef>>): number {
  let count = 0;
  const keys = Object.keys(bindables).sort((left, right) => left.localeCompare(right));
  for (const key of keys) {
    const bindable = bindables[key];
    if (!bindable) continue;
    count += knownSourcedScore(bindable.property);
    count += knownSourcedScore(bindable.attribute);
    count += knownSourcedScore(bindable.mode);
    count += knownSourcedScore(bindable.primary);
    if (bindable.type) count += knownSourcedScore(bindable.type);
    if (bindable.doc) count += knownSourcedScore(bindable.doc);
  }
  return count;
}

function knownSourcedScore<T>(value: Sourced<T> | undefined): number {
  if (!value) return 0;
  if (value.origin === "source") {
    return value.state === "known" ? 1 : 0;
  }
  return 1;
}

function knownSourcedListScore(values: readonly Sourced<string>[]): number {
  let count = 0;
  for (const value of values) {
    if (knownSourcedScore(value) === 0) continue;
    if (unwrapSourced(value) !== undefined) count += 1;
  }
  return count;
}

function knownSourcedArrayScore(value: Sourced<readonly string[]>): number {
  if (knownSourcedScore(value) === 0) return 0;
  const list = unwrapSourced(value);
  return list ? list.length : 0;
}

function canonicalCandidatePayloadKey(candidate: ResourceDefinitionCandidate): string {
  return stableStringify({
    kind: candidate.resource.kind,
    name: unwrapSourced(candidate.resource.name) ?? "",
    className: unwrapSourced(candidate.resource.className) ?? "",
    bindables: canonicalBindableSnapshot(candidate.resource),
  });
}

function canonicalBindableSnapshot(resource: ResourceDef): Record<string, Record<string, unknown>> {
  if (resource.kind === "value-converter" || resource.kind === "binding-behavior") {
    return {};
  }
  const record: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(resource.bindables).sort((left, right) => left.localeCompare(right))) {
    const bindable = resource.bindables[key];
    if (!bindable) continue;
    record[key] = canonicalBindableDefSnapshot(bindable);
  }
  return record;
}

function canonicalBindableDefSnapshot(bindable: BindableDef): Record<string, unknown> {
  return {
    property: unwrapSourced(bindable.property) ?? "",
    attribute: unwrapSourced(bindable.attribute) ?? "",
    mode: unwrapSourced(bindable.mode) ?? "",
    primary: unwrapSourced(bindable.primary) ?? false,
    type: bindable.type ? (unwrapSourced(bindable.type) ?? "") : "",
    doc: bindable.doc ? (unwrapSourced(bindable.doc) ?? "") : "",
  };
}
