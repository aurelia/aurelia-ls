import { CustomElement, customElement } from '@aurelia/runtime-html';
import { LateTarget } from './late-target.js';

@customElement({ name: 'dynamic-gate', template: '<au-slot></au-slot>' })
export class DynamicGate {
  static calls = 0;

  static processContent(node: HTMLElement): void {
    // The first mutation must not leak out of a refused speculative compilation.
    node.setAttribute('data-passes', String(Number(node.getAttribute('data-passes') ?? '0') + 1));
    node.setAttribute('data-width', String(node.getBoundingClientRect().width));
    // The effect after an unsupported API changes a different definition before its first compilation.
    // Preserving only RuntimePage while precompiling LateTarget would not preserve JIT behavior.
    Object.assign(CustomElement.getDefinition(LateTarget), {
      template: '<section class="late-target-value"><strong>rewritten:${message.toUpperCase()}</strong></section>',
    });
    this.calls++;
  }
}
