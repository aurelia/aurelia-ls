import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  WatcherProxyDependenciesApp,
} from './watcher-proxy-dependencies-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('watcher-proxy-dependencies-app') ?? document.body,
    component: WatcherProxyDependenciesApp,
  })
  .start();
