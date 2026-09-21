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
    readonly textEdits: string | null;
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
    readonly svgScriptExecutions: number;
    readonly voidChild: { readonly parent: string; readonly text: string; readonly stamp: string | null };
    readonly markup: {
      readonly transformations: string | null;
      readonly tableBodies: number;
      readonly rows: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly title: { readonly text: string; readonly stamp: string | null };
      readonly body: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly readback: { readonly text: string; readonly stage: string | null };
      readonly scripts: number;
    };
    readonly copies: {
      readonly identities: string | null;
      readonly shallow: { readonly text: string; readonly stamp: string | null; readonly snapshot: string | null };
      readonly sourceSnapshot: string | null;
      readonly templateRows: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly title: { readonly text: string; readonly stamp: string | null };
      readonly rows: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly text: readonly string[];
      readonly comments: number;
    };
    readonly generated: {
      readonly factories: string | null;
      readonly title: string | null;
      readonly stamp: string | null;
      readonly authored: { readonly parent: string; readonly text: string; readonly stamp: string | null };
      readonly rows: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly projectionTitle: { readonly text: string; readonly stamp: string | null };
      readonly projectionBody: readonly { readonly text: string; readonly stamp: string | null }[];
      readonly local: { readonly text: string; readonly stamp: string | null };
      readonly slotFallback: { readonly text: string; readonly stamp: string | null };
      readonly slotRejected: number;
      readonly fragmentText: readonly string[];
      readonly comments: number;
      readonly discarded: number;
      readonly clearedChildren: number;
    };
  };
}

declare global {
  interface Window {
    contentMovesFixture?: { stop(): Promise<void> };
    contentMovesScriptRuns?: number;
    contentMovesSvgScriptRuns?: number;
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
    const generated = root.querySelector('#generated-wrapper')!;
    const authored = root.querySelector('#generated-authored')!;
    const generatedTitle = root.querySelector('#generated-card header b')!;
    const generatedLocal = root.querySelector('#generated-let-value')!;
    const generatedFallback = root.querySelector('#generated-slot-fallback')!;
    const copies = root.querySelector('#copied-wrapper')!;
    const shallow = copies.querySelector('#shallow-copy')!;
    const copiedTitle = copies.querySelector('.copied-title')!;
    const markup = root.querySelector('#markup-wrapper')!;
    const parsedTitle = markup.querySelector('#parsed-card header b')!;
    const readback = markup.querySelector('#markup-readback b')!;
    return {
      kind: 'content-moves',
      live: [{ id: input.id, value: input.value }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        message: root.querySelector('#message-value')!.textContent,
        returns: lab.getAttribute('data-return-values'),
        order: lab.getAttribute('data-order'),
        documents: lab.getAttribute('data-document-adoption'),
        textEdits: lab.getAttribute('data-text-edits'),
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
        svgScriptExecutions: window.contentMovesSvgScriptRuns ?? 0,
        voidChild: {
          parent: root.querySelector('#void-child')!.parentElement!.id,
          text: root.querySelector('#void-child')!.textContent,
          stamp: root.querySelector('#void-child')!.getAttribute('data-stamped'),
        },
        markup: {
          transformations: lab.getAttribute('data-markup'),
          tableBodies: markup.querySelectorAll('#markup-table > tbody').length,
          rows: Array.from(markup.querySelectorAll('#markup-table td'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          title: { text: parsedTitle.textContent, stamp: parsedTitle.getAttribute('data-stamped') },
          body: Array.from(markup.querySelectorAll('.parsed-body'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          readback: { text: readback.textContent, stage: readback.getAttribute('data-stage') },
          scripts: markup.querySelectorAll('#parsed-script').length,
        },
        copies: {
          identities: lab.getAttribute('data-copies'),
          shallow: { text: shallow.textContent, stamp: shallow.getAttribute('data-stamped'), snapshot: shallow.getAttribute('data-copy-state') },
          sourceSnapshot: root.querySelector('#first')!.getAttribute('data-copy-state'),
          templateRows: Array.from(copies.querySelectorAll('.copied-template-row'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          title: { text: copiedTitle.textContent, stamp: copiedTitle.getAttribute('data-stamped') },
          rows: Array.from(copies.querySelectorAll('.copied-row'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          text: Array.from(copies.childNodes).filter((node) => node.nodeType === 3).map((node) => node.textContent!),
          comments: Array.from(copies.childNodes).filter((node) => node.nodeType === 8 && node.textContent === 'copied-content').length,
        },
        generated: {
          factories: lab.getAttribute('data-factories'),
          title: generated.getAttribute('title'),
          stamp: generated.getAttribute('data-stamped'),
          authored: { parent: authored.parentElement!.id, text: authored.textContent, stamp: authored.getAttribute('data-stamped') },
          rows: Array.from(generated.querySelectorAll('.generated-row'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          projectionTitle: { text: generatedTitle.textContent, stamp: generatedTitle.getAttribute('data-stamped') },
          projectionBody: Array.from(generated.querySelectorAll('.generated-body'), (element) => ({ text: element.textContent, stamp: element.getAttribute('data-stamped') })),
          local: { text: generatedLocal.textContent, stamp: generatedLocal.getAttribute('data-stamped') },
          slotFallback: { text: generatedFallback.textContent, stamp: generatedFallback.getAttribute('data-stamped') },
          slotRejected: generated.querySelectorAll('#generated-slot-rejected-first, #generated-slot-rejected-second').length,
          fragmentText: Array.from(generated.childNodes).filter((node) => node.nodeType === 3).map((node) => node.textContent!),
          comments: Array.from(generated.childNodes).filter((node) => node.nodeType === 8 && node.textContent === 'generated-content').length,
          discarded: root.querySelectorAll('#generated-discarded').length,
          clearedChildren: root.querySelector('#generated-cleared')!.childNodes.length,
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
          textEdits: 'true:true:true:true:true:true',
          source: ['second'],
          target: ['replacement', 'first', 'moved-card', 'adopted', 'text-moves', 'moved-script', 'void-parent', 'generated-wrapper', 'copied-wrapper', 'markup-wrapper'],
          values: [
            { id: 'replacement', text: `replacement:${message.length}`, stamp: null },
            { id: 'first', text: `first:${message.toUpperCase()}`, stamp: message },
            { id: 'second', text: `second:${message}`, stamp: null },
            { id: 'adopted', text: `adopted:${message}`, stamp: message },
            { id: 'text-moves', text: `after:${message.length}before:${message}separator`, stamp: null },
          ],
          cards: [`card:${message}`, `card:${message}`, `card:${message}`, `card:${message}`, `card:${message}`],
          title: { text: `title:${message}`, stamp: message },
          rows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `${item}:${message}`, stamp: message })) : [],
          discarded: 0,
          donorChildren: 0,
          titleFallbacks: 1,
          scriptExecutions: 0,
          svgScriptExecutions: 1,
          voidChild: { parent: 'void-parent', text: `void:${message}`, stamp: message },
          markup: {
            transformations: 'true:true:true:true:true:true',
            tableBodies: active ? 1 : 0,
            rows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `markup:${item}:${message}`, stamp: message })) : [],
            title: { text: `parsed-title:${message}`, stamp: message },
            body: active ? [{ text: `parsed-body:${message}`, stamp: message }] : [],
            readback: { text: `readback & ${message.toUpperCase()}`, stage: '<after>' },
            scripts: 1,
          },
          copies: {
            identities: 'true:true:true:true:true:true:true:true:true:true:true',
            shallow: { text: `shallow:${message}`, stamp: message, snapshot: 'before' },
            sourceSnapshot: 'after',
            templateRows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `generated:${item}:${message.toUpperCase()}`, stamp: message })) : [],
            title: { text: `title:${message}`, stamp: message },
            rows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `${item}:${message}`, stamp: message })) : [],
            text: ['after:', String(message.length)],
            comments: 1,
          },
          generated: {
            factories: 'true:true:true:true',
            title: message,
            stamp: message,
            authored: { parent: 'generated-wrapper', text: `authored:${message}`, stamp: message },
            rows: active ? ['one', 'two', 'three'].slice(0, count).map((item) => ({ text: `generated:${item}:${message.toUpperCase()}`, stamp: message })) : [],
            projectionTitle: { text: `generated-title:${message}`, stamp: message },
            projectionBody: active ? [{ text: `generated-body:${message}`, stamp: message }] : [],
            local: { text: `let:${message}-local`, stamp: `${message}-local` },
            slotFallback: { text: `fallback:${message}`, stamp: message },
            slotRejected: 0,
            fragmentText: ['fragment:', String(message.length)],
            comments: 1,
            discarded: 0,
            clearedChildren: 0,
          },
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
