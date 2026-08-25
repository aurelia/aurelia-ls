import {
  BreakEvaluationCompletion,
  ContinueEvaluationCompletion,
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  OpenEvaluationCompletion,
  ReturnEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationCompletion,
} from './completion.js';
import {
  EvaluationBinding,
  ModuleEnvironmentRecord,
} from './environment.js';
import {
  type StaticEvaluationRuntimeHost,
  type StaticEvaluationValueMetadataTransfer,
} from './evaluator.js';
import { mapStaticEvaluationExecutionTopologyValues } from './execution-topology.js';
import { StaticModuleEvaluationResult } from './module-evaluation-result.js';
import type { StaticIntrinsicEvaluationHost } from './intrinsics/contracts.js';
import {
  StaticInvocationDispatchKind,
  StaticInvocationHandled,
  StaticInvocationNotApplicable,
  type StaticInvocationDispatch,
} from './invocation.js';
import { EvaluationValueEvidence } from './value-pressure.js';
import {
  evaluationValueBelongsToGraph,
  evaluationValueGraphOwner,
  evaluationValueHasMutableGraph,
  ownEvaluationValue,
  type StaticEvaluationForkLineage,
} from './evaluation-graph.js';
import { bindEvaluationValueLineage } from './value-relation.js';
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
  EvaluationPromiseSettlement,
  EvaluationPromiseValue,
  EvaluationSetElement,
  EvaluationSetValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

/** Canonical product host behind a session-bound wrapper, retained so forks remain compositional. */
const sourceRuntimeHostsBySessionHost = new WeakMap<StaticEvaluationRuntimeHost, StaticEvaluationRuntimeHost>();

/** Graph-preserving mutable analysis session forked from one admitted project-evaluation graph. */
const enum StaticEvaluationGraphRetentionKind {
  External,
  Produced,
}

export class StaticEvaluationSessionFork implements StaticEvaluationForkLineage {
  private readonly environments = new WeakMap<ModuleEnvironmentRecord, ModuleEnvironmentRecord>();
  private readonly sourceEnvironments = new WeakMap<ModuleEnvironmentRecord, ModuleEnvironmentRecord>();
  private readonly populatedEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly populatingEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly values = new WeakMap<object, EvaluationValue>();
  private readonly sourceValues = new WeakMap<object, EvaluationValue>();
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
      mapStaticEvaluationExecutionTopologyValues(
        source.executionTopology,
        (value) => this.forkValue(value),
        'session-fork.execution',
      ),
      source.policy,
      runtimeHost,
    );
  }

  forkEnvironment(source: ModuleEnvironmentRecord): ModuleEnvironmentRecord {
    const target = this.environmentShell(source);
    this.populateEnvironment(source, target);
    return target;
  }

  sourceEnvironment(environment: ModuleEnvironmentRecord): ModuleEnvironmentRecord | null {
    return this.sourceEnvironments.get(environment) ?? null;
  }

  forkValue<TValue extends EvaluationValue>(source: TValue): TValue {
    if (!evaluationValueHasMutableGraph(source)) {
      return source;
    }
    if (evaluationValueBelongsToGraph(source, this)) {
      return source;
    }
    const existing = this.values.get(source);
    if (existing != null) {
      this.transferRuntimeHostMetadata(source, existing);
      return existing as TValue;
    }

    return this.forkMutableValue(source) as TValue;
  }

  sourceValue(value: EvaluationValue): EvaluationValue | null {
    return evaluationValueHasMutableGraph(value)
      ? this.sourceValues.get(value) ?? null
      : null;
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
          source.node,
          source.shape,
        );
        this.bindValue(source, target);
        target.replaceElements(source.elements.map((element) =>
          new EvaluationArrayElement(this.forkValue(element.value), element.expression, element.openSeams, element.runtimeIndex)
        ));
        return target;
      }
      case EvaluationValueKind.Set: {
        const target = new EvaluationSetValue([], source.node, source.shape, source.weak);
        this.bindValue(source, target);
        target.replaceElements(source.elements.map((element) =>
          new EvaluationSetElement(
            this.forkValue(element.value),
            element.expression,
            element.openSeams,
            element.state,
            element.presenceOpenSeams,
          )
        ));
        return target;
      }
      case EvaluationValueKind.Map: {
        const target = new EvaluationMapValue([], source.node, source.shape, source.weak);
        this.bindValue(source, target);
        target.replaceEntries(source.entries.map((entry) => new EvaluationMapEntry(
          this.forkValue(entry.key),
          this.forkValue(entry.value),
          entry.keyExpression,
          entry.valueExpression,
          entry.keyOpenSeams,
          entry.valueOpenSeams,
          entry.state,
          entry.presenceOpenSeams,
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
          source.propertyOrderOpenSeams,
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
          source.callable,
        );
        this.bindValue(source, target);
        this.forkProperties(source.properties, target.properties);
        return target;
      }
      case EvaluationValueKind.Function: {
        const environment = this.environmentShell(this.moduleEnvironment(source.environment));
        const target = new EvaluationFunctionValue(
          source.declaration,
          environment,
          source.node,
          new Map(),
          source.mayHaveUnknownProperties,
          source.shapeOpenSeams,
          source.propertyOrderOpenSeams,
        );
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
          source.propertyOrderOpenSeams,
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
        target.completeFork(new EvaluationPromiseSettlement(
          source.settlement.kind,
          new EvaluationValueEvidence(
            this.forkValue(source.settlement.evidence.value),
            source.settlement.evidence.openSeams,
          ),
        ));
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
      target = new ModuleEnvironmentRecord(
        source.moduleKey,
        source.outer == null ? null : this.environmentShell(source.outer),
      );
      this.environments.set(source, target);
      this.sourceEnvironments.set(target, source);
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
      if (source.outer != null && target.outer != null) {
        this.populateEnvironment(source.outer, target.outer);
      }
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
        property.presence,
        property.presenceOpenSeams,
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
    const target = new EvaluationClassValue(
      source.declaration,
      environment,
      source.node,
      new Map(),
      source.mayHaveUnknownProperties,
      source.shapeOpenSeams,
      source.propertyOrderOpenSeams,
      source.baseClass == null ? null : this.classShell(source.baseClass),
    );
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
    this.sourceValues.set(target, source);
    bindEvaluationValueLineage(source, target);
    ownEvaluationValue(target, this);
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

  forkRuntimeHost(host: StaticEvaluationRuntimeHost): StaticEvaluationRuntimeHost {
    const sourceHost = sourceRuntimeHostsBySessionHost.get(host) ?? host;
    if (sourceHost !== this.sourceRuntimeHost) {
      throw new Error('Static evaluation session cannot combine values from different runtime hosts.');
    }
    if (this.sessionRuntimeHost != null) {
      return this.sessionRuntimeHost;
    }
    const sessionHost: StaticEvaluationRuntimeHost = {
      ...sourceHost,
      evaluationValueGraph: this,
    };
    sourceRuntimeHostsBySessionHost.set(sessionHost, sourceHost);
    this.sessionRuntimeHost = sessionHost;
    return sessionHost;
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

  private adoptNullableExternal(value: EvaluationValue | null): EvaluationValue | null {
    return value == null ? null : this.adoptExternal(value);
  }

  adoptExternal<TValue extends EvaluationValue>(value: TValue): TValue {
    if (!evaluationValueHasMutableGraph(value)) {
      return value;
    }
    const mapped = this.values.get(value);
    const retained = (mapped ?? value) as TValue;
    if (!evaluationValueBelongsToGraph(retained, this)) {
      return this.forkValue(value);
    }
    return this.normalizeRetainedValue(
      retained,
      StaticEvaluationGraphRetentionKind.External,
      new WeakSet<object>(),
      new WeakSet<ModuleEnvironmentRecord>(),
    );
  }

  retainProduced<TValue extends EvaluationValue>(value: TValue): TValue {
    if (!evaluationValueHasMutableGraph(value)) {
      return value;
    }
    const owner = evaluationValueGraphOwner(value);
    if (owner != null && owner !== this) {
      throw new Error('Evaluator produced a value already owned by another mutable graph.');
    }
    ownEvaluationValue(value, this);
    return this.normalizeRetainedValue(
      value,
      StaticEvaluationGraphRetentionKind.Produced,
      new WeakSet<object>(),
      new WeakSet<ModuleEnvironmentRecord>(),
    );
  }

  retainEnvironment(environment: ModuleEnvironmentRecord): void {
    const owner = environment.readGraphOwner();
    if (owner != null && owner !== this) {
      throw new Error(`Evaluation environment ${environment.moduleKey} belongs to another mutable graph.`);
    }
    if (owner == null) {
      environment.adoptGraphOwner(this);
    }
    this.normalizeEnvironment(
      environment,
      StaticEvaluationGraphRetentionKind.Produced,
      new WeakSet<object>(),
      new WeakSet<ModuleEnvironmentRecord>(),
    );
  }

  reconcileEnvironmentAfterExternal(environment: ModuleEnvironmentRecord): void {
    if (environment.readGraphOwner() !== this) {
      throw new Error(`External evaluation environment ${environment.moduleKey} is not owned by this mutable graph.`);
    }
    this.normalizeEnvironment(
      environment,
      StaticEvaluationGraphRetentionKind.External,
      new WeakSet<object>(),
      new WeakSet<ModuleEnvironmentRecord>(),
    );
  }

  private normalizeRetainedValue<TValue extends EvaluationValue>(
    value: TValue,
    retention: StaticEvaluationGraphRetentionKind,
    values: WeakSet<object>,
    environments: WeakSet<ModuleEnvironmentRecord>,
  ): TValue {
    if (!evaluationValueHasMutableGraph(value)) {
      return value;
    }
    const mapped = this.values.get(value);
    if (mapped != null) {
      return this.normalizeRetainedValue(mapped, retention, values, environments) as TValue;
    }
    const owner = evaluationValueGraphOwner(value);
    if (owner !== this) {
      if (retention === StaticEvaluationGraphRetentionKind.External || owner != null) {
        return this.forkValue(value);
      }
      ownEvaluationValue(value, this);
    }
    if (values.has(value)) {
      return value;
    }
    values.add(value);
    switch (value.kind) {
      case EvaluationValueKind.Unknown:
        if (
          value.retainedCandidate != null
          && this.normalizeRetainedValue(value.retainedCandidate, retention, values, environments) !== value.retainedCandidate
        ) {
          throw new Error('Owned unknown value retained a candidate from another mutable graph.');
        }
        break;
      case EvaluationValueKind.Array:
        for (let index = 0; index < value.elements.length; index += 1) {
          const element = value.elements[index]!;
          const retained = this.normalizeRetainedValue(element.value, retention, values, environments);
          if (retained !== element.value) {
            value.elements[index] = new EvaluationArrayElement(
              retained,
              element.expression,
              element.openSeams,
              element.runtimeIndex,
            );
          }
        }
        break;
      case EvaluationValueKind.Set:
        for (let index = 0; index < value.elements.length; index += 1) {
          const element = value.elements[index]!;
          const retained = this.normalizeRetainedValue(element.value, retention, values, environments);
          if (retained !== element.value) {
            value.elements[index] = new EvaluationSetElement(
              retained,
              element.expression,
              element.openSeams,
              element.state,
              element.presenceOpenSeams,
            );
          }
        }
        break;
      case EvaluationValueKind.Map:
        for (let index = 0; index < value.entries.length; index += 1) {
          const entry = value.entries[index]!;
          const key = this.normalizeRetainedValue(entry.key, retention, values, environments);
          const entryValue = this.normalizeRetainedValue(entry.value, retention, values, environments);
          if (key !== entry.key || entryValue !== entry.value) {
            value.entries[index] = new EvaluationMapEntry(
              key,
              entryValue,
              entry.keyExpression,
              entry.valueExpression,
              entry.keyOpenSeams,
              entry.valueOpenSeams,
              entry.state,
              entry.presenceOpenSeams,
            );
          }
        }
        break;
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
        this.normalizeProperties(value.properties, retention, values, environments);
        break;
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
        this.normalizeEnvironment(value.environment, retention, values, environments);
        this.normalizeProperties(value.properties, retention, values, environments);
        break;
      case EvaluationValueKind.Instance: {
        const classValue = this.normalizeRetainedValue(value.classValue, retention, values, environments);
        if (classValue !== value.classValue) {
          throw new Error('Owned instance retained a class from another mutable graph.');
        }
        this.normalizeProperties(value.properties, retention, values, environments);
        break;
      }
      case EvaluationValueKind.ModuleNamespace:
        for (const [name, exported] of value.exportEntries) {
          if (this.normalizeRetainedValue(exported.value, retention, values, environments) !== exported.value) {
            throw new Error(`Owned module namespace export ${name} retained another mutable graph.`);
          }
        }
        break;
      case EvaluationValueKind.Promise:
        if (
          this.normalizeRetainedValue(value.settlement.evidence.value, retention, values, environments)
          !== value.settlement.evidence.value
        ) {
          throw new Error('Owned Promise retained a settlement value from another mutable graph.');
        }
        break;
    }
    return value;
  }

  private normalizeEnvironment(
    environment: ModuleEnvironmentRecord,
    retention: StaticEvaluationGraphRetentionKind,
    values: WeakSet<object>,
    environments: WeakSet<ModuleEnvironmentRecord>,
  ): void {
    if (environments.has(environment)) {
      return;
    }
    const owner = environment.readGraphOwner();
    if (owner == null && retention === StaticEvaluationGraphRetentionKind.Produced) {
      environment.adoptGraphOwner(this);
    } else if (owner !== this) {
      throw new Error(`Owned value captured environment ${environment.moduleKey} from another mutable graph.`);
    }
    environments.add(environment);
    if (environment.outer != null) {
      this.normalizeEnvironment(environment.outer, retention, values, environments);
    }
    for (const binding of environment.readBindings()) {
      binding.value = this.normalizeRetainedValue(binding.value, retention, values, environments);
    }
  }

  private normalizeProperties(
    properties: Map<string, EvaluationObjectProperty>,
    retention: StaticEvaluationGraphRetentionKind,
    values: WeakSet<object>,
    environments: WeakSet<ModuleEnvironmentRecord>,
  ): void {
    for (const [name, property] of properties) {
      const value = this.normalizeRetainedValue(property.value, retention, values, environments);
      if (value !== property.value) {
        properties.set(name, new EvaluationObjectProperty(
          property.name,
          value,
          property.node,
          property.state,
          property.openSeams,
          property.presence,
          property.presenceOpenSeams,
        ));
      }
    }
  }
}
