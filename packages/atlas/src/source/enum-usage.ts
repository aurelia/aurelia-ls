import ts from "typescript";

import {
  countByMap,
  groupBy,
  uniqueByKey,
  uniqueSortedStrings,
} from "../collections.js";
import { escapeRegExp } from "../text-regex.js";
import {
  PhaseProfiler,
  type PhaseProfileRow,
} from "../phase-profile.js";
import type {
  SourceFileIdentity,
  SourceProject,
  SourceSpan,
} from "./project.js";
import { SourceProjectKeyedMemo } from "./memo.js";
import { TypeScriptEnumRawValueContext } from "./enum-raw-value-context.js";
import {
  hasModifier,
  propertyNameText,
  returnExpressions,
  sourceSpanForNode,
} from "./semantic-surface/index.js";

/** Schema marker for the TypeScript enum usage source index. */
export const TYPESCRIPT_ENUM_USAGE_INDEX_VERSION =
  "typescript-enum-usage-v2";

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

export type TypeScriptEnumControlFlowKind =
  | "conditional-expression-test"
  | "do-while-condition"
  | "for-condition"
  | "if-condition"
  | "switch-case-label"
  | "switch-discriminant"
  | "while-condition";

export type TypeScriptEnumCouplingRelation =
  | "control-flow-cooccurrence"
  | "shared-value-space"
  | "type-surface-cooccurrence"
  | "translation";

export type TypeScriptEnumCouplingCarrier =
  | TypeScriptEnumControlFlowKind
  | TypeScriptEnumTranslationCarrier
  | "class-declaration"
  | "function-signature"
  | "interface-declaration"
  | "type-alias"
  | "value-space";

/** Control-flow carrier that makes an enum member usage branch, switch, or loop significant. */
export interface TypeScriptEnumControlFlowContext {
  readonly key: string;
  readonly kind: TypeScriptEnumControlFlowKind;
  readonly expressionText: string;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
}

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
  readonly controlFlow: TypeScriptEnumControlFlowContext | null;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
}

/** Aggregate member spend across references, owning functions, control-flow carriers, and enum couplings. */
export interface TypeScriptEnumMemberUsageSummaryRow {
  readonly memberKey: string;
  readonly packageId: string;
  readonly enumName: string;
  readonly memberName: string;
  readonly value: string | number | null;
  readonly referenceCount: number;
  readonly roleCounts: Readonly<Record<string, number>>;
  readonly controlFlowKindCounts: Readonly<Record<string, number>>;
  readonly containingFunctions: readonly string[];
  readonly containingClasses: readonly string[];
  readonly translationInCount: number;
  readonly translationOutCount: number;
  readonly coupledEnumNames: readonly string[];
  readonly couplingCount: number;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
  readonly summary: string;
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
  readonly controlFlow: TypeScriptEnumControlFlowContext | null;
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

/** Enum-to-enum coupling discovered through translations, branch carriers, declared type surfaces, or shared values. */
export interface TypeScriptEnumCouplingEdgeRow {
  readonly id: string;
  readonly packageId: string;
  readonly relation: TypeScriptEnumCouplingRelation;
  readonly carrier: TypeScriptEnumCouplingCarrier;
  readonly leftEnumName: string;
  readonly rightEnumName: string;
  readonly leftMemberNames: readonly string[];
  readonly rightMemberNames: readonly string[];
  readonly occurrenceCount: number;
  readonly expressionText: string;
  readonly file: SourceFileIdentity;
  readonly span: SourceSpan;
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

/** One measured phase inside a cold TypeScript enum usage index build. */
export interface TypeScriptEnumUsageIndexPhaseProfileRow extends PhaseProfileRow {}

/** Package-scoped enum usage substrate derived from one hot TypeScript Program. */
export interface TypeScriptEnumUsageIndex {
  readonly version: typeof TYPESCRIPT_ENUM_USAGE_INDEX_VERSION;
  readonly packageIds: readonly string[];
  readonly enumDeclarations: readonly TypeScriptEnumDeclarationRow[];
  readonly memberUsageSummaries: readonly TypeScriptEnumMemberUsageSummaryRow[];
  readonly memberReferences: readonly TypeScriptEnumMemberReferenceRow[];
  readonly valueOccurrences: readonly TypeScriptEnumValueOccurrenceRow[];
  readonly valueSpaces: readonly TypeScriptEnumValueSpaceRow[];
  readonly translationEdges: readonly TypeScriptEnumTranslationEdgeRow[];
  readonly couplingEdges: readonly TypeScriptEnumCouplingEdgeRow[];
  readonly profile: readonly TypeScriptEnumUsageIndexPhaseProfileRow[];
}

export interface TypeScriptEnumUsageIndexOptions {
  readonly packageId?: string;
  readonly contextualRawValueRoles?: TypeScriptEnumRawValueRoleSelection;
}

export type TypeScriptEnumRawValueRoleSelection =
  | "all"
  | "none"
  | readonly TypeScriptEnumUseRole[];

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

type TypeScriptEnumCouplingInput = Omit<
  TypeScriptEnumCouplingEdgeRow,
  "id" | "summary"
>;

interface TypeSurfaceContext {
  readonly carrier: Extract<
    TypeScriptEnumCouplingCarrier,
    | "class-declaration"
    | "function-signature"
    | "interface-declaration"
    | "type-alias"
  >;
  readonly label: string;
  readonly typeNodes: readonly ts.TypeNode[];
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
  const contextualRawValueRoles = options.contextualRawValueRoles ?? "all";
  const cacheKey = `${options.packageId ?? "*"}|raw-context:${contextualRawValueRoleKey(contextualRawValueRoles)}`;
  return enumUsageMemo.read(sourceProject, cacheKey, () =>
    new TypeScriptEnumUsageIndexBuilder(
      sourceProject,
      options.packageId,
      contextualRawValueRoles,
    ).build(),
  );
}

class TypeScriptEnumUsageIndexBuilder {
  readonly #sourceProject: SourceProject;
  readonly #packageId: string | undefined;
  readonly #checker: ts.TypeChecker;
  readonly #profiler =
    new PhaseProfiler<TypeScriptEnumUsageIndexPhaseProfileRow>();
  readonly #rawValueContext: TypeScriptEnumRawValueContext;
  readonly #contextualRawValueRoles: ReadonlySet<TypeScriptEnumUseRole> | null;
  readonly #declarations: EnumDeclarationSeed[] = [];
  readonly #members: EnumMemberSeed[] = [];
  readonly #membersByKey = new Map<string, EnumMemberSeed>();
  readonly #membersByDeclarationKey = new Map<string, EnumMemberSeed>();
  readonly #membersByQualifiedName = new Map<string, EnumMemberSeed[]>();
  readonly #membersByValueKey = new Map<string, EnumMemberSeed[]>();
  readonly #enumNames = new Set<string>();
  readonly #memberNames = new Set<string>();
  readonly #rootEnumNamesByType = new WeakMap<ts.Type, ReadonlySet<string>>();
  readonly #enumNamesByTypeNode = new WeakMap<ts.TypeNode, ReadonlySet<string>>();
  readonly #references: TypeScriptEnumMemberReferenceRow[] = [];
  readonly #valueOccurrences: TypeScriptEnumValueOccurrenceRow[] = [];
  readonly #translationEdges = new Map<string, TypeScriptEnumTranslationEdgeRow>();
  readonly #typeSurfaceCouplingInputs: TypeScriptEnumCouplingInput[] = [];

  constructor(
    sourceProject: SourceProject,
    packageId: string | undefined,
    contextualRawValueRoles: TypeScriptEnumRawValueRoleSelection,
  ) {
    this.#sourceProject = sourceProject;
    this.#packageId = packageId;
    this.#contextualRawValueRoles = contextualRawValueRoleSet(
      contextualRawValueRoles,
    );
    this.#checker = sourceProject.checker;
    this.#rawValueContext = new TypeScriptEnumRawValueContext(
      this.#checker,
      this.#profiler,
      (type) => this.#enumNamesForType(type),
    );
  }

  build(): TypeScriptEnumUsageIndex {
    const contexts = this.#profiler.time(
      "source-file-contexts",
      undefined,
      "Select admitted source files for the requested enum-usage package scope.",
      () => this.#sourceFileContexts(),
    );
    this.#profiler.time(
      "declaration-pass",
      contexts.length,
      "Walk source files to collect enum declaration and member seeds.",
      () => {
        for (const context of contexts) {
          this.#collectDeclarations(context);
        }
      },
    );
    this.#profiler.time(
      "usage-pass",
      contexts.length,
      "Walk source files to collect enum member references, raw value overlaps, and translation edges.",
      () => {
        for (const context of contexts) {
          this.#collectUsage(context);
        }
      },
    );
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
      this.#addTypeSurfaceCouplings(context, node);

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
      controlFlow: controlFlowContextForNode(context, node),
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
    const role = useRoleForNode(node);
    const span = sourceSpanForNode(context.sourceFile, node);
    const contextualMemberKeys = this.#shouldReadContextualRawValue(role)
      ? this.#contextualMemberKeysForLiteral(node, members, role)
      : [];
    return {
      id: `typescript-enum-value:${valueKey}:${context.file.repoPath}:${span.start}:${span.end}`,
      packageId: context.file.packageId!,
      value: literal,
      valueKind: typeof literal === "string" ? "string" : "number",
      valueKey,
      role,
      text: node.getText(context.sourceFile),
      controlFlow: controlFlowContextForNode(context, node),
      memberKeys: uniqueSortedStrings(members.map((member) => member.key)),
      contextualMemberKeys,
      file: context.file,
      span,
    };
  }

  #contextualMemberKeysForLiteral(
    node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.NumericLiteral,
    members: readonly EnumMemberSeed[],
    role: TypeScriptEnumUseRole,
  ): readonly string[] {
    if (ts.isNumericLiteral(node)) {
      // Numeric enum raw values collide with ordinary counters and sentinel values too broadly.
      // Direct Enum.Member references still carry numeric enum usage; contextual raw-value
      // narrowing is reserved for string-like values unless a future caller opts into numerics.
      this.#countContextualLookupResult(role, "numeric-skipped");
      return [];
    }
    const expectedEnumNames =
      this.#rawValueContext.expectedEnumNamesForLiteral(node, role);
    if (expectedEnumNames !== null) {
      return this.#contextualMemberKeysForEnumNames(
        members,
        role,
        expectedEnumNames,
      );
    }
    const contextualType = this.#profiler.measureRepeated(
      `checker.getContextualType.${role}`,
      `TypeChecker contextual type lookups for raw enum-like literals in ${role} positions.`,
      () => this.#checker.getContextualType(node),
    );
    if (contextualType === undefined) {
      this.#countContextualLookupResult(role, "none");
      return [];
    }
    return this.#contextualMemberKeysForEnumNames(
      members,
      role,
      this.#enumNamesForType(contextualType),
    );
  }

  #contextualMemberKeysForEnumNames(
    members: readonly EnumMemberSeed[],
    role: TypeScriptEnumUseRole,
    enumNames: ReadonlySet<string>,
  ): readonly string[] {
    if (enumNames.size === 0) {
      this.#countContextualLookupResult(role, "non-enum");
      return [];
    }
    const contextualMemberKeys = uniqueSortedStrings(
      members
        .filter((member) => enumNames.has(member.enumName))
        .map((member) => member.key),
    );
    this.#countContextualLookupResult(
      role,
      contextualMemberKeys.length === 0 ? "enum-miss" : "narrowed",
    );
    return contextualMemberKeys;
  }

  #shouldReadContextualRawValue(role: TypeScriptEnumUseRole): boolean {
    if (!needsContextualRawValueLookup(role)) {
      return false;
    }
    if (this.#contextualRawValueRoles === null) {
      return true;
    }
    if (!this.#contextualRawValueRoles.has(role)) {
      this.#countContextualLookupResult(role, "policy-skipped");
      return false;
    }
    return true;
  }

  #countContextualLookupResult(
    role: TypeScriptEnumUseRole,
    result: "enum-miss" | "narrowed" | "non-enum" | "none" | "numeric-skipped" | "policy-skipped",
  ): void {
    this.#profiler.countRepeated(
      `contextualType.result.${role}.${result}`,
      `Outcome count for raw enum-like literal contextual lookup in ${role} positions.`,
    );
  }

  #enumNamesForType(
    type: ts.Type,
    depth = 0,
  ): ReadonlySet<string> {
    if (depth === 0) {
      const cached = this.#rootEnumNamesByType.get(type);
      if (cached !== undefined) {
        return cached;
      }
      const names = this.#enumNamesForTypeUncached(type, depth);
      this.#rootEnumNamesByType.set(type, names);
      return names;
    }
    return this.#enumNamesForTypeUncached(type, depth);
  }

  #enumNamesForTypeNode(
    node: ts.TypeNode,
    depth = 0,
    seenDeclarations = new Set<ts.Declaration>(),
  ): ReadonlySet<string> {
    const cached = this.#enumNamesByTypeNode.get(node);
    if (cached !== undefined) {
      return cached;
    }
    const names = this.#enumNamesForTypeNodeUncached(
      node,
      depth,
      seenDeclarations,
    );
    this.#enumNamesByTypeNode.set(node, names);
    return names;
  }

  #enumNamesForTypeNodeUncached(
    node: ts.TypeNode,
    depth: number,
    seenDeclarations: Set<ts.Declaration>,
  ): ReadonlySet<string> {
    const names = new Set<string>();
    if (depth > 4) {
      return names;
    }
    if (ts.isTypeReferenceNode(node)) {
      const syntacticName = entityNameRightText(node.typeName);
      if (this.#enumNames.has(syntacticName)) {
        names.add(syntacticName);
      }
      for (const typeArgument of node.typeArguments ?? []) {
        addAll(names, this.#enumNamesForTypeNode(typeArgument, depth + 1, seenDeclarations));
      }
      this.#addEnumNamesForReferencedTypeAlias(
        names,
        node.typeName,
        depth,
        seenDeclarations,
      );
      return names;
    }
    if (ts.isImportTypeNode(node)) {
      if (node.qualifier !== undefined) {
        const qualifierName = entityNameRightText(node.qualifier);
        if (this.#enumNames.has(qualifierName)) {
          names.add(qualifierName);
        }
      }
      for (const typeArgument of node.typeArguments ?? []) {
        addAll(names, this.#enumNamesForTypeNode(typeArgument, depth + 1, seenDeclarations));
      }
      return names;
    }
    ts.forEachChild(node, (child) => {
      if (ts.isTypeNode(child)) {
        addAll(names, this.#enumNamesForTypeNode(child, depth + 1, seenDeclarations));
      }
    });
    if (names.size === 0 && isCheckerUsefulTypeNode(node)) {
      const type = this.#profiler.measureRepeated(
        "checker.getTypeFromTypeNode.enum-usage",
        "TypeChecker type lookup for enum names inside declared type surfaces.",
        () => this.#checker.getTypeFromTypeNode(node),
      );
      addAll(names, this.#enumNamesForType(type));
    }
    return names;
  }

  #addEnumNamesForReferencedTypeAlias(
    target: Set<string>,
    typeName: ts.EntityName,
    depth: number,
    seenDeclarations: Set<ts.Declaration>,
  ): void {
    const symbol = this.#profiler.measureRepeated(
      "checker.getSymbolAtLocation.type-reference",
      "TypeChecker symbol lookup for type references that may alias enum value spaces.",
      () => this.#checker.getSymbolAtLocation(entityNameLeaf(typeName)),
    );
    if (symbol === undefined) {
      return;
    }
    const declarations = aliasResolvedDeclarations(this.#checker, symbol, this.#profiler);
    for (const declaration of declarations) {
      if (seenDeclarations.has(declaration)) {
        continue;
      }
      seenDeclarations.add(declaration);
      if (ts.isEnumDeclaration(declaration)) {
        target.add(declaration.name.text);
      } else if (ts.isTypeAliasDeclaration(declaration)) {
        addAll(target, this.#enumNamesForTypeNode(
          declaration.type,
          depth + 1,
          seenDeclarations,
        ));
      }
    }
  }

  #enumNamesForTypeUncached(
    type: ts.Type,
    depth: number,
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
    const typeText = this.#profiler.measureRepeated(
      "checker.typeToString",
      "TypeChecker type display used as a fallback for enum-name overlap.",
      () => this.#checker.typeToString(type),
    );
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

  #addTypeSurfaceCouplings(
    context: SourceFileContext,
    node: ts.Node,
  ): void {
    const surface = typeSurfaceForNode(node, context.sourceFile);
    if (surface === null) {
      return;
    }
    const enumNames = uniqueSortedStrings(
      surface.typeNodes.flatMap((typeNode) => [
        ...this.#enumNamesForTypeNode(typeNode),
      ]),
    );
    if (enumNames.length < 2) {
      return;
    }
    const span = sourceSpanForNode(context.sourceFile, node);
    for (let leftIndex = 0; leftIndex < enumNames.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < enumNames.length; rightIndex += 1) {
        this.#typeSurfaceCouplingInputs.push({
          packageId: context.file.packageId!,
          relation: "type-surface-cooccurrence",
          carrier: surface.carrier,
          leftEnumName: enumNames[leftIndex]!,
          rightEnumName: enumNames[rightIndex]!,
          leftMemberNames: [],
          rightMemberNames: [],
          occurrenceCount: 1,
          expressionText: surface.label,
          file: context.file,
          span,
        });
      }
    }
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
    const syntacticMember = this.#uniqueQualifiedMember(
      expressionText,
      memberName,
    );
    if (syntacticMember !== null) {
      this.#profiler.countRepeated(
        "member-reference.syntax-exact",
        "Exact Enum.Member text resolved without a checker lookup.",
      );
      return syntacticMember;
    }
    if (
      !this.#enumNames.has(expressionText) &&
      !this.#memberNames.has(memberName)
    ) {
      return null;
    }
    const symbol = this.#profiler.measureRepeated(
      "checker.getSymbolAtLocation",
      "TypeChecker symbol lookups for possible Enum.Member references.",
      () => this.#checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(node) ? node.name : node.right,
      ),
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

  #uniqueQualifiedMember(
    enumName: string,
    memberName: string,
  ): EnumMemberSeed | null {
    if (!this.#enumNames.has(enumName)) {
      return null;
    }
    const rows = this.#membersByQualifiedName.get(`${enumName}.${memberName}`);
    return rows?.length === 1 ? rows[0]! : null;
  }

  #memberForSymbol(symbol: ts.Symbol | undefined): EnumMemberSeed | null {
    if (symbol === undefined) {
      return null;
    }
    const aliased =
      (symbol.flags & ts.SymbolFlags.Alias) !== 0
        ? this.#profiler.measureRepeated(
          "checker.getAliasedSymbol",
          "TypeChecker alias resolution for enum member symbols.",
          () => this.#checker.getAliasedSymbol(symbol),
        )
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

    const valueSpaces = [...this.#valueSpaces(members)].sort(compareValueSpaces);
    const translationEdges = [...this.#translationEdges.values()].sort(
      compareTranslationEdges,
    );
    const couplingEdges = enumCouplingEdges(
      this.#references,
      this.#valueOccurrences,
      valueSpaces,
      translationEdges,
      this.#typeSurfaceCouplingInputs,
      members,
    );
    return {
      version: TYPESCRIPT_ENUM_USAGE_INDEX_VERSION,
      packageIds: uniqueSortedStrings(declarations.map((row) => row.packageId)),
      enumDeclarations: declarations,
      memberUsageSummaries: enumMemberUsageSummaries(
        members,
        this.#references,
        translationEdges,
        couplingEdges,
      ),
      memberReferences: this.#references.sort(compareMemberReferences),
      valueOccurrences: this.#valueOccurrences.sort(compareValueOccurrences),
      valueSpaces,
      translationEdges,
      couplingEdges,
      profile: this.#profiler.rows(),
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
        firstOccurrence: occurrences[0],
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

export function enumValueKey(value: string | number): string {
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

function controlFlowContextForNode(
  context: SourceFileContext,
  node: ts.Node,
): TypeScriptEnumControlFlowContext | null {
  let current: ts.Node = node;
  while (current.parent !== undefined) {
    const parent = current.parent;
    if (ts.isIfStatement(parent) && parent.expression === current) {
      return controlFlowContext(context, "if-condition", parent.expression);
    }
    if (ts.isConditionalExpression(parent) && parent.condition === current) {
      return controlFlowContext(
        context,
        "conditional-expression-test",
        parent.condition,
      );
    }
    if (ts.isSwitchStatement(parent) && parent.expression === current) {
      return controlFlowContext(
        context,
        "switch-discriminant",
        parent.expression,
      );
    }
    if (ts.isCaseClause(parent) && parent.expression === current) {
      return controlFlowContext(context, "switch-case-label", parent.expression);
    }
    if (ts.isWhileStatement(parent) && parent.expression === current) {
      return controlFlowContext(context, "while-condition", parent.expression);
    }
    if (ts.isDoStatement(parent) && parent.expression === current) {
      return controlFlowContext(context, "do-while-condition", parent.expression);
    }
    if (ts.isForStatement(parent) && parent.condition === current) {
      return controlFlowContext(context, "for-condition", parent.condition);
    }
    current = parent;
  }
  return null;
}

function controlFlowContext(
  context: SourceFileContext,
  kind: TypeScriptEnumControlFlowKind,
  expression: ts.Expression,
): TypeScriptEnumControlFlowContext {
  const span = sourceSpanForNode(context.sourceFile, expression);
  return {
    key: `typescript-enum-control-flow:${kind}:${context.file.repoPath}:${span.start}:${span.end}`,
    kind,
    expressionText: expression.getText(context.sourceFile),
    file: context.file,
    span,
  };
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

function needsContextualRawValueLookup(role: TypeScriptEnumUseRole): boolean {
  switch (role) {
    case "assignment":
    case "call-argument":
    case "case-label":
    case "comparison":
    case "expression":
    case "object-value":
    case "return-expression":
      return true;
    case "enum-member-initializer":
    case "literal-type":
    case "module-specifier":
    case "object-key":
    case "type-reference":
      return false;
  }
}

function contextualRawValueRoleKey(
  selection: TypeScriptEnumRawValueRoleSelection,
): string {
  if (selection === "all" || selection === "none") {
    return selection;
  }
  return uniqueSortedStrings(selection).join(",");
}

function contextualRawValueRoleSet(
  selection: TypeScriptEnumRawValueRoleSelection,
): ReadonlySet<TypeScriptEnumUseRole> | null {
  if (selection === "all") {
    return null;
  }
  if (selection === "none") {
    return new Set<TypeScriptEnumUseRole>();
  }
  return new Set(selection);
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

function typeSurfaceForNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): TypeSurfaceContext | null {
  if (ts.isInterfaceDeclaration(node)) {
    return {
      carrier: "interface-declaration",
      label: `interface ${node.name.text}`,
      typeNodes: node.members.flatMap(typeNodesForTypeElement),
    };
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return {
      carrier: "type-alias",
      label: `type ${node.name.text}`,
      typeNodes: [node.type],
    };
  }
  if (ts.isClassDeclaration(node)) {
    return {
      carrier: "class-declaration",
      label: `class ${node.name?.text ?? "<anonymous>"}`,
      typeNodes: node.members.flatMap(typeNodesForClassElement),
    };
  }
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isArrowFunction(node)
  ) {
    const name = functionLikeName(node, sourceFile) ?? "<anonymous>";
    return {
      carrier: "function-signature",
      label: `function ${name}`,
      typeNodes: typeNodesForSignatureLike(node),
    };
  }
  return null;
}

function typeNodesForClassElement(
  node: ts.ClassElement,
): readonly ts.TypeNode[] {
  if (ts.isPropertyDeclaration(node)) {
    return optionalTypeNode(node.type);
  }
  if (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  ) {
    return typeNodesForSignatureLike(node);
  }
  return [];
}

function typeNodesForTypeElement(
  node: ts.TypeElement,
): readonly ts.TypeNode[] {
  if (ts.isPropertySignature(node)) {
    return optionalTypeNode(node.type);
  }
  if (
    ts.isMethodSignature(node) ||
    ts.isCallSignatureDeclaration(node) ||
    ts.isConstructSignatureDeclaration(node) ||
    ts.isIndexSignatureDeclaration(node)
  ) {
    return typeNodesForSignatureLike(node);
  }
  return [];
}

function typeNodesForSignatureLike(
  node:
    | ts.ArrowFunction
    | ts.CallSignatureDeclaration
    | ts.ConstructSignatureDeclaration
    | ts.ConstructorDeclaration
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.GetAccessorDeclaration
    | ts.IndexSignatureDeclaration
    | ts.MethodDeclaration
    | ts.MethodSignature
    | ts.SetAccessorDeclaration,
): readonly ts.TypeNode[] {
  const returnTypeNodes = "type" in node
    ? optionalTypeNode(node.type)
    : [];
  const typeParameterNodes = "typeParameters" in node
    ? typeParameterTypeNodes(node.typeParameters)
    : [];
  return [
    ...node.parameters.flatMap((parameter) => optionalTypeNode(parameter.type)),
    ...returnTypeNodes,
    ...typeParameterNodes,
  ];
}

function typeParameterTypeNodes(
  nodes: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
): readonly ts.TypeNode[] {
  return (nodes ?? []).flatMap((node) => [
    ...optionalTypeNode(node.constraint),
    ...optionalTypeNode(node.default),
  ]);
}

function optionalTypeNode(
  node: ts.TypeNode | undefined,
): readonly ts.TypeNode[] {
  return node === undefined ? [] : [node];
}

interface EnumUsageSymbolProfiler {
  measureRepeated<T>(
    phase: string,
    summary: string,
    read: () => T,
  ): T;
}

function aliasResolvedDeclarations(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  profiler: EnumUsageSymbolProfiler,
): readonly ts.Declaration[] {
  const resolved =
    (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? profiler.measureRepeated(
        "checker.getAliasedSymbol.type-reference",
        "TypeChecker alias resolution for type references that may carry enum value spaces.",
        () => checker.getAliasedSymbol(symbol),
      )
      : symbol;
  return resolved.declarations ?? [];
}

function entityNameLeaf(name: ts.EntityName): ts.Identifier {
  return ts.isIdentifier(name) ? name : name.right;
}

function entityNameRightText(name: ts.EntityName): string {
  return entityNameLeaf(name).text;
}

function isCheckerUsefulTypeNode(node: ts.TypeNode): boolean {
  return (
    ts.isIndexedAccessTypeNode(node) ||
    ts.isTypeOperatorNode(node) ||
    ts.isTypeQueryNode(node)
  );
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

function enumCouplingEdges(
  references: readonly TypeScriptEnumMemberReferenceRow[],
  valueOccurrences: readonly TypeScriptEnumValueOccurrenceRow[],
  valueSpaces: readonly TypeScriptEnumValueSpaceRow[],
  translationEdges: readonly TypeScriptEnumTranslationEdgeRow[],
  typeSurfaceCouplingInputs: readonly TypeScriptEnumCouplingInput[],
  members: readonly TypeScriptEnumMemberRow[],
): readonly TypeScriptEnumCouplingEdgeRow[] {
  const membersByKey = new Map(members.map((member) => [member.key, member]));
  const rows = new Map<string, TypeScriptEnumCouplingEdgeRow>();

  for (const edge of translationEdges) {
    addEnumCoupling(rows, {
      packageId: edge.packageId,
      relation: "translation",
      carrier: edge.carrier,
      leftEnumName: edge.fromEnumName,
      rightEnumName: edge.toEnumName,
      leftMemberNames: [edge.fromMemberName],
      rightMemberNames: [edge.toMemberName],
      occurrenceCount: 1,
      expressionText: edge.expressionText,
      file: edge.file,
      span: edge.span,
    });
  }

  for (const input of typeSurfaceCouplingInputs) {
    addEnumCoupling(rows, input);
  }

  const valueOccurrencesByValueKey = groupBy(
    valueOccurrences.filter((row) => row.contextualMemberKeys.length > 1),
    (row) => row.valueKey,
  );
  for (const valueSpace of valueSpaces) {
    if (valueSpace.enumNames.length < 2) {
      continue;
    }
    for (const occurrence of valueOccurrencesByValueKey.get(valueSpace.valueKey) ?? []) {
      const enumNames = uniqueSortedStrings(
        occurrence.contextualMemberKeys
          .map((key) => membersByKey.get(key)?.enumName)
          .filter((name): name is string => name !== undefined),
      );
      if (enumNames.length < 2) {
        continue;
      }
      for (let leftIndex = 0; leftIndex < enumNames.length - 1; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < enumNames.length; rightIndex += 1) {
          const leftEnumName = enumNames[leftIndex]!;
          const rightEnumName = enumNames[rightIndex]!;
          addEnumCoupling(rows, {
            packageId: occurrence.packageId,
            relation: "shared-value-space",
            carrier: "value-space",
            leftEnumName,
            rightEnumName,
            leftMemberNames: memberNamesForEnum(
              occurrence.contextualMemberKeys,
              membersByKey,
              leftEnumName,
            ),
            rightMemberNames: memberNamesForEnum(
              occurrence.contextualMemberKeys,
              membersByKey,
              rightEnumName,
            ),
            occurrenceCount: 1,
            expressionText: occurrence.text,
            file: occurrence.file,
            span: occurrence.span,
          });
        }
      }
    }
  }

  for (const group of groupBy(
    references.filter((row) => row.controlFlow !== null),
    (row) => row.controlFlow!.key,
  ).values()) {
    const controlFlow = group[0]?.controlFlow;
    if (controlFlow === undefined || controlFlow === null) {
      continue;
    }
    const enumNames = uniqueSortedStrings(group.map((row) => row.enumName));
    if (enumNames.length < 2) {
      continue;
    }
    for (let leftIndex = 0; leftIndex < enumNames.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < enumNames.length; rightIndex += 1) {
        const leftEnumName = enumNames[leftIndex]!;
        const rightEnumName = enumNames[rightIndex]!;
        addEnumCoupling(rows, {
          packageId: commonPackageId(group.map((row) => row.packageId)),
          relation: "control-flow-cooccurrence",
          carrier: controlFlow.kind,
          leftEnumName,
          rightEnumName,
          leftMemberNames: uniqueSortedStrings(
            group
              .filter((row) => row.enumName === leftEnumName)
              .map((row) => row.memberName),
          ),
          rightMemberNames: uniqueSortedStrings(
            group
              .filter((row) => row.enumName === rightEnumName)
              .map((row) => row.memberName),
          ),
          occurrenceCount: group.length,
          expressionText: controlFlow.expressionText,
          file: controlFlow.file,
          span: controlFlow.span,
        });
      }
    }
  }

  return [...rows.values()].sort(compareCouplingEdges);
}

function enumMemberUsageSummaries(
  members: readonly TypeScriptEnumMemberRow[],
  references: readonly TypeScriptEnumMemberReferenceRow[],
  translationEdges: readonly TypeScriptEnumTranslationEdgeRow[],
  couplingEdges: readonly TypeScriptEnumCouplingEdgeRow[],
): readonly TypeScriptEnumMemberUsageSummaryRow[] {
  const referencesByMember = groupBy(references, (row) => row.memberKey);
  const translationIn = groupBy(translationEdges, (row) => row.toMemberKey);
  const translationOut = groupBy(translationEdges, (row) => row.fromMemberKey);
  return members.map((member) => {
    const memberReferences = referencesByMember.get(member.key) ?? [];
    const memberCouplings = couplingEdgesForMember(member, couplingEdges);
    const roleCounts = countObject(memberReferences.map((row) => row.role));
    const controlFlowKindCounts = countObject(
      memberReferences
        .map((row) => row.controlFlow?.kind)
        .filter((kind): kind is TypeScriptEnumControlFlowKind => kind !== undefined),
    );
    const containingFunctions = uniqueSortedStrings(
      memberReferences.map((row) => row.containingFunction ?? "<module>"),
    );
    const containingClasses = uniqueSortedStrings(
      memberReferences
        .map((row) => row.containingClass)
        .filter((name): name is string => name !== null),
    );
    const coupledEnumNames = uniqueSortedStrings(
      memberCouplings.map((row) =>
        row.leftEnumName === member.enumName
          ? row.rightEnumName
          : row.leftEnumName,
      ),
    );
    const translationInCount = translationIn.get(member.key)?.length ?? 0;
    const translationOutCount = translationOut.get(member.key)?.length ?? 0;
    const controlFlowCount = Object.values(controlFlowKindCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return {
      memberKey: member.key,
      packageId: member.packageId,
      enumName: member.enumName,
      memberName: member.memberName,
      value: member.value,
      referenceCount: memberReferences.length,
      roleCounts,
      controlFlowKindCounts,
      containingFunctions,
      containingClasses,
      translationInCount,
      translationOutCount,
      coupledEnumNames,
      couplingCount: memberCouplings.reduce(
        (sum, coupling) => sum + coupling.occurrenceCount,
        0,
      ),
      file: member.file,
      span: member.span,
      summary: `${member.enumName}.${member.memberName} has ${memberReferences.length} reference(s), ${controlFlowCount} control-flow reference(s), ${translationInCount} translation-in edge(s), ${translationOutCount} translation-out edge(s), and ${coupledEnumNames.length} coupled enum(s).`,
    };
  }).sort(compareMemberUsageSummaries);
}

function couplingEdgesForMember(
  member: TypeScriptEnumMemberRow,
  edges: readonly TypeScriptEnumCouplingEdgeRow[],
): readonly TypeScriptEnumCouplingEdgeRow[] {
  return edges.filter((edge) =>
    (edge.leftEnumName === member.enumName &&
      edge.leftMemberNames.includes(member.memberName)) ||
    (edge.rightEnumName === member.enumName &&
      edge.rightMemberNames.includes(member.memberName))
  );
}

function countObject(values: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function addEnumCoupling(
  rows: Map<string, TypeScriptEnumCouplingEdgeRow>,
  input: Omit<TypeScriptEnumCouplingEdgeRow, "id" | "summary">,
): void {
  if (input.leftEnumName === input.rightEnumName) {
    return;
  }
  const ordered = orderedEnumPair(input);
  const id = `typescript-enum-coupling:${input.packageId}:${input.relation}:${input.carrier}:${ordered.leftEnumName}:${ordered.rightEnumName}`;
  const existing = rows.get(id);
  if (existing === undefined) {
    rows.set(id, {
      id,
      ...ordered,
      summary: enumCouplingSummary(ordered),
    });
    return;
  }
  const merged = {
    ...existing,
    leftMemberNames: uniqueSortedStrings([
      ...existing.leftMemberNames,
      ...ordered.leftMemberNames,
    ]),
    rightMemberNames: uniqueSortedStrings([
      ...existing.rightMemberNames,
      ...ordered.rightMemberNames,
    ]),
    occurrenceCount: existing.occurrenceCount + ordered.occurrenceCount,
  };
  rows.set(id, {
    ...merged,
    summary: enumCouplingSummary(merged),
  });
}

function orderedEnumPair(
  input: Omit<TypeScriptEnumCouplingEdgeRow, "id" | "summary">,
): Omit<TypeScriptEnumCouplingEdgeRow, "id" | "summary"> {
  if (input.leftEnumName.localeCompare(input.rightEnumName) <= 0) {
    return input;
  }
  return {
    ...input,
    leftEnumName: input.rightEnumName,
    rightEnumName: input.leftEnumName,
    leftMemberNames: input.rightMemberNames,
    rightMemberNames: input.leftMemberNames,
  };
}

function enumCouplingSummary(
  row: Omit<TypeScriptEnumCouplingEdgeRow, "id" | "summary">,
): string {
  return `${row.leftEnumName} and ${row.rightEnumName} are coupled by ${row.relation} through ${row.carrier} (${row.occurrenceCount} occurrence(s)).`;
}

function memberNamesForEnum(
  memberKeys: readonly string[],
  membersByKey: ReadonlyMap<string, TypeScriptEnumMemberRow>,
  enumName: string,
): readonly string[] {
  return uniqueSortedStrings(
    memberKeys
      .map((key) => membersByKey.get(key))
      .filter((member): member is TypeScriptEnumMemberRow => member?.enumName === enumName)
      .map((member) => member.memberName),
  );
}

function commonPackageId(packageIds: readonly string[]): string {
  const ids = uniqueSortedStrings(packageIds);
  return ids.length === 1 ? ids[0]! : "multiple";
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

function compareMemberUsageSummaries(
  left: TypeScriptEnumMemberUsageSummaryRow,
  right: TypeScriptEnumMemberUsageSummaryRow,
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

function compareCouplingEdges(
  left: TypeScriptEnumCouplingEdgeRow,
  right: TypeScriptEnumCouplingEdgeRow,
): number {
  return (
    left.leftEnumName.localeCompare(right.leftEnumName) ||
    left.rightEnumName.localeCompare(right.rightEnumName) ||
    left.relation.localeCompare(right.relation) ||
    left.carrier.localeCompare(right.carrier) ||
    right.occurrenceCount - left.occurrenceCount ||
    left.file.repoPath.localeCompare(right.file.repoPath) ||
    left.span.start - right.span.start
  );
}

function formatEnumValue(value: string | number): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
