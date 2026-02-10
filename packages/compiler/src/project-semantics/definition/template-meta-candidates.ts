import type {
  CustomElementDef,
  NormalizedPath,
  ResourceDef,
} from "../compiler.js";
import { extractTemplateMeta, normalizePathForId } from "../compiler.js";
import type { AnalysisGap } from "../evaluate/types.js";
import type { FileContext } from "../extract/file-facts.js";
import type { FileSystemContext } from "../project/context.js";
import { resolveExternalTemplateOwners } from "../register/template-owner.js";
import {
  buildCustomElementTemplateMetaOverlay,
  hasNonImportTemplateMeta,
} from "./template-meta-resource.js";

export interface TemplateMetaCandidateResult {
  readonly candidates: readonly ResourceDef[];
  readonly gaps: readonly AnalysisGap[];
}

export function collectTemplateMetaDefinitionCandidates(
  resources: readonly ResourceDef[],
  contexts: ReadonlyMap<NormalizedPath, FileContext>,
  fileSystem?: FileSystemContext,
): TemplateMetaCandidateResult {
  const candidates: ResourceDef[] = [];
  const gaps: AnalysisGap[] = [];

  if (fileSystem) {
    for (const [sourcePath, fileContext] of contexts) {
      const templateFile = resolveTemplateMetaTemplateFile(sourcePath, fileContext);
      if (!templateFile) continue;
      const content = fileSystem.readFile(templateFile);
      if (content === undefined) continue;

      const meta = extractTemplateMeta(content, templateFile);
      if (!hasNonImportTemplateMeta(meta)) continue;

      const ownerResolution = resolveExternalTemplateOwners(sourcePath, templateFile, resources);
      if (ownerResolution.kind === "none") continue;

      if (ownerResolution.kind === "ambiguous") {
        gaps.push({
          what: `template metadata owner for '${templateFile}'`,
          why: {
            kind: "unsupported-pattern",
            path: sourcePath,
            reason: `template-meta-owner-ambiguous:${templateFile}`,
          },
          where: { file: templateFile },
          suggestion:
            "Use one external-template custom element per file, or align template basename with one resource name.",
        });
        continue;
      }

      for (const owner of ownerResolution.owners) {
        if (owner.kind !== "custom-element") continue;
        candidates.push(buildCustomElementTemplateMetaOverlay(owner, templateFile, meta));
      }
    }
  }

  for (const resource of resources) {
    if (resource.kind !== "custom-element") continue;
    if (!resource.file) continue;
    const inlineTemplate = resource.inlineTemplate;
    const inlineContent = inlineTemplate ? ownerInlineTemplate(inlineTemplate) : undefined;
    if (!inlineContent) continue;
    const meta = extractTemplateMeta(inlineContent, resource.file);
    if (!hasNonImportTemplateMeta(meta)) continue;
    candidates.push(buildCustomElementTemplateMetaOverlay(resource, resource.file, meta));
  }

  return { candidates, gaps };
}

function resolveTemplateMetaTemplateFile(
  sourceFile: NormalizedPath,
  fileContext: FileContext,
): NormalizedPath | null {
  const firstImport = fileContext.templateImports[0];
  if (firstImport) {
    return normalizePathForId(String(firstImport.span.file));
  }
  const firstLocalImport = fileContext.localTemplateImports?.[0];
  if (firstLocalImport) {
    return normalizePathForId(String(firstLocalImport.import.span.file));
  }
  const firstLocalDefinition = fileContext.localTemplateDefinitions?.[0];
  if (firstLocalDefinition) {
    return normalizePathForId(String(firstLocalDefinition.span.file));
  }
  const htmlSibling = [...fileContext.siblings]
    .filter((s) => s.extension.toLowerCase() === ".html")
    .sort((a, b) => a.path.localeCompare(b.path))[0];
  return htmlSibling?.path ?? null;
}

function ownerInlineTemplate(value: CustomElementDef["inlineTemplate"]): string | undefined {
  if (!value) return undefined;
  if (value.origin === "source") {
    return value.state === "known" ? value.value : undefined;
  }
  return value.value;
}
