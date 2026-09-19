/* global HTMLElement */

import { customElement } from 'aurelia';

@customElement({ name: 'native-outlets', template: '<au-slot></au-slot>' })
export class NativeOutlets {
  static processContent(el: HTMLElement): void {
    const doc = el.ownerDocument;
    function outlet(css: string, nameAttribute: string | null, name: string, fallback: string): void {
      const section = doc.createElement('section');
      section.setAttribute('class', css);
      const slot = doc.createElement('slot');
      if (nameAttribute !== null) slot.setAttribute(nameAttribute, name);
      const mark = doc.createElement('mark');
      mark.appendChild(doc.createTextNode(fallback));
      slot.appendChild(mark);
      section.appendChild(slot);
      el.appendChild(section);
    }
    outlet('native', 'name', 'native', '${label}:native-fallback');
    outlet('default', null, '', '${label}:default-fallback');
    outlet('generated-binding', 'name.bind', 'count === 0 ? "generated-zero" : "generated-one"', '${label}:binding-fallback');
    outlet('generated-interpolation', 'name', 'generated-interpolation-${count}', '${label}:interpolation-fallback');
  }
}
