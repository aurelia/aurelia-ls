import { customAttribute, bindable } from 'aurelia';

@customAttribute('icon')
export class IconCustomAttribute {
  @bindable({ primary: true }) name: string = '';
  @bindable() size: 'sm' | 'md' | 'lg' = 'md';
}
