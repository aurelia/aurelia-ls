/* global window, document, HTMLElement, HTMLInputElement, requestAnimationFrame */
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript, LiveElementTranscript } from './contract.js';

interface ComposedWidgetObservation {
  readonly hostId: string | null;
  readonly hostClass: string | null;
  readonly message: string;
  readonly model: string;
  readonly activations: string;
  readonly bindableId: string | null;
  readonly fallback: string | null;
}

export interface CeCompositionApplicationObservation {
  readonly kind: 'ce-composition';
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
  readonly model: {
    readonly chart: ComposedWidgetObservation;
    readonly inventory: ComposedWidgetObservation;
    readonly projectedMessage: string;
    readonly declaringMessage: string;
    readonly suppliedResource: string;
    readonly suppliedTitle: string | null;
    readonly fallbackResource: string;
    readonly fallbackTitle: string | null;
    readonly receivingMessages: readonly string[];
  };
}

declare global {
  interface Window {
    __ceCompositionAssurance?: { readonly ready: boolean; stop(): Promise<void> };
  }
}

export async function runCeCompositionLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__ceCompositionAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} custom-element composition application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    const chart = await page.locator('chart-widget').elementHandle();
    const inventory = await page.locator('inventory-widget').elementHandle();
    const projectedInput = await page.locator('#projected-message').elementHandle();
    const suppliedResource = await page.locator('[data-case="supplied"] scoped-compose-widget').elementHandle();
    const fallbackResource = await page.locator('[data-case="fallback"] scoped-compose-widget').elementHandle();
    assert.ok(chart != null && inventory != null && projectedInput != null && suppliedResource != null && fallbackResource != null);
    await page.locator('#parent-message').fill('bravo');
    await page.locator('#host-id').fill('second-host');
    await checkpoint('parent-and-capture-update');
    await page.locator('#projected-message').fill('charlie');
    await checkpoint('projected-writeback');
    await page.locator('#replace-model').click();
    await checkpoint('model-replacement');
    assert.equal(await page.evaluate(({ chart, inventory, projectedInput, suppliedResource, fallbackResource }) =>
      document.querySelector('chart-widget') === chart
      && document.querySelector('inventory-widget') === inventory
      && document.querySelector('#projected-message') === projectedInput
      && document.querySelector('[data-case="supplied"] scoped-compose-widget') === suppliedResource
      && document.querySelector('[data-case="fallback"] scoped-compose-widget') === fallbackResource,
    { chart, inventory, projectedInput, suppliedResource, fallbackResource }), true, `${lane} model updates must retain composed hosts and projection`);
    await page.evaluate(() => window.__ceCompositionAssurance!.stop());
    assert.equal(await page.locator('ce-composition-app').evaluate(host => host.childNodes.length), 0);
    for (const node of [chart, inventory, projectedInput, suppliedResource, fallbackResource]) {
      assert.equal(await node.evaluate(element => element.isConnected), false);
      await node.dispose();
    }
    return { lane, semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors }, probes: null };
  } finally { await context.close(); }
}

async function capture(page: Page): Promise<CeCompositionApplicationObservation> {
  return page.evaluate(() => {
    const root = document.querySelector('ce-composition-app')!;
    const widget = (selector: string): ComposedWidgetObservation => {
      const host = root.querySelector(selector)!;
      return {
        hostId: host.getAttribute('id'),
        hostClass: host.getAttribute('class'),
        message: host.querySelector('.message')!.textContent,
        model: host.querySelector('.model')!.textContent,
        activations: host.querySelector('.activations')!.textContent,
        bindableId: host.querySelector('.bindable-id')?.textContent ?? null,
        fallback: host.querySelector('.fallback-content')?.textContent ?? null,
      };
    };
    return {
      kind: 'ce-composition',
      live: ['parent-message', 'host-id', 'projected-message'].map(id => ({
        id, value: root.querySelector<HTMLInputElement>(`#${id}`)!.value,
      })),
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: {
        chart: widget('chart-widget'),
        inventory: widget('inventory-widget'),
        projectedMessage: root.querySelector('.projected-message')!.textContent,
        declaringMessage: root.querySelector('.declaring-message')!.textContent,
        suppliedResource: root.querySelector('[data-case="supplied"] .scope-label')!.textContent,
        suppliedTitle: root.querySelector('[data-case="supplied"] scoped-compose-widget')!.getAttribute('title'),
        fallbackResource: root.querySelector('[data-case="fallback"] .scope-label')!.textContent,
        fallbackTitle: root.querySelector('[data-case="fallback"] scoped-compose-widget')!.getAttribute('title'),
        receivingMessages: Array.from(root.querySelectorAll('composition-shell h2'), element => element.textContent),
      },
    };
  });
}

export function assertCeCompositionBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.analysisCount, 2, 'composition captures require the conditional deeper inquiry');
  assert.deepEqual(evidence.analysis, { depth: 'binding-observation', templateBreadth: 'app-aggregate' });
  assert.equal(evidence.compilation.mode, 'strict');
  assert.equal(evidence.compilation.fallbackScope, 'none');
  assert.deepEqual(evidence.artifacts.map(artifact => artifact.definitionName).sort(), [
    'ce-composition-app', 'chart-widget', 'composition-shell', 'inventory-widget',
    'scoped-compose-widget', 'scoped-compose-widget',
  ]);
  const scopedArtifacts = evidence.artifacts.filter(artifact => artifact.definitionName === 'scoped-compose-widget');
  assert.equal(new Set(scopedArtifacts.map(artifact => artifact.sourceId)).size, 2,
    'same-named scoped resources must retain separate compiled source identities');
  for (const module of evidence.runtimeConfiguration.modules) {
    assert.deepEqual(module.registrations.resources, {
      kind: 'conservative-group',
      group: { moduleSpecifier: '@aurelia/runtime-html', exportName: 'DefaultResources' },
    }, 'compiler-only capture plans retain resources until their expression-resource lifecycle demand is modeled');
    assert.equal(module.registrations.renderers.kind, 'exact-leaves');
    if (module.registrations.renderers.kind === 'exact-leaves') {
      assert.deepEqual(module.registrations.renderers.leaves.map(leaf => leaf.exportName).sort(), [
        'CustomElementRenderer', 'ListenerBindingRenderer', 'PropertyBindingRenderer',
        'SetClassAttributeRenderer', 'SetPropertyRenderer', 'TextBindingRenderer',
      ]);
    }
    assert.equal(module.registrations.eventModifier, null);
  }
}

export function assertCeCompositionExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const cases: readonly [string, string, string, boolean, string | null][] = [
    ['initial', 'alpha', 'first-host', false, null],
    ['parent-and-capture-update', 'bravo', 'second-host', false, 'host-id'],
    ['projected-writeback', 'charlie', 'second-host', false, 'projected-message'],
    ['model-replacement', 'charlie', 'second-host', true, 'replace-model'],
  ];
  assert.equal(transcript.semantic.checkpoints.length, cases.length);
  for (const [index, [label, message, id, replaced, focus]] of cases.entries()) {
    const model = replaced ? 'Updated dashboard / 2' : 'Initial dashboard / 1';
    const activations = replaced ? '2' : '1';
    assert.deepEqual(transcript.semantic.checkpoints[index], {
      label,
      observation: {
        kind: 'ce-composition',
        live: [{ id: 'parent-message', value: message }, { id: 'host-id', value: id }, { id: 'projected-message', value: message }],
        focus,
        model: {
          chart: { hostId: id, hostClass: 'composed-card', message, model, activations, bindableId: null, fallback: null },
          inventory: { hostId: null, hostClass: 'composed-card', message, model, activations, bindableId: id, fallback: 'Inventory fallback' },
          projectedMessage: message,
          declaringMessage: message,
          suppliedResource: 'declaring composition resource',
          suppliedTitle: message,
          fallbackResource: 'receiving composition resource',
          fallbackTitle: 'receiver-owned title',
          receivingMessages: ['receiver-owned message', 'receiver-owned message'],
        },
      },
    }, `${transcript.lane} ${label}`);
  }
}
