import type { Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkObservationValue } from "../inquiry/runtime/framework-observation-lenses.js";
import { createApi } from "../session/index.js";
import { assertHitAnswer, printCounts } from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const summaryAnswer = await askObservation("summary", {
  rows: 1,
  evidencePerSubject: 0,
});
const entityAnswer = await askObservation("entities", {
  rows: 8,
  evidencePerSubject: 0,
});
const bindingLookupAnswer = await askObservation("binding-lookups", {
  rows: 8,
  evidencePerSubject: 0,
});
const bindingSetupAnswer = await askObservation("binding-setups", {
  rows: 8,
  evidencePerSubject: 0,
});
const flowSiteAnswer = await askObservation("flow-sites", {
  rows: 8,
  evidencePerSubject: 0,
});
const collectionMethodAnswer = await askObservation("collection-methods", {
  rows: 8,
  evidencePerSubject: 0,
});
const flowEntityLinkAnswer = await askObservation("flow-entity-links", {
  rows: 8,
  evidencePerSubject: 0,
});
const relationshipAnswer = await askObservation("relationships", {
  rows: 8,
  evidencePerSubject: 0,
});

const value = summaryAnswer.value;

console.log("framework.observation pressure");
console.log("scope: observer entities, binding lookup/setup, observation flow sites, collection methods, flow-to-entity links, and relationship axes");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("observation topology");
console.log(`- observer entities: ${value.observerCount ?? 0}`);
console.log(`- binding observer lookups: ${value.bindingLookupCount ?? 0}`);
console.log(`- binding observation setups: ${value.bindingSetupCount ?? 0}`);
console.log(`- observation surface methods: ${value.surfaceMethodCount ?? 0}`);
console.log(`- observation flow sites: ${value.flowSiteCount ?? 0}`);
console.log(`- collection methods: ${value.collectionMethodCount ?? 0}`);
console.log(`- flow-to-entity links: ${value.flowEntityLinkCount ?? 0}`);
console.log(`- relationships: ${value.relationshipCount ?? 0}`);

printCounts("observer kinds", value.observerKinds ?? {}, 30);
printCounts("observer capabilities", value.observerCapabilities ?? {}, 30);
printCounts("binding lookup names", value.bindingLookupNames ?? {}, 30);
printCounts("binding setup kinds", value.bindingSetupKinds ?? {}, 30);
printCounts("surface kinds", value.surfaceKinds ?? {}, 30);
printCounts("flow site kinds", value.flowSiteKinds ?? {}, 40);
printCounts("collection method surface kinds", value.collectionMethodSurfaceKinds ?? {}, 30);
printCounts("collection method receiver kinds", value.collectionMethodReceiverKinds ?? {}, 30);
printCounts("collection method action kinds", value.collectionMethodActionKinds ?? {}, 30);
printCounts("flow entity match bases", value.flowEntityMatchBases ?? {}, 30);
printCounts("relationship relations", value.relationshipRelations ?? {}, 30);
printCounts("relationship mechanisms", value.relationshipMechanisms ?? {}, 30);
printCounts("relationship phases", value.relationshipPhases ?? {}, 30);

printObserverRows(entityAnswer.value.observers ?? []);
printBindingLookupRows(bindingLookupAnswer.value.bindingLookups ?? []);
printBindingSetupRows(bindingSetupAnswer.value.bindingSetups ?? []);
printFlowSiteRows(flowSiteAnswer.value.flowSites ?? []);
printCollectionMethodRows(collectionMethodAnswer.value.collectionMethods ?? []);
printFlowEntityLinkRows(flowEntityLinkAnswer.value.flowEntityLinks ?? []);
printRelationshipRows(relationshipAnswer.value.relationships ?? []);

async function askObservation(
  projection: string,
  budget: { readonly rows: number; readonly evidencePerSubject: number },
): Promise<Answer<FrameworkObservationValue> & { readonly value: FrameworkObservationValue }> {
  const answer = await api.ask({
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection,
    budget,
  });
  assertHitAnswer<FrameworkObservationValue>(
    `framework.observation ${projection}`,
    answer,
  );
  return answer;
}

function printObserverRows(
  rows: NonNullable<FrameworkObservationValue["observers"]>,
): void {
  console.log("");
  console.log("sample observer entities");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    const defaults = row.defaultImplementationNames.length === 0
      ? "none"
      : row.defaultImplementationNames.join(",");
    console.log(
      `- ${row.packageId}:${row.exportEntry.exportName} kinds=${row.observerKinds.join(",")} capabilities=${row.observerCapabilities.join(",")} defaults=${defaults}`,
    );
  }
}

function printBindingLookupRows(
  rows: NonNullable<FrameworkObservationValue["bindingLookups"]>,
): void {
  console.log("");
  console.log("sample binding observer lookups");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.bindingName}.${row.methodName} -> ${row.effectName}`,
    );
  }
}

function printBindingSetupRows(
  rows: NonNullable<FrameworkObservationValue["bindingSetups"]>,
): void {
  console.log("");
  console.log("sample binding observation setups");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.producerName} ${row.setupKind} ${row.bindingName}.${row.setupMethodName}`,
    );
  }
}

function printFlowSiteRows(
  rows: NonNullable<FrameworkObservationValue["flowSites"]>,
): void {
  console.log("");
  console.log("sample observation flow sites");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.surfaceKind}/${row.siteKind} ${row.ownerName}.${row.methodName} ${row.relation} ${row.targetName}`,
    );
  }
}

function printCollectionMethodRows(
  rows: NonNullable<FrameworkObservationValue["collectionMethods"]>,
): void {
  console.log("");
  console.log("sample collection methods");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.surfaceKind} ${row.receiverKind}.${row.methodName} ${row.actionKind}`,
    );
  }
}

function printFlowEntityLinkRows(
  rows: NonNullable<FrameworkObservationValue["flowEntityLinks"]>,
): void {
  console.log("");
  console.log("sample flow-to-entity links");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.ownerName}.${row.methodName} ${row.targetName} -> ${row.entityPackageId}:${row.entityExportName} (${row.matchBasis})`,
    );
  }
}

function printRelationshipRows(
  rows: NonNullable<FrameworkObservationValue["relationships"]>,
): void {
  console.log("");
  console.log("sample observation relationships");
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.packageId}:${row.relation}/${row.mechanism}/${row.phase} ${row.summary}`,
    );
  }
}
