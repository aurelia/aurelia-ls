import {
  coerceAnalysisViews,
  loadCurrentAnalysisViews,
  type AnalysisViews,
} from './analysis-views.js';
import {
  createAnalysisProvenanceEntry,
  defaultWorldFrameForAnalysis,
  describeAnalysisSurface,
  describeAnalysisSurfaceEvidence,
} from './analysis-surface.js';
import type { LoadedCurrentSnapshotSet } from './current-snapshots.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import { inspectFocusedStructuralPath } from './focused-structural-path.js';
import type { AnswerCard, AnswerRef } from './answer-card.js';
import {
  createStructuredAnswerCard,
} from './answer-card.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import { resolveInquiryPolicy, type InquiryPolicy } from './inquiry-policy.js';
import type {
  ClaimEdge,
  ClaimHome,
  ClaimLattice,
  ClaimNode,
} from './claim-lattice.js';
import { CLAIM_LATTICE_SCHEMA_VERSION } from './claim-lattice.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  TrustProfile,
} from './outcome-algebra.js';
import type {
  InquiryAnswer,
  InquiryProvenanceEntry,
  FocusKind,
  FocusRef,
  Inquiry,
  ReadMode,
  WorldFrame,
} from './inquiry-model.js';
import type {
  ObservationProvenance,
  SubstrateEdge,
  SubstrateGraph,
  SubstrateNode,
} from './substrate.js';
import { SUBSTRATE_SCHEMA_VERSION } from './substrate.js';

export type NavigationRef = AnswerRef;

export type NavigationValue = AnswerCard<NavigationRef>;

export interface NavigationEpisode {
  readonly substrate: SubstrateGraph;
  readonly lattice: ClaimLattice;
  readonly answer: InquiryAnswer<NavigationValue>;
}

const NAVIGATION_HOME_IDS = {
  packageOverview: 'navigation/package-overview',
  fileNeighborhood: 'navigation/file-neighborhood',
  typeNeighborhood: 'navigation/type-neighborhood',
  exportRoute: 'navigation/export-route',
  dependency: 'navigation/dependency',
  route: 'navigation/route',
} as const;

const NAVIGATION_HOMES: readonly ClaimHome[] = [
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

export function createCurrentNavigationEpisode(
  query: Inquiry,
  target?: string,
  waitMs = 0,
): NavigationEpisode {
  return createNavigationEpisode(
    query,
    loadCurrentAnalysisViews(target, waitMs),
  );
}

export function createNavigationEpisode(
  query: Inquiry,
  snapshotsInput: AnalysisViews | LoadedCurrentSnapshotSet,
): NavigationEpisode {
  const snapshots = coerceAnalysisViews(snapshotsInput);
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
  readonly #query: Inquiry;
  readonly #snapshots: AnalysisViews;
  readonly #nodes = new Map<string, SubstrateNode>();
  readonly #edges = new Map<string, SubstrateEdge>();
  readonly #claims = new Map<string, ClaimNode>();
  readonly #claimEdges = new Map<string, ClaimEdge>();

  constructor(query: Inquiry, snapshots: AnalysisViews) {
    this.#query = query;
    this.#snapshots = snapshots;
  }

  get query(): Inquiry {
    return this.#query;
  }

  get snapshots(): AnalysisViews {
    return this.#snapshots;
  }

  addNode(node: SubstrateNode): string {
    this.#nodes.set(node.id, node);
    return node.id;
  }

  addEdge(edge: SubstrateEdge): void {
    this.#edges.set(edge.id, edge);
  }

  addClaim(claim: ClaimNode): string {
    this.#claims.set(claim.id, claim);
    return claim.id;
  }

  addClaimEdge(edge: ClaimEdge): void {
    this.#claimEdges.set(`${edge.kind}:${edge.from}->${edge.to}`, edge);
  }

  addSnapshotNode(kind: 'deps' | 'typerefs' | 'exports'): string {
    const snapshot = kind === 'deps'
      ? this.#snapshots.deps
      : kind === 'typerefs'
        ? this.#snapshots.typeRefs
        : this.#snapshots.exports;
    const label = `${kind} ${this.#snapshots.source === 'hosted-analysis' ? 'analysis view' : 'snapshot'}`;
    return this.addNode({
      id: `snapshot:${kind}`,
      kind: 'snapshot',
      label,
      fingerprint: `${snapshot.source_commit}:${snapshot.generated_at}`,
      provenance: [{
        kind: this.#snapshots.source === 'hosted-analysis'
          ? 'analysis-session'
          : 'snapshot-materialization',
        label,
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

  snapshotProvenance(kind: 'deps' | 'typerefs' | 'exports'): ObservationProvenance {
    const snapshot = kind === 'deps'
      ? this.#snapshots.deps
      : kind === 'typerefs'
        ? this.#snapshots.typeRefs
        : this.#snapshots.exports;
    return {
      kind: this.#snapshots.source === 'hosted-analysis'
        ? 'analysis-session'
        : 'snapshot-materialization',
      label: `${kind} ${this.#snapshots.source === 'hosted-analysis' ? 'analysis view' : 'snapshot'}`,
      fingerprint: snapshot.generated_at,
      detail: `source_commit=${snapshot.source_commit}`,
    };
  }

  finish(answer: InquiryAnswer<NavigationValue>): NavigationEpisode {
    return {
      substrate: {
        schemaVersion: SUBSTRATE_SCHEMA_VERSION,
        repoPath: this.#snapshots.root,
        target: answer.query.worldFrame?.target ?? 'current',
        nodes: [...this.#nodes.values()],
        edges: [...this.#edges.values()],
      },
      lattice: {
        schemaVersion: CLAIM_LATTICE_SCHEMA_VERSION,
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
): NavigationEpisode {
  const normalizedPackageQuery = trimTrailingFocusPunctuation(packageQuery);
  const posture = inspectAnalyzabilityPostureFromAnalysisViews(builder.snapshots);
  const requestedRegimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: normalizedPackageQuery,
    queryHints: [normalizedPackageQuery],
  });
  const pkgMatches = resolvePackages(builder.snapshots, normalizedPackageQuery);
  if (pkgMatches.length === 0) {
    if (requestedRegimeContext.directlyExcludedFrontier) {
      return builder.finish(createOpenBoundaryAnswer(
        builder,
        `${normalizedPackageQuery} falls under excluded frontier ${requestedRegimeContext.directlyExcludedFrontier.prefix}, so workspace navigation cannot close on it inside the current profile.`,
        { kind: 'package', value: normalizedPackageQuery },
        [],
        requestedRegimeContext,
      ));
    }
    return builder.finish(createMissAnswer(
      builder,
      `No package matches "${normalizedPackageQuery}".`,
      { kind: 'package', value: normalizedPackageQuery },
      [],
    ));
  }
  if (pkgMatches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Package query "${normalizedPackageQuery}" is ambiguous.`,
      { kind: 'package', value: normalizedPackageQuery },
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

  const regimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: pkg.package_name,
    pathPrefixes: [pkg.package_dir],
    queryHints: [pkg.package_name, pkg.package_dir, normalizedPackageQuery],
  });

  const summaryLines = [
    `Entrypoint ${pkg.analysis_entrypoint} publishes ${pkg.value_export_count} value exports and ${pkg.type_only_export_count} type-only exports.`,
    matrix && matrix.cells.length > 0
      ? `The strongest internal navigation seam is host orchestration: ${matrix.cells.map((cell) => `${cell.from} -> ${cell.to}`).join(', ')}.`
      : `No subsystem coupling matrix was recorded for ${pkg.package_dir}.`,
    keyExports.length > 0
      ? `Representative value exports: ${keyExports.map((record) => record.exported_name).join(', ')}.`
      : 'No representative value exports were available for this package.',
    ...regimeContext.lines,
  ];

  const continuations: Continuation[] = [
    continuation('join', 'Inspect the package entrypoint', pkg.analysis_entrypoint, 'package entrypoint'),
    continuation('join', 'Inspect the host runtime type', 'SnapshotHostRuntime', 'host runtime type'),
  ];
  if (keyExports.some((record) => record.exported_name === 'createSnapshotHostRuntime')) {
    continuations.push(
      continuation('route', 'Follow the public host runtime factory', 'createSnapshotHostRuntime', 'public export route'),
    );
  }
  const policy = policyForNavigation(builder, 'package');
  const relatedRefs = [
    {
      kind: 'file' as const,
      value: pkg.analysis_entrypoint,
      label: basename(pkg.analysis_entrypoint),
      detail: 'package entrypoint',
    },
    ...keyExports.map((record) => exportRef(record)),
  ];

  return builder.finish(createAnswer(
    builder,
    policy,
    { kind: 'package', value: pkg.package_name, label: pkg.package_name },
    regimeContext.tag === 'open-boundary' ? 'open-boundary' : 'hit',
    createStructuredAnswerCard({
      title: `${pkg.package_name} package overview`,
      primaryRef: packageRef(pkg),
      relatedRefs,
      document: createNavigationDocument(summaryLines, relatedRefs, [
        { label: 'value exports', value: String(pkg.value_export_count) },
        { label: 'type-only exports', value: String(pkg.type_only_export_count) },
        { label: 'coupling cells', value: String(matrix?.cells.length ?? 0) },
        ...regimeContext.facts,
      ]),
      policy,
    }),
    mergeTrustProfiles(
      {
        kind: 'grounded',
        summary: `This overview is grounded in the ${describeAnalysisSurfaceEvidence(builder.query.worldFrame?.freshness, ['deps', 'exports'])} for the current workspace.`,
      },
      regimeContext.trust,
    ),
    [
      {
        kind: 'claim',
        summary: 'The package overview closes on one package-level navigation claim plus one route claim.',
        claimIds: [packageClaimId, routeClaimId, ...(dependencyClaimId ? [dependencyClaimId] : [])],
        claimHomeIds: [NAVIGATION_HOME_IDS.packageOverview, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: builder.query.worldFrame?.freshness === 'live'
          ? 'The package overview is backed by the live exports analysis view and package coupling observations.'
          : 'The package overview is backed by the exports analysis view and package coupling observations.',
        substrateNodeIds: [exportsSnapshotId, depsSnapshotId, packageNodeId, entrypointNodeId, ...exportNodeIds, ...couplingNodeIds],
      },
      {
        kind: 'route',
        summary: 'This answer is shaped as a package overview that suggests the next concrete implementation entrypoints.',
      },
      ...regimeContext.closureBasis,
    ],
    regimeContext.issues,
    [...continuations, ...regimeContext.continuations],
    [
      createAnalysisProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit, builder.query.worldFrame?.freshness),
      createAnalysisProvenanceEntry('deps', builder.snapshots.deps.generated_at, builder.snapshots.deps.source_commit, builder.query.worldFrame?.freshness),
      claimProvenanceEntry(`${pkg.package_name} package overview`, packageClaimId),
      ...regimeContext.provenance,
    ],
  ));
}

function buildTypeEpisode(
  builder: EpisodeBuilder,
  typeQuery: string,
): NavigationEpisode {
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
      : `It has no outbound project type references in the ${describeAnalysisSurface(builder.query.worldFrame?.freshness)}.`,
    matchingExport
      ? `It is also part of the public export surface for ${matchingExport.package_name}.`
      : 'It is not currently resolved as part of the package export surface.',
  ];
  const policy = policyForNavigation(builder, 'type');
  const relatedRefs = [
    {
      kind: 'file' as const,
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
  ];

  return builder.finish(createAnswer(
    builder,
    policy,
    { kind: 'type', value: decl.name, label: decl.name },
    'hit',
    createStructuredAnswerCard({
      title: `${decl.name} type neighborhood`,
      primaryRef: typeRef(decl),
      relatedRefs,
      document: createNavigationDocument(summaryLines, relatedRefs, [
        { label: 'type refs', value: String(uniqueRefs.length) },
        { label: 'public export', value: matchingExport ? 'yes' : 'no' },
      ]),
      policy,
    }),
      {
        kind: 'grounded',
        summary: builder.query.worldFrame?.freshness === 'live'
          ? 'This neighborhood is grounded in live typerefs data and, when available, the live export surface view.'
          : 'This neighborhood is grounded in live typerefs data and, when available, the export surface analysis view.',
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
      createAnalysisProvenanceEntry('typerefs', builder.snapshots.typeRefs.generated_at, builder.snapshots.typeRefs.source_commit, builder.query.worldFrame?.freshness),
      ...(matchingExport
        ? [createAnalysisProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit, builder.query.worldFrame?.freshness)]
        : []),
      claimProvenanceEntry(`${decl.name} type neighborhood`, typeClaimId),
    ],
  ));
}

function buildExportEpisode(
  builder: EpisodeBuilder,
  exportQuery: string,
): NavigationEpisode {
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
  const policy = policyForNavigation(builder, 'export');
  const relatedRefs = [
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
  ];

  return builder.finish(createAnswer(
    builder,
    policy,
    { kind: 'export', value: record.exported_name, label: record.exported_name },
    'reroute',
    createStructuredAnswerCard({
      title: `${record.exported_name} export route`,
      primaryRef: exportRef(record),
      relatedRefs,
      document: createNavigationDocument(summaryLines, relatedRefs, [
        { label: 'chain length', value: String(record.chain.length) },
        { label: 'type-only', value: record.type_only ? 'yes' : 'no' },
      ]),
      policy,
    }),
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
      createAnalysisProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit, builder.query.worldFrame?.freshness),
      claimProvenanceEntry(`${record.exported_name} export route`, exportClaimId),
    ],
  ));
}

function buildFileEpisode(
  builder: EpisodeBuilder,
  fileQuery: string,
): NavigationEpisode {
  const normalizedFileQuery = trimTrailingFocusPunctuation(fileQuery);
  const posture = inspectAnalyzabilityPostureFromAnalysisViews(builder.snapshots);
  const requestedRegimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: normalizedFileQuery,
    pathPrefixes: [normalizedFileQuery],
    queryHints: [normalizedFileQuery],
  });
  const matches = resolveFiles(builder.snapshots, normalizedFileQuery);
  if (matches.length === 0) {
    if (requestedRegimeContext.directlyExcludedFrontier) {
      return builder.finish(createOpenBoundaryAnswer(
        builder,
        `${normalizedFileQuery} falls under excluded frontier ${requestedRegimeContext.directlyExcludedFrontier.prefix}, so workspace navigation cannot close on it inside the current profile.`,
        { kind: 'file', value: normalizedFileQuery },
        [],
        requestedRegimeContext,
      ));
    }
    return builder.finish(createMissAnswer(
      builder,
      `No file matches "${normalizedFileQuery}".`,
      { kind: 'file', value: normalizedFileQuery },
      [],
    ));
  }
  if (matches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `File query "${normalizedFileQuery}" is ambiguous.`,
      { kind: 'file', value: normalizedFileQuery },
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

  const regimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: filePath,
    pathPrefixes: [filePath],
    queryHints: [normalizedFileQuery, filePath],
  });
  const structuralPathContext = inspectFocusedStructuralPath(builder.snapshots, filePath);

  const summaryLines = [
    `${filePath} has ${outboundEdges.length} outbound imports and ${inboundEdges.length} inbound imports in the dependency graph.`,
    declarations.length > 0
      ? `It declares ${declarations.length} types: ${declarations.slice(0, 4).map((decl) => decl.name).join(', ')}.`
      : 'It does not declare any tracked project types.',
    exportRecords.length > 0
      ? `It contributes ${exportRecords.length} package exports, including ${exportRecords.slice(0, 4).map((record) => record.exported_name).join(', ')}.`
      : 'It does not directly contribute any package export records.',
    ...regimeContext.lines,
    ...(structuralPathContext?.lines ?? []),
  ];
  const policy = policyForNavigation(builder, 'file');
  const relatedRefs = [
    ...(pkg ? [packageRef(pkg)] : []),
    ...declarations.slice(0, 4).map((decl) => typeRef(decl)),
    ...outboundEdges.slice(0, 3).map((edge) => ({
      kind: 'file' as const,
      value: edge.target,
      label: basename(edge.target),
      detail: `imports ${edge.bindings.join(', ') || '(side effect)'}`,
    })),
  ];

  return builder.finish(createAnswer(
    builder,
    policy,
    { kind: 'file', value: filePath, label: basename(filePath) },
    regimeContext.tag === 'open-boundary' || structuralPathContext?.tag === 'open-boundary'
      ? 'open-boundary'
      : 'hit',
    createStructuredAnswerCard({
      title: `${basename(filePath)} file neighborhood`,
      primaryRef: {
        kind: 'file',
        value: filePath,
        label: basename(filePath),
        detail: filePath,
      },
      relatedRefs,
      document: createNavigationDocument(summaryLines, relatedRefs, [
        { label: 'outbound imports', value: String(outboundEdges.length) },
        { label: 'inbound imports', value: String(inboundEdges.length) },
        { label: 'declared types', value: String(declarations.length) },
        { label: 'package exports', value: String(exportRecords.length) },
        ...regimeContext.facts,
        ...(structuralPathContext?.facts ?? []),
      ]),
      policy,
    }),
    mergeTrustProfiles(
      mergeTrustProfiles({
        kind: 'grounded',
        summary: `This file neighborhood is grounded in the ${describeAnalysisSurfaceEvidence(builder.query.worldFrame?.freshness, ['deps', 'typerefs', 'exports'])}.`,
      }, structuralPathContext?.trust ?? null),
      regimeContext.trust,
    ),
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
      ...regimeContext.closureBasis,
      ...(structuralPathContext?.closureBasis ?? []),
    ],
    [...regimeContext.issues, ...(structuralPathContext?.issues ?? [])],
    [
      ...declarations.slice(0, 3).map((decl) => continuation('join', `Inspect ${decl.name}`, decl.name, 'declared type')),
      ...outboundEdges.slice(0, 2).map((edge) => continuation('join', `Follow ${basename(edge.target)}`, edge.target, 'imported file')),
      ...(pkg ? [continuation('join', 'Inspect the owning package', pkg.package_name, 'owning package')] : []),
      ...regimeContext.continuations,
    ],
    [
      createAnalysisProvenanceEntry('deps', builder.snapshots.deps.generated_at, builder.snapshots.deps.source_commit, builder.query.worldFrame?.freshness),
      createAnalysisProvenanceEntry('typerefs', builder.snapshots.typeRefs.generated_at, builder.snapshots.typeRefs.source_commit, builder.query.worldFrame?.freshness),
      createAnalysisProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit, builder.query.worldFrame?.freshness),
      claimProvenanceEntry(`${basename(filePath)} file neighborhood`, fileClaimId),
      ...regimeContext.provenance,
      ...(structuralPathContext?.provenance ?? []),
    ],
  ));
}

function createAnswer(
  builder: EpisodeBuilder,
  policy: InquiryPolicy,
  focusRef: FocusRef,
  tag: InquiryAnswer<NavigationValue>['outcome']['tag'],
  value: NavigationValue,
  trust: TrustProfile,
  closureBasis: readonly ClosureBasis[],
  issues: readonly Issue[],
  continuations: readonly Continuation[],
  provenance: readonly InquiryProvenanceEntry[],
): InquiryAnswer<NavigationValue> {
  const worldFrame = defaultWorldFrameForAnalysis(builder.snapshots, builder.query.worldFrame);
  return createAnswerEnvelope({
    query: builder.query,
    focusRef,
    inquiryEpisode: policy.inquiryEpisode,
    readMode: policy.readMode,
    worldFrame,
    tag,
    value,
    trust,
    closureBasis,
    issues,
    continuations: continuations.slice(0, policy.limits.continuationCount),
    provenance,
  });
}

function createMissAnswer(
  builder: EpisodeBuilder,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly NavigationRef[],
): InquiryAnswer<NavigationValue> {
  const policy = policyForNavigation(builder, focusRef.kind);
  return createAnswer(
    builder,
    policy,
    focusRef,
    'miss-unknown-shape',
    createStructuredAnswerCard({
      title: 'Workspace navigation miss',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createNavigationDocument([message], relatedRefs),
      policy,
    }),
    {
      kind: 'unavailable',
      summary: 'No grounded workspace navigation target closed for this focus.',
    },
    [{
      kind: 'route',
      summary: 'No package, file, type, or export in the current analysis matched the requested focus.',
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
  focusRef: FocusRef,
  relatedRefs: readonly NavigationRef[],
): InquiryAnswer<NavigationValue> {
  const policy = policyForNavigation(builder, focusRef.kind);
  return createAnswer(
    builder,
    policy,
    focusRef,
    'ambiguous',
    createStructuredAnswerCard({
      title: 'Workspace navigation ambiguity',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createNavigationDocument([message], relatedRefs),
      policy,
    }),
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

function createOpenBoundaryAnswer(
  builder: EpisodeBuilder,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly NavigationRef[],
  regimeContext: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
): InquiryAnswer<NavigationValue> {
  const policy = policyForNavigation(builder, focusRef.kind);
  return createAnswer(
    builder,
    policy,
    focusRef,
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Workspace navigation boundary',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createNavigationDocument(
        [message, ...regimeContext.lines.slice(1)],
        relatedRefs,
        regimeContext.facts,
      ),
      policy,
    }),
    regimeContext.trust ?? {
      kind: 'frontier',
      summary: 'The requested focus sits outside the included regime.',
    },
    regimeContext.closureBasis,
    regimeContext.issues,
    regimeContext.continuations,
    regimeContext.provenance,
  );
}

function createUnsupportedAnswer(
  builder: EpisodeBuilder,
  focusRef: FocusRef,
  message: string,
): InquiryAnswer<NavigationValue> {
  const policy = policyForNavigation(builder, focusRef.kind);
  return createAnswer(
    builder,
    policy,
    focusRef,
    'unsupported',
    createStructuredAnswerCard({
      title: 'Workspace navigation unsupported',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs: [],
      document: createNavigationDocument([message], []),
      policy,
    }),
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
  snapshots: AnalysisViews,
  query: string,
): readonly PackageExportsSummary[] {
  const normalized = trimTrailingFocusPunctuation(query).toLowerCase();
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
  snapshots: AnalysisViews,
  query: string,
): readonly TypeDecl[] {
  const normalized = trimTrailingFocusPunctuation(query);
  const exact = snapshots.typeRefs.declarations.filter((decl) => decl.name === normalized);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.typeRefs.declarations.filter((decl) =>
    decl.name.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.typeRefs.declarations.filter((decl) =>
    decl.name.toLowerCase().includes(normalized.toLowerCase()),
  );
}

function resolveExports(
  snapshots: AnalysisViews,
  query: string,
): readonly PackageExportRecord[] {
  const normalized = trimTrailingFocusPunctuation(query);
  const exact = snapshots.exports.exports.filter((record) => record.exported_name === normalized);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.exports.exports.filter((record) =>
    record.exported_name.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.exports.exports.filter((record) =>
    record.exported_name.toLowerCase().includes(normalized.toLowerCase()),
  );
}

function resolveFiles(
  snapshots: AnalysisViews,
  query: string,
): readonly string[] {
  const normalized = trimTrailingFocusPunctuation(query).replace(/\\/g, '/');
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

  if (allFiles.has(normalized)) {
    return [normalized];
  }

  const suffixMatches = [...allFiles].filter((filePath) => filePath.endsWith(normalized));
  if (suffixMatches.length > 0) {
    return suffixMatches.sort();
  }

  return [...allFiles].filter((filePath) =>
    filePath.toLowerCase().includes(normalized.toLowerCase()),
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

function packageRef(pkg: PackageExportsSummary): NavigationRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    detail: pkg.package_dir,
  };
}

function typeRef(decl: TypeDecl): NavigationRef {
  return {
    kind: 'type',
    value: decl.name,
    label: decl.name,
    detail: `${decl.file}:${decl.line}`,
  };
}

function exportRef(record: PackageExportRecord): NavigationRef {
  return {
    kind: 'export',
    value: record.exported_name,
    label: record.exported_name,
    detail: record.package_name,
  };
}

function policyForNavigation(
  builder: EpisodeBuilder,
  focusKind: FocusKind,
): InquiryPolicy {
  return resolveInquiryPolicy(builder.query, {
    focusKind,
    inquiryEpisode: 'orient-and-localize',
    readMode: defaultReadMode(focusKind, builder.query.questionRoute),
  });
}

function createNavigationDocument(
  summaryLines: readonly string[],
  relatedRefs: readonly NavigationRef[],
  facts: readonly { readonly label: string; readonly value: string }[] = [],
) {
  return createAnswerDocument<NavigationRef>([
    {
      kind: 'paragraph',
      importance: 'primary',
      lines: summaryLines,
    },
    ...(facts.length > 0
      ? [{
        kind: 'key-fact-list' as const,
        importance: 'supporting' as const,
        facts,
      }]
      : []),
    ...(relatedRefs.length > 0
      ? [{
        kind: 'ref-list' as const,
        importance: 'detail' as const,
        refs: relatedRefs,
      }]
      : []),
  ]);
}

function defaultReadMode(
  focusKind: FocusKind,
  questionRoute: Inquiry['questionRoute'],
): ReadMode {
  if (questionRoute === 'route') return 'focus-card';
  if (focusKind === 'package') return 'summary-card';
  if (focusKind === 'file') return 'supporting-evidence';
  return 'focus-card';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function continuation(
  targetQuestionRoute: Inquiry['questionRoute'],
  label: string,
  targetFocusRef: string,
  detail: string,
): Continuation {
  return {
    kind: targetQuestionRoute === 'route' ? 'reroute' : 'inspect-support',
    label,
    description: detail,
    targetQuestionRoute,
    targetFocusRef,
  };
}

function claimProvenanceEntry(label: string, claimId: string): InquiryProvenanceEntry {
  return {
    kind: 'claim',
    label,
    ref: claimId,
  };
}

function mergeTrustProfiles(
  base: TrustProfile,
  regime: TrustProfile | null,
): TrustProfile {
  if (!regime) {
    return base;
  }

  if (regime.kind === 'frontier') {
    return regime;
  }

  if (base.kind === 'grounded' && regime.kind === 'qualified') {
    return regime;
  }

  return base;
}
