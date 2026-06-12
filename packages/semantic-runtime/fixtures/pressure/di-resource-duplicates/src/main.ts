import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  DiResourceDuplicateApp,
  DuplicateResourceOne,
  DuplicateResourceTwo,
} from './resources';

new Aurelia()
  .register(
    StandardConfiguration,
    DuplicateResourceOne,
    DuplicateResourceTwo,
  )
  .app({
    host: document.querySelector('di-resource-duplicate-app') ?? document.body,
    component: DiResourceDuplicateApp,
  })
  .start();
