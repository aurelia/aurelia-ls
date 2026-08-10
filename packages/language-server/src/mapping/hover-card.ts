/** Product limits for the compact, native Aurelia hover card. */
export const HOVER_CARD_MARKDOWN_LIMIT = 640;
export const HOVER_CARD_LOGICAL_LINE_LIMIT = 6;
export const HOVER_CARD_SECTION_LIMIT = 3;
export const HOVER_CARD_AUTHORED_TOKEN_LIMIT = 80;
export const HOVER_CARD_SIGNATURE_SOFT_LIMIT = 160;
export const HOVER_CARD_SIGNATURE_HARD_LIMIT = 300;
export const HOVER_CARD_CONTEXT_LINE_LIMIT = 160;
export const HOVER_CARD_DIAGNOSTIC_LINE_LIMIT = 240;
export const HOVER_CARD_UNCERTAINTY_LINE_LIMIT = 160;

export type HoverCardCodeLanguage = "html" | "text" | "ts";

export interface HoverCardIdentity {
  readonly language: HoverCardCodeLanguage;
  /** Product-owned syntax before the exact authored identity. */
  readonly prefix?: string;
  /** Exact authored identity. The renderer clips it but never normalizes it. */
  readonly authored: string;
  /** Product-owned syntax after the exact authored identity. */
  readonly suffix?: string;
  /** Optional raw code/type detail; omitted before the authored identity is reduced. */
  readonly typeDetail?: string | null;
}

export interface HoverCardContextClause {
  /** Product prose before the optional value. */
  readonly prefix: string;
  /** One raw inline-code value, or product prose when `valueKind` is `prose`. */
  readonly value?: string | null;
  readonly valueKind?: "code" | "prose";
  /** Product prose after the optional value. */
  readonly suffix?: string;
}

export interface HoverCardContextLine extends HoverCardContextClause {
  /** Tertiary lines are shed before ordinary optional context. */
  readonly priority?: "optional" | "tertiary";
  /** Optional lower-priority clause rendered on this same logical line when the budget permits. */
  readonly tertiary?: HoverCardContextClause | null;
}

export interface HoverCardDiagnosticStatus {
  readonly kind: "diagnostic";
  readonly severity: "error" | "information" | "warning";
  readonly code: string;
  readonly summary: string;
}

export interface HoverCardUncertaintyStatus {
  readonly kind: "uncertainty";
  /** Stable, translated author-facing category; never an internal missing-input key. */
  readonly category: string;
  readonly detail?: string | null;
}

export type HoverCardStatus = HoverCardDiagnosticStatus | HoverCardUncertaintyStatus;

export interface HoverCard {
  readonly identity?: HoverCardIdentity | null;
  readonly context?: readonly HoverCardContextLine[];
  readonly status?: HoverCardStatus | null;
}

interface PreparedIdentity {
  readonly language: HoverCardCodeLanguage;
  readonly fixed: string;
  readonly typeDetail: string;
}

interface PreparedContextLine {
  readonly priority: "optional" | "tertiary";
  readonly primary: PreparedContextClause;
  readonly tertiary: PreparedContextClause | null;
}

interface PreparedContextClause {
  readonly prefix: string;
  readonly value: string;
  readonly valueKind: "code" | "prose";
  readonly suffix: string;
}

interface RenderState {
  readonly identity: PreparedIdentity | null;
  readonly context: readonly PreparedContextLine[];
  readonly status: HoverCardStatus | null;
  readonly includedContext: readonly boolean[];
  readonly includedTertiaryContext: readonly boolean[];
  readonly typeAllowance: number;
  readonly statusDetailAllowance: number;
}

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * Render one bounded native-hover card. The input is semantic structure, not trusted Markdown.
 * Empty cards and mandatory skeletons that cannot fit fail closed.
 */
export function renderHoverCard(card: HoverCard): string | null {
  const requestedIdentity = card.identity ?? null;
  const requestedStatus = card.status ?? null;
  const identity = prepareIdentity(requestedIdentity);
  const context = (card.context ?? [])
    .slice(0, 2)
    .map(prepareContextLine)
    .filter((line): line is PreparedContextLine => line != null);
  const status = prepareStatus(requestedStatus);
  if (requestedIdentity != null && identity == null) return null;
  if (requestedStatus != null && status == null) return null;
  if (identity == null && status == null) return null;

  const initial: RenderState = {
    identity,
    context,
    status,
    includedContext: context.map(() => true),
    includedTertiaryContext: context.map((line) => line.tertiary != null),
    typeAllowance: identity == null ? 0 : codePointLength(identity.typeDetail),
    statusDetailAllowance: statusDetailLength(status),
  };
  let state = initial;
  let rendered = renderState(state);
  if (rendered == null) return null;

  for (let index = state.context.length - 1; index >= 0 && markdownLength(rendered) > HOVER_CARD_MARKDOWN_LIMIT; index -= 1) {
    if (state.includedTertiaryContext[index] !== true) continue;
    const includedTertiaryContext = [...state.includedTertiaryContext];
    includedTertiaryContext[index] = false;
    state = { ...state, includedTertiaryContext };
    rendered = renderState(state);
    if (rendered == null) return null;
  }

  for (const priority of ["tertiary", "optional"] as const) {
    for (let index = state.context.length - 1; index >= 0 && markdownLength(rendered) > HOVER_CARD_MARKDOWN_LIMIT; index -= 1) {
      if (state.includedContext[index] !== true || state.context[index]?.priority !== priority) continue;
      const includedContext = [...state.includedContext];
      includedContext[index] = false;
      state = { ...state, includedContext };
      rendered = renderState(state);
      if (rendered == null) return null;
    }
  }

  while (
    markdownLength(rendered) > HOVER_CARD_MARKDOWN_LIMIT
    && state.typeAllowance > 0
  ) {
    state = { ...state, typeAllowance: previousGraphemeAllowance(state.identity?.typeDetail ?? "", state.typeAllowance) };
    rendered = renderState(state);
    if (rendered == null) return null;
  }

  while (
    markdownLength(rendered) > HOVER_CARD_MARKDOWN_LIMIT
    && state.statusDetailAllowance > 0
  ) {
    state = {
      ...state,
      statusDetailAllowance: previousGraphemeAllowance(statusDetail(state.status), state.statusDetailAllowance),
    };
    rendered = renderState(state);
    if (rendered == null) return null;
  }

  return markdownLength(rendered) <= HOVER_CARD_MARKDOWN_LIMIT ? rendered : null;
}

export function hoverCardMarkdownCodePointLength(markdown: string): number {
  return markdownLength(markdown);
}

function prepareIdentity(identity: HoverCardIdentity | null): PreparedIdentity | null {
  if (identity == null) return null;
  const authored = clipLeaf(identity.authored, HOVER_CARD_AUTHORED_TOKEN_LIMIT);
  if (authored.length === 0) return null;
  const fixed = `${identity.prefix ?? ""}${authored}${identity.suffix ?? ""}`;
  if (/\r|\n/u.test(fixed) || /\r|\n/u.test(identity.typeDetail ?? "")) return null;
  if (codePointLength(fixed) > HOVER_CARD_SIGNATURE_HARD_LIMIT) return null;
  // The ordinary one-line signature targets 160 code points. The 300-point hard limit only
  // protects mandatory product syntax plus the authored identity when that fixed skeleton is long.
  const maximumTypeLength = Math.max(0, HOVER_CARD_SIGNATURE_SOFT_LIMIT - codePointLength(fixed));
  const typeDetail = clipLeaf(identity.typeDetail ?? "", maximumTypeLength);
  return { language: identity.language, fixed, typeDetail };
}

function prepareContextLine(line: HoverCardContextLine): PreparedContextLine | null {
  const primary = prepareContextClause(line);
  if (primary == null) return null;
  let tertiary = line.tertiary == null ? null : prepareContextClause(line.tertiary);
  if (
    tertiary != null
    && codePointLength(`${contextClauseVisibleValue(primary)} ${contextClauseVisibleValue(tertiary)}`)
      > HOVER_CARD_CONTEXT_LINE_LIMIT
  ) {
    tertiary = null;
  }
  return { priority: line.priority ?? "optional", primary, tertiary };
}

function prepareContextClause(clause: HoverCardContextClause): PreparedContextClause | null {
  const prefix = normalizeProse(clause.prefix);
  const suffix = normalizeProse(clause.suffix ?? "");
  const valueKind = clause.valueKind ?? "code";
  if (valueKind === "code" && /\r|\n/u.test(clause.value ?? "")) return null;
  const rawValue = valueKind === "prose" ? normalizeProse(clause.value ?? "") : clause.value ?? "";
  if (rawValue.length === 0) {
    const separator = prefix.length > 0 && suffix.length > 0 && !/^\p{P}/u.test(suffix) ? " " : "";
    return {
      prefix: clipLeaf(`${prefix}${separator}${suffix}`, HOVER_CARD_CONTEXT_LINE_LIMIT),
      value: "",
      valueKind,
      suffix: "",
    };
  }
  const prefixSeparatorLength = prefix.length > 0 ? 1 : 0;
  const suffixSeparatorLength = suffix.length > 0 && !/^\p{P}/u.test(suffix) ? 1 : 0;
  const fixedLength = codePointLength(prefix)
    + prefixSeparatorLength
    + codePointLength(suffix)
    + suffixSeparatorLength;
  if (fixedLength >= HOVER_CARD_CONTEXT_LINE_LIMIT) {
    return null;
  }
  const value = clipLeaf(rawValue, Math.max(0, HOVER_CARD_CONTEXT_LINE_LIMIT - fixedLength));
  return {
    prefix,
    value,
    valueKind,
    suffix,
  };
}

function prepareStatus(status: HoverCardStatus | null): HoverCardStatus | null {
  if (status == null) return null;
  if (status.kind === "diagnostic") {
    const severity = status.severity;
    const label = severityLabel(severity);
    if (label == null) return null;
    if (/\r|\n/u.test(status.code)) return null;
    const code = clipLeaf(status.code, HOVER_CARD_AUTHORED_TOKEN_LIMIT);
    if (code.length === 0) return null;
    const fixedLength = codePointLength(label) + 1 + codePointLength(code) + 2;
    const normalizedSummary = normalizeProse(status.summary);
    const duplicateCodePrefix = `${code}: `;
    const summary = code === status.code && normalizedSummary.startsWith(duplicateCodePrefix)
      ? normalizedSummary.slice(duplicateCodePrefix.length)
      : normalizedSummary;
    return {
      kind: "diagnostic",
      severity,
      code,
      summary: clipLeaf(
        summary,
        Math.max(0, HOVER_CARD_DIAGNOSTIC_LINE_LIMIT - fixedLength),
      ),
    };
  }
  const category = clipLeaf(normalizeProse(status.category), HOVER_CARD_UNCERTAINTY_LINE_LIMIT);
  if (category.length === 0) return null;
  const remaining = Math.max(0, HOVER_CARD_UNCERTAINTY_LINE_LIMIT - codePointLength(category) - 2);
  return {
    kind: "uncertainty",
    category,
    detail: clipLeaf(normalizeProse(status.detail ?? ""), remaining),
  };
}

function renderState(state: RenderState): string | null {
  const sections: string[] = [];
  let logicalLines = 0;

  if (state.identity != null) {
    const typeDetail = clipLeaf(state.identity.typeDetail, state.typeAllowance);
    sections.push(fencedCode(state.identity.language, `${state.identity.fixed}${typeDetail}`));
    logicalLines += 1;
  }

  const contextLines = state.context.flatMap((line, index) =>
    state.includedContext[index] === true
      ? [renderContextLine(line, state.includedTertiaryContext[index] === true)]
      : []
  ).filter((line) => line.length > 0);
  if (contextLines.length > 0) {
    sections.push(contextLines.join("\n"));
    logicalLines += contextLines.length;
  }

  const status = renderStatus(state.status, state.statusDetailAllowance);
  if (status.length > 0) {
    sections.push(status);
    logicalLines += 1;
  }

  if (
    sections.length === 0
    || sections.length > HOVER_CARD_SECTION_LIMIT
    || logicalLines > HOVER_CARD_LOGICAL_LINE_LIMIT
  ) {
    return null;
  }
  return sections.join("\n\n");
}

function renderContextLine(line: PreparedContextLine, includeTertiary: boolean): string {
  const primary = renderContextClause(line.primary);
  const tertiary = includeTertiary && line.tertiary != null
    ? renderContextClause(line.tertiary)
    : "";
  return [primary, tertiary].filter((part) => part.length > 0).join(" ");
}

function renderContextClause(line: PreparedContextClause): string {
  const prefix = escapeMarkdownProse(line.prefix);
  const value = line.value.length === 0
    ? ""
    : line.valueKind === "code"
      ? inlineCode(line.value)
      : escapeMarkdownProse(line.value);
  const suffix = escapeMarkdownProse(line.suffix);
  const prefixSeparator = prefix.length > 0 && value.length > 0 ? " " : "";
  const suffixSeparator = value.length > 0 && suffix.length > 0 && !/^\p{P}/u.test(suffix) ? " " : "";
  return `${prefix}${prefixSeparator}${value}${suffixSeparator}${suffix}`.trim();
}

function contextClauseVisibleValue(line: PreparedContextClause): string {
  const prefixSeparator = line.prefix.length > 0 && line.value.length > 0 ? " " : "";
  const suffixSeparator = line.value.length > 0
    && line.suffix.length > 0
    && !/^\p{P}/u.test(line.suffix)
    ? " "
    : "";
  return `${line.prefix}${prefixSeparator}${line.value}${suffixSeparator}${line.suffix}`.trim();
}

function renderStatus(status: HoverCardStatus | null, detailAllowance: number): string {
  if (status == null) return "";
  if (status.kind === "diagnostic") {
    const label = severityLabel(status.severity);
    if (label == null) return "";
    const summary = clipLeaf(status.summary, detailAllowance);
    const fixed = `${escapeMarkdownProse(label)} ${inlineCode(status.code)}`;
    return summary.length === 0 ? fixed : `${fixed}: ${escapeMarkdownProse(summary)}`;
  }
  const detail = clipLeaf(status.detail ?? "", detailAllowance);
  const category = escapeMarkdownProse(status.category);
  return detail.length === 0 ? category : `${category}: ${escapeMarkdownProse(detail)}`;
}

function statusDetail(status: HoverCardStatus | null): string {
  if (status == null) return "";
  return status.kind === "diagnostic" ? status.summary : status.detail ?? "";
}

function statusDetailLength(status: HoverCardStatus | null): number {
  return codePointLength(statusDetail(status));
}

function severityLabel(severity: HoverCardDiagnosticStatus["severity"]): string | null {
  switch (severity) {
    case "error": return "Error";
    case "information": return "Information";
    case "warning": return "Warning";
    default: return null;
  }
}

function fencedCode(language: HoverCardCodeLanguage, value: string): string {
  const delimiter = "`".repeat(Math.max(3, longestBacktickRun(value) + 1));
  return `${delimiter}${language}\n${value}${value.endsWith("\n") ? "" : "\n"}${delimiter}`;
}

function inlineCode(value: string): string {
  const delimiter = "`".repeat(Math.max(1, longestBacktickRun(value) + 1));
  const needsPadding = /^[\s`]|[\s`]$/u.test(value);
  const padding = needsPadding ? " " : "";
  return `${delimiter}${padding}${value}${padding}${delimiter}`;
}

function longestBacktickRun(value: string): number {
  let longest = 0;
  let current = 0;
  for (const character of value) {
    if (character === "`") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function normalizeProse(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function escapeMarkdownProse(value: string): string {
  return value
    .replace(/([\\`*_[\]<>~])/gu, "\\$1")
    .replace(/^([\p{Zs}\t]*)([#>+-]|\d+\.)(?=\s)/u, "$1\\$2");
}

function clipLeaf(value: string, allowance: number): string {
  if (allowance <= 0 || value.length === 0) return "";
  if (codePointLength(value) <= allowance) return value;
  if (allowance === 1) return "…";

  const contentAllowance = allowance - 1;
  const graphemes = segmentGraphemes(value);
  let consumed = 0;
  let end = 0;
  let boundary = -1;
  const minimumBoundary = Math.ceil(contentAllowance / 2);
  for (let index = 0; index < graphemes.length; index += 1) {
    const grapheme = graphemes[index] ?? "";
    const length = codePointLength(grapheme);
    if (consumed + length > contentAllowance) break;
    const before = consumed;
    consumed += length;
    end = index + 1;
    if (/^\s+$/u.test(grapheme)) {
      if (before >= minimumBoundary) boundary = index;
    } else if (/\p{P}$/u.test(grapheme) && consumed >= minimumBoundary) {
      boundary = index + 1;
    }
  }
  const clippedEnd = boundary >= 0 ? boundary : end;
  return `${graphemes.slice(0, clippedEnd).join("")}…`;
}

function previousGraphemeAllowance(value: string, allowance: number): number {
  if (allowance <= 0) return 0;
  const graphemes = segmentGraphemes(value);
  let consumed = 0;
  let previous = 0;
  for (const grapheme of graphemes) {
    const next = consumed + codePointLength(grapheme);
    if (next >= allowance) return previous;
    previous = next;
    consumed = next;
  }
  return previous;
}

function segmentGraphemes(value: string): string[] {
  return Array.from(graphemeSegmenter.segment(value), (segment) => segment.segment);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function markdownLength(markdown: string): number {
  return codePointLength(markdown);
}
