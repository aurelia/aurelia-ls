import {
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  type AureliaFrameworkRegistrationEvaluation,
  type AureliaFrameworkRegistrationFactoryEvaluation,
  type AureliaInterfaceEvaluation,
  type AureliaRegistrationFactoryEvaluation,
  aureliaFrameworkRegistrationEvaluationForValue,
  aureliaFrameworkRegistrationFactoryEvaluationForValue,
  aureliaInterfaceEvaluationForValue,
  aureliaRegistrationFactoryEvaluationForValue,
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistrableRegistryForEvaluationValue,
} from '../configuration/aurelia-evaluation-runtime.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from './registration-admission.js';
import type { EvaluatedRegistrationCarrier } from './registration-observation.js';
import type { FrameworkRegistrationKind } from './registration-reference.js';
import {
  hasEvaluationRegisterFunction,
  isPlainClassFallbackValue,
  isRecursiveRegistrationCarrier,
  type EvaluatedRegistryValue,
} from './evaluated-registration-value.js';

export const enum EvaluatedRegistrationClassificationKind {
  /** Aurelia interface registry; applying it may create a fresh default resolver. */
  Interface = 'interface',
  /** Evaluator-known framework registration group represented by an exact array value. */
  FrameworkGroup = 'framework-group',
  /** Framework factory namespace that is not itself a registry value. */
  FrameworkFactory = 'framework-factory',
  /** One exact reusable value returned by `Registration.*(...)`. */
  RegistrationFactory = 'registration-factory',
  /** One exact reusable object whose closed `register` member enters the IRegistry branch. */
  Registry = 'registry',
  /** Constructable value that enters Aurelia's singleton self-registration fallback. */
  PlainClass = 'plain-class',
  /** Array, object, namespace, or non-constructable function recursively enumerated by `register`. */
  RecursiveCarrier = 'recursive-carrier',
}

export class EvaluatedInterfaceRegistration {
  readonly kind = EvaluatedRegistrationClassificationKind.Interface;
  constructor(
    readonly value: EvaluationValue,
    readonly evaluation: AureliaInterfaceEvaluation,
  ) {}
}

export class EvaluatedFrameworkRegistrationGroup {
  readonly kind = EvaluatedRegistrationClassificationKind.FrameworkGroup;
  constructor(
    readonly value: EvaluationValue,
    readonly evaluation: AureliaFrameworkRegistrationEvaluation,
  ) {}
}

export class EvaluatedFrameworkRegistrationFactory {
  readonly kind = EvaluatedRegistrationClassificationKind.FrameworkFactory;
  constructor(
    readonly value: EvaluationValue,
    readonly evaluation: AureliaFrameworkRegistrationFactoryEvaluation,
  ) {}
}

export class EvaluatedRegistrationFactory {
  readonly kind = EvaluatedRegistrationClassificationKind.RegistrationFactory;
  constructor(
    readonly value: EvaluationValue,
    readonly evaluation: AureliaRegistrationFactoryEvaluation,
  ) {}
}

export class EvaluatedRegistryRegistration {
  readonly kind = EvaluatedRegistrationClassificationKind.Registry;
  constructor(readonly value: EvaluatedRegistryValue) {}
}

export class EvaluatedPlainClassRegistration {
  readonly kind = EvaluatedRegistrationClassificationKind.PlainClass;
  constructor(readonly value: EvaluationClassValue | EvaluationFunctionValue) {}
}

export class EvaluatedRecursiveRegistrationCarrier {
  readonly kind = EvaluatedRegistrationClassificationKind.RecursiveCarrier;
  constructor(readonly value: EvaluationValue) {}
}

export type EvaluatedRegistrationClassification =
  | EvaluatedInterfaceRegistration
  | EvaluatedFrameworkRegistrationGroup
  | EvaluatedFrameworkRegistrationFactory
  | EvaluatedRegistrationFactory
  | EvaluatedRegistryRegistration
  | EvaluatedPlainClassRegistration
  | EvaluatedRecursiveRegistrationCarrier;

/**
 * Apply Aurelia's registration dispatch precedence to one exact evaluator value.
 *
 * Keep this shared between source admission and DI application. Structural `register` detection must come after
 * interface and framework metadata because those values deliberately expose registry-shaped methods with more
 * specific runtime behavior.
 */
export function classifyEvaluatedRegistrationValue(
  value: EvaluationValue | null,
): EvaluatedRegistrationClassification | null {
  if (value == null) {
    return null;
  }
  const interfaceEvaluation = aureliaInterfaceEvaluationForValue(value);
  if (interfaceEvaluation != null) {
    return new EvaluatedInterfaceRegistration(value, interfaceEvaluation);
  }
  const frameworkRegistration = aureliaFrameworkRegistrationEvaluationForValue(value);
  if (frameworkRegistration != null && value.kind === EvaluationValueKind.Array) {
    return new EvaluatedFrameworkRegistrationGroup(value, frameworkRegistration);
  }
  const frameworkFactory = aureliaFrameworkRegistrationFactoryEvaluationForValue(value);
  if (frameworkFactory != null) {
    return new EvaluatedFrameworkRegistrationFactory(value, frameworkFactory);
  }
  const registrationFactory = aureliaRegistrationFactoryEvaluationForValue(value);
  if (registrationFactory != null) {
    return new EvaluatedRegistrationFactory(value, registrationFactory);
  }
  if (hasEvaluationRegisterFunction(value)) {
    return new EvaluatedRegistryRegistration(value);
  }
  const registrable = aureliaRegistrableRegistryForEvaluationValue(value);
  if (registrable != null && hasEvaluationRegisterFunction(registrable)) {
    return new EvaluatedRegistryRegistration(registrable);
  }
  if (isPlainClassFallbackValue(value)) {
    return new EvaluatedPlainClassRegistration(value);
  }
  return isRecursiveRegistrationCarrier(value)
    ? new EvaluatedRecursiveRegistrationCarrier(value)
    : null;
}

/**
 * Select the framework effect package from the strongest evidence available at one admission.
 *
 * A bound evaluator carrier is authoritative even when it proves that no framework package applies.
 */
export function frameworkRegistrationKindForRegistrationEvidence(
  admission: RegistrationAdmissionProduct,
  carrier: EvaluatedRegistrationCarrier | null,
): FrameworkRegistrationKind | null {
  return carrier == null
    ? frameworkRegistrationKindForAdmission(admission)
    : aureliaFrameworkRegistrationKindForEvaluationValue(carrier.value);
}
