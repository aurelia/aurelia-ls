import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  BindingScopeCreator,
  BindingScopeCreatorKind,
  BindingContextSlotDraft,
  BindingScope,
} from '../configuration/scope.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { Container } from '../di/container.js';
import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  RuntimeBindingSourceValueEvaluationKind,
} from '../observation/binding-source-value-evaluation.js';
import {
  projectRuntimeBindingSourceValueContextInScope,
  type RuntimeBindingSourceValueContextProjection,
} from '../observation/binding-source-value-evaluation-context.js';
import type { RuntimeBindingSourceActivationContext } from '../observation/binding-source-activation-context.js';
import {
  expressionProductHandleForBinding,
  isRuntimeExpressionBinding,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from '../observation/runtime-binding-expression-scope.js';
import {
  type RuntimeBindingSourceExpressionContextProjection,
  RuntimeBindingSourceExpressionProjectionKind,
  checkerContextForRuntimeBindingSourceExpressionProjection,
  projectRuntimeBindingSourceExpressionInScope,
  projectRuntimeSourceExpressionWithLifecycle,
} from '../observation/runtime-binding-source-expression-context.js';
import type {
  RuntimeBoundControllerPropertyValue,
  RuntimeBoundControllerValueTable,
} from '../observation/runtime-bound-controller-value.js';
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
  type BindableDefinition,
} from '../resources/bindable-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import {
  CheckerExpressionScopeNarrower,
} from '../type-system/expression-scope-narrower.js';
import {
  type CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import {
  CheckerTypeProjectionOrigin,
  sameCheckerTypeReference,
  type CheckerTypeMember,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import {
  bindingContextSlotDraftForExpressionAccess,
} from '../configuration/binding-scope-slot-projector.js';
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
import { readTemplateExpressionParse } from './expression-parse-product.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
  LetBindingTargetContext,
} from './runtime-binding.js';
import {
  bindingExpressionAstForParse,
  completedTemplateExpressionAstForParse,
} from './expression-parse-projection.js';
import { runtimeAssignmentTargetAstForExpression } from '../expression/runtime-assignment.js';
import { projectRuntimeAssignmentValueConverterWriteback } from '../type-system/value-converter-writeback.js';
import {
  TemplateControllerFlowState,
} from './template-controller-flow-state.js';
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
import {
  effectiveTemplateBindingMode,
  templateBindingModeIncludesTargetToSource,
} from './runtime-binding-mode-behavior.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';

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

interface BoundControllerSourceExpressionSite {
  readonly projection: RuntimeBindingSourceExpressionContextProjection | null;
}

type IteratorScopeProjection = ReturnType<TemplateScopeTypeProjector['iteratorProjection']>;

interface IteratorScopeMaterializationFrame {
  readonly input: TemplateScopeConstructionRequest;
  readonly parent: BindingScope;
  readonly effect: IteratorBindingScopeEffect;
  readonly localSuffix: string;
  readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null;
  readonly binding: RuntimeExpressionBinding | null;
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  readonly iteratorProjection: IteratorScopeProjection;
  readonly localTypes: ReadonlyMap<string, CheckerTypeReference | null>;
}

interface LetStaticValueEvaluationFrame {
  readonly input: TemplateScopeConstructionRequest;
  readonly effect: LetBindingScopeEffect;
  readonly targetType: CheckerTypeReference | null;
  readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator;
  readonly contextProjection: RuntimeBindingSourceValueContextProjection;
}

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
  /** Project-level parent-to-child bindable value table shared with binding-source value reduction. */
  readonly boundControllerValues?: RuntimeBoundControllerValueTable;
  /** App-world DI activation facts available to source-value evaluation. */
  readonly sourceValueActivationContext?: RuntimeBindingSourceActivationContext | null;
  /** Container that activates the root resource view model for source-value reads in this template. */
  readonly sourceValueDefaultContainer?: Container | null;
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
  /** Controller context that rendered or owns this application, when runtime rendering made it concrete. */
  readonly controllerProductHandle: ProductHandle | null;
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

interface DynamicCapturedAttributeContext {
  readonly instructionProductHandle: ProductHandle;
  readonly controllerProductHandle: ProductHandle;
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

  addInstructionScope(
    instructionProductHandle: ProductHandle,
    scope: BindingScope,
    controllerProductHandle: ProductHandle | null,
  ): void {
    this.instructionScopes.push({ instructionProductHandle, controllerProductHandle, scope });
  }

  hasInstructionScope(instructionProductHandle: ProductHandle): boolean {
    return this.instructionScopes.some((application) => application.instructionProductHandle === instructionProductHandle);
  }

  addDerivedScope(emission: BindingScopeConstructionEmission): BindingScope {
    this.scopeEmissions.push(emission);
    this.derivedScopes.push(emission.scope);
    return emission.scope;
  }

  readScopes(): readonly BindingScope[] {
    return [
      this.root.scope,
      ...this.derivedScopes,
    ];
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
      const capturedContext = this.capturedAttributeContextForDynamicInstruction(instruction.productHandle);
      if (capturedContext == null) {
        continue;
      }
      const capturedScope = this.capturedAttributeSourceScope(frame, capturedContext);
      if (capturedScope == null) {
        continue;
      }
      frame.addInstructionScope(
        instruction.productHandle,
        capturedScope,
        capturedContext.controllerProductHandle,
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
          this.constructInstructionExpressionScope(frame, current, instruction, `${localSuffix}:instruction:${index}:expression`, controllerContext)
        ),
        controllerContext?.productHandle ?? null,
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
      this.recordOwnedBindingInstructionScopes(instruction, currentScope, frame, localSuffix, controllerContext)
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
      this.constructRuntimeAssignmentScope(frame, currentScope, instruction, localSuffix, controllerContext)
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
      bindingContextSlots: this.boundControllerBindingContextSlots(
        input,
        input.runtimeBindings.rootController.productHandle,
        input.definition.target.targetType,
      ),
      sourceAddressHandle: input.definition.sourceAddressHandle,
    }));
  }

  private boundControllerBindingContextSlots(
    input: TemplateScopeConstructionRequest,
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null,
  ): readonly BindingContextSlotDraft[] {
    return input.boundControllerValues?.readAll(controllerProductHandle, contextType)
      .flatMap((value) => this.boundControllerBindingContextSlot(input, value)) ?? [];
  }

  private boundControllerBindingContextSlot(
    input: TemplateScopeConstructionRequest,
    value: RuntimeBoundControllerPropertyValue,
  ): readonly BindingContextSlotDraft[] {
    if (value.expressionProductHandle == null || value.sourceScope == null) {
      return [];
    }
    const parse = readTemplateExpressionParse(this.store, value.expressionProductHandle);
    const expression = parse == null ? null : bindingExpressionAstForParse(parse);
    if (expression == null) {
      return [];
    }
    const sourceSite = this.boundControllerSourceExpressionSite(input, expression, value, value.sourceAddressHandle);
    const sourceSlot = sourceSite.projection == null
      ? null
      : bindingContextSlotDraftForExpressionAccess(
        this.store,
        this.typeProjector,
        sourceSite.projection.scope,
        sourceSite.projection.expression,
        `${input.localKey}:bound-controller:${value.propertyName}:source-slot`,
      );
    const evaluatedType = this.boundControllerExpressionType(input, sourceSite, value.propertyName, value.sourceResourceScope);
    const targetType = sourceSlot?.targetType ?? evaluatedType;
    if (targetType == null) {
      return [];
    }
    const sourceAddressHandle = value.sourceAddressHandle ?? sourceSlot?.sourceAddressHandle ?? null;
    return [new BindingContextSlotDraft(
      value.propertyName,
      sourceSlot?.targetIdentityHandle ?? null,
      sourceSlot?.targetProductHandle ?? null,
      targetType,
      sourceAddressHandle,
    )];
  }

  private boundControllerExpressionType(
    input: TemplateScopeConstructionRequest,
    sourceSite: BoundControllerSourceExpressionSite,
    propertyName: string,
    sourceResourceScope: TemplateResourceScope | null,
  ): CheckerTypeReference | null {
    if (sourceSite.projection == null) {
      return null;
    }
    const context = checkerContextForRuntimeBindingSourceExpressionProjection(
      sourceSite.projection,
      false,
      null,
      `bound-controller:${propertyName}`,
    );
    const evaluation = input.expressionWorld
      .evaluator(sourceResourceScope ?? input.resourceScope)
      .evaluate(context);
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  private boundControllerSourceExpressionSite(
    input: TemplateScopeConstructionRequest,
    expression: ExpressionAstNode,
    value: RuntimeBoundControllerPropertyValue,
    sourceAddressHandle: AddressHandle | null,
  ): BoundControllerSourceExpressionSite {
    if (value.sourceScope == null) {
      return {
        projection: null,
      };
    }
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(this.store, input.expressionWorld);
    const projection = projectRuntimeSourceExpressionWithLifecycle({
      expression,
      sourceScope: value.sourceScope,
      localKey: `${input.localKey}:bound-controller:${value.propertyName}:source-scope`,
      sourceAddressHandle,
      strictBinding: value.sourceStrictBinding,
      bindingBehavior: value.sourceBindingBehavior,
      bindingExpressionScopes,
    });
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return {
        projection: null,
      };
    }
    return {
      projection,
    };
  }

  private recordOwnedBindingInstructionScopes(
    instruction: TemplateInstruction,
    scope: BindingScope,
    frame: TemplateScopeConstructionFrame,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): void {
    ownedBindingInstructionProductHandles(instruction).forEach((productHandle, index) => {
      const childInstruction = frame.readInstruction(productHandle);
      if (childInstruction == null) {
        return;
      }
      frame.addInstructionScope(
        childInstruction.productHandle,
        this.constructInstructionExpressionScope(frame, scope, childInstruction, `${localSuffix}:owned:${index}:expression`, controllerContext, instruction),
        controllerContext?.productHandle ?? null,
      );
    });
  }

  private constructInstructionExpressionScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    runtimeAssignmentOwner: TemplateInstruction = instruction,
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

    if (instruction instanceof PropertyBindingInstruction) {
      const assignmentScope = this.constructRuntimeAssignmentExpressionScope(
        frame,
        base,
        runtimeAssignmentOwner,
        instruction,
        localSuffix,
        controllerContext,
      );
      if (assignmentScope != null) {
        return assignmentScope;
      }
    }

    return base;
  }

  private constructRuntimeAssignmentExpressionScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    ownerInstruction: TemplateInstruction,
    binding: PropertyBindingInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope | null {
    const slot = this.runtimeAssignmentSlotForBinding(frame, parent, ownerInstruction, binding, localSuffix, controllerContext);
    if (slot == null) {
      return null;
    }
    const emission = this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-expression`,
      ownerProductHandle: binding.productHandle,
      ownerIdentityHandle: binding.identityHandle,
      base: parent,
      bindingContextSlots: [slot],
      overrideContextSlots: [],
      sourceAddressHandle: binding.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeAssignment,
        binding.productHandle,
        binding.sourceAddressHandle,
        null,
        [slot.name],
      )],
    }));
    return frame.addDerivedScope(emission);
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
        [new BindingScopeCreator(
          BindingScopeCreatorKind.StateBinding,
          instruction.productHandle,
          instruction.sourceAddressHandle,
        )],
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
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.ListenerEvent,
        instruction.productHandle,
        instruction.sourceAddressHandle,
      )],
    }));
  }

  private constructRuntimeAssignmentScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScopeConstructionEmission | null {
    const slots = this.runtimeAssignmentSlots(frame, parent, instruction, localSuffix, controllerContext);
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
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeAssignment,
        instruction.productHandle,
        instruction.sourceAddressHandle,
        null,
        slots.map((slot) => slot.name),
      )],
    }));
  }

  private runtimeAssignmentSlots(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): readonly BindingContextSlotDraft[] {
    const bindables = bindablesForInstruction(this.store, instruction);
    if (bindables.length === 0) {
      return [];
    }

    const slots: BindingContextSlotDraft[] = [];
    for (const productHandle of bindableInstructionProductHandles(instruction)) {
      const binding = frame.readInstruction(productHandle);
      if (!(binding instanceof PropertyBindingInstruction)) {
        continue;
      }
      const slot = this.runtimeAssignmentSlotForBinding(frame, parent, instruction, binding, localSuffix, controllerContext, bindables);
      if (slot == null) {
        continue;
      }
      slots.push(slot);
    }
    return slots;
  }

  private runtimeAssignmentSlotForBinding(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    ownerInstruction: TemplateInstruction,
    binding: PropertyBindingInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    ownerBindables: readonly BindableDefinition[] = bindablesForInstruction(this.store, ownerInstruction),
  ): BindingContextSlotDraft | null {
    if (ownerBindables.length === 0 || !bindingCanAssignToSource(this.store, binding, frame.input.resourceScope)) {
      return null;
    }
    const parse = this.typeSupport.readParse(binding.expressionProductHandle);
    const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const target = expression == null ? null : runtimeAssignmentTargetAstForExpression(expression);
    const name = target?.$kind === 'AccessScope' && target.ancestor === 0
      ? target.name.name
      : null;
    if (name == null || parent.lookup(name, 0).slot != null) {
      return null;
    }
    const targetMember = runtimeAssignmentTargetMember(this.store, ownerInstruction, binding, ownerBindables);
    const targetMemberValueType = targetMember == null
      ? null
      : this.runtimeAssignmentTargetMemberValueType(frame, targetMember, localSuffix);
    const targetType = expression == null
      ? targetMemberValueType
      : this.runtimeAssignmentTargetToSourceType(
          frame,
          parent,
          binding,
          expression,
          targetMemberValueType,
          localSuffix,
          controllerContext,
        );
    const targetProductHandle = targetMember != null && targetMemberValueType != null && targetType != null && sameCheckerTypeReference(targetType, targetMemberValueType)
      ? targetMember.productHandle
      : null;
    return new BindingContextSlotDraft(
      name,
      null,
      targetProductHandle,
      targetType,
      parse?.sourceAddressHandle ?? binding.sourceAddressHandle,
    );
  }

  private runtimeAssignmentRuntimeBinding(
    input: TemplateScopeConstructionRequest,
    binding: PropertyBindingInstruction,
    controllerContext: RuntimeControllerFrame | null,
  ): RuntimeExpressionBinding | null {
    const candidates = (controllerContext?.readBindings() ?? input.runtimeBindings.readBindingsForInstruction(binding.productHandle))
      .filter(isRuntimeExpressionBinding)
      .filter((candidate) =>
        candidate.instructionProductHandle === binding.productHandle
        && expressionProductHandleForBinding(candidate) === binding.expressionProductHandle
      );
    return candidates.length === 1 ? candidates[0]! : null;
  }

  private runtimeAssignmentTargetMemberValueType(
    frame: TemplateScopeConstructionFrame,
    targetMember: CheckerTypeMember,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const valueType = targetMember.valueType;
    if (valueType == null || valueType.productHandle != null || targetMember.carrier?.valueType == null) {
      return valueType;
    }
    return frame.input.expressionWorld.projector.ensureProjection({
      localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-target:${targetMember.name}`,
      checker: targetMember.carrier.checker,
      type: targetMember.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle: valueType.sourceAddressHandle,
      display: valueType.display,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    }).toReference();
  }

  private runtimeAssignmentTargetToSourceType(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    binding: PropertyBindingInstruction,
    expression: ExpressionAstNode,
    targetValueType: CheckerTypeReference | null,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): CheckerTypeReference | null {
    if (targetValueType == null) {
      return null;
    }
    const runtimeBinding = this.runtimeAssignmentRuntimeBinding(frame.input, binding, controllerContext);
    if (runtimeBinding == null) {
      return null;
    }
    const evaluator = frame.input.expressionWorld.evaluator(frame.input.resourceScope);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(this.store, frame.input.expressionWorld);
    const projection = projectRuntimeBindingSourceExpressionInScope(frame.input.runtimeBindings, bindingExpressionScopes, {
      binding: runtimeBinding,
      expression,
      localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-writeback`,
      sourceScope: parent,
    });
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return null;
    }
    const context = checkerContextForRuntimeBindingSourceExpressionProjection(
      projection,
      false,
      targetValueType,
      'writeback-type',
    );
    const writeback = projectRuntimeAssignmentValueConverterWriteback({
      expression: projection.expression,
      evaluator,
      context,
      targetValueType,
    });
    if (writeback == null) {
      return targetValueType;
    }
    return writeback.targetToSourceValueType;
  }

  private capturedAttributeContextForDynamicInstruction(
    instructionProductHandle: ProductHandle,
  ): DynamicCapturedAttributeContext | null {
    let contextInstructionProductHandle: ProductHandle | null = null;
    let contextControllerProductHandle: ProductHandle | null = null;
    for (const claimHandle of this.store.readClaimsForSubject(instructionProductHandle)) {
      const claim = this.store.readClaim(claimHandle);
      if (claim?.predicateKey === KernelVocabulary.Instruction.DynamicInstructionUsesCapturedAttributeContextInstruction.key) {
        const candidate = claim.objectHandle as ProductHandle;
        if (this.store.readProduct(candidate)?.productKindKey === KernelVocabulary.Instruction.Instruction.key) {
          contextInstructionProductHandle = candidate;
        }
      }
      if (claim?.predicateKey === KernelVocabulary.Instruction.DynamicInstructionUsesCapturedAttributeContextController.key) {
        const candidate = claim.objectHandle as ProductHandle;
        if (this.store.readProduct(candidate)?.productKindKey === KernelVocabulary.Configuration.Controller.key) {
          contextControllerProductHandle = candidate;
        }
      }
    }
    return contextInstructionProductHandle == null || contextControllerProductHandle == null
      ? null
      : {
        instructionProductHandle: contextInstructionProductHandle,
        controllerProductHandle: contextControllerProductHandle,
      };
  }

  private capturedAttributeSourceScope(
    frame: TemplateScopeConstructionFrame,
    context: DynamicCapturedAttributeContext,
  ): BindingScope | null {
    const controller = runtimeControllerForProductHandle(frame.input.runtimeBindings, context.controllerProductHandle);
    if (controller == null || controller.instructionProductHandle !== context.instructionProductHandle) {
      return null;
    }
    const controllerScopeReference = controller.readScopeReference();
    if (controllerScopeReference == null) {
      return null;
    }
    const controllerScope = frame.readScopes().find((scope) =>
      scope.productHandle === controllerScopeReference.productHandle
    ) ?? null;
    // SpreadBinding.bind uses the hydration-context controller scope's parent as the inner binding scope.
    return controllerScope?.parent ?? null;
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
      bindingContextSlots: this.boundControllerBindingContextSlots(
        frame.input,
        controller?.productHandle ?? instruction.productHandle,
        definition.target.targetType,
      ),
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
    const iteratorFrame = this.iteratorScopeMaterializationFrame(frame, parent, effect, localSuffix);
    this.publishIteratorScopeIssues(frame, iteratorFrame);
    const localSlots = this.measure(input, 'iterator-local-slots', () =>
      this.iteratorLocalSlots(iteratorFrame)
    );
    const overrideSlots = this.measure(input, 'iterator-override-slots', () =>
      this.typeSupport.repeatOverrideSlots(input, effect.sourceAddressHandle, iteratorFrame.iteratorProjection.elementType)
    );
    return this.measure(input, 'iterator-scope-prepare', () => this.scopeMaterializer.prepare(BindingScope.fromRepeatedItem({
      localKey: `${input.localKey}:scope:${localSuffix}`,
      ownerProductHandle: effect.productHandle,
      ownerIdentityHandle: effect.identityHandle,
      parent,
      localSlots,
      overrideSlots,
      sourceAddressHandle: effect.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeBindingScopeEffect,
        effect.productHandle,
        effect.sourceAddressHandle,
      )],
    })));
  }

  private iteratorScopeMaterializationFrame(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): IteratorScopeMaterializationFrame {
    const input = frame.input;
    const sourceValueEvaluator = input.evaluation == null
      ? null
      : new RuntimeBindingSourceValueEvaluator(
          this.store,
          input.evaluation,
          input.boundControllerValues,
          input.sourceValueActivationContext ?? null,
          input.sourceValueDefaultContainer ?? null,
        );
    const binding = effect.binding.productHandle == null
      ? null
      : input.runtimeBindings.readBinding(effect.binding.productHandle);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(this.store, input.expressionWorld);
    const iteratorProjection = this.measure(input, 'iterator-type-projection', () =>
      this.typeSupport.iteratorProjection(input, parent, effect, localSuffix)
    );
    return {
      input,
      parent,
      effect,
      localSuffix,
      sourceValueEvaluator,
      binding: binding != null && isRuntimeExpressionBinding(binding) ? binding : null,
      bindingExpressionScopes,
      iteratorProjection,
      localTypes: new Map(iteratorProjection.localProjection.locals.map((local) => [local.name, local.typeReference])),
    };
  }

  private publishIteratorScopeIssues(
    frame: TemplateScopeConstructionFrame,
    iteratorFrame: IteratorScopeMaterializationFrame,
  ): void {
    const { input, effect, localSuffix, iteratorProjection } = iteratorFrame;
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
      iteratorProjection.localProjection.runtimeIssues.forEach((issue, index) => {
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
  }

  private iteratorLocalSlots(
    frame: IteratorScopeMaterializationFrame,
  ): readonly BindingContextSlotDraft[] {
    const {
      effect,
      iteratorProjection,
      localTypes,
      parent,
      sourceValueEvaluator,
      binding,
      input,
      bindingExpressionScopes,
    } = frame;
    return effect.localNames.map((name) => new BindingContextSlotDraft(
        name,
        null,
        null,
        localTypes.has(name)
          ? localTypes.get(name) ?? null
          : elementTypeForFlattenedIteratorName(effect.localNames, iteratorProjection.elementType),
        effect.sourceAddressHandle,
        [],
        repeatStaticLocalValue(
          iteratorProjection.parse,
          parent,
          effect,
          name,
          sourceValueEvaluator,
          binding,
          input.runtimeBindings,
          bindingExpressionScopes,
          input.resourceScope,
        ),
      ))
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
      scopeCreators: effects.map((effect) => new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeBindingScopeEffect,
        effect.productHandle,
        effect.sourceAddressHandle,
      )),
    }));
  }

  private letSlot(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): BindingContextSlotDraft {
    const targetType = this.typeSupport.letTargetType(input, parent, effect);
    return new BindingContextSlotDraft(
      effect.target,
      null,
      null,
      targetType,
      effect.sourceAddressHandle,
      [],
      this.letStaticValue(input, parent, effect, targetType),
    );
  }

  private letStaticValue(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
    targetType: CheckerTypeReference | null,
  ): EvaluationValue | null {
    const frame = this.letStaticValueEvaluationFrame(input, parent, effect, targetType);
    if (frame == null) {
      return null;
    }
    return this.evaluateLetStaticValue(frame);
  }

  private letStaticValueEvaluationFrame(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
    targetType: CheckerTypeReference | null,
  ): LetStaticValueEvaluationFrame | null {
    if (input.evaluation == null) {
      return null;
    }
    const parse = this.typeSupport.readParse(effect.expressionProductHandle);
    const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (expression == null) {
      return null;
    }
    const binding = effect.binding.productHandle == null
      ? null
      : input.runtimeBindings.readBinding(effect.binding.productHandle);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(this.store, input.expressionWorld);
    const contextProjection = projectRuntimeBindingSourceValueContextInScope({
      runtimeBindings: input.runtimeBindings,
      bindingExpressionScopes,
      binding: binding != null && isRuntimeExpressionBinding(binding) ? binding : null,
      expression,
      localKey: `${input.localKey}:let:${effect.productHandle}:source-value`,
      sourceScope: parent,
      resourceScope: input.resourceScope,
    });
    return {
      input,
      effect,
      targetType,
      sourceValueEvaluator: new RuntimeBindingSourceValueEvaluator(
        this.store,
        input.evaluation,
        input.boundControllerValues,
        input.sourceValueActivationContext ?? null,
        input.sourceValueDefaultContainer ?? null,
      ),
      contextProjection,
    };
  }

  private evaluateLetStaticValue(
    frame: LetStaticValueEvaluationFrame,
  ): EvaluationValue | null {
    const { contextProjection, effect, sourceValueEvaluator, targetType } = frame;
    if (contextProjection.context == null) {
      return targetType == null
        ? null
        : new EvaluationBoundaryValue(
          EvaluationBoundaryKind.BindingScope,
          `let.${effect.target}`,
          null,
        );
    }
    const evaluation = sourceValueEvaluator.evaluate(contextProjection.context);
    if (evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Value && evaluation.value != null) {
      return evaluation.value;
    }
    return targetType == null
      ? null
      : new EvaluationBoundaryValue(
        EvaluationBoundaryKind.BindingScope,
        `let.${effect.target}`,
        null,
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
  store: KernelStore,
  binding: PropertyBindingInstruction,
  resourceScope: TemplateResourceScope | null,
): boolean {
  const bindingMode = effectiveTemplateBindingMode(store, binding.bindingMode, binding.expressionProductHandle, resourceScope);
  return templateBindingModeIncludesTargetToSource(bindingMode);
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
  return targetType == null
    ? null
    : readOrProjectCheckerTypeMembers(store, targetType, targetTypeProductHandle)
      .find((member) => member.name === bindable.name) ?? null;
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

function runtimeControllerForProductHandle(
  rendering: RuntimeRenderingEmission,
  productHandle: ProductHandle,
): RuntimeControllerFrame | null {
  if (rendering.rootController.productHandle === productHandle) {
    return rendering.rootController;
  }
  return rendering.controllers.find((controller) =>
    controller.productHandle === productHandle
  ) ?? null;
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
