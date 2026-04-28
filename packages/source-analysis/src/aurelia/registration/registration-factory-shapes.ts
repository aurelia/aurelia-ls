import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import {
  RegistrationKeyRole,
  RegistrationStrategy,
} from './registration-admission.js';
import { RegistrationValueKind } from './registration-reference.js';

/** Runtime `Registration.*(...)` factory shape recognized before DI world construction spends it. */
export class RegistrationFactoryShape {
  constructor(
    readonly strategy: RegistrationStrategy,
    readonly valueKind: RegistrationValueKind | null,
    readonly keyRole: RegistrationKeyRole,
    readonly keyArgumentIndex: number,
    readonly valueArgumentIndex: number | null,
    readonly callbackBodyIsOpen: boolean,
  ) {}
}

/** Shared runtime-shaped registry for built-in `Registration.*(...)` factory calls. */
export const REGISTRATION_FACTORY_SHAPES = new Map<string, RegistrationFactoryShape>([
  ['instance', new RegistrationFactoryShape(RegistrationStrategy.Instance, RegistrationValueKind.Instance, RegistrationKeyRole.AdmittedKey, 0, 1, false)],
  ['singleton', new RegistrationFactoryShape(RegistrationStrategy.Singleton, RegistrationValueKind.Constructable, RegistrationKeyRole.AdmittedKey, 0, 1, false)],
  ['transient', new RegistrationFactoryShape(RegistrationStrategy.Transient, RegistrationValueKind.Constructable, RegistrationKeyRole.AdmittedKey, 0, 1, false)],
  ['callback', new RegistrationFactoryShape(RegistrationStrategy.Callback, RegistrationValueKind.Callback, RegistrationKeyRole.AdmittedKey, 0, 1, true)],
  ['cachedCallback', new RegistrationFactoryShape(RegistrationStrategy.CachedCallback, RegistrationValueKind.CachedCallback, RegistrationKeyRole.AdmittedKey, 0, 1, true)],
  ['aliasTo', new RegistrationFactoryShape(RegistrationStrategy.AliasTo, RegistrationValueKind.AliasTarget, RegistrationKeyRole.AdmittedKey, 1, 0, false)],
  ['defer', new RegistrationFactoryShape(RegistrationStrategy.Defer, null, RegistrationKeyRole.RegistryLookupKey, 0, null, false)],
]);

export function valueOpenKindForRegistrationFactory(
  factoryName: string,
): OpenSeamKindKey {
  return factoryName === 'aliasTo'
    ? KernelVocabulary.Registration.OpenAliasTarget.key
    : KernelVocabulary.Registration.OpenValueExpression.key;
}
