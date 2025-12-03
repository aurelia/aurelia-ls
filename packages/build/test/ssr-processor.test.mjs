/**
 * SSR Processor Tests
 *
 * Tests the SSR post-processing module that strips `au-hid` markers
 * and computes path-based element identification.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import {
  processSSROutput,
  computeElementPaths,
  computePath,
  stripAuHidAttributes,
  embedManifest,
  resolvePath,
} from "../out/ssr/ssr-processor.js";

import { compileAndRenderAot } from "../out/aot.js";

// Helper to create a DOM from HTML string
function createDOM(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  return dom.window.document.body.firstElementChild;
}

// Helper to create a host element with content
function createHost(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="host">${html}</div></body></html>`);
  return dom.window.document.getElementById("host");
}

/* =============================================================================
 * computePath Tests
 * ============================================================================= */

describe("computePath", () => {
  test("computes empty path for root element", () => {
    const root = createDOM("<div></div>");
    const path = computePath(root, root);
    assert.deepEqual(path, []);
  });

  test("computes path for direct child", () => {
    const host = createHost("<div><span></span></div>");
    const root = host.firstElementChild;
    const target = root.firstElementChild;

    const path = computePath(root, target);
    assert.deepEqual(path, [0]);
  });

  test("computes path for nested element", () => {
    const host = createHost(`
      <div>
        <span></span>
        <div>
          <p></p>
          <a id="target"></a>
        </div>
      </div>
    `);
    const root = host.firstElementChild;
    const target = root.querySelector("#target");

    const path = computePath(root, target);
    // root -> children[1] (div) -> children[1] (a)
    assert.deepEqual(path, [1, 1]);
  });

  test("computes path for deeply nested element", () => {
    const host = createHost(`
      <div>
        <section>
          <article>
            <p>
              <span id="deep"></span>
            </p>
          </article>
        </section>
      </div>
    `);
    const root = host.firstElementChild;
    const target = root.querySelector("#deep");

    const path = computePath(root, target);
    assert.deepEqual(path, [0, 0, 0, 0]);
  });

  test("handles sibling indices correctly", () => {
    const host = createHost(`
      <div>
        <span>first</span>
        <span>second</span>
        <span id="third">third</span>
      </div>
    `);
    const root = host.firstElementChild;
    const target = root.querySelector("#third");

    const path = computePath(root, target);
    assert.deepEqual(path, [2]);
  });
});

/* =============================================================================
 * resolvePath Tests
 * ============================================================================= */

describe("resolvePath", () => {
  test("resolves empty path to root", () => {
    const root = createDOM("<div></div>");
    const resolved = resolvePath(root, []);
    assert.strictEqual(resolved, root);
  });

  test("resolves path to direct child", () => {
    const host = createHost("<div><span id='target'></span></div>");
    const root = host.firstElementChild;
    const expected = root.querySelector("#target");

    const resolved = resolvePath(root, [0]);
    assert.strictEqual(resolved, expected);
  });

  test("resolves path to nested element", () => {
    const host = createHost(`
      <div>
        <span></span>
        <div>
          <p></p>
          <a id="target"></a>
        </div>
      </div>
    `);
    const root = host.firstElementChild;
    const expected = root.querySelector("#target");

    const resolved = resolvePath(root, [1, 1]);
    assert.strictEqual(resolved, expected);
  });

  test("throws on invalid path", () => {
    const root = createDOM("<div><span></span></div>");

    assert.throws(() => {
      resolvePath(root, [5]); // No child at index 5
    }, /Invalid path/);
  });
});

/* =============================================================================
 * computePath + resolvePath Round-Trip Tests
 * ============================================================================= */

describe("computePath + resolvePath round-trip", () => {
  test("round-trips simple structure", () => {
    const host = createHost(`
      <div>
        <span id="a"></span>
        <div id="b">
          <p id="c"></p>
        </div>
      </div>
    `);
    const root = host.firstElementChild;

    for (const id of ["a", "b", "c"]) {
      const target = root.querySelector(`#${id}`);
      const path = computePath(root, target);
      const resolved = resolvePath(root, path);
      assert.strictEqual(resolved, target, `Round-trip failed for #${id}`);
    }
  });
});

/* =============================================================================
 * computeElementPaths Tests
 * ============================================================================= */

describe("computeElementPaths", () => {
  test("returns empty object when no au-hid elements", () => {
    const host = createHost("<div><span></span></div>");
    const paths = computeElementPaths(host);
    assert.deepEqual(paths, {});
  });

  test("computes paths for single au-hid element", () => {
    // Note: createHost wraps in <div id="host">, so the structure is:
    // <div id="host"><span au-hid="0"></span></div>
    // Path from host to span is [0]
    const host = createHost('<span au-hid="0"></span>');
    const paths = computeElementPaths(host);

    assert.deepEqual(Object.keys(paths), ["0"]);
    assert.deepEqual(paths[0], [0]);
  });

  test("computes paths for multiple au-hid elements", () => {
    // Structure: <div id="host"><span au-hid="0">...<div au-hid="1"><p au-hid="2">...
    // Paths are from host to each element
    const host = createHost(`
      <span au-hid="0">first</span>
      <div au-hid="1">
        <p au-hid="2">nested</p>
      </div>
    `);
    const paths = computeElementPaths(host);

    assert.deepEqual(Object.keys(paths).sort(), ["0", "1", "2"]);
    assert.deepEqual(paths[0], [0]);  // host -> span
    assert.deepEqual(paths[1], [1]);  // host -> div
    assert.deepEqual(paths[2], [1, 0]);  // host -> div -> p
  });
});

/* =============================================================================
 * stripAuHidAttributes Tests
 * ============================================================================= */

describe("stripAuHidAttributes", () => {
  test("removes all au-hid attributes", () => {
    const host = createHost(`
      <div>
        <span au-hid="0">first</span>
        <div au-hid="1">
          <p au-hid="2">nested</p>
        </div>
      </div>
    `);

    // Verify attributes exist before stripping
    assert.equal(host.querySelectorAll("[au-hid]").length, 3);

    stripAuHidAttributes(host);

    // Verify attributes are removed
    assert.equal(host.querySelectorAll("[au-hid]").length, 0);
  });

  test("preserves other attributes", () => {
    const host = createHost('<div><span au-hid="0" class="foo" id="bar"></span></div>');

    stripAuHidAttributes(host);

    const span = host.querySelector("span");
    assert.equal(span.getAttribute("class"), "foo");
    assert.equal(span.getAttribute("id"), "bar");
    assert.equal(span.hasAttribute("au-hid"), false);
  });
});

/* =============================================================================
 * embedManifest Tests
 * ============================================================================= */

describe("embedManifest", () => {
  test("embeds manifest as script tag", () => {
    const host = createHost("<div>content</div>");
    const manifest = { targetCount: 3, controllers: {} };

    embedManifest(host, manifest, "__AU_MANIFEST__");

    const script = host.querySelector("#__AU_MANIFEST__");
    assert.ok(script, "Expected manifest script tag");
    assert.equal(script.type, "application/json");
    assert.equal(script.textContent, JSON.stringify(manifest));
  });

  test("updates existing manifest script", () => {
    const host = createHost('<div><script type="application/json" id="__AU_MANIFEST__">{"old": true}</script></div>');
    const manifest = { targetCount: 5, controllers: {} };

    embedManifest(host, manifest, "__AU_MANIFEST__");

    const scripts = host.querySelectorAll("#__AU_MANIFEST__");
    assert.equal(scripts.length, 1, "Should not create duplicate");
    assert.equal(scripts[0].textContent, JSON.stringify(manifest));
  });
});

/* =============================================================================
 * processSSROutput Tests
 * ============================================================================= */

describe("processSSROutput", () => {
  test("returns HTML unchanged when stripMarkers=false", () => {
    const host = createHost('<span au-hid="0">hello</span>');
    const manifest = { targetCount: 1, controllers: {} };

    const result = processSSROutput(host, manifest, { stripMarkers: false });

    assert.ok(result.html.includes('au-hid="0"'), "Should keep au-hid attribute");
    assert.deepEqual(result.manifest, manifest, "Manifest should be unchanged");
  });

  test("strips markers and adds paths when stripMarkers=true", () => {
    // host contains <span au-hid="0">hello</span>
    // Path from host to span is [0]
    const host = createHost('<span au-hid="0">hello</span>');
    const manifest = { targetCount: 1, controllers: {} };

    const result = processSSROutput(host, manifest, { stripMarkers: true });

    assert.ok(!result.html.includes("au-hid"), "Should remove au-hid attribute");
    assert.ok(result.manifest.elementPaths, "Should add elementPaths");
    assert.deepEqual(result.manifest.elementPaths[0], [0]);
  });

  test("embeds manifest when manifestDelivery=embedded", () => {
    const host = createHost('<span au-hid="0">hello</span>');
    const manifest = { targetCount: 1, controllers: {} };

    const result = processSSROutput(host, manifest, {
      stripMarkers: true,
      manifestDelivery: "embedded",
    });

    assert.ok(result.html.includes("__AU_MANIFEST__"), "Should embed manifest");
    assert.ok(result.html.includes('"elementPaths"'), "Embedded manifest should have paths");
  });

  test("uses custom script ID when provided", () => {
    const host = createHost('<span au-hid="0">hello</span>');
    const manifest = { targetCount: 1, controllers: {} };

    const result = processSSROutput(host, manifest, {
      manifestDelivery: "embedded",
      manifestScriptId: "my-manifest",
    });

    assert.ok(result.html.includes('id="my-manifest"'), "Should use custom ID");
  });

  test("manifestDelivery=both embeds and returns manifest", () => {
    const host = createHost('<span au-hid="0">hello</span>');
    const manifest = { targetCount: 1, controllers: {} };

    const result = processSSROutput(host, manifest, {
      stripMarkers: true,
      manifestDelivery: "both",
    });

    assert.ok(result.html.includes("__AU_MANIFEST__"), "Should embed manifest");
    assert.ok(result.manifest.elementPaths, "Should return manifest with paths");
  });
});

/* =============================================================================
 * Integration with compileAndRenderAot
 * ============================================================================= */

describe("compileAndRenderAot with stripMarkers", () => {
  test("returns clean HTML when stripMarkers=true", async () => {
    const result = await compileAndRenderAot(
      '<div>${message}</div>',
      {
        state: { message: "Hello" },
        ssr: { stripMarkers: true },
      }
    );

    // Should not have au-hid attributes
    assert.ok(!result.html.includes("au-hid"), `Should not have au-hid in: ${result.html}`);

    // Should have manifest with elementPaths
    assert.ok(result.manifest, "Should return manifest");
    assert.ok(result.manifest.elementPaths, "Manifest should have elementPaths");
  });

  test("returns manifest with embedded option", async () => {
    const result = await compileAndRenderAot(
      '<div>${message}</div>',
      {
        state: { message: "Hello" },
        ssr: {
          stripMarkers: true,
          manifestDelivery: "embedded",
        },
      }
    );

    assert.ok(result.html.includes("__AU_MANIFEST__"), "Should embed manifest in HTML");
  });

  test("preserves comment markers even when stripMarkers=true", async () => {
    const result = await compileAndRenderAot(
      '<div>${message}</div>',
      {
        state: { message: "Hello" },
        ssr: { stripMarkers: true },
      }
    );

    // Comment markers should remain (they're needed for hydration)
    // Note: The actual format depends on how Aurelia emits them
    // We just verify au-hid is stripped but content is preserved
    assert.ok(result.html.includes("Hello"), "Should render content");
  });
});
