import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HydrateElementInstruction,
  type HydrateElementProjectionInstructionSequence,
  type TemplateInstructionSequence,
} from '../template/instruction-ir.js';
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
  const sequences = new Map(resource.compilation.compiledTemplate.instructionSequences.map((sequence) =>
    [sequence.productHandle, sequence] as const
  ));
  return resource.compilation.compiledTemplate.instructions.flatMap((instruction) => {
    if (!(instruction instanceof HydrateElementInstruction)) {
      return [];
    }
    const projectedSlotNames = instruction.projectionInstructionSequences.map((projection) => projection.slotName);
    return instruction.projectionInstructionSequences.map((projection) =>
      providerRow(
        resource.compilation.definition.name,
        instruction,
        projection,
        sequences.get(projection.instructionSequenceProductHandle) ?? null,
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
  projection: HydrateElementProjectionInstructionSequence,
  sequence: TemplateInstructionSequence | null,
  providerProjectedSlotNames: readonly string[],
  store: KernelStore,
  handles: boolean,
): SemanticTemplateContentProjectionProviderRow {
  return {
    surfaceKind: SemanticTemplateContentProjectionSurfaceKind.ProviderSequence,
    renderingDefinitionName,
    receivingElementName: instruction.elementName,
    slotName: projection.slotName,
    providerProjectedSlotNames,
    contributorCount: projection.contributors.length,
    explicitContributorCount: projection.contributors.filter((contributor) =>
      contributor.slotNameSourceAddressHandle != null
    ).length,
    instructionCount: sequence?.instructions.length ?? 0,
    source: describeAddress(store, projection.sourceAddressHandle),
    ...(handles
      ? {
        handles: {
          providerInstructionProductHandle: instruction.productHandle,
          instructionSequenceProductHandle: projection.instructionSequenceProductHandle,
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
    instructionCount: view.instructionSequence?.instructions.length ?? 0,
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
          instructionSequenceProductHandle: view.instructionSequence?.productHandle ?? null,
          declaringControllerProductHandle: view.declaringController?.productHandle ?? null,
          receivingControllerProductHandle: view.receivingController?.productHandle ?? null,
          outletControllerProductHandle: view.outletController.productHandle,
          viewFactoryProductHandle: view.viewFactory?.productHandle ?? null,
          embeddedDefinitionProductHandle: view.viewFactory?.definitionProductHandle ?? null,
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
