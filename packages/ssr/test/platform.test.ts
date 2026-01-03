/**
 * Platform Tests
 *
 * Unit tests for platform.ts functions:
 * - createServerPlatform: Creates JSDOM-based platform for SSR
 */

import { describe, it, expect } from "vitest";

import { createServerPlatform } from "@aurelia-ls/ssr";

// =============================================================================
// createServerPlatform - Request Context
// =============================================================================

describe("createServerPlatform", () => {
  describe("with request context", () => {
    it("sets document location from request URL", () => {
      const platform = createServerPlatform({
        request: {
          url: "/products/123",
        },
      });

      expect(platform.document.location.pathname).toBe("/products/123");
      expect(platform.document.location.href).toBe("http://localhost/products/123");
    });

    it("normalizes URL without leading slash", () => {
      const platform = createServerPlatform({
        request: {
          url: "products/123",
        },
      });

      expect(platform.document.location.pathname).toBe("/products/123");
    });

    it("adds base element for custom baseHref", () => {
      const platform = createServerPlatform({
        request: {
          url: "/products/123",
          baseHref: "/app/",
        },
      });

      const baseEl = platform.document.querySelector("base");
      expect(baseEl).not.toBeNull();
      expect(baseEl?.getAttribute("href")).toBe("/app/");
    });

    it("skips base element when baseHref is /", () => {
      const platform = createServerPlatform({
        request: {
          url: "/about",
          baseHref: "/",
        },
      });

      const baseEl = platform.document.querySelector("base");
      expect(baseEl).toBeNull();
    });

    it("handles URL with query parameters", () => {
      const platform = createServerPlatform({
        request: {
          url: "/search?q=aurelia&page=2",
        },
      });

      expect(platform.document.location.pathname).toBe("/search");
      expect(platform.document.location.search).toBe("?q=aurelia&page=2");
    });

    it("handles URL with hash", () => {
      const platform = createServerPlatform({
        request: {
          url: "/docs#installation",
        },
      });

      expect(platform.document.location.pathname).toBe("/docs");
      expect(platform.document.location.hash).toBe("#installation");
    });
  });

  describe("without request context", () => {
    it("uses default localhost URL", () => {
      const platform = createServerPlatform();

      expect(platform.document.location.href).toBe("http://localhost/");
      expect(platform.document.location.pathname).toBe("/");
    });

    it("creates document with head and body", () => {
      const platform = createServerPlatform();

      expect(platform.document.head).toBeDefined();
      expect(platform.document.head.tagName).toBe("HEAD");
      expect(platform.document.body).toBeDefined();
      expect(platform.document.body.tagName).toBe("BODY");
    });

    it("creates document that supports DOM operations", () => {
      const platform = createServerPlatform();

      const div = platform.document.createElement("div");
      div.textContent = "Test";
      platform.document.body.appendChild(div);

      expect(platform.document.body.innerHTML).toContain("Test");
    });
  });

  describe("with custom HTML", () => {
    it("uses provided HTML structure", () => {
      const platform = createServerPlatform({
        html: "<!DOCTYPE html><html><head><title>Custom</title></head><body></body></html>",
      });

      expect(platform.document.title).toBe("Custom");
    });

    it("preserves custom head elements", () => {
      const platform = createServerPlatform({
        html: '<!DOCTYPE html><html><head><meta name="description" content="Test"></head><body></body></html>',
      });

      const meta = platform.document.querySelector('meta[name="description"]');
      expect(meta?.getAttribute("content")).toBe("Test");
    });

    it("preserves custom body content", () => {
      const platform = createServerPlatform({
        html: "<!DOCTYPE html><html><head></head><body><div id='app'>Initial</div></body></html>",
      });

      const app = platform.document.getElementById("app");
      expect(app?.textContent).toBe("Initial");
    });
  });
});
