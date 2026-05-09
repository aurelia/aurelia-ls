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
  BindingContextSlotDraft,
  BindingScope,
} from '../configuration/scope.js';
import {
  BindingScopeConstructionEmission,
  BindingScopeMaterializer,
} from '../configuration/scope-materializer.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  DryCustomElementController,
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
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import {
  CheckerExpressionScopeNarrower,
  CheckerExpressionScopeNarrowingPolarity,
  type CheckerExpressionScopeNarrowingRequest,
} from '../type-system/expression-scope-narrower.js';
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
  InterpolationInstruction,
  PropertyBindingInstruction,
  SpreadElementPropBindingInstruction,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  BuiltInTemplateControllerChildScopeKind,
  BuiltInTemplateControllerFlowKind,
  runtimeHtmlTemplateControllerSemanticsForName,
} from './template-controller-semantics.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
  LetBindingTargetContext,
} from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';
import {
  completedTemplateExpressionAstForParse,
} from './expression-parse-projection.js';

export interface TemplateScopeConstructionRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Custom element definition whose view-model owns the root template scope. */
  readonly definition: CustomElementDefinition;
  /** Compiled-template rows whose instructions and targets describe the render frontier. */
  readonly compiledTemplate: CompiledTemplateEmission;
  /** Runtime binding instances and scope effects emulated from renderer semantics. */
  readonly runtimeBindings: RuntimeRenderingEmission;
  /** Current TypeChecker epoch, if resource recognition supplied one. */
  readonly typeSystem: TypeSystemProject | null;
  /** Compiler resource scope visible to expression semantics such as value converters. */
  readonly resourceScope: TemplateResourceScope | null;
}

export class TemplateScopeConstructionEmission {
  constructor(
    /** Root custom-element Scope created from the definition target type. */
    readonly rootScope: BindingScope,
    /** Derived scopes produced by custom-element children, template-controller views, repeat locals, and let bindings. */
    readonly derivedScopes: readonly BindingScope[],
    /** Runtime-order scope active while evaluating instruction-owned expressions. */
    readonly instructionScopes: readonly TemplateInstructionScopeApplication[],
    /** Template-controller link-hook relationships published while constructing control-flow scope. */
    readonly templateControllerLinks: readonly TemplateControllerLinkApplication[],
    /** Kernel records that publish instruction-to-scope application claims. */
    readonly instructionScopeRecords: readonly KernelStoreRecord[],
    /** Kernel records that publish template-controller link-hook claims. */
    readonly templateControllerLinkRecords: readonly KernelStoreRecord[],
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

export class TemplateControllerLinkApplication {
  constructor(
    /** Template-controller controller whose link hook attached it to another template-controller. */
    readonly sourceController: RuntimeControllerFrame,
    /** Template-controller controller that receives the source branch/controller. */
    readonly targetController: RuntimeControllerFrame,
    /** Instruction whose link hook produced this relationship. */
    readonly sourceInstruction: HydrateTemplateControllerInstruction,
  ) {}
}

class TemplateControllerPromiseState {
  constructor(
    readonly instruction: HydrateTemplateControllerInstruction,
    readonly valueScope: BindingScope,
  ) {}
}

const enum TemplateControllerPromiseResultKind {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

class TemplateControllerFlowState {
  private readonly previousIfByParentScope = new Map<ProductHandle, HydrateTemplateControllerInstruction>();
  private readonly promiseByChildScope = new Map<ProductHandle, TemplateControllerPromiseState>();
  private readonly switchByChildScope = new Map<ProductHandle, HydrateTemplateControllerInstruction>();

  rememberIf(parent: BindingScope, instruction: HydrateTemplateControllerInstruction): void {
    this.previousIfByParentScope.set(parent.productHandle, instruction);
  }

  consumeIf(parent: BindingScope): HydrateTemplateControllerInstruction | null {
    const instruction = this.previousIfByParentScope.get(parent.productHandle) ?? null;
    this.previousIfByParentScope.delete(parent.productHandle);
    return instruction;
  }

  clearBranch(parent: BindingScope): void {
    this.previousIfByParentScope.delete(parent.productHandle);
  }

  rememberPromise(childScope: BindingScope, instruction: HydrateTemplateControllerInstruction, valueScope: BindingScope): void {
    this.promiseByChildScope.set(childScope.productHandle, new TemplateControllerPromiseState(instruction, valueScope));
  }

  readPromise(childScope: BindingScope): TemplateControllerPromiseState | null {
    return this.promiseByChildScope.get(childScope.productHandle) ?? null;
  }

  forgetPromise(childScope: BindingScope): void {
    this.promiseByChildScope.delete(childScope.productHandle);
  }

  rememberSwitch(childScope: BindingScope, instruction: HydrateTemplateControllerInstruction): void {
    this.switchByChildScope.set(childScope.productHandle, instruction);
  }

  readSwitch(childScope: BindingScope): HydrateTemplateControllerInstruction | null {
    return this.switchByChildScope.get(childScope.productHandle) ?? null;
  }

  forgetSwitch(childScope: BindingScope): void {
    this.switchByChildScope.delete(childScope.productHandle);
  }
}

type TemplateControllerValueTarget = {
  readonly name: string;
  readonly sourceAddressHandle: AddressHandle | null;
};

class TemplateScopeConstructionFrame {
  readonly scopeEmissions: BindingScopeConstructionEmission[];
  readonly derivedScopes: BindingScope[] = [];
  readonly instructionScopes: TemplateInstructionScopeApplication[] = [];
  readonly templateControllerLinks: TemplateControllerLinkApplication[] = [];
  readonly flowState = new TemplateControllerFlowState();
  currentScope: BindingScope;

  private constructor(
    readonly input: TemplateScopeConstructionRequest,
    readonly root: BindingScopeConstructionEmission,
    private readonly sequencesByProduct: ReadonlyMap<ProductHandle, TemplateInstructionSequence>,
    private readonly instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
  ) {
    this.currentScope = root.scope;
    this.scopeEmissions = [root];
  }

  static create(
    input: TemplateScopeConstructionRequest,
    root: BindingScopeConstructionEmission,
  ): TemplateScopeConstructionFrame {
    return new TemplateScopeConstructionFrame(
      input,
      root,
      new Map(input.compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence])),
      new Map([
        ...input.compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction] as const),
        ...input.runtimeBindings.dynamicInstructions.map((instruction) => [instruction.productHandle, instruction] as const),
      ]),
    );
  }

  readSequence(productHandle: ProductHandle | null): TemplateInstructionSequence | null {
    return productHandle == null
      ? null
      : this.sequencesByProduct.get(productHandle) ?? null;
  }

  readInstruction(productHandle: ProductHandle | null): TemplateInstruction | null {
    return productHandle == null
      ? null
      : this.instructionsByProduct.get(productHandle) ?? null;
  }

  addInstructionScope(instructionProductHandle: ProductHandle, scope: BindingScope): void {
    this.instructionScopes.push(new TemplateInstructionScopeApplication(instructionProductHandle, scope));
  }

  hasInstructionScope(instructionProductHandle: ProductHandle): boolean {
    return this.instructionScopes.some((application) => application.instructionProductHandle === instructionProductHandle);
  }

  addDerivedScope(emission: BindingScopeConstructionEmission): BindingScope {
    this.scopeEmissions.push(emission);
    this.derivedScopes.push(emission.scope);
    return emission.scope;
  }

  addTemplateControllerLink(link: TemplateControllerLinkApplication): void {
    if (this.templateControllerLinks.some((existing) =>
      existing.sourceController.productHandle === link.sourceController.productHandle
      && existing.targetController.productHandle === link.targetController.productHandle
    )) {
      return;
    }
    this.templateControllerLinks.push(link);
  }

  toEmission(
    instructionScopeRecords: readonly KernelStoreRecord[],
    templateControllerLinkRecords: readonly KernelStoreRecord[],
  ): TemplateScopeConstructionEmission {
    return new TemplateScopeConstructionEmission(
      this.root.scope,
      this.derivedScopes,
      this.instructionScopes,
      this.templateControllerLinks,
      instructionScopeRecords,
      templateControllerLinkRecords,
      this.scopeEmissions,
    );
  }
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
  private readonly asyncTypeProjector: CheckerAsyncTypeProjector;
  private readonly scopeNarrower: CheckerExpressionScopeNarrower;

  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {
    this.scopeMaterializer = new BindingScopeMaterializer(store);
    this.typeProjector = new CheckerTypeProjector(store);
    this.asyncTypeProjector = new CheckerAsyncTypeProjector(store, this.typeProjector);
    this.scopeNarrower = new CheckerExpressionScopeNarrower(store, this.typeProjector);
  }

  construct(input: TemplateScopeConstructionRequest): TemplateScopeConstructionEmission {
    const root = this.constructRootScope(input);
    input.runtimeBindings.rootController.attachScope(root.scope.toReference());
    const frame = TemplateScopeConstructionFrame.create(input, root);
    this.constructRenderTargets(frame);
    this.captureDynamicInstructionScopes(frame);
    this.registerControllerDetails(input);
    return this.commitScopeConstruction(frame);
  }

  private constructRenderTargets(frame: TemplateScopeConstructionFrame): void {
    this.constructSurrogateSequence(frame);
    frame.input.compiledTemplate.renderTargets.forEach((target, targetIndex) => {
      const sequence = frame.readSequence(target.instructionSequenceProductHandle);
      if (sequence == null) {
        return;
      }
      frame.currentScope = this.constructInstructionSequence(
        frame,
        frame.currentScope,
        sequence,
        `target:${targetIndex}`,
      );
    });
  }

  private constructSurrogateSequence(frame: TemplateScopeConstructionFrame): void {
    const sequence = frame.input.compiledTemplate.compiledTemplate.surrogateSequence;
    if (sequence == null) {
      return;
    }
    frame.currentScope = this.constructInstructionSequence(
      frame,
      frame.currentScope,
      sequence,
      'surrogate',
    );
  }

  private captureDynamicInstructionScopes(frame: TemplateScopeConstructionFrame): void {
    for (const instruction of frame.input.runtimeBindings.dynamicInstructions) {
      if (frame.hasInstructionScope(instruction.productHandle)) {
        continue;
      }
      frame.addInstructionScope(
        instruction.productHandle,
        this.capturedAttributeScopeForDynamicInstruction(instruction.productHandle, frame.instructionScopes) ?? frame.root.scope,
      );
    }
  }

  private commitScopeConstruction(frame: TemplateScopeConstructionFrame): TemplateScopeConstructionEmission {
    const instructionScopeRecords = this.recordsForInstructionScopeApplications(frame.input.localKey, frame.instructionScopes);
    const templateControllerLinkRecords = this.recordsForTemplateControllerLinks(frame.input.localKey, frame.templateControllerLinks);
    if (instructionScopeRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(instructionScopeRecords, `template-scope:${frame.input.localKey}:instruction-scopes`));
    }
    if (templateControllerLinkRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(templateControllerLinkRecords, `template-scope:${frame.input.localKey}:template-controller-links`));
    }
    return frame.toEmission(instructionScopeRecords, templateControllerLinkRecords);
  }

  private constructInstructionSequence(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    sequence: TemplateInstructionSequence,
    localSuffix: string,
  ): BindingScope {
    let current = parent;
    sequence.instructions.forEach((reference, index) => {
      const instruction = frame.readInstruction(reference.productHandle);
      if (instruction == null) {
        return;
      }
      frame.addInstructionScope(instruction.productHandle, current);
      current = this.constructInstructionScope(
        frame,
        current,
        instruction,
        `${localSuffix}:instruction:${index}`,
      );
    });
    return current;
  }

  private constructInstructionScope(
    frame: TemplateScopeConstructionFrame,
    currentScope: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
  ): BindingScope {
    this.recordOwnedBindingInstructionScopes(instruction, currentScope, frame);

    if (instruction instanceof HydrateLetElementInstruction) {
      const emission = this.constructLetElementScope(frame.input, currentScope, instruction, localSuffix);
      if (emission == null) {
        return currentScope;
      }
      return frame.addDerivedScope(emission);
    }

    if (instruction instanceof HydrateTemplateControllerInstruction) {
      const controller = frame.input.runtimeBindings.readControllerForInstruction(instruction.productHandle);
      controller?.attachScope(currentScope.toReference());
      const childScope = this.constructTemplateControllerChildScope(
        frame,
        currentScope,
        instruction,
        controller,
        localSuffix,
      );
      frame.input.runtimeBindings
        .readSyntheticControllerForTemplateControllerInstruction(instruction.productHandle)
        ?.attachScope(childScope.toReference());
      const childSequence = frame.readSequence(instruction.childInstructionSequenceProductHandle);
      if (childSequence != null) {
        this.constructInstructionSequence(
          frame,
          childScope,
          childSequence,
          `${localSuffix}:child-sequence`,
        );
      }
      const semantics = runtimeHtmlTemplateControllerSemanticsForName(instruction.controllerName);
      if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Promise) {
        frame.flowState.forgetPromise(childScope);
      }
      if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Switch) {
        frame.flowState.forgetSwitch(childScope);
      }
      return currentScope;
    }

    const nextScope = this.constructScopeEffects(
      frame,
      currentScope,
      instruction.productHandle,
      localSuffix,
    );
    if (nextScope != null) {
      frame.flowState.clearBranch(currentScope);
      return nextScope;
    }

    if (instruction instanceof HydrateElementInstruction) {
      frame.flowState.clearBranch(currentScope);
      const emission = this.constructChildElementScope(frame.input, currentScope, instruction, localSuffix);
      if (emission != null) {
        frame.addDerivedScope(emission);
      }
    }

    frame.flowState.clearBranch(currentScope);
    return currentScope;
  }

  private constructRootScope(input: TemplateScopeConstructionRequest): BindingScopeConstructionEmission {
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
    frame: TemplateScopeConstructionFrame,
  ): void {
    for (const productHandle of ownedBindingInstructionProductHandles(instruction)) {
      const childInstruction = frame.readInstruction(productHandle);
      if (childInstruction == null) {
        continue;
      }
      frame.addInstructionScope(childInstruction.productHandle, scope);
    }
  }

  private capturedAttributeScopeForDynamicInstruction(
    instructionProductHandle: ProductHandle,
    currentInstructionScopes: readonly TemplateInstructionScopeApplication[],
  ): BindingScope | null {
    for (const claimHandle of this.store.readClaimsForSubject(instructionProductHandle)) {
      const claim = this.store.readClaim(claimHandle);
      if (claim?.predicateKey !== KernelVocabulary.Instruction.DynamicInstructionOriginatesFromCapturedAttributeSyntax.key) {
        continue;
      }
      const capturedSyntaxProductHandle = claim.objectHandle as ProductHandle;
      if (this.store.readProduct(capturedSyntaxProductHandle)?.productKindKey !== KernelVocabulary.Template.AttributeSyntax.key) {
        continue;
      }
      const scope = this.scopeForCapturedSyntax(capturedSyntaxProductHandle, currentInstructionScopes);
      if (scope != null) {
        return scope;
      }
    }
    return null;
  }

  private scopeForCapturedSyntax(
    capturedSyntaxProductHandle: ProductHandle,
    currentInstructionScopes: readonly TemplateInstructionScopeApplication[],
  ): BindingScope | null {
    for (const entry of this.store.productDetails.readBySlot(TemplateProductDetails.Instruction)) {
      const instruction = entry.detail;
      if (!(instruction instanceof HydrateElementInstruction)
        || !instruction.captureSyntaxProductHandles.includes(capturedSyntaxProductHandle)) {
        continue;
      }
      const currentScope = currentInstructionScopes.find((application) =>
        application.instructionProductHandle === instruction.productHandle
      )?.scope ?? null;
      if (currentScope != null) {
        return currentScope;
      }
      const storedScope = this.storedInstructionScope(instruction.productHandle);
      if (storedScope != null) {
        return storedScope;
      }
    }
    return null;
  }

  private storedInstructionScope(instructionProductHandle: ProductHandle): BindingScope | null {
    for (const claimHandle of this.store.readClaimsForSubject(instructionProductHandle)) {
      const claim = this.store.readClaim(claimHandle);
      if (claim?.predicateKey !== KernelVocabulary.Configuration.InstructionUsesBindingScope.key) {
        continue;
      }
      const scopeProductHandle = claim.objectHandle as ProductHandle;
      if (this.store.readProduct(scopeProductHandle)?.productKindKey !== KernelVocabulary.Configuration.BindingScope.key) {
        continue;
      }
      const scope = this.store.productDetails.read(ConfigurationProductDetails.BindingScope, scopeProductHandle);
      if (scope != null) {
        return scope;
      }
    }
    return null;
  }

  private constructChildElementScope(
    input: TemplateScopeConstructionRequest,
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

  private constructTemplateControllerChildScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    const effectScope = this.constructScopeEffects(
      frame,
      parent,
      instruction.productHandle,
      `${localSuffix}:template-controller`,
    );
    if (effectScope != null) {
      return effectScope;
    }

    const semantics = runtimeHtmlTemplateControllerSemanticsForName(instruction.controllerName);
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.ConditionalElse) {
      const previousIf = frame.flowState.consumeIf(parent);
      if (previousIf != null) {
        this.recordTemplateControllerLink(frame, controller, instruction, previousIf);
        const emission = this.constructIfNarrowedScope(
          frame.input,
          parent,
          previousIf,
          instruction,
          controller,
          CheckerExpressionScopeNarrowingPolarity.Falsy,
          `${localSuffix}:else-falsy`,
        );
        if (emission != null) {
          return frame.addDerivedScope(emission);
        }
      }
      return parent;
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromisePending
      || semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
      || semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseRejected) {
      frame.flowState.clearBranch(parent);
      const promiseState = frame.flowState.readPromise(parent);
      if (promiseState != null) {
        this.recordTemplateControllerLink(frame, controller, instruction, promiseState.instruction);
      }
      if (semantics.flowKind === BuiltInTemplateControllerFlowKind.PromisePending) {
        return parent;
      }
      const emission = promiseState == null
        ? null
        : this.constructPromiseResultScope(
          frame.input,
          parent,
          instruction,
          controller,
          promiseState,
          semantics.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
            ? TemplateControllerPromiseResultKind.Fulfilled
            : TemplateControllerPromiseResultKind.Rejected,
          localSuffix,
        );
      if (emission != null) {
        return frame.addDerivedScope(emission);
      }
      return parent;
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      || semantics?.flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault) {
      frame.flowState.clearBranch(parent);
      const switchInstruction = frame.flowState.readSwitch(parent);
      if (switchInstruction != null) {
        this.recordTemplateControllerLink(frame, controller, instruction, switchInstruction);
      }
      return parent;
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.ValueScope
      && semantics.childScopeKind === BuiltInTemplateControllerChildScopeKind.ValueBindingContext) {
      frame.flowState.clearBranch(parent);
      const emission = this.constructWithTemplateControllerScope(frame.input, parent, instruction, controller, localSuffix);
      return frame.addDerivedScope(emission);
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Promise
      && semantics.childScopeKind === BuiltInTemplateControllerChildScopeKind.EmptyObjectBindingContext) {
      frame.flowState.clearBranch(parent);
      const emission = this.constructObjectTemplateControllerScope(frame.input, parent, instruction, controller, localSuffix, null);
      frame.addDerivedScope(emission);
      frame.flowState.rememberPromise(emission.scope, instruction, parent);
      return emission.scope;
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Switch) {
      frame.flowState.clearBranch(parent);
      frame.flowState.rememberSwitch(parent, instruction);
      return parent;
    }

    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Conditional) {
      const emission = this.constructIfNarrowedScope(
        frame.input,
        parent,
        instruction,
        instruction,
        controller,
        CheckerExpressionScopeNarrowingPolarity.Truthy,
        `${localSuffix}:if-truthy`,
      );
      frame.flowState.rememberIf(parent, instruction);
      if (emission != null) {
        return frame.addDerivedScope(emission);
      }
    }

    frame.flowState.clearBranch(parent);
    return parent;
  }

  private recordTemplateControllerLink(
    frame: TemplateScopeConstructionFrame,
    sourceController: RuntimeControllerFrame | null,
    sourceInstruction: HydrateTemplateControllerInstruction,
    targetInstruction: HydrateTemplateControllerInstruction,
  ): void {
    const source = sourceController ?? frame.input.runtimeBindings.readControllerForInstruction(sourceInstruction.productHandle);
    const target = frame.input.runtimeBindings.readControllerForInstruction(targetInstruction.productHandle);
    if (source == null || target == null) {
      return;
    }
    frame.addTemplateControllerLink(new TemplateControllerLinkApplication(source, target, sourceInstruction));
  }

  private constructIfNarrowedScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    conditionInstruction: HydrateTemplateControllerInstruction,
    ownerInstruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.store, conditionInstruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const narrowing = ast == null
      ? null
      : this.scopeNarrower.narrow({
        localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
        expression: ast,
        scope: parent,
        polarity,
        sourceAddressHandle: ownerInstruction.sourceAddressHandle,
      } satisfies CheckerExpressionScopeNarrowingRequest);
    if (narrowing == null) {
      return null;
    }
    return this.scopeMaterializer.construct(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? ownerInstruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? ownerInstruction.identityHandle,
      base: parent,
      bindingContextSlots: narrowing.bindingContextSlots,
      overrideContextSlots: narrowing.overrideContextSlots,
      sourceAddressHandle: ownerInstruction.sourceAddressHandle,
    }));
  }

  private constructPromiseResultScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    promiseState: TemplateControllerPromiseState,
    resultKind: TemplateControllerPromiseResultKind,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const target = templateControllerValueTarget(this.store, instruction);
    if (target == null) {
      return null;
    }

    const slotType = resultKind === TemplateControllerPromiseResultKind.Fulfilled
      ? this.promiseFulfilledValueType(input, promiseState, `${localSuffix}:fulfilled`)
      : this.asyncTypeProjector.unknownTypeReference(
        `${input.localKey}:scope:template-controller:${localSuffix}:rejected:unknown`,
        instruction.sourceAddressHandle,
      );

    return this.scopeMaterializer.construct(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}:promise-${resultKind}:${target.name}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      base: parent,
      bindingContextSlots: [
        new BindingContextSlotDraft(
          target.name,
          null,
          null,
          slotType,
          target.sourceAddressHandle ?? instruction.sourceAddressHandle,
        ),
      ],
      overrideContextSlots: [],
      sourceAddressHandle: instruction.sourceAddressHandle,
    }));
  }

  private promiseFulfilledValueType(
    input: TemplateScopeConstructionRequest,
    promiseState: TemplateControllerPromiseState,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const promiseType = this.templateControllerValueType(
      input,
      promiseState.valueScope,
      promiseState.instruction,
      `${localSuffix}:promise-value`,
    );
    if (promiseType == null) {
      return null;
    }

    return this.asyncTypeProjector.awaitedTypeReference(
      promiseType,
      `${input.localKey}:scope:template-controller:${localSuffix}:awaited`,
      promiseState.instruction.sourceAddressHandle,
    );
  }

  private constructWithTemplateControllerScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    return this.constructObjectTemplateControllerScope(
      input,
      parent,
      instruction,
      controller,
      localSuffix,
      this.templateControllerValueType(input, parent, instruction, localSuffix),
    );
  }

  private constructObjectTemplateControllerScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
    contextType: CheckerTypeReference | null,
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.construct(BindingScope.fromParentObject({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}:object`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      contextType,
      sourceAddressHandle: instruction.sourceAddressHandle,
    }));
  }

  private constructScopeEffects(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    ownerProductHandle: ProductHandle,
    localSuffix: string,
  ): BindingScope | null {
    const effects = frame.input.runtimeBindings.readScopeEffectsForOwner(ownerProductHandle);
    if (effects.length === 0) {
      return null;
    }

    let current = parent;
    const letEffects: LetBindingScopeEffect[] = [];
    effects.forEach((effect, index) => {
      if (effect instanceof IteratorBindingScopeEffect) {
        const emission = this.constructIteratorScope(frame.input, current, effect, `${localSuffix}:iterator:${index}`);
        current = frame.addDerivedScope(emission);
      }
      if (effect instanceof LetBindingScopeEffect) {
        letEffects.push(effect);
      }
    });

    if (letEffects.length > 0) {
      const emission = this.constructLetScope(
        frame.input,
        current,
        letEffects,
        `${localSuffix}:let`,
        letEffects[0]?.sourceAddressHandle ?? null,
      );
      current = frame.addDerivedScope(emission);
    }

    return current;
  }

  private constructIteratorScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    const elementType = this.iteratorElementType(input, parent, effect, localSuffix);
    const localTypes = this.iteratorLocalTypes(input, parent, effect, localSuffix);
    return this.scopeMaterializer.construct(BindingScope.fromRepeatedItem({
      localKey: `${input.localKey}:scope:${localSuffix}`,
      ownerProductHandle: effect.productHandle,
      ownerIdentityHandle: effect.identityHandle,
      parent,
      localSlots: effect.localNames.map((name) => new BindingContextSlotDraft(
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
    input: TemplateScopeConstructionRequest,
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
    input: TemplateScopeConstructionRequest,
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
    return this.scopeMaterializer.construct(BindingScope.fromLetBindings({
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
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): BindingContextSlotDraft {
    return new BindingContextSlotDraft(
      effect.target,
      null,
      null,
      this.letTargetType(input, parent, effect),
      effect.sourceAddressHandle,
    );
  }

  private iteratorElementType(
    input: TemplateScopeConstructionRequest,
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
    input: TemplateScopeConstructionRequest,
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
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): CheckerTypeReference | null {
    const parse = this.readParse(effect.expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
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

  private templateControllerValueType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.store, instruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateWithScope(
      ast,
      parent,
      `${input.localKey}:scope:template-controller:${localSuffix}:value`,
      instruction.sourceAddressHandle,
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

  private typeEvaluator(input: TemplateScopeConstructionRequest): CheckerExpressionTypeEvaluator {
    return new CheckerExpressionTypeEvaluator(this.store, this.typeProjector, input.resourceScope);
  }

  private registerControllerDetails(input: TemplateScopeConstructionRequest): void {
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

  private recordsForTemplateControllerLinks(
    localKey: string,
    links: readonly TemplateControllerLinkApplication[],
  ): readonly KernelStoreRecord[] {
    if (links.length === 0) {
      return [];
    }

    const evidenceHandle = this.store.handles.evidence(`template-scope:${localKey}:template-controller-links`);
    const provenanceHandle = this.store.handles.provenance(`template-scope:${localKey}:template-controller-links`);
    const uniqueLinks = uniqueTemplateControllerLinks(links);
    const claims = uniqueLinks.map((link, index) => new SemanticClaim(
      this.store.handles.claim(`template-scope:${localKey}:template-controller-link:${index}`),
      link.sourceController.productHandle,
      KernelVocabulary.Configuration.ControllerLinksTemplateController.key,
      link.targetController.productHandle,
      provenanceHandle,
    ));

    return [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope],
        'Runtime template-controller link hooks connect branch controllers to their controlling template-controller.',
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

function templateControllerValueExpressionProductHandle(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): ProductHandle | null {
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === 'value') {
      return binding.expressionProductHandle;
    }
    if (binding instanceof InterpolationInstruction && binding.target === 'value') {
      return binding.expressionProductHandles[0] ?? null;
    }
  }
  return null;
}

function templateControllerValueTarget(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): TemplateControllerValueTarget | null {
  const productHandle = templateControllerValueExpressionProductHandle(store, instruction);
  const parse = productHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
  const name = expression == null ? null : accessScopeTargetName(expression);
  return name == null
    ? null
    : {
      name,
      sourceAddressHandle: parse?.sourceAddressHandle ?? null,
    };
}

function accessScopeTargetName(expression: ExpressionAstNode): string | null {
  if (expression.$kind === 'AccessScope' && expression.ancestor === 0) {
    return expression.name.name;
  }
  return expression.$kind === 'Paren'
    ? accessScopeTargetName(expression.expression)
    : null;
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

function uniqueTemplateControllerLinks(
  links: readonly TemplateControllerLinkApplication[],
): readonly TemplateControllerLinkApplication[] {
  const seen = new Set<string>();
  const unique: TemplateControllerLinkApplication[] = [];
  for (const link of links) {
    const key = `${link.sourceController.productHandle}->${link.targetController.productHandle}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(link);
  }
  return unique;
}

function repeatOverrideSlots(
  input: TemplateScopeConstructionRequest,
  projector: CheckerTypeProjector,
  sourceAddressHandle: AddressHandle | null,
  elementType: CheckerTypeReference | null,
): readonly BindingContextSlotDraft[] {
  return [
    new BindingContextSlotDraft('$index', null, null, primitiveReference(input, projector, 'number', '$index', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$odd', null, null, primitiveReference(input, projector, 'boolean', '$odd', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$even', null, null, primitiveReference(input, projector, 'boolean', '$even', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$first', null, null, primitiveReference(input, projector, 'boolean', '$first', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$middle', null, null, primitiveReference(input, projector, 'boolean', '$middle', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$last', null, null, primitiveReference(input, projector, 'boolean', '$last', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$length', null, null, primitiveReference(input, projector, 'number', '$length', sourceAddressHandle), sourceAddressHandle),
    new BindingContextSlotDraft('$previous', null, null, elementType, sourceAddressHandle),
  ];
}

function elementTypeForFlattenedIteratorName(
  names: readonly string[],
  elementType: CheckerTypeReference | null,
): CheckerTypeReference | null {
  return names.length === 1 ? elementType : null;
}

function primitiveReference(
  input: TemplateScopeConstructionRequest,
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
  return projector.ensureProjection({
    localKey: `${input.localKey}:scope:repeat-context:${name}`,
    checker,
    type,
    origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
    sourceAddressHandle,
    display: primitive,
  } satisfies CheckerTypeProjectionRequest).toReference();
}
