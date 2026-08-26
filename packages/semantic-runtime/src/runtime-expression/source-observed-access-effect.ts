import type ts from 'typescript';

import type { RuntimeObservedDependencyDraft } from '../observation/runtime-observed-dependency-draft.js';
import type { RuntimeSourceAccessUseDraft } from './source-access-use-publication.js';
import type {
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessRole,
} from './runtime-expression-access-use.js';

/** Exact TypeScript syntax operation that induces one or more source-side observation effects. */
export interface RuntimeTypeScriptObservedAccessReference {
  readonly sourceNode: ts.Node;
  readonly nameNode: ts.Node | null;
  readonly accessForm: RuntimeExpressionAccessForm;
  readonly role: RuntimeExpressionAccessRole;
  readonly operationName: string | null;
}

/**
 * Transient access authority retained while a source-side dependency is derived.
 *
 * TypeScript references are resolved by node identity during access collection. Declarative dependency expressions
 * already own a complete access draft and retain that draft directly.
 */
export type RuntimeSourceObservedAccessSeed =
  | {
      readonly kind: 'typescript-node';
      readonly reference: RuntimeTypeScriptObservedAccessReference;
    }
  | {
      readonly kind: 'source-draft';
      readonly draft: RuntimeSourceAccessUseDraft;
    };

/** One source-side observation effect before its access draft has been published. */
export interface RuntimeSourceObservedAccessSeedEffectDraft {
  readonly accessUse: RuntimeSourceObservedAccessSeed;
  readonly dependency: RuntimeObservedDependencyDraft;
}

