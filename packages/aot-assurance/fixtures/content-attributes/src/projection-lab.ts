/* global HTMLElement, HTMLTemplateElement, Document */
import { customElement } from 'aurelia';
import { InputTypeAttribute } from './native-input-attributes.js';

@customElement({
  name: 'projection-lab',
  template: '<section id="projection-first"><au-slot name="first"></au-slot></section><section id="projection-second"><au-slot name="second"></au-slot></section><input data-consumed-range="type" type="range" min="80" max="100">',
  dependencies: [InputTypeAttribute],
})
export class ProjectionLab {
  static processContent(host: HTMLElement, platform: { document: Document }): void {
    // Retain a readback on the same probe before it is moved into a generated projection.
    for (const child of host.children) {
      if (child.localName === 'projection-probe') {
        child.setAttribute('data-initial-document', String(child.ownerDocument === platform.document));
      } else if (child.localName === 'template') {
        for (const inner of (child as HTMLTemplateElement).content.children) {
          if (inner.localName === 'projection-probe') {
            inner.setAttribute('data-initial-document', String(inner.ownerDocument === platform.document));
          }
        }
      }
    }
  }
}
