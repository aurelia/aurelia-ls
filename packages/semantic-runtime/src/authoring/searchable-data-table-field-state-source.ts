import { pascalSourceName, sourceNameWords } from './source-name.js';
import { indentSourceLines, sourceText } from './source-template.js';
import type {
  SearchableDataTableField,
  SearchableDataTableFeatureProfile,
  SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';
import type { SearchableDataTableDomainNames } from './searchable-data-table-source-plan.js';

export function searchableDataTableCustomStateSource(
  stateClassName: string,
  filterStateClassName: string,
  sortStateClassName: string,
  paginationStateClassName: string,
  selectionStateClassName: string,
  serviceClassName: string,
  serviceModule: string,
  modelModule: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  return sourceText([
    customStateImports(serviceClassName, serviceModule, modelModule, domain, fieldSchema),
    customTableTypeDeclarations(fieldSchema, featureProfile),
    customFilterStateSource(filterStateClassName, domain, fieldSchema, featureProfile),
    ...(featureProfile.hasSortControls ? [customSortStateSource(sortStateClassName, fieldSchema)] : []),
    ...(featureProfile.hasPaginationControls ? [customPaginationStateSource(paginationStateClassName)] : []),
    ...(featureProfile.hasSelectionControls ? [customSelectionStateSource(selectionStateClassName, domain)] : []),
    customTableStateSource(
      stateClassName,
      filterStateClassName,
      sortStateClassName,
      paginationStateClassName,
      selectionStateClassName,
      serviceClassName,
      domain,
      fieldSchema,
      featureProfile,
    ),
  ].join('\n\n'));
}

function customStateImports(
  serviceClassName: string,
  serviceModule: string,
  modelModule: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
): string {
  const typeNames = fieldSchema.fields
    .map((field) => field.optionTypeName)
    .filter((typeName): typeName is string => typeName != null);
  const typeImports = [domain.entityClassName, ...typeNames].join(', ');
  return `import { resolve } from 'aurelia';
import type { ${typeImports} } from '${modelModule}';
import { ${serviceClassName} } from '${serviceModule}';`;
}

function customTableTypeDeclarations(
  fieldSchema: SearchableDataTableFieldSchema,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  const filterTypes = featureProfile.hasFacetFilters ? customFilterTypes(fieldSchema) : '';
  if (!featureProfile.hasSortControls) {
    return filterTypes.trimEnd();
  }
  return `${filterTypes}export type SortColumn = ${fieldSchema.fields.map((field) => `'${field.propertyName}'`).join(' | ')};
export type SortDirection = 'asc' | 'desc';

export interface TableColumn {
  readonly key: SortColumn;
  readonly label: string;
  readonly numeric?: boolean;
}`;
}

function customFilterStateSource(
  filterStateClassName: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  return `export class ${filterStateClassName} {
  searchQuery = '';
${indentSourceLines(featureProfile.hasFacetFilters ? customFilterStateFields(fieldSchema) : '', '  ')}
  get hasActiveFilters(): boolean {
    return this.searchQuery.trim().length > 0${featureProfile.hasFacetFilters ? customActiveFilterClauses(fieldSchema) : ''};
  }

  matches(${domain.entityVariableName}: ${domain.entityClassName}): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0
      || ${customSearchExpressions(fieldSchema, domain.entityVariableName)};
${indentSourceLines(featureProfile.hasFacetFilters ? customFilterMatchExpressions(fieldSchema, domain.entityVariableName) : '', '    ')}
    return matchesSearch${featureProfile.hasFacetFilters ? customFilterReturnClauses(fieldSchema) : ''};
  }

  reset(): void {
    this.searchQuery = '';
${indentSourceLines(featureProfile.hasFacetFilters ? customFilterResetStatements(fieldSchema) : '', '    ')}
  }
}`;
}

function customSortStateSource(
  sortStateClassName: string,
  fieldSchema: SearchableDataTableFieldSchema,
): string {
  return `export class ${sortStateClassName} {
  column: SortColumn = '${fieldSchema.fields[0]!.propertyName}';
  direction: SortDirection = 'asc';

  sortBy(column: SortColumn): void {
    if (this.column === column) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.column = column;
    this.direction = 'asc';
  }
}`;
}

function customPaginationStateSource(paginationStateClassName: string): string {
  return `export class ${paginationStateClassName} {
  page = 1;
  pageSize = 5;
  readonly pageSizes = [5, 10, 25] as const;

  get startIndex(): number {
    return (this.page - 1) * this.pageSize;
  }

  setPage(page: number, totalPages: number): void {
    this.page = Math.min(Math.max(page, 1), totalPages);
  }

  reset(): void {
    this.page = 1;
  }
}`;
}

function customSelectionStateSource(
  selectionStateClassName: string,
  domain: SearchableDataTableDomainNames,
): string {
  return `export class ${selectionStateClassName} {
  ${domain.selectedIdsPropertyName} = new Set<number>();

  get count(): number {
    return this.${domain.selectedIdsPropertyName}.size;
  }

  get hasSelection(): boolean {
    return this.${domain.selectedIdsPropertyName}.size > 0;
  }

  clear(): void {
    this.${domain.selectedIdsPropertyName}.clear();
  }
}`;
}

function customTableStateSource(
  stateClassName: string,
  filterStateClassName: string,
  sortStateClassName: string,
  paginationStateClassName: string,
  selectionStateClassName: string,
  serviceClassName: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  const members = [
    customTableStateFields(
      filterStateClassName,
      sortStateClassName,
      paginationStateClassName,
      selectionStateClassName,
      serviceClassName,
      domain,
      fieldSchema,
      featureProfile,
    ),
    customTableCollectionAccessors(domain, featureProfile),
    ...(featureProfile.hasSelectionControls ? [customTableSelectionAccessors(domain)] : []),
    customTableLoadMethods(domain),
    customTableNavigationMethods(domain, featureProfile),
    ...(featureProfile.hasSelectionControls ? [customTableSelectionMethods(domain)] : []),
    ...(featureProfile.hasSortControls ? [customTableSortMethods(domain, fieldSchema)] : []),
  ].join('\n\n');
  return `export class ${stateClassName} {
${indentSourceLines(members, '  ')}
}`;
}

function customTableStateFields(
  filterStateClassName: string,
  sortStateClassName: string,
  paginationStateClassName: string,
  selectionStateClassName: string,
  serviceClassName: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  return [
    `private readonly ${domain.serviceFieldName} = resolve(${serviceClassName});`,
    `readonly filters = new ${filterStateClassName}();`,
    featureProfile.hasSortControls ? `readonly sort = new ${sortStateClassName}();` : null,
    featureProfile.hasPaginationControls ? `readonly pagination = new ${paginationStateClassName}();` : null,
    featureProfile.hasSelectionControls ? `readonly selection = new ${selectionStateClassName}();` : null,
    featureProfile.hasSortControls
      ? `readonly columns: readonly TableColumn[] = [
${indentSourceLines(customColumnRows(fieldSchema), '  ')}
];`
      : null,
    `${domain.collectionPropertyName}: ${domain.entityClassName}[] = [];
isLoading = false;`,
  ]
    .filter((member): member is string => member != null)
    .join('\n\n');
}

function customTableCollectionAccessors(
  domain: SearchableDataTableDomainNames,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  return [
    `get ${domain.filteredCollectionGetterName}(): readonly ${domain.entityClassName}[] {
  return this.${domain.collectionPropertyName}.filter((${domain.entityVariableName}) => this.filters.matches(${domain.entityVariableName}));
}`,
    featureProfile.hasSortControls
      ? `get ${domain.sortedCollectionGetterName}(): readonly ${domain.entityClassName}[] {
  const sorted = [...this.${domain.filteredCollectionGetterName}];
  sorted.sort((left, right) => this.${domain.compareMethodName}(left, right));
  return sorted;
}`
      : null,
    featureProfile.hasPaginationControls
      ? `get ${domain.pageCollectionGetterName}(): readonly ${domain.entityClassName}[] {
  return this.${domain.sortedCollectionGetterName}.slice(
    this.pagination.startIndex,
    this.pagination.startIndex + this.pagination.pageSize,
  );
}`
      : null,
    `get totalResults(): number {
  return this.${domain.filteredCollectionGetterName}.length;
}`,
    featureProfile.hasPaginationControls
      ? `get totalPages(): number {
  return Math.max(1, Math.ceil(this.totalResults / this.pagination.pageSize));
}

get pages(): readonly number[] {
  return Array.from({ length: this.totalPages }, (_, index) => index + 1);
}

get startResult(): number {
  return this.totalResults === 0 ? 0 : this.pagination.startIndex + 1;
}

get endResult(): number {
  return Math.min(this.pagination.startIndex + this.${domain.pageCollectionGetterName}.length, this.totalResults);
}`
      : null,
  ]
    .filter((member): member is string => member != null)
    .join('\n\n');
}

function customTableSelectionAccessors(domain: SearchableDataTableDomainNames): string {
  return `get allPageSelected(): boolean {
  return this.${domain.pageCollectionGetterName}.length > 0 && this.${domain.pageCollectionGetterName}.every((${domain.entityVariableName}) =>
    this.selection.${domain.selectedIdsPropertyName}.has(${domain.entityVariableName}.id)
  );
}

get somePageSelected(): boolean {
  return this.${domain.pageCollectionGetterName}.some((${domain.entityVariableName}) => this.selection.${domain.selectedIdsPropertyName}.has(${domain.entityVariableName}.id))
    && !this.allPageSelected;
}

get selectionPercent(): number {
  return this.totalResults === 0
    ? 0
    : Math.round((this.selection.count / this.totalResults) * 100);
}`;
}

function customTableLoadMethods(domain: SearchableDataTableDomainNames): string {
  return `async ${domain.loadMethodName}(): Promise<void> {
  if (this.${domain.collectionPropertyName}.length > 0 || this.isLoading) {
    return;
  }

  this.isLoading = true;
  try {
    this.${domain.collectionPropertyName} = [...await this.${domain.serviceFieldName}.${domain.listMethodName}()];
  } finally {
    this.isLoading = false;
  }
}

${domain.readMethodName}(id: string | number): ${domain.entityClassName} | null {
  const normalizedId = typeof id === 'number' ? id : Number(id);
  if (!Number.isFinite(normalizedId)) {
    return null;
  }
  return this.${domain.collectionPropertyName}.find((candidate) => candidate.id === normalizedId) ?? null;
}`;
}

function customTableNavigationMethods(
  domain: SearchableDataTableDomainNames,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  return [
    featureProfile.hasSortControls
      ? `sortBy(column: SortColumn): void {
  this.sort.sortBy(column);
${featureProfile.hasPaginationControls ? '  this.pagination.reset();' : ''}
}`
      : null,
    `resetFilters(): void {
  this.filters.reset();
${featureProfile.hasPaginationControls ? '  this.pagination.reset();' : ''}
}`,
    featureProfile.hasPaginationControls
      ? `goToPage(page: number): void {
  this.pagination.setPage(page, this.totalPages);
}

previousPage(): void {
  this.goToPage(this.pagination.page - 1);
}

nextPage(): void {
  this.goToPage(this.pagination.page + 1);
}`
      : null,
  ]
    .filter((member): member is string => member != null)
    .join('\n\n');
}

function customTableSelectionMethods(domain: SearchableDataTableDomainNames): string {
  return `togglePageSelection(): void {
  if (this.allPageSelected) {
    for (const ${domain.entityVariableName} of this.${domain.pageCollectionGetterName}) {
      this.selection.${domain.selectedIdsPropertyName}.delete(${domain.entityVariableName}.id);
    }
    return;
  }

  for (const ${domain.entityVariableName} of this.${domain.pageCollectionGetterName}) {
    this.selection.${domain.selectedIdsPropertyName}.add(${domain.entityVariableName}.id);
  }
}

clearSelection(): void {
  this.selection.clear();
}`;
}

function customTableSortMethods(
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
): string {
  return `private ${domain.compareMethodName}(left: ${domain.entityClassName}, right: ${domain.entityClassName}): number {
  const leftValue = this.sortValue(left);
  const rightValue = this.sortValue(right);
  const direction = this.sort.direction === 'asc' ? 1 : -1;
  if (leftValue < rightValue) {
    return -direction;
  }
  if (leftValue > rightValue) {
    return direction;
  }
  return 0;
}

private sortValue(${domain.entityVariableName}: ${domain.entityClassName}): string | number {
  switch (this.sort.column) {
${indentSourceLines(customSortCases(fieldSchema, domain.entityVariableName), '    ')}
  }
}`;
}

function customFilterTypes(fieldSchema: SearchableDataTableFieldSchema): string {
  const filterTypes = fieldSchema.fields
    .filter((field) => field.kind === 'select' && field.optionTypeName != null)
    .map((field) => `export type ${filterTypeName(field)} = ${field.optionTypeName} | 'all';`);
  return filterTypes.length === 0 ? '' : `${filterTypes.join('\n')}\n`;
}

function customFilterStateFields(fieldSchema: SearchableDataTableFieldSchema): string {
  const fields = fieldSchema.fields.flatMap((field) => {
    if (field.kind === 'select' && field.filterPropertyName != null && field.filterOptionPropertyName != null) {
      return [
        `${field.filterPropertyName}: ${filterTypeName(field)} = 'all';`,
        '',
        `readonly ${field.filterOptionPropertyName}: readonly { readonly value: ${filterTypeName(field)}; readonly label: string }[] = [
  { value: 'all', label: 'Any ${field.label}' },
${indentSourceLines(field.options.map((option) => `{ value: '${option.value}', label: '${option.label}' },`).join('\n'), '  ')}
];`,
      ];
    }
    if (field.kind === 'boolean' && field.filterPropertyName != null) {
      return [`${field.filterPropertyName} = false;`];
    }
    return [];
  });
  return fields.length === 0 ? '' : `${fields.join('\n')}\n`;
}

function customActiveFilterClauses(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .map((field) => {
      if (field.kind === 'select' && field.filterPropertyName != null) {
        return `\n      || this.${field.filterPropertyName} !== 'all'`;
      }
      if (field.kind === 'boolean' && field.filterPropertyName != null) {
        return `\n      || this.${field.filterPropertyName}`;
      }
      return '';
    })
    .join('');
}

function customSearchExpressions(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  const searchableFields = fieldSchema.fields.filter((field) => field.kind !== 'boolean');
  const fields = searchableFields.length === 0 ? fieldSchema.fields : searchableFields;
  return fields
    .map((field) => `String(${entityVariableName}.${field.propertyName}).toLowerCase().includes(query)`)
    .join(`\n      || `);
}

function customFilterMatchExpressions(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => {
      if (field.kind === 'select' && field.filterPropertyName != null) {
        return `const matches${pascalSourceName(sourceNameWords(field.propertyName))} = this.${field.filterPropertyName} === 'all' || ${entityVariableName}.${field.propertyName} === this.${field.filterPropertyName};`;
      }
      if (field.kind === 'boolean' && field.filterPropertyName != null) {
        return `const matches${pascalSourceName(sourceNameWords(field.propertyName))} = !this.${field.filterPropertyName} || ${entityVariableName}.${field.propertyName};`;
      }
      return '';
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function customFilterReturnClauses(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .map((field) => {
      if ((field.kind === 'select' || field.kind === 'boolean') && field.filterPropertyName != null) {
        return ` && matches${pascalSourceName(sourceNameWords(field.propertyName))}`;
      }
      return '';
    })
    .join('');
}

function customFilterResetStatements(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .map((field) => {
      if (field.kind === 'select' && field.filterPropertyName != null) {
        return `this.${field.filterPropertyName} = 'all';`;
      }
      if (field.kind === 'boolean' && field.filterPropertyName != null) {
        return `this.${field.filterPropertyName} = false;`;
      }
      return '';
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function customColumnRows(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .map((field) => `{ key: '${field.propertyName}', label: '${field.label}'${field.numeric ? ', numeric: true' : ''} },`)
    .join('\n');
}

function customSortCases(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => `case '${field.propertyName}':
  return ${sortValueExpression(field, entityVariableName)};`)
    .join('\n');
}

function sortValueExpression(field: SearchableDataTableField, entityVariableName: string): string {
  switch (field.kind) {
    case 'email':
    case 'text':
      return `${entityVariableName}.${field.propertyName}.toLowerCase()`;
    case 'boolean':
      return `${entityVariableName}.${field.propertyName} ? 1 : 0`;
    case 'date':
    case 'number':
    case 'select':
      return `${entityVariableName}.${field.propertyName}`;
  }
}

function filterTypeName(field: SearchableDataTableField): string {
  return `${pascalSourceName(sourceNameWords(field.propertyName))}Filter`;
}
