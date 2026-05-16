import { customElement } from '@aurelia/runtime-html';
import template from './implicit-binding-expression-inference-app.html';

@customElement({
  name: 'implicit-binding-expression-inference-app',
  template,
})
export class ImplicitBindingExpressionInferenceApp {
  value = 'initial value';
  readonly textcontent = 'authored textcontent source';
  readonly minlength = 4;
  readonly minLength = 12;
}
