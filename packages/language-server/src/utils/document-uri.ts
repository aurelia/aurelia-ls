import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  AuthoredSourceBoundary,
  canonicalTypeSystemPath,
} from "@aurelia-ls/semantic-runtime";
import { URI } from "vscode-uri";

export type DocumentUri = string;

export interface WorkspaceDocumentLocation {
  readonly uri: DocumentUri;
  readonly hostPath: string | null;
}

/** Maps semantic host paths into the URI space of one filesystem-backed workspace. */
export class WorkspaceDocumentUris {
  private root: URI | null = null;
  private rootFilePath: string | null = null;
  private authoredSources: AuthoredSourceBoundary | null = null;

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
    this.root = root;
    this.rootFilePath = rootFilePath;
    this.authoredSources = new AuthoredSourceBoundary(rootFilePath, excludedRootFilePaths);
  }

  get workspaceRoot(): string | null {
    return this.rootFilePath;
  }

  get excludedWorkspaceRoots(): readonly string[] {
    return this.authoredSources?.excludedRootDirs ?? [];
  }

  /** True only for incoming authored documents owned by this workspace session. */
  ownsDocument(input: DocumentUri): boolean {
    if (this.root == null || this.authoredSources == null) return false;
    if (!looksLikeHostPath(input) && !sameUriSpace(this.root, URI.parse(input))) return false;
    const hostPath = this.hostPath(input);
    return hostPath != null && this.authoredSources.contains(hostPath);
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
      return path.normalize(input);
    }
    const parsed = URI.parse(input);
    if (parsed.scheme === "file" || this.belongsToWorkspaceUriSpace(parsed)) {
      return hostPathForDocumentUri(input, parsed);
    }
    return null;
  }

  uriForHostPath(hostPath: string): DocumentUri {
    const normalized = path.normalize(hostPath);
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
    if (this.root.scheme === "file") {
      return toFileUri(path.resolve(this.rootFilePath, relativePath));
    }
    return URI.from({
      scheme: this.root.scheme,
      authority: this.root.authority,
      path: path.posix.join(this.root.path, relativePath.replace(/\\/g, "/")),
    }).toString();
  }

  /** Stable identity for maps and equality; display URIs remain in the client's workspace URI space. */
  key(input: DocumentUri): string {
    const filePath = this.hostPath(input);
    return filePath == null
      ? URI.parse(input).toString()
      : canonicalTypeSystemPath(filePath);
  }

  sameDocument(left: DocumentUri, right: DocumentUri): boolean {
    return this.key(left) === this.key(right);
  }

  private belongsToWorkspaceUriSpace(uri: URI): boolean {
    return this.root != null && sameUriSpace(this.root, uri);
  }

  private workspaceRelativePath(hostPath: string): string | null {
    if (this.rootFilePath == null) return null;
    const relative = path.relative(this.rootFilePath, hostPath);
    return relative === ""
      ? ""
      : relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)
        ? null
        : relative;
  }
}

function sameUriSpace(left: URI, right: URI): boolean {
  return left.scheme === right.scheme && left.authority === right.authority;
}

function toFileUri(filePath: string): DocumentUri {
  return pathToFileURL(path.normalize(filePath)).toString();
}

function hostPathForDocumentUri(input: DocumentUri, uri: URI): string {
  return path.normalize(
    // vscode-uri canonicalizes Windows drive-letter casing while serializing.
    // File URLs are decoded from the client-authored string so canonical identity
    // never leaks into the URI spelling returned to that client.
    uri.scheme === "file" ? fileURLToPath(input) : uri.path,
  );
}

function looksLikeHostPath(value: string): boolean {
  if (path.isAbsolute(value)) {
    return true;
  }
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\");
}
