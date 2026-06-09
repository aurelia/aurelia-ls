import { LensId } from "../lens.js";
import {
  AtlasWorkRouteCoverageDepth,
  AtlasWorkRouteCoverageDimension,
  AtlasWorkRouteCoverageState,
  type AtlasWorkRoute,
} from "./atlas-work-router-contracts.js";

/** Static work-route catalog used by the atlas.work-router lens. */
export const ATLAS_WORK_ROUTES: readonly AtlasWorkRoute[] = [
  {
    id: "semantic-runtime.app-builder-pattern-ontology",
    aliases: [
      "app-builder-pattern-ontology",
      "app-builder-read-only-ontology",
      "app-builder-source-lowering-invocation",
      "app-builder-source-lowering-composition",
      "app-builder-source-lowering-source-plan",
      "app-builder-part-source",
      "app-builder-control-manifest",
      "app-builder-style-input-boundary",
      "app-builder-generated-fixture-contracts",
      "app-builder-component-pair-app-shell-assembly",
      "app-builder-v1-scope-recalibration",
      "app-builder-v1-readiness",
      "app-builder-v1-substrate-gaps",
    ],
    title: "App Builder Pattern Ontology",
    summary:
      "Route current app-builder v1 work through the June 7 recalibration packet, AI-first ontology, target/readiness/detail surfaces, explicit source-lowering, SourcePlan effects, and generated fixture contracts. Older interviews are background texture, and the old starter/golden lane is intentionally absent.",
    domains: [
      "semantic-runtime",
      "app-builder",
      "ontology",
      "fixtures",
      "mcp",
      "controls",
      "binding",
      "accessibility",
      "web-standards",
      "component-manifest",
      "styling",
      "design-system",
      "recommendation-policy",
      "source-plan",
      "v1",
      "startup",
      "validation",
      "handoff",
    ],
    roles: ["orient", "author", "refactor", "document", "improve-atlas"],
    terms: [
      "app-builder",
      "app builder",
      "app-building pattern ontology",
      "pattern ontology",
      "reusable app-building patterns",
      "app-building algebra",
      "AI-first app builder",
      "AI-facing app builder",
      "token-saving app builder",
      "read-only app-builder ontology",
      "ontology-catalog",
      "target-catalog",
      "input-readiness",
      "input-contract-detail",
      "architecture-options",
      "architecture option menu",
      "requested app architecture options",
      "single-component-local-state",
      "di-state-component-section",
      "router-backed-list-detail-service",
      "app-builder-v1-scope-recalibration",
      "v1 scope recalibration",
      "app-builder v1 recalibration packet",
      "app-builder immediate v1 substrate gaps",
      "app-builder v1 scope recalibration with.bind startup validation handoff control affordance",
      "rung advancement over maintenance",
      "domain materialization",
      "materializeAppBuilderCallerDomainForTarget",
      "domainAssignmentIndexFrame",
      "domainMaterializedSlotFrame",
      "domainSlotAssignmentShapeIssues",
      "domainDerivedNameFrame",
      "affordance-detail",
      "application-pattern-detail",
      "applicationPatternDetailSelectionFrame",
      "applicationPatternDetailReadinessFrame",
      "applicationPatternDetailRowsFrame",
      "applicationPatternDetailSummaryFrame",
      "inputContractDetailsForApplicationPattern",
      "collection-concept-detail",
      "collection projection facets",
      "collection projection frame",
      "selectCollectionProjectionFrame",
      "selectCollectionTableColumnPayload",
      "collectionTableRenderedFrame",
      "collection-display-fields",
      "collection-table-columns",
      "collection-query-features",
      "control-pattern-detail",
      "controlPatternDetailSelectionFrame",
      "controlPatternDetailReadinessFrame",
      "controlPatternDetailRowsFrame",
      "controlPatternDetailSummaryFrame",
      "inputContractDetailsForControlPattern",
      "control-manifest-detail",
      "controlManifestDetailSelectionFrame",
      "controlManifestDetailReadinessFrame",
      "controlManifestDetailRowsFrame",
      "controlManifestDetailSummaryFrame",
      "inputContractDetailsForControlManifest",
      "effect-contract-detail",
      "effectContractDetailSelectionFrame",
      "effectContractDetailReadinessFrame",
      "effectContractDetailRowsFrame",
      "effectContractDetailSummaryFrame",
      "inputContractDetailsForAffordance",
      "policy-detail",
      "recommendation-policy",
      "recommendation-policy-detail",
      "style-detail",
      "styleDetailSelectionFrame",
      "styleDetailReadinessFrame",
      "styleDetailRowsFrame",
      "styleDetailSummaryFrame",
      "class-binding styling mechanism",
      "state-dependent class hooks",
      "source-lowering-preflight",
      "sourceLoweringPreflightSelectionFrame",
      "sourceLoweringPreflightReadinessFrame",
      "sourceLoweringPreflightRowsFrame",
      "sourceLoweringPreflightSummaryFrame",
      "source-lowering-invocation",
      "sourceLoweringInvocationPreflightFrame",
      "sourceLoweringInvocationTargetFrame",
      "lowerSourceLoweringInvocationTarget",
      "AppBuilderSourceLoweringInvocationRouteKind",
      "source-lowering-composition",
      "source-lowering-source-plan",
      "source-lowering-gallery",
      "fragmentGalleryFragmentSections",
      "fragmentGalleryControlLowerings",
      "fragmentGalleryCollectionLowerings",
      "fragmentGalleryStatusLowerings",
      "fragmentGalleryFormLowerings",
      "fragmentGallerySectionLowerings",
      "part-source-gallery",
      "appBuilderPartSourceGallerySourcePlanFrame",
      "appBuilderPartSourceGallerySourcePlanAssembly",
      "galleryAppSourceFrame",
      "galleryResourceDeclarationsSource",
      "galleryRouteAndServiceSource",
      "galleryRootAppClassSource",
      "gallerySharedTypesSource",
      "directSourcePlanTargetFrame",
      "direct SourcePlan target frame",
      "direct SourcePlan target preflight",
      "source-lowering-implemented",
      "SourceLoweringImplemented",
      "not-implemented source path",
      "source-lowering request fields",
      "focused source-lowering request fields",
      "surface-scoped request fields",
      "sourceLoweringRequestFieldSummary",
      "SourcePlan wrapper request fields",
      "source-plan placement request fields",
      "canRequestSourceLowering",
      "canContinueSourceLoweringSurface",
      "preflight author continuation request fields",
      "surface required request fields",
      "source-lowering surface",
      "target invocation",
      "fragment composition",
      "source plan preview",
      "sourceLoweringComponentPair",
      "custom element pair source plan",
      "component pair runnable app shell",
      "component-pair app-shell assembly",
      "component pair expected effects",
      "component pair project tooling",
      "component-pair local draft state",
      "component-pair demand-driven draft fields",
      "componentPairLocalViewModelStateFieldNames",
      "componentPairDirectSelection",
      "lowerComponentPairNestedSources",
      "lowerComponentPairLocalState",
      "componentPairFragments",
      "componentPairIssues",
      "componentPairSourcePlan",
      "componentPairAggregates",
      "appBuilderLocalViewModelFieldsForNames",
      "action inputFieldNames local state",
      "compact generated form-save hidden collection fields",
      "app section child composition",
      "AppBuilderApplicationPatternId.AppSection",
      "AppBuilderSourceLoweringCompositionKind.AppSection",
      "ChildCompositions",
      "childCompositions",
      "fulfilledContentComposition",
      "sourceLoweringCompositionChildSuppliedInputs",
      "nested composition supplied inputs",
      "nested target-scoped supplied inputs",
      "fulfilled content target-scoped visual hooks",
      "loading empty error nested collection table hooks",
      "lowerLoadingEmptyErrorStructuralParts",
      "loadingEmptyErrorSelectedInputs",
      "loadingEmptyErrorSelectionIssues",
      "loadingEmptyErrorReadyFrame",
      "loadingEmptyErrorRenderedFragments",
      "loadingEmptyErrorCompositionResult",
      "lowerAppSectionComposition",
      "component-pair-task-section-create-and-table",
      "component-pair-task-section-create-and-async-table",
      "component-pair-task-list-local-collection",
      "component-pair-task-card-local-collection",
      "component-pair-contact-card-string-id",
      "contact card string identity generated fixture",
      "non-task generated fixture",
      "non-task collection-card generated fixture",
      "component-pair-task-draft-field-variety",
      "CollectionDisplayFields generated fixture",
      "collection display fields generated fixture",
      "collection-list generated fixture",
      "collection-card generated fixture",
      "fieldControlSelections",
      "field-control selections",
      "fieldLabelContainerKind",
      "visualHookDescendantTagName",
      "leaf-control descriptor visual hook descendant",
      "leaf-control descriptor field label container",
      "fieldControlSourceSelectionFrame",
      "fieldControlRenderedFrame",
      "fieldGroupSelectionFrame",
      "fieldGroupRenderedFragments",
      "selectRequestedAccessibilityMessageKind",
      "selectInferredAccessibilityMessageKind",
      "native textarea range radio checkbox-list",
      "fieldset legend field group",
      "ControlAccessibility fieldName",
      "field-scoped accessibility messages",
      "AccessibilityHelpError fieldName",
      "UnknownFieldAccessibilityMessageField",
      "unknown-field-accessibility-message-field",
      "UnknownFieldVisualHookField",
      "unknown-field-visual-hook-field",
      "stale field-scoped input",
      "stale scoped fieldName",
      "VisualClassHooks fieldName",
      "form VisualClassHooks generated fixture",
      "FieldGroup VisualClassHooks targetRefs",
      "NativeSubmitForm FieldGroup target-scoped VisualClassHooks",
      "lowerNativeSubmitFormComposition",
      "nativeSubmitFormSelectionFrame",
      "nativeSubmitFormReadyFrame",
      "nativeSubmitFormRenderedFragments",
      "nativeSubmitFormCompositionResult",
      "generated-source-quality",
      "duplicate static template attributes",
      "trailing whitespace generated source quality",
      "duplicate class generated fixture",
      "aria-describedby generated field group",
      "di-state-class source lowering",
      "local-view-model-state source lowering",
      "routed collection detail source lowering",
      "app-builder pressure fixtures",
      "fixtures:app-builder-pressure",
      "app-builder generated fixtures",
      "app-builder generated fixture contracts",
      "app-builder generated fixture qualitative review",
      "app-builder generated fixture source shape review",
      "generated fixture qualitative review",
      "generated fixture source shape",
      "generated fixture source review",
      "fixtures:app-builder-generated",
      "materialize-app-builder-generated-fixtures",
      "sourceLoweringTargetRegistryCoverageRows",
      "sourceLoweringRequestFieldRegistryCoverageRows",
      "sourceLoweringRequestFieldRegistryCoverageSummary",
      "combined request-field coverage",
      "generated-app plus focused-pressure coverage",
      "source-lowering-target-ref coverage",
      "generated-control-use coverage",
      "collection table control-use",
      "collection-table boolean control-use",
      "collection list control-use",
      "collection-list boolean control-use",
      "collection card control-use",
      "collection-card boolean control-use",
      "selected-collection-field",
      "AppBuilderSourceLoweringBindingExpressionSource.SelectedCollectionField",
      "source-lowering request-field registry coverage",
      "unused source-lowering request fields",
      "unregistered used request fields",
      "source-plan selection request fields",
      "compositionKind request field coverage",
      "form-message target ref coverage",
      "static form message control-use boundary",
      "di-state-class generated fixture coverage",
      "part menu",
      "part source invocation",
      "part source lowering preview",
      "part-source gallery",
      "part-source primitive control lowerer",
      "choiceInputGroupElement",
      "selectElement",
      "choice option control source",
      "checkbox list source lowering",
      "radio group source lowering",
      "select option source lowering",
      "source-lowering gallery",
      "source-lowering authority",
      "bindingBehaviorHostElement",
      "binding behavior host element",
      "part-source gallery binding behavior host",
      "neutral part-source preview samples",
      "neutral sample resource names",
      "sample-card",
      "SampleCard",
      "sample-resource",
      "SampleResource",
      "defaultingCandidate",
      "defaulting candidate",
      "defaulting-candidate-policy",
      "defaulting candidate policy",
      "AppBuilderDefaultingCandidatePolicyScope",
      "APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS",
      "recommendation status policy",
      "recommendation applicability",
      "applicability context",
      "recommendation evidence",
      "evidence lane",
      "policy:app-builder-review",
      "write-app-builder-policy-review",
      "app-builder recommendation defaulting policy review",
      "source-lowering request field policy review",
      "policy review multiplicity",
      "applicability x2",
      "readiness applicability lanes",
      "source-plan-substrate evidence",
      "existing-app-analysis evidence",
      "framework-capability evidence",
      "control-manifest-contract evidence",
      "legacy-source-backed-authority",
      "source-backed authority canary",
      "status projection",
      "input-source-lowering-consumers",
      "sourceLoweringConsumerCount",
      "sourceLoweringConsumerRows",
      "includeSourceLoweringConsumers",
      "input facet source-lowering consumers",
      "facet consumed by source lowering",
      "input facet consumer continuations",
      "source-lowering consumer preflight continuation",
      "DomainActions source-lowering consumer",
      "DomainRelationships source-lowering consumer",
      "interview decision effect",
      "decision effect class",
      "effect horizon",
      "immediate invariant",
      "near canary",
      "structural lane",
      "roadmap frontier",
      "deferred polish",
      "decision bundle",
      "decision-bundle",
      "request-local decision bundle",
      "AppBuilderDecisionBundleSource",
      "appBuilderSuppliedInputsWithDecisionBundles",
      "appBuilderSuppliedInputsWithDecisionBundlesForTarget",
      "appBuilderSuppliedInputsForTarget",
      "target-scoped supplied input",
      "target-scoped decision bundle",
      "decision bundle targetRefs",
      "policy satisfaction target scope",
      "contextual source-lowering policy satisfaction",
      "policySatisfactionCandidates",
      "policy-satisfaction candidate rows",
      "contextual source-lowering candidates",
      "SourcePlanContribution",
      "SourcePlan metadata generated fixture",
      "SourcePattern metadata generated fixture",
      "sourcePlan.pattern generated fixture",
      "sourcePlan.pattern null generated fixture",
      "sourcePlanWitnessRows generated fixture",
      "route title generated fixture",
      "generated route title",
      "source naming copy policy",
      "human-facing copy generated source",
      "expected effects",
      "control use inventory",
      "native first control patterns",
      "visual input missing",
      "application design pattern",
      "collection list card table",
      "loading empty error",
      "promise valued property",
      "promiseExpression caller supplied",
      "async data source carrier",
      "promise class member carrier",
      "native submit form",
      "DomainCommandAction",
      "domain field value kind display",
      "field value kind display",
      "boolean display",
      "read-only boolean display",
      "checked.to-view",
      "generated checkbox control-use",
      "native-boolean-checkbox collection table",
      "native-boolean-checkbox collection list",
      "native-boolean-checkbox collection card",
      "raw true false interpolation",
      "collection empty state branch",
      "empty state else branch",
      "collection else",
      "empty table visible",
      "conditional else collection",
      "router backed empty state else",
      "routed list route empty branch",
      "field control id policy",
      "field group static id",
      "wrapped label field group",
      "duplicate DOM id generated form",
      "route identity lookup",
      "identity value kind lookup",
      "string identity lookup",
      "numeric identity route param",
      "generic String projection",
      "router-backed generated fixture load params",
      "generated inline load params fixture",
      "framework capabilities app-builder grounding",
      "custom-element source layout",
      "appBuilderCustomElementClassSource",
      "empty generated custom element class",
      "legacy fixture-shaped recipe pollution",
      "routed detail with.bind",
      "with.bind routed detail",
      "$parent.state",
      "relationship view binding taste",
      "runnable app startup root awareness",
      "index.html root selector mount target",
      "npx makes aurelia",
      "plugin conventions availability",
      "control affordance expansion",
      "semantic field affordance",
      "email input",
      "url input",
      "tel input",
      "password input",
      "search input",
      "display link affordance",
      "mailto display affordance",
      "validation policy floor",
      "native constraints validation library split brain",
      "central default labels messages copy",
      "LLM handoff seed local data handoff",
      "state plugin v1 posture",
      "lean accessibility policy",
      "existing control library detection",
      "existing plugin detect report",
    ],
    queryCanaries: [
      {
        query:
          "app-builder ontology-catalog target-catalog input-readiness source-lowering-preflight source-lowering-implemented",
        summary:
          "Current app-builder option discovery should route through ontology and readiness surfaces before source lowering.",
      },
      {
        query:
          "app-builder v1 scope recalibration packet with.bind startup validation handoff control affordance",
        summary:
          "Current app-builder v1 implementation should route through the June 7 recalibration packet before broad composition climbing or older interview texture.",
      },
      {
        query:
          "app-builder routed detail with.bind parent state relationship helper generated source taste",
        summary:
          "Routed-detail taste questions should treat generated `with.bind` plus `$parent.state.*($this)` as a regression canary; default detail output should use explicit item-qualified fields and state helper calls with item arguments.",
      },
      {
        query:
          "app-builder runnable app startup root index.html root selector plugin conventions npx makes aurelia",
        summary:
          "Runnable generated-app questions should route through startup/root awareness rather than treating component-pair output as a complete app by accident.",
      },
      {
        query:
          "app-builder email url tel password search display link mailto control affordance primitive completeness",
        summary:
          "Control affordance completeness questions should not be answered solely from the current field value-kind enum or generated fixture coverage.",
      },
      {
        query:
          "app-builder validation policy floor native constraints validation library split brain",
        summary:
          "Validation v1 questions should distinguish native constraints, validation-library posture, and app-builder policy before adding source output.",
      },
      {
        query:
          "app-builder input-contract-detail includeSourceLoweringConsumers sourceLoweringConsumerRows DomainActions consumer target-catalog source-lowering-preflight continuation false sourceLoweringImplemented",
        summary:
          "Input-facet source-lowering questions should distinguish exact executable target status from payload-consumer evidence and keep the MCP request schema aligned with semantic-runtime detail flags.",
      },
      {
        query:
          "app-builder recommendation contextual applicability evidence source-backed authority canary defaultingCandidate",
        summary:
          "Recommendation-policy questions should route to posture, applicability/context, evidence, and axis-local defaultability projections rather than treating contextual/source-backed as complete explanations.",
      },
      {
        query:
          "app-builder decision bundle supplied inputs defaulting policy preflight readiness",
        summary:
          "Request-local defaulting should route through decision-bundle expansion before readiness, preflight, and source-lowering gates.",
      },
      {
        query:
          "app-builder target-scoped decision bundle supplied input targetRefs policy satisfaction preflight invocation",
        summary:
          "Target-scoped defaulting should route through supplied-input target filtering so one selected ontology target does not satisfy neighboring source-lowering targets.",
      },
      {
        query:
          "app-builder fulfilledContentComposition nested composition supplied inputs target-scoped visual hooks collection-table loading-empty-error",
        summary:
          "Nested fulfilled-content composition should inherit parent supplied inputs broadly, then let the nested target filter target-scoped decisions.",
      },
      {
        query:
          "app-builder interview answer effect class immediate invariant near canary structural lane roadmap frontier deferred polish",
        summary:
          "Interview decisions should route through effect-horizon classification before being turned into immediate code, fixture structure, or roadmap work.",
      },
      {
        query:
          "app-builder source-lowering-invocation selected ontology target preflight target frame scalar native control generated fragments",
        summary:
          "One-target source generation should route through appBuilderSourceLoweringInvocation, sourceLoweringInvocationPreflightFrame, and sourceLoweringInvocationTargetFrame after explicit inputs.",
      },
      {
        query:
          "app-builder control-pattern-detail selection readiness row summary input contracts native control patterns",
        summary:
          "Selected control-pattern inspection should route through controlPatternDetailSelectionFrame, controlPatternDetailReadinessFrame, controlPatternDetailRowsFrame, and controlPatternDetailSummaryFrame.",
      },
      {
        query:
          "app-builder source-lowering-composition collection table native submit form generated fragments SourcePlan contribution origins",
        summary:
          "Multi-fragment generated source should route through appBuilderSourceLoweringComposition and preserve contribution origins.",
      },
      {
        query:
          "app-builder boolean display checked.to-view generated fixture collection detail field value kind",
        summary:
          "Generated collection/detail display should spend domain field value kind and use read-only boolean display instead of raw true/false interpolation.",
      },
      {
        query:
          "app-builder collection list card table generated checkbox control-use selected-collection-field",
        summary:
          "Collection list/card/table display controls should route through generated control-use inventory rows with collection-field binding provenance.",
      },
      {
        query:
          "app-builder collection empty state else branch generated fixture table list card routed list route conditional else",
        summary:
          "Generated collection list/card/table and routed list-route source should pair explicit empty-state if branches with sibling else collection content.",
      },
      {
        query:
          "app-builder fieldControlSelections native submit form native textarea range radio checkbox-list fieldset legend",
        summary:
          "Native submit form control-selection questions should route through source-lowering request fields and field-group source shape rather than hidden value-kind defaults.",
      },
      {
        query:
          "app-builder named value sets choice controls model.bind value.bind optionBindingKind reusable option-domain generated fixture",
        summary:
          "Reusable named value-set fixtures should use the default model.bind option identity path; explicit value.bind remains caller override pressure.",
      },
      {
        query:
          "app-builder fieldLabelContainerKind visualHookDescendantTagName control manifest radio checkbox-list fieldset legend",
        summary:
          "Generated field label container and compound-control visual hook placement should route to leaf-control descriptor metadata and control-manifest detail, not local source-lowering switches.",
      },
      {
        query:
          "app-builder generated fixture sourceLoweringTargetRegistryCoverageRows form-message source-lowering-target-ref generated-control-use di-state-class coverage",
        summary:
          "Generated-app fixture target coverage should route through the registry coverage index, distinguishing target-ref coverage from authored/generated control-use rows.",
      },
      {
        query:
          "app-builder ControlAccessibility fieldName AccessibilityHelpError aria-describedby generated field group messages",
        summary:
          "Field-scoped accessibility message questions should route through app-builder control/input ontology and generated form fixture contracts.",
      },
      {
        query:
          "app-builder stale field-scoped ControlAccessibility VisualClassHooks fieldName UnknownFieldAccessibilityMessageField UnknownFieldVisualHookField",
        summary:
          "Stale field-scoped input questions should route through Native Submit Form composition issues, not generic payload parsing or silent source-lowering drops.",
      },
      {
        query:
          "app-builder submit button VisualClassHooks actionName unmatched-submit-button-visual-hook-action dropped class data hook",
        summary:
          "Submit-button visual hooks scoped to another action should route through Native Submit Form composition issues instead of silent class/data hook loss.",
      },
      {
        query:
          "app-builder field group static id duplicate DOM id wrapped label fieldControlId accessibility help error",
        summary:
          "Field-group source currently derives static fieldControlId values for label/help/error relationships; reusable-component id policy remains a design canary.",
      },
      {
        query:
          "app-builder loading empty error promiseExpression promise valued property source state carrier",
        summary:
          "Loading/empty/error lowerers spend caller-supplied promiseExpression exactly; nicer promise-property output needs a modeled source-state/class-member carrier.",
      },
      {
        query:
          "app-builder routed identity lookup identityValueKind string route param generated fixture String projection",
        summary:
          "Generated routed browse/detail state lookup should spend domain identity value kind: numeric identities project to route-param strings, string identities compare directly.",
      },
      {
        query:
          "app-builder router-backed generated fixture load params route id parameter value",
        summary:
          "Generated routed fixtures that use inline load route+params should route through both app-builder generated fixture contracts and router LoadCustomAttribute semantics.",
      },
      {
        query:
          "app-builder source-lowering-source-plan component pair source placement expected effects pressure fixtures",
        summary:
          "File-level previews should route through appBuilderSourceLoweringSourcePlan and the SourcePlan witness/effect surfaces.",
      },
      {
        query:
          "app-builder directSourcePlanTargetFrame direct SourcePlan target preflight effect contracts target refs",
        summary:
          "Direct app-shell/router/state SourcePlan targets should share the admission frame for preflight rows, target refs, effect contracts, and descriptor-backed issues.",
      },
      {
        query:
          "app-builder source-lowering preflight author continuation required request fields canRequestSourceLowering childCompositions",
        summary:
          "Preflight rows can expose source-lowering availability while author continuations wait for the selected surface's required request fields to be supplied.",
      },
      {
        query:
          "app-builder policy review focused source-lowering request fields rootDir templatePath source plan wrapper placement",
        summary:
          "The policy review artifact exposes per-call request fields separately from durable input facets, including repeated SourcePlan wrapper placement fields.",
      },
      {
        query:
          "app-builder component pair runnable app shell root component project tooling generated app fixture expected effects",
        summary:
          "Runnable component-pair output should route through explicit app-shell assembly, project tooling, expected effects, and generated-app contract fixtures.",
      },
      {
        query:
          "app-builder component-pair standalone form saveDraft local draft state hidden collection demand-driven fields action inputFieldNames compact generated native submit form",
        summary:
          "Component-pair standalone forms should derive local draft fields from selected composition fields, direct field invocations, and declared action inputFieldNames without adding hidden local collection state.",
      },
      {
        query:
          "app-builder app section childCompositions component-pair-task-section-create-and-table native submit form collection table",
        summary:
          "AppSection source lowering should route as an explicit child-composition boundary inside component-pair assembly, not as a named starter profile.",
      },
      {
        query:
          "app-builder app section childCompositions fulfilledContentComposition component-pair-task-section-create-and-async-table loading empty error collection table",
        summary:
          "Nested AppSection generated fixtures should route through explicit child-composition input, fulfilled-content composition, contribution provenance, and generated-app manifest verification.",
      },
      {
        query:
          "app-builder recommendation policy review input-dependency visual-input applicability lanes",
        summary:
          "Policy review applicability lanes should distinguish relation-backed readiness dependencies from targeted policy conditions without adding duplicate broad visual-input prose.",
      },
      {
        query:
          "app-builder class-binding styling mechanism state-dependent classes structural hooks visual policy",
        summary:
          "Class binding is framework-backed and recommendable only when a selected pattern/control/visual policy needs state-dependent classes or structural hooks.",
      },
      {
        query:
          "app-builder collection projection facets display fields table columns query features policy review",
        summary:
          "Recommendation policy should keep list/card/table collection projection facets narrow and leave query features as selected-rung constraints.",
      },
      {
        query:
          "app-builder collection projection frame selectCollectionProjectionFrame collectionTableRenderedFrame list card table empty state supplied inputs",
        summary:
          "Collection list/card/table setup should route through the shared projection frame while table fragment assembly stays in the table render frame.",
      },
      {
        query:
          "app-builder custom element source layout empty generated class appBuilderCustomElementClassSource",
        summary:
          "Generated custom-element view-model files should compose classes through the shared source layout so empty classes stay compact and carrier metadata remains centralized.",
      },
      {
        query:
          "app-builder part-source-invocation lower selected part kind id slots source fragments MCP callback",
        summary:
          "Primitive source callbacks should route through the public part-source-invocation query and lowerAppBuilderPartSourceInvocation.",
      },
      {
        query:
          "app-builder choiceInputGroupElement checkbox list radio group select option part-source primitive control lowerer",
        summary:
          "Choice-control primitive lowerers should route through part-source callbacks and control descriptors before growing form/composition-local source switches.",
      },
      {
        query:
          "app-builder bindingBehaviorHostElement part-source gallery binding behavior host element",
        summary:
          "Binding-behavior host element questions should route to part-source gallery scaffolding, not observation semantics or app-builder recommendation policy.",
      },
      {
        query:
          "app-builder sample-card SampleCard neutral part-source preview sample resource names",
        summary:
          "Reusable part-source preview samples should use neutral placeholder resource names; concrete domain names belong in generated fixture requests and tracked generated source.",
      },
      {
        query:
          "catalog storefront old authoring recipe fixture-like app-builder pollution",
        summary:
          "Old fixture-shaped app-builder material should route here as cleanup pressure, not as durable starter authority.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Wired,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "App-builder answers have typed continuation plumbing, but each new ontology/detail/source-lowering answer still needs route-local truthfulness checks when added.",
      },
    ],
    anchors: [
      {
        kind: "doc",
        path: ".temp/app-builder-v1-scope-recalibration-packet-2026-06-07.md",
        role: "primary",
        summary:
          "Current leading app-builder v1 scope and prioritization packet; read before older interviews for implementation priorities.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-v1-investigation-answer-2026-06-07.md",
        role: "grounding",
        summary:
          "Investigation answer that grounds immediate v1 substrate gaps behind the recalibration packet.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-control-primitive-completeness-answer-2026-06-07.md",
        role: "grounding",
        summary:
          "Control primitive completeness answer for native/display/control-affordance gaps exposed by v1 canaries.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "SemanticRuntimeAppBuilderQueryKind",
        role: "primary",
        summary:
          "Public app-builder query vocabulary kept separate from app-world query kinds.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "SemanticRuntimeAppBuilderQueryPosture",
        role: "supporting",
        summary:
          "Public posture axis distinguishing ontology read model, source-lowering surface, part-source substrate, integrity probes, and catalog map.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/architecture-options.ts",
        symbolName: "appBuilderArchitectureOptions",
        role: "primary",
        summary:
          "Read-only app-builder architecture option menu over compact local component, DI-state component section, and router-backed list/detail/service shapes with target refs and follow-up query payloads.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/architecture-options.ts",
        symbolName: "AppBuilderArchitectureOptionId",
        role: "supporting",
        summary:
          "Enum-backed architecture option identities for AI-facing requested-app shape selection before source-lowering.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "readSemanticRuntimeAppBuilderCatalogIntegrity",
        role: "supporting",
        summary:
          "Public app-builder catalog-integrity assembler over registry, gallery coverage, and policy audit frames.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "semanticRuntimeAppBuilderCatalogRegistryIssueFrame",
        role: "supporting",
        summary:
          "Catalog-integrity frame for part descriptor, slot descriptor, and executable part-source callback registry issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "semanticRuntimeAppBuilderCatalogGalleryCoverageFrame",
        role: "supporting",
        summary:
          "Catalog-integrity frame for part-source and source-lowering gallery coverage issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "semanticRuntimeAppBuilderCatalogPolicyAuditFrame",
        role: "supporting",
        summary:
          "Catalog-integrity frame for status-audit rows and recommendation-policy summaries.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/runtime.ts",
        symbolName: "SemanticRuntime.answerAppBuilderQuery",
        role: "primary",
        summary:
          "SemanticRuntime facade for static app-builder answers before MCP or other transports.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "withSemanticRuntimeAppBuilderQueryContinuations",
        role: "supporting",
        summary:
          "Typed app-builder follow-up projection for detail/readiness/source-lowering answers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "canContinueSourceLoweringSurface",
        role: "supporting",
        summary:
          "Surface-scoped request-field gate for source-lowering author continuations.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "sourcePlanPreviewContinuationForPreflightRow",
        role: "supporting",
        summary:
          "Direct SourcePlan-preview continuation builder for source-lowering preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "targetInvocationContinuationForPreflightRow",
        role: "supporting",
        summary:
          "TargetInvocation continuation builder for source-lowering preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "fragmentCompositionContinuationForPreflightRow",
        role: "supporting",
        summary:
          "FragmentComposition continuation builder for source-lowering preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/catalog.ts",
        symbolName: "appBuilderOntologyCatalog",
        role: "primary",
        summary:
          "Read-only app-builder ontology catalog exposed as ontology-catalog without generated source.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/target-catalog.ts",
        symbolName: "appBuilderTargetCatalog",
        role: "primary",
        summary:
          "Selectable ontology target projection with status, readiness counts, paging, and source-lowering availability filters.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy.ts",
        symbolName: "appBuilderRecommendationStatusRank",
        role: "primary",
        summary:
          "Reviewable recommendation ranking for app-builder target menus without selecting blank-slate defaults.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy.ts",
        symbolName: "AppBuilderRecommendationApplicabilityKind",
        role: "primary",
        summary:
          "Enum-backed applicability/context lanes explaining when a recommendation row is truthfully spendable.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy.ts",
        symbolName: "AppBuilderRecommendationEvidenceKind",
        role: "primary",
        summary:
          "Enum-backed evidence lanes replacing the older compressed source-backed/operator-confirmed authority read.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy.ts",
        symbolName: "appBuilderRecommendationPolicyRows",
        role: "primary",
        summary:
          "Review projection joining recommendation posture, applicability/context rows, evidence rows, source-lowering support, explicit input, and local defaulting candidates.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy-detail.ts",
        symbolName: "appBuilderRecommendationPolicyDetail",
        role: "primary",
        summary:
          "Public read-only recommendation-policy query projection with target selection, row filters, compact summary counts by default, opt-in rows, and contextual executable policy-satisfaction candidates.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/recommendation-policy-detail.ts",
        symbolName: "appBuilderPolicySatisfactionCandidateRow",
        role: "supporting",
        summary:
          "Executable contextual row classifier that spends the shared policy-satisfaction predicate rather than redefining contextual source-lowering locally.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/policy-satisfaction.ts",
        symbolName: "appBuilderPolicySatisfactionForTarget",
        role: "primary",
        summary:
          "First-ring policy gate for contextual executable source-lowering targets; exact target selection satisfies the gate, broad/default preflight target sets do not.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/policy-satisfaction.ts",
        symbolName: "appBuilderRequiresPolicySatisfaction",
        role: "primary",
        summary:
          "Shared predicate for contextual executable app-builder targets that need explicit policy satisfaction before broad source-lowering readiness.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/defaulting-candidate-policy.ts",
        symbolName: "appBuilderDefaultingCandidateForTarget",
        role: "primary",
        summary:
          "Central policy projection for local defaulting candidates; this is not blank-slate app-builder defaulting.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/defaulting-candidate-policy.ts",
        symbolName: "APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS",
        role: "primary",
        summary:
          "Operator-reviewable local defaulting-candidate policy table with scope and rationale rows kept separate from recommendation posture.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/decision-bundle.ts",
        symbolName: "AppBuilderDecisionBundleSource",
        role: "primary",
        summary:
          "Enum-backed request-local decision/defaulting provenance for supplied-input expansion.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/decision-bundle.ts",
        symbolName: "appBuilderSuppliedInputsWithDecisionBundles",
        role: "primary",
        summary:
          "Expansion helper used by readiness, preflight, and source-lowering surfaces before input gates run.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/decision-bundle.ts",
        symbolName: "appBuilderSuppliedInputsWithDecisionBundlesForTarget",
        role: "primary",
        summary:
          "Target-scoped expansion helper used by source-lowering surfaces when explicit decisions should satisfy one ontology row but not its neighbors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/policy/status-projection.ts",
        symbolName: "appBuilderProjectedOntologyStatus",
        role: "primary",
        summary:
          "Projection from row-local declared status plus source-lowering registry facts to public ontology status.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/input-readiness.ts",
        symbolName: "appBuilderInputReadiness",
        role: "primary",
        summary:
          "Request-specific read model that reports satisfied, missing, rejected, and deferred input dependencies before source lowering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/input-source-lowering-consumers.ts",
        symbolName: "appBuilderSourceLoweringConsumersForInputFacet",
        role: "supporting",
        summary:
          "Input-contract detail helper that reports executable source-lowering targets consuming an input facet without making the facet itself source-lowerable.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-materialization.ts",
        symbolName: "materializeAppBuilderCallerDomainForTarget",
        role: "primary",
        summary:
          "Caller-domain materialization boundary that validates explicit domain slots before source-lowering surfaces emit generated source.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-materialization.ts",
        symbolName: "domainAssignmentIndexFrame",
        role: "supporting",
        summary:
          "Domain materialization phase frame that indexes caller slot assignments and reports duplicate slot keys.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-materialization.ts",
        symbolName: "domainMaterializedSlotFrame",
        role: "supporting",
        summary:
          "Domain materialization phase frame that projects required slots, entity title, field schema, and identity value kind from caller input.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-materialization.ts",
        symbolName: "domainSlotAssignmentShapeIssues",
        role: "supporting",
        summary:
          "Domain materialization validation phase for per-slot value shape and TypeScript identifier requirements.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-materialization.ts",
        symbolName: "domainDerivedNameFrame",
        role: "supporting",
        summary:
          "Domain materialization phase frame for explicit or derived entity, collection, and identity member names.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "appBuilderApplicationPatternDetail",
        role: "primary",
        summary:
          "Selected application design pattern detail projection joining patterns to input readiness, input contracts, coordinated collection/control/style concept rows, associated affordances, and semantic effect descriptors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "applicationPatternDetailSelectionFrame",
        role: "supporting",
        summary:
          "Application-pattern detail phase frame for selected patterns and opt-in readiness, input, concept, control, style, affordance, and semantic-effect descriptor flags.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "applicationPatternDetailReadinessFrame",
        role: "supporting",
        summary:
          "Application-pattern detail phase frame that evaluates input-readiness once for selected pattern targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "applicationPatternDetailRowsFrame",
        role: "supporting",
        summary:
          "Application-pattern detail phase frame that projects selected patterns with coordinated concept, control, style, affordance, semantic-effect, and input detail.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "applicationPatternDetailSummaryFrame",
        role: "supporting",
        summary:
          "Application-pattern detail summary phase for compact public counts over input contracts, concepts, controls, style rows, affordances, semantic effects, and issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/application-pattern-detail.ts",
        symbolName: "inputContractDetailsForApplicationPattern",
        role: "supporting",
        summary:
          "Application-pattern input-contract bridge that returns no detail rows for empty contract sets instead of expanding the whole input-contract catalog.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "appBuilderControlPatternDetail",
        role: "primary",
        summary:
          "Selected control pattern detail projection joining native/rich control rows to input readiness, input detail, coordinating patterns, realization policies, manifest/style/visual rows, and associated affordances.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "controlPatternDetailSelectionFrame",
        role: "supporting",
        summary:
          "Control-pattern detail phase frame for selected control patterns and opt-in readiness, input, application-pattern, descriptor, realization, manifest, style, visual, and affordance flags.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "controlPatternDetailReadinessFrame",
        role: "supporting",
        summary:
          "Control-pattern detail phase frame that evaluates input-readiness once for selected control-pattern targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "controlPatternDetailRowsFrame",
        role: "supporting",
        summary:
          "Control-pattern detail phase frame that projects selected controls with readiness, input detail, coordinating patterns, descriptors, realization policies, manifest/style rows, and affordances.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "controlPatternDetailSummaryFrame",
        role: "supporting",
        summary:
          "Control-pattern detail summary phase for compact public counts over input contracts, patterns, descriptors, realization policies, manifest/style rows, affordances, and issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-pattern-detail.ts",
        symbolName: "inputContractDetailsForControlPattern",
        role: "supporting",
        summary:
          "Control-pattern input-contract bridge that returns no detail rows for empty contract sets instead of expanding the whole input-contract catalog.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "appBuilderControlManifestDetail",
        role: "primary",
        summary:
          "Selected control/component manifest detail projection joining manifest rows to input readiness, input detail, coordinating patterns, controls, style rows, direct effect contracts, and field descriptors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "controlManifestDetailSelectionFrame",
        role: "supporting",
        summary:
          "Control-manifest detail phase frame for selected manifests and opt-in readiness, input, pattern, control, style, effect, and field-descriptor flags.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "controlManifestDetailReadinessFrame",
        role: "supporting",
        summary:
          "Control-manifest detail phase frame that evaluates input-readiness once for selected manifest targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "controlManifestDetailRowsFrame",
        role: "supporting",
        summary:
          "Control-manifest detail phase frame that projects selected manifests with coordinated pattern, control, style, effect, and input detail.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "controlManifestDetailSummaryFrame",
        role: "supporting",
        summary:
          "Control-manifest detail summary phase for compact public counts over input contracts, patterns, controls, style rows, effects, field descriptors, and issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-detail.ts",
        symbolName: "inputContractDetailsForControlManifest",
        role: "supporting",
        summary:
          "Manifest input-contract bridge that returns no detail rows for empty contract sets instead of expanding the whole input-contract catalog.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "appBuilderEffectContractDetail",
        role: "primary",
        summary:
          "Selected effect-contract detail projection joining promised effects to witnesses, app-query rows, manifests, promising affordances, readiness, input detail, and patterns.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "effectContractDetailSelectionFrame",
        role: "supporting",
        summary:
          "Effect-detail phase frame for selected effect contracts and opt-in witness, affordance, readiness, and manifest flags.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "effectContractDetailReadinessFrame",
        role: "supporting",
        summary:
          "Effect-detail phase frame that gathers promising affordances and evaluates their input readiness once.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "effectContractDetailRowsFrame",
        role: "supporting",
        summary:
          "Effect-detail phase frame that projects selected contract rows with witness, manifest, query, and promising-affordance detail.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "effectContractDetailSummaryFrame",
        role: "supporting",
        summary:
          "Effect-detail summary phase for compact public counts over witnesses, queries, manifests, affordances, input detail, and issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/effect-detail.ts",
        symbolName: "inputContractDetailsForAffordance",
        role: "supporting",
        summary:
          "Affordance input-contract bridge that returns no detail rows for empty contract sets instead of expanding the whole input-contract catalog.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/style-detail.ts",
        symbolName: "appBuilderStyleDetail",
        role: "primary",
        summary:
          "Selected style detail projection joining styling mechanisms and visual policies to readiness, visual-style input detail, coordinating patterns, lower concept rows, and associated affordances.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/style-detail.ts",
        symbolName: "styleDetailSelectionFrame",
        role: "supporting",
        summary:
          "Style-detail phase frame for selected styling mechanisms, selected visual policies, and opt-in detail flags.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/style-detail.ts",
        symbolName: "styleDetailReadinessFrame",
        role: "supporting",
        summary:
          "Style-detail phase frame that evaluates input-readiness once for selected styling and visual-policy targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/style-detail.ts",
        symbolName: "styleDetailRowsFrame",
        role: "supporting",
        summary:
          "Style-detail phase frame that projects mechanism and visual-policy detail rows from the selected ontology facts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/style-detail.ts",
        symbolName: "styleDetailSummaryFrame",
        role: "supporting",
        summary:
          "Style-detail summary phase for compact public counts without turning styling rows into design policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "appBuilderSourceLoweringPreflight",
        role: "primary",
        summary:
          "Source-generation feasibility projection over exact ontology targets, source-lowering availability, input gates, and request fields.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "sourceLoweringPreflightSelectionFrame",
        role: "supporting",
        summary:
          "Preflight phase frame for request flags, supplied-input expansion, target normalization/defaulting, descriptor lookup, and unknown-target issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "sourceLoweringPreflightReadinessFrame",
        role: "supporting",
        summary:
          "Preflight phase frame that runs input-readiness once for known targets and bridges readiness issues into source-lowering preflight issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "sourceLoweringPreflightRowsFrame",
        role: "supporting",
        summary:
          "Preflight phase frame that builds target rows with availability, surfaces, policy satisfaction, target requirements, request-field summaries, and decision text.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "sourceLoweringPreflightSummaryFrame",
        role: "supporting",
        summary:
          "Preflight summary phase for compact public counts over eligibility, request fields, implementation, input gates, and policy satisfaction.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-preflight.ts",
        symbolName: "AppBuilderSourceLoweringAvailability",
        role: "supporting",
        summary:
          "Enum-backed availability axis for SourceLoweringImplemented, NotImplemented, and UnknownTarget.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-surface.ts",
        symbolName: "appBuilderSourceLoweringSurfaceKindsForTarget",
        role: "supporting",
        summary:
          "Exact-target registry for callable source-lowering surfaces.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/control-catalog.ts",
        symbolName: "AppBuilderControlDescriptor",
        role: "primary",
        summary:
          "Leaf-control descriptor rows own source shape facts such as field-label container and visual-hook descendant placement.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/control-manifest-field.ts",
        symbolName: "APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS",
        role: "supporting",
        summary:
          "Control-manifest field descriptors expose leaf-control source-shape facts for Atlas/MCP detail inspection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation-contracts.ts",
        symbolName: "AppBuilderSourceLoweringInvocationRequest",
        role: "primary",
        summary:
          "Public source-lowering invocation contract vocabulary for request DTOs, selection states, issue kinds, and answer rows; implementation lowerers spend these contracts from source-lowering-invocation.ts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "appBuilderSourceLoweringInvocation",
        role: "primary",
        summary:
          "Generated-fragment bridge for one selected ontology target with explicit supplied inputs, preflight admission, target routing, and delegated part-source syntax.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "sourceLoweringInvocationPreflightFrame",
        role: "supporting",
        summary:
          "Invocation admission phase that resolves the exact target, runs source-lowering preflight, and bridges missing/blocked target issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "sourceLoweringInvocationTargetFrame",
        role: "supporting",
        summary:
          "Invocation route phase that admits application-pattern, control-pattern, and leaf-control source-lowering routes after preflight.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "lowerSourceLoweringInvocationTarget",
        role: "supporting",
        summary:
          "Invocation dispatch phase that spends the admitted target route through the concrete source lowerer.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "selectFieldGroupControlId",
        role: "pressure",
        summary:
          "Field-group DOM id selection helper; current static selected-field-name default may need a richer reusable-component identity policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "lowerFieldGroupSourceInvocation",
        role: "pressure",
        summary:
          "Field-group source lowerer that owns label/control/help/error relationships and any future wrapped-label or scoped-id policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "fieldControlSourceSelectionFrame",
        role: "supporting",
        summary:
          "Leaf field-control selection phase for binding expression, value domain, numeric constraints, and delegated part slot assignments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "fieldControlRenderedFrame",
        role: "supporting",
        summary:
          "Leaf field-control render phase for part-source invocation, visual hooks, standalone accessibility, and generated fragments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-lowering.ts",
        symbolName: "lowerAppBuilderPartSourceInvocation",
        role: "primary",
        summary:
          "Primitive app-builder part-source lowerer that spends selected part descriptors and slot assignments before higher-order composition wraps generated fragments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-lowering.ts",
        symbolName: "choiceInputGroupElement",
        role: "pressure",
        summary:
          "Choice-control primitive template lowerer for checkbox-list and radio-group option domains.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-lowering.ts",
        symbolName: "selectElement",
        role: "pressure",
        summary:
          "Select-control primitive template lowerer for single- and multi-select option domains.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "fieldGroupSelectionFrame",
        role: "supporting",
        summary:
          "Field-group selection phase for domain field, inner control, delegated field-control lowering, label text, and DOM id readiness.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "fieldGroupRenderedFragments",
        role: "supporting",
        summary:
          "Field-group render phase for label/fieldset wrappers, help/error/status message fragments, described-by ids, and FormMessage target refs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "selectRequestedAccessibilityMessageKind",
        role: "supporting",
        summary:
          "Form-message selection branch for explicit messageKind plus explicit messageText or exactly one matching help/error/status payload.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-invocation.ts",
        symbolName: "selectInferredAccessibilityMessageKind",
        role: "supporting",
        summary:
          "Form-message selection branch that infers message kind only from exactly one supplied help/error/status payload.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-contracts.ts",
        symbolName: "AppBuilderSourceLoweringCompositionKind",
        role: "supporting",
        summary:
          "Enum-backed composition vocabulary for app-section, collection projections, async state, and native submit form source-lowering requests.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition.ts",
        symbolName: "appBuilderSourceLoweringComposition",
        role: "primary",
        summary:
          "Generated-fragment bridge for one selected ontology target that owns several source fragments or member invocations.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-native-submit-form.ts",
        symbolName: "lowerNativeSubmitFormComposition",
        role: "primary",
        summary:
          "Native Submit Form composition lowerer for explicit field selections, field-group member invocations, submit event lowering, submit button control-use rows, and form fragments.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-native-submit-form.ts",
        symbolName: "nativeSubmitFormSelectionFrame",
        role: "supporting",
        summary:
          "Native Submit Form phase frame for field/action selection, scoped accessibility/visual input validation, field-control selections, and submit button text.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-native-submit-form.ts",
        symbolName: "nativeSubmitFormReadyFrame",
        role: "supporting",
        summary:
          "Native Submit Form readiness gate that proves selected action, submit text, submit attribute, and one member fragment per selected field before rendering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-native-submit-form.ts",
        symbolName: "nativeSubmitFormRenderedFragments",
        role: "supporting",
        summary:
          "Native Submit Form render phase for the submit button, containing form, composition origin, visual hooks, and generated control-use row.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-native-submit-form.ts",
        symbolName: "nativeSubmitFormCompositionResult",
        role: "supporting",
        summary:
          "Native Submit Form result projector that keeps preflight, selected fields/action, submit event rows, fragments, control-use rows, and issues in one public composition envelope.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition.ts",
        symbolName: "lowerAppSectionComposition",
        role: "primary",
        summary:
          "AppSection source lowerer that composes explicit child composition requests into one section without becoming a starter profile.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition.ts",
        symbolName: "sourceLoweringCompositionChildSuppliedInputs",
        role: "primary",
        summary:
          "Nested composition supplied-input bridge that preserves parent context until the child target applies target-scoped filtering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "lowerLoadingEmptyErrorStateComposition",
        role: "primary",
        summary:
          "Loading/Empty/Error source composition owner for promise, pending, fulfilled, rejected, empty-state, and explicit nested fulfilled-content lowering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "lowerLoadingEmptyErrorStructuralParts",
        role: "supporting",
        summary:
          "Loading/Empty/Error phase frame that lowers promise, pending, fulfilled, rejected, conditional, and optional else template-controller attributes.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "loadingEmptyErrorSelectedInputs",
        role: "supporting",
        summary:
          "Loading/Empty/Error request-normalization gate for explicit promise, status text, empty-state condition, and branch local names.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "loadingEmptyErrorSelectionIssues",
        role: "supporting",
        summary:
          "Loading/Empty/Error issue gate that rejects missing required request fields and unsafe branch local names before structural lowering.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "loadingEmptyErrorReadyFrame",
        role: "supporting",
        summary:
          "Loading/Empty/Error phase gate that proves required text, promise expressions, and structural attribute fragments exist before rendered source is emitted.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "loadingEmptyErrorRenderedFragments",
        role: "supporting",
        summary:
          "Loading/Empty/Error phase frame that renders pending, fulfilled-empty, fulfilled-content, rejected, and outer promise region fragments.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-loading-empty-error.ts",
        symbolName: "loadingEmptyErrorCompositionResult",
        role: "supporting",
        summary:
          "Loading/Empty/Error result projector that keeps preflight, available fields/actions, selected request fields, nested fulfilled content, fragments, and issues in one public composition envelope.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-request-field-contracts.ts",
        symbolName: "AppBuilderSourceLoweringRequestFieldId",
        role: "supporting",
        summary:
          "Enum-backed request fields include ChildCompositions for AppSection source-lowering calls.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-collection.ts",
        symbolName: "selectCollectionProjectionFrame",
        role: "primary",
        summary:
          "Shared list/card/table collection projection setup for supplied inputs, binding context, optional empty-state branch, and compact availability metadata.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-collection.ts",
        symbolName: "selectCollectionTableColumnPayload",
        role: "supporting",
        summary:
          "Collection-table payload normalization boundary for explicit header plus exactly one fieldName or actionName before field/action column lowering.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-collection.ts",
        symbolName: "collectionTableRenderedFrame",
        role: "supporting",
        summary:
          "Collection Table render phase for repeat/header/body/table fragments, empty-state sibling fragments, visual hooks, member target ids, and control-use rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-collection.ts",
        symbolName: "collectionTableCellElement",
        role: "pressure",
        summary:
          "Collection table display lowerer that spends domain field value kind for read-only boolean display.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition-collection.ts",
        symbolName: "lowerOptionalCollectionContentElseBranch",
        role: "pressure",
        summary:
          "Collection empty-state branch helper that lowers sibling conditional-else content through the structural part-source substrate.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "routedCollectionDetailListTemplateSource",
        role: "supporting",
        summary:
          "Routed list-route template renderer for the prepared browse/list template frame.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "routedCollectionDetailListTemplateFrame",
        role: "supporting",
        summary:
          "Routed list-route template frame for empty/else branch control flow, repeat, router load links, title interpolation, and nested viewport placement.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "routedCollectionDetailTemplateFrame",
        role: "supporting",
        summary:
          "Routed detail-route template frame for selected-item branch control flow, value scope, back navigation, title interpolation, field displays, and missing-item text.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "routedCollectionDetailFieldDisplays",
        role: "pressure",
        summary:
          "Routed detail display lowerer that spends domain field value kind for read-only boolean display.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "routedCollectionDetailIdentityComparisonExpression",
        role: "pressure",
        summary:
          "Routed lookup source helper that spends domain identity value kind while preserving string-valued route params.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan.ts",
        symbolName: "appBuilderSourceLoweringSourcePlan",
        role: "primary",
        summary:
          "SourcePlan preview bridge for direct app-shell/state/router targets and component-pair assembly with explicit placement.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-placement.ts",
        symbolName: "sourcePlanPlacement",
        role: "primary",
        summary:
          "SourcePlan placement resolver for direct transport fields and supplied SourcePlacement facets, including conflict/missing placement issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-selection.ts",
        symbolName: "appBuilderSourceLoweringSourcePlanFrame",
        role: "primary",
        summary:
          "Selected SourcePlan lowering frame that dispatches one explicit app-builder source-lowering branch before public answer projection.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "lowerComponentPairSourcePlan",
        role: "primary",
        summary:
          "Component-pair SourcePlan assembly that joins template composition, local state, direct invocations, and optional runnable app shell output.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairLocalViewModelStateFieldNames",
        role: "primary",
        summary:
          "Component-pair helper that keeps generated local draft state aligned with selected fields and declared action inputs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairDirectSelection",
        role: "supporting",
        summary:
          "Component-pair phase frame for app-shell, class-name, resource carrier, convention, and resource-name selection before nested lowering runs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "lowerComponentPairNestedSources",
        role: "supporting",
        summary:
          "Component-pair phase frame that lowers nested template composition and direct invocations with shared plus target-scoped supplied inputs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "lowerComponentPairLocalState",
        role: "supporting",
        summary:
          "Component-pair phase frame that derives demand-driven local view-model state from selected fields, actions, and value-set selections.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairFragments",
        role: "supporting",
        summary:
          "Component-pair phase frame that separates template text, contribution fragments, TypeScript top-level fragments, and class-member fragments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairIssues",
        role: "supporting",
        summary:
          "Component-pair phase frame that aggregates selection, nested-lowering, local-state, template, and TypeScript fragment issues before SourcePlan assembly.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairSourcePlan",
        role: "supporting",
        summary:
          "Component-pair phase frame that turns validated direct selection and fragments into a custom-element pair or runnable root app-shell SourcePlan.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairAggregates",
        role: "supporting",
        summary:
          "Component-pair phase frame that deduplicates target refs, effect contracts, and control-use rows for public projection.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-direct.ts",
        symbolName: "appBuilderLocalViewModelFieldsForNames",
        role: "supporting",
        summary:
          "Field filter used by component-pair local state while preserving full-field direct local-state previews.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-direct.ts",
        symbolName: "directSourcePlanTargetFrame",
        role: "primary",
        summary:
          "Shared direct SourcePlan target admission frame for preflight rows, target refs, effect contracts, and descriptor-backed issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-menu.ts",
        symbolName: "appBuilderPartMenu",
        role: "primary",
        summary:
          "AI-facing app-builder part menu over common part rows, filtered by application site, operation, resource identity, and slot availability.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-menu.ts",
        symbolName: "appBuilderPartMenuAxisSummary",
        role: "supporting",
        summary:
          "Compact part-menu aggregate frame for part kinds, tiers, sites, slot expectations, resource identities, and package dependencies.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-lowering.ts",
        symbolName: "appBuilderPartSourceLoweringPreview",
        role: "primary",
        summary:
          "Compact source-lowering preview over callable part samples, structural fragment hints, issues, and optional source text.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-lowering.ts",
        symbolName: "lowerAppBuilderPartSourceInvocation",
        role: "primary",
        summary:
          "Executable part source invocation callback over stable part IDs and typed slot assignments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "appBuilderSourceLoweringGalleryPlans",
        role: "primary",
        summary:
          "Pressure fixture builder that materializes executable source-lowering target rows into SourcePlan fixtures.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGalleryFragmentSections",
        role: "supporting",
        summary:
          "Dense source-lowering gallery section frame over local state, class-member lowerings, and template lowering groups.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGalleryControlLowerings",
        role: "supporting",
        summary:
          "Focused source-lowering gallery section for first-ring native control and field-group invocation coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGalleryCollectionLowerings",
        role: "supporting",
        summary:
          "Focused source-lowering gallery section for collection list/card/table composition coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGalleryStatusLowerings",
        role: "supporting",
        summary:
          "Focused source-lowering gallery section for loading/empty/error status composition coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGalleryFormLowerings",
        role: "supporting",
        summary:
          "Focused source-lowering gallery section for native submit-form composition coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts",
        symbolName: "fragmentGallerySectionLowerings",
        role: "supporting",
        summary:
          "Focused source-lowering gallery section for explicit app-section child-composition coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "appBuilderPartSourceGalleryCoverageIssues",
        role: "primary",
        summary:
          "SourcePlan contribution coverage check proving the dense gallery spends public part-source sample shapes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "appBuilderPartSourceGallerySourcePlanFrame",
        role: "supporting",
        summary:
          "Dense part-source gallery SourcePlan phase frame for paths, admissions, app tasks, entrypoint imports, generated app source, and generated state source.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "appBuilderPartSourceGalleryAdmissionFrame",
        role: "supporting",
        summary:
          "Dense part-source gallery admission frame for router, state, i18n, validation, virtualization, and StandardConfiguration package setup.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "appBuilderPartSourceGallerySourcePlanAssembly",
        role: "supporting",
        summary:
          "Dense part-source gallery SourcePlan assembly boundary that spends the frame into entrypoint, app, state, template, and configuration file artifacts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "galleryAppSourceFrame",
        role: "supporting",
        summary:
          "Dense part-source gallery frame carrying TypeScript imports, source fragments, resource metadata fragments, route fragments, and route-parameter fragments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "galleryResourceDeclarationsSource",
        role: "supporting",
        summary:
          "Part-source gallery TypeScript source section for custom-element, static metadata, define-call, and named-resource declarations.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "galleryRouteAndServiceSource",
        role: "supporting",
        summary:
          "Part-source gallery TypeScript source section for route components, sanitizer service, local dependencies, and route decorator source.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "galleryRootAppClassSource",
        role: "supporting",
        summary:
          "Part-source gallery TypeScript source section for the generated root app class and its part-source-backed members.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "gallerySharedTypesSource",
        role: "supporting",
        summary:
          "Part-source gallery TypeScript source section for shared fixture interfaces and required lifecycle-hook pressure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "bindingStateElements",
        role: "supporting",
        summary:
          "Part-source gallery binding section for state plugin .state and .dispatch source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "bindingI18nElements",
        role: "supporting",
        summary:
          "Part-source gallery binding section for translation and translation-parameter source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "bindingBehaviorHostElement",
        role: "pressure",
        summary:
          "Dense part-source gallery helper that chooses minimal host elements for binding behavior sample expressions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "iterationTemplateControllerElements",
        role: "supporting",
        summary:
          "Part-source gallery structural section for repeat and virtual-repeat source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "promiseTemplateControllerElements",
        role: "supporting",
        summary:
          "Part-source gallery structural section for promise, pending, fulfilled, and rejected source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "compositionFrameworkComponentElements",
        role: "supporting",
        summary:
          "Part-source gallery framework-component section for au-compose and au-slot source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "interactionFrameworkComponentElements",
        role: "supporting",
        summary:
          "Part-source gallery framework-component section for focus and show source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "routerFrameworkComponentElements",
        role: "supporting",
        summary:
          "Part-source gallery framework-component section for viewport, load, and href router source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "validationFrameworkComponentElements",
        role: "supporting",
        summary:
          "Part-source gallery framework-component section for validation-errors and validation-container source samples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
        symbolName: "compilerSyntaxElements",
        role: "supporting",
        summary:
          "Part-source gallery framework-syntax section for compiler-owned attributes such as as-element.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-samples.ts",
        symbolName: "sampleSlotAssignmentSamplesForPart",
        role: "primary",
        summary:
          "Reusable part-source preview sample slot values that should stay as neutral placeholders rather than fixture-domain examples.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/part-source-samples.ts",
        symbolName: "APP_BUILDER_PART_SLOT_SAMPLE_VALUE_ROWS",
        role: "supporting",
        summary:
          "Enum-keyed default slot sample value table for source-lowering previews; keep this as sample policy, not executable lowerer logic.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "appBuilderMinimalAppShellExpectedEffects",
        role: "supporting",
        summary:
          "Shared expected-effect projection for public SourcePlan previews and app-builder pressure fixtures.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "routedCollectionDetailExpectedEffectFrame",
        role: "supporting",
        summary:
          "Routed collection/detail expected-effect frame that normalizes route parameter and viewport names before fixture-verification promises are projected.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "routedCollectionDetailRouteConfigurationExpectedEffects",
        role: "supporting",
        summary:
          "Routed collection/detail route-configuration expected effects for router options, route object literals, and viewport targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "routedCollectionDetailRouteConsumptionExpectedEffects",
        role: "supporting",
        summary:
          "Routed collection/detail route-consumption expected effects for au-viewport declarations, route params, endpoint params, and route-context reads.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-generated",
        role: "primary",
        summary:
          "Materializes current generated-app contract fixtures from exact public app-builder SourcePlan requests.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlanContribution",
        role: "supporting",
        summary:
          "Generated-source contribution ledger that preserves part and source-lowering origins beside final text.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/runtime-adapter.ts",
        symbolName: "AureliaMcpSemanticRuntimeAdapter",
        role: "supporting",
        summary:
          "Thin MCP adapter method that forwards app-builder requests to SemanticRuntime.answerAppBuilderQuery.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCapabilities,
        projection: "catalog",
        role: "grounding",
        summary:
          "Framework capability terrain should ground app-builder ontology choices before consumer policy is derived.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "app-builder", "ontology"],
        role: "grounding",
        summary:
          "Durable app-builder memory owns the current ontology direction and removal of the old starter/golden lane.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "app-builder", "policy", "fixtures", "atlas"],
        role: "grounding",
        summary:
          "App-builder interview decision-effect memory classifies answers as immediate invariants, near canaries, structural lanes, roadmap frontiers, or deferred polish before scheduling work.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-pressure",
        role: "primary",
        summary:
          "Regenerates focused pressure fixtures from current app-builder source-lowering galleries.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:app-builder-query-surface",
        role: "primary",
        summary:
          "Public app-builder API contract covering catalog discovery, source-lowering surfaces, part-source invocation, and integrity answers.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:control-use-inventory",
        role: "primary",
        summary:
          "Contract proving authored/generated native controls and button actions are classified through control-use inventory.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/app-builder/README.md",
        role: "grounding",
        summary:
          "Starting-point framing for app-builder as an AI-first pattern algebra and source-lowering substrate.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-synthesis-roadmap-2026-06-01.md",
        role: "grounding",
        summary:
          "Reviewable synthesis across recommendation, ontology, design/control, and app-design interview notes.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-source-lowering-authority-interview-2026-06-03.md",
        role: "grounding",
        summary:
          "Reviewable interview for status/defaulting/recommendation policy, source-lowering authority, and generated fixture contract boundaries.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-recommendation-defaulting-policy-review-2026-06-03.md",
        role: "grounding",
        summary:
          "Generated review checklist for recommendation posture, applicability/context, evidence, defaulting candidates, source-lowering support, explicit input, and contextual source-lowering policy-satisfaction candidates.",
      },
      {
        kind: "doc",
        path: ".temp/app-builder-generated-fixture-review-rolling-2026-06-04.md",
        role: "grounding",
        summary:
          "Qualitative rolling review of generated app-builder fixture source shape, request/response inspectability, SourcePattern metadata, and the app-builder versus fixture-verification boundary.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime policy:app-builder-review",
        role: "supporting",
        summary:
          "Report writer that refreshes recommendation/defaulting policy review rows, focused source-lowering request-field rows, and contextual source-lowering policy-satisfaction candidate rows from the compiled app-builder ontology and policy projection.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-builder-",
        role: "pressure",
        summary:
          "Focused pressure fixture lane for current app-builder part/source-lowering behavior.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/app-builder/",
        role: "pressure",
        summary:
          "Current tracked generated-app contract lane for end-user-shaped source, exact app-builder/MCP inputs, manifests, expected effects, and reopen verification.",
      },
    ],
    authority: [
      "App-builder memory and the 2026-06-07 v1 recalibration packet for current implementation priority.",
      "June 2026 interview documents for durable product texture and background design intent.",
      "Semantic-runtime app-builder ontology/source-lowering code for current public API authority.",
      "Atlas framework.capabilities for framework-pure grounding before app-builder policy is derived.",
    ],
    cautions: [
      "For app-builder v1 implementation, read the June 7 recalibration packet before older interview documents; older interviews should not become co-equal pressure when the packet gives a narrower current priority.",
      "Read the app-builder interviews and memory when naming, input contracts, visual policy, or generation timing feels ambiguous.",
      "Current app-builder work starts with read-only ontology breadth and explicit input readiness before source-lowering.",
      "Do not continue broad composition rung climbing when immediate v1 substrate gaps from the packet remain unaccounted for.",
      "Do not enum-first patch controls; inspect ontology, source-lowering request fields, policy/defaulting, fixtures, MCP presentation, and Atlas implications before declaring a control affordance complete.",
      "Source-lowering availability is executable support, not evidence from an older generator path.",
      "Pressure fixtures live under packages/semantic-runtime/fixtures/pressure/app-builder-* and should not become public starter authority.",
      "MCP should forward through the semantic-runtime app-builder facade and not invent transport-local app-building policy.",
      "Do not recreate the deleted starter menu/golden lane without explicit operator review.",
      "Do not silently choose a sample domain, identity field, plugin, visual style, state boundary, routing policy, or generated CSS fallback when the caller has not supplied enough input.",
      "Do not use optional to mean source lowering is absent. Optional, deferred, defaulting-candidate, source-lowering-implemented, recommendable, and blank-slate/starter defaulting are separate concepts.",
      "Use request-local decision bundles for current defaulting decisions; do not reintroduce named blank-slate profiles until repeated bundle shapes prove they are stable.",
      "Keep decision-bundle counts visible in compact answers and expansion rows behind detail/opt-in fields.",
      "When a decision or supplied input has targetRefs, lowerers with a selected target must spend target-scoped supplied-input helpers instead of raw request.suppliedInputs.",
      "Classify interview answers by effect horizon before acting: immediate invariant, near canary, structural lane, roadmap frontier, or deferred polish.",
      "Use `policy-satisfaction.ts` as the shared first-ring gate for contextual executable source-lowering targets: exact target selection satisfies it, while broad/default preflight target sets keep contextual rows from reporting `canRequestSourceLowering=true`.",
      "Do not treat contextual or legacy source-backed as complete explanations; inspect recommendation applicability and evidence rows before promoting a target.",
      "Do not turn app-builder into a visual CSS author by hidden taste. Visual/style material should come from supplied inputs, explicit policy, or a later reviewed fallback.",
      "Do not make missing-input reporting postures depend on the input they report as missing; for example visual-input-missing has no VisualStyleInput dependency, while style-spending visual policies do.",
      "Do not materialize component-pair output as a generated-app contract fixture unless it also has runnable app-shell/tooling context and reopen expectations, or an explicit verification-only harness.",
    ],
    nextQuestions: [
      "Is this task part of the June 7 immediate v1 substrate set, or is it broad app-builder rung climbing that should wait?",
      "Is this work read-only ontology, status/policy projection, input-contract/readiness modeling, control/manifest modeling, style input modeling, SourcePlan effects, verification, or actual source generation?",
      "Which applicability/context rows make the recommendation truthful, and which evidence lanes back the row without collapsing everything into source-backed authority?",
      "Which current app-builder row, lowerer, fixture, MCP answer, or Atlas route would mislead a future agent if left stale?",
      "Which input dependency is missing and should be returned to the AI through input-readiness instead of guessed?",
      "If source is being generated, is this a one-target invocation, a fragment composition, a direct SourcePlan preview, or a component-pair assembly?",
      "Which interview effect class applies, and is the next step code, contract, fixture structure, Atlas memory/router hygiene, or deferred roadmap work?",
      "If a component pair is involved, is it being added to an existing app, wrapped in a runnable app shell, or only previewed as a component pair?",
      "If a new source callback is added, does catalog-integrity still report zero gallery contribution coverage issues?",
    ],
    relatedRouteIds: [
      "atlas.framework-capability-terrain",
      "semantic-runtime.source-plan",
      "semantic-runtime.app-builder-generated-fixture-contracts",
      "semantic-runtime.semantic-contract-verification",
      "mcp.developer-preview-shell",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "atlas.framework-capability-terrain",
    aliases: [
      "framework-capabilities",
      "framework.capabilities",
      "aurelia-capability-terrain",
      "what-aurelia-can-do",
    ],
    title: "Framework Capability Terrain",
    summary:
      "Route work that needs a compact map of what Aurelia can do, how app authors express those capabilities, and which framework choices are global, local, admitted, or consequential before any consumer turns them into guidance.",
    domains: [
      "atlas",
      "framework-capabilities",
      "aurelia-framework",
      "app-builder",
      "semantic-runtime",
      "mcp",
    ],
    roles: ["orient", "analyze", "refactor", "document", "improve-atlas"],
    terms: [
      "framework.capabilities",
      "framework capabilities",
      "framework capability terrain",
      "Aurelia capability terrain",
      "what Aurelia can do",
      "Aurelia affordances",
      "app-author source forms",
      "framework authoring surface",
      "semantic-runtime capability model",
      "MCP capability API",
      "app-builder capability grounding",
      "app-builder lowering axes from framework capabilities",
      "convention decorator inline custom element",
      "convention vs explicit",
      "decorator static define source forms",
      "CustomElement.define",
      "static $au",
      "as-custom-element",
      "as-element",
      "resource locality",
      "template-local resource",
      "app-global policy",
      "resource-local policy",
      "area-local policy",
      "binding-site policy",
      "route-local policy",
      "feature admission",
      "plugin admission",
      "semantic consequence",
      "StandardConfiguration capabilities",
      "bundle decomposition",
      "router admission area navigation nested viewport consequence",
      "state observation binding capability",
      "proxy observation ordinary getter @computed",
      "Shadow DOM cssModules shadowCSS",
      "packages-tooling plugin-conventions cssExtensions useCSSModule",
      "style tooling css modules conventions",
      "template controller capability",
      "framework syntax catalog",
      "compiler special template syntax",
      "usage-site containerless",
      "resource metadata catalog",
      "resource definition dependencies source",
      "DI configuration app task capability",
      "AppRoot actionless form submit",
      "allowActionlessForm",
      "submit.trigger preventDefault capability",
      "configuration:actionless-form-submit",
      "auLink grounding evidence",
    ],
    queryCanaries: [
      {
        query:
          "what can Aurelia do convention decorator inline custom element app-builder ontology",
        summary:
          "Resource/source-form ontology questions should route through the framework capability terrain before changing app-builder lowering axes.",
      },
      {
        query:
          "framework.capabilities capability api MCP Atlas for app developers",
        summary:
          "Public capability API design should route through the internal Atlas terrain before becoming an MCP or semantic-runtime surface.",
      },
      {
        query:
          "router admission area navigation nested viewport app-global local policy",
        summary:
          "Router taste questions should route to capability terrain so global admission and area-local navigation are not conflated.",
      },
      {
        query:
          "proxy observation getter computed observer locator collection observer target observer",
        summary:
          "Observation capability questions should route through framework terrain before consumer guidance chooses a code style.",
      },
      {
        query:
          "StandardConfiguration bundle decomposed capabilities plugin admission framework capability terrain",
        summary:
          "Bundle questions should route to capability terrain because bundles are discovery/admission conveniences rather than the ontology.",
      },
      {
        query:
          "built in resources plugin resources resource inventory source forms template controllers converters behaviors commands",
        summary:
          "Resource questions should distinguish authoring source forms from built-in and plugin resource inventories.",
      },
      {
        query:
          "style tooling cssExtensions useCSSModule defaultShadowOptions stringModuleWrap cssModules shadowCSS injection semantic runtime css ownership",
        summary:
          "Styling questions should route through framework/tooling wiring and avoid making semantic-runtime own CSS design semantics.",
      },
      {
        query:
          "framework capability grounding corpus backed evidence prerequisites app-builder policy",
        summary:
          "Consumer-policy derivation should inspect neutral grounding facts before treating curated terrain rows as app-builder input.",
      },
      {
        query:
          "actionless form submit allowActionlessForm preventDefault AppRoot framework capability",
        summary:
          "Actionless form submit behavior should route through pure capability terrain before app-builder derives submit policy or generated form guidance.",
      },
      {
        query:
          "framework capability evidence trace backing lens rows source anchors expensive materialization",
        summary:
          "Capability proof questions should route to evidence-trace when descriptor-level evidence is too shallow.",
      },
    ],
    anchors: [
      {
        kind: "memory",
        domains: ["atlas", "framework-capabilities"],
        role: "primary",
        summary:
          "Durable memory record frontier:framework-capability-terrain owns the direction for the framework-pure capability lens.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCapabilities,
        projection: "matrix",
        role: "primary",
        summary:
          "Capability matrix projection that expands resource-kind/source-form support and framework-local capability cells.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCapabilities,
        projection: "grounding",
        role: "primary",
        summary:
          "Grounding projection that keeps evidence, prerequisites, and exclusivity factual before downstream consumer policy is derived.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCapabilities,
        projection: "evidence-trace",
        role: "supporting",
        summary:
          "Heavier Atlas-local projection that joins capability evidence descriptors to backing lens answers, sampled rows, source anchors, seams, and continuations.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCapabilities,
        projection: "catalog",
        role: "supporting",
        summary:
          "Implemented capability terrain rows with source forms, locality, resource kinds/source support, framework effects, typed requirements, framework-local constraints, and evidence.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-capability-lenses.ts",
        symbolName: "answerFrameworkCapabilities",
        role: "primary",
        summary:
          "Curated framework.capabilities answerer and pure framework row contract.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/lens-contracts.ts",
        symbolName: "LensId",
        role: "primary",
        summary:
          "framework.capabilities is a first-class Atlas lens id.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-entities.ts",
        symbolName: "FrameworkObserverCapability",
        role: "supporting",
        summary:
          "Existing observation/reactivity capability vocabulary that can seed capability rows.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-entities.ts",
        symbolName: "FrameworkRouterCapability",
        role: "supporting",
        summary:
          "Existing router capability vocabulary that can seed capability rows.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-entities.ts",
        symbolName: "FrameworkExpressionCapability",
        role: "supporting",
        summary:
          "Existing expression/parser capability vocabulary that can seed capability rows.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/inquiry/runtime/framework-entities.ts",
        symbolName: "FrameworkRenderingCapability",
        role: "supporting",
        summary:
          "Existing rendering/lifecycle capability vocabulary that can seed capability rows.",
      },
      {
        kind: "source",
        filePath: "packages/atlas/src/framework/discovery-seeds.ts",
        symbolName: "FrameworkExportCapability",
        role: "supporting",
        summary:
          "Existing package-export capability vocabulary for bundle/configuration admission evidence.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkResources,
        projection: "convergence",
        role: "grounding",
        summary:
          "Framework resource convergence evidence for built-ins, source carriers, admission, syntax, and materialization.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkCorpus,
        projection: "doc-snippets",
        role: "grounding",
        summary:
          "Docs/tests evidence for app-author source forms such as local templates, styles, router, bindings, and plugins.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkRouter,
        projection: "relationships",
        role: "grounding",
        summary:
          "Router/viewport/route-context/route-tree evidence for admission and area navigation capability rows.",
      },
      {
        kind: "lens",
        lensId: LensId.FrameworkObservation,
        projection: "relationships",
        role: "grounding",
        summary:
          "Observation and binding observer evidence for proxy/getter/collection/binding capability rows.",
      },
      {
        kind: "lens",
        lensId: LensId.BridgeAuLink,
        projection: "anchors",
        role: "grounding",
        summary:
          "Grounding signal for framework concepts mirrored through auLink.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/aurelia-lowering-option.ts",
        symbolName: "AppBuilderAureliaLoweringAxis",
        role: "pressure",
        summary:
          "Current app-builder lowering axes should be checked against the framework capability terrain before further expansion.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/app-root.ts",
        symbolName: "AppRootConfig",
        role: "grounding",
        summary:
          "Semantic-runtime mirror of IAppRootConfig, including allowActionlessForm provenance.",
      },
    ],
    authority: [
      "Atlas memory record frontier:framework-capability-terrain for durable direction.",
      "framework.capabilities catalog rows for source forms, locality, resource kinds/source support, framework effects, typed requirements, framework-local constraints, and evidence.",
      "framework.capabilities matrix/evidence/evidence-trace/grounding projections for resource support, evidence descriptors, backing lens materialization, and prerequisite/exclusivity facts.",
      "Existing framework discovery capability enums for observer, router, expression, rendering, app-task, and export capabilities.",
      "framework.resources, framework.corpus, framework.router, framework.observation, framework.discovery, and bridge.aulink evidence rows.",
      "App-builder, MCP, and semantic-runtime coverage as downstream consumers, not as capability row fields or sources of truth.",
    ],
    cautions: [
      "Do not infer app-builder ontology from one enum or one docs snippet when framework semantics cross resource source forms, locality, and admission policy.",
      "Do not treat auLink coverage as proof that the capability terrain is complete; auLink is only one grounding signal for mirrored concepts.",
      "Do not treat StandardConfiguration or other bundles as the ontology. Decompose the capabilities that bundles admit.",
      "Do not collapse convention/default policy, explicit metadata forms, programmatic definitions, local inline templates, and semantic consequences into one co-equal option list.",
      "Do not let CSS modules stand in for all styling. Styling capability terrain should expose tooling, pairing, registry wiring, and asset topology without claiming CSS design ownership.",
      "Do not conflate resource source forms with built-in or plugin resource inventory. Creation mechanisms and available resource catalogs are separate questions.",
      "Keep v1 curated and source-backed; broad heuristic generation can propose candidates later but should not own row identity.",
    ],
    nextQuestions: [
      "Which Aurelia capability domain is being mapped: resources, styling, router, state/observation/binding, template controllers, DI/configuration/plugins, expressions, or lifecycle?",
      "Which app-author source forms express this capability, and if they are resource declaration forms, which resource kinds actually support them?",
      "Is the choice app-global, package/global registration, resource-local, template-local, area-local, binding-site, or route-local?",
      "What must be selected or admitted first before this capability can be used?",
      "Which framework lens, docs, tests, or auLink anchors ground the capability, and what evidence is still weak?",
    ],
    relatedRouteIds: [
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.source-plan",
      "semantic-runtime.observation.binding-flow",
      "router.viewport.authoring-semantics",
      "semantic-runtime.template-recursive-rendering",
      "mcp.developer-preview-shell",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.source-plan",
    aliases: ["source-plan", "semantic-runtime.source-plan"],
    title: "Source Plan Boundary",
    summary:
      "Route shared source artifact planning for app-builder, fixture materialization, diagnostics-to-action, and future edit planning without reviving legacy recipe APIs.",
    domains: [
      "semantic-runtime",
      "source-plan",
      "app-builder",
      "fixture-verification",
      "diagnostic-action",
      "edits",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "document"],
    terms: [
      "source-plan",
      "source plan",
      "source artifact plan",
      "source artifact envelope",
      "SourcePlan",
      "SourcePlanFile",
      "SourcePlanAssembly",
      "SourcePlanContribution",
      "SourcePlanContributionOriginKind",
      "SourcePlanTypeScriptImportContribution",
      "SourcePlanSourceFragmentContribution",
      "custom element pair SourcePlan",
      "appBuilderCustomElementPairSourcePlan",
      "appBuilderCustomElementClassFileArtifact",
      "component pair runnable app shell",
      "component pair project tooling",
      "component pair generated app fixture",
      "AppBuilderSourceLoweringInvocation origin",
      "SourcePlanOperationKind",
      "SourcePlanPolicy",
      "TypeScriptImportRequirement",
      "TypeScript import ordering",
      "package imports before relative imports",
      "typeScriptImportStatements import grouping",
      "typescript-import-source",
      "TypeScriptSourceText",
      "typeScriptSourceText",
      "typescript-source-text",
      "sourcePlanFileTypeScriptImportRequirements",
      "SourcePlanProjectTooling",
      "aureliaSourcePlanProjectTooling",
      "SourcePlanPackageToolingPolicy",
      "SourcePlanBuildToolPolicy",
      "aureliaRegistrationChain",
      "configured Aurelia entrypoint",
      "compact entrypoint registration",
      "single RouterConfiguration registration",
      "Aurelia register chain",
      "AppBuilderBaseline package tooling",
      "SourcePattern",
      "SourcePatternModule",
      "SourcePatternModules",
      "SourcePatternModuleKey",
      "SourcePatternParameter",
      "SourcePatternParameterKey",
      "SourcePatternAdaptationGroupKey",
      "SourcePatternUsePolicy",
      "SourcePatternParameterValue",
      "source-name.ts",
      "sourceNameWords",
      "pascalSourceName",
      "lowerCamelSourceName",
      "kebabSourceName",
      "ExpectedSemanticEffectKind",
      "AppBuilderDomainSlotKey",
      "sourcePatternUsePolicy",
      "sourcePlanHasCompleteText",
      "source pattern parameters",
      "source pattern modules",
      "sourcePlan.pattern.modules",
      "sourcePlan.pattern.parameters",
      "AppBuilderSourcePatternKey",
      "appBuilderMinimalAppShellSourcePattern",
      "sourceParameterValues",
      "source parameter applications",
      "package dependency preview",
      "project tooling preview",
      "app-builder SourceNaming input contract",
      "app-builder SourceProjectTooling input contract",
      "app-builder source lowering",
      "fixture materialization source plan",
      "app-builder generated fixture materialization",
      "sourcePlanPlacement",
      "appBuilderSourceLoweringSourcePlanFrame",
      "componentPairSourcePlan",
      "directSourcePlanTargetFrame",
      "direct SourcePlan target frame",
      "direct SourcePlan target preflight",
      "diagnostic action source plan",
      "future edit planning source plan",
      "neutral source-plan substrate",
      "route configuration source plan",
      "routerRouteDecoratorSourceText",
      "routerRouteConfigurationObjectExpressionSourceText",
      "route configuration trailing commas",
      "appBuilderRoutedCollectionDetailSourcePlan",
      "routed collection detail generated source plan",
      "i18n configuration source plan",
    ],
    queryCanaries: [
      {
        query:
          "source plan source pattern parameters app builder source lowering",
        summary:
          "Shared source-plan questions should route to the neutral substrate before choosing app-builder, fixture, diagnostic-action, or future edit callers.",
      },
      {
        query: "fixture materialization source artifacts complete text project tooling SourcePlan",
        summary:
          "Fixture materialization should keep using the shared SourcePlan envelope rather than generator-local file models.",
      },
      {
        query: "app-builder generated app package.json tsconfig dependency SourcePlanProjectTooling",
        summary:
          "Runnable generated-app tooling should route through SourcePlanProjectTooling rather than ordinary source files or app-builder-local metadata.",
      },
      {
        query: "app-builder source placement input contract source naming SourcePatternParameterValue source-name",
        summary:
          "App-builder naming payloads should route through source-plan naming and source-pattern adaptation primitives before adding local naming helpers.",
      },
      {
        query: "app-builder generated source pattern metadata SourcePattern modules",
        summary:
          "Complete generated SourcePlans should carry source-pattern metadata for domain/data/style/code-economy posture and reusable source modules.",
      },
      {
        query: "generated TypeScript source imports origin-bearing SourcePlanContribution typeScriptSourceText",
        summary:
          "Generated TypeScript files should render imports from source-plan contributions rather than anonymous copies that lose fragment origin.",
      },
      {
        query:
          "source plan TypeScript import grouping package imports before relative imports typeScriptImportStatements",
        summary:
          "Generated TypeScript files should route through typeScriptImportStatements when package-vs-relative import order matters.",
      },
      {
        query:
          "app-builder custom element pair SourcePlan template artifact TypeScript class member fragments component pair",
        summary:
          "Companion TypeScript/template source plans should route through the custom-element pair assembler when template compositions and class-member fragments need one SourcePlan boundary.",
      },
      {
        query:
          "component pair generated app fixture app shell project tooling expected effects",
        summary:
          "A component pair is not a full generated app contract until app-shell/tooling assembly and reopen expectations are explicit.",
      },
      {
        query:
          "routed collection detail expected effects route configuration route consumption template reopen",
        summary:
          "Routed collection/detail SourcePlan expected effects should stay split by app/state, route configuration, route consumption, and template/runtime promise families.",
      },
      {
        query: "app-builder source-lowering origin SourcePlan contribution origin kind",
        summary:
          "Composed app-builder fragments should preserve app-builder source-lowering origins through SourcePlanContribution instead of masquerading as direct part invocation fragments.",
      },
      {
        query:
          "directSourcePlanTargetFrame direct SourcePlan target preflight effect contracts target refs",
        summary:
          "Direct app-builder SourcePlan targets should share one frame for preflight rows, target refs, effect contracts, and descriptor-backed admission issues.",
      },
      {
        query: "routed collection detail source plan route decorator router config route parameters",
        summary:
          "Generated routed collection/detail source should route through shared SourcePlan plus router-owned source serializers, not a composition-local file model.",
      },
      {
        query: "route configuration source plan trailing commas nested routes routerRouteConfigurationObjectExpressionSourceText",
        summary:
          "Generated @route object literals should route through the router-owned serializer so multiline route arrays and objects stay reviewable.",
      },
      {
        query:
          "source plan compact entrypoint registration single RouterConfiguration register chain",
        summary:
          "Entrypoint source should route through aureliaRegistrationChain when single framework configuration registrations need compact generated Aurelia source.",
      },
      {
        query: "diagnostic action source plan future edit application host boundary",
        summary:
          "Diagnostics-to-action and future editing should route through SourcePlan before any host write policy is introduced.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlan",
        role: "primary",
        summary:
          "Neutral source artifact plan emitted before a host writes files.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlanAssembly",
        role: "primary",
        summary:
          "Stateful source-plan assembler carrying edit policy and text authority across generated file artifacts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-assembly.ts",
        symbolName: "AppBuilderSourcePlanAssembly",
        role: "supporting",
        summary:
          "App-builder-specific generated-source transaction over SourcePlanAssembly for generated app source, admission, dependencies, and project tooling.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/custom-element-pair-source-plan.ts",
        symbolName: "appBuilderCustomElementPairSourcePlan",
        role: "primary",
        summary:
          "App-builder custom-element SourcePlan pair assembler for companion TypeScript/template artifacts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/custom-element-pair-source-plan.ts",
        symbolName: "appBuilderCustomElementClassFileArtifact",
        role: "supporting",
        summary:
          "SourcePlan TypeScript class artifact builder that preserves imported class-member fragment contributions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlanContribution",
        role: "primary",
        summary:
          "File-local generated-source ledger for import requirements and source fragments before final text assembly.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlanContributionOriginKind",
        role: "supporting",
        summary:
          "Enum-backed contribution-origin family for app-builder part invocations, app-builder source-lowering invocations, and framework configuration admissions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/typescript-import-source.ts",
        symbolName: "TypeScriptImportRequirement",
        role: "primary",
        summary:
          "Neutral static TypeScript import requirement merged by source-plan import assembly.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/typescript-import-source.ts",
        symbolName: "typeScriptImportStatements",
        role: "supporting",
        summary:
          "Generated TypeScript import renderer that groups package/bare imports before relative imports while preserving caller order within each group.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/typescript-source-text.ts",
        symbolName: "typeScriptSourceText",
        role: "primary",
        summary:
          "Complete TypeScript source-text assembler that keeps import rendering and contribution provenance on one ledger.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePlanOperationKind",
        role: "primary",
        summary:
          "Typed file-operation vocabulary for source-plan artifacts; use this instead of caller-owned magic strings.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePattern",
        role: "primary",
        summary:
          "Pattern metadata and adaptation slots that keep reusable mechanics separate from sample domains.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePatternParameterKey",
        role: "supporting",
        summary:
          "Enum-backed source-pattern parameter identities so route/app-builder adaptation keys stay typed and Atlas-visible.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-name.ts",
        symbolName: "sourceNameWords",
        role: "supporting",
        summary:
          "Shared generated-name word splitting used before app-builder renders PascalCase, lowerCamelCase, kebab-case, and title forms.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePatternModuleKey",
        role: "supporting",
        summary:
          "Enum-backed source-pattern module identities for reusable app-building mechanics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-pattern-modules.ts",
        symbolName: "SourcePatternModules",
        role: "supporting",
        summary:
          "Shared source-pattern module vocabulary spent by app-builder source plans.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-patterns.ts",
        symbolName: "AppBuilderSourcePatternKey",
        role: "supporting",
        summary:
          "App-builder-owned source-pattern keys attached to generated SourcePlans.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePatternUsePolicy",
        role: "supporting",
        summary:
          "Shared source-use policy consumed by app-builder and source-plan instead of package-local aliases.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-model.ts",
        symbolName: "AppBuilderDomainSlotKey",
        role: "supporting",
        summary:
          "Enum-backed app-builder domain slot keys so source-lowering request rows do not carry raw parameter ids.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/package-tooling.ts",
        symbolName: "SourcePlanProjectTooling",
        role: "supporting",
        summary:
          "Structured package/typecheck artifacts that travel beside source plans without becoming host execution policy.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/package-tooling.ts",
        symbolName: "aureliaSourcePlanProjectTooling",
        role: "supporting",
        summary:
          "Aurelia starter package/tooling baseline that emits package dependencies, scripts, package manifest, tsconfig, and local asset declarations.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/aurelia-entrypoint-source-plan.ts",
        symbolName: "aureliaRegistrationChain",
        role: "supporting",
        summary:
          "Entrypoint registration-chain formatter that keeps simple single registrations compact while preserving multiline registration expressions.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "appBuilderRoutedCollectionDetailSourcePlan",
        role: "supporting",
        summary:
          "Routed browse/detail app-builder composition that uses SourcePlanAssembly for nested routeable components, load params, and DI state lookup.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-placement.ts",
        symbolName: "sourcePlanPlacement",
        role: "supporting",
        summary:
          "App-builder SourcePlan placement resolver that keeps direct transport fields and supplied SourcePlacement facets in one conflict-checked model.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-selection.ts",
        symbolName: "appBuilderSourceLoweringSourcePlanFrame",
        role: "supporting",
        summary:
          "App-builder selected-lowering frame that dispatches one SourcePlan request branch before public projection.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-direct.ts",
        symbolName: "directSourcePlanTargetFrame",
        role: "supporting",
        summary:
          "Direct app-builder SourcePlan target admission frame over preflight rows, target refs, effect contracts, and descriptor-backed issues.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan-component-pair.ts",
        symbolName: "componentPairSourcePlan",
        role: "supporting",
        summary:
          "Component-pair SourcePlan phase that assembles custom-element pair and root app-shell source artifacts after placement and selected-branch lowering.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-configuration-source.ts",
        symbolName: "routerRouteDecoratorSourceText",
        role: "supporting",
        summary:
          "Router-owned source serializer for generated @route object literals used by routed source plans.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-configuration-source.ts",
        symbolName: "routerRouteConfigurationObjectExpressionSourceText",
        role: "supporting",
        summary:
          "Router-owned route configuration object serializer for reviewable generated route trees.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "appBuilderRoutedCollectionDetailSourcePlanExpectedEffects",
        role: "supporting",
        summary:
          "App-builder routed collection/detail SourcePlan effect projection that reads route parameters from SourcePattern metadata.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "routedCollectionDetailRouteConfigurationExpectedEffects",
        role: "supporting",
        summary:
          "Routed SourcePlan route-configuration expected-effect group for router options, route config carriers, and viewport targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/source-plan-expected-effects.ts",
        symbolName: "routedCollectionDetailRouteConsumptionExpectedEffects",
        role: "supporting",
        summary:
          "Routed SourcePlan route-consumption expected-effect group for viewport declarations and route-parameter reads.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:source-plan-admission-origins",
        role: "primary",
        summary:
          "SourcePlan admission-origin contract proving framework/plugin configuration fragments preserve contribution provenance through generated entrypoints.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/source-plan/",
        role: "primary",
        summary:
          "Shared source artifact, pattern, naming, field-schema, route-pattern, and project-tooling helpers.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/app-builder/",
        role: "supporting",
        summary:
          "Clean-room app-builder source lowering consumes SourcePlan after typed app intent is known.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/diagnostic-action/action.ts",
        symbolName: "DiagnosticActionKind",
        role: "supporting",
        summary:
          "Diagnostics-to-action owns repair/action classification before future source plans become host edits.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/fixture-verification/",
        role: "supporting",
        summary:
          "Fixture verification consumes expected semantic effects after source plans are materialized and reopened.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fixture-verification/expected-effect.ts",
        symbolName: "ExpectedSemanticEffectKind",
        role: "supporting",
        summary:
          "Single expected-effect ontology reused by app-builder verification promises and corpus fixture-seed discovery.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "source-plan"],
        role: "grounding",
        summary:
          "Durable memory for the neutral source-plan boundary and future maintenance pressure.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "app-builder", "ontology"],
        role: "grounding",
        summary:
          "App-builder memory owns new public generation direction; source-plan should serve it without owning the ontology.",
      },
    ],
    authority: [
      "source-plan owns source artifact and pattern envelopes; callers own generation intent, host writes, and verification policy.",
      "SourcePlanAssembly owns generated-file assembly when a caller creates multiple artifacts under one policy/text-authority lifetime.",
      "AppBuilderSourcePlanAssembly owns the app-builder-specific generated-source transaction over SourcePlanAssembly so concrete source lowerers do not restate policy, entrypoint, dependency, and tooling details.",
      "Custom-element pair SourcePlan assembly owns the file-pair boundary for generated template artifacts plus companion TypeScript class-member fragments; lower-level invocation and composition origins should remain visible through SourcePlanContribution rows.",
      "SourcePlanProjectTooling owns generated package/build artifacts when a source plan needs a runnable project baseline.",
      "app-builder may consume SourcePlan for clean-room source lowering after typed requests have selected ontology targets, caller/domain slots, seed data, and Aurelia lowering axes.",
      "fixture verification consumes materialized source facts and expected effects; it should not turn SourcePlan into a public recipe taxonomy.",
      "diagnostics-to-action and future editing may plan through SourcePlan, but host write policy remains separate until explicitly modeled.",
    ],
    cautions: [
      "Do not reintroduce generator-local SourcePlan aliases or compatibility shims when the shared SourcePlan model is available.",
      "Do not copy repeated SourcePlanFile/SourcePlanText constructor blocks into each generator when SourcePlanAssembly can carry the shared policy.",
      "Do not restate app-builder baseline SourcePlan policy, generated text authority, configured entrypoint admission, or project tooling in each source-starting lowerer when AppBuilderSourcePlanAssembly already owns that transaction.",
      "Do not hide sample domains, copy, seed data, or presentation defaults inside reusable source-pattern identities.",
      "Do not represent package dependencies or tsconfig requirements as ordinary app source files when SourcePlanProjectTooling can carry them structurally.",
      "Do not confuse a companion TypeScript/template component-pair SourcePlan with a runnable generated app fixture; the latter also needs project tooling, root/app-shell assembly, and semantic reopen expectations.",
      "Do not treat a complete SourcePlan as permission to write files; edit application is a future host boundary.",
    ],
    nextQuestions: [
      "Is this source artifact work shared SourcePlan policy, app-builder lowering, fixture verification, diagnostics-to-action, or future host edit application?",
      "Does the source plan need complete text now, or only pattern/adaptation metadata for a next menu or comparison answer?",
      "Is this generated artifact a single file, a full SourcePlan transaction, or a component pair assembled from separate template and TypeScript fragment lowerers?",
      "Does the source plan need projectTooling, package dependencies, or build-tool files for the generated source to be runnable?",
      "Which SourcePattern modules and parameters are reusable mechanics, and which details belong to a reference scenario, seed data set, caller domain descriptor, or fixture?",
      "Which verifier or public API row will prove the materialized source plan did what it promised?",
    ],
    relatedRouteIds: [
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.semantic-contract-verification",
      "diagnostics.template-repair-policy",
      "semantic-runtime.lsp-edit-affordance-substrate",
      "mcp.developer-preview-shell",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.app-builder-generated-fixture-contracts",
    aliases: [
      "app-builder-generated-fixture-contracts",
      "generated-app-fixture-contracts",
      "ide-mcp-generated-fixture-contracts",
      "control-use-generated-fixture-contracts",
    ],
    title: "App Builder Generated Fixture Contracts",
    summary:
      "Connect app-builder-generated fixture contracts with Semantic IDE/MCP affordance contracts so generated source, exact inputs, manifests, expected effects, references, diagnostics-to-repair, and future workspace edits are tested against realistic Aurelia pattern compositions.",
    domains: [
      "semantic-runtime",
      "app-builder",
      "fixtures",
      "lsp",
      "mcp",
      "edits",
      "references",
      "expected-effects",
    ],
    roles: ["orient", "author", "analyze", "verify", "improve-atlas"],
    terms: [
      "editing fixtures",
      "edit fixtures",
      "generated editing fixtures",
      "app-builder generated fixtures",
      "app builder generated fixtures",
      "app-builder generated fixture contracts",
      "generated app fixture contracts",
      "app-builder generated fixture index",
      "generated-fixture-index",
      "fixtureSummaryRows",
      "generated fixture summary rows",
      "generated-fixture-index fixtureSummaryRows",
      "app-builder-source-lowering-fixture-index",
      "source-lowering pressure fixture index",
      "focused source-lowering pressure coverage",
      "decisionBundleInputContractIds",
      "decisionBundleInputFacetIds",
      "decisionBundleInputSummaries",
      "sourceLoweringRequestFieldUsageRows",
      "sourceLoweringRequestFieldUsageIds",
      "appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest",
      "appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest",
      "shared request-field usage extractor",
      "source-lowering request-field usage extractor",
      "sourceLoweringRequestFieldRegistryCoverageRows",
      "sourceLoweringRequestFieldRegistryCoverageSummary",
      "policySatisfactionCandidateCoverageRows",
      "policySatisfactionCandidateCoverageSummary",
      "domainModelCoverageSummary",
      "domainModelKindCoverageSummary",
      "domainModelCoverageRows",
      "domain model kind coverage",
      "domain kind coverage generated fixture",
      "generated fixture domain concentration",
      "generated fixture relationship kind coverage",
      "generated fixture action kind coverage",
      "relationship action kind coverage generated fixture",
      "generatedControlUsePolicyRows",
      "generatedControlUseRecommendationStatuses",
      "generatedControlUsePolicySatisfactionCandidateTargetRefs",
      "nested source-lowering request-field usage",
      "source-lowering request-field registry coverage",
      "policy-satisfaction candidate fixture coverage",
      "generated control-use policy fixture coverage",
      "unused source-lowering request fields",
      "unregistered used request fields",
      "unused required source-lowering request fields",
      "combined generated and pressure request-field coverage",
      "source-plan selection request fields",
      "component-pair source-plan selection request fields",
      "compositionKind request field coverage",
      "component-pair request field usage rows",
      "fixture index exact request response",
      "generated fixture source-lowering coverage index",
      "IDE generated fixture contract",
      "MCP generated fixture contract",
      "rename fixture",
      "reference fixture",
      "definition fixture",
      "edit-plan fixture",
      "expected edit plan",
      "expected references",
      "expected reference set",
      "expected definition target",
      "non-editable span",
      "editability blocker",
      "source span exactness",
      "reference-contract fixture",
      "large editing fixture",
      "semantic IDE fixture",
      "IDE affordance fixture",
      "diagnostics to repair",
      "template to TypeScript references",
      "route parameter references",
      "translation key references",
      "resource rename fixture",
      "source role editability",
      "app-builder ontology source-lowering generated edit fixtures",
      "control-use generated fixture contracts",
      "static submit generated fixture contracts",
      "containing form submit generated fixture",
      "generated control-use row verification",
      "row action generated fixture",
      "table row action generated fixture",
      "command action generated fixture",
      "explicit command actions generated fixture",
      "component-pair-task-command-actions",
      "DomainCommandAction methodParameters",
      "typed command method parameter",
      "CollectionTableColumns actionName",
      "field variety generated fixture",
      "native field variety",
      "native controls generated fixture",
      "fieldControlSelections generated fixture",
      "native textarea range radio checkbox-list generated fixture",
      "ControlAccessibility generated fixture",
      "AccessibilityHelpError fieldName generated fixture",
      "field-scoped accessibility generated fixture",
      "VisualClassHooks fieldName generated fixture",
      "form VisualClassHooks generated fixture",
      "FieldGroup VisualClassHooks targetRefs generated fixture",
      "NativeSubmitForm FieldGroup target-scoped VisualClassHooks",
      "stale field-scoped generated fixture",
      "UnknownFieldAccessibilityMessageField generated fixture",
      "UnknownFieldVisualHookField generated fixture",
      "generated-source-quality fixture verification",
      "trailing whitespace generated source quality",
      "generated-app-builder-idempotency",
      "same input same output generated fixture",
      "app-builder request idempotency fixture verification",
      "generated app-builder contract row idempotency",
      "generated manifest contract rows",
      "sourcePlanWitnessRows idempotency",
      "duplicate static template attributes generated fixture",
      "duplicate class generated fixture",
      "aria-describedby generated fixture",
      "domain field defaultValue",
      "choice field defaultValue",
      "domain field optionTypeName",
      "finite option type alias",
      "choice set plural value type",
      "domain relationship kind",
      "DomainRelationships generated fixture coverage",
      "component-pair-task-assignment-section",
      "local relationship source-lowering generated fixture",
      "component-pair-task-reviewers-section",
      "reference-many local relationship source-lowering generated fixture",
      "AppBuilderDomainRelationshipKind generated fixture",
      "AppBuilderDomainActionKind generated fixture",
      "action scope generated fixture coverage",
      "navigation action scope generated fixture coverage",
      "number date checkbox select generated fixture",
      "fieldset legend generated field group",
      "loading empty error generated fixture",
      "fulfilledContentComposition",
      "fulfilled content composition",
      "promise fulfilled branch generated fixture",
      "loading empty error collection table generated fixture",
      "collection list generated fixture",
      "collection card generated fixture",
      "collection table local filter generated fixture",
      "local filtering collection query generated fixture",
      "component-pair-task-table-local-filter",
      "filterBindingExpressions generated fixture",
      "filtered collection getter generated fixture",
      "native search input generated control-use row",
      "component-pair-task-list-local-collection",
      "component-pair-task-card-local-collection",
      "component-pair-contact-card-string-id",
      "contact card string identity generated fixture",
      "contact card email display link generated fixture canary",
      "control affordance fixture canary",
      "generated fixture coverage is not ontology completeness",
      "non-task collection-card generated fixture",
      "CollectionDisplayFields generated fixture",
    ],
    queryCanaries: [
      {
        query:
          "editing fixtures app-builder ontology source-lowering generated fixtures semantic IDE affordance generated fixture contracts",
        summary:
          "The coupled editing/app-builder/fixture thread should route to this bridge before splitting into generated app contracts or IDE affordance substrates.",
      },
      {
        query:
          "app-builder generated fixture index exact request response semantic verification source-lowering coverage",
        summary:
          "Whole-set generated-app fixture review should start from generated-fixture-index.json before drilling into per-fixture requests, source, manifests, or verification snapshots.",
      },
      {
        query:
          "app-builder generated fixture qualitative review source shape SourcePattern metadata sourcePlan.pattern",
        summary:
          "Qualitative source-shape review should route through the rolling generated-fixture review note before changing SourcePattern metadata, sourcePlan.pattern expectations, or fixture-specific verification boundaries.",
      },
      {
        query:
          "app-builder generated fixture index decisionBundleInputContractIds decisionBundleInputFacetIds input contract facet coverage",
        summary:
          "Generated fixture input-coverage review should use the index contract/facet rollups before opening individual app-builder-request snapshots.",
      },
      {
        query:
          "app-builder generated fixture index sourceLoweringRequestFieldUsageRows component-pair nested request fields",
        summary:
          "Nested component-pair request-field review should use the generated fixture index usage rows before opening full request snapshots.",
      },
      {
        query:
          "app-builder shared request-field usage extractor appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest generated fixture materializer",
        summary:
          "Generated fixture materializers and future coverage tools should use the shared source-lowering request-field usage extractor instead of local request-tree walkers.",
      },
      {
        query:
          "app-builder generated fixture index sourceLoweringRequestFieldRegistryCoverageRows unused source-lowering request fields unregistered used request fields",
        summary:
          "Generated request-field coverage review should compare actual fixture request usage against the source-lowering request-field registry before adding fixture variants or changing request-field policy.",
      },
      {
        query:
          "app-builder generated fixture index policySatisfactionCandidateCoverageRows generatedControlUsePolicyRows contextual executable policy candidates",
        summary:
          "Generated policy-candidate coverage review should use the index rows before writing custom scripts or adding fixture variants.",
      },
      {
        query:
          "app-builder generated fixture index domainModelKindCoverageSummary relationship action kind coverage domain concentration",
        summary:
          "Generated domain-model coverage review should use the ontology-relative kind summary before adding fixture variants, especially for absent relationship kinds or action-scope variants versus covered identity, field, and action kinds.",
      },
      {
        query:
          "app-builder source-lowering pressure fixture index unused required request fields generated pressure combined coverage",
        summary:
          "Request-field coverage decisions should compare generated app fixtures with the focused source-lowering pressure index before adding end-user-shaped fixture variants.",
      },
      {
        query:
          "app-builder generated fixture idempotency same input same output SourcePlan tracked files contract rows sourcePlanWitnessRows",
        summary:
          "Generated app fixture idempotency should route through stored app-builder requests, SourcePlan file text comparison, generated manifest contract row comparison, and semantic verification snapshots.",
      },
      {
        query: "rename fixture expected reference set generated app builder source spans",
        summary:
          "Rename fixture planning should route through generated fixture and reference-contract expectations.",
      },
      {
        query: "larger editing fixtures require app-builder fixture generation",
        summary:
          "Large edit fixtures should be generated from app-builder ontology/source-lowering selections rather than hard-coded as another reference app.",
      },
      {
        query: "diagnostics to repair expected edit plan exact source ranges",
        summary:
          "Diagnostics-to-edit pressure should route through generated fixture contracts before local repair payloads are invented.",
      },
      {
        query: "control-use generated fixture contracts static submit containing form submit",
        summary:
          "Generated control-use expectations should route through the fixture-contract lane before deciding whether authored app queries or semantic contract verification need a substrate fix.",
      },
      {
        query: "app-builder generated table row action DomainCommandAction methodParameters",
        summary:
          "Generated row-action fixtures should route through this lane when checking table action columns, row-local handler expressions, typed command methods, and generated control-use rows.",
      },
      {
        query: "app-builder generated command actions update delete archive assign submit refresh explicit method bodies",
        summary:
          "Generated command-action fixture work should route through component-pair task command actions when checking caller-owned DomainActions, native-button wiring, explicit DomainCommandAction method bodies, and local collection mutability.",
      },
      {
        query: "app-builder native field variety domain field defaultValue optionTypeName generated fixture",
        summary:
          "Native field-control fixture work should route through this lane when checking first-ring native controls, explicit field defaults, finite option type aliases, and generated control-use rows.",
      },
      {
        query: "app-builder fieldControlSelections native textarea range radio checkbox-list generated fixture fieldset legend",
        summary:
          "Explicit form field-control selection work should route through this lane when checking textarea/range/radio/checkbox-list generation, grouped-control fieldset semantics, and control-use verification.",
      },
      {
        query: "app-builder ControlAccessibility fieldName AccessibilityHelpError aria-describedby generated fixture",
        summary:
          "Generated form accessibility-message work should route through this lane when checking exact caller input, field-scoped help/error/status messages, and control-use described-by verification.",
      },
      {
        query: "app-builder form VisualClassHooks FieldGroup targetRefs generated-source-quality duplicate class generated fixture",
        summary:
          "Generated form visual-hook work should route through this lane when checking explicit NativeSubmitForm plus FieldGroup target scopes, generated class/data hooks, and duplicate static template attribute verification.",
      },
      {
        query: "app-builder stale field-scoped ControlAccessibility VisualClassHooks UnknownFieldAccessibilityMessageField UnknownFieldVisualHookField generated fixture",
        summary:
          "Generated form scoped-input work should route through this lane when checking that field-scoped caller payloads are either spent by selected fields or rejected with typed issues.",
      },
      {
        query: "app-builder collection list card generated fixture CollectionDisplayFields local collection state",
        summary:
          "Generated collection list/card fixture work should route through this lane when checking display-field projections as distinct from table-column payloads.",
      },
      {
        query: "app-builder component-pair-task-table-local-filter local filtering collection query generated fixture",
        summary:
          "Generated local filtering work should route through the filterable table fixture, explicit filterBindingExpressions, generated local query state, and native search-input control-use verification.",
      },
      {
        query: "app-builder contact card string identity non-task collection-card generated fixture trailing whitespace",
        summary:
          "Non-task/string-identity generated fixture work should route through this lane when checking domain-generic collection-card lowering and generated-source-quality whitespace guardrails.",
      },
      {
        query:
          "app-builder contact card email display link mailto control affordance fixture canary",
        summary:
          "Contact-card generated fixture review should treat email/display-link gaps as app-builder control-affordance pressure, not proof that current fixture/index coverage is complete.",
      },
      {
        query: "app-builder loading empty error fulfilled content collection table generated fixture",
        summary:
          "Async generated-app fixture work should route through this lane when checking promise template-controller regions, empty-state branches, and explicit nested fulfilled-content compositions.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Wired,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "Generated app-builder fixture work now exercises typed targetAppBuilderQuery continuations across catalog/readiness/detail/source-lowering surfaces, with source-writing follow-ups gated by source-lowering request-field summaries. IDE edit/reference fixture affordances remain deferred to the Semantic IDE surface.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-field-source.ts",
        symbolName: "appBuilderDomainFieldSourceModels",
        role: "supporting",
        summary:
          "Domain field source models spend explicit finite option type aliases before deriving fallback source names.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-model.ts",
        symbolName: "AppBuilderDomainFieldDescriptor",
        role: "supporting",
        summary:
          "Caller/domain field descriptor owns optional optionTypeName input for finite choice fields.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-model.ts",
        symbolName: "AppBuilderDomainRelationshipKind",
        role: "supporting",
        summary:
          "Domain relationship-kind universe used by generated fixture domain kind coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/domain-model.ts",
        symbolName: "AppBuilderDomainActionKind",
        role: "supporting",
        summary:
          "Domain action-kind universe used by generated fixture domain kind coverage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/source-reference.ts",
        symbolName: "SemanticSourceReference",
        role: "primary",
        summary:
          "Current source-locus envelope that editing fixtures must pressure for exact authored edit ranges.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject",
        role: "primary",
        summary:
          "Shared TypeScript Program/checker epoch for generated fixture diagnostics and reference/edit analysis.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fixture-verification/expected-effect.ts",
        symbolName: "ExpectedSemanticEffect",
        role: "supporting",
        summary:
          "Current verification primitive that future IDE/edit effects can extend or sit beside.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/source-plan/source-plan.ts",
        symbolName: "SourcePattern",
        role: "supporting",
        summary:
          "Current source-plan metadata for generating realistic fixture source from pattern intent.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/app-builder/ontology/source-lowering-request-field-coverage.ts",
        symbolName: "appBuilderSourceLoweringRequestFieldRegistryCoverageRows",
        role: "primary",
        summary:
          "Shared request-field usage/registry coverage helper for generated app fixtures and focused source-lowering pressure fixtures.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/app-builder/generated-fixture-index.json",
        role: "primary",
        summary:
          "Root review map for generated app-builder fixture requests, responses, generated source files, source-lowering targets, effect kinds, decision-bundle counts, decision-bundle input contract/facet rollups, domain model kind coverage, advertised request-field surfaces, and actual nested request-field usage rows.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-builder-source-lowering-fixture-index.json",
        role: "supporting",
        summary:
          "Focused source-lowering pressure review map for direct invocation/composition/SourcePlan request-field usage and registry coverage.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-generated",
        role: "primary",
        summary:
          "Regenerates generated app-builder app contract fixtures, the generated fixture index, and generated semantic verification snapshots.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime check:fixture-typecheck fixtures/app-builder",
        role: "supporting",
        summary:
          "Typechecks generated app-builder fixture source through the shared semantic-runtime fixture typecheck lane.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime check:fixture-manifests fixtures/app-builder",
        role: "supporting",
        summary:
          "Fixture verifier reruns generated app-builder requests and compares SourcePlan source/tooling text plus generated manifest contract rows before semantic reopen verification.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-pressure",
        role: "supporting",
        summary:
          "Regenerates focused app-builder source-lowering pressure fixtures and their request-field coverage index.",
      },
      {
        kind: "lens",
        lensId: LensId.TsType,
        projection: "rename",
        role: "grounding",
        summary:
          "Atlas TypeScript rename lane provides precedent and pressure for edit fixtures, not the whole semantic-runtime answer.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "app-builder", "ontology"],
        role: "grounding",
        summary:
          "App-builder ontology memory owns current source-lowering intent and reference-scenario separation.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "lsp", "mcp", "edits", "references"],
        role: "grounding",
        summary:
          "Semantic IDE affordance memory owns strict reference/edit requirements.",
      },
    ],
    authority: [
      "App-builder pattern ontology for generating realistic low-boilerplate source.",
      "Generated fixture index rows for exact request, generated source, domain kind coverage, source-lowering registry coverage, policy-satisfaction coverage, and semantic verification.",
      "Expected semantic effects and future edit/reference effects for fixture verification.",
      "Semantic IDE Affordance Substrate for definition/reference/edit algebra and strict source precision when the fixture tier is edit/reference oriented.",
      "TypeSystemProject, overlays, binding/data-flow, router, i18n, resource, and source-reference products as reference inputs.",
    ],
    cautions: [
      "Do not add generated-app fixture variants solely because a coverage count is nonzero; classify whether the gap is source-lowering, domain-design, pressure-only, or deferred app-design work.",
      "Do not treat a green generated fixture index as app-builder v1 completeness when the current ontology only covers the control affordances it already knows how to name.",
      "Do not make large editing fixtures another hard-coded example domain inside app-builder.",
      "Do not treat overlay generated spans as authoritative edit ranges without joining authored source provenance.",
      "Do not start with a mutating rename tool when the reference family and editability contract are still incomplete.",
      "Do not let read-only navigation requirements hide stricter edit requirements; editing is the tightest consumer.",
    ],
    nextQuestions: [
      "Which fixture tier is needed: reference-contract, edit-plan, generated app, or contrast fixture?",
      "Which generated index lane is driving the work: domain kind coverage, request-field registry coverage, policy-satisfaction coverage, source-quality/idempotency, expected effects, or semantic reopen verification?",
      "Is the visible gap a fixture gap, a source-lowering substrate gap, a domain/app-design frontier, or pressure-only coverage?",
      "Which exact request input and app-builder pattern composition should generate the realistic source without inventing app-builder defaults?",
      "If this is edit/reference pressure, which semantic subjects, exact spans, and blockers must the fixture prove?",
    ],
    relatedRouteIds: [
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.lsp-edit-affordance-substrate",
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.semantic-contract-verification",
      "semantic-runtime.type-system-project-epoch",
      "semantic-runtime.template-overlay-integration",
      "mcp.developer-preview-shell",
      "atlas.work-router.self-improvement",
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
      "EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS",
      "ExpectedSemanticEffectObservationSurface",
      "semantic effect descriptor",
      "expected effect descriptor",
      "effect kind query families",
      "behavior grounding witness",
      "fast testing lane",
      "slow confidence lane",
      "auLink pseudo-test",
      "auLink as grounding",
      "query cost contract",
      "inquiry budget contract",
      "semantic effects not snapshots",
      "support-state ladder",
      "support state promise strength",
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
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "A fast semantic contract now verifies catalog-wide public continuation coverage plus fixture-backed canaries across diagnostics, TypeScript diagnostics, template, open seams, source/evaluation, resources, DI, observation, binding, rendering, state, i18n, validation, fetch-client, dialog, router, app-diagnostic related-family coverage, repair-intent narrowing, same-target related-diagnostic continuations, template repair-pressure source precision, bounded public-row source-reference carrier discovery, external-source precision, query-claim followability, and authoring-deferred behavior. Deeper source/provenance precision witnesses remain a separate route-specific frontier.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fixture-verification/expected-effect.ts",
        symbolName: "ExpectedSemanticEffect",
        role: "primary",
        summary:
          "Expected effects are the first semantic-contract vocabulary for generated and repaired apps.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fixture-verification/effect-kind-descriptor.ts",
        symbolName: "EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS",
        role: "primary",
        summary:
          "Expected-effect descriptor rows map effect kinds to observation surfaces, public query families, and docs/tests seed posture.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/fixture-verification/verification.ts",
        symbolName: "readFixtureVerificationSnapshot",
        role: "primary",
        summary:
          "Opened-app verification snapshot collector for row-backed expected effects.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/support-state.ts",
        symbolName: "SemanticSupportState",
        role: "supporting",
        summary:
          "Shared support-state ladder keeps capability and verification minimum-state checks from drifting into authoring-local policy.",
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
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:app-query-continuations",
        role: "supporting",
        summary:
          "Fast public continuation contract for catalog-wide query coverage and representative diagnostic/template/router follow-ups.",
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
        command: "pnpm --filter @aurelia-ls/semantic-runtime check:fixture-manifests",
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
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.app-builder-pattern-ontology",
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
      "Keep the public MCP package as a thin, restart-tolerant shell over current semantic-runtime analysis APIs while future generation grows through app-builder.",
    domains: ["mcp", "api", "semantic-runtime", "app-builder", "lsp", "router"],
    roles: ["orient", "analyze", "verify", "document"],
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
      "app overview",
      "aurelia_app_overview",
      "query catalog",
      "aurelia_app_query_catalog",
      "aurelia_app_builder_catalog",
      "aurelia_app_builder_query",
      "app-builder MCP tool",
      "app-builder query MCP",
      "SemanticRuntimeAppBuilderQueryKind",
      "answerAppBuilderQuery",
      "aurelia_app_query",
      "aurelia_app_query_batch",
      "diagnostic overview",
      "typescript diagnostics",
      "template diagnostics",
      "router overview",
      "open seam overview",
      "template cursor info",
      "aurelia_orient_workspace",
      "aurelia_inspect_app_feature",
      "aurelia_build_app_feature",
      "read-only mcp",
      "mcp app building future app-builder",
      "mcp hand-test",
      "mcp restart",
      "mcp token economy",
      "mcp clean code",
      "idiomatic Aurelia code",
      "low boilerplate Aurelia",
      "core observation MCP",
      "core router MCP",
      "plugin patterns MCP",
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
          "MCP tool-shape work should route through the public shell, compact semantic-runtime projections, and explicit paging affordances.",
      },
      {
        query: "mcp exposes ordinary typescript diagnostics with aurelia diagnostics",
        summary:
          "Diagnostics hardening should route through semantic-runtime query families and MCP pass-through, not adapter-local TypeScript checks.",
      },
      {
        query: "aurelia_build_app_feature prompt source edits low boilerplate",
        summary:
          "Current app-building workflow prompts should route new-app generation through app-builder catalog/query tools and existing-app edits through analysis queries.",
      },
      {
        query: "MCP app-builder generation shell should not expose removed recipe tools",
        summary:
          "Public generation work should route to the semantic-runtime app-builder facade before MCP tools; removed recipe tools stay retired.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "MCP receives semantic-runtime answers as pass-through data, and focused contracts verify single and batch app-query continuation pass-through. MCP must avoid adapter-local next-query hints.",
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
          "Semantic-runtime-owned app query vocabulary and paging affordances for generic MCP app query tooling.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder.ts",
        symbolName: "SemanticRuntimeAppBuilderQueryKind",
        role: "grounding",
        summary:
          "Semantic-runtime-owned app-builder query vocabulary for MCP app-builder source-lowering preview tooling.",
      },
      {
        kind: "source",
        filePath: "packages/mcp/src/tool-schemas.ts",
        symbolName: "appBuilderQueryInputSchema",
        role: "grounding",
        summary:
          "MCP schema boundary for app-builder query inputs; keep it aligned with semantic-runtime detail request envelopes.",
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
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/router-overview.ts",
        symbolName: "readSemanticRouterOverview",
        role: "grounding",
        summary:
          "Summary-first router overview; row samples from multiple router families are explicit opt-in.",
      },
      {
        kind: "doc",
        path: "packages/mcp/README.md",
        role: "primary",
        summary:
          "Public package boundary, local invocation commands, and thin-shell constraints.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/mcp contract:continuation-pass-through",
        role: "supporting",
        summary:
          "Contract proving MCP forwards semantic-runtime app-query continuations and app-builder detail requests without adapter-local projection.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "app-builder", "ontology"],
        role: "supporting",
        summary:
          "App generation belongs to app-builder and must stay a semantic-runtime facade before MCP transports expose it.",
      },
    ],
    authority: [
      "MCP is a public API shell; semantic-runtime owns product concepts and query results.",
      "Atlas remains the internal development navigation layer and should not be required for end-user MCP operation.",
      "App generation must be exposed through app-builder's semantic-runtime facade, not transport-local recipe or source-plan policy.",
    ],
    cautions: [
      "Do not reintroduce removed recipe/guidance tools just to make old prompts work.",
      "Do not let MCP adapters classify diagnostics, routes, app-building taste, or source-plan policy locally.",
      "Do not bypass app-builder typed menus, lowering previews, SourcePlan generation, and verification promises when exposing generation through MCP.",
    ],
    nextQuestions: [
      "Is this a shell/transport concern or a semantic-runtime API concern?",
      "Does the MCP tool forward a current semantic-runtime query, or is it trying to resurrect a removed public surface?",
      "Does an app-building prompt need to inspect an existing app, preview future app-builder direction, or defer generation?",
      "Which semantic-runtime query family should prove the answer before MCP formats it?",
    ],
    relatedRouteIds: [
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.source-plan",
      "semantic-runtime.semantic-contract-verification",
      "semantic-runtime.intent-aware-continuations",
      "semantic-runtime.lsp-edit-affordance-substrate",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.intent-aware-continuations",
    aliases: ["intent-aware-continuations", "evidence-gated-continuations"],
    title: "Semantic Runtime Intent-Aware Continuations",
    summary:
      "Route work on AI/IDE next-move intent and evidence-gated continuations without creating a shadow app-query cost policy or app-semantic ontology.",
    domains: [
      "semantic-runtime",
      "inquiry",
      "api",
      "mcp",
      "lsp",
      "continuations",
      "kernel",
      "provenance",
      "typescript",
      "evaluation",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "document", "improve-atlas"],
    terms: [
      "InquiryContinuationIntent",
      "continuation intent",
      "intent-aware continuation",
      "caller intent",
      "operational intent",
      "inquiry intent",
      "AI intent",
      "intent dimension",
      "continuation",
      "continuations",
      "evidence-gated continuation",
      "evidence gated continuations",
      "what next",
      "next query",
      "next move",
      "continuation explosion",
      "semantic-runtime API algebra",
      "inquiry algebra",
      "MCP low token",
      "IDE for AI",
      "orient inspect diagnose repair navigate author verify profile",
      "authoring continuations deferred",
      "Author intent reserved",
      "InquiryContinuationIntent.Author reserved",
      "InquiryContinuationIntent.Verify parked",
      "InquiryContinuationIntent.Profile parked",
      "InquiryContinuationCost.Deep parked",
      "InquiryContinuationKind canonical action vocabulary",
      "InquiryContinuationKind public app-query action",
      "targetQueryKind continuation ownership",
      "targetAppBuilderQueryKind continuation ownership",
      "targetAppBuilderQuery app-builder continuation",
      "SemanticRuntimeContinuationRow enum protocol",
      "continuation enum coupling",
      "type-surface-cooccurrence continuation",
      "source precision",
      "evidence state",
      "coverage",
      "proof obligation",
      "not confidence",
      "confidence heuristic",
      "continuation intents",
      "continuation applicability",
      "typed continuation rows",
      "kernel provenance",
      "source identity",
      "source address",
      "kernel identity",
      "field provenance",
      "defensive fallback",
      "defensive programming",
      "surprising input dimensions",
      "typescript helper reuse",
      "duplicate TypeScript helper",
      "local evaluator",
      "contextual evaluator",
      "ModuleEnvironmentRecord",
      "Aurelia-specific evaluation environment",
      "runtime expression source address",
      "sourceAddressHandleForRuntimeExpressionSpan",
      "PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS",
      "source reference carrier",
      "public address carrier display",
      "authored source address collapse",
      "generated address carrier preservation",
    ],
    queryCanaries: [
      {
        query: "continuations need intent to avoid hundreds of suggestions",
        summary:
          "Continuation explosion should route to continuation intent and evidence gates, not fuzzy ranking or adapter-local filtering.",
      },
      {
        query: "semantic-runtime API algebra intent dimension confidence evidence",
        summary:
          "API-algebra work should distinguish operational intent from app-semantic ontology and expose evidence instead of numeric confidence.",
      },
      {
        query: "MCP should ask what next without fuzzy heuristic routing",
        summary:
          "MCP next-move design should use semantic-runtime intent-aware typed continuations before transport-specific hints.",
      },
      {
        query:
          "continuation provenance fallback local evaluator duplicate TypeScript helper",
        summary:
          "Continuation work should route through existing kernel/source/evaluator/type-system substrates before adding local evidence wrappers or ad hoc helpers.",
      },
      {
        query:
          "identity anchored generated address continuation source precision",
        summary:
          "Generated-address source precision should route through the kernel source-address resolver when the anchor is a semantic identity.",
      },
      {
        query:
          "describeStoredAddress authoredSourceAddressForStoredAddress duplicate switch source address",
        summary:
          "The public source-reference switch preserves generated/template carriers, while the kernel source-address switch collapses those carriers to authored source for lookup; inspect the contracts before deduping.",
      },
      {
        query:
          "InquiryContinuationIntent.Author reserved authoring continuations deferred app-builder",
        summary:
          "The author intent is vocabulary-level/reserved until app-builder owns authoring continuations; enum usage alone should not decide deletion.",
      },
      {
        query:
          "InquiryContinuationIntent.Verify Profile vocabulary-only semantic contract telemetry continuations",
        summary:
          "Verify/profile continuation intents are parked contract/telemetry pressure until concrete public continuation rows spend them.",
      },
      {
        query:
          "InquiryContinuationCost.Deep unspent broad semantic substrate continuation cost",
        summary:
          "Deep continuation cost is parked vocabulary; current app-query costs are derived from runtime boundary and query-type-projection policy.",
      },
      {
        query:
          "InquiryContinuationKind canonical action vocabulary targetQueryKind continuation ownership",
        summary:
          "Lower-level InquiryAnswer continuations and public app-query continuation rows share the canonical action vocabulary; concrete app-query ownership belongs in targetQueryKind and the shaped target query.",
      },
      {
        query:
          "targetAppBuilderQueryKind app-builder continuation ownership continuationIntents",
        summary:
          "Public app-builder answers use targetAppBuilderQueryKind and targetAppBuilderQuery as the app-builder-specific continuation target carrier rather than adapter-local next-step text.",
      },
      {
        query:
          "SemanticRuntimeContinuationRow enum protocol type-surface-cooccurrence",
        summary:
          "Continuation enum audits should inspect the DTO type surface that couples kind, app-query target, intent, cost, and evidence vocabulary.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "This route owns the intent-aware and evidence-gated continuation substrate. Public app-query answers now share a catalog-aware continuation projector with catalog-shaped query identity, source/cursor locus normalization, target-query shaping, response-envelope intent filtering, canonical continuation action kinds, target-owned app-query specificity, evidence metadata, authoring deferral, and a fast semantic contract that verifies family-specific continuation targets across the large existing analysis query families. Public app-builder answers now also carry typed targetAppBuilderQuery continuations for factual catalog/readiness/detail/part-source drilldowns. Kernel-side inquiry continuations now carry shared applicability metadata and have an AST contract guarding that requirement. Source precision also routes through the shared address-or-identity source resolver and source-reference evidence helper, with contracts proving generated addresses anchored to semantic identities resolve to authored source anchors, nested public row DTO source paths are runtime-reachable through the bounded carrier vocabulary, and continuation precision follows source-reference anchors without hiding generated-address evidence.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.QueryClaimGraph,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.inquiry-query-claim-graph",
        summary:
          "Continuation target queries are verified through the ordinary routed app-query path and query-claim graph. The continuation contract checks that live app query-claim profile snapshots bypass retained-answer replay while compact continuation targets still reuse retained semantic payloads when policy allows, and the query-claim graph contract pins the lower-level lazy/reuse/budget/disposal invariants those follows depend on.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/continuation-intent.ts",
        symbolName: "InquiryContinuationIntent",
        role: "primary",
        summary:
          "Next-move intent primitive for filtering typed continuations.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/continuation-intent.ts",
        symbolName: "InquiryContinuationApplicability",
        role: "primary",
        summary:
          "Continuation applicability envelope for intent, cost, evidence gates, and blockers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/answer.ts",
        symbolName: "InquiryContinuation",
        role: "supporting",
        summary:
          "Internal typed continuation can now carry intent-aware and evidence applicability.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/answer.ts",
        symbolName: "InquiryContinuationKind",
        role: "supporting",
        summary:
          "Lower-level inquiry continuation-kind vocabulary that must stay reconciled with public app-query continuation rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/source-address.ts",
        symbolName: "authoredSourceAddressForAnchorHandle",
        role: "primary",
        summary:
          "Shared source resolver for generated/source/template anchors that may point at semantic identities.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/source-address.ts",
        symbolName: "readSourceAnchorRecord",
        role: "supporting",
        summary:
          "Record-index bridge that validates source-anchor handles as address or identity records.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/runtime-expression-source-address.ts",
        symbolName: "sourceAddressHandleForRuntimeExpressionSpan",
        role: "supporting",
        summary:
          "Parser-span-to-kernel-address bridge used by overlays and bound-controller evaluation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/source-reference.ts",
        symbolName: "PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS",
        role: "supporting",
        summary:
          "Bounded source-reference carrier vocabulary for runtime-reachable public row DTO traversal.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/source-reference.ts",
        symbolName: "semanticSourcePrecisionForReferences",
        role: "supporting",
        summary:
          "Shared authored/generated/external source-precision classifier for continuation, diagnostic, hover, and future edit evidence.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-catalog.ts",
        symbolName: "semanticAppQueryCatalogShape",
        role: "primary",
        summary:
          "Shared catalog-shaped query boundary for dispatch, query identity, pre-open policy, materialization policy, source/cursor locus normalization, and continuation targets.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-catalog.ts",
        symbolName: "semanticAppQuerySourceFileLocus",
        role: "supporting",
        summary:
          "Single source-file locus bridge shared by catalog shaping and continuation source/cursor evidence.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-continuations.ts",
        symbolName: "withSemanticAppQueryContinuations",
        role: "primary",
        summary:
          "Catalog-aware public continuation policy for app-query answer envelopes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "withSemanticRuntimeAppBuilderQueryContinuations",
        role: "primary",
        summary:
          "Catalog-aware public continuation policy for app-builder answer envelopes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "canContinueSourceLoweringSurface",
        role: "supporting",
        summary:
          "App-builder authoring continuation guard that keeps source-lowering follow-ups aligned with surface-scoped request-field readiness.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "sourcePlanPreviewContinuationForPreflightRow",
        role: "supporting",
        summary:
          "Direct SourcePlan-preview continuation constructor for ready preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "targetInvocationContinuationForPreflightRow",
        role: "supporting",
        summary:
          "TargetInvocation continuation constructor for ready preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "fragmentCompositionContinuationForPreflightRow",
        role: "supporting",
        summary:
          "FragmentComposition continuation constructor for ready preflight rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-builder-continuations.ts",
        symbolName: "filterSemanticRuntimeAppBuilderQueryContinuations",
        role: "supporting",
        summary:
          "App-builder response-envelope continuation filter keyed by continuationIntents.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/contracts.ts",
        symbolName: "SemanticRuntimeContinuationRow",
        role: "primary",
        summary:
          "Public continuation DTO that carries the canonical action kind beside target query, intent, cost, and evidence gates.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/inquiry/README.md",
        heading: "Design Pressure",
        role: "grounding",
        summary:
          "Inquiry docs distinguish continuation intent from query cost policy and app-semantic ontology.",
      },
      {
        kind: "doc",
        path: ".temp/intent-aware-continuations-scope-map-2026-05-23.md",
        role: "grounding",
        summary:
          "Reviewed scope map explicitly excludes authoring continuations until app-builder replaces the current recipe/fixture gravity.",
      },
      {
        kind: "lens",
        lensId: LensId.AtlasMemory,
        projection: "next",
        filters: {
          domain: "continuations",
        },
        role: "supporting",
        summary:
          "Durable memory records for remaining intent-aware and continuation threading work.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas enum:usage -- --packageId=semantic-runtime --projection=member-usage --query=InquiryContinuation --detail",
        role: "supporting",
        summary:
          "Enum usage audit for continuation intent, cost, and lower-level continuation-kind spend.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas enum:usage -- --packageId=semantic-runtime --projection=enum-couplings --relation=type-surface-cooccurrence --query=SemanticRuntimeContinuationRow --detail",
        role: "supporting",
        summary:
          "Enum coupling audit for public continuation DTO protocols rather than isolated enum-member spend.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:source-reference-carriers",
        role: "supporting",
        summary:
          "AST/runtime reachability and source-precision contract guarding public row DTO carrier paths and authored/generated/external evidence classification.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:app-query-continuations",
        role: "supporting",
        summary:
          "Fast public app-query continuation contract for catalog coverage and representative followability.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:app-builder-query-surface",
        role: "supporting",
        summary:
          "Fast public app-builder query-surface contract for typed app-builder continuation targets and continuationIntents filtering.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:source-anchor-identity",
        role: "supporting",
        summary:
          "Fast contract proving identity-backed generated addresses preserve authored source precision.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:inquiry-continuations",
        role: "supporting",
        summary:
          "Fast AST contract guarding kernel inquiry continuation applicability.",
      },
    ],
    authority: [
      "packages/semantic-runtime/src/inquiry/continuation-intent.ts",
      "packages/semantic-runtime/src/inquiry/README.md",
      "packages/semantic-runtime/src/api/app-query-continuations.ts",
      "packages/semantic-runtime/src/api/app-builder-continuations.ts",
      "packages/semantic-runtime/src/api/app-query-catalog.ts",
      "packages/semantic-runtime/src/api/source-reference.ts",
      "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
      "packages/semantic-runtime/src/kernel/source-address.ts",
      "packages/semantic-runtime/src/kernel/source-open-seam.ts",
      "packages/semantic-runtime/src/template/runtime-expression-source-address.ts",
      "packages/semantic-runtime/src/type-system/checker-type-member-source.ts",
      "packages/semantic-runtime/src/evaluation/evaluator.ts",
      "packages/semantic-runtime/src/evaluation/environment.ts",
      "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
      "packages/atlas/memory/records/inquiry.json",
    ],
    cautions: [
      "Do not let continuation intent become a parallel app-semantic ontology; app facts still belong in kernel claims, products, materializers, and source provenance.",
      "Do not delete or promote continuation intent members from usage counts alone; reconcile usage with reviewed intent docs and parked app-builder/authoring scope.",
      "Do not present verify/profile continuation intents as implemented lanes until contract or telemetry query families actually emit them.",
      "Do not emit deep continuation cost by hand; add it only when a concrete continuation intentionally crosses a broad semantic-substrate boundary beyond app-world/query-type-projection policy.",
      "Do not treat continuation-related enums as isolated islands; check type-surface co-occurrence before deciding whether a value space belongs to a shared protocol.",
      "Do not mint target-specific continuation kind values when targetQueryKind and the shaped target query already own the concrete app-query lane.",
      "Do not use numeric confidence as the primary continuation contract; expose evidence state, coverage, source precision, staleness, and blockers.",
      "Do not mark continuations complete just because a central projector exists; representative query families still need evidence precision, source/provenance reuse, and followability pressure tests.",
      "Do not add MCP-local next-query heuristics when a semantic-runtime intent-aware or continuation primitive should own the policy.",
      "Do not invent local provenance/address/identity wrappers without first checking whether an existing compressed kernel primitive is nearby and only needs to be made accessible.",
      "Treat defensive fallbacks, surprising input axes, duplicated TypeScript helpers, and ad hoc local evaluators as canaries for split-brain from earlier substrate-maturity passes.",
    ],
    nextQuestions: [
      "Is the caller trying to orient, inspect, diagnose, repair, navigate, author, verify, or profile?",
      "Which evidence gate makes this continuation safe or merely informative: source precision, coverage, staleness, or blockers?",
      "Should this next move be a public continuation row, a query catalog hint, a query-claim policy, or a durable semantic product?",
      "Does the requested intent imply a different materialization policy or analysis depth, or only a different continuation presentation?",
      "Which query families still need more precise continuation evidence than the catalog-aware projector can infer?",
      "Which existing kernel/source/type-system/evaluator primitive already owns the provenance or context this continuation wants to expose?",
      "Is a fallback branch evidence of a real external boundary, or is it compensating for information that is already threaded somewhere else?",
    ],
    relatedRouteIds: [
      "semantic-runtime.inquiry-query-claim-graph",
      "semantic-runtime.lsp-edit-affordance-substrate",
      "semantic-runtime.app-builder-pattern-ontology",
      "semantic-runtime.app-builder-pattern-ontology",
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
      "lazy claim lifetime",
      "failed claim retry",
      "failed query claim retention",
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
      "retained answer reuse",
      "retained answer byte budget",
      "retained record budget",
      "analysis cache overview",
      "answerAppQuery",
      "routed app query",
      "query claim telemetry",
      "contract:query-claim-graph",
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
      {
        query: "query claim graph retained answer byte budget lazy claim lifetime",
        summary:
          "Graph-level lifetime and answer-envelope budget regressions should route to the focused query-claim contract before app-query surface debugging.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "Continuation target queries now follow the normal public app-query path and are contract-verified as ordinary runtime/app query claims with profile retention and epoch policy. Future follow-by-id or recommendation-edge storage remains intentionally deferred until continuation ids become a public contract.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.QueryClaimGraph,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "QueryClaimGraph owns answer-boundary retention, value reuse, source/project epoch disposal, query-type projection disposal, nested claim telemetry, and live-profile replay policy. Focused contracts now verify lazy claim lifetime, retained-answer reuse/veto, failed-claim retry and retention, answer-side disposal on retained hits and failures, answer-envelope byte budgets including continuation rows, active-parent record budget safety, and indexed source/project epoch disposal, while app-query continuation contracts verify followability through graph records and live app query-claim profile snapshots.",
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
        filePath: "packages/semantic-runtime/src/api/runtime.ts",
        symbolName: "SemanticApp.answerCatalogQuery",
        role: "supporting",
        summary:
          "Non-router app-query dispatch follows semanticAppQueryCatalogRow(...).group before reaching family-specific answer methods.",
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
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:query-claim-graph",
        role: "primary",
        summary:
          "Focused graph-level contract for lazy claims, retained-answer reuse/veto, failed-claim retry, budgets, and indexed epoch disposal.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:app-query-continuations",
        role: "supporting",
        summary:
          "Verifies continuation targetQuery followability through the normal public app-query path and query-claim graph records.",
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
      "semantic-runtime.intent-aware-continuations",
      "semantic-runtime.app-telemetry",
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
    id: "semantic-runtime.app-telemetry",
    aliases: [
      "semantic-runtime-app-telemetry",
      "frontier:semantic-runtime-app-telemetry",
      "app telemetry profiler",
    ],
    title: "Semantic Runtime App Telemetry",
    summary:
      "Route app-world construction, routed-query payload, continuation-envelope, query-claim, and analysis-depth cost questions through the profiler before changing caches or answer shape.",
    domains: ["semantic-runtime", "telemetry", "performance", "inquiry", "analysis-depth", "kernel"],
    roles: ["orient", "analyze", "verify", "document", "refactor"],
    terms: [
      "app telemetry",
      "app telemetry profiler",
      "profile app telemetry",
      "profile:app-telemetry",
      "SEMANTIC_RUNTIME_TELEMETRY",
      "analysis depth cost",
      "query profile cost",
      "routed query telemetry",
      "query repeat",
      "answer envelope bytes",
      "answerJson",
      "valueJson",
      "continuation bytes",
      "continuation payload",
      "query claim profile",
      "query claim telemetry",
      "retained answer bytes",
      "phase telemetry",
      "phase memory",
      "phase kernel",
      "detail density",
      "compiler host cache",
      "TypeSystem inner phases",
      "app-world-free query",
      "fixture telemetry",
      "external app telemetry",
    ],
    queryCanaries: [
      {
        query: "app telemetry answer envelope continuation bytes",
        summary:
          "Continuation presentation and MCP/token pressure should be measured through full answer-envelope and continuation-byte telemetry before public answer shape changes.",
      },
      {
        query: "analysis depth query repeat query claim retained answer bytes",
        summary:
          "Depth/profile trade-offs should compare query-repeat claim reuse, retained-answer budget, and app-world construction cost in one profiler lane.",
      },
      {
        query: "large app performance app-world-free query telemetry",
        summary:
          "Catalog/source/orientation queries that do not need an app world should stay visible as app-world-free profiler rows instead of being hidden by broader app-open totals.",
      },
    ],
    anchors: [
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/scripts/app-telemetry.mjs",
        role: "primary",
        summary:
          "CLI profiler for app-world construction, routed query answers, phase memory/kernel deltas, grouped aggregates, query repeats, and query-claim retention.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/contracts.ts",
        symbolName: "SemanticRuntimeAnswerProfile",
        role: "primary",
        summary:
          "Answer-envelope profile payload that carries runtime-boundary telemetry without changing answer values.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/app-query-catalog.ts",
        symbolName: "readSemanticAppQueryCatalog",
        role: "grounding",
        summary:
          "Catalog boundary declaring query analysis depth and app-world policy used by routed telemetry runs.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimGraph",
        role: "grounding",
        summary:
          "Answer-boundary store whose retention, disposal, and payload budgets are measured by app telemetry.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/telemetry/phase.ts",
        symbolName: "measureSemanticRuntimePhase",
        role: "supporting",
        summary:
          "Phase profiler for construction and query-time costs with optional marker-based kernel/detail deltas.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/telemetry/detail-density.ts",
        symbolName: "readSemanticRuntimeDetailDensityRows",
        role: "supporting",
        summary:
          "Shallow product-detail and hot-detail representation x-ray used alongside app telemetry before memory refactors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/store.ts",
        symbolName: "KernelStore.readTelemetrySnapshot",
        role: "supporting",
        summary:
          "Kernel snapshot entry point for record/product/detail/hot-detail counts and optional density rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry",
        role: "primary",
        summary:
          "Run the profiler before changing app-world construction, routed-query payload, claim retention, or detail representation.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "telemetry", "performance", "inquiry", "analysis-depth"],
        role: "grounding",
        summary:
          "Durable memory records app-telemetry interpretation rules, CLI narrowing, answer-envelope bytes, and query-claim retention guidance.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/README.md",
        role: "grounding",
        summary:
          "Package-level app telemetry commands and environment variable documentation.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/telemetry/README.md",
        role: "grounding",
        summary:
          "Telemetry lane design notes for detail-density and phase interpretation.",
      },
    ],
    authority: [
      "Measured app telemetry before speculative cache, compression, or analysis-depth refactors.",
      "App-query catalog depth/materialization policy and inquiry profiles for consumer-shaped cost expectations.",
      "QueryClaimGraph retention/disposal policy for answer-local work and public payload budgets.",
    ],
    cautions: [
      "Do not interpret value payload bytes alone; continuations and answer-profile metadata are part of the public envelope cost.",
      "Do not compare whole-session repeats with query repeats as if they answer the same question.",
      "Do not add caches because one global total is high; group by root, depth, profile, phase, and query first.",
    ],
    nextQuestions: [
      "Is the pressure from app-world construction, routed query projection, answer-envelope payload, or query-claim retention?",
      "Which analysis depth, inquiry profile, and query repeat pattern reproduces the cost?",
      "Can the app-query catalog answer without opening an app world, or does this query truly need a fuller product set?",
      "Does the profiler point at a representation issue, a cache lifetime issue, or an inquiry-algebra/materialization-policy issue?",
    ],
    relatedRouteIds: [
      "semantic-runtime.inquiry-query-claim-graph",
      "semantic-runtime.kernel-memory.representation",
      "semantic-runtime.intent-aware-continuations",
      "semantic-runtime.type-system-project-epoch",
      "semantic-runtime.template-overlay-integration",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.binding-source-value-evaluation",
    aliases: [
      "runtime-binding-source-value-evaluator",
      "frontier:runtime-binding-source-value-evaluator",
      "binding-source-value-evaluator",
      "source-value-evaluation-context",
    ],
    title: "Binding Source Value Evaluation",
    summary:
      "Evaluate deterministic Aurelia binding-source values through modeled Scope, static evaluator reuse, active DI visibility, and bound-controller handoff.",
    domains: ["semantic-runtime", "observation", "binding", "evaluation", "type-system", "template"],
    roles: ["orient", "analyze", "refactor", "verify"],
    terms: [
      "RuntimeBindingSourceValueEvaluator",
      "RuntimeBindingSourceValueEvaluationContext",
      "RuntimeBindingSourceEvaluationFrame",
      "RuntimeBindingSourceMemberValueReader",
      "RuntimeBindingSourceArrayMethodEvaluator",
      "RuntimeBindingSourceValueEvaluation",
      "binding-source value",
      "source-value evaluation context",
      "source-value intrinsic boundary",
      "deterministic source-value closure",
      "binding-source array method deterministic closure",
      "active DI container binding-source value",
      "bound controller source-value",
      "value-converter source-value",
      "StaticEvaluator source-value reuse",
      "readStaticValueProperty",
      "readStaticValueElement",
      "StaticValueMemberRead",
      "foldStaticValueMemberRead",
      "source-independent static member read",
      "RuntimeBindingSourceExpressionContextProjector",
      "source expression lifecycle",
      "projectRuntimeBindingSourceValueContextInScope",
      "sourceValueContextForRuntimeBindingSourceExpressionProjection",
      "knownScope source-value",
      "binding-source-needs-runtime-value",
      "standard library authority boundary",
    ],
    queryCanaries: [
      {
        query: "runtime binding source value evaluator",
        summary:
          "Direct source-value evaluator queries should have a stable route id instead of only reaching binding-flow by overlap.",
      },
      {
        query:
          "RuntimeBindingSourceValueEvaluationContext source-value evaluation context active DI container bound controller recursion",
        summary:
          "Static binding-source value closure should enter through the binding-owned request context, not mutable evaluator state or feature-local reducers.",
      },
      {
        query:
          "source-value intrinsic boundary deterministic closure TypeScript stdlib checker-backed",
        summary:
          "Source-value work should close only deterministic values a product consumer spends; checker-backed standard-library type surfaces stay with TypeScript.",
      },
      {
        query: "binding-source array method deterministic closure",
        summary:
          "Array source-value behavior should route to the binding-owned array method reducer and shared array operation primitives.",
      },
      {
        query:
          "StaticValueMemberRead fold source-independent member read binding-source value static evaluator",
        summary:
          "Source-independent binding-source member reads and StaticEvaluator property access should share the lower static member-read outcome fold.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.SourceValueEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "RuntimeBindingSourceValueEvaluationContext is the owner request shape for source-value reduction over expression AST, modeled BindingScope, active DI container, resource scope, binding-behavior lifecycle, and bound-controller recursion guards. Rendered bindings enter through source-expression projections; exact non-rendered scopes enter through knownScope(...).",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.ExpressionEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        ownerRouteId: "semantic-runtime.type-system.expression-semantics",
        summary:
          "Source-value evaluation is intentionally distinct from CheckerExpressionTypeEvaluationContext: it asks for deterministic runtime values, not TypeChecker type/reference projection. It should still consume the same rendered binding source-expression lifecycle facts before reducing values.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        ownerRouteId: "semantic-runtime.observation.binding-flow",
        summary:
          "Binding data-flow, router, composition, overlays, and template-controller static values consume source-value reduction. Coverage stays partial as a guardrail against feature-local reducers or source-expression lifecycle shortcuts.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
        symbolName: "RuntimeBindingSourceValueEvaluator",
        role: "primary",
        summary:
          "Observation-side evaluator for deterministic binding-source value reduction over modeled Aurelia scopes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-value-evaluation-context.ts",
        symbolName: "RuntimeBindingSourceValueEvaluationContext",
        role: "primary",
        summary:
          "Source-value request context carrying scope, resource scope, active container, lifecycle, and recursion guard facts.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-evaluation-frame.ts",
        symbolName: "RuntimeBindingSourceEvaluationFrame",
        role: "supporting",
        summary:
          "Per-read static evaluator frame that preserves module/evaluator state and active DI visibility.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-member-value.ts",
        symbolName: "RuntimeBindingSourceMemberValueReader",
        role: "supporting",
        summary:
          "Binding-source property/keyed read boundary above shared static property-access helpers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-array-method-value.ts",
        symbolName: "RuntimeBindingSourceArrayMethodEvaluator",
        role: "supporting",
        summary:
          "Binding-source native Array method reducer for closed source-value arrays and callback scopes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/evaluation/property-access.ts",
        symbolName: "foldStaticValueMemberRead",
        role: "supporting",
        summary:
          "Shared static member-read outcome fold consumed by StaticEvaluator and binding-source source-value reduction.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-binding-source-expression-context.ts",
        symbolName: "RuntimeBindingSourceExpressionContextProjector",
        role: "supporting",
        summary:
          "Rendered-binding source-expression lifecycle projector used before source-value contexts are created.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:binding-source-arrow-callbacks",
        role: "pressure",
        summary:
          "Canary for binding-source array callbacks, source-value receiver binding, and method-call reduction.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:binding-source-value-converters",
        role: "pressure",
        summary:
          "Canary for value-converter source-value reduction and context-sensitive open behavior.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:expression-context-usage",
        role: "supporting",
        summary:
          "Guards context entry points for TypeChecker and source-value expression consumers.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas expression:coverage -- --projection=collection-methods --detail",
        role: "pressure",
        summary:
          "Coverage lane comparing source-value Array methods with TypeChecker, observation, and static host-boundary lanes.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "binding", "type-system"],
        role: "grounding",
        summary:
          "Durable memory carries source-value evaluator boundaries, standard-library authority policy, and consumer guardrails.",
      },
    ],
    authority: [
      "Aurelia expression evaluation and Scope lookup semantics for binding-source reads.",
      "Shared StaticEvaluator and property-access primitives for deterministic JavaScript value closure.",
      "Binding-flow and runtime binding source-expression projection for rendered binding lifecycle facts.",
      "TypeScript owns checker-backed standard-library declarations, overloads, generics, and inference.",
    ],
    cautions: [
      "Do not grow RuntimeBindingSourceValueEvaluator into a parallel TypeScript standard library.",
      "Do not add router-, composition-, overlay-, or diagnostic-local source-value reducers when a binding-source context can carry the fact.",
      "Do not merge this context into CheckerExpressionTypeEvaluationContext unless a broader expression-site primitive is deliberately designed.",
      "Mutating receiver methods should stay open for rendered binding source-value closure unless a product consumer proves a safe mutation-state model.",
    ],
    nextQuestions: [
      "Is the requested fact a deterministic runtime value, a TypeChecker type/reference, or an Aurelia observation/controller consequence?",
      "Does the caller already have a rendered binding source projection, an exact modeled Scope, or neither?",
      "Can a shared evaluator/property/array primitive answer the value, or should this remain an explicit open source-value row?",
      "Which downstream consumer actually spends the closed value: router, composition, template-controller scope, data-flow, overlay, diagnostics, or authoring?",
    ],
    relatedRouteIds: [
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.template-overlay-integration",
      "semantic-runtime.template-recursive-rendering",
      "router.viewport.authoring-semantics",
    ],
  },
  {
    id: "semantic-runtime.observation.binding-flow",
    aliases: [
      "semantic-runtime.select-checked-value-channels",
      "select-and-checked-value-channel-drafts",
      "frontier:select-and-checked-value-channel-drafts",
      "bound-controller-value-flow",
      "frontier:bound-controller-value-flow",
      "binding-data-flow-materializer",
      "frontier:binding-data-flow-materializer",
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
      "source assignment",
      "source write capability",
      "observer write capability",
      "fromView binding",
      "from-view binding",
      "twoWay binding",
      "two-way binding",
      ".from-view",
      ".two-way",
      "binding source assignment",
      "binding source assignment runtime expression unassignable",
      "target source type mismatch",
      "target-to-source type mismatch",
      "target-to-source-type-mismatch",
      "binding data flow value channel",
      "binding source value evaluator",
      "RuntimeBindingSourceValueEvaluator",
      "RuntimeBindingSourceValueEvaluationContext",
      "source-value evaluation context",
      "binding-source value request context",
      "source-value intrinsic boundary",
      "deterministic source-value closure",
      "binding-source array method deterministic closure",
      "binding-source relational operator value closure",
      "RuntimeBindingSourceExpressionContextProjector",
      "binding source expression context",
      "rendered binding source expression context",
      "source expression lifecycle",
      "source-expression lifecycle projection",
      "source expression lifecycle bound controller",
      "source expression lifecycle helper",
      "source expression lifecycle projection helper",
      "bindingContextSlotDraftForExpressionAccess",
      "source expression slot projector",
      "AccessScope AccessMember source slot",
      "value-channel source type strict mode",
      "checker collection types",
      "checker literal domains",
      "collection map element key value projection",
      "active DI container binding-source value",
      "RuntimeBindingSourceEvaluationFrame",
      "CheckerExpressionTypeEvaluationContext",
      "binding-flow expression evaluation context",
      "binding-source-needs-runtime-value",
      "binding source needs runtime value",
      "select value channel",
      "select checked value channel contract",
      "select single option source-to-target",
      "radio source-to-target",
      "option model domain",
      "keyed form source",
      "keyed form binding",
      "array index form binding",
      "record keyed checked binding",
      "string-index member write",
      "sourceAssignmentTargetSource owner route",
      "directional assignability",
      "AUR0654",
      "binding behavior materializer",
      "runtime binding behavior",
      "validate binding behavior",
      "listener binding",
      "event listener binding",
      "ListenerBinding",
      "submit.trigger",
      "form submit listener",
      "actionless form submit",
      "allowActionlessForm",
      "preventDefault",
      "native submit workflow",
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
      "state initial source value",
      "state initial source value bound controller",
      "state initial-state source-value",
      "state initial-state source-value bound controller",
      "StateBinding scope slot initial state value",
      "framework service customization",
      "source assignment reason fixtures",
      "mixed-form-surfaces",
      "select-single-array-value",
      "runtime expression unassignable",
      "runtime-expression-unassignable",
      "runtime-ast-errors",
      "readTemplateExpressionParse",
      "bindingExpressionAstForProduct",
      "expression parse product",
      "binding data flow diagnostics policy",
      "bindingDataFlowDiagnostics",
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
      "bound-controller-value-flow",
      "bound controller resource order",
      "parent before rendered child",
      "parent-before-rendered-child",
      "rendered child SCC",
      "runtime analysis schedule",
      "recursive resource analysis group",
      "predecessor bound controller facts",
      "HydrateElementInstruction definitionProductHandle",
      "compiled resource runtime analysis order",
      "template-overlay-bound-controller",
      "parent-bound callback bindable",
      "child root alias parent-bound callback",
      "false TS2554 child bindable callback",
      "bound controller Array.find",
      "Array.find receiver did not reduce to a known array",
      "bound controller state initial value",
      "property method this binding",
      "ObserverLocator function key ComputedObserver",
      "function-key computed observer",
    ],
    queryCanaries: [
      {
        query:
          "event binding trigger submit preventDefault actionless form allowActionlessForm",
        summary:
          "Native form-submit and event-listener semantics should route through binding flow plus framework app-root configuration before judging generated form source.",
      },
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
        query: "state initial source value bound controller",
        summary:
          "State-backed parent-bound child values should route through binding-flow source-value evaluation as well as state store configuration.",
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
        query: "bound controller resource order parent before rendered child HydrateElementInstruction SCC",
        summary:
          "Child-template overlay root typing should route through compiled-template rendered-child SCC scheduling before resourceScope-order assumptions.",
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
        query: "string-index member write sourceAssignmentTargetSource owner route",
        summary:
          "String-index member writeback should use TypeChecker write-policy facts but preserve the evaluated owner expression as the repair-planning source route.",
      },
      {
        query: "runtime-expression-unassignable runtime-ast-errors binding source assignment",
        summary:
          "Runtime astAssign source-assignment pressure should route to binding data-flow before API diagnostic wording.",
      },
      {
        query: "expression parse product binding data-flow diagnostics policy",
        summary:
          "Expression-parse product readers and binding-flow diagnostic assembly should route to shared template/data-flow substrates before cursor or API-local helpers are added.",
      },
      {
        query: "bindingExpressionAstForProduct router composition binding source value evaluator",
        summary:
          "Product-handle to runtime-accepted binding AST questions should route to the template expression product primitive before feature-local observation/router helpers are added.",
      },
      {
        query:
          "RuntimeBindingSourceExpressionContextProjector value-channel source type strict mode binding-behavior source scope",
        summary:
          "Binding source TypeChecker and source-value reads should route through the shared rendered-binding source-expression context projector.",
      },
      {
        query: "source expression lifecycle bound controller",
        summary:
          "Bound-controller child root slots and rendered binding reads should route through the same source-expression lifecycle projection helper.",
      },
      {
        query: "bindingContextSlotDraftForExpressionAccess bound controller source slot AccessMember",
        summary:
          "Slot-shaped parent-bound source expressions should route through the shared BindingScope source-expression slot projector, not feature-local walkers.",
      },
      {
        query: "ValidationController bridge role evidence validate property info",
        summary:
          "Validation controller property-info and validate binding-behavior questions should route through binding-flow and validation-html framework grounding before bridge evidence is closed.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "Binding-flow owns the shared source/target/value-channel substrate: PropertyBinding, ObserverLocator, RuntimeBindingExpressionScopeProjector, RuntimeBindingSourceValueEvaluator, RuntimeBoundControllerValueTable, value-channel drafts, source writeability, value-converter writeback, assignability, data-flow summaries, and diagnostics policy are wired and covered by focused contracts. Runtime-assignment writeback now also proves converter fromView source-local typing through synthetic-writeback-converter-local. Current overlay/diagnostic consumers spend data-flow rows and materialized scope slots rather than duplicating assignment policy; the partial state is a standing anti-regression guardrail for future consumers that might reintroduce local source/write/checker/value-channel policy.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.ExpressionEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system.expression-semantics",
        summary:
          "Binding-flow spends RuntimeBindingSourceExpressionContextProjector before constructing CheckerExpressionTypeEvaluationContext for rendered binding source reads. Value-channel source typing, data-flow source typing, binding-owned observed dependencies, router resource values, runtime composition, repeat static locals, let static values, and child bindable source-slot projection now share recursive instruction-scope lookup, binding-behavior source-scope projection, rendering-controller strict mode, and the lower source-expression lifecycle helper before entering TypeChecker or source-value evaluation contexts. Focused binding-flow, overlay, i18n lifecycle, select/checked, and checker-access contracts verify this boundary.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.SourceValueEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.binding-source-value-evaluation",
        summary:
          "RuntimeBindingSourceValueEvaluationContext is the source-value request envelope for expression AST, modeled BindingScope, active DI container override, resource scope, binding-behavior lifecycle, and bound-controller recursion guards. Its constructor is intentionally private: rendered bindings enter through source-expression projections, while non-rendered exact-scope reads enter through knownScope(...). Router, composition, repeat-static-value, and template-controller let-value consumers now call RuntimeBindingSourceValueEvaluator through this context, with binding/router/composition/recursive-rendering/overlay contracts passing after the refactor.",
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
          "packages/semantic-runtime/src/observation/binding-data-flow-materializer.ts",
        symbolName: "RuntimeBindingDataFlowMaterializer",
        role: "primary",
        summary:
          "Product owner for TypeChecker-backed source/target/value-channel data-flow rows and assignment facts.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-data-flow-materializer.ts",
        symbolName: "BindingDataFlowSourceProjector",
        role: "primary",
        summary:
          "Source projection boundary for binding expression typing, writeability, assignment target sources, and source open reasons.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-data-flow-source-info.ts",
        symbolName: "BindingDataFlowSourceInfoProjector",
        role: "primary",
        summary:
          "Binding source-info boundary that separates source descriptors, assignment-target source classification, and value-converter writeback hints from rendered source-scope selection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-data-flow-source-info.ts",
        symbolName: "bindingDataFlowSourceKindForRuntimeAssignmentTarget",
        role: "supporting",
        summary:
          "Runtime assignment target source-kind classifier for data-flow rows, diagnostics, and future edit/repair loci.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-data-flow-source-info.ts",
        symbolName: "sourceWriteCapabilityForRuntimeAssignmentTarget",
        role: "supporting",
        summary:
          "Assignment-target writeability bridge that spends source-expression projection, TypeChecker context, and Aurelia astAssign policy.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/api/binding-projections.ts",
        symbolName: "readBindingDataFlowSummary",
        role: "supporting",
        summary:
          "Public compact binding data-flow summary answer for MCP/LSP source-target and issue rollups.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/api/binding-projections.ts",
        symbolName: "bindingDataFlowSummaryGroups",
        role: "supporting",
        summary:
          "Binding data-flow summary grouping phase before accumulator projection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/api/binding-projections.ts",
        symbolName: "addBindingDataFlowSummaryRow",
        role: "supporting",
        summary:
          "Binding data-flow summary accumulator phase for source, type, assignment, and open-data-flow rollups.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/checker-collection-types.ts",
        role: "supporting",
        summary:
          "Shared checker literal-domain and collection/map shape helpers consumed by value-channel and data-flow materializers.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/api/template-diagnostic-policy.ts",
        symbolName: "bindingDataFlowDiagnostics",
        role: "primary",
        summary:
          "Shared public diagnostic assembly for binding data-flow assignment, runtime expression, framework-error, and open-source rows.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/expression-parse-product.ts",
        symbolName: "readTemplateExpressionParse",
        role: "supporting",
        summary:
          "Shared product-detail reader for materialized template expression parses consumed by binding, router, overlay, i18n, and diagnostics paths.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/expression-parse-product.ts",
        symbolName: "bindingExpressionAstForProduct",
        role: "supporting",
        summary:
          "Shared product-handle to runtime-accepted binding AST reader used by observation, router, and composition without re-owning expression parse projection.",
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
          "packages/semantic-runtime/src/observation/runtime-binding-source-expression-context.ts",
        symbolName: "RuntimeBindingSourceExpressionContextProjector",
        role: "primary",
        summary:
          "Binding-owned rendered source-expression context handoff shared by TypeChecker, source-value, and observed-dependency consumers.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/runtime-binding-source-expression-context.ts",
        symbolName: "projectRuntimeBindingSourceExpressionInScope",
        role: "supporting",
        summary:
          "Known-source-scope handoff for consumers that already proved the runtime BindingScope.",
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
          "Parent-to-child bound controller value table carries source values plus parent strict/runtime context across resource boundaries.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-binding.ts",
        symbolName: "templateControllerRuntimeValueBinding",
        role: "supporting",
        summary:
          "Shared lookup for the runtime expression binding that supplies a template-controller value in one render context.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-source-value-evaluation-context.ts",
        symbolName: "RuntimeBindingSourceValueEvaluationContext",
        role: "primary",
        summary:
          "Binding-owned request context for static source-value reduction, Scope lookup, active container/resource resolution, binding-behavior lifecycle, and recursive bound-controller reads.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/observation/binding-source-value-evaluation-context.ts",
        symbolName: "RuntimeBindingSourceValueEvaluationContext.knownScope",
        role: "supporting",
        summary:
          "Named exact-scope fallback owned by shared source-value context projectors or consumers deliberately outside rendered runtime binding projection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-compilation-project-pass.ts",
        symbolName: "TemplateCompilationProjectPass",
        role: "supporting",
        summary:
          "Runtime analysis order uses compiled custom-element child instructions and declared dependencies so parent-bound values are available before child overlays.",
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
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:class-style-value-channels",
        role: "supporting",
        summary:
          "Focused contract for class/style interpolation value channels, data-flow rows, and observed template reads.",
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
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:keyed-form-source-bindings",
        role: "pressure",
        summary:
          "Focused contract for keyed and string-index form source writeback, owner source routes, and value-converter fromView flow.",
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
      "semantic-runtime.template-overlay-integration",
      "semantic-runtime.proxy-observation-domain-modeling",
      "semantic-runtime.app-builder-pattern-ontology",
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
      "observed dependency publication",
      "observed dependency source route",
      "expression AST traversal",
      "expression AST child traversal",
      "parse-result-inspection",
      "visitExpressionAstNodes",
      "member-owner projection",
      "BindingBehavior member owner",
      "ValueConverter member owner",
      "observed dependency semantic identity",
      "runtime observed dependency publication",
      "runtime-observed-dependency-publication",
      "runtimeObservedDependencyRecords",
      "runtimeObservedDependencyPublicationFrame",
      "runtimeObservedDependencyKernelRecords",
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
        query: "runtime observed dependency publication frame kernel records",
        summary:
          "Runtime observed-dependency publication should route to the shared product/source/claim frame and kernel-record assembly before copying record construction into binding or watcher materializers.",
      },
      {
        query: "expression AST traversal BindingBehavior ValueConverter observed dependency",
        summary:
          "Expression traversal bugs should route through the parser-owned AST inspection helper before feature-local walkers are widened.",
      },
      {
        query: "one-hop forwarding accessor direct state template binding",
        summary:
          "One-hop state/domain accessors are authoring taste pressure over topology and observation facts, not generic getter or code-style cleanup.",
      },
      {
        query: "larger app building recipe code economy direct state domain",
        summary:
          "Clean-code app-building questions should route to current app-builder generated-fixture pressure and proxy-observation grounding, not only the MCP adapter.",
      },
      {
        query: "component object boundary nullable object bindable direct Product template reads",
        summary:
          "Local object-shaped component input pressure should route to component-interface type surfaces plus binding data-flow, not ID-only generated-source policy.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        ownerRouteId: "semantic-runtime.observation.binding-flow",
        summary:
          "Proxy observation and clean domain-modeling pressure depends on binding data-flow, value-channel, and observed-dependency products for ordinary template reads, object-shaped component inputs, collection reads, watcher/computed dependency rows, and proxy escape diagnostics. Coverage is partial because authoring/taste guidance should not turn those observations into generated-source policy or revive legacy fixture-like recipe paths.",
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
        filePath: "packages/semantic-runtime/src/observation/runtime-observed-dependency-publication.ts",
        symbolName: "runtimeObservedDependencyRecords",
        role: "primary",
        summary:
          "Shared runtime observed-dependency product/source/claim envelope for binding-owned and watcher-owned dependency rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-observed-dependency-publication.ts",
        symbolName: "runtimeObservedDependencyPublicationFrame",
        role: "primary",
        summary:
          "Runtime observed-dependency publication frame for exact source-address expansion and owner-specific usage claims before records are assembled.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-observed-dependency-publication.ts",
        symbolName: "runtimeObservedDependencyKernelRecords",
        role: "supporting",
        summary:
          "Runtime observed-dependency kernel record assembly boundary after the publication frame has selected source address and claims.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/source-observation-product-publication.ts",
        symbolName: "sourceObservationProductPublicationFrame",
        role: "supporting",
        summary:
          "Source-backed observation product frame for exact source span, evidence/provenance handles, and product identity before computed/effect products publish records.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/source-observed-dependency-publication.ts",
        symbolName: "sourceObservedDependencyPublicationFrame",
        role: "supporting",
        summary:
          "Source-observer-owned dependency publication frame for exact spans, fallback owner address, semantic claim, and observed-dependency identity before records are assembled.",
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
        filePath: "packages/semantic-runtime/src/observation/observed-dependency-member-source.ts",
        symbolName: "observedMemberSourceForBindingDependency",
        role: "primary",
        summary:
          "BindingScope-aware observed-dependency member/source projector shared by binding data-flow publication.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/expression/parse-result-inspection.ts",
        symbolName: "visitExpressionAstNodes",
        role: "supporting",
        summary:
          "Parser-owned expression AST traversal boundary; feature walkers should reuse or compare against this before inventing local child coverage.",
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
          "Public runtime-watcher-observed-dependencies query projection for API and app-builder consumers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/controller-projections.ts",
        symbolName: "readRuntimeWatcherRows",
        role: "primary",
        summary:
          "Public runtime-watchers query projection for API and app-builder consumers.",
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
        filePath: "packages/semantic-runtime/src/api/app-topology.ts",
        symbolName: "directInjectionServiceInteractionBindingRowsForDataFlow",
        role: "supporting",
        summary:
          "App topology reports direct state/domain template access through analysis rows, not retired authoring orientation rows.",
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
        domains: ["semantic-runtime", "observation", "app-builder", "state", "framework-grounding"],
        role: "grounding",
        summary:
          "ProxyObservable domain-modeling memory records the integrated astEvaluate/ProxyObservable observation circuit.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "application", "app-builder", "observation", "fixtures", "topology"],
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "content projection",
      "custom element child projection",
      "HydrateElement projection",
      "HydrateElementProjectionInstructionSequence",
      "compiler open content projection",
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
      {
        query: "custom element child content projection HydrateElement projection sequence",
        summary:
          "Custom-element child projection should route to compiled-template DOM transform modeling, not app-builder generation or runtime renderer shortcuts.",
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
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/instruction-ir.ts",
        symbolName: "HydrateElementProjectionInstructionSequence",
        role: "supporting",
        summary:
          "Slot-name plus instruction-sequence handle carried by HydrateElementInstruction projections.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:template-content-projection",
        role: "supporting",
        summary:
          "Focused contract for custom-element child content lowering into projection instruction sequences.",
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
      "Ordinary custom-element child projection is a compiled-template transform; do not reopen compiler.open-content-projection for cases the framework `_extractProjections(...)` closes.",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "recursive custom element",
      "self recursive custom element",
      "recursive boundary",
      "recursive hydration boundary",
      "template controller",
      "template controller cardinality",
      "controller semantics",
      "hydration",
      "compiled template",
      "synthetic view",
      "synthetic view scope",
      "getter provenance",
      "observed dependency provenance",
      "repeat for",
      "repeat value carrier",
      "repeat static value",
      "runtime scope value carrier",
      "BindingContext local item",
      "TemplateControllerScopeMaterializer",
      "IteratorScopeMaterializationFrame",
      "iteratorScopeMaterializationFrame",
      "publishIteratorScopeIssues",
      "iteratorLocalSlots",
      "LetStaticValueEvaluationFrame",
      "letStaticValueEvaluationFrame",
      "evaluateLetStaticValue",
      "let static value",
      "let binding source value",
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
      "ComposedChildControllerMaterializationFrame",
      "createComposedChildControllerFrame",
      "materializeComposedChildControllerFrame",
      "materializeComposedChildContainer",
      "createComposedRuntimeController",
      "recordComposedChildControllerProducts",
      "composition controller hydration",
      "composed controller hydration",
      "dynamic component composition",
      "composed dashboard",
      "activate model handoff",
      "activation model handoff",
      "overloaded activate model",
      "activate model overload",
      "ActivateMethodProjection",
      "activateMethodProjection",
      "ActivationParameterProjectionFrame",
      "activationParameterProjectionFrame",
      "activationParameterProjectionIssue",
      "activationModelHandoffForParameterProjection",
      "checker signature candidate basis",
      "renderingContextKind",
      "definition-resource",
      "recursive-resource-instance",
      "runtime-state-specific recursive expansion",
      "per-activation rendering",
      "exact rendered tree",
      "SSR SSG exact view tree",
      "router activation lifecycle",
      "viewport deactivate ordering",
      "dynamic composition lifecycle",
      "stateful recursive component diagnostics",
      "two-way feedback rendering",
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
        query: "recursive custom element synthetic view getter provenance",
        summary:
          "Self-recursive component, synthetic-view scope, and getter observed-dependency provenance pressure should land on recursive rendering.",
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
        query: "let static value source-value evaluation frame",
        summary:
          "Let binding static-value projection should route through template-controller scope materialization and the shared binding-source value evaluator.",
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
        query: "ComposedChildControllerMaterializationFrame composed child controller runtime composition child container",
        summary:
          "Closed AuCompose child-controller handoff should route through the composed child materialization frame, child container, controller publication, and finite aggregate rendering boundary.",
      },
      {
        query: "AuCompose overloaded activate model checker signature candidate basis",
        summary:
          "Overloaded activate(model) handoff should route to runtime composition plus shared TypeChecker signature parameter projection, not a first-signature local shortcut.",
      },
      {
        query: "ActivateMethodProjection ActivationParameterProjectionFrame activate model handoff",
        summary:
          "AuCompose lifecycle handoff should route through the method projection and overload-parameter frame before comparing model assignability.",
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
      {
        query: "SSR SSG exact view tree per activation recursive rendering",
        summary:
          "Exact route/data render output requires runtime-state-specific recursive expansion rather than the finite overlay topology boundary.",
      },
      {
        query: "router viewport activation reuse deactivate ordering recursive rendering",
        summary:
          "Router/viewport lifecycle ordering requires per-activation controller-state modeling before recursive expansion can answer it.",
      },
      {
        query: "dynamic composition lifecycle run deactivate exact child rendering",
        summary:
          "Dynamic composition lifecycle consequences require runtime-state-specific expansion; candidate rows and aggregate child controllers are not enough.",
      },
      {
        query: "stateful recursive component diagnostics runtime data depth",
        summary:
          "Recursive data structures that need concrete depth/cardinality should reopen runtime-state-specific expansion instead of stretching definition topology.",
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
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "IteratorScopeMaterializationFrame",
        role: "supporting",
        summary:
          "Repeat/iterator scope frame for source-value evaluator, source-expression scope projector, iterator projection, local type map, and static local value handoff.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "iteratorScopeMaterializationFrame",
        role: "supporting",
        summary:
          "Repeat/iterator scope setup phase before local issues, local slots, override slots, and BindingScope publication.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "iteratorLocalSlots",
        role: "supporting",
        summary:
          "Repeat local-slot construction that attaches TypeChecker-projected local types plus representative static values.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "LetStaticValueEvaluationFrame",
        role: "supporting",
        summary:
          "Let binding static-value frame for parse recovery, runtime binding lookup, source-expression context projection, and evaluator handoff.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "letStaticValueEvaluationFrame",
        role: "supporting",
        summary:
          "Let binding source-value setup phase before evaluating or publishing a binding-scope boundary value.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/template-controller-scope-materializer.ts",
        symbolName: "evaluateLetStaticValue",
        role: "supporting",
        summary:
          "Let binding source-value consumer that spends the projected context through RuntimeBindingSourceValueEvaluator.",
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
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-materializer.ts",
        symbolName: "ComposedChildControllerMaterializationFrame",
        role: "supporting",
        summary:
          "Closed AuCompose custom-element child handoff frame for parent container admission, resolved definition, child-container emission, controller creation, and publication side effects.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-materializer.ts",
        symbolName: "createComposedChildControllerFrame",
        role: "supporting",
        summary:
          "Admission boundary for a closed static/value AuCompose candidate before materializing the aggregate child controller.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-materializer.ts",
        symbolName: "materializeComposedChildControllerFrame",
        role: "supporting",
        summary:
          "Finite aggregate materialization phase for composed child container, runtime controller, lifecycle step, relation claim, and controller publication.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-materializer.ts",
        symbolName: "compositionControllerSemanticClaims",
        role: "supporting",
        summary:
          "Runtime composition relation-claim boundary linking host controller, composition context, and resolved component definitions.",
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
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-activation.ts",
        symbolName: "activationModelHandoffForType",
        role: "supporting",
        summary:
          "Checker-backed AuCompose activate(model) lifecycle handoff that reuses shared signature parameter projection and assignability.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-activation.ts",
        symbolName: "activateMethodProjection",
        role: "supporting",
        summary:
          "AuCompose activate member discovery and callable signature admission before activation parameter projection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-activation.ts",
        symbolName: "activationParameterProjectionFrame",
        role: "supporting",
        summary:
          "Shared overload candidate and parameter-reference frame for AuCompose activate(model) lifecycle handoff.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/template/runtime-composition-activation.ts",
        symbolName: "activationModelHandoffForParameterProjection",
        role: "supporting",
        summary:
          "Final AuCompose activation handoff fold that compares projected model and activate parameter types.",
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
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:recursive-rendering",
        role: "supporting",
        summary:
          "Focused contract for recursive custom-element finite boundaries, synthetic-view scope, bindable flow, and getter provenance.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/recursive-custom-element-surfaces",
        role: "pressure",
        summary:
          "Stress fixture for self-recursive custom elements, aggregate synthetic views, and controller-level recursive hydration boundaries.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-pattern-composed-dashboard",
        role: "pressure",
        summary:
          "Generated authoring fixture for recommendable dynamic component composition.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/src/app-builder/",
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
      "Do not require runtime-state-specific recursive expansion for template overlays, ordinary TypeChecker diagnostics, or definition-level topology; reopen it only for per-activation SSR/SSG output, router/viewport lifecycle ordering, dynamic composition lifecycle consequences, stateful recursive data, or feedback loops that alter subsequent rendering.",
      "Do not treat AuCompose candidate resolution as proof of recursive composed child hydration or lifecycle state.",
      "Split large controller-like surfaces only along framework interfaces when that increases clarity.",
    ],
    nextQuestions: [
      "Which nested scope facts need to be carried from template-controller semantics into TypeChecker evaluation?",
      "Is the composition question candidate resolution, activation model handoff, composed child rendering, or lifecycle run/deactivate state?",
      "Does the product need per-activation truth, or can the finite aggregate definition-level boundary answer it?",
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
      "template expression selection",
      "template expression projection",
      "template scope type projector",
      "TemplateScopeTypeProjector",
      "TemplateTypeSystemOverlayExpressionProjector",
      "TemplateTypeSystemOverlayBuilder",
      "scopeCreators",
      "BindingScopeCreator",
      "runtime assignment scope",
      "runtime assignment expression scope",
      "synthetic writeback local",
      "inline multi-binding segment",
      "repeat override local",
      "$index",
      "if condition overlay",
      "synthetic-view overlay",
      "listener event overlay",
      "$event overlay",
      "value converter overlay",
      "value converter checker call",
      "converter toView overlay",
      "template locals",
      "$parent",
      "$this",
      "unsupported Aurelia expression overlay",
      "scope slot projection",
      "runtime binding context",
      "template completion source scope",
      "template completion runtime analysis expression world",
      "template diagnostics runtime analysis expression world",
      "state binding completion scope",
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
      {
        query: "template expression selection expression parse runtime scope lookup",
        summary:
          "Cursor inquiries, diagnostics, and overlays should share the expression/value-site to BindingScope selector before adding local lookup.",
      },
      {
        query: "template completion source scope state binding expression world",
        summary:
          "Template completion and weak-member diagnostics should spend runtime-analysis expression-world state and rendered binding source-scope projection during cursor-context member-owner derivation.",
      },
      {
        query: "template expression projection value converter binding behavior parent this overlay",
        summary:
          "Aurelia-only expression forms should route through the copied-expression projector and semantic products before generated TypeScript text is widened.",
      },
      {
        query: "template expression overlay repeat.for BindingScope ancestry",
        summary:
          "Generated template checker overlays should consume materialized BindingScope ancestry instead of reparsing template text for locals.",
      },
      {
        query: "let binding scope effect replay overlay",
        summary:
          "Let-local overlay work should consume BindingScope creator handles before adding source-span heuristics.",
      },
      {
        query: "synthetic-view copied scope slots creator handles branch condition",
        summary:
          "Same-level narrowed scopes should preserve creator handles from their base scope so overlays can replay copied slots before branch conditions.",
      },
      {
        query: "listener event overlay $event BindingScope creator handles",
        summary:
          "Listener expressions should replay the listener-created scope before treating `$event` as a missing template name.",
      },
      {
        query: "inline multi-binding segment runtime assignment expression scope",
        summary:
          "Assignable from-view/two-way custom-attribute locals should be modeled in scope construction and segment parse context before overlay source text is changed.",
      },
      {
        query: "repeat override local $index overlay BindingScope slot",
        summary:
          "Repeat override locals should come from modeled BindingScope slots before generated overlay name-resolution diagnostics are considered.",
      },
      {
        query: "value converter overlay toView checker call resource scope",
        summary:
          "Value-converter checker overlays should consume compiler resource-scope lookup and an importable converter target before generating TypeScript call text.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        ownerRouteId: "semantic-runtime.observation.binding-flow",
        summary:
          "BindingScope, BindingContext, OverrideContext, RuntimeInstructionScopeLookup, scope-slot creators, synthetic writeback locals, repeat locals, and template-scope projection are semantic inputs to binding data flow. Coverage is partial because scope consumers must continue to prove they spend the materialized scope products instead of rebuilding parent/local lookup or target-to-source slots locally.",
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
        filePath: "packages/semantic-runtime/src/template/template-expression-selection.ts",
        role: "supporting",
        summary:
          "Shared expression/value-site and expression-parse to runtime-scope selector for cursor inquiries, diagnostics, and overlays.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/template-completion.ts",
        symbolName: "TemplateCompletionCursorContextBuilder",
        role: "supporting",
        summary:
          "Cursor completion/diagnostic adapter that spends runtime-analysis expression world and binding source-expression scope before publishing the product-handle completion query.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-completion-source-scope",
        role: "pressure",
        summary:
          "Public completion canary for state-bound source scope without child-scope leakage.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-expression.ts",
        symbolName: "TemplateTypeSystemOverlayExpressionProjector",
        role: "supporting",
        summary:
          "Copied/generated authored expression projection and named unsupported Aurelia expression pressure for checker overlays.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/compiler-resource-lookup.ts",
        role: "supporting",
        summary:
          "Shared compiler resource-scope lookup for value-converter and binding-behavior semantic consumers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayBuilder",
        role: "supporting",
        summary:
          "Checker-overlay consumer that replays authored template expressions through materialized BindingScope ancestry.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-plan.ts",
        symbolName: "appendTemplateTypeSystemOverlayScopeBlock",
        role: "supporting",
        summary:
          "Typed overlay layer and text-emission boundary for checker-visible template scope surfaces.",
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
      "semantic-runtime.template-overlay-integration",
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
      "Route checker-epoch, semantic overlay sources, ordinary TypeScript diagnostics, tsconfig diagnostics, TypeScript Program size, source admission, compiler-host cache, and type-system performance work through the shared TypeSystemProject boundary.",
    domains: ["semantic-runtime", "type-system", "checker", "diagnostics", "world-construction", "performance", "telemetry"],
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
      "semantic overlay",
      "type-system overlay",
      "overlay source",
      "TypeSystemOverlaySourceBuilder",
      "TemplateTypeSystemOverlayBuilder",
      "TemplateTypeSystemOverlayExpressionProjector",
      "template expression selection",
      "template expression projection",
      "template type-system overlay",
      "let scope overlay",
      "scopeCreators",
      "BindingScopeCreator",
      "runtime assignment scope",
      "runtime assignment expression scope",
      "synthetic writeback local",
      "inline multi-binding segment",
      "repeat override local",
      "$index",
      "if condition overlay",
      "synthetic-view overlay",
      "listener event overlay",
      "$event overlay",
      "value converter overlay",
      "value converter checker call",
      "converter toView overlay",
      "unsupported Aurelia expression overlay",
      "template-expression-typescript-diagnostic",
      "template overlay diagnostics",
      "overlay diagnostic policy",
      "typescript:TS2339",
      "synthetic checker surface",
      "Program-owned node",
      "Program-owned SourceFile",
      "readProgramNode",
      "readProgramTypeAtLocation",
      "readProgramSymbolAtLocation",
      "readProgramAliasedSymbolAtLocation",
      "readProgramTypeOfSymbolAtLocation",
      "readProgramSourceFileByPath",
      "readProgramSourceFileRole",
      "checkerPropertySymbol",
      "checkerSymbolValueType",
      "checker getTypeAtLocation remap",
      "Program-node remap",
      "TypeScript diagnostic source role",
      "diagnostic source role",
      "dependency declarations",
      "node_modules declarations",
      "TypeScript diagnostics",
      "typescript diagnostics",
      "TS diagnostics",
      "tsc diagnostics",
      "tsconfig diagnostics",
      "config diagnostics",
      "ordinary TypeScript diagnostics",
      "noEmit diagnostics",
      "typescript-diagnostics",
      "typescript-diagnostic-summary",
      "TS5023",
      "lint autofix type errors",
      "type-system telemetry",
      "program source-file composition",
      "type projection lifetime",
      "type-shape sidecar index",
      "checker type-shape index",
      "contract:type-projection-lifetime",
      "checker value access",
      "checker-value-access",
      "contract:checker-value-access",
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
      {
        query: "synthetic checker surface overlay source Program-owned node",
        summary:
          "Aurelia constructs that need checker participation should route through TypeSystemProject overlays and Program-owned node access.",
      },
      {
        query: "template expression selection runtime scope overlay diagnostics",
        summary:
          "Template overlays and diagnostics should share the semantic expression-to-scope selector before building TypeScript checker evidence.",
      },
      {
        query: "template expression projection unsupported Aurelia syntax value converter binding behavior parent this",
        summary:
          "Copied-expression checker overlays should classify Aurelia-only syntax as semantic pressure before exposing TypeScript diagnostics.",
      },
      {
        query: "template expression overlay binding scope repeat locals checker",
        summary:
          "Template expressions that need TypeScript participation should route through generated semantic overlays over materialized BindingScope ancestry.",
      },
      {
        query: "let scope overlay scope effects TypeScript checker",
        summary:
          "Let-local checker surfaces should replay LetBindingScopeEffect through TemplateTypeSystemOverlayBuilder and BindingScope creator handles.",
      },
      {
        query: "synthetic-view if condition overlay branch narrowing",
        summary:
          "Branch-scope checker overlays should replay base scope creators before emitting the built-in template-controller condition.",
      },
      {
        query: "listener event overlay $event TypeScript checker",
        summary:
          "Listener `$event` checker surfaces should route through generated template overlays rather than global template-name fallbacks.",
      },
      {
        query: "synthetic writeback inline multi-binding overlay exact segment expression",
        summary:
          "Writeback-local overlay gaps should route through binding-command segment source addresses, value-site parse context, and BindingScope runtime-assignment creators before overlay-specific fixes.",
      },
      {
        query: "repeat override local $index overlay TypeScript checker",
        summary:
          "Repeat override locals should be emitted from semantic scope slots before raw checker name-resolution diagnostics are exposed.",
      },
      {
        query: "value converter overlay toView TypeScript checker diagnostic",
        summary:
          "Importable value-converter checker calls should route through generated semantic overlays over recognized resource targets before adding local checker fallbacks.",
      },
      {
        query: "template-expression-typescript-diagnostic overlay diagnostic policy",
        summary:
          "Public template TypeScript diagnostics should route through the type-projection overlay diagnostic policy before broadening exposed checker codes.",
      },
      {
        query: "lint autofix introduced TypeScript errors diagnostic overview typescript-diagnostics",
        summary:
          "Ordinary TypeScript diagnostic visibility should route through TypeSystemProject and app diagnostics before MCP prompt wording or local tsc shell-outs.",
      },
      {
        query: "TypeScript diagnostic source role external declaration generated overlay",
        summary:
          "Diagnostic source role classification belongs to TypeSystemProject's Program source-file role boundary, not API-local path heuristics.",
      },
      {
        query: "query claim type projection checker sidecar stale product handle",
        summary:
          "Type projection lifetime pressure should route through CheckerTypeProjector, KernelStore sidecar indexes, and the focused type-projection lifetime contract.",
      },
      {
        query: "TypeChecker property symbol apparent type duplicated helper",
        summary:
          "Repeated declared/apparent property lookups should route through checker-node-helpers or CheckerTypeShapeAccess before adding feature-local checker helper code.",
      },
      {
        query: "getTypeAtLocation Program-node remap feature receiver checker",
        summary:
          "Feature-side receiver/type reads should route through TypeSystemProject remap APIs; direct calls are expected only in type-system owners or documented local type-context boundaries.",
      },
      {
        query: "checker value access TypeSystemProject direct TypeChecker calls",
        summary:
          "Feature-side TypeChecker value-access calls should route through TypeSystemProject/checker helpers and the checker-value-access contract.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.TypeSystemProjectEpoch,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "TypeSystemProject is the current shared checker epoch for app-local TypeScript Program construction, semantic overlay roots, Program-node remap, source-role classification, ordinary TypeScript diagnostics, and type-system telemetry. `contract:type-projection-lifetime`, `contract:typescript-diagnostics`, `contract:checker-value-access`, and `profile:app-telemetry` are the current witnesses; inquiry-depth/lazy-checker work remains a neighboring query-claim/app-opening policy question rather than a second Program path.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.CheckerValueAccess,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "TypeSystemProject owns Program-node remap APIs and checker-node/checker-related helper access for property/value-type/symbol/index/type-node reads. The checker-value-access contract AST-scans semantic-runtime and permits direct value-access, type-argument, and collection-shape checker calls only inside type-system owners or documented local type-context boundaries such as proxy observation.",
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
        symbolName: "TypeSystemProject.readProgramSourceFileRole",
        role: "supporting",
        summary:
          "Program-owned source-role classifier for TypeScript diagnostics and future repair/edit planning.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject.readProgramTypeAtLocation",
        role: "supporting",
        summary:
          "Epoch-owned Program-node remap plus TypeChecker type read for evaluator/source-discovery nodes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject.readProgramSymbolAtLocation",
        role: "supporting",
        summary:
          "Epoch-owned Program-node remap plus TypeChecker symbol read for evaluator/source-discovery nodes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject.readProgramAliasedSymbolAtLocation",
        role: "supporting",
        summary:
          "Alias-resolved Program symbol read for checker-backed value references.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject.readProgramTypeOfSymbolAtLocation",
        role: "supporting",
        summary:
          "Epoch-owned Program-node remap plus TypeChecker symbol value-type read.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/diagnostics.ts",
        symbolName: "readTypeSystemProjectDiagnostics",
        role: "primary",
        summary:
        "Ordinary TypeScript diagnostic reader over the shared Program/tsconfig epoch.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/typescript-diagnostics.ts",
        symbolName: "readSemanticTypeScriptDiagnostics",
        role: "supporting",
        summary:
          "Public API projection for TypeScript diagnostics and summary rows.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProjectBuilder",
        role: "primary",
        summary:
          "Builds the checker epoch from evaluated sources, semantic overlays, compiler options, host, Program, and checker.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/overlay.ts",
        symbolName: "TypeSystemOverlaySource",
        role: "primary",
        summary:
          "Program-owned virtual TypeScript source descriptor for Aurelia semantic checker surfaces.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/overlay.ts",
        symbolName: "TypeSystemOverlaySourceBuilder",
        role: "supporting",
        summary:
          "Generated overlay text builder that records exact generated source segments.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-expression-selection.ts",
        role: "supporting",
        summary:
          "Shared template expression/value-site and runtime-scope selector used before checker overlay emission.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-expression.ts",
        symbolName: "TemplateTypeSystemOverlayExpressionProjector",
        role: "supporting",
        summary:
          "Projection boundary for copied/generated authored expressions and unsupported Aurelia syntax pressure before overlay emission.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/compiler-resource-lookup.ts",
        role: "supporting",
        summary:
          "Shared compiler resource-scope lookup used before value-converter checker-call overlay emission.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayBuilder",
        role: "supporting",
        summary:
          "Template overlay builder that replays authored expressions inside BindingScope ancestry for checker participation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayAliasReplayCursor",
        role: "supporting",
        summary:
          "Overlay-local cursor for generated `$this`/`$parent` alias state while replaying materialized scope ancestry.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-plan.ts",
        symbolName: "appendTemplateTypeSystemOverlayScopeBlock",
        role: "supporting",
        summary:
          "Template overlay layer algebra and text-emission boundary for generated checker surfaces, including parent alias capture/replay across generated blocks.",
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
        filePath: "packages/semantic-runtime/src/type-system/checker-projector.ts",
        symbolName: "CheckerTypeProjector",
        role: "supporting",
        summary:
          "TypeChecker type-shape projector with a store-local sidecar index that mirrors product-detail lifetime.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/checker-node-helpers.ts",
        symbolName: "checkerPropertySymbol",
        role: "supporting",
        summary:
          "Low-level declared/apparent TypeChecker property-symbol helper used beneath projected type-shape access.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/kernel/store.ts",
        symbolName: "KernelStore.registerSidecarIndex",
        role: "supporting",
        summary:
          "Kernel sidecar-index registration and disposal notification boundary.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:type-projection-lifetime",
        role: "grounding",
        summary:
          "Contract proving type-shape sidecar indexes prune with kernel product-detail disposal and reproject fresh details.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:checker-value-access",
        role: "grounding",
        summary:
          "AST contract proving feature-side TypeChecker value-access calls stay in type-system owners or documented local contexts.",
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
          "Type-system substrate docs explain Program source composition, semantic overlays, compiler-host caching, and root-narrowing cautions.",
      },
    ],
    authority: [
      "TypeSystemProject source for Program/checker epoch ownership.",
      "Type-system diagnostic reader for ordinary TypeScript Program diagnostics.",
      "Type-system README and memory record for source admission and root-narrowing cautions.",
      "App telemetry for phase timing, source-file composition, and host cache stats.",
      "CheckerTypeProjector and KernelStore sidecar-index contracts for query-local TypeChecker projection lifetime.",
      "Aurelia resource/template/type semantics for deciding whether roots are semantic inputs or type-only dependencies.",
    ],
    cautions: [
      "Do not add a second TypeChecker Program path for a local feature; improve TypeSystemProject or downstream inquiry depth.",
      "Do not pass evaluator/source-discovery AST nodes directly into checker APIs; remap them through TypeSystemProject or admit a semantic overlay first.",
      "Do not shell out to tsc from MCP for project diagnostics; semantic-runtime should expose Program diagnostics through public app-query surfaces.",
      "Do not treat synthetic overlays as ordinary public TypeScript diagnostics; map overlay diagnostics back to authored Aurelia sources before surfacing them.",
      "A large Program root count is not automatically waste: source-shipped plugins and workspace packages may contain real Aurelia resources.",
      "Do not cache authored project source files behind a global dependency cache that hides edits.",
      "If an inquiry does not need checker facts, fix the app-query depth/materialization policy before narrowing TypeScript roots.",
    ],
    nextQuestions: [
      "Is the measured cost Program construction, checker creation, host source-file reads, or downstream type-shape projection?",
      "Are large roots semantic app/resource inputs, type-only dependencies, or artifacts of source admission?",
      "Which inquiry profile and app-query depth made this checker epoch necessary?",
      "Does the feature need a Program-owned overlay source, a Program-node remap, or a purely semantic non-checker path?",
      "Should TypeScript diagnostics be part of the unified diagnostic answer, or a focused typescript-diagnostics row read?",
      "Can telemetry distinguish root-file pressure from final Program dependency closure before a refactor?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-overlay-integration",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.inquiry-query-claim-graph",
      "diagnostics.framework-error-grounding",
      "mcp.developer-preview-shell",
      "semantic-runtime.evaluator.world-construction",
      "semantic-runtime.template-recursive-rendering",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.template-overlay-integration",
    aliases: [
      "template-overlay-integration",
      "type-system-overlay-integration",
      "frontier:template-overlay-integration-hardening",
    ],
    title: "Template Overlay Integration",
    summary:
      "Route template TypeScript overlay completion, diagnostics, provenance, rename readiness, and split-brain pressure through the semantic substrates overlays must spend: template scopes, binding/data-flow, observer channels, TypeSystemProject, i18n owners, and source addresses.",
    domains: [
      "semantic-runtime",
      "template",
      "overlay",
      "type-system",
      "diagnostics",
      "provenance",
      "lsp",
    ],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "template overlay integration",
      "type-system overlay integration",
      "overlay complete",
      "overlay completeness",
      "overlay hardening",
      "overlay typechecking diagnostics rename provenance",
      "overlay typechecking",
      "overlay diagnostics",
      "app-builder readiness overlay",
      "MCP app-builder common pattern overlay",
      "common app-building overlay coherence",
      "readTypeSystemOverlayDiagnostics",
      "TemplateTypeSystemOverlayBuilder",
      "TemplateTypeSystemOverlayExpressionProjector",
      "templateTypeSystemOverlayExpressionSupportMatrix",
      "templateTypeSystemOverlayPreludeHelpers",
      "template-scope-replay",
      "templateScopeReplayChain",
      "templateScopeAliasSupport",
      "template scope replay",
      "$this $parent overlay alias",
      "unsupportedOverlayExpressionSyntax",
      "retired unsupportedOverlayExpressionSyntax",
      "unsupported overlay expression",
      "unsupported overlay expression syntax",
      "overlay expression syntax support matrix",
      "semantic expression coverage",
      "expression:coverage",
      "expression kind coverage",
      "expression kind admission",
      "parser constructed expression kind",
      "TypeSystemOverlaySource",
      "TypeSystemOverlaySourceBuilder",
      "generated overlay segment",
      "authored source segment",
      "overlay source segment",
      "semantic overlay source mapping",
      "synthetic checker surface",
      "Program-owned overlay",
      "split brain",
      "split-brain",
      "overlay semantic diagnostics split brain",
      "overlay binding data-flow split brain",
      "overlay evaluation split brain",
      "overlay expression evaluation context split brain",
      "CheckerExpressionTypeEvaluationContext overlay",
      "statement-shaped overlay",
      "statement overlay emission",
      "DestructuringAssignment overlay",
      "CustomExpression overlay",
      "CustomExpression i18n overlay",
      "translation binding overlay",
      "promise-result overlay",
      "template-controller overlay",
      "template overlay state binding source expression source scope",
      "template overlay source scope",
      "overlay source scope",
      "overlay ambient scope",
      "overlay source scope fallback",
      "unrelated source scope overlay",
      "runtime binding source scope overlay ambient",
      "same-level synthetic scope replay",
      "template scope can evaluate source scope",
      "templateScopeCanEvaluateSourceScope",
      "templateScopeCanReplaySourceScope",
      "StateBinding replay tail",
      "wrapRuntimeSourceExpression owner fallback",
      "runtime binding source scope selection overlay",
      "state binding source scope overlay",
      "state backed if bind condition child scope leak",
      "state-backed template-controller condition child scope boundary",
      "source-scope-changing template-controller condition child binding",
      "RuntimeBindingSourceExpressionContextProjector overlay",
      "strictBinding overlay",
      "strict false nullish overlay typechecker",
      "non strict nullish overlay diagnostics",
      "TS18047 strict false overlay",
      "source-scope-changing binding behavior overlay",
      "bindingScopesForTemplateExpressionParse",
      "plural expression scope",
      "instruction scope applications overlay",
      "binding data-flow overlay",
      "observer channel overlay",
      "from-view overlay",
      "two-way overlay",
      "generated overlay any hole",
      "undefined as any overlay",
      "overlay unknown not any",
      "generated-type-expression overlay",
      "checker global type expression overlay",
      "DOM event member overlay",
      "listener currentTarget target overlay type expression",
      "BindingScope context slot overlay",
      "bindingContextSlotDraftForExpressionAccess overlay source slot",
      "rename provenance overlay",
      "rename overlay provenance",
      "LSP overlay",
      "MCP overlay",
    ],
    queryCanaries: [
      {
        query: "overlay typechecking diagnostics rename provenance",
        summary:
          "Broad overlay/LSP integration questions must route to the overlay integration substrate before feature-local edits.",
      },
      {
        query: "is overlay complete split brain binding data flow evaluation",
        summary:
          "Completeness checks should expose remaining semantic-owner risks rather than treating generated TypeScript as the whole truth.",
      },
      {
        query: "CustomExpression i18n translation binding overlay unsupported syntax",
        summary:
          "CustomExpression pressure should route through owner-specific i18n semantics before generic overlay syntax handling.",
      },
      {
        query: "unsupportedOverlayExpressionSyntax overlay expression syntax support matrix",
        summary:
          "The retired syntax-blacklist helper should route to the overlay expression support matrix and reuse guide, not to evaluator or parser work.",
      },
      {
        query: "DestructuringAssignment statement-shaped overlay emission",
        summary:
          "Statement-shaped expression pressure should first prove whether the semantic parser constructs the expression kind, then route live syntax to overlay plan/block emission instead of pretending it is a standalone expression.",
      },
      {
        query: "semantic expression coverage parser constructed overlay support matrix",
        summary:
          "AST-kind coverage questions should use the expression coverage probe before assuming a support-matrix row is live parser admission or dead syntax.",
      },
      {
        query: "rename overlay source segment authored source provenance",
        summary:
          "Rename and edit readiness should route through exact overlay/source-address mapping and the edit affordance route.",
      },
      {
        query: "bindingScopesForTemplateExpressionParse plural expression scope recursive overlay",
        summary:
          "Overlay expression-scope selection should route through the plural runtime-scope selector rather than a first instruction-scope application.",
      },
      {
        query: "template overlay state binding source expression source scope",
        summary:
          "State binding overlay pressure should route through the binding-owned source-expression context handoff, not child-view scope mutation.",
      },
      {
        query: "overlay source scope unrelated ambient fallback",
        summary:
          "Unrelated overlay source scopes should stay explicit substrate pressure rather than being copied through ambient aliases.",
      },
      {
        query: "same-level synthetic scope replay overlay binding source scope",
        summary:
          "Same-level synthetic overlay scopes should route through the shared source-scope evaluation predicate before selecting runtime bindings; source-backed slot type differences can be refinements, while anonymous source-less slots need matching projected types.",
      },
      {
        query: "state backed if bind condition child scope leak",
        summary:
          "State-backed template-controller conditions can spend state source scope for their own expression but must not publish store slots into ordinary child-view bindings.",
      },
      {
        query: "strict false nullish overlay typechecker",
        summary:
          "Strict-false nullish overlay pressure should route through runtime binding strictBinding, TypeChecker nullish presence, and binding data-flow write policy rather than answer-layer diagnostic suppression.",
      },
      {
        query: "generated overlay undefined as any BindingScope context slot unknown",
        summary:
          "Generated overlay local typing should route through materialized BindingScope slot types and the no-any overlay contract, not through overlay-local fallback casts.",
      },
      {
        query: "bindingContextSlotDraftForExpressionAccess overlay source slot",
        summary:
          "Overlay source-slot questions should route back to materialized BindingScope/source-expression slot projection before adding generated TypeScript casts.",
      },
      {
        query: "listener currentTarget target overlay generated-type-expression DOM event member",
        summary:
          "Listener-event overlay refinements should route through generated-type-expression and scope-projected event member types rather than display-string type printing in the overlay builder.",
      },
      {
        query:
          "app-builder readiness overlay binding data-flow observer value-channel common patterns",
        summary:
          "App-builder readiness should check ordinary overlay/binding/observer agreement, then pivot to app-builder pattern discovery instead of polishing rare expression-narrowing edges.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.AuthoredSourceTextBoundary,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "Template overlay expression projection now slices authored template text through the shared AuthoredSourceTextCache instead of overlay-local file reads, and the overlay contract verifies generated diagnostics map back to exact authored spans. Any future raw source slicing in overlay/cursor diagnostics should route through the same kernel boundary before adding local line/offset helpers.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.TypeSystemProjectEpoch,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system-project-epoch",
        summary:
          "Template overlays enter TypeScript through TypeSystemOverlaySource roots on the shared TypeSystemProject epoch, then consume readTypeSystemOverlayDiagnostics for generated-to-authored diagnostic mapping. Overlay work should deepen TypeSystemProject overlays or semantic products instead of creating a template-local Program or checker path.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.CheckerValueAccess,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system-project-epoch",
        summary:
          "Template overlays emit Program-owned generated source and consume checker diagnostics through TypeSystemProject/readTypeSystemOverlayDiagnostics rather than raw TypeChecker calls. The checker-value-access contract and product-architecture pressure keep raw checker value/assignability calls centralized in type-system owners; the remaining overlay split-brain risk is binding/data-flow or observer disagreement, not overlay-local checker access.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.observation.binding-flow",
        summary:
          "Template overlays should consume binding data-flow for fromView/twoWay writeback, checked/select/class/style value channels, target/source assignability, bound-controller values, source open reasons, and scope-materialized local types. Runtime-assignment locals now spend scope-materialized source-local types, including converter fromView results that differ from the target bindable member; context-slot locals such as repeat override slots spend BindingScope target types when present and degrade to unknown rather than any. Coverage remains partial as an anti-regression guardrail: common app-builder-facing contracts are green, but future overlay helpers must not regrow local writeback, value-channel policy, or type-erasing fallback casts.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.ExpressionEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system.expression-semantics",
        summary:
          "Template overlays still own generated TypeScript source mapping and prelude replay, but overlay-local expression type questions spend CheckerExpressionTypeEvaluationContext through materialized BindingScope products or RuntimeBindingSourceExpressionContextProjector. Scope replay projects child-scope creator expressions with their runtime source scope instead of the final leaf scope, and overlay expression probes spend the plural bindingScopesForTemplateExpressionParse selector so definition-level instruction products do not hide recursive render-context applications. `contract:expression-context-usage` now guards knownScope exact-scope fallbacks and rendered-binding projection calls, while raw construction is private to the context class and contract scripts are scanned for old constructor leaks. The remaining overlay risk is binding/value-flow divergence, not a separate expression-context axis.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.SourceValueEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.binding-source-value-evaluation",
        summary:
          "Template overlays do not own runtime value closure directly. RuntimeBindingSourceValueEvaluationContext remains the source-value request shape for static binding-source values, DI-backed source reads, and bound-controller handoff; overlays consume the materialized BindingScope and slot facts produced by that lower path. The overlay, composition, binding-flow, i18n lifecycle, and source-scope contracts cover this indirect consumer boundary.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "Template overlay work supplies evidence for cursor, diagnostic, and LSP-like answers. Public cursor and diagnostic answers now carry fixture-verified follow-up continuations; overlay-specific edit/reference precision remains a future Semantic IDE surface rather than a current continuation gap.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayBuilder",
        role: "primary",
        summary:
          "Generated TypeScript overlay builder that spends materialized BindingScope ancestry and semantic products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayBuildFrame",
        role: "supporting",
        summary:
          "One-overlay mutable build state for generated source, expression probes, skipped rows, base projection context, and runtime source-expression projectors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "appendTemplateExpressionProbes",
        role: "supporting",
        summary:
          "Overlay build phase that replays every parsed template expression through materialized scopes before generated TypeScript is finalized.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay.ts",
        symbolName: "TemplateTypeSystemOverlayAliasReplayCursor",
        role: "supporting",
        summary:
          "Overlay-local cursor for generated `$this`/`$parent` alias state while replaying materialized scope ancestry.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-scope-replay.ts",
        symbolName: "templateScopeReplayChain",
        role: "primary",
        summary:
          "Shared BindingScope ancestry replay and alias reachability policy used before overlay, cursor, diagnostic, and future edit surfaces interpret `$this`/`$parent`.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-scope-replay.ts",
        symbolName: "templateScopeCanEvaluateSourceScope",
        role: "supporting",
        summary:
          "Shared predicate for deciding whether a runtime binding source scope can be evaluated at an ambient generated-analysis scope.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-expression-support.ts",
        symbolName: "templateTypeSystemOverlayExpressionSupportMatrix",
        role: "primary",
        summary:
          "AST-kind support and owner matrix that prevents unsupported syntax from becoming overlay-local guesswork.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-expression-selection.ts",
        symbolName: "bindingScopesForTemplateExpressionParse",
        role: "primary",
        summary:
          "Plural expression-to-runtime-scope selector used when definition-level template expressions have several materialized instruction-scope applications.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-expression-selection.ts",
        symbolName: "runtimeExpressionBindingsForTemplateExpressionParseInScope",
        role: "supporting",
        summary:
          "Scoped runtime-binding selector that prevents overlays from spending sibling bindings for the same definition-level expression.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-expression.ts",
        symbolName: "TemplateTypeSystemOverlayExpressionProjector",
        role: "primary",
        summary:
          "Expression projector that copies source, lowers owner-modeled expressions, and records unsupported owner/frontier lanes.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-plan.ts",
        symbolName: "appendTemplateTypeSystemOverlayScopeBlock",
        role: "primary",
        summary:
          "Overlay layer and block-emission algebra; statement-shaped overlay pressure should land here or in a lower shared primitive.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/template/template-type-system-overlay-prelude.ts",
        symbolName: "templateTypeSystemOverlayPreludeHelpers",
        role: "supporting",
        summary:
          "Reusable helper inventory for emitted checker surfaces; non-helper overlay facts should stay in overlay layers.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/runtime-binding-source-expression-context.ts",
        symbolName: "RuntimeBindingSourceExpressionContextProjector",
        role: "primary",
        summary:
          "Binding-owned source-expression context projector consumed by overlays for source-scope-changing binding behaviors.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/overlay.ts",
        symbolName: "TypeSystemOverlaySource",
        role: "primary",
        summary:
          "Program-owned overlay source and generated-segment metadata used for diagnostics and future edits.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/diagnostics.ts",
        symbolName: "readTypeSystemOverlayDiagnostics",
        role: "primary",
        summary:
          "Explicit overlay diagnostic lane that maps checker diagnostics through overlay segments to authored source.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-data-flow-materializer.ts",
        symbolName: "RuntimeBindingDataFlowMaterializer",
        role: "pressure",
        summary:
          "Binding and observer data-flow products must agree with overlay checker results for from-view/two-way/writeback semantics.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/i18n/translation-binding-issues.ts",
        symbolName: "I18nTranslationBindingIssueMaterializer",
        role: "pressure",
        summary:
          "Current owner lane for CustomExpression rather than a generic overlay expression path.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/source-reference.ts",
        symbolName: "SemanticSourceReference",
        role: "supporting",
        summary:
          "Public source reference envelope that future rename/edit planning must make exact enough to mutate.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas expression:coverage -- --query=DestructuringAssignment --detail",
        role: "pressure",
        summary:
          "Atlas expression-kind coverage probe for parser construction, support-matrix ownership, and overlay/evaluator consumer rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:type-system-overlays",
        role: "pressure",
        summary:
          "Focused contract for overlay sources, support matrix, generated-child splicing, diagnostics, and public overlay rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:expression-context-usage",
        role: "pressure",
        summary:
          "Structural contract proving direct CheckerExpressionTypeEvaluationContext construction stays in documented context/fallback owners while runtime binding consumers route through the projection helper.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-completion-source-scope",
        role: "pressure",
        summary:
          "Focused contract for cursor completions through runtime binding source scopes without child-scope leakage.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/implicit-binding-expression-inference",
        role: "pressure",
        summary:
          "Fixture for copied template expressions, repeated scopes, and overlay diagnostic source mapping.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/template-overlay-scope-aliases",
        role: "pressure",
        summary:
          "Fixture for `$this`, `$parent`, boundary `this`, repeat locals, destructured locals, and nested scope alias replay.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/template-overlay-value-converter",
        role: "pressure",
        summary:
          "Fixture for value-converter overlay lowering, generated child splicing, and authored-source diagnostic mapping.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/template-overlay-bound-controller",
        role: "pressure",
        summary:
          "Fixture for child controller overlay typing through parent-bound values.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/template-overlay-state-binding-scope",
        role: "pressure",
        summary:
          "Fixture proving `& state` overlay source reads without changing template-controller child `$parent` ancestry.",
      },
      {
        kind: "path",
        pathPrefix:
          "packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors",
        role: "pressure",
        summary:
          "Fixture for public overlay diagnostics and cursor diagnostic rows.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:template-controller-built-ins",
        role: "pressure",
        summary:
          "Contract proving template-controller scope products are spent by overlays instead of approximated locally.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "expression", "type-system", "overlay"],
        role: "grounding",
        summary:
          "Overlay expression/prelude memory gives the support matrix, helper ownership, and unsupported owner/frontier lanes.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "template", "controller", "type-system", "overlay"],
        role: "grounding",
        summary:
          "Template-controller overlay memory keeps promise/switch/repeat/with/virtual-repeat scope facts connected to overlays.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "observation", "binding", "data-flow", "type-system"],
        role: "pressure",
        summary:
          "Binding data-flow memory is the main split-brain guard for TypeScript-accepted overlays versus Aurelia writeback semantics.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "lsp", "edits", "type-system", "template"],
        role: "supporting",
        summary:
          "Edit-affordance memory records why rename/edit planning must join overlay provenance with Aurelia semantic references.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/template/README.md",
        role: "grounding",
        summary:
          "Template docs record the current overlay and template-controller scope boundaries.",
      },
    ],
    authority: [
      "Template overlay support matrix and overlay plan/source mapping before generated TypeScript changes.",
      "TypeSystemProject and overlay diagnostics for checker participation and authored-source diagnostic mapping.",
      "Binding/data-flow and observer value-channel products for write direction and runtime binding semantics.",
      "Owner-specific semantic products such as i18n TranslationBinding before handling opaque extension syntax.",
      "Exact source-reference/provenance products before rename, edit, or MCP-facing fix planning.",
    ],
    cautions: [
      "Do not call overlay complete just because generated TypeScript type-checks; binding data-flow, observer channels, and owner diagnostics may still disagree.",
      "Do not solve unsupported overlay expressions by copying more syntax into TypeScript when an Aurelia owner product should provide the semantic fact.",
      "Do not route rename through overlay spans alone; overlay segments are evidence that must join TypeScript and Aurelia semantic references.",
      "Do not make overlay code a second evaluator. Static evaluation and binding-source value evaluation should feed overlay facts, not be reimplemented in generated TypeScript.",
    ],
    nextQuestions: [
      "Which semantic product should own the fact the overlay needs: scope, binding/data-flow, observer, resource, i18n, router, or evaluator?",
      "Is the gap a generated-source expression problem, a statement/block emission problem, or an owner-specific semantic product problem?",
      "Can overlay diagnostics map to an exact authored source address, and is another semantic diagnostic already authoritative on that span?",
      "Does this pressure affect rename/edit provenance, and if so which non-overlay reference families must be joined?",
    ],
    relatedRouteIds: [
      "semantic-runtime.type-system-project-epoch",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.binding-scope",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.i18n.translation-binding",
      "semantic-runtime.lsp-edit-affordance-substrate",
      "diagnostics.template-repair-policy",
      "semantic-runtime.evaluator.world-construction",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.lsp-edit-affordance-substrate",
    title: "Semantic IDE Affordance Substrate",
    summary:
      "Route IDE/MCP definition, references, hover, diagnostics-to-edit, rename, code actions, organize imports, file rename edits, and future workspace-edit planning through one deliberate semantic-runtime affordance substrate rather than one-off TypeScript LanguageService calls.",
    domains: ["semantic-runtime", "lsp", "edits", "type-system", "template", "api", "inquiry"],
    roles: ["orient", "analyze", "refactor", "verify", "improve-atlas"],
    terms: [
      "rename",
      "safe rename",
      "go to definition",
      "goto definition",
      "find all references",
      "find references",
      "semantic references",
      "semantic reference algebra",
      "reference algebra",
      "definition provider",
      "reference provider",
      "hover",
      "quick info",
      "document highlight",
      "semantic IDE affordance algebra",
      "semantic IDE affordance substrate",
      "MCP IDE same API",
      "IDE for AI",
      "MCP as IDE for AI",
      "workspace edit",
      "workspace edits",
      "edit affordance",
      "edit affordances",
      "code action",
      "code actions",
      "quick fix",
      "quick fixes",
      "organize imports",
      "file rename edits",
      "refactor edits",
      "references-backed edit",
      "TypeScript LanguageService",
      "LanguageService rename",
      "template references",
      "Aurelia references",
      "template binding references",
      "view-model rename",
      "resource rename",
      "route parameter rename",
      "translation key rename",
      "semantic edit plan",
      "transactional edit",
      "Roslyn workspace",
      "Roslyn-like editing",
    ],
    queryCanaries: [
      {
        query: "goto definition find all references rename semantic reference edit algebra",
        summary:
          "Definition, references, and rename should route to the same semantic IDE affordance substrate; editing is the stricter consumer of the reference algebra.",
      },
      {
        query: "MCP and IDE should use the same semantic-runtime API IDE for AI",
        summary:
          "MCP/IDE parity should route to semantic-runtime affordance/API design before transport-local tools are invented.",
      },
      {
        query: "rename a view model member used from Aurelia templates",
        summary:
          "Cross-language rename should route to edit-affordance planning instead of raw TypeScript rename or template completion code.",
      },
      {
        query: "code action for a TypeScript diagnostic and an Aurelia template diagnostic",
        summary:
          "Diagnostics-to-edit planning should route to one edit substrate before individual diagnostic families invent fix payloads.",
      },
      {
        query: "file rename edits should update imports routes templates and resource references",
        summary:
          "Workspace-level file/resource rename should keep TypeScript and Aurelia semantic references in one transaction model.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.AuthoredSourceTextBoundary,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        summary:
          "Existing source-reference and overlay mapping primitives can preserve exact authored loci, but future rename/edit planning still needs a stricter edit-range surface over shared authored text rather than broad carrier spans.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.CheckerValueAccess,
        state: AtlasWorkRouteCoverageState.Missing,
        ownerRouteId: "semantic-runtime.type-system-project-epoch",
        summary:
          "The future semantic edit/reference substrate has not yet decided how TypeScript LanguageService, TypeSystemProject, checker helper access, and Aurelia semantic references share one epoch. Do not add a naive edit surface until this is designed.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Missing,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "IDE affordance answers require intent-aware continuation and evidence gates for navigation, diagnostics, and future edit previews. The edit/reference substrate is not yet wired to public intent-aware continuations.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/type-system/project.ts",
        symbolName: "TypeSystemProject",
        role: "primary",
        summary:
          "Shared Program/checker epoch that any TypeScript-backed edit substrate must reuse rather than rebuild.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/source-reference.ts",
        symbolName: "SemanticSourceReference",
        role: "primary",
        summary:
          "Current public source-locus envelope; future edit spans must be at least this exact and may need a stricter edit range primitive.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/template-completion.ts",
        symbolName: "TemplateCompletionCursorContextBuilder",
        role: "supporting",
        summary:
          "Existing cursor-locus substrate that should be generalized before other LSP-like features duplicate template site discovery.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/inquiry/query-claim-graph.ts",
        symbolName: "QueryClaimGraph",
        role: "supporting",
        summary:
          "Answer-boundary storage and invalidation layer for edit-preview answers that may depend on project/source epochs.",
      },
      {
        kind: "lens",
        lensId: LensId.TsType,
        projection: "rename",
        role: "grounding",
        summary:
          "Atlas TypeScript LanguageService rename lane is a precedent and pressure source, not a semantic-runtime product dependency.",
      },
      {
        kind: "lens",
        lensId: LensId.TsType,
        projection: "references",
        role: "grounding",
        summary:
          "TypeScript references are one input to cross-language edit planning, but Aurelia template/resource references must join them.",
      },
      {
        kind: "memory",
        domains: ["semantic-runtime", "lsp", "edits", "type-system", "template"],
        role: "grounding",
        summary:
          "Memory records the intentional boundary for future workspace-edit planning.",
      },
      {
        kind: "doc",
        path: "packages/semantic-runtime/src/api/README.md",
        role: "grounding",
        summary:
          "API boundary notes for public LSP/MCP-facing answers and source-reference precision.",
      },
    ],
    authority: [
      "TypeSystemProject for shared TypeScript Program/checker lifetime.",
      "Atlas ts.type LanguageService edit affordance lanes as implementation precedent, not product API.",
      "Template cursor/source-reference/query-claim substrates for cross-language locus, invalidation, and answer lifetime.",
      "Aurelia semantic products for template, resource, route, i18n, and binding references that TypeScript rename cannot see.",
      "SemanticRuntime/SemanticApp public API catalog as the shared surface for MCP and IDE/LSP adapters.",
    ],
    cautions: [
      "Do not add a naive rename endpoint that only wraps TypeScript LanguageService results; it will not scale to Aurelia templates, resources, routes, or generated edit transactions.",
      "Do not build separate MCP-only and IDE-only semantic surfaces. Transport adapters may differ, but the semantic affordance answers should be shared.",
      "Do not add a second TypeScript Program or LanguageService path without first deciding how it shares the TypeSystemProject epoch and source-change invalidation.",
      "Treat broad carrier spans as insufficient for edits. Rename and code actions need exact authored source ranges or an explicit missing-precision diagnostic.",
      "Edit planning should grow toward Roslyn-like workspace operations: previewable, multi-file, transactional, explainable, and able to combine TypeScript and Aurelia semantic references.",
    ],
    nextQuestions: [
      "Is the requested feature read-only navigation, diagnostic explanation, edit preview, or edit application?",
      "Which references are TypeScript-only, and which come from Aurelia template/resource/router/i18n products?",
      "What completeness and editability threshold does this affordance need: best-known navigation, classified references, or exact transactional edits?",
      "Does the existing cursor/context or source-reference substrate give exact edit ranges, or is provenance the first blocker?",
      "Can QueryClaimGraph own the answer lifetime and invalidation keys for this edit plan?",
      "Should this start as a formal edit-plan algebra before any public MCP/LSP tool is exposed?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-overlay-integration",
      "semantic-runtime.type-system-project-epoch",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-compiler-world",
      "semantic-runtime.template-html-parsing",
      "semantic-runtime.binding-scope",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.inquiry-query-claim-graph",
      "mcp.developer-preview-shell",
      "atlas.work-router.self-improvement",
    ],
  },
  {
    id: "semantic-runtime.type-system.expression-semantics",
    aliases: [
      "checker-type-shape-access",
      "frontier:checker-type-shape-access",
    ],
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
      "CheckerExpressionTypeEvaluationContext",
      "checker expression type evaluation context",
      "Aurelia expression evaluation context",
      "expression evaluation context",
      "checker expression type evaluator",
      "expression type evaluator",
      "type-system expression semantics",
      "type system expression semantics",
      "type-system",
      "type system",
      "TypeChecker",
      "CheckerExpressionArrayMethodProjector",
      "synthetic Array method projector",
      "synthetic Array reduce",
      "app-builder readiness expression context",
      "common app-building expression coherence",
      "rare branch narrowing canary",
      "Array.reduce synthetic array",
      "TypeScript standard library boundary",
      "TypeScript owns checker-backed stdlib Aurelia crossings",
      "TypeScript owns standard library generics overloads inference",
      "Aurelia crossings product-owned synthetic shapes",
      "standard library intrinsic boundary",
      "standard library boundary",
      "intrinsic boundary",
      "stdlib boundary",
      "parallel TypeScript stdlib",
      "synthetic array standard library boundary",
      "synthetic Array generics overloads",
      "toSorted source-value boundary",
      "result-independent Array callback",
      "synthetic Array comparator body boundary",
      "localeCompare comparator boundary",
      "callback-body-type-independent",
      "callback-body-drives-type",
      "string relational operator boundary",
      "checker-backed expression",
      "nullish call target",
      "optional call target",
      "non-strict call target",
      "nullish union value property",
      "checkerTypeShapeNullishUnionHasValueProperty",
      "nullable union missing member diagnostic",
      "evaluateCallableCallReturn",
      "checker signature parameters",
      "checker-signature-parameters",
      "checkerSignatureCandidateBasis",
      "checkerCallableReturnTypesForRuntimeArguments",
      "checkerConstructReturnTypeUnion",
      "checkerSignatureParameterType",
      "runtime argument arity signature",
      "overloaded constructor instanceof",
      "construct signature union",
      "runtime event argument signature",
      "ListenerBinding handler overload",
      "event handler invocation overload",
      "matcher.bind overload",
      "custom matcher runtime arguments",
      "overload candidate basis",
      "generated-type-expression",
      "checker global type expression",
      "global declaration type expression",
      "DOM lib interface type expression",
      "CheckerExpressionTypeWorld",
      "expression type world",
      "checker primitive literal",
      "primitive literal type",
      "checker-primitive-types",
      "checker-collection-types",
      "checker collection types",
      "checker literal domain",
      "collection shape helper",
      "collection method coverage",
      "modern array framework observation gap",
      "type-visible source-value open array method",
      "source-value mutating receiver open array method",
      "source-value-mutating-receiver-open",
      "source-value unmodeled host array open",
      "source-value-unmodeled-host-array-open",
      "contract:expression-primitive-literals",
      "expression cache source span",
      "expression projection local key",
      "expression kind span projection key",
      "runtime evaluator mode",
      "runtime expression connectable strict mode",
      "binding behavior lifecycle",
      "astBind then evaluate",
      "astEvaluate only",
      "evaluate-only binding behavior",
      "connectable expression evaluation",
      "IAstEvaluator strict",
      "astEvaluate scope evaluator connectable",
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
      "CheckerTypeShapeAccess",
      "checker type shape access",
      "checker-type-shape-access",
      "memberValueAccess",
      "memberWriteAccess",
      "finite keyed access",
      "index signature access",
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
      "bindingContextSlotDraftForExpressionAccess",
      "source expression slot projector",
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
        query: "bindingContextSlotDraftForExpressionAccess source expression slot checker handoff",
        summary:
          "Source-expression-to-slot projection should spend BindingScope first and TypeChecker member continuation second.",
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
      {
        query: "primitive literal expression widened string number boolean TypeChecker",
        summary:
          "Primitive literal precision pressure should route to checker-primitive-types and the expression primitive literal contract before local helper duplication.",
      },
      {
        query:
          "TypeScript standard library boundary synthetic Array generics overloads checker-backed stdlib",
        summary:
          "Stdlib, generic, and overload questions should route to TypeScript checker authority; only product-owned Aurelia/runtime shapes should become synthetic expression semantics.",
      },
      {
        query:
          "intrinsics generics TypeScript owns Aurelia crossings expression context overlay",
        summary:
          "Natural boundary questions should route to the no-parallel-stdlib decision: TypeScript owns checker-backed stdlib, while semantic-runtime owns Aurelia crossings and product-owned synthetic facts.",
      },
      {
        query:
          "synthetic Array reduce CheckerExpressionArrayMethodProjector standard library boundary",
        summary:
          "Natural synthetic Array method questions should route to the expression semantics boundary before adding product-owned stdlib-like behavior.",
      },
      {
        query:
          "toSorted string relational source-value boundary",
        summary:
          "When an Array method pressure item touches both type and value answers, keep checker-backed stdlib semantics in TypeScript and close only the product-owned deterministic value subset.",
      },
      {
        query:
          "synthetic Array toSorted localeCompare comparator result-independent callback",
        summary:
          "Result-independent callback methods should prove callback-scope construction and Array result shape without reducing arbitrary stdlib calls inside comparator or predicate bodies.",
      },
      {
        query:
          "callback-body-type-independent Array method coverage callback body drives type projection",
        summary:
          "Array method coverage should distinguish callback-scope construction from callback-return-driven whole-call type projection.",
      },
      {
        query:
          "modern array framework observation gap type-visible source-value open collection method coverage",
        summary:
          "Array-method boundary questions should route to the collection-method coverage projection before semantic-runtime expands checker, source-value, or observation tables.",
      },
      {
        query:
          "source-value mutating receiver open array method sort coverage",
        summary:
          "Mutating Array methods such as sort should be understood as source-value policy boundaries before treating them as missing standard-library reducers.",
      },
      {
        query: "expression cache source span projection local key collision",
        summary:
          "Source-span/cache collisions should route to the evaluator projection-key boundary before changing TypeChecker projector reuse.",
      },
      {
        query:
          "Aurelia expression evaluation context scope source runtime mode contextual type",
        summary:
          "Context-envelope questions should route to the TypeChecker expression request context before adding another consumer-local evaluator parameter list.",
      },
      {
        query:
          "nullish optional non-strict call target CheckerExpressionTypeEvaluator call return",
        summary:
          "Optional/non-strict/nullish CallScope, CallMember, and CallFunction policy belongs in the evaluator's callable-call-return lane while signature projection stays in CheckerExpressionCallProjector.",
      },
      {
        query:
          "nullish union value property checker type shape access missing member diagnostic",
        summary:
          "Missing-member diagnostic policy for nullable unions should spend checkerTypeShapeNullishUnionHasValueProperty instead of duplicating TypeChecker union/member walks in API code.",
      },
      {
        query:
          "checker signature parameters overload candidate basis runtime argument arity",
        summary:
          "Shared TypeChecker signature parameter substrate should own overload/arity policy for expression calls and lifecycle handoffs.",
      },
      {
        query:
          "checkerConstructReturnTypeUnion overloaded constructor instanceof construct signature union",
        summary:
          "Non-call-site constructor facts such as instanceof and runtime target projection should use construct return unions, while authored new expressions stay call-site-shaped.",
      },
      {
        query:
          "ListenerBinding handler reference event handler invocation overload runtime event argument",
        summary:
          "Listener handler-reference return typing should route to checker signature parameters plus DOM event-map typing, not first-signature callReturnType metadata.",
      },
      {
        query:
          "matcher.bind custom matcher overload two runtime arguments callReturnType",
        summary:
          "Matcher boolean-return checks should use the two-value framework call shape through shared signature parameters, not checker-backed callReturnType metadata.",
      },
      {
        query:
          "generated-type-expression checker global declaration DOM lib interface overlay",
        summary:
          "Generated TypeScript annotations should route through the type-system generated type-expression helper instead of consumer-local display text.",
      },
      {
        query:
          "connectable strict runtime evaluator mode expression TypeChecker context",
        summary:
          "Framework astEvaluate mode pressure should route through CheckerExpressionTypeEvaluationContext instead of mutable evaluator state or a second evaluator.",
      },
      {
        query:
          "binding behavior lifecycle astBind astEvaluate expression TypeChecker context",
        summary:
          "Questions about whether binding behaviors apply source-scope effects should route through the expression runtime-context axis.",
      },
      {
        query:
          "app-builder readiness expression context rare branch narrowing canary",
        summary:
          "Expression-context readiness for app-builder should be judged by common generated-code paths; rare branch-narrowing forms are coherence canaries, not the default completion target.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.ExpressionEvaluationContext,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "CheckerExpressionTypeEvaluationContext is the TypeChecker expression request envelope for AST, BindingScope, source address, contextual target type, runtime evaluator mode, and binding-behavior lifecycle. Raw construction is private to the context class; exact-scope callers use knownScope(...), rendered runtime bindings use checkerContextForRuntimeBindingSourceExpressionProjection(...), and contract scripts are scanned so the test harness cannot keep the old constructor pathway alive. The old evaluateWithScope parameter path is removed, member-owner/argument/resource/call descent uses the context surface, and semantic-runtime build plus focused overlay/template-controller/i18n contracts verify current consumers compile through it.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.TypeSystemProjectEpoch,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system-project-epoch",
        summary:
          "TypeChecker-backed expression semantics spend checker carriers, Program-remapped source nodes, and synthetic type products published inside the shared TypeSystemProject epoch. Synthetic Array and other product-owned shapes must stay bounded to Aurelia crossings; ordinary stdlib declarations, overloads, and generics stay checker-owned.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.BindingDataFlowSubstrate,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        ownerRouteId: "semantic-runtime.observation.binding-flow",
        summary:
          "CheckerExpressionTypeWorld, CheckerExpressionTypeEvaluator, CheckerTypeShapeAccess, binding-pattern local projection, member-owner projection, and primitive/source-open facts are shared by binding data-flow source typing and writeability. Coverage is partial as a guardrail for new consumers, not an app-builder blocker: common overlay, value-channel, computed/getter, component-object-boundary, and runtime-effect contracts are green, while future binding-flow consumers still need checks for local TypeChecker helper forks and evaluator-local source/write policy.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.CheckerValueAccess,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.type-system-project-epoch",
        summary:
          "Type-system expression semantics is a legitimate owner of checker value access; downstream binding, template, diagnostic, and cursor consumers should route through this substrate or TypeSystemProject helpers instead of direct TypeChecker reads.",
      },
    ],
    anchors: [
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-type-context.ts",
        symbolName: "CheckerExpressionTypeEvaluationContext",
        role: "primary",
        summary:
          "TypeChecker-side request context for one Aurelia expression evaluation, including scope, source, contextual type, cache key, projection key, and runtime mode axes.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/expression-type-context.ts",
        symbolName: "CheckerExpressionTypeEvaluationContext.knownScope",
        role: "supporting",
        summary:
          "Named exact-scope entry point for non-rendered TypeChecker expression requests; rendered runtime bindings should enter through the binding-source projection helper.",
      },
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
          "packages/semantic-runtime/src/type-system/expression-type-evaluator.ts",
        symbolName: "CheckerExpressionTypeEvaluator.evaluateCallableCallReturn",
        role: "supporting",
        summary:
          "Shared optional/non-strict/nullish call-return policy for CallScope, CallMember, and CallFunction before signature projection.",
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
          "packages/semantic-runtime/src/type-system/checker-signature-parameters.ts",
        symbolName: "checkerConstructReturnTypeUnion",
        role: "supporting",
        summary:
          "Shared non-call-site construct-signature return union for instanceof narrowing and runtime target instance projection.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/checker-signature-parameters.ts",
        role: "supporting",
        summary:
          "Shared signature candidate-basis, arity, rest/optional parameter, and parameter-type projection helpers.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/checker-primitive-types.ts",
        symbolName: "checkerPrimitiveLiteralType",
        role: "supporting",
        summary:
          "Shared TypeChecker primitive/literal projection split for expression evaluation and template-controller matching.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/checker-collection-types.ts",
        role: "supporting",
        summary:
          "Shared literal-domain and collection/map shape helpers that keep observation value-channel and data-flow checker facts out of local helper forks.",
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
          "packages/semantic-runtime/src/type-system/checker-type-shape-access.ts",
        symbolName: "CheckerTypeShapeAccess",
        role: "supporting",
        summary:
          "Shared member/index/write access resolver over projected checker type shapes.",
      },
      {
        kind: "source",
        filePath:
          "packages/semantic-runtime/src/type-system/checker-type-shape-access.ts",
        symbolName: "checkerTypeShapeNullishUnionHasValueProperty",
        role: "supporting",
        summary:
          "Shared nullable-union value-member check for diagnostic and cursor policy.",
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
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/semantic-runtime contract:expression-primitive-literals",
        role: "grounding",
        summary:
          "Contract proving primitive literal AST nodes preserve TypeScript literal type display and same-local-key source-span isolation.",
      },
      {
        kind: "script",
        command:
          "pnpm --filter @aurelia-ls/atlas expression:coverage -- --projection=collection-methods --detail",
        role: "pressure",
        summary:
          "Atlas collection-method coverage keeps checker projection, source-value reduction, astEvaluate collection reads, and ProxyObservable wrapping in separate lanes.",
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
      "CheckerExpressionTypeEvaluationContext for the TypeChecker request axes: expression AST, modeled BindingScope, source address, contextual target type, and runtime evaluator mode.",
      "Template-controller scope products when expressions are nested under Aurelia control flow.",
      "Observation/binding value-source consumers that reveal source-slot pressure.",
      "Atlas route and memory canaries when future queries miss this substrate.",
    ],
    cautions: [
      "Do not add a second local TypeChecker expression evaluator for cursor, diagnostics, or binding observation.",
      "Do not reintroduce parameter-list wrappers around expression evaluation; add fields or derivation helpers to CheckerExpressionTypeEvaluationContext when the TypeChecker request genuinely needs a new axis.",
      "Do not force RuntimeBindingSourceValueEvaluator or template overlay projection into this context unless they need the exact same TypeChecker request object; if they do, redesign a broader expression-site primitive first.",
      "Do not implement a parallel TypeScript standard library in synthetic expression semantics; checker-backed stdlib declarations, generics, overloads, and ordinary inference belong to TypeScript.",
      "Lifecycle/control-flow-specific expression reads should layer a speculative context on shared checker/evaluator state.",
      "If the Work Router misses this frontier, fix route ontology or memory anchors before continuing product work.",
    ],
    nextQuestions: [
      "Does the requested expression read need global checker facts, template-control-flow context, or binding-observation runtime mode?",
      "Is the missing fact a TypeChecker evaluation axis, an overlay source-mapping axis, or a runtime/source-value evaluation policy?",
      "Can CheckerExpressionTypeWorld provide the needed evaluator/cache lifetime, or does it need a layered speculative context?",
      "Which source-slot or member-owner product should be reused before adding local TypeChecker walks?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-overlay-integration",
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
      "AuthoredSourceTextCache external template",
      "authored source text boundary",
      "conventional html template source text",
      "imported html template source text",
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
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.AuthoredSourceTextBoundary,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        summary:
          "Resource convergence now reads conventional and imported external HTML template text through AuthoredSourceTextCache before metadata stripping, preserving the template-file source address and avoiding a resource-local raw filesystem reader. A dedicated external-template contract would raise this from semantic coverage to verified coverage.",
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
      "EvaluationBindingState",
      "declaration-instantiation class lexical cells",
      "static class property declaration order",
      "module graph",
      "module graph evaluator",
      "StaticModuleGraphEvaluator",
      "readEvaluationModuleRecord",
      "import type",
      "type-only import",
      "type-only export",
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
      "standard intrinsic boundary",
      "standard library intrinsic boundary",
      "stdlib boundary",
      "parallel TypeScript standard library",
      "deterministic source-value closure",
      "string relational operator source-value",
      "relational operator source-value boundary",
      "Array.toSorted source-value closure",
      "evaluateAureliaResolveCall",
      "aureliaResolveDirectKey",
      "evaluateAureliaResolveDirectClassKey",
      "Aurelia resolve direct class key",
      "ambient resolve ClassKey static evaluator host",
      "evaluator-local resolve ClassKey",
      "resolve(ClassKey) activation-like frame",
      "RuntimeBindingSourceActivationContext evaluateResolveCall",
      "RuntimeBindingSourceActivationContext resolveCallFrame",
      "resolveCallFrame",
      "resolveCallWithoutActiveContainer",
      "evaluationValueForResolvedKey",
      "binding-source DI activation resolve frame",
      "binding-source DI activation context",
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
          "standard intrinsic boundary deterministic source-value closure parallel TypeScript standard library",
        summary:
          "Evaluator intrinsic work should model deterministic value closure for semantic consumers, not duplicate checker-backed stdlib typing or generic inference.",
      },
      {
        query:
          "deterministic array source-value closure evaluator relational operator",
        summary:
          "Array source-value gaps should route to shared evaluator/operator primitives when the missing fact is deterministic value closure.",
      },
      {
        query:
          "StaticEvaluator method breakdown evaluator world construction intrinsics module state",
        summary:
          "Method-breakdown questions about the evaluator should route through evaluator/world construction and product architecture before refactoring.",
      },
      {
        query:
          "static class property local const dependency declaration instantiation class lexical cell",
        summary:
          "Static class field/source-value order bugs should route to declaration-instantiation and class-values before fixture-local source rewrites.",
      },
      {
        query: "synthetic evaluation context",
        summary:
          "Speculative context questions should preserve already-resolved evaluator/module state.",
      },
      {
        query: "type-only import module graph evaluator",
        summary:
          "Type-only import/export admission bugs should route to the evaluator module graph before downstream feature patches.",
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
      {
        query:
          "evaluateAureliaResolveCall ambient resolve ClassKey activation-like frame RuntimeBindingSourceActivationContext",
        summary:
          "Ambient resolve(...) value-closure questions should route through evaluator host direct class-key support first, then binding-source DI activation context for registered/interface keys.",
      },
      {
        query:
          "RuntimeBindingSourceActivationContext resolveCallFrame active container resolver lookup",
        summary:
          "Binding-source DI resolve(...) questions should route to the activation resolve frame before adding evaluator-, router-, or template-local active-container policy.",
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
        filePath: "packages/semantic-runtime/src/configuration/aurelia-evaluation-runtime.ts",
        symbolName: "aureliaStaticEvaluationRuntimeHost",
        role: "primary",
        summary:
          "Aurelia runtime host intrinsics for app admission, including browser ambient boundaries and narrow ambient resolve(ClassKey) closure.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/aurelia-evaluation-runtime.ts",
        symbolName: "evaluateAureliaResolveCall",
        role: "supporting",
        summary:
          "Host-bound direct ambient resolve(...) evaluator path; only activation-like direct class keys close here.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/aurelia-evaluation-runtime.ts",
        symbolName: "aureliaResolveDirectKey",
        role: "supporting",
        summary:
          "Direct-key admission for evaluator-local ambient resolve(...); wrappers and non-direct key shapes remain open.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/configuration/aurelia-evaluation-runtime.ts",
        symbolName: "evaluateAureliaResolveDirectClassKey",
        role: "supporting",
        summary:
          "Evaluator-local class-key instantiation path for direct ambient resolve(ClassKey) when an activation-like `this` frame exists.",
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
        filePath: "packages/semantic-runtime/src/observation/binding-source-activation-context.ts",
        symbolName: "RuntimeBindingSourceActivationContext",
        role: "supporting",
        summary:
          "Binding-source DI activation join for registered/interface keys when a modeled active container is available; do not duplicate this in the generic evaluator host.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-source-activation-context.ts",
        symbolName: "RuntimeBindingSourceActivationContext.resolveCallFrame",
        role: "supporting",
        summary:
          "Activation-scoped resolve(...) frame that separates call/key admission from active-container resolver lookup and open-row wording.",
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
        filePath: "packages/semantic-runtime/src/evaluation/module-graph.ts",
        symbolName: "readEvaluationModuleRecord",
        role: "supporting",
        summary:
          "Runtime-shaped module graph reader owns import/export admission and erases TypeScript type-only edges.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:evaluation-module-graph",
        role: "supporting",
        summary:
          "Focused contract for runtime import/export graph admission, including type-only edge erasure.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:evaluation-class-declaration-order",
        role: "supporting",
        summary:
          "Focused contract for class static field evaluation after prior module const initialization.",
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
          "World construction and app-building patterns should expose package/typecheck tooling source roles.",
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
      "ECMAScript declaration-instantiation order: class lexical cells are declared early, but static class properties evaluate when the class declaration executes.",
      "Atlas performance/profile lenses when evaluator growth obscures navigation.",
    ],
    cautions: [
      "A surface gap in authoring or templates should often pivot down into evaluator capability instead of being smoked through.",
      "Avoid parallel one-off evaluation contexts that forget module variables or already-resolved environment state.",
      "Do not grow evaluator intrinsics into a full TypeScript standard-library clone; use TypeScript for checker-backed stdlib surfaces and keep evaluator additions tied to concrete source-value consumers.",
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
    aliases: [
      "route-instruction-materialization-project-pass",
      "frontier:route-instruction-materialization-project-pass",
      "route-instruction-materialization",
      "router.open-instruction",
    ],
    title: "Router Viewport Authoring Semantics",
    summary:
      "Route router, au-viewport, RouteContext, route tree, route-recognizer, and routeable-component work through framework-grounded modeling before MCP or fixture generation.",
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
      "routerSourceExpressionEvaluationFrame",
      "evaluateRouterSourceExpression",
      "router source expression evaluation frame",
      "router source-value evaluation frame",
      "router route instruction source",
      "route-instruction-source",
      "routerLoadAttributeSourceText",
      "routerHrefAttributeSourceText",
      "route-configuration-source",
      "routerRouteDecoratorSourceText",
      "generated route config decorator source",
      "viewport instruction",
      "load custom attribute",
      "LoadCustomAttribute.active",
      "load.active",
      "load active",
      "load active bind",
      "load.active.bind",
      "load params.bind",
      "load context.bind",
      "load route params",
      "inline load params",
      "router-backed generated fixture load params",
      "generated inline load params fixture",
      "route id parameter value",
      "load attribute segment",
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
        query: "router load params.bind context.bind active.bind source lowering",
        summary:
          "Router load source generation should route through route-instruction-source and inline multi-binding semantics, not app-builder-local string formatting.",
      },
      {
        query: "routerSourceExpressionEvaluationFrame evaluateRouterSourceExpression RuntimeBindingSourceValueEvaluationContext",
        summary:
          "Router-resource source-value reads should route to the router instruction materialization bridge plus shared binding-source value context projection, not router-local expression evaluation.",
      },
      {
        query:
          "router backed generated fixture load params route id parameter value",
        summary:
          "Generated routed fixture canaries for inline load route+params should route through LoadCustomAttribute semantics and route-instruction materialization.",
      },
      {
        query:
          "generated @route config source route decorator object literal routerRouteDecoratorSourceText",
        summary:
          "Generated route config source should route through the router-owned decorator serializer rather than app-builder-local object literal formatting.",
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
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.SourceValueEvaluationContext,
        state: AtlasWorkRouteCoverageState.Partial,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.binding-source-value-evaluation",
        summary:
          "Dynamic router-resource values consume RuntimeBindingSourceValueEvaluationContext through RouteInstructionMaterializationProjectPass and projectRuntimeBindingSourceValueContextInScope(...), including active-container DI closure for route instruction sites. Router-dynamic-pattern and active-link contracts verify the current consumer path, while broader router lifecycle and viewport state remain owned by router/viewport semantics.",
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
        filePath: "packages/semantic-runtime/src/router/route-instruction-materialization.ts",
        symbolName: "routerSourceExpressionEvaluationFrame",
        role: "supporting",
        summary:
          "Router-resource bridge from rendered instruction/source scope through shared binding-source value context projection into a source-value context or explicit open row.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-instruction-source.ts",
        symbolName: "routerLoadAttributeSourceText",
        role: "supporting",
        summary:
          "Product-free source serializer for router load/href custom-attribute forms.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/router/route-configuration-source.ts",
        symbolName: "routerRouteDecoratorSourceText",
        role: "supporting",
        summary:
          "Router-owned source serializer for generated @route object literals and route config entries.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
        symbolName: "appBuilderRoutedCollectionDetailSourcePlan",
        role: "supporting",
        summary:
          "Current app-builder consumer proving route-param ID lookup, nested au-viewport ownership, and generated routeable components.",
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
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-pattern-routed-app-shell",
        role: "pressure",
        summary:
          "Migrated route-shell app-pattern fixture that consumes router semantics without a form, catalog, or table domain model.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-pattern-routed-state-backed-form",
        role: "pressure",
        summary:
          "Migrated routed-form app-pattern fixture that consumes router semantics.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront",
        role: "pressure",
        summary:
          "Migrated routed catalog fixture that proves common list/detail route config, static navigation, route params, viewport, route-node, and component-agent effects.",
      },
      {
        kind: "path",
        pathPrefix: "packages/semantic-runtime/fixtures/pressure/app-pattern-routed-searchable-data-table",
        role: "pressure",
        summary:
          "Migrated routed data-table fixture that proves common list/detail route config, data-driven row links, route params, viewport, route-node, and component-agent effects.",
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
        filePath: "packages/semantic-runtime/src/fixture-verification/route-expected-effects.ts",
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
        appPatternKey: "router-shell-surface",
        role: "grounding",
        summary:
          "Generic route-shell app-pattern pressure should prove route expected effects through the shared router effect contract before generated app sections reuse it.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        appPatternKey: "router-form-state-surface",
        role: "grounding",
        summary:
          "Router authoring should connect fixture seeds to the route expected-effect contract instead of only browsing examples.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        appPatternKey: "router-commerce-solution-space",
        role: "grounding",
        summary:
          "Routed commerce solution-space pressure should prove route expected effects through the shared router effect contract.",
      },
      {
        kind: "framework-corpus",
        projection: "expected-effects",
        effectKind: "route",
        appPatternKey: "router-table-collection-operations",
        role: "grounding",
        summary:
          "Routed table/collection operation pressure should prove route expected effects through the shared router effect contract.",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "CustomExpression",
      "custom expression",
      "opaque custom expression",
      "custom-expression overlay",
      "t custom expression",
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
      "translation binding behavior lifecycle",
      "t.bind evaluate only",
      "t-params astBind",
      "i18n cursor completion lifecycle",
      "i18n state binding behavior",
      "imported JSON translation key source span",
      "AuthoredSourceTextCache i18n JSON",
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
      {
        query: "CustomExpression custom expression i18n translation binding overlay",
        summary:
          "CustomExpression pressure should route to i18n translation binding/key evaluation before generic overlay syntax skips.",
      },
      {
        query: "t.bind evaluate only t-params astBind state binding behavior",
        summary:
          "i18n key and parameter expressions have different binding-behavior lifecycles and should not be collapsed into a generic binding-source rule.",
      },
      {
        query: "i18n cursor completion t.bind evaluate only t-params source scope",
        summary:
          "i18n cursor/member-owner questions should prove t.bind stays evaluate-only while t-params spends bind-time source-scope projection.",
      },
    ],
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.AuthoredSourceTextBoundary,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Semantic,
        summary:
          "Imported JSON translation-key products now map generated asset-module nodes back through AuthoredSourceTextCache, so key source addresses point at authored JSON property spans rather than generated wrapper text. This remains semantic coverage until a focused i18n catalog/source-span contract pins the behavior.",
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
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime contract:i18n-binding-lifecycle",
        role: "supporting",
        summary:
          "Contract proving i18n dynamic keys are evaluate-only while t-params spends bind-time source-scope projection across diagnostics, data-flow, and cursor completion.",
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
      "Do not classify CustomExpression as generic unsupported syntax until the i18n translation binding path has been inspected.",
    ],
    nextQuestions: [
      "Is the pressure catalog completion, rendered key binding, parameter binding, or lifecycle diagnostic publication?",
      "Which rendered binding products prove the same target element join?",
      "Which exact i18n framework error code owns the diagnostic?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-overlay-integration",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.template-recursive-rendering",
      "semantic-runtime.observation.binding-flow",
    ],
  },
  {
    id: "semantic-runtime.state.store-configuration",
    aliases: [
      "state-store-configuration",
      "frontier:state-store-configuration",
      "state-store",
      "state-store-list",
      "@aurelia/state-store",
    ],
    title: "State Store Configuration",
    summary:
      "Route @aurelia/state store configuration, state binding syntax, store lookup issues, and exact raw framework Error authority through the state plugin substrate.",
    domains: ["semantic-runtime", "state", "configuration", "diagnostics", "binding", "authoring"],
    roles: ["orient", "analyze", "verify", "author"],
    terms: [
      "@aurelia/state",
      "StateDefaultConfiguration",
      "StateStores",
      "StateGetterBindings",
      "StateIssues",
      "state store",
      "state store configuration",
      "withStore",
      "IStore",
      "IStoreRegistry",
      "fromState",
      "FromStateDecoratorBindingSite",
      "StateGetterBinding",
      "fromState selector expression",
      "fromStateDecoratorSourceText",
      "state-store-list",
      "store item source parameter",
      "store collection source parameter",
      "store-item",
      "store-collection",
      "store-domain-model",
      "state binding command",
      "dispatch binding command",
      ".state",
      ".dispatch",
      "value.state",
      "input.dispatch",
      "state-dispatch",
      "state-dispatch-action",
      "state dispatch payload",
      "state action payload",
      "state action literal",
      "dispatch payload value channel",
      "$event.target.value",
      "state binding behavior",
      "initial-state source value",
      "state initial source value",
      "state initial source value bound controller",
      "StateBinding scope slot initial state value",
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
      {
        query: "fromState selector StateGetterBinding valid decorator field setter source site",
        summary:
          "Positive @fromState flow should route through FromStateDecoratorBindingSite and StateGetterBindingMaterializationProjectPass before adding diagnostics or app-builder source policy.",
      },
      {
        query: "state-getter-bindings @fromState selector target type projection",
        summary:
          "Public @fromState StateGetterBinding rows should route to the state product projection rather than generic TypeScript decorator inspection.",
      },
      {
        query: "state dispatch payload action literal target value value-channel",
        summary:
          "State dispatch payload typing should route through state command value-channel flow before generic template repair policy.",
      },
      {
        query: "IStoreRegistry withStore StateBinding scope slot initial state value",
        summary:
          "State initial-value source reads should route to the state store product and observation source-value evaluator together.",
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
        filePath: "packages/semantic-runtime/src/state/from-state-decorator-recognition.ts",
        symbolName: "FromStateDecoratorBindingSite",
        role: "primary",
        summary:
          "Valid @fromState field/setter decorator source site with store-name classification, selector source, and target member spans.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/state/state-getter-binding-materialization.ts",
        symbolName: "StateGetterBindingMaterializationProjectPass",
        role: "primary",
        summary:
          "Materializes StateGetterBinding products from @fromState source sites with store resolution and selector/target type projection.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/api/state-projections.ts",
        symbolName: "readStateGetterBindingRows",
        role: "supporting",
        summary:
          "Projects state-getter-bindings API rows for @fromState-created StateGetterBinding products.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/state/from-state-decorator-source.ts",
        symbolName: "fromStateDecoratorSourceText",
        role: "supporting",
        summary:
          "State-owned source serializer for app-builder framework API source fragments.",
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
          "Public StateStores/StateIssues API projections consumed by diagnostics and future app-builder orientation.",
      },
      {
        kind: "source",
        filePath: "packages/semantic-runtime/src/observation/binding-value-channel-draft-support.ts",
        symbolName: "RuntimeBindingValueChannelDraftSupport",
        role: "supporting",
        summary:
          "Shared value-channel support that lets state-dispatch payloads reuse listener event target typing.",
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
          "State docs/tests provide promoted store configuration and state binding examples before app-builder generation.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/semantic-runtime check:fixture-manifests",
        role: "supporting",
        summary:
          "Fixture manifest verification includes the generated @aurelia/state starter and its .state/.dispatch expected effects.",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "semantic-runtime-product assignment strictness",
      "compiler-like assignment strictness",
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
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.AuthoredSourceTextBoundary,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        summary:
          "Template diagnostics and cursor diagnostics share the authored source text/cache path used for template source slicing, while template-diagnostics contracts prove weak-owner and missing-member rows preserve concrete source routes and action targets. Future repair planning should spend those source routes rather than opening another diagnostic-local text reader.",
      },
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "Template diagnostics carry fixture-verified public continuation rows for app diagnostics, summaries, resources, and binding flow. Weak-owner repair-pressure diagnostics now prove exact action-target source preservation and exact-source continuation evidence without advertising direct repair intent before the authoring/edit surfaces are rebuilt.",
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
        kind: "source",
        filePath: "packages/semantic-runtime/src/diagnostic-action/action.ts",
        symbolName: "diagnosticActionKindForDiagnosticSuggestion",
        role: "supporting",
        summary:
          "Maps diagnostic suggestions and open seams into neutral action categories before authoring or IDE/edit planning consumes them.",
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
      "Which query locus needs the diagnostic: cursor, file, app, diagnostics-to-action, or future edit plan?",
    ],
    relatedRouteIds: [
      "semantic-runtime.template-overlay-integration",
      "semantic-runtime.type-system.expression-semantics",
      "semantic-runtime.observation.binding-flow",
      "semantic-runtime.binding-scope",
      "semantic-runtime.inquiry-query-claim-graph",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.app-builder-pattern-ontology",
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
    coverage: [
      {
        dimension: AtlasWorkRouteCoverageDimension.IntentAwareContinuations,
        state: AtlasWorkRouteCoverageState.Covered,
        depth: AtlasWorkRouteCoverageDepth.Verified,
        ownerRouteId: "semantic-runtime.intent-aware-continuations",
        summary:
          "App/framework diagnostic answers now carry fixture-verified typed continuations to detailed, TypeScript, template, and related issue-product lanes. Repair intent is limited to source-backed related diagnostic rows with blocker evidence, and fixture-scanned family witnesses cover TypeScript, configuration, DI, observation, evaluation, resource, template, router, route-recognizer, validation, fetch-client, and dialog issue lanes. Additional framework-code families still need incremental witnesses as new packages are modeled.",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
      "semantic-runtime.app-telemetry",
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
      "route coverage",
      "coverage discovery",
      "coverage dimension",
      "cross cutting coverage",
      "coverage state",
      "missing coverage",
      "partial coverage",
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
      {
        query:
          "coverage discovery primitive not threaded through all semantic-runtime routes",
        summary:
          "Cross-cutting substrate completeness gaps should route through Work Router coverage before future agents rediscover them as isolated feature TODOs.",
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
      "When a primitive is asymmetric across semantic-runtime routes, prefer adding a named coverage dimension over leaving scattered TODOs that only surface by memory or grep.",
    ],
    nextQuestions: [
      "Which route matched weakly, and what structural anchor would have made it exact?",
      "Should this fact live in memory, route catalog, markdown, or source comments?",
      "Did a pressure lens encourage a cosmetic refactor rather than a real model improvement?",
      "Is this a local feature gap, or a cross-cutting primitive that needs a route coverage dimension and state rows?",
    ],
    relatedRouteIds: [
      "semantic-runtime.evaluator.world-construction",
      "diagnostics.framework-error-grounding",
      "semantic-runtime.app-builder-pattern-ontology",
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
      "semantic-runtime enum usage",
      "enum member usage",
      "enum primitive coverage",
      "unused enum member",
      "unspent enum member",
      "enum coupling",
      "enum couplings",
      "control-flow enum usage",
      "switch-case enum usage",
      "InquiryContinuationIntent.Author",
      "intent document grounding",
      "enum purpose grounding",
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
        query: "InquiryContinuationIntent.Author enum member usage",
        summary:
          "Semantic-runtime inquiry primitives should be audited through package-facing enum usage, not atlas.self-only rows or grep.",
      },
      {
        query: "enum usage intent document grounding",
        summary:
          "Enum usage counts should be interpreted through owning docs, Atlas memory, and Work Router intent rather than treated as self-defining purpose.",
      },
      {
        query: "unused enum member primitive coverage",
        summary:
          "Designed-but-unspent enum primitives should route to the package-facing enum usage lane.",
      },
      {
        query: "enum coupling control-flow usage",
        summary:
          "Enum member spend should include control-flow carriers and enum-to-enum coupling, not just flat reference counts.",
      },
      {
        query: "enum protocol type surface cooccurrence",
        summary:
          "Enum coupling should reveal protocol-shaped type surfaces where multiple enums intentionally form one DTO or helper signature.",
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
        filePath: "packages/atlas/src/scripts/enum-usage.ts",
        role: "primary",
        summary:
          "Package-facing enum usage CLI exposes the source index for semantic-runtime, MCP, and external package primitive audits.",
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
        command: "pnpm --filter @aurelia-ls/atlas enum:usage -- --packageId=semantic-runtime --projection=summary --enumName=InquiryContinuationIntent --memberName=Author --detail",
        role: "primary",
        summary:
          "Canary query for whether an inquiry continuation intent member is declared, referenced, or actually spent.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas enum:usage -- --packageId=semantic-runtime --projection=enum-couplings --detail",
        role: "primary",
        summary:
          "Enum coupling query for translation, branch co-occurrence, declared type-surface, and checker-backed shared value-space relations.",
      },
      {
        kind: "script",
        command: "pnpm --filter @aurelia-ls/atlas enum:usage -- --packageId=semantic-runtime --projection=enum-couplings --relation=type-surface-cooccurrence --query=SemanticRuntimeContinuationRow --detail",
        role: "primary",
        summary:
          "Canary query for continuation-related enum protocols carried by public DTO type surfaces.",
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
        filePath: "packages/semantic-runtime/src/fixture-verification/expected-effect.ts",
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
      "semantic-runtime.app-builder-pattern-ontology",
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
