import {
  AuthoredSourceTextCache,
  authoredSourceOffsetForLineCharacter,
} from '../kernel/authored-source-text.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import { workspaceSourcePathForHostPath } from '../boot/source-ownership.js';
import path from 'node:path';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import type { SemanticRuntimeSourceCursorInput } from './contracts.js';

export interface SemanticSourceCursorResolution {
  readonly cursor: SemanticRuntimeSourceCursorInput | null;
  readonly missingInputs: readonly string[];
  readonly summary: string | null;
}

/** Resolve an already canonicalized workspace-domain cursor before a query performs offset containment. */
export function resolveSemanticSourceCursor(
  project: Pick<ProjectBootFrame, 'projectKey' | 'workspaceRootDir' | 'sourceOwnership'>,
  cursor: SemanticRuntimeSourceCursorInput,
  inputHost: SemanticRuntimeProjectInputHost,
): SemanticSourceCursorResolution {
  const pathResolution = project.sourceOwnership.resolveWorkspacePath(cursor.filePath);
  if (pathResolution.kind === 'absent') {
    const hostPath = path.isAbsolute(cursor.filePath)
      ? path.resolve(cursor.filePath)
      : path.resolve(project.workspaceRootDir, cursor.filePath);
    const source = new AuthoredSourceTextCache('', inputHost).read(hostPath);
    if (source == null) {
      return {
        cursor: null,
        missingInputs: ['source-file-identity', 'readable-source-file'],
        summary: `Template cursor file '${cursor.filePath}' is neither admitted nor readable in project '${project.projectKey}'.`,
      };
    }
    const resolvedCursor = {
      ...cursor,
      filePath: workspaceSourcePathForHostPath(project.workspaceRootDir, hostPath),
    };
    return resolveSemanticSourceCursorOffset(resolvedCursor, source);
  }
  const resolvedCursor = { ...cursor, filePath: pathResolution.source.workspacePath };
  if (resolvedCursor.offset != null) {
    return { cursor: resolvedCursor, missingInputs: [], summary: null };
  }
  const source = new AuthoredSourceTextCache('', inputHost).read(pathResolution.source.hostPath);
  if (source === null) {
    return {
      cursor: null,
      missingInputs: ['source-offset', 'readable-source-file'],
      summary: `Template cursor file '${cursor.filePath}' was not readable; supply a valid source file path or explicit offset.`,
    };
  }
  return resolveSemanticSourceCursorOffset(resolvedCursor, source);
}

function resolveSemanticSourceCursorOffset(
  cursor: SemanticRuntimeSourceCursorInput,
  source: NonNullable<ReturnType<AuthoredSourceTextCache['read']>>,
): SemanticSourceCursorResolution {
  if (cursor.offset != null) {
    return { cursor, missingInputs: [], summary: null };
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
