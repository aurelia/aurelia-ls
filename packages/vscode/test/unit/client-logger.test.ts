/**
 * Unit tests for ClientLogger.
 */
import { describe, test, expect } from "vitest";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("ClientLogger", () => {
  function createLogger(channelName = "Test") {
    const { vscode: stubVscode } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const logger = new ClientLogger(channelName, vscode);
    // Get the channel from the stub
    const channel = logger.channel as unknown as { lines: string[] };
    return { logger, channel };
  }

  test("creates output channel with given name", () => {
    const { logger } = createLogger("Aurelia");
    expect(logger.channel.name).toBe("Aurelia");
  });

  test("log appends message to channel", () => {
    const { logger, channel } = createLogger();

    logger.log("hello world");

    expect(channel.lines).toContain("hello world");
  });

  test("info delegates to log", () => {
    const { logger, channel } = createLogger();

    logger.info("info message");

    expect(channel.lines).toContain("info message");
  });

  test("warn prefixes message with [warn]", () => {
    const { logger, channel } = createLogger();

    logger.warn("warning message");

    expect(channel.lines).toContain("[warn] warning message");
  });

  test("error prefixes message with [error]", () => {
    const { logger, channel } = createLogger();

    logger.error("error message");

    expect(channel.lines).toContain("[error] error message");
  });

  test("multiple messages accumulate in order", () => {
    const { logger, channel } = createLogger();

    logger.info("first");
    logger.warn("second");
    logger.error("third");

    expect(channel.lines).toEqual(["first", "[warn] second", "[error] third"]);
  });
});
