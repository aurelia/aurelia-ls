import {
  AppTask,
  AttrMapper,
  Aurelia,
  NodeObserverLocator,
  StandardConfiguration,
  ValueAttributeObserver as AliasedValueAttributeObserver,
} from '@aurelia/runtime-html';
import { TemplateNativeTargetPrecedenceApp } from './template-native-target-precedence-app';

const appNodeObserverConfig = {
  events: ['position-change'],
  readonly: false,
  default: 0,
};

const customDefaultNodeObserverConfig = {
  events: ['tab-index-change'],
  default: 0,
};

const readonlyNodeObserverConfig = {
  events: ['title-change'],
  readonly: true,
  default: '',
};

class LanguageObserver extends AliasedValueAttributeObserver {}

const customConstructorNodeObserverConfig = {
  type: LanguageObserver,
  events: ['language-change'],
};

const type = AliasedValueAttributeObserver;
const aliasedBuiltInNodeObserverConfig = {
  type,
  events: ['drag-state-change'],
};

const runtimeNodeObserverFields = (
  globalThis as typeof globalThis & { __runtimeNodeObserverFields?: Record<string, unknown> }
).__runtimeNodeObserverFields ?? {};

const runtimeNodeObserverConfig = {
  type: AliasedValueAttributeObserver,
  events: ['direction-change'],
  readonly: false,
  default: '',
  ...runtimeNodeObserverFields,
};

const closedAfterRuntimeNodeObserverConfig = {
  ...runtimeNodeObserverFields,
  type: AliasedValueAttributeObserver,
  events: ['spellcheck-change'],
  readonly: false,
  default: false,
};

new Aurelia()
  .register(
    StandardConfiguration,
    AppTask.creating(AttrMapper, (mapper) => {
      mapper.useMapping({ 'NATIVE-SLIDER': { position: 'currentValue' } });
      mapper.useMapping({ 'inert-slider': { position: 'wrongValue' } });
      mapper.useMapping({ 'ATTRIBUTE-CASE-SLIDER': { POSITION: 'wrongAttributeValue' } });
      mapper.useMapping({ linearGradient: { viewBox: 'gradientViewBox' } });
      mapper.useMapping({ linearGradient: { gradientunits: 'wrongGradientUnits' } });
      mapper.useGlobalMapping({ 'focus-ring': 'focusRing' });
      mapper.useGlobalMapping({ 'INERT-GLOBAL': 'wrongGlobalValue' });
      mapper.useTwoWay((element, property) =>
        element.tagName === 'NATIVE-SLIDER' && property === 'position'
      );
      mapper.useTwoWay((element, property) =>
        element.tagName === 'inert-slider' && property === 'position'
      );
      mapper.useTwoWay((element, property) =>
        element.tagName === 'GUARDED-SLIDER'
        && property === 'position'
        && element.hasAttribute('live')
      );
    }),
    AppTask.creating(NodeObserverLocator, (locator) => {
      locator.useConfig('NATIVE-OBSERVER-SLIDER', 'position', appNodeObserverConfig);
      locator.useConfig('inert-observer-slider', 'position', appNodeObserverConfig);
      locator.useConfig('DIV', 'tabIndex', customDefaultNodeObserverConfig);
      locator.useConfig('DIV', 'title', readonlyNodeObserverConfig);
      locator.useConfig('DIV', 'lang', customConstructorNodeObserverConfig);
      locator.useConfig('DIV', 'draggable', aliasedBuiltInNodeObserverConfig);
      locator.useConfig('DIV', 'dir', runtimeNodeObserverConfig);
      locator.useConfig('DIV', 'spellcheck', closedAfterRuntimeNodeObserverConfig);
    }),
  )
  .app({
    host: document.body,
    component: TemplateNativeTargetPrecedenceApp,
  })
  .start();
