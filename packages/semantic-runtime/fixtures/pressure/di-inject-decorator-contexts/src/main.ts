import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  DependencyService,
  InjectDecoratorContextsApp,
} from './inject-decorator-contexts-app';

new Aurelia()
  .register(
    StandardConfiguration,
    DependencyService,
  )
  .app({
    host: document.querySelector('inject-decorator-contexts-app') ?? document.body,
    component: InjectDecoratorContextsApp,
  })
  .start();
