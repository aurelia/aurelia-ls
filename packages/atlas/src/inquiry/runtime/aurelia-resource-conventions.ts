import { existsSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  objectLiteralStringPropertyValue,
  ownerNameForNode,
  toPosixPath,
} from "../../source/index.js";
import {
  aureliaDecoratorExportNameForExpression,
  type AureliaSourceImports,
} from "./aurelia-source-imports.js";

/** Aurelia named resource kind as surfaced by Atlas architecture lenses. */
export type AureliaConventionResourceKind =
  | "custom-element"
  | "custom-attribute"
  | "template-controller"
  | "value-converter"
  | "binding-behavior"
  | "binding-command";

/** Resource identity inferred from Aurelia naming conventions. */
export interface AureliaResourceNameConvention {
  readonly name: string;
  readonly resourceKind: AureliaConventionResourceKind;
}

export interface AureliaConventionResourceClassSignal {
  readonly name: string;
  readonly resourceKind: AureliaConventionResourceKind;
  readonly mechanism: string;
}

const resourceClassSuffixes = new Map<string, AureliaConventionResourceKind>([
  ["CustomElement", "custom-element"],
  ["CustomAttribute", "custom-attribute"],
  ["TemplateController", "template-controller"],
  ["ValueConverter", "value-converter"],
  ["BindingBehavior", "binding-behavior"],
  ["BindingCommand", "binding-command"],
]);

const htmlTemplateExtension = ".html";

/** Mirror the framework/plugin-conventions class-name resource convention. */
export function readAureliaResourceNameConvention(
  className: string,
): AureliaResourceNameConvention | null {
  const match = /^(.+?)(CustomElement|CustomAttribute|ValueConverter|BindingBehavior|BindingCommand|TemplateController)?$/.exec(className);
  if (match === null) {
    return null;
  }
  const bareName = match[1];
  if (bareName === undefined || bareName.length === 0) {
    return null;
  }
  const suffix = match[2] ?? "CustomElement";
  const resourceKind = resourceClassSuffixes.get(suffix);
  if (resourceKind === undefined) {
    return null;
  }
  return {
    name:
      resourceKind === "value-converter" || resourceKind === "binding-behavior"
        ? camelCase(bareName)
        : kebabCase(bareName),
    resourceKind,
  };
}

/** Mirror the framework/plugin-conventions file-name resource convention. */
export function conventionalResourceNameForFilePath(filePath: string): string {
  const parsed = path.posix.parse(toPosixPath(filePath));
  const name = parsed.name === "index" ? path.posix.basename(parsed.dir) : parsed.name;
  return kebabCase(name);
}

/** Return true when class-name and file-name conventions refer to the same resource identity. */
export function isConventionResourceNameCompatible(
  conventionName: string,
  fileResourceName: string,
): boolean {
  return conventionName.replace(/-/g, "") === fileResourceName.replace(/-/g, "");
}

export function aureliaConventionResourceForClass(
  sourceFile: ts.SourceFile,
  node: ts.ClassDeclaration,
  bindings: AureliaSourceImports,
): AureliaConventionResourceClassSignal | null {
  if (hasExplicitAureliaResourceDecorator(node, bindings)) {
    return null;
  }
  const convention = readAureliaResourceNameConvention(node.name?.text ?? "");
  if (convention === null) {
    return null;
  }
  if (
    convention.resourceKind === "custom-element" &&
    (
      !isConventionResourceNameCompatible(
        convention.name,
        conventionalResourceNameForFilePath(sourceFile.fileName),
      ) ||
      !hasConventionalTemplatePair(sourceFile.fileName)
    )
  ) {
    return null;
  }
  return {
    name: convention.name,
    resourceKind: convention.resourceKind,
    mechanism: `convention:${convention.resourceKind}`,
  };
}

/** Return true when a class already has an explicit Aurelia resource decorator. */
export function hasExplicitAureliaResourceDecorator(
  node: ts.ClassDeclaration,
  bindings: AureliaSourceImports,
): boolean {
  for (const decorator of ts.getDecorators(node) ?? []) {
    const expression = decorator.expression;
    const call = ts.isCallExpression(expression) ? expression : undefined;
    if (isAureliaResourceDecoratorExportName(
      aureliaDecoratorExportNameForExpression(
        call?.expression ?? expression,
        bindings,
      ),
    )) {
      return true;
    }
  }
  return false;
}

export function isAureliaResourceDecoratorExportName(
  decoratorName: string | null,
): decoratorName is
  | "customElement"
  | "customAttribute"
  | "valueConverter"
  | "bindingBehavior" {
  switch (decoratorName) {
    case "customElement":
    case "customAttribute":
    case "valueConverter":
    case "bindingBehavior":
      return true;
    default:
      return false;
  }
}

export function aureliaResourceNameFromDecorator(
  call: ts.CallExpression | undefined,
  decoratedNode: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  const first = call?.arguments[0];
  if (first !== undefined) {
    if (ts.isStringLiteralLike(first)) {
      return first.text;
    }
    if (ts.isObjectLiteralExpression(first)) {
      const name = objectLiteralStringPropertyValue(first, "name", sourceFile);
      if (name !== null) {
        return name;
      }
    }
  }
  return ownerNameForNode(decoratedNode);
}

/** Return true when a class file has the conventional companion HTML template. */
export function hasConventionalTemplatePair(fileName: string): boolean {
  return conventionalTemplateCandidates(fileName).some((candidate) => existsSync(candidate));
}

function conventionalTemplateCandidates(fileName: string): readonly string[] {
  const normalized = toPosixPath(fileName);
  const extension = path.posix.extname(normalized);
  const withoutExtension = extension.length === 0
    ? normalized
    : normalized.slice(0, -extension.length);
  return [
    `${withoutExtension}${htmlTemplateExtension}`,
    `${withoutExtension}-view${htmlTemplateExtension}`,
  ];
}

function camelCase(input: string): string {
  return baseCase(input, (char, separator) =>
    separator ? char.toUpperCase() : char.toLowerCase(),
  );
}

function kebabCase(input: string): string {
  return baseCase(input, (char, separator) =>
    separator ? `-${char.toLowerCase()}` : char.toLowerCase(),
  );
}

function baseCase(
  input: string,
  map: (char: string, separator: boolean) => string,
): string {
  let separator = false;
  let output = "";
  let previousKind = CharKind.None;
  let current = input.charAt(0);
  let currentKind = charKind(current);

  for (let index = 0; index < input.length; index += 1) {
    const previous = previousKind;
    const char = current;
    const kind = currentKind;
    current = input.charAt(index + 1);
    currentKind = charKind(current);

    if (kind === CharKind.None) {
      if (output.length > 0) {
        separator = true;
      }
      previousKind = kind;
      continue;
    }

    if (!separator && output.length > 0 && kind === CharKind.Upper) {
      separator = previous === CharKind.Lower || currentKind === CharKind.Lower;
    }
    output += map(char, separator);
    separator = false;
    previousKind = kind;
  }

  return output;
}

const enum CharKind {
  None,
  Digit,
  Upper,
  Lower,
}

function charKind(char: string): CharKind {
  if (char.length === 0) {
    return CharKind.None;
  }
  if (char !== char.toUpperCase()) {
    return CharKind.Lower;
  }
  if (char !== char.toLowerCase()) {
    return CharKind.Upper;
  }
  return char >= "0" && char <= "9" ? CharKind.Digit : CharKind.None;
}
