import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RepeatKeyedIterablesApp } from './repeat-keyed-iterables-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('repeat-keyed-iterables') ?? document.body,
    component: RepeatKeyedIterablesApp,
  })
  .start();
