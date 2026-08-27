import { customElement } from '@aurelia/runtime-html';
import template from './attribute-owner-progression-app.html';

@customElement({
  name: 'attribute-owner-progression-app',
  template,
})
export class AttributeOwnerProgressionApp {
  editable = true;
  message = 'message';
}
