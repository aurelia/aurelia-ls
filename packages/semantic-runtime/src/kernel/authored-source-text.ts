import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Authored file text plus line metadata for source spans that must refer back to user-written files. */
export interface AuthoredSourceText {
  readonly sourcePath: string;
  readonly hostPath: string;
  readonly text: string;
  readonly lineStarts: readonly number[];
}

/** Cached reader for raw authored source text at one workspace or project root boundary. */
export class AuthoredSourceTextCache {
  private readonly sourcesByHostPath = new Map<string, AuthoredSourceText | null>();

  constructor(
    private readonly rootDir: string,
  ) {}

  read(sourcePath: string): AuthoredSourceText | null {
    return this.readHostPath(sourcePath, authoredSourceHostPath(this.rootDir, sourcePath));
  }

  readFirst(sourcePaths: readonly string[]): AuthoredSourceText | null {
    for (const sourcePath of sourcePaths) {
      const source = this.read(sourcePath);
      if (source !== null) {
        return source;
      }
    }
    return null;
  }

  private readHostPath(
    sourcePath: string,
    hostPath: string,
  ): AuthoredSourceText | null {
    const cached = this.sourcesByHostPath.get(hostPath);
    if (cached !== undefined) {
      return cached;
    }
    let source: AuthoredSourceText | null;
    try {
      const text = readFileSync(hostPath, 'utf8');
      source = {
        sourcePath,
        hostPath,
        text,
        lineStarts: authoredSourceLineStartsForText(text),
      };
    } catch {
      source = null;
    }
    this.sourcesByHostPath.set(hostPath, source);
    return source;
  }
}

export function authoredSourceHostPath(
  rootDir: string,
  sourcePath: string,
): string {
  return path.isAbsolute(sourcePath)
    ? sourcePath
    : path.resolve(rootDir, sourcePath);
}

export function authoredSourceHostPathCandidates(
  workspaceRootDir: string,
  projectRootDir: string,
  sourcePath: string,
): readonly string[] {
  if (path.isAbsolute(sourcePath)) {
    return [sourcePath];
  }
  return [...new Set([
    path.resolve(projectRootDir, sourcePath),
    path.resolve(workspaceRootDir, sourcePath),
  ])];
}

export function authoredSourcePositionForOffset(
  source: AuthoredSourceText,
  offset: number,
): { readonly line: number; readonly character: number } {
  const line = authoredSourceLineIndexForOffset(source.lineStarts, offset);
  const lineStart = source.lineStarts[line] ?? 0;
  return {
    line,
    character: offset - lineStart,
  };
}

export function authoredSourceOffsetForLineCharacter(
  source: AuthoredSourceText,
  line: number,
  character: number,
): number | null {
  if (line < 0 || character < 0 || line >= source.lineStarts.length) {
    return null;
  }
  const lineStart = source.lineStarts[line] ?? 0;
  const lineEnd = authoredSourceLineEndOffset(source.text, source.lineStarts, line);
  const offset = lineStart + character;
  return offset <= lineEnd ? offset : null;
}

export function authoredSourceLineStartsForText(text: string): readonly number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index);
    if (char === 13) {
      const next = text.charCodeAt(index + 1);
      if (next === 10) {
        index += 1;
      }
      starts.push(index + 1);
      continue;
    }
    if (char === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
}

export function authoredSourceLineIndexForOffset(
  lineStarts: readonly number[],
  offset: number,
): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid] ?? 0;
    if (lineStart <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, high);
}

function authoredSourceLineEndOffset(
  text: string,
  lineStarts: readonly number[],
  line: number,
): number {
  const nextLineStart = lineStarts[line + 1];
  if (nextLineStart === undefined) {
    return text.length;
  }
  const previous = text.charCodeAt(nextLineStart - 1);
  if (previous === 10) {
    const maybeCarriageReturn = text.charCodeAt(nextLineStart - 2);
    return nextLineStart - (maybeCarriageReturn === 13 ? 2 : 1);
  }
  if (previous === 13) {
    return nextLineStart - 1;
  }
  return nextLineStart;
}
