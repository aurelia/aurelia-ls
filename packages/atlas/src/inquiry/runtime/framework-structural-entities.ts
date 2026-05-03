import {
  SourceProjectKeyedMemo,
  type SourceProject,
} from "../../source/index.js";
import {
  candidateExportNamesForPackage,
  catalogClassificationTexts,
  catalogEntityMatchesQuery,
  catalogExportShapeForPackageExport,
  catalogMatchesForPackageExport,
  frameworkPackageIdsForEntityFilters,
  packageExportsForCandidateNames,
} from "./framework-catalog-helpers.js";
import {
  normalizeIdentifierText,
  uniqueEnumValues,
} from "./framework-catalog-utils.js";
import {
  FrameworkAppTaskCapability,
  FrameworkAppTaskEntityKind,
  FrameworkExpressionCapability,
  FrameworkExpressionEntityKind,
  FrameworkRenderingCapability,
  FrameworkRenderingStructureKind,
  FrameworkRouterCapability,
  FrameworkRouterEntityKind,
  type FrameworkAppTaskEntityRow,
  type FrameworkExpressionEntityRow,
  type FrameworkPackageExportRow,
  type FrameworkRenderingStructureEntityRow,
  type FrameworkRouterEntityRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";

const appTaskEntityRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkAppTaskEntityRow[]
>();
const routerEntityRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkRouterEntityRow[]
>();
const expressionEntityRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkExpressionEntityRow[]
>();
const renderingStructureRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkRenderingStructureEntityRow[]
>();

export function readFrameworkAppTaskEntities(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkAppTaskEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForFilters(packageNames, filters).flatMap(
    (packageId) =>
      readFrameworkAppTaskEntityPackageRows(
        sourceProject,
        packageId,
        packageNames.get(packageId) ?? packageId,
      ),
  );
  return rows
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.exportEntry.exportName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.appTaskKind === undefined ||
        row.appTaskKinds.includes(
          filters.appTaskKind as FrameworkAppTaskEntityKind,
        ),
    )
    .filter(
      (row) =>
        filters.appTaskCapability === undefined ||
        row.appTaskCapabilities.includes(
          filters.appTaskCapability as FrameworkAppTaskCapability,
        ),
    )
    .filter(
      (row) =>
        filters.exportShape === undefined ||
        row.exportShape === filters.exportShape,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        catalogEntityMatchesQuery(
          row,
          filters.query,
          row.appTaskKinds,
          row.appTaskCapabilities,
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.appTaskKinds
          .join(",")
          .localeCompare(right.appTaskKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkAppTaskEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
): readonly FrameworkAppTaskEntityRow[] {
  return appTaskEntityRowsByPackage.read(sourceProject, packageId, () => {
    const candidateNames = candidateExportNamesForPackage(
      sourceProject,
      packageId,
      false,
      isAppTaskNameCandidate,
    );
    return packageExportsForCandidateNames(
      sourceProject,
      packageId,
      candidateNames,
      false,
    ).flatMap((row) => appTaskEntityRowForPackageExport(row));
  });
}

export function appTaskEntityRowForPackageExport(
  row: FrameworkPackageExportRow,
): readonly FrameworkAppTaskEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(
    row,
    isAppTaskMatchText,
    false,
  );
  const appTaskKinds = appTaskKindsForPackageExport(row);
  if (appTaskKinds.length === 0) {
    return [];
  }
  return [
    {
      ...row,
      appTaskKinds,
      exportShape: catalogExportShapeForPackageExport(row),
      appTaskCapabilities: appTaskCapabilitiesForEntity(row, appTaskKinds),
      matchedBy,
    },
  ];
}

export function readFrameworkRouterEntities(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkRouterEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, [
    "router",
    "route-recognizer",
    "aurelia",
  ]).flatMap((packageId) =>
    readFrameworkRouterEntityPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.exportEntry.exportName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.routerKind === undefined ||
        row.routerKinds.includes(
          filters.routerKind as FrameworkRouterEntityKind,
        ),
    )
    .filter(
      (row) =>
        filters.routerCapability === undefined ||
        row.routerCapabilities.includes(
          filters.routerCapability as FrameworkRouterCapability,
        ),
    )
    .filter(
      (row) =>
        filters.exportShape === undefined ||
        row.exportShape === filters.exportShape,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        catalogEntityMatchesQuery(
          row,
          filters.query,
          row.routerKinds,
          row.routerCapabilities,
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.routerKinds.join(",").localeCompare(right.routerKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkRouterEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
): readonly FrameworkRouterEntityRow[] {
  return routerEntityRowsByPackage.read(sourceProject, packageId, () => {
    const includePackage =
      packageId === "router" || packageId === "route-recognizer";
    const candidateNames = candidateExportNamesForPackage(
      sourceProject,
      packageId,
      includePackage,
      isRouterNameCandidate,
    );
    return packageExportsForCandidateNames(
      sourceProject,
      packageId,
      candidateNames,
      packageId === "router",
    ).flatMap((row) => routerEntityRowForPackageExport(row, includePackage));
  });
}

export function routerEntityRowForPackageExport(
  row: FrameworkPackageExportRow,
  packageAdmitted: boolean,
): readonly FrameworkRouterEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(
    row,
    isRouterMatchText,
    packageAdmitted,
  );
  const routerKinds = routerKindsForPackageExport(row, packageAdmitted);
  if (routerKinds.length === 0) {
    return [];
  }
  return [
    {
      ...row,
      routerKinds,
      exportShape: catalogExportShapeForPackageExport(row),
      routerCapabilities: routerCapabilitiesForEntity(row, routerKinds),
      matchedBy,
    },
  ];
}

export function readFrameworkExpressionEntities(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkExpressionEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, [
    "expression-parser",
    "runtime",
    "runtime-html",
    "template-compiler",
    "aurelia",
  ]).flatMap((packageId) =>
    readFrameworkExpressionEntityPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.exportEntry.exportName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.expressionKind === undefined ||
        row.expressionKinds.includes(
          filters.expressionKind as FrameworkExpressionEntityKind,
        ),
    )
    .filter(
      (row) =>
        filters.expressionCapability === undefined ||
        row.expressionCapabilities.includes(
          filters.expressionCapability as FrameworkExpressionCapability,
        ),
    )
    .filter(
      (row) =>
        filters.exportShape === undefined ||
        row.exportShape === filters.exportShape,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        catalogEntityMatchesQuery(
          row,
          filters.query,
          row.expressionKinds,
          row.expressionCapabilities,
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.expressionKinds
          .join(",")
          .localeCompare(right.expressionKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkExpressionEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
): readonly FrameworkExpressionEntityRow[] {
  return expressionEntityRowsByPackage.read(sourceProject, packageId, () => {
    const includePackage = packageId === "expression-parser";
    const candidateNames = candidateExportNamesForPackage(
      sourceProject,
      packageId,
      includePackage,
      isExpressionNameCandidate,
    );
    return packageExportsForCandidateNames(
      sourceProject,
      packageId,
      candidateNames,
      false,
    ).flatMap((row) =>
      expressionEntityRowForPackageExport(row, includePackage),
    );
  });
}

export function expressionEntityRowForPackageExport(
  row: FrameworkPackageExportRow,
  packageAdmitted: boolean,
): readonly FrameworkExpressionEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(
    row,
    isExpressionMatchText,
    packageAdmitted,
  );
  const expressionKinds = expressionKindsForPackageExport(row, packageAdmitted);
  if (expressionKinds.length === 0) {
    return [];
  }
  return [
    {
      ...row,
      expressionKinds,
      exportShape: catalogExportShapeForPackageExport(row),
      expressionCapabilities: expressionCapabilitiesForEntity(
        row,
        expressionKinds,
      ),
      matchedBy,
    },
  ];
}

export function readFrameworkRenderingStructures(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkRenderingStructureEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, [
    "runtime-html",
    "template-compiler",
    "runtime",
    "aurelia",
  ]).flatMap((packageId) =>
    readFrameworkRenderingStructurePackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.exportEntry.exportName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.renderingStructureKind === undefined ||
        row.renderingStructureKinds.includes(
          filters.renderingStructureKind as FrameworkRenderingStructureKind,
        ),
    )
    .filter(
      (row) =>
        filters.renderingCapability === undefined ||
        row.renderingCapabilities.includes(
          filters.renderingCapability as FrameworkRenderingCapability,
        ),
    )
    .filter(
      (row) =>
        filters.exportShape === undefined ||
        row.exportShape === filters.exportShape,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        catalogEntityMatchesQuery(
          row,
          filters.query,
          row.renderingStructureKinds,
          row.renderingCapabilities,
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.renderingStructureKinds
          .join(",")
          .localeCompare(right.renderingStructureKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkRenderingStructurePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
): readonly FrameworkRenderingStructureEntityRow[] {
  return renderingStructureRowsByPackage.read(
    sourceProject,
    packageId,
    () => {
      const candidateNames = candidateExportNamesForPackage(
        sourceProject,
        packageId,
        false,
        isRenderingStructureNameCandidate,
      );
      return packageExportsForCandidateNames(
        sourceProject,
        packageId,
        candidateNames,
        false,
      ).flatMap((row) => renderingStructureRowForPackageExport(row));
    },
  );
}

export function renderingStructureRowForPackageExport(
  row: FrameworkPackageExportRow,
): readonly FrameworkRenderingStructureEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(
    row,
    isRenderingStructureMatchText,
    false,
  );
  const renderingStructureKinds = renderingStructureKindsForPackageExport(row);
  if (renderingStructureKinds.length === 0) {
    return [];
  }
  return [
    {
      ...row,
      renderingStructureKinds,
      exportShape: catalogExportShapeForPackageExport(row),
      renderingCapabilities: renderingCapabilitiesForEntity(
        row,
        renderingStructureKinds,
      ),
      matchedBy,
    },
  ];
}

export function appTaskKindsForPackageExport(
  row: FrameworkPackageExportRow,
): readonly FrameworkAppTaskEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkAppTaskEntityKind[] = [];
  if (texts.some((text) => text === "apptask")) {
    kinds.push(FrameworkAppTaskEntityKind.AppTaskFactory);
  }
  if (texts.some((text) => text === "iapptask")) {
    kinds.push(FrameworkAppTaskEntityKind.AppTaskKey);
  }
  if (
    texts.some(
      (text) =>
        text.includes("taskslot") ||
        text.includes("creating") ||
        text.includes("hydrating") ||
        text.includes("activated"),
    )
  ) {
    kinds.push(FrameworkAppTaskEntityKind.TaskSlot);
  }
  if (texts.some((text) => text.includes("callback"))) {
    kinds.push(FrameworkAppTaskEntityKind.TaskCallback);
  }
  if (
    texts.some(
      (text) =>
        text === "task" ||
        text === "recurringtask" ||
        text === "taskstatus" ||
        text === "taskaborterror",
    )
  ) {
    kinds.push(FrameworkAppTaskEntityKind.Task);
  }
  if (
    texts.some(
      (text) =>
        text.includes("queuetask") ||
        text.includes("run_tasks") ||
        text.includes("runtasks") ||
        text.includes("taskqueue") ||
        text.includes("taskssettled") ||
        text.includes("istaskqueueempty") ||
        text.includes("getrecurringtasks"),
    )
  ) {
    kinds.push(FrameworkAppTaskEntityKind.TaskQueue);
  }
  if (texts.some((text) => text.includes("lifecyclehook"))) {
    kinds.push(FrameworkAppTaskEntityKind.LifecycleHook);
  }
  return uniqueEnumValues(kinds);
}

export function appTaskCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  kinds: readonly FrameworkAppTaskEntityKind[],
): readonly FrameworkAppTaskCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkAppTaskCapability[] = [];
  if (
    kindSet.has(FrameworkAppTaskEntityKind.AppTaskFactory) ||
    kindSet.has(FrameworkAppTaskEntityKind.AppTaskKey) ||
    kindSet.has(FrameworkAppTaskEntityKind.TaskSlot) ||
    row.exportEntry.memberNames.includes("register")
  ) {
    capabilities.push(FrameworkAppTaskCapability.Register);
  }
  if (
    kindSet.has(FrameworkAppTaskEntityKind.AppTaskFactory) ||
    kindSet.has(FrameworkAppTaskEntityKind.TaskSlot) ||
    kindSet.has(FrameworkAppTaskEntityKind.LifecycleHook)
  ) {
    capabilities.push(FrameworkAppTaskCapability.LifecyclePhase);
  }
  if (kindSet.has(FrameworkAppTaskEntityKind.TaskCallback)) {
    capabilities.push(FrameworkAppTaskCapability.Callback);
  }
  if (
    texts.some((text) => text.includes("queue") || text.includes("recurring"))
  ) {
    capabilities.push(FrameworkAppTaskCapability.Queue);
  }
  if (
    texts.some(
      (text) => text.includes("runtasks") || text.includes("taskssettled"),
    )
  ) {
    capabilities.push(FrameworkAppTaskCapability.Run);
  }
  if (texts.some((text) => text.includes("status") || text.includes("empty"))) {
    capabilities.push(FrameworkAppTaskCapability.Status);
  }
  return uniqueEnumValues(capabilities);
}

export function routerKindsForPackageExport(
  row: FrameworkPackageExportRow,
  packageAdmitted: boolean,
): readonly FrameworkRouterEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkRouterEntityKind[] = [];
  if (
    texts.some(
      (text) =>
        text === "router" ||
        text.includes("contextrouter") ||
        text.includes("routeroptions"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.Router);
  }
  if (
    texts.some(
      (text) =>
        text.includes("configuration") ||
        text.includes("registration") ||
        text.includes("options"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.Configuration);
  }
  if (
    texts.some(
      (text) =>
        text.includes("routeconfig") ||
        text === "route" ||
        text.includes("routeable") ||
        text.includes("routetype") ||
        text.includes("routeparameter"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.Route);
  }
  if (texts.some((text) => text.includes("routecontext"))) {
    kinds.push(FrameworkRouterEntityKind.RouteContext);
  }
  if (
    texts.some(
      (text) => text.includes("routetree") || text.includes("routenode"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.RouteTree);
  }
  if (
    texts.some(
      (text) => text.includes("navigation") || text.includes("transition"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.Navigation);
  }
  if (texts.some((text) => text.includes("viewport"))) {
    kinds.push(FrameworkRouterEntityKind.Viewport);
  }
  if (texts.some((text) => text.includes("endpoint"))) {
    kinds.push(FrameworkRouterEntityKind.Endpoint);
  }
  if (
    texts.some((text) => text.includes("location") || text.includes("history"))
  ) {
    kinds.push(FrameworkRouterEntityKind.Location);
  }
  if (
    texts.some(
      (text) =>
        text.includes("urlparser") ||
        text.includes("fragmenturlparser") ||
        text.includes("pathurlparser"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.UrlParser);
  }
  if (
    texts.some(
      (text) =>
        text.includes("recognizer") ||
        text.includes("recognizedroute") ||
        text.includes("configurableroute") ||
        text === "parameter",
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.Recognizer);
  }
  if (texts.some((text) => text.includes("event"))) {
    kinds.push(FrameworkRouterEntityKind.Event);
  }
  if (
    texts.some(
      (text) => text.includes("state") || text.includes("managedstate"),
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.State);
  }
  if (texts.some((text) => text.includes("instruction"))) {
    kinds.push(FrameworkRouterEntityKind.Instruction);
  }
  if (
    texts.some(
      (text) =>
        text.includes("customattribute") ||
        text.includes("defaultresources") ||
        text.includes("defaultcomponents") ||
        text === "hrefcustomattribute" ||
        text === "loadcustomattribute",
    )
  ) {
    kinds.push(FrameworkRouterEntityKind.RouteResource);
  }
  if (kinds.length === 0 && packageAdmitted) {
    kinds.push(
      row.packageId === "route-recognizer"
        ? FrameworkRouterEntityKind.Recognizer
        : FrameworkRouterEntityKind.RouteResource,
    );
  }
  return uniqueEnumValues(kinds);
}

export function routerCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  kinds: readonly FrameworkRouterEntityKind[],
): readonly FrameworkRouterCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkRouterCapability[] = [];
  if (
    kindSet.has(FrameworkRouterEntityKind.Configuration) ||
    row.exportEntry.memberNames.includes("register")
  ) {
    capabilities.push(
      FrameworkRouterCapability.Configure,
      FrameworkRouterCapability.Register,
    );
  }
  if (
    kindSet.has(FrameworkRouterEntityKind.Router) ||
    kindSet.has(FrameworkRouterEntityKind.Navigation) ||
    texts.some((text) => text.includes("navigate"))
  ) {
    capabilities.push(FrameworkRouterCapability.Navigate);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Recognizer)) {
    capabilities.push(FrameworkRouterCapability.Recognize);
  }
  if (
    kindSet.has(FrameworkRouterEntityKind.UrlParser) ||
    kindSet.has(FrameworkRouterEntityKind.Location)
  ) {
    capabilities.push(FrameworkRouterCapability.ParseUrl);
  }
  if (kindSet.has(FrameworkRouterEntityKind.State)) {
    capabilities.push(FrameworkRouterCapability.ManageState);
  }
  if (
    kindSet.has(FrameworkRouterEntityKind.Viewport) ||
    kindSet.has(FrameworkRouterEntityKind.Endpoint)
  ) {
    capabilities.push(FrameworkRouterCapability.RenderViewport);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Event)) {
    capabilities.push(FrameworkRouterCapability.EmitEvent);
  }
  return uniqueEnumValues(capabilities);
}

export function expressionKindsForPackageExport(
  row: FrameworkPackageExportRow,
  packageAdmitted: boolean,
): readonly FrameworkExpressionEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkExpressionEntityKind[] = [];
  if (
    texts.some(
      (text) => text.includes("expressionparser") || text === "parseexpression",
    )
  ) {
    kinds.push(FrameworkExpressionEntityKind.Parser);
  }
  if (texts.some((text) => text.includes("access"))) {
    kinds.push(FrameworkExpressionEntityKind.Access);
  }
  if (texts.some((text) => text.includes("call"))) {
    kinds.push(FrameworkExpressionEntityKind.Call);
  }
  if (
    texts.some((text) => text.includes("literal") || text.includes("template"))
  ) {
    kinds.push(FrameworkExpressionEntityKind.Literal);
  }
  if (
    texts.some(
      (text) =>
        text.includes("operator") ||
        text.includes("binary") ||
        text.includes("unary") ||
        text.includes("conditional") ||
        text.includes("assign"),
    )
  ) {
    kinds.push(FrameworkExpressionEntityKind.Operator);
  }
  if (
    texts.some(
      (text) =>
        text.includes("bindingpattern") ||
        text.includes("destructuring") ||
        text.includes("bindingidentifier"),
    )
  ) {
    kinds.push(FrameworkExpressionEntityKind.Pattern);
  }
  if (texts.some((text) => text.includes("interpolation"))) {
    kinds.push(FrameworkExpressionEntityKind.Interpolation);
  }
  if (texts.some((text) => text.includes("forof"))) {
    kinds.push(FrameworkExpressionEntityKind.ForOf);
  }
  if (texts.some((text) => text.includes("bindingbehavior"))) {
    kinds.push(FrameworkExpressionEntityKind.BindingBehavior);
  }
  if (texts.some((text) => text.includes("valueconverter"))) {
    kinds.push(FrameworkExpressionEntityKind.ValueConverter);
  }
  if (
    texts.some((text) => text.includes("visitor") || text.includes("astvisit"))
  ) {
    kinds.push(FrameworkExpressionEntityKind.Visitor);
  }
  if (
    texts.some(
      (text) => text.includes("astevaluator") || text.includes("astevaluate"),
    )
  ) {
    kinds.push(FrameworkExpressionEntityKind.Evaluator);
  }
  if (texts.some((text) => text.includes("unparser"))) {
    kinds.push(FrameworkExpressionEntityKind.Unparser);
  }
  if (
    texts.some(
      (text) =>
        text.startsWith("create") ||
        text.startsWith("is") ||
        text.includes("expressionkind") ||
        text.includes("expressiontype"),
    )
  ) {
    kinds.push(FrameworkExpressionEntityKind.Helper);
  }
  if (
    texts.some((text) => text.includes("expression")) ||
    (packageAdmitted && kinds.length === 0)
  ) {
    kinds.push(FrameworkExpressionEntityKind.AstNode);
  }
  return uniqueEnumValues(kinds);
}

export function expressionCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  kinds: readonly FrameworkExpressionEntityKind[],
): readonly FrameworkExpressionCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkExpressionCapability[] = [];
  if (
    kindSet.has(FrameworkExpressionEntityKind.Parser) ||
    texts.some((text) => text.includes("parse"))
  ) {
    capabilities.push(FrameworkExpressionCapability.Parse);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Visitor)) {
    capabilities.push(FrameworkExpressionCapability.Visit);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Evaluator)) {
    capabilities.push(FrameworkExpressionCapability.Evaluate);
  }
  if (
    kindSet.has(FrameworkExpressionEntityKind.Helper) ||
    texts.some((text) => text.startsWith("create"))
  ) {
    capabilities.push(FrameworkExpressionCapability.BuildAst);
  }
  if (
    kindSet.has(FrameworkExpressionEntityKind.Operator) &&
    texts.some((text) => text.includes("assign"))
  ) {
    capabilities.push(FrameworkExpressionCapability.Assign);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Interpolation)) {
    capabilities.push(FrameworkExpressionCapability.Interpolate);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.ValueConverter)) {
    capabilities.push(FrameworkExpressionCapability.ConvertValue);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.BindingBehavior)) {
    capabilities.push(FrameworkExpressionCapability.ApplyBehavior);
  }
  return uniqueEnumValues(capabilities);
}

export function renderingStructureKindsForPackageExport(
  row: FrameworkPackageExportRow,
): readonly FrameworkRenderingStructureKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkRenderingStructureKind[] = [];
  if (texts.some((text) => text.includes("approot") || text === "aurelia")) {
    kinds.push(FrameworkRenderingStructureKind.AppRoot);
  }
  if (texts.some((text) => text.includes("controller"))) {
    kinds.push(FrameworkRenderingStructureKind.Controller);
  }
  if (
    texts.some(
      (text) => text === "viewfactory" || text.includes("iviewfactory"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.ViewFactory);
  }
  if (
    texts.some(
      (text) =>
        text.includes("syntheticview") ||
        text.includes("viewmodel") ||
        text === "viewfactory",
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.View);
  }
  if (texts.some((text) => text.includes("hydrat"))) {
    kinds.push(FrameworkRenderingStructureKind.Hydration);
  }
  if (
    texts.some(
      (text) =>
        text.includes("renderer") ||
        text === "rendering" ||
        text === "irendering",
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.Renderer);
  }
  if (
    texts.some(
      (text) =>
        text.includes("rendercontext") || text.includes("hydrationcontext"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.RenderContext);
  }
  if (texts.some((text) => text.includes("renderlocation"))) {
    kinds.push(FrameworkRenderingStructureKind.RenderLocation);
  }
  if (
    texts.some(
      (text) =>
        text.includes("nodesequence") || text.includes("fragmentnodesequence"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.NodeSequence);
  }
  if (
    texts.some(
      (text) =>
        text.includes("lifecyclehook") || text.includes("lifecyclehooks"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.LifecycleHook);
  }
  if (
    texts.some(
      (text) =>
        text === "iplatform" ||
        text === "iwindow" ||
        text === "inode" ||
        text.includes("platform") ||
        text.includes("svg"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.PlatformBoundary);
  }
  if (
    texts.some(
      (text) => text.includes("mounttarget") || text.includes("portal"),
    )
  ) {
    kinds.push(FrameworkRenderingStructureKind.MountTarget);
  }
  if (texts.some((text) => text.includes("ssr") || text.includes("adoptssr"))) {
    kinds.push(FrameworkRenderingStructureKind.Ssr);
  }
  return uniqueEnumValues(kinds);
}

export function renderingCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  kinds: readonly FrameworkRenderingStructureKind[],
): readonly FrameworkRenderingCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkRenderingCapability[] = [];
  if (
    kindSet.has(FrameworkRenderingStructureKind.Renderer) ||
    kindSet.has(FrameworkRenderingStructureKind.RenderLocation)
  ) {
    capabilities.push(FrameworkRenderingCapability.Render);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.Hydration)) {
    capabilities.push(FrameworkRenderingCapability.Hydrate);
  }
  if (
    kindSet.has(FrameworkRenderingStructureKind.View) ||
    kindSet.has(FrameworkRenderingStructureKind.ViewFactory) ||
    kindSet.has(FrameworkRenderingStructureKind.NodeSequence)
  ) {
    capabilities.push(FrameworkRenderingCapability.CreateView);
  }
  if (
    kindSet.has(FrameworkRenderingStructureKind.Controller) ||
    kindSet.has(FrameworkRenderingStructureKind.LifecycleHook)
  ) {
    capabilities.push(FrameworkRenderingCapability.ControlLifecycle);
  }
  if (
    kindSet.has(FrameworkRenderingStructureKind.MountTarget) ||
    kindSet.has(FrameworkRenderingStructureKind.AppRoot)
  ) {
    capabilities.push(FrameworkRenderingCapability.Mount);
  }
  if (
    kindSet.has(FrameworkRenderingStructureKind.PlatformBoundary) ||
    texts.some((text) => text.includes("node") || text.includes("window"))
  ) {
    capabilities.push(
      FrameworkRenderingCapability.Platform,
      FrameworkRenderingCapability.LocateDom,
    );
  }
  if (kindSet.has(FrameworkRenderingStructureKind.Ssr)) {
    capabilities.push(FrameworkRenderingCapability.Ssr);
  }
  if (row.exportEntry.memberNames.includes("register")) {
    capabilities.push(FrameworkRenderingCapability.Register);
  }
  return uniqueEnumValues(capabilities);
}

export function isAppTaskNameCandidate(name: string): boolean {
  const normalized = normalizeIdentifierText(name);
  return isAppTaskMatchText(normalized);
}

export function isAppTaskMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("apptask") ||
    normalized.includes("taskslot") ||
    normalized === "task" ||
    normalized.includes("recurringtask") ||
    normalized.includes("queuetask") ||
    normalized.includes("taskstatus") ||
    normalized.includes("taskaborterror") ||
    normalized.includes("taskssettled") ||
    normalized.includes("istaskqueueempty") ||
    normalized.includes("getrecurringtasks") ||
    normalized.includes("runtasks") ||
    normalized.includes("lifecyclehook")
  );
}

export function isRouterNameCandidate(name: string): boolean {
  return isRouterMatchText(name);
}

export function isRouterMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("router") ||
    normalized.includes("route") ||
    normalized.includes("navigation") ||
    normalized.includes("viewport") ||
    normalized.includes("endpoint") ||
    normalized.includes("urlparser") ||
    normalized.includes("recognizer") ||
    normalized.includes("managedstate") ||
    normalized.includes("transition") ||
    normalized.includes("hrefcustomattribute") ||
    normalized.includes("loadcustomattribute")
  );
}

export function isExpressionNameCandidate(name: string): boolean {
  return isExpressionMatchText(name);
}

export function isExpressionMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("expression") ||
    normalized.includes("parser") ||
    normalized.includes("ast") ||
    normalized.includes("evaluator") ||
    normalized.includes("unparser") ||
    normalized.includes("visitor") ||
    normalized.includes("interpolation") ||
    normalized.includes("bindingbehavior") ||
    normalized.includes("valueconverter")
  );
}

export function isRenderingStructureNameCandidate(name: string): boolean {
  return isRenderingStructureMatchText(name);
}

export function isRenderingStructureMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("approot") ||
    normalized === "aurelia" ||
    normalized.includes("controller") ||
    normalized.includes("viewfactory") ||
    normalized.includes("syntheticview") ||
    normalized.includes("viewmodel") ||
    normalized.includes("hydrat") ||
    normalized.includes("renderer") ||
    normalized === "rendering" ||
    normalized === "irendering" ||
    normalized.includes("renderlocation") ||
    normalized.includes("rendercontext") ||
    normalized.includes("hydrationcontext") ||
    normalized.includes("nodesequence") ||
    normalized.includes("lifecyclehook") ||
    normalized === "iplatform" ||
    normalized === "iwindow" ||
    normalized === "inode" ||
    normalized.includes("mounttarget") ||
    normalized.includes("portal") ||
    normalized.includes("ssr") ||
    normalized.includes("svg")
  );
}
