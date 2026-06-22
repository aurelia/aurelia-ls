import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocsCorpus } from './corpus/corpus-types.js';
import { parseGitBookNavigation } from './corpus/file-system-corpus.js';
import { parseMarkdownDocument } from './corpus/markdown-parser.js';
import {
  fetchAureliaDocs,
  officialAureliaDocsUrl,
  searchAureliaDocs
} from './corpus/docs-reference.js';

test('docs search returns compact section results with official URLs', () => {
  const corpus = fixtureCorpus();

  const result = searchAureliaDocs(corpus, {
    query: 'route parameters loading',
    page: { size: 3 }
  });

  assert.equal(result.query, 'route parameters loading');
  assert.equal(result.page.returnedRows, 3);
  assert.equal(result.corpus.markdownDocumentCount, 5);
  assert.equal(result.items[0]?.documentPath, 'router/route-parameters.md');
  assert.equal(result.items[0]?.sectionAnchor, 'access-parent-and-child-parameters-together');
  assert.equal(
    result.items[0]?.officialUrl,
    'https://docs.aurelia.io/router/route-parameters#access-parent-and-child-parameters-together'
  );
  assert.ok(result.items[0]?.snippet.includes('loading data'));
  assert.ok(result.items.every((item) => !item.documentPath.includes('router-direct')));
});

test('docs search omits router-direct docs from every path shape', () => {
  const corpus = fixtureCorpus();

  const result = searchAureliaDocs(corpus, {
    query: 'router-direct',
    page: { size: 5 }
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.page.returnedRows, 0);
});

test('docs search supports path-prefix filtering and pagination', () => {
  const corpus = fixtureCorpus();

  const first = searchAureliaDocs(corpus, {
    query: 'binding',
    documentPathPrefix: 'templates/',
    page: { size: 1 }
  });
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0]?.documentPath, 'templates/binding.md');
  assert.equal(first.page.nextCursor, 'after:0');

  const second = searchAureliaDocs(corpus, {
    query: 'binding',
    documentPathPrefix: 'templates/',
    page: { size: 1, cursor: first.page.nextCursor }
  });
  assert.equal(second.items.length, 1);
  assert.equal(second.page.cursor, 'after:0');
});

test('docs search size zero returns no cursor loop', () => {
  const corpus = fixtureCorpus();

  const result = searchAureliaDocs(corpus, {
    query: 'binding',
    page: { size: 0 }
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.page.returnedRows, 0);
  assert.equal(result.page.nextCursor, undefined);
});

test('docs search returns no rows for tokenless tiny queries', () => {
  const corpus = fixtureCorpus();

  const result = searchAureliaDocs(corpus, {
    query: 'a',
    page: { size: 3 }
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.page.returnedRows, 0);
  assert.equal(result.page.nextCursor, undefined);
});

test('docs search matches CamelCase API queries against spaced docs titles', () => {
  const corpus = fixtureCorpus();

  const routeContext = searchAureliaDocs(corpus, {
    query: 'getRouteParameters',
    page: { size: 3 }
  });
  assert.equal(routeContext.items[0]?.documentPath, 'router/route-parameters.md');

  const eventAggregator = searchAureliaDocs(corpus, {
    query: 'EventAggregator',
    page: { size: 3 }
  });
  assert.equal(eventAggregator.items[0]?.documentPath, 'aurelia-packages/event-aggregator.md');
});

test('docs search prefers primary authoring docs unless the caller asks for testing', () => {
  const corpus = valueConverterFixtureCorpus();

  const authoring = searchAureliaDocs(corpus, {
    query: 'value converter',
    page: { size: 3 }
  });
  assert.equal(authoring.items[0]?.documentPath, 'templates/value-converters.md');

  const testing = searchAureliaDocs(corpus, {
    query: 'testing value converter',
    page: { size: 3 }
  });
  assert.equal(testing.items[0]?.documentPath, 'developer-guides/testing/testing-value-converters.md');
});

test('docs fetch returns bounded document and section payloads', () => {
  const corpus = fixtureCorpus();

  const section = fetchAureliaDocs(corpus, {
    documentPath: 'router/route-parameters.md',
    sectionAnchor: 'access-parent-and-child-parameters-together'
  });
  assert.equal(section.mode, 'section');
  assert.equal(section.sections.length, 1);
  assert.equal(section.sections[0]?.heading, 'Access parent and child parameters together');
  assert.equal(section.sections[0]?.codeFences[0]?.language, 'typescript');
  assert.ok(section.sections[0]?.codeFences[0]?.code.includes('getRouteParameters'));

  const page = fetchAureliaDocs(corpus, {
    documentPath: 'router/route-parameters.md',
    maxChars: 1000
  });
  assert.equal(page.mode, 'document');
  assert.equal(page.availableSections.some((item) => item.sectionAnchor === 'access-parent-and-child-parameters-together'), true);
  assert.ok(page.sections.length >= 1);
});

test('docs fetch allows explicit excluded docs but marks them with cautions', () => {
  const corpus = fixtureCorpus();

  const result = fetchAureliaDocs(corpus, {
    documentPath: 'router-direct/getting-started.md'
  });

  assert.equal(result.cautions.length, 1);
  assert.match(result.cautions[0]!, /permanently excluded/);

  const nested = fetchAureliaDocs(corpus, {
    documentPath: 'getting-to-know-aurelia/routing/router-direct.md'
  });
  assert.equal(nested.cautions.length, 1);
  assert.match(nested.cautions[0]!, /permanently excluded/);
});

test('official docs URLs normalize README pages and anchors', () => {
  assert.equal(officialAureliaDocsUrl('router/README.md'), 'https://docs.aurelia.io/router');
  assert.equal(
    officialAureliaDocsUrl('templates/template-syntax/template-promises.md', 'promise-bind'),
    'https://docs.aurelia.io/templates/template-syntax/template-promises#promise-bind'
  );
});

function fixtureCorpus(): DocsCorpus {
  const markdownDocuments = [
    parseMarkdownDocument(
      'router/route-parameters.md',
      `# Route Parameters Guide

Route parameters map dynamic URL pieces to runtime data.

## Access parent and child parameters together

Nested routes frequently need identifiers from parent and child segments before loading data.

\`\`\`typescript
import { IRouteContext } from '@aurelia/router';
import { resolve } from 'aurelia';

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
      'router-direct/getting-started.md',
      `# Router Direct

## Route parameters

\`\`\`typescript
import { RouterConfiguration } from '@aurelia/router-direct';
\`\`\`
`
    ),
    parseMarkdownDocument(
      'getting-to-know-aurelia/routing/router-direct.md',
      `# @aurelia/router-direct

## Learning path

Router direct is historical routing documentation.
`
    ),
    parseMarkdownDocument(
      'getting-to-know-aurelia/routing/choosing-a-router.md',
      `# Choosing a router

## Pick @aurelia/router-direct when

This section is historical router-direct comparison material.
`
    ),
    parseMarkdownDocument(
      'templates/binding.md',
      `# Binding

## Value binding

Use value.bind for native input binding.
`
    ),
    parseMarkdownDocument(
      'aurelia-packages/event-aggregator.md',
      `# Event Aggregator

## Using the event aggregator

Inject IEventAggregator when an application deliberately needs pub/sub.
`
    ),
    parseMarkdownDocument(
      'developer-guides/working-with-web-standards.md',
      `# Working with Web Standards

## IEventAggregator for Web API Event Coordination

This section mentions IEventAggregator as one advanced integration option.
`
    )
  ];

  return {
    rootDir: '<fixture>',
    files: [],
    markdownDocuments,
    navigation: parseGitBookNavigation('', markdownDocuments.map((document) => document.relativePath))
  };
}

function valueConverterFixtureCorpus(): DocsCorpus {
  const markdownDocuments = [
    parseMarkdownDocument(
      'templates/value-converters.md',
      `# Value Converters

## Creating value converters

Use a value converter resource to transform display values in a binding expression.
`
    ),
    parseMarkdownDocument(
      'developer-guides/testing/testing-value-converters.md',
      `# Testing Value Converters

## Example value converter

Testing value converters directly keeps formatting behavior covered.
`
    )
  ];

  return {
    rootDir: '<fixture>',
    files: [],
    markdownDocuments,
    navigation: parseGitBookNavigation('', markdownDocuments.map((document) => document.relativePath))
  };
}
