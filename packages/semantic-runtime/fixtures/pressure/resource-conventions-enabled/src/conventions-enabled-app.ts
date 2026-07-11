import { customElement } from 'aurelia';
import { ConventionCard } from './convention-card';
import template from './conventions-enabled-app.html';

@customElement({
  name: 'conventions-enabled-app',
  template,
  dependencies: [ConventionCard],
})
export class ConventionsEnabledApp {}
