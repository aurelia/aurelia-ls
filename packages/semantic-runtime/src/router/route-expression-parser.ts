const ROUTE_EXPRESSION_TERMINALS = new Set(['?', '#', '/', '+', '(', ')', '@', '!', '=', ',', '&', "'", '~', ';']);

export type ParsedRouteExpressionKind =
  | 'CompositeSegment'
  | 'ScopedSegment'
  | 'SegmentGroup'
  | 'Segment';

export interface ParsedRouteExpression {
  readonly isAbsolute: boolean;
  readonly root: ParsedCompositeSegmentExpressionOrHigher;
  readonly instructions: readonly ParsedViewportInstruction[];
  readonly queryParamCount: number;
  readonly queryParams: readonly ParsedRouteQueryParam[];
  readonly fragment: string | null;
}

export interface ParsedRouteQueryParam {
  readonly name: string;
  readonly value: string;
}

export type ParsedCompositeSegmentExpressionOrHigher =
  | ParsedScopedSegmentExpressionOrHigher
  | ParsedCompositeSegmentExpression;

export interface ParsedCompositeSegmentExpression {
  readonly kind: 'CompositeSegment';
  readonly siblings: readonly ParsedScopedSegmentExpressionOrHigher[];
}

export type ParsedScopedSegmentExpressionOrHigher =
  | ParsedSegmentGroupExpressionOrHigher
  | ParsedScopedSegmentExpression;

export interface ParsedScopedSegmentExpression {
  readonly kind: 'ScopedSegment';
  readonly left: ParsedSegmentGroupExpressionOrHigher;
  readonly right: ParsedScopedSegmentExpressionOrHigher;
}

export type ParsedSegmentGroupExpressionOrHigher =
  | ParsedSegmentExpression
  | ParsedSegmentGroupExpression;

export interface ParsedSegmentGroupExpression {
  readonly kind: 'SegmentGroup';
  readonly expression: ParsedCompositeSegmentExpressionOrHigher;
}

export interface ParsedSegmentExpression {
  readonly kind: 'Segment';
  readonly component: string;
  readonly viewport: string | null;
  readonly parameterCount: number;
  readonly scoped: boolean;
}

export interface ParsedViewportInstruction {
  readonly component: string;
  readonly viewport: string | null;
  readonly parameterCount: number;
  readonly children: readonly ParsedViewportInstruction[];
  readonly open: number;
  readonly close: number;
}

export type RouteExpressionParseFailureKind =
  | 'unexpected-segment'
  | 'not-done';

export class RouteExpressionParseFailure extends Error {
  constructor(
    readonly failureKind: RouteExpressionParseFailureKind,
    readonly expected: string,
    readonly offset: number,
    readonly input: string,
    readonly rest: string,
  ) {
    super(routeExpressionParseFailureMessage(failureKind, expected, offset, input, rest));
  }
}

class ParserState {
  private index = 0;

  constructor(
    readonly input: string,
  ) {}

  get done(): boolean {
    return this.index >= this.input.length;
  }

  startsWith(value: string): boolean {
    return this.input.startsWith(value, this.index);
  }

  consumeOptional(value: string): boolean {
    if (!this.startsWith(value)) {
      return false;
    }
    this.index += value.length;
    return true;
  }

  consume(value: string): void {
    if (!this.consumeOptional(value)) {
      this.fail(`'${value}'`);
    }
  }

  readUntilTerminal(): string {
    const start = this.index;
    while (!this.done && !ROUTE_EXPRESSION_TERMINALS.has(this.input[this.index]!)) {
      this.index += 1;
    }
    return this.input.slice(start, this.index);
  }

  fail(expected: string): never {
    throw new RouteExpressionParseFailure(
      'unexpected-segment',
      expected,
      this.index,
      this.input,
      this.input.slice(this.index),
    );
  }

  ensureDone(): void {
    if (!this.done) {
      throw new RouteExpressionParseFailure(
        'not-done',
        'end of route expression',
        this.index,
        this.input,
        this.input.slice(this.index),
      );
    }
  }
}

function routeExpressionParseFailureMessage(
  failureKind: RouteExpressionParseFailureKind,
  expected: string,
  offset: number,
  input: string,
  rest: string,
): string {
  return failureKind === 'not-done'
    ? `Unexpected '${rest}' at route-expression offset ${offset} of '${input}'.`
    : `Expected ${expected} at route-expression offset ${offset} of '${input}', but got '${rest}'.`;
}

interface ParsedUrlParts {
  readonly path: string;
  readonly queryParamCount: number;
  readonly queryParams: readonly ParsedRouteQueryParam[];
  readonly fragment: string | null;
}

export function parseRouteExpression(value: string): ParsedRouteExpression {
  const url = parseRouteUrl(value);
  if (url.path.length === 0) {
    const root = emptySegmentExpression();
    return {
      isAbsolute: false,
      root,
      instructions: instructionsForRouteExpression(root),
      queryParamCount: url.queryParamCount,
      queryParams: url.queryParams,
      fragment: url.fragment,
    };
  }

  const state = new ParserState(url.path);
  const isAbsolute = state.consumeOptional('/');
  if (state.done) {
    const root = emptySegmentExpression();
    return {
      isAbsolute,
      root,
      instructions: instructionsForRouteExpression(root),
      queryParamCount: url.queryParamCount,
      queryParams: url.queryParams,
      fragment: url.fragment,
    };
  }
  const root = parseCompositeExpression(state);
  state.ensureDone();
  return {
    isAbsolute,
    root,
    instructions: instructionsForRouteExpression(root),
    queryParamCount: url.queryParamCount,
    queryParams: url.queryParams,
    fragment: url.fragment,
  };
}

export function redirectMigrationSegmentsForRouteExpression(
  root: ParsedCompositeSegmentExpressionOrHigher,
): readonly ParsedSegmentExpression[] | null {
  if (root.kind === 'Segment') {
    return [root];
  }
  if (root.kind !== 'ScopedSegment') {
    return null;
  }

  const segments: ParsedSegmentExpression[] = [];
  let current: ParsedScopedSegmentExpressionOrHigher = root;
  while (current.kind === 'ScopedSegment') {
    if (current.left.kind !== 'Segment') {
      return null;
    }
    segments.push(current.left);
    current = current.right;
  }
  if (current.kind !== 'Segment') {
    return null;
  }
  segments.push(current);
  return segments;
}

export function firstUnexpectedRedirectMigrationExpressionKind(
  root: ParsedCompositeSegmentExpressionOrHigher,
): ParsedRouteExpressionKind | null {
  if (root.kind === 'Segment') {
    return null;
  }
  if (root.kind !== 'ScopedSegment') {
    return root.kind;
  }

  let current: ParsedScopedSegmentExpressionOrHigher = root;
  while (current.kind === 'ScopedSegment') {
    if (current.left.kind !== 'Segment') {
      return current.left.kind;
    }
    if (current.right.kind === 'Segment') {
      return null;
    }
    if (current.right.kind !== 'ScopedSegment') {
      return current.right.kind;
    }
    current = current.right;
  }
  return null;
}

function parseRouteUrl(value: string): ParsedUrlParts {
  const hashIndex = value.indexOf('#');
  const withoutFragment = hashIndex < 0 ? value : value.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? null : decodeURIComponent(value.slice(hashIndex + 1));
  const queryIndex = withoutFragment.indexOf('?');
  const path = queryIndex < 0 ? withoutFragment : withoutFragment.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : withoutFragment.slice(queryIndex + 1);
  const queryParams = routeQueryParams(query);
  return {
    path,
    queryParamCount: queryParams.length,
    queryParams,
    fragment: fragment == null || fragment.length === 0 ? null : fragment,
  };
}

function routeQueryParams(query: string): readonly ParsedRouteQueryParam[] {
  if (query.length === 0) {
    return [];
  }
  const values: ParsedRouteQueryParam[] = [];
  for (const [key, value] of new URLSearchParams(query)) {
    if (key.length > 0) {
      values.push({ name: key, value });
    }
  }
  return values;
}

function parseCompositeExpression(
  state: ParserState,
): ParsedCompositeSegmentExpressionOrHigher {
  const append = state.consumeOptional('+');
  const siblings: ParsedScopedSegmentExpressionOrHigher[] = [];
  do {
    siblings.push(parseScopedExpression(state));
  } while (state.consumeOptional('+'));

  if (!append && siblings.length === 1) {
    return siblings[0]!;
  }
  return {
    kind: 'CompositeSegment',
    siblings,
  };
}

function parseScopedExpression(
  state: ParserState,
): ParsedScopedSegmentExpressionOrHigher {
  const left = parseSegmentGroupExpression(state);
  if (!state.consumeOptional('/')) {
    return left;
  }
  return {
    kind: 'ScopedSegment',
    left,
    right: parseScopedExpression(state),
  };
}

function parseSegmentGroupExpression(
  state: ParserState,
): ParsedSegmentGroupExpressionOrHigher {
  if (!state.consumeOptional('(')) {
    return parseSegmentExpression(state);
  }
  const expression = parseCompositeExpression(state);
  state.consume(')');
  return {
    kind: 'SegmentGroup',
    expression,
  };
}

function parseSegmentExpression(
  state: ParserState,
): ParsedSegmentExpression {
  const component = parseComponent(state);
  const viewport = parseViewport(state);
  const scoped = !state.consumeOptional('!');
  return {
    kind: 'Segment',
    component: component.name,
    viewport,
    parameterCount: component.parameterCount,
    scoped,
  };
}

function parseComponent(
  state: ParserState,
): {
  readonly name: string;
  readonly parameterCount: number;
} {
  const name = state.readUntilTerminal();
  if (name.length === 0) {
    state.fail('component name');
  }
  return {
    name,
    parameterCount: parseParameterCount(state),
  };
}

function parseParameterCount(state: ParserState): number {
  if (!state.consumeOptional('(')) {
    return 0;
  }
  let count = 0;
  do {
    parseParameter(state, count);
    count += 1;
    if (!state.consumeOptional(',')) {
      break;
    }
  } while (!state.done && !state.startsWith(')'));
  state.consume(')');
  return count;
}

function parseParameter(
  state: ParserState,
  index: number,
): void {
  const key = state.readUntilTerminal();
  if (key.length === 0) {
    state.fail('parameter key');
  }
  if (!state.consumeOptional('=')) {
    void index;
    return;
  }
  const value = state.readUntilTerminal();
  if (value.length === 0) {
    state.fail('parameter value');
  }
  decodeURIComponent(value);
}

function parseViewport(state: ParserState): string | null {
  if (!state.consumeOptional('@')) {
    return null;
  }
  const name = decodeURIComponent(state.readUntilTerminal());
  if (name.length === 0) {
    state.fail('viewport name');
  }
  return name;
}

function instructionsForRouteExpression(
  expression: ParsedCompositeSegmentExpressionOrHigher,
): readonly ParsedViewportInstruction[] {
  return instructionsForExpression(expression, 0, 0);
}

function instructionsForExpression(
  expression: ParsedCompositeSegmentExpressionOrHigher,
  open: number,
  close: number,
): readonly ParsedViewportInstruction[] {
  switch (expression.kind) {
    case 'CompositeSegment':
      return instructionsForCompositeExpression(expression, open, close);
    case 'ScopedSegment':
      return instructionsForScopedExpression(expression, open, close);
    case 'SegmentGroup':
      return instructionsForExpression(expression.expression, open + 1, close + 1);
    case 'Segment':
      return [viewportInstruction(
        expression.component,
        expression.viewport,
        expression.parameterCount,
        [],
        open,
        close,
      )];
  }
}

function instructionsForCompositeExpression(
  expression: ParsedCompositeSegmentExpression,
  open: number,
  close: number,
): readonly ParsedViewportInstruction[] {
  switch (expression.siblings.length) {
    case 0:
      return [];
    case 1:
      return instructionsForExpression(expression.siblings[0]!, open, close);
    case 2:
      return [
        ...instructionsForExpression(expression.siblings[0]!, open, 0),
        ...instructionsForExpression(expression.siblings[1]!, 0, close),
      ];
    default:
      return [
        ...instructionsForExpression(expression.siblings[0]!, open, 0),
        ...expression.siblings.slice(1, -1).flatMap((sibling) =>
          instructionsForExpression(sibling, 0, 0)
        ),
        ...instructionsForExpression(expression.siblings[expression.siblings.length - 1]!, 0, close),
      ];
  }
}

function instructionsForScopedExpression(
  expression: ParsedScopedSegmentExpression,
  open: number,
  close: number,
): readonly ParsedViewportInstruction[] {
  const left = instructionsForExpression(expression.left, open, 0);
  const right = instructionsForExpression(expression.right, 0, close);
  const leftCopy = left.slice();
  const last = leftCopy.length - 1;
  leftCopy[last] = withDeepestChild(leftCopy[last]!, right);
  return leftCopy;
}

function withDeepestChild(
  instruction: ParsedViewportInstruction,
  children: readonly ParsedViewportInstruction[],
): ParsedViewportInstruction {
  if (instruction.children.length === 0) {
    return {
      ...instruction,
      children,
    };
  }
  const instructionChildren = instruction.children.slice();
  const last = instructionChildren.length - 1;
  instructionChildren[last] = withDeepestChild(instructionChildren[last]!, children);
  return {
    ...instruction,
    children: instructionChildren,
  };
}

function emptySegmentExpression(): ParsedSegmentExpression {
  return {
    kind: 'Segment',
    component: '',
    viewport: null,
    parameterCount: 0,
    scoped: true,
  };
}

function viewportInstruction(
  component: string,
  viewport: string | null,
  parameterCount: number,
  children: readonly ParsedViewportInstruction[],
  open: number,
  close: number,
): ParsedViewportInstruction {
  return {
    component,
    viewport,
    parameterCount,
    children,
    open,
    close,
  };
}
