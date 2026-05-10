import {
  readExportNames,
  SourceProjectKeyedMemo,
  SourceSelectorScheme,
  sourceRangeForTarget,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  catalogExportShapeForPackageExport,
  packageExportsForCandidateNames,
} from "./framework-catalog-helpers.js";
import {
  normalizeIdentifierText,
  uniqueEnumValues,
  uniqueCatalogMatches,
  uniqueStrings,
} from "./framework-catalog-utils.js";
import {
  FrameworkCatalogExportShape,
  FrameworkObserverCapability,
  FrameworkObserverEntityKind,
  FrameworkCatalogMatchBasis,
  type FrameworkDiInterfaceExportRow,
  type FrameworkObserverEntityRow,
  type FrameworkCatalogMatchRow,
  type FrameworkPackageExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkDiInterfacePackageRows,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";
import { concreteExportTarget } from "./framework-support.js";

const observerEntityRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkObserverEntityRow[]
>();

export function readFrameworkObserverEntities(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkObserverEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkObserverEntityPackageRows(
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
        filters.observerKind === undefined ||
        row.observerKinds.includes(
          filters.observerKind as FrameworkObserverEntityKind,
        ),
    )
    .filter(
      (row) =>
        filters.observerCapability === undefined ||
        row.observerCapabilities.includes(
          filters.observerCapability as FrameworkObserverCapability,
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
        observerEntityMatchesQuery(row, filters.query),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.observerKinds
          .join(",")
          .localeCompare(right.observerKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function sourceRangeForObserverEntity(
  row: FrameworkObserverEntityRow,
): SourceRange | null {
  return sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
}

export function readFrameworkObserverEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkObserverEntityRow[] {
  return observerEntityRowsByPackage.read(sourceProject, packageId, () =>
    scanFrameworkObserverEntityPackageRows(
      sourceProject,
      packageId,
      packageName,
    ),
  );
}

export function scanFrameworkObserverEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkObserverEntityRow[] {
  const diInterfaces = readFrameworkDiInterfacePackageRows(
    sourceProject,
    packageId,
    packageName,
  );
  const diInterfacesByExport = new Map(
    diInterfaces.map((row) => [row.exportEntry.exportName, row]),
  );
  const candidateNames = observerCandidateExportNamesForPackage(
    sourceProject,
    packageId,
    diInterfaces,
  );
  return packageExportsForCandidateNames(
    sourceProject,
    packageId,
    candidateNames,
    false,
  )
    .flatMap((row) => {
      const diInterface = diInterfacesByExport.get(row.exportEntry.exportName);
      return observerEntityRowForPackageExport(row, diInterface);
    })
    .sort(
      (left, right) =>
        left.observerKinds
          .join(",")
          .localeCompare(right.observerKinds.join(",")) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function observerCandidateExportNamesForPackage(
  sourceProject: SourceProject,
  packageId: string,
  diInterfaces: readonly FrameworkDiInterfaceExportRow[],
): readonly string[] {
  const names = readExportNames(
    sourceProject,
    {
      scheme: SourceSelectorScheme.Package,
      packageId,
    },
    {
      limit: 100_000,
      offset: 0,
    },
  )
    .exports.map((entry) => entry.exportName)
    .filter(isObservationNameCandidate);
  return uniqueStrings([
    ...names,
    ...diInterfaces
      .filter(
        (row) =>
          isObservationNameCandidate(row.exportEntry.exportName) ||
          isObservationNameCandidate(row.interfaceKey),
      )
      .map((row) => row.exportEntry.exportName),
  ]);
}

export function observerEntityRowForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverEntityRow[] {
  const matchedBy = observerMatchesForPackageExport(row, diInterface);
  const observerKinds = observerKindsForPackageExport(
    row,
    matchedBy,
    diInterface,
  );
  if (observerKinds.length === 0) {
    return [];
  }
  const observerCapabilities = observerCapabilitiesForEntity(
    row,
    observerKinds,
    diInterface,
  );
  return [
    {
      ...row,
      observerKinds,
      exportShape: observerEntityShapeForPackageExport(row, diInterface),
      observerCapabilities,
      matchedBy,
      ...(diInterface === undefined ? {} : { diInterface }),
      defaultImplementationNames:
        diInterface === undefined
          ? []
          : defaultImplementationNamesForDiInterface(diInterface),
    },
  ];
}

export function observerMatchesForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkCatalogMatchRow[] {
  const matches: FrameworkCatalogMatchRow[] = [];
  addObserverMatch(
    matches,
    FrameworkCatalogMatchBasis.ExportName,
    row.exportEntry.exportName,
  );
  addObserverMatch(
    matches,
    FrameworkCatalogMatchBasis.ResolvedName,
    row.exportEntry.resolvedName,
  );
  if (row.exportEntry.type !== null) {
    addObserverMatch(
      matches,
      FrameworkCatalogMatchBasis.TypeText,
      row.exportEntry.type,
    );
  }
  for (const memberName of row.exportEntry.memberNames) {
    addObserverMatch(
      matches,
      FrameworkCatalogMatchBasis.MemberName,
      memberName,
    );
  }
  if (diInterface !== undefined) {
    addObserverMatch(
      matches,
      FrameworkCatalogMatchBasis.DiInterface,
      diInterface.interfaceKey,
    );
    for (const builderCall of diInterface.builderCalls) {
      addObserverMatch(
        matches,
        FrameworkCatalogMatchBasis.DiInterface,
        builderCall.calleeName,
      );
      for (const argument of builderCall.arguments) {
        addObserverMatch(
          matches,
          FrameworkCatalogMatchBasis.DiInterface,
          argument.expression.text,
        );
        if (argument.expression.symbolName !== null) {
          addObserverMatch(
            matches,
            FrameworkCatalogMatchBasis.DiInterface,
            argument.expression.symbolName,
          );
        }
      }
    }
  }
  return uniqueCatalogMatches(matches);
}

export function addObserverMatch(
  matches: FrameworkCatalogMatchRow[],
  basis: FrameworkCatalogMatchBasis,
  text: string,
): void {
  if (isObservationMatchText(text)) {
    matches.push({ basis, text });
  }
}

export function isObservationMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("observer") ||
    normalized.includes("accessor") ||
    normalized.includes("subscriber") ||
    normalized.includes("connectable") ||
    normalized.includes("watcher") ||
    normalized.includes("signaler") ||
    normalized.includes("signalbindingbehavior") ||
    isEffectObservationText(normalized) ||
    normalized.includes("dirtychecker") ||
    normalized.includes("dirtycheck") ||
    normalized.includes("observable") ||
    normalized.includes("subscribable") ||
    normalized.includes("getobserver") ||
    normalized.includes("getaccessor") ||
    normalized.includes("getarrayobserver") ||
    normalized.includes("getmapobserver") ||
    normalized.includes("getsetobserver")
  );
}

export function isObservationNameCandidate(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return (
    normalized.includes("observer") ||
    normalized.includes("accessor") ||
    normalized.includes("subscriber") ||
    normalized.includes("connectable") ||
    normalized.includes("watcher") ||
    normalized.includes("signaler") ||
    normalized === "signals" ||
    normalized.includes("signalbindingbehavior") ||
    isEffectObservationText(normalized) ||
    normalized.includes("dirtychecker") ||
    normalized.includes("dirtycheck") ||
    normalized.includes("observable") ||
    normalized.includes("subscribable")
  );
}

export function isEffectObservationText(normalized: string): boolean {
  return (
    normalized === "ieffect" ||
    normalized === "effectrunfunc" ||
    normalized.endsWith("effect") ||
    normalized.includes("runeffect") ||
    normalized.includes("effectbindingbehavior")
  );
}

export function observerKindsForPackageExport(
  row: FrameworkPackageExportRow,
  matchedBy: readonly FrameworkCatalogMatchRow[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverEntityKind[] {
  if (matchedBy.length === 0) {
    return [];
  }
  const texts = observerClassificationTexts(row, matchedBy, diInterface);
  const kinds: FrameworkObserverEntityKind[] = [];
  if (
    texts.some(
      (text) =>
        text === "inodeobserverlocator" ||
        text === "nodeobserverlocator" ||
        text.includes("nodeobserverlocator"),
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.NodeObserverLocator);
  }
  if (
    texts.some(
      (text) => text === "iobserverlocator" || text === "observerlocator",
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.ObserverLocator);
  }
  if (
    texts.some(
      (text) =>
        text.includes("dirtychecker") ||
        text.includes("dirtycheckproperty") ||
        text.includes("dirtychecksettings"),
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.DirtyChecker);
  }
  if (
    texts.some(
      (text) =>
        text.includes("collectionobserver") ||
        text.includes("arrayobserver") ||
        text.includes("mapobserver") ||
        text.includes("setobserver") ||
        text.includes("collectionsubscriber"),
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.CollectionObserver);
  }
  if (texts.some((text) => text.includes("connectable"))) {
    kinds.push(FrameworkObserverEntityKind.Connectable);
  }
  if (texts.some((text) => text.includes("watcher"))) {
    kinds.push(FrameworkObserverEntityKind.Watcher);
  }
  if (
    texts.some(
      (text) =>
        text.includes("signaler") ||
        text.includes("signalbindingbehavior") ||
        text === "signals",
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.Signaler);
  }
  if (
    texts.some((text) => text.includes("effect") && !text.includes("effective"))
  ) {
    kinds.push(FrameworkObserverEntityKind.Effect);
  }
  if (
    texts.some(
      (text) => text.includes("subscriber") || text.includes("subscribable"),
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.Subscriber);
  }
  if (texts.some((text) => text.includes("accessor"))) {
    kinds.push(FrameworkObserverEntityKind.Accessor);
  }
  if (texts.some((text) => isObserverRoleText(text))) {
    kinds.push(FrameworkObserverEntityKind.Observer);
  }
  if (
    texts.some(
      (text) =>
        text.includes("getobserverlookup") ||
        text.includes("getcollectionobserver") ||
        text.includes("subscribercollection") ||
        text.includes("observable"),
    )
  ) {
    kinds.push(FrameworkObserverEntityKind.ObservationHelper);
  }
  return uniqueEnumValues(kinds);
}

export function observerClassificationTexts(
  row: FrameworkPackageExportRow,
  matchedBy: readonly FrameworkCatalogMatchRow[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly string[] {
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportEntry.fullyQualifiedName ?? "",
    ...row.exportEntry.memberNames,
    ...matchedBy.map((match) => match.text),
    ...(diInterface === undefined
      ? []
      : [
          diInterface.interfaceKey,
          ...diInterface.builderCalls.map((call) => call.calleeName),
          ...diInterface.builderCalls.flatMap((call) =>
            call.arguments.map((argument) => argument.expression.text),
          ),
        ]),
  ]
    .filter((text) => text.length > 0)
    .map(normalizeIdentifierText);
}

export function isObserverRoleText(text: string): boolean {
  return (
    text === "iobserver" ||
    text === "observer" ||
    text.endsWith("observer") ||
    text.includes("observerimpl") ||
    text.includes("observerrecord") ||
    text.includes("accessororobserver")
  );
}

export function observerCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  observerKinds: readonly FrameworkObserverEntityKind[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverCapability[] {
  const capabilities: FrameworkObserverCapability[] = [];
  const kindSet = new Set(observerKinds);
  const texts = observerClassificationTexts(row, [], diInterface);
  if (kindSet.has(FrameworkObserverEntityKind.ObserverLocator)) {
    capabilities.push(
      FrameworkObserverCapability.LocateObserver,
      FrameworkObserverCapability.LocateAccessor,
      FrameworkObserverCapability.LocateCollectionObserver,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.NodeObserverLocator)) {
    capabilities.push(
      FrameworkObserverCapability.LocateNodeObserver,
      FrameworkObserverCapability.LocateObserver,
      FrameworkObserverCapability.LocateAccessor,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.Observer)) {
    capabilities.push(
      FrameworkObserverCapability.AccessValue,
      FrameworkObserverCapability.Notify,
      FrameworkObserverCapability.Subscribe,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.Accessor)) {
    capabilities.push(FrameworkObserverCapability.AccessValue);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Subscriber)) {
    capabilities.push(FrameworkObserverCapability.Subscribe);
  }
  if (kindSet.has(FrameworkObserverEntityKind.CollectionObserver)) {
    capabilities.push(
      FrameworkObserverCapability.Collection,
      FrameworkObserverCapability.Subscribe,
      FrameworkObserverCapability.Notify,
    );
  }
  if (
    kindSet.has(FrameworkObserverEntityKind.Connectable) ||
    kindSet.has(FrameworkObserverEntityKind.Watcher)
  ) {
    capabilities.push(
      FrameworkObserverCapability.Connect,
      FrameworkObserverCapability.Subscribe,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.Signaler)) {
    capabilities.push(FrameworkObserverCapability.Signal);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Effect)) {
    capabilities.push(
      FrameworkObserverCapability.RunEffect,
      FrameworkObserverCapability.Connect,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.DirtyChecker)) {
    capabilities.push(FrameworkObserverCapability.DirtyCheck);
  }
  if (
    row.exportEntry.memberNames.includes("register") ||
    diInterface !== undefined
  ) {
    capabilities.push(FrameworkObserverCapability.Register);
  }
  if (texts.some((text) => text.includes("getobserver"))) {
    capabilities.push(FrameworkObserverCapability.LocateObserver);
  }
  if (texts.some((text) => text.includes("getaccessor"))) {
    capabilities.push(FrameworkObserverCapability.LocateAccessor);
  }
  if (
    texts.some(
      (text) =>
        text.includes("getarrayobserver") ||
        text.includes("getmapobserver") ||
        text.includes("getsetobserver") ||
        text.includes("getcollectionobserver"),
    )
  ) {
    capabilities.push(
      FrameworkObserverCapability.LocateCollectionObserver,
      FrameworkObserverCapability.Collection,
    );
  }
  return uniqueEnumValues(capabilities);
}

export function observerEntityShapeForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): FrameworkCatalogExportShape {
  if (diInterface !== undefined) {
    return FrameworkCatalogExportShape.DiInterface;
  }
  return catalogExportShapeForPackageExport(row);
}

export function defaultImplementationNamesForDiInterface(
  row: FrameworkDiInterfaceExportRow,
): readonly string[] {
  const names: string[] = [];
  for (const call of row.builderCalls) {
    for (const argument of call.arguments) {
      if (
        argument.expression.symbolName !== null &&
        /^[A-Z]/u.test(argument.expression.symbolName)
      ) {
        names.push(argument.expression.symbolName);
      }
      const expressionText = argument.expression.text;
      const newExpressionMatches = expressionText.matchAll(
        /\bnew\s+([A-Z][$\w]*)/gu,
      );
      for (const match of newExpressionMatches) {
        const name = match[1];
        if (name !== undefined) {
          names.push(name);
        }
      }
      const bareIdentifierMatches = expressionText.matchAll(
        /\b([A-Z][$\w]*(?:ObserverLocator|DirtyChecker|Observer|Accessor|Subscriber|Watcher|Signaler|Effect))\b/gu,
      );
      for (const match of bareIdentifierMatches) {
        const name = match[1];
        if (name !== undefined) {
          names.push(name);
        }
      }
    }
  }
  return uniqueStrings(names).filter((name) => name !== row.interfaceKey);
}

export function observerEntityMatchesQuery(
  row: FrameworkObserverEntityRow,
  query: string,
): boolean {
  const normalizedQuery = normalizeIdentifierText(query);
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportShape,
    ...row.observerKinds,
    ...row.observerCapabilities,
    ...row.defaultImplementationNames,
    ...row.matchedBy.map((match) => match.text),
  ].some((text) => normalizeIdentifierText(text).includes(normalizedQuery));
}
