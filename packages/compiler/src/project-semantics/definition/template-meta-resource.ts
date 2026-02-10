import type {
  BindingMode,
  CustomElementDef,
  Located,
  NormalizedPath,
  SourceSpan,
  TemplateMetaIR,
} from "../compiler.js";
import {
  canonicalAliases,
  canonicalBindableName,
  canonicalElementName,
} from "../util/naming.js";
import { buildBindableDefs, type BindableInput } from "../assemble/resource-def.js";
import { sourcedKnown, sourcedUnknown, sourcedValue, unwrapSourced } from "../assemble/sourced.js";

export function hasNonImportTemplateMeta(meta: TemplateMetaIR): boolean {
  return Boolean(
    meta.bindables.length > 0
    || meta.aliases.length > 0
    || meta.containerless
    || meta.capture
    || meta.shadowDom,
  );
}

export function buildCustomElementTemplateMetaOverlay(
  owner: CustomElementDef,
  templateFile: NormalizedPath,
  templateMeta: TemplateMetaIR,
): CustomElementDef {
  return {
    kind: "custom-element",
    className: owner.className,
    name: owner.name,
    aliases: toAliasSourced(templateMeta, templateFile),
    containerless: templateMeta.containerless
      ? sourcedKnown(true, templateFile, toTextSpan(templateMeta.containerless.tagLoc))
      : sourcedUnknown<boolean>(templateFile),
    shadowOptions: templateMeta.shadowDom
      ? sourcedKnown(
        { mode: templateMeta.shadowDom.mode.value },
        templateFile,
        toTextSpan(templateMeta.shadowDom.mode.loc),
      )
      : sourcedUnknown<{ readonly mode: "open" | "closed" } | undefined>(templateFile),
    capture: templateMeta.capture
      ? sourcedKnown(true, templateFile, toTextSpan(templateMeta.capture.tagLoc))
      : sourcedUnknown<boolean>(templateFile),
    processContent: sourcedUnknown<boolean>(templateFile),
    boundary: sourcedUnknown<boolean>(templateFile),
    bindables: buildBindableDefs(toBindableInputs(templateMeta), templateFile),
    dependencies: [],
    file: templateFile,
    ...(owner.package ? { package: owner.package } : {}),
  };
}

export function buildLocalTemplateCustomElementDefinition(
  localTemplateName: Located<string>,
  templateFile: NormalizedPath,
  componentClassName: string,
  templateMeta: TemplateMetaIR,
): CustomElementDef {
  const localElementName = canonicalElementName(localTemplateName.value);
  const className = `${componentClassName}:${localElementName}`;
  return {
    kind: "custom-element",
    className: sourcedValue(className, templateFile, toTextSpan(localTemplateName.loc)),
    name: sourcedValue(localElementName, templateFile, toTextSpan(localTemplateName.loc)),
    aliases: toAliasSourced(templateMeta, templateFile),
    containerless: templateMeta.containerless
      ? sourcedKnown(true, templateFile, toTextSpan(templateMeta.containerless.tagLoc))
      : sourcedUnknown<boolean>(templateFile),
    shadowOptions: templateMeta.shadowDom
      ? sourcedKnown(
        { mode: templateMeta.shadowDom.mode.value },
        templateFile,
        toTextSpan(templateMeta.shadowDom.mode.loc),
      )
      : sourcedUnknown<{ readonly mode: "open" | "closed" } | undefined>(templateFile),
    capture: templateMeta.capture
      ? sourcedKnown(true, templateFile, toTextSpan(templateMeta.capture.tagLoc))
      : sourcedUnknown<boolean>(templateFile),
    processContent: sourcedUnknown<boolean>(templateFile),
    boundary: sourcedUnknown<boolean>(templateFile),
    bindables: buildBindableDefs(toBindableInputs(templateMeta), templateFile),
    dependencies: [],
    file: templateFile,
  };
}

function toAliasSourced(
  templateMeta: TemplateMetaIR,
  templateFile: NormalizedPath,
): readonly ReturnType<typeof sourcedValue<string>>[] {
  const aliasLoc = new Map<string, SourceSpan>();
  for (const aliasMeta of templateMeta.aliases) {
    for (const aliasName of aliasMeta.names) {
      const canonical = canonicalAliases([aliasName.value])[0];
      if (!canonical || aliasLoc.has(canonical)) continue;
      aliasLoc.set(canonical, aliasName.loc);
    }
  }
  const ordered = [...aliasLoc.entries()].sort(([left], [right]) => left.localeCompare(right));
  return ordered.map(([alias, loc]) => sourcedValue(alias, templateFile, toTextSpan(loc)));
}

function toBindableInputs(templateMeta: TemplateMetaIR): BindableInput[] {
  const inputs: BindableInput[] = [];
  for (const bindable of templateMeta.bindables) {
    const name = canonicalBindableName(bindable.name.value);
    if (!name) continue;
    const mode = toBindingMode(bindable.mode?.value ?? null);
    inputs.push({
      name,
      ...(mode ? { mode } : {}),
      ...(bindable.attribute?.value ? { attribute: bindable.attribute.value } : {}),
      span: toTextSpan(bindable.name.loc),
      ...(bindable.attribute?.loc ? { attributeSpan: toTextSpan(bindable.attribute.loc) } : {}),
    });
  }
  return inputs;
}

function toBindingMode(mode: string | null): BindingMode | undefined {
  if (!mode) return undefined;
  switch (mode.trim().toLowerCase()) {
    case "one-time":
      return "oneTime";
    case "one-way":
    case "to-view":
      return "toView";
    case "from-view":
      return "fromView";
    case "two-way":
      return "twoWay";
    default:
      return undefined;
  }
}

function toTextSpan(span: SourceSpan): { start: number; end: number } {
  return { start: span.start, end: span.end };
}

export function fileLooksLikeTemplate(file: NormalizedPath | undefined): boolean {
  return typeof file === "string" && file.toLowerCase().endsWith(".html");
}

export function ownerClassName(resource: CustomElementDef): string {
  return unwrapSourced(resource.className) ?? "unknown";
}
