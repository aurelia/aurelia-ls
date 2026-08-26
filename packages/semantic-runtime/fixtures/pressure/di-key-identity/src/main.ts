import { DI, newInstanceOf, Registration } from '@aurelia/kernel';
import { AppTask, Aurelia, ISanitizer, StandardConfiguration } from '@aurelia/runtime-html';
import { ITemplateCompilerHooks as DirectTemplateCompilerHooks } from '@aurelia/template-compiler';
import { ITemplateCompilerHooks as ReexportedTemplateCompilerHooks } from 'aurelia';

import { App } from './app';
import {
  FirstInterfaceKey as DirectInterfaceKey,
  SecondLocalSymbolKey,
  SecondObjectKey,
  SecondInterfaceKey,
  SharedLocalSymbolKey as DirectLocalSymbolKey,
  SharedObjectKey as DirectObjectKey,
  SharedClassKey as DirectClassKey,
  SharedProvider as DirectProvider,
} from './keys';
import {
  FirstInterfaceKey as ReexportedInterfaceKey,
  SharedLocalSymbolKey as ReexportedLocalSymbolKey,
  SharedObjectKey as ReexportedObjectKey,
  SharedClassKey as ReexportedClassKey,
  SharedProvider as ReexportedProvider,
} from './key-barrel';

const stringFirstValue = { source: 'string-first' };
const stringSecondValue = { source: 'string-second' };
const directClassValue = { source: 'class-direct' };
const reexportedClassValue = { source: 'class-reexport' };
const directInterfaceValue = { source: 'interface-direct' };
const reexportedInterfaceValue = { source: 'interface-reexport' };
const secondInterfaceValue = { source: 'interface-second' };
const frameworkInterfaceValue = { source: 'framework-interface' };
const directCompilerHooksInterfaceValue = { source: 'compiler-hooks-interface-direct' };
const reexportedCompilerHooksInterfaceValue = { source: 'compiler-hooks-interface-reexported' };
const localCompilerHooksLookalikeValue = { source: 'compiler-hooks-interface-lookalike' };
const registryConstructableValue = { source: 'registry-constructable' };
const directObjectValue = { source: 'object-direct' };
const reexportedObjectValue = { source: 'object-reexport' };
const secondObjectValue = { source: 'object-second' };
const directLocalSymbolValue = { source: 'local-symbol-direct' };
const reexportedLocalSymbolValue = { source: 'local-symbol-reexport' };
const secondLocalSymbolValue = { source: 'local-symbol-second' };
const firstGlobalSymbolValue = { source: 'global-symbol-first' };
const secondGlobalSymbolValue = { source: 'global-symbol-second' };
const firstNumberValue = { source: 'number-first' };
const secondNumberValue = { source: 'number-second' };
const callbackValue = () => ({ source: 'callback' });
const sharedStringKey = 'shared-string-key';
const sharedNumberKey = 17;

const ITemplateCompilerHooks = DI.createInterface<object>('ITemplateCompilerHooks');

class RegistryConstructableKey {
  static register(): void {}
}

new Aurelia()
  .register(
    StandardConfiguration,
    Registration.instance('shared-string-key', stringFirstValue),
    Registration.instance(sharedStringKey, stringSecondValue),
    Registration.instance(DirectClassKey, directClassValue),
    Registration.instance(ReexportedClassKey, reexportedClassValue),
    Registration.instance(DirectInterfaceKey, directInterfaceValue),
    Registration.instance(ReexportedInterfaceKey, reexportedInterfaceValue),
    Registration.instance(SecondInterfaceKey, secondInterfaceValue),
    Registration.instance(ISanitizer, frameworkInterfaceValue),
    Registration.instance(DirectTemplateCompilerHooks, directCompilerHooksInterfaceValue),
    Registration.instance(ReexportedTemplateCompilerHooks, reexportedCompilerHooksInterfaceValue),
    Registration.instance(ITemplateCompilerHooks, localCompilerHooksLookalikeValue),
    Registration.instance(RegistryConstructableKey, registryConstructableValue),
    Registration.instance(DirectObjectKey, directObjectValue),
    Registration.instance(ReexportedObjectKey, reexportedObjectValue),
    Registration.instance(SecondObjectKey, secondObjectValue),
    Registration.instance(DirectLocalSymbolKey, directLocalSymbolValue),
    Registration.instance(ReexportedLocalSymbolKey, reexportedLocalSymbolValue),
    Registration.instance(SecondLocalSymbolKey, secondLocalSymbolValue),
    Registration.instance(Symbol.for('global-service'), firstGlobalSymbolValue),
    Registration.instance(Symbol.for('global-service'), secondGlobalSymbolValue),
    Registration.instance(17, firstNumberValue),
    Registration.instance(sharedNumberKey, secondNumberValue),
    Registration.callback('callback-service', callbackValue),
    Registration.cachedCallback('cached-callback-service', callbackValue),
    Registration.singleton('direct-provider', DirectProvider),
    Registration.singleton('reexported-provider', ReexportedProvider),
    Registration.aliasTo(DirectInterfaceKey, 'public-interface'),
    Registration.aliasTo(newInstanceOf(DirectClassKey), 'fresh-class'),
    AppTask.creating(ReexportedInterfaceKey, () => undefined),
  )
  .app({ host: document.body, component: App });
