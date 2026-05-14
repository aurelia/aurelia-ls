import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  TemplateCompilerErrorsApp,
  TemplateProbeCustomAttribute,
} from './template-compiler-errors-app';
import { SurrogateInvalidAttribute } from './surrogate-invalid-attribute';
import { SurrogateTemplateProbe } from './surrogate-template-probe';
import { LocalBindableProbe } from './local-bindable-probe';
import { LocalNestedProbe } from './local-nested-probe';
import { LocalOnlyProbe } from './local-only-probe';
import { LocalRootProbe } from './local-root-probe';

new Aurelia()
  .register(
    StandardConfiguration,
    TemplateProbeCustomAttribute,
    SurrogateInvalidAttribute,
    SurrogateTemplateProbe,
    LocalBindableProbe,
    LocalNestedProbe,
    LocalOnlyProbe,
    LocalRootProbe,
  )
  .app({
    host: document.body,
    component: TemplateCompilerErrorsApp,
  })
  .start();
