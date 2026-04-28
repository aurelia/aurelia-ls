/**
 * MCP-aware product contract for source-analysis substrate lenses.
 *
 * This file is intentionally visible to tools such as au-mcp. It gives those tools stable product-owned handles for
 * facts that are not carried cleanly by TypeScript types yet, so the MCP does not need private product-specific
 * pattern tables. These declarations are mapping aids for source inventory and projection; they are not runtime
 * semantics, kernel record truth, public API, or persistence schema.
 *
 * Keep this file small. Prefer strengthening the real model types first. If an MCP lens starts needing a private
 * table to understand source-analysis structure, add or adjust the smallest product-owned contract here instead.
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
  /** Static evaluator open-seam records and kernel bridge. */
  EvaluationSeam = 'evaluation-seam',
  /** Static evaluator readers, host adapters, and evaluator entrypoints. */
  EvaluationSupport = 'evaluation-support',
  /** Aurelia app admission, app-root, and root configuration models. */
  ConfigurationApp = 'configuration-app',
  /** Ordered configuration flow, steps, and option contribution models. */
  ConfigurationFlow = 'configuration-flow',
  /** Deferred AppTask and lifecycle-slot dispatch models. */
  ConfigurationAppTask = 'configuration-app-task',
  /** Controller ontology used to connect app roots, containers, resources, and template phases. */
  ConfigurationController = 'configuration-controller',
  /** Configuration recognition observations before kernel product materialization. */
  ConfigurationObservation = 'configuration-observation',
  /** Configuration recognition producers, context, and pass orchestration. */
  ConfigurationRecognition = 'configuration-recognition',
  /** Configuration producer support that emits kernel records for recognized configuration flow. */
  ConfigurationEmission = 'configuration-emission',
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
  /** Aurelia expression AST nodes. */
  ExpressionAst = 'expression-ast',
  /** Expression parse result, failure, selection, and candidate algebra. */
  ExpressionParseAlgebra = 'expression-parse-algebra',
  /** Expression parser corridors, scanner, and parser state machinery. */
  ExpressionParser = 'expression-parser',
  /** Resource definition headers and converged resource definition models. */
  ResourceDefinition = 'resource-definition',
  /** Per-source resource definition contributions. */
  ResourceContribution = 'resource-contribution',
  /** Resource recognition observations before definition materialization. */
  ResourceObservation = 'resource-observation',
  /** Resource recognition producers and pass orchestration. */
  ResourceRecognition = 'resource-recognition',
  /** Resource target, alias, dependency, and instruction references. */
  ResourceReference = 'resource-reference',
  /** Normalized registration admission records. */
  RegistrationAdmission = 'registration-admission',
  /** Registration recognition observations before admission materialization. */
  RegistrationObservation = 'registration-observation',
  /** Registration key and value references before DI world construction. */
  RegistrationReference = 'registration-reference',
  /** Registration producer support that emits kernel records for admission observations. */
  RegistrationEmission = 'registration-emission',
  /** Registration recognition producers and pass orchestration. */
  RegistrationRecognition = 'registration-recognition',
  /** Template parse contexts carrying inquiry pressure into parsers and lowering. */
  TemplateParseContext = 'template-parse-context',
  /** Template compiler worlds, resource scopes, and compiler service references. */
  TemplateCompilerWorld = 'template-compiler-world',
  /** Authored HTML IR before Aurelia syntax classification. */
  TemplateHtmlIr = 'template-html-ir',
  /** Attribute parser syntax and classification products. */
  TemplateAttributeSyntax = 'template-attribute-syntax',
  /** Binding-command executable, resolver, build-input, and lowering products. */
  TemplateBindingCommandExecution = 'template-binding-command-execution',
  /** Framework-provided syntax resource catalogs for template compiler worlds. */
  TemplateBuiltInSyntax = 'template-built-in-syntax',
  /** Lowered rendering instruction products. */
  TemplateInstructionIr = 'template-instruction-ir',
}

/**
 * Product-owned model-surface mappings for MCP/source-analysis inventory.
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
        'packages/source-analysis/src/aurelia/kernel/address.ts',
        'packages/source-analysis/src/aurelia/kernel/claim.ts',
        'packages/source-analysis/src/aurelia/kernel/derivation.ts',
        'packages/source-analysis/src/aurelia/kernel/evidence.ts',
        'packages/source-analysis/src/aurelia/kernel/identity.ts',
        'packages/source-analysis/src/aurelia/kernel/materialization.ts',
        'packages/source-analysis/src/aurelia/kernel/note.ts',
        'packages/source-analysis/src/aurelia/kernel/provenance.ts',
      ],
      excludeClassNames: ['DerivationLink', 'FieldProvenance'],
    },
    summary: 'Record classes that are directly eligible for KernelStore storage or expansion.',
  },
  KernelSupport: {
    surface: KernelSubstrateModelSurface.KernelSupport,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/kernel/handles.ts',
        'packages/source-analysis/src/aurelia/kernel/store.ts',
        'packages/source-analysis/src/aurelia/kernel/vocabulary.ts',
      ],
      classNames: [
        'DerivationLink',
        'FieldProvenance',
        'KernelHandleFactory',
        'KernelStore',
        'KernelStoreBatch',
        'KernelVocabularyDefinition',
      ],
    },
    summary: 'Kernel support classes and catalogs that help records exist but are not semantic products by themselves.',
  },
  BootFrames: {
    surface: KernelSubstrateModelSurface.BootFrame,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/boot/frames.ts',
        'packages/source-analysis/src/aurelia/boot/source-discovery.ts',
      ],
    },
    summary: 'Boot-time source admission and workspace/project frame records.',
  },
  InquiryContracts: {
    surface: KernelSubstrateModelSurface.InquiryContract,
    match: {
      pathPrefixes: ['packages/source-analysis/src/aurelia/inquiry/'],
    },
    summary: 'Inquiry inputs and answer-envelope records used to query the hot analysis world.',
  },
  EvaluationCompletions: {
    surface: KernelSubstrateModelSurface.EvaluationCompletion,
    match: {
      files: ['packages/source-analysis/src/aurelia/evaluation/completion.ts'],
    },
    summary: 'Evaluator completion records based on ECMAScript-style control flow results.',
  },
  EvaluationEnvironments: {
    surface: KernelSubstrateModelSurface.EvaluationEnvironment,
    match: {
      files: ['packages/source-analysis/src/aurelia/evaluation/environment.ts'],
    },
    summary: 'Evaluator environment records and mutable binding state.',
  },
  EvaluationModuleGraphs: {
    surface: KernelSubstrateModelSurface.EvaluationModuleGraph,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/evaluation/module-graph.ts',
        'packages/source-analysis/src/aurelia/evaluation/module-host.ts',
        'packages/source-analysis/src/aurelia/evaluation/module-evaluator.ts',
      ],
    },
    summary: 'Static module graph records, host adapters, and graph evaluation results.',
  },
  EvaluationValues: {
    surface: KernelSubstrateModelSurface.EvaluationValue,
    match: {
      files: ['packages/source-analysis/src/aurelia/evaluation/values.ts'],
    },
    summary: 'Abstract values produced by static evaluation.',
  },
  EvaluationSeams: {
    surface: KernelSubstrateModelSurface.EvaluationSeam,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/evaluation/seams.ts',
        'packages/source-analysis/src/aurelia/evaluation/kernel-bridge.ts',
      ],
    },
    summary: 'Evaluator open seams and their kernel emission bridge.',
  },
  EvaluationSupport: {
    surface: KernelSubstrateModelSurface.EvaluationSupport,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/evaluation/evaluator.ts',
        'packages/source-analysis/src/aurelia/evaluation/expression-reader.ts',
        'packages/source-analysis/src/aurelia/evaluation/ts-syntax.ts',
      ],
    },
    summary: 'Evaluator entrypoints, expression readers, and TypeScript syntax helpers.',
  },
  ConfigurationApps: {
    surface: KernelSubstrateModelSurface.ConfigurationApp,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/configuration/aurelia.ts',
        'packages/source-analysis/src/aurelia/configuration/app-root.ts',
      ],
    },
    summary: 'Aurelia facade, AppRoot, and app-root configuration models used before DI world construction.',
  },
  ConfigurationFlow: {
    surface: KernelSubstrateModelSurface.ConfigurationFlow,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/configuration/configuration-sequence.ts',
        'packages/source-analysis/src/aurelia/configuration/configuration-option.ts',
      ],
    },
    summary: 'Ordered configuration sequences, steps, and option contributions before registration or DI spending.',
  },
  ConfigurationAppTasks: {
    surface: KernelSubstrateModelSurface.ConfigurationAppTask,
    match: {
      files: ['packages/source-analysis/src/aurelia/configuration/app-task.ts'],
    },
    summary: 'Deferred IAppTask definitions and AppRoot lifecycle-slot dispatch points.',
  },
  ConfigurationControllers: {
    surface: KernelSubstrateModelSurface.ConfigurationController,
    match: {
      files: ['packages/source-analysis/src/aurelia/configuration/controller.ts'],
    },
    summary: 'Controller ontology that tracks runtime controller kind and compiler/hydration phase boundaries.',
  },
  ConfigurationObservations: {
    surface: KernelSubstrateModelSurface.ConfigurationObservation,
    match: {
      files: ['packages/source-analysis/src/aurelia/configuration/configuration-observation.ts'],
    },
    summary: 'Source-level configuration observations before app, option, registration, and AppTask materialization.',
  },
  ConfigurationRecognition: {
    surface: KernelSubstrateModelSurface.ConfigurationRecognition,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/configuration/configuration-recognition-context.ts',
        'packages/source-analysis/src/aurelia/configuration/configuration-recognition-pass.ts',
        'packages/source-analysis/src/aurelia/configuration/configuration-recognition-producer.ts',
      ],
    },
    summary: 'Configuration recognition context, source scanner, and pass orchestration.',
  },
  ConfigurationEmission: {
    surface: KernelSubstrateModelSurface.ConfigurationEmission,
    match: {
      files: ['packages/source-analysis/src/aurelia/configuration/configuration-kernel-emitter.ts'],
    },
    summary: 'Configuration emission support that materializes recognized configuration flow into kernel records.',
  },
  DiContainers: {
    surface: KernelSubstrateModelSurface.DiContainer,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/container.ts'],
      classNames: ['Container', 'ContainerReference'],
    },
    summary: 'Abstract Aurelia containers and container references used by DI world construction.',
  },
  DiConfigurations: {
    surface: KernelSubstrateModelSurface.DiConfiguration,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/container-configuration.ts'],
    },
    summary: 'Container configuration values that affect abstract DI world construction.',
  },
  DiLookups: {
    surface: KernelSubstrateModelSurface.DiLookup,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/container-lookup.ts'],
    },
    summary: 'Lookup answer records returned by abstract DI container emulation methods.',
  },
  DiResolvers: {
    surface: KernelSubstrateModelSurface.DiResolver,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/resolver.ts'],
    },
    summary: 'Runtime-shaped resolver values and resolver-resolution answer records.',
  },
  DiRegistries: {
    surface: KernelSubstrateModelSurface.DiRegistry,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/registry.ts'],
    },
    summary: 'Runtime-shaped registry values and registry-registration answer records.',
  },
  DiOperations: {
    surface: KernelSubstrateModelSurface.DiOperation,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/container-registration.ts'],
    },
    summary: 'DI operations that spend registration/configuration facts into container state.',
  },
  DiSlots: {
    surface: KernelSubstrateModelSurface.DiSlot,
    match: {
      files: ['packages/source-analysis/src/aurelia/di/container-slot.ts'],
    },
    summary: 'Container-owned resolver, resource, and factory slots produced by DI world construction.',
  },
  ExpressionAst: {
    surface: KernelSubstrateModelSurface.ExpressionAst,
    match: {
      files: ['packages/source-analysis/src/aurelia/expression/ast.ts'],
    },
    summary: 'Aurelia expression AST node classes.',
  },
  ExpressionParseAlgebra: {
    surface: KernelSubstrateModelSurface.ExpressionParseAlgebra,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/expression/parse-failure.ts',
        'packages/source-analysis/src/aurelia/expression/parse-result-algebra.ts',
        'packages/source-analysis/src/aurelia/expression/parse-selection.ts',
      ],
    },
    summary: 'Expression parse outcomes, failure records, and selection/candidate result algebra.',
  },
  ExpressionParsers: {
    surface: KernelSubstrateModelSurface.ExpressionParser,
    match: {
      pathPrefixes: ['packages/source-analysis/src/aurelia/expression/'],
      excludeFiles: [
        'packages/source-analysis/src/aurelia/expression/ast.ts',
        'packages/source-analysis/src/aurelia/expression/parse-failure.ts',
        'packages/source-analysis/src/aurelia/expression/parse-result-algebra.ts',
        'packages/source-analysis/src/aurelia/expression/parse-selection.ts',
      ],
    },
    summary: 'Expression parser corridors, scanner, parser state, and parser integration helpers.',
  },
  ResourceDefinitions: {
    surface: KernelSubstrateModelSurface.ResourceDefinition,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/resources/attribute-pattern-definition.ts',
        'packages/source-analysis/src/aurelia/resources/bindable-definition.ts',
        'packages/source-analysis/src/aurelia/resources/binding-behavior-definition.ts',
        'packages/source-analysis/src/aurelia/resources/binding-command-definition.ts',
        'packages/source-analysis/src/aurelia/resources/custom-attribute-definition.ts',
        'packages/source-analysis/src/aurelia/resources/custom-element-definition.ts',
        'packages/source-analysis/src/aurelia/resources/resource-definition.ts',
        'packages/source-analysis/src/aurelia/resources/value-converter-definition.ts',
        'packages/source-analysis/src/aurelia/resources/watch-definition.ts',
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
      files: ['packages/source-analysis/src/aurelia/resources/resource-observation.ts'],
    },
    summary: 'Resource carrier observations before definition materialization.',
  },
  ResourceRecognition: {
    surface: KernelSubstrateModelSurface.ResourceRecognition,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/resources/named-resource-recognition-producer.ts',
        'packages/source-analysis/src/aurelia/resources/resource-field-readers.ts',
        'packages/source-analysis/src/aurelia/resources/resource-recognition-context.ts',
        'packages/source-analysis/src/aurelia/resources/resource-recognition-kernel-emitter.ts',
        'packages/source-analysis/src/aurelia/resources/resource-recognition-pass.ts',
        'packages/source-analysis/src/aurelia/resources/resource-recognition-project-pass.ts',
        'packages/source-analysis/src/aurelia/resources/syntax-resource-recognition-producer.ts',
      ],
    },
    summary: 'Resource recognition producers, readers, passes, and kernel emission support.',
  },
  ResourceReferences: {
    surface: KernelSubstrateModelSurface.ResourceReference,
    match: {
      files: ['packages/source-analysis/src/aurelia/resources/resource-reference.ts'],
    },
    summary: 'Resource target, alias, dependency, and instruction reference models.',
  },
  RegistrationAdmissions: {
    surface: KernelSubstrateModelSurface.RegistrationAdmission,
    match: {
      files: ['packages/source-analysis/src/aurelia/registration/registration-admission.ts'],
    },
    summary: 'Normalized registration admissions before DI world construction spends them.',
  },
  RegistrationObservations: {
    surface: KernelSubstrateModelSurface.RegistrationObservation,
    match: {
      files: ['packages/source-analysis/src/aurelia/registration/registration-observation.ts'],
    },
    summary: 'Registration carrier observations before admission materialization.',
  },
  RegistrationReferences: {
    surface: KernelSubstrateModelSurface.RegistrationReference,
    match: {
      files: ['packages/source-analysis/src/aurelia/registration/registration-reference.ts'],
    },
    summary: 'Registration key and value reference records before DI world construction.',
  },
  RegistrationEmission: {
    surface: KernelSubstrateModelSurface.RegistrationEmission,
    match: {
      files: ['packages/source-analysis/src/aurelia/registration/registration-kernel-emitter.ts'],
    },
    summary: 'Registration producer support that emits kernel records and typed admission products.',
  },
  RegistrationRecognition: {
    surface: KernelSubstrateModelSurface.RegistrationRecognition,
    match: {
      files: [
        'packages/source-analysis/src/aurelia/registration/registration-factory-shapes.ts',
        'packages/source-analysis/src/aurelia/registration/registration-recognition-pass.ts',
        'packages/source-analysis/src/aurelia/registration/registration-recognition-producer.ts',
      ],
    },
    summary: 'Registration recognition producers and pass orchestration.',
  },
  TemplateParseContexts: {
    surface: KernelSubstrateModelSurface.TemplateParseContext,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/parse-context.ts'],
    },
    summary: 'Inquiry-aware parse contexts that carry recovery and frontier pressure into parsers and lowering.',
  },
  TemplateCompilerWorlds: {
    surface: KernelSubstrateModelSurface.TemplateCompilerWorld,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/compiler-world.ts'],
    },
    summary: 'Compiler worlds, resource scopes, visible resources, and compiler service references.',
  },
  TemplateHtmlIr: {
    surface: KernelSubstrateModelSurface.TemplateHtmlIr,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/html-ir.ts'],
    },
    summary: 'Authored HTML documents, nodes, attributes, comments, and parser recovery observations.',
  },
  TemplateAttributeSyntax: {
    surface: KernelSubstrateModelSurface.TemplateAttributeSyntax,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/attribute-syntax.ts'],
    },
    summary: 'Attribute parser syntax, attribute-pattern executables, parser service models, and classifications.',
  },
  TemplateBindingCommandExecution: {
    surface: KernelSubstrateModelSurface.TemplateBindingCommandExecution,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/binding-command-execution.ts'],
    },
    summary: 'Binding-command executables, resolver state, command build inputs, and lowering products.',
  },
  TemplateBuiltInSyntax: {
    surface: KernelSubstrateModelSurface.TemplateBuiltInSyntax,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/built-in-syntax.ts'],
    },
    summary: 'Framework-provided attribute-pattern and binding-command syntax catalogs.',
  },
  TemplateInstructions: {
    surface: KernelSubstrateModelSurface.TemplateInstructionIr,
    match: {
      files: ['packages/source-analysis/src/aurelia/template/instruction-ir.ts'],
    },
    summary: 'Lowered rendering instruction products and instruction sequences.',
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
    summary: 'Producer emission batch rather than a semantic product model.',
  },
  KernelVocabularyDefinition: {
    className: 'KernelVocabularyDefinition',
    summary: 'Vocabulary catalog entry rather than a semantic product model.',
  },
} as const;
