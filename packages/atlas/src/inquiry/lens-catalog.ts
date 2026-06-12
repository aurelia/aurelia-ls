import { EvidenceKind } from "./evidence.js";
import {
  LensFamily,
  LensId,
  LensStage,
  ParameterRole,
  type LensSpec,
} from "./lens-contracts.js";
import { LocusKind } from "./locus.js";
import { SubstrateId } from "./substrate.js";

/** Static lens contracts known to Atlas. */
export const LensCatalog: readonly LensSpec[] = [
  {
    id: LensId.RepoMap,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary:
      "Orient around repository terrain, substrates, lenses, and active semantic priorities.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package],
    requiredSubstrates: [SubstrateId.RepoTerrain, SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Compact orientation map." },
      {
        id: "contracts",
        summary: "Terrain, substrate, and lens contract inventory.",
      },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.RepoTerrain,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary:
      "Classify active, deferred, external, and generated repository terrain.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea],
    requiredSubstrates: [SubstrateId.RepoTerrain],
    projections: [
      { id: "summary", summary: "Terrain rollup." },
      { id: "areas", summary: "Area rows with status and ownership." },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.TsSource,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Inspect exact source text, source ranges, and source-backed evidence.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
      LocusKind.GitTree,
    ],
    requiredSubstrates: [
      SubstrateId.SourceFiles,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Source metadata and evidence handles." },
      {
        id: "text",
        summary: "Source text capped by the textChars budget.",
        defaultBudget: { textChars: 20_000 },
      },
    ],
    parameters: [
      {
        id: "sourcePart",
        role: ParameterRole.Projection,
        summary: "Select name, declaration, body, file, or exact range text.",
      },
      {
        id: "treeish",
        role: ParameterRole.Basis,
        summary: "Use a git-tree basis for historical source.",
      },
    ],
    outputKinds: [EvidenceKind.SourceSpan, EvidenceKind.Symbol],
    defaultBudget: { textChars: 20_000 },
  },
  {
    id: LensId.TsStructure,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Read TypeScript project shape: API surface, module graph, declarations, symbols, imports, and exports.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.SourceFiles,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Scope rollup." },
      { id: "api", summary: "API surface and declaration rows." },
      { id: "module-graph", summary: "Import/export graph rows." },
      {
        id: "document-symbols",
        summary: "Language-service document symbol tree rows.",
      },
      { id: "symbols", summary: "Symbol search and document symbol rows." },
      {
        id: "exports",
        summary:
          "Checker-visible exports from package entrypoints or selected module files.",
      },
    ],
    parameters: [
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter symbol or export rows by exact substring.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Filter export rows by checker-visible member/property name.",
      },
    ],
    outputKinds: [
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
      EvidenceKind.MaintenanceSignal,
    ],
    defaultBudget: { rows: 120 },
  },
  {
    id: LensId.TsType,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Inspect checker facts for symbols, source ranges, reference roles, call hierarchy, and carrier flow.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      {
        id: "guide",
        summary:
          "Compact IDE-like TypeScript request guide with exact package, symbol, source, and edit-affordance recipes.",
      },
      {
        id: "facts",
        summary: "Checker-visible type, signature, and symbol facts.",
      },
      { id: "references", summary: "Reference and role evidence." },
      {
        id: "definitions",
        summary: "Definitions, type definitions, and implementations.",
      },
      {
        id: "call-hierarchy",
        summary: "Incoming and outgoing call hierarchy edges.",
      },
      {
        id: "call-sites",
        summary:
          "Exact call expressions, callee facts, resolved signatures, and argument facts.",
      },
      {
        id: "diagnostics",
        summary: "Syntactic, semantic, and suggestion diagnostics.",
      },
      {
        id: "quick-info",
        summary: "Language-service quick info for selected targets.",
      },
      {
        id: "signature-help",
        summary: "Language-service signature help for call positions.",
      },
      {
        id: "highlights",
        summary: "Language-service document highlights across selected files.",
      },
      {
        id: "rename",
        summary: "Rename availability and exact rename locations.",
      },
      { id: "refactors", summary: "Applicable TypeScript refactor actions." },
      {
        id: "code-fixes",
        summary: "Code-fix actions with exact TypeScript edit payloads.",
      },
      {
        id: "refactor-edits",
        summary:
          "Concrete TypeScript refactor edit plan for a selected action.",
      },
      {
        id: "organize-imports",
        summary: "Organize-imports edit payloads for selected files.",
      },
      {
        id: "file-rename-edits",
        summary: "Import/reference rewrite edit payloads for a file rename.",
      },
      { id: "flow", summary: "Carrier and method-effect evidence." },
    ],
    parameters: [
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact call-site rows by callee symbol or property name.",
      },
      {
        id: "argumentText",
        role: ParameterRole.Filter,
        summary:
          "Filter exact call-site rows by runtime argument source text.",
      },
      {
        id: "argumentSymbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact call-site rows by checker symbol name of a runtime argument.",
      },
      {
        id: "argumentFullyQualifiedName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact call-site rows by canonical checker fully qualified name of a runtime argument.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary: "Filter exact call-site rows by call or new syntax family.",
        values: ["call", "new"],
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
    ],
    defaultBudget: {
      rows: 80,
      facts: 40,
      members: 20,
      evidencePerSubject: 3,
      depth: 4,
    },
  },
  {
    id: LensId.ProductVocabulary,
    family: LensFamily.Product,
    stage: LensStage.Implemented,
    summary:
      "Read semantic-runtime vocabulary definitions, exact usages, claim signatures, and product-kind adjacency.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.ProductVocabulary],
    projections: [
      {
        id: "summary",
        summary:
          "Vocabulary rollup with definition, usage, claim-schema, and claim-graph counts.",
      },
      { id: "catalog", summary: "Declared vocabulary definition catalog." },
      {
        id: "usage",
        summary:
          "Exact definition and key-read usage rows outside the vocabulary package.",
      },
      {
        id: "claim-schema",
        summary:
          "Claim predicate signatures with endpoint and product-kind constraints.",
      },
      {
        id: "claim-graph",
        summary:
          "Product-kind adjacency edges expanded from claim predicate signatures.",
      },
      {
        id: "claim-issues",
        summary:
          "Exact claim-signature parse and product-kind reference issues.",
      },
    ],
    parameters: [
      {
        id: "slot",
        role: ParameterRole.Filter,
        summary:
          "Filter vocabulary entries by slot such as product-kind or claim-predicate.",
      },
      {
        id: "namespace",
        role: ParameterRole.Filter,
        summary: "Filter vocabulary rows by namespace such as Compiler or Di.",
      },
      {
        id: "rootName",
        role: ParameterRole.Filter,
        summary:
          "Filter source usage rows by vocabulary object root such as KernelVocabulary or KernelProductKinds.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Filter vocabulary rows by exported member name.",
      },
      {
        id: "accessKind",
        role: ParameterRole.Filter,
        summary: "Filter vocabulary usage rows by definition-read or key-read.",
      },
      {
        id: "endpointKind",
        role: ParameterRole.Filter,
        summary:
          "Filter claim schema rows by endpoint family such as product or identity.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary:
          "Filter claim schema or graph rows by product-kind id or key.",
      },
      {
        id: "predicateKey",
        role: ParameterRole.Filter,
        summary:
          "Filter claim graph or issue rows by exact claim predicate key.",
      },
      {
        id: "issueKind",
        role: ParameterRole.Filter,
        summary:
          "Filter claim issue rows by exact issue kind.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter product vocabulary rows by exact substring across ids, summaries, values, and source paths.",
      },
    ],
    outputKinds: [
      EvidenceKind.VocabularyTerm,
      EvidenceKind.ProductClaim,
      EvidenceKind.SourceSpan,
      EvidenceKind.MaintenanceSignal,
    ],
    defaultBudget: { rows: 100 },
  },
  {
    id: LensId.ProductArchitecture,
    family: LensFamily.Product,
    stage: LensStage.Implemented,
    summary:
      "Read semantic-runtime source areas, modules, import dependencies, declaration surfaces, implementation bodies, and checker-backed symbol coupling.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.ProductArchitecture,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Architecture rollup with area, module, declaration, and cross-area dependency counts.",
      },
      {
        id: "areas",
        summary:
          "Top-level semantic-runtime source areas with declaration and dependency counts.",
      },
      {
        id: "modules",
        summary:
          "Source files with line, declaration, export, import, fan-in, and fan-out counts.",
      },
      {
        id: "dependencies",
        summary:
          "Import declaration rows resolved to local semantic-runtime targets when possible.",
      },
      {
        id: "area-dependencies",
        summary:
          "Grouped area-to-area import dependency rows for compact coupling pressure.",
      },
      {
        id: "declarations",
        summary:
          "Source declaration surfaces by area, file, kind, export, and top-level status.",
      },
      {
        id: "cycles",
        summary:
          "Strongly-connected local import groups with participating files, areas, and internal dependency counts.",
      },
      {
        id: "classes",
        summary:
          "Class implementation surfaces with heritage, member counts, and source-span size.",
      },
      {
        id: "functions",
        summary:
          "Function, method, constructor, and accessor bodies with source-span size.",
      },
      {
        id: "source-templates",
        summary:
          "sourceText(...) template call rows used by semantic-runtime authoring/source-plan code, with static-text fingerprints and source anchors.",
      },
      {
        id: "source-template-duplicates",
        summary:
          "Grouped static sourceText(...) templates that share a normalized source-text fingerprint across carriers/files.",
      },
      {
        id: "function-duplicates",
        summary:
          "Grouped duplicate top-level helper names across files with exact body and AST body-shape fingerprint signals.",
      },
      {
        id: "function-control-flow-shapes",
        summary:
          "Grouped function bodies that share switch-dispatch topology across names/files; a structural canary for parallel walkers and dispatch surfaces.",
      },
      {
        id: "call-sites",
        summary:
          "Exact semantic-runtime call and constructor invocations resolved through the TypeScript checker, with owner function/class and target declaration.",
      },
      {
        id: "call-dependencies",
        summary:
          "Grouped checker-backed call dependencies between semantic-runtime source files and admitted package targets.",
      },
      {
        id: "symbol-references",
        summary:
          "Exact semantic-runtime identifier references resolved through the TypeScript checker, with owner function/class and target declaration.",
      },
      {
        id: "symbol-dependencies",
        summary:
          "Grouped checker-backed symbol dependencies between semantic-runtime source files and admitted package targets.",
      },
      {
        id: "kernel-records",
        summary:
          "Source-level KernelStoreRecord construction sites with record kind, owner function/class, and visible product/predicate/seam/evidence vocabulary expressions.",
      },
      {
        id: "kernel-batches",
        summary:
          "Source-level KernelStoreBatch construction and direct commit sites with records expression, batch label, commit receiver, owner function/class, and source range.",
      },
      {
        id: "field-provenance",
        summary:
          "Source-level FieldProvenance construction sites with field names, provenance handle expressions, owners, and source ranges.",
      },
      {
        id: "profile",
        summary:
          "Cold product.architecture build timings by analysis phase for finding split and cache pressure.",
      },
    ],
    parameters: [
      {
        id: "area",
        role: ParameterRole.Filter,
        summary: "Filter rows by semantic-runtime source area such as template or api.",
      },
      {
        id: "fromArea",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by source area.",
      },
      {
        id: "toArea",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by resolved target area or external.",
      },
      {
        id: "filePath",
        role: ParameterRole.Filter,
        summary: "Filter architecture rows by exact repository-relative file path.",
      },
      {
        id: "pathPrefix",
        role: ParameterRole.Filter,
        summary:
          "Filter architecture rows by repository-relative source path prefix; accepts absolute paths that contain packages/semantic-runtime/src.",
      },
      {
        id: "minLineCount",
        role: ParameterRole.Filter,
        summary: "Filter module, class, or function rows to source spans with at least this many lines.",
      },
      {
        id: "minFunctionSurfaceCount",
        role: ParameterRole.Filter,
        summary: "Filter module rows to files with at least this many function-like body surfaces.",
      },
      {
        id: "minFunctionCount",
        role: ParameterRole.Filter,
        summary:
          "Filter duplicate function groups to names with at least this many top-level function surfaces.",
      },
      {
        id: "minFileCount",
        role: ParameterRole.Filter,
        summary:
          "Filter duplicate function groups to names present in at least this many files.",
      },
      {
        id: "minLargeFunctionCount",
        role: ParameterRole.Filter,
        summary: "Filter module rows to files with at least this many large function-like bodies.",
      },
      {
        id: "minMaxFunctionLineCount",
        role: ParameterRole.Filter,
        summary: "Filter module rows by minimum largest function-like body line count.",
      },
      {
        id: "minCallSiteCount",
        role: ParameterRole.Filter,
        summary: "Filter function rows to bodies with at least this many checker-backed call sites.",
      },
      {
        id: "minDistinctCalleeCount",
        role: ParameterRole.Filter,
        summary: "Filter function rows to bodies with at least this many distinct resolved callees or callee names.",
      },
      {
        id: "minCrossAreaCallSiteCount",
        role: ParameterRole.Filter,
        summary: "Filter function rows to bodies with at least this many cross-area call sites.",
      },
      {
        id: "minRepeatedBodyFingerprintCount",
        role: ParameterRole.Filter,
        summary:
          "Filter duplicate function groups to names with at least this many exact body fingerprints repeated across files.",
      },
      {
        id: "minRepeatedBodyShapeFingerprintCount",
        role: ParameterRole.Filter,
        summary:
          "Filter duplicate function groups to names with at least this many AST/control-flow body-shape fingerprints repeated across files.",
      },
      {
        id: "minMethodCount",
        role: ParameterRole.Filter,
        summary: "Filter class rows to classes with at least this many instance or static methods.",
      },
      {
        id: "minPropertyCount",
        role: ParameterRole.Filter,
        summary: "Filter class rows to classes with at least this many fields, properties, or accessors.",
      },
      {
        id: "fromFilePath",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by exact repository-relative source file path.",
      },
      {
        id: "toFilePath",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by exact repository-relative resolved target file path.",
      },
      {
        id: "declarationKind",
        role: ParameterRole.Filter,
        summary: "Filter declaration rows by Atlas source declaration kind.",
      },
      {
        id: "importKind",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by value-or-type, type-only, or side-effect imports.",
      },
      {
        id: "orderBy",
        role: ParameterRole.Execution,
        summary:
          "Order architecture rows by filePath/source, size/lineCount, bodyPressure/maxFunctionLineCount, functionSurfaceCount, largeFunctionCount, declarationCount, importCount, crossAreaImportCount, incomingImportCount, methodCount, propertyCount, parameterCount, callPressure/callSiteCount, distinctCalleeCount, crossAreaCallSiteCount, callCount, constructorCallCount, memberCallCount, calleeName, argumentCount, crossArea, referenceCount, distinctSymbolCount, runtimeReferenceCount, callReferenceCount, typeReferenceCount, symbolName, or usageRole where applicable.",
        values: [
          "filePath",
          "source",
          "size",
          "lineCount",
          "bodyPressure",
          "maxFunctionLineCount",
          "cyclePressure",
          "callPressure",
          "referencePressure",
          "moduleCount",
          "internalDependencyCount",
          "functionSurfaceCount",
          "largeFunctionCount",
          "declarationCount",
          "importCount",
          "crossAreaImportCount",
          "incomingImportCount",
          "methodCount",
          "propertyCount",
          "parameterCount",
          "callSiteCount",
          "callCount",
          "distinctCalleeCount",
          "crossAreaCallSiteCount",
          "constructorCallCount",
          "memberCallCount",
          "calleeName",
          "argumentCount",
          "crossArea",
          "referenceCount",
          "distinctSymbolCount",
          "runtimeReferenceCount",
          "callReferenceCount",
          "typeReferenceCount",
          "symbolName",
          "usageRole",
          "recordKind",
          "owner",
          "label",
          "labelLiteral",
          "fieldName",
          "functionCount",
          "templateCount",
          "templateName",
          "templateLineCount",
          "templateCharacterCount",
          "templateFingerprint",
          "bodyFingerprint",
          "bodyShapeFingerprint",
          "switchTopologyFingerprint",
          "switchTopologyCount",
        ],
      },
      {
        id: "className",
        role: ParameterRole.Filter,
        summary: "Filter class or function rows by exact owning class name.",
      },
      {
        id: "classNameSuffix",
        role: ParameterRole.Filter,
        summary: "Filter class rows by class declaration name suffix, such as Input.",
      },
      {
        id: "surfaceRole",
        role: ParameterRole.Filter,
        summary:
          "Filter class rows by source-backed class role for navigation pressure.",
        values: [
          "product-owner",
          "publisher",
          "work-frame",
          "data-carrier",
          "service-surface",
          "semantic-model",
          "other",
        ],
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary: "Filter class rows to classes exposing an exact instance or static method name.",
      },
      {
        id: "functionName",
        role: ParameterRole.Filter,
        summary: "Filter function rows by exact function surface name.",
      },
      {
        id: "templateName",
        role: ParameterRole.Filter,
        summary: "Filter source-template rows or duplicate groups by exact sourceText(...) carrier name.",
      },
      {
        id: "templateFingerprint",
        role: ParameterRole.Filter,
        summary: "Filter source-template rows or duplicate groups by normalized static template fingerprint.",
      },
      {
        id: "argumentKind",
        role: ParameterRole.Filter,
        summary:
          "Filter source-template rows by string-literal, no-substitution-template, template-expression, or other argument form.",
      },
      {
        id: "staticText",
        role: ParameterRole.Filter,
        summary: "Filter source-template rows by whether sourceText(...) carries a static string/template literal.",
      },
      {
        id: "minTemplateCount",
        role: ParameterRole.Filter,
        summary: "Filter source-template duplicate groups to at least this many sourceText(...) carriers.",
      },
      {
        id: "minTemplateLineCount",
        role: ParameterRole.Filter,
        summary: "Filter source-template rows or duplicate groups by minimum static template line count.",
      },
      {
        id: "minTemplateCharacterCount",
        role: ParameterRole.Filter,
        summary: "Filter source-template rows or duplicate groups by minimum static template character count.",
      },
      {
        id: "bodyFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function rows by normalized body fingerprint; useful for following duplicate-body pressure.",
      },
      {
        id: "bodyShapeFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function rows by AST/control-flow body fingerprint; useful for following duplicate-shape pressure.",
      },
      {
        id: "switchTopologyFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function rows or control-flow shape groups by stable switch-dispatch topology fingerprint.",
      },
      {
        id: "minSwitchTopologyCount",
        role: ParameterRole.Filter,
        summary:
          "Filter function rows or control-flow shape groups to bodies with at least this many switch statements in their topology.",
      },
      {
        id: "parentFunctionName",
        role: ParameterRole.Filter,
        summary: "Filter local function rows by exact parent function surface name.",
      },
      {
        id: "functionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter function rows by top-level, top-level-variable, class-method, class-field-function, constructor, accessor, or local-function.",
        values: [
          "top-level",
          "top-level-variable",
          "class-method",
          "class-field-function",
          "constructor",
          "accessor",
          "local-function",
        ],
      },
      {
        id: "usageRole",
        role: ParameterRole.Filter,
        summary:
          "Filter symbol reference rows by usage role such as type-reference, call-expression, member-reference, or heritage.",
        values: [
          "import",
          "export",
          "type-reference",
          "heritage",
          "new-expression",
          "call-expression",
          "member-call",
          "member-reference",
          "value-reference",
        ],
      },
      {
        id: "usageFamily",
        role: ParameterRole.Filter,
        summary:
          "Filter symbol rows by coarse usage family: import-export, type, value, call, or runtime.",
        values: ["import-export", "type", "value", "call", "runtime"],
      },
      {
        id: "callKind",
        role: ParameterRole.Filter,
        summary: "Filter call-site rows by call or new.",
        values: ["call", "new"],
      },
      {
        id: "constructionKind",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by new-expression or object-literal construction.",
        values: ["new-expression", "object-literal"],
      },
      {
        id: "recordKind",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by exact KernelStoreRecord discriminator.",
      },
      {
        id: "committed",
        role: ParameterRole.Filter,
        summary: "Filter kernel-batch rows by whether construction is immediately committed.",
        values: ["true", "false"],
      },
      {
        id: "recordsExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-batch rows by exact records argument expression.",
      },
      {
        id: "labelExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-batch rows by exact label argument expression.",
      },
      {
        id: "labelLiteral",
        role: ParameterRole.Filter,
        summary: "Filter kernel-batch rows by exact string literal label when present.",
      },
      {
        id: "commitReceiverExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-batch rows by exact commit receiver expression.",
      },
      {
        id: "fieldName",
        role: ParameterRole.Filter,
        summary: "Filter field-provenance rows by exact literal field name.",
      },
      {
        id: "fieldNameExpression",
        role: ParameterRole.Filter,
        summary: "Filter field-provenance rows by exact field-name argument expression.",
      },
      {
        id: "provenanceExpression",
        role: ParameterRole.Filter,
        summary: "Filter field-provenance rows by exact provenance-handle argument expression.",
      },
      {
        id: "ownerClassName",
        role: ParameterRole.Filter,
        summary: "Filter product record/provenance rows by exact owning class name.",
      },
      {
        id: "ownerFunctionName",
        role: ParameterRole.Filter,
        summary: "Filter product record/provenance rows by exact owning function or method surface name.",
      },
      {
        id: "productKindExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by exact visible product kind expression.",
      },
      {
        id: "predicateKeyExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by exact visible claim predicate expression.",
      },
      {
        id: "seamKindExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by exact visible open-seam kind expression.",
      },
      {
        id: "evidenceKindExpression",
        role: ParameterRole.Filter,
        summary: "Filter kernel-record rows by exact visible evidence kind expression.",
      },
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary: "Filter call-site rows by exact callee name.",
      },
      {
        id: "calleeSymbolName",
        role: ParameterRole.Filter,
        summary: "Filter call-site rows by exact checker-visible callee symbol name.",
      },
      {
        id: "calleeSymbolKey",
        role: ParameterRole.Filter,
        summary: "Filter call-site rows by exact checker fully-qualified callee symbol key.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary: "Filter symbol reference rows by exact checker-visible symbol name.",
      },
      {
        id: "symbolKey",
        role: ParameterRole.Filter,
        summary: "Filter symbol reference rows by exact checker fully-qualified symbol key.",
      },
      {
        id: "targetPackageId",
        role: ParameterRole.Filter,
        summary: "Filter symbol rows by admitted target package id such as semantic-runtime or runtime-html.",
      },
      {
        id: "exported",
        role: ParameterRole.Filter,
        summary: "Filter declaration, class, or function rows by exported true or false.",
        values: ["true", "false"],
      },
      {
        id: "static",
        role: ParameterRole.Filter,
        summary: "Filter function rows by static true or false.",
        values: ["true", "false"],
      },
      {
        id: "async",
        role: ParameterRole.Filter,
        summary: "Filter function rows by async true or false.",
        values: ["true", "false"],
      },
      {
        id: "topLevel",
        role: ParameterRole.Filter,
        summary: "Filter declaration rows by top-level true or false.",
        values: ["true", "false"],
      },
      {
        id: "local",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by local semantic-runtime target true or false.",
        values: ["true", "false"],
      },
      {
        id: "relative",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by relative module specifier true or false.",
        values: ["true", "false"],
      },
      {
        id: "resolved",
        role: ParameterRole.Filter,
        summary: "Filter dependency or call rows by resolved true or false.",
        values: ["true", "false"],
      },
      {
        id: "crossesArea",
        role: ParameterRole.Filter,
        summary: "Filter dependency rows by cross-area true or false.",
        values: ["true", "false"],
      },
      {
        id: "runtimeCycle",
        role: ParameterRole.Filter,
        summary: "Filter cycle rows by whether they include a value or side-effect import edge.",
        values: ["true", "false"],
      },
      {
        id: "includeSymbols",
        role: ParameterRole.Execution,
        summary:
          "For the profile projection, include checker-backed symbol-reference phases when true; false profiles the cheaper core lane used by row projections that do not need symbols.",
        values: ["true", "false"],
      },
      {
        id: "includeCallSites",
        role: ParameterRole.Execution,
        summary:
          "For the profile projection, include checker-backed call-site phases when true; false profiles the structure lane used by projections that only need source, import, declaration, module, cycle, or class rows.",
        values: ["true", "false"],
      },
      {
        id: "includeCallDetails",
        role: ParameterRole.Execution,
        summary:
          "For call-sites and profile projections, include expensive checker callee type and signature displays; ordinary call topology keeps this false.",
        values: ["true", "false"],
      },
      {
        id: "includeKernelRecords",
        role: ParameterRole.Execution,
        summary:
          "For the profile projection, include KernelStoreRecord construction and KernelStoreBatch source-flow phases when true; ordinary structure projections skip them unless requested.",
        values: ["true", "false"],
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter architecture rows by exact substring across ids, summaries, names, paths, areas, and specifiers.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
    ],
    defaultBudget: { rows: 100 },
  },
  {
    id: LensId.WorkspaceArchitecture,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary:
      "Read admitted workspace package topology, source-role pressure, Aurelia entrypoint signals, package manifests/file inventory, and Aurelia integration source surfaces.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
    ],
    requiredSubstrates: [
      SubstrateId.WorkspaceArchitecture,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Workspace topology rollup with package, external-root, source-role, Aurelia, entrypoint, surface-kind, mechanism, admission-role, profile, package-manager, and build-tool counts.",
      },
      {
        id: "packages",
        summary:
          "Admitted package rows with manifest, build-tool, source, and Aurelia integration counts.",
      },
      {
        id: "surfaces",
        summary:
          "Source-backed source-role, app entrypoint, import, resource, registration, router, and template reference rows.",
      },
      {
        id: "profile",
        summary:
          "Workspace architecture phase timings for package manifests and file inventory, source scans, attribution, profile inference, and rollup.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter workspace topology rows by admitted package id.",
      },
      {
        id: "admissionRole",
        role: ParameterRole.Filter,
        summary:
          "Filter package rows by source-admission role such as atlas, semantic-runtime, mcp, aurelia-framework, public-plugin, external, or workspace.",
      },
      {
        id: "aureliaShape",
        role: ParameterRole.Filter,
        summary:
          "Filter package rows by inferred Aurelia project shape: aurelia-app, aurelia-resource-library, aurelia-package, or non-aurelia.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter source surface rows by source-role, app-entrypoint, aurelia-import, resource, registration, router, or template-reference.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary: "Alias for surfaceKind on surface projections.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter source surfaces by the normalized detection mechanism such as test-source, tooling-config, import-module, aurelia.register, container.register, html-import, html-dynamic-import, or html-require.",
      },
      {
        id: "externalOnly",
        role: ParameterRole.Filter,
        summary:
          "When true, limit package rows to environment-admitted external source packages.",
      },
      {
        id: "aureliaOnly",
        role: ParameterRole.Filter,
        summary:
          "When true, limit package rows to packages whose inferred Aurelia shape is not non-aurelia.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter workspace rows by exact substring across ids, paths, package names, surface kinds, mechanisms, and summaries.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.DiRegistration,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.PluginArchitecture,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Read import/receiver-aware public Aurelia plugin package surfaces: resources, registries, DI registrations, AppTasks, router hooks, resolve calls, and template references.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
    ],
    requiredSubstrates: [
      SubstrateId.PluginArchitecture,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Public plugin rollup with package and framework-integration surface counts.",
      },
      {
        id: "packages",
        summary:
          "Public plugin package rows with resource, registry, DI, AppTask, router, and template counts.",
      },
      {
        id: "surfaces",
        summary:
          "Exact source-backed public plugin framework-integration surface rows.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter rows by admitted public plugin source package id.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary:
          "Filter plugin surface rows by resource, registry, di-registration, app-task, resolve-call, router-integration, template-reference, bindable, or watch.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary: "Alias for kind when filtering plugin surface rows.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter plugin surface rows by grounded mechanism such as customElement, Registration.singleton, AppTask.creating, container.register, router.load, or resolve.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter plugin rows by exact substring across package ids, source paths, mechanisms, and summaries.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.DiRegistration,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.FrameworkRouter,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Read Aurelia router framework architecture across router, route config, route context, route tree, route-recognizer, viewport-agent, DI, resource, lifecycle, flow, relationship rows, and cross-boundary semantic route continuations.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkRouter,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Router framework rollup with route-flow, flow-audit, relationship, route-context, route-tree, route-recognizer, viewport-agent, DI, and lifecycle counts.",
      },
      {
        id: "packages",
        summary:
          "Router and route-recognizer package rows with architecture surface counts.",
      },
      {
        id: "surfaces",
        summary:
          "Exact source-backed router framework surface rows.",
      },
      {
        id: "flow",
        summary:
          "Ordered source-backed router route-config and navigation flow rows with stage-aware semantic route continuations.",
      },
      {
        id: "flow-issues",
        summary:
          "Self-audit rows for curated router flow descriptors that are stale, ambiguous, or non-unique after materialization.",
      },
      {
        id: "recognizer",
        summary:
          "Route-recognizer parser/state/endpoint/candidate mechanic rows with exact source anchors.",
      },
      {
        id: "recognizer-issues",
        summary:
          "Self-audit rows for route-recognizer mechanic descriptors that are stale or ambiguous after materialization.",
      },
      {
        id: "relationships",
        summary:
          "Normalized router relationship rows derived from the ordered route-flow spine.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter router rows by framework package id, usually router or route-recognizer.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary:
          "Filter router surface rows by entity, configuration, route-context, route-tree, route-recognizer, viewport-agent, navigation, di, resource, or lifecycle; filter recognizer rows by contract, model, constant, storage, operation, state, segment, or algorithm.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary: "Alias for kind when filtering router surface rows.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter router surface rows by exact declaration/call mechanism, or router relationship rows by relationship mechanism.",
      },
      {
        id: "stage",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow rows by configuration, route-config, recognizer, viewport-instruction, route-tree, component-context, transition, resource, viewport, component-lifecycle, or navigation-model stage.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow rows by exact phase relation text, or router relationship rows by normalized relation.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary:
          "Filter router relationship rows by normalized framework phase such as routing, navigation, registration, resolution, or lifecycle; filter recognizer rows by route-input, path-grammar, state-graph, endpoint-registration, recognition-walk, candidate-selection, endpoint-materialization, or cache-and-lookup.",
      },
      {
        id: "product",
        role: ParameterRole.Filter,
        summary:
          "Filter route-recognizer mechanic rows by modeled product such as state, segment, endpoint, parameter, candidate, recognized-route, or endpoint-requirement.",
      },
      {
        id: "owner",
        role: ParameterRole.Filter,
        summary:
          "Filter route-recognizer mechanic rows by owning class name.",
      },
      {
        id: "actor",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow rows by framework actor such as RouteConfigContext._processConfig or Router._run.",
      },
      {
        id: "target",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow rows by phase target such as RouteConfig, RouteRecognizer endpoint, RouteNode, or ViewportInstructionTree.",
      },
      {
        id: "descriptorKey",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow or flow-issue rows by curated source descriptor key such as RouteConfigContext._processConfig.",
      },
      {
        id: "issueKind",
        role: ParameterRole.Filter,
        summary:
          "Filter router flow self-audit rows by unmaterialized-descriptor, multi-materialized-descriptor, or duplicate-sequence.",
      },
      {
        id: "sequence",
        role: ParameterRole.Filter,
        summary: "Filter router flow self-audit rows by numeric flow sequence.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter router rows by exact substring across package ids, paths, owner names, mechanisms, and summaries.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.DiRegistration,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.BridgeAuLink,
    family: LensFamily.Bridge,
    stage: LensStage.Implemented,
    summary:
      "Read narrow product-to-framework anchors declared through auLink.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.ProductAuLink,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "auLink rollup." },
      { id: "anchors", summary: "Product class to framework symbol anchors." },
      {
        id: "targets",
        summary: "Framework-side declaration resolution for auLink ids.",
      },
      { id: "gaps", summary: "Missing, stale, or ambiguous anchor pressure." },
      {
        id: "mirror",
        summary:
          "Compact auLink rows joined to framework semantic role evidence and emulation obligations.",
      },
      {
        id: "role-evidence",
        summary:
          "Exact framework relationship rows matched to auLink framework targets.",
      },
      {
        id: "obligations",
        summary:
          "Framework emulation obligation rows matched to auLink framework targets.",
      },
      {
        id: "usage-comparison",
        summary:
          "Compare Aurelia-side framework API usage with semantic-runtime usage of the auLink mirror targets.",
      },
      {
        id: "member-surface",
        summary:
          "Compare framework target member declarations with semantic-runtime mirror member declarations before interpreting usage.",
      },
      {
        id: "usage-members",
        summary:
          "Member-level usage comparison rows between auLink framework targets and semantic-runtime mirror targets.",
      },
      {
        id: "usage-sites",
        summary:
          "Exact Aurelia-side and semantic-runtime-side source usage rows behind auLink usage comparisons.",
      },
      {
        id: "usage-consumers",
        summary:
          "Group auLink usage sites by the framework or semantic-runtime declaration that consumes the linked target or member.",
      },
    ],
    parameters: [
      {
        id: "linkId",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge rows by exact auLink id such as template-compiler:TemplateCompiler.",
      },
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter bridge rows by Aurelia framework package id.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary: "Filter bridge rows by exact framework symbol name.",
      },
      {
        id: "frameworkStatus",
        role: ParameterRole.Filter,
        summary:
          "Filter framework target resolution by resolved, ambiguous, unresolved, or package-unadmitted.",
      },
      {
        id: "roleFamily",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror role rows by framework relationship family such as di, compiler, rendering, resource, materialization, lifecycle, observation, expression, or router.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror role rows by framework relationship relation.",
      },
      {
        id: "sourceLens",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror role rows by owning framework lens id.",
      },
      {
        id: "sourceProjection",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror role rows by owning framework projection id.",
      },
      {
        id: "emulationLayer",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror obligation rows by semantic-runtime emulation layer.",
      },
      {
        id: "emulationMode",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror obligation rows by ECMAScript evaluation, emulator, virtualized runtime, TypeChecker handoff, or open-boundary mode.",
      },
      {
        id: "obligationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror obligation rows by worklist kind such as compile-template, hydrate-runtime, or model-binding.",
      },
      {
        id: "productArea",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror rows by semantic-runtime source area such as template, expression, resources, configuration, di, or router.",
      },
      {
        id: "productDeclarationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror rows by product-side declaration kind such as class, interface, or type-alias.",
      },
      {
        id: "hasRoleEvidence",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror rows by whether at least one framework relationship row is attached.",
        values: ["true", "false"],
      },
      {
        id: "hasEmulationObligations",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror rows by whether at least one semantic-runtime emulation obligation is attached.",
        values: ["true", "false"],
      },
      {
        id: "side",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by framework or product side.",
        values: ["framework", "product"],
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact member name on the linked target.",
      },
      {
        id: "frameworkScopeMode",
        role: ParameterRole.Filter,
        summary:
          "Choose framework API scope for usage/member comparisons: implementation (default), subject, or direct.",
        values: ["implementation", "subject", "direct"],
      },
      {
        id: "memberAccess",
        role: ParameterRole.Filter,
        summary: "Filter bridge member rows by access kind on either side.",
      },
      {
        id: "frameworkMemberAccess",
        role: ParameterRole.Filter,
        summary: "Filter bridge member rows by framework-side access kind.",
      },
      {
        id: "productMemberAccess",
        role: ParameterRole.Filter,
        summary: "Filter bridge member rows by product-side access kind.",
      },
      {
        id: "memberDeclarationKind",
        role: ParameterRole.Filter,
        summary: "Filter bridge member rows by declaration kind such as method or property.",
      },
      {
        id: "presence",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge member rows by whether a member is observed on both sides, framework only, or product only.",
        values: ["both", "framework-only", "product-only"],
      },
      {
        id: "ownerName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage owner rows by exact containing declaration name.",
      },
      {
        id: "ownerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage owner rows by containing declaration kind.",
      },
      {
        id: "ownerMemberName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage owner rows by exact containing class member name.",
      },
      {
        id: "callCalleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact call callee name when the usage is a call site.",
      },
      {
        id: "callArgumentText",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact call argument text when the usage is a call site.",
      },
      {
        id: "callArgumentSymbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact checker symbol name for a call argument.",
      },
      {
        id: "callArgumentFullyQualifiedName",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact checker fully qualified name for a call argument.",
      },
      {
        id: "usageRole",
        role: ParameterRole.Filter,
        summary:
          "Filter bridge usage rows by exact TypeScript usage role such as member-call, import, export, or type-reference.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter mirror rows by exact substring across link ids, endpoint names, summaries, and source paths.",
      },
      {
        id: "orderBy",
        role: ParameterRole.Filter,
        summary:
          "Order mirror rows by linkId, roleEvidence, emulationObligation, mirrorPressure, targetStatus, packageId, or productArea.",
        values: [
          "linkId",
          "roleEvidence",
          "emulationObligation",
          "mirrorPressure",
          "targetStatus",
          "packageId",
          "productArea",
          "sourceLens",
          "relation",
          "roleFamily",
          "obligationKind",
          "emulationLayer",
          "emulationMode",
        ],
      },
    ],
    outputKinds: [
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
      EvidenceKind.TypeFact,
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkDiscovery,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Read the Aurelia framework discovery seeds: semantic domains, behavior flows, seed anchors, and next inquiry routes.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Framework discovery rollup." },
      {
        id: "recipes",
        summary:
          "Calibrated cross-lens recipes that combine framework semantic projections with TypeScript source, type, call-site, and continuation hops.",
      },
      { id: "flows", summary: "Framework behavior flow definitions." },
      {
        id: "anchors",
        summary: "Seed anchors with source hints and navigation affordances.",
      },
      {
        id: "flow-seeds",
        summary:
          "Source-bound anchor plus framework-flow rows for semantic discovery.",
      },
      {
        id: "call-edges",
        summary:
          "Precomputed call-hierarchy edge rows attached to framework flow seeds.",
      },
      {
        id: "call-sites",
        summary:
          "Exact framework flow call-site rows with callee and argument facts.",
      },
      {
        id: "call-targets",
        summary:
          "Grouped framework flow callee targets derived from precomputed call edges.",
      },
      {
        id: "package-exports",
        summary:
          "Checker-visible exports from admitted Aurelia framework package entrypoints.",
      },
      {
        id: "registry-exports",
        summary:
          "Framework package exports with structural registry/configuration member capabilities.",
      },
      {
        id: "di-interfaces",
        summary:
          "Framework package exports that create DI InterfaceSymbol keys through direct or indirect createInterface calls.",
      },
      {
        id: "resource-carriers",
        summary:
          "Source-exported framework resource carriers independent of package public export surface.",
      },
      {
        id: "resources",
        summary:
          "Framework package exports that carry Aurelia resource definitions or syntax resources.",
      },
      {
        id: "bundles",
        summary:
          "Evaluator-derived registration associations for registry/configuration bundle exports.",
      },
      {
        id: "observers",
        summary:
          "Framework observer-system exports, including ObserverLocator/NodeObserverLocator, observers, accessors, subscribers, connectables, effects, and signals.",
      },
      {
        id: "app-tasks",
        summary:
          "Framework AppTask, lifecycle task-slot, task callback, and task queue exports.",
      },
      {
        id: "router-entities",
        summary: "Framework router and route-recognizer exports.",
      },
      {
        id: "expression-entities",
        summary: "Framework expression-parser and expression runtime exports.",
      },
      {
        id: "rendering-structures",
        summary:
          "Framework rendering, hydration, controller, view, and lifecycle structure exports.",
      },
      {
        id: "open-questions",
        summary:
          "Discovery questions that should remain visible during long-running work.",
      },
    ],
    parameters: [
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary: "Filter anchors and flows by framework semantic domain.",
      },
      {
        id: "flow",
        role: ParameterRole.Filter,
        summary: "Filter anchors and flows by framework flow kind.",
      },
      {
        id: "anchorId",
        role: ParameterRole.Filter,
        summary:
          "Filter anchors, flow seeds, and call edges by framework seed anchor id.",
      },
      {
        id: "status",
        role: ParameterRole.Filter,
        summary:
          "Filter anchor and flow-seed rows by exact resolution/source-bound status.",
      },
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by Aurelia framework package id.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by framework symbol name.",
      },
      {
        id: "auLinkId",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by semantic-runtime auLink id.",
      },
      {
        id: "direction",
        role: ParameterRole.Filter,
        summary:
          "Filter precomputed call edges by incoming or outgoing direction.",
      },
      {
        id: "fromPackageId",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by caller package id.",
      },
      {
        id: "toPackageId",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by callee package id.",
      },
      {
        id: "fromName",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by caller item name.",
      },
      {
        id: "toName",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by callee item name.",
      },
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact framework flow call sites by callee symbol or property name.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by exact exported name.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by exported-name substring.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by checker-visible member/property name.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter framework resource exports by resource definition kind.",
      },
      {
        id: "bundleKind",
        role: ParameterRole.Filter,
        summary:
          "Filter framework bundle rows by configuration, registration-catalog, or registry shape.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by product kind.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact discriminator constant name.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact instruction class/interface/type name.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary:
          "Filter binding product or syntax product rows by exact binding class name.",
      },
      {
        id: "constructionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding admission rows by static construction/admission shape.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary: "Filter binding effect rows by lifecycle/setup effect kind.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "observerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by semantic role such as observer-locator, node-observer-locator, observer, accessor, subscriber, connectable, watcher, signaler, effect, or dirty-checker.",
      },
      {
        id: "observerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by capability such as locate-observer, locate-accessor, locate-collection-observer, subscribe, notify, connect, signal, run-effect, dirty-check, or register.",
      },
      {
        id: "exportShape",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by public shape such as di-interface, class, interface, type-alias, function, or value.",
      },
      {
        id: "appTaskKind",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask/lifecycle task exports by role such as app-task-factory, app-task-key, task-slot, task-callback, task, task-queue, or lifecycle-hook.",
      },
      {
        id: "appTaskCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask/lifecycle task exports by capability such as register, lifecycle-phase, queue, run, status, or callback.",
      },
      {
        id: "routerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter router exports by role such as router, configuration, route, route-context, route-tree, navigation, viewport, endpoint, location, url-parser, recognizer, event, state, instruction, or route-resource.",
      },
      {
        id: "routerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter router exports by capability such as configure, navigate, recognize, parse-url, manage-state, render-viewport, emit-event, or register.",
      },
      {
        id: "expressionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter expression exports by role such as parser, ast-node, access, call, literal, operator, pattern, interpolation, for-of, binding-behavior, value-converter, visitor, evaluator, unparser, or helper.",
      },
      {
        id: "expressionCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter expression exports by capability such as parse, visit, evaluate, build-ast, assign, interpolate, convert-value, or apply-behavior.",
      },
      {
        id: "renderingStructureKind",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering structure exports by role such as app-root, controller, view, view-factory, hydration, renderer, render-context, render-location, node-sequence, lifecycle-hook, platform-boundary, mount-target, or ssr.",
      },
      {
        id: "renderingCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering structure exports by capability such as render, hydrate, create-view, control-lifecycle, mount, locate-dom, platform, ssr, or register.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.Symbol,
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.CallSite,
      EvidenceKind.TypeFact,
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkApi,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Inspect Aurelia framework API declaration facets, exact merge edges, implementation shape edges, normalized member slots, and repo-wide TypeChecker-resolved usage rows.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkApi,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "Framework API usage rollup." },
      {
        id: "subjects",
        summary:
          "Merged API declaration subjects grounded in same declaration, same export, same symbol, and explicit value alias edges.",
      },
      {
        id: "facets",
        summary:
          "Framework API declaration facets from package exports and module exports, resolved back to source files when possible.",
      },
      {
        id: "merge-edges",
        summary:
          "Exact identity-preserving API merge edges such as same declaration, same symbol, same export, and explicit value alias.",
      },
      {
        id: "shape-edges",
        summary:
          "Exact type-shape edges such as class implements interface and interface extends interface, without treating shape as identity.",
      },
      {
        id: "implementation-shapes",
        summary:
          "Class-rooted implementation shapes that combine a concrete class with reachable public interfaces for merged API interpretation.",
      },
      {
        id: "member-slots",
        summary:
          "Compact normalized API member slots where MethodDeclaration and MethodSignature are represented as the same method slot.",
      },
      {
        id: "member-declarations",
        summary:
          "Source declaration rows contributing to normalized API member slots; use after member-slots when exact provenance is needed.",
      },
      {
        id: "usages",
        summary:
          "Repo-wide TypeChecker-resolved API usage rows for subjects and member slots.",
      },
      {
        id: "usage-consumers",
        summary:
          "API usage rows grouped by the source declaration and class member that owns the usage site.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter API rows by Aurelia framework package id.",
      },
      {
        id: "subjectName",
        role: ParameterRole.Filter,
        summary: "Filter API rows by merged API subject name.",
      },
      {
        id: "implementationName",
        role: ParameterRole.Filter,
        summary:
          "Filter subjects, member slots, or usages to a class-rooted implementation shape such as Container.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary: "Filter API facets by exact exported name.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Filter API member slots or usage rows by exact member name.",
      },
      {
        id: "consumerPackageId",
        role: ParameterRole.Filter,
        summary: "Filter usage rows by consuming package id.",
      },
      {
        id: "role",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact role such as type-reference, member-call, new-expression, import, or value-reference.",
      },
      {
        id: "ownerName",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact containing declaration name.",
      },
      {
        id: "ownerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by containing declaration kind.",
      },
      {
        id: "ownerMemberName",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact containing class member name.",
      },
      {
        id: "callCalleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact call callee name when the usage is a call site.",
      },
      {
        id: "callArgumentText",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact call argument text when the usage is a call site.",
      },
      {
        id: "callArgumentSymbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact checker symbol name for a call argument.",
      },
      {
        id: "callArgumentFullyQualifiedName",
        role: ParameterRole.Filter,
        summary:
          "Filter usage rows by exact checker fully qualified name for a call argument.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary:
          "Filter merge or shape edge rows by exact relation.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter facets by package-export or module-export surface.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter API rows by exact substring across names, ids, source paths, and summaries.",
      },
    ],
    outputKinds: [
      EvidenceKind.Symbol,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkEvaluator,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Static evaluator substrate for world-construction facts, closures, and explicit open seams.",
    supportedLoci: [
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "value", summary: "Evaluator value shape." },
      { id: "effects", summary: "Static world-construction effects." },
      {
        id: "open-seams",
        summary: "Unclosed dynamic or unsupported boundaries.",
      },
    ],
    parameters: [
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Trace a specific member/function root such as register.",
      },
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary: "Filter invocation effects by callee symbol or member name.",
      },
      {
        id: "receiverName",
        role: ParameterRole.Filter,
        summary:
          "Filter invocation effects by receiver binding or symbol name.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.CallSite,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { depth: 20, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkResources,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Converge Aurelia resource carriers with public exports, bundle admissions, syntax products, and materialization sites.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkResources,
      SubstrateId.FrameworkAdmission,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary: "Resource convergence rollup across evidence lanes.",
      },
      {
        id: "convergence",
        summary:
          "One row per resource carrier joined to package exports, bundle admissions, syntax products, and materialization sites.",
      },
      {
        id: "definitions",
        summary:
          "Alias of convergence focused on source-backed resource definition carriers.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter resource rows by Aurelia framework package id.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resources by custom-element, custom-attribute, template-controller, value-converter, binding-behavior, binding-command, attribute-pattern, or renderer.",
      },
      {
        id: "resourceName",
        role: ParameterRole.Filter,
        summary:
          "Filter by static resource lookup name, source export name, target name, or public export name.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary: "Filter by local resource target class/function name.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary: "Filter by resource source/public export name.",
      },
      {
        id: "bundleExportName",
        role: ParameterRole.Filter,
        summary: "Filter by admitting configuration or bundle export name.",
      },
      {
        id: "lane",
        role: ParameterRole.Filter,
        summary:
          "Filter by convergence lane: source-carrier, package-export, bundle-admission, syntax-product, runtime-materialization, or definition-only.",
      },
      {
        id: "instantiationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter by resource runtime-existence class such as view-model-container-invoke, expression-resource-lookup, compiler-command, renderer-singleton, or definition-only.",
      },
      {
        id: "materializationSiteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter by concrete materialization site kind such as view-model-construction or compiler-command-build.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter syntax-producing resources by binding-command, renderer, or instruction-factory producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary:
          "Filter syntax-producing resources by builds-instruction, handles-instruction, creates-binding, or emits-instruction.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter resource convergence rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.ResourceDefinition,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkCompiler,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework compiler instruction production from binding commands and instruction factories into rendering consumers.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.TypeScriptProgram,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Compiler rollup across compile-flow stages, attribute classification, instruction products, and relationship atoms.",
      },
      {
        id: "compile-flow",
        summary:
          "High-level TemplateCompiler compilation corridor across compile, compileSpread, node/element compilation, local elements, projections, attribute classification, instruction assembly, and compiled definition output.",
      },
      {
        id: "attribute-classification",
        summary:
          "Detailed TemplateCompiler._classifyAttributes branch rows for custom elements, custom attributes, template controllers, binding commands, spreads, and plain attributes.",
      },
      {
        id: "instruction-products",
        summary:
          "Instruction rows produced during compilation by binding commands or instruction-factory functions.",
      },
      {
        id: "relationships",
        summary:
          "Normalized compiler relationship rows with relation, mechanism, and phase axes.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by Aurelia framework package id.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler rows by exact source producer/export name when the producer is exported.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler rows by binding-command or instruction-factory producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler rows by builds-instruction or emits-instruction product kind.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by produced instruction name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by framework phase.",
      },
      {
        id: "compileStage",
        role: ParameterRole.Filter,
        summary:
          "Filter compile-flow rows by exact stage such as compile-spread, attribute-classification, custom-attribute-bindables, slot-projection-extraction, element-compilation, node-dispatch, or compiled-definition.",
      },
      {
        id: "branchKind",
        role: ParameterRole.Filter,
        summary:
          "Filter attribute-classification rows by exact decision branch such as element-bindable, attribute-resource-lookup, template-controller-instruction, or plain-binding-command.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler flow rows by owning TemplateCompiler method name.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkRendering,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework rendering from instruction products through renderer dispatch, binding admission, binding effects, and observer setup.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.TypeScriptProgram,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Rendering graph rollup across syntax products, instruction slots, binding products, admissions, effects, and setup overrides.",
      },
      {
        id: "syntax-products",
        summary:
          "Rendering-owned syntax products: renderer instruction handling and binding construction.",
      },
      {
        id: "instruction-slots",
        summary:
          "Instruction discriminator constants joined to instruction declarations and syntax products.",
      },
      {
        id: "instruction-dispatches",
        summary: "Instruction discriminator slot to renderer dispatch edges.",
      },
      {
        id: "hydration-flow",
        summary:
          "Compact source-backed hydration/runtime rendering corridor from AppRoot and Controller through Rendering.render, renderer dispatch, child controller creation, binding admission, lifecycle hooks, and observation setup.",
      },
      {
        id: "render-consequences",
        summary:
          "Compact renderer consequence rows over instruction dispatch, controller creation/admission, binding production/admission/effects, and observation setup before opening heavy detail projections.",
      },
      {
        id: "controller-creations",
        summary:
          "Renderer hydration flows that construct view models, create child controllers, recursively render property instructions, and admit children to the parent controller.",
      },
      {
        id: "binding-products",
        summary:
          "Binding classes reached from renderer construction and controller admission rows.",
      },
      {
        id: "binding-admissions",
        summary:
          "Controller.addBinding admission edges that attach framework binding products to controller lifecycle lists.",
      },
      {
        id: "binding-effects",
        summary:
          "Binding lifecycle declarations and setup effects such as observer lookup, event listeners, and subscriptions.",
      },
      {
        id: "binding-setups",
        summary:
          "Renderer/resource-side calls that install target observers, accessors, or target subscribers on bindings.",
      },
      {
        id: "relationships",
        summary:
          "Normalized rendering relationship rows with relation, mechanism, and phase axes.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter rendering rows by Aurelia framework package id.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter rendering rows by exact substring.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by product kind.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact discriminator constant name.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot, syntax product, or controller creation rows by exact instruction class/interface/type name.",
      },
      {
        id: "rendererName",
        role: ParameterRole.Filter,
        summary:
          "Filter renderer-owned rows such as instruction dispatches or controller creation flows by renderer export/class name.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary: "Filter binding rows by exact binding class name.",
      },
      {
        id: "hydrationStage",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by coarse runtime stage such as app-root-hydration, controller-hydration, view-compilation, renderer-table, instruction-dispatch, child-controller, binding-admission, lifecycle-hooks, or observation-setup.",
      },
      {
        id: "operation",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by exact runtime operation such as find, get, get-all, invoke, register, compile, hydrate, render, dispatch, admit-child, admit-binding, run-hook, create-observers, create-watchers, create-nodes, or adopt-nodes.",
      },
      {
        id: "targetKind",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by semantic target kind such as custom-element, custom-attribute, template-controller, template-compiler, renderer-table, instruction, binding, lifecycle-hook, observer, node-sequence, or view-model.",
      },
      {
        id: "ownerName",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by owning class, renderer, or helper name.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by owning method/accessor/function name.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary:
          "Filter hydration-flow rows by named callee, DI key, renderer target, or substrate.",
      },
      {
        id: "consequenceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter render-consequence rows by compact kind such as instruction-dispatch, controller-creation, child-controller-admission, binding-production, binding-admission, binding-effect, observer-lookup, observation-setup, recursive-dispatch, or template-controller-link.",
      },
      {
        id: "constructionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding admission rows by static construction/admission shape.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary: "Filter binding effect rows by lifecycle/setup effect kind.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering relationship rows by compiler/rendering/lifecycle phase.",
      },
      {
        id: "fromName",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by source endpoint name.",
      },
      {
        id: "toName",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by target endpoint name.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.SourceSpan,
      EvidenceKind.ResourceDefinition,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.FrameworkDi,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework DI keys, relationship atoms, graph layers, dependency DAG, registrations, lookups, providers, and materialization mechanics.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "DI key and provider rollup." },
      {
        id: "keys",
        summary:
          "Framework DI InterfaceSymbol keys discovered from createInterface calls.",
      },
      { id: "facts", summary: "Normalized DI relationship atoms." },
      {
        id: "relationships",
        summary:
          "Normalized DI relationship atoms with relation/mechanism/phase axes.",
      },
      {
        id: "registrations",
        summary:
          "Kernel DI registration, resolver, provider, alias, and slot-write atoms.",
      },
      {
        id: "providers",
        summary:
          "DI key provider and alias targets where the source exposes them exactly.",
      },
      { id: "lookups", summary: "Kernel DI lookup and resolution atoms." },
      {
        id: "materializations",
        summary: "Kernel DI factory and construction atoms.",
      },
      {
        id: "graph",
        summary:
          "Typed DI graph over key declarations, registration admission, container slots, lookups, materialization routes, and dependency edges.",
      },
      {
        id: "world",
        summary:
          "Selected configuration or bundle spent into abstract resolver/resource slots from linked framework source values.",
      },
      {
        id: "slots",
        summary:
          "Resolver and resource slots produced by selected configuration or bundle DI-world spending.",
      },
      {
        id: "dependencies",
        summary:
          "Provider dependency edges discovered after spending selected configuration or bundle registrations.",
      },
      {
        id: "dag",
        summary:
          "SCC-collapsed DI key dependency graph derived from alias and dependency edges.",
      },
      { id: "evidence", summary: "Source-backed relationship atom evidence." },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by Aurelia framework package id.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by DI/world phase.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by InterfaceSymbol name or key expression.",
      },
      {
        id: "strategy",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by resolver strategy.",
      },
      {
        id: "routeKind",
        role: ParameterRole.Filter,
        summary: "Filter DI graph/materialization rows by route kind.",
      },
      {
        id: "nodeKind",
        role: ParameterRole.Filter,
        summary: "Filter DI graph rows by graph node kind.",
      },
      {
        id: "edgeKind",
        role: ParameterRole.Filter,
        summary: "Filter DI graph rows by graph edge kind.",
      },
      {
        id: "dependencyKey",
        role: ParameterRole.Filter,
        summary: "Filter DI-world dependency rows by requested key.",
      },
      {
        id: "configurationPackageId",
        role: ParameterRole.Filter,
        summary: "Select the framework package that owns the configuration or bundle spent by DI-world projections.",
      },
      {
        id: "configurationExportName",
        role: ParameterRole.Filter,
        summary: "Select the exported configuration or bundle name spent by DI-world projections.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkMaterialization,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Join DI provider seeds, resource carriers, checker facts, and evaluator effects into first-pass runtime materialization routes.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "Materialization rollup." },
      {
        id: "routes",
        summary:
          "DI key provider routes toward instance, constructable, callback, or alias materialization.",
      },
      {
        id: "dependencies",
        summary:
          "Container dependency calls observed inside callback provider routes.",
      },
      {
        id: "relationships",
        summary:
          "Graph relationships from keys to providers and callback dependency keys.",
      },
      {
        id: "instantiations",
        summary:
          "DI key runtime-existence rows with provider source and low-level framework construction-site evidence.",
      },
      {
        id: "resource-instantiations",
        summary:
          "Framework resource runtime-existence rows with resource carrier source and runtime/compiler/evaluator materialization-site evidence.",
      },
      { id: "facts", summary: "Normalized materialization route facts." },
      {
        id: "evidence",
        summary: "Source-backed materialization route evidence and open seams.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary:
          "Filter materialization routes by Aurelia framework package id.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary:
          "Filter materialization routes by DI key or provider expression name.",
      },
      {
        id: "strategy",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by resolver strategy.",
      },
      {
        id: "routeKind",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by route kind.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by resource kind such as custom-element or custom-attribute.",
      },
      {
        id: "resourceName",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by static resource name, export name, or target name.",
      },
      {
        id: "resourceSiteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by materialization site kind such as view-model-construction, expression-resource-lookup, or compiler-command-build.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter materialization graph rows by shared framework relation.",
      },
      {
        id: "dependencyKey",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by dependency key.",
      },
      {
        id: "dependencyAccess",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by container access kind.",
      },
      {
        id: "dependencyPolicy",
        role: ParameterRole.Filter,
        summary:
          "Filter callback dependency rows by direct, guarded, fallback, repeated, or deferred policy.",
      },
      {
        id: "certainty",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by evaluator certainty.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: {
      rows: 100,
      groups: 40,
      facts: 120,
      routes: 80,
      evidencePerSubject: 3,
    },
  },
  {
    id: LensId.FrameworkLifecycle,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework lifecycle surfaces across controller methods, binding lifecycle effects, resource materialization phases, and lifecycle relationships.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "Lifecycle rollup." },
      {
        id: "controller-methods",
        summary:
          "Controller lifecycle method declarations with exact source ranges.",
      },
      {
        id: "controller-calls",
        summary:
          "Controller lifecycle call sites such as child activation, binding, attach, detach, and teardown.",
      },
      {
        id: "resource-sites",
        summary:
          "Resource materialization sites grouped by lifecycle/world phase.",
      },
      {
        id: "binding-effects",
        summary:
          "Binding class lifecycle method/effect rows already discovered by the rendering substrate.",
      },
      {
        id: "app-tasks",
        summary:
          "AppTask slot invocation, IAppTask lookup, slot-filter, and task.run execution sites.",
      },
      {
        id: "hook-dispatches",
        summary:
          "View-model hook calls and registered lifecycle-hook dispatch sites.",
      },
      {
        id: "relationships",
        summary:
          "Normalized lifecycle relationship rows across controller, binding, and resource materialization surfaces.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle rows by Aurelia framework package id.",
      },
      {
        id: "lifecycleStage",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle rows by stage such as hydrate, activate, bind, attach, detach, unbind, or dispose.",
      },
      {
        id: "participantKind",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle rows by participant kind such as controller, binding, or resource.",
      },
      {
        id: "callKind",
        role: ParameterRole.Filter,
        summary:
          "Filter controller lifecycle calls by self-lifecycle, child-controller, binding-list, state-gate, or teardown.",
      },
      {
        id: "appTaskExecutionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask execution rows by slot invocation, collection lookup, slot filter, or task run.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask execution rows by concrete lifecycle slot such as creating or activated.",
      },
      {
        id: "hookDispatchKind",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle hook dispatch rows by view-model hook, registered hook collection, or registered hook callback.",
      },
      {
        id: "hookName",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle hook dispatch rows by hook name such as hydrating, bound, attached, or unbinding.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource lifecycle sites by resource kind such as custom-element or binding-behavior.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by shared framework relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkObservation,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework observer entities, binding observer lookup rows, observation setup overrides, and observation relationships.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "Observation rollup." },
      {
        id: "entities",
        summary:
          "Observer/reactivity entity catalog rows such as ObserverLocator, NodeObserverLocator, observers, accessors, subscribers, watchers, and dirty checker.",
      },
      {
        id: "binding-lookups",
        summary:
          "Binding class observer/accessor API-call rows through IObserverLocator-style APIs; use flow-sites or observer-locator-decisions for concrete CheckedObserver/SelectValueObserver behavior.",
      },
      {
        id: "binding-setups",
        summary:
          "Renderer/resource-side setup calls that configure binding observation behavior.",
      },
      {
        id: "surface-methods",
        summary:
          "ObserverLocator, NodeObserverLocator, DirtyChecker, connectable, ComputedObserver, ControlledComputedObserver, watch decorator/registry/metadata, watcher, effect, and slot-watcher method/function declarations.",
      },
      {
        id: "flow-sites",
        summary:
          "Source-backed observation flow sites inside locator, runtime-html node observers, dirty-checker, collection, connectable, computed-observer, controlled-computed-observer, watcher, effect, and slot-watcher surfaces.",
      },
      {
        id: "dependency-circuit",
        summary:
          "Compact dependency-circuit roles derived from observation flow sites, including astEvaluate reads, astBind wrapper handoffs, connectable boundaries, ProxyObservable identity/escape paths, proxy dependency traps, computed-observer dependency lookup, watcher/effect dependency capture, and observer-location sites.",
      },
      {
        id: "collection-methods",
        summary:
          "Compact collection method inventory comparing astEvaluate array auto-observe methods with ProxyObservable array/map/set wrapper methods and collection dependency collection.",
      },
      {
        id: "observer-locator-decisions",
        summary:
          "Compact ObserverLocator decision table derived from source-backed flow sites, including primitive, function-key computed, getter-descriptor computed, collection, node delegation, and setter fallback branches.",
      },
      {
        id: "flow-entity-links",
        summary:
          "Flow-site targets associated with public observer entity rows with explicit match basis.",
      },
      {
        id: "relationships",
        summary:
          "Normalized observation relationships derived from binding lookup/setup rows and observation subsystem flow sites.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter observation rows by Aurelia framework package id.",
      },
      {
        id: "observerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observer entity rows by observer-locator, node-observer-locator, observer, accessor, subscriber, collection-observer, connectable, watcher, signaler, effect, dirty-checker, or observation-helper.",
      },
      {
        id: "observerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter observer entity rows by observation capability such as locate-observer, locate-accessor, subscribe, notify, connect, signal, dirty-check, or collection.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary: "Filter binding lookup/setup rows by binding class name.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation surface rows by observer-locator, node-observer-locator, dirty-checker, dirty-check-property, connectable-record, connectable-helper, ast-evaluator, collection-helper, proxy-observable, computed-observer, controlled-computed-observer, watch-decorator, watch-definition, watch-registry, resource-watch-metadata, watcher-setup, watcher, effect, or slot-watcher.",
      },
      {
        id: "siteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow sites by exact local role such as observer-locator-observer, node-locator-observer, observer-cache-read, collection-observer, connectable-subscribe, resource-watch-definition-merge, watch-expression-parse, watcher-compute, or effect-subscribe.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter observation surface or flow rows by owning method/function name.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow or relationship rows by exact target symbol or concept name.",
      },
      {
        id: "circuitRole",
        role: ParameterRole.Filter,
        summary:
          "Filter dependency-circuit rows by template-expression-read, template-collection-read, connectable-boundary, trackable-expression-dependency, proxy-identity, proxy-escape, proxy-property-dependency, proxy-collection-dependency, proxy-trackable-dependency, computed-observer-dependency, watcher-effect-dependency, observer-location, or observation-adjacency.",
      },
      {
        id: "receiverKind",
        role: ParameterRole.Filter,
        summary:
          "Filter collection method rows by array, map, set, map-or-set, or collection receiver.",
      },
      {
        id: "actionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter collection method rows by template-array-auto-observe, proxy-wrapper-collects, or proxy-wrapper-no-collection-collect.",
      },
      {
        id: "decisionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter ObserverLocator decision rows by primitive-target, function-key-computed-observer, accessor-descriptor-computed-observer, computed-observer-auto-dependencies, controlled-computed-observer-explicit-dependencies, ordinary-data-setter-observer, or another exact decision kind.",
      },
      {
        id: "matchBasis",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow-to-entity link rows by fully-qualified-name, symbol-name, target-name, or target-root-name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter observation relationship rows by shared framework relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter observation relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter observation relationship rows by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter observation rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkErrors,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Inspect Aurelia framework error/event code definitions, mapped messages, and usage sites.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Roll up framework ErrorNames/Events code definitions, mapped messages, and usage mechanisms.",
      },
      {
        id: "packages",
        summary:
          "Framework package rows with error-code, mapped-message, usage, throw, warning, and raw Error counts.",
      },
      {
        id: "families",
        summary:
          "Grouped framework error-code families by package, enum, and member prefix for choosing diagnostic substrate work.",
      },
      {
        id: "diagnostic-frontiers",
        summary:
          "Framework error-code families joined to semantic-runtime exact AUR-link coverage, raw authority pressure, and recommended diagnostic substrate next steps.",
      },
      {
        id: "diagnostic-codes",
        summary:
          "Code-level diagnostic intake rows classifying each framework code as modeled, unmodeled, dormant, raw-authority, declared-unspent, or link-broken.",
      },
      {
        id: "codes",
        summary:
          "Source-backed ErrorNames/Events member rows with code labels, mapped messages, and usage counts.",
      },
      {
        id: "usages",
        summary:
          "Source-backed createMappedError/getMessage/raw Error usage rows with effect classification.",
      },
      {
        id: "semantic-references",
        summary:
          "Semantic-runtime references to framework error-code labels and whether those labels resolve to framework definitions.",
      },
      {
        id: "semantic-raw-references",
        summary:
          "Semantic-runtime references to raw framework Error usage sites and whether they resolve to exact public framework source rows.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter framework error rows by admitted Aurelia framework package id.",
      },
      {
        id: "enumName",
        role: ParameterRole.Filter,
        summary: "Filter definitions/usages to ErrorNames or Events.",
      },
      {
        id: "codeNamePrefix",
        role: ParameterRole.Filter,
        summary: "Filter definitions/usages by the enum member prefix before the first underscore, such as parse, ast, compiler, or router.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter usage rows by mechanism such as createMappedError, getMessage, mapped-error-wrapper-call, raw-new-error, or raw-error-factory-call.",
      },
      {
        id: "effect",
        role: ParameterRole.Filter,
        summary: "Filter usage rows by effect such as throw, warning, return, new-error, or call.",
      },
      {
        id: "rawErrorKind",
        role: ParameterRole.Filter,
        summary: "Filter raw Error rows by shape such as mapped-error-factory-implementation, inline-aur-code, message-expression, or empty.",
      },
      {
        id: "inlineCodeLabel",
        role: ParameterRole.Filter,
        summary: "Filter raw Error rows by extracted hard-coded AUR label such as AUR1005.",
      },
      {
        id: "gap",
        role: ParameterRole.Filter,
        summary:
          "Filter diagnostic-authority gap rows: code-without-message, unused-code, unresolved-usage-code, raw-new-error, raw-error-factory-call, raw-error-usage, raw-error-authority-gap, intentionally-unclaimed-raw-authority, unresolved-semantic-runtime-reference, or unresolved-semantic-runtime-raw-reference.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter rows by exact substring across package, code name, code label, message, mechanism, and summary.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkAdmission,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace configuration and bundle admissions into DI keys, resources, registry exports, catalogs, factories, and lifecycle tasks.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkAdmission,
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Cheap admission orientation; narrow by packageId or exportName for computed rollup.",
      },
      {
        id: "bundles",
        summary:
          "Compact bundle/configuration rows with admission relation counts.",
      },
      {
        id: "relationships",
        summary: "Normalized admission relationship rows.",
      },
      { id: "facts", summary: "Normalized admission relationship rows." },
      {
        id: "di",
        summary:
          "Admission rows that offer DI keys or DI registration products.",
      },
      {
        id: "resources",
        summary: "Admission rows that offer Aurelia resource carriers.",
      },
      {
        id: "materializations",
        summary:
          "Bridge admitted DI keys and resources to visible DI/resource materialization rows.",
      },
      {
        id: "world-formation",
        summary:
          "Join admitted values to materialization or lifecycle execution evidence while preserving registry/catalog admission-only boundaries.",
      },
      {
        id: "flow",
        summary:
          "Compact graph rollup for configuration admission flow and optional named corridors.",
      },
      {
        id: "flow-edges",
        summary:
          "Paged configuration admission flow edges after graph rollup is worth inspecting.",
      },
      {
        id: "flow-edge-details",
        summary:
          "Paged full configuration admission flow edge payloads when compact edge rows are insufficient.",
      },
      {
        id: "flow-nodes",
        summary:
          "Paged configuration admission flow nodes after graph rollup is worth inspecting.",
      },
      {
        id: "registries",
        summary: "Admission rows that offer registry/configuration exports.",
      },
      {
        id: "catalogs",
        summary: "Admission rows that enter or expand registration catalogs.",
      },
      {
        id: "factories",
        summary: "Admission rows that offer factory registrations.",
      },
      {
        id: "app-tasks",
        summary:
          "Admission rows that offer AppTask or lifecycle task registrations.",
      },
      {
        id: "evidence",
        summary:
          "Source-backed admission relationship evidence and open seams.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by Aurelia framework package id.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by admitting bundle/configuration export name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by register call, helper, catalog expansion, or factory mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by world/admission phase.",
      },
      {
        id: "associationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by original bundle association classifier.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by admitted target name; on flow, filter source or target graph node names after composition.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admitted resource rows or flow resource-world edges by resource definition kind.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary:
          "Filter admitted DI rows by key or target name; on flow, filter source or target graph node names.",
      },
      {
        id: "linkKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by DI key or resource link class.",
      },
      {
        id: "materializationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by runtime-existence class.",
      },
      {
        id: "matchBasis",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by the exact join basis.",
      },
      {
        id: "formationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter world-formation rows by runtime-existence, app-task-execution, catalog-expansion, or admission-only.",
      },
      {
        id: "status",
        role: ParameterRole.Filter,
        summary:
          "Filter world-formation rows by materialized, executed, expanded, admission-only, or open.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary: "Filter admitted AppTask world-formation rows by lifecycle slot.",
      },
      {
        id: "appTaskExecutionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admitted AppTask world-formation rows by AppRoot execution site kind.",
      },
      {
        id: "certainty",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by static evaluator certainty.",
      },
      {
        id: "corridor",
        role: ParameterRole.Filter,
        summary:
          "Slice admission flow to a named semantic corridor such as jit-compiler.",
      },
      {
        id: "edgeKind",
        role: ParameterRole.Filter,
        summary: "Filter admission flow rows by graph edge kind.",
      },
      {
        id: "nodeKind",
        role: ParameterRole.Filter,
        summary: "Filter admission flow rows by source or target node kind.",
      },
      {
        id: "role",
        role: ParameterRole.Filter,
        summary:
          "Filter admission flow rows by association, route, or resource role.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by exact substring; on flow, apply after composition across node and edge fields.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.FrameworkComposition,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Compose high-salience Aurelia framework actors with signed claims from auLink and DI/materialization/compiler/expression/rendering/lifecycle/observation/router relationship rows.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.ProductAuLink,
      SubstrateId.FrameworkDi,
      SubstrateId.FrameworkResources,
      SubstrateId.FrameworkAdmission,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Actor-centered semantic composition rollup over core framework classes and interfaces.",
      },
      {
        id: "actors",
        summary:
          "Framework/product actor rows with claim counts and auLink ids.",
      },
      {
        id: "claims",
        summary:
          "Signed subject-predicate-object claims involving selected actors.",
      },
      {
        id: "emulation",
        summary:
          "Derived semantic-runtime emulation obligations across DI world, resources, JIT compilation, hydration, virtualization, and TypeChecker handoff.",
      },
    ],
    parameters: [
      {
        id: "actorName",
        role: ParameterRole.Filter,
        summary:
          "Filter the induced graph by actor/class/interface name such as Container or TemplateCompiler.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter auLink and framework actor matching by exact framework symbol name.",
      },
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter composition claims by Aurelia framework package id.",
      },
      {
        id: "family",
        role: ParameterRole.Filter,
        summary:
          "Filter signed claims by broad source family such as di, compiler, rendering, observation, router, or bridge. Structured family filters do not apply the default actor seed terms.",
      },
      {
        id: "predicate",
        role: ParameterRole.Filter,
        summary: "Filter signed claims by semantic predicate.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter signed claims by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter signed claims by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter composition actors and claims by exact substring across endpoint names.",
      },
      {
        id: "emulationLayer",
        role: ParameterRole.Filter,
        summary:
          "Filter emulation obligations by semantic-runtime layer such as di-world, jit-compilation, resolved-hydration, or typechecker-reactivity.",
      },
      {
        id: "emulationMode",
        role: ParameterRole.Filter,
        summary:
          "Filter emulation obligations by modeling mode such as ecmascript-evaluation, semantic-runtime-emulator, virtualized-runtime, or typescript-handoff.",
      },
      {
        id: "obligationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter emulation obligations by worklist kind such as materialize-di-key, compile-template, hydrate-runtime, or model-observation.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary:
          "Filter emulation obligations by owner or target name.",
      },
    ],
    outputKinds: [
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkCapabilities,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Map curated Aurelia capability terrain across framework concepts, app-author source forms, locality, resource kinds/source support, effects, requirements, constraints, and evidence.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.AtlasContracts,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Capability rollup with compact sample rows for framework orientation.",
      },
      {
        id: "catalog",
        summary:
          "Paged capability rows with user-facing forms, locality, resource kinds, resource source support, effects, typed requirements, constraints, and evidence descriptors.",
      },
      {
        id: "matrix",
        summary:
          "Alias of catalog focused on framework-local constraints and resource source-form relationships.",
      },
      {
        id: "evidence",
        summary:
          "Materialized evidence descriptors with grounding strength for Atlas lens, auLink, docs, tests, and curated terrain evidence.",
      },
      {
        id: "evidence-trace",
        summary:
          "Evidence descriptors joined to backing lens answers, sampled backing value rows, source anchors, seams, and continuation counts.",
      },
      {
        id: "grounding",
        summary:
          "Neutral grounding rows derived from evidence strength, prerequisites, and framework-local exclusivity without mutating pure capability rows.",
      },
      {
        id: "inventory",
        summary:
          "Source-derived concrete framework inventory constructs (the ground-truth layer beneath the curated category rows), enumerated from the framework.* lenses across catalog and relationship-graph families.",
      },
      {
        id: "clusters",
        summary:
          "Derived capability clusters: catalog constructs grouped by the framework's own structure (source-file co-location, refined by binding-command instruction-target). Each cluster is a forced capability unit; a curated category is a named cluster.",
      },
      {
        id: "coverage",
        summary:
          "Per-family forward coverage: which source-derived constructs are accounted for by a curated category (grounded), kind-aware and non-hiding. Pair with reverse-coverage for the category x semantic-runtime accounting matrix.",
      },
      {
        id: "reverse-coverage",
        summary:
          "Per-family reverse coverage: which source-derived constructs are mirrored by a semantic-runtime auLink anchor, kind-aware and non-hiding.",
      },
    ],
    parameters: [
      {
        id: "id",
        role: ParameterRole.Filter,
        summary: "Filter capability rows by exact stable id.",
      },
      {
        id: "capabilityId",
        role: ParameterRole.Filter,
        summary: "Alias for id when callers carry capability-oriented filter names.",
      },
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary:
          "Filter by broad capability domain such as resource, styling, router, state, observation, binding, template-controller, composition, dependency-injection, configuration, plugin, expression, or lifecycle.",
      },
      {
        id: "locality",
        role: ParameterRole.Filter,
        summary:
          "Filter by where the capability is selected: app-global, package-global-registration, resource-local, template-local, area-local, binding-site, or route-local.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter by resource definition kind such as custom-element, custom-attribute, template-controller, value-converter, binding-behavior, binding-command, or attribute-pattern.",
      },
      {
        id: "resourceSourceForm",
        role: ParameterRole.Filter,
        summary:
          "Filter by resource-scoped source carrier form such as convention, decorator, static-$au, define-call, or attribute-pattern-create.",
      },
      {
        id: "effect",
        role: ParameterRole.Filter,
        summary:
          "Filter by framework effect such as resource-definition, feature-admission, di-registration, binding-data-flow, source-observation, route-recognition, viewport-composition, or tooling-transform.",
      },
      {
        id: "requirement",
        role: ParameterRole.Filter,
        summary:
          "Filter by requirement kind or requirement id, such as capability, tooling, router:admission, or css-modules-transform.",
      },
      {
        id: "groundingStrength",
        role: ParameterRole.Filter,
        summary:
          "Filter by derived grounding strength: source-backed, corpus-backed, or ungrounded.",
      },
      {
        id: "targetRows",
        role: ParameterRole.Budget,
        summary:
          "For evidence-trace, control how many backing rows each evidence descriptor asks target lenses to return.",
      },
      {
        id: "targetEvidenceRows",
        role: ParameterRole.Budget,
        summary:
          "For evidence-trace, control how many backing evidence rows are sampled from each target answer.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter capability rows by token-aware substring across ids, concepts, source forms, constraints, summaries, and evidence descriptors.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkCorpus,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Read Aurelia documentation, framework tests, documentation snippets, and test snippets as internal fixture and authoring pressure.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package],
    requiredSubstrates: [SubstrateId.FrameworkCorpus, SubstrateId.SourceFiles],
    projections: [
      {
        id: "summary",
        summary:
          "Corpus rollup with sample docs and tests for fixture and authoring pressure.",
      },
      {
        id: "docs",
        summary:
          "Aurelia documentation file rows with lexical concept tags, code-fence counts, package imports, and source ranges.",
      },
      {
        id: "doc-snippets",
        summary:
          "Aurelia documentation code fences suitable as fixture recipe and authoring taste seeds.",
      },
      {
        id: "tests",
        summary:
          "Aurelia framework test file rows with test-helper counts and lexical concept tags.",
      },
      {
        id: "test-snippets",
        summary:
          "Framework test describe/it/createFixture call-site snippets suitable for behavior-grounding pressure.",
      },
      {
        id: "expected-effects",
        summary:
          "Source-backed semantic-runtime ExpectedSemanticEffectKind contract rows used to interpret fixture seed hints.",
      },
      {
        id: "fixture-seeds",
        summary:
          "Docs/test snippet rows promoted into authoring fixture seeds with expected-effect contract and recipe hints.",
      },
    ],
    parameters: [
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Token-aware filter across paths, titles, package imports, snippet previews, and summaries.",
      },
      {
        id: "concept",
        role: ParameterRole.Filter,
        summary:
          "Filter corpus rows by lexical pressure concept such as forms, router, templates, di, observation, resources, state, or i18n.",
      },
      {
        id: "group",
        role: ParameterRole.Filter,
        summary:
          "Filter documentation or framework test rows by first path segment under the corpus root.",
      },
      {
        id: "path",
        role: ParameterRole.Filter,
        summary: "Filter corpus rows by path substring.",
      },
      {
        id: "language",
        role: ParameterRole.Filter,
        summary: "Filter documentation snippet rows by code-fence language.",
      },
      {
        id: "snippetKind",
        role: ParameterRole.Filter,
        summary:
          "Filter snippet rows by code-fence, describe-call, it-call, or create-fixture-call.",
      },
      {
        id: "generated",
        role: ParameterRole.Filter,
        summary: "Filter framework test file rows by generated-test status.",
      },
      {
        id: "sourceKind",
        role: ParameterRole.Filter,
        summary: "Filter fixture-seed rows by doc-snippet or test-snippet origin.",
      },
      {
        id: "seedUse",
        role: ParameterRole.Filter,
        summary: "Filter fixture-seed rows by authoring-taste or behavior-grounding use.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary:
          "Filter fixture-seed or expected-effect rows by expected semantic effect kind such as binding-data-flow, route, or dependency-injection.",
      },
      {
        id: "effectRole",
        role: ParameterRole.Filter,
        summary:
          "Filter expected-effect descriptor rows by role such as baseline, signature, or discriminator.",
      },
      {
        id: "effectSeedPolicy",
        role: ParameterRole.Filter,
        summary:
          "Filter expected-effect descriptor rows by seed policy such as corpus-pattern, reopen-baseline, orientation-contract, or closure-contract.",
      },
      {
        id: "expectedEffectFilterField",
        role: ParameterRole.Filter,
        summary:
          "Filter fixture-seed rows by the field name of a structured expected-effect filter, such as behaviorName, staticArgumentValues, or targetProperty.",
      },
      {
        id: "expectedEffectFilterValue",
        role: ParameterRole.Filter,
        summary:
          "Filter fixture-seed rows by the exact value of a structured expected-effect filter; pair with expectedEffectFilterField and effectKind for precise fixture seed selection.",
      },
      {
        id: "appPatternKey",
        role: ParameterRole.Filter,
        summary:
          "Filter fixture-seed rows by app-pattern pressure hint such as form-state-surface, router-shell-surface, table-collection-operations, or pressure-fixture.",
      },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal, EvidenceKind.SourceSpan],
    defaultBudget: { rows: 80, evidencePerSubject: 4 },
  },
  {
    id: LensId.AtlasSelf,
    family: LensFamily.Atlas,
    stage: LensStage.Implemented,
    summary:
      "Inspect exact Atlas source surfaces, contracts, routes, and value spaces for maintenance work.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.AtlasContracts,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Maintenance orientation." },
      {
        id: "recipes",
        summary:
          "Stored maintenance recipes that combine self-analysis rows with TypeScript source, type, module, and diagnostic reads.",
      },
      {
        id: "taxonomy",
        summary:
          "Source-backed self taxonomy rollup for enum, string, row, and relationship surfaces.",
      },
      {
        id: "phase-profile",
        summary:
          "Measured Atlas self-analysis phase costs as queryable rows for choosing cache, split, and substrate work.",
      },
      {
        id: "contracts",
        summary:
          "Lens contracts joined to runtime implementation paths and projection branches.",
      },
      {
        id: "projections",
        summary:
          "Runtime projection branches with owning function and lens reachability.",
      },
      {
        id: "continuations",
        summary:
          "Continuation object literals with target inquiry and route-claim visibility.",
      },
      {
        id: "semantic-routes",
        summary:
          "Declared framework semantic route topology with target endpoint visibility.",
      },
      {
        id: "modules",
        summary:
          "Atlas relative module dependency edges and cross-area pressure.",
      },
      {
        id: "substrate-surfaces",
        summary:
          "Substrate reader, builder, and schema surface declarations.",
      },
      {
        id: "contract-strings",
        summary:
          "Contract-bearing string literals classified by enum, schema, continuation, and lens contract roles.",
      },
      {
        id: "enums",
        summary:
          "Atlas enum declarations backed by the package-scoped enum usage index.",
      },
      {
        id: "enum-references",
        summary:
          "Exact Enum.Member reference sites with role and source context.",
      },
      {
        id: "enum-value-spaces",
        summary:
          "Enum member value spaces with raw literal overlap and shared values.",
      },
      {
        id: "enum-value-occurrences",
        summary:
          "Exact raw literal occurrences whose values overlap enum member values, including checker-backed contextual narrowing.",
      },
      {
        id: "enum-mappings",
        summary:
          "Exact enum-to-enum translation edges from case returns, object entries, assignments, and member initializers.",
      },
      {
        id: "strings",
        summary:
          "Grouped Atlas string literal values, defaulting to magic-string occurrences.",
      },
      {
        id: "relationship-surfaces",
        summary:
          "Interface/type surfaces with relationship axes such as relation, mechanism, phase, or endpoints.",
      },
      {
        id: "axis-pressure",
        summary:
          "Exact enum, mapper-function, stringly-field, optional object-spread, and parallel-axis pressure rows.",
      },
      {
        id: "row-surfaces",
        summary:
          "Structural interface/type row surfaces without implying relationship semantics.",
      },
      {
        id: "classes",
        summary:
          "Class declarations with method, field, heritage, constructor, and export surfaces.",
      },
      {
        id: "source-files",
        summary:
          "Atlas source files with line, statement, import, export, declaration, and source-area pressure.",
      },
      {
        id: "functions",
        summary: "Top-level function and class-method declaration surfaces.",
      },
      {
        id: "variables",
        summary:
          "Top-level variable declaration surfaces with export status and initializer shape.",
      },
      {
        id: "function-shapes",
        summary:
          "Repeated canonical AST/control-flow function body-shape groups for finding split-brain helpers.",
      },
      {
        id: "function-control-flow-shapes",
        summary:
          "Repeated switch-dispatch topology groups for finding parallel walkers and dispatch surfaces.",
      },
      {
        id: "function-wrappers",
        summary:
          "Shallow constructor/call wrappers with local direct-call and value-reference counts for spotting extraction-as-obfuscation pressure.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary:
          "Filter source-backed self-analysis rows by source package id.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter self-analysis rows by exact substring across names, files, fields, or literal values.",
      },
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary: "Filter Atlas self-analysis recipe rows by broad maintenance domain.",
      },
      {
        id: "lensId",
        role: ParameterRole.Filter,
        summary:
          "Filter contract, projection, or continuation rows by lens id.",
      },
      {
        id: "projectionId",
        role: ParameterRole.Filter,
        summary: "Filter contract or projection rows by projection id.",
      },
      {
        id: "parameterId",
        role: ParameterRole.Filter,
        summary: "Filter lens contract rows by declared parameter id.",
      },
      {
        id: "functionName",
        role: ParameterRole.Filter,
        summary:
          "Filter projection or function-surface rows by exact function name.",
      },
      {
        id: "variableName",
        role: ParameterRole.Filter,
        summary: "Filter variable-surface rows by exact top-level variable name.",
      },
      {
        id: "initializerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter variable-surface rows by broad initializer kind such as array-literal, object-literal, call, or none.",
      },
      {
        id: "minInitializerEntryCount",
        role: ParameterRole.Filter,
        summary:
          "Filter array/object variable initializers to declarations with at least this many entries.",
      },
      {
        id: "bodyFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function-surface rows by normalized body fingerprint; useful for following duplicate-body pressure.",
      },
      {
        id: "bodyShapeFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function-surface rows by AST/control-flow body fingerprint; useful for following duplicate-shape pressure.",
      },
      {
        id: "switchTopologyFingerprint",
        role: ParameterRole.Filter,
        summary:
          "Filter function-surface or control-flow-shape rows by stable switch-dispatch topology fingerprint.",
      },
      {
        id: "minSwitchTopologyCount",
        role: ParameterRole.Filter,
        summary:
          "Filter function-surface or control-flow-shape rows to bodies with at least this many switch statements in their topology.",
      },
      {
        id: "targetLens",
        role: ParameterRole.Filter,
        summary: "Filter continuation rows by target lens id or LensId member.",
      },
      {
        id: "targetProjection",
        role: ParameterRole.Filter,
        summary: "Filter continuation rows by target projection id.",
      },
      {
        id: "routeRelationMember",
        role: ParameterRole.Filter,
        summary:
          "Filter continuation or semantic-route rows by NavigationRelation member or value.",
      },
      {
        id: "semanticRouteId",
        role: ParameterRole.Filter,
        summary: "Filter semantic-route rows by declared route id.",
      },
      {
        id: "navigationSpecId",
        role: ParameterRole.Filter,
        summary: "Filter semantic-route rows by generic navigation route spec id.",
      },
      {
        id: "targetEndpointId",
        role: ParameterRole.Filter,
        summary: "Filter semantic-route rows by declared endpoint id.",
      },
      {
        id: "axis",
        role: ParameterRole.Filter,
        summary:
          "Filter row, relationship, or axis-pressure surfaces by semantic axis.",
      },
      {
        id: "axisId",
        role: ParameterRole.Filter,
        summary:
          "Filter axis-pressure rows by stable axis identity, keeping field labels and value spaces distinct.",
      },
      {
        id: "axisField",
        role: ParameterRole.Filter,
        summary:
          "Filter axis-pressure rows by the concrete field that carries the axis.",
      },
      {
        id: "valueSpace",
        role: ParameterRole.Filter,
        summary:
          "Filter axis-pressure rows by the typed value space carried by an axis.",
      },
      {
        id: "pressure",
        role: ParameterRole.Filter,
        summary: "Filter axis-pressure rows by low, medium, or high pressure.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary:
          "Filter phase-profile rows by exact self-analysis phase id.",
      },
      {
        id: "minMilliseconds",
        role: ParameterRole.Filter,
        summary:
          "Filter phase-profile rows to phases whose inclusive wall-clock time is at least this many milliseconds.",
      },
      {
        id: "minExclusiveMilliseconds",
        role: ParameterRole.Filter,
        summary:
          "Filter phase-profile rows to phases whose exclusive wall-clock time is at least this many milliseconds.",
      },
      {
        id: "fromArea",
        role: ParameterRole.Filter,
        summary: "Filter module dependency rows by Atlas source area.",
      },
      {
        id: "area",
        role: ParameterRole.Filter,
        summary: "Filter Atlas source-file surface rows by source area.",
      },
      {
        id: "toArea",
        role: ParameterRole.Filter,
        summary: "Filter module dependency rows by target Atlas source area.",
      },
      {
        id: "crossesArea",
        role: ParameterRole.Filter,
        summary:
          "Filter module dependency rows by whether they cross top-level Atlas source areas.",
      },
      {
        id: "class",
        role: ParameterRole.Filter,
        summary:
          "Filter contract string rows by classification such as lens-id, schema-or-version, or continuation-or-row-id.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary:
          "Filter continuation, substrate surface, or axis-pressure rows by row kind.",
      },
      {
        id: "enumName",
        role: ParameterRole.Filter,
        summary:
          "Filter enum declarations, references, value spaces, raw value occurrences, or mappings by exact enum declaration name.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary:
          "Filter enum references, value spaces, raw value occurrences, or mappings by exact enum member name.",
      },
      {
        id: "value",
        role: ParameterRole.Filter,
        summary:
          "Filter enum value-space or raw value occurrence rows by exact raw string/number value.",
      },
      {
        id: "valueKind",
        role: ParameterRole.Filter,
        summary:
          "Filter enum value-space or raw value occurrence rows by raw value kind.",
        values: ["string", "number"],
      },
      {
        id: "contextualOnly",
        role: ParameterRole.Filter,
        summary:
          "Filter enum raw value occurrence rows to literal sites with checker-backed contextual enum narrowing.",
      },
      {
        id: "fromEnum",
        role: ParameterRole.Filter,
        summary: "Filter enum mapping rows by source enum name.",
      },
      {
        id: "toEnum",
        role: ParameterRole.Filter,
        summary: "Filter enum mapping rows by target enum name.",
      },
      {
        id: "carrier",
        role: ParameterRole.Filter,
        summary:
          "Filter enum mapping rows by carrier such as case-return or object-entry.",
      },
      {
        id: "enumRelation",
        role: ParameterRole.Filter,
        summary:
          "Filter enum mapping rows by relation, distinguishing translation from raw value-overlap.",
      },
      {
        id: "role",
        role: ParameterRole.Filter,
        summary:
          "Filter enum reference or raw value occurrence rows by syntactic role such as case-label, return-expression, object-value, or call-argument.",
      },
      {
        id: "stringRole",
        role: ParameterRole.Filter,
        summary: "Filter string literal rows by occurrence role.",
      },
      {
        id: "magicOnly",
        role: ParameterRole.Filter,
        summary:
          "When true, string rows exclude module specifiers and enum member declarations.",
      },
      {
        id: "declarationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter row or relationship surfaces by TypeScript declaration kind.",
        values: ["interface", "type-alias"],
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary: "Filter row surfaces by exact ontology class.",
        values: ["row", "relationship"],
      },
      {
        id: "surfaceRole",
        role: ParameterRole.Filter,
        summary: "Filter row surfaces by Atlas role.",
        values: [
          "row",
          "relationship-row",
          "filter",
          "classification",
          "basis-transition",
          "navigation-contract",
        ],
      },
      {
        id: "className",
        role: ParameterRole.Filter,
        summary: "Filter class surfaces by exact class declaration name.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter class surfaces by exact instance or static method name.",
      },
      {
        id: "functionKind",
        role: ParameterRole.Filter,
        summary: "Filter function surfaces by declaration family.",
        values: ["top-level", "class-method"],
      },
      {
        id: "moduleShape",
        role: ParameterRole.Filter,
        summary:
          "Filter source-file surfaces by coarse module shape.",
        values: ["barrel", "catalog", "contract", "implementation", "mixed"],
      },
      {
        id: "minLineCount",
        role: ParameterRole.Filter,
        summary: "Filter class, function, or repeated function-shape surfaces to declarations or grouped declarations spanning at least this many lines.",
      },
      {
        id: "minOutgoingLocalImportCount",
        role: ParameterRole.Filter,
        summary: "Filter source-file surfaces to files with at least this many resolved local outgoing edges.",
      },
      {
        id: "minIncomingLocalImportCount",
        role: ParameterRole.Filter,
        summary: "Filter source-file surfaces to files with at least this many resolved local incoming edges.",
      },
      {
        id: "minCrossAreaOutgoingImportCount",
        role: ParameterRole.Filter,
        summary: "Filter source-file surfaces to files with at least this many outgoing edges crossing Atlas source areas.",
      },
      {
        id: "minCallCount",
        role: ParameterRole.Filter,
        summary: "Filter function surfaces to declarations containing at least this many direct call expressions.",
      },
      {
        id: "minFunctionCount",
        role: ParameterRole.Filter,
        summary: "Filter repeated function-shape groups to at least this many grouped declarations.",
      },
      {
        id: "minNameCount",
        role: ParameterRole.Filter,
        summary: "Filter repeated function-shape groups to at least this many distinct declaration names.",
      },
      {
        id: "minFileCount",
        role: ParameterRole.Filter,
        summary: "Filter repeated function-shape groups to at least this many source files.",
      },
      {
        id: "minUniqueCallTargetCount",
        role: ParameterRole.Filter,
        summary: "Filter function surfaces to declarations calling at least this many unique local targets.",
      },
      {
        id: "minMethodCount",
        role: ParameterRole.Filter,
        summary: "Filter class surfaces to declarations exposing at least this many methods.",
      },
      {
        id: "minPropertyCount",
        role: ParameterRole.Filter,
        summary: "Filter class surfaces to declarations exposing at least this many fields, properties, or accessors.",
      },
      {
        id: "orderBy",
        role: ParameterRole.Execution,
        summary: "Order Atlas self rows by source, size, lineCount, methodCount, propertyCount, callCount, uniqueCallTargetCount, importCount, exportCount, outgoingLocalImportCount, incomingLocalImportCount, or crossAreaOutgoingImportCount where applicable.",
        values: ["source", "size", "lineCount", "methodCount", "propertyCount", "callCount", "uniqueCallTargetCount", "importCount", "exportCount", "outgoingLocalImportCount", "incomingLocalImportCount", "crossAreaOutgoingImportCount"],
      },
      {
        id: "includeSourceProject",
        role: ParameterRole.Projection,
        summary:
          "Include the full source project package summary; omitted by default to keep self answers compact.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.AtlasMemory,
    family: LensFamily.Atlas,
    stage: LensStage.Implemented,
    summary:
      "Query durable Atlas memory records joined to live source, product-architecture pressure, atlas.self pressure, and stale/resolved status.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.AtlasMemory,
      SubstrateId.ProductArchitecture,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Compact rollup of durable records, live frontiers, untracked pressure, and storage issues.",
      },
      {
        id: "records",
        summary:
          "Durable records joined to computed live status.",
      },
      {
        id: "frontiers",
        summary:
          "Live active, intentional, stale, and untracked work frontiers.",
      },
      {
        id: "next",
        summary:
          "Ranked next actions computed from storage issues, stale records, live frontiers, and untracked product pressure.",
      },
      {
        id: "guidance",
        summary:
          "Reuse guidance records for deciding what source, lens, or script to inspect before solving a problem.",
      },
      {
        id: "stale",
        summary:
          "Resolved or stale records that should not be trusted as active work without re-checking.",
      },
      {
        id: "schema",
        summary:
          "Machine-readable memory record shape and authoring guidance.",
      },
    ],
    parameters: [
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter memory rows by exact substring across ids, summaries, domains, guidance, anchors, and live check summaries.",
      },
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary:
          "Filter memory rows by one or more broad problem domains such as evaluator, router, authoring, or product-architecture. Multiple domains default to all-of matching.",
      },
      {
        id: "domainMode",
        role: ParameterRole.Filter,
        summary:
          "Choose all-of or any-of semantics for multi-domain memory filters.",
        values: [
          "all",
          "any",
        ],
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary:
          "Filter durable records by memory kind or frontier discriminator.",
        values: [
          "pressure-frontier",
          "intentional-shape",
          "reuse-guide",
          "decision",
          "doc-shard",
          "memory-record",
          "untracked-product-class",
          "repair-storage",
          "review-stale-memory",
          "seed-untracked-area",
          "inspect-untracked-frontier",
          "continue-live-frontier",
          "consult-live-frontier",
          "consult-memory-record",
          "consult-reuse-guide",
        ],
      },
      {
        id: "status",
        role: ParameterRole.Filter,
        summary:
          "Filter rows by computed status.",
        values: [
          "active",
          "intentional-live",
          "reference",
          "resolved",
          "stale-source",
          "stale-check",
          "untracked",
          "storage-issue",
        ],
      },
      {
        id: "recordId",
        role: ParameterRole.Filter,
        summary: "Filter rows by exact durable memory record id.",
      },
      {
        id: "path",
        role: ParameterRole.Filter,
        summary:
          "Filter memory rows by source/doc anchor path, durable shard path, live-check path, or untracked frontier source path.",
      },
      {
        id: "surfaceRole",
        role: ParameterRole.Filter,
        summary:
          "Filter untracked product class frontier rows by product.architecture class role.",
        values: [
          "product-owner",
          "publisher",
          "work-frame",
          "data-carrier",
          "service-surface",
          "epoch-context",
          "semantic-model",
          "other",
        ],
      },
      {
        id: "liveCheckKind",
        role: ParameterRole.Filter,
        summary:
          "Filter durable memory records and computed next actions by the live-check mechanism that keeps the record honest.",
        values: [
          "product-large-class",
          "source-file-exists",
          "source-declaration-exists",
          "atlas-self-source-file",
          "atlas-self-class",
          "atlas-self-function",
          "auLink-exists",
        ],
      },
      {
        id: "anchorKind",
        role: ParameterRole.Filter,
        summary:
          "Filter durable memory records by structural anchor kind such as source, lens, script, doc, or auLink.",
        values: ["source", "lens", "script", "doc", "auLink"],
      },
      {
        id: "anchorLensId",
        role: ParameterRole.Filter,
        summary:
          "Filter durable memory records and computed next actions by exact lens anchor id.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter durable memory records and computed next actions by source anchor or live-check symbol name.",
      },
      {
        id: "auLinkId",
        role: ParameterRole.Filter,
        summary:
          "Filter durable memory records and computed next actions by auLink anchor or auLink-exists live check id.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.AtlasWorkRouter,
    family: LensFamily.Atlas,
    stage: LensStage.Implemented,
    summary:
      "Route autonomous work through typed domains, roles, source anchors, lens anchors, memory domains, auLink ids, and framework corpus concepts before falling back to visibly weak prose matches.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.AtlasWorkRouter,
      SubstrateId.AtlasMemory,
      SubstrateId.ProductArchitecture,
      SubstrateId.FrameworkCorpus,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Compact matched route rows plus a small number of live route plans for orientation.",
      },
      {
        id: "routes",
        summary:
          "Paged route rows with explicit match authority and anchor counts.",
      },
      {
        id: "next",
        summary:
          "Checkpoint-friendly alias for selected route plans with memory next actions and route-specific next questions.",
      },
      {
        id: "route-plan",
        summary:
          "Selected routes joined to live source anchors, Atlas memory, and framework corpus seeds.",
      },
      {
        id: "next-questions",
        summary:
          "Selected route plans with route-specific next questions foregrounded for autonomous continuation.",
      },
      {
        id: "route-health",
        summary:
          "Selected routes checked for missing source anchors and empty memory/corpus joins.",
      },
      {
        id: "coverage",
        summary:
          "Route-local coverage rows for cross-cutting dimensions such as intent-aware continuation threading.",
      },
      {
        id: "workset",
        summary:
          "Current git worktree files joined to work routes through source/doc anchors and memory shards.",
      },
      {
        id: "memory-coverage",
        summary:
          "Atlas memory next actions joined back to typed work routes, exposing unrouted live frontiers.",
      },
      {
        id: "schema",
        summary:
          "Machine-readable route schema, catalog definitions, anchor vocabulary, and match semantics.",
      },
    ],
    parameters: [
      {
        id: "routeId",
        role: ParameterRole.Filter,
        summary:
          "Select an exact typed work route by id; this is the strongest route match.",
      },
      {
        id: "relatedTo",
        role: ParameterRole.Filter,
        summary:
          "Select routes that explicitly declare adjacency to another route id.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Match declared route vocabulary first and descriptive prose only as a weak-text open seam.",
      },
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary:
          "Filter by route-owned product/problem domains such as authoring, forms, router, evaluator, or atlas.",
      },
      {
        id: "domainMode",
        role: ParameterRole.Filter,
        summary:
          "Choose all-of or any-of semantics for multi-domain route filters.",
        values: ["all", "any"],
      },
      {
        id: "role",
        role: ParameterRole.Filter,
        summary:
          "Filter by work role such as orient, author, analyze, refactor, verify, document, or improve-atlas.",
        values: [
          "orient",
          "author",
          "analyze",
          "refactor",
          "verify",
          "document",
          "improve-atlas",
        ],
      },
      {
        id: "lensId",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare an exact Atlas lens anchor.",
      },
      {
        id: "path",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare a matching source or documentation path anchor.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare a matching source symbol, auLink symbol, or memory symbol anchor.",
      },
      {
        id: "auLinkId",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare a matching auLink or memory auLink anchor.",
      },
      {
        id: "concept",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare a framework corpus concept anchor such as forms, router, observation, or templates.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare an expected semantic effect kind anchor.",
      },
      {
        id: "appPatternKey",
        role: ParameterRole.Filter,
        summary:
          "Filter routes that declare an app-pattern pressure key anchor.",
      },
      {
        id: "seedUse",
        role: ParameterRole.Filter,
        summary:
          "Filter routes and fixture seeds by corpus authority lane, such as authoring-taste or behavior-grounding.",
      },
      {
        id: "coverageDimension",
        role: ParameterRole.Filter,
        summary:
          "Filter routes by a declared cross-cutting coverage dimension.",
        values: ["intent-aware-continuations"],
      },
      {
        id: "coverageState",
        role: ParameterRole.Filter,
        summary:
          "Filter routes by coverage state for the selected cross-cutting dimension.",
        values: ["covered", "partial", "missing", "not-applicable"],
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 24, evidencePerSubject: 4 },
  },
];

/** Return one lens spec or fail loudly on static contract drift. */
export function findLensSpec(id: LensId): LensSpec {
  const spec = LensCatalog.find((lens) => lens.id === id);
  if (spec === undefined) {
    throw new Error(`Unknown lens: ${id}`);
  }
  return spec;
}
