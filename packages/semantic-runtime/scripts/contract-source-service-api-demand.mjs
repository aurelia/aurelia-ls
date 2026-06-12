import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  DiagnosticActionChangeDomain,
  DiagnosticActionKind,
  DiagnosticActionPlanKind,
  DiagnosticActionPlanReadiness,
  DiagnosticActionTargetSourceCoverage,
  SemanticAppQueryKind,
  diagnosticActionChangeDomainForPlan,
  diagnosticActionKindForDiagnosticSuggestion,
  diagnosticActionPlanKindForAction,
  diagnosticActionPlanReadinessForCluster,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/source-service-api-demand');

const primary = await readFixture('source-service-api-demand-contract');
const secondary = await readFixture('source-service-api-demand-contract-secondary');
const appDiagnostics = primary.appDiagnostics;
const capabilityDemands = primary.capabilityDemands;
const serviceRoots = primary.serviceRoots;
const providedDiKeyNames = providedDiKeyInterfaceNames(primary.store);

const failures = [];
const sourceDemandDiagnostics = appDiagnostics.rows.filter((row) =>
  row.diagnosticDomain === 'framework'
  && row.diagnosticKind === 'framework-capability-not-registered'
);
const sourceDemandProducts = capabilityDemands.filter((demand) =>
  demand.siteKind === 'source-service-api'
);
const secondarySourceDemandProducts = secondary.capabilityDemands.filter((demand) =>
  demand.siteKind === 'source-service-api'
);
const missingInputs = sourceDemandDiagnostics
  .map((row) => row.missingInput)
  .filter(Boolean)
  .sort();
const primaryDemandHandleSuffixes = productHandleLocalSuffixes(sourceDemandProducts);
const secondaryDemandHandleSuffixes = productHandleLocalSuffixes(secondarySourceDemandProducts);

if (sourceDemandDiagnostics.length !== 2) {
  failures.push(`Expected two source service API framework capability diagnostics, observed ${sourceDemandDiagnostics.length}.`);
}
if (missingInputs.join(',') !== 'dialog.service-resolvers,validation.service-resolvers') {
  failures.push(`Expected dialog and validation service resolver missing inputs, observed ${missingInputs.join(',') || '<none>'}.`);
}
if (sourceDemandDiagnostics.some((row) => row.suggestion?.suggestionKind !== 'register-framework-capability')) {
  failures.push('Expected source service API diagnostics to carry register-framework-capability suggestions.');
}
if (sourceDemandDiagnostics.some((row) =>
  row.missingInput === 'dialog.service-resolvers'
  && row.relatedQueryKind !== SemanticAppQueryKind.DialogIssues
)) {
  failures.push('Expected dialog source service API diagnostics to point at dialog-issues as their related query lane.');
}
if (sourceDemandDiagnostics.some((row) =>
  row.missingInput === 'validation.service-resolvers'
  && row.relatedQueryKind !== SemanticAppQueryKind.ValidationIssues
)) {
  failures.push('Expected validation source service API diagnostics to point at validation-issues as their related query lane.');
}
if (sourceDemandDiagnostics.some((row) => row.handles?.productHandle == null || row.handles?.ownerIdentityHandle == null)) {
  failures.push('Expected source service API diagnostics to expose demand product handles and service-root owner handles.');
}
if (sourceDemandDiagnostics.some((row) => row.suggestion?.actionTarget?.targetKind !== 'framework-capability')) {
  failures.push('Expected source service API diagnostic action targets to classify as framework-capability.');
}
if (sourceDemandDiagnostics.some((row) =>
  row.suggestion?.actionTarget?.source?.start == null
  || row.suggestion?.actionTarget?.source?.end == null
)) {
  failures.push('Expected source service API diagnostic action targets to carry exact authored source spans.');
}
const actionProbe = readDiagnosticActionProbe(sourceDemandDiagnostics[0]?.suggestion ?? null);
if (actionProbe.actionKind !== DiagnosticActionKind.RegisterFrameworkCapability) {
  failures.push(`Expected source service API suggestions to classify as ${DiagnosticActionKind.RegisterFrameworkCapability}, observed ${actionProbe.actionKind}.`);
}
if (actionProbe.planKind !== DiagnosticActionPlanKind.FrameworkCapabilityRegistration) {
  failures.push(`Expected source service API suggestions to plan as ${DiagnosticActionPlanKind.FrameworkCapabilityRegistration}, observed ${actionProbe.planKind}.`);
}
if (actionProbe.changeDomain !== DiagnosticActionChangeDomain.AppSource) {
  failures.push(`Expected source service API registration actions to belong to ${DiagnosticActionChangeDomain.AppSource}, observed ${actionProbe.changeDomain}.`);
}
if (actionProbe.readiness !== DiagnosticActionPlanReadiness.SourceEditPolicyOpen) {
  failures.push(`Expected source service API registration readiness to stay ${DiagnosticActionPlanReadiness.SourceEditPolicyOpen}, observed ${actionProbe.readiness}.`);
}
if (sourceDemandProducts.length !== 2) {
  failures.push(`Expected two source-service-api capability demand products, observed ${sourceDemandProducts.length}.`);
}
if (primaryDemandHandleSuffixes.join(',') !== secondaryDemandHandleSuffixes.join(',')) {
  failures.push(`Expected source-service demand local handle suffixes to be stable across store keys, observed ${primaryDemandHandleSuffixes.join(',')} vs ${secondaryDemandHandleSuffixes.join(',')}.`);
}
if (sourceDemandProducts.some((demand) => demand.admissionState !== 'not-admitted')) {
  failures.push('Source service API demand products should be not-admitted when only StandardConfiguration is registered.');
}
if (sourceDemandProducts.some((demand) => (demand.blockingOpenSeamHandles?.length ?? 0) !== 0)) {
  failures.push('StandardConfiguration-only missing service demands should not link blocking open seams.');
}
if (sourceDemandProducts.some((demand) => demand.availabilityState !== 'evidence-found')) {
  failures.push('Source service API demand products should retain package/import availability evidence.');
}
if (sourceDemandProducts.some((demand) => demand.ownerIdentityHandle == null)) {
  failures.push('Source service API demand products should be owned by the framework.service-root identity that justified them.');
}
if (providedDiKeyNames.has('IDialogService')) {
  failures.push('StandardConfiguration-only app should not publish a Di.ProvidesKey claim for IDialogService.');
}
if (providedDiKeyNames.has('IValidationRules')) {
  failures.push('StandardConfiguration-only app should not publish a Di.ProvidesKey claim for IValidationRules.');
}
if (!serviceRoots.some((root) =>
  root.rootKind === 'service'
  && root.serviceKeyName === 'IDialogService'
  && root.basis === 'di-activation-backed'
)) {
  failures.push('Expected a DI-activation-backed IDialogService service-root product in the source demand fixture.');
}
if (!serviceRoots.some((root) =>
  root.rootKind === 'service'
  && root.serviceKeyName === 'IValidationRules'
  && root.basis === 'di-activation-backed'
)) {
  failures.push('Expected a DI-activation-backed IValidationRules service-root product in the source demand fixture.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    sourceDemandDiagnostics,
    sourceDemandProducts,
    primaryDemandHandleSuffixes,
    secondaryDemandHandleSuffixes,
    actionProbe,
    providedDiKeyNames: [...providedDiKeyNames],
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      sourceDemandDiagnostics: sourceDemandDiagnostics.length,
      sourceDemandProducts: sourceDemandProducts.length,
      missingInputs,
      demandHandleSuffixes: primaryDemandHandleSuffixes,
      serviceRoots: serviceRoots.length,
      actionPlanKind: actionProbe.planKind,
    },
  }, null, 2));
}

async function readFixture(storeKey) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-targets',
  });
  const appDiagnostics = app.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    detail: 'handles',
    page: { size: 50 },
  }).value;
  return {
    runtime,
    app,
    store: runtime.workspace.store,
    appDiagnostics,
    capabilityDemands: runtime.workspace.store.productDetails
      .readBySlot(FrameworkProductDetails.CapabilityDemand)
      .map((entry) => entry.detail),
    serviceRoots: runtime.workspace.store.productDetails
      .readBySlot(FrameworkProductDetails.ServiceRoot)
      .map((entry) => entry.detail),
  };
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

function readDiagnosticActionProbe(suggestion) {
  const actionKind = diagnosticActionKindForDiagnosticSuggestion(suggestion?.suggestionKind ?? null);
  const planKind = diagnosticActionPlanKindForAction(
    actionKind,
    suggestion?.actionKind ?? null,
    suggestion?.actionTarget?.targetKind ?? null,
  );
  return {
    actionKind,
    planKind,
    changeDomain: diagnosticActionChangeDomainForPlan(planKind),
    readiness: diagnosticActionPlanReadinessForCluster(
      planKind,
      suggestion?.actionTarget?.source == null
        ? DiagnosticActionTargetSourceCoverage.None
        : DiagnosticActionTargetSourceCoverage.All,
      [],
    ),
  };
}

function productHandleLocalSuffixes(products) {
  return products
    .map((product) => {
      const handle = String(product.productHandle);
      return handle.split(':product:')[1] ?? handle;
    })
    .sort();
}
