import type { RuntimeExpressionAccessPublication } from '../runtime-expression/runtime-expression-access-publication.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  RuntimeExpressionAccessTracking,
} from '../runtime-expression/runtime-expression-access-use.js';
import type {
  RuntimeObservedDependencyAccessUseDraft,
  RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import {
  observedMemberSourceFields,
  observedMemberSourceForRuntimeExpressionAccessUse,
} from './observed-dependency-member-source.js';

/**
 * Pair each observation effect with the exact access occurrence that induced it.
 *
 * Dependency rows remain occurrence-shaped here. Any semantic grouping belongs in a later summary projection because
 * source text cannot prove the concrete object/key/observer identity used by Aurelia at runtime.
 */
export function observedDependencyAccessUseDrafts(
  context: KernelPublicationContext,
  dependencies: readonly RuntimeObservedDependencyDraft[],
  publications: readonly RuntimeExpressionAccessPublication[],
): readonly RuntimeObservedDependencyAccessUseDraft[] {
  const connectable = publications.filter(
    (publication) => publication.detail.tracking === RuntimeExpressionAccessTracking.Connectable,
  );
  return dependencies.map((dependency) => {
    const publication = accessPublicationForDependency(dependency, connectable);
    if (publication == null) {
      throw new Error(
        `Observed dependency '${observedDependencyDisplayName(dependency)}' at `
        + `${dependency.spanStart ?? 'open'}..${dependency.spanEnd ?? 'open'} has no originating access use.`,
      );
    }
    return {
      ...dependency,
      ...observedMemberSourceFields(
        observedMemberSourceForRuntimeExpressionAccessUse(context, publication.detail),
      ),
      accessUseProductHandle: publication.detail.productHandle,
      accessUseSourceAddressHandle: publication.detail.sourceAddressHandle,
    };
  });
}

function accessPublicationForDependency(
  dependency: RuntimeObservedDependencyDraft,
  publications: readonly RuntimeExpressionAccessPublication[],
): RuntimeExpressionAccessPublication | null {
  const nameMatches = dependency.memberNameSpanStart == null || dependency.memberNameSpanEnd == null
    ? []
    : publications.filter((publication) => {
      const nameSource = publication.draft.nameSourceSpan;
      return nameSource != null
        && sourceFilesMatch(dependency, publication)
        && nameSource.start === dependency.memberNameSpanStart
        && nameSource.end === dependency.memberNameSpanEnd;
    });
  if (nameMatches.length === 1) {
    return nameMatches[0]!;
  }

  const sourceMatches = dependency.spanStart == null || dependency.spanEnd == null
    ? []
    : publications.filter((publication) =>
      sourceFilesMatch(dependency, publication)
      && publication.draft.sourceSpan.start === dependency.spanStart
      && publication.draft.sourceSpan.end === dependency.spanEnd
    );
  if (sourceMatches.length === 1) {
    return sourceMatches[0]!;
  }
  return null;
}

function sourceFilesMatch(
  dependency: RuntimeObservedDependencyDraft,
  publication: RuntimeExpressionAccessPublication,
): boolean {
  const dependencyFile = dependency.sourceFileAddressHandle ?? null;
  const accessFile = publication.draft.sourceSpan.file?.id ?? null;
  return dependencyFile == null || accessFile == null
    ? dependencyFile == null
    : dependencyFile === accessFile;
}

function observedDependencyDisplayName(
  dependency: RuntimeObservedDependencyDraft,
): string {
  return dependency.sourceName
    ?? dependency.sourceRootName
    ?? dependency.memberName
    ?? dependency.keyExpression
    ?? dependency.methodName
    ?? dependency.expressionKind;
}
