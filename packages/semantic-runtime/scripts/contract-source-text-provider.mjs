import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-minimal-app');
const htmlPath = path.join(fixtureRoot, 'src/app.html');
const tsPath = path.join(fixtureRoot, 'src/app.ts');
const resourceMetadataFixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-metadata-errors');
const resourceMetadataTsPath = path.join(resourceMetadataFixtureRoot, 'src/resource-metadata-errors-app.ts');

const originalHtml = fs.readFileSync(htmlPath, 'utf8');
const originalTs = fs.readFileSync(tsPath, 'utf8');
assert.match(originalHtml, /\$\{message\}/u);
assert.match(originalTs, /message = 'Hello semantic runtime'/u);

const htmlText = originalHtml.replace('${message}', '${t}');
const tsText = originalTs.replace("message = 'Hello semantic runtime'", "title = 'Edited in memory'");
const overlays = new Map([
  [normalizedPath(htmlPath), htmlText],
  [normalizedPath(tsPath), tsText],
]);

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:source-text-provider',
  sourceTextProvider: {
    readFile(fileName) {
      return overlays.get(normalizedPath(fileName));
    },
    fileExists(fileName) {
      return overlays.has(normalizedPath(fileName)) ? true : undefined;
    },
  },
});

const completion = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCompletions,
  cursor: cursorAfter(htmlText, '${t'),
  page: { size: 20 },
  appRetention: 'dispose-app',
});

assert.equal(completion.outcome, 'hit');
assert.equal(completion.value.siteKind, 'expression');
const candidateNames = completion.value.candidates.map((candidate) => candidate.name);
assert.ok(candidateNames.includes('title'), `Expected provider-backed title completion; observed ${candidateNames.join(', ') || 'none'}.`);
assert.equal(
  candidateNames.includes('message'),
  false,
  `Expected disk-only message completion to disappear when app.ts is provided from memory; observed ${candidateNames.join(', ') || 'none'}.`,
);

const resourceMetadataText = fs.readFileSync(resourceMetadataTsPath, 'utf8');
const resourceMetadataRuntime = await createSemanticRuntime({
  workspaceRoot: resourceMetadataFixtureRoot,
  storeKey: 'contract:source-text-provider:resource-metadata',
  sourceTextProvider: {
    readFile(fileName) {
      return normalizedPath(fileName) === normalizedPath(resourceMetadataTsPath)
        ? resourceMetadataText
        : undefined;
    },
    fileExists(fileName) {
      return normalizedPath(fileName) === normalizedPath(resourceMetadataTsPath)
        ? true
        : undefined;
    },
  },
});
const resourceMetadataDiagnostics = await resourceMetadataRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.AppDiagnostics,
  sourceFilePath: resourceMetadataTsPath,
  sourceFile: { filePath: resourceMetadataTsPath },
  page: { size: 200 },
  inquiryProfile: 'lsp-diagnostics',
  diagnosticProjection: 'type-projection',
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
const resourceMetadataRows = resourceMetadataDiagnostics.value.rows;
assert.equal(resourceMetadataRows.length, 27);
assert.ok(
  resourceMetadataRows.some((row) => row.diagnosticDomain === 'resource'),
  'Expected source-provider resource metadata diagnostics to retain resource-domain rows.',
);
assert.ok(
  resourceMetadataRows.some((row) => row.diagnosticDomain === 'template'),
  'Expected source-provider resource metadata diagnostics to retain template-domain rows.',
);
assert.ok(
  resourceMetadataRows.some((row) => row.diagnosticDomain === 'typescript'),
  'Expected source-provider resource metadata diagnostics to retain TypeScript rows.',
);
assert.ok(
  resourceMetadataRows.some((row) => row.frameworkErrorCode === 'AUR0717'),
  'Expected source-provider resource metadata diagnostics to retain inline template compiler rows.',
);

console.log(JSON.stringify({
  ok: true,
  sourceTextProvider: {
    overlaidFiles: [...overlays.keys()].map((fileName) => path.relative(fixtureRoot, fileName).replace(/\\/g, '/')),
    completionOutcome: completion.outcome,
    candidateNames,
    resourceMetadataDiagnostics: {
      rows: resourceMetadataRows.length,
      domains: [...new Set(resourceMetadataRows.map((row) => row.diagnosticDomain))],
    },
  },
}, null, 2));

function cursorAfter(text, marker) {
  const markerOffset = text.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker ${marker}.`);
  const offset = markerOffset + marker.length;
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath: 'src/app.html',
    line: lines.length - 1,
    character: lines.at(-1).length,
    offset,
  };
}

function normalizedPath(fileName) {
  return path.resolve(fileName).replace(/\\/g, '/').toLowerCase();
}
