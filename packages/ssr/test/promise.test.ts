/**
 * Promise Template Controller SSR Tests
 *
 * Tests for promise.bind template controller in SSR context.
 * Promise branches: pending, then, catch
 *
 * Structure:
 * <div promise.bind="asyncValue">
 *   <template pending>Loading...</template>
 *   <template then="data">${data}</template>
 *   <template catch="err">${err.message}</template>
 * </div>
 *
 * Key behaviors:
 * - `pending` branch renders when promise is unresolved
 * - `then` branch renders with resolved value when promise resolves
 * - `catch` branch renders with error when promise rejects
 * - Alias bindings (then="data", catch="err") create scope overlays
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { createComponent, countOccurrences } from "./_helpers/test-utils.js";

// =============================================================================
// Basic Promise SSR Stability
// =============================================================================

// NOTE: Promise SSR rendering currently produces empty branch content.
// These tests verify the controller doesn't break SSR - the basic structure
// is preserved even if branch content isn't rendered.
// Full promise SSR rendering will be enabled when support is complete.

describe("Promise SSR: Stability", () => {
  // Verify promise template controller doesn't crash SSR
  it("SSR renders promise wrapper with hydration markers", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div class="promise-wrapper" promise.bind="p">
        <template then="data">\${data}</template>
      </div>`,
      { p: Promise.resolve("Hello Promise") },
    );

    const result = await compileAndRenderAot(TestApp);

    // Promise SSR renders the wrapper div with empty branch markers inside
    // Branch content is not rendered because promise hasn't resolved in SSR context
    expect(result.html).toBe(
      `<!--au--><!--au-start--><div class="promise-wrapper">\n        <!--au--><!--au-start--><!--au-end-->\n      </div><!--au-end-->`,
    );
  });

  it("SSR renders multi-branch promise structure", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div class="multi-branch" promise.bind="p">
        <template then="data">Success: \${data}</template>
        <template catch="err">Error: \${err}</template>
      </div>`,
      { p: Promise.resolve("Done") },
    );

    const result = await compileAndRenderAot(TestApp);

    // Parse to verify structure
    const dom = new JSDOM(result.html);
    const wrapper = dom.window.document.querySelector(".multi-branch");
    expect(wrapper).not.toBeNull();
    // Has hydration markers
    expect(result.html).toContain("<!--au--><!--au-start-->");
    expect(result.html).toContain("<!--au-end-->");
    dom.window.close();
  });

  it("SSR renders all-branches promise structure", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div class="full-promise" promise.bind="p">
        <template pending>Loading...</template>
        <template then="result">Got: \${result}</template>
        <template catch="err">Failed: \${err}</template>
      </div>`,
      { p: Promise.resolve("Result") },
    );

    const result = await compileAndRenderAot(TestApp);

    // Parse to verify structure - wrapper div present with class
    const dom = new JSDOM(result.html);
    const wrapper = dom.window.document.querySelector(".full-promise");
    expect(wrapper).not.toBeNull();
    dom.window.close();
  });

  it("SSR renders promise inside repeat with correct row count", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="item of items" class="item-row">
        <div class="item-promise" promise.bind="item.task">
          <template then="result">\${item.name}: \${result}</template>
        </div>
      </div>`,
      {
        items: [
          { name: "Task1", task: Promise.resolve("Done") },
          { name: "Task2", task: Promise.resolve("Complete") },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    // Parse to verify repeat produced exactly 2 rows
    const dom = new JSDOM(result.html);
    expect(dom.window.document.querySelectorAll(".item-row").length).toBe(2);
    expect(dom.window.document.querySelectorAll(".item-promise").length).toBe(2);
    dom.window.close();
  });

  it("SSR renders nested promise with outer wrapper", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div class="outer-promise" promise.bind="outer">
        <template then="innerP">
          <div class="inner-promise" promise.bind="innerP">
            <template then="val">Final: \${val}</template>
          </div>
        </template>
      </div>`,
      { outer: Promise.resolve(Promise.resolve("Nested")) },
    );

    const result = await compileAndRenderAot(TestApp);

    // Outer wrapper div is rendered with class
    const dom = new JSDOM(result.html);
    expect(dom.window.document.querySelector(".outer-promise")).not.toBeNull();
    // Has hydration markers
    expect(result.html).toContain("<!--au-->");
    dom.window.close();
  });
});

// =============================================================================
// Promise Rendering (currently skipped until SSR promise support is complete)
// =============================================================================

describe("Promise SSR: Full Rendering", () => {
  // AOT-PR-01: Promise with then branch
  it.skip("renders then branch with resolved value", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="p"><template then="data">\${data}</template></div>`,
      { p: Promise.resolve("Hello Promise") },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Hello Promise");
  });

  // AOT-PR-02: Promise with catch branch
  it.skip("renders catch branch with rejected error", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="p"><template catch="err">\${err.message}</template></div>`,
      { p: Promise.resolve("placeholder") },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Something went wrong");
  });

  // AOT-PR-03: Promise with then and catch branches
  it.skip("renders appropriate branch based on promise state", async () => {
    const ResolvedApp = createComponent(
      "test-app",
      `<div promise.bind="p">
        <template then="data" class="then-branch">\${data}</template>
        <template catch="err" class="catch-branch">\${err}</template>
      </div>`,
      { p: Promise.resolve("Success") },
    );

    const resolvedResult = await compileAndRenderAot(ResolvedApp);
    expect(resolvedResult.html).toContain("Success");
    expect(resolvedResult.html).not.toContain("catch-branch");
  });

  // AOT-PR-04: Promise with pending branch
  it.skip("renders pending branch for unresolved promise", async () => {
    let resolvePromise: (value: string) => void;
    const pendingPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="p"><template pending>Loading \${msg}...</template></div>`,
      { p: pendingPromise, msg: "data" },
    );

    try {
      const result = await compileAndRenderAot(TestApp);
      expect(result.html).toBeDefined();
    } finally {
      resolvePromise!("done");
    }
  });
});

// =============================================================================
// Promise with All Branches
// =============================================================================

describe("Promise SSR: Multiple Branches", () => {
  // AOT-PR-05: Promise with all three branches
  it.skip("renders all branch types correctly", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="p">
        <template pending class="pending-state">Loading...</template>
        <template then="result" class="then-state">\${result}</template>
        <template catch="error" class="catch-state">\${error}</template>
      </div>`,
      { p: Promise.resolve("Loaded data") },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Loaded data");
    // Pending and catch should not render for resolved promise
    expect(result.html).not.toContain(">Loading...<");
  });

  // Variant: rejected promise with all branches
  // NOTE: Skipped - would need rejected promise handling which isn't implemented for SSR
  it.skip("renders catch branch when promise rejects", async () => {
    // When enabled, this test will need a rejected promise
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="p">
        <template pending>Loading...</template>
        <template then="data">Got: \${data}</template>
        <template catch="err">Error: \${err.message}</template>
      </div>`,
      { p: Promise.resolve("placeholder") }, // Use resolved for now to avoid unhandled rejection
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Error: Network failure");
    expect(result.html).not.toContain("Got:");
    expect(result.html).not.toContain(">Loading...<");
  });
});

// =============================================================================
// Promise with Nesting
// =============================================================================

describe("Promise SSR: Nested Patterns", () => {
  // AOT-PR-06: Promise inside repeat
  it.skip("renders promise inside repeat", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="item of items">
        <div promise.bind="item.task" class="task">
          <template then="result">\${item.name}: \${result}</template>
        </div>
      </div>`,
      {
        items: [
          { name: "Task1", task: Promise.resolve("Done") },
          { name: "Task2", task: Promise.resolve("Complete") },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Task1: Done");
    expect(result.html).toContain("Task2: Complete");

    // Should have exactly 2 task divs
    const dom = new JSDOM(result.html);
    expect(dom.window.document.querySelectorAll(".task").length).toBe(2);
    dom.window.close();
  });

  // AOT-PR-07: Repeat inside promise then branch
  it.skip("renders repeat inside promise then branch", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="fetchItems">
        <template then="items">
          <ul repeat.for="item of items" class="item">\${item}</ul>
        </template>
      </div>`,
      { fetchItems: Promise.resolve(["Apple", "Banana", "Cherry"]) },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Apple");
    expect(result.html).toContain("Banana");
    expect(result.html).toContain("Cherry");

    // Should have exactly 3 items
    const dom = new JSDOM(result.html);
    expect(dom.window.document.querySelectorAll(".item").length).toBe(3);
    dom.window.close();
  });

  // AOT-PR-08: Nested promise (promise inside promise then)
  it.skip("renders nested promise", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="outer">
        <template then="innerP">
          <div promise.bind="innerP" class="inner">
            <template then="val">Final: \${val}</template>
          </div>
        </template>
      </div>`,
      { outer: Promise.resolve(Promise.resolve("Nested value")) },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Final: Nested value");
  });
});

// =============================================================================
// Promise with Bindings Inside Branches
// =============================================================================

describe("Promise SSR: Branch Content", () => {
  // Then branch with complex content
  it.skip("renders then branch with bindings inside", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="userPromise">
        <template then="user">
          <h1 class="username">\${user.name}</h1>
          <span class="email">\${user.email}</span>
          <span class="role" title.bind="user.role">\${user.role}</span>
        </template>
      </div>`,
      {
        userPromise: Promise.resolve({
          name: "John Doe",
          email: "john@example.com",
          role: "Admin",
        }),
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("john@example.com");
    expect(result.html).toContain("Admin");
    expect(result.html).toContain('title="Admin"');
  });

  // Catch branch with error details
  // NOTE: Skipped - would need rejected promise handling which isn't implemented for SSR
  it.skip("renders catch branch with error object access", async () => {
    // When enabled, this test will need a rejected promise
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="submitPromise">
        <template catch="err">
          <div class="error">
            <h2>Error \${err.code}</h2>
            <p>\${err.message}</p>
            <span>\${err.details}</span>
          </div>
        </template>
      </div>`,
      { submitPromise: Promise.resolve("placeholder") }, // Use resolved for now to avoid unhandled rejection
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Error 400");
    expect(result.html).toContain("Validation failed");
    expect(result.html).toContain("Invalid input");
  });

  // Pending branch with parent scope access
  it.skip("renders pending branch with parent scope bindings", async () => {
    // Use already-resolved promise to avoid hanging test
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="loadPromise">
        <template pending>
          <span class="loading">Loading \${resourceName}...</span>
        </template>
        <template then="data">\${data}</template>
      </div>`,
      {
        loadPromise: Promise.resolve("Data loaded"),
        resourceName: "users",
      },
    );

    const result = await compileAndRenderAot(TestApp);

    // Since promise resolves immediately, we expect then branch
    expect(result.html).toContain("Data loaded");
  });
});

// =============================================================================
// Promise AOT Compilation
// =============================================================================

describe("Promise SSR: AOT Compilation", () => {
  it("compiles promise template to instructions", () => {
    const template = `<div promise.bind="p">
      <template then="data">\${data}</template>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with 1 hydrateTemplateController
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0].length).toBe(1);
    expect(aot.instructions[0][0].type).toBe(2); // hydrateTemplateController
    expect(aot.instructions[0][0].res).toBe("promise");

    // Exactly 1 nested definition for the promise
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("promise_0");
  });

  it("compiles all three branches", () => {
    const template = `<div promise.bind="p">
      <template pending>Loading</template>
      <template then="data">\${data}</template>
      <template catch="err">\${err}</template>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 nested definition for the promise (branches are inside)
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("promise_0");
  });

  it("preserves markers for hydration", () => {
    const template = `<div promise.bind="p">
      <template then="val">\${val}</template>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");
  });
});

// =============================================================================
// Promise with If/Else Combinations
// =============================================================================

describe("Promise SSR: Combined with Other TCs", () => {
  it.skip("renders promise inside if.bind", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="showData">
        <div promise.bind="dataPromise" class="promise-container">
          <template then="data">\${data}</template>
        </div>
      </div>`,
      {
        showData: true,
        dataPromise: Promise.resolve("Visible data"),
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Visible data");
    expect(result.html).toContain('class="promise-container"');
  });

  it("skips promise when if.bind is false", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="showData">
        <div promise.bind="dataPromise" class="promise-container">
          <template then="data">\${data}</template>
        </div>
      </div>`,
      {
        showData: false,
        dataPromise: Promise.resolve("Hidden data"),
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Promise container doesn't exist because if.bind is false
    expect(doc.querySelector(".promise-container")).toBeNull();

    // No content from promise in the DOM at all
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain("Hidden data");

    dom.window.close();
  });

  it.skip("renders if inside promise then branch", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="userPromise">
        <template then="user">
          <span if.bind="user.isAdmin" class="admin-badge">Admin</span>
          <span if.bind="!user.isAdmin" class="user-badge">User</span>
          <span class="username">\${user.name}</span>
        </template>
      </div>`,
      {
        userPromise: Promise.resolve({ name: "Jane", isAdmin: true }),
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Jane");
    expect(result.html).toContain("Admin");
    expect(result.html).not.toContain(">User<");
  });
});

// =============================================================================
// Promise with Switch/Case Inside
// =============================================================================

describe("Promise SSR: Combined with Switch", () => {
  it.skip("renders switch inside promise then branch", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div promise.bind="statusPromise">
        <template then="status">
          <template switch.bind="status">
            <span case="success" class="status-success">All good!</span>
            <span case="warning" class="status-warning">Be careful</span>
            <span case="error" class="status-error">Something wrong</span>
            <span default-case class="status-unknown">Unknown status</span>
          </template>
        </template>
      </div>`,
      { statusPromise: Promise.resolve("warning") },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Be careful");
    expect(result.html).not.toContain("All good!");
    expect(result.html).not.toContain("Something wrong");
    expect(result.html).not.toContain("Unknown status");

    const dom = new JSDOM(result.html);
    expect(dom.window.document.querySelectorAll(".status-warning").length).toBe(1);
    dom.window.close();
  });
});
