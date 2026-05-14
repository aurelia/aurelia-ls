import { customElement } from '@aurelia/runtime-html';
import template from './weak-owner-repair-app.html';

@customElement({
  name: 'weak-owner-repair-app',
  template,
})
export class WeakOwnerRepairApp {
  readonly title = 'Weak owner repair pressure';
}
