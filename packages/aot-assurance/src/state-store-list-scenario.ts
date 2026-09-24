/* global window, document, HTMLElement, HTMLInputElement, HTMLButtonElement, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

export interface StateStoreListApplicationObservation {
  readonly kind: 'state-store-list';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly title: string;
    readonly filterLabel: string;
    readonly addDisabled: boolean;
    readonly tasks: readonly string[];
  };
}

declare global {
  interface Window {
    __stateStoreListAssurance?: { readonly ready: boolean; stop(): Promise<void> };
  }
}

export async function runStateStoreListLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__stateStoreListAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} state-store-list application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    const originalRow = await page.locator('li').first().elementHandle();
    assert.ok(originalRow != null);
    await page.locator('#draft-task').fill('  Verify AOT  ');
    await checkpoint('default-dispatch');
    await page.locator('#show-completed').check();
    await checkpoint('named-dispatch');
    await page.locator('#add-task').click();
    await checkpoint('repeat-growth-and-draft-reset');
    await page.locator('#draft-task').fill('Ship state bridge');
    await page.locator('#add-task').click();
    await checkpoint('second-default-dispatch');
    assert.equal(await page.evaluate(row => document.querySelector('li') === row, originalRow), true,
      `${lane} adding tasks must retain the original repeated row`);
    await page.locator('#show-completed').uncheck();
    await checkpoint('named-reset');
    await page.evaluate(() => window.__stateStoreListAssurance!.stop());
    assert.equal(await page.locator('app-root').evaluate(host => host.childNodes.length), 0);
    assert.equal(await originalRow.evaluate(row => row.isConnected), false);
    await originalRow.dispose();
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function capture(page: Page): Promise<StateStoreListApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('app-root')!;
    const draft = root.querySelector<HTMLInputElement>('#draft-task')!;
    const completed = root.querySelector<HTMLInputElement>('#show-completed')!;
    return {
      kind: 'state-store-list',
      live: [{ id: draft.id, value: draft.value }, { id: completed.id, checked: completed.checked }],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        title: root.querySelector('h1')!.textContent,
        filterLabel: root.querySelector('header p')!.textContent,
        addDisabled: root.querySelector<HTMLButtonElement>('#add-task')!.disabled,
        tasks: Array.from(root.querySelectorAll('li span'), task => task.textContent),
      },
    };
  });
}

export function assertStateStoreListBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName), ['app-root']);
}

export function assertStateStoreListExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const initialTasks = ['Review task flow', 'Plan task checks'];
  const cases: readonly [string, string, boolean, string | null, readonly string[]][] = [
    ['initial', '', false, null, initialTasks],
    ['default-dispatch', '  Verify AOT  ', false, 'draft-task', initialTasks],
    ['named-dispatch', '  Verify AOT  ', true, 'show-completed', initialTasks],
    // Clearing the draft disables the focused Add button, so native browser focus leaves it.
    ['repeat-growth-and-draft-reset', '', true, null, [...initialTasks, 'Verify AOT']],
    ['second-default-dispatch', '', true, null, [...initialTasks, 'Verify AOT', 'Ship state bridge']],
    ['named-reset', '', false, 'show-completed', [...initialTasks, 'Verify AOT', 'Ship state bridge']],
  ];
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, draft, completed, focus, tasks]] of cases.entries()) {
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'state-store-list',
        live: [{ id: 'draft-task', value: draft }, { id: 'show-completed', checked: completed }],
        focus,
        model: {
          title: 'State store tasks',
          filterLabel: completed ? 'All tasks' : 'Active tasks',
          addDisabled: draft === '',
          tasks,
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
