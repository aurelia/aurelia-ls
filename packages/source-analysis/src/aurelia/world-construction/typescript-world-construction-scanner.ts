import {
  ContainerWorldRef,
  KeyRef,
  type SourceNodeRef,
  type SymbolRef,
} from '../refs.js';
import type { AdmittedSubject } from '../admissions/admitted-subject.js';
import type { ConfigurationContribution } from '../configurations/configuration-contribution.js';
import type { ConfigurationContributions } from '../configurations/configuration-contributions.js';
import type { ResourceDefinition } from '../resources/resource-definition.js';
import type { Resources } from '../resources/resources.js';
import { ContainerStateCandidate } from '../registrations/container-state-candidate.js';
import { ContainerStateClosureBasis } from '../registrations/container-state-closure-basis.js';
import { ContainerStateMaterializer } from '../registrations/container-state-materializer.js';
import { ContainerStateQualification } from '../registrations/container-state-qualification.js';
import { RegistrationPayload } from '../registrations/registration-payload.js';
import { RegistrationIntake } from '../registrations/registration-intake.js';
import { RegistrationProduction } from '../registrations/registration-production.js';
import { RegistrationResolverBasis } from '../registrations/registration-resolver-basis.js';
import { RegistrationTransition } from '../registrations/registration-transition.js';
import {
  TypeScriptWorldConstruction,
  TypeScriptWorldConstructionOpenSeam,
} from './typescript-world-construction.js';

export interface TypeScriptWorldConstructionScannerOptions {
  readonly ownerLabel: string;
  readonly configurationContributions: ConfigurationContributions;
  readonly resources: Resources;
}

export interface TypeScriptWorldConstructionScannerState {
  readonly ownerLabel: string;
  readonly contributionCount: number;
  readonly containerStateMaterializerState: ReturnType<ContainerStateMaterializer['inspectState']>;
}

export class TypeScriptWorldConstructionScanner {
  private readonly ownerLabelValue: string;
  private readonly contributionsValue: ConfigurationContributions;
  private readonly resourcesValue: Resources;
  private readonly containerStateMaterializer = new ContainerStateMaterializer();

  constructor(
    options: TypeScriptWorldConstructionScannerOptions,
  ) {
    this.ownerLabelValue = options.ownerLabel;
    this.contributionsValue = options.configurationContributions;
    this.resourcesValue = options.resources;
  }

  scanAll(): readonly TypeScriptWorldConstruction[] {
    return this.contributionsValue.readAll().map((current, index) => this.materializeContribution(current, index));
  }

  inspectState(): TypeScriptWorldConstructionScannerState {
    return {
      ownerLabel: this.ownerLabelValue,
      contributionCount: this.contributionsValue.readAll().length,
      containerStateMaterializerState: this.containerStateMaterializer.inspectState(),
    };
  }

  private materializeContribution(
    contribution: ConfigurationContribution,
    index: number,
  ): TypeScriptWorldConstruction {
    const owner = contribution.configuration.sourceExport.symbol ?? contribution.configuration.source;
    const world = new ContainerWorldRef(
      `typescript-world:${this.ownerLabelValue}:${contribution.configuration.sourceExport.name}:${index}`,
      owner,
      null,
    );
    const openSeams: TypeScriptWorldConstructionOpenSeam[] = [
      new TypeScriptWorldConstructionOpenSeam(
        'world-placement-open',
        contribution.configuration.sourceExport.name,
        'This first pass materializes a standalone consulted world per configuration surface. Parent/child world placement for app roots and nested configuration composition remains a later seam.',
      ),
    ];

    const visibleResources = readVisibleResources(contribution, this.resourcesValue.readAll(), openSeams);
    const candidates = readContainerStateCandidates(contribution, world, openSeams);
    const containerState = this.containerStateMaterializer.materialize(candidates);

    return new TypeScriptWorldConstruction(
      `typescript-world-construction:${this.ownerLabelValue}:${contribution.configuration.sourceExport.name}`,
      contribution,
      world,
      containerState.entries,
      containerState.openSeams,
      visibleResources,
      dedupeOpenSeams(openSeams),
    );
  }
}

function readVisibleResources(
  contribution: ConfigurationContribution,
  resources: readonly ResourceDefinition[],
  openSeams: TypeScriptWorldConstructionOpenSeam[],
): readonly ResourceDefinition[] {
  // NOTE: resource visibility now bridges admitted exports onto resource owner
  // surfaces, so exported define-call results can converge with source-node-
  // owned resource definitions. Cross-file aliasing, non-exported define
  // results, and local-template synthesis still need a later bridge.
  const matches: ResourceDefinition[] = [];
  const seen = new Set<string>();

  for (const subject of contribution.admittedSubjects) {
    if (subject.carrier !== 'resource-definition' && subject.carrier !== 'registrable-metadata-registry') {
      continue;
    }

    const matched = matchResourceDefinitions(subject, resources);
    if (matched.length === 0) {
      openSeams.push(
        new TypeScriptWorldConstructionOpenSeam(
          'resource-definition-match-open',
          subject.referenceName,
          `Admitted subject ${subject.referenceName} did not close to a resource definition under the current bounded matching rules.`,
        ),
      );
      continue;
    }

    for (const current of matched) {
      if (seen.has(current.id)) {
        continue;
      }
      seen.add(current.id);
      matches.push(current);
    }
  }

  return matches;
}

function matchResourceDefinitions(
  subject: AdmittedSubject,
  resources: readonly ResourceDefinition[],
): readonly ResourceDefinition[] {
  const ownerSurfaces = readAdmittedResourceOwnerSurfaces(subject);
  if (ownerSurfaces.length === 0) {
    return [];
  }

  return resources.filter((current) =>
    matchesAdmittedResourceDefinition(subject, current),
  );
}

function matchesAdmittedResourceDefinition(
  subject: AdmittedSubject,
  definition: ResourceDefinition,
): boolean {
  if (
    subject.carrier !== 'resource-definition'
    && subject.carrier !== 'registrable-metadata-registry'
  ) {
    return false;
  }

  if (
    subject.declarationKind != null
    && definition.kind !== subject.declarationKind
  ) {
    return false;
  }

  const ownerSurfaces = readAdmittedResourceOwnerSurfaces(subject);
  return ownerSurfaces.some((current) => sameOwnerSurface(current, definition.type));
}

function readAdmittedResourceOwnerSurfaces(
  subject: AdmittedSubject,
): readonly (SymbolRef | SourceNodeRef)[] {
  const result: (SymbolRef | SourceNodeRef)[] = [];
  const resolvedExport = subject.resolvedExport;
  const exportedSymbol = resolvedExport?.symbol ?? null;
  const defineTypeSource = resolvedExport?.readValueSurface().defineCall?.typeArgument.source ?? null;

  if (exportedSymbol != null) {
    result.push(exportedSymbol);
  }

  if (
    defineTypeSource != null
    && !result.some((current) => sameOwnerSurface(current, defineTypeSource))
  ) {
    result.push(defineTypeSource);
  }

  return result;
}

function sameOwnerSurface(
  left: SymbolRef | SourceNodeRef,
  right: SymbolRef | SourceNodeRef,
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function readContainerStateCandidates(
  contribution: ConfigurationContribution,
  world: ContainerWorldRef,
  openSeams: TypeScriptWorldConstructionOpenSeam[],
): readonly ContainerStateCandidate[] {
  // TODO: keyed container-state derivation is intentionally narrow here:
  // - explicit Registration.* helper calls still need key/payload recovery
  // - resource-definition and registrable-metadata subjects still need their
  //   resource-specific keyed registration consequences
  // - registry objects still need returned-register-body spending
  const candidates: ContainerStateCandidate[] = [];
  const seen = new Set<string>();

  for (const production of contribution.directProductions) {
    if (production.production.targetKey == null) {
      openSeams.push(
        new TypeScriptWorldConstructionOpenSeam(
          'production-state-open',
          production.ownerConfiguration.sourceExport.name,
          `Direct production ${production.production.kind} is visible in ${production.ownerConfiguration.sourceExport.name}, but keyed state is still open until call-argument key/payload recovery lands.`,
        ),
      );
    }
  }

  for (const subject of contribution.admittedSubjects) {
    switch (subject.carrier) {
      case 'service': {
        const candidate = materializeServiceCandidate(subject, world);
        if (candidate == null) {
          openSeams.push(
            new TypeScriptWorldConstructionOpenSeam(
              'production-state-open',
              subject.referenceName,
              `Service subject ${subject.referenceName} is visible, but self-registration stayed open because the export was not a class-backed declaration under the current bounded reader.`,
            ),
          );
          continue;
        }

        if (seen.has(candidate.id)) {
          continue;
        }
        seen.add(candidate.id);
        candidates.push(candidate);
        break;
      }
      case 'registry':
        openSeams.push(
          new TypeScriptWorldConstructionOpenSeam(
            'registry-state-open',
            subject.referenceName,
            `Registry subject ${subject.referenceName} remains a world-construction input rather than a direct keyed state candidate in this first pass.`,
          ),
        );
        break;
      case 'renderer':
        openSeams.push(
          new TypeScriptWorldConstructionOpenSeam(
            'renderer-state-open',
            subject.referenceName,
            `Renderer subject ${subject.referenceName} is admitted by configuration, but renderer materialization is intentionally offline while the compiler substrate is being rebuilt.`,
          ),
        );
        break;
      case 'resource-definition':
      case 'registrable-metadata-registry':
        openSeams.push(
          new TypeScriptWorldConstructionOpenSeam(
            'resource-registration-state-open',
            subject.referenceName,
            `Resource subject ${subject.referenceName} is visible in the consulted world, but its resource-specific keyed registration consequence is not yet decompressed into container-state candidates here.`,
          ),
        );
        break;
      default:
        break;
    }
  }

  return candidates;
}

function materializeServiceCandidate(
  subject: AdmittedSubject,
  world: ContainerWorldRef,
): ContainerStateCandidate | null {
  const resolvedExport = subject.resolvedExport;
  const owner = resolvedExport?.symbol;
  if (owner == null || resolvedExport?.readValueSurface().kind !== 'class-declaration') {
    return null;
  }

  const key = new KeyRef(
    `key:constructable:${owner.id}`,
    'constructable',
    owner,
    owner.name ?? subject.referenceName,
  );
  const intake = new RegistrationIntake(
    `registration-intake:direct-class:${owner.id}`,
    'direct-register-call',
    subject.source,
    owner,
    world,
    [],
    'Direct class registration argument over container.register(...).',
  );
  const payload = new RegistrationPayload(
    'constructable-type',
    subject.source,
    owner,
    null,
    'Constructable payload recovered from a direct class registration argument.',
  );
  const production = new RegistrationProduction(
    `registration-production:direct-class:${owner.id}`,
    'configuration-register',
    owner,
    subject.source,
    world,
    key,
    payload,
    'Synthetic direct class registration production for world-construction spending.',
  );
  const transition = new RegistrationTransition(
    `registration-transition:direct-class:${owner.id}`,
    intake,
    production,
    null,
    'key-space-addition',
    'Container.register(Class) self-registration consequence over a plain service class. TODO: stage vocabulary for plain class register inputs is still provisional here.',
  );

  return new ContainerStateCandidate(
    `container-state-candidate:service:${owner.id}`,
    world,
    key,
    transition,
    new RegistrationResolverBasis(
      'singleton',
      'Plain class registration in kernel closes as singleton self-registration.',
    ),
    new ContainerStateQualification(
      'direct',
      'eager',
      'lookup-regime-sensitive',
      'none',
      'Service self-registration closes under generic direct lookup in the current world.',
    ),
    new ContainerStateClosureBasis(
      'statically-closable',
      [],
      'Closed from direct admitted service subject plus bounded class-declaration grounding.',
    ),
    'Derived from admitted plain service subject in a configuration register(...) surface.',
  );
}

function dedupeOpenSeams(
  seams: readonly TypeScriptWorldConstructionOpenSeam[],
): readonly TypeScriptWorldConstructionOpenSeam[] {
  const seen = new Set<string>();
  const result: TypeScriptWorldConstructionOpenSeam[] = [];
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
