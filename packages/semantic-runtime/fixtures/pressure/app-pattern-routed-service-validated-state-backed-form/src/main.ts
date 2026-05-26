import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { App } from './app';

Aurelia
  .register(
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
    }),
    ValidationHtmlConfiguration
  )
  .app(App)
  .start();
