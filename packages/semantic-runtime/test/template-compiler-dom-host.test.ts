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
            node.ownerDocument === platform.document, first === children.item(0),
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
    ['generated attribute', 'node.setAttribute("new-attribute", "x");', 'setAttribute', 'generated-attribute-lowering'],
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

  constructor(markup: string) {
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
