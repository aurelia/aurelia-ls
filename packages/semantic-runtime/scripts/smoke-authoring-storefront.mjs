import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';
import { KernelVocabulary } from '../out/kernel/vocabulary/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/authoring/storefront';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'storefront-smoke',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'storefront',
  }],
});
const app = await runtime.openApp({ projectKey: 'storefront' });
const store = runtime.workspace.store;

const rows = (kind) => app.ask({
  kind,
  page: { size: 1000 },
  detail: 'handles',
}).value.rows;

const openSeams = rows('open-seams');
const verificationSnapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(null, [
    expectFact('Storefront reopens as an Aurelia app project.', 'project-shape'),
    expectFact('Storefront has an app root.', 'app-root'),
    expectFact('Storefront has component resource definitions.', 'component', 'at-least', 6),
    expectFact('Storefront has external component templates.', 'external-template', 'at-least', 6),
    expectFact('Storefront has compiled template rows.', 'template-compilation', 'at-least', 6),
    expectFact('Storefront has runtime controller/hydration facts.', 'runtime-controller', 'present'),
    expectFact('Storefront has binding value-channel facts.', 'binding-value-channel', 'present'),
    expectFact('Storefront has binding data-flow facts.', 'binding-data-flow', 'present'),
    expectFact('Storefront forwards captured static field-shell attributes as renderer target operations.', 'target-operation', 'present', null, [
      filter('ownerKind', 'runtime-renderer'),
      filter('operationKind', 'attribute-set'),
      filter('targetAttribute', 'data-field-kind'),
    ]),
    expectFact('Storefront forwards captured field-shell input values through native value observers.', 'binding-target-access', 'present', null, [
      filter('targetKind', 'node'),
      filter('targetProperty', 'value'),
      filter('strategy', 'value-attribute-observer'),
      filter('targetType', 'HTMLInputElement'),
    ]),
    expectFact('Storefront forwards captured field-shell disabled state through native input accessors.', 'binding-target-access', 'present', null, [
      filter('targetKind', 'node'),
      filter('targetProperty', 'disabled'),
      filter('strategy', 'element-property-accessor'),
      filter('targetType', 'HTMLInputElement'),
    ]),
    expectFact('Storefront preserves captured field-shell parent value flow.', 'binding-data-flow', 'present', null, [
      filter('sourceName', 'email'),
      filter('targetKind', 'node'),
      filter('targetProperty', 'value'),
      filter('targetValueType', 'string'),
    ]),
    expectFact('Storefront preserves captured field-shell branch value flow.', 'binding-data-flow', 'present', null, [
      filter('sourceName', 'postalCode'),
      filter('targetKind', 'node'),
      filter('targetProperty', 'value'),
      filter('targetValueType', 'string'),
    ]),
    expectFact('Storefront preserves captured field-shell disabled data flow.', 'binding-data-flow', 'present', null, [
      filter('sourceName', null),
      filter('targetKind', 'node'),
      filter('targetProperty', 'disabled'),
      filter('targetValueType', 'boolean'),
    ]),
    expectFact('Storefront has no open semantic seams.', 'open-seam-closure', 'absent'),
    expectCapability('Storefront exposes verifiable template-composition authoring.', 'template-composition', 'verifiable'),
    expectTaste('Storefront uses native control value binding.', 'form-value-channel', 'native-control-value-binding'),
    expectTaste('Storefront uses scalar ID-shaped component inputs.', 'component-interface', 'scalar-id-inputs'),
  ]),
  verificationSnapshot,
);
const templateRows = rows('template-compilations');
const runtimeControllers = rows('runtime-controllers');
const targetOperations = rows('target-operations');
const targetAccesses = rows('binding-target-accesses');
const sourceOperations = rows('binding-source-operations');
const valueChannels = rows('binding-value-channels');
const dataFlows = rows('binding-data-flows');
const dynamicInstructionOriginClaims = store
  .readClaimsForPredicate(KernelVocabulary.Instruction.DynamicInstructionOriginatesFromCapturedAttributeSyntax.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const controllerCompiledTemplateClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const controllerInstructionSequenceClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ControllerUsesInstructionSequence.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const controllerViewFactoryClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ControllerUsesViewFactory.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const viewFactoryInstructionSequenceClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ViewFactoryUsesInstructionSequence.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const viewFactoryDefinitionClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ViewFactoryUsesDefinition.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const viewFactoryCreatesSyntheticViewClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ViewFactoryCreatesSyntheticView.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);
const controllerTemplateControllerLinkClaims = store
  .readClaimsForPredicate(KernelVocabulary.Configuration.ControllerLinksTemplateController.key)
  .map((handle) => store.readClaim(handle))
  .filter((claim) => claim != null);

const failures = [];
const assert = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};
for (const result of verification.effectResults) {
  assert(
    result.outcome === 'satisfied',
    `Expected semantic effect failed: ${result.summary}`,
  );
}

const productList = templateRows.find((row) => row.definitionName === 'product-list');
const checkoutForm = templateRows.find((row) => row.definitionName === 'checkout-form');
const fieldShell = templateRows.find((row) => row.definitionName === 'field-shell');
const productCard = templateRows.find((row) => row.definitionName === 'product-card');

const fakeSpreadOperations = targetOperations.filter((row) =>
  row.definitionName === 'product-list'
  && (row.targetAttribute === '...$bindables' || row.targetProperty === '...$bindables')
);
const spreadFlows = dataFlows.filter((row) =>
  row.definitionName === 'product-list'
  && row.bindingKind === 'spread-value'
);
const spreadChannels = valueChannels.filter((row) =>
  row.definitionName === 'product-list'
  && row.bindingKind === 'spread-value'
);
const spreadAccesses = targetAccesses.filter((row) =>
  row.definitionName === 'product-list'
  && row.bindingKind === 'spread-value'
);

const refOperations = sourceOperations.filter((row) =>
  row.bindingKind === 'ref'
);
const rendererOperations = targetOperations.filter((row) =>
  row.ownerKind === 'runtime-renderer'
);
const capturedFieldShellOperations = targetOperations.filter((row) =>
  row.source?.path?.endsWith('checkout-form.html')
);
const capturedFieldShellAccesses = targetAccesses.filter((row) =>
  row.source?.path?.endsWith('checkout-form.html')
);
const capturedFieldShellFlows = dataFlows.filter((row) =>
  row.source?.path?.endsWith('checkout-form.html')
);
const syntheticControllerRows = runtimeControllers.filter((row) =>
  row.creationKind === 'synthetic-view'
);

assert(openSeams.length === 0, `Expected storefront to reopen with 0 open seams, got ${openSeams.length}.`);
assert(productList != null, 'Expected product-list template compilation row.');
assert(checkoutForm != null, 'Expected checkout-form template compilation row.');
assert(fieldShell != null, 'Expected field-shell template compilation row.');
assert(productCard != null, 'Expected product-card template compilation row.');
assert(fakeSpreadOperations.length === 0, 'Expected product-list spread syntax not to appear as static ...$bindables target operations.');
assert(spreadAccesses.some((row) =>
  row.targetProperty === 'productId'
  && row.lookup === 'accessor'
  && row.targetType === 'ProductCard'
  && row.propertyType === 'string'
  && row.openReason == null
), 'Expected closed spread-value target access for ProductCard.productId.');
assert(spreadChannels.some((row) =>
  row.targetProperty === 'productId'
  && row.channelKind === 'raw-property'
  && row.runtimeValueType === 'string'
  && row.openReason == null
), 'Expected closed spread-value raw-property value channel for productId.');
assert(spreadFlows.some((row) =>
  row.sourceName === 'featuredCardBindings.productId'
  && row.sourceType === 'string'
  && row.targetProperty === 'productId'
  && row.targetValueType === 'string'
  && row.sourceToTargetAssignable === true
  && row.openReason == null
), 'Expected closed spread-value data flow from featuredCardBindings.productId to productId.');
assert(refOperations.some((row) =>
  row.definitionName === 'checkout-form'
  && row.targetName === 'element'
  && row.targetType === 'HTMLFormElement'
  && row.openReason == null
), 'Expected closed element.ref source operation for checkout form.');
assert(refOperations.some((row) =>
  row.definitionName === 'product-list'
  && row.targetName === 'component'
  && row.targetType === 'ProductCard'
  && row.openReason == null
), 'Expected closed component.ref source operation for product-list.');
assert(refOperations.some((row) =>
  row.definitionName === 'product-list'
  && row.targetName === 'availability-badge'
  && row.targetType === 'AvailabilityBadge'
  && row.openReason == null
), 'Expected closed custom-attribute ref source operation for product-list.');
assert(rendererOperations.some((row) =>
  row.definitionName === 'product-card'
  && row.operationKind === 'class-list-add'
), 'Expected product-card surrogate SetClassAttributeRenderer target operation.');
assert(rendererOperations.some((row) =>
  row.definitionName === 'product-card'
  && row.operationKind === 'style-css-text-append'
), 'Expected product-card surrogate SetStyleAttributeRenderer target operation.');
assert(rendererOperations.some((row) =>
  row.definitionName === 'product-card'
  && row.operationKind === 'attribute-set'
), 'Expected product-card surrogate SetAttributeRenderer target operation.');
assert(capturedFieldShellOperations.some((row) =>
  row.ownerKind === 'runtime-renderer'
  && row.operationKind === 'attribute-set'
  && row.targetAttribute === 'data-field-kind'
  && row.openReason == null
), 'Expected field-shell ...$attrs to compile captured static attributes into renderer target operations at the parent capture source.');
assert(capturedFieldShellAccesses.some((row) =>
  row.bindingKind === 'property'
  && row.targetProperty === 'value'
  && row.lookup === 'observer'
  && row.strategy === 'value-attribute-observer'
  && row.targetType === 'HTMLInputElement'
  && row.openReason == null
), 'Expected field-shell ...$attrs to compile captured parent value.bind into a closed input value observer at the parent capture source.');
assert(capturedFieldShellAccesses.some((row) =>
  row.bindingKind === 'property'
  && row.targetProperty === 'disabled'
  && row.lookup === 'accessor'
  && row.targetType === 'HTMLInputElement'
  && row.openReason == null
), 'Expected field-shell ...$attrs to compile captured disabled.bind into a closed input target access at the parent capture source.');
assert(capturedFieldShellFlows.some((row) =>
  row.bindingKind === 'property'
  && row.targetProperty === 'value'
  && row.sourceName === 'email'
  && row.sourceType === 'string'
  && row.targetValueType === 'string'
  && row.sourceToTargetAssignable === true
  && row.source?.path?.endsWith('checkout-form.html')
  && row.openReason == null
), 'Expected field-shell ...$attrs to compile captured value.bind against the parent checkout-form scope.');
assert(capturedFieldShellFlows.some((row) =>
  row.bindingKind === 'property'
  && row.targetProperty === 'value'
  && row.sourceName === 'postalCode'
  && row.sourceType === 'string'
  && row.targetValueType === 'string'
  && row.sourceToTargetAssignable === true
  && row.source?.path?.endsWith('checkout-form.html')
  && row.openReason == null
), 'Expected field-shell ...$attrs under if.bind to compile captured value.bind against the nested checkout-form usage scope.');
assert(capturedFieldShellFlows.some((row) =>
  row.bindingKind === 'property'
  && row.targetProperty === 'disabled'
  && row.targetKind === 'node'
  && row.sourceType === 'boolean'
  && row.targetValueType === 'boolean'
  && row.openReason == null
), 'Expected field-shell ...$attrs to compile captured disabled.bind into closed data flow at the parent capture source.');
assert(runtimeControllers.length >= templateRows.length, 'Expected runtime controller rows for compiled template render passes.');
assert(runtimeControllers.some((row) =>
  row.creationKind === 'root-custom-element'
  && row.hydrationHandoffKind === 'compiled-template'
  && row.compiledTemplateDefinitionName === row.renderingDefinitionName
), 'Expected root custom-element controllers to point at their compiled template handoff.');
assert(runtimeControllers.some((row) =>
  row.creationKind === 'template-controller'
  && row.hydrationHandoffKind === 'instruction-sequence'
  && row.hasViewFactory === true
  && row.childViewCardinality != null
  && row.childViewRenderingState === 'expanded-aggregate'
), 'Expected template-controller controllers to point at their nested instruction-sequence handoff.');
assert(syntheticControllerRows.length >= 1, 'Expected aggregate synthetic-view controller rows for recursive child-view rendering.');
assert(syntheticControllerRows.every((row) =>
  row.hydrationHandoffKind === 'synthetic-view'
  && row.hasViewFactory === true
  && row.hasScope === true
  && row.childViewRenderingState === 'expanded-aggregate'
), 'Expected aggregate synthetic-view controller rows to carry view-factory, scope, and synthetic hydration handoff facts.');
assert(runtimeControllers.filter((row) => row.hasViewFactory).every((row) =>
  row.viewFactoryDefinitionName?.startsWith('anonymous-') === true
  && row.viewFactoryDefinitionClassName === row.viewFactoryDefinitionName
), 'Expected controller rows with view factories to expose generated embedded custom-element definition facts.');
assert(runtimeControllers.some((row) =>
  row.controllerName?.endsWith('else') === true
  && row.templateControllerLinkKind === 'else-to-if'
  && row.linkedTemplateControllerName?.endsWith('if') === true
), 'Expected else template-controller rows to link back to their controlling if controller.');
assert(runtimeControllers.some((row) =>
  row.controllerName?.endsWith('then') === true
  && row.templateControllerLinkKind === 'promise-branch-to-promise'
  && row.linkedTemplateControllerName?.endsWith('promise') === true
), 'Expected then template-controller rows to link back to their controlling promise controller.');
assert(runtimeControllers.some((row) =>
  row.controllerName?.endsWith('catch') === true
  && row.templateControllerLinkKind === 'promise-branch-to-promise'
  && row.linkedTemplateControllerName?.endsWith('promise') === true
), 'Expected catch template-controller rows to link back to their controlling promise controller.');
assert(runtimeControllers.filter((row) =>
  row.controllerName === 'case'
  && row.templateControllerLinkKind === 'switch-case-to-switch'
  && row.linkedTemplateControllerName?.endsWith('switch') === true
).length >= 2, 'Expected case template-controller rows to link back to their controlling switch controller.');
assert(runtimeControllers.some((row) =>
  row.controllerName === 'default-case'
  && row.templateControllerLinkKind === 'switch-case-to-switch'
  && row.linkedTemplateControllerName?.endsWith('switch') === true
), 'Expected default-case template-controller rows to link back to their controlling switch controller.');
assert(dynamicInstructionOriginClaims.length >= 2, 'Expected dynamic spread-created instructions to publish captured AttrSyntax origin claims.');
assert(dynamicInstructionOriginClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Instruction.Instruction.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Template.AttributeSyntax.key
), 'Expected dynamic spread origin claims to connect instruction products to captured AttrSyntax products.');
assert(controllerCompiledTemplateClaims.length >= templateRows.length, 'Expected runtime controllers to publish compiled-template association claims.');
assert(controllerCompiledTemplateClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Template.CompiledTemplate.key
), 'Expected controller compiled-template claims to connect controller products to compiled-template products.');
assert(controllerInstructionSequenceClaims.length >= 1, 'Expected template-controller runtime controllers to publish instruction-sequence association claims.');
assert(controllerInstructionSequenceClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Instruction.Sequence.key
), 'Expected controller instruction-sequence claims to connect controller products to instruction-sequence products.');
assert(controllerInstructionSequenceClaims.length === controllerViewFactoryClaims.length + viewFactoryCreatesSyntheticViewClaims.length, 'Expected controller instruction-sequence claims to cover template-controller handoffs plus aggregate synthetic views.');
assert(controllerViewFactoryClaims.length === viewFactoryInstructionSequenceClaims.length, 'Expected one controller view-factory association for each template-controller factory.');
assert(controllerViewFactoryClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Configuration.ViewFactory.key
), 'Expected controller view-factory claims to connect controller products to view-factory products.');
assert(viewFactoryInstructionSequenceClaims.length === controllerViewFactoryClaims.length, 'Expected one instruction-sequence link for each view-factory product.');
assert(viewFactoryInstructionSequenceClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.ViewFactory.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Instruction.Sequence.key
), 'Expected view-factory instruction-sequence claims to connect view-factory products to instruction-sequence products.');
assert(viewFactoryDefinitionClaims.length === viewFactoryInstructionSequenceClaims.length, 'Expected one generated embedded custom-element definition for each view-factory product.');
assert(viewFactoryDefinitionClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.ViewFactory.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Resource.Definition.key
), 'Expected view-factory definition claims to connect view-factory products to generated resource definition products.');
assert(viewFactoryCreatesSyntheticViewClaims.length === viewFactoryInstructionSequenceClaims.length, 'Expected one aggregate synthetic-view controller for each view-factory product.');
assert(viewFactoryCreatesSyntheticViewClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.ViewFactory.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
), 'Expected view-factory synthetic-view claims to connect view-factory products to aggregate controller products.');
assert(controllerTemplateControllerLinkClaims.length >= 6, 'Expected template-controller link claims for else, promise branch, and switch case controllers.');
assert(controllerTemplateControllerLinkClaims.every((claim) =>
  store.readProduct(claim.subjectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
  && store.readProduct(claim.objectHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key
), 'Expected template-controller link claims to connect controller products.');

const summary = {
  fixtureRoot,
  templates: templateRows.map((row) => ({
    definitionName: row.definitionName,
    runtimeBindings: row.runtimeBindings,
    runtimeBindingTargetAccesses: row.runtimeBindingTargetAccesses,
    runtimeBindingSourceOperations: row.runtimeBindingSourceOperations,
    runtimeBindingValueChannels: row.runtimeBindingValueChannels,
    runtimeBindingDataFlows: row.runtimeBindingDataFlows,
    openSeams: row.openSeams,
  })),
  runtimeControllers: {
    rows: runtimeControllers.length,
    compiledTemplateHandoffs: runtimeControllers.filter((row) => row.hydrationHandoffKind === 'compiled-template').length,
    instructionSequenceHandoffs: runtimeControllers.filter((row) => row.hydrationHandoffKind === 'instruction-sequence').length,
    syntheticViewHandoffs: runtimeControllers.filter((row) => row.hydrationHandoffKind === 'synthetic-view').length,
    viewFactories: runtimeControllers.filter((row) => row.hasViewFactory).length,
  },
  spreadValue: {
    targetAccesses: spreadAccesses.length,
    valueChannels: spreadChannels.length,
    dataFlows: spreadFlows.length,
  },
  refOperations: refOperations.length,
  rendererOperations: rendererOperations.length,
  dynamicInstructionOriginClaims: dynamicInstructionOriginClaims.length,
  controllerCompiledTemplateClaims: controllerCompiledTemplateClaims.length,
  controllerInstructionSequenceClaims: controllerInstructionSequenceClaims.length,
  controllerViewFactoryClaims: controllerViewFactoryClaims.length,
  viewFactoryInstructionSequenceClaims: viewFactoryInstructionSequenceClaims.length,
  viewFactoryDefinitionClaims: viewFactoryDefinitionClaims.length,
  viewFactoryCreatesSyntheticViewClaims: viewFactoryCreatesSyntheticViewClaims.length,
  controllerTemplateControllerLinkClaims: controllerTemplateControllerLinkClaims.length,
  authoringVerification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
  openSeams: openSeams.length,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function expectFact(summary, effectKind, cardinality = 'present', count = null, filters = []) {
  return ExpectedSemanticEffect.fact(summary, effectKind, 'app', null, cardinality, count, filters);
}

function expectCapability(summary, capabilityKey, minimumSupportState) {
  return ExpectedSemanticEffect.capability(summary, capabilityKey, minimumSupportState);
}

function expectTaste(summary, tasteAxisKey, tasteValueKey) {
  return ExpectedSemanticEffect.taste(summary, tasteAxisKey, tasteValueKey);
}

function filter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}
