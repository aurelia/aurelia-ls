import { bindable, customAttribute } from '@aurelia/runtime-html';

export class TemplateCompilerErrorsApp {
  enabled = true;
}

@customAttribute('template-probe')
export class TemplateProbeCustomAttribute {
  @bindable value = '';
}
