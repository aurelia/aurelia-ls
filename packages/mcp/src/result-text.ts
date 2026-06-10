export function aureliaMcpResultText(value: unknown): string {
  if (isRecord(value)) {
    const tool = typeof value.tool === 'string' ? value.tool : 'aurelia';
    const payload = value.value;
    if (isSemanticAnswer(payload)) {
      const displayText = semanticAnswerDisplayText(payload);
      if (displayText != null) {
        return `${tool}: ${payload.summary}\n${displayText}`;
      }
      return `${tool}: ${payload.summary}`;
    }
    if (isRecord(payload)) {
      const lines = [`${tool}: returned structured semantic-runtime content.`];
      const displayText = topLevelDisplayText(payload);
      if (displayText != null) {
        lines.push(displayText);
      }
      for (const [key, child] of Object.entries(payload)) {
        if (isSemanticAnswer(child)) {
          lines.push(`${key}: ${child.summary}`);
        }
      }
      return lines.join('\n');
    }
    return `${tool}: returned structured content.`;
  }
  return 'Aurelia MCP returned structured content.';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isSemanticAnswer(value: unknown): value is { readonly summary: string } {
  return isRecord(value) && typeof value.summary === 'string';
}

function semanticAnswerDisplayText(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const lines: string[] = [];
  if (isRecord(value.value) && typeof value.value.displayText === 'string') {
    lines.push(value.value.displayText);
  } else {
    const displayText = topLevelDisplayText(value);
    if (displayText != null) {
      lines.push(displayText);
    }
  }
  const page = semanticAnswerPageText(value.page);
  if (page != null) {
    lines.push(page);
  }
  const rowPreview = semanticAnswerRowPreview(value.value);
  if (rowPreview != null) {
    lines.push(rowPreview);
  }
  const continuations = semanticAnswerContinuationText(value);
  if (continuations != null) {
    lines.push(continuations);
  }
  const nestedContinuations = nestedSemanticAnswerContinuationText(value.value);
  if (nestedContinuations != null) {
    lines.push(nestedContinuations);
  }
  return lines.length === 0 ? null : lines.join('\n');
}

function topLevelDisplayText(value: unknown): string | null {
  return isRecord(value) && typeof value.displayText === 'string'
    ? value.displayText
    : null;
}

function semanticAnswerPageText(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const returned = typeof value.returnedRows === 'number' ? value.returnedRows : null;
  const total = typeof value.totalRows === 'number' ? value.totalRows : null;
  const size = typeof value.size === 'number' ? value.size : null;
  const nextCursor = typeof value.nextCursor === 'string' ? value.nextCursor : null;
  const clamped = value.clamped === true && typeof value.requestedSize === 'number' && typeof value.maxSize === 'number'
    ? ` Clamped requested size ${value.requestedSize} to max ${value.maxSize}.`
    : '';
  if (returned == null && size == null && nextCursor == null) {
    return clamped.length === 0 ? null : `Page:${clamped}`;
  }
  return [
    `Page: returned ${returned ?? '?'}${total == null ? '' : ` of ${total}`} row(s)`,
    size == null ? '' : ` at size ${size}`,
    nextCursor == null ? '.' : `; nextCursor=${nextCursor}.`,
    clamped,
  ].join('');
}

function semanticAnswerRowPreview(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.rows) || value.rows.length === 0) {
    return null;
  }
  const rows = value.rows
    .filter(isRecord)
    .slice(0, 3)
    .map(compactRowPreviewText)
    .filter((text) => text.length > 0);
  if (rows.length === 0) {
    return null;
  }
  const remaining = value.rows.length - rows.length;
  return `Rows: ${rows.join(' | ')}${remaining > 0 ? ` | +${remaining} more in structuredContent` : ''}.`;
}

const ROW_PREVIEW_KEYS = [
  'queryKind',
  'kind',
  'domain',
  'severity',
  'name',
  'sourceName',
  'targetName',
  'definitionName',
  'memberName',
  'route',
  'path',
  'filePath',
  'expression',
  'sourceExpression',
  'targetExpression',
  'message',
  'summary',
] as const;

function compactRowPreviewText(row: Record<string, unknown>): string {
  const preferred = ROW_PREVIEW_KEYS
    .filter((key) => key in row)
    .map((key) => compactRowField(key, row[key]))
    .filter((text): text is string => text != null)
    .slice(0, 5);
  if (preferred.length > 0) {
    return preferred.join(', ');
  }
  return Object.entries(row)
    .filter(([, value]) => isCompactScalar(value))
    .slice(0, 4)
    .map(([key, value]) => compactRowField(key, value))
    .filter((text): text is string => text != null)
    .join(', ');
}

function compactRowField(key: string, value: unknown): string | null {
  if (!isCompactScalar(value)) {
    return null;
  }
  const rendered = String(value);
  const compact = rendered.length > 80 ? `${rendered.slice(0, 77)}...` : rendered;
  return `${key}=${compact}`;
}

function isCompactScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function semanticAnswerContinuationText(value: Record<string, unknown>): string | null {
  if (!Array.isArray(value.continuations) || value.continuations.length === 0) {
    return null;
  }
  const rows = value.continuations
    .filter(isRecord)
    .slice(0, 4)
    .map(compactContinuationText);
  const remaining = value.continuations.length - rows.length;
  return `Continuations: ${rows.join('; ')}${remaining > 0 ? `; +${remaining} more` : ''}.`;
}

function nestedSemanticAnswerContinuationText(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    return null;
  }
  const rows: string[] = [];
  for (const child of value.rows) {
    if (!isRecord(child) || !isRecord(child.answer)) {
      continue;
    }
    const continuations = child.answer.continuations;
    if (!Array.isArray(continuations) || continuations.length === 0) {
      continue;
    }
    const label = typeof child.queryKind === 'string'
      ? child.queryKind
      : typeof child.index === 'number'
        ? `#${child.index}`
        : 'child';
    for (const continuation of continuations.filter(isRecord).slice(0, 2)) {
      rows.push(`${label} -> ${compactContinuationText(continuation)}`);
      if (rows.length >= 4) {
        return `Child continuations: ${rows.join('; ')}; +more.`;
      }
    }
  }
  return rows.length === 0 ? null : `Child continuations: ${rows.join('; ')}.`;
}

function compactContinuationText(row: Record<string, unknown>): string {
  const target = typeof row.targetQueryKind === 'string'
    ? row.targetQueryKind
    : typeof row.targetAppBuilderQueryKind === 'string'
      ? row.targetAppBuilderQueryKind
      : typeof row.kind === 'string'
        ? row.kind
        : 'unknown';
  const intents = Array.isArray(row.intents)
    ? row.intents.filter((value): value is string => typeof value === 'string').join(',')
    : '';
  const evidence = isRecord(row.evidence)
    ? [row.evidence.evidenceState, row.evidence.coverage, row.evidence.sourcePrecision]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join('/')
    : '';
  const blockers = Array.isArray(row.blockers) && row.blockers.length > 0
    ? ` blocked=${row.blockers.length}`
    : '';
  return `${target}${intents.length > 0 ? ` [${intents}]` : ''}${evidence.length > 0 ? ` (${evidence})` : ''}${blockers}`;
}
