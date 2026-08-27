import { describe, expect, test } from 'vitest';

import { hasHtmlAttribute, htmlAttributeValue } from '../src/template/html-ir.js';
import {
  TemplateCompilerLiveAttributeDisposition,
  TemplateCompilerLiveAttributeOwnerProgression,
} from '../src/template/template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler live attribute owner progression', () => {
  test('distinguishes absent from present-empty and preserves historical views across removal and retention', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-state');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'state',
        '<div as-element="" title="one" data-x="two"></div><div title=""></div>',
      ).emission);
      const [present, absent] = elements(forest, 'div');
      if (present == null || absent == null) throw new Error('Expected two live div occurrences.');
      const [asElement, title, dataX] = present.readAttributes();
      const absentTitle = absent.readAttributes()[0];
      if (asElement == null || title == null || dataX == null || absentTitle == null) {
        throw new Error('Expected live attribute inputs.');
      }
      forest.rewriteAttributeValue(title, 'current');

      const progression = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        present,
        forest.mutationRevision,
      );
      const asElementSite = progression.begin(asElement);
      expect(asElementSite).toMatchObject({ originalForestOrdinal: 0, simulatedLiveOrdinal: 0 });
      expect(hasHtmlAttribute(asElementSite.ownerView, 'as-element')).toBe(true);
      expect(htmlAttributeValue(asElementSite.ownerView, 'as-element')).toBe('');
      expect(asElementSite.ownerView.getAttribute('title')).toBe('current');
      progression.complete(asElementSite, TemplateCompilerLiveAttributeDisposition.Removed);

      const titleSite = progression.begin(title);
      expect(titleSite).toMatchObject({ originalForestOrdinal: 1, simulatedLiveOrdinal: 0 });
      expect(titleSite.ownerView.hasAttribute('as-element')).toBe(false);
      expect(titleSite.ownerView.getAttribute('title')).toBe('current');
      progression.complete(titleSite, TemplateCompilerLiveAttributeDisposition.Retained);

      const dataSite = progression.begin(dataX);
      expect(dataSite).toMatchObject({ originalForestOrdinal: 2, simulatedLiveOrdinal: 1 });
      expect(dataSite.ownerView.hasAttribute('as-element')).toBe(false);
      expect(dataSite.ownerView.getAttribute('title')).toBe('current');
      progression.complete(dataSite, TemplateCompilerLiveAttributeDisposition.Removed);
      progression.finish();

      expect(asElementSite.ownerView.hasAttribute('as-element')).toBe(true);
      expect(asElementSite.ownerView.getAttribute('as-element')).toBe('');
      expect(titleSite.ownerView.hasAttribute('title')).toBe(true);
      expect(progression.readSites().map((site) => site.disposition)).toEqual([
        TemplateCompilerLiveAttributeDisposition.Removed,
        TemplateCompilerLiveAttributeDisposition.Retained,
        TemplateCompilerLiveAttributeDisposition.Removed,
      ]);

      const absentProgression = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        absent,
        forest.mutationRevision,
      );
      const absentSite = absentProgression.begin(absentTitle);
      expect(hasHtmlAttribute(absentSite.ownerView, 'as-element')).toBe(false);
      expect(htmlAttributeValue(absentSite.ownerView, 'as-element')).toBeNull();
      expect(hasHtmlAttribute(absentSite.ownerView, 'title')).toBe(true);
      expect(htmlAttributeValue(absentSite.ownerView, 'title')).toBe('');
      absentProgression.complete(absentSite, TemplateCompilerLiveAttributeDisposition.Retained);
      absentProgression.finish();
    } finally {
      fixture.dispose();
    }
  });

  test('rejects foreign, duplicate, out-of-order, and revision-drifted use and admits terminal Open', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-lifecycle');
    try {
      const emission = fixture.materialize('lifecycle', '<div a="1" b="2" c="3"></div>').emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const foreignForest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const element = elements(forest, 'div')[0];
      const foreignElement = elements(foreignForest, 'div')[0];
      if (element == null || foreignElement == null) throw new Error('Expected live div occurrences.');
      const [a, b, c] = element.readAttributes();
      const foreignA = foreignElement.readAttributes()[0];
      if (a == null || b == null || c == null || foreignA == null) throw new Error('Expected lifecycle attributes.');

      expect(() => new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        element,
        forest.mutationRevision + 1,
      )).toThrow(/revision drifted/u);
      expect(() => new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        foreignElement,
        forest.mutationRevision,
      )).toThrow(/another occurrence forest/u);
      foreignForest.detachNode(foreignElement);
      const detachedLaneProgression = new TemplateCompilerLiveAttributeOwnerProgression(
        foreignForest,
        foreignElement,
        foreignForest.mutationRevision,
      );
      const detachedSite = detachedLaneProgression.begin(foreignA);
      detachedLaneProgression.complete(detachedSite, TemplateCompilerLiveAttributeDisposition.Retained);

      const progression = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        element,
        forest.mutationRevision,
      );
      expect(() => progression.begin(b)).toThrow(/expected 0/u);
      expect(() => progression.begin(foreignA)).toThrow(/does not belong/u);
      const site = progression.begin(a);
      expect(() => progression.begin(a)).toThrow(/must complete/u);

      const peer = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        element,
        forest.mutationRevision,
      );
      const peerSite = peer.begin(a);
      expect(() => progression.complete(peerSite, TemplateCompilerLiveAttributeDisposition.Retained))
        .toThrow(/another progression/u);
      progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained);
      expect(() => progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained))
        .toThrow(/already completed/u);

      peer.complete(peerSite, TemplateCompilerLiveAttributeDisposition.Removed);
      const progressionB = progression.begin(b);
      progression.complete(progressionB, TemplateCompilerLiveAttributeDisposition.Removed);
      const peerB = peer.begin(b);
      peer.complete(peerB, TemplateCompilerLiveAttributeDisposition.Retained);
      const progressionC = progression.begin(c);
      const peerC = peer.begin(c);
      expect(progressionC.ownerView.attributeStateKey).not.toBe(peerC.ownerView.attributeStateKey);

      forest.rewriteAttributeValue(c, 'changed');
      expect(() => site.ownerView.getAttribute('a')).toThrow(/revision drifted/u);
      expect(() => progression.complete(progressionC, TemplateCompilerLiveAttributeDisposition.Retained))
        .toThrow(/revision drifted/u);

      const openForest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const openElement = elements(openForest, 'div')[0]!;
      const openProgression = new TemplateCompilerLiveAttributeOwnerProgression(
        openForest,
        openElement,
        openForest.mutationRevision,
      );
      const openSite = openProgression.begin(openElement.readAttributes()[0]!);
      openProgression.complete(openSite, TemplateCompilerLiveAttributeDisposition.Open);
      expect(openSite.disposition).toBe(TemplateCompilerLiveAttributeDisposition.Open);
      expect(() => openProgression.begin(openElement.readAttributes()[1]!)).toThrow(/terminally open/u);
      expect(openProgression.finish()).toBe(openProgression);
    } finally {
      fixture.dispose();
    }
  });

  test('uses exact namespace-qualified names and occurrence values', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-qualified');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'qualified',
        '<svg><use xlink:href="#probe" href=""></use></svg>',
      ).emission);
      const use = elements(forest, 'use')[0];
      if (use == null) throw new Error('Expected an SVG use occurrence.');
      const [xlinkHref] = use.readAttributes();
      if (xlinkHref == null) throw new Error('Expected a namespaced href occurrence.');

      const progression = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        use,
        forest.mutationRevision,
      );
      const site = progression.begin(xlinkHref);
      expect(xlinkHref).toMatchObject({ name: 'href', prefix: 'xlink', value: '#probe' });
      expect(site.ownerView.hasAttribute('xlink:href')).toBe(true);
      expect(site.ownerView.getAttribute('xlink:href')).toBe('#probe');
      expect(site.ownerView.hasAttribute('href')).toBe(true);
      expect(site.ownerView.getAttribute('href')).toBe('');
      expect(site.ownerView.hasAttribute('XLINK:HREF')).toBe(false);
      progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained);
    } finally {
      fixture.dispose();
    }
  });

  test('keeps 512 command-style sites linear with bounded mapper state keys', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-wide');
    try {
      const attributes = Array.from({ length: 512 }, (_, index) => `data-${index}.bind="message"`).join(' ');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'wide',
        `<div ${attributes}></div>`,
      ).emission);
      const element = elements(forest, 'div')[0];
      if (element == null) throw new Error('Expected wide div occurrence.');
      const progression = new TemplateCompilerLiveAttributeOwnerProgression(
        forest,
        element,
        forest.mutationRevision,
      );
      const stateKeys = new Set<string>();

      for (const [originalForestOrdinal, attribute] of element.readAttributes().entries()) {
        const site = progression.begin(attribute);
        expect(site.originalForestOrdinal).toBe(originalForestOrdinal);
        expect(site.simulatedLiveOrdinal).toBe(0);
        expect(site.ownerView.hasAttribute(attribute.name)).toBe(true);
        expect(site.ownerView.getAttribute(attribute.name)).toBe('message');
        expect(site.ownerView.attributeStateKey.length).toBeLessThan(240);
        expect('attributes' in site.ownerView).toBe(false);
        stateKeys.add(site.ownerView.attributeStateKey);
        progression.complete(site, TemplateCompilerLiveAttributeDisposition.Removed);
      }

      expect(progression.finish()).toBe(progression);
      expect(progression.readSites()).toHaveLength(512);
      expect(stateKeys.size).toBe(512);
    } finally {
      fixture.dispose();
    }
  }, 30_000);
});

function elements(
  forest: TemplateCompilerOccurrenceForest,
  tagName: string,
): readonly TemplateCompilerElementOccurrence[] {
  return forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence && node.tagName === tagName
  );
}
