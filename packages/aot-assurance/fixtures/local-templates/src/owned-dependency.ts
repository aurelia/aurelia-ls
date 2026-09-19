/* global HTMLElement, Document */
import { customElement } from 'aurelia';

@customElement({
  name: 'owned-dependency',
  template: '<small class="owned-dependency">owned</small>',
})
export class OwnedDependency {
  static processContent(host: HTMLElement, platform: { document: Document }): void {
    host.setAttribute('data-hook-platform-document', String(host.ownerDocument === platform.document));
  }
}
