/* global window, document, Node, Element, HTMLElement, HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, requestAnimationFrame */

import { chromium, type Browser, type Page } from 'playwright';

import type {
  ApplicationObservation,
  AssuranceLane,
  DomNodeTranscript,
  LaneTranscript,
  RuntimeProbeSnapshot,
} from './contract.js';

export interface BrowserBatchResult {
  readonly browser: Browser;
  readonly jit: LaneTranscript;
  readonly aot: LaneTranscript;
}

export async function runBrowserBatch(jitUrl: string, aotUrl: string): Promise<BrowserBatchResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const jit = await runLane(browser, 'jit', jitUrl);
    const aot = await runLane(browser, 'aot', aotUrl);
    return { browser, jit, aot };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function runLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__aotAssurance?.ready === true, undefined, { timeout: 15_000 });
    } catch (error) {
      const detail = pageErrors.length === 0 ? '' : `\nBrowser errors:\n${pageErrors.join('\n')}`;
      throw new Error(`${lane} application did not reach the ready boundary${detail}`, { cause: error });
    }

    const checkpoints = [];
    checkpoints.push({ label: 'initial', observation: await capture(page) });

    await page.locator('#name').fill('bravo');
    await settle(page);
    checkpoints.push({ label: 'form-writeback', observation: await capture(page) });

    await page.locator('#enabled').uncheck();
    await settle(page);
    checkpoints.push({ label: 'checked-class-style', observation: await capture(page) });

    await page.locator('#increment').click();
    await settle(page);
    checkpoints.push({ label: 'event-let', observation: await capture(page) });

    await page.locator('#child-action').click();
    await settle(page);
    checkpoints.push({ label: 'child-event-projection', observation: await capture(page) });

    await page.locator('#toggle').click();
    await page.locator('#add-item').click();
    await settle(page);
    checkpoints.push({ label: 'structural-final', observation: await capture(page) });

    const eventCountBeforeStop = await page.evaluate(() => window.__aotAssurance!.events.length);
    await page.evaluate(() => window.__aotAssurance!.stop());
    const teardownEvents = await page.evaluate(
      start => window.__aotAssurance!.events.slice(start),
      eventCountBeforeStop,
    );
    const probes = await page.evaluate(() => window.__aotAssurance!.readProbes());

    return {
      lane,
      semantic: {
        checkpoints,
        teardownEvents,
        console: consoleMessages,
        pageErrors,
      },
      probes,
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

async function capture(page: Page): Promise<ApplicationObservation> {
  return page.evaluate(() => {
    const assurance = window.__aotAssurance!;
    const root = document.querySelector('#app');
    if (root === null) throw new Error('fixture host #app is missing');

    const serialize = (node: Node): DomNodeTranscript => {
      if (node.nodeType === Node.TEXT_NODE) {
        return { kind: 'text', value: node.nodeValue ?? '' };
      }
      if (node.nodeType === Node.COMMENT_NODE) {
        return { kind: 'comment', value: node.nodeValue ?? '' };
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        throw new Error(`unexpected DOM node type ${node.nodeType}`);
      }
      const element = node as Element;
      const attributes = Array.from(element.attributes, attribute => ({
        name: attribute.name,
        value: attribute.value,
      }));
      attributes.sort((left, right) => left.name.localeCompare(right.name));
      return {
        kind: 'element',
        name: element.localName,
        namespace: element.namespaceURI,
        attributes,
        children: Array.from(element.childNodes, serialize),
      };
    };

    const live = Array.from(document.querySelectorAll<HTMLElement>('[data-live]'), element => {
      const observation: {
        id: string;
        value?: string;
        checked?: boolean;
        selectedIndex?: number;
      } = { id: element.id };
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        observation.value = element.value;
      }
      if (element instanceof HTMLInputElement) observation.checked = element.checked;
      if (element instanceof HTMLSelectElement) observation.selectedIndex = element.selectedIndex;
      return observation;
    });
    live.sort((left, right) => left.id.localeCompare(right.id));

    const browserNode = document.querySelector('#fostered');
    return {
      dom: Array.from(root.childNodes, serialize),
      live,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      model: assurance.readModel(),
      events: assurance.events.slice(),
      browserStructure: {
        parentId: browserNode?.parentElement?.id ?? null,
        nextElementId: browserNode?.nextElementSibling?.id ?? null,
      },
      svgNamespace: document.querySelector('#svg-message')?.namespaceURI ?? null,
    };
  });
}

declare global {
  interface Window {
    __aotAssurance?: {
      lane: AssuranceLane;
      ready: boolean;
      events: string[];
      readModel(): unknown;
      readProbes(): RuntimeProbeSnapshot;
      stop(): Promise<void>;
    };
  }
}
