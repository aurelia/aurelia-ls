import type { Export } from '../exports/export.js';
import type { SourceNodeRef } from '../refs.js';

export class BundleArray {
  constructor(
    readonly id: string,
    readonly sourceExport: Export,
    readonly source: SourceNodeRef,
    readonly elementCount: number,
    readonly elementNames: readonly string[] = [],
    readonly note: string | null = null,
  ) {}
}
