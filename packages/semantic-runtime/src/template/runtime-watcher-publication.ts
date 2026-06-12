import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
import type { ProvenanceHandle } from '../kernel/handles.js';
import {
  BindingIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { runtimeObservedDependencyRecords } from '../observation/runtime-observed-dependency-publication.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import type { RuntimeWatcher } from './runtime-watcher.js';

export function runtimeWatcherClaimsForController(
  store: KernelStore,
  local: string,
  controller: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
): readonly SemanticClaim[] {
  return controller.readWatchers().map((watcher) => new SemanticClaim(
    store.handles.claim(`${local}:owns-watcher:${watcher.productHandle}`),
    controller.productHandle,
    KernelVocabulary.Configuration.ControllerOwnsRuntimeWatcher.key,
    watcher.productHandle,
    provenanceHandle,
  ));
}

export function runtimeWatcherRecordsForController(
  store: KernelStore,
  local: string,
  controller: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
  claims: readonly SemanticClaim[],
): readonly KernelStoreRecord[] {
  return controller.readWatchers().flatMap((watcher) =>
    runtimeWatcherRecords(store, `${local}:watcher:${watcher.productHandle}`, controller, watcher, provenanceHandle, claims)
  );
}

function runtimeWatcherRecords(
  store: KernelStore,
  local: string,
  controller: RuntimeControllerFrame,
  watcher: RuntimeWatcher,
  provenanceHandle: ProvenanceHandle,
  claims: readonly SemanticClaim[],
): readonly KernelStoreRecord[] {
  return [
    new BindingIdentity(
      watcher.identityHandle,
      controller.identityHandle,
      KernelVocabulary.Binding.Watcher.key,
    ),
    new MaterializedProduct(
      watcher.productHandle,
      KernelVocabulary.Binding.RuntimeWatcher.key,
      watcher.identityHandle,
      watcher.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(`${local}:runtime-watcher`),
      watcher.identityHandle,
      [watcher.productHandle],
      claimsForProduct(claims, watcher.productHandle).map((claim) => claim.handle),
    ),
    ...runtimeWatcherObservedDependencyRecords(store, local, watcher, provenanceHandle),
  ];
}

function runtimeWatcherObservedDependencyRecords(
  store: KernelStore,
  local: string,
  watcher: RuntimeWatcher,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return watcher.observedDependencies.flatMap((dependency, index) => {
    const dependencyLocal = `${local}:observed-dependency:${index}`;
    return runtimeObservedDependencyRecords({
      store,
      local: dependencyLocal,
      owner: {
        identityHandle: watcher.identityHandle,
        sourceAddressHandle: watcher.sourceAddressHandle,
      },
      dependency,
      index,
      provenanceHandle,
      claims: [
        {
          localName: 'runtime-watcher-uses-observed-dependency',
          subjectProductHandle: watcher.productHandle,
          predicateKey: KernelVocabulary.Binding.RuntimeWatcherUsesObservedDependency.key,
        },
      ],
    });
  });
}
