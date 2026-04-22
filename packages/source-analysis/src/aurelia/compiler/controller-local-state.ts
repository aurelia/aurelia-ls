import type {
  ContainerWorldRef,
  SourceNodeRef,
} from '../refs.js';
import { KeyRef } from '../refs.js';
import type { ResourceDefinitionType } from '../resources/contracts.js';
import type { ResourceDefinition } from '../resources/index.js';
import type { CustomElementDependencyContribution } from '../resources/custom-element-support.js';
import type { CustomAttributeDependencyContribution } from '../resources/custom-attribute-support.js';
import {
  ContainerStateCandidate,
  ContainerStateClosureBasis,
  ContainerStateMaterializer,
  ContainerStateOpenSeam,
  ContainerStateQualification,
  DirectRegisterReferenceMaterializer,
  RegistrationIntake,
  RegistrationPayload,
  RegistrationProduction,
  RegistrationResolverBasis,
  RegistrationTransition,
  type ContainerStateMaterialization,
} from '../registrations/index.js';

export class ControllerLocalStateMaterializer {
  private readonly containerStateMaterializer = new ContainerStateMaterializer();
  private readonly directRegisterReferenceMaterializer = new DirectRegisterReferenceMaterializer();

  materializeDefinitionTypeInstance(
    type: ResourceDefinitionType,
    world: ContainerWorldRef,
    boundarySource: SourceNodeRef | null,
    ownerLabel: string,
  ): ContainerStateMaterialization {
    const source = readTypeSource(type, boundarySource);
    if (source == null) {
      return {
        entries: [],
        openSeams: [],
      };
    }

    const key = createConstructableKey(type);
    const production = new RegistrationProduction(
      `controller-local-state:${ownerLabel}:${key.id}`,
      'instance-provider',
      type,
      source,
      world,
      key,
      new RegistrationPayload(
        'instance-value',
        source,
        type,
        key,
        'Tooling-owned instance-like payload for definition.Type self-registration. The clean-room does not materialize a separate runtime view-model object here.',
      ),
      `Controller-owned definition.Type self-registration for ${ownerLabel}.`,
    );
    const intake = new RegistrationIntake(
      `controller-local-state-intake:${ownerLabel}:${key.id}`,
      'container-boundary-publication',
      source,
      type,
      world,
      [production],
      `Runtime-shaped controller-owned self-registration of definition.Type for ${ownerLabel}.`,
    );
    const transition = new RegistrationTransition(
      `controller-local-state-transition:${ownerLabel}:${key.id}`,
      intake,
      production,
      null,
      'child-container-publication',
      `Controller-owned definition.Type self-registration for ${ownerLabel}.`,
    );
    return this.containerStateMaterializer.materialize([
      new ContainerStateCandidate(
        `controller-local-state-candidate:${ownerLabel}:${key.id}`,
        world,
        key,
        transition,
        new RegistrationResolverBasis(
          'instance',
          `definition.Type resolves as an instance-like slot inside the ${ownerLabel} child container.`,
        ),
        new ContainerStateQualification(
          'direct',
          'runtime-gated',
          'current-world-sensitive',
          'child-container-fork',
          `definition.Type is controller-owned child-container state for ${ownerLabel}.`,
        ),
        new ContainerStateClosureBasis(
          'statically-closable',
          ['lifecycle-gated-activity'],
          `definition.Type self-registration is structurally known for ${ownerLabel}, but only becomes available once that controller boundary exists.`,
        ),
        `Controller-owned definition.Type state candidate for ${ownerLabel}.`,
      ),
    ]);
  }

  materializeDefinitionDependencies(
    dependencies: CustomElementDependencyContribution | CustomAttributeDependencyContribution,
    visibleResources: readonly ResourceDefinition[],
    world: ContainerWorldRef,
    boundarySource: SourceNodeRef | null,
    ownerLabel: string,
  ): ContainerStateMaterialization {
    const preOpenSeams: ContainerStateOpenSeam[] = [];
    const inputs = dependencies.entries.flatMap((current, index) => {
      const source = current.witness.source ?? boundarySource;
      if (source == null) {
        preOpenSeams.push(
          new ContainerStateOpenSeam(
            'missing-source',
            null,
            current.referenceName,
            `${ownerLabel} definition.dependencies entry ${current.referenceName ?? '(anonymous)'} did not recover a concrete source witness.`,
          ),
        );
        return [];
      }

      if (current.referenceName == null) {
        preOpenSeams.push(
          new ContainerStateOpenSeam(
            'reference-resolution-open',
            source,
            null,
            `${ownerLabel} definition.dependencies entry did not yield a stable direct register reference name under the current bounded reader.`,
          ),
        );
        return [];
      }

      return [{
        id: `controller-local-dependency:${ownerLabel}:${current.referenceName}:${index}`,
        source,
        referenceName: current.referenceName,
        seedKind: current.linkSeedKind,
        note: current.note,
      }];
    });

    if (inputs.length === 0) {
      return {
        entries: [],
        openSeams: preOpenSeams,
      };
    }

    const materialized = this.directRegisterReferenceMaterializer.materialize(inputs, {
      owner: readDependencyOwner(dependencies, visibleResources) ?? boundarySource ?? inputs[0]!.source,
      world,
      visibleResources,
      intakeKind: 'resource-definition-register',
      transitionClass: 'child-container-publication',
      lookupRegime: 'direct',
      materializationTiming: 'runtime-gated',
      currentWorldSensitivity: 'current-world-sensitive',
      topologyHook: 'child-container-fork',
      closureResiduals: ['lifecycle-gated-activity'],
      contextLabel: `${ownerLabel} definition.dependencies`,
      note: `${ownerLabel} definition.dependencies direct register consequence.`,
    });
    return {
      entries: materialized.entries,
      openSeams: [
        ...preOpenSeams,
        ...materialized.openSeams,
      ],
    };
  }
}

// TODO: runtime controller-owned local state also includes a richer follow-on
// story than definition.Type alone:
// - definition.dependencies resource-key visibility and richer registry-object
//   consequence beyond the bounded direct-register constructable subset
// - custom-element self-registration for recursive components during hydrate
// - injectable aliases and other controller-local helpers
//
// Keep those open until we can spend them as real keyed overlay state rather
// than collapsing them into informal notes.

function createConstructableKey(
  type: ResourceDefinitionType,
): KeyRef {
  return new KeyRef(
    `key:constructable:${type.id}`,
    'constructable',
    type,
    readTypeName(type),
  );
}

function readTypeName(
  type: ResourceDefinitionType,
): string {
  if (type.kind === 'symbol') {
    return type.name ?? type.id;
  }

  return type.id;
}

function readTypeSource(
  type: ResourceDefinitionType,
  boundarySource: SourceNodeRef | null,
): SourceNodeRef | null {
  if (boundarySource != null) {
    return boundarySource;
  }

  return type.kind === 'symbol'
    ? type.declaration
    : type;
}

function readDependencyOwner(
  dependencies: CustomElementDependencyContribution | CustomAttributeDependencyContribution,
  visibleResources: readonly ResourceDefinition[],
) {
  const contributionSource = dependencies.readProvenance()?.selected?.source
    ?? dependencies.readProvenance()?.contributors[0]?.source
    ?? null;
  if (contributionSource != null) {
    return contributionSource;
  }

  const resource = visibleResources.find((current) =>
    (current.kind === 'custom-element'
      || current.kind === 'custom-attribute'
      || current.kind === 'template-controller')
    && current.dependencies === dependencies,
  );
  if (resource != null) {
    return resource.type;
  }

  return null;
}
