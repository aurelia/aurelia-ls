import {
  BindingContextKind,
  BindingScopeOwnerKind,
  type BindingContextSlot,
  type BindingScope,
  type BindingScopeContext,
} from '../configuration/scope.js';
import {
  CheckerRuntimeMemberPresence,
  type CheckerTypeShapeAccess,
} from '../type-system/checker-type-shape-access.js';
import { CheckerTypeProjectionOrigin } from '../type-system/type-shape.js';

export const enum RuntimeScopeNamedLookupStatus {
  Context = 'context',
  Missing = 'missing',
  MissingAncestor = 'missing-ancestor',
  Open = 'open',
}

/** Presence-aware static counterpart of framework Scope.getContext for one authored name. */
export class RuntimeScopeNamedLookupResult {
  constructor(
    readonly status: RuntimeScopeNamedLookupStatus,
    readonly ancestor: number,
    readonly scope: BindingScope | null,
    readonly context: BindingScopeContext | null,
    readonly slot: BindingContextSlot | null,
  ) {}
}

/**
 * Resolve the receiver selected by framework Scope.getContext.
 *
 * Ancestor zero performs ordinary override/binding/parent fallback. Positive ancestors jump exactly, inspect only the
 * selected override context, then fall back to that same Scope's binding context. Open structural presence stops the
 * lookup rather than guessing that a parent owns the name.
 */
export function runtimeScopeNamedLookup(
  typeAccess: CheckerTypeShapeAccess,
  scope: BindingScope,
  name: string,
  ancestor: number = 0,
): RuntimeScopeNamedLookupResult | null {
  if (ancestor > 0) {
    let current: BindingScope | null = scope;
    let remaining = ancestor;
    while (remaining > 0 && current != null) {
      current = current.runtimeParent;
      remaining -= 1;
    }
    if (current == null) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.MissingAncestor,
        ancestor,
        null,
        null,
        null,
      );
    }
    const overridePresence = namedLookupPresence(typeAccess, current, current.overrideContext, name, true);
    if (overridePresence === CheckerRuntimeMemberPresence.Open) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Open,
        ancestor,
        current,
        current.overrideContext,
        current.overrideContext.lookup(name),
      );
    }
    if (overridePresence === CheckerRuntimeMemberPresence.Present) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Context,
        ancestor,
        current,
        current.overrideContext,
        current.overrideContext.lookup(name),
      );
    }
    const slot = current.bindingContext.lookup(name);
    return new RuntimeScopeNamedLookupResult(
      slot == null ? RuntimeScopeNamedLookupStatus.Missing : RuntimeScopeNamedLookupStatus.Context,
      ancestor,
      current,
      current.bindingContext,
      slot,
    );
  }

  let current: BindingScope | null = scope;
  let depth = 0;
  while (current != null) {
    const overridePresence = namedLookupPresence(typeAccess, current, current.overrideContext, name, true);
    if (overridePresence === CheckerRuntimeMemberPresence.Open) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Open,
        depth,
        current,
        current.overrideContext,
        current.overrideContext.lookup(name),
      );
    }
    if (overridePresence === CheckerRuntimeMemberPresence.Present) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Context,
        depth,
        current,
        current.overrideContext,
        current.overrideContext.lookup(name),
      );
    }
    const bindingPresence = namedLookupPresence(typeAccess, current, current.bindingContext, name, false);
    if (bindingPresence === CheckerRuntimeMemberPresence.Open) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Open,
        depth,
        current,
        current.bindingContext,
        current.bindingContext.lookup(name),
      );
    }
    if (bindingPresence === CheckerRuntimeMemberPresence.Present) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Context,
        depth,
        current,
        current.bindingContext,
        current.bindingContext.lookup(name),
      );
    }
    if (current.isBoundary) {
      return new RuntimeScopeNamedLookupResult(
        RuntimeScopeNamedLookupStatus.Missing,
        depth,
        current,
        current.bindingContext,
        null,
      );
    }
    current = current.runtimeParent;
    depth += 1;
  }

  // Framework fallback for an unbounded chain with no match is the original binding context.
  return new RuntimeScopeNamedLookupResult(
    RuntimeScopeNamedLookupStatus.Missing,
    0,
    scope,
    scope.bindingContext,
    null,
  );
}

function namedLookupPresence(
  typeAccess: CheckerTypeShapeAccess,
  scope: BindingScope,
  context: BindingScopeContext,
  name: string,
  overrideContext: boolean,
): CheckerRuntimeMemberPresence {
  const slot = context.lookup(name);
  // Framework-created locals and runtime assignments install an own property independently of the base checker type.
  if (slot != null && slot.targetTypeMemberHandle == null) {
    return CheckerRuntimeMemberPresence.Present;
  }
  // Framework-owned finite contexts use the modeled slot table as their runtime property inventory.
  if (
    slot == null
    && (
      overrideContext
      || context.contextKind === BindingContextKind.Synthetic
      || scope.ownerKind === BindingScopeOwnerKind.RepeatedItem
    )
  ) {
    return CheckerRuntimeMemberPresence.Absent;
  }
  if (context.contextType == null) {
    if (slot != null) {
      return CheckerRuntimeMemberPresence.Present;
    }
    return CheckerRuntimeMemberPresence.Open;
  }
  const shape = typeAccess.resolveReference(context.contextType);
  if (shape == null || shape.origin === CheckerTypeProjectionOrigin.Open) {
    return CheckerRuntimeMemberPresence.Open;
  }
  return typeAccess.runtimeMemberPresence(
    shape,
    name,
    `runtime-scope-named-lookup:${scope.productHandle}:${overrideContext ? 'override' : 'binding'}:${name}`,
  );
}
