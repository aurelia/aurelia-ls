import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateOverlayValueConverterApp } from './template-overlay-value-converter-app';
import {
  ContextualWordValueConverter,
  IdentityOnlyValueConverter,
  MinimumLengthValueConverter,
  WordCountValueConverter,
} from './word-count-value-converter';

new Aurelia()
  .register(
    StandardConfiguration,
    WordCountValueConverter,
    MinimumLengthValueConverter,
    IdentityOnlyValueConverter,
    ContextualWordValueConverter,
  )
  .app({
    host: document.querySelector('template-overlay-value-converter') ?? document.body,
    component: TemplateOverlayValueConverterApp,
  })
  .start();
