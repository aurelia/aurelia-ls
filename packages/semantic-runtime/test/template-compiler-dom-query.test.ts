import { describe, expect, test } from 'vitest';

import {
  snapshotTemplateCompilerDescendantElements,
  templateCompilerDirectElementCount,
  templateCompilerElementAttribute,
} from '../src/template/template-compiler-dom-query.js';
import { queryTemplateCompilerDescendantElements } from '../src/template/template-compiler-dom-selectors.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerOccurrenceGeneration,
} from '../src/template/template-compiler-occurrence.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler DOM query', () => {
  test('snapshots ordinary descendants in querySelectorAll preorder', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-query-preorder');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'preorder',
        '<main id="root"><section data-x="1"><span></span></section><aside></aside></main>',
      ).emission);
      const elements = snapshotTemplateCompilerDescendantElements(forest.compilerContent);

      expect(tags(elements)).toEqual(['main', 'section', 'span', 'aside']);
      expect(templateCompilerDirectElementCount(forest.compilerContent)).toBe(1);
      expect(templateCompilerDirectElementCount(elements[0]!)).toBe(2);
      expect(templateCompilerElementAttribute(elements[0]!, 'id')?.value).toBe('root');
      expect(templateCompilerElementAttribute(elements[1]!, 'data-x')?.value).toBe('1');
      expect(templateCompilerElementAttribute(elements[1]!, 'DATA-X')).toBeNull();
    } finally {
      fixture.dispose();
    }
  });

  test('does not cross template-content edges and admits an explicit nested-content query', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-query-template-content');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'template-content',
        '<div><template id="outer"><span></span><template id="inner"><b></b></template></template><p></p></div>',
      ).emission);
      const rootElements = snapshotTemplateCompilerDescendantElements(forest.compilerContent);
      const outer = rootElements.find((element) => templateCompilerElementAttribute(element, 'id')?.value === 'outer');
      if (outer?.templateContent == null) throw new Error('Expected an outer template-content occurrence.');
      const nestedElements = snapshotTemplateCompilerDescendantElements(outer.templateContent);

      expect(tags(rootElements)).toEqual(['div', 'template', 'p']);
      expect(tags(nestedElements)).toEqual(['span', 'template']);
      expect(nestedElements.some((element) => element.tagName === 'b')).toBe(false);
      expect(templateCompilerDirectElementCount(outer)).toBe(0);
      expect(templateCompilerDirectElementCount(outer.templateContent)).toBe(2);
    } finally {
      fixture.dispose();
    }
  });

  test('queries a detached local carrier through its retained template-content fragment', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-query-detached-local');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'detached-local',
        '<template as-custom-element="local-card"><div><span></span></div></template><p></p>',
      ).emission);
      const before = snapshotTemplateCompilerDescendantElements(forest.compilerContent);
      const local = before.find((element) =>
        templateCompilerElementAttribute(element, 'as-custom-element')?.value === 'local-card'
      );
      if (local?.templateContent == null) throw new Error('Expected a local template carrier.');

      forest.detachNode(local);

      expect(local.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(tags(snapshotTemplateCompilerDescendantElements(forest.compilerContent))).toEqual(['p']);
      expect(tags(snapshotTemplateCompilerDescendantElements(local))).toEqual([]);
      expect(tags(snapshotTemplateCompilerDescendantElements(local.templateContent))).toEqual(['div', 'span']);
      expect(templateCompilerElementAttribute(local, 'as-custom-element')?.value).toBe('local-card');
      forest.assertCoherentTopology();
    } finally {
      fixture.dispose();
    }
  });

  test('follows browser-effective foster parenting rather than authored nesting', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-query-foster');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'foster',
        '<table><div id="fostered"><span></span></div><tr><td></td></tr></table>',
      ).emission);
      const elements = snapshotTemplateCompilerDescendantElements(forest.compilerContent);
      const fostered = elements.find((element) => templateCompilerElementAttribute(element, 'id')?.value === 'fostered');
      const table = elements.find((element) => element.tagName === 'table');

      expect(tags(elements)).toEqual(['div', 'span', 'table', 'tbody', 'tr', 'td']);
      expect(fostered?.parent).toBe(forest.compilerContent);
      expect(table?.parent).toBe(forest.compilerContent);
      expect(fostered?.readParentOrdinal()).toBeLessThan(table?.readParentOrdinal() ?? -1);
    } finally {
      fixture.dispose();
    }
  });

  test('keeps snapshot membership and order stable after later forest mutation', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-query-snapshot');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'snapshot',
        '<section title="before"><i></i><b></b></section>',
      ).emission);
      const snapshot = snapshotTemplateCompilerDescendantElements(forest.compilerContent);
      const section = snapshot[0];
      const italic = snapshot[1];
      const title = section == null ? null : templateCompilerElementAttribute(section, 'title');
      if (section == null || italic == null || title == null) throw new Error('Expected snapshot inputs.');

      forest.detachNode(italic);
      forest.detachAttribute(title);

      expect(tags(snapshot)).toEqual(['section', 'i', 'b']);
      expect(snapshot[1]).toBe(italic);
      expect(title.value).toBe('before');
      expect(tags(snapshotTemplateCompilerDescendantElements(forest.compilerContent))).toEqual(['section', 'b']);
      expect(templateCompilerDirectElementCount(section)).toBe(1);
      expect(templateCompilerElementAttribute(section, 'title')).toBeNull();
      forest.assertCoherentTopology();
    } finally {
      fixture.dispose();
    }
  });

  test('matches ordinary compound selectors, lists, all structural combinators and HTML attribute value rules', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'selectors',
        '<article id="outside"><section id="root"><tab id="one" class="first shared" data-kind="A-b c" lang="EN-us" type="TEXT"></tab>'
        + '<!--between--><tab id="two" class="shared" data-kind="tail"></tab><div id="nested"><tab id="three"></tab></div>'
        + '<template id="hidden"><tab id="inside-template"></tab></template></section><tab id="outside-tab"></tab></article>',
      ).emission);
      const root = snapshotTemplateCompilerDescendantElements(forest.compilerContent).find(element =>
        templateCompilerElementAttribute(element, 'id')?.value === 'root');
      if (root === undefined) throw new Error('Missing query root.');
      const cases: readonly (readonly [string, readonly string[]])[] = [
        ['tab', ['one', 'two', 'three']],
        ['TAB', ['one', 'two', 'three']],
        [':scope > tab', ['one', 'two']],
        [':scope', []],
        ['#root', []],
        ['article tab', ['one', 'two', 'three']],
        ['#outside > section > tab', ['one', 'two']],
        ['tab + tab', ['two']],
        ['tab ~ div > tab', ['three']],
        ['#three, .shared, tab', ['one', 'two', 'three']],
        ['tab.shared[data-kind]', ['one', 'two']],
        ['[data-kind="a-B C"]', []],
        ['[data-kind="a-B C" i]', ['one']],
        ['[data-kind~="c"]', ['one']],
        ['[lang|="en"]', ['one']],
        ['[type="text"]', ['one']],
        ['[TYPE="text"]', ['one']],
        ['[data-kind^="A-"]', ['one']],
        ['[data-kind$="ail"]', ['two']],
        ['[data-kind*="-b"]', ['one']],
        ['[data-kind^=""]', []],
        ['[data-kind$=""]', []],
        ['[data-kind*=""]', []],
        ['[class~=""]', []],
        ['[class~="first shared"]', []],
        ['*|tab', ['one', 'two', 'three']],
        ['|tab', []],
      ];
      for (const [selector, expected] of cases) {
        const result = queryTemplateCompilerDescendantElements(root, selector);
        expect(result.kind, selector).toBe('complete');
        if (result.kind === 'complete') expect(ids(result.elements), selector).toEqual(expected);
      }
      const fragment = root.readChildren().find(element => element instanceof TemplateCompilerElementOccurrence && element.tagName === 'template');
      if (!(fragment instanceof TemplateCompilerElementOccurrence) || fragment.templateContent === null) throw new Error('Missing template content.');
      expect(queryTemplateCompilerDescendantElements(fragment.templateContent, ':scope > tab')).toEqual({ kind: 'complete', elements: [] });
      const nested = queryTemplateCompilerDescendantElements(fragment.templateContent, 'tab');
      expect(nested.kind === 'complete' && ids(nested.elements)).toEqual(['inside-template']);
      expect(queryTemplateCompilerDescendantElements(fragment.templateContent, 'template tab')).toEqual({ kind: 'complete', elements: [] });
    } finally { fixture.dispose(); }
  });

  test('reads current pending attribute values while preserving static snapshot membership', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors-live');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'live', '<main id="root"><tab id="one" class="before" title="before"></tab><tab id="two"></tab></main>',
      ).emission);
      const root = snapshotTemplateCompilerDescendantElements(forest.compilerContent)[0]!;
      const one = snapshotTemplateCompilerDescendantElements(root)[0]!;
      const pending = (attribute: { readonly name: string; readonly value: string }): string =>
        attribute.name === 'title' || attribute.name === 'class' ? 'after' : attribute.value;
      const result = queryTemplateCompilerDescendantElements(root, '.after[title=after]', pending);
      expect(result).toEqual({ kind: 'complete', elements: [one] });
      forest.detachNode(one);
      expect(result).toEqual({ kind: 'complete', elements: [one] });
      expect(queryTemplateCompilerDescendantElements(root, '.after', pending)).toEqual({ kind: 'complete', elements: [] });
    } finally { fixture.dispose(); }
  });

  test('preserves namespace semantics and refuses foreign-case ambiguity rather than reporting no match', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors-namespace');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'namespaces', '<svg><linearGradient id="gradient" viewBox="x"></linearGradient><a id="link" xlink:href="#x"></a></svg>',
      ).emission);
      const cases: readonly (readonly [string, readonly string[]])[] = [
        ['linearGradient', ['gradient']],
        ['[viewBox]', ['gradient']],
        ['[href]', []],
        ['[*|href]', ['link']],
        ['[|href]', []],
        ['[xlink\\:href]', []],
      ];
      for (const [selector, expected] of cases) {
        const result = queryTemplateCompilerDescendantElements(forest.compilerContent, selector);
        expect(result.kind, selector).toBe('complete');
        if (result.kind === 'complete') expect(ids(result.elements), selector).toEqual(expected);
      }
      for (const selector of ['lineargradient', '[viewbox]']) {
        expect(queryTemplateCompilerDescendantElements(forest.compilerContent, selector).kind, selector).toBe('unsupported');
      }
    } finally { fixture.dispose(); }
  });

  test('preflights the complete selector even for an empty subtree', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors-boundary');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize('empty', '<div></div>').emission);
      for (const selector of [
        ':has(tab)', ':first-child', ':is(tab, span)', 'tab:unknown', '::before', '[name=value s]', '[name=value z]',
        'ns|tab', '[ns|name]', '* || tab', 'tab, :checked', 'tab/**/', '#\\1f600', '#\\0', '#\\d800',
      ]) {
        expect(queryTemplateCompilerDescendantElements(forest.compilerContent, selector).kind, selector).toBe('unsupported');
      }
      expect(queryTemplateCompilerDescendantElements(forest.compilerContent, '').kind).toBe('syntax-error');
      expect(queryTemplateCompilerDescendantElements(forest.compilerContent, ' \t\n').kind).toBe('syntax-error');
      expect(queryTemplateCompilerDescendantElements(forest.compilerContent, '[name="line\nbreak"]').kind).toBe('syntax-error');
    } finally { fixture.dispose(); }
  });

  test('uses parser decoding and browser EOF recovery for ordinary escaped identifiers and attribute values', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors-parser');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'parser', '<tab id="123" class="name:part" title="hello"></tab>',
      ).emission);
      const cases = ['#\\31 23', '.name\\:part', '[title="h\\65 llo"]', '[title', '[title=hello', '[title="hello'];
      for (const selector of cases) {
        const result = queryTemplateCompilerDescendantElements(forest.compilerContent, selector);
        expect(result.kind, selector).toBe('complete');
        if (result.kind === 'complete') expect(ids(result.elements), selector).toEqual(['123']);
      }
      for (const selector of ['#123', '.123', '[title=123]', '[', 'tab >', 'tab,', ':scope()']) {
        expect(queryTemplateCompilerDescendantElements(forest.compilerContent, selector).kind, selector).not.toBe('complete');
      }
    } finally { fixture.dispose(); }
  });

  test('does not pretend null-namespace uppercase DOM-created HTML attributes were lowercased', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-dom-selectors-generated-attributes');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize('generated-attributes', '<div></div>').emission);
      const element = snapshotTemplateCompilerDescendantElements(forest.compilerContent)[0]!;
      const authority = {};
      const descriptors = [['DATA-UPPER', 'Y', null], ['ID', 'upper', null], ['CLASS', 'Upper', null], ['TYPE', 'TEXT', 'urn:foo']] as const;
      for (const [ordinal, [name, value, namespaceUri]] of descriptors.entries()) {
        const attribute = forest.createGeneratedAttribute(new TemplateCompilerOccurrenceGeneration(
          authority, 'selectors', 'attributes', TemplateCompilerGeneratedOccurrenceRole.HookAttribute,
          [forest.inputTree.productHandle], ordinal,
        ), name, value, namespaceUri, null);
        forest.insertDetachedAttribute(attribute, element, ordinal);
      }
      for (const selector of ['[DATA-UPPER]', '[data-upper]', '[ID=upper]', '#upper', '[CLASS=Upper]', '.Upper']) {
        expect(queryTemplateCompilerDescendantElements(forest.compilerContent, selector), selector).toEqual({ kind: 'complete', elements: [] });
      }
      expect(queryTemplateCompilerDescendantElements(forest.compilerContent, '[*|TYPE=TEXT]').kind).toBe('unsupported');
    } finally { fixture.dispose(); }
  });
});

function tags(elements: readonly TemplateCompilerElementOccurrence[]): readonly string[] {
  return elements.map((element) => element.tagName);
}

function ids(elements: readonly TemplateCompilerElementOccurrence[]): readonly string[] {
  return elements.map(element => templateCompilerElementAttribute(element, 'id')?.value ?? '');
}
