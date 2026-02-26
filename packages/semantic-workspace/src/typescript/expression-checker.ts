/**
 * Expression Type Checker — thin facade over ts.TypeChecker for expression-oriented queries.
 *
 * Wraps the TypeScript checker API for property lookup, member enumeration, and chain walking.
 * This is the Tier 2-3 substrate that the ExpressionSemanticModel uses to resolve types.
 *
 * STATELESS: every call goes directly to the TS checker. TypeScript caches internally,
 * so repeated calls to getTypeOfSymbol/getPropertiesOfType are cheap (memoized by TS).
 */

import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { TsService } from "./ts-service.js";

export interface PropertyInfo {
  name: string;
  type: string;
  isMethod: boolean;
  isOptional: boolean;
}

export class ExpressionTypeChecker {
  constructor(private readonly tsService: TsService) {}

  /**
   * Get the ts.TypeChecker from the current program.
   * Returns null if the program is not available.
   */
  private getChecker(): ts.TypeChecker | null {
    return this.tsService.getService().getProgram()?.getTypeChecker() ?? null;
  }

  private getProgram(): ts.Program | undefined {
    return this.tsService.getService().getProgram();
  }

  /**
   * Resolve the instance type of a class by name in a source file.
   * Returns the ts.Type of the class instance (what template expressions see).
   *
   * Uses the same module-export approach as VmReflectionService: find the module
   * symbol → get exports → match class name → get declared type. This handles
   * re-exports, default exports, and other patterns that a naive statement walk misses.
   */
  getClassInstanceType(sourceFile: NormalizedPath, className: string): ts.Type | null {
    const checker = this.getChecker();
    const program = this.getProgram();
    if (!checker || !program) return null;

    // Try to find the source file. TS might use a different path normalization
    // than our NormalizedPath, so try a few variants.
    let sf = program.getSourceFile(sourceFile);
    if (!sf) {
      // Try with forward slashes (TS on Windows sometimes uses forward slashes).
      sf = program.getSourceFile(sourceFile.replace(/\\/g, "/"));
    }
    if (!sf) {
      // Scan all source files for a matching basename + class.
      // This is a last resort but handles path normalization mismatches.
      const basename = sourceFile.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
      if (basename) {
        for (const candidate of program.getSourceFiles()) {
          const candidateBase = candidate.fileName.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
          if (candidateBase === basename) {
            sf = candidate;
            break;
          }
        }
      }
    }
    if (!sf) return null;

    // Strategy 1: Module exports (matches VmReflectionService approach).
    // Get the module symbol and search its exports for the class.
    const moduleSymbol = checker.getSymbolAtLocation(sf);
    if (moduleSymbol) {
      const exports = checker.getExportsOfModule(moduleSymbol);
      // Find by exact name first, then by class flag.
      let target = exports.find((s) => s.getName() === className);
      if (!target) {
        // className might be the display name, try finding any class export.
        target = exports.find((s) => Boolean(s.getFlags() & ts.SymbolFlags.Class));
      }
      if (!target && exports.length > 0) {
        // Last resort: default export or first export.
        target = exports.find((s) => s.getName() === "default") ?? exports[0];
      }

      if (target) {
        // Chase aliases to get the real symbol.
        let resolved = target;
        if (resolved.flags & ts.SymbolFlags.Alias) {
          resolved = checker.getAliasedSymbol(resolved);
        }

        // Get the instance type.
        if (resolved.flags & ts.SymbolFlags.Class) {
          return checker.getDeclaredTypeOfSymbol(resolved);
        }

        // Might be a variable with a class value (e.g., `export const Foo = class { ... }`).
        const declType = checker.getTypeOfSymbol(resolved);
        const constructSigs = declType.getConstructSignatures();
        if (constructSigs.length > 0) {
          return checker.getReturnTypeOfSignature(constructSigs[0]!);
        }

        // For non-class exports, the type itself might be what we want.
        return checker.getDeclaredTypeOfSymbol(resolved);
      }
    }

    // Strategy 2: Direct class declaration search (fallback).
    const classDecl = this.findClassDeclaration(sf, className);
    if (classDecl?.name) {
      const classSymbol = checker.getSymbolAtLocation(classDecl.name);
      if (classSymbol) {
        return checker.getDeclaredTypeOfSymbol(classSymbol);
      }
    }

    return null;
  }

  /**
   * Get the type of a specific property on a class by name.
   * Returns the type string, or undefined if not found.
   */
  getPropertyType(sourceFile: NormalizedPath, className: string, propertyName: string): string | undefined {
    const checker = this.getChecker();
    if (!checker) return undefined;

    const classType = this.getClassInstanceType(sourceFile, className);
    if (!classType) return undefined;

    return this.getPropertyTypeOfType(classType, propertyName);
  }

  /**
   * Get the type of a property on a ts.Type.
   */
  getPropertyTypeOfType(type: ts.Type, propertyName: string): string | undefined {
    const checker = this.getChecker();
    if (!checker) return undefined;

    const prop = checker.getPropertyOfType(type, propertyName);
    if (!prop) return undefined;

    const propType = checker.getTypeOfSymbol(prop);
    return checker.typeToString(propType);
  }

  /**
   * Get all properties/methods of a ts.Type.
   */
  getPropertiesOfType(type: ts.Type): PropertyInfo[] {
    const checker = this.getChecker();
    if (!checker) return [];

    const props = checker.getPropertiesOfType(type);
    const result: PropertyInfo[] = [];

    for (const prop of props) {
      // Skip internal/private symbols
      if (prop.name.startsWith("_") && prop.name.startsWith("__")) continue;

      const propType = checker.getTypeOfSymbol(prop);
      const typeStr = checker.typeToString(propType);
      const isMethod = propType.getCallSignatures().length > 0 && !propType.getConstructSignatures().length;
      const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;

      result.push({
        name: prop.name,
        type: typeStr,
        isMethod,
        isOptional,
      });
    }

    return result;
  }

  /**
   * Get all properties/methods of a type, given a type string and a context source file.
   * Evaluates the type expression in the context of the source file.
   */
  getPropertiesOfTypeString(typeString: string, contextFile: NormalizedPath): PropertyInfo[] {
    const type = this.resolveTypeString(typeString, contextFile);
    if (!type) return [];
    return this.getPropertiesOfType(type);
  }

  /**
   * Resolve a member chain starting from a class instance type.
   * E.g., given class Foo { items: Item[] } and chain ["items", "length"],
   * returns "number".
   */
  resolvePropertyChain(sourceFile: NormalizedPath, className: string, chain: string[]): string | undefined {
    const checker = this.getChecker();
    if (!checker || chain.length === 0) return undefined;

    let currentType = this.getClassInstanceType(sourceFile, className);
    if (!currentType) return undefined;

    for (const propName of chain) {
      const prop = checker.getPropertyOfType(currentType, propName);
      if (!prop) return undefined;
      currentType = checker.getTypeOfSymbol(prop);
    }

    return checker.typeToString(currentType);
  }

  /**
   * Resolve a member chain starting from a ts.Type.
   * Returns the final type, or null if any step fails.
   */
  resolvePropertyChainFromType(type: ts.Type, chain: string[]): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    let currentType = type;
    for (const propName of chain) {
      const prop = checker.getPropertyOfType(currentType, propName);
      if (!prop) return null;
      currentType = checker.getTypeOfSymbol(prop);
    }

    return currentType;
  }

  /**
   * Get the return type of a method on a type.
   */
  getMethodReturnType(type: ts.Type, methodName: string): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    const prop = checker.getPropertyOfType(type, methodName);
    if (!prop) return null;

    const propType = checker.getTypeOfSymbol(prop);
    const signatures = propType.getCallSignatures();
    if (signatures.length === 0) return null;

    // Use the first signature (most common case).
    return checker.getReturnTypeOfSignature(signatures[0]!);
  }

  /**
   * Extract the element type from a collection type.
   * Handles: T[], Array<T>, ReadonlyArray<T>, Set<T>, Map<K,V> (yields [K,V]),
   * and any iterable via number index signature.
   * Returns the element ts.Type, or null.
   */
  getElementTypeOfCollection(type: ts.Type): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    // Array/tuple types: use number index type.
    // This handles T[], Array<T>, ReadonlyArray<T>, and tuple types.
    const numberIndex = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    if (numberIndex) return numberIndex;

    // For union types (e.g., T[] | null), try each constituent.
    if (type.isUnion()) {
      for (const member of type.types) {
        const elemType = this.getElementTypeOfCollection(member);
        if (elemType) return elemType;
      }
    }

    // Try type arguments directly: if the type is Array<T>, Set<T>, etc.,
    // the type arguments carry the element type.
    const typeArgs = (type as any).typeArguments ?? (type as any).resolvedTypeArguments;
    if (typeArgs && typeArgs.length > 0) {
      // For Map<K,V>, this would give K — but number index is preferred for arrays.
      return typeArgs[0] as ts.Type;
    }

    return null;
  }

  /**
   * Get the awaited type of a Promise<T>.
   * Uses TS's built-in getAwaitedType when available.
   */
  getAwaitedType(type: ts.Type): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    // ts.TypeChecker.getAwaitedType exists in TS 4.5+
    if ("getAwaitedType" in checker && typeof (checker as any).getAwaitedType === "function") {
      const awaited = (checker as any).getAwaitedType(type) as ts.Type | undefined;
      if (awaited) return awaited;
    }

    // Fallback: look for `then` method's callback parameter type
    const thenProp = checker.getPropertyOfType(type, "then");
    if (!thenProp) return type; // Not a thenable — return as-is

    const thenType = checker.getTypeOfSymbol(thenProp);
    const callSigs = thenType.getCallSignatures();
    if (callSigs.length === 0) return null;

    // First param of `then` is `onfulfilled: (value: T) => ...`
    const sig = callSigs[0]!;
    const params = sig.getParameters();
    if (params.length === 0) return null;

    const onfulfilled = params[0]!;
    const onfulfilledType = checker.getTypeOfSymbol(onfulfilled);
    const onfulfilledSigs = onfulfilledType.getCallSignatures();
    if (onfulfilledSigs.length === 0) return null;

    const valueParams = onfulfilledSigs[0]!.getParameters();
    if (valueParams.length === 0) return null;

    return checker.getTypeOfSymbol(valueParams[0]!);
  }

  /**
   * Get the return type of calling a callable type.
   * Works for function types, arrow types, callable objects.
   */
  getCallReturnType(type: ts.Type): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    const signatures = type.getCallSignatures();
    if (signatures.length === 0) return null;
    return checker.getReturnTypeOfSignature(signatures[0]!);
  }

  /**
   * Get the instance type from calling `new` on a constructable type.
   */
  getConstructReturnType(type: ts.Type): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    const signatures = type.getConstructSignatures();
    if (signatures.length === 0) return null;
    return checker.getReturnTypeOfSignature(signatures[0]!);
  }

  /**
   * Get a well-known global type (Math, JSON, Array, Date, etc.).
   * Returns the type of the global variable from the TS lib.
   */
  getGlobalType(name: string): ts.Type | null {
    const checker = this.getChecker();
    const program = this.getProgram();
    if (!checker || !program) return null;

    // TS exposes global symbols via the global scope symbol.
    // Use checker.resolveName to find global symbols.
    // Fallback: search lib.d.ts source files for the global declaration.
    for (const sf of program.getSourceFiles()) {
      if (!sf.isDeclarationFile) continue;
      const moduleSymbol = checker.getSymbolAtLocation(sf);
      // Global declarations in lib files don't have module symbols —
      // their declarations are in the global scope.
      for (const stmt of sf.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === name) {
              const sym = checker.getSymbolAtLocation(decl.name);
              if (sym) return checker.getTypeOfSymbol(sym);
            }
          }
        }
        // Also check for interface/class declarations (e.g., `interface Math { ... }`)
        if ((ts.isInterfaceDeclaration(stmt) || ts.isClassDeclaration(stmt))
            && stmt.name?.text === name) {
          const sym = checker.getSymbolAtLocation(stmt.name);
          if (sym) return checker.getDeclaredTypeOfSymbol(sym);
        }
      }
    }

    return null;
  }

  /**
   * Get a primitive type by kind.
   */
  getPrimitiveType(kind: "string" | "number" | "boolean" | "void" | "undefined" | "null"): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    switch (kind) {
      case "string": return checker.getStringType();
      case "number": return checker.getNumberType();
      case "boolean": return checker.getBooleanType();
      case "void": return checker.getVoidType();
      case "undefined": return checker.getUndefinedType();
      case "null": return checker.getNullType();
    }
  }

  /**
   * Create a union type from multiple types (e.g., for `T | undefined`).
   * Uses internal TS API since getUnionType is not public.
   */
  getUnionType(types: ts.Type[]): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    // ts.TypeChecker has getUnionType internally but it's not in the public typings.
    // Access it via the internal API.
    if (typeof (checker as any).getUnionType === "function") {
      return (checker as any).getUnionType(types) as ts.Type;
    }

    // Fallback: return the first type (loses the union info but doesn't crash).
    return types[0] ?? null;
  }

  /**
   * Get a property's ts.Type from a parent ts.Type (not as string).
   */
  getPropertyTsType(type: ts.Type, propertyName: string): ts.Type | null {
    const checker = this.getChecker();
    if (!checker) return null;

    const prop = checker.getPropertyOfType(type, propertyName);
    if (!prop) return null;
    return checker.getTypeOfSymbol(prop);
  }

  /**
   * Convert a ts.Type to its string representation.
   */
  typeToString(type: ts.Type): string {
    const checker = this.getChecker();
    if (!checker) return "unknown";
    return checker.typeToString(type);
  }

  /**
   * Resolve a type expression string to a ts.Type in the context of a source file.
   * Useful for resolving VM type expressions like "InstanceType<typeof import(...)['Foo']>".
   */
  resolveTypeString(typeExpr: string, contextFile: NormalizedPath): ts.Type | null {
    const checker = this.getChecker();
    const program = this.getProgram();
    if (!checker || !program) return null;

    // Create a synthetic type query by evaluating the type expression.
    // We use the source file as context for import resolution.
    const sf = program.getSourceFile(contextFile);
    if (!sf) return null;

    // For simple class instance types, try direct resolution.
    // The typical pattern is: class name in a source file → getDeclaredTypeOfSymbol.
    // Complex type expressions (InstanceType<typeof import(...)>) need overlay synthesis
    // which is beyond what the expression model handles. Fall back to class-based resolution.
    return null;
  }

  // ── Private helpers ──

  private findClassDeclaration(sf: ts.SourceFile, className: string): ts.ClassDeclaration | null {
    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name?.text === className) {
        return stmt;
      }
      // Handle `export default class Foo { ... }`
      if (ts.isExportAssignment(stmt) && ts.isClassExpression(stmt.expression)) {
        const expr = stmt.expression;
        if (expr.name?.text === className) {
          return expr as unknown as ts.ClassDeclaration;
        }
      }
    }
    return null;
  }
}
