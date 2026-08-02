import type { ClientContext } from "./context.js";
import type { DisposableLike } from "./disposables.js";

/** One explicitly ordered client-owned product surface. */
export interface ClientFeature {
  readonly id: string;
  activate(ctx: ClientContext):
    | void
    | DisposableLike
    | readonly DisposableLike[]
    | Promise<void | DisposableLike | readonly DisposableLike[]>;
}
