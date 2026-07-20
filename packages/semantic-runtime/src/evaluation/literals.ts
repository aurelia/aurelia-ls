import ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from './seams.js';
import { openSeamReasonKindForEvaluationBoundary } from './boundary-open-reason.js';
import {
  evaluationValueEvidence,
  unretainedEvaluationOpenSeams,
} from './value-pressure.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationArrayUncertaintyKind,
  EvaluationObjectUncertaintyKind,
  EvaluationFunctionValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  evaluationArrayBoundarySpreadUncertainty,
  evaluationObjectBoundarySpreadUncertainty,
  mergeEvaluationArrayUncertainties,
  mergeEvaluationObjectUncertainties,
  openEvaluationObjectProperties,
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

  openSeamCheckpoint(): number;

  openSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];

  consumeOpenSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];

  replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void;

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
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (const element of literal.elements) {
    const checkpoint = host.openSeamCheckpoint();
    if (ts.isOmittedExpression(element)) {
      mayHaveUnknownElements = true;
      uncertainties.push({
        kind: EvaluationArrayUncertaintyKind.OmittedElement,
        node: element,
      });
      host.open(
        EvaluationOpenSeamKind.UnsupportedExpression,
        'Array elision prevents exact evaluator element-position closure.',
        element,
        moduleKey,
      );
      shapeOpenSeams.push(...host.openSeamsSince(checkpoint));
      continue;
    }
    if (ts.isSpreadElement(element)) {
      const spread = host.evaluateExpression(element.expression, environment, moduleKey, depth + 1);
      if (spread.kind === EvaluationValueKind.BoundaryValue) {
        mayHaveUnknownElements = true;
        uncertainties.push(evaluationArrayBoundarySpreadUncertainty(spread, element));
        shapeOpenSeams.push(...compactEvaluationOpenSeams([
          ...host.openSeamsSince(checkpoint),
          new EvaluationOpenSeam(
            EvaluationOpenSeamKind.DynamicMutation,
            `Array membership depends on boundary spread '${spread.path}'.`,
            element,
            moduleKey,
            [openSeamReasonKindForEvaluationBoundary(spread.boundaryKind)],
          ),
        ]));
        continue;
      }
      if (spread.kind === EvaluationValueKind.Array) {
        const directPressure = unretainedEvaluationOpenSeams(spread, host.openSeamsSince(checkpoint));
        elements.push(...spread.elements.map((entry) => new EvaluationArrayElement(
          entry.value,
          entry.expression,
          compactEvaluationOpenSeams([...entry.openSeams, ...directPressure]),
        )));
        mayHaveUnknownElements ||= spread.mayHaveUnknownElements || directPressure.length > 0;
        uncertainties.push(...spread.uncertainties);
        shapeOpenSeams.push(...spread.shapeOpenSeams, ...directPressure);
        continue;
      }
      mayHaveUnknownElements = true;
      uncertainties.push({
        kind: EvaluationArrayUncertaintyKind.NonArraySpread,
        node: element,
      });
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Array spread did not reduce to a known array.', element, moduleKey);
      shapeOpenSeams.push(...host.openSeamsSince(checkpoint));
      continue;
    }
    const value = host.evaluateExpression(element, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, host.consumeOpenSeamsSince(checkpoint));
    elements.push(new EvaluationArrayElement(
      evidence.value,
      element,
      evidence.openSeams,
    ));
  }
  return new EvaluationArrayValue(
    elements,
    mayHaveUnknownElements,
    literal,
    false,
    mergeEvaluationArrayUncertainties(uncertainties),
    compactEvaluationOpenSeams(shapeOpenSeams),
  );
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
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (const property of literal.properties) {
    const checkpoint = host.openSeamCheckpoint();
    if (ts.isPropertyAssignment(property)) {
      const name = host.readPropertyName(property.name, environment, moduleKey, depth + 1);
      if (name == null) {
        mayHaveUnknownProperties = true;
        uncertainties.push({
          kind: EvaluationObjectUncertaintyKind.ComputedProperty,
          node: property.name,
        });
        const pressure = host.openSeamsSince(checkpoint);
        openEvaluationObjectProperties(properties, pressure);
        shapeOpenSeams.push(...pressure);
        continue;
      }
      const value = host.evaluateExpression(property.initializer, environment, moduleKey, depth + 1);
      const evidence = evaluationValueEvidence(value, host.consumeOpenSeamsSince(checkpoint));
      properties.set(name, new EvaluationObjectProperty(
        name,
        evidence.value,
        property,
        EvaluationObjectPropertyState.Closed,
        evidence.openSeams,
      ));
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      const binding = environment.readBinding(property.name.text);
      const value = binding?.value
        ?? host.unknown(`Shorthand property '${property.name.text}' did not resolve to a binding.`, property.name, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
      properties.set(property.name.text, new EvaluationObjectProperty(
        property.name.text,
        value,
        property,
        EvaluationObjectPropertyState.Closed,
        binding == null
          ? unretainedEvaluationOpenSeams(value, host.consumeOpenSeamsSince(checkpoint))
          : binding.openSeams,
      ));
      continue;
    }
    if (ts.isSpreadAssignment(property)) {
      const spread = host.evaluateExpression(property.expression, environment, moduleKey, depth + 1);
      if (spread.kind === EvaluationValueKind.BoundaryValue || spread.kind === EvaluationValueKind.BoundaryObject) {
        mayHaveUnknownProperties = true;
        uncertainties.push(evaluationObjectBoundarySpreadUncertainty(spread, property));
        const pressure = compactEvaluationOpenSeams([
          ...host.openSeamsSince(checkpoint),
          new EvaluationOpenSeam(
            EvaluationOpenSeamKind.DynamicMutation,
            `Object properties depend on boundary spread '${spread.path}'.`,
            property,
            moduleKey,
            [openSeamReasonKindForEvaluationBoundary(spread.boundaryKind)],
          ),
        ]);
        openEvaluationObjectProperties(properties, pressure);
        shapeOpenSeams.push(...pressure);
        continue;
      }
      if (spread.kind === EvaluationValueKind.Object) {
        const directPressure = unretainedEvaluationOpenSeams(spread, host.openSeamsSince(checkpoint));
        let pressure = compactEvaluationOpenSeams([
          ...spread.shapeOpenSeams,
          ...directPressure,
        ]);
        if (spread.mayHaveUnknownProperties || directPressure.length > 0) {
          if (pressure.length === 0) {
            host.open(
              EvaluationOpenSeamKind.DynamicMutation,
              'Object spread retained unknown property membership.',
              property,
              moduleKey,
            );
            pressure = host.openSeamsSince(checkpoint);
          }
          openEvaluationObjectProperties(properties, pressure);
          shapeOpenSeams.push(...pressure);
        }
        for (const [name, entry] of spread.properties) {
          properties.set(name, entry.withState(entry.state, directPressure));
        }
        mayHaveUnknownProperties ||= spread.mayHaveUnknownProperties || directPressure.length > 0;
        uncertainties.push(...spread.uncertainties);
        continue;
      }
      mayHaveUnknownProperties = true;
      uncertainties.push({
        kind: EvaluationObjectUncertaintyKind.NonObjectSpread,
        node: property,
      });
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Object spread did not reduce to a known object.', property, moduleKey);
      const pressure = host.openSeamsSince(checkpoint);
      openEvaluationObjectProperties(properties, pressure);
      shapeOpenSeams.push(...pressure);
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
        const pressure = host.openSeamsSince(checkpoint);
        openEvaluationObjectProperties(properties, pressure);
        shapeOpenSeams.push(...pressure);
        continue;
      }
      const value = new EvaluationFunctionValue(property, environment, property);
      properties.set(name, new EvaluationObjectProperty(
        name,
        value,
        property,
        EvaluationObjectPropertyState.Closed,
        unretainedEvaluationOpenSeams(value, host.consumeOpenSeamsSince(checkpoint)),
      ));
      continue;
    }
    mayHaveUnknownProperties = true;
    uncertainties.push({
      kind: EvaluationObjectUncertaintyKind.UnsupportedMember,
      node: property,
    });
    host.open(EvaluationOpenSeamKind.UnsupportedExpression, `Object literal member ${host.syntaxKindName(property)} is not evaluated.`, property, moduleKey);
    const pressure = host.openSeamsSince(checkpoint);
    openEvaluationObjectProperties(properties, pressure);
    shapeOpenSeams.push(...pressure);
  }
  return new EvaluationObjectValue(
    properties,
    mayHaveUnknownProperties,
    literal,
    mergeEvaluationObjectUncertainties(uncertainties),
    compactEvaluationOpenSeams(shapeOpenSeams),
  );
}
