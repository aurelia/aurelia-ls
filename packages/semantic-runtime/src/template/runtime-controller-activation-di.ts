import ts from 'typescript';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import { isNestedExecutionBoundary } from '../evaluation/ts-syntax.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceFileAddressForAddress,
} from '../kernel/source-address.js';
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

const RESOLVE_EXPORTS = new Set(['resolve']);
const VIEW_FACTORY_EXPORTS = new Set(['IViewFactory']);

export interface RuntimeControllerActivationDiSite {
  readonly sourceAddressHandle: AddressHandle;
  readonly records: readonly KernelStoreRecord[];
}

export interface ControllerActivationImportBindings {
  readonly resolve: SourceImportBindings;
  readonly viewFactory: SourceImportBindings;
}

/**
 * Finds instance-activation `resolve(IViewFactory)` sites on a resource view model.
 *
 * Runtime-html registers a not-ready IViewFactory resolver for custom elements and ordinary custom attributes. Template
 * controllers receive a prepared provider, so the caller decides whether these sites are invalid for the active
 * controller kind.
 */
export function readControllerActivationViewFactoryResolveSites(
  publication: KernelPublicationContext,
  definition: CustomElementDefinition | CustomAttributeDefinition,
): readonly RuntimeControllerActivationDiSite[] {
  const targetTypeProductHandle = definition.target.targetType?.productHandle ?? null;
  const shape = targetTypeProductHandle == null
    ? null
    : publication.readProductDetail(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  if (shape?.carrier == null) {
    return [];
  }
  const definitionSourceFile = sourceFileAddressForAddress(
    publication,
    definition.target.declarationSourceAddressHandle ?? definition.target.addressHandle,
  );
  if (definitionSourceFile == null) {
    return [];
  }
  return shape.carrier.declarations.flatMap((declaration) =>
    ts.isClassDeclaration(declaration)
      ? readClassActivationViewFactoryResolveSites(
        publication,
        definitionSourceFile.handle,
        definition.name,
        declaration,
      )
      : []
  );
}

function readClassActivationViewFactoryResolveSites(
  publication: KernelPublicationContext,
  sourceFileAddressHandle: AddressHandle,
  definitionName: string,
  declaration: ts.ClassDeclaration,
): readonly RuntimeControllerActivationDiSite[] {
  const sourceFile = declaration.getSourceFile();
  const bindings = readControllerActivationImportBindings(sourceFile);
  const sites: RuntimeControllerActivationDiSite[] = [];
  for (const member of declaration.members) {
    if (isStaticClassElement(member)) {
      continue;
    }
    if (ts.isPropertyDeclaration(member) && member.initializer != null) {
      visitActivationNode(publication, sourceFileAddressHandle, sourceFile, bindings, definitionName, member.initializer, sites);
      continue;
    }
    if (ts.isConstructorDeclaration(member) && member.body != null) {
      visitActivationNode(publication, sourceFileAddressHandle, sourceFile, bindings, definitionName, member.body, sites);
    }
  }
  return sites;
}

function visitActivationNode(
  publication: KernelPublicationContext,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  bindings: ControllerActivationImportBindings,
  definitionName: string,
  node: ts.Node,
  sites: RuntimeControllerActivationDiSite[],
): void {
  if (isNestedExecutionBoundary(node)) {
    return;
  }
  if (ts.isCallExpression(node) && isResolveIViewFactoryCall(node, bindings)) {
    sites.push(sourceSiteForNode(publication, sourceFileAddressHandle, sourceFile, definitionName, node));
  }
  ts.forEachChild(node, (child) =>
    visitActivationNode(publication, sourceFileAddressHandle, sourceFile, bindings, definitionName, child, sites)
  );
}

export function readControllerActivationImportBindings(
  sourceFile: ts.SourceFile,
): ControllerActivationImportBindings {
  return {
    resolve: readSourceImportBindings(sourceFile, RESOLVE_MODULES, RESOLVE_EXPORTS),
    viewFactory: readSourceImportBindings(sourceFile, VIEW_FACTORY_MODULES, VIEW_FACTORY_EXPORTS),
  };
}

export function isResolveIViewFactoryCall(
  node: ts.CallExpression,
  bindings: ControllerActivationImportBindings,
): boolean {
  const key = node.arguments[0] ?? null;
  return readImportedExportName(node.expression, bindings.resolve, RESOLVE_EXPORTS) === 'resolve'
    && key != null
    && readImportedExportName(key, bindings.viewFactory, VIEW_FACTORY_EXPORTS) === 'IViewFactory';
}

function sourceSiteForNode(
  publication: KernelPublicationContext,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  definitionName: string,
  node: ts.Node,
): RuntimeControllerActivationDiSite {
  const start = node.getStart(sourceFile);
  const end = node.end;
  const handle = publication.handles.address([
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
        sourceFileAddressHandle,
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
