import type { AuthoringPlan } from './plan.js';
import {
  AuthoringRecipeDescriptors,
  buildAuthoringRecipePlan,
  type AuthoringRecipeKey,
} from './recipe.js';
import type { AuthoringSourcePatternParameterValue } from './source-plan.js';

export interface GeneratedAuthoringFixturePlanRequest {
  readonly folderName: string;
  readonly recipeKey: AuthoringRecipeKey;
  readonly appName: string;
  readonly sourceParameterValues: readonly AuthoringSourcePatternParameterValue[];
  /** Stable fixture intent label used by pressure tooling before source-parameterized orientation rows exist. */
  readonly intentRecipeKey: string;
}

export function generatedAuthoringFixturePlanRequests(): readonly GeneratedAuthoringFixturePlanRequest[] {
  return [
    ...Object.values(AuthoringRecipeDescriptors).map((descriptor) =>
      generatedAuthoringFixturePlanRequest(
        `generated-${descriptor.key}`,
        descriptor.key,
        `generated-${descriptor.key}`,
        [],
        descriptor.key,
      )
    ),
    ...compactGeneratedAuthoringFixturePlanRequests(),
  ];
}

export function generatedAuthoringFixturePlanRequestForFolderName(
  folderName: string,
): GeneratedAuthoringFixturePlanRequest | null {
  return generatedAuthoringFixturePlanRequests().find((request) => request.folderName === folderName) ?? null;
}

export function buildGeneratedAuthoringFixturePlan(
  rootDir: string,
  request: GeneratedAuthoringFixturePlanRequest,
): AuthoringPlan {
  return buildAuthoringRecipePlan(
    request.recipeKey,
    rootDir,
    request.appName,
    { sourceParameterValues: request.sourceParameterValues },
  );
}

function compactGeneratedAuthoringFixturePlanRequests(): readonly GeneratedAuthoringFixturePlanRequest[] {
  return [
    generatedAuthoringFixturePlanRequest(
      'generated-compact-searchable-data-table',
      'searchable-data-table',
      'Generated Compact Searchable Data Table',
      [
        { key: 'table-entity', value: 'Customer Account' },
        { key: 'table-collection', value: 'customerAccounts' },
      ],
      'searchable-data-table:compact',
    ),
    generatedAuthoringFixturePlanRequest(
      'generated-compact-routed-searchable-data-table',
      'routed-searchable-data-table',
      'Generated Compact Routed Searchable Data Table',
      [
        { key: 'table-entity', value: 'Support Ticket' },
        { key: 'table-collection', value: 'supportTickets' },
        { key: 'detail-route-parameter', value: 'ticketId' },
        { key: 'list-route-path', value: 'tickets' },
        { key: 'list-route-title', value: 'Tickets' },
      ],
      'routed-searchable-data-table:compact',
    ),
    generatedAuthoringFixturePlanRequest(
      'generated-compact-catalog-storefront',
      'catalog-storefront',
      'Generated Compact Catalog Storefront',
      [
        { key: 'catalog-entity', value: 'Product Tier' },
        { key: 'catalog-collection', value: 'productTiers' },
      ],
      'catalog-storefront:compact',
    ),
    generatedAuthoringFixturePlanRequest(
      'generated-compact-routed-catalog-storefront',
      'routed-catalog-storefront',
      'Generated Compact Routed Catalog Storefront',
      [
        { key: 'catalog-entity', value: 'Service Plan' },
        { key: 'catalog-collection', value: 'servicePlans' },
        { key: 'detail-route-parameter', value: 'planId' },
        { key: 'list-route-path', value: 'plans' },
        { key: 'list-route-title', value: 'Plans' },
      ],
      'routed-catalog-storefront:compact',
    ),
  ];
}

function generatedAuthoringFixturePlanRequest(
  folderName: string,
  recipeKey: AuthoringRecipeKey,
  appName: string,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
  intentRecipeKey: string,
): GeneratedAuthoringFixturePlanRequest {
  return {
    folderName,
    recipeKey,
    appName,
    sourceParameterValues,
    intentRecipeKey,
  };
}
