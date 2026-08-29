import type { ProductHandle } from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { KernelReadProjectionRevisionView } from '../kernel/store.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  projectRuntimeExpressionAstValue,
  RuntimeExpressionAstProjectionState,
  type RuntimeExpressionAstValue,
} from '../expression/runtime-ast-value.js';
import {
  runtimeAcceptedBindingExpressionAstForParseChain,
  runtimeAcceptedBindingExpressionAstForResult,
  runtimeAcceptedBindingExpressionAstForResultChain,
} from './expression-parse-projection.js';
import { readTemplateExpressionParse } from './expression-parse-product.js';
import { TemplateProductDetails } from './product-details.js';
import type {
  TemplateCompilerContextFamilyValue,
  TemplateCompilerContextFamilyValueContext,
} from './template-compiler-context-family-value.js';
import {
  nestedInstructionProductHandlesForInstruction,
  TemplateBindingMode,
  TemplateInstructionKind,
  TemplateListenerStrategy,
  type TemplateInstruction,
} from './instruction-ir.js';

const runtimeInstructionFamilyAuthority = {};

export const enum TemplateCompilerFrameworkInstructionType {
  HydrateElement = 0,
  HydrateAttribute = 1,
  HydrateTemplateController = 2,
  HydrateLetElement = 3,
  SetProperty = 10,
  Interpolation = 11,
  PropertyBinding = 12,
  LetBinding = 13,
  RefBinding = 14,
  IteratorBinding = 15,
  MultiAttr = 16,
  TextBinding = 30,
  ListenerBinding = 31,
  AttributeBinding = 32,
  StylePropertyBinding = 33,
  SetAttribute = 34,
  SetClassAttribute = 35,
  SetStyleAttribute = 36,
  SpreadTransferedBinding = 50,
  SpreadElementProp = 51,
  SpreadValueBinding = 52,
  TranslationBinding = 100,
  TranslationBindBinding = 101,
  TranslationParametersBinding = 102,
  StateBinding = 120,
  DispatchBinding = 121,
  VirtualizationIterateBinding = 200,
}

export const enum TemplateCompilerFrameworkBindingMode {
  Default = 0,
  OneTime = 1,
  ToView = 2,
  FromView = 4,
  TwoWay = 6,
}

export const enum TemplateCompilerRuntimeResourceRepresentation {
  Name = 'name',
}

export class TemplateCompilerRuntimeResourceNameValue {
  readonly representationKind = TemplateCompilerRuntimeResourceRepresentation.Name;

  constructor(readonly name: string) {
    if (name.length === 0) throw new Error('Runtime instruction resource name cannot be empty.');
  }
}

export class TemplateCompilerRuntimeDefinitionReferenceValue {
  constructor(readonly definition: TemplateCompilerContextFamilyValueContext) {}
}

export class TemplateCompilerRuntimeProjectionValue {
  constructor(
    readonly slotName: string,
    readonly definition: TemplateCompilerRuntimeDefinitionReferenceValue,
  ) {}
}

/** Framework AttrSyntax wire fields retained without semantic product/source identity. */
export class TemplateCompilerRuntimeAttributeSyntaxValue {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly target: string,
    readonly command: string | null,
    readonly parts: readonly string[] | null,
  ) {}
}

export const enum TemplateCompilerRuntimeElementDataKind {
  None = 'none',
  AuSlot = 'au-slot',
}

export type TemplateCompilerRuntimeElementDataValue =
  | { readonly dataKind: TemplateCompilerRuntimeElementDataKind.None }
  | { readonly dataKind: TemplateCompilerRuntimeElementDataKind.AuSlot; readonly name: string };

export type TemplateCompilerRuntimeInstructionValue =
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.PropertyBinding;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
      readonly mode: TemplateCompilerFrameworkBindingMode;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.Interpolation;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.ListenerBinding;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
      readonly capture: boolean;
      readonly modifier: string | null;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.StylePropertyBinding;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.AttributeBinding;
      readonly attr: string;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.MultiAttr;
      readonly value: string | RuntimeExpressionAstValue;
      readonly to: string;
      readonly command: string | null;
    }
  | {
      readonly type:
        | TemplateCompilerFrameworkInstructionType.IteratorBinding
        | TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding;
      readonly forOf: RuntimeExpressionAstValue;
      readonly to: string;
      readonly props: readonly TemplateCompilerRuntimeInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.TextBinding;
      readonly from: RuntimeExpressionAstValue;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.LetBinding;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateLetElement;
      readonly instructions: readonly TemplateCompilerRuntimeInstructionValue[];
      readonly toBindingContext: boolean;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateTemplateController;
      readonly def: TemplateCompilerRuntimeDefinitionReferenceValue;
      readonly res: TemplateCompilerRuntimeResourceNameValue;
      readonly alias: undefined;
      readonly props: readonly TemplateCompilerRuntimeInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateAttribute;
      readonly res: TemplateCompilerRuntimeResourceNameValue;
      readonly alias: string | undefined;
      readonly props: readonly TemplateCompilerRuntimeInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateElement;
      readonly res: TemplateCompilerRuntimeResourceNameValue;
      readonly props: readonly TemplateCompilerRuntimeInstructionValue[];
      readonly projections: readonly TemplateCompilerRuntimeProjectionValue[] | null;
      readonly containerless: boolean;
      readonly captures: readonly TemplateCompilerRuntimeAttributeSyntaxValue[];
      readonly data: TemplateCompilerRuntimeElementDataValue;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SetAttribute;
      readonly value: string;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SetProperty;
      readonly value: string;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SetClassAttribute;
      readonly value: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SetStyleAttribute;
      readonly value: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.RefBinding;
      readonly from: RuntimeExpressionAstValue;
      readonly to: string;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SpreadTransferedBinding;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SpreadValueBinding;
      readonly target: '$bindables' | '$element';
      readonly from: string;
    };

export const enum TemplateCompilerRuntimeInstructionFamilyState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerRuntimeInstructionReasonKind {
  StaleFamily = 'stale-family',
  ConflictingExpressionAuthority = 'conflicting-expression-authority',
  MissingExpressionAuthority = 'missing-expression-authority',
  ForeignProductDetailAuthority = 'foreign-product-detail-authority',
  ProductDetailProjectionChanged = 'product-detail-projection-changed',
  ExpressionAstUnavailable = 'expression-ast-unavailable',
  ExpressionAstProjectionPending = 'expression-ast-projection-pending',
  InterpolationExpressionCardinality = 'interpolation-expression-cardinality',
  TextExpressionChainUnavailable = 'text-expression-chain-unavailable',
  BindingModeOpen = 'binding-mode-open',
  ListenerStrategyOpen = 'listener-strategy-open',
  MissingNestedInstruction = 'missing-nested-instruction',
  MissingChildDefinition = 'missing-child-definition',
  MissingResourceName = 'missing-resource-name',
  CaptureSyntaxUnavailable = 'capture-syntax-unavailable',
  UnsupportedHydrateElementData = 'unsupported-hydrate-element-data',
  LetBindingSourceIncoherent = 'let-binding-source-incoherent',
  UnsupportedInstructionKind = 'unsupported-instruction-kind',
}

export class TemplateCompilerRuntimeInstructionReason {
  constructor(
    readonly reasonKind: TemplateCompilerRuntimeInstructionReasonKind,
    readonly instructionKind: TemplateInstructionKind | null,
    readonly instructionProductHandle: ProductHandle | null,
    readonly summary: string,
    readonly pending: boolean,
  ) {}
}

export class TemplateCompilerRuntimeInstructionValueEntry {
  constructor(
    readonly instruction: TemplateInstruction,
    readonly value: TemplateCompilerRuntimeInstructionValue,
  ) {}
}

export class TemplateCompilerRuntimeInstructionContextValue {
  constructor(
    readonly context: TemplateCompilerContextFamilyValueContext,
    readonly rows: readonly (readonly TemplateCompilerRuntimeInstructionValue[])[],
    readonly surrogates: readonly TemplateCompilerRuntimeInstructionValue[],
  ) {
    if (
      rows.length !== context.rows.length
      || rows.some((row, ordinal) => row.length !== context.rows[ordinal]?.instructions.length)
      || surrogates.length !== (context.compiledTemplate.surrogateSequence?.instructions.length ?? 0)
    ) {
      throw new Error('Runtime instruction context value lost final row or surrogate coverage.');
    }
  }
}

export class TemplateCompilerRuntimeInstructionFamilyValue {
  readonly #authority: object;
  readonly #productDetails: ProductDetailReadView;
  readonly #valueByInstruction: ReadonlyMap<TemplateInstruction, TemplateCompilerRuntimeInstructionValue>;

  constructor(
    authority: object,
    readonly family: TemplateCompilerContextFamilyValue,
    productDetails: ProductDetailReadView,
    readonly resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
    readonly contexts: readonly TemplateCompilerRuntimeInstructionContextValue[],
    readonly instructions: readonly TemplateCompilerRuntimeInstructionValueEntry[],
  ) {
    this.#valueByInstruction = new Map(instructions.map((entry) => [entry.instruction, entry.value]));
    if (
      authority !== runtimeInstructionFamilyAuthority
      || !family.hasProductDetailAuthority(productDetails)
      || contexts.length !== family.contexts.length
      || contexts.some((context, ordinal) => context.context !== family.contexts[ordinal])
      || instructions.length !== family.instructions.length
      || instructions.some((entry, ordinal) => entry.instruction !== family.instructions[ordinal])
      || this.#valueByInstruction.size !== instructions.length
      || contexts.some((context) => context.rows.some((row, rowOrdinal) =>
        row.some((value, instructionOrdinal) => {
          const instruction = context.context.rows[rowOrdinal]?.instructions[instructionOrdinal] ?? null;
          return instruction == null || this.#valueByInstruction.get(instruction) !== value;
        })
      ))
      || contexts.some((context) => context.surrogates.some((value, instructionOrdinal) => {
        const instruction = context.context.surrogates[instructionOrdinal] ?? null;
        return instruction == null || this.#valueByInstruction.get(instruction) !== value;
      }))
    ) {
      throw new Error('Runtime instruction family value lost context or instruction coverage.');
    }
    this.#authority = authority;
    this.#productDetails = productDetails;
  }

  valueForInstruction(instruction: TemplateInstruction): TemplateCompilerRuntimeInstructionValue | null {
    return this.#valueByInstruction.get(instruction) ?? null;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.family.hasProductDetailAuthority(this.#productDetails)
      && this.family.isCurrent();
  }

  isModuleConstructed(): boolean {
    return this.#authority === runtimeInstructionFamilyAuthority;
  }
}

export class TemplateCompilerRuntimeInstructionFamilyResult {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly state: TemplateCompilerRuntimeInstructionFamilyState,
    readonly value: TemplateCompilerRuntimeInstructionFamilyValue | null,
    readonly reasons: readonly TemplateCompilerRuntimeInstructionReason[],
  ) {
    const unavailable = state === TemplateCompilerRuntimeInstructionFamilyState.Pending
      || state === TemplateCompilerRuntimeInstructionFamilyState.Ineligible;
    if (
      authority !== runtimeInstructionFamilyAuthority
      || (state === TemplateCompilerRuntimeInstructionFamilyState.Exact) !== (
        value != null && value.isModuleConstructed() && reasons.length === 0
      )
      || unavailable !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Runtime instruction family result lost exact, pending, or ineligible ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === runtimeInstructionFamilyAuthority;
  }
}

export interface TemplateCompilerRuntimeInstructionFamilyRequest {
  readonly family: TemplateCompilerContextFamilyValue;
  readonly productDetails: ProductDetailReadView & KernelReadProjectionRevisionView;
  readonly resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name;
}

/** Project one current final semantic family to the serializable Aurelia instruction-value corridor. */
export function projectTemplateCompilerRuntimeInstructionFamily(
  request: TemplateCompilerRuntimeInstructionFamilyRequest,
): TemplateCompilerRuntimeInstructionFamilyResult {
  if (!request.family.isCurrent()) {
    return unavailable(
      TemplateCompilerRuntimeInstructionFamilyState.Ineligible,
      request.family.instructions[0] ?? null,
      TemplateCompilerRuntimeInstructionReasonKind.StaleFamily,
      'Runtime instruction projection requires one current context-family value.',
    );
  }
  if (!request.family.hasProductDetailAuthority(request.productDetails)) {
    return unavailable(
      TemplateCompilerRuntimeInstructionFamilyState.Ineligible,
      request.family.instructions[0] ?? null,
      TemplateCompilerRuntimeInstructionReasonKind.ForeignProductDetailAuthority,
      'Runtime instruction projection requires the product-detail authority that constructed the context family.',
    );
  }
  const productDetailRevision = request.productDetails.readProjectionRevision();
  const projector = new RuntimeInstructionFamilyProjector(request);
  const entries = request.family.instructions.flatMap((instruction) => {
    const value = projector.project(instruction);
    return value == null ? [] : [new TemplateCompilerRuntimeInstructionValueEntry(instruction, value)];
  });
  const projectedContexts = request.family.contexts.map((context) => ({
    context,
    rows: context.rows.map((row) => row.instructions.flatMap((instruction) => {
      const value = projector.project(instruction);
      return value == null ? [] : [value];
    })),
    surrogates: context.surrogates.flatMap((instruction) => {
      const value = projector.project(instruction);
      return value == null ? [] : [value];
    }),
  }));
  if (!productDetailRevision.equals(request.productDetails.readProjectionRevision())) {
    return unavailable(
      TemplateCompilerRuntimeInstructionFamilyState.Ineligible,
      request.family.instructions[0] ?? null,
      TemplateCompilerRuntimeInstructionReasonKind.ProductDetailProjectionChanged,
      'Product-detail projection changed while runtime instruction values were being read.',
    );
  }
  if (projector.reasons.length > 0) {
    return new TemplateCompilerRuntimeInstructionFamilyResult(
      runtimeInstructionFamilyAuthority,
      projector.reasons.some((reason) => !reason.pending)
        ? TemplateCompilerRuntimeInstructionFamilyState.Ineligible
        : TemplateCompilerRuntimeInstructionFamilyState.Pending,
      null,
      projector.reasons,
    );
  }
  if (entries.length !== request.family.instructions.length) {
    throw new Error('Exact runtime instruction projection lost instruction inventory coverage.');
  }
  const contexts = projectedContexts.map((context) => new TemplateCompilerRuntimeInstructionContextValue(
    context.context,
    context.rows,
    context.surrogates,
  ));
  return new TemplateCompilerRuntimeInstructionFamilyResult(
    runtimeInstructionFamilyAuthority,
    TemplateCompilerRuntimeInstructionFamilyState.Exact,
    new TemplateCompilerRuntimeInstructionFamilyValue(
      runtimeInstructionFamilyAuthority,
      request.family,
      request.productDetails,
      request.resourceRepresentation,
      contexts,
      entries,
    ),
    [],
  );
}

class RuntimeInstructionFamilyProjector {
  readonly reasons: TemplateCompilerRuntimeInstructionReason[] = [];
  private readonly instructionByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>;
  private readonly contextByCompiledTemplate: ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyValueContext>;
  private readonly projected = new Map<TemplateInstruction, TemplateCompilerRuntimeInstructionValue>();
  private readonly active = new Set<TemplateInstruction>();
  private readonly failed = new Set<TemplateInstruction>();

  constructor(private readonly request: TemplateCompilerRuntimeInstructionFamilyRequest) {
    this.instructionByProduct = new Map(request.family.instructions.map((instruction) => [
      instruction.productHandle,
      instruction,
    ]));
    this.contextByCompiledTemplate = new Map(request.family.contexts.map((context) => [
      context.compiledTemplate.productHandle,
      context,
    ]));
    if (this.instructionByProduct.size !== request.family.instructions.length) {
      throw new Error('Runtime instruction projection requires unique semantic instruction products.');
    }
  }

  project(instruction: TemplateInstruction): TemplateCompilerRuntimeInstructionValue | null {
    const existing = this.projected.get(instruction) ?? null;
    if (existing != null) return existing;
    if (this.failed.has(instruction)) return null;
    if (this.active.has(instruction)) {
      throw new Error(`Runtime instruction '${instruction.productHandle}' has cyclic nested instruction ownership.`);
    }
    this.active.add(instruction);
    const value = this.projectFresh(instruction);
    this.active.delete(instruction);
    if (value != null) this.projected.set(instruction, value);
    else this.failed.add(instruction);
    return value;
  }

  private projectFresh(instruction: TemplateInstruction): TemplateCompilerRuntimeInstructionValue | null {
    switch (instruction.instructionKind) {
      case TemplateInstructionKind.PropertyBinding: {
        const from = this.expression(instruction, instruction.expressionProductHandle, null);
        const mode = frameworkBindingModeFor(instruction.bindingMode);
        if (mode == null) {
          this.pending(instruction, TemplateCompilerRuntimeInstructionReasonKind.BindingModeOpen, 'Binding mode is Open.');
        }
        return from == null || mode == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.PropertyBinding,
          from,
          to: instruction.targetProperty,
          mode,
        };
      }
      case TemplateInstructionKind.Interpolation: {
        if (instruction.expressionProductHandles.length !== 1 || instruction.target == null) {
          this.pending(
            instruction,
            TemplateCompilerRuntimeInstructionReasonKind.InterpolationExpressionCardinality,
            'Runtime interpolation requires one aggregate expression and one target.',
          );
          return null;
        }
        const from = this.expression(instruction, instruction.expressionProductHandles[0]!, null);
        return from == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.Interpolation,
          from,
          to: instruction.target,
        };
      }
      case TemplateInstructionKind.ListenerBinding: {
        const from = this.expression(instruction, instruction.expressionProductHandle, null);
        if (instruction.strategy === TemplateListenerStrategy.Open) {
          this.pending(
            instruction,
            TemplateCompilerRuntimeInstructionReasonKind.ListenerStrategyOpen,
            'Listener strategy is Open.',
          );
        }
        return from == null || instruction.strategy === TemplateListenerStrategy.Open ? null : {
          type: TemplateCompilerFrameworkInstructionType.ListenerBinding,
          from,
          to: instruction.eventName,
          capture: instruction.strategy === TemplateListenerStrategy.Capture,
          modifier: instruction.eventModifier,
        };
      }
      case TemplateInstructionKind.StylePropertyBinding: {
        const from = this.expression(instruction, instruction.expressionProductHandle, null);
        return from == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.StylePropertyBinding,
          from,
          to: instruction.targetProperty,
        };
      }
      case TemplateInstructionKind.AttributeBinding: {
        const from = this.expression(instruction, instruction.expressionProductHandle, null);
        return from == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.AttributeBinding,
          attr: instruction.attr,
          from,
          to: instruction.target,
        };
      }
      case TemplateInstructionKind.MultiAttr: {
        const value = instruction.expressionProductHandle == null
          ? instruction.value
          : this.expression(instruction, instruction.expressionProductHandle, null);
        return value == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.MultiAttr,
          value,
          to: instruction.target,
          command: instruction.command,
        };
      }
      case TemplateInstructionKind.IteratorBinding: {
        const forOf = this.iteratorExpression(instruction, instruction.iterableExpressionProductHandle);
        const props = this.nested(instruction);
        const type = frameworkInstructionTypeFor(instruction);
        if (
          type !== TemplateCompilerFrameworkInstructionType.IteratorBinding
          && type !== TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding
        ) {
          throw new Error(`Iterator instruction '${instruction.productHandle}' lost framework type identity.`);
        }
        return forOf == null || props == null ? null : {
          type,
          forOf,
          to: instruction.targetProperty,
          props,
        };
      }
      case TemplateInstructionKind.TextBinding: {
        if (instruction.expressionChainIndex == null) {
          this.pending(
            instruction,
            TemplateCompilerRuntimeInstructionReasonKind.TextExpressionChainUnavailable,
            'Text binding has no exact expression-chain index.',
          );
          return null;
        }
        const from = this.expression(
          instruction,
          instruction.expressionProductHandle,
          instruction.expressionChainIndex,
        );
        return from == null ? null : { type: TemplateCompilerFrameworkInstructionType.TextBinding, from };
      }
      case TemplateInstructionKind.LetBinding: {
        const hasExpression = instruction.expressionProductHandle != null;
        const hasLiteral = instruction.literalValue != null;
        if (hasExpression === hasLiteral) {
          this.pending(
            instruction,
            TemplateCompilerRuntimeInstructionReasonKind.LetBindingSourceIncoherent,
            'Runtime let binding requires exactly one parsed expression or primitive literal source.',
          );
          return null;
        }
        const from = hasExpression
          ? this.expression(instruction, instruction.expressionProductHandle, null)
          : { $kind: 'PrimitiveLiteral', value: instruction.literalValue! } as const;
        return from == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.LetBinding,
          from,
          to: instruction.target,
        };
      }
      case TemplateInstructionKind.HydrateLetElement: {
        const instructions = this.nested(instruction);
        return instructions == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.HydrateLetElement,
          instructions,
          toBindingContext: instruction.toBindingContext,
        };
      }
      case TemplateInstructionKind.HydrateTemplateController: {
        const props = this.nested(instruction);
        const childHandle = instruction.childCompiledTemplate?.productHandle ?? null;
        const child = childHandle == null ? null : this.contextByCompiledTemplate.get(childHandle) ?? null;
        if (child == null) {
          throw new Error(`Template-controller instruction '${instruction.productHandle}' has no exact child definition.`);
        }
        const res = this.resource(instruction, instruction.resource?.name ?? null);
        return props == null || child == null || res == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.HydrateTemplateController,
          def: new TemplateCompilerRuntimeDefinitionReferenceValue(child),
          res,
          alias: undefined,
          props,
        };
      }
      case TemplateInstructionKind.HydrateAttribute: {
        const props = this.nested(instruction);
        const res = this.resource(instruction, instruction.resourceName);
        return props == null || res == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.HydrateAttribute,
          res,
          alias: instruction.resourceAlias ?? undefined,
          props,
        };
      }
      case TemplateInstructionKind.HydrateElement: {
        const props = this.nested(instruction);
        const res = this.resource(instruction, instruction.resource?.name ?? instruction.elementName);
        const captures = instruction.captureSyntaxProductHandles.map((handle) =>
          this.captureSyntax(instruction, handle)
        );
        const projections = instruction.projections.map((projection) => {
          const child = this.contextByCompiledTemplate.get(projection.compiledTemplate.productHandle) ?? null;
          if (child == null) {
            throw new Error(
              `Projection '${projection.slotName}' on '${instruction.productHandle}' has no exact child definition.`,
            );
          }
          return new TemplateCompilerRuntimeProjectionValue(
            projection.slotName,
            new TemplateCompilerRuntimeDefinitionReferenceValue(child),
          );
        });
        const data: TemplateCompilerRuntimeElementDataValue = instruction.auSlotProcessContent == null
          ? { dataKind: TemplateCompilerRuntimeElementDataKind.None }
          : {
              dataKind: TemplateCompilerRuntimeElementDataKind.AuSlot,
              name: instruction.auSlotProcessContent.name,
            };
        return props == null
          || res == null
          || captures.some((capture) => capture == null)
          || projections.some((projection) => projection == null)
          ? null
          : {
              type: TemplateCompilerFrameworkInstructionType.HydrateElement,
              res,
              props,
              projections: projections.length === 0
                ? null
                : projections,
              containerless: instruction.containerless,
              captures: captures as readonly TemplateCompilerRuntimeAttributeSyntaxValue[],
              data,
            };
      }
      case TemplateInstructionKind.SetAttribute:
        return {
          type: TemplateCompilerFrameworkInstructionType.SetAttribute,
          value: instruction.value,
          to: instruction.targetAttribute,
        };
      case TemplateInstructionKind.SetProperty:
        return {
          type: TemplateCompilerFrameworkInstructionType.SetProperty,
          value: instruction.value,
          to: instruction.targetProperty,
        };
      case TemplateInstructionKind.SetClassAttribute:
        return {
          type: TemplateCompilerFrameworkInstructionType.SetClassAttribute,
          value: instruction.value,
        };
      case TemplateInstructionKind.SetStyleAttribute:
        return {
          type: TemplateCompilerFrameworkInstructionType.SetStyleAttribute,
          value: instruction.value,
        };
      case TemplateInstructionKind.RefBinding: {
        const from = this.expression(instruction, instruction.expressionProductHandle, null);
        return from == null ? null : {
          type: TemplateCompilerFrameworkInstructionType.RefBinding,
          from,
          to: instruction.target,
        };
      }
      case TemplateInstructionKind.SpreadTransferedBinding:
        return { type: TemplateCompilerFrameworkInstructionType.SpreadTransferedBinding };
      case TemplateInstructionKind.SpreadValueBinding:
        return {
          type: TemplateCompilerFrameworkInstructionType.SpreadValueBinding,
          target: instruction.target,
          from: instruction.value,
        };
      default:
        this.pending(
          instruction,
          TemplateCompilerRuntimeInstructionReasonKind.UnsupportedInstructionKind,
          `Instruction kind '${instruction.instructionKind}' has no runtime-value projector yet.`,
        );
        return null;
    }
  }

  private nested(instruction: TemplateInstruction): readonly TemplateCompilerRuntimeInstructionValue[] | null {
    const values = nestedInstructionProductHandlesForInstruction(instruction).map((handle) => {
      const nested = this.instructionByProduct.get(handle) ?? null;
      if (nested == null) {
        throw new Error(
          `Nested instruction '${handle}' is absent from final instruction '${instruction.productHandle}'.`,
        );
      }
      return this.project(nested);
    });
    return values.some((value) => value == null)
      ? null
      : values as readonly TemplateCompilerRuntimeInstructionValue[];
  }

  private expression(
    instruction: TemplateInstruction,
    expressionProductHandle: ProductHandle | null,
    chainIndex: number | null,
  ): RuntimeExpressionAstValue | null {
    if (expressionProductHandle == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        'Instruction has no expression product handle.',
      );
      return null;
    }
    const live = this.request.family.liveExpressionForProduct(expressionProductHandle);
    const durable = readTemplateExpressionParse(this.request.productDetails, expressionProductHandle);
    if (live != null && durable != null) {
      this.fail(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.ConflictingExpressionAuthority,
        'Expression product has both live and durable parser authorities.',
      );
      return null;
    }
    const ast = live != null
      ? chainIndex == null
        ? runtimeAcceptedBindingExpressionAstForResult(live.result)
        : runtimeAcceptedBindingExpressionAstForResultChain(live.result, chainIndex)
      : durable != null
        ? chainIndex == null
          ? runtimeAcceptedBindingExpressionAstForResult(durable.result)
          : runtimeAcceptedBindingExpressionAstForParseChain(durable, chainIndex)
        : null;
    if (live == null && durable == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        `Expression '${expressionProductHandle}' has no live or durable parser authority.`,
      );
      return null;
    }
    if (ast == null) {
      this.pending(
        instruction,
        chainIndex == null
          ? TemplateCompilerRuntimeInstructionReasonKind.ExpressionAstUnavailable
          : TemplateCompilerRuntimeInstructionReasonKind.TextExpressionChainUnavailable,
        'Expression parser result has no runtime-accepted AST value.',
      );
      return null;
    }
    const projection = projectRuntimeExpressionAstValue(ast);
    if (projection.state !== RuntimeExpressionAstProjectionState.Exact || projection.value == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.ExpressionAstProjectionPending,
        `Expression runtime AST projection is pending: ${projection.reasons.map((reason) => reason.reasonKind).join(', ')}.`,
      );
      return null;
    }
    return projection.value;
  }

  private iteratorExpression(
    instruction: TemplateInstruction,
    expressionProductHandle: ProductHandle | null,
  ): RuntimeExpressionAstValue | null {
    if (expressionProductHandle == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        'Iterator instruction has no expression product handle.',
      );
      return null;
    }
    const live = this.request.family.liveExpressionForProduct(expressionProductHandle);
    const durable = readTemplateExpressionParse(this.request.productDetails, expressionProductHandle);
    if (live != null && durable != null) {
      this.fail(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.ConflictingExpressionAuthority,
        'Iterator expression product has both live and durable parser authorities.',
      );
      return null;
    }
    const result = live?.result ?? durable?.result ?? null;
    if (result == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        `Iterator expression '${expressionProductHandle}' has no live or durable parser authority.`,
      );
      return null;
    }
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.ExpressionAstUnavailable,
        `Iterator expression result '${result.kind}' has no exact ForOfStatement wire.`,
      );
      return null;
    }
    const projection = projectRuntimeExpressionAstValue(result.ast);
    if (projection.state !== RuntimeExpressionAstProjectionState.Exact || projection.value == null) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.ExpressionAstProjectionPending,
        `Iterator runtime AST projection is pending: ${projection.reasons.map((reason) => reason.reasonKind).join(', ')}.`,
      );
      return null;
    }
    return projection.value;
  }

  private captureSyntax(
    instruction: TemplateInstruction,
    productHandle: ProductHandle,
  ): TemplateCompilerRuntimeAttributeSyntaxValue | null {
    const syntax = this.request.productDetails.readProductDetail(
      TemplateProductDetails.AttributeSyntax,
      productHandle,
    );
    if (syntax == null || syntax.productHandle !== productHandle) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.CaptureSyntaxUnavailable,
        `Captured AttrSyntax '${productHandle}' is unavailable from the compiler product-detail authority.`,
      );
      return null;
    }
    return new TemplateCompilerRuntimeAttributeSyntaxValue(
      syntax.rawName,
      syntax.rawValue,
      syntax.target,
      syntax.command,
      syntax.parts.length === 0 ? null : [...syntax.parts],
    );
  }

  private resource(
    instruction: TemplateInstruction,
    name: string | null,
  ): TemplateCompilerRuntimeResourceNameValue | null {
    if (name == null || name.length === 0) {
      this.pending(
        instruction,
        TemplateCompilerRuntimeInstructionReasonKind.MissingResourceName,
        'Instruction has no canonical runtime resource name.',
      );
      return null;
    }
    return new TemplateCompilerRuntimeResourceNameValue(name);
  }

  private pending(
    instruction: TemplateInstruction,
    reasonKind: TemplateCompilerRuntimeInstructionReasonKind,
    summary: string,
  ): void {
    this.reasons.push(new TemplateCompilerRuntimeInstructionReason(
      reasonKind,
      instruction.instructionKind,
      instruction.productHandle,
      summary,
      true,
    ));
  }

  private fail(
    instruction: TemplateInstruction,
    reasonKind: TemplateCompilerRuntimeInstructionReasonKind,
    summary: string,
  ): void {
    this.reasons.push(new TemplateCompilerRuntimeInstructionReason(
      reasonKind,
      instruction.instructionKind,
      instruction.productHandle,
      summary,
      false,
    ));
  }
}

export function frameworkInstructionTypeFor(
  instruction: TemplateInstruction,
): TemplateCompilerFrameworkInstructionType {
  if ('frameworkInstructionType' in instruction && instruction.frameworkInstructionType === 200) {
    return TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding;
  }
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateElement: return TemplateCompilerFrameworkInstructionType.HydrateElement;
    case TemplateInstructionKind.HydrateAttribute: return TemplateCompilerFrameworkInstructionType.HydrateAttribute;
    case TemplateInstructionKind.HydrateTemplateController:
      return TemplateCompilerFrameworkInstructionType.HydrateTemplateController;
    case TemplateInstructionKind.HydrateLetElement: return TemplateCompilerFrameworkInstructionType.HydrateLetElement;
    case TemplateInstructionKind.SetProperty: return TemplateCompilerFrameworkInstructionType.SetProperty;
    case TemplateInstructionKind.Interpolation: return TemplateCompilerFrameworkInstructionType.Interpolation;
    case TemplateInstructionKind.PropertyBinding: return TemplateCompilerFrameworkInstructionType.PropertyBinding;
    case TemplateInstructionKind.LetBinding: return TemplateCompilerFrameworkInstructionType.LetBinding;
    case TemplateInstructionKind.RefBinding: return TemplateCompilerFrameworkInstructionType.RefBinding;
    case TemplateInstructionKind.IteratorBinding: return TemplateCompilerFrameworkInstructionType.IteratorBinding;
    case TemplateInstructionKind.MultiAttr: return TemplateCompilerFrameworkInstructionType.MultiAttr;
    case TemplateInstructionKind.TextBinding: return TemplateCompilerFrameworkInstructionType.TextBinding;
    case TemplateInstructionKind.ListenerBinding: return TemplateCompilerFrameworkInstructionType.ListenerBinding;
    case TemplateInstructionKind.AttributeBinding: return TemplateCompilerFrameworkInstructionType.AttributeBinding;
    case TemplateInstructionKind.StylePropertyBinding:
      return TemplateCompilerFrameworkInstructionType.StylePropertyBinding;
    case TemplateInstructionKind.SetAttribute: return TemplateCompilerFrameworkInstructionType.SetAttribute;
    case TemplateInstructionKind.SetClassAttribute: return TemplateCompilerFrameworkInstructionType.SetClassAttribute;
    case TemplateInstructionKind.SetStyleAttribute: return TemplateCompilerFrameworkInstructionType.SetStyleAttribute;
    case TemplateInstructionKind.SpreadTransferedBinding:
      return TemplateCompilerFrameworkInstructionType.SpreadTransferedBinding;
    case TemplateInstructionKind.SpreadElementPropBinding:
      return TemplateCompilerFrameworkInstructionType.SpreadElementProp;
    case TemplateInstructionKind.SpreadValueBinding: return TemplateCompilerFrameworkInstructionType.SpreadValueBinding;
    case TemplateInstructionKind.TranslationBinding:
      return TemplateCompilerFrameworkInstructionType.TranslationBinding;
    case TemplateInstructionKind.TranslationBindBinding:
      return TemplateCompilerFrameworkInstructionType.TranslationBindBinding;
    case TemplateInstructionKind.TranslationParametersBinding:
      return TemplateCompilerFrameworkInstructionType.TranslationParametersBinding;
    case TemplateInstructionKind.StateBinding: return TemplateCompilerFrameworkInstructionType.StateBinding;
    case TemplateInstructionKind.DispatchBinding: return TemplateCompilerFrameworkInstructionType.DispatchBinding;
  }
}

export function frameworkBindingModeFor(
  mode: TemplateBindingMode,
): TemplateCompilerFrameworkBindingMode | null {
  switch (mode) {
    case TemplateBindingMode.Default: return TemplateCompilerFrameworkBindingMode.Default;
    case TemplateBindingMode.OneTime: return TemplateCompilerFrameworkBindingMode.OneTime;
    case TemplateBindingMode.ToView: return TemplateCompilerFrameworkBindingMode.ToView;
    case TemplateBindingMode.FromView: return TemplateCompilerFrameworkBindingMode.FromView;
    case TemplateBindingMode.TwoWay: return TemplateCompilerFrameworkBindingMode.TwoWay;
    case TemplateBindingMode.Open: return null;
  }
}

function unavailable(
  state: Exclude<
    TemplateCompilerRuntimeInstructionFamilyState,
    TemplateCompilerRuntimeInstructionFamilyState.Exact
  >,
  instruction: TemplateInstruction | null,
  reasonKind: TemplateCompilerRuntimeInstructionReasonKind,
  summary: string,
): TemplateCompilerRuntimeInstructionFamilyResult {
  return new TemplateCompilerRuntimeInstructionFamilyResult(
    runtimeInstructionFamilyAuthority,
    state,
    null,
    [new TemplateCompilerRuntimeInstructionReason(
      reasonKind,
      instruction?.instructionKind ?? null,
      instruction?.productHandle ?? null,
      summary,
      state === TemplateCompilerRuntimeInstructionFamilyState.Pending,
    )],
  );
}
