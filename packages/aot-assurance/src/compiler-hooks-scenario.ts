/* global window, document, Element, HTMLElement, HTMLInputElement, HTMLTemplateElement, requestAnimationFrame */

import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

interface RawChildObservation {
  readonly tag: string;
  readonly text: string;
  readonly attributes: readonly (readonly [string, string])[];
  readonly inert: string | null;
}

interface GateObservation {
  readonly name: string;
  readonly id: string;
  readonly title: string | null;
  readonly classes: readonly string[];
  readonly header: string;
  readonly slot: string;
  readonly raw: readonly RawChildObservation[];
}

interface CssObservation {
  readonly kind: string;
  readonly text: string;
  readonly classes: readonly string[];
}

export interface CompilerHooksApplicationObservation {
  readonly kind: 'compiler-hooks';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly gates: readonly GateObservation[];
    readonly css: readonly CssObservation[];
    readonly panelClasses: readonly (readonly string[])[];
    readonly after: string;
  };
}

declare global {
  interface Window {
    __compilerHooksAssurance?: { readonly ready: boolean; stop(): Promise<void> };
  }
}

export async function runCompilerHooksLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__compilerHooksAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} compiler-hooks application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await settle(page);
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    await page.locator('#message').fill('bravo');
    await checkpoint('host-and-compiled-child-update');
    await page.locator('#toggle-active').click();
    await checkpoint('raw-versus-compiled-controllers');
    await page.locator('#append').click();
    await checkpoint('generated-and-skipped-repeat-growth');
    await page.locator('#toggle-visible').click();
    await checkpoint('hook-hosts-hidden');
    await page.locator('#message').fill('charlie');
    await checkpoint('update-while-hidden');
    await page.locator('#toggle-visible').click();
    await checkpoint('hook-hosts-reactivated');
    await page.locator('#toggle-active').click();
    await checkpoint('classes-and-compiled-branches-restored');
    await page.evaluate(() => window.__compilerHooksAssurance!.stop());
    assert.equal(await page.locator('compiler-hooks-app').evaluate(host => host.childNodes.length), 0);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function capture(page: Page): Promise<CompilerHooksApplicationObservation> {
  return page.evaluate(() => {
    const text = (node: Element): string => node.textContent?.replace(/\s+/gu, ' ').trim() ?? '';
    const root = document.querySelector('compiler-hooks-app')!;
    const input = root.querySelector<HTMLInputElement>('#message')!;
    return {
      kind: 'compiler-hooks',
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        gates: Array.from(root.querySelectorAll(':scope > opaque-literal, :scope > opaque-policy, :scope > transparent-gate, :scope > undecided-gate'), gate => ({
          name: gate.localName, id: gate.id, title: gate.getAttribute('title'), classes: [...gate.classList].sort(),
          header: text(gate.querySelector(':scope > header')!),
          slot: text(gate.querySelector(':scope > .gate-slot')!),
          raw: Array.from(gate.children).filter(node => node.localName !== 'header' && !node.classList.contains('gate-slot'))
            .map(node => ({
              tag: node.localName, text: text(node),
              attributes: Array.from(node.attributes, attribute => [attribute.name, attribute.value] as const)
                .sort(([left], [right]) => left.localeCompare(right)),
              inert: node instanceof HTMLTemplateElement ? node.innerHTML : null,
            })),
        })),
        css: Array.from(root.querySelectorAll('[data-css]'), node => ({
          kind: node.getAttribute('data-css')!, text: text(node), classes: [...node.classList].sort(),
        })),
        panelClasses: Array.from(root.querySelectorAll('styled-panel'), panel => [...panel.classList].sort()),
        after: text(root.querySelector('#after-hooks')!),
      },
    };
  });
}

export function assertCompilerHooksBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'compatible');
  assert.equal(evidence.compilation.fallbackScope, 'application');
  assert.deepEqual(evidence.artifacts, []);
  assert.deepEqual(evidence.compilation.preserved.map(resource => resource.resourceName).sort(), [
    'compiler-hooks-app', 'css-child', 'opaque-literal', 'opaque-policy', 'styled-panel', 'transparent-gate', 'undecided-gate',
  ]);
}

export function assertStrictCompilerHooksBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.compilation.preserved, []);
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName).sort(), [
    'compiler-hooks-app', 'css-child', 'opaque-literal', 'opaque-policy', 'styled-panel', 'transparent-gate', 'undecided-gate',
  ]);
}

export function assertCompilerHooksExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const original = ['one', 'two'];
  const grown = ['one', 'two', 'three'];
  const cases = [
    ['initial', 'alpha', true, true, original],
    ['host-and-compiled-child-update', 'bravo', true, true, original],
    ['raw-versus-compiled-controllers', 'bravo', false, true, original],
    ['generated-and-skipped-repeat-growth', 'bravo', false, true, grown],
    ['hook-hosts-hidden', 'bravo', false, false, grown],
    ['update-while-hidden', 'charlie', false, false, grown],
    ['hook-hosts-reactivated', 'charlie', false, true, grown],
    ['classes-and-compiled-branches-restored', 'charlie', true, true, grown],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, active, visible, items]] of cases.entries()) {
    const checkpoint = transcript.semantic.checkpoints[index]!;
    assert.equal(checkpoint.label, label);
    const observed = checkpoint.observation;
    if (observed.kind !== 'compiler-hooks') throw new Error(`Unexpected observation at '${label}'.`);
    assert.deepEqual(observed.live, [{ id: 'message', value: message }]);
    const gates: GateObservation[] = [
      gate('opaque-literal', 'literal', message, message, ['app-local'], literalRaw),
      ...(visible ? [gate('opaque-policy', 'policy', message, message, [], policyRaw)] : []),
      ...items.map(item => gate('opaque-literal', '', item, message, ['repeated-gate'], repeatedRaw)),
      gate('transparent-gate', 'transparent', message, message, [], [],
        (active ? `${message}:compiled` : '') + items.map((item, row) => `${row}:${item}:${message}`).join('')),
      gate('undecided-gate', 'undecided', message, null, [], [], `${message}:void-compiled`),
    ];
    assert.deepEqual(observed.model, {
      gates,
      css: [css('app-static', `${message}:app`, ['app-local', 'global', 'localDone']),
        ...(visible ? panelCss(message, active, items) : [])],
      panelClasses: visible ? [['app-local', 'panel-local']] : [],
      after: `${message}:after`,
    }, `${transcript.lane} ${label}`);
  }
}

function gate(name: string, id: string, value: string, title: string | null,
  classes: readonly string[], raw: readonly RawChildObservation[], slot = `fallback:${value}`): GateObservation {
  return { name, id, title, classes, header: value, slot, raw };
}

function css(kind: string, text: string, classes: readonly string[]): CssObservation { return { kind, text, classes }; }

function panelCss(message: string, active: boolean, items: readonly string[]): readonly CssObservation[] {
  const dynamic = active ? 'panel-active' : 'panel-other';
  return [
    css('panel-static', `${message}:static`, ['global', 'panel-after-local', 'panel-hover', 'panel-local']),
    css('panel-string', `${message}:string`, active ? ['panel-active', 'panel-local'] : ['panel-local', 'panel-other']),
    css('panel-interpolation', `${message}:interpolation`, active ? ['panel-active', 'panel-local'] : ['panel-local', 'panel-other']),
    css('panel-object', `${message}:object`, [dynamic]),
    css('panel-commands', `${message}:commands`, active ? ['panel-active', 'panel-other'] : []),
    // Runtime mapping is one lookup, not successive passes through the shared local hook mapping.
    css('panel-one-pass', `${message}:one-pass`, ['localDone']),
    ...items.map(item => css('panel-row', `${item}:${message}${active ? '' : ':inactive'}`,
      active ? ['global', 'panel-local'] : ['panel-local'])),
    css('child', `child:${message}`, ['global', 'local']),
    css('local-static', `${message}:local`, ['global', 'panel-local']),
    css('local-dynamic', `${message}:local-dynamic`, [dynamic]),
  ];
}

const literalRaw: readonly RawChildObservation[] = [
  // The owning component's CSS hook already ran before processContent declined child compilation.
  { tag: 'p', text: '${message}:raw', attributes: [['class', 'global app-local'], ['if.bind', 'active']], inert: null },
  { tag: 'transparent-gate', text: '${message}:nested-raw', attributes: [['value.bind', 'message']], inert: null },
  { tag: 'template', text: '', attributes: [['au-slot', 'named'], ['repeat.for', 'item of items']], inert: '<b>${item}:inert</b>' },
];
const policyRaw: readonly RawChildObservation[] = [
  { tag: 'p', text: '${message}:policy-raw', attributes: [['if.bind', 'active']], inert: null },
];
const repeatedRaw: readonly RawChildObservation[] = [
  { tag: 'b', text: '${item}:repeat-raw', attributes: [], inert: null },
];
