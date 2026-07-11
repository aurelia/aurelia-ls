import Aurelia from 'aurelia';
import { ComponentScopesApp } from './component-scopes-app';
import { GlobalScopeCard } from './resources';

Aurelia
  .register(GlobalScopeCard)
  .app(ComponentScopesApp)
  .start();
