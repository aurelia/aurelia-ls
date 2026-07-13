import {
  AppTask,
  AttrMapper,
  Aurelia,
  NodeObserverLocator,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TemplateNativeTargetPrecedenceApp } from './template-native-target-precedence-app';

const appNodeObserverConfig = {
  events: ['position-change'],
  readonly: false,
  default: 0,
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
    }),
  )
  .app({
    host: document.body,
    component: TemplateNativeTargetPrecedenceApp,
  })
  .start();
