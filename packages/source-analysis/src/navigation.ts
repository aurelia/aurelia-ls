import {
  type AnalysisViews,
} from './analysis-views.js';
import {
  createAnalysisProvenanceEntry,
  defaultWorldFrameForAnalysis,
  describeAnalysisSurface,
  describeAnalysisSurfaceEvidence,
} from './analysis-surface.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import {
  loadCurrentAnalysisViews,
} from './snapshot-analysis-views.js';
import type { LoadedCurrentSnapshotSet } from './snapshot-contract.js';
import type { TypeDecl } from './typerefs/schema.js';
import {
  type FocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { FocusedStructuralPathContext } from './focused-structural-path.js';
import type { AnswerCard } from './answer-card.js';
import type { AnswerRef } from './answer-ref.js';
import {
  createStructuredAnswerCard,
} from './answer-card.js';
import {
  createAnswerRef,
  createExportRecordAnswerRef,
  createFileAnswerRef,
  createPackageSummaryAnswerRef,
  createSymbolAnswerRef,
  createTypeAnswerRef,
  createTypeDeclarationAnswerRef,
} from './answer-refs.js';
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
import {
  describeMissingStructuralDeclarationSurface,
} from './structural-declaration-surface.js';
import { SUBSTRATE_SCHEMA_VERSION } from './substrate.js';
import type { DeclarationClaim } from './structural-claim-graph.js';
import {
  coerceNavigationAuthority,
  createLegacyProjectionNavigationAuthority,
  type NavigationAuthority,
} from './authority/navigation-authority.js';
import type { Locator } from './authority/contracts.js';

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
  symbolNeighborhood: 'navigation/symbol-neighborhood',
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
    id: NAVIGATION_HOME_IDS.symbolNeighborhood,
    kind: 'observation',
    label: 'Workspace symbol neighborhood',
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
    createLegacyProjectionNavigationAuthority(loadCurrentAnalysisViews(target, waitMs)),
  );
}

export function createNavigationEpisode(
  query: Inquiry,
  authorityInput: NavigationAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
): NavigationEpisode {
  // TODO: Navigation still starts from an AnalysisViews carrier and then builds
  // answer-local substrate/claim objects on demand. Pull this behind a named
  // shared navigation authority so query surfaces consult one runtime instead
  // of reconstructing truth from projection bundles.
  const authority = coerceNavigationAuthority(authorityInput);
  const builder = new EpisodeBuilder(query, authority);
  switch (query.focusRef.kind) {
    case 'package':
      return buildPackageEpisode(builder, query.focusRef.value);
    case 'type':
      return buildTypeEpisode(builder, query.focusRef.value);
    case 'export':
      return buildExportEpisode(builder, query.focusRef.value);
    case 'file':
      return buildFileEpisode(builder, query.focusRef.value);
    case 'symbol':
      return buildSymbolEpisode(builder, query.focusRef.value);
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
  readonly #authority: NavigationAuthority;
  readonly #nodes = new Map<string, SubstrateNode>();
  readonly #edges = new Map<string, SubstrateEdge>();
  readonly #claims = new Map<string, ClaimNode>();
  readonly #claimEdges = new Map<string, ClaimEdge>();

  constructor(query: Inquiry, authority: NavigationAuthority) {
    this.#query = query;
    this.#authority = authority;
  }

  get query(): Inquiry {
    return this.#query;
  }

  get authority(): NavigationAuthority {
    return this.#authority;
  }

  get snapshots(): AnalysisViews {
    return this.#authority.analysis;
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
      ? this.snapshots.deps
      : kind === 'typerefs'
        ? this.snapshots.typeRefs
        : this.snapshots.exports;
    const label = `${kind} ${this.snapshots.source === 'hosted-analysis' ? 'analysis view' : 'snapshot'}`;
    return this.addNode({
      id: `snapshot:${kind}`,
      kind: 'snapshot',
      label,
      fingerprint: `${snapshot.source_commit}:${snapshot.generated_at}`,
      provenance: [{
        kind: this.snapshots.source === 'hosted-analysis'
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

  addStructuralDeclarationNode(
    decl: DeclarationClaim,
    typeRefCount = 0,
  ): string {
    return this.addNode({
      id: `decl:${decl.attributes.filePath}:${decl.attributes.name}:${decl.attributes.line}`,
      kind: 'declaration-observation',
      label: decl.attributes.name,
      repoRelativePath: decl.attributes.filePath,
      location: {
        repoRelativePath: decl.attributes.filePath,
        start: { line: decl.attributes.line, column: 1 },
      },
      attributes: {
        declarationKind: decl.attributes.declarationKind,
        exported: decl.attributes.exported,
        refCount: typeRefCount,
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

  addDeclarationTypeRefObservation(
    declaration: DeclarationClaim,
    targetName: string,
    targetFile: string,
    kind: string,
    context?: string,
  ): string {
    return this.addNode({
      id: `type-ref:${declaration.id}:${targetFile}:${targetName}:${kind}:${context ?? ''}`,
      kind: 'type-reference-observation',
      label: `${declaration.attributes.name} -> ${targetName}`,
      repoRelativePath: declaration.attributes.filePath,
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
      ? this.snapshots.deps
      : kind === 'typerefs'
        ? this.snapshots.typeRefs
        : this.snapshots.exports;
    return {
      kind: this.snapshots.source === 'hosted-analysis'
        ? 'analysis-session'
        : 'snapshot-materialization',
      label: `${kind} ${this.snapshots.source === 'hosted-analysis' ? 'analysis view' : 'snapshot'}`,
      fingerprint: snapshot.generated_at,
      detail: `source_commit=${snapshot.source_commit}`,
    };
  }

  finish(answer: InquiryAnswer<NavigationValue>): NavigationEpisode {
    return {
      substrate: {
        schemaVersion: SUBSTRATE_SCHEMA_VERSION,
        repoPath: this.snapshots.root,
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
  const requestedRegimeContext = builder.authority.inspectFocusedAnalyzability({
    focusLabel: normalizedPackageQuery,
    queryHints: [normalizedPackageQuery],
  });
  const packageResolution = builder.authority.resolvePackage(locator('package-name', normalizedPackageQuery, 'package'));
  if (packageResolution.kind === 'no-claim') {
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
  if (packageResolution.kind === 'ambiguity') {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Package query "${normalizedPackageQuery}" is ambiguous.`,
      { kind: 'package', value: normalizedPackageQuery },
      packageResolution.ambiguity.candidates.map((pkg) => packageRef(pkg)),
    ));
  }

  const pkg = packageResolution.value;
  const depsSnapshotId = builder.addSnapshotNode('deps');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const packageNodeId = builder.addPackageNode(pkg);
  const entrypointNodeId = builder.addEntrypointNode(pkg.analysis_entrypoint);
  builder.addEdge({ id: `contains:${packageNodeId}->${entrypointNodeId}`, kind: 'contains', from: packageNodeId, to: entrypointNodeId });
  builder.addEdge({ id: `materializes:${exportsSnapshotId}->${packageNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: packageNodeId });

  const matrix = builder.authority.getPackageCouplingMatrix(pkg.package_dir);
  const keyExports = builder.authority.getPackageValueExports(pkg.package_dir, 5);

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

  const regimeContext = builder.authority.inspectFocusedAnalyzability({
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
    createFileAnswerRef(pkg.analysis_entrypoint, 'package entrypoint'),
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
  const typeResolution = builder.authority.resolveTypeDeclaration(locator('type-name', trimTrailingFocusPunctuation(typeQuery), 'type'));
  if (typeResolution.kind === 'no-claim') {
    return builder.finish(createMissAnswer(
      builder,
      `No type declaration matches "${typeQuery}".`,
      { kind: 'type', value: typeQuery },
      [],
    ));
  }
  if (typeResolution.kind === 'ambiguity') {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Type query "${typeQuery}" matches multiple declarations.`,
      { kind: 'type', value: typeQuery },
      typeResolution.ambiguity.candidates.map((decl) => typeRef(decl)),
    ));
  }

  const decl = typeResolution.value;
  const typerefsSnapshotId = builder.addSnapshotNode('typerefs');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const pkg = builder.authority.resolveOwningPackage(decl.file) ?? undefined;

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

  const matchingExport = builder.authority.getFileExportRecords(decl.file).find((record) =>
    record.declaration_name === decl.name,
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
    createFileAnswerRef(decl.file, 'declaration file'),
    ...(pkg ? [packageRef(pkg)] : []),
    ...uniqueRefs.slice(0, 4).map((ref) =>
      createTypeAnswerRef(ref.target, `${ref.kind}${ref.context ? ` (${ref.context})` : ''}`),
    ),
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

function buildSymbolEpisode(
  builder: EpisodeBuilder,
  symbolQuery: string,
): NavigationEpisode {
  const lookup = builder.authority.lookupSymbolDeclaration(locator('symbol-name', symbolQuery, 'symbol'));
  if (lookup.tag === 'open-boundary') {
    const policy = policyForNavigation(builder, 'symbol');
    return builder.finish(createAnswer(
      builder,
      policy,
      { kind: 'symbol', value: symbolQuery, label: symbolQuery },
      'open-boundary',
      createStructuredAnswerCard({
        title: 'Workspace symbol boundary',
        primaryRef: createSymbolAnswerRef(symbolQuery),
        relatedRefs: [],
        document: createNavigationDocument([
          lookup.message ?? describeMissingStructuralDeclarationSurface(),
        ], []),
        policy,
      }),
      {
        kind: 'frontier',
        summary: 'The current analysis does not carry the live structural declaration surface needed for symbol-localization questions.',
      },
      [{
        kind: 'route',
        summary: 'Non-type symbol localization currently closes only through live structural declaration claims.',
      }],
      [{
        code: 'navigation-missing-structural-declarations',
        message: lookup.message ?? describeMissingStructuralDeclarationSurface(),
        severity: 'warning',
        origin: 'boundary',
      }],
      [],
      [],
    ));
  }

  if (lookup.matches.length === 0) {
    return builder.finish(createMissAnswer(
      builder,
      `No declaration matches "${symbolQuery}".`,
      { kind: 'symbol', value: symbolQuery },
      [],
    ));
  }
  if (lookup.matches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Symbol query "${symbolQuery}" matches multiple declarations.`,
      { kind: 'symbol', value: symbolQuery },
      lookup.matches.slice(0, 8).map((match) =>
        createSymbolAnswerRef(
          match.declaration.attributes.name,
          `${match.declaration.attributes.filePath}:${match.declaration.attributes.line}`,
        ),
      ),
    ));
  }

  const match = lookup.matches[0]!;
  const decl = match.declaration;
  const fileNodeId = builder.addFileNode(decl.attributes.filePath);
  const declNodeId = builder.addStructuralDeclarationNode(decl, match.typeReferences.length);
  builder.addEdge({ id: `declares:${fileNodeId}->${declNodeId}`, kind: 'declares', from: fileNodeId, to: declNodeId });

  const packageNodeId = match.owningPackage ? builder.addPackageNode(match.owningPackage) : undefined;
  if (packageNodeId) {
    builder.addEdge({ id: `contains:${packageNodeId}->${fileNodeId}`, kind: 'contains', from: packageNodeId, to: fileNodeId });
  }

  const referencedTypeNodeIds = match.typeReferences.slice(0, 6).map((reference) => {
    const nodeId = builder.addDeclarationTypeRefObservation(
      decl,
      reference.attributes.targetName,
      reference.attributes.targetFile,
      reference.attributes.refKind,
      reference.attributes.context ?? undefined,
    );
    builder.addEdge({ id: `references:${declNodeId}->${nodeId}`, kind: 'references-type', from: declNodeId, to: nodeId });
    return nodeId;
  });

  const exportsSnapshotId = match.publicExports.length > 0
    ? builder.addSnapshotNode('exports')
    : undefined;
  const exportNodeIds = match.publicExports.slice(0, 4).map((record) => {
    const nodeId = builder.addExportNode(record);
    if (exportsSnapshotId) {
      builder.addEdge({ id: `materializes:${exportsSnapshotId}->${nodeId}`, kind: 'materializes', from: exportsSnapshotId, to: nodeId });
    }
    builder.addEdge({ id: `exports:${fileNodeId}->${nodeId}`, kind: 'exports', from: fileNodeId, to: nodeId });
    return nodeId;
  });

  const symbolClaimId = builder.addClaim({
    id: `claim:symbol:${decl.attributes.filePath}:${decl.attributes.name}:${decl.attributes.line}`,
    homeId: NAVIGATION_HOME_IDS.symbolNeighborhood,
    kind: 'derived',
    subjectRef: `${decl.attributes.name}@${decl.attributes.filePath}`,
    label: `${decl.attributes.name} symbol neighborhood`,
    support: {
      substrateNodeIds: [fileNodeId, declNodeId, ...referencedTypeNodeIds, ...exportNodeIds],
    },
  });
  const routeClaimId = builder.addClaim({
    id: `claim:symbol:${decl.attributes.filePath}:${decl.attributes.name}:${decl.attributes.line}:route`,
    homeId: NAVIGATION_HOME_IDS.route,
    kind: 'route',
    subjectRef: `${decl.attributes.name} symbol route`,
    label: `${decl.attributes.name} symbol route`,
    support: {
      upstreamClaimIds: [symbolClaimId],
    },
  });
  builder.addClaimEdge({ kind: 'supports', from: symbolClaimId, to: routeClaimId });

  const sourceExported = match.exportObservations.length > 0 || decl.attributes.exported;
  const summaryLines = [
    `${decl.attributes.declarationKind} ${decl.attributes.name} is declared in ${decl.attributes.filePath}:${decl.attributes.line}.`,
    match.publicExports.length > 0
      ? `It reaches the public surface as ${match.publicExports.slice(0, 3).map((record) => record.exported_name).join(', ')}.`
      : sourceExported
        ? 'It is exported from its source file, but no package-level public export record currently closes on it.'
        : 'It is not currently part of the package-level public export surface.',
    match.typeReferences.length > 0
      ? `The live structural declaration surface records ${match.typeReferences.length} direct type reference${pluralize(match.typeReferences.length)}, including ${match.typeReferences.slice(0, 4).map((reference) => reference.attributes.targetName).join(', ')}.`
      : 'The live structural declaration surface does not record any direct project type references for this declaration.',
    ...(match.members.length > 0
      ? [`It also carries ${match.members.length} tracked member${pluralize(match.members.length)} in the live structural declaration surface.`]
      : []),
  ];

  const policy = policyForNavigation(builder, 'symbol');
  const relatedRefs = [
    createFileAnswerRef(decl.attributes.filePath, 'declaration file'),
    ...(match.owningPackage ? [packageRef(match.owningPackage)] : []),
    ...match.publicExports.slice(0, 3).map((record) => exportRef(record)),
    ...match.typeReferences.slice(0, 3).map((reference) =>
      createTypeAnswerRef(reference.attributes.targetName, reference.attributes.targetFile),
    ),
  ];

  return builder.finish(createAnswer(
    builder,
    policy,
    { kind: 'symbol', value: decl.attributes.name, label: decl.attributes.name },
    'hit',
    createStructuredAnswerCard({
      title: `${decl.attributes.name} symbol neighborhood`,
      primaryRef: createSymbolAnswerRef(
        decl.attributes.name,
        `${decl.attributes.filePath}:${decl.attributes.line}`,
      ),
      relatedRefs,
      document: createNavigationDocument(summaryLines, relatedRefs, [
        { label: 'declaration kind', value: decl.attributes.declarationKind },
        { label: 'exported from source', value: sourceExported ? 'yes' : 'no' },
        { label: 'public exports', value: String(match.publicExports.length) },
        { label: 'type refs', value: String(match.typeReferences.length) },
        { label: 'members', value: String(match.members.length) },
      ]),
      policy,
    }),
    {
      kind: 'grounded',
      summary: 'This symbol neighborhood is grounded in the live structural declaration surface for the current workspace.',
    },
    [
      {
        kind: 'claim',
        summary: 'The answer closes on one symbol-neighborhood claim and one route claim.',
        claimIds: [symbolClaimId, routeClaimId],
        claimHomeIds: [NAVIGATION_HOME_IDS.symbolNeighborhood, NAVIGATION_HOME_IDS.route],
      },
      {
        kind: 'substrate',
        summary: match.publicExports.length > 0
          ? 'The neighborhood is backed by live structural declaration claims plus the matching package export observations.'
          : 'The neighborhood is backed by live structural declaration claims and direct type-reference observations.',
        substrateNodeIds: [fileNodeId, declNodeId, ...referencedTypeNodeIds, ...exportNodeIds],
      },
      {
        kind: 'route',
        summary: 'This answer intentionally localizes a declaration target so the caller can inspect the owning implementation file before editing.',
      },
    ],
    [],
    [
      continuation('join', 'Open the declaration file', decl.attributes.filePath, 'declaration file'),
      ...(isTypeLikeDeclarationKind(decl)
        ? [continuation('join', 'Inspect the type neighborhood', decl.attributes.name, 'type declaration')]
        : []),
      ...match.publicExports.slice(0, 2).map((record) =>
        continuation('route', `Follow public export ${record.exported_name}`, record.exported_name, 'public export'),
      ),
      ...match.typeReferences.slice(0, 2).map((reference) =>
        continuation('join', `Inspect ${reference.attributes.targetName}`, reference.attributes.targetName, 'referenced type'),
      ),
      ...(match.owningPackage ? [continuation('join', 'Inspect the owning package', match.owningPackage.package_name, 'owning package')] : []),
    ],
    [
      {
        kind: 'host',
        label: 'live structural declaration surface',
        detail: 'Checker-adjacent declaration, member, and type-reference claims from the structural claim graph.',
      },
      ...(match.publicExports.length > 0
        ? [createAnalysisProvenanceEntry('exports', builder.snapshots.exports.generated_at, builder.snapshots.exports.source_commit, builder.query.worldFrame?.freshness)]
        : []),
      claimProvenanceEntry(`${decl.attributes.name} symbol neighborhood`, symbolClaimId),
    ],
  ));
}

function buildExportEpisode(
  builder: EpisodeBuilder,
  exportQuery: string,
): NavigationEpisode {
  const exportResolution = builder.authority.resolveExport(locator('export-name', trimTrailingFocusPunctuation(exportQuery), 'export'));
  if (exportResolution.kind === 'no-claim') {
    return builder.finish(createMissAnswer(
      builder,
      `No export matches "${exportQuery}".`,
      { kind: 'export', value: exportQuery },
      [],
    ));
  }
  if (exportResolution.kind === 'ambiguity') {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `Export query "${exportQuery}" matches multiple package exports.`,
      { kind: 'export', value: exportQuery },
      exportResolution.ambiguity.candidates.map((record) => exportRef(record)),
    ));
  }

  const record = exportResolution.value;
  const route = builder.authority.resolveExportRoute(record)!;
  const pkg = builder.authority.getPackageByDir(record.package_dir)!;
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const packageNodeId = builder.addPackageNode(pkg);
  const exportNodeId = builder.addExportNode(record);
  builder.addEdge({ id: `exports:${packageNodeId}->${exportNodeId}`, kind: 'exports', from: packageNodeId, to: exportNodeId });
  builder.addEdge({ id: `materializes:${exportsSnapshotId}->${exportNodeId}`, kind: 'materializes', from: exportsSnapshotId, to: exportNodeId });

  const chainFileNodeIds = route.chain.map((step) => {
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

  const declarationType = route.declarationFile
    ? builder.authority.getTypeDeclarationByFileAndName(route.declarationFile, route.declarationName)
    : undefined;
  const usedSnapshotFallback = route.source === 'snapshot-fallback';
  const liveFallbackIssue = usedSnapshotFallback && builder.snapshots.source === 'hosted-analysis'
    ? [{
      code: 'export-route-fallback',
      message: `${record.exported_name} fell back to the materialized export record because the live semantic export trace did not close on a better route.`,
      severity: 'warning' as const,
      origin: 'boundary' as const,
    }]
    : [];

  const summaryLines = [
    `${record.exported_name} is exported by ${record.package_name}.`,
    route.declarationFile
      ? `Its implementation lands in ${route.declarationFile}:${route.declarationLine ?? '?'}.`
      : 'Its implementation file could not be resolved in the current export route.',
    `The public chain is ${route.chain.map((step) => `${basename(step.file)}:${step.kind}`).join(' -> ')}.`,
    ...(liveFallbackIssue.length > 0
      ? ['Live semantic export tracing did not close here, so this answer is temporarily falling back to the materialized export record.']
      : []),
  ];
  const policy = policyForNavigation(builder, 'export');
  const relatedRefs = [
    packageRef(pkg),
    ...(route.declarationFile
      ? [createFileAnswerRef(route.declarationFile, 'implementation file')]
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
        { label: 'chain length', value: String(route.chain.length) },
        { label: 'type-only', value: route.typeOnly ? 'yes' : 'no' },
        { label: 'route source', value: route.source === 'semantic-runtime' ? 'semantic runtime' : 'snapshot fallback' },
      ]),
      policy,
    }),
    route.source === 'semantic-runtime'
      ? {
        kind: 'grounded',
        summary: 'This route is grounded in the shared semantic export trace surface for the current workspace package.',
      }
      : builder.snapshots.source === 'hosted-analysis'
        ? {
          kind: 'qualified',
          summary: 'The live semantic export trace did not close here, so this route currently falls back to the materialized export record.',
        }
        : {
          kind: 'grounded',
          summary: 'This route is grounded in the materialized export record for the current workspace package.',
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
        summary: route.source === 'semantic-runtime'
          ? 'The route is backed by the shared semantic export trace surface plus the package export observation.'
          : 'The route is backed by the materialized package export record and its carried chain through the public entrypoint.',
        substrateNodeIds: [exportsSnapshotId, packageNodeId, exportNodeId, ...chainFileNodeIds],
      },
      {
        kind: 'route',
        summary: 'This answer intentionally routes from a public API symbol into the owning implementation file.',
      },
    ],
    liveFallbackIssue,
    [
      ...(route.declarationFile
        ? [continuation('join', 'Open the implementation file', route.declarationFile, 'implementation file')]
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
  const fileInspection = builder.authority.inspectFocusedFile(locator('file-path', fileQuery, 'file'));
  if (fileInspection.matches.length === 0) {
    if (fileInspection.requestedRegimeContext.directlyExcludedFrontier) {
      return builder.finish(createOpenBoundaryAnswer(
        builder,
        `${fileInspection.normalizedQuery} falls under excluded frontier ${fileInspection.requestedRegimeContext.directlyExcludedFrontier.prefix}, so workspace navigation cannot close on it inside the current profile.`,
        { kind: 'file', value: fileInspection.normalizedQuery },
        [],
        fileInspection.requestedRegimeContext,
      ));
    }
    if (fileInspection.catalogIssue || fileInspection.structuralPathContext?.tag === 'open-boundary') {
      return builder.finish(createOpenBoundaryAnswer(
        builder,
        fileInspection.catalogIssue
          ?? `${fileInspection.normalizedQuery} is outside the live structural source-file catalog, so workspace navigation cannot close on it as a source-backed file.`,
        { kind: 'file', value: fileInspection.normalizedQuery },
        [],
        fileInspection.requestedRegimeContext,
        fileInspection.structuralPathContext,
      ));
    }
    return builder.finish(createMissAnswer(
      builder,
      `No file matches "${fileInspection.normalizedQuery}".`,
      { kind: 'file', value: fileInspection.normalizedQuery },
      [],
    ));
  }
  if (fileInspection.matches.length > 1) {
    return builder.finish(createAmbiguousAnswer(
      builder,
      `File query "${fileInspection.normalizedQuery}" is ambiguous.`,
      { kind: 'file', value: fileInspection.normalizedQuery },
      fileInspection.matches.slice(0, 8).map((filePath) =>
        createFileAnswerRef(filePath, filePath),
      ),
    ));
  }

  const filePath = fileInspection.matchedFilePath!;
  if (requiresSourceCatalogBoundary(fileInspection.structuralPathContext)) {
    const pkg = builder.authority.resolveOwningPackage(filePath) ?? undefined;
    return builder.finish(createOpenBoundaryAnswer(
      builder,
      describeStructuralSourceBoundary(filePath, fileInspection.structuralPathContext),
      { kind: 'file', value: filePath, label: basename(filePath) },
      pkg ? [packageRef(pkg)] : [],
      fileInspection.matchedRegimeContext!,
      fileInspection.structuralPathContext,
    ));
  }

  const depsSnapshotId = builder.addSnapshotNode('deps');
  const typerefsSnapshotId = builder.addSnapshotNode('typerefs');
  const exportsSnapshotId = builder.addSnapshotNode('exports');
  const dependencySurface = builder.authority.getDependencySurface();
  const fileNodeId = builder.addFileNode(filePath);
  const pkg = builder.authority.resolveOwningPackage(filePath) ?? undefined;
  const packageNodeId = pkg ? builder.addPackageNode(pkg) : undefined;
  if (packageNodeId) {
    builder.addEdge({ id: `contains:${packageNodeId}->${fileNodeId}`, kind: 'contains', from: packageNodeId, to: fileNodeId });
  }

  const outboundEdges = dependencySurface.edgesBySourceFile.get(filePath) ?? [];
  const inboundEdges = dependencySurface.edgesByTargetFile.get(filePath) ?? [];
  // TODO: These direct reads from typeRefs/exports keep the legacy projections
  // alive as first-class architecture. Replace them with declaration/export
  // surfaces derived from shared authority and materialize projection tables
  // only when a caller explicitly asks for those historical payloads.
  const declarations = builder.authority.getFileDeclarations(filePath);
  const exportRecords = builder.authority.getFileExportRecords(filePath);

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

  const regimeContext = fileInspection.matchedRegimeContext!;
  const structuralPathContext = fileInspection.structuralPathContext;

  const summaryLines = [
    `${filePath} has ${outboundEdges.length} outbound imports and ${inboundEdges.length} inbound imports in the dependency surface.`,
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
    ...outboundEdges.slice(0, 3).map((edge) =>
      createFileAnswerRef(edge.target, `imports ${edge.bindings.join(', ') || '(side effect)'}`),
    ),
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
      primaryRef: createFileAnswerRef(filePath, filePath),
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
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
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
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
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
  regimeContext: FocusedAnalyzabilityContext,
  structuralPathContext: FocusedStructuralPathContext | null = null,
): InquiryAnswer<NavigationValue> {
  const policy = policyForNavigation(builder, focusRef.kind);
  const trust = regimeContext.trust
    ? mergeTrustProfiles(regimeContext.trust, structuralPathContext?.trust ?? null)
    : structuralPathContext?.trust ?? {
      kind: 'frontier',
      summary: 'The requested focus sits outside the included regime.',
    };
  return createAnswer(
    builder,
    policy,
    focusRef,
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Workspace navigation boundary',
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
      relatedRefs,
      document: createNavigationDocument(
        [
          message,
          ...regimeContext.lines.slice(1),
          ...(structuralPathContext?.lines ?? []),
        ],
        relatedRefs,
        [
          ...regimeContext.facts,
          ...(structuralPathContext?.facts ?? []),
        ],
      ),
      policy,
    }),
    trust,
    [
      ...regimeContext.closureBasis,
      ...(structuralPathContext?.closureBasis ?? []),
    ],
    [
      ...regimeContext.issues,
      ...(structuralPathContext?.issues ?? []),
    ],
    regimeContext.continuations,
    [
      ...regimeContext.provenance,
      ...(structuralPathContext?.provenance ?? []),
    ],
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
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
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
      summary: 'The live navigator currently supports package, file, symbol, type, and export focuses.',
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

function packageRef(pkg: PackageExportsSummary): NavigationRef {
  return createPackageSummaryAnswerRef(pkg);
}

function typeRef(decl: TypeDecl): NavigationRef {
  return createTypeDeclarationAnswerRef(decl);
}

function exportRef(record: PackageExportRecord): NavigationRef {
  return createExportRecordAnswerRef(record);
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

function isTypeLikeDeclarationKind(
  declaration: DeclarationClaim,
): boolean {
  switch (declaration.attributes.declarationKind) {
    case 'class':
    case 'enum':
    case 'interface':
    case 'namespace':
    case 'type':
      return true;
    default:
      return false;
  }
}

function pluralize(
  count: number,
): string {
  return count === 1 ? '' : 's';
}

function locator(
  kind: Locator['kind'],
  value: string,
  label?: string,
): Locator {
  return {
    kind,
    value,
    ...(label ? { label } : {}),
  };
}

function requiresSourceCatalogBoundary(
  structuralPathContext: FocusedStructuralPathContext | null,
): boolean {
  return structuralPathContext?.evaluation.sourceCoverage === 'repo-blindspot'
    || structuralPathContext?.evaluation.sourceCoverage === 'not-in-repo-scan';
}

function describeStructuralSourceBoundary(
  filePath: string,
  structuralPathContext: FocusedStructuralPathContext | null,
): string {
  switch (structuralPathContext?.evaluation.sourceCoverage) {
    case 'repo-blindspot':
      return `${filePath} exists in the live repo source scan but is not admitted by any loaded tsconfig/project claim, so workspace navigation cannot close on it as a source-backed file.`;
    case 'not-in-repo-scan':
      return `${filePath} is outside the live structural source-file catalog, so workspace navigation cannot close on it as a source-backed file.`;
    default:
      return `${filePath} is outside the live structural source-file catalog, so workspace navigation cannot close on it as a source-backed file.`;
  }
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
