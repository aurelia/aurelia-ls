import { customElement } from 'aurelia';

const gateTemplate = '<template><header class="gate-heading">${value}</header><div class="gate-slot"><au-slot>fallback:${value}</au-slot></div></template>';

@customElement({ name: 'opaque-literal', template: gateTemplate, bindables: ['value'] })
export class OpaqueLiteral {
  value = '';
  static processContent(): boolean { return false; }
}

// Keep the same DOM vocabulary as the compatible golden so both use one browser oracle.
// This is deliberately a separate closed policy, not a rewrite of the mutable original.
@customElement({ name: 'opaque-policy', template: gateTemplate, bindables: ['value'] })
export class OpaquePolicy {
  value = '';
  static processContent(): boolean { return false; }
}

@customElement({ name: 'transparent-gate', template: gateTemplate, bindables: ['value'] })
export class TransparentGate {
  value = '';
  static processContent(): boolean { return true; }
}

@customElement({ name: 'undecided-gate', template: gateTemplate, bindables: ['value'] })
export class UndecidedGate {
  value = '';
  static processContent(): void { return undefined; }
}
