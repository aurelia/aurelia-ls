import ts from "typescript";

import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { FrameworkResourceDefinitionKind } from "../../framework/resources.js";
import {
  FrameworkLifecycleAppTaskExecutionKind,
  FrameworkLifecycleControllerCallKind,
  FrameworkLifecycleHookDispatchKind,
  FrameworkLifecycleParticipantKind,
} from "../../framework/lifecycle.js";
import type {
  SourceFileIdentity,
  SourceProject,
  TypeScriptCallSiteEntry,
} from "../../source/index.js";
import {
  readTypeScriptCallSiteEntry,
  SourceProjectMemo,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { clampBudget } from "../budget.js";
import {
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import type { SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset } from "../paging.js";
import {
  FrameworkBindingEffectKind,
  type FrameworkBindingEffectRow,
} from "./framework-entities.js";
import {
  filtersFromInquiry,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import { readFrameworkBindingEffects } from "./framework-rendering-graph.js";
import {
  readFrameworkResourceInstantiationRows,
  type FrameworkResourceInstantiationRow,
  type FrameworkResourceMaterializationSiteRow,
} from "./framework-resource-materialization.js";
import {
  checkerBasis,
  countBy,
  sourceIndexBasis,
  sourceRangeForCallSiteEntry,
  sourceRangeFromFileSpan,
  sourceSpan,
} from "./framework-support.js";
import {
  calleeTail,
  isNestedExecutionBoundary,
  propertyNameText,
} from "./framework-ts-utils.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";

/** Controller lifecycle method declaration. */
export interface FrameworkLifecycleControllerMethodRow {
  readonly id: string;
  readonly participantKind: FrameworkLifecycleParticipantKind.Controller;
  readonly packageId: string;
  readonly packageName: string;
  readonly className: string;
  readonly methodName: string;
  readonly lifecycleStage: string;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Controller lifecycle call site. */
export interface FrameworkLifecycleControllerCallRow {
  readonly id: string;
  readonly participantKind: FrameworkLifecycleParticipantKind.Controller;
  readonly packageId: string;
  readonly packageName: string;
  readonly className: string;
  readonly methodName: string;
  readonly lifecycleStage: string;
  readonly callKind: FrameworkLifecycleControllerCallKind;
  readonly calleeName: string;
  readonly calleeText: string;
  readonly callSite: TypeScriptCallSiteEntry;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Resource materialization site framed as lifecycle/world-phase evidence. */
export interface FrameworkLifecycleResourceSiteRow {
  readonly id: string;
  readonly participantKind: FrameworkLifecycleParticipantKind.Resource;
  readonly packageId: string;
  readonly packageName: string;
  readonly sourceExportName: string;
  readonly resourceKind: FrameworkResourceDefinitionKind;
  readonly resourceName: string | null;
  readonly targetName: string | null;
  readonly lifecycleStage: string;
  readonly instantiationKind: string;
  readonly site: FrameworkResourceMaterializationSiteRow;
  readonly source: SourceRange;
  readonly summary: string;
}

/** AppRoot AppTask execution site. */
export interface FrameworkLifecycleAppTaskExecutionRow {
  readonly id: string;
  readonly participantKind: FrameworkLifecycleParticipantKind.AppTask;
  readonly packageId: string;
  readonly packageName: string;
  readonly className: string;
  readonly methodName: string;
  readonly lifecycleStage: string;
  readonly executionKind: FrameworkLifecycleAppTaskExecutionKind;
  readonly slotName: string | null;
  readonly expressionText: string;
  readonly target: FrameworkRelationshipEndpoint;
  readonly callSite?: TypeScriptCallSiteEntry;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Controller view-model or registered lifecycle-hook dispatch site. */
export interface FrameworkLifecycleHookDispatchRow {
  readonly id: string;
  readonly participantKind:
    | FrameworkLifecycleParticipantKind.ViewModelHook
    | FrameworkLifecycleParticipantKind.LifecycleHook;
  readonly packageId: string;
  readonly packageName: string;
  readonly ownerName: string;
  readonly lifecycleStage: string;
  readonly hookName: string;
  readonly dispatchKind: FrameworkLifecycleHookDispatchKind;
  readonly expressionText: string;
  readonly callSite: TypeScriptCallSiteEntry;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Graph row derived by the lifecycle lens. */
export interface FrameworkLifecycleRelationshipRow {
  readonly id: string;
  readonly family: FrameworkRelationshipFamily.Lifecycle;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly participantKind: FrameworkLifecycleParticipantKind;
  readonly lifecycleStage: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

/** Value returned by framework.lifecycle. */
export interface FrameworkLifecycleValue {
  readonly controllerMethodCount: number;
  readonly controllerCallCount: number;
  readonly bindingEffectCount: number;
  readonly resourceSiteCount: number;
  readonly appTaskExecutionCount: number;
  readonly hookDispatchCount: number;
  readonly relationshipCount: number;
  readonly participantKinds: Readonly<Record<string, number>>;
  readonly lifecycleStages: Readonly<Record<string, number>>;
  readonly controllerCallKinds: Readonly<Record<string, number>>;
  readonly appTaskExecutionKinds: Readonly<Record<string, number>>;
  readonly hookDispatchKinds: Readonly<Record<string, number>>;
  readonly relationshipRelations: Readonly<Record<string, number>>;
  readonly relationshipMechanisms: Readonly<Record<string, number>>;
  readonly relationshipPhases: Readonly<Record<string, number>>;
  readonly controllerMethods?: readonly FrameworkLifecycleControllerMethodRow[];
  readonly controllerCalls?: readonly FrameworkLifecycleControllerCallRow[];
  readonly bindingEffects?: readonly FrameworkBindingEffectRow[];
  readonly resourceSites?: readonly FrameworkLifecycleResourceSiteRow[];
  readonly appTaskExecutions?: readonly FrameworkLifecycleAppTaskExecutionRow[];
  readonly hookDispatches?: readonly FrameworkLifecycleHookDispatchRow[];
  readonly relationships?: readonly FrameworkLifecycleRelationshipRow[];
}

export interface FrameworkLifecycleFilters extends FrameworkDiscoveryFilters {
  readonly lifecycleStage?: string;
  readonly participantKind?: string;
  readonly callKind?: string;
  readonly appTaskExecutionKind?: string;
  readonly slotName?: string;
  readonly hookDispatchKind?: string;
  readonly hookName?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

/** Filters for source-backed AppTask execution rows shared with admission/world-formation joins. */
export interface FrameworkLifecycleAppTaskExecutionFilters {
  readonly packageId?: string;
  readonly participantKind?: string;
  readonly lifecycleStage?: string;
  readonly appTaskExecutionKind?: string;
  readonly slotName?: string;
  readonly query?: string;
}

const controllerLifecycleMemo = new SourceProjectMemo<
  {
    readonly methods: readonly FrameworkLifecycleControllerMethodRow[];
    readonly calls: readonly FrameworkLifecycleControllerCallRow[];
  }
>();
const appTaskExecutionsMemo = new SourceProjectMemo<
  readonly FrameworkLifecycleAppTaskExecutionRow[]
>();
const hookDispatchesMemo = new SourceProjectMemo<
  readonly FrameworkLifecycleHookDispatchRow[]
>();

const LIFECYCLE_CONTROLLER_METHOD_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleControllerMethodRow>({
    id: "framework.lifecycle:controller-methods",
    rowLabel: "framework lifecycle controller method row(s)",
    evidenceForRow: evidenceForControllerMethod,
    continuationsForPage: controllerMethodContinuations,
  });

const LIFECYCLE_CONTROLLER_CALL_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleControllerCallRow>({
    id: "framework.lifecycle:controller-calls",
    rowLabel: "framework lifecycle controller call row(s)",
    evidenceForRow: evidenceForControllerCall,
    continuationsForPage: controllerCallContinuations,
  });

const LIFECYCLE_BINDING_EFFECT_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingEffectRow>({
    id: "framework.lifecycle:binding-effects",
    rowLabel: "framework lifecycle binding effect row(s)",
    evidenceForRow: evidenceForBindingEffect,
    continuationsForPage: bindingEffectContinuations,
  });

const LIFECYCLE_RESOURCE_SITE_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleResourceSiteRow>({
    id: "framework.lifecycle:resource-sites",
    rowLabel: "framework lifecycle resource materialization site row(s)",
    evidenceForRow: evidenceForResourceSite,
    continuationsForPage: resourceSiteContinuations,
  });

const LIFECYCLE_APP_TASK_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleAppTaskExecutionRow>({
    id: "framework.lifecycle:app-tasks",
    rowLabel: "framework lifecycle AppTask execution row(s)",
    evidenceForRow: evidenceForAppTaskExecution,
    continuationsForPage: appTaskExecutionContinuations,
  });

const LIFECYCLE_HOOK_DISPATCH_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleHookDispatchRow>({
    id: "framework.lifecycle:hook-dispatches",
    rowLabel: "framework lifecycle hook dispatch row(s)",
    evidenceForRow: evidenceForHookDispatch,
    continuationsForPage: hookDispatchContinuations,
  });

const LIFECYCLE_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkLifecycleRelationshipRow>({
    id: "framework.lifecycle:relationships",
    rowLabel: "framework lifecycle relationship row(s)",
    evidenceForRow: evidenceForLifecycleRelationship,
    continuationsForPage: relationshipContinuations,
  });

/** Answer framework.lifecycle inquiries from controller, binding, and resource lifecycle substrates. */
export function answerFrameworkLifecycle(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkLifecycleValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = lifecycleFiltersFromInquiry(inquiry);
  const controller = readControllerLifecycle(sourceProject);
  const controllerMethods = controller.methods.filter((row) =>
    controllerMethodMatches(row, filters),
  );
  const controllerCalls = controller.calls.filter((row) =>
    controllerCallMatches(row, filters),
  );
  const bindingEffects = readFrameworkBindingEffects(
    sourceProject,
    filters,
  ).filter(
    (row) =>
      row.effectKind === FrameworkBindingEffectKind.LifecycleMethod &&
      bindingEffectMatches(row, filters),
  );
  const resourceSites = readLifecycleResourceSites(sourceProject, filters);
  const appTaskExecutions = readLifecycleAppTaskExecutions(
    sourceProject,
    filters,
  );
  const hookDispatches = readLifecycleHookDispatches(sourceProject, filters);
  const relationships = [
    ...controllerMethods.map(controllerMethodRelationship),
    ...controllerCalls.map(controllerCallRelationship),
    ...bindingEffects.map(bindingEffectRelationship),
    ...resourceSites.map(resourceSiteRelationship),
    ...appTaskExecutions.map(appTaskExecutionRelationship),
    ...hookDispatches.map(hookDispatchRelationship),
  ].filter((row) => lifecycleRelationshipMatches(row, filters));

  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);
  const baseValue = lifecycleBaseValue(
    controllerMethods,
    controllerCalls,
    bindingEffects,
    resourceSites,
    appTaskExecutions,
    hookDispatches,
    relationships,
  );

  switch (projection) {
    case "controller-methods":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_CONTROLLER_METHOD_ROW_FAMILY,
        baseValue,
        controllerMethods,
        offset,
        limit,
        "controllerMethods",
      );
    case "controller-calls":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_CONTROLLER_CALL_ROW_FAMILY,
        baseValue,
        controllerCalls,
        offset,
        limit,
        "controllerCalls",
      );
    case "binding-effects":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_BINDING_EFFECT_ROW_FAMILY,
        baseValue,
        bindingEffects,
        offset,
        limit,
        "bindingEffects",
      );
    case "resource-sites":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_RESOURCE_SITE_ROW_FAMILY,
        baseValue,
        resourceSites,
        offset,
        limit,
        "resourceSites",
      );
    case "app-tasks":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_APP_TASK_ROW_FAMILY,
        baseValue,
        appTaskExecutions,
        offset,
        limit,
        "appTaskExecutions",
      );
    case "hook-dispatches":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_HOOK_DISPATCH_ROW_FAMILY,
        baseValue,
        hookDispatches,
        offset,
        limit,
        "hookDispatches",
      );
    case "relationships":
      return lifecyclePagedAnswer(
        inquiry,
        sourceProject,
        LIFECYCLE_RELATIONSHIP_ROW_FAMILY,
        baseValue,
        relationships,
        offset,
        limit,
        "relationships",
      );
    case "summary":
    default:
      return createAnswer(
        inquiry,
        OutcomeKind.Hit,
        `Framework lifecycle index has ${controllerMethods.length} controller method(s), ${controllerCalls.length} controller call(s), ${bindingEffects.length} binding lifecycle effect(s), ${resourceSites.length} resource materialization site(s), ${appTaskExecutions.length} AppTask execution row(s), ${hookDispatches.length} hook dispatch row(s), and ${relationships.length} relationship row(s).`,
        {
          value: baseValue,
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: [
            ...controllerMethods
              .slice(0, 2)
              .map(evidenceForControllerMethod),
            ...resourceSites.slice(0, 2).map(evidenceForResourceSite),
            ...appTaskExecutions
              .slice(0, 2)
              .map(evidenceForAppTaskExecution),
            ...hookDispatches.slice(0, 2).map(evidenceForHookDispatch),
            ...relationships
              .slice(0, 2)
              .map(evidenceForLifecycleRelationship),
          ],
          continuations: lifecycleSummaryContinuations(inquiry),
        },
      );
  }
}

/** Read normalized lifecycle relationship rows without projecting a lifecycle answer. */
export function readFrameworkLifecycleRelationships(
  sourceProject: SourceProject,
  filters: FrameworkLifecycleFilters = {},
): readonly FrameworkLifecycleRelationshipRow[] {
  const controller = readControllerLifecycle(sourceProject);
  const controllerMethods = controller.methods.filter((row) =>
    controllerMethodMatches(row, filters),
  );
  const controllerCalls = controller.calls.filter((row) =>
    controllerCallMatches(row, filters),
  );
  const bindingEffects = readFrameworkBindingEffects(
    sourceProject,
    filters,
  ).filter(
    (row) =>
      row.effectKind === FrameworkBindingEffectKind.LifecycleMethod &&
      bindingEffectMatches(row, filters),
  );
  const resourceSites = readLifecycleResourceSites(sourceProject, filters);
  const appTaskExecutions = readLifecycleAppTaskExecutions(
    sourceProject,
    filters,
  );
  const hookDispatches = readLifecycleHookDispatches(sourceProject, filters);
  return [
    ...controllerMethods.map(controllerMethodRelationship),
    ...controllerCalls.map(controllerCallRelationship),
    ...bindingEffects.map(bindingEffectRelationship),
    ...resourceSites.map(resourceSiteRelationship),
    ...appTaskExecutions.map(appTaskExecutionRelationship),
    ...hookDispatches.map(hookDispatchRelationship),
  ].filter((row) => lifecycleRelationshipMatches(row, filters));
}

function lifecyclePagedAnswer<TRow>(
  inquiry: Inquiry,
  sourceProject: SourceProject,
  rowFamily: PagedRowFamily<TRow>,
  baseValue: FrameworkLifecycleValue,
  rows: readonly TRow[],
  offset: number,
  limit: number,
  key:
    | "controllerMethods"
    | "controllerCalls"
    | "bindingEffects"
    | "resourceSites"
    | "appTaskExecutions"
    | "hookDispatches"
    | "relationships",
): Answer<FrameworkLifecycleValue> {
  return rowFamily.answer({
    inquiry,
    rows,
    offset,
    limit,
    basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
    value: (page) =>
      ({
        ...baseValue,
        [key]: page.rows,
      }) as FrameworkLifecycleValue,
  });
}

function readControllerLifecycle(sourceProject: SourceProject): {
  readonly methods: readonly FrameworkLifecycleControllerMethodRow[];
  readonly calls: readonly FrameworkLifecycleControllerCallRow[];
} {
  return controllerLifecycleMemo.read(sourceProject, () => {
    const rows = sourceProject
      .ownedSourceFiles()
      .filter((sourceFile) =>
        normalizePath(
          sourceProject.sourceFileIdentity(sourceFile)?.repoPath ??
            sourceFile.fileName,
        ).endsWith("runtime-html/src/templating/controller.ts"),
      )
      .flatMap((sourceFile) =>
        controllerLifecycleForSourceFile(sourceProject, sourceFile),
      );
    return {
      methods: rows.flatMap((row) => row.methods),
      calls: rows.flatMap((row) => row.calls),
    };
  });
}

function controllerLifecycleForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): readonly {
  readonly methods: readonly FrameworkLifecycleControllerMethodRow[];
  readonly calls: readonly FrameworkLifecycleControllerCallRow[];
}[] {
  const file = sourceProject.sourceFileIdentity(sourceFile);
  const packageInfo = sourceProject.packageForFileName(sourceFile.fileName);
  if (file === null || packageInfo === null || file.packageId === null) {
    return [];
  }
  return sourceFile.statements
    .filter(
      (statement): statement is ts.ClassDeclaration =>
        ts.isClassDeclaration(statement) &&
        statement.name?.text === "Controller",
    )
    .map((declaration) =>
      controllerLifecycleForClass(
        sourceProject,
        sourceFile,
        file,
        packageInfo.packageName,
        declaration,
      ),
    );
}

function controllerLifecycleForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  declaration: ts.ClassDeclaration,
): {
  readonly methods: readonly FrameworkLifecycleControllerMethodRow[];
  readonly calls: readonly FrameworkLifecycleControllerCallRow[];
} {
  const methods: FrameworkLifecycleControllerMethodRow[] = [];
  const calls: FrameworkLifecycleControllerCallRow[] = [];
  for (const member of declaration.members) {
    if (!ts.isMethodDeclaration(member) || member.body === undefined) {
      continue;
    }
    const methodName = propertyNameText(member.name);
    if (methodName === null) {
      continue;
    }
    const lifecycleStage = controllerLifecycleStage(methodName);
    if (lifecycleStage === null) {
      continue;
    }
    const methodSource = sourceRangeFromFileSpan(
      file.repoPath,
      sourceSpan(sourceFile, member),
    );
    methods.push({
      id: `framework-lifecycle:controller-method:${methodName}`,
      participantKind: FrameworkLifecycleParticipantKind.Controller,
      packageId: file.packageId!,
      packageName,
      className: "Controller",
      methodName,
      lifecycleStage,
      source: methodSource,
      summary: `Controller.${methodName} participates in ${lifecycleStage}.`,
    });
    for (const call of lifecycleCallsInMethod(member.body)) {
      const callSite = readTypeScriptCallSiteEntry(
        sourceProject,
        sourceFile,
        call,
      );
      if (callSite === null) {
        continue;
      }
      const calleeName = callSite.calleeName;
      const calleeStage = controllerLifecycleStage(calleeName) ?? lifecycleStage;
      calls.push({
        id: `framework-lifecycle:controller-call:${methodName}:${call.getStart(
          sourceFile,
        )}:${calleeName}`,
        participantKind: FrameworkLifecycleParticipantKind.Controller,
        packageId: file.packageId!,
        packageName,
        className: "Controller",
        methodName,
        lifecycleStage: calleeStage,
        callKind: controllerCallKind(
          call.expression.getText(sourceFile),
          calleeName,
        ),
        calleeName,
        calleeText: call.expression.getText(sourceFile),
        callSite,
        source: sourceRangeForCallSiteEntry(callSite),
        summary: `Controller.${methodName} invokes lifecycle participant ${call.expression.getText(
          sourceFile,
        )}.`,
      });
    }
  }
  return { methods, calls };
}

function lifecycleCallsInMethod(
  body: ts.Block,
): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isCallExpression(node) && isLifecycleCall(node)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return calls;
}

function isLifecycleCall(call: ts.CallExpression): boolean {
  const tail = calleeTail(call.expression);
  return (
    tail !== null &&
    (controllerLifecycleStage(tail) !== null ||
      [
        "_enterActivating",
        "_leaveActivating",
        "_enterDetaching",
        "_leaveDetaching",
        "_enterUnbinding",
        "_leaveUnbinding",
        "addBinding",
        "addChild",
        "dispose",
        "release",
      ].includes(tail))
  );
}

function controllerCallKind(
  calleeText: string,
  calleeName: string,
): FrameworkLifecycleControllerCallKind {
  if (calleeText.includes("children") || calleeText.includes(".next")) {
    return FrameworkLifecycleControllerCallKind.ChildController;
  }
  if (calleeText.includes("bindings")) {
    return FrameworkLifecycleControllerCallKind.BindingList;
  }
  if (
    calleeName.startsWith("_enter") ||
    calleeName.startsWith("_leave") ||
    calleeText.includes("$resolve") ||
    calleeText.includes("$reject")
  ) {
    return FrameworkLifecycleControllerCallKind.StateGate;
  }
  if (calleeName === "dispose" || calleeName === "release") {
    return FrameworkLifecycleControllerCallKind.Teardown;
  }
  return FrameworkLifecycleControllerCallKind.SelfLifecycle;
}

function controllerLifecycleStage(methodName: string): string | null {
  switch (methodName) {
    case "_hydrate":
    case "_hydrateCustomElement":
    case "_hydrateChildren":
    case "_hydrateCustomAttribute":
    case "_hydrateSynthetic":
    case "_hydrateSyntheticAdopted":
      return "hydrate";
    case "activate":
    case "_enterActivating":
    case "_leaveActivating":
      return "activate";
    case "deactivate":
      return "deactivate";
    case "bind":
      return "bind";
    case "unbind":
    case "_enterUnbinding":
    case "_leaveUnbinding":
      return "unbind";
    case "_attach":
      return "attach";
    case "_enterDetaching":
    case "_leaveDetaching":
      return "detach";
    case "addBinding":
      return "binding-admission";
    case "addChild":
      return "child-admission";
    case "release":
    case "dispose":
      return "dispose";
    default:
      return null;
  }
}

function readLifecycleResourceSites(
  sourceProject: SourceProject,
  filters: FrameworkLifecycleFilters,
): readonly FrameworkLifecycleResourceSiteRow[] {
  return readFrameworkResourceInstantiationRows(sourceProject, filters)
    .flatMap((row) => resourceLifecycleSitesForRow(row))
    .filter((row) => resourceSiteMatches(row, filters));
}

function resourceLifecycleSitesForRow(
  row: FrameworkResourceInstantiationRow,
): readonly FrameworkLifecycleResourceSiteRow[] {
  return row.materializationSites.map((site) => ({
    id: `${row.id}:lifecycle-site:${site.id}`,
    participantKind: FrameworkLifecycleParticipantKind.Resource,
    packageId: site.packageId,
    packageName: site.packageName,
    sourceExportName: row.sourceExportName,
    resourceKind: row.resourceKind,
    resourceName: row.resourceName,
    targetName: row.targetName,
    lifecycleStage: lifecycleStageForPhase(site.phase),
    instantiationKind: row.instantiationKind,
    site,
    source: site.source,
    summary: `${row.resourceKind} ${row.targetName ?? row.sourceExportName} participates in ${lifecycleStageForPhase(
      site.phase,
    )} through ${site.siteKind}.`,
  }));
}

export function readLifecycleAppTaskExecutions(
  sourceProject: SourceProject,
  filters: FrameworkLifecycleAppTaskExecutionFilters,
): readonly FrameworkLifecycleAppTaskExecutionRow[] {
  const rows = appTaskExecutionsMemo.read(sourceProject, () =>
    sourceProject
      .ownedSourceFiles()
      .filter((sourceFile) =>
        normalizePath(
          sourceProject.sourceFileIdentity(sourceFile)?.repoPath ??
            sourceFile.fileName,
        ).endsWith("runtime-html/src/app-root.ts"),
      )
      .flatMap((sourceFile) =>
        appTaskExecutionsForSourceFile(sourceProject, sourceFile),
      ),
  );
  return rows.filter((row) => appTaskExecutionMatches(row, filters));
}

function appTaskExecutionsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): readonly FrameworkLifecycleAppTaskExecutionRow[] {
  const file = sourceProject.sourceFileIdentity(sourceFile);
  const packageInfo = sourceProject.packageForFileName(sourceFile.fileName);
  if (file === null || packageInfo === null || file.packageId === null) {
    return [];
  }
  return sourceFile.statements
    .filter(
      (statement): statement is ts.ClassDeclaration =>
        ts.isClassDeclaration(statement) &&
        statement.name?.text === "AppRoot",
    )
    .flatMap((declaration) =>
      appTaskExecutionsForClass(
        sourceProject,
        sourceFile,
        file,
        packageInfo.packageName,
        declaration,
      ),
    );
}

function appTaskExecutionsForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  declaration: ts.ClassDeclaration,
): readonly FrameworkLifecycleAppTaskExecutionRow[] {
  const rows: FrameworkLifecycleAppTaskExecutionRow[] = [];
  for (const member of declaration.members) {
    const methodName = lifecycleMemberName(member);
    const body = lifecycleMemberBody(member);
    if (methodName === null || body === null) {
      continue;
    }
    const visit = (node: ts.Node): void => {
      const row = appTaskExecutionForNode(
        sourceProject,
        sourceFile,
        file,
        packageName,
        methodName,
        node,
      );
      if (row !== null) {
        rows.push(row);
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
  }
  return rows.sort(
    (left, right) =>
      left.source.start.line - right.source.start.line ||
      left.source.start.character - right.source.start.character ||
      left.executionKind.localeCompare(right.executionKind),
  );
}

function lifecycleMemberName(member: ts.ClassElement): string | null {
  if (ts.isConstructorDeclaration(member)) {
    return "constructor";
  }
  if (ts.isMethodDeclaration(member)) {
    return propertyNameText(member.name);
  }
  return null;
}

function lifecycleMemberBody(member: ts.ClassElement): ts.Block | null {
  if (
    (ts.isConstructorDeclaration(member) || ts.isMethodDeclaration(member)) &&
    member.body !== undefined
  ) {
    return member.body;
  }
  return null;
}

function appTaskExecutionForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  methodName: string,
  node: ts.Node,
): FrameworkLifecycleAppTaskExecutionRow | null {
  if (ts.isCallExpression(node)) {
    return appTaskExecutionForCall(
      sourceProject,
      sourceFile,
      file,
      packageName,
      methodName,
      node,
    );
  }
  if (ts.isBinaryExpression(node) && isAppTaskSlotFilter(node, sourceFile)) {
    return appTaskExecutionRow({
      sourceFile,
      file,
      packageName,
      methodName,
      node,
      executionKind: FrameworkLifecycleAppTaskExecutionKind.SlotFilter,
      slotName: null,
      lifecycleStage: "slot-filter",
      expressionText: node.getText(sourceFile),
      targetKind: FrameworkRelationshipEndpointKind.Concept,
      targetName: "task.slot matches requested slot",
      summary:
        "AppRoot filters registered AppTasks by comparing task.slot to the requested lifecycle slot.",
    });
  }
  return null;
}

function appTaskExecutionForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  methodName: string,
  call: ts.CallExpression,
): FrameworkLifecycleAppTaskExecutionRow | null {
  const calleeText = call.expression.getText(sourceFile);
  const tail = calleeTail(call.expression);
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  if (tail === "_runAppTasks") {
    const slotName = stringLiteralArgument(call, sourceFile, 0);
    if (slotName === null) {
      return null;
    }
    return appTaskExecutionRow({
      sourceFile,
      file,
      packageName,
      methodName,
      node: call,
      callSite,
      executionKind: FrameworkLifecycleAppTaskExecutionKind.SlotInvocation,
      slotName,
      lifecycleStage: slotName,
      expressionText: calleeText,
      targetKind: FrameworkRelationshipEndpointKind.AppTask,
      targetName: slotName,
      summary: `AppRoot invokes AppTask slot ${slotName}.`,
    });
  }
  if (tail === "getAll" && call.arguments[0]?.getText(sourceFile) === "IAppTask") {
    return appTaskExecutionRow({
      sourceFile,
      file,
      packageName,
      methodName,
      node: call,
      callSite,
      executionKind:
        FrameworkLifecycleAppTaskExecutionKind.TaskCollectionLookup,
      slotName: null,
      lifecycleStage: "task-lookup",
      expressionText: calleeText,
      targetKind: FrameworkRelationshipEndpointKind.DiKey,
      targetName: "IAppTask",
      summary: "AppRoot reads all registered IAppTask entries from the container.",
    });
  }
  if (tail === "run" && calleeText === "task.run") {
    return appTaskExecutionRow({
      sourceFile,
      file,
      packageName,
      methodName,
      node: call,
      callSite,
      executionKind: FrameworkLifecycleAppTaskExecutionKind.TaskRun,
      slotName: null,
      lifecycleStage: "task-run",
      expressionText: calleeText,
      targetKind: FrameworkRelationshipEndpointKind.Method,
      targetName: "task.run",
      targetExpression: callSite.callee,
      summary:
        "AppRoot invokes task.run() after the task slot matched the requested lifecycle slot.",
    });
  }
  return null;
}

function appTaskExecutionRow(input: {
  readonly sourceFile: ts.SourceFile;
  readonly file: SourceFileIdentity;
  readonly packageName: string;
  readonly methodName: string;
  readonly node: ts.Node;
  readonly callSite?: TypeScriptCallSiteEntry;
  readonly executionKind: FrameworkLifecycleAppTaskExecutionKind;
  readonly slotName: string | null;
  readonly lifecycleStage: string;
  readonly expressionText: string;
  readonly targetKind: FrameworkRelationshipEndpointKind;
  readonly targetName: string;
  readonly targetExpression?: TypeScriptCallSiteEntry["callee"];
  readonly summary: string;
}): FrameworkLifecycleAppTaskExecutionRow {
  const source =
    input.callSite === undefined
      ? sourceRangeFromFileSpan(input.file.repoPath, sourceSpan(input.sourceFile, input.node))
      : sourceRangeForCallSiteEntry(input.callSite);
  return {
    id: `framework-lifecycle:app-task:${input.methodName}:${input.node.getStart(
      input.sourceFile,
    )}:${input.executionKind}`,
    participantKind: FrameworkLifecycleParticipantKind.AppTask,
    packageId: input.file.packageId!,
    packageName: input.packageName,
    className: "AppRoot",
    methodName: input.methodName,
    lifecycleStage: input.lifecycleStage,
    executionKind: input.executionKind,
    slotName: input.slotName,
    expressionText: input.expressionText,
    target: {
      kind: input.targetKind,
      name: input.targetName,
      packageId: input.file.packageId!,
      packageName: input.packageName,
      source,
      ...(input.targetExpression === undefined
        ? {}
        : { expression: input.targetExpression }),
    },
    ...(input.callSite === undefined ? {} : { callSite: input.callSite }),
    source,
    summary: input.summary,
  };
}

function isAppTaskSlotFilter(
  node: ts.BinaryExpression,
  sourceFile: ts.SourceFile,
): boolean {
  return (
    node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
    node.left.getText(sourceFile) === "task.slot" &&
    node.right.getText(sourceFile) === "slot"
  );
}

function stringLiteralArgument(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  index: number,
): string | null {
  const argument = call.arguments[index];
  if (argument === undefined || ts.isSpreadElement(argument)) {
    return null;
  }
  return ts.isStringLiteralLike(argument) ? argument.text : argument.getText(sourceFile);
}

function readLifecycleHookDispatches(
  sourceProject: SourceProject,
  filters: FrameworkLifecycleFilters,
): readonly FrameworkLifecycleHookDispatchRow[] {
  const rows = hookDispatchesMemo.read(sourceProject, () =>
    sourceProject
      .ownedSourceFiles()
      .filter((sourceFile) =>
        normalizePath(
          sourceProject.sourceFileIdentity(sourceFile)?.repoPath ??
            sourceFile.fileName,
        ).endsWith("runtime-html/src/templating/controller.ts"),
      )
      .flatMap((sourceFile) =>
        hookDispatchesForSourceFile(sourceProject, sourceFile),
      ),
  );
  return rows.filter((row) => hookDispatchMatches(row, filters));
}

function hookDispatchesForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): readonly FrameworkLifecycleHookDispatchRow[] {
  const file = sourceProject.sourceFileIdentity(sourceFile);
  const packageInfo = sourceProject.packageForFileName(sourceFile.fileName);
  if (file === null || packageInfo === null || file.packageId === null) {
    return [];
  }
  const rows: FrameworkLifecycleHookDispatchRow[] = [];
  const visit = (node: ts.Node, ownerName: string): void => {
    const nextOwnerName = hookDispatchOwnerName(node, ownerName);
    if (ts.isCallExpression(node)) {
      const row = hookDispatchForCall(
        sourceProject,
        sourceFile,
        file,
        packageInfo.packageName,
        nextOwnerName,
        node,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, nextOwnerName));
  };
  visit(sourceFile, "module");
  return rows.sort(
    (left, right) =>
      left.source.start.line - right.source.start.line ||
      left.source.start.character - right.source.start.character ||
      left.dispatchKind.localeCompare(right.dispatchKind),
  );
}

function hookDispatchOwnerName(node: ts.Node, current: string): string {
  if (ts.isMethodDeclaration(node)) {
    const methodName = propertyNameText(node.name);
    return methodName === null ? current : `Controller.${methodName}`;
  }
  if (ts.isConstructorDeclaration(node)) {
    return "Controller.constructor";
  }
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
    return node.name.text;
  }
  return current;
}

function hookDispatchForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageName: string,
  ownerName: string,
  call: ts.CallExpression,
): FrameworkLifecycleHookDispatchRow | null {
  const calleeText = call.expression.getText(sourceFile);
  const tail = calleeTail(call.expression);
  if (tail === null) {
    return null;
  }
  const registeredCollectionHook = registeredHookCollectionName(call, sourceFile);
  if (registeredCollectionHook !== null) {
    const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
    if (callSite === null) {
      return null;
    }
    return hookDispatchRow({
      file,
      packageName,
      ownerName,
      call,
      callSite,
      sourceFile,
      hookName: registeredCollectionHook,
      dispatchKind:
        FrameworkLifecycleHookDispatchKind.RegisteredHookCollection,
      expressionText: calleeText,
      summary: `Controller dispatches registered lifecycle hook collection ${registeredCollectionHook}.`,
    });
  }
  if (isRegisteredHookCallback(calleeText, tail)) {
    const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
    if (callSite === null) {
      return null;
    }
    return hookDispatchRow({
      file,
      packageName,
      ownerName,
      call,
      callSite,
      sourceFile,
      hookName: tail,
      dispatchKind: FrameworkLifecycleHookDispatchKind.RegisteredHookCallback,
      expressionText: calleeText,
      summary: `${ownerName} invokes registered lifecycle hook ${tail}.`,
    });
  }
  if (isViewModelHookCall(calleeText, tail)) {
    const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
    if (callSite === null) {
      return null;
    }
    return hookDispatchRow({
      file,
      packageName,
      ownerName,
      call,
      callSite,
      sourceFile,
      hookName: tail,
      dispatchKind: FrameworkLifecycleHookDispatchKind.ViewModelHook,
      expressionText: calleeText,
      summary: `${ownerName} invokes view-model lifecycle hook ${tail}.`,
    });
  }
  return null;
}

function hookDispatchRow(input: {
  readonly file: SourceFileIdentity;
  readonly packageName: string;
  readonly ownerName: string;
  readonly sourceFile: ts.SourceFile;
  readonly call: ts.CallExpression;
  readonly callSite: TypeScriptCallSiteEntry;
  readonly hookName: string;
  readonly dispatchKind: FrameworkLifecycleHookDispatchKind;
  readonly expressionText: string;
  readonly summary: string;
}): FrameworkLifecycleHookDispatchRow {
  const participantKind =
    input.dispatchKind === FrameworkLifecycleHookDispatchKind.ViewModelHook
      ? FrameworkLifecycleParticipantKind.ViewModelHook
      : FrameworkLifecycleParticipantKind.LifecycleHook;
  return {
    id: `framework-lifecycle:hook-dispatch:${input.ownerName}:${input.call.getStart(
      input.sourceFile,
    )}:${input.dispatchKind}:${input.hookName}`,
    participantKind,
    packageId: input.file.packageId!,
    packageName: input.packageName,
    ownerName: input.ownerName,
    lifecycleStage: lifecycleStageForHookName(input.hookName),
    hookName: input.hookName,
    dispatchKind: input.dispatchKind,
    expressionText: input.expressionText,
    callSite: input.callSite,
    source: sourceRangeForCallSiteEntry(input.callSite),
    summary: input.summary,
  };
}

function registeredHookCollectionName(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
): string | null {
  const calleeText = call.expression.getText(sourceFile);
  const tail = calleeTail(call.expression);
  if (
    (tail !== "forEach" && tail !== "map") ||
    !calleeText.includes("_lifecycleHooks")
  ) {
    return null;
  }
  const first = call.arguments[0];
  if (first === undefined || ts.isSpreadElement(first)) {
    return null;
  }
  const helperName = first.getText(sourceFile);
  const match = /^call([A-Z][A-Za-z]+)Hook$/u.exec(helperName);
  return match === null ? null : lowerFirst(match[1]!);
}

function isRegisteredHookCallback(
  calleeText: string,
  hookName: string,
): boolean {
  return (
    calleeText.startsWith("l.instance.") &&
    lifecycleStageForHookName(hookName) !== "unknown"
  );
}

function isViewModelHookCall(calleeText: string, hookName: string): boolean {
  return (
    (calleeText.includes("_vm!.") || calleeText.includes("viewModel!.")) &&
    lifecycleStageForHookName(hookName) !== "unknown"
  );
}

function lifecycleStageForHookName(hookName: string): string {
  switch (hookName) {
    case "created":
    case "hydrating":
    case "hydrated":
      return "hydrate";
    case "binding":
    case "bound":
      return "bind";
    case "attaching":
    case "attached":
      return "attach";
    case "detaching":
      return "detach";
    case "unbinding":
      return "unbind";
    case "dispose":
      return "dispose";
    default:
      return "unknown";
  }
}

function lowerFirst(value: string): string {
  return value.length === 0 ? value : value[0]!.toLowerCase() + value.slice(1);
}

function lifecycleStageForPhase(phase: FrameworkRelationshipPhase): string {
  switch (phase) {
    case FrameworkRelationshipPhase.Compilation:
      return "compile";
    case FrameworkRelationshipPhase.Hydration:
      return "hydrate";
    case FrameworkRelationshipPhase.Binding:
      return "bind";
    case FrameworkRelationshipPhase.Registration:
    case FrameworkRelationshipPhase.RegistrationAdmission:
      return "register";
    case FrameworkRelationshipPhase.ResourceLookup:
    case FrameworkRelationshipPhase.Lookup:
      return "lookup";
    case FrameworkRelationshipPhase.Resolution:
      return "resolve";
    case FrameworkRelationshipPhase.Rendering:
      return "render";
    case FrameworkRelationshipPhase.Observation:
      return "observe";
    case FrameworkRelationshipPhase.Lifecycle:
      return "lifecycle";
    default:
      return phase;
  }
}

function lifecycleBaseValue(
  controllerMethods: readonly FrameworkLifecycleControllerMethodRow[],
  controllerCalls: readonly FrameworkLifecycleControllerCallRow[],
  bindingEffects: readonly FrameworkBindingEffectRow[],
  resourceSites: readonly FrameworkLifecycleResourceSiteRow[],
  appTaskExecutions: readonly FrameworkLifecycleAppTaskExecutionRow[],
  hookDispatches: readonly FrameworkLifecycleHookDispatchRow[],
  relationships: readonly FrameworkLifecycleRelationshipRow[],
): FrameworkLifecycleValue {
  const participantKinds = [
    ...controllerMethods.map((row) => row.participantKind),
    ...controllerCalls.map((row) => row.participantKind),
    ...bindingEffects.map(() => FrameworkLifecycleParticipantKind.Binding),
    ...resourceSites.map((row) => row.participantKind),
    ...appTaskExecutions.map((row) => row.participantKind),
    ...hookDispatches.map((row) => row.participantKind),
  ];
  const lifecycleStages = [
    ...controllerMethods.map((row) => row.lifecycleStage),
    ...controllerCalls.map((row) => row.lifecycleStage),
    ...bindingEffects.map((row) => row.methodName),
    ...resourceSites.map((row) => row.lifecycleStage),
    ...appTaskExecutions.map((row) => row.lifecycleStage),
    ...hookDispatches.map((row) => row.lifecycleStage),
  ];
  return {
    controllerMethodCount: controllerMethods.length,
    controllerCallCount: controllerCalls.length,
    bindingEffectCount: bindingEffects.length,
    resourceSiteCount: resourceSites.length,
    appTaskExecutionCount: appTaskExecutions.length,
    hookDispatchCount: hookDispatches.length,
    relationshipCount: relationships.length,
    participantKinds: countBy(participantKinds, (value) => value),
    lifecycleStages: countBy(lifecycleStages, (value) => value),
    controllerCallKinds: countBy(controllerCalls, (row) => row.callKind),
    appTaskExecutionKinds: countBy(
      appTaskExecutions,
      (row) => row.executionKind,
    ),
    hookDispatchKinds: countBy(hookDispatches, (row) => row.dispatchKind),
    relationshipRelations: countBy(relationships, (row) => row.relation),
    relationshipMechanisms: countBy(relationships, (row) => row.mechanism),
    relationshipPhases: countBy(relationships, (row) => row.phase),
  };
}

function controllerMethodRelationship(
  row: FrameworkLifecycleControllerMethodRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: FrameworkRelationshipRelation.TransitionsLifecycleState,
    mechanism: FrameworkRelationshipMechanism.ControllerLifecycle,
    phase: phaseForLifecycleStage(row.lifecycleStage),
    participantKind: row.participantKind,
    lifecycleStage: row.lifecycleStage,
    packageId: row.packageId,
    packageName: row.packageName,
    from: methodEndpoint(row.className, row.methodName, row),
    to: conceptEndpoint(row.lifecycleStage, row),
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.className}.${row.methodName} transitions lifecycle stage ${row.lifecycleStage}.`,
  };
}

function controllerCallRelationship(
  row: FrameworkLifecycleControllerCallRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: FrameworkRelationshipRelation.InvokesLifecycle,
    mechanism: FrameworkRelationshipMechanism.ControllerLifecycle,
    phase: phaseForLifecycleStage(row.lifecycleStage),
    participantKind: row.participantKind,
    lifecycleStage: row.lifecycleStage,
    packageId: row.packageId,
    packageName: row.packageName,
    from: methodEndpoint(row.className, row.methodName, row),
    to: {
      kind: FrameworkRelationshipEndpointKind.CallSite,
      name: row.calleeName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      expression: row.callSite.callee,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.className}.${row.methodName} invokes ${row.calleeText} as ${row.callKind}.`,
  };
}

function bindingEffectRelationship(
  row: FrameworkBindingEffectRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:lifecycle-relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: FrameworkRelationshipRelation.PerformsBindingEffect,
    mechanism: FrameworkRelationshipMechanism.BindingLifecycle,
    phase: FrameworkRelationshipPhase.Binding,
    participantKind: FrameworkLifecycleParticipantKind.Binding,
    lifecycleStage: row.methodName,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: row.bindingName,
      packageId: row.packageId,
      packageName: row.packageName,
    },
    to: {
      kind: FrameworkRelationshipEndpointKind.Method,
      name: row.effectName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      expression: row.expression,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.bindingName}.${row.methodName} exposes binding lifecycle effect ${row.effectName}.`,
  };
}

function resourceSiteRelationship(
  row: FrameworkLifecycleResourceSiteRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: row.site.relation,
    mechanism: row.site.mechanism,
    phase: row.site.phase,
    participantKind: row.participantKind,
    lifecycleStage: row.lifecycleStage,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Resource,
      name: row.targetName ?? row.sourceExportName,
      packageId: row.packageId,
      packageName: row.packageName,
      resourceKind: row.resourceKind,
      resourceName: row.resourceName,
    },
    to: {
      kind: FrameworkRelationshipEndpointKind.CallSite,
      name: row.site.subjectText,
      packageId: row.site.packageId,
      packageName: row.site.packageName,
      source: row.source,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function appTaskExecutionRelationship(
  row: FrameworkLifecycleAppTaskExecutionRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: relationForAppTaskExecution(row.executionKind),
    mechanism: mechanismForAppTaskExecution(row.executionKind),
    phase: phaseForAppTaskExecution(row),
    participantKind: row.participantKind,
    lifecycleStage: row.lifecycleStage,
    packageId: row.packageId,
    packageName: row.packageName,
    from: methodEndpoint(row.className, row.methodName, row),
    to: row.target,
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function relationForAppTaskExecution(
  executionKind: FrameworkLifecycleAppTaskExecutionKind,
): FrameworkRelationshipRelation {
  return executionKind ===
    FrameworkLifecycleAppTaskExecutionKind.TaskCollectionLookup
    ? FrameworkRelationshipRelation.LooksUpKey
    : FrameworkRelationshipRelation.InvokesLifecycle;
}

function mechanismForAppTaskExecution(
  executionKind: FrameworkLifecycleAppTaskExecutionKind,
): FrameworkRelationshipMechanism {
  return executionKind ===
    FrameworkLifecycleAppTaskExecutionKind.TaskCollectionLookup
    ? FrameworkRelationshipMechanism.ContainerGetAll
    : FrameworkRelationshipMechanism.AppTaskLifecycle;
}

function phaseForAppTaskExecution(
  row: FrameworkLifecycleAppTaskExecutionRow,
): FrameworkRelationshipPhase {
  if (row.executionKind !== FrameworkLifecycleAppTaskExecutionKind.SlotInvocation) {
    return FrameworkRelationshipPhase.Lifecycle;
  }
  switch (row.slotName) {
    case "creating":
    case "hydrating":
    case "hydrated":
      return FrameworkRelationshipPhase.Hydration;
    case "activating":
    case "activated":
    case "deactivating":
    case "deactivated":
    default:
      return FrameworkRelationshipPhase.Lifecycle;
  }
}

function hookDispatchRelationship(
  row: FrameworkLifecycleHookDispatchRow,
): FrameworkLifecycleRelationshipRow {
  return {
    id: `${row.id}:relationship`,
    family: FrameworkRelationshipFamily.Lifecycle,
    relation: FrameworkRelationshipRelation.InvokesLifecycle,
    mechanism: FrameworkRelationshipMechanism.LifecycleHookDispatch,
    phase: phaseForLifecycleStage(row.lifecycleStage),
    participantKind: row.participantKind,
    lifecycleStage: row.lifecycleStage,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Method,
      name: row.ownerName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
    },
    to: {
      kind:
        row.participantKind ===
        FrameworkLifecycleParticipantKind.ViewModelHook
          ? FrameworkRelationshipEndpointKind.Method
          : FrameworkRelationshipEndpointKind.AppTask,
      name: row.hookName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      expression: row.callSite.callee,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function phaseForLifecycleStage(stage: string): FrameworkRelationshipPhase {
  switch (stage) {
    case "hydrate":
      return FrameworkRelationshipPhase.Hydration;
    case "activate":
    case "deactivate":
    case "dispose":
    case "lifecycle":
      return FrameworkRelationshipPhase.Lifecycle;
    case "bind":
    case "unbind":
    case "binding-admission":
      return FrameworkRelationshipPhase.Binding;
    case "attach":
    case "detach":
      return FrameworkRelationshipPhase.Rendering;
    default:
      return FrameworkRelationshipPhase.Lifecycle;
  }
}

function methodEndpoint(
  className: string,
  methodName: string,
  row: {
    readonly packageId: string;
    readonly packageName: string;
    readonly source: SourceRange;
  },
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Method,
    name: `${className}.${methodName}`,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
  };
}

function conceptEndpoint(
  name: string,
  row: {
    readonly packageId: string;
    readonly packageName: string;
    readonly source: SourceRange;
  },
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Concept,
    name,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
  };
}

function lifecycleFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkLifecycleFilters {
  return {
    ...filtersFromInquiry(inquiry),
    ...lifecycleAxisFiltersFromRecord(inquiry.subject),
    ...lifecycleAxisFiltersFromRecord(inquiry.filters),
  };
}

function lifecycleAxisFiltersFromRecord(
  value: unknown,
): FrameworkLifecycleFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "lifecycleStage"),
    ...stringFilter(source, "participantKind"),
    ...stringFilter(source, "callKind"),
    ...stringFilter(source, "appTaskExecutionKind"),
    ...stringFilter(source, "slotName"),
    ...stringFilter(source, "hookDispatchKind"),
    ...stringFilter(source, "hookName"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "mechanism"),
    ...stringFilter(source, "phase"),
  };
}

function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkLifecycleFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function controllerMethodMatches(
  row: FrameworkLifecycleControllerMethodRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.query === undefined ||
      row.className.includes(filters.query) ||
      row.methodName.includes(filters.query) ||
      row.lifecycleStage.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function controllerCallMatches(
  row: FrameworkLifecycleControllerCallRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.callKind === undefined || row.callKind === filters.callKind) &&
    (filters.query === undefined ||
      row.className.includes(filters.query) ||
      row.methodName.includes(filters.query) ||
      row.callKind.includes(filters.query) ||
      row.calleeName.includes(filters.query) ||
      row.calleeText.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function resourceSiteMatches(
  row: FrameworkLifecycleResourceSiteRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.resourceKind === undefined ||
      row.resourceKind === filters.resourceKind) &&
    (filters.query === undefined ||
      row.sourceExportName.includes(filters.query) ||
      row.resourceKind.includes(filters.query) ||
      row.targetName?.includes(filters.query) === true ||
      row.site.siteKind.includes(filters.query) ||
      row.site.subjectText.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function bindingEffectMatches(
  row: FrameworkBindingEffectRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.participantKind === undefined ||
      filters.participantKind === FrameworkLifecycleParticipantKind.Binding) &&
    (filters.lifecycleStage === undefined ||
      row.methodName === filters.lifecycleStage) &&
    (filters.query === undefined ||
      row.bindingName.includes(filters.query) ||
      row.methodName.includes(filters.query) ||
      row.effectName.includes(filters.query) ||
      bindingEffectSummary(row).includes(filters.query))
  );
}

function appTaskExecutionMatches(
  row: FrameworkLifecycleAppTaskExecutionRow,
  filters: FrameworkLifecycleAppTaskExecutionFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.appTaskExecutionKind === undefined ||
      row.executionKind === filters.appTaskExecutionKind) &&
    (filters.slotName === undefined || row.slotName === filters.slotName) &&
    (filters.query === undefined ||
      row.className.includes(filters.query) ||
      row.methodName.includes(filters.query) ||
      row.executionKind.includes(filters.query) ||
      row.slotName?.includes(filters.query) === true ||
      row.expressionText.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function hookDispatchMatches(
  row: FrameworkLifecycleHookDispatchRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.hookDispatchKind === undefined ||
      row.dispatchKind === filters.hookDispatchKind) &&
    (filters.hookName === undefined || row.hookName === filters.hookName) &&
    (filters.query === undefined ||
      row.ownerName.includes(filters.query) ||
      row.hookName.includes(filters.query) ||
      row.dispatchKind.includes(filters.query) ||
      row.expressionText.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function lifecycleRelationshipMatches(
  row: FrameworkLifecycleRelationshipRow,
  filters: FrameworkLifecycleFilters,
): boolean {
  return (
    commonLifecycleMatches(row, filters) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined ||
      row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function commonLifecycleMatches(
  row: {
    readonly packageId: string;
    readonly participantKind: FrameworkLifecycleParticipantKind;
    readonly lifecycleStage: string;
  },
  filters: {
    readonly packageId?: string;
    readonly participantKind?: string;
    readonly lifecycleStage?: string;
  },
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.participantKind === undefined ||
      row.participantKind === filters.participantKind) &&
    (filters.lifecycleStage === undefined ||
      row.lifecycleStage === filters.lifecycleStage)
  );
}

function evidenceForControllerMethod(
  row: FrameworkLifecycleControllerMethodRow,
): Evidence {
  return lifecycleEvidence(row.id, row.summary, row.source, row);
}

function evidenceForControllerCall(
  row: FrameworkLifecycleControllerCallRow,
): Evidence {
  return lifecycleEvidence(row.id, row.summary, row.source, row);
}

function evidenceForBindingEffect(row: FrameworkBindingEffectRow): Evidence {
  return lifecycleEvidence(row.id, bindingEffectSummary(row), row.source, row);
}

function evidenceForResourceSite(row: FrameworkLifecycleResourceSiteRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForAppTaskExecution(
  row: FrameworkLifecycleAppTaskExecutionRow,
): Evidence {
  return lifecycleEvidence(row.id, row.summary, row.source, row);
}

function evidenceForHookDispatch(row: FrameworkLifecycleHookDispatchRow): Evidence {
  return lifecycleEvidence(row.id, row.summary, row.source, row);
}

function evidenceForLifecycleRelationship(
  row: FrameworkLifecycleRelationshipRow,
): Evidence {
  return lifecycleEvidence(row.id, row.summary, row.source, row);
}

function lifecycleEvidence(
  id: string,
  summary: string,
  source: SourceRange,
  data: unknown,
): Evidence {
  return {
    id: `${id}:evidence`,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary,
    source,
    data,
  };
}

function bindingEffectSummary(row: FrameworkBindingEffectRow): string {
  return `${row.bindingName}.${row.methodName} exposes binding lifecycle effect ${row.effectName}.`;
}

function lifecycleSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.lifecycle:controller-methods",
      "controller-methods",
      "Inspect controller lifecycle method declarations.",
      { basis: [], summary: "framework.lifecycle:controller-methods" },
    ),
    projectionContinuation(
      inquiry,
      "framework.lifecycle:resource-sites",
      "resource-sites",
      "Inspect resource materialization sites by lifecycle/world phase.",
      { basis: [], summary: "framework.lifecycle:resource-sites" },
    ),
    projectionContinuation(
      inquiry,
      "framework.lifecycle:app-tasks",
      "app-tasks",
      "Inspect AppTask slot invocation, lookup, filtering, and run sites.",
      { basis: [], summary: "framework.lifecycle:app-tasks" },
    ),
    projectionContinuation(
      inquiry,
      "framework.lifecycle:hook-dispatches",
      "hook-dispatches",
      "Inspect view-model and registered lifecycle hook dispatch sites.",
      { basis: [], summary: "framework.lifecycle:hook-dispatches" },
    ),
    projectionContinuation(
      inquiry,
      "framework.lifecycle:relationships",
      "relationships",
      "Inspect normalized lifecycle relationships.",
      { basis: [], summary: "framework.lifecycle:relationships" },
    ),
  ];
}

function controllerMethodContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleControllerMethodRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return rowSourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.lifecycle:controller-methods",
    "Continue controller lifecycle method rows.",
    "Inspect the controller lifecycle method source.",
  );
}

function controllerCallContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleControllerCallRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...rowSourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.lifecycle:controller-calls",
      "Continue controller lifecycle call rows.",
      "Inspect the controller lifecycle call source.",
    ),
    ...childControllerActivationContinuations(inquiry, rows),
  ];
}

function childControllerActivationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleControllerCallRow[],
): readonly Continuation[] {
  return rows
    .slice(0, 3)
    .flatMap((row, index): readonly Continuation[] => {
      if (row.callKind !== FrameworkLifecycleControllerCallKind.ChildController) {
        return [];
      }
      const evidence = evidenceForControllerCall(row);
      const semanticRoute = new FrameworkSemanticRouteBuilder(
        inquiry,
        "framework.lifecycle:controller-calls",
        index,
        evidence,
      );
      return [
        semanticRoute.continuation(
          FrameworkSemanticRoutes.LifecycleToRenderingControllerCreations,
          "controller-creations",
          {
            filters: { packageId: row.packageId },
            rationale:
              "Inspect renderer hydration rows that create and admit child controllers before activation.",
            routeSummary:
              "Child activation back to renderer child-controller creation.",
          },
        ),
        semanticRoute.continuation(
          FrameworkSemanticRoutes.LifecycleToRenderingRelationships,
          "child-admissions",
          {
            filters: {
              packageId: row.packageId,
              mechanism: FrameworkRelationshipMechanism.ControllerAddChild,
            },
            rationale:
              "Inspect normalized rendering relationship rows for controller child admission.",
            routeSummary:
              "Child activation back to controller child-admission relationships.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      ];
    });
}

function bindingEffectContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingEffectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...rowSourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.lifecycle:binding-effects",
      "Continue binding lifecycle effect rows.",
      "Inspect the binding lifecycle effect source.",
    ),
    projectionContinuation(
      inquiry,
      "framework.lifecycle:rendering-binding-effects",
      "binding-effects",
      "Stay in lifecycle rows filtered to binding effects.",
      { basis: [], summary: "framework.lifecycle:binding-effects" },
    ),
  ];
}

function resourceSiteContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleResourceSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...rowSourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.lifecycle:resource-sites",
      "Continue resource lifecycle site rows.",
      "Inspect the resource materialization site source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      new FrameworkSemanticRouteBuilder(
        inquiry,
        "framework.lifecycle:resource-sites",
        index,
        evidenceForResourceSite(row),
      ).continuation(
        FrameworkSemanticRoutes.LifecycleToMaterializationResourceInstantiations,
        "materialization",
        {
          filters: {
            resourceKind: row.resourceKind,
            resourceName: row.targetName ?? row.sourceExportName,
          },
          rationale:
            "Return to the resource materialization row that contributed this lifecycle site.",
          routeSummary: "Resource lifecycle site back to materialization row.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    ),
  ];
}

function appTaskExecutionContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleAppTaskExecutionRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...rowSourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.lifecycle:app-tasks",
      "Continue AppTask execution rows.",
      "Inspect the AppTask execution source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      new FrameworkSemanticRouteBuilder(
        inquiry,
        "framework.lifecycle:app-tasks",
        index,
        evidenceForAppTaskExecution(row),
      ).continuation(
        FrameworkSemanticRoutes.LifecycleToDiscoveryAppTasks,
        "catalog",
        {
          filters: {
            packageId: row.packageId,
            query: row.slotName ?? "IAppTask",
          },
          rationale:
            "Return to the AppTask/lifecycle task entity catalog behind this execution site.",
          routeSummary: "AppTask execution site back to AppTask entity catalog.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    ),
  ];
}

function hookDispatchContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleHookDispatchRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...rowSourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.lifecycle:hook-dispatches",
      "Continue lifecycle hook dispatch rows.",
      "Inspect the lifecycle hook dispatch source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      projectionContinuation(
        inquiry,
        `framework.lifecycle:hook-dispatches:relationships:${index}`,
        "relationships",
        "Inspect normalized lifecycle relationships for this hook dispatch lane.",
        {
          filters: {
            ...inquiry.filters,
            participantKind: row.participantKind,
            hookName: row.hookName,
          },
          evidence: evidenceForHookDispatch(row),
          priority: ContinuationPriority.Secondary,
          summary: "Lifecycle hook dispatch row to relationship projection.",
        },
      ),
    ),
  ];
}

function relationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkLifecycleRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return rowSourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.lifecycle:relationships",
    "Continue lifecycle relationship rows.",
    "Inspect the lifecycle relationship source.",
  );
}

function rowSourceContinuations<TRow extends { readonly source: SourceRange }>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  idPrefix: string,
  nextPageRationale: string,
  sourceRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        `${idPrefix}:next-page`,
        nextPageRationale,
        nextOffset,
        limit,
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      idPrefix,
      index,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        sourceRationale,
        "Source for lifecycle row.",
      ),
    );
  }
  return continuations;
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
