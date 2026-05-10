import { BasisKind } from "../basis.js";
import { FrameworkLifecycleControllerCallKind } from "../../framework/lifecycle.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
} from "../../framework/relationships.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import {
  FrameworkBindingEffectKind,
  FrameworkBindingSetupKind,
  FrameworkObserverCapability,
  type FrameworkBindingAdmissionRow,
  type FrameworkBindingEffectRow,
  type FrameworkBindingProductRow,
  type FrameworkBindingSetupRow,
  type FrameworkControllerCreationRow,
  type FrameworkInstructionDispatchRow,
  type FrameworkInstructionSlotRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import {
  evidenceForBindingAdmission,
  evidenceForBindingEffect,
  evidenceForBindingProduct,
  evidenceForBindingSetup,
  evidenceForControllerCreation,
  evidenceForHydrationFlow,
  evidenceForInstructionDispatch,
  evidenceForInstructionSlot,
  evidenceForSyntaxProduct,
  evidenceForRenderingTypeFact,
} from "./framework-evidence.js";
import type { FrameworkHydrationFlowRow } from "./framework-rendering-hydration-flow.js";
import type { FrameworkRenderConsequenceRow } from "./framework-rendering-consequences.js";
import type { FrameworkRenderingRelationshipRow } from "./framework-rendering-relationships.js";
import { route } from "./framework-support.js";

export function syntaxProductContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkSyntaxProductRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:syntax-products:next-page",
        "Continue Aurelia framework syntax product rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products:resource-carriers",
      "resource-carriers",
      "Return to source-level syntax/resource carriers behind these products.",
      { lens: LensId.FrameworkDiscovery, filters: {} },
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products:bundles",
      "bundles",
      "Return to evaluated bundle admissions that can register these producers.",
      { lens: LensId.FrameworkDiscovery, filters: {} },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForSyntaxProduct(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:syntax-products",
      index,
      evidence,
    );
    const routeBuilder = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.rendering:syntax-products",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this syntax product expression.",
        "Source behind a syntax product expression.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this syntax product expression.",
        "Type facts for a syntax product expression.",
      ),
    );
    if (row.instructionName !== null) {
      continuations.push(
        routeBuilder.continuation(
          FrameworkSemanticRoutes.RenderingToCompilerInstructionProducts,
          "compiler-products",
          {
            filters: { instructionName: row.instructionName },
            rationale:
              "Inspect compiler instruction products that produce this instruction.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
  }
  return continuations;
}

export function instructionSlotContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkInstructionSlotRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:instruction-slots:next-page",
        "Continue Aurelia framework instruction slot rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products",
      "syntax-products",
      "Return to syntax products that consume instruction slots.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForInstructionSlot(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:instruction-slots",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this instruction slot constant.",
        "Source behind an instruction slot constant.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this instruction slot constant.",
        "Type facts for an instruction slot constant.",
      ),
    );
    if (row.syntaxProducts.length > 0) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:instruction-slots:syntax-products:${index}`,
          "syntax-products",
          "Inspect syntax products that build or handle this instruction slot.",
          {
            lens: LensId.FrameworkRendering,
            filters: { query: row.slotName },
            evidence,
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
            summary: "Syntax products connected to one instruction slot.",
          },
        ),
      );
    }
  }
  return continuations;
}

export function instructionDispatchContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkInstructionDispatchRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:instruction-dispatches:next-page",
        "Continue Aurelia framework instruction dispatch rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:instruction-dispatches:hydration-flow",
      filters: { targetKind: "instruction" },
      rationale:
        "Return to the compact hydration/runtime rendering corridor that owns these dispatch rows.",
    }),
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:instruction-dispatches:render-consequences",
      filters: { consequenceKind: "instruction-dispatch" },
      rationale:
        "Return to compact renderer consequence rows before opening nested dispatch details.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:instruction-slots",
      "instruction-slots",
      "Inspect instruction slots behind these dispatch edges.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products",
      "syntax-products",
      "Inspect renderer syntax products behind these dispatch edges.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForInstructionDispatch(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:instruction-dispatches",
      index,
      evidence,
    );
    const routeBuilder = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.rendering:instruction-dispatches",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this renderer target dispatch.",
        "Source behind an instruction renderer dispatch edge.",
      ),
    );
    if (row.instructionName !== null) {
      continuations.push(
        routeBuilder.continuation(
          FrameworkSemanticRoutes.RenderingToCompilerInstructionProducts,
          "compiler-products",
          {
            filters: { instructionName: row.instructionName },
            rationale:
              "Inspect compiler instruction products that produce this rendered instruction.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:instruction-dispatches:binding-admissions:${index}`,
        "binding-admissions",
        "Inspect binding admissions produced while rendering this instruction slot.",
        {
          lens: LensId.FrameworkRendering,
          filters: { query: row.rendererName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          summary: "Binding admissions connected to one renderer dispatch edge.",
        },
      ),
    );
  }
  return continuations;
}

export function controllerCreationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkControllerCreationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:controller-creations:next-page",
        "Continue Aurelia framework controller creation rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:controller-creations:hydration-flow",
      filters: { operation: "create-controller" },
      rationale:
        "Return to the compact hydration/runtime rendering corridor that owns controller creation and admission.",
    }),
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:controller-creations:render-consequences",
      filters: {},
      rationale:
        "Return to compact renderer consequence rows that summarize controller creation, child admission, recursive dispatch, and link callbacks.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:instruction-dispatches",
      "instruction-dispatches",
      "Inspect instruction dispatch rows that route instructions to renderers.",
    ),
  );
  continuations.push({
    id: "framework.rendering:controller-creations:activation",
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Primary,
    rationale:
      "Inspect controller activation rows that later spend admitted child controllers.",
    inquiry: {
      lens: LensId.FrameworkLifecycle,
      locus: inquiry.locus,
      projection: "controller-calls",
      filters: {
        packageId: "runtime-html",
        lifecycleStage: "activate",
        callKind: FrameworkLifecycleControllerCallKind.ChildController,
      },
      budget: inquiry.budget,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      [BasisKind.TypeScriptChecker],
      "Renderer child-controller creation to controller activation propagation.",
    ),
  });
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForControllerCreation(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:controller-creations",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the renderer source that constructs and admits this child controller.",
        "Source behind a renderer child-controller creation flow.",
      ),
    );
    continuations.push({
      id: `framework.rendering:controller-creations:resource:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect resource convergence rows for resources hydrated by this renderer kind.",
      inquiry: {
        lens: LensId.FrameworkResources,
        locus: inquiry.locus,
        projection: "convergence",
        filters: {
          packageId: row.packageId,
          resourceKind: row.resourceKind,
        },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker],
        "Controller creation flow to resource convergence.",
      ),
    });
    if (row.recursiveDispatchCalls.length > 0) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:controller-creations:recursive:${index}`,
          "controller-creations",
          "Inspect controller creation rows with recursive child instruction dispatch.",
          {
            lens: LensId.FrameworkRendering,
            filters: { rendererName: row.rendererName },
            evidence,
            basis: [BasisKind.TypeScriptChecker],
            priority: ContinuationPriority.Secondary,
            summary: "Recursive renderer dispatch sites inside one renderer flow.",
          },
        ),
      );
    }
  }
  return continuations;
}

export function hydrationFlowContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkHydrationFlowRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:hydration-flow:next-page",
        "Continue hydration/runtime rendering corridor rows.",
        nextOffset,
        limit,
      ),
    );
  }

  continuations.push(
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:hydration-flow:render-consequences",
      filters: {},
      rationale:
        "Inspect compact renderer consequences before opening nested rendering detail projections.",
    }),
    FrameworkSemanticRoutes.RenderingToControllerCreations.continuation(inquiry, {
      id: "framework.rendering:hydration-flow:controller-creations",
      filters: {},
      rationale: "Inspect renderer rows that create and admit child controllers.",
    }),
    FrameworkSemanticRoutes.RenderingToInstructionDispatches.continuation(inquiry, {
      id: "framework.rendering:hydration-flow:instruction-dispatches",
      filters: {},
      rationale:
        "Inspect instruction discriminator dispatch rows reached by Rendering.render.",
    }),
    FrameworkSemanticRoutes.RenderingToBindingAdmissions.continuation(inquiry, {
      id: "framework.rendering:hydration-flow:binding-admissions",
      filters: {},
      rationale:
        "Inspect controller.addBinding admission edges reached by renderers.",
    }),
    FrameworkSemanticRoutes.RenderingToCompilerCompileFlow.continuation(inquiry, {
      id: "framework.rendering:hydration-flow:compiler",
      filters: { methodName: "compile" },
      rationale:
        "Inspect the JIT compiler flow that produces definitions and instruction rows consumed by hydration.",
      priority: ContinuationPriority.Secondary,
    }),
  );

  for (const [index, row] of hydrationRowsForDirectContinuations(rows).entries()) {
    const evidence = evidenceForHydrationFlow(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:hydration-flow",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this hydration/runtime rendering corridor row.",
        "Source behind a hydration/runtime rendering corridor row.",
      ),
    );
    pushHydrationSemanticContinuations(continuations, inquiry, row, index, evidence);
  }
  return continuations;
}

function pushHydrationSemanticContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkHydrationFlowRow,
  index: number,
  evidence: Evidence,
): void {
  const route = new FrameworkSemanticRouteBuilder(
    inquiry,
    "framework.rendering:hydration-flow",
    index,
    evidence,
  );
  if (
    row.operation === "compile" ||
    row.targetKind === "template-compiler" ||
    row.targetName === "TemplateCompiler.compile" ||
    row.targetName === "Rendering.compile"
  ) {
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToCompilerCompileFlow,
        "compiler",
        {
          filters: hydrationCompilerFlowFilters(row),
          rationale:
            "Inspect the JIT compiler flow that produces the compiled definition consumed by this hydration step.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }

  if (row.operation === "get-all" && row.targetName === "IRenderer") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:hydration-flow:di-renderers:${index}`,
        "providers",
        "Inspect DI providers that materialize IRenderer implementations.",
        {
          lens: LensId.FrameworkDi,
          filters: { key: "IRenderer" },
          evidence,
          basis: [BasisKind.TypeScriptChecker],
          priority: ContinuationPriority.Secondary,
        },
      ),
      projectionContinuation(
        inquiry,
        `framework.rendering:hydration-flow:renderer-dispatch:${index}`,
        "instruction-dispatches",
        "Inspect instruction dispatch rows that spend the renderer table.",
        {
          filters: {},
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        },
      ),
    );
  }

  if (row.operation === "dispatch" || row.targetKind === "instruction") {
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToInstructionDispatches,
        "instruction-dispatches",
        {
          filters: hydrationRendererFilters(row),
          rationale:
            "Inspect concrete instruction dispatch rows for this rendering hand-off.",
        },
      ),
    );
  }

  if (row.operation === "create-controller" || row.operation === "admit-child") {
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToControllerCreations,
        "controller-creations",
        {
          filters: hydrationRendererFilters(row),
          rationale:
            "Inspect renderer controller-creation rows for this child-controller hand-off.",
        },
      ),
    );
  }

  if (row.operation === "admit-binding" || row.targetKind === "binding") {
    const bindingFilters = hydrationBindingFilters(row);
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToBindingAdmissions,
        "binding-admissions",
        {
          filters: bindingFilters,
          rationale:
            "Inspect binding admission edges for this renderer binding hand-off.",
        },
      ),
      route.continuation(
        FrameworkSemanticRoutes.RenderingToBindingProducts,
        "binding-products",
        {
          filters: bindingFilters,
          rationale:
            "Inspect binding products reached by this renderer binding hand-off.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }

  if (row.operation === "find") {
    const resourceKind = hydrationResourceKind(row);
    if (resourceKind !== null) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:hydration-flow:resources:${index}`,
          "convergence",
          "Inspect resource convergence rows for the runtime resource lookup used here.",
          {
            lens: LensId.FrameworkResources,
            filters: { resourceKind },
            evidence,
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
  }

  if (row.operation === "run-hook" || row.targetKind === "lifecycle-hook") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:hydration-flow:lifecycle:${index}`,
        row.ownerName === "AppRoot" ? "app-tasks" : "hook-dispatches",
        "Inspect lifecycle rows that own this hydration hook hand-off.",
        {
          lens: LensId.FrameworkLifecycle,
          filters: row.targetName === null ? {} : { query: row.targetName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }

  if (row.targetKind === "observer") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:hydration-flow:observation:${index}`,
        "flow-sites",
        "Inspect observation flow sites behind watcher/observer creation during hydration.",
        {
          lens: LensId.FrameworkObservation,
          filters: row.targetName === null ? {} : { query: row.targetName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
}

function hydrationRendererFilters(
  row: FrameworkHydrationFlowRow,
): Inquiry["filters"] {
  return row.ownerName.endsWith("Renderer")
    ? { rendererName: row.ownerName }
    : {};
}

function hydrationCompilerFlowFilters(
  row: FrameworkHydrationFlowRow,
): Inquiry["filters"] {
  if (
    row.targetKind === "template-compiler" ||
    row.targetName === "TemplateCompiler.compile" ||
    row.targetName === "Rendering.compile"
  ) {
    return { methodName: "compile" };
  }
  return {};
}

function hydrationBindingFilters(
  row: FrameworkHydrationFlowRow,
): Inquiry["filters"] {
  return row.targetName !== null && row.targetName.endsWith("Binding")
    ? { bindingName: row.targetName }
    : hydrationRendererFilters(row);
}

function hydrationResourceKind(row: FrameworkHydrationFlowRow): string | null {
  switch (row.targetKind) {
    case "custom-element":
      return "custom-element";
    case "custom-attribute":
      return "custom-attribute";
    case "template-controller":
      return "template-controller";
    default:
      return null;
  }
}

function hydrationRowsForDirectContinuations(
  rows: readonly FrameworkHydrationFlowRow[],
): readonly FrameworkHydrationFlowRow[] {
  return rows.slice(0, 8);
}

export function bindingProductContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingProductRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:binding-products:next-page",
        "Continue Aurelia framework binding product rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:binding-products:hydration-flow",
      filters: { operation: "admit-binding" },
      rationale:
        "Return to the compact hydration/runtime rendering corridor that admits bindings.",
    }),
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:binding-products:render-consequences",
      filters: {},
      rationale:
        "Return to compact renderer consequence rows that summarize binding production, admission, and effects.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products",
      "syntax-products",
      "Return to renderer syntax products that create these bindings.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-admissions",
      "binding-admissions",
      "Inspect controller binding-list admissions for these bindings.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-effects",
      "binding-effects",
      "Inspect lifecycle and setup effects inside these binding classes.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingProduct(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:binding-products",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this binding class.",
        "Source behind a renderer-created binding class.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this binding class.",
        "Type facts for a renderer-created binding class.",
      ),
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:binding-products:syntax-products:${index}`,
        "syntax-products",
        "Inspect syntax products that create this binding class.",
        {
          lens: LensId.FrameworkRendering,
          filters: { bindingName: row.bindingName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          summary: "Syntax products connected to one binding class.",
        },
      ),
    );
  }
  return continuations;
}

export function bindingEffectContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingEffectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:binding-effects:next-page",
        "Continue Aurelia framework binding effect rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:binding-effects:hydration-flow",
      filters: { operation: "admit-binding" },
      rationale:
        "Return to the compact hydration/runtime rendering corridor that admits bindings before these effects run.",
    }),
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:binding-effects:render-consequences",
      filters: {},
      rationale:
        "Return to compact renderer consequence rows before expanding binding effect details.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-products",
      "binding-products",
      "Inspect binding classes that own these effects.",
      { filters: {} },
    ),
  );
  if (
    rows.some(
      (row) => row.effectKind === FrameworkBindingEffectKind.ObserverLookup,
    )
  ) {
    continuations.push(
      projectionContinuation(
        inquiry,
        "framework.rendering:binding-effects:observers",
        "observers",
        "Inspect observer-locator and observer/accessor exports behind these lookup effects.",
        { lens: LensId.FrameworkDiscovery, filters: {} },
      ),
    );
    pushObserverCapabilityContinuations(
      continuations,
      inquiry,
      observerCapabilitiesForBindingEffects(rows),
      "lookup-effects",
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingEffect(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:binding-effects",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this binding lifecycle/setup effect.",
        "Source behind a binding lifecycle/setup effect.",
      ),
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:binding-effects:binding-products:${index}`,
        "binding-products",
        "Inspect the binding product that owns this effect.",
        {
          lens: LensId.FrameworkRendering,
          filters: { bindingName: row.bindingName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          summary: "Binding product connected to one effect row.",
        },
      ),
    );
  }
  return continuations;
}

export function bindingSetupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingSetupRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:binding-setups:next-page",
        "Continue Aurelia framework binding setup rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:binding-setups:render-consequences",
      filters: { consequenceKind: "observation-setup" },
      rationale:
        "Return to compact renderer consequence rows for observation setup before expanding setup details.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-products",
      "binding-products",
      "Inspect binding classes whose setup surface is invoked.",
      { filters: {} },
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-effects",
      "binding-effects",
      "Inspect binding-class effects that complement these external setup calls.",
      { filters: {} },
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-setups:observers",
      "observers",
      "Inspect observer/accessor/subscriber exports named by these setup calls.",
      { lens: LensId.FrameworkDiscovery, filters: {} },
    ),
  );
  pushObserverCapabilityContinuations(
    continuations,
    inquiry,
    observerCapabilitiesForBindingSetups(rows),
    "setup-calls",
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingSetup(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:binding-setups",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this binding setup call.",
        "Source behind a binding setup call.",
      ),
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:binding-setups:binding-products:${index}`,
        "binding-products",
        "Inspect the binding product whose setup method is called here.",
        {
          lens: LensId.FrameworkRendering,
          filters: { bindingName: row.bindingName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          summary: "Binding product connected to one setup edge.",
        },
      ),
    );
  }
  return continuations;
}

export function renderConsequenceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRenderConsequenceRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:render-consequences:next-page",
        "Continue compact renderer consequence rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:render-consequences:hydration-flow",
      filters: {},
      rationale:
        "Return to the hydration/runtime corridor that frames these renderer consequences.",
    }),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForRenderingTypeFact(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:render-consequences",
      index,
      evidence,
    );
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.rendering:render-consequences",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this compact renderer consequence.",
        "Source behind a compact renderer consequence.",
      ),
    );
    pushRenderConsequenceDetailContinuation(continuations, route, row);
    pushRenderConsequenceCrossLensContinuations(continuations, route, row);
  }
  return continuations;
}

function pushRenderConsequenceDetailContinuation(
  continuations: Continuation[],
  route: FrameworkSemanticRouteBuilder,
  row: FrameworkRenderConsequenceRow,
): void {
  const options = {
    filters: row.detailFilters,
    rationale: `Open detailed ${row.detailProjection} rows for this compact renderer consequence.`,
  };
  switch (row.detailProjection) {
    case "binding-admissions":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingAdmissions,
          "binding-admissions",
          options,
        ),
      );
      return;
    case "binding-effects":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingEffects,
          "binding-effects",
          options,
        ),
      );
      return;
    case "binding-products":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingProducts,
          "binding-products",
          options,
        ),
      );
      return;
    case "binding-setups":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingSetups,
          "binding-setups",
          options,
        ),
      );
      return;
    case "controller-creations":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToControllerCreations,
          "controller-creations",
          options,
        ),
      );
      return;
    case "instruction-dispatches":
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToInstructionDispatches,
          "instruction-dispatches",
          options,
        ),
      );
      return;
    case "relationships":
      return;
  }
}

function pushRenderConsequenceCrossLensContinuations(
  continuations: Continuation[],
  route: FrameworkSemanticRouteBuilder,
  row: FrameworkRenderConsequenceRow,
): void {
  if (row.consequenceKind === "observer-lookup") {
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToObservationBindingLookups,
        "observation-binding-lookups",
        {
          filters: {
            packageId: row.packageId,
            bindingName: row.actorName,
            query: row.targetName,
          },
          rationale:
            "Enter observation-owned binding lookup rows for this renderer consequence.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
  if (row.consequenceKind === "observation-setup") {
    continuations.push(
      route.continuation(
        FrameworkSemanticRoutes.RenderingToObservationBindingSetups,
        "observation-binding-setups",
        {
          filters: {
            packageId: row.packageId,
            bindingName: row.actorName,
            query: row.targetName,
          },
          rationale:
            "Enter observation-owned setup rows for this renderer consequence.",
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
}

export function renderingRelationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRenderingRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:relationships:next-page",
        "Continue rendering relationship rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:relationships:render-consequences",
      filters: {},
      rationale:
        "Open compact renderer consequence rows derived from these relationships before expanding detail families.",
    }),
  );
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRenderingTypeFact(row);
    pushRenderingRelationshipSemanticContinuations(
      continuations,
      inquiry,
      row,
      index,
      evidence,
    );
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:relationships",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this rendering relationship.",
        "Source behind a rendering relationship.",
      ),
    );
    if (row.to.source !== undefined) {
      continuations.push(
        builder.typeFacts(
          "target-type",
          row.to.source,
          "Inspect TypeChecker facts for this rendering relationship target.",
          "Type facts for a rendering relationship target.",
        ),
      );
    }
  }
  return continuations;
}

function pushRenderingRelationshipSemanticContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkRenderingRelationshipRow,
  index: number,
  evidence: Evidence,
): void {
  const route = new FrameworkSemanticRouteBuilder(
    inquiry,
    "framework.rendering:relationships",
    index,
    evidence,
  );
  switch (row.relation) {
    case FrameworkRelationshipRelation.CreatesController:
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToControllerCreations,
          "controller-creation",
          {
            filters: { packageId: row.packageId, rendererName: row.from.name },
            rationale:
              "Inspect the renderer hydration row that creates this child controller.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.AdmitsChildController:
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToControllerCreations,
          "controller-admission",
          {
            filters: { packageId: row.packageId, rendererName: row.from.name },
            rationale:
              "Inspect the renderer hydration row that admits this child controller.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToLifecycleControllerCalls,
          "child-activation",
          {
            filters: {
              packageId: row.packageId,
              lifecycleStage: "activate",
              callKind: FrameworkLifecycleControllerCallKind.ChildController,
            },
            rationale:
              "Inspect controller lifecycle propagation that later spends admitted child controllers.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.DispatchesInstruction:
      if (row.mechanism === FrameworkRelationshipMechanism.RecursiveRendererDispatch) {
        continuations.push(
          route.continuation(
            FrameworkSemanticRoutes.RenderingToControllerCreations,
            "recursive-controller-creation",
            {
              filters: { packageId: row.packageId, rendererName: row.from.name },
              rationale:
                "Inspect the renderer hydration row that recursively dispatches child property instructions.",
            },
          ),
          route.continuation(
            FrameworkSemanticRoutes.RenderingToInstructionDispatches,
            "recursive-instruction-dispatches",
            {
              filters: { packageId: row.packageId },
              rationale:
                "Inspect concrete instruction discriminator dispatch rows that can be reached by this dynamic renderer call.",
            },
          ),
        );
        return;
      }
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToCompilerInstructionProducts,
          "compiler-products",
          {
            filters: { instructionName: row.to.name },
            rationale:
              "Inspect compiler instruction products that produce this dispatched instruction.",
            priority: ContinuationPriority.Secondary,
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToSyntaxProducts,
          "renderer-syntax",
          {
            filters: { query: row.to.name },
            rationale: "Inspect syntax products owned by the renderer target.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingAdmissions,
          "renderer-admissions",
          {
            filters: { query: row.to.name },
            rationale: "Inspect binding admissions emitted by the renderer target.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingProducts,
          "binding-products",
          {
            filters: { bindingName: row.to.name },
            rationale: "Inspect the binding product reached by this relationship.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingEffects,
          "binding-effects",
          {
            filters: { bindingName: row.to.name },
            rationale:
              "Inspect lifecycle and observer effects for the reached binding.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingProducts,
          "effect-binding",
          {
            filters: { bindingName: row.from.name },
            rationale:
              "Inspect the binding product that owns this lifecycle effect.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.InvokesCallback:
      if (row.mechanism === FrameworkRelationshipMechanism.TemplateControllerLink) {
        continuations.push(
          route.continuation(
            FrameworkSemanticRoutes.RenderingToControllerCreations,
            "template-controller-link",
            {
              filters: { packageId: row.packageId, rendererName: row.from.name },
              rationale:
                "Inspect the template-controller hydration row that invokes the link callback.",
            },
          ),
        );
      }
      return;
    case FrameworkRelationshipRelation.LooksUpObserver:
      const capability = observerCapabilityForLookupName(row.to.name);
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToObservationBindingLookups,
          "observation-binding-lookups",
          {
            filters: {
              packageId: row.packageId,
              bindingName: row.from.name,
              query: row.to.name,
            },
            rationale:
              "Enter observation-owned binding lookup rows for this observer lookup.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToDiscoveryObservers,
          "observer-catalog",
          {
            filters:
              capability === undefined
                ? { query: row.to.name }
                : { observerCapability: capability },
            rationale:
              "Inspect observer-system exports related to this lookup method.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingProducts,
          "lookup-binding",
          {
            filters: { bindingName: row.from.name },
            rationale:
              "Inspect the binding product that performs this observer lookup.",
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.ConfiguresObservation:
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.RenderingToObservationBindingSetups,
          "observation-binding-setups",
          {
            filters: {
              packageId: row.packageId,
              bindingName: row.from.name,
              query: row.to.name,
            },
            rationale:
              "Enter observation-owned binding setup rows for this observation configuration.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingProducts,
          "configured-binding",
          {
            filters: { bindingName: row.from.name },
            rationale:
              "Inspect the binding product whose observation surface is configured.",
          },
        ),
        route.continuation(
          FrameworkSemanticRoutes.RenderingToBindingEffects,
          "configured-effects",
          {
            filters: {
              bindingName: row.from.name,
              effectKind: FrameworkBindingEffectKind.ObserverLookup,
            },
            rationale: "Inspect observer lookup effects for the configured binding.",
          },
        ),
      );
      return;
    default:
      return;
  }
}

function pushObserverCapabilityContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  capabilities: readonly FrameworkObserverCapability[],
  sourceKind: string,
): void {
  for (const capability of capabilities) {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:observers:${sourceKind}:${capability}`,
        "observers",
        `Inspect observer-system exports with ${capability} capability.`,
        {
          lens: LensId.FrameworkDiscovery,
          filters: { observerCapability: capability },
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        },
      ),
    );
  }
}

function observerCapabilitiesForBindingEffects(
  rows: readonly FrameworkBindingEffectRow[],
): readonly FrameworkObserverCapability[] {
  const capabilities = new Set<FrameworkObserverCapability>();
  for (const row of rows) {
    if (row.effectKind !== FrameworkBindingEffectKind.ObserverLookup) {
      continue;
    }
    const capability = observerCapabilityForLookupName(row.effectName);
    if (capability !== undefined) {
      capabilities.add(capability);
    }
  }
  return orderedObserverCapabilities(capabilities);
}

function observerCapabilityForLookupName(
  lookupName: string,
): FrameworkObserverCapability | undefined {
  const name = lookupName.toLocaleLowerCase();
  if (name.includes("accessor")) {
    return FrameworkObserverCapability.LocateAccessor;
  }
  if (
    name.includes("collection") ||
    name.includes("array") ||
    name.includes("map") ||
    name.includes("set")
  ) {
    return FrameworkObserverCapability.LocateCollectionObserver;
  }
  if (name.includes("node")) {
    return FrameworkObserverCapability.LocateNodeObserver;
  }
  if (name.includes("observer")) {
    return FrameworkObserverCapability.LocateObserver;
  }
  return undefined;
}

function observerCapabilitiesForBindingSetups(
  rows: readonly FrameworkBindingSetupRow[],
): readonly FrameworkObserverCapability[] {
  const capabilities = new Set<FrameworkObserverCapability>();
  for (const row of rows) {
    switch (row.setupKind) {
      case FrameworkBindingSetupKind.Accessor:
        capabilities.add(FrameworkObserverCapability.LocateAccessor);
        break;
      case FrameworkBindingSetupKind.TargetObserver:
        capabilities.add(FrameworkObserverCapability.LocateObserver);
        break;
      case FrameworkBindingSetupKind.TargetSubscriber:
        capabilities.add(FrameworkObserverCapability.Subscribe);
        break;
    }
  }
  return orderedObserverCapabilities(capabilities);
}

function orderedObserverCapabilities(
  capabilities: ReadonlySet<FrameworkObserverCapability>,
): readonly FrameworkObserverCapability[] {
  const order = [
    FrameworkObserverCapability.LocateObserver,
    FrameworkObserverCapability.LocateAccessor,
    FrameworkObserverCapability.LocateCollectionObserver,
    FrameworkObserverCapability.LocateNodeObserver,
    FrameworkObserverCapability.Subscribe,
  ];
  return order.filter((capability) => capabilities.has(capability));
}

export function bindingAdmissionContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingAdmissionRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.rendering:binding-admissions:next-page",
        "Continue Aurelia framework binding admission rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    FrameworkSemanticRoutes.RenderingToHydrationFlow.continuation(inquiry, {
      id: "framework.rendering:binding-admissions:hydration-flow",
      filters: { operation: "admit-binding" },
      rationale:
        "Return to the compact hydration/runtime rendering corridor that owns binding admission.",
    }),
    FrameworkSemanticRoutes.RenderingToRenderConsequences.continuation(inquiry, {
      id: "framework.rendering:binding-admissions:render-consequences",
      filters: { consequenceKind: "binding-admission" },
      rationale:
        "Return to compact renderer consequence rows before expanding binding admission details.",
    }),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-products",
      "binding-products",
      "Inspect binding classes behind these admission edges.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products",
      "syntax-products",
      "Inspect renderer/factory products that construct admitted bindings.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingAdmission(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.rendering:binding-admissions",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this controller.addBinding admission call.",
        "Source behind a controller binding admission edge.",
      ),
      builder.typeFacts(
        "type",
        row.source,
        "Inspect TypeChecker facts for this binding admission call.",
        "Type facts for a controller binding admission edge.",
      ),
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.rendering:binding-admissions:binding-products:${index}`,
        "binding-products",
        "Inspect the binding product row admitted by this call.",
        {
          lens: LensId.FrameworkRendering,
          filters: { bindingName: row.bindingName },
          evidence,
          basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          summary: "Binding product connected to one admission edge.",
        },
      ),
    );
  }
  return continuations;
}
