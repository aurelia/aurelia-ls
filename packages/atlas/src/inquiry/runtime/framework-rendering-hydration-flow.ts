import ts from "typescript";

import {
  deepestNodeContainingText,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import type { FrameworkBindingAdmissionRow } from "./framework-entities.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkPackageNames } from "./framework-package-exports.js";
import { readFrameworkBindingAdmissions } from "./framework-rendering-bindings.js";
import { rendererClassExpression } from "./framework-rendering-inspection.js";
import { propertyNameText, unwrapExpression } from "./framework-ts-utils.js";

/** Coarse runtime stage in the hydration/rendering corridor. */
export type FrameworkHydrationFlowStage =
  | "app-root-hydration"
  | "controller-factory"
  | "controller-hydration"
  | "view-compilation"
  | "node-materialization"
  | "renderer-table"
  | "instruction-dispatch"
  | "resource-resolution"
  | "child-controller"
  | "binding-admission"
  | "lifecycle-hooks"
  | "observation-setup";

/** Runtime operation exposed by a hydration-flow row. */
export type FrameworkHydrationOperation =
  | "admit-binding"
  | "admit-child"
  | "adopt-nodes"
  | "compile"
  | "create-controller"
  | "create-nodes"
  | "create-observers"
  | "create-watchers"
  | "dispatch"
  | "find"
  | "get"
  | "get-all"
  | "hydrate"
  | "invoke"
  | "link"
  | "register"
  | "render"
  | "run-hook";

/** Runtime target kind reached by a hydration-flow operation. */
export type FrameworkHydrationTargetKind =
  | "app-root"
  | "binding"
  | "compiled-definition"
  | "container"
  | "custom-attribute"
  | "custom-element"
  | "hydration-context"
  | "instruction"
  | "lifecycle-hook"
  | "node-sequence"
  | "observer"
  | "renderer"
  | "renderer-table"
  | "synthetic-view"
  | "template-compiler"
  | "template-controller"
  | "view-model";

/** Filters accepted by framework.rendering hydration-flow. */
export interface FrameworkHydrationFlowFilters extends FrameworkDiscoveryFilters {
  readonly hydrationStage?: FrameworkHydrationFlowStage;
  readonly operation?: FrameworkHydrationOperation;
  readonly targetKind?: FrameworkHydrationTargetKind;
  readonly ownerName?: string;
  readonly methodName?: string;
  readonly targetName?: string;
}

/** Compact source-backed corridor row for hydration and resolved rendering. */
export interface FrameworkHydrationFlowRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the source row. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Coarse corridor stage. */
  readonly stage: FrameworkHydrationFlowStage;
  /** Operation that differentiates find/get/invoke/register/render/dispatch/admission. */
  readonly operation: FrameworkHydrationOperation;
  /** Semantic target family reached by the operation. */
  readonly targetKind: FrameworkHydrationTargetKind;
  /** Owning class, function, or renderer export. */
  readonly ownerName: string;
  /** Owning method/accessor/function name. */
  readonly methodName: string;
  /** Named callee, DI key, resource kind, renderer, or substrate reached by this row. */
  readonly targetName: string | null;
  /** True when the row belongs in the default overview answer. */
  readonly overview: boolean;
  /** Exact source range for the row. */
  readonly source: SourceRange;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Hydration-flow read mode after applying the inquiry shape. */
export type FrameworkHydrationFlowReadMode = "overview" | "filtered";

/** Hydration-flow row set with compact/default visibility made explicit. */
export interface FrameworkHydrationFlowRead {
  /** Rows visible to the current inquiry after overview/detail selection and filtering. */
  readonly rows: readonly FrameworkHydrationFlowRow[];
  /** Whether this read is the default overview or a filter-driven detail read. */
  readonly mode: FrameworkHydrationFlowReadMode;
  /** Total source-backed rows known to the hydration-flow substrate. */
  readonly totalRowCount: number;
  /** Source-backed rows marked as overview rows. */
  readonly overviewRowCount: number;
}

const RUNTIME_HTML_PACKAGE_ID = "runtime-html";
const APP_ROOT_FILE = "aurelia/packages/runtime-html/src/app-root.ts";
const CONTROLLER_FILE =
  "aurelia/packages/runtime-html/src/templating/controller.ts";
const RENDERING_FILE =
  "aurelia/packages/runtime-html/src/templating/rendering.ts";
const RENDERER_FILE = "aurelia/packages/runtime-html/src/renderer.ts";

const hydrationFlowMemo = new SourceProjectMemo<
  readonly FrameworkHydrationFlowRow[]
>();

/** Read compact source-backed hydration/rendering corridor rows. */
export function readFrameworkHydrationFlowRows(
  sourceProject: SourceProject,
  filters: FrameworkHydrationFlowFilters,
): readonly FrameworkHydrationFlowRow[] {
  return readFrameworkHydrationFlow(sourceProject, filters).rows;
}

/** Read hydration/rendering corridor rows while preserving overview/detail counts. */
export function readFrameworkHydrationFlow(
  sourceProject: SourceProject,
  filters: FrameworkHydrationFlowFilters,
): FrameworkHydrationFlowRead {
  const rows = hydrationFlowMemo.read(sourceProject, () =>
    scanFrameworkHydrationFlow(sourceProject),
  );
  const useOverview = shouldUseHydrationOverview(filters);
  const visibleRows = useOverview
    ? rows.filter((row) => row.overview)
    : rows;
  return {
    rows: visibleRows.filter((row) => hydrationFlowRowMatches(row, filters)),
    mode: useOverview ? "overview" : "filtered",
    totalRowCount: rows.length,
    overviewRowCount: rows.filter((row) => row.overview).length,
  };
}

function scanFrameworkHydrationFlow(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  const rows = [
    ...appRootRows(sourceProject),
    ...controllerRows(sourceProject),
    ...renderingRows(sourceProject),
    ...rendererRows(sourceProject),
    ...bindingAdmissionRows(sourceProject),
  ];
  return rows.sort(
    (left, right) =>
      left.source.filePath.localeCompare(right.source.filePath) ||
      left.source.start.line - right.source.start.line ||
      left.source.start.character - right.source.start.character,
  );
}

function appRootRows(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  const basis = classBasis(sourceProject, APP_ROOT_FILE, "AppRoot");
  const ctor = basis?.classDeclaration.members.find(ts.isConstructorDeclaration);
  if (basis === null || ctor?.body === undefined) {
    return [];
  }
  return [
    hydrationRow(
      basis,
      "app-root-hydration",
      "run-hook",
      "app-root",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "_runAppTasks('creating')") ?? ctor,
      "creating",
      "Run creating AppTasks before root controller construction starts.",
    ),
    hydrationRow(
      basis,
      "app-root-hydration",
      "invoke",
      "view-model",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "childCtn.invoke(component)") ?? ctor,
      "component",
      "Materialize the root component through the child container when the component is a constructor.",
    ),
    hydrationRow(
      basis,
      "controller-factory",
      "create-controller",
      "custom-element",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "Controller.$el") ?? ctor,
      "Controller.$el",
      "Create the root custom-element controller with a hydration instruction that delays child hydration.",
    ),
    hydrationRow(
      basis,
      "controller-hydration",
      "hydrate",
      "custom-element",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "controller._hydrateCustomElement") ?? ctor,
      "Controller._hydrateCustomElement",
      "Initialize root custom-element controller state before hydrating/compiling children.",
    ),
    hydrationRow(
      basis,
      "lifecycle-hooks",
      "run-hook",
      "app-root",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "_runAppTasks('hydrating')") ?? ctor,
      "hydrating",
      "Run hydrating AppTasks between root controller setup and view compilation.",
      false,
    ),
    hydrationRow(
      basis,
      "view-compilation",
      "hydrate",
      "compiled-definition",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "controller._hydrate()") ?? ctor,
      "Controller._hydrate",
      "Compile the root custom-element definition and materialize its node sequence.",
    ),
    hydrationRow(
      basis,
      "lifecycle-hooks",
      "run-hook",
      "app-root",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "_runAppTasks('hydrated')") ?? ctor,
      "hydrated",
      "Run hydrated AppTasks after root compilation and before child rendering.",
      false,
    ),
    hydrationRow(
      basis,
      "instruction-dispatch",
      "render",
      "instruction",
      "AppRoot",
      "constructor",
      hydrationFlowNodeContaining(ctor.body, "controller._hydrateChildren") ?? ctor,
      "Controller._hydrateChildren",
      "Render compiled root instruction rows into DOM targets after hydration tasks complete.",
    ),
  ];
}

function controllerRows(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  const basis = classBasis(sourceProject, CONTROLLER_FILE, "Controller");
  if (basis === null) {
    return [];
  }
  const rows: FrameworkHydrationFlowRow[] = [];
  rows.push(
    ...methodRows(basis, "$el", [
      {
        stage: "controller-factory",
        operation: "register",
        targetKind: "custom-element",
        needle: "registerResolver(ctn, definition.Type",
        targetName: "definition.Type",
        summary:
          "Register the custom-element view model instance in the element container.",
      },
      {
        stage: "controller-factory",
        operation: "register",
        targetKind: "hydration-context",
        needle: "IHydrationContext",
        targetName: "IHydrationContext",
        summary:
          "Publish the element hydration context that child rendering will read.",
      },
      {
        stage: "controller-hydration",
        operation: "hydrate",
        targetKind: "custom-element",
        needle: "controller._hydrateCustomElement",
        targetName: "Controller._hydrateCustomElement",
        summary:
          "Enter custom-element hydration immediately unless the caller delayed it.",
        overview: true,
      },
    ]),
    ...methodRows(basis, "$attr", [
      {
        stage: "controller-factory",
        operation: "register",
        targetKind: "custom-attribute",
        needle: "registerResolver(ctn, definition.Type",
        targetName: "definition.Type",
        summary:
          "Register the custom-attribute view model instance in its element-scoped container.",
      },
      {
        stage: "controller-hydration",
        operation: "hydrate",
        targetKind: "custom-attribute",
        needle: "controller._hydrateCustomAttribute",
        targetName: "Controller._hydrateCustomAttribute",
        summary:
          "Hydrate a custom-attribute controller after renderer-side invocation.",
        overview: true,
      },
    ]),
    ...methodRows(basis, "$view", [
      {
        stage: "controller-factory",
        operation: "create-controller",
        targetKind: "synthetic-view",
        needle: "new Controller",
        targetName: "Controller.$view",
        summary:
          "Create a synthetic view controller from an IViewFactory.",
        overview: false,
      },
      {
        stage: "controller-hydration",
        operation: "hydrate",
        targetKind: "synthetic-view",
        needle: "controller._hydrateSynthetic",
        targetName: "Controller._hydrateSynthetic",
        summary:
          "Compile and render a synthetic view controller created from a view factory.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "$viewAdopted", [
      {
        stage: "controller-factory",
        operation: "create-controller",
        targetKind: "synthetic-view",
        needle: "new Controller",
        targetName: "Controller.$viewAdopted",
        summary:
          "Create a synthetic view controller over already-existing SSR DOM nodes.",
        overview: false,
      },
      {
        stage: "controller-hydration",
        operation: "hydrate",
        targetKind: "synthetic-view",
        needle: "controller._hydrateSyntheticAdopted",
        targetName: "Controller._hydrateSyntheticAdopted",
        summary:
          "Hydrate a synthetic view from adopted SSR nodes instead of cloning.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrateCustomElement", [
      {
        stage: "observation-setup",
        operation: "create-watchers",
        targetKind: "observer",
        needle: "createWatchers",
        targetName: "createWatchers",
        summary:
          "Create watcher rows declared on the custom-element definition before render-time children run.",
        overview: true,
      },
      {
        stage: "observation-setup",
        operation: "create-observers",
        targetKind: "observer",
        needle: "createObservers",
        targetName: "createObservers",
        summary:
          "Create bindable observers declared on the custom-element definition.",
        overview: false,
      },
      {
        stage: "lifecycle-hooks",
        operation: "get",
        targetKind: "lifecycle-hook",
        needle: "LifecycleHooks.resolve",
        targetName: "LifecycleHooks",
        summary:
          "Resolve lifecycle hook dispatchers from the element container.",
        overview: false,
      },
      {
        stage: "controller-hydration",
        operation: "register",
        targetKind: "custom-element",
        needle: "container.register(definition.Type)",
        targetName: "definition.Type",
        summary:
          "Register the element type into its own container to support recursive components.",
        overview: false,
      },
      {
        stage: "view-compilation",
        operation: "hydrate",
        targetKind: "compiled-definition",
        needle: "this._hydrate();",
        targetName: "Controller._hydrate",
        summary:
          "When not delayed by AppRoot, immediately compile and materialize the custom-element view.",
        overview: false,
      },
      {
        stage: "instruction-dispatch",
        operation: "render",
        targetKind: "instruction",
        needle: "this._hydrateChildren();",
        targetName: "Controller._hydrateChildren",
        summary:
          "When not delayed by AppRoot, immediately render compiled child instruction rows.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrate", [
      {
        stage: "lifecycle-hooks",
        operation: "run-hook",
        targetKind: "lifecycle-hook",
        needle: "callHydratingHook",
        targetName: "hydrating",
        summary:
          "Run hydrating hooks before compilation and DOM materialization.",
        overview: false,
      },
      {
        stage: "view-compilation",
        operation: "compile",
        targetKind: "template-compiler",
        needle: "this._rendering.compile",
        targetName: "Rendering.compile",
        summary:
          "Compile the element definition through Rendering.compile and TemplateCompiler when needed.",
        overview: true,
      },
      {
        stage: "node-materialization",
        operation: "create-nodes",
        targetKind: "node-sequence",
        needle: "this._rendering.createNodes",
        targetName: "Rendering.createNodes",
        summary:
          "Clone or import the compiled template fragment for normal hydration.",
        overview: true,
      },
      {
        stage: "node-materialization",
        operation: "adopt-nodes",
        targetKind: "node-sequence",
        needle: "this._rendering.adoptNodes",
        targetName: "Rendering.adoptNodes",
        summary:
          "Adopt existing host children for tree-based SSR hydration.",
        overview: false,
      },
      {
        stage: "lifecycle-hooks",
        operation: "run-hook",
        targetKind: "lifecycle-hook",
        needle: "callHydratedHook",
        targetName: "hydrated",
        summary:
          "Run hydrated hooks after compilation and node materialization.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrateChildren", [
      {
        stage: "instruction-dispatch",
        operation: "render",
        targetKind: "instruction",
        needle: "this._rendering.render",
        targetName: "Rendering.render",
        summary:
          "Dispatch compiled instruction rows against DOM targets via Rendering.render.",
        overview: true,
      },
      {
        stage: "lifecycle-hooks",
        operation: "run-hook",
        targetKind: "lifecycle-hook",
        needle: "callCreatedHook",
        targetName: "created",
        summary:
          "Run created hooks after child instruction rows have been rendered.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrateCustomAttribute", [
      {
        stage: "observation-setup",
        operation: "create-watchers",
        targetKind: "observer",
        needle: "createWatchers",
        targetName: "createWatchers",
        summary:
          "Create watcher rows declared on the custom-attribute definition.",
        overview: false,
      },
      {
        stage: "observation-setup",
        operation: "create-observers",
        targetKind: "observer",
        needle: "createObservers",
        targetName: "createObservers",
        summary:
          "Create bindable observers declared on the custom-attribute definition.",
        overview: false,
      },
      {
        stage: "lifecycle-hooks",
        operation: "run-hook",
        targetKind: "lifecycle-hook",
        needle: "callCreatedHook",
        targetName: "created",
        summary:
          "Run custom-attribute created hooks after renderer invocation.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrateSynthetic", [
      {
        stage: "view-compilation",
        operation: "compile",
        targetKind: "template-compiler",
        needle: "this._rendering.compile",
        targetName: "Rendering.compile",
        summary:
          "Compile a synthetic view definition before rendering cloned nodes.",
        overview: false,
      },
      {
        stage: "instruction-dispatch",
        operation: "render",
        targetKind: "instruction",
        needle: "this._rendering.render",
        targetName: "Rendering.render",
        summary:
          "Render a synthetic view against freshly created targets.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "_hydrateSyntheticAdopted", [
      {
        stage: "view-compilation",
        operation: "compile",
        targetKind: "template-compiler",
        needle: "this._rendering.compile",
        targetName: "Rendering.compile",
        summary:
          "Compile a synthetic view definition before rendering adopted SSR targets.",
        overview: false,
      },
      {
        stage: "instruction-dispatch",
        operation: "render",
        targetKind: "instruction",
        needle: "this._rendering.render",
        targetName: "Rendering.render",
        summary:
          "Render a synthetic view against adopted SSR target nodes.",
        overview: false,
      },
    ]),
  );
  return rows;
}

function renderingRows(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  const basis = classBasis(sourceProject, RENDERING_FILE, "Rendering");
  if (basis === null) {
    return [];
  }
  const rows: FrameworkHydrationFlowRow[] = [];
  const rendererAccessor = basis.classDeclaration.members.find(
    (member): member is ts.GetAccessorDeclaration =>
      ts.isGetAccessorDeclaration(member) &&
      propertyNameText(member.name) === "renderers",
  );
  if (rendererAccessor?.body !== undefined) {
    rows.push(
      hydrationRow(
        basis,
        "renderer-table",
        "get-all",
        "renderer-table",
        "Rendering",
        "renderers",
        hydrationFlowNodeContaining(rendererAccessor.body, "getAll(IRenderer") ??
          rendererAccessor,
        "IRenderer",
        "Materialize the renderer dispatch table from all registered IRenderer implementations.",
      ),
    );
  }
  rows.push(
    ...methodRows(basis, "constructor", [
      {
        stage: "controller-hydration",
        operation: "get",
        targetKind: "container",
        needle: "resolve(IContainer).root",
        targetName: "IContainer.root",
        summary:
          "Capture the root container used for renderer table and platform service lookup.",
        overview: false,
      },
      {
        stage: "observation-setup",
        operation: "get",
        targetKind: "observer",
        needle: "IObserverLocator",
        targetName: "IObserverLocator",
        summary:
          "Resolve the observer locator passed into binding renderers during dispatch.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "compile", [
      {
        stage: "view-compilation",
        operation: "get",
        targetKind: "template-compiler",
        needle: "container.get(ITemplateCompiler)",
        targetName: "ITemplateCompiler",
        summary:
          "Resolve TemplateCompiler from the controller container for definition compilation.",
        overview: true,
      },
      {
        stage: "view-compilation",
        operation: "compile",
        targetKind: "compiled-definition",
        needle: "compiler.compile",
        targetName: "TemplateCompiler.compile",
        summary:
          "Compile definitions that still need JIT template compilation and cache the compiled result.",
        overview: true,
      },
    ]),
    ...methodRows(basis, "createNodes", [
      {
        stage: "node-materialization",
        operation: "create-nodes",
        targetKind: "node-sequence",
        needle: "new FragmentNodeSequence",
        targetName: "FragmentNodeSequence",
        summary:
          "Create the node sequence that exposes render targets for instruction dispatch.",
        overview: true,
      },
    ]),
    ...methodRows(basis, "adoptNodes", [
      {
        stage: "node-materialization",
        operation: "adopt-nodes",
        targetKind: "node-sequence",
        needle: "FragmentNodeSequence.adoptChildren",
        targetName: "FragmentNodeSequence.adoptChildren",
        summary:
          "Adopt host children as a node sequence for tree-based SSR hydration.",
        overview: false,
      },
    ]),
    ...methodRows(basis, "render", [
      {
        stage: "instruction-dispatch",
        operation: "dispatch",
        targetKind: "instruction",
        needle: "definition.surrogates",
        targetName: "surrogate instructions",
        summary:
          "Dispatch surrogate instructions against the host before target rows.",
        overview: false,
      },
      {
        stage: "instruction-dispatch",
        operation: "dispatch",
        targetKind: "instruction",
        needle: "renderers[instructionType].render",
        targetName: "IRenderer.render",
        summary:
          "Dispatch each compiled target instruction row through the renderer table.",
        overview: true,
      },
    ]),
  );
  return rows;
}

function rendererRows(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  const basis = fileBasis(sourceProject, RENDERER_FILE);
  if (basis === null) {
    return [];
  }
  const rows: FrameworkHydrationFlowRow[] = [];
  const decorator = functionDeclaration(basis.sourceFile, "renderer");
  if (decorator?.body !== undefined) {
    rows.push(
      hydrationRow(
        basis,
        "renderer-table",
        "register",
        "renderer",
        "renderer",
        "renderer",
        hydrationFlowNodeContaining(decorator.body, "singletonRegistration(IRenderer") ??
          decorator,
        "IRenderer",
        "Renderer helper registers renderer classes as singleton IRenderer implementations.",
      ),
    );
  }
  rows.push(
    ...rendererMethodRows(basis, "CustomElementRenderer", [
      {
        stage: "resource-resolution",
        operation: "find",
        targetKind: "custom-element",
        needle: "CustomElement.find",
        targetName: "CustomElement.find",
        summary:
          "Find a custom-element definition from the controller container when the instruction carries a resource name.",
      },
      {
        stage: "controller-factory",
        operation: "invoke",
        targetKind: "view-model",
        needle: "container.invoke",
        targetName: "def.Type",
        summary:
          "Invoke the custom-element view model type through the element container.",
        overview: true,
      },
      {
        stage: "child-controller",
        operation: "create-controller",
        targetKind: "custom-element",
        needle: "Controller.$el",
        targetName: "Controller.$el",
        summary:
          "Create the child custom-element controller that owns the rendered element.",
        overview: true,
      },
      {
        stage: "instruction-dispatch",
        operation: "dispatch",
        targetKind: "instruction",
        needle: "renderers[propInst.type].render",
        targetName: "child property instructions",
        summary:
          "Render custom-element bindable property instructions into the child controller.",
        overview: false,
      },
      {
        stage: "child-controller",
        operation: "admit-child",
        targetKind: "custom-element",
        needle: "renderingCtrl.addChild",
        targetName: "Controller.addChild",
        summary:
          "Admit the custom-element child controller into the parent controller lifecycle list.",
        overview: true,
      },
    ]),
    ...rendererMethodRows(basis, "CustomAttributeRenderer", [
      {
        stage: "resource-resolution",
        operation: "find",
        targetKind: "custom-attribute",
        needle: "CustomAttribute.find",
        targetName: "CustomAttribute.find",
        summary:
          "Find a custom-attribute definition from the controller container when the instruction carries a resource name.",
      },
      {
        stage: "controller-factory",
        operation: "invoke",
        targetKind: "view-model",
        needle: "invokeAttribute",
        targetName: "invokeAttribute",
        summary:
          "Invoke the custom-attribute view model and element-scoped container through invokeAttribute.",
        overview: true,
      },
      {
        stage: "child-controller",
        operation: "create-controller",
        targetKind: "custom-attribute",
        needle: "Controller.$attr",
        targetName: "Controller.$attr",
        summary:
          "Create the child custom-attribute controller for the rendered attribute.",
        overview: true,
      },
      {
        stage: "instruction-dispatch",
        operation: "dispatch",
        targetKind: "instruction",
        needle: "renderers[propInst.type].render",
        targetName: "child property instructions",
        summary:
          "Render custom-attribute bindable property instructions into the child controller.",
        overview: false,
      },
      {
        stage: "child-controller",
        operation: "admit-child",
        targetKind: "custom-attribute",
        needle: "renderingCtrl.addChild",
        targetName: "Controller.addChild",
        summary:
          "Admit the custom-attribute child controller into the parent controller lifecycle list.",
        overview: true,
      },
    ]),
    ...rendererMethodRows(basis, "TemplateControllerRenderer", [
      {
        stage: "resource-resolution",
        operation: "find",
        targetKind: "template-controller",
        needle: "CustomAttribute.find",
        targetName: "CustomAttribute.find",
        summary:
          "Find a template-controller custom-attribute definition from the controller container.",
      },
      {
        stage: "view-compilation",
        operation: "get",
        targetKind: "compiled-definition",
        needle: "this._rendering.getViewFactory",
        targetName: "Rendering.getViewFactory",
        summary:
          "Create a view factory for the embedded template-controller definition.",
        overview: true,
      },
      {
        stage: "controller-factory",
        operation: "invoke",
        targetKind: "view-model",
        needle: "invokeAttribute",
        targetName: "invokeAttribute",
        summary:
          "Invoke the template-controller view model with its view factory and render location.",
        overview: true,
      },
      {
        stage: "child-controller",
        operation: "create-controller",
        targetKind: "template-controller",
        needle: "Controller.$attr",
        targetName: "Controller.$attr",
        summary:
          "Create the template-controller child controller for the rendered attribute.",
        overview: true,
      },
      {
        stage: "child-controller",
        operation: "link",
        targetKind: "template-controller",
        needle: "results.vm.link",
        targetName: "link",
        summary:
          "Invoke an optional template-controller link hook before child property rendering.",
        overview: false,
      },
      {
        stage: "instruction-dispatch",
        operation: "dispatch",
        targetKind: "instruction",
        needle: "renderers[propInst.type].render",
        targetName: "child property instructions",
        summary:
          "Render template-controller bindable property instructions into the child controller.",
        overview: false,
      },
      {
        stage: "child-controller",
        operation: "admit-child",
        targetKind: "template-controller",
        needle: "renderingCtrl.addChild",
        targetName: "Controller.addChild",
        summary:
          "Admit the template-controller child controller into the parent controller lifecycle list.",
        overview: true,
      },
    ]),
  );
  return rows;
}

function bindingAdmissionRows(
  sourceProject: SourceProject,
): readonly FrameworkHydrationFlowRow[] {
  return readFrameworkBindingAdmissions(sourceProject, {}).map((row) =>
    bindingAdmissionHydrationRow(row),
  );
}

function bindingAdmissionHydrationRow(
  row: FrameworkBindingAdmissionRow,
): FrameworkHydrationFlowRow {
  const { ownerName, methodName } = ownerAndMethodForProducer(row.producerName);
  return {
    id: `framework-hydration-flow:${row.id}`,
    packageId: row.packageId,
    packageName: row.packageName,
    stage: "binding-admission",
    operation: "admit-binding",
    targetKind: "binding",
    ownerName,
    methodName,
    targetName: row.bindingName,
    overview: row.producerName === "PropertyBindingRenderer.render",
    source: row.source,
    summary: `${row.producerName} admits ${row.bindingName} into ${row.controllerExpression} through addBinding (${row.constructionKind}).`,
  };
}

function ownerAndMethodForProducer(
  producerName: string,
): { readonly ownerName: string; readonly methodName: string } {
  const dot = producerName.lastIndexOf(".");
  if (dot <= 0 || dot === producerName.length - 1) {
    return { ownerName: producerName, methodName: producerName };
  }
  return {
    ownerName: producerName.slice(0, dot),
    methodName: producerName.slice(dot + 1),
  };
}

interface FileBasis {
  readonly sourceProject: SourceProject;
  readonly sourceFile: ts.SourceFile;
  readonly packageId: string;
  readonly packageName: string;
}

interface ClassBasis extends FileBasis {
  readonly classDeclaration: ts.ClassDeclaration;
}

interface RowSpec {
  readonly stage: FrameworkHydrationFlowStage;
  readonly operation: FrameworkHydrationOperation;
  readonly targetKind: FrameworkHydrationTargetKind;
  readonly needle: string;
  readonly targetName: string | null;
  readonly summary: string;
  readonly overview?: boolean;
}

function fileBasis(sourceProject: SourceProject, repoPath: string): FileBasis | null {
  const sourceFile = sourceProject.readSourceFile(repoPath);
  if (sourceFile === null) {
    return null;
  }
  const packageNames = readFrameworkPackageNames(sourceProject);
  return {
    sourceProject,
    sourceFile,
    packageId: RUNTIME_HTML_PACKAGE_ID,
    packageName:
      packageNames.get(RUNTIME_HTML_PACKAGE_ID) ?? "@aurelia/runtime-html",
  };
}

function classBasis(
  sourceProject: SourceProject,
  repoPath: string,
  className: string,
): ClassBasis | null {
  const basis = fileBasis(sourceProject, repoPath);
  if (basis === null) {
    return null;
  }
  const classDeclaration = basis.sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === className,
  );
  return classDeclaration === undefined ? null : { ...basis, classDeclaration };
}

function methodRows(
  basis: ClassBasis,
  methodName: string,
  specs: readonly RowSpec[],
): readonly FrameworkHydrationFlowRow[] {
  const member =
    methodName === "constructor"
      ? basis.classDeclaration.members.find(ts.isConstructorDeclaration)
      : basis.classDeclaration.members.find(
          (candidate): candidate is ts.MethodDeclaration =>
            ts.isMethodDeclaration(candidate) &&
            propertyNameText(candidate.name) === methodName,
        );
  if (member === undefined || member.body === undefined) {
    return [];
  }
  const body = member.body;
  return specs.map((spec) =>
    hydrationRow(
      basis,
      spec.stage,
      spec.operation,
      spec.targetKind,
      basis.classDeclaration.name?.text ?? "<anonymous>",
      methodName,
      hydrationFlowNodeContaining(body, spec.needle) ?? member,
      spec.targetName,
      spec.summary,
      spec.overview ?? false,
    ),
  );
}

function rendererMethodRows(
  basis: FileBasis,
  rendererName: string,
  specs: readonly RowSpec[],
): readonly FrameworkHydrationFlowRow[] {
  const declaration = rendererDeclaration(basis.sourceFile, rendererName);
  if (declaration === null) {
    return [];
  }
  const renderMethod = declaration.rendererClass.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) && propertyNameText(member.name) === "render",
  );
  if (renderMethod?.body === undefined) {
    return [];
  }
  const body = renderMethod.body;
  return specs.map((spec) =>
    hydrationRow(
      basis,
      spec.stage,
      spec.operation,
      spec.targetKind,
      rendererName,
      "render",
      hydrationFlowNodeContaining(body, spec.needle) ?? renderMethod,
      spec.targetName,
      spec.summary,
      spec.overview ?? false,
    ),
  );
}

function rendererDeclaration(
  sourceFile: ts.SourceFile,
  rendererName: string,
): { readonly declaration: ts.VariableDeclaration; readonly rendererClass: ts.ClassExpression } | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== rendererName) {
        continue;
      }
      const initializer = declaration.initializer;
      if (initializer === undefined) {
        return null;
      }
      const call = unwrapExpression(initializer);
      if (!ts.isCallExpression(call)) {
        return null;
      }
      const rendererClass = rendererClassExpression(call);
      return rendererClass === null ? null : { declaration, rendererClass };
    }
  }
  return null;
}

function functionDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.FunctionDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
}

function hydrationRow(
  basis: FileBasis,
  stage: FrameworkHydrationFlowStage,
  operation: FrameworkHydrationOperation,
  targetKind: FrameworkHydrationTargetKind,
  ownerName: string,
  methodName: string,
  node: ts.Node,
  targetName: string | null,
  summary: string,
  overview = true,
): FrameworkHydrationFlowRow {
  const source = sourceRangeForBasisNode(basis, node);
  return {
    id: `framework-hydration-flow:${ownerName}:${methodName}:${stage}:${operation}:${targetKind}:${source.start.line}:${source.start.character}`,
    packageId: basis.packageId,
    packageName: basis.packageName,
    stage,
    operation,
    targetKind,
    ownerName,
    methodName,
    targetName,
    overview,
    source,
    summary,
  };
}

function hydrationFlowNodeContaining(root: ts.Node, text: string): ts.Node | null {
  return deepestNodeContainingText(root, text, isHydrationFlowSourceCandidate);
}

function isHydrationFlowSourceCandidate(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) ||
    ts.isExpressionStatement(node) ||
    ts.isIfStatement(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isReturnStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isVariableStatement(node)
  );
}

function sourceRangeForBasisNode(basis: FileBasis, node: ts.Node): SourceRange {
  const file = requiredSourceFileIdentity(basis.sourceProject, basis.sourceFile);
  return sourceRangeForSourceFileNode(file.repoPath, basis.sourceFile, node);
}

function shouldUseHydrationOverview(
  filters: FrameworkHydrationFlowFilters,
): boolean {
  return (
    filters.hydrationStage === undefined &&
    filters.operation === undefined &&
    filters.targetKind === undefined &&
    filters.ownerName === undefined &&
    filters.methodName === undefined &&
    filters.targetName === undefined &&
    filters.query === undefined
  );
}

function hydrationFlowRowMatches(
  row: FrameworkHydrationFlowRow,
  filters: FrameworkHydrationFlowFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.hydrationStage === undefined ||
      row.stage === filters.hydrationStage) &&
    (filters.operation === undefined ||
      row.operation === filters.operation) &&
    (filters.targetKind === undefined ||
      row.targetKind === filters.targetKind) &&
    (filters.ownerName === undefined ||
      row.ownerName === filters.ownerName) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName) &&
    (filters.query === undefined ||
      [
        row.stage,
        row.operation,
        row.targetKind,
        row.ownerName,
        row.methodName,
        row.targetName,
        row.summary,
      ].some(
        (value) =>
          typeof value === "string" && value.includes(filters.query!),
      ))
  );
}
