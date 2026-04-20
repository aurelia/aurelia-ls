export const EXPORT_CLASSIFICATION_KINDS = [
  'value-like',
  'type-like',
  'namespace-like',
  'resource-candidate',
  'registry-candidate',
  'unknown',
] as const;

export type ExportClassificationKind =
  typeof EXPORT_CLASSIFICATION_KINDS[number];

export class ExportSurface {
  constructor(
    readonly exportedName: string,
    readonly symbolName: string | null,
    readonly sourceFilePath: string | null,
  ) {}
}

export class ExportClassification {
  constructor(
    readonly kind: ExportClassificationKind,
    readonly reasons: readonly string[] = [],
  ) {}
}

export interface ExportsState {
  readonly ownerLabel: string;
  readonly allCached: boolean;
  readonly valueSurfacesCached: number;
  readonly classificationsCached: number;
}
