import { customElement } from '@aurelia/runtime-html';
import { DynamicGate } from './dynamic-gate.js';
import { LateTarget } from './late-target.js';
import template from './runtime-page.html';

@customElement({ name: 'runtime-page', template, dependencies: [DynamicGate, LateTarget], bindables: ['message'] })
export class RuntimePage {
  message = '';
}
