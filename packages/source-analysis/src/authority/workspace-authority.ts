import type { AnalysisViews } from '../analysis-views.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
  type AnalyzabilityPosture,
  type FocusedAnalyzabilityContext,
} from '../analyzability-posture.js';
import { loadDependencySurface, type DependencySurface } from '../dependency-surface.js';
import type { CouplingMatrix } from '../deps/schema.js';
import { resolveExportRoute, type ResolvedExportRoute } from '../export-trace-runtime-surface.js';
import type { PackageExportRecord, PackageExportsSummary } from '../exports/schema.js';
import { trimTrailingFocusPunctuation } from '../focus-normalization.js';
import {
  inspectFocusedFileQuery,
  type FocusedFileQueryInspection,
} from '../focused-file-query.js';
import {
  getPackageRouteWitnesses,
  createPackageReachability,
  type PackageReachability,
  type PackageRouteWitness,
} from '../reachability.js';
import type { InquiryOrdering } from '../inquiry-policy.js';
import {
  coerceAnalysisViews,
} from '../snapshot-analysis-views.js';
import type { LoadedCurrentSnapshotSet } from '../snapshot-contract.js';
import {
  lookupStructuralDeclarations,
  type StructuralDeclarationLookup,
} from '../structural-declaration-surface.js';
import {
  collectStructuralPackageFileSurface,
  resolveStructuralOwningPackage,
  type StructuralPackageFileSurface,
} from '../structural-source-file-surface.js';
import type { TypeDecl } from '../typerefs/schema.js';
import type {
  AuthorityEvidence,
  AuthorityOutcome,
  Locator,
  SpendThreshold,
} from './contracts.js';

export interface WorkspaceAnalyzabilityFocus {
  readonly focusLabel: string;
  readonly pathPrefixes?: readonly string[];
  readonly queryHints?: readonly string[];
}

export interface WorkspaceAuthority {
  readonly kind: 'legacy-projection-adapter';
  readonly analysis: AnalysisViews;
  readonly evidence: readonly AuthorityEvidence[];
  getDependencySurface(): DependencySurface;
  inspectFocusedAnalyzability(
    focus: WorkspaceAnalyzabilityFocus,
  ): FocusedAnalyzabilityContext;
  inspectFocusedFile(
    locator: Locator,
  ): FocusedFileQueryInspection;
  lookupSymbolDeclaration(
    locator: Locator,
  ): StructuralDeclarationLookup;
  resolvePackage(
    locator: Locator,
    spendThreshold?: SpendThreshold,
  ): AuthorityOutcome<PackageExportsSummary, PackageExportsSummary>;
  resolveTypeDeclaration(
    locator: Locator,
    spendThreshold?: SpendThreshold,
  ): AuthorityOutcome<TypeDecl, TypeDecl>;
  resolveExport(
    locator: Locator,
    spendThreshold?: SpendThreshold,
  ): AuthorityOutcome<PackageExportRecord, PackageExportRecord>;
  resolvePackageExport(
    packageDir: string,
    exportedName: string,
    spendThreshold?: SpendThreshold,
  ): AuthorityOutcome<PackageExportRecord, PackageExportRecord>;
  getPackageCouplingMatrix(
    packageDir: string,
  ): CouplingMatrix | undefined;
  getPackageValueExports(
    packageDir: string,
    limit: number,
  ): readonly PackageExportRecord[];
  getPackageByDir(
    packageDir: string,
  ): PackageExportsSummary | undefined;
  getStructuralPackageSurface(
    packageDir: string,
  ): StructuralPackageFileSurface | null;
  getPackageReachability(
    packageDir: string,
    ordering?: InquiryOrdering,
  ): PackageReachability | null;
  getPackageRouteWitnesses(
    packageDir: string,
    filePath: string,
    ordering?: InquiryOrdering,
  ): readonly PackageRouteWitness[] | null;
  resolveOwningPackage(
    filePath: string,
  ): PackageExportsSummary | null;
  getFileDeclarations(
    filePath: string,
  ): readonly TypeDecl[];
  getFileExportRecords(
    filePath: string,
  ): readonly PackageExportRecord[];
  getTypeDeclarationByFileAndName(
    filePath: string,
    name: string,
  ): TypeDecl | undefined;
  getWorkspacePackageEntrypointsByName(): ReadonlyMap<string, string>;
  resolveExportRoute(
    record: PackageExportRecord,
  ): ResolvedExportRoute | null;
}

// TODO: This adapter exists to move query.navigate onto a shared authority seam
// without pretending the legacy projections are already gone. As more shared
// substrate, semantic, and evaluator surfaces land, keep shrinking this file
// until it becomes a thin compatibility materializer rather than a truth owner.
export function createLegacyProjectionWorkspaceAuthority(
  input: AnalysisViews | LoadedCurrentSnapshotSet,
): WorkspaceAuthority {
  const analysis = coerceAnalysisViews(input);
  let dependencySurface: DependencySurface | undefined;
  let analyzabilityPosture: AnalyzabilityPosture | undefined;
  const packageSurfacesByDir = new Map<string, StructuralPackageFileSurface | null>();
  const packageReachabilityByFingerprint = new Map<string, PackageReachability | null>();
  let workspacePackageEntrypointsByName: ReadonlyMap<string, string> | undefined;

  const sharedProjectionEvidence: readonly AuthorityEvidence[] = [
    {
      kind: 'projection',
      label: 'legacy deps/typerefs/exports compatibility projections',
      detail: 'Navigation is reading through a transitional authority adapter over the historical snapshot bundle.',
      refs: ['deps', 'typerefs', 'exports'],
    },
  ];

  return {
    kind: 'legacy-projection-adapter',
    analysis,
    evidence: sharedProjectionEvidence,
    getDependencySurface(): DependencySurface {
      dependencySurface ??= loadDependencySurface(analysis);
      return dependencySurface;
    },
    inspectFocusedAnalyzability(
      focus: WorkspaceAnalyzabilityFocus,
    ): FocusedAnalyzabilityContext {
      analyzabilityPosture ??= inspectAnalyzabilityPostureFromAnalysisViews(analysis);
      return inspectFocusedAnalyzabilityContext(analyzabilityPosture, focus);
    },
    inspectFocusedFile(
      locator: Locator,
    ): FocusedFileQueryInspection {
      return inspectFocusedFileQuery(analysis, locator.value);
    },
    lookupSymbolDeclaration(
      locator: Locator,
    ): StructuralDeclarationLookup {
      return lookupStructuralDeclarations(analysis, locator.value);
    },
    resolvePackage(
      locator: Locator,
      spendThreshold = 'admissible-claim',
    ): AuthorityOutcome<PackageExportsSummary, PackageExportsSummary> {
      const normalized = trimTrailingFocusPunctuation(locator.value).toLowerCase();
      const exact = analysis.exports.packages.filter((pkg) =>
        pkg.package_name.toLowerCase() === normalized
        || pkg.package_dir.toLowerCase() === normalized,
      );
      if (exact.length === 1) {
        return claim(locator, spendThreshold, exact[0]!, 'projection', 'legacy package projection match');
      }
      if (exact.length > 1) {
        return ambiguity(locator, spendThreshold, exact, 'Multiple packages closed on the same normalized locator.', [{
          kind: 'package',
          label: 'package',
        }]);
      }

      const shortMatches = analysis.exports.packages.filter((pkg) =>
        pkg.package_name.split('/').at(-1)?.toLowerCase() === normalized
        || pkg.package_dir.split('/').at(-1)?.toLowerCase() === normalized,
      );
      if (shortMatches.length === 1) {
        return claim(locator, spendThreshold, shortMatches[0]!, 'projection', 'legacy package short-name projection match');
      }
      if (shortMatches.length > 1) {
        return ambiguity(locator, spendThreshold, shortMatches, 'Multiple packages share the same short-name locator.', [{
          kind: 'package',
          label: 'package',
        }]);
      }

      const containsMatches = analysis.exports.packages.filter((pkg) =>
        pkg.package_name.toLowerCase().includes(normalized)
        || pkg.package_dir.toLowerCase().includes(normalized),
      );
      if (containsMatches.length === 1) {
        return claim(locator, spendThreshold, containsMatches[0]!, 'projection', 'legacy package substring projection match');
      }
      if (containsMatches.length > 1) {
        return ambiguity(locator, spendThreshold, containsMatches, 'Multiple packages contain the requested locator text.', [{
          kind: 'package',
          label: 'package',
        }]);
      }

      return noClaim(locator, spendThreshold, 'not-found', 'No package closed on the requested locator.');
    },
    resolveTypeDeclaration(
      locator: Locator,
      spendThreshold = 'admissible-claim',
    ): AuthorityOutcome<TypeDecl, TypeDecl> {
      const normalized = trimTrailingFocusPunctuation(locator.value);
      const exact = analysis.typeRefs.declarations.filter((decl) => decl.name === normalized);
      if (exact.length === 1) {
        return claim(locator, spendThreshold, exact[0]!, 'projection', 'legacy type declaration exact match');
      }
      if (exact.length > 1) {
        return ambiguity(locator, spendThreshold, exact, 'Multiple type declarations share this exact name.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const exactCaseInsensitive = analysis.typeRefs.declarations.filter((decl) =>
        decl.name.toLowerCase() === normalized.toLowerCase(),
      );
      if (exactCaseInsensitive.length === 1) {
        return claim(locator, spendThreshold, exactCaseInsensitive[0]!, 'projection', 'legacy type declaration case-insensitive match');
      }
      if (exactCaseInsensitive.length > 1) {
        return ambiguity(locator, spendThreshold, exactCaseInsensitive, 'Multiple type declarations share this case-insensitive name.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const containsMatches = analysis.typeRefs.declarations.filter((decl) =>
        decl.name.toLowerCase().includes(normalized.toLowerCase()),
      );
      if (containsMatches.length === 1) {
        return claim(locator, spendThreshold, containsMatches[0]!, 'projection', 'legacy type declaration substring match');
      }
      if (containsMatches.length > 1) {
        return ambiguity(locator, spendThreshold, containsMatches, 'Multiple type declarations contain the requested locator text.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      return noClaim(locator, spendThreshold, 'not-found', 'No type declaration closed on the requested locator.');
    },
    resolveExport(
      locator: Locator,
      spendThreshold = 'admissible-claim',
    ): AuthorityOutcome<PackageExportRecord, PackageExportRecord> {
      const normalized = trimTrailingFocusPunctuation(locator.value);
      const exact = analysis.exports.exports.filter((record) => record.exported_name === normalized);
      if (exact.length === 1) {
        return claim(locator, spendThreshold, exact[0]!, 'projection', 'legacy export exact match');
      }
      if (exact.length > 1) {
        return ambiguity(locator, spendThreshold, exact, 'Multiple package exports share this exact exported name.', [{
          kind: 'package',
          label: 'package',
        }, {
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const exactCaseInsensitive = analysis.exports.exports.filter((record) =>
        record.exported_name.toLowerCase() === normalized.toLowerCase(),
      );
      if (exactCaseInsensitive.length === 1) {
        return claim(locator, spendThreshold, exactCaseInsensitive[0]!, 'projection', 'legacy export case-insensitive match');
      }
      if (exactCaseInsensitive.length > 1) {
        return ambiguity(locator, spendThreshold, exactCaseInsensitive, 'Multiple package exports share this case-insensitive exported name.', [{
          kind: 'package',
          label: 'package',
        }, {
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const containsMatches = analysis.exports.exports.filter((record) =>
        record.exported_name.toLowerCase().includes(normalized.toLowerCase()),
      );
      if (containsMatches.length === 1) {
        return claim(locator, spendThreshold, containsMatches[0]!, 'projection', 'legacy export substring match');
      }
      if (containsMatches.length > 1) {
        return ambiguity(locator, spendThreshold, containsMatches, 'Multiple package exports contain the requested locator text.', [{
          kind: 'package',
          label: 'package',
        }, {
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      return noClaim(locator, spendThreshold, 'not-found', 'No package export closed on the requested locator.');
    },
    resolvePackageExport(
      packageDir: string,
      exportedName: string,
      spendThreshold = 'admissible-claim',
    ): AuthorityOutcome<PackageExportRecord, PackageExportRecord> {
      const locator: Locator = {
        kind: 'export-name',
        value: exportedName,
        label: `${packageDir}:${exportedName}`,
      };
      const normalized = trimTrailingFocusPunctuation(exportedName);
      const packageRecords = analysis.exports.exports.filter((record) => record.package_dir === packageDir);
      const exact = packageRecords.filter((record) => record.exported_name === normalized);
      if (exact.length === 1) {
        return claim(locator, spendThreshold, exact[0]!, 'projection', 'package-local export exact match');
      }
      if (exact.length > 1) {
        return ambiguity(locator, spendThreshold, exact, 'Multiple package-local exports share this exact exported name.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const exactCaseInsensitive = packageRecords.filter((record) =>
        record.exported_name.toLowerCase() === normalized.toLowerCase(),
      );
      if (exactCaseInsensitive.length === 1) {
        return claim(locator, spendThreshold, exactCaseInsensitive[0]!, 'projection', 'package-local export case-insensitive match');
      }
      if (exactCaseInsensitive.length > 1) {
        return ambiguity(locator, spendThreshold, exactCaseInsensitive, 'Multiple package-local exports share this case-insensitive exported name.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      const containsMatches = packageRecords.filter((record) =>
        record.exported_name.toLowerCase().includes(normalized.toLowerCase()),
      );
      if (containsMatches.length === 1) {
        return claim(locator, spendThreshold, containsMatches[0]!, 'projection', 'package-local export substring match');
      }
      if (containsMatches.length > 1) {
        return ambiguity(locator, spendThreshold, containsMatches, 'Multiple package-local exports contain the requested locator text.', [{
          kind: 'file',
          label: 'declaration file',
        }]);
      }

      return noClaim(locator, spendThreshold, 'not-found', `No package-local export closed on "${exportedName}" inside ${packageDir}.`);
    },
    getPackageCouplingMatrix(
      packageDir: string,
    ): CouplingMatrix | undefined {
      return analysis.deps.coupling_matrices.find((candidate) => candidate.scope === packageDir);
    },
    getPackageValueExports(
      packageDir: string,
      limit: number,
    ): readonly PackageExportRecord[] {
      return analysis.exports.exports
        .filter((record) => record.package_dir === packageDir && !record.type_only)
        .sort((left, right) => left.exported_name.localeCompare(right.exported_name))
        .slice(0, limit);
    },
    getPackageByDir(
      packageDir: string,
    ): PackageExportsSummary | undefined {
      return analysis.exports.packages.find((candidate) => candidate.package_dir === packageDir);
    },
    getStructuralPackageSurface(
      packageDir: string,
    ): StructuralPackageFileSurface | null {
      if (packageSurfacesByDir.has(packageDir)) {
        return packageSurfacesByDir.get(packageDir) ?? null;
      }
      const pkg = this.getPackageByDir(packageDir);
      const surface = pkg
        ? collectStructuralPackageFileSurface(analysis, pkg)
        : null;
      packageSurfacesByDir.set(packageDir, surface);
      return surface;
    },
    getPackageReachability(
      packageDir: string,
      ordering?: InquiryOrdering,
    ): PackageReachability | null {
      const fingerprint = `${packageDir}\0${orderingFingerprint(ordering)}`;
      if (packageReachabilityByFingerprint.has(fingerprint)) {
        return packageReachabilityByFingerprint.get(fingerprint) ?? null;
      }
      const pkg = this.getPackageByDir(packageDir);
      const packageSurface = this.getStructuralPackageSurface(packageDir);
      const reachability = pkg && packageSurface
        ? createPackageReachability(analysis, pkg, {
          ordering,
          packageSurface,
        })
        : null;
      packageReachabilityByFingerprint.set(fingerprint, reachability);
      return reachability;
    },
    getPackageRouteWitnesses(
      packageDir: string,
      filePath: string,
      ordering?: InquiryOrdering,
    ): readonly PackageRouteWitness[] | null {
      const reachability = this.getPackageReachability(packageDir, ordering);
      return reachability
        ? getPackageRouteWitnesses(reachability, filePath)
        : null;
    },
    resolveOwningPackage(
      filePath: string,
    ): PackageExportsSummary | null {
      return resolveStructuralOwningPackage(analysis, filePath);
    },
    getFileDeclarations(
      filePath: string,
    ): readonly TypeDecl[] {
      return analysis.typeRefs.declarations.filter((decl) => decl.file === filePath);
    },
    getFileExportRecords(
      filePath: string,
    ): readonly PackageExportRecord[] {
      return analysis.exports.exports.filter((record) => record.declaration_file === filePath);
    },
    getTypeDeclarationByFileAndName(
      filePath: string,
      name: string,
    ): TypeDecl | undefined {
      return analysis.typeRefs.declarations.find((decl) =>
        decl.file === filePath && decl.name === name,
      );
    },
    getWorkspacePackageEntrypointsByName(): ReadonlyMap<string, string> {
      workspacePackageEntrypointsByName ??= new Map(
        analysis.exports.packages.map((pkg) => [
          pkg.package_name,
          pkg.source_entrypoint ?? pkg.analysis_entrypoint,
        ]),
      );
      return workspacePackageEntrypointsByName;
    },
    resolveExportRoute(
      record: PackageExportRecord,
    ): ResolvedExportRoute | null {
      return resolveExportRoute({
        repoPath: analysis.root,
        ...(analysis.repoSession ? { repoSession: analysis.repoSession } : {}),
        ...(analysis.structuralRuntime ? { structuralRuntime: analysis.structuralRuntime } : {}),
        workspacePackageEntrypointsByName: this.getWorkspacePackageEntrypointsByName(),
        analysisEntrypoint: record.analysis_entrypoint,
        exportedName: record.exported_name,
        fallback: {
          originalName: record.original_name,
          declarationFile: record.declaration_file,
          declarationLine: record.declaration_line,
          declarationName: record.declaration_name,
          typeOnly: record.type_only,
          namespaceExport: record.namespace_export,
          chain: record.chain,
        },
      });
    },
  };
}

export function coerceWorkspaceAuthority(
  input: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
): WorkspaceAuthority {
  return isWorkspaceAuthority(input)
    ? input
    : createLegacyProjectionWorkspaceAuthority(input);
}

function isWorkspaceAuthority(
  value: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
): value is WorkspaceAuthority {
  return 'kind' in value && value.kind === 'legacy-projection-adapter' && 'analysis' in value;
}

function claim<TValue>(
  locator: Locator,
  spendThreshold: SpendThreshold,
  value: TValue,
  evidenceKind: AuthorityEvidence['kind'],
  evidenceLabel: string,
): AuthorityOutcome<TValue> {
  return {
    kind: 'claim',
    locator,
    spendThreshold,
    value,
    evidence: [{
      kind: evidenceKind,
      label: evidenceLabel,
    }],
  };
}

function ambiguity<TCandidate>(
  locator: Locator,
  spendThreshold: SpendThreshold,
  candidates: readonly TCandidate[],
  summary: string,
  narrowingAxes: readonly { readonly kind: string; readonly label: string }[],
): AuthorityOutcome<never, TCandidate> {
  return {
    kind: 'ambiguity',
    locator,
    spendThreshold,
    ambiguity: {
      locator,
      summary,
      candidates,
      narrowingAxes,
    },
    evidence: [{
      kind: 'projection',
      label: 'legacy ambiguity set',
      detail: summary,
    }],
  };
}

function noClaim(
  locator: Locator,
  spendThreshold: SpendThreshold,
  kind: 'not-found' | 'blocked' | 'unsupported' | 'open-boundary' | 'stale' | 'unavailable',
  summary: string,
): AuthorityOutcome<never> {
  return {
    kind: 'no-claim',
    locator,
    spendThreshold,
    noClaim: {
      kind,
      locator,
      summary,
      spendThreshold,
      evidence: [{
        kind: 'projection',
        label: 'legacy no-claim outcome',
        detail: summary,
      }],
    },
    evidence: [{
      kind: 'projection',
      label: 'legacy no-claim outcome',
      detail: summary,
    }],
  };
}

function orderingFingerprint(
  ordering?: InquiryOrdering,
): string {
  if (!ordering) {
    return 'default';
  }

  return [
    ordering.issueSeverity.join(','),
    ordering.trust.join(','),
    ordering.routeClass.join(','),
    ordering.routeKind.join(','),
    ordering.rootKind.join(','),
  ].join('|');
}
