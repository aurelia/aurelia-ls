import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import {
  SourceFileRef,
  type SourceSpan,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  sourceFileAddressForAddress,
  sourceFileHandleForAddress,
  sourceSpanAddressForSite,
  sourceSpanAddressForAddress,
} from '../kernel/source-address.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';

export interface RuntimeExpressionSourceAddress {
  readonly handle: AddressHandle | null;
  readonly records: readonly KernelStoreRecord[];
}

export function runtimeExpressionParseContextForAddress(
  store: KernelStore,
  carrierAddressHandle: AddressHandle | null,
): ExpressionParseContext | undefined {
  const sourceSpan = sourceSpanAddressForAddress(store, carrierAddressHandle);
  return runtimeExpressionParseContextForSourceSpanAddress(store, sourceSpan);
}

export function runtimeExpressionParseContextForSourceSpanAddress(
  store: KernelStore,
  sourceSpan: SourceSpanAddress | null,
): ExpressionParseContext | undefined {
  if (sourceSpan == null) {
    return undefined;
  }
  const fileAddress = sourceFileAddressForAddress(store, sourceSpan.fileHandle);
  const file = fileAddress == null
    ? null
    : new SourceFileRef(fileAddress.handle, fileAddress.path);
  return {
    baseSpan: sourceSpanFromBounds(sourceSpan.start, sourceSpan.end, file),
  };
}

export function sourceAddressForRuntimeExpressionBounds(
  store: KernelStore,
  localKey: string,
  carrierAddressHandle: AddressHandle | null,
  start: number | null,
  end: number | null,
  role: SourceSpanRole = SourceSpanRole.Name,
): RuntimeExpressionSourceAddress {
  return start == null || end == null
    ? { handle: carrierAddressHandle, records: [] }
    : sourceAddressForRuntimeExpressionSpan(
      store,
      localKey,
      carrierAddressHandle,
      sourceSpanFromBounds(start, end),
      role,
    );
}

export function sourceAddressRecordsForRuntimeExpressionBounds(
  store: KernelStore,
  sourceAddressHandle: AddressHandle | null,
  carrierAddressHandle: AddressHandle | null,
  start: number | null,
  end: number | null,
  role: SourceSpanRole = SourceSpanRole.Name,
): RuntimeExpressionSourceAddress {
  if (sourceAddressHandle == null || start == null || end == null) {
    return {
      handle: sourceAddressHandle ?? carrierAddressHandle,
      records: [],
    };
  }
  const sourceFileAddressHandle = sourceFileHandleForAddress(store, carrierAddressHandle);
  if (sourceFileAddressHandle == null) {
    return {
      handle: sourceAddressHandle,
      records: [],
    };
  }
  const span = sourceSpanFromBounds(start, end);
  return {
    handle: sourceAddressHandle,
    records: [
      new SourceSpanAddress(
        sourceAddressHandle,
        sourceFileAddressHandle,
        span.start,
        span.end,
        role,
      ),
    ],
  };
}

export function sourceAddressForRuntimeExpressionSpan(
  store: KernelStore,
  localKey: string,
  carrierAddressHandle: AddressHandle | null,
  span: SourceSpan,
  role: SourceSpanRole = SourceSpanRole.Name,
): RuntimeExpressionSourceAddress {
  const sourceFileAddressHandle = sourceFileHandleForAddress(store, carrierAddressHandle);
  if (sourceFileAddressHandle == null) {
    return {
      handle: carrierAddressHandle,
      records: [],
    };
  }
  const source = sourceSpanAddressForSite(
    store,
    localKey,
    {
      sourceFileAddressHandle,
      start: span.start,
      end: span.end,
    },
    role,
  );
  return {
    handle: source.handle,
    records: source.records,
  };
}
