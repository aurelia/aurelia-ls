import ts from "typescript";

import type { TypeScriptEnumUsageIndex } from "../../source/index.js";
import type { SourceRange } from "../locus.js";

/** Role assigned to one string literal occurrence. */
export const enum AtlasSelfStringRole {
  /** Module specifier in an import/export declaration. */
  ModuleSpecifier = "module-specifier",
  /** String-valued enum member initializer. */
  EnumMemberValue = "enum-member-value",
  /** Literal type such as `"summary"`. */
  LiteralType = "literal-type",
  /** Switch case label. */
  CaseLabel = "case-label",
  /** Object property value. */
  PropertyValue = "property-value",
  /** Call/new expression argument. */
  Argument = "argument",
  /** Equality/comparison operand. */
  Comparison = "comparison",
  /** Template literal with no substitution. */
  TemplateLiteral = "template-literal",
  /** Other string literal occurrence. */
  Other = "other",
}

export interface AtlasSelfStringOccurrence {
  readonly value: string;
  readonly role: AtlasSelfStringRole;
  readonly packageId: string;
  readonly filePath: string;
  readonly source: SourceRange;
}

/** One grouped string literal value. */
export interface AtlasSelfStringLiteralRow {
  /** Stable row id. */
  readonly id: string;
  /** Literal text value. */
  readonly value: string;
  /** Total occurrence count after grouping. */
  readonly count: number;
  /** Counts by string role. */
  readonly roles: Readonly<Record<string, number>>;
  /** Owning package ids where this literal appears. */
  readonly packageIds: readonly string[];
  /** Source files where this literal appears. */
  readonly files: readonly string[];
  /** First occurrence source. */
  readonly firstSource: SourceRange;
  /** Enum members that declare this exact string value. */
  readonly declaredByEnumMembers: readonly string[];
  /** True when this value also appears outside enum declarations/imports. */
  readonly reusedOutsideDeclaration: boolean;
  /** Compact row summary. */
  readonly summary: string;
}

/** String literal grouped by likely contract-bearing role. */
export interface AtlasSelfContractStringRow {
  /** Stable row id. */
  readonly id: string;
  /** Literal value. */
  readonly value: string;
  /** Contract-bearing classes assigned to this value. */
  readonly classes: readonly string[];
  /** Number of grouped literal occurrences. */
  readonly count: number;
  /** Enum members that declare this string value. */
  readonly declaredByEnumMembers: readonly string[];
  /** Source files where this value appears. */
  readonly files: readonly string[];
  /** First occurrence source. */
  readonly firstSource: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

interface ContinuationStringInput {
  readonly continuationId: string | null;
}

interface SubstrateSurfaceStringInput {
  readonly value: string | null;
}

export function buildAtlasSelfStringRows(
  occurrences: readonly AtlasSelfStringOccurrence[],
  enumUsage: TypeScriptEnumUsageIndex,
): readonly AtlasSelfStringLiteralRow[] {
  const enumMembersByValue = new Map<string, string[]>();
  for (const enumRow of enumUsage.enumDeclarations) {
    for (const member of enumRow.members) {
      if (typeof member.value !== "string") {
        continue;
      }
      const rows = enumMembersByValue.get(member.value) ?? [];
      rows.push(`${enumRow.enumName}.${member.memberName}`);
      enumMembersByValue.set(member.value, rows);
    }
  }
  const byValue = new Map<string, AtlasSelfStringOccurrence[]>();
  for (const occurrence of occurrences) {
    const rows = byValue.get(occurrence.value) ?? [];
    rows.push(occurrence);
    byValue.set(occurrence.value, rows);
  }
  return [...byValue.entries()]
    .map(([value, rows]) => {
      const roles = countBy(rows, (row) => row.role);
      const files = uniqueSorted(rows.map((row) => row.filePath));
      const packageIds = uniqueSorted(rows.map((row) => row.packageId));
      const declaredByEnumMembers = enumMembersByValue.get(value) ?? [];
      const reusedOutsideDeclaration = rows.some((row) =>
        isMagicStringRole(row.role),
      );
      return {
        id: `atlas-self:string:${stableStringId(value)}`,
        value,
        count: rows.length,
        roles,
        packageIds,
        files,
        firstSource: rows[0]!.source,
        declaredByEnumMembers,
        reusedOutsideDeclaration,
        summary: `"${value}" appears ${rows.length} time(s) across ${files.length} file(s).`,
      };
    })
    .sort(
      (left, right) =>
        Number(right.reusedOutsideDeclaration) -
          Number(left.reusedOutsideDeclaration) ||
        right.count - left.count ||
        left.value.localeCompare(right.value),
    );
}

export class AtlasSelfContractStringClassifier {
  readonly #strings: readonly AtlasSelfStringLiteralRow[];
  readonly #continuationIds: ReadonlySet<string>;
  readonly #schemaValues: ReadonlySet<string>;

  constructor(
    strings: readonly AtlasSelfStringLiteralRow[],
    continuations: readonly ContinuationStringInput[],
    substrateSurfaces: readonly SubstrateSurfaceStringInput[],
  ) {
    this.#strings = strings;
    this.#continuationIds = new Set(
      continuations.flatMap((row) =>
        row.continuationId === null ? [] : [row.continuationId],
      ),
    );
    this.#schemaValues = new Set(
      substrateSurfaces.flatMap((row) => (row.value === null ? [] : [row.value])),
    );
  }

  rows(): readonly AtlasSelfContractStringRow[] {
    return this.#strings
      .flatMap((row) => {
        const classes = this.#classesFor(row);
        if (classes.length === 0) {
          return [];
        }
        return [
          {
            id: `atlas-self:contract-string:${stableStringId(row.value)}`,
            value: row.value,
            classes,
            count: row.count,
            declaredByEnumMembers: row.declaredByEnumMembers,
            files: row.files,
            firstSource: row.firstSource,
            summary: `${JSON.stringify(
              row.value,
            )} is contract-bearing as ${classes.join(", ")}.`,
          },
        ];
      })
      .sort(
        (left, right) =>
          left.classes[0]!.localeCompare(right.classes[0]!) ||
          left.value.localeCompare(right.value),
      );
  }

  #classesFor(row: AtlasSelfStringLiteralRow): readonly string[] {
    const classes = new Set<string>();
    for (const enumMember of row.declaredByEnumMembers) {
      this.#addEnumMemberClasses(classes, enumMember);
    }
    if (
      this.#continuationIds.has(row.value) ||
      /^[a-z0-9.-]+:[a-z0-9:._-]+$/u.test(row.value)
    ) {
      classes.add("continuation-or-row-id");
    }
    if (this.#schemaValues.has(row.value) || /-v\d+$/u.test(row.value)) {
      classes.add("schema-or-version");
    }
    if (
      row.files.some((file) => file.endsWith("lens.ts")) &&
      row.roles["property-value"] !== undefined
    ) {
      classes.add("lens-contract-literal");
    }
    return [...classes].sort((left, right) => left.localeCompare(right));
  }

  #addEnumMemberClasses(classes: Set<string>, enumMember: string): void {
    const enumName = enumMember.split(".")[0];
    switch (enumName) {
      case "LensId":
        classes.add("lens-id");
        break;
      case "SubstrateId":
        classes.add("substrate-id");
        break;
      case "NavigationRelation":
        classes.add("navigation-relation");
        break;
      case "NavigationPlane":
        classes.add("navigation-plane");
        break;
      case "EvidenceKind":
        classes.add("evidence-kind");
        break;
      case "BasisKind":
        classes.add("basis-kind");
        break;
      case "ContinuationKind":
        classes.add("continuation-kind");
        break;
      default:
        if (enumName?.endsWith("Relation") === true) {
          classes.add("relation-axis-value");
        } else if (enumName?.endsWith("Kind") === true) {
          classes.add("kind-axis-value");
        } else if (enumName?.endsWith("Phase") === true) {
          classes.add("phase-axis-value");
        }
        break;
    }
  }
}

export function stringRoleForNode(
  node: ts.StringLiteralLike,
): AtlasSelfStringRole {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return AtlasSelfStringRole.ModuleSpecifier;
  }
  if (ts.isEnumMember(parent) && parent.initializer === node) {
    return AtlasSelfStringRole.EnumMemberValue;
  }
  if (ts.isLiteralTypeNode(parent)) {
    return AtlasSelfStringRole.LiteralType;
  }
  if (ts.isCaseClause(parent)) {
    return AtlasSelfStringRole.CaseLabel;
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return AtlasSelfStringRole.PropertyValue;
  }
  if (
    (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
    parent.arguments?.includes(node as ts.Expression) === true
  ) {
    return AtlasSelfStringRole.Argument;
  }
  if (
    ts.isBinaryExpression(parent) &&
    (parent.left === node || parent.right === node)
  ) {
    return AtlasSelfStringRole.Comparison;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return AtlasSelfStringRole.TemplateLiteral;
  }
  return AtlasSelfStringRole.Other;
}

export function isStringLiteralLike(
  node: ts.Node,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function isMagicStringRole(role: AtlasSelfStringRole): boolean {
  return (
    role !== AtlasSelfStringRole.ModuleSpecifier &&
    role !== AtlasSelfStringRole.EnumMemberValue
  );
}

function stableStringId(value: string): string {
  const readable = value
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48);
  return `${readable}:${stableHash(value)}`;
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function countBy<TValue>(
  rows: readonly TValue[],
  key: (row: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const rowKey = key(row);
    counts[rowKey] = (counts[rowKey] ?? 0) + 1;
  }
  return counts;
}
