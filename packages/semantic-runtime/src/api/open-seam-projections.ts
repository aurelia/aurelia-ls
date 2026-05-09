import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, OpenSeamHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { KernelStore } from '../kernel/store.js';

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

  for (const seam of store.readOpenSeams()) {
    if (seam.addressHandle != null && addressBelongsToApp(store, seam.addressHandle, sourceFileHandles)) {
      rows.set(seam.handle, seam);
    }
  }

  for (const seam of emission.appWorld.diWorld.openSeams) {
    rows.set(seam.handle, seam);
  }
  for (const seam of emission.routeInstructions.openSeams) {
    rows.set(seam.handle, seam);
  }
  for (const resource of emission.templates.resources) {
    for (const seam of resource.compilation.compiledTemplate.openSeams) {
      rows.set(seam.handle, seam);
    }
    for (const seam of resource.runtimeAnalysis.runtimeRendering.openSeams) {
      rows.set(seam.handle, seam);
    }
    for (const seam of resource.runtimeAnalysis.controllerBind.openSeams) {
      rows.set(seam.handle, seam);
    }
    for (const seam of resource.runtimeAnalysis.bindingValueChannel.openSeams) {
      rows.set(seam.handle, seam);
    }
    for (const seam of resource.runtimeAnalysis.bindingDataFlow.openSeams) {
      rows.set(seam.handle, seam);
    }
  }

  return [...rows.values()];
}

function sourceFileAddressHandles(emission: AureliaAppWorldProjectEmission): ReadonlySet<AddressHandle> {
  return new Set([
    ...emission.project.sourceFiles.map((source) => source.addressHandle),
    ...emission.evaluation.sources.map((source) => source.admission.addressHandle),
    ...emission.resources.sources.map((source) => source.admission.addressHandle),
  ]);
}

function addressBelongsToApp(
  store: KernelStore,
  addressHandle: AddressHandle,
  sourceFileHandles: ReadonlySet<AddressHandle>,
  seen: Set<AddressHandle> = new Set(),
): boolean {
  if (sourceFileHandles.has(addressHandle)) {
    return true;
  }
  if (seen.has(addressHandle)) {
    return false;
  }
  seen.add(addressHandle);
  const address = store.readAddress(addressHandle);
  if (address == null) {
    return false;
  }

  switch (address.kind) {
    case 'source-file-address':
      return sourceFileHandles.has(address.handle);
    case 'source-span-address':
      return addressBelongsToApp(store, address.fileHandle, sourceFileHandles, seen);
    case 'template-address':
      return address.authoredSourceHandle != null
        && addressBelongsToApp(store, address.authoredSourceHandle, sourceFileHandles, seen);
    case 'template-node-address':
      return (
        address.authoredSourceHandle != null
        && addressBelongsToApp(store, address.authoredSourceHandle, sourceFileHandles, seen)
      ) || addressBelongsToApp(store, address.templateHandle, sourceFileHandles, seen);
    case 'generated-address':
      return address.anchorHandle != null
        && store.readAddress(address.anchorHandle as AddressHandle) != null
        && addressBelongsToApp(store, address.anchorHandle as AddressHandle, sourceFileHandles, seen);
    case 'external-address':
      return false;
  }
}
