import {
  HandleKind,
  HandleNamespace,
  type InquiryHandle,
} from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LocusKind } from "../locus.js";
import {
  type DeclarationSourceSelector,
  type DirectorySourceSelector,
  type PackageSourceSelector,
  SourceSelectorScheme,
  sourceSelectorForRange,
  type SourcePositionSelector,
  type SourceSelector,
  type WorkspaceSourceSelector,
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
      return declarationSelector(
        inquiry.locus.name,
        inquiry.locus.filePath,
        inquiry.locus.packageName,
      );
    case LocusKind.Package:
      return packageSelector(
        inquiry.locus.packageId,
        inquiry.locus.packageName,
      );
    case LocusKind.Handle:
      return sourceSelectorFromHandle(inquiry.locus.handle);
    case LocusKind.Repo:
    case LocusKind.RepoArea:
    case LocusKind.GitTree:
      return workspaceSelector(inquiry.subject);
  }
}

function declarationSelector(
  name: string,
  filePath?: string,
  packageName?: string,
): DeclarationSourceSelector {
  const selector: DeclarationSourceSelector = {
    scheme: SourceSelectorScheme.Declaration,
    name,
  };
  if (filePath !== undefined) {
    Object.assign(selector, { filePath });
  }
  if (packageName !== undefined) {
    Object.assign(selector, { packageName });
  }
  return selector;
}

function packageSelector(
  packageId?: string,
  packageName?: string,
): PackageSourceSelector {
  const selector: PackageSourceSelector = {
    scheme: SourceSelectorScheme.Package,
  };
  if (packageId !== undefined) {
    Object.assign(selector, { packageId });
  }
  if (packageName !== undefined) {
    Object.assign(selector, { packageName });
  }
  return selector;
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
      return workspaceSourceSelector(typeof source.query === "string" ? source.query : undefined);
    case SourceSelectorScheme.Package:
      return packageSelector(
        typeof source.packageId === "string" ? source.packageId : undefined,
        typeof source.packageName === "string" ? source.packageName : undefined,
      );
    case SourceSelectorScheme.Directory:
      return directorySelector(
        selectorStringField(source, "path"),
        typeof source.recursive === "boolean" ? source.recursive : undefined,
      );
    case SourceSelectorScheme.File:
      return { scheme, filePath: selectorStringField(source, "filePath") };
    case SourceSelectorScheme.Range:
      return {
        scheme,
        filePath: selectorStringField(source, "filePath"),
        start: positionField(source, "start"),
        end: positionField(source, "end"),
      };
    case SourceSelectorScheme.Position:
      return {
        scheme,
        filePath: selectorStringField(source, "filePath"),
        ...positionFromRecord(source),
      };
    case SourceSelectorScheme.Token:
      return {
        scheme,
        filePath: selectorStringField(source, "filePath"),
        text: selectorStringField(source, "text"),
        occurrence: typeof source.occurrence === "number" ? source.occurrence : undefined,
      };
    case SourceSelectorScheme.Declaration:
      return {
        scheme,
        name: selectorStringField(source, "name"),
        kind: typeof source.kind === "string" ? source.kind : undefined,
        packageId: typeof source.packageId === "string" ? source.packageId : undefined,
        packageName: typeof source.packageName === "string" ? source.packageName : undefined,
        filePath: typeof source.filePath === "string" ? source.filePath : undefined,
        occurrence: typeof source.occurrence === "number" ? source.occurrence : undefined,
      };
    case SourceSelectorScheme.Export:
      return {
        scheme,
        exportName: selectorStringField(source, "exportName"),
        packageId: typeof source.packageId === "string" ? source.packageId : undefined,
        packageName: typeof source.packageName === "string" ? source.packageName : undefined,
        filePath: typeof source.filePath === "string" ? source.filePath : undefined,
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
    return declarationSelector(
      String(handle.name),
      "filePath" in handle && typeof handle.filePath === "string"
        ? handle.filePath
        : undefined,
    );
  }
  return { scheme: SourceSelectorScheme.Workspace };
}

function workspaceSelector(subject: unknown): SourceSelector {
  return workspaceSourceSelector(typeof subject === "string" ? subject : undefined);
}

function workspaceSourceSelector(query?: string): WorkspaceSourceSelector {
  const selector: WorkspaceSourceSelector = {
    scheme: SourceSelectorScheme.Workspace,
  };
  if (query !== undefined) {
    Object.assign(selector, { query });
  }
  return selector;
}

function directorySelector(path: string, recursive?: boolean): DirectorySourceSelector {
  const selector: DirectorySourceSelector = {
    scheme: SourceSelectorScheme.Directory,
    path,
  };
  if (recursive !== undefined) {
    Object.assign(selector, { recursive });
  }
  return selector;
}

function selectorStringField(source: Record<string, unknown>, key: string): string {
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
