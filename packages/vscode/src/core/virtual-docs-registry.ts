import type { ExtensionContext } from "vscode";
import type { VscodeApi } from "../vscode-api.js";
import { VirtualDocProvider } from "../virtual-docs.js";
import type { DisposableLike } from "./disposables.js";

export class VirtualDocRegistry {
  #vscode: VscodeApi;
  #providers = new Map<string, VirtualDocProvider>();

  constructor(vscode: VscodeApi) {
    this.#vscode = vscode;
  }

  getProvider(scheme: string): VirtualDocProvider | undefined {
    return this.#providers.get(scheme);
  }

  registerProvider(context: ExtensionContext, scheme: string, provider: VirtualDocProvider): DisposableLike {
    this.#providers.set(scheme, provider);
    const disposable = this.#vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
    context.subscriptions.push(disposable);
    return disposable;
  }

  ensureProvider(context: ExtensionContext, scheme: string): VirtualDocProvider {
    const existing = this.#providers.get(scheme);
    if (existing) return existing;
    const provider = new VirtualDocProvider(this.#vscode);
    this.registerProvider(context, scheme, provider);
    return provider;
  }
}
