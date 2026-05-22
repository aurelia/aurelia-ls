import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  pluralizeLastSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';
import {
  catalogStorefrontCustomBadgeFilterValues,
  catalogStorefrontCustomEntityModelSource,
  catalogStorefrontCustomServiceSource,
  catalogStorefrontFieldFeatureProfile,
  catalogStorefrontUsesReferencePresentation,
  type CatalogStorefrontFieldSchema,
} from './catalog-storefront-field-schema.js';
import { CATALOG_STOREFRONT_ROOT_STYLE_SOURCE } from './catalog-storefront-reference-presentation.js';
import { catalogStorefrontSourcePattern } from './catalog-storefront-source-pattern.js';

export interface CatalogStorefrontSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly catalogDomain: CatalogStorefrontDomainNames;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly modelPath: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly collectionStateClassName: string;
  readonly selectionStateClassName: string;
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly listComponentPath: string;
  readonly listTemplatePath: string;
  readonly listClassName: string;
  readonly listElementName: string;
  readonly cardComponentPath: string;
  readonly cardTemplatePath: string;
  readonly cardClassName: string;
  readonly cardElementName: string;
  readonly catalogFieldSchema: CatalogStorefrontFieldSchema;
  readonly detailRoutePathPrefix?: string | null;
}

export interface CatalogStorefrontDomainNames {
  readonly entityClassName: string;
  readonly entityVariableName: string;
  readonly entityKebabName: string;
  readonly entityTitle: string;
  readonly collectionPropertyName: string;
  readonly collectionKebabName: string;
  readonly collectionTitle: string;
  readonly collectionLabelLower: string;
  readonly collectionStorePropertyName: string;
  readonly visibleCollectionGetterName: string;
  readonly hasCollectionGetterName: string;
  readonly hasVisibleCollectionGetterName: string;
  readonly selectedEntityIdsPropertyName: string;
  readonly selectEntityMethodName: string;
  readonly entityBadgeTypeName: string;
  readonly entityAvailabilityTypeName: string;
  readonly loadFeaturedCollectionMethodName: string;
  readonly readEntityMethodName: string;
  readonly selectedEntityNamesGetterName: string;
}

export function defaultCatalogStorefrontDomainNames(): CatalogStorefrontDomainNames {
  return catalogStorefrontDomainNamesFromParameters('Item', 'items');
}

export function catalogStorefrontDomainNamesFromParameters(
  entityName: string,
  collectionName: string | null | undefined,
): CatalogStorefrontDomainNames {
  const entityWords = sourceNameWords(entityName);
  const collectionWords = collectionName == null || collectionName.trim().length === 0
    ? pluralizeLastSourceNameWord(entityWords)
    : sourceNameWords(collectionName);
  const entityClassName = pascalSourceName(entityWords);
  const entityVariableName = lowerCamelSourceName(entityWords);
  const collectionPropertyName = lowerCamelSourceName(collectionWords);
  const collectionPascalName = pascalSourceName(collectionWords);
  return {
    entityClassName,
    entityVariableName,
    entityKebabName: kebabSourceName(entityWords),
    entityTitle: titleSourceName(entityWords),
    collectionPropertyName,
    collectionKebabName: kebabSourceName(collectionWords),
    collectionTitle: titleSourceName(collectionWords),
    collectionLabelLower: lowerTitleSourceName(collectionWords),
    collectionStorePropertyName: collectionPropertyName === 'items' ? 'itemsById' : collectionPropertyName,
    visibleCollectionGetterName: collectionPropertyName === 'items' ? 'visibleItems' : 'items',
    hasCollectionGetterName: `has${collectionPascalName}`,
    hasVisibleCollectionGetterName: `hasVisible${collectionPascalName}`,
    selectedEntityIdsPropertyName: `selected${entityClassName}Ids`,
    selectEntityMethodName: `select${entityClassName}`,
    entityBadgeTypeName: `${entityClassName}Badge`,
    entityAvailabilityTypeName: `${entityClassName}Availability`,
    loadFeaturedCollectionMethodName: `loadFeatured${collectionPascalName}`,
    readEntityMethodName: `read${entityClassName}`,
    selectedEntityNamesGetterName: `selected${entityClassName}Names`,
  };
}

export function catalogStorefrontSourcePlan(model: CatalogStorefrontSourcePlanModel): AuthoringSourceEditPlan {
  const sourceFiles = catalogStorefrontSourceFiles(model);
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    catalogStorefrontIsCompact(model)
      ? sourceFiles
      : referenceInstantiationSourceFiles(sourceFiles),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
    catalogStorefrontSourcePattern(model),
  );
}

function catalogStorefrontSourceFiles(
  model: CatalogStorefrontSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  if (catalogStorefrontIsCompact(model)) {
    return [
      catalogStorefrontEntrypointFile(model),
      catalogStorefrontRootComponentFile(model),
      catalogStorefrontRootTemplateFile(model),
      catalogStorefrontEntityModelFile(model),
      catalogStorefrontServiceFile(model),
      catalogStorefrontStateFile(model),
      catalogStorefrontListComponentFile(model),
      catalogStorefrontListTemplateFile(model),
    ];
  }
  return [
    catalogStorefrontEntrypointFile(model),
    catalogStorefrontRootComponentFile(model),
    catalogStorefrontRootTemplateFile(model),
    catalogStorefrontRootStyleFile(model),
    catalogStorefrontEntityModelFile(model),
    catalogStorefrontServiceFile(model),
    catalogStorefrontStateFile(model),
    catalogStorefrontListComponentFile(model),
    catalogStorefrontListTemplateFile(model),
    catalogStorefrontCardComponentFile(model),
    catalogStorefrontCardTemplateFile(model),
  ];
}

function catalogStorefrontIsCompact(model: CatalogStorefrontSourcePlanModel): boolean {
  return !catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
}

function catalogStorefrontEntrypointFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return standardAureliaEntrypointFile(model);
}

function catalogStorefrontRootComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const compact = catalogStorefrontIsCompact(model);
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(compact ? ROOT_COMPONENT_COMPACT_SOURCE : ROOT_COMPONENT_SOURCE, {
      LOAD_FEATURED_COLLECTION_METHOD: model.catalogDomain.loadFeaturedCollectionMethodName,
      CATALOG_LIST_CLASS: model.listClassName,
      CATALOG_LIST_MODULE: moduleSpecifier(model.rootComponentPath, model.listComponentPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
      ...(compact
        ? {}
        : {
          COLLECTION_LABEL_LOWER: model.catalogDomain.collectionLabelLower,
          ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
        }),
    }),
  );
}

function catalogStorefrontRootTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const compact = catalogStorefrontIsCompact(model);
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(compact ? ROOT_TEMPLATE_COMPACT_SOURCE : ROOT_TEMPLATE_SOURCE, {
      COLLECTION_TITLE: model.catalogDomain.collectionTitle,
      CATALOG_LIST_ELEMENT_NAME: model.listElementName,
      ...(compact
        ? {}
        : {
          SELECTED_ENTITY_NAMES_GETTER: model.catalogDomain.selectedEntityNamesGetterName,
          COLLECTION_LABEL_LOWER: model.catalogDomain.collectionLabelLower,
          ENTITY_TITLE: model.catalogDomain.entityTitle,
        }),
    }),
  );
}

function catalogStorefrontRootStyleFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    fillSourceTemplate(CATALOG_STOREFRONT_ROOT_STYLE_SOURCE, {
      ENTITY_KEBAB: model.catalogDomain.entityKebabName,
    }),
  );
}

function catalogStorefrontEntityModelFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.modelPath,
    'domain-model',
    'typescript',
    'create-domain-model',
    catalogStorefrontCustomEntityModelSource(model.catalogDomain, model.catalogFieldSchema),
  );
}

function catalogStorefrontServiceFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.servicePath,
    'service',
    'typescript',
    'create-service',
    catalogStorefrontCustomServiceSource(
      model.serviceClassName,
      moduleSpecifier(model.servicePath, model.modelPath, false),
      model.catalogDomain,
      model.catalogFieldSchema,
    ),
  );
}

function catalogStorefrontStateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const compact = catalogStorefrontIsCompact(model);
  const includeCompactReadMethod = compact && model.detailRoutePathPrefix != null;
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(compact ? STATE_COMPACT_SOURCE : STATE_SOURCE, {
      ENTITY_MODEL_IMPORTS: catalogStorefrontEntityModelImports(model.catalogDomain, model.catalogFieldSchema),
      COLLECTION_PROPERTY: model.catalogDomain.collectionPropertyName,
      COLLECTION_STORE_PROPERTY: model.catalogDomain.collectionStorePropertyName,
      ENTITY_CLASS: model.catalogDomain.entityClassName,
      ENTITY_VARIABLE: model.catalogDomain.entityVariableName,
      HAS_COLLECTION_GETTER: model.catalogDomain.hasCollectionGetterName,
      HAS_VISIBLE_COLLECTION_GETTER: model.catalogDomain.hasVisibleCollectionGetterName,
      LOAD_FEATURED_COLLECTION_METHOD: model.catalogDomain.loadFeaturedCollectionMethodName,
      COLLECTION_STATE_CLASS: model.collectionStateClassName,
      ENTITY_MODEL_MODULE: moduleSpecifier(model.statePath, model.modelPath, false),
      SERVICE_CLASS: model.serviceClassName,
      SERVICE_MODULE: moduleSpecifier(model.statePath, model.servicePath, false),
      STATE_CLASS: model.stateClassName,
      VISIBLE_COLLECTION_GETTER: model.catalogDomain.visibleCollectionGetterName,
      ...(compact
        ? {
          READ_ENTITY_METHOD_SOURCE: includeCompactReadMethod
            ? catalogStorefrontCompactReadEntityMethod(model)
            : '',
        }
        : {
          SELECTION_STATE_CLASS: model.selectionStateClassName,
          SELECT_ENTITY_METHOD: model.catalogDomain.selectEntityMethodName,
          FILTER_STATE: catalogStorefrontFilterState(model),
          FILTER_CONDITIONS: catalogStorefrontFilterConditions(model),
          SELECT_ENTITY_BODY: catalogStorefrontSelectEntityBody(model),
          SELECTED_ENTITY_IDS_PROPERTY: model.catalogDomain.selectedEntityIdsPropertyName,
          SELECTED_ENTITY_NAMES_GETTER: model.catalogDomain.selectedEntityNamesGetterName,
          READ_ENTITY_METHOD: model.catalogDomain.readEntityMethodName,
        }),
    }),
  );
}

function catalogStorefrontCompactReadEntityMethod(model: CatalogStorefrontSourcePlanModel): string {
  return sourceText(`
  ${model.catalogDomain.readEntityMethodName}(entityId: string): ${model.catalogDomain.entityClassName} | null {
    return this.${model.catalogDomain.collectionStorePropertyName}.get(entityId) ?? null;
  }
`);
}

function catalogStorefrontBadgeFilterValues(
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  return catalogStorefrontCustomBadgeFilterValues(fieldSchema);
}

function catalogStorefrontEntityModelImports(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(fieldSchema);
  return [
    domain.entityClassName,
    ...(featureProfile.hasBadgeSemantics ? [domain.entityBadgeTypeName] : []),
  ].join(', ');
}

function catalogStorefrontFilterConditions(
  model: CatalogStorefrontSourcePlanModel,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const conditions = [
    featureProfile.hasStockSemantics
      ? `      && (!this.onlyInStock || ${model.catalogDomain.entityVariableName}.inStock)`
      : null,
    featureProfile.hasBadgeSemantics
      ? `      && (this.badgeFilter === 'all' || ${model.catalogDomain.entityVariableName}.badge === this.badgeFilter)`
      : null,
  ]
    .filter((condition): condition is string => condition != null)
    .join('\n');
  return conditions.length === 0 ? '' : `\n${conditions}`;
}

function catalogStorefrontFilterState(
  model: CatalogStorefrontSourcePlanModel,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const stateLines = [
    featureProfile.hasStockSemantics
      ? '  onlyInStock = false;'
      : null,
    featureProfile.hasBadgeSemantics
      ? `  readonly badgeFilters: readonly (${model.catalogDomain.entityBadgeTypeName} | 'all')[] = [${catalogStorefrontBadgeFilterValues(model.catalogFieldSchema)}];\n\n  badgeFilter: ${model.catalogDomain.entityBadgeTypeName} | 'all' = 'all';`
      : null,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  return stateLines.length === 0 ? '' : `${stateLines}\n`;
}

function catalogStorefrontSelectEntityBody(
  model: CatalogStorefrontSourcePlanModel,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const entity = model.catalogDomain.entityVariableName;
  return featureProfile.hasStockSemantics
    ? `    if (${entity}?.inStock === true) {
      this.selection.${model.catalogDomain.selectEntityMethodName}(entityId);
    }`
    : `    if (${entity} != null) {
      this.selection.${model.catalogDomain.selectEntityMethodName}(entityId);
    }`;
}

function catalogStorefrontFilterControls(
  model: CatalogStorefrontSourcePlanModel,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const controls = [
    featureProfile.hasStockSemantics
      ? `      <label>
        <input type="checkbox" checked.bind="state.${model.catalogDomain.collectionPropertyName}.onlyInStock">
        In stock only
      </label>`
      : null,
    featureProfile.hasBadgeSemantics
      ? `      <label>
        Badge
        <select value.bind="state.${model.catalogDomain.collectionPropertyName}.badgeFilter">
          <option repeat.for="badge of state.${model.catalogDomain.collectionPropertyName}.badgeFilters" model.bind="badge">\${badge}</option>
        </select>
      </label>`
      : null,
  ]
    .filter((control): control is string => control != null)
    .join('\n');
  return controls.length === 0 ? '' : `\n${controls}`;
}

function catalogStorefrontListComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const compact = catalogStorefrontIsCompact(model);
  return recipeSourceFile(
    model.listComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(compact ? CATALOG_LIST_COMPONENT_COMPACT_SOURCE : CATALOG_LIST_COMPONENT_SOURCE, {
      CATALOG_LIST_CLASS: model.listClassName,
      CATALOG_LIST_ELEMENT_NAME: model.listElementName,
      CATALOG_LIST_TEMPLATE_MODULE: moduleSpecifier(model.listComponentPath, model.listTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.listComponentPath, model.statePath, false),
      ...(compact
        ? {}
        : {
          CATALOG_CARD_CLASS: model.cardClassName,
          CATALOG_CARD_MODULE: moduleSpecifier(model.listComponentPath, model.cardComponentPath, false),
        }),
    }),
  );
}

function catalogStorefrontListTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const compact = catalogStorefrontIsCompact(model);
  const compactDetailRouteLink = compact && model.detailRoutePathPrefix != null
    ? `\n            <a load.bind="'${model.detailRoutePathPrefix}' + ${model.catalogDomain.entityVariableName}.id">View details</a>`
    : '';
  return recipeSourceFile(
    model.listTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(compact ? CATALOG_LIST_TEMPLATE_COMPACT_SOURCE : CATALOG_LIST_TEMPLATE_SOURCE, {
      COLLECTION_LABEL_LOWER: model.catalogDomain.collectionLabelLower,
      COLLECTION_PROPERTY: model.catalogDomain.collectionPropertyName,
      ENTITY_VARIABLE: model.catalogDomain.entityVariableName,
      HAS_COLLECTION_GETTER: model.catalogDomain.hasCollectionGetterName,
      HAS_VISIBLE_COLLECTION_GETTER: model.catalogDomain.hasVisibleCollectionGetterName,
      VISIBLE_COLLECTION_GETTER: model.catalogDomain.visibleCollectionGetterName,
      ...(compact
        ? { DETAIL_ROUTE_LINK: compactDetailRouteLink }
        : {
          ENTITY_KEBAB: model.catalogDomain.entityKebabName,
          FILTER_CONTROLS: catalogStorefrontFilterControls(model),
          CATALOG_CARD_ELEMENT_NAME: model.cardElementName,
        }),
    }),
  );
}

function catalogStorefrontCardComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.cardComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(CATALOG_CARD_COMPONENT_SOURCE, {
      ENTITY_CLASS: model.catalogDomain.entityClassName,
      ENTITY_VARIABLE: model.catalogDomain.entityVariableName,
      CATALOG_CARD_CLASS: model.cardClassName,
      CATALOG_CARD_ELEMENT_NAME: model.cardElementName,
      CATALOG_CARD_TEMPLATE_MODULE: moduleSpecifier(model.cardComponentPath, model.cardTemplatePath, true),
      ENTITY_MODEL_MODULE: moduleSpecifier(model.cardComponentPath, model.modelPath, false),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.cardComponentPath, model.statePath, false),
    }),
  );
}

function catalogStorefrontCardTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.cardTemplatePath,
    'template',
    'html',
    'create-external-template',
    catalogStorefrontCardTemplateSource(model),
  );
}

export function catalogStorefrontCardTemplateSource(
  model: Pick<CatalogStorefrontSourcePlanModel, 'catalogDomain' | 'catalogFieldSchema'> & {
    readonly detailRoutePathPrefix?: string | null;
  },
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const entity = model.catalogDomain.entityVariableName;
  const articleAttributes = featureProfile.hasCardStyleBindings
    ? `class="${model.catalogDomain.entityKebabName}-card" class.bind="${entity}.badge" highlighted.class="${entity}.isHighlighted" padding.style="${entity}.cardPadding" border-color.style="${entity}.cardAccentColor"`
    : `class="${model.catalogDomain.entityKebabName}-card"`;
  const priceLine = featureProfile.hasPricePresentation
    ? `    <p>\${${entity}.priceLabel}</p>\n`
    : '';
  const stockLine = featureProfile.hasStockSemantics
    ? `    <p>\${${entity}.stockLabel}</p>\n`
    : '';
  const availabilitySwitch = featureProfile.hasAvailabilitySwitch
    ? `    <template switch.bind="${entity}.availability">
      <p case="in-stock">Ready to ship.</p>
      <p case="limited">Limited stock.</p>
      <p default-case>Available by backorder.</p>
    </template>
`
    : '';
  const detailRouteLink = model.detailRoutePathPrefix == null
    ? ''
    : `    <a load.bind="'${model.detailRoutePathPrefix}' + ${entity}.id">View details</a>\n`;
  const disabledAttribute = featureProfile.hasStockSemantics
    ? ` disabled.bind="!${entity}.inStock"`
    : '';
  return sourceText(`<template if.bind="${entity}">
  <article ${articleAttributes}>
    <h3>\${${entity}.name}</h3>
    <p>\${${entity}.summary}</p>
${priceLine}${stockLine}${availabilitySwitch}${detailRouteLink}    <button type="button" click.trigger="state.${model.catalogDomain.selectEntityMethodName}(${entity}.id)"${disabledAttribute}>Select</button>
  </article>
</template>
<article else class="${model.catalogDomain.entityKebabName}-card">
  <p>Loading ${model.catalogDomain.entityTitle}...</p>
</article>
`);
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __CATALOG_LIST_CLASS__ } from '__CATALOG_LIST_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__CATALOG_LIST_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  readonly catalogStatus = Promise.resolve('Featured __COLLECTION_LABEL_LOWER__ refreshes daily.');

  binding(): void {
    void this.state.__LOAD_FEATURED_COLLECTION_METHOD__();
  }
}
`);

const ROOT_COMPONENT_COMPACT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __CATALOG_LIST_CLASS__ } from '__CATALOG_LIST_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__CATALOG_LIST_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  binding(): void {
    void this.state.__LOAD_FEATURED_COLLECTION_METHOD__();
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="catalog-shell \${state.selection.itemCount > 0 ? 'has-selection' : 'empty-selection'}">
  <header>
    <h1>__COLLECTION_TITLE__</h1>
    <p>Selected items: \${state.selection.itemCount}</p>
    <div class="selection-progress" aria-hidden="true">
      <span style="width: \${state.selectionProgressPercent}%"></span>
    </div>
    <section promise.bind="catalogStatus" aria-label="Catalog status">
      <p pending>Checking catalog status...</p>
      <p then="notice">\${notice}</p>
      <p catch="reason">\${reason}</p>
    </section>
  </header>

  <__CATALOG_LIST_ELEMENT_NAME__></__CATALOG_LIST_ELEMENT_NAME__>

  <aside if.bind="state.selection.itemCount > 0" aria-label="Selected items">
    <h2>Selected __COLLECTION_LABEL_LOWER__</h2>
    <ul>
      <li repeat.for="name of state.__SELECTED_ENTITY_NAMES_GETTER__">\${name}</li>
    </ul>
  </aside>
  <p else>Select a featured __ENTITY_TITLE__.</p>
</main>
`);

const ROOT_TEMPLATE_COMPACT_SOURCE = sourceText(`<main>
  <h1>__COLLECTION_TITLE__</h1>
  <__CATALOG_LIST_ELEMENT_NAME__></__CATALOG_LIST_ELEMENT_NAME__>
</main>
`);

const STATE_SOURCE = sourceText(`import { resolve } from 'aurelia';
import type { __ENTITY_MODEL_IMPORTS__ } from '__ENTITY_MODEL_MODULE__';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export class __COLLECTION_STATE_CLASS__ {
  private readonly __COLLECTION_STORE_PROPERTY__ = new Map<string, __ENTITY_CLASS__>();

  searchText = '';
__FILTER_STATE__  isLoading = false;

  get __VISIBLE_COLLECTION_GETTER__(): readonly __ENTITY_CLASS__[] {
    const query = this.searchText.trim().toLowerCase();
    return [...this.__COLLECTION_STORE_PROPERTY__.values()].filter((__ENTITY_VARIABLE__) =>
      (query.length === 0 || __ENTITY_VARIABLE__.name.toLowerCase().includes(query) || __ENTITY_VARIABLE__.summary.toLowerCase().includes(query))__FILTER_CONDITIONS__
    );
  }

  get __HAS_COLLECTION_GETTER__(): boolean {
    return this.__COLLECTION_STORE_PROPERTY__.size > 0;
  }

  get __HAS_VISIBLE_COLLECTION_GETTER__(): boolean {
    return this.__VISIBLE_COLLECTION_GETTER__.length > 0;
  }

  __READ_ENTITY_METHOD__(entityId: string): __ENTITY_CLASS__ | null {
    return this.__COLLECTION_STORE_PROPERTY__.get(entityId) ?? null;
  }

  replace(collection: readonly __ENTITY_CLASS__[]): void {
    this.__COLLECTION_STORE_PROPERTY__.clear();
    for (const __ENTITY_VARIABLE__ of collection) {
      this.__COLLECTION_STORE_PROPERTY__.set(__ENTITY_VARIABLE__.id, __ENTITY_VARIABLE__);
    }
  }
}

export class __SELECTION_STATE_CLASS__ {
  readonly __SELECTED_ENTITY_IDS_PROPERTY__: string[] = [];

  get itemCount(): number {
    return this.__SELECTED_ENTITY_IDS_PROPERTY__.length;
  }

  __SELECT_ENTITY_METHOD__(entityId: string): void {
    if (!this.__SELECTED_ENTITY_IDS_PROPERTY__.includes(entityId)) {
      this.__SELECTED_ENTITY_IDS_PROPERTY__.push(entityId);
    }
  }
}

export class __STATE_CLASS__ {
  private readonly catalogService = resolve(__SERVICE_CLASS__);

  readonly __COLLECTION_PROPERTY__ = new __COLLECTION_STATE_CLASS__();
  readonly selection = new __SELECTION_STATE_CLASS__();

  get selectionProgressPercent(): number {
    return Math.min(100, Math.round((this.selection.itemCount / 3) * 100));
  }

  get __SELECTED_ENTITY_NAMES_GETTER__(): readonly string[] {
    return this.selection.__SELECTED_ENTITY_IDS_PROPERTY__.map((entityId) =>
      this.__COLLECTION_PROPERTY__.__READ_ENTITY_METHOD__(entityId)?.name ?? entityId
    );
  }

  async __LOAD_FEATURED_COLLECTION_METHOD__(): Promise<void> {
    if (this.__COLLECTION_PROPERTY__.__HAS_COLLECTION_GETTER__ || this.__COLLECTION_PROPERTY__.isLoading) {
      return;
    }

    this.__COLLECTION_PROPERTY__.isLoading = true;
    try {
      this.__COLLECTION_PROPERTY__.replace(await this.catalogService.__LOAD_FEATURED_COLLECTION_METHOD__());
    } finally {
      this.__COLLECTION_PROPERTY__.isLoading = false;
    }
  }

  __SELECT_ENTITY_METHOD__(entityId: string): void {
    const __ENTITY_VARIABLE__ = this.__COLLECTION_PROPERTY__.__READ_ENTITY_METHOD__(entityId);
__SELECT_ENTITY_BODY__
  }
}
`);

const STATE_COMPACT_SOURCE = sourceText(`import { resolve } from 'aurelia';
import type { __ENTITY_MODEL_IMPORTS__ } from '__ENTITY_MODEL_MODULE__';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export class __COLLECTION_STATE_CLASS__ {
  private readonly __COLLECTION_STORE_PROPERTY__ = new Map<string, __ENTITY_CLASS__>();

  searchText = '';
  isLoading = false;

  get __VISIBLE_COLLECTION_GETTER__(): readonly __ENTITY_CLASS__[] {
    const query = this.searchText.trim().toLowerCase();
    return [...this.__COLLECTION_STORE_PROPERTY__.values()].filter((__ENTITY_VARIABLE__) =>
      query.length === 0 || __ENTITY_VARIABLE__.name.toLowerCase().includes(query) || __ENTITY_VARIABLE__.summary.toLowerCase().includes(query)
    );
  }

  get __HAS_COLLECTION_GETTER__(): boolean {
    return this.__COLLECTION_STORE_PROPERTY__.size > 0;
  }

  get __HAS_VISIBLE_COLLECTION_GETTER__(): boolean {
    return this.__VISIBLE_COLLECTION_GETTER__.length > 0;
  }
__READ_ENTITY_METHOD_SOURCE__
  replace(collection: readonly __ENTITY_CLASS__[]): void {
    this.__COLLECTION_STORE_PROPERTY__.clear();
    for (const __ENTITY_VARIABLE__ of collection) {
      this.__COLLECTION_STORE_PROPERTY__.set(__ENTITY_VARIABLE__.id, __ENTITY_VARIABLE__);
    }
  }
}

export class __STATE_CLASS__ {
  private readonly catalogService = resolve(__SERVICE_CLASS__);

  readonly __COLLECTION_PROPERTY__ = new __COLLECTION_STATE_CLASS__();

  async __LOAD_FEATURED_COLLECTION_METHOD__(): Promise<void> {
    if (this.__COLLECTION_PROPERTY__.__HAS_COLLECTION_GETTER__ || this.__COLLECTION_PROPERTY__.isLoading) {
      return;
    }

    this.__COLLECTION_PROPERTY__.isLoading = true;
    try {
      this.__COLLECTION_PROPERTY__.replace(await this.catalogService.__LOAD_FEATURED_COLLECTION_METHOD__());
    } finally {
      this.__COLLECTION_PROPERTY__.isLoading = false;
    }
  }
}
`);

const CATALOG_LIST_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __CATALOG_CARD_CLASS__ } from '__CATALOG_CARD_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__CATALOG_LIST_TEMPLATE_MODULE__';

@customElement({
  name: '__CATALOG_LIST_ELEMENT_NAME__',
  template,
  dependencies: [__CATALOG_CARD_CLASS__],
})
export class __CATALOG_LIST_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
}
`);

const CATALOG_LIST_COMPONENT_COMPACT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__CATALOG_LIST_TEMPLATE_MODULE__';

@customElement({
  name: '__CATALOG_LIST_ELEMENT_NAME__',
  template,
})
export class __CATALOG_LIST_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
}
`);

const CATALOG_LIST_TEMPLATE_SOURCE = sourceText(`<section>
  <h2>Featured __COLLECTION_LABEL_LOWER__</h2>
  <p if.bind="state.__COLLECTION_PROPERTY__.isLoading">Loading __COLLECTION_LABEL_LOWER__...</p>
  <div else>
    <form class="catalog-filters" submit.trigger="$event.preventDefault()">
      <label>
        Search
        <input type="search" value.bind="state.__COLLECTION_PROPERTY__.searchText & debounce:150">
      </label>__FILTER_CONTROLS__
    </form>
    <p if.bind="!state.__COLLECTION_PROPERTY__.__HAS_COLLECTION_GETTER__">No featured __COLLECTION_LABEL_LOWER__ are available yet.</p>
    <template else>
      <p if.bind="!state.__COLLECTION_PROPERTY__.__HAS_VISIBLE_COLLECTION_GETTER__">No __COLLECTION_LABEL_LOWER__ match the current filters.</p>
      <ul if.bind="state.__COLLECTION_PROPERTY__.__HAS_VISIBLE_COLLECTION_GETTER__" class="__ENTITY_KEBAB__-grid">
        <li repeat.for="__ENTITY_VARIABLE__ of state.__COLLECTION_PROPERTY__.__VISIBLE_COLLECTION_GETTER__">
          <__CATALOG_CARD_ELEMENT_NAME__ __ENTITY_VARIABLE__.bind="__ENTITY_VARIABLE__"></__CATALOG_CARD_ELEMENT_NAME__>
        </li>
      </ul>
    </template>
  </div>
</section>
`);

const CATALOG_LIST_TEMPLATE_COMPACT_SOURCE = sourceText(`<section>
  <h2>Featured __COLLECTION_LABEL_LOWER__</h2>
  <form submit.trigger="$event.preventDefault()">
    <label>
      Search
      <input type="search" value.bind="state.__COLLECTION_PROPERTY__.searchText & debounce:150">
    </label>
  </form>
  <p if.bind="state.__COLLECTION_PROPERTY__.isLoading">Loading __COLLECTION_LABEL_LOWER__...</p>
  <template else>
    <p if.bind="!state.__COLLECTION_PROPERTY__.__HAS_COLLECTION_GETTER__">No featured __COLLECTION_LABEL_LOWER__ are available yet.</p>
    <template else>
      <p if.bind="!state.__COLLECTION_PROPERTY__.__HAS_VISIBLE_COLLECTION_GETTER__">No __COLLECTION_LABEL_LOWER__ match the current filters.</p>
      <ul if.bind="state.__COLLECTION_PROPERTY__.__HAS_VISIBLE_COLLECTION_GETTER__">
        <li repeat.for="__ENTITY_VARIABLE__ of state.__COLLECTION_PROPERTY__.__VISIBLE_COLLECTION_GETTER__">
          <article>
            <h3>\${__ENTITY_VARIABLE__.name}</h3>
            <p>\${__ENTITY_VARIABLE__.summary}</p>
__DETAIL_ROUTE_LINK__
          </article>
        </li>
      </ul>
    </template>
  </template>
</section>
`);

const CATALOG_CARD_COMPONENT_SOURCE = sourceText(`import { bindable, customElement, resolve } from 'aurelia';
import type { __ENTITY_CLASS__ } from '__ENTITY_MODEL_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__CATALOG_CARD_TEMPLATE_MODULE__';

@customElement({
  name: '__CATALOG_CARD_ELEMENT_NAME__',
  template,
})
export class __CATALOG_CARD_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  @bindable __ENTITY_VARIABLE__: __ENTITY_CLASS__ | null = null;
}
`);
