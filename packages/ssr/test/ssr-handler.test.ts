/**
 * SSR Handler Tests
 *
 * Tests for the createSSRHandler factory function.
 */

import { describe, it, expect } from "vitest";

import {
  createSSRHandler,
  isSSRHandler,
} from "@aurelia-ls/ssr";

// Mock component class with $au definition
class MockApp {
  static $au = {
    type: "custom-element",
    name: "mock-app",
    template: "<div>Hello SSR</div>",
    dependencies: [],
    bindables: {},
    containerless: false,
    shadowOptions: null,
    hasSlots: false,
    enhance: false,
    processContent: null,
  };
}

class MockAbout {
  static $au = {
    type: "custom-element",
    name: "mock-about",
    template: "<div>About Page</div>",
    dependencies: [],
    bindables: {},
    containerless: false,
    shadowOptions: null,
    hasSlots: false,
    enhance: false,
    processContent: null,
  };
}

describe("SSR Handler", () => {
  describe("createSSRHandler", () => {
    it("creates a handler with required config", () => {
      const handler = createSSRHandler({
        root: MockApp,
      });

      expect(handler).toBeTruthy();
      expect(typeof handler.render).toBe("function");
      expect(typeof handler.renderMany).toBe("function");
      expect(handler.config).toBeTruthy();
    });

    it("applies default values", () => {
      const handler = createSSRHandler({
        root: MockApp,
      });

      expect(handler.config.components).toEqual([]);
      expect(handler.config.baseHref).toBe("/");
      expect(handler.config.stripMarkers).toBe(false);
      expect(handler.config.shell).toContain("<!DOCTYPE html>");
    });

    it("accepts custom configuration", () => {
      const customShell = "<!DOCTYPE html><html><body><!--ssr-outlet--></body></html>";
      const handler = createSSRHandler({
        root: MockApp,
        components: [MockAbout],
        baseHref: "/app/",
        stripMarkers: true,
        shell: customShell,
      });

      expect(handler.config.components).toEqual([MockAbout]);
      expect(handler.config.baseHref).toBe("/app/");
      expect(handler.config.stripMarkers).toBe(true);
      expect(handler.config.shell).toBe(customShell);
    });
  });

  describe("isSSRHandler", () => {
    it("returns true for valid handler", () => {
      const handler = createSSRHandler({ root: MockApp });
      expect(isSSRHandler(handler)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isSSRHandler(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSSRHandler(undefined)).toBe(false);
    });

    it("returns false for plain object", () => {
      expect(isSSRHandler({})).toBe(false);
    });

    it("returns false for object with only render", () => {
      expect(isSSRHandler({ render: () => {} })).toBe(false);
    });

    it("returns false for object with non-function render", () => {
      expect(
        isSSRHandler({ render: "not a function", renderMany: () => {} })
      ).toBe(false);
    });
  });

  describe("handler.render", () => {
    it("renders a URL to HTML", async () => {
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const result = await handler.render("/");

      expect(result.url).toBe("/");
      expect(result.html).toBeTruthy();
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.manifest).toBeTruthy();
    });

    it("includes hydration script in output", async () => {
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const result = await handler.render("/about");

      expect(result.html).toContain("__AU_SSR_SCOPE__");
    });
  });

  describe("handler.renderMany", () => {
    it("renders multiple URLs", async () => {
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const urls = ["/", "/about", "/contact"];
      const results = [];

      for await (const result of handler.renderMany(urls)) {
        results.push(result);
      }

      expect(results.length).toBe(3);
      expect(results[0].url).toBe("/");
      expect(results[1].url).toBe("/about");
      expect(results[2].url).toBe("/contact");
    });

    it("continues on error", async () => {
      // Create a handler that might error
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const urls = ["/", "/about"];
      const results = [];

      for await (const result of handler.renderMany(urls)) {
        results.push(result);
      }

      // Should have results for all URLs (even if some errored)
      expect(results.length).toBe(2);
    });
  });
});
