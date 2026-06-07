import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appBuilderGeneratedFixtureDetailRequest,
  appBuilderGeneratedFixturePublicResponseSnapshot,
  normalizeFixtureRootValue,
} from './app-builder-generated-fixture-snapshots.mjs';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  FixtureVerificationRequest,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  answerSemanticRuntimeAppBuilderQuery,
  createSemanticRuntime,
  readFixtureVerificationSnapshot,
  sourcePlanHasCompleteText,
  verifyFixtureEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const defaultManifestRoots = [
  path.join(packageRoot, 'fixtures/app-builder'),
  path.join(packageRoot, 'fixtures/pressure'),
];

const writeVerificationSnapshots = process.argv.includes('--write');
const requestedRootArgs = process.argv.slice(2).filter((arg) => arg !== '--write');
const requestedRoots = await Promise.all(requestedRootArgs.map(resolveRequestedRoot));
const manifests = requestedRoots.length > 0
  ? await discoverManifestFiles(requestedRoots)
  : await discoverManifestFiles(defaultManifestRoots);
const results = [];

for (const manifestPath of manifests) {
  results.push(await verifyFixtureManifest(manifestPath, { writeVerificationSnapshots }));
}

const failed = results.filter((result) => !result.ok);
const summary = {
  ok: failed.length === 0 && (requestedRoots.length === 0 || results.length > 0),
  fixtureCount: results.length,
  fixtures: results,
};

if (!summary.ok) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

async function discoverManifestFiles(roots) {
  const discovered = [];
  for (const root of roots) {
    await collectManifestFiles(root, discovered);
  }
  return discovered.sort();
}

async function resolveRequestedRoot(arg) {
  if (path.isAbsolute(arg)) {
    return path.resolve(arg);
  }
  const candidates = [
    path.resolve(packageRoot, arg),
    path.resolve(workspaceRoot, arg),
    path.resolve(process.cwd(), arg),
  ];
  for (const candidate of candidates) {
    if (await isManifestRoot(candidate) || await directoryExists(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

async function isManifestRoot(root) {
  return await fileExists(root) || await fileExists(path.join(root, 'semantic-fixture.json'));
}

async function collectManifestFiles(root, discovered) {
  if (isSupportedManifestName(path.basename(root))) {
    discovered.push(root);
    return;
  }
  for (const entry of await readdirIfExists(root)) {
    const childPath = path.join(root, entry.name);
    if (entry.isFile() && isSupportedManifestName(entry.name)) {
      discovered.push(childPath);
    } else if (entry.isDirectory()) {
      await collectManifestFiles(childPath, discovered);
    }
  }
}

async function verifyFixtureManifest(manifestPath, options) {
  const rootDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const expectedEffects = expectedEffectsFromManifest(manifest);
  const projectKey = safeProjectKey(path.basename(rootDir));
  const runtime = await createSemanticRuntime({
    workspaceRoot,
    storeKey: `fixture-manifest:${projectKey}`,
    projects: [{
      rootDir: slash(path.relative(workspaceRoot, rootDir)),
      projectKey,
    }],
  });
  const app = await runtime.openApp({
    projectKey,
    analysisDepth: 'binding-observation',
  });
  const verification = verifyFixtureEffects(
    new FixtureVerificationRequest(null, expectedEffects),
    readFixtureVerificationSnapshot(app),
  );
  const effectResults = verification.effectResults.map((result) => ({
    outcome: result.outcome,
    effectKind: result.expectedEffect.effectKind,
    summary: result.summary,
  }));
  const effectFailures = effectResults
    .filter((result) => result.outcome !== 'satisfied')
    .map((result) => ({ ...result }));
  const controlUseVerification = verifyControlUseInventoryRows(manifest, app);
  const generatedSourceQualityVerification = await verifyGeneratedAppBuilderSourceQuality(rootDir, manifest);
  const generatedAppBuilderIdempotencyVerification = await verifyGeneratedAppBuilderIdempotency(rootDir, manifest);
  const failures = [
    ...effectFailures,
    ...controlUseVerification.failures,
    ...generatedSourceQualityVerification.failures,
    ...generatedAppBuilderIdempotencyVerification.failures,
  ];

  const verificationSnapshot = {
    schemaVersion: 'semantic-fixture-verification.v1',
    fixtureRole: manifest.fixtureRole ?? null,
    fixtureId: manifest.fixtureId ?? path.basename(rootDir),
    ok: failures.length === 0,
    expectedEffects: expectedEffects.length,
    effectResults,
    expectedControlUseRows: controlUseVerification.expectedRows,
    controlUseResults: controlUseVerification.results,
    generatedSourceQualityResults: generatedSourceQualityVerification.results,
    generatedAppBuilderIdempotencyResults: generatedAppBuilderIdempotencyVerification.results,
    failures,
  };

  if (options.writeVerificationSnapshots) {
    await writeJson(path.join(rootDir, 'semantic-verification.json'), verificationSnapshot);
  }

  return {
    fixture: slash(path.relative(workspaceRoot, rootDir)),
    ok: failures.length === 0,
    expectedEffects: expectedEffects.length,
    expectedControlUseRows: controlUseVerification.expectedRows,
    generatedSourceQualityIssues: generatedSourceQualityVerification.failures.length,
    generatedAppBuilderIdempotencyIssues: generatedAppBuilderIdempotencyVerification.failures.length,
    failures,
  };
}

function isSupportedManifestName(fileName) {
  return fileName === 'semantic-fixture.json';
}

function expectedEffectsFromManifest(manifest) {
  return (manifest.expectedEffects ?? []).map(expectedEffectFromManifestRow);
}

function verifyControlUseInventoryRows(manifest, app) {
  const expectedRows = expectedControlUseRowsFromManifest(manifest);
  if (expectedRows.length === 0) {
    return {
      expectedRows: 0,
      results: [],
      failures: [],
    };
  }
  const answer = app.ask({
    kind: SemanticAppQueryKind.ControlUseInventory,
    page: { size: 1000 },
  });
  if (answer.outcome !== 'hit') {
    const failure = {
      outcome: 'failed',
      effectKind: 'control-use-inventory',
      summary: `Control-use inventory query failed with outcome '${answer.outcome}'.`,
    };
    return {
      expectedRows: expectedRows.length,
      results: [],
      failures: [failure],
    };
  }
  const results = expectedRows.map((expected) => {
    const actual = answer.value.rows.find((candidate) =>
      authoredControlUseMatchesGeneratedRow(candidate, expected)
    ) ?? null;
    return {
      outcome: actual == null ? 'missing' : 'satisfied',
      expected: generatedControlUseSummary(expected),
      actual: actual == null ? null : authoredControlUseSummary(actual),
    };
  });
  return {
    expectedRows: expectedRows.length,
    results,
    failures: results
      .filter((result) => result.outcome !== 'satisfied')
      .map((result) => ({
        outcome: 'failed',
        effectKind: 'control-use-inventory',
        summary: `Expected generated control-use row was not visible through authored control-use inventory: ${JSON.stringify(result.expected)}.`,
      })),
  };
}

function expectedControlUseRowsFromManifest(manifest) {
  return Array.isArray(manifest.controlUseInventoryRows)
    ? manifest.controlUseInventoryRows
    : [];
}

async function verifyGeneratedAppBuilderIdempotency(rootDir, manifest) {
  if (manifest.fixtureRole !== 'app-builder-generated-app-contract') {
    return {
      results: [],
      failures: [],
    };
  }
  if (typeof manifest.appBuilderRequestPath !== 'string') {
    const failure = {
      outcome: 'failed',
      effectKind: 'generated-app-builder-idempotency',
      summary: 'Generated app-builder fixture manifest is missing appBuilderRequestPath.',
    };
    return {
      results: [failure],
      failures: [failure],
    };
  }
  const requestPath = path.join(rootDir, manifest.appBuilderRequestPath);
  const storedRequest = JSON.parse(await readFile(requestPath, 'utf8'));
  const materializedRequest = generatedAppBuilderRequestWithFixtureRoot(storedRequest, rootDir);
  const answer = answerSemanticRuntimeAppBuilderQuery(materializedRequest);
  const detailedAnswer = answerSemanticRuntimeAppBuilderQuery(
    appBuilderGeneratedFixtureDetailRequest(materializedRequest),
  );
  if (answer.outcome !== SemanticRuntimeAnswerOutcome.Hit || answer.value.sourcePlan == null) {
    const failure = {
      outcome: 'failed',
      effectKind: 'generated-app-builder-idempotency',
      summary: `Stored app-builder request did not produce a complete SourcePlan: ${answer.summary}`,
    };
    return {
      results: [failure],
      failures: [failure],
    };
  }
  if (!sourcePlanHasCompleteText(answer.value.sourcePlan)) {
    const failure = {
      outcome: 'failed',
      effectKind: 'generated-app-builder-idempotency',
      summary: 'Stored app-builder request produced a SourcePlan without complete file text.',
    };
    return {
      results: [failure],
      failures: [failure],
    };
  }
  if (detailedAnswer.outcome !== SemanticRuntimeAnswerOutcome.Hit || detailedAnswer.value.sourcePlan == null) {
    const failure = {
      outcome: 'failed',
      effectKind: 'generated-app-builder-idempotency',
      summary: `Stored app-builder request did not produce a complete detailed verification SourcePlan: ${detailedAnswer.summary}`,
    };
    return {
      results: [failure],
      failures: [failure],
    };
  }
  const results = [
    ...await verifyStoredAppBuilderPublicResponse(rootDir, manifest, storedRequest, answer),
    ...await verifyGeneratedSourcePlanFiles(rootDir, answer.value.sourcePlan.files),
    ...await verifyGeneratedProjectToolingFiles(rootDir, answer.value.sourcePlan.projectTooling?.files ?? []),
    ...verifyGeneratedAppBuilderContractRows(rootDir, manifest, detailedAnswer.value),
  ];
  return {
    results,
    failures: results
      .filter((result) => result.outcome !== 'satisfied')
      .map((result) => ({
        outcome: 'failed',
        effectKind: 'generated-app-builder-idempotency',
        summary: result.summary,
      })),
  };
}

async function verifyStoredAppBuilderPublicResponse(rootDir, manifest, storedRequest, answer) {
  if (typeof manifest.appBuilderResponsePath !== 'string') {
    return [];
  }
  const responsePath = path.join(rootDir, manifest.appBuilderResponsePath);
  if (!await fileExists(responsePath)) {
    return [{
      outcome: 'missing',
      rowFamily: 'appBuilderResponse',
      summary: `Generated app-builder public response snapshot is missing at ${manifest.appBuilderResponsePath}.`,
    }];
  }
  const storedSnapshot = JSON.parse(await readFile(responsePath, 'utf8'));
  const currentSnapshot = appBuilderGeneratedFixturePublicResponseSnapshot(answer, storedRequest, rootDir);
  return [
    generatedAppBuilderContractComparison(
      rootDir,
      'appBuilderResponse',
      storedSnapshot,
      currentSnapshot,
    ),
  ];
}

function verifyGeneratedAppBuilderContractRows(rootDir, manifest, answerValue) {
  return [
    generatedAppBuilderContractComparison(
      rootDir,
      'expectedEffects',
      manifest.expectedEffects ?? [],
      answerValue.expectedEffects,
    ),
    generatedAppBuilderContractComparison(
      rootDir,
      'expectedEffectKinds',
      manifest.expectedEffectKinds ?? [],
      answerValue.expectedEffectKinds,
    ),
    generatedAppBuilderContractComparison(
      rootDir,
      'effectContractIds',
      manifest.effectContractIds ?? [],
      answerValue.effectContractIds,
    ),
    generatedAppBuilderContractComparison(
      rootDir,
      'ontologyTargetRefs',
      manifest.ontologyTargetRefs ?? [],
      answerValue.sourceLoweringTargetRefs,
    ),
    generatedAppBuilderContractComparison(
      rootDir,
      'controlUseInventoryRows',
      manifest.controlUseInventoryRows ?? [],
      answerValue.controlUseInventoryRows,
    ),
    generatedAppBuilderContractComparison(
      rootDir,
      'sourcePlanWitnessRows',
      manifest.sourcePlanWitnessRows ?? [],
      answerValue.sourcePlanWitnessRows,
    ),
  ];
}

function generatedAppBuilderContractComparison(rootDir, rowFamily, expectedValue, actualValue) {
  const expected = normalizeFixtureRootValue(expectedValue, rootDir);
  const actual = normalizeFixtureRootValue(actualValue, rootDir);
  const expectedJson = canonicalJson(expected);
  const actualJson = canonicalJson(actual);
  if (expectedJson !== actualJson) {
    return {
      outcome: 'mismatched',
      rowFamily,
      expectedCount: Array.isArray(expected) ? expected.length : null,
      actualCount: Array.isArray(actual) ? actual.length : null,
      expectedJsonLength: expectedJson.length,
      actualJsonLength: actualJson.length,
      summary: `Generated app-builder contract row family '${rowFamily}' no longer matches the stored request output.`,
    };
  }
  return {
    outcome: 'satisfied',
    rowFamily,
    rowCount: Array.isArray(expected) ? expected.length : null,
    jsonLength: expectedJson.length,
    summary: `Generated app-builder contract row family '${rowFamily}' matches the stored request output.`,
  };
}

function generatedAppBuilderRequestWithFixtureRoot(request, rootDir) {
  return {
    ...request,
    sourceLoweringSourcePlan: {
      ...request.sourceLoweringSourcePlan,
      rootDir,
    },
  };
}

function canonicalJson(value) {
  return JSON.stringify(canonicalJsonValue(value));
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  return value;
}

async function verifyGeneratedSourcePlanFiles(rootDir, files) {
  const results = [];
  for (const file of files) {
    const expectedText = file.text?.text;
    if (expectedText == null) {
      results.push({
        outcome: 'failed',
        role: file.role,
        path: file.path,
        summary: `Generated SourcePlan file '${file.path}' does not carry complete text.`,
      });
      continue;
    }
    results.push(await verifyGeneratedTextFile(rootDir, file.path, expectedText, `SourcePlan file '${file.path}'`));
  }
  return results;
}

async function verifyGeneratedProjectToolingFiles(rootDir, files) {
  const results = [];
  for (const file of files) {
    results.push(await verifyGeneratedTextFile(rootDir, file.path, file.text, `project tooling file '${file.path}'`));
  }
  return results;
}

async function verifyGeneratedTextFile(rootDir, relativePath, expectedText, label) {
  const filePath = path.join(rootDir, relativePath);
  let actualText;
  try {
    actualText = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        outcome: 'missing',
        path: relativePath,
        summary: `Generated ${label} is missing from the fixture output.`,
      };
    }
    throw error;
  }
  if (actualText !== expectedText) {
    return {
      outcome: 'mismatched',
      path: relativePath,
      expectedLength: expectedText.length,
      actualLength: actualText.length,
      summary: `Generated ${label} no longer matches the stored app-builder request output.`,
    };
  }
  return {
    outcome: 'satisfied',
    path: relativePath,
    textLength: actualText.length,
    summary: `Generated ${label} matches the stored app-builder request output.`,
  };
}

async function verifyGeneratedAppBuilderSourceQuality(rootDir, manifest) {
  if (manifest.fixtureRole !== 'app-builder-generated-app-contract') {
    return {
      results: [],
      failures: [],
    };
  }
  const htmlFiles = await discoverGeneratedTemplateFiles(rootDir);
  const duplicateAttributeRows = [];
  for (const filePath of htmlFiles) {
    const sourceText = await readFile(filePath, 'utf8');
    duplicateAttributeRows.push(...duplicateStaticHtmlAttributeRows(sourceText, filePath));
  }
  const sourceFiles = await discoverGeneratedSourceQualityFiles(rootDir);
  const trailingWhitespaceIssueRows = [];
  for (const filePath of sourceFiles) {
    const sourceText = await readFile(filePath, 'utf8');
    trailingWhitespaceIssueRows.push(...trailingWhitespaceRows(sourceText, filePath));
  }
  const duplicateAttributeResults = duplicateAttributeRows.map((row) => ({
    outcome: 'failed',
    issueKind: 'duplicate-static-html-attribute',
    file: slash(path.relative(workspaceRoot, row.filePath)),
    line: row.line,
    character: row.character,
    tagName: row.tagName,
    attributeName: row.attributeName,
  }));
  const trailingWhitespaceResults = trailingWhitespaceIssueRows.map((row) => ({
    outcome: 'failed',
    issueKind: 'trailing-whitespace',
    file: slash(path.relative(workspaceRoot, row.filePath)),
    line: row.line,
    character: row.character,
    length: row.length,
  }));
  const results = [
    ...duplicateAttributeResults,
    ...trailingWhitespaceResults,
  ];
  return {
    results,
    failures: results.map((result) => ({
      outcome: 'failed',
      effectKind: 'generated-source-quality',
      summary: generatedSourceQualityFailureSummary(result),
    })),
  };
}

async function discoverGeneratedTemplateFiles(rootDir) {
  const discovered = [];
  await collectGeneratedTemplateFiles(path.join(rootDir, 'src'), discovered);
  return discovered.sort();
}

async function collectGeneratedTemplateFiles(dirPath, discovered) {
  for (const entry of await readdirIfExists(dirPath)) {
    const childPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectGeneratedTemplateFiles(childPath, discovered);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      discovered.push(childPath);
    }
  }
}

async function discoverGeneratedSourceQualityFiles(rootDir) {
  const discovered = [];
  await collectGeneratedSourceQualityFiles(path.join(rootDir, 'src'), discovered);
  return discovered.sort();
}

async function collectGeneratedSourceQualityFiles(dirPath, discovered) {
  for (const entry of await readdirIfExists(dirPath)) {
    const childPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectGeneratedSourceQualityFiles(childPath, discovered);
    } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.ts'))) {
      discovered.push(childPath);
    }
  }
}

function duplicateStaticHtmlAttributeRows(sourceText, filePath) {
  const rows = [];
  const tagPattern = /<([A-Za-z][A-Za-z0-9:-]*)([^<>]*)>/g;
  for (const match of sourceText.matchAll(tagPattern)) {
    const tagName = match[1];
    const attributeText = match[2] ?? '';
    const attributeNames = new Set();
    const attributePattern = /(?:^|\s)([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    for (const attributeMatch of attributeText.matchAll(attributePattern)) {
      const attributeName = (attributeMatch[1] ?? '').trim();
      if (attributeName.length === 0) {
        continue;
      }
      const key = attributeName.toLowerCase();
      if (attributeNames.has(key)) {
        const position = lineAndCharacterForOffset(
          sourceText,
          (match.index ?? 0) + (attributeMatch.index ?? 0) + attributeMatch[0].indexOf(attributeName),
        );
        rows.push({
          filePath,
          line: position.line,
          character: position.character,
          tagName,
          attributeName,
        });
      } else {
        attributeNames.add(key);
      }
    }
  }
  return rows;
}

function trailingWhitespaceRows(sourceText, filePath) {
  const rows = [];
  const pattern = /[^\S\r\n]+(?=\r?\n|$)/g;
  for (const match of sourceText.matchAll(pattern)) {
    const offset = match.index ?? 0;
    const position = lineAndCharacterForOffset(sourceText, offset);
    rows.push({
      filePath,
      line: position.line,
      character: position.character,
      length: match[0].length,
    });
  }
  return rows;
}

function generatedSourceQualityFailureSummary(result) {
  if (result.issueKind === 'duplicate-static-html-attribute') {
    return `Generated app-builder template has duplicate '${result.attributeName}' attribute on <${result.tagName}> at ${result.file}:${result.line}:${result.character}.`;
  }
  return `Generated app-builder source has ${result.length} trailing whitespace character(s) at ${result.file}:${result.line}:${result.character}.`;
}

function lineAndCharacterForOffset(sourceText, offset) {
  const prefix = sourceText.slice(0, Math.max(0, offset));
  const lines = prefix.split(/\r\n|\n|\r/);
  return {
    line: lines.length,
    character: lines[lines.length - 1].length + 1,
  };
}

function authoredControlUseMatchesGeneratedRow(actual, expected) {
  if (expected.actionChannelKind === 'router-load-navigation') {
    return actual.controlPatternId === expected.controlPatternId
      && actual.actionChannelKind === expected.actionChannelKind
      && (expected.routeInstruction == null || actual.routeInstruction === expected.routeInstruction)
      && (expected.linkText == null || actual.linkText === expected.linkText)
      && actual.bindingKind == null
      && actual.valueChannelKind == null;
  }
  if (expected.controlPatternId === 'form-message') {
    return actual.controlPatternId === expected.controlPatternId
      && actual.classificationKind === 'native-form-message';
  }
  if (expected.actionChannelKind != null) {
    return actual.controlPatternId === expected.controlPatternId
      && actual.actionChannelKind === expected.actionChannelKind
      && actual.eventName === expected.eventName
      && (expected.bindingExpression == null || actual.bindingExpression === expected.bindingExpression)
      && (expected.handlerExpression == null || actual.handlerExpression === expected.handlerExpression)
      && actual.buttonText === expected.buttonText
      && actual.buttonType === expected.buttonType;
  }
  if (expected.bindingExpression != null) {
    return actual.controlId === expected.controlId
      && actual.controlPatternId === (expected.innerControlPatternId ?? expected.controlPatternId)
      && actual.bindingExpression === expected.bindingExpression;
  }
  return false;
}

function generatedControlUseSummary(row) {
  return {
    controlPatternId: row.controlPatternId,
    innerControlPatternId: row.innerControlPatternId ?? null,
    controlId: row.controlId ?? null,
    bindingExpression: row.bindingExpression ?? null,
    handlerExpression: row.handlerExpression ?? null,
    actionChannelKind: row.actionChannelKind ?? null,
    routeInstruction: row.routeInstruction ?? null,
    linkText: row.linkText ?? null,
    eventName: row.eventName ?? null,
    buttonText: row.buttonText ?? null,
    buttonType: row.buttonType ?? null,
  };
}

function authoredControlUseSummary(row) {
  return {
    definitionName: row.definitionName,
    sourceKind: row.sourceKind,
    classificationKind: row.classificationKind,
    controlPatternId: row.controlPatternId,
    controlId: row.controlId ?? null,
    bindingExpression: row.bindingExpression ?? null,
    handlerExpression: row.handlerExpression ?? null,
    actionChannelKind: row.actionChannelKind ?? null,
    routeInstruction: row.routeInstruction ?? null,
    linkText: row.linkText ?? null,
    eventName: row.eventName ?? null,
    buttonText: row.buttonText ?? null,
    buttonType: row.buttonType ?? null,
    source: row.source == null
      ? null
      : {
        path: row.source.path ?? null,
        start: row.source.start ?? null,
        end: row.source.end ?? null,
      },
  };
}

function expectedEffectFromManifestRow(row) {
  return new ExpectedSemanticEffect(
    String(row.summary ?? ''),
    row.topologyNodeKind ?? null,
    row.effectKind,
    row.scope ?? 'app',
    row.cardinality ?? 'present',
    row.count ?? null,
    (row.filters ?? []).map((filter) => new ExpectedSemanticEffectFilter(filter.field, filter.value)),
    row.role ?? 'baseline',
  );
}

async function readdirIfExists(dirPath) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR' || error?.code === 'EISDIR') {
      return [];
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR' || error?.code === 'EISDIR') {
      return false;
    }
    throw error;
  }
}

async function directoryExists(dirPath) {
  try {
    await readdir(dirPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}

function safeProjectKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
