import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { SourceSpan } from '../expression/source-span.js';
import { InquiryLocusKind } from '../inquiry/locus.js';
import type { TemplateCompletionCursorContext } from '../inquiry/template-completion.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  BindingCommandLoweringState,
  type BindingCommandLowering,
  type MultiBindingSegment,
} from '../template/binding-command-execution.js';
import type { TemplateBindableReference } from '../template/compiler-world-reference.js';
import {
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
  TemplateBindingMode,
  type TemplateInstruction,
} from '../template/instruction-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import {
  InterpolationBinding,
  PropertyBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import { bindingModeForBindingBehaviorName } from '../template/runtime-binding-mode-behavior.js';
import type { RuntimeBindingBehaviorPlanEntry } from '../template/runtime-expression-resource-plan.js';
import {
  resourceLocalRuntimeBindings,
  resourceLocalTemplateInstructions,
} from '../template/runtime-resource-ownership.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateValueSite } from '../template/value-site.js';
import { runtimeOperationMayBeReached } from '../runtime-expression/runtime-operation.js';
import {
  SemanticTemplateBindableUsageModeAuthority,
  type SemanticTemplateCursorBindableRow,
  type SemanticTemplateUsageEffectiveBindingMode,
} from './contracts.js';
import {
  describeAddress,
  semanticExactSourceReference,
  sourceReferenceForParserSpan,
  type SemanticSourceReference,
} from './source-reference.js';

export type SemanticTemplateCursorBindableUsageModeFields = Pick<
  SemanticTemplateCursorBindableRow,
  | 'usageEffectiveMode'
  | 'usageModeAuthority'
  | 'usageModeCommand'
  | 'usageModeLocus'
  | 'usagePresentationKind'
  | 'usageModeCommandKind'
  | 'usageModeCommandSource'
  | 'usageModeTargetSource'
  | 'usageModeSource'
  | 'usageModeOpenReason'
>;

interface BindableUsageSite {
  readonly site: TemplateValueSite | null;
  readonly segment: MultiBindingSegment | null;
  readonly attributeProductHandle: ProductHandle | null;
  readonly syntaxProductHandle: ProductHandle | null;
  readonly commandName: string | null;
  readonly commandKind: SemanticTemplateCursorBindableRow['usageModeCommandKind'];
  readonly locus: NonNullable<SemanticTemplateCursorBindableRow['usageModeLocus']>;
  readonly targetSource: SemanticSourceReference | null;
  readonly commandSource: SemanticSourceReference | null;
  readonly valueSource: SemanticSourceReference | null;
  readonly hasNonemptyValue: boolean;
  readonly attributePatternAdmitted: boolean | null;
  readonly presentationKind: NonNullable<SemanticTemplateCursorBindableRow['usagePresentationKind']> | null;
}

export function cursorBindableUsageModeRow(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
): SemanticTemplateCursorBindableUsageModeFields {
  const bindable = cursorContext.selectedBindable;
  if (bindable == null || cursorContext.selectedBindableIsDeclaration) {
    return noBindableUsageMode();
  }
  let usage = bindableUsageSite(store, resource, cursorContext);
  if (usage.attributeProductHandle == null) {
    return openBindableUsageMode(usage, 'No exact authored attribute owns the selected bindable usage.');
  }
  if (usage.targetSource == null) {
    return openBindableUsageMode(usage, 'No exact authored bindable target token owns this usage.');
  }
  if (usage.presentationKind == null) {
    return openBindableUsageMode(usage, 'No exact resource/bindable ownership presentation lane was proven.');
  }
  if (usage.locus === 'attribute-pattern' && usage.attributePatternAdmitted !== true) {
    return openBindableUsageMode(
      usage,
      'Colon-prefixed bind syntax was parsed without one admitted ShortHandBindingSyntax compiler pattern.',
    );
  }

  const lowerings = bindingCommandLoweringsForUsage(resource, usage.syntaxProductHandle);
  usage = bindableUsageSiteWithCommandKind(store, usage, lowerings);
  if (usage.commandName != null && lowerings.length !== 1) {
    return openBindableUsageMode(
      usage,
      `Expected one exact lowering for binding command '${usage.commandName}', found ${lowerings.length}.`,
    );
  }
  const nonCompleteLowering = lowerings.find((lowering) =>
    lowering.state !== BindingCommandLoweringState.Complete
  ) ?? null;
  if (usage.commandName != null && nonCompleteLowering != null) {
    return openBindableUsageMode(
      usage,
      nonCompleteLowering.message
        ?? `Binding command '${usage.commandName}' did not produce one closed lowering.`,
    );
  }

  const instructions = bindableUsageInstructions(resource, bindable, usage, lowerings);
  if (instructions.length !== 1) {
    return openBindableUsageMode(
      usage,
      `Expected one exact lowered instruction for '${bindable.reference.attribute}', found ${instructions.length}.`,
    );
  }
  const instruction = instructions[0]!;
  if (instruction instanceof SetPropertyInstruction) {
    const ownerDefinition = bindable.reference.ownerDefinitionProductHandle == null
      ? null
      : store.productDetails.read(
          ResourceProductDetails.Definition,
          bindable.reference.ownerDefinitionProductHandle,
        );
    if (
      ownerDefinition?.type === ResourceDefinitionKind.CustomAttribute
      && !usage.hasNonemptyValue
    ) {
      return openBindableUsageMode(
        usage,
        'Valueless custom-attribute usage does not prove one ongoing or static primary-value instruction.',
      );
    }
    return usage.commandName == null
      ? closedBindableUsageMode(
          usage,
          null,
          SemanticTemplateBindableUsageModeAuthority.PlainLiteral,
          null,
          usage.valueSource,
          'plain literal',
        )
      : openBindableUsageMode(
          usage,
          `Binding command '${usage.commandName}' produced a static property set rather than a modeled binding mode.`,
        );
  }
  if (!(instruction instanceof PropertyBindingInstruction || instruction instanceof InterpolationInstruction)) {
    return openBindableUsageMode(
      usage,
      `Lowered instruction '${instruction.instructionKind}' has no bindable binding-mode contract.`,
    );
  }

  const bindings = resourceLocalRuntimeBindings(store, resource).filter((binding) =>
    binding.instructionProductHandle === instruction.productHandle
  );
  if (bindings.length === 0) {
    return openBindableUsageMode(
      usage,
      `No rendered binding was found for instruction '${instruction.instructionKind}'.`,
    );
  }
  const results = bindings.map((binding) => plannedBindableUsageMode(
    store,
    resource,
    cursorContext,
    bindable,
    usage,
    instruction,
    binding,
  ));
  const first = results[0]!;
  return results.every((result) => sameBindableUsageMode(result, first))
    ? first
    : openBindableUsageMode(
        usage,
        `${bindings.length} rendered bindings did not converge on one exact usage-effective mode.`,
      );
}

function plannedBindableUsageMode(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
  bindable: TemplateBindableReference,
  usage: BindableUsageSite,
  instruction: PropertyBindingInstruction | InterpolationInstruction,
  binding: RuntimeBinding,
): SemanticTemplateCursorBindableUsageModeFields {
  const plan = resource.runtimeAnalysis.expressionResourcePlan;
  const reachability = plan.readSourceEvaluationReachability(binding.productHandle);
  if (!runtimeOperationMayBeReached(reachability)) {
    return openBindableUsageMode(
      usage,
      `Runtime source evaluation is '${reachability}', so no effective usage mode can be claimed.`,
    );
  }
  const bindingBehaviors = plan.behaviorEntries.filter((entry) =>
    entry.binding.productHandle === binding.productHandle
    && entry.bindOrder != null
  );
  const unresolvedBehavior = bindingBehaviors.find((entry) =>
    entry.resource == null || entry.issue != null
  ) ?? null;
  if (unresolvedBehavior != null) {
    return openBindableUsageMode(
      usage,
      unresolvedBehavior.issue?.message
        ?? `Binding behavior '${unresolvedBehavior.occurrence.expression.name.name}' was not resolved.`,
      bindingBehaviorSourceForCursor(store, cursorContext, binding, unresolvedBehavior),
    );
  }
  const reachedBehaviors = bindingBehaviors.filter((entry) => entry.issue == null);
  const customBehavior = reachedBehaviors.find((entry) =>
    entry.resource != null && entry.builtInResource == null
  ) ?? null;
  if (customBehavior != null) {
    return openBindableUsageMode(
      usage,
      `Custom binding behavior '${customBehavior.occurrence.expression.name.name}' may change the runtime binding mode.`,
      bindingBehaviorSourceForCursor(store, cursorContext, binding, customBehavior),
    );
  }

  if (binding instanceof InterpolationBinding) {
    return interpolationUsageMode(
      store,
      cursorContext,
      usage,
      binding,
      reachedBehaviors,
      plan.readEffectiveBindingModes(binding.productHandle),
    );
  }
  if (!(binding instanceof PropertyBinding) || !(instruction instanceof PropertyBindingInstruction)) {
    return openBindableUsageMode(usage, 'Rendered binding kind did not conserve the lowered property-binding lane.');
  }
  return propertyBindableUsageMode(
    store,
    cursorContext,
    bindable,
    usage,
    binding,
    instruction,
    reachedBehaviors,
    plan.readEffectiveBindingModes(binding.productHandle),
  );
}

function sameBindableUsageMode(
  left: SemanticTemplateCursorBindableUsageModeFields,
  right: SemanticTemplateCursorBindableUsageModeFields,
): boolean {
  return left.usageEffectiveMode === right.usageEffectiveMode
    && left.usageModeAuthority === right.usageModeAuthority
    && left.usageModeCommand === right.usageModeCommand
    && left.usageModeLocus === right.usageModeLocus
    && left.usagePresentationKind === right.usagePresentationKind
    && left.usageModeCommandKind === right.usageModeCommandKind
    && left.usageModeOpenReason === right.usageModeOpenReason
    && sameSource(left.usageModeCommandSource, right.usageModeCommandSource)
    && sameSource(left.usageModeTargetSource, right.usageModeTargetSource)
    && sameSource(left.usageModeSource, right.usageModeSource);
}

function sameSource(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  return left == null || right == null
    ? left === right
    : left.path === right.path && left.start === right.start && left.end === right.end;
}

function bindableUsageSiteWithCommandKind(
  store: KernelStore,
  usage: BindableUsageSite,
  lowerings: readonly BindingCommandLowering[],
): BindableUsageSite {
  if (usage.commandName == null || usage.commandKind != null) {
    return usage;
  }
  const kinds = new Set(lowerings.flatMap((lowering) => {
    const executable = lowering.command.productHandle == null
      ? null
      : store.productDetails.read(
          TemplateProductDetails.BindingCommandExecutable,
          lowering.command.productHandle,
        );
    return executable == null ? [] : [executable.executionKind];
  }));
  return kinds.size === 1 ? { ...usage, commandKind: [...kinds][0]! } : usage;
}

function bindableUsageSite(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
): BindableUsageSite {
  const site = cursorContext.valueSiteProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ValueSite, cursorContext.valueSiteProductHandle);
  const segment = cursorContext.selectedMultiBindingSegmentProductHandle == null
    ? null
    : store.productDetails.read(
        TemplateProductDetails.MultiBindingSegment,
        cursorContext.selectedMultiBindingSegmentProductHandle,
      );
  const attributeProductHandle = segment?.attribute.productHandle
    ?? site?.attribute?.productHandle
    ?? cursorContext.htmlAttributeProductHandle;
  const syntaxProductHandle = segment?.syntaxProductHandle
    ?? site?.syntax?.productHandle
    ?? resource.compilation.authoredAttributeSyntaxes.find((syntax) =>
      syntax.attribute.productHandle === attributeProductHandle
    )?.productHandle
    ?? null;
  const syntaxes = [
    ...resource.compilation.attributeSyntax.syntaxes,
    ...resource.compilation.bindingCommandLowering.attributeSyntaxes,
  ];
  const syntax = syntaxProductHandle == null
    ? null
    : syntaxes.find((candidate) => candidate.productHandle === syntaxProductHandle) ?? null;
  const commandReference = segment?.command ?? site?.bindingCommand ?? null;
  const commandName = commandReference?.name ?? syntax?.command ?? null;
  const commandExecutable = commandReference?.productHandle == null
    ? null
    : store.productDetails.read(
        TemplateProductDetails.BindingCommandExecutable,
        commandReference.productHandle,
      );
  const attribute = attributeProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.HtmlAttribute, attributeProductHandle);
  const classification = syntaxProductHandle == null
    ? null
    : resource.compilation.attributeClassification.classifications.find((candidate) =>
      candidate.syntaxProductHandle === syntaxProductHandle
    ) ?? null;
  const bindable = cursorContext.selectedBindable;
  const ownerDefinition = bindable?.reference.ownerDefinitionProductHandle == null
    ? null
    : store.productDetails.read(
        ResourceProductDetails.Definition,
        bindable.reference.ownerDefinitionProductHandle,
      );
  const resourcePrimary = segment == null
    && bindable != null
    && bindable.reference.ownerDefinitionProductHandle === cursorContext.query.selectedDefinitionProductHandle
    && classification?.resource?.definitionProductHandle === bindable.reference.ownerDefinitionProductHandle
    && ownerDefinition?.type === ResourceDefinitionKind.CustomAttribute
    && 'defaultProperty' in ownerDefinition
    && ownerDefinition.defaultProperty === bindable.reference.name;
  const colonBindPattern = syntax?.pattern?.pattern === ':PART'
    && syntax.command === 'bind'
    && syntax.rawName.startsWith(':');
  return {
    site,
    segment,
    attributeProductHandle,
    syntaxProductHandle,
    commandName,
    commandKind: commandExecutable?.executionKind ?? null,
    locus: segment != null
      ? 'multi-binding'
      : colonBindPattern
        ? 'attribute-pattern'
        : 'attribute',
    targetSource: describeAddress(
      store,
      segment?.targetSourceAddressHandle ?? syntax?.targetSourceAddressHandle ?? null,
    ),
    commandSource: colonBindPattern
      ? colonBindCommandSource(store, cursorContext, syntax)
      : describeAddress(store, syntax?.commandSourceAddressHandle ?? null),
    valueSource: describeAddress(
      store,
      segment?.sourceAddressHandle
        ?? site?.sourceAddressHandle
        ?? attribute?.valueAddressHandle
        ?? (syntax?.rawValue === '' ? syntax.targetSourceAddressHandle : null)
        ?? null,
    ),
    hasNonemptyValue: syntax?.rawValue.length !== 0,
    attributePatternAdmitted: colonBindPattern
      ? syntax?.compiledPatternProductHandle != null
        && resource.compilation.compilerWorld.attributePatterns.some((pattern) =>
          pattern.compiledPatterns.some((compiled) =>
            compiled.productHandle === syntax.compiledPatternProductHandle
          )
        )
      : null,
    presentationKind: resourcePrimary
      ? 'resource-primary'
      : bindable == null || ownerDefinition == null
        ? null
        : 'bindable-attribute',
  };
}

function colonBindCommandSource(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  syntax: NonNullable<TemplateValueSite['syntax']>,
): SemanticSourceReference | null {
  const nameSource = semanticExactSourceReference(describeAddress(store, syntax.nameSourceAddressHandle));
  const targetSource = semanticExactSourceReference(describeAddress(store, syntax.targetSourceAddressHandle));
  if (
    cursorContext.query.locus.kind !== InquiryLocusKind.SourceCursor
    || nameSource?.start == null
    || targetSource?.start !== nameSource.start + 1
  ) {
    return null;
  }
  return sourceReferenceForParserSpan(
    cursorContext.query.locus.cursor.filePath,
    new SourceSpan(nameSource.start, nameSource.start + 1),
    'name',
    nameSource,
  );
}

function bindingCommandLoweringsForUsage(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntaxProductHandle: ProductHandle | null,
): readonly BindingCommandLowering[] {
  if (syntaxProductHandle == null) {
    return [];
  }
  const inputHandles = new Set(resource.compilation.bindingCommandLowering.buildInputs
    .filter((input) => input.syntaxProductHandle === syntaxProductHandle)
    .map((input) => input.productHandle));
  return resource.compilation.bindingCommandLowering.lowerings.filter((lowering) =>
    inputHandles.has(lowering.inputProductHandle)
  );
}

function bindableUsageInstructions(
  resource: TemplateResourceRuntimeAnalysisEmission,
  bindable: TemplateBindableReference,
  usage: BindableUsageSite,
  lowerings: readonly BindingCommandLowering[],
): readonly TemplateInstruction[] {
  const loweringInstructionHandles = new Set(lowerings.flatMap((lowering) =>
    lowering.instructionProductHandles
  ));
  const candidates = resourceLocalTemplateInstructions(resource).filter((instruction) => {
    if (
      instructionBindableTarget(instruction) !== bindable.reference.name
      || instructionAttributeHandle(instruction) !== usage.attributeProductHandle
    ) {
      return false;
    }
    if (loweringInstructionHandles.size > 0) {
      return loweringInstructionHandles.has(instruction.productHandle);
    }
    return usage.segment?.sourceAddressHandle == null
      || instruction.sourceAddressHandle === usage.segment.sourceAddressHandle;
  });
  return [...new Map(candidates.map((instruction) => [instruction.productHandle, instruction] as const)).values()];
}

function instructionBindableTarget(instruction: TemplateInstruction): string | null {
  if (instruction instanceof PropertyBindingInstruction || instruction instanceof SetPropertyInstruction) {
    return instruction.targetProperty;
  }
  return instruction instanceof InterpolationInstruction ? instruction.target : null;
}

function instructionAttributeHandle(instruction: TemplateInstruction): ProductHandle | null {
  return 'attribute' in instruction ? instruction.attribute?.productHandle ?? null : null;
}

function interpolationUsageMode(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  usage: BindableUsageSite,
  binding: InterpolationBinding,
  reachedBehaviors: readonly RuntimeBindingBehaviorPlanEntry[],
  effectiveModes: readonly TemplateBindingMode[],
): SemanticTemplateCursorBindableUsageModeFields {
  const nonToViewMode = effectiveModes.find((mode) => mode !== TemplateBindingMode.ToView) ?? null;
  if (effectiveModes.length === 0 || nonToViewMode != null) {
    const modeBehavior = lastModeBehavior(reachedBehaviors);
    return openBindableUsageMode(
      usage,
      effectiveModes.length === 0
        ? 'Interpolation published no exact runtime expression-chain mode.'
        : `Interpolation mode '${nonToViewMode ?? 'unknown'}' does not prove target-to-source runtime behavior.`,
      modeBehavior == null
        ? usage.valueSource
        : bindingBehaviorSourceForCursor(store, cursorContext, binding, modeBehavior),
    );
  }
  return closedBindableUsageMode(
    usage,
    BindableBindingMode.ToView,
    SemanticTemplateBindableUsageModeAuthority.Interpolation,
    null,
    usage.valueSource,
    'interpolation',
  );
}

function propertyBindableUsageMode(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  bindable: TemplateBindableReference,
  usage: BindableUsageSite,
  binding: PropertyBinding,
  instruction: PropertyBindingInstruction,
  reachedBehaviors: readonly RuntimeBindingBehaviorPlanEntry[],
  effectiveModes: readonly TemplateBindingMode[],
): SemanticTemplateCursorBindableUsageModeFields {
  if (effectiveModes.length !== 1) {
    return openBindableUsageMode(
      usage,
      `Expected one exact property-binding plan mode, found ${effectiveModes.length}.`,
    );
  }
  const effectiveMode = effectiveModes[0]!;
  const mode = publicBindableUsageMode(effectiveMode);
  if (mode == null) {
    return openBindableUsageMode(
      usage,
      `Runtime binding mode '${effectiveMode}' is not a closed author-facing mode.`,
    );
  }
  if (
    usage.commandKind !== 'built-in'
    || usage.commandName == null
    || (usage.commandName !== 'bind' && fixedCommandBindableUsageMode(usage.commandName) == null)
  ) {
    return openBindableUsageMode(
      usage,
      `Base command '${usage.commandName ?? 'none'}' is not one modeled built-in property-binding command.`,
    );
  }
  const modeBehavior = lastModeBehavior(reachedBehaviors);
  if (modeBehavior != null) {
    const behaviorMode = modeBehavior.builtInResource == null
      ? null
      : publicBindableUsageMode(bindingModeForBindingBehaviorName(modeBehavior.builtInResource.name)
        ?? TemplateBindingMode.Open);
    if (behaviorMode !== mode) {
      return openBindableUsageMode(
        usage,
        `Binding behavior '${modeBehavior.occurrence.expression.name.name}' did not agree with planned mode '${mode}'.`,
        bindingBehaviorSourceForCursor(store, cursorContext, binding, modeBehavior),
      );
    }
    return closedBindableUsageMode(
      usage,
      mode,
      SemanticTemplateBindableUsageModeAuthority.BindingBehavior,
      usage.commandName,
      bindingBehaviorSourceForCursor(store, cursorContext, binding, modeBehavior),
      'binding behavior',
    );
  }
  const instructionMode = publicBindableUsageMode(instruction.bindingMode);
  if (instructionMode !== mode) {
    return openBindableUsageMode(
      usage,
      `Lowered instruction mode '${instruction.bindingMode}' did not agree with planned mode '${mode}'.`,
    );
  }
  switch (usage.commandName) {
    case 'one-time':
    case 'to-view':
    case 'from-view':
    case 'two-way': {
      const expected = fixedCommandBindableUsageMode(usage.commandName);
      return expected == null || expected !== instructionMode || expected !== mode
        ? openBindableUsageMode(
            usage,
            `Binding command '${usage.commandName}' and rendered mode '${effectiveMode}' did not agree.`,
          )
        : closedBindableUsageMode(
            usage,
            mode,
            SemanticTemplateBindableUsageModeAuthority.ExplicitCommand,
            usage.commandName,
            usage.commandSource,
            'binding command',
          );
    }
    case 'bind': {
      const declarationModeSource = describeAddress(store, bindable.definition.modeSourceAddressHandle);
      if (bindable.definition.mode === BindableBindingMode.Default) {
        return mode !== 'toView'
          ? openBindableUsageMode(
              usage,
              `Default bindable mode resolved to '${mode}' instead of the framework toView fallback.`,
            )
          : closedBindableUsageMode(
              usage,
              mode,
              SemanticTemplateBindableUsageModeAuthority.FrameworkFallback,
              usage.commandName,
              usage.commandSource,
              'default binding command',
            );
      }
      if (bindable.definition.modeSourceAddressHandle == null) {
        return mode === 'toView'
          ? closedBindableUsageMode(
              usage,
              mode,
              SemanticTemplateBindableUsageModeAuthority.FrameworkFallback,
              usage.commandName,
              usage.commandSource,
              'default binding command',
            )
          : openBindableUsageMode(
              usage,
              `Source-less bindable mode '${bindable.definition.mode}' cannot authorize '${mode}'.`,
            );
      }
      const declarationMode = publicBindableDefinitionMode(bindable.definition.mode);
      return declarationMode !== mode
        ? openBindableUsageMode(
            usage,
            `Bindable declaration mode '${bindable.definition.mode}' did not match planned mode '${mode}'.`,
          )
        : closedBindableUsageMode(
            usage,
            mode,
            SemanticTemplateBindableUsageModeAuthority.BindableDefault,
            usage.commandName,
            declarationModeSource,
            'bindable declaration mode',
          );
    }
    case null:
      return openBindableUsageMode(usage, 'Property binding has no authenticated authored binding command.');
    default:
      return openBindableUsageMode(
        usage,
        `Custom or unmodeled binding command '${usage.commandName}' has no closed binding-mode authority.`,
      );
  }
}

function publicBindableDefinitionMode(
  mode: BindableBindingMode,
): SemanticTemplateUsageEffectiveBindingMode | null {
  switch (mode) {
    case BindableBindingMode.OneTime:
      return 'oneTime';
    case BindableBindingMode.ToView:
      return 'toView';
    case BindableBindingMode.FromView:
      return 'fromView';
    case BindableBindingMode.TwoWay:
      return 'twoWay';
    case BindableBindingMode.Default:
      return null;
  }
}

function fixedCommandBindableUsageMode(
  commandName: string,
): SemanticTemplateUsageEffectiveBindingMode | null {
  switch (commandName) {
    case 'one-time':
      return BindableBindingMode.OneTime;
    case 'to-view':
      return BindableBindingMode.ToView;
    case 'from-view':
      return BindableBindingMode.FromView;
    case 'two-way':
      return BindableBindingMode.TwoWay;
    default:
      return null;
  }
}

function lastModeBehavior(
  entries: readonly RuntimeBindingBehaviorPlanEntry[],
): RuntimeBindingBehaviorPlanEntry | null {
  return entries
    .filter((entry) =>
      entry.builtInResource != null
      && bindingModeForBindingBehaviorName(entry.builtInResource.name) != null
    )
    .sort((left, right) => (right.bindOrder ?? -1) - (left.bindOrder ?? -1))[0] ?? null;
}

function bindingBehaviorSourceForCursor(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  binding: RuntimeBinding,
  entry: RuntimeBindingBehaviorPlanEntry,
): SemanticSourceReference | null {
  return cursorContext.query.locus.kind !== InquiryLocusKind.SourceCursor
    ? null
    : sourceReferenceForParserSpan(
        cursorContext.query.locus.cursor.filePath,
        entry.occurrence.expression.name.span,
        'name',
        describeAddress(store, binding.sourceAddressHandle),
      );
}

function publicBindableUsageMode(
  mode: TemplateBindingMode,
): SemanticTemplateUsageEffectiveBindingMode | null {
  switch (mode) {
    case TemplateBindingMode.OneTime:
      return BindableBindingMode.OneTime;
    case TemplateBindingMode.ToView:
      return BindableBindingMode.ToView;
    case TemplateBindingMode.FromView:
      return BindableBindingMode.FromView;
    case TemplateBindingMode.TwoWay:
      return BindableBindingMode.TwoWay;
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return null;
  }
}

function closedBindableUsageMode(
  usage: BindableUsageSite,
  usageEffectiveMode: SemanticTemplateUsageEffectiveBindingMode | null,
  usageModeAuthority: Exclude<
    SemanticTemplateBindableUsageModeAuthority,
    SemanticTemplateBindableUsageModeAuthority.Open
  >,
  usageModeCommand: string | null,
  usageModeSource: SemanticSourceReference | null,
  sourceAuthority: string,
): SemanticTemplateCursorBindableUsageModeFields {
  if (usageModeSource == null) {
    return openBindableUsageMode(
      usage,
      `No exact source was available for the ${sourceAuthority} binding-mode authority.`,
    );
  }
  if (usageModeCommand != null && usage.commandSource == null) {
    return openBindableUsageMode(
      usage,
      `No exact command source was available for '${usageModeCommand}'.`,
    );
  }
  return {
    usageEffectiveMode,
    usageModeAuthority,
    usageModeCommand,
    usageModeLocus: usage.locus,
    usagePresentationKind: usage.presentationKind,
    usageModeCommandKind: usage.commandKind,
    usageModeCommandSource: usage.commandSource,
    usageModeTargetSource: usage.targetSource,
    usageModeSource,
    usageModeOpenReason: null,
  };
}

function openBindableUsageMode(
  usage: BindableUsageSite,
  usageModeOpenReason: string,
  source: SemanticSourceReference | null = usage.commandSource ?? usage.valueSource,
): SemanticTemplateCursorBindableUsageModeFields {
  return {
    usageEffectiveMode: null,
    usageModeAuthority: SemanticTemplateBindableUsageModeAuthority.Open,
    usageModeCommand: usage.commandName,
    usageModeLocus: usage.locus,
    usagePresentationKind: usage.presentationKind,
    usageModeCommandKind: usage.commandKind,
    usageModeCommandSource: usage.commandSource,
    usageModeTargetSource: usage.targetSource,
    usageModeSource: source,
    usageModeOpenReason,
  };
}

export function noBindableUsageMode(): SemanticTemplateCursorBindableUsageModeFields {
  return {
    usageEffectiveMode: null,
    usageModeAuthority: null,
    usageModeCommand: null,
    usageModeLocus: null,
    usagePresentationKind: null,
    usageModeCommandKind: null,
    usageModeCommandSource: null,
    usageModeTargetSource: null,
    usageModeSource: null,
    usageModeOpenReason: null,
  };
}

export function bindableUsageModeMissingInputs(
  mode: SemanticTemplateCursorBindableUsageModeFields,
): readonly string[] {
  return mode.usageModeAuthority === SemanticTemplateBindableUsageModeAuthority.Open
    ? ['bindable-usage-mode:open']
    : [];
}
