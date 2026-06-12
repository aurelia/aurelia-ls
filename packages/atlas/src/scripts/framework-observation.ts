import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkObservationValue } from "../inquiry/runtime/framework-observation-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
  scriptOptionalStringFilter,
  sourceLabel,
} from "./script-output.js";

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const rows = scriptNumberArgumentValue("--rows=");
const displayRowLimit = rows ?? (detail ? 60 : 20);
const answerRowBudget = rows ?? (detail ? 120 : 40);
const KNOWN_PROJECTIONS = [
  "summary",
  "entities",
  "binding-lookups",
  "binding-setups",
  "surface-methods",
  "flow-sites",
  "dependency-circuit",
  "collection-methods",
  "observer-locator-decisions",
  "flow-entity-links",
  "relationships",
] as const;

if (!KNOWN_PROJECTIONS.includes(projection as typeof KNOWN_PROJECTIONS[number])) {
  console.error(`framework.observation received unknown projection '${projection}'.`);
  console.error(`Known projections: ${KNOWN_PROJECTIONS.join(", ")}`);
  process.exit(1);
}

const filters = {
  ...scriptOptionalStringFilter("packageId"),
  ...scriptOptionalStringFilter("observerKind"),
  ...scriptOptionalStringFilter("observerCapability"),
  ...scriptOptionalStringFilter("surfaceKind"),
  ...scriptOptionalStringFilter("siteKind"),
  ...scriptOptionalStringFilter("methodName"),
  ...scriptOptionalStringFilter("targetName"),
  ...scriptOptionalStringFilter("circuitRole"),
  ...scriptOptionalStringFilter("receiverKind"),
  ...scriptOptionalStringFilter("actionKind"),
  ...scriptOptionalStringFilter("decisionKind"),
  ...scriptOptionalStringFilter("matchBasis"),
  ...scriptOptionalStringFilter("relation"),
  ...scriptOptionalStringFilter("mechanism"),
  ...scriptOptionalStringFilter("phase"),
  ...scriptOptionalStringFilter("query"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkObservation,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`framework.observation:${projection}`, answer);
const value = answerValue<FrameworkObservationValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.observation",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.observation");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value !== undefined) {
  printRollup(value, detail);
}
printObserverRows(value, displayRowLimit, detail);
printBindingLookupRows(value, displayRowLimit, detail);
printBindingSetupRows(value, displayRowLimit, detail);
printSurfaceRows(value, displayRowLimit, detail);
printFlowRows(value, displayRowLimit, detail);
printDependencyCircuitRows(value, displayRowLimit, detail);
printCollectionMethodRows(value, displayRowLimit, detail);
printObserverLocatorDecisionRows(value, displayRowLimit, detail);
printFlowEntityLinkRows(value, displayRowLimit, detail);
printRelationshipRows(value, displayRowLimit, detail);

function printRollup(
  value: FrameworkObservationValue,
  includeCounts: boolean,
): void {
  console.log("");
  console.log("rollup");
  console.log(`- observer entities: ${value.observerCount ?? 0}`);
  console.log(`- binding observer lookups: ${value.bindingLookupCount ?? 0}`);
  console.log(`- binding observation setups: ${value.bindingSetupCount ?? 0}`);
  console.log(`- surface methods: ${value.surfaceMethodCount ?? 0}`);
  console.log(`- flow sites: ${value.flowSiteCount ?? 0}`);
  console.log(`- dependency-circuit rows: ${value.dependencyCircuitCount ?? 0}`);
  console.log(`- collection method rows: ${value.collectionMethodCount ?? 0}`);
  console.log(`- ObserverLocator decisions: ${value.observerLocatorDecisionCount ?? 0}`);
  console.log(`- flow-to-entity links: ${value.flowEntityLinkCount ?? 0}`);
  console.log(`- relationships: ${value.relationshipCount ?? 0}`);
  if (!includeCounts) {
    return;
  }
  printCounts("observer kinds", value.observerKinds ?? {}, 30);
  printCounts("observer capabilities", value.observerCapabilities ?? {}, 30);
  printCounts("binding lookup names", value.bindingLookupNames ?? {}, 30);
  printCounts("binding setup kinds", value.bindingSetupKinds ?? {}, 30);
  printCounts("surface kinds", value.surfaceKinds ?? {}, 30);
  printCounts("flow site kinds", value.flowSiteKinds ?? {}, 40);
  printCounts("dependency circuit roles", value.dependencyCircuitRoles ?? {}, 40);
  printCounts("collection method surface kinds", value.collectionMethodSurfaceKinds ?? {}, 30);
  printCounts("collection method receiver kinds", value.collectionMethodReceiverKinds ?? {}, 30);
  printCounts("collection method action kinds", value.collectionMethodActionKinds ?? {}, 30);
  printCounts("ObserverLocator decision kinds", value.observerLocatorDecisionKinds ?? {}, 40);
  printCounts("ObserverLocator runtime branches", value.observerLocatorRuntimeBranches ?? {}, 40);
  printCounts("flow entity match bases", value.flowEntityMatchBases ?? {}, 30);
  printCounts("relationship relations", value.relationshipRelations ?? {}, 30);
  printCounts("relationship mechanisms", value.relationshipMechanisms ?? {}, 30);
}

function printObserverRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.observers ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("observer entities");
  printEmptyRows(rows, "no framework observer entity rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.exportEntry.exportName}; kinds=${row.observerKinds.join(",")}; capabilities=${row.observerCapabilities.join(",")}`,
    );
    if (includeDetail) {
      console.log(`  resolved=${row.exportEntry.resolvedName}; defaults=${row.defaultImplementationNames.join(",") || "none"}`);
    }
  }
}

function printBindingLookupRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.bindingLookups ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("binding observer lookups");
  printEmptyRows(rows, "no framework binding observer lookup rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.bindingName}.${row.methodName} -> ${row.effectName}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.bindingName}.${row.methodName} reads observer/accessor API ${row.effectName}.`);
    }
  }
}

function printBindingSetupRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.bindingSetups ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("binding observation setups");
  printEmptyRows(rows, "no framework binding observation setup rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.producerName} ${row.setupKind} ${row.bindingName}.${row.setupMethodName}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.producerName} configures observation setup for ${row.bindingName}.`);
    }
  }
}

function printSurfaceRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.surfaceMethods ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("surface methods");
  printEmptyRows(rows, "no framework observation surface method rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.surfaceKind} ${row.ownerName}.${row.methodName}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  params=${row.parameterNames.join(",") || "none"}; returns=${row.declaredReturnType ?? "<inferred>"}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printFlowRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.flowSites ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("flow sites");
  printEmptyRows(rows, "no framework observation flow site rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.surfaceKind}/${row.siteKind} ${row.ownerName}.${row.methodName} ${row.relation} ${row.targetName}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  expression=${row.expressionText}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printDependencyCircuitRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.dependencyCircuits ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("dependency circuit");
  printEmptyRows(rows, "no framework observation dependency-circuit rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.circuitRole} ${row.ownerName}.${row.methodName} ${row.siteKind}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  target=${row.targetName}`);
      console.log(`  expression=${row.expressionText}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printCollectionMethodRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.collectionMethods ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("collection methods");
  printEmptyRows(rows, "no framework observation collection method rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.surfaceKind} ${row.receiverKind}.${row.methodName} ${row.actionKind}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  source=${row.sourceMethodName}; callbackConnectable=${row.callbackConnectable}; wrapsCallbackValue=${row.wrapsCallbackValue}; wrapsResult=${row.wrapsResult}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printObserverLocatorDecisionRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.observerLocatorDecisions ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("ObserverLocator decisions");
  printEmptyRows(rows, "no framework ObserverLocator decision rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.decisionKind} -> ${row.runtimeProduct}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  trigger=${row.trigger}; branch=${row.runtimeBranch}`);
      console.log(`  expression=${row.expressionText}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printFlowEntityLinkRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.flowEntityLinks ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("flow-to-entity links");
  printEmptyRows(rows, "no framework observation flow-to-entity link rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.ownerName}.${row.methodName} ${row.targetName} -> ${row.entityPackageId}:${row.entityExportName}; basis=${row.matchBasis}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printRelationshipRows(
  value: FrameworkObservationValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.relationships ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("relationships");
  printEmptyRows(rows, "no framework observation relationship rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.relation}/${row.mechanism}/${row.phase}; ${row.from.name} -> ${row.to.name}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}
