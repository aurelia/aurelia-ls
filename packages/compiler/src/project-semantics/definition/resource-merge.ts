import {
  unwrapSourced,
  type BindableDef,
  type BindingBehaviorDef,
  type CustomAttributeDef,
  type CustomElementDef,
  type ResourceDef,
  type Sourced,
  type TemplateControllerDef,
  type ValueConverterDef,
} from "../compiler.js";
import {
  reduceDefinitionAtoms,
  type DefinitionEvidenceAtom,
  type DefinitionReductionReason,
  type DefinitionSourceKind,
  type DefinitionValueState,
} from "./solver.js";
import { getDefinitionFieldRule, type DefinitionFieldPath } from "./rules.js";
import { sortResourceDefinitionCandidates, type ResourceDefinitionCandidate } from "./candidate-order.js";

export interface ResourceDefinitionMergeResult {
  readonly value: ResourceDef | null;
  readonly primaryCandidate: ResourceDefinitionCandidate | null;
  readonly reasons: readonly DefinitionReductionReason[];
}

interface CandidateMeta {
  readonly candidateId: string;
  readonly sourceKind: DefinitionSourceKind;
  readonly evidenceRank: number;
}

export function mergeResourceDefinitionCandidates(
  candidates: readonly ResourceDefinitionCandidate[],
): ResourceDefinitionMergeResult {
  if (candidates.length === 0) {
    return { value: null, primaryCandidate: null, reasons: [] };
  }

  const ordered = sortResourceDefinitionCandidates(candidates);
  const reasons: DefinitionReductionReason[] = [];
  const primaryCandidate = ordered[0]!;
  let merged = primaryCandidate.resource;
  const primaryMeta = toMeta(primaryCandidate, 0);

  for (let i = 1; i < ordered.length; i += 1) {
    const next = ordered[i]!;
    merged = mergeResourceDefPair(merged, next.resource, primaryMeta, toMeta(next, i), reasons);
  }

  return {
    value: merged,
    primaryCandidate,
    reasons,
  };
}

function mergeResourceDefPair(
  primary: ResourceDef,
  secondary: ResourceDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): ResourceDef {
  if (primary.kind !== secondary.kind) {
    reasons.push({
      code: "kind-mismatch",
      field: "resource.className",
      detail: `Cannot merge ${primary.kind} with ${secondary.kind}`,
    });
    return primary;
  }

  switch (primary.kind) {
    case "custom-element":
      return mergeCustomElementDef(primary, secondary as CustomElementDef, primaryMeta, secondaryMeta, reasons);
    case "custom-attribute":
      return mergeCustomAttributeDef(primary, secondary as CustomAttributeDef, primaryMeta, secondaryMeta, reasons);
    case "template-controller":
      return mergeTemplateControllerDef(primary, secondary as TemplateControllerDef, primaryMeta, secondaryMeta, reasons);
    case "value-converter":
      return mergeValueConverterDef(primary, secondary as ValueConverterDef, primaryMeta, secondaryMeta, reasons);
    case "binding-behavior":
      return mergeBindingBehaviorDef(primary, secondary as BindingBehaviorDef, primaryMeta, secondaryMeta, reasons);
  }
}

function mergeCustomElementDef(
  primary: CustomElementDef,
  secondary: CustomElementDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): CustomElementDef {
  const inlineTemplate = reduceSourcedField(
    "resource.inlineTemplate",
    primary.inlineTemplate,
    secondary.inlineTemplate,
    primaryMeta,
    secondaryMeta,
    reasons,
  );
  return {
    ...primary,
    className:
      reduceSourcedField("resource.className", primary.className, secondary.className, primaryMeta, secondaryMeta, reasons)
      ?? primary.className,
    name: primary.name,
    aliases: mergeSourcedAliasList(primary.aliases, secondary.aliases),
    containerless:
      reduceSourcedField("resource.containerless", primary.containerless, secondary.containerless, primaryMeta, secondaryMeta, reasons)
      ?? primary.containerless,
    shadowOptions:
      reduceSourcedField("resource.shadowOptions", primary.shadowOptions, secondary.shadowOptions, primaryMeta, secondaryMeta, reasons)
      ?? primary.shadowOptions,
    capture:
      reduceSourcedField("resource.capture", primary.capture, secondary.capture, primaryMeta, secondaryMeta, reasons)
      ?? primary.capture,
    processContent:
      reduceSourcedField("resource.processContent", primary.processContent, secondary.processContent, primaryMeta, secondaryMeta, reasons)
      ?? primary.processContent,
    boundary:
      reduceSourcedField("resource.boundary", primary.boundary, secondary.boundary, primaryMeta, secondaryMeta, reasons)
      ?? primary.boundary,
    bindables: mergeBindableDefRecord(primary.bindables, secondary.bindables, primaryMeta, secondaryMeta, reasons),
    dependencies: mergeSourcedAliasList(primary.dependencies, secondary.dependencies),
    ...(inlineTemplate ? { inlineTemplate } : {}),
    ...(primary.file ?? secondary.file ? { file: primary.file ?? secondary.file } : {}),
    ...(primary.package ?? secondary.package ? { package: primary.package ?? secondary.package } : {}),
  };
}

function mergeCustomAttributeDef(
  primary: CustomAttributeDef,
  secondary: CustomAttributeDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): CustomAttributeDef {
  const mergedPrimary = reduceSourcedField(
    "resource.primary",
    primary.primary,
    secondary.primary,
    primaryMeta,
    secondaryMeta,
    reasons,
  );
  return {
    ...primary,
    className:
      reduceSourcedField("resource.className", primary.className, secondary.className, primaryMeta, secondaryMeta, reasons)
      ?? primary.className,
    name: primary.name,
    aliases: mergeSourcedAliasList(primary.aliases, secondary.aliases),
    noMultiBindings:
      reduceSourcedField(
        "resource.noMultiBindings",
        primary.noMultiBindings,
        secondary.noMultiBindings,
        primaryMeta,
        secondaryMeta,
        reasons,
      ) ?? primary.noMultiBindings,
    ...(mergedPrimary ? { primary: mergedPrimary } : {}),
    bindables: mergeBindableDefRecord(primary.bindables, secondary.bindables, primaryMeta, secondaryMeta, reasons),
    ...(primary.file ?? secondary.file ? { file: primary.file ?? secondary.file } : {}),
    ...(primary.package ?? secondary.package ? { package: primary.package ?? secondary.package } : {}),
  };
}

function mergeTemplateControllerDef(
  primary: TemplateControllerDef,
  secondary: TemplateControllerDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): TemplateControllerDef {
  const selectedAliasEnvelope = reduceSourcedField(
    "resource.aliases",
    primary.aliases,
    secondary.aliases,
    primaryMeta,
    secondaryMeta,
    reasons,
  ) ?? primary.aliases;
  const mergedAliases = mergeStringArrays(unwrapSourced(primary.aliases) ?? [], unwrapSourced(secondary.aliases) ?? []);
  const aliases = arraysEqual(unwrapSourced(selectedAliasEnvelope) ?? [], mergedAliases)
    ? selectedAliasEnvelope
    : cloneSourcedWithValue(selectedAliasEnvelope, mergedAliases);

  return {
    ...primary,
    className:
      reduceSourcedField("resource.className", primary.className, secondary.className, primaryMeta, secondaryMeta, reasons)
      ?? primary.className,
    name: primary.name,
    aliases,
    noMultiBindings:
      reduceSourcedField(
        "resource.noMultiBindings",
        primary.noMultiBindings,
        secondary.noMultiBindings,
        primaryMeta,
        secondaryMeta,
        reasons,
      ) ?? primary.noMultiBindings,
    bindables: mergeBindableDefRecord(primary.bindables, secondary.bindables, primaryMeta, secondaryMeta, reasons),
    ...(primary.semantics ?? secondary.semantics ? { semantics: primary.semantics ?? secondary.semantics } : {}),
    ...(primary.file ?? secondary.file ? { file: primary.file ?? secondary.file } : {}),
    ...(primary.package ?? secondary.package ? { package: primary.package ?? secondary.package } : {}),
  };
}

function mergeValueConverterDef(
  primary: ValueConverterDef,
  secondary: ValueConverterDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): ValueConverterDef {
  const fromType = reduceSourcedField(
    "resource.vc.fromType",
    primary.fromType,
    secondary.fromType,
    primaryMeta,
    secondaryMeta,
    reasons,
  );
  const toType = reduceSourcedField(
    "resource.vc.toType",
    primary.toType,
    secondary.toType,
    primaryMeta,
    secondaryMeta,
    reasons,
  );
  return {
    ...primary,
    className:
      reduceSourcedField("resource.className", primary.className, secondary.className, primaryMeta, secondaryMeta, reasons)
      ?? primary.className,
    name: primary.name,
    ...(fromType ? { fromType } : {}),
    ...(toType ? { toType } : {}),
    ...(primary.file ?? secondary.file ? { file: primary.file ?? secondary.file } : {}),
    ...(primary.package ?? secondary.package ? { package: primary.package ?? secondary.package } : {}),
  };
}

function mergeBindingBehaviorDef(
  primary: BindingBehaviorDef,
  secondary: BindingBehaviorDef,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): BindingBehaviorDef {
  return {
    ...primary,
    className:
      reduceSourcedField("resource.className", primary.className, secondary.className, primaryMeta, secondaryMeta, reasons)
      ?? primary.className,
    name: primary.name,
    ...(primary.file ?? secondary.file ? { file: primary.file ?? secondary.file } : {}),
    ...(primary.package ?? secondary.package ? { package: primary.package ?? secondary.package } : {}),
  };
}

function mergeBindableDefRecord(
  primary: Readonly<Record<string, BindableDef>>,
  secondary: Readonly<Record<string, BindableDef>>,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): Readonly<Record<string, BindableDef>> {
  const keys = new Set<string>([...Object.keys(primary), ...Object.keys(secondary)]);
  const merged: Record<string, BindableDef> = {};
  for (const key of [...keys].sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    const right = secondary[key];
    if (left && right) {
      merged[key] = mergeBindableDef(left, right, key, primaryMeta, secondaryMeta, reasons);
      continue;
    }
    if (left) {
      merged[key] = left;
      continue;
    }
    if (right) {
      merged[key] = right;
    }
  }
  return merged;
}

function mergeBindableDef(
  primary: BindableDef,
  secondary: BindableDef,
  key: string,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): BindableDef {
  const type = reduceSourcedField(`bindables.${key}.type`, primary.type, secondary.type, primaryMeta, secondaryMeta, reasons);
  const doc = reduceSourcedField(`bindables.${key}.doc`, primary.doc, secondary.doc, primaryMeta, secondaryMeta, reasons);
  return {
    property:
      reduceSourcedField(`bindables.${key}.property`, primary.property, secondary.property, primaryMeta, secondaryMeta, reasons)
      ?? primary.property,
    attribute:
      reduceSourcedField(`bindables.${key}.attribute`, primary.attribute, secondary.attribute, primaryMeta, secondaryMeta, reasons)
      ?? primary.attribute,
    mode:
      reduceSourcedField(`bindables.${key}.mode`, primary.mode, secondary.mode, primaryMeta, secondaryMeta, reasons)
      ?? primary.mode,
    primary:
      reduceSourcedField(`bindables.${key}.primary`, primary.primary, secondary.primary, primaryMeta, secondaryMeta, reasons)
      ?? primary.primary,
    ...(type ? { type } : {}),
    ...(doc ? { doc } : {}),
  };
}

function reduceSourcedField<T>(
  field: DefinitionFieldPath,
  primary: Sourced<T> | undefined,
  secondary: Sourced<T> | undefined,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): Sourced<T> | undefined {
  const rule = getDefinitionFieldRule(field);
  if (rule.operator === "patch-object") {
    return reduceSourcedPatchObject(field, primary, secondary, primaryMeta, secondaryMeta, reasons);
  }
  return reduceResolvedField(
    field,
    primary,
    secondary,
    primaryMeta,
    secondaryMeta,
    reasons,
    toSourcedState,
    toSourcedConflictValue,
  );
}

/**
 * Sourced-aware patch-object reduction.
 *
 * The generic `reducePatchObject` operator uses `Object.assign` on atom values.
 * When atoms wrap `Sourced<T>` envelopes (via `toSourcedState`), it would merge
 * provenance properties instead of inner values. This function unwraps the
 * Sourced<T> inner values, runs the generic reducer on those, and re-wraps the
 * result in the winning candidate's provenance envelope.
 */
function reduceSourcedPatchObject<T>(
  field: DefinitionFieldPath,
  primary: Sourced<T> | undefined,
  secondary: Sourced<T> | undefined,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
): Sourced<T> | undefined {
  const innerPrimary = primary ? unwrapSourced(primary) : undefined;
  const innerSecondary = secondary ? unwrapSourced(secondary) : undefined;
  const merged = reduceResolvedField(
    field,
    innerPrimary,
    innerSecondary,
    primaryMeta,
    secondaryMeta,
    reasons,
  );
  if (merged === undefined) return undefined;
  // Re-wrap in the strongest available envelope's provenance.
  const template = primary ?? secondary;
  if (!template) return undefined;
  return cloneSourcedWithValue(template, merged);
}

function reduceResolvedField<T>(
  field: DefinitionFieldPath,
  primary: T | undefined,
  secondary: T | undefined,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
  toState: (value: T | undefined) => DefinitionValueState<T> = toDefaultState,
  toConflictValue: (value: T | undefined) => unknown = toDefaultConflictValue,
): T | undefined {
  const atomPrimaryId = `${primaryMeta.candidateId}:${field}:primary`;
  const atomSecondaryId = `${secondaryMeta.candidateId}:${field}:secondary`;
  const atoms: DefinitionEvidenceAtom<T>[] = [
    {
      atomId: atomPrimaryId,
      subject: { kind: "resource", name: "resource", scope: "root" },
      field,
      value: toState(primary),
      conflictValue: toConflictValue(primary),
      sourceKind: primaryMeta.sourceKind,
      evidenceRank: primaryMeta.evidenceRank,
    },
    {
      atomId: atomSecondaryId,
      subject: { kind: "resource", name: "resource", scope: "root" },
      field,
      value: toState(secondary),
      conflictValue: toConflictValue(secondary),
      sourceKind: secondaryMeta.sourceKind,
      evidenceRank: secondaryMeta.evidenceRank,
    },
  ];
  const reduced = reduceDefinitionAtoms(atoms);
  reasons.push(...reduced.trace.reasons);
  if (reduced.value.state === "known") {
    return reduced.value.value;
  }
  if (reduced.trace.winnerAtomId === atomPrimaryId) {
    return primary;
  }
  if (reduced.trace.winnerAtomId === atomSecondaryId) {
    return secondary;
  }
  return undefined;
}

function toDefaultState<T>(value: T | undefined): DefinitionValueState<T> {
  return value === undefined
    ? { state: "absent" }
    : { state: "known", value };
}

function toDefaultConflictValue<T>(value: T | undefined): unknown {
  return value;
}

function toSourcedState<T>(value: Sourced<T> | undefined): DefinitionValueState<Sourced<T>> {
  if (!value) return { state: "absent" };
  if (value.origin === "source" && value.state === "unknown") {
    return { state: "unknown" };
  }
  return { state: "known", value };
}

function toSourcedConflictValue<T>(value: Sourced<T> | undefined): unknown {
  return value ? unwrapSourced(value) : undefined;
}

function mergeSourcedAliasList(
  primary: readonly Sourced<string>[],
  secondary: readonly Sourced<string>[],
): readonly Sourced<string>[] {
  const merged: Sourced<string>[] = [];
  const seen = new Set<string>();
  const append = (values: readonly Sourced<string>[]) => {
    for (const value of values) {
      const unwrapped = unwrapSourced(value);
      if (!unwrapped || seen.has(unwrapped)) continue;
      seen.add(unwrapped);
      merged.push(value);
    }
  };
  append(primary);
  append(secondary);
  return merged;
}

function mergeStringArrays(primary: readonly string[], secondary: readonly string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const value of [...primary, ...secondary]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }
  return merged;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function cloneSourcedWithValue<T>(template: Sourced<T>, value: T): Sourced<T> {
  switch (template.origin) {
    case "builtin":
      return { origin: "builtin", value };
    case "config":
      return { origin: "config", value, location: template.location };
    case "source":
      return {
        origin: "source",
        state: "known",
        value,
        ...(template.node ? { node: template.node } : {}),
        ...(template.location ? { location: template.location } : {}),
      };
  }
}

function toMeta(candidate: ResourceDefinitionCandidate, index: number): CandidateMeta {
  return {
    candidateId: candidate.candidateId ?? `candidate:${index + 1}`,
    sourceKind: candidate.sourceKind,
    evidenceRank: candidate.evidenceRank,
  };
}
