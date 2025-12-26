import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { SourceFacts, BindingMode } from "../extraction/types.js";
import type { ResourceCandidate, ResolverResult, BindableSpec } from "./types.js";
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalAliases,
} from "../util/naming.js";

/**
 * Resolve resource candidates from static $au property.
 * This is the second-priority resolver after decorators.
 *
 * Handles patterns like:
 * ```typescript
 * class MyElement {
 *   static $au = {
 *     type: 'custom-element',
 *     name: 'my-element',
 *     bindables: ['value'],
 *   };
 * }
 * ```
 */
export function resolveFromStaticAu(facts: SourceFacts): ResolverResult {
  const candidates: ResourceCandidate[] = [];

  for (const cls of facts.classes) {
    if (!cls.staticAu) continue;

    const candidate = resolveStaticAu(cls.name, cls.staticAu, facts.path);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return { candidates, diagnostics: [] };
}

function resolveStaticAu(
  className: string,
  au: NonNullable<SourceFacts["classes"][0]["staticAu"]>,
  source: NormalizedPath,
): ResourceCandidate | null {
  const type = au.type;

  if (type === "custom-element") {
    const name = canonicalElementName(au.name ?? className);
    if (!name) return null;

    const bindables = buildBindableSpecs(au.bindables ?? []);
    const aliases = canonicalAliases(au.aliases ?? []);

    return {
      kind: "element",
      name,
      source,
      className,
      aliases,
      bindables,
      confidence: "explicit",
      resolver: "static-au",
      boundary: true,
      ...(au.containerless !== undefined ? { containerless: au.containerless } : {}),
      ...(au.template !== undefined ? { inlineTemplate: au.template } : {}),
    };
  }

  if (type === "custom-attribute") {
    const name = canonicalAttrName(au.name ?? className);
    if (!name) return null;

    const bindables = buildBindableSpecs(au.bindables ?? []);
    const aliases = canonicalAliases(au.aliases ?? []);
    const primary = findPrimaryBindable(au.bindables ?? []);

    return {
      kind: "attribute",
      name,
      source,
      className,
      aliases,
      bindables,
      confidence: "explicit",
      resolver: "static-au",
      primary,
      ...(au.isTemplateController !== undefined ? { isTemplateController: au.isTemplateController } : {}),
      ...(au.noMultiBindings !== undefined ? { noMultiBindings: au.noMultiBindings } : {}),
    };
  }

  if (type === "value-converter") {
    const name = canonicalSimpleName(au.name ?? className);
    if (!name) return null;

    return {
      kind: "valueConverter",
      name,
      source,
      className,
      aliases: canonicalAliases(au.aliases ?? []),
      bindables: [],
      confidence: "explicit",
      resolver: "static-au",
    };
  }

  if (type === "binding-behavior") {
    const name = canonicalSimpleName(au.name ?? className);
    if (!name) return null;

    return {
      kind: "bindingBehavior",
      name,
      source,
      className,
      aliases: canonicalAliases(au.aliases ?? []),
      bindables: [],
      confidence: "explicit",
      resolver: "static-au",
    };
  }

  return null;
}

function buildBindableSpecs(
  defs: readonly { name: string; mode?: string; primary?: boolean; attribute?: string }[],
): BindableSpec[] {
  return defs.map((d) => ({
    name: d.name,
    ...(d.mode ? { mode: d.mode as BindingMode } : {}),
    ...(d.primary ? { primary: d.primary } : {}),
    ...(d.attribute ? { attribute: d.attribute } : {}),
  }));
}

function findPrimaryBindable(
  defs: readonly { name: string; primary?: boolean }[],
): string | null {
  for (const d of defs) {
    if (d.primary) return d.name;
  }
  if (defs.length === 1 && defs[0]) return defs[0].name;
  return null;
}
