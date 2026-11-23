import {
  BindingContextSlotDraft,
  BindingScope,
} from '../configuration/scope.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { TemplateScopeConstructionFrame } from './template-controller-scope-materializer.js';

interface ImplicitWriter {
  readonly slot: BindingContextSlotDraft;
  readonly clearsOnUnbind: boolean;
}

/** Runtime-created source properties remain observable by live bindings rendered before their writer. */
export class TemplateImplicitWriteScopes {
  private readonly writers = new Map<IdentityHandle, Map<string, Map<ProductHandle, ImplicitWriter>>>();

  has(owner: BindingScope, name: string): boolean {
    return this.writers.get(owner.bindingContext.identityHandle)?.has(name) === true;
  }

  record(owner: BindingScope, binding: ProductHandle, slot: BindingContextSlotDraft, introduced: boolean, clearsOnUnbind: boolean): void {
    let names = this.writers.get(owner.bindingContext.identityHandle);
    if (names == null) {
      if (!introduced) return;
      names = new Map();
      this.writers.set(owner.bindingContext.identityHandle, names);
    }
    let writers = names.get(slot.name);
    if (writers == null) {
      if (!introduced) return;
      writers = new Map();
      names.set(slot.name, writers);
    }
    writers.set(binding, { slot, clearsOnUnbind });
  }

  apply(frame: TemplateScopeConstructionFrame): void {
    if (this.writers.size === 0) return;
    const cache = new Map<BindingScope, BindingScope>();
    const slotsByContext = new Map<IdentityHandle, BindingContextSlotDraft[]>();
    const forReads = (scope: BindingScope): BindingScope => {
      const cached = cache.get(scope);
      if (cached != null) return cached;
      const parent = scope.runtimeParent == null ? null : forReads(scope.runtimeParent);
      const context = scope.bindingContext;
      let declarations = slotsByContext.get(context.identityHandle);
      if (declarations == null) {
        declarations = [];
        const names = this.writers.get(context.identityHandle);
        if (names != null) {
          for (const [name, writes] of names) {
            const values = [...writes.values()];
            const first = values[0]!.slot;
            const localKey = `${frame.input.localKey}:implicit-write:${context.identityHandle}:${name}`;
            // A live reader may run before an assignment or after teardown. Keep the authored write
            // location only when unambiguous; the ordinary per-instruction state still wins after a write.
            const source = values.length === 1 ? first.sourceAddressHandle : null;
            const types = values.map(value => value.slot.targetType);
            types.push(frame.services.typeSupport.literalTypeReference(frame.input, undefined, `${localKey}:before-bind`, source));
            if (values.some(value => value.clearsOnUnbind)) {
              types.push(frame.services.typeSupport.literalTypeReference(frame.input, null, `${localKey}:after-unbind`, source));
            }
            const targetType = types.every(type => type != null)
              ? frame.services.typeSupport.commonOrUnionTypeReference(types, `${localKey}:read`, source)
              : null;
            declarations.push(new BindingContextSlotDraft(name, null, null, targetType, source, [], null, [], first.assignmentAccessKind));
          }
        }
        slotsByContext.set(context.identityHandle, declarations);
      }
      const missing = declarations.filter(slot => context.lookup(slot.name) == null);
      const result = missing.length === 0 && parent === scope.runtimeParent ? scope
        : frame.addDerivedScope(frame.services.scopeMaterializer.prepare(BindingScope.fromNarrowedBindingScope({
          localKey: `${frame.input.localKey}:scope:reactive-writers:${scope.productHandle}`,
          base: scope,
          runtimeParent: parent,
          bindingContextSlots: missing,
          ownerProductHandle: scope.productHandle,
          ownerIdentityHandle: scope.identityHandle,
          sourceAddressHandle: scope.sourceAddressHandle,
        })));
      cache.set(scope, result);
      return result;
    };
    for (const [index, application] of frame.instructionScopes.entries()) {
      const scope = forReads(application.scope);
      if (scope !== application.scope) frame.instructionScopes[index] = { ...application, scope };
    }
  }
}
