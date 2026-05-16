import ts from 'typescript';

import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from './environment.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationArrayElement,
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

/** Host hooks that keep binding-pattern evaluation inside the owning evaluator's policy and seam stream. */
export interface StaticBindingPatternHost {
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
}

export function initializeStaticFunctionParameters(
  declaration: ts.FunctionLikeDeclaration,
  argumentValues: readonly EvaluationValue[],
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
  value: EvaluationValue,
  bindingKind: EvaluationBindingKind,
  mutable: boolean,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  declaration: ts.Node,
  host: StaticBindingPatternHost,
): void {
  if (ts.isIdentifier(name)) {
    environment.initializeBinding(name.text, value, bindingKind, mutable, declaration);
    return;
  }
  if (ts.isArrayBindingPattern(name)) {
    bindArrayBindingPattern(name, value, bindingKind, mutable, environment, moduleKey, depth + 1, host);
    return;
  }
  bindObjectBindingPattern(name, value, bindingKind, mutable, environment, moduleKey, depth + 1, host);
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
  argumentValues: readonly EvaluationValue[],
  index: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  call: ts.Node,
  depth: number,
  host: StaticBindingPatternHost,
): EvaluationValue {
  const value = parameter.dotDotDotToken == null
    ? argumentValues[index] ?? EvaluationUndefined
    : new EvaluationArrayValue(
      argumentValues.slice(index).map((argument) =>
        new EvaluationArrayElement(argument, null)
      ),
      false,
      parameter,
    );
  if (parameter.initializer != null && value.kind === EvaluationValueKind.Undefined) {
    return host.evaluateExpression(parameter.initializer, environment, moduleKey, depth + 1);
  }
  return value;
}

function bindArrayBindingPattern(
  pattern: ts.ArrayBindingPattern,
  source: EvaluationValue,
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
  source: EvaluationValue,
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
      bindStaticBindingName(
        element.name,
        host.unknown('Object binding pattern property name did not reduce to a string key.', element, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern),
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
  value: EvaluationValue,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticBindingPatternHost,
): EvaluationValue {
  return element.initializer != null && value.kind === EvaluationValueKind.Undefined
    ? host.evaluateExpression(element.initializer, environment, moduleKey, depth + 1)
    : value;
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
  source: EvaluationValue,
  index: number,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValue {
  if (source.kind === EvaluationValueKind.Array) {
    return source.mayHaveUnknownOrder
      ? host.unknown(`Array binding element ${index} depends on unknown element order.`, node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern)
      : source.elements[index]?.value ?? new EvaluationUndefinedValue(node);
  }
  if (source.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}[${index}]`, node);
  }
  if (source.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(source, node, moduleKey, 'Array binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  return host.unknown('Array binding pattern source did not reduce to a known array.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
}

function readArrayBindingRest(
  source: EvaluationValue,
  startIndex: number,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValue {
  if (source.kind === EvaluationValueKind.Array) {
    return new EvaluationArrayValue(
      source.mayHaveUnknownOrder ? [] : source.elements.slice(startIndex),
      source.mayHaveUnknownElements || source.mayHaveUnknownOrder,
      node,
    );
  }
  if (source.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.slice(${startIndex})`, node);
  }
  if (source.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(source, node, moduleKey, 'Array rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  return host.unknown('Array rest binding source did not reduce to a known array.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
}

function readObjectBindingValue(
  source: EvaluationValue,
  propertyName: string,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValue {
  if (source.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(source, node, moduleKey, 'Object binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  if (source.kind === EvaluationValueKind.BoundaryValue || source.kind === EvaluationValueKind.BoundaryObject) {
    return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.${propertyName}`, node);
  }
  if (source.kind === EvaluationValueKind.ModuleNamespace) {
    return source.exports.get(propertyName) ?? new EvaluationUndefinedValue(node);
  }
  const ownProperty = host.readOwnProperty(source, propertyName);
  if (ownProperty != null) {
    return ownProperty.value;
  }
  if (source.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return new EvaluationNumberValue(source.elements.length, node);
  }
  if (source.kind === EvaluationValueKind.String && propertyName === 'length') {
    return new EvaluationNumberValue(source.value.length, node);
  }
  if (source.kind === EvaluationValueKind.Null || source.kind === EvaluationValueKind.Undefined) {
    return host.unknown('Object binding pattern source was nullish.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  return new EvaluationUndefinedValue(node);
}

function readObjectBindingRest(
  source: EvaluationValue,
  consumedKeys: ReadonlySet<string>,
  node: ts.Node,
  moduleKey: string,
  host: StaticBindingPatternHost,
): EvaluationValue {
  if (source.kind === EvaluationValueKind.Object || source.kind === EvaluationValueKind.BoundaryObject) {
    const properties = new Map<string, EvaluationObjectProperty>();
    for (const [name, property] of source.properties) {
      if (!consumedKeys.has(name)) {
        properties.set(name, property);
      }
    }
    return new EvaluationObjectValue(
      properties,
      source.kind === EvaluationValueKind.Object ? source.mayHaveUnknownProperties : true,
      node,
    );
  }
  if (source.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.{...rest}`, node);
  }
  if (source.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(source, node, moduleKey, 'Object rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  if (source.kind === EvaluationValueKind.Null || source.kind === EvaluationValueKind.Undefined) {
    return host.unknown('Object rest binding source was nullish.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }
  return new EvaluationObjectValue(new Map(), true, node);
}
