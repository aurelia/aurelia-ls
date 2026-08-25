import type { KernelStore } from '../kernel/store.js';
import type { GenerationAuthority } from '../kernel/generation-authority.js';
import { GenerationBoundKernelPublicationContext } from '../kernel/publication.js';
import type { Container } from '../di/container.js';
import type { StateStoreConfiguration } from '../state/model.js';
import {
  StateStoreVisibility,
  type StateStoreVisibilitySelection,
} from '../state/state-store-visibility.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import { CheckerTypeProjector } from './checker-projector.js';
import { CheckerExpressionTypeEvaluator } from './expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationCache,
  type CheckerExpressionTypeEvaluationCacheMarker,
  type CheckerExpressionTypeEvaluationCacheStats,
} from './expression-type-evaluation.js';

/**
 * Shared TypeChecker expression world for one runtime-analysis or inquiry pass.
 *
 * The world owns the hot type projector, expression cache, and resource-scope-specific evaluator instances. Passes
 * that need lifecycle or template-control-flow speculation should extend this substrate instead of constructing a
 * second local expression evaluator stack.
 */
export class CheckerExpressionTypeWorld {
  private readonly defaultEvaluator: CheckerExpressionTypeEvaluator;
  private readonly scopedEvaluators = new WeakMap<TemplateResourceScope, CheckerExpressionTypeEvaluator>();

  constructor(
    private readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
    readonly cache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
    readonly stateStoreVisibility: StateStoreVisibility = StateStoreVisibility.empty(),
  ) {
    this.defaultEvaluator = new CheckerExpressionTypeEvaluator(
      store,
      projector,
      null,
      cache,
      stateStoreVisibility.defaultSelection(),
    );
  }

  get stateStores(): readonly StateStoreConfiguration[] {
    return this.stateStoreVisibility.stores;
  }

  evaluator(resourceScope: TemplateResourceScope | null = null): CheckerExpressionTypeEvaluator {
    this.projector.publication.requireCurrent();
    if (resourceScope == null) {
      return this.defaultEvaluator;
    }

    let evaluator = this.scopedEvaluators.get(resourceScope);
    if (evaluator === undefined) {
      evaluator = new CheckerExpressionTypeEvaluator(
        this.store,
        this.projector,
        resourceScope,
        this.cache,
        this.stateStoreVisibility.selectionForResourceScope(resourceScope),
      );
      this.scopedEvaluators.set(resourceScope, evaluator);
    }
    return evaluator;
  }

  stateStoreSelectionForResourceScope(
    resourceScope: TemplateResourceScope | null,
  ): StateStoreVisibilitySelection {
    return this.stateStoreVisibility.selectionForResourceScope(resourceScope);
  }

  stateStoreSelectionForContainer(
    container: Container | null,
  ): StateStoreVisibilitySelection {
    return this.stateStoreVisibility.selectionForContainer(container);
  }

  /** Start a store-backed world revoked with the computation generation that committed this candidate. */
  forCommittedGeneration(authority: GenerationAuthority): CheckerExpressionTypeWorld {
    return new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(
        this.store,
        new GenerationBoundKernelPublicationContext(this.store, authority),
      ),
      new CheckerExpressionTypeEvaluationCache(),
      this.stateStoreVisibility,
    );
  }

  /** Start an inquiry-local cache whose writes remain bound to the parent app generation. */
  freshInquiryGeneration(): CheckerExpressionTypeWorld {
    this.projector.publication.requireCurrent();
    return new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(this.store, this.projector.publication),
      new CheckerExpressionTypeEvaluationCache(),
      this.stateStoreVisibility,
    );
  }

  cacheSnapshot(): CheckerExpressionTypeEvaluationCacheStats {
    return this.cache.snapshot();
  }

  cacheMarker(): CheckerExpressionTypeEvaluationCacheMarker {
    return this.cache.mark();
  }

  cacheSnapshotSince(marker: CheckerExpressionTypeEvaluationCacheMarker): CheckerExpressionTypeEvaluationCacheStats {
    return this.cache.snapshotSince(marker);
  }
}
