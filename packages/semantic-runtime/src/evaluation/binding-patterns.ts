import ts from 'typescript';

import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from './environment.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationValueEvidence,
  evaluationValueEvidence,
} from './value-pressure.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBoundaryValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';
import { denseEvaluationArrayElements } from './array-value-operations.js';

/** Host hooks that keep binding-pattern evaluation inside the owning evaluator's policy and seam stream. */
export interface StaticBindingPatternHost {
  maxArrayIterations(): number;

  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  readOwnProperty(receiver: EvaluationValue, name: string): EvaluationObjectProperty | null;

  readPropertyName(
    name: ts.PropertyName,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationValue;

  materializeUnknownUse(
    value: EvaluationUnknownValue,
    node: ts.Node,
    moduleKey: string,
    summary: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationValue;

  openSeamCheckpoint(): number;

  consumeOpenSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];
}

export function initializeStaticFunctionParameters(
  declaration: ts.FunctionLikeDeclaration,
  argumentValues: readonly EvaluationValueEvidence[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  call: ts.Node,
  depth: number,
  host: StaticBindingPatternHost,
): boolean {
  for (let index = 0; index < declaration.parameters.length; index++) {
    const parameter = declaration.parameters[index];
    if (parameter == null) {
      continue;
    }
    bindStaticBindingName(
      parameter.name,
      parameterValue(parameter, argumentValues, index, environment, moduleKey, call, depth + 1, host),
      EvaluationBindingKind.Parameter,
      true,
      environment,
      moduleKey,
      depth + 1,
      parameter,
      host,
    );
  }
  return true;
}

export function bindStaticBindingName(
  name: ts.BindingName,
  evidence: EvaluationValueEvidence,
  bindingKind: EvaluationBindingKind,
  mutable: boolean,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  declaration: ts.Node,
  host: StaticBindingPatternHost,
): void {
  if (ts.isIdentifier(name)) {
    environment.initializeBinding(
      name.text,
      evidence.value,
      bindingKind,
      mutable,
      declaration,
      evidence.openSeams,
    );
    return;
  }
  if (ts.isArrayBindingPattern(name)) {
    bindArrayBindingPattern(name, evidence, bindingKind, mutable, environment, moduleKey, depth + 1, host);
    return;
  }
  bindObjectBindingPattern(name, evidence, bindingKind, mutable, environment, moduleKey, depth + 1, host);
}

export function staticBindingNames(name: ts.BindingName): readonly string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  if (ts.isArrayBindingPattern(name)) {
    return name.elements.flatMap((element) =>
      element == null || ts.isOmittedExpression(element)
        ? []
        : staticBindingNames(element.name)
    );
  }
  return name.elements.flatMap((element) =>
    staticBindingNames(element.name)
  );
}

function parameterValue(
  parameter: ts.ParameterDeclaration,
  argumentValues: readonly EvaluationValueEvidence[],
  index: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  call: ts.Node,
  depth: number,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const evidence = parameter.dotDotDotToken == null
    ? argumentValues[index] ?? new EvaluationValueEvidence(EvaluationUndefined, [])
    : new EvaluationValueEvidence(
        new EvaluationArrayValue(
          argumentValues.slice(index).map((argument) =>
            new EvaluationArrayElement(argument.value, null, argument.openSeams)
          ),
          parameter,
        ),
        [],
      );
  const value = evidence.value;
  if (parameter.initializer != null && value.kind === EvaluationValueKind.Undefined) {
    const checkpoint = host.openSeamCheckpoint();
    const initialized = host.evaluateExpression(parameter.initializer, environment, moduleKey, depth + 1);
    return evaluationValueEvidence(initialized, host.consumeOpenSeamsSince(checkpoint));
  }
  return evidence;
}

function bindArrayBindingPattern(
  pattern: ts.ArrayBindingPattern,
  source: EvaluationValueEvidence,
  bindingKind: EvaluationBindingKind,
  mutable: boolean,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticBindingPatternHost,
): void {
  for (let index = 0; index < pattern.elements.length; index += 1) {
    const element = pattern.elements[index];
    if (element == null || ts.isOmittedExpression(element)) {
      continue;
    }
    const value = element.dotDotDotToken == null
      ? readArrayBindingValue(source, index, element, moduleKey, host)
      : readArrayBindingRest(source, index, element, moduleKey, host);
    bindStaticBindingName(
      element.name,
      bindingElementValue(element, value, environment, moduleKey, depth + 1, host),
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      element,
      host,
    );
  }
}

function bindObjectBindingPattern(
  pattern: ts.ObjectBindingPattern,
  source: EvaluationValueEvidence,
  bindingKind: EvaluationBindingKind,
  mutable: boolean,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticBindingPatternHost,
): void {
  const consumedKeys = new Set<string>();
  for (const element of pattern.elements) {
    if (element.dotDotDotToken != null) {
      bindStaticBindingName(
        element.name,
        readObjectBindingRest(source, consumedKeys, element, moduleKey, host),
        bindingKind,
        mutable,
        environment,
        moduleKey,
        depth + 1,
        element,
        host,
      );
      continue;
    }

    const propertyName = bindingElementPropertyName(element, environment, moduleKey, depth + 1, host);
    if (propertyName == null) {
      const checkpoint = host.openSeamCheckpoint();
      const value = host.unknown(
        'Object binding pattern property name did not reduce to a string key.',
        element,
        moduleKey,
        EvaluationOpenSeamKind.UnsupportedBindingPattern,
      );
      bindStaticBindingName(
        element.name,
        evaluationValueEvidence(value, [
          ...source.openSeams,
          ...host.consumeOpenSeamsSince(checkpoint),
        ]),
        bindingKind,
        mutable,
        environment,
        moduleKey,
        depth + 1,
        element,
        host,
      );
      continue;
    }

    consumedKeys.add(propertyName);
    bindStaticBindingName(
      element.name,
      bindingElementValue(
        element,
        readObjectBindingValue(source, propertyName, element, moduleKey, host),
        environment,
        moduleKey,
        depth + 1,
        host,
      ),
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      element,
      host,
    );
  }
}

function bindingElementValue(
  element: ts.BindingElement,
  evidence: EvaluationValueEvidence,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  if (element.initializer == null || evidence.value.kind !== EvaluationValueKind.Undefined) {
    return evidence;
  }
  const checkpoint = host.openSeamCheckpoint();
  const value = host.evaluateExpression(element.initializer, environment, moduleKey, depth + 1);
  return evaluationValueEvidence(value, [
    ...evidence.openSeams,
    ...host.consumeOpenSeamsSince(checkpoint),
  ]);
}

function bindingElementPropertyName(
  element: ts.BindingElement,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticBindingPatternHost,
): string | null {
  if (element.propertyName != null) {
    return host.readPropertyName(element.propertyName, environment, moduleKey, depth + 1);
  }
  return ts.isIdentifier(element.name) ? element.name.text : null;
}

function readArrayBindingValue(
  source: EvaluationValueEvidence,
  index: number,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const value = source.value;
  if (value.kind === EvaluationValueKind.Array) {
    if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
      return unknownBindingEvidence(
        source,
        `Array binding element ${index} depends on unknown membership or order.`,
        node,
        moduleKey,
        host,
      );
    }
    const element = value.elementAtRuntimeIndex(index);
    return new EvaluationValueEvidence(
      element?.value ?? new EvaluationUndefinedValue(node),
      [...source.openSeams, ...(element?.openSeams ?? [])],
    );
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationValueEvidence(
      new EvaluationBoundaryValue(value.boundaryKind, `${value.path}[${index}]`, node),
      source.openSeams,
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    const checkpoint = host.openSeamCheckpoint();
    const materialized = host.materializeUnknownUse(value, node, moduleKey, 'Array binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    return evaluationValueEvidence(materialized, [
      ...source.openSeams,
      ...host.consumeOpenSeamsSince(checkpoint),
    ]);
  }
  return unknownBindingEvidence(
    source,
    'Array binding pattern source did not reduce to a known array.',
    node,
    moduleKey,
    host,
  );
}

function readArrayBindingRest(
  source: EvaluationValueEvidence,
  startIndex: number,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const value = source.value;
  if (value.kind === EvaluationValueKind.Array) {
    const exact = !value.mayHaveUnknownElements && !value.mayHaveUnknownOrder && value.exactLength != null;
    if (exact && value.exactLength! - startIndex > host.maxArrayIterations()) {
      return unknownBindingEvidence(
        source,
        'Array binding rest exceeds the static iteration guardrail.',
        node,
        moduleKey,
        host,
      );
    }
    const restElements = exact
      ? denseEvaluationArrayElements(value)!
          .slice(startIndex)
          .map((element, index) => element.withRuntimeIndex(index))
      : [];
    const rest = new EvaluationArrayValue(
      restElements,
      node,
      exact
        ? EvaluationArrayShape.exact(Math.max(0, value.exactLength! - startIndex))
        : EvaluationArrayShape.from({
            exactLength: value.exactLength == null
              ? null
              : Math.max(0, value.exactLength - startIndex),
            hasExactElements: false,
            hasExactOrder: !value.mayHaveUnknownOrder,
            uncertainties: value.uncertainties,
            extentOpenSeams: value.extentOpenSeams,
            elementOpenSeams: value.elementOpenSeams,
            orderOpenSeams: value.orderOpenSeams,
          }),
    );
    return new EvaluationValueEvidence(rest, source.openSeams);
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationValueEvidence(
      new EvaluationBoundaryValue(value.boundaryKind, `${value.path}.slice(${startIndex})`, node),
      source.openSeams,
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    const checkpoint = host.openSeamCheckpoint();
    const materialized = host.materializeUnknownUse(value, node, moduleKey, 'Array rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    return evaluationValueEvidence(materialized, [
      ...source.openSeams,
      ...host.consumeOpenSeamsSince(checkpoint),
    ]);
  }
  return unknownBindingEvidence(
    source,
    'Array rest binding source did not reduce to a known array.',
    node,
    moduleKey,
    host,
  );
}

function readObjectBindingValue(
  source: EvaluationValueEvidence,
  propertyName: string,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const value = source.value;
  if (value.kind === EvaluationValueKind.Unknown) {
    const checkpoint = host.openSeamCheckpoint();
    const materialized = host.materializeUnknownUse(value, node, moduleKey, 'Object binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    return evaluationValueEvidence(materialized, [
      ...source.openSeams,
      ...host.consumeOpenSeamsSince(checkpoint),
    ]);
  }
  if (value.kind === EvaluationValueKind.BoundaryValue || value.kind === EvaluationValueKind.BoundaryObject) {
    return new EvaluationValueEvidence(
      new EvaluationBoundaryValue(value.boundaryKind, `${value.path}.${propertyName}`, node),
      source.openSeams,
    );
  }
  if (value.kind === EvaluationValueKind.ModuleNamespace) {
    const entry = value.exportEntries.get(propertyName);
    if (entry != null) {
      return new EvaluationValueEvidence(entry.value, [
        ...source.openSeams,
        ...entry.openSeams,
      ]);
    }
    return value.mayHaveUnknownExports
      ? unknownBindingEvidence(
          source,
          `Module namespace export '${propertyName}' was not closed.`,
          node,
          moduleKey,
          host,
        )
      : new EvaluationValueEvidence(new EvaluationUndefinedValue(node), source.openSeams);
  }
  const ownProperty = host.readOwnProperty(value, propertyName);
  if (ownProperty != null) {
    return new EvaluationValueEvidence(
      ownProperty.value,
      [
        ...source.openSeams,
        ...(value.kind === EvaluationValueKind.Instance ? value.constructionOpenSeams : []),
        ...ownProperty.openSeams,
      ],
    );
  }
  if ((value.kind === EvaluationValueKind.Object || value.kind === EvaluationValueKind.Instance)
    && value.mayHaveUnknownProperties) {
    return unknownBindingEvidence(
      source,
      `Object binding property '${propertyName}' depends on unknown property membership.`,
      node,
      moduleKey,
      host,
    );
  }
  if (value.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return value.exactLength == null
      ? unknownBindingEvidence(
          source,
          'Array length depends on unknown extent.',
          node,
          moduleKey,
          host,
        )
      : new EvaluationValueEvidence(new EvaluationNumberValue(value.exactLength, node), source.openSeams);
  }
  if (value.kind === EvaluationValueKind.String && propertyName === 'length') {
    return new EvaluationValueEvidence(new EvaluationNumberValue(value.value.length, node), source.openSeams);
  }
  if (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return unknownBindingEvidence(
      source,
      'Object binding pattern source was nullish.',
      node,
      moduleKey,
      host,
    );
  }
  return new EvaluationValueEvidence(new EvaluationUndefinedValue(node), source.openSeams);
}

function readObjectBindingRest(
  source: EvaluationValueEvidence,
  consumedKeys: ReadonlySet<string>,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const value = source.value;
  if (value.kind === EvaluationValueKind.Object || value.kind === EvaluationValueKind.BoundaryObject) {
    const properties = new Map<string, EvaluationObjectProperty>();
    for (const [name, property] of value.properties) {
      if (!consumedKeys.has(name)) {
        properties.set(name, property);
      }
    }
    const rest = new EvaluationObjectValue(
      properties,
      value.kind === EvaluationValueKind.Object ? value.mayHaveUnknownProperties : true,
      node,
      value.kind === EvaluationValueKind.Object ? value.uncertainties : [],
      value.kind === EvaluationValueKind.Object ? value.shapeOpenSeams : [],
    );
    return new EvaluationValueEvidence(rest, source.openSeams);
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationValueEvidence(
      new EvaluationBoundaryValue(value.boundaryKind, `${value.path}.{...rest}`, node),
      source.openSeams,
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    const checkpoint = host.openSeamCheckpoint();
    const materialized = host.materializeUnknownUse(value, node, moduleKey, 'Object rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    return evaluationValueEvidence(materialized, [
      ...source.openSeams,
      ...host.consumeOpenSeamsSince(checkpoint),
    ]);
  }
  if (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return unknownBindingEvidence(
      source,
      'Object rest binding source was nullish.',
      node,
      moduleKey,
      host,
    );
  }
  return new EvaluationValueEvidence(new EvaluationObjectValue(new Map(), true, node), source.openSeams);
}

function unknownBindingEvidence(
  source: EvaluationValueEvidence,
  reason: string,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValueEvidence {
  const checkpoint = host.openSeamCheckpoint();
  const value = host.unknown(reason, node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
  return evaluationValueEvidence(value, [
    ...source.openSeams,
    ...host.consumeOpenSeamsSince(checkpoint),
  ]);
}
