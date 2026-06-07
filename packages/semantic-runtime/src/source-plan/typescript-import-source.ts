/** Static TypeScript import requirement before a concrete import statement is placed in a file. */
export interface TypeScriptImportRequirement {
  readonly moduleSpecifier: string;
  readonly defaultImport?: string;
  readonly namedImports?: readonly string[];
  readonly defaultTypeImport?: string;
  readonly namedTypeImports?: readonly string[];
}

/** Static TypeScript import requirement that must import at least one named export. */
export interface TypeScriptNamedImportRequirement extends TypeScriptImportRequirement {
  readonly namedImports: readonly string[];
}

/** Merge static TypeScript imports by module while preserving the first default binding. */
export function mergeTypeScriptImportRequirements(
  imports: readonly TypeScriptImportRequirement[],
): readonly TypeScriptImportRequirement[] {
  const byModule = new Map<string, {
    defaultImport: string | null;
    namedImports: string[];
    defaultTypeImport: string | null;
    namedTypeImports: string[];
  }>();
  for (const importSpec of imports) {
    const existing = byModule.get(importSpec.moduleSpecifier) ?? {
      defaultImport: null,
      namedImports: [],
      defaultTypeImport: null,
      namedTypeImports: [],
    };
    if (importSpec.defaultImport != null && importSpec.defaultImport.length > 0) {
      if (existing.defaultImport != null && existing.defaultImport !== importSpec.defaultImport) {
        throw new Error(
          `TypeScript imports for '${importSpec.moduleSpecifier}' requested default imports '${existing.defaultImport}' and '${importSpec.defaultImport}'.`,
        );
      }
      existing.defaultImport = importSpec.defaultImport;
    }
    if (importSpec.defaultTypeImport != null && importSpec.defaultTypeImport.length > 0) {
      if (existing.defaultTypeImport != null && existing.defaultTypeImport !== importSpec.defaultTypeImport) {
        throw new Error(
          `TypeScript imports for '${importSpec.moduleSpecifier}' requested default type imports '${existing.defaultTypeImport}' and '${importSpec.defaultTypeImport}'.`,
        );
      }
      existing.defaultTypeImport = importSpec.defaultTypeImport;
    }
    for (const namedImport of importSpec.namedImports ?? []) {
      if (!existing.namedImports.includes(namedImport)) {
        existing.namedImports.push(namedImport);
      }
    }
    for (const namedTypeImport of importSpec.namedTypeImports ?? []) {
      if (!existing.namedTypeImports.includes(namedTypeImport)) {
        existing.namedTypeImports.push(namedTypeImport);
      }
    }
    byModule.set(importSpec.moduleSpecifier, existing);
  }
  return [...byModule.entries()]
    .sort((left, right) => importModuleGroupRank(left[0]) - importModuleGroupRank(right[0]))
    .map(([moduleSpecifier, importSpec]) => {
      const namedTypeImports = importSpec.namedTypeImports.filter((namedTypeImport) =>
        !importSpec.namedImports.includes(namedTypeImport));
      return {
        moduleSpecifier,
        defaultImport: importSpec.defaultImport ?? undefined,
        namedImports: importSpec.namedImports.length === 0 ? undefined : importSpec.namedImports,
        defaultTypeImport: importSpec.defaultTypeImport === importSpec.defaultImport
          ? undefined
          : importSpec.defaultTypeImport ?? undefined,
        namedTypeImports: namedTypeImports.length === 0 ? undefined : namedTypeImports,
      };
    });
}

/** Keep package imports before relative imports while preserving caller order inside each group. */
function importModuleGroupRank(moduleSpecifier: string): number {
  return moduleSpecifier.startsWith('.') ? 1 : 0;
}

/** Emit TypeScript import declarations for merged static import requirements. */
export function typeScriptImportStatements(
  imports: readonly TypeScriptImportRequirement[],
): string {
  const statements = mergeTypeScriptImportRequirements(imports).flatMap(typeScriptImportStatementLines);
  return statements.length === 0 ? '' : `${statements.join('\n')}\n`;
}

/** Emit TypeScript import declarations from one static import requirement. */
export function typeScriptImportStatement(
  importSpec: TypeScriptImportRequirement,
): string {
  return typeScriptImportStatementLines(importSpec).join('\n');
}

function typeScriptImportStatementLines(
  importSpec: TypeScriptImportRequirement,
): readonly string[] {
  const statements: string[] = [];
  const valueImportClause = typeScriptImportClause(importSpec.defaultImport, importSpec.namedImports);
  if (valueImportClause == null) {
    if (
      importSpec.defaultTypeImport == null
      && (importSpec.namedTypeImports == null || importSpec.namedTypeImports.length === 0)
    ) {
      statements.push(`import '${importSpec.moduleSpecifier}';`);
    }
  } else {
    statements.push(`import ${valueImportClause} from '${importSpec.moduleSpecifier}';`);
  }

  const typeImportClause = typeScriptImportClause(importSpec.defaultTypeImport, importSpec.namedTypeImports);
  if (typeImportClause != null) {
    statements.push(`import type ${typeImportClause} from '${importSpec.moduleSpecifier}';`);
  }
  return statements;
}

function typeScriptImportClause(
  defaultImport: string | undefined,
  namedImportNames: readonly string[] | undefined,
): string | null {
  const namedImports = namedImportNames == null || namedImportNames.length === 0
    ? null
    : `{ ${namedImportNames.join(', ')} }`;
  const importClause = [defaultImport, namedImports]
    .filter((part): part is string => part != null && part.length > 0)
    .join(', ');
  return importClause.length === 0 ? null : importClause;
}
