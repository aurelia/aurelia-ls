import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  hasStaticModifier,
  readCallCalleeText,
  readPropertyName,
  readStringArrayValues,
  readStringLiteralValue,
  unwrapExpression,
} from '../analysis/index.js';
import {
  SourceNodeRef,
  SourceSpan,
  type SourceFileRef,
} from '../refs.js';
import { BindingCommandDefinition } from './binding-command-definition.js';
import {
  BindingCommandBuildBasis,
  BindingCommandFieldProvenance,
  BindingCommandFieldWitness,
  BindingCommandIdentity,
  BindingCommandInstructionEmission,
  BindingCommandValueHandling,
  type BindingCommandFieldProvenance as T_BindingCommandFieldProvenance,
  type BindingCommandSupportCarrierKind,
  type BindingCommandSupportFieldKind,
  type BindingCommandValueHandlingKind,
} from './binding-command-support.js';

export interface BindingCommandMaterializerState {
  readonly parsedFileCount: number;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly contribution: BindingCommandFieldWitness;
}

interface BindingCommandSurface {
  readonly identity: BindingCommandIdentity;
  readonly buildBasis: BindingCommandBuildBasis;
}

interface ResolvedReturnExpression {
  readonly expression: ts.Expression;
  readonly source: ts.Node;
}

export class BindingCommandMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  materialize(
    definition: BindingCommandDefinition,
  ): BindingCommandDefinition {
    const declaration = this.readDeclaration(definition.type);
    if (declaration == null) {
      return definition;
    }

    const classCarrier = readClassCarrier(declaration.node);
    if (classCarrier == null) {
      return definition;
    }

    const surface = readBindingCommandSurface(classCarrier, declaration.file, declaration.sourceFile, definition);
    const identity = mergeIdentity(definition.identity, surface.identity);
    const buildBasis = mergeBuildBasis(definition.buildBasis, surface.buildBasis);

    return new BindingCommandDefinition(
      definition.id,
      definition.type,
      identity.key,
      identity.name,
      identity.aliases,
      identity,
      buildBasis,
    );
  }

  inspectState(): BindingCommandMaterializerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private readDeclaration(
    type: import('./contracts.js').ResourceDefinitionType,
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

function readBindingCommandSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  seed: BindingCommandDefinition,
): BindingCommandSurface {
  // TODO: decorator-authored BindingCommand.define(...) initializer semantics
  // still need a richer declaration-side ingress than the current direct
  // decorator-argument read. This first pass intentionally prefers static `$au`
  // and build/getter surfaces we can close without executing decorators.
  const auDefinition = readStaticAuDefinition(declarationNode);
  const nameContributors = readIdentityContributors('name', declarationNode, auDefinition, file, sourceFile);
  const aliasesContributors = readIdentityContributors('aliases', declarationNode, auDefinition, file, sourceFile);
  const ignoreAttrContributors = readIgnoreAttrContributors(declarationNode, file, sourceFile);
  const buildMethod = findInstanceMethod(declarationNode, 'build');
  const buildMethodSource = buildMethod == null ? null : toNodeRef(buildMethod, file, sourceFile);
  const resolvedReturn = buildMethod == null ? null : resolveBuildReturn(buildMethod);
  const emission = readInstructionEmission(resolvedReturn, file, sourceFile);
  const valueHandling = readValueHandling(buildMethod, resolvedReturn, file, sourceFile);

  return {
    identity: new BindingCommandIdentity(
      readStringLiteralValue(selectExpression(nameContributors)) ?? seed.name,
      mergeUniqueStrings(
        seed.aliases,
        readMergedStringArrayValues(aliasesContributors),
      ),
      seed.key,
      compactProvenances([
        buildFieldProvenance('name', nameContributors),
        buildFieldProvenance('aliases', aliasesContributors),
      ]),
      nameContributors.length === 0 && aliasesContributors.length === 0
        ? 'Binding-command identity stayed on the seeded definition because no declaration-side identity contributor closed.'
        : null,
    ),
    buildBasis: new BindingCommandBuildBasis(
      readBooleanValue(selectExpression(ignoreAttrContributors)),
      buildMethodSource,
      emission,
      valueHandling,
      compactProvenances([
        buildFieldProvenance('ignore-attr', ignoreAttrContributors),
        buildMethod == null ? null : buildMethodProvenance(buildMethod, file, sourceFile),
        emission.source == null ? null : buildDerivedFieldProvenance('instruction-emission', emission.source, 'return-expression'),
        valueHandling.source == null ? null : buildDerivedFieldProvenance('value-handling', valueHandling.source, 'return-expression'),
      ]),
      buildMethod == null
        ? 'Binding-command build basis stayed open because no build(...) method was found on the class carrier.'
        : 'Binding-command build basis closed boundedly from ignoreAttr getter plus build(...) method analysis.',
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
    ...readStaticIdentityContributors(field, staticAuDefinition, file, sourceFile),
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
    if (calleeText !== 'bindingCommand') {
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
      const property = readObjectLiteralPropertyInitializer(firstArg, field);
      if (property != null) {
        contributors.push({
          expression: property,
          contribution: createWitness(field, decorator, file, sourceFile, 'annotation-decorator')!,
        });
      }
    }
  }

  return contributors;
}

function readStaticIdentityContributors(
  field: 'name' | 'aliases',
  staticAuDefinition: ts.ObjectLiteralExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  if (staticAuDefinition == null) {
    return [];
  }

  const initializer = readObjectLiteralPropertyInitializer(staticAuDefinition, field);
  if (initializer == null) {
    return [];
  }

  return [{
    expression: initializer,
    contribution: createWitness(field, initializer, file, sourceFile, 'static-au-property')!,
  }];
}

function readIgnoreAttrContributors(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): readonly FieldContributor[] {
  const contributors: FieldContributor[] = [];

  for (const member of declarationNode.members) {
    if (hasStaticModifier(member) || readClassElementName(member) !== 'ignoreAttr') {
      continue;
    }

    if (ts.isGetAccessorDeclaration(member)) {
      const expression = readReturnedExpression(member.body);
      if (expression != null) {
        contributors.push({
          expression,
          contribution: createWitness('ignore-attr', member, file, sourceFile, 'ignore-attr-getter')!,
        });
      }
      continue;
    }

    if (ts.isPropertyDeclaration(member) && member.initializer != null) {
      contributors.push({
        expression: member.initializer,
        contribution: createWitness('ignore-attr', member, file, sourceFile, 'ignore-attr-getter')!,
      });
    }
  }

  return contributors;
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

function resolveBuildReturn(
  method: ts.MethodDeclaration,
): ResolvedReturnExpression | null {
  const body = method.body;
  if (body == null) {
    return null;
  }

  const locals = new Map<string, ts.Expression>();
  let sawMultipleReturns = false;
  let resolved: ResolvedReturnExpression | null = null;

  for (const statement of body.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer != null) {
          locals.set(declaration.name.text, declaration.initializer);
        }
      }
      continue;
    }

    if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
      const binary = statement.expression;
      if (binary.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(binary.left)) {
        locals.set(binary.left.text, binary.right);
      }
      continue;
    }

    if (ts.isReturnStatement(statement) && statement.expression != null) {
      if (resolved != null) {
        sawMultipleReturns = true;
      }
      const expression = resolveExpression(statement.expression, locals) ?? statement.expression;
      resolved = { expression, source: expression };
    }
  }

  if (sawMultipleReturns) {
    return null;
  }

  return resolved;
}

function resolveExpression(
  expression: ts.Expression,
  locals: ReadonlyMap<string, ts.Expression>,
): ts.Expression | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return locals.get(current.text) ?? current;
  }
  return current;
}

function readInstructionEmission(
  resolvedReturn: ResolvedReturnExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): BindingCommandInstructionEmission {
  if (resolvedReturn == null) {
    return new BindingCommandInstructionEmission(
      'open',
      null,
      null,
      'Build return stayed open because the bounded resolver could not close one return expression.',
    );
  }

  const current = unwrapExpression(resolvedReturn.expression);
  if (ts.isObjectLiteralExpression(current)) {
    const typeInitializer = readObjectLiteralPropertyInitializer(current, 'type');
    return new BindingCommandInstructionEmission(
      'object-literal-return',
      readExpressionSeed(typeInitializer),
      toNodeRef(current, file, sourceFile),
      'Closed from object-literal instruction emission in build(...).',
    );
  }

  if (ts.isNewExpression(current)) {
    return new BindingCommandInstructionEmission(
      'constructor-call-return',
      readCallCalleeText(current.expression),
      toNodeRef(current, file, sourceFile),
      'Closed from instruction-constructor return in build(...).',
    );
  }

  return new BindingCommandInstructionEmission(
    'open',
    readExpressionSeed(current),
    toNodeRef(current, file, sourceFile),
    'Build return did not close to an object-literal or constructor-call instruction emission under the current bounded reader.',
  );
}

function readValueHandling(
  buildMethod: ts.MethodDeclaration | null,
  resolvedReturn: ResolvedReturnExpression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): BindingCommandValueHandling {
  if (buildMethod == null || resolvedReturn == null) {
    return new BindingCommandValueHandling(
      'open',
      null,
      null,
      null,
      null,
      'Value handling stayed open because build(...) or its return expression did not close.',
    );
  }

  const parseCall = findFirstParseCall(resolvedReturn.expression);
  if (parseCall != null) {
    return new BindingCommandValueHandling(
      'compile-parse',
      readExpressionSeed(parseCall.arguments[1] ?? null),
      readExpressionSeed(parseCall.arguments[0] ?? null),
      null,
      toNodeRef(parseCall, file, sourceFile),
      'Value handling closes through a compile-time parser call in build(...).',
    );
  }

  const customExpression = findCustomExpressionWrap(resolvedReturn.expression);
  if (customExpression != null) {
    return new BindingCommandValueHandling(
      'custom-expression-wrap',
      null,
      readExpressionSeed(customExpression.arguments?.[0] ?? null),
      readCallCalleeText(customExpression.expression),
      toNodeRef(customExpression, file, sourceFile),
      'Value handling closes through a custom wrapper expression in build(...).',
    );
  }

  const rawValueCarrier = findRawValueCarrier(resolvedReturn.expression);
  if (rawValueCarrier != null) {
    return new BindingCommandValueHandling(
      'raw-value-carry',
      null,
      readExpressionSeed(rawValueCarrier),
      null,
      toNodeRef(rawValueCarrier, file, sourceFile),
      'Value handling closes as raw text carried through build(...) without builtin parser use.',
    );
  }

  return new BindingCommandValueHandling(
    'not-applicable',
    null,
    null,
    null,
    toNodeRef(resolvedReturn.source, file, sourceFile),
    'No builtin parser call or raw-value carrier was recovered from build(...).',
  );
}

function findFirstParseCall(
  expression: ts.Expression,
): ts.CallExpression | null {
  let found: ts.CallExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found != null) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const calleeText = readCallCalleeText(node.expression);
      if (calleeText?.endsWith('.parse') === true || calleeText === 'parse') {
        found = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

function findCustomExpressionWrap(
  expression: ts.Expression,
): ts.NewExpression | null {
  let found: ts.NewExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found != null) {
      return;
    }
    if (ts.isNewExpression(node) && readCallCalleeText(node.expression) === 'CustomExpression') {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

function findRawValueCarrier(
  expression: ts.Expression,
): ts.Expression | null {
  let found: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (found != null) {
      return;
    }

    if (ts.isPropertyAccessExpression(node)) {
      const text = node.getText();
      if (text === 'info.attr.rawValue' || text === 'attr.rawValue') {
        found = node;
        return;
      }
    }

    if (ts.isIdentifier(node) && node.text === 'value') {
      found = node;
      return;
    }

    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

function mergeIdentity(
  existing: BindingCommandIdentity,
  surface: BindingCommandIdentity,
): BindingCommandIdentity {
  return new BindingCommandIdentity(
    surface.name ?? existing.name,
    mergeUniqueStrings(existing.aliases, surface.aliases),
    existing.key,
    mergeUniqueProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function mergeBuildBasis(
  existing: BindingCommandBuildBasis,
  surface: BindingCommandBuildBasis,
): BindingCommandBuildBasis {
  return new BindingCommandBuildBasis(
    surface.ignoreAttr ?? existing.ignoreAttr,
    surface.buildMethodSource ?? existing.buildMethodSource,
    surface.emission.shape === 'open' ? existing.emission : surface.emission,
    surface.valueHandling.kind === 'open' ? existing.valueHandling : surface.valueHandling,
    mergeUniqueProvenances(existing.provenance, surface.provenance),
    existing.note ?? surface.note,
  );
}

function buildMethodProvenance(
  method: ts.MethodDeclaration,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): BindingCommandFieldProvenance {
  const witness = createWitness('build-method', method, file, sourceFile, 'build-method');
  return new BindingCommandFieldProvenance(
    'build-method',
    'selected',
    witness,
    witness == null ? [] : [witness],
    'Closed from binding-command build(...) method presence.',
  );
}

function buildDerivedFieldProvenance(
  field: 'instruction-emission' | 'value-handling',
  source: SourceNodeRef,
  carrier: BindingCommandSupportCarrierKind,
): T_BindingCommandFieldProvenance {
  const witness = new BindingCommandFieldWitness(field, carrier, source);
  return new BindingCommandFieldProvenance(
    field,
    'selected',
    witness,
    [witness],
  );
}

function buildFieldProvenance(
  field: BindingCommandSupportFieldKind,
  contributors: readonly FieldContributor[],
): BindingCommandFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const mergedFields = field === 'aliases';
  const mode = mergedFields ? 'merged' : 'selected';

  return new BindingCommandFieldProvenance(
    field,
    mode,
    mode === 'selected' ? selectContributor(contributors)?.contribution ?? null : null,
    mergeUniqueWitnesses(contributors.map((current) => current.contribution)),
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
  carrier: BindingCommandSupportCarrierKind,
): number {
  switch (carrier) {
    case 'definition-object':
      return 0;
    case 'annotation-decorator':
      return 1;
    case 'static-au-property':
      return 2;
    case 'ignore-attr-getter':
      return 3;
    case 'build-method':
      return 4;
    case 'return-expression':
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
  values: readonly (BindingCommandFieldProvenance | null)[],
): readonly BindingCommandFieldProvenance[] {
  return values.filter((value): value is BindingCommandFieldProvenance => value != null);
}

function mergeUniqueProvenances(
  ...values: readonly (readonly BindingCommandFieldProvenance[])[]
): readonly BindingCommandFieldProvenance[] {
  const byField = new Map<BindingCommandSupportFieldKind, BindingCommandFieldProvenance>();

  for (const list of values) {
    for (const value of list) {
      const existing = byField.get(value.field);
      if (existing == null) {
        byField.set(value.field, value);
        continue;
      }

      byField.set(
        value.field,
        new BindingCommandFieldProvenance(
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
  ...values: readonly (readonly BindingCommandFieldWitness[])[]
): readonly BindingCommandFieldWitness[] {
  const seen = new Set<string>();
  const merged: BindingCommandFieldWitness[] = [];

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

function readClassElementName(
  member: ts.ClassElement,
): string | null {
  return ts.isPropertyDeclaration(member)
    || ts.isMethodDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
    || ts.isSetAccessorDeclaration(member)
    ? readPropertyName(member.name)
    : null;
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

function readExpressionSeed(
  expression: ts.Expression | null,
): string | null {
  if (expression == null) {
    return null;
  }

  const current = unwrapExpression(expression);
  return ts.isIdentifier(current)
    ? current.text
    : ts.isPropertyAccessExpression(current)
      ? current.getText()
      : ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)
        ? current.text
        : current.getText();
}

function createWitness(
  field: BindingCommandSupportFieldKind,
  node: ts.Node | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  carrier: BindingCommandSupportCarrierKind,
): BindingCommandFieldWitness | null {
  if (node == null) {
    return null;
  }

  return new BindingCommandFieldWitness(
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
  return new SourceNodeRef(
    `${file.id}:${node.getStart(sourceFile)}:${node.end}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Unknown',
    new SourceSpan(node.getStart(sourceFile), node.end),
  );
}

function isStringLike(
  expression: ts.Expression,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}
