import { OutcomeKind, type Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type { FrameworkRouterValue } from "../inquiry/runtime/framework-router-lenses.js";
import { createApi } from "../session/index.js";
import { assertHitAnswer, printCounts } from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const summaryAnswer = await askRouter("summary", { rows: 1, evidencePerSubject: 0 });
const issueAnswer = await askOptionalRouter("flow-issues", { rows: 25, evidencePerSubject: 0 });
const recognizerAnswer = await askRouter("recognizer", { rows: 5, evidencePerSubject: 0 });
const recognizerIssueAnswer = await askOptionalRouter("recognizer-issues", { rows: 25, evidencePerSubject: 0 });

const rollup = summaryAnswer.value.rollup;
const issues = issueAnswer?.value.flowIssues ?? [];
const recognizerRows = recognizerAnswer.value.routeRecognizerMechanics ?? [];
const recognizerIssues = recognizerIssueAnswer?.value.routeRecognizerMechanicIssues ?? [];

console.log("framework.router pressure");
console.log("scope: framework router rollup, curated flow spine, recognizer mechanics, relationship axes, and self-audits");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("router topology");
console.log(`- packages: ${rollup.packageCount}`);
console.log(`- source files: ${rollup.sourceFileCount}`);
console.log(`- surfaces: ${rollup.surfaceCount}`);
console.log(`- flows: ${rollup.flowCount}`);
console.log(`- curated descriptors: ${rollup.flowDescriptorCount}`);
console.log(`- relationships: ${rollup.relationshipCount}`);
console.log(`- route-recognizer mechanic descriptors: ${rollup.routeRecognizerMechanicDescriptorCount}`);
console.log(`- route-recognizer mechanics: ${rollup.routeRecognizerMechanicCount}`);

console.log("");
console.log("router surface counts");
console.log(`- entities: ${rollup.entityCount}`);
console.log(`- configuration: ${rollup.configurationCount}`);
console.log(`- route contexts: ${rollup.routeContextCount}`);
console.log(`- route trees: ${rollup.routeTreeCount}`);
console.log(`- route recognizers: ${rollup.routeRecognizerCount}`);
console.log(`- viewport agents: ${rollup.viewportAgentCount}`);
console.log(`- navigation: ${rollup.navigationCount}`);
console.log(`- DI: ${rollup.diCount}`);
console.log(`- resources: ${rollup.resourceCount}`);
console.log(`- lifecycle: ${rollup.lifecycleCount}`);

console.log("");
console.log("flow self-audit");
console.log(`- issue rows: ${rollup.flowIssueCount}`);
console.log(`- unmaterialized descriptors: ${rollup.unmaterializedFlowDescriptorCount}`);
console.log(`- multi-materialized descriptors: ${rollup.multiMaterializedFlowDescriptorCount}`);
console.log(`- duplicate sequences: ${rollup.duplicateFlowSequenceCount}`);
for (const issue of issues) {
  console.log(`- ${issue.kind}: ${issueLabel(issue)} (${issue.count})`);
}

console.log("");
console.log("route-recognizer self-audit");
console.log(`- issue rows: ${rollup.routeRecognizerMechanicIssueCount}`);
console.log(`- unmaterialized descriptors: ${rollup.routeRecognizerMechanicUnmaterializedDescriptorCount}`);
console.log(`- multi-materialized descriptors: ${rollup.routeRecognizerMechanicMultiMaterializedDescriptorCount}`);
for (const issue of recognizerIssues) {
  console.log(`- ${issue.kind}: ${issue.descriptorKey} (${issue.count})`);
}

printCounts("flow stages", rollup.flowStages, 30);
printCounts("relationship relations", rollup.relationshipRelations, 30);
printCounts("relationship mechanisms", rollup.relationshipMechanisms, 30);
printCounts("relationship phases", rollup.relationshipPhases, 30);
printCounts("route-recognizer mechanic phases", rollup.routeRecognizerMechanicPhases, 30);
printCounts("route-recognizer mechanic products", rollup.routeRecognizerMechanicProducts, 30);
printCounts("route-recognizer mechanic kinds", rollup.routeRecognizerMechanicKinds, 30);

console.log("");
console.log("route-recognizer sample mechanics");
for (const row of recognizerRows) {
  console.log(`- ${row.phase}/${row.product}: ${row.name}`);
}

async function askRouter(
  projection: string,
  budget: { readonly rows: number; readonly evidencePerSubject: number },
): Promise<Answer<FrameworkRouterValue> & { readonly value: FrameworkRouterValue }> {
  const answer = await api.ask({
    lens: LensId.FrameworkRouter,
    locus: { kind: LocusKind.Repo },
    projection,
    budget,
  });
  assertHitAnswer<FrameworkRouterValue>(
    `framework.router ${projection}`,
    answer,
  );
  return answer;
}

function issueLabel(
  issue: NonNullable<FrameworkRouterValue["flowIssues"]>[number],
): string {
  if (issue.descriptorKey != null) {
    return issue.descriptorKey;
  }
  if (issue.sequence != null) {
    return `sequence ${issue.sequence}`;
  }
  return "missing descriptor and sequence";
}

async function askOptionalRouter(
  projection: string,
  budget: { readonly rows: number; readonly evidencePerSubject: number },
): Promise<(Answer<FrameworkRouterValue> & { readonly value: FrameworkRouterValue }) | null> {
  const answer = await api.ask({
    lens: LensId.FrameworkRouter,
    locus: { kind: LocusKind.Repo },
    projection,
    budget,
  });
  if (answer.outcome === OutcomeKind.Miss) {
    return null;
  }
  assertHitAnswer<FrameworkRouterValue>(
    `framework.router ${projection}`,
    answer,
  );
  return answer;
}
