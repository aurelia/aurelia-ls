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
  const analysisDepth = semanticAnswerAnalysisDepthText(value.analysisDepth);
  if (analysisDepth != null) {
    lines.push(analysisDepth);
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

function semanticAnswerAnalysisDepthText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0
    ? `Analysis depth used: ${value}.`
    : null;
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
  const byteClamped = value.byteClamped === true
    && typeof value.estimatedRowsJsonBytes === 'number'
    && typeof value.maxRowsJsonBytes === 'number'
    ? ` Row payload budget stopped this page at ~${value.estimatedRowsJsonBytes} JSON byte(s) of max ${value.maxRowsJsonBytes}.`
    : '';
  if (returned == null && size == null && nextCursor == null) {
    const text = `${clamped}${byteClamped}`;
    return text.length === 0 ? null : `Page:${text}`;
  }
  return [
    `Page: returned ${returned ?? '?'}${total == null ? '' : ` of ${total}`} row(s)`,
    size == null ? '' : ` at size ${size}`,
    nextCursor == null ? '.' : `; nextCursor=${nextCursor}.`,
    clamped,
    byteClamped,
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
  'id',
  'title',
  'label',
  'queryKind',
  'kind',
  'seamKindKey',
  'domain',
  'severity',
  'name',
  'source',
  'target',
  'sourceName',
  'targetName',
  'definitionName',
  'memberName',
  'route',
  'path',
  'filePath',
  'rawRowCount',
  'variantCount',
  'attemptKinds',
  'boundaryKinds',
  'reasonKinds',
  'expression',
  'sourceExpression',
  'targetExpression',
  'message',
  'sampleSummary',
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
  const rendered = compactRowFieldValue(value);
  if (rendered == null) {
    return null;
  }
  const compact = compactRenderedRowField(key, rendered);
  return `${key}=${compact}`;
}

function compactRenderedRowField(key: string, rendered: string): string {
  const maxLength = rowFieldMaxLength(key);
  if (rendered.length <= maxLength) {
    return rendered;
  }
  if (isPathLikeRowField(key, rendered)) {
    return compactPathLikeField(rendered, maxLength);
  }
  return `${rendered.slice(0, Math.max(0, maxLength - 3))}...`;
}

function rowFieldMaxLength(key: string): number {
  switch (key) {
    case 'message':
    case 'sampleSummary':
    case 'summary':
      return 160;
    case 'source':
    case 'target':
    case 'path':
    case 'filePath':
      return 120;
    default:
      return 80;
  }
}

function isPathLikeRowField(key: string, rendered: string): boolean {
  return key === 'source'
    || key === 'target'
    || key === 'path'
    || key === 'filePath'
    || rendered.includes('/')
    || rendered.includes('\\');
}

function compactPathLikeField(rendered: string, maxLength: number): string {
  const normalized = rendered.replaceAll('\\', '/');
  const markerIndex = normalized.lastIndexOf('@');
  const suffix = markerIndex >= 0 ? normalized.slice(markerIndex) : '';
  const pathPart = markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized;
  const prefix = '.../';
  const availablePath = maxLength - prefix.length - suffix.length;
  if (availablePath <= 8) {
    return `${prefix}${normalized.slice(-(maxLength - prefix.length))}`;
  }
  return `${prefix}${pathPart.slice(-availablePath)}${suffix}`;
}

function isCompactScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function compactRowFieldValue(value: unknown): string | null {
  if (isCompactScalar(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const compactValues = value
      .map(compactRowFieldValue)
      .filter((text): text is string => text != null)
      .slice(0, 4);
    if (compactValues.length === 0) {
      return null;
    }
    return compactValues.length < value.length
      ? `[${compactValues.join('|')}|+${value.length - compactValues.length}]`
      : `[${compactValues.join('|')}]`;
  }
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.label === 'string') {
    return value.label;
  }
  if (typeof value.path === 'string') {
    const start = typeof value.start === 'number' ? `@${value.start}` : '';
    return `${value.path}${start}`;
  }
  return null;
}

function semanticAnswerContinuationText(value: Record<string, unknown>): string | null {
  if (!Array.isArray(value.continuations) || value.continuations.length === 0) {
    return null;
  }
  const rows = orderedContinuationRows(value.continuations)
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
    for (const continuation of orderedContinuationRows(continuations).slice(0, 2)) {
      rows.push(`${label} -> ${compactContinuationText(continuation)}`);
      if (rows.length >= 4) {
        return `Child continuations: ${rows.join('; ')}; +more.`;
      }
    }
  }
  return rows.length === 0 ? null : `Child continuations: ${rows.join('; ')}.`;
}

function orderedContinuationRows(rows: readonly unknown[]): Record<string, unknown>[] {
  return rows
    .filter(isRecord)
    .map((row, index) => ({ row, index }))
    .sort((left, right) =>
      continuationTextPriority(left.row) - continuationTextPriority(right.row)
      || left.index - right.index
    )
    .map((entry) => entry.row);
}

function continuationTextPriority(row: Record<string, unknown>): number {
  // Public DTO wire value from InquiryContinuationKind.NextPage. The page line
  // already exposes nextCursor, so compact text should lead with semantic
  // follow-ups such as summaries/sites before repeating the same query.
  return row.kind === 'next-page' ? 10 : 0;
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
