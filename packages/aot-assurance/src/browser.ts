/* global window, document, Node, Element, HTMLElement, HTMLAnchorElement, HTMLButtonElement, HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, ParentNode, SVGElement, SVGCircleElement, requestAnimationFrame */

import { chromium, type Browser, type Page } from 'playwright';

import type {
  ApplicationObservation,
  AssuranceLane,
  AssuranceScenario,
  DomNodeTranscript,
  HelloWorldObservation,
  LaneTranscript,
  LiveElementTranscript,
  RoutedStorefrontObservation,
  RuntimeProbeSnapshot,
  StateBackedFormObservation,
} from './contract.js';
import { runProjectsAndMilestonesLane } from './projects-and-milestones-browser.js';

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
  if (scenario === 'routed-storefront') return runRoutedStorefrontLane(browser, lane, url);
  if (scenario === 'state-backed-form') return runStateBackedFormLane(browser, lane, url);
  if (scenario === 'projects-and-milestones') return runProjectsAndMilestonesLane(browser, lane, url);
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

async function runStateBackedFormLane(
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
      await waitForStateBackedForm(page, 'request-1', 'Ada Lovelace', 'ada.lovelace@example.test', 'form-ready', 0);
    } catch (error) {
      const detail = pageErrors.length === 0 ? '' : `\nBrowser errors:\n${pageErrors.join('\n')}`;
      throw new Error(`${lane} state-backed form did not render${detail}`, { cause: error });
    }

    const checkpoints = [];
    checkpoints.push({ label: 'initial-request-1', observation: await captureStateBackedForm(page) });

    await page.locator('#customer-name').fill('');
    await waitForStateBackedForm(page, 'request-1', '', 'ada.lovelace@example.test', 'form-pending', 0);
    checkpoints.push({ label: 'missing-name', observation: await captureStateBackedForm(page) });

    await page.locator('#customer-name').fill('Ada Lovelace');
    await page.locator('#email').fill('');
    await waitForStateBackedForm(page, 'request-1', 'Ada Lovelace', '', 'form-pending', 0);
    checkpoints.push({ label: 'missing-email', observation: await captureStateBackedForm(page) });

    await page.locator('#customer-name').fill('Augusta King');
    await page.locator('#email').fill('augusta.king@example.test');
    await page.locator('input[type="checkbox"]').check();
    await page.locator('fieldset').getByLabel('Phone', { exact: true }).check();
    await page.locator('#primary-topic').selectOption({ label: 'Billing' });
    await page.locator('#assignee').selectOption({ label: 'Grace' });
    await page.locator('#topics').selectOption([{ label: 'Hardware' }, { label: 'Billing' }]);
    await page.locator('#notes').fill('Call after 5pm');
    await waitForStateBackedForm(
      page,
      'request-1',
      'Augusta King',
      'augusta.king@example.test',
      'form-ready',
      0,
    );
    await waitForSelectedOptions(page, '#topics', ['Hardware', 'Billing']);
    await page.getByRole('button', { name: 'Submit request' }).click();
    await waitForStateBackedForm(
      page,
      'request-1',
      'Augusta King',
      'augusta.king@example.test',
      'form-ready',
      1,
    );
    checkpoints.push({ label: 'edited-and-submitted', observation: await captureStateBackedForm(page) });

    await page.locator('#request-selector').selectOption('request-2');
    await waitForStateBackedForm(page, 'request-2', 'Grace Hopper', 'grace.hopper@example.test', 'form-ready', 1);
    await waitForSelectedOptions(page, '#topics', ['Support']);
    checkpoints.push({ label: 'request-2', observation: await captureStateBackedForm(page) });

    await page.locator('#request-selector').selectOption('request-1');
    await waitForStateBackedForm(
      page,
      'request-1',
      'Augusta King',
      'augusta.king@example.test',
      'form-ready',
      1,
    );
    await waitForSelectedOptions(page, '#topics', ['Hardware', 'Billing']);
    checkpoints.push({ label: 'restored-request-1', observation: await captureStateBackedForm(page) });

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

async function waitForSelectedOptions(
  page: Page,
  selector: string,
  expectedLabels: readonly string[],
): Promise<void> {
  await page.waitForFunction(({ selector: expectedSelector, labels }) => {
    const select = document.querySelector<HTMLSelectElement>(expectedSelector);
    const selected = select == null
      ? []
      : Array.from(select.selectedOptions, option => option.textContent?.trim() ?? '');
    return selected.length === labels.length
      && selected.every((label, index) => label === labels[index]);
  }, { selector, labels: expectedLabels });
  await settle(page);
}

async function waitForStateBackedForm(
  page: Page,
  selectedRequest: string,
  customerName: string,
  email: string,
  formClass: 'form-ready' | 'form-pending',
  submissionCount: number,
): Promise<void> {
  await page.waitForFunction(expected => {
    const request = document.querySelector<HTMLSelectElement>('#request-selector');
    const name = document.querySelector<HTMLInputElement>('#customer-name');
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    const form = document.querySelector('state-backed-form form');
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const count = document.querySelector('app-root > main > p')?.textContent?.trim();
    return request?.value === expected.selectedRequest
      && name?.value === expected.customerName
      && emailInput?.value === expected.email
      && form?.classList.contains(expected.formClass) === true
      && submit?.disabled === (expected.formClass === 'form-pending')
      && count === `Submissions: ${expected.submissionCount}`;
  }, { selectedRequest, customerName, email, formClass, submissionCount });
  await settle(page);
}

async function captureStateBackedForm(page: Page): Promise<ApplicationObservation> {
  return page.evaluate(() => {
    const required = <TElement extends Element>(root: ParentNode, selector: string): TElement => {
      const element = root.querySelector<TElement>(selector);
      if (element == null) throw new Error(`state-backed form observation is missing '${selector}'`);
      return element;
    };
    const optionLabels = (select: HTMLSelectElement): readonly string[] =>
      Array.from(select.options, option => option.textContent?.trim() ?? '');
    const selectedLabels = (select: HTMLSelectElement): readonly string[] =>
      Array.from(select.selectedOptions, option => option.textContent?.trim() ?? '');
    const request = required<HTMLSelectElement>(document, '#request-selector');
    const form = required<HTMLElement>(document, 'state-backed-form form');
    const submit = required<HTMLButtonElement>(form, 'button[type="submit"]');
    const customerName = required<HTMLInputElement>(document, '#customer-name');
    const email = required<HTMLInputElement>(document, '#email');
    const notes = required<HTMLTextAreaElement>(document, '#notes');
    const urgent = required<HTMLInputElement>(form, 'input[type="checkbox"]');
    const primaryTopic = required<HTMLSelectElement>(form, '#primary-topic');
    const assignee = required<HTMLSelectElement>(form, '#assignee');
    const topics = required<HTMLSelectElement>(form, '#topics');
    const contactPreference = Array.from(form.querySelectorAll('fieldset label'), label => ({
      label: label.textContent?.trim() ?? '',
      checked: required<HTMLInputElement>(label, 'input[type="radio"]').checked,
    }));
    const field = (input: HTMLInputElement) => {
      const label = required<HTMLElement>(document, `label[for="${input.id}"]`);
      return {
        label: label.textContent?.trim() ?? '',
        labelFor: label.getAttribute('for') ?? '',
        id: input.id,
        type: input.type,
        value: input.value,
      };
    };
    const countText = required<HTMLElement>(document, 'app-root > main > p').textContent?.trim() ?? '';
    const submissionCount = Number(countText.replace('Submissions:', '').trim());
    const model: StateBackedFormObservation = {
      selectedRequest: request.value,
      requestOptions: optionLabels(request),
      submissionCount,
      formClasses: [...form.classList].sort(),
      submitDisabled: submit.disabled,
      fields: [field(customerName), field(email)],
      notes: notes.value,
      urgent: urgent.checked,
      contactPreference,
      primaryTopic: {
        options: optionLabels(primaryTopic),
        selected: selectedLabels(primaryTopic),
      },
      assignee: {
        options: optionLabels(assignee),
        selected: selectedLabels(assignee),
      },
      topics: {
        options: optionLabels(topics),
        selected: selectedLabels(topics),
      },
    };
    const live: LiveElementTranscript[] = [
      { id: 'request-selector', value: request.value, selectedIndex: request.selectedIndex },
      { id: 'customer-name', value: customerName.value },
      { id: 'email', value: email.value },
      { id: 'primary-topic', value: primaryTopic.value, selectedIndex: primaryTopic.selectedIndex },
      { id: 'assignee', value: assignee.value, selectedIndex: assignee.selectedIndex },
      { id: 'topics', value: topics.value, selectedIndex: topics.selectedIndex },
      { id: 'notes', value: notes.value },
    ];
    return {
      kind: 'state-backed-form',
      live,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.localName : null,
      model,
    };
  });
}

async function runRoutedStorefrontLane(
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
      await waitForStorefrontCards(page, ['Title 1', 'Title 2', 'Title 3']);
      await page.getByText('Featured items refreshes daily.').waitFor();
    } catch (error) {
      const detail = pageErrors.length === 0 ? '' : `\nBrowser errors:\n${pageErrors.join('\n')}`;
      throw new Error(`${lane} routed storefront did not render${detail}`, { cause: error });
    }

    const checkpoints = [];
    checkpoints.push({ label: 'initial-list', observation: await captureRoutedStorefront(page) });

    await page.getByLabel('Search').fill('Title 2');
    await waitForStorefrontCards(page, ['Title 2']);
    checkpoints.push({ label: 'debounced-search', observation: await captureRoutedStorefront(page) });

    await page.getByLabel('Search').fill('missing');
    await waitForStorefrontCards(page, []);
    await page.getByText('No items match the current filters.').waitFor();
    checkpoints.push({ label: 'no-match', observation: await captureRoutedStorefront(page) });

    await page.getByLabel('Search').fill('');
    await page.getByLabel('Badge').selectOption({ label: 'seasonal' });
    await waitForStorefrontCards(page, ['Title 3']);
    checkpoints.push({ label: 'badge-filter', observation: await captureRoutedStorefront(page) });

    await page.getByLabel('Badge').selectOption({ label: 'all' });
    await page.getByLabel('In stock only').check();
    await waitForStorefrontCards(page, ['Title 1', 'Title 2']);
    checkpoints.push({ label: 'stock-filter', observation: await captureRoutedStorefront(page) });

    await page.getByLabel('In stock only').uncheck();
    await waitForStorefrontCards(page, ['Title 1', 'Title 2', 'Title 3']);
    await page.locator('item-card').filter({ hasText: 'Title 1' }).getByRole('button', { name: 'Select' }).click();
    await waitForSelectionCount(page, 1);
    checkpoints.push({ label: 'first-selection', observation: await captureRoutedStorefront(page) });

    await page.locator('item-card').filter({ hasText: 'Title 1' }).getByRole('link', { name: 'View details' }).click();
    await waitForStorefrontDetail(page, 'Title 1', 'catalog');
    checkpoints.push({ label: 'first-detail', observation: await captureRoutedStorefront(page) });

    await page.locator('app-root > main > header nav').getByRole('link', { name: 'Items', exact: true }).click();
    await waitForStorefrontCards(page, ['Title 1', 'Title 2', 'Title 3']);
    checkpoints.push({ label: 'return-to-list', observation: await captureRoutedStorefront(page) });

    await page.locator('item-card').filter({ hasText: 'Title 2' }).getByRole('link', { name: 'View details' }).click();
    await waitForStorefrontDetail(page, 'Title 2', 'catalog');
    checkpoints.push({ label: 'dynamic-detail', observation: await captureRoutedStorefront(page) });

    await page.getByRole('button', { name: 'Select' }).click();
    await waitForSelectionCount(page, 2);
    checkpoints.push({ label: 'second-selection', observation: await captureRoutedStorefront(page) });

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

async function waitForStorefrontCards(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(labels => {
    const actual = Array.from(document.querySelectorAll('item-card h3'), node => node.textContent?.trim() ?? '');
    return actual.length === labels.length && actual.every((value, index) => value === labels[index]);
  }, expected);
  await settle(page);
}

async function waitForSelectionCount(page: Page, count: number): Promise<void> {
  await page.waitForFunction(expected => {
    const text = document.querySelector('app-root header > p')?.textContent?.trim();
    return text === `Selected items: ${expected}`;
  }, count);
  await settle(page);
}

async function waitForStorefrontDetail(page: Page, heading: string, openedFrom: string): Promise<void> {
  await page.waitForFunction(([expectedHeading, expectedSource]) => {
    const detail = document.querySelector('item-detail-route section.item-detail');
    if (detail == null || detail.querySelector('h1')?.textContent?.trim() !== expectedHeading) return false;
    const terms = Array.from(detail.querySelectorAll('dt'), node => node.textContent?.trim() ?? '');
    const index = terms.indexOf('Opened from');
    return index >= 0 && detail.querySelectorAll('dd')[index]?.textContent?.trim() === expectedSource;
  }, [heading, openedFrom]);
  await settle(page);
}

async function captureRoutedStorefront(page: Page): Promise<ApplicationObservation> {
  return page.evaluate(() => {
    const required = <TElement extends Element>(root: ParentNode, selector: string): TElement => {
      const element = root.querySelector<TElement>(selector);
      if (element == null) throw new Error(`routed storefront observation is missing '${selector}'`);
      return element;
    };
    const text = (root: ParentNode, selector: string): string =>
      required(root, selector).textContent?.trim() ?? '';
    const linkLocation = (link: HTMLAnchorElement): string => {
      const target = new URL(link.href, window.location.href);
      return `${target.pathname}${target.search}${target.hash}`;
    };
    const shell = required<HTMLElement>(document, 'app-root main.catalog-shell');
    const selectionText = text(shell, ':scope > header > p');
    const count = Number(selectionText.replace('Selected items:', '').trim());
    const navigation = Array.from(shell.querySelectorAll<HTMLAnchorElement>(':scope > header nav a'), link => ({
      label: link.textContent?.trim() ?? '',
      location: linkLocation(link),
      active: link.classList.contains('active-route'),
    }));
    const detail = shell.querySelector<HTMLElement>('item-detail-route section.item-detail');
    let route: RoutedStorefrontObservation['route'];
    const live: LiveElementTranscript[] = [];
    if (detail != null) {
      const terms = Array.from(detail.querySelectorAll('dt'));
      const values = Array.from(detail.querySelectorAll('dd'));
      route = {
        kind: 'detail',
        heading: text(detail, 'h1'),
        summary: text(detail, ':scope > h1 + p'),
        fields: terms.map((term, index) => ({
          label: term.textContent?.trim() ?? '',
          value: values[index]?.textContent?.trim() ?? '',
        })),
        allItemsLocation: linkLocation(required<HTMLAnchorElement>(detail, ':scope > a')),
        selectDisabled: required<HTMLButtonElement>(detail, 'button').disabled,
      };
    } else {
      const list = required<HTMLElement>(shell, 'item-list-route > section');
      const search = required<HTMLInputElement>(list, 'input[type="search"]');
      const onlyInStock = required<HTMLInputElement>(list, 'input[type="checkbox"]');
      const badge = required<HTMLSelectElement>(list, 'select');
      live.push(
        { id: 'catalog-search', value: search.value },
        { id: 'catalog-stock', value: onlyInStock.value, checked: onlyInStock.checked },
        { id: 'catalog-badge', value: badge.value, selectedIndex: badge.selectedIndex },
      );
      route = {
        kind: 'list',
        heading: text(list, 'h2'),
        searchValue: search.value,
        onlyInStock: onlyInStock.checked,
        badgeFilter: badge.value,
        badgeOptions: Array.from(badge.options, option => option.textContent?.trim() ?? ''),
        messages: Array.from(list.querySelectorAll(':scope > p, :scope > div > p'), node =>
          node.textContent?.trim() ?? ''
        ),
        cards: Array.from(list.querySelectorAll<HTMLElement>('item-card'), host => {
          const article = required<HTMLElement>(host, 'article.item-card');
          const paragraphs = Array.from(article.querySelectorAll(':scope > p'));
          const detailLink = required<HTMLAnchorElement>(article, 'a');
          return {
            name: text(article, 'h3'),
            summary: paragraphs[0]?.textContent?.trim() ?? '',
            price: paragraphs[1]?.textContent?.trim() ?? '',
            stock: paragraphs[2]?.textContent?.trim() ?? '',
            availability: paragraphs[3]?.textContent?.trim() ?? '',
            classes: [...article.classList].sort(),
            padding: article.style.padding,
            borderColor: article.style.borderColor,
            detailLocation: linkLocation(detailLink),
            selectDisabled: required<HTMLButtonElement>(article, 'button').disabled,
          };
        }),
      };
    }
    const selectedNames = Array.from(shell.querySelectorAll(':scope > aside li'), node => node.textContent?.trim() ?? '');
    const emptySelection = Array.from(shell.children).find((element) =>
      element.localName === 'p' && element.textContent?.includes('Select a featured Item.') === true
    );
    const model: RoutedStorefrontObservation = {
      location: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      documentTitle: document.title,
      shellClasses: [...shell.classList].sort(),
      selectionCount: count,
      selectionProgress: required<HTMLElement>(shell, ':scope > header .selection-progress > span').style.width,
      catalogStatus: text(shell, ':scope > header section[aria-label="Catalog status"]'),
      navigation,
      route,
      selectedNames,
      emptySelectionMessage: emptySelection?.textContent?.trim() ?? null,
    };
    return {
      kind: 'routed-storefront',
      live,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.localName : null,
      model,
    };
  });
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
