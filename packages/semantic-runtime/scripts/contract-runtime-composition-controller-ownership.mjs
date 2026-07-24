import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';
import { CustomElementController } from '../out/configuration/controller.js';
import { ConfigurationProductDetails } from '../out/configuration/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';
import { TemplateProductDetails } from '../out/template/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-composition-controller-ownership-contract',
});
await runtime.openApp({ analysisDepth: 'binding-observation' });

const store = runtime.workspace.store;
const compositions = store.productDetails
  .readBySlot(TemplateProductDetails.CompositionController)
  .map((entry) => entry.detail);
const controllersByProduct = new Map(store.productDetails
  .readBySlot(ConfigurationProductDetails.Controller)
  .map((entry) => [entry.detail.productHandle, entry.detail]));
const controllerChildClaims = store.readClaims()
  .filter((claim) => claim.predicateKey === KernelVocabulary.Configuration.ControllerHasChild.key);
const closedBranches = compositions.flatMap((composition) =>
  composition.resolvedComponents.flatMap((component) =>
    component.composedController?.productHandle == null
      ? []
      : [{
          composition,
          component,
          host: controllersByProduct.get(composition.hostControllerProductHandle) ?? null,
          composed: controllersByProduct.get(component.composedController.productHandle) ?? null,
        }]
  )
);
const failures = [];

if (closedBranches.length === 0) {
  failures.push('Expected at least one closed AuCompose custom-element branch with an explicit composed-controller reference.');
}

for (const branch of closedBranches) {
  const childProductHandle = branch.component.composedController.productHandle;
  if (branch.host == null || branch.composed == null) {
    failures.push(`Composition-owned controller '${branch.component.name}' did not retain both host and composed controller products.`);
    continue;
  }
  if (!(branch.composed instanceof CustomElementController) || branch.composed.viewModel == null) {
    failures.push(`Composition-owned controller '${branch.component.name}' did not retain its final custom-element product and view-model target.`);
  }
  if (branch.composed.parent?.productHandle !== branch.composition.hostControllerProductHandle) {
    failures.push(`Composition-owned controller '${branch.component.name}' lost its real activation parent.`);
  }
  if (branch.host.children.some((child) => child.productHandle === childProductHandle)) {
    failures.push(`Composition-owned controller '${branch.component.name}' was falsely admitted to the renderer-owned host child list.`);
  }
  if (controllerChildClaims.some((claim) =>
    claim.subjectHandle === branch.composition.hostControllerProductHandle
    && claim.objectHandle === childProductHandle
  )) {
    failures.push(`Composition-owned controller '${branch.component.name}' published a false ControllerHasChild renderer edge.`);
  }
}

const summary = {
  closedBranchCount: closedBranches.length,
  branches: closedBranches.map((branch) => ({
    componentName: branch.component.name,
    hostControllerName: branch.host?.name ?? null,
    activationParentMatchesHost: branch.composed?.parent?.productHandle
      === branch.composition.hostControllerProductHandle,
    customElementTargetName: branch.composed instanceof CustomElementController
      ? branch.composed.viewModel?.localName ?? null
      : null,
    rendererChildAdmission: branch.host?.children.some((child) =>
      child.productHandle === branch.component.composedController.productHandle
    ) ?? false,
    rendererChildClaim: controllerChildClaims.some((claim) =>
      claim.subjectHandle === branch.composition.hostControllerProductHandle
      && claim.objectHandle === branch.component.composedController.productHandle
    ),
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
