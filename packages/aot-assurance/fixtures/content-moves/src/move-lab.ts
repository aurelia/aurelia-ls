/* global HTMLElement, Document, HTMLTemplateElement, Text, Comment */
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

    // Text edits change compiler expressions, not just the literal text around the old expression.
    const firstText = first.firstChild as Text;
    firstText.data = 'first:${message.toUpperCase()}';
    const movedText = textMoves.firstChild as Text;
    movedText.nodeValue = 'after:${message.length}';
    const replacedText = replacement.firstChild!;
    replacement.appendChild(discarded);
    replacement.textContent = 'replacement:${message.length}';

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
    const generatedText = inert.createTextNode('draft row');
    generatedText.data = 'generated:${item}:${message.toUpperCase()}';
    row.appendChild(generatedText);
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
    const fragmentPrevious = platform.document.createElement('b');
    fragmentPrevious.setAttribute('stamp.bind', 'message');
    fragmentPrevious.textContent = 'obsolete:${message}';
    fragment.appendChild(fragmentPrevious);
    fragment.textContent = 'fragment:${message.length}';
    const fragmentReadback = fragment.textContent === 'fragment:${message.length}'
      && fragmentPrevious.parentNode === null;
    const generatedComment = platform.document.createComment('draft comment');
    generatedComment.data = 'generated-content';
    fragment.appendChild(generatedComment);
    const fragmentReturned = wrapper.appendChild(fragment) === fragment;

    const cleared = inert.createElement('output');
    cleared.id = 'generated-cleared';
    const clearedText = inert.createTextNode('clear:${message}');
    cleared.appendChild(clearedText);
    cleared.textContent = '';
    wrapper.appendChild(cleared);
    const unused = inert.createElement('p');
    unused.id = 'generated-discarded';
    unused.setAttribute('stamp.bind', 'message');
    unused.appendChild(inert.createTextNode('discarded:${message}'));
    target.appendChild(wrapper);
    el.setAttribute('data-factories', `${fragmentReturned}:${fragment.firstChild === null}:${unused.parentNode === null}:${generatedCard.ownerDocument === platform.document}`);

    // Copies are snapshots with fresh identities; their bindings still enter the ordinary compiler pipeline.
    const copies = platform.document.createElement('section');
    copies.id = 'copied-wrapper';
    first.setAttribute('data-copy-state', 'before');
    const shallow = first.cloneNode(false) as HTMLElement;
    first.setAttribute('data-copy-state', 'after');
    const shallowWasEmpty = shallow.firstChild === null;
    shallow.id = 'shallow-copy';
    shallow.appendChild(platform.document.createTextNode('shallow:${message}'));
    copies.appendChild(shallow);

    const copiedConditional = conditional.cloneNode(true) as HTMLTemplateElement;
    const copiedRepeated = copiedConditional.content.firstElementChild as HTMLTemplateElement;
    copiedRepeated.content.firstElementChild!.className = 'copied-template-row';
    copies.appendChild(copiedConditional);

    // The source CE has already joined P; importing into I does not construct native custom elements.
    const copiedCard = inert.importNode(card, true);
    copiedCard.id = 'copied-card';
    copiedCard.children[0]!.className = 'copied-title';
    (copiedCard.children[1] as HTMLTemplateElement).content.firstElementChild!.className = 'copied-row';
    const copiedCardWasInert = copiedCard.ownerDocument === inert;
    copies.appendChild(copiedCard);
    copies.appendChild(textMoves.firstChild!.cloneNode());
    const copiedComment = generatedComment.cloneNode() as Comment;
    copiedComment.nodeValue = 'copied-content';
    copies.appendChild(copiedComment);
    target.appendChild(copies);
    el.setAttribute('data-copies', `${shallow !== first}:${shallowWasEmpty}:${shallow.getAttribute('data-copy-state') === 'before'}:${first.getAttribute('data-copy-state') === 'after'}:${copiedConditional !== conditional}:${copiedConditional.content !== conditional.content}:${copiedConditional.ownerDocument === platform.document}:${copiedConditional.content.ownerDocument === inert}:${copiedCardWasInert}:${copiedCard.ownerDocument === platform.document}:${card.ownerDocument === platform.document}`);
    el.setAttribute('data-text-edits', `${first.firstChild === firstText && firstText.textContent === 'first:${message.toUpperCase()}' && firstText.length === firstText.data.length}:${textMoves.firstChild === movedText && movedText.data === 'after:${message.length}'}:${replacedText.parentNode === null && discarded.parentNode === null}:${fragmentReadback}:${cleared.firstChild === null && clearedText.parentNode === null}:${generatedComment.data === 'generated-content' && copiedComment.data === 'copied-content' && copiedComment !== generatedComment}`);

    // Contextual markup is parsed before normal controller/resource lowering, just like authored content.
    const markup = platform.document.createElement('section');
    markup.id = 'markup-wrapper';
    const table = platform.document.createElement('table');
    table.id = 'markup-table';
    table.setAttribute('if.bind', 'active');
    table.innerHTML = '<tr repeat.for="item of items"><td stamp.bind="message">markup:${item}:${message}</td></tr>';
    const tableContext = table.firstElementChild!.localName === 'tbody';
    markup.appendChild(table);

    const parsedTemplate = inert.createElement('template') as HTMLTemplateElement;
    parsedTemplate.innerHTML = '<move-card id="parsed-card" value.bind="message"><b au-slot="title" stamp.bind="message">parsed-title:${message}</b><template au-slot="body" if.bind="active"><span class="parsed-body" stamp.bind="message">parsed-body:${message}</span></template></move-card><script id="parsed-script">window.contentMovesScriptRuns = (window.contentMovesScriptRuns ?? 0) + 1;</script><svg><script>window.contentMovesSvgScriptRuns = (window.contentMovesSvgScriptRuns ?? 0) + 1;</script></svg>';
    const parsedCard = parsedTemplate.content.firstElementChild!;
    const parsedInert = parsedCard.ownerDocument === inert;
    markup.appendChild(parsedTemplate.content);

    const readback = inert.createElement('p');
    readback.id = 'markup-readback';
    readback.innerHTML = '<b data-stage="before">before</b>';
    const beforeRoundtrip = readback.firstElementChild!;
    beforeRoundtrip.setAttribute('data-stage', '<after>');
    beforeRoundtrip.firstChild!.nodeValue = 'readback & ${message.toUpperCase()}';
    const liveSerialization = readback.innerHTML === '<b data-stage="&lt;after&gt;">readback &amp; ${message.toUpperCase()}</b>';
    readback.innerHTML = readback.innerHTML;
    const freshRoundtrip = readback.firstElementChild !== beforeRoundtrip && beforeRoundtrip.parentNode === null;
    markup.appendChild(readback);
    target.appendChild(markup);
    el.setAttribute('data-markup', `${tableContext}:${parsedInert}:${parsedTemplate.content.firstChild === null}:${parsedCard.ownerDocument === platform.document}:${liveSerialization}:${freshRoundtrip}`);
  }
}
