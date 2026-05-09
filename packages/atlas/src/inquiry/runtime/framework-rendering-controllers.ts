import ts from "typescript";

import { FrameworkResourceDefinitionKind } from "../../framework/index.js";
import {
  readTypeScriptCallSiteEntry,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectMemo,
  type SourceProject,
  type TypeScriptCallSiteEntry,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type {
  FrameworkControllerHydrationStepKind,
  FrameworkControllerHydrationStepRow,
  FrameworkControllerCreationRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkPackageNames } from "./framework-package-exports.js";
import {
  instructionNameFromRenderMethod,
  rendererClassExpression,
  rendererTargetExpression,
} from "./framework-rendering-inspection.js";
import {
  calleeTail,
  callExpressionsIn,
  propertyNameText,
  unwrapExpression,
} from "./framework-ts-utils.js";
import { isRendererHelperCall } from "./framework-resources.js";

const controllerCreationsMemo = new SourceProjectMemo<
  readonly FrameworkControllerCreationRow[]
>();

/** Read renderer flows that create/admit child controllers during hydration. */
export function readFrameworkControllerCreations(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkControllerCreationRow[] {
  const rows = controllerCreationsMemo.read(sourceProject, () =>
    scanFrameworkControllerCreations(sourceProject),
  );
  return rows.filter((row) => controllerCreationMatches(row, filters));
}

function scanFrameworkControllerCreations(
  sourceProject: SourceProject,
): readonly FrameworkControllerCreationRow[] {
  const sourceFile = sourceProject.readSourceFile(
    "aurelia/packages/runtime-html/src/renderer.ts",
  );
  if (sourceFile === null) {
    return [];
  }
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageId = "runtime-html";
  const packageName = packageNames.get(packageId) ?? "@aurelia/runtime-html";
  return sourceFile.statements.flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.flatMap((declaration) =>
          controllerCreationForDeclaration(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            declaration,
          ),
        )
      : [],
  );
}

function controllerCreationForDeclaration(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.VariableDeclaration,
): readonly FrameworkControllerCreationRow[] {
  if (
    declaration.initializer === undefined ||
    !ts.isIdentifier(declaration.name)
  ) {
    return [];
  }
  const initializer = unwrapExpression(declaration.initializer);
  if (!ts.isCallExpression(initializer) || !isRendererHelperCall(initializer)) {
    return [];
  }
  const rendererClass = rendererClassExpression(initializer);
  if (rendererClass === null) {
    return [];
  }
  const renderMethod = rendererClass.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) && propertyNameText(member.name) === "render",
  );
  if (renderMethod === undefined || renderMethod.body === undefined) {
    return [];
  }
  const calls = callExpressionsIn(renderMethod.body);
  const controllerFactoryCall = calls.find(isControllerFactoryCall);
  if (controllerFactoryCall === undefined) {
    return [];
  }
  const controllerFactoryEntry = readTypeScriptCallSiteEntry(
    sourceProject,
    sourceFile,
    controllerFactoryCall,
  );
  if (controllerFactoryEntry === null) {
    return [];
  }
  const targetExpression = rendererTargetExpression(rendererClass);
  const instructionTarget =
    targetExpression === null ? null : targetExpression.getText(sourceFile);
  const rendererName = declaration.name.text;
  const resourceKind = resourceKindForRenderer(
    rendererName,
    instructionTarget,
    controllerFactoryCall,
  );
  const viewFactoryCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isViewFactoryCall) ??
    null;
  const renderLocationCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isRenderLocationCall) ??
    null;
  const viewModelCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isViewModelCall) ??
    null;
  const referenceRegistrationCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isReferenceRegistrationCall) ??
    null;
  const childAdmissionCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isChildAdmissionCall) ??
    null;
  const recursiveDispatchCalls = calls
    .filter(isRecursiveRendererDispatchCall)
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter(
      (entry): entry is TypeScriptCallSiteEntry => entry !== null,
    );
  const linkCall =
    callSiteEntryForFirst(sourceProject, sourceFile, calls, isLinkHookCall) ??
    null;
  const hydrationSteps = orderedHydrationSteps([
    stepFor("view-factory-creation", viewFactoryCall),
    stepFor("render-location", renderLocationCall),
    stepFor("view-model-invocation", viewModelCall),
    stepFor("controller-creation", controllerFactoryEntry),
    stepFor("reference-registration", referenceRegistrationCall),
    stepFor("template-controller-link", linkCall),
    ...recursiveDispatchCalls.map((call) => stepFor("recursive-dispatch", call)),
    stepFor("child-admission", childAdmissionCall),
  ]);
  const childControllerExpression =
    assignedNameForCall(controllerFactoryCall) ??
    childAdmissionCall?.arguments[0]?.expression.text ??
    "childController";
  const parentControllerExpression =
    renderMethod.parameters[0]?.name.getText(sourceFile) ?? "renderingCtrl";
  return [
    {
      id: `framework-controller-creation:${packageId}:${rendererName}:${controllerFactoryEntry.span.start}`,
      packageId,
      packageName,
      rendererName,
      resourceKind,
      instructionName: instructionNameFromRenderMethod(
        sourceProject,
        renderMethod,
      ),
      instructionTarget,
      parentControllerExpression,
      childControllerExpression,
      viewFactoryCall,
      renderLocationCall,
      viewModelCall,
      controllerFactoryCall: controllerFactoryEntry,
      referenceRegistrationCall,
      childAdmissionCall,
      recursiveDispatchCalls,
      linkCall,
      hydrationSteps,
      source: sourceRangeForAdmittedFileNode(sourceProject, sourceFile, renderMethod),
      summary: `${rendererName} creates ${resourceKind} child controller ${childControllerExpression} and admits it to ${parentControllerExpression}.`,
    },
  ];
}

function callSiteEntryForFirst(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  calls: readonly ts.CallExpression[],
  predicate: (call: ts.CallExpression) => boolean,
): TypeScriptCallSiteEntry | null {
  const call = calls.find(predicate);
  return call === undefined
    ? null
    : readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
}

function isControllerFactoryCall(call: ts.CallExpression): boolean {
  const tail = calleeTail(call.expression);
  return tail === "$el" || tail === "$attr";
}

function isViewModelCall(call: ts.CallExpression): boolean {
  const tail = calleeTail(call.expression);
  return (
    (tail === "invoke" && call.expression.getText(call.getSourceFile()).includes(".invoke")) ||
    tail === "invokeAttribute"
  );
}

function isViewFactoryCall(call: ts.CallExpression): boolean {
  return calleeTail(call.expression) === "getViewFactory";
}

function isRenderLocationCall(call: ts.CallExpression): boolean {
  return calleeTail(call.expression) === "convertToRenderLocation";
}

function isReferenceRegistrationCall(call: ts.CallExpression): boolean {
  return (
    calleeTail(call.expression) === "set" &&
    call.expression.getText(call.getSourceFile()).startsWith("refs.")
  );
}

function isChildAdmissionCall(call: ts.CallExpression): boolean {
  return (
    calleeTail(call.expression) === "addChild" &&
    call.expression.getText(call.getSourceFile()).includes("renderingCtrl.")
  );
}

function isRecursiveRendererDispatchCall(call: ts.CallExpression): boolean {
  const expressionText = call.expression.getText(call.getSourceFile());
  return (
    calleeTail(call.expression) === "render" &&
    expressionText.includes("renderers[") &&
    call.arguments.length > 2
  );
}

function isLinkHookCall(call: ts.CallExpression): boolean {
  return calleeTail(call.expression) === "link";
}

function assignedNameForCall(call: ts.CallExpression): string | null {
  const parent = call.parent;
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(parent.left)
  ) {
    return parent.left.text;
  }
  if (
    ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name)
  ) {
    return parent.name.text;
  }
  return null;
}

function stepFor(
  stepKind: FrameworkControllerHydrationStepKind,
  callSite: TypeScriptCallSiteEntry | null,
): Omit<FrameworkControllerHydrationStepRow, "order"> | null {
  return callSite === null ? null : { stepKind, callSite };
}

function orderedHydrationSteps(
  inputs: readonly (Omit<FrameworkControllerHydrationStepRow, "order"> | null)[],
): readonly FrameworkControllerHydrationStepRow[] {
  return inputs
    .filter((input): input is Omit<FrameworkControllerHydrationStepRow, "order"> => input !== null)
    .sort((left, right) => left.callSite.span.start - right.callSite.span.start)
    .map((input, order) => ({ ...input, order }));
}

function resourceKindForRenderer(
  rendererName: string,
  instructionTarget: string | null,
  controllerFactoryCall: ts.CallExpression,
): FrameworkResourceDefinitionKind {
  if (
    instructionTarget === "itHydrateElement" ||
    rendererName.includes("Element")
  ) {
    return FrameworkResourceDefinitionKind.CustomElement;
  }
  if (
    instructionTarget === "itHydrateTemplateController" ||
    rendererName.includes("TemplateController")
  ) {
    return FrameworkResourceDefinitionKind.TemplateController;
  }
  if (calleeTail(controllerFactoryCall.expression) === "$attr") {
    return FrameworkResourceDefinitionKind.CustomAttribute;
  }
  return FrameworkResourceDefinitionKind.CustomElement;
}

function sourceRangeForAdmittedFileNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceRange {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return sourceRangeForSourceFileNode(file.repoPath, sourceFile, node);
}

function controllerCreationMatches(
  row: FrameworkControllerCreationRow,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.resourceKind === undefined ||
      row.resourceKind === filters.resourceKind) &&
    (filters.instructionName === undefined ||
      row.instructionName === filters.instructionName ||
      row.instructionTarget === filters.instructionName) &&
    (filters.rendererName === undefined ||
      row.rendererName === filters.rendererName) &&
    (filters.query === undefined ||
      [
        row.rendererName,
        row.resourceKind,
        row.instructionName,
        row.instructionTarget,
        row.parentControllerExpression,
        row.childControllerExpression,
        row.controllerFactoryCall.calleeName,
        row.controllerFactoryCall.callee.text,
        row.childAdmissionCall?.callee.text,
        row.linkCall?.callee.text,
        row.summary,
      ].some(
        (value) =>
          typeof value === "string" && value.includes(filters.query!),
      ) ||
      row.recursiveDispatchCalls.some((call) =>
        call.callee.text.includes(filters.query!),
      ))
  );
}
