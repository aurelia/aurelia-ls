import { combineDisposables, type DisposableLike } from "./disposables.js";
import type { ClientContext } from "./context.js";

export interface FeatureModule {
  id: string;
  isEnabled?: (ctx: ClientContext) => boolean;
  activate: (ctx: ClientContext) =>
    | void
    | DisposableLike
    | DisposableLike[]
    | Promise<void | DisposableLike | DisposableLike[]>;
  deactivate?: (ctx: ClientContext) => void;
}

export class FeatureRegistry {
  #modules: FeatureModule[] = [];
  #active = new Map<string, DisposableLike>();

  register(...modules: FeatureModule[]): void {
    this.#modules.push(...modules);
  }

  async activateAll(ctx: ClientContext): Promise<void> {
    await this.reconcile(ctx);
  }

  async reconcile(ctx: ClientContext): Promise<void> {
    const debug = ctx.debug.channel("features");
    for (const module of this.#modules) {
      const enabled = module.isEnabled ? module.isEnabled(ctx) : true;
      const isActive = this.#active.has(module.id);
      if (enabled && !isActive) {
        debug("activate.start", { id: module.id });
        const result = await ctx.errors.capture(
          `feature.activate.${module.id}`,
          () => ctx.trace.spanAsync(`feature.activate.${module.id}`, async () => Promise.resolve(module.activate(ctx))),
          { context: { feature: module.id } },
        );
        if (!result.ok) {
          debug("activate.failed", { id: module.id });
          continue;
        }
        const activation = result.value;
        if (activation) {
          const disposable = Array.isArray(activation)
            ? combineDisposables(activation)
            : activation;
          this.#active.set(module.id, disposable);
        } else {
          this.#active.set(module.id, { dispose: () => {} });
        }
        debug("activate.complete", { id: module.id });
      } else if (!enabled && isActive) {
        debug("deactivate.start", { id: module.id });
        ctx.errors.guard(
          `feature.deactivate.${module.id}`,
          () =>
          ctx.trace.span(`feature.deactivate.${module.id}`, () => {
            this.#active.get(module.id)?.dispose();
            this.#active.delete(module.id);
            module.deactivate?.(ctx);
          }),
          { context: { feature: module.id } },
        );
        debug("deactivate.complete", { id: module.id });
      }
    }
  }

  deactivateAll(): void {
    for (const [id, disposable] of this.#active) {
      try {
        disposable.dispose();
      } catch {
        /* ignore */
      }
      this.#active.delete(id);
    }
  }
}
