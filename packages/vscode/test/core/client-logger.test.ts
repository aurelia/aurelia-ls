import { describe, test, expect } from "vitest";
import type { LogOutputChannel } from "vscode";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("ClientLogger", () => {
  function createLogger(channelName = "Test") {
    const { vscode: stubVscode } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const outputChannel = vscode.window.createOutputChannel(channelName, { log: true });
    const logger = new ClientLogger(outputChannel);
    const channel = outputChannel as LogOutputChannel & { lines: string[] };
    return { logger, channel };
  }

  test("creates output channel with given name", () => {
    const { channel } = createLogger("Aurelia");
    expect(channel.name).toBe("Aurelia");
  });

  test("log writes INFO line", () => {
    const { logger, channel } = createLogger();
    logger.log("hello world");
    expect(channel.lines.at(-1)).toBe("[INFO] hello world");
  });

  test("warn and error include level headers", () => {
    const { logger, channel } = createLogger();
    logger.warn("warning message");
    logger.error("error message");
    expect(channel.lines[0]).toBe("[WARN] warning message");
    expect(channel.lines[1]).toBe("[ERROR] error message");
  });

  test("delegates debug filtering to the native log channel", () => {
    const { logger, channel } = createLogger();
    logger.debug("debug message");
    expect(channel.lines).toEqual(["[DEBUG] debug message"]);
  });

  test("child scope is included in output", () => {
    const { logger, channel } = createLogger();
    logger.child("commands").info("hello");
    expect(channel.lines.at(-1)).toBe("[INFO] [commands] hello");
  });
});
