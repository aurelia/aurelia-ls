export interface DisposableLike {
  dispose(): void;
}

export function toDisposable(fn: () => void): DisposableLike {
  return { dispose: fn };
}

export class DisposableStore implements DisposableLike {
  #items: DisposableLike[] = [];
  #disposed = false;

  add(item?: DisposableLike | null): DisposableLike {
    if (!item) return toDisposable(() => {});
    if (this.#disposed) {
      item.dispose();
      return item;
    }
    this.#items.push(item);
    return item;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const item of this.#items.splice(0, this.#items.length)) {
      try {
        item.dispose();
      } catch {
        /* ignore */
      }
    }
  }
}

export function combineDisposables(items: DisposableLike[]): DisposableLike {
  return toDisposable(() => {
    for (const item of items) {
      try {
        item.dispose();
      } catch {
        /* ignore */
      }
    }
  });
}
