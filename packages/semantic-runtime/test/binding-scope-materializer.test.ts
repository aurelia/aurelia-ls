import { describe, expect, test } from 'vitest';

import { BindingScopeMaterializer } from '../src/configuration/scope-materializer.js';
import {
  BindingContextKind,
  BindingContextSlotDraft,
  BindingScope,
  BindingContextSlotAssignmentAccessKind,
} from '../src/configuration/scope.js';
import { ConfigurationIdentity } from '../src/kernel/identity.js';
import { MaterializedProduct } from '../src/kernel/materialization.js';
import { KernelStore } from '../src/kernel/store.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { templateScopesHaveEquivalentEvaluationContext } from '../src/template/template-scope-replay.js';
import {
  runtimeScopeNamedLookup,
  RuntimeScopeNamedLookupStatus,
} from '../src/template/runtime-scope-named-lookup.js';
import { CheckerTypeShapeAccess } from '../src/type-system/checker-type-shape-access.js';
import { CheckerTypeProjector } from '../src/type-system/checker-projector.js';

describe('binding scope materialization', () => {
  test('stops implicit named lookup at the nearest component boundary even when its type stays open', () => {
    const store = new KernelStore('binding-scope-boundary-named-lookup');
    const projector = new CheckerTypeProjector(store, store);
    const materializer = new BindingScopeMaterializer(store, projector);
    const outer = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'outer',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: null,
      viewModelType: null,
      bindingContextSlots: [new BindingContextSlotDraft('outerOnly')],
      sourceAddressHandle: null,
    })).scope;
    const innerBoundary = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'inner',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: outer,
      viewModelType: null,
      sourceAddressHandle: null,
    })).scope;
    const repeated = materializer.construct(BindingScope.fromRepeatedItem({
      localKey: 'repeat',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: innerBoundary,
      localSlots: [new BindingContextSlotDraft('item')],
      overrideSlots: [],
      sourceAddressHandle: null,
    })).scope;

    const lookup = runtimeScopeNamedLookup(
      new CheckerTypeShapeAccess(store, projector),
      repeated,
      'outerOnly',
    );
    expect(lookup).toMatchObject({
      status: RuntimeScopeNamedLookupStatus.Open,
      ancestor: 1,
      scope: innerBoundary,
      slot: null,
    });
  });

  test('lets a finite empty Promise context fall through while an unknown object context stays open', () => {
    const store = new KernelStore('binding-scope-finite-empty-context');
    const projector = new CheckerTypeProjector(store, store);
    const materializer = new BindingScopeMaterializer(store, projector);
    const typeAccess = new CheckerTypeShapeAccess(store, projector);
    const parent = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'parent',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: null,
      viewModelType: null,
      bindingContextSlots: [new BindingContextSlotDraft('formatReason')],
      sourceAddressHandle: null,
    })).scope;
    const promise = materializer.construct(BindingScope.fromParentObject({
      localKey: 'promise',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent,
      contextKind: BindingContextKind.Synthetic,
      contextType: null,
      sourceAddressHandle: null,
    })).scope;
    const unknownObject = materializer.construct(BindingScope.fromParentObject({
      localKey: 'unknown-object',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent,
      contextType: null,
      sourceAddressHandle: null,
    })).scope;

    expect(runtimeScopeNamedLookup(typeAccess, promise, 'formatReason')).toMatchObject({
      status: RuntimeScopeNamedLookupStatus.Context,
      ancestor: 1,
      scope: parent,
      slot: expect.objectContaining({ name: 'formatReason' }),
    });
    expect(runtimeScopeNamedLookup(typeAccess, unknownObject, 'formatReason')).toMatchObject({
      status: RuntimeScopeNamedLookupStatus.Open,
      ancestor: 0,
      scope: unknownObject,
      slot: null,
    });
  });

  test('projects content through a distinct scope that reuses the declaring binding context', () => {
    const store = new KernelStore('binding-scope-content-projection');
    const materializer = new BindingScopeMaterializer(
      store,
      new CheckerTypeProjector(store, store),
    );
    const declaringScope = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'declaring',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: null,
      viewModelType: null,
      sourceAddressHandle: null,
    })).scope;
    const hostSlot = new BindingContextSlotDraft('$host');
    const projection = materializer.prepare(BindingScope.forContentProjection({
      localKey: 'projected',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      declaringScope,
      overrideSlots: [hostSlot],
      sourceAddressHandle: null,
    }));

    expect(projection.scope).not.toBe(declaringScope);
    expect(projection.scope.runtimeParent).toBe(declaringScope);
    expect(projection.bindingContext).toBe(declaringScope.bindingContext);
    expect(projection.scope.bindingContext).toBe(declaringScope.bindingContext);
    expect(projection.overrideContext).not.toBe(declaringScope.overrideContext);
    expect(projection.overrideContext.lookup('$host')?.name).toBe('$host');
    expect(projection.bindingContextMaterialized).toBe(false);

    const bindingContextProduct = projection.records.find((record) =>
      record instanceof MaterializedProduct
      && record.productKindKey === KernelVocabulary.Configuration.BindingContext.key
    );
    const bindingContextIdentity = projection.records.find((record) =>
      record instanceof ConfigurationIdentity
      && record.productKindKey === KernelVocabulary.Configuration.BindingContext.key
    );
    expect(bindingContextProduct).toBeUndefined();
    expect(bindingContextIdentity).toBeUndefined();
  });

  test('treats duplicate projection realizations as equivalent despite distinct authored provenance', () => {
    const store = new KernelStore('binding-scope-duplicate-content-projection');
    const materializer = new BindingScopeMaterializer(
      store,
      new CheckerTypeProjector(store, store),
    );
    const declaringScope = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'declaring',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: null,
      viewModelType: null,
      sourceAddressHandle: null,
    })).scope;
    const targetIdentityHandle = store.handles.identity('projection-host');
    const projected = (localKey: string, sourceLocal: string) => materializer.prepare(
      BindingScope.forContentProjection({
        localKey,
        ownerProductHandle: null,
        ownerIdentityHandle: null,
        declaringScope,
        overrideSlots: [new BindingContextSlotDraft(
          '$host',
          targetIdentityHandle,
          null,
          null,
          store.handles.address(sourceLocal),
          [],
          null,
          [],
          BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly,
        )],
        sourceAddressHandle: store.handles.address(`${sourceLocal}:scope`),
      }),
    ).scope;

    const first = projected('projected:first', 'projection:first');
    const second = projected('projected:second', 'projection:second');

    expect(first.productHandle).not.toBe(second.productHandle);
    expect(first.overrideContext.lookup('$host')?.sourceAddressHandle)
      .not.toBe(second.overrideContext.lookup('$host')?.sourceAddressHandle);
    expect(templateScopesHaveEquivalentEvaluationContext(first, second)).toBe(true);
  });

  test('rejects projection equivalence when the host target or declaring topology differs', () => {
    const store = new KernelStore('binding-scope-content-projection-divergence');
    const materializer = new BindingScopeMaterializer(
      store,
      new CheckerTypeProjector(store, store),
    );
    const declaringScope = materializer.construct(BindingScope.forCustomElementController({
      localKey: 'declaring',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: null,
      viewModelType: null,
      sourceAddressHandle: null,
    })).scope;
    const nestedDeclaringScope = materializer.construct(BindingScope.fromParentObject({
      localKey: 'declaring:nested',
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      parent: declaringScope,
      contextType: null,
      sourceAddressHandle: null,
    })).scope;
    const projected = (
      localKey: string,
      parent: BindingScope,
      targetIdentityLocal: string,
    ) => materializer.prepare(BindingScope.forContentProjection({
      localKey,
      ownerProductHandle: null,
      ownerIdentityHandle: null,
      declaringScope: parent,
      overrideSlots: [new BindingContextSlotDraft(
        '$host',
        store.handles.identity(targetIdentityLocal),
        null,
        null,
        null,
        [],
        null,
        [],
        BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly,
      )],
      sourceAddressHandle: null,
    })).scope;

    const baseline = projected('projected:baseline', declaringScope, 'host:baseline');
    const differentHost = projected('projected:different-host', declaringScope, 'host:different');
    const differentParent = projected('projected:different-parent', nestedDeclaringScope, 'host:baseline');

    expect(templateScopesHaveEquivalentEvaluationContext(baseline, differentHost)).toBe(false);
    expect(templateScopesHaveEquivalentEvaluationContext(baseline, differentParent)).toBe(false);
  });
});
