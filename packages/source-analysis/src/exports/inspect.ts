import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import ts from 'typescript';

import type { PackageExportRecord } from './schema.js';

export interface ExportSymbolLocation {
  file: string | null;
  line: number | null;
}

export interface ExportSymbolMember {
  name: string;
  kind: string;
  optional: boolean;
  readonly: boolean;
  declaration: ExportSymbolLocation;
  type: string | null;
}

export interface ExportSymbolInspection {
  status: 'resolved' | 'unresolved';
  symbolName: string;
  declaration: ExportSymbolLocation;
  members: ExportSymbolMember[];
  matchedMember: ExportSymbolMember | null;
  diagnostics: string[];
}

interface CachedProgram {
  program: ts.Program;
  checker: ts.TypeChecker;
}

const PROGRAM_CACHE = new Map<string, CachedProgram>();

function normalizePath(pathValue: string): string {
  return resolve(pathValue).replace(/\\/g, '/');
}

function toRepoRelative(root: string, pathValue: string | null): string | null {
  if (!pathValue) return null;
  const normalizedRoot = normalizePath(root);
  const normalizedPath = normalizePath(pathValue);
  if (normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
}

function findNearestTsconfig(startPath: string): string | null {
  let currentDir = dirname(startPath);

  while (true) {
    const tsconfigPath = resolve(currentDir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) return tsconfigPath;

    const testTsconfigPath = resolve(currentDir, 'tsconfig.test.json');
    if (existsSync(testTsconfigPath)) return testTsconfigPath;

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function loadProgram(tsconfigPath: string): CachedProgram {
  const normalizedTsconfigPath = normalizePath(tsconfigPath);
  const cached = PROGRAM_CACHE.get(normalizedTsconfigPath);
  if (cached) return cached;

  const configFile = ts.readConfigFile(normalizedTsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }

  const configDir = dirname(normalizedTsconfigPath);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir);
  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options,
    noEmit: true,
  });
  const entry = {
    program,
    checker: program.getTypeChecker(),
  };
  PROGRAM_CACHE.set(normalizedTsconfigPath, entry);
  return entry;
}

function declarationName(node: ts.Node): string | null {
  if (
    (ts.isClassDeclaration(node)
      || ts.isFunctionDeclaration(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isTypeAliasDeclaration(node)
      || ts.isEnumDeclaration(node)
      || ts.isModuleDeclaration(node))
    && node.name
  ) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}

function findDeclarationNode(
  sourceFile: ts.SourceFile,
  symbolName: string,
  declarationLine: number | null,
): ts.Node | null {
  const matches: ts.Node[] = [];

  function walk(node: ts.Node): void {
    if (declarationName(node) === symbolName) {
      matches.push(node);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);

  if (matches.length === 0) return null;
  if (declarationLine == null) return matches[0]!;

  return matches
    .slice()
    .sort((left, right) => {
      const leftLine = sourceFile.getLineAndCharacterOfPosition(left.getStart(sourceFile)).line + 1;
      const rightLine = sourceFile.getLineAndCharacterOfPosition(right.getStart(sourceFile)).line + 1;
      const lineDistance = Math.abs(leftLine - declarationLine) - Math.abs(rightLine - declarationLine);
      if (lineDistance !== 0) return lineDistance;
      return left.getStart(sourceFile) - right.getStart(sourceFile);
    })[0]!;
}

function symbolLocation(declaration: ts.Declaration | undefined, repoRoot: string): ExportSymbolLocation {
  if (!declaration) {
    return {
      file: null,
      line: null,
    };
  }

  return {
    file: toRepoRelative(repoRoot, declaration.getSourceFile().fileName),
    line: declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
  };
}

function declarationKindLabel(declaration: ts.Declaration | undefined): string {
  if (!declaration) return 'unknown';
  if (ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)) return 'method';
  if (ts.isGetAccessorDeclaration(declaration)) return 'getter';
  if (ts.isSetAccessorDeclaration(declaration)) return 'setter';
  if (ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) return 'property';
  if (ts.isPropertyAssignment(declaration)) return 'property';
  if (ts.isShorthandPropertyAssignment(declaration)) return 'shorthand-property';
  if (ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) return 'function';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (ts.isInterfaceDeclaration(declaration)) return 'interface';
  if (ts.isEnumMember(declaration)) return 'enum-member';
  if (ts.isModuleDeclaration(declaration)) return 'namespace';
  return ts.SyntaxKind[declaration.kind].toLowerCase();
}

function declarationOptional(declaration: ts.Declaration | undefined): boolean {
  return Boolean(
    declaration
    && 'questionToken' in declaration
    && declaration.questionToken,
  );
}

function declarationReadonly(declaration: ts.Declaration | undefined): boolean {
  if (!declaration || !ts.canHaveModifiers(declaration)) return false;
  return ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
}

function collectSymbolMembers(
  checker: ts.TypeChecker,
  repoRoot: string,
  symbol: ts.Symbol,
  anchor: ts.Node,
): ExportSymbolMember[] {
  const members = new Map<string, ExportSymbolMember>();
  const type = checker.getTypeOfSymbolAtLocation(symbol, anchor);
  const propertySymbols = checker.getPropertiesOfType(type);

  for (const propertySymbol of propertySymbols) {
    const declarations = propertySymbol.declarations ?? [];
    const declaration = declarations[0];
    const propertyType = checker.getTypeOfSymbolAtLocation(propertySymbol, declaration ?? anchor);
    members.set(propertySymbol.getName(), {
      name: propertySymbol.getName(),
      kind: declarationKindLabel(declaration),
      optional: declarationOptional(declaration),
      readonly: declarationReadonly(declaration),
      declaration: symbolLocation(declaration, repoRoot),
      type: checker.typeToString(propertyType),
    });
  }

  return [...members.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function symbolFromDeclaration(
  checker: ts.TypeChecker,
  declaration: ts.Node,
): ts.Symbol | null {
  if (
    (ts.isClassDeclaration(declaration)
      || ts.isFunctionDeclaration(declaration)
      || ts.isInterfaceDeclaration(declaration)
      || ts.isTypeAliasDeclaration(declaration)
      || ts.isEnumDeclaration(declaration)
      || ts.isModuleDeclaration(declaration))
    && declaration.name
  ) {
    return checker.getSymbolAtLocation(declaration.name) ?? null;
  }
  if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
    return checker.getSymbolAtLocation(declaration.name) ?? null;
  }
  return null;
}

export function inspectExportRecord(
  record: PackageExportRecord,
  repoRoot: string,
  memberName?: string | null,
): ExportSymbolInspection {
  const diagnostics: string[] = [];

  if (!record.declaration_file) {
    return {
      status: 'unresolved',
      symbolName: record.exported_name,
      declaration: { file: null, line: null },
      members: [],
      matchedMember: null,
      diagnostics: ['export declaration file is unavailable in the snapshot'],
    };
  }

  const absoluteDeclarationFile = normalizePath(resolve(repoRoot, record.declaration_file));
  const tsconfigPath = findNearestTsconfig(absoluteDeclarationFile);
  if (!tsconfigPath) {
    return {
      status: 'unresolved',
      symbolName: record.declaration_name,
      declaration: {
        file: record.declaration_file,
        line: record.declaration_line,
      },
      members: [],
      matchedMember: null,
      diagnostics: [`no tsconfig found above ${record.declaration_file}`],
    };
  }

  try {
    const { program, checker } = loadProgram(tsconfigPath);
    const sourceFile = program.getSourceFiles().find((candidate) => normalizePath(candidate.fileName) === absoluteDeclarationFile);
    if (!sourceFile) {
      return {
        status: 'unresolved',
        symbolName: record.declaration_name,
        declaration: {
          file: record.declaration_file,
          line: record.declaration_line,
        },
        members: [],
        matchedMember: null,
        diagnostics: [`declaration file ${record.declaration_file} is not part of ${toRepoRelative(repoRoot, tsconfigPath)}`],
      };
    }

    const declaration = findDeclarationNode(sourceFile, record.declaration_name, record.declaration_line);
    if (!declaration) {
      return {
        status: 'unresolved',
        symbolName: record.declaration_name,
        declaration: {
          file: record.declaration_file,
          line: record.declaration_line,
        },
        members: [],
        matchedMember: null,
        diagnostics: [`unable to find declaration for ${record.declaration_name} in ${record.declaration_file}`],
      };
    }

    const symbol = symbolFromDeclaration(checker, declaration);
    if (!symbol) {
      return {
        status: 'unresolved',
        symbolName: record.declaration_name,
        declaration: symbolLocation(declaration as ts.Declaration, repoRoot),
        members: [],
        matchedMember: null,
        diagnostics: [`TypeScript checker could not resolve a symbol for ${record.declaration_name}`],
      };
    }

    const members = collectSymbolMembers(checker, repoRoot, symbol, declaration);
    const matchedMember = memberName
      ? members.find((member) => member.name === memberName) ?? null
      : null;

    return {
      status: 'resolved',
      symbolName: record.declaration_name,
      declaration: symbolLocation(declaration as ts.Declaration, repoRoot),
      members,
      matchedMember,
      diagnostics,
    };
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
    return {
      status: 'unresolved',
      symbolName: record.declaration_name,
      declaration: {
        file: record.declaration_file,
        line: record.declaration_line,
      },
      members: [],
      matchedMember: null,
      diagnostics,
    };
  }
}

export function formatInspectionHeading(record: PackageExportRecord): string {
  return `${record.package_name} :: ${record.exported_name}`;
}

export function formatInspectionMembers(record: PackageExportRecord, inspection: ExportSymbolInspection): string[] {
  const lines: string[] = [];
  lines.push(formatInspectionHeading(record));
  lines.push(`  declaration:  ${record.declaration_file ?? '(unresolved declaration)'}:${record.declaration_line ?? '?'}`);

  if (inspection.diagnostics.length > 0) {
    lines.push(`  diagnostics:  ${inspection.diagnostics.join(' | ')}`);
  }

  if (inspection.members.length === 0) {
    lines.push('  members:      none');
    return lines;
  }

  lines.push(`  members (${inspection.members.length}):`);
  for (const member of inspection.members) {
    const flags: string[] = [];
    if (member.readonly) flags.push('readonly');
    if (member.optional) flags.push('optional');
    const flagSuffix = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
    const typeSuffix = member.type ? ` -> ${member.type}` : '';
    lines.push(`    - ${member.kind} ${member.name}${flagSuffix}${typeSuffix}`);
  }
  return lines;
}
