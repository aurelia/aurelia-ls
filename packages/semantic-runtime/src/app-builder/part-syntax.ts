import {
  BuiltInSyntaxPackage,
  type BuiltInBindingCommandName,
  builtInSyntaxPackageModuleSpecifier,
  findBuiltInBindingCommand,
  type BuiltInBindingCommand,
} from '../template/built-in-syntax.js';

/** App-builder reference to an existing semantic-runtime built-in binding-command handler. */
export interface AppBuilderBuiltInBindingCommandRef {
  /** Syntax package that owns the command handler. */
  readonly packageId: BuiltInSyntaxPackage;
  /** Runtime binding-command name. */
  readonly name: BuiltInBindingCommandName;
}

/** Create a stable app-builder reference to a built-in binding-command handler. */
export function appBuilderBuiltInBindingCommandRef(
  packageId: BuiltInSyntaxPackage,
  name: BuiltInBindingCommandName,
): AppBuilderBuiltInBindingCommandRef {
  return { packageId, name };
}

/** Resolve an app-builder binding-command reference through semantic-runtime's built-in syntax catalog. */
export function appBuilderBuiltInBindingCommand(
  ref: AppBuilderBuiltInBindingCommandRef,
): BuiltInBindingCommand | null {
  return findBuiltInBindingCommand(ref);
}

/** Package dependency implied by a built-in syntax reference, when the app must admit a plugin package. */
export function appBuilderBuiltInSyntaxDependency(
  ref: AppBuilderBuiltInBindingCommandRef,
): string | null {
  switch (ref.packageId) {
    case BuiltInSyntaxPackage.TemplateCompiler:
    case BuiltInSyntaxPackage.RuntimeHtml:
      return null;
    case BuiltInSyntaxPackage.I18n:
    case BuiltInSyntaxPackage.State:
      return builtInSyntaxPackageModuleSpecifier(ref.packageId);
  }
}
