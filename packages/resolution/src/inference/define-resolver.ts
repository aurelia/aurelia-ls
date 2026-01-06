import type { NormalizedPath, BindingMode } from "@aurelia-ls/compiler";
import type {
  SourceFacts,
  AnalysisResult,
  AnalysisGap,
  DefineCallFact,
  BindableDefFact,
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
 * Resolve resource candidates from imperative `.define()` calls.
 *
 * This is the third-priority resolver after decorators and static $au.
 * It handles the official Aurelia API for defining resources imperatively:
 *
 * - `CustomElement.define({ name: 'foo', bindables: [...] }, FooClass)`
 * - `CustomAttribute.define({ name: 'bar' }, BarClass)`
 * - `BindingBehavior.define('state', StateBindingBehavior)`
 * - `ValueConverter.define('json', JsonValueConverter)`
 *
 * This pattern is common in Aurelia core packages (router, state, etc.)
 * where resources are defined without decorators for efficiency.
 */
export function resolveFromDefine(facts: SourceFacts): AnalysisResult<ResourceCandidate[]> {
  const candidates: ResourceCandidate[] = [];
  const gaps: AnalysisGap[] = [];

  for (const defineCall of facts.defineCalls) {
    const result = resolveDefineCall(defineCall, facts.path);
    if (result.candidate) {
      candidates.push(result.candidate);
    }
    if (result.gap) {
      gaps.push(result.gap);
    }
  }

  if (gaps.length > 0) {
    return partial(candidates, "high", gaps);
  }
  return highConfidence(candidates);
}

interface DefineResolutionResult {
  candidate: ResourceCandidate | null;
  gap: AnalysisGap | null;
}

function resolveDefineCall(
  defineCall: DefineCallFact,
  source: NormalizedPath
): DefineResolutionResult {
  const { resourceType, className } = defineCall;

  switch (resourceType) {
    case "CustomElement":
      return resolveCustomElement(defineCall, className, source);
    case "CustomAttribute":
      return resolveCustomAttribute(defineCall, className, source);
    case "BindingBehavior":
      return resolveBindingBehavior(defineCall, className, source);
    case "ValueConverter":
      return resolveValueConverter(defineCall, className, source);
    default:
      return { candidate: null, gap: null };
  }
}

function resolveCustomElement(
  defineCall: DefineCallFact,
  className: string,
  source: NormalizedPath
): DefineResolutionResult {
  const name = canonicalElementName(defineCall.name ?? className);
  if (!name) {
    return {
      candidate: null,
      gap: gap(
        `resource name for ${className}`,
        { kind: "invalid-resource-name", className, reason: "Could not derive valid element name from .define() call" },
        `Provide an explicit name in the definition object.`
      ),
    };
  }

  const bindables = buildBindableSpecs(defineCall.bindables ?? []);
  const aliases = canonicalAliases(defineCall.aliases ?? []);

  return {
    candidate: {
      kind: "element",
      name,
      source,
      className,
      aliases,
      bindables,
      confidence: "explicit",
      resolver: "define",
      boundary: true,
      ...(defineCall.containerless !== undefined ? { containerless: defineCall.containerless } : {}),
      ...(defineCall.template !== undefined ? { inlineTemplate: defineCall.template } : {}),
    },
    gap: null,
  };
}

function resolveCustomAttribute(
  defineCall: DefineCallFact,
  className: string,
  source: NormalizedPath
): DefineResolutionResult {
  const name = canonicalAttrName(defineCall.name ?? className);
  if (!name) {
    return {
      candidate: null,
      gap: gap(
        `resource name for ${className}`,
        { kind: "invalid-resource-name", className, reason: "Could not derive valid attribute name from .define() call" },
        `Provide an explicit name in the definition object.`
      ),
    };
  }

  const bindables = buildBindableSpecs(defineCall.bindables ?? []);
  const aliases = canonicalAliases(defineCall.aliases ?? []);
  const primary = findPrimaryBindable(defineCall.bindables ?? []);

  return {
    candidate: {
      kind: "attribute",
      name,
      source,
      className,
      aliases,
      bindables,
      confidence: "explicit",
      resolver: "define",
      primary,
      ...(defineCall.isTemplateController !== undefined ? { isTemplateController: defineCall.isTemplateController } : {}),
      ...(defineCall.noMultiBindings !== undefined ? { noMultiBindings: defineCall.noMultiBindings } : {}),
    },
    gap: null,
  };
}

function resolveBindingBehavior(
  defineCall: DefineCallFact,
  className: string,
  source: NormalizedPath
): DefineResolutionResult {
  const name = canonicalSimpleName(defineCall.name ?? className);
  if (!name) {
    return {
      candidate: null,
      gap: gap(
        `resource name for ${className}`,
        { kind: "invalid-resource-name", className, reason: "Could not derive valid binding behavior name from .define() call" },
        `Provide an explicit name in the definition object.`
      ),
    };
  }

  return {
    candidate: {
      kind: "bindingBehavior",
      name,
      source,
      className,
      aliases: canonicalAliases(defineCall.aliases ?? []),
      bindables: [],
      confidence: "explicit",
      resolver: "define",
    },
    gap: null,
  };
}

function resolveValueConverter(
  defineCall: DefineCallFact,
  className: string,
  source: NormalizedPath
): DefineResolutionResult {
  const name = canonicalSimpleName(defineCall.name ?? className);
  if (!name) {
    return {
      candidate: null,
      gap: gap(
        `resource name for ${className}`,
        { kind: "invalid-resource-name", className, reason: "Could not derive valid value converter name from .define() call" },
        `Provide an explicit name in the definition object.`
      ),
    };
  }

  return {
    candidate: {
      kind: "valueConverter",
      name,
      source,
      className,
      aliases: canonicalAliases(defineCall.aliases ?? []),
      bindables: [],
      confidence: "explicit",
      resolver: "define",
    },
    gap: null,
  };
}

function buildBindableSpecs(defs: readonly BindableDefFact[]): BindableSpec[] {
  return defs.map((d) => ({
    name: d.name,
    ...(d.mode ? { mode: d.mode as BindingMode } : {}),
    ...(d.primary ? { primary: d.primary } : {}),
    ...(d.attribute ? { attribute: d.attribute } : {}),
  }));
}

function findPrimaryBindable(defs: readonly BindableDefFact[]): string | null {
  for (const d of defs) {
    if (d.primary) return d.name;
  }
  // If there's only one bindable, it's implicitly primary
  if (defs.length === 1 && defs[0]) return defs[0].name;
  return null;
}
