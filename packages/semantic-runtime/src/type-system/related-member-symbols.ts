import ts from 'typescript';
import type { SourceFileRole } from '../kernel/address.js';
import { checkerPropertySymbol } from './checker-node-helpers.js';
import { canonicalTypeSystemPath } from './source-file-path.js';

export enum TypeSystemRelatedMemberFamilyReadState {
  Complete = 'complete',
  TargetUnavailable = 'target-unavailable',
  EngineUnavailable = 'engine-unavailable',
}

export enum TypeSystemRelatedMemberRenameState {
  Available = 'available',
  TypeScriptDenied = 'typescript-denied',
  NonEditableSource = 'non-editable-source',
}

export interface TypeSystemRelatedMemberReferenceSite {
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly isDeclaration: boolean;
  readonly sourceFileRole: SourceFileRole | null;
}

export interface TypeSystemRelatedMemberRenameSite {
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly prefixText: string | null;
  readonly suffixText: string | null;
  readonly sourceFileRole: SourceFileRole | null;
  readonly editable: boolean;
}

export interface TypeSystemRelatedMemberRename {
  readonly state: TypeSystemRelatedMemberRenameState;
  readonly reason: string | null;
  readonly sites: readonly TypeSystemRelatedMemberRenameSite[];
  readonly nonEditableFileNames: readonly string[];
}

export interface TypeSystemRelatedMemberFamily {
  readonly references: readonly TypeSystemRelatedMemberReferenceSite[];
  readonly rename: TypeSystemRelatedMemberRename;
}

export interface TypeSystemRelatedMemberFamilyRead {
  readonly state: TypeSystemRelatedMemberFamilyReadState;
  readonly reason: string | null;
  readonly family: TypeSystemRelatedMemberFamily | null;
}

export interface TypeSystemRelatedMemberFamilyInput {
  readonly program: ts.Program;
  readonly sourceFile: ts.SourceFile;
  readonly start: number;
  readonly end: number;
  readonly editableSourceFiles: readonly ts.SourceFile[];
  readonly sourceFileRole: (fileName: string) => SourceFileRole | null;
}

interface TypeScriptRelatedSymbolEntry {
  readonly node?: ts.Node;
}

interface TypeScriptRelatedSymbolDefinition {
  readonly symbol?: ts.Symbol;
}

interface TypeScriptRelatedSymbolGroup {
  readonly definition?: TypeScriptRelatedSymbolDefinition;
  readonly references: readonly TypeScriptRelatedSymbolEntry[];
}

interface TypeScriptFindAllReferencesApi {
  readonly FindReferencesUse: {
    readonly References: number;
    readonly Rename: number;
  };
  readonly Core: {
    getReferencedSymbolsForNode(
      position: number,
      node: ts.Node,
      program: ts.Program,
      sourceFiles: readonly ts.SourceFile[],
      cancellationToken: ts.CancellationToken,
      options: TypeScriptReferenceSearchOptions,
    ): readonly TypeScriptRelatedSymbolGroup[] | undefined;
  };
  findReferenceOrRenameEntries<TResult>(
    program: ts.Program,
    cancellationToken: ts.CancellationToken,
    sourceFiles: readonly ts.SourceFile[],
    node: ts.Node,
    position: number,
    options: TypeScriptReferenceSearchOptions,
    convertEntry: (
      entry: TypeScriptRelatedSymbolEntry,
      originalNode: ts.Node,
      checker: ts.TypeChecker,
    ) => TResult,
  ): readonly TResult[] | undefined;
  isDeclarationOfSymbol(node: ts.Node, symbol: ts.Symbol): boolean;
  toReferenceEntry(entry: TypeScriptRelatedSymbolEntry): ts.ReferenceEntry;
  toRenameLocation(
    entry: TypeScriptRelatedSymbolEntry,
    originalNode: ts.Node,
    checker: ts.TypeChecker,
    providePrefixAndSuffixText: boolean,
    quotePreference: number,
  ): ts.RenameLocation;
}

interface TypeScriptRenameApi {
  getRenameInfo(
    program: ts.Program,
    sourceFile: ts.SourceFile,
    position: number,
    preferences: ts.UserPreferences,
  ): ts.RenameInfo;
}

interface TypeScriptReferenceSearchOptions {
  readonly use: number;
  readonly findInStrings?: boolean;
  readonly findInComments?: boolean;
  readonly providePrefixAndSuffixTextForRename?: boolean;
}

interface TypeScriptRelatedSymbolApi {
  readonly findAllReferences: TypeScriptFindAllReferencesApi;
  readonly rename: TypeScriptRenameApi;
  readonly singleQuotePreference: number;
}

const NOOP_CANCELLATION_TOKEN: ts.CancellationToken = {
  isCancellationRequested: () => false,
  throwIfCancellationRequested: () => {},
};

/** Read TypeScript's own member relation without creating a second Program or LanguageService. */
export function readTypeSystemRelatedMemberFamily(
  input: TypeSystemRelatedMemberFamilyInput,
): TypeSystemRelatedMemberFamilyRead {
  const api = readTypeScriptRelatedSymbolApi();
  if (api == null) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
      `TypeScript ${ts.version} does not expose the related-symbol engine required for complete references and rename.`,
    );
  }
  const targetNode = identifierAtExactSpan(input.sourceFile, input.start, input.end);
  if (targetNode == null) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.TargetUnavailable,
      `No TypeScript identifier exists at ${input.sourceFile.fileName}@${input.start}..${input.end}.`,
    );
  }

  const checker = input.program.getTypeChecker();
  const targetSymbol = relatedMemberSymbolAtLocation(checker, targetNode);
  if (targetSymbol == null) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.TargetUnavailable,
      `TypeScript could not resolve a member symbol at ${input.sourceFile.fileName}@${input.start}..${input.end}.`,
    );
  }

  const sourceFiles = input.program.getSourceFiles();
  const anchor = relatedMemberAnchor(api.findAllReferences, input.program, checker, sourceFiles, targetNode, targetSymbol);
  if (anchor == null) {
    return shorthandOnlyRelatedMemberFamily(input, api, checker, sourceFiles, targetNode, targetSymbol);
  }

  const references = relatedMemberReferenceSites(
    input,
    api.findAllReferences,
    anchor,
    sourceFiles,
  );
  if (references == null) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
      `TypeScript ${ts.version} returned a member family without symbol-backed declaration groups.`,
    );
  }
  const rename = relatedMemberRename(input, api, anchor);
  return {
    state: TypeSystemRelatedMemberFamilyReadState.Complete,
    reason: null,
    family: { references, rename },
  };
}

function relatedMemberReferenceSites(
  input: TypeSystemRelatedMemberFamilyInput,
  api: TypeScriptFindAllReferencesApi,
  anchor: ts.Node,
  sourceFiles: readonly ts.SourceFile[],
): readonly TypeSystemRelatedMemberReferenceSite[] | null {
  const groups = api.Core.getReferencedSymbolsForNode(
    anchor.getStart(anchor.getSourceFile()),
    anchor,
    input.program,
    sourceFiles,
    NOOP_CANCELLATION_TOKEN,
    { use: api.FindReferencesUse.References },
  );
  if (groups == null || groups.length === 0 || groups.some((group) => group.definition?.symbol == null)) {
    return null;
  }

  const sites: TypeSystemRelatedMemberReferenceSite[] = [];
  for (const group of groups) {
    const symbol = group.definition!.symbol!;
    for (const entry of group.references) {
      const reference = api.toReferenceEntry(entry);
      const site = referenceSite(input, reference, entry.node != null && api.isDeclarationOfSymbol(entry.node, symbol));
      if (site == null) {
        return null;
      }
      sites.push(site);
    }
  }
  return uniqueReferenceSites(sites);
}

function relatedMemberRename(
  input: TypeSystemRelatedMemberFamilyInput,
  api: TypeScriptRelatedSymbolApi,
  anchor: ts.Node,
): TypeSystemRelatedMemberRename {
  const sourceFile = anchor.getSourceFile();
  const position = anchor.getStart(sourceFile);
  const renameInfo = api.rename.getRenameInfo(
    input.program,
    sourceFile,
    position,
    { providePrefixAndSuffixTextForRename: true },
  );
  if (!renameInfo.canRename) {
    return deniedRename(renameInfo.localizedErrorMessage);
  }

  const locations = api.findAllReferences.findReferenceOrRenameEntries(
    input.program,
    NOOP_CANCELLATION_TOKEN,
    input.program.getSourceFiles().filter((candidate) => !input.program.isSourceFileDefaultLibrary(candidate)),
    anchor,
    position,
    {
      findInStrings: false,
      findInComments: false,
      providePrefixAndSuffixTextForRename: true,
      use: api.findAllReferences.FindReferencesUse.Rename,
    },
    (entry, originalNode, checker) => api.findAllReferences.toRenameLocation(
      entry,
      originalNode,
      checker,
      true,
      api.singleQuotePreference,
    ),
  );
  if (locations == null || locations.length === 0) {
    return deniedRename('TypeScript found no complete rename locations for this member.');
  }

  const editablePaths = editableSourcePaths(input.editableSourceFiles);
  const mappedSites: TypeSystemRelatedMemberRenameSite[] = [];
  for (const location of locations) {
    const site = renameSite(input, location, editablePaths);
    if (site == null) {
      return deniedRename('TypeScript returned a rename location outside the current Program source set.');
    }
    mappedSites.push(site);
  }
  const sites = uniqueRenameSites(mappedSites);
  if (sites.length === 0) {
    return deniedRename('TypeScript returned a rename location outside the current Program source set.');
  }
  const nonEditableFileNames = uniqueStrings(
    sites.filter((site) => !site.editable).map((site) => site.fileName),
  );
  return nonEditableFileNames.length > 0
    ? {
        state: TypeSystemRelatedMemberRenameState.NonEditableSource,
        reason: `The TypeScript member family includes non-editable source: ${nonEditableFileNames.join(', ')}.`,
        sites,
        nonEditableFileNames,
      }
    : {
        state: TypeSystemRelatedMemberRenameState.Available,
        reason: null,
        sites,
        nonEditableFileNames: [],
      };
}

function shorthandOnlyRelatedMemberFamily(
  input: TypeSystemRelatedMemberFamilyInput,
  api: TypeScriptRelatedSymbolApi,
  checker: ts.TypeChecker,
  sourceFiles: readonly ts.SourceFile[],
  targetNode: ts.Identifier,
  targetSymbol: ts.Symbol,
): TypeSystemRelatedMemberFamilyRead {
  if (!isShorthandPropertyName(targetNode)) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.TargetUnavailable,
      `TypeScript found no unambiguous member anchor for ${targetNode.text}.`,
    );
  }
  const groups = api.findAllReferences.Core.getReferencedSymbolsForNode(
    targetNode.getStart(input.sourceFile),
    targetNode,
    input.program,
    sourceFiles,
    NOOP_CANCELLATION_TOKEN,
    { use: api.findAllReferences.FindReferencesUse.References },
  ) ?? [];
  const group = groups.find((candidate) => sameTsSymbol(candidate.definition?.symbol ?? null, targetSymbol));
  const declarationSites = (targetSymbol.declarations ?? []).flatMap((declaration) => {
    const name = ts.getNameOfDeclaration(declaration);
    return name == null ? [] : [referenceSiteForNode(input, name, true)];
  });
  if (group?.definition?.symbol == null) {
    // With no property use, TypeScript has no related-symbol group distinct from the shorthand's local binding.
    // The checker-backed property declaration still proves the one required `newName: localName` rewrite.
    const renameSites = shorthandDeclarationRenameSites(input, targetSymbol, targetNode.text);
    return renameSites.length === 0
      ? unavailableRead(
          TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
          `TypeScript did not retain property intent for shorthand member ${targetNode.text}.`,
        )
      : completeShorthandMemberFamily(declarationSites, renameSites);
  }

  const referenceSites = group.references.flatMap((entry) => {
    const reference = api.findAllReferences.toReferenceEntry(entry);
    const site = referenceSite(input, reference, entry.node != null && api.findAllReferences.isDeclarationOfSymbol(
      entry.node,
      targetSymbol,
    ));
    return site == null ? [] : [site];
  });
  const references = uniqueReferenceSites([...declarationSites, ...referenceSites]);
  const editablePaths = editableSourcePaths(input.editableSourceFiles);
  const mappedRenameSites: TypeSystemRelatedMemberRenameSite[] = [];
  for (const entry of group.references) {
    const location = api.findAllReferences.toRenameLocation(
      entry,
      targetNode,
      checker,
      true,
      api.singleQuotePreference,
    );
    const site = renameSite(input, location, editablePaths);
    if (site == null) {
      return unavailableRead(
        TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
        `TypeScript returned a shorthand member location outside the current Program source set.`,
      );
    }
    mappedRenameSites.push(site);
  }
  const renameSites = uniqueRenameSites(mappedRenameSites);
  if (renameSites.length === 0) {
    return unavailableRead(
      TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
      `TypeScript returned no shorthand member rename locations.`,
    );
  }
  return completeShorthandMemberFamily(references, renameSites);
}

function shorthandDeclarationRenameSites(
  input: TypeSystemRelatedMemberFamilyInput,
  targetSymbol: ts.Symbol,
  localName: string,
): readonly TypeSystemRelatedMemberRenameSite[] {
  const editablePaths = editableSourcePaths(input.editableSourceFiles);
  return uniqueRenameSites((targetSymbol.declarations ?? []).flatMap((declaration) => {
    const name = ts.getNameOfDeclaration(declaration);
    if (name == null || !isShorthandPropertyName(name)) {
      return [];
    }
    const sourceFile = name.getSourceFile();
    const start = name.getStart(sourceFile);
    const end = name.getEnd();
    return [{
      fileName: sourceFile.fileName,
      start,
      end,
      text: sourceFile.text.slice(start, end),
      prefixText: null,
      suffixText: `: ${localName}`,
      sourceFileRole: input.sourceFileRole(sourceFile.fileName),
      editable: editablePaths.has(canonicalTypeSystemPath(sourceFile.fileName)),
    }];
  }));
}

function completeShorthandMemberFamily(
  references: readonly TypeSystemRelatedMemberReferenceSite[],
  renameSites: readonly TypeSystemRelatedMemberRenameSite[],
): TypeSystemRelatedMemberFamilyRead {
  const nonEditableFileNames = uniqueStrings(
    renameSites.filter((site) => !site.editable).map((site) => site.fileName),
  );
  const rename = nonEditableFileNames.length > 0
    ? {
        state: TypeSystemRelatedMemberRenameState.NonEditableSource,
        reason: `The TypeScript member family includes non-editable source: ${nonEditableFileNames.join(', ')}.`,
        sites: renameSites,
        nonEditableFileNames,
      } as const
    : {
        state: TypeSystemRelatedMemberRenameState.Available,
        reason: null,
        sites: renameSites,
        nonEditableFileNames: [],
      } as const;
  return {
    state: TypeSystemRelatedMemberFamilyReadState.Complete,
    reason: null,
    family: { references: uniqueReferenceSites(references), rename },
  };
}

function relatedMemberAnchor(
  api: TypeScriptFindAllReferencesApi,
  program: ts.Program,
  checker: ts.TypeChecker,
  sourceFiles: readonly ts.SourceFile[],
  targetNode: ts.Identifier,
  targetSymbol: ts.Symbol,
): ts.Node | null {
  const declarationAnchor = (targetSymbol.declarations ?? [])
    .map((declaration) => ts.getNameOfDeclaration(declaration) ?? declaration)
    .find((candidate) => !isAmbiguousMemberName(candidate));
  if (declarationAnchor != null) {
    return declarationAnchor;
  }

  const groups = api.Core.getReferencedSymbolsForNode(
    targetNode.getStart(targetNode.getSourceFile()),
    targetNode,
    program,
    sourceFiles,
    NOOP_CANCELLATION_TOKEN,
    { use: api.FindReferencesUse.References },
  ) ?? [];
  const group = groups.find((candidate) => sameTsSymbol(candidate.definition?.symbol ?? null, targetSymbol));
  return group?.references
    .map((entry) => entry.node ?? null)
    .find((candidate): candidate is ts.Node => candidate != null && !isAmbiguousMemberName(candidate))
    ?? null;
}

function relatedMemberSymbolAtLocation(
  checker: ts.TypeChecker,
  node: ts.Identifier,
): ts.Symbol | null {
  const contextual = contextualPropertySymbolAtLocation(checker, node);
  return resolveAliasedSymbol(checker, contextual ?? checker.getSymbolAtLocation(node) ?? null);
}

function contextualPropertySymbolAtLocation(
  checker: ts.TypeChecker,
  node: ts.Identifier,
): ts.Symbol | null {
  const parent = node.parent;
  if (
    isNamedObjectLiteralElement(parent)
    && parent.name === node
    && ts.isObjectLiteralExpression(parent.parent)
  ) {
    const contextualType = checker.getContextualType(parent.parent);
    return contextualType == null
      ? null
      : checkerPropertySymbol(checker, checker.getNonNullableType(contextualType), node.text);
  }
  if (
    ts.isBindingElement(parent)
    && ts.isObjectBindingPattern(parent.parent)
    && (parent.propertyName === node || (parent.propertyName == null && parent.name === node))
  ) {
    return checkerPropertySymbol(
      checker,
      checker.getNonNullableType(checker.getTypeAtLocation(parent.parent)),
      node.text,
    );
  }
  return null;
}

function isNamedObjectLiteralElement(
  node: ts.Node,
): node is ts.PropertyAssignment | ts.ShorthandPropertyAssignment | ts.MethodDeclaration | ts.AccessorDeclaration {
  return ts.isPropertyAssignment(node)
    || ts.isShorthandPropertyAssignment(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function resolveAliasedSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | null,
): ts.Symbol | null {
  if (symbol == null || (symbol.flags & ts.SymbolFlags.Alias) === 0) {
    return symbol;
  }
  return checker.getAliasedSymbol(symbol);
}

function isAmbiguousMemberName(node: ts.Node): boolean {
  return isShorthandPropertyName(node)
    || (
      ts.isIdentifier(node)
      && ts.isBindingElement(node.parent)
      && ts.isObjectBindingPattern(node.parent.parent)
      && node.parent.propertyName == null
      && node.parent.name === node
    );
}

function isShorthandPropertyName(node: ts.Node): boolean {
  return ts.isIdentifier(node)
    && ts.isShorthandPropertyAssignment(node.parent)
    && node.parent.name === node;
}

function identifierAtExactSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Identifier | null {
  let found: ts.Identifier | null = null;
  const visit = (node: ts.Node): void => {
    if (found != null || start < node.getStart(sourceFile) || end > node.getEnd()) {
      return;
    }
    if (ts.isIdentifier(node) && node.getStart(sourceFile) === start && node.getEnd() === end) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function referenceSite(
  input: TypeSystemRelatedMemberFamilyInput,
  reference: ts.ReferenceEntry,
  isDeclaration: boolean,
): TypeSystemRelatedMemberReferenceSite | null {
  const sourceFile = input.program.getSourceFile(reference.fileName);
  if (sourceFile == null) {
    return null;
  }
  const start = reference.textSpan.start;
  const end = start + reference.textSpan.length;
  return {
    fileName: sourceFile.fileName,
    start,
    end,
    text: sourceFile.text.slice(start, end),
    isDeclaration,
    sourceFileRole: input.sourceFileRole(sourceFile.fileName),
  };
}

function referenceSiteForNode(
  input: TypeSystemRelatedMemberFamilyInput,
  node: ts.Node,
  isDeclaration: boolean,
): TypeSystemRelatedMemberReferenceSite {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return {
    fileName: sourceFile.fileName,
    start,
    end,
    text: sourceFile.text.slice(start, end),
    isDeclaration,
    sourceFileRole: input.sourceFileRole(sourceFile.fileName),
  };
}

function renameSite(
  input: TypeSystemRelatedMemberFamilyInput,
  location: ts.RenameLocation,
  editablePaths: ReadonlySet<string>,
): TypeSystemRelatedMemberRenameSite | null {
  const sourceFile = input.program.getSourceFile(location.fileName);
  if (sourceFile == null) {
    return null;
  }
  const start = location.textSpan.start;
  const end = start + location.textSpan.length;
  return {
    fileName: sourceFile.fileName,
    start,
    end,
    text: sourceFile.text.slice(start, end),
    prefixText: location.prefixText ?? null,
    suffixText: location.suffixText ?? null,
    sourceFileRole: input.sourceFileRole(sourceFile.fileName),
    editable: editablePaths.has(canonicalTypeSystemPath(sourceFile.fileName)),
  };
}

function editableSourcePaths(sourceFiles: readonly ts.SourceFile[]): ReadonlySet<string> {
  return new Set(sourceFiles.map((sourceFile) => canonicalTypeSystemPath(sourceFile.fileName)));
}

function uniqueReferenceSites(
  sites: readonly TypeSystemRelatedMemberReferenceSite[],
): readonly TypeSystemRelatedMemberReferenceSite[] {
  const bySource = new Map<string, TypeSystemRelatedMemberReferenceSite>();
  for (const site of sites) {
    const key = sourceSiteKey(site);
    const existing = bySource.get(key);
    bySource.set(key, existing == null || (!existing.isDeclaration && site.isDeclaration) ? site : existing);
  }
  return [...bySource.values()].sort(compareSourceSites);
}

function uniqueRenameSites(
  sites: readonly TypeSystemRelatedMemberRenameSite[],
): readonly TypeSystemRelatedMemberRenameSite[] {
  const bySource = new Map<string, TypeSystemRelatedMemberRenameSite>();
  for (const site of sites) {
    bySource.set(sourceSiteKey(site), site);
  }
  return [...bySource.values()].sort(compareSourceSites);
}

function sourceSiteKey(site: { readonly fileName: string; readonly start: number; readonly end: number }): string {
  return `${canonicalTypeSystemPath(site.fileName)}:${site.start}:${site.end}`;
}

function compareSourceSites(
  left: { readonly fileName: string; readonly start: number; readonly end: number },
  right: { readonly fileName: string; readonly start: number; readonly end: number },
): number {
  return canonicalTypeSystemPath(left.fileName).localeCompare(canonicalTypeSystemPath(right.fileName))
    || left.start - right.start
    || left.end - right.end;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function deniedRename(reason: string): TypeSystemRelatedMemberRename {
  return {
    state: TypeSystemRelatedMemberRenameState.TypeScriptDenied,
    reason,
    sites: [],
    nonEditableFileNames: [],
  };
}

function unavailableRead(
  state: TypeSystemRelatedMemberFamilyReadState.TargetUnavailable | TypeSystemRelatedMemberFamilyReadState.EngineUnavailable,
  reason: string,
): TypeSystemRelatedMemberFamilyRead {
  return { state, reason, family: null };
}

function sameTsSymbol(left: ts.Symbol | null, right: ts.Symbol): boolean {
  if (left == null) {
    return false;
  }
  if (left === right) {
    return true;
  }
  const rightDeclarations = right.declarations ?? [];
  return (left.declarations ?? []).some((leftDeclaration) =>
    rightDeclarations.some((rightDeclaration) =>
      canonicalTypeSystemPath(leftDeclaration.getSourceFile().fileName)
        === canonicalTypeSystemPath(rightDeclaration.getSourceFile().fileName)
      && leftDeclaration.getStart(leftDeclaration.getSourceFile())
        === rightDeclaration.getStart(rightDeclaration.getSourceFile())
      && leftDeclaration.getEnd() === rightDeclaration.getEnd()
    )
  );
}

function readTypeScriptRelatedSymbolApi(): TypeScriptRelatedSymbolApi | null {
  // TypeScript exposes this engine at runtime but not in typescript.d.ts. Using it against the existing Program avoids
  // a second LanguageService/Program split brain; shape guards and TS 5/current-version contracts are the upgrade gate.
  const module = ts as unknown as {
    readonly FindAllReferences?: Partial<TypeScriptFindAllReferencesApi>;
    readonly Rename?: Partial<TypeScriptRenameApi>;
    readonly QuotePreference?: { readonly Single?: number };
  };
  const findAllReferences = module.FindAllReferences;
  const rename = module.Rename;
  if (
    findAllReferences == null
    || findAllReferences.Core == null
    || typeof findAllReferences.Core.getReferencedSymbolsForNode !== 'function'
    || findAllReferences.FindReferencesUse == null
    || typeof findAllReferences.findReferenceOrRenameEntries !== 'function'
    || typeof findAllReferences.isDeclarationOfSymbol !== 'function'
    || typeof findAllReferences.toReferenceEntry !== 'function'
    || typeof findAllReferences.toRenameLocation !== 'function'
    || rename == null
    || typeof rename.getRenameInfo !== 'function'
    || typeof module.QuotePreference?.Single !== 'number'
  ) {
    return null;
  }
  return {
    findAllReferences: findAllReferences as TypeScriptFindAllReferencesApi,
    rename: rename as TypeScriptRenameApi,
    singleQuotePreference: module.QuotePreference.Single,
  };
}
