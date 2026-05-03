import {
  HandleKind,
  HandleNamespace,
  type InquiryHandle,
} from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LocusKind } from "../locus.js";
import {
  SourceSelectorScheme,
  sourceSelectorForRange,
  type SourcePositionSelector,
  type SourceSelector,
} from "../../source/index.js";

/** Resolve the inquiry locus/subject envelope into the source substrate selector algebra. */
export function sourceSelectorFromInquiry(inquiry: Inquiry): SourceSelector {
  const subjectSelector = sourceSelectorFromSubject(inquiry.subject);
  if (subjectSelector !== null) {
    return subjectSelector;
  }

  switch (inquiry.locus.kind) {
    case LocusKind.SourceFile:
      return {
        scheme: SourceSelectorScheme.File,
        filePath: inquiry.locus.filePath,
      };
    case LocusKind.SourceRange:
      return sourceSelectorForRange(inquiry.locus.range);
    case LocusKind.Symbol:
      return {
        scheme: SourceSelectorScheme.Declaration,
        name: inquiry.locus.name,
        ...(inquiry.locus.filePath === undefined
          ? {}
          : { filePath: inquiry.locus.filePath }),
        ...(inquiry.locus.packageName === undefined
          ? {}
          : { packageName: inquiry.locus.packageName }),
      };
    case LocusKind.Package:
      return {
        scheme: SourceSelectorScheme.Package,
        ...(inquiry.locus.packageId === undefined
          ? {}
          : { packageId: inquiry.locus.packageId }),
        ...(inquiry.locus.packageName === undefined
          ? {}
          : { packageName: inquiry.locus.packageName }),
      };
    case LocusKind.Handle:
      return sourceSelectorFromHandle(inquiry.locus.handle);
    case LocusKind.Repo:
    case LocusKind.RepoArea:
    case LocusKind.GitTree:
      return workspaceSelector(inquiry.subject);
  }
}

/** Parse a caller-provided source selector subject without importing source readers. */
export function sourceSelectorFromSubject(
  subject: unknown,
): SourceSelector | null {
  if (
    subject === null ||
    typeof subject !== "object" ||
    !("scheme" in subject)
  ) {
    return null;
  }
  const source = subject as Record<string, unknown>;
  const scheme = source.scheme;
  switch (scheme) {
    case SourceSelectorScheme.Workspace:
      return {
        scheme,
        ...(typeof source.query === "string" ? { query: source.query } : {}),
      };
    case SourceSelectorScheme.Package:
      return {
        scheme,
        ...(typeof source.packageId === "string"
          ? { packageId: source.packageId }
          : {}),
        ...(typeof source.packageName === "string"
          ? { packageName: source.packageName }
          : {}),
      };
    case SourceSelectorScheme.Directory:
      return {
        scheme,
        path: stringField(source, "path"),
        ...(typeof source.recursive === "boolean"
          ? { recursive: source.recursive }
          : {}),
      };
    case SourceSelectorScheme.File:
      return { scheme, filePath: stringField(source, "filePath") };
    case SourceSelectorScheme.Range:
      return {
        scheme,
        filePath: stringField(source, "filePath"),
        start: positionField(source, "start"),
        end: positionField(source, "end"),
      };
    case SourceSelectorScheme.Position:
      return {
        scheme,
        filePath: stringField(source, "filePath"),
        ...positionFromRecord(source),
      };
    case SourceSelectorScheme.Token:
      return {
        scheme,
        filePath: stringField(source, "filePath"),
        text: stringField(source, "text"),
        ...(typeof source.occurrence === "number"
          ? { occurrence: source.occurrence }
          : {}),
      };
    case SourceSelectorScheme.Declaration:
      return {
        scheme,
        name: stringField(source, "name"),
        ...(typeof source.kind === "string" ? { kind: source.kind } : {}),
        ...(typeof source.packageId === "string"
          ? { packageId: source.packageId }
          : {}),
        ...(typeof source.packageName === "string"
          ? { packageName: source.packageName }
          : {}),
        ...(typeof source.filePath === "string"
          ? { filePath: source.filePath }
          : {}),
        ...(typeof source.occurrence === "number"
          ? { occurrence: source.occurrence }
          : {}),
      };
    case SourceSelectorScheme.Export:
      return {
        scheme,
        exportName: stringField(source, "exportName"),
        ...(typeof source.packageId === "string"
          ? { packageId: source.packageId }
          : {}),
        ...(typeof source.packageName === "string"
          ? { packageName: source.packageName }
          : {}),
        ...(typeof source.filePath === "string"
          ? { filePath: source.filePath }
          : {}),
      };
    default:
      return null;
  }
}

function sourceSelectorFromHandle(handle: InquiryHandle): SourceSelector {
  if (
    handle.namespace === HandleNamespace.Source &&
    handle.kind === HandleKind.SourceFile &&
    "filePath" in handle
  ) {
    return {
      scheme: SourceSelectorScheme.File,
      filePath: String(handle.filePath),
    };
  }
  if (
    (handle.namespace === HandleNamespace.Symbol ||
      handle.namespace === HandleNamespace.TypeScript) &&
    "name" in handle
  ) {
    return {
      scheme: SourceSelectorScheme.Declaration,
      name: String(handle.name),
      ...("filePath" in handle && typeof handle.filePath === "string"
        ? { filePath: handle.filePath }
        : {}),
    };
  }
  return { scheme: SourceSelectorScheme.Workspace };
}

function workspaceSelector(subject: unknown): SourceSelector {
  return {
    scheme: SourceSelectorScheme.Workspace,
    ...(typeof subject === "string" ? { query: subject } : {}),
  };
}

function stringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function positionField(
  source: Record<string, unknown>,
  key: string,
): SourcePositionSelector {
  const value = source[key];
  return value !== null && typeof value === "object"
    ? positionFromRecord(value as Record<string, unknown>)
    : { line: 0, character: 0 };
}

function positionFromRecord(
  source: Record<string, unknown>,
): SourcePositionSelector {
  return {
    line: typeof source.line === "number" ? source.line : 0,
    character:
      typeof source.character === "number" ? source.character : 0,
  };
}
