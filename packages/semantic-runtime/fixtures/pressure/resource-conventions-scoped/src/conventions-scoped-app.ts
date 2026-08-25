import { customElement } from 'aurelia';
import { OutsideCard } from '../outside-card';
import { DefaultCard } from './default-card';
import { ExcludedCard } from './excluded/excluded-card';
import template from './conventions-scoped-app.html';

@customElement({
  name: 'conventions-scoped-app',
  template,
  dependencies: [DefaultCard, ExcludedCard, OutsideCard],
})
export class ConventionsScopedApp {}
