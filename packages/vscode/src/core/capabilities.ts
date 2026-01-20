import type { DisposableLike } from "./disposables.js";
import { SimpleEmitter, type Listener } from "./events.js";

export interface AureliaCapabilities {
  version?: string;
  features?: Record<string, boolean>;
  data?: Record<string, unknown>;
}

export class CapabilityStore {
  #current: AureliaCapabilities = {};
  #emitter = new SimpleEmitter<AureliaCapabilities>();

  get current(): AureliaCapabilities {
    return this.#current;
  }

  set(next: AureliaCapabilities): void {
    this.#current = next;
    this.#emitter.emit(this.#current);
  }

  onDidChange(listener: Listener<AureliaCapabilities>): DisposableLike {
    return this.#emitter.on(listener);
  }
}
