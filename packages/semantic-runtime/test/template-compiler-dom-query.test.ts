import { describe, expect, test } from 'vitest';

import {
  snapshotTemplateCompilerDescendantElements,
  templateCompilerDirectElementCount,
  templateCompilerElementAttribute,
} from '../src/template/template-compiler-dom-query.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
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
});

function tags(elements: readonly TemplateCompilerElementOccurrence[]): readonly string[] {
  return elements.map((element) => element.tagName);
}
