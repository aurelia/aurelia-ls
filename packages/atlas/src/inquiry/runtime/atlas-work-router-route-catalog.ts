import { LensId } from "../lens.js";
import type { AtlasWorkRoute } from "./atlas-work-router-contracts.js";

/** Static work-route catalog used by the atlas.work-router lens. */
export const ATLAS_WORK_ROUTES: readonly AtlasWorkRoute[] = [
  {
    id: "authoring.forms.fixture-flywheel",
    title: "Authoring Forms Fixture Flywheel",
    summary:
      "Use framework docs/tests and existing recipe pressure to expand form fixtures while keeping generated fixtures distinct from non-recommended analysis fixtures.",
    domains: ["authoring", "fixtures", "forms", "observation", "recipes"],
    roles: ["orient", "author", "analyze", "verify", "document"],
    terms: [
      "forms",
      "state-backed forms",
      "form recipe",
      "fixture flywheel",
      "expected semantic effects",
      "validation",
      "validate binding behavior",
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
      "native value binding",
      "native checked binding",
      "option model binding",
      "classificationKey native-value-binding",
      "classificationKey native-checked-binding",
      "classificationKey option-model-binding",
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
        classificationKey: "validation-binding-behavior",
        role: "grounding",
        summary:
          "Validation binding-behavior seeds ground validate application facts for validated form recipes.",
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
        command: "pnpm --filter @aurelia-ls/semantic-runtime smoke:service-backed-form",
        role: "supporting",
        summary:
          "Isolated source-plan smoke for DI service-layer and service-interaction form recipes.",
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
    ],
    anchors: [
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
        projection: "expected-effects",
        effectKind: "authoring-capability",
        role: "grounding",
        summary:
          "Authoring capability expected effects connect generated fixtures to semantic-runtime orientation contracts.",
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
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.evaluator.world-construction",
      "router.viewport.authoring-semantics",
      "atlas.work-router.self-improvement",
      "atlas.framework-corpus.navigation",
    ],
  },
  {
    id: "semantic-runtime.observation.binding-flow",
    title: "Observation And Binding Flow",
    summary:
      "Model binding and observer data flow through framework-shaped concepts before adding more fixture or authoring behavior.",
    domains: ["observation", "binding", "forms", "type-system", "template"],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "observer locator",
      "property binding",
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
      "binding behavior materializer",
      "runtime binding behavior",
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
    ],
    queryCanaries: [
      {
        query: "observer locator",
        summary:
          "Observer-locator questions should start from framework-shaped observation, not app-specific heuristics.",
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
        query: "runtime-expression-unassignable runtime-ast-errors binding source assignment",
        summary:
          "Runtime astAssign source-assignment pressure should route to binding data-flow before API diagnostic wording.",
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
          "packages/semantic-runtime/src/template/runtime-binding-behavior-materializer.ts",
        symbolName: "RuntimeBindingBehaviorMaterializer",
        role: "supporting",
        summary:
          "Binding-behavior bind-time effects consume rendered binding facts and publish binding diagnostics.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
        symbolName: "RuntimeBoundControllerValueTable",
        role: "supporting",
        summary:
          "Parent-to-child bound controller value table feeds binding-source evaluation across recursive rendering contexts.",
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
        lensId: LensId.FrameworkRendering,
        projection: "summary",
        role: "grounding",
        summary:
          "Rendering and instruction setup determine where bindings are materialized.",
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
      "authoring.forms.fixture-flywheel",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.type-system.expression-semantics",
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
      "Split large controller-like surfaces only along framework interfaces when that increases clarity.",
    ],
    nextQuestions: [
      "Which nested scope facts need to be carried from template-controller semantics into TypeChecker evaluation?",
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
      "href custom attribute",
      "href externality",
      "router href externality",
      "href click interception",
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
        filePath: "packages/semantic-runtime/src/authoring/routed-state-backed-form-recipe.ts",
        symbolName: "buildRoutedStateBackedFormPlan",
        role: "supporting",
        summary:
          "Current generated routed-form authoring recipe that consumes router semantics.",
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
        recipeKey: "routed-state-backed-form",
        role: "grounding",
        summary:
          "Router authoring should connect fixture seeds to the route expected-effect contract instead of only browsing examples.",
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
    domains: ["atlas", "framework-corpus", "fixtures", "docs", "tests"],
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
