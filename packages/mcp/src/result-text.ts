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
  if (isRecord(value.value) && typeof value.value.displayText === 'string') {
    return value.value.displayText;
  }
  return topLevelDisplayText(value);
}

function topLevelDisplayText(value: unknown): string | null {
  return isRecord(value) && typeof value.displayText === 'string'
    ? value.displayText
    : null;
}
