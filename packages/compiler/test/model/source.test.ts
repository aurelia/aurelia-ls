import path from "node:path";
import { expect, test } from "vitest";

import { resolveSourceFile, toSourceFileId, normalizePathForId } from "../../src/model/index.js";

test("resolveSourceFile keeps SourceFileId/hashKey stable for absolute input across cwd changes", () => {
  const root = path.resolve(path.sep, "repo");
  const absolute = path.join(root, "src", "app.html");
  const fromRoot = resolveSourceFile(absolute, root);
  const fromNested = resolveSourceFile(absolute, path.join(root, "packages"));

  expect(fromRoot.id).toBe(toSourceFileId(absolute));
  expect(fromNested.id).toBe(toSourceFileId(absolute));
  expect(fromRoot.hashKey).toBe(normalizePathForId(absolute));
  expect(fromNested.hashKey).toBe(normalizePathForId(absolute));
});

test("resolveSourceFile canonicalizes relative input to the same absolute identity", () => {
  const root = path.resolve(path.sep, "repo");
  const relative = path.join("src", "component.html");
  const absolute = path.join(root, "src", "component.html");
  const fromRelative = resolveSourceFile(relative, root);
  const fromAbsolute = resolveSourceFile(absolute, root);

  expect(fromRelative.id).toBe(toSourceFileId(absolute));
  expect(fromAbsolute.id).toBe(toSourceFileId(absolute));
  expect(fromRelative.hashKey).toBe(normalizePathForId(absolute));
  expect(fromAbsolute.hashKey).toBe(normalizePathForId(absolute));
});
