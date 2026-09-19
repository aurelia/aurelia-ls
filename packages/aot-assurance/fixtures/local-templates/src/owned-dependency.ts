/* global HTMLElement, Document */
import { customElement } from 'aurelia';

@customElement({
  name: 'owned-dependency',
  template: '<small class="owned-dependency">owned</small><au-slot></au-slot>',
})
export class OwnedDependency {
  static processContent(host: HTMLElement, platform: { document: Document }): void {
    host.setAttribute('data-hook-platform-document', String(host.ownerDocument === platform.document));
    const wrapper = host.children[0]!;
    const first = host.children[1]!;
    const second = host.children[2]!;
    const discarded = host.children[3]!;
    wrapper.appendChild(first);
    wrapper.appendChild(second);
    wrapper.insertBefore(second, first);
    host.removeChild(discarded);
    host.removeAttribute('data-remove');
  }
}
