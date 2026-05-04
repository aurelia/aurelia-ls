import type { ExpressionAstNode } from '../expression/ast.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  BindingContextSlotInput,
  BindingScope,
} from '../configuration/scope.js';
import {
  BindingScopeConstructionEmission,
  BindingScopeMaterializer,
} from '../configuration/scope-materializer.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  DryCustomElementController,
  SyntheticViewController,
} from '../configuration/controller.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  type KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionInput,
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import {
  CheckerBindingPatternLocalType,
  CheckerExpressionTypeEvaluator,
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateResourceScope } from './compiler-world.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  SpreadElementPropBindingInstruction,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
  LetBindingTargetContext,
} from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';

export class TemplateScopeConstructionInput {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Custom element definition whose view-model owns the root template scope. */
    readonly definition: CustomElementDefinition,
    /** Compiled-template rows whose instructions and targets describe the render frontier. */
    readonly compiledTemplate: CompiledTemplateEmission,
    /** Runtime binding instances and scope effects emulated from renderer semantics. */
    readonly runtimeBindings: RuntimeRenderingEmission,
    /** Current TypeChecker epoch, if resource recognition supplied one. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Compiler resource scope visible to expression semantics such as value converters. */
    readonly resourceScope: TemplateResourceScope | null = null,
  ) {}
}

export class TemplateScopeConstructionEmission {
  constructor(
    /** Root custom-element Scope created from the definition target type. */
    readonly rootScope: BindingScope,
    /** Derived scopes produced by custom-element children, template-controller views, repeat locals, and let bindings. */
    readonly derivedScopes: readonly BindingScope[],
    /** Runtime-order scope active while evaluating instruction-owned expressions. */
    readonly instructionScopes: readonly TemplateInstructionScopeApplication[],
    /** Kernel records that publish instruction-to-scope application claims. */
    readonly instructionScopeRecords: readonly KernelStoreRecord[],
    /** Scope materializer emissions, including root scope. */
    readonly scopeEmissions: readonly BindingScopeConstructionEmission[],
  ) {}

  readScopes(): readonly BindingScope[] {
    return [
      this.rootScope,
      ...this.derivedScopes,
    ];
  }
}

export class TemplateInstructionScopeApplication {
  constructor(
    /** Instruction whose expression-owned work observes this scope. */
    readonly instructionProductHandle: ProductHandle,
    /** Runtime Scope visible to that instruction before the instruction mutates later scope state. */
    readonly scope: BindingScope,
  ) {}
}

/**
 * Materializes runtime-shaped binding scopes for a compiled template frontier.
 *
 * Controller and Scope classes own the construction shapes. This coordinator preserves template-order effects and
 * commits the resulting Scope/BindingContext/IOverrideContext products into the kernel store.
 */
export class TemplateControllerScopeMaterializer {
  private readonly scopeMaterializer: BindingScopeMaterializer;
  private readonly typeProjector: CheckerTypeProjector;

  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {
    this.scopeMaterializer = new BindingScopeMaterializer(store);
    this.typeProjector = new CheckerTypeProjector(store);
  }

  construct(input: TemplateScopeConstructionInput): TemplateScopeConstructionEmission {
    const root = this.constructRootScope(input);
    input.runtimeBindings.rootController.attachScope(root.scope.toReference());
    const scopeEmissions: BindingScopeConstructionEmission[] = [root];
    const derivedScopes: BindingScope[] = [];
    const instructionScopes: TemplateInstructionScopeApplication[] = [];
    const sequencesByProduct = new Map(input.compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
    const instructionsByProduct = new Map(input.compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction]));
    let currentScope = root.scope;

    input.compiledTemplate.renderTargets.forEach((target, targetIndex) => {
      const sequence = sequencesByProduct.get(target.instructionSequenceProductHandle) ?? null;
      if (sequence == null) {
        return;
      }
      currentScope = this.constructInstructionSequence(
        input,
        currentScope,
        sequence,
        `target:${targetIndex}`,
        instructionsByProduct,
        sequencesByProduct,
        instructionScopes,
        scopeEmissions,
        derivedScopes,
      );
    });

    this.registerControllerDetails(input);
    const instructionScopeRecords = this.recordsForInstructionScopeApplications(input.localKey, instructionScopes);
    if (instructionScopeRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(instructionScopeRecords, `template-scope:${input.localKey}:instruction-scopes`));
    }
    return new TemplateScopeConstructionEmission(root.scope, derivedScopes, instructionScopes, instructionScopeRecords, scopeEmissions);
  }

  private constructInstructionSequence(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    sequence: TemplateInstructionSequence,
    localSuffix: string,
    instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
    sequencesByProduct: ReadonlyMap<ProductHandle, TemplateInstructionSequence>,
    instructionScopes: TemplateInstructionScopeApplication[],
    scopeEmissions: BindingScopeConstructionEmission[],
    derivedScopes: BindingScope[],
  ): BindingScope {
    let current = parent;
    sequence.instructions.forEach((reference, index) => {
      const instruction = reference.productHandle == null
        ? null
        : instructionsByProduct.get(reference.productHandle) ?? null;
      if (instruction == null) {
        return;
      }
      instructionScopes.push(new TemplateInstructionScopeApplication(instruction.productHandle, current));
      current = this.constructInstructionScope(
        input,
        current,
        instruction,
        `${localSuffix}:instruction:${index}`,
        instructionsByProduct,
        sequencesByProduct,
        instructionScopes,
        scopeEmissions,
        derivedScopes,
      );
    });
    return current;
  }

  private constructInstructionScope(
    input: TemplateScopeConstructionInput,
    currentScope: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
    sequencesByProduct: ReadonlyMap<ProductHandle, TemplateInstructionSequence>,
    instructionScopes: TemplateInstructionScopeApplication[],
    scopeEmissions: BindingScopeConstructionEmission[],
    derivedScopes: BindingScope[],
  ): BindingScope {
    this.recordOwnedBindingInstructionScopes(instruction, currentScope, instructionsByProduct, instructionScopes);

    if (instruction instanceof HydrateLetElementInstruction) {
      const emission = this.constructLetElementScope(input, currentScope, instruction, localSuffix);
      if (emission == null) {
        return currentScope;
      }
      scopeEmissions.push(emission);
      derivedScopes.push(emission.scope);
      return emission.scope;
    }

    if (instruction instanceof HydrateTemplateControllerInstruction) {
      const controller = input.runtimeBindings.readControllerForInstruction(instruction.productHandle);
      const synthetic = this.constructSyntheticScope(input, currentScope, instruction, controller, localSuffix);
      controller?.attachScope(synthetic.scope.toReference());
      scopeEmissions.push(synthetic);
      derivedScopes.push(synthetic.scope);
      const childScope = this.constructScopeEffects(
        input,
        synthetic.scope,
        instruction.productHandle,
        `${localSuffix}:template-controller`,
        scopeEmissions,
        derivedScopes,
      ) ?? synthetic.scope;
      const childSequence = instruction.childInstructionSequenceProductHandle == null
        ? null
        : sequencesByProduct.get(instruction.childInstructionSequenceProductHandle) ?? null;
      if (childSequence != null) {
        this.constructInstructionSequence(
          input,
          childScope,
          childSequence,
          `${localSuffix}:child-sequence`,
          instructionsByProduct,
          sequencesByProduct,
          instructionScopes,
          scopeEmissions,
          derivedScopes,
        );
      }
      return currentScope;
    }

    const nextScope = this.constructScopeEffects(
      input,
      currentScope,
      instruction.productHandle,
      localSuffix,
      scopeEmissions,
      derivedScopes,
    );
    if (nextScope != null) {
      return nextScope;
    }

    if (instruction instanceof HydrateElementInstruction) {
      const emission = this.constructChildElementScope(input, currentScope, instruction, localSuffix);
      if (emission != null) {
        scopeEmissions.push(emission);
        derivedScopes.push(emission.scope);
      }
    }

    return currentScope;
  }

  private constructRootScope(input: TemplateScopeConstructionInput): BindingScopeConstructionEmission {
    return this.scopeMaterializer.construct(DryCustomElementController.createBindingScopeInput({
      localKey: `${input.localKey}:scope:root`,
      ownerProductHandle: input.runtimeBindings.rootController.productHandle,
      ownerIdentityHandle: input.runtimeBindings.rootController.identityHandle,
      parent: null,
      viewModelType: input.definition.target.targetType,
      sourceAddressHandle: input.definition.sourceAddressHandle,
    }));
  }

  private recordOwnedBindingInstructionScopes(
    instruction: TemplateInstruction,
    scope: BindingScope,
    instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
    instructionScopes: TemplateInstructionScopeApplication[],
  ): void {
    for (const productHandle of ownedBindingInstructionProductHandles(instruction)) {
      const childInstruction = instructionsByProduct.get(productHandle) ?? null;
      if (childInstruction == null) {
        continue;
      }
      instructionScopes.push(new TemplateInstructionScopeApplication(childInstruction.productHandle, scope));
    }
  }

  private constructChildElementScope(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    instruction: HydrateElementInstruction,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const definition = instruction.definitionProductHandle == null
      ? null
      : this.store.productDetails.read(ResourceProductDetails.Definition, instruction.definitionProductHandle);
    if (!(definition instanceof CustomElementDefinition)) {
      return null;
    }
    const controller = input.runtimeBindings.readControllerForInstruction(instruction.productHandle);
    const emission = this.scopeMaterializer.construct(DryCustomElementController.createBindingScopeInput({
      localKey: `${input.localKey}:scope:hydrate-element:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      viewModelType: definition.target.targetType,
      sourceAddressHandle: instruction.sourceAddressHandle,
    }));
    controller?.attachScope(emission.scope.toReference());
    return emission;
  }

  private constructSyntheticScope(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.construct(SyntheticViewController.createBindingScopeInput({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      sourceAddressHandle: instruction.sourceAddressHandle,
    }));
  }

  private constructScopeEffects(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    ownerProductHandle: ProductHandle,
    localSuffix: string,
    scopeEmissions: BindingScopeConstructionEmission[],
    derivedScopes: BindingScope[],
  ): BindingScope | null {
    const effects = input.runtimeBindings.readScopeEffectsForOwner(ownerProductHandle);
    if (effects.length === 0) {
      return null;
    }

    let current = parent;
    const letEffects: LetBindingScopeEffect[] = [];
    effects.forEach((effect, index) => {
      if (effect instanceof IteratorBindingScopeEffect) {
        const emission = this.constructIteratorScope(input, current, effect, `${localSuffix}:iterator:${index}`);
        scopeEmissions.push(emission);
        derivedScopes.push(emission.scope);
        current = emission.scope;
      }
      if (effect instanceof LetBindingScopeEffect) {
        letEffects.push(effect);
      }
    });

    if (letEffects.length > 0) {
      const emission = this.constructLetScope(
        input,
        current,
        letEffects,
        `${localSuffix}:let`,
        letEffects[0]?.sourceAddressHandle ?? null,
      );
      scopeEmissions.push(emission);
      derivedScopes.push(emission.scope);
      current = emission.scope;
    }

    return current;
  }

  private constructIteratorScope(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    const elementType = this.iteratorElementType(input, parent, effect, localSuffix);
    const localTypes = this.iteratorLocalTypes(input, parent, effect, localSuffix);
    return this.scopeMaterializer.construct(BindingScope.fromRepeatedItemInput({
      localKey: `${input.localKey}:scope:${localSuffix}`,
      ownerProductHandle: effect.productHandle,
      ownerIdentityHandle: effect.identityHandle,
      parent,
      localSlots: effect.localNames.map((name) => new BindingContextSlotInput(
        name,
        null,
        null,
        localTypes.has(name)
          ? localTypes.get(name)?.typeReference ?? null
          : elementTypeForFlattenedIteratorName(effect.localNames, elementType),
        effect.sourceAddressHandle,
      )),
      overrideSlots: repeatOverrideSlots(input, this.typeProjector, effect.sourceAddressHandle, elementType),
      sourceAddressHandle: effect.sourceAddressHandle,
      scopeEffectOwnerProductHandles: [effect.productHandle],
    }));
  }

  private constructLetElementScope(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    instruction: HydrateLetElementInstruction,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const letEffects = input.runtimeBindings.readScopeEffectsForOwner(instruction.productHandle)
      .filter((effect): effect is LetBindingScopeEffect => effect instanceof LetBindingScopeEffect);
    if (letEffects.length === 0) {
      return null;
    }
    return this.constructLetScope(input, parent, letEffects, `let-element:${localSuffix}`, instruction.sourceAddressHandle);
  }

  private constructLetScope(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effects: readonly LetBindingScopeEffect[],
    localSuffix: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScopeConstructionEmission {
    const bindingContextLetSlots = effects
      .filter((effect) => effect.targetContext === LetBindingTargetContext.BindingContext)
      .map((effect) => this.letSlot(input, parent, effect));
    const overrideContextLetSlots = effects
      .filter((effect) => effect.targetContext === LetBindingTargetContext.OverrideContext)
      .map((effect) => this.letSlot(input, parent, effect));
    return this.scopeMaterializer.construct(BindingScope.fromLetBindingsInput({
      localKey: `${input.localKey}:scope:${localSuffix}`,
      ownerProductHandle: effects[0]?.productHandle ?? null,
      ownerIdentityHandle: effects[0]?.identityHandle ?? null,
      parent,
      bindingContextSlots: bindingContextLetSlots,
      overrideContextSlots: overrideContextLetSlots,
      sourceAddressHandle,
      scopeEffectOwnerProductHandles: effects.map((effect) => effect.productHandle),
    }));
  }

  private letSlot(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): BindingContextSlotInput {
    return new BindingContextSlotInput(
      effect.target,
      null,
      null,
      this.letTargetType(input, parent, effect),
      effect.sourceAddressHandle,
    );
  }

  private iteratorElementType(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateIteratorElement(
      parse.result.ast,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  private iteratorLocalTypes(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): ReadonlyMap<string, CheckerBindingPatternLocalType> {
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return new Map();
    }
    const evaluation = this.typeEvaluator(input).evaluateIteratorLocals(
      parse.result.ast,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
    );
    if (!Array.isArray(evaluation)) {
      return new Map();
    }
    return new Map(evaluation.map((local) => [local.name, local]));
  }

  private letTargetType(
    input: TemplateScopeConstructionInput,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): CheckerTypeReference | null {
    const parse = this.readParse(effect.expressionProductHandle);
    const ast = parse == null ? null : expressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateWithScope(
      ast,
      parent,
      `let:${effect.productHandle}:${effect.target}`,
      effect.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  private readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }

  private typeEvaluator(input: TemplateScopeConstructionInput): CheckerExpressionTypeEvaluator {
    return new CheckerExpressionTypeEvaluator(this.store, this.typeProjector, input.resourceScope);
  }

  private registerControllerDetails(input: TemplateScopeConstructionInput): void {
    for (const controller of input.runtimeBindings.controllers) {
      this.store.productDetails.addIfAbsent(
        ConfigurationProductDetails.Controller,
        controller.productHandle,
        controller.toControllerProduct(),
      );
    }
  }

  private recordsForInstructionScopeApplications(
    localKey: string,
    instructionScopes: readonly TemplateInstructionScopeApplication[],
  ): readonly KernelStoreRecord[] {
    if (instructionScopes.length === 0) {
      return [];
    }

    const evidenceHandle = this.store.handles.evidence(`template-scope:${localKey}:instruction-scopes`);
    const provenanceHandle = this.store.handles.provenance(`template-scope:${localKey}:instruction-scopes`);
    const uniqueApplications = uniqueInstructionScopeApplications(instructionScopes);
    const claims = uniqueApplications.map((application, index) => new SemanticClaim(
      this.store.handles.claim(`template-scope:${localKey}:instruction-scope:${index}`),
      application.instructionProductHandle,
      KernelVocabulary.Configuration.InstructionUsesBindingScope.key,
      application.scope.productHandle,
      provenanceHandle,
    ));

    return [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope],
        'Runtime instruction order determines the binding scope visible to instruction-owned expressions.',
        null,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
      ...claims,
    ];
  }
}

function expressionAstForParse(parse: TemplateExpressionParse): ExpressionAstNode | null {
  switch (parse.result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return parse.result.ast;
    default:
      return null;
  }
}

function ownedBindingInstructionProductHandles(
  instruction: TemplateInstruction,
): readonly ProductHandle[] {
  if (instruction instanceof HydrateElementInstruction) {
    return instruction.bindableInstructionProductHandles;
  }
  if (instruction instanceof HydrateAttributeInstruction) {
    return instruction.bindingInstructionProductHandles;
  }
  if (instruction instanceof HydrateTemplateControllerInstruction) {
    return instruction.bindingInstructionProductHandles;
  }
  if (instruction instanceof HydrateLetElementInstruction) {
    return instruction.instructionProductHandles;
  }
  if (instruction instanceof SpreadElementPropBindingInstruction) {
    return [instruction.instructionProductHandle];
  }
  return [];
}

function uniqueInstructionScopeApplications(
  instructionScopes: readonly TemplateInstructionScopeApplication[],
): readonly TemplateInstructionScopeApplication[] {
  const seen = new Set<string>();
  const unique: TemplateInstructionScopeApplication[] = [];
  for (const application of instructionScopes) {
    const key = `${application.instructionProductHandle}->${application.scope.productHandle}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(application);
  }
  return unique;
}

function repeatOverrideSlots(
  input: TemplateScopeConstructionInput,
  projector: CheckerTypeProjector,
  sourceAddressHandle: AddressHandle | null,
  elementType: CheckerTypeReference | null,
): readonly BindingContextSlotInput[] {
  return [
    new BindingContextSlotInput('$index', null, null, primitiveReference(input, projector, 'number', '$index', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$odd', null, null, primitiveReference(input, projector, 'boolean', '$odd', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$even', null, null, primitiveReference(input, projector, 'boolean', '$even', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$first', null, null, primitiveReference(input, projector, 'boolean', '$first', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$middle', null, null, primitiveReference(input, projector, 'boolean', '$middle', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$last', null, null, primitiveReference(input, projector, 'boolean', '$last', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$length', null, null, primitiveReference(input, projector, 'number', '$length', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotInput('$previous', null, null, elementType, sourceAddressHandle),
  ];
}

function elementTypeForFlattenedIteratorName(
  names: readonly string[],
  elementType: CheckerTypeReference | null,
): CheckerTypeReference | null {
  return names.length === 1 ? elementType : null;
}

function primitiveReference(
  input: TemplateScopeConstructionInput,
  projector: CheckerTypeProjector,
  primitive: 'number' | 'boolean',
  name: string,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeReference | null {
  if (input.typeSystem == null) {
    return null;
  }
  const checker = input.typeSystem.checker;
  const type = primitive === 'number' ? checker.getNumberType() : checker.getBooleanType();
  return projector.ensureProjection(new CheckerTypeProjectionInput(
    `${input.localKey}:scope:repeat-context:${name}`,
    checker,
    type,
    CheckerTypeProjectionOrigin.SyntheticTemplateType,
    null,
    sourceAddressHandle,
    null,
    primitive,
  )).toReference();
}
