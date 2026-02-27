// Hover Card Projection — CursorEntity → Markdown
//
// Given a CursorResolutionResult, projects hover cards for display.
// This module does NO positional resolution. All entity resolution
// happens in cursor-resolve.ts; hover only renders cards from the entity.

import {
  debug,
  isDebugEnabled,
  type AttrRes,
  type Bindable,
  type BindingMode,
  type CursorResolutionResult,
  type ElementRes,
  type TypeRef,
  type ValueConverterSig,
} from "@aurelia-ls/compiler";

// ── Hover card builder ─────────────────────────────────────────────────
//
// A HoverCard accumulates structured sections that render to markdown
// following the rust-analyzer / TypeScript pattern:
//
//   ```ts
//   (custom element) summary-panel
//   ```
//   ---
//   *@aurelia/router*
//
//   **Bindables:** `route` *(primary)*, `params`, `active`
//
// The signature block (fenced code) is the primary identity.
// Below the separator, metadata lines provide details.

interface HoverCard {
  /** Fenced code block: e.g. `(custom element) summary-panel` */
  signature?: string;
  /** Metadata lines below the separator */
  meta: string[];
}

function renderCard(card: HoverCard): string {
  const blocks: string[] = [];
  if (card.signature) {
    blocks.push("```ts\n" + card.signature + "\n```");
  }
  if (card.meta.length) {
    if (blocks.length) blocks.push("---");
    blocks.push(card.meta.join("\n\n"));
  }
  return blocks.join("\n\n");
}

/**
 * Project hover cards from a resolved cursor entity.
 *
 * Returns rendered markdown lines, or null for entity kinds
 * that don't produce hover content.
 */
export function collectTemplateHover(
  resolution: CursorResolutionResult,
): string[] | null {
  const { entity } = resolution;
  const debugEnabled = isDebugEnabled("workspace");

  if (debugEnabled) {
    debug.workspace("hover.entity", {
      kind: entity.kind,
      span: entity.span,
    });
  }

  const card = projectEntityCard(resolution);
  if (!card) {
    if (debugEnabled) {
      debug.workspace("hover.empty", { kind: entity.kind });
    }
    return null;
  }

  const rendered = renderCard(card);
  if (debugEnabled) {
    debug.workspace("hover.result", { kind: entity.kind, span: entity.span });
  }
  return [rendered];
}

/**
 * Merge hover detail lines into a single markdown string.
 * Deduplicates identical blocks.
 */
export function mergeHoverContents(
  detailLines: readonly string[],
): string | null {
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (const line of detailLines) {
    if (seen.has(line)) continue;
    seen.add(line);
    blocks.push(line);
  }
  return blocks.length ? blocks.join("\n\n") : null;
}

// ── Entity → Card dispatch ──────────────────────────────────────────────

function projectEntityCard(resolution: CursorResolutionResult): HoverCard | null {
  const { entity, expressionLabel } = resolution;

  switch (entity.kind) {
    // --- Resource entities ---
    case 'ce-tag': {
      const card: HoverCard = {
        signature: `(custom element) ${entity.name}`,
        meta: [],
      };
      appendResourceMeta(entity.element, card.meta);
      return card;
    }
    case 'ca-attr': {
      const card: HoverCard = {
        signature: `(custom attribute) ${entity.name}`,
        meta: [],
      };
      appendResourceMeta(entity.attribute, card.meta);
      return card;
    }
    case 'tc-attr': {
      const card: HoverCard = {
        signature: `(template controller) ${entity.name}`,
        meta: [],
      };
      // Iterator declaration (repeat.for="item of items")
      if (entity.iteratorCode) {
        card.meta.push(`\`${entity.iteratorCode}\``);
      }
      // Config bindables (if/else value, switch.bind, etc.)
      if (entity.controller?.props) {
        const bindableList = formatBindableListRich(entity.controller.props);
        if (bindableList) card.meta.push(bindableList);
      }
      // Contextual locals injected by the controller ($index, $first, etc.)
      const contextuals = entity.controller?.injects?.contextuals;
      if (contextuals?.length) {
        card.meta.push(`**Locals:** ${contextuals.map((c) => `\`${c}\``).join(", ")}`);
      }
      return card;
    }
    case 'bindable': {
      return buildBindableCard(entity);
    }
    case 'command': {
      return {
        signature: `(binding command) ${entity.name}`,
        meta: [],
      };
    }

    // --- Expression entities ---
    case 'scope-identifier': {
      const label = expressionLabel ?? entity.name;
      const typePart = displayableType(entity.type);
      return {
        signature: `(expression) ${label}${typePart}`,
        meta: [],
      };
    }
    case 'member-access': {
      const label = expressionLabel ?? entity.memberName;
      const typePart = displayableType(entity.memberType);
      return {
        signature: `(expression) ${label}${typePart}`,
        meta: entity.parentType ? [`*member of ${entity.parentType}*`] : [],
      };
    }
    case 'global-access': {
      const label = expressionLabel ?? entity.globalName;
      const typePart = displayableType(entity.globalType);
      return {
        signature: `(expression) ${label}${typePart}`,
        meta: [],
      };
    }
    case 'value-converter': {
      const card: HoverCard = {
        signature: `(value converter) ${entity.name}`,
        meta: [],
      };
      if (entity.converter) {
        appendConverterMeta(entity.converter, card.meta);
      }
      return card;
    }
    case 'binding-behavior': {
      const card: HoverCard = {
        signature: `(binding behavior) ${entity.name}`,
        meta: [],
      };
      if (entity.behavior) {
        const loc = formatSourceLocation(entity.behavior.file, entity.behavior.package);
        if (loc) card.meta.push(`*${loc}*`);
      }
      return card;
    }

    // --- Binding entities ---
    case 'plain-attr-binding': {
      if (entity.effectiveMode === null && entity.attributeName) {
        // Listener binding (effectiveMode null = event)
        return {
          signature: `(event) ${entity.attributeName}`,
          meta: [],
        };
      }
      return {
        signature: `(property) ${entity.attributeName}`,
        meta: [],
      };
    }

    // --- Scope entities ---
    case 'contextual-var': {
      return {
        signature: `(local) ${entity.name}: ${entity.type}`,
        meta: [],
      };
    }
    case 'scope-token': {
      const label = entity.token;
      const typePart = entity.resolvedType ? `: ${entity.resolvedType}` : '';
      return {
        signature: `(scope) ${label}${typePart}`,
        meta: [],
      };
    }
    case 'iterator-decl': {
      const typePart = entity.itemType ? `: ${entity.itemType}` : '';
      return {
        signature: `(iterator) ${entity.iteratorVar}${typePart}`,
        meta: [],
      };
    }

    // --- Template structure entities ---
    case 'interpolation':
      // Recurse on inner entity
      return projectEntityCard({ ...resolution, entity: entity.innerEntity });
    case 'au-slot': {
      return {
        signature: `(slot) ${entity.slotName}`,
        meta: entity.targetCEName ? [`*target: ${entity.targetCEName}*`] : [],
      };
    }
    case 'ref-target': {
      return {
        signature: `(ref) ${entity.variableName}`,
        meta: [`*target: ${entity.targetName}*`],
      };
    }
    case 'let-binding': {
      const typePart = entity.expressionType ? `: ${entity.expressionType}` : '';
      return {
        signature: `(let) ${entity.targetName}${typePart}`,
        meta: entity.toBindingContext ? ['*to-binding-context*'] : [],
      };
    }
    case 'as-element': {
      const card: HoverCard = {
        signature: `(as-element) ${entity.targetCEName}`,
        meta: [],
      };
      if (entity.targetCE) {
        appendResourceMeta(entity.targetCE, card.meta);
      }
      return card;
    }
    case 'import-from': {
      return {
        signature: `(import) ${entity.path}`,
        meta: [],
      };
    }
    case 'local-template-name': {
      return {
        signature: `(local template) ${entity.name}`,
        meta: [],
      };
    }
    case 'spread': {
      return {
        signature: `(spread) ${entity.spreadKind}`,
        meta: [],
      };
    }
    case 'plain-attr-fallback': {
      return {
        signature: `(attribute) ${entity.attributeName}`,
        meta: [],
      };
    }
    default:
      return null;
  }
}

// ── Bindable card builder ──────────────────────────────────────────────

function buildBindableCard(entity: { bindable: Bindable; parentKind: string; parentName: string }): HoverCard {
  const { bindable, parentKind, parentName } = entity;
  const card: HoverCard = { meta: [] };

  // Aurelia bindable — prefer the HTML attribute name (kebab-case)
  const displayName = bindable.attribute ?? bindable.name;
  let sig = `(bindable) ${displayName}`;
  if (bindable.type) {
    const typeStr = formatTypeRef(bindable.type);
    if (typeStr) sig += `: ${typeStr}`;
  }
  card.signature = sig;

  // Parent context
  const contextLabel = parentKind === 'element' ? 'component'
    : parentKind === 'attribute' ? 'attribute'
    : parentKind === 'controller' ? 'controller'
    : parentKind;
  card.meta.push(`*${contextLabel}: ${parentName}*`);

  const mode = formatBindingMode(bindable.mode);
  if (mode) card.meta.push(`**Mode:** \`${mode}\``);
  if (bindable.doc) card.meta.push(bindable.doc);

  return card;
}

// ── Formatting helpers ─────────────────────────────────────────────────

/** Format a type string for display, suppressing uninformative types. */
function displayableType(type: string | undefined | null): string {
  if (!type || type === "unknown") return "";
  return `: ${type}`;
}

function formatSourceLocation(file?: string | null, pkg?: string | null): string | null {
  if (pkg) return pkg;
  if (file) return file;
  return null;
}

function formatBindableListRich(bindables: Readonly<Record<string, Bindable>>): string | null {
  const entries = Object.values(bindables);
  if (entries.length === 0) return null;
  const parts = entries.map((b) => {
    let part = `\`${b.attribute ?? b.name}\``;
    if (b.primary) part += " *(primary)*";
    if (b.mode && b.mode !== "default") part += ` *(${formatBindingModeDisplay(b.mode)})*`;
    return part;
  });
  return `**Bindables:** ${parts.join(", ")}`;
}

function formatBindingMode(mode?: BindingMode | null): string | null {
  if (!mode || mode === "default") return null;
  return formatBindingModeDisplay(mode);
}

const BINDING_MODE_DISPLAY: Record<string, string> = {
  oneTime: "one-time",
  toView: "to-view",
  fromView: "from-view",
  twoWay: "two-way",
};

function formatBindingModeDisplay(mode: string): string {
  return BINDING_MODE_DISPLAY[mode] ?? mode;
}

function formatTypeRef(type?: TypeRef | null): string | null {
  if (!type) return null;
  if (type.kind === "ts") return type.name;
  if (type.kind === "any" || type.kind === "unknown") return null;
  return null;
}

function appendResourceMeta(
  def: ElementRes | AttrRes,
  meta: string[],
): void {
  const loc = formatSourceLocation(def.file, def.package);
  if (loc) meta.push(`*${loc}*`);
  const bindableList = formatBindableListRich(def.bindables);
  if (bindableList) meta.push(bindableList);
}

function appendConverterMeta(
  sig: ValueConverterSig,
  meta: string[],
): void {
  const loc = formatSourceLocation(sig.file, sig.package);
  if (loc) meta.push(`*${loc}*`);
  const inType = formatTypeRef(sig.in);
  const outType = formatTypeRef(sig.out);
  if (inType && outType) {
    meta.push(`**Signature:** \`toView(${inType}): ${outType}\``);
  }
}

// ── Translation key parsing ─────────────────────────────────────────────

/**
 * Parse an i18n translation key into its components.
 *
 * Aurelia i18n keys follow: `[target]namespace.key` or `namespace.key`
 * - Bracket prefix `[title]` sets the target attribute
 * - Dotted path splits into namespace (first segment) and key (rest)
 */
export function parseTranslationKey(raw: string): { target: string | null; namespace: string | null; key: string | null } {
  let target: string | null = null;
  let keyPath = raw;

  const bracketMatch = /^\[([^\]]+)\](.*)$/.exec(keyPath);
  if (bracketMatch) {
    target = bracketMatch[1] ?? null;
    keyPath = bracketMatch[2] ?? "";
  }

  const dotIndex = keyPath.indexOf(".");
  if (dotIndex >= 0) {
    return {
      target,
      namespace: keyPath.slice(0, dotIndex),
      key: keyPath.slice(dotIndex + 1),
    };
  }

  return { target, namespace: null, key: keyPath || null };
}
