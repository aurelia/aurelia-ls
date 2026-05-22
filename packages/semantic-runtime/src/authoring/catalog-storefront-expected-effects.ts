import {
  ExpectedSemanticEffect,
  expectedSemanticEffectFilters,
} from './expected-effect.js';
import {
  bindingBehaviorApplicationEffect,
  checkedDataFlowEffect,
  checkedTargetAccessEffect,
  checkedValueChannelEffect,
  classToggleDataFlowEffect,
  classToggleStyleTasteEffect,
  classToggleTargetAccessEffect,
  classToggleValueChannelEffect,
  classTokenStyleTasteEffect,
  classTokenInterpolationDataFlowEffect,
  classTokenTargetAccessEffect,
  classTokenValueChannelEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  directStateDomainTemplateBindingTasteEffect,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
  sourceBackedGetterObservationTasteEffect,
  stylePropertyDataFlowEffect,
  stylePropertyStyleTasteEffect,
  stylePropertyTargetAccessEffect,
  stylePropertyValueChannelEffect,
  styleRuleInterpolationDataFlowEffect,
  styleRuleStyleTasteEffect,
  styleRuleTargetAccessEffect,
  styleRuleValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  promiseTemplateControllerRuntimeEffects,
  switchTemplateControllerRuntimeEffects,
  syntheticViewRuntimeEffect,
  templateControllerRuntimeEffect,
  templateControllerValueChannelEffect,
  templateControllerValueDataFlowEffect,
} from './template-controller-expected-effects.js';
import {
  navigationOwnershipTasteEffects,
  routeNodeChildFirstParameterValueEffect,
  routeNodeChildFirstQueryValueEffect,
  routeNodeParameterValueEffect,
  routeNodeViewportEffect,
  routePatternParameterEffect,
  routeProductDiscriminatorEffect,
  routeProductSignatureEffect,
  routeRecognizedParameterEffect,
  routeRecognizedParameterValueEffect,
} from './route-expected-effects.js';
import {
  catalogStorefrontFieldFeatureProfile,
  type CatalogStorefrontFieldFeatureProfile,
  type CatalogStorefrontFieldSchema,
} from './catalog-storefront-field-schema.js';

export interface CatalogStatePlanStepExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly stateClassName: string;
  readonly includeCollectionKeyDependency?: boolean;
  readonly composedStateCount?: number;
  readonly domain?: CatalogExpectedEffectDomain | null;
}

export interface CatalogServicePlanStepExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly serviceClassName: string;
}

export interface CatalogListTemplateExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly includeEntityTargetCheck?: boolean;
  readonly includeLocalObjectBinding?: boolean;
  readonly includeReferencePresentation?: boolean;
  readonly routeParameterName?: string | null;
  readonly domain?: CatalogExpectedEffectDomain | null;
  readonly fieldSchema?: CatalogStorefrontFieldSchema | null;
}

export interface CatalogAppExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly componentCount: number;
  readonly componentCountSummary: string;
  readonly externalTemplateCount: number;
  readonly compiledTemplateCount: number;
  readonly stateClassName: string;
  readonly serviceClassName: string;
  readonly cardClassName: string;
  readonly cardElementName: string;
  readonly includeListRendererRole?: boolean;
  readonly includeEventSurfaceRole?: boolean;
  readonly includeComponentStylesheet?: boolean;
  readonly includeLocalObjectBinding?: boolean;
  readonly includeReferencePresentation?: boolean;
  readonly includeStatusPromise?: boolean;
  readonly includeCollectionKeyDependency?: boolean;
  readonly includeSelectionCountGetter?: boolean;
  readonly composedStateCount?: number;
  readonly route?: CatalogRouteAppExpectedEffectsOptions | null;
  readonly domain?: CatalogExpectedEffectDomain | null;
  readonly fieldSchema?: CatalogStorefrontFieldSchema | null;
}

export interface CatalogExpectedEffectDomain {
  readonly entityClassName: string;
  readonly entityTitle: string;
  readonly entityVariableName: string;
  readonly collectionPropertyName: string;
  readonly collectionLabelLower: string;
  readonly collectionStorePropertyName: string;
  readonly visibleCollectionGetterName: string;
  readonly entityAvailabilityTypeName: string;
  readonly readEntityMethodName: string;
}

function catalogExpectedEffectDomain(
  domain: CatalogExpectedEffectDomain | null | undefined,
): CatalogExpectedEffectDomain {
  return domain ?? {
    entityClassName: 'Item',
    entityTitle: 'Item',
    entityVariableName: 'item',
    collectionPropertyName: 'items',
    collectionLabelLower: 'items',
    collectionStorePropertyName: 'itemsById',
    visibleCollectionGetterName: 'visibleItems',
    entityAvailabilityTypeName: 'ItemAvailability',
    readEntityMethodName: 'readItem',
  };
}

function catalogExpectedEffectFeatureProfile(
  fieldSchema: CatalogStorefrontFieldSchema | null | undefined,
): CatalogStorefrontFieldFeatureProfile {
  return fieldSchema == null
    ? {
      hasPricePresentation: true,
      hasStockSemantics: true,
      hasBadgeSemantics: true,
      hasAvailabilitySwitch: true,
      hasCardStyleBindings: true,
    }
    : catalogStorefrontFieldFeatureProfile(fieldSchema);
}

export interface CatalogRouteAppExpectedEffectsOptions {
  readonly detailRouteClassName: string;
  readonly detailRouteElementName: string;
  readonly routeParameterName: string;
  readonly routeParameterValue: string;
  readonly routeQueryRefName: string;
  readonly routeQueryRefValue: string;
  readonly routeViewportName: string;
}

/** Step-level effects for the DI-owned state model used by catalog recipes. */
export function catalogStatePlanStepExpectedEffects(
  options: CatalogStatePlanStepExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const domain = catalogExpectedEffectDomain(options.domain);
  return [
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} state source should be visible in app topology.`, 'service-class', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['role', 'state-source'],
      ['className', options.stateClassName],
    )),
    ExpectedSemanticEffect.signatureAtLeast(`${options.summaryPrefix} state should expose composed state objects.`, 'state-composition', 'di', options.composedStateCount ?? 2, 'state-model', expectedSemanticEffectFilters(
      ['ownerClassName', options.stateClassName],
    )),
    ExpectedSemanticEffect.signatureTaste(`${options.summaryPrefix} authoring orientation should recognize DI-owned state.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    catalogCollectionGetterObserverEffect(`${options.summaryPrefix} ${domain.collectionLabelLower} collection should use plain getter observation.`, domain),
    ...(options.includeCollectionKeyDependency === false
      ? []
      : [catalogCollectionKeyDependencyEffect(`${options.summaryPrefix} ${domain.collectionLabelLower} collection plain getter should observe Map values.`, domain)]),
  ];
}

/** Step-level effects for the DI-owned service boundary used by catalog recipes. */
export function catalogServicePlanStepExpectedEffects(
  options: CatalogServicePlanStepExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.discriminatorFact(`${options.summaryPrefix} service source should be visible in app topology.`, 'service-class', 'di', 'service', 'present', null, expectedSemanticEffectFilters(
      ['role', 'service-source'],
      ['className', options.serviceClassName],
    )),
    ExpectedSemanticEffect.discriminatorTaste(`${options.summaryPrefix} authoring orientation should recognize a DI-owned service layer.`, 'state-ownership', 'di-owned-service-layer', 'service'),
  ];
}

/** Step-level effects for list rendering and card handoff in catalog recipes. */
export function catalogListTemplateExpectedEffects(
  options: CatalogListTemplateExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const domain = catalogExpectedEffectDomain(options.domain);
  const featureProfile = catalogExpectedEffectFeatureProfile(options.fieldSchema);
  const includeLocalObjectBinding = options.includeLocalObjectBinding !== false;
  const includeReferencePresentation = options.includeReferencePresentation !== false;
  return [
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} should expose list-renderer component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'list-renderer'],
    )),
    ...(includeLocalObjectBinding
      ? [entityObjectBindingDataFlowEffect(`${options.summaryPrefix} should bind local ${domain.entityClassName} objects into a local card.`, domain)]
      : []),
    directCatalogCollectionObservedDependencyEffect(`${options.summaryPrefix} should observe direct DI state ${domain.collectionLabelLower} without VM forwarding getters.`, domain),
    ...(includeLocalObjectBinding
      ? [ExpectedSemanticEffect.signatureTaste(`${options.summaryPrefix} authoring orientation should recognize object-shaped component inputs.`, 'component-interface', 'object-inputs', 'component')]
      : []),
    ExpectedSemanticEffect.signatureTaste(`${options.summaryPrefix} authoring orientation should recognize template-controller composition.`, 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    ...catalogFilterControlExpectedEffects(options.summaryPrefix, domain, featureProfile),
    templateControllerRuntimeEffect(`${options.summaryPrefix} should materialize repeat template-controller hydration.`, 'iteration', 'many'),
    syntheticViewRuntimeEffect(`${options.summaryPrefix} should materialize repeat synthetic-view hydration.`, 'iteration', 'many'),
    ...(includeReferencePresentation
      ? [
        classTokenStyleTasteEffect(`${options.summaryPrefix} authoring orientation should recognize class-token style binding.`),
        styleRuleStyleTasteEffect(`${options.summaryPrefix} authoring orientation should recognize style-rule binding.`),
        ...(featureProfile.hasCardStyleBindings
          ? [
            classToggleStyleTasteEffect(`${options.summaryPrefix} authoring orientation should recognize class-toggle style binding.`),
            stylePropertyStyleTasteEffect(`${options.summaryPrefix} authoring orientation should recognize style-property binding.`),
          ]
          : []),
      ]
      : []),
    ...(options.includeEntityTargetCheck === true
      ? [entityTargetPropertyEffect(`${options.summaryPrefix} card target property should stay ${domain.entityVariableName}.`, domain)]
      : []),
    ...(options.routeParameterName == null
      ? []
      : [routePatternParameterEffect(`${options.summaryPrefix} detail route should recognize the authored entity parameter name.`, options.routeParameterName)]),
  ];
}

export function catalogAvailabilityTemplateExpectedEffects(
  summaryPrefix: string,
  fieldSchema?: CatalogStorefrontFieldSchema | null,
): readonly ExpectedSemanticEffect[] {
  if (!catalogExpectedEffectFeatureProfile(fieldSchema).hasAvailabilitySwitch) {
    return [];
  }
  return switchTemplateControllerRuntimeEffects(`${summaryPrefix} availability`);
}

export function catalogStatusTemplateExpectedEffects(
  summaryPrefix: string,
): readonly ExpectedSemanticEffect[] {
  return promiseTemplateControllerRuntimeEffects(`${summaryPrefix} status`);
}

/** Verification-level effects shared by recommendable catalog app recipes. */
export function catalogAppExpectedEffects(
  options: CatalogAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const prefix = options.summaryPrefix;
  const domain = catalogExpectedEffectDomain(options.domain);
  const featureProfile = catalogExpectedEffectFeatureProfile(options.fieldSchema);
  const includeComponentStylesheet = options.includeComponentStylesheet !== false;
  const includeLocalObjectBinding = options.includeLocalObjectBinding !== false;
  const includeReferencePresentation = options.includeReferencePresentation !== false;
  const includeStatusPromise = options.includeStatusPromise !== false;
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(`${prefix} has ${options.componentCountSummary}.`, 'component', 'resource', options.componentCount, 'component'),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'app-root'],
    )),
    ...(options.route == null
      ? []
      : [ExpectedSemanticEffect.signatureFact(`${prefix} has a routed-component role.`, 'component-role', 'route', 'route', 'present', null, expectedSemanticEffectFilters(
        ['roleKind', 'routed-component'],
      ))]),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a component-composition host role.`, 'component-role', 'resource', 'component', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'component-composition-host'],
    )),
    ...(options.includeListRendererRole === true
      ? [ExpectedSemanticEffect.signatureFact(`${prefix} has a list-renderer component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
        ['roleKind', 'list-renderer'],
      ))]
      : []),
    ...(options.includeEventSurfaceRole === true
      ? [ExpectedSemanticEffect.signatureFact(`${prefix} has an event-surface component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
        ['roleKind', 'event-surface'],
      ))]
      : []),
    ExpectedSemanticEffect.atLeast(`${prefix} has external templates.`, 'external-template', 'template', options.externalTemplateCount, 'template'),
    ...(includeComponentStylesheet
      ? [
        componentStylesheetEffect(`${prefix} has a component stylesheet.`),
        componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
      ]
      : []),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', options.compiledTemplateCount, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
    ...catalogRouteAppEffects(prefix, options.route ?? null),
    ...catalogStyleAndTemplateEffects(prefix, domain, featureProfile, includeReferencePresentation, includeStatusPromise),
    ...catalogFilterControlExpectedEffects(prefix, domain, featureProfile),
    ...(includeLocalObjectBinding
      ? [entityObjectBindingDataFlowEffect(`${prefix} has local ${domain.entityClassName}-object binding data flow.`, domain)]
      : []),
    directCatalogCollectionObservedDependencyEffect(`${prefix} exposes observed dependencies for direct state-member template reads.`, domain),
    catalogCollectionGetterObserverEffect(`${prefix} exposes plain ${domain.collectionLabelLower} collection getter observation.`, domain),
    ...(options.includeCollectionKeyDependency === true
      ? [catalogCollectionKeyDependencyEffect(`${prefix} exposes ${domain.collectionLabelLower} collection getter dependency rows.`, domain)]
      : []),
    ...(options.includeSelectionCountGetter === true
      ? [selectionCountGetterObserverEffect(`${prefix} exposes plain selection count getter observation.`)]
      : []),
    ...catalogStateAndServiceAppEffects(prefix, options),
    ...catalogTemplateStateHandoffEffects(prefix, options, domain, featureProfile, includeReferencePresentation),
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
    ExpectedSemanticEffect.capability(`${prefix} exposes verifiable template composition.`, 'template-composition', 'verifiable'),
    ...(options.route == null
      ? []
      : [ExpectedSemanticEffect.discriminatorCapability(`${prefix} exposes verifiable router authoring for the modeled route topology.`, 'router', 'verifiable')]),
    ...catalogTasteEffects(prefix, options.route != null, featureProfile, includeReferencePresentation, includeLocalObjectBinding),
  ];
}

function catalogFilterControlExpectedEffects(
  summaryPrefix: string,
  domain: CatalogExpectedEffectDomain = catalogExpectedEffectDomain(null),
  featureProfile: CatalogStorefrontFieldFeatureProfile = catalogExpectedEffectFeatureProfile(null),
): readonly ExpectedSemanticEffect[] {
  return [
    nativeValueTargetAccessEffect(`${summaryPrefix} should expose native filter value target access.`),
    nativeValueChannelEffect(`${summaryPrefix} should expose native filter value channels.`),
    nativeValueDataFlowEffect(`${summaryPrefix} should expose native filter value data flow.`),
    ...(featureProfile.hasStockSemantics
      ? [
        checkedTargetAccessEffect(`${summaryPrefix} should expose in-stock checked target access.`),
        checkedValueChannelEffect(`${summaryPrefix} should expose in-stock checked value channels.`),
        checkedDataFlowEffect(`${summaryPrefix} should expose in-stock checked data flow.`),
      ]
      : []),
    ...(featureProfile.hasBadgeSemantics
      ? [ExpectedSemanticEffect.signatureFact(`${summaryPrefix} should expose badge select option-list observer coupling.`, 'binding-value-channel', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
        ['observerCouplings', 'select-option-list-mutation-observer'],
      ))]
      : []),
    bindingBehaviorApplicationEffect(`${summaryPrefix} should expose debounce binding behavior for search.`, 'debounce'),
    directCatalogFilterObservedDependencyEffect(`${summaryPrefix} should observe direct DI state search filter reads.`, domain),
    ExpectedSemanticEffect.signatureTaste(
      `${summaryPrefix} should recognize native filter value binding taste.`,
      'form-value-channel',
      'native-control-value-binding',
      'template-binding',
    ),
    ...(featureProfile.hasStockSemantics
      ? [ExpectedSemanticEffect.signatureTaste(
        `${summaryPrefix} should recognize checked filter binding taste.`,
        'form-value-channel',
        'checked-model-binding',
        'template-binding',
      )]
      : []),
    ...(featureProfile.hasBadgeSemantics
      ? [ExpectedSemanticEffect.signatureTaste(
        `${summaryPrefix} should recognize select filter binding taste.`,
        'form-value-channel',
        'select-model-binding',
        'template-binding',
      )]
      : []),
  ];
}

function catalogRouteAppEffects(
  prefix: string,
  route: CatalogRouteAppExpectedEffectsOptions | null,
): readonly ExpectedSemanticEffect[] {
  if (route == null) {
    return [];
  }
  return [
    ExpectedSemanticEffect.discriminatorFact(`${prefix} has route/router topology facts.`, 'route', 'route', 'route'),
    routeProductDiscriminatorEffect(`${prefix} has source-backed RouteConfig products.`, 'route-config'),
    routeProductSignatureEffect(`${prefix} has RouteContext topology products.`, 'route-context'),
    routeProductSignatureEffect(`${prefix} has au-viewport products.`, 'router-viewport'),
    routeProductSignatureEffect(`${prefix} has ViewportAgent products.`, 'viewport-agent'),
    routeProductSignatureEffect(`${prefix} has route-recognizer pattern products.`, 'route-pattern'),
    routeProductSignatureEffect(`${prefix} has route-recognizer endpoint products.`, 'route-endpoint'),
    routeProductSignatureEffect(`${prefix} has route-recognizer state products.`, 'route-recognizer-state'),
    routeProductSignatureEffect(`${prefix} has TypedNavigationInstruction products.`, 'typed-navigation-instruction'),
    routeProductSignatureEffect(`${prefix} has ViewportInstruction products.`, 'viewport-instruction'),
    routeProductSignatureEffect(`${prefix} has ViewportInstructionTree products.`, 'viewport-instruction-tree'),
    routeProductSignatureEffect(`${prefix} has RecognizedRoute products.`, 'recognized-route'),
    routeRecognizedParameterEffect(`${prefix} recognizes the entity route parameter from static navigation.`, route.routeParameterName),
    routeRecognizedParameterValueEffect(`${prefix} recognizes the concrete entity route parameter value.`, route.routeParameterName, route.routeParameterValue),
    routeProductSignatureEffect(`${prefix} has RouteTree products.`, 'route-tree'),
    routeProductSignatureEffect(`${prefix} has RouteNode products.`, 'route-node'),
    routeNodeParameterValueEffect(`${prefix} route node carries the concrete entity route parameter value.`, route.routeParameterName, route.routeParameterValue),
    routeNodeChildFirstParameterValueEffect(`${prefix} route node exposes child-first entity route parameters.`, route.routeParameterName, route.routeParameterValue),
    routeNodeChildFirstQueryValueEffect(`${prefix} route node exposes include-query source values.`, route.routeQueryRefName, route.routeQueryRefValue),
    routeNodeViewportEffect(`${prefix} route node carries the main viewport.`, route.routeViewportName),
    routeProductSignatureEffect(`${prefix} has ComponentAgent handoff products.`, 'component-agent'),
  ];
}

function catalogStyleAndTemplateEffects(
  prefix: string,
  domain: CatalogExpectedEffectDomain,
  featureProfile: CatalogStorefrontFieldFeatureProfile,
  includeReferencePresentation: boolean,
  includeStatusPromise: boolean,
): readonly ExpectedSemanticEffect[] {
  return [
    ...(includeReferencePresentation
      ? [
        classTokenTargetAccessEffect(`${prefix} has class interpolation target access.`),
        classTokenValueChannelEffect(`${prefix} has class-token value channels.`),
        classTokenInterpolationDataFlowEffect(`${prefix} has class interpolation data flow.`),
        styleRuleTargetAccessEffect(`${prefix} has style interpolation target access.`),
        styleRuleValueChannelEffect(`${prefix} has style-rule value channels.`),
        styleRuleInterpolationDataFlowEffect(`${prefix} has style interpolation data flow.`),
        ...(featureProfile.hasCardStyleBindings
          ? [
            classToggleTargetAccessEffect(`${prefix} has class-toggle target access.`),
            classToggleValueChannelEffect(`${prefix} has class-toggle value channels.`),
            classToggleDataFlowEffect(`${prefix} has class-toggle data flow.`),
            stylePropertyTargetAccessEffect(`${prefix} has style-property target access.`),
            stylePropertyValueChannelEffect(`${prefix} has style-property value channels.`),
            stylePropertyDataFlowEffect(`${prefix} has style-property data flow.`),
          ]
          : []),
      ]
      : []),
    templateControllerRuntimeEffect(`${prefix} has conditional template-controller rows.`, 'conditional', 'optional'),
    templateControllerRuntimeEffect(`${prefix} has else template-controller rows.`, 'conditional-else', 'optional'),
    templateControllerRuntimeEffect(`${prefix} has repeat template-controller rows.`, 'iteration', 'many'),
    syntheticViewRuntimeEffect(`${prefix} has repeat synthetic-view rows.`, 'iteration', 'many'),
    ...(includeStatusPromise
      ? promiseTemplateControllerRuntimeEffects(`${prefix} has catalog-status`)
      : []),
    ...(featureProfile.hasAvailabilitySwitch
      ? switchTemplateControllerRuntimeEffects(`${prefix} has availability`)
      : []),
    templateControllerValueChannelEffect(`${prefix} has truthiness value channels for conditional controllers.`, 'template-controller-truthiness', 'boolean'),
    templateControllerValueDataFlowEffect(`${prefix} preserves boolean truthiness inputs for conditional controllers.`, 'template-controller-truthiness', 'boolean'),
    ...(featureProfile.hasAvailabilitySwitch
      ? [
        templateControllerValueChannelEffect(`${prefix} has switch owner value-channel typing.`, 'template-controller-switch-value', domain.entityAvailabilityTypeName),
        templateControllerValueDataFlowEffect(`${prefix} preserves availability enum inputs for switch controllers.`, 'template-controller-switch-value', domain.entityAvailabilityTypeName, `${domain.entityVariableName}.availability`),
      ]
      : []),
    ...(includeStatusPromise
      ? [
        templateControllerValueChannelEffect(`${prefix} has promise owner value-channel typing.`, 'template-controller-promise-value', 'Promise<string>', 'Promise<unknown>'),
        templateControllerValueDataFlowEffect(`${prefix} preserves promise inputs for promise controllers.`, 'template-controller-promise-value', 'Promise<string>', 'catalogStatus', 'Promise<unknown>'),
        templateControllerValueChannelEffect(`${prefix} has fulfilled promise branch value-channel typing.`, 'template-controller-promise-branch-value', 'string'),
        templateControllerValueDataFlowEffect(`${prefix} unwraps fulfilled promise branch values into template scope.`, 'template-controller-promise-branch-value', 'string', 'notice'),
      ]
      : []),
  ];
}

function catalogStateAndServiceAppEffects(
  prefix: string,
  options: CatalogAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact(`${prefix} has a state service-class row.`, 'service-class', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['role', 'state-source'],
      ['className', options.stateClassName],
    )),
    ExpectedSemanticEffect.discriminatorFact(`${prefix} has a service-layer service-class row.`, 'service-class', 'di', 'service', 'present', null, expectedSemanticEffectFilters(
      ['role', 'service-source'],
      ['className', options.serviceClassName],
    )),
    ExpectedSemanticEffect.signatureAtLeast(`${prefix} has composed state rows.`, 'state-composition', 'di', options.composedStateCount ?? 2, 'state-model', expectedSemanticEffectFilters(
      ['ownerClassName', options.stateClassName],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} components call the DI-owned state layer.`, 'service-interaction', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['consumerRole', 'component-source'],
      ['targetRole', 'state-source'],
      ['operationKind', 'call'],
      ['isSelfInteraction', false],
    )),
    ExpectedSemanticEffect.discriminatorFact(`${prefix} state calls the injected service boundary.`, 'service-interaction', 'di', 'service', 'present', null, expectedSemanticEffectFilters(
      ['consumerRole', 'state-source'],
      ['targetRole', 'service-source'],
      ['operationKind', 'call'],
      ['isSelfInteraction', false],
    )),
  ];
}

function catalogTemplateStateHandoffEffects(
  prefix: string,
  options: CatalogAppExpectedEffectsOptions,
  domain: CatalogExpectedEffectDomain,
  featureProfile: CatalogStorefrontFieldFeatureProfile,
  includeReferencePresentation: boolean,
): readonly ExpectedSemanticEffect[] {
  return [
    ...(includeReferencePresentation
      ? [ExpectedSemanticEffect.signatureFact(`${prefix} root binds DI-owned state projections directly.`, 'service-interaction-binding', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
        ['bindingSourceName', 'state.selectionProgressPercent'],
        ['bindingSourceRootName', 'state'],
        ['bindingTargetProperty', 'style'],
        ['interactionTargetRole', 'state-source'],
        ['interactionTargetClassName', options.stateClassName],
        ['interactionMemberName', 'selectionProgressPercent'],
        ['interactionOperationKind', 'read'],
        ['interactionIsSelfInteraction', false],
      ))]
      : []),
    ...(featureProfile.hasPricePresentation
      ? [
        entityPriceLabelBindingEffect(`${prefix} card binds directly to entity presentation getters.`, domain),
        entityPriceLabelObservedDependencyEffect(`${prefix} card observed dependencies mark entity getter reads as accessors.`, domain),
        entityPriceLabelGetterObserverEffect(`${prefix} exposes plain ${domain.entityTitle} getter observation.`),
      ]
      : []),
    ...(featureProfile.hasStockSemantics
      ? [entityStockDisabledBindingEffect(`${prefix} card disabled binding reads entity stock directly.`, domain)]
      : []),
    ...(options.route == null
      ? []
      : [
        entityLookupLetBindingDataFlowEffect(
          `${prefix} detail route adapts the route parameter into a template-local ${domain.entityVariableName}.`,
          options.route.detailRouteElementName,
          options.route.routeParameterName,
          domain,
        ),
        ...(featureProfile.hasStockSemantics
          ? [entityStockDisabledBindingEffect(`${prefix} detail disabled binding reads entity stock directly.`, domain, options.route.detailRouteElementName)]
          : []),
      ]),
  ];
}

function catalogTasteEffects(
  prefix: string,
  routed: boolean,
  featureProfile: CatalogStorefrontFieldFeatureProfile,
  includeReferencePresentation: boolean,
  includeLocalObjectBinding: boolean,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports DI-owned state.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    ExpectedSemanticEffect.discriminatorTaste(`${prefix} reports a DI-owned service layer.`, 'state-ownership', 'di-owned-service-layer', 'service'),
    ...(routed
      ? [
        ExpectedSemanticEffect.signatureTaste(`${prefix} reports route-parameter-selected state.`, 'state-ownership', 'route-parameter-selected-state', 'route'),
        ...navigationOwnershipTasteEffects(prefix),
      ]
      : []),
    ...(includeLocalObjectBinding
      ? [ExpectedSemanticEffect.signatureTaste(`${prefix} reports object-shaped component inputs.`, 'component-interface', 'object-inputs', 'component')]
      : []),
    directStateDomainTemplateBindingTasteEffect(`${prefix} reports direct state/domain template binding taste.`),
    sourceBackedGetterObservationTasteEffect(`${prefix} reports plain getter observation taste.`),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports template-controller composition.`, 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    ...(includeReferencePresentation
      ? [
        componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`),
        classTokenStyleTasteEffect(`${prefix} reports class-token style binding taste.`),
        styleRuleStyleTasteEffect(`${prefix} reports style-rule binding taste.`),
        ...(featureProfile.hasCardStyleBindings
          ? [
            classToggleStyleTasteEffect(`${prefix} reports class-toggle style binding taste.`),
            stylePropertyStyleTasteEffect(`${prefix} reports style-property binding taste.`),
          ]
          : []),
      ]
      : []),
  ];
}

function entityObjectBindingDataFlowEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', domain.entityVariableName],
    ['sourceType', domain.entityClassName],
    ['targetKind', 'controller-view-model'],
    ['targetProperty', domain.entityVariableName],
    ['targetValueType', `${domain.entityClassName} | null`],
  ));
}

function entityTargetPropertyEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['targetProperty', domain.entityVariableName],
    ['targetValueType', `${domain.entityClassName} | null`],
  ));
}

function directCatalogCollectionObservedDependencyEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', `state.${domain.collectionPropertyName}.${domain.visibleCollectionGetterName}`],
    ['dependencyKind', 'template-expression-read'],
  ));
}

function directCatalogFilterObservedDependencyEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', `state.${domain.collectionPropertyName}.searchText`],
    ['sourceRootName', 'state'],
    ['dependencyKind', 'template-expression-read'],
  ));
}

function catalogCollectionGetterObserverEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain = catalogExpectedEffectDomain(null),
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-source', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['memberName', domain.visibleCollectionGetterName],
    ['observerKind', 'computed-observer'],
    ['triggerKind', 'accessor-descriptor'],
    ['dependencyMode', 'proxy-auto-track'],
  ));
}

function catalogCollectionKeyDependencyEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-observed-dependency', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['memberName', domain.visibleCollectionGetterName],
    ['dependencyKind', 'proxy-collection-read'],
    ['sourceName', `this.${domain.collectionStorePropertyName}`],
    ['methodName', 'values'],
  ));
}

function selectionCountGetterObserverEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-source', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['memberName', 'itemCount'],
    ['observerKind', 'computed-observer'],
    ['triggerKind', 'accessor-descriptor'],
    ['dependencyMode', 'proxy-auto-track'],
  ));
}

function entityLookupLetBindingDataFlowEffect(
  summary: string,
  definitionName: string,
  routeParameterName: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['bindingKind', 'let'],
    ['definitionName', definitionName],
    ['sourceName', `state.${domain.collectionPropertyName}.${domain.readEntityMethodName}(routeParams.${routeParameterName})`],
    ['sourceRootName', 'state'],
    ['sourceType', `${domain.entityClassName} | null`],
    ['targetKind', 'override-context'],
    ['targetProperty', domain.entityVariableName],
    ['valueChannelKind', 'scope-slot'],
    ['sourceToTargetAssignable', true],
  ));
}

function entityPriceLabelBindingEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', `${domain.entityVariableName}.priceLabel`],
    ['sourceRootName', domain.entityVariableName],
    ['sourceType', 'string'],
    ['targetProperty', 'textContent'],
  ));
}

function entityPriceLabelObservedDependencyEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', `${domain.entityVariableName}.priceLabel`],
    ['dependencyKind', 'template-expression-read'],
    ['observedMemberKind', 'accessor'],
  ));
}

function entityPriceLabelGetterObserverEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-source', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['memberName', 'priceLabel'],
    ['observerKind', 'computed-observer'],
    ['triggerKind', 'accessor-descriptor'],
    ['dependencyMode', 'proxy-auto-track'],
  ));
}

function entityStockDisabledBindingEffect(
  summary: string,
  domain: CatalogExpectedEffectDomain,
  definitionName?: string,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ...(definitionName === undefined ? [] : [['definitionName', definitionName] as const]),
    ['sourceName', `${domain.entityVariableName}.inStock`],
    ['sourceRootName', domain.entityVariableName],
    ['targetProperty', 'disabled'],
    ['targetKind', 'node'],
    ['sourceType', 'boolean'],
  ));
}
