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
    const generatedAuthored = el.children[7]!;
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

    // Generated native content joins existing authored nodes before the compiler visits the transformed subtree.
    const wrapper = platform.document.createElement('section');
    wrapper.id = 'generated-wrapper';
    wrapper.setAttribute('title.bind', 'message');
    wrapper.setAttribute('stamp.bind', 'message');
    wrapper.appendChild(generatedAuthored);

    const inert = donor.content.ownerDocument;
    const conditional = inert.createElement('template') as HTMLTemplateElement;
    conditional.setAttribute('if.bind', 'active');
    const repeated = inert.createElement('template') as HTMLTemplateElement;
    repeated.setAttribute('repeat.for', 'item of items');
    const row = inert.createElement('p');
    row.className = 'generated-row';
    row.setAttribute('stamp.bind', 'message');
    row.appendChild(inert.createTextNode('generated:${item}:${message}'));
    repeated.content.appendChild(row);
    conditional.content.appendChild(repeated);
    wrapper.appendChild(conditional);

    // Custom names are created in inert template contents, matching the safe browser construction boundary.
    const generatedCard = inert.createElement('move-card');
    generatedCard.id = 'generated-card';
    generatedCard.setAttribute('value.bind', 'message');
    const generatedTitle = inert.createElement('b');
    generatedTitle.setAttribute('au-slot', 'title');
    generatedTitle.setAttribute('stamp.bind', 'message');
    generatedTitle.appendChild(inert.createTextNode('generated-title:${message}'));
    generatedCard.appendChild(generatedTitle);
    const generatedBody = inert.createElement('template') as HTMLTemplateElement;
    generatedBody.setAttribute('au-slot', 'body');
    generatedBody.setAttribute('if.bind', 'active');
    const body = inert.createElement('span');
    body.className = 'generated-body';
    body.setAttribute('stamp.bind', 'message');
    body.appendChild(inert.createTextNode('generated-body:${message}'));
    generatedBody.content.appendChild(body);
    generatedCard.appendChild(generatedBody);
    wrapper.appendChild(generatedCard);

    const local = inert.createElement('let');
    local.setAttribute('generated-label.bind', "message + '-local'");
    wrapper.appendChild(local);
    const localValue = inert.createElement('output');
    localValue.id = 'generated-let-value';
    localValue.setAttribute('stamp.bind', 'generatedLabel');
    localValue.appendChild(inert.createTextNode('let:${generatedLabel}'));
    wrapper.appendChild(localValue);

    const slot = inert.createElement('au-slot');
    slot.setAttribute('name', 'missing-generated-slot');
    const slotFallback = inert.createElement('em');
    slotFallback.id = 'generated-slot-fallback';
    slotFallback.setAttribute('stamp.bind', 'message');
    slotFallback.appendChild(inert.createTextNode('fallback:${message}'));
    slot.appendChild(slotFallback);
    const rejectedFirst = inert.createElement('b');
    rejectedFirst.id = 'generated-slot-rejected-first';
    rejectedFirst.setAttribute('au-slot', 'unused');
    rejectedFirst.setAttribute('stamp.bind', 'message');
    rejectedFirst.appendChild(inert.createTextNode('rejected-first:${message}'));
    slot.appendChild(rejectedFirst);
    const rejectedSecond = inert.createElement('i');
    rejectedSecond.id = 'generated-slot-rejected-second';
    rejectedSecond.setAttribute('au-slot', 'unused');
    rejectedSecond.appendChild(inert.createTextNode('rejected-second:${message}'));
    slot.appendChild(rejectedSecond);
    wrapper.appendChild(slot);

    const fragment = platform.document.createDocumentFragment();
    fragment.appendChild(platform.document.createComment('generated-content'));
    fragment.appendChild(platform.document.createTextNode('fragment:${message}'));
    const fragmentReturned = wrapper.appendChild(fragment) === fragment;
    const unused = inert.createElement('p');
    unused.id = 'generated-discarded';
    unused.setAttribute('stamp.bind', 'message');
    unused.appendChild(inert.createTextNode('discarded:${message}'));
    target.appendChild(wrapper);
    el.setAttribute('data-factories', `${fragmentReturned}:${fragment.firstChild === null}:${unused.parentNode === null}:${generatedCard.ownerDocument === platform.document}`);
  }
}
