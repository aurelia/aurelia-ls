import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { UnregisteredShorthandSyntaxApp } from './unregistered-shorthand-syntax-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnregisteredShorthandSyntaxApp,
  })
  .start();
