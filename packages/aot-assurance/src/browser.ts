/* global window, document, Node, Element, HTMLElement, HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, ParentNode, SVGElement, SVGCircleElement, requestAnimationFrame */

import { chromium, type Browser, type Page } from 'playwright';

import type {
  ApplicationObservation,
  AssuranceLane,
  AssuranceScenario,
  DomNodeTranscript,
  HelloWorldObservation,
  LaneTranscript,
  LiveElementTranscript,
  RuntimeProbeSnapshot,
} from './contract.js';

export interface BrowserBatchResult {
  readonly browser: Browser;
  readonly jit: LaneTranscript;
  readonly aot: LaneTranscript;
}

export async function runBrowserBatch(
  jitUrl: string,
  aotUrl: string,
  scenario: AssuranceScenario,
): Promise<BrowserBatchResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const jit = await runLane(browser, 'jit', jitUrl, scenario);
    const aot = await runLane(browser, 'aot', aotUrl, scenario);
    return { browser, jit, aot };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function runLane(
  browser: Browser,
  lane: AssuranceLane,
  url: string,
  scenario: AssuranceScenario,
): Promise<LaneTranscript> {
  if (scenario === 'hello-world') return runHelloWorldLane(browser, lane, url);
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

async function runHelloWorldLane(browser: Browser, lane: AssuranceLane, url: string): Promise<LaneTranscript> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => consoleMessages.push(`${message.type()}:${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: 'load' });
    try {
      await waitForCardLabels(page, ['Blue kettle', 'Morning mug', 'Travel roaster']);
    } catch (error) {
      const detail = pageErrors.length === 0 ? '' : `\nBrowser errors:\n${pageErrors.join('\n')}`;
      throw new Error(`${lane} hello-world application did not render${detail}`, { cause: error });
    }

    const checkpoints = [];
    checkpoints.push({ label: 'initial', observation: await captureHelloWorld(page) });

    await page.getByPlaceholder('Filter products').fill('coffee');
    await waitForCardLabels(page, ['Morning mug', 'Travel roaster']);
    checkpoints.push({ label: 'search', observation: await captureHelloWorld(page) });

    await page.locator('product-card').filter({ hasText: 'Travel roaster' }).click();
    await waitForPreview(page, 'Travel roaster');
    checkpoints.push({ label: 'selection', observation: await captureHelloWorld(page) });

    await page.locator('input[type="checkbox"]').check();
    await waitForCardLabels(page, ['Travel roaster']);
    checkpoints.push({ label: 'stock-filter', observation: await captureHelloWorld(page) });

    await page.getByPlaceholder('Filter products').fill('mug');
    await waitForCardLabels(page, []);
    await page.waitForFunction(() => document.querySelector('my-app main.playground > p')?.textContent?.trim()
      === 'No products match mug.');
    await settle(page);
    checkpoints.push({ label: 'empty', observation: await captureHelloWorld(page) });

    await page.getByRole('button', { name: 'Clear' }).click();
    await waitForCardLabels(page, ['Blue kettle', 'Travel roaster']);
    checkpoints.push({ label: 'clear', observation: await captureHelloWorld(page) });

    await page.locator('input[type="checkbox"]').uncheck();
    await waitForCardLabels(page, ['Blue kettle', 'Morning mug', 'Travel roaster']);
    checkpoints.push({ label: 'restore', observation: await captureHelloWorld(page) });

    await page.locator('product-card').filter({ hasText: 'Morning mug' }).click();
    await waitForPreview(page, 'Morning mug');
    checkpoints.push({ label: 'zero-stock-selection', observation: await captureHelloWorld(page) });

    return {
      lane,
      semantic: {
        checkpoints,
        teardownEvents: null,
        console: consoleMessages,
        pageErrors,
      },
      probes: null,
    };
  } finally {
    await context.close();
  }
}

async function waitForCardLabels(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(labels => {
    const actual = Array.from(document.querySelectorAll('product-card h3'), node => node.textContent?.trim() ?? '');
    return actual.length === labels.length && actual.every((value, index) => value === labels[index]);
  }, expected);
  await settle(page);
}

async function waitForPreview(page: Page, expected: string): Promise<void> {
  await page.waitForFunction(name => document.querySelector('section.preview h2')?.textContent?.trim() === name, expected);
  await settle(page);
}

async function captureHelloWorld(page: Page): Promise<ApplicationObservation> {
  return page.evaluate(() => {
    const required = <TElement extends Element>(root: ParentNode, selector: string): TElement => {
      const element = root.querySelector<TElement>(selector);
      if (element == null) throw new Error(`hello-world observation is missing '${selector}'`);
      return element;
    };
    const text = (root: ParentNode, selector: string): string =>
      required(root, selector).textContent?.trim() ?? '';
    const main = required<HTMLElement>(document, 'my-app main.playground');
    const search = required<HTMLInputElement>(main, 'input[placeholder="Filter products"]');
    const onlyInStock = required<HTMLInputElement>(main, 'input[type="checkbox"]');
    const preview = required<HTMLElement>(main, 'section.preview');
    const previewParagraphs = Array.from(preview.children).filter((element) => element.localName === 'p');
    const badge = required<HTMLElement>(preview, 'stock-badge span.stock-badge');
    const cards = Array.from(main.querySelectorAll<HTMLElement>('product-card'), host => {
      const article = required<HTMLElement>(host, 'article.product-card');
      const progress = required<HTMLElement>(article, ':scope > span');
      const svg = required<SVGElement>(article, 'svg');
      const circle = required<SVGCircleElement>(svg, 'circle');
      const foreignDiv = required<HTMLElement>(svg, 'foreignObject div');
      return {
        label: text(article, 'h3'),
        description: text(article, ':scope > p'),
        sku: text(article, ':scope > small'),
        stockText: text(article, ':scope > span:last-child'),
        selected: article.classList.contains('selected'),
        progressWidth: progress.style.width,
        svgLabel: svg.getAttribute('aria-label'),
        svgNamespace: svg.namespaceURI,
        circleStrokeWidth: circle.style.strokeWidth,
        foreignObjectWidth: foreignDiv.style.width,
        foreignObjectHtmlNamespace: foreignDiv.namespaceURI,
      };
    });
    const empty = Array.from(main.children).find((element) => element.localName === 'p') ?? null;
    const model: HelloWorldObservation = {
      heading: text(main, 'h1'),
      searchValue: search.value,
      onlyInStock: onlyInStock.checked,
      headerProgress: required<HTMLElement>(main, 'header > span').style.width,
      preview: {
        classes: [...preview.classList].sort(),
        title: preview.getAttribute('title'),
        displayTone: preview.getAttribute('data-display-tone'),
        name: text(preview, 'h2'),
        description: previewParagraphs[0]?.textContent?.trim() ?? '',
        stockLabel: previewParagraphs[1]?.textContent?.trim() ?? '',
        badgeClasses: [...badge.classList].sort(),
        badgeText: badge.textContent?.trim() ?? '',
      },
      cards,
      emptyMessage: empty?.textContent?.trim() ?? null,
    };
    const live: LiveElementTranscript[] = [
      { id: 'search', value: search.value },
      { id: 'only-in-stock', value: onlyInStock.value, checked: onlyInStock.checked },
    ];
    return {
      kind: 'hello-world',
      live,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.localName : null,
      model,
    };
  });
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
      kind: 'g0',
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
