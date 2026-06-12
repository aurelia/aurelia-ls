import type { InquiryHandle } from "./handle.js";
import type { RepoAreaId } from "./terrain.js";

/** Locus family that describes where an inquiry is rooted. */
export const enum LocusKind {
  /** Whole repository under the active Atlas terrain model. */
  Repo = "repo",
  /** One declared repository terrain area. */
  RepoArea = "repo-area",
  /** One package or package root. */
  Package = "package",
  /** One source file in the active source basis. */
  SourceFile = "source-file",
  /** One exact source span in the active source basis. */
  SourceRange = "source-range",
  /** One named symbol or declaration target. */
  Symbol = "symbol",
  /** One previously resolved inquiry handle. */
  Handle = "handle",
  /** One historical git-tree basis, optionally wrapping another locus. */
  GitTree = "git-tree",
}

/** Zero-based source position. */
export interface SourcePosition {
  /** Zero-based line number. */
  readonly line: number;
  /** Zero-based UTF-16 character offset within the line. */
  readonly character: number;
}

/** Half-open source range for source, type, and evidence continuations. */
export interface SourceRange {
  /** Source file path in the selected source basis. */
  readonly filePath: string;
  /** Inclusive start position. */
  readonly start: SourcePosition;
  /** Exclusive end position. */
  readonly end: SourcePosition;
}

/** Locus rooted at the whole repository. */
export interface RepoLocus {
  /** Discriminator for repository-level inquiries. */
  readonly kind: LocusKind.Repo;
  /** Optional host root when a caller needs to pin a concrete checkout. */
  readonly root?: string;
}

/** Locus rooted at one declared repository terrain area. */
export interface RepoAreaLocus {
  /** Discriminator for terrain-area inquiries. */
  readonly kind: LocusKind.RepoArea;
  /** Stable terrain id. */
  readonly areaId: RepoAreaId;
}

/** Locus rooted at one package. */
export interface PackageLocus {
  /** Discriminator for package-level inquiries. */
  readonly kind: LocusKind.Package;
  /** Optional package.json name. */
  readonly packageName?: string;
  /** Optional repo-local package id. */
  readonly packageId?: string;
  /** Optional workspace-relative package root. */
  readonly relativePath?: string;
}

/** Locus rooted at one source file. */
export interface SourceFileLocus {
  /** Discriminator for file-level inquiries. */
  readonly kind: LocusKind.SourceFile;
  /** Source file path in the active basis. */
  readonly filePath: string;
}

/** Locus rooted at one exact source range. */
export interface SourceRangeLocus {
  /** Discriminator for range-level inquiries. */
  readonly kind: LocusKind.SourceRange;
  /** Exact source range selected by a caller or continuation. */
  readonly range: SourceRange;
}

/** Locus rooted at one symbol-like target. */
export interface SymbolLocus {
  /** Discriminator for symbol-level inquiries. */
  readonly kind: LocusKind.Symbol;
  /** Symbol or declaration name. */
  readonly name: string;
  /** Optional source file that narrows resolution. */
  readonly filePath?: string;
  /** Optional package that narrows resolution. */
  readonly packageName?: string;
}

/** Locus rooted at one resolved inquiry handle. */
export interface HandleLocus {
  /** Discriminator for handle-level inquiries. */
  readonly kind: LocusKind.Handle;
  /** Resolved handle to inspect or expand. */
  readonly handle: InquiryHandle;
}

/** Locus rooted in a git-tree source basis. */
export interface GitTreeLocus {
  /** Discriminator for git-tree inquiries. */
  readonly kind: LocusKind.GitTree;
  /** Commit, tag, or other git treeish. */
  readonly treeish: string;
  /** Optional nested locus interpreted inside the treeish. */
  readonly inner?: Locus;
}

/** Place from which an inquiry starts or to which an answer applies. */
export type Locus =
  | RepoLocus
  | RepoAreaLocus
  | PackageLocus
  | SourceFileLocus
  | SourceRangeLocus
  | SymbolLocus
  | HandleLocus
  | GitTreeLocus;

/** Canonical locus for whole-repository orientation. */
export const RepoRootLocus: RepoLocus = { kind: LocusKind.Repo };
