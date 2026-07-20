import ts from 'typescript';
import {
  evaluationAbruptCompletionSummary,
  type EvaluationAbruptCompletion,
} from '../evaluation/completion.js';
import {
  openSeamReasonKindsForEvaluationRead,
  openSeamReasonKindsForEvaluationPressure,
} from '../evaluation/boundary-open-reason.js';
import {
  hasStaticModifier,
  readCallCalleeText,
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  closedStaticValueMemberValue,
  readStaticOwnProperty,
  readStaticValueProperty,
} from '../evaluation/property-access.js';
import {
  authoredStringLiteralNode,
  readStaticStringArrayEntries,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
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
    /** Statically visible value, which may coexist with retained open pressure. */
    readonly value: TValue | null,
    /** Source node that best explains this field read. */
    readonly node: ts.Node | null,
    /** Explanation used when the field stayed wholly or partially open. */
    readonly openSummary: string | null,
    /** Machine-readable evaluator causes retained when the field did not close. */
    readonly openReasonKinds: readonly OpenSeamReasonKind[],
    /** Exact authored value token, when this field closed from a directly editable literal. */
    readonly valueNode: ts.Node | null,
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
      summaryWithEvaluationRead('Resource definition did not expose a static type field.', value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    );
  }
  const raw = readStaticStringValue(value.value);
  if (raw == null) {
    return new ResourceFieldRead<ResourceDefinitionKind>(
      null,
      value.node,
      summaryWithEvaluationRead('Resource definition type field did not close to a known string.', value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    );
  }
  const kind = readResourceKindFromRuntimeTypeName(raw);
  return kind == null
    ? new ResourceFieldRead<ResourceDefinitionKind>(
      null,
      value.node,
      summaryWithEvaluationRead(`Resource definition type '${raw}' is not recognized by this resource reader.`, value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    )
    : resourceFieldReadWithEvaluationPressure(
        kind,
        value.node,
        null,
        'Resource definition type evaluation remained open.',
        value,
      );
}

export function readResourceNameField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<string> {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return new ResourceFieldRead(current.text, current, null, [], current);
  }

  const value = reader.readObjectProperty(expression, 'name');
  if (value.value == null) {
    return new ResourceFieldRead<string>(
      null,
      value.node,
      summaryWithEvaluationRead('Resource definition did not expose a static name field.', value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    );
  }
  const name = readStaticStringValue(value.value);
  return name == null
    ? new ResourceFieldRead<string>(
      null,
      value.node,
      summaryWithEvaluationRead('Resource definition name did not close to a static string.', value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    )
    : resourceFieldReadWithEvaluationPressure(
        name,
        value.node,
        authoredStringLiteralNode(value.value, value.value.node, value.node),
        'Resource definition name evaluation remained open.',
        value,
      );
}

export function readResourceAliasesField(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<readonly ResourceAliasObservation[]> {
  const value = reader.readObjectProperty(expression, 'aliases');
  if (value.value == null) {
    const reasonKinds = openSeamReasonKindsForEvaluationRead(value);
    return reasonKinds.length === 0
      ? new ResourceFieldRead([], value.node, null, [], null)
      : new ResourceFieldRead<readonly ResourceAliasObservation[]>(
          [],
          value.node,
          summaryWithEvaluationRead('Resource aliases field did not produce a value.', value),
          reasonKinds,
          null,
        );
  }
  if (value.value.kind === EvaluationValueKind.Undefined || value.value.kind === EvaluationValueKind.Null) {
    return resourceFieldReadWithEvaluationPressure(
      [],
      value.node,
      null,
      'Resource aliases evaluation remained open.',
      value,
    );
  }
  const entries = readStaticStringArrayEntries(value.value, value.node);
  if (entries == null) {
    return new ResourceFieldRead(
      [],
      value.node,
      summaryWithEvaluationRead('Resource aliases field did not close to a static string array.', value),
      openSeamReasonKindsForEvaluationRead(value),
      null,
    );
  }
  return resourceFieldReadWithEvaluationPressure(
    entries.map((entry) => new ResourceAliasObservation(entry.value, entry.valueNode)),
    value.node,
    null,
    'Resource aliases evaluation remained open.',
    value,
  );
}

export function readTemplateControllerFlag(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): ResourceFieldRead<boolean> {
  const read = reader.readObjectProperty(expression, 'isTemplateController');
  if (read.value == null) {
    const reasonKinds = openSeamReasonKindsForEvaluationRead(read);
    return reasonKinds.length === 0
      ? new ResourceFieldRead(false, read.node, null, [], null)
      : new ResourceFieldRead<boolean>(
          null,
          read.node,
          summaryWithEvaluationRead('Resource template-controller flag did not produce a value.', read),
          reasonKinds,
          null,
        );
  }
  if (read.value.kind === EvaluationValueKind.Undefined || read.value.kind === EvaluationValueKind.Null) {
    return resourceFieldReadWithEvaluationPressure(
      false,
      read.node,
      null,
      'Resource template-controller flag evaluation remained open.',
      read,
    );
  }
  return read.value.kind === EvaluationValueKind.Boolean
    ? resourceFieldReadWithEvaluationPressure(
        read.value.value,
        read.node,
        null,
        'Resource template-controller flag evaluation remained open.',
        read,
      )
    : new ResourceFieldRead<boolean>(
        null,
        read.node,
        summaryWithEvaluationRead('Resource template-controller flag did not close to a boolean.', read),
        openSeamReasonKindsForEvaluationRead(read),
        null,
      );
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
      summaryWithEvaluationPressure(
        'AttributePattern.create(...) pattern source did not close to an array.',
        result.openSeams,
        result.abruptCompletion,
      ),
      openSeamReasonKindsForEvaluationRead(result),
      null,
    );
  }

  const entries = readAttributePatternArray(value, expression);
  return attributePatternEntriesFieldRead(entries, expression, result.openSeams, result.abruptCompletion);
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
  const patternRead = readStaticValueProperty(value, 'pattern', sourceExpression);
  const symbolsRead = readStaticValueProperty(value, 'symbols', sourceExpression);
  const patternValue = closedStaticValueMemberValue(patternRead);
  const symbolsValue = closedStaticValueMemberValue(symbolsRead);
  if (patternValue == null || symbolsValue == null) {
    return null;
  }
  const pattern = readStaticStringValue(patternValue);
  const symbols = readStaticStringValue(symbolsValue);
  if (pattern == null || symbols == null) {
    return null;
  }
  const patternProperty = readStaticOwnProperty(value, 'pattern');
  return new AttributePatternObservation(
    pattern,
    symbols,
    authoredStringLiteralNode(
      patternValue,
      patternValue.node,
      patternProperty?.node ?? sourceExpression,
    ) ?? patternProperty?.node ?? sourceExpression,
  );
}

function attributePatternEntriesFieldRead(
  entries: AttributePatternEntriesRead,
  expression: ts.Expression,
  openSeams: readonly EvaluationOpenSeam[],
  abruptCompletion: EvaluationAbruptCompletion | null,
): ResourceFieldRead<readonly AttributePatternObservation[]> {
  return entries.open
    ? new ResourceFieldRead(
      entries.patterns,
      expression,
      summaryWithEvaluationPressure(
        'AttributePattern.create(...) pattern source has statically visible entries plus open entries.',
        openSeams,
        abruptCompletion,
      ),
      openSeamReasonKindsForEvaluationPressure(openSeams, abruptCompletion),
      null,
    )
    : resourceFieldReadWithEvaluationPressure(
        entries.patterns,
        expression,
        null,
        'AttributePattern.create(...) pattern source evaluation remained open.',
        { openSeams, abruptCompletion },
      );
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
      summaryWithEvaluationRead('Attribute pattern definition did not close to an object.', result),
      openSeamReasonKindsForEvaluationRead(result),
      null,
    );
  }
  const pattern = attributePatternObservationFromObject(value, expression);
  if (pattern == null) {
    return new ResourceFieldRead<AttributePatternObservation>(
      null,
      expression,
      summaryWithEvaluationRead(
        'Attribute pattern definition did not close to static pattern and symbols fields.',
        result,
      ),
      openSeamReasonKindsForEvaluationRead(result),
      null,
    );
  }
  return resourceFieldReadWithEvaluationPressure(
    pattern,
    expression,
    null,
    'Attribute pattern definition evaluation remained open.',
    result,
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

function summaryWithEvaluationRead(
  summary: string,
  read: {
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly abruptCompletion: EvaluationAbruptCompletion | null;
  },
): string {
  return summaryWithEvaluationPressure(summary, read.openSeams, read.abruptCompletion);
}

function resourceFieldReadWithEvaluationPressure<TValue>(
  value: TValue,
  node: ts.Node | null,
  valueNode: ts.Node | null,
  summary: string,
  read: {
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly abruptCompletion: EvaluationAbruptCompletion | null;
  },
): ResourceFieldRead<TValue> {
  const reasonKinds = openSeamReasonKindsForEvaluationPressure(read.openSeams, read.abruptCompletion);
  return new ResourceFieldRead(
    value,
    node,
    reasonKinds.length === 0 ? null : summaryWithEvaluationRead(summary, read),
    reasonKinds,
    valueNode,
  );
}

function summaryWithEvaluationPressure(
  summary: string,
  openSeams: readonly EvaluationOpenSeam[],
  abruptCompletion: EvaluationAbruptCompletion | null,
): string {
  const details = [
    ...openSeams.map((seam) => seam.summary),
    ...(abruptCompletion == null ? [] : [evaluationAbruptCompletionSummary(abruptCompletion)]),
  ];
  if (details.length === 0) {
    return summary;
  }
  return `${summary} Evaluation opened: ${details.join(' ')}`;
}
