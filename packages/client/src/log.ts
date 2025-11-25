import type { OutputChannel } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export class ClientLogger {
  #channel: OutputChannel;

  constructor(channelName: string, vscode: VscodeApi = getVscodeApi()) {
    this.#channel = vscode.window.createOutputChannel(channelName);
  }

  get channel(): OutputChannel {
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
