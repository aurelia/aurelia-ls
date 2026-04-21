import type { SourceNodeRef } from '../refs.js';

export const CONTAINER_STATE_OPEN_SEAM_KINDS = [
  'missing-world',
  'missing-key',
  'missing-resolver-basis',
  'missing-qualification',
  'missing-closure-basis',
  'missing-payload',
  'unsupported-payload',
  'dependency-materialization-open',
  'policy-generated-state-open',
] as const;

export type ContainerStateOpenSeamKind =
  typeof CONTAINER_STATE_OPEN_SEAM_KINDS[number];

export class ContainerStateOpenSeam {
  constructor(
    readonly kind: ContainerStateOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}
