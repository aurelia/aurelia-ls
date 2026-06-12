import {
  sortedCountRows,
  type SemanticRuntimeDetailDensityRow,
} from './kernel-density.js';

export interface SemanticRuntimeDetailDensityInput {
  readonly detailKind: string;
  readonly detail: unknown;
  readonly envelopeHandles?: readonly string[];
}

class SemanticRuntimeDetailDensityAccumulator {
  count = 0;
  ownPropertyCount = 0;
  directArrayItemCount = 0;
  directStringCharacterCount = 0;
  readonly directStringValues = new Set<string>();
  directKernelHandleCount = 0;
  directKernelHandleCharacterCount = 0;
  readonly directKernelHandleKinds = new Map<string, number>();
  readonly directKernelHandleKindCharacters = new Map<string, number>();
  directEnvelopeHandleEchoCount = 0;
  directEnvelopeHandleEchoCharacterCount = 0;
  readonly directEnvelopeHandleEchoKinds = new Map<string, number>();
  readonly directEnvelopeHandleEchoKindCharacters = new Map<string, number>();
  directLocalKeyCharacterCount = 0;
  readonly objectKinds = new Map<string, number>();
  readonly constructors = new Map<string, number>();
  readonly directArrayFields = new Map<string, number>();
  readonly directStringFields = new Map<string, number>();
  readonly directKernelHandleFields = new Map<string, number>();
  readonly directEnvelopeHandleEchoFields = new Map<string, number>();
  readonly directLocalKeyFields = new Map<string, number>();

  constructor(
    readonly detailKind: string,
  ) {}

  add(
    detail: unknown,
    envelopeHandles: readonly string[],
  ): void {
    const shape = semanticRuntimeDetailShape(detail, envelopeHandles);
    this.count += 1;
    this.ownPropertyCount += shape.ownPropertyCount;
    this.directArrayItemCount += shape.directArrayItemCount;
    this.directStringCharacterCount += shape.directStringCharacterCount;
    for (const value of shape.directStringValues) {
      this.directStringValues.add(value);
    }
    this.directKernelHandleCount += shape.directKernelHandleCount;
    this.directKernelHandleCharacterCount += shape.directKernelHandleCharacterCount;
    addCountRows(this.directKernelHandleKinds, shape.directKernelHandleKinds);
    addCountRows(this.directKernelHandleKindCharacters, shape.directKernelHandleKindCharacters);
    this.directEnvelopeHandleEchoCount += shape.directEnvelopeHandleEchoCount;
    this.directEnvelopeHandleEchoCharacterCount += shape.directEnvelopeHandleEchoCharacterCount;
    addCountRows(this.directEnvelopeHandleEchoKinds, shape.directEnvelopeHandleEchoKinds);
    addCountRows(this.directEnvelopeHandleEchoKindCharacters, shape.directEnvelopeHandleEchoKindCharacters);
    this.directLocalKeyCharacterCount += shape.directLocalKeyCharacterCount;
    addCount(this.objectKinds, shape.objectKind);
    addCount(this.constructors, shape.constructorName);
    addCountRows(this.directArrayFields, shape.directArrayFields);
    addCountRows(this.directStringFields, shape.directStringFields);
    addCountRows(this.directKernelHandleFields, shape.directKernelHandleFields);
    addCountRows(this.directEnvelopeHandleEchoFields, shape.directEnvelopeHandleEchoFields);
    addCountRows(this.directLocalKeyFields, shape.directLocalKeyFields);
  }

  toRow(): SemanticRuntimeDetailDensityRow {
    return {
      detailKind: this.detailKind,
      count: this.count,
      ownPropertyCount: this.ownPropertyCount,
      directArrayItemCount: this.directArrayItemCount,
      directStringCharacterCount: this.directStringCharacterCount,
      directNonHandleStringCharacterCount: this.directStringCharacterCount - this.directKernelHandleCharacterCount,
      directUniqueStringCount: this.directStringValues.size,
      directUniqueStringCharacterCount: sumStringLengths(this.directStringValues),
      directKernelHandleCount: this.directKernelHandleCount,
      directKernelHandleCharacterCount: this.directKernelHandleCharacterCount,
      directKernelHandleKinds: sortedCountRows(this.directKernelHandleKinds),
      directKernelHandleKindCharacters: sortedCountRows(this.directKernelHandleKindCharacters),
      directNonEnvelopeKernelHandleCount: this.directKernelHandleCount - this.directEnvelopeHandleEchoCount,
      directNonEnvelopeKernelHandleCharacterCount: this.directKernelHandleCharacterCount - this.directEnvelopeHandleEchoCharacterCount,
      directNonEnvelopeKernelHandleKinds: sortedCountRows(subtractCounts(this.directKernelHandleKinds, this.directEnvelopeHandleEchoKinds)),
      directNonEnvelopeKernelHandleKindCharacters: sortedCountRows(subtractCounts(this.directKernelHandleKindCharacters, this.directEnvelopeHandleEchoKindCharacters)),
      directEnvelopeHandleEchoCount: this.directEnvelopeHandleEchoCount,
      directEnvelopeHandleEchoCharacterCount: this.directEnvelopeHandleEchoCharacterCount,
      directEnvelopeHandleEchoKinds: sortedCountRows(this.directEnvelopeHandleEchoKinds),
      directEnvelopeHandleEchoKindCharacters: sortedCountRows(this.directEnvelopeHandleEchoKindCharacters),
      directLocalKeyCharacterCount: this.directLocalKeyCharacterCount,
      objectKinds: sortedCountRows(this.objectKinds),
      constructors: sortedCountRows(this.constructors),
      directArrayFields: sortedCountRows(this.directArrayFields),
      directStringFields: sortedCountRows(this.directStringFields),
      directNonHandleStringFields: sortedCountRows(subtractCounts(this.directStringFields, this.directKernelHandleFields)),
      directKernelHandleFields: sortedCountRows(this.directKernelHandleFields),
      directNonEnvelopeKernelHandleFields: sortedCountRows(subtractCounts(this.directKernelHandleFields, this.directEnvelopeHandleEchoFields)),
      directEnvelopeHandleEchoFields: sortedCountRows(this.directEnvelopeHandleEchoFields),
      directLocalKeyFields: sortedCountRows(this.directLocalKeyFields),
    };
  }
}

interface SemanticRuntimeDetailShape {
  readonly objectKind: string;
  readonly constructorName: string;
  readonly ownPropertyCount: number;
  readonly directArrayItemCount: number;
  readonly directStringCharacterCount: number;
  readonly directStringValues: readonly string[];
  readonly directKernelHandleCount: number;
  readonly directKernelHandleCharacterCount: number;
  readonly directKernelHandleKinds: ReadonlyMap<string, number>;
  readonly directKernelHandleKindCharacters: ReadonlyMap<string, number>;
  readonly directEnvelopeHandleEchoCount: number;
  readonly directEnvelopeHandleEchoCharacterCount: number;
  readonly directEnvelopeHandleEchoKinds: ReadonlyMap<string, number>;
  readonly directEnvelopeHandleEchoKindCharacters: ReadonlyMap<string, number>;
  readonly directLocalKeyCharacterCount: number;
  readonly directArrayFields: ReadonlyMap<string, number>;
  readonly directStringFields: ReadonlyMap<string, number>;
  readonly directKernelHandleFields: ReadonlyMap<string, number>;
  readonly directEnvelopeHandleEchoFields: ReadonlyMap<string, number>;
  readonly directLocalKeyFields: ReadonlyMap<string, number>;
}

export function readSemanticRuntimeDetailDensityRows(
  entries: Iterable<SemanticRuntimeDetailDensityInput>,
): readonly SemanticRuntimeDetailDensityRow[] {
  const rows = new Map<string, SemanticRuntimeDetailDensityAccumulator>();
  for (const entry of entries) {
    let row = rows.get(entry.detailKind);
    if (row === undefined) {
      row = new SemanticRuntimeDetailDensityAccumulator(entry.detailKind);
      rows.set(entry.detailKind, row);
    }
    row.add(entry.detail, entry.envelopeHandles ?? []);
  }
  return [...rows.values()]
    .map((row) => row.toRow())
    .sort((left, right) =>
      detailDensityWeight(right) - detailDensityWeight(left)
      || right.count - left.count
      || left.detailKind.localeCompare(right.detailKind)
    );
}

function semanticRuntimeDetailShape(
  detail: unknown,
  envelopeHandles: readonly string[],
): SemanticRuntimeDetailShape {
  const envelopeHandleSet = new Set(envelopeHandles);
  if (detail == null) {
    return emptyDetailShape('null', 'null');
  }
  if (Array.isArray(detail)) {
    return arrayDetailShape(detail, envelopeHandleSet);
  }
  if (typeof detail !== 'object') {
    return primitiveDetailShape(detail, envelopeHandleSet);
  }

  return objectDetailShape(detail as Record<string, unknown>, envelopeHandleSet);
}

function emptyDetailShape(
  objectKind: string,
  constructorName: string,
): SemanticRuntimeDetailShape {
  return {
    objectKind,
    constructorName,
    ownPropertyCount: 0,
    directArrayItemCount: 0,
    directStringCharacterCount: 0,
    directStringValues: [],
    directKernelHandleCount: 0,
    directKernelHandleCharacterCount: 0,
    directKernelHandleKinds: emptyDetailFieldCounts(),
    directKernelHandleKindCharacters: emptyDetailFieldCounts(),
    directEnvelopeHandleEchoCount: 0,
    directEnvelopeHandleEchoCharacterCount: 0,
    directEnvelopeHandleEchoKinds: emptyDetailFieldCounts(),
    directEnvelopeHandleEchoKindCharacters: emptyDetailFieldCounts(),
    directLocalKeyCharacterCount: 0,
    directArrayFields: emptyDetailFieldCounts(),
    directStringFields: emptyDetailFieldCounts(),
    directKernelHandleFields: emptyDetailFieldCounts(),
    directEnvelopeHandleEchoFields: emptyDetailFieldCounts(),
    directLocalKeyFields: emptyDetailFieldCounts(),
  };
}

function arrayDetailShape(
  detail: readonly unknown[],
  envelopeHandles: ReadonlySet<string>,
): SemanticRuntimeDetailShape {
  const builder = new SemanticRuntimeDetailShapeBuilder('array', 'Array', 0);
  builder.addArrayField('(array)', detail, envelopeHandles);
  return builder.toShape();
}

function primitiveDetailShape(
  detail: unknown,
  envelopeHandles: ReadonlySet<string>,
): SemanticRuntimeDetailShape {
  if (typeof detail !== 'string') {
    return emptyDetailShape(typeof detail, typeof detail);
  }
  const builder = new SemanticRuntimeDetailShapeBuilder('string', 'string', 0);
  builder.addStringField('(value)', detail, envelopeHandles);
  return builder.toShape();
}

function objectDetailShape(
  record: Record<string, unknown>,
  envelopeHandles: ReadonlySet<string>,
): SemanticRuntimeDetailShape {
  const keys = Object.keys(record);
  const builder = new SemanticRuntimeDetailShapeBuilder('object', objectConstructorName(record), keys.length);
  for (const key of keys) {
    builder.addField(key, record[key], envelopeHandles);
  }
  return builder.toShape();
}

class SemanticRuntimeDetailShapeBuilder {
  private directArrayItemCount = 0;
  private directStringCharacterCount = 0;
  private readonly directStringValues: string[] = [];
  private directKernelHandleCount = 0;
  private directKernelHandleCharacterCount = 0;
  private readonly directKernelHandleKinds = new Map<string, number>();
  private readonly directKernelHandleKindCharacters = new Map<string, number>();
  private directEnvelopeHandleEchoCount = 0;
  private directEnvelopeHandleEchoCharacterCount = 0;
  private readonly directEnvelopeHandleEchoKinds = new Map<string, number>();
  private readonly directEnvelopeHandleEchoKindCharacters = new Map<string, number>();
  private directLocalKeyCharacterCount = 0;
  private readonly directArrayFields = new Map<string, number>();
  private readonly directStringFields = new Map<string, number>();
  private readonly directKernelHandleFields = new Map<string, number>();
  private readonly directEnvelopeHandleEchoFields = new Map<string, number>();
  private readonly directLocalKeyFields = new Map<string, number>();

  constructor(
    private readonly objectKind: string,
    private readonly constructorName: string,
    private readonly ownPropertyCount: number,
  ) {}

  addField(
    key: string,
    value: unknown,
    envelopeHandles: ReadonlySet<string>,
  ): void {
    if (Array.isArray(value)) {
      this.addArrayField(key, value, envelopeHandles);
      return;
    }
    if (typeof value === 'string') {
      this.addStringField(key, value, envelopeHandles);
    }
  }

  addArrayField(
    key: string,
    values: readonly unknown[],
    envelopeHandles: ReadonlySet<string>,
  ): void {
    const classification = classifyDetailStringArray(key, values, envelopeHandles);
    this.directArrayItemCount += values.length;
    this.applyStringClassification(key, classification);
    addCountBy(this.directArrayFields, key, values.length);
  }

  addStringField(
    key: string,
    value: string,
    envelopeHandles: ReadonlySet<string>,
  ): void {
    this.applyStringClassification(key, classifyDetailString(key, value, envelopeHandles));
  }

  toShape(): SemanticRuntimeDetailShape {
    return {
      objectKind: this.objectKind,
      constructorName: this.constructorName,
      ownPropertyCount: this.ownPropertyCount,
      directArrayItemCount: this.directArrayItemCount,
      directStringCharacterCount: this.directStringCharacterCount,
      directStringValues: this.directStringValues,
      directKernelHandleCount: this.directKernelHandleCount,
      directKernelHandleCharacterCount: this.directKernelHandleCharacterCount,
      directKernelHandleKinds: this.directKernelHandleKinds,
      directKernelHandleKindCharacters: this.directKernelHandleKindCharacters,
      directEnvelopeHandleEchoCount: this.directEnvelopeHandleEchoCount,
      directEnvelopeHandleEchoCharacterCount: this.directEnvelopeHandleEchoCharacterCount,
      directEnvelopeHandleEchoKinds: this.directEnvelopeHandleEchoKinds,
      directEnvelopeHandleEchoKindCharacters: this.directEnvelopeHandleEchoKindCharacters,
      directLocalKeyCharacterCount: this.directLocalKeyCharacterCount,
      directArrayFields: this.directArrayFields,
      directStringFields: this.directStringFields,
      directKernelHandleFields: this.directKernelHandleFields,
      directEnvelopeHandleEchoFields: this.directEnvelopeHandleEchoFields,
      directLocalKeyFields: this.directLocalKeyFields,
    };
  }

  private applyStringClassification(
    key: string,
    classification: DetailStringClassification,
  ): void {
    this.directStringCharacterCount += classification.stringCharacters;
    this.directStringValues.push(...classification.stringValues);
    this.directKernelHandleCount += classification.kernelHandleCount;
    this.directKernelHandleCharacterCount += classification.kernelHandleCharacters;
    addCountRows(this.directKernelHandleKinds, classification.kernelHandleKinds);
    addCountRows(this.directKernelHandleKindCharacters, classification.kernelHandleKindCharacters);
    this.directEnvelopeHandleEchoCount += classification.envelopeHandleEchoCount;
    this.directEnvelopeHandleEchoCharacterCount += classification.envelopeHandleEchoCharacters;
    addCountRows(this.directEnvelopeHandleEchoKinds, classification.envelopeHandleEchoKinds);
    addCountRows(this.directEnvelopeHandleEchoKindCharacters, classification.envelopeHandleEchoKindCharacters);
    this.directLocalKeyCharacterCount += classification.localKeyCharacters;
    if (classification.stringCharacters > 0) {
      addCountBy(this.directStringFields, key, classification.stringCharacters);
    }
    if (classification.kernelHandleCharacters > 0) {
      addCountBy(this.directKernelHandleFields, key, classification.kernelHandleCharacters);
    }
    if (classification.envelopeHandleEchoCharacters > 0) {
      addCountBy(this.directEnvelopeHandleEchoFields, key, classification.envelopeHandleEchoCharacters);
    }
    if (classification.localKeyCharacters > 0) {
      addCountBy(this.directLocalKeyFields, key, classification.localKeyCharacters);
    }
  }
}

interface DetailStringClassification {
  readonly stringCharacters: number;
  readonly stringValues: readonly string[];
  readonly kernelHandleCount: number;
  readonly kernelHandleCharacters: number;
  readonly kernelHandleKinds: ReadonlyMap<string, number>;
  readonly kernelHandleKindCharacters: ReadonlyMap<string, number>;
  readonly envelopeHandleEchoCount: number;
  readonly envelopeHandleEchoCharacters: number;
  readonly envelopeHandleEchoKinds: ReadonlyMap<string, number>;
  readonly envelopeHandleEchoKindCharacters: ReadonlyMap<string, number>;
  readonly localKeyCharacters: number;
}

function objectConstructorName(value: object): string {
  const constructorName = value.constructor?.name;
  return typeof constructorName === 'string' && constructorName.length > 0
    ? constructorName
    : 'Object';
}

function classifyDetailStringArray(
  fieldName: string,
  values: readonly unknown[],
  envelopeHandles: ReadonlySet<string>,
): DetailStringClassification {
  let stringCharacters = 0;
  const stringValues: string[] = [];
  let kernelHandleCount = 0;
  let kernelHandleCharacters = 0;
  const kernelHandleKinds = new Map<string, number>();
  const kernelHandleKindCharacters = new Map<string, number>();
  let envelopeHandleEchoCount = 0;
  let envelopeHandleEchoCharacters = 0;
  const envelopeHandleEchoKinds = new Map<string, number>();
  const envelopeHandleEchoKindCharacters = new Map<string, number>();
  let localKeyCharacters = 0;
  for (const value of values) {
    if (typeof value === 'string') {
      const classification = classifyDetailString(fieldName, value, envelopeHandles);
      stringCharacters += classification.stringCharacters;
      stringValues.push(value);
      kernelHandleCount += classification.kernelHandleCount;
      kernelHandleCharacters += classification.kernelHandleCharacters;
      addCountRows(kernelHandleKinds, classification.kernelHandleKinds);
      addCountRows(kernelHandleKindCharacters, classification.kernelHandleKindCharacters);
      envelopeHandleEchoCount += classification.envelopeHandleEchoCount;
      envelopeHandleEchoCharacters += classification.envelopeHandleEchoCharacters;
      addCountRows(envelopeHandleEchoKinds, classification.envelopeHandleEchoKinds);
      addCountRows(envelopeHandleEchoKindCharacters, classification.envelopeHandleEchoKindCharacters);
      localKeyCharacters += classification.localKeyCharacters;
    }
  }
  return {
    stringCharacters,
    stringValues,
    kernelHandleCount,
    kernelHandleCharacters,
    kernelHandleKinds,
    kernelHandleKindCharacters,
    envelopeHandleEchoCount,
    envelopeHandleEchoCharacters,
    envelopeHandleEchoKinds,
    envelopeHandleEchoKindCharacters,
    localKeyCharacters,
  };
}

function classifyDetailString(
  fieldName: string,
  value: string,
  envelopeHandles: ReadonlySet<string>,
): DetailStringClassification {
  const kernelHandleKind = kernelHandleKindOf(value);
  const isKernelHandle = kernelHandleKind != null;
  const isEnvelopeHandleEcho = isKernelHandle && envelopeHandles.has(value);
  const kernelHandleKinds = new Map<string, number>();
  const kernelHandleKindCharacters = new Map<string, number>();
  const envelopeHandleEchoKinds = new Map<string, number>();
  const envelopeHandleEchoKindCharacters = new Map<string, number>();
  if (kernelHandleKind != null) {
    addCountBy(kernelHandleKinds, kernelHandleKind, 1);
    addCountBy(kernelHandleKindCharacters, kernelHandleKind, value.length);
    if (isEnvelopeHandleEcho) {
      addCountBy(envelopeHandleEchoKinds, kernelHandleKind, 1);
      addCountBy(envelopeHandleEchoKindCharacters, kernelHandleKind, value.length);
    }
  }
  return {
    stringCharacters: value.length,
    stringValues: [value],
    kernelHandleCount: isKernelHandle ? 1 : 0,
    kernelHandleCharacters: isKernelHandle ? value.length : 0,
    kernelHandleKinds,
    kernelHandleKindCharacters,
    envelopeHandleEchoCount: isEnvelopeHandleEcho ? 1 : 0,
    envelopeHandleEchoCharacters: isEnvelopeHandleEcho ? value.length : 0,
    envelopeHandleEchoKinds,
    envelopeHandleEchoKindCharacters,
    localKeyCharacters: isLocalKeyFieldName(fieldName) ? value.length : 0,
  };
}

function emptyDetailStringClassification(): DetailStringClassification {
  return {
    stringCharacters: 0,
    stringValues: [],
    kernelHandleCount: 0,
    kernelHandleCharacters: 0,
    kernelHandleKinds: emptyDetailFieldCounts(),
    kernelHandleKindCharacters: emptyDetailFieldCounts(),
    envelopeHandleEchoCount: 0,
    envelopeHandleEchoCharacters: 0,
    envelopeHandleEchoKinds: emptyDetailFieldCounts(),
    envelopeHandleEchoKindCharacters: emptyDetailFieldCounts(),
    localKeyCharacters: 0,
  };
}

function kernelHandleKindOf(value: string): string | null {
  if (!value.startsWith('kernel:')) {
    return null;
  }
  const parts = value.split(':');
  const kind = parts[2];
  return parts.length >= 4 && parts[0] === 'kernel' && kind != null && kind.length > 0
    ? kind
    : 'unknown';
}

function isLocalKeyFieldName(fieldName: string): boolean {
  return fieldName === 'localKey' || fieldName.endsWith('LocalKey');
}

function detailDensityWeight(row: Pick<
  SemanticRuntimeDetailDensityRow,
  'ownPropertyCount' | 'directArrayItemCount' | 'directStringCharacterCount'
>): number {
  return row.ownPropertyCount + row.directArrayItemCount + row.directStringCharacterCount;
}

function sumStringLengths(values: Iterable<string>): number {
  let total = 0;
  for (const value of values) {
    total += value.length;
  }
  return total;
}

function addCount(
  counts: Map<string, number>,
  key: string,
): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function addCountBy(
  counts: Map<string, number>,
  key: string,
  count: number,
): void {
  counts.set(key, (counts.get(key) ?? 0) + count);
}

function addCountRows(
  target: Map<string, number>,
  source: ReadonlyMap<string, number>,
): void {
  for (const [key, count] of source) {
    addCountBy(target, key, count);
  }
}

function emptyDetailFieldCounts(): ReadonlyMap<string, number> {
  return new Map();
}

function subtractCounts(
  left: ReadonlyMap<string, number>,
  right: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const [key, count] of left) {
    const remaining = count - (right.get(key) ?? 0);
    if (remaining !== 0) {
      counts.set(key, remaining);
    }
  }
  return counts;
}
