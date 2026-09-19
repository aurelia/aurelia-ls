import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { StaticEvaluator } from '../src/evaluation/evaluator.js';
import {
  evaluateStaticCallableCompletion,
  StaticCallableCompletionKind,
  StaticCallableTarget,
} from '../src/evaluation/function-execution.js';
import { StaticEvaluationPolicy } from '../src/evaluation/policy.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';
import {
  TemplateCompilerHookMembershipState,
  TemplateCompilerHookSet,
} from '../src/template/compiler-hook-world.js';
import { TemplateCompilerDomHost } from '../src/template/template-compiler-dom-host.js';
import {
  TemplateCompilerCallableReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerHookOperationStage,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
} from '../src/template/template-compiler-execution.js';
import { TemplateCompilerHookBootstrapResult, TemplateCompilerHookBootstrapState } from '../src/template/template-compiler-hook-bootstrap.js';
import { TemplateCompilerLocalExtractionResult, TemplateCompilerLocalExtractionState } from '../src/template/template-compiler-local-extraction.js';
import { TemplateCompilerElementOccurrence, TemplateCompilerOccurrenceForest } from '../src/template/template-compiler-occurrence.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('interpreted compiler DOM host', () => {
  test.each([
    ['authored source write', 'target.setAttribute("src", "changed.png");', 'setAttribute'],
    ['namespaced write', 'target.setAttributeNS(null, "src", "changed.png");', 'setAttributeNS'],
    ['source removal', 'target.removeAttribute("src");', 'removeAttribute'],
    ['namespaced removal', 'target.removeAttributeNS(null, "src");', 'removeAttributeNS'],
    ['attribute toggle', 'target.toggleAttribute("src", false);', 'toggleAttribute'],
    ['reflection', 'target.id = "changed";', 'id'],
    ['class tokens', 'target.classList.add("changed");', 'add'],
    ['class value', 'target.classList.value = "changed";', 'value'],
    ['subtree removal', 'target.remove();', 'remove'],
    ['resource relocation', 'wrapper.appendChild(target);', 'appendChild'],
    ['new unused platform image', 'const resource=platform.document.createElement("img");resource.setAttribute("src","new.png");', 'setAttribute'],
    ['inert resource adoption', `const carrier=platform.document.createElement('template');
      const resource=carrier.content.ownerDocument.createElement('img');resource.setAttribute('src','new.png');
      wrapper.appendChild(resource);`, 'appendChild'],
    ['resource in generated wrapper', `const carrier=platform.document.createElement('template');
      const group=carrier.content.ownerDocument.createElement('section');
      const resource=group.ownerDocument.createElement('img');resource.setAttribute('src','new.png');
      group.appendChild(resource);wrapper.appendChild(group);`, 'appendChild'],
    ['dynamic script child insertion', `const script=platform.document.createElement('script');
      script.appendChild(platform.document.createTextNode('sideEffect()'));`, 'appendChild'],
  ] as const)('refuses unclosed native resource effects and rolls back prior generated wrappers: %s', (_name, body, member) => {
    const run = new DomHookRun('<div><img src="original.png" class="before"><i></i></div>', true);
    try {
      const children = [...run.root.readChildren()];
      const nodeCount = run.execution.forest.readNodes().length;
      const attributeCount = run.execution.forest.readAttributes().length;
      const result = run.invoke(`function hook(node,platform) {
        const target=node.firstChild;
        const wrapper=node.ownerDocument.createElement('section');
        node.appendChild(wrapper);wrapper.appendChild(node.children[1]);
        try { ${body} } catch(error) { return true; }
        return true;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'native-resource-effects', member });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(children);
      expect((children[0] as TemplateCompilerElementOccurrence).readAttributes().map(attribute => attribute.value))
        .toEqual(['original.png', 'before']);
      expect(run.execution.forest.readNodes()).toHaveLength(nodeCount);
      expect(run.execution.forest.readAttributes()).toHaveLength(attributeCount);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test.each([
    ['audio', `const resource=platform.document.createElement('audio');resource.id='changed';`],
    ['video', `const resource=platform.document.createElement('video');resource.setAttribute('preload','auto');`],
    ['source', `const resource=platform.document.createElement('source');resource.setAttribute('src','media');`],
    ['track', `const resource=platform.document.createElement('track');resource.setAttribute('src','captions');`],
    ['object', `const resource=platform.document.createElement('object');resource.setAttribute('data','object');`],
    ['embed', `const resource=platform.document.createElement('embed');resource.setAttribute('src','embed');`],
    ['iframe', `const resource=platform.document.createElement('iframe');resource.setAttribute('src','frame');`],
    ['link', `const resource=platform.document.createElement('link');resource.setAttribute('href','sheet');`],
    ['input src', `const resource=platform.document.createElement('input');resource.setAttribute('src','image');`],
    ['input type', `const resource=platform.document.createElement('input');resource.setAttribute('type','IMAGE');`],
    ['SVG image', `const resource=platform.document.createElementNS('http://www.w3.org/2000/svg','image');resource.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href','image');`],
    ['SVG use', `const resource=platform.document.createElementNS('http://www.w3.org/2000/svg','use');resource.setAttribute('href','external.svg#id');`],
    ['SVG feImage', `const resource=platform.document.createElementNS('http://www.w3.org/2000/svg','feImage');resource.setAttribute('href','filter.png');`],
  ] as const)('keeps the current native resource envelope conservative for %s', (_name, body) => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node,platform) { ${body} }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal?.kind).toBe('native-resource-effects');
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('keeps inert resource edits, parsed scripts, ordinary inputs, and inert nested template content admitted', () => {
    const run = new DomHookRun('<div><script></script><template><img></template></div>', true);
    try {
      const result = run.invoke(`function hook(node,platform) {
        const carrier=node.children[1];
        const image=carrier.content.firstChild;
        image.setAttribute('src','before.png');image.removeAttribute('src');
        image.setAttributeNS(null,'src','after.png');image.classList.add('inert');
        const created=image.ownerDocument.createElement('img');created.setAttribute('src','created.png');
        carrier.content.appendChild(created);
        node.appendChild(carrier);
        node.firstChild.appendChild(platform.document.createTextNode('parsed script stays inert'));
        const input=platform.document.createElement('input');input.setAttribute('type','text');input.className='plain';
        input.setAttributeNS('urn:not-native','p:type','image');node.appendChild(input);
        return image.getAttribute('src')==='after.png' && image.className==='inert'
          && created.ownerDocument===image.ownerDocument && image.ownerDocument!==platform.document;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('validates native arguments before the resource-effect boundary and permits actual no-ops', () => {
    const run = new DomHookRun('<div><img src="existing.png" class="before"></div>', true);
    try {
      const result = run.invoke(`function hook(node) {
        const image=node.firstChild;
        let invalidName=false,invalidToken=false,invalidChild=false;
        try{image.setAttribute('bad name','x');}catch(error){invalidName=error.name==='InvalidCharacterError';}
        try{image.classList.add('bad token');}catch(error){invalidToken=error.name==='InvalidCharacterError';}
        try{image.removeChild(node);}catch(error){invalidChild=error.name==='NotFoundError';}
        image.removeAttribute('absent');image.classList.toggle('before',true);
        return invalidName&&invalidToken&&invalidChild&&image.hasAttribute('src');
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('creates detached nodes with native names, document affiliation and template contents', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node,platform){
        const doc=node.ownerDocument, wrapper=doc.createElement('SECTION');
        wrapper.setAttribute('title.bind','message');
        const text=doc.createTextNode(0x10n),comment=doc.createComment('static--comment');
        const fragment=platform.document.createDocumentFragment();
        const template=platform.document.createElement('template');
        const custom=template.content.ownerDocument.createElement('generated-card');
        const svg=doc.createElementNS('http://www.w3.org/2000/svg','linearGradient');
        svg.setAttribute('id','gradient');
        fragment.appendChild(text);fragment.appendChild(comment);
        wrapper.appendChild(fragment);wrapper.appendChild(svg);template.content.appendChild(custom);
        node.appendChild(wrapper);node.appendChild(template);
        return wrapper.nodeName==='SECTION'&&wrapper.localName==='section'&&wrapper.parentNode===node
          &&text.data==='16'&&comment.data==='static--comment'&&fragment.childNodes.length===0
          &&fragment.ownerDocument===platform.document&&text.ownerDocument===doc
          &&template.ownerDocument===doc&&template.content.ownerDocument===doc
          &&custom.ownerDocument===doc&&custom.parentNode===template.content
          &&svg.nodeName==='linearGradient'&&svg.namespaceURI==='http://www.w3.org/2000/svg';
      }`);
      expect(result.kind, run.host.refusal?.summary ?? result.evaluation?.auditOpenSeams.map(seam => seam.summary).join('\n'))
        .toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(2);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each([
    ['node.ownerDocument.createElement("bad name")', 'InvalidCharacterError'],
    ['node.ownerDocument.createElement("")', 'InvalidCharacterError'],
    ['node.ownerDocument.createElement("1x")', 'InvalidCharacterError'],
    ['node.ownerDocument.createElementNS(null,"p:x")', 'NamespaceError'],
    ['node.ownerDocument.createElementNS("urn:wrong","xml:x")', 'NamespaceError'],
    ['node.ownerDocument.createTextNode()', 'TypeError'],
    ['node.ownerDocument.createComment()', 'TypeError'],
    ['node.ownerDocument.createElementNS("http://www.w3.org/2000/svg")', 'TypeError'],
  ] as const)('keeps native factory failure catchable: %s', (body, name) => {
    const run = new DomHookRun('<div></div>');
    try {
      const count = run.execution.forest.readNodes().length;
      const result = run.invoke(`function hook(node){try{${body};}catch(error){return error.name==='${name}';}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toHaveLength(count);
    } finally { run.dispose(); }
  });

  test.each([
    ['platform.document.createElement("native-widget")', 'native-custom-element-construction'],
    ['platform.document.createElement("button",{is:"native-button"})', 'dom-creation-options'],
    ['node.ownerDocument.createElement("x",{})', 'dom-creation-options'],
    ['node.ownerDocument.createElementNS("urn:x","thing")', 'dom-element-namespace'],
    ['node.ownerDocument.createElementNS("http://www.w3.org/2000/svg","svg:path")', 'dom-element-prefix'],
    ['node.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","DIV")', 'dom-html-name-case'],
    ['node.ownerDocument.createElement("a=b")', 'dom-name-compatibility'],
  ] as const)('refuses unsupported factory behavior and rolls back generated inventory: %s', (body, kind) => {
    const run = new DomHookRun('<div><i></i></div>');
    try {
      const original = [...run.execution.forest.readNodes()];
      const child = run.root.readChildren()[0]!;
      const result = run.invoke(`function hook(node,platform){
        const wrapper=node.ownerDocument.createElement('section');
        wrapper.appendChild(node.firstChild);node.appendChild(wrapper);wrapper.setAttribute('data-created','yes');
        try{${body};}catch(error){return false;}
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind });
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toEqual(original);
      expect(run.root.readChildren()).toEqual([child]);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test.each([
    ['<button is="native-original"></button>', 'node.removeAttribute("is");', 'native-original', null],
    ['<button is="native-original"></button>', 'node.setAttribute("is", "native-rewritten");', 'native-original', 'native-rewritten'],
    ['<button></button>', 'node.setAttribute("is", "native-added");', null, 'native-added'],
    ['<svg is="not-an-html-element"></svg>', 'node.removeAttribute("is");', null, null],
  ] as const)('keeps native creation identity separate from hook attribute edits: %s', (markup, body, original, final) => {
    const run = new DomHookRun(markup);
    try {
      expect(run.root.customElementIs).toBe(original);
      const result = run.invoke(`function hook(node) { ${body} }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      run.complete(result.kind);
      expect(run.root.customElementIs).toBe(original);
      expect(run.root.readAttributes().find(attribute => attribute.name === 'is')?.value ?? null).toBe(final);
    } finally { run.dispose(); }
  });

  test('reads node identity, namespace, text, template-content, and ordinary-child navigation through graph forks', () => {
    const run = new DomHookRun('<div id="host">lead<!--comment--><i></i><b>tail</b><template><span>inert</span></template><svg><linearGradient></linearGradient></svg></div>');
    try {
      const result = run.invoke(`
        function hook(node, platform) {
          const children = node.children;
          const nested = children[2];
          const fragment = nested.content;
          const first = node.firstElementChild;
          return [node.nodeType === 1, node.nodeName === 'DIV', node.tagName === 'DIV',
            node.localName === 'div', node.namespaceURI === 'http://www.w3.org/1999/xhtml',
            node.ownerDocument !== platform.document, first.ownerDocument === node.ownerDocument,
            fragment.ownerDocument === node.ownerDocument, node.ownerDocument.ownerDocument === null,
            node.ownerDocument.nodeType === 9, platform.document.nodeName === '#document', first === children.item(0),
            first !== children[1], first.parentElement === node, first.parentNode === node,
            first.previousSibling.nodeType === 8, first.nextElementSibling === children[1],
            node.childNodes === node.childNodes, children === node.children,
            node.childElementCount === 4, node.childNodes.length === 6,
            node.firstChild.nodeValue === 'lead', node.firstChild.data === 'lead',
            node.firstChild.nextSibling.textContent === 'comment',
            node.textContent === 'leadtail', nested.textContent === '',
            fragment.nodeType === 11, fragment.parentNode === null, fragment.parentElement === null,
            fragment.firstChild.textContent === 'inert', !node.contains(fragment.firstChild),
            node.contains(node), node.contains(first), !node.contains(null),
            children[3].firstChild.tagName === 'linearGradient',
            children.item(99) === null, children[99] === undefined,
            children.item(true) === children[1], children.item(undefined) === children[0]].every(value => value);
        }
      `);
      expect(result.evaluation?.auditOpenSeams.map((seam) => `${seam.summary}: ${seam.node.getText()}`)).toEqual([]);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ kind: EvaluationValueKind.Boolean, value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('mutates existing attributes through the pending overlay and keeps class queries live', () => {
    const run = new DomHookRun('<div id="before" class="before" slot="before"><i class="x" data-v="0"></i><i class="y" data-v="0"></i></div>');
    try {
      const result = run.invoke(`
        function hook(node) {
          const xs = node.getElementsByClassName('x');
          const items = node.getElementsByTagName('I');
          const names = node.getAttributeNames(); names.push('local-only');
          node.id = 'after'; node.className = 'after'; node.slot = 'after';
          items[1].setAttribute('CLASS', 'x');
          items[0].setAttribute('data-v', 42);
          return node.id === 'after' && node.getAttribute('ID') === 'after'
            && node.className === 'after' && node.slot === 'after'
            && node.hasAttribute('id') && !node.hasAttribute('absent')
            && node.getAttribute('absent') === null
            && node.getAttributeNames().join(',') === 'id,class,slot'
            && names.length === 4
            && xs.length === 2 && items[0].getAttribute('data-v') === '42';
        }
      `);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.root.readAttributes()[0]!.value).toBe('before');
      run.complete(result.kind);
      expect(run.root.readAttributes().map((attribute) => attribute.value)).toEqual(['after', 'after', 'after']);
    } finally { run.dispose(); }
  });

  test('creates, rewrites, removes, and readds attributes in DOM list order within one pending invocation', () => {
    const run = new DomHookRun('<div a="original" b="retained"></div>');
    try {
      const original = run.root.readAttributes()[0]!;
      const result = run.invoke(`function hook(node) {
        node.setAttribute('a', 'pending');
        node.removeAttribute('a');
        node.setAttribute('A', 'new');
        node.setAttribute('data-new', 0xFFn);
        node.id = null;
        const created = node.toggleAttribute('data-flag', undefined);
        const removed = node.toggleAttribute('DATA-FLAG');
        const unchanged = node.toggleAttribute('absent', false);
        return node.hasAttributes() && node.getAttributeNames().join(',') === 'b,a,data-new,id'
          && node.getAttribute('A') === 'new' && node.getAttribute('data-new') === '255'
          && node.id === 'null' && created && !removed && !unchanged;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(original.owner).toBeNull();
      expect(run.root.readAttributes().map(attribute => [attribute.name, attribute.value])).toEqual([
        ['b', 'retained'], ['a', 'new'], ['data-new', '255'], ['id', 'null'],
      ]);
      expect(run.root.readAttributes()[1]).not.toBe(original);
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('keeps namespace/local-name lookup distinct from qualified-name lookup and preserves existing prefixes', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node) {
        node.setAttributeNS('urn:test', 'p:key', 'first');
        node.setAttributeNS('urn:test', 'q:key', 'second');
        const prefixKept = node.getAttributeNames()[0] === 'p:key' && node.getAttribute('q:key') === null;
        node.setAttribute('p:key', 'third');
        const reads = node.hasAttributeNS('urn:test', 'key') && node.getAttributeNS('urn:test', 'key') === 'third';
        node.setAttributeNS(null, 'DATA-X', 'upper');
        const uppercase = node.getAttributeNS('', 'DATA-X') === 'upper' && node.getAttribute('DATA-X') === null;
        node.removeAttribute('DATA-X');
        const stillPresent = node.hasAttributeNS(undefined, 'DATA-X');
        node.removeAttributeNS(undefined, 'DATA-X');
        node.removeAttributeNS('urn:test', 'key');
        node.setAttributeNS('urn:test', 'q:key', 'readded');
        node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', 'en');
        node.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:p', 'urn:test');
        return prefixKept && reads && uppercase && stillPresent && !node.hasAttributeNS(null, 'DATA-X')
          && node.getAttributeNames().join(',') === 'q:key,xml:lang,xmlns:p';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readAttributes().map(attribute => [attribute.name, attribute.namespaceUri, attribute.prefix, attribute.value])).toEqual([
        ['key', 'urn:test', 'q', 'readded'],
        ['lang', 'http://www.w3.org/XML/1998/namespace', 'xml', 'en'],
        ['p', 'http://www.w3.org/2000/xmlns/', 'xmlns', 'urn:test'],
      ]);
    } finally { run.dispose(); }
  });

  test('reflects id, className, slot, and class tokens only from null-namespace attributes', () => {
    const run = new DomHookRun('<div><i></i></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const child = node.firstChild;
        child.setAttributeNS('urn:other', 'class', 'fake');
        child.setAttributeNS('urn:other', 'id', 'fake');
        child.setAttributeNS('urn:other', 'slot', 'fake');
        return child.getAttribute('class') === 'fake' && child.className === '' && child.id === '' && child.slot === ''
          && child.classList.value === '' && child.classList.length === 0
          && node.getElementsByClassName('fake').length === 0;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('keeps classList identity live across creation, raw value replacement, removal, and normalization', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const classes = node.classList;
        classes.add(); classes.remove();
        const absent = !node.hasAttribute('class');
        classes.value = '';
        const createdEmpty = node.hasAttribute('class');
        node.removeAttribute('class');
        const removed = classes.length === 0 && classes.value === '';
        classes.add('b', 'a', 'b');
        classes.toggle('c', undefined);
        classes.replace('b', 'c');
        const ordered = classes.value === 'c a';
        classes.replace('c', 'a');
        const deduplicated = classes.value === 'a';
        classes.value = '  z z  y ';
        const raw = classes.value === '  z z  y ' && classes.toString() === '  z z  y ' && classes.length === 2;
        node.classList = 'q q r';
        return absent && createdEmpty && removed && ordered && deduplicated && raw && classes === node.classList
          && classes.item(true) === 'r' && classes.item(99) === null && classes[99] === undefined
          && Array.from(classes).join(',') === 'q,r' && node.className === 'q q r';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readAttributes()[0]!.value).toBe('q q r');
    } finally { run.dispose(); }
  });

  test('preserves raw class spacing on toggle/replace no-ops, but normalizes zero-argument add/remove', () => {
    const run = new DomHookRun('<div class=" a  a&#9;b "></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const classes = node.classList;
        const raw = classes.value;
        const contains = !classes.contains('') && !classes.contains('a b');
        const present = classes.toggle('a', true);
        const absent = classes.toggle('missing', false);
        const replaced = classes.replace('missing', 'x');
        const preserved = classes.value === raw;
        classes.add();
        const normalized = classes.value === 'a b';
        classes.value = ' c  c d ';
        classes.remove();
        return contains && present && !absent && !replaced && preserved && normalized && classes.value === 'c d';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('uses WebIDL optional boolean coercion, including explicit undefined and hexadecimal BigInt zero', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const classes = node.classList;
        const zeroClass = classes.toggle('zero', 0x0n);
        const zeroAttribute = node.toggleAttribute('data-zero', 0x0n);
        const addedClass = classes.toggle('x', undefined);
        const addedAttribute = node.toggleAttribute('data-x', undefined);
        const removedClass = classes.toggle('x', undefined);
        const removedAttribute = node.toggleAttribute('data-x', undefined);
        const trueObject = classes.toggle('always', {});
        return !zeroClass && !zeroAttribute && addedClass && addedAttribute && !removedClass && !removedAttribute
          && !node.hasAttribute('data-zero') && trueObject && classes.value === 'always';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['for-of', `const seen=[];for(const token of classes){seen.push(token);classes.remove(token);}return seen.join(',')==='a,c';`, 'b'],
    ['spread', `const seen=[];for(const token of [...classes]){seen.push(token);classes.remove(token);}return seen.join(',')==='a,b,c';`, ''],
    ['Array.from', `const seen=Array.from(classes,token=>{classes.remove(token);return token;});return seen.join(',')==='a,c';`, 'b'],
    ['forEach', `const seen=[];classes.forEach(token=>{seen.push(token);classes.remove(token);});return seen.join(',')==='a,c';`, 'b'],
    ['named iterators', `const values=classes.values();const first=values.next();classes.remove('a');const next=values.next();const last=values.next();classes.add('d');return first.value==='a'&&!first.done&&next.value==='c'&&last.done&&values.next().done&&[...classes.keys()].join(',')==='0,1,2'&&Array.from(classes.entries(),pair=>pair.join(':')).join(',')==='0:b,1:c,2:d';`, 'b c d'],
  ] as const)('preserves live class token %s iteration', (_name, body, expected) => {
    const run = new DomHookRun('<div class="a b c"></div>');
    try {
      const result = run.invoke(`function hook(node){const classes=node.classList;${body}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readAttributes()[0]!.value).toBe(expected);
    } finally { run.dispose(); }
  });

  test('classList.forEach snapshots length while its iterator observes appended tokens', () => {
    const run = new DomHookRun('<div class="a"></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const classes = node.classList;
        const seen = [];
        classes.forEach(token => { seen.push(token); if(token === 'a') classes.add('b'); });
        const initialLength = seen.join(',') === 'a' && classes.value === 'a b';
        classes.value = 'a';
        const live = Array.from(classes, token => { if(token === 'a') classes.add('b'); return token; });
        return initialLength && live.join(',') === 'a,b';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each(['node.contains === node.classList.contains', 'typeof node.classList.add'])('keeps unsupported DOM method introspection open: %s', expression => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){if (${expression}) node.setAttribute('data-introspection', 'yes'); return false;}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['node.setAttribute("bad name", "x")', 'InvalidCharacterError'],
    ['node.toggleAttribute("")', 'InvalidCharacterError'],
    ['node.setAttributeNS(null, "p:key", "x")', 'NamespaceError'],
    ['node.setAttributeNS("urn:wrong", "xml:lang", "x")', 'NamespaceError'],
    ['node.setAttributeNS("urn:wrong", "xmlns:p", "x")', 'NamespaceError'],
    ['node.setAttributeNS("http://www.w3.org/2000/xmlns/", "p:key", "x")', 'NamespaceError'],
    ['node.setAttribute("missing-value")', 'TypeError'],
    ['node.getAttributeNS("urn:x")', 'TypeError'],
    ['node.classList.add("x", "")', 'SyntaxError'],
    ['node.classList.remove("x", "a b")', 'InvalidCharacterError'],
    ['node.classList.toggle("")', 'SyntaxError'],
    ['node.classList.replace("a b", "")', 'SyntaxError'],
    ['node.classList.replace("a", "b c")', 'InvalidCharacterError'],
    ['node.classList.contains()', 'TypeError'],
    ['node.classList.item(0n)', 'TypeError'],
    ['node.classList.supports("a")', 'TypeError'],
  ])('models the real %s exception before any invalid token batch mutates', (operation, errorName) => {
    const run = new DomHookRun('<div class=" a  a b "></div>');
    try {
      const result = run.invoke(`function hook(node){
        try { ${operation}; } catch(error) { return error.name === '${errorName}' && node.className === ' a  a b '; }
        return false;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['node.setAttribute("@click", "x")', 'dom-name-compatibility'],
    ['node.setAttribute("1x", "x")', 'dom-name-compatibility'],
    ['node.setAttributeNS("urn:x", "p:a:b", "x")', 'dom-name-compatibility'],
    ['node.setAttributeNS("urn:first", "class", "x"); node.classList.add("real")', 'duplicate-qualified-attribute-lowering'],
  ])('refuses unsupported compatibility/namespace lowering rather than manufacturing a DOM error: %s', (operation, kind) => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){${operation};return true;}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal?.kind).toBe(kind);
      run.complete(result.kind);
      expect(run.root.readAttributes()).toHaveLength(0);
    } finally { run.dispose(); }
  });

  test('rolls back write/remove/readd and class creation/normalization to original attribute identities', () => {
    const run = new DomHookRun('<div title="original"></div>');
    try {
      const original = run.root.readAttributes()[0]!;
      const inventory = run.execution.forest.readAttributes().length;
      const result = run.invoke(`function hook(node){
        node.setAttribute('title','before-remove'); node.removeAttribute('title');
        node.setAttribute('title','after-readd'); node.setAttribute('title','rewritten');
        node.classList.value=' a a  b ';node.classList.add();node.classList.remove('b');
        node.getBoundingClientRect();return false;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      run.complete(result.kind);
      expect(run.root.readAttributes()).toHaveLength(1);
      expect(run.root.readAttributes()[0]).toBe(original);
      expect(original.value).toBe('original');
      expect(original.scalarWriteRevision).toBe(0);
      expect(run.execution.forest.readAttributes()).toHaveLength(inventory);
      run.execution.mutationAuthority.assertGeneratedInventory();
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each([
    ['append existing first', 'return node.appendChild(a) === a;', ['b', 'c', 'a']],
    ['insert existing last', 'return node.insertBefore(c, a) === c;', ['c', 'a', 'b']],
    ['insert before itself', 'return node.insertBefore(b, b) === b;', ['a', 'b', 'c']],
    ['insert before undefined', 'return node.insertBefore(a, undefined) === a;', ['b', 'c', 'a']],
    ['replace from later sibling', 'return node.replaceChild(c, a) === a && a.parentNode === null;', ['c', 'b']],
    ['replace from earlier sibling', 'return node.replaceChild(a, c) === c && c.parentNode === null;', ['b', 'a']],
    ['replace itself', 'return node.replaceChild(b, b) === b;', ['a', 'b', 'c']],
    ['repeat remove/reinsert', 'node.removeChild(a);node.appendChild(a);a.remove();node.insertBefore(a,b);return a===node.firstChild;', ['a', 'b', 'c']],
  ] as const)('relocates existing nodes with native return values: %s', (_name, body, expected) => {
    const run = new DomHookRun('<div><i id="a"></i><i id="b"></i><i id="c"></i></div>');
    try {
      const originals = [...run.root.readChildren()];
      const result = run.invoke(`function hook(node){const a=node.children[0],b=node.children[1],c=node.children[2];${body}}`);
      expect(result.kind, run.host.refusal?.summary ?? result.evaluation?.auditOpenSeams.map(seam => seam.summary).join('\n'))
        .toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(expected.map(id => originals['abc'.indexOf(id)]));
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('drains an existing template fragment and can edit detached owned subtrees', () => {
    const run = new DomHookRun('<div><template><i></i><b></b></template><section><u></u></section></div>');
    try {
      const result = run.invoke(`function hook(node){
        const template=node.children[0],section=node.children[1]; const content=template.content;
        const i=content.firstChild; const b=content.lastChild; const u=section.firstChild;
        const returned=section.insertBefore(content,u);
        node.removeChild(section); section.removeChild(i); section.appendChild(i); node.appendChild(section);
        return returned===content && content.childNodes.length===0 && content.parentNode===null
          && section.firstChild===b && section.lastChild===i && section.childNodes[1]===u
          && i.ownerDocument===section.ownerDocument;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('allows a detached former child to receive its former parent without a historical ancestry cycle', () => {
    const run = new DomHookRun('<div><section><i></i></section></div>');
    try {
      const result = run.invoke(`function hook(node){
        const parent=node.firstChild,child=parent.firstChild;
        parent.removeChild(child);child.appendChild(parent);
        return node.childNodes.length===0 && child.parentNode===null && parent.parentNode===child;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each([
    ['node.firstChild.appendChild(node);', 'HierarchyRequestError'],
    ['node.firstChild.insertBefore(node, node.lastChild);', 'HierarchyRequestError'],
    ['node.insertBefore(node.firstChild, node.lastChild.firstChild);', 'NotFoundError'],
    ['node.lastChild.firstChild.appendChild(node.firstChild);', 'HierarchyRequestError'],
    ['node.appendChild({});', 'TypeError'],
    ['node.insertBefore(node.firstChild);', 'TypeError'],
    ['node.replaceChild(node.firstChild,null);', 'TypeError'],
  ] as const)('preserves native pre-insertion failure: %s', (body, name) => {
    const run = new DomHookRun('<div><i></i><b>text</b></div>');
    try {
      const original = [...run.root.readChildren()];
      const result = run.invoke(`function hook(node){try{${body}}catch(error){return error.name==='${name}';}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(original);
    } finally { run.dispose(); }
  });

  test('refuses ordinary template-element insertion without mistaking it for template content', () => {
    const run = new DomHookRun('<div><template></template><i></i></div>');
    try {
      const original = [...run.root.readChildren()];
      const result = run.invoke('function hook(node){node.firstChild.appendChild(node.lastChild);}');
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'template-element-children', member: 'appendChild' });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(original);
      expect((original[0] as TemplateCompilerElementOccurrence).templateContent!.readChildren()).toEqual([]);
    } finally { run.dispose(); }
  });

  test('rolls back relocation, detached edits and document adoption after an unsupported operation', () => {
    const run = new DomHookRun('<div><template><i id="before"></i></template><section></section><b></b></div>', true);
    try {
      const originals = [...run.root.readChildren()];
      const template = originals[0] as TemplateCompilerElementOccurrence;
      const i = template.templateContent!.readChildren()[0] as TemplateCompilerElementOccurrence;
      const result = run.invoke(`function hook(node){
        const template=node.children[0],section=node.children[1],b=node.children[2]; const i=template.content.firstChild;
        section.appendChild(i); i.id='pending'; node.replaceChild(section,b);
        node.removeChild(section); section.removeChild(i); section.appendChild(i); node.insertBefore(section,template);
        node.getBoundingClientRect();
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ member: 'getBoundingClientRect', kind: 'unsupported-dom-member' });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(originals);
      expect(template.templateContent!.readChildren()).toEqual([i]);
      expect((originals[1] as TemplateCompilerElementOccurrence).readChildren()).toEqual([]);
      expect(i.readAttributes()[0]!.value).toBe('before');
      expect(run.execution.forest.ownerDocumentFor(i)).toBe('template-contents');
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('rolls back earlier moves when collection destructuring reaches the existing evaluator boundary', () => {
    const run = new DomHookRun('<div><i></i><b></b></div>');
    try {
      const original = [...run.root.readChildren()];
      const result = run.invoke('function hook(node){node.appendChild(node.firstChild);const [first]=node.children;return first;}');
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(result.evaluation?.auditOpenSeams.some(seam => seam.summary.includes('Array binding pattern source'))).toBe(true);
      expect(run.host.refusal).toBeNull();
      expect(run.root.readChildren()).toEqual([original[1], original[0]]);
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(original);
    } finally { run.dispose(); }
  });

  test('observes live indices and sibling identity while removing descendants', () => {
    const run = new DomHookRun('<div><i id="a"><u></u></i><i id="b"></i><i id="c"></i></div>');
    try {
      const result = run.invoke(`
        function hook(node) {
          const children = node.children;
          const first = children[0];
          const nested = first.firstChild;
          nested.remove();
          const second = children[1];
          const result = node.removeChild(first);
          return result === first && first.parentNode === null && first.nextSibling === null
            && nested.parentNode === null && children.length === 2 && children[0] === second
            && children[0].id === 'b' && !node.contains(first);
        }
      `);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(2);
    } finally { run.dispose(); }
  });

  test('keeps retained detached subtree attributes and previously acquired live queries in the same pending overlay', () => {
    const run = new DomHookRun('<div><i id="before"><b class="x"></b></i></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const first = node.firstChild;
        const xs = first.getElementsByClassName('x');
        first.id = 'after';
        const removed = node.removeChild(first);
        const pendingId = removed.id;
        xs[0].className = 'y';
        return pendingId === 'after' && removed.getAttribute('id') === 'after'
          && xs.length === 0 && removed.firstChild.className === 'y';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(0);
    } finally { run.dispose(); }
  });

  test.each([
    ['for-of', `const seen = []; for (const child of node.children) { seen.push(child.id); child.remove(); } return seen.join(',') === 'a,c';`, 1],
    ['snapshot spread', `const seen = []; for (const child of [...node.children]) { seen.push(child.id); child.remove(); } return seen.join(',') === 'a,b,c';`, 0],
    ['Array.from mapper', `const seen = Array.from(node.children, child => { const id = child.id; child.remove(); return id; }); return seen.join(',') === 'a,c';`, 1],
    ['NodeList.forEach', `const seen = []; node.childNodes.forEach(child => { seen.push(child.id); child.remove(); }); return seen.join(',') === 'a,c';`, 1],
    ['argument spread', `function consume(a,b,c) { a.remove(); b.remove(); c.remove(); } consume(...node.children); return node.children.length === 0;`, 0],
  ] as const)('preserves %s mutation/iteration order', (_name, body, survivors) => {
    const run = new DomHookRun('<div><i id="a"></i><i id="b"></i><i id="c"></i></div>');
    try {
      const result = run.invoke(`function hook(node) { ${body} }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(survivors);
    } finally { run.dispose(); }
  });

  test.each([
    ['geometry', 'node.getBoundingClientRect();', 'getBoundingClientRect', 'unsupported-dom-member'],
    ['outside parent', 'node.parentNode;', 'parentNode', 'outside-compiler-root'],
    ['ambient document', 'platform.document.body;', 'body', 'unsupported-dom-member'],
    ['owner document import', 'node.ownerDocument.importNode(node,true);', 'importNode', 'unsupported-dom-member'],
    ['dataset', 'node.dataset.key = "x";', 'dataset', 'unsupported-dom-member'],
    ['markup write', 'node.innerHTML = "<b></b>";', 'innerHTML', 'unsupported-dom-member'],
    ['text write', 'node.textContent = "changed";', 'textContent', 'unsupported-dom-member'],
    ['metadata', 'metadata.name = "changed";', 'name', 'unsupported-dom-member'],
    ['selector', 'node.querySelector("i");', 'querySelector', 'unsupported-dom-member'],
  ])('refuses %s and rolls back earlier supported writes and removals', (_label, body, member, kind) => {
    const run = new DomHookRun('<div id="original"><i></i><b></b></div>');
    try {
      const first = run.root.readChildren()[0]!;
      const result = run.invoke(`function hook(node, platform, metadata) { node.id = 'pending'; node.firstChild.remove(); ${body} return false; }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ member, kind });
      run.complete(result.kind);
      expect(run.root.readChildren()[0]).toBe(first);
      expect(run.root.readChildren()).toHaveLength(2);
      expect(run.root.readAttributes()[0]!.value).toBe('original');
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('preserves genuine NotFoundError as abrupt completion and does not label it unsupported', () => {
    const run = new DomHookRun('<div><i><b></b></i></div>');
    try {
      const result = run.invoke('function hook(node) { node.removeChild(node.firstChild.firstChild); }');
      expect(result.kind).toBe(StaticCallableCompletionKind.Abrupt);
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(1);
    } finally { run.dispose(); }
  });

  test('permits user code to catch an actual DOM exception, and does not demand an unreachable API', () => {
    const run = new DomHookRun('<div><i><b></b></i></div>');
    try {
      const result = run.invoke(`function hook(node) {
        if (false) node.getBoundingClientRect();
        try { node.removeChild(node.firstChild.firstChild); } catch (error) { return error.name === 'NotFoundError'; }
        return false;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('does not invent browser exception message text or absent unmodeled exception properties', () => {
    const run = new DomHookRun('<div><i><b></b></i></div>');
    try {
      const result = run.invoke(`function hook(node) {
        try { node.removeChild(node.firstChild.firstChild); }
        catch (error) { return error.message === 'some browser text' && error.code === 8; }
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });
});

class DomHookRun {
  readonly browser = new BrowserEffectiveTemplateFixture('compiler-dom-host');
  readonly root: TemplateCompilerElementOccurrence;
  readonly execution: TemplateCompilerExecutionSession;
  readonly attempt: ReturnType<TemplateCompilerExecutionSession['beginOperation']>;
  readonly host: TemplateCompilerDomHost;

  constructor(markup: string, platformRoot = false) {
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(this.browser.materialize('root', markup).emission);
    this.root = forest.compilerContent.readChildren()[0] as TemplateCompilerElementOccurrence;
    this.execution = TemplateCompilerExecutionSession.createForForest('dom-host:family', forest);
    const lane = this.execution.admitRootInvocation('dom-host:lane');
    const context = this.execution.bootstrapContext(lane);
    const bootstrapDriver = this.execution.beginHookBootstrapDriver(lane);
    const hooks = new TemplateCompilerHookSet(
      this.browser.run.handles.product('hooks'), this.browser.run.handles.identity('hooks'),
      TemplateCompilerHookMembershipState.ExactList, [], [], null,
    );
    const operation = this.execution.completeOperation(this.execution.beginOperation({
      operationKey: 'dom-host:hooks', context,
      operationKind: TemplateCompilerOperationKind.CompilerHook,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target: this.execution.compilerHookTarget(context, hooks, TemplateCompilerHookOperationStage.HookSetResolution, null),
      causeHandles: [hooks.productHandle], bootstrapDriver,
    }), new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete));
    this.execution.finishBootstrapDriver(bootstrapDriver);
    const closure = this.execution.closeInvocationBootstrap(
      new TemplateCompilerHookBootstrapResult(lane, TemplateCompilerHookBootstrapState.Exact, [operation], null, null),
      new TemplateCompilerLocalExtractionResult(lane, TemplateCompilerLocalExtractionState.NoLocalTemplates, forest.mutationRevision, [], [], null, null),
    );
    const driver = this.execution.beginSiteExecutionDriver(this.execution.captureSiteExecutionFrontier(closure));
    if (platformRoot) this.execution.adoptSiteNodeDocuments(driver, [this.root],
      [this.browser.run.handles.product('definition')], this.browser.run.handles.address('source'));
    const callable = new TemplateCompilerCallableReference(null, null, this.browser.run.handles.address('source'));
    this.attempt = this.execution.beginOperation({
      operationKey: 'dom-host:process', context: driver.context,
      operationKind: TemplateCompilerOperationKind.ProcessContent,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
      target: this.execution.callableEffectTarget(driver.context, callable, this.root),
      causeHandles: [this.browser.run.handles.product('definition')], siteExecutionDriver: driver,
    });
    this.host = new TemplateCompilerDomHost(this.execution, this.attempt, this.root);
  }

  invoke(source: string) {
    const syntax = ts.createSourceFile('dom-hook.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const policy = new StaticEvaluationPolicy();
    const evaluated = new StaticEvaluator(policy).evaluateSourceFile(syntax, syntax.fileName);
    const fn = evaluated.environment.readValue('hook');
    if (fn?.kind !== EvaluationValueKind.Function) throw new Error('Expected an authored hook function.');
    return evaluateStaticCallableCompletion(
      new StaticCallableTarget(fn, policy, {}), this.host.argumentValues,
      (base) => this.host.decorateRuntimeHost(base), { requireStableCapturedInputs: true },
    );
  }

  complete(kind: StaticCallableCompletionKind) {
    this.execution.completeOperation(this.attempt, kind === StaticCallableCompletionKind.Normal
      ? new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete)
      : kind === StaticCallableCompletionKind.Abrupt
        ? new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Abrupt, [], 'Hook threw.')
        : new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Unsupported, [], 'Unsupported hook operation.'));
  }

  dispose(): void { this.browser.dispose(); }
}
