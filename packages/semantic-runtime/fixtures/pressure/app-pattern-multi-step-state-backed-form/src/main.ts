import Aurelia from 'aurelia';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { App } from './app';

Aurelia
  .register(ValidationHtmlConfiguration)
  .app(App)
  .start();
