import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  RefProbeCustomAttribute,
  RefProbeElement,
  RuntimeHtmlRefRendererErrorsApp,
} from './runtime-html-ref-renderer-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    RefProbeCustomAttribute,
    RefProbeElement,
  )
  .app({
    host: document.body,
    component: RuntimeHtmlRefRendererErrorsApp,
  })
  .start();
