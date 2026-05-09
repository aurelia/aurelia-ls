import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type {
  WorkspaceArchitectureValue,
} from "../inquiry/runtime/workspace-architecture-lenses.js";
import type {
  WorkspacePackageRow,
} from "../inquiry/runtime/workspace-architecture-analysis.js";
import { createApi } from "../session/index.js";
import {
  assertHitAnswer,
  countRows,
  filterCounts,
  printCounts,
} from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const packageAnswer = await api.ask({
  lens: LensId.WorkspaceArchitecture,
  locus: { kind: LocusKind.Repo },
  projection: "packages",
  budget: { rows: 1_000, evidencePerSubject: 0 },
});
const [
  externalBindableAnswer,
  appShapeBindableAnswer,
  externalRouterAnswer,
  appShapeRouterAnswer,
] = await Promise.all([
  api.ask({
    lens: LensId.WorkspaceArchitecture,
    locus: { kind: LocusKind.Repo },
    projection: "summary",
    filters: { admissionRole: "external", kind: "bindable" },
    budget: { rows: 0, evidencePerSubject: 0 },
  }),
  api.ask({
    lens: LensId.WorkspaceArchitecture,
    locus: { kind: LocusKind.Repo },
    projection: "summary",
    filters: { aureliaShape: "aurelia-app", kind: "bindable" },
    budget: { rows: 0, evidencePerSubject: 0 },
  }),
  api.ask({
    lens: LensId.WorkspaceArchitecture,
    locus: { kind: LocusKind.Repo },
    projection: "summary",
    filters: { admissionRole: "external", kind: "router" },
    budget: { rows: 0, evidencePerSubject: 0 },
  }),
  api.ask({
    lens: LensId.WorkspaceArchitecture,
    locus: { kind: LocusKind.Repo },
    projection: "summary",
    filters: { aureliaShape: "aurelia-app", kind: "router" },
    budget: { rows: 0, evidencePerSubject: 0 },
  }),
]);

assertHitAnswer<WorkspaceArchitectureValue>(
  "workspace.architecture packages",
  packageAnswer,
);
assertHitAnswer<WorkspaceArchitectureValue>(
  "workspace.architecture external bindables",
  externalBindableAnswer,
);
assertHitAnswer<WorkspaceArchitectureValue>(
  "workspace.architecture app-shape bindables",
  appShapeBindableAnswer,
);
assertHitAnswer<WorkspaceArchitectureValue>(
  "workspace.architecture external router",
  externalRouterAnswer,
);
assertHitAnswer<WorkspaceArchitectureValue>(
  "workspace.architecture app-shape router",
  appShapeRouterAnswer,
);

const rollup = packageAnswer.value.rollup;
const packages = packageAnswer.value.packages ?? [];
const externalPackages = packages.filter((row) => row.external);
const appShapePackages = packages.filter((row) => row.aureliaShape === "aurelia-app");

console.log("workspace.architecture pressure");
console.log(
  "scope: aggregate rollup only; row names, source paths, and summaries are intentionally omitted",
);
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("package topology");
console.log(`- packages: ${rollup.packageCount}`);
console.log(`- external packages: ${rollup.externalPackageCount}`);
console.log(`- Aurelia-shaped packages: ${rollup.aureliaPackageCount}`);
console.log(`- app-shaped packages: ${rollup.appPackageCount}`);
console.log(`- public plugin packages: ${rollup.publicPluginPackageCount}`);
console.log(`- source files: ${rollup.sourceFileCount}`);

console.log("");
console.log("source role pressure");
console.log(`- app source files: ${rollup.appSourceFileCount}`);
console.log(`- template files: ${rollup.templateFileCount}`);
console.log(`- style files: ${rollup.styleFileCount}`);
console.log(`- test source files: ${rollup.testSourceFileCount}`);
console.log(`- example source files: ${rollup.exampleSourceFileCount}`);
console.log(`- tooling config files: ${rollup.toolingConfigFileCount}`);
console.log(`- declaration source files: ${rollup.declarationSourceFileCount}`);
console.log(`- generated source files: ${rollup.generatedSourceFileCount}`);
console.log(`- config diagnostics: ${rollup.configDiagnosticCount}`);

console.log("");
console.log("surface pressure");
console.log(`- surfaces: ${rollup.surfaceCount}`);
console.log(`- app entrypoints: ${rollup.entrypointCount}`);
console.log(`- resources: ${rollup.resourceCount}`);
console.log(`- bindables: ${rollup.bindableCount}`);
console.log(`- registrations: ${rollup.registrationCount}`);
console.log(`- router surfaces: ${rollup.routerSurfaceCount}`);
console.log(`- template references: ${rollup.templateReferenceCount}`);
printCounts("surface kinds", rollup.surfaceKinds);
printCounts("surface mechanisms", rollup.surfaceMechanisms, 12);
printCounts(
  "bindable mechanisms",
  filterCounts(rollup.surfaceMechanisms, (mechanism) =>
    mechanism.startsWith("bindable"),
  ),
  30,
);
printCounts(
  "external bindable mechanisms",
  externalBindableAnswer.value.rollup.surfaceMechanisms,
  30,
);
printCounts(
  "app-shaped bindable mechanisms",
  appShapeBindableAnswer.value.rollup.surfaceMechanisms,
  30,
);
printCounts("manifest dependency mechanisms", rollup.manifestDependencyMechanisms, 12);
printCounts("resource mechanisms", rollup.resourceMechanisms, 12);
printCounts("configuration mechanisms", rollup.configurationMechanisms, 12);
printCounts("registration mechanisms", rollup.registrationMechanisms, 12);
printCounts("DI resolution mechanisms", rollup.diResolutionMechanisms, 12);
printCounts("router mechanisms", rollup.routerMechanisms, 12);
printCounts(
  "external router mechanisms",
  externalRouterAnswer.value.rollup.routerMechanisms,
  30,
);
printCounts(
  "app-shaped router mechanisms",
  appShapeRouterAnswer.value.rollup.routerMechanisms,
  30,
);
printCounts(
  "router route-config mechanisms",
  filterCounts(rollup.routerMechanisms, (mechanism) =>
    mechanism.startsWith("route-config"),
  ),
  30,
);
printRouteConfigFacets("router route-config facets", rollup.routerRouteConfigFacets);
printRouteConfigFacets(
  "external router route-config facets",
  externalRouterAnswer.value.rollup.routerRouteConfigFacets,
);
printRouteConfigFacets(
  "app-shaped router route-config facets",
  appShapeRouterAnswer.value.rollup.routerRouteConfigFacets,
);
printCounts("template reference mechanisms", rollup.templateReferenceMechanisms, 12);
printCounts("admission roles", rollup.packageAdmissionRoles);
printCounts("Aurelia shapes", rollup.packageAureliaShapes);
printCounts("package managers", rollup.packageManagers);
printCounts("build tool hints", rollup.buildToolHints);
printPackageSubset("external package pressure", externalPackages);
printPackageSubset("app-shaped package pressure", appShapePackages);

function printRouteConfigFacets(
  label: string,
  facets: Readonly<Record<string, number>>,
): void {
  if (Object.keys(facets).length === 0) {
    console.log("");
    console.log(label);
    console.log("- none");
    return;
  }
  printCounts(
    `${label}: carriers`,
    filterCounts(facets, (facet) => facet.startsWith("route-config.carrier:")),
    12,
  );
  printCounts(
    `${label}: object fields`,
    filterCounts(facets, (facet) =>
      facet.startsWith("route-config.object.fields:"),
    ),
    12,
  );
  printCounts(
    `${label}: component value kinds`,
    filterCounts(facets, (facet) =>
      facet.startsWith("route-config.component.value-kind:"),
    ),
    12,
  );
  printCounts(
    `${label}: routes value kinds`,
    filterCounts(facets, (facet) =>
      facet.startsWith("route-config.routes.value-kind:") ||
      facet.startsWith("route-config.routes.array-length:"),
    ),
    12,
  );
}

function printPackageSubset(
  label: string,
  rows: readonly WorkspacePackageRow[],
): void {
  console.log("");
  console.log(label);
  if (rows.length === 0) {
    console.log("- none");
    return;
  }
  console.log(`- packages: ${rows.length}`);
  console.log(`- source files: ${rows.reduce((sum, row) => sum + row.sourceFileCount, 0)}`);
  console.log(`- app source files: ${rows.reduce((sum, row) => sum + row.appSourceFileCount, 0)}`);
  console.log(`- template files: ${rows.reduce((sum, row) => sum + row.templateFileCount, 0)}`);
  console.log(`- style files: ${rows.reduce((sum, row) => sum + row.styleFileCount, 0)}`);
  console.log(`- surfaces: ${rows.reduce((sum, row) => sum + row.surfaceCount, 0)}`);
  console.log(`- app entrypoints: ${rows.reduce((sum, row) => sum + row.entrypointCount, 0)}`);
  console.log(`- resources: ${rows.reduce((sum, row) => sum + row.resourceCount, 0)}`);
  console.log(`- bindables: ${rows.reduce((sum, row) => sum + row.bindableCount, 0)}`);
  console.log(`- configurations: ${rows.reduce((sum, row) => sum + row.configurationCount, 0)}`);
  console.log(`- registrations: ${rows.reduce((sum, row) => sum + row.registrationCount, 0)}`);
  console.log(`- DI resolutions: ${rows.reduce((sum, row) => sum + row.diResolutionCount, 0)}`);
  console.log(`- router surfaces: ${rows.reduce((sum, row) => sum + row.routerSurfaceCount, 0)}`);
  console.log(`- template references: ${rows.reduce((sum, row) => sum + row.templateReferenceCount, 0)}`);
  printCounts(`${label} package managers`, countPackageManagers(rows), 10);
  printCounts(`${label} build tool hints`, countBuildToolHints(rows), 10);
}

function countPackageManagers(
  rows: readonly WorkspacePackageRow[],
): Readonly<Record<string, number>> {
  return countRows(
    rows.flatMap((row) =>
      row.packageManager === null ? [] : [{ packageManager: row.packageManager }],
    ),
    (row) => row.packageManager,
  );
}

function countBuildToolHints(
  rows: readonly WorkspacePackageRow[],
): Readonly<Record<string, number>> {
  return countRows(
    rows.flatMap((row) => row.buildToolHints.map((hint) => ({ hint }))),
    (row) => row.hint,
  );
}
