import ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationArrayUncertaintyKind,
  EvaluationObjectUncertaintyKind,
  EvaluationFunctionValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationValueKind,
  evaluationArrayBoundarySpreadUncertainty,
  evaluationObjectBoundarySpreadUncertainty,
  mergeEvaluationArrayUncertainties,
  mergeEvaluationObjectUncertainties,
  type EvaluationArrayUncertainty,
  type EvaluationObjectUncertainty,
  type EvaluationUnknownValue,
  type EvaluationValue,
} from './values.js';

export interface StaticLiteralEvaluationHost {
  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  readPropertyName(
    name: ts.PropertyName,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null;

  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  syntaxKindName(node: ts.Node): string;
}

export function evaluateStaticArrayLiteral(
  literal: ts.ArrayLiteralExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticLiteralEvaluationHost,
): EvaluationValue {
  const elements: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = false;
  const uncertainties: EvaluationArrayUncertainty[] = [];
  for (const element of literal.elements) {
    if (ts.isOmittedExpression(element)) {
      mayHaveUnknownElements = true;
      uncertainties.push({
        kind: EvaluationArrayUncertaintyKind.OmittedElement,
        node: element,
      });
      continue;
    }
    if (ts.isSpreadElement(element)) {
      const spread = host.evaluateExpression(element.expression, environment, moduleKey, depth + 1);
      if (spread.kind === EvaluationValueKind.BoundaryValue) {
        mayHaveUnknownElements = true;
        uncertainties.push(evaluationArrayBoundarySpreadUncertainty(spread, element));
        continue;
      }
      if (spread.kind === EvaluationValueKind.Array) {
        elements.push(...spread.elements);
        mayHaveUnknownElements ||= spread.mayHaveUnknownElements;
        uncertainties.push(...spread.uncertainties);
        continue;
      }
      mayHaveUnknownElements = true;
      uncertainties.push({
        kind: EvaluationArrayUncertaintyKind.NonArraySpread,
        node: element,
      });
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Array spread did not reduce to a known array.', element, moduleKey);
      continue;
    }
    elements.push(new EvaluationArrayElement(host.evaluateExpression(element, environment, moduleKey, depth + 1), element));
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, literal, false, mergeEvaluationArrayUncertainties(uncertainties));
}

export function evaluateStaticObjectLiteral(
  literal: ts.ObjectLiteralExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticLiteralEvaluationHost,
): EvaluationValue {
  const properties = new Map<string, EvaluationObjectProperty>();
  let mayHaveUnknownProperties = false;
  const uncertainties: EvaluationObjectUncertainty[] = [];
  for (const property of literal.properties) {
    if (ts.isPropertyAssignment(property)) {
      const name = host.readPropertyName(property.name, environment, moduleKey, depth + 1);
      if (name == null) {
        mayHaveUnknownProperties = true;
        uncertainties.push({
          kind: EvaluationObjectUncertaintyKind.ComputedProperty,
          node: property.name,
        });
        host.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Object property key did not reduce to a string key.', property.name, moduleKey);
        continue;
      }
      properties.set(name, new EvaluationObjectProperty(
        name,
        host.evaluateExpression(property.initializer, environment, moduleKey, depth + 1),
        property,
      ));
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      properties.set(property.name.text, new EvaluationObjectProperty(
        property.name.text,
        environment.readValue(property.name.text)
          ?? host.unknown(`Shorthand property '${property.name.text}' did not resolve to a binding.`, property.name, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier),
        property,
      ));
      continue;
    }
    if (ts.isSpreadAssignment(property)) {
      const spread = host.evaluateExpression(property.expression, environment, moduleKey, depth + 1);
      if (spread.kind === EvaluationValueKind.BoundaryValue || spread.kind === EvaluationValueKind.BoundaryObject) {
        mayHaveUnknownProperties = true;
        uncertainties.push(evaluationObjectBoundarySpreadUncertainty(spread, property));
        continue;
      }
      if (spread.kind === EvaluationValueKind.Object) {
        for (const [name, entry] of spread.properties) {
          properties.set(name, entry);
        }
        mayHaveUnknownProperties ||= spread.mayHaveUnknownProperties;
        uncertainties.push(...spread.uncertainties);
        continue;
      }
      mayHaveUnknownProperties = true;
      uncertainties.push({
        kind: EvaluationObjectUncertaintyKind.NonObjectSpread,
        node: property,
      });
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Object spread did not reduce to a known object.', property, moduleKey);
      continue;
    }
    if (ts.isMethodDeclaration(property)) {
      const name = host.readPropertyName(property.name, environment, moduleKey, depth + 1);
      if (name == null) {
        mayHaveUnknownProperties = true;
        uncertainties.push({
          kind: EvaluationObjectUncertaintyKind.ComputedProperty,
          node: property.name,
        });
        host.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Object method key did not reduce to a string key.', property.name, moduleKey);
        continue;
      }
      properties.set(name, new EvaluationObjectProperty(
        name,
        new EvaluationFunctionValue(property, environment.clone(`${moduleKey}:method:${name}`), property),
        property,
      ));
      continue;
    }
    mayHaveUnknownProperties = true;
    uncertainties.push({
      kind: EvaluationObjectUncertaintyKind.UnsupportedMember,
      node: property,
    });
    host.open(EvaluationOpenSeamKind.UnsupportedExpression, `Object literal member ${host.syntaxKindName(property)} is not evaluated.`, property, moduleKey);
  }
  return new EvaluationObjectValue(properties, mayHaveUnknownProperties, literal, mergeEvaluationObjectUncertainties(uncertainties));
}
