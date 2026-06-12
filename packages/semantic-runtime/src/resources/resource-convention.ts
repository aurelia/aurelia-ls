import path from 'node:path';
import ts from 'typescript';
import type { SourceFileAdmission } from '../boot/frames.js';
import {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceDefinitionKind,
  type NamedResourceDefinitionKind,
} from './resource-kind.js';

type ConventionalResourceKind = NamedResourceDefinitionKind;

const resourceClassSuffixes = new Map<string, ConventionalResourceKind>([
  ['CustomElement', ResourceDefinitionKind.CustomElement],
  ['CustomAttribute', ResourceDefinitionKind.CustomAttribute],
  ['TemplateController', ResourceDefinitionKind.TemplateController],
  ['ValueConverter', ResourceDefinitionKind.ValueConverter],
  ['BindingBehavior', ResourceDefinitionKind.BindingBehavior],
  ['BindingCommand', ResourceDefinitionKind.BindingCommand],
]);

const htmlTemplateExtension = '.html';

export class ResourceNameConvention {
  constructor(
    readonly name: string,
    readonly resourceKind: ConventionalResourceKind,
  ) {}
}

/** Mirrors @aurelia/plugin-conventions nameConvention(className). */
export function readResourceNameConvention(className: string): ResourceNameConvention | null {
  const match = /^(.+?)(CustomElement|CustomAttribute|ValueConverter|BindingBehavior|BindingCommand|TemplateController)?$/.exec(className);
  if (match == null) {
    return null;
  }
  const bareName = match[1];
  if (bareName == null || bareName.length === 0) {
    return null;
  }
  const suffix = match[2] ?? 'CustomElement';
  const resourceKind = resourceClassSuffixes.get(suffix);
  if (resourceKind == null) {
    return null;
  }
  return new ResourceNameConvention(
    resourceKind === ResourceDefinitionKind.ValueConverter || resourceKind === ResourceDefinitionKind.BindingBehavior
      ? camelCase(bareName)
      : kebabCase(bareName),
    resourceKind,
  );
}

/** Mirrors @aurelia/plugin-conventions resourceName(filePath). */
export function conventionalResourceNameForFilePath(filePath: string): string {
  const parsed = path.posix.parse(normalizeProjectPath(filePath));
  const name = parsed.name === 'index' ? path.posix.basename(parsed.dir) : parsed.name;
  return kebabCase(name);
}

export function isConventionResourceNameCompatible(
  conventionName: string,
  fileResourceName: string,
): boolean {
  return conventionName.replace(/-/g, '') === fileResourceName.replace(/-/g, '');
}

export function readConventionalTemplateAdmission(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase | null,
): SourceFileAdmission | null {
  const className = classNode?.name?.text ?? null;
  if (className == null) {
    return null;
  }
  const convention = readResourceNameConvention(className);
  if (
    convention == null
    || convention.resourceKind !== ResourceDefinitionKind.CustomElement
    || !isConventionResourceNameCompatible(convention.name, conventionalResourceNameForFilePath(context.moduleKey))
  ) {
    return null;
  }

  return findTemplateAdmission(context, conventionalTemplateCandidates(context.moduleKey));
}

export function hasConventionalTemplatePair(
  context: ResourceRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
): boolean {
  return readConventionalTemplateAdmission(context, classNode) != null;
}

function conventionalTemplateCandidates(moduleKey: string): readonly string[] {
  const normalized = normalizeProjectPath(moduleKey);
  const extension = path.posix.extname(normalized);
  const withoutExtension = extension.length === 0
    ? normalized
    : normalized.slice(0, -extension.length);
  return [
    `${withoutExtension}${htmlTemplateExtension}`,
    `${withoutExtension}-view${htmlTemplateExtension}`,
  ];
}

function findTemplateAdmission(
  context: ResourceRecognitionContext,
  candidates: readonly string[],
): SourceFileAdmission | null {
  for (const candidate of candidates) {
    const admission = context.sourceFiles.find((source) =>
      source.path === candidate
      && source.language === SourceLanguage.Html
      && source.role === SourceFileRole.Template
    ) ?? null;
    if (admission != null) {
      return admission;
    }
  }
  return null;
}

function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function camelCase(input: string): string {
  return baseCase(input, (char, separator) => separator ? char.toUpperCase() : char.toLowerCase());
}

function kebabCase(input: string): string {
  return baseCase(input, (char, separator) => separator ? `-${char.toLowerCase()}` : char.toLowerCase());
}

function baseCase(
  input: string,
  map: (char: string, separator: boolean) => string,
): string {
  let separator = false;
  let output = '';
  let previousKind = CharKind.None;
  let current = input.charAt(0);
  let currentKind = charKind(current);

  for (let index = 0; index < input.length; index++) {
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
  return char >= '0' && char <= '9' ? CharKind.Digit : CharKind.None;
}
