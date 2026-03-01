import { customElement, bindable, customAttribute } from '@aurelia/runtime-html';

@customElement('user-card')
export class UserCard {
  @bindable name: string = '';
  @bindable avatar: string = '';
}

@customAttribute({ name: 'highlight', defaultProperty: 'color' })
export class HighlightAttribute {
  @bindable color: string = 'yellow';
}
