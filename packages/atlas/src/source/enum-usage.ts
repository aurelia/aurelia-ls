import ts from "typescript";

import {
  countByMap,
  groupBy,
  uniqueByKey,
  uniqueSortedStrings,
} from "../collections.js";
import type {
  SourceFileIdentity,
  SourceProject,
  SourceSpan,
} from "./project.js";
import { SourceProjectKeyedMemo } from "./memo.js";
import {
  hasModifier,
  propertyNameText,
  returnExpressions,
  sourceSpanForNode,
} from "./semantic-surface/index.js";

/** Schema marker for the TypeScript enum usage source index. */
export const TYPESCRIPT_ENUM_USAGE_INDEX_VERSION =
  "typescript-enum-usage-v1";

export type TypeScriptEnumValueKind = "computed" | "number" | "string";

export type TypeScriptEnumUseRole =
  | "assignment"
  | "call-argument"
  | "case-label"
  | "comparison"
  | "enum-member-initializer"
  | "expression"
  | "literal-type"
  | "module-specifier"
  | "object-key"
  | "object-value"
  | "return-expression"
  | "type-reference";

export type TypeScriptEnumTranslationCarrier =
  | "assignment"
  | "case-return"
  | "enum-member-initializer"
  | "object-entry";

export type TypeScriptEnumTranslationEvidence = "member-reference";

export type TypeScriptEnumTranslationRelation = "translation";

/** One enum member declaration with source-level usage counts. */
export interface TypeScriptEnumMemberRow {
  readonly key: string;
  readonly enumKey: string;
  readonly packageId: string;
  readonly enumName: string;
  readonly memberName: string;
  readonly value: string | number | null;
  readonly valueKind: TypeScriptEnumValueKind;
  readonly valueKey: string | null;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
  readonly referenceCount: number;
  /** Raw literal occurrences that overlap this value in a checker-backed enum context. */
  readonly rawValueOccurrenceCount: number;
}

/** One enum declaration and its member value space. */
export interface TypeScriptEnumDeclarationRow {
  readonly key: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: string;
  readonly exported: boolean;
  readonly constEnum: boolean;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
  readonly members: readonly TypeScriptEnumMemberRow[];
  readonly memberCount: number;
  readonly referencedMemberCount: number;
  readonly unreferencedMemberCount: number;
  readonly rawValueOccurrenceCount: number;
  readonly translationInCount: number;
  readonly translationOutCount: number;
}

/** Exact Enum.Member property-access use site. */
export interface TypeScriptEnumMemberReferenceRow {
  readonly id: string;
  readonly packageId: string;
  readonly enumKey: string;
  readonly memberKey: string;
  readonly enumName: string;
  readonly memberName: string;
  readonly role: TypeScriptEnumUseRole;
  readonly expressionText: string;
  readonly containingFunction: string | null;
  readonly containingClass: string | null;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
}

/** Raw literal occurrence whose value overlaps at least one enum member value. */
export interface TypeScriptEnumValueOccurrenceRow {
  readonly id: string;
  readonly packageId: string;
  readonly value: string | number;
  readonly valueKind: Exclude<TypeScriptEnumValueKind, "computed">;
  readonly valueKey: string;
  readonly role: TypeScriptEnumUseRole;
  readonly text: string;
  /** All enum members with this raw value, before contextual narrowing. */
  readonly memberKeys: readonly string[];
  /** Enum members whose declaring enum appears in the TypeChecker contextual type. */
  readonly contextualMemberKeys: readonly string[];
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
}

/** One literal value space shared by one or more enum members and raw values. */
export interface TypeScriptEnumValueSpaceRow {
  readonly id: string;
  readonly value: string | number;
  readonly valueKind: Exclude<TypeScriptEnumValueKind, "computed">;
  readonly valueKey: string;
  readonly memberKeys: readonly string[];
  readonly enumNames: readonly string[];
  readonly packageIds: readonly string[];
  readonly memberReferenceCount: number;
  readonly rawValueOccurrenceCount: number;
  readonly sourceFiles: readonly string[];
  readonly firstOccurrence?: TypeScriptEnumValueOccurrenceRow;
  readonly summary: string;
}

/** Exact evidence that one enum value space is translated into another. */
export interface TypeScriptEnumTranslationEdgeRow {
  readonly id: string;
  readonly packageId: string;
  readonly fromMemberKey: string;
  readonly toMemberKey: string;
  readonly fromEnumName: string;
  readonly fromMemberName: string;
  readonly toEnumName: string;
  readonly toMemberName: string;
  readonly carrier: TypeScriptEnumTranslationCarrier;
  readonly relation: TypeScriptEnumTranslationRelation;
  readonly evidence: TypeScriptEnumTranslationEvidence;
  readonly expressionText: string;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
  readonly summary: string;
}

/** Package-scoped enum usage substrate derived from one hot TypeScript Program. */
export interface TypeScriptEnumUsageIndex {
  readonly version: typeof TYPESCRIPT_ENUM_USAGE_INDEX_VERSION;
  readonly packageIds: readonly string[];
  readonly enumDeclarations: readonly TypeScriptEnumDeclarationRow[];
  readonly memberReferences: readonly TypeScriptEnumMemberReferenceRow[];
  readonly valueOccurrences: readonly TypeScriptEnumValueOccurrenceRow[];
  readonly valueSpaces: readonly TypeScriptEnumValueSpaceRow[];
  readonly translationEdges: readonly TypeScriptEnumTranslationEdgeRow[];
}

export interface TypeScriptEnumUsageIndexOptions {
  readonly packageId?: string;
}

interface EnumDeclarationSeed {
  readonly key: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: string;
  readonly exported: boolean;
  readonly constEnum: boolean;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
  readonly memberKeys: readonly string[];
}

interface EnumMemberSeed {
  readonly key: string;
  readonly enumKey: string;
  readonly packageId: string;
  readonly enumName: string;
  readonly memberName: string;
  readonly value: string | number | null;
  readonly valueKind: TypeScriptEnumValueKind;
  readonly valueKey: string | null;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
}

interface SourceFileContext {
  readonly sourceFile: ts.SourceFile;
  readonly file: SourceFileIdentity;
  readonly packageName: string;
}

const enumUsageMemo = new SourceProjectKeyedMemo<
  string,
  TypeScriptEnumUsageIndex
>();

/** Read or build a package-scoped enum usage index for the current source project epoch. */
export function readTypeScriptEnumUsageIndex(
  sourceProject: SourceProject,
  options: TypeScriptEnumUsageIndexOptions = {},
): TypeScriptEnumUsageIndex {
  const cacheKey = options.packageId ?? "*";
  return enumUsageMemo.read(sourceProject, cacheKey, () =>
    new TypeScriptEnumUsageIndexBuilder(
      sourceProject,
      options.packageId,
    ).build(),
  );
}

class TypeScriptEnumUsageIndexBuilder {
  readonly #sourceProject: SourceProject;
  readonly #packageId: string | undefined;
  readonly #checker: ts.TypeChecker;
  readonly #declarations: EnumDeclarationSeed[] = [];
  readonly #members: EnumMemberSeed[] = [];
  readonly #membersByKey = new Map<string, EnumMemberSeed>();
  readonly #membersByDeclarationKey = new Map<string, EnumMemberSeed>();
  readonly #membersByQualifiedName = new Map<string, EnumMemberSeed[]>();
  readonly #membersByValueKey = new Map<string, EnumMemberSeed[]>();
  readonly #enumNames = new Set<string>();
  readonly #memberNames = new Set<string>();
  readonly #references: TypeScriptEnumMemberReferenceRow[] = [];
  readonly #valueOccurrences: TypeScriptEnumValueOccurrenceRow[] = [];
  readonly #translationEdges = new Map<string, TypeScriptEnumTranslationEdgeRow>();

  constructor(sourceProject: SourceProject, packageId: string | undefined) {
    this.#sourceProject = sourceProject;
    this.#packageId = packageId;
    this.#checker = sourceProject.checker;
  }

  build(): TypeScriptEnumUsageIndex {
    const contexts = this.#sourceFileContexts();
    for (const context of contexts) {
      this.#collectDeclarations(context);
    }
    for (const context of contexts) {
      this.#collectUsage(context);
    }
    return this.#finalize();
  }

  #sourceFileContexts(): readonly SourceFileContext[] {
    return this.#sourceProject
      .ownedSourceFiles()
      .flatMap((sourceFile) => {
        const file = this.#sourceProject.requiredSourceFileIdentity(sourceFile);
        const packageInfo = this.#sourceProject.packageForFileName(
          sourceFile.fileName,
        );
        if (
          file.packageId === null ||
          packageInfo === null ||
          (this.#packageId !== undefined && file.packageId !== this.#packageId)
        ) {
          return [];
        }
        return [
          {
            sourceFile,
            file,
            packageName: packageInfo.packageName,
          },
        ];
      });
  }

  #collectDeclarations(context: SourceFileContext): void {
    const visit = (node: ts.Node): void => {
      if (ts.isEnumDeclaration(node)) {
        this.#addEnumDeclaration(context, node);
      }
      ts.forEachChild(node, visit);
    };
    visit(context.sourceFile);
  }

  #addEnumDeclaration(
    context: SourceFileContext,
    node: ts.EnumDeclaration,
  ): void {
    const enumKey = enumDeclarationKey(context.file, node, context.sourceFile);
    const members = this.#memberSeedsForEnum(context, enumKey, node);
    const declaration: EnumDeclarationSeed = {
      key: enumKey,
      packageId: context.file.packageId!,
      packageName: context.packageName,
      enumName: node.name.text,
      exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
      constEnum: hasModifier(node, ts.SyntaxKind.ConstKeyword),
      file: context.file,
      span: sourceSpanForNode(context.sourceFile, node),
      memberKeys: members.map((member) => member.key),
    };
    this.#declarations.push(declaration);
    this.#enumNames.add(declaration.enumName);
    for (const member of members) {
      this.#addMember(member);
    }
  }

  #memberSeedsForEnum(
    context: SourceFileContext,
    enumKey: string,
    node: ts.EnumDeclaration,
  ): readonly EnumMemberSeed[] {
    const members: EnumMemberSeed[] = [];
    let nextImplicitNumber: number | null = 0;
    for (const member of node.members) {
      const memberName = propertyNameText(member.name, context.sourceFile);
      if (memberName === null) {
        nextImplicitNumber = null;
        continue;
      }
      const explicitValue = enumMemberExplicitValue(member, context.sourceFile);
      const value: string | number | null =
        explicitValue.value !== null
          ? explicitValue.value
          : nextImplicitNumber === null
          ? null
          : nextImplicitNumber;
      const valueKind: TypeScriptEnumValueKind =
        explicitValue.valueKind === "computed" && value !== null
          ? typeof value === "string"
            ? "string"
            : "number"
          : explicitValue.valueKind;
      if (typeof value === "number") {
        nextImplicitNumber = value + 1;
      } else if (explicitValue.value === null && explicitValue.valueKind === "computed") {
        nextImplicitNumber = null;
      } else if (typeof value === "string") {
        nextImplicitNumber = null;
      }
      const key = enumDeclarationKey(context.file, member, context.sourceFile);
      members.push({
        key,
        enumKey,
        packageId: context.file.packageId!,
        enumName: node.name.text,
        memberName,
        value,
        valueKind,
        valueKey: value === null ? null : enumValueKey(value),
        file: context.file,
        span: sourceSpanForNode(context.sourceFile, member),
      });
    }
    return members;
  }

  #addMember(member: EnumMemberSeed): void {
    this.#members.push(member);
    this.#membersByKey.set(member.key, member);
    this.#membersByDeclarationKey.set(member.key, member);
    this.#memberNames.add(member.memberName);
    const qualifiedName = `${member.enumName}.${member.memberName}`;
    const qualifiedRows = this.#membersByQualifiedName.get(qualifiedName) ?? [];
    qualifiedRows.push(member);
    this.#membersByQualifiedName.set(qualifiedName, qualifiedRows);
    if (member.valueKey !== null) {
      const valueRows = this.#membersByValueKey.get(member.valueKey) ?? [];
      valueRows.push(member);
      this.#membersByValueKey.set(member.valueKey, valueRows);
    }
  }

  #collectUsage(context: SourceFileContext): void {
    const visit = (
      node: ts.Node,
      containingFunction: string | null,
      containingClass: string | null,
    ): void => {
      const nextClass =
        ts.isClassDeclaration(node) && node.name !== undefined
          ? node.name.text
          : containingClass;
      const nextFunction = functionLikeName(node, context.sourceFile) ?? containingFunction;

      if (ts.isPropertyAccessExpression(node) || ts.isQualifiedName(node)) {
        const member = this.#resolveMemberReference(node, context.sourceFile);
        if (member !== null) {
          this.#references.push(
            this.#referenceRow(
              context,
              node,
              member,
              nextFunction,
              nextClass,
            ),
          );
        }
      }
      if (isLiteralLike(node)) {
        const occurrence = this.#valueOccurrenceForLiteral(context, node);
        if (occurrence !== null) {
          this.#valueOccurrences.push(occurrence);
        }
      }
      if (ts.isEnumMember(node) && node.initializer !== undefined) {
        this.#addInitializerTranslation(context, node);
      } else if (ts.isSwitchStatement(node)) {
        this.#addSwitchCaseReturnTranslations(context, node);
      } else if (ts.isPropertyAssignment(node)) {
        this.#addObjectEntryTranslations(context, node);
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        this.#addAssignmentTranslations(context, node);
      }

      ts.forEachChild(node, (child) =>
        visit(child, nextFunction, nextClass),
      );
    };
    visit(context.sourceFile, null, null);
  }

  #referenceRow(
    context: SourceFileContext,
    node: ts.PropertyAccessExpression | ts.QualifiedName,
    member: EnumMemberSeed,
    containingFunction: string | null,
    containingClass: string | null,
  ): TypeScriptEnumMemberReferenceRow {
    const span = sourceSpanForNode(context.sourceFile, node);
    return {
      id: `typescript-enum-reference:${member.key}:${context.file.repoPath}:${span.start}:${span.end}`,
      packageId: context.file.packageId!,
      enumKey: member.enumKey,
      memberKey: member.key,
      enumName: member.enumName,
      memberName: member.memberName,
      role: useRoleForNode(node),
      expressionText: node.getText(context.sourceFile),
      containingFunction,
      containingClass,
      file: context.file,
      span,
    };
  }

  #valueOccurrenceForLiteral(
    context: SourceFileContext,
    node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.NumericLiteral,
  ): TypeScriptEnumValueOccurrenceRow | null {
    const literal = literalValue(node);
    if (literal === null) {
      return null;
    }
    const valueKey = enumValueKey(literal);
    const members = this.#membersByValueKey.get(valueKey);
    if (members === undefined) {
      return null;
    }
    const span = sourceSpanForNode(context.sourceFile, node);
    const contextualMemberKeys = this.#contextualMemberKeysForLiteral(
      node,
      members,
    );
    return {
      id: `typescript-enum-value:${valueKey}:${context.file.repoPath}:${span.start}:${span.end}`,
      packageId: context.file.packageId!,
      value: literal,
      valueKind: typeof literal === "string" ? "string" : "number",
      valueKey,
      role: useRoleForNode(node),
      text: node.getText(context.sourceFile),
      memberKeys: uniqueSortedStrings(members.map((member) => member.key)),
      contextualMemberKeys,
      file: context.file,
      span,
    };
  }

  #contextualMemberKeysForLiteral(
    node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.NumericLiteral,
    members: readonly EnumMemberSeed[],
  ): readonly string[] {
    const contextualType = this.#checker.getContextualType(node);
    if (contextualType === undefined) {
      return [];
    }
    const enumNames = this.#enumNamesForType(contextualType);
    if (enumNames.size === 0) {
      return [];
    }
    return uniqueSortedStrings(
      members
        .filter((member) => enumNames.has(member.enumName))
        .map((member) => member.key),
    );
  }

  #enumNamesForType(
    type: ts.Type,
    depth = 0,
  ): ReadonlySet<string> {
    const names = new Set<string>();
    if (depth > 6) {
      return names;
    }
    if (type.isUnionOrIntersection()) {
      for (const child of type.types) {
        addAll(names, this.#enumNamesForType(child, depth + 1));
      }
    }
    for (const symbol of [type.aliasSymbol, type.symbol]) {
      if (symbol === undefined) {
        continue;
      }
      for (const declaration of symbol.getDeclarations() ?? []) {
        const enumName = enumNameForDeclaration(declaration);
        if (enumName !== null && this.#enumNames.has(enumName)) {
          names.add(enumName);
        }
      }
    }
    const typeText = this.#checker.typeToString(type);
    for (const enumName of this.#enumNames) {
      if (containsWord(typeText, enumName)) {
        names.add(enumName);
      }
    }
    return names;
  }

  #addInitializerTranslation(
    context: SourceFileContext,
    node: ts.EnumMember,
  ): void {
    const target = this.#memberForDeclaration(node);
    if (target === null || node.initializer === undefined) {
      return;
    }
    this.#addTranslationEdges(
      context,
      "enum-member-initializer",
      this.#memberRefsInNode(node.initializer, context.sourceFile),
      [target],
      node,
    );
  }

  #addObjectEntryTranslations(
    context: SourceFileContext,
    node: ts.PropertyAssignment,
  ): void {
    const fromMembers = this.#memberRefsInNode(node.name, context.sourceFile);
    this.#addTranslationEdges(
      context,
      "object-entry",
      fromMembers,
      this.#translationTargetsInExpression(node.initializer, context.sourceFile),
      node,
    );
  }

  #addSwitchCaseReturnTranslations(
    context: SourceFileContext,
    node: ts.SwitchStatement,
  ): void {
    let activeFromMembers: readonly EnumMemberSeed[] = [];
    for (const clause of node.caseBlock.clauses) {
      if (ts.isDefaultClause(clause)) {
        activeFromMembers = [];
      } else {
        activeFromMembers = uniqueByKey(
          [
            ...activeFromMembers,
            ...this.#memberRefsInNode(clause.expression, context.sourceFile),
          ],
          (member) => member.key,
        );
      }
      const returnedExpressions = clause.statements.flatMap((statement) =>
        returnExpressions(statement),
      );
      for (const expression of returnedExpressions) {
        this.#addTranslationEdges(
          context,
          "case-return",
          activeFromMembers,
          this.#translationTargetsInExpression(expression, context.sourceFile),
          expression,
        );
      }
      if (returnedExpressions.length > 0) {
        activeFromMembers = [];
      }
    }
  }

  #addAssignmentTranslations(
    context: SourceFileContext,
    node: ts.BinaryExpression,
  ): void {
    const fromMembers = this.#memberRefsInNode(node.right, context.sourceFile);
    this.#addTranslationEdges(
      context,
      "assignment",
      fromMembers,
      this.#translationTargetsInExpression(node.left, context.sourceFile),
      node,
    );
  }

  #addTranslationEdges(
    context: SourceFileContext,
    carrier: TypeScriptEnumTranslationCarrier,
    fromMembers: readonly EnumMemberSeed[],
    toMembers: readonly EnumMemberSeed[],
    node: ts.Node,
  ): void {
    for (const fromMember of fromMembers) {
      for (const toMember of toMembers) {
        if (fromMember.key === toMember.key) {
          continue;
        }
        const span = sourceSpanForNode(context.sourceFile, node);
        const id = `typescript-enum-translation:${carrier}:${fromMember.key}:${toMember.key}:${context.file.repoPath}:${span.start}:${span.end}`;
        if (this.#translationEdges.has(id)) {
          continue;
        }
        this.#translationEdges.set(id, {
          id,
          packageId: context.file.packageId!,
          fromMemberKey: fromMember.key,
          toMemberKey: toMember.key,
          fromEnumName: fromMember.enumName,
          fromMemberName: fromMember.memberName,
          toEnumName: toMember.enumName,
          toMemberName: toMember.memberName,
          carrier,
          relation: "translation",
          evidence: "member-reference",
          expressionText: node.getText(context.sourceFile),
          file: context.file,
          span,
          summary: `${fromMember.enumName}.${fromMember.memberName} maps to ${toMember.enumName}.${toMember.memberName} through ${carrier}.`,
        });
      }
    }
  }

  #memberRefsInNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
  ): readonly EnumMemberSeed[] {
    const members: EnumMemberSeed[] = [];
    const visit = (child: ts.Node): void => {
      if (ts.isPropertyAccessExpression(child)) {
        const member = this.#resolveMemberReference(child, sourceFile);
        if (member !== null) {
          members.push(member);
        }
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return uniqueByKey(members, (member) => member.key);
  }

  #translationTargetsInExpression(
    node: ts.Node,
    sourceFile: ts.SourceFile,
  ): readonly EnumMemberSeed[] {
    const expression = unwrapTranslationExpression(node);
    const directMember = this.#directMemberRef(expression, sourceFile);
    if (directMember !== null) {
      return [directMember];
    }
    if (ts.isConditionalExpression(expression)) {
      return uniqueByKey(
        [
          ...this.#translationTargetsInExpression(
            expression.whenTrue,
            sourceFile,
          ),
          ...this.#translationTargetsInExpression(
            expression.whenFalse,
            sourceFile,
          ),
        ],
        (member) => member.key,
      );
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return uniqueByKey(
        expression.properties.flatMap((property) => {
          if (!ts.isPropertyAssignment(property)) {
            return [];
          }
          const member = this.#directMemberRef(
            property.initializer,
            sourceFile,
          );
          return member === null ? [] : [member];
        }),
        (member) => member.key,
      );
    }
    return [];
  }

  #directMemberRef(
    node: ts.Node,
    sourceFile: ts.SourceFile,
  ): EnumMemberSeed | null {
    const expression = unwrapTranslationExpression(node);
    return ts.isPropertyAccessExpression(expression)
      ? this.#resolveMemberReference(expression, sourceFile)
      : null;
  }

  #resolveMemberReference(
    node: ts.PropertyAccessExpression | ts.QualifiedName,
    sourceFile: ts.SourceFile,
  ): EnumMemberSeed | null {
    const expressionText = memberReferenceQualifierText(node, sourceFile);
    const memberName = memberReferenceNameText(node);
    if (
      !this.#enumNames.has(expressionText) &&
      !this.#memberNames.has(memberName)
    ) {
      return null;
    }
    const symbol = this.#checker.getSymbolAtLocation(
      ts.isPropertyAccessExpression(node) ? node.name : node.right,
    );
    const symbolMember = this.#memberForSymbol(symbol);
    if (symbolMember !== null) {
      return symbolMember;
    }
    const rows = this.#membersByQualifiedName.get(
      `${expressionText}.${memberName}`,
    );
    return rows?.length === 1 ? rows[0]! : null;
  }

  #memberForSymbol(symbol: ts.Symbol | undefined): EnumMemberSeed | null {
    if (symbol === undefined) {
      return null;
    }
    const aliased =
      (symbol.flags & ts.SymbolFlags.Alias) !== 0
        ? this.#checker.getAliasedSymbol(symbol)
        : symbol;
    for (const declaration of aliased.declarations ?? []) {
      const enumMember = nearestEnumMemberDeclaration(declaration);
      if (enumMember === null) {
        continue;
      }
      const file = this.#sourceProject.sourceFileIdentity(
        enumMember.getSourceFile(),
      );
      if (file === null) {
        continue;
      }
      const member = this.#membersByDeclarationKey.get(
        enumDeclarationKey(file, enumMember, enumMember.getSourceFile()),
      );
      if (member !== undefined) {
        return member;
      }
    }
    return null;
  }

  #memberForDeclaration(node: ts.EnumMember): EnumMemberSeed | null {
    const file = this.#sourceProject.sourceFileIdentity(node.getSourceFile());
    if (file === null) {
      return null;
    }
    return (
      this.#membersByDeclarationKey.get(
        enumDeclarationKey(file, node, node.getSourceFile()),
      ) ?? null
    );
  }

  #finalize(): TypeScriptEnumUsageIndex {
    const referenceCounts = countByMap(this.#references, (row) => row.memberKey);
    const rawValueCounts = countContextualRawValueOccurrences(
      this.#valueOccurrences.filter((row) => isRawValueRole(row.role)),
    );
    const translationInCounts = countByMap(
      [...this.#translationEdges.values()],
      (row) => row.toMemberKey,
    );
    const translationOutCounts = countByMap(
      [...this.#translationEdges.values()],
      (row) => row.fromMemberKey,
    );
    const members = this.#members.map((member) => ({
      ...member,
      referenceCount: referenceCounts.get(member.key) ?? 0,
      rawValueOccurrenceCount: rawValueCounts.get(member.key) ?? 0,
    }));
    const membersByKey = new Map(members.map((member) => [member.key, member]));
    const declarations = this.#declarations
      .map((declaration) => {
        const declarationMembers = declaration.memberKeys.map(
          (key) => membersByKey.get(key)!,
        );
        const referencedMemberCount = declarationMembers.filter(
          (member) => member.referenceCount > 0,
        ).length;
        const rawValueOccurrenceCount = declarationMembers.reduce(
          (sum, member) => sum + member.rawValueOccurrenceCount,
          0,
        );
        const translationInCount = declarationMembers.reduce(
          (sum, member) => sum + (translationInCounts.get(member.key) ?? 0),
          0,
        );
        const translationOutCount = declarationMembers.reduce(
          (sum, member) => sum + (translationOutCounts.get(member.key) ?? 0),
          0,
        );
        return {
          ...declaration,
          members: declarationMembers,
          memberCount: declarationMembers.length,
          referencedMemberCount,
          unreferencedMemberCount:
            declarationMembers.length - referencedMemberCount,
          rawValueOccurrenceCount,
          translationInCount,
          translationOutCount,
        };
      })
      .sort(compareEnumDeclarations);

    return {
      version: TYPESCRIPT_ENUM_USAGE_INDEX_VERSION,
      packageIds: uniqueSortedStrings(declarations.map((row) => row.packageId)),
      enumDeclarations: declarations,
      memberReferences: this.#references.sort(compareMemberReferences),
      valueOccurrences: this.#valueOccurrences.sort(compareValueOccurrences),
      valueSpaces: [...this.#valueSpaces(members)].sort(compareValueSpaces),
      translationEdges: [...this.#translationEdges.values()].sort(
        compareTranslationEdges,
      ),
    };
  }

  #valueSpaces(
    members: readonly TypeScriptEnumMemberRow[],
  ): readonly TypeScriptEnumValueSpaceRow[] {
    const membersByValueKey = groupBy(
      members.filter((member) => member.valueKey !== null),
      (member) => member.valueKey!,
    );
    const referencesByMemberKey = countByMap(this.#references, (row) => row.memberKey);
    const occurrencesByValueKey = groupBy(
      this.#valueOccurrences.filter((row) => isRawValueRole(row.role)),
      (row) => row.valueKey,
    );
    return [...membersByValueKey.entries()].map(([valueKey, valueMembers]) => {
      const occurrences = occurrencesByValueKey.get(valueKey) ?? [];
      const value = valueMembers[0]!.value as string | number;
      const referenceCount = valueMembers.reduce(
        (sum, member) => sum + (referencesByMemberKey.get(member.key) ?? 0),
        0,
      );
      return {
        id: `typescript-enum-value-space:${valueKey}`,
        value,
        valueKind: typeof value === "string" ? "string" : "number",
        valueKey,
        memberKeys: valueMembers.map((member) => member.key),
        enumNames: uniqueSortedStrings(valueMembers.map((member) => member.enumName)),
        packageIds: uniqueSortedStrings(valueMembers.map((member) => member.packageId)),
        memberReferenceCount: referenceCount,
        rawValueOccurrenceCount: occurrences.length,
        sourceFiles: uniqueSortedStrings(occurrences.map((row) => row.file.repoPath)),
        ...(occurrences[0] === undefined
          ? {}
          : { firstOccurrence: occurrences[0] }),
        summary: `${formatEnumValue(value)} is declared by ${
          valueMembers.length
        } enum member(s), referenced ${referenceCount} time(s), and appears as a raw value ${occurrences.length} time(s).`,
      };
    });
  }
}

function enumMemberExplicitValue(
  member: ts.EnumMember,
  sourceFile: ts.SourceFile,
): {
  readonly value: string | number | null;
  readonly valueKind: TypeScriptEnumValueKind;
} {
  const initializer = member.initializer;
  if (initializer === undefined) {
    return { value: null, valueKind: "computed" };
  }
  const literal = literalValue(initializer);
  if (literal !== null) {
    return {
      value: literal,
      valueKind: typeof literal === "string" ? "string" : "number",
    };
  }
  if (
    ts.isPrefixUnaryExpression(initializer) &&
    ts.isNumericLiteral(initializer.operand)
  ) {
    const value = Number(initializer.operand.text);
    return {
      value:
        initializer.operator === ts.SyntaxKind.MinusToken ? -value : value,
      valueKind: "number",
    };
  }
  return { value: initializer.getText(sourceFile), valueKind: "computed" };
}

function literalValue(
  node: ts.Node,
): string | number | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  return null;
}

function isLiteralLike(
  node: ts.Node,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.NumericLiteral {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node)
  );
}

function enumValueKey(value: string | number): string {
  return `${typeof value}:${String(value)}`;
}

function useRoleForNode(node: ts.Node): TypeScriptEnumUseRole {
  let current: ts.Node = node;
  while (current.parent !== undefined) {
    const parent = current.parent;
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
      return "module-specifier";
    }
    if (ts.isEnumMember(parent) && parent.initializer === current) {
      return "enum-member-initializer";
    }
    if (ts.isLiteralTypeNode(parent)) {
      return "literal-type";
    }
    if (ts.isTypeReferenceNode(parent)) {
      return "type-reference";
    }
    if (ts.isCaseClause(parent) && parent.expression === current) {
      return "case-label";
    }
    if (ts.isReturnStatement(parent)) {
      return "return-expression";
    }
    if (ts.isPropertyAssignment(parent)) {
      if (parent.name === current) {
        return "object-key";
      }
      if (parent.initializer === current) {
        return "object-value";
      }
    }
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      parent.arguments?.includes(current as ts.Expression) === true
    ) {
      return "call-argument";
    }
    if (ts.isBinaryExpression(parent)) {
      return parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ? "assignment"
        : "comparison";
    }
    if (
      ts.isStatement(parent) ||
      ts.isSourceFile(parent)
    ) {
      return "expression";
    }
    current = parent;
  }
  return "expression";
}

function memberReferenceQualifierText(
  node: ts.PropertyAccessExpression | ts.QualifiedName,
  sourceFile: ts.SourceFile,
): string {
  return ts.isPropertyAccessExpression(node)
    ? node.expression.getText(sourceFile)
    : node.left.getText(sourceFile);
}

function memberReferenceNameText(
  node: ts.PropertyAccessExpression | ts.QualifiedName,
): string {
  return ts.isPropertyAccessExpression(node) ? node.name.text : node.right.text;
}

function isRawValueRole(role: TypeScriptEnumUseRole): boolean {
  return role !== "enum-member-initializer" && role !== "module-specifier";
}

function functionLikeName(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.name !== undefined
  ) {
    return propertyNameText(node.name, sourceFile);
  }
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  if (ts.isArrowFunction(node)) {
    return "arrow-function";
  }
  return null;
}

function nearestEnumMemberDeclaration(node: ts.Declaration): ts.EnumMember | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isEnumMember(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function enumDeclarationKey(
  file: SourceFileIdentity,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string {
  const span = sourceSpanForNode(sourceFile, node);
  return `${file.packageId ?? "external"}:${file.repoPath}:${span.start}:${span.end}`;
}

function countContextualRawValueOccurrences(
  rows: readonly TypeScriptEnumValueOccurrenceRow[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const memberKey of row.contextualMemberKeys) {
      counts.set(memberKey, (counts.get(memberKey) ?? 0) + 1);
    }
  }
  return counts;
}

function addAll(target: Set<string>, source: Iterable<string>): void {
  for (const value of source) {
    target.add(value);
  }
}

function enumNameForDeclaration(declaration: ts.Declaration): string | null {
  if (ts.isEnumDeclaration(declaration)) {
    return declaration.name.text;
  }
  if (ts.isEnumMember(declaration) && ts.isEnumDeclaration(declaration.parent)) {
    return declaration.parent.name.text;
  }
  return null;
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_$])${escapeRegExp(word)}($|[^A-Za-z0-9_$])`, "u").test(text);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function unwrapTranslationExpression(node: ts.Node): ts.Node {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function compareEnumDeclarations(
  left: TypeScriptEnumDeclarationRow,
  right: TypeScriptEnumDeclarationRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.enumName.localeCompare(right.enumName) ||
    left.file.repoPath.localeCompare(right.file.repoPath)
  );
}

function compareMemberReferences(
  left: TypeScriptEnumMemberReferenceRow,
  right: TypeScriptEnumMemberReferenceRow,
): number {
  return (
    left.enumName.localeCompare(right.enumName) ||
    left.memberName.localeCompare(right.memberName) ||
    left.file.repoPath.localeCompare(right.file.repoPath) ||
    left.span.start - right.span.start
  );
}

function compareValueOccurrences(
  left: TypeScriptEnumValueOccurrenceRow,
  right: TypeScriptEnumValueOccurrenceRow,
): number {
  return (
    left.valueKey.localeCompare(right.valueKey) ||
    left.file.repoPath.localeCompare(right.file.repoPath) ||
    left.span.start - right.span.start
  );
}

function compareValueSpaces(
  left: TypeScriptEnumValueSpaceRow,
  right: TypeScriptEnumValueSpaceRow,
): number {
  return (
    right.rawValueOccurrenceCount - left.rawValueOccurrenceCount ||
    right.memberReferenceCount - left.memberReferenceCount ||
    String(left.value).localeCompare(String(right.value))
  );
}

function compareTranslationEdges(
  left: TypeScriptEnumTranslationEdgeRow,
  right: TypeScriptEnumTranslationEdgeRow,
): number {
  return (
    left.fromEnumName.localeCompare(right.fromEnumName) ||
    left.toEnumName.localeCompare(right.toEnumName) ||
    left.file.repoPath.localeCompare(right.file.repoPath) ||
    left.span.start - right.span.start
  );
}

function formatEnumValue(value: string | number): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
