import type {
  CustomElementDef,
  ImportMetaIR,
  NormalizedPath,
  ResourceDef,
  SourceSpan,
  Sourced,
  TemplateMetaIR,
} from "../compiler.js";
import {
  extractTemplateMeta,
  normalizePathForId,
  toSourceFileId,
} from "../compiler.js";
import { unwrapSourced } from "../assemble/sourced.js";
import type {
  FileContext,
  LocalTemplateDefinition,
  LocalTemplateImport,
  TemplateImport,
} from "./file-facts.js";
import {
  extractLocalTemplateDefinitionsFromHtml,
  extractLocalTemplateImportsFromHtml,
} from "./template-imports.js";
import type { FileSystemContext } from "../project/context.js";
import { resolveExternalTemplateOwners } from "../register/template-owner.js";

export type TemplateFactOrigin = "sibling" | "inline";

export interface TemplateFactOwnerRecord {
  readonly owner: CustomElementDef;
  readonly origin: TemplateFactOrigin;
  readonly sourcePath: NormalizedPath;
  readonly templateFile: NormalizedPath;
  readonly rootTemplateMeta: TemplateMetaIR;
  readonly rootTemplateImports: readonly TemplateImport[];
  readonly localTemplateImports: readonly LocalTemplateImport[];
  readonly localTemplateDefinitions: readonly LocalTemplateDefinition[];
}

export interface TemplateFactOwnerAmbiguity {
  readonly sourcePath: NormalizedPath;
  readonly templateFile: NormalizedPath;
  readonly rootTemplateMeta: TemplateMetaIR;
  readonly rootTemplateImports: readonly TemplateImport[];
  readonly localTemplateImports: readonly LocalTemplateImport[];
  readonly localTemplateDefinitions: readonly LocalTemplateDefinition[];
  readonly candidates: readonly ResourceDef[];
}

export interface TemplateFactOwnerMissing {
  readonly sourcePath: NormalizedPath;
  readonly templateFile: NormalizedPath;
  readonly rootTemplateMeta: TemplateMetaIR;
  readonly localTemplateDefinitions: readonly LocalTemplateDefinition[];
}

export interface TemplateFactCollection {
  readonly owned: readonly TemplateFactOwnerRecord[];
  readonly ambiguities: readonly TemplateFactOwnerAmbiguity[];
  readonly missingOwners: readonly TemplateFactOwnerMissing[];
}

export function collectTemplateFactCollection(
  resources: readonly ResourceDef[],
  contexts: ReadonlyMap<NormalizedPath, FileContext>,
  fileSystem?: FileSystemContext,
  resolveModule?: (specifier: string, fromFile: NormalizedPath) => NormalizedPath | null,
): TemplateFactCollection {
  const owned: TemplateFactOwnerRecord[] = [];
  const ambiguities: TemplateFactOwnerAmbiguity[] = [];
  const missingOwners: TemplateFactOwnerMissing[] = [];

  if (fileSystem) {
    const sortedSources = [...contexts.keys()].sort((left, right) => left.localeCompare(right));
    for (const sourcePath of sortedSources) {
      const fileContext = contexts.get(sourcePath);
      if (!fileContext) continue;
      const templateFile = resolveTemplateMetaTemplateFile(sourcePath, fileContext);
      if (!templateFile) continue;

      const rootTemplateImports = fileContext.templateImports;
      const localTemplateImports = fileContext.localTemplateImports ?? [];
      const localTemplateDefinitions = fileContext.localTemplateDefinitions ?? [];
      const templateContent = fileSystem.readFile(templateFile);
      const rootTemplateMeta = templateContent !== undefined
        ? extractTemplateMeta(templateContent, templateFile)
        : emptyTemplateMeta();
      const hasTemplateSignals = rootTemplateImports.length > 0
        || localTemplateImports.length > 0
        || localTemplateDefinitions.length > 0
        || hasAnyTemplateMeta(rootTemplateMeta);
      if (!hasTemplateSignals) continue;

      const ownerResolution = resolveExternalTemplateOwners(sourcePath, templateFile, resources);
      if (ownerResolution.kind === "none") {
        missingOwners.push({
          sourcePath,
          templateFile,
          rootTemplateMeta,
          localTemplateDefinitions,
        });
        continue;
      }

      if (ownerResolution.kind === "ambiguous") {
        ambiguities.push({
          sourcePath,
          templateFile,
          rootTemplateMeta,
          rootTemplateImports,
          localTemplateImports,
          localTemplateDefinitions,
          candidates: ownerResolution.candidates,
        });
        continue;
      }

      const owners = ownerResolution.owners
        .filter((owner): owner is CustomElementDef => owner.kind === "custom-element")
        .sort(compareCustomElementOwners);
      for (const owner of owners) {
        owned.push({
          owner,
          origin: "sibling",
          sourcePath,
          templateFile,
          rootTemplateMeta,
          rootTemplateImports,
          localTemplateImports,
          localTemplateDefinitions,
        });
      }
    }
  }

  const inlineOwners = resources
    .filter((resource): resource is CustomElementDef =>
      resource.kind === "custom-element" && !!resource.file && !!resource.inlineTemplate,
    )
    .sort(compareCustomElementOwners);

  for (const owner of inlineOwners) {
    const componentFile = owner.file;
    if (!componentFile) continue;
    const inlineTemplate = owner.inlineTemplate;
    if (!inlineTemplate) continue;
    const inlineContent = ownerInlineTemplate(inlineTemplate);
    if (!inlineContent) continue;
    const templateSpan = spanFromSourced(inlineTemplate, componentFile);
    const rootTemplateMeta = extractTemplateMeta(inlineContent, componentFile);
    const rootTemplateImports = rootTemplateMeta.imports.map((imp) =>
      toInlineTemplateImport(imp, componentFile, templateSpan, resolveModule),
    );
    const localTemplateImports = extractLocalTemplateImportsFromHtml(inlineContent, componentFile).map((entry) => ({
      ...entry,
      import: {
        ...entry.import,
        resolvedPath: resolveModule
          ? resolveModule(entry.import.moduleSpecifier, componentFile)
          : entry.import.resolvedPath,
      },
    }));
    const localTemplateDefinitions = extractLocalTemplateDefinitionsFromHtml(inlineContent, componentFile);
    if (
      rootTemplateImports.length === 0
      && localTemplateImports.length === 0
      && localTemplateDefinitions.length === 0
      && !hasAnyTemplateMeta(rootTemplateMeta)
    ) {
      continue;
    }

    owned.push({
      owner,
      origin: "inline",
      sourcePath: componentFile,
      templateFile: componentFile,
      rootTemplateMeta,
      rootTemplateImports,
      localTemplateImports,
      localTemplateDefinitions,
    });
  }

  owned.sort(compareOwnedTemplateFacts);
  ambiguities.sort(compareTemplateAmbiguities);
  missingOwners.sort(compareMissingOwners);

  return { owned, ambiguities, missingOwners };
}

function emptyTemplateMeta(): TemplateMetaIR {
  return {
    imports: [],
    bindables: [],
    shadowDom: null,
    aliases: [],
    containerless: null,
    capture: null,
    hasSlot: false,
  };
}

function hasAnyTemplateMeta(meta: TemplateMetaIR): boolean {
  return meta.imports.length > 0
    || meta.bindables.length > 0
    || meta.aliases.length > 0
    || !!meta.shadowDom
    || !!meta.containerless
    || !!meta.capture
    || meta.hasSlot;
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
    .filter((sibling) => sibling.extension.toLowerCase() === ".html")
    .sort((left, right) => left.path.localeCompare(right.path))[0];
  return htmlSibling?.path ?? null;
}

function ownerInlineTemplate(value: CustomElementDef["inlineTemplate"]): string | undefined {
  if (!value) return undefined;
  if (value.origin === "source") {
    return value.state === "known" ? value.value : undefined;
  }
  return value.value;
}

function compareCustomElementOwners(left: CustomElementDef, right: CustomElementDef): number {
  const byFile = (left.file ?? "").localeCompare(right.file ?? "");
  if (byFile !== 0) return byFile;
  const byName = (unwrapSourced(left.name) ?? "").localeCompare(unwrapSourced(right.name) ?? "");
  if (byName !== 0) return byName;
  return (unwrapSourced(left.className) ?? "").localeCompare(unwrapSourced(right.className) ?? "");
}

function compareOwnedTemplateFacts(left: TemplateFactOwnerRecord, right: TemplateFactOwnerRecord): number {
  const bySource = left.sourcePath.localeCompare(right.sourcePath);
  if (bySource !== 0) return bySource;
  const byTemplate = left.templateFile.localeCompare(right.templateFile);
  if (byTemplate !== 0) return byTemplate;
  const byOrigin = left.origin.localeCompare(right.origin);
  if (byOrigin !== 0) return byOrigin;
  return compareCustomElementOwners(left.owner, right.owner);
}

function compareTemplateAmbiguities(
  left: TemplateFactOwnerAmbiguity,
  right: TemplateFactOwnerAmbiguity,
): number {
  const bySource = left.sourcePath.localeCompare(right.sourcePath);
  if (bySource !== 0) return bySource;
  return left.templateFile.localeCompare(right.templateFile);
}

function compareMissingOwners(
  left: TemplateFactOwnerMissing,
  right: TemplateFactOwnerMissing,
): number {
  const bySource = left.sourcePath.localeCompare(right.sourcePath);
  if (bySource !== 0) return bySource;
  return left.templateFile.localeCompare(right.templateFile);
}

function toInlineTemplateImport(
  imp: ImportMetaIR,
  componentFile: NormalizedPath,
  templateSpan: SourceSpan,
  resolveModule?: (specifier: string, fromFile: NormalizedPath) => NormalizedPath | null,
): TemplateImport {
  const locatedAtTemplate = <T extends string>(value: T) => ({ value, loc: templateSpan });

  return {
    moduleSpecifier: imp.from.value,
    resolvedPath: resolveModule ? resolveModule(imp.from.value, componentFile) : null,
    defaultAlias: imp.defaultAlias ? locatedAtTemplate(imp.defaultAlias.value) : null,
    namedAliases: imp.namedAliases.map((alias) => ({
      exportName: locatedAtTemplate(alias.exportName.value),
      alias: locatedAtTemplate(alias.alias.value),
      ...(alias.asLoc !== undefined ? { asLoc: templateSpan } : {}),
    })),
    span: templateSpan,
    moduleSpecifierSpan: templateSpan,
  };
}

function spanFromSourced(
  sourced: Sourced<unknown>,
  fallbackFile: NormalizedPath,
): SourceSpan {
  const location = "location" in sourced ? sourced.location : undefined;
  if (location) {
    return {
      file: toSourceFileId(location.file),
      start: location.pos,
      end: location.end,
    };
  }
  return { file: toSourceFileId(fallbackFile), start: 0, end: 0 };
}
