import type { IExpressionParser } from "./expression-api.js";
import { Scanner, TokenType, type Token } from "./expression-scanner.js";

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
  PrimitiveLiteralExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  ArrowFunction,
  CustomExpression,
} from "../compiler/model/ir.js";

/**
 * Core expression parser for Aurelia's binding expression language, tailored
 * for LSP usage.
 *
 * This is a fresh implementation that:
 * - consumes tokens from the local Scanner
 * - produces the canonical AST from model/ir.ts
 * - attaches TextSpan to every node
 *
 * For v1 this parser is intentionally strict – invalid input throws.
 * Error‑tolerant / BadExpression based recovery can be layered on later.
 */
export class CoreParser {
  private readonly source: string;
  private readonly scanner: Scanner;
  /** End offset of the last consumed token. */
  private lastTokenEnd = 0;

  constructor(source: string) {
    this.source = source;
    this.scanner = new Scanner(source);
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
      this.error("Empty expression", first);
    }

    const core = this.parseAssignExpr();
    const withTails = this.parseTails(core);

    const eof = this.peekToken();
    if (eof.type !== TokenType.EOF) {
      this.error("Unexpected token after end of expression", eof);
    }

    return withTails;
  }

  // ------------------------------------------------------------------------------------------
  // Precedence pipeline
  // ------------------------------------------------------------------------------------------

  // AssignExpr ::= ConditionalExpr
  //              | LeftHandSide AssignmentOperator AssignExpr
  //              | ArrowFunction    (single identifier param only for v1)
  private parseAssignExpr(): IsAssign {
    const left = this.parseConditionalExpr();

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
    const value = this.parseAssignExpr();
    const span: TextSpan = {
      start: target.span.start,
      end: value.span.end,
    };

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
    const q = this.peekToken();
    if (q.type !== TokenType.Question) {
      return test;
    }

    this.nextToken(); // '?'
    const yes = this.parseAssignExpr();
    const colon = this.peekToken();
    if (colon.type !== TokenType.Colon) {
      this.error("Expected ':' in conditional expression", colon);
    }
    this.nextToken(); // ':'
    const no = this.parseAssignExpr();

    const span: TextSpan = {
      start: test.span.start,
      end: no.span.end,
    };

    const cond: ConditionalExpression = {
      $kind: "Conditional",
      span,
      condition: test,
      yes,
      no,
    };
    return cond;
  }

  // BinaryExpr – standard precedence climbing implementation.
  private parseBinaryExpr(minPrecedence: number): IsBinary {
    let left = this.parseUnaryExpr() as IsBinary;

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

      const span: TextSpan = {
        start: left.span.start,
        end: right.span.end,
      };

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
      const span: TextSpan = {
        start: t.start,
        end: this.getEndSpan(operand),
      };
      const unary: UnaryExpression = {
        $kind: "Unary",
        span,
        operation: op,
        // NOTE: AST says expression: IsLeftHandSide, but the grammar allows
        // nested unary.
        expression: operand as IsLeftHandSide,
        pos: 0,
      };
      return unary;
    }

    // Postfix ++ / --
    const lhs = this.parseLeftHandSideExpr();
    const next = this.peekToken();
    if (
      next.type === TokenType.PlusPlus ||
      next.type === TokenType.MinusMinus
    ) {
      this.nextToken(); // consume ++/--
      const opStr: UnaryOperator =
        next.type === TokenType.PlusPlus ? "++" : "--";

      const assignable = this.ensureAssignable(lhs, next);
      const span: TextSpan = {
        start: assignable.span.start,
        end: next.end,
      };

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
  private parseNewExpression(): NewExpression {
    const newTok = this.nextToken(); // 'new'
    const func = this.parseMemberExpression();
    let args: IsAssign[] = [];
    if (this.peekToken().type === TokenType.OpenParen) {
      args = this.parseArguments();
    }

    const span: TextSpan = {
      start: newTok.start,
      end: this.lastTokenEnd,
    };

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
    let expr = this.parsePrimaryExpr() as IsLeftHandSide;

    while (true) {
      const t = this.peekToken();

      if (t.type === TokenType.Dot) {
        // obj.prop
        this.nextToken(); // '.'
        const nameTok = this.peekToken();
        if (!this.isIdentifierNameToken(nameTok)) {
          this.error("Expected identifier after '.'", nameTok);
        }
        this.nextToken();
        const name = this.tokenToIdentifierName(nameTok);
        const span: TextSpan = {
          start: this.getNodeStart(expr),
          end: nameTok.end,
        };
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
          const span: TextSpan = {
            start: this.getNodeStart(expr),
            end: this.lastTokenEnd,
          };

          const call: CallFunctionExpression = {
            $kind: "CallFunction",
            span,
            func: expr,
            args,
            optional: true,
          };
          expr = call;
          continue;
        }

        if (next.type === TokenType.OpenBracket) {
          // obj?.[expr]
          const keyed = this.parseKeyedAccess(expr, true);
          expr = keyed;
          continue;
        }

        // obj?.prop
        if (!this.isIdentifierNameToken(next)) {
          this.error("Expected identifier after '?.'", next);
        }
        this.nextToken();
        const name = this.tokenToIdentifierName(next);
        const span: TextSpan = {
          start: this.getNodeStart(expr),
          end: next.end,
        };
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
        expr = this.parseKeyedAccess(expr, false);
        continue;
      }

      if (t.type === TokenType.OpenParen) {
        // Function / method / scope call
        const args = this.parseArguments();
        const span: TextSpan = {
          start: this.getNodeStart(expr),
          end: this.lastTokenEnd,
        };

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

      // TODO: Tagged templates (expr`...`) – not implemented yet.
      if (t.type === TokenType.Backtick) {
        this.error(
          "Template literals / tagged templates are not supported yet",
          t,
        );
      }

      break;
    }

    return expr;
  }

  // Helper for obj[expr] / obj?.[expr]
  private parseKeyedAccess(
    object: IsLeftHandSide,
    optional: boolean,
  ): AccessKeyedExpression {
    this.nextToken(); // '['
    const key = this.parseAssignExpr();
    const close = this.peekToken();
    if (close.type !== TokenType.CloseBracket) {
      this.error("Expected ']' in indexed access", close);
    }
    this.nextToken(); // ']'

    const span: TextSpan = {
      start: this.getNodeStart(object),
      end: this.lastTokenEnd,
    };
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
      this.error("Expected '(' for argument list", open);
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

      this.error("Expected ',' or ')' in argument list", t);
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
        this.nextToken();
        const node: PrimitiveLiteralExpression = {
          $kind: "PrimitiveLiteral",
          span: this.spanFromToken(t),
          value: t.value as any,
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
        // Parenthesized expression – group but do not create a dedicated AST node.
        this.nextToken(); // '('
        const expr = this.parseAssignExpr();
        const close = this.peekToken();
        if (close.type !== TokenType.CloseParen) {
          this.error("Expected ')' to close parenthesized expression", close);
        }
        this.nextToken(); // ')'
        // NOTE: this can be a non-primary (e.g. Binary), but IR types don't
        // have an explicit Paren node.
        return expr as IsPrimary;
      }

      case TokenType.Backtick: {
        this.error("Template literals are not implemented yet", t);
      }
    }

    this.error(`Unexpected token ${t.type} in primary expression`, t);
  }

  // Identifier primary – classify as global vs scope.
  private parseIdentifierPrimary(): IsPrimary {
    const t = this.peekToken();
    if (t.type !== TokenType.Identifier) {
      this.error("Expected identifier", t);
    }
    this.nextToken();

    const name = t.value as string;
    if (name === "import") {
      this.error("Bare 'import' is not allowed in binding expressions", t);
    }

    if (CoreParser.globalNames.has(name)) {
      const node: AccessGlobalExpression = {
        $kind: "AccessGlobal",
        span: this.spanFromToken(t),
        name,
      };
      return node;
    }

    const node: AccessScopeExpression = {
      $kind: "AccessScope",
      span: this.spanFromToken(t),
      name,
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
          this.error("Expected identifier after '$this.'", nameTok);
        }
        this.nextToken();
        const name = this.tokenToIdentifierName(nameTok);
        const span: TextSpan = { start, end: nameTok.end };
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
        span: { start, end: first.end },
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
        this.error("Expected identifier after '$parent.'", maybeParent);
      }
      this.nextToken();
      const name = this.tokenToIdentifierName(maybeParent);
      const span: TextSpan = { start, end: maybeParent.end };
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
      span: { start, end: this.lastTokenEnd || first.end },
      ancestor,
    };
    return node;
  }

  // ArrayLiteral ::= "[" [ ( elision | AssignExpr ) ( "," ( elision | AssignExpr ) )* ] "]"
  private parseArrayLiteral(): ArrayLiteralExpression {
    const open = this.peekToken();
    this.nextToken(); // '['
    const start = open.start;

    const elements: IsAssign[] = [];
    const first = this.peekToken();
    if (first.type === TokenType.CloseBracket) {
      this.nextToken();
      const span: TextSpan = { start, end: this.lastTokenEnd };
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

      this.error("Expected ',' or ']' in array literal", sep);
    }

    const span: TextSpan = { start, end: this.lastTokenEnd };
    return {
      $kind: "ArrayLiteral",
      span,
      elements,
    };
  }

  // ObjectLiteral ::= "{" [ ( Identifier | StringLiteral | NumericLiteral ) ":" AssignExpr ( "," ... )* ] "}"
  private parseObjectLiteral(): ObjectLiteralExpression {
    const open = this.peekToken();
    this.nextToken(); // '{'
    const start = open.start;

    const keys: (number | string)[] = [];
    const values: IsAssign[] = [];

    const first = this.peekToken();
    if (first.type === TokenType.CloseBrace) {
      this.nextToken();
      const span: TextSpan = { start, end: this.lastTokenEnd };
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
        this.error(
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
        this.error("Expected ':' after object literal key", colon);
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

      this.error("Expected ',' or '}' in object literal", sep);
    }

    const span: TextSpan = { start, end: this.lastTokenEnd };
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

    // Value converters: expr | conv [: arg]*
    while (this.peekToken().type === TokenType.Bar) {
      this.nextToken(); // '|'
      const nameTok = this.peekToken();
      if (nameTok.type !== TokenType.Identifier) {
        this.error("Expected identifier after '|'", nameTok);
      }
      this.nextToken();
      const name = nameTok.value as string;

      const args: IsAssign[] = [];
      while (this.peekToken().type === TokenType.Colon) {
        this.nextToken(); // ':'
        const arg = this.parseAssignExpr();
        args.push(arg);
      }

      const span: TextSpan = {
        start: this.getNodeStart(expr),
        end: this.lastTokenEnd,
      };
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
        this.error("Expected identifier after '&'", nameTok);
      }
      this.nextToken();
      const name = nameTok.value as string;

      const args: IsAssign[] = [];
      while (this.peekToken().type === TokenType.Colon) {
        this.nextToken(); // ':'
        const arg = this.parseAssignExpr();
        args.push(arg);
      }

      const span: TextSpan = {
        start: this.getNodeStart(behaviorExpr),
        end: this.lastTokenEnd,
      };
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
  // Arrow functions (single identifier parameter for v1)
  // ------------------------------------------------------------------------------------------

  private parseArrowFromLeft(left: IsBinary | ConditionalExpression): ArrowFunction {
    const paramSpan = left.span;

    let name: string | null = null;
    if (
      (left as Partial<AccessScopeExpression>).$kind === "AccessScope" ||
      (left as Partial<AccessGlobalExpression>).$kind === "AccessGlobal"
    ) {
      name = (left as AccessScopeExpression | AccessGlobalExpression).name;
    }

    if (name == null) {
      const arrowTok = this.peekToken();
      this.error(
        "Arrow functions currently support only a single identifier parameter in the LSP parser",
        arrowTok,
      );
    }

    // Consume =>
    const arrowTok = this.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      this.error("Expected '=>'", arrowTok);
    }
    this.nextToken();

    const arg: BindingIdentifier = {
      $kind: "BindingIdentifier",
      span: paramSpan,
      name,
    };

    const body = this.parseAssignExpr();
    const span: TextSpan = {
      start: paramSpan.start,
      end: this.getEndSpan(body),
    };

    const fn: ArrowFunction = {
      $kind: "ArrowFunction",
      span,
      args: [arg],
      body,
      rest: false,
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

  private spanFromToken(t: Token): TextSpan {
    return { start: t.start, end: t.end };
  }

  private getEndSpan(node: { span: TextSpan }): number {
    return node.span.end;
  }

  private getNodeStart(node: { span: TextSpan }): number {
    return node.span.start;
  }

  private error(message: string, token?: Token): never {
    const pos = token ? token.start : this.scanner.position;
    throw new Error(
      `[LspExpressionParser] ${message} at ${pos}`,
    );
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
  ): AccessScopeExpression | AccessKeyedExpression | AccessMemberExpression | AssignExpression {
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
        this.error("Left-hand side is not assignable", opToken);
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

export class LspExpressionParser implements IExpressionParser {
  // Overload signatures from IExpressionParser
  parse(expression: string, expressionType: "IsIterator"): ForOfStatement;
  parse(expression: string, expressionType: "Interpolation"): Interpolation;
  parse(
    expression: string,
    expressionType: "IsFunction" | "IsProperty",
  ): IsBindingBehavior;
  parse(expression: string, expressionType: "IsCustom"): CustomExpression;
  parse(expression: string, expressionType: ExpressionType): AnyBindingExpression;

  // Implementation
  parse(
    expression: string,
    expressionType: ExpressionType,
  ): AnyBindingExpression {
    switch (expressionType) {
      case "IsProperty":
      case "IsFunction": {
        const core = new CoreParser(expression);
        return core.parseBindingExpression();
      }

      case "IsIterator":
      case "Interpolation":
      case "IsCustom": {
        // These modes will be implemented in later steps.
        throw new Error(
          `[LspExpressionParser] ExpressionType '${expressionType}' is not implemented yet.`,
        );
      }

      default:
        // Exhaustive guard – should be unreachable due to ExpressionType union.
        throw new Error(
          `[LspExpressionParser] Unknown expression type '${expressionType}'`,
        );
    }
  }
}
