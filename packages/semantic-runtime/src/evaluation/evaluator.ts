import ts from 'typescript';
import {
  BreakEvaluationCompletion,
  ContinueEvaluationCompletion,
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  OpenEvaluationCompletion,
  ReturnEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationCompletion,
} from './completion.js';
import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from './environment.js';
import { EvaluationOpenSeam, EvaluationOpenSeamKind } from './seams.js';
import {
  DefaultStaticEvaluationPolicy,
  StaticEvaluationExpressionStatementDisposition,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBigIntValue,
  EvaluationBooleanValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';

const DEFAULT_MAX_EXPRESSION_DEPTH = 80;
const DEFAULT_MAX_STATEMENTS = 5000;
const DEFAULT_MAX_LOOP_ITERATIONS = 200;

/** Linked import values keyed by local import binding name before module-body evaluation. */
export type StaticEvaluationImportValues = ReadonlyMap<string, EvaluationValue>;

/** Result of evaluating one source module. */
export class StaticModuleEvaluationResult {
  constructor(
    /** Module key whose source file was evaluated. */
    readonly moduleKey: string,
    /** Environment record after the evaluator's module-body pass. */
    readonly environment: ModuleEnvironmentRecord,
    /** Final module-body completion. */
    readonly completion: EvaluationCompletion,
    /** Explicit open seams produced while evaluating this module. */
    readonly openSeams: readonly EvaluationOpenSeam[],
  ) {}
}

/** Result of evaluating one expression against an existing module environment. */
export class StaticExpressionEvaluationResult {
  constructor(
    /** Value produced by the expression evaluator. */
    readonly value: EvaluationValue,
    /** Open seams observed during this expression read. */
    readonly openSeams: readonly EvaluationOpenSeam[],
  ) {}
}

/** ECMAScript-shaped evaluator for module-level analysis. */
export class StaticEvaluator {
  private readonly openSeams: EvaluationOpenSeam[] = [];
  private statementCount = 0;

  constructor(
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
  ) {}

  /** Evaluate one TypeScript source file as an ECMAScript module body. */
  evaluateSourceFile(
    sourceFile: ts.SourceFile,
    moduleKey: string = sourceFile.fileName,
    imports: StaticEvaluationImportValues = new Map<string, EvaluationValue>(),
  ): StaticModuleEvaluationResult {
    this.openSeams.length = 0;
    this.statementCount = 0;
    const environment = new ModuleEnvironmentRecord(moduleKey);
    this.instantiateModule(sourceFile, environment, moduleKey, imports);

    let completion: EvaluationCompletion = new NormalEvaluationCompletion();
    for (const statement of sourceFile.statements) {
      completion = this.evaluateStatement(statement, environment, moduleKey, 0);
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        break;
      }
    }

    return new StaticModuleEvaluationResult(moduleKey, environment, completion, [...this.openSeams]);
  }

  /** Evaluate one expression with a supplied environment record. */
  evaluateExpressionInEnvironment(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): StaticExpressionEvaluationResult {
    const openStart = this.openSeams.length;
    const value = this.evaluateExpression(expression, environment, moduleKey, 0);
    return new StaticExpressionEvaluationResult(value, this.openSeams.slice(openStart));
  }

  private instantiateModule(
    sourceFile: ts.SourceFile,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
  ): void {
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        this.instantiateImportDeclaration(statement, environment, moduleKey, imports);
        continue;
      }
      if (ts.isFunctionDeclaration(statement)) {
        const localName = statement.name?.text
          ?? (hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
        if (localName == null) {
          continue;
        }
        environment.initializeBinding(
          localName,
          new EvaluationFunctionValue(statement, environment, statement),
          EvaluationBindingKind.Function,
          false,
          statement,
        );
        continue;
      }
      if (ts.isClassDeclaration(statement)) {
        const localName = statement.name?.text
          ?? (hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
        if (localName == null) {
          continue;
        }
        environment.initializeBinding(
          localName,
          new EvaluationClassValue(statement, environment, statement),
          EvaluationBindingKind.Class,
          false,
          statement,
        );
      }
    }
  }

  private instantiateImportDeclaration(
    statement: ts.ImportDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
  ): void {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      this.open(EvaluationOpenSeamKind.DynamicImport, 'Import declaration did not close to a string module specifier.', statement.moduleSpecifier, moduleKey);
      return;
    }
    const clause = statement.importClause;
    if (clause == null) {
      return;
    }
    if (clause.name != null) {
      const imported = imports.get(clause.name.text);
      environment.initializeBinding(
        clause.name.text,
        imported ?? new EvaluationUnknownValue('Default import binding is not linked to its source module in this evaluator pass.', clause.name),
        EvaluationBindingKind.Import,
        false,
        clause.name,
      );
    }
    if (clause.namedBindings == null) {
      return;
    }
    if (ts.isNamespaceImport(clause.namedBindings)) {
      const imported = imports.get(clause.namedBindings.name.text);
      environment.initializeBinding(
        clause.namedBindings.name.text,
        imported ?? new EvaluationUnknownValue('Namespace import binding is not linked to its source module in this evaluator pass.', clause.namedBindings.name),
        EvaluationBindingKind.Import,
        false,
        clause.namedBindings.name,
      );
      return;
    }
    for (const element of clause.namedBindings.elements) {
      const imported = imports.get(element.name.text);
      environment.initializeBinding(
        element.name.text,
        imported ?? new EvaluationUnknownValue('Named import binding is not linked to its source module in this evaluator pass.', element.name),
        EvaluationBindingKind.Import,
        false,
        element,
      );
    }
  }

  private evaluateStatement(
    statement: ts.Statement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (this.exceededStatementCount(statement, moduleKey)) {
      return new OpenEvaluationCompletion('Statement count limit reached.');
    }

    switch (statement.kind) {
      case ts.SyntaxKind.VariableStatement:
        return this.evaluateVariableStatement(statement as ts.VariableStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ExpressionStatement:
        return this.evaluateExpressionStatement(statement as ts.ExpressionStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.Block:
        return this.evaluateBlock(statement as ts.Block, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.EmptyStatement:
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.ImportEqualsDeclaration:
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.ExportAssignment:
        return this.evaluateExportAssignment(statement as ts.ExportAssignment, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.EnumDeclaration:
        return this.evaluateEnumDeclaration(statement as ts.EnumDeclaration, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ModuleDeclaration:
        return this.unsupportedStatement(statement, moduleKey, 'Module declarations are not evaluated as runtime namespaces in this slice.');
      case ts.SyntaxKind.IfStatement:
        return this.evaluateIfStatement(statement as ts.IfStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
        return this.unsupportedStatement(statement, moduleKey, 'Loop statement is not reduced unless it is a for-of over a known array.');
      case ts.SyntaxKind.ForOfStatement:
        return this.evaluateForOfStatement(statement as ts.ForOfStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ContinueStatement:
        return new ContinueEvaluationCompletion((statement as ts.ContinueStatement).label?.text ?? null);
      case ts.SyntaxKind.BreakStatement:
        return new BreakEvaluationCompletion((statement as ts.BreakStatement).label?.text ?? null);
      case ts.SyntaxKind.ReturnStatement:
        return this.evaluateReturnStatement(statement as ts.ReturnStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.WithStatement:
        return this.unsupportedStatement(statement, moduleKey, '`with` changes lexical lookup dynamically.');
      case ts.SyntaxKind.SwitchStatement:
        return this.unsupportedStatement(statement, moduleKey, 'Switch control flow is not joined by this evaluator slice.');
      case ts.SyntaxKind.LabeledStatement:
        return this.evaluateStatement((statement as ts.LabeledStatement).statement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ThrowStatement:
        return new ThrowEvaluationCompletion(
          (statement as ts.ThrowStatement).expression == null
            ? EvaluationUndefined
            : this.evaluateExpression((statement as ts.ThrowStatement).expression, environment, moduleKey, depth + 1),
        );
      case ts.SyntaxKind.TryStatement:
        return this.unsupportedStatement(statement, moduleKey, 'Try/catch/finally control flow is not joined by this evaluator slice.');
      case ts.SyntaxKind.DebuggerStatement:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.NotEmittedStatement:
        return new NormalEvaluationCompletion();
      default:
        return this.unsupportedStatement(statement, moduleKey, `Statement kind ${this.syntaxKindName(statement)} is not in the evaluator statement set.`);
    }
  }

  private evaluateBlock(
    block: ts.Block,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    for (const statement of block.statements) {
      const completion = this.evaluateStatement(statement, environment, moduleKey, depth + 1);
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateVariableStatement(
    statement: ts.VariableStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const declarationKind = declarationListBindingKind(statement.declarationList);
    const mutable = declarationKind !== EvaluationBindingKind.Const;
    for (const declaration of statement.declarationList.declarations) {
      this.evaluateVariableDeclaration(declaration, declarationKind, mutable, environment, moduleKey, depth + 1);
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateVariableDeclaration(
    declaration: ts.VariableDeclaration,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    const value = declaration.initializer == null
      ? new EvaluationUndefinedValue(declaration)
      : this.evaluateExpression(declaration.initializer, environment, moduleKey, depth + 1);

    if (ts.isIdentifier(declaration.name)) {
      environment.initializeBinding(declaration.name.text, value, bindingKind, mutable, declaration);
      return;
    }

    this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'Binding pattern declarations are not materialized into environment cells yet.', declaration.name, moduleKey);
  }

  private evaluateExpressionStatement(
    statement: ts.ExpressionStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (
      this.policy.dispositionForExpressionStatement(statement.expression, environment, moduleKey)
      === StaticEvaluationExpressionStatementDisposition.ExternallyOwned
    ) {
      return new NormalEvaluationCompletion();
    }
    return new NormalEvaluationCompletion(this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1));
  }

  private evaluateEnumDeclaration(
    declaration: ts.EnumDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const properties = new Map<string, EvaluationObjectProperty>();
    let nextNumber = 0;
    for (const member of declaration.members) {
      const name = this.readPropertyName(member.name, environment, moduleKey, depth + 1);
      if (name == null) {
        this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Enum member name did not close to a string key.', member.name, moduleKey);
        continue;
      }
      const value = member.initializer == null
        ? new EvaluationNumberValue(nextNumber, member)
        : this.evaluateExpression(member.initializer, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.Number) {
        nextNumber = value.value + 1;
      }
      properties.set(name, new EvaluationObjectProperty(name, value, member));
    }
    environment.initializeBinding(
      declaration.name.text,
      new EvaluationObjectValue(properties, false, declaration),
      EvaluationBindingKind.Const,
      false,
      declaration,
    );
    return new NormalEvaluationCompletion();
  }

  private evaluateIfStatement(
    statement: ts.IfStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const condition = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (condition.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(condition, statement.expression, moduleKey, 'If statement depended on an open condition.', EvaluationOpenSeamKind.DynamicBranch);
      return new NormalEvaluationCompletion();
    }
    const truthy = readEvaluationTruthiness(condition);
    if (truthy == null) {
      this.open(EvaluationOpenSeamKind.DynamicBranch, 'If statement condition did not reduce to known truthiness.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    return truthy
      ? this.evaluateStatementLike(statement.thenStatement, environment, moduleKey, depth + 1)
      : statement.elseStatement == null
        ? new NormalEvaluationCompletion()
        : this.evaluateStatementLike(statement.elseStatement, environment, moduleKey, depth + 1);
  }

  private evaluateForOfStatement(
    statement: ts.ForOfStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const iterable = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (iterable.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(iterable, statement.expression, moduleKey, 'For-of statement depended on an open iterable.', EvaluationOpenSeamKind.DynamicLoop);
      return new NormalEvaluationCompletion();
    }
    if (iterable.kind !== EvaluationValueKind.Array) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable did not reduce to a known array value.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    if (iterable.elements.length > DEFAULT_MAX_LOOP_ITERATIONS || iterable.mayHaveUnknownElements) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable has unknown or excessive iteration shape.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }

    for (const element of iterable.elements) {
      this.bindForOfInitializer(statement.initializer, element.value, environment, moduleKey);
      const completion = this.evaluateStatementLike(statement.statement, environment, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Continue) {
        continue;
      }
      if (completion.kind === EvaluationCompletionKind.Break) {
        return new NormalEvaluationCompletion();
      }
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
    }
    return new NormalEvaluationCompletion();
  }

  private bindForOfInitializer(
    initializer: ts.ForInitializer,
    value: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): void {
    if (ts.isVariableDeclarationList(initializer)) {
      const declaration = initializer.declarations[0];
      if (declaration != null && ts.isIdentifier(declaration.name)) {
        environment.initializeBinding(
          declaration.name.text,
          value,
          declarationListBindingKind(initializer),
          declarationListBindingKind(initializer) !== EvaluationBindingKind.Const,
          declaration,
        );
        return;
      }
    }
    if (ts.isIdentifier(initializer)) {
      if (!environment.setBinding(initializer.text, value)) {
        environment.initializeBinding(initializer.text, value, EvaluationBindingKind.Let, true, initializer);
      }
      return;
    }
    this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'For-of initializer is not an identifier binding.', initializer, moduleKey);
  }

  private evaluateReturnStatement(
    statement: ts.ReturnStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    return new ReturnEvaluationCompletion(
      statement.expression == null
        ? EvaluationUndefined
        : this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1),
    );
  }

  private evaluateExportAssignment(
    statement: ts.ExportAssignment,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (statement.isExportEquals === true) {
      return this.unsupportedStatement(statement, moduleKey, 'TypeScript export assignment is CommonJS-shaped and is not treated as an ES default export.');
    }
    environment.initializeBinding(
      'default',
      this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1),
      EvaluationBindingKind.Const,
      false,
      statement,
    );
    return new NormalEvaluationCompletion();
  }

  private evaluateStatementLike(
    statement: ts.Statement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    return ts.isBlock(statement)
      ? this.evaluateBlock(statement, environment, moduleKey, depth + 1)
      : this.evaluateStatement(statement, environment, moduleKey, depth + 1);
  }

  private evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (depth > DEFAULT_MAX_EXPRESSION_DEPTH) {
      return this.unknown('Expression depth limit reached.', expression, moduleKey, EvaluationOpenSeamKind.DepthLimit);
    }

    const current = skipStaticOuterExpression(expression);
    switch (current.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return new EvaluationStringValue((current as ts.StringLiteralLike).text, current);
      case ts.SyntaxKind.NumericLiteral:
        return new EvaluationNumberValue(Number((current as ts.NumericLiteral).text), current);
      case ts.SyntaxKind.BigIntLiteral:
        return new EvaluationBigIntValue((current as ts.BigIntLiteral).text, current);
      case ts.SyntaxKind.TrueKeyword:
        return new EvaluationBooleanValue(true, current);
      case ts.SyntaxKind.FalseKeyword:
        return new EvaluationBooleanValue(false, current);
      case ts.SyntaxKind.NullKeyword:
        return new EvaluationNullValue(current);
      case ts.SyntaxKind.Identifier:
        return this.evaluateIdentifier(current as ts.Identifier, environment, moduleKey);
      case ts.SyntaxKind.ArrayLiteralExpression:
        return this.evaluateArrayLiteral(current as ts.ArrayLiteralExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return this.evaluateObjectLiteral(current as ts.ObjectLiteralExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PropertyAccessExpression:
        return this.evaluatePropertyAccess(current as ts.PropertyAccessExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ElementAccessExpression:
        return this.evaluateElementAccess(current as ts.ElementAccessExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.CallExpression:
        return this.evaluateCallExpression(current as ts.CallExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.NewExpression:
        return this.unknown('New expressions are not executed by static evaluation.', current, moduleKey, EvaluationOpenSeamKind.DynamicCall);
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        return new EvaluationFunctionValue(current as ts.FunctionLikeDeclaration, environment.clone(`${moduleKey}:closure`), current);
      case ts.SyntaxKind.ClassExpression:
        return new EvaluationClassValue(current as ts.ClassExpression, environment.clone(`${moduleKey}:class`), current);
      case ts.SyntaxKind.TemplateExpression:
        return this.evaluateTemplateExpression(current as ts.TemplateExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.BinaryExpression:
        return this.evaluateBinaryExpression(current as ts.BinaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PrefixUnaryExpression:
        return this.evaluatePrefixUnaryExpression(current as ts.PrefixUnaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ConditionalExpression:
        return this.evaluateConditionalExpression(current as ts.ConditionalExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.SpreadElement:
        return this.evaluateExpression((current as ts.SpreadElement).expression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.AwaitExpression:
      case ts.SyntaxKind.YieldExpression:
        return this.unknown('Async and generator evaluation are outside this substrate.', current, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      default:
        return this.unknown(`Expression kind ${this.syntaxKindName(current)} is not in the evaluator expression set.`, current, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
    }
  }

  private evaluateIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue {
    if (identifier.text === 'undefined') {
      return new EvaluationUndefinedValue(identifier);
    }
    const value = environment.readValue(identifier.text);
    if (value == null) {
      return this.unknown(`Identifier '${identifier.text}' is not available in the current environment.`, identifier, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (value.kind === EvaluationValueKind.Unknown && !value.hasOpenSeam) {
      return this.materializeUnknownUse(value, identifier, moduleKey, `Identifier '${identifier.text}' is open in the current environment.`, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    return value;
  }

  private evaluateArrayLiteral(
    literal: ts.ArrayLiteralExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const elements: EvaluationArrayElement[] = [];
    let mayHaveUnknownElements = false;
    for (const element of literal.elements) {
      if (ts.isOmittedExpression(element)) {
        mayHaveUnknownElements = true;
        continue;
      }
      if (ts.isSpreadElement(element)) {
        const spread = this.evaluateExpression(element.expression, environment, moduleKey, depth + 1);
        if (spread.kind === EvaluationValueKind.Array) {
          elements.push(...spread.elements);
          mayHaveUnknownElements ||= spread.mayHaveUnknownElements;
          continue;
        }
        mayHaveUnknownElements = true;
        this.open(EvaluationOpenSeamKind.DynamicMutation, 'Array spread did not reduce to a known array.', element, moduleKey);
        continue;
      }
      elements.push(new EvaluationArrayElement(this.evaluateExpression(element, environment, moduleKey, depth + 1), element));
    }
    return new EvaluationArrayValue(elements, mayHaveUnknownElements, literal);
  }

  private evaluateObjectLiteral(
    literal: ts.ObjectLiteralExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const properties = new Map<string, EvaluationObjectProperty>();
    let mayHaveUnknownProperties = false;
    for (const property of literal.properties) {
      if (ts.isPropertyAssignment(property)) {
        const name = this.readPropertyName(property.name, environment, moduleKey, depth + 1);
        if (name == null) {
          mayHaveUnknownProperties = true;
          this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Object property key did not reduce to a string key.', property.name, moduleKey);
          continue;
        }
        properties.set(name, new EvaluationObjectProperty(
          name,
          this.evaluateExpression(property.initializer, environment, moduleKey, depth + 1),
          property,
        ));
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        properties.set(property.name.text, new EvaluationObjectProperty(
          property.name.text,
          environment.readValue(property.name.text)
            ?? this.unknown(`Shorthand property '${property.name.text}' did not resolve to a binding.`, property.name, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier),
          property,
        ));
        continue;
      }
      if (ts.isSpreadAssignment(property)) {
        const spread = this.evaluateExpression(property.expression, environment, moduleKey, depth + 1);
        if (spread.kind === EvaluationValueKind.Object) {
          for (const [name, entry] of spread.properties) {
            properties.set(name, entry);
          }
          mayHaveUnknownProperties ||= spread.mayHaveUnknownProperties;
          continue;
        }
        mayHaveUnknownProperties = true;
        this.open(EvaluationOpenSeamKind.DynamicMutation, 'Object spread did not reduce to a known object.', property, moduleKey);
        continue;
      }
      if (ts.isMethodDeclaration(property)) {
        const name = this.readPropertyName(property.name, environment, moduleKey, depth + 1);
        if (name == null) {
          mayHaveUnknownProperties = true;
          this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Object method key did not reduce to a string key.', property.name, moduleKey);
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
      this.open(EvaluationOpenSeamKind.UnsupportedExpression, `Object literal member ${this.syntaxKindName(property)} is not evaluated.`, property, moduleKey);
    }
    return new EvaluationObjectValue(properties, mayHaveUnknownProperties, literal);
  }

  private evaluatePropertyAccess(
    expression: ts.PropertyAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (receiver.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(receiver, expression, moduleKey, `Property access '${expression.name.text}' depended on an open receiver.`, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (receiver.kind === EvaluationValueKind.Object) {
      return receiver.properties.get(expression.name.text)?.value
        ?? this.unknown(`Object property '${expression.name.text}' was not known.`, expression.name, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (receiver.kind === EvaluationValueKind.Array && expression.name.text === 'length') {
      return new EvaluationNumberValue(receiver.elements.length, expression);
    }
    if (receiver.kind === EvaluationValueKind.String && expression.name.text === 'length') {
      return new EvaluationNumberValue(receiver.value.length, expression);
    }
    return this.unknown(`Property access '${expression.name.text}' did not close over a known receiver.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }

  private evaluateElementAccess(
    expression: ts.ElementAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    const argument = expression.argumentExpression == null
      ? null
      : this.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
    if (receiver.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(receiver, expression, moduleKey, 'Element access depended on an open receiver.', EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (argument?.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(argument, expression, moduleKey, 'Element access depended on an open key.', EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (argument == null) {
      return this.unknown('Element access had no argument expression.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
    }
    if (receiver.kind === EvaluationValueKind.Array && argument.kind === EvaluationValueKind.Number) {
      return receiver.elements.at(argument.value)?.value
        ?? this.unknown(`Array index ${argument.value} is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (receiver.kind === EvaluationValueKind.Object && (argument.kind === EvaluationValueKind.String || argument.kind === EvaluationValueKind.Number)) {
      const name = String(argument.value);
      return receiver.properties.get(name)?.value
        ?? this.unknown(`Object property '${name}' is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    return this.unknown('Element access did not close over a known receiver and key.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }

  private evaluateCallExpression(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const intrinsic = this.evaluateKnownIntrinsic(call, environment, moduleKey, depth + 1);
    if (intrinsic != null) {
      return intrinsic;
    }

    const callee = this.evaluateExpression(call.expression, environment, moduleKey, depth + 1);
    if (callee.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(callee, call, moduleKey, 'Call expression depended on an open callee.', EvaluationOpenSeamKind.DynamicCall);
    }
    if (callee.kind === EvaluationValueKind.Function) {
      return this.evaluateFunctionCall(callee, call, environment, moduleKey, depth + 1);
    }
    return this.unknown('Call expression is not a known intrinsic or simple local function.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateKnownIntrinsic(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue | null {
    const calleeText = readCalleeText(call.expression);
    if (calleeText === 'Object.freeze' && call.arguments[0] != null) {
      return this.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
    }
    if (calleeText === 'Object.assign') {
      return this.evaluateObjectAssign(call, environment, moduleKey, depth + 1);
    }
    if (calleeText === 'Array.of') {
      return new EvaluationArrayValue(
        call.arguments.map((argument) => new EvaluationArrayElement(
          this.evaluateExpression(argument, environment, moduleKey, depth + 1),
          argument,
        )),
        false,
        call,
      );
    }
    return null;
  }

  private evaluateObjectAssign(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const properties = new Map<string, EvaluationObjectProperty>();
    let mayHaveUnknownProperties = false;
    for (const argument of call.arguments) {
      const value = this.evaluateExpression(argument, environment, moduleKey, depth + 1);
      if (value.kind !== EvaluationValueKind.Object) {
        mayHaveUnknownProperties = true;
        this.open(EvaluationOpenSeamKind.DynamicMutation, 'Object.assign argument did not reduce to a known object.', argument, moduleKey);
        continue;
      }
      for (const [name, property] of value.properties) {
        properties.set(name, property);
      }
      mayHaveUnknownProperties ||= value.mayHaveUnknownProperties;
    }
    return new EvaluationObjectValue(properties, mayHaveUnknownProperties, call);
  }

  private evaluateFunctionCall(
    callee: EvaluationFunctionValue,
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (callee.declaration.asteriskToken != null || callee.declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true) {
      return this.unknown('Async and generator functions are not evaluated.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }

    const callEnvironment = callee.environment.clone(`${moduleKey}:call:${call.getStart()}`) as ModuleEnvironmentRecord;
    for (let index = 0; index < callee.declaration.parameters.length; index++) {
      const parameter = callee.declaration.parameters[index];
      if (parameter == null || !ts.isIdentifier(parameter.name)) {
        return this.unknown('Function call parameter binding is not an identifier.', call, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
      }
      const argument = call.arguments[index];
      const value = argument == null
        ? EvaluationUndefined
        : this.evaluateExpression(argument, environment, moduleKey, depth + 1);
      callEnvironment.initializeBinding(parameter.name.text, value, EvaluationBindingKind.Parameter, true, parameter);
    }

    const body = callee.declaration.body;
    if (body == null) {
      return this.unknown('Function body is not available to static evaluation.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    if (ts.isExpression(body)) {
      return this.evaluateExpression(body, callEnvironment, moduleKey, depth + 1);
    }

    const completion = this.evaluateBlock(body, callEnvironment, moduleKey, depth + 1);
    if (completion.kind === EvaluationCompletionKind.Return) {
      return completion.value;
    }
    if (completion.kind === EvaluationCompletionKind.Normal) {
      return EvaluationUndefined;
    }
    return this.unknown('Function body did not complete with a static return value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateTemplateExpression(
    expression: ts.TemplateExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    let text = expression.head.text;
    for (const span of expression.templateSpans) {
      const value = this.evaluateExpression(span.expression, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(value, span.expression, moduleKey, 'Template expression span depended on an open value.', EvaluationOpenSeamKind.UnsupportedExpression);
      }
      if (!isEvaluationPrimitiveValue(value)) {
        return this.unknown('Template expression span did not reduce to a primitive value.', span.expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      }
      const primitive = readEvaluationPrimitive(value);
      text += String(primitive) + span.literal.text;
    }
    return new EvaluationStringValue(text, expression);
  }

  private evaluateBinaryExpression(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (isAssignmentOperator(expression.operatorToken.kind)) {
      return this.applyAssignment(expression, environment, moduleKey, depth + 1);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
      return this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    }
    if (
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return this.evaluateChoiceExpression(expression, environment, moduleKey, depth + 1);
    }

    const left = this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
    const right = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    if (left.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(left, expression, moduleKey, 'Binary expression depended on an open left operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    if (right.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(right, expression, moduleKey, 'Binary expression depended on an open right operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    return evaluateBinaryOperator(expression.operatorToken.kind, left, right, expression)
      ?? this.unknown(`Binary operator ${tokenName(expression.operatorToken.kind)} did not close over known operands.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }

  private evaluateChoiceExpression(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const left = this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
    if (left.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(left, expression, moduleKey, 'Short-circuit expression depended on an open left operand.', EvaluationOpenSeamKind.DynamicBranch);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      if (left.kind === EvaluationValueKind.Null || left.kind === EvaluationValueKind.Undefined) {
        return this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
      }
      return left;
    } else {
      const truthy = readEvaluationTruthiness(left);
      if (truthy != null) {
        return expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ? truthy ? left : this.evaluateExpression(expression.right, environment, moduleKey, depth + 1)
          : truthy ? this.evaluateExpression(expression.right, environment, moduleKey, depth + 1) : left;
      }
    }
    return this.unknown('Short-circuit expression did not reduce to a known branch.', expression, moduleKey, EvaluationOpenSeamKind.DynamicBranch);
  }

  private evaluatePrefixUnaryExpression(
    expression: ts.PrefixUnaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operand = this.evaluateExpression(expression.operand, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(operand, expression, moduleKey, 'Unary expression depended on an open operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    switch (expression.operator) {
      case ts.SyntaxKind.ExclamationToken: {
        const truthy = readEvaluationTruthiness(operand);
        return truthy == null
          ? this.unknown('Logical not operand did not reduce to known truthiness.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression)
          : new EvaluationBooleanValue(!truthy, expression);
      }
      case ts.SyntaxKind.PlusToken: {
        if (!isEvaluationPrimitiveValue(operand)) {
          return this.unknown('Unary plus operand did not reduce to a numeric primitive.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
        }
        return new EvaluationNumberValue(Number(readEvaluationPrimitive(operand)), expression);
      }
      case ts.SyntaxKind.MinusToken: {
        if (!isEvaluationPrimitiveValue(operand)) {
          return this.unknown('Unary minus operand did not reduce to a numeric primitive.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
        }
        return new EvaluationNumberValue(-Number(readEvaluationPrimitive(operand)), expression);
      }
      case ts.SyntaxKind.TildeToken: {
        return operand.kind === EvaluationValueKind.Number
          ? new EvaluationNumberValue(~operand.value, expression)
          : this.unknown('Bitwise not operand did not reduce to a number.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      }
      default:
        return this.unknown(`Unary operator ${tokenName(expression.operator)} is not evaluated.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
    }
  }

  private evaluateConditionalExpression(
    expression: ts.ConditionalExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const condition = this.evaluateExpression(expression.condition, environment, moduleKey, depth + 1);
    if (condition.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(condition, expression.condition, moduleKey, 'Conditional expression depended on an open condition.', EvaluationOpenSeamKind.DynamicBranch);
    }
    const truthy = readEvaluationTruthiness(condition);
    if (truthy == null) {
      return this.unknown('Conditional expression condition did not reduce to known truthiness.', expression.condition, moduleKey, EvaluationOpenSeamKind.DynamicBranch);
    }
    return this.evaluateExpression(truthy ? expression.whenTrue : expression.whenFalse, environment, moduleKey, depth + 1);
  }

  private applyAssignment(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      return this.unknown('Compound assignments are not reduced by this evaluator slice.', expression, moduleKey, EvaluationOpenSeamKind.DynamicMutation);
    }
    const value = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    const left = skipStaticOuterExpression(expression.left);
    if (ts.isIdentifier(left)) {
      if (!environment.setBinding(left.text, value)) {
        this.open(EvaluationOpenSeamKind.DynamicMutation, `Assignment target '${left.text}' is not a known mutable binding.`, left, moduleKey);
      }
      return value;
    }
    if (ts.isPropertyAccessExpression(left)) {
      const receiver = this.evaluateExpression(left.expression, environment, moduleKey, depth + 1);
      if (receiver.kind === EvaluationValueKind.Object) {
        receiver.properties.set(left.name.text, new EvaluationObjectProperty(left.name.text, value, expression));
        return value;
      }
    }
    return this.unknown('Assignment target is not a supported identifier or object property.', expression.left, moduleKey, EvaluationOpenSeamKind.DynamicMutation);
  }

  private unsupportedStatement(statement: ts.Statement, moduleKey: string, summary: string): EvaluationCompletion {
    this.open(EvaluationOpenSeamKind.UnsupportedStatement, summary, statement, moduleKey);
    return new NormalEvaluationCompletion();
  }

  private unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue {
    this.open(seamKind, reason, node, moduleKey);
    return new EvaluationUnknownValue(reason, node, true);
  }

  private materializeUnknownUse(
    value: EvaluationUnknownValue,
    node: ts.Node,
    moduleKey: string,
    summary: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue {
    return value.hasOpenSeam
      ? value
      : this.unknown(summary, node, moduleKey, seamKind);
  }

  private open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void {
    this.openSeams.push(new EvaluationOpenSeam(seamKind, summary, node, moduleKey));
  }

  private exceededStatementCount(statement: ts.Statement, moduleKey: string): boolean {
    this.statementCount++;
    if (this.statementCount <= DEFAULT_MAX_STATEMENTS) {
      return false;
    }
    this.open(EvaluationOpenSeamKind.StatementLimit, 'Statement evaluation limit reached.', statement, moduleKey);
    return true;
  }

  private syntaxKindName(node: ts.Node): string {
    return ts.SyntaxKind[node.kind] ?? String(node.kind);
  }

  private readPropertyName(
    name: ts.PropertyName,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
      return name.text;
    }
    if (ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
      const value = this.evaluateExpression(name.expression, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.String || value.kind === EvaluationValueKind.Number) {
        return String(value.value);
      }
      this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Computed property name did not reduce to a string or number key.', name, moduleKey);
    }
    return null;
  }
}

/** Remove syntactic wrappers that do not affect static value interpretation. */
export function skipStaticOuterExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function declarationListBindingKind(list: ts.VariableDeclarationList): EvaluationBindingKind {
  if ((list.flags & ts.NodeFlags.Const) !== 0) {
    return EvaluationBindingKind.Const;
  }
  if ((list.flags & ts.NodeFlags.Let) !== 0) {
    return EvaluationBindingKind.Let;
  }
  return EvaluationBindingKind.Var;
}

function readCalleeText(expression: ts.Expression): string | null {
  const current = skipStaticOuterExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    const left = readCalleeText(current.expression);
    return left == null ? current.name.text : `${left}.${current.name.text}`;
  }
  return null;
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function evaluateBinaryOperator(
  operator: ts.SyntaxKind,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationValue | null {
  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return null;
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);

  switch (operator) {
    case ts.SyntaxKind.PlusToken:
      if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
        return new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), node);
      }
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive + rightPrimitive, node)
        : null;
    case ts.SyntaxKind.MinusToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive - rightPrimitive, node)
        : null;
    case ts.SyntaxKind.AsteriskToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive * rightPrimitive, node)
        : null;
    case ts.SyntaxKind.SlashToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive / rightPrimitive, node)
        : null;
    case ts.SyntaxKind.PercentToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive % rightPrimitive, node)
        : null;
    case ts.SyntaxKind.AsteriskAsteriskToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive ** rightPrimitive, node)
        : null;
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return new EvaluationBooleanValue(leftPrimitive === rightPrimitive, node);
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return new EvaluationBooleanValue(leftPrimitive !== rightPrimitive, node);
    case ts.SyntaxKind.LessThanToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive < rightPrimitive, node)
        : null;
    case ts.SyntaxKind.LessThanEqualsToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive <= rightPrimitive, node)
        : null;
    case ts.SyntaxKind.GreaterThanToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive > rightPrimitive, node)
        : null;
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive >= rightPrimitive, node)
        : null;
    default:
      return null;
  }
}

function tokenName(kind: ts.SyntaxKind): string {
  return ts.tokenToString(kind) ?? ts.SyntaxKind[kind] ?? String(kind);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false
    : false;
}
