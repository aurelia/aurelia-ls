import { BindingMode, customElement } from 'aurelia';
import template from './static-card.html';

@customElement({
  name: 'static-card',
  template,
})
export class StaticCard {
  static readonly bindables = [
    { name: 'headline', attribute: 'display-headline', mode: BindingMode.oneTime },
    'subtitle',
  ];

  headline = '';
  subtitle = '';
}
