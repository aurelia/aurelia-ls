import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HydrateElementInstruction,
  type HydrateElementProjectionDefinition,
} from '../template/instruction-ir.js';
import type { CompiledTemplate } from '../template/compiled-template.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type { RuntimeContentProjectionView } from '../template/runtime-content-projection.js';
import { describeAddress } from './source-reference.js';
import {
  SemanticTemplateContentProjectionSurfaceKind,
  type SemanticTemplateContentProjectionNativeOutletRow,
  type SemanticTemplateContentProjectionProviderRow,
  type SemanticTemplateContentProjectionRow,
  type SemanticTemplateContentProjectionViewRow,
} from './contracts.js';

type RuntimeTemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

/** Public compiler/runtime projection topology without DOM activation or slot-observer state. */
export function readTemplateContentProjectionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTemplateContentProjectionRow[] {
  return emission.templates.resources
    .flatMap((resource) => [
      ...providerRows(resource, store, handles),
      ...viewRows(resource, store, handles),
      ...nativeOutletRows(resource, store, handles),
    ])
    .sort((left, right) =>
      `${left.renderingDefinitionName}:${left.surfaceKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.renderingDefinitionName}:${right.surfaceKind}:${right.source?.label ?? ''}`)
    );
}

function providerRows(
  resource: RuntimeTemplateResourceEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTemplateContentProjectionProviderRow[] {
  return resource.compilation.compiledTemplate.instructions.flatMap((instruction) => {
    if (!(instruction instanceof HydrateElementInstruction)) {
      return [];
    }
    const projectedSlotNames = instruction.projections.map((projection) => projection.slotName);
    return instruction.projections.map((projection) =>
      providerRow(
        resource.compilation.definition.name,
        instruction,
        projection,
        resource.compilation.compiledTemplate.readCompiledTemplate(projection.compiledTemplate.productHandle),
        projectedSlotNames,
        store,
        handles,
      )
    );
  });
}

function providerRow(
  renderingDefinitionName: string,
  instruction: HydrateElementInstruction,
  projection: HydrateElementProjectionDefinition,
  compiledTemplate: CompiledTemplate | null,
  providerProjectedSlotNames: readonly string[],
  store: KernelStore,
  handles: boolean,
): SemanticTemplateContentProjectionProviderRow {
  return {
    surfaceKind: SemanticTemplateContentProjectionSurfaceKind.ProviderDefinition,
    renderingDefinitionName,
    receivingElementName: instruction.elementName,
    slotName: projection.slotName,
    providerProjectedSlotNames,
    contributorCount: projection.contributors.length,
    explicitContributorCount: projection.contributors.filter((contributor) =>
      contributor.slotNameSourceAddressHandle != null
    ).length,
    instructionCount: compiledTemplateInstructionCount(store, compiledTemplate),
    source: describeAddress(store, projection.sourceAddressHandle),
    ...(handles
      ? {
        handles: {
          providerInstructionProductHandle: instruction.productHandle,
          compiledTemplateProductHandle: projection.compiledTemplate.productHandle,
          sourceAddressHandle: projection.sourceAddressHandle,
        },
      }
      : {}),
  };
}

function viewRows(
  resource: RuntimeTemplateResourceEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTemplateContentProjectionViewRow[] {
  return resource.runtimeAnalysis.runtimeRendering.contentProjectionViews.map((view) =>
    viewRow(resource.compilation.definition.name, view, store, handles)
  );
}

function viewRow(
  renderingDefinitionName: string,
  view: RuntimeContentProjectionView,
  store: KernelStore,
  handles: boolean,
): SemanticTemplateContentProjectionViewRow {
  return {
    surfaceKind: SemanticTemplateContentProjectionSurfaceKind.AuSlotView,
    renderingDefinitionName,
    slotName: view.slotName,
    selectionKind: view.selectionKind,
    closureKind: view.closureKind,
    auSlotsInfoSourceKind: view.slotsInfo?.sourceKind ?? null,
    providerProjectedSlotNames: view.slotsInfo?.projectedSlots ?? [],
    declaringControllerName: view.declaringController?.name ?? null,
    receivingControllerName: view.receivingController?.name ?? null,
    outletControllerName: view.outletController.name,
    instructionCount: compiledTemplateInstructionCount(store, view.compiledTemplate),
    hasViewFactory: view.viewFactory != null,
    hasSyntheticController: view.syntheticController != null,
    factoryContainerDepth: view.factoryContainer?.depth ?? null,
    factoryContainerResourceCount: view.factoryContainer?.readResourceSlots().length ?? null,
    source: describeAddress(store, view.sourceAddressHandle),
    ...(handles
      ? {
        handles: {
          outletInstructionProductHandle: view.outletInstruction.productHandle,
          providerInstructionProductHandle: view.providerInstruction?.productHandle ?? null,
          declaringControllerProductHandle: view.declaringController?.productHandle ?? null,
          receivingControllerProductHandle: view.receivingController?.productHandle ?? null,
          outletControllerProductHandle: view.outletController.productHandle,
          viewFactoryProductHandle: view.viewFactory?.productHandle ?? null,
          compiledTemplateProductHandle: view.compiledTemplate?.productHandle ?? null,
          syntheticControllerProductHandle: view.syntheticController?.productHandle ?? null,
          factoryContainerProductHandle: view.factoryContainer?.productHandle ?? null,
          factoryHydrationContextProductHandle: view.factoryHydrationContext?.productHandle ?? null,
          slotsInfoProductHandle: view.slotsInfo?.productHandle ?? null,
          sourceAddressHandle: view.sourceAddressHandle,
        },
      }
      : {}),
  };
}

function compiledTemplateInstructionCount(
  store: KernelStore,
  compiledTemplate: CompiledTemplate | null,
): number {
  return compiledTemplate?.targets.reduce((count, target) =>
    count + (store.productDetails.read(
      TemplateProductDetails.InstructionSequence,
      target.instructionSequenceProductHandle,
    )?.instructions.length ?? 0), 0) ?? 0;
}

function nativeOutletRows(
  resource: RuntimeTemplateResourceEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTemplateContentProjectionNativeOutletRow[] {
  return resource.compilation.compiledTemplate.compiledTemplate.nativeSlotOutlets.map((outlet) => ({
    surfaceKind: SemanticTemplateContentProjectionSurfaceKind.NativeSlotOutlet,
    renderingDefinitionName: resource.compilation.definition.name,
    nameKind: outlet.nameKind,
    slotName: outlet.name,
    source: describeAddress(store, outlet.node.addressHandle),
    ...(handles
      ? {
        handles: {
          nodeProductHandle: outlet.node.productHandle,
          nameSourceAddressHandle: outlet.nameSourceAddressHandle,
          sourceAddressHandle: outlet.node.addressHandle,
        },
      }
      : {}),
  }));
}
