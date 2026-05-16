import type { AtlasWorkRoute } from "./atlas-work-router-contracts.js";
import {
  firstFrameworkErrorCodeQuery,
  type AtlasWorkRouterFilters,
} from "./atlas-work-router-matching.js";

interface RouteQuestionRule {
  /** Stable route id this question belongs to. */
  readonly routeId: string;
  /** Lowercase query fragments that can trigger the question. Fragments are exact substring checks, not fuzzy synonyms. */
  readonly queryAny?: readonly string[];
  /** Exact expected-effect filter that can trigger the question. */
  readonly effectKind?: string;
  /** Trigger when the caller supplied a recipeKey filter. */
  readonly requiresRecipeKey?: boolean;
  /** Trigger when the caller supplied a seedUse filter. */
  readonly requiresSeedUse?: boolean;
  /** Trigger when the query contains an exact Aurelia AUR error label. */
  readonly requiresFrameworkErrorCode?: boolean;
  /** Concrete question text, or a renderer when the question needs the matched filter value. */
  readonly question:
    | string
    | ((
      filters: AtlasWorkRouterFilters,
      frameworkErrorCode: string | undefined,
    ) => string | undefined);
}

const RouteQuestionRules: readonly RouteQuestionRule[] = [
  {
    routeId: "authoring.forms.fixture-flywheel",
    queryAny: ["authoring catalog"],
    question:
      "Do you need static recipe/taste ontology from AuthoringCatalog or opened-app evidence from AuthoringOrientation?",
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    queryAny: ["package tooling"],
    question:
      "Is this package-tooling gap about recipe-baseline typecheck files, runnable build profile policy, or missing project source-role evidence?",
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    queryAny: ["repair"],
    question:
      "Which repair clusters are app-source edits, runtime-intent decisions, or semantic-runtime substrate gaps before repair operations are honest?",
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    queryAny: ["service interaction"],
    effectKind: "service-interaction",
    question:
      "Which service-class, service-interaction, and service-interaction-binding effects should the fixture prove after reopening?",
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    queryAny: ["state-owned service", "state owned service", "service-backed state"],
    question:
      "Does this fixture need component-to-state handoff, state-to-service side effects, a direct component service facade, or a contrastive non-recommendable pattern?",
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    requiresRecipeKey: true,
    question: (filters) =>
      filters.recipeKey === undefined
        ? undefined
        : `Which expected semantic effects distinguish ${filters.recipeKey} from its base recipe and sibling recipes?`,
  },
  {
    routeId: "authoring.forms.fixture-flywheel",
    requiresSeedUse: true,
    question: (filters) =>
      filters.seedUse === undefined
        ? undefined
        : `Which ${filters.seedUse} corpus examples should seed this fixture lane without blending docs and framework-test authority?`,
  },
  {
    routeId: "diagnostics.framework-error-grounding",
    requiresFrameworkErrorCode: true,
    question: (_filters, frameworkErrorCode) =>
      frameworkErrorCode === undefined
        ? undefined
        : `Which Aurelia package, enum member, and runtime concept owns ${frameworkErrorCode}, and is semantic-runtime already linking that exact authority?`,
  },
  {
    routeId: "atlas.work-router.self-improvement",
    queryAny: ["current workset", "dirty files", "worktree"],
    question:
      "Which changed source surfaces should route to existing memory/frontier records, and where does the router need a stronger structural anchor instead of a broad domain match?",
  },
  {
    routeId: "atlas.work-router.self-improvement",
    queryAny: ["memory next"],
    question:
      "Is memory:next ranking too flat because live pressure is real, or because the query needs a narrower domain, anchor, workset, or current-pressure projection?",
  },
  {
    routeId: "semantic-runtime.evaluator.world-construction",
    queryAny: [
      "standardconfiguration",
      "configuration bundle",
      "custom bundle",
      "bundle admission",
    ],
    question:
      "Which framework-admission capabilities does this configuration or bundle contribute, and are they recognized through the manifest/recognizer path or only by evaluator fallback?",
  },
  {
    routeId: "semantic-runtime.evaluator.world-construction",
    queryAny: [
      "unsupported-expression",
      "unsupported expression",
      "external-module-value",
      "external module value",
    ],
    question:
      "Which evaluator primitive or admitted external/module value would close this expression seam without inventing a local surface fallback?",
  },
  {
    routeId: "semantic-runtime.evaluator.world-construction",
    queryAny: ["open-registry-body", "registry body"],
    question:
      "Is the open registry body caused by missing evaluator value closure, missing framework-registration manifest admission, or an intentional dynamic runtime boundary?",
  },
  {
    routeId: "semantic-runtime.observation.binding-flow",
    queryAny: ["binding-source-slot", "source slot"],
    question:
      "Which source slot lacks a static value, and should the fix live in binding data-flow, TypeChecker context synthesis, or template-controller scope modeling?",
  },
  {
    routeId: "semantic-runtime.observation.binding-flow",
    queryAny: ["open-value-channel", "open-target-access", "open-data-flow"],
    question:
      "Which observer/accessor, value channel, or binding data-flow product should own this open binding seam under framework semantics?",
  },
  {
    routeId: "router.viewport.authoring-semantics",
    queryAny: ["viewport-resolution", "viewport resolution"],
    question:
      "Which RouteContext, au-viewport, ViewportAgent, or route-tree relationship is missing from the viewport resolution product?",
  },
  {
    routeId: "router.viewport.authoring-semantics",
    queryAny: ["href"],
    question:
      "Is the href seam about static internal route closure, static externality, dynamic value openness, or click-interception policy?",
  },
  {
    routeId: "router.viewport.authoring-semantics",
    queryAny: ["instruction-needs-static-value", "redirect-target"],
    question:
      "Which router instruction value needs static closure, and should it become a route-recognizer, route-tree, or typed-navigation product?",
  },
  {
    routeId: "router.viewport.authoring-semantics",
    queryAny: ["redirectsourcerouteconfig", "static redirect"],
    question:
      "Does the redirect source route config point at an exact re-recognized target, an exact framework diagnostic, or a genuinely open redirect handoff?",
  },
];

export function routeNextQuestions(
  route: AtlasWorkRoute,
  filters: AtlasWorkRouterFilters,
): readonly string[] {
  const query = filters.query?.toLocaleLowerCase() ?? "";
  const frameworkErrorCode = filters.query === undefined
    ? undefined
    : firstFrameworkErrorCodeQuery(filters.query);
  const focused = RouteQuestionRules
    .filter((rule) => ruleMatchesRouteQuestion(rule, route, filters, query, frameworkErrorCode))
    .flatMap((rule) => renderRouteQuestion(rule, filters, frameworkErrorCode));
  return uniqueRouteQuestions([...focused, ...route.nextQuestions]);
}

function ruleMatchesRouteQuestion(
  rule: RouteQuestionRule,
  route: AtlasWorkRoute,
  filters: AtlasWorkRouterFilters,
  query: string,
  frameworkErrorCode: string | undefined,
): boolean {
  if (rule.routeId !== route.id) {
    return false;
  }
  return (
    (rule.queryAny?.some((term) => query.includes(term)) ?? false) ||
    (rule.effectKind !== undefined && filters.effectKind === rule.effectKind) ||
    (rule.requiresRecipeKey === true && filters.recipeKey !== undefined) ||
    (rule.requiresSeedUse === true && filters.seedUse !== undefined) ||
    (rule.requiresFrameworkErrorCode === true && frameworkErrorCode !== undefined)
  );
}

function renderRouteQuestion(
  rule: RouteQuestionRule,
  filters: AtlasWorkRouterFilters,
  frameworkErrorCode: string | undefined,
): readonly string[] {
  const question = typeof rule.question === "string"
    ? rule.question
    : rule.question(filters, frameworkErrorCode);
  return question === undefined ? [] : [question];
}

function uniqueRouteQuestions(questions: readonly string[]): readonly string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const question of questions) {
    if (seen.has(question)) {
      continue;
    }
    seen.add(question);
    unique.push(question);
  }
  return unique;
}
