import path from 'node:path';

import type { AssuranceScenario } from '@aurelia-ls/aot-assurance';

import type { BenchmarkBuildApplication } from './build.js';

export interface BenchmarkPortfolioApplication extends BenchmarkBuildApplication {
  readonly role: 'runtime' | 'size-closure';
  readonly assuranceScenario: AssuranceScenario | null;
  readonly headlineSize: boolean;
}

export function benchmarkPortfolioApplications(repositoryRoot: string): readonly BenchmarkPortfolioApplication[] {
  const root = path.resolve(repositoryRoot);
  const benchmarkPackage = path.join(root, 'packages', 'aot-benchmarks');
  const repeatRoot = path.join(benchmarkPackage, 'fixtures', 'repeat');
  const keyedRoot = path.join(benchmarkPackage, 'fixtures', 'keyed-table');
  const storefrontBenchmarkRoot = path.join(benchmarkPackage, 'fixtures', 'storefront');
  const storefrontRoot = path.join(
    root,
    'packages',
    'semantic-runtime',
    'fixtures',
    'pressure',
    'app-pattern-routed-catalog-storefront',
  );
  const stateFormRoot = path.join(
    root,
    'packages',
    'semantic-runtime',
    'fixtures',
    'pressure',
    'app-pattern-state-backed-form',
  );
  const storefrontConventionInclude = `${toPosixPath(root)}/packages/{aot-benchmarks/fixtures/storefront,semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront}/**/*.{ts,js,html}`;
  return [
    {
      id: 'app-repeat-view',
      role: 'runtime',
      assuranceScenario: null,
      headlineSize: true,
      root: path.join(repeatRoot, 'benchmarks', 'app-repeat-view'),
      sourceRoot: path.join(repeatRoot, 'benchmarks', 'app-repeat-view'),
      input: {
        kind: 'library-single',
        entry: path.join(repeatRoot, 'benchmarks', 'app-repeat-view', 'index.js'),
      },
      nominatedEntry: {
        sourceFilePath: path.join(repeatRoot, 'benchmarks', 'app-repeat-view', 'index.js'),
        callable: { kind: 'export', name: 'start' },
        arguments: [
          { kind: 'host-environment', path: "document.querySelector('#app')" },
          { kind: 'primitive', value: 1_000 },
        ],
      },
      runtimeConfiguration: 'require-replaceable',
    },
    {
      id: 'app-repeat-realistic',
      role: 'runtime',
      assuranceScenario: null,
      headlineSize: true,
      root: path.join(repeatRoot, 'benchmarks', 'app-repeat-realistic'),
      sourceRoot: path.join(repeatRoot, 'benchmarks', 'app-repeat-realistic'),
      input: {
        kind: 'library-single',
        entry: path.join(repeatRoot, 'benchmarks', 'app-repeat-realistic', 'index.js'),
      },
      nominatedEntry: {
        sourceFilePath: path.join(repeatRoot, 'benchmarks', 'app-repeat-realistic', 'index.js'),
        callable: { kind: 'export', name: 'start' },
        arguments: [
          { kind: 'host-environment', path: "document.querySelector('#app')" },
          { kind: 'array', elements: [] },
        ],
      },
      runtimeConfiguration: 'require-replaceable',
    },
    {
      id: 'keyed-table-optics',
      role: 'runtime',
      assuranceScenario: null,
      headlineSize: true,
      root: keyedRoot,
      sourceRoot: path.join(keyedRoot, 'src'),
      input: { kind: 'library-single', entry: path.join(keyedRoot, 'src', 'main.ts') },
      nominatedEntry: {
        sourceFilePath: path.join(keyedRoot, 'src', 'main.ts'),
        callable: { kind: 'export', name: 'startKeyedTableApplication' },
        arguments: [{ kind: 'host-environment', path: "document.querySelector('keyed-table-app')" }],
      },
      runtimeConfiguration: 'require-replaceable',
    },
    {
      id: 'routed-storefront-benchmark',
      role: 'runtime',
      assuranceScenario: null,
      headlineSize: false,
      root: storefrontBenchmarkRoot,
      sourceRoot: storefrontBenchmarkRoot,
      input: {
        kind: 'library-single',
        entry: path.join(storefrontBenchmarkRoot, 'benchmark-entry.ts'),
      },
      nominatedEntry: {
        sourceFilePath: path.join(storefrontBenchmarkRoot, 'benchmark-entry.ts'),
        callable: { kind: 'export', name: 'createStorefrontBenchmarkApplication' },
        arguments: [{ kind: 'host-environment', path: "document.querySelector('[data-storefront-benchmark-host]')" }],
      },
      runtimeConfiguration: 'require-replaceable',
      conventionInclude: storefrontConventionInclude,
    },
    htmlApplication('hello-world', path.join(root, 'fixtures', 'hello-world'), 'hello-world'),
    htmlApplication('state-backed-form', stateFormRoot, 'state-backed-form'),
    htmlApplication('projects-and-milestones', path.join(root, 'fixtures', 'projects-and-milestones'), 'projects-and-milestones'),
    htmlApplication('routed-storefront', storefrontRoot, 'routed-storefront'),
  ];
}

function htmlApplication(
  id: string,
  root: string,
  assuranceScenario: AssuranceScenario,
): BenchmarkPortfolioApplication {
  return {
    id,
    role: 'size-closure',
    assuranceScenario,
    headlineSize: true,
    root,
    sourceRoot: path.join(root, 'src'),
    input: { kind: 'html-app', entryHtml: path.join(root, 'index.html') },
    runtimeConfiguration: 'require-replaceable',
  };
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
