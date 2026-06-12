import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/dialog-source-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'dialog-source-errors-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-targets',
});
const dialogIssues = app.ask({
  kind: SemanticAppQueryKind.DialogIssues,
  detail: 'handles',
  page: { size: 20 },
}).value;
const appDiagnostics = app.ask({
  kind: SemanticAppQueryKind.AppDiagnostics,
  detail: 'handles',
  page: { size: 50 },
}).value;
const serviceRootDetails = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.ServiceRoot)
  .map((entry) => entry.detail);
const capabilityDemandDetails = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.CapabilityDemand)
  .map((entry) => entry.detail);
const serviceRootCandidateSeams = runtime.workspace.store.readOpenSeams()
  .filter((seam) => seam.seamKindKey === KernelVocabulary.Framework.OpenServiceRootCandidate.key);
const serviceRootsByProduct = new Map(serviceRootDetails.map((root) => [root.productHandle, root]));
const rootResolvesDiKeyClaims = runtime.workspace.store.readClaims()
  .filter((claim) => claim.predicateKey === KernelVocabulary.Framework.RootResolvesDiKey.key);
const rootUsesContainerClaims = runtime.workspace.store.readClaims()
  .filter((claim) => claim.predicateKey === KernelVocabulary.Framework.RootUsesContainerRoot.key);

const failures = [];
const frameworkCodes = countBy(dialogIssues.rows, (row) => row.frameworkErrorCode);
const settingsInvalidRows = dialogIssues.rows.filter((row) =>
  row.frameworkErrorCode === 'AUR0903'
  && row.issueKind === 'settings-invalid'
);
if (dialogIssues.rows.length !== 7) {
  failures.push(`Expected dialog-source-errors to publish seven source-backed dialog issues, observed ${dialogIssues.rows.length}.`);
}
if (frameworkCodes.get('AUR0903') !== 4) {
  failures.push(`Expected four AUR0903 rows: root no-base open, invalid child-base open, erased-container open, and parameter-property container open, observed ${frameworkCodes.get('AUR0903') ?? 0}.`);
}
if (frameworkCodes.get('AUR0904') !== 1) {
  failures.push(`Expected one AUR0904 row for bare DialogConfiguration, observed ${frameworkCodes.get('AUR0904') ?? 0}.`);
}
if (frameworkCodes.get('AUR0910') !== 2) {
  failures.push(`Expected two AUR0910 rows for missing child keys, observed ${frameworkCodes.get('AUR0910') ?? 0}.`);
}
if (settingsInvalidRows.some((row) => row.source?.path !== 'src/main.ts')) {
  failures.push('Expected AUR0903 rows to retain exact src/main.ts source spans.');
}
const ownerRows = dialogIssues.rows.filter((row) => row.handles?.ownerIdentityHandle != null);
if (ownerRows.length !== 6) {
  failures.push(`Expected six dialog source issues to carry framework.service-root owner handles, observed ${ownerRows.length}.`);
}
if (dialogIssues.rows.some((row) => row.frameworkErrorCode === 'AUR0904' && row.handles?.ownerIdentityHandle != null)) {
  failures.push('Bare DialogConfiguration registration issues should remain ownerless.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'container' && root.serviceKeyName === 'IContainer')) {
  failures.push('Expected a framework.service-root container product for IContainer roots.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'IDialogService' && root.basis === 'container-get-backed')) {
  failures.push('Expected a container-get-backed IDialogService framework.service-root product.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'IDialogService' && root.basis === 'di-activation-backed')) {
  failures.push('Expected a DI-activation-backed IDialogService framework.service-root product.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'DialogService' && root.basis === 'direct-constructor')) {
  failures.push('Expected a direct-constructor DialogService framework.service-root product.');
}
if (serviceRootCandidateSeams.length < 4) {
  failures.push(`Expected at least four framework service-root candidate seams for wrapped resolve, caller-dependent resolve, and classic injection, observed ${serviceRootCandidateSeams.length}.`);
}
if (!rootResolvesDiKeyClaims.some((claim) => serviceRootsByProduct.get(claim.subjectHandle)?.serviceKeyName === 'IDialogService')) {
  failures.push('Expected a framework RootResolvesDiKey claim from an IDialogService service-root after DialogConfiguration registration.');
}
if (!rootUsesContainerClaims.some((claim) =>
  serviceRootsByProduct.get(claim.subjectHandle)?.basis === 'container-get-backed'
  && serviceRootsByProduct.get(claim.objectHandle)?.rootKind === 'container'
)) {
  failures.push('Expected a RootUsesContainerRoot claim from a container-get-backed dialog service-root to its container root product.');
}
const sourceDemandProducts = capabilityDemandDetails.filter((demand) => demand.siteKind === 'source-service-api');
if (sourceDemandProducts.length === 0) {
  failures.push('Expected registered dialog source service API roots to still publish admitted capability-demand products.');
}
if (sourceDemandProducts.some((demand) => demand.requiredCapability === 'dialog.service-resolvers' && demand.admissionState !== 'admitted')) {
  failures.push('Dialog source service API demands should be admitted when DialogConfiguration is registered.');
}
if (appDiagnostics.rows.some((row) =>
  row.diagnosticDomain === 'framework'
  && row.diagnosticKind === 'framework-capability-not-registered'
  && row.missingInput === 'dialog.service-resolvers'
)) {
  failures.push('Registered DialogConfiguration should suppress source service API missing-registration app diagnostics.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    dialogIssues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      dialogIssues: dialogIssues.rows.length,
      serviceRoots: serviceRootDetails.length,
      serviceRootCandidateSeams: serviceRootCandidateSeams.length,
      rootResolvesDiKeyClaims: rootResolvesDiKeyClaims.length,
      rootUsesContainerClaims: rootUsesContainerClaims.length,
      sourceDemandProducts: sourceDemandProducts.length,
      frameworkCodes: Object.fromEntries(frameworkCodes),
    },
  }, null, 2));
}

function countBy(rows, read) {
  const counts = new Map();
  for (const row of rows) {
    const key = read(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
