import type { NormalizedPath } from "@aurelia-ls/compiler";
import type {
  SourceFacts,
  BindingMode,
  AnalysisResult,
  AnalysisGap,
} from "../extraction/types.js";
import { highConfidence, partial, gap } from "../extraction/types.js";
import type { ResourceCandidate, BindableSpec } from "./types.js";
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
 * Returns high confidence for in-project resolution (static $au is explicit).
 * Propagates extraction gaps from class facts.
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
export function resolveFromStaticAu(facts: SourceFacts): AnalysisResult<ResourceCandidate[]> {
  const candidates: ResourceCandidate[] = [];
  const gaps: AnalysisGap[] = [];

  for (const cls of facts.classes) {
    // Propagate extraction gaps (spreads, computed properties, etc.)
    if (cls.extractionGaps) {
      gaps.push(...cls.extractionGaps);
    }

    if (!cls.staticAu) continue;

    const result = resolveStaticAu(cls.name, cls.staticAu, facts.path);
    if (result.candidate) {
      candidates.push(result.candidate);
    }
    if (result.gap) {
      gaps.push(result.gap);
    }
  }

  if (gaps.length > 0) {
    return partial(candidates, 'high', gaps);
  }
  return highConfidence(candidates);
}

interface StaticAuResolutionResult {
  candidate: ResourceCandidate | null;
  gap: AnalysisGap | null;
}

function resolveStaticAu(
  className: string,
  au: NonNullable<SourceFacts["classes"][0]["staticAu"]>,
  source: NormalizedPath,
): StaticAuResolutionResult {
  const type = au.type;

  if (type === "custom-element") {
    const name = canonicalElementName(au.name ?? className);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${className}`,
          { kind: 'invalid-resource-name', className, reason: 'Could not derive valid element name from static $au' },
          `Provide an explicit name in static $au.`
        ),
      };
    }

    const bindables = buildBindableSpecs(au.bindables ?? []);
    const aliases = canonicalAliases(au.aliases ?? []);

    return {
      candidate: {
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
      },
      gap: null,
    };
  }

  if (type === "custom-attribute") {
    const name = canonicalAttrName(au.name ?? className);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${className}`,
          { kind: 'invalid-resource-name', className, reason: 'Could not derive valid attribute name from static $au' },
          `Provide an explicit name in static $au.`
        ),
      };
    }

    const bindables = buildBindableSpecs(au.bindables ?? []);
    const aliases = canonicalAliases(au.aliases ?? []);
    const primary = findPrimaryBindable(au.bindables ?? []);

    return {
      candidate: {
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
      },
      gap: null,
    };
  }

  if (type === "value-converter") {
    const name = canonicalSimpleName(au.name ?? className);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${className}`,
          { kind: 'invalid-resource-name', className, reason: 'Could not derive valid value converter name from static $au' },
          `Provide an explicit name in static $au.`
        ),
      };
    }

    return {
      candidate: {
        kind: "valueConverter",
        name,
        source,
        className,
        aliases: canonicalAliases(au.aliases ?? []),
        bindables: [],
        confidence: "explicit",
        resolver: "static-au",
      },
      gap: null,
    };
  }

  if (type === "binding-behavior") {
    const name = canonicalSimpleName(au.name ?? className);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${className}`,
          { kind: 'invalid-resource-name', className, reason: 'Could not derive valid binding behavior name from static $au' },
          `Provide an explicit name in static $au.`
        ),
      };
    }

    return {
      candidate: {
        kind: "bindingBehavior",
        name,
        source,
        className,
        aliases: canonicalAliases(au.aliases ?? []),
        bindables: [],
        confidence: "explicit",
        resolver: "static-au",
      },
      gap: null,
    };
  }

  // No recognized type — not a gap, just no static $au resource
  return { candidate: null, gap: null };
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
