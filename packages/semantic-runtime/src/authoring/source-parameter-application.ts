import type { CatalogStorefrontRecipeRequest } from './catalog-storefront-recipe.js';
import type { MultiStepStateBackedFormRecipeRequest } from './multi-step-state-backed-form-recipe.js';
import type { RoutedAppShellRecipeRequest } from './routed-app-shell-recipe.js';
import type { RoutedCatalogStorefrontRecipeRequest } from './routed-catalog-storefront-recipe.js';
import type { RoutedSearchableDataTableRecipeRequest } from './routed-searchable-data-table-recipe.js';
import type { RoutedStateBackedFormRecipeRequest } from './routed-state-backed-form-recipe.js';
import type { SearchableDataTableRecipeRequest } from './searchable-data-table-recipe.js';
import type { ServiceBackedFormRecipeRequest } from './service-backed-form-recipe.js';
import type { StateBackedFormRecipeRequest } from './state-backed-form-recipe.js';
import type { StateStoreListRecipeRequest } from './state-store-list-recipe.js';
import type {
  AuthoringSourceEditPlan,
  AuthoringSourcePatternParameterApplicationPolicy,
  AuthoringSourcePatternParameterApplicationState,
  AuthoringSourcePatternParameterValue,
  AuthoringSourcePatternParameterValueShape,
} from './source-plan.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  sourceNameWords,
  titleSourceName,
  upperSnakeSourceName,
} from './source-name.js';
import { sourceOptionSchemaLiteralSearchValues } from './source-option-schema.js';

interface AuthoringRecipeRequestBase {
  readonly rootDir: string;
  readonly appName: string;
}

interface AuthoringSourceParameterMapping<TProperty extends string> {
  readonly sourceParameterKey: string;
  readonly recipeRequestProperty: TProperty;
}

export interface AuthoringSourceParameterApplication {
  readonly key: string;
  readonly requestedValue: string;
  readonly defaultValue: string | null;
  readonly applicationPolicy: AuthoringSourcePatternParameterApplicationPolicy | null;
  readonly valueShape: AuthoringSourcePatternParameterValueShape | null;
  readonly applicationState: AuthoringSourcePatternParameterApplicationState;
  readonly summary: string;
}

const routedCatalogSourceParameterMappings = [
  { sourceParameterKey: 'list-route-path', recipeRequestProperty: 'listRoutePath' },
  { sourceParameterKey: 'list-route-title', recipeRequestProperty: 'listRouteTitle' },
  { sourceParameterKey: 'detail-route-parameter', recipeRequestProperty: 'detailRouteParameterName' },
  { sourceParameterKey: 'catalog-entity', recipeRequestProperty: 'catalogEntityName' },
  { sourceParameterKey: 'catalog-collection', recipeRequestProperty: 'catalogCollectionName' },
  { sourceParameterKey: 'catalog-fields', recipeRequestProperty: 'catalogFields' },
  { sourceParameterKey: 'catalog-options', recipeRequestProperty: 'catalogOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof RoutedCatalogStorefrontRecipeRequest & string>[];

const catalogSourceParameterMappings = [
  { sourceParameterKey: 'catalog-entity', recipeRequestProperty: 'catalogEntityName' },
  { sourceParameterKey: 'catalog-collection', recipeRequestProperty: 'catalogCollectionName' },
  { sourceParameterKey: 'catalog-fields', recipeRequestProperty: 'catalogFields' },
  { sourceParameterKey: 'catalog-options', recipeRequestProperty: 'catalogOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof CatalogStorefrontRecipeRequest & string>[];

const routedAppShellSourceParameterMappings = [
  { sourceParameterKey: 'section-routes', recipeRequestProperty: 'sectionRoutes' },
  { sourceParameterKey: 'detail-route-parameter', recipeRequestProperty: 'detailRouteParameterName' },
  { sourceParameterKey: 'home-route-path', recipeRequestProperty: 'homeRoutePath' },
  { sourceParameterKey: 'home-route-title', recipeRequestProperty: 'homeRouteTitle' },
  { sourceParameterKey: 'detail-route-title', recipeRequestProperty: 'detailRouteTitle' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof RoutedAppShellRecipeRequest & string>[];

const routedFormSourceParameterMappings = [
  { sourceParameterKey: 'request-route-parameter', recipeRequestProperty: 'routeParameterName' },
  { sourceParameterKey: 'request-route-title', recipeRequestProperty: 'routeTitle' },
  { sourceParameterKey: 'request-entity', recipeRequestProperty: 'requestEntityName' },
  { sourceParameterKey: 'request-selection-id', recipeRequestProperty: 'requestSelectionIdName' },
  { sourceParameterKey: 'request-fields', recipeRequestProperty: 'requestFields' },
  { sourceParameterKey: 'request-options', recipeRequestProperty: 'requestOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof RoutedStateBackedFormRecipeRequest & string>[];

const formSourceParameterMappings = [
  { sourceParameterKey: 'request-entity', recipeRequestProperty: 'requestEntityName' },
  { sourceParameterKey: 'request-selection-id', recipeRequestProperty: 'requestSelectionIdName' },
  { sourceParameterKey: 'request-fields', recipeRequestProperty: 'requestFields' },
  { sourceParameterKey: 'request-options', recipeRequestProperty: 'requestOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof StateBackedFormRecipeRequest & string>[];

const serviceBackedFormSourceParameterMappings = [
  { sourceParameterKey: 'request-entity', recipeRequestProperty: 'requestEntityName' },
  { sourceParameterKey: 'request-selection-id', recipeRequestProperty: 'requestSelectionIdName' },
  { sourceParameterKey: 'request-fields', recipeRequestProperty: 'requestFields' },
  { sourceParameterKey: 'request-options', recipeRequestProperty: 'requestOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof ServiceBackedFormRecipeRequest & string>[];

const multiStepFormSourceParameterMappings = [
  { sourceParameterKey: 'wizard-entity', recipeRequestProperty: 'wizardEntityName' },
  { sourceParameterKey: 'wizard-steps', recipeRequestProperty: 'wizardSteps' },
  { sourceParameterKey: 'wizard-section-fields', recipeRequestProperty: 'wizardSectionFields' },
  { sourceParameterKey: 'wizard-options', recipeRequestProperty: 'wizardOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof MultiStepStateBackedFormRecipeRequest & string>[];

const routedTableSourceParameterMappings = [
  { sourceParameterKey: 'list-route-path', recipeRequestProperty: 'listRoutePath' },
  { sourceParameterKey: 'list-route-title', recipeRequestProperty: 'listRouteTitle' },
  { sourceParameterKey: 'detail-route-parameter', recipeRequestProperty: 'detailRouteParameterName' },
  { sourceParameterKey: 'table-entity', recipeRequestProperty: 'tableEntityName' },
  { sourceParameterKey: 'table-collection', recipeRequestProperty: 'tableCollectionName' },
  { sourceParameterKey: 'table-filter-fields', recipeRequestProperty: 'tableFields' },
  { sourceParameterKey: 'table-options', recipeRequestProperty: 'tableOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof RoutedSearchableDataTableRecipeRequest & string>[];

const tableSourceParameterMappings = [
  { sourceParameterKey: 'table-entity', recipeRequestProperty: 'tableEntityName' },
  { sourceParameterKey: 'table-collection', recipeRequestProperty: 'tableCollectionName' },
  { sourceParameterKey: 'table-filter-fields', recipeRequestProperty: 'tableFields' },
  { sourceParameterKey: 'table-options', recipeRequestProperty: 'tableOptions' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof SearchableDataTableRecipeRequest & string>[];

const stateStoreListSourceParameterMappings = [
  { sourceParameterKey: 'store-item', recipeRequestProperty: 'storeItemName' },
  { sourceParameterKey: 'store-collection', recipeRequestProperty: 'storeCollectionName' },
] as const satisfies readonly AuthoringSourceParameterMapping<keyof StateStoreListRecipeRequest & string>[];

export function applyRoutedCatalogSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): RoutedCatalogStorefrontRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, routedCatalogSourceParameterMappings);
}

export function applyCatalogSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): CatalogStorefrontRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, catalogSourceParameterMappings);
}

export function applyRoutedAppShellSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): RoutedAppShellRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, routedAppShellSourceParameterMappings);
}

export function applyRoutedFormSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): RoutedStateBackedFormRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, routedFormSourceParameterMappings);
}

export function applyFormSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): StateBackedFormRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, formSourceParameterMappings);
}

export function applyServiceBackedFormSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): ServiceBackedFormRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, serviceBackedFormSourceParameterMappings);
}

export function applyMultiStepFormSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): MultiStepStateBackedFormRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, multiStepFormSourceParameterMappings);
}

export function applyRoutedTableSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): RoutedSearchableDataTableRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, routedTableSourceParameterMappings);
}

export function applyTableSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): SearchableDataTableRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, tableSourceParameterMappings);
}

export function applyStateStoreListSourceParameterValues(
  request: AuthoringRecipeRequestBase,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): StateStoreListRecipeRequest {
  return applySourceParameterMappings(request, sourceParameterValues, stateStoreListSourceParameterMappings);
}

export function authoringSourceParameterApplications(
  sourcePlan: AuthoringSourceEditPlan,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): readonly AuthoringSourceParameterApplication[] {
  if (sourceParameterValues.length === 0) {
    return [];
  }

  const parametersByKey = new Map((sourcePlan.pattern?.parameters ?? [])
    .map((parameter) => [parameter.key, parameter]));
  return sourceParameterValues.map((value) => {
    const parameter = parametersByKey.get(value.key);
    if (parameter == null) {
      return {
        key: value.key,
        requestedValue: value.value,
        defaultValue: null,
        applicationPolicy: null,
        valueShape: null,
        applicationState: 'unknown-parameter',
        summary: 'No source-pattern parameter with this key exists on the selected recipe.',
      };
    }

    if (parameter.applicationPolicy === 'source-text-input') {
      if (
        !sourceParameterValueAppliedToPatternDefault(parameter.defaultValue, value.value, parameter.valueShape)
        || !sourcePlanContainsParameterValue(sourcePlan, parameter.valueShape, value.value)
      ) {
        return {
          key: value.key,
          requestedValue: value.value,
          defaultValue: parameter.defaultValue,
          applicationPolicy: parameter.applicationPolicy,
          valueShape: parameter.valueShape,
          applicationState: 'not-applied-to-source-plan',
          summary: 'This parameter is source-applicable, but the built source plan did not expose the requested value in generated source text; check the recipe source-parameter mapping.',
        };
      }
      return {
        key: value.key,
        requestedValue: value.value,
        defaultValue: parameter.defaultValue,
        applicationPolicy: parameter.applicationPolicy,
        valueShape: parameter.valueShape,
        applicationState: 'applied-to-source-plan',
        summary: 'This value was applied to recipe model fields and generated source text.',
      };
    }

    return {
      key: value.key,
      requestedValue: value.value,
      defaultValue: parameter.defaultValue,
      applicationPolicy: parameter.applicationPolicy,
      valueShape: parameter.valueShape,
      applicationState: 'advisory-only',
      summary: 'This value is an adaptation target for the host or AI; semantic-runtime does not rewrite this part of the source plan yet.',
    };
  });
}

function sourcePlanContainsParameterValue(
  sourcePlan: AuthoringSourceEditPlan,
  valueShape: AuthoringSourcePatternParameterValueShape,
  value: string,
): boolean {
  const searchValues = sourceParameterSearchValues(value, valueShape);
  if (valueShape === 'option-schema-list') {
    return searchValues.length > 0
      && searchValues.every((searchValue) => sourcePlanTextRows(sourcePlan).some((text) => text.includes(searchValue)));
  }
  for (const text of sourcePlanTextRows(sourcePlan)) {
    if (searchValues.some((searchValue) => text.includes(searchValue))) {
      return true;
    }
  }
  return false;
}

function sourceParameterValueAppliedToPatternDefault(
  defaultValue: string | null,
  requestedValue: string,
  valueShape: AuthoringSourcePatternParameterValueShape,
): boolean {
  if (defaultValue == null) {
    return false;
  }
  const defaultSearchValues = new Set(sourceParameterSearchValues(defaultValue, valueShape));
  for (const requestedSearchValue of sourceParameterSearchValues(requestedValue, valueShape)) {
    if (defaultSearchValues.has(requestedSearchValue)) {
      return true;
    }
  }
  return false;
}

function sourceParameterSearchValues(
  value: string,
  valueShape: AuthoringSourcePatternParameterValueShape,
): readonly string[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }
  switch (valueShape) {
    case 'domain-title':
      return sourceNameSearchValues(trimmed);
    case 'source-member-name':
      return sourceIdentifierSearchValues(trimmed);
    case 'route-path':
    case 'route-parameter-name':
    case 'route-title':
      return sourceTextSearchValues(trimmed);
    case 'route-section-list':
    case 'workflow-step-list':
      return sourceSectionListSearchValues(trimmed);
    case 'workflow-section-field-schema-list':
      return sourceWorkflowSectionFieldSchemaSearchValues(trimmed);
    case 'field-schema-list':
      return sourceFieldSchemaSearchValues(trimmed);
    case 'option-schema-list':
      return sourceOptionSchemaLiteralSearchValues(trimmed);
    case 'domain-collection-summary':
    case 'copy-text':
    case 'sample-data-summary':
    case 'presentation-summary':
    case 'freeform-summary':
      return [trimmed];
  }
}

function sourceWorkflowSectionFieldSchemaSearchValues(value: string): readonly string[] {
  return uniqueSourceSearchValues(
    value
      .split(/[;\n]+/u)
      .flatMap((group) => {
        const separatorIndex = group.indexOf(':');
        if (separatorIndex < 0) {
          return sourceFieldSchemaSearchValues(group);
        }
        return [
          ...sourceNameSearchValues(group.slice(0, separatorIndex)),
          ...sourceFieldSchemaSearchValues(group.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function sourceSectionListSearchValues(value: string): readonly string[] {
  return uniqueSourceSearchValues(
    value
      .split(/[,;]|\band\b/iu)
      .flatMap((item) => sourceNameSearchValues(item)),
  );
}

function sourceFieldSchemaSearchValues(value: string): readonly string[] {
  return uniqueSourceSearchValues(
    value
      .split(/[,;]|\band\b/iu)
      .flatMap((item) => [
        ...sourceNameSearchValues(item),
        ...sourceNameSearchValues(sourceFieldSchemaLabel(item)),
      ]),
  );
}

function sourceFieldSchemaLabel(value: string): string {
  return value
    .replace(/\b(field|input|control|select|dropdown|choice|choices|option|options|toggle|toggles|switch|checkbox|checkboxes|checked)\b/giu, ' ')
    .replace(/\b(number|numeric)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceNameSearchValues(value: string): readonly string[] {
  const words = sourceNameWords(value);
  return uniqueSourceSearchValues([
    value,
    titleSourceName(words),
    lowerTitleSourceName(words),
    pascalSourceName(words),
    lowerCamelSourceName(words),
    kebabSourceName(words),
    upperSnakeSourceName(words),
  ]);
}

function sourceIdentifierSearchValues(value: string): readonly string[] {
  const words = sourceNameWords(value);
  return uniqueSourceSearchValues([
    value,
    lowerCamelSourceName(words),
    pascalSourceName(words),
    kebabSourceName(words),
    upperSnakeSourceName(words),
  ]);
}

function sourceTextSearchValues(value: string): readonly string[] {
  const words = sourceNameWords(value);
  return uniqueSourceSearchValues([
    value,
    titleSourceName(words),
    lowerTitleSourceName(words),
  ]);
}

function uniqueSourceSearchValues(
  values: readonly string[],
): readonly string[] {
  const uniqueValues: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      uniqueValues.push(trimmed);
    }
  }
  return uniqueValues;
}

function sourcePlanTextRows(
  sourcePlan: AuthoringSourceEditPlan,
): readonly string[] {
  return [
    ...sourcePlan.files
      .map((file) => file.text?.text)
      .filter((text): text is string => text != null),
    ...(sourcePlan.projectTooling?.files.map((file) => file.text) ?? []),
  ];
}

function applySourceParameterMappings<TRequest extends AuthoringRecipeRequestBase, TProperty extends string>(
  request: TRequest,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
  mappings: readonly AuthoringSourceParameterMapping<TProperty>[],
): TRequest & Partial<Record<TProperty, string>> {
  const valuesByKey = sourceParameterValuesByKey(sourceParameterValues);
  const result = Object.assign({}, request) as Record<string, unknown>;
  for (const mapping of mappings) {
    const value = valuesByKey.get(mapping.sourceParameterKey);
    if (value != null) {
      result[mapping.recipeRequestProperty] = value;
    }
  }
  return result as TRequest & Partial<Record<TProperty, string>>;
}

function sourceParameterValuesByKey(
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): ReadonlyMap<string, string> {
  const valuesByKey = new Map<string, string>();
  for (const parameterValue of sourceParameterValues) {
    const value = parameterValue.value.trim();
    if (value.length > 0 && !valuesByKey.has(parameterValue.key)) {
      valuesByKey.set(parameterValue.key, value);
    }
  }
  return valuesByKey;
}
