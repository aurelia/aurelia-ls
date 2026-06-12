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

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/source-service-api-demand');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'source-service-api-demand-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-targets',
});
const appDiagnostics = app.ask({
  kind: SemanticAppQueryKind.AppDiagnostics,
  detail: 'handles',
  page: { size: 50 },
}).value;
const capabilityDemands = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.CapabilityDemand)
  .map((entry) => entry.detail);
const serviceRoots = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.ServiceRoot)
  .map((entry) => entry.detail);

const failures = [];
const sourceDemandDiagnostics = appDiagnostics.rows.filter((row) =>
  row.diagnosticDomain === 'framework'
  && row.diagnosticKind === 'framework-capability-not-registered'
);
const sourceDemandProducts = capabilityDemands.filter((demand) =>
  demand.siteKind === 'source-service-api'
);
const missingInputs = sourceDemandDiagnostics
  .map((row) => row.missingInput)
  .filter(Boolean)
  .sort();

if (sourceDemandDiagnostics.length !== 2) {
  failures.push(`Expected two source service API framework capability diagnostics, observed ${sourceDemandDiagnostics.length}.`);
}
if (missingInputs.join(',') !== 'dialog.service-resolvers,validation.service-resolvers') {
  failures.push(`Expected dialog and validation service resolver missing inputs, observed ${missingInputs.join(',') || '<none>'}.`);
}
if (sourceDemandDiagnostics.some((row) => row.suggestion?.suggestionKind !== 'register-framework-capability')) {
  failures.push('Expected source service API diagnostics to carry register-framework-capability suggestions.');
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
if (sourceDemandProducts.some((demand) => demand.admissionState !== 'not-admitted')) {
  failures.push('Source service API demand products should be not-admitted when only StandardConfiguration is registered.');
}
if (sourceDemandProducts.some((demand) => demand.availabilityState !== 'evidence-found')) {
  failures.push('Source service API demand products should retain package/import availability evidence.');
}
if (sourceDemandProducts.some((demand) => demand.ownerIdentityHandle == null)) {
  failures.push('Source service API demand products should be owned by the framework.service-root identity that justified them.');
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
    actionProbe,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      sourceDemandDiagnostics: sourceDemandDiagnostics.length,
      sourceDemandProducts: sourceDemandProducts.length,
      missingInputs,
      serviceRoots: serviceRoots.length,
      actionPlanKind: actionProbe.planKind,
    },
  }, null, 2));
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
