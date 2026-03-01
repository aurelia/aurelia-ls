import { customAttribute, bindable } from 'aurelia';

@customAttribute({ name: 'tooltip', defaultProperty: 'text' })
export class TooltipCustomAttribute {
  @bindable() text: string = '';
  @bindable() position: 'top' | 'bottom' | 'left' | 'right' = 'top';
}
