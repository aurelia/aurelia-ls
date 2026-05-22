import {
  type AuthoringSourcePatternAdaptationGroup,
  type AuthoringSourcePatternModule,
  type AuthoringSourcePatternParameter,
  recipeSourcePattern,
  referenceInstantiationSourcePattern,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import {
  routedSourcePatternDetailRouteParameter,
  routedSourcePatternIdentityGroup,
  routedSourcePatternListRoutePath,
} from './route-source-pattern.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import type { CatalogStorefrontSourcePlanModel } from './catalog-storefront-source-plan.js';
import type { RoutedCatalogStorefrontSourcePlanModel } from './routed-catalog-storefront-source-plan.js';
import {
  catalogStorefrontFieldFeatureProfile,
  catalogStorefrontFieldSchemaHasOptionDomains,
  catalogStorefrontFieldSchemaOptionParameterValue,
  isCompactCatalogStorefrontFeatureProfile,
} from './catalog-storefront-field-schema.js';

type CatalogPatternModel = Pick<CatalogStorefrontSourcePlanModel, 'catalogDomain' | 'catalogFieldSchema'>;
type CatalogPatternVariant = 'catalog' | 'routed-catalog';

export function catalogStorefrontSourcePattern(model: CatalogStorefrontSourcePlanModel) {
  if (isCompactCatalogStorefrontFeatureProfile(catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema))) {
    return recipeSourcePattern(
      'catalog-storefront.compact-starter',
      'Catalog/list starter',
      'A low-boilerplate DI-owned catalog state, service boundary, search filter, getter-observed collection projection, and inline list-card template over caller-applied item fields.',
      'caller-applied',
      'none',
      [
        'Use this source as a caller-shaped starter when the requested feature is a searchable catalog/list over one item collection.',
        'Replace starter seed records with real service data when the app already has a backend or repository boundary.',
        'Add selection actions, separate card components, CSS, price/availability presentation, routing, or checkout behavior only when the feature goal asks for them.',
      ],
      catalogDomainParameters(model, 'catalog'),
      compactCatalogModules(),
      [compactCatalogDomainModelGroup(model)],
      'recommendable-recipe',
      'starter-sample-data',
      'production-terse',
    );
  }
  return referenceInstantiationSourcePattern(
    'catalog-storefront.reference-instantiation',
    'Catalog/list-card state pattern',
    `A complete reference instantiation of composed DI-owned collection/selection state, service-backed loading, local object component handoff, control-flow controllers, class/style bindings, domain getter observation, and ${catalogFieldBehaviorSummary(model)}.`,
    [
      `Treat ${model.catalogDomain.entityClassName}, ${model.stateClassName}, ${model.serviceClassName}, ${model.cardElementName}/list names, sample ${model.catalogDomain.collectionLabelLower}, and sample labels as replaceable defaults for a caller-specific collection domain.`,
      'Keep the composed state, local object handoff, and direct domain-template binding shape when adapting; choose scalar IDs or object handoff based on the caller boundary rather than copying this sample blindly.',
      'Treat the CSS and sample catalog copy as fixture presentation. A public MCP client should adapt or replace it with the host design system unless the caller explicitly wants the reference look.',
    ],
    'reference-presentation',
    [
      ...catalogDomainParameters(model, 'catalog'),
      catalogSelectionModel(model),
      catalogSampleData(model, 'catalog'),
      catalogPresentation(model, 'catalog'),
    ],
    catalogModules(model),
    [catalogDomainModelGroup(model, 'catalog')],
  );
}

function compactCatalogModules(): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    SourcePatternModules.DiStateBoundary,
    SourcePatternModules.StateComposition,
    SourcePatternModules.StateOwnedServiceBoundary,
    SourcePatternModules.ServiceBackedLoading,
    SourcePatternModules.DomainClassModel,
    SourcePatternModules.SearchFilterControls,
    SourcePatternModules.ListRendering,
    SourcePatternModules.TemplateControllerFlow,
  ];
}

export function routedCatalogStorefrontSourcePattern(model: RoutedCatalogStorefrontSourcePlanModel) {
  if (isCompactCatalogStorefrontFeatureProfile(catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema))) {
    return recipeSourcePattern(
      'routed-catalog-storefront.compact-starter',
      'Routed catalog/list-detail starter',
      `A low-boilerplate routed catalog/list starter with RouterConfiguration, list/detail routes, route parameter selection, DI-owned catalog state, data-driven navigation links, and ${catalogFieldBehaviorSummary(model)}.`,
      'caller-applied',
      'none',
      [
        'Use this source as a caller-shaped starter when the requested feature is a routed searchable catalog/list-detail over one item collection.',
        'Keep route-owned identity, DI-owned catalog state, service-backed loading, and direct item-card markup together; add richer merchandising controls only when the feature goal asks for them.',
        'Replace starter seed records with real service data when the app already has a backend or repository boundary.',
      ],
      [
        routedSourcePatternDetailRouteParameter(model),
        routedSourcePatternListRoutePath(model),
        listRouteTitle(model),
        ...catalogDomainParameters(model, 'routed-catalog'),
      ],
      routedCompactCatalogModules(),
      [
        routedSourcePatternIdentityGroup(),
        compactCatalogDomainModelGroup(model),
      ],
      'recommendable-recipe',
      'starter-sample-data',
      'production-terse',
    );
  }
  return referenceInstantiationSourcePattern(
    'routed-catalog-storefront.reference-instantiation',
    'Routed catalog/list-detail state pattern',
    `A complete reference instantiation of the catalog/list-card state pattern plus RouterConfiguration, list/detail routes, au-viewport layout, route parameter selection, data-driven navigation links, and ${catalogFieldBehaviorSummary(model)}.`,
    [
      `Treat ${model.catalogDomain.entityClassName} domain names, route IDs, detail parameter names, sample ${model.catalogDomain.collectionLabelLower}, and catalog copy as replaceable defaults for the caller list/detail domain.`,
      'Keep route-owned identity and route-aware state selection when navigation owns the selected item; choose scalar IDs or object handoff at component boundaries based on the caller boundary.',
      'Treat CSS and sample catalog content as fixture presentation rather than recipe ontology.',
    ],
    'reference-presentation',
    [
      routedSourcePatternDetailRouteParameter(model),
      routedSourcePatternListRoutePath(model),
      listRouteTitle(model),
      ...catalogDomainParameters(model, 'routed-catalog'),
      catalogSampleData(model, 'routed-catalog'),
      catalogPresentation(model, 'routed-catalog'),
    ],
    routedCatalogModules(model),
    [
      routedSourcePatternIdentityGroup(),
      catalogDomainModelGroup(model, 'routed-catalog'),
    ],
  );
}

function routedCompactCatalogModules(): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    SourcePatternModules.RouterShell,
    SourcePatternModules.RouteContextSelection,
    SourcePatternModules.RouteParameterSelection,
    SourcePatternModules.RouteLinkNavigation,
    SourcePatternModules.DiStateBoundary,
    SourcePatternModules.StateComposition,
    SourcePatternModules.StateOwnedServiceBoundary,
    SourcePatternModules.ServiceBackedLoading,
    SourcePatternModules.DomainClassModel,
    SourcePatternModules.SearchFilterControls,
    SourcePatternModules.ListRendering,
    SourcePatternModules.TemplateControllerFlow,
  ];
}

function catalogBehaviorModules(
  model: CatalogPatternModel,
): readonly AuthoringSourcePatternModule[] {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  return [
    SourcePatternModules.DiStateBoundary,
    SourcePatternModules.StateComposition,
    SourcePatternModules.StateOwnedServiceBoundary,
    SourcePatternModules.ServiceBackedLoading,
    SourcePatternModules.DomainClassModel,
    SourcePatternModules.SearchFilterControls,
    ...(featureProfile.hasStockSemantics ? [SourcePatternModules.CheckedBooleanChannel] : []),
    ...(featureProfile.hasBadgeSemantics ? [SourcePatternModules.SelectOptionModelChannel] : []),
    SourcePatternModules.ListRendering,
    SourcePatternModules.LocalObjectComponentBoundary,
    SourcePatternModules.SelectionSetControls,
    SourcePatternModules.TemplateControllerFlow,
    SourcePatternModules.ClassStyleChannels,
  ];
}

function catalogModules(
  model: CatalogPatternModel,
): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    ...catalogBehaviorModules(model),
  ];
}

function routedCatalogModules(
  model: CatalogPatternModel,
): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    SourcePatternModules.RouterShell,
    SourcePatternModules.RouteContextSelection,
    SourcePatternModules.RouteParameterSelection,
    SourcePatternModules.RouteLinkNavigation,
    ...catalogBehaviorModules(model),
  ];
}

function catalogFieldBehaviorSummary(model: CatalogPatternModel): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const features = [
    'search filtering',
    ...(featureProfile.hasStockSemantics ? ['stock-aware checked filtering and selection'] : []),
    ...(featureProfile.hasBadgeSemantics ? ['badge/category select filtering'] : []),
    ...(featureProfile.hasPricePresentation ? ['price presentation'] : []),
    ...(featureProfile.hasAvailabilitySwitch ? ['availability switch flow'] : []),
  ];
  return features.join(', ');
}

function catalogDomainParameters(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): readonly AuthoringSourcePatternParameter[] {
  return [
    catalogEntity(model, variant),
    catalogCollection(model, variant),
    catalogFields(model, variant),
    ...catalogOptions(model, variant),
  ];
}

function catalogEntity(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'catalog-entity',
    'domain-entity',
    variant === 'routed-catalog' ? 'Catalog/detail entity' : 'Catalog item entity',
    model.catalogDomain.entityTitle,
    variant === 'routed-catalog'
      ? `Replace the item/detail class and core local object/route detail identity; ${catalogFieldBehaviorSummary(model)} still moves through the catalog-domain-model adaptation group.`
      : `Replace the item class and core local object handoff identity; ${catalogFieldBehaviorSummary(model)} still moves through the catalog-domain-model adaptation group.`,
    'source-text-input',
    'domain-title',
  );
}

function catalogCollection(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'catalog-collection',
    'domain-collection',
    'Catalog collection state',
    model.catalogDomain.collectionPropertyName,
    variant === 'routed-catalog'
      ? 'Adapt collection/state/service names while preserving composed DI state, service-backed loading, and route-aware selection.'
      : 'Adapt collection/state/service names while preserving composed DI state, service-backed loading, and direct domain-template reads.',
    'source-text-input',
    'source-member-name',
  );
}

function catalogFields(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'catalog-fields',
    'field-schema',
    variant === 'routed-catalog' ? 'Catalog/detail fields' : 'Catalog item fields',
    model.catalogFieldSchema.sourceParameterValue,
    variant === 'routed-catalog'
      ? 'Replace item constructor fields, sample records, and generated detail field rows while preserving the route/list/card state contract.'
      : 'Replace the item constructor fields and sample records while preserving the recipe-owned card/list state contract.',
    'source-text-input',
    'field-schema-list',
  );
}

function catalogOptions(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): readonly AuthoringSourcePatternParameter[] {
  if (!catalogStorefrontFieldSchemaHasOptionDomains(model.catalogFieldSchema)) {
    return [];
  }
  return [
    sourcePatternParameter(
      'catalog-options',
      'domain-collection',
      variant === 'routed-catalog' ? 'Catalog/detail option domains' : 'Catalog option domains',
      catalogStorefrontFieldSchemaOptionParameterValue(model.catalogFieldSchema) ?? 'standard',
      variant === 'routed-catalog'
        ? 'Replace select option domains used by generated item fields, sample records, list cards, and detail rows.'
        : 'Replace select option domains used by generated item fields, sample records, and list cards.',
      'source-text-input',
      'option-schema-list',
    ),
  ];
}

function catalogSelectionModel(model: CatalogPatternModel): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'selection-model',
    'domain-collection',
    'Selection/action state',
    `selection ${model.catalogDomain.selectedEntityIdsPropertyName}`,
    'Replace the selection/action behavior with the caller action model while preserving state-owned mutation methods.',
    'advisory-only',
    'domain-collection-summary',
  );
}

function catalogSampleData(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'catalog-sample-data',
    'sample-data',
    'Reference catalog records',
    `featured ${model.catalogDomain.collectionLabelLower}`,
    variant === 'routed-catalog'
      ? `Replace sample ${model.catalogDomain.collectionLabelLower}, route copy, and status text before emitting caller-specific code.`
      : `Replace sample ${model.catalogDomain.collectionLabelLower}, reference copy, and status text before emitting caller-specific code.`,
    'advisory-only',
    'sample-data-summary',
  );
}

function catalogPresentation(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternParameter {
  const presentation = variant === 'routed-catalog'
    ? `catalog-shell/${model.catalogDomain.entityKebabName}-grid/${model.catalogDomain.entityKebabName}-card/${model.catalogDomain.entityKebabName}-detail CSS`
    : `catalog-shell/${model.catalogDomain.entityKebabName}-grid/${model.catalogDomain.entityKebabName}-card CSS`;
  return sourcePatternParameter(
    'catalog-presentation',
    'presentation',
    variant === 'routed-catalog' ? 'Reference routed catalog presentation' : 'Reference catalog presentation',
    presentation,
    'Treat generated CSS and copy as fixture presentation unless the caller wants the reference look.',
    'advisory-only',
    'presentation-summary',
  );
}

function listRouteTitle(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'list-route-title',
    'feature-copy',
    'List route title',
    model.listRouteTitle,
    'Rename the list route title and navigation label without changing the catalog state architecture.',
    'source-text-input',
    'route-title',
  );
}

function catalogDomainModelGroup(
  model: CatalogPatternModel,
  variant: CatalogPatternVariant,
): AuthoringSourcePatternAdaptationGroup {
  const optionKeys = catalogStorefrontFieldSchemaHasOptionDomains(model.catalogFieldSchema)
    ? ['catalog-options']
    : [];
  const parameterKeys = variant === 'routed-catalog'
    ? ['catalog-entity', 'catalog-collection', 'catalog-fields', ...optionKeys, 'catalog-sample-data', 'catalog-presentation']
    : ['catalog-entity', 'catalog-collection', 'catalog-fields', ...optionKeys, 'selection-model', 'catalog-sample-data', 'catalog-presentation'];
  return sourcePatternAdaptationGroup(
    'catalog-domain-model',
    'Catalog domain model',
    variant === 'routed-catalog'
      ? 'Catalog item entity, collection state, field schema, sample records, detail copy, and reference presentation move together; a catalog-entity value alone is not enough for caller-specific source generation.'
      : 'Catalog item entity, collection state, field schema, selection/action model, sample records, and reference presentation move together; a catalog-entity value alone is not enough for caller-specific source generation.',
    parameterKeys,
  );
}

function compactCatalogDomainModelGroup(model: CatalogPatternModel): AuthoringSourcePatternAdaptationGroup {
  const optionKeys = catalogStorefrontFieldSchemaHasOptionDomains(model.catalogFieldSchema)
    ? ['catalog-options']
    : [];
  return sourcePatternAdaptationGroup(
    'catalog-domain-model',
    'Catalog domain model',
    'Catalog item entity, collection state, field schema, and starter seed records move together; compact source already applies caller domain slots.',
    ['catalog-entity', 'catalog-collection', 'catalog-fields', ...optionKeys],
  );
}
