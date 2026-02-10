import {
  type AttrRes,
  type Bindable,
  type BindingBehaviorSig,
  type ControllerConfig,
  type ElementRes,
  type ResourceCollections,
  type TypeRef,
  type ValueConverterSig,
} from "../compiler.js";
import {
  reduceDefinitionAtoms,
  type DefinitionEvidenceAtom,
  type DefinitionReductionReason,
  type DefinitionSourceKind,
  type DefinitionValueState,
} from "./solver.js";
import type { DefinitionFieldPath } from "./rules.js";

interface CandidateMeta {
  readonly candidateId: string;
  readonly sourceKind: DefinitionSourceKind;
  readonly evidenceRank: number;
}

const EXPLICIT_CONFIG_META: CandidateMeta = {
  candidateId: "explicit-config",
  sourceKind: "explicit-config",
  evidenceRank: 0,
};

const BASE_COLLECTION_META: CandidateMeta = {
  candidateId: "base",
  sourceKind: "analysis-explicit",
  evidenceRank: 3,
};

export function mergeResolvedResourceCollections(
  base: ResourceCollections,
  extra: Partial<ResourceCollections>,
): ResourceCollections {
  if (!hasResourceEntries(extra)) return base;
  return {
    elements: extra.elements ? mergeElementRecords(extra.elements, base.elements) : base.elements,
    attributes: extra.attributes ? mergeAttrRecords(extra.attributes, base.attributes) : base.attributes,
    controllers: extra.controllers ? mergeControllerRecords(extra.controllers, base.controllers) : base.controllers,
    valueConverters: extra.valueConverters
      ? mergeValueConverterSigRecords(extra.valueConverters, base.valueConverters)
      : base.valueConverters,
    bindingBehaviors: extra.bindingBehaviors
      ? mergeBindingBehaviorSigRecords(extra.bindingBehaviors, base.bindingBehaviors)
      : base.bindingBehaviors,
  };
}

export function mergePartialResourceCollections(
  base: Partial<ResourceCollections> | undefined,
  extra: Partial<ResourceCollections>,
): Partial<ResourceCollections> {
  if (!base) return extra;
  if (!hasResourceEntries(extra)) return base;
  return {
    ...(base.elements || extra.elements
      ? { elements: mergeElementRecords(extra.elements ?? {}, base.elements ?? {}) }
      : {}),
    ...(base.attributes || extra.attributes
      ? { attributes: mergeAttrRecords(extra.attributes ?? {}, base.attributes ?? {}) }
      : {}),
    ...(base.controllers || extra.controllers
      ? { controllers: mergeControllerRecords(extra.controllers ?? {}, base.controllers ?? {}) }
      : {}),
    ...(base.valueConverters || extra.valueConverters
      ? { valueConverters: mergeValueConverterSigRecords(extra.valueConverters ?? {}, base.valueConverters ?? {}) }
      : {}),
    ...(base.bindingBehaviors || extra.bindingBehaviors
      ? { bindingBehaviors: mergeBindingBehaviorSigRecords(extra.bindingBehaviors ?? {}, base.bindingBehaviors ?? {}) }
      : {}),
  };
}

function mergeElementRecords(
  primary: Readonly<Record<string, ElementRes>>,
  secondary: Readonly<Record<string, ElementRes>>,
): Record<string, ElementRes> {
  const merged: Record<string, ElementRes> = { ...secondary };
  for (const key of Object.keys(primary).sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    if (!left) continue;
    const right = merged[key];
    merged[key] = right ? mergeElementRes(left, right, key) : left;
  }
  return merged;
}

function mergeAttrRecords(
  primary: Readonly<Record<string, AttrRes>>,
  secondary: Readonly<Record<string, AttrRes>>,
): Record<string, AttrRes> {
  const merged: Record<string, AttrRes> = { ...secondary };
  for (const key of Object.keys(primary).sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    if (!left) continue;
    const right = merged[key];
    merged[key] = right ? mergeAttrRes(left, right, key) : left;
  }
  return merged;
}

function mergeControllerRecords(
  primary: Readonly<Record<string, ControllerConfig>>,
  secondary: Readonly<Record<string, ControllerConfig>>,
): Record<string, ControllerConfig> {
  const merged: Record<string, ControllerConfig> = { ...secondary };
  for (const key of Object.keys(primary).sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    if (!left) continue;
    const right = merged[key];
    merged[key] = right ? mergeControllerConfig(left, right, key) : left;
  }
  return merged;
}

function mergeValueConverterSigRecords(
  primary: Readonly<Record<string, ValueConverterSig>>,
  secondary: Readonly<Record<string, ValueConverterSig>>,
): Record<string, ValueConverterSig> {
  const merged: Record<string, ValueConverterSig> = { ...secondary };
  for (const key of Object.keys(primary).sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    if (!left) continue;
    const right = merged[key];
    merged[key] = right ? mergeValueConverterSig(left, right, key) : left;
  }
  return merged;
}

function mergeBindingBehaviorSigRecords(
  primary: Readonly<Record<string, BindingBehaviorSig>>,
  secondary: Readonly<Record<string, BindingBehaviorSig>>,
): Record<string, BindingBehaviorSig> {
  const merged: Record<string, BindingBehaviorSig> = { ...secondary };
  for (const key of Object.keys(primary).sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    if (!left) continue;
    const right = merged[key];
    merged[key] = right ? mergeBindingBehaviorSig(left, right) : left;
  }
  return merged;
}

function mergeElementRes(
  primary: ElementRes,
  secondary: ElementRes,
  key: string,
): ElementRes {
  const reasons: DefinitionReductionReason[] = [];
  return {
    ...secondary,
    ...primary,
    bindables: mergeBindableRecord(primary.bindables, secondary.bindables, key, reasons),
    ...(mergeStringArrays(primary.aliases ?? [], secondary.aliases ?? []).length > 0
      ? { aliases: mergeStringArrays(primary.aliases ?? [], secondary.aliases ?? []) }
      : {}),
    ...(mergeStringArrays(primary.dependencies ?? [], secondary.dependencies ?? []).length > 0
      ? { dependencies: mergeStringArrays(primary.dependencies ?? [], secondary.dependencies ?? []) }
      : {}),
    ...(selectDefined(primary.containerless, secondary.containerless) !== undefined
      ? { containerless: selectDefined(primary.containerless, secondary.containerless) }
      : {}),
    ...(selectDefined(primary.shadowOptions, secondary.shadowOptions) !== undefined
      ? { shadowOptions: selectDefined(primary.shadowOptions, secondary.shadowOptions) }
      : {}),
    ...(selectDefined(primary.capture, secondary.capture) !== undefined
      ? { capture: selectDefined(primary.capture, secondary.capture) }
      : {}),
    ...(selectDefined(primary.processContent, secondary.processContent) !== undefined
      ? { processContent: selectDefined(primary.processContent, secondary.processContent) }
      : {}),
    ...(selectDefined(primary.boundary, secondary.boundary) !== undefined
      ? { boundary: selectDefined(primary.boundary, secondary.boundary) }
      : {}),
    ...(selectDefined(primary.className, secondary.className)
      ? { className: selectDefined(primary.className, secondary.className)! }
      : {}),
    ...(selectDefined(primary.file, secondary.file) ? { file: selectDefined(primary.file, secondary.file)! } : {}),
    ...(selectDefined(primary.package, secondary.package)
      ? { package: selectDefined(primary.package, secondary.package)! }
      : {}),
  };
}

function mergeAttrRes(
  primary: AttrRes,
  secondary: AttrRes,
  key: string,
): AttrRes {
  const reasons: DefinitionReductionReason[] = [];
  return {
    ...secondary,
    ...primary,
    bindables: mergeBindableRecord(primary.bindables, secondary.bindables, key, reasons),
    ...(mergeStringArrays(primary.aliases ?? [], secondary.aliases ?? []).length > 0
      ? { aliases: mergeStringArrays(primary.aliases ?? [], secondary.aliases ?? []) }
      : {}),
    ...(selectDefined(primary.primary, secondary.primary) ? { primary: selectDefined(primary.primary, secondary.primary)! } : {}),
    ...(selectDefined(primary.isTemplateController, secondary.isTemplateController) !== undefined
      ? { isTemplateController: selectDefined(primary.isTemplateController, secondary.isTemplateController) }
      : {}),
    ...(selectDefined(primary.noMultiBindings, secondary.noMultiBindings) !== undefined
      ? { noMultiBindings: selectDefined(primary.noMultiBindings, secondary.noMultiBindings) }
      : {}),
    ...(selectDefined(primary.className, secondary.className)
      ? { className: selectDefined(primary.className, secondary.className)! }
      : {}),
    ...(selectDefined(primary.file, secondary.file) ? { file: selectDefined(primary.file, secondary.file)! } : {}),
    ...(selectDefined(primary.package, secondary.package)
      ? { package: selectDefined(primary.package, secondary.package)! }
      : {}),
  };
}

function mergeControllerConfig(
  primary: ControllerConfig,
  secondary: ControllerConfig,
  key: string,
): ControllerConfig {
  const reasons: DefinitionReductionReason[] = [];
  const props = primary.props || secondary.props
    ? mergeBindableRecord(primary.props ?? {}, secondary.props ?? {}, key, reasons)
    : undefined;
  return {
    ...secondary,
    ...primary,
    ...(props ? { props } : {}),
  };
}

function mergeValueConverterSig(
  primary: ValueConverterSig,
  secondary: ValueConverterSig,
  key: string,
): ValueConverterSig {
  const reasons: DefinitionReductionReason[] = [];
  return {
    ...secondary,
    ...primary,
    in: reduceResolvedField(
      "resource.vc.fromType",
      primary.in,
      secondary.in,
      EXPLICIT_CONFIG_META,
      BASE_COLLECTION_META,
      reasons,
      toTypeRefState,
    ) ?? { kind: "unknown" },
    out: reduceResolvedField(
      "resource.vc.toType",
      primary.out,
      secondary.out,
      EXPLICIT_CONFIG_META,
      BASE_COLLECTION_META,
      reasons,
      toTypeRefState,
    ) ?? { kind: "unknown" },
    ...(selectDefined(primary.className, secondary.className)
      ? { className: selectDefined(primary.className, secondary.className)! }
      : {}),
    ...(selectDefined(primary.file, secondary.file) ? { file: selectDefined(primary.file, secondary.file)! } : {}),
    ...(selectDefined(primary.package, secondary.package)
      ? { package: selectDefined(primary.package, secondary.package)! }
      : {}),
  };
}

function mergeBindingBehaviorSig(
  primary: BindingBehaviorSig,
  secondary: BindingBehaviorSig,
): BindingBehaviorSig {
  return {
    ...secondary,
    ...primary,
    ...(selectDefined(primary.className, secondary.className)
      ? { className: selectDefined(primary.className, secondary.className)! }
      : {}),
    ...(selectDefined(primary.file, secondary.file) ? { file: selectDefined(primary.file, secondary.file)! } : {}),
    ...(selectDefined(primary.package, secondary.package)
      ? { package: selectDefined(primary.package, secondary.package)! }
      : {}),
  };
}

function mergeBindableRecord(
  primary: Readonly<Record<string, Bindable>>,
  secondary: Readonly<Record<string, Bindable>>,
  ownerKey: string,
  reasons: DefinitionReductionReason[],
): Readonly<Record<string, Bindable>> {
  const keys = new Set<string>([...Object.keys(primary), ...Object.keys(secondary)]);
  const merged: Record<string, Bindable> = {};
  for (const key of [...keys].sort((left, right) => left.localeCompare(right))) {
    const left = primary[key];
    const right = secondary[key];
    if (left && right) {
      merged[key] = mergeBindable(left, right, `${ownerKey}.${key}`, reasons);
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

function mergeBindable(
  primary: Bindable,
  secondary: Bindable,
  key: string,
  reasons: DefinitionReductionReason[],
): Bindable {
  const type = reduceResolvedField(
    `bindables.${key}.type`,
    primary.type,
    secondary.type,
    EXPLICIT_CONFIG_META,
    BASE_COLLECTION_META,
    reasons,
    toTypeRefState,
  );
  const attribute = reduceResolvedField(
    `bindables.${key}.attribute`,
    primary.attribute,
    secondary.attribute,
    EXPLICIT_CONFIG_META,
    BASE_COLLECTION_META,
    reasons,
  );
  const mode = reduceResolvedField(
    `bindables.${key}.mode`,
    primary.mode,
    secondary.mode,
    EXPLICIT_CONFIG_META,
    BASE_COLLECTION_META,
    reasons,
  );
  const primaryFlag = reduceResolvedField(
    `bindables.${key}.primary`,
    primary.primary,
    secondary.primary,
    EXPLICIT_CONFIG_META,
    BASE_COLLECTION_META,
    reasons,
  );
  const doc = reduceResolvedField(
    `bindables.${key}.doc`,
    primary.doc,
    secondary.doc,
    EXPLICIT_CONFIG_META,
    BASE_COLLECTION_META,
    reasons,
  );
  return {
    name: primary.name || secondary.name,
    ...(attribute ? { attribute } : {}),
    ...(mode ? { mode } : {}),
    ...(primaryFlag !== undefined ? { primary: primaryFlag } : {}),
    ...(type ? { type } : {}),
    ...(doc ? { doc } : {}),
  };
}

function reduceResolvedField<T>(
  field: DefinitionFieldPath,
  primary: T | undefined,
  secondary: T | undefined,
  primaryMeta: CandidateMeta,
  secondaryMeta: CandidateMeta,
  reasons: DefinitionReductionReason[],
  toState: (value: T | undefined) => DefinitionValueState<T> = toDefaultState,
): T | undefined {
  const atomPrimaryId = `${primaryMeta.candidateId}:${field}:primary`;
  const atomSecondaryId = `${secondaryMeta.candidateId}:${field}:secondary`;
  const atoms: DefinitionEvidenceAtom<T>[] = [
    {
      atomId: atomPrimaryId,
      subject: { kind: "resource", name: "resource", scope: "root" },
      field,
      value: toState(primary),
      sourceKind: primaryMeta.sourceKind,
      evidenceRank: primaryMeta.evidenceRank,
    },
    {
      atomId: atomSecondaryId,
      subject: { kind: "resource", name: "resource", scope: "root" },
      field,
      value: toState(secondary),
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

function toTypeRefState(value: TypeRef | undefined): DefinitionValueState<TypeRef> {
  if (!value) return { state: "absent" };
  if (value.kind === "unknown") return { state: "unknown" };
  return { state: "known", value };
}

function selectDefined<T>(primary: T | undefined, secondary: T | undefined): T | undefined {
  return primary !== undefined ? primary : secondary;
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

function hasResourceEntries(resources: Partial<ResourceCollections>): boolean {
  return Boolean(
    resources.elements && Object.keys(resources.elements).length > 0
      || resources.attributes && Object.keys(resources.attributes).length > 0
      || resources.controllers && Object.keys(resources.controllers).length > 0
      || resources.valueConverters && Object.keys(resources.valueConverters).length > 0
      || resources.bindingBehaviors && Object.keys(resources.bindingBehaviors).length > 0,
  );
}
