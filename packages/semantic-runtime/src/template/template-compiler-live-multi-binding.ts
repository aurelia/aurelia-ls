import type { ProductHandle } from '../kernel/handles.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import {
  ExpressionParseResultKind,
  type ExpressionParseResult,
} from '../expression/parse-result-algebra.js';
import { sourceSpanFromBounds } from '../expression/source-span.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import {
  AttributeClassificationDecisionIssue,
  unknownBindingCommandDecisionIssue,
} from './attribute-classification-decision.js';
import {
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import {
  AttributeSyntaxSiteParseInput,
  type AttributeSyntaxSiteParseResult,
  parseAttributeSyntaxSite,
} from './attribute-syntax-parsing.js';
import {
  selectTemplateMultiBindingSegmentValueSite,
  type TemplateAttributeValueSiteSelection,
} from './attribute-value-site-selection.js';
import {
  type BindingCommandExecutable,
  BindingCommandLoweringState,
  type BindingCommandSyntax,
} from './binding-command-execution.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import { TemplateCompilerIssueKind } from './compiler-issue.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import {
  HtmlAttributeReference,
  type HtmlNodeReference,
} from './html-ir.js';
import {
  InterpolationInstruction,
  SetPropertyInstruction,
  type TemplateInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';
import {
  parseInlineMultiBindingSegments,
  type ParsedMultiBindingSegment,
} from './multi-binding-segments.js';
import {
  executeTemplateCompilerLiveBindingCommand,
  TemplateCompilerLiveBindingCommandRequest,
  TemplateCompilerLiveBindingCommandState,
  TemplateCompilerLiveExpressionHandleRequest,
  TemplateCompilerLiveInstructionHandleRequest,
  type TemplateCompilerLiveBindingCommandHandleFactory,
  type TemplateCompilerLiveBindingCommandResult,
} from './template-compiler-live-binding-command.js';
import {
  expressionParseStateForResult,
  TemplateExpressionParseState,
} from './value-site.js';

export const enum TemplateCompilerLiveMultiBindingCompletion {
  Complete = 'complete',
  Invalid = 'invalid',
  Open = 'open',
}

export const enum TemplateCompilerLiveMultiBindingReasonKind {
  BindablesOpen = 'bindables-open',
  NoSegment = 'no-segment',
  SyntaxOpen = 'syntax-open',
  CommandOpen = 'command-open',
  UnknownBindingCommand = 'unknown-binding-command',
  BindingToNonBindable = 'binding-to-non-bindable',
  ValueParseInvalid = 'value-parse-invalid',
  ValueParseOpen = 'value-parse-open',
  CommandInvalid = 'command-invalid',
}

export class TemplateCompilerLiveMultiBindingReason {
  constructor(
    readonly reasonKind: TemplateCompilerLiveMultiBindingReasonKind,
    readonly summary: string,
    readonly compilerIssue: AttributeClassificationDecisionIssue | null = null,
  ) {}
}

/** Uncommitted source suffix beginning at the separator that would have advanced to the next segment. */
export class TemplateCompilerLiveMultiBindingRemainder {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly text: string,
  ) {}
}

/** Product-free secondary AttrSyntax consumed by one inline segment. */
export class TemplateCompilerLiveMultiBindingSyntax implements BindingCommandSyntax {
  readonly syntaxKind: AttributeSyntaxKind;
  readonly rawName: string;
  readonly runtimeRawName: string;
  readonly rawValue: string;
  readonly target: string;
  readonly command: string | null;
  readonly parts: readonly string[];
  readonly targetSourceAddressHandle = null;
  readonly commandSourceAddressHandle = null;
  readonly patternParts = [];
  readonly sourceAddressHandle = null;

  constructor(
    readonly segment: ParsedMultiBindingSegment,
    readonly parse: AttributeSyntaxSiteParseResult,
  ) {
    const execution = parse.parse.execution;
    this.syntaxKind = execution.syntaxKind;
    this.rawName = parse.input.rawName;
    this.runtimeRawName = parse.input.runtimeRawName;
    this.rawValue = execution.rawValue;
    this.target = execution.target;
    this.command = execution.command;
    this.parts = execution.parts;
  }
}

/** Bindable and optional command selected in RC2 execution order for one segment. */
export class TemplateCompilerLiveMultiBindingSelection {
  constructor(
    readonly bindable: TemplateBindableReference | null,
    readonly commandRead: TemplateCompilerObservedValue<BindingCommandExecutable | null> | null,
  ) {}
}

/** Interpolation parser execution staged for one command-free segment. */
export class TemplateCompilerLiveMultiBindingValueParse {
  constructor(
    readonly expressionProductHandle: ProductHandle,
    readonly selection: TemplateAttributeValueSiteSelection,
    readonly read: TemplateCompilerObservedValue<ExpressionParseResult>,
  ) {}

  get state(): TemplateExpressionParseState {
    return expressionParseStateForResult(this.read.value);
  }
}

export class TemplateCompilerLiveMultiBindingSegmentResult {
  constructor(
    readonly segment: ParsedMultiBindingSegment,
    readonly syntax: TemplateCompilerLiveMultiBindingSyntax,
    readonly selection: TemplateCompilerLiveMultiBindingSelection,
    readonly valueSelection: TemplateAttributeValueSiteSelection | null,
    readonly valueParse: TemplateCompilerLiveMultiBindingValueParse | null,
    readonly command: TemplateCompilerLiveBindingCommandResult | null,
    readonly instructions: readonly TemplateInstruction[],
    readonly completion: TemplateCompilerLiveMultiBindingCompletion,
    readonly reason: TemplateCompilerLiveMultiBindingReason | null,
  ) {}
}

/** Caller-owned deterministic handle namespace for each reached segment. */
export interface TemplateCompilerLiveMultiBindingHandleAuthority {
  segment(segment: ParsedMultiBindingSegment): TemplateCompilerLiveBindingCommandHandleFactory;
}

export class TemplateCompilerLiveMultiBindingRequest {
  constructor(
    readonly compilerReads: TemplateCompilerReadView,
    readonly owner: TemplateAttributeMapperNode,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly definition: CustomAttributeDefinition,
    readonly rawValue: string,
    readonly handles: TemplateCompilerLiveMultiBindingHandleAuthority,
  ) {}
}

export class TemplateCompilerLiveMultiBindingResult {
  readonly stagedInstructions: readonly TemplateInstruction[];
  readonly instructions: readonly TemplateInstruction[];

  constructor(
    readonly rawValue: string,
    readonly bindablesRead: ReturnType<TemplateCompilerReadView['readBindables']>,
    readonly segments: readonly TemplateCompilerLiveMultiBindingSegmentResult[],
    readonly completion: TemplateCompilerLiveMultiBindingCompletion,
    readonly terminalSegment: TemplateCompilerLiveMultiBindingSegmentResult | null,
    readonly reason: TemplateCompilerLiveMultiBindingReason | null,
    readonly remainder: TemplateCompilerLiveMultiBindingRemainder | null,
  ) {
    this.stagedInstructions = segments.flatMap((segment) => segment.instructions);
    this.instructions = completion === TemplateCompilerLiveMultiBindingCompletion.Complete
      ? this.stagedInstructions
      : [];
  }

  compilerReads(): readonly TemplateCompilerReadObservation[] {
    const reads: TemplateCompilerReadObservation[] = [this.bindablesRead.observation];
    for (const segment of this.segments) {
      retainRead(reads, segment.syntax.parse.read.observation);
      retainRead(reads, segment.selection.commandRead?.observation ?? null);
      retainRead(reads, segment.valueParse?.read.observation ?? null);
      for (const read of segment.command?.compilerReads ?? []) retainRead(reads, read);
    }
    return reads;
  }

  get compilerIssue(): AttributeClassificationDecisionIssue | null {
    return this.reason?.compilerIssue ?? null;
  }

  get terminalExpressionParseResults(): readonly ExpressionParseResult[] {
    const terminal = this.terminalSegment;
    return [
      ...(terminal?.valueParse == null ? [] : [terminal.valueParse.read.value]),
      ...(terminal?.command?.expressionParses.map((parse) => parse.result) ?? []),
    ];
  }

  get abruptCommandFailure() {
    const command = this.terminalSegment?.command;
    return command?.state === TemplateCompilerLiveBindingCommandState.Executed
      ? command.abruptFailure
      : null;
  }
}

/** Execute inline custom-attribute segments in RC2 order without publishing products or target rows. */
export function executeTemplateCompilerLiveMultiBinding(
  request: TemplateCompilerLiveMultiBindingRequest,
): TemplateCompilerLiveMultiBindingResult {
  const bindablesRead = request.compilerReads.readBindables(request.definition);
  if (
    bindablesRead.observation.closure.state !== TemplateCompilerScopeClosureState.Closed
    || !bindablesRead.observation.validate().isCurrent
  ) {
    return new TemplateCompilerLiveMultiBindingResult(
      request.rawValue,
      bindablesRead,
      [],
      TemplateCompilerLiveMultiBindingCompletion.Open,
      null,
      new TemplateCompilerLiveMultiBindingReason(
        TemplateCompilerLiveMultiBindingReasonKind.BindablesOpen,
        `Bindable lookup for custom attribute '${request.definition.name}' is open or no longer current.`,
      ),
      new TemplateCompilerLiveMultiBindingRemainder(0, request.rawValue.length, request.rawValue),
    );
  }
  const parsedSegments = parseInlineMultiBindingSegments(request.rawValue);
  const segments: TemplateCompilerLiveMultiBindingSegmentResult[] = [];
  if (parsedSegments.length === 0) {
    return new TemplateCompilerLiveMultiBindingResult(
      request.rawValue,
      bindablesRead,
      [],
      TemplateCompilerLiveMultiBindingCompletion.Invalid,
      null,
      new TemplateCompilerLiveMultiBindingReason(
        TemplateCompilerLiveMultiBindingReasonKind.NoSegment,
        `Inline multi-binding value for '${request.definition.name}' did not contain a closed segment.`,
      ),
      new TemplateCompilerLiveMultiBindingRemainder(0, request.rawValue.length, request.rawValue),
    );
  }

  for (const parsed of parsedSegments) {
    const result = executeSegment(request, bindablesRead, parsed);
    segments.push(result);
    if (result.completion !== TemplateCompilerLiveMultiBindingCompletion.Complete) {
      return new TemplateCompilerLiveMultiBindingResult(
        request.rawValue,
        bindablesRead,
        segments,
        result.completion,
        result,
        result.reason,
        remainderAfter(request.rawValue, parsed),
      );
    }
  }
  return new TemplateCompilerLiveMultiBindingResult(
    request.rawValue,
    bindablesRead,
    segments,
    TemplateCompilerLiveMultiBindingCompletion.Complete,
    null,
    null,
    null,
  );
}

function executeSegment(
  request: TemplateCompilerLiveMultiBindingRequest,
  bindablesRead: ReturnType<TemplateCompilerReadView['readBindables']>,
  segment: ParsedMultiBindingSegment,
): TemplateCompilerLiveMultiBindingSegmentResult {
  const parse = parseAttributeSyntaxSite(
    request.compilerReads,
    AttributeSyntaxSiteParseInput.runtime(segment.rawName, segment.rawValue),
  );
  const syntax = new TemplateCompilerLiveMultiBindingSyntax(segment, parse);
  if (syntax.syntaxKind === AttributeSyntaxKind.Open) {
    return segmentResult(
      segment,
      syntax,
      new TemplateCompilerLiveMultiBindingSelection(null, null),
      TemplateCompilerLiveMultiBindingCompletion.Open,
      TemplateCompilerLiveMultiBindingReasonKind.SyntaxOpen,
      'Inline multi-binding attribute parsing remained open.',
    );
  }
  const commandRead = syntax.command == null
    ? null
    : request.compilerReads.readBindingCommand(syntax.command);
  const bindable = bindablesRead.value.attr(syntax.target);
  const selection = new TemplateCompilerLiveMultiBindingSelection(bindable, commandRead);
  if (commandRead != null && commandRead.value == null) {
    if (
      commandRead.observation.closure.state !== TemplateCompilerScopeClosureState.Closed
      || !commandRead.observation.validate().isCurrent
    ) {
      return segmentResult(
        segment,
        syntax,
        selection,
        TemplateCompilerLiveMultiBindingCompletion.Open,
        TemplateCompilerLiveMultiBindingReasonKind.CommandOpen,
        `Binding command '${syntax.command ?? '(unknown)'}' is absent, but compiler-scope closure does not prove current absence.`,
      );
    }
    const issue = unknownBindingCommandDecisionIssue(syntax.command ?? '(unknown)');
    return segmentResult(
      segment,
      syntax,
      selection,
      TemplateCompilerLiveMultiBindingCompletion.Invalid,
      TemplateCompilerLiveMultiBindingReasonKind.UnknownBindingCommand,
      issue.message,
      null,
      issue,
    );
  }
  if (bindable == null) {
    const message = `Template compilation error in custom attribute "${request.definition.name}": property "${syntax.target}" is not bindable.`;
    const issue = new AttributeClassificationDecisionIssue(
      TemplateCompilerIssueKind.BindingToNonBindable,
      message,
      TemplateCompilerFrameworkErrorCode.CompilerBindingToNonBindable,
    );
    return segmentResult(
      segment,
      syntax,
      selection,
      TemplateCompilerLiveMultiBindingCompletion.Invalid,
      TemplateCompilerLiveMultiBindingReasonKind.BindingToNonBindable,
      message,
      null,
      issue,
    );
  }

  const handles = request.handles.segment(segment);
  const valueSelection = syntax.command == null
    ? selectTemplateMultiBindingSegmentValueSite(syntax.rawValue)
    : null;
  if (syntax.command != null) {
    const segmentAttribute = new HtmlAttributeReference(
      request.attribute.productHandle,
      null,
      request.attribute.rawName,
    );
    const command = executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
      request.compilerReads,
      request.owner,
      request.node,
      segmentAttribute,
      syntax,
      syntax.command,
      handles,
      bindable.definition,
      { baseSpan: sourceSpanFromBounds(segment.valueStart, segment.valueEnd) },
      commandRead ?? undefined,
    ));
    if (command.state === TemplateCompilerLiveBindingCommandState.Open) {
      return new TemplateCompilerLiveMultiBindingSegmentResult(
        segment,
        syntax,
        selection,
        valueSelection,
        null,
        command,
        command.instructions,
        TemplateCompilerLiveMultiBindingCompletion.Open,
        new TemplateCompilerLiveMultiBindingReason(
          TemplateCompilerLiveMultiBindingReasonKind.CommandOpen,
          command.message,
        ),
      );
    }
    const parseCompletion = completionForParses(command.expressionParses.map((entry) => entry.result));
    if (command.outcome.state === BindingCommandLoweringState.Invalid
      || parseCompletion === TemplateCompilerLiveMultiBindingCompletion.Invalid) {
      return new TemplateCompilerLiveMultiBindingSegmentResult(
        segment,
        syntax,
        selection,
        valueSelection,
        null,
        command,
        command.instructions,
        TemplateCompilerLiveMultiBindingCompletion.Invalid,
        new TemplateCompilerLiveMultiBindingReason(
          TemplateCompilerLiveMultiBindingReasonKind.CommandInvalid,
          command.abruptFailure?.message
            ?? command.outcome.message
            ?? 'Inline multi-binding command expression was invalid.',
        ),
      );
    }
    if (command.outcome.state === BindingCommandLoweringState.Partial
      || parseCompletion === TemplateCompilerLiveMultiBindingCompletion.Open) {
      return new TemplateCompilerLiveMultiBindingSegmentResult(
        segment,
        syntax,
        selection,
        valueSelection,
        null,
        command,
        command.instructions,
        TemplateCompilerLiveMultiBindingCompletion.Open,
        new TemplateCompilerLiveMultiBindingReason(
          TemplateCompilerLiveMultiBindingReasonKind.ValueParseOpen,
          command.outcome.message ?? 'Inline multi-binding command expression remained open.',
        ),
      );
    }
    return new TemplateCompilerLiveMultiBindingSegmentResult(
      segment,
      syntax,
      selection,
      valueSelection,
      null,
      command,
      command.instructions,
      TemplateCompilerLiveMultiBindingCompletion.Complete,
      null,
    );
  }

  if (valueSelection?.entryFamily == null) {
    return segmentResult(
      segment,
      syntax,
      selection,
      TemplateCompilerLiveMultiBindingCompletion.Open,
      TemplateCompilerLiveMultiBindingReasonKind.ValueParseOpen,
      'Inline multi-binding segment did not select its interpolation parser entry.',
      valueSelection,
    );
  }
  const expressionProductHandle = handles.expression(new TemplateCompilerLiveExpressionHandleRequest(
    valueSelection.entryFamily,
    valueSelection.rawValue,
    0,
  ));
  const read = request.compilerReads.readParsedExpression(
    valueSelection.rawValue,
    valueSelection.entryFamily,
    { baseSpan: sourceSpanFromBounds(segment.valueStart, segment.valueEnd) },
  );
  const valueParse = new TemplateCompilerLiveMultiBindingValueParse(
    expressionProductHandle,
    valueSelection,
    read,
  );
  const completion = completionForParses([read.value]);
  if (completion !== TemplateCompilerLiveMultiBindingCompletion.Complete) {
    return new TemplateCompilerLiveMultiBindingSegmentResult(
      segment,
      syntax,
      selection,
      valueSelection,
      valueParse,
      null,
      [],
      completion,
      new TemplateCompilerLiveMultiBindingReason(
        completion === TemplateCompilerLiveMultiBindingCompletion.Invalid
          ? TemplateCompilerLiveMultiBindingReasonKind.ValueParseInvalid
          : TemplateCompilerLiveMultiBindingReasonKind.ValueParseOpen,
        completion === TemplateCompilerLiveMultiBindingCompletion.Invalid
          ? 'Inline multi-binding interpolation was invalid.'
          : 'Inline multi-binding interpolation remained open.',
      ),
    );
  }

  const instructionKind = read.value.kind === ExpressionParseResultKind.InterpolationAbsent
    ? TemplateInstructionKind.SetProperty
    : TemplateInstructionKind.Interpolation;
  const allocation = handles.instruction(new TemplateCompilerLiveInstructionHandleRequest(
    instructionKind,
    syntax.target,
    0,
  ));
  const instruction = read.value.kind === ExpressionParseResultKind.InterpolationAbsent
    ? new SetPropertyInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.attribute,
      bindable.definition.name,
      syntax.rawValue,
      null,
    )
    : new InterpolationInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.attribute,
      bindable.definition.name,
      [expressionProductHandle],
      null,
    );
  return new TemplateCompilerLiveMultiBindingSegmentResult(
    segment,
    syntax,
    selection,
    valueSelection,
    valueParse,
    null,
    [instruction],
    TemplateCompilerLiveMultiBindingCompletion.Complete,
    null,
  );
}

function segmentResult(
  segment: ParsedMultiBindingSegment,
  syntax: TemplateCompilerLiveMultiBindingSyntax,
  selection: TemplateCompilerLiveMultiBindingSelection,
  completion: TemplateCompilerLiveMultiBindingCompletion,
  reasonKind: TemplateCompilerLiveMultiBindingReasonKind,
  summary: string,
  valueSelection: TemplateAttributeValueSiteSelection | null = null,
  compilerIssue: AttributeClassificationDecisionIssue | null = null,
): TemplateCompilerLiveMultiBindingSegmentResult {
  return new TemplateCompilerLiveMultiBindingSegmentResult(
    segment,
    syntax,
    selection,
    valueSelection,
    null,
    null,
    [],
    completion,
    new TemplateCompilerLiveMultiBindingReason(reasonKind, summary, compilerIssue),
  );
}

function completionForParses(
  results: readonly ExpressionParseResult[],
): TemplateCompilerLiveMultiBindingCompletion {
  const states = results.map(expressionParseStateForResult);
  if (states.includes(TemplateExpressionParseState.Error)) {
    return TemplateCompilerLiveMultiBindingCompletion.Invalid;
  }
  if (states.includes(TemplateExpressionParseState.Companion)) {
    return TemplateCompilerLiveMultiBindingCompletion.Open;
  }
  return TemplateCompilerLiveMultiBindingCompletion.Complete;
}

function remainderAfter(
  rawValue: string,
  segment: ParsedMultiBindingSegment,
): TemplateCompilerLiveMultiBindingRemainder | null {
  return segment.end >= rawValue.length
    ? null
    : new TemplateCompilerLiveMultiBindingRemainder(
      segment.end,
      rawValue.length,
      rawValue.slice(segment.end),
    );
}

function retainRead(
  reads: TemplateCompilerReadObservation[],
  read: TemplateCompilerReadObservation | null,
): void {
  if (read != null && !reads.includes(read)) reads.push(read);
}
