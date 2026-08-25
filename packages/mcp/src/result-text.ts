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
      const patternText = patternPayloadDisplayText(payload);
      if (patternText != null) {
        return `${tool}: ${patternText}`;
      }
      const displayText = topLevelDisplayText(payload);
      const semanticChildren: { key: string; child: { readonly summary: string } }[] = [];
      for (const [key, child] of Object.entries(payload)) {
        if (isSemanticAnswer(child)) {
          semanticChildren.push({ key, child });
        }
      }
      if (displayText != null && semanticChildren.length === 0) {
        return `${tool}: ${displayText}`;
      }
      const lines = [`${tool}: returned structured content.`];
      if (displayText != null) {
        lines.push(displayText);
      }
      for (const { key, child } of semanticChildren) {
        lines.push(`${key}: ${child.summary}`);
      }
      return lines.join('\n');
    }
    return `${tool}: returned structured content.`;
  }
  return 'Aurelia MCP returned structured content.';
}

function patternPayloadDisplayText(payload: Record<string, unknown>): string | null {
  if (Array.isArray(payload.items) && !('query' in payload) && payload.items.every(isPatternMenuItem)) {
    if (payload.items.length === 0) {
      return 'Pattern menu returned no results.';
    }
    const rows = payload.items
      .slice(0, 8)
      .map((item) => `${item.patternId}: ${item.title}`);
    const remaining = payload.items.length - rows.length;
    return `Pattern menu returned ${payload.items.length} result(s): ${rows.join(' | ')}${remaining > 0 ? ` | +${remaining} more` : ''}.`;
  }
  if (isPatternExample(payload)) {
    const filePaths = payload.source.files
      .slice(0, 4)
      .map((file) => file.path);
    const remainingFiles = payload.source.files.length - filePaths.length;
    const followUp = Array.isArray(payload.support.followUp)
      ? payload.support.followUp
        .filter(isPatternFollowUp)
        .map((row) => row.queryKind == null ? row.tool : `${row.tool}:${row.queryKind}`)
      : [];
    return [
      `Pattern ${payload.patternId}: ${payload.title}.`,
      payload.guidance.summary,
      `Files: ${filePaths.join(', ')}${remainingFiles > 0 ? `, +${remainingFiles} more` : ''}.`,
      followUp.length === 0 ? '' : `Follow-up: ${followUp.join(', ')}.`,
    ].filter((part) => part.length > 0).join(' ');
  }
  return null;
}

function isPatternMenuItem(value: unknown): value is { patternId: string; title: string; summary: string } {
  return isRecord(value)
    && typeof value.patternId === 'string'
    && typeof value.title === 'string'
    && typeof value.summary === 'string';
}

function isPatternExample(value: Record<string, unknown>): value is {
  patternId: string;
  title: string;
  guidance: { summary: string };
  source: { files: readonly { path: string }[] };
  support: { followUp?: readonly unknown[] };
} {
  return typeof value.patternId === 'string'
    && typeof value.title === 'string'
    && isRecord(value.guidance)
    && typeof value.guidance.summary === 'string'
    && isRecord(value.source)
    && Array.isArray(value.source.files)
    && value.source.files.every((file) => isRecord(file) && typeof file.path === 'string')
    && isRecord(value.support);
}

function isPatternFollowUp(value: unknown): value is { tool: string; queryKind?: string } {
  return isRecord(value)
    && typeof value.tool === 'string'
    && (value.queryKind == null || typeof value.queryKind === 'string');
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
  const answerState = semanticAnswerStateText(value);
  if (answerState != null) {
    lines.push(answerState);
  }
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

function semanticAnswerStateText(value: Record<string, unknown>): string | null {
  const states: string[] = [];
  if (typeof value.result === 'string' && value.result !== 'answered') {
    states.push(`result=${value.result}`);
  }
  if (typeof value.selection === 'string' && value.selection !== 'exact' && value.selection !== 'not-applicable') {
    states.push(`selection=${value.selection}`);
  }
  if (typeof value.coverage === 'string' && value.coverage !== 'complete') {
    states.push(`coverage=${value.coverage}`);
  }
  return states.length === 0 ? null : `Answer state: ${states.join('; ')}.`;
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
    ? ` Row payload target stopped this page at ~${value.estimatedRowsJsonBytes} JSON byte(s) against target ${value.maxRowsJsonBytes}.`
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
  const preview = `${rows.join(' | ')}${remaining > 0 ? ` | +${remaining} more in structuredContent` : ''}`;
  return `Rows: ${preview}${/[.!?]$/u.test(preview) ? '' : '.'}`;
}

const ROW_PREVIEW_KEYS = [
  'id',
  'title',
  'label',
  'queryKind',
  'kind',
  'diagnosticKind',
  'siteKind',
  'demandKind',
  'requiredCapability',
  'admissionState',
  'availabilityState',
  'actionability',
  'authoredName',
  'recommendedModuleName',
  'blockingOpenSeamCount',
  'seamKindKey',
  'seamKindKeys',
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
  'boundaryKinds',
  'pressureKind',
  'pressureKinds',
  'affectedMaterializationCount',
  'affectedProductCount',
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
  if (typeof value.filePath === 'string') {
    const start = typeof value.start === 'number' ? `@${value.start}` : '';
    return `${value.filePath}${start}`;
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
  const evidence = compactContinuationEvidenceText(row.evidence);
  const blockers = Array.isArray(row.blockers) && row.blockers.length > 0
    ? ` blocked=${row.blockers.length}`
    : '';
  return `${target}${intents.length > 0 ? ` [${intents}]` : ''}${evidence.length > 0 ? ` (${evidence})` : ''}${blockers}`;
}

function compactContinuationEvidenceText(value: unknown): string {
  if (!isRecord(value)) {
    return '';
  }
  const sourceRequirement = typeof value.sourceRequirement === 'string' && value.sourceRequirement.length > 0
    ? `source: ${value.sourceRequirement}`
    : '';
  const sourceFacts = Array.isArray(value.sourceFacts)
    ? value.sourceFacts
      .filter(isRecord)
      .map(compactContinuationSourceFactText)
      .filter((text): text is string => text != null)
    : [];
  const preview = sourceFacts.slice(0, 2);
  const remaining = sourceFacts.length - preview.length;
  const facts = preview.length === 0
    ? ''
    : `${preview.join(', ')}${remaining > 0 ? `, +${remaining} more` : ''}`;
  const epochDependencies = Array.isArray(value.epochDependencies)
    ? value.epochDependencies.filter((dependency): dependency is string =>
      typeof dependency === 'string' && dependency.length > 0
    )
    : [];
  const epochs = epochDependencies.length === 0
    ? ''
    : `epochs: ${epochDependencies.join('+')}`;
  return [sourceRequirement, facts, epochs].filter((text) => text.length > 0).join('; ');
}

function compactContinuationSourceFactText(fact: Record<string, unknown>): string | null {
  const facets = Array.isArray(fact.facets)
    ? fact.facets.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  if (facets.length === 0) {
    return null;
  }
  const source = isRecord(fact.source)
    ? compactContinuationSourceLabel(fact.source)
    : null;
  const count = typeof fact.count === 'number' && fact.count > 1
    ? ` x${fact.count}`
    : '';
  return `${source == null ? '' : `${source} `}[${facets.join('+')}]${count}`;
}

function compactContinuationSourceLabel(source: Record<string, unknown>): string | null {
  const label = typeof source.label === 'string'
    ? source.label
    : typeof source.path === 'string'
      ? source.path
      : null;
  if (label == null || label.length === 0) {
    return null;
  }
  return label.length <= 80
    ? label
    : compactPathLikeField(label, 80);
}
