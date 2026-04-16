/**
 * Type-reference graph analyzer for TypeScript monorepos.
 *
 * Walks every interface, type alias, class, and enum declaration in the repo
 * and records which other project-defined types each one references. Uses
 * syntactic AST walking (no type checker) for low memory usage, resolving
 * type names against an index of all declarations in the repo.
 *
 * Output: JSON to stdout, human summary to stderr.
 * Usage: pnpm source-analysis refresh typerefs --repo <repo-path>
 */

import * as ts from "typescript";
import { resolve, relative, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import type { TypeDecl, TypeRef, RefKind, DeclKind, Member, MemberKind, TypeRefsOutput } from './schema.js';
import { RepoSession } from '../repo-session.js';
import { describeSnapshotProfile } from '../snapshots.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from '../tsconfig-source-files.js';

export interface TypeRefsAnalysisResult {
  output: TypeRefsOutput;
  reportLines: string[];
  warnings: string[];
}

let repoPath = resolve(process.cwd());
let analyzed = new Map<string, ts.SourceFile>();

// ── Utilities ──────────────────────────────────────────────────────────

function toForwardSlash(p: string): string {
  return p.replace(/\\/g, "/");
}

function toRepoRelative(absPath: string): string {
  return toForwardSlash(relative(repoPath, absPath));
}

// ── Pass 1: Index all type declarations ────────────────────────────────

// Build import map: for each file, which names are imported from which files
// This helps resolve type references to their declaration file.
interface ImportInfo {
  names: Map<string, string>; // localName → importedName (exported name)
  specifiers: Map<string, string>; // localName → specifier
}

let fileImports = new Map<string, ImportInfo>();

// Type index: name → set of declaring files
let typeIndex = new Map<string, Set<string>>();

function addToTypeIndex(name: string, file: string): void {
  if (!typeIndex.has(name)) typeIndex.set(name, new Set());
  typeIndex.get(name)!.add(file);
}

interface RawDecl {
  name: string;
  file: string;
  kind: DeclKind;
  line: number;
  exported: boolean;
  typeParams: string[];
  node: ts.Node;
  sf: ts.SourceFile;
}

let rawDecls: RawDecl[] = [];

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function getTypeParams(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration,
): string[] {
  if (!node.typeParameters) return [];
  return node.typeParameters.map((tp) => tp.name.text);
}

function buildRawDeclarations(): void {
  fileImports = new Map();
  typeIndex = new Map();
  rawDecls = [];

  for (const [rel, sf] of analyzed) {
    const importInfo: ImportInfo = { names: new Map(), specifiers: new Map() };

    ts.forEachChild(sf, (node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        const clause = node.importClause;
        if (clause) {
          if (clause.name) {
            importInfo.names.set(clause.name.text, "default");
            importInfo.specifiers.set(clause.name.text, spec);
          }
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const el of clause.namedBindings.elements) {
                const localName = el.name.text;
                const exportedName = (el.propertyName ?? el.name).text;
                importInfo.names.set(localName, exportedName);
                importInfo.specifiers.set(localName, spec);
              }
            } else if (ts.isNamespaceImport(clause.namedBindings)) {
              // namespace import — can't resolve individual names
            }
          }
        }
      }

      if (ts.isInterfaceDeclaration(node)) {
        addToTypeIndex(node.name.text, rel);
        rawDecls.push({
          name: node.name.text,
          file: rel,
          kind: "interface",
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          exported: isExported(node),
          typeParams: getTypeParams(node),
          node,
          sf,
        });
      } else if (ts.isTypeAliasDeclaration(node)) {
        addToTypeIndex(node.name.text, rel);
        rawDecls.push({
          name: node.name.text,
          file: rel,
          kind: "type",
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          exported: isExported(node),
          typeParams: getTypeParams(node),
          node,
          sf,
        });
      } else if (ts.isClassDeclaration(node) && node.name) {
        addToTypeIndex(node.name.text, rel);
        rawDecls.push({
          name: node.name.text,
          file: rel,
          kind: "class",
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          exported: isExported(node),
          typeParams: getTypeParams(node),
          node,
          sf,
        });
      } else if (ts.isEnumDeclaration(node)) {
        addToTypeIndex(node.name.text, rel);
        rawDecls.push({
          name: node.name.text,
          file: rel,
          kind: "enum",
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          exported: isExported(node),
          typeParams: [],
          node,
          sf,
        });
      }
    });

    fileImports.set(rel, importInfo);
  }
}

// ── Name extraction helper ─────────────────────────────────────────────

/** Safely extract a name from a property/member name node without getText(). */
function getNodeName(node: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return node.text;
  if (ts.isPrivateIdentifier(node)) return node.text;
  return undefined; // computed property
}

// ── Resolution helpers ─────────────────────────────────────────────────

const BUILTIN_TYPES = new Set([
  "string", "number", "boolean", "void", "undefined", "null", "never", "any",
  "unknown", "object", "bigint", "symbol", "this",
  "String", "Number", "Boolean", "Object", "Symbol", "BigInt", "Function",
  "Array", "ReadonlyArray", "Map", "ReadonlyMap", "Set", "ReadonlySet",
  "WeakMap", "WeakSet", "Promise", "PromiseLike",
  "Record", "Partial", "Required", "Readonly", "Pick", "Omit", "Exclude",
  "Extract", "NonNullable", "ReturnType", "Parameters", "ConstructorParameters",
  "InstanceType", "ThisParameterType", "OmitThisParameter",
  "Uppercase", "Lowercase", "Capitalize", "Uncapitalize",
  "Awaited", "NoInfer",
  "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
  "JSON", "Math", "console",
  "Iterable", "IterableIterator", "Iterator", "AsyncIterable", "AsyncIterableIterator",
  "Generator", "AsyncGenerator",
  "ArrayLike", "ArrayBuffer", "SharedArrayBuffer", "DataView",
  "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array",
  "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
  "TemplateStringsArray", "PropertyKey", "PropertyDescriptor",
  "ProxyHandler", "Proxy", "Reflect",
  "Element", "HTMLElement", "Node", "Document", "Event", "EventTarget",
  "NodeList", "HTMLCollection",
  "Response", "Request", "Headers", "URL", "URLSearchParams",
  "AbortController", "AbortSignal",
  "MessagePort", "MessageChannel",
  "Performance", "TextEncoder", "TextDecoder",
  "Buffer",
]);

/**
 * Resolve a type reference name to the file where it's declared.
 * Uses the file's import map for cross-file resolution, falls back to
 * the global type index for same-file or ambient types.
 */
function resolveTypeFile(name: string, fromFile: string): string | null {
  if (BUILTIN_TYPES.has(name)) return null;

  // 1. Is it declared in the same file?
  const declFiles = typeIndex.get(name);
  if (declFiles?.has(fromFile)) return fromFile;

  // 2. Is it imported by this file?
  const imports = fileImports.get(fromFile);
  if (imports) {
    const exportedName = imports.names.get(name);
    if (exportedName) {
      // We know the exported name — look up which file declares it
      const lookupName = exportedName === "default" ? name : exportedName;
      const candidates = typeIndex.get(lookupName);
      if (candidates) {
        if (candidates.size === 1) return [...candidates][0]!;
        // Multiple candidates: prefer one reachable via the import specifier
        const specifier = imports.specifiers.get(name);
        if (specifier) {
          // Heuristic: match by directory proximity
          const fromDir = dirname(fromFile);
          for (const c of candidates) {
            // Relative import → same package
            if (specifier.startsWith(".")) {
              const cDir = dirname(c);
              if (cDir.startsWith(fromDir.split("/").slice(0, 2).join("/"))) return c;
            }
          }
        }
        return [...candidates][0]!;
      }
    }
  }

  // 3. Fallback: global index (for re-exported types we can't trace via imports)
  if (declFiles && declFiles.size > 0) {
    if (declFiles.size === 1) return [...declFiles][0]!;
    // Prefer same package
    const fromPkg = fromFile.split("/").slice(0, 2).join("/");
    for (const c of declFiles) {
      if (c.startsWith(fromPkg + "/")) return c;
    }
    return [...declFiles][0]!;
  }

  return null;
}

// ── Pass 2: Extract references ─────────────────────────────────────────

function extractRefs(raw: RawDecl): TypeRef[] {
  const refs: TypeRef[] = [];
  const { node, name: declName, file, typeParams } = raw;
  const seen = new Set<string>();

  function addRef(targetName: string, kind: RefKind, context?: string): void {
    if (targetName === declName) return;
    if (typeParams.includes(targetName)) return;
    if (BUILTIN_TYPES.has(targetName)) return;

    const key = `${targetName}\0${kind}\0${context ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);

    const targetFile = resolveTypeFile(targetName, file);
    if (!targetFile) return;

    refs.push({
      target: targetName,
      target_file: targetFile,
      kind,
      ...(context ? { context } : {}),
    });
  }

  function walkTypeNode(typeNode: ts.TypeNode, kind: RefKind, context?: string): void {
    if (!typeNode) return;

    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName;
      // Only handle simple identifiers and qualified names
      const name = ts.isIdentifier(typeName)
        ? typeName.text
        : ts.isQualifiedName(typeName)
          ? typeName.right.text
          : null;
      if (name) addRef(name, kind, context);
      // Walk type arguments
      if (typeNode.typeArguments) {
        for (const arg of typeNode.typeArguments) {
          walkTypeNode(arg, "type-arg", context);
        }
      }
    } else if (ts.isUnionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        walkTypeNode(member, "union-member", context);
      }
    } else if (ts.isIntersectionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        walkTypeNode(member, "intersection", context);
      }
    } else if (ts.isArrayTypeNode(typeNode)) {
      walkTypeNode(typeNode.elementType, "array-element", context);
    } else if (ts.isTupleTypeNode(typeNode)) {
      for (const el of typeNode.elements) {
        const elNode = ts.isNamedTupleMember(el) ? el.type : el;
        walkTypeNode(elNode, "tuple-element", context);
      }
    } else if (ts.isTypeLiteralNode(typeNode)) {
      walkTypeLiteralMembers(typeNode.members, context);
    } else if (ts.isParenthesizedTypeNode(typeNode)) {
      walkTypeNode(typeNode.type, kind, context);
    } else if (ts.isMappedTypeNode(typeNode)) {
      if (typeNode.type) walkTypeNode(typeNode.type, "mapped-value", context);
      if (typeNode.typeParameter.constraint) {
        walkTypeNode(typeNode.typeParameter.constraint, "constraint", context);
      }
    } else if (ts.isConditionalTypeNode(typeNode)) {
      walkTypeNode(typeNode.checkType, "conditional", context);
      walkTypeNode(typeNode.extendsType, "conditional", context);
      walkTypeNode(typeNode.trueType, "conditional", context);
      walkTypeNode(typeNode.falseType, "conditional", context);
    } else if (ts.isIndexedAccessTypeNode(typeNode)) {
      walkTypeNode(typeNode.objectType, "indexed-access", context);
      walkTypeNode(typeNode.indexType, "indexed-access", context);
    } else if (ts.isTypeOperatorNode(typeNode)) {
      const opKind: RefKind =
        typeNode.operator === ts.SyntaxKind.KeyOfKeyword ? "keyof-target" : kind;
      walkTypeNode(typeNode.type, opKind, context);
    } else if (ts.isTypeQueryNode(typeNode)) {
      const name = ts.isIdentifier(typeNode.exprName)
        ? typeNode.exprName.text
        : ts.isQualifiedName(typeNode.exprName)
          ? typeNode.exprName.right.text
          : null;
      if (name) addRef(name, "typeof-target", context);
    } else if (ts.isFunctionTypeNode(typeNode) || ts.isConstructorTypeNode(typeNode)) {
      for (const param of typeNode.parameters) {
        if (param.type) {
          walkTypeNode(param.type, "param", getNodeName(param.name as ts.Identifier) ?? context);
        }
      }
      walkTypeNode(typeNode.type, "return", context);
    } else if (ts.isTemplateLiteralTypeNode(typeNode)) {
      for (const span of typeNode.templateSpans) {
        walkTypeNode(span.type, kind, context);
      }
    } else if (ts.isRestTypeNode(typeNode)) {
      walkTypeNode(typeNode.type, kind, context);
    }
  }

  function walkTypeLiteralMembers(
    members: ts.NodeArray<ts.TypeElement>,
    parentContext?: string,
  ): void {
    for (const member of members) {
      if (ts.isPropertySignature(member) && member.type) {
        const fieldName = getNodeName(member.name) ?? parentContext;
        walkTypeNode(member.type, "field", fieldName);
      } else if (ts.isMethodSignature(member)) {
        const methodName = getNodeName(member.name) ?? parentContext;
        for (const param of member.parameters) {
          if (param.type) walkTypeNode(param.type, "param", methodName);
        }
        if (member.type) walkTypeNode(member.type, "return", methodName);
      } else if (ts.isIndexSignatureDeclaration(member) && member.type) {
        walkTypeNode(member.type, "index-type", parentContext);
      } else if (ts.isCallSignatureDeclaration(member)) {
        for (const param of member.parameters) {
          if (param.type) walkTypeNode(param.type, "param", parentContext);
        }
        if (member.type) walkTypeNode(member.type, "return", parentContext);
      }
    }
  }

  // ── Walk the declaration ──

  if (ts.isInterfaceDeclaration(node)) {
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const expr of clause.types) {
          const name = ts.isIdentifier(expr.expression)
            ? expr.expression.text
            : (ts.isPropertyAccessExpression(expr.expression) ? expr.expression.name.text : "unknown");
          addRef(name, "extends");
          if (expr.typeArguments) {
            for (const arg of expr.typeArguments) walkTypeNode(arg, "type-arg");
          }
        }
      }
    }
    if (node.typeParameters) {
      for (const tp of node.typeParameters) {
        if (tp.constraint) walkTypeNode(tp.constraint, "constraint");
        if (tp.default) walkTypeNode(tp.default, "type-arg");
      }
    }
    walkTypeLiteralMembers(node.members);
  } else if (ts.isTypeAliasDeclaration(node)) {
    if (node.typeParameters) {
      for (const tp of node.typeParameters) {
        if (tp.constraint) walkTypeNode(tp.constraint, "constraint");
        if (tp.default) walkTypeNode(tp.default, "type-arg");
      }
    }
    walkTypeNode(node.type, "alias-body");
  } else if (ts.isClassDeclaration(node)) {
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        const hkind: RefKind =
          clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements";
        for (const expr of clause.types) {
          const name = ts.isIdentifier(expr.expression)
            ? expr.expression.text
            : (ts.isPropertyAccessExpression(expr.expression) ? expr.expression.name.text : "unknown");
          addRef(name, hkind);
          if (expr.typeArguments) {
            for (const arg of expr.typeArguments) walkTypeNode(arg, "type-arg");
          }
        }
      }
    }
    if (node.typeParameters) {
      for (const tp of node.typeParameters) {
        if (tp.constraint) walkTypeNode(tp.constraint, "constraint");
        if (tp.default) walkTypeNode(tp.default, "type-arg");
      }
    }
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.type) {
        const fieldName = getNodeName(member.name);
        walkTypeNode(member.type, "field", fieldName);
      } else if (ts.isMethodDeclaration(member)) {
        const methodName = getNodeName(member.name);
        for (const param of member.parameters) {
          if (param.type) walkTypeNode(param.type, "param", methodName);
        }
        if (member.type) walkTypeNode(member.type, "return", methodName);
      } else if (ts.isGetAccessorDeclaration(member) && member.type) {
        walkTypeNode(member.type, "return", getNodeName(member.name));
      } else if (ts.isSetAccessorDeclaration(member)) {
        for (const param of member.parameters) {
          if (param.type) walkTypeNode(param.type, "param", getNodeName(member.name));
        }
      }
    }
  }

  return refs;
}

// ── Type alias body extraction ───────────────────────────────────────────

const MAX_ALIAS_BODY_LEN = 800;

interface AliasInfo {
  alias_body: string;
  literal_values?: string[];
}

function extractAliasInfo(raw: RawDecl): AliasInfo | null {
  const { node, sf } = raw;
  if (!ts.isTypeAliasDeclaration(node)) return null;

  const typeNode = node.type;

  // Get raw source text, truncate
  let bodyText: string;
  try {
    bodyText = typeNode.getText(sf);
  } catch {
    return null;
  }
  if (bodyText.length > MAX_ALIAS_BODY_LEN) {
    bodyText = bodyText.slice(0, MAX_ALIAS_BODY_LEN) + "…";
  }

  // Check if it's a pure literal union
  let literalValues: string[] | undefined;
  if (ts.isUnionTypeNode(typeNode)) {
    const literals: string[] = [];
    let allLiteral = true;
    for (const member of typeNode.types) {
      if (ts.isLiteralTypeNode(member)) {
        if (ts.isStringLiteral(member.literal)) {
          literals.push(member.literal.text);
        } else if (ts.isNumericLiteral(member.literal)) {
          literals.push(member.literal.text);
        } else if (member.literal.kind === ts.SyntaxKind.TrueKeyword) {
          literals.push("true");
        } else if (member.literal.kind === ts.SyntaxKind.FalseKeyword) {
          literals.push("false");
        } else if (member.literal.kind === ts.SyntaxKind.NullKeyword) {
          literals.push("null");
        } else {
          allLiteral = false;
        }
      } else if (typeNode.types.length > 0 && member.kind === ts.SyntaxKind.UndefinedKeyword) {
        literals.push("undefined");
      } else {
        allLiteral = false;
      }
    }
    if (allLiteral && literals.length > 0) {
      literalValues = literals;
    }
  }

  return { alias_body: bodyText, ...(literalValues ? { literal_values: literalValues } : {}) };
}

// ── Member extraction ───────────────────────────────────────────────────

function extractMembers(raw: RawDecl): Member[] {
  const { node } = raw;
  const members: Member[] = [];

  function hasReadonly(n: ts.Node): boolean {
    const mods = ts.canHaveModifiers(n) ? ts.getModifiers(n) : undefined;
    return mods?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
  }

  function walkTypeElements(nodeMembers: ts.NodeArray<ts.TypeElement>): void {
    for (const member of nodeMembers) {
      if (ts.isPropertySignature(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: !!member.questionToken,
          readonly: hasReadonly(member),
          member_kind: "field",
        });
      } else if (ts.isMethodSignature(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: !!member.questionToken,
          readonly: false,
          member_kind: "method",
        });
      } else if (ts.isIndexSignatureDeclaration(member)) {
        members.push({
          name: "(index)",
          optional: false,
          readonly: hasReadonly(member),
          member_kind: "index-sig",
        });
      } else if (ts.isCallSignatureDeclaration(member)) {
        members.push({
          name: "(call)",
          optional: false,
          readonly: false,
          member_kind: "call-sig",
        });
      } else if (ts.isConstructSignatureDeclaration(member)) {
        members.push({
          name: "(construct)",
          optional: false,
          readonly: false,
          member_kind: "construct-sig",
        });
      }
    }
  }

  function walkClassElements(nodeMembers: ts.NodeArray<ts.ClassElement>): void {
    for (const member of nodeMembers) {
      if (ts.isPropertyDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: !!member.questionToken,
          readonly: hasReadonly(member),
          member_kind: "field",
        });
      } else if (ts.isMethodDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: false,
          readonly: false,
          member_kind: "method",
        });
      } else if (ts.isGetAccessorDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: false,
          readonly: true,
          member_kind: "getter",
        });
      } else if (ts.isSetAccessorDeclaration(member)) {
        members.push({
          name: getNodeName(member.name) ?? "(computed)",
          optional: false,
          readonly: false,
          member_kind: "setter",
        });
      }
    }
  }

  if (ts.isInterfaceDeclaration(node)) {
    walkTypeElements(node.members);
  } else if (ts.isClassDeclaration(node)) {
    walkClassElements(node.members);
  } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
    walkTypeElements(node.type.members);
  } else if (ts.isEnumDeclaration(node)) {
    for (const m of node.members) {
      const name = getNodeName(m.name as ts.PropertyName);
      if (name) {
        let value: string | undefined;
        if (m.initializer) {
          try {
            value = m.initializer.getText(raw.sf);
          } catch { /* ignore */ }
        }
        members.push({
          name,
          optional: false,
          readonly: true,
          member_kind: "enum-member",
          ...(value ? { value } : {}),
        });
      }
    }
  }

  return members;
}

// ── Run extraction ─────────────────────────────────────────────────────

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: "utf-8",
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: "utf-8",
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return "unknown";
  }
}

export function generateTypeRefsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): TypeRefsAnalysisResult {
  void options;
  repoPath = nextSession.repoPath;
  analyzed = new Map();

  const warnings: string[] = [];
  const { batches, warnings: scanWarnings } = sourceFileScan ?? scanParsedTsconfigSourceFiles(nextSession);
  warnings.push(...scanWarnings);
  if (batches.length === 0) {
    throw new Error(`no tsconfig files found in ${repoPath}`);
  }

  for (const batch of batches) {
    for (const file of batch.sourceFiles) {
      if (analyzed.has(file.relPath)) continue;
      analyzed.set(file.relPath, file.sourceFile);
    }
  }

  buildRawDeclarations();
  const allDeclarations: TypeDecl[] = [];
  for (const raw of rawDecls) {
    const refs = extractRefs(raw);
    const members = extractMembers(raw);
    const aliasInfo = extractAliasInfo(raw);
    allDeclarations.push({
      name: raw.name,
      file: raw.file,
      kind: raw.kind,
      line: raw.line,
      exported: raw.exported,
      ...(raw.typeParams.length > 0 ? { type_params: raw.typeParams } : {}),
      ...(members.length > 0 ? { members } : {}),
      ...(aliasInfo?.alias_body ? { alias_body: aliasInfo.alias_body } : {}),
      ...(aliasInfo?.literal_values ? { literal_values: aliasInfo.literal_values } : {}),
      refs,
    });
  }

  const totalRefs = allDeclarations.reduce((sum, declaration) => sum + declaration.refs.length, 0);
  const totalMembers = allDeclarations.reduce((sum, declaration) => sum + (declaration.members?.length ?? 0), 0);
  const totalAliasBodies = allDeclarations.filter((declaration) => declaration.alias_body).length;
  const totalLiteralUnions = allDeclarations.filter((declaration) => declaration.literal_values).length;

  const referencedNames = new Set<string>();
  for (const declaration of allDeclarations) {
    for (const ref of declaration.refs) referencedNames.add(ref.target);
  }
  const rootTypes = allDeclarations.filter((declaration) => !referencedNames.has(declaration.name));
  const leafTypes = allDeclarations.filter((declaration) => declaration.refs.length === 0);

  allDeclarations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  const output: TypeRefsOutput = {
    root: toForwardSlash(repoPath),
    generated_at: new Date().toISOString(),
    source_commit: gitHead(repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    profile: describeSnapshotProfile(nextSession.profile),
    summary: {
      files_analyzed: analyzed.size,
      type_declarations: allDeclarations.length,
      type_references: totalRefs,
      root_types: rootTypes.length,
      leaf_types: leafTypes.length,
    },
    declarations: allDeclarations,
  };

  const reportLines = [
    "",
    `Snapshot target:    ${output.profile.target}`,
    `Profile:            ${output.profile.profileId}${output.profile.profilePath ? ` (${output.profile.profilePath})` : ''}`,
    `Excluded prefixes:  ${output.profile.excludedRepoRelativePrefixes.length}`,
    "",
    `Loaded ${analyzed.size} source files`,
    `Pass 1: ${rawDecls.length} declarations indexed`,
    `Pass 2: ${allDeclarations.length} declarations with refs extracted`,
    "",
    `Files analyzed:      ${analyzed.size}`,
    `Type declarations:   ${allDeclarations.length}`,
    `Type members:        ${totalMembers}`,
    `Alias bodies:        ${totalAliasBodies}`,
    `Literal unions:      ${totalLiteralUnions}`,
    `Type references:     ${totalRefs}`,
    `Root types:          ${rootTypes.length}`,
    `Leaf types:          ${leafTypes.length}`,
    "",
    "Top 20 types by outbound reference count:",
    ...allDeclarations
      .slice()
      .sort((a, b) => b.refs.length - a.refs.length)
      .slice(0, 20)
      .map(
        (declaration) =>
          `  ${declaration.refs.length.toString().padStart(4)} refs  ${declaration.name}  (${declaration.file}:${declaration.line})`,
      ),
    "",
    "Top 20 most-referenced types:",
  ];

  const inboundCount = new Map<string, number>();
  for (const declaration of allDeclarations) {
    for (const ref of declaration.refs) {
      inboundCount.set(ref.target, (inboundCount.get(ref.target) || 0) + 1);
    }
  }
  for (const [name, count] of [...inboundCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const files = typeIndex.get(name);
    const fileNote = files ? ` (${[...files][0]})` : "";
    reportLines.push(`  ${count.toString().padStart(4)} refs  ${name}${fileNote}`);
  }

  reportLines.push("");

  analyzed = new Map();
  fileImports = new Map();
  typeIndex = new Map();
  rawDecls = [];

  return {
    output,
    reportLines,
    warnings,
  };
}
