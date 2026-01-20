import { SimpleEmitter, type Listener } from "./events.js";
import type { DisposableLike } from "./disposables.js";

export interface PresentationState {
  diagnostics?: { count?: number; source?: string };
  workspace?: { resourceCount?: number; componentCount?: number; lastUpdated?: number };
  overlay?: { lastUri?: string; callCount?: number; diagCount?: number };
}

export class PresentationStore {
  #state: PresentationState = {};
  #emitter = new SimpleEmitter<PresentationState>();

  get current(): PresentationState {
    return this.#state;
  }

  update(patch: PresentationState): void {
    this.#state = {
      ...this.#state,
      ...patch,
    };
    this.#emitter.emit(this.#state);
  }

  onDidChange(listener: Listener<PresentationState>): DisposableLike {
    return this.#emitter.on(listener);
  }
}
