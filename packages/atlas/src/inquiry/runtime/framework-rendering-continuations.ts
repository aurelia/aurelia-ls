import { BasisKind } from "../basis.js";
import { FrameworkLifecycleControllerCallKind } from "../../framework/lifecycle.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind } from "../locus.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
} from "../../framework/relationships.js";
import {
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
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
  evidenceForInstructionDispatch,
  evidenceForInstructionSlot,
  evidenceForSyntaxProduct,
  evidenceForRenderingRelationship,
} from "./framework-evidence.js";
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
        "framework.discovery:syntax-products:next-page",
        "Continue Aurelia framework syntax product rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:resource-carriers",
      "resource-carriers",
      "Return to source-level syntax/resource carriers behind these products.",
      { lens: LensId.FrameworkDiscovery, filters: {} },
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:bundles",
      "bundles",
      "Return to evaluated bundle admissions that can register these producers.",
      { lens: LensId.FrameworkDiscovery, filters: {} },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForSyntaxProduct(row);
    continuations.push({
      id: `framework.discovery:syntax-products:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this syntax product expression.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a syntax product expression.",
      ),
    });
    continuations.push({
      id: `framework.discovery:syntax-products:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for this syntax product expression.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a syntax product expression.",
      ),
    });
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
        "framework.discovery:instruction-slots:next-page",
        "Continue Aurelia framework instruction slot rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:syntax-products",
      "syntax-products",
      "Return to syntax products that consume instruction slots.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForInstructionSlot(row);
    continuations.push({
      id: `framework.discovery:instruction-slots:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this instruction slot constant.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind an instruction slot constant.",
      ),
    });
    continuations.push({
      id: `framework.discovery:instruction-slots:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for this instruction slot constant.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for an instruction slot constant.",
      ),
    });
    if (row.syntaxProducts.length > 0) {
      continuations.push({
        id: `framework.discovery:instruction-slots:syntax-products:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect syntax products that build or handle this instruction slot.",
        inquiry: {
          lens: LensId.FrameworkDiscovery,
          locus: inquiry.locus,
          projection: "syntax-products",
          filters: { query: row.slotName },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.ProjectionOf,
          [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          "Syntax products connected to one instruction slot.",
        ),
      });
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
    continuations.push({
      id: `framework.rendering:instruction-dispatches:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this renderer target dispatch.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind an instruction renderer dispatch edge.",
      ),
    });
    continuations.push({
      id: `framework.rendering:instruction-dispatches:binding-admissions:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect binding admissions produced while rendering this instruction slot.",
      inquiry: {
        lens: LensId.FrameworkRendering,
        locus: inquiry.locus,
        projection: "binding-admissions",
        filters: { query: row.rendererName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Binding admissions connected to one renderer dispatch edge.",
      ),
    });
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
    continuations.push({
      id: `framework.rendering:controller-creations:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect the renderer source that constructs and admits this child controller.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a renderer child-controller creation flow.",
      ),
    });
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
      continuations.push({
        id: `framework.rendering:controller-creations:recursive:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect controller creation rows with recursive child instruction dispatch.",
        inquiry: {
          lens: LensId.FrameworkRendering,
          locus: inquiry.locus,
          projection: "controller-creations",
          filters: { rendererName: row.rendererName },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.ProjectionOf,
          [BasisKind.TypeScriptChecker],
          "Recursive renderer dispatch sites inside one renderer flow.",
        ),
      });
    }
  }
  return continuations;
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
        "framework.discovery:binding-products:next-page",
        "Continue Aurelia framework binding product rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:syntax-products",
      "syntax-products",
      "Return to renderer syntax products that create these bindings.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-admissions",
      "binding-admissions",
      "Inspect controller binding-list admissions for these bindings.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-effects",
      "binding-effects",
      "Inspect lifecycle and setup effects inside these binding classes.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingProduct(row);
    continuations.push({
      id: `framework.discovery:binding-products:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding class.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a renderer-created binding class.",
      ),
    });
    continuations.push({
      id: `framework.discovery:binding-products:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this binding class.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a renderer-created binding class.",
      ),
    });
    continuations.push({
      id: `framework.discovery:binding-products:syntax-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect syntax products that create this binding class.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "syntax-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Syntax products connected to one binding class.",
      ),
    });
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
        "framework.discovery:binding-effects:next-page",
        "Continue Aurelia framework binding effect rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-products",
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
        "framework.discovery:observers",
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
    continuations.push({
      id: `framework.discovery:binding-effects:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding lifecycle/setup effect.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a binding lifecycle/setup effect.",
      ),
    });
    continuations.push({
      id: `framework.discovery:binding-effects:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the binding product that owns this effect.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Binding product connected to one effect row.",
      ),
    });
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
      "framework.discovery:observers",
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
    continuations.push({
      id: `framework.rendering:binding-setups:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding setup call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a binding setup call.",
      ),
    });
    continuations.push({
      id: `framework.rendering:binding-setups:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect the binding product whose setup method is called here.",
      inquiry: {
        lens: LensId.FrameworkRendering,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Binding product connected to one setup edge.",
      ),
    });
  }
  return continuations;
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
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRenderingRelationship(row);
    pushRenderingRelationshipSemanticContinuations(
      continuations,
      inquiry,
      row,
      index,
    );
    continuations.push({
      id: `framework.rendering:relationships:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this rendering relationship.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a rendering relationship.",
      ),
    });
    if (row.to.source !== undefined) {
      continuations.push({
        id: `framework.rendering:relationships:target-type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for this rendering relationship target.",
        inquiry: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.SourceRange, range: row.to.source },
          projection: "facts",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.TypeFactsFor,
          [BasisKind.TypeScriptChecker],
          "Type facts for a rendering relationship target.",
        ),
      });
    }
  }
  return continuations;
}

function pushRenderingRelationshipSemanticContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkRenderingRelationshipRow,
  index: number,
): void {
  switch (row.relation) {
    case FrameworkRelationshipRelation.CreatesController:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:controller-creation:${index}`,
          "controller-creations",
          "Inspect the renderer hydration row that creates this child controller.",
          {
            lens: LensId.FrameworkRendering,
            filters: { packageId: row.packageId, rendererName: row.from.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.AdmitsChildController:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:controller-admission:${index}`,
          "controller-creations",
          "Inspect the renderer hydration row that admits this child controller.",
          {
            lens: LensId.FrameworkRendering,
            filters: { packageId: row.packageId, rendererName: row.from.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:child-activation:${index}`,
          "controller-calls",
          "Inspect controller lifecycle propagation that later spends admitted child controllers.",
          {
            lens: LensId.FrameworkLifecycle,
            filters: {
              packageId: row.packageId,
              lifecycleStage: "activate",
              callKind: FrameworkLifecycleControllerCallKind.ChildController,
            },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.ProducesInstruction:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:instruction-dispatches:${index}`,
          "instruction-dispatches",
          "Inspect renderers that dispatch this produced instruction.",
          {
            lens: LensId.FrameworkRendering,
            filters: { instructionName: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:instruction-slots:${index}`,
          "instruction-slots",
          "Inspect instruction slots associated with this produced instruction.",
          {
            lens: LensId.FrameworkRendering,
            filters: { instructionName: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.DispatchesInstruction:
      if (row.mechanism === FrameworkRelationshipMechanism.RecursiveRendererDispatch) {
        continuations.push(
          projectionContinuation(
            inquiry,
            `framework.rendering:relationships:recursive-controller-creation:${index}`,
            "controller-creations",
            "Inspect the renderer hydration row that recursively dispatches child property instructions.",
            {
              lens: LensId.FrameworkRendering,
              filters: { packageId: row.packageId, rendererName: row.from.name },
              basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
            },
          ),
          projectionContinuation(
            inquiry,
            `framework.rendering:relationships:recursive-instruction-dispatches:${index}`,
            "instruction-dispatches",
            "Inspect concrete instruction discriminator dispatch rows that can be reached by this dynamic renderer call.",
            {
              lens: LensId.FrameworkRendering,
              filters: { packageId: row.packageId },
              basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
            },
          ),
        );
        return;
      }
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:renderer-syntax:${index}`,
          "syntax-products",
          "Inspect syntax products owned by the renderer target.",
          {
            lens: LensId.FrameworkRendering,
            filters: { query: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:renderer-admissions:${index}`,
          "binding-admissions",
          "Inspect binding admissions emitted by the renderer target.",
          {
            lens: LensId.FrameworkRendering,
            filters: { query: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.ProducesBinding:
    case FrameworkRelationshipRelation.AdmitsBinding:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:binding-products:${index}`,
          "binding-products",
          "Inspect the binding product reached by this relationship.",
          {
            lens: LensId.FrameworkRendering,
            filters: { bindingName: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:binding-effects:${index}`,
          "binding-effects",
          "Inspect lifecycle and observer effects for the reached binding.",
          {
            lens: LensId.FrameworkRendering,
            filters: { bindingName: row.to.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:effect-binding:${index}`,
          "binding-products",
          "Inspect the binding product that owns this lifecycle effect.",
          {
            lens: LensId.FrameworkRendering,
            filters: { bindingName: row.from.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.InvokesCallback:
      if (row.mechanism === FrameworkRelationshipMechanism.TemplateControllerLink) {
        continuations.push(
          projectionContinuation(
            inquiry,
            `framework.rendering:relationships:template-controller-link:${index}`,
            "controller-creations",
            "Inspect the template-controller hydration row that invokes the link callback.",
            {
              lens: LensId.FrameworkRendering,
              filters: { packageId: row.packageId, rendererName: row.from.name },
              basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
            },
          ),
        );
      }
      return;
    case FrameworkRelationshipRelation.LooksUpObserver:
      const capability = observerCapabilityForLookupName(row.to.name);
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:observer-catalog:${index}`,
          "observers",
          "Inspect observer-system exports related to this lookup method.",
          {
            lens: LensId.FrameworkDiscovery,
            filters:
              capability === undefined
                ? { query: row.to.name }
                : { observerCapability: capability },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:lookup-binding:${index}`,
          "binding-products",
          "Inspect the binding product that performs this observer lookup.",
          {
            lens: LensId.FrameworkRendering,
            filters: { bindingName: row.from.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
      );
      return;
    case FrameworkRelationshipRelation.ConfiguresObservation:
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:configured-binding:${index}`,
          "binding-products",
          "Inspect the binding product whose observation surface is configured.",
          {
            lens: LensId.FrameworkRendering,
            filters: { bindingName: row.from.name },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          },
        ),
        projectionContinuation(
          inquiry,
          `framework.rendering:relationships:configured-effects:${index}`,
          "binding-effects",
          "Inspect observer lookup effects for the configured binding.",
          {
            lens: LensId.FrameworkRendering,
            filters: {
              bindingName: row.from.name,
              effectKind: FrameworkBindingEffectKind.ObserverLookup,
            },
            basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
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
        `framework.discovery:observers:${sourceKind}:${capability}`,
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
        "framework.discovery:binding-admissions:next-page",
        "Continue Aurelia framework binding admission rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-products",
      "binding-products",
      "Inspect binding classes behind these admission edges.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:syntax-products",
      "syntax-products",
      "Inspect renderer/factory products that construct admitted bindings.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingAdmission(row);
    continuations.push({
      id: `framework.discovery:binding-admissions:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect source behind this controller.addBinding admission call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a controller binding admission edge.",
      ),
    });
    continuations.push({
      id: `framework.discovery:binding-admissions:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this binding admission call.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a controller binding admission edge.",
      ),
    });
    continuations.push({
      id: `framework.discovery:binding-admissions:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the binding product row admitted by this call.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Binding product connected to one admission edge.",
      ),
    });
  }
  return continuations;
}
