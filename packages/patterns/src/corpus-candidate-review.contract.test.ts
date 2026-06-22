import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocsCorpus } from './corpus/corpus-types.js';
import { parseGitBookNavigation } from './corpus/file-system-corpus.js';
import { parseMarkdownDocument } from './corpus/markdown-parser.js';
import { buildCorpusCandidateReview } from './curation/corpus-candidate-review.js';

test('corpus candidate review keeps excluded and non-default buckets separate from candidates', () => {
  const markdownDocuments = [
    parseMarkdownDocument(
      'router-direct/getting-started.md',
      `# Router Direct

## Setup

\`\`\`typescript
import { RouterConfiguration } from '@aurelia/router-direct';

Aurelia.register(RouterConfiguration);
\`\`\`
`
    ),
    parseMarkdownDocument(
      'getting-to-know-aurelia/event-aggregator.md',
      `# Event Aggregator

## Publish and subscribe

\`\`\`typescript
import { IEventAggregator, resolve } from 'aurelia';

export class Notifications {
  private readonly ea = resolve(IEventAggregator);

  publish() {
    this.ea.publish('saved', {});
  }
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'templates/repeats-and-list-rendering.md',
      `# List Rendering

## Local collection

\`\`\`typescript
export class InventoryList {
  readonly items = [{ id: 1, name: 'Keyboard' }];
}
\`\`\`

\`\`\`html
<article repeat.for="item of items; key.bind: item.id">\${item.name}</article>
\`\`\`
`
    ),
    parseMarkdownDocument(
      'router/routing-lifecycle.md',
      `# Routing lifecycle

\`\`\`typescript
import { IRouteViewModel, Params, RouteNode } from '@aurelia/router';

export class ProjectRoute implements IRouteViewModel {
  projectId = '';

  canLoad(params: Params) {
    return params.id === 'known';
  }

  async loading(params: Params, _next: RouteNode) {
    this.projectId = params.id;
    await Promise.resolve();
  }
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'router/router-events.md',
      `# Router events

\`\`\`typescript
import { IRouterEvents, NavigationStartEvent, NavigationEndEvent } from '@aurelia/router';
import { resolve } from 'aurelia';

export class ShellProgress {
  private readonly events = resolve(IRouterEvents);

  constructor() {
    this.events.subscribe('au:router:navigation-start', (event: NavigationStartEvent) => {});
    this.events.subscribe('au:router:navigation-end', (event: NavigationEndEvent) => {});
  }
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'templates/template-syntax/template-promises.md',
      `# Template promises

\`\`\`html
<div promise.bind="activityPromise">
  <template pending>Loading...</template>
  <template then="items">\${items.length}</template>
  <template catch="error">Failed</template>
</div>
\`\`\`
`
    ),
    parseMarkdownDocument(
      'router/route-parameters.md',
      `# Route parameters

\`\`\`typescript
import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';

export class ProjectDetail {
  private readonly routeContext = resolve(IRouteContext);

  get identifiers() {
    return this.routeContext.getRouteParameters({
      mergeStrategy: 'parent-first',
      includeQueryParams: true
    });
  }
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'templates/conditional-rendering.md',
      `# Conditional rendering

\`\`\`html
<div if.bind="isLoading">Loading</div>
<section show.bind="isReady">Ready</section>
<template switch.bind="state">
  <p case="empty">Empty</p>
  <p default-case>Ready</p>
</template>
\`\`\`
`
    ),
    parseMarkdownDocument(
      'components/shadow-dom-and-slots.md',
      `# Slotted content

\`\`\`html
<template as-custom-element="summary-card">
  <au-slot name="actions"></au-slot>
  <au-slot>Fallback</au-slot>
</template>
\`\`\`
`
    ),
    parseMarkdownDocument(
      'components/component-lifecycles.md',
      `# Component lifecycles

\`\`\`typescript
export class ResizePanel {
  private readonly onResize = () => {};

  attached() {
    window.addEventListener('resize', this.onResize);
  }

  detaching() {
    window.removeEventListener('resize', this.onResize);
  }
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'router/navigating.md',
      `# Navigating

\`\`\`html
<nav>
  <a load="projects">Projects</a>
  <a href.bind="projectRoute(project.id)">Project</a>
</nav>
<au-viewport></au-viewport>
\`\`\`
`
    ),
    parseMarkdownDocument(
      'templates/template-syntax/template-references.md',
      `# Template references

\`\`\`html
<input ref="searchInput" value.bind="query">
\`\`\`
`
    ),
    parseMarkdownDocument(
      'templates/custom-attributes.md',
      `# Custom attributes

\`\`\`typescript
import { bindable, customAttribute, INode, resolve } from 'aurelia';

@customAttribute({ name: 'status-tone', defaultProperty: 'tone' })
export class StatusToneCustomAttribute {
  @bindable tone = 'neutral';
  private readonly host = resolve(INode) as HTMLElement;
}
\`\`\`
`
    ),
    parseMarkdownDocument(
      'router/navigation-model.md',
      `# Navigation model

\`\`\`typescript
import { resolve } from 'aurelia';
import { IRouteContext, type INavigationModel } from '@aurelia/router';

export class WorkspaceNav {
  readonly navModel: INavigationModel | null = resolve(IRouteContext).routeConfigContext.navigationModel;
}
\`\`\`

\`\`\`html
<a href.bind="pathFor(route)" active.class="route.isActive">\${route.title}</a>
\`\`\`
`
    )
  ];
  const corpus: DocsCorpus = {
    rootDir: '<fixture>',
    files: [],
    markdownDocuments,
    navigation: parseGitBookNavigation('', markdownDocuments.map((document) => document.relativePath))
  };

  const review = buildCorpusCandidateReview(corpus);
  const buckets = new Map(review.bucketSummaries.map((bucket) => [bucket.bucket, bucket]));

  assert.equal(buckets.get('excluded.router-direct')?.itemCount, 1);
  assert.equal(buckets.get('capability.event-aggregator')?.itemCount, 1);
  assert.equal(buckets.get('candidate.local-collection')?.itemCount, 1);
  assert.equal(buckets.get('candidate.router-critical-loading')?.itemCount, 1);
  assert.equal(buckets.get('candidate.router-route-parameters')?.itemCount, 1);
  assert.equal(buckets.get('candidate.shell-navigation-progress')?.itemCount, 1);
  assert.equal(buckets.get('candidate.promise-secondary')?.itemCount, 1);
  assert.equal(buckets.get('candidate.conditional-rendering')?.itemCount, 1);
  assert.equal(buckets.get('candidate.slotted-layout')?.itemCount, 1);
  assert.equal(buckets.get('candidate.lifecycle-cleanup')?.itemCount, 1);
  assert.equal(buckets.get('candidate.router-navigation-links')?.itemCount, 2);
  assert.equal(buckets.get('candidate.template-ref')?.itemCount, 1);
  assert.equal(buckets.get('candidate.custom-attribute')?.itemCount, 1);
  assert.equal(buckets.get('candidate.router-active-navigation')?.itemCount, 1);
  assert.ok(buckets.get('excluded.router-direct')?.cautionMessages.some((message) => message.includes('excluded')));
  assert.ok(buckets.get('capability.event-aggregator')?.cautionMessages.some((message) => message.includes('public default')));
});
