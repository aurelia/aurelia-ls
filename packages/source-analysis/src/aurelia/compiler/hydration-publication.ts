import {
  findKnownImportedInterfaceKey,
} from '../di/index.js';
import type { ContainerWorldRef, KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import {
  ContainerStateOpenSeam,
  type ContainerStateMaterialization,
  ContainerStateCandidate,
  ContainerStateClosureBasis,
  ContainerStateMaterializer,
  ContainerStateQualification,
  RegistrationIntake,
  RegistrationPayload,
  RegistrationProduction,
  RegistrationResolverBasis,
  RegistrationTransition,
} from '../registrations/index.js';
import type { AuSlotsInfo } from './au-slots-info.js';
import type { Controller, RenderLocation } from './controller.js';
import type { HydrationContext } from './hydration-context.js';
import type {
  PreparedHydrateAttributeInstruction,
  PreparedHydrateElementInstruction,
  PreparedHydrateTemplateControllerInstruction,
} from './prepared-resource-hydration.js';
import type { ViewFactory } from './view-factory.js';

export const HYDRATION_PUBLICATION_TOKEN_KINDS = [
  'IController',
  'IInstruction',
  'IRenderLocation',
  'IViewFactory',
  'IAuSlotsInfo',
  'IHydrationContext',
] as const;

export type HydrationPublicationTokenKind =
  typeof HYDRATION_PUBLICATION_TOKEN_KINDS[number];

export const HYDRATION_PUBLICATION_BOUNDARY_KINDS = [
  'create-element-container',
  'invoke-attribute',
  'controller-hydration-context',
] as const;

export type HydrationPublicationBoundaryKind =
  typeof HYDRATION_PUBLICATION_BOUNDARY_KINDS[number];

export const HYDRATION_PUBLICATION_AVAILABILITY_KINDS = [
  'value',
  'nullable',
  'empty-default',
  'throwing',
] as const;

export type HydrationPublicationAvailabilityKind =
  typeof HYDRATION_PUBLICATION_AVAILABILITY_KINDS[number];

export type HydrationPublishedValue =
  | Controller
  | PreparedHydrateElementInstruction
  | PreparedHydrateAttributeInstruction
  | PreparedHydrateTemplateControllerInstruction
  | RenderLocation
  | ViewFactory
  | AuSlotsInfo
  | HydrationContext;

export class HydrationPublication {
  readonly key: KeyRef | null;

  constructor(
    readonly token: HydrationPublicationTokenKind,
    readonly availability: HydrationPublicationAvailabilityKind,
    readonly value: HydrationPublishedValue | null = null,
    readonly note: string | null = null,
    readonly source: SourceNodeRef | null = null,
  ) {
    this.key = readHydrationPublicationKey(token);
  }
}

export class HydrationPublicationContract {
  constructor(
    readonly boundary: HydrationPublicationBoundaryKind,
    readonly publications: readonly HydrationPublication[] = [],
    readonly note: string | null = null,
  ) {}

  find(
    token: HydrationPublicationTokenKind,
  ): HydrationPublication | null {
    return this.publications.find((current) => current.token === token) ?? null;
  }

  findByKey(
    key: KeyRef | null,
  ): HydrationPublication | null {
    if (key == null) {
      return null;
    }
    return this.publications.find((current) => current.key?.id === key.id) ?? null;
  }

  publishes(
    token: HydrationPublicationTokenKind,
  ): boolean {
    return this.find(token) != null;
  }
}

export class HydrationPublicationStateMaterializer {
  private readonly containerStateMaterializer = new ContainerStateMaterializer();

  materialize(
    owner: SymbolRef | SourceNodeRef,
    world: ContainerWorldRef,
    boundarySource: SourceNodeRef | null,
    contract: HydrationPublicationContract,
  ): ContainerStateMaterialization {
    // TODO: this closes child-container publication as keyed overlay state, but
    // it still stops beneath lookup-time behavior such as
    // fromHydrationContext(key) => hydrationContext.controller.container.get(own(key))
    // and provider evaluation order. Keep those in a later container/lookup
    // seam rather than collapsing them into the publication row.
    const preOpenSeams: ContainerStateOpenSeam[] = [];
    const candidates = contract.publications.flatMap((current, index) =>
      this.materializeCandidate(owner, world, boundarySource, contract, current, index, preOpenSeams),
    );
    const materialized = this.containerStateMaterializer.materialize(candidates);
    return {
      entries: materialized.entries,
      openSeams: [...preOpenSeams, ...materialized.openSeams],
    };
  }

  private materializeCandidate(
    owner: SymbolRef | SourceNodeRef,
    world: ContainerWorldRef,
    boundarySource: SourceNodeRef | null,
    contract: HydrationPublicationContract,
    publication: HydrationPublication,
    index: number,
    openSeams: ContainerStateOpenSeam[],
  ): readonly ContainerStateCandidate[] {
    const source = publication.source ?? boundarySource ?? readOwnerDeclarationSource(owner);
    if (source == null) {
      openSeams.push(
        new ContainerStateOpenSeam(
          'missing-source',
          null,
          publication.token,
          `Hydration publication ${publication.token} could not recover a concrete boundary source, so keyed child-container spending stayed open.`,
        ),
      );
      return [];
    }

    if (publication.key == null) {
      openSeams.push(
        new ContainerStateOpenSeam(
          'missing-key',
          source,
          publication.token,
          `Hydration publication ${publication.token} did not close to a concrete interface-key identity.`,
        ),
      );
      return [];
    }

    const production = new RegistrationProduction(
      `hydration-publication:${contract.boundary}:${publication.token}:${index}`,
      readPublicationProductionKind(publication.availability),
      owner,
      source,
      world,
      publication.key,
      readPublicationPayload(publication, source),
      publication.note,
    );
    const intake = new RegistrationIntake(
      `hydration-publication-intake:${contract.boundary}:${publication.token}:${index}`,
      'container-boundary-publication',
      source,
      owner,
      world,
      [production],
      `Runtime-shaped ${contract.boundary} publication of ${publication.token}.`,
    );
    const transition = new RegistrationTransition(
      `hydration-publication-transition:${contract.boundary}:${publication.token}:${index}`,
      intake,
      production,
      null,
      'child-container-publication',
      `Runtime-shaped ${contract.boundary} publication of ${publication.token} into the child container.`,
    );

    return [
      new ContainerStateCandidate(
        `hydration-publication-candidate:${contract.boundary}:${publication.token}:${index}`,
        world,
        publication.key,
        transition,
        new RegistrationResolverBasis(
          readPublicationStrategy(publication.availability),
          `Hydration publication ${publication.token} resolves through ${publication.availability} provider posture.`,
        ),
        new ContainerStateQualification(
          'direct',
          'runtime-gated',
          'current-world-sensitive',
          'child-container-fork',
          `${publication.token} is published into a child container that only exists at the ${contract.boundary} hydration boundary.`,
        ),
        new ContainerStateClosureBasis(
          'statically-closable',
          ['lifecycle-gated-activity', 'child-world-visibility-qualified'],
          `${publication.token} is structurally known, but only becomes available once the ${contract.boundary} boundary is entered in runtime hydration.`,
        ),
        `Container overlay candidate derived from ${contract.boundary} publication ${publication.token}.`,
      ),
    ];
  }
}

function readOwnerDeclarationSource(
  owner: SymbolRef | SourceNodeRef,
): SourceNodeRef | null {
  return owner.kind === 'source-node'
    ? owner
    : owner.declaration;
}

function readHydrationPublicationKey(
  token: HydrationPublicationTokenKind,
): KeyRef | null {
  switch (token) {
    case 'IInstruction':
      return findKnownImportedInterfaceKey('@aurelia/template-compiler', token)?.key ?? null;
    case 'IController':
    case 'IRenderLocation':
    case 'IViewFactory':
    case 'IAuSlotsInfo':
    case 'IHydrationContext':
      return findKnownImportedInterfaceKey('@aurelia/runtime-html', token)?.key ?? null;
    default:
      return null;
  }
}

function readPublicationProductionKind(
  availability: HydrationPublicationAvailabilityKind,
): RegistrationProduction['kind'] {
  switch (availability) {
    case 'nullable':
      return 'null-provider';
    case 'throwing':
      return 'throwing-provider';
    case 'value':
    case 'empty-default':
      return 'instance-provider';
  }
}

function readPublicationStrategy(
  availability: HydrationPublicationAvailabilityKind,
): RegistrationResolverBasis['strategy'] {
  switch (availability) {
    case 'nullable':
      return 'null-provider';
    case 'throwing':
      return 'throwing';
    case 'value':
    case 'empty-default':
      return 'instance';
  }
}

function readPublicationPayload(
  publication: HydrationPublication,
  source: SourceNodeRef,
): RegistrationPayload | null {
  if (publication.availability === 'nullable' || publication.availability === 'throwing') {
    return null;
  }

  return new RegistrationPayload(
    'instance-value',
    source,
    null,
    null,
    publication.availability === 'empty-default'
      ? `Hydration publication ${publication.token} resolves through a default empty instance provider.`
      : `Hydration publication ${publication.token} resolves through a concrete instance provider.`,
  );
}
