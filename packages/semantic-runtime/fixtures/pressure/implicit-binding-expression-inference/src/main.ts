import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { ImplicitBindingExpressionInferenceApp } from './implicit-binding-expression-inference-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ImplicitBindingExpressionInferenceApp,
  })
  .start();
