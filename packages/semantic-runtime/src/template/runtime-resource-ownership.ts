import {
  sourceSpanContains,
} from '../kernel/address.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import {
  sourceSpanAddressForAddress,
} from '../kernel/source-address.js';
import type { KernelStore, KernelStoreReadView } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingObservedDependency,
  RuntimeBindingValueChannel,
} from '../observation/runtime-binding-observation.js';
import type {
  RuntimeBinding,
  RuntimeBindingReference,
  RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperation,
} from './runtime-binding.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import {
  htmlElementAttributeOwnersByAttributeProduct,
  type HtmlAttribute,
  type HtmlIrNode,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import type { RuntimeBindingBehaviorApplication } from './runtime-binding-behavior.js';
import type { RuntimeValueConverterApplication } from './runtime-value-converter.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
} from './runtime-controller.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import type { TemplateExpressionParse, TemplateValueSite } from './value-site.js';

/** Authored element/text products reached by compiler DOM traversal for this resource. */
export function resourceLocalCompilerReachableHtmlNodeProductHandles(
  resource: TemplateResourceRuntimeAnalysisEmission,
): ReadonlySet<ProductHandle> {
  return new Set(
    resource.compilation.compiledTemplate.compiledTemplate.compilerReachableNodeProductHandles,
  );
}

/** Authored attributes whose owner elements were reached by compiler DOM traversal. */
export function resourceLocalCompilerReachableHtmlAttributeProductHandles(
  resource: TemplateResourceRuntimeAnalysisEmission,
): ReadonlySet<ProductHandle> {
  const reachableNodes = resourceLocalCompilerReachableHtmlNodeProductHandles(resource);
  const owners = htmlElementAttributeOwnersByAttributeProduct(
    resource.compilation.html.nodes,
    resource.compilation.html.attributes,
  );
  return new Set(
    [...owners]
      .filter(([, owner]) => reachableNodes.has(owner.element.productHandle))
      .map(([attributeProductHandle]) => attributeProductHandle),
  );
}

export function compilerReachesHtmlNode(
  resource: TemplateResourceRuntimeAnalysisEmission,
  node: Pick<HtmlIrNode, 'productHandle'> | null,
): boolean {
  return node == null
    || resource.compilation.compiledTemplate.compiledTemplate.compilerReachableNodeProductHandles
      .includes(node.productHandle);
}

export function compilerReachesHtmlAttribute(
  resource: TemplateResourceRuntimeAnalysisEmission,
  attribute: Pick<HtmlAttribute, 'productHandle'> | null,
): boolean {
  return attribute == null
    || resourceLocalCompilerReachableHtmlAttributeProductHandles(resource).has(attribute.productHandle);
}

/** Expression parses authored by this resource, whether or not compiler assembly retained their source subtree. */
export function resourceLocalAuthoredTemplateExpressionParses(
  store: KernelStoreReadView & ProductDetailReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateExpressionParse[] {
  return [
    ...resource.runtimeAnalysis.runtimeRendering.dynamicExpressionParses.filter((parse) =>
      dynamicExpressionParseBelongsToResource(store, resource, parse)
    ),
    ...resource.compilation.bindingCommandLowering.expressionParses,
    ...resource.compilation.valueSites.parses,
  ];
}

/** Value sites authored by this resource, whether or not compiler assembly retained their source subtree. */
export function resourceLocalAuthoredTemplateValueSites(
  store: KernelStoreReadView & ProductDetailReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateValueSite[] {
  return [
    ...resource.runtimeAnalysis.runtimeRendering.dynamicValueSites.filter((site) =>
      dynamicValueSiteBelongsToResource(store, resource, site)
    ),
    ...resource.compilation.bindingCommandLowering.valueSites,
    ...resource.compilation.valueSites.sites,
  ];
}

/** Runtime-compiled instructions authored by this resource, excluding descendant aggregate-render rows. */
export function resourceLocalDynamicTemplateInstructions(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateInstruction[] {
  return resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.filter((instruction) =>
    dynamicInstructionBelongsToResource(store, resource, instruction)
  );
}

/** Exact captured AttrSyntax provenance published for one runtime-compiled spread instruction. */
export function capturedAttributeSyntaxForDynamicInstruction(
  store: KernelStore,
  instruction: TemplateInstruction,
): AttributeSyntax | null {
  const syntaxHandles = new Set<ProductHandle>();
  for (const claimHandle of store.readClaimsForSubject(instruction.productHandle)) {
    const claim = store.readClaim(claimHandle);
    if (claim?.predicateKey === KernelVocabulary.Instruction.DynamicInstructionOriginatesFromCapturedAttributeSyntax.key) {
      syntaxHandles.add(claim.objectHandle as ProductHandle);
    }
  }
  if (syntaxHandles.size !== 1) {
    return null;
  }
  return store.productDetails.read(TemplateProductDetails.AttributeSyntax, [...syntaxHandles][0]!);
}

/** Instructions authored by this resource, excluding descendant rows from recursive aggregate rendering. */
export function resourceLocalTemplateInstructions(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateInstruction[] {
  return [
    ...resource.compilation.compiledTemplate.instructions,
    ...resourceLocalDynamicTemplateInstructions(store, resource),
  ];
}

export function resourceLocalRuntimeBindings(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBinding[] {
  return resource.runtimeAnalysis.runtimeRendering.bindings.filter((binding) =>
    runtimeBindingReferenceBelongsToResource(store, resource, binding.toReference())
  );
}

export function resourceLocalBindingTargetAccesses(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetAccess[] {
  return resource.runtimeAnalysis.controllerBind.targetAccesses.filter((access) =>
    runtimeBindingReferenceBelongsToResource(store, resource, access.binding)
  );
}

export function resourceLocalBindingSourceOperations(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingSourceOperation[] {
  return resource.runtimeAnalysis.controllerBind.sourceOperations.filter((operation) =>
    runtimeBindingReferenceBelongsToResource(store, resource, operation.binding)
  );
}

export function resourceLocalBindingBehaviorApplications(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingBehaviorApplication[] {
  return resource.runtimeAnalysis.bindingBehavior.applications.filter((application) =>
    runtimeBindingReferenceBelongsToResource(store, resource, application.binding)
  );
}

export function resourceLocalValueConverterApplications(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeValueConverterApplication[] {
  return resource.runtimeAnalysis.valueConverter.applications.filter((application) =>
    runtimeBindingReferenceBelongsToResource(store, resource, application.binding)
  );
}

export function resourceLocalBindingTargetOperations(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetOperation[] {
  return [
    ...resource.runtimeAnalysis.runtimeRendering.targetOperations,
    ...resource.runtimeAnalysis.controllerBind.targetOperations,
  ].filter((operation) =>
    operation.binding == null
      ? sourceAddressBelongsToResourceTemplate(store, resource, operation.sourceAddressHandle)
      : runtimeBindingReferenceBelongsToResource(store, resource, operation.binding)
  );
}

export function resourceLocalBindingValueChannels(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingValueChannel[] {
  return resource.runtimeAnalysis.bindingValueChannel.valueChannels.filter((valueChannel) =>
    runtimeBindingReferenceBelongsToResource(store, resource, valueChannel.binding)
  );
}

export function resourceLocalBindingDataFlows(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingDataFlow[] {
  return resource.runtimeAnalysis.bindingDataFlow.dataFlows.filter((dataFlow) =>
    runtimeBindingReferenceBelongsToResource(store, resource, dataFlow.binding)
  );
}

export function resourceLocalBindingObservedDependencies(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingObservedDependency[] {
  return resource.runtimeAnalysis.bindingDataFlow.observedDependencies.filter((dependency) =>
    runtimeBindingReferenceBelongsToResource(store, resource, dependency.binding)
  );
}

function runtimeBindingReferenceBelongsToResource(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  binding: RuntimeBindingReference,
): boolean {
  const sourceOwnership = sourceAddressResourceOwnership(store, resource, binding.addressHandle);
  if (sourceOwnership != null) {
    return sourceOwnership;
  }
  if (binding.productHandle == null) {
    return false;
  }
  const context = resource.runtimeAnalysis.runtimeRendering.requireRenderContextForBinding(binding.productHandle);
  return controllerTemplateOwnerDefinitionProductHandle(context.renderingController)
    === resource.compilation.definition.productHandle;
}

function controllerTemplateOwnerDefinitionProductHandle(
  controller: RuntimeControllerFrame,
): ProductHandle | null {
  let current: RuntimeControllerFrame | null = controller;
  while (current != null) {
    switch (current.creationKind) {
      case RuntimeControllerCreationKind.RootCustomElement:
      case RuntimeControllerCreationKind.RoutedCustomElement:
      case RuntimeControllerCreationKind.CustomElement:
        return current.definitionProductHandle;
      case RuntimeControllerCreationKind.CustomAttribute:
      case RuntimeControllerCreationKind.TemplateController:
      case RuntimeControllerCreationKind.SyntheticView:
        current = current.parent;
        break;
    }
  }
  return null;
}

function sourceAddressBelongsToResourceTemplate(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  addressHandle: AddressHandle | null,
): boolean {
  return sourceAddressResourceOwnership(store, resource, addressHandle) === true;
}

function dynamicExpressionParseBelongsToResource(
  store: KernelStoreReadView & ProductDetailReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  parse: TemplateExpressionParse,
): boolean {
  const site = store.readProductDetail(TemplateProductDetails.ValueSite, parse.site.productHandle);
  return site == null
    ? sourceAddressBelongsToResourceTemplate(store, resource, parse.sourceAddressHandle)
    : dynamicValueSiteBelongsToResource(store, resource, site);
}

function dynamicValueSiteBelongsToResource(
  store: KernelStoreReadView & ProductDetailReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  site: TemplateValueSite,
): boolean {
  if (site.syntax == null) {
    return sourceAddressBelongsToResourceTemplate(store, resource, site.sourceAddressHandle);
  }
  const syntaxProductHandle = site.syntax.productHandle;
  return resource.compilation.authoredAttributeSyntaxes.some((syntax) =>
    syntax.productHandle === syntaxProductHandle
  );
}

function dynamicInstructionBelongsToResource(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  instruction: TemplateInstruction,
): boolean {
  const syntax = capturedAttributeSyntaxForDynamicInstruction(store, instruction);
  return syntax == null
    ? sourceAddressBelongsToResourceTemplate(store, resource, instruction.sourceAddressHandle)
    : resource.compilation.authoredAttributeSyntaxes.some((candidate) =>
      candidate.productHandle === syntax.productHandle
    );
}

function sourceAddressResourceOwnership(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  addressHandle: AddressHandle | null,
): boolean | null {
  const resourceSpan = sourceSpanAddressForAddress(
    store,
    resource.compilation.unit.templateSource.sourceAddressHandle,
  );
  const sourceSpan = sourceSpanAddressForAddress(store, addressHandle);
  return resourceSpan == null || sourceSpan == null
    ? null
    : sourceSpanContains(resourceSpan, sourceSpan);
}
