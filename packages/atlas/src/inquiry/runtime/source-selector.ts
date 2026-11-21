import {
  HandleKind,
  HandleNamespace,
  type InquiryHandle,
} from "../handle.js";
import { createAnswer, OutcomeKind, type Answer } from "../answer.js";
import { ContinuationKind } from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import { RepoTerrain } from "../terrain.js";
import {
  type DeclarationSourceSelector,
  type DirectorySourceSelector,
  type PackageSourceSelector,
  isPathWithin,
  normalizeFileKey,
  resolveSourceSelector,
  SourceSelectorScheme,
  sourceSelectorForRange,
  sourceRangeFromFileSpan,
  sourceSpanFromTextOffsets,
  type SourceProject,
  type SourcePositionSelector,
  type SourceSelector,
  type WorkspaceSourceSelector,
} from "../../source/index.js";

/** Resolve the inquiry locus/subject envelope into the source substrate selector algebra. */
export function sourceSelectorFromInquiry(inquiry: Inquiry, project: SourceProject): SourceSelector | null {
  const scope = selectorForLocus(inquiry, project);
  if (scope === null || !(typeof inquiry.subject === "object" && inquiry.subject !== null && "scheme" in inquiry.subject)) {
    return scope;
  }
  const subject = sourceSelectorFromSubject(inquiry.subject);
  if (subject === null || scope.scheme === SourceSelectorScheme.Workspace) return subject;
  if (subject.scheme === SourceSelectorScheme.Workspace && subject.query === undefined) return scope;
  if (scope.scheme === SourceSelectorScheme.Package) {
    const pkg = project.summary().packages.find(pkg =>
      (scope.packageId === undefined || pkg.id === scope.packageId)
      && (scope.packageName === undefined || pkg.packageName === scope.packageName));
    if (!pkg) return null;
    if (("packageId" in subject && subject.packageId !== undefined && subject.packageId !== pkg.id)
      || ("packageName" in subject && subject.packageName !== undefined && subject.packageName !== pkg.packageName)) return null;
    const file = "filePath" in subject ? subject.filePath
      : subject.scheme === SourceSelectorScheme.Directory ? subject.path : undefined;
    if (file !== undefined && !isPathWithin(path.resolve(project.repoRoot, file), path.resolve(project.repoRoot, pkg.rootPath))) return null;
    if (subject.scheme === SourceSelectorScheme.Package || subject.scheme === SourceSelectorScheme.Declaration || subject.scheme === SourceSelectorScheme.Export) {
      return { ...subject, packageId: pkg.id, packageName: pkg.packageName };
    }
    if (file !== undefined) return subject;
  }
  let selected = subject;
  if ("filePath" in scope && scope.filePath !== undefined) {
    if ("filePath" in subject && subject.filePath !== undefined
      && normalizeFileKey(path.resolve(project.repoRoot, subject.filePath)) !== normalizeFileKey(path.resolve(project.repoRoot, scope.filePath))) {
      return null;
    }
    if (subject.scheme === SourceSelectorScheme.File) return scope;
    if (subject.scheme === SourceSelectorScheme.Declaration || subject.scheme === SourceSelectorScheme.Export) {
      selected = { ...subject, filePath: scope.filePath };
    }
    if (scope.scheme === SourceSelectorScheme.File && "filePath" in selected && selected.filePath !== undefined) return selected;
  }
  // Compound symbol/range selections must stay inside an actual locus target.
  const scopeTargets = resolveSourceSelector(project, scope).targets;
  const selectedTargets = resolveSourceSelector(project, selected).targets;
  return selectedTargets.every(target => scopeTargets.some(container =>
    target.file?.absolutePath === container.file?.absolutePath &&
    (container.span === undefined || (target.span !== undefined &&
      target.span.start >= container.span.start && target.span.end <= container.span.end))))
    ? selected : null;
}

function selectorForLocus(inquiry: Inquiry, project: SourceProject): SourceSelector | null {
  switch (inquiry.locus.kind) {
    case LocusKind.GitTree:
      return null;
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
      return sourceSelectorFromHandle(inquiry.locus.handle, project);
    case LocusKind.Repo:
      return workspaceSelector(inquiry.subject);
    case LocusKind.RepoArea: {
      const areaId = inquiry.locus.areaId;
      const area = RepoTerrain.find(area => area.id === areaId);
      return area === undefined ? null : directorySelector(area.root);
    }
  }
}

/** Offer an explicit file read when a legacy range handle cannot recover its coordinates. */
export function unresolvedSourceSelectionAnswer<TValue>(inquiry: Inquiry): Answer<TValue> {
  const handle = inquiry.locus.kind === LocusKind.Handle ? inquiry.locus.handle : undefined;
  if (handle?.kind === HandleKind.SourceRange && "filePath" in handle && typeof handle.filePath === "string") {
    return createAnswer(inquiry, OutcomeKind.Reroute, "This range handle has no recoverable coordinates.", {
      continuations: [{
        id: "source:inspect-file-for-unresolved-range",
        kind: ContinuationKind.InspectEvidence,
        rationale: "Read the containing file to locate the intended text.",
        inquiry: { lens: LensId.TsSource, locus: { kind: LocusKind.SourceFile, filePath: handle.filePath }, projection: "text" },
      }],
    });
  }
  return createAnswer(inquiry, OutcomeKind.NoClaim, "The requested subject and locus do not identify a supported source selection in this working tree.");
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
  if ([SourceSelectorScheme.File, SourceSelectorScheme.Range, SourceSelectorScheme.Position, SourceSelectorScheme.Token].includes(scheme as SourceSelectorScheme)
    && (typeof source.filePath !== "string" || source.filePath.length === 0)) return null;
  if (scheme === SourceSelectorScheme.Range && (!validPosition(source.start) || !validPosition(source.end))) return null;
  if (scheme === SourceSelectorScheme.Position && !validPosition(source)) return null;
  if (source.occurrence !== undefined && (!Number.isSafeInteger(source.occurrence) || (source.occurrence as number) < 0)) return null;
  if ((scheme === SourceSelectorScheme.Declaration && !(typeof source.name === "string" && source.name.length > 0))
    || (scheme === SourceSelectorScheme.Export && !(typeof source.exportName === "string" && source.exportName.length > 0))
    || (scheme === SourceSelectorScheme.Directory && !(typeof source.path === "string" && source.path.length > 0))
    || (scheme === SourceSelectorScheme.Token && !(typeof source.text === "string" && source.text.length > 0))) return null;
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

function sourceSelectorFromHandle(handle: InquiryHandle, project?: SourceProject): SourceSelector | null {
  if (handle.namespace === HandleNamespace.Package && handle.kind === HandleKind.Package) {
    return packageSelector(handle.id, "packageName" in handle && typeof handle.packageName === "string" ? handle.packageName : undefined);
  }
  if (handle.namespace === HandleNamespace.Source && handle.kind === HandleKind.SourceRange && "filePath" in handle && typeof handle.filePath === "string") {
    const filePath = handle.filePath;
    const embedded = "range" in handle ? handle.range as SourceRange | undefined : undefined;
    if (embedded !== undefined && (!embedded || embedded.filePath !== filePath || !validPosition(embedded.start) || !validPosition(embedded.end))) return null;
    const prefix = `range:${filePath}:`;
    const offsets = handle.id.startsWith(prefix) ? /^(\d+):(\d+)$/u.exec(handle.id.slice(prefix.length)) : null;
    if (offsets !== null && project !== undefined) {
      const textFile = project.readTextFile(filePath);
      const start = Number(offsets[1]);
      const end = Number(offsets[2]);
      if (textFile !== null && start <= end && end <= textFile.text.length) {
        const range = sourceRangeFromFileSpan(filePath, sourceSpanFromTextOffsets(textFile.text, start, end));
        if (embedded !== undefined && (range.start.line !== embedded.start.line || range.start.character !== embedded.start.character
          || range.end.line !== embedded.end.line || range.end.character !== embedded.end.character)) return null;
        return sourceSelectorForRange(range);
      }
      return null;
    }
    return embedded === undefined ? null : sourceSelectorForRange(embedded);
  }
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
      "packageName" in handle && typeof handle.packageName === "string" ? handle.packageName : undefined,
    );
  }
  return null;
}

function validPosition(position: unknown): position is SourceRange["start"] {
  return position !== null && typeof position === "object" && "line" in position && "character" in position
    && typeof position.line === "number" && Number.isSafeInteger(position.line) && position.line >= 0
    && typeof position.character === "number" && Number.isSafeInteger(position.character) && position.character >= 0;
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
import path from "node:path";
