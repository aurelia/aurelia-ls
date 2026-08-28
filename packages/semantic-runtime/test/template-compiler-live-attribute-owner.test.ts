import { describe, expect, test, vi } from 'vitest';

import { hasHtmlAttribute, htmlAttributeValue } from '../src/template/html-ir.js';
import {
  TemplateCompilerLiveAttributeDisposition,
  TemplateCompilerLiveAttributeOwnerInput,
  TemplateCompilerLiveAttributeOwnerProgression,
  type TemplateCompilerLiveAttributeSuppressionAuthority,
} from '../src/template/template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerAttributeOccurrence,
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
      expect(progression.readFinalView().hasAttribute('as-element')).toBe(false);
      expect(progression.readFinalView().getAttribute('title')).toBe('current');
      expect(progression.readFinalView().hasAttribute('data-x')).toBe(false);

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
      expect(() => progression.readFinalView()).toThrow(/has not finished/u);
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

  test('retains finished owner history across unrelated, scalar, and detachment revisions', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-history');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'history',
        '<div title="before"></div><span></span>',
      ).emission);
      const owner = elements(forest, 'div')[0];
      const unrelated = elements(forest, 'span')[0];
      const title = owner?.readAttributes()[0];
      if (owner == null || unrelated == null || title == null) throw new Error('Expected historical owner inputs.');
      const input = TemplateCompilerLiveAttributeOwnerInput.capture(
        forest,
        owner,
        forest.mutationRevision,
      );
      const progression = new TemplateCompilerLiveAttributeOwnerProgression(input);
      const site = progression.begin(title);
      progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained);
      const finished = progression.finish().readFinalView();

      forest.detachNode(unrelated);
      expect(input.isCurrent()).toBe(false);
      expect(progression.readSites()).toEqual([site]);
      expect(progression.siteForAttribute(title)).toBe(site);
      expect(site.ownerView.getAttribute('title')).toBe('before');
      expect(finished.getAttribute('title')).toBe('before');
      expect(title.value).toBe('before');

      forest.rewriteAttributeValue(title, 'after');
      expect(site.ownerView.getAttribute('title')).toBe('before');
      expect(finished.getAttribute('title')).toBe('before');
      expect(title.value).toBe('after');

      forest.detachAttribute(title);
      expect(owner.readAttributes()).toEqual([]);
      expect(progression.siteForAttribute(title)).toBe(site);
      expect(site.ownerView.hasAttribute('title')).toBe(true);
      expect(site.ownerView.getAttribute('title')).toBe('before');
      expect(finished.getAttribute('title')).toBe('before');
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

  test('hides exact first and middle physical attributes while preserving physical and compact ordinals', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-suppression');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'suppression',
        '<div au-slot="one" title="two" data-x="three"></div>'
          + '<div title="one" au-slot="two" data-x="three"></div>',
      ).emission);
      const [firstOwner, middleOwner] = elements(forest, 'div');
      if (firstOwner == null || middleOwner == null) throw new Error('Expected suppression owners.');

      for (const [owner, suppressedOrdinal, expectedOriginalOrdinals] of [
        [firstOwner, 0, [1, 2]],
        [middleOwner, 1, [0, 2]],
      ] as const) {
        const physicalBefore = [...owner.readAttributes()];
        const suppressed = physicalBefore[suppressedOrdinal]!;
        const suppression = testSuppressionAuthority(
          forest,
          owner,
          [suppressed],
        );
        const input = TemplateCompilerLiveAttributeOwnerInput.capture(
          forest,
          owner,
          forest.mutationRevision,
          suppression,
        );
        const progression = new TemplateCompilerLiveAttributeOwnerProgression(input);

        expect(input.visibleAttributes.map((attribute) => attribute.name)).toEqual(['title', 'data-x']);
        expect(progression.readAttributesToVisit()).toEqual(input.visibleAttributes);
        for (const [visibleOrdinal, attribute] of input.visibleAttributes.entries()) {
          const site = progression.begin(attribute);
          expect(site.originalForestOrdinal).toBe(expectedOriginalOrdinals[visibleOrdinal]);
          expect(site.simulatedLiveOrdinal).toBe(visibleOrdinal);
          expect(site.ownerView.hasAttribute('au-slot')).toBe(false);
          expect(site.ownerView.getAttribute('au-slot')).toBeNull();
          progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained);
        }
        progression.finish();

        expect(progression.readFinalView().hasAttribute('au-slot')).toBe(false);
        expect(owner.readAttributes()).toEqual(physicalBefore);
        expect(suppressed.owner).toBe(owner);
      }
    } finally {
      fixture.dispose();
    }
  });

  test('rejects duplicate, foreign, and revision-drifted suppression authority', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-suppression-authority');
    try {
      const emission = fixture.materialize('authority', '<div au-slot title></div>').emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const foreignForest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const owner = elements(forest, 'div')[0]!;
      const foreignOwner = elements(foreignForest, 'div')[0]!;
      const slot = owner.readAttributes()[0]!;
      const foreignSlot = foreignOwner.readAttributes()[0]!;

      expect(() => TemplateCompilerLiveAttributeOwnerInput.capture(
        forest,
        owner,
        forest.mutationRevision,
        testSuppressionAuthority(forest, owner, [slot, slot]),
      )).toThrow(/suppression authority/u);
      expect(() => TemplateCompilerLiveAttributeOwnerInput.capture(
        forest,
        owner,
        forest.mutationRevision,
        testSuppressionAuthority(forest, owner, [foreignSlot]),
      )).toThrow(/suppression authority/u);

      const suppression = testSuppressionAuthority(forest, owner, [slot]);
      expect(() => TemplateCompilerLiveAttributeOwnerInput.capture(
        foreignForest,
        foreignOwner,
        foreignForest.mutationRevision,
        suppression,
      )).toThrow(/suppression authority/u);

      forest.rewriteAttributeValue(slot, 'stale');
      expect(suppression.isCurrent()).toBe(false);
      expect(() => TemplateCompilerLiveAttributeOwnerInput.capture(
        forest,
        owner,
        forest.mutationRevision,
        suppression,
      )).toThrow(/suppression authority/u);
    } finally {
      fixture.dispose();
    }
  });

  test('keeps a 128-wide suppressed walk linear without consulting owner ordinals', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-live-attribute-owner-suppression-wide');
    const ordinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const attributes = Array.from({ length: 128 }, (_, index) => `data-${index}="${index}"`).join(' ');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(
        'wide-suppression',
        `<div ${attributes}></div>`,
      ).emission);
      const owner = elements(forest, 'div')[0]!;
      const suppressed = owner.readAttributes()[64]!;
      const input = TemplateCompilerLiveAttributeOwnerInput.capture(
        forest,
        owner,
        forest.mutationRevision,
        testSuppressionAuthority(
          forest,
          owner,
          [suppressed],
        ),
      );
      const progression = new TemplateCompilerLiveAttributeOwnerProgression(input);

      for (const [visibleOrdinal, attribute] of progression.readAttributesToVisit().entries()) {
        const site = progression.begin(attribute);
        expect(site.originalForestOrdinal).toBe(visibleOrdinal < 64 ? visibleOrdinal : visibleOrdinal + 1);
        expect(site.simulatedLiveOrdinal).toBe(visibleOrdinal);
        progression.complete(site, TemplateCompilerLiveAttributeDisposition.Retained);
      }

      expect(progression.finish()).toBe(progression);
      expect(progression.readSites()).toHaveLength(127);
      expect(ordinal).not.toHaveBeenCalled();
    } finally {
      ordinal.mockRestore();
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

function testSuppressionAuthority(
  forest: TemplateCompilerOccurrenceForest,
  element: TemplateCompilerElementOccurrence,
  suppressedAttributes: readonly TemplateCompilerAttributeOccurrence[],
): TemplateCompilerLiveAttributeSuppressionAuthority {
  const forestMutationRevision = forest.mutationRevision;
  return {
    forest,
    element,
    forestMutationRevision,
    suppressedAttributes: [...suppressedAttributes],
    isCurrent: () => forest.mutationRevision === forestMutationRevision,
  };
}
