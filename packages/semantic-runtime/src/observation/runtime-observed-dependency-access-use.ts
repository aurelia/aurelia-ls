import type { RuntimeExpressionAccessPublication } from '../runtime-expression/runtime-expression-access-publication.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  RuntimeExpressionAccessTracking,
} from '../runtime-expression/runtime-expression-access-use.js';
import type {
  RuntimeObservedDependencyAccessDraft,
  RuntimeObservedDependencyAccessUseDraft,
} from './runtime-observed-dependency-draft.js';
import {
  observedMemberSourceFields,
  observedMemberSourceForRuntimeExpressionAccessUse,
} from './observed-dependency-member-source.js';
import { RuntimeObservedDependencyKind } from './runtime-observed-dependency.js';

/**
 * Pair each observation effect with the exact access occurrence that induced it.
 *
 * Dependency rows remain occurrence-shaped here. Any semantic grouping belongs in a later summary projection because
 * source text cannot prove the concrete object/key/observer identity used by Aurelia at runtime.
 */
export function observedDependencyAccessUseDrafts(
  context: KernelPublicationContext,
  effects: readonly RuntimeObservedDependencyAccessDraft[],
  publications: readonly RuntimeExpressionAccessPublication[],
): readonly RuntimeObservedDependencyAccessUseDraft[] {
  const publicationByDraft = new Map(
    publications
      .filter((publication) => publication.detail.tracking === RuntimeExpressionAccessTracking.Connectable)
      .map((publication) => [publication.draft, publication] as const),
  );
  return effects.map((effect) => {
    const publication = publicationByDraft.get(effect.accessUse) ?? null;
    if (publication == null) {
      throw new Error(
        `Observed dependency '${observedDependencyDisplayName(effect.dependency)}' at `
        + `${effect.dependency.spanStart ?? 'open'}..${effect.dependency.spanEnd ?? 'open'} lost its originating access use.`,
      );
    }
    const dependencyOwnsMemberSource = effect.dependency.dependencyKind === RuntimeObservedDependencyKind.ProxyCollectionRead
      || effect.dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
      || effect.dependency.observedMemberKind != null
      || effect.dependency.observedMemberSourceAddressHandle != null
      || effect.dependency.observedMemberSourceRoute != null;
    return {
      ...effect.dependency,
      ...(dependencyOwnsMemberSource
        ? {}
        : observedMemberSourceFields(
            observedMemberSourceForRuntimeExpressionAccessUse(context, publication.detail),
          )),
      accessUseProductHandle: publication.detail.productHandle,
      accessUseSourceAddressHandle: publication.detail.sourceAddressHandle,
    };
  });
}

function observedDependencyDisplayName(
  dependency: RuntimeObservedDependencyAccessDraft['dependency'],
): string {
  return dependency.sourceName
    ?? dependency.sourceRootName
    ?? dependency.memberName
    ?? dependency.keyExpression
    ?? dependency.methodName
    ?? dependency.expressionKind;
}
