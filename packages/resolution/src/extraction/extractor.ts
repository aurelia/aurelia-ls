import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/domain";
import type { SourceFacts, ClassFacts } from "./types.js";
import { extractClassFacts } from "./class-extractor.js";
import { extractRegistrationCalls } from "./registrations.js";
import { canonicalPath } from "../util/naming.js";

/**
 * Extract facts from all source files in a TypeScript program.
 * Returns a map from file path to extracted facts.
 */
export function extractAllFacts(program: ts.Program): Map<NormalizedPath, SourceFacts> {
  const result = new Map<NormalizedPath, SourceFacts>();
  const checker = program.getTypeChecker();

  const files = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  for (const sf of files) {
    const facts = extractSourceFacts(sf, checker);
    result.set(facts.path, facts);
  }

  return result;
}

/**
 * Extract facts from a single source file.
 */
export function extractSourceFacts(sf: ts.SourceFile, checker: ts.TypeChecker): SourceFacts {
  const path = canonicalPath(sf.fileName);
  const classes: ClassFacts[] = [];
  const registrationCalls = extractRegistrationCalls(sf, checker);

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      classes.push(extractClassFacts(stmt, checker));
    }
  }

  return { path, classes, registrationCalls };
}
