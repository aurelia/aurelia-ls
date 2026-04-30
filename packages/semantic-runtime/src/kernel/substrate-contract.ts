/**
 * tooling-visible product contract for semantic-runtime substrate lenses.
 *
 * This file is intentionally visible to tools such as Atlas. It gives those tools stable product-owned handles for
 * facts that are not carried cleanly by TypeScript types yet, so Atlas and tooling do not need private product-specific
 * pattern tables. These declarations are mapping aids for source inventory and projection; they are not runtime
 * semantics, kernel record truth, public API, or persistence schema.
 *
 * Keep this file small. Prefer strengthening the real model types first. If an Atlas or tooling lens starts needing a private
 * table to understand semantic-runtime structure, add or adjust the smallest product-owned contract here instead.
 * External lenses should validate every declaration against source and surface stale, overlapping, or missing
 * mappings explicitly.
 */

export const enum KernelPreservationChannel {
  /** Channel for source or generated address records and address handles. */
  Address = 'address',
  /** Channel for semantic identity records and identity handles. */
  Identity = 'identity',
  /** Channel for provenance records and provenance handles. */
  Provenance = 'provenance',
  /** Channel for per-field provenance entries on semantic products. */
  FieldProvenance = 'field-provenance',
  /** Channel for evidence records, evidence sets, and evidence handles. */
  Evidence = 'evidence',
  /** Channel for open seam records and handles. */
  OpenSeam = 'open-seam',
  /** Channel for semantic claim records and claim handles. */
  Claim = 'claim',
  /** Channel for materialization records and materialization handles. */
  Materialization = 'materialization',
  /** Channel for derivation rules, edges, records, and handles. */
  Derivation = 'derivation',
  /** Channel for materialized products and product handles. */
  Product = 'product',
  /** Channel for current-world source spans and AST-backed source loci. */
  SourceSpan = 'source-span',
  /** Channel for current TypeScript Program/checker epoch carriers. */
  TypeChecker = 'type-checker',
}

/** Product-owned preservation channel carriers for substrate lenses. */
export const KernelPreservationChannels = {
  Address: {
    channel: KernelPreservationChannel.Address,
    carriers: ['AddressHandle', 'SourceFileAddress', 'SourceSpanAddress', 'TemplateAddress', 'SemanticAddress'],
    summary: 'Source or generated address records and address handles that preserve where something was observed.',
  },
  Identity: {
    channel: KernelPreservationChannel.Identity,
    carriers: ['IdentityHandle', 'SemanticIdentity', 'Identity'],
    summary: 'Semantic identity records and handles that preserve what an observed thing is believed to be.',
  },
  Provenance: {
    channel: KernelPreservationChannel.Provenance,
    carriers: ['ProvenanceHandle', 'ProvenanceRecord'],
    summary: 'Provenance records and handles that preserve why a fact or product exists.',
  },
  FieldProvenance: {
    channel: KernelPreservationChannel.FieldProvenance,
    carriers: ['FieldProvenance', 'fieldProvenance'],
    summary: 'Per-field provenance entries that preserve mixed-source metadata contributions.',
  },
  Evidence: {
    channel: KernelPreservationChannel.Evidence,
    carriers: ['EvidenceHandle', 'EvidenceRecord', 'EvidenceSet'],
    summary: 'Evidence records, evidence sets, and handles that preserve direct witnesses.',
  },
  OpenSeam: {
    channel: KernelPreservationChannel.OpenSeam,
    carriers: ['OpenSeamHandle', 'OpenSeam'],
    summary: 'Open seam records and handles that preserve unresolved pressure.',
  },
  Claim: {
    channel: KernelPreservationChannel.Claim,
    carriers: ['ClaimHandle', 'SemanticClaim', 'ClaimSet'],
    summary: 'Semantic claim records and handles that preserve normalized graph assertions.',
  },
  Materialization: {
    channel: KernelPreservationChannel.Materialization,
    carriers: ['MaterializationHandle', 'MaterializationRecord'],
    summary: 'Materialization records and handles that preserve phase products as a coherent result.',
  },
  Derivation: {
    channel: KernelPreservationChannel.Derivation,
    carriers: ['DerivationHandle', 'DerivationRule', 'DerivationRecord', 'DerivationEdge'],
    summary: 'Derivation rules, edges, records, and handles that preserve transformation flow.',
  },
  Product: {
    channel: KernelPreservationChannel.Product,
    carriers: ['ProductHandle', 'MaterializedProduct'],
    summary: 'Materialized product records and handles that preserve produced semantic artifacts.',
  },
  SourceSpan: {
    channel: KernelPreservationChannel.SourceSpan,
    carriers: ['SourceSpanAddress', 'SourceSpanRole', 'sourceNode', 'ts.Node'],
    summary: 'Current-world source span and AST carriers used for navigation and explanation.',
  },
  TypeChecker: {
    channel: KernelPreservationChannel.TypeChecker,
    carriers: ['ts.TypeChecker', 'ts.Type', 'ts.Symbol', 'CheckerTypeCarrier', 'CheckerTypeMemberCarrier', 'checker'],
    summary: 'Current TypeScript Program/checker epoch carriers retained by hot product details rather than durable kernel records.',
  },
} as const;

export const enum KernelSubstrateModelSurface {
  /** Kernel records stored directly in KernelStore. */
  KernelRecord = 'kernel-record',
  /** Kernel helpers and catalogs that support records but are not semantic products. */
  KernelSupport = 'kernel-support',
  /** Boot-time source/project/workspace frames. */
  BootFrame = 'boot-frame',
  /** Inquiry selectors, loci, answers, pages, and query inputs. */
  InquiryContract = 'inquiry-contract',
  /** Static evaluator completion records. */
  EvaluationCompletion = 'evaluation-completion',
  /** Static evaluator environment and binding records. */
  EvaluationEnvironment = 'evaluation-environment',
  /** Static evaluator module graph records. */
  EvaluationModuleGraph = 'evaluation-module-graph',
  /** Static evaluator runtime-like abstract values. */
  EvaluationValue = 'evaluation-value',
  /** Static evaluator open-seam records and one-way kernel emitter. */
  EvaluationSeam = 'evaluation-seam',
  /** Static evaluator readers, host adapters, and evaluator entrypoints. */
  EvaluationSupport = 'evaluation-support',
  /** Type-system type and member projection models. */
  TypeSystemShape = 'type-system-shape',
  /** Type-system projection materializers and hot checker carriers. */
  TypeSystemProjection = 'type-system-projection',
  /** Aurelia app admission, app-root, and root configuration models. */
  ConfigurationApp = 'configuration-app',
  /** Ordered configuration flow, steps, and option contribution models. */
  ConfigurationFlow = 'configuration-flow',
  /** Deferred AppTask and lifecycle-slot dispatch models. */
  ConfigurationAppTask = 'configuration-app-task',
  /** Controller ontology used to connect app roots, containers, resources, and template phases. */
  ConfigurationController = 'configuration-controller',
  /** Runtime binding-scope ontology used by controllers, expressions, and binding lookup. */
  ConfigurationBindingScope = 'configuration-binding-scope',
  /** Configuration recognition observations before kernel product materialization. */
  ConfigurationObservation = 'configuration-observation',
  /** Configuration recognizers, context, and pass orchestration. */
  ConfigurationRecognition = 'configuration-recognition',
  /** Configuration emission support that materializes recognized configuration flow. */
  ConfigurationEmission = 'configuration-emission',
  /** App-world composition across configuration, DI, and compiler-world handoff. */
  ConfigurationAppWorld = 'configuration-app-world',
  /** DI container models and references. */
  DiContainer = 'di-container',
  /** DI container configuration values that shape container behavior. */
  DiConfiguration = 'di-configuration',
  /** DI lookup answer records returned by container emulation methods. */
  DiLookup = 'di-lookup',
  /** DI resolver values and resolver-resolution answer records. */
  DiResolver = 'di-resolver',
  /** DI registry values and registry-registration answer records. */
  DiRegistry = 'di-registry',
  /** DI operations that spend registration/configuration facts into container state. */
  DiOperation = 'di-operation',
  /** DI container-owned resolver, resource, and factory slots. */
  DiSlot = 'di-slot',
  /** DI world construction that spends configuration-owned registrations into container products. */
  DiWorldConstruction = 'di-world-construction',
  /** Aurelia expression AST nodes. */
  ExpressionAst = 'expression-ast',
  /** Expression parse result, failure, and candidate algebra. */
  ExpressionParseAlgebra = 'expression-parse-algebra',
  /** Expression parser corridors, scanner, and parser state machinery. */
  ExpressionParser = 'expression-parser',
  /** Resource definition headers and converged resource definition models. */
  ResourceDefinition = 'resource-definition',
  /** Per-source resource definition contributions. */
  ResourceContribution = 'resource-contribution',
  /** Resource recognition observations before definition materialization. */
  ResourceObservation = 'resource-observation',
  /** Resource recognizers and pass orchestration. */
  ResourceRecognition = 'resource-recognition',
  /** Resource definition convergers that materialize full metadata definitions from headers. */
  ResourceConvergence = 'resource-convergence',
  /** Resource target, alias, dependency, and instruction references. */
  ResourceReference = 'resource-reference',
  /** Framework-owned built-in resource catalogs and header materializers. */
  ResourceBuiltInCatalog = 'resource-built-in-catalog',
  /** Normalized registration admission records. */
  RegistrationAdmission = 'registration-admission',
  /** Registration recognition observations before admission materialization. */
  RegistrationObservation = 'registration-observation',
  /** Registration key and value references before DI world construction. */
  RegistrationReference = 'registration-reference',
  /** Registration emission support that materializes admission observations. */
  RegistrationEmission = 'registration-emission',
  /** Registration recognizers and pass orchestration. */
  RegistrationRecognition = 'registration-recognition',
  /** Template parse contexts carrying inquiry pressure into parsers and lowering. */
  TemplateParseContext = 'template-parse-context',
  /** Template compiler worlds, resource scopes, and compiler service references. */
  TemplateCompilerWorld = 'template-compiler-world',
  /** Template compilation units, authored template sources, and runtime-shaped compilation contexts. */
  TemplateCompilationUnit = 'template-compilation-unit',
  /** Authored HTML IR before Aurelia syntax classification. */
  TemplateHtmlIr = 'template-html-ir',
  /** Attribute parser syntax and classification products. */
  TemplateAttributeSyntax = 'template-attribute-syntax',
  /** Compiler-owned selection of authored template value sites and parser-owned publications. */
  TemplateValueSites = 'template-value-sites',
  /** Binding-command executable, resolver, build-input, and lowering products. */
  TemplateBindingCommandExecution = 'template-binding-command-execution',
  /** Compiled template handoff: transformed-template rows, render targets, and instruction sequences. */
  TemplateCompiledTemplate = 'template-compiled-template',
  /** Framework-provided syntax resource catalogs for template compiler worlds. */
  TemplateBuiltInSyntax = 'template-built-in-syntax',
  /** Framework-provided runtime renderer catalogs and renderer products for template compiler worlds. */
  TemplateRuntimeRenderer = 'template-runtime-renderer',
  /** Lowered rendering instruction products. */
  TemplateInstructionIr = 'template-instruction-ir',
  /** Runtime binding instances and binding-owned scope effects emulated from renderer semantics. */
  TemplateRuntimeBinding = 'template-runtime-binding',
  /** Template binding-scope construction from controller, repeat, let, and TypeChecker facts. */
  TemplateScope = 'template-scope',
  /** Router configuration, route, context, instruction, and built-in resource model anchors. */
  RouterModel = 'router-model',
}

/**
 * Product-owned model-surface mappings for Atlas/semantic-runtime inventory.
 *
 * A surface is a navigation/projection label for classes discovered in source. It is deliberately weaker than a
 * product kind, vocabulary key, framework auLink, or kernel identity. Lenses may use these mappings to group broad
 * class inventories, but should report overlapping or unmatched classes rather than inferring hidden semantics.
 *
 * Match fields use repository-relative source paths. `files` and `pathPrefixes` select declaration files;
 * `classNames` and `classNameSuffixes` narrow by declaration name. `excludeFiles`, `excludeClassNames`, and
 * `excludeClassNameSuffixes` remove declarations from broader rules.
 */
export const KernelSubstrateModelSurfaces = {
  KernelRecords: {
    surface: KernelSubstrateModelSurface.KernelRecord,
    match: {
      files: [
        'packages/semantic-runtime/src/kernel/address.ts',
        'packages/semantic-runtime/src/kernel/claim.ts',
        'packages/semantic-runtime/src/kernel/derivation.ts',
        'packages/semantic-runtime/src/kernel/evidence.ts',
        'packages/semantic-runtime/src/kernel/identity.ts',
        'packages/semantic-runtime/src/kernel/materialization.ts',
        'packages/semantic-runtime/src/kernel/note.ts',
        'packages/semantic-runtime/src/kernel/provenance.ts',
      ],
      excludeClassNames: ['DerivationLink', 'FieldProvenance'],
    },
    summary: 'Record classes that are directly eligible for KernelStore storage or expansion.',
  },
  KernelSupport: {
    surface: KernelSubstrateModelSurface.KernelSupport,
    match: {
      files: [
        'packages/semantic-runtime/src/kernel/handles.ts',
        'packages/semantic-runtime/src/kernel/product-details.ts',
        'packages/semantic-runtime/src/kernel/store.ts',
        'packages/semantic-runtime/src/kernel/vocabulary.ts',
      ],
      classNames: [
        'DerivationLink',
        'FieldProvenance',
        'KernelHandleFactory',
        'KernelStore',
        'KernelStoreBatch',
        'KernelVocabularyDefinition',
        'ProductDetailCatalog',
        'ProductDetailEntry',
        'ProductDetailSlot',
      ],
    },
    summary: 'Kernel support classes and catalogs that help records exist but are not semantic products by themselves.',
  },
  BootFrames: {
    surface: KernelSubstrateModelSurface.BootFrame,
    match: {
      files: [
        'packages/semantic-runtime/src/boot/frames.ts',
        'packages/semantic-runtime/src/boot/source-discovery.ts',
      ],
    },
    summary: 'Boot-time source admission and workspace/project frame records.',
  },
  InquiryContracts: {
    surface: KernelSubstrateModelSurface.InquiryContract,
    match: {
      pathPrefixes: ['packages/semantic-runtime/src/inquiry/'],
    },
    summary: 'Inquiry inputs and answer-envelope records used to query the hot analysis world.',
  },
  EvaluationCompletions: {
    surface: KernelSubstrateModelSurface.EvaluationCompletion,
    match: {
      files: ['packages/semantic-runtime/src/evaluation/completion.ts'],
    },
    summary: 'Evaluator completion records based on ECMAScript-style control flow results.',
  },
  EvaluationEnvironments: {
    surface: KernelSubstrateModelSurface.EvaluationEnvironment,
    match: {
      files: ['packages/semantic-runtime/src/evaluation/environment.ts'],
    },
    summary: 'Evaluator environment records and mutable binding state.',
  },
  EvaluationModuleGraphs: {
    surface: KernelSubstrateModelSurface.EvaluationModuleGraph,
    match: {
      files: [
        'packages/semantic-runtime/src/evaluation/module-graph.ts',
        'packages/semantic-runtime/src/evaluation/module-host.ts',
        'packages/semantic-runtime/src/evaluation/module-evaluator.ts',
        'packages/semantic-runtime/src/evaluation/project-evaluation.ts',
      ],
    },
    summary: 'Static module graph records, host adapters, graph evaluation results, and project-level evaluation passes.',
  },
  EvaluationValues: {
    surface: KernelSubstrateModelSurface.EvaluationValue,
    match: {
      files: ['packages/semantic-runtime/src/evaluation/values.ts'],
    },
    summary: 'Abstract values produced by static evaluation.',
  },
  EvaluationSeams: {
    surface: KernelSubstrateModelSurface.EvaluationSeam,
    match: {
      files: [
        'packages/semantic-runtime/src/evaluation/seams.ts',
        'packages/semantic-runtime/src/evaluation/kernel-emitter.ts',
      ],
    },
    summary: 'Evaluator open seams and their one-way kernel emission adapter.',
  },
  EvaluationSupport: {
    surface: KernelSubstrateModelSurface.EvaluationSupport,
    match: {
      files: [
        'packages/semantic-runtime/src/evaluation/evaluator.ts',
        'packages/semantic-runtime/src/evaluation/expression-reader.ts',
        'packages/semantic-runtime/src/evaluation/ts-syntax.ts',
      ],
    },
    summary: 'Evaluator entrypoints, expression readers, and TypeScript syntax helpers.',
  },
  TypeSystemShapes: {
    surface: KernelSubstrateModelSurface.TypeSystemShape,
    match: {
      files: [
        'packages/semantic-runtime/src/type-system/type-shape.ts',
        'packages/semantic-runtime/src/type-system/product-details.ts',
      ],
    },
    summary: 'Type-system type/member projection models, synthetic expression shapes, call/construct result references, and typed product-detail slots.',
  },
  TypeSystemProjections: {
    surface: KernelSubstrateModelSurface.TypeSystemProjection,
    match: {
      files: [
        'packages/semantic-runtime/src/type-system/checker-projector.ts',
        'packages/semantic-runtime/src/type-system/expression-type-evaluator.ts',
        'packages/semantic-runtime/src/type-system/project.ts',
      ],
    },
    summary: 'Projection materializers and runtime-shaped expression evaluators that materialize or resolve current type-system member, union, and call-result surfaces into kernel envelopes and hot details.',
  },
  ConfigurationApps: {
    surface: KernelSubstrateModelSurface.ConfigurationApp,
    match: {
      files: [
        'packages/semantic-runtime/src/configuration/aurelia.ts',
        'packages/semantic-runtime/src/configuration/app-root.ts',
      ],
    },
    summary: 'Aurelia facade, AppRoot, and app-root configuration models used before DI world construction.',
  },
  ConfigurationFlow: {
    surface: KernelSubstrateModelSurface.ConfigurationFlow,
    match: {
      files: [
        'packages/semantic-runtime/src/configuration/configuration-sequence.ts',
        'packages/semantic-runtime/src/configuration/configuration-option.ts',
      ],
    },
    summary: 'Ordered configuration sequences, steps, and option contributions before registration or DI spending.',
  },
  ConfigurationAppTasks: {
    surface: KernelSubstrateModelSurface.ConfigurationAppTask,
    match: {
      files: ['packages/semantic-runtime/src/configuration/app-task.ts'],
    },
    summary: 'Deferred IAppTask definitions and AppRoot lifecycle-slot dispatch points.',
  },
  ConfigurationControllers: {
    surface: KernelSubstrateModelSurface.ConfigurationController,
    match: {
      files: ['packages/semantic-runtime/src/configuration/controller.ts'],
    },
    summary: 'Controller ontology that tracks runtime controller kind and compiler/hydration phase boundaries.',
  },
  ConfigurationBindingScopes: {
    surface: KernelSubstrateModelSurface.ConfigurationBindingScope,
    match: {
      files: [
        'packages/semantic-runtime/src/configuration/product-details.ts',
        'packages/semantic-runtime/src/configuration/scope.ts',
        'packages/semantic-runtime/src/configuration/scope-materializer.ts',
      ],
    },
    summary: 'Runtime Scope, binding-context, and override-context ontology used by controller activation and expression lookup.',
  },
  ConfigurationObservations: {
    surface: KernelSubstrateModelSurface.ConfigurationObservation,
    match: {
      files: ['packages/semantic-runtime/src/configuration/configuration-observation.ts'],
    },
    summary: 'Source-level configuration observations before app, option, registration, and AppTask materialization.',
  },
  ConfigurationRecognition: {
    surface: KernelSubstrateModelSurface.ConfigurationRecognition,
    match: {
      files: [
        'packages/semantic-runtime/src/configuration/configuration-recognition-context.ts',
        'packages/semantic-runtime/src/configuration/configuration-recognition-pass.ts',
        'packages/semantic-runtime/src/configuration/configuration-recognition-project-pass.ts',
        'packages/semantic-runtime/src/configuration/configuration-recognizer.ts',
      ],
    },
    summary: 'Configuration recognition context, source/project scanners, and pass orchestration.',
  },
  ConfigurationEmission: {
    surface: KernelSubstrateModelSurface.ConfigurationEmission,
    match: {
      files: ['packages/semantic-runtime/src/configuration/configuration-kernel-emitter.ts'],
    },
    summary: 'Configuration emission support that materializes recognized configuration flow into kernel records.',
  },
  ConfigurationAppWorlds: {
    surface: KernelSubstrateModelSurface.ConfigurationAppWorld,
    match: {
      files: [
        'packages/semantic-runtime/src/configuration/app-world-composer.ts',
        'packages/semantic-runtime/src/configuration/app-world-project-pass.ts',
      ],
    },
    summary: 'App-world composition across project evaluation, configuration emission, DI world construction, and compiler-world handoff.',
  },
  DiContainers: {
    surface: KernelSubstrateModelSurface.DiContainer,
    match: {
      files: ['packages/semantic-runtime/src/di/container.ts'],
      classNames: [
        'Container',
        'ContainerReference',
        'ContainerInterfaceToken',
        'ContainerInterfaceTokenReference',
      ],
    },
    summary: 'Abstract Aurelia containers, container references, and the IContainer token used by DI world construction.',
  },
  DiConfigurations: {
    surface: KernelSubstrateModelSurface.DiConfiguration,
    match: {
      files: ['packages/semantic-runtime/src/di/container-configuration.ts'],
    },
    summary: 'Container configuration values that affect abstract DI world construction.',
  },
  DiLookups: {
    surface: KernelSubstrateModelSurface.DiLookup,
    match: {
      files: ['packages/semantic-runtime/src/di/container-lookup.ts'],
    },
    summary: 'Lookup answer records returned by abstract DI container emulation methods.',
  },
  DiResolvers: {
    surface: KernelSubstrateModelSurface.DiResolver,
    match: {
      files: ['packages/semantic-runtime/src/di/resolver.ts'],
    },
    summary: 'Runtime-shaped resolver values and resolver-resolution answer records.',
  },
  DiRegistries: {
    surface: KernelSubstrateModelSurface.DiRegistry,
    match: {
      files: ['packages/semantic-runtime/src/di/registry.ts'],
    },
    summary: 'Runtime-shaped registry values and registry-registration answer records.',
  },
  DiOperations: {
    surface: KernelSubstrateModelSurface.DiOperation,
    match: {
      files: ['packages/semantic-runtime/src/di/container-registration.ts'],
    },
    summary: 'DI operations that spend registration/configuration facts into container state.',
  },
  DiSlots: {
    surface: KernelSubstrateModelSurface.DiSlot,
    match: {
      files: ['packages/semantic-runtime/src/di/container-slot.ts'],
    },
    summary: 'Container-owned resolver, resource, and factory slots produced by DI world construction.',
  },
  DiWorldConstruction: {
    surface: KernelSubstrateModelSurface.DiWorldConstruction,
    match: {
      files: [
        'packages/semantic-runtime/src/di/world-construction.ts',
        'packages/semantic-runtime/src/di/world-constructor.ts',
      ],
    },
    summary: 'DI world-construction records that spend configuration admissions.',
  },
  ExpressionAst: {
    surface: KernelSubstrateModelSurface.ExpressionAst,
    match: {
      files: ['packages/semantic-runtime/src/expression/ast.ts'],
    },
    summary: 'Aurelia expression AST node classes.',
  },
  ExpressionParseAlgebra: {
    surface: KernelSubstrateModelSurface.ExpressionParseAlgebra,
    match: {
      files: [
        'packages/semantic-runtime/src/expression/parse-failure.ts',
        'packages/semantic-runtime/src/expression/parse-result-algebra.ts',
      ],
    },
    summary: 'Expression parse outcomes, failure records, and candidate result algebra.',
  },
  ExpressionParsers: {
    surface: KernelSubstrateModelSurface.ExpressionParser,
    match: {
      pathPrefixes: ['packages/semantic-runtime/src/expression/'],
      excludeFiles: [
        'packages/semantic-runtime/src/expression/ast.ts',
        'packages/semantic-runtime/src/expression/parse-failure.ts',
        'packages/semantic-runtime/src/expression/parse-result-algebra.ts',
      ],
    },
    summary: 'Expression parser corridors, scanner, parser state, and parser integration helpers.',
  },
  ResourceDefinitions: {
    surface: KernelSubstrateModelSurface.ResourceDefinition,
    match: {
      files: [
        'packages/semantic-runtime/src/resources/attribute-pattern-definition.ts',
        'packages/semantic-runtime/src/resources/bindable-definition.ts',
        'packages/semantic-runtime/src/resources/binding-behavior-definition.ts',
        'packages/semantic-runtime/src/resources/binding-command-definition.ts',
        'packages/semantic-runtime/src/resources/custom-attribute-definition.ts',
        'packages/semantic-runtime/src/resources/custom-element-definition.ts',
        'packages/semantic-runtime/src/resources/resource-definition.ts',
        'packages/semantic-runtime/src/resources/value-converter-definition.ts',
        'packages/semantic-runtime/src/resources/watch-definition.ts',
      ],
      excludeClassNameSuffixes: ['Contribution'],
    },
    summary: 'Resource definition headers and full metadata models before DI admission or template compilation.',
  },
  ResourceContributions: {
    surface: KernelSubstrateModelSurface.ResourceContribution,
    match: {
      classNameSuffixes: ['DefinitionContribution'],
    },
    summary: 'Per-source resource definition contributions before convergence.',
  },
  ResourceObservations: {
    surface: KernelSubstrateModelSurface.ResourceObservation,
    match: {
      files: ['packages/semantic-runtime/src/resources/resource-observation.ts'],
    },
    summary: 'Resource carrier observations before definition materialization.',
  },
  ResourceRecognition: {
    surface: KernelSubstrateModelSurface.ResourceRecognition,
    match: {
      files: [
        'packages/semantic-runtime/src/resources/named-resource-recognizer.ts',
        'packages/semantic-runtime/src/resources/resource-field-readers.ts',
        'packages/semantic-runtime/src/resources/resource-recognition-context.ts',
        'packages/semantic-runtime/src/resources/resource-recognition-kernel-emitter.ts',
        'packages/semantic-runtime/src/resources/resource-recognition-pass.ts',
        'packages/semantic-runtime/src/resources/resource-recognition-project-pass.ts',
        'packages/semantic-runtime/src/resources/syntax-resource-recognizer.ts',
      ],
    },
    summary: 'Resource recognizers, readers, passes, and kernel emission support.',
  },
  ResourceConvergence: {
    surface: KernelSubstrateModelSurface.ResourceConvergence,
    match: {
      files: ['packages/semantic-runtime/src/resources/resource-definition-converger.ts'],
    },
    summary: 'Resource definition convergers that turn recognized headers into full metadata definition products.',
  },
  ResourceReferences: {
    surface: KernelSubstrateModelSurface.ResourceReference,
    match: {
      files: [
        'packages/semantic-runtime/src/resources/resource-definition-index.ts',
        'packages/semantic-runtime/src/resources/resource-kind.ts',
        'packages/semantic-runtime/src/resources/resource-reference.ts',
      ],
    },
    summary: 'Resource target, runtime key, alias, dependency, and instruction reference models.',
  },
  ResourceBuiltInCatalogs: {
    surface: KernelSubstrateModelSurface.ResourceBuiltInCatalog,
    match: {
      files: [
        'packages/semantic-runtime/src/resources/built-in-resources.ts',
        'packages/semantic-runtime/src/resources/built-in-resource-catalog-materializer.ts',
      ],
    },
    summary: 'Framework-owned built-in resource catalogs, resource headers, configured selections, and materializers.',
  },
  RegistrationAdmissions: {
    surface: KernelSubstrateModelSurface.RegistrationAdmission,
    match: {
      files: ['packages/semantic-runtime/src/registration/registration-admission.ts'],
    },
    summary: 'Normalized registration admissions before DI world construction spends them.',
  },
  RegistrationObservations: {
    surface: KernelSubstrateModelSurface.RegistrationObservation,
    match: {
      files: ['packages/semantic-runtime/src/registration/registration-observation.ts'],
    },
    summary: 'Registration carrier observations before admission materialization.',
  },
  RegistrationReferences: {
    surface: KernelSubstrateModelSurface.RegistrationReference,
    match: {
      files: ['packages/semantic-runtime/src/registration/registration-reference.ts'],
    },
    summary: 'Registration key and value reference records before DI world construction.',
  },
  RegistrationEmission: {
    surface: KernelSubstrateModelSurface.RegistrationEmission,
    match: {
      files: ['packages/semantic-runtime/src/registration/registration-kernel-emitter.ts'],
    },
    summary: 'Registration emission support that materializes kernel records and typed admission products.',
  },
  RegistrationRecognition: {
    surface: KernelSubstrateModelSurface.RegistrationRecognition,
    match: {
      files: [
        'packages/semantic-runtime/src/registration/registration-factory-shapes.ts',
        'packages/semantic-runtime/src/registration/registration-recognition-pass.ts',
        'packages/semantic-runtime/src/registration/registration-factory-recognizer.ts',
      ],
    },
    summary: 'Registration recognizers and pass orchestration.',
  },
  TemplateParseContexts: {
    surface: KernelSubstrateModelSurface.TemplateParseContext,
    match: {
      files: ['packages/semantic-runtime/src/template/parse-context.ts'],
    },
    summary: 'Inquiry-aware parse contexts that carry recovery and frontier pressure into parsers and lowering.',
  },
  TemplateCompilerWorlds: {
    surface: KernelSubstrateModelSurface.TemplateCompilerWorld,
    match: {
      files: [
        'packages/semantic-runtime/src/template/compiler-world.ts',
        'packages/semantic-runtime/src/template/compiler-world-materializer.ts',
      ],
    },
    summary: 'Compiler worlds, resource scopes, visible resources, and compiler service references.',
  },
  TemplateCompilationUnits: {
    surface: KernelSubstrateModelSurface.TemplateCompilationUnit,
    match: {
      files: [
        'packages/semantic-runtime/src/template/compilation-unit.ts',
        'packages/semantic-runtime/src/template/compilation-unit-materializer.ts',
        'packages/semantic-runtime/src/template/template-compilation-project-pass.ts',
      ],
    },
    summary: 'Compiler-front-door sources, compilation units, runtime-shaped compilation contexts, and project-level template entrypoint.',
  },
  TemplateHtmlIr: {
    surface: KernelSubstrateModelSurface.TemplateHtmlIr,
    match: {
      files: [
        'packages/semantic-runtime/src/template/html-ir.ts',
        'packages/semantic-runtime/src/template/html-parse-materializer.ts',
      ],
    },
    summary: 'Authored HTML documents, nodes, attributes, comments, and parser recovery observations.',
  },
  TemplateAttributeSyntax: {
    surface: KernelSubstrateModelSurface.TemplateAttributeSyntax,
    match: {
      files: [
        'packages/semantic-runtime/src/template/attribute-syntax.ts',
        'packages/semantic-runtime/src/template/attribute-classification-materializer.ts',
        'packages/semantic-runtime/src/template/attribute-syntax-materializer.ts',
      ],
    },
    summary: 'Attribute parser syntax, attribute-pattern executables, parser service models, and classifications.',
  },
  TemplateValueSites: {
    surface: KernelSubstrateModelSurface.TemplateValueSites,
    match: {
      files: [
        'packages/semantic-runtime/src/template/value-site.ts',
        'packages/semantic-runtime/src/template/value-site-materializer.ts',
      ],
    },
    summary: 'Compiler-owned authored-value selection into template value-site products and expression parser publications.',
  },
  TemplateBindingCommandExecution: {
    surface: KernelSubstrateModelSurface.TemplateBindingCommandExecution,
    match: {
      files: [
        'packages/semantic-runtime/src/template/binding-command-execution.ts',
        'packages/semantic-runtime/src/template/binding-command-lowering-materializer.ts',
      ],
    },
    summary: 'Binding-command executables, resolver state, command build inputs, inline multi-binding segment/lowering products, and command-owned instruction materialization.',
  },
  TemplateCompiledTemplates: {
    surface: KernelSubstrateModelSurface.TemplateCompiledTemplate,
    match: {
      files: [
        'packages/semantic-runtime/src/template/compiled-template.ts',
        'packages/semantic-runtime/src/template/compiled-template-materializer.ts',
      ],
    },
    summary: 'Compiled-template handoff products: render targets, instruction rows, and visible compiler DOM gaps before runtime Rendering.',
  },
  TemplateBuiltInSyntax: {
    surface: KernelSubstrateModelSurface.TemplateBuiltInSyntax,
    match: {
      files: [
        'packages/semantic-runtime/src/template/built-in-syntax.ts',
        'packages/semantic-runtime/src/template/built-in-syntax-catalog-materializer.ts',
      ],
    },
    summary: 'Framework-provided attribute-pattern and binding-command syntax catalogs.',
  },
  TemplateRuntimeRenderers: {
    surface: KernelSubstrateModelSurface.TemplateRuntimeRenderer,
    match: {
      files: [
        'packages/semantic-runtime/src/template/runtime-renderer.ts',
        'packages/semantic-runtime/src/template/runtime-renderer-catalog-materializer.ts',
      ],
    },
    summary: 'Framework-provided runtime renderer catalogs, renderer products, and configured renderer selection.',
  },
  TemplateInstructions: {
    surface: KernelSubstrateModelSurface.TemplateInstructionIr,
    match: {
      files: ['packages/semantic-runtime/src/template/instruction-ir.ts'],
    },
    summary: 'Lowered rendering instruction products and instruction sequences.',
  },
  TemplateRuntimeBindings: {
    surface: KernelSubstrateModelSurface.TemplateRuntimeBinding,
    match: {
      files: [
        'packages/semantic-runtime/src/template/runtime-controller.ts',
        'packages/semantic-runtime/src/template/runtime-binding.ts',
        'packages/semantic-runtime/src/template/runtime-rendering-materializer.ts',
      ],
    },
    summary: 'Runtime controller frames, binding instances, and scope effects emulated from renderer semantics after instruction lowering.',
  },
  TemplateScopes: {
    surface: KernelSubstrateModelSurface.TemplateScope,
    match: {
      files: ['packages/semantic-runtime/src/template/template-controller-scope-materializer.ts'],
    },
    summary: 'Template binding-scope construction from controller, repeat, let, and TypeChecker facts.',
  },
  RouterModels: {
    surface: KernelSubstrateModelSurface.RouterModel,
    match: {
      pathPrefixes: ['packages/semantic-runtime/src/router/'],
    },
    summary: 'Router configuration, route, context, instruction, and built-in resource model anchors.',
  },
} as const;

/**
 * Kernel helper classes that substrate lenses should not classify as semantic product models on their own.
 *
 * This is intentionally source-owned because these names are allowed to change while the product is evolving.
 */
export const KernelSubstrateSupportClasses = {
  DerivationLink: {
    className: 'DerivationLink',
    summary: 'Compact provenance pointer to a derivation record.',
  },
  FieldProvenance: {
    className: 'FieldProvenance',
    summary: 'Field-level provenance helper carried by larger semantic records.',
  },
  KernelHandleFactory: {
    className: 'KernelHandleFactory',
    summary: 'Store-local handle minting helper.',
  },
  KernelStore: {
    className: 'KernelStore',
    summary: 'Hot in-memory record store rather than a semantic product model.',
  },
  KernelStoreBatch: {
    className: 'KernelStoreBatch',
    summary: 'Record-emission batch rather than a semantic product model.',
  },
  KernelVocabularyDefinition: {
    className: 'KernelVocabularyDefinition',
    summary: 'Vocabulary catalog entry rather than a semantic product model.',
  },
  ProductDetailCatalog: {
    className: 'ProductDetailCatalog',
    summary: 'Hot product-detail sidecar for current-run inquiry expansion rather than a kernel record.',
  },
  ProductDetailEntry: {
    className: 'ProductDetailEntry',
    summary: 'Typed current-run detail attachment for a materialized product rather than durable product truth.',
  },
  ProductDetailSlot: {
    className: 'ProductDetailSlot',
    summary: 'Typed detail-slot contract tied to one product-kind vocabulary key.',
  },
} as const;
