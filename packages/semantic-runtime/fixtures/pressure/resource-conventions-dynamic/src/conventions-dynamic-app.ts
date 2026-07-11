import { customElement } from 'aurelia';
import { DynamicCard } from './dynamic-card';
import template from './conventions-dynamic-app.html';

@customElement({
  name: 'conventions-dynamic-app',
  template,
  dependencies: [DynamicCard],
})
export class ConventionsDynamicApp {}
