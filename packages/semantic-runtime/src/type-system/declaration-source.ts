import ts from 'typescript';
import {
  SourceFileAddress,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import { normalizeHostPath } from '../kernel/source-address.js';

export interface DeclarationSourcePublication {
  readonly address: SourceSpanAddress;
  readonly identity: TypeScriptDeclarationIdentity;
  readonly records: readonly KernelStoreRecord[];
}

interface DeclarationSourceSpan {
  readonly sourceFileAddress: SourceFileAddress;
  readonly sourceFileRecords: readonly KernelStoreRecord[];
  readonly start: number;
  readonly end: number;
}

interface SourceFileAddressPublication {
  readonly address: SourceFileAddress;
  readonly records: readonly KernelStoreRecord[];
}

export function sourceSpanForCheckerDeclaration(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
  role: SourceSpanRole,
): DeclarationSourcePublication | null {
  const span = declarationSourceSpan(store, symbol, declarations);
  if (span == null) {
    return null;
  }
  return declarationSourcePublication(store, symbol, span, role);
}

function declarationSourcePublication(
  store: KernelStore,
  symbol: ts.Symbol,
  span: DeclarationSourceSpan,
  role: SourceSpanRole,
): DeclarationSourcePublication {
  const local = declarationSourceLocal(span, role);
  const addressHandle = store.handles.address(`${local}:span`);
  const address = new SourceSpanAddress(
    addressHandle,
    span.sourceFileAddress.handle,
    span.start,
    span.end,
    role,
  );
  const identity = new TypeScriptDeclarationIdentity(
    store.handles.identity(`${local}:identity`),
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
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): DeclarationSourceSpan | null {
  const declaration = declarations[0] ?? symbol.valueDeclaration ?? null;
  if (declaration == null) {
    return null;
  }
  const sourceFile = declaration.getSourceFile();
  const sourceFilePublication = sourceFileAddressForDeclaration(store, sourceFile);
  const addressNode = declarationAddressNode(declaration);
  return {
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
    span.sourceFileAddress.workspaceKey,
    localKeyPart(span.sourceFileAddress.path),
    span.start,
    span.end,
    role,
  ].join(':');
}

function sourceFileAddressForDeclaration(
  store: KernelStore,
  sourceFile: ts.SourceFile,
): SourceFileAddressPublication {
  const existing = store.readBestSourceFileAddressForFileName(sourceFile.fileName);
  if (existing != null) {
    return { address: existing, records: [] };
  }
  return programSourceFileAddressPublication(store, sourceFile.fileName);
}

function programSourceFileAddressPublication(
  store: KernelStore,
  fileName: string,
): SourceFileAddressPublication {
  const path = normalizeHostPath(fileName);
  const local = `program-source-file:${localKeyPart(path)}`;
  const address = programSourceFileAddress(store, local, path);
  return {
    address,
    records: [
      address,
      ...programSourceFileAdmissionRecords(store, local, address),
    ],
  };
}

function programSourceFileAddress(
  store: KernelStore,
  local: string,
  path: string,
): SourceFileAddress {
  return new SourceFileAddress(
    store.handles.address(local),
    'type-system-program',
    path,
    inferSourceLanguage(path),
    inferSourceFileRole(path),
  );
}

function programSourceFileAdmissionRecords(
  store: KernelStore,
  local: string,
  address: SourceFileAddress,
): readonly (EvidenceRecord | ProvenanceRecord)[] {
  const evidenceHandle = store.handles.evidence(local);
  const evidence = new EvidenceRecord(
    evidenceHandle,
    EvidenceKind.SourceObservation,
    [EvidenceRole.Admission],
    'Program source file observed through a TypeChecker declaration.',
    address.handle,
  );
  const provenance = new ProvenanceRecord(
    store.handles.provenance(local),
    [evidenceHandle],
  );
  return [evidence, provenance];
}

function declarationAddressNode(declaration: ts.Declaration): ts.Node {
  return ts.getNameOfDeclaration(declaration) ?? declaration;
}
