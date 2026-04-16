import { loadCurrentSourceAnalysisSnapshots, type LoadedCurrentSourceAnalysisSnapshots } from './current-snapshots.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';
import type {
  SourceAnalysisClaimEdge,
  SourceAnalysisClaimHome,
  SourceAnalysisClaimLattice,
  SourceAnalysisClaimNode,
} from './claim-lattice.js';
import { SOURCE_ANALYSIS_CLAIM_LATTICE_SCHEMA_VERSION } from './claim-lattice.js';
import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
  SourceAnalysisIssue,
  SourceAnalysisOutcome,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
import { SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION } from './outcome-algebra.js';
import type {
  SourceAnalysisAnswer,
  SourceAnalysisAnswerProvenanceEntry,
  SourceAnalysisContinuationBasis,
  SourceAnalysisFocusKind,
  SourceAnalysisFocusRef,
  SourceAnalysisQuery,
  SourceAnalysisReadMode,
  SourceAnalysisWorldFrame,
} from './query-model.js';
import { SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION } from './query-model.js';
import type {
  SourceAnalysisObservationProvenance,
  SourceAnalysisSubstrateEdge,
  SourceAnalysisSubstrateGraph,
  SourceAnalysisSubstrateNode,
} from './substrate.js';
import { SOURCE_ANALYSIS_SUBSTRATE_SCHEMA_VERSION } from './substrate.js';

export interface SourceAnalysisNavigationRef {
  readonly kind: SourceAnalysisFocusKind | 'subsystem';
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

export interface SourceAnalysisNavigationValue {
  readonly title: string;
  readonly summaryLines: readonly string[];
  readonly primaryRef: SourceAnalysisNavigationRef;
  readonly relatedRefs: readonly SourceAnalysisNavigationRef[];
}

export interface SourceAnalysisNavigationEpisode {
  readonly substrate: SourceAnalysisSubstrateGraph;
  readonly lattice: SourceAnalysisClaimLattice;
  readonly answer: SourceAnalysisAnswer<SourceAnalysisNavigationValue>;
}

const NAVIGATION_HOME_IDS = {
  packageOverview: 'navigation/package-overview',
  fileNeighborhood: 'navigation/file-neighborhood',
  typeNeighborhood: 'navigation/type-neighborhood',
  exportRoute: 'navigation/export-route',
  dependency: 'navigation/dependency',
  route: 'navigation/route',
} as const;

const NAVIGATION_HOMES: readonly SourceAnalysisClaimHome[] = [
  {
    id: NAVIGATION_HOME_IDS.packageOverview,
    kind: 'observation',
    label: 'Workspace package overview',
  },
  {
    id: NAVIGATION_HOME_IDS.fileNeighborhood,
    kind: 'observation',
    label: 'Workspace file neighborhood',
  },
  {
    id: NAVIGATION_HOME_IDS.typeNeighborhood,
    kind: 'type-shape',
    label: 'Workspace type neighborhood',
  },
  {
    id: NAVIGATION_HOME_IDS.exportRoute,
    kind: 'export-surface',
    label: 'Workspace export route',
  },
  {
    id: NAVIGATION_HOME_IDS.dependency,
    kind: 'dependency',
    label: 'Workspace dependency posture',
  },
  {
    id: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    label: 'Workspace navigation route',
  },
];

export function createCurrentSourceAnalysisNavigationEpisode(
  query: SourceAnalysisQuery,
  target?: string,
  waitMs = 0,
): SourceAnalysisNavigationEpisode {
  return createSourceAnalysisNavigationEpisode(
    query,
    loadCurrentSourceAnalysisSnapshots(target, waitMs),
  );
}

export function createSourceAnalysisNavigationEpisode(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
): SourceAnalysisNavigationEpisode {
  const builder = new EpisodeBuilder(query, snapshots);
  switch (query.focusRef.kind) {
    case 'package':
      return buildPackageEpisode(builder, query.focusRef.value);
    case 'type':
      return buildTypeEpisode(builder, query.focusRef.value);
    case 'export':
      return buildExportEpisode(builder, query.focusRef.value);
    case 'file':
      return buildFileEpisode(builder, query.focusRef.value);
    default:
      return builder.finish(
        createUnsupportedAnswer(
          builder,
          query.focusRef,
          `Navigation for focus kind "${query.focusRef.kind}" is not implemented yet.`,
        ),
      );
  }
}

class EpisodeBuilder {
  readonly #query: SourceAnalysisQuery;
  readonly #snapshots: LoadedCurrentSourceAnalysisSnapshots;
  readonly #nodes = new Map<string, SourceAnalysisSubstrateNode>();
  readonly #edges = new Map<string, SourceAnalysisSubstrateEdge>();
  readonly #claims = new Map<string, SourceAnalysisClaimNode>();
  readonly #claimEdges = new Map<string, SourceAnalysisClaimEdge>();

  constructor(query: SourceAnalysisQuery, snapshots: LoadedCurrentSourceAnalysisSnapshots) {
    this.#query = query;
    this.#snapshots = snapshots;
  }

  get query(): SourceAnalysisQuery {
    return this.#query;
  }

  get snapshots(): LoadedCurrentSourceAnalysisSnapshots {
    return this.#snapshots;
  }

  addNode(node: SourceAnalysisSubstrateNode): string {
    this.#nodes.set(node.id, node);
    return node.id;
  }

  addEdge(edge: SourceAnalysisSubstrateEdge): void {
    this.#edges.set(edge.id, edge);
  }

  addClaim(claim: SourceAnalysisClaimNode): string {
    this.#claims.set(claim.id, claim);
    return claim.id;
  }

  addClaimEdge(edge: SourceAnalysisClaimEdge): void {
    this.#claimEdges.set(`${edge.kind}:${edge.from}->${edge.to}`, edge);
  }

  addSnapshotNode(kind: 'deps' | 'typerefs' | 'exports'): string {
    const snapshot = kind === 'deps'
      ? this.#snapshots.deps
      : kind === 'typerefs'
        ? this.#snapshots.typeRefs
        : this.#snapshots.exports;
    return this.addNode({
      id: `snapshot:${kind}`,
      kind: 'snapshot',
      label: `${kind} snapshot`,
      fingerprint: `${snapshot.source_commit}:${snapshot.generated_at}`,
      provenance: [{
        kind: 'snapshot-materialization',
        label: `${kind} snapshot`,
        fingerprint: snapshot.generated_at,
        detail: `source_commit=${snapshot.source_commit}`,
      }],
      attributes: {
        generatedAt: snapshot.generated_at,
        sourceCommit: snapshot.source_commit,
        analyzerCommit: snapshot.analyzer_commit,
      },
    });
  }

  addPackageNode(pkg: PackageExportsSummary): string {
    return this.addNode({
      id: `package:${pkg.package_dir}`,
      kind: 'package',
      label: pkg.package_name,
      repoRelativePath: pkg.package_dir,
      attributes: {
        packageDir: pkg.package_dir,
        exportCount: pkg.export_count,
        valueExportCount: pkg.value_export_count,
        typeOnlyExportCount: pkg.type_only_export_count,
      },
    });
  }

  addFileNode(filePath: string, label?: string): string {
    return this.addNode({
      id: `file:${filePath}`,
      kind: 'source-file',
      label: label ?? basename(filePath),
      repoRelativePath: filePath,
    });
  }

  addEntrypointNode(filePath: string): string {
    return this.addNode({
      id: `entrypoint:${filePath}`,
      kind: 'package-entrypoint',
      label: basename(filePath),
      repoRelativePath: filePath,
    });
  }

  addDeclarationNode(decl: TypeDecl): string {
    return this.addNode({
      id: `decl:${decl.file}:${decl.name}`,
      kind: 'declaration-observation',
      label: decl.name,
      repoRelativePath: decl.file,
      location: {
        repoRelativePath: decl.file,
        start: { line: decl.line, column: 1 },
      },
      attributes: {
        declarationKind: decl.kind,
        exported: decl.exported,
        refCount: decl.refs.length,
      },
    });
  }

  addExportNode(record: PackageExportRecord): string {
    return this.addNode({
      id: `export:${record.package_dir}:${record.exported_name}`,
      kind: 'export-observation',
      label: record.exported_name,
      repoRelativePath: record.declaration_file ?? record.analysis_entrypoint,
      attributes: {
        packageName: record.package_name,
        declarationFile: record.declaration_file,
        declarationLine: record.declaration_line,
        faceKind: record.face_kind,
        typeOnly: record.type_only,
      },
    });
  }

  addImportObservation(
    sourceFile: string,
    targetFile: string,
    bindings: readonly string[],
    typeOnly: boolean,
    line: number,
  ): string {
    return this.addNode({
      id: `import:${sourceFile}:${targetFile}:${line}`,
      kind: 'import-observation',
      label: `${basename(sourceFile)} imports ${basename(targetFile)}`,
      repoRelativePath: sourceFile,
      location: line > 0
        ? { repoRelativePath: sourceFile, start: { line, column: 1 } }
        : undefined,
      attributes: {
        targetFile,
        bindings: [...bindings],
        typeOnly,
      },
    });
  }

  addTypeRefObservation(
    decl: TypeDecl,
    targetName: string,
    targetFile: string,
    kind: string,
    context?: string,
  ): string {
    return this.addNode({
      id: `type-ref:${decl.file}:${decl.name}:${targetFile}:${targetName}:${kind}:${context ?? ''}`,
      kind: 'type-reference-observation',
      label: `${decl.name} -> ${targetName}`,
      repoRelativePath: decl.file,
      attributes: {
        targetName,
        targetFile,
        refKind: kind,
        context,
      },
    });
  }

  snapshotProvenance(kind: 'deps' | 'typerefs' | 'exports'): SourceAnalysisObservationProvenance {
    const snapshot = kind === 'deps'
      ? this.#snapshots.deps
      : kind === 'typerefs'
        ? this.#snapshots.typeRefs
        : this.#snapshots.exports;
    return {
      kind: 'snapshot-materialization',
      label: `${kind} snapshot`,
      fingerprint: snapshot.generated_at,
      detail: `source_commit=${snapshot.source_commit}`,
    };
  }

  finish(answer: SourceAnalysisAnswer<SourceAnalysisNavigationValue>): SourceAnalysisNavigationEpisode {
    return {
      substrate: {
        schemaVersion: SOURCE_ANALYSIS_SUBSTRATE_SCHEMA_VERSION,
        repoPath: this.#snapshots.deps.root,
        target: answer.query.worldFrame?.target ?? 'current',
        nodes: [...this.#nodes.values()],
        edges: [...this.#edges.values()],
      },
      lattice: {
        schemaVersion: SOURCE_ANALYSIS_CLAIM_LATTICE_SCHEMA_VERSION,
        homes: NAVIGATION_HOMES,
        claims: [...this.#claims.values()],
        edges: [...this.#claimEdges.values()],
      },
      answer,
    };
  }
}

function buildPackageEpisode(
  builder: EpisodeBuilder,
  packageQuery: string,
): SourceAnalysisNavigationEpisode {
  const pkgMatches = resolvePackages(builder.snapshots, packageQuery);
  if (pkgMatches.length === 0) {
    return builder.finish(createMissAnswer(
      builder,
      `No package matches "${packageQuery}".`,
      { kind: 'package', value: packageQuery },
      [],
    ));
  }
  if (pkgMatches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Package query "${packageQuery}" is ambiguous.`,
      { kind: 'package', value: packageQuery },
      pkgMatches.map((pkg) => packageRef(pkg)),
    ));
  }

  const pkg = pkgMatches[0]!;
  const depsSnapshotId = builder.addSnapshotNode('deps');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const packageNodeId = builder.addPackageNode(pkg);
  const entrypointNodeId = builder.addEntrypointNode(pkg.analysis_entrypoint);
  builder.addEdge({ id: `contains:${packageNodeId}->${entrypointNodeId}`, kind: 'contains', from: packageNodeId, to: entrypointNodeId });
  builder.addEdge({ id: `materializes:${exportsSnapshotId}->${packageNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: packageNodeId });

  const matrix = builder.snapshots.deps.coupling_matrices.find((candidate) => candidate.scope === pkg.package_dir);
  const keyExports = builder.snapshots.exports.exports
    .filter((record) => record.package_dir === pkg.package_dir && !record.type_only)
    .sort((left, right) => left.exported_name.localeCompare(right.exported_name))
    .slice(0, 5);

  const exportNodeIds = keyExports.map((record) => {
    const exportNodeId = builder.addExportNode(record);
    builder.addEdge({ id: `exports:${packageNodeId}->${exportNodeId}`, kind: 'exports', from: packageNodeId, to: exportNodeId });
    builder.addEdge({ id: `materializes:${exportsSnapshotId}->${exportNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: exportNodeId });
    return exportNodeId;
  });

  const couplingNodeIds = (matrix?.cells ?? []).map((cell) => {
    const nodeId = builder.addImportObservation(
      `${pkg.package_dir}/src/${cell.from}/index.ts`,
      `${pkg.package_dir}/src/${cell.to}/index.ts`,
      cell.bindings,
      cell.type_only_count === cell.edge_count,
      0,
    );
    builder.addEdge({ id: `materializes:${depsSnapshotId}->${nodeId}`, kind: 'materializes', from: depsSnapshotId, to: nodeId });
    builder.addEdge({ id: `contains:${packageNodeId}->${nodeId}`, kind: 'contains', from: packageNodeId, to: nodeId });
    return nodeId;
  });

  const packageClaimId = builder.addClaim({
    id: `claim:package:${pkg.package_dir}:overview`,
    homeId: NAVIGATION_HOME_IDS.packageOverview,
    kind: 'summary',
    subjectRef: pkg.package_dir,
    label: `${pkg.package_name} package overview`,
    support: {
      substrateNodeIds: [packageNodeId, entrypointNodeId, ...exportNodeIds],
    },
  });

  let dependencyClaimId: string | undefined;
  if (couplingNodeIds.length > 0) {
    dependencyClaimId = builder.addClaim({
      id: `claim:package:${pkg.package_dir}:coupling`,
      homeId: NAVIGATION_HOME_IDS.dependency,
      kind: 'derived',
      subjectRef: `${pkg.package_dir} subsystem coupling`,
      label: `${pkg.package_name} subsystem coupling`,
      support: {
        substrateNodeIds: couplingNodeIds,
      },
    });
  }

  const routeClaimId = builder.addClaim({
    id: `claim:package:${pkg.package_dir}:route`,
    homeId: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    subjectRef: `${pkg.package_dir} navigation route`,
    label: `${pkg.package_name} navigation route`,
    support: {
      upstreamClaimIds: [packageClaimId, ...(dependencyClaimId ? [dependencyClaimId] : [])],
    },
  });
  if (dependencyClaimId) {
    builder.addClaimEdge({ kind: 'depends-on', from: dependencyClaimId, to: routeClaimId });
  }
  builder.addClaimEdge({ kind: 'supports', from: packageClaimId, to: routeClaimId });

  const summaryLines = [
    `Entrypoint ${pkg.analysis_entrypoint} publishes ${pkg.value_export_count} value exports and ${pkg.type_only_export_count} type-only exports.`,
    matrix && matrix.cells.length > 0
      ? `The strongest internal navigation seam is host orchestration: ${matrix.cells.map((cell) => `${cell.from} -> ${cell.to}`).join(', ')}.`
      : `No subsystem coupling matrix was recorded for ${pkg.package_dir}.`,
    keyExports.length > 0
      ? `Representative value exports: ${keyExports.map((record) => record.exported_name).join(', ')}.`
      : 'No representative value exports were available for this package.',
  ];

  const continuations: SourceAnalysisContinuation[] = [
    continuation('join', 'Inspect the package entrypoint', pkg.analysis_entrypoint, 'package entrypoint'),
    continuation('join', 'Inspect the hosted runtime type', 'SourceAnalysisHostRuntime', 'host runtime type'),
  ];
  if (keyExports.some((record) => record.exported_name === 'createSourceAnalysisHostRuntime')) {
    continuations.push(
      continuation('route', 'Follow the public host runtime factory', 'createSourceAnalysisHostRuntime', 'public export route'),
    );
  }

  return builder.finish(createAnswer(
    builder,
    { kind: 'package', value: pkg.package_name, label: pkg.package_name },
    'hit',
    {
      title: `${pkg.package_name} package overview`,
      summaryLines,
      primaryRef: packageRef(pkg),
      relatedRefs: [
        {
          kind: 'file',
          value: pkg.analysis_entrypoint,
          label: basename(pkg.analysis_entrypoint),
          detail: 'package entrypoint',
        },
        ...keyExports.map((record) => exportRef(record)),
      ],
    },
    {
      kind: 'grounded',
      summary: 'This overview is grounded in the live deps and exports snapshots for the current workspace.',
    },
    [
      {
        kind: 'claim',
        summary: 'The package overview closes on one package-level navigation claim plus one route claim.',
        claimIds: [packageClaimId, routeClaimId, ...(dependencyClaimId ? [dependencyClaimId] : [])],
        claimHomeIds: [NAVIGATION_HOME_IDS.packageOverview, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: 'The package overview is backed by the exports snapshot and package coupling observations.',
        substrateNodeIds: [exportsSnapshotId, depsSnapshotId, packageNodeId, entrypointNodeId, ...exportNodeIds, ...couplingNodeIds],
      },
      {
        kind: 'route',
        summary: 'This answer is shaped as a package overview that suggests the next concrete implementation entrypoints.',
      },
    ],
    [],
    continuations,
    [
      snapshotProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit),
      snapshotProvenanceEntry('deps', builder.snapshots.deps.generated_at, builder.snapshots.deps.source_commit),
      claimProvenanceEntry(`${pkg.package_name} package overview`, packageClaimId),
    ],
  ));
}

function buildTypeEpisode(
  builder: EpisodeBuilder,
  typeQuery: string,
): SourceAnalysisNavigationEpisode {
  const declMatches = resolveTypeDeclarations(builder.snapshots, typeQuery);
  if (declMatches.length === 0) {
    return builder.finish(createMissAnswer(
      builder,
      `No type declaration matches "${typeQuery}".`,
      { kind: 'type', value: typeQuery },
      [],
    ));
  }
  if (declMatches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Type query "${typeQuery}" matches multiple declarations.`,
      { kind: 'type', value: typeQuery },
      declMatches.map((decl) => typeRef(decl)),
    ));
  }

  const decl = declMatches[0]!;
  const typerefsSnapshotId = builder.addSnapshotNode('typerefs');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const packageDir = packageDirForFile(decl.file);
  const pkg = packageDir
    ? builder.snapshots.exports.packages.find((candidate) => candidate.package_dir === packageDir)
    : undefined;

  const fileNodeId = builder.addFileNode(decl.file);
  const declNodeId = builder.addDeclarationNode(decl);
  builder.addEdge({ id: `declares:${fileNodeId}->${declNodeId}`, kind: 'declares', from: fileNodeId, to: declNodeId });
  builder.addEdge({ id: `materializes:${typerefsSnapshotId}->${declNodeId}`, kind: 'materializes', from: typerefsSnapshotId, to: declNodeId });

  const packageNodeId = pkg ? builder.addPackageNode(pkg) : undefined;
  if (packageNodeId) {
    builder.addEdge({ id: `contains:${packageNodeId}->${fileNodeId}`, kind: 'contains', from: packageNodeId, to: fileNodeId });
  }

  const uniqueRefs = uniqueTypeRefs(decl.refs);
  const referencedTypeNodeIds = uniqueRefs.slice(0, 6).map((ref) => {
    const nodeId = builder.addTypeRefObservation(decl, ref.target, ref.target_file, ref.kind, ref.context);
    builder.addEdge({ id: `materializes:${typerefsSnapshotId}->${nodeId}`, kind: 'materializes', from: typerefsSnapshotId, to: nodeId });
    builder.addEdge({ id: `references:${declNodeId}->${nodeId}`, kind: 'references-type', from: declNodeId, to: nodeId });
    return nodeId;
  });

  const matchingExport = builder.snapshots.exports.exports.find((record) =>
    record.declaration_name === decl.name && record.declaration_file === decl.file,
  );
  const exportNodeId = matchingExport ? builder.addExportNode(matchingExport) : undefined;
  if (exportNodeId) {
    builder.addEdge({ id: `materializes:${exportsSnapshotId}->${exportNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: exportNodeId });
    builder.addEdge({ id: `exports:${fileNodeId}->${exportNodeId}`, kind: 'exports', from: fileNodeId, to: exportNodeId });
  }

  const typeClaimId = builder.addClaim({
    id: `claim:type:${decl.file}:${decl.name}`,
    homeId: NAVIGATION_HOME_IDS.typeNeighborhood,
    kind: 'derived',
    subjectRef: `${decl.name}@${decl.file}`,
    label: `${decl.name} type neighborhood`,
    support: {
      substrateNodeIds: [fileNodeId, declNodeId, ...referencedTypeNodeIds, ...(exportNodeId ? [exportNodeId] : [])],
    },
  });

  const routeClaimId = builder.addClaim({
    id: `claim:type:${decl.file}:${decl.name}:route`,
    homeId: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    subjectRef: `${decl.name} route`,
    label: `${decl.name} navigation route`,
    support: {
      upstreamClaimIds: [typeClaimId],
    },
  });
  builder.addClaimEdge({ kind: 'supports', from: typeClaimId, to: routeClaimId });

  const summaryLines = [
    `${decl.kind} ${decl.name} is declared in ${decl.file}:${decl.line}.`,
    uniqueRefs.length > 0
      ? `It directly references ${decl.refs.length} project types, including ${uniqueRefs.slice(0, 4).map((ref) => ref.target).join(', ')}.`
      : 'It has no outbound project type references in the current snapshot.',
    matchingExport
      ? `It is also part of the public export surface for ${matchingExport.package_name}.`
      : 'It is not currently resolved as part of the package export surface.',
  ];

  return builder.finish(createAnswer(
    builder,
    { kind: 'type', value: decl.name, label: decl.name },
    'hit',
    {
      title: `${decl.name} type neighborhood`,
      summaryLines,
      primaryRef: typeRef(decl),
      relatedRefs: [
        {
          kind: 'file',
          value: decl.file,
          label: basename(decl.file),
          detail: 'declaration file',
        },
        ...(pkg ? [packageRef(pkg)] : []),
        ...uniqueRefs.slice(0, 4).map((ref) => ({
          kind: 'type' as const,
          value: ref.target,
          label: ref.target,
          detail: `${ref.kind}${ref.context ? ` (${ref.context})` : ''}`,
        })),
      ],
    },
    {
      kind: 'grounded',
      summary: 'This neighborhood is grounded in live typerefs data and, when available, the export surface snapshot.',
    },
    [
      {
        kind: 'claim',
        summary: 'The answer closes on one type-neighborhood claim and one route claim.',
        claimIds: [typeClaimId, routeClaimId],
        claimHomeIds: [NAVIGATION_HOME_IDS.typeNeighborhood, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: 'The neighborhood is backed by the declaration file, declaration observation, and direct type-reference observations.',
        substrateNodeIds: [typerefsSnapshotId, fileNodeId, declNodeId, ...referencedTypeNodeIds, ...(exportNodeId ? [exportsSnapshotId, exportNodeId] : [])],
      },
    ],
    [],
    [
      continuation('join', 'Inspect the declaration file', decl.file, 'declaration file'),
      ...uniqueRefs.slice(0, 3).map((ref) =>
        continuation('join', `Inspect ${ref.target}`, ref.target, 'referenced type'),
      ),
      ...(matchingExport
        ? [continuation('route', 'Follow the public export surface', matchingExport.exported_name, 'public export')]
        : []),
    ],
    [
      snapshotProvenanceEntry('typerefs', builder.snapshots.typeRefs.generated_at, builder.snapshots.typeRefs.source_commit),
      ...(matchingExport
        ? [snapshotProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit)]
        : []),
      claimProvenanceEntry(`${decl.name} type neighborhood`, typeClaimId),
    ],
  ));
}

function buildExportEpisode(
  builder: EpisodeBuilder,
  exportQuery: string,
): SourceAnalysisNavigationEpisode {
  const matches = resolveExports(builder.snapshots, exportQuery);
  if (matches.length === 0) {
    return builder.finish(createMissAnswer(
      builder,
      `No export matches "${exportQuery}".`,
      { kind: 'export', value: exportQuery },
      [],
    ));
  }
  if (matches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Export query "${exportQuery}" matches multiple package exports.`,
      { kind: 'export', value: exportQuery },
      matches.map((record) => exportRef(record)),
    ));
  }

  const record = matches[0]!;
  const pkg = builder.snapshots.exports.packages.find((candidate) => candidate.package_dir === record.package_dir)!;
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const packageNodeId = builder.addPackageNode(pkg);
  const exportNodeId = builder.addExportNode(record);
  builder.addEdge({ id: `exports:${packageNodeId}->${exportNodeId}`, kind: 'exports', from: packageNodeId, to: exportNodeId });
  builder.addEdge({ id: `materializes:${exportsSnapshotId}->${exportNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: exportNodeId });

  const chainFileNodeIds = record.chain.map((step) => {
    const nodeId = builder.addFileNode(step.file);
    builder.addEdge({ id: `materializes:${exportsSnapshotId}->${nodeId}:${step.line}`, kind: 'materializes', from: exportsSnapshotId, to: nodeId });
    builder.addEdge({ id: `contains:${packageNodeId}->${nodeId}`, kind: 'contains', from: packageNodeId, to: nodeId });
    return nodeId;
  });

  const exportClaimId = builder.addClaim({
    id: `claim:export:${record.package_dir}:${record.exported_name}`,
    homeId: NAVIGATION_HOME_IDS.exportRoute,
    kind: 'derived',
    subjectRef: `${record.package_name}:${record.exported_name}`,
    label: `${record.exported_name} export route`,
    support: {
      substrateNodeIds: [packageNodeId, exportNodeId, ...chainFileNodeIds],
    },
  });
  const routeClaimId = builder.addClaim({
    id: `claim:export:${record.package_dir}:${record.exported_name}:route`,
    homeId: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    subjectRef: `${record.exported_name} implementation route`,
    label: `${record.exported_name} implementation route`,
    support: {
      upstreamClaimIds: [exportClaimId],
    },
  });
  builder.addClaimEdge({ kind: 'routes-through', from: exportClaimId, to: routeClaimId });

  const declarationType = record.declaration_file
    ? builder.snapshots.typeRefs.declarations.find((decl) =>
      decl.file === record.declaration_file && decl.name === record.declaration_name,
    )
    : undefined;

  const summaryLines = [
    `${record.exported_name} is exported by ${record.package_name}.`,
    record.declaration_file
      ? `Its implementation lands in ${record.declaration_file}:${record.declaration_line ?? '?'}.`
      : 'Its implementation file could not be resolved in the current export chain.',
    `The public chain is ${record.chain.map((step) => `${basename(step.file)}:${step.kind}`).join(' -> ')}.`,
  ];

  return builder.finish(createAnswer(
    builder,
    { kind: 'export', value: record.exported_name, label: record.exported_name },
    'reroute',
    {
      title: `${record.exported_name} export route`,
      summaryLines,
      primaryRef: exportRef(record),
      relatedRefs: [
        packageRef(pkg),
        ...(record.declaration_file
          ? [{
            kind: 'file' as const,
            value: record.declaration_file,
            label: basename(record.declaration_file),
            detail: 'implementation file',
          }]
          : []),
        ...(declarationType ? [typeRef(declarationType)] : []),
      ],
    },
    {
      kind: 'grounded',
      summary: 'This route is grounded in the live export chain for the current workspace package.',
    },
    [
      {
        kind: 'claim',
        summary: 'The answer closes on one export-route claim and one route claim.',
        claimIds: [exportClaimId, routeClaimId],
        claimHomeIds: [NAVIGATION_HOME_IDS.exportRoute, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: 'The route is backed by the package export record and its chain through the public entrypoint.',
        substrateNodeIds: [exportsSnapshotId, packageNodeId, exportNodeId, ...chainFileNodeIds],
      },
      {
        kind: 'route',
        summary: 'This answer intentionally routes from a public API symbol into the owning implementation file.',
      },
    ],
    [],
    [
      ...(record.declaration_file
        ? [continuation('join', 'Open the implementation file', record.declaration_file, 'implementation file')]
        : []),
      ...(declarationType
        ? [continuation('join', 'Inspect the matching type declaration', declarationType.name, 'type declaration')]
        : []),
      continuation('join', 'Inspect the owning package', record.package_name, 'owning package'),
    ],
    [
      snapshotProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit),
      claimProvenanceEntry(`${record.exported_name} export route`, exportClaimId),
    ],
  ));
}

function buildFileEpisode(
  builder: EpisodeBuilder,
  fileQuery: string,
): SourceAnalysisNavigationEpisode {
  const matches = resolveFiles(builder.snapshots, fileQuery);
  if (matches.length === 0) {
    return builder.finish(createMissAnswer(
      builder,
      `No file matches "${fileQuery}".`,
      { kind: 'file', value: fileQuery },
      [],
    ));
  }
  if (matches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `File query "${fileQuery}" is ambiguous.`,
      { kind: 'file', value: fileQuery },
      matches.slice(0, 8).map((filePath) => ({
        kind: 'file',
        value: filePath,
        label: basename(filePath),
        detail: filePath,
      })),
    ));
  }

  const filePath = matches[0]!;
  const depsSnapshotId = builder.addSnapshotNode('deps');
  const typerefsSnapshotId = builder.addSnapshotNode('typerefs');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const fileNodeId = builder.addFileNode(filePath);
  const packageDir = packageDirForFile(filePath);
  const pkg = packageDir
    ? builder.snapshots.exports.packages.find((candidate) => candidate.package_dir === packageDir)
    : undefined;
  const packageNodeId = pkg ? builder.addPackageNode(pkg) : undefined;
  if (packageNodeId) {
    builder.addEdge({ id: `contains:${packageNodeId}->${fileNodeId}`, kind: 'contains', from: packageNodeId, to: fileNodeId });
  }

  const outboundEdges = builder.snapshots.deps.edges.filter((edge) => edge.source === filePath);
  const inboundEdges = builder.snapshots.deps.edges.filter((edge) => edge.target === filePath);
  const declarations = builder.snapshots.typeRefs.declarations.filter((decl) => decl.file === filePath);
  const exportRecords = builder.snapshots.exports.exports.filter((record) => record.declaration_file === filePath);

  const importNodeIds = outboundEdges.slice(0, 6).map((edge) => {
    const nodeId = builder.addImportObservation(edge.source, edge.target, edge.bindings, edge.type_only, edge.line);
    builder.addEdge({ id: `materializes:${depsSnapshotId}->${nodeId}`, kind: 'materializes', from: depsSnapshotId, to: nodeId });
    builder.addEdge({ id: `imports:${fileNodeId}->${nodeId}`, kind: 'imports', from: fileNodeId, to: nodeId });
    return nodeId;
  });
  const declarationNodeIds = declarations.map((decl) => {
    const nodeId = builder.addDeclarationNode(decl);
    builder.addEdge({ id: `materializes:${typerefsSnapshotId}->${nodeId}`, kind: 'materializes', from: typerefsSnapshotId, to: nodeId });
    builder.addEdge({ id: `declares:${fileNodeId}->${nodeId}`, kind: 'declares', from: fileNodeId, to: nodeId });
    return nodeId;
  });
  const exportNodeIds = exportRecords.slice(0, 6).map((record) => {
    const nodeId = builder.addExportNode(record);
    builder.addEdge({ id: `materializes:${exportsSnapshotId}->${nodeId}`, kind: 'materializes', from: exportsSnapshotId, to: nodeId });
    builder.addEdge({ id: `exports:${fileNodeId}->${nodeId}`, kind: 'exports', from: fileNodeId, to: nodeId });
    return nodeId;
  });

  const fileClaimId = builder.addClaim({
    id: `claim:file:${filePath}`,
    homeId: NAVIGATION_HOME_IDS.fileNeighborhood,
    kind: 'summary',
    subjectRef: filePath,
    label: `${basename(filePath)} file neighborhood`,
    support: {
      substrateNodeIds: [fileNodeId, ...importNodeIds, ...declarationNodeIds, ...exportNodeIds],
    },
  });
  const routeClaimId = builder.addClaim({
    id: `claim:file:${filePath}:route`,
    homeId: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    subjectRef: `${filePath} route`,
    label: `${basename(filePath)} navigation route`,
    support: {
      upstreamClaimIds: [fileClaimId],
    },
  });
  builder.addClaimEdge({ kind: 'supports', from: fileClaimId, to: routeClaimId });

  const summaryLines = [
    `${filePath} has ${outboundEdges.length} outbound imports and ${inboundEdges.length} inbound imports in the dependency graph.`,
    declarations.length > 0
      ? `It declares ${declarations.length} types: ${declarations.slice(0, 4).map((decl) => decl.name).join(', ')}.`
      : 'It does not declare any tracked project types.',
    exportRecords.length > 0
      ? `It contributes ${exportRecords.length} package exports, including ${exportRecords.slice(0, 4).map((record) => record.exported_name).join(', ')}.`
      : 'It does not directly contribute any package export records.',
  ];

  return builder.finish(createAnswer(
    builder,
    { kind: 'file', value: filePath, label: basename(filePath) },
    'hit',
    {
      title: `${basename(filePath)} file neighborhood`,
      summaryLines,
      primaryRef: {
        kind: 'file',
        value: filePath,
        label: basename(filePath),
        detail: filePath,
      },
      relatedRefs: [
        ...(pkg ? [packageRef(pkg)] : []),
        ...declarations.slice(0, 4).map((decl) => typeRef(decl)),
        ...outboundEdges.slice(0, 3).map((edge) => ({
          kind: 'file' as const,
          value: edge.target,
          label: basename(edge.target),
          detail: `imports ${edge.bindings.join(', ') || '(side effect)'}`,
        })),
      ],
    },
    {
      kind: 'grounded',
      summary: 'This file neighborhood is grounded in the live deps, typerefs, and exports snapshots.',
    },
    [
      {
        kind: 'claim',
        summary: 'The answer closes on one file-neighborhood claim and one route claim.',
        claimIds: [fileClaimId, routeClaimId],
        claimHomeIds: [NAVIGATION_HOME_IDS.fileNeighborhood, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: 'The neighborhood is backed by the file node, import observations, declarations, and export observations.',
        substrateNodeIds: [depsSnapshotId, typerefsSnapshotId, exportsSnapshotId, fileNodeId, ...importNodeIds, ...declarationNodeIds, ...exportNodeIds],
      },
    ],
    [],
    [
      ...declarations.slice(0, 3).map((decl) => continuation('join', `Inspect ${decl.name}`, decl.name, 'declared type')),
      ...outboundEdges.slice(0, 2).map((edge) => continuation('join', `Follow ${basename(edge.target)}`, edge.target, 'imported file')),
      ...(pkg ? [continuation('join', 'Inspect the owning package', pkg.package_name, 'owning package')] : []),
    ],
    [
      snapshotProvenanceEntry('deps', builder.snapshots.deps.generated_at, builder.snapshots.deps.source_commit),
      snapshotProvenanceEntry('typerefs', builder.snapshots.typeRefs.generated_at, builder.snapshots.typeRefs.source_commit),
      snapshotProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit),
      claimProvenanceEntry(`${basename(filePath)} file neighborhood`, fileClaimId),
    ],
  ));
}

function createAnswer(
  builder: EpisodeBuilder,
  focusRef: SourceAnalysisFocusRef,
  tag: SourceAnalysisOutcome<SourceAnalysisNavigationValue>['tag'],
  value: SourceAnalysisNavigationValue,
  trust: SourceAnalysisTrustProfile,
  closureBasis: readonly SourceAnalysisClosureBasis[],
  issues: readonly SourceAnalysisIssue[],
  continuations: readonly SourceAnalysisContinuation[],
  provenance: readonly SourceAnalysisAnswerProvenanceEntry[],
): SourceAnalysisAnswer<SourceAnalysisNavigationValue> {
  const readMode = defaultReadMode(focusRef.kind, builder.query.questionRoute);
  const worldFrame = defaultWorldFrame(builder.snapshots, builder.query.worldFrame);
  const continuationBasis: SourceAnalysisContinuationBasis = {
    focusRef,
    questionRoute: builder.query.questionRoute,
    readMode,
    worldFrame,
    governingAnchorRefs: value.relatedRefs.map((ref) => ref.value).slice(0, 4),
  };

  const outcome: SourceAnalysisOutcome<SourceAnalysisNavigationValue> = {
    schemaVersion: SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION,
    tag,
    summary: value.summaryLines[0] ?? value.title,
    trust,
    value,
    closureBasis,
    issues,
    continuations,
  };

  return {
    schemaVersion: SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION,
    query: {
      inquiryEpisode: builder.query.inquiryEpisode ?? 'orient-and-localize',
      focusRef,
      questionRoute: builder.query.questionRoute,
      readMode,
      worldFrame,
      requestedSlotIds: builder.query.requestedSlotIds,
      continuationBasis: builder.query.continuationBasis ?? continuationBasis,
    },
    slots: {
      focus_ref: focusRef,
      question_route: builder.query.questionRoute,
      read_mode: readMode,
      world_frame: worldFrame,
      outcome,
      closure_basis: closureBasis,
      provenance,
      continuation_basis: continuationBasis,
      delta: {
        kind: 'none',
        count: 0,
        affectedRefs: [],
      },
    },
    outcome,
  };
}

function createMissAnswer(
  builder: EpisodeBuilder,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisNavigationRef[],
): SourceAnalysisAnswer<SourceAnalysisNavigationValue> {
  return createAnswer(
    builder,
    focusRef,
    'miss-unknown-shape',
    {
      title: 'Workspace navigation miss',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
    },
    {
      kind: 'unavailable',
      summary: 'No grounded workspace navigation target closed for this focus.',
    },
    [{
      kind: 'route',
      summary: 'No package, file, type, or export in the current snapshots matched the requested focus.',
    }],
    [{
      code: 'navigation-miss',
      message,
      severity: 'info',
      origin: 'shape',
    }],
    [],
    [],
  );
}

function createAmbiguousAnswer(
  builder: EpisodeBuilder,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisNavigationRef[],
): SourceAnalysisAnswer<SourceAnalysisNavigationValue> {
  return createAnswer(
    builder,
    focusRef,
    'ambiguous',
    {
      title: 'Workspace navigation ambiguity',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
    },
    {
      kind: 'qualified',
      summary: 'Multiple grounded workspace targets match the current focus.',
    },
    [{
      kind: 'route',
      summary: 'The current focus needs one more narrowing step before a single navigation route is honest.',
    }],
    [{
      code: 'navigation-ambiguous',
      message,
      severity: 'warning',
      origin: 'query',
    }],
    relatedRefs.slice(0, 4).map((ref) => continuation('join', `Inspect ${ref.label}`, ref.value, ref.detail ?? 'narrowing move')),
    [],
  );
}

function createUnsupportedAnswer(
  builder: EpisodeBuilder,
  focusRef: SourceAnalysisFocusRef,
  message: string,
): SourceAnalysisAnswer<SourceAnalysisNavigationValue> {
  return createAnswer(
    builder,
    focusRef,
    'unsupported',
    {
      title: 'Workspace navigation unsupported',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs: [],
    },
    {
      kind: 'unavailable',
      summary: 'This focus kind is not implemented by the current live navigator.',
    },
    [{
      kind: 'route',
      summary: 'The live navigator currently supports package, file, type, and export focuses.',
    }],
    [{
      code: 'navigation-unsupported',
      message,
      severity: 'warning',
      origin: 'query',
    }],
    [],
    [],
  );
}

function resolvePackages(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly PackageExportsSummary[] {
  const normalized = query.toLowerCase();
  const exact = snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase() === normalized ||
    pkg.package_dir.toLowerCase() === normalized,
  );
  if (exact.length > 0) return exact;

  const shortMatches = snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.split('/').at(-1)?.toLowerCase() === normalized ||
    pkg.package_dir.split('/').at(-1)?.toLowerCase() === normalized,
  );
  if (shortMatches.length > 0) return shortMatches;

  return snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase().includes(normalized) ||
    pkg.package_dir.toLowerCase().includes(normalized),
  );
}

function resolveTypeDeclarations(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly TypeDecl[] {
  const exact = snapshots.typeRefs.declarations.filter((decl) => decl.name === query);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.typeRefs.declarations.filter((decl) =>
    decl.name.toLowerCase() === query.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.typeRefs.declarations.filter((decl) =>
    decl.name.toLowerCase().includes(query.toLowerCase()),
  );
}

function resolveExports(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly PackageExportRecord[] {
  const exact = snapshots.exports.exports.filter((record) => record.exported_name === query);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.exports.exports.filter((record) =>
    record.exported_name.toLowerCase() === query.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.exports.exports.filter((record) =>
    record.exported_name.toLowerCase().includes(query.toLowerCase()),
  );
}

function resolveFiles(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly string[] {
  const allFiles = new Set<string>();
  for (const edge of snapshots.deps.edges) {
    allFiles.add(edge.source);
    allFiles.add(edge.target);
  }
  for (const decl of snapshots.typeRefs.declarations) {
    allFiles.add(decl.file);
  }
  for (const record of snapshots.exports.exports) {
    if (record.declaration_file) allFiles.add(record.declaration_file);
    allFiles.add(record.analysis_entrypoint);
    for (const step of record.chain) {
      allFiles.add(step.file);
    }
  }

  if (allFiles.has(query)) {
    return [query];
  }

  const suffixMatches = [...allFiles].filter((filePath) => filePath.endsWith(query));
  if (suffixMatches.length > 0) {
    return suffixMatches.sort();
  }

  return [...allFiles].filter((filePath) =>
    filePath.toLowerCase().includes(query.toLowerCase()),
  ).sort();
}

function uniqueTypeRefs(refs: readonly TypeDecl['refs'][number][]): readonly TypeDecl['refs'][number][] {
  const seen = new Set<string>();
  const unique: TypeDecl['refs'][number][] = [];
  for (const ref of refs) {
    const key = `${ref.target}\0${ref.target_file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

function packageDirForFile(filePath: string): string | null {
  const parts = filePath.split('/');
  if (parts[0] === 'packages' && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return null;
}

function packageRef(pkg: PackageExportsSummary): SourceAnalysisNavigationRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    detail: pkg.package_dir,
  };
}

function typeRef(decl: TypeDecl): SourceAnalysisNavigationRef {
  return {
    kind: 'type',
    value: decl.name,
    label: decl.name,
    detail: `${decl.file}:${decl.line}`,
  };
}

function exportRef(record: PackageExportRecord): SourceAnalysisNavigationRef {
  return {
    kind: 'export',
    value: record.exported_name,
    label: record.exported_name,
    detail: record.package_name,
  };
}

function defaultWorldFrame(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  worldFrame: SourceAnalysisWorldFrame | undefined,
): SourceAnalysisWorldFrame {
  return {
    repoPath: worldFrame?.repoPath ?? snapshots.deps.root,
    target: worldFrame?.target ?? 'current',
    regimeAnchor: worldFrame?.regimeAnchor ?? 'hosted',
    partiality: worldFrame?.partiality ?? 'complete',
    freshness: worldFrame?.freshness ?? 'snapshot',
  };
}

function defaultReadMode(
  focusKind: SourceAnalysisFocusKind,
  questionRoute: SourceAnalysisQuery['questionRoute'],
): SourceAnalysisReadMode {
  if (questionRoute === 'route') return 'focus-card';
  if (focusKind === 'package') return 'summary-card';
  if (focusKind === 'file') return 'supporting-evidence';
  return 'focus-card';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function continuation(
  targetQuestionRoute: SourceAnalysisQuery['questionRoute'],
  label: string,
  targetFocusRef: string,
  detail: string,
): SourceAnalysisContinuation {
  return {
    kind: targetQuestionRoute === 'route' ? 'reroute' : 'inspect-support',
    label,
    description: detail,
    targetQuestionRoute,
    targetFocusRef,
  };
}

function snapshotProvenanceEntry(
  kind: 'deps' | 'typerefs' | 'exports',
  generatedAt: string,
  sourceCommit: string,
): SourceAnalysisAnswerProvenanceEntry {
  return {
    kind: 'snapshot',
    label: `${kind} snapshot`,
    ref: generatedAt,
    detail: `source_commit=${sourceCommit}`,
  };
}

function claimProvenanceEntry(label: string, claimId: string): SourceAnalysisAnswerProvenanceEntry {
  return {
    kind: 'claim',
    label,
    ref: claimId,
  };
}
