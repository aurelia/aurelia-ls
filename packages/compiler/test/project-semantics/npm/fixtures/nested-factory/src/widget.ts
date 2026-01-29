import { customElement, bindable } from 'aurelia';

@customElement('my-widget')
export class MyWidget {
  @bindable() title: string = '';
}
