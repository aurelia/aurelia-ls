import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  NeedsViewFactoryAttribute,
  RuntimeHtmlViewFactoryProviderErrorsApp,
  ViewFactoryTemplateController,
} from './runtime-html-view-factory-provider-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    NeedsViewFactoryAttribute,
    ViewFactoryTemplateController,
  )
  .app({
    host: document.body,
    component: RuntimeHtmlViewFactoryProviderErrorsApp,
  })
  .start();
