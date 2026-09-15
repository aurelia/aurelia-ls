/* global window, document, Element, HTMLElement, HTMLButtonElement, HTMLInputElement, HTMLSelectElement, HTMLTemplateElement, customElements, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

interface NativeConstruction {
  readonly kind: 'element' | 'button' | 'other-button';
  readonly role: string | null;
  readonly is: string | null;
  readonly child: string | null;
  readonly connected: boolean;
}

interface NativeConstructionObservation {
  readonly beforeApp: number | null;
  readonly constructors: readonly NativeConstruction[];
  readonly live: readonly string[];
  readonly buttons: readonly { readonly role: string; readonly is: string | null; readonly upgradedAs: string | null }[];
  readonly retained: { readonly upgraded: boolean; readonly platformDocument: boolean; readonly children: number };
}

interface NativeConstructionProbe {
  beforeApp: number | null;
  constructors: NativeConstruction[];
}

export interface ContentAttributesApplicationObservation {
  readonly kind: 'content-attributes';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly message: string;
    readonly native: NativeConstructionObservation;
    readonly host: readonly (readonly [string, string])[];
    readonly order: readonly (readonly [string, string])[];
    readonly orderNamespace: { readonly upper: string | null; readonly lower: string | null; readonly html: string | null };
    readonly input: { readonly title: string | null; readonly valueAttribute: string | null; readonly placeholder: string | null };
    readonly stamped: string | null;
    readonly card: string;
    readonly cardHost: string;
    readonly conditional: string | null;
    readonly rows: readonly string[];
    readonly selection: { readonly multiple: boolean; readonly values: readonly string[]; readonly model: string };
    readonly classes: { readonly value: string | null; readonly tokens: string | null };
    readonly projections: readonly {
      readonly group: string;
      readonly id: string;
      readonly slot: string | null;
      readonly readback: string | null;
      readonly beforeNames: string | null;
      readonly childSlotBefore: string | null;
      readonly title: string | null;
      readonly child: { readonly slot: string | null; readonly stamped: string | null; readonly text: string };
    }[];
    readonly projectionFallbacks: number;
    readonly svg: {
      readonly viewBox: string | null;
      readonly classes: string | null;
      readonly readback: string | null;
      readonly namespaced: readonly (readonly [string, string | null, string])[];
    };
  };
}

declare global {
  interface Window {
    contentAttributesFixture?: { stop(): Promise<void> };
    contentNativeProbe: NativeConstructionProbe;
  }
}

export async function runContentAttributesLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.addInitScript(() => {
      const probe: NativeConstructionProbe = { beforeApp: null, constructors: [] };
      window.contentNativeProbe = probe;
      window.addEventListener('content-attributes:before-app', () => { probe.beforeApp = probe.constructors.length; });
      const record = (element: Element, kind: NativeConstruction['kind']) => probe.constructors.push({
        kind, role: element.getAttribute('data-native'), is: element.getAttribute('is'),
        child: element.firstElementChild?.localName ?? null, connected: element.isConnected,
      });
      customElements.define('native-probe', class extends HTMLElement {
        constructor() { super(); record(this, 'element'); }
      });
      customElements.define('native-button', class extends HTMLButtonElement {
        constructor() { super(); record(this, 'button'); }
      }, { extends: 'button' });
      customElements.define('native-button-other', class extends HTMLButtonElement {
        constructor() { super(); record(this, 'other-button'); }
      }, { extends: 'button' });
    });
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.contentAttributesFixture != null, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} content-attributes fixture did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await settle(page);
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('generated-attribute-families');
    await page.locator('#generated-input').fill('bravo');
    await checkpoint('generated-two-way-writeback');
    await page.locator('#toggle').click();
    await checkpoint('generated-controllers-hidden');
    await page.locator('#append').click();
    await checkpoint('repeat-growth-while-hidden');
    await page.locator('#generated-select').focus();
    await page.locator('#generated-select').selectOption(['a', 'b']);
    await checkpoint('generated-select-multiple-writeback');
    await page.locator('#toggle').click();
    await checkpoint('generated-controllers-restored');
    await page.locator('#generated-input').fill('charlie');
    await checkpoint('restored-bindings-update');
    await page.evaluate(() => window.contentAttributesFixture!.stop());
    assert.equal(await page.locator('content-attributes-app').evaluate((host) => host.childNodes.length), 0);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally {
    await context.close();
  }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function capture(page: Page): Promise<ContentAttributesApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('content-attributes-app')!;
    const input = root.querySelector<HTMLInputElement>('#generated-input')!;
    const select = root.querySelector<HTMLSelectElement>('#generated-select')!;
    const order = root.querySelector('#order-case')!;
    const link = root.querySelector('#svg-link')!;
    const retained = root.querySelector<HTMLTemplateElement>('#native-retained')!.content;
    const isCustom = (element: Element, name: string): boolean => element instanceof customElements.get(name)!;
    const attributes = (element: Element) => Array.from(element.attributes, (attribute) => [attribute.name, attribute.value] as const);
    return {
      kind: 'content-attributes',
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        message: root.querySelector('#message-value')!.textContent,
        native: {
          beforeApp: window.contentNativeProbe.beforeApp,
          constructors: window.contentNativeProbe.constructors,
          live: Array.from(root.querySelectorAll('native-probe'), (element) => element.getAttribute('data-native')!).sort(),
          buttons: Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-native]'), (button) => ({
            role: button.getAttribute('data-native')!, is: button.getAttribute('is'),
            upgradedAs: isCustom(button, 'native-button') ? 'native-button'
              : isCustom(button, 'native-button-other') ? 'native-button-other' : null,
          })),
          retained: {
            upgraded: isCustom(retained.firstElementChild!, 'native-probe'),
            platformDocument: retained.ownerDocument === document,
            children: retained.firstElementChild!.childElementCount,
          },
        },
        host: attributes(root.querySelector('#lab')!),
        order: attributes(order),
        orderNamespace: {
          upper: order.getAttributeNS(null, 'DATA-UPPER'),
          lower: order.getAttributeNS(null, 'data-upper'),
          html: order.getAttribute('DATA-UPPER'),
        },
        input: { title: input.getAttribute('title'), valueAttribute: input.getAttribute('value'), placeholder: input.getAttribute('placeholder') },
        stamped: root.querySelector('#attribute-case')!.getAttribute('data-stamped'),
        card: root.querySelector('.card-value')!.textContent,
        cardHost: root.querySelector('#element-case')!.localName,
        conditional: root.querySelector('#conditional-case')?.textContent ?? null,
        rows: Array.from(root.querySelectorAll('.generated-row'), (row) => row.textContent),
        selection: { multiple: select.multiple, values: Array.from(select.selectedOptions, (option) => option.value), model: root.querySelector('#selected-value')!.textContent },
        classes: { value: root.querySelector('#classes-case')!.getAttribute('class'), tokens: root.querySelector('#classes-case')!.getAttribute('data-tokens') },
        projections: Array.from(root.querySelectorAll('.projection-probe'), (host) => {
          const child = host.querySelector('.projected-value')!;
          return {
            group: host.parentElement!.id,
            id: host.id,
            slot: host.getAttribute('au-slot'),
            readback: host.getAttribute('data-projection-read'),
            beforeNames: host.getAttribute('data-before-names'),
            childSlotBefore: host.getAttribute('data-child-slot-before'),
            title: host.getAttribute('title'),
            child: { slot: child.getAttribute('au-slot'), stamped: child.getAttribute('data-stamped'), text: child.textContent },
          };
        }),
        projectionFallbacks: root.querySelectorAll('.projection-fallback').length,
        svg: {
          viewBox: root.querySelector('#svg-case')!.getAttribute('viewBox'),
          classes: link.getAttribute('class'),
          readback: link.getAttribute('data-namespace-read'),
          namespaced: Array.from(link.attributes).filter((attribute) => attribute.namespaceURI != null)
            .map((attribute) => [attribute.name, attribute.namespaceURI, attribute.value] as const),
        },
      },
    };
  });
}

export function assertContentAttributesBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map((artifact) => artifact.definitionName).sort(), [
    'attribute-card', 'attribute-lab', 'content-attributes-app', 'projection-lab', 'projection-probe',
  ]);
}

export function assertContentAttributesExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const cases = [
    ['generated-attribute-families', 'alpha', true, 2, ['b'], null],
    ['generated-two-way-writeback', 'bravo', true, 2, ['b'], 'generated-input'],
    ['generated-controllers-hidden', 'bravo', false, 2, ['b'], 'toggle'],
    ['repeat-growth-while-hidden', 'bravo', false, 3, ['b'], 'append'],
    ['generated-select-multiple-writeback', 'bravo', false, 3, ['a', 'b'], 'generated-select'],
    ['generated-controllers-restored', 'bravo', true, 3, ['a', 'b'], 'toggle'],
    ['restored-bindings-update', 'charlie', true, 3, ['a', 'b'], 'generated-input'],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, active, count, selection, focus]] of cases.entries()) {
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'content-attributes',
        live: [{ id: 'generated-input', value: message }],
        focus,
        model: {
          message,
          native: expectedNativeConstruction(count, active),
          host: [['id', 'lab'], ['data-host-created', 'yes'], ['class', 'generated-host']],
          order: [
            ['id', 'order-case'], ['data-case', 'order'], ['data-second', 'replaced'], ['data-first', 'readded'],
            ['data-forced', ''], ['data-toggle-result', 'true:false:true'],
            ['DATA-UPPER', 'upper'],
            ['data-namespace-case', 'upper:null:null'],
            ['data-order', 'id|data-case|data-second|data-first|data-forced|data-toggle-result|DATA-UPPER|data-namespace-case'],
          ],
          orderNamespace: { upper: 'upper', lower: null, html: null },
          input: { title: message, valueAttribute: null, placeholder: null },
          stamped: message,
          card: `card:${message}`,
          cardHost: 'div',
          conditional: active ? `conditional:${message}` : null,
          rows: active ? ['one', 'two', 'three'].slice(0, count).filter((item) => item !== 'two').map((item) => `${item}:${message}`) : [],
          // SelectValueObserver preserves existing model members and appends new selections, independently of DOM order.
          selection: { multiple: true, values: selection, model: selection.length === 1 ? 'b' : 'b,a' },
          classes: { value: 'base highlight active', tokens: '3:highlight:true' },
          projections: ([
            ['projection-first', 'projected-first', 'first'],
            ['projection-first', 'projected-flat', 'flat'],
            ['projection-second', 'projected-second', 'second'],
            ...(active ? ['one', 'two', 'three'].slice(0, count).filter((item) => item !== 'two').map((item) => ['projection-second', '', item] as const) : []),
          ] as const).map(([group, id, value]) => ({
            group, id, slot: 'hook-created', readback: 'null:false:null:false',
            beforeNames: `${id === '' ? 'class' : 'id'}|data-projection-read`,
            childSlotBefore: 'authored', title: message,
            child: { slot: null, stamped: message, text: `${value}:${message}` },
          })),
          projectionFallbacks: 0,
          svg: {
            viewBox: '0 0 10 10', classes: 'base highlight active', readback: 'true:#final',
            namespaced: [
              ['xlink:href', 'http://www.w3.org/1999/xlink', '#final'],
              ['xml:lang', 'http://www.w3.org/XML/1998/namespace', 'en'],
            ],
          },
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}

function expectedNativeConstruction(count: number, active: boolean): NativeConstructionObservation {
  const element = (role: string, connected = false): NativeConstruction => ({ kind: 'element', role, is: null, child: 'i', connected });
  return {
    beforeApp: 0,
    // Callback order is observable across element kinds, including later collection growth.
    constructors: [
      element('root'),
      { kind: 'button', role: 'is-remove', is: null, child: 'i', connected: false },
      { kind: 'button', role: 'is-rewrite', is: 'native-button-other', child: 'i', connected: false },
      element('resource'), element('projection'), element('flat-projection'), element('conditional'),
      element('repeat'), element('repeat'),
      element('retained-repeat'), element('retained-repeat', true),
      element('resource', true), element('resource', true),
      ...(count === 3 ? [element('repeat'), element('retained-repeat', true), element('resource', true)] : []),
    ],
    live: [
      ...(active ? ['conditional'] : []), 'flat-projection', 'projection',
      ...Array.from({ length: count }, () => 'repeat'),
      ...Array.from({ length: count + 1 }, () => 'resource'),
      ...Array.from({ length: count }, () => 'retained-repeat'), 'root',
    ],
    buttons: [
      { role: 'is-remove', is: null, upgradedAs: 'native-button' },
      { role: 'is-rewrite', is: 'native-button-other', upgradedAs: 'native-button' },
      { role: 'is-add', is: 'native-button', upgradedAs: null },
    ],
    retained: { upgraded: false, platformDocument: false, children: 1 },
  };
}
