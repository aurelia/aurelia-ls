import { Scanner, TokenType, type Token, CharCode } from "./expression-scanner.js";

/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AnyBindingExpression,
  AssignmentOperator,
  BinaryOperator,
  BinaryExpression,
  BindingBehaviorExpression,
  BindingIdentifier,
  AssignExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionType,
  ForOfStatement,
  Interpolation,
  IsAssign,
  IsBindingBehavior,
  IsBinary,
  IsLeftHandSide,
  IsPrimary,
  IsUnary,
  IsValueConverter,
  NewExpression,
  TextSpan,
  UnaryExpression,
  UnaryOperator,
  ValueConverterExpression,
  AccessThisExpression,
  AccessBoundaryExpression,
  AccessScopeExpression,
  AccessGlobalExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  Identifier,
  PrimitiveLiteralExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  ArrayBindingPattern,
  ObjectBindingPattern,
  BindingPattern,
  BindingPatternDefault,
  BindingPatternHole,
  ParenExpression,
  TemplateExpression,
  TaggedTemplateExpression,
  ArrowFunction,
  CustomExpression,
  BadExpression,
  SourceSpan,
  SourceFileId,
} from "../model/ir.js";

import { normalizeSpan, offsetSpan, spanFromBounds } from "../model/span.js";
import { absoluteSpan, ensureSpanFile } from "../model/source.js";
import { provenanceFromSpan } from "../model/origin.js";

export type { ExpressionType } from "../model/ir.js";

export interface ExpressionParseContext {
  readonly baseSpan?: SourceSpan;
  readonly baseOffset?: number;
  readonly file?: SourceFileId;
}

export interface IExpressionParser {
  parse(expression: string, expressionType: "IsIterator", context?: ExpressionParseContext): ForOfStatement | BadExpression;
  parse(expression: string, expressionType: "Interpolation", context?: ExpressionParseContext): Interpolation;
  parse(expression: string, expressionType: "IsFunction" | "IsProperty", context?: ExpressionParseContext): IsBindingBehavior;
  parse(expression: string, expressionType: "IsCustom", context?: ExpressionParseContext): CustomExpression;
  parse(expression: string, expressionType: ExpressionType, context?: ExpressionParseContext): AnyBindingExpression;
}

type SpanBearing = { span: TextSpan };

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

/**
 * Core expression parser for Aurelia's binding expression language, tailored
 * for LSP usage.
 *
 * This is a fresh implementation that:
 * - consumes tokens from the local Scanner
 * - produces the canonical AST from model/ir.ts
 * - attaches SourceSpan (with optional file) to every node
 *
 * For v1 this parser is intentionally strict - invalid input throws.
 * Error-tolerant / BadExpression based recovery can be layered on later.
 */
export class CoreParser {
  private readonly source: string;
  private readonly scanner: Scanner;
  private readonly baseSpan: SourceSpan | null;
  /** End offset of the last consumed token. */
  private lastTokenEnd = 0;
  /** First parse failure encountered; threaded to the root as BadExpression. */
  private failure: BadExpression | null = null;

  constructor(source: string, baseSpan: SourceSpan | null = null) {
    this.source = source;
    this.baseSpan = baseSpan ? normalizeSpan(baseSpan) : null;
    this.scanner = new Scanner(source);
  }

  private span(start: number, end: number): SourceSpan {
    const local = spanFromBounds(start, end) as SourceSpan;
    if (!this.baseSpan) return local;
    const rebased = absoluteSpan(local, this.baseSpan);
    if (rebased) return rebased;
    const withFile = ensureSpanFile(local, this.baseSpan.file);
    return normalizeSpan(withFile ?? local);
  }

  private toLocal(offset: number): number {
    return this.baseSpan ? offset - this.baseSpan.start : offset;
  }

  // ------------------------------------------------------------------------------------------
  // Public entry point
  // ------------------------------------------------------------------------------------------

  /**
   * Parse a general binding expression (used for both IsProperty / IsFunction).
   * Grammar: CoreExpression Tails EOF
   */
  public parseBindingExpression(): IsBindingBehavior {
    const first = this.peekToken();
    if (first.type === TokenType.EOF) {
      return this.error("Empty expression", first);
    }

    const core = this.parseAssignExpr();
    if (this.isBad(core)) {
      return core;
    }
    const withTails = this.parseTails(core);

    const eof = this.peekToken();
    if (eof.type !== TokenType.EOF) {
      return this.error("Unexpected token after end of expression", eof);
    }

    return this.failure ?? withTails;
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
  public parseIteratorHeader(): ForOfStatement | BadExpression {
    const first = this.peekToken();
    if (first.type === TokenType.EOF) {
      return this.error("Empty iterator header", first);
    }

    const declaration = this.parseLhsBinding();
    if (this.isBad(declaration)) {
      return declaration;
    }

    const ofTok = this.peekToken();
    if (ofTok.type !== TokenType.KeywordOf) {
      return this.error("Expected 'of' in iterator header", ofTok);
    }
    this.nextToken(); // 'of'

    const { expr: iterable, semiIdx } = this.parseChainableRhs();
    if (this.isBad(iterable)) {
      return iterable;
    }

    const span = this.span(0, this.source.length);

    const node: ForOfStatement = {
      $kind: "ForOfStatement",
      span,
      declaration,
      iterable,
      semiIdx,
    };

    return this.failure ?? node;
  }

  // ------------------------------------------------------------------------------------------
  // Precedence pipeline
  // ------------------------------------------------------------------------------------------

  // AssignExpr ::= ConditionalExpr
  //              | LeftHandSide AssignmentOperator AssignExpr
  //              | ArrowFunction (identifier or parenthesized parameters)
  private parseAssignExpr(): IsAssign {
    const first = this.peekToken();

    // Parenthesized arrow head: (a, b) => expr
    if (first.type === TokenType.OpenParen && this.isParenthesizedArrowHead(first)) {
      return this.parseParenthesizedArrowFunction(first);
    }

    const left = this.parseConditionalExpr();
    if (this.isBad(left)) return left;

    const next = this.peekToken();

    // Arrow function: <identifier> => <body>
    if (next.type === TokenType.EqualsGreaterThan) {
      return this.parseArrowFromLeft(left);
    }

    // Assignment
    const op = this.getAssignmentOperator(next.type);
    if (op == null) {
      return left;
    }

    this.nextToken(); // consume op
    const target = this.ensureAssignable(left, next);
    if (this.isBad(target)) return target;
    const value = this.parseAssignExpr();
    if (this.isBad(value)) return value;
    const span = this.spanFrom(target, value);

    const assign: AssignExpression = {
      $kind: "Assign",
      span,
      target,
      value,
      op,
    };
    return assign;
  }


  // ConditionalExpr ::= BinaryExpr [ "?" AssignExpr ":" AssignExpr ]
  private parseConditionalExpr(): IsBinary | ConditionalExpression {
    const test = this.parseBinaryExpr(0);
    if (this.isBad(test)) {
      return test;
    }
    const q = this.peekToken();
    if (q.type !== TokenType.Question) {
      return test;
    }

    this.nextToken(); // '?'
    const yes = this.parseAssignExpr();
    const colon = this.peekToken();
    if (colon.type !== TokenType.Colon) {
      return this.error("Expected ':' in conditional expression", colon);
    }
    this.nextToken(); // ':'
    const no = this.parseAssignExpr();
    if (this.isBad(yes)) return yes;
    if (this.isBad(no)) return no;

    const span = this.spanFrom(test, no);

    const cond: ConditionalExpression = {
      $kind: "Conditional",
      span,
      condition: test,
      yes,
      no,
    };
    return cond;
  }

  // BinaryExpr - standard precedence climbing implementation.
  private parseBinaryExpr(minPrecedence: number): IsBinary {
    let left = this.parseUnaryExpr() as IsBinary;
    if (this.isBad(left)) return left;

    while (true) {
      const look = this.peekToken();
      const info = this.getBinaryOpInfo(look.type);
      if (info == null || info.precedence < minPrecedence) {
        break;
      }

      this.nextToken(); // consume operator
      const nextMin =
        info.associativity === "left" ? info.precedence + 1 : info.precedence;
      const right = this.parseBinaryExpr(nextMin);
      if (this.isBad(right)) return right;

      const span = this.spanFrom(left, right);

      const binary: BinaryExpression = {
        $kind: "Binary",
        span,
        operation: info.operator,
        left,
        right,
      };

      left = binary;
    }

    return left;
  }

  // UnaryExpr ::= PostfixExpr
  //             | ("!" | "+" | "-" | "typeof" | "void" | "++" | "--") UnaryExpr
  private parseUnaryExpr(): IsUnary {
    const t = this.peekToken();

    // Prefix unary
    const op = this.getPrefixUnaryOperator(t.type);
    if (op != null) {
      this.nextToken(); // consume operator
      const operand = this.parseUnaryExpr();
      if (this.isBad(operand)) return operand;
      const span = this.spanFrom(t.start, operand);
      const unary: UnaryExpression = {
        $kind: "Unary",
        span,
        operation: op,
        expression: operand,
        pos: 0,
      };
      return unary;
    }

    // Postfix ++ / --
    const lhs = this.parseLeftHandSideExpr();
    if (this.isBad(lhs)) return lhs;
    const next = this.peekToken();
    if (
      next.type === TokenType.PlusPlus ||
      next.type === TokenType.MinusMinus
    ) {
      this.nextToken(); // consume ++/--
      const opStr: UnaryOperator =
        next.type === TokenType.PlusPlus ? "++" : "--";

      const assignable = this.ensureAssignable(lhs, next);
      const span = this.spanFrom(assignable, next.end);

      const unary: UnaryExpression = {
        $kind: "Unary",
        span,
        operation: opStr,
        expression: assignable as IsLeftHandSide,
        pos: 1,
      };
      return unary;
    }

    return lhs;
  }

  // LeftHandSide ::= NewExpr | MemberExpr
  private parseLeftHandSideExpr(): IsLeftHandSide {
    const t = this.peekToken();
    if (t.type === TokenType.KeywordNew) {
      return this.parseNewExpression();
    }
    return this.parseMemberExpression();
  }

  // NewExpr ::= "new" MemberExpr [ Arguments ]
  private parseNewExpression(): NewExpression | BadExpression {
    const newTok = this.nextToken(); // 'new'
    const func = this.parseMemberExpression();
    if (this.isBad(func)) return func;
    let args: IsAssign[] = [];
    if (this.peekToken().type === TokenType.OpenParen) {
      args = this.parseArguments();
      const badArg = args.find(a => this.isBad(a));
      if (badArg) return badArg;
    }

    const span = this.span(newTok.start, this.lastTokenEnd);

    const node: NewExpression = {
      $kind: "New",
      span,
      func,
      args,
    };
    return node;
  }

  // MemberExpr ::= PrimaryExpr MemberTail*
  private parseMemberExpression(): IsLeftHandSide {
    let expr: IsLeftHandSide = this.parsePrimaryExpr();
    if (this.isBad(expr)) return expr;

    while (true) {
      const t = this.peekToken();

      if (t.type === TokenType.Dot) {
        // obj.prop
        this.nextToken(); // '.'
        const nameTok = this.peekToken();
        if (!this.isIdentifierNameToken(nameTok)) {
          return this.error("Expected identifier after '.'", nameTok);
        }
        this.nextToken();
        const name = this.identifierFromToken(nameTok);
        const span = this.spanFrom(expr, nameTok.end);
        const member: AccessMemberExpression = {
          $kind: "AccessMember",
          span,
          object: expr,
          name,
          optional: false,
        };
        expr = member;
        continue;
      }

      if (t.type === TokenType.QuestionDot) {
        // Optional chaining: ?.prop, ?.[expr], ?.(args)
        this.nextToken(); // '?.'
        const next = this.peekToken();

        if (next.type === TokenType.OpenParen) {
          // func?.(args)
          const args = this.parseArguments();
          const badArgs = args.find(a => this.isBad(a));
          if (badArgs) return badArgs;
          const span = this.spanFrom(expr, this.lastTokenEnd);

          if (this.isAccessScope(expr)) {
            const scope = expr;
            const call: CallScopeExpression = {
              $kind: "CallScope",
              span,
              name: scope.name,
              args,
              ancestor: scope.ancestor,
              optional: true,
            };
            expr = call;
          } else if (this.isAccessMember(expr)) {
            const member = expr;
            const call: CallMemberExpression = {
              $kind: "CallMember",
              span,
              object: member.object,
              name: member.name,
              args,
              optionalMember: member.optional,
              optionalCall: true,
            };
            expr = call;
          } else {
            const call: CallFunctionExpression = {
              $kind: "CallFunction",
              span,
              func: expr,
              args,
              optional: true,
            };
            expr = call;
          }
          continue;
        }

        if (next.type === TokenType.OpenBracket) {
          // obj?.[expr]
          const keyed = this.parseKeyedAccess(expr, true);
          if (this.isBad(keyed)) return keyed;
          expr = keyed;
          continue;
        }

        // obj?.prop
        if (!this.isIdentifierNameToken(next)) {
          return this.error("Expected identifier after '?.'", next);
        }
        this.nextToken();
        const name = this.identifierFromToken(next);
        const span = this.spanFrom(expr, next.end);
        const member: AccessMemberExpression = {
          $kind: "AccessMember",
          span,
          object: expr,
          name,
          optional: true,
        };
        expr = member;
        continue;
      }

      if (t.type === TokenType.OpenBracket) {
        // obj[expr]
        const keyed = this.parseKeyedAccess(expr, false);
        if (this.isBad(keyed)) return keyed;
        expr = keyed;
        continue;
      }

      if (t.type === TokenType.OpenParen) {
        // Function / method / scope call
        const args = this.parseArguments();
        const badArgs = args.find(a => this.isBad(a));
        if (badArgs) return badArgs;
        const span = this.spanFrom(expr, this.lastTokenEnd);

        if (this.isAccessScope(expr)) {
          const scope = expr;
          const call: CallScopeExpression = {
            $kind: "CallScope",
            span,
            name: scope.name,
            args,
            ancestor: scope.ancestor,
            optional: false,
          };
          expr = call;
        } else if (this.isAccessGlobal(expr)) {
          const global = expr;
          const call: CallGlobalExpression = {
            $kind: "CallGlobal",
            span,
            name: global.name,
            args,
          };
          expr = call;
        } else if (this.isAccessMember(expr)) {
          const member = expr;
          const call: CallMemberExpression = {
            $kind: "CallMember",
            span,
            object: member.object,
            name: member.name,
            args,
            optionalMember: member.optional,
            optionalCall: false,
          };
          expr = call;
        } else {
          // Generic func(expression) – func is the result of an expression.
          const call: CallFunctionExpression = {
            $kind: "CallFunction",
            span,
            func: expr,
            args,
            optional: false,
          };
          expr = call;
        }
        continue;
      }

      if (t.type === TokenType.Backtick) {
        const tpl = this.parseTemplateLiteral();
        if (this.isBad(tpl)) return tpl;
        const span = this.spanFrom(expr, tpl);
        const tagged: TaggedTemplateExpression = {
          $kind: "TaggedTemplate",
          span,
          func: expr,
          cooked: tpl.cooked,
          expressions: tpl.expressions,
        };
        expr = tagged;
        continue;
      }

      break;
    }

    return expr;
  }

  // Helper for obj[expr] / obj?.[expr]
  private parseKeyedAccess(
    object: IsLeftHandSide,
    optional: boolean,
  ): AccessKeyedExpression | BadExpression {
    this.nextToken(); // '['
    const key = this.parseAssignExpr();
    if (this.isBad(key)) return key;
    const close = this.peekToken();
    if (close.type !== TokenType.CloseBracket) {
      return this.error("Expected ']' in indexed access", close);
    }
    this.nextToken(); // ']'

    const span = this.spanFrom(object, this.lastTokenEnd);
    const node: AccessKeyedExpression = {
      $kind: "AccessKeyed",
      span,
      object,
      key,
      optional,
    };
    return node;
  }

  // Arguments ::= "(" [ AssignExpr ( "," AssignExpr )* ] ")"
  private parseArguments(): IsAssign[] {
    const open = this.peekToken();
    if (open.type !== TokenType.OpenParen) {
      return [this.error("Expected '(' for argument list", open)];
    }
    this.nextToken(); // '('

    const args: IsAssign[] = [];
    const first = this.peekToken();
    if (first.type === TokenType.CloseParen) {
      this.nextToken();
      return args;
    }

    while (true) {
      const expr = this.parseAssignExpr();
      args.push(expr);

      const t = this.peekToken();
      if (t.type === TokenType.Comma) {
        this.nextToken(); // ','
        // Allow trailing comma before ')'
        const next = this.peekToken();
        if (next.type === TokenType.CloseParen) {
          this.nextToken();
          break;
        }
        continue;
      }

      if (t.type === TokenType.CloseParen) {
        this.nextToken();
        break;
      }

      return [this.error("Expected ',' or ')' in argument list", t)];
    }

    return args;
  }

  // PrimaryExpr
  private parsePrimaryExpr(): IsPrimary {
    const t = this.peekToken();

    switch (t.type) {
      case TokenType.BooleanLiteral:
      case TokenType.NullLiteral:
      case TokenType.UndefinedLiteral:
      case TokenType.NumericLiteral:
      case TokenType.StringLiteral: {
        if (t.unterminated) {
          return this.error("Unterminated string literal", t);
        }
        this.nextToken();
        const node: PrimitiveLiteralExpression = {
          $kind: "PrimitiveLiteral",
          span: this.spanFromToken(t),
          value: t.value,
        };
        return node;
      }

      case TokenType.Identifier: {
        return this.parseIdentifierPrimary();
      }

      case TokenType.KeywordThis: {
        this.nextToken();
        const node: AccessBoundaryExpression = {
          $kind: "AccessBoundary",
          span: this.spanFromToken(t),
        };
        return node;
      }

      case TokenType.KeywordDollarThis:
      case TokenType.KeywordDollarParent: {
        return this.parseScopeSpecialPrimary();
      }

      case TokenType.OpenBracket: {
        return this.parseArrayLiteral();
      }

      case TokenType.OpenBrace: {
        return this.parseObjectLiteral();
      }

      case TokenType.OpenParen: {
        // Parenthesized expression - keep an explicit AST node for tooling.
        const open = this.nextToken(); // '('
        const expr = this.parseAssignExpr();
        if (this.isBad(expr)) return expr;
        const close = this.peekToken();
        if (close.type !== TokenType.CloseParen) {
          return this.error("Expected ')' to close parenthesized expression", close);
        }
        this.nextToken(); // ')'
        const node: ParenExpression = {
          $kind: "Paren",
          span: this.span(open.start, close.end),
          expression: expr,
        };
        return node;
      }

      case TokenType.Backtick: {
        return this.parseTemplateLiteral();
      }
    }

    return this.error(`Unexpected token ${t.type} in primary expression`, t);
  }

  // Identifier primary - classify as global vs scope.
  private parseIdentifierPrimary(): IsPrimary {
    const t = this.peekToken();
    if (t.type !== TokenType.Identifier) {
      return this.error("Expected identifier", t);
    }
    this.nextToken();

    const name = this.tokenToIdentifierName(t);
    if (name === "import") {
      return this.error("Bare 'import' is not allowed in binding expressions", t);
    }
    const identifier = this.identifierFromToken(t);

    if (CoreParser.globalNames.has(name)) {
      const node: AccessGlobalExpression = {
        $kind: "AccessGlobal",
        span: this.spanFromToken(t),
        name: identifier,
      };
      return node;
    }

    const node: AccessScopeExpression = {
      $kind: "AccessScope",
      span: this.spanFromToken(t),
      name: identifier,
      ancestor: 0,
    };
    return node;
  }

  /**
   * Scope specials:
   * - $this              → AccessThis(0)
   * - $parent.$parent... → AccessThis(n)
   * - $this.foo          → AccessScope("foo", 0)
   * - $parent.$parent.x  → AccessScope("x", n)
   * - After a dot, $this/$parent tokens are treated as identifier names.
   */
  private parseScopeSpecialPrimary(): IsPrimary {
    const first = this.peekToken();
    this.nextToken(); // $this / $parent
    const start = first.start;

    if (first.type === TokenType.KeywordDollarThis) {
      const dot = this.peekToken();
      if (dot.type === TokenType.Dot) {
        // $this.<name> → AccessScope(name, 0)
        this.nextToken(); // '.'
        const nameTok = this.peekToken();
        if (!this.isIdentifierNameToken(nameTok)) {
          return this.error("Expected identifier after '$this.'", nameTok);
        }
        this.nextToken();
        const name = this.identifierFromToken(nameTok);
        const span = this.span(start, nameTok.end);
        const node: AccessScopeExpression = {
          $kind: "AccessScope",
          span,
          name,
          ancestor: 0,
        };
        return node;
      }

      const node: AccessThisExpression = {
        $kind: "AccessThis",
        span: this.span(start, first.end),
        ancestor: 0,
      };
      return node;
    }

    // $parent chain
    let ancestor = 1;

    // Collapse $parent.$parent... at the start.
    while (true) {
      const dot = this.peekToken();
      if (dot.type !== TokenType.Dot) {
        break;
      }
      this.nextToken(); // '.'
      const maybeParent = this.peekToken();
      if (maybeParent.type === TokenType.KeywordDollarParent) {
        // another hop
        this.nextToken();
        ancestor++;
        continue;
      }

      // Not another $parent: treat this as member access and fall back to
      // AccessScope(name, ancestor).
      if (!this.isIdentifierNameToken(maybeParent)) {
        return this.error("Expected identifier after '$parent.'", maybeParent);
      }
      this.nextToken();
      const name = this.identifierFromToken(maybeParent);
      const span = this.span(start, maybeParent.end);
      const node: AccessScopeExpression = {
        $kind: "AccessScope",
        span,
        name,
        ancestor,
      };
      return node;
    }

    // Only hops, no trailing property.
    const node: AccessThisExpression = {
      $kind: "AccessThis",
      span: this.span(start, this.lastTokenEnd || first.end),
      ancestor,
    };
    return node;
  }

  // ArrayLiteral ::= "[" [ ( elision | AssignExpr ) ( "," ( elision | AssignExpr ) )* ] "]"
  private parseArrayLiteral(): ArrayLiteralExpression | BadExpression {
    const open = this.peekToken();
    this.nextToken(); // '['
    const start = open.start;

    const elements: IsAssign[] = [];
    const first = this.peekToken();
    if (first.type === TokenType.CloseBracket) {
      this.nextToken();
      const span = this.span(start, this.lastTokenEnd);
      return {
        $kind: "ArrayLiteral",
        span,
        elements,
      };
    }

    while (true) {
      const t = this.peekToken();

      if (t.type === TokenType.Comma) {
        // Elision / hole
        this.nextToken();
        const hole: PrimitiveLiteralExpression = {
          $kind: "PrimitiveLiteral",
          span: this.spanFromToken(t),
          value: undefined,
        };
        elements.push(hole);
        continue;
      }

      if (t.type === TokenType.CloseBracket) {
        this.nextToken();
        break;
      }

      const expr = this.parseAssignExpr();
      elements.push(expr);

      const sep = this.peekToken();
      if (sep.type === TokenType.Comma) {
        this.nextToken(); // ','
        const next = this.peekToken();
        if (next.type === TokenType.CloseBracket) {
          // Trailing comma; consume and finish.
          this.nextToken();
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBracket) {
        this.nextToken();
        break;
      }

      return this.error("Expected ',' or ']' in array literal", sep);
    }

    const span = this.span(start, this.lastTokenEnd);
    return {
      $kind: "ArrayLiteral",
      span,
      elements,
    };
  }

  // ObjectLiteral ::= "{" [ ( Identifier | StringLiteral | NumericLiteral ) ":" AssignExpr ( "," ... )* ] "}"
  private parseObjectLiteral(): ObjectLiteralExpression | BadExpression {
    const open = this.peekToken();
    this.nextToken(); // '{'
    const start = open.start;

    const keys: (number | string)[] = [];
    const values: IsAssign[] = [];

    const first = this.peekToken();
    if (first.type === TokenType.CloseBrace) {
      this.nextToken();
      const span = this.span(start, this.lastTokenEnd);
      return {
        $kind: "ObjectLiteral",
        span,
        keys,
        values,
      };
    }

    while (true) {
      const keyTok = this.peekToken();
      if (
        keyTok.type !== TokenType.Identifier &&
        keyTok.type !== TokenType.StringLiteral &&
        keyTok.type !== TokenType.NumericLiteral
      ) {
        return this.error(
          "Invalid object literal key; expected identifier, string, or number",
          keyTok,
        );
      }
      this.nextToken();

      let key: string | number;
      if (keyTok.type === TokenType.NumericLiteral) {
        key = keyTok.value as number;
      } else {
        key = String(keyTok.value);
      }

      const colon = this.peekToken();
      if (colon.type !== TokenType.Colon) {
        return this.error("Expected ':' after object literal key", colon);
      }
      this.nextToken(); // ':'

      const value = this.parseAssignExpr();
      keys.push(key);
      values.push(value);

      const sep = this.peekToken();
      if (sep.type === TokenType.Comma) {
        this.nextToken(); // ','
        const next = this.peekToken();
        if (next.type === TokenType.CloseBrace) {
          this.nextToken();
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBrace) {
        this.nextToken();
        break;
      }

      return this.error("Expected ',' or '}' in object literal", sep);
    }

    const span = this.span(start, this.lastTokenEnd);
    return {
      $kind: "ObjectLiteral",
      span,
      keys,
      values,
    };
  }

  // ------------------------------------------------------------------------------------------
  // Tails: value converters & binding behaviors
  // ------------------------------------------------------------------------------------------

  private parseTails(core: IsAssign): IsBindingBehavior {
    let expr: IsValueConverter = core;
    if (this.isBad(expr)) return expr;

    // Value converters: expr | conv [: arg]*
    while (this.peekToken().type === TokenType.Bar) {
      this.nextToken(); // '|'
      const nameTok = this.peekToken();
      if (nameTok.type !== TokenType.Identifier) {
        return this.error("Expected identifier after '|'", nameTok);
      }
      this.nextToken();
      const name = this.identifierFromToken(nameTok);

      const args: IsAssign[] = [];
      while (this.peekToken().type === TokenType.Colon) {
        this.nextToken(); // ':'
        const arg = this.parseAssignExpr();
        args.push(arg);
      }

      const span = this.spanFrom(expr, this.lastTokenEnd);
      const vc: ValueConverterExpression = {
        $kind: "ValueConverter",
        span,
        expression: expr,
        name,
        args,
      };
      expr = vc;
    }

    // Binding behaviors: expr & behavior [: arg]*
    let behaviorExpr: IsBindingBehavior = expr;
    while (this.peekToken().type === TokenType.Ampersand) {
      this.nextToken(); // '&'
      const nameTok = this.peekToken();
      if (nameTok.type !== TokenType.Identifier) {
        return this.error("Expected identifier after '&'", nameTok);
      }
      this.nextToken();
      const name = this.identifierFromToken(nameTok);

      const args: IsAssign[] = [];
      while (this.peekToken().type === TokenType.Colon) {
        this.nextToken(); // ':'
        const arg = this.parseAssignExpr();
        args.push(arg);
      }

      const span = this.spanFrom(behaviorExpr, this.lastTokenEnd);
      const bb: BindingBehaviorExpression = {
        $kind: "BindingBehavior",
        span,
        expression: behaviorExpr,
        name,
        args,
      };
      behaviorExpr = bb;
    }

    return behaviorExpr;
  }

  // ------------------------------------------------------------------------------------------
  // Iterator header helpers: LHS binding + chainable RHS
  // ------------------------------------------------------------------------------------------

  /**
   * LHS binding for repeat.for:
   *   - BindingIdentifier:  item
   *   - ArrayBindingPattern: [item, index]
   *   - ObjectBindingPattern: { key, value } / { key: alias }
   *
   * Very complex destructuring (deep nesting, rest, etc.) is currently rejected.
   */
  private parseLhsBinding(): BindingPattern {
    const t = this.peekToken();

    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();

      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();

      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();

      default:
        return this.error(
          "Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern",
          t,
        );
    }
  }

  /** Parse a simple binding identifier (no destructuring) used on the LHS of repeat.for or in patterns. */
  private parseBindingIdentifier(): BindingIdentifier | BadExpression {
    const t = this.peekToken();
    if (t.type !== TokenType.Identifier) {
      return this.error("Expected identifier", t);
    }
    this.nextToken();
    return this.bindingIdentifierFromToken(t);
  }

  private identifierFromToken(t: Token): Identifier {
    return {
      $kind: "Identifier",
      span: this.spanFromToken(t),
      name: this.tokenToIdentifierName(t),
    };
  }

  /**
   * Create a BindingIdentifier from an already-consumed identifier token,
   * enforcing the same 'import' restriction as identifier primaries.
   */
  private bindingIdentifierFromToken(t: Token): BindingIdentifier | BadExpression {
    const name = t.value as string;
    if (name === "import") {
      return this.error("Bare 'import' is not allowed in binding expressions", t);
    }
    const identifier = this.identifierFromToken(t);
    const id: BindingIdentifier = {
      $kind: "BindingIdentifier",
      span: identifier.span,
      name: identifier,
    };
    return id;
  }

  /**
   * Simple array binding pattern for repeat.for:
   *   [item]       → elements: [BindingIdentifier("item")]
   *   [item, idx]  → elements: [BindingIdentifier("item"), BindingIdentifier("idx")]
   *
   * Anything more complex (holes, >2 elements, trailing comma, etc.) is rejected.
   */
  private parseArrayBindingPattern(): ArrayBindingPattern | BadExpression {
    const open = this.nextToken(); // '['
    const start = open.start;

    const elements: BindingPattern[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.peekToken();

      if (t.type === TokenType.CloseBracket) {
        this.nextToken();
        break;
      }

      if (t.type === TokenType.Comma) {
        this.nextToken();
        elements.push(this.bindingPatternHoleFromToken(t));
        continue;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.error("Only one rest element is allowed in an array pattern", t);
        }
        this.nextToken(); // '...'
        rest = this.parseBindingPatternBase();
        if (this.isBad(rest)) return rest;
        const afterRest = this.peekToken();
        if (afterRest.type === TokenType.Comma) {
          return this.error("Rest element must be in the last position of an array pattern", afterRest);
        }
        if (afterRest.type !== TokenType.CloseBracket) {
          return this.error("Expected ']' after array pattern rest element", afterRest);
        }
        this.nextToken(); // ']'
        break;
      }

      const element = this.parseBindingPatternWithOptionalDefault();
      if (this.isBad(element)) return element;
      elements.push(element);

      const sep = this.peekToken();
      if (sep.type === TokenType.Comma) {
        this.nextToken(); // ','
        const maybeClose = this.peekToken();
        if (maybeClose.type === TokenType.CloseBracket) {
          this.nextToken(); // allow trailing comma
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBracket) {
        this.nextToken();
        break;
      }

      return this.error("Expected ',' or ']' in array binding pattern", sep);
    }

    const span = this.span(start, this.lastTokenEnd);
    return {
      $kind: "ArrayBindingPattern",
      span,
      elements,
      rest,
    };
  }

  /**
   * Simple object binding pattern for repeat.for:
   *   { key, value }      → keys: ["key","value"], values: [id("key"), id("value")]
   *   { key: alias }      → keys: ["key"],         values: [id("alias")]
   *
   * No nested patterns, no defaults, no rest, no trailing comma.
   */
  private parseObjectBindingPattern(): ObjectBindingPattern | BadExpression {
    const open = this.nextToken(); // '{'
    const start = open.start;

    const properties: { key: string | number; value: BindingPattern }[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.peekToken();
      if (t.type === TokenType.CloseBrace) {
        this.nextToken();
        break;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.error("Only one rest element is allowed in an object pattern", t);
        }
        this.nextToken(); // '...'
        rest = this.parseBindingPatternBase();
        if (this.isBad(rest)) return rest;
        const afterRest = this.peekToken();
        if (afterRest.type === TokenType.Comma) {
          return this.error("Rest element must be in the last position of an object pattern", afterRest);
        }
        if (afterRest.type !== TokenType.CloseBrace) {
          return this.error("Expected '}' after object pattern rest element", afterRest);
        }
        this.nextToken(); // '}'
        break;
      }

      const keyTok = this.peekToken();
      if (
        keyTok.type !== TokenType.Identifier &&
        keyTok.type !== TokenType.StringLiteral &&
        keyTok.type !== TokenType.NumericLiteral
      ) {
        return this.error(
          "Invalid object binding pattern key; expected identifier, string, or number",
          keyTok,
        );
      }
      this.nextToken(); // consume key

      const key: string | number = keyTok.type === TokenType.NumericLiteral
        ? (keyTok.value as number)
        : String(keyTok.value);

      const afterKey = this.peekToken();
      let valuePattern: BindingPattern;

      if (afterKey.type === TokenType.Colon) {
        this.nextToken(); // ':'
        valuePattern = this.parseBindingPatternWithOptionalDefault();
        if (this.isBad(valuePattern)) return valuePattern;
      } else {
        if (keyTok.type !== TokenType.Identifier) {
          return this.error("Object binding pattern shorthand requires an identifier key", keyTok);
        }
        const shorthand = this.bindingIdentifierFromToken(keyTok);
        if (this.isBad(shorthand)) return shorthand;
        valuePattern = this.parseOptionalDefaultForShorthand(shorthand);
        if (this.isBad(valuePattern)) return valuePattern;
      }

      properties.push({ key, value: valuePattern });

      const sep = this.peekToken();
      if (sep.type === TokenType.Comma) {
        this.nextToken(); // ','
        const maybeClose = this.peekToken();
        if (maybeClose.type === TokenType.CloseBrace) {
          this.nextToken(); // trailing comma
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBrace) {
        this.nextToken();
        break;
      }

      return this.error("Expected ',' or '}' in object binding pattern", sep);
    }

    const span = this.span(start, this.lastTokenEnd);
    return {
      $kind: "ObjectBindingPattern",
      span,
      properties,
      rest,
    };
  }

  /**
   * Parse a template literal (with expressions) starting at the backtick.
   * Produces a TemplateExpression with cooked strings (raw text slices) and
   * expressions parsed as AssignExpr with proper span offsets.
   */
  private parseTemplateLiteral(): TemplateExpression | BadExpression {
    const open = this.peekToken();
    if (open.type !== TokenType.Backtick) {
      return this.error("Expected '`' to start template literal", open);
    }
    this.nextToken(); // consume '`'

    const cooked: string[] = [];
    const expressions: IsAssign[] = [];

    let chunkStart = open.end;
    let i = chunkStart;
    const src = this.source;

    const flushChunk = (end: number) => {
      cooked.push(src.slice(chunkStart, end));
    };

    while (i < src.length) {
      const ch = src.charCodeAt(i);
      // `${` starts an expression
      if (ch === CharCode.Dollar && src.charCodeAt(i + 1) === CharCode.OpenBrace) {
        flushChunk(i);
        const exprStart = i + 2;
        const closing = this.scanTemplateExpression(exprStart);
        if (closing < 0) {
          return this.error("Unterminated ${ in template literal", open);
        }
        const exprSrc = src.slice(exprStart, closing);
        const exprBase = this.baseSpan ? this.span(exprStart, closing) : null;
        const inner = new CoreParser(exprSrc, exprBase);
        const expr = inner.parseAssignExpr();
        const trailing = inner.peekToken();
        if (trailing.type !== TokenType.EOF) {
          inner.error("Unexpected token after end of template expression", trailing);
        }
        const node: IsAssign = inner.failure ?? expr;
        if (!exprBase) {
          offsetNodeSpans(node, exprStart);
        }
        expressions.push(node);
        chunkStart = closing + 1;
        i = chunkStart;
        continue;
      }
      // closing backtick
      if (ch === CharCode.Backtick) {
        flushChunk(i);
        i++; // include closing
        this.scanner.reset(i);
        this.lastTokenEnd = i;
        const span = this.span(open.start, i);
        return { $kind: "Template", span, cooked, expressions };
      }
      // handle escape of backtick/dollar by skipping next char
      if (ch === CharCode.Backslash) {
        i += 2;
        continue;
      }
      i++;
    }

    return this.error("Unterminated template literal", open);
  }

  private scanTemplateExpression(start: number): number {
    let depth = 1;
    let i = start;
    while (i < this.source.length) {
      const ch = this.source.charCodeAt(i);
      // Skip strings
      if (ch === CharCode.SingleQuote || ch === CharCode.DoubleQuote) {
        const after = this.skipStringLiteral(i, ch);
        if (after < 0) return -1;
        i = after;
        continue;
      }
      // Skip nested template literals
      if (ch === CharCode.Backtick) {
        const after = this.scanTemplateLiteralBody(i);
        if (after < 0) return -1;
        i = after;
        continue;
      }
      // Skip comments
      if (ch === CharCode.Slash && this.source.charCodeAt(i + 1) === CharCode.Slash) {
        i = this.skipLineComment(i + 2);
        continue;
      }
      if (ch === CharCode.Slash && this.source.charCodeAt(i + 1) === CharCode.Asterisk) {
        const after = this.skipBlockComment(i + 2);
        if (after < 0) return -1;
        i = after;
        continue;
      }

      if (ch === CharCode.OpenBrace) {
        depth++;
        i++;
        continue;
      }
      if (ch === CharCode.CloseBrace) {
        depth--;
        if (depth === 0) return i;
        i++;
        continue;
      }
      i++;
    }
    return -1;
  }

  private scanTemplateLiteralBody(startBacktick: number): number {
    let i = startBacktick + 1;
    while (i < this.source.length) {
      const ch = this.source.charCodeAt(i);
      if (ch === CharCode.Backslash) {
        i += 2;
        continue;
      }
      if (ch === CharCode.Backtick) {
        return i + 1;
      }
      if (ch === CharCode.Dollar && this.source.charCodeAt(i + 1) === CharCode.OpenBrace) {
        const closing = this.scanTemplateExpression(i + 2);
        if (closing < 0) return -1;
        i = closing + 1;
        continue;
      }
      i++;
    }
    return -1;
  }

  private skipStringLiteral(start: number, quote: number): number {
    let i = start + 1;
    while (i < this.source.length) {
      const ch = this.source.charCodeAt(i);
      if (ch === CharCode.Backslash) {
        i += 2;
        continue;
      }
      if (ch === quote) {
        return i + 1;
      }
      i++;
    }
    return -1;
  }

  private skipLineComment(start: number): number {
    let i = start;
    while (i < this.source.length) {
      const ch = this.source.charCodeAt(i);
      if (ch === CharCode.LineFeed || ch === CharCode.CarriageReturn) {
        return i;
      }
      i++;
    }
    return i;
  }

  private skipBlockComment(start: number): number {
    let i = start;
    while (i < this.source.length - 1) {
      if (this.source.charCodeAt(i) === CharCode.Asterisk && this.source.charCodeAt(i + 1) === CharCode.Slash) {
        return i + 2;
      }
      i++;
    }
    return -1;
  }

  private parseBindingPatternWithOptionalDefault(): BindingPattern {
    const pattern = this.parseBindingPatternBase();
    if (this.isBad(pattern)) return pattern;
    const maybeDefault = this.peekToken();
    if (maybeDefault.type !== TokenType.Equals) {
      return pattern;
    }

    this.nextToken(); // '='
    const init = this.parseAssignExpr();
    return {
      $kind: "BindingPatternDefault",
      span: this.spanFrom(pattern, init),
      target: pattern,
      default: init,
    };
  }

  private parseBindingPatternBase(): BindingPattern {
    const t = this.peekToken();
    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();
      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();
      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();
      default:
        return this.error(
          "Invalid binding pattern; expected identifier, array pattern, or object pattern",
          t,
        );
    }
  }

  private parseOptionalDefaultForShorthand(binding: BindingIdentifier | BadExpression): BindingPattern {
    if (this.isBad(binding)) return binding;
    const maybeDefault = this.peekToken();
    if (maybeDefault.type !== TokenType.Equals) {
      return binding;
    }
    this.nextToken(); // '='
    const init = this.parseAssignExpr();
    return {
      $kind: "BindingPatternDefault",
      span: this.spanFrom(binding, init),
      target: binding,
      default: init,
    };
  }

  private bindingPatternHoleFromToken(t: Token): BindingPatternHole {
    return {
      $kind: "BindingPatternHole",
      span: this.spanFromToken(t),
    };
  }

  /**
   * Parse the RHS of a repeat.for header with "chainable" semantics:
   *   - parse CoreExpression + tails (value converters / behaviors)
   *   - stop at the first top-level ';' (if any)
   *   - record semiIdx = index of that ';', or -1 if no semicolon
   *
   * A bare trailing ';' with nothing after it is rejected.
   */
  private parseChainableRhs(): { expr: IsBindingBehavior; semiIdx: number } {
    const core = this.parseAssignExpr();
    if (this.isBad(core)) {
      return { expr: core, semiIdx: -1 };
    }
    const expr = this.parseTails(core);
    if (this.isBad(expr)) {
      return { expr, semiIdx: -1 };
    }

    let semiIdx = -1;
    const t = this.peekToken();

    if (t.type === TokenType.Semicolon) {
      semiIdx = t.start;
      this.nextToken(); // consume ';'

      const afterSemi = this.peekToken();
      if (afterSemi.type === TokenType.EOF) {
        return {
          expr: this.error(
          "Expected tail after ';' in iterator header",
          afterSemi,
        ),
          semiIdx,
        };
      }
      // Tokens after the semicolon (e.g. `key: id; trackBy: foo`) are not
      // parsed by the expression parser; they are handled by the lowerer.
    }

    return { expr, semiIdx };
  }


  // ------------------------------------------------------------------------------------------
  // Arrow functions (single identifier parameter for v1)
  // ------------------------------------------------------------------------------------------

  private parseArrowFromLeft(left: IsBinary | ConditionalExpression): ArrowFunction | BadExpression {
    if (this.isBad(left)) return left;
    let identifier: Identifier | null = null;
    if (
      (left as Partial<AccessScopeExpression>).$kind === "AccessScope" ||
      (left as Partial<AccessGlobalExpression>).$kind === "AccessGlobal"
    ) {
      identifier = (left as AccessScopeExpression | AccessGlobalExpression).name;
    }

    if (identifier == null) {
      const arrowTok = this.peekToken();
      return this.error(
        "Arrow functions currently support only a single identifier parameter in the LSP parser",
        arrowTok,
      );
    }

    // Consume =>
    const arrowTok = this.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      return this.error("Expected '=>'", arrowTok);
    }
    this.nextToken();

    const arg: BindingIdentifier = {
      $kind: "BindingIdentifier",
      span: identifier.span,
      name: identifier,
    };

    const body = this.parseAssignExpr();
    const span = this.spanFrom({ span: identifier.span }, body);

    const fn: ArrowFunction = {
      $kind: "ArrowFunction",
      span,
      args: [arg],
      body,
      rest: false,
    };
    return fn;
  }

  /**
   * Fast lookahead to distinguish a parenthesized expression from an arrow
   * parameter list without mutating the main scanner. We allow:
   *
   *   () => expr
   *   (a) => expr
   *   (a, b, c) => expr
   *
   * and reject anything that looks like a grouped expression instead, e.g.
   *   (a + b) =>   // not treated as arrow head here
   */
  private isParenthesizedArrowHead(openParen: Token): boolean {
    const probe = new Scanner(this.source);
    probe.reset(openParen.start);

    // Consume '('
    let t = probe.next();
    if (t.type !== TokenType.OpenParen) {
      return false;
    }

    t = probe.peek();

    let seenParam = false;
    let seenRest = false;
    // Empty parameter list: () => expr is allowed
    if (t.type !== TokenType.CloseParen) {
      while (true) {
        if (t.type === TokenType.Ellipsis) {
          // Rest parameter must be the last one.
          if (seenRest) return false;
          probe.next(); // '...'
          const id = probe.peek();
          if (id.type !== TokenType.Identifier) {
            return false;
          }
          probe.next(); // identifier
          seenRest = true;
          t = probe.peek();
        } else if (t.type === TokenType.Identifier) {
          probe.next(); // identifier
          seenParam = true;
          t = probe.peek();
        } else {
          return false;
        }

        if (t.type === TokenType.Comma) {
          if (seenRest) return false; // nothing after rest
          probe.next(); // ','
          t = probe.peek();
          continue;
        }

        if (t.type === TokenType.CloseParen) {
          probe.next(); // ')'
          break;
        }

        // Anything else (operators, literals, etc.) → not an arrow head.
        return false;
      }
    }
    // () case: consume ')'
    else {
      probe.next();
    }

    const afterParen = probe.peek();
    return afterParen.type === TokenType.EqualsGreaterThan;
  }

  /**
   * Parse an arrow function whose head starts with a '(' we already know is an
   * arrow parameter list, e.g. `(a, b) => body`.
   */
  private parseParenthesizedArrowFunction(openParen: Token): ArrowFunction | BadExpression {
    // Consume '('
    this.nextToken();

    const params: BindingIdentifier[] = [];
    let rest = false;
    const start = openParen.start;

    let t = this.peekToken();

    // () => expr
    if (t.type === TokenType.CloseParen) {
      this.nextToken(); // ')'
    } else {
      while (true) {
        let idTok: Token;
        if (t.type === TokenType.Ellipsis) {
          rest = true;
          this.nextToken(); // '...'
          idTok = this.peekToken();
          if (idTok.type !== TokenType.Identifier) {
            return this.error("Invalid rest parameter; expected identifier after '...'", idTok);
          }
          this.nextToken(); // identifier
        } else {
          idTok = this.peekToken();
          if (idTok.type !== TokenType.Identifier) {
            return this.error(
              "Invalid arrow function parameter; expected identifier",
              idTok,
            );
          }
          this.nextToken(); // identifier
        }

        const identifier = this.identifierFromToken(idTok);
        const param: BindingIdentifier = {
          $kind: "BindingIdentifier",
          span: identifier.span,
          name: identifier,
        };
        params.push(param);

        t = this.peekToken();
        if (t.type === TokenType.Comma) {
          if (rest) {
            return this.error("Rest parameter must be last in arrow parameter list", t);
          }
          this.nextToken(); // ','
          t = this.peekToken();
          continue;
        }

        if (t.type === TokenType.CloseParen) {
          this.nextToken(); // ')'
          break;
        }

        return this.error("Expected ',' or ')' in arrow parameter list", t);
      }
    }

    const arrowTok = this.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      return this.error("Expected '=>'", arrowTok);
    }
    this.nextToken(); // '=>'

    const body = this.parseAssignExpr();
    const span = this.spanFrom(start, body);

    const fn: ArrowFunction = {
      $kind: "ArrowFunction",
      span,
      args: params,
      body,
      rest,
    };
    return fn;
  }

  // ------------------------------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------------------------------

  private peekToken(): Token {
    return this.scanner.peek();
  }

  private nextToken(): Token {
    const t = this.scanner.next();
    this.lastTokenEnd = t.end;
    return t;
  }

  private spanFromToken(t: Token): SourceSpan {
    return this.span(t.start, t.end);
  }

  private localStart(node: SpanBearing): number {
    return this.toLocal(node.span.start);
  }

  private localEnd(node: SpanBearing): number {
    return this.toLocal(node.span.end);
  }

  private spanFrom(start: SpanBearing | number, end: SpanBearing | number): SourceSpan {
    const localStart = typeof start === "number" ? start : this.localStart(start);
    const localEnd = typeof end === "number" ? end : this.localEnd(end);
    return this.span(localStart, localEnd);
  }

  private error(message: string, token?: Token): BadExpression {
    const t = token ?? this.peekToken();
    const span = this.span(t.start, Math.max(t.end, t.start));
    const bad: BadExpression = {
      $kind: "BadExpression",
      span,
      text: this.source.slice(span.start, span.end),
      message,
      origin: this.baseSpan ? provenanceFromSpan("parse", span) : null,
    };
    if (!this.failure) {
      this.failure = bad;
    }
    // Consume the offending token when possible to avoid infinite loops.
    if (token === undefined || token === this.peekToken()) {
      this.nextToken();
    }
    // Force subsequent peeks to hit EOF so loops terminate.
    this.scanner.reset(this.source.length);
    this.lastTokenEnd = this.source.length;
    return bad;
  }

  private isBad(expr: unknown): expr is BadExpression {
    return !!expr && (expr as { $kind?: string }).$kind === "BadExpression";
  }

  // Assignment operators
  private getAssignmentOperator(type: TokenType): AssignmentOperator | null {
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
  ):
    | { operator: BinaryOperator; precedence: number; associativity: "left" | "right" }
    | null {
    switch (type) {
      case TokenType.QuestionQuestion:
        return { operator: "??", precedence: 1, associativity: "left" };
      case TokenType.BarBar:
        return { operator: "||", precedence: 2, associativity: "left" };
      case TokenType.AmpersandAmpersand:
        return { operator: "&&", precedence: 3, associativity: "left" };

      case TokenType.EqualsEquals:
        return { operator: "==", precedence: 4, associativity: "left" };
      case TokenType.EqualsEqualsEquals:
        return { operator: "===", precedence: 4, associativity: "left" };
      case TokenType.ExclamationEquals:
        return { operator: "!=", precedence: 4, associativity: "left" };
      case TokenType.ExclamationEqualsEquals:
        return { operator: "!==", precedence: 4, associativity: "left" };

      case TokenType.LessThan:
        return { operator: "<", precedence: 5, associativity: "left" };
      case TokenType.LessThanOrEqual:
        return { operator: "<=", precedence: 5, associativity: "left" };
      case TokenType.GreaterThan:
        return { operator: ">", precedence: 5, associativity: "left" };
      case TokenType.GreaterThanOrEqual:
        return { operator: ">=", precedence: 5, associativity: "left" };
      case TokenType.KeywordInstanceof:
        return { operator: "instanceof", precedence: 5, associativity: "left" };
      case TokenType.KeywordIn:
        return { operator: "in", precedence: 5, associativity: "left" };

      case TokenType.Plus:
        return { operator: "+", precedence: 6, associativity: "left" };
      case TokenType.Minus:
        return { operator: "-", precedence: 6, associativity: "left" };

      case TokenType.Asterisk:
        return { operator: "*", precedence: 7, associativity: "left" };
      case TokenType.Slash:
        return { operator: "/", precedence: 7, associativity: "left" };
      case TokenType.Percent:
        return { operator: "%", precedence: 7, associativity: "left" };

      case TokenType.StarStar:
        return { operator: "**", precedence: 8, associativity: "right" };

      default:
        return null;
    }
  }

  // Prefix unary operators
  private getPrefixUnaryOperator(type: TokenType): UnaryOperator | null {
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
    switch (t.type) {
      case TokenType.Identifier:
      case TokenType.KeywordNew:
      case TokenType.KeywordTypeof:
      case TokenType.KeywordVoid:
      case TokenType.KeywordInstanceof:
      case TokenType.KeywordIn:
      case TokenType.KeywordOf:
      case TokenType.KeywordThis:
      case TokenType.KeywordDollarThis:
      case TokenType.KeywordDollarParent:
        return true;
      default:
        return false;
    }
  }

  private tokenToIdentifierName(t: Token): string {
    return String(t.value);
  }

  private ensureAssignable(
    expr: IsBinary | ConditionalExpression | IsLeftHandSide,
    opToken: Token,
  ): AccessScopeExpression | AccessKeyedExpression | AccessMemberExpression | AssignExpression | BadExpression {
    if (this.isBad(expr)) return expr;
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
        return this.error("Left-hand side is not assignable", opToken);
    }
  }

  private isAccessScope(expr: IsLeftHandSide): expr is AccessScopeExpression {
    return expr.$kind === "AccessScope";
  }

  private isAccessGlobal(expr: IsLeftHandSide): expr is AccessGlobalExpression {
    return expr.$kind === "AccessGlobal";
  }

  private isAccessMember(expr: IsLeftHandSide): expr is AccessMemberExpression {
    return expr.$kind === "AccessMember";
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

// --------------------------------------------------------------------------------------------
// Public LSP-facing parser
// --------------------------------------------------------------------------------------------

// Interpolation helpers (formerly in interpolation.ts)

export interface InterpolationSplitResult {
  parts: string[];
  exprSpans: TextSpan[];
}

export interface InterpolationSegments {
  parts: string[];
  expressions: { span: TextSpan; code: string }[];
}

export function splitInterpolationText(text: string): InterpolationSplitResult | null {
  let i = 0;
  let depth = 0;
  let start = 0;

  const parts: string[] = [];
  const exprSpans: TextSpan[] = [];

  // NOTE: We do NOT handle quotes in the outer loop.
  // In HTML text content, quotes are literal characters, not JavaScript string delimiters.
  // String handling is only needed inside ${...} expressions (handled in the inner loop).
  //
  // We DO handle backslash escaping: \$ escapes the dollar sign, preventing interpolation.
  // This matches the runtime's parseInterpolation behavior (ECMAScript template literal semantics).

  while (i < text.length) {
    const ch = text[i];

    // Handle escape sequences: \$ prevents interpolation start
    // This matches runtime's parseInterpolation (ECMAScript template literal semantics).
    if (ch === "\\" && text[i + 1] === "$") {
      // Skip past both the backslash and the $, so ${ is not detected as interpolation start.
      // The escaped \$ becomes literal text in the output.
      i += 2;
      continue;
    }

    if (ch === "$" && text[i + 1] === "{") {
      parts.push(text.slice(start, i));

      i += 2;
      depth = 1;

      const exprStart = i;
      let innerStr: '"' | "'" | "`" | null = null;

      while (i < text.length) {
        const c = text[i];

        if (innerStr) {
          if (c === "\\") {
            i += 2;
            continue;
          }
          if (c === innerStr) {
            innerStr = null;
            i++;
            continue;
          }
          i++;
          continue;
        }

        if (c === '"' || c === "'" || c === "`") {
          innerStr = c;
          i++;
          continue;
        }

        if (c === "{") {
          depth++;
          i++;
          continue;
        }

        if (c === "}" && --depth === 0) {
          const exprEnd = i;
          exprSpans.push(spanFromBounds(exprStart, exprEnd));
          i++;        // consume the closing '}'
          start = i;  // next literal part starts after the interpolation
          break;
        }

        i++;
      }

      continue;
    }

    i++;
  }

  if (exprSpans.length === 0) {
    return null;
  }

  parts.push(text.slice(start));

  return { parts, exprSpans };
}

export function extractInterpolationSegments(text: string): InterpolationSegments | null {
  const split = splitInterpolationText(text);
  if (!split) return null;

  const expressions = split.exprSpans.map((span) => ({
    span,
    code: text.slice(span.start, span.end),
  }));

  return { parts: split.parts, expressions };
}

export function parseInterpolationAst(
  text: string,
  parseExpr: (
    segment: string,
    baseOffset: number,
    baseSpan: SourceSpan | null,
  ) => IsBindingBehavior,
  baseSpan: SourceSpan | null = null,
): Interpolation {
  const split = extractInterpolationSegments(text);

  const parts: string[] = split ? split.parts : [text];
  const expressions: IsBindingBehavior[] = [];

  if (split) {
    for (const { code, span } of split.expressions) {
      const exprBase = baseSpan ? absoluteSpan(span, baseSpan) : null;
      const expr = parseExpr(code, span.start, exprBase);
      expressions.push(expr);
    }
  }

  const span: SourceSpan = baseSpan ? normalizeSpan(baseSpan) : spanFromBounds(0, text.length);

  return {
    $kind: "Interpolation",
    span,
    parts,
    expressions,
  };
}

export class ExpressionParser implements IExpressionParser {
  // Overload signatures from IExpressionParser
  parse(expression: string, expressionType: "IsIterator", context?: ExpressionParseContext): ForOfStatement | BadExpression;
  parse(expression: string, expressionType: "Interpolation", context?: ExpressionParseContext): Interpolation;
  parse(
    expression: string,
    expressionType: "IsFunction" | "IsProperty",
    context?: ExpressionParseContext,
  ): IsBindingBehavior;
  parse(expression: string, expressionType: "IsCustom", context?: ExpressionParseContext): CustomExpression;
  parse(expression: string, expressionType: ExpressionType, context?: ExpressionParseContext): AnyBindingExpression;

  // Implementation
  /**
   * Parse an expression, optionally rebasing spans to an absolute `baseSpan`
   * (or `baseOffset`/`file`). Interpolation/template literal children inherit
   * the same base so inner expressions carry absolute offsets too. Without
   * context, spans stay relative to the provided expression string.
   */
  parse(
    expression: string,
    expressionType: ExpressionType,
    context?: ExpressionParseContext,
  ): AnyBindingExpression {
    const baseSpan = resolveBaseSpan(expression, context);
    let ast: AnyBindingExpression;

    switch (expressionType) {
      case "IsProperty":
      case "IsFunction": {
        const core = new CoreParser(expression, baseSpan);
        ast = core.parseBindingExpression();
        break;
      }

      case "IsIterator": {
        const core = new CoreParser(expression, baseSpan);
        ast = core.parseIteratorHeader();
        break;
      }

      case "Interpolation": {
        // `${...}` interpolation; reuse CoreParser for each inner segment and
        // offset spans so they are relative to the full interpolation string.
        ast = parseInterpolationAst(
          expression,
          (segment, baseOffset, segmentBase) => {
            const core = new CoreParser(segment, segmentBase);
            const expr = core.parseBindingExpression();
            if (!segmentBase) {
              offsetNodeSpans(expr, baseOffset);
            }
            return expr;
          },
          baseSpan,
        );
        break;
      }

      case "IsCustom": {
        // For v1, a custom expression simply wraps the raw text. Higher-level
        // plugins can later extend this to attach richer payloads.
        const span: SourceSpan = baseSpan ? normalizeSpan(baseSpan) : spanFromBounds(0, expression.length);
        const node: CustomExpression = {
          $kind: "Custom",
          span,
          value: expression,
        };
        ast = node;
        break;
      }

      default:
        ast = {
          $kind: "BadExpression",
          span: baseSpan ? normalizeSpan(baseSpan) : spanFromBounds(0, expression.length),
          text: expression,
          message: `Unknown expression type '${String(expressionType)}'`,
          origin: baseSpan ? provenanceFromSpan("parse", baseSpan) : null,
        };
        break;
    }

    return ast;
  }

}

/**
 * Rebase an AST produced by this parser onto an absolute `baseSpan`. Useful
 * when reusing cached ASTs or when parse context was not known at parse time.
 * Also attaches parse provenance to BadExpression nodes when no origin exists.
 */
export function rebaseExpressionSpans<T extends AnyBindingExpression>(
  ast: T,
  baseSpan: SourceSpan,
): T {
  const normalizedBase = ensureSpanFile(normalizeSpan(baseSpan), baseSpan.file) ?? normalizeSpan(baseSpan);
  transformNodeSpans(ast, (span, owner) => {
    const rebased = span.file ? normalizeSpan(span) : absoluteSpan(span, normalizedBase) ?? normalizeSpan(span);
    if (isBadExpressionNode(owner) && owner.origin == null) {
      owner.origin = provenanceFromSpan("parse", rebased);
    }
    return rebased;
  });
  return ast;
}

function resolveBaseSpan(source: string, context?: ExpressionParseContext): SourceSpan | null {
  if (!context) return null;
  const hasContext = context.baseSpan != null || context.baseOffset != null || context.file != null;
  if (!hasContext) return null;
  const start = context.baseSpan?.start ?? context.baseOffset ?? 0;
  const end = context.baseSpan?.end ?? start + source.length;
  const file = context.baseSpan?.file ?? context.file ?? null;
  const candidate = file ? { start, end, file } : { start, end };
  const normalized = normalizeSpan(candidate) as SourceSpan;
  return ensureSpanFile(normalized, file) ?? normalized;
}

/**
 * Recursively offset all span fields in an AST node by `delta`.
 * Shared between CoreParser (template literals) and ExpressionParser (interpolation).
 */
function offsetNodeSpans(node: unknown, delta: number): void {
  transformNodeSpans(node, (span) => offsetSpan(span, delta));
}

type AstNode = { span?: SourceSpan | TextSpan | null; $kind?: string };

function isAstNode(node: unknown): node is AstNode {
  return typeof node === "object" && node !== null;
}

function isSpanLike(span: unknown): span is SourceSpan {
  return !!span && typeof (span as SourceSpan).start === "number" && typeof (span as SourceSpan).end === "number";
}

function isBadExpressionNode(node: AstNode): node is BadExpression {
  return node.$kind === "BadExpression";
}

function transformNodeSpans(
  node: unknown,
  transform: (span: SourceSpan, owner: AstNode) => SourceSpan,
): void {
  if (!isAstNode(node)) {
    return;
  }

  const { span } = node;
  if (isSpanLike(span)) {
    node.span = transform(span, node);
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "span" || value == null) continue;

    if (Array.isArray(value)) {
      for (const child of value) transformNodeSpans(child, transform);
    } else {
      transformNodeSpans(value, transform);
    }
  }
}

/**
 * Get a shared expression parser instance.
 *
 * The parser is re-entrant and stateless: each `parse` call allocates a fresh
 * CoreParser with its own Scanner. An optional `ExpressionParseContext` rebases
 * spans to absolute template offsets (file + base span/offset).
 */
let singleton: IExpressionParser | null = null;

export function getExpressionParser(): IExpressionParser {
  if (singleton == null) {
    singleton = new ExpressionParser();
  }
  return singleton;
}
