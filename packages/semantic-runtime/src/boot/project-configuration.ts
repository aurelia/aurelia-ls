import path from 'node:path';
import ts from 'typescript';

import type { ComputationRead } from '../kernel/computation-lifecycle.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import {
  EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
  SEMANTIC_PROJECT_FINDING_DISPOSITIONS,
  SEMANTIC_PROJECT_FINDING_RULE_IDS,
  type SemanticProjectFindingDisposition,
  type SemanticProjectFindingPolicy,
  type SemanticProjectFindingRuleSetting,
} from '../findings/analysis-limitation-policy.js';
import type {
  SemanticRuntimeProjectInputGeneration,
  SemanticRuntimeProjectInputReadScope,
} from '../kernel/project-input.js';
import { AuthoredSourceBoundary } from './source-boundary.js';

export const AURELIA_PROJECT_CONFIGURATION_FILE_NAME = 'aurelia.project.json';
export const AURELIA_PROJECT_CONFIGURATION_VERSION = 2;
export const AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS = Object.freeze([1, 2] as const);

export const enum SemanticProjectConfigurationDiagnosticKind {
  Syntax = 'aurelia-project-config-syntax',
  RootShape = 'aurelia-project-config-root-shape',
  UnknownProperty = 'aurelia-project-config-unknown-property',
  DuplicateProperty = 'aurelia-project-config-duplicate-property',
  MissingVersion = 'aurelia-project-config-missing-version',
  UnsupportedVersion = 'aurelia-project-config-unsupported-version',
  Unreadable = 'aurelia-project-config-unreadable',
  InvalidSchema = 'aurelia-project-config-invalid-schema',
  InvalidAuthoredSources = 'aurelia-project-config-invalid-authored-sources',
  InvalidExcludedRoots = 'aurelia-project-config-invalid-excluded-roots',
  InvalidExcludedRoot = 'aurelia-project-config-invalid-excluded-root',
  InvalidFindings = 'aurelia-project-config-invalid-findings',
  InvalidFindingRuleDisposition = 'aurelia-project-config-invalid-finding-rule-disposition',
}

export interface SemanticProjectConfigurationSourcePosition {
  readonly line: number;
  readonly character: number;
}

export interface SemanticProjectConfigurationSourceSpan {
  readonly filePath: string;
  readonly start: number;
  readonly end: number;
  readonly startPosition: SemanticProjectConfigurationSourcePosition;
  readonly endPosition: SemanticProjectConfigurationSourcePosition;
}

/** Runtime-static diagnostic for the exact native project configuration input. */
export interface SemanticProjectConfigurationDiagnostic {
  readonly projectKey: string;
  readonly diagnosticKind:
    | SemanticProjectConfigurationDiagnosticKind
    | `${SemanticProjectConfigurationDiagnosticKind}`;
  readonly severity: 'error';
  readonly message: string;
  readonly source: SemanticProjectConfigurationSourceSpan;
}

/** Parsed native project configuration plus the exact input read that produced it. */
export class ProjectConfigurationResult {
  readonly revision: string;

  constructor(
    readonly projectKey: string,
    readonly rootDir: string,
    readonly filePath: string,
    readonly exists: boolean,
    readonly excludedSourceRootDirs: readonly string[],
    readonly findingPolicy: SemanticProjectFindingPolicy,
    readonly diagnostics: readonly SemanticProjectConfigurationDiagnostic[],
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
  ) {
    this.revision = stableKernelLocalHash(JSON.stringify({
      projectKey,
      rootDir,
      filePath,
      exists,
      excludedSourceRootDirs,
      findingPolicy,
      diagnostics,
      inputs: inputReadScope.readRegisteredInputs().map((read) => [read.readKey, read.observedRevision]),
    }));
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return this.inputReadScope.readRegisteredInputs();
  }

}

interface JsonSourceFileWithParseDiagnostics extends ts.JsonSourceFile {
  readonly parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
}

interface ParsedProjectConfiguration {
  readonly excludedSourceRootDirs: readonly string[];
  readonly findingPolicy: SemanticProjectFindingPolicy;
  readonly diagnostics: readonly SemanticProjectConfigurationDiagnostic[];
}

interface ObjectPropertyIndex {
  readonly properties: ReadonlyMap<string, ts.PropertyAssignment>;
  readonly diagnostics: readonly SemanticProjectConfigurationDiagnostic[];
}

interface ExcludedRootValidation {
  readonly normalized: string | null;
  readonly problem: string | null;
}

/** Read and validate the exact project-root native configuration through one retained input scope. */
export function buildProjectConfigurationResult(
  inputGeneration: SemanticRuntimeProjectInputGeneration,
  rootDir: string,
): ProjectConfigurationResult {
  const inputReadScope = inputGeneration.createReadScope('project-configuration');
  const absoluteRootDir = path.resolve(rootDir);
  const filePath = path.join(absoluteRootDir, AURELIA_PROJECT_CONFIGURATION_FILE_NAME).replace(/\\/g, '/');
  const exists = inputReadScope.host.fileExists(filePath);
  const text = inputReadScope.host.readFile(filePath);
  if (!exists && text != null) {
    throw new Error(`Project-input host returned text for absent Aurelia project configuration '${filePath}'.`);
  }
  const parsed = !exists
    ? { excludedSourceRootDirs: [], findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY, diagnostics: [] }
    : text == null
      ? {
          excludedSourceRootDirs: [],
          findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
          diagnostics: [unreadableProjectConfigurationDiagnostic(inputGeneration.projectKey, filePath)],
        }
      : parseProjectConfiguration(inputGeneration.projectKey, absoluteRootDir, filePath, text, inputReadScope);
  return new ProjectConfigurationResult(
    inputGeneration.projectKey,
    absoluteRootDir,
    filePath,
    exists,
    parsed.excludedSourceRootDirs,
    parsed.findingPolicy,
    parsed.diagnostics,
    inputReadScope,
  );
}

function parseProjectConfiguration(
  projectKey: string,
  rootDir: string,
  filePath: string,
  text: string,
  inputReadScope: SemanticRuntimeProjectInputReadScope,
): ParsedProjectConfiguration {
  const sourceFile = ts.parseJsonText(filePath, text) as JsonSourceFileWithParseDiagnostics;
  if (!Array.isArray(sourceFile.parseDiagnostics)) {
    throw new Error(
      `TypeScript ${ts.version} did not expose JSON parse diagnostics for '${filePath}'; `
      + 'semantic-runtime cannot validate native project configuration safely.',
    );
  }
  if (sourceFile.parseDiagnostics.length > 0) {
    return {
      excludedSourceRootDirs: [],
      findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
      diagnostics: syntaxDiagnosticsForParseDiagnostics(projectKey, sourceFile, sourceFile.parseDiagnostics),
    };
  }
  const dialectDiagnostics = projectConfigurationJsoncDialectDiagnostics(projectKey, sourceFile);
  if (dialectDiagnostics.length > 0) {
    return {
      excludedSourceRootDirs: [],
      findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
      diagnostics: dialectDiagnostics,
    };
  }

  const statement = sourceFile.statements.length === 1 ? sourceFile.statements[0] : null;
  const root = statement?.expression;
  if (root == null || !ts.isObjectLiteralExpression(root)) {
    return invalidWholeConfiguration(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.RootShape,
      'Aurelia project configuration must be one JSON object.',
      root ?? sourceFile,
    );
  }

  const rootIndex = indexObjectProperties(
    projectKey,
    sourceFile,
    root,
    new Set(['$schema', 'version', 'authoredSources', 'findings']),
  );
  const shapeDiagnostics = [...rootIndex.diagnostics];
  const schema = rootIndex.properties.get('$schema');
  if (schema != null && !ts.isStringLiteral(schema.initializer)) {
    shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.InvalidSchema,
      "'$schema' must be a string when present.",
      schema.initializer,
    ));
  }

  const version = rootIndex.properties.get('version');
  let acceptedVersion: (typeof AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS)[number] | null = null;
  if (version == null) {
    shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.MissingVersion,
      `Aurelia project configuration requires a supported version (${AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS.join(' or ')}).`,
      root,
    ));
  } else if (
    !ts.isNumericLiteral(version.initializer)
    || !isSupportedProjectConfigurationVersion(Number(version.initializer.text))
  ) {
    shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.UnsupportedVersion,
      `Only Aurelia project configuration versions ${AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS.join(' and ')} are supported.`,
      version.initializer,
    ));
  } else {
    acceptedVersion = Number(version.initializer.text) as (typeof AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS)[number];
  }

  const authoredSources = rootIndex.properties.get('authoredSources');
  let excludedRoots: ts.ArrayLiteralExpression | null = null;
  if (authoredSources != null) {
    if (!ts.isObjectLiteralExpression(authoredSources.initializer)) {
      shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.InvalidAuthoredSources,
        "'authoredSources' must be an object.",
        authoredSources.initializer,
      ));
    } else {
      const authoredIndex = indexObjectProperties(
        projectKey,
        sourceFile,
        authoredSources.initializer,
        new Set(['excludedRoots']),
      );
      shapeDiagnostics.push(...authoredIndex.diagnostics);
      const excludedRootsProperty = authoredIndex.properties.get('excludedRoots');
      if (excludedRootsProperty != null) {
        if (!ts.isArrayLiteralExpression(excludedRootsProperty.initializer)) {
          shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
            projectKey,
            sourceFile,
            SemanticProjectConfigurationDiagnosticKind.InvalidExcludedRoots,
            "'authoredSources.excludedRoots' must be an array of relative directory roots.",
            excludedRootsProperty.initializer,
          ));
        } else {
          excludedRoots = excludedRootsProperty.initializer;
        }
      }
    }
  }

  const findings = rootIndex.properties.get('findings');
  const acceptedFindingRules: SemanticProjectFindingRuleSetting[] = [];
  const findingEntryDiagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  if (findings != null && acceptedVersion === 1) {
    shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.UnknownProperty,
      "Aurelia project configuration version 1 does not define property 'findings'.",
      findings.name,
    ));
  } else if (findings != null && acceptedVersion === 2) {
    if (!ts.isObjectLiteralExpression(findings.initializer)) {
      shapeDiagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.InvalidFindings,
        "'findings' must be an object keyed by an admitted semantic finding rule ID.",
        findings.initializer,
      ));
    } else {
      const findingIndex = indexObjectProperties(
        projectKey,
        sourceFile,
        findings.initializer,
        new Set(SEMANTIC_PROJECT_FINDING_RULE_IDS),
      );
      shapeDiagnostics.push(...findingIndex.diagnostics);
      for (const ruleId of SEMANTIC_PROJECT_FINDING_RULE_IDS) {
        const rule = findingIndex.properties.get(ruleId);
        if (rule == null) {
          continue;
        }
        if (!ts.isStringLiteral(rule.initializer) || !isSemanticProjectFindingDisposition(rule.initializer.text)) {
          findingEntryDiagnostics.push(projectConfigurationDiagnosticForNode(
            projectKey,
            sourceFile,
            SemanticProjectConfigurationDiagnosticKind.InvalidFindingRuleDisposition,
            `Finding rule '${ruleId}' must be one of ${SEMANTIC_PROJECT_FINDING_DISPOSITIONS.map((value) => `'${value}'`).join(', ')}.`,
            rule.initializer,
          ));
          continue;
        }
        acceptedFindingRules.push(Object.freeze({
          ruleId,
          disposition: rule.initializer.text,
          authority: 'project-configuration',
          source: projectConfigurationSourceSpanForNode(sourceFile, rule.initializer),
        }));
      }
    }
  }

  const acceptedRoots: string[] = [];
  const entryDiagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  for (const element of excludedRoots?.elements ?? []) {
    if (!ts.isStringLiteral(element)) {
      entryDiagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.InvalidExcludedRoot,
        'Each authored source exclusion must be a non-empty relative directory root.',
        element,
      ));
      continue;
    }
    const validation = validateExcludedRoot(rootDir, element.text, inputReadScope);
    if (validation.problem != null || validation.normalized == null) {
      entryDiagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.InvalidExcludedRoot,
        validation.problem ?? `Authored source exclusion '${element.text}' is invalid.`,
        element,
      ));
      continue;
    }
    acceptedRoots.push(validation.normalized);
  }

  if (shapeDiagnostics.length > 0) {
    return {
      excludedSourceRootDirs: [],
      findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
      diagnostics: sortProjectConfigurationDiagnostics([
        ...shapeDiagnostics,
        ...entryDiagnostics,
        ...findingEntryDiagnostics,
      ]),
    };
  }

  const boundary = new AuthoredSourceBoundary(rootDir, acceptedRoots);
  return {
    excludedSourceRootDirs: boundary.excludedRootDirs,
    findingPolicy: Object.freeze({
      rules: Object.freeze([...acceptedFindingRules].sort((left, right) => left.ruleId.localeCompare(right.ruleId))),
    }),
    diagnostics: sortProjectConfigurationDiagnostics([...entryDiagnostics, ...findingEntryDiagnostics]),
  };
}

function isSupportedProjectConfigurationVersion(
  version: number,
): version is (typeof AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS)[number] {
  return (AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS as readonly number[]).includes(version);
}

function isSemanticProjectFindingDisposition(value: string): value is SemanticProjectFindingDisposition {
  return (SEMANTIC_PROJECT_FINDING_DISPOSITIONS as readonly string[]).includes(value);
}

function indexObjectProperties(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  object: ts.ObjectLiteralExpression,
  allowedNames: ReadonlySet<string>,
): ObjectPropertyIndex {
  const properties = new Map<string, ts.PropertyAssignment>();
  const diagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)) {
      diagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.RootShape,
        'Aurelia project configuration accepts JSON property assignments only.',
        property,
      ));
      continue;
    }
    const name = property.name.text;
    if (!allowedNames.has(name)) {
      diagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.UnknownProperty,
        `Unknown Aurelia project configuration property '${name}'.`,
        property.name,
      ));
      continue;
    }
    if (properties.has(name)) {
      diagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.DuplicateProperty,
        `Aurelia project configuration property '${name}' is declared more than once.`,
        property.name,
      ));
      continue;
    }
    properties.set(name, property);
  }
  return { properties, diagnostics };
}

function validateExcludedRoot(
  rootDir: string,
  value: string,
  inputReadScope: SemanticRuntimeProjectInputReadScope,
): ExcludedRootValidation {
  if (value.length === 0 || value.trim() !== value) {
    return {
      normalized: null,
      problem: 'An authored source exclusion must be a non-empty relative directory root without surrounding whitespace.',
    };
  }
  if (
    path.isAbsolute(value)
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
  ) {
    return {
      normalized: null,
      problem: `Authored source exclusion '${value}' must be relative to the project root.`,
    };
  }
  if (value.startsWith('!') || /[*?[\]{}]/.test(value)) {
    return {
      normalized: null,
      problem: `Authored source exclusion '${value}' must be a directory root, not a glob or negated pattern.`,
    };
  }
  if (containsControlCharacter(value)) {
    return {
      normalized: null,
      problem: `Authored source exclusion '${JSON.stringify(value)}' must not contain control characters.`,
    };
  }
  const segments = value.split(/[\\/]/);
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    return {
      normalized: null,
      problem: `Authored source exclusion '${value}' must not contain empty, current-directory, or parent-directory segments.`,
    };
  }
  const portablePath = segments.join(path.sep);
  try {
    new AuthoredSourceBoundary(rootDir, [portablePath]);
  } catch {
    return {
      normalized: null,
      problem: `Authored source exclusion '${value}' must name a strict descendant of the project root.`,
    };
  }
  const hostPath = path.resolve(rootDir, portablePath);
  const isDirectory = inputReadScope.host.directoryExists(hostPath);
  const exists = inputReadScope.host.fileExists(hostPath);
  if (exists && !isDirectory) {
    return {
      normalized: null,
      problem: `Authored source exclusion '${value}' names an existing file; exclusions must be directory roots.`,
    };
  }
  return { normalized: segments.join('/'), problem: null };
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function syntaxDiagnosticsForParseDiagnostics(
  projectKey: string,
  sourceFile: JsonSourceFileWithParseDiagnostics,
  parseDiagnostics: readonly ts.DiagnosticWithLocation[],
): readonly SemanticProjectConfigurationDiagnostic[] {
  return sortProjectConfigurationDiagnostics(parseDiagnostics.map((diagnostic) =>
    projectConfigurationDiagnostic(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.Syntax,
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      diagnostic.start,
      diagnostic.start + diagnostic.length,
    )
  ));
}

function projectConfigurationJsoncDialectDiagnostics(
  projectKey: string,
  sourceFile: JsonSourceFileWithParseDiagnostics,
): readonly SemanticProjectConfigurationDiagnostic[] {
  const diagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  const conversionDiagnostics: ts.Diagnostic[] = [];
  try {
    ts.convertToObject(sourceFile, conversionDiagnostics);
  } catch (error) {
    diagnostics.push(projectConfigurationDiagnostic(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.Syntax,
      error instanceof Error ? error.message : String(error),
      0,
      sourceFile.text.length,
    ));
  }
  for (const diagnostic of conversionDiagnostics) {
    const start = diagnostic.start ?? 0;
    diagnostics.push(projectConfigurationDiagnostic(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.Syntax,
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      start,
      start + (diagnostic.length ?? 0),
    ));
  }

  function visit(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      const tokenText = node.getText(sourceFile);
      try {
        JSON.parse(tokenText);
      } catch {
        diagnostics.push(projectConfigurationDiagnosticForNode(
          projectKey,
          sourceFile,
          SemanticProjectConfigurationDiagnosticKind.Syntax,
          `Aurelia project configuration uses JSONC; '${tokenText}' is not a JSON literal.`,
          node,
        ));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return sortProjectConfigurationDiagnostics(diagnostics);
}

function sortProjectConfigurationDiagnostics(
  diagnostics: readonly SemanticProjectConfigurationDiagnostic[],
): readonly SemanticProjectConfigurationDiagnostic[] {
  const distinct = new Map<string, SemanticProjectConfigurationDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = JSON.stringify([
      diagnostic.diagnosticKind,
      diagnostic.message,
      diagnostic.source.start,
      diagnostic.source.end,
    ]);
    distinct.set(key, diagnostic);
  }
  return [...distinct.values()].sort((left, right) =>
    left.source.start - right.source.start
    || left.source.end - right.source.end
    || left.message.localeCompare(right.message)
  );
}

function unreadableProjectConfigurationDiagnostic(
  projectKey: string,
  filePath: string,
): SemanticProjectConfigurationDiagnostic {
  return {
    projectKey,
    diagnosticKind: SemanticProjectConfigurationDiagnosticKind.Unreadable,
    severity: 'error',
    message: `Aurelia project configuration '${filePath}' exists but could not be read.`,
    source: {
      filePath,
      start: 0,
      end: 0,
      startPosition: { line: 0, character: 0 },
      endPosition: { line: 0, character: 0 },
    },
  };
}

function invalidWholeConfiguration(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  diagnosticKind: SemanticProjectConfigurationDiagnosticKind,
  message: string,
  node: ts.Node,
): ParsedProjectConfiguration {
  return {
    excludedSourceRootDirs: [],
    findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
    diagnostics: [projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      diagnosticKind,
      message,
      node,
    )],
  };
}

function projectConfigurationSourceSpanForNode(
  sourceFile: ts.JsonSourceFile,
  node: ts.Node,
): SemanticProjectConfigurationSourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return Object.freeze({
    filePath: sourceFile.fileName,
    start,
    end,
    startPosition: Object.freeze(sourceFile.getLineAndCharacterOfPosition(start)),
    endPosition: Object.freeze(sourceFile.getLineAndCharacterOfPosition(end)),
  });
}

function projectConfigurationDiagnosticForNode(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  diagnosticKind: SemanticProjectConfigurationDiagnosticKind,
  message: string,
  node: ts.Node,
): SemanticProjectConfigurationDiagnostic {
  return projectConfigurationDiagnostic(
    projectKey,
    sourceFile,
    diagnosticKind,
    message,
    node.getStart(sourceFile),
    node.getEnd(),
  );
}

function projectConfigurationDiagnostic(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  diagnosticKind: SemanticProjectConfigurationDiagnosticKind,
  message: string,
  start: number,
  end: number,
): SemanticProjectConfigurationDiagnostic {
  const boundedStart = Math.max(0, Math.min(start, sourceFile.text.length));
  const boundedEnd = Math.max(boundedStart, Math.min(end, sourceFile.text.length));
  return {
    projectKey,
    diagnosticKind,
    severity: 'error',
    message,
    source: {
      filePath: sourceFile.fileName,
      start: boundedStart,
      end: boundedEnd,
      startPosition: sourceFile.getLineAndCharacterOfPosition(boundedStart),
      endPosition: sourceFile.getLineAndCharacterOfPosition(boundedEnd),
    },
  };
}
