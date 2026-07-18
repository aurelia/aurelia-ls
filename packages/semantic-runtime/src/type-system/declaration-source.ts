import ts from 'typescript';
import {
  SourceFileAddress,
  SourceFileRole,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import { inferSourceFileRole } from '../kernel/source-classification.js';
import {
  projectTypeSystemProgramSources,
  type TypeSystemProgramSourceCatalog,
} from './program-source-authority.js';

export interface DeclarationSourcePublication {
  readonly address: SourceSpanAddress;
  readonly identity: TypeScriptDeclarationIdentity;
  readonly records: readonly KernelStoreRecord[];
}

export interface CheckerNodeSourceSpanPublication {
  readonly address: SourceSpanAddress;
  readonly records: readonly KernelStoreRecord[];
}

interface DeclarationSourceSpan {
  readonly projectKey: string;
  readonly sourceFileAddress: SourceFileAddress;
  readonly sourceFileRecords: readonly KernelStoreRecord[];
  readonly start: number;
  readonly end: number;
}

interface SourceFileAddressPublication {
  readonly address: SourceFileAddress;
  readonly records: readonly KernelStoreRecord[];
}

/** Project and source-lifetime context attached to one process-local TypeChecker epoch. */
export class CheckerDeclarationSourceContext {
  private readonly overlaySourcePaths: ReadonlySet<string>;

  constructor(
    readonly projectKey: string,
    readonly programSources: TypeSystemProgramSourceCatalog,
    overlaySourcePaths: ReadonlySet<string>,
  ) {
    this.overlaySourcePaths = new Set([...overlaySourcePaths].map(normalizeHostPath));
  }

  isOverlaySource(fileName: string): boolean {
    return this.overlaySourcePaths.has(normalizeHostPath(fileName));
  }
}

const checkerDeclarationSourceContexts = new WeakMap<ts.TypeChecker, CheckerDeclarationSourceContext>();

/** Bind process-local checker objects to the semantic project/source authority that created them. */
export function registerCheckerDeclarationSourceContext(
  checker: ts.TypeChecker,
  context: CheckerDeclarationSourceContext,
): void {
  checkerDeclarationSourceContexts.set(checker, context);
}

/** Register a raw contract/test checker whose source locations are owned by its isolated publication. */
export function registerIsolatedCheckerDeclarationSourceContext(
  checker: ts.TypeChecker,
  projectKey: string,
): void {
  registerCheckerDeclarationSourceContext(
    checker,
    new CheckerDeclarationSourceContext(projectKey, projectTypeSystemProgramSources, new Set()),
  );
}

export function sourceSpanForCheckerDeclaration(
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
  role: SourceSpanRole,
): DeclarationSourcePublication | null {
  const span = declarationSourceSpan(publication, checker, symbol, declarations);
  if (span == null) {
    return null;
  }
  return declarationSourcePublication(publication, symbol, span, role);
}

/** Materialize a navigable source span for a checker node without minting a declaration identity. */
export function sourceSpanForCheckerNode(
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  localKey: string,
  node: ts.Node,
  role: SourceSpanRole,
): CheckerNodeSourceSpanPublication {
  const sourceFile = node.getSourceFile();
  const context = checkerDeclarationSourceContext(checker);
  const sourceFilePublication = sourceFileAddressForDeclaration(publication, context, sourceFile);
  const start = node.getStart(sourceFile);
  const end = node.end;
  const local = checkerNodeSourceLocal(context.projectKey, sourceFilePublication.address, localKey, start, end, role);
  const addressHandle = publication.handles.address(`${local}:span`);
  return {
    address: new SourceSpanAddress(
      addressHandle,
      sourceFilePublication.address.handle,
      start,
      end,
      role,
    ),
    records: [
      ...sourceFilePublication.records,
      new SourceSpanAddress(
        addressHandle,
        sourceFilePublication.address.handle,
        start,
        end,
        role,
      ),
    ],
  };
}

function declarationSourcePublication(
  publication: KernelPublicationContext,
  symbol: ts.Symbol,
  span: DeclarationSourceSpan,
  role: SourceSpanRole,
): DeclarationSourcePublication {
  const local = declarationSourceLocal(span, role);
  const addressHandle = publication.handles.address(`${local}:span`);
  const address = new SourceSpanAddress(
    addressHandle,
    span.sourceFileAddress.handle,
    span.start,
    span.end,
    role,
  );
  const identity = new TypeScriptDeclarationIdentity(
    publication.handles.identity(`${local}:identity`),
    span.sourceFileAddress.path,
    null,
    symbol.getName(),
    addressHandle,
  );
  return {
    address,
    identity,
    records: [
      ...span.sourceFileRecords,
      address,
      identity,
    ],
  };
}

function declarationSourceSpan(
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): DeclarationSourceSpan | null {
  const declaration = declarations[0] ?? symbol.valueDeclaration ?? null;
  if (declaration == null) {
    return null;
  }
  const sourceFile = declaration.getSourceFile();
  const context = checkerDeclarationSourceContext(checker);
  const sourceFilePublication = sourceFileAddressForDeclaration(publication, context, sourceFile);
  const addressNode = declarationAddressNode(declaration);
  return {
    projectKey: context.projectKey,
    sourceFileAddress: sourceFilePublication.address,
    sourceFileRecords: sourceFilePublication.records,
    start: addressNode.getStart(sourceFile),
    end: addressNode.end,
  };
}

function declarationSourceLocal(
  span: DeclarationSourceSpan,
  role: SourceSpanRole,
): string {
  return [
    'type-system-declaration',
    localKeyPart(span.projectKey),
    localKeyPart(span.sourceFileAddress.path),
    span.start,
    span.end,
    role,
  ].join(':');
}

function checkerNodeSourceLocal(
  projectKey: string,
  sourceFileAddress: SourceFileAddress,
  localKey: string,
  start: number,
  end: number,
  role: SourceSpanRole,
): string {
  return [
    'type-system-node',
    localKeyPart(projectKey),
    localKeyPart(sourceFileAddress.path),
    localKeyPart(localKey),
    start,
    end,
    role,
  ].join(':');
}

function sourceFileAddressForDeclaration(
  publication: KernelPublicationContext,
  context: CheckerDeclarationSourceContext,
  sourceFile: ts.SourceFile,
): SourceFileAddressPublication {
  // App source is project-qualified even when another logical project admits the same physical path.
  const existing = publication.readSourceFileAddressesByFileName(sourceFile.fileName)
    .map((candidate) => publication.read(candidate.handle))
    .find((candidate): candidate is SourceFileAddress =>
      candidate instanceof SourceFileAddress && candidate.workspaceKey === context.projectKey
    )
    ?? null;
  if (existing != null) {
    return { address: existing, records: [] };
  }
  if (context.isOverlaySource(sourceFile.fileName)) {
    return projectTypeSystemProgramSources.sourceFile(
      publication,
      context.projectKey,
      sourceFile.fileName,
      SourceFileRole.Generated,
    );
  }
  return context.programSources.sourceFile(
    publication,
    context.projectKey,
    sourceFile.fileName,
    programSourceFileRole(sourceFile.fileName),
  );
}

function checkerDeclarationSourceContext(checker: ts.TypeChecker): CheckerDeclarationSourceContext {
  const context = checkerDeclarationSourceContexts.get(checker) ?? null;
  if (context == null) {
    throw new Error('TypeChecker declaration projection requires a registered project source context.');
  }
  return context;
}

function programSourceFileRole(path: string): SourceFileRole {
  const inferred = inferSourceFileRole(path);
  return inferred === SourceFileRole.Declaration || inferred === SourceFileRole.Generated
    ? inferred
    : SourceFileRole.ExternalSource;
}

function declarationAddressNode(declaration: ts.Declaration): ts.Node {
  return ts.getNameOfDeclaration(declaration) ?? declaration;
}
