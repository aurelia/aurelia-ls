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
import { parseBrowserTemplateContextualFragmentDraft, serializeBrowserTemplateInnerHtml } from '../src/template/browser-template-parser.js';
import { queryTemplateCompilerDescendantElements } from '../src/template/template-compiler-dom-selectors.js';
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
  test('returns fresh static selector lists while reading pending attributes and current topology', () => {
    const run = new DomHookRun('<div><section><i id="a"></i><i id="b"></i></section><template><i id="inert"></i></template></div>');
    try {
      const result = run.invoke(`function hook(node){
        node.className='pending';const section=node.firstChild;
        const snapshot=section.querySelectorAll('div.pending > section > i');
        const other=section.querySelectorAll(':scope > i');const live=section.children;
        let count=0;snapshot.forEach(child=>{child.className='detached';child.remove();count++;});
        section.append(snapshot[1],snapshot[0]);
        const carrier=node.children[1];
        return snapshot!==other&&count===2&&snapshot.length===2&&snapshot[0].id==='a'&&other[0]===snapshot[0]
          &&live[0].id==='b'&&section.querySelector('.detached')===snapshot[1]&&snapshot.item(2)===null
          &&node.querySelector('#inert')===null&&node.querySelector(':scope')===null
          &&carrier.content.querySelector('i').id==='inert'&&carrier.content.querySelectorAll(':scope > i').length===0;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each(['i:hover', 'i, :checked', '[title="x" s]'])(
    'keeps unsupported selector semantics explicit and rolls back: %s', selector => {
      const run = new DomHookRun('<div><i></i></div>');
      try {
        const result = run.invoke(`function hook(node){node.id='pending';try{node.querySelectorAll(${JSON.stringify(selector)});}catch(error){return true;}}`);
        expect(result.kind).toBe(StaticCallableCompletionKind.Open);
        expect(run.host.refusal).toMatchObject({ kind: 'dom-selector-profile' });
        run.complete(result.kind);
        expect(run.root.readAttributes()).toEqual([]);
      } finally { run.dispose(); }
    },
  );

  test.each([
    ['node.querySelector()', 'TypeError'], ['node.querySelector("")', 'SyntaxError'],
    ['node.querySelectorAll("   ")', 'SyntaxError'],
  ])('keeps established native query failures catchable: %s', (body, errorName) => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){try{${body};}catch(error){node.id='caught';return error.name==='${errorName}';}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readAttributes()[0]?.value).toBe('caught');
    } finally { run.dispose(); }
  });

  test.each([
    ['duplicates', 'node.append(a,b,a);', 'group,b,a'],
    ['ancestor then descendant', 'node.append(group,a);', 'group,a'],
    ['descendant then ancestor', 'node.append(a,group);', 'a,group'],
  ])('appends node arguments in native final order: %s', (_label, body, expected) => {
    const run = new DomHookRun('<div><section id="group"><i id="a"></i><i id="b"></i></section></div>');
    try {
      const result = run.invoke(`function hook(node){const group=node.firstChild,a=group.firstChild,b=group.lastChild;
        ${body}
        return Array.from(node.children).map(child=>child.id).join(',')===${JSON.stringify(expected)};
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each([
    ['node.append(a,fragment)', 'a,b'],
    ['node.append(fragment,a)', 'b,a'],
    ['node.append(fragment,fragment)', 'a,b'],
  ])('drains fragments at their argument position: %s', (body, expected) => {
    const run = new DomHookRun('<div><template><i id="a"></i><i id="b"></i></template></div>', true);
    try {
      const result = run.invoke(`function hook(node,platform){const carrier=node.firstChild,fragment=carrier.content,a=fragment.firstChild;
        const originalDocument=fragment.ownerDocument;${body};
        return Array.from(node.children).map(child=>child.id).join(',')===${JSON.stringify(',' + expected)}
          &&fragment.childNodes.length===0&&fragment.ownerDocument===originalDocument&&a.ownerDocument===platform.document;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('converts primitive append arguments to distinct Text nodes and returns undefined', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){
        const empty=node.append(),returned=node.append('',null,undefined,false,42,0x10n);
        return empty===undefined&&returned===undefined&&node.childNodes.length===6&&node.firstChild.data===''
          &&node.textContent==='nullundefinedfalse4216'&&node.childNodes[1]!==node.childNodes[2];
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['node.append(node.firstChild,node.ownerDocument,node.lastChild)', 'dom-append-hierarchy'],
    ['node.firstChild.append(node,node.lastChild)', 'dom-append-hierarchy'],
    ['const f=node.ownerDocument.createDocumentFragment();f.append(f)', 'dom-append-hierarchy'],
    ['node.append(node.firstChild,{toString(){return "x";}})', 'runtime-dependent-input'],
    ['const t=node.ownerDocument.createElement("template");t.append("ordinary")', 'template-element-children'],
  ])('refuses unclosed append behavior without a fabricated catchable error: %s', (body, kind) => {
    const run = new DomHookRun('<div><i></i><b></b></div>');
    try {
      const before=[...run.execution.forest.readNodes()];
      const result=run.invoke(`function hook(node){node.id='pending';try{${body};}catch(error){return true;}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind });
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toEqual(before);
      expect(run.root.readAttributes()).toEqual([]);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('retains genuine single-node append hierarchy failures', () => {
    const run = new DomHookRun('<div><i></i></div>');
    try {
      const result = run.invoke(`function hook(node){try{node.firstChild.append(node);}catch(error){return error.name==='HierarchyRequestError'&&node.childNodes.length===1;}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['<img src="image.png">', 'native-resource-effects'],
    ['<input type="radio" checked>', 'native-control-state'],
  ])('retains native append effect boundaries and rolls back preceding arguments: %s', (markup, kind) => {
    const run = new DomHookRun(`<div><i></i>${markup}</div>`, true);
    try {
      const nodes=[...run.execution.forest.readNodes()],children=[...run.root.readChildren()];
      const result=run.invoke(`function hook(node){const first=node.firstChild,last=node.lastChild;node.append(first,'tentative',last);}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind, member: 'append' });
      run.complete(result.kind);
      expect(run.root.readChildren()).toEqual(children);
      expect(run.execution.forest.readNodes()).toEqual(nodes);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('parses table, raw-text and SVG markup in the receiving context', () => {
    const run = new DomHookRun('<div><table></table><textarea></textarea><svg><foreignObject></foreignObject></svg></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const table=node.children[0],textarea=node.children[1],svg=node.children[2];
        table.innerHTML='<tr><td title="&amp;">cell</td></tr>';
        textarea.innerHTML='<b>&amp;</b>';
        svg.firstChild.innerHTML='<p>foreign HTML</p>';
        return table.firstChild.localName==='tbody'&&table.firstChild.firstChild.firstChild.textContent==='cell'
          &&table.innerHTML==='<tbody><tr><td title="&amp;">cell</td></tr></tbody>'
          &&textarea.childNodes.length===1&&textarea.firstChild.data==='<b>&</b>'
          &&textarea.innerHTML==='&lt;b&gt;&amp;&lt;/b&gt;'
          &&svg.firstChild.firstChild.namespaceURI==='http://www.w3.org/1999/xhtml';
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('honors form ancestors for element and template parsing and detaches original children', () => {
    const run = new DomHookRun('<form><section><i>old</i></section><template><b>old</b></template></form>');
    try {
      const result = run.invoke(`function hook(node) {
        const section=node.firstChild,carrier=node.children[1],old=section.firstChild,content=carrier.content;
        section.innerHTML='<form><b>kept</b></form>';
        carrier.innerHTML='<form><i>template</i></form>';
        return section.innerHTML==='<b>kept</b>'&&old.parentNode===null&&old.textContent==='old'
          &&carrier.content===content&&carrier.innerHTML==='<i>template</i>'&&carrier.childNodes.length===0;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('serializes current pending values, creation-time is, namespaces and void nodes', () => {
    const run = new DomHookRun('<div><button id="first" is="native-button"></button><button is="native-other" id="second"></button><svg><use xlink:href="#old"></use></svg><input></div>');
    try {
      const result = run.invoke(`function hook(node) {
        node.children[0].removeAttribute('is');node.children[1].setAttribute('is','changed');
        const span=node.ownerDocument.createElement('span');span.textContent='<&>';
        span.setAttribute('title','<&>"');node.children[0].appendChild(span);
        node.children[2].firstChild.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href','#new');
        node.children[3].appendChild(node.ownerDocument.createTextNode('not serialized'));
        return node.innerHTML==='<button is="native-button" id="first"><span title="&lt;&amp;&gt;&quot;">&lt;&amp;&gt;</span></button><button is="changed" id="second"></button><svg><use xlink:href="#new"></use></svg><input>'
          &&node.children[3].innerHTML===''&&node.children[3].childNodes.length===1;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('distinguishes call-wide parse scripting from each serialized noscript document', () => {
    const run = new DomHookRun('<div><section></section><template></template></div>', true);
    try {
      const result = run.invoke(`function hook(node) {
        node.firstChild.innerHTML='<noscript><b>raw</b></noscript><template><noscript><b>nested raw</b></noscript></template>';
        node.children[1].innerHTML='<noscript><b>inert</b></noscript>';
        return node.firstChild.firstChild.childNodes[0].nodeType===3
          &&node.firstChild.innerHTML==='<noscript><b>raw</b></noscript><template><noscript>&lt;b&gt;nested raw&lt;/b&gt;</noscript></template>'
          &&node.children[1].content.firstChild.firstChild.nodeType===1
          &&node.children[1].innerHTML==='<noscript><b>inert</b></noscript>';
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('retains parsed script state and inert custom construction through cloning', () => {
    const run = new DomHookRun('<div><template></template><section></section></div>', true);
    try {
      const result = run.invoke(`function hook(node) {
        const carrier=node.firstChild;
        carrier.innerHTML='<native-widget><button is="native-button"></button><script>never()</script></native-widget>';
        const copy=carrier.content.firstChild.cloneNode(true);
        node.children[1].innerHTML='<script>alsoNever()</script>';
        return copy!==carrier.content.firstChild&&copy.ownerDocument===carrier.content.ownerDocument
          &&copy.innerHTML==='<button is="native-button"></button><script>never()</script>';
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      const scripts = run.execution.forest.readNodes().filter(node => node instanceof TemplateCompilerElementOccurrence && node.tagName === 'script');
      expect(scripts).toHaveLength(3);
      expect(scripts.every(node => (node as TemplateCompilerElementOccurrence).parserInertScript)).toBe(true);
    } finally { run.dispose(); }
  });

  test('parses an adopted template inertly but retains its platform content affiliation', () => {
    const run = new DomHookRun('<div><template></template></div>', true, true, true);
    try {
      const result = run.invoke(`function hook(node,platform) {
        const carrier=node.firstChild;
        carrier.innerHTML='<native-widget></native-widget><noscript><b>inert parse</b></noscript>';
        return carrier.content.ownerDocument===platform.document&&carrier.content.firstChild.ownerDocument===platform.document
          &&carrier.content.children[1].firstChild.nodeType===1;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('refuses resource effects even when template parsing suppressed native constructors', () => {
    const run = new DomHookRun('<div><template></template></div>', true, true, true);
    try {
      const result = run.invoke(`function hook(node){node.firstChild.innerHTML='<img src="fetch.png">';}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'native-resource-effects' });
      run.complete(result.kind);
      expect((run.root.readChildren()[0] as TemplateCompilerElementOccurrence).templateContent!.readChildren()).toEqual([]);
    } finally { run.dispose(); }
  });

  test.each([['null', ''], ['undefined', 'undefined'], ['42', '42']] as const)(
    'converts innerHTML = %s without treating undefined as null', (expression, expected) => {
      const run = new DomHookRun('<div><b>old</b></div>');
      try {
        const result = run.invoke(`function hook(node){node.innerHTML=${expression};return node.innerHTML===${JSON.stringify(expected)};}`);
        expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
        expect(result.evaluation?.value).toMatchObject({ value: true });
        run.complete(result.kind);
      } finally { run.dispose(); }
    },
  );

  test.each([
    ['native constructor', 'node.innerHTML="<native-widget></native-widget>";', 'native-custom-element-construction'],
    ['native customized constructor', 'node.innerHTML="<button is=custom-button></button>";', 'native-custom-element-construction'],
    ['native image', 'node.innerHTML="<img src=fetch.png>";', 'native-resource-effects'],
    ['radio state', 'node.innerHTML="<input type=radio checked>";', 'native-control-state'],
    ['range state', 'node.innerHTML="<input type=range min=80 max=100>";', 'native-control-state'],
    ['select profile', 'node.innerHTML="<select><button>discarded</button></select>";', 'dom-markup-customizable-select-profile'],
    ['unknown coercion', 'node.innerHTML={toString(){return "<b>unknown</b>";}};', 'runtime-dependent-input'],
    ['later unsupported call', 'node.getBoundingClientRect();', 'unsupported-dom-member'],
  ] as const)('refuses %s and rolls back parsed replacements and generated inventory', (_label, body, kind) => {
    const run = new DomHookRun('<div><i>original</i></div>', true);
    try {
      const before = [...run.execution.forest.readNodes()];
      const result = run.invoke(`function hook(node){node.innerHTML='<b>tentative</b>';try{${body}}catch(error){return true;}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind });
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toEqual(before);
      expect(run.root.readChildren()[0]).toHaveProperty('tagName', 'i');
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('keeps markup unavailable outside the opt-in parser-backed compiler path', () => {
    const run = new DomHookRun('<div></div>', false, false);
    try {
      const result = run.invoke('function hook(node){node.innerHTML="<b></b>";}');
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'dom-markup-unavailable' });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });
  test('stages text and comment writes through every read alias and copies the current value', () => {
    const run = new DomHookRun('<div>original<!--note--><b>nested</b></div>');
    try {
      const text = run.root.readChildren()[0]!;
      const comment = run.root.readChildren()[1]!;
      const result = run.invoke(`function hook(node) {
        const text=node.firstChild,comment=node.childNodes[1],children=node.childNodes;
        text.data='changed';comment.nodeValue='edited-note';
        const snapshot=text.cloneNode();
        text.textContent='final';node.appendChild(snapshot);
        return text===children[0]&&comment===children[1]&&text.data==='final'&&text.nodeValue==='final'
          &&text.textContent==='final'&&text.length===5&&comment.data==='edited-note'&&comment.length===11
          &&node.textContent==='finalnestedchanged'&&snapshot.data==='changed';
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren().slice(0, 2)).toEqual([text, comment]);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test.each([
    ['data', 'null', ''], ['data', 'undefined', 'undefined'], ['data', 'false', 'false'],
    ['nodeValue', 'null', ''], ['nodeValue', 'undefined', ''], ['nodeValue', '0x10n', '16'],
    ['textContent', 'null', ''], ['textContent', 'undefined', ''], ['textContent', '42', '42'],
  ] as const)('converts CharacterData %s = %s with native nullability', (member, expression, expected) => {
    const run = new DomHookRun('<div>original<!--original--></div>');
    try {
      const result = run.invoke(`function hook(node) {
        node.firstChild.${member}=${expression};node.lastChild.${member}=${expression};
        return node.firstChild.data===${JSON.stringify(expected)}&&node.lastChild.data===${JSON.stringify(expected)};
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test('replaces element and fragment text with fresh nodes while retaining detached references', () => {
    const run = new DomHookRun('<div><section><b>old</b><!--note--></section><template><i>inert</i></template></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const section=node.firstChild,children=section.childNodes,old=section.firstChild;
        section.textContent='replacement';
        const text=section.firstChild;
        const detached=old.parentNode===null&&children.length===1&&text.nodeType===3;
        old.firstChild.data='retained';node.appendChild(old);
        section.textContent='';
        const cleared=children.length===0&&text.parentNode===null;
        const carrier=node.children[1],inert=carrier.content.ownerDocument;
        carrier.textContent='';carrier.content.textContent='fragment';
        return detached&&cleared&&old.textContent==='retained'&&node.lastChild===old
          &&carrier.textContent===''&&carrier.content.childNodes.length===1
          &&carrier.content.firstChild.data==='fragment'&&carrier.content.firstChild.ownerDocument===inert;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('keeps non-character nodeValue and document textContent setters as converted no-ops', () => {
    const run = new DomHookRun('<div><template><b>retained</b></template></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const carrier=node.firstChild,content=carrier.content;
        node.nodeValue='ignored';content.nodeValue=42;
        node.ownerDocument.nodeValue='ignored';node.ownerDocument.textContent=undefined;
        return node.nodeValue===null&&content.nodeValue===null&&content.textContent==='retained'
          &&node.ownerDocument.nodeValue===null&&node.ownerDocument.textContent===null;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each(['node.firstChild', 'node.children[1].content'])(
    'keeps browser-dependent same-value child identity explicit: %s', (target) => {
      const run = new DomHookRun('<div><p>same</p><template>same</template></div>');
      try {
        const result = run.invoke(`function hook(node){${target}.textContent='same';}`);
        expect(result.kind).toBe(StaticCallableCompletionKind.Open);
        expect(run.host.refusal).toMatchObject({ kind: 'browser-dependent-node-identity' });
        run.complete(result.kind);
      } finally { run.dispose(); }
    },
  );

  test('empty replace-all removes even an already empty Text', () => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){
        const empty=node.ownerDocument.createTextNode('');node.appendChild(empty);
        node.textContent='';return empty.parentNode===null&&node.childNodes.length===0;
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['unknown coercion', 'node.firstChild.data={toString(){return "value";}};', 'runtime-dependent-input'],
    ['no-op still coerces', 'node.nodeValue={toString(){return "value";}};', 'runtime-dependent-input'],
    ['ordinary template children', 'node.children[0].textContent="ordinary";', 'template-element-children'],
    ['radio children removed', 'node.children[1].textContent="";', 'native-control-state'],
    ['later unsupported call', 'node.getBoundingClientRect();', 'unsupported-dom-member'],
  ] as const)('rolls back text edits and replace-all on %s', (_label, body, kind) => {
    const run = new DomHookRun('<div>original<template><b>inert</b></template><section><input type="radio" checked></section><p>old</p></div>');
    try {
      const before = [...run.execution.forest.readNodes()];
      const result = run.invoke(`function hook(node) {
        node.firstChild.data='tentative';node.children[2].textContent='replaced';
        try{${body}}catch(error){return true;}
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind });
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toEqual(before);
      expect(run.root.readChildren()[0]).toHaveProperty('text', 'original');
      expect(run.root.readChildren()[3]!.readChildren()[0]).toHaveProperty('text', 'old');
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('refuses active script CharacterData writes but preserves parsed-script inertness', () => {
    const run = new DomHookRun('<div><script>parsed</script></div>', true);
    try {
      const result = run.invoke(`function hook(node,platform) {
        node.firstChild.firstChild.data='still inert';
        const script=platform.document.createElement('script');
        script.textContent='active';
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'native-resource-effects' });
      run.complete(result.kind);
      expect(run.root.readChildren()[0]!.readChildren()[0]).toHaveProperty('text', 'parsed');
    } finally { run.dispose(); }
  });

  test('copies current attributes and children with fresh identities and independent later edits', () => {
    const run = new DomHookRun('<div><section title="before"><b>text</b><!--note--></section></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const original=node.firstChild;
        original.setAttribute('title','snapshot');original.setAttributeNS('urn:test','p:key','namespaced');
        const shallow=original.cloneNode(),deep=original.cloneNode(true);
        original.setAttribute('title','after');deep.firstChild.id='copy-child';
        const second=deep.cloneNode(true);
        node.appendChild(shallow);node.appendChild(deep);node.appendChild(second);
        return shallow!==original&&shallow.childNodes.length===0&&shallow.getAttribute('title')==='snapshot'
          &&deep!==second&&deep.firstChild!==original.firstChild&&deep.firstChild!==second.firstChild
          &&original.firstChild.id===''&&second.firstChild.id==='copy-child'
          &&deep.getAttributeNames().join(',')==='title,p:key'&&deep.getAttributeNS('urn:test','key')==='namespaced'
          &&deep.childNodes[1].nodeType===8&&deep.childNodes[1].data==='note'
          &&deep.textContent==='text'&&deep.ownerDocument===original.ownerDocument;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      expect(run.root.readChildren()).toHaveLength(4);
      expect(run.root.readChildren().slice(1).every(node => node.inputReference == null)).toBe(true);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('clones template contents and imports fragments into the destination document', () => {
    const run = new DomHookRun('<div><template><b>template text</b></template></div>', true);
    try {
      const result = run.invoke(`function hook(node,platform) {
        const original=node.firstChild,deep=original.cloneNode(true),shallow=original.cloneNode(false);
        const inert=original.content.ownerDocument;
        const imported=platform.document.importNode(original.content,true);
        const returned=inert.importNode(imported,true);
        const rootCopy=node.cloneNode(false);
        deep.content.firstChild.id='edited';
        node.appendChild(deep);node.appendChild(shallow);node.appendChild(imported);
        return deep.content!==original.content&&deep.content.ownerDocument===inert
          &&deep.ownerDocument===platform.document&&deep.content.firstChild.id==='edited'
          &&original.content.firstChild.id===''&&shallow.content.childNodes.length===0
          &&imported.ownerDocument===platform.document&&imported.childNodes.length===0
          &&returned.ownerDocument===inert&&returned.firstChild.ownerDocument===inert
          &&returned.firstChild.textContent==='template text'&&rootCopy.parentNode===null;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test('imports into inert documents without activating source custom elements or resources', () => {
    const run = new DomHookRun('<div><native-widget><img src="image.png"></native-widget><button is="native-button"></button><script>never()</script><template><native-nested></native-nested></template></div>', true);
    try {
      const result = run.invoke(`function hook(node,platform) {
        const inert=node.children[3].content.ownerDocument;
        const custom=inert.importNode(node.firstChild,true);
        const button=inert.importNode(node.children[1],true);
        const script=platform.document.importNode(node.children[2],true);
        const template=platform.document.importNode(node.children[3],true);
        button.removeAttribute('is');
        const buttonCopy=button.cloneNode();
        node.appendChild(script);
        return custom.ownerDocument===inert&&custom.firstChild.ownerDocument===inert
          &&buttonCopy.ownerDocument===inert&&buttonCopy.getAttribute('is')===null
          &&template.ownerDocument===platform.document&&template.content.firstChild.ownerDocument===inert;
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
      const scripts = run.root.readChildren().filter(node => node instanceof TemplateCompilerElementOccurrence && node.tagName === 'script');
      expect(scripts).toHaveLength(2);
      expect(scripts.every(node => (node as TemplateCompilerElementOccurrence).parserInertScript)).toBe(true);
      const copiedButtons = run.execution.forest.readNodes().filter(node => node instanceof TemplateCompilerElementOccurrence
        && node.inputReference == null && node.tagName === 'button') as TemplateCompilerElementOccurrence[];
      expect(copiedButtons).toHaveLength(2);
      expect(copiedButtons.map(node => node.customElementIs)).toEqual(['native-button', 'native-button']);
    } finally { run.dispose(); }
  });

  test.each([
    ['platform custom clone', '<native-widget></native-widget>', 'node.firstChild.cloneNode();', 'native-custom-element-construction'],
    ['platform custom import', '<native-widget></native-widget>', 'platform.document.importNode(node.firstChild,true);', 'native-custom-element-construction'],
    ['platform customized import', '<button is="native-button"></button>', 'platform.document.importNode(node.firstChild);', 'native-custom-element-construction'],
    ['platform resource clone', '<img src="image.png">', 'node.firstChild.cloneNode();', 'native-resource-effects'],
    ['platform nested resource import', '<section><img src="image.png"></section>', 'platform.document.importNode(node.firstChild,true);', 'native-resource-effects'],
    ['dictionary import', '<b></b>', 'node.ownerDocument.importNode(node.firstChild,{deep:true});', 'dom-import-options'],
    ['array import options', '<b></b>', 'node.ownerDocument.importNode(node.firstChild,[]);', 'dom-import-options'],
  ] as const)('refuses %s and discards earlier copies atomically', (_label, markup, body, kind) => {
    const run = new DomHookRun(`<div>${markup}</div>`, true);
    try {
      const before = [...run.execution.forest.readNodes()];
      const result = run.invoke(`function hook(node,platform) {
        const copy=node.cloneNode();copy.id='pending';node.appendChild(copy);
        try{${body}}catch(error){return true;}
      }`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind });
      run.complete(result.kind);
      expect(run.execution.forest.readNodes()).toEqual(before);
      expect(run.root.readChildren()).toHaveLength(1);
      run.execution.forest.assertCoherentTopology();
      run.execution.mutationAuthority.assertGeneratedInventory();
    } finally { run.dispose(); }
  });

  test.each([
    ['node.ownerDocument.importNode()', 'TypeError'],
    ['node.ownerDocument.importNode(null)', 'TypeError'],
    ['node.ownerDocument.importNode({})', 'TypeError'],
    ['node.ownerDocument.importNode(node.ownerDocument)', 'NotSupportedError'],
  ] as const)('keeps native copy argument errors catchable: %s', (body, name) => {
    const run = new DomHookRun('<div></div>');
    try {
      const result = run.invoke(`function hook(node){try{${body};}catch(error){return error.name==='${name}';}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      expect(run.host.refusal).toBeNull();
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

  test.each([
    ['radio copy', '<input type="radio" checked>', 'input.cloneNode();'],
    ['radio import', '<input type="radio" checked>', 'node.ownerDocument.importNode(input,true);'],
    ['radio relocation', '<input type="radio" checked>', 'node.appendChild(input);'],
    ['radio removal', '<input type="radio" checked>', 'input.remove();'],
    ['radio checkedness', '<input type="radio" checked>', 'input.removeAttribute("checked");'],
    ['radio regrouping', '<input type="radio" name="a">', 'input.setAttribute("name","b");'],
    ['number value history', '<input type="number" value="invalid">', 'input.setAttribute("type","text");'],
    ['range value history', '<input type="range">', 'input.removeAttribute("type");'],
    ['color value history', '<input type="color">', 'input.removeAttributeNS(null,"type");'],
    ['type toggle', '<input type="number">', 'input.toggleAttribute("type",false);'],
    ['namespaced type setter', '<input type="number">', 'input.setAttributeNS(null,"type","text");'],
    ['range minimum history', '<input type="range">', 'input.setAttribute("min","80");'],
    ['range maximum history', '<input type="range" max="20">', 'input.removeAttribute("max");'],
    ['range step history', '<input type="range">', 'input.setAttributeNS(null,"step","30");'],
    ['range copy', '<input type="range" min="80" max="100">', 'input.cloneNode();'],
  ] as const)('refuses unmodeled native control state: %s', (_label, markup, body) => {
    const run = new DomHookRun(`<div>${markup}</div>`);
    try {
      const input = run.root.readChildren()[0] as TemplateCompilerElementOccurrence;
      const attributes = [...input.readAttributes()];
      const result = run.invoke(`function hook(node){const input=node.firstChild;node.id='pending';try{${body}}catch(error){return true;}}`);
      expect(result.kind).toBe(StaticCallableCompletionKind.Open);
      expect(run.host.refusal).toMatchObject({ kind: 'native-control-state' });
      run.complete(result.kind);
      expect(run.root.readAttributes()).toHaveLength(0);
      expect(input.readAttributes()).toEqual(attributes);
      run.execution.forest.assertCoherentTopology();
    } finally { run.dispose(); }
  });

  test('retains attribute-determined ordinary input behavior and inert template-carrier moves', () => {
    const run = new DomHookRun('<div><input type="number" value="2"><template><input type="radio" checked></template></div>');
    try {
      const result = run.invoke(`function hook(node) {
        const input=node.firstChild;
        input.setAttribute('type','NUMBER');input.setAttribute('value','3');input.classList.add('ordinary');
        const copy=input.cloneNode();node.appendChild(copy);node.appendChild(node.children[1]);
        return copy.getAttribute('value')==='3'&&copy.className==='ordinary';
      }`);
      expect(result.kind, run.host.refusal?.summary).toBe(StaticCallableCompletionKind.Normal);
      expect(result.evaluation?.value).toMatchObject({ value: true });
      run.complete(result.kind);
    } finally { run.dispose(); }
  });

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
    ['explicit document adoption', 'node.ownerDocument.adoptNode(node);', 'adoptNode', 'unsupported-dom-member'],
    ['dataset', 'node.dataset.key = "x";', 'dataset', 'unsupported-dom-member'],
    ['outer markup write', 'node.outerHTML = "<b></b>";', 'outerHTML', 'unsupported-dom-member'],
    ['metadata', 'metadata.name = "changed";', 'name', 'unsupported-dom-member'],
    ['selector state', 'node.querySelector("i:hover");', 'querySelector', 'dom-selector-profile'],
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

  constructor(markup: string, platformRoot = false, withDomServices = true, adoptFirstTemplateContent = false) {
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(this.browser.materialize('root', markup).emission);
    this.root = forest.compilerContent.readChildren()[0] as TemplateCompilerElementOccurrence;
    this.execution = TemplateCompilerExecutionSession.createForForest('dom-host:family', forest, withDomServices ? {
      parse: parseBrowserTemplateContextualFragmentDraft, serialize: serializeBrowserTemplateInnerHtml,
      query: queryTemplateCompilerDescendantElements,
    } : null);
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
    if (adoptFirstTemplateContent) this.execution.adoptSiteNodeDocuments(driver,
      [(this.root.readChildren()[0] as TemplateCompilerElementOccurrence).templateContent!],
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
