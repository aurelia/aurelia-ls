import { realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import {
  loadPackageDescriptors,
  type PackageDescriptor,
} from './package-descriptors.js';
import type {
  LoadedTsconfigSnapshot,
  RepoSession,
} from './repo-session.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFile,
  type ParsedTsconfigSourceFileBatch,
  type ParsedTsconfigSourceFileScanResult,
} from './tsconfig-source-files.js';
import type {
  DeclKind as TypeShapeDeclKind,
  MemberKind,
  RefKind,
} from './typerefs/schema.js';

export const STRUCTURAL_CLAIM_GRAPH_VERSION = 'v0alpha1' as const;

export const STRUCTURAL_PRODUCER_IDS = [
  'repo-structure',
  'package-structure',
  'tsconfig-project-graph',
  'source-file-catalog',
  'import-resolution',
  'export-structure',
  'declaration-shape',
  'type-reference',
] as const;

export const STRUCTURAL_CLAIM_KINDS = [
  'repo',
  'package',
  'package-entrypoint',
  'tsconfig',
  'source-file',
  'project-source-file',
  'import',
  'import-binding',
  'resolution',
  'export-observation',
  'declaration',
  'member',
  'type-reference',
] as const;

export type StructuralProducerId =
  typeof STRUCTURAL_PRODUCER_IDS[number];

export type StructuralClaimKind =
  typeof STRUCTURAL_CLAIM_KINDS[number];

export type StructuralClaimId = string;

export type StructuralDeclarationKind =
  | TypeShapeDeclKind
  | 'function'
  | 'namespace'
  | 'const'
  | 'variable';

export type ImportObservationKind =
  | 'import'
  | 'reexport'
  | 'dynamic-import';

export type ExportObservationKind =
  | 'local-export'
  | 'named-reexport'
  | 'star-reexport'
  | 'namespace-reexport';

export type ResolutionStatus =
  | 'internal'
  | 'external'
  | 'unresolved';

export type ClaimEvidenceBasis =
  | 'repo-session'
  | 'package-descriptor'
  | 'tsconfig'
  | 'parsed-source-file'
  | 'module-resolution'
  | 'type-index';

export interface StructuralClaimProvenance {
  readonly producerId: StructuralProducerId;
  readonly basis: ClaimEvidenceBasis;
  readonly repoRelativePath?: string;
  readonly line?: number;
  readonly detail?: string;
}

interface StructuralClaimBase<
  TKind extends StructuralClaimKind,
  TAttributes,
> {
  readonly id: StructuralClaimId;
  readonly kind: TKind;
  readonly subjectRef: string;
  readonly producerId: StructuralProducerId;
  readonly repoRelativePath?: string;
  readonly relatedClaimIds?: readonly StructuralClaimId[];
  readonly attributes: Readonly<TAttributes>;
  readonly provenance: readonly StructuralClaimProvenance[];
}

export type RepoClaim =
  StructuralClaimBase<'repo', {
    readonly profileId: string;
    readonly packageCount: number;
    readonly tsconfigCount: number;
    readonly sourceFileCount: number;
  }>;

export type PackageClaim =
  StructuralClaimBase<'package', {
    readonly packageName: string;
    readonly packageDir: string;
    readonly packageJsonPath: string;
    readonly analysisBasis: 'source' | 'types';
    readonly analysisEntrypoint: string;
    readonly sourceEntrypoint: string | null;
    readonly publicTypesEntrypoint: string | null;
  }>;

export type PackageEntrypointClaim =
  StructuralClaimBase<'package-entrypoint', {
    readonly packageId: StructuralClaimId;
    readonly packageName: string;
    readonly packageDir: string;
    readonly entrypoint: string;
    readonly basis: 'source' | 'types';
  }>;

export type TsconfigClaim =
  StructuralClaimBase<'tsconfig', {
    readonly tsconfigPath: string;
    readonly sourceFileCount: number;
    readonly projectReferenceTargets: readonly string[];
  }>;

export type SourceFileClaim =
  StructuralClaimBase<'source-file', {
    readonly filePath: string;
    readonly tsconfigIds: readonly StructuralClaimId[];
  }>;

export type ProjectSourceFileClaim =
  StructuralClaimBase<'project-source-file', {
    readonly filePath: string;
    readonly sourceFileId: StructuralClaimId;
    readonly tsconfigId: StructuralClaimId;
  }>;

export type ImportClaim =
  StructuralClaimBase<'import', {
    readonly sourceFile: string;
    readonly sourceFileId: StructuralClaimId;
    readonly specifier: string;
    readonly bindings: readonly string[];
    readonly typeOnly: boolean;
    readonly line: number;
    readonly start: number;
    readonly observationKind: ImportObservationKind;
  }>;

export type ResolutionClaim =
  StructuralClaimBase<'resolution', {
    readonly importId: StructuralClaimId;
    readonly status: ResolutionStatus;
    readonly sourceFile: string;
    readonly specifier: string;
    readonly targetFile: string | null;
    readonly targetFileId: StructuralClaimId | null;
    readonly externalPackage: string | null;
    readonly dtsTarget: boolean;
    readonly viaBarrel: boolean;
  }>;

export type ImportBindingClaim =
  StructuralClaimBase<'import-binding', {
    readonly importId: StructuralClaimId;
    readonly sourceFile: string;
    readonly sourceFileId: StructuralClaimId;
    readonly localName: string;
    readonly importedName: string;
    readonly line: number;
    readonly typeOnly: boolean;
    readonly specifier: string;
    readonly targetFile: string | null;
    readonly targetFileId: StructuralClaimId | null;
  }>;

export type ExportObservationClaim =
  StructuralClaimBase<'export-observation', {
    readonly sourceFile: string;
    readonly sourceFileId: StructuralClaimId;
    readonly observationKind: ExportObservationKind;
    readonly exportedName: string | null;
    readonly originalName: string | null;
    readonly line: number;
    readonly typeOnly: boolean;
    readonly specifier: string | null;
    readonly targetFile: string | null;
    readonly targetFileId: StructuralClaimId | null;
  }>;

export type DeclarationClaim =
  StructuralClaimBase<'declaration', {
    readonly filePath: string;
    readonly fileId: StructuralClaimId;
    readonly name: string;
    readonly declarationKind: StructuralDeclarationKind;
    readonly line: number;
    readonly exported: boolean;
    readonly typeParams: readonly string[];
    readonly aliasBody: string | null;
    readonly literalValues: readonly string[] | null;
  }>;

export type MemberClaim =
  StructuralClaimBase<'member', {
    readonly declarationId: StructuralClaimId;
    readonly name: string;
    readonly memberKind: MemberKind;
    readonly optional: boolean;
    readonly readonly: boolean;
    readonly value: string | null;
  }>;

export type TypeReferenceClaim =
  StructuralClaimBase<'type-reference', {
    readonly declarationId: StructuralClaimId;
    readonly targetName: string;
    readonly targetFile: string;
    readonly targetDeclarationId: StructuralClaimId | null;
    readonly refKind: RefKind;
    readonly context: string | null;
  }>;

export type StructuralClaim =
  | RepoClaim
  | PackageClaim
  | PackageEntrypointClaim
  | TsconfigClaim
  | SourceFileClaim
  | ProjectSourceFileClaim
  | ImportClaim
  | ImportBindingClaim
  | ResolutionClaim
  | ExportObservationClaim
  | DeclarationClaim
  | MemberClaim
  | TypeReferenceClaim;

export interface StructuralClaimGraph {
  readonly schemaVersion: typeof STRUCTURAL_CLAIM_GRAPH_VERSION;
  readonly repoPath: string;
  readonly target: string;
  readonly warnings: readonly string[];
  readonly claims: readonly StructuralClaim[];
}

export interface StructuralClaimGraphIndex {
  readonly byId: ReadonlyMap<StructuralClaimId, StructuralClaim>;
  readonly repo: RepoClaim | null;
  readonly packages: readonly PackageClaim[];
  readonly packageEntrypoints: readonly PackageEntrypointClaim[];
  readonly tsconfigs: readonly TsconfigClaim[];
  readonly sourceFiles: readonly SourceFileClaim[];
  readonly projectSourceFiles: readonly ProjectSourceFileClaim[];
  readonly imports: readonly ImportClaim[];
  readonly importBindings: readonly ImportBindingClaim[];
  readonly resolutions: readonly ResolutionClaim[];
  readonly exportObservations: readonly ExportObservationClaim[];
  readonly declarations: readonly DeclarationClaim[];
  readonly members: readonly MemberClaim[];
  readonly typeReferences: readonly TypeReferenceClaim[];
  readonly sourceFileByPath: ReadonlyMap<string, SourceFileClaim>;
  readonly projectSourceFilesByFilePath: ReadonlyMap<string, readonly ProjectSourceFileClaim[]>;
  readonly importsBySourceFilePath: ReadonlyMap<string, readonly ImportClaim[]>;
  readonly importBindingsBySourceFilePath: ReadonlyMap<string, readonly ImportBindingClaim[]>;
  readonly importBindingsByFileAndLocalName: ReadonlyMap<string, ReadonlyMap<string, ImportBindingClaim>>;
  readonly resolutionByImportId: ReadonlyMap<StructuralClaimId, ResolutionClaim>;
  readonly exportObservationsBySourceFilePath: ReadonlyMap<string, readonly ExportObservationClaim[]>;
  readonly declarationsByFilePath: ReadonlyMap<string, readonly DeclarationClaim[]>;
  readonly membersByDeclarationId: ReadonlyMap<StructuralClaimId, readonly MemberClaim[]>;
  readonly typeReferencesByDeclarationId: ReadonlyMap<StructuralClaimId, readonly TypeReferenceClaim[]>;
}

export interface StructuralClaimGraphRuntime {
  readonly graph: StructuralClaimGraph;
  readonly index: StructuralClaimGraphIndex;
}

export interface StructuralClaimGraphOptions {
  readonly sourceFileScan?: ParsedTsconfigSourceFileScanResult;
}

interface ImportInfo {
  readonly names: Map<string, string>;
  readonly specifiers: Map<string, string>;
}

interface RawDecl {
  readonly id: StructuralClaimId;
  readonly name: string;
  readonly file: string;
  readonly fileId: StructuralClaimId;
  readonly kind: StructuralDeclarationKind;
  readonly line: number;
  readonly exported: boolean;
  readonly typeParams: readonly string[];
  readonly aliasBody: string | null;
  readonly literalValues: readonly string[] | null;
  readonly node: ts.Node;
  readonly sourceFile: ts.SourceFile;
}

interface AliasInfo {
  readonly aliasBody: string;
  readonly literalValues?: readonly string[];
}

interface MemberInfo {
  readonly name: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  readonly memberKind: MemberKind;
  readonly value?: string;
}

interface RawTypeReference {
  readonly targetName: string;
  readonly targetFile: string;
  readonly refKind: RefKind;
  readonly context?: string;
}

interface RawImportObservation {
  readonly id: StructuralClaimId;
  readonly sourceFile: string;
  readonly sourceFileId: StructuralClaimId;
  readonly specifier: string;
  readonly bindings: readonly string[];
  readonly typeOnly: boolean;
  readonly line: number;
  readonly start: number;
  readonly observationKind: ImportObservationKind;
  readonly resolution: {
    readonly status: ResolutionStatus;
    readonly targetFile: string | null;
    readonly externalPackage: string | null;
    readonly dtsTarget: boolean;
  };
}

interface RawImportBinding {
  readonly id: StructuralClaimId;
  readonly importId: StructuralClaimId;
  readonly sourceFile: string;
  readonly sourceFileId: StructuralClaimId;
  readonly localName: string;
  readonly importedName: string;
  readonly line: number;
  readonly typeOnly: boolean;
  readonly specifier: string;
  readonly targetFile: string | null;
}

interface RawExportObservation {
  readonly id: StructuralClaimId;
  readonly sourceFile: string;
  readonly sourceFileId: StructuralClaimId;
  readonly observationKind: ExportObservationKind;
  readonly exportedName: string | null;
  readonly originalName: string | null;
  readonly line: number;
  readonly typeOnly: boolean;
  readonly specifier: string | null;
  readonly targetFile: string | null;
}

interface RawSourceModuleObservations {
  readonly imports: readonly RawImportObservation[];
  readonly importBindings: readonly RawImportBinding[];
  readonly exportObservations: readonly RawExportObservation[];
}

const MAX_ALIAS_BODY_LEN = 800;

const BUILTIN_TYPES = new Set([
  'string', 'number', 'boolean', 'void', 'undefined', 'null', 'never', 'any',
  'unknown', 'object', 'bigint', 'symbol', 'this',
  'String', 'Number', 'Boolean', 'Object', 'Symbol', 'BigInt', 'Function',
  'Array', 'ReadonlyArray', 'Map', 'ReadonlyMap', 'Set', 'ReadonlySet',
  'WeakMap', 'WeakSet', 'Promise', 'PromiseLike',
  'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude',
  'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'ConstructorParameters',
  'InstanceType', 'ThisParameterType', 'OmitThisParameter',
  'Uppercase', 'Lowercase', 'Capitalize', 'Uncapitalize',
  'Awaited', 'NoInfer',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'JSON', 'Math', 'console',
  'Iterable', 'IterableIterator', 'Iterator', 'AsyncIterable', 'AsyncIterableIterator',
  'Generator', 'AsyncGenerator',
  'ArrayLike', 'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
  'TemplateStringsArray', 'PropertyKey', 'PropertyDescriptor',
  'ProxyHandler', 'Proxy', 'Reflect',
  'Element', 'HTMLElement', 'Node', 'Document', 'Event', 'EventTarget',
  'NodeList', 'HTMLCollection',
  'Response', 'Request', 'Headers', 'URL', 'URLSearchParams',
  'AbortController', 'AbortSignal',
  'MessagePort', 'MessageChannel',
  'Performance', 'TextEncoder', 'TextDecoder',
  'Buffer',
]);

export function buildStructuralClaimGraph(
  session: RepoSession,
  options: StructuralClaimGraphOptions = {},
): StructuralClaimGraphRuntime {
  const warnings = new Set<string>();
  const loadedTsconfigs = loadTsconfigSnapshots(session, warnings);
  const sourceFileScan = options.sourceFileScan ?? scanParsedTsconfigSourceFiles(session);
  for (const warning of sourceFileScan.warnings) {
    warnings.add(warning);
  }

  const sourceFilesByPath = collectSourceFiles(sourceFileScan.batches);
  const sourceFileIds = new Map<string, StructuralClaimId>();
  for (const filePath of sourceFilesByPath.keys()) {
    sourceFileIds.set(filePath, sourceFileClaimId(filePath));
  }

  const sourceFileToTsconfigIds = new Map<string, Set<StructuralClaimId>>();
  const claims = new Map<StructuralClaimId, StructuralClaim>();
  const packageDescriptors = loadPackageDescriptors(session);
  const workspacePackageEntrypointsByName = new Map<string, string>();

  for (const descriptor of packageDescriptors) {
    workspacePackageEntrypointsByName.set(
      descriptor.packageName,
      descriptor.sourceEntrypoint ?? descriptor.analysisEntrypoint,
    );
  }

  for (const descriptor of packageDescriptors) {
    const packageId = packageClaimId(descriptor.packageDir);
    claims.set(packageId, createPackageClaim(packageId, descriptor));
    claims.set(
      packageEntrypointClaimId(descriptor.packageDir, descriptor.analysisEntrypoint),
      createPackageEntrypointClaim(packageId, descriptor),
    );
  }

  for (const batch of sourceFileScan.batches) {
    const tsconfigId = tsconfigClaimId(batch.snapshot.relPath);
    for (const sourceFile of batch.sourceFiles) {
      const sourceFileId = sourceFileIds.get(sourceFile.relPath) ?? sourceFileClaimId(sourceFile.relPath);
      let memberships = sourceFileToTsconfigIds.get(sourceFile.relPath);
      if (!memberships) {
        memberships = new Set();
        sourceFileToTsconfigIds.set(sourceFile.relPath, memberships);
      }
      memberships.add(tsconfigId);
      claims.set(
        projectSourceFileClaimId(batch.snapshot.relPath, sourceFile.relPath),
        createProjectSourceFileClaim(
          batch.snapshot.relPath,
          sourceFile.relPath,
          sourceFileId,
        ),
      );
    }
  }

  for (const snapshot of loadedTsconfigs.values()) {
    claims.set(
      tsconfigClaimId(snapshot.relPath),
      createTsconfigClaim(session, snapshot, sourceFileToTsconfigIds),
    );
  }

  for (const filePath of sourceFilesByPath.keys()) {
    const tsconfigIds = [...(sourceFileToTsconfigIds.get(filePath) ?? new Set())].sort();
    claims.set(
      sourceFileIds.get(filePath)!,
      createSourceFileClaim(filePath, tsconfigIds),
    );
  }

  const {
    imports: rawImportObservations,
    importBindings: rawImportBindings,
    exportObservations: rawExportObservations,
  } = collectRawModuleObservations(
    session,
    sourceFileScan.batches,
    sourceFilesByPath,
    sourceFileIds,
    workspacePackageEntrypointsByName,
  );
  const barrelFiles = collectBarrelFiles(sourceFilesByPath);
  for (const observation of rawImportObservations) {
    claims.set(
      observation.id,
      createImportClaim(observation),
    );
    claims.set(
      resolutionClaimId(observation.id),
      createResolutionClaim(
        observation,
        sourceFileIds,
        barrelFiles,
      ),
    );
  }
  for (const binding of rawImportBindings) {
    claims.set(
      binding.id,
      createImportBindingClaim(binding, sourceFileIds),
    );
  }
  for (const observation of rawExportObservations) {
    claims.set(
      observation.id,
      createExportObservationClaim(observation, sourceFileIds),
    );
  }

  const {
    declarations,
    members,
    typeReferences,
  } = collectTypeClaims(sourceFilesByPath, sourceFileIds);
  for (const declaration of declarations) {
    claims.set(declaration.id, declaration);
  }
  for (const member of members) {
    claims.set(member.id, member);
  }
  for (const typeReference of typeReferences) {
    claims.set(typeReference.id, typeReference);
  }

  claims.set(
    repoClaimId(),
    createRepoClaim(session, claims),
  );

  const graph: StructuralClaimGraph = {
    schemaVersion: STRUCTURAL_CLAIM_GRAPH_VERSION,
    repoPath: session.repoPath,
    target: session.target,
    warnings: [...warnings],
    claims: [...claims.values()],
  };

  return {
    graph,
    index: indexStructuralClaimGraph(graph),
  };
}

export function indexStructuralClaimGraph(
  graph: StructuralClaimGraph,
): StructuralClaimGraphIndex {
  const byId = new Map<StructuralClaimId, StructuralClaim>();
  const packages: PackageClaim[] = [];
  const packageEntrypoints: PackageEntrypointClaim[] = [];
  const tsconfigs: TsconfigClaim[] = [];
  const sourceFiles: SourceFileClaim[] = [];
  const projectSourceFiles: ProjectSourceFileClaim[] = [];
  const imports: ImportClaim[] = [];
  const importBindings: ImportBindingClaim[] = [];
  const resolutions: ResolutionClaim[] = [];
  const exportObservations: ExportObservationClaim[] = [];
  const declarations: DeclarationClaim[] = [];
  const members: MemberClaim[] = [];
  const typeReferences: TypeReferenceClaim[] = [];

  const sourceFileByPath = new Map<string, SourceFileClaim>();
  const projectSourceFilesByFilePath = new Map<string, ProjectSourceFileClaim[]>();
  const importsBySourceFilePath = new Map<string, ImportClaim[]>();
  const importBindingsBySourceFilePath = new Map<string, ImportBindingClaim[]>();
  const importBindingsByFileAndLocalName = new Map<string, Map<string, ImportBindingClaim>>();
  const resolutionByImportId = new Map<StructuralClaimId, ResolutionClaim>();
  const exportObservationsBySourceFilePath = new Map<string, ExportObservationClaim[]>();
  const declarationsByFilePath = new Map<string, DeclarationClaim[]>();
  const membersByDeclarationId = new Map<StructuralClaimId, MemberClaim[]>();
  const typeReferencesByDeclarationId = new Map<StructuralClaimId, TypeReferenceClaim[]>();

  let repo: RepoClaim | null = null;

  for (const claim of graph.claims) {
    byId.set(claim.id, claim);
    switch (claim.kind) {
      case 'repo':
        repo = claim;
        break;
      case 'package':
        packages.push(claim);
        break;
      case 'package-entrypoint':
        packageEntrypoints.push(claim);
        break;
      case 'tsconfig':
        tsconfigs.push(claim);
        break;
      case 'source-file':
        sourceFiles.push(claim);
        sourceFileByPath.set(claim.attributes.filePath, claim);
        break;
      case 'project-source-file': {
        projectSourceFiles.push(claim);
        const current = projectSourceFilesByFilePath.get(claim.attributes.filePath) ?? [];
        current.push(claim);
        projectSourceFilesByFilePath.set(claim.attributes.filePath, current);
        break;
      }
      case 'import': {
        imports.push(claim);
        const current = importsBySourceFilePath.get(claim.attributes.sourceFile) ?? [];
        current.push(claim);
        importsBySourceFilePath.set(claim.attributes.sourceFile, current);
        break;
      }
      case 'import-binding': {
        importBindings.push(claim);
        const current = importBindingsBySourceFilePath.get(claim.attributes.sourceFile) ?? [];
        current.push(claim);
        importBindingsBySourceFilePath.set(claim.attributes.sourceFile, current);

        let fileBindings = importBindingsByFileAndLocalName.get(claim.attributes.sourceFile);
        if (!fileBindings) {
          fileBindings = new Map();
          importBindingsByFileAndLocalName.set(claim.attributes.sourceFile, fileBindings);
        }
        fileBindings.set(claim.attributes.localName, claim);
        break;
      }
      case 'resolution':
        resolutions.push(claim);
        resolutionByImportId.set(claim.attributes.importId, claim);
        break;
      case 'export-observation': {
        exportObservations.push(claim);
        const current = exportObservationsBySourceFilePath.get(claim.attributes.sourceFile) ?? [];
        current.push(claim);
        exportObservationsBySourceFilePath.set(claim.attributes.sourceFile, current);
        break;
      }
      case 'declaration': {
        declarations.push(claim);
        const current = declarationsByFilePath.get(claim.attributes.filePath) ?? [];
        current.push(claim);
        declarationsByFilePath.set(claim.attributes.filePath, current);
        break;
      }
      case 'member': {
        members.push(claim);
        const current = membersByDeclarationId.get(claim.attributes.declarationId) ?? [];
        current.push(claim);
        membersByDeclarationId.set(claim.attributes.declarationId, current);
        break;
      }
      case 'type-reference': {
        typeReferences.push(claim);
        const current = typeReferencesByDeclarationId.get(claim.attributes.declarationId) ?? [];
        current.push(claim);
        typeReferencesByDeclarationId.set(claim.attributes.declarationId, current);
        break;
      }
    }
  }

  for (const current of projectSourceFilesByFilePath.values()) {
    current.sort((left, right) => left.attributes.filePath.localeCompare(right.attributes.filePath));
  }
  for (const current of importsBySourceFilePath.values()) {
    current.sort((left, right) => left.attributes.start - right.attributes.start);
  }
  for (const current of importBindingsBySourceFilePath.values()) {
    current.sort((left, right) => left.attributes.line - right.attributes.line);
  }
  for (const current of exportObservationsBySourceFilePath.values()) {
    current.sort((left, right) => left.attributes.line - right.attributes.line);
  }
  for (const current of declarationsByFilePath.values()) {
    current.sort((left, right) => left.attributes.line - right.attributes.line);
  }

  return {
    byId,
    repo,
    packages: packages.sort((left, right) => left.attributes.packageName.localeCompare(right.attributes.packageName)),
    packageEntrypoints,
    tsconfigs: tsconfigs.sort((left, right) => left.attributes.tsconfigPath.localeCompare(right.attributes.tsconfigPath)),
    sourceFiles: sourceFiles.sort((left, right) => left.attributes.filePath.localeCompare(right.attributes.filePath)),
    projectSourceFiles: projectSourceFiles,
    imports,
    importBindings,
    resolutions,
    exportObservations,
    declarations: declarations.sort((left, right) =>
      left.attributes.filePath.localeCompare(right.attributes.filePath)
      || left.attributes.line - right.attributes.line,
    ),
    members,
    typeReferences,
    sourceFileByPath,
    projectSourceFilesByFilePath,
    importsBySourceFilePath,
    importBindingsBySourceFilePath,
    importBindingsByFileAndLocalName,
    resolutionByImportId,
    exportObservationsBySourceFilePath,
    declarationsByFilePath,
    membersByDeclarationId,
    typeReferencesByDeclarationId,
  };
}

function loadTsconfigSnapshots(
  session: RepoSession,
  warnings: Set<string>,
): ReadonlyMap<string, LoadedTsconfigSnapshot> {
  const snapshots = new Map<string, LoadedTsconfigSnapshot>();
  for (const tsconfigAbsPath of session.findTsconfigs()) {
    const loaded = session.tryLoadTsconfig(tsconfigAbsPath);
    if (!loaded.snapshot) {
      warnings.add(`Warning: failed to read ${tsconfigAbsPath}: ${loaded.error ?? 'unknown error'}`);
      continue;
    }
    snapshots.set(loaded.snapshot.relPath, loaded.snapshot);
  }
  return snapshots;
}

function collectSourceFiles(
  batches: readonly ParsedTsconfigSourceFileBatch[],
): ReadonlyMap<string, ParsedTsconfigSourceFile> {
  const sourceFilesByPath = new Map<string, ParsedTsconfigSourceFile>();
  for (const batch of batches) {
    for (const sourceFile of batch.sourceFiles) {
      if (!sourceFilesByPath.has(sourceFile.relPath)) {
        sourceFilesByPath.set(sourceFile.relPath, sourceFile);
      }
    }
  }
  return sourceFilesByPath;
}

function createRepoClaim(
  session: RepoSession,
  claims: ReadonlyMap<StructuralClaimId, StructuralClaim>,
): RepoClaim {
  const packageCount = [...claims.values()].filter((claim) => claim.kind === 'package').length;
  const tsconfigCount = [...claims.values()].filter((claim) => claim.kind === 'tsconfig').length;
  const sourceFileCount = [...claims.values()].filter((claim) => claim.kind === 'source-file').length;
  return {
    id: repoClaimId(),
    kind: 'repo',
    subjectRef: '.',
    producerId: 'repo-structure',
    attributes: {
      profileId: session.profile.profileId,
      packageCount,
      tsconfigCount,
      sourceFileCount,
    },
    provenance: [{
      producerId: 'repo-structure',
      basis: 'repo-session',
      detail: `profile=${session.profile.profileId}`,
    }],
  };
}

function createPackageClaim(
  id: StructuralClaimId,
  descriptor: PackageDescriptor,
): PackageClaim {
  return {
    id,
    kind: 'package',
    subjectRef: descriptor.packageName,
    producerId: 'package-structure',
    repoRelativePath: descriptor.packageDir,
    attributes: {
      packageName: descriptor.packageName,
      packageDir: descriptor.packageDir,
      packageJsonPath: descriptor.packageJsonPath,
      analysisBasis: descriptor.analysisBasis,
      analysisEntrypoint: descriptor.analysisEntrypoint,
      sourceEntrypoint: descriptor.sourceEntrypoint,
      publicTypesEntrypoint: descriptor.publicTypesEntrypoint,
    },
    provenance: [{
      producerId: 'package-structure',
      basis: 'package-descriptor',
      repoRelativePath: descriptor.packageJsonPath,
    }],
  };
}

function createPackageEntrypointClaim(
  packageId: StructuralClaimId,
  descriptor: PackageDescriptor,
): PackageEntrypointClaim {
  return {
    id: packageEntrypointClaimId(descriptor.packageDir, descriptor.analysisEntrypoint),
    kind: 'package-entrypoint',
    subjectRef: descriptor.analysisEntrypoint,
    producerId: 'package-structure',
    repoRelativePath: descriptor.analysisEntrypoint,
    relatedClaimIds: [packageId],
    attributes: {
      packageId,
      packageName: descriptor.packageName,
      packageDir: descriptor.packageDir,
      entrypoint: descriptor.analysisEntrypoint,
      basis: descriptor.analysisBasis,
    },
    provenance: [{
      producerId: 'package-structure',
      basis: 'package-descriptor',
      repoRelativePath: descriptor.packageJsonPath,
    }],
  };
}

function createTsconfigClaim(
  session: RepoSession,
  snapshot: LoadedTsconfigSnapshot,
  sourceFileToTsconfigIds: ReadonlyMap<string, Set<StructuralClaimId>>,
): TsconfigClaim {
  const tsconfigId = tsconfigClaimId(snapshot.relPath);
  const sourceFileCount = [...sourceFileToTsconfigIds.values()]
    .filter((claimIds) => claimIds.has(tsconfigId))
    .length;
  return {
    id: tsconfigId,
    kind: 'tsconfig',
    subjectRef: snapshot.relPath,
    producerId: 'tsconfig-project-graph',
    repoRelativePath: snapshot.relPath,
    attributes: {
      tsconfigPath: snapshot.relPath,
      sourceFileCount,
      projectReferenceTargets: (snapshot.parsed.projectReferences ?? [])
        .map((reference) => toRepoRelative(session.repoPath, reference.path))
        .sort(),
    },
    provenance: [{
      producerId: 'tsconfig-project-graph',
      basis: 'tsconfig',
      repoRelativePath: snapshot.relPath,
    }],
  };
}

function createSourceFileClaim(
  filePath: string,
  tsconfigIds: readonly StructuralClaimId[],
): SourceFileClaim {
  return {
    id: sourceFileClaimId(filePath),
    kind: 'source-file',
    subjectRef: filePath,
    producerId: 'source-file-catalog',
    repoRelativePath: filePath,
    relatedClaimIds: tsconfigIds,
    attributes: {
      filePath,
      tsconfigIds,
    },
    provenance: [{
      producerId: 'source-file-catalog',
      basis: 'parsed-source-file',
      repoRelativePath: filePath,
    }],
  };
}

function createProjectSourceFileClaim(
  tsconfigPath: string,
  filePath: string,
  sourceFileId: StructuralClaimId,
): ProjectSourceFileClaim {
  const tsconfigId = tsconfigClaimId(tsconfigPath);
  return {
    id: projectSourceFileClaimId(tsconfigPath, filePath),
    kind: 'project-source-file',
    subjectRef: `${tsconfigPath} -> ${filePath}`,
    producerId: 'tsconfig-project-graph',
    repoRelativePath: filePath,
    relatedClaimIds: [tsconfigId, sourceFileId],
    attributes: {
      filePath,
      sourceFileId,
      tsconfigId,
    },
    provenance: [{
      producerId: 'tsconfig-project-graph',
      basis: 'tsconfig',
      repoRelativePath: tsconfigPath,
      detail: filePath,
    }],
  };
}

function createImportClaim(
  observation: RawImportObservation,
): ImportClaim {
  return {
    id: observation.id,
    kind: 'import',
    subjectRef: `${observation.sourceFile}:${observation.line}:${observation.specifier}`,
    producerId: 'import-resolution',
    repoRelativePath: observation.sourceFile,
    relatedClaimIds: [observation.sourceFileId],
    attributes: {
      sourceFile: observation.sourceFile,
      sourceFileId: observation.sourceFileId,
      specifier: observation.specifier,
      bindings: observation.bindings,
      typeOnly: observation.typeOnly,
      line: observation.line,
      start: observation.start,
      observationKind: observation.observationKind,
    },
    provenance: [{
      producerId: 'import-resolution',
      basis: 'parsed-source-file',
      repoRelativePath: observation.sourceFile,
      line: observation.line,
    }],
  };
}

function createResolutionClaim(
  observation: RawImportObservation,
  sourceFileIds: ReadonlyMap<string, StructuralClaimId>,
  barrelFiles: ReadonlySet<string>,
): ResolutionClaim {
  const targetFileId = observation.resolution.targetFile
    ? (sourceFileIds.get(observation.resolution.targetFile) ?? null)
    : null;
  return {
    id: resolutionClaimId(observation.id),
    kind: 'resolution',
    subjectRef: `${observation.sourceFile}:${observation.line}:${observation.specifier}`,
    producerId: 'import-resolution',
    repoRelativePath: observation.sourceFile,
    relatedClaimIds: targetFileId
      ? [observation.id, observation.sourceFileId, targetFileId]
      : [observation.id, observation.sourceFileId],
    attributes: {
      importId: observation.id,
      status: observation.resolution.status,
      sourceFile: observation.sourceFile,
      specifier: observation.specifier,
      targetFile: observation.resolution.targetFile,
      targetFileId,
      externalPackage: observation.resolution.externalPackage,
      dtsTarget: observation.resolution.dtsTarget,
      viaBarrel: observation.resolution.targetFile
        ? barrelFiles.has(observation.resolution.targetFile)
        : false,
    },
    provenance: [{
      producerId: 'import-resolution',
      basis: 'module-resolution',
      repoRelativePath: observation.sourceFile,
      line: observation.line,
      detail: observation.specifier,
    }],
  };
}

function createImportBindingClaim(
  binding: RawImportBinding,
  sourceFileIds: ReadonlyMap<string, StructuralClaimId>,
): ImportBindingClaim {
  const targetFileId = binding.targetFile
    ? (sourceFileIds.get(binding.targetFile) ?? null)
    : null;
  return {
    id: binding.id,
    kind: 'import-binding',
    subjectRef: `${binding.sourceFile}:${binding.localName}`,
    producerId: 'import-resolution',
    repoRelativePath: binding.sourceFile,
    relatedClaimIds: targetFileId
      ? [binding.importId, binding.sourceFileId, targetFileId]
      : [binding.importId, binding.sourceFileId],
    attributes: {
      importId: binding.importId,
      sourceFile: binding.sourceFile,
      sourceFileId: binding.sourceFileId,
      localName: binding.localName,
      importedName: binding.importedName,
      line: binding.line,
      typeOnly: binding.typeOnly,
      specifier: binding.specifier,
      targetFile: binding.targetFile,
      targetFileId,
    },
    provenance: [{
      producerId: 'import-resolution',
      basis: 'parsed-source-file',
      repoRelativePath: binding.sourceFile,
      line: binding.line,
      detail: `${binding.localName}<-${binding.importedName}`,
    }],
  };
}

function createExportObservationClaim(
  observation: RawExportObservation,
  sourceFileIds: ReadonlyMap<string, StructuralClaimId>,
): ExportObservationClaim {
  const targetFileId = observation.targetFile
    ? (sourceFileIds.get(observation.targetFile) ?? null)
    : null;
  return {
    id: observation.id,
    kind: 'export-observation',
    subjectRef: `${observation.sourceFile}:${observation.line}:${observation.observationKind}:${observation.exportedName ?? '*'}`,
    producerId: 'export-structure',
    repoRelativePath: observation.sourceFile,
    relatedClaimIds: targetFileId
      ? [observation.sourceFileId, targetFileId]
      : [observation.sourceFileId],
    attributes: {
      sourceFile: observation.sourceFile,
      sourceFileId: observation.sourceFileId,
      observationKind: observation.observationKind,
      exportedName: observation.exportedName,
      originalName: observation.originalName,
      line: observation.line,
      typeOnly: observation.typeOnly,
      specifier: observation.specifier,
      targetFile: observation.targetFile,
      targetFileId,
    },
    provenance: [{
      producerId: 'export-structure',
      basis: 'parsed-source-file',
      repoRelativePath: observation.sourceFile,
      line: observation.line,
      detail: observation.specifier ?? observation.originalName ?? observation.exportedName ?? observation.observationKind,
    }],
  };
}

function collectRawModuleObservations(
  session: RepoSession,
  batches: readonly ParsedTsconfigSourceFileBatch[],
  sourceFilesByPath: ReadonlyMap<string, ParsedTsconfigSourceFile>,
  sourceFileIds: ReadonlyMap<string, StructuralClaimId>,
  workspacePackageEntrypointsByName: ReadonlyMap<string, string>,
): RawSourceModuleObservations {
  const imports: RawImportObservation[] = [];
  const importBindings: RawImportBinding[] = [];
  const exportObservations: RawExportObservation[] = [];
  const analyzed = new Set<string>();
  const repoPath = session.repoPath;
  const resolutionHost: ts.ModuleResolutionHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    directoryExists: ts.sys.directoryExists,
    getCurrentDirectory: () => repoPath,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
  };

  for (const batch of batches) {
    const resolutionCache = ts.createModuleResolutionCache(
      batch.snapshot.configDir,
      (fileName) => fileName.toLowerCase(),
      batch.snapshot.parsed.options,
    );
    for (const sourceFile of batch.sourceFiles) {
      if (analyzed.has(sourceFile.relPath)) {
        continue;
      }
      analyzed.add(sourceFile.relPath);
      const fileObservations = extractRawModuleObservationsForSourceFile(
        session,
        sourceFile,
        sourceFileIds.get(sourceFile.relPath) ?? sourceFileClaimId(sourceFile.relPath),
        batch.snapshot.parsed.options,
        resolutionHost,
        resolutionCache,
        sourceFilesByPath,
        workspacePackageEntrypointsByName,
      );
      imports.push(...fileObservations.imports);
      importBindings.push(...fileObservations.importBindings);
      exportObservations.push(...fileObservations.exportObservations);
    }
  }

  return {
    imports,
    importBindings,
    exportObservations,
  };
}

function extractRawModuleObservationsForSourceFile(
  session: RepoSession,
  file: ParsedTsconfigSourceFile,
  sourceFileId: StructuralClaimId,
  compilerOptions: ts.CompilerOptions,
  resolutionHost: ts.ModuleResolutionHost,
  resolutionCache: ts.ModuleResolutionCache,
  sourceFilesByPath: ReadonlyMap<string, ParsedTsconfigSourceFile>,
  workspacePackageEntrypointsByName: ReadonlyMap<string, string>,
): RawSourceModuleObservations {
  const observations: RawImportObservation[] = [];
  const importBindings: RawImportBinding[] = [];
  const exportObservations: RawExportObservation[] = [];
  const sourceFile = file.sourceFile;
  const repoPath = session.repoPath;

  function extractBindings(node: ts.ImportDeclaration | ts.ExportDeclaration): string[] {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (!clause) return [];
      const bindings: string[] = [];
      if (clause.name) bindings.push('default');
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          bindings.push('*');
        } else {
          for (const element of clause.namedBindings.elements) {
            bindings.push((element.propertyName ?? element.name).text);
          }
        }
      }
      return bindings.sort();
    }
    if (!node.exportClause) return ['*'];
    if (ts.isNamedExports(node.exportClause)) {
      return node.exportClause.elements
        .map((element) => (element.propertyName ?? element.name).text)
        .sort();
    }
    return [];
  }

  function resolveImport(specifier: string): RawImportObservation['resolution'] {
    if (!specifier.startsWith('.')) {
      const workspaceEntrypoint = workspacePackageEntrypointsByName.get(specifier);
      if (workspaceEntrypoint) {
        return {
          status: 'internal',
          targetFile: workspaceEntrypoint,
          externalPackage: null,
          dtsTarget: workspaceEntrypoint.endsWith('.d.ts'),
        };
      }
    }

    const resolved = ts.resolveModuleName(
      specifier,
      sourceFile.fileName,
      compilerOptions,
      resolutionHost,
      resolutionCache,
    );

    if (resolved.resolvedModule) {
      const resolvedModule = resolved.resolvedModule;
      if (resolvedModule.isExternalLibraryImport) {
        let realTarget: string | null = null;
        try {
          const realPath = toForwardSlash(realpathSync(resolvedModule.resolvedFileName));
          const relPath = toRepoRelative(repoPath, realPath);
          if (
            !relPath.startsWith('..')
            && !session.isInSubmodule(relPath)
            && !session.isExcludedRepoRelativePath(relPath)
            && !relPath.includes('node_modules/')
            && sourceFilesByPath.has(relPath)
          ) {
            realTarget = relPath;
          }
        } catch {
          realTarget = null;
        }
        if (realTarget) {
          return {
            status: 'internal',
            targetFile: realTarget,
            externalPackage: null,
            dtsTarget: realTarget.endsWith('.d.ts'),
          };
        }
        return {
          status: 'external',
          targetFile: null,
          externalPackage: getPackageName(specifier),
          dtsTarget: false,
        };
      }

      const targetFile = toRepoRelative(repoPath, resolvedModule.resolvedFileName);
      if (
        targetFile.startsWith('..')
        || session.isInSubmodule(targetFile)
        || session.isExcludedRepoRelativePath(targetFile)
        || targetFile.includes('node_modules/')
      ) {
        return {
          status: 'external',
          targetFile: null,
          externalPackage: session.isExcludedRepoRelativePath(targetFile)
            ? null
            : getPackageName(specifier),
          dtsTarget: false,
        };
      }

      return {
        status: 'internal',
        targetFile,
        externalPackage: null,
        dtsTarget: resolvedModule.resolvedFileName.endsWith('.d.ts'),
      };
    }

    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return {
        status: 'unresolved',
        targetFile: null,
        externalPackage: null,
        dtsTarget: false,
      };
    }

    return {
      status: 'external',
      targetFile: null,
      externalPackage: getPackageName(specifier),
      dtsTarget: false,
    };
  }

  function addImportObservation(
    specifier: string,
    bindings: readonly string[],
    typeOnly: boolean,
    node: ts.Node,
    observationKind: ImportObservationKind,
  ): RawImportObservation {
    const start = node.getStart(sourceFile);
    const line = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
    const observation: RawImportObservation = {
      id: importClaimId(file.relPath, start),
      sourceFile: file.relPath,
      sourceFileId,
      specifier,
      bindings,
      typeOnly,
      line,
      start,
      observationKind,
      resolution: resolveImport(specifier),
    };
    observations.push(observation);
    return observation;
  }

  function addImportBinding(
    importId: StructuralClaimId,
    localName: string,
    importedName: string,
    line: number,
    typeOnly: boolean,
    specifier: string,
    targetFile: string | null,
  ): void {
    importBindings.push({
      id: importBindingClaimId(importId, localName),
      importId,
      sourceFile: file.relPath,
      sourceFileId,
      localName,
      importedName,
      line,
      typeOnly,
      specifier,
      targetFile,
    });
  }

  function addExportObservation(
    node: ts.Node,
    observationKind: ExportObservationKind,
    exportedName: string | null,
    originalName: string | null,
    typeOnly: boolean,
    specifier: string | null,
    targetFile: string | null,
  ): void {
    const start = node.getStart(sourceFile);
    exportObservations.push({
      id: exportObservationClaimId(file.relPath, start, observationKind, exportedName),
      sourceFile: file.relPath,
      sourceFileId,
      observationKind,
      exportedName,
      originalName,
      line: sourceFile.getLineAndCharacterOfPosition(start).line + 1,
      typeOnly,
      specifier,
      targetFile,
    });
  }

  ts.forEachChild(sourceFile, function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const observation = addImportObservation(
        node.moduleSpecifier.text,
        extractBindings(node),
        node.importClause?.isTypeOnly ?? false,
        node,
        'import',
      );
      const specifier = node.moduleSpecifier.text;
      const targetFile = observation.resolution.targetFile;
      const clause = node.importClause;
      if (clause) {
        const baseTypeOnly = clause.isTypeOnly;
        const importLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        if (clause.name) {
          addImportBinding(
            observation.id,
            clause.name.text,
            'default',
            importLine,
            baseTypeOnly,
            specifier,
            targetFile,
          );
        }

        if (clause.namedBindings) {
          if (ts.isNamedImports(clause.namedBindings)) {
            for (const element of clause.namedBindings.elements) {
              addImportBinding(
                observation.id,
                element.name.text,
                (element.propertyName ?? element.name).text,
                sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile)).line + 1,
                baseTypeOnly || element.isTypeOnly,
                specifier,
                targetFile,
              );
            }
          } else if (ts.isNamespaceImport(clause.namedBindings)) {
            addImportBinding(
              observation.id,
              clause.namedBindings.name.text,
              '*',
              sourceFile.getLineAndCharacterOfPosition(clause.namedBindings.getStart(sourceFile)).line + 1,
              baseTypeOnly,
              specifier,
              targetFile,
            );
          }
        }
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const observation = addImportObservation(
        node.moduleSpecifier.text,
        extractBindings(node),
        node.isTypeOnly,
        node,
        'reexport',
      );
      const specifier = node.moduleSpecifier.text;
      const targetFile = observation.resolution.targetFile;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          addExportObservation(
            element,
            'named-reexport',
            element.name.text,
            (element.propertyName ?? element.name).text,
            node.isTypeOnly || element.isTypeOnly,
            specifier,
            targetFile,
          );
        }
      } else if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        addExportObservation(
          node.exportClause,
          'namespace-reexport',
          node.exportClause.name.text,
          node.exportClause.name.text,
          false,
          specifier,
          targetFile,
        );
      } else if (!node.exportClause) {
        addExportObservation(
          node,
          'star-reexport',
          null,
          null,
          node.isTypeOnly,
          specifier,
          targetFile,
        );
      }
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && !node.moduleSpecifier) {
      for (const element of node.exportClause.elements) {
        addExportObservation(
          element,
          'local-export',
          element.name.text,
          (element.propertyName ?? element.name).text,
          node.isTypeOnly || element.isTypeOnly,
          null,
          null,
        );
      }
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
      && ts.isStringLiteral(node.arguments[0]!)
    ) {
      addImportObservation(
        node.arguments[0].text,
        [],
        false,
        node,
        'dynamic-import',
      );
    }
    ts.forEachChild(node, visit);
  });

  return {
    imports: observations,
    importBindings,
    exportObservations,
  };
}

function collectBarrelFiles(
  sourceFilesByPath: ReadonlyMap<string, ParsedTsconfigSourceFile>,
): ReadonlySet<string> {
  const barrelFiles = new Set<string>();
  for (const [filePath, sourceFile] of sourceFilesByPath.entries()) {
    if (!filePath.endsWith('/index.ts') && filePath !== 'index.ts') {
      continue;
    }
    let hasReexports = false;
    let isPureBarrel = true;
    for (const statement of sourceFile.sourceFile.statements) {
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
        hasReexports = true;
        continue;
      }
      if (ts.isImportDeclaration(statement)) {
        continue;
      }
      isPureBarrel = false;
      break;
    }
    if (hasReexports && isPureBarrel) {
      barrelFiles.add(filePath);
    }
  }
  return barrelFiles;
}

function collectTypeClaims(
  sourceFilesByPath: ReadonlyMap<string, ParsedTsconfigSourceFile>,
  sourceFileIds: ReadonlyMap<string, StructuralClaimId>,
): {
  readonly declarations: readonly DeclarationClaim[];
  readonly members: readonly MemberClaim[];
  readonly typeReferences: readonly TypeReferenceClaim[];
} {
  const fileImports = new Map<string, ImportInfo>();
  const typeIndex = new Map<string, Set<string>>();
  const rawDeclarations: RawDecl[] = [];

  for (const [filePath, parsedSourceFile] of sourceFilesByPath.entries()) {
    const importInfo: ImportInfo = {
      names: new Map(),
      specifiers: new Map(),
    };

    ts.forEachChild(parsedSourceFile.sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node)
        && node.moduleSpecifier
        && ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const clause = node.importClause;
        if (clause) {
          if (clause.name) {
            importInfo.names.set(clause.name.text, 'default');
            importInfo.specifiers.set(clause.name.text, specifier);
          }
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const element of clause.namedBindings.elements) {
                const localName = element.name.text;
                const importedName = (element.propertyName ?? element.name).text;
                importInfo.names.set(localName, importedName);
                importInfo.specifiers.set(localName, specifier);
              }
            }
          }
        }
      }

      const rawDeclarationsForNode = createRawDeclarations(
        node,
        parsedSourceFile.sourceFile,
        filePath,
        sourceFileIds.get(filePath) ?? sourceFileClaimId(filePath),
      );
      if (rawDeclarationsForNode.length === 0) {
        return;
      }

      for (const rawDeclaration of rawDeclarationsForNode) {
        if (isTypeShapeDeclarationKind(rawDeclaration.kind)) {
          addToTypeIndex(typeIndex, rawDeclaration.name, filePath);
        }
        rawDeclarations.push(rawDeclaration);
      }
    });

    fileImports.set(filePath, importInfo);
  }

  const declarationIdsByNameAndFile = new Map<string, StructuralClaimId>();
  for (const rawDeclaration of rawDeclarations
    .slice()
    .sort((left, right) => left.line - right.line)
  ) {
    if (!isTypeShapeDeclarationKind(rawDeclaration.kind)) {
      continue;
    }
    const key = `${rawDeclaration.file}\0${rawDeclaration.name}`;
    if (!declarationIdsByNameAndFile.has(key)) {
      declarationIdsByNameAndFile.set(key, rawDeclaration.id);
    }
  }

  const declarations: DeclarationClaim[] = [];
  const members: MemberClaim[] = [];
  const typeReferences: TypeReferenceClaim[] = [];

  for (const rawDeclaration of rawDeclarations) {
    declarations.push({
      id: rawDeclaration.id,
      kind: 'declaration',
      subjectRef: `${rawDeclaration.file}:${rawDeclaration.name}`,
      producerId: 'declaration-shape',
      repoRelativePath: rawDeclaration.file,
      relatedClaimIds: [rawDeclaration.fileId],
      attributes: {
        filePath: rawDeclaration.file,
        fileId: rawDeclaration.fileId,
        name: rawDeclaration.name,
        declarationKind: rawDeclaration.kind,
        line: rawDeclaration.line,
        exported: rawDeclaration.exported,
        typeParams: rawDeclaration.typeParams,
        aliasBody: rawDeclaration.aliasBody,
        literalValues: rawDeclaration.literalValues,
      },
      provenance: [{
        producerId: 'declaration-shape',
        basis: 'parsed-source-file',
        repoRelativePath: rawDeclaration.file,
        line: rawDeclaration.line,
      }],
    });

    extractMembers(rawDeclaration).forEach((member, index) => {
      members.push({
        id: memberClaimId(rawDeclaration.id, index),
        kind: 'member',
        subjectRef: `${rawDeclaration.file}:${rawDeclaration.name}.${member.name}`,
        producerId: 'declaration-shape',
        repoRelativePath: rawDeclaration.file,
        relatedClaimIds: [rawDeclaration.id],
        attributes: {
          declarationId: rawDeclaration.id,
          name: member.name,
          memberKind: member.memberKind,
          optional: member.optional,
          readonly: member.readonly,
          value: member.value ?? null,
        },
        provenance: [{
          producerId: 'declaration-shape',
          basis: 'parsed-source-file',
          repoRelativePath: rawDeclaration.file,
          line: rawDeclaration.line,
        }],
      });
    });

    extractRefs(rawDeclaration, typeIndex, fileImports).forEach((reference, index) => {
      const targetDeclarationId = declarationIdsByNameAndFile.get(`${reference.targetFile}\0${reference.targetName}`) ?? null;
      typeReferences.push({
        id: typeReferenceClaimId(rawDeclaration.id, index),
        kind: 'type-reference',
        subjectRef: `${rawDeclaration.name} -> ${reference.targetName}`,
        producerId: 'type-reference',
        repoRelativePath: rawDeclaration.file,
        relatedClaimIds: targetDeclarationId
          ? [rawDeclaration.id, targetDeclarationId]
          : [rawDeclaration.id],
        attributes: {
          declarationId: rawDeclaration.id,
          targetName: reference.targetName,
          targetFile: reference.targetFile,
          targetDeclarationId,
          refKind: reference.refKind,
          context: reference.context ?? null,
        },
        provenance: [{
          producerId: 'type-reference',
          basis: 'type-index',
          repoRelativePath: rawDeclaration.file,
          line: rawDeclaration.line,
          detail: reference.targetFile,
        }],
      });
    });
  }

  return {
    declarations,
    members,
    typeReferences,
  };
}

function createRawDeclarations(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filePath: string,
  fileId: StructuralClaimId,
): readonly RawDecl[] {
  if (ts.isInterfaceDeclaration(node)) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'interface', node.name.text)];
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'type', node.name.text)];
  }
  if (ts.isClassDeclaration(node) && node.name) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'class', node.name.text)];
  }
  if (ts.isEnumDeclaration(node)) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'enum', node.name.text)];
  }
  if (ts.isFunctionDeclaration(node) && node.name) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'function', node.name.text)];
  }
  if (ts.isModuleDeclaration(node) && ts.isIdentifier(node.name)) {
    return [rawDeclarationForNode(node, sourceFile, filePath, fileId, 'namespace', node.name.text)];
  }
  if (ts.isVariableStatement(node)) {
    const declarationKind = (ts.getCombinedNodeFlags(node.declarationList) & ts.NodeFlags.Const) !== 0
      ? 'const'
      : 'variable';
    return node.declarationList.declarations
      .filter((declaration): declaration is ts.VariableDeclaration & { name: ts.Identifier } => ts.isIdentifier(declaration.name))
      .map((declaration) =>
        rawDeclarationForNode(
          declaration,
          sourceFile,
          filePath,
          fileId,
          declarationKind,
          declaration.name.text,
        ),
      );
  }
  return [];
}

function rawDeclarationForNode(
  node:
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.ClassDeclaration
    | ts.EnumDeclaration
    | ts.FunctionDeclaration
    | ts.ModuleDeclaration
    | ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
  filePath: string,
  fileId: StructuralClaimId,
  declarationKind: StructuralDeclarationKind,
  name: string,
): RawDecl {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const aliasInfo = extractAliasInfo(node, sourceFile);
  return {
    id: declarationClaimId(filePath, line, name),
    name,
    file: filePath,
    fileId,
    kind: declarationKind,
    line,
    exported: isExported(node)
      || (ts.isVariableDeclaration(node)
        && ts.isVariableStatement(node.parent.parent)
        && isExported(node.parent.parent)),
    typeParams: getTypeParams(node),
    aliasBody: aliasInfo?.aliasBody ?? null,
    literalValues: aliasInfo?.literalValues ?? null,
    node,
    sourceFile,
  };
}

function extractAliasInfo(
  node:
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.ClassDeclaration
    | ts.EnumDeclaration
    | ts.FunctionDeclaration
    | ts.ModuleDeclaration
    | ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): AliasInfo | null {
  if (!ts.isTypeAliasDeclaration(node)) {
    return null;
  }

  let bodyText: string;
  try {
    bodyText = node.type.getText(sourceFile);
  } catch {
    return null;
  }

  if (bodyText.length > MAX_ALIAS_BODY_LEN) {
    bodyText = `${bodyText.slice(0, MAX_ALIAS_BODY_LEN)}…`;
  }

  let literalValues: string[] | undefined;
  if (ts.isUnionTypeNode(node.type)) {
    const collected: string[] = [];
    let allLiteral = true;
    for (const member of node.type.types) {
      if (ts.isLiteralTypeNode(member)) {
        if (ts.isStringLiteral(member.literal)) {
          collected.push(member.literal.text);
        } else if (ts.isNumericLiteral(member.literal)) {
          collected.push(member.literal.text);
        } else if (member.literal.kind === ts.SyntaxKind.TrueKeyword) {
          collected.push('true');
        } else if (member.literal.kind === ts.SyntaxKind.FalseKeyword) {
          collected.push('false');
        } else if (member.literal.kind === ts.SyntaxKind.NullKeyword) {
          collected.push('null');
        } else {
          allLiteral = false;
        }
      } else if (member.kind === ts.SyntaxKind.UndefinedKeyword) {
        collected.push('undefined');
      } else {
        allLiteral = false;
      }
    }
    if (allLiteral && collected.length > 0) {
      literalValues = collected;
    }
  }

  return {
    aliasBody: bodyText,
    ...(literalValues ? { literalValues } : {}),
  };
}

function extractMembers(rawDeclaration: RawDecl): readonly MemberInfo[] {
  const members: MemberInfo[] = [];

  function walkTypeElements(nodeMembers: ts.NodeArray<ts.TypeElement>): void {
    for (const member of nodeMembers) {
      if (ts.isPropertySignature(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: !!member.questionToken,
          readonly: hasReadonly(member),
          memberKind: 'field',
        });
      } else if (ts.isMethodSignature(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: !!member.questionToken,
          readonly: false,
          memberKind: 'method',
        });
      } else if (ts.isIndexSignatureDeclaration(member)) {
        members.push({
          name: '(index)',
          optional: false,
          readonly: hasReadonly(member),
          memberKind: 'index-sig',
        });
      } else if (ts.isCallSignatureDeclaration(member)) {
        members.push({
          name: '(call)',
          optional: false,
          readonly: false,
          memberKind: 'call-sig',
        });
      } else if (ts.isConstructSignatureDeclaration(member)) {
        members.push({
          name: '(construct)',
          optional: false,
          readonly: false,
          memberKind: 'construct-sig',
        });
      }
    }
  }

  function walkClassElements(nodeMembers: ts.NodeArray<ts.ClassElement>): void {
    for (const member of nodeMembers) {
      if (ts.isPropertyDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: !!member.questionToken,
          readonly: hasReadonly(member),
          memberKind: 'field',
        });
      } else if (ts.isMethodDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: false,
          readonly: false,
          memberKind: 'method',
        });
      } else if (ts.isGetAccessorDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: false,
          readonly: true,
          memberKind: 'getter',
        });
      } else if (ts.isSetAccessorDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? '(computed)',
          optional: false,
          readonly: false,
          memberKind: 'setter',
        });
      }
    }
  }

  if (ts.isInterfaceDeclaration(rawDeclaration.node)) {
    walkTypeElements(rawDeclaration.node.members);
  } else if (ts.isClassDeclaration(rawDeclaration.node)) {
    walkClassElements(rawDeclaration.node.members);
  } else if (ts.isTypeAliasDeclaration(rawDeclaration.node) && ts.isTypeLiteralNode(rawDeclaration.node.type)) {
    walkTypeElements(rawDeclaration.node.type.members);
  } else if (ts.isEnumDeclaration(rawDeclaration.node)) {
    for (const member of rawDeclaration.node.members) {
      const name = getNodeName(member.name as ts.PropertyName);
      if (!name) {
        continue;
      }
      let value: string | undefined;
      if (member.initializer) {
        try {
          value = member.initializer.getText(rawDeclaration.sourceFile);
        } catch {
          value = undefined;
        }
      }
      members.push({
        name,
        optional: false,
        readonly: true,
        memberKind: 'enum-member',
        ...(value ? { value } : {}),
      });
    }
  }

  return members;
}

function extractRefs(
  rawDeclaration: RawDecl,
  typeIndex: ReadonlyMap<string, ReadonlySet<string>>,
  fileImports: ReadonlyMap<string, ImportInfo>,
): readonly RawTypeReference[] {
  const refs: RawTypeReference[] = [];
  const seen = new Set<string>();

  function addRef(targetName: string, refKind: RefKind, context?: string): void {
    if (targetName === rawDeclaration.name) return;
    if (rawDeclaration.typeParams.includes(targetName)) return;
    if (BUILTIN_TYPES.has(targetName)) return;

    const targetFile = resolveTypeFile(targetName, rawDeclaration.file, typeIndex, fileImports);
    if (!targetFile) return;

    const key = `${targetName}\0${targetFile}\0${refKind}\0${context ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({
      targetName,
      targetFile,
      refKind,
      ...(context ? { context } : {}),
    });
  }

  function walkTypeNode(typeNode: ts.TypeNode, refKind: RefKind, context?: string): void {
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName;
      const name = ts.isIdentifier(typeName)
        ? typeName.text
        : ts.isQualifiedName(typeName)
          ? typeName.right.text
          : null;
      if (name) addRef(name, refKind, context);
      if (typeNode.typeArguments) {
        for (const argument of typeNode.typeArguments) {
          walkTypeNode(argument, 'type-arg', context);
        }
      }
      return;
    }
    if (ts.isUnionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        walkTypeNode(member, 'union-member', context);
      }
      return;
    }
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        walkTypeNode(member, 'intersection', context);
      }
      return;
    }
    if (ts.isArrayTypeNode(typeNode)) {
      walkTypeNode(typeNode.elementType, 'array-element', context);
      return;
    }
    if (ts.isTupleTypeNode(typeNode)) {
      for (const element of typeNode.elements) {
        walkTypeNode(ts.isNamedTupleMember(element) ? element.type : element, 'tuple-element', context);
      }
      return;
    }
    if (ts.isTypeLiteralNode(typeNode)) {
      walkTypeLiteralMembers(typeNode.members, context);
      return;
    }
    if (ts.isParenthesizedTypeNode(typeNode)) {
      walkTypeNode(typeNode.type, refKind, context);
      return;
    }
    if (ts.isMappedTypeNode(typeNode)) {
      if (typeNode.type) walkTypeNode(typeNode.type, 'mapped-value', context);
      if (typeNode.typeParameter.constraint) {
        walkTypeNode(typeNode.typeParameter.constraint, 'constraint', context);
      }
      return;
    }
    if (ts.isConditionalTypeNode(typeNode)) {
      walkTypeNode(typeNode.checkType, 'conditional', context);
      walkTypeNode(typeNode.extendsType, 'conditional', context);
      walkTypeNode(typeNode.trueType, 'conditional', context);
      walkTypeNode(typeNode.falseType, 'conditional', context);
      return;
    }
    if (ts.isIndexedAccessTypeNode(typeNode)) {
      walkTypeNode(typeNode.objectType, 'indexed-access', context);
      walkTypeNode(typeNode.indexType, 'indexed-access', context);
      return;
    }
    if (ts.isTypeOperatorNode(typeNode)) {
      walkTypeNode(
        typeNode.type,
        typeNode.operator === ts.SyntaxKind.KeyOfKeyword ? 'keyof-target' : refKind,
        context,
      );
      return;
    }
    if (ts.isTypeQueryNode(typeNode)) {
      const name = ts.isIdentifier(typeNode.exprName)
        ? typeNode.exprName.text
        : ts.isQualifiedName(typeNode.exprName)
          ? typeNode.exprName.right.text
          : null;
      if (name) addRef(name, 'typeof-target', context);
      return;
    }
    if (ts.isFunctionTypeNode(typeNode) || ts.isConstructorTypeNode(typeNode)) {
      for (const parameter of typeNode.parameters) {
        if (parameter.type) {
          walkTypeNode(parameter.type, 'param', getNodeName(parameter.name as ts.Identifier) ?? context);
        }
      }
      walkTypeNode(typeNode.type, 'return', context);
      return;
    }
    if (ts.isTemplateLiteralTypeNode(typeNode)) {
      for (const span of typeNode.templateSpans) {
        walkTypeNode(span.type, refKind, context);
      }
      return;
    }
    if (ts.isRestTypeNode(typeNode)) {
      walkTypeNode(typeNode.type, refKind, context);
    }
  }

  function walkTypeLiteralMembers(
    nodeMembers: ts.NodeArray<ts.TypeElement>,
    parentContext?: string,
  ): void {
    for (const member of nodeMembers) {
      if (ts.isPropertySignature(member) && member.type) {
        walkTypeNode(member.type, 'field', getNodeName(member.name) ?? parentContext);
      } else if (ts.isMethodSignature(member)) {
        const methodName = getNodeName(member.name) ?? parentContext;
        for (const parameter of member.parameters) {
          if (parameter.type) {
            walkTypeNode(parameter.type, 'param', methodName);
          }
        }
        if (member.type) {
          walkTypeNode(member.type, 'return', methodName);
        }
      } else if (ts.isIndexSignatureDeclaration(member) && member.type) {
        walkTypeNode(member.type, 'index-type', parentContext);
      } else if (ts.isCallSignatureDeclaration(member)) {
        for (const parameter of member.parameters) {
          if (parameter.type) {
            walkTypeNode(parameter.type, 'param', parentContext);
          }
        }
        if (member.type) {
          walkTypeNode(member.type, 'return', parentContext);
        }
      }
    }
  }

  if (ts.isInterfaceDeclaration(rawDeclaration.node)) {
    if (rawDeclaration.node.heritageClauses) {
      for (const clause of rawDeclaration.node.heritageClauses) {
        for (const typeExpression of clause.types) {
          const name = ts.isIdentifier(typeExpression.expression)
            ? typeExpression.expression.text
            : ts.isPropertyAccessExpression(typeExpression.expression)
              ? typeExpression.expression.name.text
              : null;
          if (name) addRef(name, 'extends');
          if (typeExpression.typeArguments) {
            for (const argument of typeExpression.typeArguments) {
              walkTypeNode(argument, 'type-arg');
            }
          }
        }
      }
    }
    if (rawDeclaration.node.typeParameters) {
      for (const typeParameter of rawDeclaration.node.typeParameters) {
        if (typeParameter.constraint) walkTypeNode(typeParameter.constraint, 'constraint');
        if (typeParameter.default) walkTypeNode(typeParameter.default, 'type-arg');
      }
    }
    walkTypeLiteralMembers(rawDeclaration.node.members);
  } else if (ts.isTypeAliasDeclaration(rawDeclaration.node)) {
    if (rawDeclaration.node.typeParameters) {
      for (const typeParameter of rawDeclaration.node.typeParameters) {
        if (typeParameter.constraint) walkTypeNode(typeParameter.constraint, 'constraint');
        if (typeParameter.default) walkTypeNode(typeParameter.default, 'type-arg');
      }
    }
    walkTypeNode(rawDeclaration.node.type, 'alias-body');
  } else if (ts.isClassDeclaration(rawDeclaration.node)) {
    if (rawDeclaration.node.heritageClauses) {
      for (const clause of rawDeclaration.node.heritageClauses) {
        const heritageKind: RefKind = clause.token === ts.SyntaxKind.ExtendsKeyword
          ? 'extends'
          : 'implements';
        for (const typeExpression of clause.types) {
          const name = ts.isIdentifier(typeExpression.expression)
            ? typeExpression.expression.text
            : ts.isPropertyAccessExpression(typeExpression.expression)
              ? typeExpression.expression.name.text
              : null;
          if (name) addRef(name, heritageKind);
          if (typeExpression.typeArguments) {
            for (const argument of typeExpression.typeArguments) {
              walkTypeNode(argument, 'type-arg');
            }
          }
        }
      }
    }
    if (rawDeclaration.node.typeParameters) {
      for (const typeParameter of rawDeclaration.node.typeParameters) {
        if (typeParameter.constraint) walkTypeNode(typeParameter.constraint, 'constraint');
        if (typeParameter.default) walkTypeNode(typeParameter.default, 'type-arg');
      }
    }
    for (const member of rawDeclaration.node.members) {
      if (ts.isPropertyDeclaration(member) && member.type) {
        walkTypeNode(member.type, 'field', getNodeName(member.name));
      } else if (ts.isMethodDeclaration(member)) {
        const methodName = getNodeName(member.name);
        for (const parameter of member.parameters) {
          if (parameter.type) walkTypeNode(parameter.type, 'param', methodName);
        }
        if (member.type) walkTypeNode(member.type, 'return', methodName);
      } else if (ts.isGetAccessorDeclaration(member) && member.type) {
        walkTypeNode(member.type, 'return', getNodeName(member.name));
      } else if (ts.isSetAccessorDeclaration(member)) {
        for (const parameter of member.parameters) {
          if (parameter.type) walkTypeNode(parameter.type, 'param', getNodeName(member.name));
        }
      }
    }
  }

  return refs;
}

function resolveTypeFile(
  name: string,
  fromFile: string,
  typeIndex: ReadonlyMap<string, ReadonlySet<string>>,
  fileImports: ReadonlyMap<string, ImportInfo>,
): string | null {
  if (BUILTIN_TYPES.has(name)) return null;

  const declarationFiles = typeIndex.get(name);
  if (declarationFiles?.has(fromFile)) return fromFile;

  const imports = fileImports.get(fromFile);
  if (imports) {
    const exportedName = imports.names.get(name);
    if (exportedName) {
      const lookupName = exportedName === 'default' ? name : exportedName;
      const candidates = typeIndex.get(lookupName);
      if (candidates) {
        if (candidates.size === 1) return [...candidates][0]!;
        const specifier = imports.specifiers.get(name);
        if (specifier?.startsWith('.')) {
          const fromPackagePrefix = fromFile.split('/').slice(0, 2).join('/');
          for (const candidate of candidates) {
            if (candidate.startsWith(`${fromPackagePrefix}/`)) {
              return candidate;
            }
          }
        }
        return [...candidates][0]!;
      }
    }
  }

  if (declarationFiles && declarationFiles.size > 0) {
    if (declarationFiles.size === 1) return [...declarationFiles][0]!;
    const fromPackagePrefix = fromFile.split('/').slice(0, 2).join('/');
    for (const candidate of declarationFiles) {
      if (candidate.startsWith(`${fromPackagePrefix}/`)) {
        return candidate;
      }
    }
    return [...declarationFiles][0]!;
  }

  return null;
}

function addToTypeIndex(
  typeIndex: Map<string, Set<string>>,
  name: string,
  filePath: string,
): void {
  if (!typeIndex.has(name)) {
    typeIndex.set(name, new Set());
  }
  typeIndex.get(name)!.add(filePath);
}

function isTypeShapeDeclarationKind(
  kind: StructuralDeclarationKind,
): kind is TypeShapeDeclKind {
  return kind === 'interface'
    || kind === 'type'
    || kind === 'class'
    || kind === 'enum';
}

function getTypeParams(
  node:
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.ClassDeclaration
    | ts.EnumDeclaration
    | ts.FunctionDeclaration
    | ts.ModuleDeclaration
    | ts.VariableDeclaration,
): readonly string[] {
  if (!('typeParameters' in node) || !node.typeParameters) {
    return [];
  }
  return node.typeParameters.map((typeParameter) => typeParameter.name.text);
}

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function hasReadonly(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
}

function getNodeName(
  node: ts.PropertyName | ts.BindingName | undefined,
): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return node.text;
  if (ts.isPrivateIdentifier(node)) return node.text;
  return undefined;
}

function getPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2
      ? `${parts[0]}/${parts[1]}`
      : specifier;
  }
  return specifier.split('/')[0] ?? specifier;
}

function repoClaimId(): StructuralClaimId {
  return 'repo:.';
}

function packageClaimId(packageDir: string): StructuralClaimId {
  return `package:${packageDir}`;
}

function packageEntrypointClaimId(
  packageDir: string,
  entrypoint: string,
): StructuralClaimId {
  return `package-entrypoint:${packageDir}:${entrypoint}`;
}

function tsconfigClaimId(tsconfigPath: string): StructuralClaimId {
  return `tsconfig:${tsconfigPath}`;
}

function sourceFileClaimId(filePath: string): StructuralClaimId {
  return `source-file:${filePath}`;
}

function projectSourceFileClaimId(
  tsconfigPath: string,
  filePath: string,
): StructuralClaimId {
  return `project-source-file:${tsconfigPath}:${filePath}`;
}

function importClaimId(
  filePath: string,
  start: number,
): StructuralClaimId {
  return `import:${filePath}:${start}`;
}

function resolutionClaimId(
  importId: StructuralClaimId,
): StructuralClaimId {
  return `resolution:${importId}`;
}

function importBindingClaimId(
  importId: StructuralClaimId,
  localName: string,
): StructuralClaimId {
  return `import-binding:${importId}:${localName}`;
}

function exportObservationClaimId(
  filePath: string,
  start: number,
  observationKind: ExportObservationKind,
  exportedName: string | null,
): StructuralClaimId {
  return `export-observation:${filePath}:${start}:${observationKind}:${exportedName ?? '*'}`;
}

function declarationClaimId(
  filePath: string,
  line: number,
  name: string,
): StructuralClaimId {
  return `declaration:${filePath}:${line}:${name}`;
}

function memberClaimId(
  declarationId: StructuralClaimId,
  index: number,
): StructuralClaimId {
  return `member:${declarationId}:${index}`;
}

function typeReferenceClaimId(
  declarationId: StructuralClaimId,
  index: number,
): StructuralClaimId {
  return `type-reference:${declarationId}:${index}`;
}

function toRepoRelative(
  repoPath: string,
  pathValue: string,
): string {
  return toForwardSlash(relative(repoPath, resolve(pathValue)));
}

function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}
