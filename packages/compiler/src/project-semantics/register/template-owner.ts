import { basename, extname } from "node:path";
import type {
  NormalizedPath,
  ResourceDef,
} from "../compiler.js";
import { unwrapSourced } from "../assemble/sourced.js";

export type TemplateOwnerResolution =
  | { kind: "none" }
  | { kind: "owners"; owners: readonly ResourceDef[] }
  | { kind: "ambiguous"; candidates: readonly ResourceDef[] };

/**
 * Resolve owner custom-elements for a sibling external template.
 *
 * Rules:
 * 1. candidate set is external-template custom elements from source file.
 * 2. single candidate => owner.
 * 3. basename/name exact match => owner.
 * 4. otherwise emit explicit ambiguity.
 */
export function resolveExternalTemplateOwners(
  sourceFile: NormalizedPath,
  templateFile: NormalizedPath,
  resources: readonly ResourceDef[],
): TemplateOwnerResolution {
  const candidates = resources.filter((resource) =>
    resource.kind === "custom-element"
    && resource.file === sourceFile
    && unwrapSourced(resource.inlineTemplate) === undefined,
  );

  if (candidates.length === 0) {
    return { kind: "none" };
  }

  if (candidates.length === 1) {
    return { kind: "owners", owners: candidates };
  }

  const templateBaseName = baseNameWithoutExtension(templateFile).toLowerCase();
  const matchedByName = candidates.filter((resource) => {
    const resourceName = unwrapSourced(resource.name);
    if (!resourceName) return false;
    return resourceName.toLowerCase() === templateBaseName;
  });

  if (matchedByName.length === 1) {
    return { kind: "owners", owners: matchedByName };
  }

  const stableCandidates = [...candidates].sort(compareResourceOwnerCandidates);
  return { kind: "ambiguous", candidates: stableCandidates };
}

function compareResourceOwnerCandidates(a: ResourceDef, b: ResourceDef): number {
  const aName = unwrapSourced(a.name) ?? "";
  const bName = unwrapSourced(b.name) ?? "";
  const byName = aName.localeCompare(bName);
  if (byName !== 0) return byName;
  const aClass = unwrapSourced(a.className) ?? "";
  const bClass = unwrapSourced(b.className) ?? "";
  return aClass.localeCompare(bClass);
}

function baseNameWithoutExtension(filePath: NormalizedPath): string {
  const fileName = basename(filePath);
  const extension = extname(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
}
