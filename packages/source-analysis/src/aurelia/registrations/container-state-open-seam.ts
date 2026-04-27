import type { SourceNodeRef } from '../refs.js';
import { OpenSeamEvidence } from '../provenance/evidence.js';

export const CONTAINER_STATE_OPEN_SEAM_KINDS = [
  'missing-source',
  'missing-world',
  'missing-key',
  'missing-resolver-basis',
  'missing-qualification',
  'missing-closure-basis',
  'missing-payload',
  'unsupported-payload',
  'reference-resolution-open',
  'unsupported-subject',
  'resource-registration-open',
  'dependency-materialization-open',
  'policy-generated-state-open',
] as const;

export type ContainerStateOpenSeamKind =
  typeof CONTAINER_STATE_OPEN_SEAM_KINDS[number];

export class ContainerStateOpenSeam {
  readonly evidence: OpenSeamEvidence<ContainerStateOpenSeamKind>;

  constructor(
    readonly kind: ContainerStateOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {
    this.evidence = OpenSeamEvidence.fromSourceNode(kind, source, location, note);
  }
}
