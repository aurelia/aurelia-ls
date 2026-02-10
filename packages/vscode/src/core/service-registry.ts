import type { DisposableLike } from "./disposables.js";
import { toDisposable } from "./disposables.js";

export interface ServiceToken<T> {
  id: string;
  key: symbol;
}

export function createServiceToken<T>(id: string): ServiceToken<T> {
  return { id, key: Symbol(id) };
}

type ServiceEntry = {
  token: ServiceToken<unknown>;
  value: unknown;
  dispose?: () => void;
};

function isDisposable(value: unknown): value is DisposableLike {
  return Boolean(value && typeof (value as DisposableLike).dispose === "function");
}

function disposeValue(value: unknown, dispose?: () => void): void {
  if (dispose) {
    dispose();
    return;
  }
  if (isDisposable(value)) {
    value.dispose();
  }
}

export class ServiceRegistry implements DisposableLike {
  #entries = new Map<symbol, ServiceEntry>();
  #disposed = false;

  register<T>(
    token: ServiceToken<T>,
    value: T,
    options: { dispose?: () => void; override?: boolean } = {},
  ): DisposableLike {
    if (this.#disposed) {
      disposeValue(value, options.dispose);
      return toDisposable(() => {});
    }
    if (this.#entries.has(token.key)) {
      if (!options.override) {
        throw new Error(`Service already registered: ${token.id}`);
      }
      this.unregister(token);
    }

    this.#entries.set(token.key, {
      token: token as ServiceToken<unknown>,
      value,
      dispose: options.dispose,
    });

    return toDisposable(() => this.unregister(token));
  }

  unregister<T>(token: ServiceToken<T>): void {
    const entry = this.#entries.get(token.key);
    if (!entry) return;
    this.#entries.delete(token.key);
    disposeValue(entry.value, entry.dispose);
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.#entries.has(token.key);
  }

  get<T>(token: ServiceToken<T>): T {
    const entry = this.#entries.get(token.key);
    if (!entry) {
      throw new Error(`Service not registered: ${token.id}`);
    }
    return entry.value as T;
  }

  tryGet<T>(token: ServiceToken<T>): T | undefined {
    const entry = this.#entries.get(token.key);
    return entry?.value as T | undefined;
  }

  list(): ServiceToken<unknown>[] {
    return Array.from(this.#entries.values(), (entry) => entry.token);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const entries = Array.from(this.#entries.values());
    this.#entries.clear();
    for (const entry of entries) {
      disposeValue(entry.value, entry.dispose);
    }
  }
}
