import type { Continuation } from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import {
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";

export function summaryContinuations(
  inquiry: Inquiry,
): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.discovery:flows",
      "flows",
      "Inspect framework behavior flow definitions.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:anchors",
      "anchors",
      "Inspect seed anchors that start exact inquiry.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:flow-seeds",
      "flow-seeds",
      "Inspect source-bound anchor plus framework-flow seed rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:call-edges",
      "call-edges",
      "Inspect precomputed call edges attached to framework flow seeds.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:call-sites",
      "call-sites",
      "Inspect exact call-site arguments expanded from framework flow call edges.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:call-targets",
      "call-targets",
      "Inspect grouped callee targets for framework flow call edges.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:package-exports",
      "package-exports",
      "Inspect checker-visible exports from admitted Aurelia framework package entrypoints.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:registry-exports",
      "registry-exports",
      "Inspect framework package exports that expose structural registry/configuration capabilities.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:di-interfaces",
      "di-interfaces",
      "Inspect public Aurelia framework exports that create DI InterfaceSymbol keys.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:resource-carriers",
      "resource-carriers",
      "Inspect source-exported Aurelia resource carriers independently of package publicness.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:resources",
      "resources",
      "Inspect public Aurelia framework exports that carry resource definitions.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:bundles",
      "bundles",
      "Inspect evaluator-derived associations from registry/configuration bundle exports.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:syntax-products",
      "syntax-products",
      "Inspect syntax producers and the instruction or binding products they expose.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:instruction-slots",
      "instruction-slots",
      "Inspect instruction discriminator slots joined to declarations and syntax products.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:instruction-dispatches",
      "instruction-dispatches",
      "Inspect instruction slot to renderer dispatch edges.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-products",
      "binding-products",
      "Inspect binding classes materialized by renderer syntax products.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-admissions",
      "binding-admissions",
      "Inspect controller.addBinding admission edges for framework binding products.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-effects",
      "binding-effects",
      "Inspect binding lifecycle and setup effect rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:binding-setups",
      "binding-setups",
      "Inspect renderer/resource-side target observer/accessor/subscriber setup calls.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:observers",
      "observers",
      "Inspect public observer-system exports, including ObserverLocator and NodeObserverLocator surfaces.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:app-tasks",
      "app-tasks",
      "Inspect AppTask, lifecycle task-slot, and task queue exports.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:router-entities",
      "router-entities",
      "Inspect router and route-recognizer exports.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:expression-entities",
      "expression-entities",
      "Inspect expression-parser and expression runtime exports.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:rendering-structures",
      "rendering-structures",
      "Inspect rendering, hydration, controller, view, and lifecycle structure exports.",
    ),
    projectionContinuation(
      inquiry,
      "framework.discovery:open-questions",
      "open-questions",
      "Inspect open discovery questions that should steer indexing work.",
    ),
  ];
}

export function renderingSummaryContinuations(
  inquiry: Inquiry,
): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.rendering:syntax-products",
      "syntax-products",
      "Inspect syntax producers and the instruction or binding products they expose.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:instruction-slots",
      "instruction-slots",
      "Inspect instruction discriminator slots joined to declarations and syntax products.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:instruction-dispatches",
      "instruction-dispatches",
      "Inspect instruction slot to renderer dispatch edges.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:controller-creations",
      "controller-creations",
      "Inspect renderer hydration flows that create and admit child controllers.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-products",
      "binding-products",
      "Inspect binding classes reached from rendering/admission/effect rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-admissions",
      "binding-admissions",
      "Inspect controller.addBinding admission edges.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-effects",
      "binding-effects",
      "Inspect binding lifecycle and setup effect rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:binding-setups",
      "binding-setups",
      "Inspect renderer/resource-side target observer/accessor/subscriber setup calls.",
    ),
    projectionContinuation(
      inquiry,
      "framework.rendering:relationships",
      "relationships",
      "Inspect normalized rendering relationships across compiler, renderer, binding, lifecycle, and observation axes.",
    ),
  ];
}

export function openQuestionContinuations(
  inquiry: Inquiry,
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return nextOffset === undefined
    ? [
        projectionContinuation(
          inquiry,
          "framework.discovery:anchors",
          "anchors",
          "Return to seed anchors that can answer these questions.",
        ),
      ]
    : [
        nextPageContinuation(
          inquiry,
          "framework.discovery:open-questions:next-page",
          "Continue framework discovery questions.",
          nextOffset,
          limit,
        ),
        projectionContinuation(
          inquiry,
          "framework.discovery:anchors",
          "anchors",
          "Return to seed anchors that can answer these questions.",
        ),
      ];
}
