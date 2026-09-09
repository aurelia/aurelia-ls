/* global window, document, Element, HTMLElement, requestAnimationFrame */

import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';

import type { AotBuildEvidence, AssuranceLane, CheckpointTranscript, LaneTranscript } from './contract.js';

export interface BuiltInControllersObservation {
  readonly kind: 'built-in-controllers';
  readonly live: readonly [];
  readonly focus: string | null;
  readonly model: {
    readonly content: readonly string[];
    readonly repeat: readonly string[];
    readonly portal: readonly string[];
    readonly writeback: {
      readonly resolvedProduct: string | null;
      readonly rejectedReason: string | null;
      readonly selectedIds: readonly string[];
    };
  };
}

type ControllerStage = 'collections' | 'replace' | 'branches' | 'restore' | 'pending' | 'resolve' | 'reject';

declare global {
  interface Window {
    __controllerAssurance?: {
      readonly ready: boolean;
      advance(stage: ControllerStage): void;
      readWriteback(): BuiltInControllersObservation['model']['writeback'];
      stop(): Promise<void>;
    };
  }
}

export async function runBuiltInControllersLane(
  browser: Browser,
  lane: AssuranceLane,
  url: string,
): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__controllerAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      throw new Error(`${lane} built-in-controller application did not start\n${pageErrors.join('\n')}`, { cause: error });
    }
    const checkpoints: CheckpointTranscript[] = [];
    const checkpoint = async (label: string): Promise<void> => {
      await settle(page);
      checkpoints.push({ label, observation: await capture(page) });
    };
    await checkpoint('initial');
    // The third repeat owns the fifth and sixth dt: keyed tuple reversal must move these nodes.
    const firstTuple = await page.locator('dl > dt').nth(4).elementHandle();
    const secondTuple = await page.locator('dl > dt').nth(5).elementHandle();
    assert.ok(firstTuple != null && secondTuple != null, 'The initial keyed tuple rows must exist.');
    await page.getByRole('button', { name: 'First product', exact: true }).click();
    await checkpoint('parent-scope-event');

    for (const stage of ['collections', 'replace', 'branches', 'restore'] as const) {
      await page.evaluate(value => window.__controllerAssurance!.advance(value), stage);
      await checkpoint(stage);
      if (stage === 'collections') {
        assert.equal(await page.evaluate(({ first, second }) => {
          const terms = document.querySelectorAll('dl > dt');
          return terms[4] === second && terms[5] === first;
        }, { first: firstTuple, second: secondTuple }), true, `${lane} keyed tuple reversal must reuse both row nodes`);
      }
    }
    await firstTuple.dispose();
    await secondTuple.dispose();
    await page.getByRole('button', { name: 'Replacement', exact: true }).click();
    await checkpoint('rebound-parent-scope-event');

    for (const [stage, label] of [
      ['pending', 'promise-pending'],
      ['resolve', 'promise-resolved'],
      ['pending', 'promise-replaced'],
      ['reject', 'promise-rejected'],
    ] as const) {
      await page.evaluate(value => window.__controllerAssurance!.advance(value), stage);
      await checkpoint(label);
    }

    await page.evaluate(() => window.__controllerAssurance!.stop());
    await checkpoint('stopped');
    return {
      lane,
      semantic: { checkpoints, teardownEvents: null, console: consoleMessages, pageErrors },
      probes: null,
    };
  } finally {
    await context.close();
  }
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolveFrame => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
}

async function capture(page: Page): Promise<BuiltInControllersObservation> {
  return page.evaluate(() => {
    const host = document.querySelector('template-controller-built-ins');
    if (host == null) throw new Error('The built-in-controller fixture host is missing.');
    const text = (element: Element): string => element.textContent?.replace(/\s+/gu, ' ').trim() ?? '';
    const elements = (root: Element | null): readonly string[] => root == null
      ? []
      : Array.from(root.children, element => `${element.localName}:${text(element)}`);
    return {
      kind: 'built-in-controllers',
      live: [] as const,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.localName : null,
      model: {
        content: Array.from(host.children)
          .filter(element => element.localName !== 'dl')
          .map(element => `${element.localName}:${text(element)}`),
        repeat: elements(host.querySelector('dl')),
        portal: Array.from(document.querySelectorAll('body > p'), text),
        writeback: window.__controllerAssurance!.readWriteback(),
      },
    };
  });
}

export function assertBuiltInControllersBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map(artifact => artifact.definitionName).sort(),
    ['template-controller-built-ins-app'],
    'Only the running app belongs to this compilation cohort; authoring-only siblings must stay out.',
  );
}

export function assertBuiltInControllersExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);

  const beforeBranches = ['Typed branch 184', '135', 'TYPED GUARD', 'Property probe', '2 2.4'];
  const afterBranches = ['Service branch', '2026-09-09', '42', 'Book probe', '/download'];
  const initialPromise = ['Second product 14 Second product', 'Second product', 'Second product Second product', 'Loading product'];
  // The let target remains an ordinary one-way binding: changing selectedProduct overwrites carrierResult.
  const replacedPromise = ['Second product 14 Second product', 'Replacement', 'Second product Second product', 'Loading product'];
  const resolvedPromise = ['Async product 13 Async product', 'Async product', 'Async product Async product', 'Loading product'];
  const pendingPromise = ['Loading product', '', '', ''];
  const rejectedPromise = ['Product unavailable', 'Product unavailable', 'Product unavailable', ''];
  const initialSwitch = ['Detail view detail', 'list', 'list', 'list', 'b', 'b', 'b'];
  const otherSwitch = ['Nothing selected other', 'other', 'other', 'other'];
  const restoredSwitch = ['List view list', 'detail', 'detail', 'c', 'c'];

  const first = content('First product', beforeBranches, ['First product', 'Second product'], initialPromise,
    'detail', 'First product', initialSwitch);
  const mutated = content('First product', beforeBranches, ['Third product', 'Second product'], initialPromise,
    'detail', 'First product', initialSwitch);
  const replaced = content('Replacement', beforeBranches, ['Replacement'], replacedPromise,
    'detail', null, initialSwitch);
  const branched = content('Replacement', afterBranches, ['Replacement'], replacedPromise,
    'other', null, otherSwitch);
  const restored = (promise: readonly string[]) => content('Replacement', afterBranches, ['Replacement'], promise,
    'list', 'Replacement', restoredSwitch);
  const expected: readonly [string, readonly string[], readonly string[], string, string | null, readonly string[]][] = [
    ['initial', first, initialRepeat, 'Second product', null, []],
    ['parent-scope-event', first, initialRepeat, 'Second product', null, ['first']],
    ['collections', mutated, mutatedRepeat, 'Second product', null, ['first']],
    ['replace', replaced, replacementRepeat(false), 'Second product', null, ['first']],
    ['branches', branched, replacementRepeat(false), 'Second product', null, ['first']],
    ['restore', restored(replacedPromise), replacementRepeat(true), 'Second product', null, ['first']],
    ['rebound-parent-scope-event', restored(replacedPromise), replacementRepeat(true), 'Second product', null, ['first', 'replacement']],
    ['promise-pending', restored(pendingPromise), replacementRepeat(true), 'Second product', null, ['first', 'replacement']],
    ['promise-resolved', restored(resolvedPromise), replacementRepeat(true), 'Async product', null, ['first', 'replacement']],
    ['promise-replaced', restored(pendingPromise), replacementRepeat(true), 'Async product', null, ['first', 'replacement']],
    ['promise-rejected', restored(rejectedPromise), replacementRepeat(true), 'Async product', 'Product unavailable', ['first', 'replacement']],
    ['stopped', [], [], 'Async product', 'Product unavailable', ['first', 'replacement']],
  ];
  assert.equal(transcript.semantic.checkpoints.length, expected.length);
  for (const [index, [label, expectedContent, repeat, resolvedProduct, rejectedReason, selectedIds]] of expected.entries()) {
    const checkpoint = transcript.semantic.checkpoints[index];
    assert.equal(checkpoint?.label, label);
    const observed = checkpoint?.observation;
    if (observed?.kind !== 'built-in-controllers') throw new Error(`Checkpoint '${label}' is not a controller observation.`);
    assert.deepEqual(observed.model, {
      content: expectedContent,
      repeat,
      portal: label === 'stopped' ? [] : ['Portaled content'],
      writeback: { resolvedProduct, rejectedReason, selectedIds },
    }, `${transcript.lane} ${label}`);
  }
}

function content(
  selected: string,
  branches: readonly string[],
  products: readonly string[],
  promise: readonly string[],
  currentMode: string,
  maybeProduct: string | null,
  switches: readonly string[],
): readonly string[] {
  const scoped = products.map(label => `${label} ${label} Portaled content`);
  return [
    ...[selected, ...branches, `${selected} ${selected.length}`, ...scoped, ...scoped,
      ...promise, 'inline:Inline product', ...products, products[0]!].map(value => `section:${value}`),
    `span:${currentMode}`,
    'section:Loading product',
    ...(maybeProduct == null ? [] : [`section:${maybeProduct}`]),
    ...switches.map(value => `p:${value}`),
  ];
}

const initialRepeat = [
  'dt:First product', 'dd:0:false:true:true:false:false:2:none',
  'dt:Second product', 'dd:1:true:false:false:false:true:2:First product',
  'dt:first', 'dd:First product 13 0 2 none', 'dt:second', 'dd:Second product 14 1 2 First product',
  'dt:first', 'dd:First product none', 'dt:second', 'dd:Second product First product',
  'dt:FIRST', 'dd:First product', 'dt:SECOND', 'dd:Second product',
  'dd:First product', 'dd:Second product', 'dd:0', 'dd:1', 'dd:First product', 'dd:Second product',
  'dd:undefined:First product', 'dd:undefined:Second product',
  'div:First product:none:none', 'div:Second product:First product:none',
];

const mutatedRepeat = [
  'dt:Third product', 'dd:0:false:true:true:false:false:2:none',
  'dt:Second product', 'dd:1:true:false:false:false:true:2:Third product',
  'dt:second', 'dd:Second product 14 0 2 none', 'dt:third', 'dd:Third product 13 1 2 Second product',
  'dt:second', 'dd:Second product none', 'dt:first', 'dd:First product Second product',
  'dt:SECOND', 'dd:Second product', 'dt:THIRD', 'dd:Third product',
  'dd:Second product', 'dd:Third product', 'dd:0', 'dd:1', 'dd:2', 'dd:Third product', 'dd:Second product',
  'dd:undefined:Third product', 'dd:undefined:Second product',
  'div:Third product:none:none', 'div:Second product:Third product:none',
];

function replacementRepeat(nullableRestored: boolean): readonly string[] {
  return [
    'dt:Replacement', 'dd:0:false:true:true:false:true:1:none',
    'dt:replacement', 'dd:Replacement 11 0 1 none',
    'dt:replacement', 'dd:Replacement none', 'dt:REPLACEMENT', 'dd:Replacement', 'dd:Replacement',
    ...(nullableRestored ? ['dd:Replacement'] : []),
    'dd:undefined:Replacement', 'div:Replacement:none:none', 'div:Nested product:none:Replacement',
  ];
}
