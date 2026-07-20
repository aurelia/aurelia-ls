import {
  EvaluationBinding,
  EvaluationBindingState,
  ModuleEnvironmentRecord,
} from './environment.js';
import type { StaticEvaluationSessionFork } from './evaluation-session.js';
import type { StaticEvaluationValueGraph } from './evaluation-graph.js';
import {
  mapStaticEvaluationExecutionTopologyValues,
  type StaticEvaluationExecutionTopology,
} from './execution-topology.js';
import { evaluationEnumerableOwnPropertyNames } from './enumerable-own-properties.js';
import { representativeEvaluationValues } from './representative-values.js';
import {
  compactEvaluationOpenSeams,
  evaluationOpenSeamSetsEqual,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  type EvaluationArrayUncertainty,
  EvaluationArrayUncertaintyKind,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationKeyedCollectionEntryState,
  EvaluationKeyedCollectionShape,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationSetElement,
  EvaluationSetValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  mergeEvaluationArrayUncertainties,
  mergeEvaluationObjectUncertainties,
  type EvaluationValue,
} from './values.js';
import {
  EvaluationValueRelationKind,
  bindEvaluationValueJoin,
  evaluationSameValueDecision,
  evaluationSameValueZeroDecision,
} from './value-relation.js';

export class StaticEvaluationBranchJoinResult {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly value: EvaluationValue,
    openSeams: readonly EvaluationOpenSeam[],
    readonly leftExecutionTopology: StaticEvaluationExecutionTopology,
    readonly rightExecutionTopology: StaticEvaluationExecutionTopology,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export interface StaticEvaluationBranchJoinInput {
  readonly environment: ModuleEnvironmentRecord;
  readonly leftEnvironment: ModuleEnvironmentRecord;
  readonly rightEnvironment: ModuleEnvironmentRecord;
  readonly leftGraph: StaticEvaluationSessionFork;
  readonly rightGraph: StaticEvaluationSessionFork;
  readonly leftValue: EvaluationValue;
  readonly rightValue: EvaluationValue;
  readonly leftOpenSeams: readonly EvaluationOpenSeam[];
  readonly rightOpenSeams: readonly EvaluationOpenSeam[];
  readonly leftExecutionTopology: StaticEvaluationExecutionTopology;
  readonly rightExecutionTopology: StaticEvaluationExecutionTopology;
  readonly branchSeam: EvaluationOpenSeam;
  readonly path: string;
  readonly sourceLabel: string | null;
  readonly sourceBoundaryKind: EvaluationBoundaryKind | null;
  readonly targetGraph: StaticEvaluationValueGraph | null;
}

/** Join two graph-isolated finite execution lanes and commit only after the complete plan closes. */
export function joinStaticEvaluationBranches(
  input: StaticEvaluationBranchJoinInput,
): StaticEvaluationBranchJoinResult | null {
  try {
    return new StaticEvaluationBranchJoiner(input).join();
  } catch (error) {
    if (error instanceof StaticEvaluationBranchJoinUnsupported) {
      return null;
    }
    throw error;
  }
}

class StaticEvaluationBranchJoinUnsupported extends Error {}

class StaticEvaluationBranchJoiner {
  private readonly valuePairs = new WeakMap<object, WeakMap<object, EvaluationValue>>();
  private readonly environmentPairs = new WeakMap<ModuleEnvironmentRecord, WeakMap<ModuleEnvironmentRecord, ModuleEnvironmentRecord>>();
  private readonly populatedEnvironments = new WeakSet<ModuleEnvironmentRecord>();
  private readonly populatedClasses = new WeakSet<EvaluationClassValue>();
  private readonly newValues = new Set<EvaluationValue>();
  private readonly commitOperations: Array<() => void> = [];

  constructor(private readonly input: StaticEvaluationBranchJoinInput) {}

  join(): StaticEvaluationBranchJoinResult {
    const environment = this.environmentShell(this.input.leftEnvironment, this.input.rightEnvironment);
    if (environment !== this.input.environment) {
      throw new StaticEvaluationBranchJoinUnsupported('Sibling branch environments did not share one baseline.');
    }
    this.populateEnvironment(this.input.leftEnvironment, this.input.rightEnvironment, environment);
    const value = this.joinValue(this.input.leftValue, this.input.rightValue, this.input.path);
    const leftExecutionTopology = mapStaticEvaluationExecutionTopologyValues(
      this.input.leftExecutionTopology,
      (candidate, path) => this.projectSingleLaneValue(
        candidate,
        this.input.leftGraph,
        this.input.rightGraph,
        true,
        path,
      ),
      `${this.input.path}.execution.left`,
    );
    const rightExecutionTopology = mapStaticEvaluationExecutionTopologyValues(
      this.input.rightExecutionTopology,
      (candidate, path) => this.projectSingleLaneValue(
        candidate,
        this.input.rightGraph,
        this.input.leftGraph,
        false,
        path,
      ),
      `${this.input.path}.execution.right`,
    );

    for (const created of this.newValues) {
      this.input.targetGraph?.retainProduced(created);
    }
    for (const commit of this.commitOperations) {
      commit();
    }
    return new StaticEvaluationBranchJoinResult(value, [
      ...this.input.leftOpenSeams,
      ...this.input.rightOpenSeams,
      ...(evaluationOpenSeamSetsEqual(this.input.leftOpenSeams, this.input.rightOpenSeams)
        ? []
        : [this.input.branchSeam]),
    ], leftExecutionTopology, rightExecutionTopology);
  }

  private joinValue(left: EvaluationValue, right: EvaluationValue, path: string): EvaluationValue {
    const cached = this.readValuePair(left, right);
    if (cached != null) {
      return cached;
    }

    if (left === right && !isMutableEvaluationValue(left)) {
      return left;
    }
    const same = evaluationSameValueDecision(left, right);
    if (same === EvaluationValueRelationKind.Match && !isMutableEvaluationValue(left)) {
      return left;
    }
    if (left.kind !== right.kind) {
      return this.representative(left, right, path);
    }

    switch (left.kind) {
      case EvaluationValueKind.Unknown:
        return right.kind === EvaluationValueKind.Unknown
          ? this.joinUnknown(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Array:
        return right.kind === EvaluationValueKind.Array
          ? this.joinArray(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Set:
        return right.kind === EvaluationValueKind.Set
          ? this.joinSet(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Map:
        return right.kind === EvaluationValueKind.Map
          ? this.joinMap(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Object:
        return right.kind === EvaluationValueKind.Object
          ? this.joinObject(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.BoundaryObject:
        return right.kind === EvaluationValueKind.BoundaryObject
          ? this.joinBoundaryObject(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Function:
        return right.kind === EvaluationValueKind.Function
          ? this.joinFunction(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Class:
        return right.kind === EvaluationValueKind.Class
          ? this.joinClass(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.Instance:
        return right.kind === EvaluationValueKind.Instance
          ? this.joinInstance(left, right, path)
          : this.representative(left, right, path);
      case EvaluationValueKind.ModuleNamespace:
      case EvaluationValueKind.Promise:
        return this.joinImmutableCarrierEdges(left, right, path);
      default:
        return this.representative(left, right, path);
    }
  }

  private joinUnknown(
    left: EvaluationUnknownValue,
    right: EvaluationUnknownValue,
    path: string,
  ): EvaluationValue {
    const target = this.commonSourceValue(left, right);
    if (target?.kind !== EvaluationValueKind.Unknown) {
      return this.representative(left, right, path);
    }
    this.writeValuePair(left, right, target);
    if (left.retainedCandidate != null && right.retainedCandidate != null) {
      this.joinValue(left.retainedCandidate, right.retainedCandidate, `${path}.candidate`);
    }
    return target;
  }

  private joinArray(
    left: EvaluationArrayValue,
    right: EvaluationArrayValue,
    path: string,
  ): EvaluationArrayValue {
    const common = this.commonSourceValue(left, right);
    const target = common?.kind === EvaluationValueKind.Array
      ? common
      : this.createdValue(left, right, new EvaluationArrayValue([], left.node));
    this.writeValuePair(left, right, target);

    const leftByIndex = new Map(left.elements.map((element) => [element.runtimeIndex, element]));
    const rightByIndex = new Map(right.elements.map((element) => [element.runtimeIndex, element]));
    const commonIndices = [...leftByIndex.keys()]
      .filter((index): index is number => index != null && rightByIndex.has(index))
      .sort((a, b) => a - b);
    const elements = commonIndices.map((index) => {
      const leftElement = leftByIndex.get(index)!;
      const rightElement = rightByIndex.get(index)!;
      return new EvaluationArrayElement(
        this.joinValue(leftElement.value, rightElement.value, `${path}[${index}]`),
        sameReference(leftElement.expression, rightElement.expression),
        [
          ...leftElement.openSeams,
          ...rightElement.openSeams,
          ...(leftElement.expression === rightElement.expression
            && evaluationOpenSeamSetsEqual(leftElement.openSeams, rightElement.openSeams)
            && sameEvaluationAlternativeValue(leftElement.value, rightElement.value)
            ? []
            : [this.input.branchSeam]),
        ],
        index,
      );
    });
    const exactLength = left.exactLength === right.exactLength ? left.exactLength : null;
    const membershipPositionsMatch = sameArrayElementPositions(left.elements, right.elements, false);
    const orderPositionsMatch = sameArrayElementPositions(left.elements, right.elements, true);
    const uncertaintySetsMatch = sameArrayUncertaintySets(left.uncertainties, right.uncertainties);
    const hasExactElements = exactLength != null
      && left.shape.hasExactElements
      && right.shape.hasExactElements
      && membershipPositionsMatch;
    const hasExactOrder = hasExactElements
      && left.shape.hasExactOrder
      && right.shape.hasExactOrder
      && orderPositionsMatch;
    const extentDiffers = left.exactLength !== right.exactLength
      || !evaluationOpenSeamSetsEqual(left.extentOpenSeams, right.extentOpenSeams);
    const membershipDiffers = left.exactLength !== right.exactLength
      || left.shape.hasExactElements !== right.shape.hasExactElements
      || !membershipPositionsMatch
      || !uncertaintySetsMatch
      || !evaluationOpenSeamSetsEqual(left.elementOpenSeams, right.elementOpenSeams);
    const orderDiffers = left.shape.hasExactOrder !== right.shape.hasExactOrder
      || !orderPositionsMatch
      || !uncertaintySetsMatch
      || !evaluationOpenSeamSetsEqual(left.orderOpenSeams, right.orderOpenSeams);
    const shape = EvaluationArrayShape.from({
      exactLength,
      hasExactElements,
      hasExactOrder,
      uncertainties: mergeEvaluationArrayUncertainties(
        left,
        right,
        extentDiffers || membershipDiffers || orderDiffers ? [{
          kind: EvaluationArrayUncertaintyKind.ConditionalBranch,
          node: this.input.branchSeam.node,
          boundaryKind: this.input.sourceBoundaryKind ?? undefined,
          boundaryPath: this.input.sourceLabel ?? this.input.path,
        }] : [],
      ),
      extentOpenSeams: [
        ...left.extentOpenSeams,
        ...right.extentOpenSeams,
        ...(extentDiffers ? [this.input.branchSeam] : []),
      ],
      elementOpenSeams: [
        ...left.elementOpenSeams,
        ...right.elementOpenSeams,
        ...(membershipDiffers ? [this.input.branchSeam] : []),
      ],
      orderOpenSeams: [
        ...left.orderOpenSeams,
        ...right.orderOpenSeams,
        ...(orderDiffers ? [this.input.branchSeam] : []),
      ],
    });
    this.publish(
      common == null,
      () => target.replaceElements(elements, shape),
      () => target.replaceElements(elements, shape),
    );
    return target;
  }

  private joinObject(
    left: EvaluationObjectValue,
    right: EvaluationObjectValue,
    path: string,
  ): EvaluationObjectValue {
    const common = this.commonSourceValue(left, right);
    const propertyOrderOpenSeams = this.joinedPropertyOrderOpenSeams(left, right);
    const target = common?.kind === EvaluationValueKind.Object
      ? common
      : this.createdValue(left, right, new EvaluationObjectValue(
          new Map(),
          left.mayHaveUnknownProperties || right.mayHaveUnknownProperties,
          sameReference(left.node, right.node),
          mergeEvaluationObjectUncertainties(left, right),
          [...left.shapeOpenSeams, ...right.shapeOpenSeams],
          propertyOrderOpenSeams,
        ));
    this.writeValuePair(left, right, target);
    const properties = this.joinProperties(left.properties, right.properties, path);
    const mayHaveUnknownProperties = left.mayHaveUnknownProperties || right.mayHaveUnknownProperties;
    const shapeOpenSeams = this.joinedPropertyShapeOpenSeams(left, right);
    this.publish(common == null, () => {
      replaceProperties(target.properties, properties);
      target.mayHaveUnknownProperties = mayHaveUnknownProperties;
      target.retainShapeOpenSeams(shapeOpenSeams);
      target.retainPropertyOrderOpenSeams(propertyOrderOpenSeams);
    });
    return target;
  }

  private joinBoundaryObject(
    left: EvaluationBoundaryObjectValue,
    right: EvaluationBoundaryObjectValue,
    path: string,
  ): EvaluationValue {
    if (left.boundaryKind !== right.boundaryKind || left.path !== right.path || left.callable !== right.callable) {
      return this.representative(left, right, path);
    }
    const common = this.commonSourceValue(left, right);
    const target = common?.kind === EvaluationValueKind.BoundaryObject
      ? common
      : this.createdValue(left, right, new EvaluationBoundaryObjectValue(
          left.boundaryKind,
          left.path,
          new Map(),
          sameReference(left.node, right.node),
          left.callable,
        ));
    this.writeValuePair(left, right, target);
    const properties = this.joinProperties(left.properties, right.properties, path);
    this.publish(common == null, () => replaceProperties(target.properties, properties));
    return target;
  }

  private joinFunction(
    left: EvaluationFunctionValue,
    right: EvaluationFunctionValue,
    path: string,
  ): EvaluationValue {
    if (left.declaration !== right.declaration) {
      return this.representative(left, right, path);
    }
    const common = this.commonSourceValue(left, right);
    const environment = this.environmentShell(left.environment, right.environment);
    const mayHaveUnknownProperties = left.mayHaveUnknownProperties || right.mayHaveUnknownProperties;
    const shapeOpenSeams = this.joinedPropertyShapeOpenSeams(left, right);
    const propertyOrderOpenSeams = this.joinedPropertyOrderOpenSeams(left, right);
    const target = common?.kind === EvaluationValueKind.Function
      ? common
      : this.createdValue(left, right, new EvaluationFunctionValue(
          left.declaration,
          environment,
          sameReference(left.node, right.node),
          new Map(),
          mayHaveUnknownProperties,
          shapeOpenSeams,
          propertyOrderOpenSeams,
        ));
    this.writeValuePair(left, right, target);
    this.populateEnvironment(left.environment, right.environment, environment);
    const properties = this.joinProperties(left.properties, right.properties, path);
    this.publish(common == null, () => {
      replaceProperties(target.properties, properties);
      target.mayHaveUnknownProperties = mayHaveUnknownProperties;
      target.retainShapeOpenSeams(shapeOpenSeams);
      target.retainPropertyOrderOpenSeams(propertyOrderOpenSeams);
    });
    return target;
  }

  private joinClass(
    left: EvaluationClassValue,
    right: EvaluationClassValue,
    path: string,
  ): EvaluationValue {
    if (left.declaration !== right.declaration) {
      return this.representative(left, right, path);
    }
    const target = this.classShell(left, right);
    this.populateClass(left, right, target, path);
    return target;
  }

  private joinInstance(
    left: EvaluationInstanceValue,
    right: EvaluationInstanceValue,
    path: string,
  ): EvaluationValue {
    if (left.classValue.declaration !== right.classValue.declaration) {
      return this.representative(left, right, path);
    }
    const classValue = this.classShell(left.classValue, right.classValue);
    const common = this.commonSourceValue(left, right);
    const propertyOrderOpenSeams = this.joinedPropertyOrderOpenSeams(left, right);
    const target = common?.kind === EvaluationValueKind.Instance
      ? common
      : this.createdValue(left, right, new EvaluationInstanceValue(
          classValue,
          new Map(),
          left.mayHaveUnknownProperties || right.mayHaveUnknownProperties,
          sameReference(left.node, right.node),
          [...left.constructionOpenSeams, ...right.constructionOpenSeams],
          [...left.shapeOpenSeams, ...right.shapeOpenSeams],
          propertyOrderOpenSeams,
        ));
    this.writeValuePair(left, right, target);
    this.populateClass(left.classValue, right.classValue, classValue, `${path}.constructor`);
    const properties = this.joinProperties(left.properties, right.properties, path);
    this.publish(common == null, () => {
      replaceProperties(target.properties, properties);
      target.mayHaveUnknownProperties = left.mayHaveUnknownProperties || right.mayHaveUnknownProperties;
      target.retainConstructionOpenSeams([
        ...left.constructionOpenSeams,
        ...right.constructionOpenSeams,
      ]);
      target.retainShapeOpenSeams([
        ...this.joinedPropertyShapeOpenSeams(left, right),
      ]);
      target.retainPropertyOrderOpenSeams(propertyOrderOpenSeams);
    });
    return target;
  }

  private classShell(
    left: EvaluationClassValue,
    right: EvaluationClassValue,
  ): EvaluationClassValue {
    const cached = this.readValuePair(left, right);
    if (cached != null) {
      if (cached.kind !== EvaluationValueKind.Class) {
        throw new StaticEvaluationBranchJoinUnsupported('Sibling class identities mapped to a non-class carrier.');
      }
      return cached;
    }
    const common = this.commonSourceValue(left, right);
    const environment = this.environmentShell(left.environment, right.environment);
    const target = common?.kind === EvaluationValueKind.Class
      ? common
      : this.createdValue(left, right, new EvaluationClassValue(
          left.declaration,
          environment,
          sameReference(left.node, right.node),
        ));
    this.writeValuePair(left, right, target);
    return target;
  }

  private populateClass(
    left: EvaluationClassValue,
    right: EvaluationClassValue,
    target: EvaluationClassValue,
    path: string,
  ): void {
    if (this.populatedClasses.has(target)) {
      return;
    }
    this.populatedClasses.add(target);
    this.populateEnvironment(left.environment, right.environment, target.environment);
    const properties = this.joinProperties(left.properties, right.properties, path);
    const mayHaveUnknownProperties = left.mayHaveUnknownProperties || right.mayHaveUnknownProperties;
    const shapeOpenSeams = this.joinedPropertyShapeOpenSeams(left, right);
    const propertyOrderOpenSeams = this.joinedPropertyOrderOpenSeams(left, right);
    this.publish(this.newValues.has(target), () => {
      replaceProperties(target.properties, properties);
      target.mayHaveUnknownProperties = mayHaveUnknownProperties;
      target.retainShapeOpenSeams(shapeOpenSeams);
      target.retainPropertyOrderOpenSeams(propertyOrderOpenSeams);
    });
  }

  private joinImmutableCarrierEdges(
    left: EvaluationValue,
    right: EvaluationValue,
    path: string,
  ): EvaluationValue {
    const common = this.commonSourceValue(left, right);
    if (common == null || common.kind !== left.kind) {
      return this.representative(left, right, path);
    }
    this.writeValuePair(left, right, common);
    if (left.kind === EvaluationValueKind.ModuleNamespace && right.kind === EvaluationValueKind.ModuleNamespace) {
      for (const [name, leftExport] of left.exportEntries) {
        const rightExport = right.exportEntries.get(name);
        if (rightExport != null) {
          this.joinValue(leftExport.value, rightExport.value, `${path}.${name}`);
        }
      }
    } else if (left.kind === EvaluationValueKind.Promise && right.kind === EvaluationValueKind.Promise) {
      if (left.settlement.kind === right.settlement.kind) {
        this.joinValue(
          left.settlement.evidence.value,
          right.settlement.evidence.value,
          `${path}.settlement`,
        );
      }
    }
    return common;
  }

  private joinProperties(
    left: ReadonlyMap<string, EvaluationObjectProperty>,
    right: ReadonlyMap<string, EvaluationObjectProperty>,
    path: string,
  ): Map<string, EvaluationObjectProperty> {
    const result = new Map<string, EvaluationObjectProperty>();
    const names = [...new Set([...left.keys(), ...right.keys()])];
    for (const name of names) {
      const leftProperty = left.get(name);
      const rightProperty = right.get(name);
      if (leftProperty != null && rightProperty != null) {
        const valueEvidenceDiffers = leftProperty.node !== rightProperty.node
          || leftProperty.state !== rightProperty.state
          || !evaluationOpenSeamSetsEqual(leftProperty.openSeams, rightProperty.openSeams)
          || !sameEvaluationAlternativeValue(leftProperty.value, rightProperty.value);
        const presenceEvidenceDiffers = leftProperty.presence !== rightProperty.presence
          || !evaluationOpenSeamSetsEqual(leftProperty.presenceOpenSeams, rightProperty.presenceOpenSeams);
        result.set(name, new EvaluationObjectProperty(
          name,
          this.joinValue(leftProperty.value, rightProperty.value, `${path}.${name}`),
          sameReference(leftProperty.node, rightProperty.node),
          leftProperty.state === EvaluationObjectPropertyState.Closed
            && rightProperty.state === EvaluationObjectPropertyState.Closed
            ? EvaluationObjectPropertyState.Closed
            : EvaluationObjectPropertyState.Open,
          [
            ...leftProperty.openSeams,
            ...rightProperty.openSeams,
            ...(valueEvidenceDiffers ? [this.input.branchSeam] : []),
          ],
          leftProperty.presence === EvaluationObjectPropertyPresence.Present
            && rightProperty.presence === EvaluationObjectPropertyPresence.Present
            ? EvaluationObjectPropertyPresence.Present
            : EvaluationObjectPropertyPresence.Conditional,
          [
            ...leftProperty.presenceOpenSeams,
            ...rightProperty.presenceOpenSeams,
            ...(presenceEvidenceDiffers ? [this.input.branchSeam] : []),
          ],
        ));
        continue;
      }
      const property = leftProperty ?? rightProperty!;
      const value = leftProperty == null
        ? this.projectSingleLaneValue(property.value, this.input.rightGraph, this.input.leftGraph, false, `${path}.${name}`)
        : this.projectSingleLaneValue(property.value, this.input.leftGraph, this.input.rightGraph, true, `${path}.${name}`);
      result.set(name, new EvaluationObjectProperty(
        name,
        value,
        property.node,
        property.state,
        property.openSeams,
        EvaluationObjectPropertyPresence.Conditional,
        [...property.presenceOpenSeams, this.input.branchSeam],
      ));
    }
    return result;
  }

  private joinedPropertyOrderOpenSeams(
    left: EvaluationObjectValue | EvaluationFunctionValue | EvaluationClassValue | EvaluationInstanceValue,
    right: EvaluationObjectValue | EvaluationFunctionValue | EvaluationClassValue | EvaluationInstanceValue,
  ): readonly EvaluationOpenSeam[] {
    const leftNames = evaluationEnumerableOwnPropertyNames(left.properties);
    const rightNames = evaluationEnumerableOwnPropertyNames(right.properties);
    return compactEvaluationOpenSeams([
      ...left.propertyOrderOpenSeams,
      ...right.propertyOrderOpenSeams,
      ...(sameStringSequence(leftNames, rightNames)
        && evaluationOpenSeamSetsEqual(left.propertyOrderOpenSeams, right.propertyOrderOpenSeams)
        ? []
        : [this.input.branchSeam]),
    ]);
  }

  private joinedPropertyShapeOpenSeams(
    left: EvaluationObjectValue | EvaluationFunctionValue | EvaluationClassValue | EvaluationInstanceValue,
    right: EvaluationObjectValue | EvaluationFunctionValue | EvaluationClassValue | EvaluationInstanceValue,
  ): readonly EvaluationOpenSeam[] {
    return compactEvaluationOpenSeams([
      ...left.shapeOpenSeams,
      ...right.shapeOpenSeams,
      ...(left.mayHaveUnknownProperties === right.mayHaveUnknownProperties
        && evaluationOpenSeamSetsEqual(left.shapeOpenSeams, right.shapeOpenSeams)
        ? []
        : [this.input.branchSeam]),
    ]);
  }

  private projectSingleLaneValue(
    value: EvaluationValue,
    laneGraph: StaticEvaluationSessionFork,
    otherGraph: StaticEvaluationSessionFork,
    laneIsLeft: boolean,
    path: string,
  ): EvaluationValue {
    if (!isMutableEvaluationValue(value)) {
      return value;
    }
    const source = laneGraph.sourceValue(value);
    if (source != null) {
      const other = otherGraph.forkValue(source);
      return laneIsLeft
        ? this.joinValue(value, other, path)
        : this.joinValue(other, value, path);
    }
    return this.joinValue(value, value, path);
  }

  private environmentShell(
    left: ModuleEnvironmentRecord,
    right: ModuleEnvironmentRecord,
  ): ModuleEnvironmentRecord {
    const cached = this.readEnvironmentPair(left, right);
    if (cached != null) {
      return cached;
    }
    const leftSource = this.input.leftGraph.sourceEnvironment(left);
    const rightSource = this.input.rightGraph.sourceEnvironment(right);
    const common = leftSource != null && leftSource === rightSource ? leftSource : null;
    const outer = left.outer == null && right.outer == null
      ? null
      : left.outer != null && right.outer != null
        ? this.environmentShell(left.outer, right.outer)
        : throwBranchJoinUnsupported('Sibling lexical environment chains did not align.');
    const target = common ?? new ModuleEnvironmentRecord(left.moduleKey, outer);
    if (target.outer !== outer || left.moduleKey !== right.moduleKey || target.moduleKey !== left.moduleKey) {
      throw new StaticEvaluationBranchJoinUnsupported('Sibling lexical environment identities did not align.');
    }
    this.writeEnvironmentPair(left, right, target);
    return target;
  }

  private populateEnvironment(
    left: ModuleEnvironmentRecord,
    right: ModuleEnvironmentRecord,
    target: ModuleEnvironmentRecord,
  ): void {
    if (this.populatedEnvironments.has(target)) {
      return;
    }
    this.populatedEnvironments.add(target);
    if (left.outer != null && right.outer != null && target.outer != null) {
      this.populateEnvironment(left.outer, right.outer, target.outer);
    }
    const names = [...new Set([
      ...left.readBindings().map((binding) => binding.name),
      ...right.readBindings().map((binding) => binding.name),
    ])];
    for (const name of names) {
      const leftBinding = left.readOwnBinding(name);
      const rightBinding = right.readOwnBinding(name);
      if (
        leftBinding == null
        || rightBinding == null
        || leftBinding.bindingKind !== rightBinding.bindingKind
        || leftBinding.mutable !== rightBinding.mutable
        || leftBinding.declaration !== rightBinding.declaration
      ) {
        throw new StaticEvaluationBranchJoinUnsupported(`Sibling binding '${name}' did not align.`);
      }
      const value = this.joinValue(leftBinding.value, rightBinding.value, `${this.input.path}.${name}`);
      const openSeams = compactEvaluationOpenSeams([
        ...leftBinding.openSeams,
        ...rightBinding.openSeams,
        ...(leftBinding.state === rightBinding.state
          && evaluationOpenSeamSetsEqual(leftBinding.openSeams, rightBinding.openSeams)
          ? []
          : [this.input.branchSeam]),
      ]);
      const state = leftBinding.state === EvaluationBindingState.Uninitialized
        && rightBinding.state === EvaluationBindingState.Uninitialized
        ? EvaluationBindingState.Uninitialized
        : value.kind === EvaluationValueKind.Unknown || openSeams.length > 0
          ? EvaluationBindingState.Open
          : EvaluationBindingState.Initialized;
      const targetBinding = target.readOwnBinding(name);
      if (targetBinding == null) {
        this.commitOperations.push(() => target.installBinding(new EvaluationBinding(
          name,
          leftBinding.bindingKind,
          leftBinding.mutable,
          leftBinding.declaration,
          state,
          value,
          openSeams,
        )));
      } else {
        this.commitOperations.push(() => targetBinding.replaceState(state, value, openSeams));
      }
    }
  }

  private representative(left: EvaluationValue, right: EvaluationValue, path: string): EvaluationValue {
    return representativeEvaluationValues(
      [left, right],
      path,
      this.input.sourceLabel,
      this.input.sourceBoundaryKind,
    ) ?? throwBranchJoinUnsupported(`Values at ${path} had no conservative representative.`);
  }

  private commonSourceValue(left: EvaluationValue, right: EvaluationValue): EvaluationValue | null {
    if (!isMutableEvaluationValue(left) || !isMutableEvaluationValue(right)) {
      return null;
    }
    const leftSource = this.input.leftGraph.sourceValue(left);
    const rightSource = this.input.rightGraph.sourceValue(right);
    return leftSource != null && leftSource === rightSource ? leftSource : null;
  }

  private createdValue<TValue extends EvaluationValue>(
    left: EvaluationValue,
    right: EvaluationValue,
    target: TValue,
  ): TValue {
    bindEvaluationValueJoin(left, right, target);
    this.newValues.add(target);
    return target;
  }

  private publish(created: boolean, populate: () => void, commit: () => void = populate): void {
    if (created) {
      populate();
    } else {
      this.commitOperations.push(commit);
    }
  }

  private readValuePair(left: EvaluationValue, right: EvaluationValue): EvaluationValue | null {
    return this.valuePairs.get(left)?.get(right) ?? null;
  }

  private writeValuePair(left: EvaluationValue, right: EvaluationValue, target: EvaluationValue): void {
    let rights = this.valuePairs.get(left);
    if (rights == null) {
      rights = new WeakMap();
      this.valuePairs.set(left, rights);
    }
    rights.set(right, target);
  }

  private readEnvironmentPair(
    left: ModuleEnvironmentRecord,
    right: ModuleEnvironmentRecord,
  ): ModuleEnvironmentRecord | null {
    return this.environmentPairs.get(left)?.get(right) ?? null;
  }

  private writeEnvironmentPair(
    left: ModuleEnvironmentRecord,
    right: ModuleEnvironmentRecord,
    target: ModuleEnvironmentRecord,
  ): void {
    let rights = this.environmentPairs.get(left);
    if (rights == null) {
      rights = new WeakMap();
      this.environmentPairs.set(left, rights);
    }
    rights.set(right, target);
  }

  private joinSet(left: EvaluationSetValue, right: EvaluationSetValue, path: string): EvaluationSetValue {
    const common = this.commonSourceValue(left, right);
    const target = common?.kind === EvaluationValueKind.Set
      ? common
      : this.createdValue(left, right, new EvaluationSetValue([], sameReference(left.node, right.node), undefined, left.weak));
    if (left.weak !== right.weak) {
      throw new StaticEvaluationBranchJoinUnsupported('Sibling Set capabilities did not align.');
    }
    this.writeValuePair(left, right, target);
    const rows = this.joinSetRows(left, right, path);
    const currentMembershipMatches = keyedCurrentMembershipMatches(left.elements, right.elements, (entry) => entry.value);
    const exact = currentMembershipMatches
      && left.shape.hasExactMembership
      && right.shape.hasExactMembership;
    const order = left.shape.hasExactOrder
      && right.shape.hasExactOrder
      && keyedCurrentCandidateRowsMatch(left.elements, right.elements, (entry) => entry.value, true);
    const sizeDiffers = left.exactSize !== right.exactSize
      || !evaluationOpenSeamSetsEqual(left.shape.sizeOpenSeams, right.shape.sizeOpenSeams);
    const membershipDiffers = left.shape.hasExactMembership !== right.shape.hasExactMembership
      || !keyedCurrentCandidateRowsMatch(left.elements, right.elements, (entry) => entry.value, false)
      || !evaluationOpenSeamSetsEqual(left.shape.membershipOpenSeams, right.shape.membershipOpenSeams);
    const orderDiffers = left.shape.hasExactOrder !== right.shape.hasExactOrder
      || !keyedCurrentCandidateRowsMatch(left.elements, right.elements, (entry) => entry.value, true)
      || !evaluationOpenSeamSetsEqual(left.shape.orderOpenSeams, right.shape.orderOpenSeams);
    const shape = EvaluationKeyedCollectionShape.from({
      exactSize: left.exactSize === right.exactSize ? left.exactSize : null,
      hasExactMembership: exact,
      hasExactOrder: order,
      sizeOpenSeams: [...left.shape.sizeOpenSeams, ...right.shape.sizeOpenSeams, ...(sizeDiffers ? [this.input.branchSeam] : [])],
      membershipOpenSeams: [...left.shape.membershipOpenSeams, ...right.shape.membershipOpenSeams, ...(membershipDiffers ? [this.input.branchSeam] : [])],
      orderOpenSeams: [...left.shape.orderOpenSeams, ...right.shape.orderOpenSeams, ...(orderDiffers ? [this.input.branchSeam] : [])],
    });
    this.publish(common == null, () => target.replaceElements(rows, shape));
    return target;
  }

  private joinMap(left: EvaluationMapValue, right: EvaluationMapValue, path: string): EvaluationMapValue {
    const common = this.commonSourceValue(left, right);
    const target = common?.kind === EvaluationValueKind.Map
      ? common
      : this.createdValue(left, right, new EvaluationMapValue([], sameReference(left.node, right.node), undefined, left.weak));
    if (left.weak !== right.weak) {
      throw new StaticEvaluationBranchJoinUnsupported('Sibling Map capabilities did not align.');
    }
    this.writeValuePair(left, right, target);
    const rows = this.joinMapRows(left, right, path);
    const currentMembershipMatches = keyedCurrentMembershipMatches(left.entries, right.entries, (entry) => entry.key);
    const exact = currentMembershipMatches
      && left.shape.hasExactMembership
      && right.shape.hasExactMembership;
    const order = left.shape.hasExactOrder
      && right.shape.hasExactOrder
      && keyedCurrentCandidateRowsMatch(left.entries, right.entries, (entry) => entry.key, true);
    const sizeDiffers = left.exactSize !== right.exactSize
      || !evaluationOpenSeamSetsEqual(left.shape.sizeOpenSeams, right.shape.sizeOpenSeams);
    const membershipDiffers = left.shape.hasExactMembership !== right.shape.hasExactMembership
      || !keyedCurrentCandidateRowsMatch(left.entries, right.entries, (entry) => entry.key, false)
      || !evaluationOpenSeamSetsEqual(left.shape.membershipOpenSeams, right.shape.membershipOpenSeams);
    const orderDiffers = left.shape.hasExactOrder !== right.shape.hasExactOrder
      || !keyedCurrentCandidateRowsMatch(left.entries, right.entries, (entry) => entry.key, true)
      || !evaluationOpenSeamSetsEqual(left.shape.orderOpenSeams, right.shape.orderOpenSeams);
    const shape = EvaluationKeyedCollectionShape.from({
      exactSize: left.exactSize === right.exactSize ? left.exactSize : null,
      hasExactMembership: exact,
      hasExactOrder: order,
      sizeOpenSeams: [...left.shape.sizeOpenSeams, ...right.shape.sizeOpenSeams, ...(sizeDiffers ? [this.input.branchSeam] : [])],
      membershipOpenSeams: [...left.shape.membershipOpenSeams, ...right.shape.membershipOpenSeams, ...(membershipDiffers ? [this.input.branchSeam] : [])],
      orderOpenSeams: [...left.shape.orderOpenSeams, ...right.shape.orderOpenSeams, ...(orderDiffers ? [this.input.branchSeam] : [])],
    });
    this.publish(common == null, () => target.replaceEntries(rows, shape));
    return target;
  }

  private joinSetRows(left: EvaluationSetValue, right: EvaluationSetValue, path: string): EvaluationSetElement[] {
    if (keyedHistoriesAlign(left.elements, right.elements, (entry) => entry.value)) {
      return left.elements.map((entry, index) => {
        const other = right.elements[index]!;
        return new EvaluationSetElement(
          this.joinValue(entry.value, other.value, `${path}.key.${index}`),
          sameReference(entry.expression, other.expression),
          [
            ...entry.openSeams,
            ...other.openSeams,
            ...(entry.expression === other.expression
              && evaluationOpenSeamSetsEqual(entry.openSeams, other.openSeams)
              ? []
              : [this.input.branchSeam]),
          ],
          entry.state === other.state ? entry.state : EvaluationKeyedCollectionEntryState.Conditional,
          [
            ...entry.presenceOpenSeams,
            ...other.presenceOpenSeams,
            ...(entry.state === other.state
              && evaluationOpenSeamSetsEqual(entry.presenceOpenSeams, other.presenceOpenSeams)
              ? []
              : [this.input.branchSeam]),
          ],
        );
      });
    }
    const rows: EvaluationSetElement[] = [];
    const leftRows = currentKeyedRows(left.elements, (row) => row.value);
    const rightRows = currentKeyedRows(right.elements, (row) => row.value);
    const matchedRight = new Set<number>();
    for (const [leftIndex, entry] of leftRows.entries()) {
      const rightIndex = matchingKeyedRowIndex(
        rightRows,
        entry.value,
        (row) => row.value,
        matchedRight,
      );
      const other = rightIndex == null ? null : rightRows[rightIndex]!;
      if (rightIndex != null) {
        matchedRight.add(rightIndex);
      }
      if (other == null) {
        if (entry.state !== EvaluationKeyedCollectionEntryState.Deleted) {
          rows.push(new EvaluationSetElement(
            this.projectSingleLaneValue(entry.value, this.input.leftGraph, this.input.rightGraph, true, `${path}.key.${leftIndex}`),
            entry.expression,
            entry.openSeams,
            EvaluationKeyedCollectionEntryState.Conditional,
            [...entry.presenceOpenSeams, this.input.branchSeam],
          ));
        }
        continue;
      }
      if (entry.state === EvaluationKeyedCollectionEntryState.Deleted
        && other.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      const sameState = entry.state === other.state;
      rows.push(new EvaluationSetElement(
        this.joinValue(entry.value, other.value, `${path}.key.${leftIndex}`),
        sameReference(entry.expression, other.expression),
        [
          ...entry.openSeams,
          ...other.openSeams,
          ...(entry.expression === other.expression
            && evaluationOpenSeamSetsEqual(entry.openSeams, other.openSeams)
            ? []
            : [this.input.branchSeam]),
        ],
        sameState ? entry.state : EvaluationKeyedCollectionEntryState.Conditional,
        [
          ...entry.presenceOpenSeams,
          ...other.presenceOpenSeams,
          ...(sameState && evaluationOpenSeamSetsEqual(entry.presenceOpenSeams, other.presenceOpenSeams)
            ? []
            : [this.input.branchSeam]),
        ],
      ));
    }
    for (let index = 0; index < rightRows.length; index += 1) {
      const entry = rightRows[index]!;
      if (matchedRight.has(index) || entry.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      rows.push(new EvaluationSetElement(
        this.projectSingleLaneValue(entry.value, this.input.rightGraph, this.input.leftGraph, false, `${path}.key.right.${index}`),
        entry.expression,
        entry.openSeams,
        EvaluationKeyedCollectionEntryState.Conditional,
        [...entry.presenceOpenSeams, this.input.branchSeam],
      ));
    }
    return rows;
  }

  private joinMapRows(left: EvaluationMapValue, right: EvaluationMapValue, path: string): EvaluationMapEntry[] {
    if (keyedHistoriesAlign(left.entries, right.entries, (entry) => entry.key)) {
      return left.entries.map((entry, index) => {
        const other = right.entries[index]!;
        return new EvaluationMapEntry(
          this.joinValue(entry.key, other.key, `${path}.key.${index}`),
          this.joinValue(entry.value, other.value, `${path}.value.${index}`),
          sameReference(entry.keyExpression, other.keyExpression),
          sameReference(entry.valueExpression, other.valueExpression),
          [
            ...entry.keyOpenSeams,
            ...other.keyOpenSeams,
            ...(entry.keyExpression === other.keyExpression
              && evaluationOpenSeamSetsEqual(entry.keyOpenSeams, other.keyOpenSeams)
              ? []
              : [this.input.branchSeam]),
          ],
          [
            ...entry.valueOpenSeams,
            ...other.valueOpenSeams,
            ...(entry.valueExpression === other.valueExpression
              && evaluationOpenSeamSetsEqual(entry.valueOpenSeams, other.valueOpenSeams)
              && sameEvaluationAlternativeValue(entry.value, other.value)
              ? []
              : [this.input.branchSeam]),
          ],
          entry.state === other.state ? entry.state : EvaluationKeyedCollectionEntryState.Conditional,
          [
            ...entry.presenceOpenSeams,
            ...other.presenceOpenSeams,
            ...(entry.state === other.state
              && evaluationOpenSeamSetsEqual(entry.presenceOpenSeams, other.presenceOpenSeams)
              ? []
              : [this.input.branchSeam]),
          ],
        );
      });
    }
    const rows: EvaluationMapEntry[] = [];
    const leftRows = currentKeyedRows(left.entries, (row) => row.key);
    const rightRows = currentKeyedRows(right.entries, (row) => row.key);
    const matchedRight = new Set<number>();
    for (let index = 0; index < leftRows.length; index += 1) {
      const entry = leftRows[index]!;
      const rightIndex = matchingKeyedRowIndex(rightRows, entry.key, (row) => row.key, matchedRight);
      const other = rightIndex == null ? null : rightRows[rightIndex]!;
      if (rightIndex != null) {
        matchedRight.add(rightIndex);
      }
      if (other == null) {
        if (entry.state !== EvaluationKeyedCollectionEntryState.Deleted) {
          rows.push(new EvaluationMapEntry(
            this.projectSingleLaneValue(entry.key, this.input.leftGraph, this.input.rightGraph, true, `${path}.key.${index}`),
            this.projectSingleLaneValue(entry.value, this.input.leftGraph, this.input.rightGraph, true, `${path}.value.${index}`),
            entry.keyExpression,
            entry.valueExpression,
            entry.keyOpenSeams,
            entry.valueOpenSeams,
            EvaluationKeyedCollectionEntryState.Conditional,
            [...entry.presenceOpenSeams, this.input.branchSeam],
          ));
        }
        continue;
      }
      if (entry.state === EvaluationKeyedCollectionEntryState.Deleted
        && other.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      const sameState = entry.state === other.state;
      const entryIsActive = entry.state !== EvaluationKeyedCollectionEntryState.Deleted;
      const otherIsActive = other.state !== EvaluationKeyedCollectionEntryState.Deleted;
      const value = entryIsActive && otherIsActive
        ? this.joinValue(entry.value, other.value, `${path}.value.${index}`)
        : entryIsActive
          ? this.projectSingleLaneValue(entry.value, this.input.leftGraph, this.input.rightGraph, true, `${path}.value.${index}`)
          : this.projectSingleLaneValue(other.value, this.input.rightGraph, this.input.leftGraph, false, `${path}.value.${index}`);
      rows.push(new EvaluationMapEntry(
        this.joinValue(entry.key, other.key, `${path}.key.${index}`),
        value,
        sameReference(entry.keyExpression, other.keyExpression),
        sameReference(entry.valueExpression, other.valueExpression),
        [
          ...entry.keyOpenSeams,
          ...other.keyOpenSeams,
          ...(entry.keyExpression === other.keyExpression
            && evaluationOpenSeamSetsEqual(entry.keyOpenSeams, other.keyOpenSeams)
            ? []
            : [this.input.branchSeam]),
        ],
        [
          ...entry.valueOpenSeams,
          ...other.valueOpenSeams,
          ...(entry.valueExpression === other.valueExpression
            && evaluationOpenSeamSetsEqual(entry.valueOpenSeams, other.valueOpenSeams)
            && sameEvaluationAlternativeValue(entry.value, other.value)
            ? []
            : [this.input.branchSeam]),
        ],
        sameState ? entry.state : EvaluationKeyedCollectionEntryState.Conditional,
        [
          ...entry.presenceOpenSeams,
          ...other.presenceOpenSeams,
          ...(sameState && evaluationOpenSeamSetsEqual(entry.presenceOpenSeams, other.presenceOpenSeams)
            ? []
            : [this.input.branchSeam]),
        ],
      ));
    }
    for (let index = 0; index < rightRows.length; index += 1) {
      const entry = rightRows[index]!;
      if (matchedRight.has(index) || entry.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      rows.push(new EvaluationMapEntry(
        this.projectSingleLaneValue(entry.key, this.input.rightGraph, this.input.leftGraph, false, `${path}.key.right.${index}`),
        this.projectSingleLaneValue(entry.value, this.input.rightGraph, this.input.leftGraph, false, `${path}.value.right.${index}`),
        entry.keyExpression,
        entry.valueExpression,
        entry.keyOpenSeams,
        entry.valueOpenSeams,
        EvaluationKeyedCollectionEntryState.Conditional,
        [...entry.presenceOpenSeams, this.input.branchSeam],
      ));
    }
    return rows;
  }
}

function isMutableEvaluationValue(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Unknown:
      return value.retainedCandidate != null && isMutableEvaluationValue(value.retainedCandidate);
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

function replaceProperties(
  target: Map<string, EvaluationObjectProperty>,
  source: ReadonlyMap<string, EvaluationObjectProperty>,
): void {
  target.clear();
  for (const [name, property] of source) {
    target.set(name, property);
  }
}

function sameReference<T>(left: T, right: T): T | null {
  return left === right ? left : null;
}

function sameStringSequence(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameEvaluationAlternativeValue(left: EvaluationValue, right: EvaluationValue): boolean {
  return left === right
    || evaluationSameValueDecision(left, right) === EvaluationValueRelationKind.Match;
}

function sameEvaluationKeyedAlternative(left: EvaluationValue, right: EvaluationValue): boolean {
  return left === right
    || evaluationSameValueZeroDecision(left, right) === EvaluationValueRelationKind.Match;
}

function sameArrayElementPositions(
  left: readonly EvaluationArrayElement[],
  right: readonly EvaluationArrayElement[],
  ordered: boolean,
): boolean {
  const leftPositions = left.map((element) => element.runtimeIndex);
  const rightPositions = right.map((element) => element.runtimeIndex);
  if (!ordered) {
    leftPositions.sort(compareNullableNumbers);
    rightPositions.sort(compareNullableNumbers);
  }
  return leftPositions.length === rightPositions.length
    && leftPositions.every((position, index) => position === rightPositions[index]);
}

function sameArrayUncertaintySets(
  left: readonly EvaluationArrayUncertainty[],
  right: readonly EvaluationArrayUncertainty[],
): boolean {
  return left.length === right.length
    && left.every((uncertainty) => right.some((candidate) =>
      uncertainty.kind === candidate.kind
      && uncertainty.node === candidate.node
      && uncertainty.boundaryKind === candidate.boundaryKind
      && uncertainty.boundaryPath === candidate.boundaryPath
    ));
}

function compareNullableNumbers(left: number | null, right: number | null): number {
  return left == null
    ? right == null ? 0 : 1
    : right == null ? -1 : left - right;
}

function throwBranchJoinUnsupported(message: string): never {
  throw new StaticEvaluationBranchJoinUnsupported(message);
}

function keyedHistoriesAlign<TRow extends { readonly state: EvaluationKeyedCollectionEntryState }>(
  left: readonly TRow[],
  right: readonly TRow[],
  key: (row: TRow) => EvaluationValue,
): boolean {
  return left.length === right.length
    && left.every((row, index) =>
      row.state === right[index]!.state
      && sameEvaluationKeyedAlternative(key(row), key(right[index]!))
    );
}

function currentKeyedRows<TRow extends { readonly state: EvaluationKeyedCollectionEntryState }>(
  rows: readonly TRow[],
  key: (row: TRow) => EvaluationValue,
): readonly TRow[] {
  const current: TRow[] = [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]!;
    if (current.some((candidate) =>
      sameEvaluationKeyedAlternative(key(row), key(candidate))
    )) {
      continue;
    }
    current.unshift(row);
  }
  return current;
}

function matchingKeyedRowIndex<TRow>(
  rows: readonly TRow[],
  keyValue: EvaluationValue,
  key: (row: TRow) => EvaluationValue,
  excluded: ReadonlySet<number>,
): number | null {
  for (let index = 0; index < rows.length; index += 1) {
    if (!excluded.has(index)
      && sameEvaluationKeyedAlternative(keyValue, key(rows[index]!))) {
      return index;
    }
  }
  return null;
}

function keyedCurrentMembershipMatches<TRow extends { readonly state: EvaluationKeyedCollectionEntryState }>(
  left: readonly TRow[],
  right: readonly TRow[],
  key: (row: TRow) => EvaluationValue,
): boolean {
  const leftActive = currentKeyedRows(left, key)
    .filter((row) => row.state === EvaluationKeyedCollectionEntryState.Present);
  const rightActive = currentKeyedRows(right, key)
    .filter((row) => row.state === EvaluationKeyedCollectionEntryState.Present);
  if (leftActive.length !== rightActive.length) {
    return false;
  }
  const matched = new Set<number>();
  for (const row of leftActive) {
    const index = matchingKeyedRowIndex(rightActive, key(row), key, matched);
    if (index == null) {
      return false;
    }
    matched.add(index);
  }
  return true;
}

function keyedCurrentCandidateRowsMatch<TRow extends { readonly state: EvaluationKeyedCollectionEntryState }>(
  left: readonly TRow[],
  right: readonly TRow[],
  key: (row: TRow) => EvaluationValue,
  ordered: boolean,
): boolean {
  const leftRows = currentKeyedRows(left, key)
    .filter((row) => row.state !== EvaluationKeyedCollectionEntryState.Deleted);
  const rightRows = currentKeyedRows(right, key)
    .filter((row) => row.state !== EvaluationKeyedCollectionEntryState.Deleted);
  if (leftRows.length !== rightRows.length) {
    return false;
  }
  if (ordered) {
    return leftRows.every((row, index) =>
      row.state === rightRows[index]!.state
      && sameEvaluationKeyedAlternative(key(row), key(rightRows[index]!))
    );
  }
  const matched = new Set<number>();
  for (const row of leftRows) {
    const index = rightRows.findIndex((candidate, candidateIndex) =>
      !matched.has(candidateIndex)
      && row.state === candidate.state
      && sameEvaluationKeyedAlternative(key(row), key(candidate))
    );
    if (index < 0) {
      return false;
    }
    matched.add(index);
  }
  return true;
}
