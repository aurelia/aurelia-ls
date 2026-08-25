import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expectedPatternCatalogCount,
  patternReleaseSentinels,
} from './pattern-sentinels.mjs';

const sourceReleaseVersion = '0.3.0';
const publishedReleaseVersion = '0.3.0';
const historicalReleaseVersion = '0.2.0';
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const workspacePackage = JSON.parse(await readWorkspaceFile('package.json'));
const mcpPackage = JSON.parse(await readPackageFile('package.json'));

const sourceTag = `mcp-v${sourceReleaseVersion}`;
const sourceTarball = `aurelia-ls-mcp-${sourceReleaseVersion}.tgz`;
const sourceNotesPath = `release-notes/mcp-v${sourceReleaseVersion}.md`;
const publishedTag = `mcp-v${publishedReleaseVersion}`;
const publishedTarball = `aurelia-ls-mcp-${publishedReleaseVersion}.tgz`;
const historicalTarball = `aurelia-ls-mcp-${historicalReleaseVersion}.tgz`;
const historicalHostedReleaseFragments = [
  `releases/tag/mcp-v${historicalReleaseVersion}`,
  `releases/download/mcp-v${historicalReleaseVersion}`,
  historicalTarball,
];
const taggedBaselineQueryKindCount = 73;
const providerGuidePaths = [
  'docs/providers/README.md',
  'docs/providers/claude-code.md',
  'docs/providers/claude-desktop.md',
  'docs/providers/codex.md',
  'docs/providers/cursor.md',
  'docs/providers/vscode.md',
];

const toolNames = [
  'aurelia_workspace_overview',
  'aurelia_project_configurations',
  'aurelia_analysis_cache_overview',
  'aurelia_clear_analysis_cache',
  'aurelia_app_query_catalog',
  'aurelia_app_overview',
  'aurelia_router_overview',
  'aurelia_app_query',
  'aurelia_app_query_batch',
  'aurelia_open_seam_overview',
  'aurelia_diagnostic_overview',
  'aurelia_app_diagnostics',
  'aurelia_template_cursor_info',
  'aurelia_template_completions',
  'aurelia_template_diagnostics',
  'aurelia_pattern_menu',
  'aurelia_pattern_example',
  'aurelia_docs_search',
  'aurelia_docs_fetch',
];

if (toolNames.length !== 19 || new Set(toolNames).size !== 19) {
  throw new Error('MCP release docs should guard exactly 19 distinct named tools.');
}

const addedQueryKinds = [
  'analysis-limitations',
  'template-document-ownership',
  'resource-inventory',
  'template-resource-availability',
  'framework-capability-explanation',
  'binding-uncertainty-explanation',
  'resource-availability-explanation',
  'attribute-interpretation-explanation',
  'template-references',
  'template-rename',
  'template-rename-from-typescript',
  'template-code-actions',
  'template-semantic-tokens',
  'template-folding-ranges',
  'template-inlay-hints',
  'template-content-projections',
  'value-converter-applications',
  'runtime-expression-access-uses',
];

if (addedQueryKinds.length !== 18 || new Set(addedQueryKinds).size !== 18) {
  throw new Error('MCP release docs should guard exactly 18 distinct added app-query kinds.');
}

const sourceToolNames = extractObjectStringValues(
  await readPackageFile('src/tool-contracts.ts'),
  'aureliaMcpToolNames',
);
expectSameStringSet(
  sourceToolNames,
  toolNames,
  'MCP release docs tool list should match aureliaMcpToolNames.',
);

const sourceQueryKinds = extractEnumStringValues(
  await readWorkspaceFile('packages/semantic-runtime/src/api/contracts.ts'),
  'SemanticAppQueryKind',
);
if (
  sourceQueryKinds.length !== taggedBaselineQueryKindCount + addedQueryKinds.length
  || new Set(sourceQueryKinds).size !== sourceQueryKinds.length
) {
  throw new Error(
    `MCP release docs expect ${taggedBaselineQueryKindCount + addedQueryKinds.length} distinct source app-query kinds; found ${new Set(sourceQueryKinds).size} distinct across ${sourceQueryKinds.length} entries.`,
  );
}
for (const queryKind of addedQueryKinds) {
  if (!sourceQueryKinds.includes(queryKind)) {
    throw new Error(`Documented added app-query kind is absent from source: ${queryKind}`);
  }
}

const providerGuides = Object.fromEntries(await Promise.all(providerGuidePaths.map(async (relativePath) => [
  relativePath,
  await readPackageFile(relativePath),
])));

const docs = {
  rootReadme: await readWorkspaceFile('README.md'),
  gettingStarted: await readWorkspaceFile('docs/getting-started.md'),
  ciWorkflow: await readWorkspaceFile('.github/workflows/ci.yml'),
  readme: await readPackageFile('README.md'),
  release: await readPackageFile('RELEASE.md'),
  releaseNotes: await readPackageFile(sourceNotesPath),
  historicalReleaseNotes: await readPackageFile(`release-notes/mcp-v${historicalReleaseVersion}.md`),
  reference: await readPackageFile(`docs/reference-v${sourceReleaseVersion}.md`),
  aiAuthoring: await readPackageFile('docs/ai-authoring.md'),
  providers: providerGuides['docs/providers/README.md'],
  orientation: await readPackageFile('src/orientation.ts'),
  prompts: await readPackageFile('src/prompts.ts'),
};

if (mcpPackage.version !== sourceReleaseVersion) {
  throw new Error(`MCP source package should identify the ${sourceReleaseVersion} release target.`);
}

// Root/setup docs continue to identify the actually hosted tarball until their
// repository-wide documentation pass promotes the new release.
expectIncludes(docs.rootReadme, publishedTag, 'Root README should point to the published MCP release tag.');
expectIncludes(docs.rootReadme, publishedTarball, 'Root README should point to the published MCP release tarball.');
expectIncludes(docs.rootReadme, 'Aurelia Patterns', 'Root README should mention the Patterns surface shipped in the MCP release.');
expectIncludes(docs.rootReadme, 'bundled Aurelia docs', 'Root README should mention bundled docs grounding.');
expectIncludes(docs.rootReadme, `packages/mcp/release-notes/mcp-v${publishedReleaseVersion}.md`, 'Root README should link the published MCP release notes.');
expectIncludes(docs.rootReadme, 'pnpm bootstrap:aurelia', 'Root README should document linked Aurelia dependency bootstrap.');
expectIncludes(docs.gettingStarted, 'MCP Release', 'Getting Started should describe the published MCP release.');
expectIncludes(docs.gettingStarted, publishedTag, 'Getting Started should point to the published MCP release tag.');
expectIncludes(docs.gettingStarted, publishedTarball, 'Getting Started should point to the published MCP release tarball.');

if (workspacePackage?.scripts?.['bootstrap:aurelia'] !== 'npm --prefix aurelia ci --ignore-scripts && npm --prefix aurelia run build') {
  throw new Error('Root bootstrap:aurelia should install without lifecycle scripts and then build the linked Aurelia dependency closure.');
}

expectIncludes(docs.ciWorkflow, 'mcp-release', 'CI workflow should use release wording for the MCP job id.');
expectIncludes(docs.ciWorkflow, 'MCP Release Pack', 'CI workflow should use release wording for the MCP job name.');
expectIncludes(docs.ciWorkflow, 'Pack MCP release tarball', 'CI workflow should use release wording for the pack step.');
expectIncludes(docs.ciWorkflow, 'aurelia-ls-mcp-release', 'CI artifact name should use release wording.');
expectIncludes(docs.ciWorkflow, 'pnpm --filter @aurelia-ls/mcp contract:release-docs', 'CI workflow should run the MCP release-document contract.');
expectIncludes(docs.ciWorkflow, 'pnpm --filter @aurelia-ls/mcp contract:adversarial-surface', 'CI workflow should run the MCP adversarial-surface contract.');
expectIncludes(docs.ciWorkflow, 'pnpm --filter @aurelia-ls/mcp contract:patterns-semantic', 'CI workflow should run the MCP pattern-semantic contract.');
expectIncludes(docs.ciWorkflow, 'pnpm --filter @aurelia-ls/mcp contract:continuation-pass-through', 'CI workflow should run the MCP continuation contract.');
expectIncludes(docs.ciWorkflow, 'pnpm --filter @aurelia-ls/mcp release:pack', 'CI workflow should pack the MCP release tarball.');
expectOccurrenceCount(docs.ciWorkflow, 'run: pnpm bootstrap:aurelia', 5, 'All five CI job definitions should bootstrap linked Aurelia dependencies before their contracts.');

expectIncludes(docs.readme, 'Latest published release', 'README should distinguish the hosted release from source.');
if (publishedReleaseVersion === sourceReleaseVersion) {
  expectNotIncludes(docs.readme, 'Current source and next release target', 'README should remove transition wording once the source release is published.');
} else {
  expectIncludes(docs.readme, 'Current source and next release target', 'README should identify the pending source protocol version.');
}
expectIncludes(docs.readme, publishedTag, 'README install guidance should identify the hosted release.');
expectIncludes(docs.readme, `reference-v${sourceReleaseVersion}.md`, 'README should link the versioned source protocol reference.');
expectIncludes(docs.readme, `mcp-v${sourceReleaseVersion}.md`, 'README should link the next release notes.');
expectIncludes(docs.readme, 'no project-file writes', 'README should state the project-write boundary.');
expectIncludes(docs.readme, 'cache-clear tool', 'README should distinguish analyzer-state mutation from project writes.');
expectIncludes(docs.readme, 'support.followUp', 'README should teach pattern follow-up hints.');
expectIncludes(docs.readme, 'docs/ai-authoring.md', 'README should link persistent AI authoring guidance.');
expectIncludes(docs.readme, 'pnpm bootstrap:aurelia', 'README should document linked Aurelia dependency bootstrap.');
for (const toolName of toolNames) {
  expectIncludes(docs.readme, toolName, `README should name MCP tool ${toolName}.`);
  expectIncludes(docs.reference, toolName, `Versioned reference should name MCP tool ${toolName}.`);
}

expectIncludes(docs.release, sourceTag, 'Release checklist should use the source release tag.');
expectIncludes(docs.release, sourceTarball, 'Release checklist should use the source release tarball.');
expectIncludes(docs.release, sourceNotesPath, 'Release checklist should use the source release notes.');
expectIncludes(docs.release, 'Promote Published Documentation', 'Release checklist should require hosted-reference promotion before tagging.');
expectIncludes(docs.release, 'publishedReleaseVersion', 'Release checklist should name the release-doc contract promotion switch.');
expectIncludes(docs.release, 'support.followUp', 'Release checklist should probe pattern example follow-up hints.');
expectIncludes(docs.release, 'aurelia_docs_search', 'Release checklist should probe docs search.');
expectIncludes(docs.release, 'aurelia_docs_fetch', 'Release checklist should probe docs fetch.');
expectIncludes(docs.release, 'release:pack', 'Release checklist should build the release tarball before probing it.');
expectIncludes(docs.release, 'contract:release', 'Release checklist should run the aggregate MCP release contract.');
expectIncludes(docs.release, 'probe:release-tarball', 'Release checklist should probe the packaged tarball.');
expectIncludes(docs.release, 'probe:project-local-install', 'Release checklist should probe the recommended project-local install path.');
expectNotIncludes(docs.release, '--prerelease', `Release upload flow should publish ${sourceReleaseVersion} as a normal GitHub release.`);
expectIncludes(docs.release, 'semantic-runtime app diagnostics', 'Release checklist should mention semantic-runtime diagnostics over pattern examples.');
expectIncludes(docs.release, `${expectedPatternCatalogCount} patterns`, 'Release checklist should state the guarded pattern catalog size.');
expectIncludes(docs.release, 'docs/ai-authoring.md', 'Release checklist should link persistent AI authoring guidance.');
for (const sentinel of patternReleaseSentinels) {
  expectIncludes(docs.release, sentinel.patternId, `Release checklist should name catalog sentinel ${sentinel.patternId}.`);
}

for (const fragment of [
  'Required Client Migration',
  'aurelia_project_configurations',
  'workspaceDescriptor',
  'projectRootHints',
  'excludedWorkspaceRoots',
  'storeKey',
  'projects',
  'projectDiscovery',
  'aurelia_analysis_cache_overview',
  'aurelia_clear_analysis_cache',
  'optional nested `workspace` selector',
  'aurelia_app_query_catalog',
  'aurelia_template_cursor_info',
  'aurelia_open_seam_overview',
  'Remove `page`',
  '`detail`',
  '`result`',
  '`selection`',
  '`coverage`',
  '`outcome`',
  'byteClamped=true',
  'retryAction=reissue-tool',
  'no project-file writes',
]) {
  expectIncludes(docs.releaseNotes, fragment, `Release notes should cover required 0.3 contract fact: ${fragment}`);
}
expectIncludes(docs.releaseNotes, '73 to 91', 'Release notes should state the semantic query-kind delta.');
expectIncludes(docs.releaseNotes, 'named tool', 'Release notes should distinguish named tools from query kinds.');
expectIncludes(docs.releaseNotes, 'Project Configuration V1', 'Release notes should name the final project configuration contract.');
expectIncludes(docs.releaseNotes, 'Aurelia Patterns', 'Release notes should retain the Patterns/docs release surface.');
expectIncludes(docs.releaseNotes, 'docs/ai-authoring.md', 'Release notes should link persistent AI authoring guidance.');
expectIncludes(docs.releaseNotes, `blob/${sourceTag}/packages/mcp/docs/reference-v${sourceReleaseVersion}.md`, 'Hosted release notes should link the tag-pinned protocol reference.');
expectIncludes(docs.releaseNotes, `blob/${sourceTag}/packages/mcp/docs/providers/README.md`, 'Hosted release notes should link tag-pinned provider guidance.');
for (const queryKind of addedQueryKinds) {
  expectIncludes(docs.releaseNotes, queryKind, `Release notes should name added app-query kind ${queryKind}.`);
  expectIncludes(docs.reference, queryKind, `Versioned reference should name added app-query kind ${queryKind}.`);
}

for (const fragment of [
  'Shared Workspace Input',
  'Response Envelope',
  'Project Configuration',
  'App Queries',
  'Paging And Continuations',
  'Managed Sessions And Cache Control',
  'Errors And Currentness',
  'Project-Write And Analysis Boundary',
  'result',
  'selection',
  'coverage',
  'retryAction',
  'reissue-tool',
  '-32602',
  'invalid-params',
]) {
  expectIncludes(docs.reference, fragment, `Versioned reference should cover protocol fact: ${fragment}`);
}

expectIncludes(docs.historicalReleaseNotes, `# Aurelia MCP ${historicalReleaseVersion}`, `Historical ${historicalReleaseVersion} release notes should remain available.`);
expectIncludes(docs.historicalReleaseNotes, historicalTarball, `Historical ${historicalReleaseVersion} release notes should retain their release asset.`);
expectIncludes(docs.providers, '../ai-authoring.md', 'Provider setup docs should link persistent AI authoring guidance.');
expectIncludes(docs.providers, 'support.followUp', 'Provider setup docs should mention pattern follow-up verification.');
for (const [relativePath, content] of Object.entries(providerGuides)) {
  expectIncludes(content, publishedTag, `${relativePath} should point to the published MCP release tag.`);
  expectIncludes(content, publishedTarball, `${relativePath} should point to the published MCP release tarball.`);
}
if (publishedReleaseVersion === sourceReleaseVersion && historicalReleaseVersion !== sourceReleaseVersion) {
  const currentInstallSurfaces = {
    rootReadme: docs.rootReadme,
    gettingStarted: docs.gettingStarted,
    readme: docs.readme,
    ...providerGuides,
  };
  for (const [name, content] of Object.entries(currentInstallSurfaces)) {
    for (const fragment of historicalHostedReleaseFragments) {
      expectNotIncludes(content, fragment, `${name} should not retain the ${historicalReleaseVersion} hosted release after publication promotion.`);
    }
  }
}

for (const [fragment, message] of [
  ['Aurelia Agent Instructions', 'AI authoring guide should expose a copyable instruction block.'],
  ['aurelia_pattern_menu', 'AI authoring guide should name the pattern menu tool.'],
  ['aurelia_pattern_example', 'AI authoring guide should name the pattern example tool.'],
  ['aurelia_docs_search', 'AI authoring guide should name docs search.'],
  ['aurelia_docs_fetch', 'AI authoring guide should name docs fetch.'],
  ['support.followUp', 'AI authoring guide should teach pattern follow-up hints.'],
  ['semantic-runtime diagnostics', 'AI authoring guide should teach semantic-runtime verification.'],
  ['AUR0713', 'AI authoring guide should mention removed Aurelia 1 binding-command diagnostics.'],
  ['.delegate', 'AI authoring guide should mention the removed .delegate diagnostic.'],
  ['.call', 'AI authoring guide should mention the removed .call diagnostic.'],
  ['Aurelia DI', 'AI authoring guide should teach DI-owned shared state.'],
  ['EventAggregator', 'AI authoring guide should discourage EventAggregator as a default communication path.'],
  ['callback bindables', 'AI authoring guide should discourage callback bindables as default communication.'],
  ['canLoad', 'AI authoring guide should teach route entry decisions.'],
  ['loading()', 'AI authoring guide should teach route-critical loading.'],
  ['promise.bind', 'AI authoring guide should teach secondary async content.'],
  ['IRouteContext.getRouteParameters()', 'AI authoring guide should teach route-context parameter aggregation.'],
  ['validation-plugin', 'AI authoring guide should name validation as a deferred/docs-first lane.'],
  ['dialog/modal', 'AI authoring guide should name dialog/modal as a deferred lane.'],
  ['@aurelia/router-direct', 'AI authoring guide should exclude router-direct for new public guidance.'],
  ['app-builder', 'AI authoring guide should exclude the old app-builder public grammar.'],
  ['source-lowering', 'AI authoring guide should exclude the old source-lowering public grammar.'],
]) {
  expectIncludes(docs.aiAuthoring, fragment, message);
}

expectIncludes(docs.orientation, 'makes no project-file writes', 'MCP orientation should state the project-write boundary.');
expectIncludes(docs.orientation, 'cache-clear tool', 'MCP orientation should name analyzer-state mutation.');
expectNotIncludes(docs.orientation, 'The MCP tools are read-only', 'MCP orientation should not call cache management read-only.');
expectNotIncludes(docs.prompts, 'read-only semantic-runtime', 'MCP prompt metadata should not overstate cache-tool annotations.');

for (const [name, content] of Object.entries(docs)) {
  expectNotIncludes(content, 'aurelia_app_builder', `${name} should not advertise retired app-builder tool names.`);
  expectNotIncludes(content, 'aurelia://semantic-runtime/app-builder', `${name} should not advertise retired app-builder resources.`);
  for (const staleReleaseFragment of [
    'mcp-v0.1.0-preview.1',
    '0.1.0-preview.1',
    'mcp-v0.1.0-preview.2',
    '0.1.0-preview.2',
    'aurelia-ls-mcp-preview',
    'MCP Preview',
    'preview tarball',
  ]) {
    expectNotIncludes(content, staleReleaseFragment, `${name} should not contain stale MCP release fragment: ${staleReleaseFragment}`);
  }
}

for (const stalePhrase of [
  'Experimental App-Builder Surface',
  'app-builder/source-guidance surface',
  'app-builder query family',
  'lowering guidance',
]) {
  expectNotIncludes(docs.releaseNotes, stalePhrase, `Release notes should not contain stale phrase: ${stalePhrase}`);
}

console.log('MCP release docs contract passed.');

async function readPackageFile(relativePath) {
  return fs.readFile(path.join(packageRoot, relativePath), 'utf8');
}

async function readWorkspaceFile(relativePath) {
  return fs.readFile(path.join(workspaceRoot, relativePath), 'utf8');
}

function expectIncludes(text, fragment, message) {
  if (!text.includes(fragment)) {
    throw new Error(message);
  }
}

function expectNotIncludes(text, fragment, message) {
  if (text.includes(fragment)) {
    throw new Error(message);
  }
}

function expectOccurrenceCount(text, fragment, expectedCount, message) {
  const actualCount = text.split(fragment).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`${message} Expected ${expectedCount}, found ${actualCount}.`);
  }
}

function extractObjectStringValues(source, objectName) {
  const match = source.match(new RegExp(`export const ${objectName} = \\{([\\s\\S]*?)\\n\\} as const;`));
  if (match?.[1] == null) {
    throw new Error(`Could not read source object ${objectName}.`);
  }
  return [...match[1].matchAll(/:\s*'([^']+)'/g)].map((row) => row[1]);
}

function extractEnumStringValues(source, enumName) {
  const match = source.match(new RegExp(`export const enum ${enumName} \\{([\\s\\S]*?)\\n\\}`));
  if (match?.[1] == null) {
    throw new Error(`Could not read source enum ${enumName}.`);
  }
  return [...match[1].matchAll(/=\s*'([^']+)'/g)].map((row) => row[1]);
}

function expectSameStringSet(actual, expected, message) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const unexpected = actual.filter((value) => !expectedSet.has(value));
  if (actual.length !== actualSet.size || expected.length !== expectedSet.size || missing.length > 0 || unexpected.length > 0) {
    throw new Error(`${message} Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`);
  }
}
