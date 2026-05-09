import {
  type OpenSeamKindKey,
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  RegistrationKeyRole,
  RegistrationStrategy,
} from './registration-admission.js';
import { RegistrationValueKind } from './registration-reference.js';

/** Value argument owned by a runtime `Registration.*(...)` factory shape. */
export class RegistrationFactoryValueShape {
  constructor(
    readonly valueKind: RegistrationValueKind,
    readonly argumentIndex: number,
    readonly missingOpenKind: OpenSeamKindKey,
  ) {}
}

/** Runtime `Registration.*(...)` factory shape recognized before DI world construction spends it. */
export class RegistrationFactoryShape {
  constructor(
    readonly strategy: RegistrationStrategy,
    readonly keyRole: RegistrationKeyRole,
    readonly keyArgumentIndex: number,
    readonly value: RegistrationFactoryValueShape | null,
  ) {}
}

/** Shared runtime-shaped registry for built-in `Registration.*(...)` factory calls. */
export const REGISTRATION_FACTORY_SHAPES = new Map<string, RegistrationFactoryShape>([
  ['instance', new RegistrationFactoryShape(
    RegistrationStrategy.Instance,
    RegistrationKeyRole.AdmittedKey,
    0,
    registrationFactoryValue(RegistrationValueKind.Instance, 1, KernelVocabulary.Registration.OpenValueExpression.key),
  )],
  ['singleton', new RegistrationFactoryShape(
    RegistrationStrategy.Singleton,
    RegistrationKeyRole.AdmittedKey,
    0,
    registrationFactoryValue(RegistrationValueKind.Constructable, 1, KernelVocabulary.Registration.OpenValueExpression.key),
  )],
  ['transient', new RegistrationFactoryShape(
    RegistrationStrategy.Transient,
    RegistrationKeyRole.AdmittedKey,
    0,
    registrationFactoryValue(RegistrationValueKind.Constructable, 1, KernelVocabulary.Registration.OpenValueExpression.key),
  )],
  ['callback', new RegistrationFactoryShape(
    RegistrationStrategy.Callback,
    RegistrationKeyRole.AdmittedKey,
    0,
    registrationFactoryValue(RegistrationValueKind.Callback, 1, KernelVocabulary.Registration.OpenValueExpression.key),
  )],
  ['cachedCallback', new RegistrationFactoryShape(
    RegistrationStrategy.CachedCallback,
    RegistrationKeyRole.AdmittedKey,
    0,
    registrationFactoryValue(RegistrationValueKind.CachedCallback, 1, KernelVocabulary.Registration.OpenValueExpression.key),
  )],
  ['aliasTo', new RegistrationFactoryShape(
    RegistrationStrategy.AliasTo,
    RegistrationKeyRole.AdmittedKey,
    1,
    registrationFactoryValue(RegistrationValueKind.AliasTarget, 0, KernelVocabulary.Registration.OpenAliasTarget.key),
  )],
  ['defer', new RegistrationFactoryShape(
    RegistrationStrategy.Defer,
    RegistrationKeyRole.RegistryLookupKey,
    0,
    null,
  )],
]);

function registrationFactoryValue(
  valueKind: RegistrationValueKind,
  argumentIndex: number,
  missingOpenKind: OpenSeamKindKey,
): RegistrationFactoryValueShape {
  return new RegistrationFactoryValueShape(valueKind, argumentIndex, missingOpenKind);
}
