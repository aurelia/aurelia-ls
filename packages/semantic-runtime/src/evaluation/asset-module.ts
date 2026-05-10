import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import type ts from 'typescript';

const JSON_ASSET_PREFIX = 'export default ';
const JSON_ASSET_SUFFIX = ';';

export interface AssetModuleSourceSpan {
  readonly start: number;
  readonly end: number;
}

export function assetModuleText(fileName: string, text: string): string | null {
  switch (path.extname(fileName).toLowerCase()) {
    case '.json':
      return `${JSON_ASSET_PREFIX}${text.trim()}${JSON_ASSET_SUFFIX}`;
    case '.html':
    case '.css':
      return `export default ${JSON.stringify(text)};`;
    default:
      return null;
  }
}

export function authoredAssetModuleSpanForNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): AssetModuleSourceSpan | null {
  return authoredJsonAssetSpan(
    sourceFile.fileName,
    sourceFile.text,
    node.getStart(sourceFile),
    node.end,
  );
}

function authoredJsonAssetSpan(
  fileName: string,
  generatedText: string,
  generatedStart: number,
  generatedEnd: number,
): AssetModuleSourceSpan | null {
  if (path.extname(fileName).toLowerCase() !== '.json') {
    return null;
  }
  if (!generatedText.startsWith(JSON_ASSET_PREFIX) || !generatedText.endsWith(JSON_ASSET_SUFFIX)) {
    return null;
  }
  if (!existsSync(fileName)) {
    return null;
  }

  const authoredText = readFileSync(fileName, 'utf8');
  const trimStart = authoredText.length - authoredText.trimStart().length;
  const generatedContentStart = JSON_ASSET_PREFIX.length;
  const generatedContentEnd = generatedText.length - JSON_ASSET_SUFFIX.length;
  if (generatedStart < generatedContentStart || generatedEnd > generatedContentEnd) {
    return null;
  }

  return {
    start: trimStart + generatedStart - generatedContentStart,
    end: trimStart + generatedEnd - generatedContentStart,
  };
}
