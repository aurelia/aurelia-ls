import * as vscode from "vscode";

export class ClientLogger {
  #channel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.#channel = vscode.window.createOutputChannel(channelName);
  }

  get channel(): vscode.OutputChannel {
    return this.#channel;
  }

  log(message: string) {
    this.#channel.appendLine(message);
  }

  info(message: string) {
    this.log(message);
  }

  warn(message: string) {
    this.log(`[warn] ${message}`);
  }

  error(message: string) {
    this.log(`[error] ${message}`);
  }
}
