import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkCapabilitiesValue } from "../inquiry/runtime/framework-capability-lenses.js";
import type { FrameworkReverseCoverageFamily } from "../inquiry/runtime/framework-capability-territory.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  assertKnownScriptArguments,
  scriptNumberArgumentValue,
} from "./script-output.js";

/**
 * Print the framework-capabilities reverse-coverage projection.
 *
 * The inquiry runtime owns the join. Keeping a second script-local join here previously let bounded faceted mappings
 * masquerade as unqualified correspondences independently of the live lens.
 */
assertKnownScriptArguments("framework:reverse-coverage", ["--json", "--rows=", "--shapeCap="]);

const json = process.argv.includes("--json");
const rowBudget = scriptNumberArgumentValue("--rows=") ?? 600;
const noisyShapeCap = scriptNumberArgumentValue("--shapeCap=") ?? 12;
const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const answer = await api.ask({
  lens: LensId.FrameworkCapabilities,
  locus: RepoRootLocus,
  projection: "reverse-coverage",
  budget: { rows: rowBudget, evidencePerSubject: 0 },
});
assertHitOrMissAnswer("framework.capabilities:reverse-coverage", answer);
const families =
  answerValue<FrameworkCapabilitiesValue>(answer)?.reverseCoverageRows ?? [];

if (json) {
  console.log(JSON.stringify(
    { tool: "framework.capability-reverse-coverage", families },
    null,
    2,
  ));
  process.exit(0);
}

console.log("framework.capability-reverse-coverage");
for (const coverage of families) {
  printCoverage(coverage);
}

function printCoverage(coverage: FrameworkReverseCoverageFamily): void {
  console.log("");
  console.log(
    `family ${coverage.family}: ${coverage.total} construct(s); modeled ${coverage.modeled} `
      + `(unqualified ${coverage.unqualifiedModeled}, facet-only ${coverage.facetOnlyModeled}, `
      + `unresolved ${coverage.unresolvedMappings}, `
      + `role evidence ${coverage.modeledWithRoleEvidence}); instantiable `
      + `${coverage.instantiableModeled}/${coverage.instantiableTotal} modeled `
      + `(unqualified ${coverage.instantiableUnqualifiedModeled}, facet-only ${coverage.instantiableFacetOnlyModeled}, `
      + `unresolved ${coverage.instantiableUnresolvedMappings})`,
  );
  console.log(
    `  basis: framework ${coverage.basisClosure} ${coverage.basisRowCount}/${coverage.basisTotalRows ?? "unknown"}; `
      + `auLink mappings ${coverage.mappingBasisClosure} ${coverage.mappingBasisRowCount}/${coverage.mappingBasisTotalRows ?? "unknown"}`,
  );
  printGroups(coverage.facetOnlyByShape, "facet-only");
  printGroups(coverage.unresolvedByShape, "unresolved");
  printGroups(coverage.notModeledByShape, "not modeled");
}

function printGroups(
  groups: FrameworkReverseCoverageFamily["notModeledByShape"],
  label: string,
): void {
  for (const group of groups) {
    const cap = group.instantiable ? group.symbols.length : noisyShapeCap;
    const shown = group.symbols.slice(0, cap);
    const more = group.symbols.length - shown.length;
    console.log(
      `  ${label} [${group.shape}] (${group.symbols.length}): ${shown.join(", ")}`
        + `${more > 0 ? `, +${more} more` : ""}`,
    );
  }
}
