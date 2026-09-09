/* global window, document, Element, HTMLElement, HTMLInputElement, HTMLTemplateElement, requestAnimationFrame */

import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, LaneTranscript, LiveElementTranscript } from './contract.js';

export interface BrowserRecoveryApplicationObservation {
  readonly kind: 'browser-recovery';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly source: { readonly message: string; readonly ignored: string; readonly visible: boolean };
    readonly foster: {
      readonly order: readonly string[];
      readonly first: readonly string[] | null;
      readonly second: readonly string[];
      readonly tableSection: string;
      readonly cell: string;
    };
    readonly paragraph: {
      readonly visible: boolean;
      readonly items: readonly string[];
      readonly parents: readonly string[];
      readonly emptyParagraphs: number;
      readonly tail: boolean;
    };
    readonly foreign: {
      readonly svgNamespace: string | null;
      readonly viewBox: string | null;
      readonly gradientName: string;
      readonly foreignObjectName: string;
      readonly svgText: readonly (string | null)[];
      readonly svgHtml: readonly (string | null)[];
      readonly namespacedAttributes: readonly (string | null)[];
      readonly mathText: readonly (string | null)[];
      readonly mathHtml: readonly (string | null)[];
      readonly annotationHtml: readonly (string | null)[];
    };
    readonly carriers: {
      readonly selectedText: string;
      readonly wrappedBefore: string;
      readonly wrappedAfter: string;
      readonly inertText: string;
      readonly inertBindingMarkers: number;
    };
  };
}

export async function runBrowserRecoveryLane(
  browser: Browser,
  lane: AssuranceLane,
  url: string,
): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__browserRecoveryAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} browser-recovery application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints = [];
    checkpoints.push({ label: 'initial', observation: await capture(page) });

    await page.locator('#duplicate').fill('bravo');
    await settle(page);
    checkpoints.push({ label: 'first-attribute-writeback', observation: await capture(page) });

    await page.locator('#toggle').click();
    await settle(page);
    checkpoints.push({ label: 'independent-recovered-controllers', observation: await capture(page) });

    await page.locator('#add').click();
    await settle(page);
    checkpoints.push({ label: 'repeat-outside-hidden-paragraph', observation: await capture(page) });

    await page.locator('#toggle').click();
    await settle(page);
    checkpoints.push({ label: 'restored-recovered-hosts', observation: await capture(page) });

    await page.evaluate(() => window.__browserRecoveryAssurance!.stop());
    const remaining = await page.evaluate(() => ({
      hostChildren: document.querySelector('browser-recovery-app')?.childNodes.length,
      recoveredNodes: document.querySelectorAll('#recovery, #foster-first, .recovered-item, #svg-text').length,
    }));
    assert.deepEqual(remaining, { hostChildren: 0, recoveredNodes: 0 }, `${lane} browser-recovery teardown`);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally {
    await context.close();
  }
}

export function assertBrowserRecoveryBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map(artifact => artifact.definitionName).sort(),
    ['browser-recovery-app', 'selected-carrier', 'wrapped-carrier'],
    'Browser-effective and both string-carrier resources must be compiled.',
  );
}

export function assertBrowserRecoveryExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  const cases = [
    ['initial', 'alpha', true, ['one', 'two']],
    ['first-attribute-writeback', 'bravo', true, ['one', 'two']],
    ['independent-recovered-controllers', 'bravo', false, ['one', 'two']],
    ['repeat-outside-hidden-paragraph', 'bravo', false, ['one', 'two', 'three']],
    ['restored-recovered-hosts', 'bravo', true, ['one', 'two', 'three']],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, visible, items]] of cases.entries()) {
    const checkpoint = transcript.semantic.checkpoints[index]!;
    assert.equal(checkpoint.label, label);
    const observed = checkpoint.observation;
    assert.equal(observed.kind, 'browser-recovery');
    if (observed.kind !== 'browser-recovery') throw new Error(`Unexpected observation at '${label}'.`);
    assert.deepEqual(observed.live, [{ id: 'duplicate', value: message }]);
    assert.deepEqual(observed.model.source, { message, ignored: 'discarded', visible });
    assert.deepEqual(observed.model.foster, {
      order: visible ? ['foster-first', 'foster-second', 'foster-table'] : ['foster-second', 'foster-table'],
      first: visible ? [message, message] : null,
      second: [message, message],
      tableSection: 'tbody',
      cell: message,
    });
    assert.deepEqual(observed.model.paragraph, {
      visible, items, parents: items.map(() => 'paragraph-zone'), emptyParagraphs: 1, tail: true,
    });
    const html = 'http://www.w3.org/1999/xhtml';
    const svg = 'http://www.w3.org/2000/svg';
    assert.deepEqual(observed.model.foreign, {
      svgNamespace: svg,
      viewBox: '0 0 40 40',
      gradientName: 'linearGradient',
      foreignObjectName: 'foreignObject',
      svgText: [svg, message],
      svgHtml: [html, message, message],
      namespacedAttributes: ['#gradient', 'en'],
      mathText: ['http://www.w3.org/1998/Math/MathML', message],
      mathHtml: [html, message],
      annotationHtml: [html, message],
    });
    assert.deepEqual(observed.model.carriers, {
      selectedText: 'selected', wrappedBefore: 'wrapped', wrappedAfter: 'wrapped',
      inertText: '${message}', inertBindingMarkers: 0,
    });
  }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function capture(page: Page): Promise<BrowserRecoveryApplicationObservation> {
  return page.evaluate(() => {
    const required = <T extends Element = Element>(selector: string): T => {
      const node = document.querySelector<T>(selector);
      if (node == null) throw new Error(`Missing browser-recovery node '${selector}'.`);
      return node;
    };
    const text = (node: Element): string => node.textContent?.trim() ?? '';
    const pair = (selector: string): readonly (string | null)[] => {
      const node = required(selector);
      return [node.namespaceURI, text(node)];
    };
    const foster = required('#foster-zone');
    const first = document.querySelector('#foster-first');
    const second = required('#foster-second');
    const paragraph = required('#paragraph-zone');
    const items = Array.from(paragraph.querySelectorAll('.recovered-item'));
    const svgHtml = required('#svg-html');
    const use = required('#svg-use');
    const inert = required<HTMLTemplateElement>('#wrapped-inert').content;
    const input = required<HTMLInputElement>('#duplicate');
    return {
      kind: 'browser-recovery' as const,
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        source: window.__browserRecoveryAssurance!.readModel(),
        foster: {
          order: Array.from(foster.children, node => node.id),
          first: first == null ? null : [text(first), first.getAttribute('title') ?? ''],
          second: [text(second), second.getAttribute('title') ?? ''],
          tableSection: required('#foster-table').firstElementChild?.localName ?? '',
          cell: text(required('#table-cell')),
        },
        paragraph: {
          visible: document.querySelector('#recovered-paragraph') != null,
          items: items.map(text),
          parents: items.map(item => item.parentElement?.id ?? ''),
          emptyParagraphs: Array.from(paragraph.children).filter(node => node.localName === 'p' && node.childNodes.length === 0).length,
          tail: Array.from(paragraph.childNodes).some(node => node.nodeType === 3 && node.textContent === 'tail'),
        },
        foreign: {
          svgNamespace: required('#recovery-svg').namespaceURI,
          viewBox: required('#recovery-svg').getAttribute('viewBox'),
          gradientName: required('#gradient').localName,
          foreignObjectName: svgHtml.parentElement?.localName ?? '',
          svgText: pair('#svg-text'),
          svgHtml: [svgHtml.namespaceURI, text(svgHtml), svgHtml.getAttribute('title')],
          namespacedAttributes: [use.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), use.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang')],
          mathText: pair('#math-mi'), mathHtml: pair('#math-html'), annotationHtml: pair('#annotation-html'),
        },
        carriers: {
          selectedText: text(required('selected-carrier')),
          wrappedBefore: text(required('#wrapped-before')),
          wrappedAfter: text(required('#wrapped-after')),
          inertText: inert.textContent?.trim() ?? '',
          inertBindingMarkers: Array.from(inert.querySelector('b')?.childNodes ?? []).filter(node => node.nodeType === 8).length,
        },
      },
    };
  });
}

declare global {
  interface Window {
    __browserRecoveryAssurance?: {
      ready: boolean;
      readModel(): { message: string; ignored: string; visible: boolean };
      stop(): Promise<void>;
    };
  }
}
