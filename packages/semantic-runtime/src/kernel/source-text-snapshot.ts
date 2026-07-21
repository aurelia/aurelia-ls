import { createHash } from 'node:crypto';
import path from 'node:path';

import type { ComputationRead, ComputationReadValidation } from './computation-lifecycle.js';
import type { SemanticRuntimeProjectInputGeneration } from './project-input.js';

export const enum SourceTextSnapshotState {
  /** The admitted source authority returned complete text. */
  Present = 'present',
  /** The admitted source authority proved the file absent. */
  Absent = 'absent',
  /** The provider claimed existence but neither provider nor filesystem supplied text. */
  Unavailable = 'unavailable',
}

class SourceTextSnapshotValue {
  constructor(
    readonly state: SourceTextSnapshotState,
    readonly text: string | null,
    readonly contentRevision: string | null,
  ) {}

  get revision(): string {
    return `${this.state}:${this.contentRevision ?? 'none'}`;
  }
}

/** Immutable source value and registered computation read captured from one source authority. */
export class SourceTextSnapshot implements ComputationRead {
  readonly domain = 'source-text';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly authority: SourceTextSnapshotAuthority,
    readonly fileName: string,
    readonly state: SourceTextSnapshotState,
    readonly text: string | null,
    readonly contentRevision: string | null,
  ) {
    this.readKey = `source:${fileName}`;
    this.observedRevision = new SourceTextSnapshotValue(state, text, contentRevision).revision;
  }

  requireText(): string {
    if (this.state !== SourceTextSnapshotState.Present || this.text == null) {
      throw new Error(`Source ${this.fileName} is ${this.state}; text is unavailable.`);
    }
    return this.text;
  }

  validate(): ComputationReadValidation {
    const current = this.authority.readCurrent(this.fileName);
    const changedFacets = [
      ...(current.state === this.state ? [] : ['existence']),
      ...(current.contentRevision === this.contentRevision ? [] : ['content']),
    ];
    return {
      isCurrent: changedFacets.length === 0,
      currentRevision: current.revision,
      changedFacets,
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    const current = this.authority.capture(this.fileName);
    return current.observedRevision === this.observedRevision ? current : null;
  }
}

/** Source authority that captures immutable values and can validate them before publication. */
export class SourceTextSnapshotAuthority {
  constructor(
    private readonly inputGeneration: SemanticRuntimeProjectInputGeneration,
  ) {}

  capture(fileName: string): SourceTextSnapshot {
    const normalizedFileName = path.resolve(fileName);
    const value = this.readCurrent(normalizedFileName);
    return new SourceTextSnapshot(
      this,
      normalizedFileName,
      value.state,
      value.text,
      value.contentRevision,
    );
  }

  readCurrent(fileName: string): SourceTextSnapshotValue {
    const exists = this.inputGeneration.currentFileExists(fileName);
    if (!exists) {
      return new SourceTextSnapshotValue(SourceTextSnapshotState.Absent, null, null);
    }

    const text = this.inputGeneration.readCurrentFile(fileName);
    if (text !== undefined) {
      return presentSourceText(text);
    }
    return new SourceTextSnapshotValue(SourceTextSnapshotState.Unavailable, null, null);
  }
}

function presentSourceText(text: string): SourceTextSnapshotValue {
  return new SourceTextSnapshotValue(
    SourceTextSnapshotState.Present,
    text,
    sourceTextContentRevision(text),
  );
}

/** Stable content identity shared by source admission and later currentness validation. */
export function sourceTextContentRevision(text: string): string {
  return createHash('sha256').update(text).digest('base64url');
}
