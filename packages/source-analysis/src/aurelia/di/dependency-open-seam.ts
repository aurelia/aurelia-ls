import type { SourceNodeRef } from '../refs.js';

export const DEPENDENCY_OPEN_SEAM_KINDS = [
  'missing-declaration',
  'unsupported-carrier',
  'design-paramtypes-open',
  'prototype-fallback-open',
  'implicit-inject-open',
  'implicit-field-inject-open',
] as const;

export type DependencyOpenSeamKind =
  typeof DEPENDENCY_OPEN_SEAM_KINDS[number];

export class DependencyOpenSeam {
  constructor(
    readonly kind: DependencyOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}
