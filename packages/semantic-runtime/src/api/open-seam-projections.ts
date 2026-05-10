import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, OpenSeamHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import { addressBelongsToSourceFiles } from '../kernel/source-address.js';
import type { KernelStore } from '../kernel/store.js';

type RuntimeTemplateResource = AureliaAppWorldProjectEmission['templates']['resources'][number];

/**
 * Read open seams owned by the app-world emission instead of the whole shared workspace store.
 *
 * The kernel store is intentionally shared across a booted workspace. In monorepos, opening more than one app should
 * not make `app.openSeams()` accumulate seams from previously opened project frames.
 */
export function readAppOpenSeams(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly OpenSeam[] {
  const sourceFileHandles = sourceFileAddressHandles(emission);
  const rows = new Map<OpenSeamHandle, OpenSeam>();

  recordSourceFileOpenSeams(rows, store, sourceFileHandles);
  recordOpenSeams(rows, emission.appWorld.diWorld.openSeams);
  recordOpenSeams(rows, emission.routeInstructions.openSeams);
  for (const resource of emission.templates.resources) {
    recordOpenSeams(rows, templateResourceOpenSeams(resource));
  }

  return [...rows.values()];
}

function recordSourceFileOpenSeams(
  rows: Map<OpenSeamHandle, OpenSeam>,
  store: KernelStore,
  sourceFileHandles: ReadonlySet<AddressHandle>,
): void {
  for (const seam of store.readOpenSeams()) {
    if (seam.addressHandle != null && addressBelongsToSourceFiles(store, seam.addressHandle, sourceFileHandles)) {
      rows.set(seam.handle, seam);
    }
  }
}

function recordOpenSeams(
  rows: Map<OpenSeamHandle, OpenSeam>,
  seams: readonly OpenSeam[],
): void {
  for (const seam of seams) {
    rows.set(seam.handle, seam);
  }
}

function templateResourceOpenSeams(resource: RuntimeTemplateResource): readonly OpenSeam[] {
  return [
    ...resource.compilation.compiledTemplate.openSeams,
    ...resource.runtimeAnalysis.runtimeRendering.openSeams,
    ...resource.runtimeAnalysis.controllerBind.openSeams,
    ...resource.runtimeAnalysis.bindingValueChannel.openSeams,
    ...resource.runtimeAnalysis.bindingDataFlow.openSeams,
  ];
}

function sourceFileAddressHandles(emission: AureliaAppWorldProjectEmission): ReadonlySet<AddressHandle> {
  return new Set([
    ...emission.project.sourceFiles.map((source) => source.addressHandle),
    ...emission.evaluation.sources.map((source) => source.admission.addressHandle),
    ...emission.resources.sources.map((source) => source.admission.addressHandle),
  ]);
}
