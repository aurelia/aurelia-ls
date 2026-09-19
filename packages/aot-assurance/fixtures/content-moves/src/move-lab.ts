/* global HTMLElement, Document, HTMLTemplateElement */
import { customElement } from 'aurelia';

@customElement({ name: 'move-lab', template: '<au-slot></au-slot>' })
export class MoveLab {
  static processContent(el: HTMLElement, platform: { document: Document }): void {
    const source = el.children[0]!;
    const target = el.children[1]!;
    const donor = el.children[2] as HTMLTemplateElement;
    const script = el.children[3]!;
    const scriptSource = el.children[4]!;
    const voidParent = el.children[5]!;
    const voidChild = el.children[6]!;
    const first = source.children[0]!;
    const second = source.children[1]!;
    const card = source.children[2]!;
    const replacement = source.children[3]!;
    const discarded = source.children[4]!;
    const textMoves = source.children[5]!;
    const adopted = donor.content.firstElementChild!;
    const initialDocument = adopted.ownerDocument;

    // These edits stay inside this host, retaining original node identities and bindings.
    const appended = target.appendChild(first) === first;
    target.appendChild(second);
    const reordered = target.insertBefore(second, first) === second;
    const removed = target.removeChild(first) === first && first.parentNode === null;
    target.appendChild(first);
    target.removeChild(first);
    target.appendChild(first);
    const replaced = target.replaceChild(replacement, second) === second && second.parentNode === null;
    source.appendChild(second);
    target.appendChild(card);
    source.removeChild(discarded);
    target.appendChild(adopted);
    textMoves.insertBefore(textMoves.lastChild!, textMoves.firstChild);
    target.appendChild(textMoves);
    script.appendChild(scriptSource.firstChild!);
    target.appendChild(script);
    el.removeChild(scriptSource);
    voidParent.appendChild(voidChild);
    target.appendChild(voidParent);

    el.setAttribute('data-return-values', `${appended}:${reordered}:${removed}:${replaced}`);
    el.setAttribute('data-order', `${target.firstElementChild === replacement}:${replacement.nextElementSibling === first}:${first.nextElementSibling === card}:${card.nextElementSibling === adopted}`);
    el.setAttribute('data-document-adoption', `${el.ownerDocument === platform.document}:${initialDocument === platform.document}:${adopted.ownerDocument === platform.document}:${donor.content.ownerDocument === initialDocument}`);
  }
}
