import {
  BreakEvaluationCompletion,
  ContinueEvaluationCompletion,
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  OpenEvaluationCompletion,
  ReturnEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationCompletion,
  type EvaluationExpressionAbruptCompletion,
} from './completion.js';
import {
  EvaluationBinding,
  ModuleEnvironmentRecord,
} from './environment.js';
import {
  StaticExecutedCall,
  StaticEvaluationRuntimeValueResult,
  StaticModuleEvaluationResult,
  type StaticEvaluationRuntimeHost,
  type StaticEvaluationValueMetadataTransfer,
} from './evaluator.js';
import type { StaticIntrinsicEvaluationHost } from './intrinsics/contracts.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryObjectValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationModuleNamespaceExport,
  EvaluationModuleNamespaceValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationPromiseValue,
  EvaluationSetValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

/** Canonical product host behind a session-bound wrapper, retained so forks remain compositional. */
const sourceRuntimeHostsBySessionHost = new WeakMap<StaticEvaluationRuntimeHost, StaticEvaluationRuntimeHost>();

/** Graph-preserving mutable analysis session forked from one admitted project-evaluation graph. */
export class StaticEvaluationSessionFork {
  private readonly environments = new WeakMap<ModuleEnvironmentRecord, ModuleEnvironmentRecord>();
  private readonly populatedEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly populatingEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly adoptedEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly adoptingEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly values = new WeakMap<object, EvaluationValue>();
  private readonly sessionValues = new WeakSet<object>();
  private readonly populatedClasses = new WeakSet<EvaluationClassValue>();
  private readonly populatingClasses = new WeakSet<EvaluationClassValue>();
  private readonly transferredMetadata = new WeakSet<object>();
  private readonly transferringMetadata = new WeakSet<object>();
  private sessionRuntimeHost: StaticEvaluationRuntimeHost | null = null;
  private readonly metadataTransfer: StaticEvaluationValueMetadataTransfer = {
    forkValue: <TValue extends EvaluationValue>(value: TValue): TValue => this.forkValue(value),
  };

  private readonly sourceRuntimeHost: StaticEvaluationRuntimeHost;

  constructor(runtimeHost: StaticEvaluationRuntimeHost) {
    this.sourceRuntimeHost = sourceRuntimeHostsBySessionHost.get(runtimeHost) ?? runtimeHost;
  }

  forkModuleEvaluation(source: StaticModuleEvaluationResult): StaticModuleEvaluationResult {
    const runtimeHost = this.forkRuntimeHost(source.runtimeHost);
    return new StaticModuleEvaluationResult(
      source.moduleKey,
      this.forkEnvironment(source.environment),
      this.forkCompletion(source.completion),
      source.openSeams,
      source.executedCalls.map((call) => new StaticExecutedCall(
        call.expression,
        this.forkEnvironment(call.environment),
        call.moduleKey,
      )),
      source.policy,
      runtimeHost,
    );
  }

  forkEnvironment(source: ModuleEnvironmentRecord): ModuleEnvironmentRecord {
    const target = this.environmentShell(source);
    this.populateEnvironment(source, target);
    return target;
  }

  forkValue<TValue extends EvaluationValue>(source: TValue): TValue {
    if (!evaluationValueHasMutableGraph(source)) {
      return source;
    }
    if (this.isSessionValue(source)) {
      return this.adoptSessionValueGraph(source);
    }
    const existing = this.values.get(source);
    if (existing != null) {
      this.transferRuntimeHostMetadata(source, existing);
      return existing as TValue;
    }

    return this.forkMutableValue(source) as TValue;
  }

  private forkMutableValue(source: EvaluationValue): EvaluationValue {
    switch (source.kind) {
      case EvaluationValueKind.Unknown: {
        if (source.retainedCandidate == null) {
          return source;
        }
        const target = new EvaluationUnknownValue(
          source.reason,
          source.node,
          source.hasOpenSeam,
          this.forkValue(source.retainedCandidate),
        );
        this.bindValue(source, target);
        return target;
      }
      case EvaluationValueKind.Array: {
        const target = new EvaluationArrayValue(
          [],
          source.mayHaveUnknownElements,
          source.node,
          source.mayHaveUnknownOrder,
          source.uncertainties,
          source.shapeOpenSeams,
        );
        this.bindValue(source, target);
        target.elements.push(...source.elements.map((element) =>
          new EvaluationArrayElement(this.forkValue(element.value), element.expression, element.openSeams)
        ));
        return target;
      }
      case EvaluationValueKind.Set: {
        const target = new EvaluationSetValue([], source.mayHaveUnknownElements, source.node, source.weak);
        this.bindValue(source, target);
        target.elements.push(...source.elements.map((element) =>
          new EvaluationArrayElement(this.forkValue(element.value), element.expression, element.openSeams)
        ));
        return target;
      }
      case EvaluationValueKind.Map: {
        const target = new EvaluationMapValue([], source.mayHaveUnknownEntries, source.node, source.weak);
        this.bindValue(source, target);
        target.entries.push(...source.entries.map((entry) => new EvaluationMapEntry(
          this.forkValue(entry.key),
          this.forkValue(entry.value),
          entry.expression,
        )));
        return target;
      }
      case EvaluationValueKind.Object: {
        const target = new EvaluationObjectValue(
          new Map(),
          source.mayHaveUnknownProperties,
          source.node,
          source.uncertainties,
          source.shapeOpenSeams,
        );
        this.bindValue(source, target);
        this.forkProperties(source.properties, target.properties);
        return target;
      }
      case EvaluationValueKind.BoundaryObject: {
        const target = new EvaluationBoundaryObjectValue(
          source.boundaryKind,
          source.path,
          new Map(),
          source.node,
        );
        this.bindValue(source, target);
        this.forkProperties(source.properties, target.properties);
        return target;
      }
      case EvaluationValueKind.Function: {
        const environment = this.environmentShell(this.moduleEnvironment(source.environment));
        const target = new EvaluationFunctionValue(source.declaration, environment, source.node);
        this.bindValue(source, target);
        this.populateEnvironment(this.moduleEnvironment(source.environment), environment);
        this.forkProperties(source.properties, target.properties);
        return target;
      }
      case EvaluationValueKind.Class: {
        const target = this.classShell(source);
        this.populateClass(source, target);
        return target;
      }
      case EvaluationValueKind.Instance: {
        const classValue = this.classShell(source.classValue);
        const target = new EvaluationInstanceValue(
          classValue,
          new Map(),
          source.mayHaveUnknownProperties,
          source.node,
          source.constructionOpenSeams,
          source.shapeOpenSeams,
        );
        this.bindValue(source, target);
        this.populateClass(source.classValue, classValue);
        this.forkProperties(source.properties, target.properties);
        return target;
      }
      case EvaluationValueKind.ModuleNamespace: {
        const exportEntries = new Map<string, EvaluationModuleNamespaceExport>();
        const target = new EvaluationModuleNamespaceValue(
          source.moduleKey,
          exportEntries,
          source.mayHaveUnknownExports,
          source.node,
        );
        this.bindValue(source, target);
        for (const [name, entry] of source.exportEntries) {
          exportEntries.set(name, new EvaluationModuleNamespaceExport(
            entry.name,
            this.forkValue(entry.value),
            entry.sourceNode,
            entry.openSeams,
          ));
        }
        return target;
      }
      case EvaluationValueKind.Promise: {
        const target = EvaluationPromiseValue.forkShell(source.node);
        this.bindValue(source, target);
        target.completeFork(this.forkValue(source.fulfilledValue));
        return target;
      }
      default:
        return source;
    }
  }

  private environmentShell(source: ModuleEnvironmentRecord): ModuleEnvironmentRecord {
    if (source.belongsToGraph(this)) {
      return source;
    }
    let target = this.environments.get(source);
    if (target == null) {
      target = new ModuleEnvironmentRecord(source.moduleKey);
      this.environments.set(source, target);
      target.adoptGraphOwner(this);
    }
    return target;
  }

  private populateEnvironment(source: ModuleEnvironmentRecord, target: ModuleEnvironmentRecord): void {
    if (this.populatedEnvironments.has(source) || this.populatingEnvironments.has(source)) {
      return;
    }
    this.populatingEnvironments.add(source);
    try {
      for (const binding of source.readBindings()) {
        const targetBinding = new EvaluationBinding(
          binding.name,
          binding.bindingKind,
          binding.mutable,
          binding.declaration,
          binding.state,
          this.forkValue(binding.value),
          binding.openSeams,
        );
        target.installBinding(targetBinding);
      }
      this.populatedEnvironments.add(source);
    } finally {
      this.populatingEnvironments.delete(source);
    }
  }

  private forkProperties(
    source: ReadonlyMap<string, EvaluationObjectProperty>,
    target: Map<string, EvaluationObjectProperty>,
  ): void {
    for (const [name, property] of source) {
      target.set(name, new EvaluationObjectProperty(
        property.name,
        this.forkValue(property.value),
        property.node,
        property.state,
        property.openSeams,
      ));
    }
  }

  private classShell(source: EvaluationClassValue): EvaluationClassValue {
    const existing = this.values.get(source);
    if (existing != null) {
      if (existing.kind !== EvaluationValueKind.Class) {
        throw new Error('Static evaluation session mapped a class source to a non-class value.');
      }
      return existing;
    }
    const environment = this.environmentShell(this.moduleEnvironment(source.environment));
    const target = new EvaluationClassValue(source.declaration, environment, source.node);
    this.bindValue(source, target);
    return target;
  }

  private populateClass(source: EvaluationClassValue, target: EvaluationClassValue): void {
    if (this.populatedClasses.has(source) || this.populatingClasses.has(source)) {
      return;
    }
    this.populatingClasses.add(source);
    try {
      this.populateEnvironment(
        this.moduleEnvironment(source.environment),
        this.moduleEnvironment(target.environment),
      );
      this.forkProperties(source.properties, target.properties);
      this.populatedClasses.add(source);
    } finally {
      this.populatingClasses.delete(source);
    }
  }

  private bindValue(source: EvaluationValue, target: EvaluationValue): void {
    this.values.set(source, target);
    this.sessionValues.add(target);
    this.transferRuntimeHostMetadata(source, target);
  }

  private moduleEnvironment(
    environment: EvaluationFunctionValue['environment'],
  ): ModuleEnvironmentRecord {
    return environment;
  }

  private forkCompletion(completion: EvaluationCompletion): EvaluationCompletion {
    switch (completion.kind) {
      case EvaluationCompletionKind.Normal:
        return new NormalEvaluationCompletion(this.forkValue(completion.value));
      case EvaluationCompletionKind.Return:
        return new ReturnEvaluationCompletion(this.forkValue(completion.value), completion.openSeams);
      case EvaluationCompletionKind.Throw:
        return new ThrowEvaluationCompletion(this.forkValue(completion.value), completion.openSeams);
      case EvaluationCompletionKind.Break:
        return new BreakEvaluationCompletion(completion.label);
      case EvaluationCompletionKind.Continue:
        return new ContinueEvaluationCompletion(completion.label);
      case EvaluationCompletionKind.Open:
        return new OpenEvaluationCompletion(completion.summary);
    }
  }

  private forkExpressionAbruptCompletion(
    completion: EvaluationExpressionAbruptCompletion,
  ): EvaluationExpressionAbruptCompletion {
    return new ThrowEvaluationCompletion(this.forkValue(completion.value), completion.openSeams);
  }

  forkRuntimeHost(host: StaticEvaluationRuntimeHost): StaticEvaluationRuntimeHost {
    const sourceHost = sourceRuntimeHostsBySessionHost.get(host) ?? host;
    if (sourceHost !== this.sourceRuntimeHost) {
      throw new Error('Static evaluation session cannot combine values from different runtime hosts.');
    }
    if (this.sessionRuntimeHost != null) {
      return this.sessionRuntimeHost;
    }
    const sessionHost: StaticEvaluationRuntimeHost = {
      transferValueMetadata: (source, target, transfer) =>
        sourceHost.transferValueMetadata?.(source, target, transfer),
      resolveIdentifier: (identifier, environment, moduleKey) =>
        this.forkNullableValue(sourceHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null),
      resolveCommonJsRequire: (moduleKey, moduleSpecifier, node) =>
        this.forkRuntimeValueResult(sourceHost.resolveCommonJsRequire?.(moduleKey, moduleSpecifier, node) ?? null),
      resolveDynamicImport: (moduleKey, moduleSpecifier, node) =>
        this.forkNullableValue(sourceHost.resolveDynamicImport?.(moduleKey, moduleSpecifier, node) ?? null),
      evaluateCallExpression: (call, environment, moduleKey, depth, intrinsicHost) =>
        this.adoptNullableSessionValue(
          sourceHost.evaluateCallExpression?.(
            call,
            environment,
            moduleKey,
            depth,
            this.sessionIntrinsicHost(intrinsicHost),
          ) ?? null,
        ),
      evaluateNewExpression: (expression, environment, moduleKey, depth, intrinsicHost) =>
        this.adoptNullableSessionValue(
          sourceHost.evaluateNewExpression?.(
            expression,
            environment,
            moduleKey,
            depth,
            this.sessionIntrinsicHost(intrinsicHost),
          ) ?? null,
        ),
    };
    sourceRuntimeHostsBySessionHost.set(sessionHost, sourceHost);
    this.sessionRuntimeHost = sessionHost;
    return sessionHost;
  }

  private sessionIntrinsicHost(host: StaticIntrinsicEvaluationHost): StaticIntrinsicEvaluationHost {
    return {
      guardrails: host.guardrails,
      raise: (completion) => host.raise(this.forkExpressionAbruptCompletion(completion)),
      evaluateExpression: (expression, environment, moduleKey, depth) =>
        this.adoptSessionValueGraph(host.evaluateExpression(expression, environment, moduleKey, depth)),
      evaluateFunctionWithArguments: (callee, call, argumentValues, moduleKey, depth) =>
        this.adoptSessionValueGraph(
          host.evaluateFunctionWithArguments(callee, call, argumentValues, moduleKey, depth),
        ),
      evaluateClassInstantiation: (callee, expression, argumentValues, moduleKey, depth) =>
        this.adoptSessionValueGraph(
          host.evaluateClassInstantiation(callee, expression, argumentValues, moduleKey, depth),
        ),
      open: (seamKind, summary, node, moduleKey, reasonKinds) =>
        host.open(seamKind, summary, node, moduleKey, reasonKinds),
      unknown: (reason, node, moduleKey, seamKind) => host.unknown(reason, node, moduleKey, seamKind),
      checkpoint: () => host.checkpoint(),
      restore: (checkpoint) => host.restore(checkpoint),
      openSeamsSince: (checkpoint) => host.openSeamsSince(checkpoint),
      resolveCommonJsRequire: (moduleKey, moduleSpecifier, node) =>
        this.adoptNullableSessionValue(host.resolveCommonJsRequire(moduleKey, moduleSpecifier, node)),
      resolveDynamicImport: (moduleKey, moduleSpecifier, node) =>
        this.adoptNullableSessionValue(host.resolveDynamicImport(moduleKey, moduleSpecifier, node)),
      evaluateCallExpression: (call, environment, moduleKey, depth, nestedHost) =>
        this.adoptNullableSessionValue(
          host.evaluateCallExpression(
            call,
            environment,
            moduleKey,
            depth,
            this.sessionIntrinsicHost(nestedHost),
          ),
        ),
    };
  }

  private forkRuntimeValueResult(
    result: StaticEvaluationRuntimeValueResult | null,
  ): StaticEvaluationRuntimeValueResult | null {
    return result == null
      ? null
      : new StaticEvaluationRuntimeValueResult(
          this.forkNullableValue(result.value),
          result.abruptCompletion == null
            ? null
            : this.forkExpressionAbruptCompletion(result.abruptCompletion),
          result.openSeams,
        );
  }

  private transferRuntimeHostMetadata(source: EvaluationValue, target: EvaluationValue): void {
    if (this.transferredMetadata.has(source) || this.transferringMetadata.has(source)) {
      return;
    }
    this.transferringMetadata.add(source);
    try {
      this.sourceRuntimeHost.transferValueMetadata?.(source, target, this.metadataTransfer);
      this.transferredMetadata.add(source);
    } finally {
      this.transferringMetadata.delete(source);
    }
  }

  private forkNullableValue(value: EvaluationValue | null): EvaluationValue | null {
    return value == null ? null : this.forkValue(value);
  }

  private adoptNullableSessionValue(value: EvaluationValue | null): EvaluationValue | null {
    return value == null ? null : this.adoptSessionValueGraph(value);
  }

  private isSessionValue(value: EvaluationValue): boolean {
    return this.sessionValues.has(value)
      || value.kind === EvaluationValueKind.Function && value.environment.belongsToGraph(this)
      || value.kind === EvaluationValueKind.Class && value.environment.belongsToGraph(this)
      || value.kind === EvaluationValueKind.Instance && value.classValue.environment.belongsToGraph(this);
  }

  private adoptSessionValueGraph<TValue extends EvaluationValue>(value: TValue): TValue {
    if (!evaluationValueHasMutableGraph(value)) {
      return value;
    }
    const mapped = this.values.get(value);
    if (mapped != null) {
      return mapped as TValue;
    }
    if (this.sessionValues.has(value)) {
      return value;
    }
    if (!this.isSessionValue(value)) {
      return this.forkValue(value);
    }
    this.sessionValues.add(value);
    switch (value.kind) {
      case EvaluationValueKind.Array:
      case EvaluationValueKind.Set:
        for (let index = 0; index < value.elements.length; index += 1) {
          const element = value.elements[index]!;
          const adopted = this.adoptSessionValueGraph(element.value);
          if (adopted !== element.value) {
            value.elements[index] = new EvaluationArrayElement(adopted, element.expression, element.openSeams);
          }
        }
        break;
      case EvaluationValueKind.Map:
        for (let index = 0; index < value.entries.length; index += 1) {
          const entry = value.entries[index]!;
          const key = this.adoptSessionValueGraph(entry.key);
          const entryValue = this.adoptSessionValueGraph(entry.value);
          if (key !== entry.key || entryValue !== entry.value) {
            value.entries[index] = new EvaluationMapEntry(key, entryValue, entry.expression);
          }
        }
        break;
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
        this.adoptPropertyValues(value.properties);
        break;
      case EvaluationValueKind.Function:
        this.adoptEnvironment(value.environment);
        this.adoptPropertyValues(value.properties);
        break;
      case EvaluationValueKind.Class:
        this.adoptEnvironment(value.environment);
        this.adoptPropertyValues(value.properties);
        break;
      case EvaluationValueKind.Instance: {
        const classValue = this.adoptSessionValueGraph(value.classValue);
        if (classValue !== value.classValue) {
          throw new Error('Session-local instance retained a class from another evaluation graph.');
        }
        this.adoptPropertyValues(value.properties);
        break;
      }
      case EvaluationValueKind.ModuleNamespace:
        for (const [name, exported] of value.exportEntries) {
          if (this.adoptSessionValueGraph(exported.value) !== exported.value) {
            throw new Error(`Session-local module namespace export ${name} retained another evaluation graph.`);
          }
        }
        break;
      case EvaluationValueKind.Promise: {
        const fulfilled = this.adoptSessionValueGraph(value.fulfilledValue);
        if (fulfilled !== value.fulfilledValue) {
          throw new Error('Session-local Promise retained a fulfillment value from another evaluation graph.');
        }
        break;
      }
    }
    return value;
  }

  private adoptEnvironment(environment: ModuleEnvironmentRecord): void {
    if (this.adoptedEnvironments.has(environment) || this.adoptingEnvironments.has(environment)) {
      return;
    }
    this.adoptingEnvironments.add(environment);
    try {
      environment.adoptGraphOwner(this);
      const bindings = environment.readBindings();
      for (const binding of bindings) {
        if (evaluationValueHasMutableGraph(binding.value) && this.values.get(binding.value) == null) {
          this.sessionValues.add(binding.value);
        }
      }
      for (const binding of bindings) {
        binding.value = this.adoptSessionValueGraph(binding.value);
      }
      this.adoptedEnvironments.add(environment);
    } finally {
      this.adoptingEnvironments.delete(environment);
    }
  }

  private adoptPropertyValues(properties: Map<string, EvaluationObjectProperty>): void {
    for (const [name, property] of properties) {
      const value = this.adoptSessionValueGraph(property.value);
      if (value !== property.value) {
        properties.set(name, new EvaluationObjectProperty(
          property.name,
          value,
          property.node,
          property.state,
          property.openSeams,
        ));
      }
    }
  }
}

function evaluationValueHasMutableGraph(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Unknown:
      return value.retainedCandidate != null && evaluationValueHasMutableGraph(value.retainedCandidate);
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    default:
      return false;
  }
}
