import type { Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type {
  FrameworkResourceConvergenceRow,
  FrameworkResourcesValue,
} from "../inquiry/runtime/framework-resource-lenses.js";
import { createApi } from "../session/index.js";
import { assertHitAnswer, printCounts } from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const convergenceAnswer = await askResources("convergence", {
  rows: 20,
  evidencePerSubject: 0,
});

const value = convergenceAnswer.value;
const sampleRows = convergenceAnswer.value.convergenceRows ?? [];

console.log("framework.resources pressure");
console.log("scope: resource convergence lanes, exact source-site roles, and open provenance pressure");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("resource convergence");
console.log(`- rows: ${value.resourceConvergenceCount}`);
console.log(`- open reasons: ${value.openReasonCount}`);

printCounts("resource kinds", value.resourceKinds, 30);
printCounts("carrier kinds", value.carrierKinds, 30);
printCounts("carrier source roles", value.carrierSourceRoles, 30);
printCounts("lanes", value.lanes, 30);
printCounts("source-site roles", value.sourceSiteRoles, 30);

console.log("");
console.log("provenance pressure");
console.log(`- inspected rows: ${value.resourceConvergenceCount}`);
console.log(`- missing definition source site: ${value.missingDefinitionSourceSiteCount}`);
console.log(`- only definition source site: ${value.onlyDefinitionSourceSiteCount}`);
console.log(`- definition source same as declaration: ${value.definitionSourceSameAsDeclarationCount}`);
console.log(`- definition source differs from declaration: ${value.definitionSourceDiffersFromDeclarationCount}`);
console.log(`- open inspected rows: ${value.openConvergenceRowCount}`);

printRowsWithMostSites(sampleRows);

async function askResources(
  projection: string,
  budget: { readonly rows: number; readonly evidencePerSubject: number },
): Promise<Answer<FrameworkResourcesValue> & { readonly value: FrameworkResourcesValue }> {
  const answer = await api.ask({
    lens: LensId.FrameworkResources,
    locus: { kind: LocusKind.Repo },
    projection,
    budget,
  });
  assertHitAnswer<FrameworkResourcesValue>(
    `framework.resources ${projection}`,
    answer,
  );
  return answer;
}

function printRowsWithMostSites(
  rows: readonly FrameworkResourceConvergenceRow[],
): void {
  const ranked = [...rows]
    .sort(
      (left, right) =>
        right.sourceSites.length - left.sourceSites.length ||
        left.sourceExportName.localeCompare(right.sourceExportName),
    )
    .slice(0, 8);

  console.log("");
  console.log("sample page rows with broadest provenance");
  if (ranked.length === 0) {
    console.log("- none");
    return;
  }
  for (const row of ranked) {
    console.log(
      `- ${row.packageId}:${row.sourceExportName} (${row.resourceKind}) sites=${row.sourceSites.length} lanes=${row.lanes.join(",")}`,
    );
  }
}
