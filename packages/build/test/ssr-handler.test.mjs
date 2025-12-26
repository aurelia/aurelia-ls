/**
 * SSR Handler Tests
 *
 * Tests for the createSSRHandler factory function.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  createSSRHandler,
  isSSRHandler,
} from "../out/ssr/handler.js";

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

      assert.ok(handler, "should create handler");
      assert.strictEqual(typeof handler.render, "function", "should have render method");
      assert.strictEqual(typeof handler.renderMany, "function", "should have renderMany method");
      assert.ok(handler.config, "should have config");
    });

    it("applies default values", () => {
      const handler = createSSRHandler({
        root: MockApp,
      });

      assert.deepStrictEqual(handler.config.components, []);
      assert.strictEqual(handler.config.baseHref, "/");
      assert.strictEqual(handler.config.stripMarkers, false);
      assert.ok(handler.config.shell.includes("<!DOCTYPE html>"));
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

      assert.deepStrictEqual(handler.config.components, [MockAbout]);
      assert.strictEqual(handler.config.baseHref, "/app/");
      assert.strictEqual(handler.config.stripMarkers, true);
      assert.strictEqual(handler.config.shell, customShell);
    });
  });

  describe("isSSRHandler", () => {
    it("returns true for valid handler", () => {
      const handler = createSSRHandler({ root: MockApp });
      assert.strictEqual(isSSRHandler(handler), true);
    });

    it("returns false for null", () => {
      assert.strictEqual(isSSRHandler(null), false);
    });

    it("returns false for undefined", () => {
      assert.strictEqual(isSSRHandler(undefined), false);
    });

    it("returns false for plain object", () => {
      assert.strictEqual(isSSRHandler({}), false);
    });

    it("returns false for object with only render", () => {
      assert.strictEqual(isSSRHandler({ render: () => {} }), false);
    });

    it("returns false for object with non-function render", () => {
      assert.strictEqual(
        isSSRHandler({ render: "not a function", renderMany: () => {} }),
        false
      );
    });
  });

  describe("handler.render", () => {
    it("renders a URL to HTML", async () => {
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const result = await handler.render("/");

      assert.strictEqual(result.url, "/");
      assert.ok(result.html, "should return HTML");
      assert.ok(result.html.includes("<!DOCTYPE html>"), "should include shell");
      assert.ok(result.manifest, "should return manifest");
    });

    it("includes hydration script in output", async () => {
      const handler = createSSRHandler({
        root: MockApp,
        shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      });

      const result = await handler.render("/about");

      assert.ok(
        result.html.includes("__AU_SSR_SCOPE__"),
        "should include hydration data"
      );
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

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].url, "/");
      assert.strictEqual(results[1].url, "/about");
      assert.strictEqual(results[2].url, "/contact");
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
      assert.strictEqual(results.length, 2);
    });
  });
});
