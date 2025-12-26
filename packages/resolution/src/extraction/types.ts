import type { NormalizedPath, BindingMode } from "@aurelia-ls/compiler";

// Re-export BindingMode for consumers of this module
export type { BindingMode };

/** Raw facts extracted from a single source file */
export interface SourceFacts {
  readonly path: NormalizedPath;
  readonly classes: ClassFacts[];
  readonly registrationCalls: RegistrationCallFact[];
  readonly imports: ImportFact[];
  readonly exports: ExportFact[];
}

/** Import declaration fact */
export type ImportFact =
  | { readonly kind: "namespace"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "named"; readonly names: readonly ImportedName[]; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "default"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null };

/** Imported name with optional alias */
export interface ImportedName {
  readonly name: string;
  readonly alias: string | null;
}

/** Export declaration fact */
export type ExportFact =
  | { readonly kind: "reexport-all"; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "reexport-named"; readonly names: readonly ExportedName[]; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "named"; readonly names: readonly string[] }
  | { readonly kind: "default"; readonly name: string | null };

/** Exported name with optional alias */
export interface ExportedName {
  readonly name: string;
  readonly alias: string | null;
}

/** Facts about a class declaration */
export interface ClassFacts {
  readonly name: string;
  readonly decorators: DecoratorFact[];
  readonly staticAu: StaticAuFact | null;
  readonly staticDependencies: StaticDependenciesFact | null;
  readonly bindableMembers: BindableMemberFact[];
}

/** Raw decorator occurrence */
export interface DecoratorFact {
  readonly name: string; // "customElement", "customAttribute", etc.
  readonly args: DecoratorArgFact | null;
}

/** Decorator argument (string or object) */
export type DecoratorArgFact =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "object"; readonly properties: Readonly<Record<string, PropertyValueFact>> };

/** Property value in object literal */
export type PropertyValueFact =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "stringArray"; readonly values: readonly string[] }
  | { readonly kind: "bindableArray"; readonly bindables: readonly BindableDefFact[] }
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "propertyAccess"; readonly name: string }
  | { readonly kind: "unknown" };

/** Static $au property */
export interface StaticAuFact {
  readonly type?: string; // 'custom-element', 'custom-attribute', etc.
  readonly name?: string;
  readonly aliases?: readonly string[];
  readonly bindables?: readonly BindableDefFact[];
  readonly template?: string;
  readonly containerless?: boolean;
  readonly isTemplateController?: boolean;
  readonly noMultiBindings?: boolean;
}

/** Static dependencies array */
export interface StaticDependenciesFact {
  readonly references: readonly DependencyRef[];
}

/** Reference in a dependencies array */
export type DependencyRef =
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "import"; readonly moduleSpecifier: string; readonly exportName?: string };

/** Bindable member on class (from @bindable decorator) */
export interface BindableMemberFact {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly inferredType?: string;
}

/** Bindable definition in decorator/static $au */
export interface BindableDefFact {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly attribute?: string;
}

/** .register() call site */
export interface RegistrationCallFact {
  readonly receiver: "Aurelia" | "container" | "unknown";
  readonly methodChain?: string; // e.g., "new Aurelia().register" or "container.register"
  readonly arguments: readonly RegistrationArgFact[];
  readonly position: Position;
}

/** Argument to a .register() call */
export type RegistrationArgFact =
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "spread"; readonly name: string }
  | { readonly kind: "arrayLiteral"; readonly elements: readonly RegistrationArgFact[] }
  | { readonly kind: "unknown" };

/** Source position */
export interface Position {
  readonly line: number;
  readonly character: number;
}
