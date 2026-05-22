import { indentSourceLines, sourceText } from './source-template.js';
import { sourceFieldSchemaReadonlyRecordFields } from './source-field-schema.js';
import type {
  SearchableDataTableField,
  SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';
import type { SearchableDataTableDomainNames } from './searchable-data-table-source-plan.js';

export function searchableDataTableCustomServiceSource(
  serviceClassName: string,
  modelModule: string,
  domain: SearchableDataTableDomainNames,
  fieldSchema: SearchableDataTableFieldSchema,
): string {
  const typeNames = fieldSchema.fields
    .map((field) => field.optionTypeName)
    .filter((typeName): typeName is string => typeName != null);
  const typeImport = typeNames.length === 0 ? '' : `, type ${typeNames.join(', type ')}`;
  return sourceText(`import { ${domain.entityClassName}${typeImport} } from '${modelModule}';

interface ${domain.recordInterfaceName} {
  readonly id: number;
${indentSourceLines(sourceFieldSchemaReadonlyRecordFields(fieldSchema.fields), '  ')}
}

const ${domain.collectionConstantName}: readonly ${domain.recordInterfaceName}[] = [
${indentSourceLines(customSampleRecords(fieldSchema, domain), '  ')}
];

export class ${serviceClassName} {
  async ${domain.listMethodName}(): Promise<readonly ${domain.entityClassName}[]> {
    return ${domain.collectionConstantName}.map((${domain.entityVariableName}) => new ${domain.entityClassName}(
      ${domain.entityVariableName}.id,
${indentSourceLines(customConstructorArguments(fieldSchema, domain.entityVariableName), '      ')}
    ));
  }
}
`);
}

function customSampleRecords(
  fieldSchema: SearchableDataTableFieldSchema,
  domain: SearchableDataTableDomainNames,
): string {
  return Array.from({ length: 8 }, (_, index) => {
    const id = index + 1;
    const assignments = fieldSchema.fields
      .map((field) => `${field.propertyName}: ${sampleValueExpression(field, index, domain)}`)
      .join(', ');
    return `{ id: ${id}, ${assignments} },`;
  }).join('\n');
}

function customConstructorArguments(
  fieldSchema: SearchableDataTableFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => `${entityVariableName}.${field.propertyName},`)
    .join('\n');
}

function sampleValueExpression(
  field: SearchableDataTableField,
  index: number,
  domain: SearchableDataTableDomainNames,
): string {
  switch (field.kind) {
    case 'email':
      return `'${domain.entityKebabName}-${index + 1}@example.com'`;
    case 'number':
      return `${(index + 2) * 17}`;
    case 'date':
      return `'2026-05-${String(10 + index).padStart(2, '0')}'`;
    case 'select':
      return `'${field.options[index % field.options.length]!.value}'`;
    case 'boolean':
      return index % 2 === 0 ? 'true' : 'false';
    case 'text':
      return `'${sampleText(field, index, domain)}'`;
  }
}

function sampleText(
  field: SearchableDataTableField,
  index: number,
  domain: SearchableDataTableDomainNames,
): string {
  if (/\b(name|title|label)\b/iu.test(`${field.propertyName} ${field.label}`)) {
    return `${domain.entityTitle} ${index + 1}`;
  }
  return `${field.label} ${index + 1}`;
}
