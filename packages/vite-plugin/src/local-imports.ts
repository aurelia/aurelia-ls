import type { ElementRes, ImportMetaIR, LocalImportDef } from "@aurelia-ls/compiler";

function deriveImportName(specifier: string): string {
  const lastSegment = specifier.split(/[/\\]/).pop() ?? specifier;
  return lastSegment.replace(/\.(ts|js|html)$/, "");
}

export function convertToLocalImports(
  imports: ImportMetaIR[],
  elements?: Readonly<Record<string, ElementRes>>,
): LocalImportDef[] {
  return imports.map((imp) => {
    const name = deriveImportName(imp.from.value);
    const normalized = name.toLowerCase();
    const element = elements?.[normalized];

    return {
      name: normalized,
      bindables: element?.bindables ?? {},
      alias: imp.defaultAlias?.value ?? undefined,
      aliases: element?.aliases,
    };
  });
}
