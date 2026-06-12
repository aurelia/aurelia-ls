import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  CheckerTypeProjector,
  CheckerTypeMemberProjectionPolicy,
} from '../type-system/checker-projector.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  FromStateDecoratorBindingSite,
  readFromStateDecoratorBindingSites,
} from './from-state-decorator-recognition.js';
import {
  StateGetterBinding,
  StateGetterBindingStoreResolutionKind,
  type StateStoreConfiguration,
} from './model.js';
import { StateProductDetails } from './product-details.js';
import {
  configuredStateStoreForName,
  stateStoreDisplayName,
} from './state-store-identity.js';
import {
  stateGetterBindingProductEmission,
  type StateGetterBindingProductSeed,
} from './state-getter-binding-product-records.js';

export class StateGetterBindingProjectResult {
  constructor(
    readonly bindings: readonly StateGetterBinding[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readBindings(): readonly StateGetterBinding[] {
    return this.bindings;
  }
}

/** Materializes source-level StateGetterBinding rows created by @fromState(...) lifecycle hook registration. */
export class StateGetterBindingMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    stateStores: readonly StateStoreConfiguration[],
  ): StateGetterBindingProjectResult {
    const seeds = readFromStateDecoratorBindingSites(project, typeSystem).map((site, index) =>
      stateGetterBindingProductSeed(store, project, typeSystem, stateStores, site, index)
    );
    const emissions = seeds.map((seed, index) =>
      stateGetterBindingProductEmission(store, seed, index)
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `state-getter-bindings:${project.projectKey}`));
    }
    for (const emission of emissions) {
      store.productDetails.add(StateProductDetails.GetterBinding, emission.binding.productHandle, emission.binding);
    }
    return new StateGetterBindingProjectResult(
      emissions.map((emission) => emission.binding),
      records,
    );
  }
}

function stateGetterBindingProductSeed(
  store: KernelStore,
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  stateStores: readonly StateStoreConfiguration[],
  site: FromStateDecoratorBindingSite,
  index: number,
): StateGetterBindingProductSeed {
  const local = [
    'state-getter-binding-source',
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
  const source = sourceSpanAddressForSite(store, local, site);
  const selectorSource = sourceSpanAddressForSite(store, `${local}:selector`, {
    sourceFileAddressHandle: site.sourceFileAddressHandle,
    start: site.selectorStart,
    end: site.selectorEnd,
  });
  const targetSource = site.targetNameStart == null || site.targetNameEnd == null
    ? null
    : sourceSpanAddressForSite(store, `${local}:target`, {
      sourceFileAddressHandle: site.sourceFileAddressHandle,
      start: site.targetNameStart,
      end: site.targetNameEnd,
    });
  const programSourceFile = typeSystem.readProgramSourceFileByPath(site.sourcePath);
  const selectorReturnType = programSourceFile == null
    ? null
    : selectorReturnTypeReference(
      store,
      typeSystem,
      programSourceFile,
      site,
      selectorSource.handle,
      `${local}:selector-return-type`,
    );
  const targetMemberType = programSourceFile == null || targetSource == null
    ? null
    : targetMemberTypeReference(
      store,
      typeSystem,
      programSourceFile,
      site,
      targetSource.handle,
      `${local}:target-member-type`,
    );
  const resolved = stateGetterBindingStoreResolution(site, stateStores);
  return {
    projectKey: project.projectKey,
    sourceAddressHandle: source.handle,
    selectorSourceAddressHandle: selectorSource.handle,
    targetSourceAddressHandle: targetSource?.handle ?? null,
    targetKind: site.targetKind,
    targetName: site.targetName,
    storeName: site.storeName,
    storeResolutionKind: resolved.kind,
    storeProductHandle: resolved.store?.productHandle ?? null,
    storeIdentityHandle: resolved.store?.identityHandle ?? null,
    selectorText: site.selectorText,
    selectorReturnType,
    targetMemberType,
    openReason: stateGetterBindingOpenReason(site, resolved, selectorReturnType, targetMemberType),
    sourceRecords: [
      ...source.records,
      ...selectorSource.records,
      ...(targetSource?.records ?? []),
    ],
  };
}

function stateGetterBindingStoreResolution(
  site: FromStateDecoratorBindingSite,
  stateStores: readonly StateStoreConfiguration[],
): {
  readonly kind: StateGetterBindingStoreResolutionKind;
  readonly store: StateStoreConfiguration | null;
} {
  if (site.storeName === undefined) {
    return {
      kind: StateGetterBindingStoreResolutionKind.DynamicStoreName,
      store: null,
    };
  }
  const store = configuredStateStoreForName(stateStores, site.storeName);
  if (store == null) {
    return {
      kind: StateGetterBindingStoreResolutionKind.MissingStore,
      store: null,
    };
  }
  return {
    kind: site.storeName == null
      ? StateGetterBindingStoreResolutionKind.DefaultStore
      : StateGetterBindingStoreResolutionKind.NamedStore,
    store,
  };
}

function stateGetterBindingOpenReason(
  site: FromStateDecoratorBindingSite,
  resolution: ReturnType<typeof stateGetterBindingStoreResolution>,
  selectorReturnType: CheckerTypeReference | null,
  targetMemberType: CheckerTypeReference | null,
): string | null {
  const reasons: string[] = [];
  switch (resolution.kind) {
    case StateGetterBindingStoreResolutionKind.DynamicStoreName:
      reasons.push('@fromState uses a runtime-dependent store name expression; semantic-runtime cannot choose the Store instance yet.');
      break;
    case StateGetterBindingStoreResolutionKind.MissingStore:
      reasons.push(`@fromState references store "${stateStoreDisplayName(site.storeName)}", but no configured @aurelia/state store with that name is visible.`);
      break;
    case StateGetterBindingStoreResolutionKind.DefaultStore:
    case StateGetterBindingStoreResolutionKind.NamedStore:
      break;
  }
  if (selectorReturnType == null) {
    reasons.push('The @fromState selector return type could not be projected from the current TypeChecker epoch.');
  }
  if (targetMemberType == null) {
    reasons.push('The decorated field/setter target type could not be projected from the current TypeChecker epoch.');
  }
  return reasons.length === 0 ? null : reasons.join(' ');
}

function selectorReturnTypeReference(
  store: KernelStore,
  typeSystem: TypeSystemProject,
  sourceFile: ts.SourceFile,
  site: FromStateDecoratorBindingSite,
  sourceAddressHandle: AddressHandle,
  localKey: string,
): CheckerTypeReference | null {
  const selector = smallestExpressionForSpan(sourceFile, site.selectorStart, site.selectorEnd);
  if (selector == null) {
    return null;
  }
  const checkerSelector = typeSystem.readProgramExpression(selector);
  if (checkerSelector == null) {
    return null;
  }
  const checker = typeSystem.checker;
  const selectorType = typeSystem.readProgramTypeAtLocation(selector);
  if (selectorType == null) {
    return null;
  }
  const signature = checker.getSignaturesOfType(selectorType, ts.SignatureKind.Call)[0] ?? null;
  if (signature == null) {
    return null;
  }
  const returnType = checker.getReturnTypeOfSignature(signature);
  return new CheckerTypeProjector(store).ensureProjection({
    localKey,
    checker,
    type: returnType,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: checkerSelector,
    sourceAddressHandle,
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  }).toReference();
}

function targetMemberTypeReference(
  store: KernelStore,
  typeSystem: TypeSystemProject,
  sourceFile: ts.SourceFile,
  site: FromStateDecoratorBindingSite,
  sourceAddressHandle: AddressHandle,
  localKey: string,
): CheckerTypeReference | null {
  const target = site.targetNameStart == null || site.targetNameEnd == null
    ? null
    : smallestNodeForSpan(sourceFile, site.targetNameStart, site.targetNameEnd);
  if (target == null) {
    return null;
  }
  const checkerTarget = typeSystem.readProgramNode(target);
  if (checkerTarget == null) {
    return null;
  }
  const checker = typeSystem.checker;
  const targetType = typeSystem.readProgramTypeAtLocation(target);
  if (targetType == null) {
    return null;
  }
  return new CheckerTypeProjector(store).ensureProjection({
    localKey,
    checker,
    type: targetType,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: checkerTarget,
    sourceAddressHandle,
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  }).toReference();
}

function smallestExpressionForSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Expression | null {
  const node = smallestNodeForSpan(sourceFile, start, end);
  return node != null && ts.isExpression(node) ? node : null;
}

function smallestNodeForSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Node | null {
  let best: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (node.end < start || node.getStart(sourceFile) > end) {
      return;
    }
    if (node.getStart(sourceFile) === start && node.end === end) {
      best = node;
    }
    if (node.getStart(sourceFile) <= start && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
}
