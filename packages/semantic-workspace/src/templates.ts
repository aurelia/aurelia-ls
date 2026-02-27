import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
export function inlineTemplatePath(componentPath: NormalizedPath): NormalizedPath {
  const replaced = componentPath.replace(/\.(ts|js|tsx|jsx)$/i, ".inline.html");
  const fallback = componentPath.endsWith(".inline.html")
    ? componentPath
    : `${componentPath}.inline.html`;
  return normalizePathForId(replaced === componentPath ? fallback : replaced);
}
