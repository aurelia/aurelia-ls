import Aurelia from 'aurelia';
import { GlobalLocalChip } from './global-resources';
import { LocalTemplatesApp } from './local-templates-app';

Aurelia
  .register(GlobalLocalChip)
  .app(LocalTemplatesApp)
  .start();
