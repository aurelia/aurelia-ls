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
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { sourceExpressionForSourceAddress } from '../type-system/source-address-expression.js';

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
  private activeContainer: Container | null = null;

  constructor(
    evaluation: StaticProjectEvaluationResult,
    private readonly activationContext: RuntimeBindingSourceActivationContext | null = null,
  ) {
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      this.sourcesByFileName.set(normalizeModuleKey(source.sourceFile.fileName), source);
      this.sourcesByFileName.set(normalizeModuleKey(source.moduleKey), source);
    }
  }

  /** Runs a source-value read with the DI container visible to cached StaticEvaluator resolve hooks. */
  withActiveContainer<TValue>(
    activeContainer: Container | null,
    read: () => TValue,
  ): TValue {
    const previous = this.activeContainer;
    this.activeContainer = activeContainer;
    try {
      return read();
    } finally {
      this.activeContainer = previous;
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

  /** Reads a keyed member through the source module evaluator that owns the receiver value. */
  readElementValue(
    source: EvaluatedProjectSource,
    receiver: EvaluationValue,
    argument: EvaluationValue,
    node: ts.Node,
  ): StaticExpressionEvaluationResult {
    return this.evaluatorForSource(source).evaluateElementValue(
      receiver,
      argument,
      source.moduleKey,
      node,
    );
  }

  /** Evaluates the TypeScript expression at an authored source address inside its original module environment. */
  evaluateSourceAddressExpression(
    store: KernelStore,
    sourceAddressHandle: AddressHandle,
  ): StaticExpressionEvaluationResult | null {
    const expression = this.expressionForSourceAddress(store, sourceAddressHandle);
    if (expression == null) {
      return null;
    }
    const source = this.sourceForNode(expression);
    if (source == null) {
      return null;
    }
    return this.evaluatorForSource(source).evaluateExpressionInEnvironment(
      expression,
      source.evaluation.environment,
      source.moduleKey,
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

  private expressionForSourceAddress(
    store: KernelStore,
    sourceAddressHandle: AddressHandle,
  ): ts.Expression | null {
    return sourceExpressionForSourceAddress(
      store,
      sourceAddressHandle,
      (path) => this.sourcesByFileName.get(normalizeModuleKey(path))?.sourceFile ?? null,
    );
  }

  private evaluatorForSource(source: EvaluatedProjectSource): StaticEvaluator {
    const moduleKey = normalizeModuleKey(source.moduleKey);
    let evaluator = this.evaluatorsByModuleKey.get(moduleKey);
    if (evaluator === undefined) {
      const runtimeHost = this.activationContext == null
        ? source.evaluation.runtimeHost
        : this.activationContext.runtimeHostFor(source.evaluation.runtimeHost, () => this.activeContainer);
      evaluator = new StaticEvaluator(source.evaluation.policy, runtimeHost);
      this.evaluatorsByModuleKey.set(moduleKey, evaluator);
    }
    return evaluator;
  }
}
