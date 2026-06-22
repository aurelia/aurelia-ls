import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDocumentSemanticIndex } from './corpus/semantic-index.js';
import { parseMarkdownDocument } from './corpus/markdown-parser.js';

test('semantic index groups multi-section GitBook recipe examples', () => {
  const document = parseMarkdownDocument(
    'templates/recipes/product-catalog.md',
    `# Product Catalog

## Code

### View Model (product-catalog.ts)

\`\`\`typescript
export class ProductCatalog {
  readonly products = [{ id: 1, name: 'Keyboard' }];

  get filteredProducts() {
    return this.products.filter((product) => product.name.length > 0);
  }
}
\`\`\`

### Template (product-catalog.html)

\`\`\`html
<section>
  <input value.bind="searchQuery">
  <article repeat.for="product of filteredProducts; key.bind: product.id">
    \${product.name}
  </article>
</section>
\`\`\`

### Styles (product-catalog.css)

\`\`\`css
.catalog {
  display: grid;
}
\`\`\`

## How It Works

This section explains the recipe.
`
  );

  const index = buildDocumentSemanticIndex(document);

  assert.equal(index.sourceCompanionGroups.length, 3);
  assert.equal(index.exampleSets.length, 1);

  const exampleSet = index.exampleSets[0]!;
  assert.equal(exampleSet.rootHeading, 'Code');
  assert.equal(exampleSet.completeness, 'multi-section-recipe');
  assert.equal(exampleSet.disposition, 'primary-grounding');
  assert.deepEqual(exampleSet.fileNameCandidates, [
    'product-catalog.css',
    'product-catalog.html',
    'product-catalog.ts'
  ]);
  assert.ok(exampleSet.signalNames.includes('repeat.for'));
  assert.ok(exampleSet.signalNames.includes('value.bind'));
  assert.ok(exampleSet.signalNames.includes('local-array'));
});

test('semantic index marks router-direct docs as excluded evidence', () => {
  const document = parseMarkdownDocument(
    'router-direct/getting-started.md',
    `# Router Direct

## Setup

\`\`\`typescript
import { RouterConfiguration } from '@aurelia/router-direct';

Aurelia.register(RouterConfiguration);
\`\`\`

## Navigation

\`\`\`html
<a load="route:products">Products</a>
\`\`\`
`
  );

  const index = buildDocumentSemanticIndex(document);

  assert.equal(index.sourceCompanionGroups.length, 2);
  assert.ok(index.sourceCompanionGroups.every((group) => group.disposition === 'excluded'));
  assert.ok(index.sourceCompanionGroups.some((group) => group.signalNames.includes('router-direct')));
});

test('semantic index separates capability and non-default communication evidence', () => {
  const eventAggregatorDocument = parseMarkdownDocument(
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
  );
  const bindableDocument = parseMarkdownDocument(
    'components/bindable-properties.md',
    `# Bindable Properties

## Callback bindable

\`\`\`typescript
import { bindable } from 'aurelia';

export class ActionButton {
  @bindable onSelect?: () => void;
}
\`\`\`
`
  );

  const eventAggregatorIndex = buildDocumentSemanticIndex(eventAggregatorDocument);
  const bindableIndex = buildDocumentSemanticIndex(bindableDocument);

  assert.equal(eventAggregatorIndex.sourceCompanionGroups[0]!.disposition, 'capability-reference');
  assert.ok(eventAggregatorIndex.sourceCompanionGroups[0]!.signalNames.includes('event-aggregator'));
  assert.equal(bindableIndex.sourceCompanionGroups[0]!.disposition, 'non-default');
  assert.ok(bindableIndex.sourceCompanionGroups[0]!.signalNames.includes('callback-bindable'));
});

test('semantic index detects router lifecycle, router events, and promise templates', () => {
  const document = parseMarkdownDocument(
    'router/routing-lifecycle.md',
    `# Routing lifecycle

## Route loading

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

## Nested route parameters

\`\`\`typescript
import { resolve } from 'aurelia';
import { IRouteContext, type IRouteViewModel, type Params, type RouteNode } from '@aurelia/router';

export class NestedProjectRoute implements IRouteViewModel {
  private readonly routeContext = resolve(IRouteContext);

  async loading(_params: Params, _next: RouteNode) {
    const routeParams = this.routeContext.getRouteParameters<{
      companyId: string;
      projectId: string;
      tab?: string;
    }>({
      mergeStrategy: 'parent-first',
      includeQueryParams: true
    });

    await Promise.resolve(routeParams.projectId);
  }
}
\`\`\`

## Shell events

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

## Promise panel

\`\`\`html
<div promise.bind="activityPromise">
  <template pending>Loading...</template>
  <template then="items">\${items.length}</template>
  <template catch="error">Failed</template>
</div>
\`\`\`
`
  );

  const index = buildDocumentSemanticIndex(document);
  const signalNames = new Set(index.sourceCompanionGroups.flatMap((group) => group.signalNames));

  assert.ok(signalNames.has('route-lifecycle'));
  assert.ok(signalNames.has('can-load-hook'));
  assert.ok(signalNames.has('loading-hook'));
  assert.ok(signalNames.has('route-parameter'));
  assert.ok(signalNames.has('route-context'));
  assert.ok(signalNames.has('route-parameter-aggregation'));
  assert.ok(signalNames.has('route-parameter-merge-strategy'));
  assert.ok(signalNames.has('route-query-parameters'));
  assert.ok(signalNames.has('router-events'));
  assert.ok(signalNames.has('navigation-start-event'));
  assert.ok(signalNames.has('navigation-end-event'));
  assert.ok(signalNames.has('promise.bind'));
  assert.ok(signalNames.has('promise-pending'));
  assert.ok(signalNames.has('promise-then'));
  assert.ok(signalNames.has('promise-catch'));
});

test('semantic index detects template refs, custom attributes, and active navigation state', () => {
  const document = parseMarkdownDocument(
    'templates/template-syntax/template-references.md',
    `# Template references

## DOM and advanced refs

\`\`\`html
<input ref="searchInput" value.bind="query">
<summary-card component.ref="summaryCard"></summary-card>
<div status-tone custom-attribute.ref="statusTone"></div>
<summary-card controller.ref="summaryController"></summary-card>
\`\`\`

## Custom attribute

\`\`\`typescript
import { bindable, customAttribute, INode, resolve } from 'aurelia';

@customAttribute({ name: 'status-tone', defaultProperty: 'tone' })
export class StatusToneCustomAttribute {
  @bindable tone = 'neutral';
  private readonly host = resolve(INode) as HTMLElement;
}
\`\`\`

## Navigation model

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
  );

  const index = buildDocumentSemanticIndex(document);
  const signalNames = new Set(index.sourceCompanionGroups.flatMap((group) => group.signalNames));

  assert.ok(signalNames.has('template-ref'));
  assert.ok(signalNames.has('component-ref'));
  assert.ok(signalNames.has('custom-attribute-ref'));
  assert.ok(signalNames.has('controller-ref'));
  assert.ok(signalNames.has('custom-attribute'));
  assert.ok(signalNames.has('bindable-component'));
  assert.ok(signalNames.has('host-element'));
  assert.ok(signalNames.has('navigation-model'));
  assert.ok(signalNames.has('active-class-binding'));
  assert.ok(signalNames.has('route-link'));
});
