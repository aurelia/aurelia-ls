import path from 'node:path';
import ts from 'typescript';

import type { ComputationRead } from '../kernel/computation-lifecycle.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import {
  DEFAULT_SEMANTIC_PROJECT_FINDING_RULE_DISPOSITIONS,
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

const AURELIA_PROJECT_CONFIGURATION_ROOT_FIELDS = Object.freeze([
  '$schema',
  'version',
  'authoredSources',
  'findings',
] as const);
const AURELIA_PROJECT_CONFIGURATION_AUTHORED_SOURCE_FIELDS = Object.freeze(['excludedRoots'] as const);

/**
 * Canonical structural vocabulary shared by native parsing, schema parity tests, and downstream tooling.
 * Finding semantics and their defaults remain owned by the finding catalog and are referenced here directly.
 */
export const AURELIA_PROJECT_CONFIGURATION_CATALOG = Object.freeze({
  fileName: 'aurelia.project.json',
  version: 1,
  supportedVersions: Object.freeze([1] as const),
  fields: Object.freeze({
    root: AURELIA_PROJECT_CONFIGURATION_ROOT_FIELDS,
    authoredSources: AURELIA_PROJECT_CONFIGURATION_AUTHORED_SOURCE_FIELDS,
  }),
  findings: Object.freeze({
    knownRuleIds: SEMANTIC_PROJECT_FINDING_RULE_IDS,
    dispositions: SEMANTIC_PROJECT_FINDING_DISPOSITIONS,
    defaults: DEFAULT_SEMANTIC_PROJECT_FINDING_RULE_DISPOSITIONS,
    futureRuleIdPattern: String.raw`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)+$`,
  }),
});

export const AURELIA_PROJECT_CONFIGURATION_FILE_NAME = AURELIA_PROJECT_CONFIGURATION_CATALOG.fileName;
export const AURELIA_PROJECT_CONFIGURATION_VERSION = AURELIA_PROJECT_CONFIGURATION_CATALOG.version;
export const AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS =
  AURELIA_PROJECT_CONFIGURATION_CATALOG.supportedVersions;

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
  InvalidFindingRuleId = 'aurelia-project-config-invalid-finding-rule-id',
  UnknownFindingRule = 'aurelia-project-config-unknown-finding-rule',
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
  readonly severity: 'error' | 'warning';
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
    new Set(AURELIA_PROJECT_CONFIGURATION_CATALOG.fields.root),
  );
  const rootDiagnostics = [...rootIndex.diagnostics];
  const schema = rootIndex.properties.get('$schema');
  if (schema != null && !ts.isStringLiteral(schema.initializer)) {
    rootDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.InvalidSchema,
      "'$schema' must be a string when present.",
      schema.initializer,
    ));
  }

  const version = rootIndex.properties.get('version');
  if (version == null) {
    rootDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.MissingVersion,
      `Aurelia project configuration requires version ${AURELIA_PROJECT_CONFIGURATION_VERSION}.`,
      root,
    ));
  } else if (
    !ts.isNumericLiteral(version.initializer)
    || !isSupportedProjectConfigurationVersion(Number(version.initializer.text))
  ) {
    rootDiagnostics.push(projectConfigurationDiagnosticForNode(
      projectKey,
      sourceFile,
      SemanticProjectConfigurationDiagnosticKind.UnsupportedVersion,
      `Only Aurelia project configuration version ${AURELIA_PROJECT_CONFIGURATION_VERSION} is supported.`,
      version.initializer,
    ));
  }

  const authoredSources = rootIndex.properties.get('authoredSources');
  const authoredSourceDiagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  let excludedRoots: ts.ArrayLiteralExpression | null = null;
  if (authoredSources != null) {
    if (!ts.isObjectLiteralExpression(authoredSources.initializer)) {
      authoredSourceDiagnostics.push(projectConfigurationDiagnosticForNode(
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
        new Set(AURELIA_PROJECT_CONFIGURATION_CATALOG.fields.authoredSources),
      );
      authoredSourceDiagnostics.push(...authoredIndex.diagnostics);
      const excludedRootsProperty = authoredIndex.properties.get('excludedRoots');
      if (excludedRootsProperty != null) {
        if (!ts.isArrayLiteralExpression(excludedRootsProperty.initializer)) {
          authoredSourceDiagnostics.push(projectConfigurationDiagnosticForNode(
            projectKey,
            sourceFile,
            SemanticProjectConfigurationDiagnosticKind.InvalidExcludedRoots,
            "'authoredSources.excludedRoots' must be an array of relative directory roots.",
            excludedRootsProperty.initializer,
          ));
        } else if (authoredSourceDiagnostics.length === 0) {
          excludedRoots = excludedRootsProperty.initializer;
        }
      }
    }
  }

  const findings = rootIndex.properties.get('findings');
  const acceptedFindingRules: SemanticProjectFindingRuleSetting[] = [];
  const findingDiagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  if (findings != null) {
    if (!ts.isObjectLiteralExpression(findings.initializer)) {
      findingDiagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.InvalidFindings,
        "'findings' must be an object keyed by an admitted semantic finding rule ID.",
        findings.initializer,
      ));
    } else {
      const findingIndex = indexFindingProperties(
        projectKey,
        sourceFile,
        findings.initializer,
      );
      findingDiagnostics.push(...findingIndex.diagnostics);
      for (const [ruleId, rule] of findingIndex.properties) {
        const isKnownRule = isSemanticProjectFindingRuleId(ruleId);
        if (!isKnownRule) {
          const isFutureRule = isFutureSemanticProjectFindingRuleId(ruleId);
          findingDiagnostics.push(projectConfigurationDiagnosticForNode(
            projectKey,
            sourceFile,
            isFutureRule
              ? SemanticProjectConfigurationDiagnosticKind.UnknownFindingRule
              : SemanticProjectConfigurationDiagnosticKind.InvalidFindingRuleId,
            isFutureRule
              ? `Finding rule '${ruleId}' is not known to this Aurelia tooling version and was ignored.`
              : `Finding rule ID '${ruleId}' must be a lowercase dot-separated namespace with kebab-case segments.`,
            rule.name,
            isFutureRule ? 'warning' : 'error',
          ));
        }

        const disposition = ts.isStringLiteral(rule.initializer)
          && isSemanticProjectFindingDisposition(rule.initializer.text)
          ? rule.initializer.text
          : null;
        if (disposition == null) {
          findingDiagnostics.push(projectConfigurationDiagnosticForNode(
            projectKey,
            sourceFile,
            SemanticProjectConfigurationDiagnosticKind.InvalidFindingRuleDisposition,
            `Finding rule '${ruleId}' must be one of ${SEMANTIC_PROJECT_FINDING_DISPOSITIONS.map((value) => `'${value}'`).join(', ')}.`,
            rule.initializer,
          ));
        }
        if (!isKnownRule || disposition == null) {
          continue;
        }
        acceptedFindingRules.push(Object.freeze({
          ruleId,
          disposition,
          authority: 'project-configuration',
          source: projectConfigurationSourceSpanForNode(sourceFile, rule.initializer),
        }));
      }
    }
  }

  const acceptedRoots: string[] = [];
  const excludedRootDiagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  for (const element of excludedRoots?.elements ?? []) {
    if (!ts.isStringLiteral(element)) {
      excludedRootDiagnostics.push(projectConfigurationDiagnosticForNode(
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
      excludedRootDiagnostics.push(projectConfigurationDiagnosticForNode(
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

  const diagnostics = sortProjectConfigurationDiagnostics([
    ...rootDiagnostics,
    ...authoredSourceDiagnostics,
    ...excludedRootDiagnostics,
    ...findingDiagnostics,
  ]);
  if (rootDiagnostics.length > 0) {
    return {
      excludedSourceRootDirs: [],
      findingPolicy: EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
      diagnostics,
    };
  }

  const boundary = new AuthoredSourceBoundary(rootDir, acceptedRoots);
  return {
    excludedSourceRootDirs: boundary.excludedRootDirs,
    findingPolicy: Object.freeze({
      rules: Object.freeze([...acceptedFindingRules].sort((left, right) => left.ruleId.localeCompare(right.ruleId))),
    }),
    diagnostics,
  };
}

function isSupportedProjectConfigurationVersion(
  version: number,
): version is (typeof AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS)[number] {
  return (AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS as readonly number[]).includes(version);
}

function isSemanticProjectFindingDisposition(value: string): value is SemanticProjectFindingDisposition {
  return (AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.dispositions as readonly string[]).includes(value);
}

function isSemanticProjectFindingRuleId(
  value: string,
): value is (typeof SEMANTIC_PROJECT_FINDING_RULE_IDS)[number] {
  return (AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.knownRuleIds as readonly string[]).includes(value);
}

function isFutureSemanticProjectFindingRuleId(value: string): boolean {
  return new RegExp(AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.futureRuleIdPattern, 'u').test(value);
}

function indexFindingProperties(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  object: ts.ObjectLiteralExpression,
): ObjectPropertyIndex {
  const properties = new Map<string, ts.PropertyAssignment>();
  const duplicateNames = new Set<string>();
  const diagnostics: SemanticProjectConfigurationDiagnostic[] = [];
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)) {
      diagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.RootShape,
        "'findings' accepts JSON finding-rule property assignments only.",
        property,
      ));
      continue;
    }

    const name = property.name.text;
    if (properties.has(name) || duplicateNames.has(name)) {
      properties.delete(name);
      duplicateNames.add(name);
      diagnostics.push(projectConfigurationDiagnosticForNode(
        projectKey,
        sourceFile,
        SemanticProjectConfigurationDiagnosticKind.DuplicateProperty,
        `Finding rule '${name}' is declared more than once; every declaration was ignored.`,
        property.name,
      ));
      continue;
    }
    properties.set(name, property);
  }
  return { properties, diagnostics };
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
  severity: SemanticProjectConfigurationDiagnostic['severity'] = 'error',
): SemanticProjectConfigurationDiagnostic {
  return projectConfigurationDiagnostic(
    projectKey,
    sourceFile,
    diagnosticKind,
    message,
    node.getStart(sourceFile),
    node.getEnd(),
    severity,
  );
}

function projectConfigurationDiagnostic(
  projectKey: string,
  sourceFile: ts.JsonSourceFile,
  diagnosticKind: SemanticProjectConfigurationDiagnosticKind,
  message: string,
  start: number,
  end: number,
  severity: SemanticProjectConfigurationDiagnostic['severity'] = 'error',
): SemanticProjectConfigurationDiagnostic {
  const boundedStart = Math.max(0, Math.min(start, sourceFile.text.length));
  const boundedEnd = Math.max(boundedStart, Math.min(end, sourceFile.text.length));
  return {
    projectKey,
    diagnosticKind,
    severity,
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
