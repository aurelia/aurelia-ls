import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SemanticStateGetterBindingRow,
  SemanticStateIssueRow,
  SemanticStateStoreRow,
} from './contracts.js';
import { describeAddress } from './source-reference.js';

/** Project @aurelia/state store-configuration products into stable API rows. */
export function readStateStoreRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticStateStoreRow[] {
  return emission.state.readStores()
    .map((stateStore): SemanticStateStoreRow => ({
      projectKey: emission.project.projectKey,
      name: stateStore.name,
      isDefault: stateStore.isDefault,
      initialStateKind: stateStore.initialStateKind,
      optionsOrHandlerKind: stateStore.optionsOrHandlerKind,
      actionHandlerCount: stateStore.actionHandlerCount,
      source: describeAddress(store, stateStore.sourceAddressHandle),
      ...(handles ? {
        handles: {
          productHandle: stateStore.productHandle,
          identityHandle: stateStore.identityHandle,
          sourceAddressHandle: stateStore.sourceAddressHandle,
          nameSourceAddressHandle: stateStore.nameSourceAddressHandle,
          initialStateSourceAddressHandle: stateStore.initialStateSourceAddressHandle,
          optionsOrHandlerSourceAddressHandle: stateStore.optionsOrHandlerSourceAddressHandle,
          actionHandlerSourceAddressHandles: stateStore.actionHandlerSourceAddressHandles,
        },
      } : {}),
    }))
    .sort((left, right) =>
      Number(right.isDefault) - Number(left.isDefault)
      || (left.name ?? '').localeCompare(right.name ?? '')
      || (left.source?.label ?? '').localeCompare(right.source?.label ?? '')
    );
}

/** Project @fromState-created StateGetterBinding products into stable API rows. */
export function readStateGetterBindingRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticStateGetterBindingRow[] {
  return emission.state.readGetterBindings()
    .map((binding): SemanticStateGetterBindingRow => ({
      projectKey: emission.project.projectKey,
      targetKind: binding.targetKind,
      targetName: binding.targetName,
      storeName: binding.storeName ?? null,
      usesDynamicStoreName: binding.storeName === undefined,
      storeResolutionKind: binding.storeResolutionKind,
      selectorText: binding.selectorText,
      selectorReturnType: binding.selectorReturnType?.display ?? null,
      targetMemberType: binding.targetMemberType?.display ?? null,
      openReason: binding.openReason,
      source: describeAddress(store, binding.sourceAddressHandle),
      selectorSource: describeAddress(store, binding.selectorSourceAddressHandle),
      targetSource: describeAddress(store, binding.targetSourceAddressHandle),
      ...(handles ? {
        handles: {
          productHandle: binding.productHandle,
          identityHandle: binding.identityHandle,
          sourceAddressHandle: binding.sourceAddressHandle,
          selectorSourceAddressHandle: binding.selectorSourceAddressHandle,
          targetSourceAddressHandle: binding.targetSourceAddressHandle,
          storeProductHandle: binding.storeProductHandle,
          storeIdentityHandle: binding.storeIdentityHandle,
          selectorReturnTypeProductHandle: binding.selectorReturnType?.productHandle ?? null,
          targetMemberTypeProductHandle: binding.targetMemberType?.productHandle ?? null,
        },
      } : {}),
    }))
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.targetName ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.targetName ?? ''}`)
    );
}

/** Project @aurelia/state issue products into stable diagnostic rows. */
export function readStateIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticStateIssueRow[] {
  return emission.state.readIssues()
    .map((issue): SemanticStateIssueRow => ({
      projectKey: issue.projectKey,
      phase: issue.phase,
      issueKind: issue.issueKind,
      diagnosticAuthority: 'framework-runtime-behavior',
      frameworkErrorCode: null,
      frameworkRawErrorAuthority: issue.frameworkRawErrorAuthority?.key ?? null,
      severity: issue.severity,
      message: issue.message,
      storeName: issue.storeName,
      source: describeAddress(store, issue.sourceAddressHandle),
      ...(handles ? {
        handles: {
          productHandle: issue.productHandle,
          identityHandle: issue.identityHandle,
          ownerIdentityHandle: issue.ownerIdentityHandle,
          sourceAddressHandle: issue.sourceAddressHandle,
        },
      } : {}),
    }))
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.issueKind}:${left.storeName ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.issueKind}:${right.storeName ?? ''}`)
    );
}
