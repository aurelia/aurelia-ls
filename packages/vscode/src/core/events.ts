import { toDisposable, type DisposableLike } from "./disposables.js";

export type Listener<T> = (value: T) => void;

export class SimpleEmitter<T> {
  #listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): DisposableLike {
    this.#listeners.add(listener);
    return toDisposable(() => this.#listeners.delete(listener));
  }

  emit(value: T): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(value);
      } catch {
        /* ignore */
      }
    }
  }
}
