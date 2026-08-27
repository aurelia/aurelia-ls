import type { ProductHandle } from '../kernel/handles.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import type {
  ExpressionParseResult,
  IteratorParseResult,
} from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import {
  BindingCommandBuildInfo,
  type BindingCommandBuildContext,
  BindingCommandBuildResult,
  type BindingCommandExecutable,
  BindingCommandExecutionKind,
  type BindingCommandInstructionAllocation,
  bindingCommandIteratorParse,
  type BindingCommandIteratorParse,
  BindingCommandLoweringState,
  type BindingCommandSyntax,
  bindingCommandTailSyntaxFromExecution,
  type BindingCommandTailSyntax,
} from './binding-command-execution.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import { TemplateCompilerReadKind } from './compiler-read-view.js';
import type {
  AttributeParserParseResult,
} from './attribute-syntax.js';
import type {
  HtmlAttributeReference,
  HtmlNodeReference,
} from './html-ir.js';
import type {
  TemplateInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';

export const enum TemplateCompilerLiveBindingCommandState {
  /** A framework-owned command body ran and returned a closed or invalid semantic outcome. */
  Executed = 'executed',
  /** Command execution could not close over a framework-owned executable body. */
  Open = 'open',
}

export const enum TemplateCompilerLiveBindingCommandOpenReasonKind {
  /** The command resolver did not contain the requested name. */
  CommandAbsent = 'command-absent',
  /** The resolved command is custom, opaque, or otherwise not a modeled framework body. */
  ExecutableBodyOpen = 'executable-body-open',
  /** A command marked built-in had no matching framework handler in this compiler world. */
  BuiltInHandlerAbsent = 'built-in-handler-absent',
  /** A caller-supplied command receipt belongs to another lookup or compiler scope. */
  SelectedCommandReadMismatch = 'selected-command-read-mismatch',
  /** The framework handler explicitly retained an open semantic result. */
  HandlerReturnedOpen = 'handler-returned-open',
}

/** One caller-owned deterministic instruction-handle allocation request. */
export class TemplateCompilerLiveInstructionHandleRequest {
  constructor(
    readonly instructionKind: TemplateInstructionKind,
    readonly local: string,
    readonly ordinal: number,
  ) {}
}

/** One caller-owned deterministic expression-handle allocation request. */
export class TemplateCompilerLiveExpressionHandleRequest {
  constructor(
    readonly entryFamily: ExpressionType,
    readonly expression: string,
    readonly ordinal: number,
  ) {}
}

/**
 * Handle authority supplied by the run that owns the eventual target plan.
 * Live command execution never allocates from global or hidden mutable state.
 */
export interface TemplateCompilerLiveBindingCommandHandleFactory {
  instruction(request: TemplateCompilerLiveInstructionHandleRequest): BindingCommandInstructionAllocation;
  expression(request: TemplateCompilerLiveExpressionHandleRequest): ProductHandle;
}

/** Raw parser result paired with the compiler-service read that authorized it. */
export class TemplateCompilerLiveBindingCommandExpressionParse {
  constructor(
    readonly expressionProductHandle: ProductHandle,
    readonly expression: string,
    readonly entryFamily: ExpressionType,
    readonly sourceSpan: SourceSpan | null,
    readonly result: ExpressionParseResult,
    readonly compilerRead: TemplateCompilerReadObservation,
  ) {}
}

/** Secondary attribute parse used by command-owned grammars such as repeat tails. */
export class TemplateCompilerLiveBindingCommandAttributeParse {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly result: AttributeParserParseResult,
    readonly compilerRead: TemplateCompilerReadObservation,
  ) {}
}

/** Abrupt framework-handler failure retained separately from semantic Open. */
export class TemplateCompilerLiveBindingCommandAbruptFailure {
  constructor(readonly message: string) {}
}

/** Product-free input for one reached command-bearing attribute site. */
export class TemplateCompilerLiveBindingCommandRequest {
  constructor(
    readonly compilerReads: TemplateCompilerReadView,
    /** Browser-current owner view before this attribute executes. */
    readonly owner: TemplateAttributeMapperNode,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly syntax: BindingCommandSyntax,
    readonly commandName: string,
    readonly handles: TemplateCompilerLiveBindingCommandHandleFactory,
    readonly bindable: BindableDefinition | null = null,
    readonly expressionParseContext: ExpressionParseContext | null = null,
    readonly selectedCommandRead: TemplateCompilerObservedValue<BindingCommandExecutable | null> | undefined = undefined,
  ) {}
}

export class TemplateCompilerLiveBindingCommandExecution {
  readonly state = TemplateCompilerLiveBindingCommandState.Executed;

  constructor(
    readonly command: BindingCommandExecutable,
    readonly commandRead: TemplateCompilerReadObservation,
    readonly outcome: BindingCommandBuildResult,
    readonly instructions: readonly TemplateInstruction[],
    readonly expressionParses: readonly TemplateCompilerLiveBindingCommandExpressionParse[],
    readonly attributeParses: readonly TemplateCompilerLiveBindingCommandAttributeParse[],
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
    readonly abruptFailure: TemplateCompilerLiveBindingCommandAbruptFailure | null = null,
  ) {}

  get ignoreAttr(): boolean | null {
    return this.command.ignoreAttr;
  }
}

export class TemplateCompilerLiveBindingCommandOpen {
  readonly state = TemplateCompilerLiveBindingCommandState.Open;

  constructor(
    readonly reasonKind: TemplateCompilerLiveBindingCommandOpenReasonKind,
    readonly message: string,
    readonly command: BindingCommandExecutable | null,
    readonly commandRead: TemplateCompilerReadObservation,
    readonly outcome: BindingCommandBuildResult,
    readonly instructions: readonly TemplateInstruction[],
    readonly expressionParses: readonly TemplateCompilerLiveBindingCommandExpressionParse[],
    readonly attributeParses: readonly TemplateCompilerLiveBindingCommandAttributeParse[],
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
  ) {}

  get ignoreAttr(): boolean | null {
    return this.command?.ignoreAttr ?? null;
  }
}

export type TemplateCompilerLiveBindingCommandResult =
  | TemplateCompilerLiveBindingCommandExecution
  | TemplateCompilerLiveBindingCommandOpen;

/** Execute one reached command against the caller's browser-current attribute owner view. */
export function executeTemplateCompilerLiveBindingCommand(
  request: TemplateCompilerLiveBindingCommandRequest,
): TemplateCompilerLiveBindingCommandResult {
  const commandRead = request.selectedCommandRead
    ?? request.compilerReads.readBindingCommand(request.commandName);
  if (
    commandRead.observation.readKind !== TemplateCompilerReadKind.BindingCommand
    || commandRead.observation.canonicalKey !== request.commandName
    || commandRead.observation.compilerScopeIdentityHandle !== request.compilerReads.world.resourceScope.identityHandle
  ) {
    return emptyOpen(
      commandRead.observation,
      TemplateCompilerLiveBindingCommandOpenReasonKind.SelectedCommandReadMismatch,
      `Selected binding-command read does not authorize '${request.commandName}' in the current compiler scope.`,
      commandRead.value,
    );
  }
  const command = commandRead.value;
  if (command == null) {
    const message = `Binding command '${request.commandName}' is absent from the current compiler world.`;
    return emptyOpen(
      commandRead.observation,
      TemplateCompilerLiveBindingCommandOpenReasonKind.CommandAbsent,
      message,
    );
  }

  const registered = request.compilerReads.world.bindingCommands.find((candidate) =>
    candidate.executable === command
  ) ?? null;
  if (command.executionKind !== BindingCommandExecutionKind.BuiltIn) {
    const message = `Binding command '${command.name}' reached an executable body this substrate does not model.`;
    return emptyOpen(
      commandRead.observation,
      TemplateCompilerLiveBindingCommandOpenReasonKind.ExecutableBodyOpen,
      message,
      command,
    );
  }
  if (registered?.handler == null) {
    const message = `Built-in binding command '${command.name}' has no framework handler in the current compiler world.`;
    return emptyOpen(
      commandRead.observation,
      TemplateCompilerLiveBindingCommandOpenReasonKind.BuiltInHandlerAbsent,
      message,
      command,
    );
  }

  const context = new LiveBindingCommandBuildContext(request);
  const buildInfo = new BindingCommandBuildInfo(
    request.node,
    request.attribute,
    request.syntax,
    request.bindable,
    null,
    null,
    null,
    request.syntax.sourceAddressHandle,
  );
  let outcome: BindingCommandBuildResult;
  try {
    outcome = registered.handler.build(buildInfo, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.executed(
      command,
      commandRead.observation,
      BindingCommandBuildResult.invalid(message),
      new TemplateCompilerLiveBindingCommandAbruptFailure(message),
    );
  }

  if (outcome.state === BindingCommandLoweringState.Open) {
    const message = outcome.message ?? `Binding command '${command.name}' retained an open build result.`;
    return context.open(
      command,
      commandRead.observation,
      TemplateCompilerLiveBindingCommandOpenReasonKind.HandlerReturnedOpen,
      message,
      outcome,
    );
  }
  return context.executed(command, commandRead.observation, outcome);
}

class LiveBindingCommandBuildContext implements BindingCommandBuildContext {
  private readonly reads: TemplateCompilerReadObservation[] = [];
  private readonly expressionParseBuffer: TemplateCompilerLiveBindingCommandExpressionParse[] = [];
  private readonly attributeParseBuffer: TemplateCompilerLiveBindingCommandAttributeParse[] = [];
  private instructionOrdinal = 0;
  private expressionOrdinal = 0;

  constructor(private readonly request: TemplateCompilerLiveBindingCommandRequest) {}

  allocateInstruction(
    kind: TemplateInstructionKind,
    _info: BindingCommandBuildInfo,
    local: string,
  ): BindingCommandInstructionAllocation {
    return this.request.handles.instruction(new TemplateCompilerLiveInstructionHandleRequest(
      kind,
      local,
      this.instructionOrdinal++,
    ));
  }

  parsePropertyExpression(
    expression: string,
    info: BindingCommandBuildInfo,
    sourceSpan: SourceSpan | null,
  ): ProductHandle {
    return this.parseExpression(expression, 'IsProperty', info, sourceSpan);
  }

  parseFunctionExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): ProductHandle {
    return this.parseExpression(expression, 'IsFunction', info, null);
  }

  parseIteratorExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): BindingCommandIteratorParse {
    const handle = this.parseExpression(expression, 'IsIterator', info, null);
    const parse = this.expressionParseBuffer[this.expressionParseBuffer.length - 1]!;
    return bindingCommandIteratorParse(handle, parse.result as IteratorParseResult);
  }

  parseAttributeSyntax(
    rawName: string,
    rawValue: string,
    _info: BindingCommandBuildInfo,
  ): BindingCommandTailSyntax {
    const observed = this.request.compilerReads.readParsedAttribute(rawName, rawValue);
    this.retainRead(observed.observation);
    this.attributeParseBuffer.push(new TemplateCompilerLiveBindingCommandAttributeParse(
      rawName,
      rawValue,
      observed.value,
      observed.observation,
    ));
    return bindingCommandTailSyntaxFromExecution(observed.value.execution);
  }

  mapAttribute(
    _node: HtmlNodeReference,
    attr: string,
  ): string | null {
    const observed = this.request.compilerReads.readMappedAttribute(this.request.owner, attr);
    this.retainRead(observed.observation);
    return observed.value;
  }

  isTwoWay(
    _node: HtmlNodeReference,
    attr: string,
  ): boolean | null {
    const observed = this.request.compilerReads.readTwoWay(this.request.owner, attr);
    this.retainRead(observed.observation);
    return observed.value;
  }

  executed(
    command: BindingCommandExecutable,
    commandRead: TemplateCompilerReadObservation,
    outcome: BindingCommandBuildResult,
    abruptFailure: TemplateCompilerLiveBindingCommandAbruptFailure | null = null,
  ): TemplateCompilerLiveBindingCommandExecution {
    return new TemplateCompilerLiveBindingCommandExecution(
      command,
      commandRead,
      outcome,
      outcome.instructions,
      [...this.expressionParseBuffer],
      [...this.attributeParseBuffer],
      [commandRead, ...this.reads],
      abruptFailure,
    );
  }

  open(
    command: BindingCommandExecutable,
    commandRead: TemplateCompilerReadObservation,
    reasonKind: TemplateCompilerLiveBindingCommandOpenReasonKind,
    message: string,
    outcome: BindingCommandBuildResult,
  ): TemplateCompilerLiveBindingCommandOpen {
    return new TemplateCompilerLiveBindingCommandOpen(
      reasonKind,
      message,
      command,
      commandRead,
      outcome,
      outcome.instructions,
      [...this.expressionParseBuffer],
      [...this.attributeParseBuffer],
      [commandRead, ...this.reads],
    );
  }

  private parseExpression(
    expression: string,
    entryFamily: ExpressionType,
    _info: BindingCommandBuildInfo,
    sourceSpan: SourceSpan | null,
  ): ProductHandle {
    const parseContext = sourceSpan == null
      ? this.request.expressionParseContext ?? undefined
      : { baseSpan: sourceSpan };
    const observed = this.request.compilerReads.readParsedExpression(expression, entryFamily, parseContext);
    const handle = this.request.handles.expression(new TemplateCompilerLiveExpressionHandleRequest(
      entryFamily,
      expression,
      this.expressionOrdinal++,
    ));
    this.retainRead(observed.observation);
    this.expressionParseBuffer.push(new TemplateCompilerLiveBindingCommandExpressionParse(
      handle,
      expression,
      entryFamily,
      sourceSpan,
      observed.value,
      observed.observation,
    ));
    return handle;
  }

  private retainRead(read: TemplateCompilerReadObservation): void {
    if (!this.reads.includes(read)) {
      this.reads.push(read);
    }
  }
}

function emptyOpen(
  commandRead: TemplateCompilerReadObservation,
  reasonKind: TemplateCompilerLiveBindingCommandOpenReasonKind,
  message: string,
  command: BindingCommandExecutable | null = null,
): TemplateCompilerLiveBindingCommandOpen {
  const outcome = BindingCommandBuildResult.open(message);
  return new TemplateCompilerLiveBindingCommandOpen(
    reasonKind,
    message,
    command,
    commandRead,
    outcome,
    [],
    [],
    [],
    [commandRead],
  );
}
