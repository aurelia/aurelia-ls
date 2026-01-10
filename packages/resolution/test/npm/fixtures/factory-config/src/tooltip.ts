import { customAttribute, bindable } from 'aurelia';

@customAttribute('tooltip')
export class TooltipCustomAttribute {
  @bindable({ primary: true }) text: string = '';
  @bindable() position: 'top' | 'bottom' | 'left' | 'right' = 'top';
}
