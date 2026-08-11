import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  BindingScopeCreator,
  BindingScopeCreatorKind,
  BindingContextSlotAssignmentAccessKind,
  type BindingContextSlot,
  BindingContextSlotDraft,
  BindingScope,
  BindingScopeLookupKind,
} from '../configuration/scope.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  evaluationPrimitiveValueFromExpressionValue,
} from '../evaluation/values.js';
import type {
  BindingIdentifier,
  BindingIdentifierOrPattern,
  ExpressionAstNode,
} from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  bindingSourceValueEvaluationWithPressure,
  openBindingSourceSlotNoStaticValue,
  RuntimeBindingSourceValueEvaluation,
} from '../configuration/binding-source-value-evaluation.js';
import {
  projectRuntimeBindingSourceValueContextInScope,
  type RuntimeBindingSourceValueContextProjection,
} from '../observation/binding-source-value-evaluation-context.js';
import type { DiProviderActivationView } from '../di/provider-activation.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  runtimeBindingSourceExpression,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
  type RuntimeBindingExpressionScopeProjectionReader,
} from '../observation/runtime-binding-expression-scope.js';
import { runtimeBindingSourceLifecycle } from '../observation/runtime-binding-source-lifecycle.js';
import { runtimeAssignmentInputScopeForAccessScope } from '../observation/binding-source-write-capability.js';
import {
  aggregateRuntimeBindingSourceExpressionChainIndex,
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
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
} from '../kernel/publication.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { OpenSeam } from '../kernel/open-seam.js';
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
  checkerTypeMemberReachableIdentityHandle,
  sameCheckerTypeReference,
  type CheckerTypeMember,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  TypeSystemHotDetails,
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import {
  bindingContextSlotDraftForContextTypeMember,
  bindingContextSlotDraftForExpressionAccess,
  bindingContextSlotTargetTypeSourceMember,
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
  type HydrateElementProjectionInstructionSequence,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  IteratorBindingInstruction,
  DispatchBindingInstruction,
  ListenerBindingInstruction,
  MultiAttrInstruction,
  nestedInstructionProductHandlesForInstructions,
  PropertyBindingInstruction,
  SetPropertyInstruction,
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
  RuntimeContentProjectionSelectionKind,
  type RuntimeContentProjectionView,
} from './runtime-content-projection.js';
import {
  IteratorBindingScopeEffect,
  InterpolationBinding,
  LetBindingScopeEffect,
  LetBindingTargetContext,
  PropertyBinding,
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
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
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
  templateBindingModeIncludesTargetToSource,
} from './runtime-binding-mode-behavior.js';
import type { RuntimeExpressionResourcePlan } from './runtime-expression-resource-plan.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import { AuSlotBindableName } from './au-slot-source.js';

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
  | 'binding-expression-scope-handoffs'
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
  | 'publication';

interface BoundControllerSourceExpressionSite {
  readonly projection: RuntimeBindingSourceExpressionContextProjection | null;
}

interface BoundControllerPropertyTypeProjection {
  readonly targetType: CheckerTypeReference;
  readonly sourceTypeMember: CheckerTypeMember | null;
}

interface ProjectionHostExposeProjection {
  readonly present: boolean;
  readonly projection: BoundControllerPropertyTypeProjection | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

type IteratorScopeProjection = ReturnType<TemplateScopeTypeProjector['iteratorProjection']>;

interface IteratorScopeMaterializationFrame {
  readonly input: TemplateScopeConstructionRequest;
  readonly parent: BindingScope;
  readonly effect: IteratorBindingScopeEffect;
  readonly localSuffix: string;
  readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null;
  readonly binding: RuntimeExpressionBinding | null;
  readonly resourceScope: TemplateResourceScope | null;
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  readonly iteratorProjection: IteratorScopeProjection;
  readonly localTypes: ReadonlyMap<string, CheckerTypeReference | null>;
  readonly readInstruction: (productHandle: ProductHandle | null) => TemplateInstruction | null;
}

class IteratorLocalSlotProjection {
  constructor(
    readonly slots: readonly BindingContextSlotDraft[],
    readonly sourceRecords: readonly KernelStoreRecord[],
  ) {}
}

interface LetStaticValueEvaluationFrame {
  readonly input: TemplateScopeConstructionRequest;
  readonly effect: LetBindingScopeEffect;
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
  /** Reached behavior effects that determine assignment direction before scope projection. */
  readonly expressionResourcePlan: RuntimeExpressionResourcePlan;
  /** Project-level runtime-analysis context for controller/resource lookups owned by adjacent runtime phases. */
  readonly projectContext: TemplateRuntimeAnalysisProjectContext;
  /** Shared static evaluation available for runtime Scope value carriers. */
  readonly evaluation: StaticProjectEvaluationResult | null;
  /** Current TypeChecker epoch, if resource recognition supplied one. */
  readonly typeSystem: TypeSystemProject | null;
  /** Runtime-analysis expression world shared by scope, observation, and data-flow phases. */
  readonly expressionWorld: CheckerExpressionTypeWorld;
  /** Project-level parent-to-child bindable value table shared with binding-source value reduction. */
  readonly boundControllerValues?: RuntimeBoundControllerValueTable;
  /** App-world DI activation facts available to source-value evaluation. */
  readonly sourceValueActivationView?: DiProviderActivationView | null;
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
    /** App-owned template-controller child Scope effects that remained open after source projection. */
    readonly openSeams: readonly OpenSeam[],
    /** Scope materializer emissions, including root scope. */
    readonly scopeEmissions: readonly BindingScopeConstructionEmission[],
    /** Immutable rendered-binding source-scope handoffs shared by all later analysis and query consumers. */
    readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
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

/**
 * One custom-element provider/receiver relationship while recursively traversing compiled views.
 *
 * The parent link is the runtime-html re-projection chain: selected provider content resumes under
 * the context that was active where that provider content was declared.
 */
class TemplateProjectionContext {
  private readonly consumedSequenceHandles = new Set<ProductHandle>();

  constructor(
    readonly providerInstruction: HydrateElementInstruction,
    readonly declaringScope: BindingScope,
    readonly receiverScope: BindingScope,
    readonly declaringControllerContext: RuntimeControllerFrame | null,
    readonly receiverControllerContext: RuntimeControllerFrame | null,
    readonly parent: TemplateProjectionContext | null,
  ) {}

  consume(projection: HydrateElementProjectionInstructionSequence): void {
    this.consumedSequenceHandles.add(projection.instructionSequenceProductHandle);
  }

  isConsumed(projection: HydrateElementProjectionInstructionSequence): boolean {
    return this.consumedSequenceHandles.has(projection.instructionSequenceProductHandle);
  }
}

class TemplateScopeConstructionServices {
  constructor(
    readonly scopeMaterializer: BindingScopeMaterializer,
    readonly scopeNarrower: CheckerExpressionScopeNarrower,
    readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
    readonly typeSupport: TemplateScopeTypeProjector,
    readonly controllerFlow: TemplateControllerFlowScopeMaterializer,
  ) {}
}

export class TemplateScopeConstructionFrame {
  readonly scopeEmissions: BindingScopeConstructionEmission[];
  readonly derivedScopes: BindingScope[] = [];
  readonly instructionScopes: TemplateInstructionScopeApplication[] = [];
  readonly templateControllerLinks: TemplateControllerLinkApplication[] = [];
  readonly scopeIssues: RuntimeBindingScopeIssue[] = [];
  readonly scopeIssueRecords: KernelStoreRecord[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly flowState = new TemplateControllerFlowState();
  currentScope: BindingScope;
  private readonly scopeSupportRecords: KernelStoreRecord[] = [];
  private readonly scopeSupportRecordHandles = new Set<string>();

  private constructor(
    readonly input: TemplateScopeConstructionRequest,
    readonly root: BindingScopeConstructionEmission,
    readonly services: TemplateScopeConstructionServices,
    private readonly sequencesByProduct: ReadonlyMap<ProductHandle, TemplateInstructionSequence>,
    private readonly instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
  ) {
    this.currentScope = root.scope;
    this.scopeEmissions = [root];
  }

  static create(
    input: TemplateScopeConstructionRequest,
    root: BindingScopeConstructionEmission,
    services: TemplateScopeConstructionServices,
  ): TemplateScopeConstructionFrame {
    return new TemplateScopeConstructionFrame(
      input,
      root,
      services,
      new Map(input.compiledTemplate.instructionSequences.map((sequence) =>
        [sequence.productHandle, sequence] as const
      )),
      new Map([
        ...input.compiledTemplate.instructions.map((instruction) =>
          [instruction.productHandle, instruction] as const
        ),
        ...input.runtimeBindings.dynamicInstructions.map((instruction) => [instruction.productHandle, instruction] as const),
      ]),
    );
  }

  readSequence(productHandle: ProductHandle | null): TemplateInstructionSequence | null {
    return productHandle == null
      ? null
      : this.sequencesByProduct.get(productHandle)
        ?? this.input.projectContext.readInstructionSequence(productHandle);
  }

  readInstruction(productHandle: ProductHandle | null): TemplateInstruction | null {
    return productHandle == null
      ? null
      : this.instructionsByProduct.get(productHandle)
        ?? this.input.projectContext.readInstruction(productHandle);
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

  addScopeSupportRecords(records: readonly KernelStoreRecord[]): void {
    for (const record of records) {
      if (this.scopeSupportRecordHandles.has(record.handle)) {
        continue;
      }
      this.scopeSupportRecordHandles.add(record.handle);
      this.scopeSupportRecords.push(record);
    }
  }

  addOpenSeam(seam: OpenSeam): void {
    if (this.openSeams.some((candidate) => candidate.handle === seam.handle)) {
      return;
    }
    this.openSeams.push(seam);
    this.addScopeSupportRecords([seam]);
  }

  readScopeSupportRecords(): readonly KernelStoreRecord[] {
    return this.scopeSupportRecords;
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
      this.openSeams,
      distinctScopeConstructionEmissions(this.scopeEmissions),
      this.services.bindingExpressionScopes.toProjectionTable(),
    );
  }
}

/**
 * Materializes runtime-shaped binding scopes for a compiled template frontier.
 *
 * Controller and Scope classes own the construction shapes. This coordinator preserves template-order effects and
 * publishes the resulting Scope/BindingContext/IOverrideContext products through the active analysis generation.
 */
export class TemplateControllerScopeMaterializer {
  private readonly scopeIssuePublisher: RuntimeBindingScopeIssuePublisher;

  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {
    this.scopeIssuePublisher = new RuntimeBindingScopeIssuePublisher(store);
  }

  construct(input: TemplateScopeConstructionRequest): TemplateScopeConstructionEmission {
    const services = this.servicesFor(input);
    const root = this.measure(input, 'root-scope', () => this.constructRootScope(input, services));
    input.runtimeBindings.rootController.attachScope(root.scope.toReference());
    const frame = TemplateScopeConstructionFrame.create(input, root, services);
    this.measure(input, 'render-targets', () => this.constructRenderTargets(frame));
    this.measure(input, 'dynamic-instruction-scopes', () => this.captureDynamicInstructionScopes(frame));
    this.measure(input, 'binding-expression-scope-handoffs', () =>
      this.completeBindingExpressionScopeHandoffs(frame)
    );
    return this.measure(input, 'publication', () => this.publishScopeConstruction(frame));
  }

  private servicesFor(input: TemplateScopeConstructionRequest): TemplateScopeConstructionServices {
    const projector = input.expressionWorld.projector;
    const scopeMaterializer = new BindingScopeMaterializer(this.store, projector);
    const scopeNarrower = new CheckerExpressionScopeNarrower(this.store, projector);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(
      this.store,
      input.expressionWorld,
      input.expressionResourcePlan,
    );
    const typeSupport = new TemplateScopeTypeProjector(
      this.store,
      projector,
      bindingExpressionScopes,
    );
    return new TemplateScopeConstructionServices(
      scopeMaterializer,
      scopeNarrower,
      bindingExpressionScopes,
      typeSupport,
      new TemplateControllerFlowScopeMaterializer(
        this.store,
        scopeMaterializer,
        scopeNarrower,
        typeSupport,
        bindingExpressionScopes,
        this.scopeIssuePublisher,
        this.constructScopeEffects.bind(this),
        this.constructRuntimeAssignmentStateForBinding.bind(this),
      ),
    );
  }

  private completeBindingExpressionScopeHandoffs(
    frame: TemplateScopeConstructionFrame,
  ): void {
    const scopes = instructionScopeLookup(frame.instructionScopes);
    for (const binding of frame.input.runtimeBindings.bindings) {
      if (!isRuntimeExpressionBinding(binding)) {
        continue;
      }
      const expression = runtimeBindingSourceExpression(
        frame.input.expressionWorld.projector.publication,
        binding,
      );
      const sourceScope = scopes.scopeForBinding(frame.input.runtimeBindings, binding);
      if (sourceScope == null) {
        continue;
      }
      if (expression == null) {
        frame.services.bindingExpressionScopes.retainUnparsedBindingScope(
          binding.productHandle,
          sourceScope,
        );
        continue;
      }
      const renderContext = frame.input.runtimeBindings.requireRenderContextForBinding(binding.productHandle);
      frame.services.bindingExpressionScopes.projectSourceExpressions({
        bindingProductHandle: binding.productHandle,
        expression,
        scope: sourceScope,
        localKey: `${frame.input.localKey}:binding-source:${binding.productHandle}`,
        sourceAddressHandle: binding.sourceAddressHandle,
        resourceScope: renderContext.resourceScope,
        activeContainer: renderContext.requireActiveContainer(),
      });
      const lifecycle = runtimeBindingSourceLifecycle(binding, frame.input.expressionResourcePlan);
      const assignmentTarget = lifecycle.includesSourceAssignment
        ? runtimeAssignmentTargetAstForExpression(expression)
        : null;
      const assignmentScope = assignmentTarget?.$kind === 'AccessScope'
        ? runtimeAssignmentInputScopeForAccessScope(
            assignmentTarget,
            binding.instructionProductHandle,
            sourceScope,
          )
        : sourceScope;
      if (assignmentTarget != null) {
        frame.services.bindingExpressionScopes.project({
          bindingProductHandle: binding.productHandle,
          expression: assignmentTarget,
          scope: assignmentScope,
          localKey: `${frame.input.localKey}:binding-source-assignment:${binding.productHandle}`,
          sourceAddressHandle: binding.sourceAddressHandle,
          resourceScope: renderContext.resourceScope,
          activeContainer: renderContext.requireActiveContainer(),
        });
      }
    }
    for (const emission of frame.services.bindingExpressionScopes.readScopeEmissions()) {
      frame.addDerivedScope(emission);
    }
  }

  private constructRenderTargets(frame: TemplateScopeConstructionFrame): void {
    frame.currentScope = this.constructCompiledTemplateScopes(
      frame,
      frame.input.compiledTemplate,
      frame.currentScope,
      '',
      frame.input.runtimeBindings.rootController,
      null,
    );
  }

  private constructCompiledTemplateScopes(
    frame: TemplateScopeConstructionFrame,
    compiledTemplate: CompiledTemplateEmission,
    initialScope: BindingScope,
    localPrefix: string,
    controllerContext: RuntimeControllerFrame | null,
    projectionContext: TemplateProjectionContext | null,
  ): BindingScope {
    let currentScope = initialScope;
    const surrogateSequence = this.measure(frame.input, 'surrogate-sequence', () =>
      this.constructSurrogateSequence(
        frame,
        compiledTemplate,
        currentScope,
        localPrefix,
        controllerContext,
        projectionContext,
      )
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
          projectionContext,
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
    projectionContext: TemplateProjectionContext | null,
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
      projectionContext,
    );
  }

  private captureDynamicInstructionScopes(frame: TemplateScopeConstructionFrame): void {
    frame.input.runtimeBindings.dynamicInstructions.forEach((instruction, index) => {
      if (frame.hasInstructionScope(instruction.productHandle)) {
        return;
      }
      const capturedContext = this.capturedAttributeContextForDynamicInstruction(frame, instruction.productHandle);
      if (capturedContext == null) {
        return;
      }
      const controller = runtimeControllerForProductHandle(
        frame.input.runtimeBindings,
        capturedContext.controllerProductHandle,
      );
      const capturedScope = this.capturedAttributeSourceScope(frame, capturedContext, controller);
      if (capturedScope == null) {
        return;
      }
      frame.addInstructionScope(
        instruction.productHandle,
        this.constructInstructionExpressionScope(
          frame,
          capturedScope,
          instruction,
          `dynamic:${index}:expression`,
          controller,
        ),
        capturedContext.controllerProductHandle,
      );
    });
  }

  private publishScopeConstruction(frame: TemplateScopeConstructionFrame): TemplateScopeConstructionEmission {
    const instructionScopeRecords = this.recordsForInstructionScopeApplications(frame.input.localKey, frame.instructionScopes);
    const templateControllerLinkRecords = this.recordsForTemplateControllerLinks(frame.input.localKey, frame.templateControllerLinks);
    const scopePlan = frame.services.scopeMaterializer.publicationPlan(
      distinctScopeConstructionEmissions(frame.scopeEmissions),
      `template-scope:${frame.input.localKey}:binding-scopes`,
    );
    frame.input.expressionWorld.projector.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(
        [
          ...scopePlan.batch.records,
          ...instructionScopeRecords,
          ...templateControllerLinkRecords,
          ...frame.scopeIssueRecords,
          ...frame.readScopeSupportRecords(),
        ],
        `template-scope:${frame.input.localKey}`,
      ),
      [
        ...scopePlan.productDetails,
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingScopeIssue, frame.scopeIssues),
        ...publishProductDetails(
          ConfigurationProductDetails.Controller,
          frame.input.runtimeBindings.controllers.map((controller) => controller.toControllerProduct()),
        ),
      ],
      scopePlan.hotDetails,
    ));
    return frame.toEmission(instructionScopeRecords, templateControllerLinkRecords);
  }

  private constructInstructionSequence(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    sequence: TemplateInstructionSequence,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    projectionContext: TemplateProjectionContext | null,
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
          projectionContext,
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
    projectionContext: TemplateProjectionContext | null,
  ): BindingScope {
    if (instruction instanceof HydrateLetElementInstruction) {
      return this.constructLetElementScope(frame, currentScope, instruction, localSuffix, controllerContext);
    }

    this.measure(frame.input, 'owned-binding-instruction-scopes', () =>
      this.recordOwnedBindingInstructionScopes(instruction, currentScope, frame, localSuffix, controllerContext)
    );

    if (instruction instanceof HydrateTemplateControllerInstruction) {
      this.measure(frame.input, 'template-controller-scope', () =>
        this.constructTemplateControllerInstructionScope(
          frame,
          currentScope,
          instruction,
          localSuffix,
          controllerContext,
          projectionContext,
        )
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
        if (instruction.auSlotProcessContent != null) {
          this.constructAuSlotContentScope(
            frame,
            currentScope,
            instruction,
            localSuffix,
            controllerContext,
            projectionContext,
          );
          this.constructCustomElementChildTemplateScopes(
            frame,
            childScope,
            instruction,
            localSuffix,
            controllerContext,
            projectionContext,
          );
        } else {
          const childController = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
            instruction.productHandle,
            controllerContext,
          );
          const childProjectionContext = new TemplateProjectionContext(
            instruction,
            currentScope,
            childScope,
            controllerContext,
            childController,
            projectionContext,
          );
          this.constructCustomElementChildTemplateScopes(
            frame,
            childScope,
            instruction,
            localSuffix,
            controllerContext,
            childProjectionContext,
          );
          this.constructUnconsumedProjectionScopes(frame, childProjectionContext, localSuffix);
        }
      } else {
        this.constructPotentialElementProjectionScopes(
          frame,
          currentScope,
          instruction,
          localSuffix,
          controllerContext,
          projectionContext,
        );
      }
    }

    const assignmentScope = this.measure(frame.input, 'runtime-assignment-scope', () =>
      this.constructRuntimeAssignmentScope(frame, currentScope, instruction, localSuffix, controllerContext)
    );
    if (assignmentScope != null) {
      frame.flowState.clearBranch(currentScope);
      return assignmentScope;
    }

    frame.flowState.clearBranch(currentScope);
    return currentScope;
  }

  private constructAuSlotContentScope(
    frame: TemplateScopeConstructionFrame,
    receiverViewScope: BindingScope,
    instruction: HydrateElementInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    projectionContext: TemplateProjectionContext | null,
  ): void {
    const outletName = instruction.auSlotProcessContent?.name;
    if (outletName == null) {
      return;
    }
    const outletController = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    if (outletController == null) {
      return;
    }
    const views = frame.input.runtimeBindings.readContentProjectionViewsForOutletController(
      outletController.productHandle,
    );
    if (views.length === 0) {
      throw new Error(
        `Runtime AuSlot controller '${outletController.productHandle}' has no content-projection view relation.`,
      );
    }
    views.forEach((view, index) => {
      this.constructAuSlotViewScope(
        frame,
        receiverViewScope,
        projectionContext,
        view,
        `${localSuffix}:outlet:${localKeyPart(outletName)}:${index}`,
      );
    });
  }

  private constructAuSlotViewScope(
    frame: TemplateScopeConstructionFrame,
    receiverViewScope: BindingScope,
    projectionContext: TemplateProjectionContext | null,
    view: RuntimeContentProjectionView,
    localSuffix: string,
  ): void {
    if (view.selectionKind === RuntimeContentProjectionSelectionKind.Empty
      || view.instructionSequence == null) {
      return;
    }
    if (view.selectionKind === RuntimeContentProjectionSelectionKind.Projected) {
      if (projectionContext == null || view.projection == null) {
        throw new Error(
          `Projected AuSlot view '${view.outletController.productHandle}' has no provider scope context.`,
        );
      }
      projectionContext.consume(view.projection);
      this.constructProjectedInstructionSequence(
        frame,
        projectionContext,
        view.projection,
        view.outletInstruction,
        `${localSuffix}:projected`,
        view.syntheticController,
        view.instructionSequence,
      );
      return;
    }
    view.syntheticController?.attachScope(receiverViewScope.toReference());
    this.constructInstructionSequence(
      frame,
      receiverViewScope,
      view.instructionSequence,
      `${localSuffix}:fallback`,
      view.syntheticController,
      projectionContext,
    );
  }

  private constructProjectedInstructionSequence(
    frame: TemplateScopeConstructionFrame,
    projectionContext: TemplateProjectionContext,
    projection: HydrateElementProjectionInstructionSequence,
    outletInstruction: HydrateElementInstruction | null,
    localSuffix: string,
    syntheticController: RuntimeControllerFrame | null = null,
    realizedSequence: TemplateInstructionSequence | null = null,
  ): void {
    const sequence = realizedSequence
      ?? frame.readSequence(projection.instructionSequenceProductHandle);
    if (sequence == null) {
      return;
    }
    const hostSlot = this.projectionHostSlot(
      frame,
      projectionContext,
      outletInstruction,
      localSuffix,
    );
    const scopeOwner = outletInstruction ?? projectionContext.providerInstruction;
    const projectionScope = frame.addDerivedScope(frame.services.scopeMaterializer.prepare(
      BindingScope.forContentProjection({
        localKey: `${frame.input.localKey}:scope:${localSuffix}`,
        ownerProductHandle: scopeOwner.productHandle,
        ownerIdentityHandle: scopeOwner.identityHandle,
        declaringScope: projectionContext.declaringScope,
        overrideSlots: [hostSlot],
        sourceAddressHandle: projection.sourceAddressHandle,
        scopeCreators: [new BindingScopeCreator(
          BindingScopeCreatorKind.ContentProjection,
          scopeOwner.productHandle,
          projection.sourceAddressHandle,
          null,
          [hostSlot.name],
        )],
      }),
    ));
    syntheticController?.attachScope(projectionScope.toReference());
    this.constructInstructionSequence(
      frame,
      projectionScope,
      sequence,
      localSuffix,
      syntheticController ?? projectionContext.declaringControllerContext,
      projectionContext.parent,
    );
  }

  private constructUnconsumedProjectionScopes(
    frame: TemplateScopeConstructionFrame,
    projectionContext: TemplateProjectionContext,
    localSuffix: string,
  ): void {
    projectionContext.providerInstruction.projectionInstructionSequences.forEach((projection, index) => {
      if (projectionContext.isConsumed(projection)) {
        return;
      }
      this.constructProjectedInstructionSequence(
        frame,
        projectionContext,
        projection,
        null,
        `${localSuffix}:projection:${index}:potential`,
      );
    });
  }

  private constructPotentialElementProjectionScopes(
    frame: TemplateScopeConstructionFrame,
    declaringScope: BindingScope,
    instruction: HydrateElementInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    parentProjectionContext: TemplateProjectionContext | null,
  ): void {
    const context = new TemplateProjectionContext(
      instruction,
      declaringScope,
      declaringScope,
      controllerContext,
      null,
      parentProjectionContext,
    );
    this.constructUnconsumedProjectionScopes(frame, context, localSuffix);
  }

  private projectionHostSlot(
    frame: TemplateScopeConstructionFrame,
    projectionContext: TemplateProjectionContext,
    outletInstruction: HydrateElementInstruction | null,
    localSuffix: string,
  ): BindingContextSlotDraft {
    const receiverContext = projectionContext.receiverScope.bindingContext;
    const receiverType = receiverContext.contextType;
    const expose = this.projectionHostExposeProjection(
      frame,
      projectionContext,
      outletInstruction,
      localSuffix,
    );
    const exposeProjection = expose.projection;
    const nonNullishExpose = exposeProjection == null
      ? null
      : frame.services.typeSupport.nonNullishTypeProjection(
        exposeProjection.targetType,
        `${frame.input.localKey}:scope:${localSuffix}:host-expose`,
        expose.sourceAddressHandle,
      );
    const hostTypes = outletInstruction == null || (expose.present && nonNullishExpose == null)
      ? []
      : nonNullishExpose == null
        ? receiverType == null ? [] : [receiverType]
      : nonNullishExpose.mayBeNullish === false
        ? [nonNullishExpose.typeReference]
        : [
          nonNullishExpose.typeReference,
          ...(receiverType == null ? [] : [receiverType]),
        ];
    const targetType = frame.services.typeSupport.commonOrUnionTypeReference(
      hostTypes,
      `${frame.input.localKey}:scope:${localSuffix}:host`,
      expose.sourceAddressHandle
        ?? outletInstruction?.sourceAddressHandle
        ?? projectionContext.providerInstruction.sourceAddressHandle,
    );
    const sourceTypeMember = nonNullishExpose?.mayBeNullish === false
      ? exposeProjection?.sourceTypeMember ?? null
      : null;
    const targetIdentityHandle = sourceTypeMember == null
      ? !expose.present && outletInstruction != null
        ? receiverContext.identityHandle
        : null
      : checkerTypeMemberReachableIdentityHandle(sourceTypeMember);
    return new BindingContextSlotDraft(
      '$host',
      targetIdentityHandle,
      sourceTypeMember?.detailHandle ?? null,
      targetType,
      expose.sourceAddressHandle
        ?? outletInstruction?.sourceAddressHandle
        ?? projectionContext.providerInstruction.sourceAddressHandle,
      [],
      null,
      [],
      BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly,
      sourceTypeMember?.detailHandle ?? null,
    );
  }

  private projectionHostExposeProjection(
    frame: TemplateScopeConstructionFrame,
    projectionContext: TemplateProjectionContext,
    outletInstruction: HydrateElementInstruction | null,
    localSuffix: string,
  ): ProjectionHostExposeProjection {
    if (outletInstruction == null) {
      return {
        present: false,
        projection: null,
        sourceAddressHandle: projectionContext.providerInstruction.sourceAddressHandle,
      };
    }
    const exposeInstructions = outletInstruction.bindableInstructionProductHandles
      .map((productHandle) => frame.readInstruction(productHandle))
      .filter((instruction): instruction is PropertyBindingInstruction | InterpolationInstruction | SetPropertyInstruction =>
        instructionTargetsProperty(instruction, AuSlotBindableName.Expose)
      );
    const sourceAddressHandle = exposeInstructions[0]?.sourceAddressHandle
      ?? outletInstruction.sourceAddressHandle;
    if (exposeInstructions.length !== 1) {
      return {
        present: exposeInstructions.length > 0,
        projection: null,
        sourceAddressHandle,
      };
    }
    const exposeInstruction = exposeInstructions[0]!;
    if (exposeInstruction instanceof SetPropertyInstruction) {
      const targetType = frame.services.typeSupport.literalTypeReference(
        frame.input,
        exposeInstruction.value,
        `${frame.input.localKey}:scope:${localSuffix}:host-expose-static`,
        exposeInstruction.sourceAddressHandle,
      );
      return {
        present: true,
        projection: targetType == null ? null : { targetType, sourceTypeMember: null },
        sourceAddressHandle,
      };
    }
    const bindings = (projectionContext.receiverControllerContext?.readBindings() ?? [])
      .filter(isRuntimeExpressionBinding)
      .filter((binding) =>
        binding.instructionProductHandle === exposeInstruction.productHandle
        && runtimeBindingTargetsProperty(binding, AuSlotBindableName.Expose)
      );
    return {
      present: true,
      projection: bindings.length === 1
        ? this.runtimeControllerPropertyTypeProjection(
            frame.input,
            bindings[0]!,
            projectionContext.receiverScope,
            AuSlotBindableName.Expose,
            `${frame.input.localKey}:scope:${localSuffix}:host-expose`,
            frame.services,
          )
        : null,
      sourceAddressHandle,
    };
  }

  private runtimeControllerPropertyTypeProjection(
    input: TemplateScopeConstructionRequest,
    binding: RuntimeExpressionBinding,
    sourceScope: BindingScope,
    propertyName: string,
    localKey: string,
    services: TemplateScopeConstructionServices,
  ): BoundControllerPropertyTypeProjection | null {
    const expressionProductHandle = expressionProductHandleForBinding(binding);
    const parse = readTemplateExpressionParse(
      services.scopeNarrower.projector.publication,
      expressionProductHandle,
    );
    const expression = parse == null ? null : bindingExpressionAstForParse(parse);
    if (expression == null) {
      return null;
    }
    const projection = projectRuntimeBindingSourceExpressionInScope(
      input.runtimeBindings,
      services.bindingExpressionScopes,
      input.expressionResourcePlan,
      {
        binding,
        expressionProductHandle,
        expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
        expression,
        localKey: `${localKey}:source-scope`,
        sourceScope,
      },
    );
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return null;
    }
    return this.boundControllerSourceTypeProjection(
      input,
      { projection },
      propertyName,
      `${localKey}:source-slot`,
      services,
    );
  }

  private constructTemplateControllerInstructionScope(
    frame: TemplateScopeConstructionFrame,
    currentScope: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
    projectionContext: TemplateProjectionContext | null,
  ): void {
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    controller?.attachScope(currentScope.toReference());
    const childScope = frame.services.controllerFlow.constructChildScope(
      frame,
      currentScope,
      instruction,
      controller,
      localSuffix,
    );
    const syntheticController = this.attachSyntheticTemplateControllerScope(frame, instruction, childScope, controller);
    this.constructTemplateControllerChildInstructionSequence(
      frame,
      instruction,
      childScope,
      localSuffix,
      syntheticController,
      projectionContext,
    );
    frame.services.controllerFlow.finishFlowState(frame, instruction, childScope);
  }

  private attachSyntheticTemplateControllerScope(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    childScope: BindingScope,
    controller: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    const syntheticController = frame.input.runtimeBindings.readSyntheticControllerForOwnerInstructionUnderController(
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
    projectionContext: TemplateProjectionContext | null,
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
        projectionContext,
      )
    );
  }

  private constructRootScope(
    input: TemplateScopeConstructionRequest,
    services: TemplateScopeConstructionServices,
  ): BindingScopeConstructionEmission {
    return services.scopeMaterializer.prepare(BindingScope.forCustomElementController({
      localKey: `${input.localKey}:scope:root`,
      ownerProductHandle: input.runtimeBindings.rootController.productHandle,
      ownerIdentityHandle: input.runtimeBindings.rootController.identityHandle,
      parent: null,
      viewModelType: input.definition.target.targetType,
      bindingContextSlots: this.definitionBindingContextSlots(
        input,
        input.definition,
        input.runtimeBindings.rootController.productHandle,
        services,
      ),
      sourceAddressHandle: input.definition.sourceAddressHandle,
    }));
  }

  private definitionBindingContextSlots(
    input: TemplateScopeConstructionRequest,
    definition: CustomElementDefinition,
    controllerProductHandle: ProductHandle | null,
    services: TemplateScopeConstructionServices,
  ): readonly BindingContextSlotDraft[] {
    const declarations = this.definitionBindableBindingContextSlots(definition, services);
    const inferred = this.boundControllerBindingContextSlots(
      input,
      definition,
      controllerProductHandle,
      definition.target.targetType,
      services,
    );
    const inferredByName = new Map(inferred.map((slot) => [slot.name, slot]));
    const merged = declarations.map((declaration) => {
      const inference = inferredByName.get(declaration.name);
      if (inference == null) {
        return declaration;
      }
      inferredByName.delete(declaration.name);
      return new BindingContextSlotDraft(
        declaration.name,
        declaration.targetIdentityHandle,
        declaration.targetTypeMemberHandle,
        inference.targetType ?? declaration.targetType,
        declaration.sourceAddressHandle,
        declaration.fieldProvenance,
        declaration.staticValueEvaluation,
        declaration.memberTypes,
        declaration.assignmentAccessKind,
        inference.targetTypeSourceMemberHandle,
      );
    });
    return [...merged, ...inferredByName.values()];
  }

  private definitionBindableBindingContextSlots(
    definition: CustomElementDefinition,
    services: TemplateScopeConstructionServices,
  ): readonly BindingContextSlotDraft[] {
    const contextType = definition.target.targetType;
    return definition.bindables.map((bindable) => {
      const declaration = bindingContextSlotDraftForContextTypeMember(
        services.scopeNarrower.projector,
        contextType,
        bindable.name,
      );
      return new BindingContextSlotDraft(
        bindable.name,
        declaration?.targetIdentityHandle ?? null,
        declaration?.targetTypeMemberHandle ?? null,
        declaration?.targetType ?? null,
        declaration?.sourceAddressHandle ?? bindable.nameSourceAddressHandle ?? bindable.sourceAddressHandle,
        declaration?.fieldProvenance ?? [],
        declaration?.staticValueEvaluation ?? null,
        declaration?.memberTypes ?? [],
        contextType == null ? BindingContextSlotAssignmentAccessKind.Writable : declaration?.assignmentAccessKind ?? null,
        declaration?.targetTypeSourceMemberHandle ?? null,
      );
    });
  }

  private boundControllerBindingContextSlots(
    input: TemplateScopeConstructionRequest,
    definition: CustomElementDefinition,
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null,
    services: TemplateScopeConstructionServices,
  ): readonly BindingContextSlotDraft[] {
    const boundControllerValues = input.boundControllerValues;
    if (boundControllerValues == null) {
      return [];
    }
    const values = contextType != null
      ? boundControllerValues.readAll(controllerProductHandle, contextType)
      : boundControllerValues.isDefinitionContextController(controllerProductHandle)
        ? boundControllerValues.readAllDefinitionValues(definition.productHandle)
        : boundControllerValues.readExactControllerValues(controllerProductHandle);
    const valuesByProperty = new Map<string, RuntimeBoundControllerPropertyValue[]>();
    for (const value of values) {
      const propertyValues = valuesByProperty.get(value.propertyName) ?? [];
      propertyValues.push(value);
      valuesByProperty.set(value.propertyName, propertyValues);
    }
    return [...valuesByProperty.values()].flatMap((propertyValues) => {
      const propertyName = propertyValues[0]?.propertyName ?? null;
      return this.boundControllerBindingContextSlot(
        input,
        propertyValues,
        contextType,
        services,
        propertyName != null && boundControllerValues.definitionContextHasUnboundUseSite(
          controllerProductHandle,
          contextType,
          propertyName,
        ),
      );
    });
  }

  private boundControllerBindingContextSlot(
    input: TemplateScopeConstructionRequest,
    values: readonly RuntimeBoundControllerPropertyValue[],
    contextType: CheckerTypeReference | null,
    services: TemplateScopeConstructionServices,
    definitionHasUnboundUseSite: boolean,
  ): readonly BindingContextSlotDraft[] {
    const projections = values.flatMap((value, index) => {
      const projection = this.boundControllerPropertyTypeProjection(
        input,
        value,
        index,
        services,
      );
      return projection == null ? [] : [projection];
    });
    const value = values[0];
    if (value == null || projections.length === 0) {
      return [];
    }
    const declarationSlot = bindingContextSlotDraftForContextTypeMember(
      services.scopeNarrower.projector,
      contextType,
      value.propertyName,
    );
    const hasUnprojectedRuntimeAlternative = definitionHasUnboundUseSite
      || projections.length !== values.length;
    const declarationFallbackType = hasUnprojectedRuntimeAlternative
      ? declarationSlot?.targetType ?? null
      : null;
    if (hasUnprojectedRuntimeAlternative && declarationFallbackType == null) {
      return [];
    }
    const targetType = services.typeSupport.commonOrUnionTypeReference(
      [
        ...projections.map((projection) => projection.targetType),
        ...(declarationFallbackType == null ? [] : [declarationFallbackType]),
      ],
      `${input.localKey}:bound-controller:${value.propertyName}:use-types`,
      this.boundControllerPropertySourceAddressHandle(input, value),
    );
    if (targetType == null) {
      return [];
    }
    const sourceTypeMemberHandles = new Set(
      projections.map((projection) => projection.sourceTypeMember?.detailHandle ?? null),
    );
    const targetTypeSourceMemberHandle = !hasUnprojectedRuntimeAlternative
      && sourceTypeMemberHandles.size === 1
      ? [...sourceTypeMemberHandles][0] ?? null
      : null;
    return [new BindingContextSlotDraft(
      value.propertyName,
      declarationSlot?.targetIdentityHandle ?? null,
      declarationSlot?.targetTypeMemberHandle ?? null,
      targetType,
      declarationSlot?.sourceAddressHandle ?? this.boundControllerPropertySourceAddressHandle(input, value),
      declarationSlot?.fieldProvenance ?? [],
      null,
      declarationSlot?.memberTypes ?? [],
      declarationSlot?.assignmentAccessKind ?? null,
      targetTypeSourceMemberHandle,
    )];
  }

  private boundControllerPropertyTypeProjection(
    input: TemplateScopeConstructionRequest,
    value: RuntimeBoundControllerPropertyValue,
    index: number,
    services: TemplateScopeConstructionServices,
  ): BoundControllerPropertyTypeProjection | null {
    if (value.sourceValueProperty != null) {
      if (value.admittedSourceValueType == null) {
        return null;
      }
      const sourceTypeMember = value.admittedSourceMemberHandle == null
        ? null
        : services.scopeNarrower.projector.publication.readHotDetail(
            TypeSystemHotDetails.TypeMember,
            value.admittedSourceMemberHandle,
          );
      return {
        targetType: value.admittedSourceValueType,
        sourceTypeMember,
      };
    }
    if (value.expressionProductHandle == null || value.sourceScope == null) {
      return null;
    }
    const parse = readTemplateExpressionParse(
      services.scopeNarrower.projector.publication,
      value.expressionProductHandle,
    );
    const expression = parse == null ? null : bindingExpressionAstForParse(parse);
    if (expression == null) {
      return null;
    }
    const sourceSite = this.boundControllerSourceExpressionSite(
      input,
      expression,
      value,
      value.sourceAddressHandle,
    );
    return this.boundControllerSourceTypeProjection(
      input,
      sourceSite,
      value.propertyName,
      `${input.localKey}:bound-controller:${value.controllerProductHandle}:${value.propertyName}:source-slot:${index}`,
      services,
    );
  }

  private boundControllerSourceTypeProjection(
    input: TemplateScopeConstructionRequest,
    sourceSite: BoundControllerSourceExpressionSite,
    propertyName: string,
    sourceSlotLocalKey: string,
    services: TemplateScopeConstructionServices,
  ): BoundControllerPropertyTypeProjection | null {
    const sourceSlot = sourceSite.projection == null
      ? null
      : bindingContextSlotDraftForExpressionAccess(
        services.scopeNarrower.projector,
        sourceSite.projection.scope,
        sourceSite.projection.expression,
        sourceSlotLocalKey,
      );
    const targetType = this.boundControllerExpressionType(
      input,
      sourceSite,
      propertyName,
    ) ?? sourceSlot?.targetType;
    if (targetType == null) {
      return null;
    }
    const sourceTypeMember = sourceSlot?.targetType == null
      || !sameCheckerTypeReference(sourceSlot.targetType, targetType)
      ? null
      : bindingContextSlotTargetTypeSourceMember(
        services.scopeNarrower.projector.publication,
        sourceSlot,
      );
    return { targetType, sourceTypeMember };
  }

  private boundControllerPropertySourceAddressHandle(
    input: TemplateScopeConstructionRequest,
    value: RuntimeBoundControllerPropertyValue,
  ): AddressHandle | null {
    const definition = value.controllerDefinitionProductHandle == null
      ? null
      : input.expressionWorld.projector.publication.readProductDetail(
          ResourceProductDetails.Definition,
          value.controllerDefinitionProductHandle,
        );
    const bindable = definition instanceof CustomElementDefinition
      ? definition.bindables.find((candidate) => candidate.name === value.propertyName) ?? null
      : null;
    return bindable?.nameSourceAddressHandle ?? bindable?.sourceAddressHandle ?? null;
  }

  private boundControllerExpressionType(
    input: TemplateScopeConstructionRequest,
    sourceSite: BoundControllerSourceExpressionSite,
    propertyName: string,
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
    const evaluation = input.expressionWorld.evaluator(sourceSite.projection.resourceScope).evaluate(context);
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
    const bindingExpressionScopes = value.sourceBindingExpressionScopes;
    const projection = projectRuntimeSourceExpressionWithLifecycle({
      bindingProductHandle: value.bindingProductHandle,
      expressionProductHandle: value.expressionProductHandle,
      expressionChainIndex: value.sourceExpressionChainIndex,
      expressionResourcePlan: value.sourceExpressionResourcePlan,
      expression,
      sourceScope: value.sourceScope,
      resourceScope: value.sourceResourceScope,
      activeContainer: value.sourceDefaultContainer,
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
    const ownedProductHandles = ownedBindingInstructionProductHandles(instruction);
    const ownedInstructions = ownedProductHandles
      .map((productHandle) => frame.readInstruction(productHandle))
      .filter((candidate): candidate is TemplateInstruction => candidate != null);
    const nestedProductHandles = new Set(nestedInstructionProductHandlesForInstructions(ownedInstructions));
    ownedProductHandles.forEach((productHandle, index) => {
      if (nestedProductHandles.has(productHandle)) {
        return;
      }
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
      return this.constructStateBindingCommandScope(
        frame,
        base,
        instruction,
        localSuffix,
        controllerContext,
      );
    }

    if (instruction instanceof DispatchBindingInstruction) {
      const stateScope = this.constructStateBindingCommandScope(
        frame,
        base,
        instruction,
        localSuffix,
        controllerContext,
      );
      const emission = this.measure(frame.input, 'state-dispatch-event-scope', () =>
        this.constructListenerEventScope(frame, stateScope, instruction, localSuffix)
      );
      return frame.addDerivedScope(emission);
    }

    if (instruction instanceof ListenerBindingInstruction) {
      const emission = this.measure(frame.input, 'listener-event-scope', () =>
        this.constructListenerEventScope(frame, base, instruction, localSuffix)
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
    const promiseAssignment = ownerInstruction instanceof HydrateTemplateControllerInstruction
      ? frame.services.controllerFlow.promiseSettlementAssignmentProjection(frame, parent, ownerInstruction, localSuffix)
      : null;
    if (promiseAssignment?.valid === false) {
      return null;
    }
    const targetController = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      ownerInstruction.productHandle,
      controllerContext,
    );
    return this.constructRuntimeAssignmentStateForBinding(
      frame,
      parent,
      ownerInstruction,
      binding,
      `${localSuffix}:expression`,
      targetController,
      promiseAssignment == null ? undefined : promiseAssignment.valueType,
    );
  }

  private constructStateBindingCommandScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    instruction: StateBindingInstruction | DispatchBindingInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope {
    const projection = this.measure(frame.input, 'state-binding-command-scope', () =>
      new StateBindingScopeProjector(
        this.store,
        frame.input.expressionWorld.stateStoreSelectionForContainer(
          controllerContext?.containerFrame ?? null,
        ),
        frame.input.expressionWorld.projector,
      ).scopeForStoreName(
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
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: ListenerBindingInstruction | DispatchBindingInstruction,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    const input = frame.input;
    return frame.services.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:${localSuffix}:listener-event`,
      ownerProductHandle: instruction.productHandle,
      ownerIdentityHandle: instruction.identityHandle,
      base: parent,
      bindingContextSlots: [],
      overrideContextSlots: [frame.services.typeSupport.listenerEventSlot(input, instruction, localSuffix)],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.ListenerEvent,
        instruction.productHandle,
        instruction.sourceAddressHandle,
        null,
        ['$event'],
      )],
    }));
  }

  private constructRuntimeAssignmentScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: TemplateInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope | null {
    const bindables = bindablesForInstruction(
      frame.input.expressionWorld.projector.publication,
      instruction,
    );
    if (bindables.length === 0) {
      return null;
    }

    const targetController = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    let current = parent;
    let changed = false;
    for (const [index, productHandle] of bindableInstructionProductHandles(instruction).entries()) {
      const binding = frame.readInstruction(productHandle);
      if (!(binding instanceof PropertyBindingInstruction)) {
        continue;
      }
      const next = this.constructRuntimeAssignmentStateForBinding(
        frame,
        current,
        instruction,
        binding,
        `${localSuffix}:binding:${index}`,
        targetController,
        undefined,
        bindables,
      );
      if (next != null) {
        current = next;
        changed = true;
      }
    }
    return changed ? current : null;
  }

  private constructRuntimeAssignmentStateForBinding(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    ownerInstruction: TemplateInstruction,
    binding: PropertyBindingInstruction,
    localSuffix: string,
    targetController: RuntimeControllerFrame | null,
    assignedValueTypeOverride: CheckerTypeReference | null | undefined = undefined,
    ownerBindables: readonly BindableDefinition[] = bindablesForInstruction(
      frame.input.expressionWorld.projector.publication,
      ownerInstruction,
    ),
  ): BindingScope | null {
    const runtimeBinding = this.runtimeAssignmentRuntimeBinding(frame.input, binding, targetController);
    if (
      ownerBindables.length === 0
      || runtimeBinding == null
      || !bindingCanAssignToSource(runtimeBinding, frame.input.expressionResourcePlan)
    ) {
      return null;
    }
    const parse = frame.services.typeSupport.readParse(binding.expressionProductHandle);
    const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (expression == null) {
      return null;
    }
    const target = runtimeAssignmentTargetAstForExpression(expression);
    if (target?.$kind !== 'AccessScope' || target.name.name === '$host') {
      return null;
    }
    const lookup = parent.locate(target.name.name, target.ancestor);
    const targetScope = lookup.scope;
    if (targetScope == null || lookup.context == null) {
      return null;
    }
    const descendants = runtimeScopeDescendants(parent, targetScope);
    if (descendants == null) {
      return null;
    }
    const targetMember = runtimeAssignmentTargetMember(
      frame.input.expressionWorld.projector,
      ownerInstruction,
      binding,
      ownerBindables,
    );
    const targetMemberValueType = targetMember == null
      ? null
      : this.runtimeAssignmentTargetMemberValueType(frame, targetMember, localSuffix);
    const assignedValueType = assignedValueTypeOverride === undefined
      ? this.runtimeAssignmentTargetToSourceType(
          frame,
          parent,
          expression,
          targetMemberValueType,
          localSuffix,
          runtimeBinding,
        )
      : assignedValueTypeOverride;
    const existingSlot = lookup.slot;
    const targetType = assignedValueType ?? existingSlot?.targetType ?? targetMemberValueType;
    const targetTypeMemberHandle = existingSlot?.targetTypeMemberHandle ?? null;
    const targetSource = existingSlot == null && parse != null
      ? sourceAddressForRuntimeExpressionSpan(
          frame.input.expressionWorld.projector.publication,
          `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-target:${localKeyPart(target.name.name)}`,
          parse.sourceAddressHandle,
          target.name.span,
        )
      : { handle: existingSlot?.sourceAddressHandle ?? null, records: [] };
    const slot = new BindingContextSlotDraft(
      target.name.name,
      existingSlot?.targetIdentityHandle ?? null,
      targetTypeMemberHandle,
      targetType,
      targetSource.handle ?? binding.sourceAddressHandle,
      existingSlot?.fieldProvenance ?? [],
      null,
      [],
      existingSlot?.assignmentAccessKind
        ?? (existingSlot == null ? BindingContextSlotAssignmentAccessKind.Writable : null),
      targetMember != null
        && targetMemberValueType != null
        && targetType != null
        && sameCheckerTypeReference(targetMemberValueType, targetType)
        ? targetMember.detailHandle
        : existingSlot?.targetType != null
          && targetType != null
          && sameCheckerTypeReference(existingSlot.targetType, targetType)
          ? existingSlot.targetTypeSourceMemberHandle
          : null,
    );
    const assignmentEmission = frame.services.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment`,
      ownerProductHandle: binding.productHandle,
      ownerIdentityHandle: binding.identityHandle,
      base: targetScope,
      bindingContextSlots: lookup.lookupKind === BindingScopeLookupKind.OverrideContext ? [] : [slot],
      overrideContextSlots: lookup.lookupKind === BindingScopeLookupKind.OverrideContext ? [slot] : [],
      sourceAddressHandle: binding.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeAssignment,
        binding.productHandle,
        binding.sourceAddressHandle,
        null,
        existingSlot == null ? [slot.name] : [],
        [slot.name],
        lookup.context.contextKind,
      )],
    }));
    let current = frame.addDerivedScope(new BindingScopeConstructionEmission(
      assignmentEmission.bindingContext,
      assignmentEmission.overrideContext,
      assignmentEmission.scope,
      [...targetSource.records, ...assignmentEmission.records],
      assignmentEmission.bindingContextMaterialized,
    ));
    for (const [index, descendant] of [...descendants].reverse().entries()) {
      current = frame.addDerivedScope(frame.services.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
        localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-rebase:${index}`,
        ownerProductHandle: binding.productHandle,
        ownerIdentityHandle: binding.identityHandle,
        base: descendant,
        runtimeParent: current,
        bindingContextSlots: [],
        overrideContextSlots: [],
        sourceAddressHandle: binding.sourceAddressHandle,
        scopeCreators: [new BindingScopeCreator(
          BindingScopeCreatorKind.RuntimeAssignment,
          binding.productHandle,
          binding.sourceAddressHandle,
        )],
      })));
    }
    return current;
  }

  private runtimeAssignmentRuntimeBinding(
    input: TemplateScopeConstructionRequest,
    binding: PropertyBindingInstruction,
    targetController: RuntimeControllerFrame | null,
  ): PropertyBinding | null {
    const candidates = input.runtimeBindings.readBindingsForInstruction(binding.productHandle)
      .filter((candidate): candidate is PropertyBinding => candidate instanceof PropertyBinding)
      .filter((candidate) =>
        candidate.instructionProductHandle === binding.productHandle
        && expressionProductHandleForBinding(candidate) === binding.expressionProductHandle
      )
      .filter((candidate) => targetController == null
        || input.runtimeBindings.requireRenderContextForBinding(candidate.productHandle).targetController.productHandle
          === targetController.productHandle);
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
    expression: ExpressionAstNode,
    targetValueType: CheckerTypeReference | null,
    localSuffix: string,
    runtimeBinding: PropertyBinding,
  ): CheckerTypeReference | null {
    if (targetValueType == null) {
      return null;
    }
    const resourceScope = frame.input.runtimeBindings
      .requireRenderContextForBinding(runtimeBinding.productHandle)
      .resourceScope;
    const evaluator = frame.input.expressionWorld.evaluator(resourceScope);
    const projection = projectRuntimeBindingSourceExpressionInScope(
      frame.input.runtimeBindings,
      frame.services.bindingExpressionScopes,
      frame.input.expressionResourcePlan,
      {
        binding: runtimeBinding,
        expressionProductHandle: runtimeBinding.expressionProductHandle,
        expressionChainIndex: 0,
        expression,
        localKey: `${frame.input.localKey}:scope:${localSuffix}:runtime-assignment-writeback`,
        sourceScope: parent,
      },
    );
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
    frame: TemplateScopeConstructionFrame,
    instructionProductHandle: ProductHandle,
  ): DynamicCapturedAttributeContext | null {
    const context = frame.input.runtimeBindings.readDynamicInstructionContext(instructionProductHandle);
    const contextInstructionProductHandle = context?.hydrationContext.instructionProductHandle ?? null;
    const contextControllerProductHandle = context?.hydrationContext.controller.productHandle ?? null;
    return context == null
      || contextInstructionProductHandle == null
      || contextControllerProductHandle == null
      ? null
      : {
        instructionProductHandle: contextInstructionProductHandle,
        controllerProductHandle: contextControllerProductHandle,
      };
  }

  private capturedAttributeSourceScope(
    frame: TemplateScopeConstructionFrame,
    context: DynamicCapturedAttributeContext,
    controller: RuntimeControllerFrame | null,
  ): BindingScope | null {
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
    return controllerScope?.runtimeParent ?? null;
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
      : frame.input.expressionWorld.projector.publication.readProductDetail(
          ResourceProductDetails.Definition,
          instruction.definitionProductHandle,
        );
    if (!(definition instanceof CustomElementDefinition)) {
      return null;
    }
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    const emission = frame.services.scopeMaterializer.prepare(BindingScope.forCustomElementController({
      localKey: `${frame.input.localKey}:scope:hydrate-element:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      viewModelType: definition.target.targetType,
      bindingContextSlots: this.definitionBindingContextSlots(
        frame.input,
        definition,
        controller?.productHandle ?? instruction.productHandle,
        frame.services,
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
    projectionContext: TemplateProjectionContext | null,
  ): void {
    const controller = frame.input.runtimeBindings.readControllerForInstructionUnderParent(
      instruction.productHandle,
      controllerContext,
    );
    const resource = frame.input.projectContext.readResourceForDefinition(
      controller?.definitionProductHandle ?? instruction.definitionProductHandle,
    );
    if (resource == null || this.hasRecursiveCustomElementDefinitionAncestor(controller)) {
      return;
    }
    this.constructCompiledTemplateScopes(
      frame,
      resource.compiledTemplateEmission,
      childScope,
      `${localSuffix}:custom-element-view`,
      controller,
      projectionContext,
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
      profiling.kernel,
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
    effects.forEach((effect, index) => {
      if (effect instanceof IteratorBindingScopeEffect) {
        const emission = this.measure(frame.input, 'iterator-scope', () =>
          this.constructIteratorScope(frame, current, effect, `${localSuffix}:iterator:${index}`)
        );
        current = frame.addDerivedScope(emission);
      }
      if (effect instanceof LetBindingScopeEffect) {
        current = this.constructLetEffectScope(
          frame,
          current,
          effect,
          `${localSuffix}:let:${index}`,
          effect.sourceAddressHandle,
        );
      }
    });

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
    const localProjection = this.measure(input, 'iterator-local-slots', () =>
      this.iteratorLocalSlots(iteratorFrame)
    );
    frame.addScopeSupportRecords(localProjection.sourceRecords);
    const localSlots = localProjection.slots;
    const overrideSlots = this.measure(input, 'iterator-override-slots', () =>
      frame.services.typeSupport.repeatOverrideSlots(
        input,
        localSuffix,
        effect.sourceAddressHandle,
        iteratorFrame.iteratorProjection.elementType,
        this.iteratorContextualMode(iteratorFrame),
      )
    );
    const prepared = this.measure(input, 'iterator-scope-prepare', () => frame.services.scopeMaterializer.prepare(BindingScope.fromRepeatedItem({
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
        null,
        [...localSlots, ...overrideSlots].map((slot) => slot.name),
      )],
    })));
    const emission = new BindingScopeConstructionEmission(
      prepared.bindingContext,
      prepared.overrideContext,
      prepared.scope,
      prepared.records,
      prepared.bindingContextMaterialized,
    );
    this.recordIteratorTailExpressionScopes(frame, iteratorFrame, emission.scope);
    return emission;
  }

  private recordIteratorTailExpressionScopes(
    frame: TemplateScopeConstructionFrame,
    iteratorFrame: IteratorScopeMaterializationFrame,
    repeatedItemScope: BindingScope,
  ): void {
    const binding = iteratorFrame.binding;
    if (binding == null) {
      return;
    }
    const instruction = frame.readInstruction(binding.instructionProductHandle);
    if (!(instruction instanceof IteratorBindingInstruction)) {
      return;
    }
    const controllerProductHandle = frame.input.runtimeBindings
      .requireRenderContextForBinding(binding.productHandle)
      .sourceController.productHandle;
    for (const handle of instruction.tailInstructionProductHandles) {
      const tail = frame.readInstruction(handle);
      if (!(tail instanceof MultiAttrInstruction) || tail.expressionProductHandle == null) {
        continue;
      }
      const scope = tail.target === 'key'
        ? repeatedItemScope
        : tail.target === 'contextual'
          ? iteratorFrame.parent
          : null;
      if (scope != null) {
        frame.addInstructionScope(tail.productHandle, scope, controllerProductHandle);
      }
    }
  }

  private iteratorScopeMaterializationFrame(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): IteratorScopeMaterializationFrame {
    const input = frame.input;
    const candidateBinding = effect.binding.productHandle == null
      ? null
      : input.runtimeBindings.readBinding(effect.binding.productHandle);
    const binding = candidateBinding != null && isRuntimeExpressionBinding(candidateBinding)
      ? candidateBinding
      : null;
    const renderContext = binding == null
      ? null
      : input.runtimeBindings.requireRenderContextForBinding(binding.productHandle);
    const sourceValueEvaluator = input.evaluation == null || renderContext == null
      ? null
      : RuntimeBindingSourceValueEvaluator.create(
          input.expressionWorld.projector.publication,
          input.expressionWorld.projector,
          input.evaluation,
          input.boundControllerValues,
          input.sourceValueActivationView ?? null,
          renderContext.requireActiveContainer(),
        );
    const iteratorProjection = this.measure(input, 'iterator-type-projection', () =>
      frame.services.typeSupport.iteratorProjection(input, parent, effect, localSuffix)
    );
    return {
      input,
      parent,
      effect,
      localSuffix,
      sourceValueEvaluator,
      binding,
      resourceScope: renderContext?.resourceScope ?? null,
      bindingExpressionScopes: frame.services.bindingExpressionScopes,
      iteratorProjection,
      localTypes: new Map(iteratorProjection.localProjection.locals.map((local) => [local.name, local.typeReference])),
      readInstruction: (productHandle) => frame.readInstruction(productHandle),
    };
  }

  private iteratorContextualMode(frame: IteratorScopeMaterializationFrame): boolean | null {
    const instruction = frame.binding == null
      ? null
      : frame.readInstruction(frame.binding.instructionProductHandle);
    if (!(instruction instanceof IteratorBindingInstruction)) {
      return null;
    }
    const contextual = instruction.tailInstructionProductHandles
      .map((handle) => frame.readInstruction(handle))
      .find((candidate): candidate is MultiAttrInstruction =>
        candidate instanceof MultiAttrInstruction && candidate.target === 'contextual'
      );
    if (contextual == null) {
      return true;
    }
    if (contextual.command == null) {
      return contextual.value !== 'false' && contextual.value.length > 0;
    }
    return null;
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
        KernelVocabulary.Binding.ScopeEffect.key,
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
      const declaration = iteratorProjection.parse?.result.kind === ExpressionParseResultKind.IteratorSuccess
        ? iteratorProjection.parse.result.ast.declaration
        : null;
      if (
        effect.templateControllerName === 'virtual-repeat'
        && (declaration?.$kind === 'ObjectBindingPattern' || declaration?.$kind === 'ArrayBindingPattern')
      ) {
        frame.addScopeIssue(this.scopeIssuePublisher.publish(
          `${input.localKey}:scope:${localSuffix}:unsupported-virtual-repeat-binding-pattern`,
          KernelVocabulary.Binding.ScopeEffect.key,
          effect.productHandle,
          effect.identityHandle,
          RuntimeBindingScopeIssuePhase.IteratorLocalProjection,
          RuntimeBindingScopeIssueKind.UnsupportedRepeatDeclaration,
          RuntimeBindingScopeIssueCertainty.Definite,
          'Virtual repeat requires a single binding identifier and does not materialize destructured locals',
          null,
          effect.sourceAddressHandle,
          declaration.span,
          null,
        ));
        // VirtualRepeat only reads BindingIdentifier.name. Core Repeat's
        // object/array projection path never runs, so its destructuring
        // runtime issues do not apply to this rejected declaration.
        return;
      }
      iteratorProjection.localProjection.runtimeIssues.forEach((issue, index) => {
        frame.addScopeIssue(this.scopeIssuePublisher.publish(
          `${input.localKey}:scope:${localSuffix}:issue:${index}`,
          KernelVocabulary.Binding.ScopeEffect.key,
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
  ): IteratorLocalSlotProjection {
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
    const declaration = iteratorProjection.parse?.result.kind === ExpressionParseResultKind.IteratorSuccess
      ? iteratorProjection.parse.result.ast.declaration
      : null;
    if (
      effect.templateControllerName === 'virtual-repeat'
      && (declaration?.$kind === 'ObjectBindingPattern' || declaration?.$kind === 'ArrayBindingPattern')
    ) {
      return new IteratorLocalSlotProjection([], []);
    }
    const localSources = this.iteratorLocalSourceAddresses(input, effect, iteratorProjection);
    return new IteratorLocalSlotProjection(effect.localNames.map((name) => new BindingContextSlotDraft(
      name,
      null,
      null,
      localTypes.has(name)
        ? localTypes.get(name) ?? null
        : elementTypeForFlattenedIteratorName(effect.localNames, iteratorProjection.elementType),
      localSources.handles.get(name) ?? effect.sourceAddressHandle,
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
        input.expressionResourcePlan,
        frame.resourceScope,
      ),
      [],
      BindingContextSlotAssignmentAccessKind.Writable,
    )), localSources.records);
  }

  private iteratorLocalSourceAddresses(
    input: TemplateScopeConstructionRequest,
    effect: IteratorBindingScopeEffect,
    iteratorProjection: IteratorScopeProjection,
  ): { readonly handles: ReadonlyMap<string, AddressHandle>; readonly records: readonly KernelStoreRecord[] } {
    const parse = iteratorProjection.parse;
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return { handles: new Map(), records: [] };
    }
    const sources = new Map<string, AddressHandle>();
    const records: KernelStoreRecord[] = [];
    for (const identifier of bindingIdentifiersForPattern(parse.result.ast.declaration)) {
      const source = sourceAddressForRuntimeExpressionSpan(
        input.expressionWorld.projector.publication,
        [
          'iterator-local-source',
          effect.productHandle,
          localKeyPart(identifier.name.name),
          String(identifier.name.span.start),
        ].join(':'),
        effect.sourceAddressHandle,
        identifier.name.span,
      );
      records.push(...source.records);
      if (source.handle != null && !sources.has(identifier.name.name)) {
        sources.set(identifier.name.name, source.handle);
      }
    }
    return { handles: sources, records };
  }

  private constructLetElementScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    instruction: HydrateLetElementInstruction,
    localSuffix: string,
    controllerContext: RuntimeControllerFrame | null,
  ): BindingScope {
    const letEffects = frame.input.runtimeBindings.readScopeEffectsForOwner(instruction.productHandle)
      .filter((effect): effect is LetBindingScopeEffect => effect instanceof LetBindingScopeEffect);
    const effectsByBinding = new Map(letEffects.flatMap((effect) =>
      effect.binding.productHandle == null ? [] : [[effect.binding.productHandle, effect] as const]
    ));
    let current = base;
    ownedBindingInstructionProductHandles(instruction).forEach((productHandle, index) => {
      const childInstruction = frame.readInstruction(productHandle);
      if (childInstruction == null) {
        return;
      }
      frame.addInstructionScope(
        childInstruction.productHandle,
        this.constructInstructionExpressionScope(
          frame,
          current,
          childInstruction,
          `${localSuffix}:owned:${index}:expression`,
          controllerContext,
          instruction,
        ),
        controllerContext?.productHandle ?? null,
      );
      const runtimeBindings = (controllerContext?.readBindings()
        ?? frame.input.runtimeBindings.readBindingsForInstruction(childInstruction.productHandle))
        .filter((binding) => binding.instructionProductHandle === childInstruction.productHandle);
      const runtimeBinding = runtimeBindings.length === 1 ? runtimeBindings[0]! : null;
      const effect = runtimeBinding == null
        ? null
        : effectsByBinding.get(runtimeBinding.productHandle) ?? null;
      if (effect != null) {
        current = this.constructLetEffectScope(
          frame,
          current,
          effect,
          `let-element:${localSuffix}:${index}`,
          instruction.sourceAddressHandle,
        );
      }
    });
    return current;
  }

  private constructLetEffectScope(
    frame: TemplateScopeConstructionFrame,
    base: BindingScope,
    effect: LetBindingScopeEffect,
    localSuffix: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    return this.measure(frame.input, 'let-scope', () => {
      const existingSlot = this.letTargetSlot(base, effect);
      const slot = this.letSlot(frame, base, effect, existingSlot);
      return frame.addDerivedScope(frame.services.scopeMaterializer.prepare(BindingScope.fromLetBindings({
        localKey: `${frame.input.localKey}:scope:${localSuffix}`,
        ownerProductHandle: effect.productHandle,
        ownerIdentityHandle: effect.identityHandle,
        base,
        bindingContextSlots: effect.targetContext === LetBindingTargetContext.BindingContext ? [slot] : [],
        overrideContextSlots: effect.targetContext === LetBindingTargetContext.OverrideContext ? [slot] : [],
        sourceAddressHandle: effect.sourceAddressHandle ?? sourceAddressHandle,
        scopeCreators: [new BindingScopeCreator(
          BindingScopeCreatorKind.RuntimeBindingScopeEffect,
          effect.productHandle,
          effect.sourceAddressHandle,
          null,
          existingSlot == null ? [slot.name] : [],
        )],
      })));
    });
  }

  private letSlot(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
    existingSlot: BindingContextSlot | null,
  ): BindingContextSlotDraft {
    const input = frame.input;
    const targetType = frame.services.typeSupport.letTargetType(input, parent, effect);
    return new BindingContextSlotDraft(
      effect.target,
      existingSlot?.targetIdentityHandle ?? null,
      existingSlot?.targetTypeMemberHandle ?? null,
      targetType,
      effect.targetSourceAddressHandle ?? effect.sourceAddressHandle,
      existingSlot?.fieldProvenance ?? [],
      this.letStaticValue(frame, parent, effect),
      [],
      existingSlot?.assignmentAccessKind
        ?? (existingSlot == null ? BindingContextSlotAssignmentAccessKind.Writable : null),
      existingSlot?.targetType != null
        && targetType != null
        && sameCheckerTypeReference(existingSlot.targetType, targetType)
        ? existingSlot.targetTypeSourceMemberHandle
        : null,
    );
  }

  private letTargetSlot(
    scope: BindingScope,
    effect: LetBindingScopeEffect,
  ): BindingContextSlot | null {
    return effect.targetContext === LetBindingTargetContext.BindingContext
      ? scope.bindingContext.lookup(effect.target)
      : scope.overrideContext.lookup(effect.target);
  }

  private letStaticValue(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (effect.literalValue != null) {
      return RuntimeBindingSourceValueEvaluation.value(
        evaluationPrimitiveValueFromExpressionValue(effect.literalValue),
      );
    }
    const evaluationFrame = this.letStaticValueEvaluationFrame(frame, parent, effect);
    if (evaluationFrame == null) {
      return openBindingSourceSlotNoStaticValue(
        `Let target '${effect.target}' did not expose an evaluable source expression.`,
      );
    }
    return this.evaluateLetStaticValue(evaluationFrame);
  }

  private letStaticValueEvaluationFrame(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): LetStaticValueEvaluationFrame | null {
    const input = frame.input;
    if (input.evaluation == null) {
      return null;
    }
    const parse = frame.services.typeSupport.readParse(effect.expressionProductHandle);
    const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (expression == null) {
      return null;
    }
    const candidateBinding = effect.binding.productHandle == null
      ? null
      : input.runtimeBindings.readBinding(effect.binding.productHandle);
    const binding = candidateBinding != null && isRuntimeExpressionBinding(candidateBinding)
      ? candidateBinding
      : null;
    if (binding == null) {
      return null;
    }
    const renderContext = input.runtimeBindings.requireRenderContextForBinding(binding.productHandle);
    const contextProjection = projectRuntimeBindingSourceValueContextInScope({
      runtimeBindings: input.runtimeBindings,
      bindingExpressionScopes: frame.services.bindingExpressionScopes,
      expressionResourcePlan: input.expressionResourcePlan,
      binding,
      expressionProductHandle: effect.expressionProductHandle,
      expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
      expression,
      localKey: `${input.localKey}:let:${effect.productHandle}:source-value`,
      sourceScope: parent,
      activeContainer: renderContext.requireActiveContainer(),
      resourceScope: renderContext.resourceScope,
    });
    return {
      input,
      effect,
      sourceValueEvaluator: RuntimeBindingSourceValueEvaluator.create(
        input.expressionWorld.projector.publication,
        input.expressionWorld.projector,
        input.evaluation,
        input.boundControllerValues,
        input.sourceValueActivationView ?? null,
        renderContext.requireActiveContainer(),
      ),
      contextProjection,
    };
  }

  private evaluateLetStaticValue(
    frame: LetStaticValueEvaluationFrame,
  ): RuntimeBindingSourceValueEvaluation {
    const { contextProjection, effect, sourceValueEvaluator } = frame;
    if (contextProjection.context == null) {
      return openBindingSourceSlotNoStaticValue(
        `Let target '${effect.target}' did not retain a binding-source evaluation context.`,
      );
    }
    const evaluation = sourceValueEvaluator.evaluate(contextProjection.context);
    return evaluation.value != null
      ? evaluation
      : bindingSourceValueEvaluationWithPressure(
          openBindingSourceSlotNoStaticValue(
            `Let target '${effect.target}' did not retain a usable source value.`,
          ),
          [evaluation],
        );
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
  if (instruction instanceof HydrateTemplateControllerInstruction) {
    return instruction.bindingInstructionProductHandles;
  }
  return [];
}

function bindablesForInstruction(
  store: ProductDetailReadView,
  instruction: TemplateInstruction,
): readonly BindableDefinition[] {
  if (
    !(instruction instanceof HydrateElementInstruction)
    && !(instruction instanceof HydrateAttributeInstruction)
    && !(instruction instanceof HydrateTemplateControllerInstruction)
  ) {
    return [];
  }
  const definition = instruction.definitionProductHandle == null
    ? null
    : store.readProductDetail(ResourceProductDetails.Definition, instruction.definitionProductHandle);
  return definition != null && 'bindables' in definition
    ? definition.bindables
    : [];
}

function bindingCanAssignToSource(
  binding: PropertyBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): boolean {
  const bindingMode = expressionResourcePlan.effectivePropertyBindingMode(binding);
  return templateBindingModeIncludesTargetToSource(bindingMode);
}

function runtimeAssignmentTargetMember(
  projector: CheckerTypeProjector,
  instruction: TemplateInstruction,
  binding: PropertyBindingInstruction,
  bindables: readonly BindableDefinition[],
): CheckerTypeMember | null {
  const bindable = bindables.find((candidate) => candidate.name === binding.targetProperty) ?? null;
  return bindable == null
    ? null
    : bindableTargetMember(projector, instruction, bindable);
}

function bindableTargetMember(
  projector: CheckerTypeProjector,
  instruction: TemplateInstruction,
  bindable: BindableDefinition,
): CheckerTypeMember | null {
  if (
    !(instruction instanceof HydrateElementInstruction)
    && !(instruction instanceof HydrateAttributeInstruction)
    && !(instruction instanceof HydrateTemplateControllerInstruction)
  ) {
    return null;
  }
  const definition = instruction.definitionProductHandle == null
    ? null
    : projector.publication.readProductDetail(ResourceProductDetails.Definition, instruction.definitionProductHandle);
  const targetTypeProductHandle = definition?.target.targetType?.productHandle ?? null;
  if (targetTypeProductHandle == null) {
    return null;
  }
  const targetType = projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  return targetType == null
    ? null
    : readOrProjectCheckerTypeMembersInProjection(projector, targetType, targetTypeProductHandle)
      .find((member) => member.name === bindable.name) ?? null;
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

function runtimeBindingTargetsProperty(
  binding: RuntimeExpressionBinding,
  propertyName: string,
): boolean {
  return (binding instanceof PropertyBinding || binding instanceof InterpolationBinding)
    && binding.target === propertyName;
}

function instructionTargetsProperty(
  instruction: TemplateInstruction | null,
  propertyName: string,
): instruction is PropertyBindingInstruction | InterpolationInstruction | SetPropertyInstruction {
  return (
    instruction instanceof PropertyBindingInstruction
    || instruction instanceof SetPropertyInstruction
  )
    ? instruction.targetProperty === propertyName
    : instruction instanceof InterpolationInstruction && instruction.target === propertyName;
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

function runtimeScopeDescendants(
  scope: BindingScope,
  target: BindingScope,
): readonly BindingScope[] | null {
  const descendants: BindingScope[] = [];
  let current: BindingScope | null = scope;
  while (current != null && current.productHandle !== target.productHandle) {
    descendants.push(current);
    current = current.runtimeParent;
  }
  return current == null ? null : descendants;
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

function distinctScopeConstructionEmissions(
  emissions: readonly BindingScopeConstructionEmission[],
): readonly BindingScopeConstructionEmission[] {
  const byScope = new Map<ProductHandle, BindingScopeConstructionEmission>();
  for (const emission of emissions) {
    byScope.set(emission.scope.productHandle, emission);
  }
  return [...byScope.values()];
}

function runtimeScopeIssueKind(
  kind: CheckerBindingPatternRuntimeIssueKind,
): RuntimeBindingScopeIssueKind {
  switch (kind) {
    case CheckerBindingPatternRuntimeIssueKind.ArrayRestNonArray:
      return RuntimeBindingScopeIssueKind.ArrayRestNonArray;
    case CheckerBindingPatternRuntimeIssueKind.DestructuringNonObject:
      return RuntimeBindingScopeIssueKind.DestructuringNonObject;
    case CheckerBindingPatternRuntimeIssueKind.RepeatObjectBindingNullish:
      return RuntimeBindingScopeIssueKind.RepeatObjectBindingNullish;
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

function bindingIdentifiersForPattern(
  pattern: BindingIdentifierOrPattern,
): readonly BindingIdentifier[] {
  switch (pattern.$kind) {
    case 'BindingIdentifier':
      return [pattern];
    case 'BindingPatternDefault':
      return bindingIdentifiersForPattern(pattern.target);
    case 'BindingPatternHole':
      return [];
    case 'ArrayBindingPattern':
      return [
        ...pattern.elements.flatMap((element) => bindingIdentifiersForPattern(element)),
        ...(pattern.rest == null ? [] : bindingIdentifiersForPattern(pattern.rest)),
      ];
    case 'ObjectBindingPattern':
      return [
        ...pattern.properties.flatMap((property) => bindingIdentifiersForPattern(property.value)),
        ...(pattern.rest == null ? [] : bindingIdentifiersForPattern(pattern.rest)),
      ];
  }
}
