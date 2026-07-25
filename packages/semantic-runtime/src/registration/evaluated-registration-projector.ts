import ts from 'typescript';

import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  AureliaInterfaceDefaultRegistrationState,
  aureliaAppTaskEvaluationForValue,
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistryBodyForEvaluationValue,
  type AureliaInterfaceDefaultRegistrationEffect,
} from '../configuration/aurelia-evaluation-runtime.js';
import {
  RegistrationAdmissionKind,
  RegistrationKeyRole,
  RegistrationStrategy,
} from './registration-admission.js';
import {
  classifyEvaluatedRegistrationValue,
  EvaluatedRegistrationClassificationKind,
} from './evaluated-registration-classifier.js';
import {
  registrationAdmissionForEvaluatedFactory,
  evaluatedRegistrationValueObservation,
  type EvaluatedRegistrationFactoryContext,
} from './evaluated-registration-factory.js';
import {
  evaluatedConstructableValueSource,
  evaluatedRegistryValueObservation,
  evaluatedValueLocalName,
  isDeclarationValueNode,
  type EvaluatedRegistrationValueContext,
} from './evaluated-registration-value.js';
import { traceNameForFrameworkRegistrationKind } from './framework-registration-manifest.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistrationValueKind,
} from './registration-reference.js';

export interface EvaluatedRegistrationProjectionContext
  extends EvaluatedRegistrationFactoryContext, EvaluatedRegistrationValueContext {}

export type SourceRegistrationFactoryProjection = (
  expression: ts.Expression,
  admissionKind: RegistrationAdmissionKind,
) => RegistrationAdmissionObservation | null;

/**
 * Project one exact evaluator value through Aurelia's `Container.register(...)` dispatch.
 *
 * Configuration recognition and candidate-local DI application must share this projector. The optional source
 * fallback exists only for syntax that evaluation did not retain; DI application deliberately omits it.
 */
export function projectEvaluatedRegistrationValue(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationValue | null,
  openSeams: readonly EvaluationOpenSeam[],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  localNameHint: string | null = null,
  sourceFactoryProjection: SourceRegistrationFactoryProjection | null = null,
): readonly RegistrationAdmissionObservation[] | null {
  return projectEvaluatedRegistrationValueInner(
    context,
    carrier,
    value,
    openSeams,
    admissionKind,
    carrierKind,
    localNameHint,
    sourceFactoryProjection,
    new Set(),
  );
}

function projectEvaluatedRegistrationValueInner(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationValue | null,
  openSeams: readonly EvaluationOpenSeam[],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  localNameHint: string | null,
  sourceFactoryProjection: SourceRegistrationFactoryProjection | null,
  activeCarriers: Set<EvaluationValue>,
): readonly RegistrationAdmissionObservation[] | null {
  const classification = classifyEvaluatedRegistrationValue(value);
  if (classification == null) {
    return null;
  }

  switch (classification.kind) {
    case EvaluatedRegistrationClassificationKind.Interface:
      switch (classification.evaluation.defaultRegistrationState) {
        case AureliaInterfaceDefaultRegistrationState.None:
          return [];
        case AureliaInterfaceDefaultRegistrationState.Open:
          return [openInterfaceDefaultRegistration(
            context,
            carrier,
            classification.value,
            carrierKind,
            admissionKind,
          )];
        case AureliaInterfaceDefaultRegistrationState.Closed:
          return [interfaceDefaultRegistration(
            context,
            carrier,
            classification.value,
            classification.evaluation.defaultRegistration!,
            carrierKind,
            admissionKind,
          )];
      }
    case EvaluatedRegistrationClassificationKind.FrameworkGroup:
      return [frameworkRegistrationGroup(
        context,
        carrier,
        classification.value,
        classification.evaluation.kind,
        carrierKind,
        admissionKind,
      )];
    case EvaluatedRegistrationClassificationKind.FrameworkFactory:
      return [openFrameworkRegistrationFactory(
        context,
        carrier,
        classification.value,
        classification.evaluation.resultKind,
        carrierKind,
        admissionKind,
      )];
    case EvaluatedRegistrationClassificationKind.RegistrationFactory:
      return [registrationAdmissionForEvaluatedFactory(
        context,
        carrier,
        classification.value,
        classification.evaluation,
        admissionKind,
      )];
    case EvaluatedRegistrationClassificationKind.Registry:
      return [registryRegistration(
        context,
        carrier,
        classification.value,
        openSeams,
        admissionKind,
        carrierKind,
        localNameHint,
      )];
    case EvaluatedRegistrationClassificationKind.PlainClass:
      return [plainClassSelfRegistration(
        context,
        carrier,
        classification.value,
        openSeams,
        admissionKind,
        carrierKind,
        localNameHint,
      )];
    case EvaluatedRegistrationClassificationKind.RecursiveCarrier:
      value = classification.value;
  }

  if (activeCarriers.has(value)) {
    return [openRecursiveCarrierRegistration(
      context,
      carrier,
      value,
      [],
      carrierKind,
      admissionKind,
      'Recursive registration carrier contains a cycle that reaches Aurelia\'s registration-depth boundary.',
    )];
  }

  activeCarriers.add(value);
  try {
    const enumerable = readEvaluationEnumerableOwnEntries(value);
    if (enumerable == null) {
      return null;
    }
    const observations: RegistrationAdmissionObservation[] = [];
    for (const entry of enumerable.entries) {
      if (entry.property?.state === EvaluationObjectPropertyState.Open) {
        continue;
      }
      const entryCarrier = entry.expression
        ?? (entry.sourceNode != null && ts.isExpression(entry.sourceNode) ? entry.sourceNode : carrier);
      const sourceFactory = entry.expression == null || sourceFactoryProjection == null
        ? null
        : sourceFactoryProjection(entry.expression, RegistrationAdmissionKind.RecursiveCarrierEntry);
      const nested = sourceFactory == null
        ? projectEvaluatedRegistrationValueInner(
            context,
            entryCarrier,
            entry.value,
            entry.openSeams,
            RegistrationAdmissionKind.RecursiveCarrierEntry,
            RegistrationCarrierKind.RecursiveCarrierEntry,
            entry.name,
            sourceFactoryProjection,
            activeCarriers,
          )
        : [sourceFactory.withEvaluatedCarrierValue(entry.value)];
      if (nested != null) {
        observations.push(...nested);
      }
    }

    const aggregateOpenSeams = [
      ...openSeams,
      ...enumerable.membershipOpenSeams,
      ...enumerable.orderOpenSeams,
      ...enumerable.entries.flatMap((entry) => entry.openSeams),
    ];
    if (
      enumerable.mayHaveUnknownEntries
      || enumerable.mayHaveUnknownOrder
      || enumerable.entries.some((entry) =>
        entry.value.kind === EvaluationValueKind.Unknown
        || entry.value.kind === EvaluationValueKind.BoundaryValue
        || entry.property?.state === EvaluationObjectPropertyState.Open
      )
      || aggregateOpenSeams.length > 0
    ) {
      observations.push(openRecursiveCarrierRegistration(
        context,
        carrier,
        value,
        aggregateOpenSeams,
        carrierKind,
        admissionKind,
      ));
    }
    return observations;
  } finally {
    activeCarriers.delete(value);
  }
}

function interfaceDefaultRegistration(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  interfaceValue: EvaluationValue,
  effect: AureliaInterfaceDefaultRegistrationEffect,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    effect.strategy,
    RegistrationKeyRole.AdmittedKey,
    carrier,
    context.registrationKeyObservationForValue(carrier, interfaceValue),
    effect.valueExpression == null
      ? new RegistrationValueObservation(
          effect.valueKind,
          null,
          effect.sourceNode,
          false,
          null,
          null,
          context.sourceFileAddressHandleForNode(effect.sourceNode),
          null,
          null,
          null,
          effect.value,
        )
      : evaluatedRegistrationValueObservation(
          context,
          effect.valueKind,
          effect.valueExpression,
          effect.value,
        ),
    [],
    [],
    null,
    interfaceValue,
  );
}

function openInterfaceDefaultRegistration(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  interfaceValue: EvaluationValue,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.AdmittedKey,
    carrier,
    context.registrationKeyObservationForValue(carrier, interfaceValue),
    null,
    [],
    [new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      'DI interface default registration callback did not close to one ResolverBuilder strategy and value.',
      carrier,
    )],
    null,
    interfaceValue,
  );
}

function frameworkRegistrationGroup(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationValue,
  frameworkKind: FrameworkRegistrationKind,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.FrameworkGroup,
    RegistrationKeyRole.Unknown,
    carrier,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.FrameworkRegistration,
      readReferenceName(carrier) ?? traceNameForFrameworkRegistrationKind(frameworkKind),
      carrier,
      false,
      null,
      frameworkKind,
      context.sourceFileAddressHandleForNode(carrier),
      null,
      null,
      null,
      value,
    ),
    [],
    [],
    null,
    value,
  );
}

function openFrameworkRegistrationFactory(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationValue,
  resultKind: FrameworkRegistrationKind,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  const factoryName = traceNameForFrameworkRegistrationKind(resultKind);
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.Unknown,
    carrier,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Unknown,
      factoryName,
      carrier,
      false,
      null,
      null,
      context.sourceFileAddressHandleForNode(carrier),
      null,
      null,
      null,
      value,
    ),
    [],
    [new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      `${factoryName} is a factory namespace; one of its factory results must be selected before registration effects can be modeled.`,
      carrier,
    )],
    null,
    value,
  );
}

function registryRegistration(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: Parameters<typeof evaluatedRegistryValueObservation>[2],
  openSeams: readonly EvaluationOpenSeam[],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  localNameHint: string | null,
): RegistrationAdmissionObservation {
  const frameworkKind = aureliaFrameworkRegistrationKindForEvaluationValue(value);
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Registry,
    RegistrationKeyRole.Unknown,
    carrier,
    null,
    evaluatedRegistryValueObservation(
      context,
      carrier,
      value,
      frameworkKind,
      aureliaRegistryBodyForEvaluationValue(value),
      localNameHint,
    ),
    [],
    registrationRecognitionOpens(carrier, openSeams),
    null,
    value,
  );
}

function plainClassSelfRegistration(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationClassValue | EvaluationFunctionValue,
  openSeams: readonly EvaluationOpenSeam[],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  localNameHint: string | null,
): RegistrationAdmissionObservation {
  const valueSource = evaluatedConstructableValueSource(context, carrier, value);
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Singleton,
    RegistrationKeyRole.AdmittedKey,
    carrier,
    context.registrationKeyObservationForValue(carrier, value),
    new RegistrationValueObservation(
      RegistrationValueKind.PlainClass,
      localNameHint ?? readReferenceName(carrier) ?? evaluatedValueLocalName(value),
      valueSource.node,
      isDeclarationValueNode(valueSource.node),
      null,
      null,
      valueSource.sourceFileAddressHandle,
      valueSource.moduleKey,
      null,
      null,
      value,
    ),
    [],
    registrationRecognitionOpens(carrier, openSeams),
    null,
    value,
  );
}

function openRecursiveCarrierRegistration(
  context: EvaluatedRegistrationProjectionContext,
  carrier: ts.Expression,
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
  fallbackSummary = 'Recursive registration carrier may contain entries that static evaluation could not enumerate.',
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.RecursiveCarrier,
    RegistrationKeyRole.Unknown,
    carrier,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.RecursiveCarrier,
      readReferenceName(carrier),
      carrier,
      isDeclarationValueNode(carrier),
      null,
      null,
      context.sourceFileAddressHandleForNode(carrier),
      null,
      null,
      null,
      value,
    ),
    [],
    openSeams.length === 0
      ? [new RegistrationRecognitionOpen(
          KernelVocabulary.Registration.OpenValueExpression.key,
          fallbackSummary,
          carrier,
        )]
      : registrationRecognitionOpens(carrier, openSeams),
    null,
    value,
  );
}

function registrationRecognitionOpens(
  carrier: ts.Expression,
  openSeams: readonly EvaluationOpenSeam[],
): readonly RegistrationRecognitionOpen[] {
  return openSeams.map((seam) => new RegistrationRecognitionOpen(
    KernelVocabulary.Registration.OpenValueExpression.key,
    seam.summary,
    seam.node ?? carrier,
    seam.reasonKinds,
  ));
}
