import type { StyleProfile } from "@aurelia-ls/compiler/schema/types.js";
import {
  canonicalAttrName,
  canonicalElementName,
  canonicalSimpleName,
  toKebabCase,
} from "@aurelia-ls/compiler/project-semantics/util/naming.js";
export type RenameStyle = "preserve" | "attribute" | "property";
export type BindableDeclarationKind =
  | "template"
  | "member-decorator"
  | "resource-config"
  | "static-bindables"
  | "static-au";

export interface RefactorOverrides {
  readonly preferShorthand?: boolean;
  readonly renameStyle?: RenameStyle;
}

export interface StylePolicyOptions {
  readonly profile?: StyleProfile | null;
  readonly refactors?: RefactorOverrides | null;
}

export class StylePolicy {
  readonly profile: StyleProfile;
  readonly renameStyle: RenameStyle;
  readonly preferShorthand: boolean;
  readonly quoteStyle: "double" | "single" | "preserve";
  readonly bindableDeclaration?: BindableDeclarationKind;
  readonly importOrganization: "preserve" | "sort" | "group";
  readonly importAddWhenMissing: "always" | "prompt";
  readonly importAliasStyle: "preserve" | "kebab" | "camel";
  readonly preferLocalImports: boolean;

  constructor(options: StylePolicyOptions = {}) {
    this.profile = options.profile ?? {};
    this.renameStyle = options.refactors?.renameStyle ?? this.profile.refactors?.renameStyle ?? "preserve";
    const shorthandPreference = this.profile.shorthand?.prefer ?? "registry-default";
    this.preferShorthand = options.refactors?.preferShorthand ?? shorthandPreference === "always";
    this.quoteStyle = this.profile.formatting?.quoteStyle ?? "preserve";
    this.bindableDeclaration = this.profile.declaration?.bindable?.prefer;
    this.importOrganization = this.profile.imports?.organize ?? "preserve";
    this.importAddWhenMissing = this.profile.imports?.addWhenMissing ?? "prompt";
    this.importAliasStyle = this.profile.imports?.aliasStyle ?? "preserve";
    this.preferLocalImports = this.profile.imports?.preferLocal ?? false;
  }

  formatElementName(name: string): string {
    const style = this.profile.naming?.element ?? "convention";
    if (style === "convention") return canonicalElementName(name);
    return applyNaming(name, style);
  }

  formatAttributeName(name: string): string {
    const style = this.profile.naming?.attribute ?? "convention";
    if (style === "convention") return canonicalAttrName(name);
    return applyNaming(name, style);
  }

  formatBindablePropertyName(name: string): string {
    const style = this.profile.naming?.bindableProperty ?? "camel";
    if (style === "preserve") return name;
    return toCamelCase(name);
  }

  formatConverterName(name: string): string {
    const style = this.profile.naming?.converter ?? "convention";
    if (style === "convention") return canonicalSimpleName(name);
    return applyNaming(name, style);
  }

  formatBehaviorName(name: string): string {
    const style = this.profile.naming?.behavior ?? "convention";
    if (style === "convention") return canonicalSimpleName(name);
    return applyNaming(name, style);
  }

  formatControllerName(name: string): string {
    const style = this.profile.naming?.controller ?? "convention";
    if (style === "convention") return canonicalElementName(name);
    return applyNaming(name, style);
  }

  formatRenameTarget(name: string): string {
    if (this.renameStyle === "property") {
      return this.formatBindablePropertyName(name);
    }
    if (this.renameStyle === "attribute") {
      return this.formatAttributeName(name);
    }
    return name;
  }

  formatBindableDeclaration(
    propertyName: string,
    attributeName: string | null,
  ): { propertyName: string; attributeName: string | null } {
    const property = this.formatBindablePropertyName(propertyName);
    const attribute = attributeName ? this.formatAttributeName(attributeName) : null;
    return {
      propertyName: property,
      attributeName: attribute,
    };
  }

  quote(value: string): string {
    const quote = this.quoteStyle === "single" ? "'" : "\"";
    return `${quote}${value}${quote}`;
  }
}

function applyNaming(
  name: string,
  style: "convention" | "kebab" | "camel" | "pascal" | "preserve",
): string {
  switch (style) {
    case "kebab":
      return toKebabCase(name);
    case "camel":
      return toCamelCase(name);
    case "pascal":
      return toPascalCase(name);
    case "convention":
    case "preserve":
    default:
      return name;
  }
}

function toCamelCase(value: string): string {
  if (!value) return value;
  if (!value.includes("-") && !value.includes("_") && !value.includes(" ")) {
    return value[0]!.toLowerCase() + value.slice(1);
  }
  const normalized = value.replace(/[_\s]+/g, "-");
  const parts = normalized.split("-").filter((part) => part.length);
  if (parts.length === 0) return value;
  const [head, ...rest] = parts;
  const tail = rest.map((part) => part[0]!.toUpperCase() + part.slice(1)).join("");
  return head!.toLowerCase() + tail;
}

function toPascalCase(value: string): string {
  const camel = toCamelCase(value);
  if (!camel) return camel;
  return camel[0]!.toUpperCase() + camel.slice(1);
}
