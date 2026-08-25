import type { ClientContext } from "./context.js";
import type { Disposable } from "vscode";

export type OwnContribution = <T extends Disposable>(contribution: T) => T;

/** One explicitly ordered client-owned product surface. */
export interface ClientFeature {
  readonly id: string;
  activate(ctx: ClientContext, own: OwnContribution): void | Promise<void>;
}
