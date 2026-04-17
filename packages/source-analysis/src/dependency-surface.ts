import type { AnalysisViews } from './analysis-views.js';
import type {
  DepsOutput,
  ExternalImport,
  OutputEdge,
  UnresolvedImport,
} from './deps/schema.js';
import type { StructuralClaimGraphRuntime } from './structural-claim-graph.js';

export const DEPENDENCY_SURFACE_SOURCE_IDS = [
  'structural-runtime',
  'deps-snapshot',
] as const;

export type DependencySurfaceSourceId =
  typeof DEPENDENCY_SURFACE_SOURCE_IDS[number];

export interface MaterializedDependencySurface {
  readonly analyzedFiles: readonly string[];
  readonly edges: readonly OutputEdge[];
  readonly externalImports: readonly ExternalImport[];
  readonly unresolvedImports: readonly UnresolvedImport[];
}

export interface DependencySurface extends MaterializedDependencySurface {
  readonly source: DependencySurfaceSourceId;
  readonly edgesBySourceFile: ReadonlyMap<string, readonly OutputEdge[]>;
  readonly edgesByTargetFile: ReadonlyMap<string, readonly OutputEdge[]>;
}

export function materializeDependencySurfaceFromRuntime(
  runtime: StructuralClaimGraphRuntime,
): MaterializedDependencySurface {
  const analyzedFiles = runtime.index.sourceFiles
    .map((claim) => claim.attributes.filePath)
    .sort((left, right) => left.localeCompare(right));
  const edges: OutputEdge[] = [];
  const externalImports: ExternalImport[] = [];
  const unresolvedImports: UnresolvedImport[] = [];

  for (const importClaim of runtime.index.imports) {
    const resolution = runtime.index.resolutionByImportId.get(importClaim.id);
    if (!resolution) {
      continue;
    }

    if (resolution.attributes.status === 'internal' && resolution.attributes.targetFile) {
      edges.push({
        source: importClaim.attributes.sourceFile,
        target: resolution.attributes.targetFile,
        specifier: importClaim.attributes.specifier,
        bindings: [...importClaim.attributes.bindings],
        type_only: importClaim.attributes.typeOnly,
        line: importClaim.attributes.line,
        ...(resolution.attributes.viaBarrel ? { via_barrel: true } : {}),
        ...(resolution.attributes.dtsTarget ? { dts_target: true } : {}),
      });
      continue;
    }

    if (resolution.attributes.status === 'external' && resolution.attributes.externalPackage) {
      externalImports.push({
        source: importClaim.attributes.sourceFile,
        package: resolution.attributes.externalPackage,
        specifier: importClaim.attributes.specifier,
      });
      continue;
    }

    if (resolution.attributes.status === 'unresolved') {
      unresolvedImports.push({
        source: importClaim.attributes.sourceFile,
        specifier: importClaim.attributes.specifier,
        line: importClaim.attributes.line,
      });
    }
  }

  return {
    analyzedFiles,
    edges: sortDependencyEdges(edges),
    externalImports: [...externalImports].sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.package.localeCompare(right.package)
      || left.specifier.localeCompare(right.specifier),
    ),
    unresolvedImports: [...unresolvedImports].sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.line - right.line
      || left.specifier.localeCompare(right.specifier),
    ),
  };
}

export function loadDependencySurface(
  analysis: AnalysisViews,
): DependencySurface {
  const materialized = analysis.structuralRuntime
    ? materializeDependencySurfaceFromRuntime(analysis.structuralRuntime)
    : materializeDependencySurfaceFromDepsSnapshot(analysis.deps);

  const edgesBySourceFile = new Map<string, OutputEdge[]>();
  const edgesByTargetFile = new Map<string, OutputEdge[]>();

  for (const edge of materialized.edges) {
    const bySource = edgesBySourceFile.get(edge.source) ?? [];
    bySource.push(edge);
    edgesBySourceFile.set(edge.source, bySource);

    const byTarget = edgesByTargetFile.get(edge.target) ?? [];
    byTarget.push(edge);
    edgesByTargetFile.set(edge.target, byTarget);
  }

  return {
    source: analysis.structuralRuntime ? 'structural-runtime' : 'deps-snapshot',
    ...materialized,
    edgesBySourceFile: new Map(
      [...edgesBySourceFile.entries()].map(([filePath, edges]) => [filePath, sortDependencyEdges(edges)]),
    ),
    edgesByTargetFile: new Map(
      [...edgesByTargetFile.entries()].map(([filePath, edges]) => [filePath, sortDependencyEdges(edges)]),
    ),
  };
}

function materializeDependencySurfaceFromDepsSnapshot(
  deps: DepsOutput,
): MaterializedDependencySurface {
  return {
    analyzedFiles: dedupeAndSortFiles([
      ...deps.edges.flatMap((edge) => [edge.source, edge.target]),
      ...deps.external_imports.map((entry) => entry.source),
      ...deps.unresolved_imports.map((entry) => entry.source),
      ...deps.uncovered_files,
    ]),
    edges: sortDependencyEdges(deps.edges),
    externalImports: [...deps.external_imports].sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.package.localeCompare(right.package)
      || left.specifier.localeCompare(right.specifier),
    ),
    unresolvedImports: [...deps.unresolved_imports].sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.line - right.line
      || left.specifier.localeCompare(right.specifier),
    ),
  };
}

function sortDependencyEdges(
  edges: readonly OutputEdge[],
): OutputEdge[] {
  return [...edges].sort((left, right) =>
    left.source.localeCompare(right.source)
    || left.target.localeCompare(right.target)
    || left.line - right.line
    || left.specifier.localeCompare(right.specifier),
  );
}

function dedupeAndSortFiles(
  filePaths: readonly string[],
): string[] {
  return [...new Set(filePaths)].sort((left, right) => left.localeCompare(right));
}
