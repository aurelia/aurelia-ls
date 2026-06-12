import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  RuntimeHtmlSpreadRendererErrorsApp,
  SpreadTargetCard,
} from './runtime-html-spread-renderer-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    SpreadTargetCard,
  )
  .app({
    host: document.body,
    component: RuntimeHtmlSpreadRendererErrorsApp,
  })
  .start();
