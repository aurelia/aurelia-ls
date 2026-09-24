/* global window, document, HTMLElement, HTMLSelectElement, HTMLInputElement, HTMLButtonElement, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

export interface LocalizedFormApplicationObservation {
  readonly kind: 'localized-form';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly heading: string;
    readonly requestLabel: string;
    readonly translatedTitles: readonly string[];
    readonly summary: string;
    readonly submitted: string;
    readonly contactPreference: string;
    readonly submitText: string;
    readonly submitTitle: string;
  };
}

declare global {
  interface Window {
    __localizedFormAssurance?: {
      readonly ready: boolean;
      setLocale(locale: string): Promise<void>;
      stop(): Promise<void>;
    };
  }
}

export async function runLocalizedFormLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__localizedFormAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} localized form did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    const originalForm = await page.locator('state-backed-form form').elementHandle();
    assert.ok(originalForm != null);
    await page.locator('button[type="submit"]').click();
    await checkpoint('submitted');
    await page.locator('#title-key').selectOption('app.history');
    await checkpoint('key-change');
    await page.locator('#request-selector').selectOption('request-2');
    await checkpoint('request-change');
    await page.evaluate(() => window.__localizedFormAssurance!.setLocale('de'));
    await checkpoint('locale-change');
    await page.locator('button[type="submit"]').click();
    await checkpoint('translated-submission');
    await page.locator('#title-key').selectOption('app.title');
    await page.evaluate(() => window.__localizedFormAssurance!.setLocale('en'));
    await checkpoint('restored-locale-and-key');
    assert.equal(await page.evaluate(form => document.querySelector('state-backed-form form') === form, originalForm), true,
      `${lane} locale, key and parameter changes must update the existing form`);
    await page.evaluate(() => window.__localizedFormAssurance!.stop());
    assert.equal(await page.locator('app-root').evaluate(host => host.childNodes.length), 0);
    assert.equal(await originalForm.evaluate(form => form.isConnected), false);
    await originalForm.dispose();
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function capture(page: Page): Promise<LocalizedFormApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('app-root')!;
    const titleKey = root.querySelector<HTMLSelectElement>('#title-key')!;
    const request = root.querySelector<HTMLSelectElement>('#request-selector')!;
    const customerName = root.querySelector<HTMLInputElement>('#customer-name')!;
    const form = root.querySelector('state-backed-form form')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    return {
      kind: 'localized-form',
      live: [
        { id: titleKey.id, value: titleKey.value },
        { id: request.id, value: request.value },
        { id: customerName.id, value: customerName.value },
      ],
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        heading: root.querySelector('h1')!.textContent,
        requestLabel: root.querySelector('label[for="request-selector"]')!.textContent,
        translatedTitles: Array.from(root.querySelectorAll('#translated-titles p'), element => element.textContent),
        summary: form.querySelector('p')!.textContent,
        submitted: root.querySelector('#submitted-count')!.textContent,
        contactPreference: form.querySelector('legend')!.textContent,
        submitText: submit.textContent,
        submitTitle: submit.title,
      },
    };
  });
}

export function assertLocalizedFormBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName).sort(), ['app-root', 'field-shell', 'state-backed-form']);
}

export function assertLocalizedFormExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const cases: readonly [string, 'en' | 'de', 'title' | 'history', number, number, string | null][] = [
    ['initial', 'en', 'title', 1, 0, null],
    ['submitted', 'en', 'title', 1, 1, null],
    // selectOption dispatches input/change without moving native focus from the submit button.
    ['key-change', 'en', 'history', 1, 1, null],
    ['request-change', 'en', 'history', 2, 1, null],
    ['locale-change', 'de', 'history', 2, 1, null],
    ['translated-submission', 'de', 'history', 2, 2, null],
    ['restored-locale-and-key', 'en', 'title', 2, 2, null],
  ];
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, locale, key, request, count, focus]] of cases.entries()) {
    const german = locale === 'de';
    const heading = german ? 'Serviceanfrage' : 'Service Request';
    const title = key === 'title' ? heading : german ? 'Anfragenverlauf' : 'Request history';
    const submit = german ? 'Anfrage senden' : 'Submit request';
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'localized-form',
        live: [
          { id: 'title-key', value: `app.${key}` },
          { id: 'request-selector', value: `request-${request}` },
          { id: 'customer-name', value: request === 1 ? 'Ada Lovelace' : 'Grace Hopper' },
        ],
        focus,
        model: {
          heading,
          requestLabel: heading,
          translatedTitles: [title, title, title, title],
          summary: german ? `Anfrage request-${request} bearbeiten` : `Editing request request-${request}`,
          submitted: german ? `Einreichungen: ${count}` : `Submissions: ${count}`,
          contactPreference: german ? 'Kontaktpräferenz' : 'Contact preference',
          submitText: submit,
          submitTitle: submit,
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
