import {
  COMPILER_CORPUS_FRAMEWORK_REVISION,
  type CompilerAuthorityReference,
  type CompilerObligationId,
} from "./compiler-case.js";
import type {
  CompilerObligationAuditDisposition,
  CompilerObligationCatalogEntry,
  CompilerObligationFamily,
} from "./compiler-obligation-audit.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const templateFactorySource = "packages/template-compiler/src/template-element-factory.ts";
const compilerInterfacesSource = "packages/template-compiler/src/interfaces-template-compiler.ts";
const instructionSource = "packages/template-compiler/src/instructions.ts";
const compilerErrorsSource = "packages/template-compiler/src/errors.ts";
const bindingCommandSource = "packages/template-compiler/src/binding-command.ts";
const attributePatternSource = "packages/template-compiler/src/attribute-pattern.ts";
const renderingSource = "packages/runtime-html/src/templating/rendering.ts";
const rendererSource = "packages/runtime-html/src/renderer.ts";
const spreadBindingSource = "packages/runtime-html/src/binding/spread-binding.ts";
const auComposeSource = "packages/runtime-html/src/resources/custom-elements/au-compose.ts";
const auSlotSource = "packages/runtime-html/src/resources/custom-elements/au-slot.ts";
const repeatSource = "packages/runtime-html/src/resources/template-controllers/repeat.ts";

const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const auSlotSuite = "packages/__tests__/src/3-runtime-html/template-compiler.au-slot.spec.ts";
const conventionSuite = "packages/__tests__/src/3-runtime-html/template-compiler.convention.spec.ts";
const hooksSuite = "packages/__tests__/src/3-runtime-html/template-compiler.hooks.spec.ts";
const localElementsSuite = "packages/__tests__/src/3-runtime-html/template-compiler.local-templates.spec.ts";
const primaryBindableSuite = "packages/__tests__/src/3-runtime-html/template-compiler.primary-bindable.spec.ts";
const refSuite = "packages/__tests__/src/3-runtime-html/template-compiler.ref.spec.ts";
const surrogateSuite = "packages/__tests__/src/3-runtime-html/template-compiler.ce_and_surrogate.spec.ts";
const testAppsSuite = "packages/__tests__/src/3-runtime-html/template-compiler.test-apps.spec.ts";
const processContentSuite = "packages/__tests__/src/3-runtime-html/process-content.spec.ts";
const spreadSuite = "packages/__tests__/src/3-runtime-html/spread.spec.ts";
const letSuite = "packages/__tests__/src/3-runtime-html/custom-elements.let.spec.ts";
const classCommandSuite = "packages/__tests__/src/3-runtime-html/binding-command.class.spec.ts";
const bindingCommandsSuite = "packages/__tests__/src/3-runtime-html/binding-commands.spec.ts";
const checkedObserverSuite = "packages/__tests__/src/3-runtime-html/checked-observer.spec.ts";
const selectObserverSuite = "packages/__tests__/src/3-runtime-html/select-value-observer.spec.ts";
const generatedCompilerSource = "scripts/generate-tests/template-compiler.static.ts";
const generatedStaticSuite = "packages/__tests__/src/3-runtime-html/generated/static.spec.ts";
const generatedIfElseSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.spec.ts";
const generatedIfElseDoubleSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.double.spec.ts";
const generatedRepeatSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.repeat.spec.ts";
const generatedRepeatDoubleSuite = "packages/__tests__/src/3-runtime-html/generated/static.if-else.repeat.double.spec.ts";

const exactUnqueried = disposition(
  "reviewed",
  "exact-product",
  "unqueried",
  "statically-modeled",
  "required",
  "not-claimed",
  "A source-reviewed JIT product exists, but no semantic-runtime comparison has been admitted yet.",
  ["cross-lane-unqueried"],
);

const focusedUnqueried = disposition(
  "reviewed",
  "focused-field",
  "unqueried",
  "statically-modeled",
  "required",
  "not-claimed",
  "Focused framework fields are witnessed; the complete cross-lane product is not.",
  ["oracle-quality", "cross-lane-unqueried"],
);

const runtimeUnqueried = disposition(
  "reviewed",
  "runtime-effect",
  "unqueried",
  "statically-modeled",
  "required",
  "not-claimed",
  "Runtime behavior witnesses the consequence, not the exact compiler product.",
  ["oracle-quality", "cross-lane-unqueried"],
);

const sourceOnly = disposition(
  "reviewed",
  "absent",
  "unqueried",
  "statically-modeled",
  "required",
  "not-claimed",
  "The framework source names the obligation, but the reviewed corpus has no focused oracle.",
  ["oracle-quality", "cross-lane-unqueried"],
);

const throwsOnly = disposition(
  "reviewed",
  "throws-only",
  "unqueried",
  "statically-modeled",
  "required",
  "not-claimed",
  "The existing test proves rejection without proving the exact diagnostic contract.",
  ["oracle-quality", "cross-lane-unqueried"],
);

const openBuildEffect = disposition(
  "reviewed",
  "runtime-effect",
  "explicit-seam",
  "build-execution",
  "maintainer-decision",
  "open",
  "Arbitrary user or framework extension code must be executed, refused, or retained explicitly.",
  ["effect-closure", "policy"],
);

const missingBrowserSubstrate = disposition(
  "reviewed",
  "runtime-effect",
  "missing-substrate",
  "unknown",
  "required",
  "open",
  "Browser-effective structure and authored/compiler lineage are not shared semantic-runtime products yet.",
  ["browser-lineage", "projection-shape"],
);

const projectionGap = disposition(
  "reviewed",
  "exact-product",
  "projection-gap",
  "statically-modeled",
  "required",
  "open",
  "The semantic inputs are owned, but the exact transformed-tree or wire projection is not closed.",
  ["projection-shape"],
);

const runtimeRetained = disposition(
  "reviewed",
  "runtime-effect",
  "explicit-seam",
  "runtime-retained",
  "profile-dependent",
  "open",
  "The current runtime calls compiler services after startup; compiler-free closure is profile-dependent.",
  ["runtime-retention", "policy"],
);

const frameworkConflict = disposition(
  "conflict",
  "contradictory",
  "unqueried",
  "unknown",
  "maintainer-decision",
  "open",
  "Framework authorities disagree and must not be normalized into an apparent match.",
  ["framework-contract", "policy"],
);

const frameworkAmbiguous = disposition(
  "ambiguous",
  "absent",
  "unqueried",
  "unknown",
  "maintainer-decision",
  "open",
  "A named framework contract has no matching producer or focused behavior authority in the reviewed corridor.",
  ["framework-contract", "oracle-quality", "policy"],
);

const staleGenerated = disposition(
  "stale",
  "generated-interaction",
  "unqueried",
  "unknown",
  "required",
  "not-claimed",
  "The checked-in runtime cases are useful, but their nominal generator no longer reproduces them.",
  ["oracle-quality", "cross-lane-unqueried"],
);

const profileDependent = disposition(
  "reviewed",
  "runtime-effect",
  "explicit-seam",
  "runtime-retained",
  "profile-dependent",
  "open",
  "Dynamic runtime compilation remains an admitted capability unless a stricter product profile refuses it.",
  ["runtime-retention", "policy"],
);

const entryAuthorities = [
  implementation(templateCompilerSource, 112, 168, "TemplateCompiler.compile", "Compilation entry, bypass, options, and compiled-definition assembly."),
  behavior(directCompilerSuite, 82, 138, "Compile entry, hooks, slot detection, and inert template behavior."),
  runtime(renderingSource, 92, 109, "Rendering resolves the compiler and caches the compiled definition."),
];

const browserTreeAuthorities = [
  implementation(templateFactorySource, 18, 97, "TemplateElementFactory.createTemplate", "The JIT materializes strings through a platform HTMLTemplateElement and applies root-wrapper rules."),
  behavior(auSlotSuite, 210, 250, "Projection cases include browser-normalized open and malformed markup."),
  runtime(renderingSource, 116, 166, "Rendering clones or adopts the compiled effective template tree."),
];

const extensionAuthorities = [
  implementation(templateCompilerSource, 126, 134, "TemplateCompiler.compile", "Compiler hooks run before local-element extraction and node compilation."),
  implementation(templateCompilerSource, 498, 505, "TemplateCompiler._compileElement", "processContent receives the live element, platform, and instruction metadata record."),
  implementation(bindingCommandSource, 43, 67, "BindingCommandInstance.build", "Custom commands receive compiler-owned node, syntax, resource, parser, and mapper inputs."),
  implementation(attributePatternSource, 224, 260, "AttributeParser.parse", "Custom attribute-pattern handlers produce AttrSyntax consumed by classification."),
  behavior(hooksSuite, 19, 412, "Hook scope, order, invocation count, and DOM mutation are exercised."),
  behavior(processContentSuite, 269, 562, "processContent mutations, return values, enhance, bindings, and projections are exercised."),
  runtime(rendererSource, 935, 962, "The complete instruction remains injectable to runtime resources."),
];

const nodeAuthorities = [
  implementation(templateCompilerSource, 369, 470, "TemplateCompiler._compileNode", "Node dispatch and let-element target creation."),
  implementation(templateCompilerSource, 983, 1016, "TemplateCompiler._compileText", "Text interpolation expands into marker/text pairs and one row per expression."),
  implementation(templateCompilerSource, 1276, 1306, "TemplateCompiler._markAsTarget", "Element and render-location marker mutations."),
  behavior(directCompilerSuite, 536, 810, "Containerless, text stress, and deeply nested target topology."),
  runtime(renderingSource, 173, 233, "Runtime rows address targets by document order and exact cardinality."),
];

const elementAuthorities = [
  implementation(templateCompilerSource, 474, 681, "TemplateCompiler._compileElement", "Element lookup, metadata, hydration, content gates, projections, and controller wrapping."),
  behavior(directCompilerSuite, 106, 461, "Slots, surrogates, custom elements, as-element, and template controllers."),
  runtime(rendererSource, 182, 253, "HydrateElementInstruction creates the child container, component, bindings, projections, and location."),
];

export const COMPILER_OBLIGATION_CATALOG: readonly CompilerObligationCatalogEntry[] = [
  ...group("entry", entryAuthorities, exactUnqueried, [
    ["compiler.entry.bypass", "Null templates and definitions with needsCompile=false pass through without hooks or traversal."],
    ["compiler.entry.context", "Compilation uses one rooted container/resource context with shared child contexts."],
    ["compiler.entry.materialization", "String and node templates materialize with the framework wrapper and clone rules."],
    ["compiler.entry.enhance", "Enhance compilation consumes the admitted live node instead of rematerializing markup."],
    ["compiler.entry.debug", "Debug mode preserves authored compiler attributes while producing the same semantic instructions."],
    ["compiler.entry.resource-representation", "resolveResources selects definition-valued or name-valued resource fields intentionally."],
    ["compiler.entry.dom-authority", "Compilation rejects worlds without a usable DOM platform."],
  ]),
  ...group("browser-tree", browserTreeAuthorities, missingBrowserSubstrate, [
    ["compiler.browser-tree.fragment-context", "HTML is parsed in the same template-fragment context as the browser JIT."],
    ["compiler.browser-tree.root-wrapper", "A sole meaningful root template is unwrapped while other roots remain wrapped."],
    ["compiler.browser-tree.recovery", "Browser repair, implied nodes, namespaces, attributes, and text normalization are conserved."],
    ["compiler.browser-tree.authored-lineage", "Every browser-effective node retains honest authored provenance or an implied-node cause."],
    ["compiler.browser-tree.compiler-lineage", "Compiler moves, removals, wrappers, and markers retain browser and authored ancestry."],
  ]),
  ...group("extension", extensionAuthorities, openBuildEffect, [
    ["compiler.extension.hooks", "All admitted TemplateCompilerHooks run with framework resource scope and order."],
    ["compiler.extension.process-content", "processContent DOM mutations, return value, this binding, and metadata effects are conserved."],
    ["compiler.extension.attribute-pattern", "Custom pattern bodies and their complete AttrSyntax products are conserved."],
    ["compiler.extension.binding-command", "Custom command bodies and arbitrary instruction products are conserved."],
    ["compiler.extension.plugin-instruction", "Official and third-party instruction tags remain extensible without core-only normalization."],
  ]),
  ...group("node", nodeAuthorities, projectionGap, [
    ["compiler.node.dispatch", "Elements, text, fragments, and ignored node kinds follow JIT dispatch semantics."],
    ["compiler.node.fragment-walk", "Depth-first fragment traversal remains stable across compiler DOM mutation."],
    ["compiler.node.inert-template", "A template without compiler semantics remains inert and its content is not traversed."],
    ["compiler.node.target-marker", "Every hydrated element target receives the correct marker topology."],
    ["compiler.node.render-location", "Containerless and controller targets receive marker/start/end render locations."],
    ["compiler.node.text-expansion", "Each text interpolation hole receives its own marker, placeholder, expression, and row."],
    ["compiler.node.row-target-alignment", "Instruction rows and effective hydration targets have exact order and cardinality."],
    ["compiler.tree.marker.element-target", "A dynamically compiled element is preceded by its hydration marker."],
    ["compiler.tree.marker.text-target", "A text-binding row addresses the marker's placeholder text target."],
    ["compiler.tree.no-target.static-only", "Static-only markup creates no hydration target or instruction row."],
    ["compiler.text.interpolation-expansion", "Text interpolation expands per expression rather than remaining one aggregate row."],
  ]),
  ...group("element", elementAuthorities, exactUnqueried, [
    ["compiler.element.identity", "Element identity uses the browser node name unless compiler control syntax overrides it."],
    ["compiler.element.as-element", "as-element resolves custom-element semantics without changing the physical tag."],
    ["compiler.element.resource-lookup", "Custom-element lookup spends the active compiler resource world."],
    ["compiler.element.shadow-slot", "Native slot use updates hasSlots and is rejected outside a shadow-DOM definition."],
    ["compiler.element.hydration", "Custom elements emit a complete HydrateElementInstruction."],
    ["compiler.element.containerless", "Definition and usage containerless flags produce the same render-location decision."],
    ["compiler.element.content-gate", "Containerless and processContent=false suppress only the exact JIT child/projection work."],
    ["compiler.element.metadata", "processContent metadata remains attached to the element instruction for runtime consumers."],
  ]),
  attributeObligation("compiler.attribute.special-control", 760, 765, "as-element and containerless are compiler control attributes with no ordinary DOM-facing lowering.", exactUnqueried),
  attributeObligation("compiler.attribute.syntax", 768, 768, "Every raw attribute is parsed into the exact AttrSyntax consumed by later branches.", focusedUnqueried),
  attributeObligation("compiler.attribute.command-resolution", 769, 769, "A parsed command name resolves against the active compiler resource world.", focusedUnqueried),
  attributeObligation("compiler.attribute.capture", 773, 795, "Capture filters and exclusions run before ordinary bindable and custom-attribute lowering.", exactUnqueried),
  attributeObligation("compiler.attribute.spread-transfer", 798, 801, "...$attrs emits a transfer instruction at the captured attribute's stable position.", runtimeRetained),
  attributeObligation("compiler.attribute.command-override", 804, 812, "ignoreAttr commands own the complete plain-attribute instruction before resource lookup.", exactUnqueried),
  attributeObligation("compiler.attribute.spread-bindables", 815, 835, "Reserved and shorthand spread syntax lowers only on an eligible custom element.", focusedUnqueried),
  attributeObligation("compiler.attribute.element-bindable", 837, 869, "A custom-element bindable has precedence over a same-named custom attribute.", exactUnqueried),
  attributeObligation("compiler.attribute.element-bindables-command", 871, 897, "$bindables command output is retained and validated as an element-bindable instruction.", focusedUnqueried),
  attributeObligation("compiler.attribute.reserved-bindables", 900, 903, "$bindables on a non-custom element is rejected with the framework diagnostic.", sourceOnly),
  attributeObligation("compiler.attribute.resource-lookup", 905, 906, "Custom-attribute and template-controller lookup uses the classified real target.", focusedUnqueried),
  attributeObligation("compiler.attribute.custom-bindables", 907, 911, "Matched custom resources receive their complete primary or multi-bindable instruction set.", exactUnqueried),
  attributeObligation("compiler.attribute.template-controller", 918, 925, "Template-controller attributes emit a hydration instruction whose definition is filled during wrapping.", exactUnqueried),
  attributeObligation("compiler.attribute.custom-attribute", 927, 933, "Ordinary custom attributes emit resource, alias, and bindable fields.", exactUnqueried),
  attributeObligation("compiler.attribute.plain-interpolation", 937, 946, "Plain interpolation maps the DOM target and preserves the parsed interpolation value.", exactUnqueried),
  attributeObligation("compiler.attribute.surrogate-static", 947, 960, "Static surrogate class, style, and attributes become host-transfer instructions.", exactUnqueried),
  attributeObligation("compiler.attribute.plain-binding-command", 964, 970, "Ordinary binding commands build complete plain DOM instructions.", exactUnqueried),
  ...group("attribute", [
    implementation(templateCompilerSource, 754, 979, "TemplateCompiler._classifyAttributes", "Ordered attribute classifier and DOM mutation policy."),
    behavior(directCompilerSuite, 227, 358, "Element bindable precedence, mapping, modes, and command override."),
    behavior(directCompilerSuite, 1642, 1953, "Custom elements, capture, spread shorthand, and custom patterns."),
    runtime(rendererSource, 242, 251, "Instruction order is the runtime renderer order for element props."),
  ], exactUnqueried, [
    ["compiler.attribute.precedence", "The classifier's branch priority is conserved when multiple semantic interpretations are available."],
    ["compiler.attribute.stable-order", "Instructions retain authored relative order except for explicit framework reorder rules."],
    ["compiler.attribute.dom-removal", "Consumed compiler attributes are removed from the effective template in non-debug compilation."],
    ["compiler.attribute.debug-preservation", "Debug compilation preserves authored attributes without changing semantic classification."],
    ["compiler.attribute.plain-static", "A static ordinary attribute remains in the effective template and emits no row."],
  ]),
  ...group("command", [
    implementation(bindingCommandSource, 212, 516, "BindingCommandInstance.build", "Built-in command implementations and complete instruction fields."),
    behavior(directCompilerSuite, 307, 358, "Explicit binding modes and ignoreAttr command precedence."),
    behavior(conventionSuite, 24, 108, "Native two-way defaults and attribute-to-property mappings."),
    behavior(refSuite, 31, 423, "Ref targets, nested paths, controller interactions, and invalid targets."),
    runtime(rendererSource, 452, 853, "Runtime binding renderers consume command-produced instruction fields."),
  ], focusedUnqueried, [
    ["compiler.command.property-modes", "one-time, to-view, from-view, two-way, and bind emit their exact modes."],
    ["compiler.command.default-mode", "bind selects a bindable mode or native target default without losing explicit modes."],
    ["compiler.command.empty-expression", "Empty command values derive the framework shorthand expression from the target."],
    ["compiler.command.iterator", "for parses an iterator expression and preserves its declaration and iterable."],
    ["compiler.command.iterator-options", "Iterator key/contextual options retain target, command, value, and order."],
    ["compiler.command.listener", "trigger and capture preserve event target, expression, and capture flag."],
    ["compiler.command.listener-modifier", "Event-pattern modifiers survive into the listener instruction."],
    ["compiler.command.attribute", "attr binds the authored attribute name rather than a mapped property."],
    ["compiler.command.class", "class supports one or multiple comma-separated class targets and its exact rejection boundary."],
    ["compiler.command.style", "style binds a named style key through the attribute-binding wire."],
    ["compiler.command.ref", "ref preserves the parsed assignment expression and runtime reference target."],
    ["compiler.command.spread-value", "spread-value retains its source and $bindables target."],
    ["compiler.instruction.listener-binding", "ListenerBindingInstruction retains from, to, capture, and modifier."],
    ["compiler.instruction.property-binding", "PropertyBindingInstruction retains from, to, and binding mode."],
    ["compiler.binding-mode.native-default", "Native target policy selects the JIT default mode for bind."],
    ["compiler.expression.property-entry", "Property-like commands consume the IsProperty expression entry."],
  ]),
  ...group("custom-attribute", [
    implementation(templateCompilerSource, 1020, 1108, "TemplateCompiler._compileMultiBindings", "Escaped semicolon-delimited multi-binding parser and per-bindable lowering."),
    implementation(templateCompilerSource, 1326, 1372, "TemplateCompiler._compileCustomAttributeBindables", "Primary, interpolation, command, empty, and multi-binding selection."),
    behavior(directCompilerSuite, 1086, 1262, "Exact custom-attribute primary and multi-binding instructions."),
    behavior(primaryBindableSuite, 37, 417, "Primary/default property and multi-binding runtime consequences."),
    behavior(surrogateSuite, 245, 295, "Surrogate custom-attribute multi-bindings render through runtime."),
    runtime(rendererSource, 258, 324, "CustomAttributeRenderer resolves the resource and renders every prop instruction."),
  ], exactUnqueried, [
    ["compiler.custom-attribute.resource", "The matched custom-attribute definition or name is retained as the instruction resource."],
    ["compiler.custom-attribute.alias", "Use through a resource alias is retained for runtime consumers."],
    ["compiler.custom-attribute.primary-bindable", "Single-value syntax targets the configured default property."],
    ["compiler.custom-attribute.implicit-primary", "A missing declared primary bindable falls back to the framework's implicit property."],
    ["compiler.custom-attribute.empty", "Empty ordinary usage can hydrate an attribute without creating a bindable instruction."],
    ["compiler.custom-attribute.literal", "A literal primary value emits SetPropertyInstruction."],
    ["compiler.custom-attribute.interpolation", "An interpolated primary value emits InterpolationInstruction."],
    ["compiler.custom-attribute.command", "A primary binding command receives the resolved bindable and definition."],
    ["compiler.custom-attribute.multi-binding", "Inline bindings emit one ordered instruction per named bindable."],
    ["compiler.custom-attribute.multi-binding-escape", "Escaped colon, semicolon, and backslash boundaries do not split the wrong binding."],
    ["compiler.custom-attribute.no-multi-bindings", "noMultiBindings prevents colon-bearing content from being reinterpreted as options."],
    ["compiler.custom-attribute.non-bindable-error", "A named option that is not bindable is rejected exactly."],
  ]),
  ...group("template-controller", [
    implementation(templateCompilerSource, 557, 677, "TemplateCompiler._compileElement", "Inside-out template-controller wrapping, child contexts, markers, and nested definitions."),
    behavior(directCompilerSuite, 360, 461, "Single controller, attribute movement, and as-element interaction."),
    behavior(directCompilerSuite, 1263, 1640, "Nested, multiple, sibling, and mixed template-host controller definitions."),
    behavior(generatedRepeatSuite, 1, 11694, "Generated if/else/repeat controller topology runtime interactions."),
    runtime(rendererSource, 329, 408, "TemplateControllerRenderer consumes def, res, props, and child-container strategy."),
  ], exactUnqueried, [
    ["compiler.template-controller.single", "One controller wraps the element in one anonymous compiled definition."],
    ["compiler.template-controller.multiple", "Multiple controllers form the exact inside-out definition chain."],
    ["compiler.template-controller.inside-out-order", "Authored controller order determines outer and inner hydration order."],
    ["compiler.template-controller.same-element", "Co-located controllers share one physical target while retaining separate nested definitions."],
    ["compiler.template-controller.siblings", "Sibling controller chains retain independent rows and target indices."],
    ["compiler.template-controller.template-host", "A template host is reused or wrapped according to the JIT's physical-tree rule."],
    ["compiler.template-controller.child-context", "Element and child instructions are assigned to the correct child compilation context."],
    ["compiler.template-controller.nested-definition", "Every generated definition retains template, rows, name, type, and needsCompile=false."],
  ]),
  ...group("projection", [
    implementation(templateCompilerSource, 1385, 1464, "TemplateCompiler._extractProjections", "Projection extraction, grouping, unwrapping, child compilation, and definitions."),
    implementation(auSlotSource, 17, 43, "AuSlot.processContent", "AuSlot records slot metadata and removes invalid nested projection carriers."),
    behavior(auSlotSuite, 58, 367, "Exact default, named, aggregated, nested, and fallback projection definitions."),
    runtime(auSlotSource, 70, 100, "AuSlot consumes instruction data and parent/fallback projection definitions."),
  ], projectionGap, [
    ["compiler.projection.eligibility", "Projection extraction occurs only for eligible custom-element content and shadow-DOM policy."],
    ["compiler.projection.default", "Unannotated eligible content is grouped into the default projection."],
    ["compiler.projection.named", "au-slot values key named projection definitions exactly."],
    ["compiler.projection.aggregation", "Multiple contributors to one slot preserve order in one projection template."],
    ["compiler.projection.whitespace", "Projection extraction drops only the JIT-defined insignificant whitespace."],
    ["compiler.projection.template-unwrapping", "A projection template with no remaining attributes unwraps its content; a semantic wrapper remains."],
    ["compiler.projection.nested-compilation", "Projection content is compiled in its own child context with complete rows."],
    ["compiler.projection.fallback", "AuSlot fallback content becomes the default projection on its hydration instruction."],
    ["compiler.projection.slot-metadata", "AuSlot processContent data.name survives to the runtime slot instance."],
    ["compiler.projection.non-element-error", "au-slot projection syntax on an ineligible element is rejected exactly."],
  ]),
  ...group("local-element", [
    implementation(templateCompilerSource, 1115, 1204, "TemplateCompiler._compileLocalElement", "Local template discovery, bindables, generated types, dependencies, registration, and removal."),
    implementation(templateCompilerSource, 1701, 1713, "processTemplateName", "Local names are required, unique, and removed from compiled markup."),
    behavior(localElementsSuite, 236, 456, "Definition Cartesian product, structural errors, modes, attributes, and warnings."),
    behavior(localElementsSuite, 457, 749, "Nested local templates and local/global dependency visibility at runtime."),
    runtime(renderingSource, 92, 109, "Generated local definitions re-enter ordinary compilation and rendering."),
  ], projectionGap, [
    ["compiler.local-element.discovery", "Only root-level template[as-custom-element] declarations enter the local cohort."],
    ["compiler.local-element.extraction", "Local declarations are removed from the owning effective template before its traversal."],
    ["compiler.local-element.definition", "Each local declaration becomes a named local custom-element definition."],
    ["compiler.local-element.bindables", "Root bindable declarations become exact name/attribute pairs and are removed from local content."],
    ["compiler.local-element.modes", "Local bindable mode strings map to the framework binding modes."],
    ["compiler.local-element.cohort-dependencies", "Every local definition sees its local siblings except itself."],
    ["compiler.local-element.owner-dependency", "Local definitions see the owning definition's dependencies and Type."],
    ["compiler.local-element.validation", "Root position, names, bindable shape, and uniqueness errors are preserved."],
    ["compiler.local-element.warning", "Unsupported bindable-element attributes produce the framework warning without changing admitted fields."],
  ]),
  ...group("let", [
    implementation(templateCompilerSource, 402, 470, "TemplateCompiler._compileLet", "Reserved let-element lowering, bindings, flags, warnings, and target marker."),
    implementation(templateCompilerSource, 1468, 1472, "normalizeLetBindingTarget", "Dash targets camel-case while underscore targets retain underscores."),
    behavior(directCompilerSuite, 463, 533, "Empty, bound, interpolated, underscore, and binding-context let instructions."),
    behavior(letSuite, 1, 105, "Valid and invalid let command runtime consequences."),
    runtime(rendererSource, 413, 448, "LetElementRenderer consumes nested bindings and toBindingContext."),
  ], exactUnqueried, [
    ["compiler.let.reserved-element", "LET dispatch ignores a same-named custom-element resource."],
    ["compiler.let.empty", "An empty let still emits one hydrate row with zero nested bindings."],
    ["compiler.let.literal", "Literal let values become primitive literal expressions and warn in development."],
    ["compiler.let.interpolation", "Interpolated let values retain their interpolation expression."],
    ["compiler.let.bind", "bind is admitted and uses IsProperty expression semantics."],
    ["compiler.let.target-normalization", "Dash and underscore targets normalize exactly like the JIT."],
    ["compiler.let.binding-context", "to-binding-context is order-independent and excluded from nested binding instructions."],
    ["compiler.let.invalid-command", "Commands other than bind are rejected with the exact compiler diagnostic."],
    ["compiler.let.literal-warning", "A literal let declaration emits the development guidance warning."],
  ]),
  ...group("capture-spread", [
    implementation(templateCompilerSource, 171, 321, "TemplateCompiler.compileSpread", "Captured syntax compilation for element bindables, custom attributes, commands, and plain attributes."),
    implementation(templateCompilerSource, 773, 835, "TemplateCompiler._classifyAttributes", "Capture priority, exclusions, transfer, and spread-value classification."),
    behavior(directCompilerSuite, 812, 828, "The sole direct compileSpread test proves template-controller rejection only."),
    behavior(directCompilerSuite, 1737, 1840, "Capture exclusions, syntax preservation, and shorthand spread products."),
    behavior(spreadSuite, 6, 619, "Runtime spread chains, filters, custom resources, events, interpolation, values, and ordering."),
    runtime(spreadBindingSource, 45, 98, "SpreadBinding invokes compileSpread at runtime and recursively transfers captured syntax."),
    runtime(auComposeSource, 301, 371, "AuCompose repartitions captures and dynamically creates spread bindings."),
  ], runtimeRetained, [
    ["compiler.capture.enablement", "Capture runs only for definitions that enable boolean or predicate capture."],
    ["compiler.capture.filter", "Capture predicates receive the classified target and decide admission."],
    ["compiler.capture.exclusions", "Bindables, template controllers, slots, and reserved spread forms follow exact capture exclusions."],
    ["compiler.capture.syntax-preservation", "Captured AttrSyntax retains raw name/value, target, command, and parts."],
    ["compiler.spread.context", "Runtime spread spends the captured definition, hydration ancestry, container, and target world."],
    ["compiler.spread.target-definition", "A supplied target definition has precedence over resource lookup."],
    ["compiler.spread.element-bindable", "Spread to a custom-element bindable wraps the complete nested instruction."],
    ["compiler.spread.custom-attribute", "Spread custom attributes preserve resource, alias, and primary/multi props."],
    ["compiler.spread.plain-attribute", "Spread literal, interpolation, class, style, and plain attributes emit host instructions."],
    ["compiler.spread.command", "Commands execute with the spread target and resolved bindable/resource context."],
    ["compiler.spread.instruction-order", "Custom-attribute spread instructions precede ordinary spread instructions as in the JIT."],
    ["compiler.spread.transfer-chain", "Nested ...$attrs walks hydration ancestors without losing syntax or scope."],
    ["compiler.spread.runtime-compiler-demand", "The current ...$attrs implementation retains an ITemplateCompiler runtime dependency."],
  ]),
  ...group("surrogate", [
    implementation(templateCompilerSource, 335, 362, "TemplateCompiler._compileSurrogate", "Root-template surrogate validation, classification, and flat instruction row."),
    behavior(directCompilerSuite, 142, 225, "Exact static, binding, interpolation, custom-attribute, and invalid surrogate products."),
    behavior(surrogateSuite, 13, 335, "Class/style merge and custom-attribute surrogate runtime behavior."),
    runtime(renderingSource, 201, 211, "Rendering consumes surrogates as one flat host instruction row."),
  ], exactUnqueried, [
    ["compiler.surrogate.validation", "id, name, au-slot, as-element, and template controllers are rejected on the surrogate."],
    ["compiler.surrogate.custom-attribute", "Surrogate custom attributes hydrate before ordinary host-transfer instructions."],
    ["compiler.surrogate.static-class", "Static class text emits SetClassAttributeInstruction."],
    ["compiler.surrogate.static-style", "Static style text emits SetStyleAttributeInstruction."],
    ["compiler.surrogate.static-attribute", "Other static surrogate attributes emit SetAttributeInstruction."],
    ["compiler.surrogate.instruction-order", "Custom-attribute and plain surrogate instructions retain runtime merge order."],
    ["compiler.surrogate.runtime-merge", "Surrogate class/style/attribute effects merge with host usage-site values."],
  ]),
  entry(
    "surrogate",
    "compiler.surrogate.flat-wire",
    "Compiled surrogates are one flat instruction row, despite the contradictory public compiled-definition type.",
    [
      implementation(compilerInterfacesSource, 65, 69, "ICompiledElementComponentDefinition", "The public type declares surrogates as IInstruction[][]."),
      implementation(templateCompilerSource, 147, 149, "TemplateCompiler.compile", "The producer assigns the flat IInstruction[] returned by _compileSurrogate."),
      runtime(renderingSource, 201, 211, "The runtime iterates definition.surrogates as one flat row."),
    ],
    frameworkConflict,
  ),
  ...group("order", [
    implementation(templateCompilerSource, 538, 547, "TemplateCompiler._compileElement", "Element, custom-attribute, and plain instruction merge order."),
    implementation(templateCompilerSource, 1208, 1273, "TemplateCompiler._reorder", "Input checked dependencies and select multiple/value ordering."),
    behavior(directCompilerSuite, 1263, 1694, "Controller and element/custom-attribute instruction order."),
    behavior(checkedObserverSuite, 1, 240, "Checked/model/matcher runtime initialization consequences."),
    behavior(selectObserverSuite, 302, 328, "Select value/multiple authored-order regressions."),
    runtime(renderingSource, 215, 233, "Rows and instructions execute in stored order."),
  ], focusedUnqueried, [
    ["compiler.order.element-attribute-plain", "HydrateElement precedes custom attributes, which precede plain instructions."],
    ["compiler.order.spread-custom-before-plain", "compileSpread returns custom-attribute hydration before plain spread instructions."],
    ["compiler.order.source-stability", "Unconstrained instructions retain authored relative order."],
    ["compiler.order.input-checked-dependencies", "Input model/value/matcher initializes before checked when the JIT requires it."],
    ["compiler.order.select-multiple-before-value", "Select multiple initializes before value regardless of authored order."],
    ["compiler.order.target-row-correspondence", "Reordering never changes which row addresses which effective target."],
  ]),
  ...group("definition", [
    implementation(templateCompilerSource, 142, 168, "TemplateCompiler.compile", "Final definition assembly and recursive-resource warning."),
    implementation(compilerInterfacesSource, 6, 69, "IElementComponentDefinition", "Definition inputs and compiled output fields."),
    behavior(directCompilerSuite, 992, 1954, "Exact compiled definitions across compiler semantic combinations."),
    behavior(directCompilerSuite, 1956, 2007, "Recursive component warning."),
    runtime(renderingSource, 92, 166, "Compiled definitions are cached and their effective templates cloned."),
  ], exactUnqueried, [
    ["compiler.definition.name", "An absent name receives a generated anonymous name; explicit names remain stable."],
    ["compiler.definition.dependencies", "Authored dependencies precede compiler-discovered local dependencies."],
    ["compiler.definition.template", "The final compiler-mutated effective template is retained."],
    ["compiler.definition.instructions", "Rows contain every instruction in target and execution order."],
    ["compiler.definition.surrogates", "The definition retains one flat surrogate instruction row."],
    ["compiler.definition.has-slots", "Native slot discovery propagates from nested compiled controller content to the root definition."],
    ["compiler.definition.needs-compile", "A successful compilation sets needsCompile=false on root and nested definitions."],
    ["compiler.definition.resource-values", "Resource-valued fields preserve the selected name-versus-definition representation."],
    ["compiler.definition.expression-values", "Expression-valued fields preserve parsed ASTs or explicitly retained source strings."],
    ["compiler.definition.recursion-warning", "An unguarded direct self-resource emits the framework development warning."],
  ]),
  wireObligation("compiler.wire.type-tag", 29, 57, 70, 80, "Instruction numeric tags remain the renderer-dispatch ABI, including reserved plugin ranges."),
  wireObligation("compiler.wire.hydrate-element", 111, 140, 182, 253, "HydrateElement retains res, props, projections, containerless, captures, and arbitrary data."),
  wireObligation("compiler.wire.hydrate-attribute", 142, 150, 258, 324, "HydrateAttribute retains res, alias, and ordered props."),
  wireObligation("compiler.wire.hydrate-template-controller", 152, 161, 329, 408, "HydrateTemplateController retains nested def, res, alias, and ordered props."),
  wireObligation("compiler.wire.hydrate-let", 163, 173, 413, 448, "HydrateLet retains nested bindings and toBindingContext."),
  wireObligation("compiler.wire.set-property", 97, 101, 165, 180, "SetProperty retains arbitrary value and target property."),
  wireObligation("compiler.wire.interpolation", 71, 75, 475, 504, "Interpolation retains expression/interpolation and target property."),
  wireObligation("compiler.wire.property", 77, 82, 507, 536, "Property binding retains source expression, target, and mode."),
  entry(
    "wire",
    "compiler.wire.iterator",
    "Iterator binding retains forOf, target, and ordered MultiAttr options.",
    [
      implementation(instructionSource, 84, 89, "IteratorBindingInstruction", "Iterator wire fields."),
      runtime(rendererSource, 539, 562, "The renderer consumes forOf and to."),
      runtime(repeatSource, 110, 143, "Repeat separately consumes every nested option field."),
      behavior(directCompilerSuite, 1539, 1639, "Template-controller for-command definitions retain iterator products."),
    ],
    focusedUnqueried,
  ),
  entry(
    "wire",
    "compiler.wire.multi-attribute",
    "Iterator option values retain value, target, and command for the repeat runtime.",
    [
      implementation(instructionSource, 103, 109, "MultiAttrInstruction", "Nested iterator-option wire fields."),
      runtime(repeatSource, 110, 143, "Repeat distinguishes static, bind, key, contextual, and invalid options."),
      behavior(generatedRepeatSuite, 1, 11694, "Generated repeat interactions exercise iterator products through runtime."),
    ],
    runtimeUnqueried,
  ),
  wireObligation("compiler.wire.ref", 91, 95, 452, 472, "Ref binding retains assignment expression and reference target."),
  wireObligation("compiler.wire.listener", 180, 186, 621, 649, "Listener binding retains function expression, event, capture, and modifier."),
  wireObligation("compiler.wire.text", 175, 178, 565, 587, "Text binding retains the expression for its placeholder target."),
  wireObligation("compiler.wire.attribute", 210, 221, 763, 794, "Attribute binding independently retains target attribute, expression, and target key."),
  entry(
    "wire",
    "compiler.wire.static-dom",
    "Static attribute, class, and style instructions retain their exact value and target fields.",
    [
      implementation(instructionSource, 194, 208, "SetAttributeInstruction", "Static DOM instruction fields."),
      runtime(rendererSource, 652, 683, "Static renderers set, merge classes, or append style text."),
      behavior(directCompilerSuite, 142, 225, "Exact surrogate static DOM instructions."),
    ],
    exactUnqueried,
  ),
  entry(
    "wire",
    "compiler.wire.spread-transfer",
    "SpreadTransferedBinding is a type-only request to compile captures from the next hydration ancestor.",
    [
      implementation(instructionSource, 223, 225, "SpreadTransferedBindingInstruction", "Type-only transfer wire."),
      runtime(spreadBindingSource, 64, 96, "Runtime recursively follows transfer instructions."),
      behavior(spreadSuite, 54, 71, "Pass-through ...$attrs runtime behavior."),
    ],
    runtimeRetained,
  ),
  entry(
    "wire",
    "compiler.wire.spread-element-property",
    "SpreadElementPropBinding retains the complete nested bindable instruction.",
    [
      implementation(instructionSource, 227, 235, "SpreadElementPropBindingInstruction", "Nested element-property wire."),
      runtime(spreadBindingSource, 80, 88, "Runtime renders the nested instruction against the custom-element controller."),
      behavior(spreadSuite, 206, 293, "Custom-element bindable spread runtime behavior."),
    ],
    runtimeRetained,
  ),
  entry(
    "wire",
    "compiler.wire.spread-value",
    "SpreadValueBinding retains $bindables target and expression source.",
    [
      implementation(instructionSource, 237, 241, "SpreadValueBindingInstruction", "Spread-value wire fields."),
      runtime(rendererSource, 825, 853, "Runtime parses from and validates the target."),
      behavior(spreadSuite, 338, 619, "Dynamic object spread and shorthand runtime behavior."),
    ],
    runtimeUnqueried,
  ),
  entry(
    "wire",
    "compiler.wire.plugin-type",
    "Official and third-party instruction types remain renderer-extensible and preserve plugin-owned fields.",
    [
      implementation(instructionSource, 11, 27, "IInstruction", "Core, official-plugin, and third-party numeric ranges."),
      runtime(renderingSource, 70, 80, "Renderer registration is indexed by instruction target number."),
      behavior(bindingCommandsSuite, 17, 145, "Custom binding-command registration and aliases remain resource-driven."),
    ],
    openBuildEffect,
  ),
  ...group("diagnostic", [
    implementation(compilerErrorsSource, 27, 82, "ErrorNames", "Compiler diagnostic codes and development messages."),
    implementation(templateCompilerSource, 112, 1713, "TemplateCompiler", "All TemplateCompiler rejection and warning sites."),
    behavior(localElementsSuite, 340, 453, "Local-template rejection and warning cases."),
    behavior(directCompilerSuite, 128, 201, "Slot and invalid-surrogate rejection cases."),
  ], throwsOnly, [
    ["compiler.diagnostic.root-local", "A root template marked as a local element is rejected as AUR0701."],
    ["compiler.diagnostic.template-controller-surrogate", "A surrogate template controller is rejected as AUR0703."],
    ["compiler.diagnostic.local-only-template", "A component containing only local declarations is rejected as AUR0708."],
    ["compiler.diagnostic.local-not-root", "A nested local declaration is rejected as AUR0709."],
    ["compiler.diagnostic.local-bindable-not-root", "A nested local bindable declaration is rejected as AUR0710."],
    ["compiler.diagnostic.local-bindable-name", "A local bindable without its required name is rejected as AUR0711."],
    ["compiler.diagnostic.local-bindable-duplicate", "Duplicate local property or attribute names are rejected as AUR0712."],
    ["compiler.diagnostic.local-name-empty", "An empty local element name is rejected as AUR0715."],
    ["compiler.diagnostic.local-name-duplicate", "A duplicate local element name is rejected as AUR0716."],
    ["compiler.diagnostic.slot-without-shadow", "Native slot use without root shadow options is rejected as AUR0717."],
  ]),
  entry(
    "diagnostic",
    "compiler.diagnostic.invalid-surrogate",
    "Invalid unique surrogate attributes are rejected as AUR0702 with the attribute identity.",
    [
      implementation(templateCompilerSource, 335, 343, "TemplateCompiler._compileSurrogate", "Surrogate validation rejection site."),
      implementation(compilerErrorsSource, 60, 62, "errorsMap", "AUR0702 message contract."),
      behavior(directCompilerSuite, 194, 201, "Direct test asserts AUR0702 and id."),
    ],
    focusedUnqueried,
  ),
  entry(
    "diagnostic",
    "compiler.diagnostic.invalid-let-command",
    "A let command other than bind is rejected as AUR0704.",
    [
      implementation(templateCompilerSource, 431, 441, "TemplateCompiler._compileLet", "Invalid let command rejection site."),
      implementation(compilerErrorsSource, 63, 63, "errorsMap", "AUR0704 message contract."),
      behavior(letSuite, 1, 16, "Supplemental let suite asserts AUR0704."),
    ],
    focusedUnqueried,
  ),
  diagnosticSourceOnly("compiler.diagnostic.projection-non-element", 1400, 1407, "au-slot projection syntax on a non-custom element is rejected as AUR0706."),
  diagnosticSourceOnly("compiler.diagnostic.multi-binding-non-bindable", 1074, 1083, "A multi-binding option without a bindable is rejected as AUR0707."),
  entry(
    "diagnostic",
    "compiler.diagnostic.unknown-command",
    "The declared AUR0713 unknown-command contract needs a live producer and exact behavior witness.",
    [
      implementation(compilerErrorsSource, 38, 38, "ErrorNames.compiler_unknown_binding_command", "AUR0713 is declared."),
      implementation(bindingCommandSource, 184, 209, "BindingCommand.get", "Command lookup currently delegates to container resource resolution."),
      implementation(templateCompilerSource, 1603, 1609, "CompilationContext._getCommand", "The compiler forwards parsed command names to the resolver."),
    ],
    frameworkAmbiguous,
  ),
  diagnosticSourceOnly("compiler.diagnostic.reserved-spread", 815, 835, "Reserved ... syntax is rejected as AUR0720."),
  diagnosticSourceOnly("compiler.diagnostic.reserved-bindables", 900, 903, "$bindables on a non-custom element is rejected as AUR0721."),
  diagnosticSourceOnly("compiler.diagnostic.no-dom", 1525, 1527, "A compiler world without DOM APIs is rejected as AUR0722."),
  entry(
    "diagnostic",
    "compiler.diagnostic.invalid-class-syntax",
    "Comma-separated class syntax with no valid class target is rejected as AUR0723.",
    [
      implementation(bindingCommandSource, 466, 489, "ClassBindingCommand.build", "Invalid multi-class rejection site."),
      implementation(compilerErrorsSource, 80, 80, "errorsMap", "AUR0723 message contract."),
      behavior(classCommandSuite, 367, 382, "Dedicated class-command test asserts AUR0723."),
    ],
    focusedUnqueried,
  ),
  entry(
    "diagnostic",
    "compiler.diagnostic.template-controller-spread",
    "Template-controller spread rejection must resolve the AUR0718 versus internal 9998 authority conflict.",
    [
      implementation(compilerErrorsSource, 41, 49, "ErrorNames", "AUR0718 and internal 9998 are both declared."),
      implementation(templateCompilerSource, 253, 257, "TemplateCompiler.compileSpread", "compileSpread throws internal 9998."),
      behavior(directCompilerSuite, 812, 828, "The sole direct test asserts only that an exception occurs."),
    ],
    frameworkConflict,
  ),
  ...group("diagnostic", [
    implementation(templateCompilerSource, 827, 893, "TemplateCompiler._classifyAttributes", "Reserved-spread, ambiguous-resource, and $bindables development warnings."),
    implementation(templateCompilerSource, 447, 453, "TemplateCompiler._compileLet", "Literal let guidance warning."),
    implementation(templateCompilerSource, 1158, 1163, "TemplateCompiler._compileLocalElement", "Ignored local-bindable attribute warning."),
    implementation(templateCompilerSource, 155, 165, "TemplateCompiler.compile", "Direct self-resource warning."),
    implementation(attributePatternSource, 319, 328, "RefAttributePattern.PART.ref", "Deprecated view-model.ref warning and component target rewrite."),
    behavior(directCompilerSuite, 1956, 2007, "Exact recursive-resource warning case."),
  ], sourceOnly, [
    ["compiler.diagnostic.ambiguous-bindable-resource", "A same-named bindable and custom attribute produces the framework development warning."],
    ["compiler.diagnostic.literal-let-warning", "A literal let value produces binding guidance in development."],
    ["compiler.diagnostic.suspicious-spread-warning", "Near-miss reserved spread spellings produce the framework guidance warning."],
    ["compiler.diagnostic.ignored-bindables-warning", "Uncommanded or incompatible $bindables usage produces the framework warning."],
    ["compiler.diagnostic.local-bindable-warning", "Unsupported local bindable attributes produce the framework warning."],
    ["compiler.diagnostic.deprecated-view-model-ref", "Deprecated view-model.ref syntax warns and rewrites its target to component."],
    ["compiler.diagnostic.recursion-warning", "A direct self-resource instruction produces the exact development warning."],
  ]),
  ...group("interaction", [
    implementation(generatedCompilerSource, 164, 325, "generateTests inputs", "Host, text, if/else, and repeat axes in the nominal generator."),
    implementation(generatedCompilerSource, 372, 1091, "generateTests", "Generated nesting, sibling, ordering, empty, and duplicate variants."),
    behavior(generatedStaticSuite, 1, 129, "Checked-in static runtime cases."),
    behavior(generatedIfElseSuite, 1, 2052, "Checked-in if/else runtime cases."),
    behavior(generatedIfElseDoubleSuite, 1, 8698, "Checked-in sibling and nested double runtime cases."),
    behavior(generatedRepeatSuite, 1, 11694, "Checked-in if/else/repeat runtime cases."),
    behavior(generatedRepeatDoubleSuite, 1, 9238, "Checked-in double if/else/repeat runtime cases."),
    runtime(renderingSource, 173, 233, "Runtime target-row traversal exercised by every generated case."),
  ], staleGenerated, [
    ["compiler.interaction.static-text", "Static and interpolated text remain correct across admitted host kinds."],
    ["compiler.interaction.if-else", "Truthy and falsy if/else branches preserve controller pairing and content."],
    ["compiler.interaction.repeat", "Number and array repeats compose with conditional content."],
    ["compiler.interaction.controller-nesting", "Nested controller permutations preserve target and scope topology."],
    ["compiler.interaction.controller-siblings", "Sibling and duplicate controller chains remain independent."],
    ["compiler.interaction.host-kind", "Native div, template, and custom-element hosts produce equivalent intended behavior."],
    ["compiler.interaction.containerless", "Containerless custom hosts retain nested controller behavior."],
    ["compiler.interaction.shadow-dom", "Open and closed shadow hosts retain intended compiled semantics."],
    ["compiler.interaction.restart-determinism", "Repeated start/stop produces the same visible content and outer HTML."],
  ]),
  ...group("interaction", [
    behavior(testAppsSuite, 18, 246, "Fractal SVG, local recursion, and unguarded self-recursion applications."),
    runtime(renderingSource, 92, 109, "Runtime compiles definitions on demand before creating their views."),
    runtime(auComposeSource, 351, 371, "AuCompose compiles a runtime-provided template or creates spread bindings."),
  ], profileDependent, [
    ["compiler.interaction.recursion", "Local recursive resources compile and render without confusing direct self-recursion."],
    ["compiler.interaction.svg", "Foreign-content elements, as-element, bindings, listeners, and controllers compose in one graph."],
    ["compiler.interaction.dynamic-composition", "Runtime-provided AuCompose templates retain or explicitly refuse compiler availability."],
    ["compiler.interaction.runtime-definition", "Dynamically created CustomElement definitions retain or explicitly refuse JIT compilation."],
  ]),
];

type ObligationSeed = readonly [id: CompilerObligationId, requirement: string];

function group(
  family: CompilerObligationFamily,
  authorities: readonly CompilerAuthorityReference[],
  initialDisposition: CompilerObligationAuditDisposition,
  seeds: readonly ObligationSeed[],
): CompilerObligationCatalogEntry[] {
  return seeds.map(([id, requirement]) => entry(
    family,
    id,
    requirement,
    authorities,
    initialDisposition,
  ));
}

function entry(
  family: CompilerObligationFamily,
  id: CompilerObligationId,
  requirement: string,
  authorities: readonly CompilerAuthorityReference[],
  initialDisposition: CompilerObligationAuditDisposition,
): CompilerObligationCatalogEntry {
  return {
    id,
    family,
    requirement,
    authorities,
    disposition: initialDisposition,
  };
}

function attributeObligation(
  id: CompilerObligationId,
  startLine: number,
  endLine: number,
  requirement: string,
  initialDisposition: CompilerObligationAuditDisposition,
): CompilerObligationCatalogEntry {
  return entry(
    "attribute",
    id,
    requirement,
    [
      implementation(templateCompilerSource, startLine, endLine, "TemplateCompiler._classifyAttributes", requirement),
      behavior(directCompilerSuite, 992, 1953, "Direct classifier combination assertions."),
      runtime(rendererSource, 173, 233, "Runtime consumes classifier products in stored row and instruction order."),
    ],
    initialDisposition,
  );
}

function wireObligation(
  id: CompilerObligationId,
  interfaceStartLine: number,
  interfaceEndLine: number,
  runtimeStartLine: number,
  runtimeEndLine: number,
  requirement: string,
): CompilerObligationCatalogEntry {
  return entry(
    "wire",
    id,
    requirement,
    [
      implementation(instructionSource, interfaceStartLine, interfaceEndLine, id, requirement),
      behavior(directCompilerSuite, 992, 1954, "Direct compiler combinations assert instruction and definition fields."),
      runtime(rendererSource, runtimeStartLine, runtimeEndLine, "Runtime consumer for the instruction fields."),
    ],
    exactUnqueried,
  );
}

function diagnosticSourceOnly(
  id: CompilerObligationId,
  startLine: number,
  endLine: number,
  requirement: string,
): CompilerObligationCatalogEntry {
  return entry(
    "diagnostic",
    id,
    requirement,
    [
      implementation(templateCompilerSource, startLine, endLine, "TemplateCompiler", requirement),
      implementation(compilerErrorsSource, 27, 82, "ErrorNames", "Canonical compiler error-code and message table."),
    ],
    sourceOnly,
  );
}

function disposition(
  source: CompilerObligationAuditDisposition["source"],
  oracle: CompilerObligationAuditDisposition["oracle"],
  semanticRuntime: CompilerObligationAuditDisposition["semanticRuntime"],
  effect: CompilerObligationAuditDisposition["effect"],
  policy: CompilerObligationAuditDisposition["policy"],
  closureState: CompilerObligationAuditDisposition["closure"]["state"],
  closureReason: string,
  gaps: CompilerObligationAuditDisposition["gaps"],
): CompilerObligationAuditDisposition {
  return {
    source,
    oracle,
    semanticRuntime,
    effect,
    policy,
    closure: {
      state: closureState,
      reason: closureReason,
    },
    gaps,
  };
}

function implementation(
  filePath: string,
  startLine: number,
  endLine: number,
  symbolName: string,
  summary: string,
): CompilerAuthorityReference {
  return {
    repository: "aurelia",
    revision: COMPILER_CORPUS_FRAMEWORK_REVISION,
    role: "implementation",
    filePath,
    startLine,
    endLine,
    symbolName,
    summary,
  };
}

function behavior(
  filePath: string,
  startLine: number,
  endLine: number,
  summary: string,
): CompilerAuthorityReference {
  return {
    repository: "aurelia",
    revision: COMPILER_CORPUS_FRAMEWORK_REVISION,
    role: "behavior",
    filePath,
    startLine,
    endLine,
    suiteName: filePath,
    summary,
  };
}

function runtime(
  filePath: string,
  startLine: number,
  endLine: number,
  summary: string,
): CompilerAuthorityReference {
  return {
    repository: "aurelia",
    revision: COMPILER_CORPUS_FRAMEWORK_REVISION,
    role: "runtime-consequence",
    filePath,
    startLine,
    endLine,
    symbolName: filePath,
    summary,
  };
}
