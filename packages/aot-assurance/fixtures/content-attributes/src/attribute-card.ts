import { customElement } from 'aurelia';

@customElement({
  name: 'attribute-card',
  template: '<strong class="card-value">card:${label}</strong><native-probe data-native="resource"><i></i></native-probe>',
  bindables: ['label'],
})
export class AttributeCard {
  label = '';
}
