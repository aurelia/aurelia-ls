import { ExpressionParseResultKind, type ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { AddressHandle } from '../kernel/handles.js';
import { AttributeSyntaxKind } from './attribute-syntax.js';
import { TemplateCompilerScopeClosureState, type TemplateCompilerReadObservation, type TemplateCompilerReadView } from './compiler-read-view.js';
import type { HtmlAttributeReference, HtmlElement } from './html-ir.js';
import {
  HydrateLetElementInstruction,
  LetBindingInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';
import {
  decideTemplateCompilerLetAttribute,
  TemplateCompilerLetAttributeKind,
  type TemplateCompilerLetAttributeDecision,
} from './let-element-compiler-semantics.js';
import type { TemplateCompilerLiveAllocationLedger } from './template-compiler-live-allocation.js';
import type { TemplateCompilerAttributeOccurrence, TemplateCompilerElementOccurrence } from './template-compiler-occurrence.js';
import type { TemplateCompilerReachedAttributeScalarReceipt } from './template-compiler-execution.js';
import type { TemplateCompilerNormalizedSite } from './template-compiler-normalized-site-index.js';

const letElementStagingAuthority = {};

export class TemplateCompilerLetReachedAttribute {
  constructor(
    readonly occurrence: TemplateCompilerAttributeOccurrence,
    readonly bundle: TemplateCompilerNormalizedSite | null,
    readonly scalar: TemplateCompilerReachedAttributeScalarReceipt,
    readonly attributeReference: HtmlAttributeReference,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly targetSourceAddressHandle: AddressHandle | null,
  ) {
    if (
      occurrence.owner !== scalar.owner
      || scalar.attribute !== occurrence
      || (bundle == null) !== (attributeReference.productHandle == null)
      || (bundle != null && (
        attributeReference.productHandle !== bundle.attribute.productHandle
        || sourceAddressHandle !== (bundle.attribute.valueAddressHandle ?? bundle.attribute.sourceAddressHandle)
        || targetSourceAddressHandle !== bundle.syntax.targetSourceAddressHandle
      ))
    ) {
      throw new Error('Reached let attribute lost occurrence, scalar, reference, or source authority.');
    }
  }
}

export const enum TemplateCompilerLetElementStagingState {
  Exact = 'exact',
  Open = 'open',
  Invalid = 'invalid',
}

export const enum TemplateCompilerLetElementStagingReasonKind {
  ReachedAttributeUnavailable = 'reached-attribute-unavailable',
  AttributeParserOpen = 'attribute-parser-open',
  BindingCommandResolutionOpen = 'binding-command-resolution-open',
  InvalidCommand = 'invalid-command',
  UnknownBindingCommand = 'unknown-binding-command',
  ExpressionParseOpen = 'expression-parse-open',
  ExpressionParseInvalid = 'expression-parse-invalid',
  ExpressionResultMismatch = 'expression-result-mismatch',
}

export class TemplateCompilerLetElementStagingReason {
  constructor(
    readonly reasonKind: TemplateCompilerLetElementStagingReasonKind,
    readonly attribute: TemplateCompilerAttributeOccurrence | null,
    readonly summary: string,
  ) {}
}

export class TemplateCompilerLetBindingStaging {
  constructor(
    readonly reached: TemplateCompilerLetReachedAttribute,
    readonly decision: TemplateCompilerLetAttributeDecision,
    readonly commandRead: TemplateCompilerReadObservation | null,
    readonly expressionRead: TemplateCompilerReadObservation,
    readonly expressionResult: ExpressionParseResult,
    readonly instruction: LetBindingInstruction,
  ) {
    const literalFallback = expressionResult.kind === ExpressionParseResultKind.InterpolationAbsent;
    if (
      decision.target !== instruction.target
      || (commandRead != null) !== (decision.command != null)
      || literalFallback !== (instruction.expressionProductHandle == null)
      || literalFallback !== (instruction.literalValue != null)
    ) {
      throw new Error('Let binding staging lost target, command, expression, or literal-fallback authority.');
    }
  }
}

export class TemplateCompilerLetElementStaging {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly element: TemplateCompilerElementOccurrence,
    readonly authoredElement: HtmlElement,
    readonly reachedAttributes: readonly TemplateCompilerLetReachedAttribute[],
    readonly bindings: readonly TemplateCompilerLetBindingStaging[],
    readonly instruction: HydrateLetElementInstruction,
    readonly toBindingContext: boolean,
  ) {
    if (
      authority !== letElementStagingAuthority
      || instruction.toBindingContext !== toBindingContext
      || instruction.instructionProductHandles.length !== bindings.length
      || instruction.instructionProductHandles.some((handle, index) => handle !== bindings[index]?.instruction.productHandle)
      || new Set(reachedAttributes.map((reached) => reached.occurrence)).size !== reachedAttributes.length
    ) {
      throw new Error('Let element staging lost attribute, binding, flag, or nested instruction coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === letElementStagingAuthority;
  }
}

export class TemplateCompilerLetElementStagingResult {
  constructor(
    readonly state: TemplateCompilerLetElementStagingState,
    readonly staging: TemplateCompilerLetElementStaging | null,
    readonly reasons: readonly TemplateCompilerLetElementStagingReason[],
  ) {
    const exact = state === TemplateCompilerLetElementStagingState.Exact;
    const unavailable = !exact;
    if (
      exact !== (staging != null && staging.isModuleConstructed() && reasons.length === 0)
      || unavailable !== (staging == null && reasons.length > 0)
    ) {
      throw new Error('Let element staging result lost exact, open, or invalid ownership.');
    }
  }
}

export interface TemplateCompilerLetElementStagingRequest {
  readonly siteKey: string;
  readonly element: TemplateCompilerElementOccurrence;
  readonly authoredElement: HtmlElement;
  readonly attributeCount: number;
  readonly reachAttribute: (ordinal: number) => TemplateCompilerLetReachedAttribute | null;
  readonly compilerReads: TemplateCompilerReadView;
  readonly allocations: TemplateCompilerLiveAllocationLedger;
}

/** Parse and allocate one exact reached `<let>` row after cursor accounting owns the live attribute sequence. */
export function stageTemplateCompilerLetElement(
  request: TemplateCompilerLetElementStagingRequest,
): TemplateCompilerLetElementStagingResult {
  const plans: LetBindingPlan[] = [];
  const reachedAttributes: TemplateCompilerLetReachedAttribute[] = [];
  let toBindingContext = false;
  let expressionOrdinal = 0;
  for (let ordinal = 0; ordinal < request.attributeCount; ordinal++) {
    const reached = request.reachAttribute(ordinal);
    if (reached == null) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Open,
        TemplateCompilerLetElementStagingReasonKind.ReachedAttributeUnavailable,
        null,
        `Reached let attribute ${ordinal} was unavailable from the live accounting lane.`,
      );
    }
    reachedAttributes.push(reached);
    if (!reached.scalar.isExact()) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Open,
        TemplateCompilerLetElementStagingReasonKind.AttributeParserOpen,
        reached.occurrence,
        'Reached let attribute scalar authority is Open.',
      );
    }
    if (reached.scalar.qualifiedName === 'to-binding-context') {
      toBindingContext = true;
      continue;
    }
    const parsed = request.compilerReads.readParsedAttribute(
      reached.scalar.qualifiedName,
      reached.scalar.currentValue,
    );
    if (
      !parsed.observation.validate().isCurrent
      || parsed.observation.closure.state !== TemplateCompilerScopeClosureState.Closed
      || parsed.value.execution.syntaxKind === AttributeSyntaxKind.Open
    ) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Open,
        TemplateCompilerLetElementStagingReasonKind.AttributeParserOpen,
        reached.occurrence,
        'Reached let attribute parser or scalar authority is Open.',
      );
    }
    const syntax = parsed.value.execution;
    const commandRead = syntax.command == null
      ? null
      : request.compilerReads.readBindingCommand(syntax.command);
    if (commandRead != null && (
      !commandRead.observation.validate().isCurrent
      || commandRead.observation.closure.state !== TemplateCompilerScopeClosureState.Closed
    )) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Open,
        TemplateCompilerLetElementStagingReasonKind.BindingCommandResolutionOpen,
        reached.occurrence,
        `Let binding-command resolution for '.${syntax.command ?? ''}' is Open.`,
      );
    }
    if (syntax.command != null && commandRead?.value == null) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Invalid,
        TemplateCompilerLetElementStagingReasonKind.UnknownBindingCommand,
        reached.occurrence,
        `Binding command '.${syntax.command}' is absent from the current compiler world.`,
      );
    }
    const decision = decideTemplateCompilerLetAttribute(
      reached.scalar.qualifiedName,
      reached.scalar.currentValue,
      syntax.target,
      syntax.command,
    );
    if (decision.decisionKind === TemplateCompilerLetAttributeKind.InvalidCommand) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Invalid,
        TemplateCompilerLetElementStagingReasonKind.InvalidCommand,
        reached.occurrence,
        `Invalid command '.${decision.command ?? ''}' for <let>; use .bind or no command.`,
      );
    }
    const target = decision.target;
    if (target == null) throw new Error('Binding-producing let decision lost its normalized target.');
    const entryFamily = decision.decisionKind === TemplateCompilerLetAttributeKind.PropertyBinding
      ? 'IsProperty' as const
      : 'Interpolation' as const;
    const expression = request.compilerReads.readParsedExpression(decision.rawValue, entryFamily);
    const exactResult = entryFamily === 'Interpolation'
      ? expression.value.kind === ExpressionParseResultKind.InterpolationSuccess
        || expression.value.kind === ExpressionParseResultKind.InterpolationAbsent
      : expression.value.kind === ExpressionParseResultKind.ExpressionSuccess
        || expression.value.kind === ExpressionParseResultKind.EmptyExpressionSuccess;
    if (!expression.observation.validate().isCurrent
      || expression.observation.closure.state !== TemplateCompilerScopeClosureState.Closed) {
      return stagingFailure(
        TemplateCompilerLetElementStagingState.Open,
        TemplateCompilerLetElementStagingReasonKind.ExpressionParseOpen,
        reached.occurrence,
        `Let expression parser authority for '${target}' is Open.`,
      );
    }
    if (!exactResult) {
      const invalid = expression.value.kind === ExpressionParseResultKind.CompleteInputParseError;
      return stagingFailure(
        invalid
          ? TemplateCompilerLetElementStagingState.Invalid
          : TemplateCompilerLetElementStagingState.Open,
        invalid
          ? TemplateCompilerLetElementStagingReasonKind.ExpressionParseInvalid
          : TemplateCompilerLetElementStagingReasonKind.ExpressionResultMismatch,
        reached.occurrence,
        `Let expression '${decision.rawValue}' did not produce exact ${entryFamily} output.`,
      );
    }
    plans.push(new LetBindingPlan(
      reached,
      decision,
      commandRead?.observation ?? null,
      entryFamily,
      expression,
      expressionOrdinal++,
    ));
  }
  const bindings = plans.map((plan, index) => materializeLetBinding(request, plan, index));
  const outerLocal = `${request.siteKey}:hydrate-let`;
  const outerAllocation = request.allocations.allocateInstruction(
    request.siteKey,
    'hydrate-let',
    TemplateInstructionKind.HydrateLetElement,
    request.authoredElement.sourceAddressHandle,
    outerLocal,
  );
  const instruction = new HydrateLetElementInstruction(
    outerAllocation.productHandle,
    outerAllocation.identityHandle,
    request.authoredElement.toReference(),
    bindings.map((binding) => binding.instruction.productHandle),
    toBindingContext,
    request.authoredElement.sourceAddressHandle,
    [],
  );
  request.allocations.bindInstruction(instruction);
  return new TemplateCompilerLetElementStagingResult(
    TemplateCompilerLetElementStagingState.Exact,
    new TemplateCompilerLetElementStaging(
      letElementStagingAuthority,
      request.element,
      request.authoredElement,
      reachedAttributes,
      bindings,
      instruction,
      toBindingContext,
    ),
    [],
  );
}

class LetBindingPlan {
  constructor(
    readonly reached: TemplateCompilerLetReachedAttribute,
    readonly decision: TemplateCompilerLetAttributeDecision,
    readonly commandRead: TemplateCompilerReadObservation | null,
    readonly entryFamily: 'IsProperty' | 'Interpolation',
    readonly expression: ReturnType<TemplateCompilerReadView['readParsedExpression']>,
    readonly expressionOrdinal: number,
  ) {}
}

function materializeLetBinding(
  request: TemplateCompilerLetElementStagingRequest,
  plan: LetBindingPlan,
  index: number,
): TemplateCompilerLetBindingStaging {
  const interpolationAbsent = plan.expression.value.kind === ExpressionParseResultKind.InterpolationAbsent;
  const expressionHandle = interpolationAbsent
    ? null
    : request.allocations.allocateExpression(
        request.siteKey,
        `${request.siteKey}:binding:${index}:expression`,
        plan.entryFamily,
        plan.decision.rawValue,
        plan.expressionOrdinal,
      ).productHandle;
  if (expressionHandle != null) {
    request.allocations.bindExpression(expressionHandle, plan.expression.observation, plan.expression.value, null);
  }
  const sourceAddressHandle = plan.reached.sourceAddressHandle;
  const instructionLocal = `${request.siteKey}:binding:${index}:let-binding`;
  const allocation = request.allocations.allocateInstruction(
    request.siteKey,
    `let-binding:${index}`,
    TemplateInstructionKind.LetBinding,
    sourceAddressHandle,
    instructionLocal,
  );
  const instruction = new LetBindingInstruction(
    allocation.productHandle,
    allocation.identityHandle,
    request.authoredElement.toReference(),
    plan.reached.attributeReference,
    plan.decision.target!,
    expressionHandle,
    interpolationAbsent ? plan.decision.rawValue : null,
    sourceAddressHandle,
    plan.reached.targetSourceAddressHandle,
    [],
  );
  request.allocations.bindInstruction(instruction);
  return new TemplateCompilerLetBindingStaging(
    plan.reached,
    plan.decision,
    plan.commandRead,
    plan.expression.observation,
    plan.expression.value,
    instruction,
  );
}

function stagingFailure(
  state: TemplateCompilerLetElementStagingState.Open | TemplateCompilerLetElementStagingState.Invalid,
  reasonKind: TemplateCompilerLetElementStagingReasonKind,
  attribute: TemplateCompilerAttributeOccurrence | null,
  summary: string,
): TemplateCompilerLetElementStagingResult {
  return new TemplateCompilerLetElementStagingResult(
    state,
    null,
    [new TemplateCompilerLetElementStagingReason(reasonKind, attribute, summary)],
  );
}
