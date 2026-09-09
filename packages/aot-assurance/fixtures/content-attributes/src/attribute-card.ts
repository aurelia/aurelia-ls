import { customElement } from 'aurelia';

@customElement({
  name: 'attribute-card',
  template: '<strong class="card-value">card:${label}</strong>',
  bindables: ['label'],
})
export class AttributeCard {
  label = '';
}
