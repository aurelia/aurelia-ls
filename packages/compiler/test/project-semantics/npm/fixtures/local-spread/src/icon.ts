import { customAttribute, bindable } from 'aurelia';

@customAttribute({ name: 'icon', defaultProperty: 'name' })
export class IconCustomAttribute {
  @bindable() name: string = '';
  @bindable() size: 'sm' | 'md' | 'lg' = 'md';
}
