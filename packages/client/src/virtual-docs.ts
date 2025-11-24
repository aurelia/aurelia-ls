import type { Event, EventEmitter, TextDocumentContentProvider, Uri } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export class VirtualDocProvider implements TextDocumentContentProvider {
  static scheme = "aurelia-overlay";
  #cache = new Map<string, string>();
  #emitter: EventEmitter<Uri>;

  constructor(vscode: VscodeApi = getVscodeApi()) {
    this.#emitter = new vscode.EventEmitter();
  }

  provideTextDocumentContent(uri: Uri): string | Thenable<string> {
    return this.#cache.get(uri.toString()) ?? "";
  }

  get onDidChange(): Event<Uri> {
    return this.#emitter.event;
  }

  update(uri: Uri, content: string) {
    this.#cache.set(uri.toString(), content);
    this.#emitter.fire(uri);
  }

  makeUri(label: string, vscode: VscodeApi = getVscodeApi()): Uri {
    return vscode.Uri.parse(`${VirtualDocProvider.scheme}:${label}`);
  }
}
