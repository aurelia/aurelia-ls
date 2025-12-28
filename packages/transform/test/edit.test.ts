/**
 * Transform Package - Edit Tests
 *
 * Tests for source code editing utilities.
 */

import { describe, it, expect } from "vitest";
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
      expect(result).toBe("hi world");
    });

    it("replaces text in middle", () => {
      const source = "hello world";
      const result = applySingleEdit(source, replace({ start: 6, end: 11 }, "universe"));
      expect(result).toBe("hello universe");
    });
  });

  describe("insert", () => {
    it("inserts at beginning", () => {
      const source = "world";
      const result = applySingleEdit(source, insert(0, "hello "));
      expect(result).toBe("hello world");
    });

    it("inserts at end", () => {
      const source = "hello";
      const result = applySingleEdit(source, insert(5, " world"));
      expect(result).toBe("hello world");
    });

    it("inserts in middle", () => {
      const source = "helloworld";
      const result = applySingleEdit(source, insert(5, " "));
      expect(result).toBe("hello world");
    });
  });

  describe("delete", () => {
    it("deletes span", () => {
      const source = "hello world";
      const result = applySingleEdit(source, del({ start: 5, end: 11 }));
      expect(result).toBe("hello");
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
    expect(result).toBe("111 222 333");
  });

  it("handles edits in reverse order", () => {
    const source = "aaa bbb ccc";
    const edits = [
      replace({ start: 8, end: 11 }, "333"),
      replace({ start: 4, end: 7 }, "222"),
      replace({ start: 0, end: 3 }, "111"),
    ];
    const result = applyEdits(source, edits);
    expect(result).toBe("111 222 333");
  });

  it("handles mixed edit types", () => {
    const source = "hello world";
    const edits = [
      del({ start: 5, end: 6 }), // delete space
      insert(5, "-"),             // insert dash
    ];
    const result = applyEdits(source, edits);
    expect(result).toBe("hello-world");
  });
});

describe("deleteWithWhitespace", () => {
  it("includes trailing whitespace", () => {
    const source = "hello   world";
    const edit = deleteWithWhitespace(source, { start: 5, end: 8 });
    expect(edit.type).toBe("delete");
    if (edit.type === "delete") {
      // Should extend to include remaining whitespace
      expect(edit.span.end >= 8).toBe(true);
    }
  });

  it("includes trailing newline", () => {
    const source = "hello\nworld";
    const edit = deleteWithWhitespace(source, { start: 0, end: 5 });
    expect(edit.type).toBe("delete");
    if (edit.type === "delete") {
      expect(edit.span.end).toBe(6); // includes newline
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
    expect(validateEdits(edits)).toBe(true);
  });

  it("returns false for overlapping edits", () => {
    const edits = [
      replace({ start: 0, end: 10 }, "xxx"),
      replace({ start: 5, end: 15 }, "yyy"),
    ];
    expect(validateEdits(edits)).toBe(false);
  });

  it("returns true for adjacent edits", () => {
    const edits = [
      replace({ start: 0, end: 5 }, "xxx"),
      replace({ start: 5, end: 10 }, "yyy"),
    ];
    expect(validateEdits(edits)).toBe(true);
  });
});
