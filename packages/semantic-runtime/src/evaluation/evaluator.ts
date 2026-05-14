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
import {
  evaluateKnownConstructor as evaluateStaticConstructor,
  evaluateKnownIntrinsic as evaluateStaticIntrinsic,
  type StaticIntrinsicEvaluationHost,
} from './intrinsics.js';
import { EvaluationOpenSeam, EvaluationOpenSeamKind } from './seams.js';
import {
  DefaultStaticEvaluationPolicy,
  StaticEvaluationExpressionStatementDisposition,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  EvaluationBigIntValue,
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBooleanValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationBoundaryValue,
  EvaluationInstanceValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationPromiseValue,
  EvaluationRegularExpressionValue,
  EvaluationStringPatternBuilder,
  EvaluationStringPatternValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  appendEvaluationStringLikePart,
  evaluationStringPatternFromConcatenation,
  evaluationValuesEqual,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';
import { hasModifier, isAssignmentOperator, isParameterProperty } from './ts-syntax.js';
import {
  evaluateStaticArrayLiteral,
  evaluateStaticObjectLiteral,
  type StaticLiteralEvaluationHost,
} from './literals.js';

/** Linked import values keyed by local import binding name before module-body evaluation. */
export type StaticEvaluationImportValues = ReadonlyMap<string, EvaluationValue>;

export interface StaticEvaluationRuntimeHost {
  resolveIdentifier?(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue | null;

  resolveCommonJsRequire?(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  resolveDynamicImport?(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  evaluateCallExpression?(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null;

  evaluateNewExpression?(
    expression: ts.NewExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null;
}

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
    /** Policy used by follow-up expression reads against this module environment. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Runtime host used by follow-up expression reads against this module environment. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
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
  private readonly literalHost: StaticLiteralEvaluationHost = {
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    open: (seamKind, summary, node, moduleKey) =>
      this.open(seamKind, summary, node, moduleKey),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    syntaxKindName: (node) => this.syntaxKindName(node),
  };
  private statementCount = 0;

  constructor(
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
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

    return new StaticModuleEvaluationResult(
      moduleKey,
      environment,
      completion,
      [...this.openSeams],
      this.policy,
      this.runtimeHost,
    );
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

  /** Instantiate an evaluator-known class value without requiring a synthetic `new` expression. */
  evaluateClassValueInstantiation(
    callee: EvaluationClassValue,
    moduleKey: string,
    node: ts.Node,
    argumentValues: readonly EvaluationValue[] = [],
  ): StaticExpressionEvaluationResult {
    const openStart = this.openSeams.length;
    const value = this.evaluateClassInstantiation(callee, node, argumentValues, moduleKey, 0);
    return new StaticExpressionEvaluationResult(value, this.openSeams.slice(openStart));
  }

  /** Read one property from an evaluator value, including guarded accessor invocation for local getters. */
  evaluatePropertyValue(
    receiver: EvaluationValue,
    propertyName: string,
    moduleKey: string,
    node: ts.Node,
  ): StaticExpressionEvaluationResult {
    const openStart = this.openSeams.length;
    const value = this.evaluatePropertyValueCore(receiver, propertyName, node, moduleKey, 0);
    return new StaticExpressionEvaluationResult(value, this.openSeams.slice(openStart));
  }

  /** Evaluate an evaluator-local function with precomputed argument values. */
  evaluateFunctionValue(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    moduleKey: string,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
  ): StaticExpressionEvaluationResult {
    const openStart = this.openSeams.length;
    const value = this.evaluateFunctionWithArguments(callee, call, argumentValues, moduleKey, 0, thisValue);
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
        this.instantiateFunctionDeclaration(statement, environment);
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
          new EvaluationClassValue(
            statement,
            environment,
            statement,
            this.readStaticClassProperties(statement, environment, moduleKey, 0),
          ),
          EvaluationBindingKind.Class,
          false,
          statement,
        );
      }
    }
  }

  private instantiateBlockFunctionDeclarations(
    block: ts.Block,
    environment: ModuleEnvironmentRecord,
  ): void {
    for (const statement of block.statements) {
      if (ts.isFunctionDeclaration(statement)) {
        this.instantiateFunctionDeclaration(statement, environment);
      }
    }
  }

  private instantiateFunctionDeclaration(
    statement: ts.FunctionDeclaration,
    environment: ModuleEnvironmentRecord,
  ): void {
    const localName = statement.name?.text
      ?? (hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
    if (localName == null) {
      return;
    }
    environment.initializeBinding(
      localName,
      new EvaluationFunctionValue(statement, environment, statement),
      EvaluationBindingKind.Function,
      false,
      statement,
    );
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
        clause,
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
        clause.namedBindings,
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
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.ClassDeclaration:
        return this.evaluateClassDeclaration(statement as ts.ClassDeclaration, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.EnumDeclaration:
        return this.evaluateEnumDeclaration(statement as ts.EnumDeclaration, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ModuleDeclaration:
        return this.unsupportedStatement(statement, moduleKey, 'Module declarations are not evaluated as runtime namespaces in this slice.');
      case ts.SyntaxKind.IfStatement:
        return this.evaluateIfStatement(statement as ts.IfStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.ForStatement:
        return this.unsupportedStatement(statement, moduleKey, 'Loop statement is not reduced unless it is a for-of over a known array.');
      case ts.SyntaxKind.ForInStatement:
        return this.evaluateForInStatement(statement as ts.ForInStatement, environment, moduleKey, depth + 1);
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
    this.instantiateBlockFunctionDeclarations(block, environment);
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

    this.bindBindingName(
      declaration.name,
      value,
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      declaration,
    );
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

  private evaluateClassDeclaration(
    declaration: ts.ClassDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const localName = declaration.name?.text
      ?? (hasModifier(declaration, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
    if (localName == null) {
      this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'Class declaration did not expose a local binding name.', declaration, moduleKey);
      return new NormalEvaluationCompletion();
    }
    environment.initializeBinding(
      localName,
      new EvaluationClassValue(
        declaration,
        environment,
        declaration,
        this.readStaticClassProperties(declaration, environment, moduleKey, depth + 1),
      ),
      EvaluationBindingKind.Class,
      false,
      declaration,
    );
    return new NormalEvaluationCompletion();
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
    if (condition.kind === EvaluationValueKind.BoundaryValue) {
      return new NormalEvaluationCompletion();
    }
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
    if (iterable.kind === EvaluationValueKind.BoundaryValue) {
      return new NormalEvaluationCompletion();
    }
    if (iterable.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(iterable, statement.expression, moduleKey, 'For-of statement depended on an open iterable.', EvaluationOpenSeamKind.DynamicLoop);
      return new NormalEvaluationCompletion();
    }
    if (iterable.kind !== EvaluationValueKind.Array) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable did not reduce to a known array value.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    if (iterable.elements.length > this.policy.guardrails.maxLoopIterations || iterable.mayHaveUnknownElements || iterable.mayHaveUnknownOrder) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable has unknown or excessive iteration shape.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }

    for (const element of iterable.elements) {
      this.bindLoopInitializer(statement.initializer, element.value, environment, moduleKey);
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

  private evaluateForInStatement(
    statement: ts.ForInStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const source = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (source.kind === EvaluationValueKind.BoundaryValue || source.kind === EvaluationValueKind.BoundaryObject) {
      return new NormalEvaluationCompletion();
    }
    if (source.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(source, statement.expression, moduleKey, 'For-in statement depended on an open object.', EvaluationOpenSeamKind.DynamicLoop);
      return new NormalEvaluationCompletion();
    }
    if (source.kind !== EvaluationValueKind.Object) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-in source did not reduce to a known object value.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    if (source.properties.size > this.policy.guardrails.maxLoopIterations || source.mayHaveUnknownProperties) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-in source has unknown or excessive property shape.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }

    for (const name of source.properties.keys()) {
      this.bindLoopInitializer(statement.initializer, new EvaluationStringValue(name, statement.expression), environment, moduleKey);
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

  private bindLoopInitializer(
    initializer: ts.ForInitializer,
    value: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): void {
    if (ts.isVariableDeclarationList(initializer)) {
      const declaration = initializer.declarations[0];
      if (declaration != null) {
        const bindingKind = declarationListBindingKind(initializer);
        this.bindBindingName(
          declaration.name,
          value,
          bindingKind,
          bindingKind !== EvaluationBindingKind.Const,
          environment,
          moduleKey,
          0,
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
    this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'Loop initializer is not a supported binding target.', initializer, moduleKey);
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
    if (depth > this.policy.guardrails.maxExpressionDepth) {
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
      case ts.SyntaxKind.RegularExpressionLiteral:
        return this.evaluateRegularExpressionLiteral(current as ts.RegularExpressionLiteral);
      case ts.SyntaxKind.TrueKeyword:
        return new EvaluationBooleanValue(true, current);
      case ts.SyntaxKind.FalseKeyword:
        return new EvaluationBooleanValue(false, current);
      case ts.SyntaxKind.NullKeyword:
        return new EvaluationNullValue(current);
      case ts.SyntaxKind.ThisKeyword:
        return environment.readValue('this')
          ?? this.unknown('`this` is not available in the current static evaluation environment.', current, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
      case ts.SyntaxKind.Identifier:
        return this.evaluateIdentifier(current as ts.Identifier, environment, moduleKey);
      case ts.SyntaxKind.ArrayLiteralExpression:
        return evaluateStaticArrayLiteral(current as ts.ArrayLiteralExpression, environment, moduleKey, depth + 1, this.literalHost);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return evaluateStaticObjectLiteral(current as ts.ObjectLiteralExpression, environment, moduleKey, depth + 1, this.literalHost);
      case ts.SyntaxKind.PropertyAccessExpression:
        return this.evaluatePropertyAccess(current as ts.PropertyAccessExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ElementAccessExpression:
        return this.evaluateElementAccess(current as ts.ElementAccessExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.CallExpression:
        return this.evaluateCallExpression(current as ts.CallExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.NewExpression:
        return this.evaluateNewExpression(current as ts.NewExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        return new EvaluationFunctionValue(current as ts.FunctionLikeDeclaration, environment.clone(`${moduleKey}:closure`), current);
      case ts.SyntaxKind.ClassExpression:
        return new EvaluationClassValue(
          current as ts.ClassExpression,
          environment.clone(`${moduleKey}:class`),
          current,
          this.readStaticClassProperties(current as ts.ClassExpression, environment, moduleKey, depth + 1),
        );
      case ts.SyntaxKind.TemplateExpression:
        return this.evaluateTemplateExpression(current as ts.TemplateExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.BinaryExpression:
        return this.evaluateBinaryExpression(current as ts.BinaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PrefixUnaryExpression:
        return this.evaluatePrefixUnaryExpression(current as ts.PrefixUnaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.TypeOfExpression:
        return this.evaluateTypeOfExpression(current as ts.TypeOfExpression, environment, moduleKey, depth + 1);
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
      const commonJsCarrier = this.evaluateCommonJsCarrierIdentifier(identifier, environment);
      if (commonJsCarrier != null) {
        return commonJsCarrier;
      }
      const hostValue = this.runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null;
      if (hostValue != null) {
        return hostValue;
      }
      return this.unknown(`Identifier '${identifier.text}' is not available in the current environment.`, identifier, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (value.kind === EvaluationValueKind.Unknown && !value.hasOpenSeam) {
      return this.materializeUnknownUse(value, identifier, moduleKey, `Identifier '${identifier.text}' is open in the current environment.`, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    return value;
  }

  private evaluateRegularExpressionLiteral(
    literal: ts.RegularExpressionLiteral,
  ): EvaluationValue {
    const text = literal.getText(literal.getSourceFile());
    const closingSlash = text.lastIndexOf('/');
    if (!text.startsWith('/') || closingSlash <= 0) {
      return new EvaluationRegularExpressionValue(text, '', literal);
    }
    return new EvaluationRegularExpressionValue(
      text.slice(1, closingSlash),
      text.slice(closingSlash + 1),
      literal,
    );
  }

  private evaluateCommonJsCarrierIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
  ): EvaluationValue | null {
    switch (identifier.text) {
      case 'exports':
        return this.ensureCommonJsExports(environment, identifier);
      case 'module':
        return this.ensureCommonJsModule(environment, identifier);
      default:
        return null;
    }
  }

  private ensureCommonJsExports(
    environment: ModuleEnvironmentRecord,
    node: ts.Node,
  ): EvaluationObjectValue {
    const existing = environment.readValue('exports');
    if (existing?.kind === EvaluationValueKind.Object) {
      return existing;
    }
    const moduleValue = environment.readValue('module');
    if (moduleValue?.kind === EvaluationValueKind.Object) {
      const moduleExports = moduleValue.properties.get('exports')?.value;
      if (moduleExports?.kind === EvaluationValueKind.Object) {
        environment.initializeBinding('exports', moduleExports, EvaluationBindingKind.CommonJs, false, node);
        return moduleExports;
      }
    }
    const exportsValue = new EvaluationObjectValue(new Map(), false, node);
    environment.initializeBinding('exports', exportsValue, EvaluationBindingKind.CommonJs, false, node);
    if (moduleValue?.kind === EvaluationValueKind.Object) {
      moduleValue.properties.set('exports', new EvaluationObjectProperty('exports', exportsValue, node));
    }
    return exportsValue;
  }

  private ensureCommonJsModule(
    environment: ModuleEnvironmentRecord,
    node: ts.Node,
  ): EvaluationObjectValue {
    const existing = environment.readValue('module');
    if (existing?.kind === EvaluationValueKind.Object) {
      if (!existing.properties.has('exports')) {
        existing.properties.set('exports', new EvaluationObjectProperty('exports', this.ensureCommonJsExports(environment, node), node));
      }
      return existing;
    }
    const exportsValue = this.ensureCommonJsExports(environment, node);
    const moduleValue = new EvaluationObjectValue(new Map([
      ['exports', new EvaluationObjectProperty('exports', exportsValue, node)],
    ]), false, node);
    environment.initializeBinding('module', moduleValue, EvaluationBindingKind.CommonJs, false, node);
    return moduleValue;
  }

  private readStaticClassProperties(
    declaration: ts.ClassLikeDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): Map<string, EvaluationObjectProperty> {
    const properties = new Map<string, EvaluationObjectProperty>();
    for (const member of declaration.members) {
      if (!hasModifier(member, ts.SyntaxKind.StaticKeyword)) {
        continue;
      }
      if (
        !ts.isMethodDeclaration(member)
        && !ts.isPropertyDeclaration(member)
        && !ts.isGetAccessorDeclaration(member)
      ) {
        continue;
      }
      const name = this.readPropertyName(member.name, environment, moduleKey, depth + 1);
      if (name == null) {
        continue;
      }
      if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
        properties.set(name, new EvaluationObjectProperty(
          name,
          new EvaluationFunctionValue(member, environment.clone(`${moduleKey}:static:${name}`), member),
          member,
        ));
        continue;
      }
      if (member.initializer != null) {
        properties.set(name, new EvaluationObjectProperty(
          name,
          this.evaluateExpression(member.initializer, environment, moduleKey, depth + 1),
          member,
        ));
      }
    }
    return properties;
  }

  private readInstanceClassProperties(
    declaration: ts.ClassLikeDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    properties: Map<string, EvaluationObjectProperty>,
  ): void {
    for (const member of declaration.members) {
      if (hasModifier(member, ts.SyntaxKind.StaticKeyword) || hasModifier(member, ts.SyntaxKind.DeclareKeyword)) {
        continue;
      }
      if (
        !ts.isMethodDeclaration(member)
        && !ts.isPropertyDeclaration(member)
        && !ts.isGetAccessorDeclaration(member)
      ) {
        continue;
      }
      const name = this.readPropertyName(member.name, environment, moduleKey, depth + 1);
      if (name == null) {
        continue;
      }
      if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
        properties.set(name, new EvaluationObjectProperty(
          name,
          new EvaluationFunctionValue(member, environment.clone(`${moduleKey}:instance:${name}`), member),
          member,
        ));
        continue;
      }
      properties.set(name, new EvaluationObjectProperty(
        name,
        member.initializer == null
          ? EvaluationUndefined
          : this.evaluateExpression(member.initializer, environment, moduleKey, depth + 1),
        member,
      ));
    }
  }

  private initializeFunctionParameters(
    declaration: ts.FunctionLikeDeclaration,
    argumentValues: readonly EvaluationValue[],
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    call: ts.Node,
    depth: number,
  ): boolean {
    for (let index = 0; index < declaration.parameters.length; index++) {
      const parameter = declaration.parameters[index];
      if (parameter == null) {
        continue;
      }
      this.bindBindingName(
        parameter.name,
        this.parameterValue(parameter, argumentValues, index, environment, moduleKey, call, depth + 1),
        EvaluationBindingKind.Parameter,
        true,
        environment,
        moduleKey,
        depth + 1,
        parameter,
      );
    }
    return true;
  }

  private applyConstructorParameterProperties(
    declaration: ts.ConstructorDeclaration,
    argumentValues: readonly EvaluationValue[],
    instance: EvaluationInstanceValue,
    node: ts.Node,
  ): void {
    for (let index = 0; index < declaration.parameters.length; index++) {
      const parameter = declaration.parameters[index];
      if (parameter == null || !ts.isIdentifier(parameter.name) || !isParameterProperty(parameter)) {
        continue;
      }
      const name = parameter.name.text;
      instance.properties.set(name, new EvaluationObjectProperty(
        name,
        argumentValues[index] ?? EvaluationUndefined,
        node,
      ));
    }
  }

  private parameterValue(
    parameter: ts.ParameterDeclaration,
    argumentValues: readonly EvaluationValue[],
    index: number,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    call: ts.Node,
    depth: number,
  ): EvaluationValue {
    const value = parameter.dotDotDotToken == null
      ? argumentValues[index] ?? EvaluationUndefined
      : new EvaluationArrayValue(
        argumentValues.slice(index).map((argument) =>
          new EvaluationArrayElement(argument, null)
        ),
        false,
        parameter,
      );
    if (parameter.initializer != null && value.kind === EvaluationValueKind.Undefined) {
      return this.evaluateExpression(parameter.initializer, environment, moduleKey, depth + 1);
    }
    return value;
  }

  private bindBindingName(
    name: ts.BindingName,
    value: EvaluationValue,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    declaration: ts.Node,
  ): void {
    if (ts.isIdentifier(name)) {
      environment.initializeBinding(name.text, value, bindingKind, mutable, declaration);
      return;
    }
    if (ts.isArrayBindingPattern(name)) {
      this.bindArrayBindingPattern(name, value, bindingKind, mutable, environment, moduleKey, depth + 1);
      return;
    }
    this.bindObjectBindingPattern(name, value, bindingKind, mutable, environment, moduleKey, depth + 1);
  }

  private bindArrayBindingPattern(
    pattern: ts.ArrayBindingPattern,
    source: EvaluationValue,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    for (let index = 0; index < pattern.elements.length; index += 1) {
      const element = pattern.elements[index];
      if (element == null || ts.isOmittedExpression(element)) {
        continue;
      }
      const value = element.dotDotDotToken == null
        ? this.readArrayBindingValue(source, index, element, moduleKey)
        : this.readArrayBindingRest(source, index, element, moduleKey);
      this.bindBindingName(
        element.name,
        this.bindingElementValue(element, value, environment, moduleKey, depth + 1),
        bindingKind,
        mutable,
        environment,
        moduleKey,
        depth + 1,
        element,
      );
    }
  }

  private bindObjectBindingPattern(
    pattern: ts.ObjectBindingPattern,
    source: EvaluationValue,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    const consumedKeys = new Set<string>();
    for (const element of pattern.elements) {
      if (element.dotDotDotToken != null) {
        this.bindBindingName(
          element.name,
          this.readObjectBindingRest(source, consumedKeys, element, moduleKey),
          bindingKind,
          mutable,
          environment,
          moduleKey,
          depth + 1,
          element,
        );
        continue;
      }

      const propertyName = this.bindingElementPropertyName(element, environment, moduleKey, depth + 1);
      if (propertyName == null) {
        this.bindBindingName(
          element.name,
          this.unknown('Object binding pattern property name did not reduce to a string key.', element, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern),
          bindingKind,
          mutable,
          environment,
          moduleKey,
          depth + 1,
          element,
        );
        continue;
      }

      consumedKeys.add(propertyName);
      this.bindBindingName(
        element.name,
        this.bindingElementValue(
          element,
          this.readObjectBindingValue(source, propertyName, element, moduleKey),
          environment,
          moduleKey,
          depth + 1,
        ),
        bindingKind,
        mutable,
        environment,
        moduleKey,
        depth + 1,
        element,
      );
    }
  }

  private bindingElementValue(
    element: ts.BindingElement,
    value: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return element.initializer != null && value.kind === EvaluationValueKind.Undefined
      ? this.evaluateExpression(element.initializer, environment, moduleKey, depth + 1)
      : value;
  }

  private bindingElementPropertyName(
    element: ts.BindingElement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null {
    if (element.propertyName != null) {
      return this.readPropertyName(element.propertyName, environment, moduleKey, depth + 1);
    }
    return ts.isIdentifier(element.name) ? element.name.text : null;
  }

  private readArrayBindingValue(
    source: EvaluationValue,
    index: number,
    node: ts.Node,
    moduleKey: string,
  ): EvaluationValue {
    if (source.kind === EvaluationValueKind.Array) {
      return source.mayHaveUnknownOrder
        ? this.unknown(`Array binding element ${index} depends on unknown element order.`, node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern)
        : source.elements[index]?.value ?? new EvaluationUndefinedValue(node);
    }
    if (source.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}[${index}]`, node);
    }
    if (source.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(source, node, moduleKey, 'Array binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    return this.unknown('Array binding pattern source did not reduce to a known array.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }

  private readArrayBindingRest(
    source: EvaluationValue,
    startIndex: number,
    node: ts.Node,
    moduleKey: string,
  ): EvaluationValue {
    if (source.kind === EvaluationValueKind.Array) {
      return new EvaluationArrayValue(
        source.mayHaveUnknownOrder ? [] : source.elements.slice(startIndex),
        source.mayHaveUnknownElements || source.mayHaveUnknownOrder,
        node,
      );
    }
    if (source.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.slice(${startIndex})`, node);
    }
    if (source.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(source, node, moduleKey, 'Array rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    return this.unknown('Array rest binding source did not reduce to a known array.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
  }

  private readObjectBindingValue(
    source: EvaluationValue,
    propertyName: string,
    node: ts.Node,
    moduleKey: string,
  ): EvaluationValue {
    if (source.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(source, node, moduleKey, 'Object binding pattern depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    if (source.kind === EvaluationValueKind.BoundaryValue || source.kind === EvaluationValueKind.BoundaryObject) {
      return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.${propertyName}`, node);
    }
    if (source.kind === EvaluationValueKind.ModuleNamespace) {
      return source.exports.get(propertyName) ?? new EvaluationUndefinedValue(node);
    }
    const ownProperty = this.readOwnProperty(source, propertyName);
    if (ownProperty != null) {
      return ownProperty.value;
    }
    if (source.kind === EvaluationValueKind.Array && propertyName === 'length') {
      return new EvaluationNumberValue(source.elements.length, node);
    }
    if (source.kind === EvaluationValueKind.String && propertyName === 'length') {
      return new EvaluationNumberValue(source.value.length, node);
    }
    if (source.kind === EvaluationValueKind.Null || source.kind === EvaluationValueKind.Undefined) {
      return this.unknown('Object binding pattern source was nullish.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    return new EvaluationUndefinedValue(node);
  }

  private readObjectBindingRest(
    source: EvaluationValue,
    consumedKeys: ReadonlySet<string>,
    node: ts.Node,
    moduleKey: string,
  ): EvaluationValue {
    if (source.kind === EvaluationValueKind.Object || source.kind === EvaluationValueKind.BoundaryObject) {
      const properties = new Map<string, EvaluationObjectProperty>();
      for (const [name, property] of source.properties) {
        if (!consumedKeys.has(name)) {
          properties.set(name, property);
        }
      }
      return new EvaluationObjectValue(
        properties,
        source.kind === EvaluationValueKind.Object ? source.mayHaveUnknownProperties : true,
        node,
      );
    }
    if (source.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationBoundaryValue(source.boundaryKind, `${source.path}.{...rest}`, node);
    }
    if (source.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(source, node, moduleKey, 'Object rest binding depended on an open source value.', EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    if (source.kind === EvaluationValueKind.Null || source.kind === EvaluationValueKind.Undefined) {
      return this.unknown('Object rest binding source was nullish.', node, moduleKey, EvaluationOpenSeamKind.UnsupportedBindingPattern);
    }
    return new EvaluationObjectValue(new Map(), true, node);
  }

  private evaluatePropertyAccess(
    expression: ts.PropertyAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
      return new EvaluationUndefinedValue(expression);
    }
    if (receiver.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(receiver, expression, moduleKey, `Property access '${expression.name.text}' depended on an open receiver.`, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    return this.evaluatePropertyValueCore(receiver, expression.name.text, expression, moduleKey, depth + 1);
  }

  private evaluatePropertyValueCore(
    receiver: EvaluationValue,
    propertyName: string,
    node: ts.Node,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const ownProperty = this.readOwnProperty(receiver, propertyName);
    if (ownProperty != null) {
      if (ts.isGetAccessorDeclaration(ownProperty.node) && ownProperty.value.kind === EvaluationValueKind.Function) {
        return this.evaluateFunctionWithArguments(
          ownProperty.value,
          node,
          [],
          moduleKey,
          depth + 1,
          receiver,
        );
      }
      return ownProperty.value;
    }
    if (receiver.kind === EvaluationValueKind.BoundaryObject) {
      return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node);
    }
    if (receiver.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node);
    }
    if (
      receiver.kind === EvaluationValueKind.Object
      || receiver.kind === EvaluationValueKind.Function
      || receiver.kind === EvaluationValueKind.Class
      || receiver.kind === EvaluationValueKind.Instance
    ) {
      return this.unknown(`Object property '${propertyName}' was not known.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (receiver.kind === EvaluationValueKind.ModuleNamespace) {
      return receiver.exports.get(propertyName)
        ?? this.unknown(`Module namespace export '${propertyName}' was not known.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (receiver.kind === EvaluationValueKind.Array && isKnownArrayPrototypeFunction(propertyName)) {
      return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `Array.prototype.${propertyName}`, node);
    }
    if (receiver.kind === EvaluationValueKind.String && isKnownStringPrototypeFunction(propertyName)) {
      return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `String.prototype.${propertyName}`, node);
    }
    if (receiver.kind === EvaluationValueKind.Array && propertyName === 'length') {
      return new EvaluationNumberValue(receiver.elements.length, node);
    }
    if (receiver.kind === EvaluationValueKind.Set && propertyName === 'size' && !receiver.weak) {
      return new EvaluationNumberValue(receiver.elements.length, node);
    }
    if (receiver.kind === EvaluationValueKind.Map && propertyName === 'size' && !receiver.weak) {
      return new EvaluationNumberValue(receiver.entries.length, node);
    }
    if (receiver.kind === EvaluationValueKind.String && propertyName === 'length') {
      return new EvaluationNumberValue(receiver.value.length, node);
    }
    return this.unknown(`Property access '${propertyName}' did not close over a known receiver.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }

  private evaluateElementAccess(
    expression: ts.ElementAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
      return new EvaluationUndefinedValue(expression);
    }
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
      if (receiver.mayHaveUnknownOrder) {
        return this.unknown(`Array index ${argument.value} depends on an unknown element order.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
      }
      return receiver.elements.at(argument.value)?.value
        ?? this.unknown(`Array index ${argument.value} is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (argument.kind === EvaluationValueKind.String || argument.kind === EvaluationValueKind.Number) {
      const name = String(argument.value);
      const ownProperty = this.readOwnProperty(receiver, name);
      if (ownProperty != null) {
        return ownProperty.value;
      }
      if (receiver.kind === EvaluationValueKind.BoundaryObject) {
        return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}[${JSON.stringify(name)}]`, expression);
      }
      if (receiver.kind === EvaluationValueKind.BoundaryValue) {
        return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}[${JSON.stringify(name)}]`, expression);
      }
      if (
        receiver.kind === EvaluationValueKind.Object
        || receiver.kind === EvaluationValueKind.Function
        || receiver.kind === EvaluationValueKind.Class
        || receiver.kind === EvaluationValueKind.Instance
      ) {
        return this.unknown(`Object property '${name}' is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
      }
    }
    if (receiver.kind === EvaluationValueKind.ModuleNamespace && (argument.kind === EvaluationValueKind.String || argument.kind === EvaluationValueKind.Number)) {
      const name = String(argument.value);
      return receiver.exports.get(name)
        ?? this.unknown(`Module namespace export '${name}' is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
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
    const functionPrototypeCall = this.evaluateFunctionPrototypeCall(call, environment, moduleKey, depth + 1);
    if (functionPrototypeCall != null) {
      return functionPrototypeCall;
    }

    const callee = this.evaluateExpression(call.expression, environment, moduleKey, depth + 1);
    if (hasQuestionDotToken(call) && isNullishEvaluationValue(callee)) {
      return new EvaluationUndefinedValue(call);
    }
    if (callee.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(callee, call, moduleKey, 'Call expression depended on an open callee.', EvaluationOpenSeamKind.DynamicCall);
    }
    if (callee.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(call, callee);
    }
    if (callee.kind === EvaluationValueKind.Function) {
      return this.evaluateFunctionCall(callee, call, environment, moduleKey, depth + 1);
    }
    return this.unknown('Call expression is not a known intrinsic or simple local function.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateFunctionPrototypeCall(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue | null {
    const expression = skipStaticOuterExpression(call.expression);
    if (
      !ts.isPropertyAccessExpression(expression)
      || expression.name.text !== 'call'
    ) {
      return null;
    }
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (receiver.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(
        receiver,
        call,
        moduleKey,
        'Function.prototype.call depended on an open receiver.',
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    if (receiver.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(call, receiver);
    }
    if (receiver.kind !== EvaluationValueKind.Function) {
      return this.unknown(
        'Function.prototype.call receiver did not reduce to a known function.',
        call,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    const thisValue = call.arguments[0] == null
      ? EvaluationUndefined
      : this.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
    const argumentValues = call.arguments
      .slice(1)
      .map((argument) => this.evaluateExpression(argument, environment, moduleKey, depth + 1));
    return this.evaluateFunctionWithArguments(
      receiver,
      call,
      argumentValues,
      moduleKey,
      depth + 1,
      thisValue,
    );
  }

  private evaluateKnownIntrinsic(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue | null {
    return evaluateStaticIntrinsic(call, environment, moduleKey, depth, this.intrinsicHost());
  }

  private evaluateNewExpression(
    expression: ts.NewExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const host = this.intrinsicHost();
    const hostValue = this.runtimeHost.evaluateNewExpression?.(expression, environment, moduleKey, depth, host) ?? null;
    if (hostValue != null) {
      return hostValue;
    }
    const intrinsic = evaluateStaticConstructor(expression, environment, moduleKey, depth, host);
    if (intrinsic != null) {
      return intrinsic;
    }

    const callee = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (callee.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(callee, expression, moduleKey, 'New expression depended on an open constructor.', EvaluationOpenSeamKind.DynamicCall);
    }
    if (callee.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, callee);
    }
    if (callee.kind === EvaluationValueKind.Class) {
      const argumentValues = (expression.arguments ?? []).map((argument) =>
        this.evaluateExpression(argument, environment, moduleKey, depth + 1)
      );
      return this.evaluateClassInstantiation(callee, expression, argumentValues, moduleKey, depth + 1);
    }
    return this.unknown('New expression is not a known intrinsic or static constructor.', expression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateClassInstantiation(
    callee: EvaluationClassValue,
    expression: ts.Node,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const instance = new EvaluationInstanceValue(callee, new Map(), false, expression);
    const instanceEnvironment = callee.environment.clone(`${moduleKey}:new:${expression.getStart()}`) as ModuleEnvironmentRecord;
    instanceEnvironment.initializeBinding('this', instance, EvaluationBindingKind.Parameter, false, expression);

    const constructor = callee.declaration.members.find(ts.isConstructorDeclaration) ?? null;
    if (constructor != null) {
      this.initializeFunctionParameters(constructor, argumentValues, instanceEnvironment, moduleKey, expression, depth + 1);
    }

    this.readInstanceClassProperties(callee.declaration, instanceEnvironment, moduleKey, depth + 1, instance.properties);

    if (constructor != null) {
      this.applyConstructorParameterProperties(constructor, argumentValues, instance, expression);
      if (constructor.body != null) {
        const completion = this.evaluateBlock(constructor.body, instanceEnvironment, moduleKey, depth + 1);
        if (completion.kind === EvaluationCompletionKind.Return && isObjectReturningConstructorValue(completion.value)) {
          return completion.value;
        }
        if (completion.kind === EvaluationCompletionKind.Throw) {
          return this.unknown('Class constructor threw during static evaluation.', expression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
        }
        if (completion.kind === EvaluationCompletionKind.Break || completion.kind === EvaluationCompletionKind.Continue) {
          return this.unknown('Class constructor control flow did not complete normally.', expression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
        }
      }
    }

    return instance;
  }

  private intrinsicHost(): StaticIntrinsicEvaluationHost {
    return {
      guardrails: this.policy.guardrails,
      evaluateExpression: (expression, currentEnvironment, currentModuleKey, currentDepth) =>
        this.evaluateExpression(expression, currentEnvironment, currentModuleKey, currentDepth),
      evaluateFunctionWithArguments: (callee, currentCall, argumentValues, currentModuleKey, currentDepth) =>
        this.evaluateFunctionWithArguments(callee, currentCall, argumentValues, currentModuleKey, currentDepth),
      open: (seamKind, summary, node, currentModuleKey) =>
        this.open(seamKind, summary, node, currentModuleKey),
      unknown: (reason, node, currentModuleKey, seamKind) =>
        this.unknown(reason, node, currentModuleKey, seamKind),
      checkpoint: () => ({
        openSeamCount: this.openSeams.length,
        statementCount: this.statementCount,
      }),
      restore: (checkpoint) => {
        this.openSeams.splice(checkpoint.openSeamCount);
        this.statementCount = checkpoint.statementCount;
      },
      resolveCommonJsRequire: (currentModuleKey, moduleSpecifier, node) =>
        this.runtimeHost.resolveCommonJsRequire?.(currentModuleKey, moduleSpecifier, node) ?? null,
      resolveDynamicImport: (currentModuleKey, moduleSpecifier, node) =>
        this.runtimeHost.resolveDynamicImport?.(currentModuleKey, moduleSpecifier, node) ?? null,
      evaluateCallExpression: (currentCall, currentEnvironment, currentModuleKey, currentDepth, currentHost) =>
        this.runtimeHost.evaluateCallExpression?.(currentCall, currentEnvironment, currentModuleKey, currentDepth, currentHost) ?? null,
    };
  }

  private evaluateFunctionCall(
    callee: EvaluationFunctionValue,
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return this.evaluateFunctionWithArguments(
      callee,
      call,
      call.arguments.map((argument) => this.evaluateExpression(argument, environment, moduleKey, depth + 1)),
      moduleKey,
      depth + 1,
    );
  }

  private evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
    thisValue: EvaluationValue | null = null,
  ): EvaluationValue {
    if (callee.declaration.asteriskToken != null) {
      return this.unknown('Generator functions are not evaluated.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    if (isAsyncFunctionLike(callee.declaration)) {
      return new EvaluationPromiseValue(
        new EvaluationBoundaryValue(
          EvaluationBoundaryKind.AsyncExecution,
          asyncFunctionBoundaryPath(callee.declaration),
          call,
        ),
        call,
      );
    }

    const callEnvironment = callee.environment.clone(`${moduleKey}:call:${call.getStart()}`) as ModuleEnvironmentRecord;
    if (thisValue != null) {
      callEnvironment.initializeBinding('this', thisValue, EvaluationBindingKind.Parameter, true, call);
    }
    this.initializeFunctionParameters(callee.declaration, argumentValues, callEnvironment, moduleKey, call, depth + 1);

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
    const builder = new EvaluationStringPatternBuilder(expression.head.text);
    for (const span of expression.templateSpans) {
      const value = this.evaluateExpression(span.expression, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(value, span.expression, moduleKey, 'Template expression span depended on an open value.', EvaluationOpenSeamKind.UnsupportedExpression);
      }
      if (!appendEvaluationStringLikePart(builder, value, span.literal.text)) {
        return this.unknown('Template expression span did not reduce to a primitive value.', span.expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      }
    }
    return builder.build(expression);
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
    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const pattern = evaluateStringPatternPlus(left, right, expression);
      if (pattern != null) {
        return pattern;
      }
    }
    if (left.kind === EvaluationValueKind.BoundaryValue || right.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, left, right);
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
    if (left.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, left);
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
    if (operand.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, operand);
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

  private evaluateTypeOfExpression(
    expression: ts.TypeOfExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operandExpression = skipStaticOuterExpression(expression.expression);
    const operand = ts.isIdentifier(operandExpression)
      ? this.evaluateTypeOfIdentifier(operandExpression, environment, moduleKey)
      : this.evaluateExpression(operandExpression, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(
        operand,
        expression,
        moduleKey,
        'typeof depended on an open value.',
        EvaluationOpenSeamKind.UnsupportedExpression,
      );
    }
    switch (operand.kind) {
      case EvaluationValueKind.Undefined:
        return new EvaluationStringValue('undefined', expression);
      case EvaluationValueKind.Boolean:
        return new EvaluationStringValue('boolean', expression);
      case EvaluationValueKind.Number:
        return new EvaluationStringValue('number', expression);
      case EvaluationValueKind.BigInt:
        return new EvaluationStringValue('bigint', expression);
      case EvaluationValueKind.String:
      case EvaluationValueKind.StringPattern:
        return new EvaluationStringValue('string', expression);
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
        return new EvaluationStringValue('function', expression);
      case EvaluationValueKind.Null:
      case EvaluationValueKind.Array:
      case EvaluationValueKind.Set:
      case EvaluationValueKind.Map:
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
      case EvaluationValueKind.RegularExpression:
      case EvaluationValueKind.Instance:
      case EvaluationValueKind.ModuleNamespace:
      case EvaluationValueKind.Promise:
        return new EvaluationStringValue('object', expression);
      case EvaluationValueKind.BoundaryValue:
        return new EvaluationUnknownValue(`typeof ${operand.path} depends on host environment state.`, expression, true);
    }
  }

  private evaluateTypeOfIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue {
    if (identifier.text === 'undefined') {
      return EvaluationUndefined;
    }
    const value = environment.readValue(identifier.text)
      ?? this.runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey)
      ?? null;
    return value ?? EvaluationUndefined;
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
    if (condition.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, condition);
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
      if (this.writeOwnProperty(receiver, left.name.text, value, expression)) {
        return value;
      }
      if (receiver.kind === EvaluationValueKind.BoundaryValue) {
        return value;
      }
    }
    if (ts.isElementAccessExpression(left)) {
      const receiver = this.evaluateExpression(left.expression, environment, moduleKey, depth + 1);
      const argument = left.argumentExpression == null
        ? null
        : this.evaluateExpression(left.argumentExpression, environment, moduleKey, depth + 1);
      if (receiver.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(receiver, left.expression, moduleKey, 'Element assignment depended on an open receiver.', EvaluationOpenSeamKind.DynamicMutation);
      }
      if (argument?.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(argument, left.argumentExpression ?? left, moduleKey, 'Element assignment depended on an open key.', EvaluationOpenSeamKind.DynamicMutation);
      }
      if (receiver.kind === EvaluationValueKind.BoundaryValue || argument?.kind === EvaluationValueKind.BoundaryValue) {
        return value;
      }
      if (argument?.kind === EvaluationValueKind.String || argument?.kind === EvaluationValueKind.Number) {
        const name = String(argument.value);
        if (this.writeOwnProperty(receiver, name, value, expression)) {
          return value;
        }
      }
    }
    return this.unknown('Assignment target is not a supported identifier or object property.', expression.left, moduleKey, EvaluationOpenSeamKind.DynamicMutation);
  }

  private readOwnProperty(
    receiver: EvaluationValue,
    name: string,
  ): EvaluationObjectProperty | null {
    switch (receiver.kind) {
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
      case EvaluationValueKind.Instance:
        return receiver.properties.get(name) ?? null;
      case EvaluationValueKind.RegularExpression:
        return this.readRegularExpressionProperty(receiver, name);
      default:
        return null;
    }
  }

  private readRegularExpressionProperty(
    receiver: EvaluationRegularExpressionValue,
    name: string,
  ): EvaluationObjectProperty | null {
    const node = receiver.node;
    if (node == null) {
      return null;
    }
    switch (name) {
      case 'source':
        return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.pattern, node), node);
      case 'flags':
        return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.flags, node), node);
      case 'global':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('g'), node), node);
      case 'ignoreCase':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('i'), node), node);
      case 'multiline':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('m'), node), node);
      case 'dotAll':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('s'), node), node);
      case 'unicode':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('u'), node), node);
      case 'unicodeSets':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('v'), node), node);
      case 'sticky':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('y'), node), node);
      case 'hasIndices':
        return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('d'), node), node);
      case 'lastIndex':
        return new EvaluationObjectProperty(name, new EvaluationNumberValue(0, node), node);
      default:
        return null;
    }
  }

  private writeOwnProperty(
    receiver: EvaluationValue,
    name: string,
    value: EvaluationValue,
    node: ts.Node,
  ): boolean {
    switch (receiver.kind) {
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
      case EvaluationValueKind.Instance:
        receiver.properties.set(name, new EvaluationObjectProperty(name, value, node));
        return true;
      case EvaluationValueKind.BoundaryValue:
        return false;
      default:
        return false;
    }
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
    if (this.statementCount <= this.policy.guardrails.maxStatements) {
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

function evaluateBinaryOperator(
  operator: ts.SyntaxKind,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationValue | null {
  switch (operator) {
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return new EvaluationBooleanValue(evaluationValuesEqual(left, right), node);
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return new EvaluationBooleanValue(!evaluationValuesEqual(left, right), node);
  }

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

function evaluateStringPatternPlus(
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationStringPatternValue | null {
  return evaluationStringPatternFromConcatenation(left, right, node);
}

function isObjectReturningConstructorValue(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return false;
  }
}

function hasQuestionDotToken(node: ts.Node): boolean {
  return (node as { readonly questionDotToken?: ts.QuestionDotToken }).questionDotToken != null;
}

function isNullishEvaluationValue(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined;
}

function isAsyncFunctionLike(declaration: ts.FunctionLikeDeclaration): boolean {
  return declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true;
}

function asyncFunctionBoundaryPath(declaration: ts.FunctionLikeDeclaration): string {
  const name = ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)
    ? declaration.name?.getText(declaration.getSourceFile())
    : null;
  return name == null
    ? 'async function fulfillment'
    : `async function '${name}' fulfillment`;
}

function boundaryDependencyValue(
  node: ts.Node,
  ...values: readonly EvaluationValue[]
): EvaluationBoundaryValue {
  const paths = values
    .filter((value): value is EvaluationBoundaryValue => value.kind === EvaluationValueKind.BoundaryValue)
    .map((value) => value.path);
  const boundaryKind = values.find((value): value is EvaluationBoundaryValue =>
    value.kind === EvaluationValueKind.BoundaryValue
  )?.boundaryKind;
  const path = paths.length === 0
    ? 'boundary expression'
    : paths.length === 1
      ? paths[0]!
      : `boundary expression depending on ${paths.join(', ')}`;
  return new EvaluationBoundaryValue(boundaryKind ?? EvaluationBoundaryKind.ExternalModule, path, node);
}

function isKnownArrayPrototypeFunction(name: string): boolean {
  switch (name) {
    case 'concat':
    case 'filter':
    case 'fill':
    case 'map':
    case 'reduce':
    case 'slice':
    case 'sort':
      return true;
    default:
      return false;
  }
}

function isKnownStringPrototypeFunction(name: string): boolean {
  switch (name) {
    case 'endsWith':
    case 'includes':
    case 'replace':
    case 'slice':
    case 'split':
    case 'startsWith':
    case 'toLowerCase':
    case 'toUpperCase':
    case 'trim':
      return true;
    default:
      return false;
  }
}

function tokenName(kind: ts.SyntaxKind): string {
  return ts.tokenToString(kind) ?? ts.SyntaxKind[kind] ?? String(kind);
}
