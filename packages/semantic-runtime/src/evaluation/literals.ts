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
  EvaluationArrayShape,
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
import { evaluationArrayIteratorElements } from './array-value-operations.js';

export interface StaticLiteralEvaluationHost {
  maxArrayIterations(): number;

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
  let exactLength: number | null = 0;
  let hasExactElements = true;
  let hasExactOrder = true;
  const uncertainties: EvaluationArrayUncertainty[] = [];
  const extentOpenSeams: EvaluationOpenSeam[] = [];
  const elementOpenSeams: EvaluationOpenSeam[] = [];
  const orderOpenSeams: EvaluationOpenSeam[] = [];
  for (const element of literal.elements) {
    const checkpoint = host.openSeamCheckpoint();
    if (ts.isOmittedExpression(element)) {
      exactLength = exactLength == null ? null : exactLength + 1;
      host.consumeOpenSeamsSince(checkpoint);
      continue;
    }
    if (ts.isSpreadElement(element)) {
      const spread = host.evaluateExpression(element.expression, environment, moduleKey, depth + 1);
      if (spread.kind === EvaluationValueKind.BoundaryValue) {
        exactLength = null;
        hasExactElements = false;
        uncertainties.push(evaluationArrayBoundarySpreadUncertainty(spread, element));
        const spreadOpenSeams = compactEvaluationOpenSeams([
          ...host.openSeamsSince(checkpoint),
          new EvaluationOpenSeam(
            EvaluationOpenSeamKind.DynamicMutation,
            `Array membership depends on boundary spread '${spread.path}'.`,
            element,
            moduleKey,
            [openSeamReasonKindForEvaluationBoundary(spread.boundaryKind)],
          ),
        ]);
        extentOpenSeams.push(...spreadOpenSeams);
        elementOpenSeams.push(...spreadOpenSeams);
        continue;
      }
      if (spread.kind === EvaluationValueKind.Array) {
        const directPressure = unretainedEvaluationOpenSeams(spread, host.openSeamsSince(checkpoint));
        const spreadElements = directPressure.length === 0
          && spread.exactLength != null
          && spread.exactLength <= host.maxArrayIterations()
          ? evaluationArrayIteratorElements(spread)
          : null;
        if (spreadElements == null) {
          if (
            directPressure.length === 0
            && spread.aggregateOpenSeams.length === 0
            && spread.uncertainties.length === 0
          ) {
            host.open(
              EvaluationOpenSeamKind.DynamicMutation,
              'Array literal spread exceeded the static iteration guardrail or retained unexplained open positions.',
              element,
              moduleKey,
            );
          }
          const spreadOpenSeams = compactEvaluationOpenSeams([
            ...directPressure,
            ...spread.aggregateOpenSeams,
            ...host.openSeamsSince(checkpoint),
          ]);
          exactLength = null;
          hasExactElements = false;
          hasExactOrder &&= !spread.mayHaveUnknownOrder;
          uncertainties.push(...spread.uncertainties);
          extentOpenSeams.push(...spreadOpenSeams);
          elementOpenSeams.push(...spreadOpenSeams);
          orderOpenSeams.push(...spread.orderOpenSeams);
          continue;
        }
        const offset = exactLength;
        elements.push(...spreadElements.map((entry) => new EvaluationArrayElement(
          entry.value,
          entry.expression,
          compactEvaluationOpenSeams([...entry.openSeams, ...directPressure]),
          offset == null || entry.runtimeIndex == null || directPressure.length > 0
            ? null
            : offset + entry.runtimeIndex,
        )));
        exactLength = exactLength == null || spread.exactLength == null || directPressure.length > 0
          ? null
          : exactLength + spread.exactLength;
        hasExactElements &&= !spread.mayHaveUnknownElements && directPressure.length === 0;
        hasExactOrder &&= !spread.mayHaveUnknownOrder && directPressure.length === 0;
        uncertainties.push(...spread.uncertainties);
        extentOpenSeams.push(...spread.extentOpenSeams, ...directPressure);
        elementOpenSeams.push(...spread.elementOpenSeams, ...directPressure);
        orderOpenSeams.push(...spread.orderOpenSeams, ...directPressure);
        continue;
      }
      exactLength = null;
      hasExactElements = false;
      uncertainties.push({
        kind: EvaluationArrayUncertaintyKind.NonArraySpread,
        node: element,
      });
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Array spread did not reduce to a known array.', element, moduleKey);
      const spreadOpenSeams = host.openSeamsSince(checkpoint);
      extentOpenSeams.push(...spreadOpenSeams);
      elementOpenSeams.push(...spreadOpenSeams);
      continue;
    }
    const value = host.evaluateExpression(element, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, host.consumeOpenSeamsSince(checkpoint));
    const runtimeIndex = exactLength;
    elements.push(new EvaluationArrayElement(
      evidence.value,
      element,
      evidence.openSeams,
      runtimeIndex,
    ));
    exactLength = exactLength == null ? null : exactLength + 1;
  }
  return new EvaluationArrayValue(
    elements,
    literal,
    EvaluationArrayShape.from({
      exactLength,
      hasExactElements,
      hasExactOrder,
      uncertainties: mergeEvaluationArrayUncertainties(uncertainties),
      extentOpenSeams,
      elementOpenSeams,
      orderOpenSeams,
    }),
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
        host.evaluateExpression(property.initializer, environment, moduleKey, depth + 1);
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
