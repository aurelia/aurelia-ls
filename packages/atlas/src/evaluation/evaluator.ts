import ts from "typescript";

import {
  isAssignmentOperator,
  type SourceProject,
} from "../source/index.js";
import {
  BreakEvaluationCompletion,
  ContinueEvaluationCompletion,
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  OpenEvaluationCompletion,
  ReturnEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationCompletion,
} from "./completion.js";
import {
  EvaluationBindingKind,
  EvaluationEnvironment,
} from "./environment.js";
import {
  EvaluationOpenKind,
  EvaluationOpenSeam,
} from "./seam.js";
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
  EvaluationModuleNamespaceValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  readEvaluationPropertyKey,
  readEvaluationTruthiness,
  type EvaluationValue,
} from "./value.js";

const DEFAULT_MAX_EXPRESSION_DEPTH = 80;
const DEFAULT_MAX_STATEMENTS = 5_000;
const DEFAULT_MAX_CALL_DEPTH = 40;

/** Linked import values keyed by local import binding name before module-body evaluation. */
export type StaticEvaluationImportValues = ReadonlyMap<string, EvaluationValue>;

/** Runtime context supplied to an evaluator intrinsic. */
export interface EvaluationIntrinsicContext {
  /** Source project that owns the current Program and TypeChecker. */
  readonly sourceProject: SourceProject;
  /** TypeChecker from the current source project epoch. */
  readonly checker: ts.TypeChecker;
  /** Evaluator executing the current expression. */
  readonly evaluator: StaticEvaluator;
  /** Environment visible at the call site. */
  readonly environment: EvaluationEnvironment;
  /** Module key whose expression produced the call. */
  readonly moduleKey: string;
}

/** Request supplied to one evaluator intrinsic. */
export interface EvaluationIntrinsicRequest {
  /** Call expression being reduced. */
  readonly call: ts.CallExpression;
  /** Evaluated argument values in source order. */
  readonly args: readonly EvaluationValue[];
  /** Runtime context available to the intrinsic. */
  readonly context: EvaluationIntrinsicContext;
}

/** Optional source-reader hook for known pure helper calls. */
export interface EvaluationIntrinsic {
  /** Stable intrinsic id for diagnostics and future capability maps. */
  readonly id: string;
  /** Reduce a call or return null when this intrinsic does not apply. */
  evaluate(request: EvaluationIntrinsicRequest): EvaluationValue | null;
}

/** Guardrail and extension options for one evaluator instance. */
export interface StaticEvaluationOptions {
  /** Maximum expression recursion depth. */
  readonly maxExpressionDepth?: number;
  /** Maximum statements evaluated before opening the path. */
  readonly maxStatements?: number;
  /** Maximum nested local function calls. */
  readonly maxCallDepth?: number;
  /** Optional pure helper intrinsics. */
  readonly intrinsics?: readonly EvaluationIntrinsic[];
}

/** Result of evaluating one source file as an ECMAScript-like module body. */
export class ModuleEvaluationResult {
  constructor(
    /** Module key whose source file was evaluated. */
    readonly moduleKey: string,
    /** Environment after the module-body pass. */
    readonly environment: EvaluationEnvironment,
    /** Final completion for the module body. */
    readonly completion: EvaluationCompletion,
    /** Explicit open seams produced during this evaluation. */
    readonly openSeams: readonly EvaluationOpenSeam[],
  ) {}
}

/** Result of evaluating one expression against an existing environment. */
export class ExpressionEvaluationResult {
  constructor(
    /** Value produced by the expression evaluator. */
    readonly value: EvaluationValue,
    /** Open seams observed during this expression read. */
    readonly openSeams: readonly EvaluationOpenSeam[],
  ) {}
}

/** ECMAScript-shaped evaluator over TypeScript source nodes. */
export class StaticEvaluator {
  readonly #openSeams: EvaluationOpenSeam[] = [];
  readonly #maxExpressionDepth: number;
  readonly #maxStatements: number;
  readonly #maxCallDepth: number;
  readonly #intrinsics: readonly EvaluationIntrinsic[];
  #statementCount = 0;
  #callDepth = 0;

  constructor(
    /** Source project that owns the current Program and TypeChecker. */
    readonly sourceProject: SourceProject,
    /** Guardrail and extension options for this evaluator. */
    options: StaticEvaluationOptions = {},
  ) {
    this.#maxExpressionDepth = options.maxExpressionDepth ?? DEFAULT_MAX_EXPRESSION_DEPTH;
    this.#maxStatements = options.maxStatements ?? DEFAULT_MAX_STATEMENTS;
    this.#maxCallDepth = options.maxCallDepth ?? DEFAULT_MAX_CALL_DEPTH;
    this.#intrinsics = options.intrinsics ?? [];
  }

  /** Evaluate one source file as an ECMAScript-like module body. */
  evaluateSourceFile(
    /** Source file to evaluate. */
    sourceFile: ts.SourceFile,
    /** Stable module key for diagnostics and environment identity. */
    moduleKey: string = sourceFile.fileName,
    /** Values resolved by an outer module-linking pass. */
    imports: StaticEvaluationImportValues = new Map(),
  ): ModuleEvaluationResult {
    this.#openSeams.length = 0;
    this.#statementCount = 0;
    this.#callDepth = 0;
    const environment = new EvaluationEnvironment(moduleKey);
    this.instantiateModule(sourceFile, environment, moduleKey, imports);

    let completion: EvaluationCompletion = new NormalEvaluationCompletion();
    for (const statement of sourceFile.statements) {
      completion = this.evaluateStatement(statement, environment, moduleKey, 0);
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        break;
      }
    }

    return new ModuleEvaluationResult(moduleKey, environment, completion, [...this.#openSeams]);
  }

  /** Evaluate one expression against an existing environment. */
  evaluateExpressionInEnvironment(
    /** Expression to evaluate. */
    expression: ts.Expression,
    /** Environment visible at the expression site. */
    environment: EvaluationEnvironment,
    /** Module key for diagnostics. */
    moduleKey: string,
  ): ExpressionEvaluationResult {
    const openStart = this.#openSeams.length;
    const value = this.evaluateExpression(expression, environment, moduleKey, 0);
    return new ExpressionEvaluationResult(value, this.#openSeams.slice(openStart));
  }

  /** Evaluate one expression and append any open seams to this evaluator run. */
  evaluateExpression(
    /** Expression to evaluate. */
    expression: ts.Expression,
    /** Environment visible at the expression site. */
    environment: EvaluationEnvironment,
    /** Module key for diagnostics. */
    moduleKey: string,
    /** Current recursion depth. */
    depth = 0,
  ): EvaluationValue {
    if (depth > this.#maxExpressionDepth) {
      return this.unknown(EvaluationOpenKind.DepthLimit, "Expression depth limit reached.", expression, moduleKey);
    }

    const current = skipOuterExpression(expression);
    if (ts.isStringLiteralLike(current)) {
      return new EvaluationStringValue(current.text, current);
    }
    if (ts.isNumericLiteral(current)) {
      return new EvaluationNumberValue(Number(current.text), current);
    }
    if (ts.isBigIntLiteral(current)) {
      return new EvaluationBigIntValue(current.text, current);
    }
    if (current.kind === ts.SyntaxKind.TrueKeyword) {
      return new EvaluationBooleanValue(true, current);
    }
    if (current.kind === ts.SyntaxKind.FalseKeyword) {
      return new EvaluationBooleanValue(false, current);
    }
    if (current.kind === ts.SyntaxKind.NullKeyword) {
      return new EvaluationNullValue(current);
    }
    if (ts.isIdentifier(current)) {
      return this.evaluateIdentifier(current, environment, moduleKey);
    }
    if (ts.isArrayLiteralExpression(current)) {
      return this.evaluateArrayLiteral(current, environment, moduleKey, depth + 1);
    }
    if (ts.isObjectLiteralExpression(current)) {
      return this.evaluateObjectLiteral(current, environment, moduleKey, depth + 1);
    }
    if (ts.isPropertyAccessExpression(current)) {
      return this.evaluatePropertyAccess(current, environment, moduleKey, depth + 1);
    }
    if (ts.isElementAccessExpression(current)) {
      return this.evaluateElementAccess(current, environment, moduleKey, depth + 1);
    }
    if (ts.isCallExpression(current)) {
      return this.evaluateCallExpression(current, environment, moduleKey, depth + 1);
    }
    if (ts.isNewExpression(current)) {
      return this.unknown(EvaluationOpenKind.DynamicCall, "New expressions are not executed by static evaluation.", current, moduleKey);
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      return new EvaluationFunctionValue(current, environment.clone(`${moduleKey}:closure`), current);
    }
    if (ts.isClassExpression(current)) {
      return new EvaluationClassValue(current, environment.clone(`${moduleKey}:class`), current);
    }
    if (ts.isTemplateExpression(current)) {
      return this.evaluateTemplateExpression(current, environment, moduleKey, depth + 1);
    }
    if (ts.isBinaryExpression(current)) {
      return this.evaluateBinaryExpression(current, environment, moduleKey, depth + 1);
    }
    if (ts.isPrefixUnaryExpression(current)) {
      return this.evaluatePrefixUnaryExpression(current, environment, moduleKey, depth + 1);
    }
    if (ts.isTypeOfExpression(current)) {
      return this.evaluateTypeOfExpression(current, environment, moduleKey, depth + 1);
    }
    if (ts.isVoidExpression(current)) {
      return new EvaluationUndefinedValue(current);
    }
    if (ts.isConditionalExpression(current)) {
      return this.evaluateConditionalExpression(current, environment, moduleKey, depth + 1);
    }

    return this.unknown(
      EvaluationOpenKind.UnsupportedExpression,
      `Expression kind ${ts.SyntaxKind[current.kind]} is not in the evaluator expression set.`,
      current,
      moduleKey,
    );
  }

  private instantiateModule(
    sourceFile: ts.SourceFile,
    environment: EvaluationEnvironment,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
  ): void {
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        this.instantiateImportDeclaration(statement, environment, moduleKey, imports);
        continue;
      }
      if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
        environment.initializeBinding(
          statement.name.text,
          new EvaluationFunctionValue(statement, environment, statement),
          EvaluationBindingKind.Function,
          false,
          statement,
        );
        continue;
      }
      if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
        environment.initializeBinding(
          statement.name.text,
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
    environment: EvaluationEnvironment,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
  ): void {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      this.open(EvaluationOpenKind.UnsupportedExpression, "Import declaration module specifier was not a string literal.", statement.moduleSpecifier, moduleKey);
      return;
    }
    const clause = statement.importClause;
    if (clause === undefined) {
      return;
    }
    if (clause.name !== undefined) {
      const imported = imports.get(clause.name.text);
      environment.initializeBinding(
        clause.name.text,
        imported ??
          new EvaluationUnknownValue(
            "Default import binding is not linked in this evaluator pass.",
            clause.name,
          ),
        EvaluationBindingKind.Import,
        false,
        clause.name,
      );
    }
    const named = clause.namedBindings;
    if (named === undefined) {
      return;
    }
    if (ts.isNamespaceImport(named)) {
      const imported = imports.get(named.name.text);
      environment.initializeBinding(
        named.name.text,
        imported ??
          new EvaluationUnknownValue(
            "Namespace import binding is not linked in this evaluator pass.",
            named.name,
          ),
        EvaluationBindingKind.Import,
        false,
        named.name,
      );
      return;
    }
    for (const element of named.elements) {
      const imported = imports.get(element.name.text);
      environment.initializeBinding(
        element.name.text,
        imported ??
          new EvaluationUnknownValue(
            "Named import binding is not linked in this evaluator pass.",
            element.name,
          ),
        EvaluationBindingKind.Import,
        false,
        element,
      );
    }
  }

  private evaluateStatement(
    statement: ts.Statement,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (++this.#statementCount > this.#maxStatements) {
      this.open(EvaluationOpenKind.StatementLimit, "Statement limit reached.", statement, moduleKey);
      return new OpenEvaluationCompletion("Statement limit reached.");
    }
    if (ts.isVariableStatement(statement)) {
      return this.evaluateVariableStatement(statement, environment, moduleKey, depth + 1);
    }
    if (ts.isExpressionStatement(statement)) {
      return new NormalEvaluationCompletion(this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1));
    }
    if (ts.isReturnStatement(statement)) {
      return new ReturnEvaluationCompletion(
        statement.expression === undefined
          ? EvaluationUndefined
          : this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1),
      );
    }
    if (ts.isBlock(statement)) {
      return this.evaluateBlock(statement, environment, moduleKey, depth + 1);
    }
    if (ts.isIfStatement(statement)) {
      return this.evaluateIfStatement(statement, environment, moduleKey, depth + 1);
    }
    if (ts.isThrowStatement(statement)) {
      return new ThrowEvaluationCompletion(
        statement.expression === undefined
          ? EvaluationUndefined
          : this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1),
      );
    }
    if (ts.isExportAssignment(statement)) {
      environment.initializeBinding(
        "default",
        this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1),
        EvaluationBindingKind.Const,
        false,
        statement,
      );
      return new NormalEvaluationCompletion();
    }
    if (ts.isBreakStatement(statement)) {
      return new BreakEvaluationCompletion(statement.label?.text ?? null);
    }
    if (ts.isContinueStatement(statement)) {
      return new ContinueEvaluationCompletion(statement.label?.text ?? null);
    }
    if (ts.isEnumDeclaration(statement)) {
      return this.evaluateEnumDeclaration(statement, environment, moduleKey, depth + 1);
    }
    if (
      ts.isImportDeclaration(statement) ||
      ts.isExportDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEmptyStatement(statement)
    ) {
      return new NormalEvaluationCompletion();
    }

    this.open(EvaluationOpenKind.UnsupportedStatement, `Statement kind ${ts.SyntaxKind[statement.kind]} is not in the evaluator statement set.`, statement, moduleKey);
    return new NormalEvaluationCompletion();
  }

  private evaluateBlock(
    block: ts.Block,
    environment: EvaluationEnvironment,
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
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const bindingKind = bindingKindForDeclarationList(statement.declarationList);
    const mutable = bindingKind !== EvaluationBindingKind.Const;
    for (const declaration of statement.declarationList.declarations) {
      const value = declaration.initializer === undefined
        ? new EvaluationUndefinedValue(declaration)
        : this.evaluateExpression(declaration.initializer, environment, moduleKey, depth + 1);
      this.bindDeclarationName(
        declaration.name,
        value,
        bindingKind,
        mutable,
        declaration,
        environment,
        moduleKey,
        depth + 1,
      );
    }
    return new NormalEvaluationCompletion();
  }

  private bindDeclarationName(
    name: ts.BindingName,
    value: EvaluationValue,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    declaration: ts.Node,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): void {
    if (ts.isIdentifier(name)) {
      environment.initializeBinding(name.text, value, bindingKind, mutable, declaration);
      return;
    }
    if (ts.isObjectBindingPattern(name)) {
      if (value.kind !== EvaluationValueKind.Object) {
        this.open(EvaluationOpenKind.UnsupportedBindingPattern, "Object binding pattern did not receive a known object value.", name, moduleKey);
        return;
      }
      for (const element of name.elements) {
        if (element.dotDotDotToken !== undefined) {
          this.open(EvaluationOpenKind.UnsupportedBindingPattern, "Object rest binding is not represented yet.", element, moduleKey);
          continue;
        }
        const propertyKey = bindingElementPropertyKey(element, environment, moduleKey, depth + 1, this);
        if (propertyKey === null) {
          this.open(EvaluationOpenKind.UnsupportedBindingPattern, "Object binding property key did not reduce to a static key.", element, moduleKey);
          continue;
        }
        const propertyValue = value.properties.get(propertyKey)?.value;
        const boundValue =
          propertyValue === undefined && element.initializer !== undefined
            ? this.evaluateExpression(element.initializer, environment, moduleKey, depth + 1)
            : propertyValue ?? new EvaluationUndefinedValue(element);
        this.bindDeclarationName(
          element.name,
          boundValue,
          bindingKind,
          mutable,
          element,
          environment,
          moduleKey,
          depth + 1,
        );
      }
      return;
    }
    this.open(EvaluationOpenKind.UnsupportedBindingPattern, "Array binding pattern declarations are not represented yet.", name, moduleKey);
  }

  private evaluateEnumDeclaration(
    declaration: ts.EnumDeclaration,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const properties = new Map<string, EvaluationObjectProperty>();
    let nextNumber = 0;
    for (const member of declaration.members) {
      const name = this.readPropertyName(member.name, environment, moduleKey, depth + 1);
      if (name === null) {
        this.open(EvaluationOpenKind.UnsupportedExpression, "Enum member name did not close to a property key.", member.name, moduleKey);
        continue;
      }
      const value = member.initializer === undefined
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
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const condition = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    const truthy = readEvaluationTruthiness(condition);
    if (truthy === null) {
      this.open(EvaluationOpenKind.DynamicBranch, "If statement condition did not reduce to known truthiness.", statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    return truthy
      ? this.evaluateStatementLike(statement.thenStatement, environment, moduleKey, depth + 1)
      : statement.elseStatement === undefined
        ? new NormalEvaluationCompletion()
        : this.evaluateStatementLike(statement.elseStatement, environment, moduleKey, depth + 1);
  }

  private evaluateStatementLike(
    statement: ts.Statement,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    return ts.isBlock(statement)
      ? this.evaluateBlock(statement, environment, moduleKey, depth + 1)
      : this.evaluateStatement(statement, environment, moduleKey, depth + 1);
  }

  private evaluateIdentifier(
    identifier: ts.Identifier,
    environment: EvaluationEnvironment,
    moduleKey: string,
  ): EvaluationValue {
    if (identifier.text === "undefined") {
      return new EvaluationUndefinedValue(identifier);
    }
    const value = environment.readValue(identifier.text);
    if (value === null) {
      return this.unknown(EvaluationOpenKind.UnresolvedIdentifier, `Identifier '${identifier.text}' is not available in the current environment.`, identifier, moduleKey);
    }
    if (value.kind === EvaluationValueKind.Unknown && !value.hasOpenSeam) {
      return this.unknown(EvaluationOpenKind.UnresolvedIdentifier, value.reason, identifier, moduleKey);
    }
    return value;
  }

  private evaluateArrayLiteral(
    literal: ts.ArrayLiteralExpression,
    environment: EvaluationEnvironment,
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
        } else {
          mayHaveUnknownElements = true;
          this.open(EvaluationOpenKind.UnsupportedExpression, "Array spread did not reduce to an array value.", element, moduleKey);
        }
        continue;
      }
      elements.push(new EvaluationArrayElement(
        this.evaluateExpression(element, environment, moduleKey, depth + 1),
        element,
      ));
    }
    return new EvaluationArrayValue(elements, mayHaveUnknownElements, literal);
  }

  private evaluateObjectLiteral(
    literal: ts.ObjectLiteralExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const properties = new Map<string, EvaluationObjectProperty>();
    let mayHaveUnknownProperties = false;
    for (const property of literal.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = this.evaluateExpression(property.expression, environment, moduleKey, depth + 1);
        if (spread.kind === EvaluationValueKind.Object) {
          for (const [key, value] of spread.properties) {
            properties.set(key, value);
          }
          mayHaveUnknownProperties ||= spread.mayHaveUnknownProperties;
        } else {
          mayHaveUnknownProperties = true;
          this.open(EvaluationOpenKind.UnsupportedExpression, "Object spread did not reduce to an object value.", property, moduleKey);
        }
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        const value = this.evaluateIdentifier(property.name, environment, moduleKey);
        properties.set(property.name.text, new EvaluationObjectProperty(property.name.text, value, property));
        continue;
      }
      if (ts.isMethodDeclaration(property)) {
        const name = this.readPropertyName(property.name, environment, moduleKey, depth + 1);
        if (name === null) {
          mayHaveUnknownProperties = true;
          continue;
        }
        properties.set(name, new EvaluationObjectProperty(name, new EvaluationFunctionValue(property, environment.clone(`${moduleKey}:${name}`), property), property));
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const name = this.readPropertyName(property.name, environment, moduleKey, depth + 1);
        if (name === null) {
          mayHaveUnknownProperties = true;
          continue;
        }
        properties.set(name, new EvaluationObjectProperty(
          name,
          this.evaluateExpression(property.initializer, environment, moduleKey, depth + 1),
          property,
        ));
        continue;
      }
      mayHaveUnknownProperties = true;
      this.open(EvaluationOpenKind.UnsupportedExpression, `Object property kind ${ts.SyntaxKind[property.kind]} is not represented yet.`, property, moduleKey);
    }
    return new EvaluationObjectValue(properties, mayHaveUnknownProperties, literal);
  }

  private evaluatePropertyAccess(
    expression: ts.PropertyAccessExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (receiver.kind === EvaluationValueKind.Object) {
      return receiver.properties.get(expression.name.text)?.value
        ?? this.unknown(EvaluationOpenKind.UnsupportedExpression, `Object property '${expression.name.text}' is not statically known.`, expression.name, moduleKey);
    }
    if (receiver.kind === EvaluationValueKind.ModuleNamespace) {
      return receiver.exports.get(expression.name.text)
        ?? this.unknown(EvaluationOpenKind.UnresolvedIdentifier, `Module namespace export '${expression.name.text}' is not statically known.`, expression.name, moduleKey);
    }
    if (receiver.kind === EvaluationValueKind.Array && expression.name.text === "length") {
      return new EvaluationNumberValue(receiver.elements.length, expression.name);
    }
    return this.unknown(EvaluationOpenKind.UnsupportedExpression, "Property access receiver did not reduce to an object value.", expression, moduleKey);
  }

  private evaluateElementAccess(
    expression: ts.ElementAccessExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const receiver = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    const argument = expression.argumentExpression === undefined
      ? EvaluationUndefined
      : this.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
    if (receiver.kind === EvaluationValueKind.Array && argument.kind === EvaluationValueKind.Number) {
      return receiver.elements[argument.value]?.value
        ?? this.unknown(EvaluationOpenKind.UnsupportedExpression, `Array element '${argument.value}' is not statically known.`, expression, moduleKey);
    }
    if (receiver.kind === EvaluationValueKind.Object) {
      const key = readEvaluationPropertyKey(argument);
      if (key !== null) {
        return receiver.properties.get(key)?.value
          ?? this.unknown(EvaluationOpenKind.UnsupportedExpression, `Object property '${key}' is not statically known.`, expression, moduleKey);
      }
    }
    return this.unknown(EvaluationOpenKind.UnsupportedExpression, "Element access did not reduce to a known receiver/key pair.", expression, moduleKey);
  }

  private evaluateCallExpression(
    call: ts.CallExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const args = call.arguments.map((argument) => this.evaluateExpression(argument, environment, moduleKey, depth + 1));
    const context: EvaluationIntrinsicContext = {
      sourceProject: this.sourceProject,
      checker: this.sourceProject.checker,
      evaluator: this,
      environment,
      moduleKey,
    };
    const builtIn = evaluateBuiltInCall(call, args);
    if (builtIn !== null) {
      return builtIn;
    }
    for (const intrinsic of this.#intrinsics) {
      const result = intrinsic.evaluate({ call, args, context });
      if (result !== null) {
        return result;
      }
    }

    const callee = this.evaluateExpression(call.expression, environment, moduleKey, depth + 1);
    if (callee.kind !== EvaluationValueKind.Function) {
      return this.unknown(EvaluationOpenKind.DynamicCall, "Call expression callee did not reduce to a supported function value.", call.expression, moduleKey);
    }
    return this.callFunction(callee, args, call, moduleKey, depth + 1);
  }

  private callFunction(
    value: EvaluationFunctionValue,
    args: readonly EvaluationValue[],
    call: ts.CallExpression,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (++this.#callDepth > this.#maxCallDepth) {
      this.#callDepth--;
      return this.unknown(EvaluationOpenKind.DepthLimit, "Local function call depth limit reached.", call, moduleKey);
    }
    try {
      const frame = value.environment.clone(`${moduleKey}:call:${this.#callDepth}`);
      value.declaration.parameters.forEach((parameter, index) => {
        if (!ts.isIdentifier(parameter.name)) {
          this.open(EvaluationOpenKind.UnsupportedBindingPattern, "Function parameter binding pattern is not represented yet.", parameter.name, moduleKey);
          return;
        }
        frame.initializeBinding(
          parameter.name.text,
          args[index] ?? EvaluationUndefined,
          EvaluationBindingKind.Parameter,
          true,
          parameter,
        );
      });
      const body = value.declaration.body;
      if (body === undefined) {
        return this.unknown(EvaluationOpenKind.DynamicCall, "Function declaration has no body.", call, moduleKey);
      }
      if (!ts.isBlock(body)) {
        return this.evaluateExpression(body, frame, moduleKey, depth + 1);
      }
      const completion = this.evaluateBlock(body, frame, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Return || completion.kind === EvaluationCompletionKind.Normal) {
        return completion.value;
      }
      return this.unknown(EvaluationOpenKind.DynamicCall, `Function completed with ${completion.kind}.`, call, moduleKey);
    } finally {
      this.#callDepth--;
    }
  }

  private evaluateTemplateExpression(
    expression: ts.TemplateExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    let text = expression.head.text;
    for (const span of expression.templateSpans) {
      const value = this.evaluateExpression(span.expression, environment, moduleKey, depth + 1);
      const key = readEvaluationPropertyKey(value);
      if (key === null) {
        return this.unknown(EvaluationOpenKind.UnsupportedExpression, "Template expression span did not reduce to a primitive stringable value.", span.expression, moduleKey);
      }
      text += key;
      text += span.literal.text;
    }
    return new EvaluationStringValue(text, expression);
  }

  private evaluateBinaryExpression(
    expression: ts.BinaryExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (isAssignmentOperator(expression.operatorToken.kind)) {
      if (!ts.isIdentifier(expression.left)) {
        return this.unknown(EvaluationOpenKind.DynamicMutation, "Assignment left-hand side is not an identifier.", expression.left, moduleKey);
      }
      const value = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
      if (!environment.setBinding(expression.left.text, value)) {
        return this.unknown(EvaluationOpenKind.DynamicMutation, `Assignment could not update binding '${expression.left.text}'.`, expression.left, moduleKey);
      }
      return value;
    }

    const left = this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
    const right = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    switch (expression.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        if (left.kind === EvaluationValueKind.String || right.kind === EvaluationValueKind.String) {
          const leftText = readEvaluationPropertyKey(left);
          const rightText = readEvaluationPropertyKey(right);
          return leftText === null || rightText === null
            ? this.unknown(EvaluationOpenKind.UnsupportedExpression, "String concatenation operand did not reduce to a primitive.", expression, moduleKey)
            : new EvaluationStringValue(`${leftText}${rightText}`, expression);
        }
        if (left.kind === EvaluationValueKind.Number && right.kind === EvaluationValueKind.Number) {
          return new EvaluationNumberValue(left.value + right.value, expression);
        }
        break;
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        return new EvaluationBooleanValue(primitiveComparableValue(left) === primitiveComparableValue(right), expression);
      case ts.SyntaxKind.EqualsEqualsToken:
        return new EvaluationBooleanValue(looselyComparableValue(left) === looselyComparableValue(right), expression);
      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        return new EvaluationBooleanValue(primitiveComparableValue(left) !== primitiveComparableValue(right), expression);
      case ts.SyntaxKind.ExclamationEqualsToken:
        return new EvaluationBooleanValue(looselyComparableValue(left) !== looselyComparableValue(right), expression);
      case ts.SyntaxKind.AmpersandAmpersandToken:
        return readEvaluationTruthiness(left) === false ? left : right;
      case ts.SyntaxKind.BarBarToken:
        return readEvaluationTruthiness(left) === true ? left : right;
      case ts.SyntaxKind.QuestionQuestionToken:
        if (left.kind === EvaluationValueKind.Null || left.kind === EvaluationValueKind.Undefined) {
          return right;
        }
        if (left.kind !== EvaluationValueKind.Unknown) {
          return left;
        }
        break;
    }
    return this.unknown(EvaluationOpenKind.UnsupportedExpression, `Binary operator ${ts.SyntaxKind[expression.operatorToken.kind]} is not supported for these operands.`, expression, moduleKey);
  }

  private evaluateTypeOfExpression(
    expression: ts.TypeOfExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const value = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    switch (value.kind) {
      case EvaluationValueKind.Undefined:
        return new EvaluationStringValue("undefined", expression);
      case EvaluationValueKind.Boolean:
        return new EvaluationStringValue("boolean", expression);
      case EvaluationValueKind.Number:
        return new EvaluationStringValue("number", expression);
      case EvaluationValueKind.BigInt:
        return new EvaluationStringValue("bigint", expression);
      case EvaluationValueKind.String:
        return new EvaluationStringValue("string", expression);
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
        return new EvaluationStringValue("function", expression);
      case EvaluationValueKind.Null:
      case EvaluationValueKind.Array:
      case EvaluationValueKind.Object:
      case EvaluationValueKind.ModuleNamespace:
        return new EvaluationStringValue("object", expression);
      case EvaluationValueKind.Unknown:
        return this.unknown(EvaluationOpenKind.UnsupportedExpression, "typeof operand did not reduce to a known value category.", expression, moduleKey);
    }
  }

  private evaluatePrefixUnaryExpression(
    expression: ts.PrefixUnaryExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operand = this.evaluateExpression(expression.operand, environment, moduleKey, depth + 1);
    switch (expression.operator) {
      case ts.SyntaxKind.ExclamationToken: {
        const truthy = readEvaluationTruthiness(operand);
        return truthy === null
          ? this.unknown(EvaluationOpenKind.UnsupportedExpression, "Unary ! operand did not reduce to known truthiness.", expression, moduleKey)
          : new EvaluationBooleanValue(!truthy, expression);
      }
      case ts.SyntaxKind.MinusToken:
        return operand.kind === EvaluationValueKind.Number
          ? new EvaluationNumberValue(-operand.value, expression)
          : this.unknown(EvaluationOpenKind.UnsupportedExpression, "Unary - operand did not reduce to a number.", expression, moduleKey);
      case ts.SyntaxKind.PlusToken:
        return operand.kind === EvaluationValueKind.Number
          ? operand
          : this.unknown(EvaluationOpenKind.UnsupportedExpression, "Unary + operand did not reduce to a number.", expression, moduleKey);
      default:
        return this.unknown(EvaluationOpenKind.UnsupportedExpression, `Unary operator ${ts.SyntaxKind[expression.operator]} is not supported.`, expression, moduleKey);
    }
  }

  private evaluateConditionalExpression(
    expression: ts.ConditionalExpression,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const condition = this.evaluateExpression(expression.condition, environment, moduleKey, depth + 1);
    const truthy = readEvaluationTruthiness(condition);
    if (truthy === null) {
      return this.unknown(EvaluationOpenKind.DynamicBranch, "Conditional expression condition did not reduce to known truthiness.", expression.condition, moduleKey);
    }
    return this.evaluateExpression(truthy ? expression.whenTrue : expression.whenFalse, environment, moduleKey, depth + 1);
  }

  private readPropertyName(
    name: ts.PropertyName,
    environment: EvaluationEnvironment,
    moduleKey: string,
    depth: number,
  ): string | null {
    if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
      return name.text;
    }
    if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
      return readEvaluationPropertyKey(this.evaluateExpression(name.expression, environment, moduleKey, depth + 1));
    }
    return null;
  }

  private open(
    openKind: EvaluationOpenKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void {
    this.#openSeams.push(new EvaluationOpenSeam(openKind, summary, node, moduleKey));
  }

  private unknown(
    openKind: EvaluationOpenKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): EvaluationUnknownValue {
    this.open(openKind, summary, node, moduleKey);
    return new EvaluationUnknownValue(summary, node, true);
  }
}

function skipOuterExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function evaluateBuiltInCall(
  call: ts.CallExpression,
  args: readonly EvaluationValue[],
): EvaluationValue | null {
  const expression = skipOuterExpression(call.expression);
  if (ts.isIdentifier(expression)) {
    switch (expression.text) {
      case "objectFreeze":
      case "tcObjectFreeze":
        return args[0] ?? new EvaluationUndefinedValue(call);
      default:
        return null;
    }
  }
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const receiver = skipOuterExpression(expression.expression);
  if (
    ts.isIdentifier(receiver) &&
    receiver.text === "Object" &&
    expression.name.text === "freeze"
  ) {
    return args[0] ?? new EvaluationUndefinedValue(call);
  }
  if (
    ts.isIdentifier(receiver) &&
    receiver.text === "Symbol" &&
    expression.name.text === "for"
  ) {
    const key = args[0];
    return key?.kind === EvaluationValueKind.String
      ? new EvaluationStringValue(`symbol:${key.value}`, call)
      : new EvaluationUnknownValue("Symbol.for key did not reduce to a string.", call);
  }
  return null;
}

function bindingElementPropertyKey(
  element: ts.BindingElement,
  environment: EvaluationEnvironment,
  moduleKey: string,
  depth: number,
  evaluator: StaticEvaluator,
): string | null {
  const propertyName = element.propertyName;
  if (propertyName === undefined) {
    return ts.isIdentifier(element.name) ? element.name.text : null;
  }
  if (
    ts.isIdentifier(propertyName) ||
    ts.isStringLiteralLike(propertyName) ||
    ts.isNumericLiteral(propertyName)
  ) {
    return propertyName.text;
  }
  if (ts.isComputedPropertyName(propertyName)) {
    return readEvaluationPropertyKey(
      evaluator.evaluateExpression(
        propertyName.expression,
        environment,
        moduleKey,
        depth + 1,
      ),
    );
  }
  return null;
}

function bindingKindForDeclarationList(list: ts.VariableDeclarationList): EvaluationBindingKind {
  if ((list.flags & ts.NodeFlags.Const) !== 0) {
    return EvaluationBindingKind.Const;
  }
  if ((list.flags & ts.NodeFlags.Let) !== 0) {
    return EvaluationBindingKind.Let;
  }
  return EvaluationBindingKind.Var;
}

function primitiveComparableValue(value: EvaluationValue): string | number | boolean | null | undefined | symbol {
  switch (value.kind) {
    case EvaluationValueKind.Undefined:
      return undefined;
    case EvaluationValueKind.Null:
      return null;
    case EvaluationValueKind.Boolean:
      return value.value;
    case EvaluationValueKind.Number:
      return value.value;
    case EvaluationValueKind.String:
      return value.value;
    case EvaluationValueKind.BigInt:
      return Symbol.for(value.text);
    default:
      return Symbol();
  }
}

function looselyComparableValue(value: EvaluationValue): string | number | boolean | null | symbol {
  return value.kind === EvaluationValueKind.Undefined
    ? null
    : primitiveComparableValue(value) ?? null;
}
