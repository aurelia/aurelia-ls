import assert from "node:assert/strict";

import { FrameworkRelationshipEndpointKind } from "../framework/relationships.js";
import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { LocusKind, RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkCompilerValue } from "../inquiry/runtime/framework-compiler-lenses.js";
import type { FrameworkRenderingValue } from "../inquiry/runtime/framework-entities.js";
import type { FrameworkLifecycleValue } from "../inquiry/runtime/framework-lifecycle-lenses.js";
import type { FrameworkObservationValue } from "../inquiry/runtime/framework-observation-lenses.js";
import type { Api } from "../session/api.js";

/** Exercise cross-projection evidence that summary counts and known route names cannot establish. */
export async function assertFrameworkRenderingQueries(api: Pick<Api, "ask" | "follow">): Promise<void> {
  const ask = (lens: LensId, projection: string, filters: Record<string, string>) =>
    api.ask({ lens, projection, filters, locus: RepoRootLocus, budget: { rows: 4 } });

  const absent = await ask(LensId.FrameworkCompiler, "summary", { packageId: "absent-package" });
  const empty = absent.value as FrameworkCompilerValue;
  assert.equal(absent.outcome, OutcomeKind.Miss);
  assert.deepEqual(
    [empty.compileFlowCount, empty.attributeClassificationCount, empty.relationshipCount, empty.instructionProductCount],
    [0, 0, 0, 0],
    "TemplateCompiler rows escaped their source package.",
  );
  const materialization = await ask(LensId.FrameworkCompiler, "summary", { query: "template-materialization" });
  assert.equal(materialization.outcome, OutcomeKind.Hit);
  assert.ok((materialization.value as FrameworkCompilerValue).compileFlowCount > 0);
  const parsed = await ask(LensId.FrameworkCompiler, "relationships", { relation: "parses-attribute", query: "AttrSyntax" });
  assert.ok((parsed.value as FrameworkCompilerValue).relationships?.some((row) =>
    row.from.name === "TemplateCompiler._classifyAttributes" && row.to.name === "AttrSyntax",
  ));
  const category = await ask(LensId.FrameworkCompiler, "relationships", {
    relation: "produces-instruction", query: "plain-attribute",
  });
  assert.equal(category.page?.total, 0, "A branch category cannot identify a produced instruction.");

  const consequence = await ask(LensId.FrameworkRendering, "render-consequences", {
    consequenceKind: "instruction-dispatch", toName: "PropertyBindingRenderer",
  });
  const continuation = consequence.continuations.find((row) =>
    row.inquiry.projection === "instruction-dispatches" &&
    row.inquiry.filters?.rendererName === "PropertyBindingRenderer",
  );
  assert.ok(continuation, "Missing renderer-specific dispatch detail.");
  const dispatch = await api.follow(continuation);
  assert.equal(dispatch.page?.total, 1);
  const [property] = (dispatch.value as FrameworkRenderingValue).instructionDispatches ?? [];
  assert.equal(property?.rendererName, "PropertyBindingRenderer");
  assert.equal(property.slotName, "itPropertyBinding");

  const producers = await api.ask({
    lens: LensId.FrameworkCompiler, projection: "instruction-products",
    locus: { kind: LocusKind.Package, packageName: "@aurelia/template-compiler" },
    filters: { instructionName: "PropertyBindingInstruction" }, budget: { rows: 2 },
  });
  const producerRows = (producers.value as FrameworkCompilerValue).instructionProducts;
  assert.ok(producerRows?.length && producerRows.every((row) => row.packageId === "template-compiler"));
  const toRenderer = producers.continuations.find((row) =>
    row.inquiry.projection === "instruction-dispatches" &&
    row.inquiry.filters?.instructionName === "PropertyBindingInstruction",
  );
  assert.ok(toRenderer);
  const consumers = (await api.follow(toRenderer)).value as FrameworkRenderingValue;
  assert.ok(consumers.instructionDispatches?.some((row) =>
    row.packageId === "runtime-html" && row.rendererName === "PropertyBindingRenderer",
  ), "The target renderer belongs to a different package than the producing command.");

  const decision = { query: "function-key-computed-observer" };
  const rollup = (await ask(LensId.FrameworkObservation, "summary", decision)).value as FrameworkObservationValue;
  const detail = await ask(LensId.FrameworkObservation, "observer-locator-decisions", decision);
  assert.ok((detail.page?.total ?? 0) > 0, "Missing function-key observer decision.");
  assert.equal(rollup.observerLocatorDecisionCount, detail.page?.total);
  assert.ok(rollup.observerLocatorDecisions === undefined &&
    rollup.collectionMethods === undefined && rollup.dependencyCircuits === undefined,
    "Observation summary contains unpaged detail rows.");

  const linkQuery = await ask(LensId.FrameworkObservation, "flow-entity-links", { query: "target-root-name" });
  const links = (linkQuery.value as FrameworkObservationValue).flowEntityLinks;
  assert.ok(links?.length && links.every((row) => row.matchBasis === "target-root-name"),
    "Linked observation entities must be searchable by their derived match basis.");
  const dispatchQuery = await ask(LensId.FrameworkRendering, "relationships", { query: "renderer-dispatch" });
  assert.ok((dispatchQuery.page?.total ?? 0) > 0, "Normalized rendering mechanisms must be searchable.");

  const hooks = await ask(LensId.FrameworkLifecycle, "relationships", {
    participantKind: "lifecycle-hook", hookName: "hydrating",
  });
  const rows = (hooks.value as FrameworkLifecycleValue).relationships ?? [];
  assert.ok(rows.some((row) => row.to.expression?.text === "l.instance.hydrating"));
  assert.ok(rows.every((row) => row.to.name === "hydrating" && row.to.kind === FrameworkRelationshipEndpointKind.Method));
  const tasks = await ask(LensId.FrameworkLifecycle, "app-tasks", { slotName: "hydrating" });
  assert.ok((tasks.value as FrameworkLifecycleValue).appTaskExecutions?.some((task) =>
    task.target.kind === FrameworkRelationshipEndpointKind.AppTask && task.slotName === "hydrating",
  ), "AppRoot must retain its distinct hydrating AppTask invocation.");

  const sites = await ask(LensId.FrameworkLifecycle, "resource-sites", {
    packageId: "runtime-html", query: "DateFormatBindingBehavior",
  });
  assert.ok((sites.value as FrameworkLifecycleValue).resourceSites?.some((row) =>
    row.sourceExportName === "DateFormatBindingBehavior" && row.source.filePath.includes("/runtime-html/"),
  ), "A framework lifecycle site may handle a resource declared in another package.");
}
