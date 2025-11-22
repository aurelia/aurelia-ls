import * as vscode from "vscode";

export class VirtualDocProvider implements vscode.TextDocumentContentProvider {
  static scheme = "aurelia-overlay";
  #cache = new Map<string, string>();
  #emitter = new vscode.EventEmitter<vscode.Uri>();

  provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
    return this.#cache.get(uri.toString()) ?? "";
  }

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this.#emitter.event;
  }

  update(uri: vscode.Uri, content: string) {
    this.#cache.set(uri.toString(), content);
    this.#emitter.fire(uri);
  }

  makeUri(label: string): vscode.Uri {
    return vscode.Uri.parse(`${VirtualDocProvider.scheme}:${label}`);
  }
}
