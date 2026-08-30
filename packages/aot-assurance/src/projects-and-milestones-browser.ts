/* global window, document, Element, HTMLElement, HTMLAnchorElement, HTMLInputElement, HTMLSelectElement, ParentNode, requestAnimationFrame */

import type { Browser, Page } from 'playwright';

import type {
  ApplicationObservation,
  AssuranceLane,
  LaneTranscript,
  LiveElementTranscript,
  ProjectsAndMilestonesObservation,
} from './contract.js';

export async function runProjectsAndMilestonesLane(
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
      await waitForProjectRows(page, ['Platform refresh', 'Docs cleanup']);
    } catch (error) {
      const detail = pageErrors.length === 0 ? '' : `\nBrowser errors:\n${pageErrors.join('\n')}`;
      throw new Error(`${lane} projects-and-milestones application did not render${detail}`, { cause: error });
    }

    const checkpoints = [];
    checkpoints.push({ label: 'projects-initial', observation: await captureProjectsAndMilestones(page) });

    await page.locator('#name-field').fill('Compiler audit');
    await page.locator('#phase-field').fill('AOT');
    await page.getByRole('button', { name: 'Create project' }).click();
    await waitForProjectRows(page, ['Platform refresh', 'Docs cleanup', 'Compiler audit']);
    checkpoints.push({ label: 'project-created', observation: await captureProjectsAndMilestones(page) });

    await page.locator('project-list-route li').filter({ hasText: 'Platform refresh' })
      .getByRole('link', { name: 'Open project' }).click();
    await waitForDetail(page, 'project-detail-route', 'Platform refresh');
    checkpoints.push({ label: 'project-detail', observation: await captureProjectsAndMilestones(page) });

    await rootNavigation(page).getByRole('link', { name: 'Milestones', exact: true }).click();
    await waitForMilestoneRows(page, ['Prototype review', 'Public preview']);
    checkpoints.push({ label: 'milestones', observation: await captureProjectsAndMilestones(page) });

    await page.locator('milestone-list-route li').filter({ hasText: 'Public preview' })
      .getByRole('link', { name: 'Open milestone' }).click();
    await waitForDetail(page, 'milestone-detail-route', 'Public preview');
    checkpoints.push({ label: 'milestone-detail', observation: await captureProjectsAndMilestones(page) });

    await rootNavigation(page).getByRole('link', { name: 'Assignments', exact: true }).click();
    await waitForAssignmentRows(page, ['Prepare release notes', 'Check deployment checklist', 'Collect preview feedback']);
    checkpoints.push({ label: 'assignments', observation: await captureProjectsAndMilestones(page) });

    await page.locator('#title-field').fill('Trace generated wire');
    await page.locator('#done-field').check();
    await page.locator('#project-id-field').selectOption({ label: 'Docs cleanup' });
    await page.getByRole('button', { name: 'Create assignment' }).click();
    await waitForAssignmentRows(page, [
      'Prepare release notes',
      'Check deployment checklist',
      'Collect preview feedback',
      'Trace generated wire',
    ]);
    await page.locator('#assignment-create-status').filter({ hasText: 'Assignment saved.' }).waitFor();
    checkpoints.push({ label: 'assignment-created', observation: await captureProjectsAndMilestones(page) });

    await page.locator('task-item-list-route tbody tr').filter({ hasText: 'Trace generated wire' })
      .getByRole('link', { name: 'Open assignment' }).click();
    await waitForDetail(page, 'task-item-detail-route', 'Trace generated wire');
    checkpoints.push({ label: 'assignment-detail', observation: await captureProjectsAndMilestones(page) });

    await rootNavigation(page).getByRole('link', { name: 'Reviews', exact: true }).click();
    await waitForReviewRows(page, ['Architecture review', 'Launch checklist review']);
    checkpoints.push({ label: 'reviews', observation: await captureProjectsAndMilestones(page) });

    await page.locator('#title-field').fill('AOT closure review');
    await page.locator('#done-field').check();
    await page.locator('#reviewer-field').selectOption({ label: 'Grace Hopper' });
    await page.getByRole('button', { name: 'Create review' }).click();
    await waitForReviewRows(page, ['Architecture review', 'Launch checklist review', 'AOT closure review']);
    await page.locator('#review-create-status').filter({ hasText: 'Review saved.' }).waitFor();
    checkpoints.push({ label: 'review-created', observation: await captureProjectsAndMilestones(page) });

    await page.locator('review-item-list-route tbody tr').filter({ hasText: 'AOT closure review' })
      .getByRole('link', { name: 'Open review' }).click();
    await waitForDetail(page, 'review-item-detail-route', 'AOT closure review');
    checkpoints.push({ label: 'review-detail', observation: await captureProjectsAndMilestones(page) });

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

function rootNavigation(page: Page) {
  return page.locator('my-app > main > nav');
}

async function waitForProjectRows(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(names => {
    const actual = Array.from(
      document.querySelectorAll('project-list-route > section > ul > li > span'),
      node => node.textContent?.trim() ?? '',
    );
    return actual.length === names.length && actual.every((name, index) => name === names[index]);
  }, expected);
  await settle(page);
}

async function waitForMilestoneRows(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(titles => {
    const actual = Array.from(
      document.querySelectorAll('milestone-list-route > section > ul > li > span'),
      node => node.textContent?.trim() ?? '',
    );
    return actual.length === titles.length && actual.every((title, index) => title === titles[index]);
  }, expected);
  await settle(page);
}

async function waitForAssignmentRows(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(titles => {
    const actual = Array.from(
      document.querySelectorAll('task-item-list-route > section > table > tbody > tr > td:first-child'),
      node => node.textContent?.trim() ?? '',
    );
    return actual.length === titles.length && actual.every((title, index) => title === titles[index]);
  }, expected);
  await settle(page);
}

async function waitForReviewRows(page: Page, expected: readonly string[]): Promise<void> {
  await page.waitForFunction(titles => {
    const actual = Array.from(
      document.querySelectorAll('review-item-list-route > section > section table > tbody > tr > td:first-child'),
      node => node.textContent?.trim() ?? '',
    );
    return actual.length === titles.length && actual.every((title, index) => title === titles[index]);
  }, expected);
  await settle(page);
}

async function waitForDetail(page: Page, host: string, heading: string): Promise<void> {
  await page.waitForFunction(({ selector, expected }) =>
    document.querySelector(`${selector} h2`)?.textContent?.trim() === expected,
  { selector: host, expected: heading });
  await settle(page);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolveFrame => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
}

async function captureProjectsAndMilestones(page: Page): Promise<ApplicationObservation> {
  return page.evaluate(() => {
    const required = <TElement extends Element>(root: ParentNode, selector: string): TElement => {
      const element = root.querySelector<TElement>(selector);
      if (element == null) throw new Error(`projects-and-milestones observation is missing '${selector}'`);
      return element;
    };
    const text = (root: ParentNode, selector: string): string =>
      required(root, selector).textContent?.trim() ?? '';
    const optionalText = (root: ParentNode, selector: string): string | null =>
      root.querySelector(selector)?.textContent?.trim() ?? null;
    const linkLocation = (link: HTMLAnchorElement): string => {
      const target = new URL(link.href, window.location.href);
      return `${target.pathname}${target.search}${target.hash}`;
    };
    const selectObservation = (select: HTMLSelectElement) => ({
      options: Array.from(select.options, option => option.textContent?.trim() ?? ''),
      selected: select.selectedOptions[0]?.textContent?.trim() ?? '',
    });
    const cells = (row: Element): readonly string[] =>
      Array.from(row.querySelectorAll(':scope > td'), cell => cell.textContent?.trim() ?? '');

    const shell = required<HTMLElement>(document, 'my-app > main');
    const navigation = Array.from(shell.querySelectorAll<HTMLAnchorElement>(':scope > nav > a'), link => ({
      label: link.textContent?.trim() ?? '',
      location: linkLocation(link),
    }));
    const live: LiveElementTranscript[] = [];
    let route: ProjectsAndMilestonesObservation['route'];

    const projectDetail = shell.querySelector<HTMLElement>('project-detail-route');
    const milestoneDetail = shell.querySelector<HTMLElement>('milestone-detail-route');
    const assignmentDetail = shell.querySelector<HTMLElement>('task-item-detail-route');
    const reviewDetail = shell.querySelector<HTMLElement>('review-item-detail-route');
    if (projectDetail != null) {
      const rows = Array.from(projectDetail.querySelectorAll('tbody tr'));
      route = {
        kind: 'project-detail',
        heading: text(projectDetail, 'h2'),
        phase: text(projectDetail, 'article p').replace(/^Phase:\s*/, ''),
        backLocation: linkLocation(required(projectDetail, ':scope > section > a')),
        assignments: rows.map(row => {
          const values = cells(row);
          return {
            title: values[0] ?? '',
            status: values[1] ?? '',
            detailLocation: linkLocation(required(row, 'a')),
          };
        }),
      };
    } else if (milestoneDetail != null) {
      route = {
        kind: 'milestone-detail',
        heading: text(milestoneDetail, 'h2'),
        targetDate: text(milestoneDetail, 'article p').replace(/^Target Date:\s*/, ''),
        backLocation: linkLocation(required(milestoneDetail, ':scope > section > a')),
      };
    } else if (assignmentDetail != null) {
      const paragraphs = Array.from(assignmentDetail.querySelectorAll('article p'), node => node.textContent?.trim() ?? '');
      route = {
        kind: 'assignment-detail',
        heading: text(assignmentDetail, 'h2'),
        status: (paragraphs[0] ?? '').replace(/^Done:\s*/, ''),
        project: (paragraphs[1] ?? '').replace(/^Project:\s*/, ''),
        backLocation: linkLocation(required(assignmentDetail, ':scope > section > a')),
      };
    } else if (reviewDetail != null) {
      const paragraphs = Array.from(reviewDetail.querySelectorAll('article p'), node => node.textContent?.trim() ?? '');
      route = {
        kind: 'review-detail',
        heading: text(reviewDetail, 'h2'),
        status: (paragraphs[0] ?? '').replace(/^Done:\s*/, ''),
        reviewer: (paragraphs[1] ?? '').replace(/^Reviewer:\s*/, ''),
        backLocation: linkLocation(required(reviewDetail, ':scope > section > a')),
      };
    } else {
      const projectList = shell.querySelector<HTMLElement>('project-list-route');
      const milestoneList = shell.querySelector<HTMLElement>('milestone-list-route');
      const assignmentList = shell.querySelector<HTMLElement>('task-item-list-route');
      const reviewList = shell.querySelector<HTMLElement>('review-item-list-route');
      if (projectList != null) {
        const name = required<HTMLInputElement>(projectList, '#name-field');
        const phase = required<HTMLInputElement>(projectList, '#phase-field');
        live.push({ id: name.id, value: name.value }, { id: phase.id, value: phase.value });
        route = {
          kind: 'project-list',
          heading: text(projectList, 'h2'),
          name: name.value,
          phase: phase.value,
          projects: Array.from(projectList.querySelectorAll('ul > li'), row => ({
            name: text(row, 'span'),
            detailLocation: linkLocation(required(row, 'a')),
          })),
        };
      } else if (milestoneList != null) {
        route = {
          kind: 'milestone-list',
          heading: text(milestoneList, 'h2'),
          milestones: Array.from(milestoneList.querySelectorAll('ul > li'), row => ({
            title: text(row, 'span'),
            detailLocation: linkLocation(required(row, 'a')),
          })),
        };
      } else if (assignmentList != null) {
        const title = required<HTMLInputElement>(assignmentList, '#title-field');
        const done = required<HTMLInputElement>(assignmentList, '#done-field');
        const project = required<HTMLSelectElement>(assignmentList, '#project-id-field');
        live.push(
          { id: title.id, value: title.value },
          { id: done.id, value: done.value, checked: done.checked },
          { id: project.id, value: project.value, selectedIndex: project.selectedIndex },
        );
        route = {
          kind: 'assignment-list',
          heading: text(assignmentList, 'h2'),
          title: title.value,
          done: done.checked,
          project: selectObservation(project),
          statusMessage: optionalText(assignmentList, '#assignment-create-status'),
          assignments: Array.from(assignmentList.querySelectorAll('tbody tr'), row => {
            const values = cells(row);
            const links = row.querySelectorAll<HTMLAnchorElement>('a');
            return {
              title: values[0] ?? '',
              project: values[1] ?? '',
              projectLocation: linkLocation(links[0]!),
              status: values[2] ?? '',
              detailLocation: linkLocation(links[1]!),
            };
          }),
        };
      } else if (reviewList != null) {
        const title = required<HTMLInputElement>(reviewList, '#title-field');
        const done = required<HTMLInputElement>(reviewList, '#done-field');
        const reviewer = required<HTMLSelectElement>(reviewList, '#reviewer-field');
        live.push(
          { id: title.id, value: title.value },
          { id: done.id, value: done.value, checked: done.checked },
          { id: reviewer.id, value: reviewer.value, selectedIndex: reviewer.selectedIndex },
        );
        route = {
          kind: 'review-list',
          heading: text(reviewList, 'h2'),
          title: title.value,
          done: done.checked,
          reviewer: selectObservation(reviewer),
          statusMessage: optionalText(reviewList, '#review-create-status'),
          reviews: Array.from(reviewList.querySelectorAll('tbody tr'), row => {
            const values = cells(row);
            return {
              title: values[0] ?? '',
              reviewer: values[1] ?? '',
              status: values[2] ?? '',
              detailLocation: linkLocation(required(row, 'a')),
            };
          }),
        };
      } else {
        throw new Error('projects-and-milestones observation has no recognized route host');
      }
    }

    const model: ProjectsAndMilestonesObservation = {
      location: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      documentTitle: document.title,
      navigation,
      route,
    };
    return {
      kind: 'projects-and-milestones',
      live,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement.localName : null,
      model,
    };
  });
}
