import { customElement } from '@aurelia/runtime-html';
import template from './unregistered-shorthand-syntax-app.html';

@customElement({ name: 'unregistered-shorthand-syntax-app', template })
export class UnregisteredShorthandSyntaxApp {
  value = 'draft';
  label = 'Save';

  save(): void {
    this.label = 'Saved';
  }
}
