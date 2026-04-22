import ts from 'typescript';

import { readParsedSourceFile, type BoundedReferenceSeedKind } from '../analysis/index.js';
import { DependencyRequest, DependencySubjectResolver } from '../di/index.js';
import type {
  SourceNodeRef,
  SymbolRef,
  ContainerWorldRef,
} from '../refs.js';
import type { ResourceDefinition } from '../resources/index.js';
import { ContainerStateCandidate } from './container-state-candidate.js';
import { ContainerStateClosureBasis } from './container-state-closure-basis.js';
import { type ContainerStateMaterialization, ContainerStateMaterializer } from './container-state-materializer.js';
import { ContainerStateOpenSeam } from './container-state-open-seam.js';
import { ContainerStateQualification } from './container-state-qualification.js';
import { RegistrationIntake, type RegistrationIntakeKind } from './registration-intake.js';
import { RegistrationPayload } from './registration-payload.js';
import { RegistrationProduction } from './registration-production.js';
import { RegistrationResolverBasis } from './registration-resolver-basis.js';
import { RegistrationTransition, type RegistrationTransitionClassKind } from './registration-transition.js';

export interface DirectRegisterReferenceInput {
  readonly id: string;
  readonly source: SourceNodeRef;
  readonly referenceName: string;
  readonly seedKind: BoundedReferenceSeedKind;
  readonly note?: string | null;
}

export interface DirectRegisterReferenceMaterializationOptions {
  readonly owner: SymbolRef | SourceNodeRef;
  readonly world: ContainerWorldRef;
  readonly visibleResources?: readonly ResourceDefinition[];
  readonly intakeKind: RegistrationIntakeKind;
  readonly transitionClass: RegistrationTransitionClassKind;
  readonly lookupRegime: 'direct' | 'own';
  readonly materializationTiming: 'eager' | 'deferred-to-slot' | 'runtime-gated';
  readonly currentWorldSensitivity: 'lookup-regime-sensitive' | 'current-world-sensitive';
  readonly topologyHook: 'none' | 'child-container-fork';
  readonly closureResiduals?: readonly import('./container-state-closure-basis.js').OpenResidualKind[];
  readonly contextLabel: string;
  readonly note?: string | null;
}

export class DirectRegisterReferenceMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();
  private readonly subjectResolver = new DependencySubjectResolver();
  private readonly containerStateMaterializer = new ContainerStateMaterializer();

  materialize(
    inputs: readonly DirectRegisterReferenceInput[],
    options: DirectRegisterReferenceMaterializationOptions,
  ): ContainerStateMaterialization {
    const preOpenSeams: ContainerStateOpenSeam[] = [];
    const candidates = inputs.flatMap((current, index) =>
      this.materializeCandidate(current, options, index, preOpenSeams),
    );
    const materialized = this.containerStateMaterializer.materialize(candidates);
    return {
      entries: materialized.entries,
      openSeams: dedupeOpenSeams([
        ...preOpenSeams,
        ...materialized.openSeams,
      ]),
    };
  }

  private materializeCandidate(
    input: DirectRegisterReferenceInput,
    options: DirectRegisterReferenceMaterializationOptions,
    index: number,
    openSeams: ContainerStateOpenSeam[],
  ): readonly ContainerStateCandidate[] {
    const sourceFile = readParsedSourceFile(this.parsedFiles, input.source.file);
    if (sourceFile == null) {
      openSeams.push(
        new ContainerStateOpenSeam(
          'reference-resolution-open',
          input.source,
          input.referenceName,
          `${options.contextLabel} could not parse the source file for direct register input ${input.referenceName}.`,
        ),
      );
      return [];
    }

    const resolution = this.subjectResolver.resolveInSourceFile(
      new DependencyRequest(
        'direct-key',
        input.source,
        input.seedKind,
        input.referenceName,
        [],
        null,
        input.note ?? null,
      ),
      input.source.file,
      sourceFile,
    );
    const subject = resolution.subject;
    if (subject.kind !== 'constructable' || subject.key == null || subject.owner == null) {
      openSeams.push(
        new ContainerStateOpenSeam(
          subject.kind === 'open' ? 'reference-resolution-open' : 'unsupported-subject',
          input.source,
          input.referenceName,
          subject.kind === 'interface-symbol'
            ? `${options.contextLabel} direct register input ${input.referenceName} closed to an interface key, but interface-key register(...) semantics still need a later registry-default slice.`
            : `${options.contextLabel} direct register input ${input.referenceName} did not close to a constructable class-backed registry under the current bounded reader.`,
        ),
      );
      return [];
    }

    const payload = new RegistrationPayload(
      'constructable-type',
      input.source,
      subject.owner,
      null,
      `${options.contextLabel} direct register input ${input.referenceName} closes as constructable activation input.`,
    );
    const production = new RegistrationProduction(
      `direct-register-reference:${options.contextLabel}:${subject.key.id}:${index}`,
      'implementation-register',
      options.owner,
      input.source,
      options.world,
      subject.key,
      payload,
      `${options.contextLabel} direct register input ${input.referenceName}.`,
    );
    const intake = new RegistrationIntake(
      `direct-register-reference-intake:${options.contextLabel}:${subject.key.id}:${index}`,
      options.intakeKind,
      input.source,
      options.owner,
      options.world,
      [production],
      `${options.contextLabel} spends a direct register reference ${input.referenceName}.`,
    );
    const transition = new RegistrationTransition(
      `direct-register-reference-transition:${options.contextLabel}:${subject.key.id}:${index}`,
      intake,
      production,
      null,
      options.transitionClass,
      `${options.contextLabel} spends direct register input ${input.referenceName} into keyed container state.`,
    );

    const matchedResource = findVisibleResourceByType(subject.owner, options.visibleResources ?? []);
    if (matchedResource != null) {
      openSeams.push(
        new ContainerStateOpenSeam(
          'resource-registration-open',
          input.source,
          input.referenceName,
          `${options.contextLabel} direct register input ${input.referenceName} appears to be a resource class. The constructable self-registration is closed here, but resource-key alias publication and visible-resource child-world consequence still belong to a later slice.`,
        ),
      );
    }

    return [
      new ContainerStateCandidate(
        `direct-register-reference-candidate:${options.contextLabel}:${subject.key.id}:${index}`,
        options.world,
        subject.key,
        transition,
        new RegistrationResolverBasis(
          'singleton',
          `${options.contextLabel} direct register input ${input.referenceName} closes as singleton self-registration over the constructable key.`,
        ),
        new ContainerStateQualification(
          options.lookupRegime,
          options.materializationTiming,
          options.currentWorldSensitivity,
          options.topologyHook,
          `${options.contextLabel} direct register input ${input.referenceName} contributes keyed container state.`,
        ),
        new ContainerStateClosureBasis(
          'statically-closable',
          options.closureResiduals ?? [],
          `${options.contextLabel} direct register input ${input.referenceName} is structurally known under the current bounded subject-resolution pass.`,
        ),
        options.note ?? `${options.contextLabel} direct register input ${input.referenceName}.`,
      ),
    ];
  }
}

// TODO: this bounded materializer currently closes only the constructable
// singleton/self-registration subset of container.register(Foo). It still
// leaves later seams explicit for:
// - resource-key alias publication and child-world resource visibility
// - interface-key register(...) defaults
// - richer IRegistry/object-bag inputs beyond direct class-backed references

function findVisibleResourceByType(
  owner: SymbolRef | SourceNodeRef,
  resources: readonly ResourceDefinition[],
): ResourceDefinition | null {
  for (const current of resources) {
    if (current.type.kind === 'symbol' && owner.kind === 'symbol' && current.type.id === owner.id) {
      return current;
    }

    if (
      current.type.kind === 'symbol'
      && owner.kind === 'symbol'
      && current.type.name != null
      && owner.name != null
      && current.type.name === owner.name
      && current.type.declaration?.file.id === owner.file?.id
    ) {
      return current;
    }
  }

  return null;
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
