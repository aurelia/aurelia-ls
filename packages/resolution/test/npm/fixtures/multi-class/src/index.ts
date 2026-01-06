import { customElement, bindable, customAttribute } from '@aurelia/runtime-html';

@customElement('user-card')
export class UserCard {
  @bindable name: string = '';
  @bindable avatar: string = '';
}

@customAttribute('highlight')
export class HighlightAttribute {
  @bindable({ primary: true }) color: string = 'yellow';
}
