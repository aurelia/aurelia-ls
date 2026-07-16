import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { SourceFileAddress, SourceLanguage, SourceSpanAddress } from "../src/kernel/address.js";
import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
} from "../src/kernel/computation-lifecycle.js";
import { FrameworkIdentity, ObservationIdentity } from "../src/kernel/identity.js";
import { defineHotDetailSlot } from "../src/kernel/hot-details.js";
import { MaterializedProduct } from "../src/kernel/materialization.js";
import { defineProductDetailSlot } from "../src/kernel/product-details.js";
import { ProvenanceRecord } from "../src/kernel/provenance.js";
import {
  KernelPublicationDecisionKind,
  KernelPublicationPlan,
  publishHotDetail,
  publishProductDetail,
} from "../src/kernel/publication.js";
import {
  SourceTextSnapshotAuthority,
  SourceTextSnapshotState,
} from "../src/kernel/source-text-snapshot.js";
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

class MutableSourceTextProvider {
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

    revisions.set(readKey, "r2");
    const r2 = lifecycle.begin(locus("race"));
    r2.observe(revisions.observe(readKey));
    const r2Output = new SourceFileAddress(outputHandle, "test", "src/r2.html", SourceLanguage.Html);
    r2.publish(publication("race:r2", [r2Output]));
    expect(r2.commit().state).toBe(ComputationCommitState.Committed);

    const stale = r1.commit();
    expect(stale.state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(outputHandle)).toBe(r2Output);
    expect(lifecycle.readState(r2.computationId)?.reads.map((read) => read.observedRevision)).toEqual(["r2"]);
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
    const provenanceHandle = store.handles.provenance("product:atomic");
    const detailSlot = defineProductDetailSlot<{ readonly revision: number }>(
      KernelVocabulary.Template.Source.key,
      "test.atomic-product",
      "Computation publication product-detail transaction witness.",
    );
    const hotSlot = defineHotDetailSlot<{ readonly revision: number }>(
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
    const product0 = { revision: 0 };
    const hot0 = { revision: 0 };
    run0.publish(new KernelPublicationPlan(
      new KernelStoreBatch([
        new SourceFileAddress(sourceHandle, "test", "src/r0.html", SourceLanguage.Html),
        new ProvenanceRecord(provenanceHandle),
        materializedProduct,
      ], "atomic:0"),
      [publishProductDetail(detailSlot, productHandle, product0)],
      [publishHotDetail(hotSlot, "hot:atomic", hot0)],
    ));
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
      [publishHotDetail(hotSlot, "hot:atomic", hot1)],
    ));
    expect(run1.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, "hot:atomic")).toBe(hot1);

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
      [publishHotDetail(hotSlot, "hot:atomic", { revision: 2 })],
    ));

    expect(() => run2.commit()).toThrow(/test\.atomic-product.*absent from the post-state/);
    expect(store.readAddress(sourceHandle)).toEqual(expect.objectContaining({ path: "src/r1.html" }));
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, "hot:atomic")).toBe(hot1);
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
      [publishHotDetail(hotSlot, "hot:atomic", { revision: 3 })],
    ));

    expect(() => run3.commit()).toThrow();
    expect(store.readAddress(sourceHandle)).toEqual(expect.objectContaining({ path: "src/r1.html" }));
    expect(store.productDetails.read(detailSlot, productHandle)).toBe(product1);
    expect(store.hotDetails.read(hotSlot, "hot:atomic")).toBe(hot1);
    expect(lifecycle.readState(run1.computationId)?.committedRunSequence).toBe(run1.runSequence);
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
      "test.lifetime-hot",
      "Computation publication lifetime-lineage hot detail.",
    );

    const publishRevision = (revision: number, local: string) => {
      const productHandle = store.handles.product(`lifetime:${local}`);
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
        [publishHotDetail(hotSlot, `hot:lifetime:${local}`, { revision })],
      ));
      return { run, productHandle, provenanceHandle };
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
    store.hotDetails.add(hotSlot, "hot:lifetime:answer-local", { revision: 99 });

    const disposal = store.disposeSince(answerMarker);
    expect(disposal).toEqual(expect.objectContaining({ records: 2, productDetails: 1, hotDetails: 1 }));
    expect(store.read(initial.productHandle)).toBeNull();
    expect(store.read(replacement.productHandle)).not.toBeNull();
    expect(store.productDetails.read(detailSlot, replacement.productHandle)).toEqual({ revision: 1 });
    expect(store.hotDetails.read(hotSlot, "hot:lifetime:replacement")).toEqual({ revision: 1 });
    expect(store.read(answerProductHandle)).toBeNull();
    expect(store.productDetails.read(detailSlot, answerProductHandle)).toBeNull();
    expect(store.hotDetails.read(hotSlot, "hot:lifetime:answer-local")).toBeNull();
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

    const preparedBeforeDisposal = lifecycle.begin(locus("disposed"));
    preparedBeforeDisposal.observe(revisions.observe("source:disposed"));
    preparedBeforeDisposal.publish(publication("disposed:prepared-before-disposal", [
      new SourceFileAddress(outputHandle, "test", "src/stale.html", SourceLanguage.Html),
    ]));

    store.disposeSince(marker);
    expect(store.read(outputHandle)).toBeNull();
    expect(lifecycle.readState(initial.computationId)).toBeNull();
    expect(lifecycle.readersFor("source:disposed")).toEqual([]);
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
});

describe("source text snapshots", () => {
  test("keeps one admitted source value immutable while reporting a later content revision", () => {
    const fileName = "C:/virtual/src/app.html";
    const provider = new MutableSourceTextProvider();
    const authority = new SourceTextSnapshotAuthority(provider);
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
    const provider = new MutableSourceTextProvider();
    const authority = new SourceTextSnapshotAuthority(provider);

    const absent = authority.capture(fileName);
    expect(absent.state).toBe(SourceTextSnapshotState.Absent);

    provider.write(fileName, "<template></template>");
    expect(absent.validate()).toEqual(expect.objectContaining({
      isCurrent: false,
      changedFacets: ["existence", "content"],
    }));
  });

  test("does not fall through to disk after the source provider proves absence", () => {
    const provider = new MutableSourceTextProvider();
    const authority = new SourceTextSnapshotAuthority(provider);
    const existingFileName = fileURLToPath(import.meta.url);

    const snapshot = authority.capture(existingFileName);

    expect(snapshot.state).toBe(SourceTextSnapshotState.Absent);
    expect(snapshot.text).toBeNull();
  });

  test("keeps a provider-claimed file without readable text distinct from absence", () => {
    const authority = new SourceTextSnapshotAuthority({
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
