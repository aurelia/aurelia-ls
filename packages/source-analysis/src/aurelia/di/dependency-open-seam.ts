import type { SourceNodeRef } from '../refs.js';
import { OpenSeamEvidence } from '../provenance/index.js';

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
  readonly evidence: OpenSeamEvidence<DependencyOpenSeamKind>;

  constructor(
    readonly kind: DependencyOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {
    this.evidence = OpenSeamEvidence.fromSourceNode(kind, source, location, note);
  }
}
