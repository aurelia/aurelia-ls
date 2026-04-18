import type { AnalysisViews } from './analysis-views.js';
import type {
  PackageExportRecord,
  PackageExportsSummary,
} from './exports-contract.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import {
  resolveStructuralOwningPackage,
} from './structural-source-file-surface.js';
import type {
  DeclarationClaim,
  ExportObservationClaim,
  MemberClaim,
  TypeReferenceClaim,
} from './structural-claim-graph.js';

export const STRUCTURAL_DECLARATION_LOOKUP_TAGS = [
  'hit',
  'miss',
  'ambiguous',
  'open-boundary',
] as const;

export type StructuralDeclarationLookupTag =
  typeof STRUCTURAL_DECLARATION_LOOKUP_TAGS[number];

export interface StructuralDeclarationMatch {
  readonly declaration: DeclarationClaim;
  readonly owningPackage: PackageExportsSummary | null;
  readonly members: readonly MemberClaim[];
  readonly typeReferences: readonly TypeReferenceClaim[];
  readonly exportObservations: readonly ExportObservationClaim[];
  readonly publicExports: readonly PackageExportRecord[];
}

export interface StructuralDeclarationLookup {
  readonly tag: StructuralDeclarationLookupTag;
  readonly query: string;
  readonly matches: readonly StructuralDeclarationMatch[];
  readonly message?: string;
}

// TODO: Symbol-focused declaration lookup is currently live-only because
// declaration observations are not yet materialized into a dedicated snapshot
// contract. If snapshot-only navigation must answer non-type symbol questions,
// extract a neutral declaration snapshot surface rather than teaching symbol
// navigation to reread raw source ad hoc.
export function describeMissingStructuralDeclarationSurface(): string {
  return 'Symbol-focused navigation now depends on the live structural declaration surface, but the current analysis views do not carry a structural claim graph.';
}

export function lookupStructuralDeclarations(
  analysis: AnalysisViews,
  query: string,
): StructuralDeclarationLookup {
  const normalized = trimTrailingFocusPunctuation(query).trim();
  if (!analysis.structuralRuntime) {
    return {
      tag: 'open-boundary',
      query: normalized,
      matches: [],
      message: describeMissingStructuralDeclarationSurface(),
    };
  }
  if (normalized.length === 0) {
    return {
      tag: 'miss',
      query: normalized,
      matches: [],
    };
  }

  const exact = analysis.structuralRuntime.index.declarationsByName.get(normalized) ?? [];
  if (exact.length > 0) {
    return toLookup(exact.length === 1 ? 'hit' : 'ambiguous', normalized, exact, analysis);
  }

  const lower = normalized.toLowerCase();
  const exactCaseInsensitive = analysis.structuralRuntime.index.declarationsByLowerName.get(lower) ?? [];
  if (exactCaseInsensitive.length > 0) {
    return toLookup(
      exactCaseInsensitive.length === 1 ? 'hit' : 'ambiguous',
      normalized,
      exactCaseInsensitive,
      analysis,
    );
  }

  const partialMatches = analysis.structuralRuntime.index.declarations
    .filter((declaration) =>
      declaration.attributes.name.toLowerCase().includes(lower),
    )
    .sort((left, right) =>
      left.attributes.name.localeCompare(right.attributes.name)
      || left.attributes.filePath.localeCompare(right.attributes.filePath)
      || left.attributes.line - right.attributes.line,
    );

  if (partialMatches.length === 0) {
    return {
      tag: 'miss',
      query: normalized,
      matches: [],
    };
  }

  return toLookup('ambiguous', normalized, partialMatches, analysis);
}

function toLookup(
  tag: StructuralDeclarationLookupTag,
  query: string,
  declarations: readonly DeclarationClaim[],
  analysis: AnalysisViews,
): StructuralDeclarationLookup {
  return {
    tag,
    query,
    matches: declarations.map((declaration) => toDeclarationMatch(analysis, declaration)),
  };
}

function toDeclarationMatch(
  analysis: AnalysisViews,
  declaration: DeclarationClaim,
): StructuralDeclarationMatch {
  const filePath = declaration.attributes.filePath;
  const name = declaration.attributes.name;

  return {
    declaration,
    owningPackage: resolveStructuralOwningPackage(analysis, filePath),
    members: analysis.structuralRuntime?.index.membersByDeclarationId.get(declaration.id) ?? [],
    typeReferences: analysis.structuralRuntime?.index.typeReferencesByDeclarationId.get(declaration.id) ?? [],
    exportObservations: (analysis.structuralRuntime?.index.exportObservationsBySourceFilePath.get(filePath) ?? [])
      .filter((observation) =>
        observation.attributes.originalName === name
        || observation.attributes.exportedName === name,
      ),
    publicExports: analysis.exports.exports.filter((record) =>
      record.declaration_file === filePath
      && record.declaration_name === name,
    ),
  };
}
