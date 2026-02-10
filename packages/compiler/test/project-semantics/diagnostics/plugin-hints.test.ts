import { describe, it, expect } from "vitest";
import {
  lookupElementPluginHint,
  lookupAttributePluginHint,
  formatPluginHintMessage,
} from "@aurelia-ls/compiler";

describe("Plugin Hints", () => {
  describe("lookupElementPluginHint", () => {
    it("returns hint for au-viewport (router element)", () => {
      const result = lookupElementPluginHint("au-viewport");

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.hint.package).toBe("@aurelia/router");
        expect(result.hint.suggestedRegistration).toBe("RouterConfiguration");
      }
    });

    it("returns not found for core elements without package", () => {
      const result = lookupElementPluginHint("au-compose");

      expect(result.found).toBe(false);
    });

    it("returns not found for unknown elements", () => {
      const result = lookupElementPluginHint("unknown-element");

      expect(result.found).toBe(false);
    });
  });

  describe("lookupAttributePluginHint", () => {
    it("returns hint for load attribute (router attribute)", () => {
      const result = lookupAttributePluginHint("load");

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.hint.package).toBe("@aurelia/router");
        expect(result.hint.suggestedRegistration).toBe("RouterConfiguration");
      }
    });

    it("returns hint for href attribute (router attribute)", () => {
      const result = lookupAttributePluginHint("href");

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.hint.package).toBe("@aurelia/router");
      }
    });

    it("returns not found for core attributes without package", () => {
      const result = lookupAttributePluginHint("focus");

      expect(result.found).toBe(false);
    });

    it("returns not found for unknown attributes", () => {
      const result = lookupAttributePluginHint("unknown-attr");

      expect(result.found).toBe(false);
    });
  });

  describe("formatPluginHintMessage", () => {
    it("formats message with package and registration suggestion", () => {
      const message = formatPluginHintMessage({
        package: "@aurelia/router",
        suggestedRegistration: "RouterConfiguration",
      });

      expect(message).toBe("Requires @aurelia/router. Register RouterConfiguration.");
    });

    it("formats message without registration suggestion", () => {
      const message = formatPluginHintMessage({
        package: "@aurelia/some-plugin",
      });

      expect(message).toBe("Requires @aurelia/some-plugin.");
    });
  });
});
