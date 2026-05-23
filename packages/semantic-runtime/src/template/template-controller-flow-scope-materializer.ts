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
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerExpressionScopeNarrower,
  CheckerExpressionScopeNarrowingPolarity,
  type CheckerExpressionScopeNarrowingRequest,
  type CheckerExpressionScopeNarrowingResult,
} from '../type-system/expression-scope-narrower.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  HydrateTemplateControllerInstruction,
} from './instruction-ir.js';
import {
  BuiltInTemplateControllerChildScopeKind,
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForName,
} from './template-controller-semantics.js';
import {
  TemplateControllerPromiseResultKind,
  type TemplateControllerPromiseState,
} from './template-controller-flow-state.js';
import {
  templateControllerValueExpressionProductHandle,
  templateControllerValueTarget,
} from './template-controller-value.js';
import { staticTemplateControllerBooleanProperty } from './template-controller-value.js';
import { templateControllerSwitchCaseBranch } from './template-controller-switch-branch.js';
import type {
  TemplateScopeConstructionFrame,
  TemplateScopeConstructionRequest,
} from './template-controller-scope-materializer.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import type { TemplateScopeTypeProjector } from './template-scope-type-projector.js';

/**
 * Applies built-in template-controller flow semantics to runtime Scope construction.
 *
 * The outer scope materializer owns template-order traversal. This class owns the child-scope decision once traversal
 * reaches a `HydrateTemplateControllerInstruction`, including branch link hooks and TypeChecker-backed narrowed scopes.
 */
export class TemplateControllerFlowScopeMaterializer {
  constructor(
    private readonly store: KernelStore,
    private readonly scopeMaterializer: BindingScopeMaterializer,
    private readonly scopeNarrower: CheckerExpressionScopeNarrower,
    private readonly typeSupport: TemplateScopeTypeProjector,
    private readonly constructScopeEffects: (
      frame: TemplateScopeConstructionFrame,
      parent: BindingScope,
      ownerProductHandle: ProductHandle,
      localSuffix: string,
    ) => BindingScope | null,
  ) {}

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

    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
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
        return this.constructSwitchScope(frame, parent, instruction);
      case BuiltInTemplateControllerFlowKind.Conditional:
        return this.constructConditionalScope(frame, parent, instruction, controller, localSuffix);
      case BuiltInTemplateControllerFlowKind.Iteration:
      case BuiltInTemplateControllerFlowKind.PassThrough:
      case undefined:
        return this.constructPassThroughScope(frame, parent);
    }
  }

  finishFlowState(
    frame: TemplateScopeConstructionFrame,
    instruction: HydrateTemplateControllerInstruction,
    childScope: BindingScope,
  ): void {
    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
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
      return frame.addDerivedScope(this.constructConditionBranchScope(
        frame.input,
        parent,
        previousIf,
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
      this.recordTemplateControllerLink(frame, controller, instruction, promiseState.instruction);
    }
    if (flowKind === BuiltInTemplateControllerFlowKind.PromisePending) {
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
        flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
          ? TemplateControllerPromiseResultKind.Fulfilled
          : TemplateControllerPromiseResultKind.Rejected,
        localSuffix,
      );
    return emission == null ? parent : frame.addDerivedScope(emission);
  }

  private constructSwitchCaseScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    const switchInstruction = frame.flowState.readSwitch(parent);
    if (switchInstruction != null) {
      this.recordTemplateControllerLink(frame, controller, instruction, switchInstruction);
    }
    if (switchInstruction == null) {
      return parent;
    }
    const flowKind = frameworkTemplateControllerSemanticsForName(instruction.controllerName)?.flowKind ?? null;
    const narrowing = flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      || flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault
      ? this.constructSwitchCaseNarrowing(frame, parent, switchInstruction, instruction, flowKind, localSuffix)
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
    switchInstruction: HydrateTemplateControllerInstruction,
    instruction: HydrateTemplateControllerInstruction,
    flowKind: BuiltInTemplateControllerFlowKind.SwitchCase | BuiltInTemplateControllerFlowKind.SwitchDefault,
    localSuffix: string,
  ): CheckerExpressionScopeNarrowingResult | null {
    const parse = this.typeSupport.readParse(templateControllerValueExpressionProductHandle(this.store, switchInstruction));
    const switchExpression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (switchExpression == null) {
      return null;
    }

    if (flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault) {
      const excludedTypes = this.switchCaseMatchTypes(frame, parent, switchInstruction, localSuffix);
      return excludedTypes == null || excludedTypes.length === 0
        ? null
        : this.scopeNarrower.narrowEqualityDomain({
          localKey: `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-default`,
          expression: switchExpression,
          scope: parent,
          excludeTypes: excludedTypes,
          sourceAddressHandle: instruction.sourceAddressHandle,
        });
    }

    const branch = templateControllerSwitchCaseBranch({
      cases: this.switchCaseInstructions(frame, switchInstruction),
      current: instruction,
      readFallThrough: (candidate) =>
        staticTemplateControllerBooleanProperty(this.store, candidate, 'fallThrough', false),
    });
    if (branch == null) {
      return null;
    }
    const includeTypes = this.switchCaseMatchTypes(frame, parent, switchInstruction, localSuffix, branch.activeCases);
    const excludeTypes = this.switchCaseMatchTypes(frame, parent, switchInstruction, localSuffix, branch.excludedCases);
    if (includeTypes == null || excludeTypes == null || includeTypes.length === 0) {
      return null;
    }

    return this.scopeNarrower.narrowEqualityDomain({
      localKey: `${frame.input.localKey}:scope:template-controller:${localSuffix}:switch-case`,
      expression: switchExpression,
      scope: parent,
      includeTypes,
      excludeTypes,
      sourceAddressHandle: instruction.sourceAddressHandle,
    });
  }

  private switchCaseMatchTypes(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    switchInstruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    instructions: readonly HydrateTemplateControllerInstruction[] = this.switchCaseInstructions(frame, switchInstruction),
  ) {
    const result = instructions.map((instruction, index) =>
      this.typeSupport.templateControllerMatchTypes(
        frame.input,
        parent,
        instruction,
        `${localSuffix}:case:${index}`,
      )
    );
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
        && frameworkTemplateControllerSemanticsForName(instruction.controllerName)?.flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
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
    const emission = this.constructWithScope(frame.input, parent, instruction, controller, localSuffix);
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
    frame.flowState.rememberPromise(emission.scope, instruction, parent);
    return emission.scope;
  }

  private constructSwitchScope(
    frame: TemplateScopeConstructionFrame,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
  ): BindingScope {
    frame.flowState.clearBranch(parent);
    frame.flowState.rememberSwitch(parent, instruction);
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
      CheckerExpressionScopeNarrowingPolarity.Truthy,
      `${localSuffix}:if-truthy`,
    );
    frame.flowState.rememberIf(parent, instruction);
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

  private recordTemplateControllerLink(
    frame: TemplateScopeConstructionFrame,
    sourceController: RuntimeControllerFrame | null,
    sourceInstruction: HydrateTemplateControllerInstruction,
    targetInstruction: HydrateTemplateControllerInstruction,
  ): void {
    const source = sourceController ?? frame.input.runtimeBindings.readControllerForInstruction(sourceInstruction.productHandle);
    const target = templateControllerLinkTarget(frame, source, targetInstruction);
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
    controller: RuntimeControllerFrame | null,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localSuffix: string,
  ): BindingScopeConstructionEmission | null {
    const parse = this.typeSupport.readParse(templateControllerValueExpressionProductHandle(this.store, conditionInstruction));
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
    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}`,
      ownerProductHandle: controller?.productHandle ?? ownerInstruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? ownerInstruction.identityHandle,
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

    return this.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}:promise-${resultKind}:${target.name}`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      base: parent,
      bindingContextSlots: [this.typeSupport.promiseResultSlotDraft(input, instruction, promiseState, resultKind, localSuffix, target)],
      overrideContextSlots: [],
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeCreators: [
        new BindingScopeCreator(
          BindingScopeCreatorKind.TemplateControllerValueScope,
          promiseState.instruction.productHandle,
          promiseState.instruction.sourceAddressHandle,
        ),
        new BindingScopeCreator(
          BindingScopeCreatorKind.TemplateControllerPromiseResult,
          instruction.productHandle,
          instruction.sourceAddressHandle,
        ),
      ],
    }));
  }

  private constructWithScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
  ): BindingScopeConstructionEmission {
    return this.constructObjectScope(
      input,
      parent,
      instruction,
      controller,
      localSuffix,
      this.typeSupport.templateControllerObjectBindingContextType(input, parent, instruction, localSuffix),
    );
  }

  private constructObjectScope(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    localSuffix: string,
    contextType: Parameters<typeof BindingScope.fromParentObject>[0]['contextType'],
  ): BindingScopeConstructionEmission {
    return this.scopeMaterializer.prepare(BindingScope.fromParentObject({
      localKey: `${input.localKey}:scope:template-controller:${localSuffix}:object`,
      ownerProductHandle: controller?.productHandle ?? instruction.productHandle,
      ownerIdentityHandle: controller?.identityHandle ?? instruction.identityHandle,
      parent,
      contextType,
      sourceAddressHandle: instruction.sourceAddressHandle,
      scopeCreators: [new BindingScopeCreator(
        BindingScopeCreatorKind.TemplateControllerValueScope,
        instruction.productHandle,
        instruction.sourceAddressHandle,
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
