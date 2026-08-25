const assert = require("assert");
const path = require("path");

function authenticatedFixtureFilePaths(fixture) {
  assert(Array.isArray(fixture.files) && fixture.files.length > 0, "The rendered fixture must authenticate files.");
  const relativePaths = new Set();
  for (const [index, receipt] of fixture.files.entries()) {
    assert(receipt != null && typeof receipt === "object", `fixture.files[${index}] must be an object.`);
    const { relativePath } = receipt;
    assert(typeof relativePath === "string" && relativePath.length > 0, `fixture.files[${index}] needs relativePath.`);
    assert(!relativePath.includes("\\"), `fixture.files[${index}].relativePath must use POSIX separators.`);
    assert(!path.posix.isAbsolute(relativePath), `fixture.files[${index}].relativePath must be relative.`);
    assert.strictEqual(
      path.posix.normalize(relativePath),
      relativePath,
      `fixture.files[${index}].relativePath must be normalized.`,
    );
    assert(
      relativePath.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
      `fixture.files[${index}].relativePath must remain inside the rendered fixture root.`,
    );
    assert(!relativePaths.has(relativePath), `fixture.files contains duplicate path ${relativePath}.`);
    relativePaths.add(relativePath);
  }
  return relativePaths;
}

function admittedAuthoredRoot(
  filePath,
  roots,
  authenticatedRelativePathsByRoot = new Map(),
  resolveRealPath = null,
) {
  const candidate = path.resolve(filePath);
  for (const root of roots) {
    if (pathIsWithin(path.join(root, "src"), candidate) && realPathIsWithinRoot(root, candidate, resolveRealPath)) {
      return root;
    }
    const authenticatedRelativePaths = authenticatedRelativePathsByRoot.get(root)
      ?? authenticatedRelativePathsByRoot.get(path.resolve(root));
    if (authenticatedRelativePaths == null) continue;
    const relativePath = authenticatedRelativePath(root, candidate);
    if (
      relativePath != null
        && authenticatedRelativePaths.has(relativePath)
        && realPathIsWithinRoot(root, candidate, resolveRealPath)
    ) {
      return root;
    }
  }
  return null;
}

function realPathIsWithinRoot(root, candidate, resolveRealPath) {
  if (resolveRealPath == null) return true;
  try {
    return pathIsWithin(resolveRealPath(root), resolveRealPath(candidate));
  } catch {
    return false;
  }
}

function authenticatedRelativePath(root, candidate) {
  const relativePath = path.relative(path.resolve(root), candidate);
  if (
    relativePath.length === 0
      || path.isAbsolute(relativePath)
      || relativePath === ".."
      || relativePath.startsWith(`..${path.sep}`)
  ) {
    return null;
  }
  const segments = relativePath.split(path.sep);
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return null;
  return segments.join("/");
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

module.exports = { admittedAuthoredRoot, authenticatedFixtureFilePaths };
