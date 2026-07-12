import {
  AuthoredSourceTextCache,
  authoredSourceHostPathCandidates,
  authoredSourceOffsetForLineCharacter,
} from '../kernel/authored-source-text.js';
import type { SemanticRuntimeSourceTextProvider } from '../kernel/source-text-provider.js';
import type { SemanticRuntimeSourceCursorInput } from './contracts.js';

export interface SemanticSourceCursorResolution {
  readonly cursor: SemanticRuntimeSourceCursorInput | null;
  readonly missingInputs: readonly string[];
  readonly summary: string | null;
}

/** Normalize the public line/character cursor contract before a query performs offset containment. */
export function resolveSemanticSourceCursor(
  workspaceRootDir: string,
  projectRootDir: string,
  cursor: SemanticRuntimeSourceCursorInput,
  sourceTextProvider: SemanticRuntimeSourceTextProvider | null,
): SemanticSourceCursorResolution {
  if (cursor.offset != null) {
    return { cursor, missingInputs: [], summary: null };
  }
  const source = new AuthoredSourceTextCache('', sourceTextProvider).readFirst(authoredSourceHostPathCandidates(
    workspaceRootDir,
    projectRootDir,
    cursor.filePath,
  ));
  if (source === null) {
    return {
      cursor: null,
      missingInputs: ['source-offset', 'readable-source-file'],
      summary: `Template cursor file '${cursor.filePath}' was not readable; supply a valid source file path or explicit offset.`,
    };
  }
  if (cursor.line >= source.lineStarts.length) {
    return {
      cursor: null,
      missingInputs: ['source-offset', 'source-line'],
      summary: `Template cursor line ${cursor.line} is outside '${cursor.filePath}' (${source.lineStarts.length} zero-based line(s)).`,
    };
  }
  const offset = authoredSourceOffsetForLineCharacter(source, cursor.line, cursor.character);
  if (offset == null) {
    return {
      cursor: null,
      missingInputs: ['source-offset', 'source-character'],
      summary: `Template cursor character ${cursor.character} is outside '${cursor.filePath}' line ${cursor.line}.`,
    };
  }
  return {
    cursor: { ...cursor, offset },
    missingInputs: [],
    summary: null,
  };
}
