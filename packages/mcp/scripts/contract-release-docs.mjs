import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expectedPatternCatalogCount,
  patternReleaseSentinels,
} from './pattern-sentinels.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const docs = {
  readme: await readPackageFile('README.md'),
  release: await readPackageFile('RELEASE.md'),
  releaseNotes: await readPackageFile('release-notes/mcp-v0.1.0-preview.1.md'),
  aiAuthoring: await readPackageFile('docs/ai-authoring.md'),
  providers: await readPackageFile('docs/providers/README.md'),
};

expectIncludes(docs.readme, 'aurelia_pattern_menu', 'README should name the pattern menu tool.');
expectIncludes(docs.readme, 'aurelia_pattern_example', 'README should name the pattern example tool.');
expectIncludes(docs.readme, 'When authoring new Aurelia code', 'README should teach the authoring-time Patterns workflow.');
expectIncludes(docs.readme, 'support.followUp', 'README should teach pattern follow-up hints.');
expectIncludes(docs.readme, 'aurelia_docs_search', 'README should name docs search.');
expectIncludes(docs.readme, 'aurelia_docs_fetch', 'README should name docs fetch.');
expectIncludes(docs.readme, `${expectedPatternCatalogCount} patterns`, 'README should state the guarded pattern catalog size.');
expectIncludes(docs.readme, 'AUR0713', 'README should mention removed Aurelia 1 binding-command diagnostics.');
expectIncludes(docs.readme, '.delegate', 'README should mention the removed .delegate diagnostic.');
expectIncludes(docs.readme, '.call', 'README should mention the removed .call diagnostic.');
expectIncludes(docs.readme, 'docs/ai-authoring.md', 'README should link persistent AI authoring guidance.');
for (const sentinel of patternReleaseSentinels) {
  expectIncludes(docs.readme, sentinel.patternId, `README should name catalog sentinel ${sentinel.patternId}.`);
}

expectIncludes(docs.release, 'support.followUp', 'Release checklist should probe pattern example follow-up hints.');
expectIncludes(docs.release, 'aurelia_docs_search', 'Release checklist should probe docs search.');
expectIncludes(docs.release, 'aurelia_docs_fetch', 'Release checklist should probe docs fetch.');
expectIncludes(docs.release, 'release:pack', 'Release checklist should build the release tarball before probing it.');
expectIncludes(docs.release, 'contract:release', 'Release checklist should run the aggregate MCP release contract.');
expectIncludes(docs.release, 'probe:release-tarball', 'Release checklist should probe the packaged tarball.');
expectIncludes(docs.release, 'probe:project-local-install', 'Release checklist should probe the recommended project-local install path.');
expectIncludes(docs.release, 'semantic-runtime app diagnostics', 'Release checklist should mention semantic-runtime diagnostics over pattern examples.');
expectIncludes(docs.release, `${expectedPatternCatalogCount} patterns`, 'Release checklist should state the guarded pattern catalog size.');
expectIncludes(docs.release, 'docs/ai-authoring.md', 'Release checklist should link persistent AI authoring guidance.');
for (const sentinel of patternReleaseSentinels) {
  expectIncludes(docs.release, sentinel.patternId, `Release checklist should name catalog sentinel ${sentinel.patternId}.`);
}

expectIncludes(docs.releaseNotes, 'Aurelia Patterns And Docs', 'Release notes should describe the current pattern/docs surface.');
expectIncludes(docs.releaseNotes, 'aurelia_pattern_menu', 'Release notes should name the pattern menu tool.');
expectIncludes(docs.releaseNotes, 'aurelia_pattern_example', 'Release notes should name the pattern example tool.');
expectIncludes(docs.releaseNotes, 'When authoring new Aurelia code', 'Release notes should teach the authoring-time Patterns workflow.');
expectIncludes(docs.releaseNotes, 'support.followUp', 'Release notes should name pattern follow-up hints.');
expectIncludes(docs.releaseNotes, 'aurelia_docs_search', 'Release notes should name docs search.');
expectIncludes(docs.releaseNotes, 'aurelia_docs_fetch', 'Release notes should name docs fetch.');
expectIncludes(docs.releaseNotes, 'no runtime web requests', 'Release notes should state bundled docs need no runtime web requests.');
expectIncludes(docs.releaseNotes, `${expectedPatternCatalogCount} patterns`, 'Release notes should state the guarded pattern catalog size.');
expectIncludes(docs.releaseNotes, 'AUR0713', 'Release notes should mention removed Aurelia 1 binding-command diagnostics.');
expectIncludes(docs.releaseNotes, '.delegate', 'Release notes should mention the removed .delegate diagnostic.');
expectIncludes(docs.releaseNotes, '.call', 'Release notes should mention the removed .call diagnostic.');
expectIncludes(docs.releaseNotes, 'docs/ai-authoring.md', 'Release notes should link persistent AI authoring guidance.');
for (const sentinel of patternReleaseSentinels) {
  expectIncludes(docs.releaseNotes, sentinel.patternId, `Release notes should name catalog sentinel ${sentinel.patternId}.`);
}

expectIncludes(docs.providers, '../ai-authoring.md', 'Provider setup docs should link persistent AI authoring guidance.');
expectIncludes(docs.providers, 'support.followUp', 'Provider setup docs should mention pattern follow-up verification.');

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

for (const [name, text] of Object.entries(docs)) {
  expectNotIncludes(text, 'aurelia_app_builder', `${name} should not advertise retired app-builder tool names.`);
  expectNotIncludes(text, 'aurelia://semantic-runtime/app-builder', `${name} should not advertise retired app-builder resources.`);
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
