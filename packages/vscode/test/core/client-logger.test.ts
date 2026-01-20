import { describe, test, expect } from "vitest";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("ClientLogger", () => {
  function createLogger(channelName = "Test") {
    const { vscode: stubVscode } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const logger = new ClientLogger(channelName, vscode);
    const channel = logger.channel as unknown as { lines: string[] };
    return { logger, channel };
  }

  test("creates output channel with given name", () => {
    const { logger } = createLogger("Aurelia");
    expect(logger.channel.name).toBe("Aurelia");
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

  test("debug is suppressed by default", () => {
    const { logger, channel } = createLogger();
    logger.debug("debug message");
    expect(channel.lines).toHaveLength(0);
  });

  test("child scope is included in output", () => {
    const { logger, channel } = createLogger();
    logger.child("commands").info("hello");
    expect(channel.lines.at(-1)).toBe("[INFO] [commands] hello");
  });
});
