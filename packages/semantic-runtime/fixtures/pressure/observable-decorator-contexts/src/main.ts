import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  ObservableDecoratorContextsApp,
} from './observable-decorator-contexts-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('observable-decorator-contexts-app') ?? document.body,
    component: ObservableDecoratorContextsApp,
  })
  .start();
