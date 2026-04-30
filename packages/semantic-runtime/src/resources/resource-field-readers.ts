import ts from 'typescript';
import {
  readCallCalleeText,
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import {
  EvaluationValueKind,
} from '../evaluation/values.js';
import {
  AttributePatternObservation,
} from './resource-observation.js';
import {
  ResourceDefinitionKind,
  readResourceKindFromRuntimeTypeName,
} from './resource-kind.js';

export const RESOURCE_DECORATOR_KIND = new Map<string, ResourceDefinitionKind>([
  ['customElement', ResourceDefinitionKind.CustomElement],
  ['customAttribute', ResourceDefinitionKind.CustomAttribute],
  ['templateController', ResourceDefinitionKind.TemplateController],
  ['valueConverter', ResourceDefinitionKind.ValueConverter],
  ['bindingBehavior', ResourceDefinitionKind.BindingBehavior],
  ['bindingCommand', ResourceDefinitionKind.BindingCommand],
  ['attributePattern', ResourceDefinitionKind.AttributePattern],
]);

export const RESOURCE_DEFINE_RECEIVER_KIND = new Map<string, ResourceDefinitionKind>([
  ['CustomElement', ResourceDefinitionKind.CustomElement],
  ['CustomAttribute', ResourceDefinitionKind.CustomAttribute],
  ['ValueConverter', ResourceDefinitionKind.ValueConverter],
  ['BindingBehavior', ResourceDefinitionKind.BindingBehavior],
  ['BindingCommand', ResourceDefinitionKind.BindingCommand],
]);

export class ResourceFieldRead<TValue> {
  constructor(
    /** Value that closed, or null when the field stayed open. */
    readonly value: TValue | null,
    /** Source node that best explains this field read. */
    readonly node: ts.Node | null,
    /** Explanation used when the field did not close. */
    readonly openSummary: string | null = null,
  ) {}
}

export function readDecoratorCalleeName(
  decorator: ts.Decorator,
): string | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    return readCallCalleeText(expression.expression)?.split('.').at(-1) ?? null;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

export function readStaticAuInitializer(
  classNode: ts.ClassLikeDeclarationBase,
): ts.Expression | null {
  for (const member of classNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) === '$au') {
      return member.initializer;
    }
  }
  return null;
}

export function readEvaluatedExpressionTarget(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
) {
  return reader.readExpressionTarget(expression);
}

export function readResourceKindField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<ResourceDefinitionKind> {
  const value = reader.readObjectProperty(expression, 'type');
  if (value.value == null) {
    return new ResourceFieldRead<ResourceDefinitionKind>(
      null,
      value.node,
      summaryWithEvaluationSeams('Resource definition did not expose a static type field.', value.openSeams),
    );
  }
  const raw = readStaticStringValue(value.value);
  if (raw == null) {
    return new ResourceFieldRead<ResourceDefinitionKind>(
      null,
      value.node,
      summaryWithEvaluationSeams('Resource definition type field did not close to a known string.', value.openSeams),
    );
  }
  const kind = readResourceKindFromRuntimeTypeName(raw);
  return kind == null
    ? new ResourceFieldRead<ResourceDefinitionKind>(
      null,
      value.node,
      summaryWithEvaluationSeams(`Resource definition type '${raw}' is not recognized by this resource reader.`, value.openSeams),
    )
    : new ResourceFieldRead(kind, value.node);
}

export function readResourceNameField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<string> {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return new ResourceFieldRead(current.text, current);
  }

  const value = reader.readObjectProperty(expression, 'name');
  if (value.value == null) {
    return new ResourceFieldRead<string>(
      null,
      value.node,
      summaryWithEvaluationSeams('Resource definition did not expose a static name field.', value.openSeams),
    );
  }
  const name = readStaticStringValue(value.value);
  return name == null
    ? new ResourceFieldRead<string>(
      null,
      value.node,
      summaryWithEvaluationSeams('Resource definition name did not close to a static string.', value.openSeams),
    )
    : new ResourceFieldRead(name, value.node);
}

export function readResourceAliasesField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<readonly string[]> {
  const value = reader.readObjectProperty(expression, 'aliases');
  if (value.value == null) {
    return new ResourceFieldRead([], value.node);
  }
  const aliases = readStaticStringArrayValue(value.value);
  if (aliases == null) {
    return new ResourceFieldRead(
      [],
      value.node,
      summaryWithEvaluationSeams('Resource aliases field did not close to a static string array.', value.openSeams),
    );
  }
  return new ResourceFieldRead(aliases, value.node);
}

export function readTemplateControllerFlag(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): boolean {
  const value = reader.readObjectProperty(expression, 'isTemplateController').value;
  return value?.kind === EvaluationValueKind.Boolean && value.value === true;
}

export function readAttributePatternEntries(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<readonly AttributePatternObservation[]> {
  const result = reader.evaluateExpression(expression);
  const value = result.value;
  if (value == null || value.kind !== EvaluationValueKind.Array) {
    return new ResourceFieldRead(
      [],
      expression,
      summaryWithEvaluationSeams('AttributePattern.create(...) pattern source did not close to an array.', result.openSeams),
    );
  }

  const patterns: AttributePatternObservation[] = [];
  let open = value.mayHaveUnknownElements;
  for (const element of value.elements) {
    if (element.value.kind !== EvaluationValueKind.Object) {
      open = true;
      continue;
    }
    const pattern = reader.readObjectStringProperty(element.value, 'pattern');
    const symbols = reader.readObjectStringProperty(element.value, 'symbols');
    if (pattern == null || symbols == null) {
      open = true;
      continue;
    }
    const patternValue = pattern.value;
    const symbolsValue = symbols.value;
    if (patternValue == null || symbolsValue == null) {
      open = true;
      continue;
    }
    patterns.push(new AttributePatternObservation(
      patternValue,
      symbolsValue,
      pattern.node ?? element.expression ?? expression,
    ));
  }

  return open
    ? new ResourceFieldRead(
      patterns,
      expression,
      summaryWithEvaluationSeams(
        'AttributePattern.create(...) pattern source has statically visible entries plus open entries.',
        result.openSeams,
      ),
    )
    : new ResourceFieldRead(patterns, expression);
}

export function readAttributePatternEntry(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<AttributePatternObservation> {
  const result = reader.evaluateExpression(expression);
  const value = result.value;
  if (value == null || value.kind !== EvaluationValueKind.Object) {
    return new ResourceFieldRead<AttributePatternObservation>(
      null,
      expression,
      summaryWithEvaluationSeams('Attribute pattern definition did not close to an object.', result.openSeams),
    );
  }
  const pattern = reader.readObjectStringProperty(value, 'pattern');
  const symbols = reader.readObjectStringProperty(value, 'symbols');
  if (pattern?.value == null || symbols?.value == null) {
    return new ResourceFieldRead<AttributePatternObservation>(
      null,
      expression,
      summaryWithEvaluationSeams(
        'Attribute pattern definition did not close to static pattern and symbols fields.',
        result.openSeams,
      ),
    );
  }
  return new ResourceFieldRead(
    new AttributePatternObservation(pattern.value, symbols.value, pattern.node ?? expression),
    expression,
  );
}

export function readDefineCallKind(
  call: ts.CallExpression,
): ResourceDefinitionKind | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'define') {
    return null;
  }
  const receiver = readCallCalleeText(expression.expression)?.split('.').at(-1);
  return receiver == null
    ? null
    : RESOURCE_DEFINE_RECEIVER_KIND.get(receiver) ?? null;
}

export function isAttributePatternCreateCall(
  call: ts.CallExpression,
): boolean {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'create') {
    return false;
  }
  return readCallCalleeText(expression.expression)?.split('.').at(-1) === 'AttributePattern';
}

function hasStaticModifier(
  node: ts.Node,
): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true
    : false;
}

function summaryWithEvaluationSeams(
  summary: string,
  openSeams: readonly EvaluationOpenSeam[],
): string {
  if (openSeams.length === 0) {
    return summary;
  }
  return `${summary} Evaluation opened: ${openSeams.map((seam) => seam.summary).join(' ')}`;
}
