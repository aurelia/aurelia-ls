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
import {
  firstSymbolDeclaration,
  checkerPropertySymbol,
  checkerSymbolValueType,
} from './checker-node-helpers.js';

export const enum CheckerDomNodeTypeSource {
  TagNameMap = 'tag-name-map',
  GlobalFallback = 'global-fallback',
}

/** DOM event-map interfaces consulted for listener `$event` and handler-reference runtime arguments. */
export const CHECKER_DOM_EVENT_MAP_TYPE_NAMES = [
  'GlobalEventHandlersEventMap',
  'HTMLElementEventMap',
] as const;

/** Fallback DOM event globals used after listener event-map lookup misses. */
export const CHECKER_DOM_EVENT_FALLBACK_TYPE_NAMES = [
  'CustomEvent',
  'Event',
] as const;

export interface CheckerDomNodeTypeResolution {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly reference: CheckerTypeReference;
  readonly location: ts.Node;
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
  if (location == null) {
    return null;
  }
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
  location: ts.Node,
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
        firstSymbolDeclaration(tagSymbol) ?? location,
      );
    }
  }
  return null;
}

export function globalDeclaredType(
  typeSystem: TypeSystemProject,
  name: string,
  location: ts.Node,
): ts.Type | null {
  const symbol = typeSystem.checker.resolveName(
    name,
    location,
    ts.SymbolFlags.Interface,
    false,
  ) ?? null;
  return symbol == null ? null : typeSystem.checker.getDeclaredTypeOfSymbol(symbol);
}

/** Resolves listener event names through DOM event maps before falling back to broad Event-like globals. */
export function resolveCheckerDomEventType(
  typeSystem: TypeSystemProject,
  eventName: string,
  location: ts.Node | null = checkerLookupLocation(typeSystem),
): ts.Type | null {
  if (location == null) {
    return null;
  }
  for (const mapName of CHECKER_DOM_EVENT_MAP_TYPE_NAMES) {
    const eventType = eventMapPropertyType(typeSystem, location, mapName, eventName);
    if (eventType != null) {
      return eventType;
    }
  }
  for (const fallbackName of CHECKER_DOM_EVENT_FALLBACK_TYPE_NAMES) {
    const fallbackType = globalDeclaredType(typeSystem, fallbackName, location);
    if (fallbackType != null) {
      return fallbackType;
    }
  }
  return null;
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

function eventMapPropertyType(
  typeSystem: TypeSystemProject,
  location: ts.Node,
  mapName: string,
  eventName: string,
): ts.Type | null {
  const checker = typeSystem.checker;
  const mapType = globalDeclaredType(typeSystem, mapName, location);
  const property = mapType == null ? null : checkerPropertySymbol(checker, mapType, eventName);
  return property == null
    ? null
    : checkerSymbolValueType(checker, property, location);
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
