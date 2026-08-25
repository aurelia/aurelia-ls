import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  RuntimeExpressionAccessUsesApp,
  SuffixValueConverter,
} from './runtime-expression-access-uses-app';

new Aurelia()
  .register(StandardConfiguration, SuffixValueConverter)
  .app({
    host: document.body,
    component: RuntimeExpressionAccessUsesApp,
  })
  .start();
