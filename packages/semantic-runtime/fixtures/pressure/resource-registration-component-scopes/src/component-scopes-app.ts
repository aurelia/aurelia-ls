import { customElement } from 'aurelia';
import template from './component-scopes-app.html';
import { OwnerA } from './owner-a';
import { OwnerB } from './owner-b';

@customElement({ name: 'component-scopes-app', template, dependencies: [OwnerA, OwnerB] })
export class ComponentScopesApp {}
