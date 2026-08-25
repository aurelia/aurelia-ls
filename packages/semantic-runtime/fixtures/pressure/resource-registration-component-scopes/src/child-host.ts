import { customElement } from 'aurelia';
import template from './child-host.html';
import { DeepOnly } from './resources';

@customElement({ name: 'child-host', template, dependencies: [DeepOnly] })
export class ChildHost {}
