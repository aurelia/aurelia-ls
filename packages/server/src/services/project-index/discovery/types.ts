import type { NormalizedPath, ResourceCollections } from "@aurelia-ls/domain";

export type BindingMode = "default" | "oneTime" | "toView" | "fromView" | "twoWay";

export interface BindableSpec {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: string;
}

export interface ResourceRegistration {
  readonly kind: "global" | "local";
  readonly owner?: NormalizedPath | null;
  readonly scope?: string | null;
  readonly resourceName?: string;
  readonly metadata?: unknown;
}

export interface DiscoveredElement {
  readonly kind: "element";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly bindables: Record<string, BindableSpec>;
  readonly containerless: boolean;
  readonly boundary: boolean;
  readonly source: NormalizedPath;
  readonly className: string;
}

export interface DiscoveredAttribute {
  readonly kind: "attribute";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly bindables: Record<string, BindableSpec>;
  readonly primary: string | null;
  readonly isTemplateController: boolean;
  readonly noMultiBindings: boolean;
  readonly source: NormalizedPath;
  readonly className: string;
}

export interface DiscoveredValueConverter {
  readonly kind: "valueConverter";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly source: NormalizedPath;
  readonly className: string;
}

export interface DiscoveredBindingBehavior {
  readonly kind: "bindingBehavior";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly source: NormalizedPath;
  readonly className: string;
}

export type DiscoveredResource =
  | DiscoveredElement
  | DiscoveredAttribute
  | DiscoveredValueConverter
  | DiscoveredBindingBehavior;

export interface DiscoveryResult {
  readonly resources: ResourceCollections;
  readonly descriptors: readonly DiscoveredResource[];
  readonly registrations: readonly ResourceRegistration[];
}

export interface ResourceOptionParse {
  name?: string;
  aliases: string[];
  bindables: BindableSpec[];
  containerless: boolean;
  templateController: boolean;
  noMultiBindings: boolean;
}

export interface NameOnlyOptions {
  name?: string;
  aliases: string[];
}
