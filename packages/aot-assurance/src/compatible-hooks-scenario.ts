/* global window, document, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript } from './contract.js';

export interface CompatibleHooksApplicationObservation {
  readonly kind: 'compatible-hooks';
  readonly live: readonly [];
  readonly focus: null;
  readonly model: {
    readonly root: string | null;
    readonly runtime: string | null;
    readonly late: string | null;
    readonly passes: string | null;
    readonly width: string | null;
    readonly standaloneNote: string | null;
    readonly hookCalls: number;
    readonly lateTemplate: string;
  };
}

declare global {
  interface Window {
    hybridFixture?: {
      activate(): void;
      hide(): void;
      update(): void;
      hookState(): { calls: number; lateTemplate: string };
      stop(): Promise<void>;
    };
  }
}

/** The ordinary two-lane harness owns builds, browser lifetime, transcripts and parity. */
export async function runCompatibleHooksLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.hybridFixture != null, undefined, { timeout: 15_000 });
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await settle(page);
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('before-lazy-compilation');
    await page.evaluate(() => window.hybridFixture!.activate());
    await checkpoint('runtime-hook-and-projection');
    await page.evaluate(() => window.hybridFixture!.update());
    await checkpoint('root-and-rewritten-template-updates');
    await page.evaluate(() => window.hybridFixture!.hide());
    await checkpoint('cached-view-hidden');
    await page.evaluate(() => window.hybridFixture!.activate());
    await checkpoint('cached-view-reactivated');
    await page.evaluate(() => window.hybridFixture!.stop());
    assert.equal(await page.locator('compatible-app').evaluate((host) => host.childNodes.length), 0);
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally {
    await context.close();
  }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function capture(page: Page): Promise<CompatibleHooksApplicationObservation> {
  return page.evaluate(() => ({
    kind: 'compatible-hooks',
    live: [],
    focus: null,
    model: {
      root: document.querySelector('.root-value')?.textContent ?? null,
      runtime: document.querySelector('.runtime-value')?.textContent ?? null,
      late: document.querySelector('.late-target-value')?.textContent ?? null,
      passes: document.querySelector('dynamic-gate')?.getAttribute('data-passes') ?? null,
      width: document.querySelector('dynamic-gate')?.getAttribute('data-width') ?? null,
      standaloneNote: document.querySelector('.standalone-note')?.textContent ?? null,
      hookCalls: window.hybridFixture!.hookState().calls,
      lateTemplate: window.hybridFixture!.hookState().lateTemplate,
    },
  }));
}

export function assertCompatibleHooksBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'compatible');
  assert.equal(evidence.compilation.fallbackScope, 'application');
  assert.deepEqual(evidence.artifacts, []);
  assert.deepEqual(evidence.compilation.preserved.map((resource) => resource.resourceName).sort(), [
    'compatible-app', 'dynamic-gate', 'late-target', 'runtime-page',
  ]);
  assert.deepEqual(evidence.compilation.preserved.filter((resource) => resource.disposition === 'unsupported-hook')
    .map((resource) => resource.resourceName), ['runtime-page']);
}

export function assertCompatibleHooksExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const expected = [
    ['before-lazy-compilation', 'before', false],
    ['runtime-hook-and-projection', 'before', true],
    ['root-and-rewritten-template-updates', 'after', true],
    ['cached-view-hidden', 'after', false],
    ['cached-view-reactivated', 'after', true],
  ] as const;
  assert.equal(transcript.semantic.checkpoints.length, expected.length);
  for (const [index, [label, message, visible]] of expected.entries()) {
    const triggered = index > 0;
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'compatible-hooks', live: [], focus: null,
        model: {
          root: message,
          runtime: visible ? message : null,
          late: visible ? `rewritten:${message.toUpperCase()}` : null,
          passes: visible ? '1' : null,
          width: visible ? '0' : null,
          standaloneNote: '<em>Standalone template material: ${message}</em>',
          hookCalls: triggered ? 1 : 0,
          lateTemplate: triggered
            ? '<section class="late-target-value"><strong>rewritten:${message.toUpperCase()}</strong></section>'
            : '<span class="late-target-value">original:${message}</span>',
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
