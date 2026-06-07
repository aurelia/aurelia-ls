import {
  computeAppBuilderCapabilityReconciliation,
  AppBuilderReconciliationFindingSeverity,
  type AppBuilderCapabilityReconciliation,
  type ReconciledAppBuilderDomainFieldValueKind,
  type ReconciledAppBuilderPartCapability,
  type ReconciledAppBuilderSourcePlanCapability,
  type ReconciledAppBuilderSubstrateCapability,
  type ReconciledLoweringAxis,
} from "../inquiry/runtime/app-builder-capability-reconciliation.js";
import { createSourceProject } from "../source/index.js";
import { assertKnownScriptArguments, scriptNumberArgumentValue } from "./script-output.js";

assertKnownScriptArguments("app-builder:reconciliation", ["--detail", "--json", "--rows="]);

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const rows = scriptNumberArgumentValue("--rows=") ?? Number.POSITIVE_INFINITY;

const reconciliation = computeAppBuilderCapabilityReconciliation(createSourceProject());

if (json) {
  console.log(JSON.stringify(reconciliation, null, 2));
  process.exit(0);
}

printReport(reconciliation, detail, rows);

function printReport(report: AppBuilderCapabilityReconciliation, includeDetail: boolean, rowLimit: number): void {
  const { totals } = report;
  console.log("app-builder ↔ framework capability terrain reconciliation");
  console.log(
    `totals: ${totals.axisCount} axes, ${totals.valueCount} values; ${totals.describedLoweringChoiceCount} described lowering choices; ${totals.partCapabilityRowCount} part rows; ${totals.sourcePlanCapabilityRowCount} source-plan rows; ${report.substrateCapabilities.length} substrate rows; ${totals.domainFieldValueKindCount} domain value kinds; ${totals.capabilityRowCount} capability rows; axis-mapped ${totals.axisMappedCapabilityCount}; part-mapped ${totals.partMappedCapabilityCount}; source-plan-mapped ${totals.sourcePlanMappedCapabilityCount}; substrate-mapped ${totals.substrateMappedCapabilityCount}; mapped ${totals.mappedCapabilityCount}; unmapped ${totals.unmappedCapabilityCount}; finding axes ${totals.findingAxisCount}; risk ${totals.riskAxisCount}; review ${totals.reviewAxisCount}; info ${totals.informationAxisCount}`,
  );

  console.log("");
  console.log("axes");
  const axes = report.axes.slice(0, rowLimit);
  for (const axis of axes) {
    printAxis(axis, includeDetail);
  }
  if (axes.length < report.axes.length) {
    console.log(`- ... ${report.axes.length - axes.length} more axes omitted by --rows`);
  }

  console.log("");
  console.log("part-backed capabilities (source-derived from app-builder catalogs)");
  const partCapabilities = report.partCapabilities.slice(0, rowLimit);
  for (const row of partCapabilities) {
    printPartCapability(row, includeDetail);
  }
  if (partCapabilities.length < report.partCapabilities.length) {
    console.log(`- ... ${report.partCapabilities.length - partCapabilities.length} more part rows omitted by --rows`);
  }

  console.log("");
  console.log("source-plan-backed capabilities (source-derived from generated entrypoint/tooling lowerers)");
  const sourcePlanCapabilities = report.sourcePlanCapabilities.slice(0, rowLimit);
  for (const row of sourcePlanCapabilities) {
    printSourcePlanCapability(row, includeDetail);
  }
  if (sourcePlanCapabilities.length < report.sourcePlanCapabilities.length) {
    console.log(`- ... ${report.sourcePlanCapabilities.length - sourcePlanCapabilities.length} more source-plan rows omitted by --rows`);
  }

  console.log("");
  console.log("substrate-backed capabilities (source-derived from app-builder source lowering and validation)");
  const substrateCapabilities = report.substrateCapabilities.slice(0, rowLimit);
  for (const row of substrateCapabilities) {
    printSubstrateCapability(row, includeDetail);
  }
  if (substrateCapabilities.length < report.substrateCapabilities.length) {
    console.log(`- ... ${report.substrateCapabilities.length - substrateCapabilities.length} more substrate rows omitted by --rows`);
  }

  console.log("");
  console.log("domain field value-kind coverage (source-derived app-builder schema)");
  const domainFieldValueKinds = report.domainFieldValueKinds.slice(0, rowLimit);
  for (const row of domainFieldValueKinds) {
    printDomainFieldValueKind(row, includeDetail);
  }
  if (domainFieldValueKinds.length < report.domainFieldValueKinds.length) {
    console.log(`- ... ${report.domainFieldValueKinds.length - domainFieldValueKinds.length} more domain value-kind rows omitted by --rows`);
  }

  console.log("");
  console.log("taste-only values (no capability backing — policy named, not hidden)");
  if (report.tasteOnlyValues.length === 0) {
    console.log("- <none>");
  } else {
    const tasteOnlyValues = report.tasteOnlyValues.slice(0, rowLimit);
    for (const value of tasteOnlyValues) {
      console.log(`- ${value.axisId}:${value.valueId}`);
    }
    if (tasteOnlyValues.length < report.tasteOnlyValues.length) {
      console.log(`- ... ${report.tasteOnlyValues.length - tasteOnlyValues.length} more values omitted by --rows`);
    }
  }

  console.log("");
  console.log("missing capability ids (cited but absent from terrain)");
  const missingCapabilityIds = report.missingCapabilityIds.slice(0, rowLimit);
  console.log(report.missingCapabilityIds.length === 0 ? "- <none>" : missingCapabilityIds.map((id) => `- ${id}`).join("\n"));
  if (missingCapabilityIds.length < report.missingCapabilityIds.length) {
    console.log(`- ... ${report.missingCapabilityIds.length - missingCapabilityIds.length} more ids omitted by --rows`);
  }

  console.log("");
  console.log("unmapped capabilities (terrain rows no axis cites — human triage, not auto-gaps)");
  const unmappedCapabilities = report.unmappedCapabilities.slice(0, rowLimit);
  if (report.unmappedCapabilities.length === 0) {
    console.log("- <none>");
  } else {
    for (const group of unmappedCapabilities) {
      console.log(`- ${group.domain} (${group.capabilityIds.length}): ${group.capabilityIds.join(", ")}`);
    }
  }
  if (unmappedCapabilities.length < report.unmappedCapabilities.length) {
    console.log(`- ... ${report.unmappedCapabilities.length - unmappedCapabilities.length} more groups omitted by --rows`);
  }
}

function printAxis(axis: ReconciledLoweringAxis, includeDetail: boolean): void {
  const headerFindings = includeDetail
    ? axis.findings
    : axis.findings.filter((finding) => finding.severity === AppBuilderReconciliationFindingSeverity.Risk);
  const findings = headerFindings.length === 0
    ? ""
    : `[${headerFindings.map((finding) => `${finding.severity}:${finding.kind}`).join(", ")}] `;
  console.log("");
  console.log(
    `- ${findings}${axis.axisId} (${axis.title}) ${axis.cardinality}; declaredScope=${axis.declaredScope}; roles=${axis.sourceRoles.join(",")}; localities=${axis.localities.join(",") || "<none>"}`,
  );
  if (includeDetail) {
    for (const finding of axis.findings) {
      console.log(`    finding: ${finding.severity}:${finding.kind} - ${finding.summary}`);
    }
  }
  for (const value of axis.values) {
    const capabilities = value.capabilityIds.length === 0 ? "<none>" : value.capabilityIds.join(", ");
    const described = value.describedChoice ? "; described-choice" : "";
    console.log(`    ${value.valueId} [${value.sourceRole}] -> ${capabilities}; loc=${value.localities.join(",") || "<none>"}${described}`);
    if (value.missingCapabilityIds.length > 0) {
      console.log(`      missing: ${value.missingCapabilityIds.join(", ")}`);
    }
    if (!includeDetail) {
      continue;
    }
    if (value.mutuallyExclusiveWith.length > 0) {
      console.log(`      exclusive: ${value.mutuallyExclusiveWith.join(", ")}`);
    }
    if (value.requires.length > 0) {
      console.log(`      requires: ${value.requires.map((requirement) => `${requirement.kind}:${requirement.id}`).join(", ")}`);
    }
    if (value.note !== undefined) {
      console.log(`      note: ${value.note}`);
    }
  }
}

function printPartCapability(row: ReconciledAppBuilderPartCapability, includeDetail: boolean): void {
  const missing = row.missingCapabilityIds.length === 0 ? "" : `; missing=${row.missingCapabilityIds.join(",")}`;
  console.log(`- ${row.partKind}:${row.partId} -> ${row.capabilityIds.join(", ")}${missing}`);
  if (includeDetail) {
    console.log(`    signals: ${row.sourceSignals.join(", ")}`);
    console.log(`    source: ${row.sourceFilePath}`);
  }
}

function printSourcePlanCapability(row: ReconciledAppBuilderSourcePlanCapability, includeDetail: boolean): void {
  const missing = row.missingCapabilityIds.length === 0 ? "" : `; missing=${row.missingCapabilityIds.join(",")}`;
  console.log(`- ${row.sourcePlanId} -> ${row.capabilityIds.join(", ")}${missing}`);
  if (includeDetail) {
    console.log(`    signals: ${row.sourceSignals.join(", ")}`);
    console.log(`    source: ${row.sourceFilePath}`);
  }
}

function printSubstrateCapability(row: ReconciledAppBuilderSubstrateCapability, includeDetail: boolean): void {
  const missing = row.missingCapabilityIds.length === 0 ? "" : `; missing=${row.missingCapabilityIds.join(",")}`;
  console.log(`- ${row.substrateId} -> ${row.capabilityIds.join(", ")}${missing}`);
  if (includeDetail) {
    console.log(`    signals: ${row.sourceSignals.join(", ")}`);
    console.log(`    sources: ${row.sourceFilePaths.join(", ")}`);
  }
}

function printDomainFieldValueKind(row: ReconciledAppBuilderDomainFieldValueKind, includeDetail: boolean): void {
  console.log(`- ${row.valueKind} (${row.enumMemberName}) signals=${row.sourceSignals.join(", ") || "<none>"}`);
  if (includeDetail) {
    console.log(`    sources: ${row.sourceFilePaths.join(", ") || "<none>"}`);
  }
}
