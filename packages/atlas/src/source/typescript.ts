import path from "node:path";

import ts from "typescript";

import type { SourceRange } from "../inquiry/locus.js";
import { repoRelativePath, resolveRepoPath, type RepoRelativePath } from "./path.js";
import {
  SourceDeclarationKind,
  type SourceFileIdentity,
  type SourceProject,
  type SourceSpan,
} from "./project.js";
import {
  canonicalSourceSymbolKey,
  resolveAlias,
} from "./semantic-surface/symbols.js";

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

interface ExportSurfaceReadContext {
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

/** Build a source selector from an Atlas source range locus. */
export function sourceSelectorForRange(
  /** Source range locus payload. */
  range: SourceRange,
): RangeSourceSelector {
  return {
    scheme: SourceSelectorScheme.Range,
    filePath: range.filePath,
    start: range.start,
    end: range.end,
  };
}

/** Resolve a source selector into current TypeScript Program targets. */
export function resolveSourceSelector(
  /** Hot source project that owns the current Program epoch. */
  project: SourceProject,
  /** Selector to resolve. */
  selector: SourceSelector,
): ResolvedSourceSelectorResolution {
  switch (selector.scheme) {
    case SourceSelectorScheme.Workspace:
      return workspaceResolution(project, selector);
    case SourceSelectorScheme.Package:
      return packageResolution(project, selector);
    case SourceSelectorScheme.Directory:
      return directoryResolution(project, selector);
    case SourceSelectorScheme.File:
      return fileResolution(project, selector);
    case SourceSelectorScheme.Range:
      return rangeResolution(project, selector);
    case SourceSelectorScheme.Position:
      return positionResolution(project, selector);
    case SourceSelectorScheme.Token:
      return tokenResolution(project, selector);
    case SourceSelectorScheme.Declaration:
      return declarationResolution(project, selector);
    case SourceSelectorScheme.Export:
      return exportResolution(project, selector);
  }
}

/** Read bounded source text slices for one selector. */
export function readSourceText(
  /** Hot source project that owns source files. */
  project: SourceProject,
  /** Selector to read. */
  selector: SourceSelector,
  /** Text budget options. */
  options: SourceTextReadOptions,
): SourceTextRead {
  const resolution = resolveSourceSelector(project, selector);
  const slices = resolution.targets
    .filter((target): target is ResolvedSourceTarget & { readonly sourceFile: ts.SourceFile } => target.sourceFile !== undefined)
    .map((target) => {
      const sourceFile = target.sourceFile;
      const text = textForTarget(sourceFile, target);
      const capped = text.slice(0, options.maxTextChars);
      return {
        target: rowForTarget(target),
        text: capped,
        totalChars: text.length,
        truncated: capped.length < text.length,
      };
    });

  return { resolution: serializableResolution(resolution), slices };
}

/** Project a bounded TypeScript declaration surface for one selector. */
export function readApiSurface(
  /** Hot source project that owns TypeScript declarations. */
  project: SourceProject,
  /** Selector that roots the surface. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptApiSurface {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = declarationEntriesForResolution(project, resolution);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    rollup: {
      fileCount: selectedSourceFiles(resolution).length,
      totalEntries: allEntries.length,
      entryKindCounts: countDeclarationKinds(allEntries),
    },
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project a bounded static module graph for one selector. */
export function readModuleGraph(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the module graph. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptModuleGraph {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const allEdges = files.flatMap((sourceFile) => moduleEdgesForFile(project, sourceFile)).sort(compareModuleEdges);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const edges = allEdges.slice(offset, offset + limit);
  const nextOffset = offset + edges.length < allEdges.length ? offset + edges.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    fileCount: files.length,
    totalEdges: allEdges.length,
    edges,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript document symbols for one selector. */
export function readDocumentSymbols(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the document-symbol projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: DocumentSymbolOptions,
): TypeScriptDocumentSymbolsRead {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const query =
    options.query ??
    (selector.scheme === SourceSelectorScheme.Workspace
      ? selector.query
      : undefined);
  const allSymbols = files
    .flatMap((sourceFile) => documentSymbolsForFile(project, sourceFile))
    .filter(
      (row) =>
        query === undefined ||
        row.name.includes(query) ||
        row.kind.includes(query) ||
        row.kindModifiers.includes(query),
    )
    .sort(compareDocumentSymbols);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const symbols = allSymbols.slice(offset, offset + limit);
  const nextOffset = offset + symbols.length < allSymbols.length ? offset + symbols.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    fileCount: files.length,
    ...(query === undefined ? {} : { query }),
    totalSymbols: allSymbols.length,
    symbols,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project a bounded declaration symbol index for one selector. */
export function readSymbolIndex(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the symbol index. */
  selector: SourceSelector,
  /** Row budget options. */
  options: SymbolIndexOptions,
): TypeScriptSymbolIndex {
  const resolution = resolveSourceSelector(project, selector);
  const query = options.query ?? (selector.scheme === SourceSelectorScheme.Workspace ? selector.query : undefined);
  const selectedFiles = new Set(selectedSourceFiles(resolution).map((sourceFile) => normalizeAbsolutePath(project, sourceFile.fileName)));
  const allRows = project.declarationRows()
    .filter((row) => selectedFiles.has(normalizeAbsolutePath(project, row.file.absolutePath)))
    .filter((row) => query === undefined || row.name?.includes(query) === true)
    .sort((left, right) =>
      left.file.repoPath.localeCompare(right.file.repoPath)
      || left.span.start - right.span.start
      || (left.name ?? "").localeCompare(right.name ?? "")
    );
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allRows
    .slice(offset, offset + limit)
    .map((row) => symbolEntryForRow(project, row, selector))
    .filter((entry): entry is TypeScriptApiSurfaceEntry => entry !== null);
  const nextOffset = offset + entries.length < allRows.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    ...(query === undefined ? {} : { query }),
    totalEntries: allRows.length,
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded checker-visible exports from package entrypoints or selected module files. */
export function readExportSurface(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the export surface. */
  selector: SourceSelector,
  /** Row budget and export name filters. */
  options: ExportSurfaceOptions,
): TypeScriptExportSurfaceRead {
  const resolution = resolveSourceSelector(project, selector);
  const surfaces = exportSurfaceFilesForResolution(project, resolution);
  const query = options.query;
  const context: ExportSurfaceReadContext = { memberPresenceBySymbol: new Map() };
  const allExports = [...uniqueExportSurfaceEntries(surfaces.flatMap((sourceFile) => exportEntriesForSurface(
    project,
    sourceFile,
    query,
    options.memberName,
    options.typeIncludes,
    options.typeSymbolName,
    options.includeMemberNames ?? true,
    context,
  )))]
    .sort(compareExportSurfaceEntries);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const exports = allExports.slice(offset, offset + limit);
  const nextOffset = offset + exports.length < allExports.length ? offset + exports.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    surfaceCount: surfaces.length,
    totalExports: allExports.length,
    ...(query === undefined ? {} : { query }),
    exports,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded checker-visible export names without materializing value types. */
export function readExportNames(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the export surface. */
  selector: SourceSelector,
  /** Row budget and export-name filters. */
  options: ExportNameSurfaceOptions,
): TypeScriptExportNameSurfaceRead {
  const startedAt = performance.now();
  const resolution = resolveSourceSelector(project, selector);
  const afterResolution = performance.now();
  const surfaces = exportSurfaceFilesForResolution(project, resolution);
  const afterSurfaces = performance.now();
  const query = options.query;
  const entries = surfaces.flatMap((sourceFile) => exportNameEntriesForSurface(
    project,
    sourceFile,
    query,
    options.resolveAliases === true,
    options.includeFullyQualifiedName === true,
  ));
  const afterEntries = performance.now();
  const allExports = [...uniqueExportNameEntries(entries)].sort(compareExportNameEntries);
  const afterSort = performance.now();
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const exports = allExports.slice(offset, offset + limit);
  const nextOffset = offset + exports.length < allExports.length ? offset + exports.length : undefined;
  const serializedResolution = serializableResolution(resolution);
  const afterSerialize = performance.now();
  if (process.env.ATLAS_PROFILE_EXPORT_NAMES === "1") {
    console.error(JSON.stringify({
      event: "atlas.source.exportNames.profile",
      resolutionMs: Math.round(afterResolution - startedAt),
      surfacesMs: Math.round(afterSurfaces - afterResolution),
      entriesMs: Math.round(afterEntries - afterSurfaces),
      sortMs: Math.round(afterSort - afterEntries),
      serializeMs: Math.round(afterSerialize - afterSort),
      totalMs: Math.round(afterSerialize - startedAt),
      surfaces: surfaces.length,
      entries: entries.length,
    }));
  }

  return {
    resolution: serializedResolution,
    surfaceCount: surfaces.length,
    totalExports: allExports.length,
    ...(query === undefined ? {} : { query }),
    exports,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeChecker facts for one selector. */
export function readTypeFacts(
  /** Hot source project that owns the current checker. */
  project: SourceProject,
  /** Selector that roots checker fact projection. */
  selector: SourceSelector,
  /** Type fact budget options. */
  options: TypeFactOptions,
): TypeScriptTypeFacts {
  const resolution = resolveSourceSelector(project, selector);
  const targets = typeTargetsForResolution(project, resolution).slice(0, Math.max(1, Math.trunc(options.limit)));
  const checker = project.checker;

  return {
    resolution: serializableResolution(resolution),
    facts: targets.map((target) => typeFactForTarget(checker, target, Math.max(1, Math.trunc(options.memberLimit)))),
  };
}

/** Project bounded TypeScript references for one selector. */
export function readReferences(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots reference projection. */
  selector: SourceSelector,
  /** Reference budget options. */
  options: ReferenceReadOptions,
): TypeScriptReferenceRead {
  const resolution = resolveSourceSelector(project, selector);
  const allReferences = [...uniqueReferences(
    typeTargetsForResolution(project, resolution).flatMap((target) => referencesForTarget(project, target)),
  )].sort(compareReferences);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const references = allReferences.slice(offset, offset + limit);
  const nextOffset = offset + references.length < allReferences.length ? offset + references.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalReferences: allReferences.length,
    references,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript definition, type-definition, and implementation rows for one selector. */
export function readNavigation(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots navigation projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptNavigationRead {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = typeTargetsForResolution(project, resolution)
    .flatMap((target) => navigationForTarget(project, target))
    .sort(compareNavigationEntries);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalEntries: allEntries.length,
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript call-hierarchy rows for one selector. */
export function readCallHierarchy(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots call-hierarchy projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptCallHierarchyRead {
  const resolution = resolveSourceSelector(project, selector);
  const prepared = typeTargetsForResolution(project, resolution).flatMap((target) => callHierarchyForTarget(project, target));
  const items = uniqueCallHierarchyItems(prepared.flatMap((entry) => entry.items));
  const allEdges = prepared.flatMap((entry) => entry.edges).sort(compareCallHierarchyEdges);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const edges = allEdges.slice(offset, offset + limit);
  const nextOffset = offset + edges.length < allEdges.length ? offset + edges.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    items,
    totalEdges: allEdges.length,
    edges,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded exact TypeScript call-site rows for one selector. */
export function readCallSites(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Selector that roots call-site projection. */
  selector: SourceSelector,
  /** Row budget and call-site filters. */
  options: CallSiteReadOptions,
): TypeScriptCallSitesRead {
  const resolution = resolveSourceSelector(project, selector);
  const kind = normalizeCallSiteKind(options.kind);
  const allCallSites = uniqueCallSites(resolution.targets.flatMap((target) => callSitesForTarget(project, target)))
    .filter((entry) => kind === null || entry.kind === kind)
    .filter((entry) => options.calleeName === undefined || entry.calleeName === options.calleeName || entry.callee.symbolName === options.calleeName)
    .filter((entry) => callSiteArgumentsMatch(entry, options))
    .sort(compareCallSites);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const callSites = allCallSites.slice(offset, offset + limit);
  const nextOffset = offset + callSites.length < allCallSites.length ? offset + callSites.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalCallSites: allCallSites.length,
    callSites,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function callSiteArgumentsMatch(
  entry: TypeScriptCallSiteEntry,
  options: CallSiteReadOptions,
): boolean {
  if (
    options.argumentText === undefined &&
    options.argumentSymbolName === undefined &&
    options.argumentFullyQualifiedName === undefined
  ) {
    return true;
  }
  return entry.arguments.some((argument) =>
    (options.argumentText === undefined ||
      argument.expression.text === options.argumentText) &&
    (options.argumentSymbolName === undefined ||
      argument.expression.symbolName === options.argumentSymbolName) &&
    (options.argumentFullyQualifiedName === undefined ||
      argument.expression.fullyQualifiedName === options.argumentFullyQualifiedName),
  );
}

/** Project bounded TypeScript syntactic, semantic, and suggestion diagnostics for selected source files. */
export function readDiagnostics(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots diagnostic projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptDiagnosticsRead {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const allDiagnostics = files
    .flatMap((sourceFile) => diagnosticsForFile(project, sourceFile))
    .sort(compareDiagnostics);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const diagnostics = allDiagnostics.slice(offset, offset + limit);
  const nextOffset = offset + diagnostics.length < allDiagnostics.length ? offset + diagnostics.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalDiagnostics: allDiagnostics.length,
    diagnostics,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript rename locations for the first selected target. */
export function readRename(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots rename projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptRenameRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target === undefined || position === null) {
    return {
      resolution: serializableResolution(resolution),
      canRename: false,
      error: "No source target with a TypeScript position was resolved.",
      totalLocations: 0,
      locations: [],
      offset,
      limit,
    };
  }

  const info = project.languageService.getRenameInfo(position.fileName, position.offset, {});
  if (!info.canRename) {
    return {
      resolution: serializableResolution(resolution),
      canRename: false,
      error: info.localizedErrorMessage,
      totalLocations: 0,
      locations: [],
      offset,
      limit,
    };
  }

  const allLocations = (project.languageService.findRenameLocations(position.fileName, position.offset, false, false, {
    providePrefixAndSuffixTextForRename: true,
  }) ?? [])
    .map((location) => renameLocationEntry(project, location))
    .filter((entry): entry is TypeScriptRenameLocationEntry => entry !== null)
    .sort(compareRenameLocations);
  const locations = allLocations.slice(offset, offset + limit);
  const nextOffset = offset + locations.length < allLocations.length ? offset + locations.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    canRename: true,
    ...(info.fileToRename === undefined ? {} : { fileToRename: fileIdentityForPath(project, info.fileToRename) }),
    displayName: info.displayName,
    fullDisplayName: info.fullDisplayName,
    kind: info.kind,
    totalLocations: allLocations.length,
    locations,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript refactor actions for the first selected target. */
export function readRefactors(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots refactor projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptRefactorsRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const positionOrRange = target === undefined ? null : refactorPositionOrRange(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target?.sourceFile === undefined || positionOrRange === null) {
    return {
      resolution: serializableResolution(resolution),
      totalActions: 0,
      actions: [],
      offset,
      limit,
    };
  }

  const allActions = project.languageService
    .getApplicableRefactors(target.sourceFile.fileName, positionOrRange, undefined, "invoked", undefined, true)
    .flatMap((refactor) => refactor.actions.map((action) => ({
      refactorName: refactor.name,
      refactorDescription: refactor.description,
      actionName: action.name,
      actionDescription: action.description,
      ...(action.kind === undefined ? {} : { kind: action.kind }),
      ...(action.notApplicableReason === undefined ? {} : { notApplicableReason: action.notApplicableReason }),
      interactive: action.isInteractive === true,
    })))
    .sort(compareRefactorActions);
  const actions = allActions.slice(offset, offset + limit);
  const nextOffset = offset + actions.length < allActions.length ? offset + actions.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalActions: allActions.length,
    actions,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript quick-info rows for one selector. */
export function readQuickInfo(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots quick-info projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptQuickInfoRead {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = typeTargetsForResolution(project, resolution)
    .map((target) => quickInfoForTarget(project, target))
    .filter((entry): entry is TypeScriptQuickInfoEntry => entry !== null)
    .sort(compareQuickInfoEntries);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalEntries: allEntries.length,
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript signature-help rows for one selector. */
export function readSignatureHelp(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots signature-help projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptSignatureHelpRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target === undefined || position === null) {
    return {
      resolution: serializableResolution(resolution),
      totalItems: 0,
      items: [],
      offset,
      limit,
    };
  }
  const help = project.languageService.getSignatureHelpItems(position.fileName, position.offset, undefined);
  if (help === undefined) {
    return {
      resolution: serializableResolution(resolution),
      totalItems: 0,
      items: [],
      offset,
      limit,
    };
  }
  const sourceFile = project.readSourceFile(position.fileName);
  const applicableSpan = sourceFile === null ? undefined : sourceSpanFromTextSpan(sourceFile, help.applicableSpan);
  const allItems = help.items.map((item, index) => signatureHelpEntry(rowForTarget(target), item, index, index === help.selectedItemIndex));
  const items = allItems.slice(offset, offset + limit);
  const nextOffset = offset + items.length < allItems.length ? offset + items.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    ...(applicableSpan === undefined ? {} : { applicableSpan }),
    selectedItemIndex: help.selectedItemIndex,
    argumentIndex: help.argumentIndex,
    argumentCount: help.argumentCount,
    totalItems: allItems.length,
    items,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript document highlights for one selector. */
export function readHighlights(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots highlight projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptHighlightsRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (position === null) {
    return {
      resolution: serializableResolution(resolution),
      totalHighlights: 0,
      highlights: [],
      offset,
      limit,
    };
  }
  const filesToSearch = selectedSourceFiles(resolution).map((sourceFile) => sourceFile.fileName);
  const allHighlights = (project.languageService.getDocumentHighlights(position.fileName, position.offset, filesToSearch) ?? [])
    .flatMap((group) => group.highlightSpans.map((span) => highlightEntry(project, group.fileName, span)))
    .filter((entry): entry is TypeScriptHighlightEntry => entry !== null)
    .sort(compareHighlights);
  const highlights = allHighlights.slice(offset, offset + limit);
  const nextOffset = offset + highlights.length < allHighlights.length ? offset + highlights.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalHighlights: allHighlights.length,
    highlights,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript code-fix actions with exact edit payloads. */
export function readCodeFixes(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots code-fix projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptCodeFixesRead {
  const resolution = resolveSourceSelector(project, selector);
  const allActions = selectedSourceFiles(resolution)
    .flatMap((sourceFile) => diagnosticsForFile(project, sourceFile))
    .flatMap((diagnostic) => codeFixesForDiagnostic(project, diagnostic))
    .sort(compareCodeFixActions);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const actions = allActions.slice(offset, offset + limit);
  const nextOffset = offset + actions.length < allActions.length ? offset + actions.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalActions: allActions.length,
    actions,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project a concrete TypeScript refactor edit plan. */
export function readRefactorEdits(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots refactor edit projection. */
  selector: SourceSelector,
  /** Refactor action and row budget options. */
  options: RefactorEditOptions,
): TypeScriptRefactorEditsRead {
  const resolution = resolveSourceSelector(project, selector);
  const refactorName = options.refactorName;
  const actionName = options.actionName;
  if (refactorName === undefined || actionName === undefined) {
    return {
      resolution: serializableResolution(resolution),
      ...(refactorName === undefined ? {} : { refactorName }),
      ...(actionName === undefined ? {} : { actionName }),
      applicable: false,
      notApplicableReason: "Refactor edit reads require refactorName and actionName from the refactors projection.",
      changes: [],
      commandCount: 0,
    };
  }
  const target = typeTargetsForResolution(project, resolution)[0];
  const positionOrRange = target === undefined ? null : refactorPositionOrRange(target);
  if (target?.sourceFile === undefined || positionOrRange === null) {
    return {
      resolution: serializableResolution(resolution),
      refactorName,
      actionName,
      applicable: false,
      notApplicableReason: "No source target with a TypeScript position was resolved.",
      changes: [],
      commandCount: 0,
    };
  }
  const editInfo = project.languageService.getEditsForRefactor(
    target.sourceFile.fileName,
    defaultFormatCodeSettings(),
    positionOrRange,
    refactorName,
    actionName,
    defaultUserPreferences(),
    options.targetFile === undefined ? undefined : { targetFile: options.targetFile },
  );
  if (editInfo === undefined) {
    return {
      resolution: serializableResolution(resolution),
      refactorName,
      actionName,
      applicable: false,
      notApplicableReason: "TypeScript did not return edits for this refactor action.",
      changes: [],
      commandCount: 0,
    };
  }
  return {
    resolution: serializableResolution(resolution),
    refactorName,
    actionName,
    applicable: editInfo.notApplicableReason === undefined,
    ...(editInfo.notApplicableReason === undefined ? {} : { notApplicableReason: editInfo.notApplicableReason }),
    changes: editInfo.edits.map((change, index) => fileEdits(project, change, `refactor:${index}`)),
    ...(editInfo.renameFilename === undefined ? {} : { renameFile: fileIdentityForPath(project, editInfo.renameFilename) }),
    ...(editInfo.renameLocation === undefined ? {} : { renameLocation: editInfo.renameLocation }),
    commandCount: editInfo.commands?.length ?? 0,
  };
}

/** Project TypeScript organize-imports edit plans for selected files. */
export function readOrganizeImports(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots organize-imports projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptOrganizeImportsRead {
  const resolution = resolveSourceSelector(project, selector);
  const allChanges = selectedSourceFiles(resolution)
    .flatMap((sourceFile) => project.languageService.organizeImports(
      { type: "file", fileName: sourceFile.fileName },
      defaultFormatCodeSettings(),
      defaultUserPreferences(),
    ))
    .map((change, index) => fileEdits(project, change, `organize-imports:${index}`))
    .filter((change) => change.edits.length > 0)
    .sort(compareFileEdits);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const changes = allChanges.slice(offset, offset + limit);
  const nextOffset = offset + changes.length < allChanges.length ? offset + changes.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalFiles: allChanges.length,
    changes,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project TypeScript edit plans for a file rename without applying them. */
export function readFileRenameEdits(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots default old-file resolution. */
  selector: SourceSelector,
  /** File rename options. */
  options: FileRenameEditOptions,
): TypeScriptFileRenameEditsRead {
  const resolution = resolveSourceSelector(project, selector);
  const selectedFile = selectedSourceFiles(resolution)[0];
  const oldFilePath = options.oldFilePath ?? selectedFile?.fileName;
  const newFilePath = options.newFilePath;
  if (oldFilePath === undefined || newFilePath === undefined) {
    return {
      resolution: serializableResolution(resolution),
      applicable: false,
      notApplicableReason: "File rename edit reads require a selected old file and a newFilePath filter.",
      changes: [],
    };
  }
  const oldAbsolutePath = languageServicePath(project, oldFilePath);
  const newAbsolutePath = languageServicePath(project, newFilePath);
  const changes = project.languageService
    .getEditsForFileRename(oldAbsolutePath, newAbsolutePath, defaultFormatCodeSettings(), defaultUserPreferences())
    .map((change, index) => fileEdits(project, change, `file-rename:${index}`))
    .filter((change) => change.edits.length > 0)
    .sort(compareFileEdits);

  return {
    resolution: serializableResolution(resolution),
    applicable: true,
    oldFile: fileIdentityForPath(project, oldAbsolutePath),
    newFile: fileIdentityForPath(project, newAbsolutePath),
    changes,
  };
}

/** Convert an internal target into a serializable row. */
export function rowForTarget(
  /** Current-epoch target to strip. */
  target: ResolvedSourceTarget,
): SourceTargetRow {
  const {
    sourceFile: _sourceFile,
    node: _node,
    symbol: _symbol,
    ...row
  } = target;
  return row;
}

function workspaceResolution(project: SourceProject, selector: WorkspaceSourceSelector): ResolvedSourceSelectorResolution {
  const targets = project.ownedSourceFiles().map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  return { selector, targets, candidateCount: targets.length, diagnostics: [] };
}

function packageResolution(project: SourceProject, selector: PackageSourceSelector): ResolvedSourceSelectorResolution {
  const targets = project.ownedSourceFiles()
    .filter((sourceFile) => packageMatches(project, sourceFile.fileName, selector.packageId, selector.packageName))
    .map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  const diagnostics = targets.length === 0
    ? [{ code: "source.package.no-match", message: "No admitted package matched the package selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function directoryResolution(project: SourceProject, selector: DirectorySourceSelector): ResolvedSourceSelectorResolution {
  const directoryPath = normalizeRepoSelectorPath(project, selector.path);
  const recursive = selector.recursive !== false;
  const targets = project.ownedSourceFiles()
    .filter((sourceFile) => {
      const identity = project.sourceFileIdentity(sourceFile);
      if (identity === null) {
        return false;
      }
      const filePath = identity.repoPath;
      if (recursive) {
        return filePath === directoryPath || filePath.startsWith(`${directoryPath}/`);
      }
      return path.posix.dirname(filePath) === directoryPath;
    })
    .map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  const diagnostics = targets.length === 0
    ? [{ code: "source.directory.no-match", message: "No admitted source files matched the directory selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function fileResolution(project: SourceProject, selector: FileSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return {
      selector,
      targets: [],
      candidateCount: 0,
      diagnostics: [{ code: "source.file.no-match", message: "No Program source file matched the file selector." }],
    };
  }
  const target = sourceFileTarget(project, sourceFile, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function rangeResolution(project: SourceProject, selector: RangeSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.range.file-no-match", "No Program source file matched the range selector.");
  }
  const start = positionToOffset(sourceFile, selector.start);
  const end = positionToOffset(sourceFile, selector.end);
  if (start === null || end === null || end < start) {
    return emptyResolution(selector, "source.range.invalid", "The source range is outside the selected file.");
  }
  const node = smallestNodeContaining(sourceFile, start, end);
  const target = sourceRangeTarget(project, sourceFile, node ?? sourceFile, start, end, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function positionResolution(project: SourceProject, selector: PositionSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.position.file-no-match", "No Program source file matched the position selector.");
  }
  const offset = positionToOffset(sourceFile, selector);
  if (offset === null) {
    return emptyResolution(selector, "source.position.invalid", "The source position is outside the selected file.");
  }
  const node = smallestNodeAt(sourceFile, offset);
  const target = sourceRangeTarget(project, sourceFile, node ?? sourceFile, node?.getStart(sourceFile) ?? offset, node?.getEnd() ?? offset, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function tokenResolution(project: SourceProject, selector: TokenSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.token.file-no-match", "No Program source file matched the token selector.");
  }
  const matches: ResolvedSourceTarget[] = [];
  visit(sourceFile, (node) => {
    if (ts.isIdentifier(node) && node.text === selector.text) {
      matches.push(sourceRangeTarget(project, sourceFile, node, node.getStart(sourceFile), node.getEnd(), selector));
    }
  });
  const targets = applyOccurrence(matches, selector.occurrence);
  const diagnostics = targets.length === 0
    ? [{ code: "source.token.no-match", message: "No exact identifier token matched the selector." }]
    : [];
  return { selector, targets, candidateCount: matches.length, diagnostics };
}

function declarationResolution(project: SourceProject, selector: DeclarationSourceSelector): ResolvedSourceSelectorResolution {
  const normalizedKind = normalizeDeclarationKind(selector.kind);
  const fileKey = selector.filePath === undefined ? null : normalizeAbsolutePath(project, selector.filePath);
  const candidates = project.declarationRows()
    .filter((row) => row.name === selector.name)
    .filter((row) => normalizedKind === null || row.kind === normalizedKind)
    .filter((row) => selector.packageId === undefined || row.file.packageId === selector.packageId)
    .filter((row) => selector.packageName === undefined || packageNameForFile(project, row.file.absolutePath) === selector.packageName)
    .filter((row) => fileKey === null || normalizeAbsolutePath(project, row.file.absolutePath) === fileKey)
    .map((row) => declarationTargetForRow(project, row, selector))
    .filter((target): target is ResolvedSourceTarget => target !== null)
    .sort(compareTargets);
  const targets = applyOccurrence(candidates, selector.occurrence);
  const diagnostics = targets.length === 0
    ? [{ code: "source.declaration.no-match", message: "No exact declaration matched the selector." }]
    : [];
  return { selector, targets, candidateCount: candidates.length, diagnostics };
}

function exportResolution(project: SourceProject, selector: ExportSourceSelector): ResolvedSourceSelectorResolution {
  const surfaces = exportSurfaceFiles(project, selector);
  const candidates: ResolvedSourceTarget[] = [];
  const checker = project.checker;
  for (const sourceFile of surfaces) {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    const exports = moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol);
    const symbol = exports.find((entry) => entry.getName() === selector.exportName);
    if (symbol === undefined) {
      continue;
    }
    const declarations = symbol.getDeclarations() ?? [];
    for (const declaration of declarations) {
      candidates.push(declarationTarget(project, sourceFileForNode(project, declaration) ?? sourceFile, declaration, selector, true, symbol));
    }
  }
  const targets = candidates.sort(compareTargets);
  const diagnostics = targets.length === 0
    ? [{ code: "source.export.no-match", message: "No exact exported declaration matched the selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function moduleEdgesForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptModuleEdge[] {
  const edges: TypeScriptModuleEdge[] = [];
  const sourceIdentity = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  visit(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.Import,
        sourceFile: sourceIdentity,
        specifier: node.moduleSpecifier.text,
        ...resolvedModuleField(project, sourceFile, node.moduleSpecifier.text),
        importedNames: importNames(node.importClause),
        exportedNames: [],
        typeOnly: hasTrueIsTypeOnly(node.importClause),
        span: sourceSpan(sourceFile, node),
      });
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)) {
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.Export,
        sourceFile: sourceIdentity,
        specifier: node.moduleSpecifier.text,
        ...resolvedModuleField(project, sourceFile, node.moduleSpecifier.text),
        importedNames: [],
        exportedNames: exportNames(node.exportClause),
        typeOnly: node.isTypeOnly,
        span: sourceSpan(sourceFile, node),
      });
      return;
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      const specifier = node.arguments[0]!.text;
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.DynamicImport,
        sourceFile: sourceIdentity,
        specifier,
        ...resolvedModuleField(project, sourceFile, specifier),
        importedNames: [],
        exportedNames: [],
        typeOnly: false,
        span: sourceSpan(sourceFile, node),
      });
    }
  });
  return edges;
}

function documentSymbolsForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptDocumentSymbolEntry[] {
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const tree = project.languageService.getNavigationTree(sourceFile.fileName);
  const symbols: TypeScriptDocumentSymbolEntry[] = [];
  const visitTree = (node: ts.NavigationTree, depth: number): void => {
    if (depth > 0) {
      const span = node.spans[0] ?? { start: 0, length: sourceFile.getFullText().length };
      symbols.push({
        id: `document-symbol:${file.repoPath}:${span.start}:${node.text}:${depth}`,
        file,
        name: node.text,
        kind: node.kind,
        kindModifiers: node.kindModifiers,
        span: sourceSpanFromTextSpan(sourceFile, span),
        ...(node.nameSpan === undefined ? {} : { nameSpan: sourceSpanFromTextSpan(sourceFile, node.nameSpan) }),
        depth: depth - 1,
        childCount: node.childItems?.length ?? 0,
      });
    }
    for (const child of node.childItems ?? []) {
      visitTree(child, depth + 1);
    }
  };
  visitTree(tree, 0);
  return symbols;
}

function declarationEntriesForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly TypeScriptApiSurfaceEntry[] {
  const checker = project.checker;
  const selector = resolution.selector;
  const exportSelector = selector.scheme === SourceSelectorScheme.Export;
  const files = selectedSourceFiles(resolution);
  const entries: TypeScriptApiSurfaceEntry[] = [];

  for (const file of files) {
    visit(file, (node) => {
      const kind = declarationKind(node);
      if (kind === null) {
        return;
      }
      const nameNode = declarationNameNode(node);
      const name = nameNode?.getText(file) ?? null;
      if (selector.scheme === SourceSelectorScheme.Workspace && selector.query !== undefined && name !== selector.query) {
        return;
      }
      entries.push(apiEntryForDeclaration(project, checker, file, node, kind, exportSelector));
    });
  }

  if (
    resolution.targets.some((target) => target.kind === SourceTargetKind.Declaration || target.kind === SourceTargetKind.Symbol)
  ) {
    return resolution.targets
      .filter((target): target is ResolvedSourceTarget & { readonly node: ts.Node; readonly sourceFile: ts.SourceFile } =>
        target.node !== undefined && target.sourceFile !== undefined
      )
      .map((target) => {
        const sourceFile = target.sourceFile;
        const node = target.node;
        const kind = declarationKind(node) ?? target.declarationKind ?? SourceDeclarationKind.Variable;
        return apiEntryForDeclaration(project, checker, sourceFile, node, kind, exportSelector);
      })
      .sort(compareEntries);
  }

  return entries.sort(compareEntries);
}

function typeTargetsForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly ResolvedSourceTarget[] {
  const directTargets = resolution.targets.filter((target) => target.node !== undefined);
  if (directTargets.length > 0) {
    return directTargets;
  }
  const entries = declarationEntriesForResolution(project, resolution);
  return entries
    .map((entry) => targetForEntry(project, entry, resolution.selector))
    .filter((target): target is ResolvedSourceTarget => target !== null);
}

function typeFactForTarget(checker: ts.TypeChecker, target: ResolvedSourceTarget, memberLimit: number): TypeScriptTypeFact {
  const node = target.node ?? target.sourceFile;
  if (node === undefined) {
    return {
      target: rowForTarget(target),
      symbolName: null,
      fullyQualifiedName: null,
      type: "unknown",
      apparentType: "unknown",
      typeFlags: 0,
      symbolFlags: null,
      callSignatureCount: 0,
      constructSignatureCount: 0,
      members: [],
      membersTruncated: false,
    };
  }
  const symbol = target.symbol ?? symbolForNode(checker, node) ?? null;
  const type = checker.getTypeAtLocation(typeLocationNode(node));
  const apparentType = checker.getApparentType(type);
  const properties = apparentType.getProperties().sort((left, right) => left.getName().localeCompare(right.getName()));
  const members = properties.slice(0, memberLimit).map((property) => memberFact(checker, property, node));
  return {
    target: rowForTarget(target),
    symbolName: symbol?.getName() ?? null,
    fullyQualifiedName: symbol === null ? null : checker.getFullyQualifiedName(symbol),
    type: checker.typeToString(type, node),
    apparentType: checker.typeToString(apparentType, node),
    typeFlags: type.flags,
    symbolFlags: symbol?.flags ?? null,
    callSignatureCount: type.getCallSignatures().length,
    constructSignatureCount: type.getConstructSignatures().length,
    members,
    membersTruncated: members.length < properties.length,
  };
}

function memberFact(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): TypeScriptMemberFact {
  const declarations = symbol.getDeclarations() ?? [];
  const declaration = declarations[0];
  const valueType = checker.getTypeOfSymbolAtLocation(symbol, declaration ?? location);
  return {
    name: symbol.getName(),
    type: valueType === undefined ? null : checker.typeToString(valueType, location),
    optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
    ...(declaration === undefined ? {} : { span: sourceSpan(declaration.getSourceFile(), declaration) }),
  };
}

function referencesForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptReferenceEntry[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const referencedSymbols = project.languageService.findReferences(position.fileName, position.offset) ?? [];
  return referencedSymbols.flatMap((referencedSymbol) => {
    const definitionKey = referenceKey(referencedSymbol.definition?.fileName, referencedSymbol.definition?.textSpan);
    return referencedSymbol.references
      .map((reference) => referenceEntry(project, reference, definitionKey))
      .filter((entry): entry is TypeScriptReferenceEntry => entry !== null);
  });
}

function referencePositionForTarget(target: ResolvedSourceTarget): { readonly fileName: string; readonly offset: number } | null {
  const sourceFile = target.sourceFile;
  if (sourceFile === undefined) {
    return null;
  }
  if (target.node !== undefined) {
    const node = declarationNameNode(target.node) ?? target.node;
    return { fileName: sourceFile.fileName, offset: node.getStart(sourceFile) };
  }
  if (target.span !== undefined) {
    return { fileName: sourceFile.fileName, offset: target.span.start };
  }
  return null;
}

function referenceEntry(project: SourceProject, reference: ts.ReferenceEntry, definitionKey: string | null): TypeScriptReferenceEntry | null {
  const sourceFile = project.readSourceFile(reference.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const start = reference.textSpan.start;
  const end = reference.textSpan.start + reference.textSpan.length;
  const key = referenceKey(reference.fileName, reference.textSpan);
  const definition = definitionKey !== null && key === definitionKey;
  const node = nodeAtTextSpan(sourceFile, reference.textSpan);
  return {
    id: `reference:${file.repoPath}:${start}:${end}`,
    file,
    span: sourceSpanFromOffsets(sourceFile, start, end),
    text: sourceFile.getFullText().slice(start, end),
    definition,
    writeAccess: reference.isWriteAccess === true,
    inString: reference.isInString === true,
    roles: referenceRoles(reference, definition, node),
    ...(node === null ? {} : { syntaxKindName: ts.SyntaxKind[node.kind] }),
  };
}

function referenceKey(fileName: string | undefined, textSpan: ts.TextSpan | undefined): string | null {
  return fileName === undefined || textSpan === undefined
    ? null
    : `${path.resolve(fileName)}:${textSpan.start}:${textSpan.length}`;
}

function uniqueReferences(references: readonly TypeScriptReferenceEntry[]): readonly TypeScriptReferenceEntry[] {
  const byId = new Map<string, TypeScriptReferenceEntry>();
  for (const reference of references) {
    byId.set(reference.id, reference);
  }
  return [...byId.values()];
}

function referenceRoles(reference: ts.ReferenceEntry, definition: boolean, node: ts.Node | null): readonly TypeScriptReferenceRole[] {
  const roles = new Set<TypeScriptReferenceRole>();
  if (definition) {
    roles.add(TypeScriptReferenceRole.Definition);
  }
  roles.add(reference.isWriteAccess === true ? TypeScriptReferenceRole.Write : TypeScriptReferenceRole.Read);
  if (reference.isInString === true) {
    roles.add(TypeScriptReferenceRole.StringLiteral);
  }
  if (node === null) {
    return [...roles].sort();
  }
  for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
    if (isImportSyntax(current)) {
      roles.add(TypeScriptReferenceRole.Import);
    }
    if (isExportSyntax(current)) {
      roles.add(TypeScriptReferenceRole.Export);
    }
    if (hasTrueIsTypeOnly(current)) {
      roles.add(TypeScriptReferenceRole.TypeOnly);
    }
    if (ts.isTypeNode(current)) {
      roles.add(TypeScriptReferenceRole.TypePosition);
    }
    if (ts.isCallExpression(current) && nodeWithin(node, current.expression)) {
      roles.add(TypeScriptReferenceRole.Call);
    }
    if (ts.isNewExpression(current) && nodeWithin(node, current.expression)) {
      roles.add(TypeScriptReferenceRole.Construct);
    }
    if (ts.isPropertyAccessExpression(current) && nodeWithin(node, current)) {
      roles.add(TypeScriptReferenceRole.PropertyAccess);
    }
    if (ts.isElementAccessExpression(current) && nodeWithin(node, current)) {
      roles.add(TypeScriptReferenceRole.ElementAccess);
    }
    if (isObjectLiteralKeyNode(current, node)) {
      roles.add(TypeScriptReferenceRole.ObjectLiteralKey);
    }
    if (ts.isHeritageClause(current)) {
      roles.add(TypeScriptReferenceRole.Heritage);
    }
    if (ts.isDecorator(current)) {
      roles.add(TypeScriptReferenceRole.Decorator);
    }
  }
  return [...roles].sort();
}

function navigationForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptNavigationEntry[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const origin = rowForTarget(target);
  const definition = project.languageService.getDefinitionAndBoundSpan(position.fileName, position.offset)?.definitions ?? [];
  const typeDefinitions = project.languageService.getTypeDefinitionAtPosition(position.fileName, position.offset) ?? [];
  const implementations = project.languageService.getImplementationAtPosition(position.fileName, position.offset) ?? [];
  return [
    ...definition.map((entry) => navigationEntry(project, TypeScriptNavigationKind.Definition, origin, entry)),
    ...typeDefinitions.map((entry) => navigationEntry(project, TypeScriptNavigationKind.TypeDefinition, origin, entry)),
    ...implementations.map((entry) => navigationEntry(project, TypeScriptNavigationKind.Implementation, origin, entry)),
  ].filter((entry): entry is TypeScriptNavigationEntry => entry !== null);
}

function navigationEntry(
  project: SourceProject,
  kind: TypeScriptNavigationKind,
  origin: SourceTargetRow,
  entry: ts.DefinitionInfo | ts.ImplementationLocation,
): TypeScriptNavigationEntry | null {
  const sourceFile = project.readSourceFile(entry.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const start = entry.textSpan.start;
  const end = entry.textSpan.start + entry.textSpan.length;
  const name = "name" in entry ? entry.name : undefined;
  const containerName = "containerName" in entry ? entry.containerName : undefined;
  const display = "displayParts" in entry ? displayPartsText(entry.displayParts) : undefined;
  return {
    id: `navigation:${kind}:${file.repoPath}:${start}:${end}:${name ?? display ?? ""}`,
    kind,
    origin,
    file,
    span: sourceSpanFromTextSpan(sourceFile, entry.textSpan),
    ...(entry.contextSpan === undefined ? {} : { contextSpan: sourceSpanFromTextSpan(sourceFile, entry.contextSpan) }),
    scriptElementKindName: entry.kind,
    ...(name === undefined ? {} : { name }),
    ...(containerName === undefined ? {} : { containerName }),
    ...(display === undefined ? {} : { display }),
  };
}

function callHierarchyForTarget(
  project: SourceProject,
  target: ResolvedSourceTarget,
): readonly { readonly items: readonly TypeScriptCallHierarchyItemRow[]; readonly edges: readonly TypeScriptCallHierarchyEdge[] }[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const prepared = project.languageService.prepareCallHierarchy(position.fileName, position.offset);
  const preparedItems = prepared === undefined ? [] : Array.isArray(prepared) ? prepared : [prepared];
  const selectedItems = preparedItems
    .map((item) => callHierarchyItemRow(project, item))
    .filter((item): item is TypeScriptCallHierarchyItemRow => item !== null);
  const selected = selectedItems[0];
  if (selected === undefined) {
    return [{ items: [], edges: [] }];
  }
  const incomingEdges = project.languageService.provideCallHierarchyIncomingCalls(position.fileName, position.offset)
    .map((call) => {
      const from = callHierarchyItemRow(project, call.from);
      if (from === null) {
        return null;
      }
      return {
        id: `call:${TypeScriptCallHierarchyDirection.Incoming}:${from.id}:${selected.id}:${call.fromSpans.map((span) => `${span.start}:${span.length}`).join(",")}`,
        relation: TypeScriptCallHierarchyRelation.Calls,
        direction: TypeScriptCallHierarchyDirection.Incoming,
        from,
        to: selected,
        fromSpans: call.fromSpans.map((span) => sourceSpanFromTextSpanForFileName(project, call.from.file, span)).filter((span): span is SourceSpan => span !== null),
      };
    })
    .filter((edge) => edge !== null) as TypeScriptCallHierarchyEdge[];
  const outgoingEdges = project.languageService.provideCallHierarchyOutgoingCalls(position.fileName, position.offset)
    .map((call) => {
      const to = callHierarchyItemRow(project, call.to);
      if (to === null) {
        return null;
      }
      return {
        id: `call:${TypeScriptCallHierarchyDirection.Outgoing}:${selected.id}:${to.id}:${call.fromSpans.map((span) => `${span.start}:${span.length}`).join(",")}`,
        relation: TypeScriptCallHierarchyRelation.Calls,
        direction: TypeScriptCallHierarchyDirection.Outgoing,
        from: selected,
        to,
        fromSpans: call.fromSpans.map((span) => sourceSpanFromTextSpanForFileName(project, selected.file.absolutePath, span)).filter((span): span is SourceSpan => span !== null),
      };
    })
    .filter((edge) => edge !== null) as TypeScriptCallHierarchyEdge[];
  return [{ items: selectedItems, edges: [...incomingEdges, ...outgoingEdges] }];
}

function callHierarchyItemRow(project: SourceProject, item: ts.CallHierarchyItem): TypeScriptCallHierarchyItemRow | null {
  const sourceFile = project.readSourceFile(item.file);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  return {
    id: `call-item:${file.repoPath}:${item.selectionSpan.start}:${item.selectionSpan.length}:${item.name}`,
    name: item.name,
    kind: item.kind,
    ...(item.containerName === undefined ? {} : { containerName: item.containerName }),
    file,
    span: sourceSpanFromTextSpan(sourceFile, item.span),
    selectionSpan: sourceSpanFromTextSpan(sourceFile, item.selectionSpan),
  };
}

function uniqueCallHierarchyItems(items: readonly TypeScriptCallHierarchyItemRow[]): readonly TypeScriptCallHierarchyItemRow[] {
  const byId = new Map<string, TypeScriptCallHierarchyItemRow>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return [...byId.values()].sort(compareCallHierarchyItems);
}

type TypeScriptCallLikeExpression = ts.CallExpression | ts.NewExpression;

function callSitesForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptCallSiteEntry[] {
  const sourceFile = target.sourceFile;
  if (sourceFile === undefined) {
    return [];
  }
  if (target.span !== undefined) {
    const callLike = findEnclosingCallLike(sourceFile, target.node, target.span.start, target.span.end);
    if (callLike !== null) {
      const entry = callSiteEntry(project, sourceFile, callLike);
      return entry === null ? [] : [entry];
    }
  }
  const root = target.node ?? sourceFile;
  const entries: TypeScriptCallSiteEntry[] = [];
  visit(root, (node) => {
    if (!isCallLikeExpression(node)) {
      return;
    }
    const entry = callSiteEntry(project, sourceFile, node);
    if (entry !== null) {
      entries.push(entry);
    }
  });
  return entries;
}

function findEnclosingCallLike(
  sourceFile: ts.SourceFile,
  node: ts.Node | undefined,
  start: number,
  end: number,
): TypeScriptCallLikeExpression | null {
  let current = node;
  while (current !== undefined) {
    if (isCallLikeExpression(current) && nodeRangeContains(current, sourceFile, start, end)) {
      return current;
    }
    current = current.parent;
  }
  let smallest: TypeScriptCallLikeExpression | null = null;
  visit(sourceFile, (candidate) => {
    if (!isCallLikeExpression(candidate) || !nodeRangeContains(candidate, sourceFile, start, end)) {
      return;
    }
    if (smallest === null || candidate.getWidth(sourceFile) < smallest.getWidth(sourceFile)) {
      smallest = candidate;
    }
  });
  return smallest;
}

function nodeRangeContains(node: ts.Node, sourceFile: ts.SourceFile, start: number, end: number): boolean {
  return node.getStart(sourceFile) <= start && node.getEnd() >= end;
}

function isCallLikeExpression(node: ts.Node): node is TypeScriptCallLikeExpression {
  return ts.isCallExpression(node) || ts.isNewExpression(node);
}

function callSiteEntry(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: TypeScriptCallLikeExpression,
): TypeScriptCallSiteEntry | null {
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const kind = ts.isNewExpression(node) ? TypeScriptCallSiteKind.New : TypeScriptCallSiteKind.Call;
  const span = sourceSpan(sourceFile, node);
  const callee = expressionFact(project, sourceFile, node.expression);
  const signature = project.checker.getResolvedSignature(node);
  const args = [...node.arguments ?? []];
  return {
    id: `call-site:${kind}:${file.repoPath}:${span.start}:${span.end}`,
    kind,
    file,
    span,
    callee,
    calleeName: calleeName(node.expression, callee),
    signature: signature === undefined ? null : project.checker.signatureToString(signature, node),
    typeArgumentCount: node.typeArguments?.length ?? 0,
    argumentCount: args.length,
    arguments: args.map((argument, index) => callSiteArgument(project, sourceFile, argument, index)),
  };
}

/** Project one checker-backed expression fact for evaluator and framework lenses. */
export function readTypeScriptExpressionFact(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Source file containing the expression. */
  sourceFile: ts.SourceFile,
  /** Expression to project. */
  expression: ts.Expression,
): TypeScriptExpressionFact {
  return expressionFact(project, sourceFile, expression);
}

/** Project one checker-backed call-site row for evaluator and framework lenses. */
export function readTypeScriptCallSiteEntry(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Source file containing the call-like expression. */
  sourceFile: ts.SourceFile,
  /** Call or constructor invocation to project. */
  node: ts.CallExpression | ts.NewExpression,
): TypeScriptCallSiteEntry | null {
  return callSiteEntry(project, sourceFile, node);
}

function callSiteArgument(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  argument: ts.Expression,
  index: number,
): TypeScriptCallSiteArgument {
  const spread = ts.isSpreadElement(argument);
  return {
    index,
    spread,
    expression: expressionFact(project, sourceFile, spread ? argument.expression : argument),
  };
}

function expressionFact(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): TypeScriptExpressionFact {
  const checker = project.checker;
  const type = checker.getTypeAtLocation(expression);
  const apparentType = checker.getApparentType(type);
  const symbol = symbolForExpression(checker, expression);
  const text = expression.getText(sourceFile);
  const cappedText = text.slice(0, 500);
  return {
    syntaxKind: expression.kind,
    syntaxKindName: ts.SyntaxKind[expression.kind] ?? String(expression.kind),
    span: sourceSpan(sourceFile, expression),
    text: cappedText,
    textTruncated: cappedText.length < text.length,
    type: checker.typeToString(type, expression),
    apparentType: checker.typeToString(apparentType, expression),
    symbolName: symbol?.getName() ?? null,
    fullyQualifiedName: symbol === null
      ? null
      : canonicalSourceSymbolKey(checker.getFullyQualifiedName(symbol)),
    ...literalValueField(expression),
    ...objectKeysField(expression),
    ...arrayElementCountField(expression),
  };
}

function symbolForExpression(checker: ts.TypeChecker, expression: ts.Expression): ts.Symbol | null {
  let symbol: ts.Symbol | undefined;
  if (ts.isPropertyAccessExpression(expression)) {
    symbol = checker.getSymbolAtLocation(expression.name) ?? checker.getSymbolAtLocation(expression);
  } else if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    symbol = checker.getSymbolAtLocation(expression.argumentExpression) ?? checker.getSymbolAtLocation(expression);
  } else {
    symbol = checker.getSymbolAtLocation(expression);
  }
  return symbol === undefined ? null : resolveAlias(checker, symbol);
}

function calleeName(expression: ts.Expression, fact: TypeScriptExpressionFact): string {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isElementAccessExpression(expression)) {
    return expression.argumentExpression?.getText(expression.getSourceFile()) ?? fact.symbolName ?? fact.text;
  }
  return fact.symbolName ?? fact.text;
}

function literalValueField(expression: ts.Expression): { readonly literalValue?: string | number | boolean | null } {
  if (ts.isStringLiteralLike(expression)) {
    return { literalValue: expression.text };
  }
  if (ts.isNumericLiteral(expression)) {
    return { literalValue: Number(expression.text) };
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return { literalValue: true };
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return { literalValue: false };
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return { literalValue: null };
  }
  if (
    ts.isPrefixUnaryExpression(expression)
    && expression.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(expression.operand)
  ) {
    return { literalValue: -Number(expression.operand.text) };
  }
  return {};
}

function objectKeysField(expression: ts.Expression): { readonly objectKeys?: readonly string[] } {
  if (!ts.isObjectLiteralExpression(expression)) {
    return {};
  }
  const keys = expression.properties
    .map((property) => propertyNameForObjectLiteralElement(property))
    .filter((key): key is string => key !== null);
  return { objectKeys: keys };
}

function propertyNameForObjectLiteralElement(property: ts.ObjectLiteralElementLike): string | null {
  if (ts.isSpreadAssignment(property)) {
    return null;
  }
  if (property.name === undefined) {
    return null;
  }
  return propertyNameText(property.name);
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) {
    const expression = name.expression;
    return ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression) ? expression.text : null;
  }
  return null;
}

function arrayElementCountField(expression: ts.Expression): { readonly arrayElementCount?: number } {
  return ts.isArrayLiteralExpression(expression) ? { arrayElementCount: expression.elements.length } : {};
}

function uniqueCallSites(callSites: readonly TypeScriptCallSiteEntry[]): readonly TypeScriptCallSiteEntry[] {
  const byId = new Map<string, TypeScriptCallSiteEntry>();
  for (const callSite of callSites) {
    byId.set(callSite.id, callSite);
  }
  return [...byId.values()];
}

function diagnosticsForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptDiagnosticEntry[] {
  return [
    ...project.languageService.getSyntacticDiagnostics(sourceFile.fileName),
    ...project.languageService.getSemanticDiagnostics(sourceFile.fileName),
    ...project.languageService.getSuggestionDiagnostics(sourceFile.fileName),
  ]
    .map((diagnostic) => diagnosticEntry(project, diagnostic))
    .sort(compareDiagnostics);
}

function diagnosticEntry(project: SourceProject, diagnostic: ts.Diagnostic): TypeScriptDiagnosticEntry {
  const sourceFile = diagnostic.file;
  const file = sourceFile === undefined ? undefined : project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const span = sourceFile === undefined || diagnostic.start === undefined || diagnostic.length === undefined
    ? undefined
    : sourceSpanFromOffsets(sourceFile, diagnostic.start, diagnostic.start + diagnostic.length);
  return {
    id: `diagnostic:${file?.repoPath ?? "<global>"}:${diagnostic.start ?? 0}:${diagnostic.code}:${diagnostic.category}`,
    category: diagnosticCategory(diagnostic.category),
    code: diagnostic.code,
    ...(diagnostic.source === undefined ? {} : { source: diagnostic.source }),
    message: diagnosticMessageText(diagnostic.messageText),
    ...(file === undefined ? {} : { file }),
    ...(span === undefined ? {} : { span }),
  };
}

function renameLocationEntry(project: SourceProject, location: ts.RenameLocation): TypeScriptRenameLocationEntry | null {
  const sourceFile = project.readSourceFile(location.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const start = location.textSpan.start;
  const end = location.textSpan.start + location.textSpan.length;
  return {
    id: `rename:${file.repoPath}:${start}:${end}`,
    file,
    span: sourceSpanFromOffsets(sourceFile, start, end),
    text: sourceFile.getFullText().slice(start, end),
    ...(location.prefixText === undefined ? {} : { prefixText: location.prefixText }),
    ...(location.suffixText === undefined ? {} : { suffixText: location.suffixText }),
  };
}

function refactorPositionOrRange(target: ResolvedSourceTarget): number | ts.TextRange | null {
  if (target.sourceFile === undefined) {
    return null;
  }
  if (target.span !== undefined) {
    return { pos: target.span.start, end: target.span.end };
  }
  const position = referencePositionForTarget(target);
  return position?.offset ?? null;
}

function quickInfoForTarget(project: SourceProject, target: ResolvedSourceTarget): TypeScriptQuickInfoEntry | null {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return null;
  }
  const quickInfo = project.languageService.getQuickInfoAtPosition(position.fileName, position.offset);
  if (quickInfo === undefined) {
    return null;
  }
  const sourceFile = project.readSourceFile(position.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const span = sourceSpanFromTextSpan(sourceFile, quickInfo.textSpan);
  return {
    id: `quick-info:${file.repoPath}:${quickInfo.textSpan.start}:${quickInfo.textSpan.length}`,
    target: rowForTarget(target),
    file,
    span,
    kind: quickInfo.kind,
    kindModifiers: quickInfo.kindModifiers,
    ...(displayPartsText(quickInfo.displayParts) === undefined ? {} : { display: displayPartsText(quickInfo.displayParts) }),
    ...(displayPartsText(quickInfo.documentation) === undefined ? {} : { documentation: displayPartsText(quickInfo.documentation) }),
    tags: displayTags(quickInfo.tags),
    canIncreaseVerbosityLevel: quickInfo.canIncreaseVerbosityLevel === true,
  };
}

function signatureHelpEntry(
  target: SourceTargetRow,
  item: ts.SignatureHelpItem,
  index: number,
  selected: boolean,
): TypeScriptSignatureHelpEntry {
  const parameters = item.parameters.map((parameter) => ({
    name: parameter.name,
    display: displayPartsText(parameter.displayParts) ?? parameter.name,
    ...(displayPartsText(parameter.documentation) === undefined ? {} : { documentation: displayPartsText(parameter.documentation) }),
    optional: parameter.isOptional,
    rest: parameter.isRest === true,
  }));
  const display = [
    displayPartsText(item.prefixDisplayParts) ?? "",
    parameters.map((parameter) => parameter.display).join(displayPartsText(item.separatorDisplayParts) ?? ", "),
    displayPartsText(item.suffixDisplayParts) ?? "",
  ].join("");
  return {
    id: `signature-help:${target.id}:${index}`,
    target,
    index,
    selected,
    variadic: item.isVariadic,
    display,
    ...(displayPartsText(item.documentation) === undefined ? {} : { documentation: displayPartsText(item.documentation) }),
    tags: displayTags(item.tags),
    parameters,
  };
}

function highlightEntry(project: SourceProject, fileName: string, highlight: ts.HighlightSpan): TypeScriptHighlightEntry | null {
  const sourceFile = project.readSourceFile(fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  return {
    id: `highlight:${file.repoPath}:${highlight.textSpan.start}:${highlight.textSpan.length}:${highlight.kind}`,
    file,
    span: sourceSpanFromTextSpan(sourceFile, highlight.textSpan),
    ...(highlight.contextSpan === undefined ? {} : { contextSpan: sourceSpanFromTextSpan(sourceFile, highlight.contextSpan) }),
    kind: highlight.kind,
    inString: highlight.isInString === true,
  };
}

function codeFixesForDiagnostic(project: SourceProject, diagnostic: TypeScriptDiagnosticEntry): readonly TypeScriptCodeFixActionRow[] {
  if (diagnostic.file === undefined || diagnostic.span === undefined) {
    return [];
  }
  return project.languageService.getCodeFixesAtPosition(
    diagnostic.file.absolutePath,
    diagnostic.span.start,
    diagnostic.span.end,
    [diagnostic.code],
    defaultFormatCodeSettings(),
    defaultUserPreferences(),
  ).map((action, index) => ({
    id: `code-fix:${diagnostic.id}:${action.fixName}:${index}`,
    diagnostic,
    fixName: action.fixName,
    description: action.description,
    ...(action.fixAllDescription === undefined ? {} : { fixAllDescription: action.fixAllDescription }),
    hasFixAll: action.fixId !== undefined,
    changes: action.changes.map((change, changeIndex) => fileEdits(project, change, `code-fix:${diagnostic.id}:${index}:${changeIndex}`)),
    commandCount: action.commands?.length ?? 0,
  }));
}

function fileEdits(project: SourceProject, changes: ts.FileTextChanges, idPrefix: string): TypeScriptFileEdits {
  const file = fileIdentityForPath(project, changes.fileName);
  const sourceFile = project.readSourceFile(changes.fileName);
  return {
    file,
    newFile: changes.isNewFile === true,
    edits: changes.textChanges
      .map((change, index) => ({
        id: `${idPrefix}:${file.repoPath}:${change.span.start}:${change.span.length}:${index}`,
        start: change.span.start,
        length: change.span.length,
        ...(sourceFile === null ? {} : { span: sourceSpanFromTextSpan(sourceFile, change.span) }),
        newText: change.newText,
      }))
      .sort((left, right) => left.start - right.start || left.length - right.length),
  };
}

function fileIdentityForPath(project: SourceProject, fileName: string): SourceFileIdentity {
  const sourceFile = project.readSourceFile(fileName);
  return sourceFile === null
    ? externalFileIdentity(project, fileName)
    : project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
}

function languageServicePath(project: SourceProject, fileName: string): string {
  return project.readSourceFile(fileName)?.fileName ?? normalizeAbsolutePath(project, fileName).replace(/\\/gu, "/");
}

function defaultFormatCodeSettings(): ts.FormatCodeSettings {
  return {
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    newLineCharacter: "\n",
  };
}

function defaultUserPreferences(): ts.UserPreferences {
  return {
    importModuleSpecifierEnding: "js",
    includePackageJsonAutoImports: "off",
  };
}

function sourceSpanFromTextSpanForFileName(project: SourceProject, fileName: string, textSpan: ts.TextSpan): SourceSpan | null {
  const sourceFile = project.readSourceFile(fileName);
  return sourceFile === null ? null : sourceSpanFromTextSpan(sourceFile, textSpan);
}

function sourceSpanFromTextSpan(sourceFile: ts.SourceFile, textSpan: ts.TextSpan): SourceSpan {
  return sourceSpanFromOffsets(sourceFile, textSpan.start, textSpan.start + textSpan.length);
}

function displayPartsText(parts: readonly ts.SymbolDisplayPart[] | undefined): string | undefined {
  if (parts === undefined || parts.length === 0) {
    return undefined;
  }
  return parts.map((part) => part.text).join("");
}

function displayTags(tags: readonly ts.JSDocTagInfo[] | undefined): readonly TypeScriptDisplayTag[] {
  return (tags ?? []).map((tag) => ({
    name: tag.name,
    ...(displayPartsText(tag.text) === undefined ? {} : { text: displayPartsText(tag.text) }),
  }));
}

function diagnosticMessageText(message: string | ts.DiagnosticMessageChain): string {
  if (typeof message === "string") {
    return message;
  }
  const next = message.next?.map(diagnosticMessageText) ?? [];
  return [message.messageText, ...next].join("\n");
}

function diagnosticCategory(category: ts.DiagnosticCategory): "warning" | "error" | "suggestion" | "message" {
  switch (category) {
    case ts.DiagnosticCategory.Warning:
      return "warning";
    case ts.DiagnosticCategory.Error:
      return "error";
    case ts.DiagnosticCategory.Suggestion:
      return "suggestion";
    case ts.DiagnosticCategory.Message:
      return "message";
  }
}

function selectedSourceFiles(resolution: ResolvedSourceSelectorResolution): readonly ts.SourceFile[] {
  const files = new Map<string, ts.SourceFile>();
  for (const target of resolution.targets) {
    if (target.sourceFile !== undefined) {
      files.set(target.sourceFile.fileName, target.sourceFile);
    }
  }
  return [...files.values()].sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function sourceFileTarget(project: SourceProject, sourceFile: ts.SourceFile, _selector: SourceSelector): ResolvedSourceTarget {
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  return {
    kind: SourceTargetKind.SourceFile,
    id: `file:${file.repoPath}`,
    label: file.repoPath,
    file,
    sourceFile,
  };
}

function sourceRangeTarget(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  start: number,
  end: number,
  _selector: SourceSelector,
): ResolvedSourceTarget {
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const span = sourceSpanFromOffsets(sourceFile, start, end);
  const symbol = symbolForNode(project.checker, node) ?? undefined;
  const name = symbol?.getName() ?? node.getText(sourceFile).slice(0, 80);
  return {
    kind: SourceTargetKind.SourceRange,
    id: `range:${file.repoPath}:${start}:${end}`,
    label: name,
    file,
    span,
    sourceFile,
    node,
    ...(symbol === undefined ? {} : { symbol }),
    ...(symbol === undefined ? {} : { symbolKey: project.checker.getFullyQualifiedName(symbol) }),
  };
}

function declarationTargetForRow(
  project: SourceProject,
  row: { readonly kind: SourceDeclarationKind; readonly name: string | null; readonly file: SourceFileIdentity; readonly span: SourceSpan; readonly symbolKey: string | null },
  selector: SourceSelector,
): ResolvedSourceTarget | null {
  const sourceFile = project.readSourceFile(row.file.absolutePath);
  if (sourceFile === null) {
    return null;
  }
  const node = nodeAtExactSpan(sourceFile, row.span);
  if (node === null) {
    return null;
  }
  return declarationTarget(project, sourceFile, node, selector, false);
}

function symbolEntryForRow(
  project: SourceProject,
  row: { readonly kind: SourceDeclarationKind; readonly name: string | null; readonly file: SourceFileIdentity; readonly span: SourceSpan; readonly symbolKey: string | null },
  selector: SourceSelector,
): TypeScriptApiSurfaceEntry | null {
  const target = declarationTargetForRow(project, row, selector);
  if (target === null || target.sourceFile === undefined || target.node === undefined) {
    return null;
  }
  return apiEntryForDeclaration(project, project.checker, target.sourceFile, target.node, row.kind, selector.scheme === SourceSelectorScheme.Export);
}

function declarationTarget(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  _selector: SourceSelector,
  exported: boolean,
  selectedSymbol?: ts.Symbol,
): ResolvedSourceTarget {
  const file = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  const kind = declarationKind(node) ?? SourceDeclarationKind.Variable;
  const span = sourceSpan(sourceFile, node);
  const nameNode = declarationNameNode(node);
  const symbol = selectedSymbol ?? symbolForNode(project.checker, nameNode ?? node) ?? undefined;
  const name = nameNode?.getText(sourceFile) ?? symbol?.getName() ?? null;
  return {
    kind: exported ? SourceTargetKind.Symbol : SourceTargetKind.Declaration,
    id: `declaration:${file.repoPath}:${span.start}:${span.end}:${name ?? "<anonymous>"}`,
    label: name ?? "<anonymous>",
    file,
    span,
    declarationKind: kind,
    sourceFile,
    node,
    ...(symbol === undefined ? {} : { symbol }),
    ...(symbol === undefined ? {} : { symbolKey: project.checker.getFullyQualifiedName(symbol) }),
  };
}

function apiEntryForDeclaration(
  project: SourceProject,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  kind: SourceDeclarationKind,
  forceExported: boolean,
): TypeScriptApiSurfaceEntry {
  const target = declarationTarget(project, sourceFile, node, { scheme: SourceSelectorScheme.File, filePath: sourceFile.fileName }, forceExported);
  const nameNode = declarationNameNode(node);
  return {
    target: rowForTarget(target),
    kind,
    name: nameNode?.getText(sourceFile) ?? null,
    exported: forceExported || isExportedDeclaration(node),
    display: displayForDeclaration(checker, sourceFile, node),
  };
}

function targetForEntry(project: SourceProject, entry: TypeScriptApiSurfaceEntry, selector: SourceSelector): ResolvedSourceTarget | null {
  const sourceFile = project.readSourceFile(entry.target.file?.absolutePath ?? "");
  if (sourceFile === null || entry.target.span === undefined) {
    return null;
  }
  const node = nodeAtExactSpan(sourceFile, entry.target.span);
  return node === null ? null : declarationTarget(project, sourceFile, node, selector, entry.exported);
}

function displayForDeclaration(checker: ts.TypeChecker, _sourceFile: ts.SourceFile, node: ts.Node): string | null {
  if (isFunctionLikeDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node);
    return signature === undefined ? null : checker.signatureToString(signature, node);
  }
  const location = declarationNameNode(node) ?? node;
  const type = checker.getTypeAtLocation(location);
  return checker.typeToString(type, location);
}

function textForTarget(sourceFile: ts.SourceFile, target: ResolvedSourceTarget): string {
  if (target.span === undefined) {
    return sourceFile.getFullText();
  }
  return sourceFile.getFullText().slice(target.span.start, target.span.end);
}

function exportSurfaceFiles(project: SourceProject, selector: ExportSourceSelector): readonly ts.SourceFile[] {
  if (selector.filePath !== undefined) {
    const sourceFile = project.readSourceFile(selector.filePath);
    return sourceFile === null ? [] : [sourceFile];
  }
  const packageTargets = packageResolution(project, {
    scheme: SourceSelectorScheme.Package,
    packageId: selector.packageId,
    packageName: selector.packageName,
  });
  return selectedSourceFiles(packageTargets).filter((sourceFile) => sourceFile.fileName.endsWith("/src/index.ts") || sourceFile.fileName.endsWith("\\src\\index.ts"));
}

function exportSurfaceFilesForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly ts.SourceFile[] {
  if (resolution.selector.scheme === SourceSelectorScheme.Export) {
    return exportSurfaceFiles(project, resolution.selector);
  }
  const files = selectedSourceFiles(resolution);
  if (resolution.selector.scheme === SourceSelectorScheme.File) {
    return files;
  }
  const entryFiles = files.filter(isPackageEntrySourceFile);
  return entryFiles.length === 0 ? files : entryFiles;
}

function isPackageEntrySourceFile(sourceFile: ts.SourceFile): boolean {
  return sourceFile.fileName.endsWith("/src/index.ts") || sourceFile.fileName.endsWith("\\src\\index.ts");
}

function exportEntriesForSurface(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  query: string | undefined,
  requiredMemberName: string | undefined,
  requiredTypeText: string | undefined,
  requiredTypeSymbolName: string | undefined,
  includeMemberNames: boolean,
  context: ExportSurfaceReadContext,
): readonly TypeScriptExportSurfaceEntry[] {
  const checker = project.checker;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    return [];
  }
  const surfaceFile = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  return [...checker.getExportsOfModule(moduleSymbol)]
    .map((symbol) => exportSurfaceEntryOrNull(project, sourceFile, surfaceFile, symbol, query, requiredMemberName, requiredTypeText, requiredTypeSymbolName, includeMemberNames, context))
    .filter((entry): entry is TypeScriptExportSurfaceEntry => entry !== null)
    .sort(compareExportSurfaceEntries);
}

function exportNameEntriesForSurface(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  query: string | undefined,
  resolveAliases: boolean,
  includeFullyQualifiedName: boolean,
): readonly TypeScriptExportNameEntry[] {
  const checker = project.checker;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    return [];
  }
  const surfaceFile = project.sourceFileIdentity(sourceFile) ?? externalFileIdentity(project, sourceFile.fileName);
  return [...checker.getExportsOfModule(moduleSymbol)]
    .filter((symbol) => query === undefined || symbol.getName().includes(query))
    .map((symbol) => exportNameEntry(checker, surfaceFile, symbol, resolveAliases, includeFullyQualifiedName))
    .sort(compareExportNameEntries);
}

function exportNameEntry(
  checker: ts.TypeChecker,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  resolveAliases: boolean,
  includeFullyQualifiedName: boolean,
): TypeScriptExportNameEntry {
  const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = alias && (resolveAliases || includeFullyQualifiedName) ? checker.getAliasedSymbol(symbol) : symbol;
  return {
    id: `export-name:${surfaceFile.repoPath}:${symbol.getName()}`,
    exportName: symbol.getName(),
    surfaceFile,
    alias,
    resolvedName: resolved.getName(),
    symbolFlags: symbol.flags,
    fullyQualifiedName: includeFullyQualifiedName ? checker.getFullyQualifiedName(resolved) : null,
  };
}

function exportSurfaceEntryOrNull(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  query: string | undefined,
  requiredMemberName: string | undefined,
  requiredTypeText: string | undefined,
  requiredTypeSymbolName: string | undefined,
  includeMemberNames: boolean,
  context: ExportSurfaceReadContext,
): TypeScriptExportSurfaceEntry | null {
  if (query !== undefined && !symbol.getName().includes(query)) {
    return null;
  }
  const checker = project.checker;
  const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declarations = resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
  const firstDeclaration = declarations[0];
  const valueType = firstDeclaration === undefined ? null : checker.getTypeOfSymbolAtLocation(resolved, firstDeclaration);
  if (requiredTypeSymbolName !== undefined && (valueType === null || !typeMentionsSymbolName(checker, valueType, requiredTypeSymbolName))) {
    return null;
  }
  const type = firstDeclaration === undefined || valueType === null
    ? null
    : checker.typeToString(valueType, firstDeclaration);
  if (requiredTypeText !== undefined && type?.includes(requiredTypeText) !== true) {
    return null;
  }
  if (requiredMemberName !== undefined && !exportHasMember(project, sourceFile, symbol, requiredMemberName, context)) {
    return null;
  }
  return exportSurfaceEntry(project, sourceFile, surfaceFile, symbol, {
    alias,
    resolved,
    declarations,
    type,
    includeMemberNames,
  });
}

function exportSurfaceEntry(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  known?: {
    readonly alias: boolean;
    readonly resolved: ts.Symbol;
    readonly declarations: readonly ts.Declaration[];
    readonly type: string | null;
    readonly includeMemberNames: boolean;
  },
): TypeScriptExportSurfaceEntry {
  const checker = project.checker;
  const alias = known?.alias ?? (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = known?.resolved ?? (alias ? checker.getAliasedSymbol(symbol) : symbol);
  const declarations = known?.declarations ?? resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
  const targets = declarations
    .map((declaration) => {
      const declarationSourceFile = sourceFileForNode(project, declaration) ?? sourceFile;
      return declarationTarget(project, declarationSourceFile, declaration, {
        scheme: SourceSelectorScheme.Export,
        exportName: symbol.getName(),
        filePath: surfaceFile.repoPath,
      }, true, resolved);
    })
    .filter((target): target is ResolvedSourceTarget => target !== null)
    .map(rowForTarget)
    .sort(compareTargets);
  const firstDeclaration = declarations[0];
  const type = known?.type ?? (firstDeclaration === undefined
    ? null
    : checker.typeToString(checker.getTypeOfSymbolAtLocation(resolved, firstDeclaration), firstDeclaration));
  const memberNames = known?.includeMemberNames === false || firstDeclaration === undefined ? [] : memberNamesForSymbol(checker, resolved, firstDeclaration);
  return {
    id: `export:${surfaceFile.repoPath}:${symbol.getName()}`,
    exportName: symbol.getName(),
    surfaceFile,
    alias,
    resolvedName: resolved.getName(),
    symbolFlags: symbol.flags,
    fullyQualifiedName: checker.getFullyQualifiedName(resolved),
    type,
    memberNames,
    targets,
  };
}

function typeMentionsSymbolName(
  checker: ts.TypeChecker,
  type: ts.Type,
  symbolName: string,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);

  if (
    type.symbol?.getName() === symbolName
    || type.aliasSymbol?.getName() === symbolName
  ) {
    return true;
  }

  if (isTypeReference(type)) {
    const target = type.target;
    if (
      target.symbol?.getName() === symbolName
      || target.aliasSymbol?.getName() === symbolName
    ) {
      return true;
    }
    for (const typeArgument of checker.getTypeArguments(type)) {
      if (typeMentionsSymbolName(checker, typeArgument, symbolName, seen)) {
        return true;
      }
    }
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((part) => typeMentionsSymbolName(checker, part, symbolName, seen));
  }

  return false;
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return (type.flags & ts.TypeFlags.Object) !== 0
    && (((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0);
}

function exportHasMember(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  symbol: ts.Symbol,
  memberName: string,
  context: ExportSurfaceReadContext,
): boolean {
  const checker = project.checker;
  const resolved = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
  const cacheKey = `${checker.getFullyQualifiedName(resolved)}:${memberName}`;
  const cached = context.memberPresenceBySymbol.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const declaration = resolved.getDeclarations()?.[0] ?? symbol.getDeclarations()?.[0] ?? sourceFile;
  const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
  const hasMember = checker.getApparentType(type).getProperty(memberName) !== undefined;
  context.memberPresenceBySymbol.set(cacheKey, hasMember);
  return hasMember;
}

function memberNamesForSymbol(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): readonly string[] {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  return checker.getApparentType(type).getProperties()
    .map((property) => property.getName())
    .sort((left, right) => left.localeCompare(right));
}

function uniqueExportSurfaceEntries(entries: readonly TypeScriptExportSurfaceEntry[]): readonly TypeScriptExportSurfaceEntry[] {
  const byId = new Map<string, TypeScriptExportSurfaceEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function uniqueExportNameEntries(entries: readonly TypeScriptExportNameEntry[]): readonly TypeScriptExportNameEntry[] {
  const byId = new Map<string, TypeScriptExportNameEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function importNames(importClause: ts.ImportClause | undefined): readonly string[] {
  if (importClause === undefined) {
    return [];
  }
  const names: string[] = [];
  if (importClause.name !== undefined) {
    names.push(importClause.name.text);
  }
  const bindings = importClause.namedBindings;
  if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
    names.push(`* as ${bindings.name.text}`);
  }
  if (bindings !== undefined && ts.isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      names.push(element.propertyName === undefined
        ? element.name.text
        : `${element.propertyName.text} as ${element.name.text}`);
    }
  }
  return names;
}

function exportNames(exportClause: ts.NamedExportBindings | undefined): readonly string[] {
  if (exportClause === undefined) {
    return ["*"];
  }
  if (ts.isNamespaceExport(exportClause)) {
    return [`* as ${exportClause.name.text}`];
  }
  return exportClause.elements.map((element) => element.propertyName === undefined
    ? element.name.text
    : `${element.propertyName.text} as ${element.name.text}`);
}

function resolvedModuleField(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  specifier: string,
): { readonly resolvedFile?: SourceFileIdentity } {
  if (!specifier.startsWith(".")) {
    return {};
  }
  const basePath = path.resolve(path.dirname(sourceFile.fileName), specifier);
  const basePaths = specifier.endsWith(".js")
    ? [basePath, basePath.slice(0, -".js".length)]
    : [basePath];
  const candidates = basePaths.flatMap((candidateBase) => [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.mts`,
    `${candidateBase}.cts`,
    `${candidateBase}.js`,
    path.join(candidateBase, "index.ts"),
    path.join(candidateBase, "index.tsx"),
    path.join(candidateBase, "index.mts"),
    path.join(candidateBase, "index.cts"),
    path.join(candidateBase, "index.js"),
  ]);
  for (const candidate of candidates) {
    const sourceFile = project.readSourceFile(candidate);
    if (sourceFile === null) {
      continue;
    }
    const identity = project.sourceFileIdentity(sourceFile);
    return identity === null ? {} : { resolvedFile: identity };
  }
  return {};
}

function moduleEdgeId(sourceFile: SourceFileIdentity, node: ts.Node): string {
  return `module-edge:${sourceFile.repoPath}:${node.getStart()}:${node.getEnd()}`;
}

function packageMatches(project: SourceProject, fileName: string, packageId: string | undefined, packageName: string | undefined): boolean {
  const packageDefinition = project.packageForFileName(fileName);
  if (packageDefinition === null) {
    return false;
  }
  if (packageId !== undefined && packageDefinition.id !== packageId) {
    return false;
  }
  if (packageName !== undefined && packageDefinition.packageName !== packageName) {
    return false;
  }
  return true;
}

function packageNameForFile(project: SourceProject, fileName: string): string | null {
  return project.packageForFileName(fileName)?.packageName ?? null;
}

function normalizeRepoSelectorPath(project: SourceProject, filePath: string): RepoRelativePath {
  const absolutePath = path.isAbsolute(filePath) ? path.resolve(filePath) : resolveRepoPath(project.repoRoot, filePath);
  return repoRelativePath(project.repoRoot, absolutePath) ?? filePath.replace(/\\/gu, "/") as RepoRelativePath;
}

function normalizeAbsolutePath(project: SourceProject, filePath: string): string {
  return path.resolve(path.isAbsolute(filePath) ? filePath : resolveRepoPath(project.repoRoot, filePath));
}

function positionToOffset(sourceFile: ts.SourceFile, position: SourcePositionSelector): number | null {
  if (position.line < 0 || position.character < 0 || position.line >= sourceFile.getLineStarts().length) {
    return null;
  }
  const offset = sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
  return offset < 0 || offset > sourceFile.getFullText().length ? null : offset;
}

function smallestNodeAt(sourceFile: ts.SourceFile, offset: number): ts.Node | null {
  let best: ts.Node | null = null;
  visit(sourceFile, (node) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    if (start <= offset && offset <= end && (best === null || node.getWidth(sourceFile) <= best.getWidth(sourceFile))) {
      best = node;
    }
  });
  return best;
}

function smallestNodeContaining(sourceFile: ts.SourceFile, start: number, end: number): ts.Node | null {
  let best: ts.Node | null = null;
  visit(sourceFile, (node) => {
    const nodeStart = node.getStart(sourceFile);
    const nodeEnd = node.getEnd();
    if (nodeStart <= start && end <= nodeEnd && (best === null || node.getWidth(sourceFile) <= best.getWidth(sourceFile))) {
      best = node;
    }
  });
  return best;
}

function nodeAtExactSpan(sourceFile: ts.SourceFile, span: SourceSpan): ts.Node | null {
  let matched: ts.Node | null = null;
  visit(sourceFile, (node) => {
    if (matched !== null) {
      return;
    }
    if (node.getStart(sourceFile) === span.start && node.getEnd() === span.end) {
      matched = node;
    }
  });
  return matched;
}

function nodeAtTextSpan(sourceFile: ts.SourceFile, textSpan: ts.TextSpan): ts.Node | null {
  const span = sourceSpanFromTextSpan(sourceFile, textSpan);
  return nodeAtExactSpan(sourceFile, span) ?? smallestNodeContaining(sourceFile, span.start, span.end);
}

function nodeWithin(subject: ts.Node, container: ts.Node): boolean {
  const sourceFile = subject.getSourceFile();
  const subjectStart = subject.getStart(sourceFile);
  const subjectEnd = subject.getEnd();
  const containerStart = container.getStart(sourceFile);
  const containerEnd = container.getEnd();
  return containerStart <= subjectStart && subjectEnd <= containerEnd;
}

function isImportSyntax(node: ts.Node): boolean {
  return ts.isImportDeclaration(node)
    || ts.isImportClause(node)
    || ts.isImportSpecifier(node)
    || ts.isNamespaceImport(node)
    || ts.isImportEqualsDeclaration(node)
    || ts.isImportTypeNode(node);
}

function isExportSyntax(node: ts.Node): boolean {
  return ts.isExportDeclaration(node)
    || ts.isExportSpecifier(node)
    || ts.isExportAssignment(node)
    || ts.isNamespaceExport(node);
}

function hasTrueIsTypeOnly(node: ts.Node | undefined): boolean {
  return node !== undefined && "isTypeOnly" in node && (node as { readonly isTypeOnly?: boolean }).isTypeOnly === true;
}

function isObjectLiteralKeyNode(current: ts.Node, selected: ts.Node): boolean {
  if (ts.isShorthandPropertyAssignment(current)) {
    return current.name === selected;
  }
  if ((ts.isPropertyAssignment(current) || ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current))
    && current.parent !== undefined
    && ts.isObjectLiteralExpression(current.parent)
    && current.name !== undefined
    && nodeWithin(selected, current.name)
  ) {
    return true;
  }
  return false;
}

function sourceFileForNode(project: SourceProject, node: ts.Node): ts.SourceFile | null {
  return project.readSourceFile(node.getSourceFile().fileName);
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  return sourceSpanFromOffsets(sourceFile, node.getStart(sourceFile), node.getEnd());
}

function sourceSpanFromOffsets(sourceFile: ts.SourceFile, start: number, end: number): SourceSpan {
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function declarationKind(node: ts.Node): SourceDeclarationKind | null {
  if (ts.isClassDeclaration(node)) {
    return SourceDeclarationKind.Class;
  }
  if (ts.isInterfaceDeclaration(node)) {
    return SourceDeclarationKind.Interface;
  }
  if (ts.isFunctionDeclaration(node)) {
    return SourceDeclarationKind.Function;
  }
  if (ts.isMethodDeclaration(node)) {
    return SourceDeclarationKind.Method;
  }
  if (ts.isPropertyDeclaration(node)) {
    return SourceDeclarationKind.Property;
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return SourceDeclarationKind.Accessor;
  }
  if (ts.isConstructorDeclaration(node)) {
    return SourceDeclarationKind.Constructor;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return SourceDeclarationKind.TypeAlias;
  }
  if (ts.isEnumDeclaration(node)) {
    return SourceDeclarationKind.Enum;
  }
  if (ts.isVariableDeclaration(node)) {
    return SourceDeclarationKind.Variable;
  }
  return null;
}

function normalizeDeclarationKind(kind: SourceDeclarationKind | string | undefined): SourceDeclarationKind | null {
  if (kind === undefined) {
    return null;
  }
  const normalized = kind.replace(/Declaration$/u, "").replace(/Alias$/u, "-alias").toLowerCase();
  switch (normalized) {
    case SourceDeclarationKind.Class:
      return SourceDeclarationKind.Class;
    case SourceDeclarationKind.Interface:
      return SourceDeclarationKind.Interface;
    case SourceDeclarationKind.Function:
      return SourceDeclarationKind.Function;
    case SourceDeclarationKind.Method:
      return SourceDeclarationKind.Method;
    case SourceDeclarationKind.Property:
      return SourceDeclarationKind.Property;
    case SourceDeclarationKind.Accessor:
      return SourceDeclarationKind.Accessor;
    case SourceDeclarationKind.Constructor:
      return SourceDeclarationKind.Constructor;
    case SourceDeclarationKind.TypeAlias:
    case "type":
      return SourceDeclarationKind.TypeAlias;
    case SourceDeclarationKind.Enum:
      return SourceDeclarationKind.Enum;
    case SourceDeclarationKind.Variable:
      return SourceDeclarationKind.Variable;
    default:
      return null;
  }
}

function normalizeCallSiteKind(kind: TypeScriptCallSiteKind | string | undefined): TypeScriptCallSiteKind | null {
  switch (kind) {
    case TypeScriptCallSiteKind.Call:
      return TypeScriptCallSiteKind.Call;
    case TypeScriptCallSiteKind.New:
      return TypeScriptCallSiteKind.New;
    default:
      return null;
  }
}

function declarationNameNode(node: ts.Node): ts.Node | undefined {
  if ("name" in node) {
    const named = node as { readonly name?: ts.Node | null };
    return named.name ?? undefined;
  }
  return undefined;
}

function typeLocationNode(node: ts.Node): ts.Node {
  return declarationNameNode(node) ?? node;
}

function symbolForNode(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(typeLocationNode(node));
  return symbol ?? null;
}

function isFunctionLikeDeclaration(node: ts.Node): node is ts.SignatureDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function isExportedDeclaration(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword) === true;
}

function countDeclarationKinds(entries: readonly TypeScriptApiSurfaceEntry[]): Readonly<Record<SourceDeclarationKind, number>> {
  const counts: Record<SourceDeclarationKind, number> = {
    [SourceDeclarationKind.Class]: 0,
    [SourceDeclarationKind.Interface]: 0,
    [SourceDeclarationKind.Function]: 0,
    [SourceDeclarationKind.Method]: 0,
    [SourceDeclarationKind.Property]: 0,
    [SourceDeclarationKind.Accessor]: 0,
    [SourceDeclarationKind.Constructor]: 0,
    [SourceDeclarationKind.TypeAlias]: 0,
    [SourceDeclarationKind.Enum]: 0,
    [SourceDeclarationKind.Variable]: 0,
  };
  for (const entry of entries) {
    counts[entry.kind] += 1;
  }
  return counts;
}

function applyOccurrence<TValue>(values: readonly TValue[], occurrence: number | undefined): readonly TValue[] {
  if (occurrence === undefined) {
    return values;
  }
  const index = Math.trunc(occurrence);
  const value = index < 0 ? undefined : values[index];
  return value === undefined ? [] : [value];
}

function emptyResolution(selector: SourceSelector, code: string, message: string): ResolvedSourceSelectorResolution {
  return { selector, targets: [], candidateCount: 0, diagnostics: [{ code, message }] };
}

function serializableResolution(resolution: ResolvedSourceSelectorResolution): SourceSelectorResolution {
  return {
    selector: resolution.selector,
    targets: resolution.targets.map(rowForTarget),
    candidateCount: resolution.candidateCount,
    diagnostics: resolution.diagnostics,
  };
}

function compareTargets(left: SourceTargetRow, right: SourceTargetRow): number {
  return (left.file?.repoPath ?? "").localeCompare(right.file?.repoPath ?? "")
    || (left.span?.start ?? 0) - (right.span?.start ?? 0)
    || left.label.localeCompare(right.label);
}

function compareEntries(left: TypeScriptApiSurfaceEntry, right: TypeScriptApiSurfaceEntry): number {
  return compareTargets(left.target, right.target);
}

function compareModuleEdges(left: TypeScriptModuleEdge, right: TypeScriptModuleEdge): number {
  return left.sourceFile.repoPath.localeCompare(right.sourceFile.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind)
    || left.specifier.localeCompare(right.specifier);
}

function compareDocumentSymbols(left: TypeScriptDocumentSymbolEntry, right: TypeScriptDocumentSymbolEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.depth - right.depth
    || left.name.localeCompare(right.name);
}

function compareReferences(left: TypeScriptReferenceEntry, right: TypeScriptReferenceEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || Number(right.definition) - Number(left.definition);
}

function compareExportSurfaceEntries(left: TypeScriptExportSurfaceEntry, right: TypeScriptExportSurfaceEntry): number {
  return left.surfaceFile.repoPath.localeCompare(right.surfaceFile.repoPath)
    || left.exportName.localeCompare(right.exportName);
}

function compareExportNameEntries(left: TypeScriptExportNameEntry, right: TypeScriptExportNameEntry): number {
  return left.surfaceFile.repoPath.localeCompare(right.surfaceFile.repoPath)
    || left.exportName.localeCompare(right.exportName);
}

function compareNavigationEntries(left: TypeScriptNavigationEntry, right: TypeScriptNavigationEntry): number {
  return left.kind.localeCompare(right.kind)
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || (left.name ?? "").localeCompare(right.name ?? "");
}

function compareCallHierarchyItems(left: TypeScriptCallHierarchyItemRow, right: TypeScriptCallHierarchyItemRow): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.selectionSpan.start - right.selectionSpan.start
    || left.name.localeCompare(right.name);
}

function compareCallHierarchyEdges(left: TypeScriptCallHierarchyEdge, right: TypeScriptCallHierarchyEdge): number {
  return left.direction.localeCompare(right.direction)
    || compareCallHierarchyItems(left.from, right.from)
    || compareCallHierarchyItems(left.to, right.to)
    || (left.fromSpans[0]?.start ?? 0) - (right.fromSpans[0]?.start ?? 0);
}

function compareCallSites(left: TypeScriptCallSiteEntry, right: TypeScriptCallSiteEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind)
    || left.calleeName.localeCompare(right.calleeName);
}

function compareDiagnostics(left: TypeScriptDiagnosticEntry, right: TypeScriptDiagnosticEntry): number {
  return (left.file?.repoPath ?? "").localeCompare(right.file?.repoPath ?? "")
    || (left.span?.start ?? 0) - (right.span?.start ?? 0)
    || left.category.localeCompare(right.category)
    || left.code - right.code
    || left.message.localeCompare(right.message);
}

function compareRenameLocations(left: TypeScriptRenameLocationEntry, right: TypeScriptRenameLocationEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start;
}

function compareRefactorActions(left: TypeScriptRefactorActionRow, right: TypeScriptRefactorActionRow): number {
  return left.refactorName.localeCompare(right.refactorName)
    || left.actionName.localeCompare(right.actionName);
}

function compareQuickInfoEntries(left: TypeScriptQuickInfoEntry, right: TypeScriptQuickInfoEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind);
}

function compareHighlights(left: TypeScriptHighlightEntry, right: TypeScriptHighlightEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind);
}

function compareCodeFixActions(left: TypeScriptCodeFixActionRow, right: TypeScriptCodeFixActionRow): number {
  return compareDiagnostics(left.diagnostic, right.diagnostic)
    || left.fixName.localeCompare(right.fixName)
    || left.description.localeCompare(right.description);
}

function compareFileEdits(left: TypeScriptFileEdits, right: TypeScriptFileEdits): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || Number(right.newFile) - Number(left.newFile);
}

function visit(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node);
  ts.forEachChild(node, (child) => visit(child, visitor));
}

function externalFileIdentity(project: SourceProject, fileName: string): SourceFileIdentity {
  return {
    absolutePath: path.resolve(fileName),
    repoPath: (repoRelativePath(project.repoRoot, fileName) ?? fileName.replace(/\\/gu, "/")) as RepoRelativePath,
    packageId: null,
  };
}
