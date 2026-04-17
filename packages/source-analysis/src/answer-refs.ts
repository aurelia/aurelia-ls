import type {
  AnswerRef,
  AnswerRefKind,
} from './answer-card.js';
import type {
  PackageExportRecord,
  PackageExportsSummary,
} from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';

export function createAnswerRef<TKind extends AnswerRefKind>(
  kind: TKind,
  value: string,
  label: string,
  detail?: string,
): AnswerRef & { readonly kind: TKind } {
  return {
    kind,
    value,
    label,
    ...(detail ? { detail } : {}),
  };
}

export function createPackageAnswerRef(
  packageName: string,
  detail?: string,
): AnswerRef & { readonly kind: 'package' } {
  return createAnswerRef('package', packageName, packageName, detail);
}

export function createPackageSummaryAnswerRef(
  pkg: PackageExportsSummary,
): AnswerRef & { readonly kind: 'package' } {
  return createPackageAnswerRef(
    pkg.package_name,
    pkg.package_dir.length > 0 ? pkg.package_dir : undefined,
  );
}

export function createFileAnswerRef(
  filePath: string,
  detail?: string,
): AnswerRef & { readonly kind: 'file' } {
  return createAnswerRef('file', filePath, basename(filePath), detail);
}

export function createTypeAnswerRef(
  typeName: string,
  detail?: string,
): AnswerRef & { readonly kind: 'type' } {
  return createAnswerRef('type', typeName, typeName, detail);
}

export function createTypeDeclarationAnswerRef(
  declaration: TypeDecl,
): AnswerRef & { readonly kind: 'type' } {
  return createTypeAnswerRef(
    declaration.name,
    `${declaration.file}:${declaration.line}`,
  );
}

export function createExportAnswerRef(
  exportName: string,
  detail?: string,
): AnswerRef & { readonly kind: 'export' } {
  return createAnswerRef('export', exportName, exportName, detail);
}

export function createExportRecordAnswerRef(
  record: PackageExportRecord,
): AnswerRef & { readonly kind: 'export' } {
  return createExportAnswerRef(record.exported_name, record.package_name);
}

export function createRepoAnswerRef(
  value: string,
  label = 'repo',
  detail?: string,
): AnswerRef & { readonly kind: 'repo' } {
  return createAnswerRef('repo', value, label, detail);
}

export function createCapabilityAnswerRef(
  value: string,
  label: string,
  detail?: string,
): AnswerRef & { readonly kind: 'capability' } {
  return createAnswerRef('capability', value, label, detail);
}

export function createInquiryAnswerRef(
  value: string,
  label: string,
  detail?: string,
): AnswerRef & { readonly kind: 'inquiry' } {
  return createAnswerRef('inquiry', value, label, detail);
}

export function createSubsystemAnswerRef(
  value: string,
  detail?: string,
): AnswerRef & { readonly kind: 'subsystem' } {
  return createAnswerRef('subsystem', value, value, detail);
}

function basename(
  filePath: string,
): string {
  return filePath.split('/').at(-1) ?? filePath;
}
