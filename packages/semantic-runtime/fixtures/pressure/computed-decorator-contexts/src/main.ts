import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  ComputedDecoratorContextsApp,
} from './computed-decorator-contexts-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('computed-decorator-contexts-app') ?? document.body,
    component: ComputedDecoratorContextsApp,
  })
  .start();
