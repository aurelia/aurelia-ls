import type ts from "typescript";

import type {
  SourceDeclarationKind,
  SourceFileIdentity,
  SourceSpan,
} from "./project.js";

/** Selector scheme for resolving source, declaration, symbol, or checker targets. */
export const enum SourceSelectorScheme {
  /** Select the whole admitted TypeScript workspace. */
  Workspace = "workspace",
  /** Select one admitted source package. */
  Package = "package",
  /** Select a directory of admitted source files. */
  Directory = "directory",
  /** Select one admitted source file. */
  File = "file",
  /** Select one exact source range. */
  Range = "range",
  /** Select the smallest syntax node at a zero-based source position. */
  Position = "position",
  /** Select exact identifier token occurrences inside one file. */
  Token = "token",
  /** Select exact declaration rows by name, kind, file, or package. */
  Declaration = "declaration",
  /** Select exported declarations from a package or file entry surface. */
  Export = "export",
}

/** Zero-based source position selector. */
export interface SourcePositionSelector {
  /** Zero-based line number. */
  readonly line: number;
  /** Zero-based UTF-16 character within the line. */
  readonly character: number;
}

/** Selector rooted at the whole admitted TypeScript workspace. */
export interface WorkspaceSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Workspace;
  /** Optional exact declaration name to keep from the workspace. */
  readonly query?: string;
}

/** Selector rooted at one admitted package. */
export interface PackageSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Package;
  /** Optional package id from the Atlas source admission contract. */
  readonly packageId?: string;
  /** Optional package.json name from the Atlas source admission contract. */
  readonly packageName?: string;
}

/** Selector rooted at a source directory. */
export interface DirectorySourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Directory;
  /** Repository-relative or absolute directory path. */
  readonly path: string;
  /** Whether nested files are included. Defaults to true. */
  readonly recursive?: boolean;
}

/** Selector rooted at one source file. */
export interface FileSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.File;
  /** Repository-relative or absolute source file path. */
  readonly filePath: string;
}

/** Selector rooted at one exact source range. */
export interface RangeSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Range;
  /** Repository-relative or absolute source file path. */
  readonly filePath: string;
  /** Zero-based inclusive start position. */
  readonly start: SourcePositionSelector;
  /** Zero-based exclusive end position. */
  readonly end: SourcePositionSelector;
}

/** Selector rooted at one zero-based source position. */
export interface PositionSourceSelector extends SourcePositionSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Position;
  /** Repository-relative or absolute source file path. */
  readonly filePath: string;
}

/** Selector rooted at exact identifier text inside one source file. */
export interface TokenSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Token;
  /** Repository-relative or absolute source file path. */
  readonly filePath: string;
  /** Exact identifier text to resolve. */
  readonly text: string;
  /** Zero-based occurrence after deterministic source-order sorting. */
  readonly occurrence?: number;
}

/** Selector rooted at exact declaration inventory rows. */
export interface DeclarationSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Declaration;
  /** Exact declaration name. */
  readonly name: string;
  /** Optional declaration kind, using Atlas declaration kind values. */
  readonly kind?: SourceDeclarationKind | string;
  /** Optional admitted package id. */
  readonly packageId?: string;
  /** Optional package.json name. */
  readonly packageName?: string;
  /** Optional repository-relative or absolute file path. */
  readonly filePath?: string;
  /** Zero-based occurrence after deterministic source-order sorting. */
  readonly occurrence?: number;
}

/** Selector rooted at exported declarations visible from a package or file. */
export interface ExportSourceSelector {
  /** Selector discriminator. */
  readonly scheme: SourceSelectorScheme.Export;
  /** Exact exported name. */
  readonly exportName: string;
  /** Optional admitted package id. */
  readonly packageId?: string;
  /** Optional package.json name. */
  readonly packageName?: string;
  /** Optional repository-relative or absolute file path used as the export surface. */
  readonly filePath?: string;
}

/** TypeScript source selector accepted by Atlas source-backed lenses. */
export type SourceSelector =
  | WorkspaceSourceSelector
  | PackageSourceSelector
  | DirectorySourceSelector
  | FileSourceSelector
  | RangeSourceSelector
  | PositionSourceSelector
  | TokenSourceSelector
  | DeclarationSourceSelector
  | ExportSourceSelector;

/** Runtime target family produced by selector resolution. */
export const enum SourceTargetKind {
  /** Target represents the whole admitted workspace. */
  Workspace = "workspace",
  /** Target represents one admitted package. */
  Package = "package",
  /** Target represents one directory scope. */
  Directory = "directory",
  /** Target represents one source file. */
  SourceFile = "source-file",
  /** Target represents one exact source range. */
  SourceRange = "source-range",
  /** Target represents one declaration node. */
  Declaration = "declaration",
  /** Target represents one checker-visible symbol. */
  Symbol = "symbol",
}

/** Serializable source target row returned by source substrate reads. */
export interface SourceTargetRow {
  /** Runtime target family. */
  readonly kind: SourceTargetKind;
  /** Stable target id for handles and continuations within the current source basis. */
  readonly id: string;
  /** Short target label for compact rows. */
  readonly label: string;
  /** File identity when the target is rooted in one source file. */
  readonly file?: SourceFileIdentity;
  /** Source span when the target has exact source coordinates. */
  readonly span?: SourceSpan;
  /** Declaration kind when the target is a declaration. */
  readonly declarationKind?: SourceDeclarationKind;
  /** Exact symbol key when TypeScript exposes one. */
  readonly symbolKey?: string;
}

/** Current-epoch source target with TypeScript objects retained for lens implementation. */
export interface ResolvedSourceTarget extends SourceTargetRow {
  /** Source file object owned by the current Program epoch. */
  readonly sourceFile?: ts.SourceFile;
  /** Syntax node selected by this target, when any. */
  readonly node?: ts.Node;
  /** Checker-visible symbol selected by this target, when any. */
  readonly symbol?: ts.Symbol;
}

/** Resolution result for one source selector. */
export interface SourceSelectorResolution {
  /** Selector that was resolved. */
  readonly selector: SourceSelector;
  /** Serializable targets matched by the selector after exact filters are applied. */
  readonly targets: readonly SourceTargetRow[];
  /** Number of candidates before occurrence slicing. */
  readonly candidateCount: number;
  /** Machine-readable resolution diagnostics. */
  readonly diagnostics: readonly SourceResolutionDiagnostic[];
}

/** Current-epoch resolution result retained inside source substrate implementation. */
export interface ResolvedSourceSelectorResolution extends SourceSelectorResolution {
  /** Current-epoch targets matched by the selector after exact filters are applied. */
  readonly targets: readonly ResolvedSourceTarget[];
}

/** Diagnostic emitted while resolving a source selector. */
export interface SourceResolutionDiagnostic {
  /** Stable diagnostic code. */
  readonly code: string;
  /** Grounded diagnostic summary. */
  readonly message: string;
}

/** Options for bounded source text reads. */
export interface SourceTextReadOptions {
  /** Maximum source characters returned per target. */
  readonly maxTextChars: number;
}

/** One bounded source text slice. */
export interface SourceTextSlice {
  /** Target whose text was read. */
  readonly target: SourceTargetRow;
  /** Source text capped by the requested character budget. */
  readonly text: string;
  /** Total characters available before truncation. */
  readonly totalChars: number;
  /** True when returned text was truncated. */
  readonly truncated: boolean;
}

/** Result returned by the source text substrate. */
export interface SourceTextRead {
  /** Selector resolution used for the read. */
  readonly resolution: SourceSelectorResolution;
  /** Text slices returned for resolved source targets. */
  readonly slices: readonly SourceTextSlice[];
}

/** Options for API-surface projection. */
export interface ApiSurfaceOptions {
  /** Maximum declaration rows returned. */
  readonly limit: number;
  /** Zero-based declaration offset. */
  readonly offset?: number;
}

/** Options for document-symbol projection. */
export interface DocumentSymbolOptions extends ApiSurfaceOptions {
  /** Optional exact substring to match against symbol names or containers. */
  readonly query?: string;
}

/** TypeScript declaration row with checker-backed display data. */
export interface TypeScriptApiSurfaceEntry {
  /** Declaration target row. */
  readonly target: SourceTargetRow;
  /** Declaration kind. */
  readonly kind: SourceDeclarationKind;
  /** Declaration name when the syntax carries one. */
  readonly name: string | null;
  /** True when the declaration has an export modifier or is visible from an export selector. */
  readonly exported: boolean;
  /** Checker-visible signature or type display. */
  readonly display: string | null;
}

/** Rollup counts for an API-surface read. */
export interface TypeScriptApiSurfaceRollup {
  /** Number of source files in the selected surface. */
  readonly fileCount: number;
  /** Number of declaration entries in the selected surface before pagination. */
  readonly totalEntries: number;
  /** Declaration counts by Atlas declaration kind. */
  readonly entryKindCounts: Readonly<Record<SourceDeclarationKind, number>>;
}

/** Bounded API-surface projection over TypeScript declarations. */
export interface TypeScriptApiSurface {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Rollup counts for the full selected surface. */
  readonly rollup: TypeScriptApiSurfaceRollup;
  /** Declaration rows in the requested page. */
  readonly entries: readonly TypeScriptApiSurfaceEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more entries exist. */
  readonly nextOffset?: number;
}

/** Static module edge family observed in TypeScript source. */
export const enum TypeScriptModuleEdgeKind {
  /** Static import declaration. */
  Import = "import",
  /** Static export declaration with a module specifier. */
  Export = "export",
  /** Dynamic import call with a literal module specifier. */
  DynamicImport = "dynamic-import",
}

/** TypeScript module edge observed in one source file. */
export interface TypeScriptModuleEdge {
  /** Stable edge id inside the current source basis. */
  readonly id: string;
  /** Module edge family. */
  readonly kind: TypeScriptModuleEdgeKind;
  /** Source file that contains the module edge. */
  readonly sourceFile: SourceFileIdentity;
  /** Exact module specifier text from source, without quotes. */
  readonly specifier: string;
  /** Best-effort resolved in-repo target file for relative specifiers. */
  readonly resolvedFile?: SourceFileIdentity;
  /** Imported names, namespace names, or default import names visible on an import edge. */
  readonly importedNames: readonly string[];
  /** Exported names visible on an export edge. */
  readonly exportedNames: readonly string[];
  /** True when TypeScript syntax marks the edge type-only. */
  readonly typeOnly: boolean;
  /** Source span for the import/export/dynamic-import syntax. */
  readonly span: SourceSpan;
}

/** Bounded module graph projection over TypeScript source files. */
export interface TypeScriptModuleGraph {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Number of source files selected before edge extraction. */
  readonly fileCount: number;
  /** Total module edges before pagination. */
  readonly totalEdges: number;
  /** Module edges in the requested page. */
  readonly edges: readonly TypeScriptModuleEdge[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more edges exist. */
  readonly nextOffset?: number;
}

/** One flattened document symbol row from TypeScript's navigation tree. */
export interface TypeScriptDocumentSymbolEntry {
  /** Stable document-symbol id inside the current source basis. */
  readonly id: string;
  /** Source file containing the symbol. */
  readonly file: SourceFileIdentity;
  /** Symbol name. */
  readonly name: string;
  /** TypeScript script element kind. */
  readonly kind: string;
  /** TypeScript script element kind modifiers. */
  readonly kindModifiers: string;
  /** Whole symbol span. */
  readonly span: SourceSpan;
  /** Name span when TypeScript provides one. */
  readonly nameSpan?: SourceSpan;
  /** Zero-based depth in the navigation tree. */
  readonly depth: number;
  /** Number of direct child symbols. */
  readonly childCount: number;
}

/** Bounded document-symbol projection over TypeScript navigation trees. */
export interface TypeScriptDocumentSymbolsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Number of source files selected before symbol extraction. */
  readonly fileCount: number;
  /** Optional exact substring applied to symbol names or kind labels. */
  readonly query?: string;
  /** Total document-symbol rows before pagination. */
  readonly totalSymbols: number;
  /** Document-symbol rows in the requested page. */
  readonly symbols: readonly TypeScriptDocumentSymbolEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more symbols exist. */
  readonly nextOffset?: number;
}

/** Options for symbol index projection. */
export interface SymbolIndexOptions {
  /** Maximum symbol rows returned. */
  readonly limit: number;
  /** Zero-based symbol offset. */
  readonly offset?: number;
  /** Optional exact substring to match against declaration names. */
  readonly query?: string;
}

/** Bounded declaration-symbol projection over TypeScript source files. */
export interface TypeScriptSymbolIndex {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Query applied to declaration names. */
  readonly query?: string;
  /** Total symbol rows before pagination. */
  readonly totalEntries: number;
  /** Symbol rows in the requested page. */
  readonly entries: readonly TypeScriptApiSurfaceEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more symbol rows exist. */
  readonly nextOffset?: number;
}

/** Options for package/file export surface projection. */
export interface ExportSurfaceOptions extends ApiSurfaceOptions {
  /** Optional exact substring to match against exported names. */
  readonly query?: string;
  /** Optional exact member/property name that the exported value type must expose. */
  readonly memberName?: string;
  /** Optional checker type-display substring that the exported value type must include. */
  readonly typeIncludes?: string;
  /** Optional checker symbol name that must appear in the exported value type graph. */
  readonly typeSymbolName?: string;
  /** Whether checker-visible member names should be projected. Defaults to true. */
  readonly includeMemberNames?: boolean;
}

/** One checker-visible export row from a package or module surface. */
export interface TypeScriptExportSurfaceEntry {
  /** Stable export row id inside the current source basis. */
  readonly id: string;
  /** Exported name visible from the surface. */
  readonly exportName: string;
  /** Source file whose module symbol exposes this export. */
  readonly surfaceFile: SourceFileIdentity;
  /** True when the export symbol is an alias. */
  readonly alias: boolean;
  /** Resolved symbol display name after alias unwrapping when needed. */
  readonly resolvedName: string;
  /** Numeric TypeScript SymbolFlags value on the exported symbol. */
  readonly symbolFlags: number;
  /** Checker fully-qualified symbol name after alias unwrapping when available. */
  readonly fullyQualifiedName: string | null;
  /** Checker type display for the exported symbol. */
  readonly type: string | null;
  /** Checker-visible apparent member names on the exported value type. */
  readonly memberNames: readonly string[];
  /** Declaration targets that back this export. */
  readonly targets: readonly SourceTargetRow[];
}

/** Options for cheap package/file export-name projection. */
export interface ExportNameSurfaceOptions extends ApiSurfaceOptions {
  /** Optional exact substring to match against exported names. */
  readonly query?: string;
  /** Resolve alias symbols for resolvedName. Defaults to false. */
  readonly resolveAliases?: boolean;
  /** Include checker fully-qualified names. Defaults to false because alias FQN expansion can be expensive. */
  readonly includeFullyQualifiedName?: boolean;
}

/** One checker-visible exported name from a package or module surface. */
export interface TypeScriptExportNameEntry {
  /** Stable export-name row id inside the current source basis. */
  readonly id: string;
  /** Exported name visible from the surface. */
  readonly exportName: string;
  /** Source file whose module symbol exposes this export. */
  readonly surfaceFile: SourceFileIdentity;
  /** True when the export symbol is an alias. */
  readonly alias: boolean;
  /** Resolved symbol display name after alias unwrapping when needed. */
  readonly resolvedName: string;
  /** Numeric TypeScript SymbolFlags value on the exported symbol. */
  readonly symbolFlags: number;
  /** Checker fully-qualified symbol name after alias unwrapping when available. */
  readonly fullyQualifiedName: string | null;
}

/** Bounded checker-visible export names over package entrypoints or module files. */
export interface TypeScriptExportNameSurfaceRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Number of module surfaces inspected for exports. */
  readonly surfaceCount: number;
  /** Total export-name rows before pagination. */
  readonly totalExports: number;
  /** Query applied to exported names. */
  readonly query?: string;
  /** Export-name rows in the requested page. */
  readonly exports: readonly TypeScriptExportNameEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more rows exist. */
  readonly nextOffset?: number;
}

/** Bounded export surface over package entrypoints or module files. */
export interface TypeScriptExportSurfaceRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Number of module surfaces inspected for exports. */
  readonly surfaceCount: number;
  /** Total export rows before pagination. */
  readonly totalExports: number;
  /** Query applied to exported names. */
  readonly query?: string;
  /** Export rows in the requested page. */
  readonly exports: readonly TypeScriptExportSurfaceEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more rows exist. */
  readonly nextOffset?: number;
}

export interface ExportSurfaceReadContext {
  readonly memberPresenceBySymbol: Map<string, boolean>;
}

/** Options for TypeChecker fact projection. */
export interface TypeFactOptions {
  /** Maximum target rows returned. */
  readonly limit: number;
  /** Maximum member rows returned for each target. */
  readonly memberLimit: number;
}

/** Checker-visible member row for one type fact. */
export interface TypeScriptMemberFact {
  /** Member symbol name. */
  readonly name: string;
  /** Checker-visible member type display. */
  readonly type: string | null;
  /** True when the member symbol is optional. */
  readonly optional: boolean;
  /** Source span for the first declaration when available. */
  readonly span?: SourceSpan;
}

/** Checker-visible type fact for one resolved target. */
export interface TypeScriptTypeFact {
  /** Target whose checker fact was read. */
  readonly target: SourceTargetRow;
  /** Symbol display name when available. */
  readonly symbolName: string | null;
  /** Checker fully-qualified symbol name when available. */
  readonly fullyQualifiedName: string | null;
  /** Type display from TypeChecker.typeToString. */
  readonly type: string;
  /** Apparent type display from TypeChecker.getApparentType. */
  readonly apparentType: string;
  /** Numeric TypeScript TypeFlags value for exact downstream classification. */
  readonly typeFlags: number;
  /** Numeric TypeScript SymbolFlags value when a symbol is selected. */
  readonly symbolFlags: number | null;
  /** Number of call signatures visible on this type. */
  readonly callSignatureCount: number;
  /** Number of construct signatures visible on this type. */
  readonly constructSignatureCount: number;
  /** Bounded checker-visible property/member rows. */
  readonly members: readonly TypeScriptMemberFact[];
  /** True when member rows were truncated. */
  readonly membersTruncated: boolean;
}

/** Bounded TypeChecker facts for resolved targets. */
export interface TypeScriptTypeFacts {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Checker fact rows returned for resolved targets. */
  readonly facts: readonly TypeScriptTypeFact[];
}

/** Options for TypeScript reference projection. */
export interface ReferenceReadOptions {
  /** Maximum reference rows returned. */
  readonly limit: number;
  /** Zero-based reference offset. */
  readonly offset?: number;
}

/** Exact syntactic role observed for a TypeScript reference span. */
export const enum TypeScriptReferenceRole {
  /** TypeScript identified this span as the symbol definition. */
  Definition = "definition",
  /** TypeScript marked this reference as a write access. */
  Write = "write",
  /** TypeScript marked this reference as a non-write read/access. */
  Read = "read",
  /** Reference occurs inside an import form. */
  Import = "import",
  /** Reference occurs inside an export form. */
  Export = "export",
  /** Reference occurs inside syntax TypeScript marks type-only. */
  TypeOnly = "type-only",
  /** Reference occurs inside a type node. */
  TypePosition = "type-position",
  /** Reference occurs inside a call expression callee. */
  Call = "call",
  /** Reference occurs inside a new expression constructor target. */
  Construct = "construct",
  /** Reference occurs inside a property access expression. */
  PropertyAccess = "property-access",
  /** Reference occurs inside an element access expression. */
  ElementAccess = "element-access",
  /** Reference occurs as an object literal member key. */
  ObjectLiteralKey = "object-literal-key",
  /** Reference occurs inside an extends/implements heritage clause. */
  Heritage = "heritage",
  /** Reference occurs inside a decorator expression. */
  Decorator = "decorator",
  /** TypeScript marked this reference as occurring inside a string literal. */
  StringLiteral = "string-literal",
}

/** One TypeScript reference location. */
export interface TypeScriptReferenceEntry {
  /** Stable reference id inside the current source basis. */
  readonly id: string;
  /** Source file containing the reference. */
  readonly file: SourceFileIdentity;
  /** Exact source span for this reference. */
  readonly span: SourceSpan;
  /** Text at the reference span. */
  readonly text: string;
  /** True when TypeScript marks this reference as a definition. */
  readonly definition: boolean;
  /** True when TypeScript marks this reference as a write. */
  readonly writeAccess: boolean;
  /** True when the reference appears inside a string literal. */
  readonly inString: boolean;
  /** Exact TypeScript and syntax-derived roles for this reference span. */
  readonly roles: readonly TypeScriptReferenceRole[];
  /** TypeScript syntax kind for the smallest node at the reference span, when available. */
  readonly syntaxKindName?: string;
}

/** Bounded TypeScript reference projection for resolved targets. */
export interface TypeScriptReferenceRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total reference rows before pagination. */
  readonly totalReferences: number;
  /** Reference rows in the requested page. */
  readonly references: readonly TypeScriptReferenceEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more reference rows exist. */
  readonly nextOffset?: number;
}

/** Navigation relation family returned by TypeScript definition APIs. */
export const enum TypeScriptNavigationKind {
  /** Runtime/value or declaration definition. */
  Definition = "definition",
  /** Type definition for the selected symbol. */
  TypeDefinition = "type-definition",
  /** Implementation of an interface or abstract declaration. */
  Implementation = "implementation",
}

/** One TypeScript language-service navigation target. */
export interface TypeScriptNavigationEntry {
  /** Stable navigation row id inside the current source basis. */
  readonly id: string;
  /** Navigation relation family. */
  readonly kind: TypeScriptNavigationKind;
  /** Source target that produced this navigation row. */
  readonly origin: SourceTargetRow;
  /** Target source file. */
  readonly file: SourceFileIdentity;
  /** Exact target span. */
  readonly span: SourceSpan;
  /** Context span when the language service provides one. */
  readonly contextSpan?: SourceSpan;
  /** TypeScript script element kind, when available. */
  readonly scriptElementKindName?: string;
  /** Target name, when available. */
  readonly name?: string;
  /** Target container name, when available. */
  readonly containerName?: string;
  /** Display text, when available. */
  readonly display?: string;
}

/** Bounded TypeScript navigation projection for resolved targets. */
export interface TypeScriptNavigationRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total navigation rows before pagination. */
  readonly totalEntries: number;
  /** Navigation rows in the requested page. */
  readonly entries: readonly TypeScriptNavigationEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more entries exist. */
  readonly nextOffset?: number;
}

/** TypeScript call-hierarchy direction. */
export const enum TypeScriptCallHierarchyDirection {
  /** Incoming callers. */
  Incoming = "incoming",
  /** Outgoing callees. */
  Outgoing = "outgoing",
}

/** Semantic relation carried by a TypeScript call-hierarchy edge. */
export const enum TypeScriptCallHierarchyRelation {
  /** Caller item invokes callee item. */
  Calls = "calls",
}

/** One TypeScript call-hierarchy item. */
export interface TypeScriptCallHierarchyItemRow {
  /** Stable item id inside the current source basis. */
  readonly id: string;
  /** Item name. */
  readonly name: string;
  /** TypeScript script element kind. */
  readonly kind: string;
  /** Container name, when available. */
  readonly containerName?: string;
  /** Source file containing the item. */
  readonly file: SourceFileIdentity;
  /** Whole item span. */
  readonly span: SourceSpan;
  /** Selection/name span. */
  readonly selectionSpan: SourceSpan;
}

/** One TypeScript call-hierarchy edge. */
export interface TypeScriptCallHierarchyEdge {
  /** Stable edge id inside the current source basis. */
  readonly id: string;
  /** Semantic relation from caller to callee. */
  readonly relation: TypeScriptCallHierarchyRelation;
  /** Incoming or outgoing direction relative to the selected item. */
  readonly direction: TypeScriptCallHierarchyDirection;
  /** Caller item. */
  readonly from: TypeScriptCallHierarchyItemRow;
  /** Callee item. */
  readonly to: TypeScriptCallHierarchyItemRow;
  /** Call/reference spans on the caller side. */
  readonly fromSpans: readonly SourceSpan[];
}

/** Bounded TypeScript call-hierarchy projection for resolved targets. */
export interface TypeScriptCallHierarchyRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Prepared call-hierarchy items for the selected target(s). */
  readonly items: readonly TypeScriptCallHierarchyItemRow[];
  /** Total call-hierarchy edges before pagination. */
  readonly totalEdges: number;
  /** Call-hierarchy edges in the requested page. */
  readonly edges: readonly TypeScriptCallHierarchyEdge[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more edges exist. */
  readonly nextOffset?: number;
}

/** TypeScript call-site syntax family. */
export const enum TypeScriptCallSiteKind {
  /** Ordinary call expression. */
  Call = "call",
  /** Constructor invocation through `new`. */
  New = "new",
}

/** Options for exact call-site projection. */
export interface CallSiteReadOptions extends ApiSurfaceOptions {
  /** Optional exact callee symbol or property name filter. */
  readonly calleeName?: string;
  /** Optional exact runtime argument source text filter. */
  readonly argumentText?: string;
  /** Optional exact runtime argument checker symbol name filter. */
  readonly argumentSymbolName?: string;
  /** Optional exact runtime argument checker fully qualified name filter. */
  readonly argumentFullyQualifiedName?: string;
  /** Optional call-site syntax family filter. */
  readonly kind?: TypeScriptCallSiteKind | string;
}

/** Expression syntax summary attached to call-site callee and argument rows. */
export interface TypeScriptExpressionFact {
  /** TypeScript SyntaxKind numeric value. */
  readonly syntaxKind: number;
  /** TypeScript SyntaxKind display name. */
  readonly syntaxKindName: string;
  /** Exact source span for this expression. */
  readonly span: SourceSpan;
  /** Source text capped for row transport. */
  readonly text: string;
  /** True when expression text was capped. */
  readonly textTruncated: boolean;
  /** Checker type display at the expression. */
  readonly type: string;
  /** Checker apparent type display at the expression. */
  readonly apparentType: string;
  /** Symbol display name when the checker exposes one. */
  readonly symbolName: string | null;
  /** Checker fully-qualified symbol name when available. */
  readonly fullyQualifiedName: string | null;
  /** Primitive literal value when the expression is statically a literal token. */
  readonly literalValue?: string | number | boolean | null;
  /** Object literal property keys when statically visible from syntax. */
  readonly objectKeys?: readonly string[];
  /** Array literal element count when statically visible from syntax. */
  readonly arrayElementCount?: number;
}

/** One argument row for an exact TypeScript call site. */
export interface TypeScriptCallSiteArgument {
  /** Zero-based argument index. */
  readonly index: number;
  /** True when this argument is syntactically spread. */
  readonly spread: boolean;
  /** Expression fact for the argument expression. */
  readonly expression: TypeScriptExpressionFact;
}

/** One exact TypeScript call or constructor invocation. */
export interface TypeScriptCallSiteEntry {
  /** Stable call-site id inside the current source basis. */
  readonly id: string;
  /** Call-site syntax family. */
  readonly kind: TypeScriptCallSiteKind;
  /** Source file containing the call site. */
  readonly file: SourceFileIdentity;
  /** Whole call-expression span. */
  readonly span: SourceSpan;
  /** Callee expression facts. */
  readonly callee: TypeScriptExpressionFact;
  /** Human-readable callee name from syntax or checker symbol. */
  readonly calleeName: string;
  /** Resolved signature display when TypeScript can resolve a signature. */
  readonly signature: string | null;
  /** Type argument count on the call expression. */
  readonly typeArgumentCount: number;
  /** Number of runtime arguments. */
  readonly argumentCount: number;
  /** Exact runtime argument rows. */
  readonly arguments: readonly TypeScriptCallSiteArgument[];
}

/** Bounded exact call-site projection over TypeScript source. */
export interface TypeScriptCallSitesRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total call-site rows before pagination. */
  readonly totalCallSites: number;
  /** Call-site rows in the requested page. */
  readonly callSites: readonly TypeScriptCallSiteEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more rows exist. */
  readonly nextOffset?: number;
}

/** One TypeScript diagnostic row. */
export interface TypeScriptDiagnosticEntry {
  /** Stable diagnostic row id inside the current source basis. */
  readonly id: string;
  /** Diagnostic category. */
  readonly category: "warning" | "error" | "suggestion" | "message";
  /** TypeScript diagnostic code. */
  readonly code: number;
  /** Diagnostic source, when provided by TypeScript. */
  readonly source?: string;
  /** Flattened diagnostic message. */
  readonly message: string;
  /** Source file when the diagnostic is file-local. */
  readonly file?: SourceFileIdentity;
  /** Exact source span when available. */
  readonly span?: SourceSpan;
}

/** Bounded TypeScript diagnostics projection for resolved files. */
export interface TypeScriptDiagnosticsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total diagnostic rows before pagination. */
  readonly totalDiagnostics: number;
  /** Diagnostic rows in the requested page. */
  readonly diagnostics: readonly TypeScriptDiagnosticEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more diagnostics exist. */
  readonly nextOffset?: number;
}

/** One rename location row returned by TypeScript. */
export interface TypeScriptRenameLocationEntry {
  /** Stable rename location id inside the current source basis. */
  readonly id: string;
  /** Source file containing this rename span. */
  readonly file: SourceFileIdentity;
  /** Exact source span to edit. */
  readonly span: SourceSpan;
  /** Text currently present at the span. */
  readonly text: string;
  /** Prefix text TypeScript requires for this rename location, when any. */
  readonly prefixText?: string;
  /** Suffix text TypeScript requires for this rename location, when any. */
  readonly suffixText?: string;
}

/** TypeScript rename-read projection for a selected symbol. */
export interface TypeScriptRenameRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** True when TypeScript says the selected target can be renamed. */
  readonly canRename: boolean;
  /** File or directory TypeScript says should be renamed through file-rename edits instead of symbol rename. */
  readonly fileToRename?: SourceFileIdentity;
  /** Display name for the rename target. */
  readonly displayName?: string;
  /** Full display name for the rename target. */
  readonly fullDisplayName?: string;
  /** TypeScript script element kind. */
  readonly kind?: string;
  /** Error when TypeScript refuses rename. */
  readonly error?: string;
  /** Total rename locations before pagination. */
  readonly totalLocations: number;
  /** Rename locations in the requested page. */
  readonly locations: readonly TypeScriptRenameLocationEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more locations exist. */
  readonly nextOffset?: number;
}

/** One TypeScript refactor action row. */
export interface TypeScriptRefactorActionRow {
  /** Refactor group name. */
  readonly refactorName: string;
  /** Refactor group description. */
  readonly refactorDescription: string;
  /** Action name. */
  readonly actionName: string;
  /** Action description. */
  readonly actionDescription: string;
  /** Dotted refactor kind, when available. */
  readonly kind?: string;
  /** Non-applicability reason, when TypeScript supplies one. */
  readonly notApplicableReason?: string;
  /** True when this refactor requires interactive arguments before edits can be requested. */
  readonly interactive: boolean;
}

/** Bounded TypeScript refactor affordance projection. */
export interface TypeScriptRefactorsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total refactor action rows before pagination. */
  readonly totalActions: number;
  /** Refactor action rows in the requested page. */
  readonly actions: readonly TypeScriptRefactorActionRow[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more actions exist. */
  readonly nextOffset?: number;
}

/** One JSDoc tag row returned by TypeScript display APIs. */
export interface TypeScriptDisplayTag {
  /** Tag name. */
  readonly name: string;
  /** Flattened tag text. */
  readonly text?: string;
}

/** Quick-info row returned by TypeScript for one selected target. */
export interface TypeScriptQuickInfoEntry {
  /** Stable quick-info id inside the current source basis. */
  readonly id: string;
  /** Source target that produced the quick-info row. */
  readonly target: SourceTargetRow;
  /** Source file containing the quick-info span. */
  readonly file: SourceFileIdentity;
  /** Exact source span covered by the quick-info row. */
  readonly span: SourceSpan;
  /** TypeScript script element kind. */
  readonly kind: string;
  /** TypeScript script element kind modifiers. */
  readonly kindModifiers: string;
  /** Flattened display text. */
  readonly display?: string;
  /** Flattened documentation text. */
  readonly documentation?: string;
  /** JSDoc tag rows. */
  readonly tags: readonly TypeScriptDisplayTag[];
  /** True when TypeScript can provide a more verbose quick-info display. */
  readonly canIncreaseVerbosityLevel: boolean;
}

/** Bounded TypeScript quick-info projection. */
export interface TypeScriptQuickInfoRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total quick-info rows before pagination. */
  readonly totalEntries: number;
  /** Quick-info rows in the requested page. */
  readonly entries: readonly TypeScriptQuickInfoEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more entries exist. */
  readonly nextOffset?: number;
}

/** One TypeScript signature-help parameter row. */
export interface TypeScriptSignatureHelpParameter {
  /** Parameter name. */
  readonly name: string;
  /** Flattened parameter display. */
  readonly display: string;
  /** Flattened parameter documentation. */
  readonly documentation?: string;
  /** True when TypeScript marks the parameter optional. */
  readonly optional: boolean;
  /** True when TypeScript marks the parameter as rest. */
  readonly rest: boolean;
}

/** One TypeScript signature-help item row. */
export interface TypeScriptSignatureHelpEntry {
  /** Stable signature-help id inside the current source basis. */
  readonly id: string;
  /** Source target that produced the signature-help row. */
  readonly target: SourceTargetRow;
  /** Zero-based item index from TypeScript. */
  readonly index: number;
  /** True when this is TypeScript's selected item. */
  readonly selected: boolean;
  /** True when TypeScript marks the signature variadic. */
  readonly variadic: boolean;
  /** Flattened signature display. */
  readonly display: string;
  /** Flattened documentation text. */
  readonly documentation?: string;
  /** JSDoc tag rows. */
  readonly tags: readonly TypeScriptDisplayTag[];
  /** Parameter rows for this signature. */
  readonly parameters: readonly TypeScriptSignatureHelpParameter[];
}

/** Bounded TypeScript signature-help projection. */
export interface TypeScriptSignatureHelpRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Applicable span for the selected invocation, when TypeScript provides one. */
  readonly applicableSpan?: SourceSpan;
  /** TypeScript selected item index. */
  readonly selectedItemIndex?: number;
  /** TypeScript active argument index. */
  readonly argumentIndex?: number;
  /** TypeScript argument count. */
  readonly argumentCount?: number;
  /** Total signature-help item rows before pagination. */
  readonly totalItems: number;
  /** Signature-help rows in the requested page. */
  readonly items: readonly TypeScriptSignatureHelpEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more items exist. */
  readonly nextOffset?: number;
}

/** One TypeScript document-highlight span. */
export interface TypeScriptHighlightEntry {
  /** Stable highlight id inside the current source basis. */
  readonly id: string;
  /** Source file containing the highlight. */
  readonly file: SourceFileIdentity;
  /** Exact highlight span. */
  readonly span: SourceSpan;
  /** Context span when TypeScript provides one. */
  readonly contextSpan?: SourceSpan;
  /** TypeScript highlight kind. */
  readonly kind: string;
  /** True when TypeScript marks the highlight as occurring inside a string literal. */
  readonly inString: boolean;
}

/** Bounded TypeScript document-highlight projection. */
export interface TypeScriptHighlightsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total highlight rows before pagination. */
  readonly totalHighlights: number;
  /** Highlight rows in the requested page. */
  readonly highlights: readonly TypeScriptHighlightEntry[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more highlights exist. */
  readonly nextOffset?: number;
}

/** One normalized TypeScript text edit. */
export interface TypeScriptTextEdit {
  /** Stable edit id inside the containing edit set. */
  readonly id: string;
  /** Raw TypeScript text span start. */
  readonly start: number;
  /** Raw TypeScript text span length. */
  readonly length: number;
  /** Source span when the file exists in the hot SourceProject. */
  readonly span?: SourceSpan;
  /** Replacement text. */
  readonly newText: string;
}

/** TypeScript file-level text changes. */
export interface TypeScriptFileEdits {
  /** File receiving edits. */
  readonly file: SourceFileIdentity;
  /** True when TypeScript says this edit creates a new file. */
  readonly newFile: boolean;
  /** Text edits in source order. */
  readonly edits: readonly TypeScriptTextEdit[];
}

/** One TypeScript code-fix action with exact edit payloads. */
export interface TypeScriptCodeFixActionRow {
  /** Stable code-fix id inside the current source basis. */
  readonly id: string;
  /** Diagnostic that produced this action. */
  readonly diagnostic: TypeScriptDiagnosticEntry;
  /** TypeScript fix name. */
  readonly fixName: string;
  /** User-facing fix description from TypeScript. */
  readonly description: string;
  /** Fix-all description when TypeScript provides one. */
  readonly fixAllDescription?: string;
  /** True when TypeScript exposes a grouped fix id for combined code fixes. */
  readonly hasFixAll: boolean;
  /** Exact file text changes TypeScript would apply for this action. */
  readonly changes: readonly TypeScriptFileEdits[];
  /** Number of side-effect commands TypeScript attached to this action. */
  readonly commandCount: number;
}

/** Bounded TypeScript code-fix projection. */
export interface TypeScriptCodeFixesRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total code-fix rows before pagination. */
  readonly totalActions: number;
  /** Code-fix action rows in the requested page. */
  readonly actions: readonly TypeScriptCodeFixActionRow[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more actions exist. */
  readonly nextOffset?: number;
}

/** Options for requesting a concrete refactor edit plan. */
export interface RefactorEditOptions extends ApiSurfaceOptions {
  /** Refactor group name returned by readRefactors. */
  readonly refactorName?: string;
  /** Refactor action name returned by readRefactors. */
  readonly actionName?: string;
  /** Target file required by interactive refactors such as move-to-file. */
  readonly targetFile?: string;
}

/** TypeScript refactor edit plan for one requested action. */
export interface TypeScriptRefactorEditsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Requested refactor group name. */
  readonly refactorName?: string;
  /** Requested refactor action name. */
  readonly actionName?: string;
  /** True when TypeScript returned an edit plan. */
  readonly applicable: boolean;
  /** Non-applicability reason, when TypeScript supplies one or the request is incomplete. */
  readonly notApplicableReason?: string;
  /** Exact file text changes TypeScript would apply for this refactor. */
  readonly changes: readonly TypeScriptFileEdits[];
  /** File in which TypeScript says a follow-up rename should occur. */
  readonly renameFile?: SourceFileIdentity;
  /** Raw offset for the follow-up rename location. */
  readonly renameLocation?: number;
  /** Number of side-effect commands TypeScript attached to this refactor. */
  readonly commandCount: number;
}

/** Bounded TypeScript organize-imports edit projection. */
export interface TypeScriptOrganizeImportsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** Total file edit groups before pagination. */
  readonly totalFiles: number;
  /** File edit groups in the requested page. */
  readonly changes: readonly TypeScriptFileEdits[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more file edit groups exist. */
  readonly nextOffset?: number;
}

/** Options for requesting a TypeScript file-rename edit plan. */
export interface FileRenameEditOptions extends ApiSurfaceOptions {
  /** Old file path. Defaults to the first selected source file when omitted. */
  readonly oldFilePath?: string;
  /** New file path for TypeScript import/reference rewrite planning. */
  readonly newFilePath?: string;
}

/** TypeScript file-rename edit plan. */
export interface TypeScriptFileRenameEditsRead {
  /** Selector resolution used for this projection. */
  readonly resolution: SourceSelectorResolution;
  /** True when Atlas had enough input to ask TypeScript for file rename edits. */
  readonly applicable: boolean;
  /** Non-applicability reason when the request is incomplete. */
  readonly notApplicableReason?: string;
  /** Old file identity. */
  readonly oldFile?: SourceFileIdentity;
  /** New file identity. */
  readonly newFile?: SourceFileIdentity;
  /** Exact file text changes TypeScript would apply for the file rename. */
  readonly changes: readonly TypeScriptFileEdits[];
}
