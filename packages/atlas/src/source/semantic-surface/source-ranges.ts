import ts from "typescript";

import type { SourceRange } from "../../inquiry/locus.js";
import type {
  SourceFileIdentity,
  SourceProject,
  SourceSpan,
} from "../project.js";

export function sourceRangeForNode(
  sourceProject: SourceProject,
  node: ts.Node,
): SourceRange | null {
  const sourceFile = node.getSourceFile();
  const file = sourceProject.sourceFileIdentity(sourceFile);
  if (file === null) {
    return null;
  }
  return sourceRangeFromFileSpan(file.repoPath, sourceSpanForNode(sourceFile, node));
}

export function requiredSourceRangeForNode(
  sourceProject: SourceProject,
  node: ts.Node,
): SourceRange {
  const source = sourceRangeForNode(sourceProject, node);
  if (source === null) {
    throw new Error(`Node source is not admitted: ${node.getSourceFile().fileName}`);
  }
  return source;
}

export function sourceRangeFromFileSpan(
  filePath: string,
  span: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  },
): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

export function sourceSpanForNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

export function sourceRangeKey(source: SourceRange): string {
  return [
    source.filePath,
    source.start.line,
    source.start.character,
    source.end.line,
    source.end.character,
  ].join(":");
}

export function sourceFileIdentityForNode(
  sourceProject: SourceProject,
  node: ts.Node,
): SourceFileIdentity | null {
  return sourceProject.sourceFileIdentity(node.getSourceFile());
}
