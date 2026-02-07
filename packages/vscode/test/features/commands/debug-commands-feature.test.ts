import { describe, test, expect } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { DebugCommandsFeature } from "../../../out/features/commands/debug-commands.js";
import { createTestConfig } from "../../helpers/test-helpers.js";

function createContext(options: {
  commands: boolean;
  debugCommands: boolean;
}): ClientContext {
  const config = createTestConfig({
    features: {
      commands: options.commands,
      debugCommands: options.debugCommands,
    },
  });

  return {
    config: {
      current: config,
    },
  } as unknown as ClientContext;
}

describe("DebugCommandsFeature", () => {
  test("requires both commands and debugCommands toggles", () => {
    expect(DebugCommandsFeature.isEnabled?.(createContext({ commands: true, debugCommands: true }))).toBe(true);
    expect(DebugCommandsFeature.isEnabled?.(createContext({ commands: true, debugCommands: false }))).toBe(false);
    expect(DebugCommandsFeature.isEnabled?.(createContext({ commands: false, debugCommands: true }))).toBe(false);
    expect(DebugCommandsFeature.isEnabled?.(createContext({ commands: false, debugCommands: false }))).toBe(false);
  });
});
