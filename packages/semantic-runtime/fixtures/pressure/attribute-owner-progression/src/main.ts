import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { AttributeOwnerProgressionApp } from './attribute-owner-progression-app';
import { RootSurrogateOwnerProgression } from './root-surrogate-owner-progression';

void new Aurelia()
  .register(StandardConfiguration, RootSurrogateOwnerProgression)
  .app({
    component: AttributeOwnerProgressionApp,
    host: document.querySelector('attribute-owner-progression') ?? document.body,
  })
  .start();
