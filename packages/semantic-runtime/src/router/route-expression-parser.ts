const ROUTE_EXPRESSION_TERMINALS = new Set(['?', '#', '/', '+', '(', ')', '@', '!', '=', ',', '&', "'", '~', ';']);

export interface ParsedRouteExpression {
  readonly isAbsolute: boolean;
  readonly instructions: readonly ParsedViewportInstruction[];
  readonly queryParamCount: number;
  readonly fragment: string | null;
}

export interface ParsedViewportInstruction {
  readonly component: string;
  readonly viewport: string | null;
  readonly parameterCount: number;
  readonly children: readonly ParsedViewportInstruction[];
  readonly open: number;
  readonly close: number;
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
    throw new Error(`Expected ${expected} at route-expression offset ${this.index}.`);
  }

  ensureDone(): void {
    if (!this.done) {
      this.fail('end of route expression');
    }
  }
}

interface ParsedUrlParts {
  readonly path: string;
  readonly queryParamCount: number;
  readonly fragment: string | null;
}

export function parseRouteExpression(value: string): ParsedRouteExpression {
  const url = parseRouteUrl(value);
  if (url.path.length === 0) {
    return {
      isAbsolute: false,
      instructions: [viewportInstruction('', null, 0, [], 0, 0)],
      queryParamCount: url.queryParamCount,
      fragment: url.fragment,
    };
  }

  const state = new ParserState(url.path);
  const isAbsolute = state.consumeOptional('/');
  if (state.done) {
    return {
      isAbsolute,
      instructions: [viewportInstruction('', null, 0, [], 0, 0)],
      queryParamCount: url.queryParamCount,
      fragment: url.fragment,
    };
  }
  const instructions = parseComposite(state, 0, 0);
  state.ensureDone();
  return {
    isAbsolute,
    instructions,
    queryParamCount: url.queryParamCount,
    fragment: url.fragment,
  };
}

function parseRouteUrl(value: string): ParsedUrlParts {
  const hashIndex = value.indexOf('#');
  const withoutFragment = hashIndex < 0 ? value : value.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? null : decodeURIComponent(value.slice(hashIndex + 1));
  const queryIndex = withoutFragment.indexOf('?');
  const path = queryIndex < 0 ? withoutFragment : withoutFragment.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : withoutFragment.slice(queryIndex + 1);
  return {
    path,
    queryParamCount: countQueryParams(query),
    fragment: fragment == null || fragment.length === 0 ? null : fragment,
  };
}

function countQueryParams(query: string): number {
  if (query.length === 0) {
    return 0;
  }
  let count = 0;
  for (const [key] of new URLSearchParams(query)) {
    if (key.length > 0) {
      count += 1;
    }
  }
  return count;
}

function parseComposite(
  state: ParserState,
  open: number,
  close: number,
): ParsedViewportInstruction[] {
  state.consumeOptional('+');
  const siblings: ParsedViewportInstruction[][] = [];
  do {
    siblings.push(parseScoped(state, siblings.length === 0 ? open : 0, 0));
  } while (state.consumeOptional('+'));

  if (siblings.length === 0) {
    state.fail('route segment');
  }

  const flattened = siblings.flat();
  const last = flattened.length - 1;
  flattened[last] = addGrouping(flattened[last]!, 0, close);
  return flattened;
}

function parseScoped(
  state: ParserState,
  open: number,
  close: number,
): ParsedViewportInstruction[] {
  const left = parseSegmentGroup(state, open, 0);
  if (!state.consumeOptional('/')) {
    return addCloseToLast(left, close);
  }
  const right = parseScoped(state, 0, close);
  const leftCopy = left.slice();
  const lastLeft = leftCopy[leftCopy.length - 1]!;
  leftCopy[leftCopy.length - 1] = withDeepestChild(lastLeft, right);
  return leftCopy;
}

function parseSegmentGroup(
  state: ParserState,
  open: number,
  close: number,
): ParsedViewportInstruction[] {
  if (!state.consumeOptional('(')) {
    return [parseSegment(state, open, close)];
  }
  const instructions = parseComposite(state, open + 1, close + 1);
  state.consume(')');
  return instructions;
}

function parseSegment(
  state: ParserState,
  open: number,
  close: number,
): ParsedViewportInstruction {
  const component = parseComponent(state);
  const viewport = parseViewport(state);
  state.consumeOptional('!');
  return viewportInstruction(
    component.name,
    viewport,
    component.parameterCount,
    [],
    open,
    close,
  );
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

function addCloseToLast(
  instructions: readonly ParsedViewportInstruction[],
  close: number,
): ParsedViewportInstruction[] {
  if (close === 0) {
    return instructions.slice();
  }
  const copy = instructions.slice();
  const last = copy.length - 1;
  copy[last] = addGrouping(copy[last]!, 0, close);
  return copy;
}

function addGrouping(
  instruction: ParsedViewportInstruction,
  open: number,
  close: number,
): ParsedViewportInstruction {
  if (open === 0 && close === 0) {
    return instruction;
  }
  return {
    ...instruction,
    open: instruction.open + open,
    close: instruction.close + close,
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
