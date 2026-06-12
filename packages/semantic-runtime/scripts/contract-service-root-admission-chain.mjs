import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { readDiContainerChainFacts } from '../out/di/container-chain.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const unknown = await readFixture('service-root-admission-unknown');
const chain = await readFixture('service-root-admission-chain');
const standalone = await readFixture('service-root-standalone-container-register');
const stray = await readFixture('service-root-stray-container-register');
const openSpreadLocal = await readFixture('service-root-open-spread-local');
const openSpreadSibling = await readFixture('service-root-open-spread-sibling');
const callerUnmapped = await readFixture('service-root-caller-container-unmapped');
const failures = [];

const unknownDialogDemands = sourceServiceDemands(unknown, 'dialog.service-resolvers');
const unknownDiagnostics = sourceServiceDiagnostics(unknown);
const unknownBlockingSeams = unknownDialogDemands.flatMap((demand) => demand.blockingOpenSeamHandles ?? []);
const unknownSeamRows = unknownBlockingSeams
  .map((handle) => unknown.store.readOpenSeam(handle))
  .filter(Boolean);

if (unknownDialogDemands.length !== 1) {
  failures.push(`Expected one unknown-fixture dialog source-service demand, observed ${unknownDialogDemands.length}.`);
}
if (unknownDialogDemands.some((demand) => demand.admissionState !== 'admission-unknown')) {
  failures.push(`Hidden registry-body dialog demand should be admission-unknown, observed ${stateSummary(unknownDialogDemands)}.`);
}
if (unknownBlockingSeams.length === 0) {
  failures.push('Admission-unknown demand should link at least one blocking registration-hiding open seam handle.');
}
if (!unknownSeamRows.some((seam) =>
  seam.seamKindKey === KernelVocabulary.Di.OpenRegistryBody.key
  || seam.reasonKinds?.includes('di-registry-body-open')
)) {
  failures.push('Admission-unknown demand should link a DI registry-body/open-spending seam.');
}
if (unknownDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Admission-unknown dialog demand must not emit framework-capability-not-registered.');
}

const standaloneDialogDemands = sourceServiceDemands(standalone, 'dialog.service-resolvers');
const standaloneDiagnostics = sourceServiceDiagnostics(standalone);
const standaloneBlockingSeams = standaloneDialogDemands.flatMap((demand) => demand.blockingOpenSeamHandles ?? []);
const standaloneSeamRows = standaloneBlockingSeams
  .map((handle) => standalone.store.readOpenSeam(handle))
  .filter(Boolean);
const standaloneOwnerRoots = standaloneDialogDemands.map((demand) => ownerRootForDemand(standalone, demand)).filter(Boolean);
const standaloneContainerOwnerRoots = standaloneOwnerRoots
  .map((root) => root.ownerProductHandle == null
    ? null
    : standalone.serviceRoots.find((candidate) => candidate.productHandle === root.ownerProductHandle) ?? null)
  .filter(Boolean);

if (standaloneDialogDemands.length !== 1) {
  failures.push(`Expected one standalone-container dialog source-service demand, observed ${standaloneDialogDemands.length}.`);
}
if (standaloneDialogDemands.some((demand) => demand.admissionState !== 'admission-unknown')) {
  failures.push(`Standalone container registration should degrade to admission-unknown while its receiving container is unmodeled, observed ${stateSummary(standaloneDialogDemands)}.`);
}
if (!standaloneOwnerRoots.some((root) => root.basis === 'container-get-backed')) {
  failures.push('Expected the standalone fixture demand owner to be a container-get-backed service root.');
}
if (!standaloneContainerOwnerRoots.some((root) => root.rootKind === 'container' && root.basis === 'direct-constructor')) {
  failures.push('Expected the standalone fixture service root to point at a direct-constructor container root.');
}
if (!standaloneSeamRows.some((seam) =>
  seam.seamKindKey === KernelVocabulary.Di.OpenRegistrationSpending.key
  && seam.reasonKinds?.includes('di-registration-container-open')
)) {
  failures.push('Standalone container registration should link a DI open-registration-spending container seam.');
}
if (standaloneDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Standalone container registration uncertainty must not emit framework-capability-not-registered.');
}
if (providedDiKeyInterfaceNames(standalone.store).has('IDialogService')) {
  failures.push('Standalone unspent container registration must not publish a world-global IDialogService provider.');
}

const strayDialogDemands = sourceServiceDemands(stray, 'dialog.service-resolvers');
const strayDiagnostics = sourceServiceDiagnostics(stray);
const strayOpenSeams = stray.store.readOpenSeams();
const strayBlockingSeams = strayDialogDemands.flatMap((demand) => demand.blockingOpenSeamHandles ?? []);

if (strayDialogDemands.length !== 1) {
  failures.push(`Expected one stray-container dialog source-service demand, observed ${strayDialogDemands.length}.`);
}
if (strayDialogDemands.some((demand) => demand.admissionState !== 'not-admitted')) {
  failures.push(`Stray standalone container registration must not silence a missing app-root dialog registration, observed ${stateSummary(strayDialogDemands)}.`);
}
if (strayBlockingSeams.length !== 0) {
  failures.push(`Stray app-root dialog demand should not link unrelated container-open seams, observed ${strayBlockingSeams.length}.`);
}
if (!strayDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Stray app-root missing dialog registration should emit framework-capability-not-registered.');
}
if (!strayOpenSeams.some((seam) =>
  seam.seamKindKey === KernelVocabulary.Di.OpenRegistrationSpending.key
  && seam.reasonKinds?.includes('di-registration-container-open')
)) {
  failures.push('Stray standalone container registration should still preserve a DI open-registration-spending container seam.');
}
if (providedDiKeyInterfaceNames(stray.store).has('IDialogService')) {
  failures.push('Stray standalone registration must not publish a world-global IDialogService provider.');
}

const openSpreadLocalDialogDemands = sourceServiceDemands(openSpreadLocal, 'dialog.service-resolvers');
const openSpreadLocalDiagnostics = sourceServiceDiagnostics(openSpreadLocal);
const openSpreadLocalBlockingSeams = openSpreadLocalDialogDemands.flatMap((demand) => demand.blockingOpenSeamHandles ?? []);
const openSpreadLocalSeamRows = openSpreadLocalBlockingSeams
  .map((handle) => openSpreadLocal.store.readOpenSeam(handle))
  .filter(Boolean);

if (openSpreadLocalDialogDemands.length !== 1) {
  failures.push(`Expected one local-open-spread dialog source-service demand, observed ${openSpreadLocalDialogDemands.length}.`);
}
if (openSpreadLocalDialogDemands.some((demand) => demand.admissionState !== 'admission-unknown')) {
  failures.push(`Local app open spread registration should degrade dialog demand to admission-unknown, observed ${stateSummary(openSpreadLocalDialogDemands)}.`);
}
if (!openSpreadLocalSeamRows.some((seam) =>
  seam.seamKindKey === KernelVocabulary.Registration.OpenSpread.key
  || seam.seamKindKey === KernelVocabulary.Di.OpenRegistrationSpending.key
)) {
  failures.push('Local app open spread demand should link registration-hiding seams owned by the same app container chain.');
}
if (openSpreadLocalDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Local app open spread uncertainty must not emit framework-capability-not-registered.');
}

const openSpreadSiblingDialogDemands = sourceServiceDemands(openSpreadSibling, 'dialog.service-resolvers');
const openSpreadSiblingDiagnostics = sourceServiceDiagnostics(openSpreadSibling);
const openSpreadSiblingBlockingSeams = openSpreadSiblingDialogDemands.flatMap((demand) => demand.blockingOpenSeamHandles ?? []);
const openSpreadSiblingOpenSeams = openSpreadSibling.store.readOpenSeams();

if (openSpreadSiblingDialogDemands.length !== 1) {
  failures.push(`Expected one sibling-open-spread dialog source-service demand, observed ${openSpreadSiblingDialogDemands.length}.`);
}
if (openSpreadSiblingDialogDemands.some((demand) => demand.admissionState !== 'not-admitted')) {
  failures.push(`Sibling app open spread must not silence a missing consumer app dialog registration, observed ${stateSummary(openSpreadSiblingDialogDemands)}.`);
}
if (openSpreadSiblingBlockingSeams.length !== 0) {
  failures.push(`Sibling app dialog demand should not link registration-hiding seams from another app root, observed ${openSpreadSiblingBlockingSeams.length}.`);
}
if (!openSpreadSiblingDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Sibling app missing dialog registration should emit framework-capability-not-registered.');
}
if (!openSpreadSiblingOpenSeams.some((seam) =>
  seam.seamKindKey === KernelVocabulary.Registration.OpenSpread.key
  || seam.seamKindKey === KernelVocabulary.Di.OpenRegistrationSpending.key
)) {
  failures.push('Sibling app fixture should preserve registration-hiding open seams for the provider app.');
}

const callerUnmappedDialogDemands = sourceServiceDemands(callerUnmapped, 'dialog.service-resolvers');
const callerUnmappedDiagnostics = sourceServiceDiagnostics(callerUnmapped);
const callerUnmappedOwnerRoots = callerUnmappedDialogDemands.map((demand) => ownerRootForDemand(callerUnmapped, demand)).filter(Boolean);

if (callerUnmappedDialogDemands.length !== 1) {
  failures.push(`Expected one caller-unmapped dialog source-service demand, observed ${callerUnmappedDialogDemands.length}.`);
}
if (callerUnmappedDialogDemands.some((demand) => demand.admissionState !== 'admission-unknown')) {
  failures.push(`Caller-supplied container demand with no modeled provider should be admission-unknown, observed ${stateSummary(callerUnmappedDialogDemands)}.`);
}
if (!callerUnmappedOwnerRoots.some((root) => root.basis === 'container-get-backed')) {
  failures.push('Expected the caller-unmapped fixture demand owner to be a container-get-backed service root.');
}
if (callerUnmappedDiagnostics.some((row) => row.missingInput === 'dialog.service-resolvers')) {
  failures.push('Caller-supplied container demand must not emit framework-capability-not-registered when the consulting container is unmapped.');
}

const chainDialogDemands = sourceServiceDemands(chain, 'dialog.service-resolvers');
const chainValidationDemands = sourceServiceDemands(chain, 'validation.service-resolvers');
const chainDiagnostics = sourceServiceDiagnostics(chain);
const chainDialogOwnerRoots = chainDialogDemands.map((demand) => ownerRootForDemand(chain, demand)).filter(Boolean);
const chainValidationOwnerRoots = chainValidationDemands.map((demand) => ownerRootForDemand(chain, demand)).filter(Boolean);
const chainWalkProof = chainParentWalkProof(chain.store);

if (chainValidationDemands.length !== 1) {
  failures.push(`Expected one validation source-service demand in chain fixture, observed ${chainValidationDemands.length}.`);
}
if (chainValidationDemands.some((demand) => demand.admissionState !== 'admitted')) {
  failures.push(`Validation demand should be chain-proven admitted, observed ${stateSummary(chainValidationDemands)}.`);
}
if (chainDialogDemands.length < 2) {
  failures.push(`Expected at least two dialog demands for sibling-root and caller-container cases, observed ${chainDialogDemands.length}.`);
}
if (chainDialogDemands.some((demand) => demand.admissionState !== 'admitted-chain-unproven')) {
  failures.push(`Dialog demands should be admitted-chain-unproven, observed ${stateSummary(chainDialogDemands)}.`);
}
if (!chainDialogOwnerRoots.some((root) => root.basis === 'di-activation-backed')) {
  failures.push('Expected a di-activation-backed dialog owner root for the cross-root consumer component.');
}
if (!chainDialogOwnerRoots.some((root) => root.basis === 'container-get-backed')) {
  failures.push('Expected a container-get-backed dialog owner root for the caller-supplied container helper.');
}
if (!chainValidationOwnerRoots.some((root) => root.basis === 'di-activation-backed')) {
  failures.push('Expected a di-activation-backed validation owner root for the chain-proven component demand.');
}
if (chainDiagnostics.length !== 0) {
  failures.push(`Chain fixture should not emit source-service registration diagnostics, observed ${chainDiagnostics.length}.`);
}
if (!providedDiKeyInterfaceNames(chain.store).has('IDialogService')) {
  failures.push('Chain fixture should publish an IDialogService provider in the provider app root.');
}
if (!providedDiKeyInterfaceNames(chain.store).has('IValidationRules')) {
  failures.push('Chain fixture should publish an IValidationRules provider in the consumer app root.');
}
if (rootContainerIdentityCount(chain.store) < 2) {
  failures.push('Chain fixture should materialize at least two root containers to guard cross-root admission.');
}
if (!chainWalkProof.validationProviderVisibleFromChild) {
  failures.push('DI container-chain helper should see an IValidationRules provider on the consumer child-container parent chain.');
}
if (chainWalkProof.dialogProviderVisibleFromValidationChild) {
  failures.push('DI container-chain helper must not see the sibling-root IDialogService provider on the consumer child-container chain.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    unknown: debugFixture(unknown),
    standalone: debugFixture(standalone),
    stray: debugFixture(stray),
    openSpreadLocal: debugFixture(openSpreadLocal),
    openSpreadSibling: debugFixture(openSpreadSibling),
    callerUnmapped: debugFixture(callerUnmapped),
    chain: debugFixture(chain),
    chainWalkProof,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      unknownDialogDemands: unknownDialogDemands.length,
      unknownBlockingSeams: unknownBlockingSeams.length,
      standaloneDialogDemands: standaloneDialogDemands.length,
      standaloneBlockingSeams: standaloneBlockingSeams.length,
      strayDialogDemands: strayDialogDemands.length,
      strayDiagnostics: strayDiagnostics.length,
      openSpreadLocalDialogDemands: openSpreadLocalDialogDemands.length,
      openSpreadLocalBlockingSeams: openSpreadLocalBlockingSeams.length,
      openSpreadSiblingDialogDemands: openSpreadSiblingDialogDemands.length,
      openSpreadSiblingDiagnostics: openSpreadSiblingDiagnostics.length,
      callerUnmappedDialogDemands: callerUnmappedDialogDemands.length,
      callerUnmappedDiagnostics: callerUnmappedDiagnostics.length,
      chainDialogDemands: chainDialogDemands.length,
      chainValidationDemands: chainValidationDemands.length,
      rootContainers: rootContainerIdentityCount(chain.store),
      childContainers: childContainerIdentityCount(chain.store),
    },
  }, null, 2));
}

async function readFixture(name) {
  const fixtureRoot = path.join(packageRoot, 'fixtures/pressure', name);
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `${name}-contract`,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-targets',
  });
  const appDiagnostics = app.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    detail: 'handles',
    page: { size: 100 },
  }).value;
  return {
    name,
    runtime,
    app,
    appDiagnostics,
    store: runtime.workspace.store,
    serviceRoots: runtime.workspace.store.productDetails
      .readBySlot(FrameworkProductDetails.ServiceRoot)
      .map((entry) => entry.detail),
    capabilityDemands: runtime.workspace.store.productDetails
      .readBySlot(FrameworkProductDetails.CapabilityDemand)
      .map((entry) => entry.detail),
  };
}

function sourceServiceDemands(fixture, requiredCapability) {
  return fixture.capabilityDemands.filter((demand) =>
    demand.siteKind === 'source-service-api'
    && demand.requiredCapability === requiredCapability
  );
}

function sourceServiceDiagnostics(fixture) {
  return fixture.appDiagnostics.rows.filter((row) =>
    row.diagnosticDomain === 'framework'
    && row.diagnosticKind === 'framework-capability-not-registered'
  );
}

function ownerRootForDemand(fixture, demand) {
  return fixture.serviceRoots.find((root) => root.identityHandle === demand.ownerIdentityHandle) ?? null;
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

function rootContainerIdentityCount(store) {
  return store.readIdentities().filter((identity) =>
    identity.kind === 'container-identity'
    && identity.containerKind === 'root'
  ).length;
}

function childContainerIdentityCount(store) {
  return store.readIdentities().filter((identity) =>
    identity.kind === 'container-identity'
    && identity.containerKind === 'child'
  ).length;
}

function chainParentWalkProof(store) {
  const chainFacts = readDiContainerChainFacts(store);
  const validationKey = interfaceKeyIdentityHandle(store, 'IValidationRules');
  const dialogKey = interfaceKeyIdentityHandle(store, 'IDialogService');
  const validationProvider = validationKey == null
    ? null
    : chainFacts.providerContainerIdentityHandlesForKey(validationKey)[0] ?? null;
  const validationChild = validationProvider == null
    ? null
    : store.readIdentities().find((identity) =>
      identity.kind === 'container-identity'
      && identity.containerKind === 'child'
      && identity.parentHandle === validationProvider
    )?.handle ?? null;
  return {
    validationKey,
    dialogKey,
    validationProvider,
    validationChild,
    validationChain: validationChild == null ? [] : chainFacts.containerChainIdentityHandles(validationChild),
    validationProviderVisibleFromChild: validationKey != null
      && validationChild != null
      && chainFacts.providerIsOnConsultingChain(validationKey, validationChild),
    dialogProviderVisibleFromValidationChild: dialogKey != null
      && validationChild != null
      && chainFacts.providerIsOnConsultingChain(dialogKey, validationChild),
  };
}

function interfaceKeyIdentityHandle(store, interfaceName) {
  return store.readIdentities().find((identity) =>
    identity.kind === 'di-key-identity'
    && identity.keyKind === 'interface'
    && identity.interfaceName === interfaceName
  )?.handle ?? null;
}

function stateSummary(demands) {
  return demands.map((demand) => `${demand.authoredName}:${demand.admissionState}`).join(', ') || '<none>';
}

function debugFixture(fixture) {
  return {
    name: fixture.name,
    demands: fixture.capabilityDemands
      .filter((demand) => demand.siteKind === 'source-service-api')
      .map((demand) => ({
        authoredName: demand.authoredName,
        requiredCapability: demand.requiredCapability,
        admissionState: demand.admissionState,
        blockingOpenSeamHandles: demand.blockingOpenSeamHandles,
        owner: ownerRootForDemand(fixture, demand),
      })),
    diagnostics: sourceServiceDiagnostics(fixture),
    openSeams: fixture.store.readOpenSeams().map((seam) => ({
      handle: seam.handle,
      seamKindKey: seam.seamKindKey,
      reasonKinds: seam.reasonKinds,
      summary: seam.summary,
    })),
    providedDiKeyNames: [...providedDiKeyInterfaceNames(fixture.store)],
    rootContainers: rootContainerIdentityCount(fixture.store),
  };
}
