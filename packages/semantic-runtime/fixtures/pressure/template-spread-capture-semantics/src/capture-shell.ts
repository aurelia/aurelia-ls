import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import template from './capture-shell.html';
import { InnerGate, InputMark } from './capture-resources';

const captureExcludedAttribute = 'class';
const captureApplicationAttribute = (attribute: string): boolean =>
  attribute !== captureExcludedAttribute;

@customElement({
  name: 'capture-shell',
  template,
  capture: true,
  dependencies: [InputMark, InnerGate],
})
export class CaptureShell {
  @bindable label = '';
}

@customElement({
  name: 'filtered-capture-shell',
  template: '<template><input ...$attrs></template>',
  capture: captureApplicationAttribute,
})
export class FilteredCaptureShell {}

@customElement({
  name: 'no-capture-shell',
  template: '<template><input ...$attrs></template>',
  capture: false,
})
export class NoCaptureShell {}

@valueConverter('nestedIdentity')
export class NestedIdentityValueConverter {
  toView<T>(value: T): T {
    return value;
  }
}

@customElement({
  name: 'nested-capture-shell',
  template: '<template><capture-shell ...$attrs></capture-shell></template>',
  capture: true,
  dependencies: [CaptureShell, NestedIdentityValueConverter],
})
export class NestedCaptureShell {}
