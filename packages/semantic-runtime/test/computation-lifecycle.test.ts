import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  GeneratedAddress,
  SourceFileAddress,
  SourceLanguage,
  SourceSpanAddress,
  TemplateAddress,
  TemplateNodeAddress,
} from "../src/kernel/address.js";
import {
  ComputationOpenReadKind,
  ComputationCandidateReadState,
  ComputationChildRole,
  ComputationChildSccKind,
  ComputationChildTransitionKind,
  ComputationCommitState,
  ComputationReadValidationScope,
  computationChildResultReadKey,
  computationHotDetailReadKey,
  ComputationLifecycleRegistry,
  computationMaterializationOwnerReadKey,
  computationProductDetailReadKey,
  ComputationRecordReadView,
  computationRecordReadKey,
  type ComputationGenerationAuthority,
  type ComputationRun,
  type ComputationChildCarry,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
} from "../src/kernel/computation-lifecycle.js";
import {
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputRead,
} from "../src/kernel/project-input.js";
import { FrameworkIdentity, ObservationIdentity } from "../src/kernel/identity.js";
import type {
  AddressHandle,
  HotDetailHandle,
  ProductHandle,
} from "../src/kernel/handles.js";
import { defineHotDetailSlot, readHotDetailEntry } from "../src/kernel/hot-details.js";
import {
  defineHotDetailDescriptor,
  defineProductDetailDescriptor,
} from "../src/kernel/detail-descriptors.js";
import { MaterializationRecord, MaterializedProduct } from "../src/kernel/materialization.js";
import {
  defineProductDetailSlot,
  readProductDetailEnvelope,
} from "../src/kernel/product-details.js";
import { ProvenanceRecord } from "../src/kernel/provenance.js";
import {
  KernelDetailAdmission,
  KernelPublicationDecisionKind,
  type KernelPublicationDecisionPreviewCandidate,
  KernelPublicationManifest,
  KernelPublicationPlan,
  SealedKernelPublicationCandidate,
  type KernelPublicationWriterId,
  StagedKernelPublicationContext,
  publishHotDetail,
  publishProductDetail,
  type KernelDetailComparator,
} from "../src/kernel/publication.js";
import { KernelPublicationSurface } from "../src/kernel/publication-surface.js";
import { KernelStore, KernelStoreBatch } from "../src/kernel/store.js";
import {
  KernelHotDetailReference,
  KernelProductDetailReference,
  KernelRecordReference,
  kernelHotDetailReference,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  noKernelDetailReferences,
  type KernelDetailReferenceProjector,
} from "../src/kernel/detail-references.js";
import { KernelVocabulary, type ProductKindKey } from "../src/kernel/vocabulary.js";
import {
  emptyGenerationCurrentnessWitness,
  GenerationCurrentnessClock,
  type GenerationCurrentnessWitness,
} from "../src/kernel/generation-authority.js";

describe("kernel detail reference normalization", () => {
  test("preserves surface identity while deduplicating into canonical order", () => {
    const duplicateProductReference = new KernelProductDetailReference(
      "shared" as ProductHandle,
      "test.product-detail",
    );
    const closure = mergeKernelDetailReferences(
      [
        new KernelRecordReference("shared" as KernelRecordHandle),
        duplicateProductReference,
        new KernelHotDetailReference("shared" as HotDetailHandle, "test.hot-detail"),
      ],
      [
        null,
        new KernelProductDetailReference("alpha" as ProductHandle, "test.product-detail"),
        duplicateProductReference,
        undefined,
      ],
    );

    expect(closure).toEqual([
      new KernelHotDetailReference("shared" as HotDetailHandle, "test.hot-detail"),
      new KernelProductDetailReference("alpha" as ProductHandle, "test.product-detail"),
      duplicateProductReference,
      new KernelRecordReference("shared" as KernelRecordHandle),
    ]);
    expect(Object.isFrozen(closure)).toBe(true);
  });

  test("rejects contradictory detail kinds for one surface and handle", () => {
    expect(() => mergeKernelDetailReferences([
      new KernelProductDetailReference("shared" as ProductHandle, "test.left"),
      new KernelProductDetailReference("shared" as ProductHandle, "test.right"),
    ])).toThrow(
      "Kernel detail reference product-detail:shared expects both test.left and test.right.",
    );
  });
});

class MutableRevisionAuthority {
  private readonly revisions = new Map<string, string>();

  set(readKey: string, revision: string): void {
    this.revisions.set(readKey, revision);
  }

  observe(readKey: string, domain = "test-input"): ComputationRead {
    const observedRevision = this.current(readKey);
    return {
      readKey,
      domain,
      observedRevision,
      validate: (): ComputationReadValidation => {
        const currentRevision = this.current(readKey);
        return {
          isCurrent: currentRevision === observedRevision,
          currentRevision,
          changedFacets: currentRevision === observedRevision ? [] : ["revision"],
        };
      },
      tryRebaseCurrent: (): ComputationRead | null =>
        this.current(readKey) === observedRevision ? this.observe(readKey, domain) : null,
    };
  }

  private current(readKey: string): string {
    const revision = this.revisions.get(readKey);
    if (revision == null) {
      throw new Error(`No test revision registered for ${readKey}.`);
    }
    return revision;
  }
}

class MutableGenerationAuthority {
  private readonly currentness = new GenerationCurrentnessClock();
  readonly currentnessWitness: GenerationCurrentnessWitness = this.currentness.capture("test-generation");

  invalidate(): void {
    this.currentness.advance();
  }

  isCurrent(): boolean {
    return this.currentnessWitness.isCurrent();
  }

  requireCurrent(): void {
    if (!this.isCurrent()) {
      throw new Error("Generation authority is no longer current.");
    }
  }
}

function locus(owner: string, cohort = "app-root:default"): ComputationLocus {
  return {
    kind: "template-compilation",
    reconciliationKey: `project:test|owner:${owner}|cohort:${cohort}|role:app`,
    summary: `${owner} in ${cohort}`,
  };
}

function childLocus(owner: string): ComputationLocus {
  return {
    kind: "template-family",
    reconciliationKey: `family:${owner}`,
    summary: `template family ${owner}`,
  };
}

function publication(
  label: string,
  records: ConstructorParameters<typeof KernelStoreBatch>[0],
): KernelPublicationPlan {
  return new KernelPublicationPlan(new KernelStoreBatch(records, label));
}

function defineTestProductDetailSlot<TDetail>(
  productKindKey: ProductKindKey,
  detailKind: string,
  summary: string,
  referenceProjector: KernelDetailReferenceProjector<TDetail> = noKernelDetailReferences,
  comparator: KernelDetailComparator<TDetail> | null = null,
) {
  return defineProductDetailSlot(
    defineProductDetailDescriptor<TDetail>(productKindKey, detailKind, summary),
    referenceProjector,
    comparator,
  );
}

function defineTestHotDetailSlot<TDetail>(
  ownerProductKindKey: ProductKindKey,
  detailKind: string,
  summary: string,
  referenceProjector: KernelDetailReferenceProjector<TDetail> = noKernelDetailReferences,
  comparator: KernelDetailComparator<TDetail> | null = null,
) {
  return defineHotDetailSlot(
    defineHotDetailDescriptor<TDetail>(ownerProductKindKey, detailKind, summary),
    referenceProjector,
    comparator,
  );
}

describe("computation lifecycle", () => {
  test("preserves projector-owned canonical structural reference closures", () => {
    const detail = { target: "canonical-target" };
    const closure = mergeKernelDetailReferences();
    const productSlot = defineTestProductDetailSlot<typeof detail>(
      KernelVocabulary.Template.Source.key,
      "test.canonical-product-detail-closure",
      "Product detail with a projector-owned canonical closure.",
      () => closure,
    );
    const hotSlot = defineTestHotDetailSlot<typeof detail>(
      KernelVocabulary.Template.Source.key,
      "test.canonical-hot-detail-closure",
      "Hot detail with a projector-owned canonical closure.",
      () => closure,
    );

    expect(productSlot.referencesFor(detail)).toBe(closure);
    expect(hotSlot.referencesFor(detail)).toBe(closure);
    expect(Object.isFrozen(closure)).toBe(true);
  });

  test("shares logical read validation only within one synchronous proof", () => {
    let revision = "1";
    let validationCount = 0;
    const read = (): ComputationRead => ({
      readKey: "proof-scoped-read",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        validationCount += 1;
        return {
          isCurrent: revision === "1",
          currentRevision: revision,
          changedFacets: revision === "1" ? [] : ["revision"],
        };
      },
      tryRebaseCurrent: () => null,
    });
    const scope = new ComputationReadValidationScope();

    expect(scope.validate(read()).isCurrent).toBe(true);
    expect(scope.validate(read()).isCurrent).toBe(true);
    expect(validationCount).toBe(1);

    revision = "2";
    expect(scope.validate(read()).isCurrent).toBe(true);
    expect(new ComputationReadValidationScope().validate(read())).toEqual(expect.objectContaining({
      isCurrent: false,
      currentRevision: "2",
      changedFacets: ["revision"],
    }));
    expect(validationCount).toBe(2);
  });

  test("enforces one computation registry per store", () => {
    const store = new KernelStore("computation-registry-owner");
    new ComputationLifecycleRegistry(store);

    expect(() => new ComputationLifecycleRegistry(store)).toThrow(
      /already has a computation lifecycle registry/,
    );
  });

  test("builds a replacement without reading its own prior publication as upstream state", () => {
    const store = new KernelStore("computation-prior-publication-isolation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const ownedHandle = store.handles.address("template:owned");
    const upstreamHandle = store.handles.address("template:upstream");
    const owned0 = new SourceFileAddress(ownedHandle, "test", "src/owned.html", SourceLanguage.Html);
    const upstream = new SourceFileAddress(upstreamHandle, "test", "src/upstream.html", SourceLanguage.Html);
    store.commit(new KernelStoreBatch([upstream], "upstream"));

    const run0 = lifecycle.begin(locus("prior-publication"));
    run0.publish(publication("owned:0", [owned0]));
    expect(run0.readSourceFileAddressesByFileName("src/owned.html")).toEqual([owned0]);
    expect(run0.readAllRecords()).toEqual(expect.arrayContaining([upstream, owned0]));
    expect(store.readSourceFileAddressesByFileName("src/owned.html")).toEqual([]);
    expect(run0.commit().state).toBe(ComputationCommitState.Committed);

    const run1 = lifecycle.begin(locus("prior-publication"));
    expect(run1.read(ownedHandle)).toBeNull();
    expect(run1.read(upstreamHandle)).toBe(upstream);
    expect(run1.readSourceFileAddressesByFileName("src/owned.html")).toEqual([]);
    expect(run1.readSourceFileAddressesByFileName("src/upstream.html")).toEqual([upstream]);
    expect(run1.readAllRecords()).toEqual([upstream]);
    expect(run1.readKernelCountSnapshot().totalRecords).toBe(1);
    const replacementMarker = run1.markObservation();
    const owned1 = new SourceFileAddress(ownedHandle, "test", "src/owned-next.html", SourceLanguage.Html);
    run1.publish(publication("owned:1", [owned1]));
    expect(run1.read(ownedHandle)).toBe(owned1);
    expect(run1.readSourceFileAddressesByFileName("C:/workspace/src/owned-next.html")).toEqual([owned1]);
    expect(run1.readAllRecords()).toEqual(expect.arrayContaining([upstream, owned1]));
    expect(run1.readAllRecords()).not.toContain(owned0);
    expect(store.readSourceFileAddressesByFileName("src/owned-next.html")).toEqual([]);
    expect(run1.readKernelCountSnapshot().totalRecords).toBe(2);
    expect(run1.readDensitySince(replacementMarker).recordKinds).toEqual([
      { key: "source-file-address", count: 1 },
    ]);
    expect(run1.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(ownedHandle)).toBe(owned1);
  });

  test("detaches durable domain reads from finished computation candidates", () => {
    const store = new KernelStore("computation-durable-domain-read-projection");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const ownerHandle = store.handles.address("durable-domain-read-projection:owner");
    const materializationHandle = store.handles.materialization("durable-domain-read-projection:materialization");
    const provenanceHandle = store.handles.provenance("durable-domain-read-projection:provenance");
    const productHandle = store.handles.product("durable-domain-read-projection:product");
    const detail = { productHandle, value: 1 };
    const slot = defineTestProductDetailSlot<typeof detail>(
      KernelVocabulary.Template.Source.key,
      "test.durable-domain-read-projection",
      "Durable domain read projection.",
    );
    const run = lifecycle.begin(locus("durable-domain-read-projection"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
        new MaterializationRecord(materializationHandle, ownerHandle),
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "durable-domain-read-projection"),
      [publishProductDetail(slot, productHandle, detail)],
    ));
    const projection = run.domainReadProjection;
    const candidateRevision = projection.readProjectionRevision();

    expect(projection.readMaterializationsByOwner(ownerHandle)).toEqual([
      new MaterializationRecord(materializationHandle, ownerHandle),
    ]);
    expect(projection.readProductDetail(slot, productHandle)).toBe(detail);
    expect(run.commit().state).toBe(ComputationCommitState.Committed);

    expect(projection.readMaterializationsByOwner(ownerHandle)).toEqual([
      new MaterializationRecord(materializationHandle, ownerHandle),
    ]);
    expect(projection.readProductDetail(slot, productHandle)).toBe(detail);
    expect(candidateRevision.equals(projection.readProjectionRevision())).toBe(false);
    expect(projection.readProjectionRevision().equals(store.readProjectionRevision())).toBe(true);

    const aborted = lifecycle.begin(locus("aborted-domain-read-projection"));
    const abortedProjection = aborted.domainReadProjection;
    aborted.abort();
    expect(() => abortedProjection.readProjectionRevision()).toThrow(/aborted computation read projection/i);
  });

  test("tracks exact foreign records and details through their committed producer", () => {
    const store = new KernelStore("computation-exact-kernel-inputs");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("exact-kernel-inputs:product");
    const provenanceHandle = store.handles.provenance("exact-kernel-inputs:provenance");
    const hotHandle = store.handles.hotDetail("exact-kernel-inputs:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.exact-kernel-product-detail",
      "Exact product-detail computation input.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.exact-kernel-hot-detail",
      "Exact hot-detail computation input.",
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const produce = (version: number) => {
      const run = lifecycle.begin(locus("exact-kernel-producer"));
      const productDetail = { version };
      const hotDetail = { version };
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          product(),
        ], `exact-kernel-producer:${version}`),
        [publishProductDetail(productSlot, productHandle, productDetail)],
        [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
      ));
      expect(run.read(productHandle)).toEqual(product());
      expect(run.readProductDetail(productSlot, productHandle)).toBe(productDetail);
      expect(run.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
      expect(run.commit().state).toBe(ComputationCommitState.Committed);
      expect(lifecycle.readState(run.computationId)?.reads).toEqual([]);
      return run;
    };

    const producer0 = produce(0);
    const recordKey = computationRecordReadKey(productHandle);
    const productDetailKey = computationProductDetailReadKey(productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotHandle);
    expect(lifecycle.producerFor(recordKey)).toBe(producer0.computationId);
    expect(lifecycle.producerFor(productDetailKey)).toBe(producer0.computationId);
    expect(lifecycle.producerFor(hotDetailKey)).toBe(producer0.computationId);

    const consumer0 = lifecycle.begin(locus("exact-kernel-consumer"));
    expect(consumer0.read(productHandle)).not.toBeNull();
    expect(consumer0.readProductDetail(productSlot, productHandle)).toEqual({ version: 0 });
    expect(consumer0.readHotDetail(hotSlot, hotHandle)).toEqual({ version: 0 });
    expect(consumer0.commit().state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readState(consumer0.computationId)?.reads.map((read) => read.readKey).sort()).toEqual([
      hotDetailKey,
      productDetailKey,
      recordKey,
    ].sort());
    expect(lifecycle.readersFor(productDetailKey)).toEqual([consumer0.computationId]);

    const staleConsumer = lifecycle.begin(locus("exact-kernel-consumer"));
    expect(staleConsumer.readProductDetail(productSlot, productHandle)).toEqual({ version: 0 });
    expect(staleConsumer.readHotDetail(hotSlot, hotHandle)).toEqual({ version: 0 });
    const producer1 = produce(1);
    expect(producer1.computationId).toBe(producer0.computationId);
    const rejected = staleConsumer.commit();
    expect(rejected.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(rejected.transition.invalidReads.map((read) => read.domain).sort()).toEqual([
      "kernel-hot-detail",
      "kernel-product-detail",
    ]);
    expect(lifecycle.producerFor(productDetailKey)).toBe(producer0.computationId);

    expect(lifecycle.retireCommittedGeneration(producer1.computationId, producer1.runSequence)).toBe(true);
    expect(lifecycle.producerFor(recordKey)).toBeNull();
    expect(lifecycle.producerFor(productDetailKey)).toBeNull();
    expect(lifecycle.producerFor(hotDetailKey)).toBeNull();
  });

  test("joins a mismatched detail-slot read to the handle's actual producer", () => {
    const store = new KernelStore("computation-detail-slot-occupancy");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("detail-slot-occupancy:product");
    const provenanceHandle = store.handles.provenance("detail-slot-occupancy:provenance");
    const hotHandle = store.handles.hotDetail("detail-slot-occupancy:hot");
    const productSlotA = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-slot-occupancy-product-a",
      "First product-detail slot occupying one product handle.",
    );
    const productSlotB = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-slot-occupancy-product-b",
      "Second product-detail slot requested at the same product handle.",
    );
    const hotSlotA = defineTestHotDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-slot-occupancy-hot-a",
      "First hot-detail slot occupying one hot handle.",
    );
    const hotSlotB = defineTestHotDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-slot-occupancy-hot-b",
      "Second hot-detail slot requested at the same hot handle.",
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const produce = (
      productSlot: typeof productSlotA | typeof productSlotB,
      hotSlot: typeof hotSlotA | typeof hotSlotB,
      version: number,
    ) => {
      const run = lifecycle.begin(locus("detail-slot-occupancy-producer"));
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          product(),
        ], `detail-slot-occupancy:${version}`),
        [publishProductDetail(productSlot, productHandle, { version })],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { version })],
      ));
      expect(run.commit().state).toBe(ComputationCommitState.Committed);
      return run;
    };

    const producer = produce(productSlotA, hotSlotA, 0);
    const consumer = lifecycle.begin(locus("detail-slot-occupancy-consumer"));
    expect(consumer.readProductDetail(productSlotB, productHandle)).toBeNull();
    expect(consumer.readHotDetail(hotSlotB, hotHandle)).toBeNull();
    expect(consumer.commit().state).toBe(ComputationCommitState.Committed);
    const productDetailKey = computationProductDetailReadKey(productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotHandle);
    expect(lifecycle.producerFor(productDetailKey)).toBe(producer.computationId);
    expect(lifecycle.producerFor(hotDetailKey)).toBe(producer.computationId);
    expect(lifecycle.readersFor(productDetailKey)).toEqual([consumer.computationId]);
    expect(lifecycle.readersFor(hotDetailKey)).toEqual([consumer.computationId]);

    produce(productSlotB, hotSlotB, 1);
    expect(lifecycle.readState(consumer.computationId)?.reads.every((read) => !read.validate().isCurrent)).toBe(true);
  });

  test("tracks negative exact reads and borrowed if-absent details without self-dependencies", () => {
    const store = new KernelStore("computation-negative-and-borrowed-details");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("negative-and-borrowed:product");
    const provenanceHandle = store.handles.provenance("negative-and-borrowed:provenance");
    const missingRecordHandle = store.handles.address("negative-and-borrowed:missing-record");
    const hotHandle = store.handles.hotDetail("negative-and-borrowed:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.negative-and-borrowed-product-detail",
      "Negative and borrowed product-detail input.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.negative-and-borrowed-hot-detail",
      "Negative and borrowed hot-detail input.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "negative-and-borrowed:product"));

    const negative = lifecycle.begin(locus("negative-exact-inputs"));
    expect(negative.read(missingRecordHandle)).toBeNull();
    expect(negative.readProductDetail(productSlot, productHandle)).toBeNull();
    expect(negative.readHotDetail(hotSlot, hotHandle)).toBeNull();
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(missingRecordHandle, "test", "src/now-present.html", SourceLanguage.Html),
    ], "negative-and-borrowed:record"));
    store.productDetails.add(productSlot, productHandle, { owner: "foreign" });
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { owner: "foreign" });
    const rejected = negative.commit();
    expect(rejected.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(rejected.transition.invalidReads.map((read) => read.domain).sort()).toEqual([
      "kernel-hot-detail",
      "kernel-product-detail",
      "kernel-record",
    ]);

    const borrower = lifecycle.begin(locus("borrowed-if-absent"));
    borrower.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "borrowed-if-absent"),
      [publishProductDetail(
        productSlot,
        productHandle,
        { owner: "candidate" },
        KernelDetailAdmission.IfAbsent,
      )],
      [publishHotDetail(
        hotSlot,
        productHandle,
        hotHandle,
        { owner: "candidate" },
        KernelDetailAdmission.IfAbsent,
      )],
    ));
    expect(borrower.commit().state).toBe(ComputationCommitState.Committed);
    const productDetailKey = computationProductDetailReadKey(productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotHandle);
    expect(lifecycle.readState(borrower.computationId)?.reads.map((read) => read.readKey).sort()).toEqual([
      hotDetailKey,
      productDetailKey,
    ].sort());
    expect(lifecycle.readState(borrower.computationId)?.outputs).toEqual([]);
    expect(lifecycle.producerFor(productDetailKey)).toBeNull();
    expect(lifecycle.readersFor(productDetailKey)).toEqual([borrower.computationId]);
  });

  test("keeps rejected if-absent payload references outside the committed dependency closure", () => {
    const store = new KernelStore("borrowed-if-absent-payload-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("borrowed-payload:product");
    const provenanceHandle = store.handles.provenance("borrowed-payload:provenance");
    const ownedHandle = store.handles.address("borrowed-payload:owned");
    const youngTargetHandle = store.handles.address("borrowed-payload:young-target");
    const missingTargetHandle = store.handles.address("borrowed-payload:missing-target");
    const slot = defineTestProductDetailSlot<{ readonly targets: readonly AddressHandle[] }>(
      KernelVocabulary.Template.Source.key,
      "test.borrowed-if-absent-payload-closure",
      "Borrowed occupancy whose rejected candidate payload must not become a dependency.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(...detail.targets)),
    );

    const foreign = lifecycle.begin(locus("borrowed-payload-foreign"));
    foreign.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "borrowed-payload:foreign"),
      [publishProductDetail(slot, productHandle, { targets: [] })],
    ));
    expect(foreign.commit().state).toBe(ComputationCommitState.Committed);

    const initial = lifecycle.begin(locus("borrowed-payload-owner"));
    initial.publish(publication("borrowed-payload:initial", [
      new SourceFileAddress(ownedHandle, "test", "src/borrowed-payload.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const initialLifetime = lifecycle.readState(initial.computationId)?.publication.lifetimeOrdinal;
    const marker = store.markLifetime();
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(youngTargetHandle, "test", "src/young-target.html", SourceLanguage.Html),
    ], "borrowed-payload:young-target"));

    const replacement = lifecycle.begin(locus("borrowed-payload-owner"));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(ownedHandle, "test", "src/borrowed-payload.html", SourceLanguage.Html),
      ], "borrowed-payload:replacement"),
      [publishProductDetail(
        slot,
        productHandle,
        { targets: [youngTargetHandle, missingTargetHandle] },
        KernelDetailAdmission.IfAbsent,
      )],
    ));
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(replacement.computationId);
    expect(state?.publication.lifetimeOrdinal).toBe(initialLifetime);
    expect(state?.reads.map((read) => read.readKey)).toEqual([
      computationProductDetailReadKey(productHandle),
    ]);

    store.disposeUnownedSince(marker);
    expect(store.read(youngTargetHandle)).toBeNull();
    expect(store.read(ownedHandle)).not.toBeNull();
    expect(store.productDetails.read(slot, productHandle)).toEqual({ targets: [] });
  });

  test("ignores rejected if-absent payload references during immediate publication", () => {
    const store = new KernelStore("immediate-if-absent-payload-closure");
    const productHandle = store.handles.product("immediate-borrowed-payload:product");
    const provenanceHandle = store.handles.provenance("immediate-borrowed-payload:provenance");
    const hotHandle = store.handles.hotDetail("immediate-borrowed-payload:hot");
    const missingTargetHandle = store.handles.address("immediate-borrowed-payload:missing-target");
    const slot = defineTestProductDetailSlot<{ readonly targets: readonly AddressHandle[] }>(
      KernelVocabulary.Template.Source.key,
      "test.immediate-if-absent-payload-closure",
      "Immediate borrowed occupancy whose rejected payload must not become a dependency.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(...detail.targets)),
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly targets: readonly AddressHandle[] }>(
      KernelVocabulary.Template.Source.key,
      "test.immediate-if-absent-hot-payload-closure",
      "Immediate borrowed hot occupancy whose rejected payload must not become a dependency.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(...detail.targets)),
    );
    const existingProductDetail = { targets: [] };
    const existingHotDetail = { targets: [] };
    store.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "immediate-borrowed-payload:existing"),
      [publishProductDetail(slot, productHandle, existingProductDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, existingHotDetail)],
    ));

    expect(() => store.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "immediate-borrowed-payload:candidate"),
      [publishProductDetail(
        slot,
        productHandle,
        { targets: [missingTargetHandle] },
        KernelDetailAdmission.IfAbsent,
      )],
      [publishHotDetail(
        hotSlot,
        productHandle,
        hotHandle,
        { targets: [missingTargetHandle] },
        KernelDetailAdmission.IfAbsent,
      )],
    ))).not.toThrow();
    expect(store.productDetails.read(slot, productHandle)).toBe(existingProductDetail);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(existingHotDetail);
  });

  test("drops exact reads superseded by outputs from the same committed generation", () => {
    const store = new KernelStore("computation-read-before-own-write");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("read-before-own-write:product");
    const provenanceHandle = store.handles.provenance("read-before-own-write:provenance");
    const hotHandle = store.handles.hotDetail("read-before-own-write:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.read-before-own-write-product-detail",
      "Product detail read before its owning write.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.read-before-own-write-hot-detail",
      "Hot detail read before its owning write.",
    );
    const run = lifecycle.begin(locus("read-before-own-write"));

    expect(run.read(productHandle)).toBeNull();
    expect(run.readProductDetail(productSlot, productHandle)).toBeNull();
    expect(run.readHotDetail(hotSlot, hotHandle)).toBeNull();
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "read-before-own-write"),
      [publishProductDetail(productSlot, productHandle, { owner: "candidate" })],
      [publishHotDetail(hotSlot, productHandle, hotHandle, { owner: "candidate" })],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const recordKey = computationRecordReadKey(productHandle);
    const productDetailKey = computationProductDetailReadKey(productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotHandle);
    expect(lifecycle.readState(run.computationId)?.reads).toEqual([]);
    expect(lifecycle.readersFor(recordKey)).toEqual([]);
    expect(lifecycle.readersFor(productDetailKey)).toEqual([]);
    expect(lifecycle.readersFor(hotDetailKey)).toEqual([]);
    expect(lifecycle.producerFor(recordKey)).toBe(run.computationId);
    expect(lifecycle.producerFor(productDetailKey)).toBe(run.computationId);
    expect(lifecycle.producerFor(hotDetailKey)).toBe(run.computationId);
  });

  test("partitions one atomic publication into exact child manifests", () => {
    const store = new KernelStore("computation-child-manifests");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:family-a", "1");
    const familyAHandle = store.handles.address("child-manifest:family-a");
    const familyBHandle = store.handles.address("child-manifest:family-b");
    const remainderHandle = store.handles.address("child-manifest:remainder");
    const run = lifecycle.begin(locus("child-manifests"));

    run.withChild(childLocus("a"), () => {
      run.observe(revisions.observe("source:family-a"));
      run.publish(publication("child-manifest:a", [
        new SourceFileAddress(familyAHandle, "test", "src/family-a.html", SourceLanguage.Html),
      ]));
    });
    run.withChild(childLocus("b"), () => {
      expect(run.read(familyAHandle)).not.toBeNull();
      run.publish(publication("child-manifest:b", [
        new SourceFileAddress(familyBHandle, "test", "src/family-b.html", SourceLanguage.Html),
      ]));
    });
    run.withChild(childLocus("aggregate-reader"), () => {
      expect(run.readAllRecords()).toHaveLength(2);
    });
    run.publish(publication("child-manifest:remainder", [
      new SourceFileAddress(remainderHandle, "test", "src/remainder.html", SourceLanguage.Html),
    ]));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    expect(state).not.toBeNull();
    if (state == null) {
      throw new Error("Expected a committed child-manifest computation.");
    }
    const familyA = state.children.find((child) => child.locus.reconciliationKey === "family:a");
    const familyB = state.children.find((child) => child.locus.reconciliationKey === "family:b");
    const aggregateReader = state.children.find(
      (child) => child.locus.reconciliationKey === "family:aggregate-reader",
    );
    const remainder = state.children.find((child) => child.locus.kind === "computation-remainder");
    expect(familyA).toBeDefined();
    expect(familyB).toBeDefined();
    expect(aggregateReader).toBeDefined();
    expect(remainder).toBeDefined();
    if (familyA == null || familyB == null || aggregateReader == null || remainder == null) {
      throw new Error("Expected all logical child manifests.");
    }

    const familyAKey = computationRecordReadKey(familyAHandle);
    const familyBKey = computationRecordReadKey(familyBHandle);
    const remainderKey = computationRecordReadKey(remainderHandle);
    expect(familyA.reads.map((read) => read.readKey)).toEqual(["source:family-a"]);
    expect(familyA.hasOnlyRevisionedReads).toBe(true);
    expect(familyA.outputs.map((output) => output.readKey)).toEqual([familyAKey]);
    expect(state.outputs.find((output) => output.readKey === familyAKey)).toBe(familyA.outputs[0]);
    expect(familyB.reads).toEqual([]);
    expect(familyB.candidateReads).toEqual([
      expect.objectContaining({ readKey: familyAKey, producerChildId: familyA.childId }),
    ]);
    expect(familyB.outputs.map((output) => output.readKey)).toEqual([familyBKey]);
    expect(state.outputs.find((output) => output.readKey === familyBKey)).toBe(familyB.outputs[0]);
    expect(aggregateReader.openReads).toEqual([
      expect.objectContaining({ kind: ComputationOpenReadKind.AllRecords }),
    ]);
    expect(aggregateReader.hasOnlyRevisionedReads).toBe(false);
    expect(remainder.outputs.map((output) => output.readKey)).toEqual([remainderKey]);
    expect(state.outputs.find((output) => output.readKey === remainderKey)).toBe(remainder.outputs[0]);
    expect(lifecycle.childProducerFor(familyAKey)).toBe(familyA.childId);
    expect(lifecycle.childReadersFor(familyAKey)).toEqual([familyB.childId]);
    expect(lifecycle.childReadersFor("source:family-a")).toEqual([familyA.childId]);

    expect(lifecycle.retireCommittedGeneration(run.computationId, run.runSequence)).toBe(true);
    expect(lifecycle.childProducerFor(familyAKey)).toBeNull();
    expect(lifecycle.childReadersFor(familyAKey)).toEqual([]);
    expect(lifecycle.childReadersFor("source:family-a")).toEqual([]);
  });

  test("carries exact singleton child outputs and rebases candidate dependencies into the new run", () => {
    const store = new KernelStore("computation-child-carry");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:carried-family", "1");
    const pre = childLocus("carry-pre");
    const family = childLocus("carry-family");
    const consumer = childLocus("carry-consumer");
    const preHandle = store.handles.address("child-carry:pre");
    const provenanceHandle = store.handles.provenance("child-carry:product");
    const productHandle = store.handles.product("child-carry:product");
    const hotHandle = store.handles.hotDetail("child-carry:hot");
    let productReferenceProjections = 0;
    let hotReferenceProjections = 0;
    const productSlot = defineTestProductDetailSlot<number>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-product",
      "Product detail retained only through explicit child carry.",
      (detail) => {
        productReferenceProjections += 1;
        return noKernelDetailReferences(detail);
      },
    );
    const hotSlot = defineTestHotDetailSlot<number>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-hot",
      "Hot detail retained only through explicit child carry.",
      (detail) => {
        hotReferenceProjections += 1;
        return noKernelDetailReferences(detail);
      },
    );
    const product = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const productDetail = 1;
    const hotDetail = 1;

    const initial = lifecycle.begin(locus("child-carry"));
    initial.withChildPartition(() => {
      initial.withChild(pre, () => {
        initial.publish(publication("child-carry:pre:initial", [
          new SourceFileAddress(preHandle, "test", "src/pre.html", SourceLanguage.Html),
        ]));
      });
      initial.withChild(family, () => {
        initial.observe(revisions.observe("source:carried-family"));
        expect(initial.read(preHandle)).not.toBeNull();
        initial.publish(new KernelPublicationPlan(
          new KernelStoreBatch([
            new ProvenanceRecord(provenanceHandle),
            product,
          ], "child-carry:family:initial"),
          [publishProductDetail(productSlot, productHandle, productDetail)],
          [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
        ));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    productReferenceProjections = 0;
    hotReferenceProjections = 0;
    const initialFamily = lifecycle.readState(initial.computationId)?.children.find(
      (child) => child.locus.reconciliationKey === family.reconciliationKey,
    );
    expect(initialFamily).toBeDefined();
    if (initialFamily == null) throw new Error("Expected initial carried-family state.");
    const replacement = lifecycle.begin(locus("child-carry"));
    let carried: ComputationChildCarry | null = null;
    replacement.withChildPartition(() => {
      replacement.withChild(pre, () => {
        replacement.publish(publication("child-carry:pre:replacement", [
          new SourceFileAddress(preHandle, "test", "src/pre.html", SourceLanguage.Html),
        ]));
      });
      carried = replacement.tryCarryChild(family, (read, context) => {
        expect(context.readProductDetail(productSlot, productHandle)).toBe(productDetail);
        return revisions.observe(read.readKey, read.domain);
      });
      replacement.withChild(consumer, () => {
        expect(replacement.read(productHandle)).toBe(product);
        expect(replacement.readProductDetail(productSlot, productHandle)).toBe(productDetail);
        expect(replacement.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
      });
    });

    expect(carried?.previousState).toBe(initialFamily);
    expect(carried?.readFor(initialFamily.reads[0]!)).not.toBe(initialFamily.reads[0]);
    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(productReferenceProjections).toBe(2);
    expect(hotReferenceProjections).toBe(2);
    const nextFamily = lifecycle.readState(replacement.computationId)?.children.find(
      (child) => child.locus.reconciliationKey === family.reconciliationKey,
    );
    const nextPre = lifecycle.readState(replacement.computationId)?.children.find(
      (child) => child.locus.reconciliationKey === pre.reconciliationKey,
    );
    const nextConsumer = lifecycle.readState(replacement.computationId)?.children.find(
      (child) => child.locus.reconciliationKey === consumer.reconciliationKey,
    );
    const nextDependency = nextFamily?.candidateReads.find(
      (read) => read.handle === preHandle,
    );
    expect(nextDependency).not.toBe(initialFamily.candidateReads.find((read) => read.handle === preHandle));
    expect(nextDependency).toEqual(expect.objectContaining({
      state: ComputationCandidateReadState.Present,
      producerChildId: nextPre?.childId,
      actualKind: "source-file-address",
    }));
    expect(nextFamily?.reads.map((read) => read.readKey)).toEqual(["source:carried-family"]);
    expect(nextFamily?.outputs.map((output) => output.readKey).sort()).toEqual(
      initialFamily.outputs.map((output) => output.readKey).sort(),
    );
    expect(nextFamily?.outputs.every((output) => initialFamily.outputs.includes(output))).toBe(true);
    expect(result.transition.children).toEqual(expect.arrayContaining([
      expect.objectContaining({
        childId: nextFamily?.childId,
        kind: ComputationChildTransitionKind.Carried,
        hadPreviousState: true,
      }),
      expect.objectContaining({
        childId: nextPre?.childId,
        kind: ComputationChildTransitionKind.Executed,
        hadPreviousState: true,
      }),
      expect.objectContaining({
        childId: nextConsumer?.childId,
        kind: ComputationChildTransitionKind.Executed,
        hadPreviousState: false,
      }),
    ]));
    for (const output of initialFamily.outputs) {
      expect(result.transition.publications).toContainEqual(expect.objectContaining({
        surface: output.surface,
        handle: output.handle,
        decision: KernelPublicationDecisionKind.Retain,
      }));
    }
    expect(nextConsumer).toBeDefined();
    expect(lifecycle.childReadersFor(computationRecordReadKey(productHandle))).toEqual([nextConsumer?.childId]);
  });

  test("carries a whole-result consumer only after its producer also carries", () => {
    const store = new KernelStore("computation-child-result-carry");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const producer = childLocus("result-carry-producer");
    const consumer = childLocus("result-carry-consumer");
    const independent = childLocus("result-carry-independent");
    const producerHandle = store.handles.address("child-result-carry:producer");
    const consumerHandle = store.handles.address("child-result-carry:consumer");
    const independentHandle = store.handles.address("child-result-carry:independent");
    const producerAddress = new SourceFileAddress(
      producerHandle,
      "test",
      "src/producer.html",
      SourceLanguage.Html,
    );
    const consumerAddress = new SourceFileAddress(
      consumerHandle,
      "test",
      "src/consumer.html",
      SourceLanguage.Html,
    );
    const independentAddress = new SourceFileAddress(
      independentHandle,
      "test",
      "src/independent.html",
      SourceLanguage.Html,
    );

    const initial = lifecycle.begin(locus("child-result-carry"));
    initial.withChildPartition(() => {
      initial.withChild(producer, () => {
        initial.publish(publication("child-result-carry:producer:initial", [producerAddress]));
      });
      initial.withChild(consumer, () => {
        initial.observeChildResult(producer);
        initial.publish(publication("child-result-carry:consumer:initial", [consumerAddress]));
      });
      initial.withChild(independent, () => {
        initial.publish(publication("child-result-carry:independent:initial", [independentAddress]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const initialState = lifecycle.readState(initial.computationId);
    const initialProducer = initialState?.children.find(
      (child) => child.locus.reconciliationKey === producer.reconciliationKey,
    );
    const initialConsumer = initialState?.children.find(
      (child) => child.locus.reconciliationKey === consumer.reconciliationKey,
    );
    expect(initialProducer).toBeDefined();
    expect(initialConsumer?.resultDependencies).toEqual([
      expect.objectContaining({ producerChildId: initialProducer?.childId }),
    ]);
    if (initialProducer == null || initialConsumer == null) {
      throw new Error("Expected committed child-result producer and consumer state.");
    }
    const resultReadKey = computationChildResultReadKey(initialProducer.childId);
    expect(lifecycle.childProducerFor(resultReadKey)).toBe(initialProducer.childId);
    expect(lifecycle.childReadersFor(resultReadKey)).toEqual([initialConsumer.childId]);

    const carried = lifecycle.begin(locus("child-result-carry"));
    carried.withChildPartition(() => {
      expect(carried.tryCarryChild(producer)).not.toBeNull();
      expect(carried.tryCarryChild(consumer)).not.toBeNull();
      expect(carried.tryCarryChild(independent)).not.toBeNull();
    });
    const carriedResult = carried.commit();
    expect(carriedResult.state).toBe(ComputationCommitState.Committed);
    expect(carriedResult.transition.children).toEqual(expect.arrayContaining([
      expect.objectContaining({
        childId: initialProducer.childId,
        kind: ComputationChildTransitionKind.Carried,
      }),
      expect.objectContaining({
        childId: initialConsumer.childId,
        kind: ComputationChildTransitionKind.Carried,
      }),
    ]));

    const producerExecuted = lifecycle.begin(locus("child-result-carry"));
    producerExecuted.withChildPartition(() => {
      producerExecuted.withChild(producer, () => {
        producerExecuted.publish(publication("child-result-carry:producer:executed", [producerAddress]));
      });
      expect(producerExecuted.tryCarryChild(consumer)).toBeNull();
      producerExecuted.withChild(consumer, () => {
        producerExecuted.observeChildResult(producer);
        producerExecuted.publish(publication("child-result-carry:consumer:executed", [consumerAddress]));
      });
      expect(producerExecuted.tryCarryChild(independent)).not.toBeNull();
    });
    const producerExecutedResult = producerExecuted.commit();
    expect(producerExecutedResult.state).toBe(ComputationCommitState.Committed);
    expect(producerExecutedResult.transition.publications).toContainEqual(expect.objectContaining({
      surface: KernelPublicationSurface.Record,
      handle: producerHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(producerExecutedResult.transition.children).toEqual(expect.arrayContaining([
      expect.objectContaining({
        childId: initialProducer.childId,
        kind: ComputationChildTransitionKind.Executed,
      }),
      expect.objectContaining({
        childId: initialConsumer.childId,
        kind: ComputationChildTransitionKind.Executed,
      }),
    ]));
  });

  test("retains an observed zero-output producer and freezes it against later preparation", () => {
    const store = new KernelStore("computation-child-empty-result");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const producer = childLocus("empty-result-producer");
    const consumer = childLocus("empty-result-consumer");
    const consumerHandle = store.handles.address("child-empty-result:consumer");

    const premature = lifecycle.begin(locus("child-empty-result-premature"));
    expect(() => premature.withChild(consumer, () => premature.observeChildResult(producer))).toThrow(
      /has no completed result in this candidate/,
    );
    expect(() => premature.commit()).toThrow(/failed child preparation/);

    const initial = lifecycle.begin(locus("child-empty-result"));
    initial.withChildPartition(() => {
      initial.withChild(producer, () => {});
      initial.withChild(consumer, () => {
        initial.observeChildResult(producer);
        initial.publish(publication("child-empty-result:consumer", [
          new SourceFileAddress(consumerHandle, "test", "src/consumer.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const producerState = lifecycle.readState(initial.computationId)?.children.find(
      (child) => child.locus.reconciliationKey === producer.reconciliationKey,
    );
    expect(producerState).toBeDefined();
    expect(producerState?.outputs).toEqual([]);

    const invalid = lifecycle.begin(locus("child-empty-result"));
    invalid.withChildPartition(() => {
      invalid.withChild(producer, () => {});
      invalid.withChild(consumer, () => invalid.observeChildResult(producer));
      expect(() => invalid.withChild(producer, () => {})).toThrow(/cannot resume after its complete result was observed/);
    });
    expect(() => invalid.commit()).toThrow(/failed child preparation/);
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
  });

  test("includes whole-result dependencies in technical child SCCs", () => {
    const store = new KernelStore("computation-child-result-cycle");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const childA = childLocus("result-cycle-a");
    const childB = childLocus("result-cycle-b");
    const handleA = store.handles.address("child-result-cycle:a");
    const handleB = store.handles.address("child-result-cycle:b");
    const run = lifecycle.begin(locus("child-result-cycle"));

    run.withChildPartition(() => {
      run.withChild(childA, () => {
        run.publish(publication("child-result-cycle:a", [
          new SourceFileAddress(handleA, "test", "src/a.html", SourceLanguage.Html),
        ]));
      });
      run.withChild(childB, () => {
        expect(run.read(handleA)).not.toBeNull();
        run.publish(publication("child-result-cycle:b", [
          new SourceFileAddress(handleB, "test", "src/b.html", SourceLanguage.Html),
        ]));
      });
      run.withChild(childA, () => run.observeChildResult(childB));
    });
    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const cycle = lifecycle.readState(run.computationId)?.children.filter((child) =>
      child.locus.reconciliationKey === childA.reconciliationKey
      || child.locus.reconciliationKey === childB.reconciliationKey
    ) ?? [];
    expect(cycle).toHaveLength(2);
    expect(cycle.every((child) => child.scc.kind === ComputationChildSccKind.Cyclic)).toBe(true);
    expect(new Set(cycle.map((child) => child.scc.key)).size).toBe(1);
  });

  test("refuses stale carry before staging and rejects exact inputs that change after carry", () => {
    const store = new KernelStore("computation-child-carry-inputs");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:carry-input", "1");
    const family = childLocus("carry-input-family");
    const outputHandle = store.handles.address("child-carry-input:output");

    const initial = lifecycle.begin(locus("child-carry-inputs"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(revisions.observe("source:carry-input"));
      initial.publish(publication("child-carry-input:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("source:carry-input", "2");
    const staleAtSchedule = lifecycle.begin(locus("child-carry-inputs"));
    staleAtSchedule.withChildPartition(() => {
      expect(staleAtSchedule.tryCarryChild(family)).toBeNull();
    });
    staleAtSchedule.abort();
    expect(store.read(outputHandle)).not.toBeNull();

    revisions.set("source:carry-input", "1");
    const staleAtCommit = lifecycle.begin(locus("child-carry-inputs"));
    staleAtCommit.withChildPartition(() => {
      expect(staleAtCommit.tryCarryChild(family)).not.toBeNull();
    });
    revisions.set("source:carry-input", "3");
    const result = staleAtCommit.commit();

    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toContainEqual(expect.objectContaining({
      readKey: "source:carry-input",
    }));
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
    expect(store.read(outputHandle)).not.toBeNull();
  });

  test("routes restaged mutable details through ordinary replacement decisions", () => {
    const store = new KernelStore("computation-child-carry-mutable-detail");
    const owner = {};
    const productHandle = store.handles.product("child-carry-mutable-detail:product");
    const provenanceHandle = store.handles.provenance("child-carry-mutable-detail:provenance");
    const slot = defineTestProductDetailSlot<{ revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-mutable-detail",
      "Mutable incumbent whose in-place changes must advance the detail revision.",
    );
    const product = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const provenance = new ProvenanceRecord(provenanceHandle);
    const detail = { revision: 1 };
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        new KernelStoreBatch([provenance, product], "child-carry-mutable-detail:initial"),
        [publishProductDetail(slot, productHandle, detail)],
      ),
      owner,
      { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness },
    );
    const initialRevision = store.productDetails.readMutationOrdinal(productHandle);

    const replacement = store.replaceOwnedPublication(
      initial.manifest,
      new KernelPublicationPlan(
        new KernelStoreBatch([provenance, product], "child-carry-mutable-detail:replacement"),
        [publishProductDetail(slot, productHandle, detail)],
      ),
      owner,
      {
        validate: () => {
          detail.revision = 2;
        },
        validateCurrent(): void {},
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    );

    expect(replacement.decisions).toContainEqual(expect.objectContaining({
      surface: KernelPublicationSurface.ProductDetail,
      handle: productHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.productDetails.readMutationOrdinal(productHandle)).not.toBe(initialRevision);
    expect(store.productDetails.read(slot, productHandle)).toBe(detail);
    expect(detail.revision).toBe(2);
  });

  test("refuses child carry after a retained detail mutates its structural closure", () => {
    const store = new KernelStore("computation-child-carry-mutated-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-mutated-closure-family");
    const targetA = store.handles.address("carry-mutated-closure:target-a");
    const targetB = store.handles.address("carry-mutated-closure:target-b");
    const provenanceHandle = store.handles.provenance("carry-mutated-closure:product");
    const productHandle = store.handles.product("carry-mutated-closure:product");
    const detail = { target: targetA };
    const slot = defineTestProductDetailSlot<typeof detail>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-mutated-closure",
      "Carried detail whose exact structural closure must remain unchanged.",
      (value) => mergeKernelDetailReferences(kernelRecordReferences(value.target)),
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(targetA, "test", "src/a.html", SourceLanguage.Html),
      new SourceFileAddress(targetB, "test", "src/b.html", SourceLanguage.Html),
    ], "carry-mutated-closure:targets"));

    const initial = lifecycle.begin(locus("child-carry-mutated-closure"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "carry-mutated-closure:initial"),
        [publishProductDetail(slot, productHandle, detail)],
      ));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    detail.target = targetB;
    const replacement = lifecycle.begin(locus("child-carry-mutated-closure"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).toBeNull();
    });
    replacement.abort();
  });

  test("keeps final publication authority out of caller-constructed publication candidates", () => {
    const store = new KernelStore("forged-final-candidate");
    expect(() => new SealedKernelPublicationCandidate(
      {},
      store,
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(new KernelStoreBatch([], "forged-carry-candidate")),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      [],
      [],
    )).toThrow(/only be minted by sealing staged publication/);
  });

  test("rejects forged, preview-only, and foreign-store authority at final publication replacement", () => {
    const store = new KernelStore("publication-candidate-authority-boundaries");
    const foreignStore = new KernelStore("publication-candidate-authority-foreign-store");
    const owner = {};
    const plan = new KernelPublicationPlan(new KernelStoreBatch([], "forged-carry-candidate"));
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const forged = {
      plan,
      explicitlyRetains: () => true,
    } as unknown as SealedKernelPublicationCandidate;

    expect(() => store.replaceOwnedPublicationCandidate(
      forged,
      owner,
      preflight,
    )).toThrow(/authority was not minted by sealed staged publication/);

    const staged = new StagedKernelPublicationContext(
      store,
      KernelPublicationManifest.empty,
      "test:preview-candidate-authority" as KernelPublicationWriterId,
    );
    const preview = staged.toDecisionPreviewCandidate("preview-candidate-authority", []);
    expect(() => store.replaceOwnedPublicationCandidate(
      preview as unknown as SealedKernelPublicationCandidate,
      owner,
      preflight,
    )).toThrow(/authority was not minted by sealed staged publication/);

    const finalCandidate = staged.seal("foreign-store-final-candidate");
    expect(() => foreignStore.replaceOwnedPublicationCandidate(
      finalCandidate,
      owner,
      preflight,
    )).toThrow(/belongs to a different kernel store/);
  });

  test("rejects final publication authority at the preview boundary", () => {
    const store = new KernelStore("publication-preview-authority-boundary");
    const staged = new StagedKernelPublicationContext(
      store,
      KernelPublicationManifest.empty,
      "test:final-candidate-authority" as KernelPublicationWriterId,
    );
    const finalCandidate = staged.seal("final-candidate-authority");

    expect(() => store.previewOwnedPublicationCandidateDecisions(
      KernelPublicationManifest.empty,
      finalCandidate as unknown as KernelPublicationDecisionPreviewCandidate,
      {},
    )).toThrow(/preview authority was not minted by staged publication/);
  });

  test("rejects a sealed candidate after its exact prior manifest is replaced", () => {
    const store = new KernelStore("stale-final-candidate-lineage");
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const firstHandle = store.handles.address("stale-final-candidate:first");
    const secondHandle = store.handles.address("stale-final-candidate:second");
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      publication("stale-final-candidate:initial", [
        new SourceFileAddress(firstHandle, "test", "src/first.html", SourceLanguage.Html),
      ]),
      owner,
      preflight,
    );
    const staged = new StagedKernelPublicationContext(
      store,
      initial.manifest,
      "test:stale-final-candidate" as KernelPublicationWriterId,
    );
    staged.publish(publication("stale-final-candidate:staged", [
      new SourceFileAddress(firstHandle, "test", "src/first.html", SourceLanguage.Html),
    ]));
    const staleCandidate = staged.seal("stale-final-candidate:sealed");
    const stagedRecord = staleCandidate.recordsByHandle.get(firstHandle);
    const stagedRevision = staleCandidate.readStagedRevision(KernelPublicationSurface.Record, firstHandle);
    expect(stagedRecord).toBe(staleCandidate.plan.batch.records[0]);
    expect((staleCandidate.recordsByHandle as { readonly set?: unknown }).set).toBeUndefined();
    expect(stagedRevision).not.toBeNull();
    expect(Object.isFrozen(stagedRevision)).toBe(true);
    store.replaceOwnedPublication(
      initial.manifest,
      publication("stale-final-candidate:replacement", [
        new SourceFileAddress(secondHandle, "test", "src/second.html", SourceLanguage.Html),
      ]),
      owner,
      preflight,
    );

    expect(() => store.replaceOwnedPublicationCandidate(
      staleCandidate,
      owner,
      preflight,
    )).toThrow(/stale or foreign publication manifest/);
    expect(store.read(firstHandle)).toBeNull();
    expect(store.read(secondHandle)).not.toBeNull();
  });

  test("spends a final publication candidate exactly once even when its prior manifest is empty", () => {
    const store = new KernelStore("single-spend-final-candidate");
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const staged = new StagedKernelPublicationContext(
      store,
      KernelPublicationManifest.empty,
      "test:single-spend-final-candidate" as KernelPublicationWriterId,
    );
    const candidate = staged.seal("single-spend-final-candidate");

    const replacement = store.replaceOwnedPublicationCandidate(candidate, owner, preflight);
    expect(() => store.replaceOwnedPublicationCandidate(candidate, owner, preflight)).toThrow(/already been spent/);
    store.retirePublicationManifest(replacement.manifest, owner);
  });

  test("distinguishes prospective carry projections over the same staged base", () => {
    const store = new KernelStore("prospective-carry-projection-identity");
    const owner = {};
    const materializationOwner = store.handles.address("prospective-carry-projection:owner");
    const firstHandle = store.handles.materialization("prospective-carry-projection:first");
    const secondHandle = store.handles.materialization("prospective-carry-projection:second");
    const ownerAddress = new SourceFileAddress(
      materializationOwner,
      "test",
      "src/owner.html",
      SourceLanguage.Html,
    );
    const first = new MaterializationRecord(firstHandle, materializationOwner);
    const second = new MaterializationRecord(secondHandle, materializationOwner);
    const replacement = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      publication("prospective-carry-projection:initial", [ownerAddress, first, second]),
      owner,
      { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness },
    );
    const staged = new StagedKernelPublicationContext(
      store,
      replacement.manifest,
      "test:prospective-carry-projection" as KernelPublicationWriterId,
    );
    const firstProjection = staged.createProspectiveCarryReadView([{
      surface: KernelPublicationSurface.Record,
      handle: firstHandle,
      detailKind: first.kind,
    }]);
    const secondProjection = staged.createProspectiveCarryReadView([{
      surface: KernelPublicationSurface.Record,
      handle: secondHandle,
      detailKind: second.kind,
    }]);

    const firstRevision = firstProjection.readProjectionRevision();
    expect(firstRevision.equals(firstProjection.readProjectionRevision())).toBe(true);
    expect(firstRevision.equals(secondProjection.readProjectionRevision())).toBe(false);
    const firstOwnerSnapshot = firstProjection.readMaterializationsByOwner(materializationOwner);
    expect(firstOwnerSnapshot.map((record) => record.handle)).toEqual([firstHandle]);
    expect(firstProjection.readMaterializationsByOwner(materializationOwner)).toBe(firstOwnerSnapshot);
    expect(secondProjection.readMaterializationsByOwner(materializationOwner).map((record) => record.handle)).toEqual([
      secondHandle,
    ]);
    const foreignStaged = new StagedKernelPublicationContext(
      store,
      replacement.manifest,
      "test:foreign-prospective-carry-projection" as KernelPublicationWriterId,
    );
    expect(() => foreignStaged.carryFrom(
      "test:foreign-prospective-carry-projection" as KernelPublicationWriterId,
      firstProjection,
    )).toThrow(/does not belong to this staged publication/);

    staged.publish(publication("prospective-carry-projection:staged", [second]));
    expect(firstRevision.equals(firstProjection.readProjectionRevision())).toBe(false);
    expect(firstProjection.readMaterializationsByOwner(materializationOwner).map((record) => record.handle)).toEqual([
      firstHandle,
      secondHandle,
    ]);
  });

  test("previews only requested retention decisions and rejects a stale targeted candidate", () => {
    const store = new KernelStore("publication-targeted-preview");
    const owner = {};
    const retainedHandle = store.handles.address("publication-targeted-preview:retained");
    const unrelatedHandle = store.handles.address("publication-targeted-preview:unrelated");
    const stagedHandle = store.handles.address("publication-targeted-preview:staged");
    const replacement = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      publication("publication-targeted-preview:initial", [
        new SourceFileAddress(retainedHandle, "test", "src/retained.html", SourceLanguage.Html),
        new SourceFileAddress(unrelatedHandle, "test", "src/unrelated.html", SourceLanguage.Html),
      ]),
      owner,
      { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness },
    );
    const staged = new StagedKernelPublicationContext(
      store,
      replacement.manifest,
      "test:publication-targeted-preview" as KernelPublicationWriterId,
    );
    const stagedRetained = new SourceFileAddress(
      retainedHandle,
      "test",
      "src/retained.html",
      SourceLanguage.Html,
    );
    staged.publish(publication("publication-targeted-preview:retained", [stagedRetained]));
    const target: {
      surface: KernelPublicationSurface;
      handle: string;
      detailKind: string;
    } = {
      surface: KernelPublicationSurface.Record,
      handle: retainedHandle,
      detailKind: "source-file-address",
    };
    const preview = staged.toDecisionPreviewCandidate(
      "publication-targeted-preview",
      [target],
    );
    target.detailKind = "mutated-after-preview-mint";

    expect(store.previewOwnedPublicationCandidateDecisions(
      replacement.manifest,
      preview,
      owner,
    )).toEqual([
      expect.objectContaining({
        handle: retainedHandle,
        detailKind: "source-file-address",
        decision: KernelPublicationDecisionKind.Retain,
      }),
    ]);
    expect(Object.isFrozen(stagedRetained)).toBe(true);

    staged.publish(publication("publication-targeted-preview:mutation", [
      new SourceFileAddress(stagedHandle, "test", "src/staged.html", SourceLanguage.Html),
    ]));
    expect(() => store.previewOwnedPublicationCandidateDecisions(
      replacement.manifest,
      preview,
      owner,
    )).toThrow(/decision preview .* is stale after candidate mutation/);
  });

  test("reruns a child when its candidate producer does not retain", () => {
    const store = new KernelStore("computation-child-carry-producer-change");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const pre = childLocus("carry-change-pre");
    const family = childLocus("carry-change-family");
    const preHandle = store.handles.address("child-carry-change:pre");
    const familyHandle = store.handles.address("child-carry-change:family");

    const initial = lifecycle.begin(locus("child-carry-producer-change"));
    initial.withChildPartition(() => {
      initial.withChild(pre, () => initial.publish(publication("carry-change:pre:initial", [
        new SourceFileAddress(preHandle, "test", "src/pre.html", SourceLanguage.Html),
      ])));
      initial.withChild(family, () => {
        expect(initial.read(preHandle)).not.toBeNull();
        initial.publish(publication("carry-change:family:initial", [
          new SourceFileAddress(familyHandle, "test", "src/family.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-producer-change"));
    replacement.withChildPartition(() => {
      replacement.withChild(pre, () => replacement.publish(publication("carry-change:pre:replacement", [
        new SourceFileAddress(preHandle, "test", "src/renamed-pre.html", SourceLanguage.Html),
      ])));
      expect(replacement.tryCarryChild(family)).toBeNull();
      replacement.withChild(family, () => {
        expect(replacement.read(preHandle)).toEqual(expect.objectContaining({ path: "src/renamed-pre.html" }));
        replacement.publish(publication("carry-change:family:replacement", [
          new SourceFileAddress(familyHandle, "test", "src/recomputed-family.html", SourceLanguage.Html),
        ]));
      });
    });

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: preHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.read(familyHandle)).toEqual(expect.objectContaining({ path: "src/recomputed-family.html" }));
  });

  test("keeps the owning run quiescent while a detail comparator participates in carry preview", () => {
    const store = new KernelStore("computation-child-carry-preview-quiescence");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const producer = childLocus("carry-preview-quiescence-producer");
    const consumer = childLocus("carry-preview-quiescence-consumer");
    const provenanceHandle = store.handles.provenance("carry-preview-quiescence:product");
    const productHandle = store.handles.product("carry-preview-quiescence:product");
    const consumerHandle = store.handles.address("carry-preview-quiescence:consumer");
    let replacement: ComputationRun | null = null;
    let previewReentryError: unknown = null;
    let probePreview = false;
    const slot = defineTestProductDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-preview-quiescence",
      "Carry-preview quiescence witness.",
      noKernelDetailReferences,
      () => {
        if (probePreview && replacement != null) {
          try {
            replacement.read(productHandle);
          } catch (error) {
            previewReentryError = error;
          }
        }
        return KernelPublicationDecisionKind.Retain;
      },
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );

    const initial = lifecycle.begin(locus("child-carry-preview-quiescence"));
    initial.withChildPartition(() => {
      initial.withChild(producer, () => initial.publish(new KernelPublicationPlan(
        new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "carry-preview-quiescence:initial"),
        [publishProductDetail(slot, productHandle, { value: 1 })],
      )));
      initial.withChild(consumer, () => {
        expect(initial.readProductDetail(slot, productHandle)).toEqual({ value: 1 });
        initial.publish(publication("carry-preview-quiescence:consumer", [
          new SourceFileAddress(consumerHandle, "test", "src/consumer.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const next = lifecycle.begin(locus("child-carry-preview-quiescence"));
    replacement = next;
    next.withChildPartition(() => {
      next.withChild(producer, () => next.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          product(),
        ], "carry-preview-quiescence:replacement"),
        [publishProductDetail(slot, productHandle, { value: 1 })],
      )));
      probePreview = true;
      expect(next.tryCarryChild(consumer)).not.toBeNull();
      probePreview = false;
    });

    expect(previewReentryError).toEqual(expect.objectContaining({
      message: expect.stringMatching(/cannot be used during child-carry decision preview/),
    }));
    expect(next.commit().state).toBe(ComputationCommitState.Committed);
  });

  test("reruns an exact carried detail when another child refreshes its product witness", () => {
    const store = new KernelStore("computation-child-carry-owner-witness");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const owner = childLocus("carry-owner-witness-product");
    const detail = childLocus("carry-owner-witness-detail");
    const productHandle = store.handles.product("carry-owner-witness:product");
    const firstProvenance = store.handles.provenance("carry-owner-witness:first");
    const secondProvenance = store.handles.provenance("carry-owner-witness:second");
    const slot = defineTestProductDetailSlot<number>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-owner-witness",
      "Product-witness carry decision.",
    );
    const product = (provenanceHandle: typeof firstProvenance) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );

    const initial = lifecycle.begin(locus("child-carry-owner-witness"));
    initial.withChildPartition(() => {
      initial.withChild(owner, () => initial.publish(publication("carry-owner-witness:initial-owner", [
        new ProvenanceRecord(firstProvenance),
        product(firstProvenance),
      ])));
      initial.withChild(detail, () => initial.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "carry-owner-witness:initial-detail"),
        [publishProductDetail(slot, productHandle, 1)],
      )));
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-owner-witness"));
    replacement.withChildPartition(() => {
      replacement.withChild(owner, () => replacement.publish(publication("carry-owner-witness:next-owner", [
        new ProvenanceRecord(secondProvenance),
        product(secondProvenance),
      ])));
      expect(replacement.tryCarryChild(detail)).toBeNull();
      replacement.withChild(detail, () => replacement.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "carry-owner-witness:next-detail"),
        [publishProductDetail(slot, productHandle, 1)],
      )));
    });

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        handle: productHandle,
        decision: KernelPublicationDecisionKind.RefreshWitness,
      }),
      expect.objectContaining({
        handle: productHandle,
        surface: KernelPublicationSurface.ProductDetail,
        decision: KernelPublicationDecisionKind.RefreshWitness,
      }),
    ]));
    expect(result.transition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({ reconciliationKey: detail.reconciliationKey }),
      kind: ComputationChildTransitionKind.Executed,
    }));
  });

  test("carries structural links across target replacement and preserves them for later generations", () => {
    const store = new KernelStore("computation-child-carry-structural-replacement");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const target = childLocus("carry-structural-target");
    const consumer = childLocus("carry-structural-consumer");
    const targetHandle = store.handles.address("carry-structural:target");
    const consumerHandle = store.handles.address("carry-structural:consumer");

    const publishTarget = (run: ComputationRun, path: string) => run.withChild(target, () => {
      run.publish(publication(`carry-structural:target:${path}`, [
        new SourceFileAddress(targetHandle, "test", path, SourceLanguage.Html),
      ]));
    });

    const initial = lifecycle.begin(locus("child-carry-structural-replacement"));
    initial.withChildPartition(() => {
      publishTarget(initial, "src/target-1.html");
      initial.withChild(consumer, () => {
        initial.publish(publication("carry-structural:consumer", [
          new SourceSpanAddress(consumerHandle, targetHandle, 1, 3),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-structural-replacement"));
    replacement.withChildPartition(() => {
      publishTarget(replacement, "src/target-2.html");
      expect(replacement.tryCarryChild(consumer)).not.toBeNull();
    });
    const replacementResult = replacement.commit();
    expect(replacementResult.state).toBe(ComputationCommitState.Committed);
    expect(replacementResult.transition.publications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        handle: targetHandle,
        decision: KernelPublicationDecisionKind.Replace,
      }),
      expect.objectContaining({
        handle: consumerHandle,
        decision: KernelPublicationDecisionKind.Retain,
      }),
    ]));
    expect(replacementResult.transition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({ reconciliationKey: consumer.reconciliationKey }),
      kind: ComputationChildTransitionKind.Carried,
    }));

    const next = lifecycle.begin(locus("child-carry-structural-replacement"));
    next.withChildPartition(() => {
      publishTarget(next, "src/target-3.html");
      expect(next.tryCarryChild(consumer)).not.toBeNull();
    });
    expect(next.commit().state).toBe(ComputationCommitState.Committed);
    const nextConsumer = lifecycle.readState(next.computationId)?.children
      .find((child) => child.locus.reconciliationKey === consumer.reconciliationKey);
    expect(nextConsumer?.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(targetHandle),
      producerChildId: lifecycle.childProducerFor(computationRecordReadKey(targetHandle)),
    }));

    const withdrawal = lifecycle.begin(locus("child-carry-structural-replacement"));
    withdrawal.withChildPartition(() => {
      expect(withdrawal.tryCarryChild(consumer)).toBeNull();
    });
    withdrawal.abort();
  });

  test("rejects a carried dependency when authoritative comparison changes after preview", () => {
    const store = new KernelStore("computation-child-carry-preview-drift");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const pre = childLocus("carry-preview-pre");
    const family = childLocus("carry-preview-family");
    const provenanceHandle = store.handles.provenance("carry-preview:product");
    const productHandle = store.handles.product("carry-preview:product");
    const familyHandle = store.handles.address("carry-preview:family");
    let comparison = KernelPublicationDecisionKind.Retain;
    const slot = defineTestProductDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-carry-preview",
      "Decision-preview drift witness.",
      noKernelDetailReferences,
      () => comparison,
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initialDetail = { value: 1 };

    const initial = lifecycle.begin(locus("child-carry-preview-drift"));
    initial.withChildPartition(() => {
      initial.withChild(pre, () => initial.publish(new KernelPublicationPlan(
        new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "carry-preview:pre:initial"),
        [publishProductDetail(slot, productHandle, initialDetail)],
      )));
      initial.withChild(family, () => {
        expect(initial.readProductDetail(slot, productHandle)).toBe(initialDetail);
        initial.publish(publication("carry-preview:family:initial", [
          new SourceFileAddress(familyHandle, "test", "src/family.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacementDetail = { value: 1 };
    const replacement = lifecycle.begin(locus("child-carry-preview-drift"));
    replacement.withChildPartition(() => {
      replacement.withChild(pre, () => replacement.publish(new KernelPublicationPlan(
        new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "carry-preview:pre:replacement"),
        [publishProductDetail(slot, productHandle, replacementDetail)],
      )));
      expect(replacement.tryCarryChild(family)).not.toBeNull();
    });
    comparison = KernelPublicationDecisionKind.Replace;

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toContainEqual(expect.objectContaining({
      readKey: computationProductDetailReadKey(productHandle),
      domain: "computation-child-carried-dependency",
      currentRevision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.productDetails.read(slot, productHandle)).toBe(initialDetail);
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
  });

  test("keeps carry distinct from omission and refuses open or cyclic prior children", () => {
    const store = new KernelStore("computation-child-carry-boundaries");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const carriedLocus = childLocus("carry-boundary-retained");
    const omittedLocus = childLocus("carry-boundary-omitted");
    const openLocus = childLocus("carry-boundary-open");
    const carriedHandle = store.handles.address("carry-boundary:retained");
    const omittedHandle = store.handles.address("carry-boundary:omitted");
    const openHandle = store.handles.address("carry-boundary:open");

    const initial = lifecycle.begin(locus("child-carry-boundaries"));
    initial.withChildPartition(() => {
      initial.withChild(carriedLocus, () => initial.publish(publication("carry-boundary:retained", [
        new SourceFileAddress(carriedHandle, "test", "src/retained.html", SourceLanguage.Html),
      ])));
      initial.withChild(omittedLocus, () => initial.publish(publication("carry-boundary:omitted", [
        new SourceFileAddress(omittedHandle, "test", "src/omitted.html", SourceLanguage.Html),
      ])));
      initial.withChild(openLocus, () => {
        initial.readAllRecords();
        initial.publish(publication("carry-boundary:open", [
          new SourceFileAddress(openHandle, "test", "src/open.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-boundaries"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(carriedLocus)).not.toBeNull();
      expect(replacement.tryCarryChild(openLocus)).toBeNull();
    });
    const result = replacement.commit();

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(store.read(carriedHandle)).not.toBeNull();
    expect(store.read(omittedHandle)).toBeNull();
    expect(store.read(openHandle)).toBeNull();
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: carriedHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: omittedHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    const cycleA = childLocus("carry-cycle-a");
    const cycleB = childLocus("carry-cycle-b");
    const cycleAHandle = store.handles.address("carry-cycle:a");
    const cycleBHandle = store.handles.address("carry-cycle:b");
    const cyclicInitial = lifecycle.begin(locus("child-carry-cyclic"));
    cyclicInitial.withChildPartition(() => {
      cyclicInitial.withChild(cycleA, () => cyclicInitial.publish(publication("carry-cycle:a", [
        new SourceFileAddress(cycleAHandle, "test", "src/a.html", SourceLanguage.Html),
      ])));
      cyclicInitial.withChild(cycleB, () => {
        cyclicInitial.read(cycleAHandle);
        cyclicInitial.publish(publication("carry-cycle:b", [
          new SourceFileAddress(cycleBHandle, "test", "src/b.html", SourceLanguage.Html),
        ]));
      });
      cyclicInitial.withChild(cycleA, () => cyclicInitial.read(cycleBHandle));
    });
    expect(cyclicInitial.commit().state).toBe(ComputationCommitState.Committed);
    const cyclicReplacement = lifecycle.begin(locus("child-carry-cyclic"));
    cyclicReplacement.withChildPartition(() => {
      expect(cyclicReplacement.tryCarryChild(cycleA)).toBeNull();
      expect(cyclicReplacement.tryCarryChild(cycleB)).toBeNull();
    });
    cyclicReplacement.abort();

    const structuralCycleA = childLocus("carry-structural-cycle-a");
    const structuralCycleB = childLocus("carry-structural-cycle-b");
    const structuralCycleAHandle = store.handles.address("carry-structural-cycle:a");
    const structuralCycleBHandle = store.handles.address("carry-structural-cycle:b");
    const structuralCycleInitial = lifecycle.begin(locus("child-carry-structural-cyclic"));
    structuralCycleInitial.withChildPartition(() => {
      structuralCycleInitial.withChild(structuralCycleA, () => {
        structuralCycleInitial.publish(publication("carry-structural-cycle:a", [
          new GeneratedAddress(structuralCycleAHandle, "a", structuralCycleBHandle),
        ]));
      });
      structuralCycleInitial.withChild(structuralCycleB, () => {
        structuralCycleInitial.publish(publication("carry-structural-cycle:b", [
          new GeneratedAddress(structuralCycleBHandle, "b", structuralCycleAHandle),
        ]));
      });
    });
    expect(structuralCycleInitial.commit().state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readState(structuralCycleInitial.computationId)?.children
      .filter((child) => child.role === ComputationChildRole.Declared)).toEqual([
      expect.objectContaining({ scc: expect.objectContaining({ kind: ComputationChildSccKind.Cyclic }) }),
      expect.objectContaining({ scc: expect.objectContaining({ kind: ComputationChildSccKind.Cyclic }) }),
    ]);
    const structuralCycleReplacement = lifecycle.begin(locus("child-carry-structural-cyclic"));
    structuralCycleReplacement.withChildPartition(() => {
      expect(structuralCycleReplacement.tryCarryChild(structuralCycleA)).toBeNull();
      expect(structuralCycleReplacement.tryCarryChild(structuralCycleB)).toBeNull();
    });
    structuralCycleReplacement.abort();
  });

  test("forbids target work before carry while admitting unrelated remainder work", () => {
    const store = new KernelStore("computation-child-carry-started-work");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-started-family");
    const outputHandle = store.handles.address("carry-started:output");
    const speculativeHandle = store.handles.address("carry-started:speculative");
    const remainderHandle = store.handles.address("carry-started:remainder");

    const initial = lifecycle.begin(locus("child-carry-started-work"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.publish(publication("carry-started:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const targetStarted = lifecycle.begin(locus("child-carry-started-work"));
    targetStarted.withChildPartition(() => {
      targetStarted.withChild(family, () => {
        targetStarted.publish(publication("carry-started:speculative", [
          new SourceFileAddress(speculativeHandle, "test", "src/speculative.html", SourceLanguage.Html),
        ]));
      });
      expect(() => targetStarted.tryCarryChild(family)).toThrow(/after candidate work has started/);
    });
    targetStarted.abort();

    const remainderStarted = lifecycle.begin(locus("child-carry-started-work"));
    remainderStarted.publish(publication("carry-started:remainder", [
      new SourceFileAddress(remainderHandle, "test", "src/remainder.html", SourceLanguage.Html),
    ]));
    expect(remainderStarted.tryCarryChild(family)).not.toBeNull();
    const result = remainderStarted.commit();
    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(store.read(outputHandle)).not.toBeNull();
    expect(store.read(remainderHandle)).not.toBeNull();
  });

  test("rebinds carried reads to current validators instead of preserving prior callbacks", () => {
    const store = new KernelStore("computation-child-carry-read-rebase");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-read-rebase-family");
    const outputHandle = store.handles.address("carry-read-rebase:output");
    let priorValidations = 0;
    let currentValidations = 0;
    const currentRead = (): ComputationRead => ({
      readKey: "source:carry-read-rebase",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        currentValidations += 1;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
      tryRebaseCurrent: currentRead,
    });
    const priorRead: ComputationRead = {
      readKey: "source:carry-read-rebase",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        priorValidations += 1;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
      tryRebaseCurrent: currentRead,
    };

    const initial = lifecycle.begin(locus("child-carry-read-rebase"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(priorRead);
      initial.publish(publication("carry-read-rebase:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const priorValidationsAfterInitialCommit = priorValidations;

    const replacement = lifecycle.begin(locus("child-carry-read-rebase"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).not.toBeNull();
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);

    expect(priorValidations).toBe(priorValidationsAfterInitialCommit);
    expect(currentValidations).toBeGreaterThanOrEqual(2);
  });

  test("keeps exact kernel reads under kernel rebase authority", () => {
    const store = new KernelStore("computation-child-carry-kernel-rebase-authority");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-kernel-rebase-family");
    const sourceHandle = store.handles.address("carry-kernel-rebase:source");
    const productHandle = store.handles.product("carry-kernel-rebase:product");
    const provenanceHandle = store.handles.provenance("carry-kernel-rebase:provenance");
    const hotHandle = store.handles.hotDetail("carry-kernel-rebase:hot");
    const outputHandle = store.handles.address("carry-kernel-rebase:output");
    const productSlot = defineTestProductDetailSlot<{ revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.carry-kernel-rebase-product",
      "Foreign product detail read through kernel authority.",
    );
    const hotSlot = defineTestHotDetailSlot<{ revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.carry-kernel-rebase-hot",
      "Foreign hot detail read through kernel authority.",
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(sourceHandle, "test", "src/source.html", SourceLanguage.Html),
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "carry-kernel-rebase:foreign"));
    store.productDetails.add(productSlot, productHandle, { revision: 1 });
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { revision: 1 });

    const initial = lifecycle.begin(locus("child-carry-kernel-rebase-authority"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      expect(initial.read(sourceHandle)).not.toBeNull();
      expect(initial.readProductDetail(productSlot, productHandle)).not.toBeNull();
      expect(initial.readHotDetail(hotSlot, hotHandle)).not.toBeNull();
      initial.publish(publication("carry-kernel-rebase:output", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    let domainRebaseCalls = 0;
    const unchanged = lifecycle.begin(locus("child-carry-kernel-rebase-authority"));
    unchanged.withChildPartition(() => {
      expect(unchanged.tryCarryChild(family, (read) => {
        domainRebaseCalls += 1;
        return {
          readKey: read.readKey,
          domain: read.domain,
          observedRevision: read.observedRevision,
          validate: () => ({ isCurrent: true, currentRevision: read.observedRevision, changedFacets: [] }),
          tryRebaseCurrent: () => null,
        };
      })).not.toBeNull();
    });
    unchanged.abort();
    expect(domainRebaseCalls).toBe(0);

    store.hotDetails.remove(hotHandle);
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { revision: 2 });
    const stale = lifecycle.begin(locus("child-carry-kernel-rebase-authority"));
    stale.withChildPartition(() => {
      expect(stale.tryCarryChild(family, () => {
        domainRebaseCalls += 1;
        throw new Error("Domain rebasers must not receive exact kernel reads.");
      })).toBeNull();
    });
    stale.abort();
    expect(domainRebaseCalls).toBe(0);
  });

  test("refuses carry when an exact owner membership gains another materialization", () => {
    const store = new KernelStore("computation-child-carry-owner-growth");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-owner-growth-family");
    const ownerHandle = store.handles.address("carry-owner-growth:owner");
    const firstHandle = store.handles.materialization("carry-owner-growth:first");
    const secondHandle = store.handles.materialization("carry-owner-growth:second");
    const outputHandle = store.handles.address("carry-owner-growth:output");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
      new MaterializationRecord(firstHandle, ownerHandle),
    ], "carry-owner-growth:baseline"));

    const initial = lifecycle.begin(locus("child-carry-owner-growth"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      expect(initial.readMaterializationsByOwner(ownerHandle).map((record) => record.handle)).toEqual([firstHandle]);
      initial.publish(publication("carry-owner-growth:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    store.commit(new KernelStoreBatch([
      new MaterializationRecord(secondHandle, ownerHandle),
    ], "carry-owner-growth:added"));
    const replacement = lifecycle.begin(locus("child-carry-owner-growth"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).toBeNull();
    });
    replacement.abort();
  });

  test("does not freeze owner membership when speculative carry is rejected", () => {
    const store = new KernelStore("computation-child-carry-owner-preview");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const family = childLocus("carry-owner-preview-family");
    const ownerHandle = store.handles.address("carry-owner-preview:owner");
    const materializationHandle = store.handles.materialization("carry-owner-preview:materialization");
    const outputHandle = store.handles.address("carry-owner-preview:output");
    const revisionReadKey = "source:carry-owner-preview";
    revisions.set(revisionReadKey, "1");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
    ], "carry-owner-preview:baseline"));

    const initial = lifecycle.begin(locus("child-carry-owner-preview"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      expect(initial.readMaterializationsByOwner(ownerHandle)).toEqual([]);
      initial.observe(revisions.observe(revisionReadKey));
      initial.publish(publication("carry-owner-preview:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set(revisionReadKey, "2");
    const replacement = lifecycle.begin(locus("child-carry-owner-preview"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).toBeNull();
      replacement.publish(publication("carry-owner-preview:replacement", [
        new MaterializationRecord(materializationHandle, ownerHandle),
      ]));
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(materializationHandle)).toBeInstanceOf(MaterializationRecord);
  });

  test("exposes a child's prospective materializations while rebasing its domain reads", () => {
    const store = new KernelStore("computation-child-carry-self-materialization-preview");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const family = childLocus("carry-self-materialization-preview-family");
    const ownerHandle = store.handles.address("carry-self-materialization-preview:owner");
    const materializationHandle = store.handles.materialization(
      "carry-self-materialization-preview:materialization",
    );
    const readKey = "domain:carry-self-materialization-preview";
    revisions.set(readKey, "1");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
    ], "carry-self-materialization-preview:baseline"));

    const initial = lifecycle.begin(locus("child-carry-self-materialization-preview"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(revisions.observe(readKey, "test-domain"));
      initial.publish(publication("carry-self-materialization-preview:initial", [
        new MaterializationRecord(materializationHandle, ownerHandle),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-self-materialization-preview"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family, (read, context) => {
        expect(context.readMaterializationsByOwner(ownerHandle).map((record) => record.handle)).toEqual([
          materializationHandle,
        ]);
        return revisions.observe(read.readKey, read.domain);
      })).not.toBeNull();
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(materializationHandle)).toBeInstanceOf(MaterializationRecord);
  });

  test("lets a later child refresh a shared result read against its wider prospective closure", () => {
    const store = new KernelStore("computation-child-carry-shared-prospective-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstFamily = childLocus("carry-shared-prospective-closure:first");
    const secondFamily = childLocus("carry-shared-prospective-closure:second");
    const ownerHandle = store.handles.address("carry-shared-prospective-closure:owner");
    const firstHandle = store.handles.materialization("carry-shared-prospective-closure:first");
    const secondHandle = store.handles.materialization("carry-shared-prospective-closure:second");
    const readKey = "domain:carry-shared-prospective-closure";
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
    ], "carry-shared-prospective-closure:baseline"));

    let seedRead: ComputationRead;
    seedRead = {
      readKey,
      domain: "test-domain",
      observedRevision: "same-result",
      validate: () => ({
        isCurrent: true,
        currentRevision: "same-result",
        changedFacets: [],
      }),
      tryRebaseCurrent: () => seedRead,
    };
    const initial = lifecycle.begin(locus("child-carry-shared-prospective-closure"));
    initial.withChildPartition(() => {
      initial.withChild(firstFamily, () => {
        initial.observe(seedRead);
        initial.publish(publication("carry-shared-prospective-closure:first", [
          new MaterializationRecord(firstHandle, ownerHandle),
        ]));
      });
      initial.withChild(secondFamily, () => {
        initial.observe(seedRead);
        initial.publish(publication("carry-shared-prospective-closure:second", [
          new MaterializationRecord(secondHandle, ownerHandle),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    let rebaseCalls = 0;
    const capturedClosures: string[][] = [];
    const replacement = lifecycle.begin(locus("child-carry-shared-prospective-closure"));
    replacement.withChildPartition(() => {
      for (const family of [firstFamily, secondFamily]) {
        expect(replacement.tryCarryChild(family, (read, context) => {
          rebaseCalls += 1;
          const expected = context.readMaterializationsByOwner(ownerHandle)
            .map((record) => record.handle)
            .sort();
          capturedClosures.push(expected);
          return {
            readKey: read.readKey,
            domain: read.domain,
            observedRevision: read.observedRevision,
            validate: () => {
              const current = context.readMaterializationsByOwner(ownerHandle)
                .map((record) => record.handle)
                .sort();
              const isCurrent = current.length === expected.length
                && current.every((handle, index) => handle === expected[index]);
              return {
                isCurrent,
                currentRevision: read.observedRevision,
                changedFacets: isCurrent ? [] : ["closure"],
              };
            },
            tryRebaseCurrent: () => null,
          };
        })).not.toBeNull();
      }
    });

    expect(rebaseCalls).toBe(2);
    expect(capturedClosures).toEqual([
      [firstHandle],
      [firstHandle, secondHandle].sort(),
    ]);
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
  });

  test("reuses a current candidate read after the domain rebaser delegates and revalidates it at final commit", () => {
    const store = new KernelStore("computation-child-carry-current-candidate-read");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const family = childLocus("carry-current-candidate-read-family");
    const outputHandle = store.handles.address("carry-current-candidate-read:output");
    const readKey = "source:carry-current-candidate-read";
    revisions.set(readKey, "1");

    const initial = lifecycle.begin(locus("child-carry-current-candidate-read"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(revisions.observe(readKey, "test-domain"));
      initial.publish(publication("carry-current-candidate-read:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    let rebaseCalls = 0;
    const replacement = lifecycle.begin(locus("child-carry-current-candidate-read"));
    replacement.observe(revisions.observe(readKey, "test-domain"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family, () => {
        rebaseCalls += 1;
        return undefined;
      })).not.toBeNull();
    });
    revisions.set(readKey, "2");

    expect(rebaseCalls).toBe(1);
    expect(replacement.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(store.read(outputHandle)).toBeInstanceOf(SourceFileAddress);
  });

  test("keeps domain rebase previews side-effect-free when carry is rejected", () => {
    const store = new KernelStore("computation-child-carry-domain-preview");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const family = childLocus("carry-domain-preview-family");
    const ownerHandle = store.handles.address("carry-domain-preview:owner");
    const materializationHandle = store.handles.materialization("carry-domain-preview:materialization");
    const outputHandle = store.handles.address("carry-domain-preview:output");
    const revisionReadKey = "source:carry-domain-preview";
    revisions.set(revisionReadKey, "1");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
    ], "carry-domain-preview:baseline"));

    const initial = lifecycle.begin(locus("child-carry-domain-preview"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(revisions.observe(revisionReadKey));
      initial.publish(publication("carry-domain-preview:initial", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-domain-preview"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family, (_read, context) => {
        expect(context.readMaterializationsByOwner(ownerHandle)).toEqual([]);
        return null;
      })).toBeNull();
      replacement.publish(publication("carry-domain-preview:replacement", [
        new MaterializationRecord(materializationHandle, ownerHandle),
      ]));
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(materializationHandle)).toBeInstanceOf(MaterializationRecord);
  });

  test("rejects run reentrancy from a carry-read rebaser without polluting the candidate", () => {
    const store = new KernelStore("computation-child-carry-rebase-reentrancy");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const family = childLocus("carry-rebase-reentrancy-family");
    const outputHandle = store.handles.address("carry-rebase-reentrancy:output");
    const readKey = "source:carry-rebase-reentrancy";
    revisions.set(readKey, "1");

    const initial = lifecycle.begin(locus("child-carry-rebase-reentrancy"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(revisions.observe(readKey));
      initial.publish(publication("carry-rebase-reentrancy:initial", [
        new SourceFileAddress(outputHandle, "test", "src/initial.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-rebase-reentrancy"));
    replacement.withChildPartition(() => {
      expect(() => replacement.tryCarryChild(family, () => {
        replacement.publish(publication("carry-rebase-reentrancy:illegal", [
          new SourceFileAddress(outputHandle, "test", "src/illegal.html", SourceLanguage.Html),
        ]));
        return null;
      })).toThrow(/cannot be used while a carry read is rebasing/);
      replacement.withChild(family, () => replacement.publish(publication(
        "carry-rebase-reentrancy:replacement",
        [new SourceFileAddress(outputHandle, "test", "src/recomputed.html", SourceLanguage.Html)],
      )));
    });

    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(outputHandle)).toEqual(expect.objectContaining({ path: "src/recomputed.html" }));
  });

  test("declines carry when another child already stages one of the prior outputs", () => {
    const store = new KernelStore("computation-child-carry-staged-owner");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const target = childLocus("carry-staged-owner-target");
    const sibling = childLocus("carry-staged-owner-sibling");
    const priorHandle = store.handles.address("carry-staged-owner:prior");
    const replacementHandle = store.handles.address("carry-staged-owner:replacement");

    const initial = lifecycle.begin(locus("child-carry-staged-owner"));
    initial.withChildPartition(() => initial.withChild(target, () => {
      initial.publish(publication("carry-staged-owner:initial", [
        new SourceFileAddress(priorHandle, "test", "src/prior.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-staged-owner"));
    replacement.withChildPartition(() => {
      replacement.withChild(sibling, () => replacement.publish(publication("carry-staged-owner:sibling", [
        new SourceFileAddress(priorHandle, "test", "src/prior.html", SourceLanguage.Html),
      ])));
      expect(replacement.tryCarryChild(target)).toBeNull();
      replacement.withChild(target, () => replacement.publish(publication("carry-staged-owner:target", [
        new SourceFileAddress(replacementHandle, "test", "src/recomputed.html", SourceLanguage.Html),
      ])));
    });

    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(priorHandle)).not.toBeNull();
    expect(store.read(replacementHandle)).not.toBeNull();
  });

  test("preflights carried read conflicts before staging any prior output", () => {
    const store = new KernelStore("computation-child-carry-read-conflict");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-read-conflict-family");
    const outputHandle = store.handles.address("carry-read-conflict:output");
    const readKey = "source:carry-read-conflict";
    const carriedRead: ComputationRead = {
      readKey,
      domain: "carried-input",
      observedRevision: "1",
      validate: () => ({ isCurrent: true, currentRevision: "1", changedFacets: [] }),
      tryRebaseCurrent: () => carriedRead,
    };
    const remainderRead: ComputationRead = {
      readKey,
      domain: "remainder-input",
      observedRevision: "1",
      validate: () => ({ isCurrent: true, currentRevision: "1", changedFacets: [] }),
      tryRebaseCurrent: () => remainderRead,
    };

    const initial = lifecycle.begin(locus("child-carry-read-conflict"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.observe(carriedRead);
      initial.publish(publication("carry-read-conflict:initial", [
        new SourceFileAddress(outputHandle, "test", "src/initial.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-read-conflict"));
    replacement.observe(remainderRead);
    replacement.withChildPartition(() => {
      expect(() => replacement.tryCarryChild(family)).toThrow(/conflicting revisions/);
      replacement.withChild(family, () => replacement.publish(publication("carry-read-conflict:replacement", [
        new SourceFileAddress(outputHandle, "test", "src/recomputed.html", SourceLanguage.Html),
      ])));
    });

    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(outputHandle)).toEqual(expect.objectContaining({ path: "src/recomputed.html" }));
  });

  test("carries a child that observes and owns materializations in the same owner set", () => {
    const store = new KernelStore("computation-child-carry-owned-membership");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-owned-membership-family");
    const ownerHandle = store.handles.address("carry-owned-membership:owner");
    const materializationHandle = store.handles.materialization("carry-owned-membership:row");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerHandle, "test", "src/owner.html", SourceLanguage.Html),
    ], "carry-owned-membership:owner"));

    const initial = lifecycle.begin(locus("child-carry-owned-membership"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      initial.publish(publication("carry-owned-membership:initial", [
        new MaterializationRecord(materializationHandle, ownerHandle),
      ]));
      expect(initial.readMaterializationsByOwner(ownerHandle).map((record) => record.handle))
        .toEqual([materializationHandle]);
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("child-carry-owned-membership"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).not.toBeNull();
    });
    const result = replacement.commit();

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: materializationHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
  });

  test("refuses carry when a previously absent candidate entry gains foreign occupancy", () => {
    const store = new KernelStore("computation-child-carry-negative-occupancy");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const family = childLocus("carry-negative-occupancy-family");
    const absentHandle = store.handles.address("carry-negative-occupancy:absent");
    const derivedHandle = store.handles.address("carry-negative-occupancy:derived");

    const seed = lifecycle.begin(locus("child-carry-negative-occupancy"));
    seed.publish(publication("carry-negative-occupancy:seed", [
      new SourceFileAddress(absentHandle, "test", "src/withdrawn.html", SourceLanguage.Html),
    ]));
    expect(seed.commit().state).toBe(ComputationCommitState.Committed);

    const initial = lifecycle.begin(locus("child-carry-negative-occupancy"));
    initial.withChildPartition(() => initial.withChild(family, () => {
      expect(initial.read(absentHandle)).toBeNull();
      initial.publish(publication("carry-negative-occupancy:derived", [
        new SourceFileAddress(derivedHandle, "test", "src/derived.html", SourceLanguage.Html),
      ]));
    }));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    store.commit(new KernelStoreBatch([
      new SourceFileAddress(absentHandle, "foreign", "src/foreign.html", SourceLanguage.Html),
    ], "carry-negative-occupancy:foreign"));
    const replacement = lifecycle.begin(locus("child-carry-negative-occupancy"));
    replacement.withChildPartition(() => {
      expect(replacement.tryCarryChild(family)).toBeNull();
    });
    replacement.abort();
  });

  test("commits an explicit empty remainder as the withdrawal boundary of a complete child partition", () => {
    const store = new KernelStore("explicit-computation-remainder");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const remainderHandle = store.handles.address("explicit-remainder:outer");
    const familyHandle = store.handles.address("explicit-remainder:family");
    const emptyChild = childLocus("empty");
    const family = childLocus("family");

    const initial = lifecycle.begin(locus("explicit-remainder"));
    initial.withChildPartition(() => {
      initial.publish(publication("explicit-remainder:outer", [
        new SourceFileAddress(remainderHandle, "test", "src/outer.html", SourceLanguage.Html),
      ]));
      initial.withChild(family, () => {
        initial.publish(publication("explicit-remainder:family", [
          new SourceFileAddress(familyHandle, "test", "src/family.html", SourceLanguage.Html),
        ]));
      });
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("explicit-remainder"));
    replacement.withChildPartition(() => {
      replacement.withChild(emptyChild, () => {});
      replacement.withChild(family, () => {
        replacement.publish(publication("explicit-remainder:family", [
          new SourceFileAddress(familyHandle, "test", "src/family.html", SourceLanguage.Html),
        ]));
      });
    });
    const result = replacement.commit();
    const state = lifecycle.readState(replacement.computationId);
    const remainder = state?.children.find((child) => child.role === ComputationChildRole.Remainder) ?? null;

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: remainderHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
    expect(remainder).not.toBeNull();
    expect(remainder?.outputs).toEqual([]);
    expect(remainder?.scc.kind).toBe(ComputationChildSccKind.Singleton);
    expect(state?.children.some((child) => child.locus.reconciliationKey === emptyChild.reconciliationKey)).toBe(false);
    expect(state?.children.filter((child) => child.role === ComputationChildRole.Declared)).toHaveLength(1);
    expect(lifecycle.childProducerFor(computationRecordReadKey(remainderHandle))).toBeNull();
    expect(lifecycle.childProducerFor(computationRecordReadKey(familyHandle))).not.toBeNull();
  });

  test("classifies exact candidate cycles before child topology becomes scheduler input", () => {
    const store = new KernelStore("computation-child-scc");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstHandle = store.handles.address("child-scc:first");
    const secondHandle = store.handles.address("child-scc:second");
    const firstLocus = childLocus("scc-first");
    const secondLocus = childLocus("scc-second");
    const run = lifecycle.begin(locus("child-scc"));

    run.withChildPartition(() => {
      run.withChild(firstLocus, () => {
        run.publish(publication("child-scc:first", [
          new SourceFileAddress(firstHandle, "test", "src/first.html", SourceLanguage.Html),
        ]));
      });
      run.withChild(secondLocus, () => {
        run.publish(publication("child-scc:second", [
          new SourceFileAddress(secondHandle, "test", "src/second.html", SourceLanguage.Html),
        ]));
      });
      run.withChild(firstLocus, () => expect(run.read(secondHandle)).not.toBeNull());
      run.withChild(secondLocus, () => expect(run.read(firstHandle)).not.toBeNull());
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const children = lifecycle.readState(run.computationId)?.children ?? [];
    const first = children.find((child) => child.locus.reconciliationKey === firstLocus.reconciliationKey) ?? null;
    const second = children.find((child) => child.locus.reconciliationKey === secondLocus.reconciliationKey) ?? null;
    const remainder = children.find((child) => child.role === ComputationChildRole.Remainder) ?? null;

    expect(first?.scc.kind).toBe(ComputationChildSccKind.Cyclic);
    expect(second?.scc).toBe(first?.scc);
    expect(first?.scc.memberChildIds).toEqual([first?.childId, second?.childId].sort());
    expect(remainder?.scc.kind).toBe(ComputationChildSccKind.Singleton);
    expect(remainder?.scc.memberChildIds).toEqual([remainder?.childId]);
  });

  test("rejects a child read when a later child replaces its staged producer", () => {
    const store = new KernelStore("computation-child-staged-read-replacement");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("child-staged-read:product");
    const provenanceHandle = store.handles.provenance("child-staged-read:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-staged-read",
      "Child-staged read replacement detail.",
    );
    const run = lifecycle.begin(locus("child-staged-read-replacement"));

    run.withChild(childLocus("first-writer"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "child-staged-read:first"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { owner: "first" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });
    run.withChild(childLocus("reader"), () => {
      expect(run.readProductDetail(productSlot, productHandle)).toEqual({ owner: "first" });
    });
    run.withChild(childLocus("final-writer"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-staged-read:final"),
        [publishProductDetail(productSlot, productHandle, { owner: "final" })],
      ));
    });

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toHaveLength(2);
    expect(result.transition.invalidReads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: "computation-child-staged-read",
        changedFacets: expect.arrayContaining(["writer", "detail"]),
      }),
      expect.objectContaining({
        domain: "computation-child-staged-read",
        changedFacets: expect.arrayContaining(["writer", "detail"]),
      }),
    ]));
    expect(store.read(productHandle)).toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toBeNull();
    expect(lifecycle.readState(run.computationId)).toBeNull();
  });

  test("rejects a committed absence consumed by one child and filled by another", () => {
    const store = new KernelStore("computation-child-negative-read");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("child-negative-read:address");
    const run = lifecycle.begin(locus("child-negative-read"));

    run.withChild(childLocus("reader"), () => {
      expect(run.read(handle)).toBeNull();
    });
    run.withChild(childLocus("writer"), () => {
      run.publish(publication("child-negative-read:writer", [
        new SourceFileAddress(handle, "test", "src/now-present.html", SourceLanguage.Html),
      ]));
    });

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toEqual([
      expect.objectContaining({
        readKey: computationRecordReadKey(handle),
        domain: "computation-child-external-read",
        changedFacets: ["candidate-writer"],
      }),
    ]);
    expect(store.read(handle)).toBeNull();
  });

  test("rejects a hidden prior-generation absence filled by a later child", () => {
    const store = new KernelStore("computation-child-hidden-prior-output");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("child-hidden-prior:product");
    const provenanceHandle = store.handles.provenance("child-hidden-prior:provenance");
    const hotHandle = store.handles.hotDetail("child-hidden-prior:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-hidden-prior-product",
      "Prior-generation product detail hidden from its replacement.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-hidden-prior-hot",
      "Prior-generation hot detail hidden from its replacement.",
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initial = lifecycle.begin(locus("child-hidden-prior"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        product(),
      ], "child-hidden-prior:initial"),
      [publishProductDetail(productSlot, productHandle, { version: 0 })],
      [publishHotDetail(hotSlot, productHandle, hotHandle, { version: 0 })],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const lifetimeBeforeReplacement = store.markLifetime();
    const observationBeforeReplacement = store.markObservation();

    const replacement = lifecycle.begin(locus("child-hidden-prior"));
    replacement.withChild(childLocus("reader"), () => {
      expect(replacement.read(productHandle)).toBeNull();
      expect(replacement.readProductDetail(productSlot, productHandle)).toBeNull();
      expect(replacement.readHotDetail(hotSlot, hotHandle)).toBeNull();
    });
    replacement.withChild(childLocus("writer"), () => {
      replacement.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          product(),
        ], "child-hidden-prior:replacement"),
        [publishProductDetail(productSlot, productHandle, { version: 1 })],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { version: 1 })],
      ));
    });

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads.map((read) => read.domain)).toEqual([
      "computation-child-staged-read",
      "computation-child-staged-read",
      "computation-child-staged-read",
    ]);
    expect(store.read(productHandle)).not.toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toEqual({ version: 0 });
    expect(store.hotDetails.read(hotSlot, hotHandle)).toEqual({ version: 0 });
    expect(store.markLifetime()).toEqual(lifetimeBeforeReplacement);
    expect(store.markObservation()).toEqual(observationBeforeReplacement);
  });

  test("preserves incumbent child indexes when a replacement fails child preflight", () => {
    const store = new KernelStore("computation-child-index-rejected-replacement");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("child-index-rejected:address");
    const initial = lifecycle.begin(locus("child-index-rejected"));
    initial.withChild(childLocus("incumbent"), () => {
      initial.publish(publication("child-index-rejected:initial", [
        new SourceFileAddress(handle, "test", "src/initial.html", SourceLanguage.Html),
      ]));
    });
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const incumbentState = lifecycle.readState(initial.computationId);
    const incumbent = incumbentState?.children.find(
      (child) => child.locus.reconciliationKey === "family:incumbent",
    );
    expect(incumbent).toBeDefined();
    if (incumbent == null) {
      throw new Error("Expected the incumbent child manifest.");
    }
    const readKey = computationRecordReadKey(handle);

    const replacement = lifecycle.begin(locus("child-index-rejected"));
    replacement.withChild(childLocus("reader"), () => {
      expect(replacement.read(handle)).toBeNull();
    });
    replacement.withChild(childLocus("replacement"), () => {
      replacement.publish(publication("child-index-rejected:replacement", [
        new SourceFileAddress(handle, "test", "src/replacement.html", SourceLanguage.Html),
      ]));
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);

    expect(lifecycle.readState(initial.computationId)).toBe(incumbentState);
    expect(lifecycle.childProducerFor(readKey)).toBe(incumbent.childId);
    expect(lifecycle.childReadersFor(readKey)).toEqual([]);
    expect(store.read(handle)).toEqual(
      new SourceFileAddress(handle, "test", "src/initial.html", SourceLanguage.Html),
    );
  });

  test("collapses a same-child read-before-write and clears child indexes on disposal", () => {
    const store = new KernelStore("computation-child-self-output");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const marker = store.markLifetime();
    const handle = store.handles.address("child-self-output:address");
    const run = lifecycle.begin(locus("child-self-output"));

    run.withChild(childLocus("self-writer"), () => {
      expect(run.read(handle)).toBeNull();
      run.publish(publication("child-self-output", [
        new SourceFileAddress(handle, "test", "src/self-output.html", SourceLanguage.Html),
      ]));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const child = state?.children.find((candidate) => candidate.locus.reconciliationKey === "family:self-writer");
    expect(child).toBeDefined();
    if (child == null) {
      throw new Error("Expected the self-writing child manifest.");
    }
    const readKey = computationRecordReadKey(handle);
    expect(child.reads).toEqual([]);
    expect(child.candidateReads).toEqual([]);
    expect(child.outputs.map((output) => output.readKey)).toEqual([readKey]);
    expect(lifecycle.childReadersFor(readKey)).toEqual([]);
    expect(lifecycle.childProducerFor(readKey)).toBe(child.childId);

    store.disposeSince(marker);
    expect(lifecycle.childProducerFor(readKey)).toBeNull();
    expect(lifecycle.childReadersFor(readKey)).toEqual([]);
  });

  test("attributes borrowed if-absent details to the child that attempted them", () => {
    const store = new KernelStore("computation-child-borrowed-details");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("child-borrowed:product");
    const provenanceHandle = store.handles.provenance("child-borrowed:provenance");
    const hotHandle = store.handles.hotDetail("child-borrowed:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-product",
      "Borrowed child product detail.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-hot",
      "Borrowed child hot detail.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "child-borrowed:foreign-product"));
    store.productDetails.add(productSlot, productHandle, { owner: "foreign" });
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { owner: "foreign" });
    const run = lifecycle.begin(locus("child-borrowed-details"));

    run.withChild(childLocus("borrower"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-borrowed:candidate"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
        [publishHotDetail(
          hotSlot,
          productHandle,
          hotHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });
    run.withChild(childLocus("second-borrower"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-borrowed:second-candidate"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { owner: "second-candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
        [publishHotDetail(
          hotSlot,
          productHandle,
          hotHandle,
          { owner: "second-candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const child = state?.children.find((candidate) => candidate.locus.reconciliationKey === "family:borrower");
    const secondChild = state?.children.find(
      (candidate) => candidate.locus.reconciliationKey === "family:second-borrower",
    );
    expect(child).toBeDefined();
    expect(secondChild).toBeDefined();
    if (child == null || secondChild == null) {
      throw new Error("Expected both borrowing child manifests.");
    }
    const productReadKey = computationProductDetailReadKey(productHandle);
    const hotReadKey = computationHotDetailReadKey(hotHandle);
    expect(child.reads.map((read) => read.readKey).sort()).toEqual([hotReadKey, productReadKey].sort());
    expect(secondChild.reads.map((read) => read.readKey).sort()).toEqual([hotReadKey, productReadKey].sort());
    expect(child.outputs).toEqual([]);
    expect(secondChild.outputs).toEqual([]);
    expect(lifecycle.childReadersFor(productReadKey)).toEqual([child.childId, secondChild.childId].sort());
    expect(lifecycle.childReadersFor(hotReadKey)).toEqual([child.childId, secondChild.childId].sort());
    expect(lifecycle.childProducerFor(productReadKey)).toBeNull();
    expect(lifecycle.childProducerFor(hotReadKey)).toBeNull();
  });

  test("keeps borrowed occupancy reads distinct from structural references to the same details", () => {
    const store = new KernelStore("computation-child-borrowed-structural-reference");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const targetProductHandle = store.handles.product("child-borrowed-structural:target");
    const targetProvenanceHandle = store.handles.provenance("child-borrowed-structural:target-provenance");
    const targetHotHandle = store.handles.hotDetail("child-borrowed-structural:target-hot");
    const sourceProductHandle = store.handles.product("child-borrowed-structural:source");
    const sourceProvenanceHandle = store.handles.provenance("child-borrowed-structural:source-provenance");
    const targetProductSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-structural-product",
      "Foreign product detail borrowed by one child and referenced by another.",
    );
    const targetHotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-structural-hot",
      "Foreign hot detail borrowed by one child and referenced by another.",
    );
    const sourceSlot = defineTestProductDetailSlot<{
      readonly productHandle: ProductHandle;
      readonly hotHandle: HotDetailHandle;
    }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-structural-source",
      "Source detail requiring both borrowed foreign occupancies.",
      (detail) => mergeKernelDetailReferences(
        [kernelProductDetailReference(targetProductSlot.descriptor, detail.productHandle)],
        [kernelHotDetailReference(targetHotSlot.descriptor, detail.hotHandle)],
      ),
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(targetProvenanceHandle),
      new MaterializedProduct(
        targetProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetProvenanceHandle,
      ),
    ], "child-borrowed-structural:foreign"));
    store.productDetails.add(targetProductSlot, targetProductHandle, { owner: "foreign" });
    store.hotDetails.add(targetHotSlot, targetProductHandle, targetHotHandle, { owner: "foreign" });

    const run = lifecycle.begin(locus("child-borrowed-structural-reference"));
    run.withChild(childLocus("borrower"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-borrowed-structural:borrower"),
        [publishProductDetail(
          targetProductSlot,
          targetProductHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
        [publishHotDetail(
          targetHotSlot,
          targetProductHandle,
          targetHotHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });
    run.withChild(childLocus("consumer"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(sourceProvenanceHandle),
          new MaterializedProduct(
            sourceProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            sourceProvenanceHandle,
          ),
        ], "child-borrowed-structural:consumer"),
        [publishProductDetail(sourceSlot, sourceProductHandle, {
          productHandle: targetProductHandle,
          hotHandle: targetHotHandle,
        })],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const borrower = state?.children.find((child) => child.locus.reconciliationKey === "family:borrower");
    const consumer = state?.children.find((child) => child.locus.reconciliationKey === "family:consumer");
    const productReadKey = computationProductDetailReadKey(targetProductHandle);
    const hotReadKey = computationHotDetailReadKey(targetHotHandle);
    const expectedReadKeys = [productReadKey, hotReadKey].sort();
    expect(borrower?.reads.map((read) => read.readKey).sort()).toEqual(expectedReadKeys);
    expect(borrower?.outputs).toEqual([]);
    expect(consumer?.reads).toEqual([]);
    expect(consumer?.candidateReads).toEqual([]);
    expect(consumer?.structuralDependencies.map((dependency) => dependency.readKey).sort()).toEqual(expectedReadKeys);
    expect(consumer?.structuralDependencies.every((dependency) => dependency.producerChildId == null)).toBe(true);
    expect(lifecycle.childProducerFor(productReadKey)).toBeNull();
    expect(lifecycle.childProducerFor(hotReadKey)).toBeNull();
  });

  test("retains an earlier exact detail read when a sibling later borrows the changed catalog entry", () => {
    const store = new KernelStore("computation-child-borrowed-stale-read");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("child-borrowed-stale:product");
    const provenanceHandle = store.handles.provenance("child-borrowed-stale:provenance");
    const hotHandle = store.handles.hotDetail("child-borrowed-stale:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-stale-product",
      "Product detail changed after an exact child read.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-stale-hot",
      "Hot detail changed after an exact child read.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "child-borrowed-stale:product"));
    store.productDetails.add(productSlot, productHandle, { version: 1 });
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { version: 1 });
    const run = lifecycle.begin(locus("child-borrowed-stale"));

    run.withChild(childLocus("early-reader"), () => {
      expect(run.readProductDetail(productSlot, productHandle)).toEqual({ version: 1 });
      expect(run.readHotDetail(hotSlot, hotHandle)).toEqual({ version: 1 });
    });
    store.productDetails.remove(productHandle);
    store.productDetails.add(productSlot, productHandle, { version: 2 });
    store.hotDetails.remove(hotHandle);
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { version: 2 });
    run.withChild(childLocus("late-borrower"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-borrowed-stale:candidate"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { version: 3 },
          KernelDetailAdmission.IfAbsent,
        )],
        [publishHotDetail(
          hotSlot,
          productHandle,
          hotHandle,
          { version: 3 },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads.map((read) => read.readKey).sort()).toEqual([
      computationProductDetailReadKey(productHandle),
      computationHotDetailReadKey(hotHandle),
    ].sort());
    expect(store.productDetails.read(productSlot, productHandle)).toEqual({ version: 2 });
    expect(store.hotDetails.read(hotSlot, hotHandle)).toEqual({ version: 2 });
  });

  test("rejects a borrowed admission read that collides with another read domain", () => {
    const store = new KernelStore("computation-borrowed-domain-conflict");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("borrowed-domain-conflict:product");
    const provenanceHandle = store.handles.provenance("borrowed-domain-conflict:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.borrowed-domain-conflict-product",
      "Borrowed detail read-key domain collision.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "borrowed-domain-conflict:product"));
    store.productDetails.add(productSlot, productHandle, { owner: "foreign" });
    const run = lifecycle.begin(locus("borrowed-domain-conflict"));
    run.withChild(childLocus("borrower"), () => {
      run.observe({
        readKey: computationProductDetailReadKey(productHandle),
        domain: "synthetic-collision",
        observedRevision: "synthetic",
        validate: () => ({ isCurrent: true, currentRevision: "synthetic", changedFacets: [] }),
      });
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "borrowed-domain-conflict:candidate"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });

    expect(() => run.commit()).toThrow(/conflicting domains/);
    expect(lifecycle.readState(run.computationId)).toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toEqual({ owner: "foreign" });
  });

  test("keeps mismatched-slot reads of borrowed details on the committed producer", () => {
    const store = new KernelStore("computation-child-borrowed-slot-mismatch");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("child-borrowed-slot:product");
    const provenanceHandle = store.handles.provenance("child-borrowed-slot:provenance");
    const hotHandle = store.handles.hotDetail("child-borrowed-slot:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-slot-product",
      "Borrowed product detail.",
    );
    const otherProductSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-slot-product-other",
      "Non-matching product detail lookup.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-slot-hot",
      "Borrowed hot detail.",
    );
    const otherHotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.child-borrowed-slot-hot-other",
      "Non-matching hot detail lookup.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "child-borrowed-slot:product"));
    store.productDetails.add(productSlot, productHandle, { owner: "foreign" });
    store.hotDetails.add(hotSlot, productHandle, hotHandle, { owner: "foreign" });
    const run = lifecycle.begin(locus("child-borrowed-slot"));

    run.withChild(childLocus("borrower"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "child-borrowed-slot:candidate"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
        [publishHotDetail(
          hotSlot,
          productHandle,
          hotHandle,
          { owner: "candidate" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });
    run.withChild(childLocus("reader"), () => {
      expect(run.readProductDetail(otherProductSlot, productHandle)).toBeNull();
      expect(run.readHotDetail(otherHotSlot, hotHandle)).toBeNull();
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const borrower = state?.children.find((child) => child.locus.reconciliationKey === "family:borrower");
    const reader = state?.children.find((child) => child.locus.reconciliationKey === "family:reader");
    expect(borrower).toBeDefined();
    expect(reader).toBeDefined();
    expect(borrower?.outputs).toEqual([]);
    expect(reader?.candidateReads).toEqual([]);
    expect(reader?.reads.map((read) => read.readKey).sort()).toEqual([
      computationProductDetailReadKey(productHandle),
      computationHotDetailReadKey(hotHandle),
    ].sort());
    expect(state?.children.flatMap((child) => child.candidateReads)).toEqual([]);
  });

  test("keeps remainder staged-read validation independent of unrelated child scopes", () => {
    const runCase = (includeUnrelatedChild: boolean): void => {
      const store = new KernelStore(`computation-remainder-staged-read:${includeUnrelatedChild}`);
      const lifecycle = new ComputationLifecycleRegistry(store);
      const productHandle = store.handles.product("remainder-staged-read:product");
      const provenanceHandle = store.handles.provenance("remainder-staged-read:provenance");
      const productSlot = defineTestProductDetailSlot<{ readonly version: number }>(
        KernelVocabulary.Template.Source.key,
        "test.remainder-staged-read-product",
        "Remainder-owned staged read.",
      );
      const run = lifecycle.begin(locus("remainder-staged-read"));
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "remainder-staged-read:if-absent"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { version: 1 },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
      expect(run.readProductDetail(productSlot, productHandle)).toEqual({ version: 1 });
      if (includeUnrelatedChild) {
        run.withChild(childLocus("unrelated"), () => {});
      }
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "remainder-staged-read:required"),
        [publishProductDetail(productSlot, productHandle, { version: 2 })],
      ));

      expect(run.commit().state).toBe(ComputationCommitState.Committed);
      expect(store.productDetails.read(productSlot, productHandle)).toEqual({ version: 2 });
    };

    runCase(false);
    runCase(true);
  });

  test("seals preparation before input validation can mutate the candidate", () => {
    const store = new KernelStore("computation-sealed-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("sealed-validation:address");
    const run = lifecycle.begin(locus("sealed-validation"));
    run.withChild(childLocus("original"), () => {
      run.publish(publication("sealed-validation:original", [
        new SourceFileAddress(handle, "test", "src/original.html", SourceLanguage.Html),
      ]));
    });
    run.observe({
      readKey: "test:sealed-validation",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        run.withChild(childLocus("late-writer"), () => {
          run.publish(publication("sealed-validation:late", [
            new SourceFileAddress(handle, "test", "src/late.html", SourceLanguage.Html),
          ]));
        });
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });

    expect(() => run.commit()).toThrow(/no longer preparing/);
    expect(store.read(handle)).toBeNull();
    expect(lifecycle.readState(run.computationId)).toBeNull();
    expect(lifecycle.childProducerFor(computationRecordReadKey(handle))).toBeNull();
  });

  test("keeps input validation inside the atomic publication barrier", () => {
    const store = new KernelStore("computation-input-validation-reentrancy");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const outputHandle = store.handles.address("input-validation:output");
    const intruderHandle = store.handles.address("input-validation:intruder");
    const lifetime = store.markLifetime();
    const observation = store.markObservation();
    const run = lifecycle.begin(locus("input-validation-reentrancy"));
    run.observe({
      readKey: "test:input-validation-reentrancy",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        store.commit(new KernelStoreBatch([
          new SourceFileAddress(intruderHandle, "test", "src/intruder.html", SourceLanguage.Html),
        ], "input-validation:intruder"));
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(publication("input-validation:output", [
      new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
    ]));

    expect(() => run.commit()).toThrow(/cannot commit a record batch during an atomic publication replacement/);
    expect(store.read(outputHandle)).toBeNull();
    expect(store.read(intruderHandle)).toBeNull();
    expect(lifecycle.readState(run.computationId)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("freezes structural records before input validation", () => {
    const store = new KernelStore("computation-sealed-records");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstFileHandle = store.handles.address("sealed-records:first-file");
    const secondFileHandle = store.handles.address("sealed-records:second-file");
    const spanHandle = store.handles.address("sealed-records:span");
    const span = new SourceSpanAddress(spanHandle, firstFileHandle, 0, 4);
    const run = lifecycle.begin(locus("sealed-records"));
    run.observe({
      readKey: "test:sealed-records",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        Object.defineProperty(span, "fileHandle", { value: secondFileHandle });
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(publication("sealed-records", [
      new SourceFileAddress(firstFileHandle, "test", "src/first.html", SourceLanguage.Html),
      new SourceFileAddress(secondFileHandle, "test", "src/second.html", SourceLanguage.Html),
      span,
    ]));

    expect(() => run.commit()).toThrow(/Cannot redefine property: fileHandle/);
    expect(store.read(firstFileHandle)).toBeNull();
    expect(store.read(secondFileHandle)).toBeNull();
    expect(store.read(spanHandle)).toBeNull();
  });

  test("freezes nested structural record collections before input validation", () => {
    const store = new KernelStore("computation-sealed-record-collections");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const templateHandle = store.handles.address("sealed-record-collections:template");
    const nodeHandle = store.handles.address("sealed-record-collections:node");
    const nodePath = [0];
    const run = lifecycle.begin(locus("sealed-record-collections"));
    run.observe({
      readKey: "test:sealed-record-collections",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        nodePath.push(1);
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(publication("sealed-record-collections", [
      new TemplateAddress(templateHandle, "sealed-record-collections"),
      new TemplateNodeAddress(nodeHandle, templateHandle, nodePath),
    ]));

    expect(() => run.commit()).toThrow(/object is not extensible/);
    expect(store.read(templateHandle)).toBeNull();
    expect(store.read(nodeHandle)).toBeNull();
  });

  test("seals staged record identity and structure before sibling reads", () => {
    const store = new KernelStore("computation-staged-record-sealing");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const fileHandle = store.handles.address("staged-record-sealing:file");
    const forgedFileHandle = store.handles.address("staged-record-sealing:forged-file");
    const templateHandle = store.handles.address("staged-record-sealing:template");
    const nodeHandle = store.handles.address("staged-record-sealing:node");
    const initial = lifecycle.begin(locus("staged-record-sealing"));
    initial.publish(publication("staged-record-sealing:initial", [
      new SourceFileAddress(fileHandle, "test", "src/initial.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const incumbent = store.read(fileHandle);
    const incumbentState = lifecycle.readState(initial.computationId);
    const lifetime = store.markLifetime();
    const observation = store.markObservation();
    const candidateFile = new SourceFileAddress(
      fileHandle,
      "test",
      "src/candidate.html",
      SourceLanguage.Html,
    );
    const nodePath = [0];
    const candidateNode = new TemplateNodeAddress(nodeHandle, templateHandle, nodePath);
    const replacement = lifecycle.begin(locus("staged-record-sealing"));
    replacement.withChild(childLocus("producer"), () => {
      replacement.publish(publication("staged-record-sealing:candidate", [
        candidateFile,
        new TemplateAddress(templateHandle, "staged-record-sealing"),
        candidateNode,
      ]));
    });

    expect(Object.isFrozen(candidateFile)).toBe(true);
    expect(Object.isFrozen(candidateNode)).toBe(true);
    expect(Object.isFrozen(nodePath)).toBe(true);
    expect(() => Object.defineProperty(candidateFile, "handle", { value: forgedFileHandle })).toThrow();
    expect(() => Object.defineProperty(candidateFile, "kind", { value: "generated-address" })).toThrow();
    expect(() => nodePath.push(1)).toThrow();
    replacement.withChild(childLocus("consumer"), () => {
      expect(replacement.read(fileHandle)).toBe(candidateFile);
      expect(replacement.read(nodeHandle)).toBe(candidateNode);
    });

    expect(store.read(fileHandle)).toBe(incumbent);
    expect(store.read(forgedFileHandle)).toBeNull();
    expect(lifecycle.readState(initial.computationId)).toBe(incumbentState);
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
    replacement.abort();
    expect(store.read(fileHandle)).toBe(incumbent);
    expect(store.read(forgedFileHandle)).toBeNull();
    expect(lifecycle.readState(initial.computationId)).toBe(incumbentState);
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("exposes normalized staged detail envelopes to sibling children", () => {
    const store = new KernelStore("computation-staged-detail-envelopes");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("staged-envelope:product");
    const provenanceHandle = store.handles.provenance("staged-envelope:provenance");
    const hotHandle = store.handles.hotDetail("staged-envelope:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.staged-envelope-product",
      "Staged product-detail envelope visibility.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.staged-envelope-hot",
      "Staged hot-detail entry visibility.",
    );
    const productDetail = { productHandle };
    const hotDetail = { handle: hotHandle };
    const run = lifecycle.begin(locus("staged-detail-envelopes"));
    run.withChild(childLocus("producer"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "staged-envelope:producer"),
        [publishProductDetail(productSlot, productHandle, productDetail)],
        [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
      ));
    });
    run.withChild(childLocus("consumer"), () => {
      const stagedProductDetail = run.readProductDetail(productSlot, productHandle);
      const stagedHotDetail = run.readHotDetail(hotSlot, hotHandle);
      expect(readProductDetailEnvelope(stagedProductDetail)?.handle).toBe(productHandle);
      expect(readHotDetailEntry(stagedHotDetail)?.ownerProductHandle).toBe(productHandle);
      expect(readHotDetailEntry(stagedHotDetail)?.handle).toBe(hotHandle);
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    expect(readProductDetailEnvelope(store.productDetails.read(productSlot, productHandle))?.handle).toBe(productHandle);
    expect(readHotDetailEntry(store.hotDetails.read(hotSlot, hotHandle))?.handle).toBe(hotHandle);
  });

  test("restores fresh staged detail bindings when a failed write poisons the computation", () => {
    const store = new KernelStore("computation-aborted-staged-detail-bindings");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("aborted-staged-bindings:product");
    const provenanceHandle = store.handles.provenance("aborted-staged-bindings:provenance");
    const hotHandle = store.handles.hotDetail("aborted-staged-bindings:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.aborted-staged-product-binding",
      "Aborted staged product-detail binding.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.aborted-staged-hot-binding",
      "Aborted staged hot-detail binding.",
    );
    const productDetail = { productHandle };
    const hotDetail = { handle: hotHandle };
    const productDescriptor = Object.getOwnPropertyDescriptor(productDetail, "productHandle");
    const hotDescriptor = Object.getOwnPropertyDescriptor(hotDetail, "handle");
    const run = lifecycle.begin(locus("aborted-staged-detail-bindings"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "aborted-staged-bindings"),
      [publishProductDetail(productSlot, productHandle, productDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
    ));

    expect(run.readProductDetail(productSlot, productHandle)).toBe(productDetail);
    expect(run.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
    expect(readProductDetailEnvelope(productDetail)?.handle).toBe(productHandle);
    expect(readHotDetailEntry(hotDetail)?.handle).toBe(hotHandle);

    const transientHandle = store.handles.address("aborted-staged-bindings:transient");
    expect(() => run.publish(publication("aborted-staged-bindings:failed-write", [
      new SourceFileAddress(transientHandle, "test", "src/transient-a.html", SourceLanguage.Html),
      new SourceFileAddress(transientHandle, "test", "src/transient-b.html", SourceLanguage.Html),
    ]))).toThrow(/duplicate kernel record/);
    expect(run.isCurrent()).toBe(false);
    expect(() => run.domainReadProjection.readProjectionRevision()).toThrow(/cannot continue after a failed write/);
    run.abort();

    expect(readProductDetailEnvelope(productDetail)).toBeNull();
    expect(readHotDetailEntry(hotDetail)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(productDetail, "productHandle")).toEqual(productDescriptor);
    expect(Object.getOwnPropertyDescriptor(hotDetail, "handle")).toEqual(hotDescriptor);
    expect(store.read(transientHandle)).toBeNull();
  });

  test("restores fresh staged detail bindings when input validation rejects a computation", () => {
    const store = new KernelStore("computation-rejected-staged-detail-bindings");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("rejected-staged-bindings:product");
    const provenanceHandle = store.handles.provenance("rejected-staged-bindings:provenance");
    const hotHandle = store.handles.hotDetail("rejected-staged-bindings:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rejected-staged-product-binding",
      "Rejected staged product-detail binding.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rejected-staged-hot-binding",
      "Rejected staged hot-detail binding.",
    );
    const productDetail = { productHandle };
    const hotDetail = { handle: hotHandle };
    const productDescriptor = Object.getOwnPropertyDescriptor(productDetail, "productHandle");
    const hotDescriptor = Object.getOwnPropertyDescriptor(hotDetail, "handle");
    const run = lifecycle.begin(locus("rejected-staged-detail-bindings"));
    run.observe({
      readKey: "test:rejected-staged-detail-bindings",
      domain: "test-input",
      observedRevision: "1",
      validate: () => ({ isCurrent: false, currentRevision: "2", changedFacets: ["revision"] }),
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "rejected-staged-bindings"),
      [publishProductDetail(productSlot, productHandle, productDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
    ));

    expect(run.readProductDetail(productSlot, productHandle)).toBe(productDetail);
    expect(run.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
    expect(run.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);

    expect(readProductDetailEnvelope(productDetail)).toBeNull();
    expect(readHotDetailEntry(hotDetail)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(productDetail, "productHandle")).toEqual(productDescriptor);
    expect(Object.getOwnPropertyDescriptor(hotDetail, "handle")).toEqual(hotDescriptor);
  });

  test("does not rebind a committed product detail to a rejected candidate envelope", () => {
    const store = new KernelStore("computation-rejected-product-detail-binding");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("rejected-binding:product");
    const provenanceHandle = store.handles.provenance("rejected-binding:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rejected-product-detail-binding",
      "Committed product-detail binding must survive rejected candidates.",
    );
    const detail = { productHandle };
    const originalProduct = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initial = lifecycle.begin(locus("rejected-product-detail-binding"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), originalProduct], "binding:initial"),
      [publishProductDetail(slot, productHandle, detail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const originalEnvelope = readProductDetailEnvelope(detail);

    const replacement = lifecycle.begin(locus("rejected-product-detail-binding"));
    replacement.observe({
      readKey: "test:rejected-product-detail-binding",
      domain: "test-input",
      observedRevision: "1",
      validate: () => ({ isCurrent: false, currentRevision: "2", changedFacets: ["revision"] }),
    });
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "binding:replacement"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(replacement.readProductDetail(slot, productHandle)).toBe(detail);
    expect(readProductDetailEnvelope(detail)).toBe(originalEnvelope);
    expect(replacement.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(store.read(productHandle)).toBe(originalProduct);
    expect(store.productDetails.read(slot, productHandle)).toBe(detail);
  });

  test("requires a fresh product detail before a sibling reads a changed candidate envelope", () => {
    const store = new KernelStore("computation-changed-product-detail-envelope");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("changed-product-envelope:product");
    const provenanceHandle = store.handles.provenance("changed-product-envelope:provenance");
    const initialAddressHandle = store.handles.address("changed-product-envelope:initial");
    const replacementAddressHandle = store.handles.address("changed-product-envelope:replacement");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.changed-product-detail-envelope",
      "Generation-local product-detail envelope witness.",
    );
    const committedDetail = { productHandle };
    const product = (addressHandle: AddressHandle) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const initialProduct = product(initialAddressHandle);
    const initial = lifecycle.begin(locus("changed-product-detail-envelope"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(initialAddressHandle, "test", "src/initial.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        initialProduct,
      ], "changed-product-envelope:initial"),
      [publishProductDetail(slot, productHandle, committedDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const rejected = lifecycle.begin(locus("changed-product-detail-envelope"));
    rejected.withChild(childLocus("producer"), () => {
      rejected.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
          new ProvenanceRecord(provenanceHandle),
          product(replacementAddressHandle),
        ], "changed-product-envelope:reused"),
        [publishProductDetail(slot, productHandle, committedDetail)],
      ));
    });
    expect(() => rejected.withChild(childLocus("consumer"), () => {
      rejected.readProductDetail(slot, productHandle);
    })).toThrow(/materialized-product envelope changed.*fresh detail object/);
    rejected.abort();
    expect(readProductDetailEnvelope(committedDetail)).toBe(initialProduct);

    const freshDetail = { productHandle };
    const freshProduct = product(replacementAddressHandle);
    const admitted = lifecycle.begin(locus("changed-product-detail-envelope"));
    admitted.withChild(childLocus("producer"), () => {
      admitted.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
          new ProvenanceRecord(provenanceHandle),
          freshProduct,
        ], "changed-product-envelope:fresh"),
        [publishProductDetail(slot, productHandle, freshDetail)],
      ));
    });
    admitted.withChild(childLocus("consumer"), () => {
      expect(admitted.readProductDetail(slot, productHandle)).toBe(freshDetail);
      expect(readProductDetailEnvelope(freshDetail)).toBe(freshProduct);
    });
    expect(admitted.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(slot, productHandle)).toBe(freshDetail);
  });

  test("does not rebind a committed hot detail to a rejected candidate owner", () => {
    const store = new KernelStore("computation-rejected-hot-detail-binding");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("rejected-hot-binding:product");
    const provenanceHandle = store.handles.provenance("rejected-hot-binding:provenance");
    const hotHandle = store.handles.hotDetail("rejected-hot-binding:detail");
    const slot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rejected-hot-detail-binding",
      "Committed hot-detail binding must survive rejected candidates.",
    );
    const detail = { handle: hotHandle };
    const originalProduct = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initial = lifecycle.begin(locus("rejected-hot-detail-binding"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), originalProduct], "hot-binding:initial"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, detail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const originalEntry = readHotDetailEntry(detail);

    const replacement = lifecycle.begin(locus("rejected-hot-detail-binding"));
    replacement.observe({
      readKey: "test:rejected-hot-detail-binding",
      domain: "test-input",
      observedRevision: "1",
      validate: () => ({ isCurrent: false, currentRevision: "2", changedFacets: ["revision"] }),
    });
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "hot-binding:replacement"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, detail)],
    ));

    expect(replacement.readHotDetail(slot, hotHandle)).toBe(detail);
    expect(readHotDetailEntry(detail)).toBe(originalEntry);
    expect(replacement.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(store.read(productHandle)).toBe(originalProduct);
    expect(store.hotDetails.read(slot, hotHandle)).toBe(detail);
  });

  test("requires a fresh hot detail before a sibling reads a changed candidate owner", () => {
    const store = new KernelStore("computation-changed-hot-detail-owner");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("changed-hot-owner:product");
    const provenanceHandle = store.handles.provenance("changed-hot-owner:provenance");
    const initialAddressHandle = store.handles.address("changed-hot-owner:initial");
    const replacementAddressHandle = store.handles.address("changed-hot-owner:replacement");
    const hotHandle = store.handles.hotDetail("changed-hot-owner:detail");
    const slot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.changed-hot-detail-owner",
      "Generation-local hot-detail owner witness.",
    );
    const committedDetail = { handle: hotHandle };
    const product = (addressHandle: AddressHandle) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const initialProduct = product(initialAddressHandle);
    const initial = lifecycle.begin(locus("changed-hot-detail-owner"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(initialAddressHandle, "test", "src/initial.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        initialProduct,
      ], "changed-hot-owner:initial"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, committedDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const rejected = lifecycle.begin(locus("changed-hot-detail-owner"));
    rejected.withChild(childLocus("producer"), () => {
      rejected.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
          new ProvenanceRecord(provenanceHandle),
          product(replacementAddressHandle),
        ], "changed-hot-owner:reused"),
        [],
        [publishHotDetail(slot, productHandle, hotHandle, committedDetail)],
      ));
    });
    expect(() => rejected.withChild(childLocus("consumer"), () => {
      rejected.readHotDetail(slot, hotHandle);
    })).toThrow(/owner product envelope changed.*fresh detail object/);
    rejected.abort();
    expect(readHotDetailEntry(committedDetail)?.owner).toBe(initialProduct);

    const freshDetail = { handle: hotHandle };
    const freshProduct = product(replacementAddressHandle);
    const admitted = lifecycle.begin(locus("changed-hot-detail-owner"));
    admitted.withChild(childLocus("producer"), () => {
      admitted.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
          new ProvenanceRecord(provenanceHandle),
          freshProduct,
        ], "changed-hot-owner:fresh"),
        [],
        [publishHotDetail(slot, productHandle, hotHandle, freshDetail)],
      ));
    });
    admitted.withChild(childLocus("consumer"), () => {
      expect(admitted.readHotDetail(slot, hotHandle)).toBe(freshDetail);
      expect(readHotDetailEntry(freshDetail)?.owner).toBe(freshProduct);
    });
    expect(admitted.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.hotDetails.read(slot, hotHandle)).toBe(freshDetail);
  });

  test("derives structural child dependencies from record references and detail envelopes", () => {
    const store = new KernelStore("computation-structural-child-reads");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const fileHandle = store.handles.address("structural-child:file");
    const spanHandle = store.handles.address("structural-child:span");
    const productHandle = store.handles.product("structural-child:product");
    const provenanceHandle = store.handles.provenance("structural-child:provenance");
    const hotHandle = store.handles.hotDetail("structural-child:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.structural-child-product",
      "Product detail with a structural envelope dependency.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.structural-child-hot",
      "Hot detail with a structural owner dependency.",
    );
    const run = lifecycle.begin(locus("structural-child-reads"));
    run.withChild(childLocus("envelopes"), () => {
      run.publish(publication("structural-child:envelopes", [
        new SourceFileAddress(fileHandle, "test", "src/structural.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ]));
    });
    run.withChild(childLocus("span"), () => {
      run.publish(publication("structural-child:span", [
        new SourceSpanAddress(spanHandle, fileHandle, 3, 7),
      ]));
    });
    run.withChild(childLocus("product-detail"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "structural-child:product-detail"),
        [publishProductDetail(productSlot, productHandle, { value: "product" })],
      ));
    });
    run.withChild(childLocus("hot-detail"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "structural-child:hot-detail"),
        [],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { value: "hot" })],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const envelopeOwner = state?.children.find((child) => child.locus.reconciliationKey === "family:envelopes");
    const span = state?.children.find((child) => child.locus.reconciliationKey === "family:span");
    const productDetailChild = state?.children.find(
      (child) => child.locus.reconciliationKey === "family:product-detail",
    );
    const hotDetailChild = state?.children.find((child) => child.locus.reconciliationKey === "family:hot-detail");
    expect(envelopeOwner).toBeDefined();
    expect(span?.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(fileHandle),
      producerChildId: envelopeOwner?.childId,
    }));
    expect(productDetailChild?.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(productHandle),
      producerChildId: envelopeOwner?.childId,
    }));
    expect(hotDetailChild?.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(productHandle),
      producerChildId: envelopeOwner?.childId,
    }));
  });

  test("retains foreign structural references without inventing semantic reads", () => {
    const store = new KernelStore("computation-foreign-structural-reads");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const fileHandle = store.handles.address("foreign-structural:file");
    const spanHandle = store.handles.address("foreign-structural:span");
    const productHandle = store.handles.product("foreign-structural:product");
    const provenanceHandle = store.handles.provenance("foreign-structural:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.foreign-structural-product",
      "Foreign product-envelope dependency.",
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(fileHandle, "test", "src/foreign.html", SourceLanguage.Html),
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "foreign-structural:upstream"));
    const run = lifecycle.begin(locus("foreign-structural-reads"));
    run.withChild(childLocus("consumer"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceSpanAddress(spanHandle, fileHandle, 2, 6),
        ], "foreign-structural:consumer"),
        [publishProductDetail(productSlot, productHandle, { value: "detail" })],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const child = state?.children.find((candidate) => candidate.locus.reconciliationKey === "family:consumer");
    const expectedReadKeys = [
      computationRecordReadKey(fileHandle),
      computationRecordReadKey(productHandle),
    ].sort();
    expect(state?.reads).toEqual([]);
    expect(child?.reads).toEqual([]);
    expect(child?.candidateReads).toEqual([]);
    expect(child?.structuralDependencies.map((dependency) => dependency.readKey).sort()).toEqual(expectedReadKeys);
  });

  test("projects rich-detail dependencies without treating target mutation as value consumption", () => {
    const store = new KernelStore("computation-rich-detail-structural-reads");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const linkedRecordHandle = store.handles.address("rich-detail-reads:linked-record");
    const targetProductHandle = store.handles.product("rich-detail-reads:target-product");
    const targetProvenanceHandle = store.handles.provenance("rich-detail-reads:target-provenance");
    const targetHotHandle = store.handles.hotDetail("rich-detail-reads:target-hot");
    const sourceProductHandle = store.handles.product("rich-detail-reads:source-product");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-reads:source-provenance");
    const targetProductSlot = defineTestProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-reads-target-product",
      "Product-detail dependency projected by another rich detail.",
    );
    const targetHotSlot = defineTestHotDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-reads-target-hot",
      "Hot-detail dependency projected by another rich detail.",
    );
    const sourceSlot = defineTestProductDetailSlot<{
      readonly recordHandle: AddressHandle;
      readonly productHandle: ProductHandle;
      readonly hotHandle: HotDetailHandle;
    }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-reads-source",
      "Rich detail with record, product-detail, and hot-detail dependencies.",
      (detail) => mergeKernelDetailReferences(
        kernelRecordReferences(detail.recordHandle),
        [kernelProductDetailReference(targetProductSlot.descriptor, detail.productHandle)],
        [kernelHotDetailReference(targetHotSlot.descriptor, detail.hotHandle)],
      ),
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(linkedRecordHandle, "test", "src/linked.html", SourceLanguage.Html),
      new ProvenanceRecord(targetProvenanceHandle),
      new MaterializedProduct(
        targetProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetProvenanceHandle,
      ),
    ], "rich-detail-reads:targets"));
    store.productDetails.add(targetProductSlot, targetProductHandle, { revision: 1 });
    store.hotDetails.add(targetHotSlot, targetProductHandle, targetHotHandle, { revision: 1 });

    const run = lifecycle.begin(locus("rich-detail-structural-reads"));
    run.withChild(childLocus("source"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(sourceProvenanceHandle),
          new MaterializedProduct(
            sourceProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            sourceProvenanceHandle,
          ),
        ], "rich-detail-reads:source"),
        [publishProductDetail(sourceSlot, sourceProductHandle, {
          recordHandle: linkedRecordHandle,
          productHandle: targetProductHandle,
          hotHandle: targetHotHandle,
        })],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const expectedReadKeys = [
      computationRecordReadKey(linkedRecordHandle),
      computationProductDetailReadKey(targetProductHandle),
      computationHotDetailReadKey(targetHotHandle),
    ].sort();
    expect(state?.reads).toEqual([]);
    expect(state?.children[0]?.reads).toEqual([]);
    expect(state?.children[0]?.structuralDependencies.map((dependency) => dependency.readKey).sort())
      .toEqual(expectedReadKeys);
    expect(lifecycle.readersFor(computationProductDetailReadKey(targetProductHandle))).toEqual([]);
    expect(lifecycle.readersFor(computationHotDetailReadKey(targetHotHandle))).toEqual([]);

    store.productDetails.remove(targetProductHandle);
    store.productDetails.add(targetProductSlot, targetProductHandle, { revision: 2 });
    expect(state?.children[0]?.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationProductDetailReadKey(targetProductHandle),
      requiredDetailKind: targetProductSlot.detailKind,
    }));
  });

  test("derives structural child edges on all three kernel surfaces", () => {
    const store = new KernelStore("computation-rich-detail-child-edges");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const linkedRecordHandle = store.handles.address("rich-detail-child:record");
    const targetProductHandle = store.handles.product("rich-detail-child:target");
    const targetProvenanceHandle = store.handles.provenance("rich-detail-child:target-provenance");
    const targetHotHandle = store.handles.hotDetail("rich-detail-child:hot");
    const sourceProductHandle = store.handles.product("rich-detail-child:source");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-child:source-provenance");
    const targetProductSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-child-target",
      "Candidate-local product-detail dependency.",
    );
    const targetHotSlot = defineTestHotDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-child-hot",
      "Candidate-local hot-detail dependency.",
    );
    const sourceSlot = defineTestProductDetailSlot<{
      readonly record: AddressHandle;
      readonly product: ProductHandle;
      readonly hot: HotDetailHandle;
    }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-child-source",
      "Candidate-local source with three-surface dependencies.",
      (detail) => mergeKernelDetailReferences(
        kernelRecordReferences(detail.record),
        [kernelProductDetailReference(targetProductSlot.descriptor, detail.product)],
        [kernelHotDetailReference(targetHotSlot.descriptor, detail.hot)],
      ),
    );
    const run = lifecycle.begin(locus("rich-detail-child-edges"));
    run.withChild(childLocus("target"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(linkedRecordHandle, "test", "src/child.html", SourceLanguage.Html),
          new ProvenanceRecord(targetProvenanceHandle),
          new MaterializedProduct(
            targetProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            targetProvenanceHandle,
          ),
        ], "rich-detail-child:target"),
        [publishProductDetail(targetProductSlot, targetProductHandle, { value: "product" })],
        [publishHotDetail(targetHotSlot, targetProductHandle, targetHotHandle, { value: "hot" })],
      ));
    });
    run.withChild(childLocus("source"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(sourceProvenanceHandle),
          new MaterializedProduct(
            sourceProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            sourceProvenanceHandle,
          ),
        ], "rich-detail-child:source"),
        [publishProductDetail(sourceSlot, sourceProductHandle, {
          record: linkedRecordHandle,
          product: targetProductHandle,
          hot: targetHotHandle,
        })],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const target = state?.children.find((child) => child.locus.reconciliationKey === "family:target");
    const source = state?.children.find((child) => child.locus.reconciliationKey === "family:source");
    expect(source?.structuralDependencies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        readKey: computationRecordReadKey(linkedRecordHandle),
        producerChildId: target?.childId,
      }),
      expect.objectContaining({
        readKey: computationProductDetailReadKey(targetProductHandle),
        producerChildId: target?.childId,
      }),
      expect.objectContaining({
        readKey: computationHotDetailReadKey(targetHotHandle),
        producerChildId: target?.childId,
      }),
    ]));
  });

  test("rejects rich-detail references whose target slot kind is unavailable", () => {
    const store = new KernelStore("computation-rich-detail-reference-kind");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const targetProductHandle = store.handles.product("rich-detail-kind:target");
    const targetProvenanceHandle = store.handles.provenance("rich-detail-kind:target-provenance");
    const sourceProductHandle = store.handles.product("rich-detail-kind:source");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-kind:source-provenance");
    const actualSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-kind-actual",
      "Actually occupied target slot.",
    );
    const expectedSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-kind-expected",
      "Incorrectly expected target slot.",
    );
    const sourceSlot = defineTestProductDetailSlot<{ readonly target: ProductHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-kind-source",
      "Source detail with a typed target occupancy.",
      (detail) => mergeKernelDetailReferences([
        kernelProductDetailReference(expectedSlot.descriptor, detail.target),
      ]),
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(targetProvenanceHandle),
      new MaterializedProduct(
        targetProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetProvenanceHandle,
      ),
    ], "rich-detail-kind:target"));
    store.productDetails.add(actualSlot, targetProductHandle, { value: "actual" });
    const run = lifecycle.begin(locus("rich-detail-reference-kind"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(sourceProvenanceHandle),
        new MaterializedProduct(
          sourceProductHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          sourceProvenanceHandle,
        ),
      ], "rich-detail-kind:source"),
      [publishProductDetail(sourceSlot, sourceProductHandle, { target: targetProductHandle })],
    ));

    expect(() => run.commit()).toThrow(/referencing unavailable product-detail/);
    expect(store.read(sourceProductHandle)).toBeNull();
  });

  test("blocks withdrawal while a foreign rich detail still references the target occupancy", () => {
    const store = new KernelStore("rich-detail-withdrawal-safety");
    const targetOwner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const targetProductHandle = store.handles.product("rich-detail-withdrawal:target");
    const targetProvenanceHandle = store.handles.provenance("rich-detail-withdrawal:target-provenance");
    const sourceProductHandle = store.handles.product("rich-detail-withdrawal:source");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-withdrawal:source-provenance");
    const targetSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-withdrawal-target",
      "Target occupancy protected from withdrawal.",
    );
    const replacementTargetSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-withdrawal-replacement",
      "Different target occupancy that cannot satisfy the surviving reference.",
    );
    const sourceSlot = defineTestProductDetailSlot<{ readonly target: ProductHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-withdrawal-source",
      "Foreign detail retaining a target occupancy.",
      (detail) => mergeKernelDetailReferences([kernelProductDetailReference(targetSlot.descriptor, detail.target)]),
    );
    const target = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(targetProvenanceHandle),
          new MaterializedProduct(
            targetProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            targetProvenanceHandle,
          ),
        ], "rich-detail-withdrawal:target"),
        [publishProductDetail(targetSlot, targetProductHandle, { value: "target" })],
      ),
      targetOwner,
      preflight,
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(sourceProvenanceHandle),
      new MaterializedProduct(
        sourceProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        sourceProvenanceHandle,
      ),
    ], "rich-detail-withdrawal:source"));
    store.productDetails.add(sourceSlot, sourceProductHandle, { target: targetProductHandle });

    expect(() => store.replaceOwnedPublication(
      target.manifest,
      new KernelPublicationPlan(new KernelStoreBatch([], "rich-detail-withdrawal:empty")),
      targetOwner,
      preflight,
    )).toThrow(/surviving product-detail .* still references it/);
    expect(store.productDetails.read(targetSlot, targetProductHandle)).not.toBeNull();

    expect(() => store.replaceOwnedPublication(
      target.manifest,
      new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(targetProvenanceHandle),
          new MaterializedProduct(
            targetProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            targetProvenanceHandle,
          ),
        ], "rich-detail-withdrawal:kind-change"),
        [publishProductDetail(
          replacementTargetSlot,
          targetProductHandle,
          { value: "replacement" },
        )],
      ),
      targetOwner,
      preflight,
    )).toThrow(/surviving product-detail .* still references it/);
    expect(store.productDetails.read(targetSlot, targetProductHandle)).not.toBeNull();
    expect(store.productDetails.read(replacementTargetSlot, targetProductHandle)).toBeNull();
  });

  test("retains the transitive three-surface closure of an active rich-detail publication", () => {
    const store = new KernelStore("rich-detail-selective-retention");
    const marker = store.markLifetime();
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const directRecordHandle = store.handles.address("rich-detail-retention:direct");
    const nestedProductRecordHandle = store.handles.address("rich-detail-retention:nested-product");
    const nestedHotRecordHandle = store.handles.address("rich-detail-retention:nested-hot");
    const unrelatedRecordHandle = store.handles.address("rich-detail-retention:unrelated");
    const targetProductHandle = store.handles.product("rich-detail-retention:target");
    const targetProvenanceHandle = store.handles.provenance("rich-detail-retention:target-provenance");
    const targetHotHandle = store.handles.hotDetail("rich-detail-retention:target-hot");
    const sourceProductHandle = store.handles.product("rich-detail-retention:source");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-retention:source-provenance");
    const targetSlot = defineTestProductDetailSlot<{ readonly nested: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-retention-target",
      "Target detail with its own record dependency.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(detail.nested)),
    );
    const targetHotSlot = defineTestHotDetailSlot<{ readonly nested: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-retention-hot",
      "Target hot detail with its own record dependency.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(detail.nested)),
    );
    const sourceSlot = defineTestProductDetailSlot<{
      readonly direct: AddressHandle;
      readonly product: ProductHandle;
      readonly hot: HotDetailHandle;
    }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-retention-source",
      "Active detail rooting a transitive three-surface closure.",
      (detail) => mergeKernelDetailReferences(
        kernelRecordReferences(detail.direct),
        [kernelProductDetailReference(targetSlot.descriptor, detail.product)],
        [kernelHotDetailReference(targetHotSlot.descriptor, detail.hot)],
      ),
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(directRecordHandle, "test", "src/direct.html", SourceLanguage.Html),
      new SourceFileAddress(nestedProductRecordHandle, "test", "src/nested-product.html", SourceLanguage.Html),
      new SourceFileAddress(nestedHotRecordHandle, "test", "src/nested-hot.html", SourceLanguage.Html),
      new SourceFileAddress(unrelatedRecordHandle, "test", "src/unrelated.html", SourceLanguage.Html),
      new ProvenanceRecord(targetProvenanceHandle),
      new MaterializedProduct(
        targetProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetProvenanceHandle,
      ),
    ], "rich-detail-retention:foreign"));
    store.productDetails.add(targetSlot, targetProductHandle, { nested: nestedProductRecordHandle });
    store.hotDetails.add(targetHotSlot, targetProductHandle, targetHotHandle, { nested: nestedHotRecordHandle });

    store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(sourceProvenanceHandle),
          new MaterializedProduct(
            sourceProductHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            sourceProvenanceHandle,
          ),
        ], "rich-detail-retention:source"),
        [publishProductDetail(sourceSlot, sourceProductHandle, {
          direct: directRecordHandle,
          product: targetProductHandle,
          hot: targetHotHandle,
        })],
      ),
      owner,
      preflight,
    );

    const disposal = store.disposeUnownedSince(marker);
    expect(disposal).toEqual(expect.objectContaining({ records: 1, productDetails: 0, hotDetails: 0 }));
    expect(store.read(unrelatedRecordHandle)).toBeNull();
    for (const handle of [
      directRecordHandle,
      nestedProductRecordHandle,
      nestedHotRecordHandle,
      targetProvenanceHandle,
      targetProductHandle,
      sourceProvenanceHandle,
      sourceProductHandle,
    ]) {
      expect(store.read(handle)).not.toBeNull();
    }
    expect(store.productDetails.read(targetSlot, targetProductHandle)).not.toBeNull();
    expect(store.hotDetails.read(targetHotSlot, targetHotHandle)).not.toBeNull();
  });

  test("requires slot comparators to classify changed dependency closure without retaining it", () => {
    const store = new KernelStore("rich-detail-reference-replacement");
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const targetA = store.handles.product("rich-detail-replacement:target-a");
    const targetB = store.handles.product("rich-detail-replacement:target-b");
    const targetAProvenance = store.handles.provenance("rich-detail-replacement:target-a");
    const targetBProvenance = store.handles.provenance("rich-detail-replacement:target-b");
    const sourceProductHandle = store.handles.product("rich-detail-replacement:source");
    const sourceProvenanceHandle = store.handles.provenance("rich-detail-replacement:source");
    const targetSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-replacement-target",
      "Available replacement target.",
    );
    let comparatorCalls = 0;
    const sourceSlot = defineTestProductDetailSlot<{ target: ProductHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.rich-detail-replacement-source",
      "Detail whose target closure determines replacement.",
      (detail) => mergeKernelDetailReferences([kernelProductDetailReference(targetSlot.descriptor, detail.target)]),
      (_previous, next) => {
        comparatorCalls += 1;
        return next.target === targetB
          ? KernelPublicationDecisionKind.Retain
          : KernelPublicationDecisionKind.RefreshWitness;
      },
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(targetAProvenance),
      new ProvenanceRecord(targetBProvenance),
      new MaterializedProduct(
        targetA,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetAProvenance,
      ),
      new MaterializedProduct(
        targetB,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        targetBProvenance,
      ),
    ], "rich-detail-replacement:targets"));
    store.productDetails.add(targetSlot, targetA, { value: "a" });
    store.productDetails.add(targetSlot, targetB, { value: "b" });
    const records = () => new KernelStoreBatch([
      new ProvenanceRecord(sourceProvenanceHandle),
      new MaterializedProduct(
        sourceProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        sourceProvenanceHandle,
      ),
    ], "rich-detail-replacement:source");
    const initialDetail = { target: targetA };
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(records(), [publishProductDetail(sourceSlot, sourceProductHandle, initialDetail)]),
      owner,
      preflight,
    );
    const replacementDetail = { target: targetB };
    const replacement = store.replaceOwnedPublication(
      initial.manifest,
      new KernelPublicationPlan(records(), [publishProductDetail(sourceSlot, sourceProductHandle, replacementDetail)]),
      owner,
      preflight,
    );

    expect(replacement.decisions).toContainEqual(expect.objectContaining({
      handle: sourceProductHandle,
      detailKind: sourceSlot.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.productDetails.read(sourceSlot, sourceProductHandle)).toBe(replacementDetail);
    expect(comparatorCalls).toBe(1);

    const witnessRefreshDetail = { target: targetA };
    const witnessRefresh = store.replaceOwnedPublication(
      replacement.manifest,
      new KernelPublicationPlan(records(), [
        publishProductDetail(sourceSlot, sourceProductHandle, witnessRefreshDetail),
      ]),
      owner,
      preflight,
    );
    expect(witnessRefresh.decisions).toContainEqual(expect.objectContaining({
      handle: sourceProductHandle,
      detailKind: sourceSlot.detailKind,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(store.productDetails.read(sourceSlot, sourceProductHandle)).toBe(witnessRefreshDetail);
    expect(comparatorCalls).toBe(2);

    const mutable = { target: targetA };
    const projected = publishProductDetail(sourceSlot, sourceProductHandle, mutable);
    mutable.target = targetB;
    expect(Object.isFrozen(projected.references)).toBe(true);
    expect(projected.references.map((reference) => reference.handle)).toEqual([targetA]);
  });

  test("retains coalesced if-absent attempts as candidate dependencies", () => {
    const store = new KernelStore("computation-coalesced-if-absent");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("coalesced-if-absent:product");
    const provenanceHandle = store.handles.provenance("coalesced-if-absent:provenance");
    const hotHandle = store.handles.hotDetail("coalesced-if-absent:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.coalesced-if-absent-product",
      "Coalesced product detail.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.coalesced-if-absent-hot",
      "Coalesced hot detail.",
    );
    const run = lifecycle.begin(locus("coalesced-if-absent"));
    run.withChild(childLocus("first"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "coalesced-if-absent:first"),
        [publishProductDetail(productSlot, productHandle, { owner: "first" }, KernelDetailAdmission.IfAbsent)],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { owner: "first" }, KernelDetailAdmission.IfAbsent)],
      ));
    });
    run.withChild(childLocus("second"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "coalesced-if-absent:second"),
        [publishProductDetail(productSlot, productHandle, { owner: "second" }, KernelDetailAdmission.IfAbsent)],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { owner: "second" }, KernelDetailAdmission.IfAbsent)],
      ));
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const first = state?.children.find((child) => child.locus.reconciliationKey === "family:first");
    const second = state?.children.find((child) => child.locus.reconciliationKey === "family:second");
    expect(second?.candidateReads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        readKey: computationProductDetailReadKey(productHandle),
        producerChildId: first?.childId,
      }),
      expect.objectContaining({
        readKey: computationHotDetailReadKey(hotHandle),
        producerChildId: first?.childId,
      }),
    ]));
  });

  test("rejects a candidate if a later required detail replaces an earlier if-absent occupancy", () => {
    const store = new KernelStore("computation-replaced-if-absent");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("replaced-if-absent:product");
    const provenanceHandle = store.handles.provenance("replaced-if-absent:provenance");
    const hotHandle = store.handles.hotDetail("replaced-if-absent:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.replaced-if-absent-product",
      "Conditionally admitted product detail replaced later in the same candidate.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.replaced-if-absent-hot",
      "Conditionally admitted hot detail replaced later in the same candidate.",
    );
    const run = lifecycle.begin(locus("replaced-if-absent"));
    run.withChild(childLocus("conditional"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "replaced-if-absent:conditional"),
        [publishProductDetail(productSlot, productHandle, { owner: "conditional" }, KernelDetailAdmission.IfAbsent)],
        [publishHotDetail(
          hotSlot,
          productHandle,
          hotHandle,
          { owner: "conditional" },
          KernelDetailAdmission.IfAbsent,
        )],
      ));
    });
    run.withChild(childLocus("required"), () => {
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([], "replaced-if-absent:required"),
        [publishProductDetail(productSlot, productHandle, { owner: "required" })],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { owner: "required" })],
      ));
    });

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads.map((read) => read.readKey).sort()).toEqual([
      computationProductDetailReadKey(productHandle),
      computationHotDetailReadKey(hotHandle),
    ].sort());
    expect(store.read(productHandle)).toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toBeNull();
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBeNull();
  });

  test("retains final candidate-local absence as an exact negative dependency", () => {
    const store = new KernelStore("computation-final-candidate-absence");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const withdrawnHandle = store.handles.address("candidate-absence:withdrawn");
    const derivedHandle = store.handles.address("candidate-absence:derived");
    const initial = lifecycle.begin(locus("final-candidate-absence"));
    initial.publish(publication("candidate-absence:initial", [
      new SourceFileAddress(withdrawnHandle, "test", "src/withdrawn.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("final-candidate-absence"));
    replacement.withChild(childLocus("absence-consumer"), () => {
      expect(replacement.read(withdrawnHandle)).toBeNull();
      expect(replacement.read(withdrawnHandle)).toBeNull();
      replacement.publish(publication("candidate-absence:replacement", [
        new SourceFileAddress(derivedHandle, "test", "src/derived.html", SourceLanguage.Html),
      ]));
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);

    const child = lifecycle.readState(replacement.computationId)?.children.find(
      (candidate) => candidate.locus.reconciliationKey === "family:absence-consumer",
    );
    expect(child?.candidateReads).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(withdrawnHandle),
      state: ComputationCandidateReadState.Absent,
      producerChildId: null,
    }));
    expect(lifecycle.childReadersFor(computationRecordReadKey(withdrawnHandle))).toEqual([child?.childId]);
  });

  test("retains honest blockers for child aggregate reads", () => {
    const store = new KernelStore("computation-child-open-reads");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus("child-open-reads"));

    run.withChild(childLocus("aggregate-reader"), () => {
      expect(run.readAllRecords()).toEqual([]);
      expect(run.readSourceFileAddressesByFileName("src/app.html")).toEqual([]);
      expect(run.readMaterializations()).toEqual([]);
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const child = lifecycle.readState(run.computationId)?.children.find(
      (candidate) => candidate.locus.reconciliationKey === "family:aggregate-reader",
    );
    expect(child?.hasOnlyRevisionedReads).toBe(false);
    expect(child?.openReads.map((read) => read.kind).sort()).toEqual([
      ComputationOpenReadKind.AllRecords,
      ComputationOpenReadKind.Materializations,
      ComputationOpenReadKind.SourceFileIndex,
    ].sort());
  });

  test("revisions materialization membership per owner without coupling unrelated owners", () => {
    const store = new KernelStore("computation-materialization-owner-membership");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const ownerA = store.handles.address("materialization-owner:a");
    const ownerB = store.handles.address("materialization-owner:b");
    const materializationA = store.handles.materialization("materialization-owner:a:first");
    const materializationB = store.handles.materialization("materialization-owner:b:first");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(ownerA, "test", "src/a.html", SourceLanguage.Html),
      new SourceFileAddress(ownerB, "test", "src/b.html", SourceLanguage.Html),
      new MaterializationRecord(materializationA, ownerA),
    ], "materialization-owner:baseline"));

    const run = lifecycle.begin(locus("materialization-owner-membership"));
    run.withChild(childLocus("owner-a"), () => {
      expect(run.readMaterializationsByOwner(ownerA).map((record) => record.handle)).toEqual([materializationA]);
    });
    store.commit(new KernelStoreBatch([
      new MaterializationRecord(materializationB, ownerB),
    ], "materialization-owner:unrelated"));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const child = lifecycle.readState(run.computationId)?.children.find(
      (candidate) => candidate.locus.reconciliationKey === "family:owner-a",
    );
    expect(child?.hasOnlyRevisionedReads).toBe(true);
    expect(child?.openReads).toEqual([]);
    expect(child?.reads.map((read) => read.readKey).sort()).toEqual([
      computationMaterializationOwnerReadKey(ownerA),
      computationRecordReadKey(materializationA),
    ].sort());
    expect(child?.reads.every((read) => read.validate().isCurrent)).toBe(true);
  });

  test("rejects a candidate when the materialization membership of its observed owner changes", () => {
    const store = new KernelStore("computation-materialization-owner-change");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const owner = store.handles.address("materialization-owner:changed");
    const first = store.handles.materialization("materialization-owner:changed:first");
    const second = store.handles.materialization("materialization-owner:changed:second");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(owner, "test", "src/changed.html", SourceLanguage.Html),
      new MaterializationRecord(first, owner),
    ], "materialization-owner:changed:baseline"));

    const run = lifecycle.begin(locus("materialization-owner-change"));
    run.withChild(childLocus("reader"), () => {
      expect(run.readMaterializationsByOwner(owner)).toHaveLength(1);
    });
    store.commit(new KernelStoreBatch([
      new MaterializationRecord(second, owner),
    ], "materialization-owner:changed:concurrent"));

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toContainEqual(expect.objectContaining({
      readKey: computationMaterializationOwnerReadKey(owner),
      changedFacets: ["membership"],
    }));
  });

  test("records staged owner membership as a child dependency and forbids later additions", () => {
    const store = new KernelStore("computation-materialization-owner-candidate");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const owner = store.handles.address("materialization-owner:candidate");
    const materialization = store.handles.materialization("materialization-owner:candidate:first");
    const run = lifecycle.begin(locus("materialization-owner-candidate"));
    run.withChildPartition(() => {
      run.withChild(childLocus("producer"), () => {
        run.publish(publication("materialization-owner:candidate:producer", [
          new SourceFileAddress(owner, "test", "src/candidate.html", SourceLanguage.Html),
          new MaterializationRecord(materialization, owner),
        ]));
      });
      run.withChild(childLocus("consumer"), () => {
        expect(run.readMaterializationsByOwner(owner).map((record) => record.handle)).toEqual([materialization]);
      });
    });

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const children = lifecycle.readState(run.computationId)?.children ?? [];
    const producer = children.find((child) => child.locus.reconciliationKey === "family:producer");
    const consumer = children.find((child) => child.locus.reconciliationKey === "family:consumer");
    expect(consumer?.candidateReads).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(materialization),
      producerChildId: producer?.childId,
    }));
    expect(consumer?.hasOnlyRevisionedReads).toBe(true);
    expect(consumer?.reads.every((read) => read.validate().isCurrent)).toBe(true);

    const lateOwner = store.handles.address("materialization-owner:late");
    const lateMaterialization = store.handles.materialization("materialization-owner:late:first");
    const lateRun = lifecycle.begin(locus("materialization-owner-late-write"));
    lateRun.withChild(childLocus("consumer"), () => {
      expect(lateRun.readMaterializationsByOwner(lateOwner)).toEqual([]);
    });
    expect(() => lateRun.withChild(childLocus("producer"), () => {
      lateRun.publish(publication("materialization-owner:late:producer", [
        new SourceFileAddress(lateOwner, "test", "src/late.html", SourceLanguage.Html),
        new MaterializationRecord(lateMaterialization, lateOwner),
      ]));
    })).toThrow(/after owner .* was observed/);
    lateRun.abort();
  });

  test("promotes aggregate-derived outputs to the youngest positive input lifetime", () => {
    const store = new KernelStore("computation-child-open-read-lifetime");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const outputHandle = store.handles.address("open-read-lifetime:output");
    const foreignHandle = store.handles.address("open-read-lifetime:foreign");
    const initial = lifecycle.begin(locus("open-read-lifetime"));
    initial.publish(publication("open-read-lifetime:initial", [
      new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const marker = store.markLifetime();
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(foreignHandle, "test", "src/foreign.html", SourceLanguage.Html),
    ], "open-read-lifetime:foreign"));

    const replacement = lifecycle.begin(locus("open-read-lifetime"));
    replacement.withChild(childLocus("aggregate"), () => {
      expect(replacement.readAllRecords().map((record) => record.handle)).toEqual([foreignHandle]);
      replacement.publish(publication("open-read-lifetime:replacement", [
        new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
      ]));
    });
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);

    store.disposeSince(marker);
    expect(store.read(foreignHandle)).toBeNull();
    expect(store.read(outputHandle)).toBeNull();
    expect(lifecycle.readState(replacement.computationId)).toBeNull();
  });

  test("rejects aggregate-derived output when a returned record changes before commit", () => {
    const store = new KernelStore("computation-aggregate-positive-row-race");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const inputHandle = store.handles.address("aggregate-positive-row-race:input");
    const outputHandle = store.handles.address("aggregate-positive-row-race:output");
    const initial = store.replacePublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(inputHandle, "test", "src/initial.html", SourceLanguage.Html),
      ], "aggregate-positive-row-race:initial")),
    );
    const run = lifecycle.begin(locus("aggregate-positive-row-race"));

    expect(run.readAllRecords()).toEqual([
      expect.objectContaining({ handle: inputHandle, path: "src/initial.html" }),
    ]);
    run.publish(publication("aggregate-positive-row-race:output", [
      new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
    ]));

    expect(store.replacePublication(
      initial.manifest,
      new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(inputHandle, "test", "src/replaced.html", SourceLanguage.Html),
      ], "aggregate-positive-row-race:replacement")),
    ).decisions).toContainEqual(expect.objectContaining({
      surface: "record",
      handle: inputHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));

    const result = run.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toContainEqual(expect.objectContaining({
      readKey: computationRecordReadKey(inputHandle),
    }));
    expect(store.read(outputHandle)).toBeNull();
  });

  test("does not allow a failed child scope to commit its partial candidate", () => {
    const store = new KernelStore("computation-child-failure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("child-failure:address");
    const run = lifecycle.begin(locus("child-failure"));

    expect(() => run.withChild(childLocus("failing"), () => {
      run.publish(publication("child-failure:partial", [
        new SourceFileAddress(handle, "test", "src/partial.html", SourceLanguage.Html),
      ]));
      throw new Error("child preparation failed");
    })).toThrow("child preparation failed");

    expect(() => run.commit()).toThrow(/failed child preparation/);
    expect(store.read(handle)).toBeNull();
    expect(lifecycle.readState(run.computationId)).toBeNull();
  });

  test("keeps commit and abort outside child callbacks and poisons child-establishment failures", () => {
    const store = new KernelStore("computation-child-scope-boundary");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("child-scope-boundary:address");
    const committing = lifecycle.begin(locus("child-scope-commit"));

    expect(() => committing.withChild(childLocus("committing"), () => {
      committing.publish(publication("child-scope-boundary:partial", [
        new SourceFileAddress(handle, "test", "src/partial.html", SourceLanguage.Html),
      ]));
      committing.commit();
    })).toThrow(/cannot commit inside an active child scope/);
    expect(() => committing.commit()).toThrow(/failed child preparation/);
    expect(store.read(handle)).toBeNull();

    const aborting = lifecycle.begin(locus("child-scope-abort"));
    expect(() => aborting.withChild(childLocus("aborting"), () => aborting.abort())).toThrow(
      /cannot abort inside an active child scope/,
    );
    aborting.abort();

    const conflicting = lifecycle.begin(locus("child-scope-conflict"));
    conflicting.withChild(childLocus("same-key"), () => {});
    expect(() => conflicting.withChild({
      ...childLocus("same-key"),
      summary: "conflicting summary",
    }, () => {})).toThrow(/conflicting summaries/);
    expect(() => conflicting.commit()).toThrow(/failed child preparation/);
  });

  test("rejects asynchronous child callbacks without leaking their continuation", async () => {
    const store = new KernelStore("computation-child-async-boundary");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const handle = store.handles.address("child-async-boundary:address");
    const run = lifecycle.begin(locus("child-async-boundary"));
    let continued = false;

    expect(() => run.withChild(childLocus("async"), async () => {
      await Promise.resolve();
      continued = true;
      run.publish(publication("child-async-boundary:late", [
        new SourceFileAddress(handle, "test", "src/late.html", SourceLanguage.Html),
      ]));
    })).toThrow(/must finish synchronously/);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(continued).toBe(true);
    expect(run.isCurrent()).toBe(false);
    expect(() => run.commit()).toThrow(/failed child preparation/);
    expect(store.read(handle)).toBeNull();
  });

  test("rejects a superseded borrowed if-absent run without importing its reads", () => {
    const store = new KernelStore("computation-superseded-borrowed-detail");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("superseded-borrowed-detail:product");
    const provenanceHandle = store.handles.provenance("superseded-borrowed-detail:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.superseded-borrowed-product-detail",
      "Borrowed detail staged by a superseded run.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "superseded-borrowed-detail:product"));
    store.productDetails.add(productSlot, productHandle, { owner: "foreign" });

    const stale = lifecycle.begin(locus("superseded-borrowed-detail"));
    stale.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "superseded-borrowed-detail:stale"),
      [publishProductDetail(
        productSlot,
        productHandle,
        { owner: "candidate" },
        KernelDetailAdmission.IfAbsent,
      )],
    ));
    const current = lifecycle.begin(locus("superseded-borrowed-detail"));

    expect(stale.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(lifecycle.readState(stale.computationId)).toBeNull();
    current.abort();
  });

  test("preflights producer ownership before mutating an admitted publication", () => {
    const store = new KernelStore("computation-producer-preflight");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("producer-preflight:product");
    const provenanceHandle = store.handles.provenance("producer-preflight:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.producer-preflight-product-detail",
      "Product detail used to verify producer preflight ordering.",
    );
    const owner = lifecycle.begin(locus("producer-preflight-owner"));
    owner.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "producer-preflight:owner"),
      [publishProductDetail(productSlot, productHandle, { owner: "first" })],
    ));
    expect(owner.commit().state).toBe(ComputationCommitState.Committed);
    const productDetailKey = computationProductDetailReadKey(productHandle);

    // Simulate a violated low-level catalog invariant while retaining the lifecycle's ownership proof.
    store.productDetails.remove(productHandle);
    const contender = lifecycle.begin(locus("producer-preflight-contender"));
    contender.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "producer-preflight:contender"),
      [publishProductDetail(productSlot, productHandle, { owner: "second" })],
    ));

    expect(() => contender.commit()).toThrow(/already owned by/);
    expect(store.productDetails.read(productSlot, productHandle)).toBeNull();
    expect(lifecycle.readState(contender.computationId)).toBeNull();
    expect(lifecycle.producerFor(productDetailKey)).toBe(owner.computationId);
  });

  test("rejects reentrant store and detail mutations throughout publication preflight", () => {
    const store = new KernelStore("publication-preflight-reentrancy");
    const owner = {};
    const firstHandle = store.handles.address("preflight-reentrancy:first");
    const secondHandle = store.handles.address("preflight-reentrancy:second");
    const intruderHandle = store.handles.address("preflight-reentrancy:intruder");
    const productHandle = store.handles.product("preflight-reentrancy:product");
    const hotHandle = store.handles.hotDetail("preflight-reentrancy:hot");
    const provenanceHandle = store.handles.provenance("preflight-reentrancy:provenance");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.preflight-reentrancy-product",
      "Product detail used to force direct catalog reentrancy.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.preflight-reentrancy-hot",
      "Hot detail used to force direct catalog reentrancy.",
    );
    const records = (suffix: string) => [
      new SourceFileAddress(firstHandle, "test", `src/first-${suffix}.html`, SourceLanguage.Html),
      new SourceFileAddress(secondHandle, "test", `src/second-${suffix}.html`, SourceLanguage.Html),
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ];
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      publication("preflight-reentrancy:initial", records("initial")),
      owner,
      {
        validate: (decisions) => {
          expect(Object.isFrozen(decisions)).toBe(true);
          expect(() => (decisions as unknown as unknown[]).splice(0)).toThrow();
        },
        validateCurrent(): void {},
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    );
    expect(initial.decisions).toHaveLength(4);
    const first = store.read(firstHandle);
    const second = store.read(secondHandle);
    const lifetime = store.markLifetime();
    const observation = store.markObservation();

    expect(() => store.replaceOwnedPublication(
      initial.manifest,
      publication("preflight-reentrancy:nested-store", records("replacement")),
      owner,
      {
        validate: () => store.commit(new KernelStoreBatch([
          new SourceFileAddress(intruderHandle, "test", "src/intruder.html", SourceLanguage.Html),
        ], "preflight-reentrancy:intruder")),
        validateCurrent(): void {},
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    )).toThrow(/cannot commit a record batch during an atomic publication replacement/);
    expect(store.read(firstHandle)).toBe(first);
    expect(store.read(secondHandle)).toBe(second);
    expect(store.read(intruderHandle)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);

    expect(() => store.replaceOwnedPublication(
      initial.manifest,
      publication("preflight-reentrancy:detail", records("replacement")),
      owner,
      {
        validate: () => {
          store.productDetails.add(productSlot, productHandle, { owner: "intruder" });
        },
        validateCurrent(): void {},
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    )).toThrow(/detail catalogs cannot mutate/);
    expect(store.read(firstHandle)).toBe(first);
    expect(store.read(secondHandle)).toBe(second);
    expect(store.productDetails.read(productSlot, productHandle)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);

    expect(() => store.replaceOwnedPublication(
      initial.manifest,
      publication("preflight-reentrancy:hot-detail", records("replacement")),
      owner,
      {
        validate: () => {
          store.hotDetails.add(hotSlot, productHandle, hotHandle, { owner: "intruder" });
        },
        validateCurrent(): void {},
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    )).toThrow(/detail catalogs cannot mutate/);
    expect(store.read(firstHandle)).toBe(first);
    expect(store.read(secondHandle)).toBe(second);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("keeps detail comparators inside the publication reentrancy barrier", () => {
    const store = new KernelStore("publication-comparator-reentrancy");
    const owner = {};
    const productHandle = store.handles.product("comparator-reentrancy:product");
    const provenanceHandle = store.handles.provenance("comparator-reentrancy:provenance");
    const intruderHandle = store.handles.address("comparator-reentrancy:intruder");
    const productSlot = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.comparator-reentrancy-product",
      "Product detail with a hostile comparison callback.",
      noKernelDetailReferences,
      () => {
        store.commit(new KernelStoreBatch([
          new SourceFileAddress(intruderHandle, "test", "src/intruder.html", SourceLanguage.Html),
        ], "comparator:intruder"));
        return KernelPublicationDecisionKind.Replace;
      },
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "comparator:initial"),
        [publishProductDetail(productSlot, productHandle, { version: 1 })],
      ),
      owner,
      { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness },
    );
    const originalProduct = store.read(productHandle);
    const originalDetail = store.productDetails.read(productSlot, productHandle);
    const lifetime = store.markLifetime();
    const observation = store.markObservation();

    expect(() => store.replaceOwnedPublication(
      initial.manifest,
      new KernelPublicationPlan(
        new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "comparator:replacement"),
        [publishProductDetail(
          productSlot,
          productHandle,
          { version: 2 },
          KernelDetailAdmission.Required,
        )],
      ),
      owner,
      { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness },
    )).toThrow(/cannot commit a record batch during an atomic publication replacement/);
    expect(store.read(productHandle)).toBe(originalProduct);
    expect(store.productDetails.read(productSlot, productHandle)).toBe(originalDetail);
    expect(store.read(intruderHandle)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("validates computation inputs after every detail comparator has finished", () => {
    const store = new KernelStore("computation-comparator-input-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const readKey = "source:comparator-input";
    revisions.set(readKey, "1");
    const productHandle = store.handles.product("comparator-input:product");
    const provenanceHandle = store.handles.provenance("comparator-input:provenance");
    const slot = defineTestProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.comparator-input-validation",
      "Detail comparator that invalidates a captured computation input.",
      noKernelDetailReferences,
      () => {
        revisions.set(readKey, "2");
        return KernelPublicationDecisionKind.Replace;
      },
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const initialDetail = { version: 1 };
    const initial = lifecycle.begin(locus("comparator-input-validation"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "comparator-input:initial"),
      [publishProductDetail(slot, productHandle, initialDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const replacement = lifecycle.begin(locus("comparator-input-validation"));
    replacement.observe(revisions.observe(readKey));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product()], "comparator-input:replacement"),
      [publishProductDetail(
        slot,
        productHandle,
        { version: 2 },
        KernelDetailAdmission.Required,
      )],
    ));

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.transition.invalidReads).toContainEqual(expect.objectContaining({
      readKey,
      observedRevision: "1",
      currentRevision: "2",
    }));
    expect(store.productDetails.read(slot, productHandle)).toBe(initialDetail);
  });

  test("retains an unrelated template publication while replacing another", () => {
    const store = new KernelStore("computation-unrelated-retention");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:a", "content:1");
    revisions.set("source:b", "content:1");

    const aHandle = store.handles.address("template:a");
    const bHandle = store.handles.address("template:b");
    const a0 = new SourceFileAddress(aHandle, "test", "src/a.html", SourceLanguage.Html);
    const b0 = new SourceFileAddress(bHandle, "test", "src/b.html", SourceLanguage.Html);

    const runA0 = lifecycle.begin(locus("a"));
    runA0.observe(revisions.observe("source:a"));
    runA0.publish(publication("a:0", [a0]));
    expect(runA0.commit().state).toBe(ComputationCommitState.Committed);

    const runB0 = lifecycle.begin(locus("b"));
    runB0.observe(revisions.observe("source:b"));
    runB0.publish(publication("b:0", [b0]));
    expect(runB0.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("source:a", "content:2");
    const a1 = new SourceFileAddress(aHandle, "test", "src/a-renamed.html", SourceLanguage.Html);
    const runA1 = lifecycle.begin(locus("a"));
    runA1.observe(revisions.observe("source:a"));
    runA1.publish(publication("a:1", [a1]));
    const result = runA1.commit();

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: aHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.read(aHandle)).toBe(a1);
    expect(store.read(bHandle)).toBe(b0);
  });

  test("replaces dynamic reads only after a successful publication", () => {
    const store = new KernelStore("computation-dynamic-reads");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("config:branch", "x");
    revisions.set("input:x", "1");
    revisions.set("input:y", "1");
    const outputHandle = store.handles.address("template:branch");

    const run0 = lifecycle.begin(locus("branch"));
    run0.observe(revisions.observe("config:branch"));
    run0.observe(revisions.observe("input:x"));
    run0.publish(publication("branch:x", [
      new SourceFileAddress(outputHandle, "test", "src/x.html", SourceLanguage.Html),
    ]));
    expect(run0.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("config:branch", "y");
    const run1 = lifecycle.begin(locus("branch"));
    run1.observe(revisions.observe("config:branch"));
    run1.observe(revisions.observe("input:y"));
    run1.publish(publication("branch:y", [
      new SourceFileAddress(outputHandle, "test", "src/y.html", SourceLanguage.Html),
    ]));
    const result = run1.commit();

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readState(run1.computationId)?.reads.map((read) => read.readKey).sort()).toEqual([
      "config:branch",
      "input:y",
    ]);
    expect(lifecycle.readersFor("input:x")).toEqual([]);
    expect(lifecycle.readersFor("input:y")).toEqual([run1.computationId]);
  });

  test("records positive and negative lookup transitions as one replaced read", () => {
    const store = new KernelStore("computation-lookup-transitions");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const lookupKey = "resource:element:item-card";
    const outputHandle = store.handles.address("template:lookup");

    const commit = (revision: string, path: string) => {
      revisions.set(lookupKey, revision);
      const run = lifecycle.begin(locus("lookup"));
      run.observe(revisions.observe(lookupKey, "template-resource-lookup"));
      run.publish(publication(revision, [
        new SourceFileAddress(outputHandle, "test", path, SourceLanguage.Html),
      ]));
      return run.commit();
    };

    const initial = commit("absence:closed:scope-1", "src/missing.html");
    expect(initial.state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readLatestTransition(initial.transition.computationId)).toBe(initial.transition);
    const present = commit("result:item-card:scope-2", "src/present.html");
    expect(present.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: lookupKey,
      previousRevision: "absence:closed:scope-1",
      nextRevision: "result:item-card:scope-2",
    }));
    const absent = commit("absence:closed:scope-3", "src/missing-again.html");
    expect(absent.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: lookupKey,
      previousRevision: "result:item-card:scope-2",
      nextRevision: "absence:closed:scope-3",
    }));
    expect(lifecycle.readLatestTransition(absent.transition.computationId)).toBe(absent.transition);
  });

  test("refreshes position witnesses without claiming a semantic replacement", () => {
    const store = new KernelStore("computation-witness-refresh");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:position", "content:1");
    const fileHandle = store.handles.address("source:file");
    const spanHandle = store.handles.address("source:span");

    const run0 = lifecycle.begin(locus("position"));
    run0.observe(revisions.observe("source:position"));
    run0.publish(publication("position:0", [
      new SourceFileAddress(fileHandle, "test", "src/app.html", SourceLanguage.Html),
      new SourceSpanAddress(spanHandle, fileHandle, 10, 14),
    ]));
    expect(run0.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("source:position", "content:2");
    const run1 = lifecycle.begin(locus("position"));
    run1.observe(revisions.observe("source:position"));
    run1.publish(publication("position:1", [
      new SourceFileAddress(fileHandle, "test", "src/app.html", SourceLanguage.Html),
      new SourceSpanAddress(spanHandle, fileHandle, 18, 22),
    ]));
    const result = run1.commit();

    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: fileHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: spanHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(store.readAddress(spanHandle)).toEqual(expect.objectContaining({ start: 18, end: 22 }));
  });

  test("rejects a stale run after a newer run commits", () => {
    const store = new KernelStore("computation-stale-run");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    const readKey = "source:race";
    const outputHandle = store.handles.address("template:race");
    revisions.set(readKey, "r1");

    const r1 = lifecycle.begin(locus("race"));
    r1.observe(revisions.observe(readKey));
    r1.publish(publication("race:r1", [
      new SourceFileAddress(outputHandle, "test", "src/r1.html", SourceLanguage.Html),
    ]));
    const outputReadKey = computationRecordReadKey(outputHandle);
    expect(lifecycle.producerFor(outputReadKey)).toBeNull();

    revisions.set(readKey, "r2");
    const r2 = lifecycle.begin(locus("race"));
    r2.observe(revisions.observe(readKey));
    const r2Output = new SourceFileAddress(outputHandle, "test", "src/r2.html", SourceLanguage.Html);
    r2.publish(publication("race:r2", [r2Output]));
    expect(r2.commit().state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.producerFor(outputReadKey)).toBe(r2.computationId);

    const stale = r1.commit();
    expect(stale.state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(outputHandle)).toBe(r2Output);
    expect(lifecycle.readState(r2.computationId)?.reads.map((read) => read.observedRevision)).toEqual(["r2"]);
    expect(lifecycle.producerFor(outputReadKey)).toBe(r2.computationId);
  });

  test("keeps currentness guards out of committed dependency state and rejects revoked admission", () => {
    const store = new KernelStore("computation-currentness-guard");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const guardKey = "project-input-generation:test";
    const outputHandle = store.handles.address("currentness-guard:output");
    const authority = new MutableGenerationAuthority();

    const initial = lifecycle.begin(locus("currentness-guard"));
    initial.guardCurrent(guardKey, authority);
    initial.publish(publication("currentness-guard:initial", [
      new SourceFileAddress(outputHandle, "test", "src/initial.html", SourceLanguage.Html),
    ]));
    const committed = initial.commit();
    expect(committed.state).toBe(ComputationCommitState.Committed);
    expect(committed.transition.invalidCurrentnessGuards).toEqual([]);
    expect(lifecycle.readState(initial.computationId)?.reads).toEqual([]);
    expect(lifecycle.readersFor(guardKey)).toEqual([]);

    const replacement = lifecycle.begin(locus("currentness-guard"));
    replacement.guardCurrent(guardKey, authority);
    replacement.publish(publication("currentness-guard:replacement", [
      new SourceFileAddress(outputHandle, "test", "src/replacement.html", SourceLanguage.Html),
    ]));
    authority.invalidate();
    const rejected = replacement.commit();

    expect(rejected.state).toBe(ComputationCommitState.RejectedCurrentnessChanged);
    expect(rejected.transition.invalidReads).toEqual([]);
    expect(rejected.transition.invalidCurrentnessGuards).toEqual([
      expect.objectContaining({ guardKey }),
    ]);
    expect(rejected.transition.publications).toEqual([]);
    expect(store.readAddress(outputHandle)).toEqual(expect.objectContaining({ path: "src/initial.html" }));
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
    expect(lifecycle.readersFor(guardKey)).toEqual([]);
  });

  test("rechecks currentness after exact input validators and rejects authority aliases", () => {
    const store = new KernelStore("computation-currentness-final-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const guardKey = "project-input-generation:test";
    const authority = new MutableGenerationAuthority();
    const outputHandle = store.handles.address("currentness-final-validation:output");
    const run = lifecycle.begin(locus("currentness-final-validation"));
    run.guardCurrent(guardKey, authority);
    run.guardCurrent(guardKey, authority);
    expect(() => run.guardCurrent(guardKey, new MutableGenerationAuthority())).toThrow(
      /more than one authority/,
    );
    run.observe({
      readKey: "input:revokes-currentness",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        authority.invalidate();
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(publication("currentness-final-validation", [
      new SourceFileAddress(outputHandle, "test", "src/candidate.html", SourceLanguage.Html),
    ]));

    const rejected = run.commit();
    expect(rejected.state).toBe(ComputationCommitState.RejectedCurrentnessChanged);
    expect(rejected.transition.invalidCurrentnessGuards).toEqual([
      expect.objectContaining({ guardKey }),
    ]);
    expect(store.read(outputHandle)).toBeNull();
  });

  test("rejects a run superseded from inside its final input validator", () => {
    const store = new KernelStore("computation-validator-supersession");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const outputHandle = store.handles.address("validator-supersession:output");
    const newerRuns: ComputationRun[] = [];
    const run = lifecycle.begin(locus("validator-supersession"));
    run.observe({
      readKey: "test:validator-supersession",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        newerRuns.push(lifecycle.begin(locus("validator-supersession")));
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(publication("validator-supersession", [
      new SourceFileAddress(outputHandle, "test", "src/superseded.html", SourceLanguage.Html),
    ]));

    expect(run.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(outputHandle)).toBeNull();
    expect(lifecycle.readState(run.computationId)).toBeNull();
    expect(newerRuns).toHaveLength(1);
    newerRuns[0]!.abort();
  });

  test("snapshots read metadata before admission and seals committed lifecycle state", () => {
    const store = new KernelStore("computation-read-metadata-snapshot");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const outputHandle = store.handles.address("read-metadata-snapshot:output");
    let metadataReadable = true;
    const read: ComputationRead = {
      get readKey() {
        if (!metadataReadable) {
          throw new Error("readKey escaped the preparation boundary");
        }
        return "test:read-metadata-snapshot";
      },
      get domain() {
        if (!metadataReadable) {
          throw new Error("domain escaped the preparation boundary");
        }
        return "test-input";
      },
      get observedRevision() {
        if (!metadataReadable) {
          throw new Error("revision escaped the preparation boundary");
        }
        return "1";
      },
      validate: () => {
        metadataReadable = false;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    };
    const mutableLocus = {
      kind: "test",
      reconciliationKey: "read-metadata-snapshot",
      summary: "Test computation for read-metadata-snapshot.",
      domainPayload: "caller-owned",
    };
    const run = lifecycle.begin(mutableLocus);
    mutableLocus.kind = "mutated";
    mutableLocus.reconciliationKey = "mutated";
    mutableLocus.summary = "mutated";
    run.observe(read);
    run.publish(publication("read-metadata-snapshot", [
      new SourceFileAddress(outputHandle, "test", "src/metadata.html", SourceLanguage.Html),
    ]));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    expect(state).not.toBeNull();
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state?.reads)).toBe(true);
    expect(Object.isFrozen(state?.outputs)).toBe(true);
    expect(Object.isFrozen(state?.children)).toBe(true);
    expect(state?.locus).toEqual({
      kind: "test",
      reconciliationKey: "read-metadata-snapshot",
      summary: "Test computation for read-metadata-snapshot.",
    });
    expect(Object.isFrozen(state?.locus)).toBe(true);
    expect("domainPayload" in (state?.locus ?? {})).toBe(false);
    expect(() => (state?.outputs as unknown as unknown[]).pop()).toThrow();
    expect(store.read(outputHandle)).not.toBeNull();
  });

  test("keeps the same definition distinct in two compiler cohorts", () => {
    const store = new KernelStore("computation-cohorts");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("scope:root-a", "1");
    revisions.set("scope:root-b", "1");

    const rootA = lifecycle.begin(locus("shared-card", "app-root:a"));
    rootA.observe(revisions.observe("scope:root-a"));
    const aHandle = store.handles.address("shared-card:root-a");
    rootA.publish(publication("shared-card:a", [
      new SourceFileAddress(aHandle, "test", "src/shared-card.html", SourceLanguage.Html),
    ]));
    expect(rootA.commit().state).toBe(ComputationCommitState.Committed);

    const rootB = lifecycle.begin(locus("shared-card", "app-root:b"));
    rootB.observe(revisions.observe("scope:root-b"));
    const bHandle = store.handles.address("shared-card:root-b");
    rootB.publish(publication("shared-card:b", [
      new SourceFileAddress(bHandle, "test", "src/shared-card.html", SourceLanguage.Html),
    ]));
    expect(rootB.commit().state).toBe(ComputationCommitState.Committed);

    expect(rootA.computationId).not.toBe(rootB.computationId);
    expect(store.read(aHandle)).not.toBeNull();
    expect(store.read(bHandle)).not.toBeNull();
  });

  test("withdraws outputs that disappear from the replacement manifest", () => {
    const store = new KernelStore("computation-withdrawal");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:withdraw", "1");
    const retainedHandle = store.handles.address("retained");
    const withdrawnHandle = store.handles.address("withdrawn");

    const run0 = lifecycle.begin(locus("withdraw"));
    run0.observe(revisions.observe("source:withdraw"));
    run0.publish(publication("withdraw:0", [
      new SourceFileAddress(retainedHandle, "test", "src/retained.html", SourceLanguage.Html),
      new SourceFileAddress(withdrawnHandle, "test", "src/withdrawn.html", SourceLanguage.Html),
    ]));
    expect(run0.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("source:withdraw", "2");
    const run1 = lifecycle.begin(locus("withdraw"));
    run1.observe(revisions.observe("source:withdraw"));
    run1.publish(publication("withdraw:1", [
      new SourceFileAddress(retainedHandle, "test", "src/retained.html", SourceLanguage.Html),
    ]));
    const result = run1.commit();

    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: withdrawnHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
    expect(store.read(withdrawnHandle)).toBeNull();
  });

  test("does not allocate a lifetime for an immediate publication that owns nothing", () => {
    const store = new KernelStore("immediate-empty-publication");
    const lifetime = store.markLifetime();
    const observation = store.markObservation();

    store.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "immediate-publication:empty"),
    ));

    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("publishes immediate records and details as one atomic unit", () => {
    const store = new KernelStore("immediate-publication-atomicity");
    const sourceHandle = store.handles.address("immediate-publication:source");
    const missingProductHandle = store.handles.product("immediate-publication:missing-product");
    const slot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.immediate-publication-atomicity",
      "Immediate publication detail used to force preflight failure.",
    );
    const lifetime = store.markLifetime();
    const observation = store.markObservation();

    expect(() => store.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/immediate.html", SourceLanguage.Html),
      ], "immediate-publication:invalid"),
      [publishProductDetail(slot, missingProductHandle, { value: "unowned" })],
    ))).toThrow(/product .* is absent from the post-state/);

    expect(store.read(sourceHandle)).toBeNull();
    expect(store.productDetails.read(slot, missingProductHandle)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
  });

  test("replaces record and detail products atomically and preserves the last complete state on failure", () => {
    const store = new KernelStore("computation-atomic-publication");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:atomic", "1");

    const sourceHandle = store.handles.address("source:atomic");
    const productHandle = store.handles.product("product:atomic");
    const hotHandle = store.handles.hotDetail("hot:atomic");
    const provenanceHandle = store.handles.provenance("product:atomic");
    const detailSlot = defineTestProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.atomic-product",
      "Computation publication product-detail transaction witness.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.atomic-hot",
      "Computation publication hot-detail transaction witness.",
    );
    const materializedProduct = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );

    const run0 = lifecycle.begin(locus("atomic"));
    run0.observe(revisions.observe("source:atomic"));
    const publicationMarker = run0.markObservation();
    const product0 = { revision: 0 };
    const hot0 = { revision: 0 };
    run0.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/r0.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        materializedProduct,
      ], "atomic:0"),
      [publishProductDetail(detailSlot, productHandle, product0)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hot0)],
    ));
    expect(run0.readProductDetail(detailSlot, productHandle)).toBe(product0);
    expect(run0.readHotDetail(hotSlot, hotHandle)).toBe(hot0);
    expect(run0.readKernelCountSnapshot()).toEqual(expect.objectContaining({
      totalRecords: 3,
      productDetails: 1,
      hotDetails: 1,
    }));
    expect(run0.readDetailDensitySince(publicationMarker)).toEqual(expect.objectContaining({
      productDetailDensity: [expect.objectContaining({ detailKind: "test.atomic-product", count: 1 })],
      hotDetailDensity: [expect.objectContaining({ detailKind: "test.atomic-hot", count: 1 })],
    }));
    expect(store.productDetails.read(detailSlot, productHandle)).toBeNull();
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBeNull();
    expect(run0.commit().state).toBe(ComputationCommitState.Committed);

    revisions.set("source:atomic", "2");
    const run1 = lifecycle.begin(locus("atomic"));
    run1.observe(revisions.observe("source:atomic"));
    const product1 = { revision: 1 };
    const hot1 = { revision: 1 };
    run1.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/r1.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        materializedProduct,
      ], "atomic:1"),
      [publishProductDetail(detailSlot, productHandle, product1)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hot1)],
    ));
    expect(run1.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hot1);

    revisions.set("source:atomic", "3");
    const run2 = lifecycle.begin(locus("atomic"));
    run2.observe(revisions.observe("source:atomic"));
    const missingProductHandle = store.handles.product("product:missing");
    run2.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/r2.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        materializedProduct,
      ], "atomic:invalid"),
      [
        publishProductDetail(detailSlot, productHandle, { revision: 2 }),
        publishProductDetail(detailSlot, missingProductHandle, { revision: 2 }),
      ],
      [publishHotDetail(hotSlot, productHandle, hotHandle, { revision: 2 })],
    ));

    expect(() => run2.commit()).toThrow(/test\.atomic-product.*absent from the post-state/);
    expect(store.readAddress(sourceHandle)).toEqual(expect.objectContaining({ path: "src/r1.html" }));
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hot1);
    expect(lifecycle.readState(run1.computationId)?.committedRunSequence).toBe(run1.runSequence);

    revisions.set("source:atomic", "4");
    const run3 = lifecycle.begin(locus("atomic"));
    run3.observe(revisions.observe("source:atomic"));
    const unbindableDetail = { revision: 3 } as { readonly revision: number; readonly productHandle?: string };
    Object.defineProperty(unbindableDetail, "productHandle", {
      configurable: false,
      enumerable: true,
      value: productHandle,
    });
    run3.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/r3.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        materializedProduct,
      ], "atomic:unbindable-detail"),
      [publishProductDetail(detailSlot, productHandle, unbindableDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, { revision: 3 })],
    ));

    expect(() => run3.commit()).toThrow();
    expect(store.readAddress(sourceHandle)).toEqual(expect.objectContaining({ path: "src/r1.html" }));
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hot1);
    expect(lifecycle.readState(run1.computationId)?.committedRunSequence).toBe(run1.runSequence);
  });

  test("replaces republished rich details when the same mutable object no longer preserves its prior value", () => {
    const store = new KernelStore("same-instance-detail-republication");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("same-instance:product");
    const hotHandle = store.handles.hotDetail("same-instance:hot");
    const provenanceHandle = store.handles.provenance("same-instance:product");
    let productComparatorCalls = 0;
    let hotComparatorCalls = 0;
    const productSlot = defineTestProductDetailSlot<{ revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.same-instance-product",
      "Mutable product detail used to reject identity-based retention.",
      noKernelDetailReferences,
      () => {
        productComparatorCalls += 1;
        return KernelPublicationDecisionKind.Retain;
      },
    );
    const hotSlot = defineTestHotDetailSlot<{ revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.same-instance-hot",
      "Mutable hot detail used to reject identity-based retention.",
      noKernelDetailReferences,
      () => {
        hotComparatorCalls += 1;
        return KernelPublicationDecisionKind.Retain;
      },
    );
    const product = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const productDetail = { revision: 1 };
    const hotDetail = { revision: 1 };

    const initial = lifecycle.begin(locus("same-instance-producer"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product], "same-instance:initial"),
      [publishProductDetail(productSlot, productHandle, productDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const dependent = lifecycle.begin(locus("same-instance-dependent"));
    expect(dependent.readProductDetail(productSlot, productHandle)).toBe(productDetail);
    expect(dependent.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);

    productDetail.revision = 2;
    hotDetail.revision = 2;
    const replacement = lifecycle.begin(locus("same-instance-producer"));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([new ProvenanceRecord(provenanceHandle), product], "same-instance:replacement"),
      [publishProductDetail(productSlot, productHandle, productDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
    ));
    const replacementResult = replacement.commit();

    expect(replacementResult.state).toBe(ComputationCommitState.Committed);
    expect(replacementResult.transition.publications).toContainEqual(expect.objectContaining({
      handle: productHandle,
      detailKind: productSlot.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(replacementResult.transition.publications).toContainEqual(expect.objectContaining({
      handle: hotHandle,
      detailKind: hotSlot.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.productDetails.read(productSlot, productHandle)).toBe(productDetail);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hotDetail);
    expect(productComparatorCalls).toBe(0);
    expect(hotComparatorCalls).toBe(0);

    const dependentResult = dependent.commit();
    expect(dependentResult.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(dependentResult.transition.invalidReads.map((read) => read.readKey)).toEqual(expect.arrayContaining([
      computationProductDetailReadKey(productHandle),
      computationHotDetailReadKey(hotHandle),
    ]));
  });

  test("does not let a distinct same-kind slot substitute comparison policy", () => {
    const store = new KernelStore("detail-slot-comparison-authority");
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const productHandle = store.handles.product("slot-authority:product");
    const hotHandle = store.handles.hotDetail("slot-authority:hot");
    const provenanceHandle = store.handles.provenance("slot-authority:product");
    const initialProductSlot = defineTestProductDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.slot-authority-product",
      "Initial product-detail comparison authority.",
    );
    const replacementProductSlot = defineTestProductDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.slot-authority-product",
      "Substitute product-detail comparison authority.",
      noKernelDetailReferences,
      () => KernelPublicationDecisionKind.Retain,
    );
    const initialHotSlot = defineTestHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.slot-authority-hot",
      "Initial hot-detail comparison authority.",
    );
    const replacementHotSlot = defineTestHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.slot-authority-hot",
      "Substitute hot-detail comparison authority.",
      noKernelDetailReferences,
      () => KernelPublicationDecisionKind.Retain,
    );
    const records = () => new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "slot-authority");
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        records(),
        [publishProductDetail(initialProductSlot, productHandle, { value: 1 })],
        [publishHotDetail(initialHotSlot, productHandle, hotHandle, { value: 1 })],
      ),
      owner,
      preflight,
    );
    const replacementProduct = { value: 2 };
    const replacementHot = { value: 2 };
    const replacement = store.replaceOwnedPublication(
      initial.manifest,
      new KernelPublicationPlan(
        records(),
        [publishProductDetail(replacementProductSlot, productHandle, replacementProduct)],
        [publishHotDetail(replacementHotSlot, productHandle, hotHandle, replacementHot)],
      ),
      owner,
      preflight,
    );

    expect(replacement.decisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ handle: productHandle, decision: KernelPublicationDecisionKind.Replace }),
      expect.objectContaining({ handle: hotHandle, decision: KernelPublicationDecisionKind.Replace }),
    ]));
    expect(store.productDetails.read(initialProductSlot, productHandle)).toBeNull();
    expect(store.hotDetails.read(initialHotSlot, hotHandle)).toBeNull();
    expect(store.productDetails.read(replacementProductSlot, productHandle)).toBe(replacementProduct);
    expect(store.hotDetails.read(replacementHotSlot, hotHandle)).toBe(replacementHot);
  });

  test("retains identical primitive rich details without requiring a comparator", () => {
    const store = new KernelStore("primitive-detail-retention");
    const owner = {};
    const preflight = { validate(): void {}, validateCurrent(): void {}, finalAuthority: emptyGenerationCurrentnessWitness };
    const productHandle = store.handles.product("primitive-detail:product");
    const hotHandle = store.handles.hotDetail("primitive-detail:hot");
    const provenanceHandle = store.handles.provenance("primitive-detail:product");
    const productSlot = defineTestProductDetailSlot<string>(
      KernelVocabulary.Template.Source.key,
      "test.primitive-product",
      "Primitive product detail.",
    );
    const hotSlot = defineTestHotDetailSlot<string>(
      KernelVocabulary.Template.Source.key,
      "test.primitive-hot",
      "Primitive hot detail.",
    );
    const records = () => new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "primitive-detail");
    const initial = store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        records(),
        [publishProductDetail(productSlot, productHandle, "same")],
        [publishHotDetail(hotSlot, productHandle, hotHandle, "same")],
      ),
      owner,
      preflight,
    );
    const replacement = store.replaceOwnedPublication(
      initial.manifest,
      new KernelPublicationPlan(
        records(),
        [publishProductDetail(productSlot, productHandle, "same")],
        [publishHotDetail(hotSlot, productHandle, hotHandle, "same")],
      ),
      owner,
      preflight,
    );

    expect(replacement.decisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ handle: productHandle, detailKind: productSlot.detailKind, decision: KernelPublicationDecisionKind.Retain }),
      expect.objectContaining({ handle: hotHandle, detailKind: hotSlot.detailKind, decision: KernelPublicationDecisionKind.Retain }),
    ]));
  });

  test("requires each hot detail to name a present owner product of the slot kind", () => {
    const store = new KernelStore("computation-hot-detail-owner-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const slot = defineTestHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.hot-detail-owner-validation",
      "Hot-detail owner validation witness.",
    );
    const missingOwnerHandle = store.handles.product("hot-owner:missing");
    const missingHotHandle = store.handles.hotDetail("hot-owner:missing");
    const missingOwnerRun = lifecycle.begin(locus("hot-owner-missing"));
    missingOwnerRun.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "hot-owner:missing"),
      [],
      [publishHotDetail(slot, missingOwnerHandle, missingHotHandle, { value: 1 })],
    ));
    expect(() => missingOwnerRun.commit()).toThrow(/owner product .* absent from the post-state/);

    const wrongOwnerHandle = store.handles.product("hot-owner:wrong-kind");
    const provenanceHandle = store.handles.provenance("hot-owner:wrong-kind");
    const wrongKindRun = lifecycle.begin(locus("hot-owner-wrong-kind"));
    wrongKindRun.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          wrongOwnerHandle,
          KernelVocabulary.TypeSystem.TypeShape.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "hot-owner:wrong-kind"),
      [],
      [publishHotDetail(
        slot,
        wrongOwnerHandle,
        store.handles.hotDetail("hot-owner:wrong-kind"),
        { value: 2 },
      )],
    ));
    expect(() => wrongKindRun.commit()).toThrow(/has kind .*type-shape.*expected .*template\.source/);
    expect(store.read(wrongOwnerHandle)).toBeNull();
  });

  test("refreshes retained hot details when their owner witness changes", () => {
    const store = new KernelStore("computation-hot-detail-owner-refresh");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("hot-owner-refresh:product");
    const hotHandle = store.handles.hotDetail("hot-owner-refresh:member");
    const provenanceHandle = store.handles.provenance("hot-owner-refresh:product");
    const slot = defineTestHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.hot-detail-owner-refresh",
      "Hot detail whose equal value retains while its owner witness refreshes.",
      noKernelDetailReferences,
      (previous, next) => previous.value === next.value
        ? KernelPublicationDecisionKind.Retain
        : KernelPublicationDecisionKind.Replace,
    );
    const publishAt = (revision: string, hotDetail = { value: 1 }) => {
      const addressHandle = store.handles.address(`hot-owner-refresh:source:${revision}`);
      const product = new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        addressHandle,
        provenanceHandle,
      );
      const run = lifecycle.begin(locus("hot-owner-refresh"));
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(addressHandle, "test", `src/${revision}.html`, SourceLanguage.Html),
          new ProvenanceRecord(provenanceHandle),
          product,
        ], `hot-owner-refresh:${revision}`),
        [],
        [publishHotDetail(slot, productHandle, hotHandle, hotDetail)],
      ));
      return { addressHandle, product, run };
    };

    const initial = publishAt("initial");
    expect(initial.run.commit().state).toBe(ComputationCommitState.Committed);
    const replacement = publishAt("replacement");
    const result = replacement.run.commit();

    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(result.transition.publications).toContainEqual(expect.objectContaining({
      handle: hotHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(store.hotDetails.readEntry(hotHandle)?.owner).toBe(replacement.product);
    expect(store.hotDetails.readEntry(hotHandle)?.owner.addressHandle).toBe(replacement.addressHandle);

    const retainedOwner = publishAt("replacement", { value: 2 });
    expect(retainedOwner.run.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.readProduct(productHandle)).toBe(replacement.product);
    expect(store.hotDetails.readEntry(hotHandle)?.owner).toBe(replacement.product);
    expect(store.hotDetails.readEntry(hotHandle)?.owner).not.toBe(retainedOwner.product);
  });

  test("does not replace a product while another publication owns one of its hot children", () => {
    const store = new KernelStore("computation-foreign-hot-detail-owner");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("foreign-hot-owner:product");
    const hotHandle = store.handles.hotDetail("foreign-hot-owner:member");
    const provenanceHandle = store.handles.provenance("foreign-hot-owner:product");
    const slot = defineTestHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.foreign-hot-detail-owner",
      "Hot child owned by a computation distinct from its product publisher.",
    );
    const publishOwner = (revision: string) => {
      const addressHandle = store.handles.address(`foreign-hot-owner:source:${revision}`);
      const run = lifecycle.begin(locus("foreign-hot-product-owner"));
      run.publish(new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(addressHandle, "test", `src/${revision}.html`, SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          addressHandle,
          provenanceHandle,
        ),
      ], `foreign-hot-owner:${revision}`)));
      return run;
    };

    expect(publishOwner("initial").commit().state).toBe(ComputationCommitState.Committed);
    const childRun = lifecycle.begin(locus("foreign-hot-child-owner"));
    childRun.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "foreign-hot-child"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, { value: 1 })],
    ));
    expect(childRun.commit().state).toBe(ComputationCommitState.Committed);

    expect(() => publishOwner("replacement").commit()).toThrow(/hot detail .* is owned elsewhere/);
    expect(store.hotDetails.read(slot, hotHandle)).toEqual({ value: 1 });
  });

  test("keeps active detail publications lifetime-closed over foreign owner products", () => {
    const prepareScenario = (storeKey: string) => {
      const store = new KernelStore(storeKey);
      const lifecycle = new ComputationLifecycleRegistry(store);
      const ownerProductHandle = store.handles.product(`${storeKey}:owner`);
      const ownerAddressHandle = store.handles.address(`${storeKey}:owner-address`);
      const ownerProvenanceHandle = store.handles.provenance(`${storeKey}:owner-provenance`);
      const lineageAddressHandle = store.handles.address(`${storeKey}:lineage`);
      const unrelatedAddressHandle = store.handles.address(`${storeKey}:unrelated`);
      const hotHandle = store.handles.hotDetail(`${storeKey}:hot`);
      const detailSlot = defineTestProductDetailSlot<{ readonly ownerProductHandle: string }>(
        KernelVocabulary.Template.Source.key,
        `${storeKey}.product-detail`,
        "Foreign-owner product-detail lifetime witness.",
      );
      const hotSlot = defineTestHotDetailSlot<{ readonly ownerProductHandle: string }>(
        KernelVocabulary.Template.Source.key,
        `${storeKey}.hot-detail`,
        "Foreign-owner hot-detail lifetime witness.",
      );

      const initial = lifecycle.begin(locus(`${storeKey}:details`));
      initial.publish(publication(`${storeKey}:initial`, [
        new SourceFileAddress(lineageAddressHandle, "test", `src/${storeKey}-lineage.html`, SourceLanguage.Html),
      ]));
      expect(initial.commit().state).toBe(ComputationCommitState.Committed);
      const marker = store.markLifetime();

      const owner = new MaterializedProduct(
        ownerProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        ownerAddressHandle,
        ownerProvenanceHandle,
      );
      store.publish(publication(`${storeKey}:foreign-owner`, [
        new SourceFileAddress(ownerAddressHandle, "test", `src/${storeKey}-owner.html`, SourceLanguage.Html),
        new ProvenanceRecord(ownerProvenanceHandle),
        owner,
      ]));

      const productDetail = { ownerProductHandle };
      const hotDetail = { ownerProductHandle };
      const replacement = lifecycle.begin(locus(`${storeKey}:details`));
      const stagedDensityMarker = replacement.markObservation();
      const committedDensityMarker = store.markObservation();
      replacement.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new SourceFileAddress(lineageAddressHandle, "test", `src/${storeKey}-lineage.html`, SourceLanguage.Html),
        ], `${storeKey}:replacement`),
        [publishProductDetail(detailSlot, ownerProductHandle, productDetail)],
        [publishHotDetail(hotSlot, ownerProductHandle, hotHandle, hotDetail)],
      ));
      const stagedDensity = replacement.readDetailDensitySince(stagedDensityMarker).hotDetailDensity[0];
      expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
      const committedDensity = store.readDetailDensitySince(committedDensityMarker).hotDetailDensity[0];

      store.publish(publication(`${storeKey}:unrelated`, [
        new SourceFileAddress(unrelatedAddressHandle, "test", `src/${storeKey}-unrelated.html`, SourceLanguage.Html),
      ]));
      return {
        store,
        lifecycle,
        replacement,
        marker,
        owner,
        ownerProductHandle,
        ownerAddressHandle,
        ownerProvenanceHandle,
        lineageAddressHandle,
        unrelatedAddressHandle,
        hotHandle,
        detailSlot,
        hotSlot,
        stagedDensity,
        committedDensity,
      };
    };

    const hard = prepareScenario("detail-owner-hard-disposal");
    hard.store.disposeSince(hard.marker);
    expect(hard.store.read(hard.ownerProductHandle)).toBeNull();
    expect(hard.store.productDetails.read(hard.detailSlot, hard.ownerProductHandle)).toBeNull();
    expect(hard.store.hotDetails.read(hard.hotSlot, hard.hotHandle)).toBeNull();
    expect(hard.lifecycle.readState(hard.replacement.computationId)).toBeNull();

    const selective = prepareScenario("detail-owner-selective-disposal");
    selective.store.disposeUnownedSince(selective.marker);
    expect(selective.store.readProduct(selective.ownerProductHandle)).toBe(selective.owner);
    expect(selective.store.read(selective.ownerAddressHandle)).not.toBeNull();
    expect(selective.store.read(selective.ownerProvenanceHandle)).not.toBeNull();
    expect(selective.store.read(selective.lineageAddressHandle)).not.toBeNull();
    expect(selective.store.read(selective.unrelatedAddressHandle)).toBeNull();
    expect(selective.store.productDetails.read(selective.detailSlot, selective.ownerProductHandle)).not.toBeNull();
    expect(selective.store.hotDetails.read(selective.hotSlot, selective.hotHandle)).not.toBeNull();
    expect(selective.lifecycle.readState(selective.replacement.computationId)?.committedRunSequence)
      .toBe(selective.replacement.runSequence);

    expect(selective.stagedDensity).toEqual(expect.objectContaining({
      directEnvelopeHandleEchoCount: 1,
      directNonEnvelopeKernelHandleCount: 0,
    }));
    expect(selective.committedDensity).toEqual(expect.objectContaining({
      directEnvelopeHandleEchoCount: 1,
      directNonEnvelopeKernelHandleCount: 0,
    }));
  });

  test("aborts a staged transaction after any publication write fails", () => {
    const store = new KernelStore("computation-staged-write-abort");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const ownedHandle = store.handles.address("staged-write-abort:owned");
    const initial = lifecycle.begin(locus("staged-write-abort"));
    initial.publish(publication("staged-write-abort:initial", [
      new SourceFileAddress(ownedHandle, "test", "src/initial.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const transientHandle = store.handles.address("staged-write-abort:transient");
    const replacement = lifecycle.begin(locus("staged-write-abort"));
    expect(() => replacement.publish(publication("staged-write-abort:invalid", [
      new SourceFileAddress(ownedHandle, "test", "src/replacement.html", SourceLanguage.Html),
      new SourceFileAddress(transientHandle, "test", "src/transient-a.html", SourceLanguage.Html),
      new SourceFileAddress(transientHandle, "test", "src/transient-b.html", SourceLanguage.Html),
    ]))).toThrow(/duplicate kernel record/);
    expect(replacement.isCurrent()).toBe(false);
    expect(() => replacement.read(transientHandle)).toThrow(/cannot continue after a failed write/);
    expect(() => replacement.readKernelCountSnapshot()).toThrow(/cannot continue after a failed write/);
    expect(() => replacement.commit()).toThrow(/cannot continue after a failed write/);
    expect(store.readAddress(ownedHandle)).toEqual(expect.objectContaining({ path: "src/initial.html" }));
    expect(store.read(transientHandle)).toBeNull();
  });

  test("keeps staged if-absent admission stable and rejects a changed foreign catalog", () => {
    const store = new KernelStore("computation-stable-detail-admission");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("stable-admission:product");
    const provenanceHandle = store.handles.provenance("stable-admission:product");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.stable-admission-product",
      "Stable staged product-detail admission witness.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.stable-admission-hot",
      "Stable staged hot-detail admission witness.",
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "stable-admission:product"));

    const stagedProduct = { owner: "staged" };
    const productRun = lifecycle.begin(locus("stable-product-admission"));
    productRun.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "stable-product-admission"),
      [publishProductDetail(
        productSlot,
        productHandle,
        stagedProduct,
        KernelDetailAdmission.IfAbsent,
      )],
    ));
    const productCounts = productRun.readKernelCountSnapshot();
    expect(productRun.readProductDetail(productSlot, productHandle)).toBe(stagedProduct);
    const foreignProduct = { owner: "foreign" };
    store.productDetails.add(productSlot, productHandle, foreignProduct);
    expect(productRun.readProductDetail(productSlot, productHandle)).toBe(stagedProduct);
    expect(productRun.readKernelCountSnapshot()).toEqual(productCounts);
    expect(() => productRun.commit()).toThrow(/catalog admission changed after staging/);
    expect(store.productDetails.read(productSlot, productHandle)).toBe(foreignProduct);

    const stagedHot = { owner: "staged" };
    const hotHandle = store.handles.hotDetail("stable-admission:hot");
    const hotRun = lifecycle.begin(locus("stable-hot-admission"));
    hotRun.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "stable-hot-admission"),
      [],
      [publishHotDetail(hotSlot, productHandle, hotHandle, stagedHot, KernelDetailAdmission.IfAbsent)],
    ));
    const hotCounts = hotRun.readKernelCountSnapshot();
    expect(hotRun.readHotDetail(hotSlot, hotHandle)).toBe(stagedHot);
    const foreignHot = { owner: "foreign" };
    store.hotDetails.add(hotSlot, productHandle, hotHandle, foreignHot);
    expect(hotRun.readHotDetail(hotSlot, hotHandle)).toBe(stagedHot);
    expect(hotRun.readKernelCountSnapshot()).toEqual(hotCounts);
    expect(() => hotRun.commit()).toThrow(/catalog admission changed after staging/);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(foreignHot);
  });

  test("preflights every detail object before rebinding a committed envelope", () => {
    const store = new KernelStore("computation-detail-binding-preflight");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("detail-binding-preflight:product");
    const provenanceHandle = store.handles.provenance("detail-binding-preflight:product");
    const initialAddressHandle = store.handles.address("detail-binding-preflight:source:initial");
    const replacementAddressHandle = store.handles.address("detail-binding-preflight:source:replacement");
    const productSlot = defineTestProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-binding-preflight-product",
      "Product-detail weak-binding atomicity witness.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle?: string }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-binding-preflight-hot",
      "Later failing hot-detail binding witness.",
    );
    const detail = { sourceAddressHandle: initialAddressHandle };
    const product = (addressHandle: AddressHandle) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const initial = lifecycle.begin(locus("detail-binding-preflight"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(initialAddressHandle, "test", "src/initial.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(initialAddressHandle),
      ], "detail-binding-preflight:initial"),
      [publishProductDetail(productSlot, productHandle, detail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    expect(detail.sourceAddressHandle).toBe(initialAddressHandle);

    const unbindableHot = {} as { readonly handle?: string };
    const hotHandle = store.handles.hotDetail("detail-binding-preflight:hot");
    Object.defineProperty(unbindableHot, "handle", {
      configurable: false,
      enumerable: true,
      value: hotHandle,
    });
    const replacement = lifecycle.begin(locus("detail-binding-preflight"));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(replacementAddressHandle),
      ], "detail-binding-preflight:replacement"),
      [publishProductDetail(productSlot, productHandle, detail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, unbindableHot)],
    ));
    expect(() => replacement.commit()).toThrow(/cannot be normalized/);
    expect(store.readAddress(initialAddressHandle)).toEqual(expect.objectContaining({ path: "src/initial.html" }));
    expect(store.read(replacementAddressHandle)).toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toBe(detail);
    expect(detail.sourceAddressHandle).toBe(initialAddressHandle);
  });

  test("restores fresh detail candidates when a later normalization fails", () => {
    const store = new KernelStore("computation-fresh-detail-normalization-rollback");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("fresh-detail-normalization-rollback:product");
    const provenanceHandle = store.handles.provenance("fresh-detail-normalization-rollback:product");
    const addressHandle = store.handles.address("fresh-detail-normalization-rollback:source");
    const productSlot = defineTestProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.fresh-detail-normalization-rollback-product",
      "Fresh product-detail descriptor rollback witness.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle?: string }>(
      KernelVocabulary.Template.Source.key,
      "test.fresh-detail-normalization-rollback-hot",
      "Later failing hot-detail descriptor rollback witness.",
    );
    const detail = { sourceAddressHandle: addressHandle };
    const product = new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const unbindableHot = {} as { readonly handle?: string };
    const hotHandle = store.handles.hotDetail("fresh-detail-normalization-rollback:hot");
    Object.defineProperty(unbindableHot, "handle", {
      configurable: false,
      enumerable: true,
      value: hotHandle,
    });
    const rejected = lifecycle.begin(locus("fresh-detail-normalization-rollback"));
    rejected.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(addressHandle, "test", "src/fresh.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product,
      ], "fresh-detail-normalization-rollback:rejected"),
      [publishProductDetail(productSlot, productHandle, detail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, unbindableHot)],
    ));

    expect(() => rejected.commit()).toThrow(/cannot be normalized/);
    expect(detail.sourceAddressHandle).toBe(addressHandle);
    expect(Object.getOwnPropertyDescriptor(detail, "sourceAddressHandle")).toEqual(expect.objectContaining({
      value: addressHandle,
    }));
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(store.read(productHandle)).toBeNull();

    const retry = lifecycle.begin(locus("fresh-detail-normalization-rollback"));
    retry.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(addressHandle, "test", "src/fresh.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product,
      ], "fresh-detail-normalization-rollback:retry"),
      [publishProductDetail(productSlot, productHandle, detail)],
    ));
    expect(retry.commit().state).toBe(ComputationCommitState.Committed);
    expect(detail.sourceAddressHandle).toBe(addressHandle);
    expect(readProductDetailEnvelope(detail)?.handle).toBe(productHandle);
  });

  test("restores superseded candidate leases before admitting their replacement", () => {
    const store = new KernelStore("computation-superseded-candidate-lease");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("superseded-candidate-lease:product");
    const provenanceHandle = store.handles.provenance("superseded-candidate-lease:provenance");
    const hotHandle = store.handles.hotDetail("superseded-candidate-lease:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.superseded-candidate-lease-product",
      "Product detail replaced after its candidate lease becomes visible.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.superseded-candidate-lease-hot",
      "Hot detail replaced after its candidate lease becomes visible.",
    );
    const productDetail = { productHandle };
    const hotDetail = { handle: hotHandle };
    const run = lifecycle.begin(locus("superseded-candidate-lease"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "superseded-candidate-lease:initial"),
      [publishProductDetail(
        productSlot,
        productHandle,
        productDetail,
        KernelDetailAdmission.IfAbsent,
      )],
      [publishHotDetail(
        hotSlot,
        productHandle,
        hotHandle,
        hotDetail,
        KernelDetailAdmission.IfAbsent,
      )],
    ));
    expect(run.readProductDetail(productSlot, productHandle)).toBe(productDetail);
    expect(run.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "superseded-candidate-lease:replacement"),
      [publishProductDetail(productSlot, productHandle, productDetail)],
      [publishHotDetail(hotSlot, productHandle, hotHandle, hotDetail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(productSlot, productHandle)).toBe(productDetail);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hotDetail);
    expect(readProductDetailEnvelope(productDetail)?.handle).toBe(productHandle);
    expect(readHotDetailEntry(hotDetail)?.handle).toBe(hotHandle);
    expect(Object.getOwnPropertyDescriptor(productDetail, "productHandle")?.get).toBeTypeOf("function");
    expect(Object.getOwnPropertyDescriptor(hotDetail, "handle")?.get).toBeTypeOf("function");
  });

  test("fails superseded candidate restoration before mutating an incumbent publication", () => {
    const store = new KernelStore("computation-superseded-candidate-restoration-failure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("superseded-candidate-restoration-failure:product");
    const provenanceHandle = store.handles.provenance("superseded-candidate-restoration-failure:provenance");
    const initialAddressHandle = store.handles.address("superseded-candidate-restoration-failure:initial");
    const replacementAddressHandle = store.handles.address("superseded-candidate-restoration-failure:replacement");
    const slot = defineTestProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.superseded-candidate-restoration-failure",
      "Frozen superseded candidate whose descriptor cannot be restored.",
    );
    const incumbent = { sourceAddressHandle: initialAddressHandle };
    const product = (addressHandle: AddressHandle) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const initial = lifecycle.begin(locus("superseded-candidate-restoration-failure"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(initialAddressHandle, "test", "src/incumbent.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(initialAddressHandle),
      ], "superseded-candidate-restoration-failure:initial"),
      [publishProductDetail(slot, productHandle, incumbent)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const abandoned = { sourceAddressHandle: replacementAddressHandle };
    const replacement = lifecycle.begin(locus("superseded-candidate-restoration-failure"));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(replacementAddressHandle),
      ], "superseded-candidate-restoration-failure:candidate"),
      [publishProductDetail(slot, productHandle, abandoned, KernelDetailAdmission.IfAbsent)],
    ));
    expect(replacement.readProductDetail(slot, productHandle)).toBe(abandoned);
    Object.freeze(abandoned);
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([], "superseded-candidate-restoration-failure:final"),
      [publishProductDetail(slot, productHandle, { sourceAddressHandle: replacementAddressHandle })],
    ));

    expect(() => replacement.commit()).toThrow(/candidate detail bindings/);
    expect(store.readAddress(initialAddressHandle)).toEqual(expect.objectContaining({
      path: "src/incumbent.html",
    }));
    expect(store.read(replacementAddressHandle)).toBeNull();
    expect(store.productDetails.read(slot, productHandle)).toBe(incumbent);
    expect(readProductDetailEnvelope(incumbent)?.addressHandle).toBe(initialAddressHandle);
  });

  test("rejects product-detail dependency mutation after staging", () => {
    const store = new KernelStore("computation-product-detail-reference-mutation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstTargetHandle = store.handles.product("product-detail-reference-mutation:first-target");
    const secondTargetHandle = store.handles.product("product-detail-reference-mutation:second-target");
    const firstProvenanceHandle = store.handles.provenance("product-detail-reference-mutation:first-provenance");
    const secondProvenanceHandle = store.handles.provenance("product-detail-reference-mutation:second-provenance");
    const sourceProductHandle = store.handles.product("product-detail-reference-mutation:source");
    const sourceProvenanceHandle = store.handles.provenance("product-detail-reference-mutation:source-provenance");
    const targetSlot = defineTestProductDetailSlot<{ readonly value: string }>(
      KernelVocabulary.Template.Source.key,
      "test.product-detail-reference-mutation-target",
      "Possible target of a mutable structural reference.",
    );
    const sourceSlot = defineTestProductDetailSlot<{ targetHandle: ProductHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.product-detail-reference-mutation-source",
      "Source detail whose dependency must stay equal to its staged closure.",
      (detail) => mergeKernelDetailReferences([
        kernelProductDetailReference(targetSlot.descriptor, detail.targetHandle),
      ]),
    );
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(firstProvenanceHandle),
      new MaterializedProduct(
        firstTargetHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        firstProvenanceHandle,
      ),
      new ProvenanceRecord(secondProvenanceHandle),
      new MaterializedProduct(
        secondTargetHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        secondProvenanceHandle,
      ),
    ], "product-detail-reference-mutation:targets"));
    store.productDetails.add(targetSlot, firstTargetHandle, { value: "first" });
    store.productDetails.add(targetSlot, secondTargetHandle, { value: "second" });

    const detail = { targetHandle: firstTargetHandle };
    const run = lifecycle.begin(locus("product-detail-reference-mutation"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(sourceProvenanceHandle),
        new MaterializedProduct(
          sourceProductHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          sourceProvenanceHandle,
        ),
      ], "product-detail-reference-mutation:source"),
      [publishProductDetail(sourceSlot, sourceProductHandle, detail)],
    ));
    detail.targetHandle = secondTargetHandle;

    expect(() => run.commit()).toThrow(/structural references after staging/);
    expect(store.read(sourceProductHandle)).toBeNull();
    expect(store.productDetails.read(sourceSlot, sourceProductHandle)).toBeNull();
  });

  test("rejects structural closure mutation by the final currentness validator", () => {
    const store = new KernelStore("publication-final-currentness-reference-mutation");
    const owner = {};
    const firstAddressHandle = store.handles.address("final-currentness-reference-mutation:first");
    const secondAddressHandle = store.handles.address("final-currentness-reference-mutation:second");
    const productHandle = store.handles.product("final-currentness-reference-mutation:product");
    const provenanceHandle = store.handles.provenance("final-currentness-reference-mutation:provenance");
    const slot = defineTestProductDetailSlot<{ addressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.final-currentness-reference-mutation",
      "Detail whose dependency must remain stable through the last external callback.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(detail.addressHandle)),
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(firstAddressHandle, "test", "src/first.html", SourceLanguage.Html),
      new SourceFileAddress(secondAddressHandle, "test", "src/second.html", SourceLanguage.Html),
    ], "final-currentness-reference-mutation:targets"));
    const detail = { addressHandle: firstAddressHandle };

    expect(() => store.replaceOwnedPublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], "final-currentness-reference-mutation:source"),
        [publishProductDetail(slot, productHandle, detail)],
      ),
      owner,
      {
        validate(): void {},
        validateCurrent: () => {
          detail.addressHandle = secondAddressHandle;
        },
        finalAuthority: emptyGenerationCurrentnessWitness,
      },
    )).toThrow(/structural references after staging/);
    expect(store.read(productHandle)).toBeNull();
    expect(store.productDetails.read(slot, productHandle)).toBeNull();
  });

  test("rejects hot-detail dependency mutation by a final validator", () => {
    const store = new KernelStore("computation-hot-detail-reference-mutation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstAddressHandle = store.handles.address("hot-detail-reference-mutation:first");
    const secondAddressHandle = store.handles.address("hot-detail-reference-mutation:second");
    const productHandle = store.handles.product("hot-detail-reference-mutation:product");
    const provenanceHandle = store.handles.provenance("hot-detail-reference-mutation:provenance");
    const hotHandle = store.handles.hotDetail("hot-detail-reference-mutation:hot");
    const slot = defineTestHotDetailSlot<{ addressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.hot-detail-reference-mutation",
      "Hot detail whose dependency must survive final validation unchanged.",
      (detail) => mergeKernelDetailReferences(kernelRecordReferences(detail.addressHandle)),
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(firstAddressHandle, "test", "src/first.html", SourceLanguage.Html),
      new SourceFileAddress(secondAddressHandle, "test", "src/second.html", SourceLanguage.Html),
    ], "hot-detail-reference-mutation:targets"));
    const detail = { addressHandle: firstAddressHandle };
    const run = lifecycle.begin(locus("hot-detail-reference-mutation"));
    run.observe({
      readKey: "test:hot-detail-reference-mutation",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        detail.addressHandle = secondAddressHandle;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "hot-detail-reference-mutation:source"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, detail)],
    ));

    expect(() => run.commit()).toThrow(/structural references after staging/);
    expect(store.read(productHandle)).toBeNull();
    expect(store.hotDetails.read(slot, hotHandle)).toBeNull();
  });

  test("binds semantically retained candidate details before final read validation", () => {
    const store = new KernelStore("computation-retained-detail-final-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("retained-detail-final-validation:product");
    const provenanceHandle = store.handles.provenance("retained-detail-final-validation:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.retained-detail-final-validation",
      "Fresh retained detail inspected by a final input validator.",
      noKernelDetailReferences,
      () => KernelPublicationDecisionKind.Retain,
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const incumbentDetail = { productHandle };
    const initial = lifecycle.begin(locus("retained-detail-final-validation"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        product(),
      ], "retained-detail-final-validation:initial"),
      [publishProductDetail(slot, productHandle, incumbentDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    const candidateDetail = { productHandle };
    let validatedEnvelope: MaterializedProduct | null = null;
    const replacement = lifecycle.begin(locus("retained-detail-final-validation"));
    replacement.observe({
      readKey: "test:retained-detail-final-validation",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        validatedEnvelope = readProductDetailEnvelope(candidateDetail);
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        product(),
      ], "retained-detail-final-validation:replacement"),
      [publishProductDetail(
        slot,
        productHandle,
        candidateDetail,
        KernelDetailAdmission.Required,
      )],
    ));

    const result = replacement.commit();
    expect(result.state).toBe(ComputationCommitState.Committed);
    expect(validatedEnvelope?.handle).toBe(productHandle);
    expect(store.productDetails.read(slot, productHandle)).toBe(incumbentDetail);
    expect(readProductDetailEnvelope(candidateDetail)?.handle).toBe(productHandle);
  });

  test("restores provisional detail bindings when final read validation rejects", () => {
    const store = new KernelStore("computation-detail-validation-rollback");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("detail-validation-rollback:product");
    const provenanceHandle = store.handles.provenance("detail-validation-rollback:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-validation-rollback",
      "Candidate detail whose provisional final-validation binding must roll back.",
    );
    const detail = { productHandle };
    let validatedEnvelope: MaterializedProduct | null = null;
    const run = lifecycle.begin(locus("detail-validation-rollback"));
    run.observe({
      readKey: "test:detail-validation-rollback",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        validatedEnvelope = readProductDetailEnvelope(detail);
        return { isCurrent: false, currentRevision: "2", changedFacets: ["revision"] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "detail-validation-rollback"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(validatedEnvelope?.handle).toBe(productHandle);
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(detail, "productHandle")).toEqual(expect.objectContaining({
      value: productHandle,
    }));
    expect(store.read(productHandle)).toBeNull();
  });

  test("rejects normalized handle mutation by a final validator", () => {
    const store = new KernelStore("computation-normalized-handle-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("normalized-handle-validation:product");
    const provenanceHandle = store.handles.provenance("normalized-handle-validation:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.normalized-handle-validation",
      "Normalized owner handle protected across final validation.",
    );
    const detail = { productHandle };
    const run = lifecycle.begin(locus("normalized-handle-validation"));
    run.observe({
      readKey: "test:normalized-handle-validation",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        Object.defineProperty(detail, "productHandle", {
          configurable: true,
          enumerable: true,
          value: "corrupted",
        });
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "normalized-handle-validation"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(() => run.commit()).toThrow(/changed after owner normalization/);
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(detail.productHandle).toBe(productHandle);
    expect(store.read(productHandle)).toBeNull();
  });

  test("seals provisionally visible hot-detail ownership metadata", () => {
    const store = new KernelStore("computation-hot-detail-metadata-seal");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("hot-detail-metadata-seal:product");
    const provenanceHandle = store.handles.provenance("hot-detail-metadata-seal:provenance");
    const hotHandle = store.handles.hotDetail("hot-detail-metadata-seal:detail");
    const slot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.hot-detail-metadata-seal",
      "Hot-detail owner metadata exposed to a final validator.",
    );
    const detail = { handle: hotHandle };
    let entryWasFrozen = false;
    let slotWasFrozen = false;
    const run = lifecycle.begin(locus("hot-detail-metadata-seal"));
    run.observe({
      readKey: "test:hot-detail-metadata-seal",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        const entry = readHotDetailEntry(detail);
        if (entry == null) {
          throw new Error("Final validation could not read the provisional hot-detail owner.");
        }
        entryWasFrozen = Object.isFrozen(entry);
        slotWasFrozen = Object.isFrozen(slot);
        expect(Reflect.set(entry as object, "handle", "corrupted")).toBe(false);
        expect(Reflect.set(slot as object, "detailKind", "corrupted")).toBe(false);
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "hot-detail-metadata-seal"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, detail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    expect(entryWasFrozen).toBe(true);
    expect(slotWasFrozen).toBe(true);
    expect(readHotDetailEntry(detail)?.handle).toBe(hotHandle);
    expect(store.hotDetails.read(slot, hotHandle)).toBe(detail);
  });

  test("rejects supersession from descriptor normalization and restores the candidate detail", () => {
    const store = new KernelStore("computation-normalization-supersession");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("normalization-supersession:product");
    const provenanceHandle = store.handles.provenance("normalization-supersession:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.normalization-supersession",
      "Descriptor trap that supersedes its publication before final preflight.",
    );
    const newerRuns: ComputationRun[] = [];
    let triggered = false;
    const target = { productHandle };
    const detail = new Proxy(target, {
      defineProperty: (object, property, descriptor) => {
        if (!triggered && property === "productHandle") {
          triggered = true;
          newerRuns.push(lifecycle.begin(locus("normalization-supersession")));
        }
        return Reflect.defineProperty(object, property, descriptor);
      },
    });
    const run = lifecycle.begin(locus("normalization-supersession"));
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "normalization-supersession"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(productHandle)).toBeNull();
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(detail, "productHandle")).toEqual(expect.objectContaining({
      value: productHandle,
    }));
    expect(newerRuns).toHaveLength(1);
    newerRuns[0]!.abort();
  });

  test("rejects supersession from final descriptor revalidation", () => {
    const store = new KernelStore("computation-final-descriptor-supersession");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("final-descriptor-supersession:product");
    const provenanceHandle = store.handles.provenance("final-descriptor-supersession:provenance");
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.final-descriptor-supersession",
      "Descriptor trap that supersedes its publication after owner currentness validation.",
    );
    const newerRuns: ComputationRun[] = [];
    let armed = false;
    let triggered = false;
    const target = { productHandle };
    const detail = new Proxy(target, {
      getOwnPropertyDescriptor: (object, property) => {
        if (armed && !triggered && property === "productHandle") {
          triggered = true;
          newerRuns.push(lifecycle.begin(locus("final-descriptor-supersession")));
        }
        return Reflect.getOwnPropertyDescriptor(object, property);
      },
    });
    const run = lifecycle.begin(locus("final-descriptor-supersession"));
    run.observe({
      readKey: "test:final-descriptor-supersession",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        armed = true;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "final-descriptor-supersession"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(productHandle)).toBeNull();
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(Object.getOwnPropertyDescriptor(detail, "productHandle")).toEqual(expect.objectContaining({
      value: productHandle,
    }));
    expect(newerRuns).toHaveLength(1);
    newerRuns[0]!.abort();
  });

  test("rejects supersession from final structural closure reprojection", () => {
    const store = new KernelStore("computation-final-projector-supersession");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("final-projector-supersession:product");
    const provenanceHandle = store.handles.provenance("final-projector-supersession:provenance");
    const newerRuns: ComputationRun[] = [];
    let armed = false;
    let triggered = false;
    const slot = defineTestProductDetailSlot<{ readonly productHandle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.final-projector-supersession",
      "Structural projector that supersedes its publication after owner currentness validation.",
      () => {
        if (armed && !triggered) {
          triggered = true;
          newerRuns.push(lifecycle.begin(locus("final-projector-supersession")));
        }
        return noKernelDetailReferences();
      },
    );
    const product = () => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      null,
      provenanceHandle,
    );
    const incumbentDetail = { productHandle };
    const initial = lifecycle.begin(locus("final-projector-supersession"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        product(),
      ], "final-projector-supersession:initial"),
      [publishProductDetail(slot, productHandle, incumbentDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const incumbentProduct = store.read(productHandle);
    const incumbentDetailRevision = store.productDetails.readMutationOrdinal(productHandle);
    const lifetime = store.markLifetime();
    const observation = store.markObservation();

    const detail = { productHandle };
    const run = lifecycle.begin(locus("final-projector-supersession"));
    run.observe({
      readKey: "test:final-projector-supersession",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        armed = true;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        product(),
      ], "final-projector-supersession:replacement"),
      [publishProductDetail(slot, productHandle, detail)],
    ));

    expect(run.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(productHandle)).toBe(incumbentProduct);
    expect(store.productDetails.read(slot, productHandle)).toBe(incumbentDetail);
    expect(store.productDetails.readMutationOrdinal(productHandle)).toBe(incumbentDetailRevision);
    expect(readProductDetailEnvelope(detail)).toBeNull();
    expect(store.markLifetime()).toEqual(lifetime);
    expect(store.markObservation()).toEqual(observation);
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
    expect(newerRuns).toHaveLength(1);
    newerRuns[0]!.abort();
  });

  test("rejects currentness revocation from final hot-detail closure reprojection", () => {
    const store = new KernelStore("computation-final-hot-projector-currentness");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus("final-hot-projector-currentness"));
    // Logical guard labels are diagnostic vocabulary and must not masquerade as the run's nominal authority.
    const guardKey = `computation-run:${run.computationId}`;
    const authority = new MutableGenerationAuthority();
    const productHandle = store.handles.product("final-hot-projector-currentness:product");
    const provenanceHandle = store.handles.provenance("final-hot-projector-currentness:provenance");
    const hotHandle = store.handles.hotDetail("final-hot-projector-currentness:detail");
    let armed = false;
    let triggered = false;
    const slot = defineTestHotDetailSlot<{ readonly handle: string }>(
      KernelVocabulary.Template.Source.key,
      "test.final-hot-projector-currentness",
      "Hot-detail projector that revokes input currentness after callbackful validation.",
      () => {
        if (armed && !triggered) {
          triggered = true;
          authority.invalidate();
        }
        return noKernelDetailReferences();
      },
    );
    const detail = { handle: hotHandle };
    run.guardCurrent(guardKey, authority);
    run.observe({
      readKey: "test:final-hot-projector-currentness",
      domain: "test-input",
      observedRevision: "1",
      validate: () => {
        armed = true;
        return { isCurrent: true, currentRevision: "1", changedFacets: [] };
      },
    });
    run.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new ProvenanceRecord(provenanceHandle),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.Source.key,
          null,
          null,
          provenanceHandle,
        ),
      ], "final-hot-projector-currentness"),
      [],
      [publishHotDetail(slot, productHandle, hotHandle, detail)],
    ));

    const rejected = run.commit();
    expect(rejected.state).toBe(ComputationCommitState.RejectedCurrentnessChanged);
    expect(rejected.transition.invalidCurrentnessGuards).toEqual([
      expect.objectContaining({ guardKey }),
    ]);
    expect(store.read(productHandle)).toBeNull();
    expect(store.hotDetails.read(slot, hotHandle)).toBeNull();
    expect(readHotDetailEntry(detail)).toBeNull();
  });

  test("completes fallible detail binding before replacing live records", () => {
    const store = new KernelStore("computation-detail-binding-atomicity");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("detail-binding-atomicity:product");
    const provenanceHandle = store.handles.provenance("detail-binding-atomicity:product");
    const initialAddressHandle = store.handles.address("detail-binding-atomicity:source:initial");
    const replacementAddressHandle = store.handles.address("detail-binding-atomicity:source:replacement");
    const productSlot = defineTestProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-binding-atomicity-product",
      "Stateful product-detail binding atomicity witness.",
    );
    const product = (addressHandle: AddressHandle) => new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.Source.key,
      null,
      addressHandle,
      provenanceHandle,
    );
    const initialDetail = { sourceAddressHandle: initialAddressHandle };
    const initial = lifecycle.begin(locus("detail-binding-atomicity"));
    initial.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(initialAddressHandle, "test", "src/initial.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(initialAddressHandle),
      ], "detail-binding-atomicity:initial"),
      [publishProductDetail(productSlot, productHandle, initialDetail)],
    ));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);

    let reads = 0;
    const hostileTarget = {} as { readonly sourceAddressHandle: AddressHandle };
    Object.defineProperty(hostileTarget, "sourceAddressHandle", {
      configurable: true,
      enumerable: true,
      get: () => {
        reads += 1;
        return replacementAddressHandle;
      },
    });
    const hostileDetail = new Proxy(hostileTarget, {
      defineProperty: () => {
        throw new Error("detail normalization trap failed during binding");
      },
    });
    const replacement = lifecycle.begin(locus("detail-binding-atomicity"));
    replacement.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(replacementAddressHandle, "test", "src/replacement.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        product(replacementAddressHandle),
      ], "detail-binding-atomicity:replacement"),
      [publishProductDetail(productSlot, productHandle, hostileDetail)],
    ));

    expect(() => replacement.commit()).toThrow("detail normalization trap failed during binding");
    expect(reads).toBe(1);
    expect(store.readAddress(initialAddressHandle)).toEqual(expect.objectContaining({ path: "src/initial.html" }));
    expect(store.read(replacementAddressHandle)).toBeNull();
    expect(store.productDetails.read(productSlot, productHandle)).toBe(initialDetail);
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);
  });

  test("rejects a publication manifest that cannot prove store ownership", () => {
    const store = new KernelStore("computation-publication-ownership");
    const foreignHandle = store.handles.address("publication-ownership:foreign");
    const foreign = new SourceFileAddress(foreignHandle, "test", "src/foreign.html", SourceLanguage.Html);
    store.commit(new KernelStoreBatch([foreign], "publication-ownership:foreign"));

    expect(() => store.replacePublication(
      new KernelPublicationManifest([foreignHandle]),
      new KernelPublicationPlan(new KernelStoreBatch([], "publication-ownership:forged")),
    )).toThrow(/stale or foreign publication manifest/);
    expect(store.read(foreignHandle)).toBe(foreign);
  });

  test("admits only the exact current manifest when replacing one publication lineage", () => {
    const store = new KernelStore("computation-publication-current-authority");
    const firstHandle = store.handles.address("publication-current-authority:first");
    const secondHandle = store.handles.address("publication-current-authority:second");
    const first = store.replacePublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(firstHandle, "test", "src/first.html", SourceLanguage.Html),
      ], "publication-current-authority:first")),
    );
    const second = store.replacePublication(
      first.manifest,
      new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(secondHandle, "test", "src/second.html", SourceLanguage.Html),
      ], "publication-current-authority:second")),
    );

    expect(() => store.replacePublication(
      first.manifest,
      new KernelPublicationPlan(new KernelStoreBatch([], "publication-current-authority:stale")),
    )).toThrow(/stale or foreign publication manifest/);
    expect(() => store.replacePublication(
      new KernelPublicationManifest(
        second.manifest.recordHandles,
        second.manifest.productDetailHandles,
        second.manifest.hotDetailHandles,
        second.manifest.lifetimeOrdinal,
      ),
      new KernelPublicationPlan(new KernelStoreBatch([], "publication-current-authority:copy")),
    )).toThrow(/stale or foreign publication manifest/);
    expect(store.read(firstHandle)).toBeNull();
    expect(store.read(secondHandle)).not.toBeNull();
    expect(Object.isFrozen(second.manifest)).toBe(true);
    expect(Object.isFrozen(second.manifest.recordHandles)).toBe(true);
  });

  test("retires an exact empty manifest when its committed generation is disposed", () => {
    const store = new KernelStore("computation-empty-publication-retirement");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const marker = store.markLifetime();
    const run = lifecycle.begin(locus("empty-publication-retirement"));

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    expect(state).not.toBeNull();
    if (state == null) {
      throw new Error("Expected an empty committed computation generation.");
    }
    expect(state.publication.recordHandles).toEqual([]);

    store.disposeSince(marker);

    expect(lifecycle.readState(run.computationId)).toBeNull();
    expect(() => store.replacePublication(
      state.publication,
      new KernelPublicationPlan(new KernelStoreBatch([], "empty-publication-retirement:stale")),
    )).toThrow(/stale or foreign publication manifest/);
  });

  test("retires a store-owned empty publication manifest at its lifetime boundary", () => {
    const store = new KernelStore("store-empty-publication-retirement");
    const marker = store.markLifetime();
    const replacement = store.replacePublication(
      KernelPublicationManifest.empty,
      new KernelPublicationPlan(new KernelStoreBatch([], "store-empty-publication-retirement")),
    );

    store.disposeSince(marker);

    expect(() => store.replacePublication(
      replacement.manifest,
      new KernelPublicationPlan(new KernelStoreBatch([], "store-empty-publication-retirement:stale")),
    )).toThrow(/stale or foreign publication manifest/);
  });

  test("does not let an exact lifecycle manifest escape its owning registry", () => {
    const store = new KernelStore("computation-publication-owner-boundary");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const initial = lifecycle.begin(locus("publication-owner-boundary"));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(initial.computationId);
    if (state == null) {
      throw new Error("Expected a committed lifecycle publication.");
    }

    expect(() => store.replacePublication(
      state.publication,
      new KernelPublicationPlan(new KernelStoreBatch([], "publication-owner-boundary:foreign")),
    )).toThrow(/stale or foreign publication manifest/);
    expect(lifecycle.readState(initial.computationId)?.committedRunSequence).toBe(initial.runSequence);

    const legitimate = lifecycle.begin(locus("publication-owner-boundary"));
    expect(legitimate.commit().state).toBe(ComputationCommitState.Committed);
  });

  test("preserves a publication lifetime across replacement while reclaiming later answer-local rows", () => {
    const store = new KernelStore("computation-lifetime-lineage");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:lifetime", "1");
    const detailSlot = defineTestProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.lifetime-product",
      "Computation publication lifetime-lineage product detail.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.lifetime-hot",
      "Computation publication lifetime-lineage hot detail.",
    );

    const publishRevision = (revision: number, local: string) => {
      const productHandle = store.handles.product(`lifetime:${local}`);
      const hotHandle = store.handles.hotDetail(`hot:lifetime:${local}`);
      const provenanceHandle = store.handles.provenance(`lifetime:${local}`);
      const run = lifecycle.begin(locus("lifetime"));
      run.observe(revisions.observe("source:lifetime"));
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], `lifetime:${local}`),
        [publishProductDetail(detailSlot, productHandle, { revision })],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { revision })],
      ));
      return { run, productHandle, hotHandle, provenanceHandle };
    };

    const initial = publishRevision(0, "initial");
    expect(initial.run.commit().state).toBe(ComputationCommitState.Committed);
    const answerMarker = store.markLifetime();

    revisions.set("source:lifetime", "2");
    const replacement = publishRevision(1, "replacement");
    expect(replacement.run.commit().state).toBe(ComputationCommitState.Committed);

    const answerProductHandle = store.handles.product("lifetime:answer-local");
    const answerProvenanceHandle = store.handles.provenance("lifetime:answer-local");
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(answerProvenanceHandle),
      new MaterializedProduct(
        answerProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        answerProvenanceHandle,
      ),
    ], "lifetime:answer-local"));
    store.productDetails.add(detailSlot, answerProductHandle, { revision: 99 });
    const answerHotHandle = store.handles.hotDetail("hot:lifetime:answer-local");
    store.hotDetails.add(hotSlot, answerProductHandle, answerHotHandle, { revision: 99 });

    const disposal = store.disposeSince(answerMarker);
    expect(disposal).toEqual(expect.objectContaining({ records: 2, productDetails: 1, hotDetails: 1 }));
    expect(store.read(initial.productHandle)).toBeNull();
    expect(store.read(replacement.productHandle)).not.toBeNull();
    expect(store.productDetails.read(detailSlot, replacement.productHandle)).toEqual({ revision: 1 });
    expect(store.hotDetails.read(hotSlot, replacement.hotHandle)).toEqual({ revision: 1 });
    expect(store.read(answerProductHandle)).toBeNull();
    expect(store.productDetails.read(detailSlot, answerProductHandle)).toBeNull();
    expect(store.hotDetails.read(hotSlot, answerHotHandle)).toBeNull();
  });

  test("reclaims unowned answer-local rows without crossing interleaved computation publications", () => {
    const store = new KernelStore("computation-selective-lifetime");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const detailSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.selective-lifetime-product",
      "Selective lifetime product detail.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.selective-lifetime-hot",
      "Selective lifetime hot detail.",
    );

    const publish = (owner: string) => {
      const productHandle = store.handles.product(`selective-lifetime:${owner}`);
      const provenanceHandle = store.handles.provenance(`selective-lifetime:${owner}`);
      const hotHandle = store.handles.hotDetail(`hot:selective-lifetime:${owner}`);
      const run = lifecycle.begin(locus(`selective-lifetime:${owner}`));
      run.publish(new KernelPublicationPlan(
        new KernelStoreBatch([
          new ProvenanceRecord(provenanceHandle),
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Template.Source.key,
            null,
            null,
            provenanceHandle,
          ),
        ], `selective-lifetime:${owner}`),
        [publishProductDetail(detailSlot, productHandle, { owner })],
        [publishHotDetail(hotSlot, productHandle, hotHandle, { owner })],
      ));
      expect(run.commit().state).toBe(ComputationCommitState.Committed);
      return { run, productHandle, hotHandle };
    };

    const earlier = publish("earlier");
    const answerMarker = store.markLifetime();
    const later = publish("later");

    const answerProductHandle = store.handles.product("selective-lifetime:answer-local");
    const answerProvenanceHandle = store.handles.provenance("selective-lifetime:answer-local");
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(answerProvenanceHandle),
      new MaterializedProduct(
        answerProductHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        answerProvenanceHandle,
      ),
    ], "selective-lifetime:answer-local"));
    store.productDetails.add(detailSlot, answerProductHandle, { owner: "answer-local" });
    const answerHotHandle = store.handles.hotDetail("hot:selective-lifetime:answer-local");
    store.hotDetails.add(hotSlot, answerProductHandle, answerHotHandle, { owner: "answer-local" });

    const disposal = store.disposeUnownedSince(answerMarker);

    expect(disposal).toEqual(expect.objectContaining({ records: 2, productDetails: 1, hotDetails: 1 }));
    expect(store.read(answerProductHandle)).toBeNull();
    expect(store.productDetails.read(detailSlot, answerProductHandle)).toBeNull();
    expect(store.hotDetails.read(hotSlot, answerHotHandle)).toBeNull();
    for (const publication of [earlier, later]) {
      expect(store.read(publication.productHandle)).not.toBeNull();
      expect(store.productDetails.read(detailSlot, publication.productHandle)).not.toBeNull();
      expect(store.hotDetails.read(hotSlot, publication.hotHandle)).not.toBeNull();
      expect(lifecycle.readState(publication.run.computationId)?.committedRunSequence)
        .toBe(publication.run.runSequence);
    }
  });

  test("retains positive exact and aggregate inputs of active computations during selective disposal", () => {
    const store = new KernelStore("computation-selective-input-retention");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const marker = store.markLifetime();
    const exactHandle = store.handles.address("selective-input-retention:exact");
    const indexedHandle = store.handles.address("selective-input-retention:indexed");
    const unrelatedHandle = store.handles.address("selective-input-retention:unrelated");
    const productHandle = store.handles.product("selective-input-retention:product");
    const provenanceHandle = store.handles.provenance("selective-input-retention:provenance");
    const outputHandle = store.handles.address("selective-input-retention:output");
    const hotHandle = store.handles.hotDetail("selective-input-retention:hot");
    const productSlot = defineTestProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.selective-input-retention-product",
      "Foreign product detail consumed by an active computation.",
    );
    const hotSlot = defineTestHotDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.selective-input-retention-hot",
      "Foreign hot detail consumed by an active computation.",
    );
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(exactHandle, "test", "src/exact.html", SourceLanguage.Html),
      new SourceFileAddress(indexedHandle, "test", "src/indexed.html", SourceLanguage.Html),
      new SourceFileAddress(unrelatedHandle, "test", "src/unrelated.html", SourceLanguage.Html),
      new ProvenanceRecord(provenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        provenanceHandle,
      ),
    ], "selective-input-retention:foreign"));
    const productDetail = { owner: "foreign" };
    const hotDetail = { owner: "foreign" };
    store.productDetails.add(productSlot, productHandle, productDetail);
    store.hotDetails.add(hotSlot, productHandle, hotHandle, hotDetail);

    const run = lifecycle.begin(locus("selective-input-retention"));
    expect(run.read(exactHandle)).not.toBeNull();
    expect(run.readProductDetail(productSlot, productHandle)).toBe(productDetail);
    expect(run.readHotDetail(hotSlot, hotHandle)).toBe(hotDetail);
    expect(run.readSourceFileAddressesByFileName("src/indexed.html").map((entry) => entry.handle))
      .toEqual([indexedHandle]);
    run.publish(publication("selective-input-retention:output", [
      new SourceFileAddress(outputHandle, "test", "src/output.html", SourceLanguage.Html),
    ]));
    expect(run.commit().state).toBe(ComputationCommitState.Committed);

    const disposal = store.disposeUnownedSince(marker);

    expect(disposal).toEqual(expect.objectContaining({ records: 1, productDetails: 0, hotDetails: 0 }));
    expect(store.read(unrelatedHandle)).toBeNull();
    for (const retainedHandle of [exactHandle, indexedHandle, provenanceHandle, productHandle, outputHandle]) {
      expect(store.read(retainedHandle)).not.toBeNull();
    }
    expect(store.productDetails.read(productSlot, productHandle)).toBe(productDetail);
    expect(store.hotDetails.read(hotSlot, hotHandle)).toBe(hotDetail);
    expect(lifecycle.readState(run.computationId)?.committedRunSequence).toBe(run.runSequence);
  });

  test("promotes and retains a publication through a foreign structural reference alone", () => {
    const store = new KernelStore("computation-structural-lifetime-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("structural-lifetime-closure:product");
    const initialProvenanceHandle = store.handles.provenance("structural-lifetime-closure:initial");
    const initial = lifecycle.begin(locus("structural-lifetime-closure"));
    initial.publish(new KernelPublicationPlan(new KernelStoreBatch([
      new ProvenanceRecord(initialProvenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        initialProvenanceHandle,
      ),
    ], "structural-lifetime-closure:initial")));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const marker = store.markLifetime();

    const foreignProvenanceHandle = store.handles.provenance("structural-lifetime-closure:foreign");
    const unrelatedHandle = store.handles.address("structural-lifetime-closure:unrelated");
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(foreignProvenanceHandle),
      new SourceFileAddress(unrelatedHandle, "test", "src/unrelated.html", SourceLanguage.Html),
    ], "structural-lifetime-closure:foreign"));

    const replacement = lifecycle.begin(locus("structural-lifetime-closure"));
    replacement.publish(new KernelPublicationPlan(new KernelStoreBatch([
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        foreignProvenanceHandle,
      ),
    ], "structural-lifetime-closure:replacement")));
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);

    const state = lifecycle.readState(replacement.computationId);
    expect(state?.reads).toEqual([]);
    expect(state?.publication.lifetimeOrdinal).toBe(store.readRecordLifetimeOrdinal(foreignProvenanceHandle));
    expect(store.readRecordLifetimeOrdinal(productHandle)).toBe(state?.publication.lifetimeOrdinal);

    const disposal = store.disposeUnownedSince(marker);

    expect(disposal.records).toBe(1);
    expect(store.read(unrelatedHandle)).toBeNull();
    expect(store.read(foreignProvenanceHandle)).not.toBeNull();
    expect(store.read(productHandle)).not.toBeNull();
    expect(lifecycle.readState(replacement.computationId)?.committedRunSequence).toBe(replacement.runSequence);
  });

  test("promotes a replacement closure to the youngest foreign reference and registered record read", () => {
    const store = new KernelStore("computation-lifetime-dependency-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("lifetime-dependency-closure:product");
    const initialProvenanceHandle = store.handles.provenance("lifetime-dependency-closure:initial");
    const initial = lifecycle.begin(locus("lifetime-dependency-closure"));
    initial.publish(new KernelPublicationPlan(new KernelStoreBatch([
      new ProvenanceRecord(initialProvenanceHandle),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        initialProvenanceHandle,
      ),
    ], "lifetime-dependency-closure:initial")));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    const marker = store.markLifetime();

    const observedHandle = store.handles.address("lifetime-dependency-closure:observed");
    const foreignProvenanceHandle = store.handles.provenance("lifetime-dependency-closure:foreign");
    store.commit(new KernelStoreBatch([
      new SourceFileAddress(observedHandle, "test", "src/observed.html", SourceLanguage.Html),
    ], "lifetime-dependency-closure:observed"));
    store.commit(new KernelStoreBatch([
      new ProvenanceRecord(foreignProvenanceHandle),
    ], "lifetime-dependency-closure:foreign"));

    const reads = new ComputationRecordReadView(store);
    expect(reads.read(observedHandle)).not.toBeNull();
    const replacement = lifecycle.begin(locus("lifetime-dependency-closure"));
    for (const read of reads.readAll()) {
      replacement.observe(read);
    }
    replacement.publish(new KernelPublicationPlan(new KernelStoreBatch([
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.Source.key,
        null,
        null,
        foreignProvenanceHandle,
      ),
    ], "lifetime-dependency-closure:replacement")));
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    const generation = lifecycle.admitCommittedGeneration(
      replacement.computationId,
      replacement.runSequence,
      "test-lifetime-dependency-closure",
    );
    const state = lifecycle.readState(replacement.computationId);
    expect(state?.publication.lifetimeOrdinal).toBe(store.readRecordLifetimeOrdinal(foreignProvenanceHandle));
    expect(store.readRecordLifetimeOrdinal(productHandle)).toBe(state?.publication.lifetimeOrdinal);

    store.disposeSince(marker);

    expect(store.read(observedHandle)).toBeNull();
    expect(store.read(foreignProvenanceHandle)).toBeNull();
    expect(store.read(productHandle)).toBeNull();
    expect(lifecycle.readState(replacement.computationId)).toBeNull();
    expect(generation.isCurrent()).toBe(false);
  });

  test("clears lifecycle ownership when lifetime disposal reclaims a complete publication", () => {
    const store = new KernelStore("computation-lifecycle-disposal");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:disposed", "1");
    const outputHandle = store.handles.address("disposed-output");
    const marker = store.markLifetime();

    const initial = lifecycle.begin(locus("disposed"));
    initial.observe(revisions.observe("source:disposed"));
    initial.publish(publication("disposed:initial", [
      new SourceFileAddress(outputHandle, "test", "src/initial.html", SourceLanguage.Html),
    ]));
    expect(initial.commit().state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readersFor("source:disposed")).toEqual([initial.computationId]);
    const outputReadKey = computationRecordReadKey(outputHandle);
    expect(lifecycle.producerFor(outputReadKey)).toBe(initial.computationId);

    const preparedBeforeDisposal = lifecycle.begin(locus("disposed"));
    preparedBeforeDisposal.observe(revisions.observe("source:disposed"));
    preparedBeforeDisposal.publish(publication("disposed:prepared-before-disposal", [
      new SourceFileAddress(outputHandle, "test", "src/stale.html", SourceLanguage.Html),
    ]));

    store.disposeSince(marker);
    expect(store.read(outputHandle)).toBeNull();
    expect(lifecycle.readState(initial.computationId)).toBeNull();
    expect(lifecycle.readersFor("source:disposed")).toEqual([]);
    expect(lifecycle.producerFor(outputReadKey)).toBeNull();
    expect(preparedBeforeDisposal.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(outputHandle)).toBeNull();

    const restored = lifecycle.begin(locus("disposed"));
    restored.observe(revisions.observe("source:disposed"));
    restored.publish(publication("disposed:restored", [
      new SourceFileAddress(outputHandle, "test", "src/restored.html", SourceLanguage.Html),
    ]));
    expect(restored.computationId).toBe(initial.computationId);
    expect(restored.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.readAddress(outputHandle)).toEqual(expect.objectContaining({ path: "src/restored.html" }));
  });

  test("projects original typed leaves through committed child and upstream generation closures", () => {
    const store = new KernelStore("computation-typed-read-closure");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const testFile = fileURLToPath(import.meta.url);
    const inputGeneration = new SemanticRuntimeProjectInputAuthority().capture({
      projectKey: "computation-typed-read-closure",
      rootDir: path.dirname(testFile),
    });
    const inputScope = inputGeneration.createReadScope("typed-read-closure-source");
    expect(inputScope.host.readFile(testFile)).toContain("computation-typed-read-closure");
    const inputRead = inputScope.readRegisteredInputs()[0];
    if (inputRead == null) {
      throw new Error("Expected the source scope to register one project-input read.");
    }
    expect(inputRead).toBeInstanceOf(SemanticRuntimeProjectInputRead);

    const sourceRun = lifecycle.begin(locus("typed-read-closure-source"));
    sourceRun.observe(inputRead);
    expect(sourceRun.commit().state).toBe(ComputationCommitState.Committed);
    const sourceGeneration = lifecycle.admitCommittedGeneration(
      sourceRun.computationId,
      sourceRun.runSequence,
      "test-source-generation",
    );

    const derivedRead = (
      readKey: string,
      dependency: ComputationGenerationAuthority,
    ): ComputationRead => {
      const read: ComputationRead = {
        domain: "test-derived-generation",
        readKey,
        observedRevision: dependency.key,
        validate: () => ({
          isCurrent: dependency.isCurrent(),
          currentRevision: dependency.key,
          changedFacets: dependency.isCurrent() ? [] : ["generation"],
        }),
        tryRebaseCurrent: () => dependency.isCurrent() ? read : null,
        readComputationDependencies: () => [dependency],
      };
      return read;
    };

    const middleRun = lifecycle.begin(locus("typed-read-closure-middle"));
    middleRun.observe(derivedRead("middle-generation", sourceGeneration));
    expect(middleRun.commit().state).toBe(ComputationCommitState.Committed);
    const middleGeneration = lifecycle.admitCommittedGeneration(
      middleRun.computationId,
      middleRun.runSequence,
      "test-middle-generation",
    );

    const rootRun = lifecycle.begin(locus("typed-read-closure-root"));
    rootRun.withChildPartition(() => rootRun.withChild(childLocus("typed-read-closure-child"), () => {
      rootRun.observe(derivedRead("root-child-generation", middleGeneration));
    }));
    expect(rootRun.commit().state).toBe(ComputationCommitState.Committed);
    const rootGeneration = lifecycle.admitCommittedGeneration(
      rootRun.computationId,
      rootRun.runSequence,
      "test-root-generation",
    );

    const selected = lifecycle.readCommittedGenerationReadClosure(
      rootGeneration,
      (read): read is SemanticRuntimeProjectInputRead => read instanceof SemanticRuntimeProjectInputRead,
    );
    expect(selected).toEqual([inputRead]);
    expect(selected[0]).toBe(inputRead);
    expect(Object.isFrozen(selected)).toBe(true);

    const openRun = lifecycle.begin(locus("typed-read-closure-open"));
    openRun.readAllRecords();
    expect(openRun.commit().state).toBe(ComputationCommitState.Committed);
    const openGeneration = lifecycle.admitCommittedGeneration(
      openRun.computationId,
      openRun.runSequence,
      "test-open-generation",
    );
    expect(() => lifecycle.readCommittedGenerationReadClosure(
      openGeneration,
      (read): read is SemanticRuntimeProjectInputRead => read instanceof SemanticRuntimeProjectInputRead,
    )).toThrow(/unresolved aggregate reads/);

    const unadmittedRun = lifecycle.begin(locus("typed-read-closure-unadmitted"));
    unadmittedRun.observe(inputRead);
    expect(unadmittedRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(() => lifecycle.readCommittedGenerationReadClosure(
      {
        computationId: unadmittedRun.computationId,
        runSequence: unadmittedRun.runSequence,
      },
      (read): read is SemanticRuntimeProjectInputRead => read instanceof SemanticRuntimeProjectInputRead,
    )).toThrow(/uncommitted or unadmitted computation generation/);

    const replacement = lifecycle.begin(locus("typed-read-closure-root"));
    replacement.observe(derivedRead("root-child-generation", middleGeneration));
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    lifecycle.admitCommittedGeneration(
      replacement.computationId,
      replacement.runSequence,
      "test-root-generation",
    );
    expect(() => lifecycle.readCommittedGenerationReadClosure(
      rootGeneration,
      (read): read is SemanticRuntimeProjectInputRead => read instanceof SemanticRuntimeProjectInputRead,
    )).toThrow(/uncommitted or unadmitted computation generation/);
  });

  test("supersedes an unpublished first generation across a lifetime disposal boundary", () => {
    const store = new KernelStore("computation-pending-first-generation-disposal");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const marker = store.markLifetime();
    const outputHandle = store.handles.address("pending-first-generation-output");
    const pending = lifecycle.begin(locus("pending-first-generation"));
    pending.publish(publication("pending-first-generation", [
      new SourceFileAddress(outputHandle, "test", "src/pending.html", SourceLanguage.Html),
    ]));

    store.disposeSince(marker);

    expect(pending.commit().state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(outputHandle)).toBeNull();
  });
});

describe("kernel identity indexing", () => {
  test("indexes observation and framework identities like every other semantic identity", () => {
    const store = new KernelStore("kernel-identity-exhaustiveness");
    const observation = new ObservationIdentity(
      store.handles.identity("observation"),
      KernelVocabulary.Observation.RuntimeEffect.key,
      null,
    );
    const framework = new FrameworkIdentity(
      store.handles.identity("framework"),
      KernelVocabulary.Framework.CapabilityDemand.key,
      null,
    );

    store.commit(new KernelStoreBatch([observation, framework], "identity-exhaustiveness"));

    expect(store.readIdentity(observation.handle)).toBe(observation);
    expect(store.readIdentity(framework.handle)).toBe(framework);
  });
});
