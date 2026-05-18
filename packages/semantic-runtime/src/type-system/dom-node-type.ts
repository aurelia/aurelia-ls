import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { HtmlNamespaceKind } from '../template/html-ir.js';
import {
  CheckerTypeMemberProjectionPolicy,
  type CheckerTypeProjectionRequest,
  type CheckerTypeProjector,
} from './checker-projector.js';
import type { TypeSystemProject } from './project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from './type-shape.js';

export const enum CheckerDomNodeTypeSource {
  TagNameMap = 'tag-name-map',
  GlobalFallback = 'global-fallback',
}

export interface CheckerDomNodeTypeResolution {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly reference: CheckerTypeReference;
  readonly location: ts.Node | null;
  readonly source: CheckerDomNodeTypeSource;
}

/** Resolves authored DOM element tags through the same lib.dom tag-name maps used by browser APIs. */
export function resolveCheckerDomNodeType(
  typeSystem: TypeSystemProject,
  tagName: string,
  namespace: HtmlNamespaceKind,
  projector: CheckerTypeProjector,
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
): CheckerDomNodeTypeResolution | null {
  const location = checkerLookupLocation(typeSystem);
  const mappedType = resolveCheckerDomNodeTypeFromTagNameMap(typeSystem, tagName, namespace, location);
  if (mappedType != null) {
    return {
      checker: typeSystem.checker,
      type: mappedType,
      reference: projectDomNodeTypeReference(projector, typeSystem.checker, mappedType, `${localKey}:tag-map:${localKeyPart(tagName)}`, location, sourceAddressHandle),
      location,
      source: CheckerDomNodeTypeSource.TagNameMap,
    };
  }

  const fallbackType = globalDeclaredType(typeSystem, fallbackElementTypeName(namespace), location);
  if (fallbackType == null) {
    return null;
  }
  return {
    checker: typeSystem.checker,
    type: fallbackType,
    reference: projectDomNodeTypeReference(projector, typeSystem.checker, fallbackType, `${localKey}:fallback:${localKeyPart(tagName)}`, location, sourceAddressHandle),
    location,
    source: CheckerDomNodeTypeSource.GlobalFallback,
  };
}

export function resolveCheckerDomNodeTypeFromTagNameMap(
  typeSystem: TypeSystemProject,
  tagName: string,
  namespace: HtmlNamespaceKind,
  location: ts.Node | null,
): ts.Type | null {
  const lowerTagName = tagName.toLowerCase();
  for (const mapName of tagNameMapNames(namespace)) {
    const mapType = globalDeclaredType(typeSystem, mapName, location);
    const tagSymbol = mapType == null
      ? null
      : typeSystem.checker.getPropertyOfType(mapType, lowerTagName) ?? null;
    if (tagSymbol != null) {
      return typeSystem.checker.getTypeOfSymbolAtLocation(
        tagSymbol,
        location ?? firstSymbolDeclaration(tagSymbol) ?? undefinedNode(typeSystem.checker),
      );
    }
  }
  return null;
}

export function globalDeclaredType(
  typeSystem: TypeSystemProject,
  name: string,
  location: ts.Node | null,
): ts.Type | null {
  const symbol = typeSystem.checker.resolveName(
    name,
    location ?? undefinedNode(typeSystem.checker),
    ts.SymbolFlags.Interface,
    false,
  ) ?? null;
  return symbol == null ? null : typeSystem.checker.getDeclaredTypeOfSymbol(symbol);
}

export function checkerLookupLocation(typeSystem: TypeSystemProject): ts.SourceFile | null {
  return typeSystem.program.getSourceFiles().find((sourceFile) => !sourceFile.isDeclarationFile)
    ?? typeSystem.program.getSourceFiles()[0]
    ?? null;
}

function projectDomNodeTypeReference(
  projector: CheckerTypeProjector,
  checker: ts.TypeChecker,
  type: ts.Type,
  localKey: string,
  sourceNode: ts.Node | null,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeReference {
  return projector.ensureProjection({
    localKey,
    checker,
    type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode,
    sourceAddressHandle,
    display: checker.typeToString(type),
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  } satisfies CheckerTypeProjectionRequest).toReference();
}

function tagNameMapNames(namespace: HtmlNamespaceKind): readonly string[] {
  switch (namespace) {
    case HtmlNamespaceKind.Html:
      return ['HTMLElementTagNameMap'];
    case HtmlNamespaceKind.Svg:
      return ['SVGElementTagNameMap'];
    case HtmlNamespaceKind.Math:
      return ['MathMLElementTagNameMap'];
    case HtmlNamespaceKind.Unknown:
      return ['HTMLElementTagNameMap', 'SVGElementTagNameMap', 'MathMLElementTagNameMap'];
  }
}

function fallbackElementTypeName(namespace: HtmlNamespaceKind): string {
  switch (namespace) {
    case HtmlNamespaceKind.Svg:
      return 'SVGElement';
    case HtmlNamespaceKind.Math:
      return 'MathMLElement';
    case HtmlNamespaceKind.Html:
    case HtmlNamespaceKind.Unknown:
      return 'HTMLElement';
  }
}

function firstSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | null {
  return symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
}

function undefinedNode(checker: ts.TypeChecker): ts.Node {
  return checker.getSymbolAtLocation(checkerLocationFromProgram(checker))?.valueDeclaration
    ?? checkerLocationFromProgram(checker);
}

function checkerLocationFromProgram(checker: ts.TypeChecker): ts.SourceFile {
  return checker.getAmbientModules()[0]?.declarations?.[0]?.getSourceFile()
    ?? ts.createSourceFile('semantic-runtime-dom-node-type.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
}
