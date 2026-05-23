import { customElement } from '@aurelia/runtime-html';
import template from './template-overlay-value-converter-app.html';

@customElement({
  name: 'template-overlay-value-converter',
  template,
})
export class TemplateOverlayValueConverterApp {
  readonly message = 'one two three';
  readonly words = ['one', 'three', 'seven'];
  readonly minimumCount = 2;
  readonly minimumText = '2';
}
