import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  TemplateCompilerErrorsApp,
  TemplateProbeCustomAttribute,
} from './template-compiler-errors-app';
import './local-bindable-probe';
import './local-nested-probe';
import './local-only-probe';
import './local-root-probe';
import './surrogate-invalid-attribute';
import './surrogate-template-probe';

new Aurelia()
  .register(
    StandardConfiguration,
    TemplateProbeCustomAttribute,
  )
  .app({
    host: document.body,
    component: TemplateCompilerErrorsApp,
  })
  .start();
