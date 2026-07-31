import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { RuntimeObservedDependencyOccurrence } from '../observation/runtime-observed-dependency.js';
import {
  RuntimeObservedDependencyKind,
} from '../observation/runtime-observed-dependency.js';
import {
  RuntimeExpressionAccessOwnerKind,
} from '../runtime-expression/runtime-expression-access-use.js';
import type {
  SemanticObservedDependencyOccurrenceRow,
  SemanticObservedDependencyLocus,
  SemanticObservedDependencyOwnerRow,
} from './contracts.js';
import { SemanticObservedDependencyLocusKind } from './contracts.js';
import {
  requireRuntimeExpressionAccessUseOccurrenceRow,
} from './runtime-expression-projections.js';
import {
  describeAddress,
  semanticSourceReferenceMatchesFilePath,
  semanticSourceReferenceKey,
  sourceReferenceForParserSpan,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  sourceSpanFromBounds,
} from '../expression/source-span.js';

export interface ObservedDependencyOwnerProjectionInput {
  readonly kind: RuntimeExpressionAccessOwnerKind;
  readonly productHandle: ProductHandle | null;
  readonly identityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: RuntimeObservedDependencyOccurrence['sourceAddressHandle'];
}

export interface SemanticObservedDependencyProjectedRow {
  readonly rowKey: string;
  readonly owner: SemanticObservedDependencyOwnerRow;
  readonly occurrence: SemanticObservedDependencyOccurrenceRow;
}

export function filterObservedDependencyRows<TRow extends SemanticObservedDependencyProjectedRow>(
  rows: readonly TRow[],
  locus: SemanticObservedDependencyLocus | null | undefined,
): readonly TRow[] {
  if (locus == null || locus.kind === SemanticObservedDependencyLocusKind.Project) {
    return rows;
  }
  switch (locus.kind) {
    case SemanticObservedDependencyLocusKind.SourceFile:
      return rows.filter((row) =>
        semanticSourceReferenceMatchesFilePath(row.occurrence.source, locus.sourceFile.filePath)
      );
    case SemanticObservedDependencyLocusKind.Owner:
      return rows.filter((row) => row.owner.ownerKey === locus.ownerKey);
    case SemanticObservedDependencyLocusKind.Row:
      return rows.filter((row) => row.rowKey === locus.rowKey);
    case SemanticObservedDependencyLocusKind.Cluster:
      throw new Error('Cluster loci apply only after observed-dependency summary aggregation.');
  }
}

export function observedDependencyOwnerRow(
  store: KernelStore,
  input: ObservedDependencyOwnerProjectionInput,
  handles: boolean,
): SemanticObservedDependencyOwnerRow {
  const source = describeAddress(store, input.sourceAddressHandle);
  return {
    ownerKey: observedDependencyOwnerKey(input.kind, source, input.identityHandle),
    kind: input.kind,
    source,
    ...(handles ? {
      handles: {
        productHandle: input.productHandle,
        identityHandle: input.identityHandle,
        sourceAddressHandle: input.sourceAddressHandle,
      },
    } : {}),
  };
}

export function observedDependencyOccurrenceRow(
  store: KernelStore,
  occurrence: RuntimeObservedDependencyOccurrence,
  handles: boolean,
): SemanticObservedDependencyOccurrenceRow {
  const accessUse = requireRuntimeExpressionAccessUseOccurrenceRow(
    store,
    occurrence.accessUseProductHandle,
    handles,
  );
  const source = describeAddress(store, occurrence.sourceAddressHandle);
  return {
    dependencyKind: occurrence.dependencyKind,
    expressionKind: occurrence.expressionKind,
    sourceName: occurrence.sourceName,
    sourceRootName: occurrence.sourceRootName,
    memberName: occurrence.memberName,
    keyExpression: occurrence.keyExpression,
    methodName: occurrence.methodName,
    accessUse,
    observedMemberKind: occurrence.observedMemberKind,
    observedMemberSource: describeAddress(store, occurrence.observedMemberSourceAddressHandle),
    observedMemberSourceState: occurrence.observedMemberSourceState,
    observedMemberSourceRoute: occurrence.observedMemberSourceRoute,
    scopeLookupAncestor: occurrence.scopeLookupAncestor,
    spanStart: occurrence.spanStart,
    spanEnd: occurrence.spanEnd,
    memberTokenSource: occurrence.dependencyKind === RuntimeObservedDependencyKind.TemplateExpressionRead
      ? accessUse.nameSource
      : observedDependencyMemberTokenSource(store, occurrence, source),
    source,
    ...(handles ? {
      handles: {
        accessUseProductHandle: occurrence.accessUseProductHandle,
        observedMemberSourceAddressHandle: occurrence.observedMemberSourceAddressHandle,
        sourceFileAddressHandle: occurrence.sourceFileAddressHandle,
        sourceAddressHandle: occurrence.sourceAddressHandle,
      },
    } : {}),
  };
}

export function observedDependencyRowKey(
  owner: SemanticObservedDependencyOwnerRow,
  identityHandle: IdentityHandle,
): string {
  return `row:${stableKernelLocalHash(JSON.stringify([
    owner.ownerKey,
    identityHandle,
  ]))}`;
}

function observedDependencyOwnerKey(
  kind: RuntimeExpressionAccessOwnerKind,
  source: SemanticSourceReference | null,
  identityHandle: IdentityHandle | null,
): string {
  return `owner:${stableKernelLocalHash(JSON.stringify([
    kind,
    semanticSourceReferenceKey(source),
    identityHandle ?? '',
  ]))}`;
}

function observedDependencyMemberTokenSource(
  store: KernelStore,
  occurrence: RuntimeObservedDependencyOccurrence,
  source: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (occurrence.memberNameSpanStart == null || occurrence.memberNameSpanEnd == null) {
    return null;
  }
  const carrier = describeAddress(store, occurrence.sourceFileAddressHandle) ?? source;
  if (carrier?.path == null) {
    return null;
  }
  return sourceReferenceForParserSpan(
    carrier.path,
    sourceSpanFromBounds(occurrence.memberNameSpanStart, occurrence.memberNameSpanEnd),
    'name',
    carrier,
  );
}
