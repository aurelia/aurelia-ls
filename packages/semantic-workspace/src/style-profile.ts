import type { StyleProfile } from "@aurelia-ls/compiler";

export type RenameStyle = "preserve" | "attribute" | "property";

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

  constructor(options: StylePolicyOptions = {}) {
    this.profile = options.profile ?? {};
    this.renameStyle = options.refactors?.renameStyle ?? this.profile.refactors?.renameStyle ?? "preserve";
    const shorthandPreference = this.profile.shorthand?.prefer ?? "registry-default";
    this.preferShorthand = options.refactors?.preferShorthand ?? shorthandPreference === "always";
    this.quoteStyle = this.profile.formatting?.quoteStyle ?? "preserve";
  }

  formatElementName(name: string): string {
    return applyNaming(name, this.profile.naming?.element ?? "convention");
  }

  formatAttributeName(name: string): string {
    return applyNaming(name, this.profile.naming?.attribute ?? "convention");
  }

  formatBindablePropertyName(name: string): string {
    const style = this.profile.naming?.bindableProperty ?? "camel";
    if (style === "preserve") return name;
    return toCamelCase(name);
  }

  formatConverterName(name: string): string {
    return applyNaming(name, this.profile.naming?.converter ?? "convention");
  }

  formatBehaviorName(name: string): string {
    return applyNaming(name, this.profile.naming?.behavior ?? "convention");
  }

  formatControllerName(name: string): string {
    return applyNaming(name, this.profile.naming?.controller ?? "convention");
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
    return {
      propertyName: property,
      attributeName,
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

function toKebabCase(value: string): string {
  const withHyphens = value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-");
  return withHyphens.replace(/-+/g, "-").toLowerCase();
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
