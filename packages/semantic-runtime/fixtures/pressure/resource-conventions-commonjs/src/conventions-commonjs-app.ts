import { customElement } from 'aurelia';
import { CommonjsCard } from './commonjs-card';
import template from './conventions-commonjs-app.html';

@customElement({
  name: 'conventions-commonjs-app',
  template,
  dependencies: [CommonjsCard],
})
export class ConventionsCommonjsApp {}
