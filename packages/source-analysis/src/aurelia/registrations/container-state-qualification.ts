export const MATERIALIZATION_TIMING_KINDS = [
  'eager',
  'deferred-to-slot',
  'runtime-gated',
] as const;

export type MaterializationTimingKind =
  typeof MATERIALIZATION_TIMING_KINDS[number];

export const LOOKUP_REGIME_KINDS = [
  'direct',
  'ancestor',
  'own',
  'resource',
  'all',
  'factory',
  'new-instance',
] as const;

export type LookupRegimeKind =
  typeof LOOKUP_REGIME_KINDS[number];

export const CURRENT_WORLD_SENSITIVITY_KINDS = [
  'current-world-sensitive',
  'lookup-regime-sensitive',
] as const;

export type CurrentWorldSensitivityKind =
  typeof CURRENT_WORLD_SENSITIVITY_KINDS[number];

export const CONTAINER_STATE_TOPOLOGY_HOOK_KINDS = [
  'none',
  'resource-current-plus-root',
  'own-only-visibility',
  'child-container-fork',
  'parent-resource-inheritance',
  'shared-factory-tree',
] as const;

export type ContainerStateTopologyHookKind =
  typeof CONTAINER_STATE_TOPOLOGY_HOOK_KINDS[number];

// TODO: topology/runtime-hook vocabulary is still a first bounded kernel-grounded
// battery, not a fully reconciled Atlas packet. Keep it explicit and separate
// so later refinement does not force another transition-shape rewrite.
export class ContainerStateQualification {
  constructor(
    readonly lookupRegime: LookupRegimeKind | null,
    readonly materializationTiming: MaterializationTimingKind | null,
    readonly currentWorldSensitivity: CurrentWorldSensitivityKind | null,
    readonly topologyHook: ContainerStateTopologyHookKind | null,
    readonly note: string | null = null,
  ) {}
}
