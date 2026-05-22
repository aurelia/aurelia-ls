import type {
  SearchableDataTableFeatureProfile,
  SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';
import {
  isCompactSearchableDataTableFeatureProfile,
  searchableDataTableRowsGetterName,
} from './searchable-data-table-field-schema.js';
import type { SearchableDataTableDomainNames } from './searchable-data-table-source-plan.js';
import { sourceText } from './source-template.js';

export interface SearchableDataTableCustomTemplateInput {
  readonly domain: SearchableDataTableDomainNames;
  readonly fieldSchema: SearchableDataTableFieldSchema;
  readonly featureProfile: SearchableDataTableFeatureProfile;
  readonly detailRoutePathPrefix?: string | null;
}

export interface SearchableDataTableCustomDetailTemplateInput {
  readonly domain: SearchableDataTableDomainNames;
  readonly fieldSchema: SearchableDataTableFieldSchema;
  readonly detailRouteParameterName: string;
  readonly detailRouteQueryRefName: string;
  readonly listRoutePath: string;
}

export function searchableDataTableCustomTemplateSource(
  input: SearchableDataTableCustomTemplateInput,
): string {
  if (isCompactSearchableDataTableFeatureProfile(input.featureProfile)) {
    return compactSearchableDataTableCustomTemplateSource(input);
  }
  const domain = input.domain;
  const primaryField = input.fieldSchema.fields[0]!;
  const filters = input.featureProfile.hasFacetFilters ? customTemplateFilterControls(input.fieldSchema) : '';
  const detailHeader = input.detailRoutePathPrefix == null ? '' : '          <th>Detail</th>\n';
  const detailCell = input.detailRoutePathPrefix == null
    ? ''
    : `          <td><a load.bind="'${input.detailRoutePathPrefix}' + ${domain.entityVariableName}.id">Open</a></td>\n`;
  const selectionSummary = input.featureProfile.hasSelectionControls
    ? `\n        <span if.bind="state.selection.hasSelection">(\${state.selection.count} selected)</span>`
    : '';
  const clearSelectionButton = input.featureProfile.hasSelectionControls
    ? `    <button type="button" click.trigger="state.clearSelection()" disabled.bind="!state.selection.hasSelection">
      Clear selection
    </button>
`
    : '';
  const perPageControl = input.featureProfile.hasPaginationControls
    ? `    <label class="filter-field">
      <span>Per page</span>
      <select value.bind="state.pagination.pageSize">
        <option repeat.for="size of state.pagination.pageSizes" model.bind="size">\${size}</option>
      </select>
    </label>
`
    : '';
  const selectionMeter = input.featureProfile.hasSelectionControls
    ? `  <div class="selection-meter" aria-hidden="true">
    <span style="width: \${state.selectionPercent}%" background-color.style="state.selection.hasSelection ? '#0f766e' : '#64748b'"></span>
  </div>

`
    : '';
  const paginationFooter = input.featureProfile.hasPaginationControls
    ? `  <footer class="table-footer" if.bind="state.totalPages > 1">
    <button type="button" click.trigger="state.previousPage()" disabled.bind="state.pagination.page === 1">
      Previous
    </button>
    <span repeat.for="page of state.pages">
      <button type="button" click.trigger="state.goToPage(page)" class="\${page === state.pagination.page ? 'active' : ''}">
        \${page}
      </button>
    </span>
    <button type="button" click.trigger="state.nextPage()" disabled.bind="state.pagination.page === state.totalPages">
      Next
    </button>
  </footer>
`
    : '';
  const summaryLine = input.featureProfile.hasPaginationControls
    ? `Showing \${state.startResult}-\${state.endResult} of \${state.totalResults} ${domain.collectionLabelLower}`
    : `Showing \${state.totalResults} ${domain.collectionLabelLower}`;
  const rowGetterName = searchableDataTableRowsGetterName(domain, input.featureProfile);
  const selectedRowClass = input.featureProfile.hasSelectionControls
    ? `\n          selected.class="state.selection.${domain.selectedIdsPropertyName}.has(${domain.entityVariableName}.id)"`
    : '';
  const selectionHeader = input.featureProfile.hasSelectionControls
    ? `          <th>
            <input
              type="checkbox"
              checked.to-view="state.allPageSelected"
              indeterminate.to-view="state.somePageSelected"
              change.trigger="state.togglePageSelection()"
              disabled.bind="state.${rowGetterName}.length === 0"
              aria-label="Select page">
          </th>
`
    : '';
  const selectionCell = input.featureProfile.hasSelectionControls
    ? `          <td>
            <input type="checkbox" model.bind="${domain.entityVariableName}.id" checked.bind="state.selection.${domain.selectedIdsPropertyName}" aria-label="Select \${${domain.entityVariableName}.${primaryField.propertyName}Label}">
          </td>
`
    : '';
  return sourceText(`<section class="data-table \${state.filters.hasActiveFilters ? 'has-filters' : 'all-results'}">
  <div class="table-toolbar">
    <div>
      <h2>${domain.collectionTitle}</h2>
      <p class="summary" if.bind="!state.isLoading">
        ${summaryLine}${selectionSummary}
      </p>
    </div>
${clearSelectionButton}  </div>

  <div class="filter-grid">
    <label class="filter-field">
      <span>Search</span>
      <input type="search" value.bind="state.filters.searchQuery & debounce:300" placeholder="${customSearchPlaceholder(input.fieldSchema)}">
    </label>
${filters}${perPageControl}  </div>

  <button type="button" if.bind="state.filters.hasActiveFilters" click.trigger="state.resetFilters()">
    Reset filters
  </button>

${selectionMeter}  <p if.bind="state.isLoading">Loading ${domain.collectionLabelLower}...</p>
  <div else class="table-wrapper">
    <table>
      <thead>
        <tr>
${selectionHeader}${customTemplateHeaderCells(input)}
${detailHeader}        </tr>
      </thead>
      <tbody>
        <tr
          repeat.for="${domain.entityVariableName} of state.${rowGetterName}; key.bind: ${domain.entityVariableName}.id"${selectedRowClass}>
${selectionCell}${customTemplateCells(input.fieldSchema, domain.entityVariableName)}${detailCell}        </tr>
      </tbody>
    </table>

    <div class="empty-state" if.bind="state.${rowGetterName}.length === 0">
      <p>No ${domain.collectionLabelLower} match the current filters.</p>
      <button type="button" click.trigger="state.resetFilters()">Clear filters</button>
    </div>
  </div>

${paginationFooter}</section>
`);
}

function compactSearchableDataTableCustomTemplateSource(
  input: SearchableDataTableCustomTemplateInput,
): string {
  const domain = input.domain;
  const rowGetterName = searchableDataTableRowsGetterName(domain, input.featureProfile);
  const detailHeader = input.detailRoutePathPrefix == null ? '' : '\n          <th>Detail</th>';
  const detailCell = input.detailRoutePathPrefix == null
    ? ''
    : `          <td><a load.bind="'${input.detailRoutePathPrefix}' + ${domain.entityVariableName}.id">Open</a></td>\n`;
  return sourceText(`<section>
  <h2>${domain.collectionTitle}</h2>

  <label>
    <span>Search</span>
    <input type="search" value.bind="state.filters.searchQuery & debounce:300" placeholder="${customSearchPlaceholder(input.fieldSchema)}">
  </label>

  <button type="button" if.bind="state.filters.hasActiveFilters" click.trigger="state.resetFilters()">
    Reset search
  </button>

  <p if.bind="state.isLoading">Loading ${domain.collectionLabelLower}...</p>
  <table else>
    <thead>
      <tr>
${customTemplateHeaderCells(input)}${detailHeader}
      </tr>
    </thead>
    <tbody>
      <tr repeat.for="${domain.entityVariableName} of state.${rowGetterName}; key.bind: ${domain.entityVariableName}.id">
${customTemplateCells(input.fieldSchema, domain.entityVariableName)}${detailCell}      </tr>
    </tbody>
  </table>

  <p if.bind="!state.isLoading && state.${rowGetterName}.length === 0">
    No ${domain.collectionLabelLower} match the current search.
  </p>
</section>
`);
}

export function searchableDataTableCustomDetailTemplateSource(
  input: SearchableDataTableCustomDetailTemplateInput,
): string {
  const domain = input.domain;
  const primaryField = input.fieldSchema.fields[0]!;
  return sourceText(`<section class="detail-card">
  <a load="${input.listRoutePath}">Back to ${domain.collectionLabelLower}</a>

  <let ${domain.entityVariableName}.bind="state.${domain.readMethodName}(routeParams.${input.detailRouteParameterName})"></let>
  <template if.bind="${domain.entityVariableName}">
    <h2>\${${domain.entityVariableName}.${primaryField.propertyName}Label}</h2>
    <dl>
${customDetailRows(input.fieldSchema, domain.entityVariableName)}
      <dt>Opened from</dt>
      <dd>\${routeParams.${input.detailRouteQueryRefName} ?? '${domain.collectionLabelLower}'}</dd>
    </dl>
  </template>
  <p else>Loading ${domain.entityTitle} \${routeParams.${input.detailRouteParameterName}}...</p>
</section>
`);
}

function customTemplateHeaderCells(
  input: SearchableDataTableCustomTemplateInput,
): string {
  if (!input.featureProfile.hasSortControls) {
    return input.fieldSchema.fields
      .map((field) => `          <th${field.numeric ? ' class="numeric"' : ''}>${field.label}</th>`)
      .join('\n');
  }
  return `          <th
            repeat.for="column of state.columns; key.bind: column.key"
            click.trigger="state.sortBy(column.key)"
            class="sortable \${state.sort.column === column.key ? 'sorted' : ''}"
            numeric.class="column.numeric">
            \${column.label}
            <span if.bind="state.sort.column === column.key">\${state.sort.direction}</span>
          </th>`;
}

function customTemplateFilterControls(fieldSchema: SearchableDataTableFieldSchema): string {
  const controls = fieldSchema.fields.flatMap((field) => {
    if (field.kind === 'select' && field.filterPropertyName != null && field.filterOptionPropertyName != null) {
      return [`    <label class="filter-field">
      <span>${field.label}</span>
      <select value.bind="state.filters.${field.filterPropertyName}">
        <option repeat.for="option of state.filters.${field.filterOptionPropertyName}" model.bind="option.value">\${option.label}</option>
      </select>
    </label>
`];
    }
    if (field.kind === 'boolean' && field.filterPropertyName != null) {
      return [`    <label class="filter-field">
      <span>Only ${field.label.toLowerCase()}</span>
      <input type="checkbox" checked.bind="state.filters.${field.filterPropertyName}">
    </label>
`];
    }
    return [];
  });
  return controls.length === 0 ? '' : `${controls.join('\n')}\n`;
}

function customSearchPlaceholder(fieldSchema: SearchableDataTableFieldSchema): string {
  const searchFields = fieldSchema.fields
    .filter((field) => field.kind === 'text' || field.kind === 'email')
    .slice(0, 2)
    .map((field) => field.label.toLowerCase());
  return searchFields.length === 0 ? 'Search records' : `Search ${searchFields.join(' or ')}`;
}

function customTemplateCells(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => {
      const numericClass = field.numeric ? ' class="numeric"' : '';
      if (field.kind === 'select') {
        return `          <td${numericClass}><span class.bind="${entityVariableName}.${field.propertyName}Class">\${${entityVariableName}.${field.propertyName}Label}</span></td>\n`;
      }
      return `          <td${numericClass}>\${${entityVariableName}.${field.propertyName}Label}</td>\n`;
    })
    .join('');
}

function customDetailRows(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => {
      if (field.kind === 'select') {
        return `      <dt>${field.label}</dt>
      <dd><span class.bind="${entityVariableName}.${field.propertyName}Class">\${${entityVariableName}.${field.propertyName}Label}</span></dd>`;
      }
      return `      <dt>${field.label}</dt>
      <dd>\${${entityVariableName}.${field.propertyName}Label}</dd>`;
    })
    .join('\n');
}
