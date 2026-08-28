import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  TemplateAttributeEmptyValueBindingPolicy,
} from './attribute-value-site-selection.js';
import { BindingCommandInstructionAllocation } from './binding-command-execution.js';
import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import type {
  HtmlAttributeOwnerLike,
  HtmlAttributeReference,
  HtmlNodeReference,
} from './html-ir.js';
import {
  type AuSlotProcessContentInstructionData,
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  type HydrateElementProjectionContributor,
  type HydrateElementProjectionDefinition,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  SetAttributeInstruction,
  SetClassAttributeInstruction,
  SetPropertyInstruction,
  SetStyleAttributeInstruction,
  SpreadTransferedBindingInstruction,
  SpreadValueBindingInstruction,
  type TemplateInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';
import {
  orderCompilerInstructionsForElement,
  type TemplateCompilerInstructionOrderElement,
} from './compiler-instruction-order.js';
import type { CompiledTemplateReference } from './compiled-template.js';

export const enum TemplateCompilerValueInstructionLane {
  ElementBindable = 'element-bindable',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  Plain = 'plain',
}

export const enum TemplateCompilerStaticAttributePolicy {
  Preserve = 'preserve',
  Transfer = 'transfer',
}

/** Allocation request whose semantic site is independent from live execution order. */
export class TemplateCompilerInstructionStagingAllocationRequest {
  constructor(
    readonly siteKey: string,
    readonly local: string,
    readonly kind: TemplateInstructionKind,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class TemplateCompilerInstructionStagingAllocation extends BindingCommandInstructionAllocation {
  constructor(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    readonly instructionLocal: string,
  ) {
    super(productHandle, identityHandle);
  }
}

/** Caller-owned allocation/publication boundary for product-free instruction construction. */
export interface TemplateCompilerInstructionStagingAuthority {
  create<TInstruction extends TemplateInstruction>(
    request: TemplateCompilerInstructionStagingAllocationRequest,
    factory: (allocation: TemplateCompilerInstructionStagingAllocation) => TInstruction,
  ): TInstruction;
}

export class TemplateCompilerHydrateElementInstructionStagingRequest {
  constructor(
    readonly authority: TemplateCompilerInstructionStagingAuthority,
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly elementName: string,
    readonly resourceLookupName: string,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly projectionDefinitions: (
      instructionLocal: string,
    ) => readonly HydrateElementProjectionDefinition[],
    readonly discardedProjectionContributors: readonly HydrateElementProjectionContributor[],
    readonly auSlotProcessContent: AuSlotProcessContentInstructionData | null,
    readonly auSlotProcessContentRemovedChildNodes: readonly HtmlNodeReference[],
    readonly bindableInstructions: readonly TemplateInstruction[],
    readonly captureSyntaxProductHandles: readonly ProductHandle[],
    /** Runtime wire flag is usage-site syntax, independent from effective render-location placement. */
    readonly usageContainerless: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Shared RC2 HydrateElement construction law; callers own allocation and child-definition reservation. */
export function stageTemplateCompilerHydrateElementInstruction(
  request: TemplateCompilerHydrateElementInstructionStagingRequest,
): HydrateElementInstruction {
  return createInstruction(
    request,
    TemplateInstructionKind.HydrateElement,
    'hydrate-element',
    (allocation) => new HydrateElementInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.elementName,
      request.resourceLookupName,
      request.resource,
      request.projectionDefinitions(allocation.instructionLocal),
      request.discardedProjectionContributors,
      request.auSlotProcessContent,
      request.auSlotProcessContentRemovedChildNodes,
      request.bindableInstructions.map((instruction) => instruction.productHandle),
      request.captureSyntaxProductHandles,
      request.usageContainerless,
      request.sourceAddressHandle,
    ),
  );
}

export interface TemplateCompilerInstructionStagingSyntax {
  readonly runtimeRawName: string;
  readonly rawValue: string;
  readonly target: string;
  readonly targetSourceAddressHandle: AddressHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

export class TemplateCompilerValueInstructionStagingRequest {
  constructor(
    readonly authority: TemplateCompilerInstructionStagingAuthority,
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly syntax: TemplateCompilerInstructionStagingSyntax,
    readonly lane: TemplateCompilerValueInstructionLane,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly expressionResult: ExpressionParseResult | null,
    readonly emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy | null,
    readonly staticAttributePolicy: TemplateCompilerStaticAttributePolicy,
    readonly staticAttributeName: string,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Shared RC2 value-instruction selection and construction law. */
export function stageTemplateCompilerValueInstruction(
  request: TemplateCompilerValueInstructionStagingRequest,
): TemplateInstruction | null {
  const absent = request.expressionResult == null
    || request.expressionResult.kind === ExpressionParseResultKind.InterpolationAbsent;
  if (
    request.syntax.rawValue === ''
    && request.emptyValueBindingPolicy === TemplateAttributeEmptyValueBindingPolicy.NoBinding
  ) {
    return null;
  }
  if (request.lane === TemplateCompilerValueInstructionLane.Plain && absent) {
    if (request.staticAttributePolicy === TemplateCompilerStaticAttributePolicy.Preserve) {
      return null;
    }
    switch (request.syntax.runtimeRawName) {
      case 'class':
        return createInstruction(request, TemplateInstructionKind.SetClassAttribute, 'set-class-attribute', (allocation) =>
          new SetClassAttributeInstruction(
            allocation.productHandle,
            allocation.identityHandle,
            request.node,
            request.attribute,
            request.syntax.rawValue,
            request.sourceAddressHandle,
          ));
      case 'style':
        return createInstruction(request, TemplateInstructionKind.SetStyleAttribute, 'set-style-attribute', (allocation) =>
          new SetStyleAttributeInstruction(
            allocation.productHandle,
            allocation.identityHandle,
            request.node,
            request.attribute,
            request.syntax.rawValue,
            request.sourceAddressHandle,
          ));
      default:
        return createInstruction(request, TemplateInstructionKind.SetAttribute, 'set-attribute', (allocation) =>
          new SetAttributeInstruction(
            allocation.productHandle,
            allocation.identityHandle,
            request.node,
            request.attribute,
            request.staticAttributeName,
            request.syntax.rawValue,
            request.sourceAddressHandle,
          ));
    }
  }
  if (absent) {
    return createInstruction(request, TemplateInstructionKind.SetProperty, 'set-property', (allocation) =>
      new SetPropertyInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        request.node,
        request.attribute,
        request.target,
        request.syntax.rawValue,
        request.sourceAddressHandle,
      ));
  }
  if (request.expressionResult?.kind !== ExpressionParseResultKind.InterpolationSuccess) {
    return null;
  }
  return createInstruction(request, TemplateInstructionKind.Interpolation, 'interpolation', (allocation) =>
    new InterpolationInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.attribute,
      request.target,
      request.expressionProductHandle == null ? [] : [request.expressionProductHandle],
      request.sourceAddressHandle,
    ));
}

export class TemplateCompilerSpreadInstructionStagingRequest {
  constructor(
    readonly authority: TemplateCompilerInstructionStagingAuthority,
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly syntax: TemplateCompilerInstructionStagingSyntax,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Shared spread instruction selection and construction law. */
export function stageTemplateCompilerSpreadInstruction(
  request: TemplateCompilerSpreadInstructionStagingRequest,
): TemplateInstruction | null {
  if (request.syntax.target === '...$attrs') {
    return createInstruction(request, TemplateInstructionKind.SpreadTransferedBinding, 'spread-transfered-binding', (allocation) =>
      new SpreadTransferedBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        request.node,
        request.attribute,
        request.sourceAddressHandle,
      ));
  }
  if (!request.syntax.target.startsWith('...')) {
    return null;
  }
  return createInstruction(request, TemplateInstructionKind.SpreadValueBinding, 'spread-value-binding', (allocation) =>
    new SpreadValueBindingInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.attribute,
      '$bindables',
      request.syntax.target === '...$bindables'
        ? request.syntax.rawValue
        : request.syntax.target.slice(3),
      request.expressionProductHandle,
      request.syntax.targetSourceAddressHandle,
      request.sourceAddressHandle,
    ));
}

export class TemplateCompilerHydrateAttributeStagingRequest {
  constructor(
    readonly authority: TemplateCompilerInstructionStagingAuthority,
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly resourceLookupName: string,
    readonly resourceName: string,
    readonly resourceAlias: string | null,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly props: readonly TemplateInstruction[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export function stageTemplateCompilerHydrateAttributeInstruction(
  request: TemplateCompilerHydrateAttributeStagingRequest,
): HydrateAttributeInstruction {
  return createInstruction(request, TemplateInstructionKind.HydrateAttribute, 'hydrate-attribute', (allocation) =>
    new HydrateAttributeInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      request.node,
      request.attribute,
      request.resourceLookupName,
      request.resourceName,
      request.resourceAlias,
      request.resource,
      request.props.map((instruction) => instruction.productHandle),
      request.sourceAddressHandle,
    ));
}

/** Product-free TC wrapper awaiting structural child-definition reservation. */
export class TemplateCompilerHydrateTemplateControllerDraft {
  constructor(
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly controllerName: string,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly props: readonly TemplateInstruction[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export function stageTemplateCompilerHydrateTemplateControllerInstruction(
  draft: TemplateCompilerHydrateTemplateControllerDraft,
  authority: TemplateCompilerInstructionStagingAuthority,
  childCompiledTemplate: (instructionLocal: string) => CompiledTemplateReference,
): HydrateTemplateControllerInstruction {
  return authority.create(
    new TemplateCompilerInstructionStagingAllocationRequest(
      draft.siteKey,
      `hydrate-template-controller:${draft.localKey}`,
      TemplateInstructionKind.HydrateTemplateController,
      draft.sourceAddressHandle,
    ),
    (allocation) => new HydrateTemplateControllerInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      draft.node,
      draft.attribute,
      draft.controllerName,
      draft.resource,
      childCompiledTemplate(allocation.instructionLocal),
      draft.props.map((instruction) => instruction.productHandle),
      draft.sourceAddressHandle,
    ),
  );
}

export const enum TemplateCompilerElementInstructionStagingState {
  Complete = 'complete',
  Invalid = 'invalid',
  Open = 'open',
}

/** Owner-scoped instruction substrate retained for the later target-plan join. */
export class TemplateCompilerElementInstructionStagingResult<TCapture = unknown> {
  readonly directRowTail: readonly TemplateInstruction[];
  readonly instructions: readonly TemplateInstruction[];

  constructor(
    readonly state: TemplateCompilerElementInstructionStagingState,
    readonly finalOwnerView: HtmlAttributeOwnerLike,
    readonly hydrateAttributes: readonly HydrateAttributeInstruction[],
    readonly attributeBindingInstructions: readonly TemplateInstruction[],
    readonly plainInstructions: readonly TemplateInstruction[],
    readonly orderedPlainInstructions: readonly TemplateInstruction[],
    readonly templateControllers: readonly TemplateCompilerHydrateTemplateControllerDraft[],
    readonly elementBindableInstructions: readonly TemplateInstruction[],
    readonly captures: readonly TCapture[],
    readonly structuralEffects: readonly string[],
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
  ) {
    this.directRowTail = [...hydrateAttributes, ...orderedPlainInstructions];
    this.instructions = uniqueInstructions([
      ...hydrateAttributes,
      ...attributeBindingInstructions,
      ...plainInstructions,
      ...templateControllers.flatMap((draft) => draft.props),
      ...elementBindableInstructions,
    ]);
  }
}

/** Shared bucket and native-order merge law used by authored and live adapters. */
export class TemplateCompilerElementInstructionBuckets<TCapture = unknown> {
  readonly hydrateAttributes: HydrateAttributeInstruction[] = [];
  readonly attributeBindingInstructions: TemplateInstruction[] = [];
  readonly plainInstructions: TemplateInstruction[] = [];
  readonly templateControllers: TemplateCompilerHydrateTemplateControllerDraft[] = [];
  readonly elementBindableInstructions: TemplateInstruction[] = [];
  readonly captures: TCapture[] = [];

  constructor(readonly structuralEffects: readonly string[] = []) {}

  finish(
    state: TemplateCompilerElementInstructionStagingState,
    element: TemplateCompilerInstructionOrderElement,
    finalOwnerView: HtmlAttributeOwnerLike,
    compilerReads: readonly TemplateCompilerReadObservation[] = [],
  ): TemplateCompilerElementInstructionStagingResult<TCapture> {
    const orderedPlainInstructions = state === TemplateCompilerElementInstructionStagingState.Complete
      ? orderCompilerInstructionsForElement(element, finalOwnerView, this.plainInstructions)
      : [];
    return new TemplateCompilerElementInstructionStagingResult(
      state,
      finalOwnerView,
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.hydrateAttributes : [],
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.attributeBindingInstructions : [],
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.plainInstructions : [],
      orderedPlainInstructions,
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.templateControllers : [],
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.elementBindableInstructions : [],
      state === TemplateCompilerElementInstructionStagingState.Complete ? this.captures : [],
      this.structuralEffects,
      compilerReads,
    );
  }
}

function createInstruction<TInstruction extends TemplateInstruction>(
  request: {
    readonly authority: TemplateCompilerInstructionStagingAuthority;
    readonly siteKey: string;
    readonly localKey: string;
    readonly sourceAddressHandle: AddressHandle | null;
  },
  kind: TemplateInstructionKind,
  role: string,
  factory: (allocation: TemplateCompilerInstructionStagingAllocation) => TInstruction,
): TInstruction {
  return request.authority.create(
    new TemplateCompilerInstructionStagingAllocationRequest(
      request.siteKey,
      `${role}:${request.localKey}`,
      kind,
      request.sourceAddressHandle,
    ),
    factory,
  );
}

function uniqueInstructions(instructions: readonly TemplateInstruction[]): readonly TemplateInstruction[] {
  const seen = new Set<ProductHandle>();
  return instructions.filter((instruction) => {
    if (seen.has(instruction.productHandle)) return false;
    seen.add(instruction.productHandle);
    return true;
  });
}
