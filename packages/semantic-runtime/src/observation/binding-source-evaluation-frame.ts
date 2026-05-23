import ts from 'typescript';
import {
  StaticEvaluator,
  type StaticExpressionEvaluationResult,
} from '../evaluation/evaluator.js';
import {
  isEvaluatedProjectSource,
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import {
  type EvaluationClassValue,
  type EvaluationValue,
  type EvaluationFunctionValue,
} from '../evaluation/values.js';
import type { Container } from '../di/container.js';
import type { RuntimeBindingSourceActivationContext } from './binding-source-activation-context.js';

/**
 * Per binding-source value read frame over the project evaluation output.
 *
 * Follow-up reads must keep the source module's policy/runtime host and share evaluator guardrails for the duration of
 * the binding-source reduction. Creating a fresh `StaticEvaluator` at every member or function read silently resets
 * statement/depth/callback budgets and makes observation diverge from the original module-evaluation envelope.
 */
export class RuntimeBindingSourceEvaluationFrame {
  private readonly sourcesByFileName = new Map<string, EvaluatedProjectSource>();
  private readonly evaluatorsByModuleKey = new Map<string, StaticEvaluator>();

  constructor(
    evaluation: StaticProjectEvaluationResult,
    private readonly activationContext: RuntimeBindingSourceActivationContext | null = null,
    private readonly readActiveContainer: () => Container | null = () => null,
  ) {
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      this.sourcesByFileName.set(normalizeModuleKey(source.sourceFile.fileName), source);
      this.sourcesByFileName.set(normalizeModuleKey(source.moduleKey), source);
    }
  }

  sourceForNode(node: ts.Node): EvaluatedProjectSource | null {
    return this.sourcesByFileName.get(normalizeModuleKey(node.getSourceFile().fileName)) ?? null;
  }

  sourceForValue(value: EvaluationValue): EvaluatedProjectSource | null {
    const sourceFile = value.node?.getSourceFile() ?? null;
    return sourceFile == null
      ? null
      : this.sourcesByFileName.get(normalizeModuleKey(sourceFile.fileName)) ?? null;
  }

  instantiateClassValue(
    source: EvaluatedProjectSource,
    classValue: EvaluationClassValue,
    node: ts.Node,
    argumentValues: readonly EvaluationValue[] = [],
  ): StaticExpressionEvaluationResult {
    return this.evaluatorForSource(source).evaluateClassValueInstantiation(
      classValue,
      source.moduleKey,
      node,
      argumentValues,
    );
  }

  readPropertyValue(
    source: EvaluatedProjectSource,
    receiver: EvaluationValue,
    propertyName: string,
    node: ts.Node,
  ): StaticExpressionEvaluationResult {
    return this.evaluatorForSource(source).evaluatePropertyValue(
      receiver,
      propertyName,
      source.moduleKey,
      node,
    );
  }

  callFunctionValue(
    source: EvaluatedProjectSource,
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
  ): StaticExpressionEvaluationResult {
    return this.evaluatorForSource(source).evaluateFunctionValue(
      callee,
      call,
      source.moduleKey,
      argumentValues,
      thisValue,
    );
  }

  private evaluatorForSource(source: EvaluatedProjectSource): StaticEvaluator {
    const moduleKey = normalizeModuleKey(source.moduleKey);
    let evaluator = this.evaluatorsByModuleKey.get(moduleKey);
    if (evaluator === undefined) {
      const runtimeHost = this.activationContext == null
        ? source.evaluation.runtimeHost
        : this.activationContext.runtimeHostFor(source.evaluation.runtimeHost, this.readActiveContainer);
      evaluator = new StaticEvaluator(source.evaluation.policy, runtimeHost);
      this.evaluatorsByModuleKey.set(moduleKey, evaluator);
    }
    return evaluator;
  }
}
