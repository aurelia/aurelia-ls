import { LensId } from "../lens.js";
import type { AtlasWorkRoute } from "./atlas-work-router-contracts.js";

/** Static work-route catalog used by the atlas.work-router lens. */
export const ATLAS_WORK_ROUTES: readonly AtlasWorkRoute[] = [
  {
    id: "authoring.forms.fixture-flywheel",
    aliases: ["authoring-fixture-flywheel"],
    title: "Authoring Forms Fixture Flywheel",
    summary:
      "Use framework docs/tests and existing recipe pressure to expand form fixtures while keeping generated fixtures distinct from non-recommended analysis fixtures.",
    domains: ["authoring", "fixtures", "forms", "observation", "recipes", "expected-effects"],
    roles: ["orient", "author", "analyze", "verify", "document"],
    terms: [
      "forms",
      "state-backed forms",
      "form recipe",
      "larger app recipe",
      "app-building recipe",
      "clean Aurelia code",
      "low boilerplate Aurelia",
      "Aurelia code economy",
      "code economy",
      "fixture flywheel",
      "expected semantic effects",
      "validation",
      "validate binding behavior",
      "dynamic keyed validation",
      "validation keyed form source",
      "repeat local keyed validate binding",
      "person[field] validate",
      "person[addressField][line1Field] validate",
      "ValidationController",
      "validation controller usage",
      "validation property info",
      "binding behavior application",
      "generated fixture",
      "analysis fixture",
      "authoring intent",
      "authoring catalog",
      "authoring orientation",
      "api query missing",
      "authoring api query missing",
      "framework grounding missing",
      "authoring framework grounding missing",
      "semantic fact partial",
      "project tooling",
      "project tooling failed",
      "package tooling",
      "package tooling policy",
      "policy open",
      "source edit policy",
      "source edit policy open",
      "repair plan",
      "repair app",
      "service-backed form",
      "service-backed state",
      "state-owned service",
      "state owned service",
      "state-owned service loading",
      "background service",
      "service boundary",
      "service interaction",
      "service interaction binding",
      "service class",
      "multi-step form",
      "wizard form",
      "wizard state",
      "wizard steps",
      "workflow-step-list",
      "wizard section fields",
      "workflow section field schema",
      "workflow-section-field-schema-list",
      "wizard-section-fields source parameters",
      "request field schema",
      "request-fields source parameters",
      "request selection identity",
      "selection identity source parameters",
      "plain editor selection identity",
      "editor scalar selection id",
      "profile form source parameters",
      "settings tabs profile form",
      "section routes request fields",
      "file upload form field",
      "avatar upload field",
      "native file input authoring",
      "phone number tel input",
      "telephone field value channel",
      "value-as-number form field",
      "validated settings form",
      "API keys notifications form",
      "settings form API keys",
      "step progress",
      "progress presentation",
      "class style progress",
      "proxy observation",
      "proxy observation authoring state fixtures",
      "observer couplings",
      "observer coupling expected effects",
      "select observer couplings",
      "checked observer couplings",
      "direct state binding",
      "direct domain binding",
      "direct state domain methods",
      "direct state domain method calls",
      "clean app building",
      "direct listener state method",
      "listener state method",
      "template listener state call",
      "submit listener state method",
      "event handler invocation",
      "event-handler-invocation",
      "ListenerBinding",
      "state member binding",
      "state.member",
      "state.submitRequest",
      "template-local domain object",
      "template local domain object",
      "forwarding getter",
      "view-model forwarding getter",
      "di state template binding",
      "native value binding",
      "native select binding",
      "native checked binding",
      "option model binding",
      "checked collection binding",
      "checked map binding",
      "keyed form source",
      "keyed form binding",
      "array index form binding",
      "record keyed checked binding",
      "custom matcher binding",
      "select multiple binding",
      "classificationKey native-value-binding",
      "classificationKey native-select-binding",
      "classificationKey native-checked-binding",
      "classificationKey option-model-binding",
      "classificationKey checked-collection-binding",
      "classificationKey checked-map-binding",
      "classificationKey custom-matcher-binding",
      "classificationKey select-multiple-binding",
      "classificationKey multi-step-form",
    ],
    queryCanaries: [
      {
        query: "authoring catalog",
        summary:
          "Static authoring ontology questions should not fall back to prose or generic fixture routing.",
      },
      {
        query: "repair plan",
        summary:
          "Authoring repair loops need to reopen source-plan pressure through the authoring route.",
      },
      {
        query: "package tooling policy",
        summary:
          "Generated fixture tooling policy is part of authoring recipe quality, not a generic scripts concern.",
      },
      {
        query: "project tooling failed package tooling policy open source edit policy",
        summary:
          "Authoring recipe pressure around tooling/source-edit policy should route to fixture viability and operation planning.",
      },
      {
        query: "authoring api query missing framework grounding fixture forms recipe",
        summary:
          "App-pressure authoring-open reasons should route back to authoring fixtures and recipe/effect grounding without manual translation.",
      },
      {
        query: "service interaction",
        summary:
          "Service-backed forms must route through expected service-interaction effects.",
      },
      {
        query: "state-owned service loading",
        summary:
          "Service-backed authoring can mean DI state owning service/repository calls rather than a component-facing service facade.",
      },
      {
        query: "native checked binding option model binding form fixture",
        summary:
          "Form fixture routing should find exact corpus classification handles for checked and select option-model behavior.",
      },
      {
        query: "proxy observation authoring state fixtures",
        summary:
          "Direct DI state bindings and ProxyObservable-integrated domain-model pressure should route through the authoring fixture flywheel.",
      },
      {
        query: "view-model forwarding getter state.member",
        summary:
          "Getter-only state forwarding in fixtures is authoring taste and observation pressure, not a generic cleanup task.",
      },
      {
        query: "direct listener state method forms observation app building",
        summary:
          "Low-boilerplate listener calls into DI-owned state should route through form authoring and binding/value-channel semantics.",
      },
      {
        query: "clean app building authoring forms observer couplings proxy direct state domain methods",
        summary:
          "Composite clean-code form questions with proxy/direct-state wording should route to form fixtures and proxy-observation grounding without needing exact route terms.",
      },
      {
        query: "multi-step wizard state backed form class style validation",
        summary:
          "Wizard/progress form pressure should route through source-backed form recipe and class/style binding semantics.",
      },
      {
        query: "wizard section fields workflow field schema source parameters",
        summary:
          "Workflow-specific wizard field schemas should route through source-parameterized authoring fixtures instead of becoming recipe-local hardcoded fields.",
      },
      {
        query:
          "validated settings form API keys notifications request field schema source parameters",
        summary:
          "Settings-form field-schema extraction belongs to form authoring/source-parameter pressure, not state-store configuration.",
      },
      {
        query:
          "profile form request selection identity low boilerplate source parameters",
        summary:
          "Profile-form selection identity heuristics belong to form authoring and source-parameter policy before state-store configuration.",
      },
      {
        query:
          "plain editor scalar selection id low boilerplate source parameters",
        summary:
          "Plain editor prompts should route to form source-parameter policy before any state-store route sees generic state/source words.",
      },
      {
        query:
          "settings tabs plus profile form section routes request fields source parameters",
        summary:
          "Mixed sectioned-navigation plus form-field scoping belongs to authoring guidance and routed shell companion planning.",
      },
      {
        query: "avatar upload file input form field source parameter",
        summary:
          "Upload fields need deliberate form authoring and native file-input semantics rather than generic string-field scaffolding.",
      },
      {
        query:
          "phone number tel input value-as-number form field source parameter",
        summary:
          "Telephone fields should route to form value-channel policy so phone-number labels stay string-backed instead of numeric.",
      },
      {
        query: "keyed form source checked select array index record binding",
        summary:
          "Keyed checked/select form sources should route through form fixture pressure and binding value-channel semantics.",
      },
      {
        query: "dynamic keyed validation person[field] validate binding behavior data flow",
        summary:
          "Dynamic keyed validation pressure should route through contrastive forms, validation-html, and binding data-flow semantics.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-catalog.ts",
        symbolName: "readSemanticAuthoringCatalog",
        role: "grounding",
        summary:
          "Static authoring ontology and recipe contracts should be read before changing recipe policy.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/api/authoring-orientation.ts",
        symbolName: "readSemanticAuthoringOrientation",
        role: "grounding",
        summary:
          "Opened-app authoring orientation joins capabilities, taste, repair, and recipe-fit pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/state-backed-form-recipe.ts",
        symbolName: "buildValidatedStateBackedFormPlan",
        role: "supporting",
        summary:
          "Validated form authoring recipe surface for validation-html and validate binding-behavior pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/state-backed-form-recipe.ts",
        symbolName: "buildStateBackedFormPlan",
        role: "primary",
        summary:
          "Primary non-routed form authoring recipe surface and source plan pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/routed-state-backed-form-recipe.ts",
        symbolName: "buildRoutedStateBackedFormPlan",
        role: "supporting",
        summary:
          "Routed form recipe pressure joins forms with router and viewport semantics.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/service-backed-form-recipe.ts",
        symbolName: "buildServiceBackedFormPlan",
        role: "supporting",
        summary:
          "Service-backed form recipe pressure covers service-backed state, service-class, service-interaction, and service-interaction-binding effects.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/multi-step-state-backed-form-recipe.ts",
        symbolName: "buildMultiStepStateBackedFormPlan",
        role: "supporting",
        summary:
          "Multi-step form recipe pressure joins DI-owned state, validation, repeated steps, and class/style progress presentation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/repair-plan.ts",
        symbolName: "buildAuthoringRepairPlan",
        role: "supporting",
        summary:
          "Repair plans turn reopened authoring repair clusters into semantic repair operations and closure effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/expected-effect.ts",
        role: "grounding",
        summary:
          "Expected semantic effects make generated fixtures verifiable instead of passive snapshots.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/authoring/",
        role: "primary",
        summary:
          "Authoring recipe builders, source plans, ontology, verification, and capability docs are route-local workset material.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/authoring/",
        role: "pressure",
        summary:
          "Generated and hand-authored recommendable fixtures are the durable authoring fixture workset lane.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "authoring-taste",
        role: "pressure",
        summary:
          "Framework docs provide promoted form examples for authoring taste pressure.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        role: "pressure",
        summary:
          "Framework tests provide form behavior-grounding examples for non-recommendable or edge-case pressure.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "native-value-binding",
        role: "grounding",
        summary:
          "Native value binding seeds ground input/select/textarea value-channel and data-flow behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "native-select-binding",
        role: "grounding",
        summary:
          "Native select binding seeds ground SelectValueObserver value, model, and option-domain behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "native-checked-binding",
        role: "grounding",
        summary:
          "Native checked binding seeds ground checkbox and radio observer behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "option-model-binding",
        role: "grounding",
        summary:
          "Option model binding seeds ground select option identity and model/value channel behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "checked-collection-binding",
        role: "grounding",
        summary:
          "Checked collection binding seeds ground checkbox Array/Set membership observer behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "checked-map-binding",
        role: "grounding",
        summary:
          "Checked Map binding seeds ground checkbox Map key with boolean value observer behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "custom-matcher-binding",
        role: "grounding",
        summary:
          "Custom matcher binding seeds ground checked/select model identity matching.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "select-multiple-binding",
        role: "grounding",
        summary:
          "Multiple select binding seeds ground array mutation and non-multiple array diagnostics.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "behavior-grounding",
        classificationKind: "surface",
        classificationKey: "validation-binding-behavior",
        role: "grounding",
        summary:
          "Validation binding-behavior seeds ground validate application facts for validated form recipes.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "forms",
        seedUse: "authoring-taste",
        classificationKind: "surface",
        classificationKey: "multi-step-form",
        role: "pressure",
        summary:
          "Multi-step form seeds ground wizard/progress app-building pressure for state-backed form recipes.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "binding-value-channel",
        recipeKey: "state-backed-form",
        role: "grounding",
        summary:
          "State-backed form recipes should prove native form value-channel facts after reopening.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "binding-data-flow",
        recipeKey: "state-backed-form",
        role: "grounding",
        summary:
          "State-backed form recipes should prove TypeChecker-backed source-to-target binding data flow.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "binding-behavior-application",
        recipeKey: "validated-state-backed-form",
        role: "grounding",
        summary:
          "Validated form recipes should prove validate binding-behavior applications after reopening.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "binding-behavior-application",
        recipeKey: "localized-validated-state-backed-form",
        role: "grounding",
        summary:
          "Combined localized and validated form recipes should prove validate behavior rows while keeping i18n as a separate plugin lane.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "binding-behavior-application",
        recipeKey: "multi-step-state-backed-form",
        role: "grounding",
        summary:
          "Multi-step form recipes should prove validation behavior rows while also exercising progress class/style channels.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "service-class",
        recipeKey: "state-backed-form",
        role: "grounding",
        summary:
          "State-backed form recipes should expose DI-injectable state or service-class topology.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "service-interaction",
        recipeKey: "service-backed-form",
        role: "grounding",
        summary:
          "Service-backed form recipes should prove the chosen service boundary, currently component-to-state plus state-to-service interactions.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "service-interaction-binding",
        recipeKey: "service-backed-form",
        role: "grounding",
        summary:
          "Service-backed form recipes should prove template bindings hand off through the state/service boundary.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        effectKind: "route",
        recipeKey: "routed-state-backed-form",
        role: "supporting",
        summary:
          "Routed form recipes should prove route topology facts separately from plain form semantics.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "authoring", "forms", "fixtures", "observation"],
        role: "grounding",
        summary:
          "Durable memory carries user taste about idiomatic state-backed forms and observation channels.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "fixture-seeds",
        filters: { concept: "forms" },
        role: "pressure",
        summary:
          "Find docs/tests examples that can seed both recommended and contrastive form fixtures.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime fixtures:authoring",
        role: "supporting",
        summary:
          "Refresh durable generated authoring fixtures from recipe source plans after recipe changes.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api",
        role: "pressure",
        summary:
          "Aggregate opened-app pressure, authoring expected-effect outcomes, diagnostics, routes, and binding facts.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:state-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the generated state-backed form recipe.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:validated-state-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the generated validated state-backed form recipe.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:dynamic-keyed-validation",
        role: "pressure",
        summary:
          "Focused contrastive contract for validate binding behavior over dynamic keyed form sources.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:localized-validated-state-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the generated combined i18n and validation state-backed form recipe.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:multi-step-state-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the generated multi-step state-backed form recipe.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:service-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for DI service-layer and service-interaction form recipes.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:routed-service-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for route-selected DI state plus service-boundary form recipes.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:routed-localized-validated-state-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the generated routed i18n and validation state-backed form recipe.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:repair-plan",
        role: "supporting",
        summary:
          "Repair-plan smoke for turning observed authoring repair clusters into semantic repair operations.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/authoring/README.md",
        role: "grounding",
        summary:
          "Authoring loop, expected-effect, recipe, and fixture-generation boundary.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/fixtures/authoring/README.md",
        role: "grounding",
        summary:
          "Recommendable generated authoring fixture lane and separation from pressure fixtures.",
      },
    ],
    authority: [
      "User taste about state classes, sparse bindables, ids over object handoff, and generated-vs-analysis fixture separation.",
      "Aurelia framework docs and tests for form, binding, and observation semantics.",
      "semantic-runtime authoring recipes and expected-effect contracts.",
      "Atlas memory live checks for still-open authoring and forms frontiers.",
    ],
    cautions: [
      "Do not let generated fixture ideals erase analysis fixtures that represent code users may actually write.",
      "Do not invent form semantics locally when observer, binding, or template compiler framework mirrors already exist.",
      "Weak typings in a fixture should often become diagnostics pressure, not an autocomplete failure.",
    ],
    nextQuestions: [
      "Which expected semantic effects should a state-backed form fixture assert?",
      "Which validation-html and binding-behavior examples should seed validated form fixtures?",
      "Which framework tests/docs examples cover checked, select, value, class, and style channels?",
      "Which generated recipe output should be intentionally recommended versus contrastive?",
    ],
    relatedRouteIds: [
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.evaluator.world-construction",
      "atlas.work-router.self-improvement",
      "atlas.framework-corpus.navigation",
      "router.viewport.authoring-semantics",
    ],
  },
  {
    id: "semantic-runtime.authoring-fixture-substrate-loop",
    title: "Semantic Runtime Authoring Fixture Substrate Loop",
    summary:
      "Coordinate authoring recipes, generated/contrastive fixtures, expected effects, evaluator, TypeChecker, template recursion, framework corpus, and Atlas memory as one recursive product loop.",
    domains: [
      "semantic-runtime",
      "authoring",
      "fixtures",
      "expected-effects",
      "atlas",
      "memory",
      "analysis-substrate",
    ],
    roles: ["orient", "author", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "authoring fixture substrate loop",
      "semantic-runtime authoring fixture loop",
      "semantic runtime authoring fixture loop",
      "fixture flywheel",
      "fixture flywheel substrate",
      "generated fixture expected effects",
      "contrastive fixture expected effects",
      "atlas memory authoring loop",
      "framework corpus fixture grounding",
      "authoring fixture pressure frontier",
      "app-building guidance",
      "recipePlanSequence",
      "recipe plan sequence",
      "pattern-reference companion recipe",
      "mixed feature-goal guidance",
      "mixed app-building guidance",
      "source-plan-start recipe",
      "source pattern parameters",
      "source pattern modules",
      "sourcePlan.pattern.modules",
      "sourcePlan.pattern.parameters",
      "sourceParameterValues",
      "source parameter applications",
      "workflow-step-list",
      "wizard-steps source-text-input",
      "wizard section fields",
      "workflow section field schema",
      "workflow-section-field-schema-list",
      "wizard-section-fields source-text-input",
      "AuthoringSourcePatternModule",
      "AuthoringSourcePatternParameter applicationPolicy",
      "AuthoringSourcePattern parameters",
      "reference instantiation adaptation slots",
      "caller-domain source generation",
      "recipe fixture separation",
      "fixture vs recipe",
      "domain model policy reference instantiation",
      "semantic-runtime-reference-instantiation",
      "app shell",
      "app-shell recipe",
      "minimal app",
      "minimal-app",
      "convention minimal app",
      "convention-minimal-app",
      "convention app shell",
      "convention resource declaration",
      "convention template file",
      "public scaffold app shell",
      "routed app shell",
      "routed-app-shell",
      "generic routing recipe",
      "route shell recipe",
      "routing companion recipe",
      "larger app feature module",
      "clean efficient larger app",
      "route service state validation",
      "routed catalog storefront",
      "routed-catalog-storefront",
      "routed app-building recipe",
      "catalog storefront routes",
      "route parameter selected state",
      "localized validated state-backed form",
      "localized-validated-state-backed-form",
      "routed localized validated state-backed form",
      "routed-localized-validated-state-backed-form",
      "routed service-backed form",
      "routed-service-backed-form",
      "routed service form recipe",
      "searchable data table",
      "searchable-data-table",
      "routed searchable data table",
      "routed-searchable-data-table",
      "routed data table recipe",
      "management feature table route",
      "data table recipe",
      "data-grid recipe",
      "search filter sort pagination",
      "checked model selection table",
      "debounced search value channel",
      "plugin-backed form recipe",
      "i18n validation form recipe",
    ],
    queryCanaries: [
      {
        query:
          "semantic runtime authoring fixture flywheel evaluator type system template recursion atlas memory",
        summary:
          "The core loop spans authoring and lower semantic-runtime substrates; a broad checkpoint query should route to the coordinating loop before choosing a concrete frontier.",
      },
      {
        query: "newly improved atlas memory drive semantic-runtime authoring fixture loop",
        summary:
          "Memory-driven authoring/fixture work should not require manual translation through workbench notes after compaction.",
      },
      {
        query: "authoring fixture substrate loop expected effects framework corpus",
        summary:
          "Fixture expansion should connect generated output, contrastive examples, framework corpus seeds, and expected semantic effects.",
      },
      {
        query: "convention minimal app app shell recipe public scaffold",
        summary:
          "Convention-based app-shell recipes should route through authoring fixtures and resource-convention grounding instead of becoming MCP-local scaffold prose.",
      },
      {
        query: "routed app shell recipe generic route companion",
        summary:
          "Generic routing authoring should route through the routed app-shell recipe before borrowing domain-specific routed form, catalog, or data-table recipes.",
      },
      {
        query: "routed catalog storefront app-building recipe expected effects",
        summary:
          "Larger routed authoring recipes should route through the authoring fixture loop before dropping into router or observation substrates.",
      },
      {
        query: "localized validated state-backed form plugin recipe i18n validation",
        summary:
          "Combined plugin form recipes should route through the authoring fixture loop before narrowing to i18n or validation internals.",
      },
      {
        query: "routed localized validated state-backed form route plugin recipe",
        summary:
          "Route-owned plugin form recipes should route through the authoring fixture loop before narrowing to router, i18n, or validation internals.",
      },
      {
        query: "routed service-backed form route selected state service loading recipe",
        summary:
          "Routed service-backed form recipes should route through the authoring fixture loop before narrowing to router, service-interaction, or binding-flow substrates.",
      },
      {
        query:
          "searchable data table recipe direct state value checked debounce pagination",
        summary:
          "Search/filter/sort/pagination app-building recipes should route through the authoring fixture loop before narrowing to value channels or observation substrates.",
      },
      {
        query:
          "routed searchable data table list detail route selected state management feature",
        summary:
          "Route-owned list/detail table-management recipes should route through the authoring fixture loop before narrowing to router, value-channel, or observation substrates.",
      },
      {
        query:
          "featureGoal recipePlanSequence pattern-reference routed searchable validation localization",
        summary:
          "Mixed feature-goal recipe paths should route through the authoring fixture loop so generated and companion pattern recipes stay grounded in expected effects.",
      },
      {
        query:
          "feature goal specialization multi step form guidance over scaffolding",
        summary:
          "Feature-goal specialization policy should route through authoring guidance before adding recipe-local conditionals.",
      },
      {
        query:
          "authoring source pattern parameters caller-domain generation recipe fixture separation",
        summary:
          "Recipe/fixture separation and caller-domain adaptation slots should route through the authoring fixture substrate loop before any public-shell packaging concern.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/source-plan.ts",
        symbolName: "AuthoringSourcePattern",
        role: "primary",
        summary:
          "Source pattern metadata separates reusable recipe architecture from complete reference instantiations and exposes adaptation slots.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/source-pattern-modules.ts",
        symbolName: "SourcePatternModules",
        role: "supporting",
        summary:
          "Shared source-pattern module catalog for reusable architecture capabilities inside reference source plans.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance.ts",
        symbolName: "readSemanticAuthoringGuidance",
        role: "primary",
        summary:
          "Compact app-building guidance surface for MCP-like callers choosing a recipe or next authoring action.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance-catalog.ts",
        symbolName: "guidanceFeatureSignals",
        role: "supporting",
        summary:
          "Authored app-building guidance policy tables: feature-goal signals, recipe ordering, principles, decisions, and follow-up surfaces.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance-catalog.ts",
        symbolName: "guidanceRecipeSpecializationSignalKeysByRecipe",
        role: "supporting",
        summary:
          "Recipe specialization signal table prevents wider routed, localized, multi-step, service, state, or composition recipes from becoming the source-plan start unless the user asked for that capability.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-catalog.ts",
        symbolName: "readSemanticAuthoringCatalog",
        role: "primary",
        summary:
          "Static authoring ontology, recipe, taste, operation, and expected-effect catalog surface.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-orientation.ts",
        symbolName: "readSemanticAuthoringOrientation",
        role: "primary",
        summary:
          "Opened-app authoring orientation joins capability, taste, repair, and semantic-fact pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/expected-effect.ts",
        symbolName: "ExpectedSemanticEffect",
        role: "primary",
        summary:
          "Expected effects make authoring fixtures active semantic contracts instead of passive snapshots.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/ontology.ts",
        symbolName: "AuthoringOperationOntology",
        role: "primary",
        summary:
          "Authoring ontology is the durable operation/taste/capability spine for generated app-building behavior.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/application/topology-builder.ts",
        symbolName: "ApplicationTopologyBuilder",
        role: "supporting",
        summary:
          "Application topology assembly is the authoring-side file/component/service/route layout substrate.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/authoring/convention-minimal-app-recipe.ts",
        symbolName: "buildConventionMinimalAppPlan",
        role: "primary",
        summary:
          "Generated app-shell recipe that uses current Aurelia convention resource discovery when the class/file/template pair is provable.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-convention.ts",
        symbolName: "readResourceNameConvention",
        role: "grounding",
        summary:
          "Framework-shaped convention rules decide whether a convention source pair is admissible; authoring should not invent name heuristics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-app-shell-recipe.ts",
        symbolName: "buildRoutedAppShellPlan",
        role: "primary",
        summary:
          "Generated route-shell recipe that proves RouterConfiguration, static route config, named au-viewport layout, route params, query values, fragments, and routeable components without a domain-model recipe.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-catalog-storefront-recipe.ts",
        symbolName: "buildRoutedCatalogStorefrontPlan",
        role: "primary",
        summary:
          "Generated app-building recipe that combines DI-owned catalog state, service-backed loading, list/detail routing, route params, and route expected effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-searchable-data-table-recipe.ts",
        symbolName: "buildRoutedSearchableDataTablePlan",
        role: "primary",
        summary:
          "Generated app-building recipe that combines searchable table state, service-backed loading, list/detail routing, data-driven row links, and route expected effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/evaluator.ts",
        symbolName: "StaticEvaluator",
        role: "supporting",
        summary:
          "Evaluator gaps exposed by authoring or fixture pressure should be absorbed at the world-construction substrate.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/expression-type-evaluator.ts",
        symbolName: "CheckerExpressionTypeEvaluator",
        role: "supporting",
        summary:
          "TypeChecker-backed expression semantics should be reused by authoring, diagnostics, and template recursion pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/compiled-template-materializer.ts",
        symbolName: "CompiledTemplateMaterializer",
        role: "supporting",
        summary:
          "Recursive template/controller materialization is a likely lower substrate when fixtures expose nested template semantics.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasMemory,
        projection: "next",
        role: "grounding",
        summary:
          "Atlas memory is the durable state for still-open work and should drive the next concrete frontier.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasWorkRouter,
        projection: "route-plan",
        role: "grounding",
        summary:
          "The Work Router should choose or improve structural routes before product work proceeds from a broad checkpoint phrase.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "fixture-seeds",
        role: "grounding",
        summary:
          "Official docs and framework tests seed promoted and behavior-grounded fixtures without manual spelunking.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "resource-visibility",
        recipeKey: "convention-minimal-app",
        role: "grounding",
        summary:
          "Convention app-shell recipes should prove resource visibility through convention admission and template-file ownership.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "authoring", "fixtures"],
        role: "grounding",
        summary:
          "Durable authoring and fixture memory captures taste, expected-effect, and still-open frontier context.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "authoring", "ontology", "app-building"],
        role: "grounding",
        summary:
          "Authoring ontology memory should route to the authoring fixture substrate before recipe-local vocabulary grows.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "application", "authoring", "fixture", "topology"],
        role: "supporting",
        summary:
          "Application topology memory is authoring substrate guidance when generated fixtures assemble app-level files.",
      },
      {
        kind: "memory",
        domains: ["atlas", "memory", "work-router"],
        role: "grounding",
        summary:
          "Durable Atlas memory/router guidance keeps compaction recovery and route misses visible.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "world-construction"],
        role: "pressure",
        summary:
          "Evaluator and world-construction memory frontiers should be visible when authoring fixtures expose lower substrate gaps.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "type-system", "expression", "checker"],
        role: "pressure",
        summary:
          "TypeChecker expression memory frontiers should be visible when authoring fixtures need speculative or template-aware expression reads.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "rendering", "controller"],
        role: "pressure",
        summary:
          "Template rendering and controller materialization memory frontiers should be visible when fixtures expose recursive hydration or controller-scope gaps.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "controller", "recursive-rendering"],
        role: "pressure",
        summary:
          "Nested template-controller memory frontiers should be visible as recursive rendering pressure, not hidden under generic authoring work.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        seedUse: "authoring-taste",
        role: "grounding",
        summary:
          "Docs-promoted fixture seeds provide authoring taste pressure.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework-test fixture seeds provide behavioral grounding, including contrastive cases authoring should understand but not necessarily generate.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        recipeKey: "routed-app-shell",
        role: "grounding",
        summary:
          "Routed app-shell filters gather generic router seeds before app-building guidance composes them with feature-domain recipes.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        recipeKey: "searchable-data-table",
        role: "grounding",
        summary:
          "Searchable data-table recipe filters join explicit table/list management, search/filter/sort/pagination, and selection seed lanes.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        recipeKey: "routed-searchable-data-table",
        role: "grounding",
        summary:
          "Routed searchable data-table filters compose data-table seeds with router seeds because docs/tests often ground the feature and navigation lanes separately.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "authoring-capability",
        role: "grounding",
        summary:
          "Authoring capability expected effects connect generated fixtures to semantic-runtime orientation contracts.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:convention-minimal-app",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for the convention-based minimal app-shell recipe.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/authoring/",
        role: "pressure",
        summary:
          "Authoring fixtures are the visible canary for generated, contrastive, and behavior-grounded app-building pressure.",
      },
    ],
    authority: [
      "Atlas memory and Work Router for choosing the next concrete frontier after compaction.",
      "Authoring catalog/orientation and expected-effect contracts for generated fixture intent.",
      "Framework corpus docs/tests for promoted and behavior-grounded example pressure.",
      "Evaluator, TypeChecker expression, and recursive template materialization routes when fixture pressure exposes lower substrate gaps.",
    ],
    cautions: [
      "This route coordinates a loop; once a concrete substrate is selected, pivot to the related route that owns that code.",
      "Do not let ideal generated fixtures erase contrastive fixtures that represent code semantic-runtime must still analyze.",
      "When a fixture exposes an evaluator, checker, or recursive template gap, improve the substrate rather than patching only the fixture.",
    ],
    nextQuestions: [
      "Which memory next action is the first concrete frontier for the authoring fixture loop?",
      "Is the current pressure authoring ontology, expected effects, evaluator/world construction, TypeChecker expression semantics, or template recursion?",
      "Which framework docs/tests seeds should become generated examples, contrastive examples, or behavior-grounding checks?",
      "Does the Work Router need a stronger structural route before product work continues?",
    ],
    relatedRouteIds: [
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.proxy-observation-domain-modeling",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.evaluator.world-construction",
      "router.viewport.authoring-semantics",
      "semantic-runtime.semantic-contract-verification",
      "atlas.work-router.self-improvement",
      "atlas.framework-corpus.navigation",
    ],
  },
  {
    id: "semantic-runtime.semantic-contract-verification",
    title: "Semantic Runtime Semantic Contract Verification",
    summary:
      "Use route-scoped semantic contracts, framework corpus witnesses, expected effects, and inquiry budgets to catch regressions without freezing bold refactors.",
    domains: [
      "semantic-runtime",
      "testing",
      "verification",
      "fixtures",
      "expected-effects",
      "inquiry",
      "framework-corpus",
    ],
    roles: ["orient", "verify", "analyze", "document", "improve-atlas"],
    terms: [
      "semantic contract harness",
      "semantic contract verification",
      "route scoped contract",
      "route-scoped contract",
      "route scoped testing",
      "semantic regression witness",
      "framework corpus witness",
      "framework test witness",
      "docs witness",
      "fixture contract",
      "proxy observation contract",
      "runtime watcher expected effect",
      "expected semantic effect contract",
      "behavior grounding witness",
      "fast testing lane",
      "slow confidence lane",
      "auLink pseudo-test",
      "auLink as grounding",
      "query cost contract",
      "inquiry budget contract",
      "semantic effects not snapshots",
    ],
    queryCanaries: [
      {
        query: "semantic contract harness route scoped testing expected effects framework witnesses",
        summary:
          "Testing-strategy work should route to semantic contracts rather than a full snapshot suite.",
      },
      {
        query: "how do we catch semantic-runtime regressions without slowing bold refactors",
        summary:
          "Regression confidence should route to route-scoped semantic witnesses and inquiry budgets.",
      },
      {
        query: "auLink pseudo tests are not enough semantic contract lane",
        summary:
          "auLink remains framework grounding, while behavior regression pressure belongs in semantic contracts.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/expected-effect.ts",
        symbolName: "ExpectedSemanticEffect",
        role: "primary",
        summary:
          "Expected effects are the first semantic-contract vocabulary for generated and repaired apps.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/verification.ts",
        symbolName: "readAuthoringVerificationSnapshot",
        role: "primary",
        summary:
          "Opened-app verification snapshot collector for row-backed expected effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimGraph",
        role: "supporting",
        summary:
          "Inquiry-profile retention and materialization policy should be contractable for public query surfaces.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "fixture-seeds",
        role: "grounding",
        summary:
          "Docs and framework tests seed promoted-pattern and behavior-grounding witnesses.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasWorkRouter,
        projection: "route-plan",
        role: "grounding",
        summary:
          "Work Router should select focused contract witnesses by route instead of running a monolithic suite.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "testing", "verification", "inquiry"],
        role: "grounding",
        summary:
          "Durable memory for the semantic-contract harness and inquiry-budget test policy.",
      },
      {
        kind: "doc",
        path: ".temp/mcp-preview-and-testing-alignment-2026-05-18.md",
        role: "grounding",
        summary:
          "Scratch alignment for the route-scoped semantic contract testing strategy.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas work:router -- --projection=route-health",
        role: "supporting",
        summary:
          "Fast route-health lane for checking route canaries before selecting deeper witnesses.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:proxy-observation",
        role: "supporting",
        summary:
          "Focused observation contract over watcher runtime products and proxy observed-dependency rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:trackable-method-observation",
        role: "supporting",
        summary:
          "Focused observation contract over binding-owned @computed/@astTrack trackable method dependency rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime fixtures:authoring",
        role: "supporting",
        summary:
          "Current generated-fixture lane that should eventually feed semantic contract witnesses.",
      },
    ],
    authority: [
      "Expected semantic effects and opened-app verification snapshots for contract facts.",
      "Work Router for route-scoped witness selection.",
      "Aurelia framework docs/tests through framework.corpus for promoted and behavior-grounded seeds.",
      "QueryClaimGraph and app-query catalog rows for inquiry cost, retention, and public-answer budgets.",
    ],
    cautions: [
      "Do not import the whole Aurelia framework test suite as the default verification lane.",
      "Do not add broad snapshots of public DTOs when a semantic effect or row-backed fact would state the intended behavior.",
      "Do not treat auLink mirror coverage as behavior regression coverage; it is framework grounding and architecture alignment.",
      "Do not let tests enforce compatibility shims when a bold ontology or substrate refactor is the cleaner answer.",
    ],
    nextQuestions: [
      "Which Work Router route owns the changed code or product concern?",
      "Which semantic products or expected effects should be asserted for this route?",
      "Which framework docs/tests examples seed this witness, and are they promoted patterns or behavior grounding?",
      "Does the inquiry profile need cost, retention, paging, or materialization-budget assertions?",
    ],
    relatedRouteIds: [
      "semantic-runtime.authoring-fixture-substrate-loop",
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.inquiry-query-claim-graph",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.proxy-observation-domain-modeling",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.template-recursive-rendering",
      "atlas.framework-corpus.navigation",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "mcp.developer-preview-shell",
    title: "MCP Developer Preview Shell",
    summary:
      "Keep the public MCP package as a thin, restart-tolerant shell over semantic-runtime APIs while Atlas remains the internal navigation substrate.",
    domains: ["mcp", "api", "semantic-runtime", "authoring", "app-building", "lsp", "router"],
    roles: ["orient", "analyze", "author", "verify", "document"],
    terms: [
      "mcp shell",
      "aurelia mcp",
      "au-mcp",
      "mcp developer preview",
      "developer preview shell",
      "public mcp api",
      "mcp public api",
      "thin mcp shell",
      "mcp adapter",
      "mcp structured content",
      "structuredContent",
      "mcp resource",
      "mcp prompt",
      "mcp tool",
      "resource link",
      "mcp analysis cache",
      "aurelia_analysis_cache_overview",
      "clear analysis cache",
      "workspace overview",
      "aurelia_workspace_overview",
      "projectPage",
      "project page",
      "aurelia_authoring_recipe_plan",
      "aurelia_app_building_guidance",
      "sourcePlan.pattern.modules",
      "source pattern modules",
      "sourcePlan.pattern.parameters",
      "source pattern parameters",
      "AuthoringSourcePatternModule",
      "sourceParameterValues",
      "source parameter applications",
      "source-text-input adaptation slots",
      "reference instantiation adaptation slots",
      "caller domain generation",
      "recipe fixture separation",
      "aurelia_app_query_catalog",
      "aurelia_orient_workspace",
      "aurelia_plan_authoring_recipe",
      "aurelia_build_app_feature",
      "authoring recipe plan",
      "recipePlanSequence",
      "recipe plan sequence",
      "pattern-reference",
      "pattern reference",
      "source-plan-start",
      "source plan start",
      "build app feature prompt",
      "authoring guidance",
      "app-building guidance",
      "MCP app building",
      "MCP app-building",
      "mixed app guidance",
      "mixed app-building guidance",
      "MCP authoring recipe pressure",
      "next MCP app building pressure",
      "recipeLimit",
      "convention minimal app",
      "convention-minimal-app",
      "convention app shell",
      "public scaffold app shell",
      "resource declaration style",
      "routed catalog storefront",
      "routed-catalog-storefront",
      "routed storefront recipe",
      "localized validated state-backed form",
      "localized-validated-state-backed-form",
      "routed localized validated state-backed form",
      "routed-localized-validated-state-backed-form",
      "routed service-backed form",
      "routed-service-backed-form",
      "routed service form recipe",
      "searchable data table",
      "searchable-data-table",
      "routed searchable data table",
      "routed-searchable-data-table",
      "data table app-building",
      "search filter sort pagination",
      "plugin-backed form recipe",
      "i18n validation form recipe",
      "app overview",
      "router overview",
      "router row sample",
      "pagingKind",
      "minimumAnalysisDepth",
      "row-sample",
      "diagnostic overview",
      "open seam overview",
      "template cursor info",
      "app query catalog",
      "mcp hand-test",
      "mcp restart",
      "mcp token economy",
      "mcp clean code",
      "effectDetail contracts",
      "effectDetail compact",
      "compact recipe plan",
      "minimal Aurelia code",
      "idiomatic Aurelia code",
      "low boilerplate Aurelia",
      "larger app feature module",
      "clean efficient larger app",
      "route service state validation",
      "terse authoring guidance",
      "core observation MCP",
      "core router MCP",
      "plugin patterns MCP",
      "advertised Aurelia patterns",
      "first MCP delivery cut",
    ],
    queryCanaries: [
      {
        query: "set up au-mcp as a thin shell over semantic-runtime",
        summary:
          "Local MCP setup should route to the package shell and semantic-runtime API facade, not to old au-mcp mapping concepts.",
      },
      {
        query: "mcp workspace overview app overview diagnostic overview router overview structured content",
        summary:
          "MCP tool-shape work should route through the public shell, compact semantic-runtime projections, and explicit pagingKind affordances.",
      },
      {
        query: "aurelia_authoring_recipe_plan MCP recipe plan",
        summary:
          "Recipe-plan tool work should route through the public MCP shell and semantic-runtime authoring recipe plan API.",
      },
      {
        query: "developer preview mcp router viewport authoring",
        summary:
          "Router/viewport developer-preview pressure should keep MCP packaging and semantic-runtime route facts connected.",
      },
      {
        query: "mcp clean terse idiomatic aurelia code core observation router plugins",
        summary:
          "First-preview delivery pressure should route to token-efficient authoring guidance, core observation, common router use, and plugin patterns before fringe API completeness.",
      },
      {
        query: "mcp clean efficient larger app feature module route service state validation observation authoring recipe",
        summary:
          "Larger-feature app-building pressure should route to MCP guidance and semantic-runtime authoring recipes before becoming transport-local prose.",
      },
      {
        query: "aurelia_app_building_guidance app-building focus recipeKey",
        summary:
          "Public app-building guidance should route to the semantic-runtime guidance query before adding shell-local MCP prose.",
      },
      {
        query: "aurelia_app_building_guidance recipeLimit broad app-building candidates",
        summary:
          "Broad app-building guidance token budget should route to semantic-runtime guidance shape, not MCP-local truncation.",
      },
      {
        query: "MCP convention minimal app public scaffold guidance",
        summary:
          "Public convention app-shell guidance should stay on the MCP shell plus semantic-runtime authoring API boundary.",
      },
      {
        query: "MCP routed catalog storefront app-building guidance",
        summary:
          "Public routed app-building recipe guidance should stay on the MCP shell plus semantic-runtime authoring API boundary.",
      },
      {
        query: "MCP localized validated state-backed form plugin guidance",
        summary:
          "Public plugin-backed form guidance should stay on the MCP shell plus semantic-runtime authoring API boundary.",
      },
      {
        query: "MCP routed service-backed form service boundary guidance",
        summary:
          "Public route-owned service form guidance should stay on the MCP shell plus semantic-runtime authoring API boundary.",
      },
      {
        query: "MCP routed localized validated form router i18n validation guidance",
        summary:
          "Public route-owned plugin form guidance should stay on the MCP shell plus semantic-runtime authoring API boundary.",
      },
      {
        query: "aurelia_authoring_recipe_plan effectDetail contracts compact token economy",
        summary:
          "Recipe-plan token-budget work should route to the MCP shell and semantic-runtime authoring plan API, not transport-local filtering.",
      },
      {
        query:
          "mcp app building recipePlanSequence pattern-reference authoring fixture clean code",
        summary:
          "Mixed-feature recipe path and pattern-reference usage should route to MCP guidance plus semantic-runtime authoring APIs, not generic Work Router maintenance.",
      },
      {
        query:
          "recipe fixture source parameters mixed app guidance",
        summary:
          "Public mixed-feature app-building guidance should find MCP packaging while still pointing at semantic-runtime source-pattern and fixture separation.",
      },
      {
        query:
          "MCP authoring source pattern parameters caller-domain generation recipe fixture separation",
        summary:
          "Public app-building answers should expose source-pattern adaptation slots while keeping the actual product model in semantic-runtime.",
      },
      {
        query: "aurelia_build_app_feature prompt source edits low boilerplate",
        summary:
          "Public app-building workflow prompts should route to MCP prompt packaging while leaving source edits and product facts outside the read-only shell.",
      },
      {
        query: "next MCP app building authoring recipe pressure after proxy exits",
        summary:
          "Checkpoint-style app-building follow-up questions should route to MCP guidance and adjacent semantic-runtime authoring/observation routes instead of missing because they ask for next work.",
      },
    ],
    anchors: [
      {
        kind: "path",
        pathPrefix: "packages/mcp/",
        role: "primary",
        summary:
          "The MCP package owns server bootstrap, MCP tool/resource registration, direct dev invocation, and adapter-only public packaging.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/runtime-adapter.ts",
        symbolName: "AureliaMcpSemanticRuntimeAdapter",
        role: "primary",
        summary:
          "Adapter boundary that forwards MCP requests to semantic-runtime without becoming a second product model.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/tools.ts",
        symbolName: "registerAureliaSemanticRuntimeTools",
        role: "primary",
        summary:
          "MCP tool registration surface; keep handlers as parse/forward/format wrappers.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/prompts.ts",
        symbolName: "registerAureliaSemanticRuntimePrompts",
        role: "supporting",
        summary:
          "MCP prompt registration surface for small public workflows over stable tools and resources.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/resources.ts",
        symbolName: "registerAureliaSemanticRuntimeResources",
        role: "supporting",
        summary:
          "MCP resource registration surface for stable read-only semantic slices.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/runtime.ts",
        symbolName: "SemanticRuntime",
        role: "grounding",
        summary:
          "In-process app opening and cursor-locus API facade that MCP should forward to.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-catalog.ts",
        symbolName: "readSemanticAppQueryCatalog",
        role: "grounding",
        summary:
          "Semantic-runtime-owned app query vocabulary and pagingKind affordances for generic MCP app query tooling.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/router-overview.ts",
        symbolName: "readSemanticRouterOverview",
        role: "grounding",
        summary:
          "Summary-first router overview; row samples from multiple router families are explicit opt-in.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance.ts",
        symbolName: "readSemanticAuthoringGuidance",
        role: "grounding",
        summary:
          "Semantic-runtime-owned compact app-building guidance for MCP-like callers; keep product choices here rather than in transport handlers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance-catalog.ts",
        symbolName: "guidanceFeatureSignals",
        role: "supporting",
        summary:
          "Authored public app-building policy tables used by guidance; tune feature-goal vocabulary and recipe order here, not in MCP adapters.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-guidance-catalog.ts",
        symbolName: "guidanceRecipeSpecializationSignalKeysByRecipe",
        role: "supporting",
        summary:
          "Public guidance specialization table that guards against over-scaffolding when a wider recipe covers a simpler feature goal.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-plan.ts",
        symbolName: "readSemanticAuthoringRecipePlan",
        role: "grounding",
        summary:
          "Semantic-runtime-owned recipe-plan projection; row-level expected-effect contracts are opt-in for MCP token economy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/source-plan.ts",
        symbolName: "AuthoringSourcePattern",
        role: "grounding",
        summary:
          "Source-plan pattern metadata and adaptation slots are semantic-runtime-owned; MCP should only forward and explain them.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/source-pattern-modules.ts",
        symbolName: "SourcePatternModules",
        role: "grounding",
        summary:
          "Source-pattern module catalog that lets MCP explain reusable architecture before reference fixture nouns.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/contracts.ts",
        symbolName: "SemanticAppQueryKind",
        role: "grounding",
        summary:
          "Public query kind vocabulary that should drive MCP tools before adding shell-local concepts.",
      },
      {
        kind: "doc",
        path: "packages/mcp/README.md",
        role: "primary",
        summary:
          "Public package boundary, local invocation commands, and thin-shell constraints.",
      },
      {
        kind: "doc",
        path: "packages/atlas/workbench/product-specific-pressures.md",
        heading: "MCP Packaging",
        role: "grounding",
        summary:
          "Product-level MCP packaging grammar: resources, tools, structured content, roots, invalidation, and resource links.",
      },
      {
        kind: "memory",
        domains: ["mcp", "api", "semantic-runtime", "authoring"],
        role: "supporting",
        summary:
          "Join durable decisions about MCP timing, public API boundaries, and semantic-runtime facade constraints.",
      },
      {
        kind: "memory",
        domains: ["mcp", "authoring", "token-economy", "observation", "router"],
        role: "grounding",
        summary:
          "First-preview delivery priority: compact idiomatic Aurelia guidance beats fringe API completeness.",
      },
    ],
    authority: [
      "MCP package README and adapter source for public shell shape.",
      "semantic-runtime API contracts/facade for the actual product facts.",
      "Atlas product-specific MCP pressures for protocol grammar and token economics.",
      "Atlas memory for the boundary that MCP is public and Atlas remains internal.",
    ],
    cautions: [
      "Do not expose Atlas memory, Work Router rows, legacy maps, or internal corpus rows through MCP.",
      "Do not implement product semantics inside MCP handlers; add or improve semantic-runtime queries instead.",
      "MCP restart friction means direct adapter invokers must stay first-class for autonomous development.",
      "Prefer short text plus structuredContent over JSON text dumps for token economics.",
      "Do not make full au-compose support or pixel-perfect au-viewport parity a first-preview blocker.",
      "Do not accept verbose generated Aurelia code as a harmless preview limitation; code quality and token economy are core preview value.",
      "Core observation, common router flows, plugins, and advertised patterns outrank fringe API coverage for the first public MCP cut.",
    ],
    nextQuestions: [
      "Which semantic-runtime query already owns the requested MCP answer?",
      "Is this a stable public tool/resource, or should it stay a direct dev invoker until the semantic-runtime shape settles?",
      "Does a repeated MCP answer pattern indicate a missing semantic-runtime summary query?",
      "Does the MCP client need cache reset or explicit roots/project selection before the next hand-test?",
      "Will this answer help another AI write less, cleaner Aurelia code, or is it exposing breadth without authoring leverage?",
    ],
    relatedRouteIds: [
      "semantic-runtime.authoring-fixture-substrate-loop",
      "semantic-runtime.proxy-observation-domain-modeling",
      "router.viewport.authoring-semantics",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.semantic-contract-verification",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.inquiry-query-claim-graph",
    title: "Semantic Runtime Query Claim Graph",
    summary:
      "Route inquiry-performance work through the formal answer-claim graph before adding API-local caches, eager projections, or transport-owned invalidation.",
    domains: ["semantic-runtime", "inquiry", "api", "performance", "telemetry"],
    roles: ["orient", "analyze", "refactor", "verify", "document", "improve-atlas"],
    terms: [
      "query claim graph",
      "QueryClaimGraph",
      "answer claim graph",
      "claim graph storage",
      "query outcome storage",
      "query outcome claim",
      "lazy answer",
      "answer boundary",
      "query-local products",
      "answer-local products",
      "inquiry profile retention",
      "query retention policy",
      "claim invalidation",
      "claim disposal",
      "source epoch disposal",
      "source epoch invalidation",
      "epoch key",
      "locus key",
      "materialization policy",
      "query-type-projection",
      "projection-only",
      "static-catalog",
      "retained answer",
      "analysis cache overview",
      "answerAppQuery",
      "routed app query",
      "query claim telemetry",
      "MCP orientation retention",
      "LSP cursor retention",
      "inquiry performance",
    ],
    queryCanaries: [
      {
        query: "query claim graph API answer performance",
        summary:
          "Public API answer retention and query-local product pressure should route to the claim graph before API facade refactors.",
      },
      {
        query: "inquiry performance source epoch disposal query-type-projection",
        summary:
          "Source invalidation and TypeChecker projection cleanup should route to graph-owned disposal policy.",
      },
      {
        query: "MCP orientation routed app query claim graph",
        summary:
          "Thin MCP adapters should depend on semantic-runtime routed queries and profile-shaped claim retention.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimGraph",
        role: "primary",
        summary:
          "Answer-boundary storage for lazy query outcomes, retained records, indexed reuse, and disposal policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimNode",
        role: "primary",
        summary:
          "Per-answer lifetime object carrying state, parent/depth, payload shape, kernel deltas, and disposal counts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/runtime.ts",
        symbolName: "SemanticRuntime.answerAppQuery",
        role: "primary",
        summary:
          "Thin public-adapter entrypoint that applies query catalog depth, inquiry profile, app retention, and claim graph routing.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/runtime.ts",
        symbolName: "SemanticApp.ask",
        role: "primary",
        summary:
          "Opened-app query dispatch enters QueryClaimGraph immediately around answer materialization.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-catalog.ts",
        symbolName: "semanticAppQueryCatalogRow",
        role: "grounding",
        summary:
          "App query catalog owns minimum analysis depth and materialization policy for public answer routing.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-identity.ts",
        symbolName: "semanticAppQueryKey",
        role: "grounding",
        summary:
          "App query identity helpers own claim keys, loci, and source/project/workspace epoch keys.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-policy.ts",
        symbolName: "shouldDisposeAppAfterRoutedQuery",
        role: "grounding",
        summary:
          "Routed app query policy owns default inquiry profile, authoring-template opt-in, depth upgrades, and app retention.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/telemetry/inquiry-profile.ts",
        symbolName: "SEMANTIC_RUNTIME_INQUIRY_PROFILES",
        role: "grounding",
        summary:
          "Consumer-shaped latency and retention lanes for CPU/memory trade-off discussion.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/store.ts",
        symbolName: "KernelStore.mark",
        role: "supporting",
        summary:
          "Kernel marks provide answer-local disposal boundaries for query-produced products and sidecars.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry",
        role: "pressure",
        summary:
          "App telemetry prints inquiry-profile query claims, query-side kernel growth, and cache/disposal pressure.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "classes",
        filters: {
          pathPrefix: "packages/semantic-runtime/src/inquiry",
          query: "QueryClaim",
        },
        role: "pressure",
        summary:
          "Product architecture class rows keep claim graph, node, and counter pressure visible.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "inquiry", "api", "performance", "telemetry"],
        role: "grounding",
        summary:
          "Durable memory describes claim graph ownership, retention, indexing, and disposal guidance.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/inquiry/README.md",
        heading: "Query Claims",
        role: "grounding",
        summary:
          "Inquiry docs explain why query claims sit above kernel facts and below public answer serialization.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/api/README.md",
        role: "supporting",
        summary:
          "API docs describe routed app queries, app cache boundaries, and direct facade expectations.",
      },
    ],
    authority: [
      "semantic-runtime inquiry README and QueryClaimGraph source for answer-boundary ownership.",
      "App query catalog for materialization-policy and minimum-depth truth.",
      "Inquiry profiles for CPU/memory retention trade-offs by consumer lane.",
      "App telemetry output for real fixture/external pressure without adding transport-local caches.",
    ],
    cautions: [
      "Do not add MCP, LSP, or script-local answer caches before checking whether QueryClaimGraph should own reuse or disposal.",
      "Keep durable semantic facts in kernel products and claims; query claims own answer shape, query-local projections, and transport-facing retention.",
      "If a query needs more app-world products, update the app-query catalog depth or materialization policy rather than hiding the work in runtime.ts.",
      "Use profile-shaped retention and source/project epoch keys for invalidation; do not parse public query keys in adapters.",
    ],
    nextQuestions: [
      "Is the work about durable app facts or answer-local query outcomes?",
      "Which inquiry profile owns the latency and retention expectation?",
      "Does the app-query catalog declare the right analysis depth and materialization policy?",
      "Should answer-local products be retained, disposed after serialization, or moved into durable kernel products?",
    ],
    relatedRouteIds: [
      "mcp.developer-preview-shell",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.proxy-observation-domain-modeling",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.evaluator.world-construction",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.observation.binding-flow",
    aliases: [
      "semantic-runtime.select-checked-value-channels",
      "select-and-checked-value-channel-drafts",
      "frontier:select-and-checked-value-channel-drafts",
    ],
    title: "Observation And Binding Flow",
    summary:
      "Model binding and observer data flow through framework-shaped concepts before adding more fixture or authoring behavior.",
    domains: ["observation", "binding", "forms", "type-system", "template"],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "observer locator",
      "property binding",
      "ast-evaluator",
      "ast evaluator",
      "astEvaluate",
      "AccessScope",
      "AccessMember",
      "AccessKeyed",
      "connectable observe",
      "IConnectable.observe",
      "expression access dependency",
      "unified observation circuit",
      "active connectable circuit",
      "proxy observable",
      "proxy-observable",
      "ProxyObservable",
      "proxy observable domain modeling",
      "proxy-observable domain model dependency products",
      "domain model dependency products",
      "vanilla state class observation",
      "ordinary composed domain objects",
      "nested collection reads",
      "trackable method",
      "trackable dependency",
      "computed watcher",
      "@computed",
      "computed decorator metadata",
      "computed-decorator",
      "@watch",
      "@astTrack",
      "checked observer",
      "select observer",
      "class binding",
      "style binding",
      "class style binding",
      "binding command",
      "typechecker evaluator",
      "custom tag heuristic",
      "svg heuristic",
      "binding.open-data-flow",
      "binding.open-target-access",
      "binding.open-value-channel",
      "binding source assignment",
      "binding source assignment runtime expression unassignable",
      "target source type mismatch",
      "target-to-source type mismatch",
      "target-to-source-type-mismatch",
      "binding data flow value channel",
      "select value channel",
      "select checked value channel contract",
      "select single option source-to-target",
      "radio source-to-target",
      "option model domain",
      "keyed form source",
      "keyed form binding",
      "array index form binding",
      "record keyed checked binding",
      "directional assignability",
      "AUR0654",
      "binding behavior materializer",
      "runtime binding behavior",
      "validate binding behavior",
      "ValidationController",
      "ValidationController getPropertyInfo",
      "validation property info",
      "validation-html bridge role evidence",
      "AUR4205",
      "AUR4206",
      "binding behavior bind-time scope handoff",
      "binding-expression bind-time",
      "RuntimeBindingExpressionScopeProjector",
      "InterpolationPartBinding",
      "state binding behavior interpolation",
      "framework service customization",
      "source assignment reason fixtures",
      "mixed-form-surfaces",
      "select-single-array-value",
      "runtime expression unassignable",
      "runtime-expression-unassignable",
      "runtime-ast-errors",
      "astAssign",
      "host-access-scope-assignment",
      "nullish-assignment",
      "rejected target access",
      "rejected-target-access",
      "diagnosticReason",
      "node observer strategy",
      "binding source slot",
      "binding-source-slot-no-static-value",
      "RuntimeBoundControllerValueTable",
      "bound controller value flow",
      "bound controller Array.find",
      "Array.find receiver did not reduce to a known array",
      "property method this binding",
      "ObserverLocator function key ComputedObserver",
      "function-key computed observer",
    ],
    queryCanaries: [
      {
        query: "ast-evaluator AccessMember connectable observe",
        summary:
          "Direct expression-read dependency questions should route to framework astEvaluate observation before fixture or VM getter changes.",
      },
      {
        query: "observer locator",
        summary:
          "Observer-locator questions should start from framework-shaped observation, not app-specific heuristics.",
      },
      {
        query: "ObserverLocator getObserver function key ComputedObserver",
        summary:
          "Function-key ObserverLocator questions should route to framework observer selection before computed-decorator or authoring policy changes.",
      },
      {
        query: "proxy-observable domain model dependency products",
        summary:
          "ProxyObservable-shaped dependency products should route to the unified observation/binding flow instead of authoring-local state heuristics.",
      },
      {
        query: "ProxyObservable composed state computed watcher trackable",
        summary:
          "Composed state dependency pressure should ground itself in framework ProxyObservable, astEvaluate, and watcher/trackable connectable semantics.",
      },
      {
        query: "checked observer",
        summary:
          "Checked observer behavior is a high-misunderstanding form value-channel frontier.",
      },
      {
        query: "select observer",
        summary:
          "Select observer behavior needs observation and binding flow grounding before fixture patches.",
      },
      {
        query: "class style binding",
        summary:
          "Class/style binding shapes historically fail through scattered binding-command and observer assumptions.",
      },
      {
        query: "custom tag heuristic",
        summary:
          "Heuristic custom-element detection should route to observation/template semantic grounding.",
      },
      {
        query: "binding.open-value-channel",
        summary:
          "Binding open-seam identifiers from app pressure should route to observation and binding flow.",
      },
      {
        query: "rejected target access",
        summary:
          "Closed framework target-access rejections should route to observation instead of generic open-seam cleanup.",
      },
      {
        query: "RuntimeBoundControllerValueTable bound controller value flow recursive rendering",
        summary:
          "Parent-to-child controller value flow belongs to observation/binding data flow even when recursive rendering exposes it.",
      },
      {
        query: "Array.find receiver did not reduce to a known array bound controller widget kit",
        summary:
          "Array.find receiver gaps on child-bound controller state should route to bound-controller value flow and evaluator semantics before composition-local patches.",
      },
      {
        query: "binding-source-slot-no-static-value",
        summary:
          "Source-slot static value gaps belong to binding data-flow and TypeChecker handoff pressure.",
      },
      {
        query: "binding source assignment runtime expression unassignable target source type mismatch",
        summary:
          "Template assignment diagnostics from app pressure should route to observation/binding flow before local fixes.",
      },
      {
        query: "target-to-source-type-mismatch mixed-form-surfaces select single array value binding data flow value channel",
        summary:
          "Fixture-owner pressure rows for form value-channel assignability should route to observation/binding flow.",
      },
      {
        query: "select checked value channel contract directional assignability AUR0654",
        summary:
          "Select/radio/checked directional value-channel work should route to observation binding-flow and its focused contract.",
      },
      {
        query: "AccessKeyed keyed form source checked select binding data flow",
        summary:
          "Keyed checked/select source writeback belongs to binding data-flow and form observer channels.",
      },
      {
        query: "runtime-expression-unassignable runtime-ast-errors binding source assignment",
        summary:
          "Runtime astAssign source-assignment pressure should route to binding data-flow before API diagnostic wording.",
      },
      {
        query: "ValidationController bridge role evidence validate property info",
        summary:
          "Validation controller property-info and validate binding-behavior questions should route through binding-flow and validation-html framework grounding before bridge evidence is closed.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-binding.ts",
        symbolName: "PropertyBinding",
        role: "primary",
        summary:
          "Framework-shaped binding layer that should own TypeChecker-backed data flow.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/observer-locator.ts",
        symbolName: "ObserverLocator",
        role: "primary",
        summary:
          "Semantic observer-locator mirror for deciding which observer/accessor owns a target.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/runtime-binding-observation.ts",
        symbolName: "RuntimeBindingValueChannelKind",
        role: "supporting",
        summary:
          "Binding value-channel vocabulary includes rejected target-access diagnostics.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/runtime-binding-expression-scope.ts",
        symbolName: "RuntimeBindingExpressionScopeProjector",
        role: "primary",
        summary:
          "Binding-behavior bind-time scope handoff projector used before data-flow and observed-dependency source reads.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-binding-behavior-materializer.ts",
        symbolName: "RuntimeBindingBehaviorMaterializer",
        role: "supporting",
        summary:
          "Binding-behavior bind-time effects consume rendered binding facts and publish binding diagnostics.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/runtime-bound-controller-value.ts",
        symbolName: "RuntimeBoundControllerValueTable",
        role: "supporting",
        summary:
          "Parent-to-child bound controller value table feeds binding-source evaluation across recursive rendering contexts.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:observer-locator-target-access",
        role: "supporting",
        summary:
          "Focused contract for ObserverLocator target access, ComputedObserver targets, and node observer diagnostics.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:select-checked-value-channels",
        role: "supporting",
        summary:
          "Focused contract for checked/select/radio/model/matcher value-channel semantics and directional assignability.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-collection-observation",
        role: "supporting",
        summary:
          "Focused contract for TypeChecker-gated template collection dependency rows and callback-local false-positive rejection.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:runtime-composition-bound-controller",
        role: "supporting",
        summary:
          "Focused contract for broad Constructable AuCompose child values, bound-controller table handoff, and receiver-bound method predicates.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "dependency-circuit",
        filters: {
          circuitRole: "binding-expression-bind-time",
        },
        role: "grounding",
        summary:
          "Framework astBind rows show binding-behavior arguments evaluated without an active connectable before inner expression bind handoff; runtime-html InterpolationPartBinding supplies this path for interpolation holes.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework observation lens should be consulted before changing observer semantics.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "relationships",
        filters: {
          surfaceKind: "computed-decorator",
        },
        role: "grounding",
        summary:
          "@computed metadata handoff belongs to framework observation's computed-decorator surface before binding-flow or authoring policy changes.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkComposition,
        projection: "emulation",
        role: "grounding",
        summary:
          "Framework composition lens exposes AuCompose, CompositionContext, and CompositionController emulation obligations.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRendering,
        projection: "summary",
        role: "grounding",
        summary:
          "Rendering and instruction setup determine where bindings are materialized.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "authoring", "state", "framework-grounding"],
        role: "grounding",
        summary:
          "ProxyObservable domain-modeling memory keeps ordinary template reads and watcher/computed/trackable dependency products in one connectable observation circuit.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "binding", "forms", "template"],
        role: "grounding",
        summary:
          "Durable memory records known pressure around checked/select and class/style binding channels.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "binding", "template", "recursive-rendering"],
        role: "grounding",
        summary:
          "Bound controller value-flow memory belongs to observation/binding data flow before router or template consumers spend it.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "binding", "runtime-html", "framework-errors"],
        role: "supporting",
        summary:
          "Runtime binding-behavior diagnostics should stay attached to binding flow before framework-error projection.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "configuration", "template", "observation", "auLink"],
        role: "supporting",
        summary:
          "Framework service customization memory joins compiler service state with observer-locator service state.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "observation",
        role: "pressure",
        summary:
          "Docs/tests examples expose observation and binding cases users misunderstand.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "binding-target-access",
        role: "grounding",
        summary:
          "Observation work should prove observer/accessor target facts in reopened fixtures.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "binding-value-channel",
        role: "grounding",
        summary:
          "Form and observer channels should connect to value-channel expected effects.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "binding-data-flow",
        role: "grounding",
        summary:
          "Binding-flow work should preserve TypeChecker source-to-target data-flow evidence.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/scripts/contract-select-checked-value-channels.mjs",
        role: "pressure",
        summary:
          "Focused contract for select/checked value-channel domains, directional assignability, matcher rows, and AUR0654.",
      },
    ],
    authority: [
      "Aurelia framework observation, rendering, binding, and attr-mapper source.",
      "semantic-runtime auLink mirrors for observers and binding concepts.",
      "TypeChecker-backed binding flow analysis, with dynamic runtime seams explicit.",
    ],
    cautions: [
      "A custom tag or SVG heuristic inside observation is usually a sign that template/compiler resource semantics are missing.",
      "Observer selection should be semantic and framework-grounded, not borrowed from reconciliation heuristics.",
      "Binding-flow fixes should prefer lower substrate improvements over one-off fixture patches.",
    ],
    nextQuestions: [
      "Which observer/accessor should own this target under framework semantics?",
      "Does the binding layer or rendering materializer own the missing flow?",
      "Which framework tests demonstrate checked/select/class/style edge behavior?",
    ],
    relatedRouteIds: [
      "semantic-runtime.proxy-observation-domain-modeling",
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.type-system.expression-semantics",
    ],
  },
  {
    id: "semantic-runtime.proxy-observation-domain-modeling",
    title: "Proxy Observation Domain Modeling",
    summary:
      "Use Aurelia's integrated astEvaluate/connectable/ProxyObservable circuit to guide clean domain-state authoring, object-vs-ID binding choices, and proxy escape diagnostics.",
    domains: [
      "semantic-runtime",
      "observation",
      "authoring",
      "state",
      "domain-modeling",
      "mcp",
      "testing",
    ],
    roles: ["orient", "analyze", "author", "verify", "refactor", "improve-atlas"],
    terms: [
      "proxy observation",
      "proxy observable",
      "proxy-observable",
      "ProxyObservable",
      "proxy observation domain modeling",
      "proxy-observable domain modeling",
      "proxy observation authoring",
      "proxy observation authoring state fixtures",
      "observation dependency circuit",
      "dependency-circuit observation",
      "domain state observation",
      "domain model observation",
      "connectable observation circuit",
      "active connectable circuit",
      "astEvaluate proxy observable",
      "ast evaluator proxy observable",
      "ordinary template reads",
      "direct DI state binding",
      "direct state member binding",
      "state.member binding",
      "view-model forwarding getter",
      "forwarding getter boilerplate",
      "one-hop forwarding accessor",
      "one-hop forwarding getter",
      "one-hop-forwarding-accessor-pressure",
      "template model access",
      "template-model-access",
      "object binding versus ID binding",
      "object binding vs ID binding",
      "bind to IDs not objects",
      "direct object binding",
      "component object boundary",
      "component-object-boundary",
      "object-shaped bindable",
      "nullable object bindable",
      "effective non-nullable bindable shape",
      "id binding",
      "domain model connectedness",
      "nested collection reads",
      "collection proxy reads",
      "proxy dependency alias",
      "proxy dependency destructuring",
      "TypeChecker collection method discrimination",
      "collection method false positive",
      "string includes proxy collection false positive",
      "plain object get proxy collection false positive",
      "computed watch trackable dependencies",
      "computed decorator metadata",
      "computed-decorator",
      "computed observer dependency",
      "computed-observer-dependency",
      "computed observer source",
      "computed-observer-source",
      "computed-observer-sources",
      "computed-observer-observed-dependencies",
      "ComputedObserverSource",
      "ComputedObserver dependency collection",
      "ControlledComputedObserver dependency handoff",
      "controlled computed observer explicit dependencies",
      "controlled computed string deps",
      "controlled computed function deps",
      "controlled computed deep observation",
      "controlled computed observeDeep",
      "computed deep dependency",
      "deep-property-read",
      "deep-collection-read",
      "@computed @watch ProxyObservable",
      "runtime watcher",
      "runtime watchers",
      "runtime-watchers",
      "runtime watcher observed dependencies",
      "runtime-watcher-observed-dependencies",
      "RuntimeWatcherObservedDependency",
      "proxy-property-read",
      "proxy-collection-read",
      "ComputedWatcher",
      "ExpressionWatcher",
      "definition.watches",
      "Controller.addBinding watcher",
      "IObservation watch",
      "Observation.watch source effect",
      "Observation.run source effect",
      "source-level IObservation.watch",
      "source-level IObservation.run",
      "runtime effects",
      "runtime-effects",
      "runtime effect observed dependencies",
      "runtime-effect-observed-dependencies",
      "connectable-run",
      "observable-property-read",
      "@observable getter reads",
      "effect-owned observed dependency",
      "trackable method dependency",
      "external object proxy escape",
      "external library object proxy escape",
      "proxy exit boundary",
      "proxy-exit-boundary",
      "host object proxy escape",
      "serialization proxy escape",
      "raw proxy escape",
      "proxy exits",
      "unwrap proxy",
      "ProxyObservable.getRaw",
      "ProxyObservable.unwrap",
      "proxy observable escapes",
      "proxy-observable-escapes",
      "observed dependency product",
      "observed dependency source route",
      "member-owner projection",
      "BindingBehavior member owner",
      "ValueConverter member owner",
      "observed dependency semantic identity",
      "runtime observed dependency draft",
      "distinctRuntimeObservedDependencyDrafts",
      "runtime-observed-dependency-draft",
      "observer couplings",
      "observer coupling expected effects",
      "direct state domain methods",
      "direct state domain method calls",
      "ordinary method body boundary",
      "method body dependency boundary",
      "proxy observation semantic contract",
      "proxy observation broad fixture",
      "clean Aurelia code proxy observation",
      "low boilerplate Aurelia observation",
      "low boilerplate app building",
      "Aurelia code economy",
      "code economy",
      "larger app clean code",
      "larger app code economy",
      "direct state domain access",
      "direct state domain binding",
      "MCP clean code observation",
    ],
    queryCanaries: [
      {
        query: "proxy observation domain state ast evaluator connectable observer locator authoring",
        summary:
          "Proxy/domain-state observation should route to its own modeling route before broader binding-flow or fixture routes.",
      },
      {
        query: "object binding versus ID binding proxy observation clean Aurelia code",
        summary:
          "Object-vs-ID binding is authoring taste and domain modeling pressure, not a universal correctness rule.",
      },
      {
        query: "external library object proxy escape raw unwrap ProxyObservable",
        summary:
          "Proxy escape and external-object pressure should route to framework-grounded proxy observation rather than generic diagnostics.",
      },
      {
        query: "computed watch trackable dependencies ProxyObservable nested collection reads",
        summary:
          "Watcher/computed/trackable dependency reads over nested objects and collections should start from the integrated observation circuit.",
      },
      {
        query: "IObservation watch source effect function getter observed dependency",
        summary:
          "Direct Observation.watch/run source effects should route to proxy observation and RuntimeEffect grounding before binding or resource-watch products.",
      },
      {
        query: "one-hop forwarding accessor direct state template binding",
        summary:
          "One-hop state/domain accessors are authoring taste pressure over topology and observation facts, not generic getter or code-style cleanup.",
      },
      {
        query: "larger app building recipe code economy direct state domain",
        summary:
          "Clean-code app-building questions should route to generated recipe pressure and proxy-observation grounding, not only the MCP adapter.",
      },
      {
        query: "component object boundary nullable object bindable direct Product template reads",
        summary:
          "Local object-shaped component input pressure should route to component-interface type surfaces plus binding data-flow, not ID-only recipe policy.",
      },
    ],
    anchors: [
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "dependency-circuit",
        filters: {
          circuitRole: "template-expression-read",
        },
        role: "grounding",
        summary:
          "Framework dependency-circuit rows show ordinary template expression reads feeding the active connectable.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "observer-locator-decisions",
        role: "grounding",
        summary:
          "Framework ObserverLocator decision rows show accessor-descriptor and function-key ComputedObserver branches without a decorator-first shortcut.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "dependency-circuit",
        filters: {
          surfaceKind: "proxy-observable",
        },
        role: "grounding",
        summary:
          "Framework dependency-circuit rows show ProxyObservable wrapping, raw/proxy cache, collection reads, and dependency collection.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "dependency-circuit",
        filters: {
          circuitRole: "watcher-effect-dependency",
        },
        role: "grounding",
        summary:
          "Framework Observation._doWatch rows show string expressions through getExpressionObserver and function getters through ObserverLocator.getObserver.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "relationships",
        filters: {
          surfaceKind: "computed-decorator",
        },
        role: "grounding",
        summary:
          "Framework computed-decorator relationships show @computed metadata handoff to ComputedPropertyInfo, ComputedMethodOptions, astTrackableMethodMarker, and IObserverLocator.getComputedObserver.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "dependency-circuit",
        filters: {
          circuitRole: "computed-observer-dependency",
        },
        role: "grounding",
        summary:
          "Framework dependency-circuit rows show ComputedObserver auto-dependency collection and ControlledComputedObserver explicit dependency handoff.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "flow-sites",
        filters: {
          surfaceKind: "controlled-computed-observer",
        },
        role: "grounding",
        summary:
          "ControlledComputedObserver flow rows show string deps through getExpressionObserver, non-string deps through getObserver, and deep observation through a function-key observer.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "surface-methods",
        filters: {
          surfaceKind: "proxy-observable",
        },
        role: "grounding",
        summary:
          "ProxyObservable surface methods are the first read before modeling proxy entry/exit semantics.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-observation-internals.ts",
        symbolName: "FrameworkObservationSurfaceKind",
        role: "primary",
        summary:
          "Atlas framework observation classifier admits ast-evaluator, proxy-observable, computed-observer, and controlled-computed-observer surfaces.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-binding-observation.ts",
        symbolName: "RuntimeBindingObservedDependency",
        role: "primary",
        summary:
          "Binding-owned observed dependency product detail for source-side template connectable reads.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-effect.ts",
        symbolName: "RuntimeEffect",
        role: "primary",
        summary:
          "Source-level IEffect model for direct Observation.watch(...) and Observation.run(...) effects, distinct from resource watchers and template bindings.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-effect.ts",
        symbolName: "RuntimeEffectObservedDependency",
        role: "primary",
        summary:
          "Effect-owned observed dependency product detail for source-level Observation.watch(...) and Observation.run(...) calls.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-effect-materializer.ts",
        symbolName: "RuntimeEffectMaterializer",
        role: "primary",
        summary:
          "Publication boundary for source-level Observation.watch(...) / Observation.run(...) effects and observed dependencies.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/computed-observation.ts",
        symbolName: "ComputedObservationDefinition",
        role: "primary",
        summary:
          "Source-backed @computed getter/method dependency declaration product, separate from getter observer execution.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/computed-observer-source.ts",
        symbolName: "ComputedObserverSource",
        role: "primary",
        summary:
          "Source-backed ComputedObserver/ControlledComputedObserver product detail for getter observation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/computed-observer-source-materializer.ts",
        symbolName: "ComputedObserverSourceMaterializer",
        role: "primary",
        summary:
          "Publication boundary for getter source-observer products and observed dependency rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-data-flow-materializer.ts",
        symbolName: "RuntimeBindingDataFlowMaterializer",
        role: "primary",
        summary:
          "Binding data-flow publishes observed dependency facts for source-to-target template bindings.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/binding-projections.ts",
        symbolName: "readBindingObservedDependencyRows",
        role: "primary",
        summary:
          "Public binding-observed-dependencies query projection for API/authoring consumers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/observation-projections.ts",
        symbolName: "readComputedObservationDefinitionRows",
        role: "primary",
        summary:
          "Public computed-observation-definitions query projection for valid @computed declaration rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/observation-projections.ts",
        symbolName: "readComputedObserverSourceRows",
        role: "primary",
        summary:
          "Public computed-observer-sources query projection for getter observer execution rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/observation-projections.ts",
        symbolName: "readRuntimeEffectRows",
        role: "primary",
        summary:
          "Public runtime-effects query projection for direct Observation.watch(...) and Observation.run(...) source calls.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/observation-projections.ts",
        symbolName: "readRuntimeEffectObservedDependencyRows",
        role: "primary",
        summary:
          "Public runtime-effect-observed-dependencies query projection for effect-owned dependency rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/runtime-watcher.ts",
        symbolName: "RuntimeWatcher",
        role: "primary",
        summary:
          "Controller-owned ComputedWatcher/ExpressionWatcher product union for accepted resource watch metadata.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/runtime-watcher-factory.ts",
        symbolName: "runtimeWatchersForDefinition",
        role: "primary",
        summary:
          "Runtime watcher creation from resource definition.watches during controller hydration.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/runtime-watcher-publication.ts",
        symbolName: "runtimeWatcherRecordsForController",
        role: "primary",
        summary:
          "Runtime watcher binding identity, materialization, and controller ownership publication.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-watcher-observation.ts",
        symbolName: "RuntimeWatcherObservedDependency",
        role: "primary",
        summary:
          "Watcher-owned observed dependency product detail for ExpressionWatcher astEvaluate execution rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/connectable-observed-dependency.ts",
        symbolName: "collectRuntimeConnectableObservedDependencyDrafts",
        role: "primary",
        summary:
          "Shared astEvaluate/connectable dependency collector used by binding data-flow and ExpressionWatcher products, with caller-owned collection-read policy for runtime array receivers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/proxy-observable-dependency.ts",
        symbolName: "ProxyObservable",
        role: "primary",
        summary:
          "auLink-backed semantic ProxyObservable surface with the TypeScript-body dependency collector for computed watcher property, TypeChecker-discriminated collection, iterator, trackable-method, and simple alias/destructuring reads.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/proxy-observable-dependency.ts",
        symbolName: "RuntimeProxyObservedDependencyDraftCollector",
        role: "primary",
        summary:
          "Collector state for root names, local aliases, TypeChecker receiver checks, property reads, and collection callbacks in computed watcher proxy dependency functions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/trackable-method-observed-dependency.ts",
        symbolName: "collectRuntimeTrackableMethodObservedDependencyDrafts",
        role: "primary",
        summary:
          "Binding-owned @computed/@astTrack method-call dependency collector for observed astEvaluate expressions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-observed-dependency-draft.ts",
        symbolName: "distinctRuntimeObservedDependencyDrafts",
        role: "primary",
        summary:
          "Shared semantic-identity dedupe for binding, watcher, computed-observer, proxy, and trackable observed-dependency drafts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/controller-projections.ts",
        symbolName: "readRuntimeWatcherObservedDependencyRows",
        role: "primary",
        summary:
          "Public runtime-watcher-observed-dependencies query projection for API/authoring consumers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/controller-projections.ts",
        symbolName: "readRuntimeWatcherRows",
        role: "primary",
        summary:
          "Public runtime-watchers query projection for API/authoring consumers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
        symbolName: "RuntimeBindingSourceValueEvaluator",
        role: "primary",
        summary:
          "Binding source evaluation is the runtime-shaped handoff for expression reads under controller/scope context.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-topology.ts",
        symbolName: "directInjectionServiceInteractionBindingRowsForDataFlow",
        role: "supporting",
        summary:
          "Direct DI state/service template bindings should stay visible without forcing forwarding getters.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/authoring-orientation.ts",
        symbolName: "templateModelAccessValues",
        role: "supporting",
        summary:
          "Authoring orientation reports direct state/domain template access, plain getter observation, and template-read source-proven one-hop forwarding accessor pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/expression-type-evaluator.ts",
        symbolName: "CheckerExpressionTypeEvaluator",
        role: "supporting",
        summary:
          "TypeChecker expression semantics are adjacent when observed dependencies need member/collection shape facts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/expression-member-owner-projector.ts",
        symbolName: "CheckerExpressionMemberOwnerProjector",
        role: "supporting",
        summary:
          "Offset-aware owner projection keeps binding-observed-dependency and cursor/member inquiries aligned through wrappers such as BindingBehavior and ValueConverter.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "authoring", "state", "framework-grounding"],
        role: "grounding",
        summary:
          "ProxyObservable domain-modeling memory records the integrated astEvaluate/ProxyObservable observation circuit.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "application", "authoring", "observation", "fixtures", "topology"],
        role: "grounding",
        summary:
          "Direct DI state template-binding memory keeps state.member bindings as topology facts without VM forwarding getters.",
      },
      {
        kind: "memory",
        domains: ["mcp", "authoring", "token-economy", "observation", "router"],
        role: "grounding",
        summary:
          "MCP preview memory ties observation semantics to clean, low-boilerplate Aurelia guidance.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "observation",
        seedUse: "authoring-taste",
        role: "pressure",
        summary:
          "Docs-promoted observation snippets can seed recommendable low-boilerplate authoring fixtures.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "observation",
        seedUse: "behavior-grounding",
        role: "pressure",
        summary:
          "Framework-test observation snippets can seed behavior-grounding and contrastive semantic contracts.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "binding-data-flow",
        role: "grounding",
        summary:
          "Observed dependency products should connect to binding data-flow facts where template reads drive them.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/watcher-proxy-dependencies",
        role: "pressure",
        summary:
          "Pressure fixture for direct-chain, alias/destructuring, and non-collection method boundary ComputedWatcher ProxyObservable dependency rows.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/trackable-method-dependencies",
        role: "pressure",
        summary:
          "Pressure fixture for binding-owned @computed/@astTrack trackable method dependency rows and explicit-vs-proxy execution.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/computed-decorator-contexts",
        role: "pressure",
        summary:
          "Pressure fixture for valid @computed declarations, plain getter-descriptor ComputedObserver rows, and first controlled-computed deep rows.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/template-collection-observation",
        role: "pressure",
        summary:
          "Pressure fixture for astEvaluate array collection reads versus string/object/callback-local method false positives.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/one-hop-forwarding-accessor",
        role: "pressure",
        summary:
          "Contrastive pressure fixture for a component getter that only forwards an injected state member beside direct state template binding.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/component-object-boundary",
        role: "pressure",
        summary:
          "Pressure fixture for local object-shaped component bindables, direct product-domain template reads, and nullable effective type surfaces.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/source-observation-effects",
        role: "pressure",
        summary:
          "Pressure fixture for direct Observation.watch/run source effects and effect-owned observed-dependency rows.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/proxy-observable-escapes",
        role: "pressure",
        summary:
          "Pressure fixture for neutral source-level ProxyObservable getRaw/unwrap escape rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/type-surface.ts",
        symbolName: "readCheckerReferenceSurface",
        role: "supporting",
        summary:
          "API type-surface projection that preserves declared nullable unions while exposing effective non-nullable object shapes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/proxy-observable-escape.ts",
        symbolName: "ProxyObservableEscape",
        role: "primary",
        summary:
          "Source-level product for direct ProxyObservable getRaw/unwrap proxy-exit facts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/proxy-observable-escape-materializer.ts",
        symbolName: "ProxyObservableEscapeMaterializer",
        role: "primary",
        summary:
          "Import-aware materializer for source-level ProxyObservable getRaw/unwrap calls.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:computed-observer-source",
        role: "pressure",
        summary:
          "Focused semantic contract for ComputedObserverSource, ControlledComputedObserver, dependency-literal provenance, and controlled-computed deep rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:one-hop-forwarding-accessor",
        role: "pressure",
        summary:
          "Focused semantic contract for template-model-access one-hop forwarding accessor pressure.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:component-object-boundary",
        role: "pressure",
        summary:
          "Focused semantic contract for local object component handoff, effective bindable type surfaces, and direct object member observation.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-collection-observation",
        role: "pressure",
        summary:
          "Focused semantic contract for TypeChecker-gated template collection dependency rows and callback-local false-positive rejection.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:runtime-effect-observation",
        role: "pressure",
        summary:
          "Focused semantic contract for source-level Observation.watch/run effects and observed-dependency rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:proxy-observable-escapes",
        role: "pressure",
        summary:
          "Focused semantic contract for source-level ProxyObservable getRaw/unwrap escape rows.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/observation/README.md",
        heading: "Proxy Observation",
        role: "grounding",
        summary:
          "Semantic-runtime observation docs describe ProxyObservable as part of the same circuit as ordinary binding reads.",
      },
      {
        kind: "doc",
        path: ".temp/proxy-observation-authoring-substrate-run-2026-05-18.md",
        role: "grounding",
        summary:
          "Scratch run scaffold capturing object-vs-ID binding, proxy escape, and broad fixture pressure.",
      },
    ],
    authority: [
      "Aurelia framework observation flow sites for astEvaluate, ProxyObservable, connectables, watchers, and collection observers.",
      "semantic-runtime observation data-flow and binding-source evaluation products for actual app facts.",
      "Authoring taste and MCP token-economy decisions for clean-code guidance.",
      "Semantic contract fixtures only after the product facts are modeled; avoid snapshots as the authority.",
    ],
    cautions: [
      "Do not turn ID binding into universal truth; direct object binding can be appropriate when the domain model and view model are intentionally close.",
      "Do not use ProxyObservable as a reason to add view-model forwarding getters for ordinary state.member template reads.",
      "Keep observed-dependency rows product-owned: binding data-flow owns source-to-target binding reads; computed-observation definitions own source declarations; ComputedObserverSource owns getter source-observer availability/projection; RuntimeEffect owns direct Observation.watch/run source-call reads; runtime watchers own controller watcher admission; ExpressionWatcher owns string-expression watcher reads; ComputedWatcher owns first ProxyObservable dependency reads; binding-owned trackable method calls own @computed/@astTrack method dependency rows.",
      "Do not collapse source-level Observation.watch/run effects into resource @watch metadata or renderer-owned binding rows; they are source-call IEffect products.",
      "Controlled-computed deep rows are source-observer-owned TypeChecker projections of observeDeep, not live object graph traversal and not binding-owned template reads.",
      "Observed-dependency rows should dedupe repeated reads by semantic dependency identity rather than parser span; preserve source spans as evidence, not as row identity.",
      "When TypeChecker receiver facts are available, collection-call proxy rows should be array/map/set-shaped. String and plain object methods are property-read pressure, not collection dependency rows.",
      "External-library and host-owned objects may need raw/unwrapped or non-proxied handling; model the escape as a framework-grounded concern, not as generic object-binding failure.",
      "ProxyObservable getRaw/unwrap rows are neutral source facts. Do not promote them into diagnostics or authoring recommendations without an explicit policy question.",
    ],
    nextQuestions: [
      "Which framework flow-site shows this dependency entering or leaving the connectable/proxy observation circuit?",
      "Is the app question about ordinary template binding data-flow, watcher/computed/trackable dependency capture, or authoring taste?",
      "Does the question need the public binding-observed-dependencies rows, or lower-level framework observation lenses before changing product semantics?",
      "Does the question need public runtime-effects rows for direct Observation.watch/run source calls, public proxy-observable-escapes rows for ProxyObservable getRaw/unwrap calls, public runtime-watchers rows for controller-owned @watch/static watch admission, runtime-watcher-observed-dependencies for ExpressionWatcher or first ComputedWatcher ProxyObservable reads, binding-observed-dependencies for @computed/@astTrack method calls, or computed-observer-sources for getter source-observer availability/projection?",
      "Would object binding, ID binding, or direct DI state binding produce the least boilerplate while preserving scalability for this domain?",
      "Would a dedicated broad fixture replace repeated external probing for this pattern?",
    ],
    relatedRouteIds: [
      "semantic-runtime.observation.binding-flow",
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.semantic-contract-verification",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.inquiry-query-claim-graph",
      "mcp.developer-preview-shell",
      "atlas.framework-corpus.navigation",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.template-compiler-world",
    title: "Template Compiler World",
    summary:
      "Route template compiler-world construction, syntax catalogs, value-site lowering, authoring compiler worlds, and compiler issue publication before rendering/controller recursion consumes the compiled products.",
    domains: [
      "semantic-runtime",
      "template",
      "compiler-world",
      "compiler",
      "resources",
      "binding",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "template compiler world",
      "compiler-world",
      "compiler world materializer",
      "template compiler-world materializer",
      "template authoring compiler world",
      "authoring compiler world",
      "template compilation project pass",
      "template compilation unit",
      "compilation unit materializer",
      "built in syntax catalog",
      "built-in syntax catalog",
      "syntax catalog materializer",
      "attribute syntax materializer",
      "template value site",
      "value site materializer",
      "binding command lowering materializer",
      "runtime spread binding",
      "compileSpread",
      "spread compile host",
      "runtime renderer catalog",
      "framework service customization",
      "compiler issue publication",
      "TemplateCompilerIssue",
      "compiler-world construction",
    ],
    queryCanaries: [
      {
        query: "template compiler world materializer",
        summary:
          "Compiler-world materialization should not route ambiguously through resource/style or recursive rendering alone.",
      },
      {
        query: "template authoring compiler world",
        summary:
          "Standalone authoring compiler worlds are compiler-world substrate pressure, not generic authoring fixture pressure.",
      },
      {
        query: "built in syntax catalog materializer",
        summary:
          "Framework-owned syntax catalog pressure should start from compiler-world construction.",
      },
      {
        query: "template value site binding command lowering",
        summary:
          "Value-site and command-lowering work belongs to compiler-world/lowering before observation consumes value channels.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/compiler-world-materializer.ts",
        symbolName: "TemplateCompilerWorldMaterializer",
        role: "primary",
        summary:
          "Primary compiler-world construction surface for configured resources, syntax, renderers, and compiler services.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-authoring-world.ts",
        symbolName: "TemplateAuthoringCompilerWorldMaterializer",
        role: "primary",
        summary:
          "Standalone RuntimeHtml compiler-world construction used by authoring, resource-library, and cursor-locus contexts.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-compilation-project-pass.ts",
        symbolName: "TemplateCompilationProjectPass",
        role: "primary",
        summary:
          "Project-level pass that wires compiler worlds, parsing/lowering, compiled-template assembly, authoring templates, and runtime analysis.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/compilation-unit-materializer.ts",
        symbolName: "TemplateCompilationUnitMaterializer",
        role: "supporting",
        summary:
          "Compilation-unit materializer publishes the compiler-front-door products that parsing and lowering consume.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/built-in-syntax-catalog-materializer.ts",
        symbolName: "BuiltInSyntaxCatalogMaterializer",
        role: "supporting",
        summary:
          "Framework-owned syntax catalogs become compiler-world-visible binding commands and attribute patterns here.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/attribute-syntax-materializer.ts",
        symbolName: "AttributeSyntaxMaterializer",
        role: "supporting",
        summary:
          "Runtime-shaped attribute syntax and classification feed command lowering and compiler issue publication.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/value-site-materializer.ts",
        symbolName: "TemplateValueSiteMaterializer",
        role: "supporting",
        summary:
          "Value-site lowering provides the authored template locations consumed by binding flow and diagnostics.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/binding-command-lowering-materializer.ts",
        symbolName: "BindingCommandLoweringMaterializer",
        role: "supporting",
        summary:
          "Command-bearing attribute lowering belongs in the compiler-world/lowering lane before rendered bindings consume it.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-spread-binding-creator.ts",
        symbolName: "RuntimeSpreadBindingCreator",
        role: "supporting",
        summary:
          "Semantic SpreadBinding.create counterpart that admits captured attributes into runtime compileSpread.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-spread-compile-host.ts",
        symbolName: "RuntimeTemplateCompilerSpreadCompileHost",
        role: "supporting",
        summary:
          "Runtime compileSpread host and captured-attribute compiler-world handoff.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-renderer-catalog-materializer.ts",
        symbolName: "BuiltInRuntimeRendererCatalogMaterializer",
        role: "supporting",
        summary:
          "Framework-owned runtime renderer catalog materialization before compiler-world visibility.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-renderer-catalog-materializer.ts",
        symbolName: "ConfiguredBuiltInRuntimeRendererCatalogMaterializer",
        role: "supporting",
        summary:
          "Configured renderer catalog selection admitted by framework registrations.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/template/",
        role: "pressure",
        summary:
          "Template compiler-world and lowering work lives in the template package before observation/rendering consumption.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCompiler,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework compiler lens grounds instruction production, attribute classification, and compiler issue behavior.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkResources,
        projection: "convergence",
        role: "grounding",
        summary:
          "Framework resource convergence decides what compiler-world resource catalogs should expose.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRendering,
        projection: "summary",
        role: "supporting",
        summary:
          "Rendering consumes compiler products; consult it when a compiler-world question crosses into controller/rendering effects.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "compiler-world", "resources"],
        role: "grounding",
        summary:
          "Durable memory tracks compiler-world, resource, syntax, and authoring-world pressure.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "compiler", "binding"],
        role: "grounding",
        summary:
          "Durable memory tracks command lowering, value-site, and compiler issue publication pressure.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "compiler", "rendering", "spread"],
        role: "grounding",
        summary:
          "Spread compile-host memory belongs to compiler-world/lowering before renderer shortcuts are added.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "rendering", "compiler-world", "configuration"],
        role: "grounding",
        summary:
          "Runtime renderer catalog memory belongs to compiler-world visibility before individual renderers consume it.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "configuration", "template", "observation", "auLink"],
        role: "supporting",
        summary:
          "Framework service customization memory includes compiler-world service state such as AttrMapper.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "template-compilation",
        role: "grounding",
        summary:
          "Compiler-world and lowering changes should remain connected to template-compilation expected effects.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "templates",
        effectKind: "template-compilation",
        seedUse: "behavior-grounding",
        role: "pressure",
        summary:
          "Framework tests provide behavior-grounded template compilation seeds before local fixture invention.",
      },
    ],
    authority: [
      "Aurelia framework compiler, resource, and rendering lenses before product-local lowering changes.",
      "semantic-runtime compiler-world construction and template compilation project pass source anchors.",
      "Expected template-compilation effects for fixture and diagnostic closure.",
    ],
    cautions: [
      "Do not let compiler-world pressure disappear into recursive rendering, resource convergence, or authoring fixture routes just because all three consume compiler products.",
      "If a template inquiry does not need the full compiler world, treat that as inquiry-algebra pressure rather than duplicating partial compiler state.",
      "Compiler issue products should keep exact framework error authority instead of reopening generic API-local wording checks.",
    ],
    nextQuestions: [
      "Is the pressure compiler-world construction, standalone authoring world construction, value-site lowering, binding-command lowering, or rendered consumption?",
      "Which framework compiler/resource/rendering lane grounds the product change?",
      "Does this need a narrower inquiry over existing compiler-world products instead of a new materializer path?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.resource-definition-convergence",
      "semantic-runtime.resource-style-dependencies",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.expression-parser-completion",
      "semantic-runtime.evaluator.world-construction",
      "authoring.forms.fixture-flywheel",
    ],
  },
  {
    id: "semantic-runtime.template-html-parsing",
    title: "Template Html Parsing",
    summary:
      "Route raw template HTML scanning, parse-tree materialization, recovery spans, and parser-owned provenance before compiler-world lowering or expression parsing consumes the result.",
    domains: ["semantic-runtime", "template", "parser", "html", "provenance"],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "html parse materializer",
      "HtmlParseMaterializer",
      "HtmlParseTreeMaterializer",
      "HtmlScanner",
      "template html parse",
      "template parse tree",
      "html scanner",
      "malformed-looking valid interpolation",
      "template markup recovery",
      "element text comment spans",
      "template source maps",
      "html provenance",
    ],
    queryCanaries: [
      {
        query: "HtmlParseMaterializer HtmlScanner template parse tree provenance",
        summary:
          "Template HTML parsing should route to the parser/provenance substrate before compiler or completion work.",
      },
      {
        query: "malformed looking valid interpolation html scanner",
        summary:
          "Interpolation-heavy HTML that only looks malformed should start from the HTML scanner/recovery boundary.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/html-parse-materializer.ts",
        symbolName: "HtmlParseMaterializer",
        role: "primary",
        summary:
          "Template HTML parse front door before attribute syntax and compiler lowering.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/html-parse-materializer.ts",
        symbolName: "HtmlParseTreeMaterializer",
        role: "primary",
        summary:
          "Parse-tree materialization companion that owns element/text/comment spans and recovery products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/html-parse-materializer.ts",
        symbolName: "HtmlScanner",
        role: "supporting",
        summary:
          "Raw scanner companion for template markup and interpolation boundary recovery.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCompiler,
        projection: "attribute-classification",
        role: "grounding",
        summary:
          "Framework compiler attribute-classification should be checked after parse recovery but before local lowering changes.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "parser", "html", "provenance"],
        role: "grounding",
        summary:
          "Durable memory tracks the HTML scanner/materializer frontier and its exact provenance pressure.",
      },
    ],
    authority: [
      "semantic-runtime HTML parse materializers and scanner source spans.",
      "Aurelia framework compiler attribute-classification once parsed attributes exist.",
      "Parser-owned provenance rather than broad carrier/header fallbacks.",
    ],
    cautions: [
      "Keep raw HTML scanning and parse-tree materialization distinct from attribute syntax parsing, expression parsing, and compiled-template assembly.",
      "Treat broad source spans from this phase as accidental until exact provenance has been checked.",
      "Do not fix interpolation-heavy markup by making expression parser EOF behavior more permissive when HTML boundary recovery owns the problem.",
    ],
    nextQuestions: [
      "Is the pressure raw markup scanning, parse-tree materialization, source mapping, or downstream attribute/expression lowering?",
      "Does the source span point at the exact HTML node/attribute or only a broad parse carrier?",
      "Which framework compiler classification consumes the parsed shape?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-compiler-world",
      "semantic-runtime.expression-parser-completion",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.kernel-publication.provenance",
    ],
  },
  {
    id: "semantic-runtime.template-recursive-rendering",
    title: "Template Recursive Rendering",
    summary:
      "Route work that needs nested template-controller scopes, controller semantics, hydration/materialization, and TypeChecker context handoff.",
    domains: [
      "template",
      "rendering",
      "controller",
      "composition",
      "type-system",
      "hydration",
    ],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "recursive rendering",
      "template controller",
      "template controller cardinality",
      "controller semantics",
      "hydration",
      "compiled template",
      "repeat for",
      "repeat value carrier",
      "repeat static value",
      "runtime scope value carrier",
      "BindingContext local item",
      "TemplateControllerScopeMaterializer",
      "TemplateControllerFlowScopeMaterializer",
      "recursive hydration repeat value",
      "if else",
      "if else controller",
      "if bind",
      "else controller",
      "promise controller",
      "promise result controller",
      "promise result link hook",
      "promise pending then catch",
      "promise invalid usage",
      "au-compose",
      "AuCompose",
      "dynamic composition",
      "runtime composition",
      "CompositionContext",
      "CompositionController",
      "runtime composition materializer",
      "RuntimeCompositionMaterializer",
      "composition controller hydration",
      "composed controller hydration",
      "dynamic component composition",
      "composed dashboard",
      "activate model handoff",
      "activation model handoff",
      "renderingContextKind",
      "definition-resource",
      "recursive-resource-instance",
      "definition-local resource analysis",
      "bound controller Array.find",
      "Array.find receiver did not reduce to a known array",
      "property method this binding",
      "rendered instruction recorder",
      "runtime rendered instruction",
      "pending then catch invalid usage",
      "child container materializer",
      "ContainerChildMaterializer",
      "nested scope",
      "typechecker context",
    ],
    queryCanaries: [
      {
        query: "recursive hydration",
        summary:
          "Recursive hydration should keep routing to controller semantics rather than pretending hydration is absent.",
      },
      {
        query: "template controller cardinality",
        summary:
          "Cardinality is the controller-semantics bridge for nested template-controller scopes.",
      },
      {
        query: "if else controller",
        summary:
          "If/else control-flow phrasing should land on template-controller semantics.",
      },
      {
        query: "repeat for",
        summary:
          "Repeat syntax pressure should start from recursive rendering and TypeChecker child-scope handoff.",
      },
      {
        query: "recursive hydration repeat value",
        summary:
          "Repeat-local value carriers belong with template-controller scope semantics, not router-specific href patching.",
      },
      {
        query: "TemplateControllerScopeMaterializer recursive rendering",
        summary:
          "The live template-controller scope frontier should route directly to recursive rendering.",
      },
      {
        query: "ContainerChildMaterializer controller recursive rendering",
        summary:
          "Runtime-created child-container pressure at controller boundaries should route to recursive rendering before local DI patches.",
      },
      {
        query: "promise pending then catch invalid usage",
        summary:
          "Promise-result controller link-hook pressure should route to template recursive rendering and controller semantics.",
      },
      {
        query: "au-compose dynamic composition recursive composed controller hydration",
        summary:
          "AuCompose dynamic component composition should route to the runtime composition and recursive controller-hydration frontier.",
      },
      {
        query: "RuntimeCompositionMaterializer CompositionContext CompositionController",
        summary:
          "Runtime composition product work should route through the existing composition materializer instead of ad hoc API logic.",
      },
      {
        query: "AuCompose bound controller Array.find property method this binding",
        summary:
          "Broad child component values should reopen bound-controller value flow and evaluator call semantics, not AuCompose-only candidate heuristics.",
      },
      {
        query: "runtime composition renderingContextKind definition-resource recursive-resource-instance",
        summary:
          "Runtime composition context-kind pressure should distinguish public resource definition analysis from recursive parent-supplied use-site rows.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/compiled-template-materializer.ts",
        symbolName: "CompiledTemplateMaterializer",
        role: "primary",
        summary:
          "Materializer pressure point for recursive controller and binding materialization.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-semantics.ts",
        role: "primary",
        summary:
          "Intermediate controller semantics should carry cardinality and scope facts into TypeChecker projections.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "TemplateControllerScopeMaterializer",
        role: "primary",
        summary:
          "Template-controller scope materializer owns nested control-flow scope construction for recursive rendering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-flow-scope-materializer.ts",
        symbolName: "TemplateControllerFlowScopeMaterializer",
        role: "supporting",
        summary:
          "Flow-scope materializer carries branch-local controller scope effects into nested rendering contexts.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-materializer.ts",
        symbolName: "RuntimeCompositionMaterializer",
        role: "primary",
        summary:
          "AuCompose dynamic composition materializer owns CompositionContext/CompositionController rows after bind and data-flow facts exist.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/runtime-composition.ts",
        symbolName: "CompositionController",
        role: "primary",
        summary:
          "Runtime composition product model records component candidates, compiled templates, and activation model handoff.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/composition-projections.ts",
        symbolName: "readRuntimeCompositionRows",
        role: "supporting",
        summary:
          "Public API projection for runtime composition rows and aggregate authoring pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/runtime-bound-controller-value.ts",
        symbolName: "RuntimeBoundControllerValueTable",
        role: "supporting",
        summary:
          "Parent-to-child bound controller value table feeds child resource analysis and runtime composition binding-source evaluation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/evaluator.ts",
        symbolName: "evaluateCallExpression",
        role: "supporting",
        summary:
          "Static evaluator call semantics include receiver-bound property method calls needed by child component predicates.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/binding-command-lowering-publication.ts",
        symbolName: "BindingCommandLoweringPublisher",
        role: "supporting",
        summary:
          "Instruction/binding lowering pressure joins compiler output to semantic binding objects.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/repeat-static-value.ts",
        role: "supporting",
        summary:
          "Repeat-local evaluator value carriers preserve Aurelia BindingContext(local, item) semantics for static collection sources.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-controller-creation-materializer.ts",
        symbolName: "RuntimeControllerCreationMaterializer",
        role: "supporting",
        summary:
          "Controller creation materializer owns link-hook diagnostics such as orphan promise result controllers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/di/container-materializer.ts",
        symbolName: "ContainerChildMaterializer",
        role: "supporting",
        summary:
          "Runtime-created child containers are part of controller creation and recursive hydration boundaries.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-rendered-instruction-recorder.ts",
        symbolName: "RuntimeRenderedInstructionRecorder",
        role: "supporting",
        summary:
          "Renderer-output publication into runtime bindings, target operations, scope effects, and claims.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRendering,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework rendering lens maps renderers, controllers, and binding setup.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkLifecycle,
        projection: "summary",
        role: "grounding",
        summary:
          "Lifecycle/controller phases shape how recursive hydration should be described.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "rendering", "controller", "hydration"],
        role: "grounding",
        summary:
          "Memory preserves prior steering around recursive hydration and controller semantics.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "controller", "recursive-rendering"],
        role: "grounding",
        summary:
          "Template-controller scope materialization memory belongs to recursive rendering before TypeChecker projection.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "composition", "controller", "binding", "type-system"],
        role: "grounding",
        summary:
          "Runtime composition memory belongs to recursive rendering when AuCompose candidate resolution or composed child hydration is touched.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/au-compose-dynamic-composition",
        role: "pressure",
        summary:
          "Stress fixture for docs-shaped AuCompose dynamic component candidates and child-bound broad Constructable values.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:runtime-composition-bound-controller",
        role: "supporting",
        summary:
          "Focused contract for bound controller values feeding AuCompose component/model resolution through a child custom element.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/authoring/generated-composed-dashboard",
        role: "pressure",
        summary:
          "Generated authoring fixture for recommendable dynamic component composition.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/authoring/composed-dashboard",
        role: "supporting",
        summary:
          "Authoring recipe/source-plan files that generate the composed dashboard pressure fixture.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "di", "controller", "recursive-rendering"],
        role: "supporting",
        summary:
          "Child-container materialization memory belongs to controller recursive rendering at runtime-created boundaries.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "rendering", "binding", "kernel-publication"],
        role: "supporting",
        summary:
          "Rendered instruction recorder memory belongs to rendering/controller consequences before publication cleanup.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "templates",
        effectKind: "runtime-controller",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework tests with template/controller runtime effects should seed recursive rendering work before local fixture invention.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "templates",
        effectKind: "template-compilation",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Compiled-template fixture seeds ground recursive rendering changes in real framework template behavior.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "runtime-controller",
        role: "grounding",
        summary:
          "Recursive rendering should prove runtime controller/hydration facts when it reaches fixtures.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "template-compilation",
        role: "grounding",
        summary:
          "Template recursion and controller semantics should remain connected to compiled-template analysis effects.",
      },
    ],
    authority: [
      "Aurelia framework controller, renderer, and lifecycle interfaces.",
      "semantic-runtime template materialization and controller-semantics abstractions.",
      "TypeChecker-backed context synthesis for user view-model state.",
    ],
    cautions: [
      "Do not pretend hydration is absent; the current model already emulates non-recursive hydration.",
      "Recursive rendering is gated by runtime-dependent view-model state, so controller semantics must model cardinality and scope boundaries.",
      "Do not treat AuCompose candidate resolution as proof of recursive composed child hydration or lifecycle state.",
      "Split large controller-like surfaces only along framework interfaces when that increases clarity.",
    ],
    nextQuestions: [
      "Which nested scope facts need to be carried from template-controller semantics into TypeChecker evaluation?",
      "Is the composition question candidate resolution, activation model handoff, composed child rendering, or lifecycle run/deactivate state?",
      "Which materializer step owns recursive descent for a known built-in controller?",
      "Which framework lifecycle/controller surfaces provide the right split points?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-compiler-world",
      "semantic-runtime.binding-scope",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.resource-style-dependencies",
      "semantic-runtime.type-system.expression-semantics",
      "router.viewport.authoring-semantics",
      "semantic-runtime.evaluator.world-construction",
    ],
  },
  {
    id: "semantic-runtime.binding-scope",
    title: "Binding Scope",
    summary:
      "Route runtime BindingScope, BindingContext, OverrideContext, Scope lookup, slot projection, and template-visible symbol handoffs before feature-local lookup logic is added.",
    domains: ["semantic-runtime", "configuration", "binding", "scope", "type-system", "template"],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "binding scope",
      "BindingScope",
      "BindingContext",
      "OverrideContext",
      "runtime scope",
      "Scope product",
      "scope lookup",
      "BindingScopeMaterializer",
      "BindingScopeLocatedLookup",
      "template visible names",
      "template scope type projector",
      "TemplateScopeTypeProjector",
      "template locals",
      "$parent",
      "$this",
      "scope slot projection",
      "runtime binding context",
    ],
    queryCanaries: [
      {
        query: "BindingScope BindingContext OverrideContext scope lookup template visible names",
        summary:
          "Runtime scope and template-visible symbol questions should start from the binding-scope substrate.",
      },
      {
        query: "BindingScopeMaterializer TemplateScopeTypeProjector slot projection",
        summary:
          "Scope materialization and checker projection should route together before cursor or diagnostic-local lookup is added.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/scope-materializer.ts",
        symbolName: "BindingScopeMaterializer",
        role: "primary",
        summary:
          "Runtime binding-scope materializer for BindingContext, OverrideContext, Scope products, and slot projection.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/scope.ts",
        symbolName: "BindingScope",
        role: "primary",
        summary:
          "Runtime Scope semantic model and lookup surface for template-visible names.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/scope.ts",
        symbolName: "BindingContext",
        role: "supporting",
        summary:
          "Framework-shaped binding context model used by rendered binding lookup.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/scope.ts",
        symbolName: "OverrideContext",
        role: "supporting",
        summary:
          "Framework-shaped override context model for parent/local boundary lookup.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-scope-type-projector.ts",
        symbolName: "TemplateScopeTypeProjector",
        role: "supporting",
        summary:
          "Checker-backed bridge from runtime binding scopes to template-visible TypeScript symbols.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/scope-api-issues.ts",
        symbolName: "ScopeApiIssueMaterializer",
        role: "supporting",
        summary:
          "Source/API diagnostics for direct runtime Scope calls with nullish arguments.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "configuration", "template", "type-system", "binding"],
        role: "grounding",
        summary:
          "BindingScopeMaterializer memory should route to scope ownership before local expression lookup grows.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "configuration", "binding", "scope", "type-system"],
        role: "grounding",
        summary:
          "BindingScope, BindingContext, and OverrideContext shape memory belongs to the binding-scope substrate.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "type-system", "binding", "controller"],
        role: "supporting",
        summary:
          "Template scope projection memory joins runtime scope products to checker-visible template names.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkLifecycle,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework lifecycle/controller phases ground when scopes are available to rendered bindings.",
      },
    ],
    authority: [
      "semantic-runtime runtime Scope, BindingContext, and OverrideContext models.",
      "BindingScopeMaterializer and TemplateScopeTypeProjector for product-to-checker handoff.",
      "Framework runtime Scope behavior and lifecycle timing.",
    ],
    cautions: [
      "Keep runtime binding scope distinct from compiler resource scope and template-controller flow scope.",
      "Use BindingScope lookup/locate products instead of reimplementing parent, override, or boundary traversal locally.",
      "When an inquiry needs partial scope data, add a scope projection rather than materializing feature-local scope objects.",
    ],
    nextQuestions: [
      "Does the feature need runtime scope products, checker-visible template symbols, or branch/template-controller overlays?",
      "Is the lookup consumer reference-shaped or does it need a concrete located Scope/context?",
      "Which scope product already carries the fact the inquiry or materializer wants?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.evaluator.world-construction",
    ],
  },
  {
    id: "semantic-runtime.expression-parser-completion",
    title: "Expression Parser Completion",
    summary:
      "Route completed-input parsing, expression corridors, interpolation-hole boundary lookahead, and completion-parser recovery without adding autocomplete-local parser forks.",
    domains: [
      "semantic-runtime",
      "expression",
      "parser",
      "completion",
      "lsp",
      "template",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "CompletedInputParser",
      "completed input parser",
      "completed input parser corridors",
      "completed-input parser and corridors",
      "completed input parser corridors interpolation EOF",
      "completed input corridors",
      "completion parser",
      "expression completion parser",
      "parser corridor",
      "parser corridors",
      "template completion cursor context",
      "expected-empty plain HTML attribute value",
      "expected-empty plain-html-attribute-value",
      "plain HTML attribute value completion",
      "cursor locus pressure",
      "TemplateCompletionCursorContextBuilder",
      "CompletedInputPrimaryCorridor",
      "CompletedInputTemplateCorridor",
      "CompletedInputBindingPatternCorridor",
      "CompletedInputIteratorCorridor",
      "CompletedInputLeftHandSideCorridor",
      "CompletedInputArrowCorridor",
      "CompletedInputTailCorridor",
      "interpolation EOF",
      "permissive EOF",
      "template expression hole",
      "interpolation hole",
      "expression-boundary-scanner",
      "findTemplateExpressionClose",
      "parse result inspection",
      "ExpressionParseResultInspector",
      "completed input failure",
      "autocomplete parser",
      "cursor parser",
      "LSP completion",
    ],
    queryCanaries: [
      {
        query: "completed input parser corridors interpolation EOF",
        summary:
          "Completed-input parser and interpolation boundary questions should route structurally instead of missing Work Router.",
      },
      {
        query: "permissive EOF template expression hole parser corridor",
        summary:
          "Template-expression hole parsing should start from boundary lookahead and completed-input corridors.",
      },
      {
        query: "parse result inspection recursive AST traversal",
        summary:
          "Reusable parse-result traversal questions belong to expression parser inspection, not consumer-local switches.",
      },
      {
        query: "expected-empty plain HTML attribute value completion miss cursor pressure",
        summary:
          "Expected-empty completion outcomes should route to template cursor/completion pressure instead of becoming invisible Work Router misses.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-parser.ts",
        symbolName: "CompletedInputParser",
        role: "primary",
        summary:
          "Main completed-input parser and expression completion recovery orchestrator.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-primary-corridor.ts",
        symbolName: "CompletedInputPrimaryCorridor",
        role: "primary",
        summary:
          "Primary-expression corridor for completed-input parsing.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-template-corridor.ts",
        symbolName: "CompletedInputTemplateCorridor",
        role: "primary",
        summary:
          "Template literal and interpolation-hole corridor.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/expression-boundary-scanner.ts",
        symbolName: "findTemplateExpressionClose",
        role: "grounding",
        summary:
          "Shared template-expression close-boundary lookahead used to avoid permissive EOF shortcuts.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-parser-state.ts",
        symbolName: "CompletedInputParserState",
        role: "supporting",
        summary:
          "Shared scanner cursor, delimiter, checkpoint, failure, and span-rebasing state.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-binding-pattern-corridor.ts",
        symbolName: "CompletedInputBindingPatternCorridor",
        role: "supporting",
        summary:
          "Binding-pattern corridor for destructuring and iterator/header completion pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-iterator-corridor.ts",
        symbolName: "CompletedInputIteratorCorridor",
        role: "supporting",
        summary:
          "Iterator and repeat-style header corridor.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-left-hand-side-corridor.ts",
        symbolName: "CompletedInputLeftHandSideCorridor",
        role: "supporting",
        summary:
          "Member, keyed, call, argument, and left-hand-side continuation corridor.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-arrow-corridor.ts",
        symbolName: "CompletedInputArrowCorridor",
        role: "supporting",
        summary:
          "Arrow/function and parameter-list recovery corridor.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-tail-corridor.ts",
        symbolName: "CompletedInputTailCorridor",
        role: "supporting",
        summary:
          "Value-converter and binding-behavior tail corridor.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/completed-input-failures.ts",
        symbolName: "CompletedInputFailureTracker",
        role: "supporting",
        summary:
          "Parser-local retained failure and gap publication support.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/expression/parse-result-inspection.ts",
        symbolName: "ExpressionParseResultInspector",
        role: "supporting",
        summary:
          "Shared parse-result and AST traversal helper surface for expression consumers.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/inquiry/template-completion.ts",
        symbolName: "TemplateCompletionCursorContextBuilder",
        role: "supporting",
        summary:
          "Cursor-context builder that resolves template loci into completion query handles using parser, scope, and resource products.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime pressure:cursor-loci",
        role: "pressure",
        summary:
          "Cursor-locus pressure script buckets expected-empty, weak-type, exception, and public API mismatch completion outcomes.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/expression/completed-input",
        role: "pressure",
        summary:
          "Completed-input parser/corridor workset lane.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "expression", "parser", "completion"],
        role: "grounding",
        summary:
          "Durable memory captures completed-input parser and corridor pressure.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "inquiry", "template", "completion", "lsp"],
        role: "supporting",
        summary:
          "Template cursor-context memory should route through parser/completion substrate before inquiry-local heuristics.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "functions",
        filters: {
          pathPrefix: "packages/semantic-runtime/src/expression",
          orderBy: "lineCount",
        },
        role: "pressure",
        summary:
          "Function rows expose corridor and parser method pressure before refactoring.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "expression",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework tests and docs with expression-heavy snippets should seed parser/completion pressure.",
      },
    ],
    authority: [
      "semantic-runtime completed-input parser and corridor ownership.",
      "Expression-boundary scanner for interpolation/template-hole lookahead.",
      "parse-result-inspection for reusable AST traversal instead of consumer-local switches.",
      "Framework corpus expression snippets when parser behavior needs real Aurelia examples.",
    ],
    cautions: [
      "Do not add autocomplete-local parser forks when a corridor or parser-state primitive should own the behavior.",
      "For template expressions inside interpolation holes, prefer robust boundary lookahead over permissive EOF shortcuts.",
      "If a consumer needs another expression AST traversal, extend parse-result-inspection before adding a local recursive switch.",
    ],
    nextQuestions: [
      "Is this parser pressure about scanner state, delimiter recovery, template-hole boundary lookahead, or a specific corridor?",
      "Can expression-boundary-scanner close the hole before changing corridor EOF behavior?",
      "Should parse-result-inspection own this traversal or should a corridor publish a better recovered node?",
    ],
    relatedRouteIds: [
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.evaluator.world-construction",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.type-system-project-epoch",
    title: "TypeSystem Project Epoch",
    summary:
      "Route checker-epoch, TypeScript Program size, source admission, compiler-host cache, and type-system performance work through the shared TypeSystemProject boundary.",
    domains: ["semantic-runtime", "type-system", "checker", "world-construction", "performance", "telemetry"],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "TypeSystemProject",
      "type system project",
      "type-system project",
      "checker epoch",
      "TypeScript Program",
      "ts.createProgram",
      "program root files",
      "program source files",
      "root file count",
      "source-file cache",
      "compiler-host cache",
      "compiler host source file cache",
      "host source cache",
      "type-system profile",
      "type-system performance",
      "checker performance",
      "program construction",
      "root narrowing",
      "source admission",
      "ambient source",
      "dependency declarations",
      "node_modules declarations",
      "type-system telemetry",
      "program source-file composition",
    ],
    queryCanaries: [
      {
        query: "type-system performance TypeSystemProject program root files",
        summary:
          "Checker epoch performance work should route to TypeSystemProject before downstream materializers are blamed.",
      },
      {
        query: "compiler-host source-file cache dependency declarations",
        summary:
          "Repeated Program creation cost should route to the shared compiler-host cache and source admission policy.",
      },
      {
        query: "large TypeScript Program root count source admission inquiry depth",
        summary:
          "Program-size pressure should route through root/source-file composition telemetry and inquiry-depth policy.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject",
        role: "primary",
        summary:
          "Current app-local TypeScript Program/checker epoch and source-file lookup API.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProjectBuilder",
        role: "primary",
        summary:
          "Builds the checker epoch from evaluated sources, ambient sources, compiler options, host, Program, and checker.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/compiler-host-source-file-cache.ts",
        symbolName: "TypeSystemCompilerHostSourceFileCache",
        role: "primary",
        summary:
          "Process-local dependency/lib source-file cache used by the compiler host.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project-options.ts",
        symbolName: "buildTypeSystemProjectOptions",
        role: "grounding",
        summary:
          "App-local tsconfig/default option builder that determines module resolution and ambient declarations.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/app-world-project-pass.ts",
        symbolName: "AureliaAppWorldProjectConstructionFrame",
        role: "supporting",
        summary:
          "App-world construction phase that invokes TypeSystemProject and reports app-level phase timings.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry",
        role: "pressure",
        summary:
          "Telemetry script printing TypeSystemProject phase timings, root/source-file composition, and host cache stats.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "classes",
        filters: {
          pathPrefix: "packages/semantic-runtime/src/type-system",
          query: "TypeSystemProject",
        },
        role: "pressure",
        summary:
          "Product architecture class rows keep checker epoch and builder pressure visible.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "type-system", "checker", "world-construction", "performance"],
        role: "grounding",
        summary:
          "Durable type-system memory owns checker epoch performance and source-admission guidance.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/type-system/README.md",
        role: "grounding",
        summary:
          "Type-system substrate docs explain Program source composition, compiler-host caching, and root-narrowing cautions.",
      },
    ],
    authority: [
      "TypeSystemProject source for Program/checker epoch ownership.",
      "Type-system README and memory record for source admission and root-narrowing cautions.",
      "App telemetry for phase timing, source-file composition, and host cache stats.",
      "Aurelia resource/template/type semantics for deciding whether roots are semantic inputs or type-only dependencies.",
    ],
    cautions: [
      "Do not add a second TypeChecker Program path for a local feature; improve TypeSystemProject or downstream inquiry depth.",
      "A large Program root count is not automatically waste: source-shipped plugins and workspace packages may contain real Aurelia resources.",
      "Do not cache authored project source files behind a global dependency cache that hides edits.",
      "If an inquiry does not need checker facts, fix the app-query depth/materialization policy before narrowing TypeScript roots.",
    ],
    nextQuestions: [
      "Is the measured cost Program construction, checker creation, host source-file reads, or downstream type-shape projection?",
      "Are large roots semantic app/resource inputs, type-only dependencies, or artifacts of source admission?",
      "Which inquiry profile and app-query depth made this checker epoch necessary?",
      "Can telemetry distinguish root-file pressure from final Program dependency closure before a refactor?",
    ],
    relatedRouteIds: [
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.inquiry-query-claim-graph",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.template-recursive-rendering",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.type-system.expression-semantics",
    title: "TypeChecker Expression Semantics",
    summary:
      "Route TypeChecker-backed expression evaluation, speculative template contexts, member-owner projection, and binding-source-slot handoffs without creating a second local evaluator.",
    domains: [
      "semantic-runtime",
      "type-system",
      "expression",
      "checker",
      "template",
      "binding",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "CheckerExpressionTypeEvaluator",
      "checker expression type evaluator",
      "expression type evaluator",
      "type-system expression semantics",
      "type system expression semantics",
      "type-system",
      "type system",
      "TypeChecker",
      "checker-backed expression",
      "CheckerExpressionTypeWorld",
      "expression type world",
      "speculative checker context",
      "speculative binding scope",
      "speculative binding scope overlay",
      "synthetic checker context",
      "checker handoff",
      "branch scope projector",
      "template control flow context",
      "template recursion",
      "template completion",
      "member owner projector",
      "CheckerExpressionMemberOwnerProjector",
      "TemplateScopeTypeProjector",
      "template scope type projector",
      "CheckerBindingPatternLocalTypeProjector",
      "binding pattern local type",
      "expression member",
      "expression member selected member missing",
      "selected member missing",
      "expression member owner type",
      "expression member owner type missing slot type",
      "missing slot type",
      "binding source slot",
      "binding source slot checker handoff",
      "binding-source-slot-no-static-value",
      "cursor member owner",
      "completion query",
      "diagnostic probe",
    ],
    queryCanaries: [
      {
        query:
          "CheckerExpressionTypeEvaluator type-system template recursion binding source slot",
        summary:
          "Broad expression/type-system/template handoff queries must route to the checker expression substrate.",
      },
      {
        query:
          "CheckerExpressionTypeEvaluator method breakdown expression evaluator large class split speculative context",
        summary:
          "Large-class and method-breakdown questions about the checker expression evaluator should route through this substrate before any refactor.",
      },
      {
        query: "binding source slot checker handoff",
        summary:
          "Binding source-slot gaps that mention checker handoff need this route before observation patches.",
      },
      {
        query: "speculative checker context",
        summary:
          "Lifecycle or control-flow-specific expression reads should not create a second evaluator.",
      },
      {
        query: "speculative binding scope overlay",
        summary:
          "Branch-local or control-flow-specific scope overlays should route to the existing speculative binding-scope substrate.",
      },
      {
        query: "CheckerExpressionTypeWorld template completion",
        summary:
          "Completion and diagnostic probes should reuse the pass-local checker expression world.",
      },
      {
        query: "member owner projector",
        summary:
          "Cursor/member-owner projection belongs to the shared projector, not one-off inquiry code.",
      },
      {
        query: "expression member selected member missing owner type missing slot type",
        summary:
          "Expression member/owner diagnostics from app pressure should route to the shared TypeChecker expression substrate.",
      },
      {
        query:
          "Aurelia expression type missing member owner TypeChecker speculative binding scope",
        summary:
          "Natural diagnostic prose around owner/member gaps and speculative scope should stay structurally routeable.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-type-evaluator.ts",
        symbolName: "CheckerExpressionTypeEvaluator",
        role: "primary",
        summary:
          "Main TypeChecker-backed expression evaluator and current large-class frontier.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-type-world.ts",
        symbolName: "CheckerExpressionTypeWorld",
        role: "primary",
        summary:
          "Pass-local owner for evaluator/cache lifetime and shared expression context.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-member-owner-projector.ts",
        symbolName: "CheckerExpressionMemberOwnerProjector",
        role: "supporting",
        summary:
          "Offset-aware member-owner projector for cursor, completion, and diagnostic inquiries.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-branch-scope.ts",
        symbolName: "CheckerExpressionBranchScopeProjector",
        role: "supporting",
        summary:
          "Branch-local scope projector owns truthy/falsy/nullish and short-circuit speculative scope overlays.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/speculative-binding-scope.ts",
        symbolName: "speculativeBindingScopeOverlay",
        role: "supporting",
        summary:
          "Uncommitted same-level BindingScope overlay primitive for TypeChecker speculation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/template-completion.ts",
        symbolName: "templateCompletionQueryForCursor",
        role: "supporting",
        summary:
          "Cursor-context construction should share the checker expression world instead of rebuilding local expression readers.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "TemplateControllerScopeMaterializer",
        role: "supporting",
        summary:
          "Template-controller scope products feed expression context synthesis for nested control-flow scopes.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-scope-type-projector.ts",
        symbolName: "TemplateScopeTypeProjector",
        role: "supporting",
        summary:
          "Checker-backed bridge from controller/binding scopes to template-visible TypeScript symbols.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/binding-pattern-locals.ts",
        symbolName: "CheckerBindingPatternLocalTypeProjector",
        role: "supporting",
        summary:
          "Destructuring local type projection for repeat.for and other binding-pattern scopes.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
        role: "supporting",
        summary:
          "Binding source values consume checker expression products and expose source-slot pressure.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "classes",
        filters: {
          className: "CheckerExpressionTypeEvaluator",
        },
        role: "grounding",
        summary:
          "Product architecture class row keeps the evaluator frontier live and source-backed.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "functions",
        filters: {
          className: "CheckerExpressionTypeEvaluator",
          orderBy: "lineCount",
        },
        role: "pressure",
        summary:
          "Function surface rows give a method-level breakdown before splitting or extending the evaluator.",
      },
      {
        kind: "lens",
        lensId: LensId.TsType,
        projection: "type",
        role: "grounding",
        summary:
          "TypeScript checker facts are the authority for static owner/member/call/keyed expression surfaces.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "type-system", "expression", "checker"],
        role: "grounding",
        summary:
          "Durable memory captures checker expression evaluator, member-owner, and speculative-context steering.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "type-system", "binding", "controller"],
        role: "grounding",
        summary:
          "Template scope type-projection memory belongs to the shared TypeChecker expression substrate.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "type-system", "template", "repeat", "binding-pattern"],
        role: "grounding",
        summary:
          "Binding-pattern local type memory belongs to checker expression semantics before repeat-local lookup grows.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "configuration", "template", "type-system", "binding"],
        role: "supporting",
        summary:
          "Binding-scope materialization memory joins checker expression semantics through runtime scope products.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "expression",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework tests with expression-bearing template surfaces should seed TypeChecker expression semantics before fixture invention.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "templates",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Template fixtures ground expression semantics in real compiled-template and template-controller contexts.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "binding-data-flow",
        role: "grounding",
        summary:
          "Checker expression semantics should stay connected to reopened binding data-flow effects.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "template-compilation",
        role: "grounding",
        summary:
          "Template control-flow context should remain tied to compiled template products.",
      },
    ],
    authority: [
      "TypeScript checker facts and semantic-runtime CheckerExpressionTypeWorld lifetime.",
      "Template-controller scope products when expressions are nested under Aurelia control flow.",
      "Observation/binding value-source consumers that reveal source-slot pressure.",
      "Atlas route and memory canaries when future queries miss this substrate.",
    ],
    cautions: [
      "Do not add a second local TypeChecker expression evaluator for cursor, diagnostics, or binding observation.",
      "Lifecycle/control-flow-specific expression reads should layer a speculative context on shared checker/evaluator state.",
      "If the Work Router misses this frontier, fix route ontology or memory anchors before continuing product work.",
    ],
    nextQuestions: [
      "Does the requested expression read need global checker facts, template-control-flow context, or binding-observation runtime mode?",
      "Can CheckerExpressionTypeWorld provide the needed evaluator/cache lifetime, or does it need a layered speculative context?",
      "Which source-slot or member-owner product should be reused before adding local TypeChecker walks?",
    ],
    relatedRouteIds: [
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.binding-scope",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.evaluator.world-construction",
      "diagnostics.framework-error-grounding",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.resource-definition-convergence",
    title: "Resource Definition Convergence",
    summary:
      "Route work that turns recognized resource headers and source metadata into compiler-consumable full definitions, resource metadata diagnostics, bindables, watches, aliases, and open seams.",
    domains: [
      "semantic-runtime",
      "resources",
      "resource-convergence",
      "bindables",
      "watch",
      "provenance",
      "compiler-world",
      "diagnostics",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "document", "improve-atlas"],
    terms: [
      "ResourceDefinitionConverger",
      "resource definition convergence",
      "resource convergence",
      "FullResourceDefinition",
      "resource metadata diagnostics",
      "resource metadata annotations",
      "readCustomElementMetadataAnnotations",
      "readAliasMetadataAnnotations",
      "@alias",
      "@containerless",
      "@useShadowDOM",
      "@capture",
      "@children",
      "@slotted",
      "resource issue",
      "ResourceIssue",
      "ResourceIssuePublisher",
      "bindable convergence",
      "Bindable.getAll",
      "bindable metadata",
      "static bindables",
      "watch convergence",
      "watch metadata",
      "static watches",
      "definition object watches",
      "processContent",
      "children decorator",
      "slotted decorator",
      "CustomElement.define",
      "nested resource definition call",
      "validation-container",
      "ValidationContainerCustomElement",
      "resource open seam",
      "resource alias claim",
      "resource source address",
    ],
    queryCanaries: [
      {
        query: "ResourceDefinitionConverger bindable watch metadata diagnostics",
        summary:
          "Resource metadata convergence should route here before style dependencies, generic diagnostics, or template recursion.",
      },
      {
        query: "Bindable.getAll static bindables inherited bindable metadata",
        summary:
          "Bindable inheritance and static bindables are resource definition convergence semantics.",
      },
      {
        query: "watch metadata static watches definition object watches ResourceIssue",
        summary:
          "Watcher metadata and watcher ResourceIssue production are resource convergence work.",
      },
      {
        query: "resource metadata annotations @alias @containerless @useShadowDOM @capture @children @slotted",
        summary:
          "Resource annotation metadata should route to definition convergence before recognition or template rendering.",
      },
      {
        query: "CustomElement.define nested resource definition call validation-container",
        summary:
          "Framework configuration-time resource definitions are resource convergence/admission visibility work.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-definition-converger.ts",
        symbolName: "ResourceDefinitionConverger",
        role: "primary",
        summary:
          "Definition convergence orchestrator and product publication boundary.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/bindable-convergence.ts",
        symbolName: "readBindables",
        role: "primary",
        summary:
          "Bindable metadata convergence from decorators, inherited metadata, static bindables, and definition objects.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-metadata-annotations.ts",
        symbolName: "readCustomElementMetadataAnnotations",
        role: "primary",
        summary:
          "Resource metadata annotations for aliases, containerless, Shadow DOM, capture, and member registry dependencies.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/watch-convergence.ts",
        symbolName: "readWatches",
        role: "primary",
        summary:
          "Watcher metadata convergence from decorators, static watches, definition objects, and callback lookup.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-convergence-support.ts",
        role: "supporting",
        summary:
          "Shared source-field, target-reference, decorator, alias, and open-seam helpers for convergence modules.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-source-address.ts",
        symbolName: "templateMarkupSourceAddress",
        role: "supporting",
        summary:
          "Resource source spans and inline-template decoded-to-authored source-map support.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-issue-publication.ts",
        symbolName: "ResourceIssuePublisher",
        role: "supporting",
        summary:
          "Kernel publication boundary for resource-owned framework diagnostics.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkResources,
        projection: "convergence",
        role: "grounding",
        summary:
          "Framework resource convergence lane for source-site roles and provenance pressure.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/atlas framework:resources -- --projection=convergence --detail",
        role: "grounding",
        summary:
          "Targeted framework resource convergence rows with exact definition, backing declaration, bundle admission, syntax product, and materialization source sites.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkErrors,
        projection: "diagnostic-frontiers",
        role: "grounding",
        summary:
          "Framework error-code grounding for resource metadata ResourceIssue ownership.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "resources", "resource-convergence", "diagnostics"],
        role: "grounding",
        summary:
          "Memory records for resource-definition convergence, resource metadata diagnostics, and provenance ownership.",
      },
    ],
    authority: [
      "Resource recognition headers are not compiler-consumable definitions until convergence materializes runtime defaults, aliases, bindables, watches, dependencies, and open seams.",
      "runtime-html resource metadata rules decide which fields inherit, which diagnostics are exact ResourceIssue products, and which open seams remain dynamic.",
      "framework.resources and framework.errors lenses are the grounding lanes before changing definition provenance or claiming a new resource diagnostic.",
    ],
    cautions: [
      "Do not fold full-definition construction back into carrier recognition or built-in catalog admission.",
      "Do not generalize bindable inheritance rules to other resource fields without framework source grounding.",
      "Do not turn runtime-dependent watcher or dependency metadata into ResourceIssue rows; keep those as typed open seams until a lower substrate can close them.",
    ],
    nextQuestions: [
      "Is this pressure a header-recognition issue, a full-definition convergence issue, or catalog/admission visibility?",
      "Which runtime-html metadata rule or framework error-code usage authorizes the static conclusion?",
      "Should the source point at an authored metadata field, an inherited declaration context, or a broader open seam?",
      "Does Atlas need a sharper framework.resources or framework.errors lens before the semantic-runtime change is safe?",
    ],
    relatedRouteIds: [
      "semantic-runtime.resource-style-dependencies",
      "semantic-runtime.kernel-publication.provenance",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.observation.binding-flow",
      "diagnostics.framework-error-grounding",
    ],
  },
  {
    id: "semantic-runtime.resource-style-dependencies",
    title: "Resource And Style Dependencies",
    summary:
      "Route work that touches custom-element dependencies, framework style registries, resource visibility, style assets, and component child-container registration effects.",
    domains: [
      "resources",
      "style-resources",
      "resource-convergence",
      "compiler-world",
      "registration",
      "component-container",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "document"],
    terms: [
      "resource dependency",
      "resource dependencies",
      "resource dependency entry",
      "resource dependency entry cssModules shadowCSS",
      "open definition field",
      "resource open definition field",
      "style resource",
      "style resource surfaces",
      "cssModules",
      "shadowCSS",
      "CSSModulesProcessorRegistry",
      "ShadowDOMRegistry",
      "style registry dependency",
      "framework style registry",
      "children lifecycle hooks",
      "slotted lifecycle hooks",
      "@children registry dependency",
      "@slotted registry dependency",
      "component stylesheet",
      "css module style",
      "shadow dom styles",
      "component child container dependency",
    ],
    queryCanaries: [
      {
        query: "resource dependency entry cssModules shadowCSS",
        summary:
          "Framework style registries in custom-element dependencies should route to resource/style dependency semantics, not generic resource openness.",
      },
      {
        query: "style registry dependency",
        summary:
          "Component-level cssModules/shadowCSS dependencies are IRegistry values and need resource-plus-registration framing.",
      },
      {
        query: "@children @slotted registry dependency lifecycle hooks",
        summary:
          "Decorator-generated lifecycle hook dependencies should route to resource/style dependency semantics.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-definition-converger.ts",
        symbolName: "ResourceDefinitionConverger",
        role: "primary",
        summary:
          "Converges custom-element and custom-attribute dependency fields before compiler-world visibility consumes them.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/style-registry-call.ts",
        symbolName: "aureliaStyleRegistryCallKind",
        role: "supporting",
        summary:
          "Shared framework style-registry call classifier for cssModules and shadowCSS.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-metadata-annotations.ts",
        symbolName: "readCustomElementMetadataAnnotations",
        role: "supporting",
        summary:
          "Resource metadata annotation reader that contributes @children/@slotted lifecycle-hook registry dependencies.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/application/style-topology.ts",
        symbolName: "readApplicationStyleAssetSites",
        role: "supporting",
        summary:
          "Application topology reader that turns style imports and style registry calls into style asset facts.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/resources/resource-definition-index.ts",
        symbolName: "ResourceDefinitionIndex",
        role: "supporting",
        summary:
          "Resource visibility lookup should ignore registry dependencies while keeping resource dependencies visible.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkResources,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework resource semantics for definition fields, dependencies, and visibility.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/atlas framework:resources -- --projection=convergence --detail",
        role: "grounding",
        summary:
          "Targeted framework resource convergence rows for checking whether a dependency is a visible resource, syntax product, bundle admission, or runtime materialization site.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRendering,
        projection: "summary",
        role: "grounding",
        summary:
          "Runtime-html style registries affect template compilation and controller child containers during rendering.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "resources", "style-resources", "compiler-world"],
        role: "grounding",
        summary:
          "Memory records for resource convergence, compiler-world visibility, and style resource topology.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "styles",
        query: "cssModules",
        effectKind: "style-resource",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework tests seed cssModules registry dependencies that should stay distinct from visible resources.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "styles",
        query: "shadowCSS",
        effectKind: "style-resource",
        seedUse: "behavior-grounding",
        role: "grounding",
        summary:
          "Framework tests seed shadowCSS registry dependencies that affect component child-container style registration.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "style-resource",
        role: "grounding",
        summary:
          "Fixture effects should prove style-resource facts rather than treating style registries as resource misses.",
      },
    ],
    authority: [
      "Aurelia CustomElementDefinition.dependencies is a Key[] registered into the component child container.",
      "runtime-html cssModules(...) and shadowCSS(...) return IRegistry values, not component resource definitions.",
      "runtime-html @children and @slotted member decorators add lifecycle-hook registry values through resource metadata annotations.",
      "semantic-runtime resource convergence, style topology, registration, and compiler-world visibility must keep those lanes distinct.",
    ],
    cautions: [
      "Do not close a style registry dependency by pretending it is a visible custom element or custom attribute.",
      "Do not leave framework style registries as resource.open-definition-field seams once the call is source-proven.",
      "If a dependency affects child-container registration, keep it visible as registry/dependency semantics even when resource scope lookup ignores it.",
    ],
    nextQuestions: [
      "Is this dependency a visible resource, an IRegistry-style child-container effect, or still an unclosed dynamic Key?",
      "Does the framework source show a registration effect that DI or topology should materialize?",
      "Should style topology, resource convergence, or compiler-world visibility own the observed pressure?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.evaluator.world-construction",
    ],
  },
  {
    id: "semantic-runtime.evaluator.world-construction",
    title: "Evaluator And World Construction",
    summary:
      "Route gaps where static evaluator, DI, KernelStore, or project/world construction substrates need lower-level capability rather than local patching.",
    domains: ["evaluation", "di", "world-construction", "kernel", "configuration"],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "StaticEvaluator",
      "StaticEvaluator method breakdown",
      "static evaluator",
      "evaluator",
      "evaluator method breakdown",
      "world construction",
      "container",
      "DI default resolver",
      "default resolver policy",
      "DefaultResolver",
      "ContainerConfiguration DEFAULT",
      "ContainerConfiguration defaultResolver",
      "DefaultResolver singleton",
      "DefaultResolver transient",
      "DefaultResolver none",
      "JIT register",
      "_jitRegister",
      "auto register",
      "auto-registration",
      "resolve class singleton transient",
      "constructable get",
      "kernel store",
      "configuration",
      "configuration bundle",
      "custom configuration bundle",
      "custom bundle",
      "StandardConfiguration",
      "bundle admission",
      "environment",
      "ModuleEnvironmentRecord",
      "EvaluationBinding",
      "module source host",
      "FileSystemEvaluationModuleSourceHost",
      "FrameworkApiIssueMaterializer",
      "synthetic evaluation context",
      "evaluation.unsupported-expression",
      "unsupported expression",
      "external-module-value",
      "external module value",
      "di.open-registry-body",
      "registry body",
      "IRegistry registration body",
      "module loader",
      "ModuleLoader",
      "IModuleLoader",
      "AnalyzedModule",
      "ModuleItem",
      "module loader import analysis",
      "module bridge role evidence",
      "aliasedResourcesRegistry",
      "aliasedResourcesRegistry IRegistry module loader",
      "analyzed module exports",
    ],
    queryCanaries: [
      {
        query: "StandardConfiguration",
        summary:
          "StandardConfiguration is a bundle-discovery canary for framework admission, not a special-case ceiling.",
      },
      {
        query: "custom configuration bundle",
        summary:
          "User/plugin configuration bundles must route through the same admission and world-construction substrate.",
      },
      {
        query: "DI default resolver resolve class singleton transient auto register",
        summary:
          "Questions about auto-registering classes through DefaultResolver policies should route to DI/world construction and framework ContainerConfiguration grounding.",
      },
      {
        query: "static evaluator",
        summary:
          "Evaluator feature gaps should route to lower-level static evaluation capability.",
      },
      {
        query:
          "StaticEvaluator method breakdown evaluator world construction intrinsics module state",
        summary:
          "Method-breakdown questions about the evaluator should route through evaluator/world construction and product architecture before refactoring.",
      },
      {
        query: "synthetic evaluation context",
        summary:
          "Speculative context questions should preserve already-resolved evaluator/module state.",
      },
      {
        query: "evaluation.unsupported-expression",
        summary:
          "Unsupported expression seams should start at evaluator/world-construction substrate, not surface patches.",
      },
      {
        query: "di.open-registry-body",
        summary:
          "Open DI registry-body seams should route through evaluator/DI/world admission.",
      },
      {
        query: "aliasedResourcesRegistry IRegistry module loader",
        summary:
          "Kernel module-loader registry factories should route to evaluator/world construction, not generic resource or registration patches.",
      },
      {
        query: "AnalyzedModule ModuleItem bridge role evidence module loader import analysis evaluator world construction",
        summary:
          "Kernel analyzed-module bridge-role questions should route to module-loader and evaluator/world-construction substrate.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/evaluator.ts",
        symbolName: "StaticEvaluator",
        role: "primary",
        summary:
          "Evaluator substrate should absorb expression/world-construction gaps before surface work continues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/di/container.ts",
        symbolName: "Container",
        role: "primary",
        summary:
          "DI emulator is a high-fidelity substrate and should remain framework-grounded.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/di/container-configuration.ts",
        symbolName: "ContainerConfiguration",
        role: "grounding",
        summary:
          "Runtime-shaped container configuration mirror models the stock DefaultResolver singleton/none/transient policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/di/container-api-recognition.ts",
        symbolName: "containerDefaultResolverPolicyForExpression",
        role: "supporting",
        summary:
          "TypeChecker-backed source recognition maps createContainer defaultResolver expressions to semantic-runtime policy.",
      },
      {
        kind: "source",
        filePath: "aurelia/packages/kernel/src/di.container.ts",
        symbolName: "ContainerConfiguration",
        role: "grounding",
        summary:
          "Framework source defines ContainerConfiguration.DEFAULT and the default fallback to DefaultResolver.singleton.",
      },
      {
        kind: "auLink",
        linkId: "kernel:ContainerConfiguration",
        symbolName: "ContainerConfiguration",
        role: "grounding",
        summary:
          "ContainerConfiguration must stay mirrored to the framework default-resolver contract before DI authoring assumptions change.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/configuration/app-world-project-pass.ts",
        symbolName: "AureliaAppWorldProjectConstructionFrame",
        role: "supporting",
        summary:
          "World construction frame coordinates app project materialization and admission pressure.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/registration/framework-registration-manifest.ts",
        symbolName: "frameworkRegistrationDescriptors",
        role: "grounding",
        summary:
          "Known framework configuration and registration bundles such as StandardConfiguration are declared here as discoverable capabilities, not one-off evaluator cases.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/configuration/configuration-recognizer.ts",
        role: "grounding",
        summary:
          "Recognizes Aurelia register/app/task/configuration surfaces before world construction spends admitted framework capabilities.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/module-loader.ts",
        symbolName: "ModuleLoader",
        role: "grounding",
        summary:
          "Kernel IModuleLoader mirror owns module transform-input and analyzed-module item semantics used by registry-body materialization.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/module-loader-issues.ts",
        symbolName: "ModuleLoaderIssueMaterializer",
        role: "grounding",
        summary:
          "Publishes exact AUR0021 diagnostics for aliasedResourcesRegistry and IModuleLoader.load inputs before DI spends registry effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/module-host.ts",
        symbolName: "FileSystemEvaluationModuleSourceHost",
        role: "supporting",
        summary:
          "File-system source-resolution boundary for recursive evaluator module graph construction.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/environment.ts",
        symbolName: "ModuleEnvironmentRecord",
        role: "supporting",
        summary:
          "ECMAScript-like binding-cell model for module and evaluator-local function environments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/framework-api-issues.ts",
        symbolName: "FrameworkApiIssueMaterializer",
        role: "supporting",
        summary:
          "Source-local framework API diagnostics for kernel utility and metadata calls.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/store.ts",
        symbolName: "KernelStore",
        role: "supporting",
        summary:
          "Kernel store pressure indicates where durable semantic records may need clearer ownership.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "functions",
        filters: {
          className: "StaticEvaluator",
          orderBy: "lineCount",
        },
        role: "pressure",
        summary:
          "Function surface rows show evaluator method ownership before splitting or extending evaluator capability.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkAdmission,
        projection: "flow",
        role: "grounding",
        summary:
          "Framework admission flow keeps configuration and bundle discovery grounded in declared registry/configuration relationships.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkEvaluator,
        projection: "effects",
        role: "grounding",
        summary:
          "Framework evaluator lens must be checked before expanding evaluator emulation.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/atlas framework:evaluator -- --projection=effects --path=aurelia/packages/runtime-html/src/aurelia.ts --memberName=register --detail",
        role: "grounding",
        summary:
          "Direct framework.evaluator CLI handle for method-root static invocation effects and evaluator open seams.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkDi,
        projection: "summary",
        role: "grounding",
        summary:
          "DI source mirrors should drive container and configuration admission changes.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "di", "world-construction", "kernel"],
        role: "grounding",
        summary:
          "Durable memory captures evaluator rabbit-hole policy and substrate-first taste.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "module-resolution", "external-packages"],
        role: "grounding",
        summary:
          "Module source-host memory belongs to evaluator/world construction before feature-local manifest readers appear.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "ecmascript", "environment-record"],
        role: "grounding",
        summary:
          "ModuleEnvironmentRecord memory belongs to evaluator state and speculative execution context work.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "framework-errors", "framework-api", "kernel-api", "metadata-api"],
        role: "supporting",
        summary:
          "Source-local framework API issue memory stays in evaluator/world construction with diagnostics as a consumer.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "project-shape",
        role: "grounding",
        summary:
          "World construction should prove the reopened project has an Aurelia app shape.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "project-tooling",
        role: "grounding",
        summary:
          "World construction and authoring recipes should expose package/typecheck tooling source roles.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "app-root",
        role: "grounding",
        summary:
          "World construction should connect admitted configuration to root app configuration effects.",
      },
    ],
    authority: [
      "Static evaluator open seams and TypeScript checker facts.",
      "Aurelia DI/configuration framework source through auLink and framework lenses.",
      "KernelStore record ownership and world-construction entrypoint topology.",
      "Atlas performance/profile lenses when evaluator growth obscures navigation.",
    ],
    cautions: [
      "A surface gap in authoring or templates should often pivot down into evaluator capability instead of being smoked through.",
      "Avoid parallel one-off evaluation contexts that forget module variables or already-resolved environment state.",
      "If Atlas cannot reveal the flow cheaply, improve Atlas instead of continuing from stale memory.",
    ],
    nextQuestions: [
      "Is this missing capability a static evaluator primitive, a TypeChecker context handoff, or DI/world admission?",
      "Which already-resolved environment/module state should a synthetic evaluation context reuse?",
      "Does Atlas need a clearer flow lens before the semantic-runtime change is safe?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.kernel-publication.provenance",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.kernel-publication.provenance",
    title: "Kernel Publication And Provenance",
    summary:
      "Route semantic-runtime KernelStoreRecord publication, product evidence/provenance envelopes, registration/configuration publication helpers, and field-provenance pressure.",
    domains: [
      "semantic-runtime",
      "kernel-publication",
      "provenance",
      "registration",
      "configuration",
      "field-provenance",
    ],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "kernel publication",
      "kernel-publication",
      "KernelStoreRecord",
      "KernelStoreBatch",
      "record construction",
      "publication helper",
      "ConfigurationKernelPublication",
      "configuration kernel publication",
      "RegistrationAdmissionSupportMaterializer",
      "registration admission support",
      "field provenance",
      "FieldProvenance",
      "provenance pressure",
      "product architecture field provenance",
      "evidence record",
      "materialized product",
      "ProductDetailCatalog",
      "product details",
      "publishIssueProduct",
      "source backed issue publication",
    ],
    queryCanaries: [
      {
        query: "registration admission support materializer",
        summary:
          "Registration support publication pressure should route to the kernel publication/provenance substrate.",
      },
      {
        query: "configuration kernel publication provenance",
        summary:
          "Configuration publication and provenance pressure should not disappear into evaluator/world-construction.",
      },
      {
        query: "product architecture field provenance pressure",
        summary:
          "Field-provenance precision concerns should route to the publication/provenance lane.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/registration/registration-kernel-emitter.ts",
        symbolName: "RegistrationAdmissionSupportMaterializer",
        role: "primary",
        summary:
          "Registration admission support records and field provenance are emitted here.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/configuration-publication.ts",
        symbolName: "ConfigurationKernelPublication",
        role: "primary",
        summary:
          "Shared configuration publication envelope for product details, evidence, provenance, and claims.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/provenance.ts",
        symbolName: "FieldProvenance",
        role: "grounding",
        summary:
          "Field provenance primitive and compact helper; false field precision should stay visible.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/product-details.ts",
        symbolName: "ProductDetailCatalog",
        role: "supporting",
        summary:
          "Hot in-memory sidecar for typed product details keyed by durable MaterializedProduct handles.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/issue-publication.ts",
        symbolName: "publishIssueProduct",
        role: "supporting",
        summary:
          "Shared issue product publication primitive for source-backed diagnostics.",
      },
      {
        kind: "lens",
        lensId: LensId.ProductArchitecture,
        projection: "kernel-records",
        role: "pressure",
        summary:
          "Product architecture kernel-record and FieldProvenance rows identify repeated publication pressure.",
      },
      {
        kind: "memory",
        domains: [
          "semantic-runtime",
          "kernel-publication",
          "provenance",
          "registration",
          "configuration",
          "field-provenance",
        ],
        role: "grounding",
        summary:
          "Memory keeps record construction and field-provenance pressure routeable across configuration and registration.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "kernel", "product-details", "inquiry"],
        role: "supporting",
        summary:
          "Product detail catalog memory belongs to kernel publication/inquiry substrate before payload escape hatches grow.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "kernel", "diagnostics", "kernel-publication"],
        role: "supporting",
        summary:
          "Source-backed issue publication memory belongs to kernel publication and diagnostic product ownership.",
      },
      {
        kind: "memory",
        domains: ["atlas", "product-architecture", "semantic-runtime", "provenance"],
        role: "pressure",
        summary:
          "Atlas field-provenance pressure is the navigation lane for false precision in semantic-runtime product records.",
      },
    ],
    authority: [
      "KernelStore publication records and product-detail ownership.",
      "Source-authored provenance for user code/templates; avoid false precision for framework constants.",
      "Product architecture kernel-record and field-provenance pressure rows.",
    ],
    cautions: [
      "Do not hide repeated record construction behind one-off wrappers that only silence a pressure lens.",
      "Framework field provenance should be intentional; field-level precision is more valuable for user-authored TypeScript and templates.",
      "Publication helpers should clarify ownership of evidence/provenance/claims rather than becoming a generic envelope soup.",
    ],
    nextQuestions: [
      "Is this repeated record construction a missing publication primitive or legitimate product-specific evidence?",
      "Does the provenance point at user-authored source, framework-authored constants, or a too-broad carrier?",
      "Which product owner should own the record envelope before KernelStore sees it?",
    ],
    relatedRouteIds: [
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.resource-style-dependencies",
      "diagnostics.framework-error-grounding",
    ],
  },
  {
    id: "router.viewport.authoring-semantics",
    title: "Router Viewport Authoring Semantics",
    summary:
      "Route router, au-viewport, RouteContext, route tree, route-recognizer, and routeable-component work through framework-grounded modeling before MCP or fixture authoring.",
    domains: ["router", "viewport", "authoring", "world-construction", "fixtures"],
    roles: ["orient", "author", "analyze", "refactor", "verify"],
    terms: [
      "router",
      "au-viewport",
      "viewport agent",
      "route context",
      "route tree",
      "route recognizer",
      "route parameter",
      "route parameters",
      "route parameter aggregation",
      "getRouteParameters",
      "IRouteContext.getRouteParameters",
      "closest parameter wins",
      "active route node parameter values",
      "route recognition materialization",
      "RouteRecognitionMaterializationProjectPass",
      "RouteConfigContextMaterializationProjectPass",
      "RouteComponentAgentMaterializationProjectPass",
      "route component agent",
      "routeable component",
      "router instruction",
      "router resource",
      "router resource instruction",
      "viewport instruction",
      "load custom attribute",
      "LoadCustomAttribute.active",
      "load.active",
      "load active",
      "load active bind",
      "load.active.bind",
      "href custom attribute",
      "href externality",
      "router href externality",
      "href click interception",
      "activeClass",
      "active class",
      "active navigation",
      "active link",
      "active link state",
      "router active link state",
      "router-active-link-state",
      "dynamic href",
      "router authoring",
      "router.open-instruction",
      "router open instruction",
      "router dynamic pattern",
      "router-dynamic-pattern",
      "router viewport resolution errors",
      "router-viewport-resolution-errors",
      "external module value",
      "router external module value",
      "click interception disabled",
      "router-href-click-interception-disabled",
      "router-href-externality-open",
      "router-instruction-needs-static-value",
      "router-redirect-target-open",
      "redirectSourceRouteConfig",
      "static redirect target",
      "redirectSourceRouteConfig static redirect target",
      "router-viewport-resolution-open",
      "viewport resolution",
      "viewport resolution open",
      "viewport activation",
      "router activation",
      "router lifecycle",
      "route lifecycle",
      "route hooks",
      "guard lifecycle",
      "authoring fixture route parameter aggregation activation lifecycle",
      "routed app shell",
      "routed-app-shell",
      "generic routing recipe",
      "route shell recipe",
      "routed catalog storefront",
      "routed-catalog-storefront",
      "catalog storefront routes",
      "list detail route",
      "list/detail route",
      "route parameter selected state",
      "static detail navigation",
    ],
    queryCanaries: [
      {
        query: "au-viewport",
        summary:
          "Viewport resource semantics need explicit router modeling before authoring claims.",
      },
      {
        query: "ViewportAgent",
        summary:
          "ViewportAgent's parallel tree should stay visible as router substrate pressure.",
      },
      {
        query: "RouteableComponent",
        summary:
          "RouteableComponent convergence should route to router semantics rather than generic component analysis.",
      },
      {
        query: "route recognizer",
        summary:
          "Route-recognizer work has parser-like complexity and needs wide router substrate grounding.",
      },
      {
        query: "href externality",
        summary:
          "Href dynamic/static externality should route through framework router href semantics.",
      },
      {
        query: "router-href-externality-open",
        summary:
          "Router href externality seams should route to router/viewport authoring semantics.",
      },
      {
        query: "router-viewport-resolution-open",
        summary:
          "Viewport-resolution seams should route to explicit router viewport semantics.",
      },
      {
        query: "router open instruction external module value viewport resolution open",
        summary:
          "Open-seam summaries for router instruction closure should route through router/viewport semantics.",
      },
      {
        query: "router open instruction href externality viewport static value",
        summary:
          "Composite router-resource open-seam vocabulary should route through the router/viewport route without relying on prose.",
      },
      {
        query: "router.open-instruction router-dynamic-pattern router-instruction-needs-static-value router-href-externality-open click interception",
        summary:
          "Fixture-owner open-seam rows for dynamic router patterns should route through router/viewport semantics.",
      },
      {
        query: "router-viewport-resolution-open router viewport resolution errors open instruction",
        summary:
          "Fixture-owner open-seam rows for viewport resolution should route through router/viewport semantics.",
      },
      {
        query: "redirectSourceRouteConfig static redirect target",
        summary:
          "Closed redirect target provenance should route through router recognition and route-tree semantics.",
      },
      {
        query: "router activeClass load active.bind active link state",
        summary:
          "Router active navigation queries should route to activeClass and load.active from-view semantics before recipe-local code changes.",
      },
      {
        query: "authoring fixture route parameter aggregation activation lifecycle",
        summary:
          "Routed fixture pressure for getRouteParameters, active route-node values, activation, and lifecycle should route through router/viewport semantics.",
      },
      {
        query: "routed app shell RouterConfiguration route params au-viewport",
        summary:
          "Generic routed app-shell authoring should route through router/viewport semantics and the route-shell recipe contract.",
      },
      {
        query: "routed catalog storefront list detail route parameter selected state",
        summary:
          "Routed app-building recipes should find router/viewport semantics for list/detail routes and route-parameter-selected state.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-runtime-topology.ts",
        symbolName: "RouteRuntimeTopologyFrame",
        role: "primary",
        summary:
          "Product-side topology for RouteContext, au-viewport, ViewportAgent, and route child-container relationships.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-tree-materialization.ts",
        symbolName: "RouteTreeTransitionMaterializationFrame",
        role: "primary",
        summary:
          "Route-tree transition materialization and route-node/controller handoff pressure point.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-config-recognition.ts",
        symbolName: "RouteConfigKernelEmitter",
        role: "supporting",
        summary:
          "RouteConfig convergence frontier for routeable components, child routes, diagnostics, and route-config products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-recognizer-materialization.ts",
        symbolName: "RouteRecognizerStateGraphBuilder",
        role: "supporting",
        summary:
          "Route-recognizer graph semantics and parser-like route path pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-recognition-materialization.ts",
        symbolName: "RouteRecognitionMaterializationProjectPass",
        role: "primary",
        summary:
          "Static route recognition materialization pass for viewport instruction paths and RecognizedRoute products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-context-materialization.ts",
        symbolName: "RouteConfigContextMaterializationProjectPass",
        role: "primary",
        summary:
          "RouteConfigContext topology and owned RouteRecognizer materialization from route configs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-instruction-materialization.ts",
        symbolName: "RouteInstructionMaterializationProjectPass",
        role: "primary",
        summary:
          "Static router-resource value closure into typed navigation and viewport instruction products.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/router-active-link-state",
        role: "pressure",
        summary:
          "Pressure fixture for activeClass plus LoadCustomAttribute.active.bind from-view state handoff.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/router/route-component-agent-materialization.ts",
        symbolName: "RouteComponentAgentMaterializationProjectPass",
        role: "supporting",
        summary:
          "Routed component-agent materialization connects route nodes to pre-activation controller and child-container products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-eager-path-generation.ts",
        symbolName: "RouteEagerPathGenerationIndex",
        role: "supporting",
        summary:
          "RouteConfigContext eager path generation for object-form router resource values.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-app-shell-recipe.ts",
        symbolName: "buildRoutedAppShellPlan",
        role: "supporting",
        summary:
          "Generated generic route-shell recipe that consumes router semantics without a form, catalog, or table domain model.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-state-backed-form-recipe.ts",
        symbolName: "buildRoutedStateBackedFormPlan",
        role: "supporting",
        summary:
          "Current generated routed-form authoring recipe that consumes router semantics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-catalog-storefront-recipe.ts",
        symbolName: "buildRoutedCatalogStorefrontPlan",
        role: "supporting",
        summary:
          "Generated routed app-building recipe that proves common list/detail route config, static navigation, route params, viewport, route-node, and component-agent effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/routed-searchable-data-table-recipe.ts",
        symbolName: "buildRoutedSearchableDataTablePlan",
        role: "supporting",
        summary:
          "Generated routed data-table recipe that proves common list/detail route config, data-driven row links, route params, viewport, route-node, and component-agent effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/route-effect-facts.ts",
        symbolName: "readSemanticRouteEffectFactRows",
        role: "supporting",
        summary:
          "Shared route-effect fact stream that gives authoring verification and orientation exact router product kinds.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/route-expected-effects.ts",
        symbolName: "routeProductSignatureEffect",
        role: "supporting",
        summary:
          "Route expected-effect helper layer for proving specific router/viewport products in generated fixtures.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRouter,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework router lens is the first read for route context, route tree, viewport-agent, and recognizer flow.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        concept: "router",
        role: "pressure",
        summary:
          "Router docs/tests provide promoted and behavior-grounded route authoring examples.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        recipeKey: "routed-app-shell",
        role: "grounding",
        summary:
          "Generic route-shell authoring should prove route expected effects through the shared router effect contract before domain recipes reuse it.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        recipeKey: "routed-state-backed-form",
        role: "grounding",
        summary:
          "Router authoring should connect fixture seeds to the route expected-effect contract instead of only browsing examples.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        recipeKey: "routed-catalog-storefront",
        role: "grounding",
        summary:
          "Routed storefront authoring should prove route expected effects through the shared router effect contract.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        recipeKey: "routed-searchable-data-table",
        role: "grounding",
        summary:
          "Routed data-table authoring should prove route expected effects through the shared router effect contract.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "router", "viewport", "framework"],
        role: "grounding",
        summary:
          "Durable memory records router/viewport as a multi-hour substrate frontier, not a local vertical slice.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "router", "route-recognizer", "viewport-instruction"],
        role: "grounding",
        summary:
          "Route recognition materialization memory belongs to router/viewport semantics before instruction diagnostics rely on it.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "router", "route-config", "route-context"],
        role: "grounding",
        summary:
          "RouteConfigContext materialization memory belongs to router topology before runtime RouteContext handoff.",
      },
      {
        kind: "auLink",
        linkId: "router:Router",
        role: "grounding",
        summary:
          "Router modeling should keep product shapes mirrored to framework concepts where auLink exists or should be added.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "fixture-seeds",
        filters: { concept: "router" },
        role: "pressure",
        summary:
          "Find docs/tests route examples before inventing fixture authoring semantics.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas pressure:framework-router",
        role: "grounding",
        summary:
          "Compact router architecture pressure read for framework flow, route-recognizer mechanics, and descriptor drift.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas framework:router -- --projection=relationships --query=ViewportAgent --detail",
        role: "grounding",
        summary:
          "Targeted router relationship rows for viewport-agent grounding before product router/viewport refactors.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:router-active-link-state",
        role: "pressure",
        summary:
          "Focused activeClass and load.active from-view binding contract.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas bridge:aulink -- --projection=mirror --packageId=router --detail",
        role: "grounding",
        summary:
          "Targeted auLink mirror rows for router concepts after framework.router identifies the relevant actor.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/router/README.md",
        role: "grounding",
        summary:
          "Semantic-runtime router scope notes distinguish modeled static topology from non-navigating runtime gaps.",
      },
    ],
    authority: [
      "Aurelia router package source, including route context, route tree, viewport-agent, and route-recognizer.",
      "auLink mirrored semantic-runtime concepts for routeable components and viewports.",
      "External app pressure only as a floor for understandability, not as the semantic ceiling.",
    ],
    cautions: [
      "Router work should not be framed as a narrow app-pressure patch; it needs framework architecture first.",
      "au-viewport needs explicit semantics like built-in template controllers.",
      "RouteableComponent should be treated as a convergeable product/framework concept.",
    ],
    nextQuestions: [
      "Which router framework actors and relationships need auLink mirrors before authoring can be honest?",
      "How does viewport-agent's tree relate to controller and route trees?",
      "Which route-recognizer cases require a wide parser-like substrate pass?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-recursive-rendering",
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.evaluator.world-construction",
    ],
  },
  {
    id: "semantic-runtime.i18n.translation-binding",
    title: "I18n Translation Binding",
    summary:
      "Route i18n TranslationBinding lifecycle diagnostics, translation-key/parameter binding joins, and exact i18n framework-error authority through template rendering products.",
    domains: ["semantic-runtime", "i18n", "template", "diagnostics", "binding"],
    roles: ["orient", "analyze", "verify"],
    terms: [
      "i18n",
      "TranslationBinding",
      "translation binding",
      "t-params",
      "translation key binding",
      "I18nKeyEvaluationResult",
      "I18nService.evaluate",
      "i18n bridge role evidence",
      "i18n key evaluation result",
      "semicolon translation keys",
      "I18nTranslationBindingIssueMaterializer",
      "AUR4000",
      "AUR4001",
      "AUR4002",
      "translation binding lifecycle",
      "translation binding diagnostics",
    ],
    queryCanaries: [
      {
        query: "TranslationBinding t-params AUR4000 AUR4001 AUR4002",
        summary:
          "i18n TranslationBinding lifecycle issues should route through explicit i18n/template diagnostics.",
      },
      {
        query: "translation key binding parameter binding same target element",
        summary:
          "Translation parameter joins need rendered binding products before generic diagnostic projection.",
      },
      {
        query: "I18nKeyEvaluationResult bridge role evidence I18nService evaluate translation key",
        summary:
          "i18n key-evaluation bridge-role questions should route to the translation-binding lifecycle and key-evaluation substrate.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/i18n/translation-binding-issues.ts",
        symbolName: "I18nTranslationBindingIssueMaterializer",
        role: "primary",
        summary:
          "Semantic-runtime materializer for TranslationBinding.create/bind diagnostics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/i18n/framework-error-code.ts",
        symbolName: "I18nTranslationBindingFrameworkErrorCode",
        role: "grounding",
        summary:
          "Exact framework error-code links for AUR4000, AUR4001, and AUR4002.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/i18n/README.md",
        role: "supporting",
        summary:
          "I18n substrate boundary notes keep translation-key catalog completion separate from translation-binding lifecycle diagnostics.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/i18n-translation-binding-errors",
        role: "supporting",
        summary:
          "Synthetic pressure fixture for i18n TranslationBinding lifecycle framework-error cases.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkErrors,
        projection: "diagnostic-codes",
        filters: { packageId: "i18n" },
        role: "grounding",
        summary:
          "Framework i18n diagnostic codes ground translation-binding issue authority.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "i18n", "template", "diagnostics"],
        role: "grounding",
        summary:
          "Durable memory keeps i18n lifecycle diagnostics separate from generic template binding flow.",
      },
    ],
    authority: [
      "Aurelia i18n TranslationBinding framework behavior and error codes.",
      "Rendered template binding products that identify translation key and parameter bindings on the same target.",
      "Shared semantic-runtime app/template diagnostic projection.",
    ],
    cautions: [
      "Keep translation-key catalog completion separate from translation-binding lifecycle diagnostics.",
      "Do not add an i18n-specific public API row before shared template/app diagnostics can surface the issue.",
      "Translation parameter joins should follow rendered binding products rather than string-matching template text.",
    ],
    nextQuestions: [
      "Is the pressure catalog completion, rendered key binding, parameter binding, or lifecycle diagnostic publication?",
      "Which rendered binding products prove the same target element join?",
      "Which exact i18n framework error code owns the diagnostic?",
    ],
    relatedRouteIds: [
      "diagnostics.framework-error-grounding",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.observation.binding-flow",
    ],
  },
  {
    id: "semantic-runtime.state.store-configuration",
    title: "State Store Configuration",
    summary:
      "Route @aurelia/state store configuration, state binding syntax, store lookup issues, and exact raw framework Error authority through the state plugin substrate.",
    domains: ["semantic-runtime", "state", "configuration", "diagnostics", "binding", "authoring"],
    roles: ["orient", "analyze", "verify", "author"],
    terms: [
      "@aurelia/state",
      "StateDefaultConfiguration",
      "StateStores",
      "StateIssues",
      "state store",
      "state store configuration",
      "withStore",
      "IStore",
      "IStoreRegistry",
      "fromState",
      "state-store-list",
      "store item source parameter",
      "store collection source parameter",
      "store-item",
      "store-collection",
      "store-domain-model",
      "state binding command",
      "dispatch binding command",
      "state binding behavior",
      "raw Error authority",
    ],
    queryCanaries: [
      {
        query: "state store StateDefaultConfiguration withStore",
        summary:
          "State plugin store builder questions should route to explicit @aurelia/state products instead of generic configuration.",
      },
      {
        query: "fromState state binding command missing store",
        summary:
          "State lookup diagnostics need post-template state binding products and store-registry semantics.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/state/state-store-materialization.ts",
        symbolName: "StateStoreConfigurationMaterializationProjectPass",
        role: "primary",
        summary:
          "Materializes valid StateDefaultConfiguration.init(...) and .withStore(...) builder products plus state issue products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/state/store-lookup-issues.ts",
        symbolName: "StateStoreLookupIssueMaterializer",
        role: "supporting",
        summary:
          "Materializes missing named-store lookup failures from @fromState(...), state/dispatch commands, and state binding behavior arguments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/state/framework-raw-error-authority.ts",
        symbolName: "StateRawErrorAuthority",
        role: "grounding",
        summary:
          "Exact raw @aurelia/state Error authority links for builder, decorator, and store-registry failures.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/state-projections.ts",
        symbolName: "readStateStoreRows",
        role: "supporting",
        summary:
          "Public StateStores/StateIssues API projections consumed by authoring orientation and diagnostics.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/state/README.md",
        role: "grounding",
        summary:
          "State substrate boundary notes keep plugin-backed stores distinct from DI-owned state classes.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkErrors,
        projection: "semantic-raw-references",
        filters: { packageId: "state" },
        role: "grounding",
        summary:
          "Framework raw Error authority rows ground @aurelia/state diagnostics.",
      },
      {
        kind: "framework-corpus",
        projection: "fixture-seeds",
        query: "@aurelia/state StateDefaultConfiguration withStore",
        role: "pressure",
        summary:
          "State docs/tests provide promoted store configuration and state binding examples before recipe authoring.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "state", "configuration", "framework-errors"],
        role: "grounding",
        summary:
          "Durable memory keeps @aurelia/state plugin products separate from ordinary DI-owned state.",
      },
    ],
    authority: [
      "Aurelia state package source, especially StateDefaultConfiguration, decorators, binding commands, and StoreRegistry.",
      "Semantic-runtime StateStores/StateIssues products and exact raw Error authority rows.",
      "Framework docs/tests as pressure for generated or contrastive state-plugin fixtures.",
    ],
    cautions: [
      "@aurelia/state is plugin-backed framework state, not a replacement name for DI-owned state classes.",
      "Do not add state-binding diagnostics before template runtime products expose the relevant binding syntax and store names.",
      "Raw framework Error authority should stay exact; do not invent synthetic AUR codes for state package throws.",
    ],
    nextQuestions: [
      "Is the pressure valid store configuration, state binding syntax, missing store lookup, or raw Error authority?",
      "Does this authoring lane require plugin-backed global state, or would a DI-owned state class remain the recommendable default?",
      "Which docs/tests state examples should become generated fixtures versus contrastive pressure fixtures?",
    ],
    relatedRouteIds: [
      "authoring.forms.fixture-flywheel",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.observation.binding-flow",
    ],
  },
  {
    id: "semantic-runtime.fetch-client.configuration-diagnostics",
    title: "Fetch Client Configuration Diagnostics",
    summary:
      "Route @aurelia/fetch-client HttpClient.configure(...), RetryInterceptor, exact AUR50xx diagnostics, and fetch-client issue projection through the fetch-client substrate.",
    domains: ["semantic-runtime", "fetch-client", "diagnostics", "framework-errors", "plugins"],
    roles: ["orient", "analyze", "verify", "document"],
    terms: [
      "@aurelia/fetch-client",
      "fetch-client",
      "fetch client",
      "IHttpClient",
      "HttpClient",
      "HttpClient.configure",
      "HttpClientConfiguration",
      "RetryInterceptor",
      "withRetry",
      "withInterceptor",
      "AUR5000",
      "AUR5001",
      "AUR5002",
      "AUR5003",
      "AUR5004",
      "AUR5005",
      "AUR5007",
      "AUR5008",
      "fetch-client issues",
      "fetch-client-issues",
      "fetch client diagnostics",
      "configure invalid return",
      "configure invalid config",
      "configure invalid header",
      "retry interceptor not last",
      "more than one retry interceptor",
      "invalid retry strategy",
      "exponential retry interval",
      "host fetch availability",
      "interceptor chain execution",
    ],
    queryCanaries: [
      {
        query: "fetch client HttpClient.configure RetryInterceptor diagnostics AUR5004",
        summary:
          "Fetch-client configuration diagnostics should route to the explicit fetch-client substrate, not generic plugin or form work.",
      },
      {
        query: "IHttpClient service backed app fetch client authoring boundary",
        summary:
          "Service-backed app questions that mention IHttpClient should surface the current fetch-client diagnostic boundary before authoring invents a recipe.",
      },
      {
        query: "retry interceptor not last invalid retry strategy fetch-client-issues",
        summary:
          "Retry policy diagnostics should route through fetch-client issues and framework error grounding.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fetch-client/fetch-client-source-issue-materializer.ts",
        symbolName: "FetchClientSourceIssueMaterializer",
        role: "primary",
        summary:
          "Materializes the closed static subset of HttpClient.configure(...) and RetryInterceptor source diagnostics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fetch-client/framework-error-code.ts",
        symbolName: "FetchClientFrameworkErrorCode",
        role: "grounding",
        summary:
          "Exact @aurelia/fetch-client AUR50xx framework error-code links.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/fetch-client-projections.ts",
        symbolName: "readFetchClientIssueRows",
        role: "supporting",
        summary:
          "Public FetchClientIssues row projection consumed by app diagnostics and pressure scripts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-diagnostics.ts",
        symbolName: "fetchClientAppDiagnosticRow",
        role: "supporting",
        summary:
          "AppDiagnostics projection for fetch-client source-backed issue rows.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/fetch-client/README.md",
        role: "grounding",
        summary:
          "Fetch-client substrate boundary notes, claimed AUR50xx authorities, and intentionally unclaimed lanes.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/fetch-client-config-errors",
        role: "pressure",
        summary:
          "Pressure fixture for source-backed fetch-client configuration diagnostics.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkErrors,
        projection: "diagnostic-codes",
        filters: { packageId: "fetch-client" },
        role: "grounding",
        summary:
          "Framework fetch-client error-code rows ground the admitted diagnostics and the intentionally unclaimed cases.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "fetch-client", "diagnostics", "framework-errors"],
        role: "grounding",
        summary:
          "Durable memory keeps fetch-client diagnostics separate from service-backed authoring recommendations.",
      },
    ],
    authority: [
      "Aurelia fetch-client package source and exact AUR50xx framework error codes.",
      "Semantic-runtime FetchClientIssue products and AppDiagnostics projection.",
      "Pressure fixtures for static configuration and retry-policy diagnostics.",
    ],
    cautions: [
      "This lane is diagnostic substrate, not an authoring recommendation by itself.",
      "Do not generate fetch-client usage only because a service-backed recipe exists; positive authoring needs a separate recipe and expected effects.",
      "Keep host fetch availability and live interceptor-chain execution separate until semantic-runtime admits those products.",
    ],
    nextQuestions: [
      "Is the pressure static configuration, retry policy, host fetch availability, live interceptor execution, or public diagnostic wording?",
      "Which exact AUR50xx code owns the issue, and is it already claimed in FetchClientFrameworkErrorCode?",
      "Does an app-building request need a fetch-client recipe, or only guidance that service boundaries can later use IHttpClient?",
    ],
    relatedRouteIds: [
      "diagnostics.framework-error-grounding",
      "mcp.developer-preview-shell",
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.evaluator.world-construction",
    ],
  },
  {
    id: "diagnostics.template-repair-policy",
    title: "Template Diagnostic Repair Policy",
    summary:
      "Route weak owner typing, missing member, assignment strictness, source-route, and diagnostic action-target pressure through the shared template diagnostic policy.",
    domains: ["diagnostics", "template", "type-system", "repair", "source-provenance"],
    roles: ["orient", "analyze", "verify", "document"],
    terms: [
      "template diagnostics",
      "cursor diagnostics",
      "file diagnostics",
      "weak owner",
      "weak-owner diagnostics",
      "weak expression member owner",
      "weak-expression-member-owner",
      "expression-member-owner-type:any",
      "expression-member-owner-type:index-signature-only",
      "missing expression member",
      "missing-expression-member",
      "selected member missing",
      "source route",
      "source-route",
      "owner type source",
      "value-producing source route",
      "repair cluster",
      "repair clusters",
      "action target",
      "diagnostic suggestion",
      "replace any owner",
      "declare explicit member",
      "scope slot type",
      "missing slot type",
      "binding assignment strictness",
    ],
    queryCanaries: [
      {
        query: "weak expression member owner any source route repair planning",
        summary:
          "Weak-owner repair/source-route pressure should route to template diagnostic policy before generic authoring repair loops.",
      },
      {
        query: "expression-member-owner-type:any action target",
        summary:
          "Any-owner diagnostics need source-route/action-target policy, not autocomplete fallback.",
      },
      {
        query: "missing-expression-member declare explicit member",
        summary:
          "Missing member diagnostics should route through the same diagnostic repair policy as weak owner rows.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/template-diagnostic-policy.ts",
        symbolName: "weakOwnerDiagnostic",
        role: "primary",
        summary:
          "Weak owner diagnostic row and suggestion policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/template-completion.ts",
        symbolName: "readSemanticTemplateDiagnostics",
        role: "primary",
        summary:
          "File/app-locus template diagnostic reader that lifts cursor diagnostic policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/expression-member-owner-projector.ts",
        symbolName: "CheckerExpressionMemberOwnerProjector",
        role: "supporting",
        summary:
          "TypeChecker member-owner projection used by cursor, completion, and diagnostic pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/type-shape.ts",
        symbolName: "checkerTypeReferenceWithSource",
        role: "supporting",
        summary:
          "Carries value-producing source routes for source-independent weak types such as any.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-diagnostics",
        role: "pressure",
        summary:
          "Focused semantic contract for weak-owner diagnostics, source routes, and binding-assignment repair targets.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/weak-owner-repair-planning",
        role: "pressure",
        summary:
          "Pressure fixture for missing slot types, any owners, index-signature-only owners, and source-backed repair targets.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "diagnostics", "template", "type-system"],
        role: "grounding",
        summary:
          "Durable memory tracks weak-owner diagnostics as TypeChecker/source-route pressure rather than authoring theatre.",
      },
    ],
    authority: [
      "TypeScript checker owner/member facts and semantic-runtime value-producing source routes.",
      "Template diagnostic policy that turns weak or missing owner/member facts into structured suggestions.",
      "Focused semantic contracts and synthetic fixtures before external app pressure is generalized.",
    ],
    cautions: [
      "Do not treat weak typing as an autocomplete failure; it can be the correct diagnostic outcome.",
      "Do not cluster repair pressure without preserving concrete action-target source when one exists.",
      "Do not add local TypeChecker walks in diagnostics when CheckerExpressionTypeEvaluator or CheckerExpressionMemberOwnerProjector should own the fact.",
    ],
    nextQuestions: [
      "Is this diagnostic missing a source route, an owner/member projection, or only a policy/suggestion shape?",
      "Can an in-repo weak-owner fixture isolate the pressure before external app sampling?",
      "Which query locus needs the diagnostic: cursor, file, app, authoring orientation, or repair plan?",
    ],
    relatedRouteIds: [
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.binding-scope",
      "semantic-runtime.inquiry-query-claim-graph",
      "diagnostics.framework-error-grounding",
      "authoring.forms.fixture-flywheel",
    ],
  },
  {
    id: "diagnostics.framework-error-grounding",
    title: "Framework Error Code Grounding",
    summary:
      "Use Aurelia framework error/event codes as systematic completeness canaries for semantic-runtime diagnostics and missing framework semantics.",
    domains: ["diagnostics", "framework-errors", "completeness", "authoring"],
    roles: ["orient", "analyze", "verify", "document"],
    terms: [
      "error codes",
      "diagnostics",
      "framework errors",
      "framework error code",
      "autocomplete",
      "suggestions",
      "autofixes",
      "weak typings",
      "weak typings diagnostics",
      "source-backed issue publication",
      "runtime binding behavior diagnostics",
      "i18n translation binding diagnostics",
      "framework api issue",
    ],
    queryCanaries: [
      {
        query: "AUR0652",
        summary:
          "Exact framework error labels should route directly to diagnostic grounding.",
      },
      {
        query: "AUR0813",
        summary:
          "Promise invalid usage should route to diagnostic grounding while related routes expose template-controller semantics.",
      },
      {
        query: "AUR0654",
        summary:
          "SelectValueObserver array/non-multiple errors should route to diagnostic grounding while related routes expose observation binding flow.",
      },
      {
        query: "framework error code",
        summary:
          "Framework error codes are a systematic completeness lane, not incidental diagnostics.",
      },
      {
        query: "weak typings diagnostics",
        summary:
          "Weak typings should often produce structured diagnostics instead of failed autocomplete expectations.",
      },
    ],
    anchors: [
      {
        kind: "lens",
        lensId: LensId.FrameworkErrors,
        projection: "summary",
        role: "grounding",
        summary:
          "Framework error/event code lens is the systematic source for diagnostic coverage pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-diagnostics.ts",
        symbolName: "appDiagnosticRows",
        role: "primary",
        summary:
          "Semantic-runtime diagnostics should turn weakly typed template/app situations into explainable user feedback.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/issue-publication.ts",
        symbolName: "publishIssueProduct",
        role: "supporting",
        summary:
          "Shared product publication primitive for source-backed semantic diagnostics.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "diagnostics", "framework-errors", "authoring"],
        role: "grounding",
        summary:
          "Memory tracks the directive to use framework error codes as a driver, not just external app pressure.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "kernel", "diagnostics", "kernel-publication"],
        role: "grounding",
        summary:
          "Source-backed issue publication memory should route to diagnostic grounding and kernel publication together.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "binding", "runtime-html", "framework-errors"],
        role: "supporting",
        summary:
          "Runtime binding-behavior issue memory belongs to framework-error grounding after binding products are available.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "evaluation", "framework-errors", "framework-api", "kernel-api", "metadata-api"],
        role: "supporting",
        summary:
          "Source-local framework API issue memory belongs to diagnostics as a projection consumer.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "i18n", "template", "diagnostics"],
        role: "supporting",
        summary:
          "i18n TranslationBinding diagnostics should stay framework-error-grounded while keeping i18n ownership explicit.",
      },
    ],
    authority: [
      "Aurelia package error/event code definitions and usage sites.",
      "semantic-runtime diagnostics and suggested repair capability.",
      "Framework docs/tests and synthetic fixtures when external apps do not isolate a case cleanly.",
    ],
    cautions: [
      "Do not rely on external app pressure alone; framework error codes are the driving inventory.",
      "Diagnostic rows should carry enough structured information to support later suggestions or autofixes.",
      "Weak typings may be the correct diagnostic outcome, not an autocomplete failure.",
    ],
    nextQuestions: [
      "Which error-code families are statically detectable with existing semantic-runtime machinery?",
      "Which codes expose missing parser, compiler, router, DI, or evaluator substrates?",
      "What structured repair hints should the diagnostic carry?",
    ],
    relatedRouteIds: [
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.resource-style-dependencies",
      "router.viewport.authoring-semantics",
      "authoring.forms.fixture-flywheel",
    ],
  },
  {
    id: "semantic-runtime.kernel-memory.representation",
    title: "Semantic Runtime Kernel Memory Representation",
    summary:
      "Route kernel/product-detail/hot-detail/query-claim memory pressure through telemetry before changing representation, retention, or handle policy.",
    domains: [
      "semantic-runtime",
      "kernel",
      "performance",
      "memory",
      "product-details",
      "hot-details",
      "telemetry",
      "inquiry",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "document"],
    terms: [
      "kernel memory",
      "memory pressure",
      "product detail memory",
      "product-detail memory",
      "product detail envelope",
      "product-detail envelope",
      "product detail representation",
      "hot detail memory",
      "hot-detail memory",
      "hot detail representation",
      "handle density",
      "handle characters",
      "envelope echo",
      "detail density",
      "detail-density",
      "query local products",
      "answer local kernel",
      "kernel mark dispose",
      "kernel product detail memory envelope handles performance",
    ],
    queryCanaries: [
      {
        query: "kernel product detail memory envelope handles performance",
        summary:
          "The current telemetry frontier should route to kernel representation instead of missing and forcing manual memory:next spelunking.",
      },
      {
        query: "product detail envelope echo handle density",
        summary:
          "Envelope-handle echo pressure belongs to product-detail representation and inquiry-depth policy.",
      },
      {
        query: "hot detail memory query local products",
        summary:
          "Hot-detail and query-local product pressure should route through kernel sidecar and query-claim ownership.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/product-details.ts",
        symbolName: "ProductDetailCatalog",
        role: "primary",
        summary:
          "ProductDetailCatalog owns typed product details keyed by committed MaterializedProduct handles.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/hot-details.ts",
        symbolName: "HotDetailCatalog",
        role: "primary",
        summary:
          "HotDetailCatalog owns epoch-local typed details that should not become durable product envelopes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/store.ts",
        symbolName: "KernelStore",
        role: "primary",
        summary:
          "KernelStore owns record/product/detail/hot-detail storage, marks, disposal, and telemetry snapshots.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/telemetry/detail-density.ts",
        symbolName: "semanticRuntimeDetailShape",
        role: "pressure",
        summary:
          "Detail-density telemetry distinguishes direct string mass, handle-shaped fields, local-key mass, and envelope echoes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimGraph",
        role: "supporting",
        summary:
          "QueryClaimGraph owns answer-boundary retention/disposal decisions before query-local facts become durable kernel products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-policy.ts",
        symbolName: "queryClaimRetentionPolicyForProfile",
        role: "supporting",
        summary:
          "Inquiry-profile policy decides whether answer-local kernel slices are retained or disposed after the public answer.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/kernel/README.md",
        role: "grounding",
        summary:
          "Kernel docs describe record families, product details, hot details, and mark/dispose lifetimes.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/telemetry/README.md",
        role: "grounding",
        summary:
          "Telemetry docs describe detail-density interpretation and its limits as heap evidence.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/inquiry/README.md",
        heading: "Query Claims",
        role: "grounding",
        summary:
          "Query-claim docs explain lazy answer storage and answer-local kernel disposal policy.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "kernel", "product-details", "inquiry"],
        role: "grounding",
        summary:
          "Memory records intentional product-detail catalog shape and representation cautions.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "kernel", "hot-details", "performance"],
        role: "grounding",
        summary:
          "Memory records hot-detail sidecar lifetime and when it should replace durable product envelopes.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "inquiry", "api", "performance"],
        role: "supporting",
        summary:
          "Memory records QueryClaimGraph as the answer-boundary store for query-local work.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry",
        role: "pressure",
        summary:
          "Profile app-open/query memory and kernel growth before changing representation.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas pressure:product-architecture",
        role: "pressure",
        summary:
          "Check semantic-runtime record construction, large classes, and detail-density module pressure.",
      },
    ],
    authority: [
      "Measured app telemetry and detail-density rows before speculative memory refactors.",
      "Kernel product/detail/hot-detail lifetimes and QueryClaimGraph retention policy.",
      "User guidance that CPU/memory trade-offs must be explicit in inquiry algebra and code, not hidden behind caches.",
    ],
    cautions: [
      "Do not drop navigable handles just because detail-density reports logical string mass; distinguish representation cost from exact heap ownership.",
      "Do not add another cache when a query-claim retention/disposal policy would express the lifetime more honestly.",
      "Do not split classes or helpers only to hide pressure from Atlas; check whether a real second lifetime or owner exists.",
    ],
    nextQuestions: [
      "Is the pressure app-world construction, query-time projection, process-local dependency cache, or public answer payload?",
      "Are product details echoing envelope handles because callers need them, or because the detail shape copied the envelope mechanically?",
      "Should this fact be a durable product detail, a hot detail owned by another product, or query-local claim state?",
      "Which inquiry profiles need the expensive projection fast, and which can recompute or use available products?",
    ],
    relatedRouteIds: [
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.template-recursive-rendering",
      "atlas.source-analysis.substrate",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "atlas.work-router.self-improvement",
    title: "Atlas Work Router Self Improvement",
    summary:
      "Improve Atlas routing, memory, corpus, and source-analysis substrates when future agents cannot quickly find the right existing capability or route.",
    domains: ["atlas", "work-router", "memory", "inquiry", "analysis-substrate"],
    roles: ["orient", "refactor", "document", "improve-atlas", "verify"],
    terms: [
      "work router",
      "atlas memory",
      "inquiry algebra",
      "ontology",
      "route",
      "route plan",
      "route matching",
      "route scoring",
      "route row contracts",
      "route next questions",
      "memory next",
      "current workset",
      "dirty files",
      "worktree",
      "memory next current workset dirty files route plan",
      "continuation",
      "duplicate helpers",
      "source provenance",
      "context compression",
    ],
    queryCanaries: [
      {
        query: "work router",
        summary:
          "Self-routing failures should land on Atlas work-router improvement before manual spelunking.",
      },
      {
        query: "duplicate helpers",
        summary:
          "Duplicate helper pressure should remain visible without encouraging cosmetic wrapper extraction.",
      },
      {
        query: "work router source provenance",
        summary:
          "Provenance precision gaps should route to Atlas substrate work rather than local fallbacks.",
      },
      {
        query: "context compression",
        summary:
          "Compaction survival is part of the Work Router and memory ergonomics mandate.",
      },
      {
        query: "memory next current workset dirty files route plan",
        summary:
          "Autonomous-loop checkpoints need to route current workset and memory-next ergonomics back to the Work Router substrate.",
      },
      {
        query: "work router matching scoring row contracts next questions",
        summary:
          "The Work Router's own support modules should be routed as first-class substrate, not found by grep after compaction.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-work-router-route-catalog.ts",
        symbolName: "ATLAS_WORK_ROUTES",
        role: "primary",
        summary:
          "Typed route catalog and route-owned ontology; weak matches should usually become changes here.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-work-router-lenses.ts",
        symbolName: "answerAtlasWorkRouter",
        role: "primary",
        summary:
          "The router lens should expose its own weak matches and missing anchors as improvement pressure.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-work-router-matching.ts",
        symbolName: "scoredRoutesForFilters",
        role: "primary",
        summary:
          "Route query/filter scoring, exact anchor matching, weak-text suppression, and path matching policy.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-work-router-rows.ts",
        role: "primary",
        summary:
          "Public Work Router row/value contracts used by the lens and printable CLI surface.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-work-router-next-questions.ts",
        symbolName: "routeNextQuestions",
        role: "supporting",
        summary:
          "Route-owned follow-up-question policy that turns matched pressure into sharper next inquiries.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/atlas-memory-lenses.ts",
        role: "supporting",
        summary:
          "Atlas memory remains the durable store; router should join it rather than becoming a second task database.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-corpus-lenses.ts",
        role: "supporting",
        summary:
          "Framework corpus lenses supply docs/tests pressure that router routes should make cheap to find.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasMemory,
        projection: "next",
        role: "grounding",
        summary:
          "Memory next actions remain a live source of pressure; router adds typed route context around them.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasSelf,
        projection: "summary",
        role: "pressure",
        summary:
          "Atlas self pressure should catch router growth, shallow wrappers, duplicate helpers, and source-provenance drift.",
      },
      {
        kind: "memory",
        domains: ["atlas", "memory", "work-router", "analysis-substrate"],
        role: "grounding",
        summary:
          "Durable memory captures why the router exists and where its ergonomics are still weak.",
      },
    ],
    authority: [
      "Typed structural anchors before text search.",
      "Atlas memory as durable intent and frontier store.",
      "Atlas self/product architecture pressure when route implementation obscures actual code quality.",
      "User steering that routing failure is substrate pressure, not a reason to ask for manual instructions.",
    ],
    cautions: [
      "Do not replace understanding with lint-the-lens refactors that hide complexity behind one-off wrappers.",
      "Do not create a second accidental storage system unless its ownership differs intentionally from memory JSON and markdown docs.",
      "Every weak-text hit should be a candidate for a new route term, anchor, or ontology correction.",
    ],
    nextQuestions: [
      "Which route matched weakly, and what structural anchor would have made it exact?",
      "Should this fact live in memory, route catalog, markdown, or source comments?",
      "Did a pressure lens encourage a cosmetic refactor rather than a real model improvement?",
    ],
    relatedRouteIds: [
      "semantic-runtime.evaluator.world-construction",
      "diagnostics.framework-error-grounding",
      "authoring.forms.fixture-flywheel",
      "atlas.source-analysis.substrate",
    ],
  },
  {
    id: "atlas.source-analysis.substrate",
    title: "Atlas Source Analysis Substrate",
    summary:
      "Route Atlas self-analysis, source-analysis performance, enum-usage indexing, lens-catalog contract shape, and context-economics work before product changes depend on missing visibility.",
    domains: [
      "atlas",
      "self-analysis",
      "source-analysis",
      "performance",
      "context-economics",
      "lens-catalog",
      "contracts",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "atlas source analysis",
      "atlas self analysis",
      "source-analysis",
      "self-analysis",
      "atlas.self",
      "context economics",
      "context-economics",
      "TypeScript enum usage index",
      "typescript enum usage",
      "enum usage index",
      "readTypeScriptEnumUsageIndex",
      "LensCatalog",
      "lens catalog",
      "lens-catalog",
      "contract strings",
      "source provenance",
      "product architecture field provenance",
      "atlas core analysis pressure",
      "profile atlas",
    ],
    queryCanaries: [
      {
        query: "atlas core analysis pressure",
        summary:
          "Atlas source-analysis pressure should route here instead of only surfacing as memory-next noise.",
      },
      {
        query: "typescript enum usage index",
        summary:
          "Enum usage index performance is an Atlas source-analysis substrate frontier.",
      },
      {
        query: "lens catalog contract strings",
        summary:
          "Lens catalog contract shape belongs to Atlas source/contract analysis, not Work Router task storage.",
      },
      {
        query: "context economics source analysis",
        summary:
          "Context-size pressure should start from the source-analysis substrate that compresses code understanding.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/self-analysis.ts",
        symbolName: "readAtlasSelfAnalysis",
        role: "primary",
        summary:
          "Atlas self-analysis is the main source-surface and pressure substrate for future autonomous refactors.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/source/enum-usage.ts",
        symbolName: "readTypeScriptEnumUsageIndex",
        role: "primary",
        summary:
          "TypeScript enum usage index is a measured source-analysis performance frontier.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/lens-catalog.ts",
        symbolName: "LensCatalog",
        role: "supporting",
        summary:
          "Lens catalog is a large contract catalog; source-analysis should explain its shape without treating size alone as a defect.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/self-contracts.ts",
        role: "supporting",
        summary:
          "Self contracts compare declared lens catalog projections to engine reachability and observed implementation branches.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasSelf,
        projection: "summary",
        role: "primary",
        summary:
          "Atlas self rows are the first read for source-analysis pressure and source-backed cleanup candidates.",
      },
      {
        kind: "memory",
        domains: [
          "atlas",
          "self-analysis",
          "source-analysis",
          "performance",
          "context-economics",
          "lens-catalog",
          "contracts",
        ],
        role: "grounding",
        summary:
          "Memory captures Atlas source-analysis, enum-usage, and lens-catalog pressure that must remain routeable.",
      },
      {
        kind: "memory",
        domains: ["atlas", "product-architecture", "semantic-runtime", "provenance"],
        role: "supporting",
        summary:
          "Product-architecture field-provenance pressure is an Atlas source-analysis lane as well as semantic-runtime publication guidance.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas pressure:self",
        role: "pressure",
        summary:
          "Compact self-analysis pressure read before Atlas source substrate refactors.",
      },
    ],
    authority: [
      "Atlas self-analysis and source-index phase profiles.",
      "Lens catalog contracts and engine reachability checks.",
      "User steering that tools should provide more information in fewer tokens before product work proceeds.",
    ],
    cautions: [
      "Do not refactor merely to make Atlas warnings disappear; check whether the model actually became clearer.",
      "LensCatalog size is catalog pressure, not automatically implementation pressure.",
      "Performance fixes should follow measured source-analysis phases rather than speculative cache points.",
    ],
    nextQuestions: [
      "Which source-analysis phase or contract row is blocking cheaper understanding?",
      "Is the pressure a performance hot path, a missing projection, or a misleading source-shape heuristic?",
      "Would a better Atlas lens remove more future work than a local semantic-runtime patch?",
    ],
    relatedRouteIds: [
      "atlas.work-router.self-improvement",
      "atlas.framework-corpus.navigation",
    ],
  },
  {
    id: "atlas.framework-corpus.navigation",
    title: "Framework Corpus Navigation",
    summary:
      "Improve docs/tests/framework corpus navigation so official docs and framework tests can seed fixtures, diagnostics, and authoring without bulk manual spelunking.",
    domains: ["atlas", "framework-corpus", "fixtures", "docs", "tests", "expected-effects"],
    roles: ["orient", "analyze", "author", "improve-atlas", "verify"],
    terms: [
      "framework corpus",
      "official docs",
      "official aurelia docs",
      "aurelia docs",
      "framework tests",
      "framework tests fixture seed",
      "fixture seeds",
      "fixture seed classification",
      "fixture seed classification expected effect broad concept hints",
      "classification reasons",
      "broad concept hints",
      "effect hints",
      "fixture seed query relevance",
      "expected effects",
      "docs navigation",
      "test examples",
    ],
    queryCanaries: [
      {
        query: "official aurelia docs",
        summary:
          "Official docs should route to corpus navigation as promoted-pattern pressure, not blind authority.",
      },
      {
        query: "framework tests fixture seed",
        summary:
          "Framework tests should be findable as behavior-grounding fixture seeds.",
      },
      {
        query: "expected effects",
        summary:
          "Fixture examples should connect to semantic expected effects instead of passive snapshots.",
      },
      {
        query: "fixture seed classification expected effect broad concept hints",
        summary:
          "Broad or surprising fixture seed hinting should route to corpus navigation and classifier substrate work.",
      },
      {
        query: "docs navigation",
        summary:
          "Docs navigation is an Atlas corpus ergonomics problem, not manual reading debt.",
      },
      {
        query: "fixture seed query relevance",
        summary:
          "Fixture seed relevance scoring should route to the shared corpus scorer rather than local query heuristics.",
      },
    ],
    anchors: [
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "summary",
        role: "primary",
        summary:
          "Corpus summary or row projections should be the first read before fixture/authoring expansion.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-corpus-analysis.ts",
        role: "primary",
        summary:
          "Corpus analysis owns concept extraction, fixture seed rows, and expected-effect joins.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-corpus-row-relevance.ts",
        symbolName: "frameworkCorpusFixtureSeedQueryScore",
        role: "primary",
        summary:
          "Shared fixture seed query relevance scorer used by corpus rows and Work Router route-owned corpus anchors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/authoring/expected-effect.ts",
        role: "grounding",
        summary:
          "Expected effects connect fixture examples to semantic-runtime behavior contracts.",
      },
      {
        kind: "memory",
        domains: ["framework-corpus", "fixtures", "authoring", "atlas"],
        role: "grounding",
        summary:
          "Memory records known gaps in docs/tests navigation and fixture seed ergonomics.",
      },
    ],
    authority: [
      "Aurelia official docs and framework tests as pressure sources with explicit seed-use policy.",
      "semantic-runtime expected-effect descriptors.",
      "Atlas corpus concept extraction and query relevance only when structural filters do not suffice.",
    ],
    cautions: [
      "Docs are voluminous and not always idiomatic; use them as promoted-pattern pressure, not unquestioned truth.",
      "Framework tests are behavior-grounding examples, not necessarily recommended authoring style.",
      "Corpus query noise should lead to stronger concept extraction or route anchors.",
    ],
    nextQuestions: [
      "Which concept/effect/recipe filter should narrow the corpus before reading snippets?",
      "Which classification reason admitted the seed, and is that reason concept-level or source-surface-level?",
      "Is this docs/test example recommended authoring, contrastive analysis, or behavior grounding?",
      "Which expected-effect descriptor would make the example semantically useful?",
    ],
    relatedRouteIds: [
      "authoring.forms.fixture-flywheel",
      "diagnostics.framework-error-grounding",
      "atlas.work-router.self-improvement",
    ],
  },
];

/** Read one route or throw on static catalog drift. */
export function findAtlasWorkRoute(routeId: string): AtlasWorkRoute {
  const route = ATLAS_WORK_ROUTES.find((entry) => entry.id === routeId);
  if (route === undefined) {
    throw new Error(`Unknown Atlas work route: ${routeId}`);
  }
  return route;
}
