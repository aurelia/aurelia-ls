import type { KernelStore } from '../kernel/store.js';
import type { GenerationAuthority } from '../kernel/generation-authority.js';
import { GenerationBoundKernelPublicationContext } from '../kernel/publication.js';
import type { StateStoreConfiguration } from '../state/model.js';
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
    readonly projector: CheckerTypeProjector = new CheckerTypeProjector(store),
    readonly cache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
    readonly stateStores: readonly StateStoreConfiguration[] = [],
  ) {
    this.defaultEvaluator = new CheckerExpressionTypeEvaluator(store, projector, null, cache, stateStores);
  }

  evaluator(resourceScope: TemplateResourceScope | null = null): CheckerExpressionTypeEvaluator {
    this.projector.publication.requireCurrent();
    if (resourceScope == null) {
      return this.defaultEvaluator;
    }

    let evaluator = this.scopedEvaluators.get(resourceScope);
    if (evaluator === undefined) {
      evaluator = new CheckerExpressionTypeEvaluator(this.store, this.projector, resourceScope, this.cache, this.stateStores);
      this.scopedEvaluators.set(resourceScope, evaluator);
    }
    return evaluator;
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
      this.stateStores,
    );
  }

  /** Start an inquiry-local store-backed world that is not retained as a replaceable project generation. */
  freshInquiryGeneration(): CheckerExpressionTypeWorld {
    this.projector.publication.requireCurrent();
    return new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(this.store),
      new CheckerExpressionTypeEvaluationCache(),
      this.stateStores,
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
