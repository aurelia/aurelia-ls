import type { NormalizedPath } from "@aurelia-ls/compiler";
import type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  BindableMemberFact,
  BindableDefFact,
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
 * Resolve resource candidates from decorator facts.
 * This is the highest-priority resolver.
 *
 * Returns high confidence for in-project resolution (decorators are explicit).
 */
export function resolveFromDecorators(facts: SourceFacts): AnalysisResult<ResourceCandidate[]> {
  const candidates: ResourceCandidate[] = [];
  const gaps: AnalysisGap[] = [];

  for (const cls of facts.classes) {
    const result = resolveClassDecorators(cls, facts.path);
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

interface DecoratorMeta {
  element?: {
    name?: string;
    aliases: string[];
    bindables: BindableDefFact[];
    containerless: boolean;
    template?: string;
  };
  attribute?: {
    name?: string;
    aliases: string[];
    bindables: BindableDefFact[];
    isTemplateController: boolean;
    noMultiBindings: boolean;
  };
  valueConverter?: {
    name?: string;
    aliases: string[];
  };
  bindingBehavior?: {
    name?: string;
    aliases: string[];
  };
  containerless: boolean;
  templateController: boolean;
}

interface ClassResolutionResult {
  candidate: ResourceCandidate | null;
  gap: AnalysisGap | null;
}

function resolveClassDecorators(
  cls: ClassFacts,
  source: NormalizedPath,
): ClassResolutionResult {
  const meta = collectDecoratorMeta(cls.decorators);

  if (meta.element) {
    const bindables = mergeBindableSpecs(meta.element.bindables, cls.bindableMembers);
    const { specs } = buildBindableSpecs(bindables);
    const name = canonicalElementName(meta.element.name ?? cls.name);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${cls.name}`,
          { kind: 'invalid-resource-name', className: cls.name, reason: 'Could not derive valid element name' },
          `Provide an explicit name in the @customElement decorator.`
        ),
      };
    }
    const aliases = canonicalAliases(meta.element.aliases);

    return {
      candidate: {
        kind: "element",
        name,
        source,
        className: cls.name,
        aliases,
        bindables: specs,
        confidence: "explicit",
        resolver: "decorator",
        containerless: meta.element.containerless || meta.containerless,
        boundary: true,
        ...(meta.element.template ? { inlineTemplate: meta.element.template } : {}),
      },
      gap: null,
    };
  }

  if (meta.attribute) {
    const bindables = mergeBindableSpecs(meta.attribute.bindables, cls.bindableMembers);
    const { specs, primary } = buildBindableSpecs(bindables);
    const name = canonicalAttrName(meta.attribute.name ?? cls.name);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${cls.name}`,
          { kind: 'invalid-resource-name', className: cls.name, reason: 'Could not derive valid attribute name' },
          `Provide an explicit name in the @customAttribute decorator.`
        ),
      };
    }
    const aliases = canonicalAliases(meta.attribute.aliases);
    const isTemplateController = meta.attribute.isTemplateController || meta.templateController;

    return {
      candidate: {
        kind: "attribute",
        name,
        source,
        className: cls.name,
        aliases,
        bindables: specs,
        confidence: "explicit",
        resolver: "decorator",
        isTemplateController,
        noMultiBindings: meta.attribute.noMultiBindings,
        primary,
      },
      gap: null,
    };
  }

  if (meta.valueConverter) {
    const name = canonicalSimpleName(meta.valueConverter.name ?? cls.name);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${cls.name}`,
          { kind: 'invalid-resource-name', className: cls.name, reason: 'Could not derive valid value converter name' },
          `Provide an explicit name in the @valueConverter decorator.`
        ),
      };
    }

    return {
      candidate: {
        kind: "valueConverter",
        name,
        source,
        className: cls.name,
        aliases: canonicalAliases(meta.valueConverter.aliases),
        bindables: [],
        confidence: "explicit",
        resolver: "decorator",
      },
      gap: null,
    };
  }

  if (meta.bindingBehavior) {
    const name = canonicalSimpleName(meta.bindingBehavior.name ?? cls.name);
    if (!name) {
      return {
        candidate: null,
        gap: gap(
          `resource name for ${cls.name}`,
          { kind: 'invalid-resource-name', className: cls.name, reason: 'Could not derive valid binding behavior name' },
          `Provide an explicit name in the @bindingBehavior decorator.`
        ),
      };
    }

    return {
      candidate: {
        kind: "bindingBehavior",
        name,
        source,
        className: cls.name,
        aliases: canonicalAliases(meta.bindingBehavior.aliases),
        bindables: [],
        confidence: "explicit",
        resolver: "decorator",
      },
      gap: null,
    };
  }

  // No resource decorator found — not a gap, just not a resource
  return { candidate: null, gap: null };
}

function collectDecoratorMeta(decorators: readonly DecoratorFact[]): DecoratorMeta {
  const meta: DecoratorMeta = {
    containerless: false,
    templateController: false,
  };

  for (const dec of decorators) {
    if (dec.name === "containerless") {
      meta.containerless = true;
      continue;
    }

    if (dec.name === "templateController") {
      meta.templateController = true;
      continue;
    }

    if (dec.name === "customElement") {
      const parsed = parseResourceDecorator(dec);
      const existing = meta.element;
      const name = parsed.name ?? existing?.name;
      const template = parsed.template ?? existing?.template;
      const base = {
        aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
        bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
        containerless: (existing?.containerless ?? false) || parsed.containerless,
      };
      meta.element = {
        ...base,
        ...(name !== undefined ? { name } : {}),
        ...(template !== undefined ? { template } : {}),
      };
      continue;
    }

    if (dec.name === "customAttribute") {
      const parsed = parseResourceDecorator(dec);
      const existing = meta.attribute;
      const name = parsed.name ?? existing?.name;
      const base = {
        aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
        bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
        isTemplateController: (existing?.isTemplateController ?? false) || parsed.isTemplateController,
        noMultiBindings: (existing?.noMultiBindings ?? false) || parsed.noMultiBindings,
      };
      meta.attribute = name !== undefined ? { ...base, name } : base;
      continue;
    }

    if (dec.name === "valueConverter") {
      const parsed = parseNameOnlyDecorator(dec);
      const existing = meta.valueConverter;
      const name = parsed.name ?? existing?.name;
      const base = { aliases: [...(existing?.aliases ?? []), ...parsed.aliases] };
      meta.valueConverter = name !== undefined ? { ...base, name } : base;
      continue;
    }

    if (dec.name === "bindingBehavior") {
      const parsed = parseNameOnlyDecorator(dec);
      const existing = meta.bindingBehavior;
      const name = parsed.name ?? existing?.name;
      const base = { aliases: [...(existing?.aliases ?? []), ...parsed.aliases] };
      meta.bindingBehavior = name !== undefined ? { ...base, name } : base;
      continue;
    }
  }

  return meta;
}

interface ParsedResourceDecorator {
  name?: string;
  aliases: string[];
  bindables: BindableDefFact[];
  containerless: boolean;
  isTemplateController: boolean;
  noMultiBindings: boolean;
  template?: string;
}

function parseResourceDecorator(dec: DecoratorFact): ParsedResourceDecorator {
  const result: ParsedResourceDecorator = {
    aliases: [],
    bindables: [],
    containerless: false,
    isTemplateController: false,
    noMultiBindings: false,
  };

  if (!dec.args) return result;

  if (dec.args.kind === "string") {
    result.name = dec.args.value;
    return result;
  }

  if (dec.args.kind === "object") {
    const props = dec.args.properties;

    if (props.name?.kind === "string") {
      result.name = props.name.value;
    }

    if (props.aliases?.kind === "stringArray") {
      result.aliases = [...props.aliases.values];
    }
    if (props.alias?.kind === "string") {
      result.aliases.push(props.alias.value);
    }

    if (props.bindables?.kind === "bindableArray") {
      result.bindables = [...props.bindables.bindables];
    }

    if (props.containerless?.kind === "boolean") {
      result.containerless = props.containerless.value;
    }

    if (props.isTemplateController?.kind === "boolean") {
      result.isTemplateController = props.isTemplateController.value;
    }
    if (props.templateController?.kind === "boolean") {
      result.isTemplateController = props.templateController.value;
    }

    if (props.noMultiBindings?.kind === "boolean") {
      result.noMultiBindings = props.noMultiBindings.value;
    }

    if (props.template?.kind === "string") {
      result.template = props.template.value;
    }
  }

  return result;
}

interface ParsedNameOnlyDecorator {
  name?: string;
  aliases: string[];
}

function parseNameOnlyDecorator(dec: DecoratorFact): ParsedNameOnlyDecorator {
  const result: ParsedNameOnlyDecorator = { aliases: [] };

  if (!dec.args) return result;

  if (dec.args.kind === "string") {
    result.name = dec.args.value;
    return result;
  }

  if (dec.args.kind === "object") {
    const props = dec.args.properties;

    if (props.name?.kind === "string") {
      result.name = props.name.value;
    }

    if (props.aliases?.kind === "stringArray") {
      result.aliases = [...props.aliases.values];
    }
    if (props.alias?.kind === "string") {
      result.aliases.push(props.alias.value);
    }
  }

  return result;
}

interface MergedBindable {
  name: string;
  mode?: BindingMode;
  primary?: boolean;
  type?: string;
  attribute?: string;
}

function mergeBindableSpecs(
  fromDecorator: readonly BindableDefFact[],
  fromMembers: readonly BindableMemberFact[],
): MergedBindable[] {
  const merged = new Map<string, MergedBindable>();

  // First, add decorator bindables
  for (const spec of fromDecorator) {
    merged.set(spec.name, {
      name: spec.name,
      ...(spec.mode ? { mode: spec.mode } : {}),
      ...(spec.primary ? { primary: spec.primary } : {}),
      ...(spec.attribute ? { attribute: spec.attribute } : {}),
    });
  }

  // Then merge with member bindables (members can add type info)
  for (const spec of fromMembers) {
    const existing = merged.get(spec.name);
    const next: MergedBindable = {
      name: spec.name,
      ...(existing?.mode ?? spec.mode ? { mode: existing?.mode ?? spec.mode } : {}),
      ...(existing?.primary ?? spec.primary ? { primary: existing?.primary ?? spec.primary } : {}),
      ...(existing?.attribute ? { attribute: existing.attribute } : {}),
      ...(spec.inferredType ? { type: spec.inferredType } : {}),
    };
    merged.set(spec.name, next);
  }

  return Array.from(merged.values());
}

function buildBindableSpecs(merged: MergedBindable[]): { specs: BindableSpec[]; primary: string | null } {
  const specs: BindableSpec[] = [];
  let primary: string | null = null;

  const sorted = [...merged].sort((a, b) => a.name.localeCompare(b.name));

  for (const m of sorted) {
    specs.push({
      name: m.name,
      ...(m.mode ? { mode: m.mode } : {}),
      ...(m.primary ? { primary: m.primary } : {}),
      ...(m.type ? { type: m.type } : {}),
      ...(m.attribute ? { attribute: m.attribute } : {}),
    });

    if (primary === null && m.primary) {
      primary = m.name;
    }
  }

  // If no explicit primary and only one bindable, it's primary
  if (primary === null && sorted.length === 1 && sorted[0]) {
    primary = sorted[0].name;
  }

  return { specs, primary };
}
