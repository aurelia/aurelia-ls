import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { type NormalizedPath, type VmReflection, normalizePathForId } from "@aurelia-ls/domain";
import type { Logger } from "./types.js";
import type { PathUtils } from "./paths.js";
import type { TsService } from "./ts-service.js";

const VM_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function hasSymbolFlag(symbol: ts.Symbol, flag: ts.SymbolFlags): boolean {
  return Boolean(symbol.getFlags() & flag);
}

/**
 * VM reflection that derives the root view-model type from the template path's
 * companion module (same basename, TS/JS extensions), picking a named export
 * class when available or falling back to the default export.
 */
export class VmReflectionService implements VmReflection {
  #activeTemplate: NormalizedPath | null = null;
  #lastDisplayName = "unknown";

  constructor(
    private readonly ts: TsService,
    private readonly paths: PathUtils,
    private readonly logger: Logger,
  ) {}

  setActiveTemplate(templatePath: string | NormalizedPath | null): void {
    this.#activeTemplate = templatePath ? this.paths.canonical(templatePath) : null;
  }

  getRootVmTypeExpr(): string {
    return this.#computeVmInstanceTypeExpr() ?? "unknown";
  }

  getQualifiedRootVmTypeExpr(): string {
    return this.getRootVmTypeExpr();
  }

  getDisplayName(): string {
    return this.#lastDisplayName;
  }

  getSyntheticPrefix(): string {
    return "__AU_TTC_";
  }

  #computeVmInstanceTypeExpr(): string | null {
    if (!this.#activeTemplate) return null;
    const companion = this.#findCompanionVm(this.#activeTemplate);
    if (!companion) return null;

    const program = this.ts.getService().getProgram();
    const sf = program?.getSourceFile(companion);
    const checker = program?.getTypeChecker();
    const moduleSymbol = sf && checker ? checker.getSymbolAtLocation(sf) : null;
    const exports = moduleSymbol && checker ? checker.getExportsOfModule(moduleSymbol) : [];
    const classExport = exports.find((s) => hasSymbolFlag(s, ts.SymbolFlags.Class));
    const defaultExport = exports.find((s) => s.getName() === "default");
    const target = classExport ?? defaultExport ?? exports[0] ?? null;
    const importPath = this.#toImportPath(companion);

    if (target) {
      const name = target.getName();
      const isDefault = name === "default";
      this.#lastDisplayName = isDefault ? this.#baseName(importPath) : name;
      const typeRef = `typeof import("${importPath}")["${name}"]`;
      // Prefer instance type so template lookups see instance members/bindables.
      return `InstanceType<${typeRef}>`;
    }

    this.logger.warn(`[vm] no exports found for companion ${companion}, falling back to unknown`);
    this.#lastDisplayName = "unknown";
    return null;
  }

  #findCompanionVm(templatePath: NormalizedPath): NormalizedPath | null {
    const base = templatePath.replace(/\.[^.]+$/, "");
    for (const ext of VM_EXTS) {
      const candidate = this.paths.canonical(`${base}${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  #toImportPath(file: NormalizedPath): string {
    // normalize to posix separators for TS import expressions.
    const normalized = normalizePathForId(path.resolve(file));
    return normalized.replace(/\\/g, "/");
  }

  #baseName(p: string): string {
    const match = /([^\\/]+?)(\.[a-zA-Z0-9]+)?$/.exec(p);
    return match?.[1] ?? "unknown";
  }
}
