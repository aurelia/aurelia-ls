import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  semanticAppQueryCatalogRow,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
const failures = [];

const catalogRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.FrameworkCapabilityDemands);
if (catalogRow.group !== 'framework') {
  failures.push(`Expected framework capability demand query group to be framework, observed ${catalogRow.group}.`);
}
if (catalogRow.runtimeBoundary !== 'app-world' || catalogRow.materializationPolicy !== 'projection-only') {
  failures.push(`Expected framework capability demand query to be app-world/projection-only, observed ${catalogRow.runtimeBoundary}/${catalogRow.materializationPolicy}.`);
}
if (!catalogRow.supportsPaging || !catalogRow.supportsDetail || !catalogRow.supportsSourceFile) {
  failures.push('Expected framework capability demand query to support paging, detail, and sourceFile loci.');
}
if (catalogRow.minimumAnalysisDepth !== 'runtime-topology') {
  failures.push(`Expected runtime-topology minimum depth, observed ${catalogRow.minimumAnalysisDepth}.`);
}

const sourceService = await readFixture('source-service-api-demand', 'framework-capability-query-source-service');
const sourceServiceAnswer = await sourceService.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  detail: 'handles',
  page: { size: 20 },
});
const sourceServiceRows = sourceServiceAnswer.value.rows;
if (sourceServiceRows.length !== 2) {
  failures.push(`Expected two source-service capability demand rows, observed ${sourceServiceRows.length}.`);
}
if (sourceServiceRows.some((row) => row.siteKind !== 'source-service-api')) {
  failures.push('Expected source-service fixture rows to stay source-service-api site kind.');
}
if (sourceServiceRows.some((row) => row.admissionState !== 'not-admitted' || row.actionability !== 'missing-registration')) {
  failures.push(`Expected source-service rows to be missing-registration not-admitted rows, observed ${stateSummary(sourceServiceRows)}.`);
}
if (sourceServiceRows.some((row) => row.availabilityState !== 'evidence-found' || row.packageEvidence.length === 0)) {
  failures.push('Expected source-service rows to expose local package/import availability evidence.');
}
if (sourceServiceRows.some((row) => row.source?.start == null || row.handles?.ownerIdentityHandle == null)) {
  failures.push('Expected source-service rows to expose exact source spans and owner handles in handles detail.');
}
if (!sourceServiceRows.some((row) =>
  row.requiredCapability === 'dialog.service-resolvers'
  && row.relatedQueryKind === SemanticAppQueryKind.DialogIssues
)) {
  failures.push('Expected dialog service demand row to continue to dialog-issues.');
}
if (!sourceServiceRows.some((row) =>
  row.requiredCapability === 'validation.service-resolvers'
  && row.relatedQueryKind === SemanticAppQueryKind.ValidationIssues
)) {
  failures.push('Expected validation service demand row to continue to validation-issues.');
}
if (!sourceServiceAnswer.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary)) {
  failures.push('Expected capability demand query to continue to app diagnostic summary.');
}
if (!sourceServiceAnswer.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.DialogIssues)) {
  failures.push('Expected source-service demand query to continue to dialog-issues for returned dialog demand rows.');
}

const sourceServiceScoped = await sourceService.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  sourceFile: { filePath: 'src/main.ts' },
  page: { size: 20 },
});
if (sourceServiceScoped.value.rows.length !== sourceServiceRows.length) {
  failures.push(`Expected src/main.ts sourceFile scope to preserve source-service rows, observed ${sourceServiceScoped.value.rows.length}.`);
}
const chain = await readFixture('service-root-admission-chain', 'framework-capability-query-chain');
const chainAnswer = await chain.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  detail: 'handles',
  page: { size: 20 },
  appRetention: 'retain-app',
});
const chainRows = chainAnswer.value.rows;
const serviceRootsByIdentity = new Map(chain.serviceRoots.map((root) => [root.identityHandle, root]));
if (!chainRows.some((row) =>
  row.requiredCapability === 'dialog.service-resolvers'
  && row.admissionState === 'not-admitted'
  && serviceRootsByIdentity.get(row.handles?.ownerIdentityHandle ?? '')?.basis === 'di-activation-backed'
)) {
  failures.push('Expected cross-root dialog service demand to be not-admitted in public capability query rows.');
}
if (!chainRows.some((row) =>
  row.requiredCapability === 'dialog.service-resolvers'
  && row.admissionState === 'admitted-chain-unproven'
  && serviceRootsByIdentity.get(row.handles?.ownerIdentityHandle ?? '')?.basis === 'container-get-backed'
)) {
  failures.push('Expected caller-container dialog service demand to remain admitted-chain-unproven in public capability query rows.');
}
if (!chainRows.some((row) =>
  row.requiredCapability === 'validation.service-resolvers'
  && row.admissionState === 'admitted'
  && row.actionability === 'registered'
)) {
  failures.push('Expected validation service demand to be registered/admitted in public capability query rows.');
}
const chainDiagnostics = await chain.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.AppDiagnostics,
  detail: 'handles',
  page: { size: 50 },
  appRetention: 'retain-app',
});
if (!chainDiagnostics.continuations?.some((row) =>
  row.targetQueryKind === SemanticAppQueryKind.FrameworkCapabilityDemands
  && row.targetQuery?.kind === SemanticAppQueryKind.FrameworkCapabilityDemands
)) {
  failures.push('Expected app diagnostics with framework registration rows to continue to framework-capability-demands.');
}

const templateBuiltIns = await readFixture('template-controller-built-ins', 'framework-capability-query-template-built-ins');
const templatePage = await templateBuiltIns.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  page: { size: 5 },
});
if (templatePage.outcome !== 'partial' || templatePage.page?.nextCursor == null) {
  failures.push('Expected template built-in capability query to page through many rows.');
}
if (templatePage.value.rows.some((row) => row.handles != null)) {
  failures.push('Expected compact capability demand rows not to expose handles.');
}
if (!templatePage.value.rows.some((row) => row.siteKind === 'template-attribute')) {
  failures.push('Expected template built-in query rows to include template-attribute capability demand sites.');
}
const templateScoped = await templateBuiltIns.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  sourceFile: { filePath: 'src/template-controller-built-ins-app.html' },
  page: { size: 100 },
});
const templateScopedToMain = await templateBuiltIns.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
  sourceFile: { filePath: 'src/main.ts' },
  page: { size: 100 },
});
if (templateScopedToMain.page?.totalRows !== 64 || templateScopedToMain.value.rows.length === 0) {
  failures.push(`Expected src/main.ts sourceFile scope to match template demands through package/import evidence, observed ${templateScopedToMain.value.rows.length} of ${templateScopedToMain.page?.totalRows ?? '<unknown>'}.`);
}
if (templateScoped.page?.totalRows !== 64 || templateScoped.value.rows.length === 0) {
  failures.push(`Expected template sourceFile scope to expose 64 total built-in demand rows, observed ${templateScoped.value.rows.length} of ${templateScoped.page?.totalRows ?? '<unknown>'}.`);
}
if (!templateScoped.value.displayText.includes('Admission: admitted(')) {
  failures.push(`Expected template scoped display text to summarize admitted rows, observed ${templateScoped.value.displayText}.`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    sourceServiceRows,
    chainRows,
    templateRows: templateScoped.value.rows.slice(0, 5),
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      sourceServiceRows: sourceServiceRows.length,
      chainRows: chainRows.length,
      templateRows: templateScoped.page?.totalRows ?? templateScoped.value.rows.length,
      templateReturnedRows: templateScoped.value.rows.length,
      templatePageNextCursor: templatePage.page?.nextCursor ?? null,
    },
  }, null, 2));
}

async function readFixture(name, storeKey) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureRoot, name),
    storeKey,
  });
  await runtime.openApp({
    analysisDepth: 'runtime-topology',
  });
  return {
    runtime,
    serviceRoots: runtime.workspace.store.productDetails
      .readBySlot(FrameworkProductDetails.ServiceRoot)
      .map((entry) => entry.detail),
  };
}

function stateSummary(rows) {
  return rows.map((row) => `${row.authoredName}:${row.admissionState}`).join(', ') || '<none>';
}
