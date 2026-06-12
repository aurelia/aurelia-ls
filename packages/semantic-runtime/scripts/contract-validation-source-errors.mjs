import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/validation-rule-source-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'validation-source-errors-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const validationIssues = app.ask({
  kind: SemanticAppQueryKind.ValidationIssues,
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
const serviceRootsByProduct = new Map(serviceRootDetails.map((root) => [root.productHandle, root]));
const rootResolvesDiKeyClaims = runtime.workspace.store.readClaims()
  .filter((claim) => claim.predicateKey === KernelVocabulary.Framework.RootResolvesDiKey.key);

const failures = [];
const frameworkCodes = countBy(validationIssues.rows, (row) => row.frameworkErrorCode);
const expectedCodes = new Map([
  ['AUR4101', 3],
  ['AUR4102', 1],
  ['AUR4105', 1],
  ['AUR4106', 1],
  ['AUR4108', 1],
]);

const expectedIssueCount = [...expectedCodes.values()].reduce((sum, count) => sum + count, 0);

if (validationIssues.rows.length !== expectedIssueCount) {
  failures.push(`Expected ${expectedIssueCount} source-backed validation issues, observed ${validationIssues.rows.length}.`);
}

for (const [code, expectedCount] of expectedCodes) {
  const count = frameworkCodes.get(code) ?? 0;
  if (count !== expectedCount) {
    failures.push(`Expected ${expectedCount} ${code} row(s), observed ${count}.`);
  }
}

const sourcePathCounts = countBy(validationIssues.rows, (row) => row.source?.path ?? '<missing>');
if ((sourcePathCounts.get('src/main.ts') ?? 0) !== 1) {
  failures.push(`Expected one AppTask validation issue to retain an exact src/main.ts span, observed ${sourcePathCounts.get('src/main.ts') ?? 0}.`);
}
if ((sourcePathCounts.get('src/validation-rule-source-errors-app.ts') ?? 0) !== expectedIssueCount - 1) {
  failures.push(`Expected ${expectedIssueCount - 1} validation issues to retain exact app component source spans, observed ${sourcePathCounts.get('src/validation-rule-source-errors-app.ts') ?? 0}.`);
}

if (validationIssues.rows.some((row) => row.message?.includes('Local lookalikes') === true)) {
  failures.push('Local ValidationRules/PropertyRule lookalikes should not produce Aurelia validation diagnostics.');
}

if (validationIssues.rows.some((row) => row.message?.includes('Arbitrary AppTask keys') === true)) {
  failures.push('Arbitrary AppTask service-key lookalikes should not produce Aurelia validation diagnostics.');
}

const ownerRows = validationIssues.rows.filter((row) => row.handles?.ownerIdentityHandle != null);
if (ownerRows.length !== 5) {
  failures.push(`Expected five validation source issues to carry framework.service-root owner handles, observed ${ownerRows.length}.`);
}
if (validationIssues.rows.some((row) => row.frameworkErrorCode === 'AUR4101' && row.handles?.ownerIdentityHandle == null)) {
  failures.push('Every AUR4101 fluent-rule construction issue in this fixture should carry a service-root owner handle.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'IValidationRules' && root.basis === 'apptask-declared-key')) {
  failures.push('Expected an AppTask-declared IValidationRules framework.service-root product.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'IValidationRules' && root.basis === 'container-get-backed')) {
  failures.push('Expected a container-get-backed IValidationRules framework.service-root product.');
}
if (!rootResolvesDiKeyClaims.some((claim) => serviceRootsByProduct.get(claim.subjectHandle)?.serviceKeyName === 'IValidationRules')) {
  failures.push('Expected a framework RootResolvesDiKey claim from an IValidationRules service-root after ValidationConfiguration registration.');
}
const sourceDemandProducts = capabilityDemandDetails.filter((demand) => demand.siteKind === 'source-service-api');
if (sourceDemandProducts.length === 0) {
  failures.push('Expected registered validation source service API roots to still publish capability-demand products.');
}
if (sourceDemandProducts.some((demand) =>
  demand.requiredCapability === 'validation.service-resolvers'
  && demand.admissionState !== 'admitted'
  && demand.admissionState !== 'admitted-chain-unproven'
)) {
  failures.push('Validation source service API demands should be admitted or admitted-chain-unproven when ValidationConfiguration is registered.');
}
if (appDiagnostics.rows.some((row) =>
  row.diagnosticDomain === 'framework'
  && row.diagnosticKind === 'framework-capability-not-registered'
  && row.missingInput === 'validation.service-resolvers'
)) {
  failures.push('Registered ValidationConfiguration should suppress source service API missing-registration app diagnostics.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    validationIssues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      validationIssues: validationIssues.rows.length,
      serviceRoots: serviceRootDetails.length,
      rootResolvesDiKeyClaims: rootResolvesDiKeyClaims.length,
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
