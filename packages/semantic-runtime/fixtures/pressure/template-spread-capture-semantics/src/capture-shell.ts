import { bindable, customElement } from '@aurelia/runtime-html';
import template from './capture-shell.html';
import { InnerGate, InputMark } from './capture-resources';

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
  capture: (attribute) => attribute !== 'class',
})
export class FilteredCaptureShell {}

@customElement({
  name: 'no-capture-shell',
  template: '<template><input ...$attrs></template>',
  capture: false,
})
export class NoCaptureShell {}

@customElement({
  name: 'nested-capture-shell',
  template: '<template><capture-shell ...$attrs></capture-shell></template>',
  capture: true,
  dependencies: [CaptureShell],
})
export class NestedCaptureShell {}
