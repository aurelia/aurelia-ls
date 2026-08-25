import { describe, expect, test } from 'vitest';

import {
  InquiryContinuationCost,
  readSemanticAppQueryCatalogRows,
  SEMANTIC_RUNTIME_API_VERSION,
  semanticAppQueryCatalogRow,
  semanticAppQueryCatalogShape,
  semanticAppQueryMaterializationPolicy,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  unsupportedSemanticAppQuerySelectorFields,
  withSemanticAppQueryContinuations,
  type SemanticAppQuery,
} from '../src/index.js';
import { semanticAppQueryKey } from '../src/api/app-query-identity.js';

const typeSurfaceQueryKinds = [
  SemanticAppQueryKind.AppTopology,
  SemanticAppQueryKind.ResourceInventory,
  SemanticAppQueryKind.TemplateResourceAvailability,
] as const;

describe('app query type-surface selectors', () => {
  test('advertises the exact query kinds that accept type surfaces', () => {
    const supportedKinds = readSemanticAppQueryCatalogRows()
      .filter((row) => row.supportsTypeSurfaces)
      .map((row) => row.queryKind);

    expect(supportedKinds).toEqual(typeSurfaceQueryKinds);
  });

  test.each(typeSurfaceQueryKinds)('%s retains the selector and classifies the opt-in projection', (kind) => {
    const query: SemanticAppQuery = { kind, includeTypeSurfaces: true };
    const catalogRow = semanticAppQueryCatalogRow(kind);

    expect(semanticAppQueryCatalogShape(query)).toMatchObject({
      kind,
      includeTypeSurfaces: true,
    });
    expect(unsupportedSemanticAppQuerySelectorFields(query)).not.toContain('includeTypeSurfaces');
    expect(semanticAppQueryMaterializationPolicy(query, catalogRow.materializationPolicy))
      .toBe('query-type-projection');
    expect(semanticAppQueryKey(query)).not.toBe(semanticAppQueryKey({ kind }));
    expect(semanticAppQueryKey({ kind, includeTypeSurfaces: false }))
      .toBe(semanticAppQueryKey({ kind }));
  });

  test('drops and rejects the selector without changing an always-type-projected query', () => {
    const query: SemanticAppQuery = {
      kind: SemanticAppQueryKind.ResourceDefinitions,
      includeTypeSurfaces: true,
    };
    const catalogRow = semanticAppQueryCatalogRow(query.kind);

    expect(catalogRow.supportsTypeSurfaces).toBe(false);
    expect(semanticAppQueryCatalogShape(query)).toEqual({ kind: query.kind });
    expect(unsupportedSemanticAppQuerySelectorFields(query)).toContain('includeTypeSurfaces');
    expect(semanticAppQueryMaterializationPolicy(query, catalogRow.materializationPolicy))
      .toBe('query-type-projection');
  });

  test('preserves an explicit rich projection across compatible continuations', () => {
    const answer = withSemanticAppQueryContinuations(
      {
        kind: SemanticAppQueryKind.TemplateResourceAvailability,
        includeTypeSurfaces: true,
      },
      {
        schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
        result: SemanticRuntimeAnswerResult.Answered,
        selection: SemanticRuntimeAnswerSelection.Exact,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
        summary: 'test availability',
        value: {},
        page: null,
      },
    );
    const inventory = answer.continuations?.find((row) =>
      row.targetQueryKind === SemanticAppQueryKind.ResourceInventory
    );

    expect(inventory?.targetQuery).toMatchObject({
      kind: SemanticAppQueryKind.ResourceInventory,
      includeTypeSurfaces: true,
    });
    expect(inventory?.cost).toBe(InquiryContinuationCost.QueryTypeProjection);
  });
});
