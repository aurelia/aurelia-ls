import type { AddressHandle } from '../kernel/handles.js';
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
  switch (address.kind) {
    case 'source-file-address':
      return {
        kind: address.kind,
        label: address.path,
        path: address.path,
      };
    case 'source-span-address': {
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
    case 'template-address':
      return {
        kind: address.kind,
        label: `template:${address.templateKey}`,
        anchor: describeAddress(store, address.authoredSourceHandle),
      };
    case 'template-node-address': {
      const source = describeAddress(store, address.authoredSourceHandle);
      return {
        kind: address.kind,
        label: source?.label ?? `template-node:${address.path.join('.')}`,
        anchor: source,
      };
    }
    case 'generated-address': {
      const anchor = address.anchorHandle == null || store.readAddress(address.anchorHandle as AddressHandle) == null
        ? null
        : describeAddress(store, address.anchorHandle as AddressHandle);
      return {
        kind: address.kind,
        label: anchor == null ? `generated:${address.localKey}` : `${anchor.label} -> ${address.localKey}`,
        anchor,
      };
    }
    case 'external-address':
      return {
        kind: address.kind,
        label: address.label ?? `${address.scheme}:${address.value}`,
        scheme: address.scheme,
        value: address.value,
      };
  }
}
