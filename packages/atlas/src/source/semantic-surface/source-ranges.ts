import ts from "typescript";

import type { SourceRange } from "../../inquiry/locus.js";
import type {
  SourceFileIdentity,
  SourceProject,
  SourceSpan,
} from "../project.js";
import type { SourceTargetRow } from "../typescript-contracts.js";

export interface OneBasedSourceReference {
  readonly filePath: string;
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
}

export interface SourceFileSpanCarrier {
  readonly file: {
    readonly repoPath: string;
  };
  readonly span: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  };
}

export interface OptionalSourceFileSpanCarrier {
  readonly file?: {
    readonly repoPath: string;
  };
  readonly span?: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  };
}

export function requiredSourceRangeForNode(
  sourceProject: SourceProject,
  node: ts.Node,
): SourceRange {
  const sourceFile = node.getSourceFile();
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return sourceRangeFromFileSpan(file.repoPath, sourceSpanForNode(sourceFile, node));
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
    filePath: filePath.replace(/\\/gu, "/"),
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

export function sourceRangeForFileSpanCarrier(carrier: SourceFileSpanCarrier): SourceRange {
  return sourceRangeFromFileSpan(carrier.file.repoPath, carrier.span);
}

export function sourceRangeForOptionalFileSpanCarrier(
  carrier: OptionalSourceFileSpanCarrier | undefined,
): SourceRange | null {
  if (carrier?.file === undefined || carrier.span === undefined) {
    return null;
  }
  return sourceRangeFromFileSpan(carrier.file.repoPath, carrier.span);
}

export function sourceRangeForSourceFileNode(
  filePath: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceRange {
  return sourceRangeFromFileSpan(filePath, sourceSpanForNode(sourceFile, node));
}

export function sourceRangeForTarget(
  target: SourceTargetRow | undefined,
): SourceRange | null {
  return sourceRangeForOptionalFileSpanCarrier(target);
}

export function sourceReferenceForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): OneBasedSourceReference {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = sourceSpanForNode(sourceFile, node);
  return {
    filePath: file.repoPath,
    startLine: span.startLine,
    startCharacter: span.startCharacter,
    endLine: span.endLine,
    endCharacter: span.endCharacter,
  };
}

export function sourceRangeFromOneBasedReference(
  source: OneBasedSourceReference,
): SourceRange {
  return {
    filePath: source.filePath,
    start: {
      line: source.startLine - 1,
      character: source.startCharacter - 1,
    },
    end: {
      line: source.endLine - 1,
      character: source.endCharacter - 1,
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

export function requiredSourceFileIdentity(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): SourceFileIdentity {
  return sourceProject.requiredSourceFileIdentity(sourceFile);
}
