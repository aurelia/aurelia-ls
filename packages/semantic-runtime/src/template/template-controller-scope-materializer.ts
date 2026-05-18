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
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { RuntimeBindingSourceValueEvaluator } from '../observation/binding-source-value-evaluator.js';
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
import {
  BindableBindingMode,
  type BindableDefinition,
} from '../resources/bindable-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import {
  CheckerExpressionScopeNarrower,
} from '../type-system/expression-scope-narrower.js';
import {
  type CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import {
  type CheckerTypeMember,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import type { TemplateResourceScope } from './compiler-world.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  DispatchBindingInstruction,
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  SpreadElementPropBindingInstruction,
  StateBindingInstruction,
  TemplateBindingMode,
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
import {
  completedTemplateExpressionAstForParse,
} from './expression-parse-projection.js';
import {
  TemplateControllerFlowState,
} from './template-controller-flow-state.js';
import {
  accessScopeTargetName,
} from './template-controller-value.js';
import { TemplateScopeTypeProjector } from './template-scope-type-projector.js';
import { repeatStaticLocalValue } from './repeat-static-value.js';
import { TemplateControllerFlowScopeMaterializer } from './template-controller-flow-scope-materializer.js';
import {
  RuntimeBindingScopeIssue,
  RuntimeBindingScopeIssueCertainty,
  RuntimeBindingScopeIssueKind,
  RuntimeBindingScopeIssuePhase,
  RuntimeBindingScopeIssuePublisher,
  type RuntimeBindingScopeIssuePublication,
} from './runtime-binding-scope-issue.js';
import {
  CheckerBindingPatternRuntimeIssueCertainty,
  CheckerBindingPatternRuntimeIssueKind,
} from '../type-system/binding-pattern-locals.js';
import { RuntimeAstFrameworkErrorCode } from '../type-system/framework-error-code.js';
import { RuntimeHtmlControllerFrameworkErrorCode } from './framework-error-code.js';
import {
  measureSemanticRuntimePhase,
  type SemanticRuntimePhaseSink,
} from '../telemetry/phase.js';
import { StateBindingScopeProjector } from '../state/state-binding-scope.js';

type TemplateScopeConstructionFinePhaseName =
  | 'root-scope'
  | 'render-targets'
  | 'surrogate-sequence'
  | 'render-target-sequences'
  | 'instruction-expression-scope'
  | 'instruction-scope'
  | 'owned-binding-instruction-scopes'
  | 'listener-event-scope'
  | 'state-binding-command-scope'
  | 'state-dispatch-event-scope'
  | 'template-controller-scope'
  | 'template-controller-child-sequence'
  | 'runtime-assignment-scope'
  | 'child-element-scope'
  | 'scope-effects'
  | 'iterator-scope'
  | 'iterator-type-projection'
  | 'iterator-repeatable-issues'
  | 'iterator-local-issues'
  | 'iterator-local-slots'
  | 'iterator-override-slots'
  | 'iterator-scope-prepare'
  | 'let-scope'
  | 'dynamic-instruction-scopes'
  | 'controller-details'
  | 'commit';

export interface TemplateScopeConstructionRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Custom element definition whose view-model owns the root template scope. */
  readonly definition: CustomElementDefinition;
  /** Compiled-template rows whose instructions and targets describe the render frontier. */
  readonly compiledTemplate: CompiledTemplateEmission;
  /** Runtime binding instances and scope effects emulated from renderer semantics. */
  readonly runtimeBindings: RuntimeRenderingEmission;
  /** Project-level runtime-analysis context for controller/resource lookups owned by adjacent runtime phases. */
  readonly projectContext: TemplateRuntimeAnalysisProjectContext;
  /** Shared static evaluation available for runtime Scope value carriers. */
  readonly evaluation: StaticProjectEvaluationResult | null;
  /** Current TypeChecker epoch, if resource recognition supplied one. */
  readonly typeSystem: TypeSystemProject | null;
  /** Compiler resource scope visible to expression semantics such as value converters. */
  readonly resourceScope: TemplateResourceScope | null;
  /** Runtime-analysis expression world shared by scope, observation, and data-flow phases. */
  readonly expressionWorld: CheckerExpressionTypeWorld;
  /** Optional fine-grained telemetry sink owned by the surrounding inquiry profile. */
  readonly profiling?: SemanticRuntimePhaseSink | null;
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
    /** Runtime binding scope issues discovered while spending scope effects. */
    readonly scopeIssues: readonly RuntimeBindingScopeIssue[],
    /** Kernel records that publish runtime binding scope issue products. */
    readonly scopeIssueRecords: readonly KernelStoreRecord[],
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

export interface TemplateInstructionScopeApplication {
  /** Instruction whose expression-owned work observes this scope. */
  readonly instructionProductHandle: ProductHandle;
  /** Runtime Scope visible to that instruction before the instruction mutates later scope state. */
  readonly scope: BindingScope;
}

export interface TemplateControllerLinkApplication {
  /** Template-controller controller whose link hook attached it to another template-controller. */
  readonly sourceController: RuntimeControllerFrame;
  /** Template-controller controller that receives the source branch/controller. */
  readonly targetController: RuntimeControllerFrame;
  /** Instruction whose link hook produced this relationship. */
  readonly sourceInstruction: HydrateTemplateControllerInstruction;
}

export class TemplateScopeConstructionFrame {
  readonly scopeEmissions: BindingScopeConstructionEmission[];
  readonly derivedScopes: BindingScope[] = [];
  readonly instructionScopes: TemplateInstructionScopeApplication[] = [];
  readonly templateControllerLinks: TemplateControllerLinkApplication[] = [];
  readonly scopeIssues: RuntimeBindingScopeIssue[] = [];
  readonly scopeIssueRecords: KernelStoreRecord[] = [];
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
    const compiledTemplates = uniqueCompiledTemplateEmissions([
      input.compiledTemplate,
      ...input.projectContext.readCompiledTemplateEmissions(),
    ]);
    return new TemplateScopeConstructionFrame(
      input,
      root,
      new Map(compiledTemplates.flatMap((compiledTemplate) =>
        compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence] as const)
      )),
      new Map([
        ...compiledTemplates.flatMap((compiledTemplate) =>
          compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction] as const)
        ),
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
    this.instructionScopes.push({ instructionProductHandle, scope });
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

  addScopeIssue(publication: RuntimeBindingScopeIssuePublication): void {
    if (this.scopeIssues.some((issue) => issue.productHandle === publication.issue.productHandle)) {
      return;
    }
    this.scopeIssues.push(publication.issue);
    this.scopeIssueRecords.push(...publication.records);
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
      this.scopeIssues,
      this.scopeIssueRecords,
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
  private readonly scopeNarrower: CheckerExpressionScopeNarrower;
  private readonly typeSupport: TemplateScopeTypeProjector;
  private readonly controllerFlow: TemplateControllerFlowScopeMaterializer;
  private readonly scopeIssuePublisher: RuntimeBindingScopeIssuePublisher;

  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {
    this.scopeMaterializer = new BindingScopeMaterializer(store);
    this.typeProjector = new CheckerTypeProjector(store);
    this.scopeNarrower = new CheckerExpressionScopeNarrower(store, this.typeProjector);
    this.typeSupport = new TemplateScopeTypeProjector(store, this.typeProjector);
    this.scopeIssuePublisher = new RuntimeBindingScopeIssuePublisher(store);
    this.controllerFlow = new TemplateControllerFlowScopeMaterializer(
      store,
      this.scopeMaterializer,
      this.scopeNarrower,
      this.typeSupport,
      this.constructScopeEffects.bind(this),
    );
  }

  construct(input: TemplateScopeConstructionRequest): TemplateScopeConstructionEmission {
    const root = this.measure(input, 'root-scope', () => this.constructRootScope(input));
    input.runtimeBindings.rootController.attachScope(root.scope.toReference());
    const frame = TemplateScopeConstructionFrame.create(input, root);
    this.measure(input, 'render-targets', () => this.constructRenderTargets(frame));
    this.measure(input, 'dynamic-instruction-scopes', () => this.captureDynamicInstructionScopes(frame));
    this.measure(input, 'controller-details', () => this.registerControllerDetails(input));
    return this.measure(input, 'commit', () => this.commitScopeConstruction(frame));
  }

  private constructRenderTargets(frame: TemplateScopeConstructionFrame): void {
    frame.currentScope = this.constructCompiledTemplateScopes(
      frame,
      frame.input.compiledTemplate,
      frame.currentScope,
      '',
      frame.input.runtimeBindings.rootController,
    );
  }

  private constructCompiledTemplateScopes(
    frame: TemplateScopeConstructionFrame,
    compiledTemplate: CompiledTemplateEmission,
    initialScope: BindingScope,
    localPrefix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope {
    let currentScope = initialScope;
    const surrogateSequence = this.measure(frame.input, 'surrogate-sequence', () =>
      this.constructSurrogateSequence(frame, compiledTemplate, currentScope, localPrefix, controllerContext)
    );
    if (surrogateSequence != null) {
      currentScope = surrogateSequence;
    }
    return this.measure(frame.input, 'render-target-sequences', () => {
      compiledTemplate.renderTargets.forEach((target, targetIndex) => {
        const sequence = frame.readSequence(target.instructionSequenceProductHandle);
        if (sequence == null) {
          return;
        }
        currentScope = this.constructInstructionSequence(
          frame,
          currentScope,
          sequence,
          localPrefix === '' ? `target:${targetIndex}` : `${localPrefix}:target:${targetIndex}`,
          controllerContext,
        );
      });
      return currentScope;
    });
  }

  private constructSurrogateSequence(
    frame: TemplateScopeConstructionFrame,
    compiledTemplate: CompiledTemplateEmission,
    currentScope: BindingScope,
    localPrefix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope | null {
    const sequence = compiledTemplate.compiledTemplate.surrogateSequence;
    if (sequence == null) {
      return null;
    }
    return this.constructInstructionSequence(
      frame,
      currentScope,
      sequence,
      localPrefix === '' ? 'surrogate' : `${localPrefix}:surrogate`,
      controllerContext,
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
    this.scopeMaterializer.publish(
      frame.scopeEmissions,
      `template-scope:${frame.input.localKey}:binding-scopes`,
    );
    if (instructionScopeRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(instructionScopeRecords, `template-scope:${frame.input.localKey}:instruction-scopes`));
    }
    if (templateControllerLinkRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(templateControllerLinkRecords, `template-scope:${frame.input.localKey}:template-controller-links`));
    }
    if (frame.scopeIssueRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(frame.scopeIssueRecords, `template-scope:${frame.input.localKey}:scope-issues`));
      for (const issue of frame.scopeIssues) {
        this.store.productDetails.add(TemplateProductDetails.RuntimeBindingScopeIssue, issue.productHandle, issue);
      }
    }
    return frame.toEmission(instructionScopeRecords, templateControllerLinkRecords);
  }

  private constructInstructionSequence(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    sequence: TemplateInstructionSequence,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope {
    let current = parent;
    sequence.instructions.forEach((reference, index) => {
      const instruction = frame.readInstruction(reference.productHandle);
      if (instruction == null) {
        return;
      }
      frame.addInstructionScope(
        instruction.productHandle,
        this.measure(frame.input, 'instruction-expression-scope', () =>
          this.constructInstructionExpressionScope(frame, current, instruction, `${localSuffix}:instruction:${index}:expression`)
        ),
      );
      current = this.measure(
        frame.input,
        'instruction-scope',
        () => this.constructInstructionScope(
          frame,
          current,
          instruction,
          `${localSuffix}:instruction:${index}`,
          controllerContext,
        ),
      );
    });
    return current;
  }

  private constructInstructionScope(
    frame: TemplateScopeConstructionFrame,
    currentScope: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope {
    this.measure(frame.input, 'owned-binding-instruction-scopes', () =>
      this.recordOwnedBindingInstructionScopes(instruction, currentScope, frame, localSuffix)
    );

    if (instruction instanceof HydrateLetElementInstruction) {
      const emission = this.constructLetElementScope(frame.input, currentScope, instruction, localSuffix);
      if (emission == null) {
        return currentScope;
      }
      return frame.addDerivedScope(emission);
    }

    if (instruction instanceof HydrateTemplateControllerInstruction) {
      this.measure(frame.input, 'template-controller-scope', () =>
        this.constructTemplateControllerInstructionScope(frame, currentScope, instruction, localSuffix, controllerContext)
      );
      return currentScope;
    }

    const nextScope = this.measure(
      frame.input,
      'scope-effects',
      () => this.constructScopeEffects(
        frame,
        currentScope,
        instruction.productHandle,
        localSuffix,
      ),
    );
    if (nextScope != null) {
      frame.flowState.clearBranch(currentScope);
      return nextScope;
    }

    if (instruction instanceof HydrateElementInstruction) {
      frame.flowState.clearBranch(currentScope);
      const emission = this.measure(frame.input, 'child-element-scope', () =>
        this.constructChildElementScope(frame, currentScope, instruction, localSuffix, controllerContext)
      );
      if (emission != null) {
        const childScope = frame.addDerivedScope(emission);
        this.constructCustomElementChildTemplateScopes(frame, childScope, instruction, localSuffix, controllerContext);
      }
    }

    const assignmentScope = this.measure(frame.input, 'runtime-assignment-scope', () =>
      this.constructRuntimeAssignmentScope(frame, currentScope, instruction, localSuffix)
    );
    if (assignmentScope != null) {
      frame.flowState.clearBranch(currentScope);
      return frame.addDerivedScope(assignmentScope);
    }

    frame.flowState.clearBranch(currentScope);
    return currentScope;
  }

  private constructTemplateControllerInstructionScope(
    frame: TemplateScopeConstructionFrame,
    currentScope: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): void {
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    controller?.attachScope(currentScope.toReference());
    const childScope = this.controllerFlow.constructChildScope(
      frame,
      currentScope,
      instruction,
      controller,
      localSuffix,
    );
    const syntheticController = this.attachSyntheticTemplateControllerScope(frame, instruction, childScope, controller);
    this.constructTemplateControllerChildInstructionSequence(frame, instruction, childScope, localSuffix, syntheticController);
    this.controllerFlow.finishFlowState(frame, instruction, childScope);
  }

  private attachSyntheticTemplateControllerScope(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    childScope: BindingScope,
    controller: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    const syntheticController = frame.input.runtimeBindings.readSyntheticControllerForTemplateControllerUnderOwner(
      instruction.productHandle,
      controller,
    );
    syntheticController?.attachScope(childScope.toReference());
    return syntheticController;
  }

  private constructTemplateControllerChildInstructionSequence(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    childScope: BindingScope,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): void {
    const childSequence = frame.readSequence(instruction.childInstructionSequenceProductHandle);
    if (childSequence == null) {
      return;
    }
    this.measure(frame.input, 'template-controller-child-sequence', () =>
      this.constructInstructionSequence(
        frame,
        childScope,
        childSequence,
        `${localSuffix}:child-sequence`,
        controllerContext,
      )
    );
  }

  private constructRootScope(input: TemplateScopeConstructionRequest): BindingScopeConstructionEmission {
    return this.scopeMaterializer.prepare(DryCustomElementController.createBindingScopeInput({
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
    localSuffix: string,
  ): void {
    ownedBindingInstructionProductHandles(instruction).forEach((productHandle, index) => {
      const childInstruction = frame.readInstruction(productHandle);
      if (childInstruction == null) {
        return;
      }
      frame.addInstructionScope(
        childInstruction.productHandle,
        this.constructInstructionExpressionScope(frame, scope, childInstruction, `${localSuffix}:owned:${index}:expression`),
      );
    });
  }

  private constructInstructionExpressionScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
  ): BindingScope {
    if (instruction instanceof StateBindingInstruction) {
      return this.constructStateBindingCommandScope(frame, base, instruction, localSuffix);
    }

    if (instruction instanceof DispatchBindingInstruction) {
      const stateScope = this.constructStateBindingCommandScope(frame, base, instruction, localSuffix);
      const emission = this.measure(frame.input, 'state-dispatch-event-scope', () =>
        this.constructListenerEventScope(frame.input, stateScope, instruction, localSuffix)
      );
      return frame.addDerivedScope(emission);
    }

    if (instruction instanceof ListenerBindingInstruction) {
      const emission = this.measure(frame.input, 'listener-event-scope', () =>
        this.constructListenerEventScope(frame.input, base, instruction, localSuffix)
      );
      return frame.addDerivedScope(emission);
    }

    return base;
  }

  private constructStateBindingCommandScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    instruction: StateBindingInstruction | DispatchBindingInstruction,
    localSuffix: string,
  ): BindingScope {
    const projection = this.measure(frame.input, 'state-binding-command-scope', () =>
      new StateBindingScopeProjector(this.store, frame.input.expressionWorld.stateStores).scopeForStoreName(
        instruction.storeName,
        base,
        `${frame.input.localKey}:scope:${localSuffix}:state-command`,
        instruction.sourceAddressHandle,
        instruction.productHandle,
        instruction.identityHandle,
        [instruction.productHandle],
      )
    );
    return projection.emission == null
      ? base
      : frame.addDerivedScope(projection.emission);
  }

  private constructListenerEventScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: ListenerBindingInstruction | DispatchBindingInstruction,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:${localSuffix}:listener-event`,
      ownerProductHandle: instruction.productHandle,
      ownerIdentityHandle: instruction.identityHandle,
      base: parent,
      bindingContextSlots: [],
      overrideContextSlots: [this.typeSupport.listenerEventSlot(input, instruction, localSuffix)],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeEffectOwnerProductHandles: [instruction.productHandle],
    }));
  }

  private constructRuntimeAssignmentScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const slots = this.runtimeAssignmentSlots(frame, parent, instruction);
    if (slots.length === 0) {
      return null;
    }
    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment`,
      ownerProductHandle: instruction.productHandle,
      ownerIdentityHandle: instruction.identityHandle,
      base: parent,
      bindingContextSlots: slots,
      overrideContextSlots: [],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeEffectOwnerProductHandles: [instruction.productHandle],
    }));
  }

  private runtimeAssignmentSlots(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: TemplateInstruction,
  ): readonly BindingContextSlotDraft[] {
    const bindables = bindablesForInstruction(this.store, instruction);
    if (bindables.length === 0) {
      return [];
    }

    const slots: BindingContextSlotDraft[] = [];
    for (const productHandle of bindableInstructionProductHandles(instruction)) {
      const binding = frame.readInstruction(productHandle);
      if (!(binding instanceof PropertyBindingInstruction) || !bindingCanAssignToSource(binding, bindables)) {
        continue;
      }
      const parse = this.typeSupport.readParse(binding.expressionProductHandle);
      const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
      const name = expression == null ? null : accessScopeTargetName(expression);
      if (name == null || parent.lookup(name, 0).slot != null) {
        continue;
      }
      const targetMember = runtimeAssignmentTargetMember(this.store, instruction, binding, bindables);
      slots.push(new BindingContextSlotDraft(
        name,
        null,
        targetMember?.productHandle ?? null,
        targetMember?.valueType ?? null,
        parse?.sourceAddressHandle ?? binding.sourceAddressHandle,
      ));
    }
    return slots;
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
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateElementInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScopeConstructionEmission | null {
    const definition = instruction.definitionProductHandle == null
      ? null
      : this.store.productDetails.read(ResourceProductDetails.Definition, instruction.definitionProductHandle);
    if (!(definition instanceof CustomElementDefinition)) {
      return null;
    }
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    const emission = this.scopeMaterializer.prepare(DryCustomElementController.createBindingScopeInput({
      localKey: `${frame.input.localKey}:scope:hydrate-element:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      viewModelType: definition.target.targetType,
      sourceAddressHandle: instruction.sourceAddressHandle,
    }));
    controller?.attachScope(emission.scope.toReference());
    return emission;
  }

  private constructCustomElementChildTemplateScopes(
    frame: TemplateScopeConstructionFrame,
    childScope: BindingScope,
    instruction: HydrateElementInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): void {
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    const compiledTemplate = frame.input.projectContext.readCompiledTemplateEmissionForDefinition(
      controller?.definitionProductHandle ?? instruction.definitionProductHandle,
    );
    if (compiledTemplate == null || this.hasRecursiveCustomElementDefinitionAncestor(controller)) {
      return;
    }
    this.constructCompiledTemplateScopes(
      frame,
      compiledTemplate,
      childScope,
      `${localSuffix}:custom-element-view`,
      controller,
    );
  }

  private hasRecursiveCustomElementDefinitionAncestor(
    controller: RuntimeControllerFrame | null,
  ): boolean {
    if (controller == null || controller.definitionProductHandle == null) {
      return false;
    }
    const definitionProductHandle = controller.definitionProductHandle;
    let current = controller.parent;
    while (current != null) {
      if (current.definitionProductHandle === definitionProductHandle) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private measure<TValue>(
    input: TemplateScopeConstructionRequest,
    name: TemplateScopeConstructionFinePhaseName,
    read: () => TValue,
  ): TValue {
    const profiling = input.profiling;
    if (profiling == null || !profiling.telemetry.captureFineGrainedPhases) {
      return read();
    }
    return measureSemanticRuntimePhase(
      profiling.phases,
      `scope-construction:${name}`,
      this.store,
      profiling.telemetry,
      read,
    );
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
        const emission = this.measure(frame.input, 'iterator-scope', () =>
          this.constructIteratorScope(frame, current, effect, `${localSuffix}:iterator:${index}`)
        );
        current = frame.addDerivedScope(emission);
      }
      if (effect instanceof LetBindingScopeEffect) {
        letEffects.push(effect);
      }
    });

    if (letEffects.length > 0) {
      const emission = this.measure(
        frame.input,
        'let-scope',
        () => this.constructLetScope(
          frame.input,
          current,
          letEffects,
          `${localSuffix}:let`,
          letEffects[0]?.sourceAddressHandle ?? null,
        ),
      );
      current = frame.addDerivedScope(emission);
    }

    return current;
  }

  private constructIteratorScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    const input = frame.input;
    const sourceValueEvaluator = input.evaluation == null
      ? null
      : new RuntimeBindingSourceValueEvaluator(this.store, input.evaluation);
    const iteratorProjection = this.measure(input, 'iterator-type-projection', () =>
      this.typeSupport.iteratorProjection(input, parent, effect, localSuffix)
    );
    const elementType = iteratorProjection.elementType;
    const localProjection = iteratorProjection.localProjection;
    const localTypes = new Map(localProjection.locals.map((local) => [local.name, local]));
    const iteratorParse = iteratorProjection.parse;
    const repeatableIssue = iteratorProjection.repeatableIssue;
    this.measure(input, 'iterator-repeatable-issues', () => {
      if (repeatableIssue == null) {
        return;
      }
      frame.addScopeIssue(this.scopeIssuePublisher.publish(
        `${input.localKey}:scope:${localSuffix}:repeatable-issue`,
        effect.productHandle,
        effect.identityHandle,
        RuntimeBindingScopeIssuePhase.IteratorSourceProjection,
        RuntimeBindingScopeIssueKind.RepeatNonIterable,
        repeatableIssue.certainty === 'definite'
          ? RuntimeBindingScopeIssueCertainty.Definite
          : RuntimeBindingScopeIssueCertainty.Possible,
        repeatableIssue.summary,
        RuntimeHtmlControllerFrameworkErrorCode.RepeatNonIterable,
        effect.sourceAddressHandle,
        repeatableIssue.sourceSpan,
        repeatableIssue.sourceType,
      ));
    });
    this.measure(input, 'iterator-local-issues', () => {
      localProjection.runtimeIssues.forEach((issue, index) => {
        frame.addScopeIssue(this.scopeIssuePublisher.publish(
          `${input.localKey}:scope:${localSuffix}:issue:${index}`,
          effect.productHandle,
          effect.identityHandle,
          RuntimeBindingScopeIssuePhase.IteratorLocalProjection,
          runtimeScopeIssueKind(issue.issueKind),
          runtimeScopeIssueCertainty(issue.certainty),
          issue.summary,
          RuntimeAstFrameworkErrorCode.AstDestructNull,
          effect.sourceAddressHandle,
          issue.patternSpan,
          issue.sourceType,
        ));
      });
    });
    const localSlots = this.measure(input, 'iterator-local-slots', () =>
      effect.localNames.map((name) => new BindingContextSlotDraft(
        name,
        null,
        null,
        localTypes.has(name)
          ? localTypes.get(name)?.typeReference ?? null
          : elementTypeForFlattenedIteratorName(effect.localNames, elementType),
        effect.sourceAddressHandle,
        [],
        repeatStaticLocalValue(iteratorParse, parent, effect, name, sourceValueEvaluator),
      ))
    );
    const overrideSlots = this.measure(input, 'iterator-override-slots', () =>
      this.typeSupport.repeatOverrideSlots(input, effect.sourceAddressHandle, elementType)
    );
    return this.measure(input, 'iterator-scope-prepare', () => this.scopeMaterializer.prepare(BindingScope.fromRepeatedItem({
      localKey: `${input.localKey}:scope:${localSuffix}`,
      ownerProductHandle: effect.productHandle,
      ownerIdentityHandle: effect.identityHandle,
      parent,
      localSlots,
      overrideSlots,
      sourceAddressHandle: effect.sourceAddressHandle,
      scopeEffectOwnerProductHandles: [effect.productHandle],
    })));
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
    return this.scopeMaterializer.prepare(BindingScope.fromLetBindings({
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
      this.typeSupport.letTargetType(input, parent, effect),
      effect.sourceAddressHandle,
    );
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

function bindableInstructionProductHandles(
  instruction: TemplateInstruction,
): readonly ProductHandle[] {
  if (instruction instanceof HydrateElementInstruction) {
    return instruction.bindableInstructionProductHandles;
  }
  if (instruction instanceof HydrateAttributeInstruction) {
    return instruction.bindingInstructionProductHandles;
  }
  return [];
}

function bindablesForInstruction(
  store: KernelStore,
  instruction: TemplateInstruction,
): readonly BindableDefinition[] {
  if (!(instruction instanceof HydrateElementInstruction) && !(instruction instanceof HydrateAttributeInstruction)) {
    return [];
  }
  const definition = instruction.definitionProductHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, instruction.definitionProductHandle);
  return definition != null && 'bindables' in definition
    ? definition.bindables
    : [];
}

function bindingCanAssignToSource(
  binding: PropertyBindingInstruction,
  bindables: readonly BindableDefinition[],
): boolean {
  if (binding.bindingMode === TemplateBindingMode.FromView || binding.bindingMode === TemplateBindingMode.TwoWay) {
    return true;
  }
  const bindable = bindables.find((candidate) => candidate.name === binding.targetProperty) ?? null;
  return bindable?.mode === BindableBindingMode.FromView || bindable?.mode === BindableBindingMode.TwoWay;
}

function runtimeAssignmentTargetMember(
  store: KernelStore,
  instruction: TemplateInstruction,
  binding: PropertyBindingInstruction,
  bindables: readonly BindableDefinition[],
): CheckerTypeMember | null {
  const bindable = bindables.find((candidate) => candidate.name === binding.targetProperty) ?? null;
  return bindable == null
    ? null
    : bindableTargetMember(store, instruction, bindable);
}

function bindableTargetMember(
  store: KernelStore,
  instruction: TemplateInstruction,
  bindable: BindableDefinition,
): CheckerTypeMember | null {
  if (!(instruction instanceof HydrateElementInstruction) && !(instruction instanceof HydrateAttributeInstruction)) {
    return null;
  }
  const definition = instruction.definitionProductHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, instruction.definitionProductHandle);
  const targetTypeProductHandle = definition?.target.targetType?.productHandle ?? null;
  if (targetTypeProductHandle == null) {
    return null;
  }
  const targetType = store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  return targetType?.members.find((member) => member.name === bindable.name) ?? null;
}

function uniqueCompiledTemplateEmissions(
  emissions: readonly CompiledTemplateEmission[],
): readonly CompiledTemplateEmission[] {
  const seen = new Set<ProductHandle>();
  const unique: CompiledTemplateEmission[] = [];
  for (const emission of emissions) {
    if (seen.has(emission.compiledTemplate.productHandle)) {
      continue;
    }
    seen.add(emission.compiledTemplate.productHandle);
    unique.push(emission);
  }
  return unique;
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

function runtimeScopeIssueKind(
  kind: CheckerBindingPatternRuntimeIssueKind,
): RuntimeBindingScopeIssueKind {
  switch (kind) {
    case CheckerBindingPatternRuntimeIssueKind.ArrayRestNonArray:
      return RuntimeBindingScopeIssueKind.ArrayRestNonArray;
    case CheckerBindingPatternRuntimeIssueKind.DestructuringNonObject:
      return RuntimeBindingScopeIssueKind.DestructuringNonObject;
  }
}

function runtimeScopeIssueCertainty(
  certainty: CheckerBindingPatternRuntimeIssueCertainty,
): RuntimeBindingScopeIssueCertainty {
  switch (certainty) {
    case CheckerBindingPatternRuntimeIssueCertainty.Definite:
      return RuntimeBindingScopeIssueCertainty.Definite;
    case CheckerBindingPatternRuntimeIssueCertainty.Possible:
      return RuntimeBindingScopeIssueCertainty.Possible;
  }
}

function elementTypeForFlattenedIteratorName(
  names: readonly string[],
  elementType: CheckerTypeReference | null,
): CheckerTypeReference | null {
  return names.length === 1 ? elementType : null;
}
