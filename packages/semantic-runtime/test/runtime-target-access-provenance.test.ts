import { describe, expect, test } from 'vitest';

import { AppTaskSlot } from '../src/configuration/app-task.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../src/kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../src/kernel/handles.js';
import { KernelPublicationSurface } from '../src/kernel/publication-surface.js';
import { ProvenanceRecord, readFieldProvenance } from '../src/kernel/provenance.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  ObserverLocatorLookupResult,
} from '../src/observation/observer-locator.js';
import { ObservationDetailDescriptors } from '../src/observation/detail-descriptors.js';
import { RuntimeOperationReachability } from '../src/runtime-expression/runtime-operation.js';
import {
  HtmlIrNodeKind,
  HtmlNamespaceKind,
  HtmlNodeReference,
} from '../src/template/html-ir.js';
import {
  TemplateBindingMode,
  TemplateInstructionKind,
} from '../src/template/instruction-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  PropertyBinding,
  RuntimeBindingTarget,
  RuntimeBindingTargetAccessAuthority,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessProvenance,
  RuntimeBindingTargetAccessRequest,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetObserverCacheDisposition,
  RuntimeControllerObserverSetupOutcome,
  RuntimeObjectObservationAdapterReference,
} from '../src/template/runtime-binding.js';
import {
  RuntimeControllerBindPublisher,
} from '../src/template/runtime-controller-bind-publication.js';
import {
  RuntimeRendererKind,
  RuntimeRendererReference,
} from '../src/template/runtime-renderer-reference.js';

describe('runtime target-access provenance', () => {
  test('target-observer overrides replace ordinary selection and controller-setup causes', () => {
    const store = new KernelStore('target-access-override-provenance');
    const handles = store.handles;
    const observer = handles.provenance('observer');
    const adapter = handles.provenance('adapter');
    const setup = handles.provenance('setup');
    const override = handles.provenance('override');
    const ordinary = lookupResult(
      handles.product('observer-source'),
      handles.identity('observer-source'),
      handles.address('observer-source'),
      [new RuntimeObjectObservationAdapterReference(
        0,
        'Adapter',
        AppTaskSlot.Activating,
        handles.address('adapter'),
        adapter,
      )],
      new RuntimeBindingTargetAccessProvenance([observer], [adapter]),
    ).forControllerSetupAccess(
      RuntimeBindingTargetAccessLookup.Observer,
      RuntimeControllerObserverSetupOutcome.Installed,
      [setup],
    );

    expect(ordinary.selectionProvenance.observerSource).toEqual([observer]);
    expect(ordinary.selectionProvenance.objectObservationAdapters).toEqual([adapter]);
    expect(ordinary.selectionProvenance.controllerObserverSetup).toEqual([setup]);

    const replaced = ordinary.withTargetObserver(
      RuntimeBindingTargetAccessStrategy.DataAttributeAccessor,
      [],
      RuntimeBindingTargetAccessAuthority.BindingBehavior,
      [override],
    );

    expect(replaced.observerSourceProductHandle).toBeNull();
    expect(replaced.objectObservationAdapters).toEqual([]);
    expect(replaced.controllerObserverSetupOutcome).toBeNull();
    expect(replaced.selectionProvenance.observerSource).toEqual([]);
    expect(replaced.selectionProvenance.objectObservationAdapters).toEqual([]);
    expect(replaced.selectionProvenance.controllerObserverSetup).toEqual([]);
    expect(replaced.selectionProvenance.targetObserverOverride).toEqual([override]);
    expect(replaced.selectionProvenance.allHandles()).toEqual([override]);
  });

  test('publishes one field witness per field and retains every direct causal product', () => {
    const store = new KernelStore('target-access-field-provenance');
    const handles = store.handles;
    const observerEvidence = handles.evidence('observer');
    const observerProvenance = handles.provenance('observer');
    const adapterEvidence = handles.evidence('adapter');
    const adapterProvenance = handles.provenance('adapter');
    const firstSetupEvidence = handles.evidence('setup:first');
    const firstSetupProvenance = handles.provenance('setup:first');
    const secondSetupEvidence = handles.evidence('setup:second');
    const secondSetupProvenance = handles.provenance('setup:second');
    store.commit(new KernelStoreBatch([
      evidence(observerEvidence, 'observer source'),
      new ProvenanceRecord(observerProvenance, [observerEvidence]),
      evidence(adapterEvidence, 'object observation adapter'),
      new ProvenanceRecord(adapterProvenance, [adapterEvidence]),
      evidence(firstSetupEvidence, 'first controller setup input'),
      new ProvenanceRecord(firstSetupProvenance, [firstSetupEvidence]),
      evidence(secondSetupEvidence, 'second controller setup input'),
      new ProvenanceRecord(secondSetupProvenance, [secondSetupEvidence]),
    ], 'target-access-causes'));

    const observerProduct = handles.product('observer-source');
    const observerIdentity = handles.identity('observer-source');
    const observerAddress = handles.address('observer-source');
    const adapterAddress = handles.address('adapter');
    const adapter = new RuntimeObjectObservationAdapterReference(
      0,
      'Adapter',
      AppTaskSlot.Activating,
      adapterAddress,
      adapterProvenance,
    );
    const lookup = lookupResult(
      observerProduct,
      observerIdentity,
      observerAddress,
      [adapter],
      new RuntimeBindingTargetAccessProvenance(
        [observerProvenance],
        [adapterProvenance],
        [firstSetupProvenance, secondSetupProvenance],
      ),
    );
    const binding = propertyBinding(store);
    const publisher = new RuntimeControllerBindPublisher(store);
    const source = publisher.recordsForSource('target-access-test');
    const publication = publisher.targetAccessPublication(
      'target-access-test',
      new RuntimeBindingTargetAccessRequest(
        'target-access-test',
        binding,
        RuntimeBindingTargetAccessLookup.Observer,
        'value',
        binding.sourceAddressHandle,
      ),
      new RuntimeBindingTarget(
        RuntimeBindingTargetKind.ControllerViewModel,
        binding.node,
        handles.product('target-controller'),
        null,
        null,
        HtmlNamespaceKind.Html,
      ),
      lookup,
      RuntimeOperationReachability.Reached,
      source,
      [],
    );
    const access = publication.product;
    const fields = access.fieldProvenance.map((entry) => entry.field);

    expect(new Set(fields).size).toBe(fields.length);
    expect(fields).toEqual([
      'strategy',
      'fallbackStrategy',
      'observerCacheDisposition',
      'observerSource',
      'objectObservationAdapters',
      'controllerObserverSetup',
    ]);
    expect(readFieldProvenance(access.fieldProvenance, 'observerSource')).toBe(observerProvenance);
    expect(readFieldProvenance(access.fieldProvenance, 'objectObservationAdapters')).toBe(adapterProvenance);

    const decisionProvenance = readFieldProvenance(access.fieldProvenance, 'strategy');
    expect(decisionProvenance).not.toBeNull();
    expect(readFieldProvenance(access.fieldProvenance, 'fallbackStrategy')).toBe(decisionProvenance);
    expect(readFieldProvenance(access.fieldProvenance, 'observerCacheDisposition')).toBe(decisionProvenance);
    expect(provenanceRecord(publication.records, decisionProvenance)?.evidenceHandles).toEqual([
      adapterEvidence,
      observerEvidence,
    ].sort());

    const setupProvenance = readFieldProvenance(access.fieldProvenance, 'controllerObserverSetup');
    expect(setupProvenance).not.toBeNull();
    expect(provenanceRecord(publication.records, setupProvenance)?.evidenceHandles).toEqual([
      firstSetupEvidence,
      secondSetupEvidence,
    ].sort());

    const references = TemplateProductDetails.RuntimeBindingTargetAccess.referencesFor(access);
    for (const handle of [
      observerProduct,
      observerIdentity,
      observerAddress,
      adapterAddress,
      observerProvenance,
      adapterProvenance,
      firstSetupProvenance,
      secondSetupProvenance,
    ]) {
      expect(references.some((reference) =>
        reference.surface === KernelPublicationSurface.Record && reference.handle === handle
      )).toBe(true);
    }
    expect(references.some((reference) =>
      reference.surface === KernelPublicationSurface.ProductDetail
      && reference.handle === observerProduct
      && reference.detailKind === ObservationDetailDescriptors.ComputedObserverSource.detailKind
    )).toBe(true);
  });
});

function lookupResult(
  observerSourceProductHandle: ProductHandle,
  observerSourceIdentityHandle: IdentityHandle,
  observerSourceAddressHandle: AddressHandle,
  objectObservationAdapters: readonly RuntimeObjectObservationAdapterReference[],
  provenance: RuntimeBindingTargetAccessProvenance,
): ObserverLocatorLookupResult {
  return new ObserverLocatorLookupResult(
    RuntimeBindingTargetAccessLookup.Observer,
    RuntimeBindingTargetKind.ControllerViewModel,
    'value',
    RuntimeBindingTargetAccessStrategy.Unknown,
    RuntimeBindingTargetAccessStrategy.ComputedObserver,
    RuntimeBindingTargetObserverCacheDisposition.Open,
    null,
    null,
    null,
    null,
    true,
    true,
    null,
    null,
    null,
    observerSourceProductHandle,
    observerSourceIdentityHandle,
    observerSourceAddressHandle,
    objectObservationAdapters,
    RuntimeBindingTargetAccessAuthority.Open,
    'Object observation selection remains open.',
    null,
    null,
    RuntimeControllerObserverSetupOutcome.Installed,
    provenance,
  );
}

function propertyBinding(store: KernelStore): PropertyBinding {
  const handles = store.handles;
  return new PropertyBinding(
    handles.product('binding'),
    handles.identity('binding'),
    handles.product('instruction'),
    new RuntimeRendererReference(
      RuntimeRendererKind.PropertyBinding,
      handles.product('renderer'),
      handles.identity('renderer'),
      TemplateInstructionKind.PropertyBinding,
      handles.address('renderer'),
    ),
    new HtmlNodeReference(
      HtmlIrNodeKind.Element,
      handles.identity('node'),
      handles.product('node'),
      handles.address('node'),
    ),
    null,
    'value',
    handles.product('expression'),
    TemplateBindingMode.TwoWay,
    null,
    KernelVocabulary.Binding.Property.key,
    null,
    [],
    handles.address('binding'),
  );
}

function evidence(
  handle: EvidenceHandle,
  summary: string,
): EvidenceRecord {
  return new EvidenceRecord(
    handle,
    EvidenceKind.SemanticObservation,
    [EvidenceRole.TransformInput],
    summary,
    null,
  );
}

function provenanceRecord(
  records: readonly unknown[],
  handle: ProvenanceHandle | null,
): ProvenanceRecord | null {
  return records.find((record): record is ProvenanceRecord =>
    record instanceof ProvenanceRecord && record.handle === handle
  ) ?? null;
}
