import {
  BindingScopeConditionPolarity,
  BindingScopeCreator,
  BindingScopeCreatorKind,
  BindingScope,
} from '../configuration/scope.js';
import {
  BindingScopeConstructionEmission,
  BindingScopeMaterializer,
} from '../configuration/scope-materializer.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { MaterializationRecord } from '../kernel/materialization.js';
import { OpenSeam, OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  type RuntimeBindingExpressionScopeProjectionReader,
} from '../observation/runtime-binding-expression-scope.js';
import {
  aggregateRuntimeBindingSourceExpressionChainIndex,
  RuntimeBindingSourceExpressionProjectionKind,
  projectRuntimeBindingSourceExpressionInScope,
} from '../observation/runtime-binding-source-expression-context.js';
import {
  CheckerExpressionScopeNarrower,
  CheckerExpressionScopeNarrowingPolarity,
  type CheckerExpressionScopeNarrowingRequest,
  type CheckerExpressionScopeNarrowingResult,
} from '../type-system/expression-scope-narrower.js';
import { CheckerTypeNullishPresence } from '../type-system/checker-related-types.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  HydrateTemplateControllerInstruction,
  type PropertyBindingInstruction,
} from './instruction-ir.js';
import {
  BuiltInTemplateControllerChildScopeKind,
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForInstruction,
} from './template-controller-semantics.js';
import {
  TemplateControllerPromiseSettlementKind,
  type TemplateControllerFlowApplication,
  type TemplateControllerPromiseState,
} from './template-controller-flow-state.js';
import {
  templateControllerValueExpressionProductHandle,
  templateControllerValueProperty,
  templateControllerValuePropertyBinding,
} from './template-controller-value.js';
import { templateControllerRuntimeValueBinding } from './template-controller-binding.js';
import { staticTemplateControllerBooleanProperty } from './template-controller-value.js';
import { templateControllerSwitchCaseBranch } from './template-controller-switch-branch.js';
import type {
  TemplateScopeConstructionFrame,
  TemplateScopeConstructionRequest,
} from './template-controller-scope-materializer.js';
import {
  RuntimeBindingScopeIssueCertainty,
  RuntimeBindingScopeIssueKind,
  RuntimeBindingScopeIssuePhase,
  type RuntimeBindingScopeIssuePublisher,
} from './runtime-binding-scope-issue.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import type { TemplateScopeTypeProjector } from './template-scope-type-projector.js';
import {
  type AppTemplateControllerScopeEffect,
  AppTemplateControllerScopeEffectKind,
  readAppTemplateControllerScopeEffect,
} from './template-controller-scope-source.js';

interface TemplateControllerSourceExpressionSite {
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly sourceAddressHandle: AddressHandle | null;
}

export interface TemplateControllerPromiseAssignmentProjection {
  readonly valid: boolean;
  readonly valueType: CheckerTypeReference | null;
}

/**
 * Applies built-in template-controller flow semantics to runtime Scope construction.
 *
 * The outer scope materializer owns template-order traversal. This class owns the child-scope decision once traversal
 * reaches a `HydrateTemplateControllerInstruction`, including branch link hooks and TypeChecker-backed narrowed scopes.
 */
export class TemplateControllerFlowScopeMaterializer {
  private readonly appScopeEffectByDefinition = new Map<ProductHandle, AppTemplateControllerScopeEffect>();

  constructor(
    private readonly store: KernelStore,
    private readonly scopeMaterializer: BindingScopeMaterializer,
    private readonly scopeNarrower: CheckerExpressionScopeNarrower,
    private readonly typeSupport: TemplateScopeTypeProjector,
    private readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
    private readonly scopeIssuePublisher: RuntimeBindingScopeIssuePublisher,
    private readonly constructScopeEffects: (
      frame: TemplateScopeConstructionFrame,
      parent: BindingScope,
      ownerProductHandle: ProductHandle,
      localSuffix: string,
    ) => BindingScope | null,
    private readonly constructRuntimeAssignmentScope: (
      frame: TemplateScopeConstructionFrame,
      parent: BindingScope,
      ownerInstruction: HydrateTemplateControllerInstruction,
      binding: PropertyBindingInstruction,
      localSuffix: string,
      controller: RuntimeControllerFrame | null,
      assignedValueType: CheckerTypeReference | null,
    ) => BindingScope | null,
  ) {}

  promiseSettlementAssignmentProjection(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
  ): TemplateControllerPromiseAssignmentProjection | null {
    const flowKind = frameworkTemplateControllerSemanticsForInstruction(
      this.scopeNarrower.projector.publication,
      instruction,
    )?.flowKind ?? null;
    const settlementKind = flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
      ? TemplateControllerPromiseSettlementKind.Fulfilled
      : flowKind === BuiltInTemplateControllerFlowKind.PromiseRejected
        ? TemplateControllerPromiseSettlementKind.Rejected
        : null;
    if (settlementKind == null) {
      return null;
    }
    const promiseState = frame.flowState.readPromise(parent);
    return promiseState == null
      ? { valid: false, valueType: null }
      : {
        valid: true,
        valueType: this.typeSupport.promiseSettlementValueType(
          frame.input,
          instruction,
          promiseState,
          settlementKind,
          localSuffix,
        ),
      };
  }

  constructChildScope(
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

    const semantics = frameworkTemplateControllerSemanticsForInstruction(
      this.scopeNarrower.projector.publication,
      instruction,
    );
    switch (semantics?.flowKind) {
      case BuiltInTemplateControllerFlowKind.ConditionalElse:
        return this.constructConditionalElseScope(frame, parent, instruction, controller, localSuffix);
      case BuiltInTemplateControllerFlowKind.PromisePending:
      case BuiltInTemplateControllerFlowKind.PromiseFulfilled:
      case BuiltInTemplateControllerFlowKind.PromiseRejected:
        return this.constructPromiseBranchScope(
          frame,
          parent,
          instruction,
          controller,
          semantics.flowKind,
          localSuffix,
        );
      case BuiltInTemplateControllerFlowKind.SwitchCase:
      case BuiltInTemplateControllerFlowKind.SwitchDefault:
        return this.constructSwitchCaseScope(frame, parent, instruction, controller, localSuffix);
      case BuiltInTemplateControllerFlowKind.ValueScope:
        return semantics.childScopeKind === BuiltInTemplateControllerChildScopeKind.ValueBindingContext
          ? this.constructValueScope(frame, parent, instruction, controller, localSuffix)
          : this.constructPassThroughScope(frame, parent);
      case BuiltInTemplateControllerFlowKind.Promise:
        return semantics.childScopeKind === BuiltInTemplateControllerChildScopeKind.EmptyObjectBindingContext
          ? this.constructPromiseScope(frame, parent, instruction, controller, localSuffix)
          : this.constructPassThroughScope(frame, parent);
      case BuiltInTemplateControllerFlowKind.Switch:
        return this.constructSwitchScope(frame, parent, instruction, controller);
      case BuiltInTemplateControllerFlowKind.Conditional:
        return this.constructConditionalScope(frame, parent, instruction, controller, localSuffix);
      case BuiltInTemplateControllerFlowKind.Iteration:
      case BuiltInTemplateControllerFlowKind.PassThrough:
        return this.constructPassThroughScope(frame, parent);
      case undefined:
        return this.constructAppOwnedTemplateControllerScope(
          frame,
          parent,
          instruction,
          controller,
          localSuffix,
        );
    }
  }

  finishFlowState(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    childScope: BindingScope,
  ): void {
    const semantics = frameworkTemplateControllerSemanticsForInstruction(
      this.scopeNarrower.projector.publication,
      instruction,
    );
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Promise) {
      frame.flowState.forgetPromise(childScope);
    }
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Switch) {
      frame.flowState.forgetSwitch(childScope);
    }
  }

  private constructConditionalElseScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    const previousIf = frame.flowState.consumeIf(parent);
    if (previousIf != null) {
      this.recordTemplateControllerLink(
        frame,
        controller,
        instruction,
        previousIf.instruction,
        previousIf.controller,
      );
      const emission = this.constructIfNarrowedScope(
        frame.input,
        parent,
        previousIf.instruction,
        instruction,
        previousIf.controller,
        controller,
        CheckerExpressionScopeNarrowingPolarity.Falsy,
        `${localSuffix}:else-falsy`,
      );
      if (emission != null) {
        return frame.addDerivedScope(emission);
      }
      return frame.addDerivedScope(this.constructConditionBranchScope(
        frame.input,
        parent,
        previousIf.instruction,
        instruction,
        controller,
        `${localSuffix}:else-branch`,
        BindingScopeConditionPolarity.Falsy,
      ));
    }
    return parent;
  }

  private constructPromiseBranchScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    flowKind: BuiltInTemplateControllerFlowKind,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const promiseState = frame.flowState.readPromise(parent);
    if (promiseState != null) {
      this.recordTemplateControllerLink(
        frame,
        controller,
        instruction,
        promiseState.application.instruction,
        promiseState.application.controller,
      );
    }
    if (flowKind === BuiltInTemplateControllerFlowKind.PromisePending) {
      return parent;
    }
    const assignment = this.promiseSettlementAssignmentProjection(frame, parent, instruction, localSuffix);
    const binding = templateControllerValuePropertyBinding(this.scopeNarrower.projector.publication, instruction);
    return assignment?.valid !== true || binding == null
      ? parent
      : this.constructRuntimeAssignmentScope(
          frame,
          parent,
          instruction,
          binding,
          `${localSuffix}:promise-settlement`,
          controller,
          assignment.valueType,
        ) ?? parent;
  }

  private constructSwitchCaseScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const switchApplication = frame.flowState.readSwitch(parent);
    if (switchApplication != null) {
      this.recordTemplateControllerLink(
        frame,
        controller,
        instruction,
        switchApplication.instruction,
        switchApplication.controller,
      );
    }
    if (switchApplication == null) {
      return parent;
    }
    const flowKind = frameworkTemplateControllerSemanticsForInstruction(
      this.scopeNarrower.projector.publication,
      instruction,
    )?.flowKind ?? null;
    const narrowing = flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      || flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault
      ? this.constructSwitchCaseNarrowing(
          frame,
          parent,
          switchApplication,
          instruction,
          controller,
          flowKind,
          localSuffix,
        )
      : null;
    return frame.addDerivedScope(this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-branch`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      base: parent,
      bindingContextSlots: narrowing?.bindingContextSlots ?? [],
      overrideContextSlots: narrowing?.overrideContextSlots ?? [],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.TemplateControllerBranch,
        instruction.productHandle,
        instruction.sourceAddressHandle,
      )],
    })));
  }

  private constructSwitchCaseNarrowing(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    switchApplication: TemplateControllerFlowApplication,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    flowKind: BuiltInTemplateControllerFlowKind.SwitchCase | BuiltInTemplateControllerFlowKind.SwitchDefault,
    localSuffix: string,
  ): CheckerExpressionScopeNarrowingResult | null {
    const switchInstruction = switchApplication.instruction;
    const parse = this.typeSupport.readParse(templateControllerValueExpressionProductHandle(
      this.scopeNarrower.projector.publication,
      switchInstruction,
    ));
    const switchExpression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const switchSource = switchExpression == null
      ? null
      : this.templateControllerSourceExpressionSite(
        frame.input,
        parent,
        switchInstruction,
        switchApplication.controller,
        switchExpression,
        `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-source`,
      );
    if (switchSource == null) {
      return null;
    }

    if (flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault) {
      const excludedTypes = this.switchCaseMatchTypes(
        frame,
        parent,
        switchInstruction,
        controller,
        localSuffix,
      );
      return excludedTypes == null || excludedTypes.length === 0
        ? null
        : this.scopeNarrower.narrowEqualityDomain({
          localKey: `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-default`,
          expression: switchSource.expression,
          scope: switchSource.scope,
          excludeTypes: excludedTypes,
          sourceAddressHandle: switchSource.sourceAddressHandle ?? instruction.sourceAddressHandle,
        });
    }

    const branch = templateControllerSwitchCaseBranch({
      cases: this.switchCaseInstructions(frame, switchInstruction),
      current: instruction,
      readFallThrough: (candidate) =>
        staticTemplateControllerBooleanProperty(
          this.scopeNarrower.projector.publication,
          candidate,
          'fallThrough',
          false,
        ),
    });
    if (branch == null) {
      return null;
    }
    const includeTypes = this.switchCaseMatchTypes(
      frame,
      parent,
      switchInstruction,
      controller,
      localSuffix,
      branch.activeCases,
    );
    const excludeTypes = this.switchCaseMatchTypes(
      frame,
      parent,
      switchInstruction,
      controller,
      localSuffix,
      branch.excludedCases,
    );
    if (includeTypes == null || excludeTypes == null || includeTypes.length === 0) {
      return null;
    }

    return this.scopeNarrower.narrowEqualityDomain({
      localKey: `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-case`,
      expression: switchSource.expression,
      scope: switchSource.scope,
      includeTypes,
      excludeTypes,
      sourceAddressHandle: switchSource.sourceAddressHandle ?? instruction.sourceAddressHandle,
    });
  }

  private switchCaseMatchTypes(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    switchInstruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
    instructions: readonly HydrateTemplateControllerInstruction[] = this.switchCaseInstructions(frame, switchInstruction),
  ) {
    const result = instructions.map((instruction, index) => {
      const siblingController = controller == null
        ? null
        : frame.input.runtimeBindings.readControllerForInstructionUnderParent(
            instruction.productHandle,
            controller.parent,
          );
      return this.typeSupport.templateControllerMatchTypes(
        frame.input,
        parent,
        instruction,
        `${localSuffix}:case:${index}`,
        siblingController,
      );
    });
    return result.some((types) => types == null)
      ? null
      : result.flatMap((types) => types ?? []);
  }

  private switchCaseInstructions(
    frame: TemplateScopeConstructionFrame,
    switchInstruction: HydrateTemplateControllerInstruction,
  ): readonly HydrateTemplateControllerInstruction[] {
    const sequence = frame.readSequence(switchInstruction.childInstructionSequenceProductHandle);
    return sequence?.instructions
      .map((reference) => frame.readInstruction(reference.productHandle))
      .filter((instruction): instruction is HydrateTemplateControllerInstruction =>
        instruction instanceof HydrateTemplateControllerInstruction
        && frameworkTemplateControllerSemanticsForInstruction(
          this.scopeNarrower.projector.publication,
          instruction,
        )?.flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      ) ?? [];
  }

  private constructValueScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const emission = this.constructWithScope(frame, parent, instruction, controller, localSuffix);
    return frame.addDerivedScope(emission);
  }

  private constructPromiseScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const emission = this.constructObjectScope(frame.input, parent, instruction, controller, localSuffix, null);
    frame.addDerivedScope(emission);
    frame.flowState.rememberPromise(emission.scope, instruction, controller, parent);
    return emission.scope;
  }

  private constructSwitchScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    frame.flowState.rememberSwitch(parent, instruction, controller);
    return parent;
  }

  private constructConditionalScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    const emission = this.constructIfNarrowedScope(
      frame.input,
      parent,
      instruction,
      instruction,
      controller,
      controller,
      CheckerExpressionScopeNarrowingPolarity.Truthy,
      `${localSuffix}:if-truthy`,
    );
    frame.flowState.rememberIf(parent, instruction, controller);
    if (emission != null) {
      return frame.addDerivedScope(emission);
    }
    return frame.addDerivedScope(this.constructConditionBranchScope(
      frame.input,
      parent,
      instruction,
      instruction,
      controller,
      `${localSuffix}:if-branch`,
      BindingScopeConditionPolarity.Truthy,
    ));
  }

  private constructPassThroughScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    return parent;
  }

  private constructAppOwnedTemplateControllerScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const childSequence = frame.readSequence(instruction.childInstructionSequenceProductHandle);
    if (childSequence == null || childSequence.instructions.length === 0) {
      return parent;
    }

    const definitionProductHandle = controller?.definitionProductHandle ?? instruction.definitionProductHandle;
    const definition = definitionProductHandle == null
      ? null
      : this.scopeNarrower.projector.publication.readProductDetail(
          ResourceProductDetails.Definition,
          definitionProductHandle,
        );
    const typeSystem = frame.input.typeSystem;
    const valueProperty = templateControllerValueProperty(
      this.scopeNarrower.projector.publication,
      instruction,
    );
    if (
      definitionProductHandle == null
      || !(definition instanceof CustomAttributeDefinition)
      || !definition.isTemplateController
    ) {
      this.recordOpenAppTemplateControllerScope(
        frame,
        instruction,
        localSuffix,
        instruction.sourceAddressHandle,
        `Template-controller instruction '${instruction.controllerName}' has no converged custom-attribute definition for child Scope analysis.`,
      );
      return parent;
    }
    if (typeSystem == null || valueProperty == null) {
      this.recordOpenAppTemplateControllerScope(
        frame,
        instruction,
        localSuffix,
        definition.target.declarationSourceAddressHandle ?? instruction.sourceAddressHandle,
        `Template controller '${definition.name}' has no TypeChecker/default-property authority for child Scope analysis.`,
      );
      return parent;
    }

    const effect = this.appScopeEffectByDefinition.get(definitionProductHandle)
      ?? readAppTemplateControllerScopeEffect(
        this.scopeNarrower.projector.publication,
        typeSystem,
        definition,
        valueProperty,
        `app-template-controller-scope:${definitionProductHandle}`,
      );
    this.appScopeEffectByDefinition.set(definitionProductHandle, effect);
    frame.addScopeSupportRecords(effect.records);
    switch (effect.kind) {
      case AppTemplateControllerScopeEffectKind.PassThrough:
        return parent;
      case AppTemplateControllerScopeEffectKind.ValueBindingContext: {
        const projection = this.typeSupport.templateControllerObjectBindingContextProjection(
          frame.input,
          parent,
          instruction,
          localSuffix,
          controller,
        );
        const emission = this.constructObjectScope(
          frame.input,
          parent,
          instruction,
          controller,
          localSuffix,
          projection?.contextType ?? null,
          effect.sourceAddressHandle,
        );
        return frame.addDerivedScope(emission);
      }
      case AppTemplateControllerScopeEffectKind.Open:
        this.recordOpenAppTemplateControllerScope(
          frame,
          instruction,
          localSuffix,
          effect.sourceAddressHandle,
          effect.summary ?? `Template controller '${definition.name}' child Scope remained open.`,
        );
        return parent;
    }
  }

  private recordOpenAppTemplateControllerScope(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): void {
    const local = `${frame.input.localKey}:scope:${localSuffix}:app-template-controller:open`;
    const seam = new OpenSeam(
      this.store.handles.openSeam(
        local,
      ),
      KernelVocabulary.Template.OpenTemplateControllerScope.key,
      summary,
      sourceAddressHandle,
      null,
      [OpenSeamReasonKind.TemplateControllerScopeOpen],
      [{
        reasonKind: OpenSeamReasonKind.TemplateControllerScopeOpen,
        summary,
        addressHandle: sourceAddressHandle ?? instruction.sourceAddressHandle,
      }],
    );
    frame.addOpenSeam(seam);
    frame.addScopeSupportRecords([
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:scope-attempt`),
        instruction.identityHandle,
        [],
        [],
        [seam.handle],
      ),
    ]);
  }

  private recordTemplateControllerLink(
    frame: TemplateScopeConstructionFrame,
    sourceController: RuntimeControllerFrame | null,
    sourceInstruction: HydrateTemplateControllerInstruction,
    targetInstruction: HydrateTemplateControllerInstruction,
    targetController: RuntimeControllerFrame | null,
  ): void {
    const source = sourceController;
    const target = targetController ?? templateControllerLinkTarget(frame, source, targetInstruction);
    if (source == null || target == null) {
      return;
    }
    frame.addTemplateControllerLink({ sourceController: source, targetController: target, sourceInstruction });
  }

  private constructIfNarrowedScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    conditionInstruction: HydrateTemplateControllerInstruction,
    ownerInstruction: HydrateTemplateControllerInstruction,
    conditionController: RuntimeControllerFrame | null,
    ownerController: RuntimeControllerFrame | null,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const parse = this.typeSupport.readParse(templateControllerValueExpressionProductHandle(
      this.scopeNarrower.projector.publication,
      conditionInstruction,
    ));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const source = ast == null
      ? null
      : this.templateControllerSourceExpressionSite(
        input,
        parent,
        conditionInstruction,
        conditionController,
        ast,
        `${input.localKey}:scope:template-controller:${localSuffix}:condition-source`,
      );
    const narrowing = source == null
      ? null
      : this.scopeNarrower.narrow({
        localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
        expression: source.expression,
        scope: source.scope,
        polarity,
        sourceAddressHandle: source.sourceAddressHandle ?? ownerInstruction.sourceAddressHandle,
      } satisfies CheckerExpressionScopeNarrowingRequest);
    if (narrowing == null) {
      return null;
    }
    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
      ownerProductHandle: ownerController?.productHandle ?? ownerInstruction.productHandle,
      ownerIdentityHandle: ownerController?.identityHandle ?? ownerInstruction.identityHandle,
      base: parent,
      bindingContextSlots: narrowing.bindingContextSlots,
      overrideContextSlots: narrowing.overrideContextSlots,
      sourceAddressHandle: ownerInstruction.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.TemplateControllerCondition,
        conditionInstruction.productHandle,
        conditionInstruction.sourceAddressHandle,
        polarity === CheckerExpressionScopeNarrowingPolarity.Truthy
          ? BindingScopeConditionPolarity.Truthy
          : BindingScopeConditionPolarity.Falsy,
      )],
    }));
  }

  private templateControllerSourceExpressionSite(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    expression: ExpressionAstNode,
    localKey: string,
  ): TemplateControllerSourceExpressionSite | null {
    const binding = templateControllerRuntimeValueBinding(
      this.scopeNarrower.projector.publication,
      input.runtimeBindings,
      instruction,
      controller,
    );
    if (binding == null) {
      return {
        expression,
        scope: parent,
        sourceAddressHandle: instruction.sourceAddressHandle,
      };
    }

    const projection = projectRuntimeBindingSourceExpressionInScope(
      input.runtimeBindings,
      this.bindingExpressionScopes,
      input.expressionResourcePlan,
      {
        binding,
        expressionProductHandle: templateControllerValueExpressionProductHandle(
          this.scopeNarrower.projector.publication,
          instruction,
        ),
        expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
        expression,
        localKey,
        sourceScope: parent,
      },
    );
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return null;
    }
    // A scope-changing binding behavior affects the controller value binding, not the child synthetic view scope.
    if (projection.scope.productHandle !== parent.productHandle) {
      return null;
    }
    return {
      expression: projection.expression,
      scope: projection.scope,
      sourceAddressHandle: projection.sourceAddressHandle,
    };
  }

  private constructConditionBranchScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    conditionInstruction: HydrateTemplateControllerInstruction,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
    polarity: BindingScopeConditionPolarity,
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      base: parent,
      bindingContextSlots: [],
      overrideContextSlots: [],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.TemplateControllerCondition,
        conditionInstruction.productHandle,
        conditionInstruction.sourceAddressHandle,
        polarity,
      )],
    }));
  }

  private constructWithScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    const input = frame.input;
    const projection = this.typeSupport.templateControllerObjectBindingContextProjection(
      input,
      parent,
      instruction,
      localSuffix,
      controller,
    );
    if (projection?.nullPresence != null && projection.nullPresence !== CheckerTypeNullishPresence.None) {
      frame.addScopeIssue(this.scopeIssuePublisher.publish(
        `${input.localKey}:scope:${localSuffix}:with-null-binding-context`,
        KernelVocabulary.Instruction.Instruction.key,
        instruction.productHandle,
        instruction.identityHandle,
        RuntimeBindingScopeIssuePhase.TemplateControllerValueScope,
        RuntimeBindingScopeIssueKind.WithNullBindingContext,
        projection.nullPresence === CheckerTypeNullishPresence.Definitely
          ? RuntimeBindingScopeIssueCertainty.Definite
          : RuntimeBindingScopeIssueCertainty.Possible,
        `With can receive null from source type '${projection.sourceType.display ?? 'unknown'}'; runtime Scope lookup cannot inspect a null binding context`,
        null,
        projection.sourceAddressHandle,
        null,
        projection.sourceType,
      ));
    }
    return this.constructObjectScope(
      input,
      parent,
      instruction,
      controller,
      localSuffix,
      projection?.contextType ?? null,
    );
  }

  private constructObjectScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
    contextType: Parameters<typeof BindingScope.fromParentObject>[0]['contextType'],
    sourceAddressHandle: AddressHandle | null = instruction.sourceAddressHandle,
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.prepare(BindingScope.fromParentObject({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}:object`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      contextType,
      sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.TemplateControllerValueScope,
        instruction.productHandle,
        sourceAddressHandle,
      )],
    }));
  }
}

function templateControllerLinkTarget(
  frame: TemplateScopeConstructionFrame,
  source: RuntimeControllerFrame | null,
  targetInstruction: HydrateTemplateControllerInstruction,
): RuntimeControllerFrame | null {
  const ownerController = source?.parent?.parent ?? null;
  if (ownerController?.instructionProductHandle === targetInstruction.productHandle) {
    return ownerController;
  }
  return frame.input.runtimeBindings.readControllerForInstructionUnderParent(
    targetInstruction.productHandle,
    source?.parent ?? null,
  );
}
