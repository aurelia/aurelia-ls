import type * as ts from 'typescript';

import type { ExportChainStep } from './export-contract.js';

export interface ExportModuleDeclarationInfo {
  name: string;
  line: number;
  inherentlyTypeOnly: boolean;
}

export interface LocalExportSpecifierInfo {
  exportedName: string;
  originalName: string;
  line: number;
  typeOnly: boolean;
}

export interface ImportBindingInfo {
  localName: string;
  importedName: string;
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

export interface NamedReexportInfo {
  exportedName: string;
  originalName: string;
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

export interface StarReexportInfo {
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

export interface NamespaceReexportInfo {
  exportedName: string;
  line: number;
  specifier: string;
  targetFile: string | null;
}

export interface ExportModuleInfo {
  exportedDeclarations: Map<string, ExportModuleDeclarationInfo[]>;
  localExportSpecifiers: LocalExportSpecifierInfo[];
  importBindings: Map<string, ImportBindingInfo>;
  namedReexports: NamedReexportInfo[];
  starReexports: StarReexportInfo[];
  namespaceReexports: NamespaceReexportInfo[];
}

export interface ExportTraceContext {
  getModuleInfo(relPath: string): ExportModuleInfo;
  getSourceFile(relPath: string): ts.SourceFile | null;
  getExportedNamesForModule(relPath: string): ReadonlySet<string>;
}

export interface ExportTraceResult {
  originalName: string;
  typeOnly: boolean;
  namespaceExport: boolean;
  chain: ExportChainStep[];
}

export function traceModuleExport(
  context: ExportTraceContext,
  relPath: string,
  exportedName: string,
  visited = new Set<string>(),
): ExportTraceResult | null {
  const visitKey = `${relPath}\0${exportedName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const sourceFile = context.getSourceFile(relPath);
  const moduleInfo = context.getModuleInfo(relPath);

  const localDeclarations = moduleInfo.exportedDeclarations.get(exportedName);
  if (localDeclarations && localDeclarations.length > 0) {
    const declaration = localDeclarations[0]!;
    return {
      originalName: declaration.name,
      typeOnly: declaration.inherentlyTypeOnly,
      namespaceExport: false,
      chain: [{
        file: relPath,
        line: declaration.line,
        kind: 'local-declaration',
        exported_name: exportedName,
        original_name: declaration.name,
        type_only: declaration.inherentlyTypeOnly,
      }],
    };
  }

  for (const localExport of moduleInfo.localExportSpecifiers) {
    if (localExport.exportedName !== exportedName) continue;

    const directLocalDeclarations = moduleInfo.exportedDeclarations.get(localExport.originalName);
    if (directLocalDeclarations && directLocalDeclarations.length > 0) {
      const declaration = directLocalDeclarations[0]!;
      return {
        originalName: declaration.name,
        typeOnly: localExport.typeOnly || declaration.inherentlyTypeOnly,
        namespaceExport: false,
        chain: [
          {
            file: relPath,
            line: localExport.line,
            kind: 'local-export',
            exported_name: localExport.exportedName,
            original_name: localExport.originalName,
            type_only: localExport.typeOnly,
          },
          {
            file: relPath,
            line: declaration.line,
            kind: 'local-declaration',
            exported_name: declaration.name,
            original_name: declaration.name,
            type_only: declaration.inherentlyTypeOnly,
          },
        ],
      };
    }

    const binding = moduleInfo.importBindings.get(localExport.originalName);
    if (binding?.targetFile) {
      const traced = traceModuleExport(context, binding.targetFile, binding.importedName, visited);
      if (traced) {
        return {
          originalName: traced.originalName,
          typeOnly: localExport.typeOnly || binding.typeOnly || traced.typeOnly,
          namespaceExport: traced.namespaceExport,
          chain: [
            {
              file: relPath,
              line: localExport.line,
              kind: 'local-export',
              exported_name: localExport.exportedName,
              original_name: localExport.originalName,
              type_only: localExport.typeOnly,
            },
            {
              file: relPath,
              line: binding.line,
              kind: 'import-alias',
              exported_name: localExport.originalName,
              original_name: binding.importedName,
              specifier: binding.specifier,
              target_file: binding.targetFile,
              type_only: binding.typeOnly,
            },
            ...traced.chain,
          ],
        };
      }
    }
  }

  for (const reexport of moduleInfo.namedReexports) {
    if (reexport.exportedName !== exportedName || !reexport.targetFile) continue;
    const traced = traceModuleExport(context, reexport.targetFile, reexport.originalName, visited);
    if (traced) {
      return {
        originalName: traced.originalName,
        typeOnly: reexport.typeOnly || traced.typeOnly,
        namespaceExport: traced.namespaceExport,
        chain: [
          {
            file: relPath,
            line: reexport.line,
            kind: 'named-reexport',
            exported_name: reexport.exportedName,
            original_name: reexport.originalName,
            specifier: reexport.specifier,
            target_file: reexport.targetFile,
            type_only: reexport.typeOnly,
          },
          ...traced.chain,
        ],
      };
    }
  }

  for (const namespaceReexport of moduleInfo.namespaceReexports) {
    if (namespaceReexport.exportedName !== exportedName) continue;
    return {
      originalName: exportedName,
      typeOnly: false,
      namespaceExport: true,
      chain: [{
        file: relPath,
        line: namespaceReexport.line,
        kind: 'namespace-reexport',
        exported_name: namespaceReexport.exportedName,
        original_name: namespaceReexport.exportedName,
        specifier: namespaceReexport.specifier,
        target_file: namespaceReexport.targetFile ?? undefined,
        type_only: false,
      }],
    };
  }

  for (const starReexport of moduleInfo.starReexports) {
    if (!starReexport.targetFile) continue;
    const exportedNames = context.getExportedNamesForModule(starReexport.targetFile);
    if (!exportedNames.has(exportedName)) continue;

    const traced = traceModuleExport(context, starReexport.targetFile, exportedName, visited);
    if (traced) {
      return {
        originalName: traced.originalName,
        typeOnly: starReexport.typeOnly || traced.typeOnly,
        namespaceExport: traced.namespaceExport,
        chain: [
          {
            file: relPath,
            line: starReexport.line,
            kind: 'star-reexport',
            exported_name: exportedName,
            original_name: exportedName,
            specifier: starReexport.specifier,
            target_file: starReexport.targetFile,
            type_only: starReexport.typeOnly,
          },
          ...traced.chain,
        ],
      };
    }
  }

  if (sourceFile) {
    return {
      originalName: exportedName,
      typeOnly: false,
      namespaceExport: false,
      chain: [{
        file: relPath,
        line: 1,
        kind: 'fallback',
        exported_name: exportedName,
        original_name: exportedName,
      }],
    };
  }

  return null;
}
