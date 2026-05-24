import {
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  ConfigureStateStoreOperation,
} from './operation.js';
import {
  AuthoringIntent,
  AuthoringPlan,
  AuthoringPlanStep,
  AuthoringPrecondition,
} from './plan.js';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import {
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
} from './form-expected-effects.js';
import {
  componentStyleAssetPlanStep,
  configurePluginPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  defaultStateStoreListDomainNames,
  stateStoreListSourcePlan,
  stateStoreListDomainNamesFromParameters,
  type StateStoreListDomainNames,
  type StateStoreListSourcePlanModel,
} from './state-store-list-source-plan.js';

export interface StateStoreListRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  /** Entrypoint source path, usually `src/main.ts`. */
  readonly entrypointPath?: string;
  /** Root component source path, usually `src/app.ts`. */
  readonly rootComponentPath?: string;
  /** Root component template path, usually `src/app.html`. */
  readonly rootTemplatePath?: string;
  /** Root component stylesheet path, usually `src/app.css`. */
  readonly rootStylePath?: string;
  /** Root component class name. */
  readonly rootComponentClassName?: string;
  /** Root custom element name. */
  readonly rootElementName?: string;
  /** State store source path. */
  readonly statePath?: string;
  /** Caller-domain editable task-like item identity for @aurelia/state source plans. */
  readonly storeItemName?: string;
  /** Caller-domain editable store collection member for repeat/state scope source plans. */
  readonly storeCollectionName?: string;
}

type StateStoreListRecipeModel = StateStoreListSourcePlanModel;

export function buildStateStoreListPlan(request: StateStoreListRecipeRequest): AuthoringPlan {
  const model = normalizeStateStoreListRecipe(request);
  const topology = stateStoreListTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as an Aurelia app using @aurelia/state stores and state binding syntax.`,
      topology,
      null,
      stateStoreListPreferences(),
    ),
    stateStoreListPreconditions(),
    stateStoreListPlanSteps(model, topology),
    topology,
    stateStoreListSourcePlan(model),
  );
}

function normalizeStateStoreListRecipe(request: StateStoreListRecipeRequest): StateStoreListRecipeModel {
  const storeDomain = request.storeItemName == null && request.storeCollectionName == null
    ? defaultStateStoreListDomainNames()
    : stateStoreListDomainNamesFromParameters(request.storeItemName ?? 'Task', request.storeCollectionName);
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootStylePath: request.rootStylePath ?? 'src/app.css',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    statePath: request.statePath ?? 'src/state/task-store.ts',
    storeDomain,
  };
}

function stateStoreListPreferences(): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'aurelia-state-store'),
    new AuthoringPreference('resource-admission-mode', 'plugin-registration-admission'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
  ];
}

function stateStoreListPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
    new AuthoringPrecondition('@aurelia/state is an intentional app-state choice rather than the default DI-owned state-class recipe.'),
  ];
}

function stateStoreListPlanSteps(
  model: StateStoreListRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
    ]),
    configurePluginPlanStep(
      'StateDefaultConfiguration',
      '@aurelia/state',
      [
        ExpectedSemanticEffect.discriminatorFact('@aurelia/state plugin configuration should admit state template resources.', 'dependency-injection', 'di', 'plugin'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize plugin registration admission.', 'resource-admission-mode', 'plugin-registration-admission', 'plugin'),
      ],
    ),
    new AuthoringPlanStep(
      new ConfigureStateStoreOperation(model.statePath, ['default', 'filters']),
      stateStoreConfigurationExpectedEffects(),
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    templateBindingPlanStep(
      model.rootTemplatePath,
      '@aurelia/state .state/.dispatch commands plus default and named & state binding behavior usage',
      stateStoreTemplateBindingExpectedEffects(model.storeDomain),
    ),
    verifyAppPlanStep(topology, stateStoreListExpectedEffects(model.storeDomain)),
  ];
}

function stateStoreListTopology(model: StateStoreListRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const root = builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    styles: [{
      path: model.rootStylePath,
      assetKind: 'component-stylesheet',
      sourceKind: 'css-import',
    }],
  });
  builder.service({
    className: model.storeDomain.stateInterfaceName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.register(StateDefaultConfiguration.init(...).withStore(...)).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport('@aurelia/state', ['StateDefaultConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
  return builder.toTopology();
}

function stateStoreListExpectedEffects(domain: StateStoreListDomainNames): readonly ExpectedSemanticEffect[] {
  const prefix = 'Generated state-store list app';
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(`${prefix} has a root custom element.`, 'component', 'resource', 1, 'component'),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.atLeast(`${prefix} has an external template.`, 'external-template', 'template', 1, 'template'),
    componentStylesheetEffect(`${prefix} has a component stylesheet.`),
    componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
    componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', 1, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
    ...stateStoreConfigurationExpectedEffects(),
    ...stateStoreTemplateBindingExpectedEffects(domain),
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
  ];
}

function stateStoreConfigurationExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.discriminatorFact('Default @aurelia/state store should materialize from StateDefaultConfiguration.init(...).', 'state-store', 'app', 'plugin', 'present', null, [
      new ExpectedSemanticEffectFilter('name', 'default'),
      new ExpectedSemanticEffectFilter('isDefault', true),
      new ExpectedSemanticEffectFilter('initialStateKind', 'object'),
      new ExpectedSemanticEffectFilter('optionsOrHandlerKind', 'action-handler'),
      new ExpectedSemanticEffectFilter('actionHandlerCount', 1),
    ]),
    ExpectedSemanticEffect.signatureFact('Named filters @aurelia/state store should materialize from withStore(...).', 'state-store', 'app', 'plugin', 'present', null, [
      new ExpectedSemanticEffectFilter('name', 'filters'),
      new ExpectedSemanticEffectFilter('isDefault', false),
      new ExpectedSemanticEffectFilter('initialStateKind', 'object'),
      new ExpectedSemanticEffectFilter('optionsOrHandlerKind', 'action-handler'),
      new ExpectedSemanticEffectFilter('actionHandlerCount', 1),
    ]),
    ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize @aurelia/state store ownership.', 'state-ownership', 'aurelia-state-store', 'state-model'),
  ];
}

function stateStoreTemplateBindingExpectedEffects(domain: StateStoreListDomainNames): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact('Default & state binding behavior should materialize as a runtime application.', 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
      new ExpectedSemanticEffectFilter('behaviorName', 'state'),
    ]),
    ExpectedSemanticEffect.signatureFact('Named & state binding behavior should preserve the static store argument.', 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
      new ExpectedSemanticEffectFilter('behaviorName', 'state'),
      new ExpectedSemanticEffectFilter('staticArgumentValues', 'filters'),
    ]),
    ExpectedSemanticEffect.signatureFact('State command should expose store-state value flow into a native input.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'state'),
      new ExpectedSemanticEffectFilter('sourceName', 'draft'),
      new ExpectedSemanticEffectFilter('targetKind', 'node'),
      new ExpectedSemanticEffectFilter('targetProperty', 'value'),
      new ExpectedSemanticEffectFilter('valueChannelKind', 'raw-property'),
    ]),
    ExpectedSemanticEffect.signatureFact('Default & state interpolation should read title from the default store scope.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'content'),
      new ExpectedSemanticEffectFilter('sourceName', 'title'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'title'),
      new ExpectedSemanticEffectFilter('sourceType', 'string'),
      new ExpectedSemanticEffectFilter('targetProperty', 'textContent'),
      new ExpectedSemanticEffectFilter('valueChannelKind', 'text-content'),
    ]),
    ExpectedSemanticEffect.signatureFact('Named & state interpolation should read label from the filters store scope.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'content'),
      new ExpectedSemanticEffectFilter('sourceName', 'label'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'label'),
      new ExpectedSemanticEffectFilter('sourceType', 'string'),
      new ExpectedSemanticEffectFilter('targetProperty', 'textContent'),
      new ExpectedSemanticEffectFilter('valueChannelKind', 'text-content'),
    ]),
    ExpectedSemanticEffect.signatureFact(`Repeat should read ${domain.collectionPropertyName} from the default store scope.`, 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'property'),
      new ExpectedSemanticEffectFilter('sourceName', domain.collectionPropertyName),
      new ExpectedSemanticEffectFilter('sourceRootName', domain.collectionPropertyName),
      new ExpectedSemanticEffectFilter('sourceType', `readonly ${domain.itemInterfaceName}[]`),
      new ExpectedSemanticEffectFilter('targetKind', 'controller-view-model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'items'),
    ]),
    ExpectedSemanticEffect.signatureFact('Disabled binding should keep the store-scope draft comparison displayable.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'property'),
      new ExpectedSemanticEffectFilter('sourceName', 'draft === ""'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'draft'),
      new ExpectedSemanticEffectFilter('sourceType', 'boolean'),
      new ExpectedSemanticEffectFilter('targetProperty', 'disabled'),
    ]),
    ExpectedSemanticEffect.signatureAtLeast('Dispatch commands should expose store action payload value channels.', 'binding-value-channel', 'template', 2, 'template-binding', [
      new ExpectedSemanticEffectFilter('bindingKind', 'state-dispatch'),
      new ExpectedSemanticEffectFilter('sourceOperationKind', 'state-dispatch-action'),
      new ExpectedSemanticEffectFilter('channelKind', 'state-dispatch-action'),
    ]),
    ExpectedSemanticEffect.signatureFact('Input dispatch payload should refine $event.target.value through the authored input element.', 'binding-value-channel', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'state-dispatch'),
      new ExpectedSemanticEffectFilter('targetProperty', 'input'),
      new ExpectedSemanticEffectFilter('sourceOperationKind', 'state-dispatch-action'),
      new ExpectedSemanticEffectFilter('runtimeValueType', `{ type: ${JSON.stringify(domain.setDraftActionType)}; value: string }`),
    ]),
    ExpectedSemanticEffect.signatureFact('Input dispatch payload should observe $event.target.value from the authored input.', 'binding-observed-dependency', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'state-dispatch'),
      new ExpectedSemanticEffectFilter('sourceName', '$event.target.value'),
      new ExpectedSemanticEffectFilter('sourceRootName', '$event'),
      new ExpectedSemanticEffectFilter('memberName', 'value'),
      new ExpectedSemanticEffectFilter('dependencyKind', 'template-expression-read'),
    ]),
    ExpectedSemanticEffect.signatureFact('Default & state title interpolation should publish store-scope observed dependencies.', 'binding-observed-dependency', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'content'),
      new ExpectedSemanticEffectFilter('sourceName', 'title'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'title'),
      new ExpectedSemanticEffectFilter('dependencyKind', 'template-expression-read'),
    ]),
    ExpectedSemanticEffect.signatureFact('Named & state label interpolation should publish filters-store observed dependencies.', 'binding-observed-dependency', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'content'),
      new ExpectedSemanticEffectFilter('sourceName', 'label'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'label'),
      new ExpectedSemanticEffectFilter('dependencyKind', 'template-expression-read'),
    ]),
    ExpectedSemanticEffect.signatureFact(`Repeat should publish store-scope ${domain.collectionPropertyName} observed dependencies.`, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingKind', 'property'),
      new ExpectedSemanticEffectFilter('sourceName', domain.collectionPropertyName),
      new ExpectedSemanticEffectFilter('sourceRootName', domain.collectionPropertyName),
      new ExpectedSemanticEffectFilter('dependencyKind', 'template-expression-read'),
    ]),
  ];
}
