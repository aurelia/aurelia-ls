import { bindable, customAttribute, customElement } from '@aurelia/runtime-html';
import template from './template-compiler-errors-app.html';

@customElement({ name: 'template-compiler-errors-app', template })
export class TemplateCompilerErrorsApp {
  enabled = true;
}

@customAttribute('template-probe')
export class TemplateProbeCustomAttribute {
  @bindable value = '';
}
