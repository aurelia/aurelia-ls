import { describe, expect, test } from 'vitest';

import {
  BROWSER_TEMPLATE_CORRESPONDENCE_SCHEMA_VERSION,
  encodeAuthoredTemplatePath,
  encodeBrowserTemplatePath,
  planBrowserTemplateCorrespondence,
  type BrowserTemplateCorrespondenceDraft,
} from '../src/template/browser-template-correspondence.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import {
  BROWSER_TEMPLATE_CARRIER_SELECTION_SCHEMA_VERSION,
  selectBrowserTemplateCompilerCarrier,
} from '../src/template/browser-template-selection.js';
import { parseHtmlDocumentDraft } from '../src/template/html-parse-materializer.js';
import { TemplateRecoveryPolicy } from '../src/template/parse-context.js';

const cases = [
  ['ordinary', '<section id="s"><h1>Hello</h1><!--c--><input disabled></section>'],
  ['implied-tbody', '<table><tr><td>x</td></tr></table>'],
  ['paragraph', '<p>a<div>b</div>c</p>'],
  ['foster', '<table><div>x</div><tr><td>y</td></tr>z</table>'],
  ['foster-merged', 'before<table>inside<tr><td>x</td></tr>after</table>'],
  ['nested-template', '<template data-x="1"><table><tr><td>x</td></tr></table><p>y</template>'],
  ['svg', '<svg viewbox="0 0 1 1"><lineargradient id="g"><foreignobject><DIV foo="bar"></DIV></foreignobject></lineargradient><use xlink:href="#g" xml:lang="en"></use></svg>'],
  ['mathml', '<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>'],
  ['normalized', '<p title="a&amp;b">A\r\nB\rC &copy; &#x1F600; &notit; &nbsp;</p>'],
  ['text-modes', '<style>a<b>&amp;</style><textarea>a<b>&amp;</textarea>'],
  ['duplicates', '<div a="1" A="2" a="3" class="x" CLASS="y"></div>'],
  ['numeric-attribute', '<div a="x" 0="y" b="z"></div>'],
  ['noscript', '<noscript><b>x&copy;</b><!--c--></noscript><i>y</i>'],
  ['noscript-collision', '<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>'],
  ['adoption', '<p><b>1<i>2</b>3</i>4</p>'],
  ['doctype-null', '<!DOCTYPE html><!--a--b--><div>\0x</div>'],
  ['customizable-select', '<select><button><selectedcontent></selectedcontent></button><option>one</option></select>'],
] as const;

describe('authored/browser correspondence planner', () => {
  test('derives the 17 browser cases and falsifiers conservatively in one fast batch', () => {
    const plans = new Map(cases.map(([id, markup]) => [id, plan(id, markup)]));

    expect(plans).toHaveLength(17);
    expect(plans.get('ordinary')?.unresolvedPartitions).toEqual([]);
    expect(plans.get('implied-tbody')?.impliedNodes).toEqual([
      expect.objectContaining({ reason: 'implied-table-section', causeCandidates: [expect.objectContaining({ tagName: 'tr' })] }),
    ]);
    expect(plans.get('paragraph')?.impliedNodes).toContainEqual(
      expect.objectContaining({ reason: 'implied-paragraph', causeCandidates: [] }),
    );
    expect(plans.get('paragraph')?.unresolvedPartitions.map((row) => row.kind))
      .toContain('implied-node-cause');
    expect(plans.get('paragraph')?.movedNodes.length).toBeGreaterThanOrEqual(2);
    expect(plans.get('foster')?.movedNodes.some((row) => row.authored.tagName === 'div')).toBe(true);
    expect(plans.get('foster-merged')?.unresolvedPartitions.map((row) => row.kind))
      .toContain('composite-text');
    expect(plans.get('nested-template')?.compilerCarrier?.derivation).toBe('1-to-1-selected-template');
    const adjustedViewBox = plans.get('svg')?.attributeDerivations.find((row) =>
      row.authored.rawName === 'viewbox'
    );
    expect(adjustedViewBox?.name).toBe('adjusted');
    expect(plans.get('normalized')?.unresolvedPartitions.map((row) => row.kind)).toEqual(
      expect.arrayContaining(['normalized-node-value', 'normalized-attribute-value']),
    );
    expect(plans.get('text-modes')?.unresolvedPartitions.map((row) => row.kind))
      .toContain('normalized-node-value');
    expect(plans.get('duplicates')?.droppedAuthoredAttributes).toHaveLength(3);
    expect(plans.get('duplicates')?.droppedAuthoredAttributes.every((row) =>
      row.reason === 'duplicate-attribute' && row.retainedPredecessor != null
    )).toBe(true);
    expect(plans.get('numeric-attribute')?.attributeDerivations.map((row) => row.authored.rawName))
      .toEqual(['a', '0', 'b']);
    expect(plans.get('noscript')?.impliedNodes).toEqual([]);
    expect(plans.get('noscript-collision')?.unresolvedPartitions.map((row) => row.kind))
      .toContain('normalized-node-value');
    const adoptionCohort = plans.get('adoption')?.reconstructionCohorts[0];
    expect(plans.get('adoption')?.reconstructionCohorts).toHaveLength(1);
    expect(adoptionCohort?.authored.tagName).toBe('i');
    expect(adoptionCohort?.browserOccurrences).toHaveLength(2);
    expect(plans.get('doctype-null')?.droppedAuthoredNodes).toEqual([
      expect.objectContaining({ reason: 'fragment-doctype' }),
    ]);
    expect(plans.get('doctype-null')?.unresolvedPartitions.map((row) => row.kind)).toContain('partial-text');

    const customizable = plans.get('customizable-select')!;
    expect(customizable.droppedAuthoredNodes).toEqual([]);
    expect(customizable.unresolvedPartitions.filter((row) =>
      row.kind === 'profile-divergent-customizable-select'
    ).map((row) => row.authoredNodes[0]?.tagName)).toEqual(['button', 'selectedcontent']);

    const repeated = plan('repeated', '<div></div><div></div>');
    expect(repeated.nodeDerivations.map((row) => row.browser.occurrenceKey)).toHaveLength(2);
    expect(new Set(repeated.nodeDerivations.map((row) => row.browser.occurrenceKey)).size).toBe(2);

    const entityBinding = plan('entity-binding', '<input value.bind="foo&#46;bar">');
    expect(entityBinding.attributeDerivations).toEqual([
      expect.objectContaining({ value: 'normalized' }),
    ]);
    expect(entityBinding.unresolvedPartitions.map((row) => row.kind)).toContain('normalized-attribute-value');

    const clonedAttribute = plan('cloned-attribute', '<b><i title.bind="x">one</b>two</i>');
    expect(clonedAttribute.reconstructionCohorts).toHaveLength(1);
    expect(clonedAttribute.attributeDerivations).toHaveLength(2);
    expect(new Set(clonedAttribute.attributeDerivations.map((row) => row.authored.occurrenceKey)).size).toBe(1);
    expect(new Set(clonedAttribute.attributeDerivations.map((row) => row.browser.occurrenceKey)).size).toBe(2);

    const asciiDuplicate = plan('ascii-duplicate', '<div K="kelvin" K="first" k="second"></div>');
    expect(asciiDuplicate.droppedAuthoredAttributes).toHaveLength(1);
    expect(asciiDuplicate.droppedAuthoredAttributes[0]?.authored.rawName).toBe('k');
    expect(asciiDuplicate.droppedAuthoredAttributes[0]?.retainedPredecessor?.rawName).toBe('K');

    const shield = plan('comment-shield', 'x<!--c--><template><div>y</div></template><!--d-->z');
    expect(shield.compilerCarrier).toMatchObject({ derivation: '1-to-1-selected-template' });
    expect(shield.factoryDiscards).toHaveLength(4);
    expect(shield.factoryDiscards.every((row) => row.derivation === '1-to-0')).toBe(true);

    const synthesized = plans.get('ordinary')!;
    expect(synthesized.compilerCarrier).toMatchObject({
      derivation: '0-to-1-synthesized-wrapper',
      compilerCarrier: { tagName: 'template', generationOrdinal: 0 },
    });

    expect(encodeAuthoredTemplatePath([1, 10])).toBe('root/i:1/i:10');
    expect(encodeBrowserTemplatePath([0, 'template-content', 1])).toBe(
      'root/i:0/template-content/i:1',
    );
    const deterministic = plan('ordinary', cases[0][1]);
    expect(deterministic.correspondenceKey).toBe(plans.get('ordinary')?.correspondenceKey);
    expect(deterministic.nodeDerivations.map((row) => row.browser.occurrenceKey)).toEqual(
      plans.get('ordinary')?.nodeDerivations.map((row) => row.browser.occurrenceKey),
    );
    expect(deterministic.correspondenceKey).toContain(
      encodeURIComponent(BROWSER_TEMPLATE_CORRESPONDENCE_SCHEMA_VERSION),
    );
    expect(deterministic.correspondenceKey).toContain(
      encodeURIComponent(BROWSER_TEMPLATE_CARRIER_SELECTION_SCHEMA_VERSION),
    );

    const authorityMarkup = cases[0][1];
    const authorityBrowser = parseBrowserTemplateFragmentDraft(authorityMarkup);
    const authorityPlan = (policy: TemplateRecoveryPolicy, sourceRevision: string) =>
      planBrowserTemplateCorrespondence({
        templateIdentity: 'authority',
        sourceRevision,
        markup: authorityMarkup,
        authored: parseHtmlDocumentDraft(authorityMarkup, policy),
        browser: authorityBrowser,
      });
    expect(authorityPlan(TemplateRecoveryPolicy.Strict, 'r1').correspondenceKey)
      .not.toBe(authorityPlan(TemplateRecoveryPolicy.Recover, 'r1').correspondenceKey);
    expect(authorityPlan(TemplateRecoveryPolicy.Recover, 'r1').correspondenceKey)
      .not.toBe(authorityPlan(TemplateRecoveryPolicy.Recover, 'r2').correspondenceKey);
    expect(() => planBrowserTemplateCorrespondence({
      templateIdentity: 'mismatch',
      sourceRevision: 'r1',
      markup: authorityMarkup,
      authored: parseHtmlDocumentDraft('<aside></aside>', TemplateRecoveryPolicy.Recover),
      browser: authorityBrowser,
    })).toThrow('one exact markup input');
  });
});

function plan(templateIdentity: string, markup: string): BrowserTemplateCorrespondenceDraft {
  const authored = parseHtmlDocumentDraft(markup, TemplateRecoveryPolicy.Recover);
  const browser = parseBrowserTemplateFragmentDraft(markup);
  return planBrowserTemplateCorrespondence({
    templateIdentity,
    sourceRevision: `test-source:${templateIdentity}`,
    markup,
    authored,
    browser,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
  });
}
