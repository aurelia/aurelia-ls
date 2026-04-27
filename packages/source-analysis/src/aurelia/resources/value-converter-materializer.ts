import fs from 'node:fs';
import ts from 'typescript';
import { findNodeBySpan, guessScriptKind, hasStaticModifier, readPropertyName, readStringArrayValues, readStringLiteralValue, unwrapExpression } from '../analysis/ts-ast-helpers.js';
import type { SourceFileRef } from '../source-address.js';
import {
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
} from '../refs.js';
import type { ResourceDefinitionType } from './contracts.js';
import { ValueConverterDefinition } from './value-converter-definition.js';
import {
  ValueConverterBehavior,
  ValueConverterFieldProvenance,
  ValueConverterFieldWitness,
  ValueConverterIdentity,
  type ValueConverterSupportCarrierKind,
  type ValueConverterSupportFieldKind,
} from './value-converter-support.js';

export interface ValueConverterMaterializerState {
  readonly parsedFileCount: number;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: ValueConverterFieldWitness;
}

interface ValueConverterSurface {
  readonly identity: ValueConverterIdentity;
  readonly behavior: ValueConverterBehavior;
}

export class ValueConverterMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  materialize(
    definition: ValueConverterDefinition,
  ): ValueConverterDefinition {
    const declaration = this.readDeclaration(definition.type);
    if (declaration == null) {
      return definition;
    }

    const classCarrier = readClassCarrier(declaration.node);
    if (classCarrier == null) {
      return definition;
    }

    const surface = readValueConverterSurface(classCarrier, declaration.file, declaration.sourceFile);
    const identity = mergeIdentity(definition.identity, surface.identity);
    const behavior = mergeBehavior(definition.behavior, surface.behavior);
    return new ValueConverterDefinition(
      definition.id,
      definition.type,
      identity.key,
      identity.name,
      identity.aliases,
      identity,
      behavior,
    );
  }

  inspectState(): ValueConverterMaterializerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readDeclaration(
    type: ResourceDefinitionType,
  ): {
    readonly node: ts.Node;
    readonly file: SourceFileRef;
    readonly sourceFile: ts.SourceFile;
  } | null {
    if (type.kind === 'source-node') {
      const sourceFile = this.readSourceFile(type.file);
      if (sourceFile == null) {
        return null;
      }
      const node = findNodeBySpan(sourceFile, type.span.start, type.span.end);
      return node == null ? null : { node, file: type.file, sourceFile };
    }

    if (type.kind === 'symbol') {
      const declaration = type.declaration;
      const file = declaration?.file ?? type.file;
      if (declaration == null || file == null) {
        return null;
      }
      const sourceFile = this.readSourceFile(file);
      if (sourceFile == null) {
        return null;
      }
      const node = findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
      return node == null ? null : { node, file, sourceFile };
    }

    return null;
  }

  private readSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(file.path)) {
      return this.parsedFiles.get(file.path) ?? null;
    }

    try {
      const text = fs.readFileSync(file.path, 'utf8');
      const parsed = ts.createSourceFile(
        file.path,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(file.path),
      );
      this.parsedFiles.set(file.path, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(file.path, null);
      return null;
    }
  }
}

function readValueConverterSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ValueConverterSurface {
  const auDefinition = readStaticAuDefinition(declarationNode);
  const nameContributors = readIdentityContributors('name', declarationNode, auDefinition, file, sourceFile);
  const aliasesContributors = readIdentityContributors('aliases', declarationNode, auDefinition, file, sourceFile);
  const signalsContributor = readInstancePropertyContributor('signals', declarationNode, file, sourceFile);
  const withContextContributor = readInstancePropertyContributor('with-context', declarationNode, file, sourceFile);
  const toViewMethod = findInstanceMethod(declarationNode, 'toView');
  const fromViewMethod = findInstanceMethod(declarationNode, 'fromView');

  return {
    identity: new ValueConverterIdentity(
      readStringLiteralValue(selectExpression(nameContributors)),
      readMergedStringArrayValues(aliasesContributors),
      null,
      compactProvenances([
        buildFieldProvenance('name', nameContributors),
        buildFieldProvenance('aliases', aliasesContributors),
      ]),
      nameContributors.length === 0 && aliasesContributors.length === 0
        ? 'Value-converter identity stayed on the seeded definition because no declaration-side identity contributor closed.'
        : null,
    ),
    behavior: new ValueConverterBehavior(
      signalsContributor == null ? [] : readStringArrayValues(signalsContributor.expression),
      readBooleanValue(withContextContributor?.expression ?? null),
      toViewMethod == null ? null : toNodeRef(toViewMethod, file, sourceFile),
      fromViewMethod == null ? null : toNodeRef(fromViewMethod, file, sourceFile),
      compactProvenances([
        signalsContributor == null ? null : new ValueConverterFieldProvenance(
          'signals',
          'selected',
          signalsContributor.contribution,
          [signalsContributor.contribution],
        ),
        withContextContributor == null ? null : new ValueConverterFieldProvenance(
          'with-context',
          'selected',
          withContextContributor.contribution,
          [withContextContributor.contribution],
        ),
        toViewMethod == null ? null : buildMethodFieldProvenance('to-view', toViewMethod, file, sourceFile),
        fromViewMethod == null ? null : buildMethodFieldProvenance('from-view', fromViewMethod, file, sourceFile),
      ]),
      'Value-converter behavior surface over signals/withContext and toView/fromView declaration witnesses.',
    ),
  };
}

function readClassCarrier(
  declarationNode: ts.Node,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(declarationNode) || ts.isClassExpression(declarationNode)) {
    return declarationNode;
  }

  if (
    ts.isVariableDeclaration(declarationNode)
    && declarationNode.initializer != null
    && ts.isClassExpression(declarationNode.initializer)
  ) {
    return declarationNode.initializer;
  }

  return null;
}

function readStaticAuDefinition(
  declarationNode: ts.ClassLikeDeclarationBase,
): ts.ObjectLiteralExpression | null {
  const initializer = findStaticPropertyInitializer(declarationNode, '$au');
  return initializer != null && ts.isObjectLiteralExpression(initializer)
    ? initializer
    : null;
}

function findStaticPropertyInitializer(
  declarationNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.Expression | null {
  for (const member of declarationNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) === propertyName) {
      return member.initializer;
    }
  }
  return null;
}

function readIdentityContributors(
  field: 'name' | 'aliases',
  declarationNode: ts.ClassLikeDeclarationBase,
  staticAuDefinition: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  return [
    ...readDecoratorIdentityContributors(field, declarationNode, file, sourceFile),
    ...readStaticIdentityContributors(field, declarationNode, staticAuDefinition, file, sourceFile),
  ];
}

function readDecoratorIdentityContributors(
  field: 'name' | 'aliases',
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];
  const decorators = ts.canHaveDecorators(declarationNode)
    ? ts.getDecorators(declarationNode) ?? []
    : [];

  for (const decorator of decorators) {
    const expression = decorator.expression;
    const calleeText = readDecoratorCalleeText(expression);
    if (calleeText !== 'valueConverter') {
      continue;
    }

    const args = ts.isCallExpression(expression)
      ? expression.arguments
      : ts.factory.createNodeArray<ts.Expression>();
    const firstArg = args[0] ?? null;

    if (field === 'name' && firstArg != null && isStringLike(firstArg)) {
      contributors.push({
        expression: firstArg,
        contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
      });
      continue;
    }

    if (firstArg != null && ts.isObjectLiteralExpression(firstArg)) {
      const initializer = readObjectLiteralPropertyInitializer(firstArg, field);
      if (initializer != null) {
        contributors.push({
          expression: initializer,
          contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
        });
      }
    }
  }

  return contributors;
}

function readStaticIdentityContributors(
  field: 'name' | 'aliases',
  declarationNode: ts.ClassLikeDeclarationBase,
  staticAuDefinition: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];

  if (staticAuDefinition != null) {
    const initializer = readObjectLiteralPropertyInitializer(staticAuDefinition, field);
    if (initializer != null) {
      contributors.push({
        expression: initializer,
        contribution: createWitness(field, initializer, file, sourceFile, 'static-au-property')!,
      });
    }
  }

  if (field === 'aliases') {
    const initializer = findStaticPropertyInitializer(declarationNode, 'aliases');
    if (initializer != null) {
      contributors.push({
        expression: initializer,
        contribution: createWitness(field, initializer, file, sourceFile, 'static-own-property')!,
      });
    }
  }

  return contributors;
}

function readInstancePropertyContributor(
  field: 'signals' | 'with-context',
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): FieldContributor | null {
  const propertyName = field === 'with-context' ? 'withContext' : field;

  for (const member of declarationNode.members) {
    if (hasStaticModifier(member)) {
      continue;
    }

    if (ts.isPropertyDeclaration(member) && readPropertyName(member.name) === propertyName && member.initializer != null) {
      return {
        expression: member.initializer,
        contribution: createWitness(field, member, file, sourceFile, 'instance-property')!,
      };
    }

    if (ts.isGetAccessorDeclaration(member) && readPropertyName(member.name) === propertyName) {
      const expression = readReturnedExpression(member.body);
      if (expression != null) {
        return {
          expression,
          contribution: createWitness(field, member, file, sourceFile, 'instance-property')!,
        };
      }
    }
  }

  return null;
}

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (hasStaticModifier(member) || !ts.isMethodDeclaration(member)) {
      continue;
    }
    if (readPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
}

function mergeIdentity(
  existing: ValueConverterIdentity,
  surface: ValueConverterIdentity,
): ValueConverterIdentity {
  return new ValueConverterIdentity(
    surface.name ?? existing.name,
    mergeUniqueStrings(existing.aliases, surface.aliases),
    existing.key,
    mergeUniqueProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function mergeBehavior(
  existing: ValueConverterBehavior,
  surface: ValueConverterBehavior,
): ValueConverterBehavior {
  return new ValueConverterBehavior(
    surface.signals.length > 0 ? surface.signals : existing.signals,
    surface.withContext ?? existing.withContext,
    surface.toViewSource ?? existing.toViewSource,
    surface.fromViewSource ?? existing.fromViewSource,
    mergeUniqueProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function buildFieldProvenance(
  field: ValueConverterSupportFieldKind,
  contributors: readonly FieldContributor[],
): ValueConverterFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const mode = field === 'aliases' || field === 'signals' ? 'merged' : 'selected';
  return new ValueConverterFieldProvenance(
    field,
    mode,
    mode === 'selected' ? selectContributor(contributors)?.contribution ?? null : null,
    mergeUniqueWitnesses(contributors.map((current) => current.contribution)),
  );
}

function buildMethodFieldProvenance(
  field: 'to-view' | 'from-view',
  method: ts.MethodDeclaration,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ValueConverterFieldProvenance {
  const witness = createWitness(field, method, file, sourceFile, 'instance-method');
  return new ValueConverterFieldProvenance(
    field,
    'selected',
    witness,
    witness == null ? [] : [witness],
  );
}

function selectContributor(
  contributors: readonly FieldContributor[],
): FieldContributor | null {
  return [...contributors].sort((left, right) =>
    carrierPrecedence(left.contribution.carrier) - carrierPrecedence(right.contribution.carrier),
  )[0] ?? null;
}

function carrierPrecedence(
  carrier: ValueConverterSupportCarrierKind,
): number {
  switch (carrier) {
    case 'definition-object':
      return 0;
    case 'annotation-decorator':
      return 1;
    case 'static-au-property':
      return 2;
    case 'static-own-property':
      return 3;
    case 'instance-property':
      return 4;
    case 'instance-method':
      return 5;
    case 'default':
      return 6;
    case 'open':
      return 7;
  }
}

function selectExpression(
  contributors: readonly FieldContributor[],
): ts.Expression | null {
  return selectContributor(contributors)?.expression ?? null;
}

function compactProvenances(
  values: readonly (ValueConverterFieldProvenance | null)[],
): readonly ValueConverterFieldProvenance[] {
  return values.filter((value): value is ValueConverterFieldProvenance => value != null);
}

function mergeUniqueProvenances(
  ...values: readonly (readonly ValueConverterFieldProvenance[])[]
): readonly ValueConverterFieldProvenance[] {
  const byField = new Map<ValueConverterSupportFieldKind, ValueConverterFieldProvenance>();

  for (const list of values) {
    for (const value of list) {
      const existing = byField.get(value.field);
      if (existing == null) {
        byField.set(value.field, value);
        continue;
      }

      byField.set(
        value.field,
        new ValueConverterFieldProvenance(
          value.field,
          value.mode,
          value.selected ?? existing.selected,
          mergeUniqueWitnesses(existing.contributors, value.contributors),
          existing.note ?? value.note,
        ),
      );
    }
  }

  return [...byField.values()];
}

function mergeUniqueWitnesses(
  ...values: readonly (readonly ValueConverterFieldWitness[])[]
): readonly ValueConverterFieldWitness[] {
  const seen = new Set<string>();
  const merged: ValueConverterFieldWitness[] = [];

  for (const list of values) {
    for (const value of list) {
      const key = `${value.field}:${value.carrier}:${value.source?.id ?? '<none>'}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(value);
    }
  }

  return merged;
}

function mergeUniqueStrings(
  ...values: readonly (readonly string[])[]
): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of values) {
    for (const value of list) {
      if (value.length === 0 || seen.has(value)) {
        continue;
      }
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}

function readMergedStringArrayValues(
  contributors: readonly FieldContributor[],
): readonly string[] {
  const merged: string[] = [];
  for (const contributor of contributors) {
    for (const current of readStringArrayValues(contributor.expression)) {
      if (!merged.includes(current)) {
        merged.push(current);
      }
    }
  }
  return merged;
}

function readObjectLiteralPropertyInitializer(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function readDecoratorCalleeText(
  expression: ts.LeftHandSideExpression,
): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isCallExpression(expression)) {
    return readDecoratorCalleeText(expression.expression);
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const left = readDecoratorCalleeText(expression.expression);
    return left == null ? expression.name.text : `${left}.${expression.name.text}`;
  }

  return null;
}

function readReturnedExpression(
  body: ts.Block | undefined,
): ts.Expression | null {
  if (body == null) {
    return null;
  }

  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression != null) {
      return statement.expression;
    }
  }

  return null;
}

function readBooleanValue(
  expression: ts.Expression | null,
): boolean | null {
  const current = expression == null ? null : unwrapExpression(expression);
  return current != null && current.kind === ts.SyntaxKind.TrueKeyword
    ? true
    : current != null && current.kind === ts.SyntaxKind.FalseKeyword
      ? false
      : null;
}

function createWitness(
  field: ValueConverterSupportFieldKind,
  node: ts.Node | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  carrier: ValueConverterSupportCarrierKind,
): ValueConverterFieldWitness | null {
  if (node == null) {
    return null;
  }

  return new ValueConverterFieldWitness(
    field,
    carrier,
    toNodeRef(node, file, sourceFile),
  );
}

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile);
}

function isStringLike(
  expression: ts.Expression,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}
