import type { AuthoringOperationKind } from './ontology.js';
import type { AuthoringProjectToolingPlan } from './package-tooling.js';

/** Source language family for an authoring edit artifact. */
export type AuthoringSourceLanguage =
  | 'typescript'
  | 'html'
  | 'json'
  | 'css'
  | 'text';

/** App-topology role a source file plays after the edit is applied. */
export type AuthoringSourceFileRole =
  | 'entrypoint'
  | 'root-component'
  | 'component'
  | 'template'
  | 'component-style'
  | 'global-style'
  | 'state-model'
  | 'service'
  | 'project-config'
  | 'other';

/** File-level edit shape before a host resolves conflicts or formatting. */
export type AuthoringSourceEditKind =
  | 'create'
  | 'replace'
  | 'upsert';

/** Who owns the concrete text in this source plan. */
export type AuthoringSourceTextAuthority =
  /** Semantic-runtime produced this as canonical recipe output. */
  | 'semantic-runtime-recipe'
  /** The host or AI must produce the concrete text from semantic contracts. */
  | 'host-owned'
  /** A human/operator supplied the exact text. */
  | 'operator-supplied';

/** Conflict policy is explicit so edit application never hides overwrite behavior. */
export type AuthoringSourceConflictPolicy =
  | 'must-not-exist'
  | 'replace-generated-file'
  | 'host-decides';

/** Formatting policy is explicit because semantic-runtime should not silently own project style. */
export type AuthoringSourceFormattingPolicy =
  | 'recipe-baseline'
  | 'host-formatter'
  | 'operator-decides';

/** Package/build policy remains separate from source files. */
export type AuthoringPackageToolingPolicy =
  | 'not-modeled'
  | 'host-owned'
  | 'recipe-baseline';

/** Concrete file text, when the authoring layer can produce it without another policy decision. */
export class AuthoringSourceText {
  readonly kind = 'authoring-source-text' as const;

  constructor(
    readonly text: string,
    readonly authority: AuthoringSourceTextAuthority,
  ) {}
}

/** Policy envelope for applying a source edit plan. */
export class AuthoringSourceEditPolicy {
  readonly kind = 'authoring-source-edit-policy' as const;

  constructor(
    readonly conflictPolicy: AuthoringSourceConflictPolicy,
    readonly formattingPolicy: AuthoringSourceFormattingPolicy,
    readonly packageToolingPolicy: AuthoringPackageToolingPolicy,
  ) {}
}

/** One file-level source artifact requested by an authoring plan. */
export class AuthoringSourceFileEdit {
  readonly kind = 'authoring-source-file-edit' as const;

  constructor(
    readonly path: string,
    readonly role: AuthoringSourceFileRole,
    readonly language: AuthoringSourceLanguage,
    readonly editKind: AuthoringSourceEditKind,
    readonly operationKind: AuthoringOperationKind | null,
    readonly text: AuthoringSourceText | null,
  ) {}
}

/** Source edit plan paired with a semantic authoring plan. */
export class AuthoringSourceEditPlan {
  readonly kind = 'authoring-source-edit-plan' as const;

  constructor(
    readonly rootDir: string,
    readonly policy: AuthoringSourceEditPolicy,
    readonly files: readonly AuthoringSourceFileEdit[],
    /** Structured package/typecheck artifacts that are applied beside app source, when the recipe owns them. */
    readonly projectTooling: AuthoringProjectToolingPlan | null = null,
  ) {}

  get hasCompleteFileText(): boolean {
    return this.files.every((file) => file.text != null)
      && (this.projectTooling?.hasCompleteFileText ?? true);
  }
}

export function recipeSourceEditPolicy(
  packageToolingPolicy: AuthoringPackageToolingPolicy = 'not-modeled',
): AuthoringSourceEditPolicy {
  return new AuthoringSourceEditPolicy(
    'must-not-exist',
    'recipe-baseline',
    packageToolingPolicy,
  );
}

export function recipeSourceFile(
  path: string,
  role: AuthoringSourceFileRole,
  language: AuthoringSourceLanguage,
  operationKind: AuthoringOperationKind,
  text: string,
): AuthoringSourceFileEdit {
  return new AuthoringSourceFileEdit(
    path,
    role,
    language,
    'create',
    operationKind,
    new AuthoringSourceText(text, 'semantic-runtime-recipe'),
  );
}
