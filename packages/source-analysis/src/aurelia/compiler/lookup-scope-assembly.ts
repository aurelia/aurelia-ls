import type { AppRoot } from '../app-root.js';
import type { AppTaskSlotKind } from '../app-task.js';
import type {
  ContainerStateEntry,
  ContainerStateLookupScope,
} from '../registrations/index.js';
import {
  ContainerStateLookupScope as ContainerStateLookupScopeValue,
} from '../registrations/index.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { Controller } from './controller.js';

export class LookupScopeAssemblyBuilder {
  createWorldServiceScope(
    world: CompilerConsultedWorld,
  ): ContainerStateLookupScope {
    return new ContainerStateLookupScopeValue(
      `lookup-scope:services:${world.world.id}`,
      world.world,
      world.serviceEntries,
      null,
      'Lookup scope over consulted-world keyed service entries only.',
    );
  }

  createAppRootScope(
    appRoot: AppRoot,
    options: {
      readonly slot?: AppTaskSlotKind | null;
      readonly parent?: ContainerStateLookupScope | null;
      readonly note?: string | null;
    } = {},
  ): ContainerStateLookupScope {
    const slot = options.slot ?? null;
    const stageEntries = appRoot.readCumulativeContainerStateEntries(slot);
    return new ContainerStateLookupScopeValue(
      `lookup-scope:app-root:${appRoot.handle.id}:${slot ?? 'all'}`,
      appRoot.handle,
      stageEntries,
      options.parent ?? null,
      options.note ?? (
        slot == null
          ? 'Lookup scope over cumulative AppRoot stage consequence across every known runtime slot.'
          : `Lookup scope over cumulative AppRoot stage consequence through ${slot}.`
      ),
    );
  }

  createControllerScope(
    controller: Controller,
    localEntries: readonly ContainerStateEntry[],
    options: {
      readonly parent?: ContainerStateLookupScope | null;
      readonly note?: string | null;
    } = {},
  ): ContainerStateLookupScope {
    const parentScope = options.parent
      ?? controller.parent?.lookupScope
      ?? this.createWorldServiceScope(controller.parent?.world ?? controller.world);
    return new ContainerStateLookupScopeValue(
      `lookup-scope:controller:${controller.id}`,
      controller.world.world,
      localEntries,
      parentScope,
      options.note ?? (
        controller.parent?.lookupScope == null
          ? 'Lookup scope over controller-local keyed overlay state, with parent fallback to consulted-world service entries because no richer parent scope was attached yet.'
          : 'Lookup scope over controller-local keyed overlay state beneath the parent controller scope.'
      ),
    );
  }

  attachControllerScope(
    controller: Controller,
    localEntries: readonly ContainerStateEntry[],
    options: {
      readonly parent?: ContainerStateLookupScope | null;
      readonly note?: string | null;
    } = {},
  ): ContainerStateLookupScope {
    const scope = this.createControllerScope(controller, localEntries, options);
    controller.lookupScope = scope;
    return scope;
  }
}

// TODO: controller scope assembly currently consumes only already-materialized
// keyed overlays. definition.Type self-registration and the bounded direct-
// register constructable subset of definition.dependencies can now participate
// when callers materialize them separately, but resource-key visibility,
// richer registry-object consequence, and deeper controller-local helper state
// are still open. This builder also falls back to bare consulted-world service
// scopes when a parent controller has not been wired with a richer lookup
// scope yet.
