/* global window, document, HTMLElement, HTMLInputElement, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

interface TabsObservation {
  readonly id: string;
  readonly selection: string | null;
  readonly headers: readonly { readonly text: string; readonly active: boolean }[];
  readonly details: readonly string[];
  readonly rows: readonly string[];
  readonly choices: readonly string[];
  readonly panels: number;
  readonly authoredTabs: number;
}

export interface OrdinaryHooksApplicationObservation {
  readonly kind: 'ordinary-hooks';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly selected: string;
    readonly tabs: readonly TabsObservation[];
  };
}

declare global {
  interface Window {
    __ordinaryHooksAssurance?: { readonly ready: boolean; stop(): Promise<void> };
  }
}

export async function runOrdinaryHooksLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__ordinaryHooksAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} ordinary-hooks application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    const first = await page.locator('#tabs-first').elementHandle();
    assert.ok(first != null);
    await page.locator('#tabs-first .headers button').nth(1).click();
    await checkpoint('rows-active');
    await page.locator('#message').fill('bravo');
    await page.locator('#add-row').click();
    await checkpoint('projected-source-update');
    await page.locator('#add-group').click();
    await checkpoint('repeated-host-created');
    const second = await page.locator('#tabs-second').elementHandle();
    assert.ok(second != null);
    await page.locator('#reorder').click();
    await checkpoint('keyed-host-reorder');
    assert.equal(await page.evaluate(({ first, second }) => {
      const hosts = document.querySelectorAll('ordinary-tabs');
      return hosts[0] === second && hosts[1] === first;
    }, { first, second }), true, `${lane} keyed reorder must retain both tab hosts`);
    await page.locator('#remove').click();
    await checkpoint('repeated-host-removed');
    assert.equal(await first.evaluate(host => host.isConnected), false);
    await page.locator('#toggle').click();
    await page.locator('#message').fill('charlie');
    await checkpoint('source-update-while-hidden');
    assert.equal(await second.evaluate(host => host.isConnected), false);
    await page.locator('#toggle').click();
    await checkpoint('conditional-host-restored');
    await page.locator('#tabs-second .choose').click();
    await checkpoint('projected-source-event');
    await page.evaluate(() => window.__ordinaryHooksAssurance!.stop());
    assert.equal(await page.locator('ordinary-hooks-app').evaluate(host => host.childNodes.length), 0);
    await Promise.all([first.dispose(), second.dispose()]);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function capture(page: Page): Promise<OrdinaryHooksApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('ordinary-hooks-app')!;
    const input = root.querySelector<HTMLInputElement>('#message')!;
    return {
      kind: 'ordinary-hooks',
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        selected: root.querySelector('#selected')!.textContent,
        tabs: Array.from(root.querySelectorAll('ordinary-tabs'), host => ({
          id: host.id,
          selection: host.getAttribute('data-selection'),
          headers: Array.from(host.querySelectorAll('.headers button'), header => ({ text: header.textContent, active: header.classList.contains('active') })),
          details: Array.from(host.querySelectorAll('.details'), node => node.textContent),
          rows: Array.from(host.querySelectorAll('.row'), node => node.textContent),
          choices: Array.from(host.querySelectorAll('.choose'), node => node.textContent),
          panels: host.querySelectorAll('.panels > div').length,
          authoredTabs: host.querySelectorAll('tab').length,
        })),
      },
    };
  });
}

export function assertOrdinaryHooksBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName).sort(), ['ordinary-hooks-app', 'ordinary-tabs']);
}

export function assertOrdinaryHooksExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const tabs = (id: string, name: string, message: string, rows: boolean, count = 2): TabsObservation => ({
    id: `tabs-${id}`,
    selection: '2:0:true',
    headers: [{ text: 'Details', active: !rows }, { text: 'Rows', active: rows }],
    details: rows ? [] : [`${name}:${message}`],
    rows: rows ? ['one', 'two', 'three'].slice(0, count).map(item => `${name}:${item}:${message}`) : [],
    choices: rows ? [] : [`Choose ${name}`],
    panels: 1,
    authoredTabs: 0,
  });
  const cases: readonly [string, string, string | null, readonly TabsObservation[], string][] = [
    ['initial', 'alpha', null, [tabs('first', 'First', 'alpha', false)], ''],
    ['rows-active', 'alpha', null, [tabs('first', 'First', 'alpha', true)], ''],
    ['projected-source-update', 'bravo', 'add-row', [tabs('first', 'First', 'bravo', true, 3)], ''],
    ['repeated-host-created', 'bravo', 'add-group', [tabs('first', 'First', 'bravo', true, 3), tabs('second', 'Second', 'bravo', false)], ''],
    ['keyed-host-reorder', 'bravo', 'reorder', [tabs('second', 'Second', 'bravo', false), tabs('first', 'First', 'bravo', true, 3)], ''],
    ['repeated-host-removed', 'bravo', 'remove', [tabs('second', 'Second', 'bravo', false)], ''],
    ['source-update-while-hidden', 'charlie', 'message', [], ''],
    ['conditional-host-restored', 'charlie', 'toggle', [tabs('second', 'Second', 'charlie', false)], ''],
    ['projected-source-event', 'charlie', null, [tabs('second', 'Second', 'charlie', false)], 'second'],
  ];
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, focus, instances, selected]] of cases.entries()) {
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'ordinary-hooks',
        live: [{ id: 'message', value: message }],
        focus,
        model: { selected, tabs: instances },
      },
    }, `${transcript.lane} ${label}`);
  }
}
