import { kebabSourceName, pascalSourceName, sourceNameWords } from './source-name.js';
import { sourceFieldSchemaReadonlyConstructorParameters } from './source-field-schema.js';
import { indentSourceLines, sourceText } from './source-template.js';
import type {
  SearchableDataTableField,
  SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';
import type { SearchableDataTableDomainNames } from './searchable-data-table-source-plan.js';

export function searchableDataTableCustomDomainModelSource(
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
): string {
  return sourceText(`${customFieldTypeDeclarations(fieldSchema)}
export class ${domain.entityClassName} {
  constructor(
    readonly id: number,
${indentSourceLines(sourceFieldSchemaReadonlyConstructorParameters(fieldSchema.fields), '    ')}
  ) {}

${indentSourceLines(customFieldGetters(fieldSchema), '  ')}
}

${customFieldLabelFunctions(fieldSchema)}
`);
}

function customFieldTypeDeclarations(fieldSchema: SearchableDataTableFieldSchema): string {
  const declarations = fieldSchema.fields
    .filter((field) => field.kind === 'select' && field.optionTypeName != null)
    .map((field) => `export type ${field.optionTypeName} = ${field.options.map((option) => `'${option.value}'`).join(' | ')};`);
  return declarations.length === 0 ? '' : `${declarations.join('\n')}\n\n`;
}

function customFieldGetters(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .flatMap((field) => [
      customFieldLabelGetter(field),
      ...(field.kind === 'select' ? [customFieldClassGetter(field)] : []),
    ])
    .join('\n\n');
}

function customFieldLabelGetter(field: SearchableDataTableField): string {
  switch (field.kind) {
    case 'select':
      return `get ${field.propertyName}Label(): string {
  return label${pascalSourceName(sourceNameWords(field.propertyName))}(this.${field.propertyName});
}`;
    case 'boolean':
      return `get ${field.propertyName}Label(): string {
  return this.${field.propertyName} ? 'Yes' : 'No';
}`;
    case 'number':
      return `get ${field.propertyName}Label(): string {
  return this.${field.propertyName}.toLocaleString();
}`;
    case 'date':
    case 'email':
    case 'text':
      return `get ${field.propertyName}Label(): string {
  return this.${field.propertyName};
}`;
  }
}

function customFieldClassGetter(field: SearchableDataTableField): string {
  return `get ${field.propertyName}Class(): string {
  return '${kebabSourceName(sourceNameWords(field.propertyName))}-' + this.${field.propertyName};
}`;
}

function customFieldLabelFunctions(fieldSchema: SearchableDataTableFieldSchema): string {
  return fieldSchema.fields
    .filter((field) => field.kind === 'select' && field.optionTypeName != null)
    .map((field) => `function label${pascalSourceName(sourceNameWords(field.propertyName))}(value: ${field.optionTypeName}): string {
  switch (value) {
${indentSourceLines(field.options.map((option) => `case '${option.value}':
  return '${option.label}';`).join('\n'), '    ')}
  }
}`)
    .join('\n\n');
}
