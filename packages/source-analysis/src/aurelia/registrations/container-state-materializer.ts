import { DependencyAssociationMaterializer } from '../di/index.js';
import { ContainerStateCandidate } from './container-state-candidate.js';
import { ContainerStateEntry } from './container-state-entry.js';
import { ContainerStateOpenSeam } from './container-state-open-seam.js';
import { ContainerStateProvenance } from './container-state-provenance.js';
import { ContainerStateSlot } from './container-state-slot.js';

export interface ContainerStateMaterialization {
  readonly entries: readonly ContainerStateEntry[];
  readonly openSeams: readonly ContainerStateOpenSeam[];
}

export interface ContainerStateMaterializerOptions {
  readonly dependencyMaterializer?: DependencyAssociationMaterializer;
}

export interface ContainerStateMaterializerState {
  readonly dependencyMaterializerState: ReturnType<DependencyAssociationMaterializer['inspectState']>;
}

export class ContainerStateMaterializer {
  private readonly dependencyMaterializer: DependencyAssociationMaterializer;

  constructor(
    options: ContainerStateMaterializerOptions = {},
  ) {
    this.dependencyMaterializer = options.dependencyMaterializer ?? new DependencyAssociationMaterializer();
  }

  materialize(
    candidates: readonly ContainerStateCandidate[],
  ): ContainerStateMaterialization {
    const grouped = new Map<string, ContainerStateCandidate[]>();
    const openSeams: ContainerStateOpenSeam[] = [];

    for (const candidate of candidates) {
      if (candidate.world == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'missing-world',
            candidate.transition.intake.source,
            null,
            'Container-state materialization needs a concrete container world on the transition.',
          ),
        );
        continue;
      }

      if (candidate.key == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'missing-key',
            candidate.transition.intake.source,
            null,
            'Container-state materialization cannot group a transition without a key-space target.',
          ),
        );
        continue;
      }

      if (candidate.resolverBasis == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'missing-resolver-basis',
            candidate.transition.intake.source,
            candidate.key.debugName,
            'Container-state materialization needs resolver/value-form basis separate from lineage.',
          ),
        );
        continue;
      }

      if (candidate.qualification == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'missing-qualification',
            candidate.transition.intake.source,
            candidate.key.debugName,
            'Container-state materialization needs lookup/topology qualification separate from lineage.',
          ),
        );
        continue;
      }

      if (candidate.closureBasis == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'missing-closure-basis',
            candidate.transition.intake.source,
            candidate.key.debugName,
            'Container-state materialization needs a closure basis separate from transition lineage.',
          ),
        );
        continue;
      }

      const groupKey = [
        candidate.world.id,
        candidate.key.id,
        candidate.qualification.lookupRegime ?? 'open',
        candidate.qualification.materializationTiming ?? 'open',
        candidate.qualification.currentWorldSensitivity ?? 'open',
        candidate.qualification.topologyHook ?? 'open',
        candidate.closureBasis.analyzabilityBand ?? 'open',
        [...candidate.closureBasis.openResiduals].sort().join('|'),
      ].join(':');
      const existing = grouped.get(groupKey);
      if (existing == null) {
        grouped.set(groupKey, [candidate]);
      } else {
        existing.push(candidate);
      }
    }

    const entries = [...grouped.values()]
      .map((current, index) => materializeEntry(current, index, openSeams, this.dependencyMaterializer))
      .sort((left, right) => `${left.world.id}:${left.key.id}`.localeCompare(`${right.world.id}:${right.key.id}`));

    // TODO: witness basis, completeness posture, and extension/interoperability
    // qualification are still separate carrier sections above this first
    // keyed-state cut.
    //
    // TODO: policy-generated state from default interface registrations and JIT
    // constructable resolution belongs above explicit transition spending and
    // beneath later lookup publication. Keep that burden explicit until we add
    // a lookup-time state consequence seam.
    return {
      entries,
      openSeams: dedupeOpenSeams([
        ...openSeams,
        new ContainerStateOpenSeam(
          'policy-generated-state-open',
          null,
          null,
          'This pass only spends explicit registration transitions. Default interface registration and JIT constructable policy are still open.',
        ),
      ]),
    };
  }

  inspectState(): ContainerStateMaterializerState {
    return {
      dependencyMaterializerState: this.dependencyMaterializer.inspectState(),
    };
  }
}

function materializeEntry(
  candidates: readonly ContainerStateCandidate[],
  index: number,
  openSeams: ContainerStateOpenSeam[],
  dependencyMaterializer: DependencyAssociationMaterializer,
): ContainerStateEntry {
  const first = candidates[0];
  if (
    first == null
    || first.world == null
    || first.key == null
    || first.qualification == null
    || first.closureBasis == null
  ) {
    throw new Error('Expected grouped transitions to share a concrete world and key.');
  }

  const slots = candidates.map((current, slotIndex) =>
    materializeSlot(current, index, slotIndex, openSeams, dependencyMaterializer),
  );
  const transitions = candidates.map((current) => current.transition);
  const selectedTransition = transitions.at(-1) ?? null;
  const provenance = new ContainerStateProvenance(
    transitions.length > 1 ? 'aggregated' : 'selected',
    selectedTransition,
    transitions,
    transitions.length > 1
      ? 'Multiple transitions landed on the same key in the same world. Direct lookup selects the latest slot while getAll-style reads preserve the full slot set.'
      : 'Single explicit transition for this key in this world.',
  );

  return new ContainerStateEntry(
    `container-state-entry:${first.world.id}:${first.key.id}:${index}`,
    first.world,
    first.key,
    first.qualification,
    first.closureBasis,
    slots,
    provenance,
    slots.length > 1
      ? 'Key materialized as a multi-slot container-state entry.'
      : slots[0]?.note ?? null,
  );
}

function materializeSlot(
  candidate: ContainerStateCandidate,
  entryIndex: number,
  slotIndex: number,
  openSeams: ContainerStateOpenSeam[],
  dependencyMaterializer: DependencyAssociationMaterializer,
): ContainerStateSlot {
  const transition = candidate.transition;
  const resolverBasis = candidate.resolverBasis;
  const payload = transition.production?.payload ?? null;
  const payloadOwner = payload?.type ?? null;
  const source = payload?.source ?? transition.intake.source;

  if (resolverBasis?.strategy == null) {
    openSeams.push(
      new ContainerStateOpenSeam(
        'missing-resolver-basis',
        source,
        candidate.key?.debugName ?? null,
        'Container-state slot stayed open because resolver/value-form basis did not declare a strategy.',
      ),
    );
    return new ContainerStateSlot(
      `container-state-slot:${entryIndex}:${slotIndex}`,
      'open',
      transition,
      resolverBasis,
      payload,
      payloadOwner,
      payload?.targetKey ?? null,
      null,
      'Transition stayed open because no resolver strategy was available on the resolver/value-form basis.',
    );
  }

  switch (resolverBasis.strategy) {
    case 'instance':
      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'instance-value',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        payload?.targetKey ?? null,
        null,
        'Instance strategy closes as an already-materialized value slot.',
      );
    case 'singleton':
    case 'transient': {
      if (payload?.kind !== 'constructable-type' || payload.type == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            payload == null ? 'missing-payload' : 'unsupported-payload',
            source,
            candidate.key?.debugName ?? null,
            payload == null
              ? 'Constructable activation needs a constructable payload so ordinary DI can be spent into activation basis.'
              : `Strategy ${resolverBasis.strategy} currently expects a constructable-type payload, but saw ${payload.kind}.`,
          ),
        );
        return new ContainerStateSlot(
          `container-state-slot:${entryIndex}:${slotIndex}`,
          'open',
          transition,
          resolverBasis,
          payload,
          payloadOwner,
          payload?.targetKey ?? null,
          null,
          'Constructable activation stayed open because the payload was missing or not constructable-backed.',
        );
      }

      const dependencyMaterialization = dependencyMaterializer.materialize(payload.type);
      if (dependencyMaterialization.openSeams.length > 0) {
        openSeams.push(
          new ContainerStateOpenSeam(
            'dependency-materialization-open',
            source,
            candidate.key?.debugName ?? null,
            `Constructable activation for ${candidate.key?.debugName ?? '(anonymous)'} still has ordinary-DI seams: ${dependencyMaterialization.openSeams.map((current) => current.kind).join(', ')}.`,
          ),
        );
      }

      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'constructable-activation',
        transition,
        resolverBasis,
        payload,
        payload.type,
        null,
        dependencyMaterialization,
        `${resolverBasis.strategy === 'singleton' ? 'Singleton' : 'Transient'} strategy closes as constructable activation over ordinary-DI dependency materialization.`,
      );
    }
    case 'callback':
      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'callback-activation',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        null,
        null,
        'Callback strategy closes as a callback-backed activation slot; callback body evaluation remains a later seam.',
      );
    case 'alias': {
      const targetKey = payload?.targetKey ?? null;
      if (targetKey == null) {
        openSeams.push(
          new ContainerStateOpenSeam(
            payload == null ? 'missing-payload' : 'unsupported-payload',
            source,
            candidate.key?.debugName ?? null,
            'Alias-forwarding needs an alias-target payload with a target key.',
          ),
        );
        return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'open',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        null,
          null,
          'Alias strategy stayed open because the target key was missing.',
        );
      }

      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'alias-forward',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        targetKey,
        null,
        'Alias strategy closes as key forwarding to another keyed slot.',
      );
    }
    case 'array-aggregation':
      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'open',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        payload?.targetKey ?? null,
        null,
        'Array aggregation is modeled at the keyed entry shell; this slot remains open until a later resolver-composition seam lands.',
      );
    default:
      return new ContainerStateSlot(
        `container-state-slot:${entryIndex}:${slotIndex}`,
        'open',
        transition,
        resolverBasis,
        payload,
        payloadOwner,
        payload?.targetKey ?? null,
        null,
        `Transition strategy ${String(resolverBasis.strategy)} is not currently materialized into a container-state slot.`,
      );
  }
}

function dedupeOpenSeams(
  seams: readonly ContainerStateOpenSeam[],
): readonly ContainerStateOpenSeam[] {
  const seen = new Set<string>();
  const result: ContainerStateOpenSeam[] = [];
  for (const seam of seams) {
    const key = `${seam.kind}:${seam.location ?? ''}:${seam.note ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(seam);
  }
  return result;
}
