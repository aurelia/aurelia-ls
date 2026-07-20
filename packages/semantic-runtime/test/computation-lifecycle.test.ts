import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { SourceFileAddress, SourceLanguage, SourceSpanAddress } from "../src/kernel/address.js";
import {
  ComputationCommitState,
  computationHotDetailReadKey,
  ComputationLifecycleRegistry,
  computationProductDetailReadKey,
  ComputationRecordReadView,
  computationRecordReadKey,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
} from "../src/kernel/computation-lifecycle.js";
import { FrameworkIdentity, ObservationIdentity } from "../src/kernel/identity.js";
import type { AddressHandle } from "../src/kernel/handles.js";
import { defineHotDetailSlot } from "../src/kernel/hot-details.js";
import { MaterializedProduct } from "../src/kernel/materialization.js";
import {
  defineProductDetailSlot,
  readProductDetailEnvelope,
} from "../src/kernel/product-details.js";
import { ProvenanceRecord } from "../src/kernel/provenance.js";
import {
  KernelDetailAdmission,
  KernelPublicationDecisionKind,
  KernelPublicationManifest,
  KernelPublicationPlan,
  publishHotDetail,
  publishProductDetail,
} from "../src/kernel/publication.js";
import {
  SourceTextSnapshotAuthority,
  SourceTextSnapshotState,
} from "../src/kernel/source-text-snapshot.js";
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeSourceTextOverlay,
} from "../src/kernel/project-input.js";
import { KernelStore, KernelStoreBatch } from "../src/kernel/store.js";
import { KernelVocabulary } from "../src/kernel/vocabulary.js";

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

class MutableSourceHost {
  private readonly sourceTextByFileName = new Map<string, string>();

  write(fileName: string, sourceText: string): void {
    this.sourceTextByFileName.set(path.resolve(fileName), sourceText);
  }

  remove(fileName: string): void {
    this.sourceTextByFileName.delete(path.resolve(fileName));
  }

  readFile(fileName: string): string | undefined {
    return this.sourceTextByFileName.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean {
    return this.sourceTextByFileName.has(path.resolve(fileName));
  }
}

function sourceTextSnapshotAuthority(overlay: SemanticRuntimeSourceTextOverlay): SourceTextSnapshotAuthority {
  const inputs = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
  return new SourceTextSnapshotAuthority(inputs.capture({
    projectKey: "source-text-snapshot-test",
    rootDir: "C:/virtual",
  }));
}

function locus(owner: string, cohort = "app-root:default"): ComputationLocus {
  return {
    kind: "template-compilation",
    reconciliationKey: `project:test|owner:${owner}|cohort:${cohort}|role:app`,
    summary: `${owner} in ${cohort}`,
  };
}

function publication(
  label: string,
  records: ConstructorParameters<typeof KernelStoreBatch>[0],
): KernelPublicationPlan {
  return new KernelPublicationPlan(new KernelStoreBatch(records, label));
}

describe("computation lifecycle", () => {
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

  test("tracks exact foreign records and details through their committed producer", () => {
    const store = new KernelStore("computation-exact-kernel-inputs");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("exact-kernel-inputs:product");
    const provenanceHandle = store.handles.provenance("exact-kernel-inputs:provenance");
    const hotHandle = store.handles.hotDetail("exact-kernel-inputs:hot");
    const productSlot = defineProductDetailSlot<{ readonly version: number }>(
      KernelVocabulary.Template.Source.key,
      "test.exact-kernel-product-detail",
      "Exact product-detail computation input.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly version: number }>(
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
    const productDetailKey = computationProductDetailReadKey(productSlot.detailKind, productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotSlot.detailKind, hotHandle);
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

  test("tracks negative exact reads and borrowed if-absent details without self-dependencies", () => {
    const store = new KernelStore("computation-negative-and-borrowed-details");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("negative-and-borrowed:product");
    const provenanceHandle = store.handles.provenance("negative-and-borrowed:provenance");
    const missingRecordHandle = store.handles.address("negative-and-borrowed:missing-record");
    const hotHandle = store.handles.hotDetail("negative-and-borrowed:hot");
    const productSlot = defineProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.negative-and-borrowed-product-detail",
      "Negative and borrowed product-detail input.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly owner: string }>(
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
    const productDetailKey = computationProductDetailReadKey(productSlot.detailKind, productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotSlot.detailKind, hotHandle);
    expect(lifecycle.readState(borrower.computationId)?.reads.map((read) => read.readKey).sort()).toEqual([
      hotDetailKey,
      productDetailKey,
    ].sort());
    expect(lifecycle.readState(borrower.computationId)?.outputs).toEqual([]);
    expect(lifecycle.producerFor(productDetailKey)).toBeNull();
    expect(lifecycle.readersFor(productDetailKey)).toEqual([borrower.computationId]);
  });

  test("drops exact reads superseded by outputs from the same committed generation", () => {
    const store = new KernelStore("computation-read-before-own-write");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("read-before-own-write:product");
    const provenanceHandle = store.handles.provenance("read-before-own-write:provenance");
    const hotHandle = store.handles.hotDetail("read-before-own-write:hot");
    const productSlot = defineProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.read-before-own-write-product-detail",
      "Product detail read before its owning write.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly owner: string }>(
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
    const productDetailKey = computationProductDetailReadKey(productSlot.detailKind, productHandle);
    const hotDetailKey = computationHotDetailReadKey(hotSlot.detailKind, hotHandle);
    expect(lifecycle.readState(run.computationId)?.reads).toEqual([]);
    expect(lifecycle.readersFor(recordKey)).toEqual([]);
    expect(lifecycle.readersFor(productDetailKey)).toEqual([]);
    expect(lifecycle.readersFor(hotDetailKey)).toEqual([]);
    expect(lifecycle.producerFor(recordKey)).toBe(run.computationId);
    expect(lifecycle.producerFor(productDetailKey)).toBe(run.computationId);
    expect(lifecycle.producerFor(hotDetailKey)).toBe(run.computationId);
  });

  test("rejects a superseded borrowed if-absent run without importing its reads", () => {
    const store = new KernelStore("computation-superseded-borrowed-detail");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("superseded-borrowed-detail:product");
    const provenanceHandle = store.handles.provenance("superseded-borrowed-detail:provenance");
    const productSlot = defineProductDetailSlot<{ readonly owner: string }>(
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
    const productSlot = defineProductDetailSlot<{ readonly owner: string }>(
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
    const productDetailKey = computationProductDetailReadKey(productSlot.detailKind, productHandle);

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

    expect(commit("absence:closed:scope-1", "src/missing.html").state).toBe(ComputationCommitState.Committed);
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

  test("replaces record and detail products atomically and preserves the last complete state on failure", () => {
    const store = new KernelStore("computation-atomic-publication");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const revisions = new MutableRevisionAuthority();
    revisions.set("source:atomic", "1");

    const sourceHandle = store.handles.address("source:atomic");
    const productHandle = store.handles.product("product:atomic");
    const hotHandle = store.handles.hotDetail("hot:atomic");
    const provenanceHandle = store.handles.provenance("product:atomic");
    const detailSlot = defineProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.atomic-product",
      "Computation publication product-detail transaction witness.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly revision: number }>(
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

  test("requires each hot detail to name a present owner product of the slot kind", () => {
    const store = new KernelStore("computation-hot-detail-owner-validation");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const slot = defineHotDetailSlot<{ readonly value: number }>(
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

  test("refreshes retained hot details with the owner product envelope", () => {
    const store = new KernelStore("computation-hot-detail-owner-refresh");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("hot-owner-refresh:product");
    const hotHandle = store.handles.hotDetail("hot-owner-refresh:member");
    const provenanceHandle = store.handles.provenance("hot-owner-refresh:product");
    const slot = defineHotDetailSlot<{ readonly value: number }>(
      KernelVocabulary.Template.Source.key,
      "test.hot-detail-owner-refresh",
      "Hot detail whose owner witness changes while its semantic value is retained.",
    );
    const detail = { value: 1 };
    const publishAt = (revision: string, hotDetail = detail) => {
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
    const slot = defineHotDetailSlot<{ readonly value: number }>(
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
      const detailSlot = defineProductDetailSlot<{ readonly ownerProductHandle: string }>(
        KernelVocabulary.Template.Source.key,
        `${storeKey}.product-detail`,
        "Foreign-owner product-detail lifetime witness.",
      );
      const hotSlot = defineHotDetailSlot<{ readonly ownerProductHandle: string }>(
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
    const productSlot = defineProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.stable-admission-product",
      "Stable staged product-detail admission witness.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly owner: string }>(
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
    const productSlot = defineProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.detail-binding-preflight-product",
      "Product-detail weak-binding atomicity witness.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly handle?: string }>(
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
    const productSlot = defineProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
      KernelVocabulary.Template.Source.key,
      "test.fresh-detail-normalization-rollback-product",
      "Fresh product-detail descriptor rollback witness.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly handle?: string }>(
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

  test("completes fallible detail binding before replacing live records", () => {
    const store = new KernelStore("computation-detail-binding-atomicity");
    const lifecycle = new ComputationLifecycleRegistry(store);
    const productHandle = store.handles.product("detail-binding-atomicity:product");
    const provenanceHandle = store.handles.provenance("detail-binding-atomicity:product");
    const initialAddressHandle = store.handles.address("detail-binding-atomicity:source:initial");
    const replacementAddressHandle = store.handles.address("detail-binding-atomicity:source:replacement");
    const productSlot = defineProductDetailSlot<{ readonly sourceAddressHandle: AddressHandle }>(
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
    const detailSlot = defineProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.lifetime-product",
      "Computation publication lifetime-lineage product detail.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly revision: number }>(
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
    const detailSlot = defineProductDetailSlot<{ readonly owner: string }>(
      KernelVocabulary.Template.Source.key,
      "test.selective-lifetime-product",
      "Selective lifetime product detail.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly owner: string }>(
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

describe("source text snapshots", () => {
  test("keeps one admitted source value immutable while reporting a later content revision", () => {
    const fileName = "C:/virtual/src/app.html";
    const provider = new MutableSourceHost();
    const authority = sourceTextSnapshotAuthority(provider);
    provider.write(fileName, "<p>first</p>");

    const admitted = authority.capture(fileName);
    provider.write(fileName, "<p>second</p>");

    expect(admitted.state).toBe(SourceTextSnapshotState.Present);
    expect(admitted.requireText()).toBe("<p>first</p>");
    expect(admitted.validate()).toEqual(expect.objectContaining({
      isCurrent: false,
      changedFacets: ["content"],
    }));
    expect(authority.capture(fileName).requireText()).toBe("<p>second</p>");
  });

  test("distinguishes an authoritative absence from a later present source", () => {
    const fileName = "C:/virtual/src/late.html";
    const provider = new MutableSourceHost();
    const authority = sourceTextSnapshotAuthority(provider);

    const absent = authority.capture(fileName);
    expect(absent.state).toBe(SourceTextSnapshotState.Absent);

    provider.write(fileName, "<template></template>");
    expect(absent.validate()).toEqual(expect.objectContaining({
      isCurrent: false,
      changedFacets: ["existence", "content"],
    }));
  });

  test("does not fall through to disk after the source provider proves absence", () => {
    const provider = new MutableSourceHost();
    const authority = sourceTextSnapshotAuthority(provider);
    const existingFileName = fileURLToPath(import.meta.url);

    const snapshot = authority.capture(existingFileName);

    expect(snapshot.state).toBe(SourceTextSnapshotState.Absent);
    expect(snapshot.text).toBeNull();
  });

  test("keeps a provider-claimed file without readable text distinct from absence", () => {
    const authority = sourceTextSnapshotAuthority({
      readFile: () => undefined,
      fileExists: () => true,
    });

    const snapshot = authority.capture("C:/virtual/src/unavailable.html");

    expect(snapshot.state).toBe(SourceTextSnapshotState.Unavailable);
    expect(() => snapshot.requireText()).toThrow(/is unavailable/);
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
