import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type { ProfileSnapshotSupport } from './profile-support.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

export interface CurrentSnapshotSet {
  deps: DepsOutput | null;
  typeRefs: TypeRefsOutput | null;
  exports: ExportsOutput | null;
  support?: ProfileSnapshotSupport;
  warnings: string[];
}

export interface LoadedCurrentSnapshotSet {
  deps: DepsOutput;
  typeRefs: TypeRefsOutput;
  exports: ExportsOutput;
  support?: ProfileSnapshotSupport;
  warnings: string[];
}
