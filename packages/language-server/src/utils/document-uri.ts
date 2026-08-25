import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalTypeSystemPath } from "@aurelia-ls/semantic-runtime";
import { URI } from "vscode-uri";

export type DocumentUri = string;
const typeSystemUsesCaseSensitivePaths = canonicalTypeSystemPath("A") !== canonicalTypeSystemPath("a");

export interface WorkspaceDocumentLocation {
  readonly uri: DocumentUri;
  readonly hostPath: string | null;
}

/** Maps semantic host paths into the URI space of one filesystem-backed workspace. */
export class WorkspaceDocumentUris {
  private root: URI | null = null;
  private rootFilePath: string | null = null;
  private excludedRootFilePaths: readonly string[] = [];

  configure(rootUri: DocumentUri, excludedRootUris: readonly DocumentUri[] = []): void {
    const root = URI.parse(rootUri);
    const rootFilePath = hostPathForDocumentUri(rootUri, root);
    const excludedRootFilePaths = excludedRootUris.map((excludedRootUri) => {
      const excludedRoot = URI.parse(excludedRootUri);
      if (!sameUriSpace(root, excludedRoot)) {
        throw new Error(
          `Excluded workspace root '${excludedRootUri}' does not share the workspace URI space '${rootUri}'.`,
        );
      }
      return hostPathForDocumentUri(excludedRootUri, excludedRoot);
    });
    const acceptedExclusions = normalizeExcludedHostPaths(rootFilePath, excludedRootFilePaths);
    this.root = root;
    this.rootFilePath = rootFilePath;
    this.excludedRootFilePaths = acceptedExclusions;
  }

  get workspaceRoot(): string | null {
    return this.rootFilePath;
  }

  get excludedWorkspaceRoots(): readonly string[] {
    return this.excludedRootFilePaths;
  }

  /** True only for incoming authored documents owned by this workspace session. */
  ownsDocument(input: DocumentUri): boolean {
    if (this.root == null || this.rootFilePath == null) return false;
    if (!looksLikeHostPath(input) && !sameUriSpace(this.root, URI.parse(input))) return false;
    const hostPath = this.hostPath(input);
    return hostPath != null
      && isHostPathAtOrUnder(hostPath, this.rootFilePath)
      && !this.excludedRootFilePaths.some((excluded) => isHostPathAtOrUnder(hostPath, excluded));
  }

  authoredHostPath(input: DocumentUri): string | null {
    return this.ownsDocument(input) ? this.hostPath(input) : null;
  }

  /** Map a URI inside the configured workspace without applying authored-source exclusions. */
  workspaceHostPath(input: DocumentUri): string | null {
    if (this.root == null) return null;
    if (!looksLikeHostPath(input) && !sameUriSpace(this.root, URI.parse(input))) return null;
    const hostPath = this.hostPath(input);
    return hostPath != null && this.workspaceRelativePath(hostPath) != null
      ? hostPath
      : null;
  }

  resolve(input: DocumentUri): WorkspaceDocumentLocation {
    const file = this.hostPath(input);
    if (file == null) {
      const parsed = URI.parse(input);
      return {
        uri: parsed.toString(),
        hostPath: null,
      };
    }
    return {
      uri: this.uriForHostPath(file),
      hostPath: file,
    };
  }

  hostPath(input: DocumentUri): string | null {
    if (looksLikeHostPath(input)) {
      return normalizeHostPath(input);
    }
    if (!hasExplicitUriScheme(input)) return null;
    const parsed = URI.parse(input);
    if (parsed.scheme === "file" || this.belongsToWorkspaceUriSpace(parsed)) {
      return hostPathForDocumentUri(input, parsed);
    }
    return null;
  }

  uriForHostPath(hostPath: string): DocumentUri {
    const normalized = normalizeHostPath(hostPath);
    const workspaceRelativePath = this.workspaceRelativePath(normalized);
    if (this.root != null && workspaceRelativePath != null) {
      return this.uriForWorkspaceRelativePath(workspaceRelativePath)!;
    }
    if (this.root == null || this.root.scheme === "file") return toFileUri(normalized);

    const fileUri = URI.file(normalized);
    return URI.from({
      scheme: this.root.scheme,
      authority: this.root.authority,
      path: fileUri.path,
    }).toString();
  }

  uriForWorkspaceRelativePath(relativePath: string): DocumentUri | null {
    if (this.root == null || this.rootFilePath == null) return null;
    const hostPath = this.hostPathForWorkspaceRelativePath(relativePath);
    if (hostPath == null) return null;
    if (this.root.scheme === "file") {
      return toFileUri(hostPath);
    }
    return URI.from({
      scheme: this.root.scheme,
      authority: this.root.authority,
      path: path.posix.join(this.root.path, relativePath.replace(/\\/g, "/")),
    }).toString();
  }

  hostPathForWorkspaceRelativePath(relativePath: string): string | null {
    if (this.rootFilePath == null || hostPathDomain(relativePath) != null) return null;
    const resolved = resolveHostPath(this.rootFilePath, relativePath);
    return isHostPathAtOrUnder(resolved, this.rootFilePath) ? resolved : null;
  }

  /** Stable identity for maps and equality; display URIs remain in the client's workspace URI space. */
  key(input: DocumentUri): string {
    const filePath = this.hostPath(input);
    return filePath == null
      ? URI.parse(input).toString()
      : `${hostPathDomain(filePath) ?? "host"}:${canonicalHostPath(filePath)}`;
  }

  sameDocument(left: DocumentUri, right: DocumentUri): boolean {
    return this.key(left) === this.key(right);
  }

  hasHostFileName(input: DocumentUri, fileName: string): boolean {
    const hostPath = this.hostPath(input);
    if (hostPath == null) return false;
    const pathApi = hostPathApi(hostPath);
    return sameHostPath(hostPath, pathApi.join(pathApi.dirname(hostPath), fileName));
  }

  private belongsToWorkspaceUriSpace(uri: URI): boolean {
    return this.root != null && sameUriSpace(this.root, uri);
  }

  private workspaceRelativePath(hostPath: string): string | null {
    if (this.rootFilePath == null) return null;
    if (!sameHostPathDomain(hostPath, this.rootFilePath)) return null;
    const pathApi = hostPathApi(this.rootFilePath);
    const normalizedRoot = normalizeHostPath(this.rootFilePath);
    const normalizedCandidate = normalizeHostPath(hostPath);
    const authoredRelative = pathApi.relative(normalizedRoot, normalizedCandidate);
    if (isBoundedRelativePath(authoredRelative, pathApi)) return authoredRelative;
    const comparableRelative = pathApi.relative(
      comparableHostPath(this.rootFilePath),
      comparableHostPath(hostPath),
    );
    if (!isBoundedRelativePath(comparableRelative, pathApi)) return null;
    if (pathApi === path.posix && !typeSystemUsesCaseSensitivePaths) {
      const rootSegments = normalizedRoot.split("/").filter(Boolean);
      const candidateSegments = normalizedCandidate.split("/").filter(Boolean);
      const ownsPrefix = rootSegments.every(
        (segment, index) => segment.toLowerCase() === candidateSegments[index]?.toLowerCase(),
      );
      if (ownsPrefix) return candidateSegments.slice(rootSegments.length).join("/");
    }
    return comparableRelative;
  }
}

function sameUriSpace(left: URI, right: URI): boolean {
  return left.scheme === right.scheme
    && (left.scheme === "file"
      ? left.authority.toLowerCase() === right.authority.toLowerCase()
      : left.authority === right.authority);
}

function toFileUri(filePath: string): DocumentUri {
  const normalized = normalizeHostPath(filePath);
  if (isWindowsUncPath(normalized)) {
    const [authority, ...segments] = normalized.slice(2).split("\\");
    if (authority == null || authority === "" || segments.length === 0 || segments[0] === "") {
      throw new Error(`UNC host path requires a server and share: ${filePath}`);
    }
    return URI.from({
      scheme: "file",
      authority,
      path: `/${segments.join("/")}`,
    }).toString();
  }
  return isWindowsDrivePath(normalized) && process.platform !== "win32"
    ? pathToFileURL(`/${normalized.replace(/\\/gu, "/")}`).toString()
    : pathToFileURL(normalized).toString();
}

function hostPathForDocumentUri(input: DocumentUri, uri: URI): string {
  // vscode-uri canonicalizes Windows drive-letter casing while serializing. File URLs are decoded from the
  // client-authored string so canonical identity never leaks into the URI spelling returned to that client.
  if (uri.scheme !== "file") {
    return path.normalize(uri.path);
  }
  const fileUrl = new URL(input);
  if (process.platform !== "win32" && fileUrl.hostname !== "") {
    const authority = fileUrl.hostname;
    fileUrl.hostname = "";
    const decodedPath = fileURLToPath(fileUrl).replace(/^\/+|\/+$/gu, "");
    return path.win32.normalize(`\\\\${authority}\\${decodedPath.replace(/\//gu, "\\")}`);
  }
  const decoded = fileURLToPath(input);
  return normalizeHostPath(
    process.platform !== "win32" && /^\/[a-zA-Z]:\//u.test(decoded)
      ? decoded.slice(1)
      : decoded,
  );
}

function looksLikeHostPath(value: string): boolean {
  if (path.isAbsolute(value)) {
    return true;
  }
  return isWindowsDrivePath(value) || value.startsWith("\\\\");
}

function isWindowsDrivePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/u.test(value);
}

function isWindowsUncPath(value: string): boolean {
  return /^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+(?:[\\/]|$)/u.test(value);
}

function hostPathApi(value: string): typeof path.win32 {
  return isWindowsPathStyle(value)
    ? path.win32
    : path.posix;
}

function isWindowsPathStyle(value: string): boolean {
  return isWindowsDrivePath(value)
    || isWindowsUncPath(value)
    || process.platform === "win32" && value.startsWith("\\");
}

function normalizeHostPath(value: string): string {
  return hostPathApi(value).normalize(value);
}

function resolveHostPath(root: string, relativePath: string): string {
  return hostPathDomain(root) === "windows-rooted"
    ? path.win32.normalize(path.win32.join(root, relativePath))
    : hostPathApi(root).resolve(root, relativePath);
}

function isHostPathAtOrUnder(candidate: string, parent: string): boolean {
  if (!sameHostPathDomain(candidate, parent)) return false;
  const pathApi = hostPathApi(parent);
  const relative = pathApi.relative(comparableHostPath(parent), comparableHostPath(candidate));
  return relative === ""
    || !relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative);
}

function isBoundedRelativePath(relative: string, pathApi: typeof path.win32): boolean {
  return relative === ""
    || !relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative);
}

function normalizeExcludedHostPaths(
  root: string,
  excludedRoots: readonly string[],
): readonly string[] {
  const normalizedRoot = normalizeHostPath(root);
  const normalizedExclusions = excludedRoots
    .map(normalizeHostPath)
    .sort((left, right) => left.length - right.length || left.localeCompare(right));
  const accepted: string[] = [];
  for (const exclusion of normalizedExclusions) {
    if (sameHostPath(exclusion, normalizedRoot) || !isHostPathAtOrUnder(exclusion, normalizedRoot)) {
      throw new Error(
        `Authored source exclusion '${exclusion}' must be a strict descendant of '${normalizedRoot}'.`,
      );
    }
    if (accepted.some((owner) => isHostPathAtOrUnder(exclusion, owner))) continue;
    accepted.push(exclusion);
  }
  return accepted;
}

function sameHostPath(left: string, right: string): boolean {
  if (!sameHostPathDomain(left, right)) return false;
  const pathApi = hostPathApi(left);
  return pathApi.relative(comparableHostPath(left), comparableHostPath(right)) === "";
}

function canonicalHostPath(value: string): string {
  return comparableHostPath(value).replace(/\\/gu, "/");
}

function comparableHostPath(value: string): string {
  const normalized = normalizeHostPath(value);
  return isWindowsPathStyle(normalized)
    ? normalized.toLowerCase()
    : typeSystemUsesCaseSensitivePaths ? normalized : normalized.toLowerCase();
}

function sameHostPathDomain(left: string, right: string): boolean {
  const leftDomain = hostPathDomain(left);
  return leftDomain != null && leftDomain === hostPathDomain(right);
}

function hostPathDomain(value: string): string | null {
  if (isWindowsDrivePath(value)) return `windows-drive:${value[0]!.toLowerCase()}`;
  if (isWindowsUncPath(value)) {
    const normalized = value.replace(/\//gu, "\\").replace(/^\\\\/u, "");
    const [server, share] = normalized.split("\\");
    return server != null && share != null
      ? `windows-unc:${server.toLowerCase()}/${share.toLowerCase()}`
      : null;
  }
  if (path.posix.isAbsolute(value)) return "posix";
  if (process.platform === "win32" && path.win32.isAbsolute(value)) return "windows-rooted";
  return null;
}

function hasExplicitUriScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(value);
}
