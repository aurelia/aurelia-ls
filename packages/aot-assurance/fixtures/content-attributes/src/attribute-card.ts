import { customElement } from 'aurelia';
import { MinimumAttribute } from './native-input-attributes.js';

@customElement({
  name: 'attribute-card',
  template: '<strong class="card-value">card:${label}</strong><native-probe data-native="resource"><i></i></native-probe><input data-consumed-range="min" type="range" min="80" max="100">',
  bindables: ['label'],
  dependencies: [MinimumAttribute],
})
export class AttributeCard {
  label = '';
}
