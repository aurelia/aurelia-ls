import {
  bindable,
  customAttribute,
  templateController,
} from '@aurelia/runtime-html';

@customAttribute('input-mark')
export class InputMark {
  @bindable value = '';
}

@templateController('inner-gate')
export class InnerGate {
  @bindable value = true;
}
