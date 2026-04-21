export const ANALYZABILITY_BAND_KINDS = [
  'statically-closable',
  'bounded-deeper-interpretation',
  'convention-assisted',
  'heuristic-detection-only',
  'runtime-only',
] as const;

export type AnalyzabilityBandKind =
  typeof ANALYZABILITY_BAND_KINDS[number];

export const OPEN_RESIDUAL_KINDS = [
  'callback-body-opaque',
  'dynamic-key-emission',
  'lifecycle-gated-activity',
  'child-world-visibility-qualified',
  'configuration-history-open',
] as const;

export type OpenResidualKind =
  typeof OPEN_RESIDUAL_KINDS[number];

// TODO: witness basis, completeness posture, and extension qualification are
// still separate carrier sections above this first closure-basis cut. Do not
// treat this class as the full closure envelope yet.
export class ContainerStateClosureBasis {
  constructor(
    readonly analyzabilityBand: AnalyzabilityBandKind | null,
    readonly openResiduals: readonly OpenResidualKind[] = [],
    readonly note: string | null = null,
  ) {}
}
