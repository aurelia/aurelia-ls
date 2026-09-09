import { customElement } from 'aurelia';

@customElement({ name: 'attribute-lab', template: '<au-slot></au-slot>' })
export class AttributeLab {
  static processContent(host: HTMLElement): void {
    host.setAttribute('data-host-created', 'yes');
    host.classList.add('generated-host');
    for (const child of host.children) {
      switch (child.getAttribute('data-case')) {
        case 'order': {
          child.removeAttribute('data-remove');
          child.setAttribute('DATA-SECOND', 'replaced');
          child.removeAttribute('data-first');
          child.setAttribute('data-first', 'readded');
          const added = child.toggleAttribute('data-toggle');
          const removed = child.toggleAttribute('data-toggle');
          child.toggleAttribute('data-forced', true);
          child.toggleAttribute('data-absent', false);
          child.setAttribute('data-toggle-result', `${added}:${removed}:${child.hasAttribute('data-forced')}`);
          child.setAttributeNS(null, 'DATA-UPPER', 'upper');
          child.setAttribute('data-namespace-case', `${child.getAttributeNS(null, 'DATA-UPPER')}:${child.getAttributeNS(null, 'data-upper')}:${child.getAttribute('DATA-UPPER')}`);
          child.setAttribute('data-order', child.getAttributeNames().join('|'));
          break;
        }
        case 'input':
          child.removeAttribute('value');
          child.removeAttribute('placeholder.bind');
          child.removeAttribute('title.bind');
          child.setAttribute('value.two-way', 'message');
          child.setAttribute('title.bind', 'message');
          break;
        case 'attribute':
          child.setAttribute('stamp.bind', 'message');
          break;
        case 'element':
          child.setAttribute('as-element', 'attribute-card');
          child.setAttribute('label.bind', 'message');
          break;
        case 'conditional':
          child.setAttribute('if.bind', 'active');
          break;
        case 'repeat':
          child.setAttribute('repeat.for', 'item of items');
          child.setAttribute('if.bind', 'active && item !== "two"');
          break;
        case 'select':
          // Creation order intentionally disagrees with the runtime's required binding order.
          child.setAttribute('value.two-way', 'selected');
          child.setAttribute('multiple.bind', 'multiple');
          break;
        case 'classes':
          child.classList.value = 'base base old';
          child.classList.add('accent', 'base');
          child.classList.remove('old', 'missing');
          child.classList.toggle('active', true);
          child.classList.toggle('gone', false);
          child.classList.replace('accent', 'highlight');
          child.setAttribute('data-tokens', `${child.classList.length}:${child.classList.item(1)}:${child.classList.contains('active')}`);
          break;
        case 'svg': {
          child.setAttribute('viewBox', '0 0 10 10');
          const link = child.firstElementChild!;
          link.classList.add('accent', 'base');
          link.classList.remove('old');
          link.classList.toggle('active');
          link.classList.replace('accent', 'highlight');
          link.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#intermediate');
          link.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
          link.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#final');
          link.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', 'en');
          link.setAttribute('data-namespace-read', `${link.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')}:${link.getAttributeNS('http://www.w3.org/1999/xlink', 'href')}`);
          break;
        }
      }
    }
  }
}
