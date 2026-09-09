import { customElement } from 'aurelia';
import { compileChildren, noDecision } from './content-policy.js';

const gateTemplate = '<template><header class="gate-heading">${value}</header><div class="gate-slot"><au-slot>fallback:${value}</au-slot></div></template>';

@customElement({ name: 'opaque-literal', template: gateTemplate, bindables: ['value'] })
export class OpaqueLiteral {
  value = '';
  static processContent(): boolean { return false; }
}

@customElement({ name: 'opaque-policy', template: gateTemplate, bindables: ['value'] })
export class OpaquePolicy {
  value = '';
  static compile = false;
  static processContent(): boolean { return compileChildren(this.compile); }
}

@customElement({ name: 'transparent-gate', template: gateTemplate, bindables: ['value'] })
export class TransparentGate {
  value = '';
  static compile = true;
  static processContent(): boolean { return compileChildren(this.compile); }
}

@customElement({ name: 'undecided-gate', template: gateTemplate, bindables: ['value'] })
export class UndecidedGate {
  value = '';
  static processContent(): void { return noDecision(); }
}
