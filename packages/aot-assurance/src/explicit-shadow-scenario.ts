/* global window, document, Node, Element, HTMLElement, HTMLInputElement, HTMLSlotElement, requestAnimationFrame */

import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

interface ShadowCardObservation {
  readonly id: string;
  readonly heading: string;
  readonly light: readonly string[];
  readonly lightTextNodes: readonly string[];
  readonly authoredComments: readonly string[];
  readonly projection: readonly string[];
  readonly actions: readonly string[];
  readonly native: readonly string[];
  readonly default: readonly string[];
  readonly nativeFlattened: readonly string[];
  readonly defaultFlattened: readonly string[];
  readonly boundTitles: readonly string[];
  readonly ownership: boolean;
}

export interface ExplicitShadowApplicationObservation {
  readonly kind: 'explicit-shadow';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly selected: string;
    readonly afterHosts: string;
    readonly cards: readonly ShadowCardObservation[];
  };
}

declare global {
  interface Window {
    __explicitShadowAssurance?: { readonly ready: boolean; stop(): Promise<void> };
  }
}

export async function runExplicitShadowLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__explicitShadowAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} explicit-shadow application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await settle(page);
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    const firstCard = await page.locator('#card-first').elementHandle();
    const secondCard = await page.locator('#card-second').elementHandle();
    assert.ok(firstCard != null && secondCard != null);
    const firstShadow = await firstCard.evaluateHandle(host => host.shadowRoot);
    const secondShadow = await secondCard.evaluateHandle(host => host.shadowRoot);

    await page.locator('#message').fill('bravo');
    await page.locator('#suffix').fill('sigma');
    await checkpoint('source-update');
    await page.locator('#ordinary .increment').click();
    await page.locator('#conditional .increment').click();
    await page.locator('#card-first .increment').click();
    await checkpoint('host-scope-update');
    await page.locator('#ordinary nav button').first().click();
    await checkpoint('projection-source-event');

    for (const [id, label] of [
      ['toggle-light', 'retained-controller-hidden'],
      ['toggle-projection', 'projection-controller-hidden'],
      ['reorder', 'reordered-light-projections-hosts'],
      ['toggle-host', 'conditional-host-hidden'],
      ['remove', 'repeated-host-removed'],
      ['append', 'repeated-host-created'],
      ['toggle-light', 'retained-controller-restored'],
      ['toggle-projection', 'projection-controller-restored'],
      ['toggle-host', 'conditional-host-restored'],
    ] as const) {
      await page.locator(`#${id}`).click();
      await checkpoint(label);
      if (id === 'reorder') {
        assert.equal(await page.evaluate(({ first, second, firstRoot, secondRoot }) => {
          const hosts = document.querySelectorAll('shadow-card[id^="card-"]');
          return hosts[0] === second && hosts[1] === first
            && first?.shadowRoot === firstRoot && second?.shadowRoot === secondRoot;
        }, { first: firstCard, second: secondCard, firstRoot: firstShadow, secondRoot: secondShadow }), true,
        `${lane} keyed reorder must retain both hosts and their shadow roots`);
      }
      if (id === 'remove') assert.equal(await secondCard.evaluate(host => host.isConnected), false);
    }
    await page.locator('#ordinary nav button').first().click();
    await checkpoint('reordered-projection-event');
    await page.evaluate(() => window.__explicitShadowAssurance!.stop());
    assert.equal(await page.locator('explicit-shadow-app').evaluate(host => host.childNodes.length), 0);
    assert.equal(await firstCard.evaluate(host => host.isConnected), false);
    await Promise.all([firstCard.dispose(), secondCard.dispose(), firstShadow.dispose(), secondShadow.dispose()]);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function capture(page: Page): Promise<ExplicitShadowApplicationObservation> {
  return page.evaluate(() => {
    const text = (node: Node): string => node.textContent?.replace(/\s+/gu, ' ').trim() ?? '';
    const nodes = (list: Iterable<Node>): string[] => Array.from(list)
      .filter(node => node.nodeType !== Node.COMMENT_NODE && text(node) !== '')
      .map(node => `${node.nodeName.toLowerCase()}:${text(node)}`);
    const inputs = ['message', 'suffix'].map(id => document.querySelector<HTMLInputElement>(`#${id}`)!);
    return {
      kind: 'explicit-shadow',
      live: inputs.map(input => ({ id: input.id, value: input.value })),
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        selected: text(document.querySelector('#selected')!),
        afterHosts: text(document.querySelector('#after-hosts')!),
        cards: Array.from(document.querySelectorAll('shadow-card'), host => {
          const shadow = host.shadowRoot;
          if (shadow == null) throw new Error(`Missing shadow root on '${host.id}'.`);
          const native = shadow.querySelector<HTMLSlotElement>('slot[name="native"]')!;
          const defaultSlot = shadow.querySelector<HTMLSlotElement>('slot:not([name])')!;
          const projected = [...shadow.querySelector('header')!.children, ...shadow.querySelector('nav')!.children];
          const nativeNodes = native.assignedNodes();
          const defaultNodes = defaultSlot.assignedNodes();
          return {
            id: host.id,
            heading: text(shadow.querySelector('h2')!),
            light: nodes(host.childNodes),
            // Raw text includes authored whitespace and distinguishes neighboring interpolation targets.
            lightTextNodes: Array.from(host.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.nodeValue ?? ''),
            authoredComments: Array.from(host.childNodes).filter(node => node.nodeType === Node.COMMENT_NODE
              && node.nodeValue === 'retained-light').map(node => node.nodeValue!),
            projection: nodes(shadow.querySelector('header')!.children),
            actions: nodes(shadow.querySelector('nav')!.children),
            native: nodes(nativeNodes), default: nodes(defaultNodes),
            nativeFlattened: nodes(native.assignedNodes({ flatten: true })),
            defaultFlattened: nodes(defaultSlot.assignedNodes({ flatten: true })),
            boundTitles: Array.from(host.querySelectorAll('[title]'), node => node.getAttribute('title')!),
            ownership: [...nativeNodes, ...defaultNodes].every(node => node.parentNode === host && node.getRootNode() === document)
              && native.assignedElements().every((node, index) => node === nativeNodes.filter(node => node instanceof Element)[index]
                && node.getAttribute('slot') === 'native')
              && projected.every(node => node.getRootNode() === shadow && !host.contains(node)),
          };
        }),
      },
    };
  });
}

export function assertExplicitShadowBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName).sort(), ['explicit-shadow-app', 'shadow-card']);
}

export function assertExplicitShadowExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const original = ['first', 'second'];
  const reversed = ['second', 'first'];
  const removed = ['first'];
  const appended = ['first', 'third'];
  // label, initial inputs, host count, selected action, visible light/projection/host, reordered collections, row ids
  const cases = [
    ['initial', true, 0, '', true, true, true, false, original],
    ['source-update', false, 0, '', true, true, true, false, original],
    ['host-scope-update', false, 1, '', true, true, true, false, original],
    ['projection-source-event', false, 1, 'accept', true, true, true, false, original],
    ['retained-controller-hidden', false, 1, 'accept', false, true, true, false, original],
    ['projection-controller-hidden', false, 1, 'accept', false, false, true, false, original],
    ['reordered-light-projections-hosts', false, 1, 'accept', false, false, true, true, reversed],
    ['conditional-host-hidden', false, 1, 'accept', false, false, false, true, reversed],
    ['repeated-host-removed', false, 1, 'accept', false, false, false, true, removed],
    ['repeated-host-created', false, 1, 'accept', false, false, false, true, appended],
    ['retained-controller-restored', false, 1, 'accept', true, false, false, true, appended],
    ['projection-controller-restored', false, 1, 'accept', true, true, false, true, appended],
    ['conditional-host-restored', false, 1, 'accept', true, true, true, true, appended],
    ['reordered-projection-event', false, 1, 'cancel', true, true, true, true, appended],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, initial, count, selected, lightVisible, projectionVisible, conditionalVisible, reordered, cardIds]] of cases.entries()) {
    const checkpoint = transcript.semantic.checkpoints[index]!;
    assert.equal(checkpoint.label, label);
    const observed = checkpoint.observation;
    if (observed.kind !== 'explicit-shadow') throw new Error(`Unexpected observation at '${label}'.`);
    const message = initial ? 'alpha' : 'bravo';
    const suffix = initial ? 'omega' : 'sigma';
    const items = reordered ? ['two', 'one', 'three'] : ['one', 'two'];
    const expectedCards = [
      ordinaryCard(message, suffix, count, lightVisible, projectionVisible, items, reordered),
      ...(conditionalVisible ? [conditionalCard(message, count)] : []),
      ...cardIds.map((id, row) => repeatedCard(id, row, message, id === 'first' ? count : 0)),
      fallbackCard,
    ];
    assert.deepEqual(observed.live, [{ id: 'message', value: message }, { id: 'suffix', value: suffix }]);
    assert.equal(observed.model.selected, selected);
    assert.equal(observed.model.afterHosts, `${message}:${suffix}:after`);
    assert.deepEqual(observed.model.cards.map(({ lightTextNodes: _lightTextNodes, ...card }) => card), expectedCards,
      `${transcript.lane} ${label}`);
    for (const card of observed.model.cards) {
      if (card.id === 'ordinary') {
        assert.deepEqual(card.lightTextNodes.map(value => value.trim()).filter(value => value !== ''),
          [message, ':direct', message, ':adjacent-left', suffix, ':adjacent-right']);
        assert.ok(card.lightTextNodes.some(value => value.includes('\n')),
          'Whitespace around extracted contributors remains authored light text.');
      }
    }
  }
}

type ExpectedCard = Omit<ShadowCardObservation, 'lightTextNodes'>;

function ordinaryCard(message: string, suffix: string, count: number, lightVisible: boolean,
  projectionVisible: boolean, items: readonly string[], reordered: boolean): ExpectedCard {
  const leading = [`#text:${message}`, '#text::direct'];
  const adjacent = [`#text:${message}`, '#text::adjacent-left', `#text:${suffix}`, '#text::adjacent-right'];
  const native = [`em:${message}:native-first`, ...(lightVisible ? [`strong:${message}:native-if`] : []),
    ...items.map((item, index) => `p:${index}:${item}:${message}`)];
  const defaultSlot = [...leading, ...adjacent, `span:${message}:default`, `small:${message}:tail`];
  return {
    id: 'ordinary', heading: `${message}:${count}`,
    light: [...leading, native[0]!, ...adjacent, `span:${message}:default`, ...native.slice(1), `small:${message}:tail`],
    authoredComments: ['retained-light'],
    projection: [`b:${message}:projected:${message}:${count}`,
      ...(projectionVisible ? [`i:conditional:${message}:${message}`] : []), `u:${message}:last`],
    actions: (reordered ? ['cancel', 'accept'] : ['accept', 'cancel']).map(action => `button:${action}:${message}:${count}`),
    native, default: defaultSlot, nativeFlattened: native, defaultFlattened: defaultSlot,
    boundTitles: [message, message], ownership: true,
  };
}

function conditionalCard(message: string, count: number): ExpectedCard {
  const native = [`span:${message}:conditional-native`];
  const defaultSlot = [`small:${message}:conditional-default`];
  return {
    id: 'conditional', heading: `conditional-${message}:${count}`, light: [...native, ...defaultSlot], authoredComments: [],
    projection: [`b:${message}:conditional:conditional-${message}`], actions: [`i:conditional-${message}:actions-fallback`],
    native, default: defaultSlot, nativeFlattened: native, defaultFlattened: defaultSlot, boundTitles: [], ownership: true,
  };
}

function repeatedCard(id: string, index: number, message: string, count: number): ExpectedCard {
  const label = id[0]!.toUpperCase() + id.slice(1);
  const native = [`span:${index}:${label}:${message}`];
  const defaultSlot = [`em:${id}:default`];
  return {
    id: `card-${id}`, heading: `${label}:${count}`, light: [...native, ...defaultSlot], authoredComments: [],
    projection: [`strong:${label}:${label}:${count}`], actions: [`i:${label}:actions-fallback`],
    native, default: defaultSlot, nativeFlattened: native, defaultFlattened: defaultSlot, boundTitles: [], ownership: true,
  };
}

const fallbackCard: ExpectedCard = {
  id: 'fallback', heading: 'empty:0', light: [], authoredComments: [], projection: ['b:empty:heading-fallback'],
  actions: ['i:empty:actions-fallback'], native: [], default: [], nativeFlattened: ['mark:empty:native-fallback'],
  defaultFlattened: ['mark:empty:default-fallback'], boundTitles: [], ownership: true,
};
