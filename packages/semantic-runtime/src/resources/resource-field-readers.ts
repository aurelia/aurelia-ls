import ts from 'typescript';
import {
  hasStaticModifier,
  readCallCalleeText,
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  authoredStringLiteralNode,
  readStaticStringArrayEntries,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import {
  type EvaluationArrayElement,
  type EvaluationArrayValue,
  type EvaluationObjectValue,
  EvaluationValueKind,
} from '../evaluation/values.js';
import {
  AttributePatternObservation,
  ResourceAliasObservation,
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
    /** Exact authored value token, when this field closed from a directly editable literal. */
    readonly valueNode: ts.Node | null = null,
  ) {}
}

interface AttributePatternEntriesRead {
  readonly patterns: readonly AttributePatternObservation[];
  readonly open: boolean;
}

interface AttributePatternEntryRead {
  readonly pattern: AttributePatternObservation | null;
  readonly open: boolean;
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
    return new ResourceFieldRead(current.text, current, null, current);
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
    : new ResourceFieldRead(name, value.node, null, authoredStringLiteralNode(value.value, value.value.node, value.node));
}

export function readResourceAliasesField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<readonly ResourceAliasObservation[]> {
  const value = reader.readObjectProperty(expression, 'aliases');
  if (value.value == null) {
    return new ResourceFieldRead([], value.node);
  }
  const entries = readStaticStringArrayEntries(value.value, value.node);
  if (entries == null) {
    return new ResourceFieldRead(
      [],
      value.node,
      summaryWithEvaluationSeams('Resource aliases field did not close to a static string array.', value.openSeams),
    );
  }
  return new ResourceFieldRead(
    entries.map((entry) => new ResourceAliasObservation(entry.value, entry.valueNode)),
    value.node,
  );
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

  const entries = readAttributePatternArray(value, expression);
  return attributePatternEntriesFieldRead(entries, expression, result.openSeams);
}

function readAttributePatternArray(
  value: EvaluationArrayValue,
  sourceExpression: ts.Expression,
): AttributePatternEntriesRead {
  const patterns: AttributePatternObservation[] = [];
  let open = value.mayHaveUnknownElements || value.mayHaveUnknownOrder;
  for (const element of value.elements) {
    const entry = readAttributePatternArrayElement(element, sourceExpression);
    open ||= entry.open;
    if (entry.pattern == null) {
      continue;
    }
    patterns.push(entry.pattern);
  }
  return { patterns, open };
}

function readAttributePatternArrayElement(
  element: EvaluationArrayElement,
  sourceExpression: ts.Expression,
): AttributePatternEntryRead {
  if (element.value.kind !== EvaluationValueKind.Object) {
    return { pattern: null, open: true };
  }

  const pattern = attributePatternObservationFromObject(
    element.value,
    element.expression ?? sourceExpression,
  );
  if (pattern == null) {
    return { pattern: null, open: true };
  }

  return {
    pattern,
    open: false,
  };
}

function attributePatternObservationFromObject(
  value: EvaluationObjectValue,
  sourceExpression: ts.Expression,
): AttributePatternObservation | null {
  const patternProperty = value.properties.get('pattern') ?? null;
  const symbolsProperty = value.properties.get('symbols') ?? null;
  if (patternProperty == null || symbolsProperty == null) {
    return null;
  }
  const pattern = readStaticStringValue(patternProperty.value);
  const symbols = readStaticStringValue(symbolsProperty.value);
  if (pattern == null || symbols == null) {
    return null;
  }
  return new AttributePatternObservation(
    pattern,
    symbols,
    authoredStringLiteralNode(
      patternProperty.value,
      patternProperty.value.node,
      patternProperty.node ?? sourceExpression,
    ) ?? patternProperty.node ?? sourceExpression,
  );
}

function attributePatternEntriesFieldRead(
  entries: AttributePatternEntriesRead,
  expression: ts.Expression,
  openSeams: readonly EvaluationOpenSeam[],
): ResourceFieldRead<readonly AttributePatternObservation[]> {
  return entries.open
    ? new ResourceFieldRead(
      entries.patterns,
      expression,
      summaryWithEvaluationSeams(
        'AttributePattern.create(...) pattern source has statically visible entries plus open entries.',
        openSeams,
      ),
    )
    : new ResourceFieldRead(entries.patterns, expression);
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
  const pattern = attributePatternObservationFromObject(value, expression);
  if (pattern == null) {
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
    pattern,
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

function summaryWithEvaluationSeams(
  summary: string,
  openSeams: readonly EvaluationOpenSeam[],
): string {
  if (openSeams.length === 0) {
    return summary;
  }
  return `${summary} Evaluation opened: ${openSeams.map((seam) => seam.summary).join(' ')}`;
}
