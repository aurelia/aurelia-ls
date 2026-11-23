import { semanticSourceReferenceHostPath } from '../boot/source-ownership.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import type { BindingScope, BindingScopeContext } from '../configuration/scope.js';
import { AuthoredScopePathKind, type ArrowFunction } from '../expression/ast.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { isAureliaExpressionIdentifierName } from '../expression/expression-scanner.js';
import { visitExpressionAstNodes } from '../expression/parse-result-inspection.js';
import type { KernelStore } from '../kernel/store.js';
import type { ProductHandle } from '../kernel/handles.js';
import { bindingExpressionAstForProduct } from '../template/expression-parse-product.js';
import { resourceLocalRuntimeBindingExpressionAccessResolutions } from '../template/runtime-resource-ownership.js';
import { runtimeScopeNamedLookup, RuntimeScopeNamedLookupStatus } from '../template/runtime-scope-named-lookup.js';
import { CheckerTypeShapeAccess, CheckerTypeShapeMemberValueAccessKind } from '../type-system/checker-type-shape-access.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import type { SemanticTemplateRenameEditRow } from './contracts.js';
import { describeAddress, semanticExactSourceReference, type SemanticSourceReference } from './source-reference.js';
import { bindableRenameCallbackConflict } from './bindable-rename-callback.js';

/**
 * Check where the proposed spelling would bind. A declaration can capture an existing read of the new name,
 * including a read whose text is deliberately absent from the edit. Use the rendered scope at each occurrence.
 */
export function templateRenameDestinationConflict(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  oldName: string,
  newName: string,
  target: SemanticSourceReference,
  edits: readonly SemanticTemplateRenameEditRow[],
): string | null {
  if (oldName === newName) return null;
  const sourceKey = (source: SemanticSourceReference | null) => {
    const exact = semanticExactSourceReference(source);
    const file = semanticSourceReferenceHostPath(emission.project.workspaceRootDir, exact);
    return file == null || exact?.start == null || exact.end == null
      ? null
      : `${canonicalTypeSystemPath(file)}@${exact.start}..${exact.end}`;
  };
  const changed = new Set([target, ...edits.map(edit => edit.source)].map(sourceKey).filter(key => key != null));
  const isChanged = (source: SemanticSourceReference | null) => {
    const key = sourceKey(source);
    return key != null && changed.has(key);
  };
  const arrows = new Map<ProductHandle, readonly ArrowFunction[]>();
  const typeAccess = new CheckerTypeShapeAccess(store, emission.templates.expressionWorld.projector);
  const callbackConflict = bindableRenameCallbackConflict(store, emission, typeAccess, oldName, newName, isChanged);
  if (callbackConflict != null) return callbackConflict;
  const selectedContexts = new Map<BindingScopeContext, boolean>();
  const parser = new ExpressionParser();
  const parsedAccessKinds = new Map<string, string>();
  const scopeAccessKind = (prefix: string): string => {
    const cached = parsedAccessKinds.get(prefix);
    if (cached != null) return cached;
    const parsed = parser.parse(prefix + newName, 'IsProperty');
    const kind = parsed.kind === ExpressionParseResultKind.ExpressionSuccess ? parsed.ast.$kind : 'unparseable';
    parsedAccessKinds.set(prefix, kind);
    return kind;
  };
  const ownsRenamedSlot = (context: BindingScopeContext): boolean => {
    const cached = selectedContexts.get(context);
    if (cached != null) return cached;
    const slot = context.lookup(oldName);
    const shape = slot == null && context.contextType != null ? typeAccess.resolveReference(context.contextType) : null;
    const member = shape == null ? null : typeAccess.memberValueAccess(shape, oldName, `rename-declaration:${shape.productHandle}:${oldName}`).member;
    const source = slot?.sourceAddressHandle ?? (member == null ? null : checkerTypeMemberSourceAddressHandle(store, member));
    const selected = isChanged(describeAddress(store, source));
    selectedContexts.set(context, selected);
    return selected;
  };

  for (const resource of [...emission.templates.resources, ...emission.templates.authoringResources]) {
    for (const resolution of resourceLocalRuntimeBindingExpressionAccessResolutions(store, resource)) {
      const node = resolution.occurrence.expression;
      if (node.$kind !== 'AccessScope' && node.$kind !== 'CallScope' && node.$kind !== 'AccessMember' && node.$kind !== 'CallMember') continue;
      const name = node.name.name;
      if (name !== oldName && name !== newName) continue;
      const source = semanticExactSourceReference(describeAddress(store, resolution.nameSourceAddressHandle));
      if (source?.path == null || source.start == null) continue;
      const edited = name === oldName && isChanged(source);
      if (!edited && name !== newName) continue;

      if (node.$kind === 'AccessMember' || node.$kind === 'CallMember') {
        if (edited && !isAureliaExpressionIdentifierName(newName)) return `'${newName}' cannot be used as a member name at ${source.label}.`;
        if (edited && resolution.targetLinks.some(link => {
          const member = link.targetTypeMemberHandle == null ? null : store.hotDetails.read(TypeSystemHotDetails.TypeMember, link.targetTypeMemberHandle);
          const owner = member == null ? null : typeAccess.resolveReference(member.ownerType);
          return owner != null && typeAccess.memberValueAccess(owner, newName, `rename-destination:${owner.productHandle}:${newName}`).member != null;
        })) return `'${newName}' already exists on the receiver of '${name}' at ${source.label}.`;
        continue;
      }

      const path = node.authoredScopePath;
      if (edited) {
        const qualifier = path == null ? '' : path.pathKind === AuthoredScopePathKind.CurrentBindingContext ? '$this' : '$parent';
        const separator = path == null ? '' : path.optionalAccessSpan == null ? '.' : '?.';
        // A new root spelling can parse as a global, literal or scope jump. A dot after $parent
        // also admits another ancestor hop, whereas the same name after $this can be a property.
        const kind = scopeAccessKind(qualifier + separator);
        if (kind !== 'AccessScope') return `'${qualifier}${separator}${newName}' would not read the renamed member at ${source.label} (${kind}).`;
      }
      const conflict = `Rename cannot preserve the binding of '${name}' at ${source.label} when changing '${oldName}' to '${newName}'.`;
      if (path == null && (resolution.callbackScopeDepth ?? 0) > 0) {
        const owner = renamedArrowParameterWins(store, arrows, resolution.expressionProductHandle, source, oldName, newName, isChanged);
        if (owner != null) {
          if (edited !== owner) return conflict;
          continue;
        }
      }

      const scope = resolution.scopeProductHandle == null ? null
        : store.readProductDetail(ConfigurationProductDetails.BindingScope, resolution.scopeProductHandle);
      if (scope != null && scopeBindingMayChange(typeAccess, scope, oldName, newName, resolution.authoredScopeAncestor ?? 0, edited, ownsRenamedSlot)) {
        return conflict;
      }
    }
  }
  return null;
}

/** Callback parameters precede ordinary Scope lookup for a bare name in the arrow body. */
function renamedArrowParameterWins(
  store: KernelStore,
  cache: Map<ProductHandle, readonly ArrowFunction[]>,
  expressionHandle: ProductHandle,
  source: SemanticSourceReference,
  oldName: string,
  newName: string,
  isChanged: (source: SemanticSourceReference) => boolean,
): boolean | null {
  let arrows = cache.get(expressionHandle);
  if (arrows == null) {
    const root = bindingExpressionAstForProduct(store, expressionHandle);
    const nested: ArrowFunction[] = [];
    if (root != null) visitExpressionAstNodes(root, expression => {
      if (expression.$kind === 'ArrowFunction') nested.push(expression);
    });
    arrows = nested.reverse(); // The innermost enclosing arrow owns a matching parameter.
    cache.set(expressionHandle, arrows);
  }
  for (const arrow of arrows) {
    if (source.start! < arrow.body.span.start || source.end! > arrow.body.span.end) continue;
    if (arrow.args.some(arg => arg.name.name === newName)) return false;
    if (arrow.args.some(arg => arg.name.name === oldName
      && isChanged({ ...source, start: arg.name.span.start, end: arg.name.span.end }))) return true;
  }
  return null;
}

function scopeBindingMayChange(
  typeAccess: CheckerTypeShapeAccess,
  scope: BindingScope,
  oldName: string,
  newName: string,
  ancestor: number,
  edited: boolean,
  ownsRenamedSlot: (context: BindingScopeContext) => boolean,
): boolean {
  const existing = runtimeScopeNamedLookup(typeAccess, scope, newName, ancestor);
  const previous = edited ? runtimeScopeNamedLookup(typeAccess, scope, oldName, ancestor) : null;
  // Compare the first existing binding with the first proposed declaration in Scope.getContext lookup order.
  // A nearer, definite existing binding preserves an untouched use. An open presence can still fall through.
  let current: BindingScope | null = scope;
  for (let depth = 0; current != null; depth++, current = current.runtimeParent) {
    if (depth < ancestor) continue;
    for (const context of [current.overrideContext, current.bindingContext]) {
      const receivesRename = ownsRenamedSlot(context)
        || (edited && previous?.scope === current && previous.context === context && previous.status === RuntimeScopeNamedLookupStatus.Context);
      if (existing?.scope === current && existing.context === context) {
        if (existing.status === RuntimeScopeNamedLookupStatus.Context) return edited;
        if (existing.status === RuntimeScopeNamedLookupStatus.Open && edited) {
          // Open presence ahead of the declaration can capture a read. At the receiver being renamed,
          // an interface or generated view-model can also report Open for every *absent* property.
          if (!receivesRename || existing.slot != null) return true;
          const owner = context.contextType == null ? null : typeAccess.resolveReference(context.contextType);
          if (owner != null
            && typeAccess.memberValueAccess(owner, newName, `rename-destination:${owner.productHandle}:${newName}`).accessKind !== CheckerTypeShapeMemberValueAccessKind.Missing) {
            return true;
          }
        }
      }
      if (receivesRename) return !edited;
    }
    if (ancestor > 0 || current.isBoundary) break;
  }
  return false;
}
