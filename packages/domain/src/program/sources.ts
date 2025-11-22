import type { DocumentSnapshot, DocumentUri } from "./primitives.js";

/**
 * Abstraction over open documents. Keeps TemplateProgram independent of any host FS.
 * Hosts can adapt their own document stores to this interface.
 */
export interface SourceStore {
  /** Get the current snapshot for a document, or null if unknown. */
  get(uri: DocumentUri): DocumentSnapshot | null;
  /**
   * Create or update the snapshot for a document.
   * If version is omitted, it increments from the previous snapshot (starting at 1).
   */
  set(uri: DocumentUri, text: string, version?: number): DocumentSnapshot;
  /** Remove a document from the store (e.g., on close/delete). */
  delete(uri: DocumentUri): void;
  /** Enumerate all known snapshots (useful for workspace-wide builds). */
  all(): Iterable<DocumentSnapshot>;
}

/**
 * Simple in-memory SourceStore. Suitable for tests or default program wiring.
 */
export class InMemorySourceStore implements SourceStore {
  private readonly snapshots = new Map<DocumentUri, DocumentSnapshot>();

  get(uri: DocumentUri): DocumentSnapshot | null {
    return this.snapshots.get(uri) ?? null;
  }

  set(uri: DocumentUri, text: string, version?: number): DocumentSnapshot {
    const prev = this.snapshots.get(uri);
    const nextVersion = version ?? (prev ? prev.version + 1 : 1);
    const snap: DocumentSnapshot = { uri, version: nextVersion, text };
    this.snapshots.set(uri, snap);
    return snap;
  }

  delete(uri: DocumentUri): void {
    this.snapshots.delete(uri);
  }

  *all(): Iterable<DocumentSnapshot> {
    yield* this.snapshots.values();
  }
}
