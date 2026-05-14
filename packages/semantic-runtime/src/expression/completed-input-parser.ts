import {
  TokenFlags,
  TokenType,
  hasTokenFlag,
  type Token,
} from "./expression-scanner.js";
import {
  EmptyExpressionSuccess,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionParseResultFlags,
  ExpressionParseResultKind,
  ExpressionSuccess,
  hasExpressionParseResultKindFlag,
} from "./parse-result-algebra.js";
import type {
  EmptyExpressionAst,
  IteratorParseResult,
  PropertyLikeEntryFamily,
  PropertyLikeParseResult,
} from "./parse-result-algebra.js";

import {
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  AssignExpression,
  BinaryExpression,
  BindingIdentifier,
  ConditionalExpression,
  Identifier,
  PrimitiveLiteralExpression,
  UnaryExpression,
} from "./ast.js";
import type { SourceSpan } from "./source-span.js";
import type {
  AssignmentOperator,
  BinaryOperator,
  IsAssign,
  IsBindingBehavior,
  IsBinary,
  IsConditional,
  IsLeftHandSide,
  IsPrimary,
  IsAssignable,
  IsUnary,
  UnaryOperator,
} from "./ast.js";
import { CompletedInputCompanionBuilder } from "./completed-input-companion-builder.js";
import { CompletedInputArrowCorridor } from "./completed-input-arrow-corridor.js";
import { CompletedInputLeftHandSideCorridor } from "./completed-input-left-hand-side-corridor.js";
import { CompletedInputIteratorCorridor } from "./completed-input-iterator-corridor.js";
import { CompletedInputTailCorridor } from "./completed-input-tail-corridor.js";
import { CompletedInputPrimaryCorridor } from "./completed-input-primary-corridor.js";
import { CompletedInputTemplateCorridor } from "./completed-input-template-corridor.js";
import { CompletedInputParserState } from "./completed-input-parser-state.js";
import { CompletedInputPublication } from "./completed-input-publication.js";
import { ExpressionFrameworkErrorCode } from "./framework-error-code.js";
import {
  isParseCompanionFailure,
  isParseFailure,
} from "./parse-failure.js";
import type { ParseOutcome } from "./parse-failure.js";

type ParsedPrimary = ParseOutcome<IsPrimary>;
type ParsedLeftHandSide = ParseOutcome<IsLeftHandSide>;
type ParsedUnary = ParseOutcome<IsUnary>;
type ParsedBinary = ParseOutcome<IsBinary>;
type ParsedConditional = ParseOutcome<IsConditional>;
type ParsedAssign = ParseOutcome<IsAssign>;
type ParsedBindingBehavior = ParseOutcome<IsBindingBehavior>;
type ParsedAssignable = ParseOutcome<IsAssignable>;

class BinaryOperatorInfo {
  constructor(
    readonly operator: BinaryOperator,
    readonly precedence: number,
    readonly isRightAssociative: boolean,
  ) {}
}

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

/**
 * Strict completed-input parser for Aurelia's binding expression language.
 *
 * This class owns the grammar-preserving core for ordinary property-like
 * expression parsing and delegates iterator-header-specific law to the
 * dedicated iterator corridor:
 * - consumes tokens from the shared parser-state cursor
 * - produces canonical expression AST carriers
 * - attaches SourceSpan (with optional file) to every node
 * - lifts parser-local failure state into family-native companion publication
 *   at its public boundary for property-like entry
 * - hands primary-special parsing off to `CompletedInputPrimaryCorridor`
 * - hands left-hand-side member/call/index law off to
 *   `CompletedInputLeftHandSideCorridor`
 * - hands iterator header/declaration/separator/tail-split parsing off to
 *   `CompletedInputIteratorCorridor`
 * - hands template-literal scanning/publication off to
 *   `CompletedInputTemplateCorridor`
 * - hands arrow-specific head/body law off to
 *   `CompletedInputArrowCorridor`
 *
 * Shared parser mechanics now live in
 * `completed-input-parser-state.ts`:
 * - scanner/checkpoint state
 * - delimiter tracking
 * - span/provenance helpers
 * - parser-local failure construction and retention
 *
 * Entry-family selection across parser families and interpolation-specific
 * scanning/publication still belong to the higher-level ExpressionParser
 * orchestration layer.
 *
 * TODO: The next internal split, if needed, is no longer parser-state,
 * iterator-header law, generic companion building, template scanning, the
 * primary-special corridor, the left-hand-side member/call/index corridor,
 * arrow-specific head/body law, or tail handling. The remaining seam is the
 * precedence/assignment pipeline itself, and that should only split if a real
 * later entry family or operator-law divergence appears.
 */
export class CompletedInputParser {
  private static readonly binaryNullish = new BinaryOperatorInfo("??", 1, false);
  private static readonly binaryOr = new BinaryOperatorInfo("||", 2, false);
  private static readonly binaryAnd = new BinaryOperatorInfo("&&", 3, false);
  private static readonly binaryLooseEqual = new BinaryOperatorInfo("==", 4, false);
  private static readonly binaryStrictEqual = new BinaryOperatorInfo("===", 4, false);
  private static readonly binaryLooseNotEqual = new BinaryOperatorInfo("!=", 4, false);
  private static readonly binaryStrictNotEqual = new BinaryOperatorInfo("!==", 4, false);
  private static readonly binaryLessThan = new BinaryOperatorInfo("<", 5, false);
  private static readonly binaryLessThanOrEqual = new BinaryOperatorInfo("<=", 5, false);
  private static readonly binaryGreaterThan = new BinaryOperatorInfo(">", 5, false);
  private static readonly binaryGreaterThanOrEqual = new BinaryOperatorInfo(">=", 5, false);
  private static readonly binaryInstanceof = new BinaryOperatorInfo("instanceof", 5, false);
  private static readonly binaryIn = new BinaryOperatorInfo("in", 5, false);
  private static readonly binaryPlus = new BinaryOperatorInfo("+", 6, false);
  private static readonly binaryMinus = new BinaryOperatorInfo("-", 6, false);
  private static readonly binaryMultiply = new BinaryOperatorInfo("*", 7, false);
  private static readonly binaryDivide = new BinaryOperatorInfo("/", 7, false);
  private static readonly binaryModulo = new BinaryOperatorInfo("%", 7, false);
  private static readonly binaryExponent = new BinaryOperatorInfo("**", 8, true);

  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;
  private readonly arrowCorridor: CompletedInputArrowCorridor;
  private readonly primaryCorridor: CompletedInputPrimaryCorridor;
  private readonly leftHandSideCorridor: CompletedInputLeftHandSideCorridor;
  private readonly iteratorCorridor: CompletedInputIteratorCorridor;
  private readonly tailCorridor: CompletedInputTailCorridor;
  private readonly templateCorridor: CompletedInputTemplateCorridor;

  constructor(source: string, baseSpan: SourceSpan | null = null) {
    this.state = new CompletedInputParserState(source, baseSpan);
    this.companionBuilder = new CompletedInputCompanionBuilder(this.state);
    this.templateCorridor = new CompletedInputTemplateCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      parseHoleExpression: (nestedSource, nestedBaseSpan) => {
        const inner = new CompletedInputParser(nestedSource, nestedBaseSpan);
        const expr = inner.parseAssignExpr();
        const trailing = inner.state.peekToken();
        if (trailing.type !== TokenType.EOF) {
          inner.state.failures.error(
            "Unexpected token after end of template expression",
            trailing,
            ExpressionFrameworkErrorCode.ParseUnconsumedToken,
          );
        }
        return inner.state.failures.retainedFailure ?? expr;
      },
    });
    this.primaryCorridor = new CompletedInputPrimaryCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      templateCorridor: this.templateCorridor,
      parseAssignExpr: () => this.parseAssignExpr(),
      identifierFromToken: (token) => this.identifierFromToken(token),
      tokenToIdentifierName: (token) => this.tokenToIdentifierName(token),
      isIdentifierNameToken: (token) => this.isIdentifierNameToken(token),
      isGlobalName: (name) => CompletedInputParser.globalNames.has(name),
    });
    this.arrowCorridor = new CompletedInputArrowCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      parseAssignExpr: () => this.parseAssignExpr(),
      bindingIdentifierFromToken: (token) => this.bindingIdentifierFromToken(token),
    });
    this.leftHandSideCorridor = new CompletedInputLeftHandSideCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      templateCorridor: this.templateCorridor,
      parseAssignExpr: () => this.parseAssignExpr(),
      parsePrimaryExpr: () => this.parsePrimaryExpr(),
      canStartPrimaryExpression: (token) => this.primaryCorridor.canStartExpression(token),
      identifierFromToken: (token) => this.identifierFromToken(token),
      isIdentifierNameToken: (token) => this.isIdentifierNameToken(token),
    });
    this.iteratorCorridor = new CompletedInputIteratorCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      parseAssignExpr: () => this.parseAssignExpr(),
      parseTails: (core) => this.parseTails(core),
      bindingIdentifierFromToken: (token) => this.bindingIdentifierFromToken(token),
    });
    this.tailCorridor = new CompletedInputTailCorridor({
      state: this.state,
      companionBuilder: this.companionBuilder,
      parseAssignExpr: () => this.parseAssignExpr(),
      identifierFromToken: (token) => this.identifierFromToken(token),
    });
  }

  // ------------------------------------------------------------------------------------------
  // Public entry point
  // ------------------------------------------------------------------------------------------

  /**
   * Parse a general binding expression (used for both IsProperty / IsFunction).
   * Grammar: CoreExpression Tails EOF
   */
  public parsePropertyLike(entryFamily: PropertyLikeEntryFamily): PropertyLikeParseResult {
    // TODO: `IsFunction` currently shares the property-like grammar and result
    // surface. If later tooling needs command-specific restrictions or more
    // faithful function-entry semantics, split that at the entry-family
    // boundary rather than forking the grammar opportunistically mid-parse.
    const result = this.parsePropertyLikeBody(entryFamily);
    if (result.kind === ExpressionParseResultKind.CompleteInputParseError) {
      return result;
    }
    if (hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.Companion)) {
      return result;
    }

    const eof = this.state.peekToken();
    if (eof.type !== TokenType.EOF) {
      const frameworkErrorCode = eof.type === TokenType.KeywordOf
        ? ExpressionFrameworkErrorCode.ParseUnexpectedKeywordOf
        : ExpressionFrameworkErrorCode.ParseUnconsumedToken;
      return CompletedInputPublication.toParseError(
        entryFamily,
        this.state.failures.hardError(
          "Unexpected token after end of expression",
          eof,
          frameworkErrorCode,
        ),
      );
    }

    return result;
  }

  private parsePropertyLikeBody(entryFamily: PropertyLikeEntryFamily): PropertyLikeParseResult {
    const first = this.state.peekToken();
    if (first.type === TokenType.EOF) {
      const ast = new PrimitiveLiteralExpression(this.state.span(0, 0), '') as EmptyExpressionAst;
      return new EmptyExpressionSuccess(entryFamily, ast.span, ast);
    }

    const core = this.parseAssignExpr();
    if (isParseFailure(core)) {
      return CompletedInputPublication.toPropertyLikeResult(entryFamily, core);
    }
    const withTails = this.parseTails(core);
    if (isParseFailure(withTails)) {
      return CompletedInputPublication.toPropertyLikeResult(entryFamily, withTails);
    }

    if (this.state.failures.retainedFailure) {
      return CompletedInputPublication.toPropertyLikeResult(entryFamily, this.state.failures.retainedFailure);
    }

    return new ExpressionSuccess(
      entryFamily,
      withTails.span,
      withTails,
    );
  }

  /**
   * Parse a complete repeat.for header: `lhs of rhs[; tail...]`.
   *
   * - LHS: BindingIdentifier | ArrayBindingPattern | ObjectBindingPattern
   * - RHS: parsed like a normal binding expression, but stops at first top‑level ';'
   * - semiIdx: character index of that ';' in the header string, or -1 if none
   *
   * The returned ForOfStatement.span covers the entire header string (0..source.length).
   */
  public parseIteratorHeader(): IteratorParseResult {
    return this.iteratorCorridor.parseHeader();
  }

  // ------------------------------------------------------------------------------------------
  // Precedence pipeline
  // ------------------------------------------------------------------------------------------

  // AssignExpr ::= ConditionalExpr
  //              | LeftHandSide AssignmentOperator AssignExpr
  //              | ArrowFunction (identifier or parenthesized parameters)
  private parseAssignExpr(): ParsedAssign {
    const first = this.state.peekToken();

    // Parenthesized arrow heads own their own companion corridor now instead of
    // relying on a scanner-only probe. If the attempt proves the text is not an
    // arrow head, we roll back and let the ordinary parenthesized-expression
    // lane handle it.
    if (first.type === TokenType.OpenParen) {
      const arrow = this.arrowCorridor.tryParseParenthesized(first);
      if (arrow !== null) {
        return arrow;
      }
    }

    const left = this.parseConditionalExpr();
    if (isParseFailure(left)) return left;

    const next = this.state.peekToken();

    // Arrow function: <identifier> => <body>
    if (next.type === TokenType.EqualsGreaterThan) {
      return this.arrowCorridor.parseFromLeft(left);
    }

    // Assignment
    const op = this.getAssignmentOperator(next.type);
    if (op == null) {
      return left;
    }

    this.state.nextToken(); // consume op
    const target = this.ensureAssignable(left, next);
    if (isParseFailure(target)) return target;
    const value = this.parseAssignExpr();
    if (isParseFailure(value)) {
      if (isParseCompanionFailure(value)) {
        return value;
      }
        return this.companionBuilder.missingExpressionGapFailure(
          value,
          next,
          ExpressionCompanionFrameKind.AssignmentExpression,
          this.state.span(this.state.localStart(target), next.end),
          [this.state.prefixRefs.root(target)],
        );
      }
    const span = this.state.spanFrom(target, value);

    const assign: AssignExpression = new AssignExpression(
      span,
      target,
      value,
      op,
    );
    return assign;
  }


  // ConditionalExpr ::= BinaryExpr [ "?" AssignExpr ":" AssignExpr ]
  private parseConditionalExpr(): ParsedConditional {
    const test = this.parseBinaryExpr(0);
    if (isParseFailure(test)) {
      return test;
    }
    const q = this.state.peekToken();
    if (q.type !== TokenType.Question) {
      return test;
    }

    this.state.nextToken(); // '?'
    const yes = this.parseAssignExpr();
    if (isParseFailure(yes)) {
      if (isParseCompanionFailure(yes)) {
        return yes;
      }
      return this.companionBuilder.missingTernaryArmFailure(
        yes,
        q,
        this.state.span(this.state.localStart(test), q.end),
        [this.state.prefixRefs.root(test)],
      );
    }
    const colon = this.state.peekToken();
    if (colon.type !== TokenType.Colon) {
      return this.companionBuilder.frontierOnlyFailure(
        "Expected ':' in conditional expression",
        colon,
        ExpressionFrontierKind.AmbiguousClosure,
        [ExpressionExpectedContinuationClass.Colon],
        ExpressionCompanionFrameKind.ConditionalExpression,
        this.state.span(this.state.localStart(test), this.state.localEnd(yes)),
        [
          this.state.prefixRefs.root(test),
          this.state.prefixRefs.child(yes),
        ],
      );
    }
    this.state.nextToken(); // ':'
    const no = this.parseAssignExpr();
    if (isParseFailure(no)) {
      if (isParseCompanionFailure(no)) {
        return no;
      }
      return this.companionBuilder.missingTernaryArmFailure(
        no,
        colon,
        this.state.span(this.state.localStart(test), colon.end),
        [
          this.state.prefixRefs.root(test),
          this.state.prefixRefs.child(yes),
        ],
      );
    }

    const span = this.state.spanFrom(test, no);

    const cond: ConditionalExpression = new ConditionalExpression(
      span,
      test,
      yes,
      no,
    );
    return cond;
  }

  // BinaryExpr - standard precedence climbing implementation.
  private parseBinaryExpr(minPrecedence: number): ParsedBinary {
    const first = this.parseUnaryExpr();
    let left: IsBinary;
    if (isParseFailure(first)) return first;
    left = first;

    while (true) {
      const look = this.state.peekToken();
      const info = this.getBinaryOpInfo(look.type);
      if (info == null || info.precedence < minPrecedence) {
        break;
      }

      this.state.nextToken(); // consume operator
      const nextMin = info.isRightAssociative ? info.precedence : info.precedence + 1;
      const right = this.parseBinaryExpr(nextMin);
      if (isParseFailure(right)) {
        if (isParseCompanionFailure(right)) {
          return right;
        }
        return this.companionBuilder.missingExpressionGapFailure(
          right,
          look,
          ExpressionCompanionFrameKind.BinaryExpression,
          this.state.span(this.state.localStart(left), look.end),
          [this.state.prefixRefs.root(left)],
        );
      }

      const span = this.state.spanFrom(left, right);

      const binary: BinaryExpression = new BinaryExpression(
        span,
        info.operator,
        left,
        right,
      );

      left = binary;
    }

    return left;
  }

  // UnaryExpr ::= PostfixExpr
  //             | ("!" | "+" | "-" | "typeof" | "void" | "++" | "--") UnaryExpr
  private parseUnaryExpr(): ParsedUnary {
    const t = this.state.peekToken();

    // Prefix unary
    const op = this.getPrefixUnaryOperator(t.type);
    if (op != null) {
      this.state.nextToken(); // consume operator
      const operand = this.parseUnaryExpr();
      if (isParseFailure(operand)) {
        if (isParseCompanionFailure(operand)) {
          return this.companionBuilder.widenFailureToFrame(
            operand,
            ExpressionCompanionFrameKind.UnaryExpression,
            this.state.span(t.start, this.state.failurePreservedEnd(operand)),
            [],
          );
        }
        return this.companionBuilder.missingExpressionGapFailure(
          operand,
          t,
          ExpressionCompanionFrameKind.UnaryExpression,
          this.state.span(t.start, t.end),
          [],
        );
      }
      const span = this.state.spanFrom(t.start, operand);
      const unary: UnaryExpression = new UnaryExpression(
        span,
        op,
        operand,
        0,
      );
      return unary;
    }

    // Postfix ++ / --
    const lhs = this.parseLeftHandSideExpr();
    if (isParseFailure(lhs)) return lhs;
    const next = this.state.peekToken();
    if (
      next.type === TokenType.PlusPlus ||
      next.type === TokenType.MinusMinus
    ) {
      this.state.nextToken(); // consume ++/--
      const opStr: UnaryOperator =
        next.type === TokenType.PlusPlus ? "++" : "--";

      const assignable = this.ensureAssignable(lhs, next);
      if (isParseFailure(assignable)) return assignable;
      const span = this.state.spanFrom(assignable, next.end);

      const unary: UnaryExpression = new UnaryExpression(
        span,
        opStr,
        assignable as IsLeftHandSide,
        1,
      );
      return unary;
    }

    return lhs;
  }

  // LeftHandSide ::= NewExpr | MemberExpr
  private parseLeftHandSideExpr(): ParsedLeftHandSide {
    return this.leftHandSideCorridor.parse();
  }

  // PrimaryExpr
  private parsePrimaryExpr(): ParsedPrimary {
    return this.primaryCorridor.parse();
  }

  // ------------------------------------------------------------------------------------------
  // Tails: value converters & binding behaviors
  // ------------------------------------------------------------------------------------------

  private parseTails(core: IsAssign): ParsedBindingBehavior {
    return this.tailCorridor.parse(core);
  }

  private identifierFromToken(t: Token): Identifier {
    return new Identifier(
      this.state.spanFromToken(t),
      this.tokenToIdentifierName(t),
    );
  }

  /**
   * Create a BindingIdentifier from an already-consumed identifier token,
   * enforcing the same 'import' restriction as identifier primaries.
   */
  private bindingIdentifierFromToken(t: Token): ParseOutcome<BindingIdentifier> {
    const name = t.value as string;
    if (name === "import") {
      return this.state.failures.error(
        "Bare 'import' is not allowed in binding expressions",
        t,
        ExpressionFrameworkErrorCode.ParseUnexpectedKeywordImport,
      );
    }
    const identifier = this.identifierFromToken(t);
    const id: BindingIdentifier = new BindingIdentifier(
      identifier.span,
      identifier,
    );
    return id;
  }

  // Assignment operators
  private getAssignmentOperator(type: TokenType): AssignmentOperator | null {
    if (!hasTokenFlag(type, TokenFlags.AssignmentOperator)) {
      return null;
    }

    switch (type) {
      case TokenType.Equals:
        return "=";
      case TokenType.SlashEquals:
        return "/=";
      case TokenType.AsteriskEquals:
        return "*=";
      case TokenType.PlusEquals:
        return "+=";
      case TokenType.MinusEquals:
        return "-=";
      default:
        return null;
    }
  }

  // Binary operator table (precedence, associativity)
  private getBinaryOpInfo(
    type: TokenType,
  ): BinaryOperatorInfo | null {
    switch (type) {
      case TokenType.QuestionQuestion:
        return CompletedInputParser.binaryNullish;
      case TokenType.BarBar:
        return CompletedInputParser.binaryOr;
      case TokenType.AmpersandAmpersand:
        return CompletedInputParser.binaryAnd;

      case TokenType.EqualsEquals:
        return CompletedInputParser.binaryLooseEqual;
      case TokenType.EqualsEqualsEquals:
        return CompletedInputParser.binaryStrictEqual;
      case TokenType.ExclamationEquals:
        return CompletedInputParser.binaryLooseNotEqual;
      case TokenType.ExclamationEqualsEquals:
        return CompletedInputParser.binaryStrictNotEqual;

      case TokenType.LessThan:
        return CompletedInputParser.binaryLessThan;
      case TokenType.LessThanOrEqual:
        return CompletedInputParser.binaryLessThanOrEqual;
      case TokenType.GreaterThan:
        return CompletedInputParser.binaryGreaterThan;
      case TokenType.GreaterThanOrEqual:
        return CompletedInputParser.binaryGreaterThanOrEqual;
      case TokenType.KeywordInstanceof:
        return CompletedInputParser.binaryInstanceof;
      case TokenType.KeywordIn:
        return CompletedInputParser.binaryIn;

      case TokenType.Plus:
        return CompletedInputParser.binaryPlus;
      case TokenType.Minus:
        return CompletedInputParser.binaryMinus;

      case TokenType.Asterisk:
        return CompletedInputParser.binaryMultiply;
      case TokenType.Slash:
        return CompletedInputParser.binaryDivide;
      case TokenType.Percent:
        return CompletedInputParser.binaryModulo;

      case TokenType.StarStar:
        return CompletedInputParser.binaryExponent;

      default:
        return null;
    }
  }

  // Prefix unary operators
  private getPrefixUnaryOperator(type: TokenType): UnaryOperator | null {
    if (!hasTokenFlag(type, TokenFlags.PrefixUnaryOperator)) {
      return null;
    }

    switch (type) {
      case TokenType.Exclamation:
        return "!";
      case TokenType.Plus:
        return "+";
      case TokenType.Minus:
        return "-";
      case TokenType.KeywordTypeof:
        return "typeof";
      case TokenType.KeywordVoid:
        return "void";
      case TokenType.PlusPlus:
        return "++";
      case TokenType.MinusMinus:
        return "--";
      default:
        return null;
    }
  }

  private isIdentifierNameToken(t: Token): boolean {
    return hasTokenFlag(t.type, TokenFlags.IdentifierName);
  }

  private tokenToIdentifierName(t: Token): string {
    return String(t.value);
  }

  private ensureAssignable(
    expr: IsBinary | ConditionalExpression | IsLeftHandSide,
    opToken: Token,
  ): ParsedAssignable {
    switch ((expr as { $kind?: string } | null | undefined)?.$kind) {
      case "AccessScope":
      case "AccessKeyed":
      case "AccessMember":
      case "Assign":
        return expr as
          | AccessScopeExpression
          | AccessKeyedExpression
          | AccessMemberExpression
          | AssignExpression;
      default:
        return this.state.failures.error(
          "Left-hand side is not assignable",
          opToken,
          ExpressionFrameworkErrorCode.ParseLeftHandSideNotAssignable,
        );
    }
  }

  // Global identifier allow-list for AccessGlobal.
  private static readonly globalNames = new Set<string>([
    "Infinity",
    "NaN",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "Array",
    "BigInt",
    "Boolean",
    "Date",
    "Map",
    "Number",
    "Object",
    "RegExp",
    "Set",
    "String",
    "JSON",
    "Math",
    "Intl",
  ]);
}

