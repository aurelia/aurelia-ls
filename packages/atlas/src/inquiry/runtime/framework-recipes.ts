import type { FrameworkDiscoveryFilters } from "./framework-filters.js";

/** Exact inquiry payload embedded in a framework discovery recipe. */
export interface FrameworkDiscoveryRecipeAsk {
  readonly lens: string;
  readonly locus?: unknown;
  readonly subject?: unknown;
  readonly projection: string;
  readonly filters?: Record<string, unknown>;
  readonly budget?: Record<string, unknown>;
  readonly page?: Record<string, unknown>;
}

/** One calibrated hop inside a framework discovery recipe. */
export interface FrameworkDiscoveryRecipeHop {
  readonly id: string;
  readonly purpose: string;
  readonly ask: FrameworkDiscoveryRecipeAsk;
  readonly read: readonly string[];
  readonly follow?: string;
}

/** A small hop graph that combines framework-specific projections with TypeScript IDE primitives. */
export interface FrameworkDiscoveryRecipeRow {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly domains: readonly string[];
  readonly flows: readonly string[];
  readonly startingPoint: string;
  readonly hops: readonly FrameworkDiscoveryRecipeHop[];
  readonly calibrationNotes: readonly string[];
}

/** Calibrated recipe examples for future Atlas sessions. */
export const FRAMEWORK_DISCOVERY_RECIPES: readonly FrameworkDiscoveryRecipeRow[] =
  [
    {
      id: "aurelia-startup-di-world",
      title: "Aurelia startup and DI world formation",
      question:
        "How does Aurelia.app/register/start enter the root container, AppRoot, configuration bundles, AppTasks, and DI relationship model?",
      domains: ["application", "configuration", "dependency-injection"],
      flows: ["startup", "world-formation", "plugin-configuration", "registration"],
      startingPoint:
        "Start with the startup flow seed, then jump to the runtime-html Aurelia class source and local call sites.",
      hops: [
        {
          id: "startup-flow-seeds",
          purpose:
            "Get the source-bound Aurelia facade seeds and exact source continuations.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "flow-seeds",
            filters: { flow: "startup" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSeeds[].anchorResolution.anchor.questions",
            "value.flowSeeds[].candidates[].file.repoPath",
            "continuations with ids ending in source or call-hierarchy",
          ],
          follow:
            "Follow the source continuation for runtime-html:Aurelia when you need the full class declaration.",
        },
        {
          id: "aurelia-class-facts",
          purpose:
            "Resolve the implementation class as a TypeChecker target and expose full declaration source ranges.",
          ask: {
            lens: "ts.type",
            locus: { kind: "repo" },
            subject: {
              scheme: "declaration",
              name: "Aurelia",
              kind: "class",
              packageId: "runtime-html",
            },
            projection: "facts",
            budget: { rows: 8, evidencePerSubject: 4 },
          },
          read: [
            "evidence[].source for declaration-sized source ranges",
            "continuations where inquiry.lens is ts.source",
          ],
          follow:
            "Follow the ts.source continuation whose range.filePath is aurelia/packages/runtime-html/src/aurelia.ts; increase textChars if truncated.",
        },
        {
          id: "aurelia-local-call-sites",
          purpose:
            "Read the local control-flow landmarks inside Aurelia startup without loading unrelated framework code.",
          ask: {
            lens: "ts.type",
            locus: {
              kind: "source-file",
              filePath: "aurelia/packages/runtime-html/src/aurelia.ts",
            },
            projection: "call-sites",
            budget: { rows: 40, evidencePerSubject: 3 },
          },
          read: [
            "value.callSites.callSites[].calleeName",
            "value.callSites.callSites[].signature",
            "evidence[].source for exact call expressions",
          ],
          follow:
            "Use source continuations for createContainer, registerResolver, AppRoot, createChild, register, and activate call sites.",
        },
        {
          id: "di-relationship-rollup",
          purpose:
            "Switch from source control flow to the indexed DI relationship atom model.",
          ask: {
            lens: "framework.di",
            locus: { kind: "repo" },
            projection: "summary",
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.relations",
            "value.mechanisms",
            "value.phases",
            "continuations into keys, providers, lookups, and materializations",
          ],
        },
        {
          id: "di-key-instantiations",
          purpose:
            "Jump from DI keys/provider routes to where keys enter runtime existence.",
          ask: {
            lens: "framework.materialization",
            locus: { kind: "repo" },
            projection: "instantiations",
            budget: { rows: 16, evidencePerSubject: 3 },
          },
          read: [
            "value.instantiations[].key",
            "value.instantiations[].instantiationKind",
            "value.instantiations[].provider.name",
            "value.instantiations[].constructionSites[].siteKind",
            "continuations into provider source and low-level construction source",
          ],
        },
        {
          id: "standard-configuration-admission",
          purpose:
            "See the evaluated StandardConfiguration bundle and what it admits into registration.",
          ask: {
            lens: "framework.admission",
            locus: { kind: "repo" },
            projection: "bundles",
            filters: { query: "StandardConfiguration" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.bundles[].associations",
            "associations linked to diInterface, resourceCarrier, or registryExport",
            "continuations into admission relationships and source",
          ],
        },
        {
          id: "app-task-lifecycle-surface",
          purpose:
            "Attach startup to lifecycle task registration and task queue surfaces.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "app-tasks",
            budget: { rows: 16, evidencePerSubject: 3 },
          },
          read: [
            "value.appTasks[].appTaskKinds",
            "value.appTasks[].appTaskCapabilities",
            "source/type continuations for AppTask and lifecycle hook rows",
          ],
        },
      ],
      calibrationNotes: [
        "Aurelia class facts may include declaration-file and source-file evidence; prefer the source-file continuation for implementation reading.",
        "File-scoped TypeScript call-site reads are much cheaper and more useful than broad package-wide call scans.",
        "Admission bundle rows are evaluator-backed; use them to avoid hard-coding the meaning of StandardConfiguration.",
      ],
    },
    {
      id: "compiler-instruction-rendering",
      title: "Template compiler to instruction dispatch to binding products",
      question:
        "How does template compilation produce instruction shapes, how are they dispatched to renderers, and which bindings/observers are created downstream?",
      domains: ["compiler", "instruction", "rendering", "resource"],
      flows: ["compilation", "instruction-emission", "instruction-consumption", "rendering"],
      startingPoint:
        "Start with compiler flow seeds, then read TemplateCompiler and the rendering graph projections.",
      hops: [
        {
          id: "compilation-flow-seeds",
          purpose:
            "Locate compiler anchors and their source-bound declaration ranges.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "flow-seeds",
            filters: { flow: "compilation" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSeeds[].anchorResolution.anchor.summary",
            "value.flowSeeds[].candidates[].file.repoPath",
            "call-edge and source continuations",
          ],
        },
        {
          id: "template-compiler-facts",
          purpose:
            "Resolve TemplateCompiler and get declaration-sized source ranges for implementation inspection.",
          ask: {
            lens: "ts.type",
            locus: { kind: "repo" },
            subject: {
              scheme: "declaration",
              name: "TemplateCompiler",
              kind: "class",
              packageId: "template-compiler",
            },
            projection: "facts",
            budget: { rows: 8, evidencePerSubject: 4 },
          },
          read: [
            "evidence[].source for the src/template-compiler.ts class range",
            "ts.source continuations for reading the declaration body",
          ],
          follow:
            "Follow the source continuation for aurelia/packages/template-compiler/src/template-compiler.ts with a larger textChars budget when you need the body.",
        },
        {
          id: "compiler-instruction-products",
          purpose:
            "Map compiler producers to emitted instruction rows before following them into renderer consumption.",
          ask: {
            lens: "framework.compiler",
            locus: { kind: "repo" },
            projection: "instruction-products",
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.instructionProducts[].producerKind",
            "value.instructionProducts[].productKind",
            "instructionName and instructionTarget",
            "continuations into rendering instruction dispatch and controller creation by instructionName",
          ],
        },
        {
          id: "instruction-dispatches",
          purpose:
            "Join instruction discriminator slots to renderer dispatch rows.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "instruction-dispatches",
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.instructionDispatches[].slotName",
            "value.instructionDispatches[].instructionName",
            "value.instructionDispatches[].rendererName",
            "binding-admission continuations for renderer-produced bindings",
          ],
        },
        {
          id: "rendering-relationships",
          purpose:
            "Normalize renderer, binding, and observation edges before choosing a source implementation to inspect.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "relationships",
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.renderingRelationships[].relation",
            "value.renderingRelationships[].mechanism",
            "value.renderingRelationships[].phase",
            "semantic continuations into instruction dispatches, binding products/effects, and observer catalogs",
          ],
        },
        {
          id: "binding-products",
          purpose:
            "Inspect binding classes, lifecycle methods, observer-locator parameters, and construction/admission links.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "binding-products",
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.bindingProducts[].lifecycleMethods",
            "value.bindingProducts[].observerLocatorParameters",
            "value.bindingProducts[].constructionProducts",
            "value.bindingProducts[].admissions",
          ],
          follow:
            "Follow source continuations for a binding class when lifecycle method names indicate the path you need.",
        },
        {
          id: "observer-lookup-effects",
          purpose:
            "Connect binding lifecycle/setup rows to ObserverLocator-style APIs.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "relationships",
            filters: { relation: "looks-up-observer" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.renderingRelationships[].from.name",
            "value.renderingRelationships[].to.name",
            "continuations into observer entities by capability and binding products by name",
          ],
        },
      ],
      calibrationNotes: [
        "Use rendering graph projections for relationship breadth before reading TemplateCompiler; the class body is large.",
        "Instruction dispatch rows are the compact bridge from compiler instruction shape to renderer implementation.",
        "Binding products intentionally join construction, lifecycle, and observer surfaces in one row.",
      ],
    },
    {
      id: "controller-resource-lifecycle",
      title: "Resource creation through Controller lifecycle and binding effects",
      question:
        "How do resource definitions enter hydration, controller lifecycle, binding admission, observer lookup, and lifecycle hook surfaces?",
      domains: ["resource", "rendering", "lifecycle", "binding"],
      flows: ["resource-definition", "hydration", "activation", "binding", "lifecycle-propagation"],
      startingPoint:
        "Start with hydration flow seeds and controller rendering structures, then branch to resources and binding effects.",
      hops: [
        {
          id: "hydration-flow-seeds",
          purpose:
            "Locate Controller, Rendering, AppRoot, and hydration-oriented source-bound anchors.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "flow-seeds",
            filters: { flow: "hydration" },
            budget: { rows: 16, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSeeds[].anchorResolution.anchor.label",
            "value.flowSeeds[].anchorResolution.anchor.questions",
            "source and call-hierarchy continuations",
          ],
        },
        {
          id: "controller-structure",
          purpose:
            "Find controller-shaped rendering/lifecycle exports and their source/type continuations.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "rendering-structures",
            filters: { renderingStructureKind: "controller" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.renderingStructures[].exportEntry.exportName",
            "value.renderingStructures[].renderingStructureKinds",
            "value.renderingStructures[].renderingCapabilities",
          ],
        },
        {
          id: "controller-class-facts",
          purpose:
            "Resolve Controller as an implementation class and expose the full declaration body continuation.",
          ask: {
            lens: "ts.type",
            locus: { kind: "repo" },
            subject: {
              scheme: "declaration",
              name: "Controller",
              kind: "class",
              packageId: "runtime-html",
            },
            projection: "facts",
            budget: { rows: 8, evidencePerSubject: 4 },
          },
          read: [
            "evidence source ranges for controller.ts",
            "source continuations for class body inspection",
          ],
          follow:
            "Follow the source continuation for aurelia/packages/runtime-html/src/templating/controller.ts when lifecycle recursion details are needed.",
        },
        {
          id: "controller-lifecycle-symbols",
          purpose:
            "Use document symbols as a cheap method map for controller activation/deactivation before reading method bodies.",
          ask: {
            lens: "ts.structure",
            locus: {
              kind: "source-file",
              filePath: "aurelia/packages/runtime-html/src/templating/controller.ts",
            },
            projection: "document-symbols",
            filters: { query: "activate" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.documentSymbols.symbols[].name",
            "value.documentSymbols.symbols[].span",
            "source continuations for whole method bodies",
          ],
          follow:
            "Follow activate/deactivate source continuations, then ask ts.type:call-hierarchy on that method range to see lifecycle callers/callees.",
        },
        {
          id: "custom-element-resources",
          purpose:
            "Read resource-definition rows that can create controller/viewmodel work.",
          ask: {
            lens: "framework.resources",
            locus: { kind: "repo" },
            projection: "convergence",
            filters: { resourceKind: "custom-element" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.convergenceRows[].resourceKind",
            "value.convergenceRows[].resourceName",
            "value.convergenceRows[].targetName",
            "value.convergenceRows[].lanes",
            "source/type continuations for resource carriers",
          ],
        },
        {
          id: "resource-instantiations",
          purpose:
            "Jump from resource carriers to runtime/compiler/evaluator materialization sites.",
          ask: {
            lens: "framework.materialization",
            locus: { kind: "repo" },
            projection: "resource-instantiations",
            filters: { resourceKind: "custom-element" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.resourceInstantiations[].sourceExportName",
            "value.resourceInstantiations[].instantiationKind",
            "value.resourceInstantiations[].instantiationKinds",
            "value.resourceInstantiations[].materializationSites[].siteKind",
            "continuations into resource carrier source and materialization-site source",
          ],
        },
        {
          id: "controller-creations",
          purpose:
            "Jump from resource materialization into renderer hydration rows that create and admit child controllers.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "controller-creations",
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.controllerCreations[].resourceKind",
            "value.controllerCreations[].instructionName",
            "value.controllerCreations[].rendererName",
            "continuations into child-controller activation rows",
          ],
        },
        {
          id: "binding-admissions",
          purpose:
            "Find where renderer/resource code admits binding products into controller binding lists.",
          ask: {
            lens: "framework.rendering",
            locus: { kind: "repo" },
            projection: "binding-admissions",
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.bindingAdmissions[].producerName",
            "value.bindingAdmissions[].bindingName",
            "value.bindingAdmissions[].constructionKind",
            "source continuations for addBinding sites",
          ],
        },
        {
          id: "lifecycle-hook-surface",
          purpose:
            "Attach controller lifecycle work to public lifecycle hook/task exports.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "app-tasks",
            filters: { appTaskKind: "lifecycle-hook" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.appTasks[].appTaskKinds",
            "value.appTasks[].appTaskCapabilities",
            "source/type continuations for lifecycle hook rows",
          ],
        },
        {
          id: "observer-lookup-effects",
          purpose:
            "End the slice where binding lifecycle becomes observation/reactivity.",
          ask: {
            lens: "framework.discovery",
            locus: { kind: "repo" },
            projection: "binding-effects",
            filters: { effectKind: "observer-lookup" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.bindingEffects[].methodName",
            "value.bindingEffects[].effectName",
            "continuations into observer entities and exact source sites",
          ],
        },
      ],
      calibrationNotes: [
        "The rendering-structures catalog may return declaration-file rows before source rows; use Controller class facts when you need implementation body.",
        "Resource rows show public/exported resource carriers; binding admissions show where rendering turns products into controller-managed lifecycle participants.",
        "Observer lookup effects are the practical handoff point from binding lifecycle to reactivity.",
      ],
    },
    {
      id: "watcher-expression-effect-flow",
      title: "Watcher expressions and effect observation flow",
      question:
        "Where do @watch definitions, resource watch metadata, string/symbol watch expressions, watcher classes, effects, and slot watchers enter observation?",
      domains: ["observation", "reactivity", "watcher", "rename"],
      flows: ["watch-definition", "expression", "effect", "reactivity"],
      startingPoint:
        "Start from the observation lens rather than rendering; watcher setup is the bridge from resource metadata into expression-sensitive observation.",
      hops: [
        {
          id: "watch-definition-registry",
          purpose:
            "Separate decorator-time definition storage from the WeakMap-backed Watch registry and CE/CA metadata merge.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "flow-sites",
            filters: { relation: "reads-watch-definition" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSites[].surfaceKind for watch-registry, resource-watch-metadata, and watcher-setup",
            "value.flowSites[].siteKind for watch-definition-read and resource-watch-definition-merge",
            "value.flowSites[].source for exact registry/metadata/read sites",
          ],
        },
        {
          id: "watcher-setup-flow",
          purpose:
            "Read the createWatchers branch that turns function, string, and symbol watch definitions into watcher instances.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "flow-sites",
            filters: { surfaceKind: "watcher-setup" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSites[].siteKind for computed-watcher, expression-watcher, watch-expression-parse, and watch-access-scope-ast",
            "value.flowSites[].callSite.arguments for expression, callback, observerLocator, and scope/context carriers",
            "source continuations for the branch body before reasoning about rename cascades",
          ],
          follow:
            "Follow source continuations for watch-expression-parse or watch-access-scope-ast when calibrating expression rename behavior.",
        },
        {
          id: "watcher-runtime-flow",
          purpose:
            "Inspect ComputedWatcher and ExpressionWatcher evaluation, dependency collection, callback invocation, and queued execution.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "flow-sites",
            filters: { surfaceKind: "watcher" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSites[].siteKind for watcher-compute, watcher-dependency-enter, watcher-dependency-exit, watcher-dependency-clear, watcher-queue, and watcher-callback-invoke",
            "value.flowSites[].targetName for callback, scheduler, evaluator, and connectable mechanics",
            "continuations into ts.source for the exact watcher method body",
          ],
        },
        {
          id: "effect-runtime-flow",
          purpose:
            "Inspect Observation.run/watch and private effect runner rows that subscribe, clean up, and delegate expression/getter observation.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "flow-sites",
            filters: { surfaceKind: "effect" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSites[].siteKind for effect-watch-expression, effect-watch-getter, effect-subscribe, effect-cleanup, and effect-stop",
            "value.flowSites[].callSite.signature for ObserverLocator methods used by effect watching",
            "continuations into ts.source for Observation._doWatch and RunEffect methods",
          ],
        },
        {
          id: "watcher-expression-relationships",
          purpose:
            "Normalize expression-sensitive watcher/effect edges before deciding whether to inspect source or enter TypeScript rename APIs.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "relationships",
            filters: { relation: "parses-expression" },
            budget: { rows: 20, evidencePerSubject: 3 },
          },
          read: [
            "value.relationships[].from.name",
            "value.relationships[].to.name",
            "value.relationships[].source for exact parser/access-scope expression ranges",
          ],
        },
        {
          id: "slot-watcher-flow",
          purpose:
            "Keep slot watcher subscription separate from ordinary expression watchers.",
          ask: {
            lens: "framework.observation",
            locus: { kind: "repo" },
            projection: "flow-sites",
            filters: { surfaceKind: "slot-watcher" },
            budget: { rows: 12, evidencePerSubject: 3 },
          },
          read: [
            "value.flowSites[].siteKind for slot-watcher-subscribe, slot-watcher-unsubscribe, and slot-watcher notification",
            "source continuations for AuSlotWatcherBinding and SlottedLifecycleHooks",
          ],
        },
      ],
      calibrationNotes: [
        "Watcher string and symbol expressions are rename-sensitive carriers like template expressions, but Atlas currently exposes source-backed parse/access-scope/evaluation sites rather than closing string contents to view-model property symbols.",
        "Decorator storage, registry storage, resource metadata merge, watcher setup, and watcher runtime are separate surfaces because each can affect rename/materialization provenance differently.",
        "Function watchers and string/symbol watchers enter different construction paths; keep them separate when promoting future rename or materialization facts.",
        "Effect watching delegates to ObserverLocator through expression/getter branches and has cleanup/subscription semantics that should stay distinct from controller-managed watcher bindings.",
      ],
    },
  ];

/** Return recipes filtered by broad discovery dimensions. */
export function filterFrameworkDiscoveryRecipes(
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkDiscoveryRecipeRow[] {
  const query = filters.query?.toLowerCase();
  return FRAMEWORK_DISCOVERY_RECIPES.filter(
    (recipe) =>
      (filters.domain === undefined ||
        recipe.domains.includes(filters.domain)) &&
      (filters.flow === undefined || recipe.flows.includes(filters.flow)) &&
      (query === undefined ||
        recipe.id.toLowerCase().includes(query) ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.question.toLowerCase().includes(query)),
  );
}
