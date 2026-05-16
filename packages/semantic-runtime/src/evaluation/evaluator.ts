import ts from 'typescript';
import {
  bindStaticBindingName,
  staticBindingNames,
  type StaticBindingPatternHost,
} from './binding-patterns.js';
import {
  evaluateStaticClassInstantiation,
  readStaticClassProperties,
  type StaticClassEvaluationHost,
} from './class-values.js';
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
  evaluateStaticFunctionCall,
  evaluateStaticFunctionWithArguments,
  type StaticFunctionEvaluationHost,
} from './function-values.js';
import {
  ensureStaticCommonJsExports,
  ensureStaticCommonJsModule,
} from './commonjs.js';
import {
  instantiateStaticBlockFunctionDeclarations,
  instantiateStaticModuleDeclarations,
  type StaticDeclarationInstantiationHost,
} from './declaration-instantiation.js';
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
  hasQuestionDotToken,
  isNullishEvaluationValue,
} from './nullish-expression.js';
import {
  evaluateStaticBinaryOperator,
  staticTokenName,
} from './operators.js';
import {
  EvaluationBigIntValue,
  EvaluationBoundaryKind,
  EvaluationBooleanValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationBoundaryValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationRegularExpressionValue,
  EvaluationStringPatternBuilder,
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
import { hasModifier, isAssignmentOperator } from './ts-syntax.js';
import {
  evaluateStaticArrayLiteral,
  evaluateStaticObjectLiteral,
  type StaticLiteralEvaluationHost,
} from './literals.js';
import {
  evaluateStaticElementAccess,
  evaluateStaticPropertyAccess,
  evaluateStaticPropertyValue,
  readStaticOwnProperty,
  type StaticPropertyAccessEvaluationHost,
  writeStaticOwnProperty,
} from './property-access.js';

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
  private readonly bindingHost: StaticBindingPatternHost = {
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    readOwnProperty: (receiver, name) => readStaticOwnProperty(receiver, name),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    materializeUnknownUse: (value, node, moduleKey, summary, seamKind) =>
      this.materializeUnknownUse(value, node, moduleKey, summary, seamKind),
  };
  private readonly propertyAccessHost: StaticPropertyAccessEvaluationHost = {
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateFunctionWithArguments: (callee, call, argumentValues, moduleKey, depth, thisValue = null) =>
      this.evaluateFunctionWithArguments(callee, call, argumentValues, moduleKey, depth, thisValue),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    materializeUnknownUse: (value, node, moduleKey, summary, seamKind) =>
      this.materializeUnknownUse(value, node, moduleKey, summary, seamKind),
  };
  private readonly classHost: StaticClassEvaluationHost = {
    bindingHost: this.bindingHost,
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateBlock: (block, environment, moduleKey, depth) =>
      this.evaluateBlock(block, environment, moduleKey, depth),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
  };
  private readonly functionHost: StaticFunctionEvaluationHost = {
    bindingHost: this.bindingHost,
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateBlock: (block, environment, moduleKey, depth) =>
      this.evaluateBlock(block, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
  };
  private readonly declarationInstantiationHost: StaticDeclarationInstantiationHost = {
    classHost: this.classHost,
    open: (seamKind, summary, node, moduleKey) =>
      this.open(seamKind, summary, node, moduleKey),
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
    instantiateStaticModuleDeclarations(sourceFile, environment, moduleKey, imports, this.declarationInstantiationHost);

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
    const value = evaluateStaticPropertyValue(receiver, propertyName, node, moduleKey, 0, this.propertyAccessHost);
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
        return this.evaluateSwitchStatement(statement as ts.SwitchStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.LabeledStatement:
        return this.evaluateStatement((statement as ts.LabeledStatement).statement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ThrowStatement:
        return new ThrowEvaluationCompletion(
          (statement as ts.ThrowStatement).expression == null
            ? EvaluationUndefined
            : this.evaluateExpression((statement as ts.ThrowStatement).expression, environment, moduleKey, depth + 1),
        );
      case ts.SyntaxKind.TryStatement:
        return this.evaluateTryStatement(statement as ts.TryStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.DebuggerStatement:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.NotEmittedStatement:
        return new NormalEvaluationCompletion();
      default:
        return this.unsupportedStatement(statement, moduleKey, `Statement kind ${this.syntaxKindName(statement)} is not in the evaluator statement set.`);
    }
  }

  private evaluateSwitchStatement(
    statement: ts.SwitchStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const expressionValue = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (expressionValue.kind === EvaluationValueKind.BoundaryValue) {
      return new NormalEvaluationCompletion();
    }
    if (expressionValue.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(expressionValue, statement.expression, moduleKey, 'Switch statement depended on an open expression.', EvaluationOpenSeamKind.DynamicBranch);
      return new NormalEvaluationCompletion();
    }

    const selectedClauseIndex = this.selectedSwitchClauseIndex(statement, expressionValue, environment, moduleKey, depth + 1);
    if (selectedClauseIndex == null) {
      return new NormalEvaluationCompletion();
    }

    for (const clause of statement.caseBlock.clauses.slice(selectedClauseIndex)) {
      for (const clauseStatement of clause.statements) {
        const completion = this.evaluateStatement(clauseStatement, environment, moduleKey, depth + 1);
        if (completion.kind === EvaluationCompletionKind.Break) {
          return new NormalEvaluationCompletion();
        }
        if (completion.kind !== EvaluationCompletionKind.Normal) {
          return completion;
        }
      }
    }
    return new NormalEvaluationCompletion();
  }

  private selectedSwitchClauseIndex(
    statement: ts.SwitchStatement,
    expressionValue: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): number | null {
    let defaultClauseIndex: number | null = null;
    for (let index = 0; index < statement.caseBlock.clauses.length; index += 1) {
      const clause = statement.caseBlock.clauses[index];
      if (clause == null) {
        continue;
      }
      if (ts.isDefaultClause(clause)) {
        defaultClauseIndex = index;
        continue;
      }
      const caseValue = this.evaluateExpression(clause.expression, environment, moduleKey, depth + 1);
      if (caseValue.kind === EvaluationValueKind.BoundaryValue) {
        this.open(EvaluationOpenSeamKind.DynamicBranch, 'Switch case expression is a boundary value.', clause.expression, moduleKey);
        return null;
      }
      if (caseValue.kind === EvaluationValueKind.Unknown) {
        this.materializeUnknownUse(caseValue, clause.expression, moduleKey, 'Switch case expression depended on an open value.', EvaluationOpenSeamKind.DynamicBranch);
        return null;
      }
      if (evaluationValuesEqual(expressionValue, caseValue)) {
        return index;
      }
    }
    return defaultClauseIndex;
  }

  private evaluateTryStatement(
    statement: ts.TryStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const tryCompletion = this.evaluateBlock(statement.tryBlock, environment, moduleKey, depth + 1);
    const caughtCompletion = tryCompletion.kind === EvaluationCompletionKind.Throw && statement.catchClause != null
      ? this.evaluateCatchClause(statement.catchClause, tryCompletion.value, environment, moduleKey, depth + 1)
      : tryCompletion;

    if (statement.finallyBlock == null) {
      return caughtCompletion;
    }

    const finallyCompletion = this.evaluateBlock(statement.finallyBlock, environment, moduleKey, depth + 1);
    return finallyCompletion.kind === EvaluationCompletionKind.Normal
      ? caughtCompletion
      : finallyCompletion;
  }

  private evaluateCatchClause(
    catchClause: ts.CatchClause,
    thrownValue: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const declaration = catchClause.variableDeclaration;
    if (declaration == null) {
      return this.evaluateBlock(catchClause.block, environment, moduleKey, depth + 1);
    }

    const bindingNames = staticBindingNames(declaration.name);
    const conflictingBinding = bindingNames.find((name) => environment.readBinding(name) != null);
    if (conflictingBinding != null) {
      this.open(
        EvaluationOpenSeamKind.UnsupportedBindingPattern,
        `Catch binding '${conflictingBinding}' shadows an existing evaluator binding; isolated catch environments are not modeled yet.`,
        declaration.name,
        moduleKey,
      );
      return new NormalEvaluationCompletion();
    }

    bindStaticBindingName(
      declaration.name,
      thrownValue,
      EvaluationBindingKind.Let,
      true,
      environment,
      moduleKey,
      depth + 1,
      declaration,
      this.bindingHost,
    );
    try {
      return this.evaluateBlock(catchClause.block, environment, moduleKey, depth + 1);
    } finally {
      for (const bindingName of bindingNames) {
        environment.deleteBinding(bindingName);
      }
    }
  }

  private evaluateBlock(
    block: ts.Block,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    instantiateStaticBlockFunctionDeclarations(block, environment);
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

    bindStaticBindingName(
      declaration.name,
      value,
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      declaration,
      this.bindingHost,
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
        readStaticClassProperties(declaration, environment, moduleKey, depth + 1, this.classHost),
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
        bindStaticBindingName(
          declaration.name,
          value,
          bindingKind,
          bindingKind !== EvaluationBindingKind.Const,
          environment,
          moduleKey,
          0,
          declaration,
          this.bindingHost,
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
          readStaticClassProperties(current as ts.ClassExpression, environment, moduleKey, depth + 1, this.classHost),
        );
      case ts.SyntaxKind.TemplateExpression:
        return this.evaluateTemplateExpression(current as ts.TemplateExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.BinaryExpression:
        return this.evaluateBinaryExpression(current as ts.BinaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PrefixUnaryExpression:
        return this.evaluatePrefixUnaryExpression(current as ts.PrefixUnaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.TypeOfExpression:
        return this.evaluateTypeOfExpression(current as ts.TypeOfExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.VoidExpression:
        return this.evaluateVoidExpression(current as ts.VoidExpression, environment, moduleKey, depth + 1);
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
        return ensureStaticCommonJsExports(environment, identifier);
      case 'module':
        return ensureStaticCommonJsModule(environment, identifier);
      default:
        return null;
    }
  }

  private evaluatePropertyAccess(
    expression: ts.PropertyAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return evaluateStaticPropertyAccess(expression, environment, moduleKey, depth, this.propertyAccessHost);
  }

  private evaluateElementAccess(
    expression: ts.ElementAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return evaluateStaticElementAccess(expression, environment, moduleKey, depth, this.propertyAccessHost);
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
    return evaluateStaticClassInstantiation(callee, expression, argumentValues, moduleKey, depth, this.classHost);
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
    return evaluateStaticFunctionCall(callee, call, environment, moduleKey, depth, this.functionHost);
  }

  private evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
    thisValue: EvaluationValue | null = null,
  ): EvaluationValue {
    return evaluateStaticFunctionWithArguments(
      callee,
      call,
      argumentValues,
      moduleKey,
      depth,
      this.functionHost,
      thisValue,
    );
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
      const pattern = evaluationStringPatternFromConcatenation(left, right, expression);
      if (pattern != null) {
        return pattern;
      }
    }
    if (left.kind === EvaluationValueKind.BoundaryValue || right.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, left, right);
    }
    return evaluateStaticBinaryOperator(expression.operatorToken.kind, left, right, expression)
      ?? this.unknown(`Binary operator ${staticTokenName(expression.operatorToken.kind)} did not close over known operands.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
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
        return this.unknown(`Unary operator ${staticTokenName(expression.operator)} is not evaluated.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
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

  private evaluateVoidExpression(
    expression: ts.VoidExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operand = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown && !operand.hasOpenSeam) {
      this.materializeUnknownUse(
        operand,
        expression,
        moduleKey,
        'void expression depended on an open operand.',
        EvaluationOpenSeamKind.UnsupportedExpression,
      );
    }
    return new EvaluationUndefinedValue(expression);
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
      if (writeStaticOwnProperty(receiver, left.name.text, value, expression)) {
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
        if (writeStaticOwnProperty(receiver, name, value, expression)) {
          return value;
        }
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
