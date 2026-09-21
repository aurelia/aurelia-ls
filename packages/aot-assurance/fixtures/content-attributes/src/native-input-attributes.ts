import { bindable, customAttribute } from 'aurelia';

@customAttribute('min')
export class MinimumAttribute {
  @bindable value = '';
}

@customAttribute('type')
export class InputTypeAttribute {
  @bindable value = '';
}
