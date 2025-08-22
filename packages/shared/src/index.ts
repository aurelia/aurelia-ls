import { URI } from "vscode-uri";
import path from "node:path";

export const OVERLAY_SUFFIX = ".__aurelia.ts";

export function htmlFsPathFromUri(uri: string): string {
  return URI.parse(uri).fsPath;
}

export function toOverlayPathForHtmlFsPath(htmlFsPath: string): string {
  return htmlFsPath + OVERLAY_SUFFIX;
}

export function viewModelImportRelative(htmlFsPath: string): string {
  // Pair by convention: same basename, .ts next to .html
  const base = path.parse(htmlFsPath).name; // "my-app"
  // Under NodeNext, import the JS extension; TS resolves to the .ts source.
  return `./${base}.js`;
}
