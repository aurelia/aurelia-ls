import type { KernelStore } from '../kernel/store.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import { CheckerTypeProjector } from './checker-projector.js';
import { CheckerExpressionTypeEvaluator } from './expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationCache,
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
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector = new CheckerTypeProjector(store),
    readonly cache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
  ) {
    this.defaultEvaluator = new CheckerExpressionTypeEvaluator(store, projector, null, cache);
  }

  evaluator(resourceScope: TemplateResourceScope | null = null): CheckerExpressionTypeEvaluator {
    if (resourceScope == null) {
      return this.defaultEvaluator;
    }

    let evaluator = this.scopedEvaluators.get(resourceScope);
    if (evaluator === undefined) {
      evaluator = new CheckerExpressionTypeEvaluator(this.store, this.projector, resourceScope, this.cache);
      this.scopedEvaluators.set(resourceScope, evaluator);
    }
    return evaluator;
  }

  cacheSnapshot(): CheckerExpressionTypeEvaluationCacheStats {
    return this.cache.snapshot();
  }
}
