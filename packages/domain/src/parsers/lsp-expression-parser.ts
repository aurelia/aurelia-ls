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
  ArrayBindingPattern,
  ObjectBindingPattern,
  BindingIdentifierOrPattern,
  BadExpression,
} from "../compiler/model/ir.js";

import { parseInterpolationAst } from "./interpolation.js";

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

  /**
   * Parse a complete repeat.for header: `lhs of rhs[; tail...]`.
   *
   * - LHS: BindingIdentifier | ArrayBindingPattern | ObjectBindingPattern
   * - RHS: parsed like a normal binding expression, but stops at first top‑level ';'
   * - semiIdx: character index of that ';' in the header string, or -1 if none
   *
   * The returned ForOfStatement.span covers the entire header string (0..source.length).
   */
  public parseIteratorHeader(): ForOfStatement {
    const first = this.peekToken();
    if (first.type === TokenType.EOF) {
      this.error("Empty iterator header", first);
    }

    const declaration = this.parseLhsBinding();

    const ofTok = this.peekToken();
    if (ofTok.type !== TokenType.KeywordOf) {
      this.error("Expected 'of' in iterator header", ofTok);
    }
    this.nextToken(); // 'of'

    const { expr: iterable, semiIdx } = this.parseChainableRhs();

    const span: TextSpan = {
      start: 0,
      end: this.source.length,
    };

    const node: ForOfStatement = {
      $kind: "ForOfStatement",
      span,
      declaration,
      iterable,
      semiIdx,
    };

    return node;
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
  private parseLhsBinding(): BindingIdentifierOrPattern {
    const t = this.peekToken();

    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();

      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();

      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();

      default:
        this.error(
          "Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern",
          t,
        );
    }
  }

  /** Parse a simple binding identifier (no destructuring) used on the LHS of repeat.for or in patterns. */
  private parseBindingIdentifier(): BindingIdentifier {
    const t = this.peekToken();
    if (t.type !== TokenType.Identifier) {
      this.error("Expected identifier", t);
    }
    this.nextToken();
    return this.bindingIdentifierFromToken(t);
  }

  /**
   * Create a BindingIdentifier from an already-consumed identifier token,
   * enforcing the same 'import' restriction as identifier primaries.
   */
  private bindingIdentifierFromToken(t: Token): BindingIdentifier {
    const name = t.value as string;
    if (name === "import") {
      this.error("Bare 'import' is not allowed in binding expressions", t);
    }
    const id: BindingIdentifier = {
      $kind: "BindingIdentifier",
      span: this.spanFromToken(t),
      name,
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
  private parseArrayBindingPattern(): ArrayBindingPattern {
    const open = this.peekToken();
    this.nextToken(); // '['
    const start = open.start;

    const elements: IsAssign[] = [];

    const firstTok = this.peekToken();
    if (firstTok.type === TokenType.CloseBracket) {
      this.error(
        "Array binding pattern must contain at least one identifier",
        firstTok,
      );
    }

    // First element
    const firstBinding = this.parseBindingIdentifier();
    elements.push(firstBinding as unknown as IsAssign);

    let t = this.peekToken();

    // Optional second element
    if (t.type === TokenType.Comma) {
      this.nextToken(); // ','
      const secondTok = this.peekToken();
      if (secondTok.type === TokenType.CloseBracket) {
        this.error(
          "Array binding pattern cannot have a trailing comma",
          secondTok,
        );
      }

      const secondBinding = this.parseBindingIdentifier();
      elements.push(secondBinding as unknown as IsAssign);
      t = this.peekToken();
    }

    // No more elements or syntax allowed in v1
    if (t.type !== TokenType.CloseBracket) {
      this.error(
        "Array binding pattern in iterator header currently supports at most two identifiers '[item, index]'",
        t,
      );
    }
    this.nextToken(); // ']'

    const span: TextSpan = { start, end: this.lastTokenEnd };
    const pattern: ArrayBindingPattern = {
      $kind: "ArrayBindingPattern",
      span,
      elements,
    };
    return pattern;
  }

  /**
   * Simple object binding pattern for repeat.for:
   *   { key, value }      → keys: ["key","value"], values: [id("key"), id("value")]
   *   { key: alias }      → keys: ["key"],         values: [id("alias")]
   *
   * No nested patterns, no defaults, no rest, no trailing comma.
   */
  private parseObjectBindingPattern(): ObjectBindingPattern {
    const open = this.peekToken();
    this.nextToken(); // '{'
    const start = open.start;

    const keys: (string | number)[] = [];
    const values: IsAssign[] = [];

    let t = this.peekToken();
    if (t.type === TokenType.CloseBrace) {
      this.error(
        "Object binding pattern must contain at least one property",
        t,
      );
    }

    while (true) {
      const keyTok = this.peekToken();
      if (
        keyTok.type !== TokenType.Identifier &&
        keyTok.type !== TokenType.StringLiteral &&
        keyTok.type !== TokenType.NumericLiteral
      ) {
        this.error(
          "Invalid object binding pattern key; expected identifier, string, or number",
          keyTok,
        );
      }
      this.nextToken(); // consume key

      let key: string | number;
      if (keyTok.type === TokenType.NumericLiteral) {
        key = keyTok.value as number;
      } else {
        key = String(keyTok.value);
      }

      const afterKey = this.peekToken();
      let binding: BindingIdentifier;

      if (afterKey.type === TokenType.Colon) {
        // { key: alias }
        this.nextToken(); // ':'
        const valueTok = this.peekToken();
        if (valueTok.type !== TokenType.Identifier) {
          this.error(
            "Invalid object binding pattern value; expected identifier after ':'",
            valueTok,
          );
        }
        this.nextToken(); // identifier
        binding = this.bindingIdentifierFromToken(valueTok);
      } else {
        // Shorthand { key } – only allowed for identifier keys
        if (keyTok.type !== TokenType.Identifier) {
          this.error(
            "Object binding pattern shorthand requires an identifier key",
            keyTok,
          );
        }
        binding = this.bindingIdentifierFromToken(keyTok);
      }

      keys.push(key);
      values.push(binding as unknown as IsAssign);

      const sep = this.peekToken();
      if (sep.type === TokenType.Comma) {
        this.nextToken(); // ','
        const next = this.peekToken();
        if (next.type === TokenType.CloseBrace) {
          this.error(
            "Object binding pattern cannot have a trailing comma",
            next,
          );
        }
        continue;
      }

      if (sep.type === TokenType.CloseBrace) {
        this.nextToken();
        break;
      }

      this.error("Expected ',' or '}' in object binding pattern", sep);
    }

    const span: TextSpan = { start, end: this.lastTokenEnd };
    const pattern: ObjectBindingPattern = {
      $kind: "ObjectBindingPattern",
      span,
      keys,
      values,
    };
    return pattern;
  }

  /**
   * Parse the RHS of a repeat.for header with "chainable" semantics:
   *   - parse CoreExpression + tails (value converters / behaviors)
   *   - stop at the first top‑level ';' (if any)
   *   - record semiIdx = index of that ';', or -1 if no semicolon
   *
   * A bare trailing ';' with nothing after it is rejected.
   */
  private parseChainableRhs(): { expr: IsBindingBehavior; semiIdx: number } {
    const core = this.parseAssignExpr();
    const expr = this.parseTails(core);

    let semiIdx = -1;
    const t = this.peekToken();

    if (t.type === TokenType.Semicolon) {
      semiIdx = t.start;
      this.nextToken(); // consume ';'

      const afterSemi = this.peekToken();
      if (afterSemi.type === TokenType.EOF) {
        this.error(
          "Expected tail after ';' in iterator header",
          afterSemi,
        );
      }
      // Tokens after the semicolon (e.g. `key: id; trackBy: foo`) are not
      // parsed by the expression parser; they are handled by the lowerer.
    }

    return { expr, semiIdx };
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

    // Empty parameter list: () => expr
    if (t.type === TokenType.CloseParen) {
      probe.next(); // ')'
    } else {
      // One or more identifiers separated by commas.
      while (true) {
        if (t.type !== TokenType.Identifier) {
          return false;
        }
        probe.next(); // identifier

        t = probe.peek();
        if (t.type === TokenType.Comma) {
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

    const afterParen = probe.peek();
    return afterParen.type === TokenType.EqualsGreaterThan;
  }

  /**
   * Parse an arrow function whose head starts with a '(' we already know is an
   * arrow parameter list, e.g. `(a, b) => body`.
   */
  private parseParenthesizedArrowFunction(openParen: Token): ArrowFunction {
    // Consume '('
    this.nextToken();

    const params: BindingIdentifier[] = [];
    const start = openParen.start;

    let t = this.peekToken();

    // () => expr
    if (t.type === TokenType.CloseParen) {
      this.nextToken(); // ')'
    } else {
      while (true) {
        const idTok = this.peekToken();
        if (idTok.type !== TokenType.Identifier) {
          this.error(
            "Invalid arrow function parameter; expected identifier",
            idTok,
          );
        }
        this.nextToken(); // identifier

        const param: BindingIdentifier = {
          $kind: "BindingIdentifier",
          span: this.spanFromToken(idTok),
          name: idTok.value as string,
        };
        params.push(param);

        t = this.peekToken();
        if (t.type === TokenType.Comma) {
          this.nextToken(); // ','
          t = this.peekToken();
          continue;
        }

        if (t.type === TokenType.CloseParen) {
          this.nextToken(); // ')'
          break;
        }

        this.error("Expected ',' or ')' in arrow parameter list", t);
      }
    }

    const arrowTok = this.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      this.error("Expected '=>'", arrowTok);
    }
    this.nextToken(); // '=>'

    const body = this.parseAssignExpr();
    const span: TextSpan = {
      start,
      end: this.getEndSpan(body),
    };

    const fn: ArrowFunction = {
      $kind: "ArrowFunction",
      span,
      args: params,
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

      case "IsIterator": {
        const core = new CoreParser(expression);
        return core.parseIteratorHeader();
      }

      case "Interpolation": {
        // `${...}` interpolation; reuse CoreParser for each inner segment and
        // offset spans so they are relative to the full interpolation string.
        return parseInterpolationAst(
          expression,
          (segment, baseOffset) => {
            const core = new CoreParser(segment);
            const expr = core.parseBindingExpression();
            this.offsetExpressionSpans(expr, baseOffset);
            return expr;
          },
        );
      }

      case "IsCustom": {
        // For v1, a custom expression simply wraps the raw text. Higher-level
        // plugins can later extend this to attach richer payloads.
        const span: TextSpan = { start: 0, end: expression.length };
        const node: CustomExpression = {
          $kind: "Custom",
          span,
          value: expression,
        };
        return node;
      }

      default:
        // Exhaustive guard – should be unreachable due to ExpressionType union.
        throw new Error(
          `[LspExpressionParser] Unknown expression type '${expressionType}'`,
        );
    }
  }

  /**
   * Recursively offset all `span` fields in an expression tree by `delta`.
   * This is used so that expressions parsed out of `${...}` segments get
   * spans relative to the full interpolation string instead of the sliced
   * segment.
   */
  private offsetExpressionSpans(
    expr: IsBindingBehavior | BadExpression,
    delta: number,
  ): void {
    this.offsetNodeSpans(expr as unknown as Record<string, unknown>, delta);
  }

  private offsetNodeSpans(node: Record<string, unknown>, delta: number): void {
    if (node == null) {
      return;
    }

    const anyNode = node as any;
    if (typeof anyNode !== "object") {
      return;
    }

    if (
      anyNode.span &&
      typeof anyNode.span.start === "number" &&
      typeof anyNode.span.end === "number"
    ) {
      anyNode.span = {
        start: anyNode.span.start + delta,
        end: anyNode.span.end + delta,
      };
    }

    for (const key of Object.keys(anyNode)) {
      if (key === "span") continue;
      const value = anyNode[key];
      if (value == null) continue;

      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === "object") {
            this.offsetNodeSpans(child as Record<string, unknown>, delta);
          }
        }
      } else if (typeof value === "object") {
        this.offsetNodeSpans(value as Record<string, unknown>, delta);
      }
    }
  }
}

