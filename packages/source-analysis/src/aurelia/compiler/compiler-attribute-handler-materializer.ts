import fs from 'node:fs';
import ts from 'typescript';

import type { AttributePatternDefinition } from '../resources/index.js';
import { SourceNodeRef, SourceSpan } from '../refs.js';
import {
  findNodeBySpan,
  guessScriptKind,
  readPropertyName,
  unwrapExpression,
} from '../analysis/ts-ast-helpers.js';
import {
  CompilerAttributeSyntax,
  CompilerAttributeSyntaxProvenance,
} from './compiler-attribute-syntax.js';

export const COMPILER_ATTRIBUTE_HANDLER_STATUS_KINDS = [
  'closed',
  'open',
] as const;

export type CompilerAttributeHandlerStatusKind =
  typeof COMPILER_ATTRIBUTE_HANDLER_STATUS_KINDS[number];

export class CompilerAttributeHandlerResult {
  constructor(
    readonly status: CompilerAttributeHandlerStatusKind,
    readonly syntax: CompilerAttributeSyntax | null,
    readonly handlerSource: SourceNodeRef | null = null,
    readonly returnSource: SourceNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

type HandlerEnvironmentValue =
  | string
  | readonly string[]
  | null;

type HandlerEnvironment = Map<string, HandlerEnvironmentValue>;

export class CompilerAttributeHandlerMaterializer {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  materialize(
    definition: AttributePatternDefinition,
    rawName: string,
    rawValue: string,
    parts: readonly string[],
  ): CompilerAttributeHandlerResult {
    const declaration = readTypeDeclaration(definition.type);
    if (declaration == null) {
      return new CompilerAttributeHandlerResult(
        'open',
        null,
        null,
        null,
        'Attribute pattern type did not provide a declaration node for handler recovery.',
      );
    }

    const sourceFile = this.readSourceFile(declaration.file.path);
    if (sourceFile == null) {
      return new CompilerAttributeHandlerResult(
        'open',
        null,
        declaration,
        null,
        'Attribute pattern handler file could not be parsed.',
      );
    }

    const typeNode = findNodeBySpan(sourceFile, declaration.span.start, declaration.span.end);
    if (
      typeNode == null
      || (!ts.isClassDeclaration(typeNode) && !ts.isClassExpression(typeNode))
    ) {
      return new CompilerAttributeHandlerResult(
        'open',
        null,
        declaration,
        null,
        'Attribute pattern type did not close to a class declaration for handler recovery.',
      );
    }

    const handler = typeNode.members.find((current): current is ts.MethodDeclaration =>
      ts.isMethodDeclaration(current)
      && current.name != null
      && readPropertyName(current.name) === definition.pattern,
    ) ?? null;

    if (handler == null) {
      return new CompilerAttributeHandlerResult(
        'open',
        null,
        declaration,
        null,
        `No handler method named ${definition.pattern ?? '(unknown pattern)'} was found on the pattern type.`,
      );
    }

    const handlerSource = toSourceNodeRef(
      definition,
      declaration.file,
      handler,
      'MethodDeclaration',
      'handler',
    );

    if (handler.body == null) {
      return new CompilerAttributeHandlerResult(
        'open',
        null,
        handlerSource,
        null,
        'Attribute pattern handler body is missing.',
      );
    }

    const environment: HandlerEnvironment = new Map<string, HandlerEnvironmentValue>([
      ['rawName', rawName],
      ['rawValue', rawValue],
      ['parts', parts],
    ]);

    const evaluation = evaluateStatements(
      handler.body.statements,
      environment,
      definition,
      declaration.file,
      handlerSource,
      this,
    );

    return evaluation;
  }

  private readSourceFile(
    filePath: string,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) ?? null;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const parsed = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(filePath),
      );
      this.parsedFiles.set(filePath, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(filePath, null);
      return null;
    }
  }
}

function evaluateStatements(
  statements: readonly ts.Statement[],
  environment: HandlerEnvironment,
  definition: AttributePatternDefinition,
  file: SourceNodeRef['file'],
  handlerSource: SourceNodeRef,
  materializer: CompilerAttributeHandlerMaterializer,
): CompilerAttributeHandlerResult {
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.initializer == null) {
          continue;
        }
        environment.set(
          declaration.name.text,
          evaluateValue(declaration.initializer, environment),
        );
      }
      continue;
    }

    if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
      const expression = statement.expression;
      if (
        expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isIdentifier(expression.left)
      ) {
        environment.set(
          expression.left.text,
          evaluateValue(expression.right, environment),
        );
      }
      continue;
    }

    if (ts.isIfStatement(statement)) {
      const condition = evaluateBoolean(statement.expression, environment);
      if (condition === true) {
        const branch = evaluateStatements(
          collectBranchStatements(statement.thenStatement),
          environment,
          definition,
          file,
          handlerSource,
          materializer,
        );
        if (branch.status === 'closed' || branch.note != null) {
          return branch;
        }
        continue;
      }
      if (condition === false && statement.elseStatement != null) {
        const branch = evaluateStatements(
          collectBranchStatements(statement.elseStatement),
          environment,
          definition,
          file,
          handlerSource,
          materializer,
        );
        if (branch.status === 'closed' || branch.note != null) {
          return branch;
        }
      }
      continue;
    }

    if (ts.isReturnStatement(statement)) {
      if (statement.expression == null) {
        return new CompilerAttributeHandlerResult(
          'open',
          null,
          handlerSource,
          toSourceNodeRef(definition, file, statement, 'ReturnStatement', 'return'),
          'Attribute pattern handler returned without an expression.',
        );
      }

      const evaluated = evaluateAttrSyntaxReturn(
        statement.expression,
        environment,
        definition,
        file,
        handlerSource,
      );
      if (evaluated != null) {
        return evaluated;
      }

      return new CompilerAttributeHandlerResult(
        'open',
        null,
        handlerSource,
        toSourceNodeRef(definition, file, statement, 'ReturnStatement', 'return'),
        'Attribute pattern handler return expression is outside the current bounded evaluator.',
      );
    }
  }

  return new CompilerAttributeHandlerResult(
    'open',
    null,
    handlerSource,
    null,
    'Attribute pattern handler did not close to a supported AttrSyntax return.',
  );
}

function collectBranchStatements(
  statement: ts.Statement,
): readonly ts.Statement[] {
  return ts.isBlock(statement)
    ? statement.statements
    : [statement];
}

function evaluateAttrSyntaxReturn(
  expression: ts.Expression,
  environment: HandlerEnvironment,
  definition: AttributePatternDefinition,
  file: SourceNodeRef['file'],
  handlerSource: SourceNodeRef,
): CompilerAttributeHandlerResult | null {
  const current = unwrapExpression(expression);
  if (!ts.isNewExpression(current) || !ts.isIdentifier(current.expression) || current.expression.text !== 'AttrSyntax') {
    return null;
  }

  const args = current.arguments ?? [];
  if (args.length < 4) {
    return new CompilerAttributeHandlerResult(
      'open',
      null,
      handlerSource,
      toSourceNodeRef(definition, file, current, 'NewExpression', 'return'),
      'AttrSyntax constructor call did not have enough arguments.',
    );
  }

  const rawName = evaluateString(args[0]!, environment);
  const rawValue = evaluateString(args[1]!, environment);
  const target = evaluateString(args[2]!, environment);
  const command = evaluateNullableString(args[3]!, environment);
  const parts = args[4] == null ? null : evaluateStringArray(args[4], environment);

  if (rawName == null || rawValue == null || target == null) {
    return new CompilerAttributeHandlerResult(
      'open',
      null,
      handlerSource,
      toSourceNodeRef(definition, file, current, 'NewExpression', 'return'),
      'AttrSyntax arguments did not close to concrete strings under the current bounded evaluator.',
    );
  }

  const returnSource = toSourceNodeRef(definition, file, current, 'NewExpression', 'return');
  const syntax = new CompilerAttributeSyntax(
    rawName,
    rawValue,
    target,
    command,
    parts,
    new CompilerAttributeSyntaxProvenance(
      'pattern-handler-return',
      definition,
      handlerSource,
      returnSource,
      'Closed from the attribute pattern handler return expression.',
    ),
    'Closed dynamically from the pattern handler body.',
  );

  return new CompilerAttributeHandlerResult(
    'closed',
    syntax,
    handlerSource,
    returnSource,
    'Closed dynamically from the attribute pattern handler body.',
  );
}

function evaluateValue(
  expression: ts.Expression,
  environment: HandlerEnvironment,
): HandlerEnvironmentValue {
  const string = evaluateString(expression, environment);
  if (string != null) {
    return string;
  }

  const nullableString = evaluateNullableString(expression, environment);
  if (nullableString === null) {
    return null;
  }

  const array = evaluateStringArray(expression, environment);
  if (array != null) {
    return array;
  }

  return null;
}

function evaluateString(
  expression: ts.Expression,
  environment: HandlerEnvironment,
): string | null {
  const current = unwrapExpression(expression);

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }

  if (ts.isIdentifier(current)) {
    const value = environment.get(current.text);
    return typeof value === 'string'
      ? value
      : null;
  }

  if (ts.isElementAccessExpression(current)) {
    const target = unwrapExpression(current.expression);
    const argument = current.argumentExpression == null
      ? null
      : unwrapExpression(current.argumentExpression);
    if (
      ts.isIdentifier(target)
      && target.text === 'parts'
      && argument != null
      && ts.isNumericLiteral(argument)
    ) {
      const parts = environment.get('parts');
      return Array.isArray(parts)
        ? (parts[Number(argument.text)] ?? null)
        : null;
    }
  }

  if (ts.isTemplateExpression(current)) {
    let result = current.head.text;
    for (const span of current.templateSpans) {
      const value = evaluateString(span.expression, environment);
      if (value == null) {
        return null;
      }
      result += value + span.literal.text;
    }
    return result;
  }

  return null;
}

function evaluateNullableString(
  expression: ts.Expression,
  environment: HandlerEnvironment,
): string | null {
  const current = unwrapExpression(expression);
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  return evaluateString(current, environment);
}

function evaluateStringArray(
  expression: ts.Expression,
  environment: HandlerEnvironment,
): readonly string[] | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    const value = environment.get(current.text);
    return Array.isArray(value)
      ? value
      : null;
  }

  if (ts.isArrayLiteralExpression(current)) {
    const result: string[] = [];
    for (const element of current.elements) {
      const value = evaluateString(element, environment);
      if (value == null) {
        return null;
      }
      result.push(value);
    }
    return result;
  }

  return null;
}

function evaluateBoolean(
  expression: ts.Expression,
  environment: HandlerEnvironment,
): boolean | null {
  const current = unwrapExpression(expression);
  if (!ts.isBinaryExpression(current)) {
    return null;
  }

  if (
    current.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    || current.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken
  ) {
    const left = evaluateNullableString(current.left, environment);
    const right = evaluateNullableString(current.right, environment);
    return left != null && right != null
      ? left === right
      : null;
  }

  return null;
}

function readTypeDeclaration(
  type: AttributePatternDefinition['type'],
): SourceNodeRef | null {
  return type.kind === 'symbol'
    ? type.declaration
    : type;
}

function toSourceNodeRef(
  definition: AttributePatternDefinition,
  file: SourceNodeRef['file'],
  node: ts.Node,
  nodeKind: string,
  suffix: string,
): SourceNodeRef {
  return new SourceNodeRef(
    `${definition.id}:${suffix}:${node.getStart()}-${node.end}`,
    file,
    nodeKind,
    new SourceSpan(node.getStart(), node.end),
  );
}
