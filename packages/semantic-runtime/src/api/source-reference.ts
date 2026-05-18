import type ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  ExternalAddress,
  GeneratedAddress,
  SemanticAddress,
  SourceFileAddress,
  SourceSpanAddress,
  TemplateAddress,
  TemplateNodeAddress,
} from '../kernel/address.js';
import type { KernelStore } from '../kernel/store.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';

export interface SemanticSourceReference {
  readonly kind: string;
  readonly label: string;
  readonly path?: string;
  readonly start?: number;
  readonly end?: number;
  readonly role?: string;
  readonly scheme?: string;
  readonly value?: string;
  readonly anchor?: SemanticSourceReference | null;
}

export function compilerWorldLabel(
  store: KernelStore,
  compilerWorld: TemplateCompilerWorldEmission,
): string {
  const source = describeAddress(store, compilerWorld.world.sourceAddressHandle);
  return source == null
    ? compilerWorld.world.worldKind
    : `${compilerWorld.world.worldKind} ${source.label}`;
}

export function describeAddress(
  store: KernelStore,
  handle: AddressHandle | null,
): SemanticSourceReference | null {
  if (handle == null) {
    return null;
  }
  const address = store.readAddress(handle);
  if (address == null) {
    return {
      kind: 'unexpanded-address',
      label: '(unexpanded address)',
    };
  }
  return describeStoredAddress(store, address);
}

export function sourceReferenceForParserSpan(
  filePath: string,
  span: SourceSpan,
  role: string = 'range',
): SemanticSourceReference {
  return {
    kind: 'source-span-address',
    label: `${filePath}@${span.start}..${span.end}`,
    path: filePath,
    start: span.start,
    end: span.end,
    role,
  };
}

export function sourceReferenceForTsNode(node: ts.Node): SemanticSourceReference {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return {
    kind: 'typescript-node',
    label: `${sourceFile.fileName}@${start}..${end}`,
    path: sourceFile.fileName,
    start,
    end,
  };
}

function describeStoredAddress(
  store: KernelStore,
  address: SemanticAddress,
): SemanticSourceReference {
  switch (address.kind) {
    case 'source-file-address':
      return describeSourceFileAddress(address);
    case 'source-span-address':
      return describeSourceSpanAddress(store, address);
    case 'template-address':
      return describeTemplateAddress(store, address);
    case 'template-node-address':
      return describeTemplateNodeAddress(store, address);
    case 'generated-address':
      return describeGeneratedAddress(store, address);
    case 'external-address':
      return describeExternalAddress(address);
  }
}

function describeSourceFileAddress(address: SourceFileAddress): SemanticSourceReference {
  return {
    kind: address.kind,
    label: address.path,
    path: address.path,
  };
}

function describeSourceSpanAddress(
  store: KernelStore,
  address: SourceSpanAddress,
): SemanticSourceReference {
  const file = describeAddress(store, address.fileHandle);
  return {
    kind: address.kind,
    label: `${file?.label ?? '(unknown source)'}@${address.start}..${address.end}`,
    path: file?.path,
    start: address.start,
    end: address.end,
    role: address.role,
    anchor: file,
  };
}

function describeTemplateAddress(
  store: KernelStore,
  address: TemplateAddress,
): SemanticSourceReference {
  return {
    kind: address.kind,
    label: `template:${address.templateKey}`,
    anchor: describeAddress(store, address.authoredSourceHandle),
  };
}

function describeTemplateNodeAddress(
  store: KernelStore,
  address: TemplateNodeAddress,
): SemanticSourceReference {
  const source = describeAddress(store, address.authoredSourceHandle);
  return {
    kind: address.kind,
    label: source?.label ?? `template-node:${address.path.join('.')}`,
    anchor: source,
  };
}

function describeGeneratedAddress(
  store: KernelStore,
  address: GeneratedAddress,
): SemanticSourceReference {
  const anchor = describeGeneratedAddressAnchor(store, address);
  return {
    kind: address.kind,
    label: anchor == null ? `generated:${address.localKey}` : `${anchor.label} -> ${address.localKey}`,
    anchor,
  };
}

function describeGeneratedAddressAnchor(
  store: KernelStore,
  address: GeneratedAddress,
): SemanticSourceReference | null {
  if (address.anchorHandle == null) {
    return null;
  }
  const anchorAddress = store.readAddress(address.anchorHandle as AddressHandle);
  return anchorAddress == null ? null : describeStoredAddress(store, anchorAddress);
}

function describeExternalAddress(address: ExternalAddress): SemanticSourceReference {
  return {
    kind: address.kind,
    label: address.label ?? `${address.scheme}:${address.value}`,
    scheme: address.scheme,
    value: address.value,
  };
}
