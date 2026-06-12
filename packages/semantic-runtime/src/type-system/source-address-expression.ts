import ts from 'typescript';
import { SourceSpanAddress } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';

/** Resolves an authored source-span address into the smallest TypeScript expression that exactly owns the span. */
export function sourceExpressionForSourceAddress(
  store: KernelStore,
  sourceAddressHandle: AddressHandle,
  readSourceFileByPath: (path: string) => ts.SourceFile | null,
): ts.Expression | null {
  const span = sourceSpanAddressForHandle(store, sourceAddressHandle);
  if (span == null) {
    return null;
  }
  const fileAddress = store.readAddress(span.fileHandle);
  if (fileAddress?.kind !== 'source-file-address') {
    return null;
  }
  const sourceFile = readSourceFileByPath(fileAddress.path);
  return sourceFile == null ? null : smallestExpressionForSpan(sourceFile, span.start, span.end);
}

/** Reads a source-span address from a handle when the caller expects an authored range. */
export function sourceSpanAddressForHandle(
  store: KernelStore,
  sourceAddressHandle: AddressHandle,
): SourceSpanAddress | null {
  const address = store.readAddress(sourceAddressHandle);
  return address instanceof SourceSpanAddress ? address : null;
}

/** Finds the smallest TypeScript expression whose source range exactly matches an authored span. */
export function smallestExpressionForSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Expression | null {
  let best: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (node.end < start || node.getStart(sourceFile) > end) {
      return;
    }
    if (ts.isExpression(node) && node.getStart(sourceFile) === start && node.end === end) {
      best = node;
    }
    if (node.getStart(sourceFile) <= start && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
}
