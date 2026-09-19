/* global HTMLElement, HTMLTemplateElement, Document */
import { customElement } from 'aurelia';

@customElement({
  name: 'projection-probe',
  template: '<au-slot name="generated"><b class="projection-fallback">missing generated projection</b></au-slot>',
})
export class ProjectionProbe {
  static processContent(host: HTMLElement, platform: { document: Document }): void {
    // The parent consumes every selected au-slot before compiling any projection's content.
    host.setAttribute('data-projection-read', `${host.getAttribute('au-slot')}:${host.hasAttribute('au-slot')}:${host.getAttributeNS(null, 'au-slot')}:${host.hasAttributeNS(null, 'au-slot')}`);
    host.setAttribute('data-before-names', host.getAttributeNames().join('|'));
    // This has the same qualified name as the consumed attribute, but is a fresh DOM attribute.
    host.setAttribute('au-slot', 'hook-created');
    host.setAttribute('title.bind', 'message');
    host.classList.add('projection-probe');
    const child = host.firstElementChild!;
    const nestedTemplate = host.children[1] as HTMLTemplateElement;
    host.setAttribute('data-document-view', `${host.ownerDocument === platform.document}:${child.ownerDocument === host.ownerDocument}:${nestedTemplate.ownerDocument === host.ownerDocument}:${nestedTemplate.content.ownerDocument === platform.document}:${nestedTemplate.content.ownerDocument === host.ownerDocument}:${nestedTemplate.content.firstElementChild!.ownerDocument === nestedTemplate.content.ownerDocument}`);
    host.setAttribute('data-child-slot-before', child.getAttribute('au-slot')!);
    child.removeAttribute('au-slot');
    child.setAttribute('au-slot', 'generated');
    child.setAttribute('stamp.bind', 'message');
  }
}
