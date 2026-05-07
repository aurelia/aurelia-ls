import ts from "typescript";

import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type {
  SourceFileIdentity,
  SourceProject,
  TypeScriptCallSiteEntry,
} from "../../source/index.js";
import {
  readTypeScriptCallSiteEntry,
  SourceProjectKeyedMemo,
  SourceProjectMemo,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkObserverEntityRow } from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkObserverEntities } from "./framework-observer-entities.js";
import {
  externalFileIdentity,
  sourceRangeFromFileSpan,
  sourceSpan,
} from "./framework-support.js";
import {
  isNestedExecutionBoundary,
  propertyNameText,
  unwrapExpression,
} from "./framework-ts-utils.js";

/** Observation subsystem surface that owns a method/function row. */
export const enum FrameworkObservationSurfaceKind {
  ObserverLocator = "observer-locator",
  NodeObserverLocator = "node-observer-locator",
  DirtyChecker = "dirty-checker",
  DirtyCheckProperty = "dirty-check-property",
  ConnectableRecord = "connectable-record",
  ConnectableHelper = "connectable-helper",
  CollectionHelper = "collection-helper",
  WatchDecorator = "watch-decorator",
  WatchDefinition = "watch-definition",
  WatchRegistry = "watch-registry",
  ResourceWatchMetadata = "resource-watch-metadata",
  WatcherSetup = "watcher-setup",
  Watcher = "watcher",
  Effect = "effect",
  SlotWatcher = "slot-watcher",
}

/** Exact local role played by one observation flow site. */
export const enum FrameworkObservationFlowSiteKind {
  ObserverLocatorObserver = "observer-locator-observer",
  ObserverLocatorAccessor = "observer-locator-accessor",
  NodeLocatorHandles = "node-locator-handles",
  NodeLocatorObserver = "node-locator-observer",
  NodeLocatorAccessor = "node-locator-accessor",
  ObserverCacheRead = "observer-cache-read",
  ObserverCacheWrite = "observer-cache-write",
  PrimitiveObserver = "primitive-observer",
  ComputedObserver = "computed-observer",
  ExpressionObserver = "expression-observer",
  ControlledComputedObserver = "controlled-computed-observer",
  CollectionObserver = "collection-observer",
  CollectionLengthObserver = "collection-length-observer",
  CollectionIndexObserver = "collection-index-observer",
  AdapterObserver = "adapter-observer",
  GetterObserver = "getter-observer",
  DirtyCheckProperty = "dirty-check-property",
  SetterObserver = "setter-observer",
  DefaultNodeObserverLocator = "default-node-observer-locator",
  NodeObserverConfig = "node-observer-config",
  NodeAccessorOverride = "node-accessor-override",
  NodeObserver = "node-observer",
  NodeAccessor = "node-accessor",
  DirtyCheckSchedule = "dirty-check-schedule",
  DirtyCheckTrack = "dirty-check-track",
  DirtyCheckUntrack = "dirty-check-untrack",
  DirtyCheckFlush = "dirty-check-flush",
  ConnectableRecord = "connectable-record",
  ConnectableSubscribe = "connectable-subscribe",
  ConnectableUnsubscribe = "connectable-unsubscribe",
  WatchDefinitionCreate = "watch-definition-create",
  WatchDefinitionStore = "watch-definition-store",
  WatchDefinitionRead = "watch-definition-read",
  ResourceWatchDefinitionMerge = "resource-watch-definition-merge",
  WatchCallbackResolve = "watch-callback-resolve",
  WatchExpressionBranch = "watch-expression-branch",
  WatchExpressionParse = "watch-expression-parse",
  WatchAccessScopeAst = "watch-access-scope-ast",
  ComputedWatcher = "computed-watcher",
  ExpressionWatcher = "expression-watcher",
  WatcherQueue = "watcher-queue",
  WatcherCompute = "watcher-compute",
  WatcherDependencyEnter = "watcher-dependency-enter",
  WatcherDependencyExit = "watcher-dependency-exit",
  WatcherDependencyClear = "watcher-dependency-clear",
  WatcherCallbackInvoke = "watcher-callback-invoke",
  EffectRunner = "effect-runner",
  EffectWatchExpression = "effect-watch-expression",
  EffectWatchGetter = "effect-watch-getter",
  EffectSubscribe = "effect-subscribe",
  EffectCleanup = "effect-cleanup",
  EffectStop = "effect-stop",
  EffectDependencyEnter = "effect-dependency-enter",
  EffectDependencyExit = "effect-dependency-exit",
  SlotWatcher = "slot-watcher",
  SlotWatcherSubscribe = "slot-watcher-subscribe",
  SlotWatcherUnsubscribe = "slot-watcher-unsubscribe",
}

/** How a flow-site target was associated with a public observer entity. */
export const enum FrameworkObservationTargetMatchBasis {
  FullyQualifiedName = "fully-qualified-name",
  SymbolName = "symbol-name",
  TargetName = "target-name",
  TargetRootName = "target-root-name",
}

/** Method/function declaration that belongs to the observation subsystem. */
export interface FrameworkObservationSurfaceMethodRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly declarationKind: ObservationExecutableDeclarationKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly parameterNames: readonly string[];
  readonly parameterTypes: readonly (string | null)[];
  readonly declaredReturnType: string | null;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Source-backed flow site inside an observation subsystem method/function. */
export interface FrameworkObservationFlowSiteRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase.Observation;
  readonly targetName: string;
  readonly expressionText: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly callSite?: TypeScriptCallSiteEntry;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Observation relationship row derived from one internal flow site. */
export interface FrameworkObservationInternalRelationshipRow {
  readonly id: string;
  readonly family: FrameworkRelationshipFamily.Observation;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase.Observation;
  readonly packageId: string;
  readonly packageName: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly targetName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

/** Link from an internal observation flow site to a public observer entity row. */
export interface FrameworkObservationFlowEntityLinkRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly flowSiteId: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly targetName: string;
  readonly matchBasis: FrameworkObservationTargetMatchBasis;
  readonly entityPackageId: string;
  readonly entityPackageName: string;
  readonly entityExportName: string;
  readonly entityResolvedName: string;
  readonly entityObserverKinds: readonly string[];
  readonly entityObserverCapabilities: readonly string[];
  readonly entitySource?: SourceRange;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkObservationInternalFilters
  extends FrameworkDiscoveryFilters {
  readonly surfaceKind?: string;
  readonly siteKind?: string;
  readonly methodName?: string;
  readonly targetName?: string;
  readonly matchBasis?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

interface ObservationInternalsIndex {
  readonly methods: readonly FrameworkObservationSurfaceMethodRow[];
  readonly sites: readonly FrameworkObservationFlowSiteRow[];
  readonly relationships: readonly FrameworkObservationInternalRelationshipRow[];
}

type ObservationExecutableDeclarationKind =
  | "class-method"
  | "function"
  | "object-method";

interface ObservationExecutable {
  readonly sourceFile: ts.SourceFile;
  readonly file: SourceFileIdentity;
  readonly packageId: string;
  readonly packageName: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly declarationKind: ObservationExecutableDeclarationKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly body: ts.Block;
  readonly methodSource: SourceRange;
}

interface SiteClassification {
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly targetName: string;
  readonly targetKind: FrameworkRelationshipEndpointKind;
}

const returnExpressionClassifications = new Map<string, SiteClassification>([
  [
    "propertyAccessor",
    locatorSite(
      FrameworkObservationFlowSiteKind.NodeAccessor,
      "PropertyAccessor",
      FrameworkRelationshipRelation.LooksUpObserver,
    ),
  ],
  [
    "elementPropertyAccessor",
    nodeSite(
      FrameworkObservationFlowSiteKind.NodeAccessor,
      "elementPropertyAccessor",
      FrameworkRelationshipRelation.LooksUpObserver,
    ),
  ],
  [
    "attrAccessor",
    nodeSite(
      FrameworkObservationFlowSiteKind.NodeAccessor,
      "attrAccessor",
      FrameworkRelationshipRelation.LooksUpObserver,
    ),
  ],
  [
    "cached",
    lookupSite(
      FrameworkObservationFlowSiteKind.ObserverCacheRead,
      FrameworkRelationshipMechanism.ObserverCache,
      "observer lookup cache",
      FrameworkRelationshipRelation.LooksUpObserver,
      FrameworkRelationshipEndpointKind.Concept,
    ),
  ],
]);

const newExpressionClassifications = new Map<string, SiteClassification>([
  [
    "PrimitiveObserver",
    locatorSite(
      FrameworkObservationFlowSiteKind.PrimitiveObserver,
      "PrimitiveObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "ComputedObserver",
    locatorSite(
      FrameworkObservationFlowSiteKind.ComputedObserver,
      "ComputedObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "ControlledComputedObserver",
    locatorSite(
      FrameworkObservationFlowSiteKind.ControlledComputedObserver,
      "ControlledComputedObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "ExpressionObserver",
    locatorSite(
      FrameworkObservationFlowSiteKind.ExpressionObserver,
      "ExpressionObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "SetterObserver",
    locatorSite(
      FrameworkObservationFlowSiteKind.SetterObserver,
      "SetterObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "DefaultNodeObserverLocator",
    nodeSite(
      FrameworkObservationFlowSiteKind.DefaultNodeObserverLocator,
      "DefaultNodeObserverLocator",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  ...["ClassAttributeAccessor", "StyleAttributeAccessor"].map((target) =>
    [
      target,
      nodeSite(
        FrameworkObservationFlowSiteKind.NodeAccessor,
        target,
        FrameworkRelationshipRelation.ConstructsInstance,
      ),
    ] as const
  ),
  [
    "DirtyCheckProperty",
    dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckProperty,
      "DirtyCheckProperty",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "BindingObserverRecord",
    connectableSite(
      FrameworkObservationFlowSiteKind.ConnectableRecord,
      "BindingObserverRecord",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "WatchDefinition",
    watchDecoratorSite(
      FrameworkObservationFlowSiteKind.WatchDefinitionCreate,
      "WatchDefinition",
      FrameworkRelationshipRelation.StoresWatchDefinition,
    ),
  ],
  [
    "ComputedWatcher",
    watcherSite(
      FrameworkObservationFlowSiteKind.ComputedWatcher,
      "ComputedWatcher",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "ExpressionWatcher",
    watcherSite(
      FrameworkObservationFlowSiteKind.ExpressionWatcher,
      "ExpressionWatcher",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "RunEffect",
    effectSite(
      FrameworkObservationFlowSiteKind.EffectRunner,
      "RunEffect",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
  [
    "AuSlotWatcherBinding",
    watcherSite(
      FrameworkObservationFlowSiteKind.SlotWatcher,
      "AuSlotWatcherBinding",
      FrameworkRelationshipRelation.ConstructsInstance,
    ),
  ],
]);

const observationInternalsMemo =
  new SourceProjectMemo<ObservationInternalsIndex>();
const observationInternalsBySurfaceKind = new SourceProjectKeyedMemo<
  string,
  ObservationInternalsIndex
>();

const observationClassSurfaces = new Map<
  string,
  FrameworkObservationSurfaceKind
>([
  ["ObserverLocator", FrameworkObservationSurfaceKind.ObserverLocator],
  ["DefaultNodeObserverLocator", FrameworkObservationSurfaceKind.NodeObserverLocator],
  ["NodeObserverLocator", FrameworkObservationSurfaceKind.NodeObserverLocator],
  ["DirtyChecker", FrameworkObservationSurfaceKind.DirtyChecker],
  ["DirtyCheckProperty", FrameworkObservationSurfaceKind.DirtyCheckProperty],
  ["BindingObserverRecord", FrameworkObservationSurfaceKind.ConnectableRecord],
  ["WatchDefinition", FrameworkObservationSurfaceKind.WatchDefinition],
  ["ComputedWatcher", FrameworkObservationSurfaceKind.Watcher],
  ["ExpressionWatcher", FrameworkObservationSurfaceKind.Watcher],
  ["Observation", FrameworkObservationSurfaceKind.Effect],
  ["RunEffect", FrameworkObservationSurfaceKind.Effect],
  ["AuSlotWatcherBinding", FrameworkObservationSurfaceKind.SlotWatcher],
  ["SlottedLifecycleHooks", FrameworkObservationSurfaceKind.SlotWatcher],
]);

const observationFunctionSurfaces = new Map<
  string,
  FrameworkObservationSurfaceKind
>([
  ["getCollectionObserver", FrameworkObservationSurfaceKind.CollectionHelper],
  ["observe", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["observeExpression", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["observeCollection", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["subscribeTo", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["getObserverRecord", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["unsubscribeAll", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["unsubscribeStale", FrameworkObservationSurfaceKind.ConnectableHelper],
  ["watch", FrameworkObservationSurfaceKind.WatchDecorator],
  ["addDefinition", FrameworkObservationSurfaceKind.WatchDecorator],
  ["createWatchers", FrameworkObservationSurfaceKind.WatcherSetup],
]);

function observationFunctionSurfaceKind(
  file: SourceFileIdentity,
  functionName: string,
): FrameworkObservationSurfaceKind | undefined {
  if (
    functionName === "decorator" &&
    file.repoPath.endsWith("runtime-html/src/watch.ts")
  ) {
    return FrameworkObservationSurfaceKind.WatchDecorator;
  }
  return observationFunctionSurfaces.get(functionName);
}

function resourceWatchMetadataSurfaceKind(
  file: SourceFileIdentity,
  className: string,
): FrameworkObservationSurfaceKind | undefined {
  if (
    file.repoPath.endsWith("runtime-html/src/resources/custom-element.ts") &&
    className === "CustomElementDefinition"
  ) {
    return FrameworkObservationSurfaceKind.ResourceWatchMetadata;
  }
  if (
    file.repoPath.endsWith("runtime-html/src/resources/custom-attribute.ts") &&
    className === "CustomAttributeDefinition"
  ) {
    return FrameworkObservationSurfaceKind.ResourceWatchMetadata;
  }
  return undefined;
}

function isResourceWatchMetadataMember(
  sourceFile: ts.SourceFile,
  className: string,
  member: ts.ClassElement,
): boolean {
  if (!ts.isMethodDeclaration(member) || member.body === undefined) {
    return false;
  }
  const methodName = propertyNameText(member.name);
  if (methodName !== "create") {
    return false;
  }
  const bodyText = member.body.getText(sourceFile);
  return (
    (className === "CustomElementDefinition" ||
      className === "CustomAttributeDefinition") &&
    (bodyText.includes("Watch.getDefinitions") ||
      bodyText.includes(".watches"))
  );
}

function observationObjectMethodSurface(
  file: SourceFileIdentity,
  method: ts.MethodDeclaration,
): { readonly surfaceKind: FrameworkObservationSurfaceKind; readonly ownerName: string } | null {
  if (!file.repoPath.endsWith("runtime-html/src/watch.ts")) {
    return null;
  }
  const methodName = propertyNameText(method.name);
  if (methodName !== "add" && methodName !== "getDefinitions") {
    return null;
  }
  return {
    surfaceKind: FrameworkObservationSurfaceKind.WatchRegistry,
    ownerName: "Watch",
  };
}

export function readFrameworkObservationSurfaceMethods(
  sourceProject: SourceProject,
  filters: FrameworkObservationInternalFilters,
): readonly FrameworkObservationSurfaceMethodRow[] {
  return readObservationInternalsIndex(sourceProject, filters.surfaceKind).methods
    .filter((row) => observationSurfaceMethodMatches(row, filters))
    .sort(compareSurfaceMethods);
}

export function readFrameworkObservationFlowSites(
  sourceProject: SourceProject,
  filters: FrameworkObservationInternalFilters,
): readonly FrameworkObservationFlowSiteRow[] {
  return readObservationInternalsIndex(sourceProject, filters.surfaceKind).sites
    .filter((row) => observationFlowSiteMatches(row, filters))
    .sort(compareFlowSites);
}

export function readFrameworkObservationInternalRelationships(
  sourceProject: SourceProject,
  filters: FrameworkObservationInternalFilters,
): readonly FrameworkObservationInternalRelationshipRow[] {
  return readObservationInternalsIndex(sourceProject, filters.surfaceKind).relationships
    .filter((row) => observationRelationshipMatches(row, filters))
    .sort(compareInternalRelationships);
}

export function readFrameworkObservationFlowEntityLinks(
  sourceProject: SourceProject,
  filters: FrameworkObservationInternalFilters,
): readonly FrameworkObservationFlowEntityLinkRow[] {
  const entities = readFrameworkObserverEntities(sourceProject, {});
  return uniqueFlowEntityLinks(
    readFrameworkObservationFlowSites(sourceProject, filters).flatMap((site) =>
      flowEntityLinksForSite(site, entities.filter(isInternalObserverEntity)),
    ),
  )
    .filter((row) => observationFlowEntityLinkMatches(row, filters))
    .sort(compareFlowEntityLinks);
}

function isInternalObserverEntity(entity: FrameworkObserverEntityRow): boolean {
  return entity.packageId === "runtime" || entity.packageId === "runtime-html";
}

function readObservationInternalsIndex(
  sourceProject: SourceProject,
  surfaceKind?: string,
): ObservationInternalsIndex {
  if (surfaceKind !== undefined) {
    return readObservationSurfaceInternalsIndex(sourceProject, surfaceKind);
  }
  return observationInternalsMemo.read(sourceProject, () => {
    const rows = sourceProject
      .ownedSourceFiles()
      .flatMap((sourceFile) =>
        observationInternalsForSourceFile(sourceProject, sourceFile),
      );
    const methods = rows
      .flatMap((row) => row.methods)
      .sort(compareSurfaceMethods);
    const sites = rows.flatMap((row) => row.sites).sort(compareFlowSites);
    const relationships = sites
      .map(observationRelationshipForFlowSite)
      .sort(compareInternalRelationships);
    return { methods, sites, relationships };
  });
}

function readObservationSurfaceInternalsIndex(
  sourceProject: SourceProject,
  surfaceKind: string,
): ObservationInternalsIndex {
  return observationInternalsBySurfaceKind.read(
    sourceProject,
    surfaceKind,
    () => {
      const rows = sourceProject
        .ownedSourceFiles()
        .flatMap((sourceFile) =>
          observationInternalsForSourceFile(
            sourceProject,
            sourceFile,
            surfaceKind,
          ),
        );
      const methods = rows
        .flatMap((row) => row.methods)
        .sort(compareSurfaceMethods);
      const sites = rows.flatMap((row) => row.sites).sort(compareFlowSites);
      const relationships = sites
        .map(observationRelationshipForFlowSite)
        .sort(compareInternalRelationships);
      return { methods, sites, relationships };
    },
  );
}

function observationInternalsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  requestedSurfaceKind?: string,
): readonly {
  readonly methods: readonly FrameworkObservationSurfaceMethodRow[];
  readonly sites: readonly FrameworkObservationFlowSiteRow[];
}[] {
  const file =
    sourceProject.sourceFileIdentity(sourceFile) ??
    externalFileIdentity(sourceProject, sourceFile);
  const packageInfo = sourceProject.packageForFileName(sourceFile.fileName);
  if (
    file.packageId === null ||
    packageInfo === null ||
    !isObservationSourceFile(file)
  ) {
    return [];
  }
  const methods: FrameworkObservationSurfaceMethodRow[] = [];
  const executables: ObservationExecutable[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      const surfaceKind = observationClassSurfaces.get(node.name.text);
      if (
        surfaceKind !== undefined &&
        surfaceKindMatches(surfaceKind, requestedSurfaceKind)
      ) {
        for (const member of node.members) {
          const executable = executableForClassMember(
            sourceFile,
            file,
            packageInfo.packageName,
            surfaceKind,
            node.name.text,
            member,
          );
          if (executable !== null) {
            executables.push(executable);
            if (
              ts.isMethodDeclaration(member) ||
              ts.isConstructorDeclaration(member)
            ) {
              methods.push(surfaceMethodRow(executable, member));
            }
          }
        }
      }
      const resourceWatchSurfaceKind = resourceWatchMetadataSurfaceKind(
        file,
        node.name.text,
      );
      if (
        resourceWatchSurfaceKind !== undefined &&
        surfaceKindMatches(resourceWatchSurfaceKind, requestedSurfaceKind)
      ) {
        for (const member of node.members) {
          if (
            !ts.isMethodDeclaration(member) ||
            !isResourceWatchMetadataMember(sourceFile, node.name.text, member)
          ) {
            continue;
          }
          const executable = executableForClassMember(
            sourceFile,
            file,
            packageInfo.packageName,
            resourceWatchSurfaceKind,
            node.name.text,
            member,
          );
          if (executable !== null) {
            executables.push(executable);
            methods.push(surfaceMethodRow(executable, member));
          }
        }
      }
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.body !== undefined
    ) {
      const surfaceKind = observationFunctionSurfaceKind(file, node.name.text);
      if (
        surfaceKind !== undefined &&
        surfaceKindMatches(surfaceKind, requestedSurfaceKind)
      ) {
        const declaration = node as ts.FunctionDeclaration & {
          readonly name: ts.Identifier;
          readonly body: ts.Block;
        };
        const executable = executableForFunctionLike(
          sourceFile,
          file,
          packageInfo.packageName,
          surfaceKind,
          declaration,
        );
        executables.push(executable);
        methods.push(surfaceMethodRow(executable, declaration));
      }
    }
    if (
      ts.isMethodDeclaration(node) &&
      ts.isObjectLiteralExpression(node.parent)
    ) {
      const objectMethodSurface = observationObjectMethodSurface(file, node);
      if (
        objectMethodSurface !== null &&
        surfaceKindMatches(
          objectMethodSurface.surfaceKind,
          requestedSurfaceKind,
        )
      ) {
        const executable = executableForObjectMethod(
          sourceFile,
          file,
          packageInfo.packageName,
          objectMethodSurface.surfaceKind,
          objectMethodSurface.ownerName,
          node,
        );
        if (executable !== null) {
          executables.push(executable);
          methods.push(surfaceMethodRow(executable, node));
        }
      }
    }
    if (
      ts.isFunctionExpression(node) &&
      node.name !== undefined &&
      node.body !== undefined
    ) {
      const surfaceKind = observationFunctionSurfaceKind(file, node.name.text);
      if (
        surfaceKind !== undefined &&
        surfaceKindMatches(surfaceKind, requestedSurfaceKind)
      ) {
        const executable = executableForFunctionLike(
          sourceFile,
          file,
          packageInfo.packageName,
          surfaceKind,
          node as ts.FunctionExpression & {
            readonly name: ts.Identifier;
            readonly body: ts.Block;
          },
        );
        executables.push(executable);
        methods.push(
          surfaceMethodRow(
            executable,
            node as ts.FunctionExpression & {
              readonly name: ts.Identifier;
              readonly body: ts.Block;
            },
          ),
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [
    {
      methods,
      sites: executables.flatMap((executable) =>
        flowSitesForExecutable(sourceProject, executable),
      ),
    },
  ];
}

function surfaceKindMatches(
  surfaceKind: FrameworkObservationSurfaceKind,
  requestedSurfaceKind: string | undefined,
): boolean {
  return requestedSurfaceKind === undefined || surfaceKind === requestedSurfaceKind;
}

function isObservationSourceFile(file: SourceFileIdentity): boolean {
  if (file.packageId !== "runtime" && file.packageId !== "runtime-html") {
    return false;
  }
  return (
    file.repoPath.includes("/src/") &&
    !file.repoPath.endsWith(".d.ts")
  );
}

function executableForClassMember(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  surfaceKind: FrameworkObservationSurfaceKind,
  ownerName: string,
  member: ts.ClassElement,
): ObservationExecutable | null {
  if (ts.isConstructorDeclaration(member) && member.body !== undefined) {
    return executable(
      sourceFile,
      file,
      packageName,
      surfaceKind,
      "class-method",
      ownerName,
      "constructor",
      member.body,
      member,
    );
  }
  if (!ts.isMethodDeclaration(member) || member.body === undefined) {
    return null;
  }
  const methodName = propertyNameText(member.name);
  if (methodName === null) {
    return null;
  }
  return executable(
    sourceFile,
    file,
    packageName,
    surfaceKind,
    "class-method",
    ownerName,
    methodName,
    member.body,
    member,
  );
}

function executableForFunctionLike(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  surfaceKind: FrameworkObservationSurfaceKind,
  declaration: (ts.FunctionDeclaration | ts.FunctionExpression) & {
    readonly name: ts.Identifier;
    readonly body: ts.Block;
  },
): ObservationExecutable {
  return executable(
    sourceFile,
    file,
    packageName,
    surfaceKind,
    "function",
    ownerNameForFunction(sourceFile, declaration.name.text),
    declaration.name.text,
    declaration.body,
    declaration,
  );
}

function executableForObjectMethod(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  surfaceKind: FrameworkObservationSurfaceKind,
  ownerName: string,
  method: ts.MethodDeclaration,
): ObservationExecutable | null {
  if (method.body === undefined) {
    return null;
  }
  const methodName = propertyNameText(method.name);
  if (methodName === null) {
    return null;
  }
  return executable(
    sourceFile,
    file,
    packageName,
    surfaceKind,
    "object-method",
    ownerName,
    methodName,
    method.body,
    method,
  );
}

function executable(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  surfaceKind: FrameworkObservationSurfaceKind,
  declarationKind: ObservationExecutableDeclarationKind,
  ownerName: string,
  methodName: string,
  body: ts.Block,
  node: ts.Node,
): ObservationExecutable {
  return {
    sourceFile,
    file,
    packageId: file.packageId!,
    packageName,
    surfaceKind,
    declarationKind,
    ownerName,
    methodName,
    body,
    methodSource: sourceRangeFromFileSpan(
      file.repoPath,
      sourceSpan(sourceFile, node),
    ),
  };
}

function ownerNameForFunction(
  sourceFile: ts.SourceFile,
  functionName: string,
): string {
  if (sourceFile.fileName.replace(/\\/gu, "/").endsWith("/connectable.ts")) {
    return "connectable";
  }
  return functionName === "getCollectionObserver"
    ? "module"
    : sourceFile.fileName;
}

function surfaceMethodRow(
  executable: ObservationExecutable,
  declaration:
    | ts.MethodDeclaration
    | ts.ConstructorDeclaration
    | ((ts.FunctionDeclaration | ts.FunctionExpression) & {
        readonly name: ts.Identifier;
      }),
): FrameworkObservationSurfaceMethodRow {
  const parameters = declaration.parameters;
  return {
    id: `framework-observation-method:${executable.packageId}:${executable.surfaceKind}:${executable.ownerName}:${executable.methodName}:${sourceKey(executable.methodSource)}`,
    packageId: executable.packageId,
    packageName: executable.packageName,
    surfaceKind: executable.surfaceKind,
    declarationKind: executable.declarationKind,
    ownerName: executable.ownerName,
    methodName: executable.methodName,
    parameterNames: parameters.map((parameter) =>
      parameter.name.getText(executable.sourceFile),
    ),
    parameterTypes: parameters.map(
      (parameter) => parameter.type?.getText(executable.sourceFile) ?? null,
    ),
    declaredReturnType:
      "type" in declaration && declaration.type !== undefined
        ? declaration.type.getText(executable.sourceFile)
        : null,
    source: executable.methodSource,
    summary: `${executable.ownerName}.${executable.methodName} is an observation ${executable.surfaceKind} ${executable.declarationKind}.`,
  };
}

function flowSitesForExecutable(
  sourceProject: SourceProject,
  executable: ObservationExecutable,
): readonly FrameworkObservationFlowSiteRow[] {
  const rows: FrameworkObservationFlowSiteRow[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== executable.body && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const row = flowSiteForCallLike(sourceProject, executable, node);
      if (row !== null) {
        rows.push(row);
      }
    }
    if (ts.isReturnStatement(node)) {
      const row = flowSiteForReturn(executable, node);
      if (row !== null) {
        rows.push(row);
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      const row = flowSiteForPropertyAccess(executable, node);
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(executable.body);
  return rows;
}

function flowSiteForCallLike(
  sourceProject: SourceProject,
  executable: ObservationExecutable,
  node: ts.CallExpression | ts.NewExpression,
): FrameworkObservationFlowSiteRow | null {
  const callSite = readTypeScriptCallSiteEntry(
    sourceProject,
    executable.sourceFile,
    node,
  );
  if (callSite === null) {
    return null;
  }
  const classification = classifyCallLike(
    executable,
    executable.sourceFile,
    node,
    callSite,
  );
  if (classification === null) {
    return null;
  }
  return flowSiteRow(
    executable,
    classification,
    node.getText(executable.sourceFile),
    sourceRangeFromFileSpan(executable.file.repoPath, callSite.span),
    callSite,
  );
}

function flowSiteForReturn(
  executable: ObservationExecutable,
  node: ts.ReturnStatement,
): FrameworkObservationFlowSiteRow | null {
  if (node.expression === undefined) {
    return null;
  }
  const classification = classifyReturnExpression(
    executable,
    executable.sourceFile,
    node.expression,
  );
  if (classification === null) {
    return null;
  }
  return flowSiteRow(
    executable,
    classification,
    node.getText(executable.sourceFile),
    sourceRangeFromFileSpan(
      executable.file.repoPath,
      sourceSpan(executable.sourceFile, node),
    ),
  );
}

function flowSiteForPropertyAccess(
  executable: ObservationExecutable,
  node: ts.PropertyAccessExpression,
): FrameworkObservationFlowSiteRow | null {
  const classification = classifyPropertyAccess(executable, node);
  if (classification === null) {
    return null;
  }
  return flowSiteRow(
    executable,
    classification,
    node.getText(executable.sourceFile),
    sourceRangeFromFileSpan(
      executable.file.repoPath,
      sourceSpan(executable.sourceFile, node),
    ),
  );
}

function flowSiteRow(
  executable: ObservationExecutable,
  classification: SiteClassification,
  expressionText: string,
  source: SourceRange,
  callSite?: TypeScriptCallSiteEntry,
): FrameworkObservationFlowSiteRow {
  const from = methodEndpoint(executable);
  const to = targetEndpoint(
    classification.targetName,
    executable,
    source,
    classification.targetKind,
  );
  return {
    id: `framework-observation-site:${executable.packageId}:${executable.surfaceKind}:${executable.ownerName}:${executable.methodName}:${classification.siteKind}:${sourceKey(source)}`,
    packageId: executable.packageId,
    packageName: executable.packageName,
    surfaceKind: executable.surfaceKind,
    siteKind: classification.siteKind,
    ownerName: executable.ownerName,
    methodName: executable.methodName,
    relation: classification.relation,
    mechanism: classification.mechanism,
    phase: FrameworkRelationshipPhase.Observation,
    targetName: classification.targetName,
    expressionText,
    from,
    to,
    ...(callSite === undefined ? {} : { callSite }),
    source,
    summary: `${executable.ownerName}.${executable.methodName} ${summaryVerb(
      classification,
    )} ${classification.targetName}.`,
  };
}

function classifyCallLike(
  executable: ObservationExecutable,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression | ts.NewExpression,
  callSite: TypeScriptCallSiteEntry,
): SiteClassification | null {
  if (ts.isNewExpression(node)) {
    return classifyNewExpression(executable, sourceFile, node, callSite);
  }
  const expression = unwrapExpression(node.expression);
  const calleeName = callSite.calleeName;
  const calleeText = node.expression.getText(sourceFile);
  const receiverText = propertyAccessReceiverText(sourceFile, expression);

  const watchClassification = classifyWatcherCall(
    executable,
    sourceFile,
    node,
    calleeName,
    calleeText,
    receiverText,
  );
  if (watchClassification !== null) {
    return watchClassification;
  }
  const effectClassification = classifyEffectCall(
    executable,
    sourceFile,
    node,
    calleeName,
    receiverText,
  );
  if (effectClassification !== null) {
    return effectClassification;
  }

  if (calleeText.includes("_nodeObserverLocator.handles")) {
    return lookupSite(
      FrameworkObservationFlowSiteKind.NodeLocatorHandles,
      FrameworkRelationshipMechanism.ObserverLocator,
      "INodeObserverLocator.handles",
      FrameworkRelationshipRelation.DelegatesLookup,
    );
  }
  if (calleeText.includes("_nodeObserverLocator.getObserver")) {
    return lookupSite(
      FrameworkObservationFlowSiteKind.NodeLocatorObserver,
      FrameworkRelationshipMechanism.ObserverLocator,
      "INodeObserverLocator.getObserver",
      FrameworkRelationshipRelation.DelegatesLookup,
    );
  }
  if (calleeText.includes("_nodeObserverLocator.getAccessor")) {
    return lookupSite(
      FrameworkObservationFlowSiteKind.NodeLocatorAccessor,
      FrameworkRelationshipMechanism.ObserverLocator,
      "INodeObserverLocator.getAccessor",
      FrameworkRelationshipRelation.DelegatesLookup,
    );
  }
  if (calleeName === "getObserverLookup") {
    return lookupSite(
      isObserverCacheWrite(node)
        ? FrameworkObservationFlowSiteKind.ObserverCacheWrite
        : FrameworkObservationFlowSiteKind.ObserverCacheRead,
      FrameworkRelationshipMechanism.ObserverCache,
      "observer lookup cache",
      isObserverCacheWrite(node)
        ? FrameworkRelationshipRelation.ConfiguresObservation
        : FrameworkRelationshipRelation.LooksUpObserver,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeText.includes("_dirtyChecker.createProperty")) {
    return dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckProperty,
      "IDirtyChecker.createProperty",
      FrameworkRelationshipRelation.ConstructsInstance,
    );
  }
  if (
    receiverText?.includes("_dirtyChecker") === true &&
    calleeName === "addProperty"
  ) {
    return dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckTrack,
      "IDirtyChecker.addProperty",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    receiverText?.includes("_dirtyChecker") === true &&
    calleeName === "removeProperty"
  ) {
    return dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckUntrack,
      "IDirtyChecker.removeProperty",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "queueRecurringTask") {
    return dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckSchedule,
      "queueRecurringTask",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "notify" && receiverText?.includes("subs") === true) {
    return dirtySite(
      FrameworkObservationFlowSiteKind.DirtyCheckFlush,
      "subscriber notification",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  const collectionClassification = classifyCollectionCall(
    sourceFile,
    node,
    callSite,
  );
  if (collectionClassification !== null) {
    return collectionClassification;
  }
  if (calleeName === "getComputedObserver") {
    return locatorSite(
      FrameworkObservationFlowSiteKind.ComputedObserver,
      "ObserverLocator.getComputedObserver",
      FrameworkRelationshipRelation.ConstructsInstance,
    );
  }
  if (calleeName === "getExpressionObserver") {
    return locatorSite(
      FrameworkObservationFlowSiteKind.ExpressionObserver,
      "IObserverLocator.getExpressionObserver",
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  if (calleeName === "getObserver" && calleeText.includes("adapter.")) {
    return locatorSite(
      FrameworkObservationFlowSiteKind.AdapterObserver,
      "IObjectObservationAdapter.getObserver",
      FrameworkRelationshipRelation.DelegatesLookup,
    );
  }
  if (calleeName === "getObserver" && calleeText.includes("pd.get")) {
    return locatorSite(
      FrameworkObservationFlowSiteKind.GetterObserver,
      "ObservableGetter.getObserver",
      FrameworkRelationshipRelation.DelegatesLookup,
    );
  }
  if (
    executable.surfaceKind === FrameworkObservationSurfaceKind.NodeObserverLocator &&
    calleeName === "getObserver" &&
    receiverText === "this"
  ) {
    return nodeSite(
      FrameworkObservationFlowSiteKind.NodeAccessorOverride,
      "NodeObserverLocator.getObserver",
      FrameworkRelationshipRelation.DelegatesLookup,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    ["useConfig", "useConfigGlobal"].includes(calleeName) &&
    receiverText === "this"
  ) {
    return nodeSite(
      FrameworkObservationFlowSiteKind.NodeObserverConfig,
      `NodeObserverLocator.${calleeName}`,
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    ["overrideAccessor", "overrideAccessorGlobal"].includes(calleeName) &&
    receiverText === "this"
  ) {
    return nodeSite(
      FrameworkObservationFlowSiteKind.NodeAccessorOverride,
      `NodeObserverLocator.${calleeName}`,
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "forNs" && calleeText.includes("AttributeNSAccessor")) {
    return nodeSite(
      FrameworkObservationFlowSiteKind.NodeAccessor,
      "AttributeNSAccessor.forNs",
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  if (calleeName === "add" && receiverText === "this.obs") {
    return connectableSite(
      FrameworkObservationFlowSiteKind.ConnectableSubscribe,
      "BindingObserverRecord.add",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "subscribe") {
    return connectableSite(
      FrameworkObservationFlowSiteKind.ConnectableSubscribe,
      receiverText === null ? "subscribe" : `${receiverText}.subscribe`,
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "unsubscribe") {
    return connectableSite(
      FrameworkObservationFlowSiteKind.ConnectableUnsubscribe,
      receiverText === null ? "unsubscribe" : `${receiverText}.unsubscribe`,
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (calleeName === "getObserver") {
    return locatorSite(
      FrameworkObservationFlowSiteKind.ObserverLocatorObserver,
      observerLocatorApiTarget(receiverText, "getObserver"),
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  if (calleeName === "getAccessor") {
    return locatorSite(
      FrameworkObservationFlowSiteKind.ObserverLocatorAccessor,
      observerLocatorApiTarget(receiverText, "getAccessor"),
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  return null;
}

function observerLocatorApiTarget(
  receiverText: string | null,
  methodName: string,
): string {
  if (
    receiverText !== null &&
    (receiverText === "this.oL" ||
      receiverText.endsWith(".oL") ||
      receiverText.toLowerCase().includes("observerlocator"))
  ) {
    return `IObserverLocator.${methodName}`;
  }
  return receiverText === null ? methodName : `${receiverText}.${methodName}`;
}

function classifyWatcherCall(
  executable: ObservationExecutable,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  calleeName: string,
  calleeText: string,
  receiverText: string | null,
): SiteClassification | null {
  const callText = node.getText(sourceFile);
  const surfaceKind = executable.surfaceKind;
  const isWatchDecorator =
    surfaceKind === FrameworkObservationSurfaceKind.WatchDecorator;
  const isWatchRegistry =
    surfaceKind === FrameworkObservationSurfaceKind.WatchRegistry;
  const isResourceWatchMetadata =
    surfaceKind === FrameworkObservationSurfaceKind.ResourceWatchMetadata;
  const isWatcherSetup =
    surfaceKind === FrameworkObservationSurfaceKind.WatcherSetup;
  const isWatcher = surfaceKind === FrameworkObservationSurfaceKind.Watcher;
  const isSlotWatcher =
    surfaceKind === FrameworkObservationSurfaceKind.SlotWatcher;

  if (isWatchRegistry && calleeName === "get" && receiverText === "watches") {
    return watchRegistrySite(
      FrameworkObservationFlowSiteKind.WatchDefinitionRead,
      "Watch registry WeakMap.get",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
    );
  }
  if (isWatchRegistry && calleeName === "set" && receiverText === "watches") {
    return watchRegistrySite(
      FrameworkObservationFlowSiteKind.WatchDefinitionStore,
      "Watch registry WeakMap.set",
      FrameworkRelationshipRelation.StoresWatchDefinition,
    );
  }
  if (isWatchRegistry && calleeName === "push" && receiverText === "defs") {
    return watchRegistrySite(
      FrameworkObservationFlowSiteKind.WatchDefinitionStore,
      "Watch registry definition array",
      FrameworkRelationshipRelation.StoresWatchDefinition,
    );
  }
  if (
    isResourceWatchMetadata &&
    calleeName === "mergeArrays" &&
    callText.includes("watches")
  ) {
    return watchMetadataSite(
      FrameworkObservationFlowSiteKind.ResourceWatchDefinitionMerge,
      "resource definition watch metadata",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
    );
  }
  if (isResourceWatchMetadata && calleeText === "Watch.getDefinitions") {
    return watchMetadataSite(
      FrameworkObservationFlowSiteKind.WatchDefinitionRead,
      "Watch.getDefinitions",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
    );
  }
  if (isWatchDecorator && calleeText === "Watch.add") {
    return watchDecoratorSite(
      FrameworkObservationFlowSiteKind.WatchDefinitionStore,
      "Watch.add",
      FrameworkRelationshipRelation.StoresWatchDefinition,
    );
  }
  if (isWatcherSetup && calleeText === "Watch.getDefinitions") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatchDefinitionRead,
      "Watch.getDefinitions",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
    );
  }
  if (
    isWatchDecorator &&
    calleeName === "push" &&
    callText.includes(".watches.push")
  ) {
    return watchDecoratorSite(
      FrameworkObservationFlowSiteKind.WatchDefinitionStore,
      "resource definition watches",
      FrameworkRelationshipRelation.StoresWatchDefinition,
    );
  }
  if (isWatcherSetup && calleeText === "Reflect.get") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatchCallbackResolve,
      "watch callback method",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    isWatcherSetup &&
    calleeName === "isFunction" &&
    callText.includes("expression")
  ) {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatchExpressionBranch,
      "watch expression kind",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    isWatcherSetup &&
    calleeName === "parse" &&
    receiverText !== null &&
    receiverText.includes("expressionParser")
  ) {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatchExpressionParse,
      "IExpressionParser.parse",
      FrameworkRelationshipRelation.ParsesExpression,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (isWatcherSetup && calleeName === "getAccessScopeAst") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatchAccessScopeAst,
      "AccessScopeExpression",
      FrameworkRelationshipRelation.ParsesExpression,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (
    isWatcherSetup &&
    calleeName === "addBinding" &&
    callText.includes("Watcher")
  ) {
    return watcherSite(
      callText.includes("ComputedWatcher")
        ? FrameworkObservationFlowSiteKind.ComputedWatcher
        : FrameworkObservationFlowSiteKind.ExpressionWatcher,
      "Controller.addBinding",
      FrameworkRelationshipRelation.ConfiguresObservation,
    );
  }
  if (isWatcher && calleeName === "queueTask") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherQueue,
      "queueTask",
      FrameworkRelationshipRelation.SchedulesEffect,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (isWatcher && calleeName === "enter") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherDependencyEnter,
      "ConnectableSwitcher.enter",
      FrameworkRelationshipRelation.CollectsDependency,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (isWatcher && calleeName === "exit") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherDependencyExit,
      "ConnectableSwitcher.exit",
      FrameworkRelationshipRelation.CollectsDependency,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (isWatcher && calleeName === "astEvaluate") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherCompute,
      "astEvaluate",
      FrameworkRelationshipRelation.EvaluatesExpression,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (isWatcher && calleeName === "compute" && receiverText === "this") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherCompute,
      "ComputedWatcher.compute",
      FrameworkRelationshipRelation.EvaluatesExpression,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (isWatcher && calleeName === "call" && receiverText === "this.$get") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherCompute,
      "dependency collection function",
      FrameworkRelationshipRelation.EvaluatesExpression,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (
    isWatcher &&
    calleeName === "call" &&
    receiverText === "this._callback"
  ) {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherCallbackInvoke,
      "IWatcherCallback",
      FrameworkRelationshipRelation.InvokesCallback,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    isWatcher &&
    ["clear", "clearAll"].includes(calleeName) &&
    receiverText === "this.obs"
  ) {
    return watcherSite(
      FrameworkObservationFlowSiteKind.WatcherDependencyClear,
      `observer record ${calleeName}`,
      FrameworkRelationshipRelation.CollectsDependency,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (isSlotWatcher && calleeName === "subscribe" && receiverText === "slot") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.SlotWatcherSubscribe,
      "IAuSlot.subscribe",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (
    isSlotWatcher &&
    calleeName === "unsubscribe" &&
    receiverText === "slot"
  ) {
    return watcherSite(
      FrameworkObservationFlowSiteKind.SlotWatcherUnsubscribe,
      "IAuSlot.unsubscribe",
      FrameworkRelationshipRelation.ConfiguresObservation,
      FrameworkRelationshipEndpointKind.Concept,
    );
  }
  if (isSlotWatcher && calleeName === "notify" && receiverText === "this.subs") {
    return watcherSite(
      FrameworkObservationFlowSiteKind.SlotWatcher,
      "slot watcher subscribers",
      FrameworkRelationshipRelation.InvokesCallback,
    );
  }
  return null;
}

function classifyEffectCall(
  executable: ObservationExecutable,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  calleeName: string,
  receiverText: string | null,
): SiteClassification | null {
  const callText = node.getText(sourceFile);
  if (
    executable.surfaceKind !== FrameworkObservationSurfaceKind.Effect &&
    !callText.includes("observer.")
  ) {
    return null;
  }
  if (calleeName === "run" && receiverText === "effect") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectRunner,
      "IEffect.run",
      FrameworkRelationshipRelation.SchedulesEffect,
    );
  }
  if (calleeName === "isString" && callText.includes("expressionOrGetter")) {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectWatchExpression,
      "watch expression kind",
      FrameworkRelationshipRelation.ReadsWatchDefinition,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (calleeName === "getExpressionObserver") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectWatchExpression,
      receiverText === null
        ? "IObserverLocator.getExpressionObserver"
        : `${receiverText}.getExpressionObserver`,
      FrameworkRelationshipRelation.LooksUpObserver,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (calleeName === "getObserver") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectWatchGetter,
      receiverText === null
        ? "IObserverLocator.getObserver"
        : `${receiverText}.getObserver`,
      FrameworkRelationshipRelation.LooksUpObserver,
      FrameworkRelationshipEndpointKind.Expression,
    );
  }
  if (calleeName === "subscribe" && receiverText === "observer") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectSubscribe,
      "observer.subscribe",
      FrameworkRelationshipRelation.ConfiguresObservation,
    );
  }
  if (calleeName === "unsubscribe" && receiverText === "observer") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectStop,
      "observer.unsubscribe",
      FrameworkRelationshipRelation.ConfiguresObservation,
    );
  }
  if (calleeName === "enterConnectable") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectDependencyEnter,
      "enterConnectable",
      FrameworkRelationshipRelation.CollectsDependency,
    );
  }
  if (calleeName === "exitConnectable") {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectDependencyExit,
      "exitConnectable",
      FrameworkRelationshipRelation.CollectsDependency,
    );
  }
  if (
    ["clear", "clearAll"].includes(calleeName) &&
    receiverText === "this.obs"
  ) {
    return effectSite(
      FrameworkObservationFlowSiteKind.WatcherDependencyClear,
      `observer record ${calleeName}`,
      FrameworkRelationshipRelation.CollectsDependency,
    );
  }
  if (calleeName === "fn" || callText.startsWith("this.fn(")) {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectRunner,
      "EffectRunFunc",
      FrameworkRelationshipRelation.InvokesCallback,
    );
  }
  if (calleeName === "callback") {
    return effectSite(
      FrameworkObservationFlowSiteKind.WatcherCallbackInvoke,
      "watch callback",
      FrameworkRelationshipRelation.InvokesCallback,
    );
  }
  if (callText.includes("cleanupTask?.") || callText.includes("_cleanupTask?.")) {
    return effectSite(
      FrameworkObservationFlowSiteKind.EffectCleanup,
      "effect cleanup callback",
      FrameworkRelationshipRelation.InvokesCallback,
    );
  }
  return null;
}

function classifyNewExpression(
  executable: ObservationExecutable,
  sourceFile: ts.SourceFile,
  node: ts.NewExpression,
  callSite: TypeScriptCallSiteEntry,
): SiteClassification | null {
  const target = callSite.calleeName || node.expression.getText(sourceFile);
  const staticClassification = newExpressionClassifications.get(target);
  if (staticClassification !== undefined) {
    return staticClassification;
  }
  if (
    executable.surfaceKind === FrameworkObservationSurfaceKind.NodeObserverLocator &&
    node.expression.getText(sourceFile).includes("ValueAttributeObserver")
  ) {
    return valueAttributeObserverConstructorSite();
  }
  return null;
}

function valueAttributeObserverConstructorSite(): SiteClassification {
  return nodeSite(
    FrameworkObservationFlowSiteKind.NodeObserver,
    "INodeObserverConstructor",
    FrameworkRelationshipRelation.ConstructsInstance,
  );
}

function classifyCollectionCall(
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  callSite: TypeScriptCallSiteEntry,
): SiteClassification | null {
  const calleeName = callSite.calleeName;
  const text = node.getText(sourceFile);
  if (calleeName === "getLengthObserver") {
    return collectionSite(
      FrameworkObservationFlowSiteKind.CollectionLengthObserver,
      `${collectionHelperInText(text) ?? "collection"}.getLengthObserver`,
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  if (calleeName === "getIndexObserver") {
    return collectionSite(
      FrameworkObservationFlowSiteKind.CollectionIndexObserver,
      `${collectionHelperInText(text) ?? "collection"}.getIndexObserver`,
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  if (
    calleeName === "getArrayObserver" ||
    calleeName === "getMapObserver" ||
    calleeName === "getSetObserver"
  ) {
    return collectionSite(
      FrameworkObservationFlowSiteKind.CollectionObserver,
      calleeName,
      FrameworkRelationshipRelation.LooksUpObserver,
    );
  }
  return null;
}

function classifyReturnExpression(
  executable: ObservationExecutable,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): SiteClassification | null {
  const text = expression.getText(sourceFile);
  const staticClassification = returnExpressionClassifications.get(text);
  if (staticClassification !== undefined) {
    return staticClassification;
  }
  if (
    executable.surfaceKind === FrameworkObservationSurfaceKind.NodeObserverLocator &&
    text === "observer"
  ) {
    return configuredNodeObserverReturnSite();
  }
  return null;
}

function configuredNodeObserverReturnSite(): SiteClassification {
  return nodeSite(
    FrameworkObservationFlowSiteKind.NodeObserver,
    "configured node observer",
    FrameworkRelationshipRelation.LooksUpObserver,
  );
}

function classifyPropertyAccess(
  executable: ObservationExecutable,
  node: ts.PropertyAccessExpression,
): SiteClassification | null {
  if (
    node.name.text !== "watches" ||
    executable.surfaceKind !== FrameworkObservationSurfaceKind.WatcherSetup
  ) {
    return null;
  }
  return watcherSite(
    FrameworkObservationFlowSiteKind.WatchDefinitionRead,
    node.getText(executable.sourceFile),
    FrameworkRelationshipRelation.ReadsWatchDefinition,
    FrameworkRelationshipEndpointKind.Concept,
  );
}

function collectionHelperInText(text: string): string | null {
  if (text.includes("getArrayObserver")) {
    return "getArrayObserver";
  }
  if (text.includes("getMapObserver")) {
    return "getMapObserver";
  }
  if (text.includes("getSetObserver")) {
    return "getSetObserver";
  }
  return null;
}

function propertyAccessReceiverText(
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(current)
    ? current.expression.getText(sourceFile)
    : null;
}

function isObserverCacheWrite(call: ts.CallExpression): boolean {
  let current: ts.Node = call;
  while (
    current.parent !== undefined &&
    (ts.isElementAccessExpression(current.parent) ||
      ts.isPropertyAccessExpression(current.parent))
  ) {
    current = current.parent;
  }
  return (
    current.parent !== undefined &&
    ts.isBinaryExpression(current.parent) &&
    current.parent.left === current &&
    current.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  );
}

function locatorSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.ObserverLocator,
    targetName,
    relation,
  );
}

function nodeSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Symbol,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.NodeObserverLocator,
    targetName,
    relation,
    targetKind,
  );
}

function dirtySite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Symbol,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.DirtyChecker,
    targetName,
    relation,
    targetKind,
  );
}

function collectionSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.CollectionObserver,
    targetName,
    relation,
  );
}

function connectableSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Symbol,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.Connectable,
    targetName,
    relation,
    targetKind,
  );
}

function watchDecoratorSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.WatchDecorator,
    targetName,
    relation,
    FrameworkRelationshipEndpointKind.Concept,
  );
}

function watchRegistrySite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.WatchRegistry,
    targetName,
    relation,
    FrameworkRelationshipEndpointKind.Concept,
  );
}

function watchMetadataSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.WatchMetadata,
    targetName,
    relation,
    FrameworkRelationshipEndpointKind.Concept,
  );
}

function watcherSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Symbol,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.Watcher,
    targetName,
    relation,
    targetKind,
  );
}

function effectSite(
  siteKind: FrameworkObservationFlowSiteKind,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Concept,
): SiteClassification {
  return lookupSite(
    siteKind,
    FrameworkRelationshipMechanism.Effect,
    targetName,
    relation,
    targetKind,
  );
}

function lookupSite(
  siteKind: FrameworkObservationFlowSiteKind,
  mechanism: FrameworkRelationshipMechanism,
  targetName: string,
  relation: FrameworkRelationshipRelation,
  targetKind: FrameworkRelationshipEndpointKind = FrameworkRelationshipEndpointKind.Symbol,
): SiteClassification {
  return { siteKind, relation, mechanism, targetName, targetKind };
}

function methodEndpoint(
  executable: ObservationExecutable,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Method,
    name: `${executable.ownerName}.${executable.methodName}`,
    packageId: executable.packageId,
    packageName: executable.packageName,
    source: executable.methodSource,
  };
}

function targetEndpoint(
  name: string,
  executable: ObservationExecutable,
  source: SourceRange,
  kind: FrameworkRelationshipEndpointKind,
): FrameworkRelationshipEndpoint {
  return {
    kind,
    name,
    packageId: executable.packageId,
    packageName: executable.packageName,
    source,
  };
}

function summaryVerb(classification: {
  readonly relation: FrameworkRelationshipRelation;
}): string {
  switch (classification.relation) {
    case FrameworkRelationshipRelation.DelegatesLookup:
      return "delegates observation to";
    case FrameworkRelationshipRelation.ConstructsInstance:
      return "constructs";
    case FrameworkRelationshipRelation.ConfiguresObservation:
      return "configures";
    case FrameworkRelationshipRelation.StoresWatchDefinition:
      return "stores";
    case FrameworkRelationshipRelation.ReadsWatchDefinition:
      return "reads";
    case FrameworkRelationshipRelation.ParsesExpression:
      return "parses";
    case FrameworkRelationshipRelation.EvaluatesExpression:
      return "evaluates";
    case FrameworkRelationshipRelation.CollectsDependency:
      return "collects dependencies through";
    case FrameworkRelationshipRelation.SchedulesEffect:
      return "schedules";
    case FrameworkRelationshipRelation.InvokesCallback:
      return "invokes";
    default:
      return "looks up";
  }
}

function observationRelationshipForFlowSite(
  row: FrameworkObservationFlowSiteRow,
): FrameworkObservationInternalRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Observation,
    relation: row.relation,
    mechanism: row.mechanism,
    phase: row.phase,
    packageId: row.packageId,
    packageName: row.packageName,
    surfaceKind: row.surfaceKind,
    siteKind: row.siteKind,
    ownerName: row.ownerName,
    methodName: row.methodName,
    targetName: row.targetName,
    from: row.from,
    to: row.to,
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function flowEntityLinksForSite(
  site: FrameworkObservationFlowSiteRow,
  entities: readonly FrameworkObserverEntityRow[],
): readonly FrameworkObservationFlowEntityLinkRow[] {
  const candidates = flowEntityCandidates(site);
  const rows: FrameworkObservationFlowEntityLinkRow[] = [];
  for (const candidate of candidates) {
    const matches = entities.filter((entity) =>
      entityMatchesFlowCandidate(entity, candidate),
    );
    for (const entity of matches) {
      rows.push(flowEntityLinkRow(site, entity, candidate.basis));
    }
    if (matches.length > 0 && candidate.basis !== FrameworkObservationTargetMatchBasis.TargetName) {
      break;
    }
  }
  return rows;
}

function flowEntityCandidates(site: FrameworkObservationFlowSiteRow): readonly {
  readonly basis: FrameworkObservationTargetMatchBasis;
  readonly value: string;
}[] {
  const candidates: {
    readonly basis: FrameworkObservationTargetMatchBasis;
    readonly value: string;
  }[] = [];
  const fullyQualifiedName = site.callSite?.callee.fullyQualifiedName;
  if (fullyQualifiedName !== null && fullyQualifiedName !== undefined) {
    candidates.push({
      basis: FrameworkObservationTargetMatchBasis.FullyQualifiedName,
      value: fullyQualifiedName,
    });
  }
  const symbolName = site.callSite?.callee.symbolName;
  if (symbolName !== null && symbolName !== undefined) {
    candidates.push({
      basis: FrameworkObservationTargetMatchBasis.SymbolName,
      value: symbolName,
    });
  }
  candidates.push({
    basis: FrameworkObservationTargetMatchBasis.TargetName,
    value: site.targetName,
  });
  const rootName = targetRootName(site.targetName);
  if (rootName !== site.targetName) {
    candidates.push({
      basis: FrameworkObservationTargetMatchBasis.TargetRootName,
      value: rootName,
    });
  }
  return uniqueCandidates(candidates);
}

function entityMatchesFlowCandidate(
  entity: FrameworkObserverEntityRow,
  candidate: {
    readonly basis: FrameworkObservationTargetMatchBasis;
    readonly value: string;
  },
): boolean {
  switch (candidate.basis) {
    case FrameworkObservationTargetMatchBasis.FullyQualifiedName:
      return (
        entity.exportEntry.fullyQualifiedName === candidate.value ||
        entity.exportEntry.targets.some(
          (target) => target.symbolKey === candidate.value,
        )
      );
    case FrameworkObservationTargetMatchBasis.SymbolName:
      return (
        entity.exportEntry.exportName === candidate.value ||
        entity.exportEntry.resolvedName === candidate.value
      );
    case FrameworkObservationTargetMatchBasis.TargetRootName:
    case FrameworkObservationTargetMatchBasis.TargetName:
      return (
        entity.exportEntry.exportName === candidate.value ||
        entity.exportEntry.resolvedName === candidate.value
      );
  }
}

function flowEntityLinkRow(
  site: FrameworkObservationFlowSiteRow,
  entity: FrameworkObserverEntityRow,
  matchBasis: FrameworkObservationTargetMatchBasis,
): FrameworkObservationFlowEntityLinkRow {
  const entitySource = entitySourceRange(entity);
  return {
    id: `${site.id}:entity-link:${matchBasis}:${entity.packageId}:${entity.exportEntry.exportName}`,
    packageId: site.packageId,
    packageName: site.packageName,
    flowSiteId: site.id,
    surfaceKind: site.surfaceKind,
    siteKind: site.siteKind,
    ownerName: site.ownerName,
    methodName: site.methodName,
    targetName: site.targetName,
    matchBasis,
    entityPackageId: entity.packageId,
    entityPackageName: entity.packageName,
    entityExportName: entity.exportEntry.exportName,
    entityResolvedName: entity.exportEntry.resolvedName,
    entityObserverKinds: entity.observerKinds,
    entityObserverCapabilities: entity.observerCapabilities,
    ...(entitySource === undefined ? {} : { entitySource }),
    source: site.source,
    summary: `${site.ownerName}.${site.methodName} ${summaryVerb(
      site,
    )} ${site.targetName}, linked to observer entity ${entity.packageId}:${entity.exportEntry.exportName} by ${matchBasis}.`,
  };
}

function entitySourceRange(
  entity: FrameworkObserverEntityRow,
): SourceRange | undefined {
  const target = entity.exportEntry.targets[0];
  if (target?.file === undefined || target.span === undefined) {
    return undefined;
  }
  return sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

function targetRootName(targetName: string): string {
  const match = /^[$_A-Za-z][$_0-9A-Za-z]*/u.exec(targetName);
  return match?.[0] ?? targetName;
}

function uniqueCandidates(
  candidates: readonly {
    readonly basis: FrameworkObservationTargetMatchBasis;
    readonly value: string;
  }[],
): readonly {
  readonly basis: FrameworkObservationTargetMatchBasis;
  readonly value: string;
}[] {
  const seen = new Set<string>();
  const unique: {
    readonly basis: FrameworkObservationTargetMatchBasis;
    readonly value: string;
  }[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.basis}:${candidate.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }
  return unique;
}

function uniqueFlowEntityLinks(
  rows: readonly FrameworkObservationFlowEntityLinkRow[],
): readonly FrameworkObservationFlowEntityLinkRow[] {
  const byKey = new Map<string, FrameworkObservationFlowEntityLinkRow>();
  for (const row of rows) {
    const key = `${row.flowSiteId}:${row.entityPackageId}:${row.entityExportName}`;
    const current = byKey.get(key);
    if (
      current === undefined ||
      flowEntityMatchSpecificity(row.matchBasis) >
        flowEntityMatchSpecificity(current.matchBasis)
    ) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

function flowEntityMatchSpecificity(
  basis: FrameworkObservationTargetMatchBasis,
): number {
  switch (basis) {
    case FrameworkObservationTargetMatchBasis.FullyQualifiedName:
      return 5;
    case FrameworkObservationTargetMatchBasis.SymbolName:
      return 4;
    case FrameworkObservationTargetMatchBasis.TargetRootName:
      return 2;
    case FrameworkObservationTargetMatchBasis.TargetName:
      return 1;
  }
}

function observationSurfaceMethodMatches(
  row: FrameworkObservationSurfaceMethodRow,
  filters: FrameworkObservationInternalFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.surfaceKind === undefined ||
      row.surfaceKind === filters.surfaceKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.surfaceKind,
        row.ownerName,
        row.methodName,
        ...row.parameterNames,
        ...row.parameterTypes.filter((type): type is string => type !== null),
        row.declaredReturnType ?? "",
      ].some((value) => value.includes(filters.query!)))
  );
}

function observationFlowSiteMatches(
  row: FrameworkObservationFlowSiteRow,
  filters: FrameworkObservationInternalFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.surfaceKind === undefined ||
      row.surfaceKind === filters.surfaceKind) &&
    (filters.siteKind === undefined || row.siteKind === filters.siteKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined ||
      row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.surfaceKind,
        row.siteKind,
        row.ownerName,
        row.methodName,
        row.targetName,
        row.expressionText,
        row.summary,
      ].some((value) => value.includes(filters.query!)))
  );
}

function observationRelationshipMatches(
  row: FrameworkObservationInternalRelationshipRow,
  filters: FrameworkObservationInternalFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.surfaceKind === undefined ||
      row.surfaceKind === filters.surfaceKind) &&
    (filters.siteKind === undefined || row.siteKind === filters.siteKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined ||
      row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName ||
      row.to.name === filters.targetName) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.surfaceKind,
        row.siteKind,
        row.ownerName,
        row.methodName,
        row.relation,
        row.mechanism,
        row.phase,
        row.targetName,
        row.from.name,
        row.to.name,
        row.summary,
      ].some((value) => value.includes(filters.query!)))
  );
}

function observationFlowEntityLinkMatches(
  row: FrameworkObservationFlowEntityLinkRow,
  filters: FrameworkObservationInternalFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.surfaceKind === undefined ||
      row.surfaceKind === filters.surfaceKind) &&
    (filters.siteKind === undefined || row.siteKind === filters.siteKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName ||
      row.entityExportName === filters.targetName) &&
    (filters.matchBasis === undefined ||
      row.matchBasis === filters.matchBasis) &&
    (filters.exportName === undefined ||
      row.entityExportName === filters.exportName) &&
    (filters.observerKind === undefined ||
      row.entityObserverKinds.includes(filters.observerKind)) &&
    (filters.observerCapability === undefined ||
      row.entityObserverCapabilities.includes(filters.observerCapability)) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.surfaceKind,
        row.siteKind,
        row.ownerName,
        row.methodName,
        row.targetName,
        row.matchBasis,
        row.entityPackageId,
        row.entityExportName,
        row.entityResolvedName,
        row.summary,
      ].some((value) => value.includes(filters.query!)))
  );
}

function compareSurfaceMethods(
  left: FrameworkObservationSurfaceMethodRow,
  right: FrameworkObservationSurfaceMethodRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.methodName.localeCompare(right.methodName) ||
    sourceKey(left.source).localeCompare(sourceKey(right.source))
  );
}

function compareFlowEntityLinks(
  left: FrameworkObservationFlowEntityLinkRow,
  right: FrameworkObservationFlowEntityLinkRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.methodName.localeCompare(right.methodName) ||
    left.siteKind.localeCompare(right.siteKind) ||
    left.entityPackageId.localeCompare(right.entityPackageId) ||
    left.entityExportName.localeCompare(right.entityExportName) ||
    sourceKey(left.source).localeCompare(sourceKey(right.source))
  );
}

function compareFlowSites(
  left: FrameworkObservationFlowSiteRow,
  right: FrameworkObservationFlowSiteRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.methodName.localeCompare(right.methodName) ||
    left.siteKind.localeCompare(right.siteKind) ||
    sourceKey(left.source).localeCompare(sourceKey(right.source))
  );
}

function compareInternalRelationships(
  left: FrameworkObservationInternalRelationshipRow,
  right: FrameworkObservationInternalRelationshipRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.siteKind.localeCompare(right.siteKind) ||
    left.mechanism.localeCompare(right.mechanism) ||
    left.relation.localeCompare(right.relation) ||
    left.from.name.localeCompare(right.from.name) ||
    left.to.name.localeCompare(right.to.name) ||
    sourceKey(left.source).localeCompare(sourceKey(right.source))
  );
}

function sourceKey(source: SourceRange): string {
  return [
    source.filePath,
    source.start.line,
    source.start.character,
    source.end.line,
    source.end.character,
  ].join(":");
}
