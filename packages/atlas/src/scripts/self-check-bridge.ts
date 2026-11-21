import assert from "node:assert/strict";
import { type SemanticCompositionValue } from "../inquiry/composition.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkApiValue } from "../inquiry/runtime/framework-api-lenses.js";
import type { FrameworkRouterValue } from "../inquiry/runtime/framework-router-lenses.js";
import type { Api } from "../session/api.js";

/** Exercise the public hops where equal names and projected router evidence can lose their original identity. */
export async function assertFrameworkIdentityAndComposition(api: Pick<Api, "ask" | "follow">): Promise<void> {
  const budget = { rows: 8, evidencePerSubject: 0 };
  const subject = await api.ask({
    lens: LensId.FrameworkApi, locus: RepoRootLocus, projection: "subjects",
    filters: { packageId: "kernel", subjectName: "createMappedError" }, budget,
  });
  const selected = (subject.value as FrameworkApiValue).subjects;
  assert.equal(selected?.length, 1, "The kernel error factory has one API subject.");
  const hop = subject.continuations.find((entry) => entry.inquiry.projection === "usages");
  assert.ok(hop, "The kernel error factory offers a usages continuation.");
  assert.equal(hop.inquiry.filters?.subjectId, selected[0]!.id);
  const usages = ((await api.follow(hop)).value as FrameworkApiValue).usages;
  assert.ok(usages?.length && usages.every((row) => row.subjectId === selected[0]!.id));

  const groups = await api.ask({
    lens: LensId.FrameworkApi, locus: RepoRootLocus, projection: "usage-consumers",
    filters: { subjectName: "IBinding", consumerPackageId: "runtime-html", ownerName: "bindingHandlerMap" }, budget,
  });
  const consumers = (groups.value as FrameworkApiValue).usageConsumers ?? [];
  const folder = "aurelia/packages/runtime-html/src/resources/binding-behaviors/";
  for (const file of ["debounce.ts", "throttle.ts"]) {
    const owner = consumers.find((row) => row.ownerSource?.filePath === folder + file);
    assert.ok(owner, `Missing the bindingHandlerMap declaration in ${file}.`);
    assert.equal(owner.usageCount, 1);
  }

  const filters = { query: "AnySegment", mechanism: "route-recognizer" };
  const relationships = await api.ask({
    lens: LensId.FrameworkRouter, locus: RepoRootLocus, projection: "relationships", filters, budget,
  });
  const owner = (relationships.value as FrameworkRouterValue).relationships?.find(
    (row) => row.from.name === "AnySegment" && row.packageId === "route-recognizer",
  );
  assert.ok(owner, "The framework recognizer exposes its AnySegment relationship.");
  const composition = await api.ask({
    lens: LensId.FrameworkComposition, locus: RepoRootLocus, projection: "claims",
    filters: { ...filters, family: "router" }, budget,
  });
  const claim = (composition.value as SemanticCompositionValue).claims?.find(
    (row) => row.sourceRowId === owner.sourceRowId && row.predicate === owner.relation,
  );
  assert.ok(claim, "The recognizer relationship reaches composition through its source row.");
  assert.deepEqual(claim.source, owner.source);
}
