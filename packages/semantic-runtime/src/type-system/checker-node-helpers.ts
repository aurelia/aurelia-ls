import ts from 'typescript';

export function firstSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | null {
  return symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
}

export function undefinedCheckerNode(
  checker: ts.TypeChecker,
  fallbackSourceFileName = 'semantic-runtime-checker-node.ts',
): ts.Node {
  return checker.getSymbolAtLocation(checkerLocationFromProgram(checker, fallbackSourceFileName))?.valueDeclaration
    ?? checkerLocationFromProgram(checker, fallbackSourceFileName);
}

function checkerLocationFromProgram(
  checker: ts.TypeChecker,
  fallbackSourceFileName: string,
): ts.SourceFile {
  return checker.getAmbientModules()[0]?.declarations?.[0]?.getSourceFile()
    ?? ts.createSourceFile(fallbackSourceFileName, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
}
