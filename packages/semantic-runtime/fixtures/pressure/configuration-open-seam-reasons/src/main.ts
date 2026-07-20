import {
  AppTask,
  AttrMapper,
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';

const runtimeAttributeMappings = (
  globalThis as typeof globalThis & { __runtimeAttributeMappings?: Record<string, string> }
).__runtimeAttributeMappings ?? {};

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({ useUrlFragmentHash: missingRouterFlag }),
    AppTask.creating(AttrMapper, (mapper) => {
      mapper.useGlobalMapping({
        ...runtimeAttributeMappings,
        tabindex: 'tabIndex',
      });
    }),
  )
  .app({
    host: document.querySelector('app')!,
    component: App,
  })
  .start();
