import ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';

const RESOLVE_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const VIEW_FACTORY_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

export interface RuntimeControllerActivationDiSite {
  readonly sourceAddressHandle: AddressHandle | null;
  readonly records: readonly KernelStoreRecord[];
}

interface ImportBindings {
  readonly resolveIdentifiers: ReadonlySet<string>;
  readonly resolveNamespaces: ReadonlySet<string>;
  readonly viewFactoryIdentifiers: ReadonlySet<string>;
  readonly viewFactoryNamespaces: ReadonlySet<string>;
}

class MutableImportBindings implements ImportBindings {
  readonly resolveIdentifiers = new Set<string>();
  readonly resolveNamespaces = new Set<string>();
  readonly viewFactoryIdentifiers = new Set<string>();
  readonly viewFactoryNamespaces = new Set<string>();
}

/**
 * Finds instance-activation `resolve(IViewFactory)` sites on a resource view model.
 *
 * Runtime-html registers a not-ready IViewFactory resolver for custom elements and ordinary custom attributes. Template
 * controllers receive a prepared provider, so the caller decides whether these sites are invalid for the active
 * controller kind.
 */
export function readControllerActivationViewFactoryResolveSites(
  store: KernelStore,
  definition: CustomElementDefinition | CustomAttributeDefinition,
): readonly RuntimeControllerActivationDiSite[] {
  const targetTypeProductHandle = definition.target.targetType?.productHandle ?? null;
  const shape = targetTypeProductHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  if (shape?.carrier == null) {
    return [];
  }
  return shape.carrier.declarations.flatMap((declaration) =>
    ts.isClassDeclaration(declaration)
      ? readClassActivationViewFactoryResolveSites(store, definition.name, declaration)
      : []
  );
}

function readClassActivationViewFactoryResolveSites(
  store: KernelStore,
  definitionName: string,
  declaration: ts.ClassDeclaration,
): readonly RuntimeControllerActivationDiSite[] {
  const sourceFile = declaration.getSourceFile();
  const bindings = readImportBindings(sourceFile);
  const sites: RuntimeControllerActivationDiSite[] = [];
  for (const member of declaration.members) {
    if (isStaticClassElement(member)) {
      continue;
    }
    if (ts.isPropertyDeclaration(member) && member.initializer != null) {
      visitActivationNode(store, sourceFile, bindings, definitionName, member.initializer, sites);
      continue;
    }
    if (ts.isConstructorDeclaration(member) && member.body != null) {
      visitActivationNode(store, sourceFile, bindings, definitionName, member.body, sites);
    }
  }
  return sites;
}

function visitActivationNode(
  store: KernelStore,
  sourceFile: ts.SourceFile,
  bindings: ImportBindings,
  definitionName: string,
  node: ts.Node,
  sites: RuntimeControllerActivationDiSite[],
): void {
  if (isFunctionBoundary(node)) {
    return;
  }
  if (ts.isCallExpression(node) && isResolveIViewFactoryCall(node, bindings)) {
    sites.push(sourceSiteForNode(store, sourceFile, definitionName, node));
  }
  ts.forEachChild(node, (child) => visitActivationNode(store, sourceFile, bindings, definitionName, child, sites));
}

function readImportBindings(sourceFile: ts.SourceFile): ImportBindings {
  const bindings = new MutableImportBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    const namedBindings = statement.importClause?.namedBindings ?? null;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      if (RESOLVE_MODULES.has(moduleSpecifier)) {
        bindings.resolveNamespaces.add(namedBindings.name.text);
      }
      if (VIEW_FACTORY_MODULES.has(moduleSpecifier)) {
        bindings.viewFactoryNamespaces.add(namedBindings.name.text);
      }
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === 'resolve' && RESOLVE_MODULES.has(moduleSpecifier)) {
        bindings.resolveIdentifiers.add(element.name.text);
      }
      if (importedName === 'IViewFactory' && VIEW_FACTORY_MODULES.has(moduleSpecifier)) {
        bindings.viewFactoryIdentifiers.add(element.name.text);
      }
    }
  }
  return bindings;
}

function isResolveIViewFactoryCall(
  node: ts.CallExpression,
  bindings: ImportBindings,
): boolean {
  const key = node.arguments[0] ?? null;
  return isResolveExpression(node.expression, bindings)
    && key != null
    && isIViewFactoryExpression(key, bindings);
}

function isResolveExpression(
  expression: ts.Expression,
  bindings: ImportBindings,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.resolveIdentifiers.has(expression.text);
  }
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === 'resolve'
    && ts.isIdentifier(expression.expression)
    && bindings.resolveNamespaces.has(expression.expression.text);
}

function isIViewFactoryExpression(
  expression: ts.Expression,
  bindings: ImportBindings,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.viewFactoryIdentifiers.has(expression.text);
  }
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === 'IViewFactory'
    && ts.isIdentifier(expression.expression)
    && bindings.viewFactoryNamespaces.has(expression.expression.text);
}

function sourceSiteForNode(
  store: KernelStore,
  sourceFile: ts.SourceFile,
  definitionName: string,
  node: ts.Node,
): RuntimeControllerActivationDiSite {
  const sourceFileAddress = store.readBestSourceFileAddressForFileName(sourceFile.fileName);
  if (sourceFileAddress == null) {
    return {
      sourceAddressHandle: null,
      records: [],
    };
  }
  const start = node.getStart(sourceFile);
  const end = node.end;
  const handle = store.handles.address([
    'runtime-controller-activation-di',
    localKeyPart(definitionName),
    localKeyPart(sourceFile.fileName),
    start,
    end,
  ].join(':'));
  return {
    sourceAddressHandle: handle,
    records: [
      new SourceSpanAddress(
        handle,
        sourceFileAddress.handle,
        start,
        end,
        SourceSpanRole.Primary,
      ),
    ],
  };
}

function isStaticClassElement(member: ts.ClassElement): boolean {
  return (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
}

function isFunctionBoundary(node: ts.Node): boolean {
  return ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}
