/**
 * Transform Package - Edit Tests
 *
 * Tests for source code editing utilities.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyEdits,
  applySingleEdit,
  replace,
  insert,
  del,
  deleteWithWhitespace,
  validateEdits,
} from "@aurelia-ls/transform";

describe("applySingleEdit", () => {
  describe("replace", () => {
    it("replaces text at span", () => {
      const source = "hello world";
      const result = applySingleEdit(source, replace({ start: 0, end: 5 }, "hi"));
      assert.strictEqual(result, "hi world");
    });

    it("replaces text in middle", () => {
      const source = "hello world";
      const result = applySingleEdit(source, replace({ start: 6, end: 11 }, "universe"));
      assert.strictEqual(result, "hello universe");
    });
  });

  describe("insert", () => {
    it("inserts at beginning", () => {
      const source = "world";
      const result = applySingleEdit(source, insert(0, "hello "));
      assert.strictEqual(result, "hello world");
    });

    it("inserts at end", () => {
      const source = "hello";
      const result = applySingleEdit(source, insert(5, " world"));
      assert.strictEqual(result, "hello world");
    });

    it("inserts in middle", () => {
      const source = "helloworld";
      const result = applySingleEdit(source, insert(5, " "));
      assert.strictEqual(result, "hello world");
    });
  });

  describe("delete", () => {
    it("deletes span", () => {
      const source = "hello world";
      const result = applySingleEdit(source, del({ start: 5, end: 11 }));
      assert.strictEqual(result, "hello");
    });
  });
});

describe("applyEdits", () => {
  it("applies multiple non-overlapping edits", () => {
    const source = "aaa bbb ccc";
    const edits = [
      replace({ start: 0, end: 3 }, "111"),
      replace({ start: 4, end: 7 }, "222"),
      replace({ start: 8, end: 11 }, "333"),
    ];
    const result = applyEdits(source, edits);
    assert.strictEqual(result, "111 222 333");
  });

  it("handles edits in reverse order", () => {
    const source = "aaa bbb ccc";
    const edits = [
      replace({ start: 8, end: 11 }, "333"),
      replace({ start: 4, end: 7 }, "222"),
      replace({ start: 0, end: 3 }, "111"),
    ];
    const result = applyEdits(source, edits);
    assert.strictEqual(result, "111 222 333");
  });

  it("handles mixed edit types", () => {
    const source = "hello world";
    const edits = [
      del({ start: 5, end: 6 }), // delete space
      insert(5, "-"),             // insert dash
    ];
    const result = applyEdits(source, edits);
    assert.strictEqual(result, "hello-world");
  });
});

describe("deleteWithWhitespace", () => {
  it("includes trailing whitespace", () => {
    const source = "hello   world";
    const edit = deleteWithWhitespace(source, { start: 5, end: 8 });
    assert.strictEqual(edit.type, "delete");
    if (edit.type === "delete") {
      // Should extend to include remaining whitespace
      assert.ok(edit.span.end >= 8);
    }
  });

  it("includes trailing newline", () => {
    const source = "hello\nworld";
    const edit = deleteWithWhitespace(source, { start: 0, end: 5 });
    assert.strictEqual(edit.type, "delete");
    if (edit.type === "delete") {
      assert.strictEqual(edit.span.end, 6); // includes newline
    }
  });
});

describe("validateEdits", () => {
  it("returns true for non-overlapping edits", () => {
    const edits = [
      replace({ start: 0, end: 5 }, "xxx"),
      replace({ start: 10, end: 15 }, "yyy"),
      replace({ start: 20, end: 25 }, "zzz"),
    ];
    assert.strictEqual(validateEdits(edits), true);
  });

  it("returns false for overlapping edits", () => {
    const edits = [
      replace({ start: 0, end: 10 }, "xxx"),
      replace({ start: 5, end: 15 }, "yyy"),
    ];
    assert.strictEqual(validateEdits(edits), false);
  });

  it("returns true for adjacent edits", () => {
    const edits = [
      replace({ start: 0, end: 5 }, "xxx"),
      replace({ start: 5, end: 10 }, "yyy"),
    ];
    assert.strictEqual(validateEdits(edits), true);
  });
});
