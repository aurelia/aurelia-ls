/* global window, document, HTMLElement, HTMLInputElement, HTMLTemplateElement, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

export interface ContentMovesApplicationObservation {
  readonly kind: 'content-moves';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly message: string;
    readonly returns: string | null;
    readonly order: string | null;
    readonly documents: string | null;
    readonly source: readonly string[];
    readonly target: readonly string[];
    readonly values: readonly { readonly id: string; readonly text: string; readonly stamp: string | null }[];
    readonly cards: readonly string[];
    readonly title: { readonly text: string; readonly stamp: string | null };
    readonly rows: readonly { readonly text: string; readonly stamp: string | null }[];
    readonly discarded: number;
    readonly donorChildren: number;
    readonly titleFallbacks: number;
    readonly scriptExecutions: number;
    readonly voidChild: { readonly parent: string; readonly text: string; readonly stamp: string | null };
  };
}

declare global {
  interface Window {
    contentMovesFixture?: { stop(): Promise<void> };
    contentMovesScriptRuns?: number;
  }
}

export async function runContentMovesLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.contentMovesFixture != null, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} content-moves fixture did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('relocated-compiler-input');
    await page.locator('#message-input').fill('bravo');
    await checkpoint('relocated-bindings-update');
    await page.locator('#toggle').click();
    await checkpoint('moved-projection-hidden');
    await page.locator('#append').click();
    await page.locator('#message-input').fill('charlie');
    await checkpoint('moved-projection-mutated-while-hidden');
    await page.locator('#toggle').click();
    await checkpoint('moved-projection-restored');
    await page.evaluate(() => window.contentMovesFixture!.stop());
    assert.equal(await page.locator('content-moves-app').evaluate((host) => host.childNodes.length), 0);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally {
    await context.close();
  }
}

async function capture(page: Page): Promise<ContentMovesApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('content-moves-app')!;
    const lab = root.querySelector('#lab')!;
    const title = root.querySelector('#moved-card header b')!;
    const input = root.querySelector<HTMLInputElement>('#message-input')!;
    return {
      kind: 'content-moves',
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        message: root.querySelector('#message-value')!.textContent,
        returns: lab.getAttribute('data-return-values'),
        order: lab.getAttribute('data-order'),
        documents: lab.getAttribute('data-document-adoption'),
        source: Array.from(root.querySelector('#source')!.children, (element) => element.id),
        target: Array.from(root.querySelector('#target')!.children, (element) => element.id),
        values: ['replacement', 'first', 'second', 'adopted', 'text-moves'].map((id) => {
          const element = root.querySelector(`#${id}`)!;
          return { id, text: element.textContent, stamp: element.getAttribute('data-stamped') };
        }),
        cards: Array.from(root.querySelectorAll('.card-value'), (element) => element.textContent),
        title: { text: title.textContent, stamp: title.getAttribute('data-stamped') },
        rows: Array.from(root.querySelectorAll('.moved-row'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
        discarded: root.querySelectorAll('#discarded').length,
        donorChildren: root.querySelector<HTMLTemplateElement>('#donor')!.content.childNodes.length,
        titleFallbacks: root.querySelectorAll('.title-fallback').length,
        scriptExecutions: window.contentMovesScriptRuns ?? 0,
        voidChild: {
          parent: root.querySelector('#void-child')!.parentElement!.id,
          text: root.querySelector('#void-child')!.textContent,
          stamp: root.querySelector('#void-child')!.getAttribute('data-stamped'),
        },
      },
    };
  });
}

export function assertContentMovesBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map((artifact) => artifact.definitionName).sort(), [
    'content-moves-app', 'move-card', 'move-lab',
  ]);
}

export function assertContentMovesExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const cases = [
    ['relocated-compiler-input', 'alpha', true, 2, null],
    ['relocated-bindings-update', 'bravo', true, 2, 'message-input'],
    ['moved-projection-hidden', 'bravo', false, 2, 'toggle'],
    ['moved-projection-mutated-while-hidden', 'charlie', false, 3, 'message-input'],
    ['moved-projection-restored', 'charlie', true, 3, 'toggle'],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, active, count, focus]] of cases.entries()) {
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'content-moves',
        live: [{ id: 'message-input', value: message }],
        focus,
        model: {
          message,
          returns: 'true:true:true:true',
          order: 'true:true:true:true',
          documents: 'true:false:true:true',
          source: ['second'],
          target: ['replacement', 'first', 'moved-card', 'adopted', 'text-moves', 'moved-script', 'void-parent'],
          values: [
            { id: 'replacement', text: `replacement:${message}`, stamp: null },
            { id: 'first', text: `first:${message}`, stamp: message },
            { id: 'second', text: `second:${message}`, stamp: null },
            { id: 'adopted', text: `adopted:${message}`, stamp: message },
            { id: 'text-moves', text: `after:${message}before:${message}separator`, stamp: null },
          ],
          cards: [`card:${message}`, `card:${message}`],
          title: { text: `title:${message}`, stamp: message },
          rows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `${item}:${message}`, stamp: message })) : [],
          discarded: 0,
          donorChildren: 0,
          titleFallbacks: 1,
          scriptExecutions: 0,
          voidChild: { parent: 'void-parent', text: `void:${message}`, stamp: message },
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
