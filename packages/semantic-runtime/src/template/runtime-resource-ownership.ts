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
import type { KernelStoreReadView } from '../kernel/store.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingObservedDependency,
  RuntimeBindingValueChannel,
} from '../observation/runtime-binding-observation.js';
import type {
  RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
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
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateInstruction[] {
  return resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.filter((instruction) =>
    dynamicInstructionBelongsToResource(resource, instruction)
  );
}

/** Exact captured AttrSyntax provenance published for one runtime-compiled spread instruction. */
export function capturedAttributeSyntaxForDynamicInstruction(
  resource: TemplateResourceRuntimeAnalysisEmission,
  instruction: TemplateInstruction,
): AttributeSyntax | null {
  const syntaxProductHandle = resource.runtimeAnalysis.runtimeRendering
    .readDynamicInstructionOriginSyntaxProductHandle(instruction.productHandle);
  return syntaxProductHandle == null
    ? null
    : resource.compilation.authoredAttributeSyntaxes.find((syntax) =>
      syntax.productHandle === syntaxProductHandle
    ) ?? null;
}

/** Instructions authored by this resource, excluding descendant rows from recursive aggregate rendering. */
export function resourceLocalTemplateInstructions(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateInstruction[] {
  return [
    ...resource.compilation.compiledTemplate.instructions,
    ...resourceLocalDynamicTemplateInstructions(resource),
  ];
}

export function resourceLocalRuntimeBindings(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBinding[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.runtimeRendering.bindings,
    (binding) => binding.toReference(),
  );
}

export function resourceLocalBindingTargetAccesses(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetAccess[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.controllerBind.targetAccesses,
    (access) => access.binding,
  );
}

export function resourceLocalBindingSourceOperations(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingSourceOperation[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.controllerBind.sourceOperations,
    (operation) => operation.binding,
  );
}

export function resourceLocalBindingBehaviorApplications(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingBehaviorApplication[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.bindingBehavior.applications,
    (application) => application.binding,
  );
}

export function resourceLocalValueConverterApplications(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeValueConverterApplication[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.valueConverter.applications,
    (application) => application.binding,
  );
}

export function resourceLocalBindingTargetOperations(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetOperation[] {
  const localInstructionProductHandles = resourceLocalTemplateInstructionProductHandles(resource);
  const localBindingProductHandles = resourceLocalRuntimeBindingProductHandles(
    resource,
    localInstructionProductHandles,
  );
  return [
    ...resource.runtimeAnalysis.runtimeRendering.targetOperations,
    ...resource.runtimeAnalysis.controllerBind.targetOperations,
  ].filter((operation) =>
    operation.binding == null
      ? operation.instructionProductHandle == null
        ? sourceAddressBelongsToResourceTemplate(store, resource, operation.sourceAddressHandle)
        : localInstructionProductHandles.has(operation.instructionProductHandle)
      : runtimeBindingReferenceBelongsToResource(
        store,
        resource,
        localBindingProductHandles,
        operation.binding,
      )
  );
}

export function resourceLocalBindingValueChannels(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingValueChannel[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.bindingValueChannel.valueChannels,
    (valueChannel) => valueChannel.binding,
  );
}

export function resourceLocalBindingDataFlows(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingDataFlow[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.bindingDataFlow.dataFlows,
    (dataFlow) => dataFlow.binding,
  );
}

export function resourceLocalRuntimeExpressionAccessUses(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeExpressionAccessUse[] {
  const localBindingProductHandles = resourceLocalRuntimeBindingProductHandles(resource);
  return resource.runtimeAnalysis.expressionAccessUses.accessUses.filter((accessUse) => {
    const binding = resource.runtimeAnalysis.runtimeRendering.readBinding(accessUse.ownerProductHandle);
    if (binding != null) {
      // Binding-owned method-body accesses legitimately live in TypeScript source. Their operation owner, not their
      // authored file, assigns them to the authored instruction owner.
      return runtimeBindingReferenceBelongsToResource(
        store,
        resource,
        localBindingProductHandles,
        binding.toReference(),
      );
    }
    return sourceAddressResourceOwnership(store, resource, accessUse.sourceAddressHandle) ?? false;
  });
}

export function resourceLocalBindingObservedDependencies(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingObservedDependency[] {
  return resourceLocalRowsForBindingReference(
    store,
    resource,
    resource.runtimeAnalysis.bindingDataFlow.observedDependencies,
    (dependency) => dependency.binding,
  );
}

function resourceLocalRowsForBindingReference<TRow>(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  rows: readonly TRow[],
  bindingForRow: (row: TRow) => RuntimeBindingReference,
): readonly TRow[] {
  const localBindingProductHandles = resourceLocalRuntimeBindingProductHandles(resource);
  return rows.filter((row) =>
    runtimeBindingReferenceBelongsToResource(
      store,
      resource,
      localBindingProductHandles,
      bindingForRow(row),
    )
  );
}

function resourceLocalRuntimeBindingProductHandles(
  resource: TemplateResourceRuntimeAnalysisEmission,
  instructionProductHandles = resourceLocalTemplateInstructionProductHandles(resource),
): ReadonlySet<ProductHandle> {
  return new Set(
    resource.runtimeAnalysis.runtimeRendering.bindings
      .filter((binding) => instructionProductHandles.has(binding.instructionProductHandle))
      .map((binding) => binding.productHandle),
  );
}

function resourceLocalTemplateInstructionProductHandles(
  resource: TemplateResourceRuntimeAnalysisEmission,
): ReadonlySet<ProductHandle> {
  return new Set(
    resourceLocalTemplateInstructions(resource).map((instruction) => instruction.productHandle),
  );
}

function runtimeBindingReferenceBelongsToResource(
  store: KernelStoreReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
  localBindingProductHandles: ReadonlySet<ProductHandle>,
  binding: RuntimeBindingReference,
): boolean {
  if (binding.productHandle != null) {
    return localBindingProductHandles.has(binding.productHandle);
  }
  return sourceAddressResourceOwnership(store, resource, binding.addressHandle) ?? false;
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
  resource: TemplateResourceRuntimeAnalysisEmission,
  instruction: TemplateInstruction,
): boolean {
  return capturedAttributeSyntaxForDynamicInstruction(resource, instruction) != null;
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
