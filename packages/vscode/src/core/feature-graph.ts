import { combineDisposables, type DisposableLike } from "./disposables.js";
import { SimpleEmitter, type Listener } from "./events.js";
import type { ClientContext } from "./context.js";

export interface FeatureModule {
  id: string;
  requires?: string[];
  isEnabled?: (ctx: ClientContext) => boolean;
  isAvailable?: (ctx: ClientContext) => boolean;
  activate: (ctx: ClientContext) =>
    | void
    | DisposableLike
    | DisposableLike[]
    | Promise<void | DisposableLike | DisposableLike[]>;
  deactivate?: (ctx: ClientContext) => void;
}

export type FeatureState = "inactive" | "active" | "disabled" | "blocked" | "unavailable" | "failed";

export interface FeatureStatus {
  id: string;
  state: FeatureState;
  reason?: string;
  missing?: string[];
  error?: unknown;
  updatedAt: number;
}

export class FeatureGraph {
  #modules = new Map<string, FeatureModule>();
  #active = new Map<string, DisposableLike>();
  #statuses = new Map<string, FeatureStatus>();
  #emitter = new SimpleEmitter<FeatureStatus[]>();
  #overrides = new Set<string>();
  #reconciling = false;
  #pending = false;

  register(...modules: FeatureModule[]): void {
    for (const module of modules) {
      if (this.#modules.has(module.id)) {
        this.#overrides.add(module.id);
      }
      this.#modules.set(module.id, module);
    }
  }

  getStatus(id: string): FeatureStatus | undefined {
    return this.#statuses.get(id);
  }

  listStatuses(): FeatureStatus[] {
    return Array.from(this.#statuses.values());
  }

  onDidChange(listener: Listener<FeatureStatus[]>): DisposableLike {
    return this.#emitter.on(listener);
  }

  async activateAll(ctx: ClientContext): Promise<void> {
    await this.reconcile(ctx);
  }

  async reconcile(ctx: ClientContext): Promise<void> {
    if (this.#reconciling) {
      this.#pending = true;
      return;
    }
    this.#reconciling = true;

    try {
      const debug = ctx.debug.channel("features");
      if (this.#overrides.size > 0) {
        debug("register.override", { ids: Array.from(this.#overrides) });
        this.#overrides.clear();
      }

      for (const id of Array.from(this.#active.keys())) {
        if (!this.#modules.has(id)) {
          this.#deactivate(ctx, id, this.#active.get(id));
        }
      }

      const { order, cycles } = resolveOrder(this.#modules);
      const nextStatuses = new Map<string, FeatureStatus>();

      for (const module of order) {
        const now = Date.now();
        if (cycles.has(module.id)) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "blocked",
            reason: "cycle",
            updatedAt: now,
          });
          continue;
        }

        const enabled = evaluateFlag(ctx, module, "enabled", module.isEnabled);
        if (!enabled.ok) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "failed",
            reason: "enabled",
            error: enabled.error,
            updatedAt: now,
          });
          continue;
        }
        if (!enabled.value) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "disabled",
            updatedAt: now,
          });
          continue;
        }

        const available = evaluateFlag(ctx, module, "available", module.isAvailable);
        if (!available.ok) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "failed",
            reason: "available",
            error: available.error,
            updatedAt: now,
          });
          continue;
        }
        if (!available.value) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "unavailable",
            updatedAt: now,
          });
          continue;
        }

        const missing = (module.requires ?? []).filter((dep) => !this.#active.has(dep));
        if (missing.length > 0) {
          this.#deactivate(ctx, module.id, this.#active.get(module.id));
          nextStatuses.set(module.id, {
            id: module.id,
            state: "blocked",
            reason: "missing-deps",
            missing,
            updatedAt: now,
          });
          continue;
        }

        if (!this.#active.has(module.id)) {
          debug("activate.start", { id: module.id });
          ctx.logger.info(`[features] activating: ${module.id}`);
          const result = await ctx.errors.capture(
            `feature.activate.${module.id}`,
            () => ctx.trace.spanAsync(`feature.activate.${module.id}`, async () => Promise.resolve(module.activate(ctx))),
            { context: { feature: module.id } },
          );
          if (!result.ok) {
            debug("activate.failed", { id: module.id });
            ctx.logger.info(`[features] FAILED to activate: ${module.id}`);
            nextStatuses.set(module.id, {
              id: module.id,
              state: "failed",
              reason: "activate",
              updatedAt: now,
            });
            continue;
          }
          const activation = result.value;
          const disposable = activation
            ? Array.isArray(activation)
              ? combineDisposables(activation)
              : activation
            : { dispose: () => {} };
          this.#active.set(module.id, disposable);
          debug("activate.complete", { id: module.id });
          ctx.logger.info(`[features] activated: ${module.id}`);
        }

        nextStatuses.set(module.id, {
          id: module.id,
          state: "active",
          updatedAt: now,
        });
      }

      this.#statuses = nextStatuses;
      this.#emitter.emit(Array.from(nextStatuses.values()));
    } finally {
      this.#reconciling = false;
      if (this.#pending) {
        this.#pending = false;
        await this.reconcile(ctx);
      }
    }
  }

  deactivateAll(ctx: ClientContext): void {
    for (const [id, disposable] of this.#active) {
      this.#deactivate(ctx, id, disposable);
      this.#statuses.set(id, {
        id,
        state: "inactive",
        updatedAt: Date.now(),
      });
    }
  }

  #deactivate(ctx: ClientContext, id: string, disposable?: DisposableLike): void {
    if (!disposable) return;
    const module = this.#modules.get(id);
    ctx.errors.guard(
      `feature.deactivate.${id}`,
      () =>
        ctx.trace.span(`feature.deactivate.${id}`, () => {
          disposable.dispose();
          this.#active.delete(id);
          module?.deactivate?.(ctx);
        }),
      { context: { feature: id } },
    );
  }
}

function resolveOrder(modules: Map<string, FeatureModule>): { order: FeatureModule[]; cycles: Set<string> } {
  const orderHint = Array.from(modules.values());
  const incoming = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();

  for (const module of orderHint) {
    const deps = (module.requires ?? []).filter((dep) => modules.has(dep));
    incoming.set(module.id, deps.length);
    for (const dep of deps) {
      if (!dependents.has(dep)) {
        dependents.set(dep, new Set());
      }
      dependents.get(dep)?.add(module.id);
    }
  }

  const queue: string[] = [];
  for (const [id, count] of incoming) {
    if (count === 0) queue.push(id);
  }

  const ordered: string[] = [];
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    ordered.push(id);
    const next = dependents.get(id);
    if (!next) continue;
    for (const depId of next) {
      const nextCount = (incoming.get(depId) ?? 0) - 1;
      incoming.set(depId, nextCount);
      if (nextCount === 0) queue.push(depId);
    }
  }

  const cycles = new Set<string>();
  if (ordered.length !== orderHint.length) {
    const orderedSet = new Set(ordered);
    for (const module of orderHint) {
      if (!orderedSet.has(module.id)) {
        cycles.add(module.id);
        ordered.push(module.id);
      }
    }
  }

  return {
    order: ordered.map((id) => modules.get(id)).filter((module): module is FeatureModule => Boolean(module)),
    cycles,
  };
}

function evaluateFlag(
  ctx: ClientContext,
  module: FeatureModule,
  name: "enabled" | "available",
  fn?: (ctx: ClientContext) => boolean,
): { ok: true; value: boolean } | { ok: false; error: unknown } {
  if (!fn) return { ok: true, value: true };
  try {
    return { ok: true, value: Boolean(fn(ctx)) };
  } catch (err) {
    ctx.errors.report(err, `feature.${name}.${module.id}`, { context: { feature: module.id } });
    return { ok: false, error: err };
  }
}
