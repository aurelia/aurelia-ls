import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/service-root-v2-edges');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'service-root-v2-edges-contract',
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
const serviceRoots = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.ServiceRoot)
  .map((entry) => entry.detail);
const capabilityDemands = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.CapabilityDemand)
  .map((entry) => entry.detail);
const candidateSeams = runtime.workspace.store.readOpenSeams()
  .filter((seam) => seam.seamKindKey === KernelVocabulary.Framework.OpenServiceRootCandidate.key);
const serviceRootsByIdentity = new Map(serviceRoots.map((root) => [root.identityHandle, root]));
const providedDiKeyNames = providedDiKeyInterfaceNames(runtime.workspace.store);

const failures = [];
const mainDiActivationDialogRoots = serviceRoots.filter((root) =>
  root.sourcePath === 'src/main.ts'
  && root.rootKind === 'service'
  && root.serviceKeyName === 'IDialogService'
  && root.basis === 'di-activation-backed'
);
const weakTypedDialogRoots = serviceRoots.filter((root) =>
  root.sourcePath === 'src/main.ts'
  && root.rootKind === 'service'
  && root.serviceKeyName === 'IDialogService'
  && root.basis === 'framework-type-annotation'
);
const exportedDialogRoot = serviceRoots.find((root) =>
  root.sourcePath === 'src/service-root.ts'
  && root.rootKind === 'service'
  && root.serviceKeyName === 'IDialogService'
  && root.basis === 'di-activation-backed'
) ?? null;
const sourceDemandDiagnostics = appDiagnostics.rows.filter((row) =>
  row.diagnosticDomain === 'framework'
  && row.diagnosticKind === 'framework-capability-not-registered'
  && row.missingInput === 'dialog.service-resolvers'
);
const sourceDemandProducts = capabilityDemands.filter((demand) =>
  demand.siteKind === 'source-service-api'
  && demand.requiredCapability === 'dialog.service-resolvers'
);
const dialogOwnerRows = dialogIssues.rows.filter((row) => row.handles?.ownerIdentityHandle != null);
const candidateSummaries = candidateSeams.map((seam) => seam.summary);

if (mainDiActivationDialogRoots.length !== 1) {
  failures.push(`Expected exactly one main-file DI-activation IDialogService root for the direct aliased resolve call, observed ${mainDiActivationDialogRoots.length}.`);
}
if (weakTypedDialogRoots.length !== 1) {
  failures.push(`Expected exactly one weak framework-type-annotation IDialogService root for the typed field, observed ${weakTypedDialogRoots.length}.`);
}
if (exportedDialogRoot != null) {
  failures.push('Module-scope exported resolve(IDialogService) should remain a candidate seam, not a positive DI-activation root.');
}
if (!candidateSummaries.some((summary) => summary.includes('Aurelia resolve(IDialogService) is definitely-absent'))) {
  failures.push('Expected a candidate seam for module-scope exported resolve(IDialogService) with definitely-absent container evidence.');
}
if (!candidateSummaries.some((summary) => summary.includes('Project-local resolve-like call'))) {
  failures.push('Expected a candidate seam for the project-local barrel re-export of resolve(IDialogService).');
}
if (!candidateSummaries.some((summary) => summary.includes('container.get') && summary.includes('newInstanceOf'))) {
  failures.push('Expected a candidate seam for container.get(newInstanceOf(IDialogService)).');
}
if (!candidateSummaries.some((summary) => summary.includes('resolve(lazy(IDialogService))') && summary.includes('resolver wrapper'))) {
  failures.push('Expected a candidate seam for resolve(lazy(IDialogService)).');
}
if (!candidateSummaries.some((summary) => summary.includes('resolve(optional(IDialogService))') && summary.includes('resolver wrapper'))) {
  failures.push('Expected a candidate seam for resolve(optional(IDialogService)).');
}
if (!candidateSummaries.some((summary) => summary.includes('Classic static inject metadata'))) {
  failures.push('Expected a candidate seam for classic static getter inject metadata.');
}
if (!candidateSummaries.some((summary) => summary.includes('Classic @inject(...) metadata'))) {
  failures.push('Expected a candidate seam for classic @inject(...) metadata.');
}
if (providedDiKeyNames.has('IDialogService')) {
  failures.push('StandardConfiguration-only app should not publish a Di.ProvidesKey claim for IDialogService.');
}
if (sourceDemandProducts.length !== 1) {
  failures.push(`Expected one dialog source-service demand product for the aliased activation root only, observed ${sourceDemandProducts.length}.`);
}
if (sourceDemandProducts.some((demand) => demand.ownerIdentityHandle === weakTypedDialogRoots[0]?.identityHandle)) {
  failures.push('Weak framework-type-annotation service roots must not create source-service capability demand products.');
}
if (sourceDemandProducts.some((demand) => demand.admissionState !== 'not-admitted')) {
  failures.push('Unregistered dialog source-service demand products should remain not-admitted.');
}
if (sourceDemandProducts.some((demand) => demand.ownerIdentityHandle == null)) {
  failures.push('Source-service demand products should retain the owning framework.service-root identity.');
}
if (sourceDemandDiagnostics.length !== 1) {
  failures.push(`Expected one dialog source-service app diagnostic for the aliased activation root, observed ${sourceDemandDiagnostics.length}.`);
}
if (sourceDemandDiagnostics.some((row) => row.relatedQueryKind !== SemanticAppQueryKind.DialogIssues)) {
  failures.push('Dialog source-service app diagnostics should point to dialog-issues as their related query lane.');
}
if (sourceDemandDiagnostics.some((row) => row.handles?.ownerIdentityHandle == null || row.handles?.productHandle == null)) {
  failures.push('Dialog source-service app diagnostics should expose demand and owner handles.');
}
if (dialogIssues.rows.filter((row) => row.frameworkErrorCode === 'AUR0903').length !== 1) {
  failures.push('Expected only the aliased activation dialog root to retain a source-backed AUR0903 mechanics diagnostic.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    serviceRoots,
    candidateSummaries,
    sourceDemandDiagnostics,
    sourceDemandProducts,
    dialogIssues,
    ownerRootSources: dialogOwnerRows.map((row) => ({
      source: row.source,
      root: serviceRootsByIdentity.get(row.handles?.ownerIdentityHandle ?? ''),
    })),
    providedDiKeyNames: [...providedDiKeyNames],
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      serviceRoots: serviceRoots.length,
      mainDiActivationDialogRoots: mainDiActivationDialogRoots.length,
      weakTypedDialogRoots: weakTypedDialogRoots.length,
      candidateSeams: candidateSeams.length,
      sourceDemandDiagnostics: sourceDemandDiagnostics.length,
      dialogIssues: dialogIssues.rows.length,
    },
  }, null, 2));
}

function providedDiKeyInterfaceNames(store) {
  const providedIdentityHandles = new Set(
    store.readClaims()
      .filter((claim) => claim.predicateKey === KernelVocabulary.Di.ProvidesKey.key)
      .map((claim) => claim.objectHandle),
  );
  const names = new Set();
  for (const identity of store.readIdentities()) {
    if (
      identity.kind === 'di-key-identity'
      && identity.keyKind === 'interface'
      && providedIdentityHandles.has(identity.handle)
    ) {
      names.add(identity.interfaceName);
    }
  }
  return names;
}
