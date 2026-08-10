const path = require("path");

function admittedAuthoredRoot(filePath, roots) {
  const candidate = path.resolve(filePath);
  return roots.find((root) => pathIsWithin(path.join(root, "src"), candidate)) ?? null;
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

module.exports = { admittedAuthoredRoot };
