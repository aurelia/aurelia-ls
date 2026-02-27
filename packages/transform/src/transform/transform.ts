/**
 * Transform Package - Main Transform Function
 *
 * Orchestrates the transformation of TypeScript source with AOT artifacts.
 */

import ts from "typescript";
import type { AotCodeResult } from "@aurelia-ls/compiler/synthesis/aot/types.js";
import { debug } from "@aurelia-ls/compiler/shared/debug.js";
import { NOOP_TRACE } from "@aurelia-ls/compiler/shared/trace.js";
import type { ResourceDefinition } from "../model/types.js";
import { emitStaticAu } from "../emit/index.js";
import { findClassByName, detectDeclarationForm } from "../ts/analyze.js";
import { applyEdits, validateEdits } from "../ts/edit.js";
import { generateInjectionEdits, generateImportCleanupEdits } from "../ts/inject.js";
import { extractDependencies, extractBindables } from "../ts/extract.js";
import type {
  TransformOptions,
  TransformResult,
  TransformWarning,
  TransformMeta,
  TemplateImport,
} from "./types.js";
import { TransformError, TransformErrorCode } from "./types.js";
import { insert } from "../ts/edit.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

/**
 * Transform a TypeScript source file to include AOT artifacts.
 *
 * @example
 * ```typescript
 * const result = transform({
 *   source: originalCode,
 *   filePath: "src/my-app.ts",
 *   aot: aotResult,
 *   resource: { kind: "custom-element", name: "my-app", className: "MyApp", ... },
 * });
 *
 * // result.code contains the transformed source with injected $au
 * ```
 */
export function transform(options: TransformOptions): TransformResult {
  const {
    source,
    filePath,
    aot,
    resource,
    template,
    nestedHtmlTree = [],
    templateImports = [],
    indent = "  ",
    removeDecorators = true,
    includeComments = true,
    trace: optTrace,
  } = options;

  const trace = optTrace ?? NOOP_TRACE;

  return trace.span("transform", () => {
    trace.setAttributes({
      "transform.filePath": filePath,
      "transform.className": resource.className,
      "transform.resourceName": resource.name,
      "transform.resourceKind": resource.kind,
      "transform.sourceLength": source.length,
    });

    debug.transform("start", {
      filePath,
      className: resource.className,
      resourceName: resource.name,
      resourceKind: resource.kind,
    });

    const warnings: TransformWarning[] = [];

    // Find the class to transform
    trace.event("transform.findClass");
    const classInfo = findClassByName(source, resource.className);
    if (!classInfo) {
      debug.transform("class.notFound", { className: resource.className });
      throw new TransformError(
        `Class "${resource.className}" not found in source`,
        TransformErrorCode.CLASS_NOT_FOUND,
        filePath
      );
    }

    debug.transform("class.found", {
      className: resource.className,
      hasDecorator: classInfo.decorators.length > 0,
    });

    // Detect original declaration form
    const declForm = detectDeclarationForm(classInfo, resource.className);
    const originalForm = declForm.form;
    trace.setAttribute("transform.originalForm", originalForm);

    // Determine resource type for emit
    const resourceType = getResourceType(resource);

    // Extract dependencies from decorator config
    trace.event("transform.extractDeps");
    const extractedDeps = extractDependencies(source, classInfo);
    const decoratorDependencies = extractedDeps.map(dep => {
      if (dep.type === "identifier") {
        return dep.name;
      } else {
        // Dynamic expressions are emitted as-is
        return dep.expression;
      }
    });

    // Process template imports
    trace.event("transform.processTemplateImports");
    const templateImportResult = processTemplateImports(templateImports, resource.className);

    // Merge dependencies: decorator deps first, then template import deps
    const dependencies = [...decoratorDependencies, ...templateImportResult.dependencyEntries];

    // Extract bindables from @bindable property decorators
    const bindables = extractBindables(source, classInfo);
    trace.setAttributes({
      "transform.dependencyCount": dependencies.length,
      "transform.templateImportCount": templateImports.length,
      "transform.bindableCount": bindables.length,
    });

    debug.transform("extracted", {
      dependencies: dependencies.length,
      templateImports: templateImports.length,
      bindables: bindables.length,
    });

    // Emit the AOT artifacts
    trace.event("transform.emit");
    const emitResult = emitStaticAu(aot, {
      name: resource.name,
      className: resource.className,
      type: resourceType as "custom-element" | "custom-attribute",
      template,
      nestedHtmlTree,
      dependencies,
      bindables,
      indent,
      includeComments,
    });

    // Generate injection edits
    trace.event("transform.generateEdits");
    const injectionResult = generateInjectionEdits(source, classInfo, {
      className: resource.className,
      artifactCode: emitResult.combined,
      definitionVar: emitResult.definitionVar,
      removeDecorator: removeDecorators,
      removeBindableDecorators: removeDecorators,
    });

    // Add injection warnings
    for (const warning of injectionResult.warnings) {
      warnings.push({
        code: "TRANSFORM_INFO",
        message: warning,
        file: filePath,
      });
    }

    // Build list of import specifiers to remove based on what decorators were removed
    const unusedImports: string[] = [];

    // Check if a class decorator was removed (e.g., @customElement)
    const removedDecoratorWarning = injectionResult.warnings.find(w =>
      w.includes("Removed @") && w.includes("decorator")
    );
    if (removedDecoratorWarning) {
      // Extract decorator name from warning message
      const match = removedDecoratorWarning.match(/Removed @(\w+)/);
      if (match?.[1]) {
        unusedImports.push(match[1]);
      }
    }

    // Check if @bindable decorators were removed
    const bindableRemovalWarning = injectionResult.warnings.find(w =>
      w.includes("@bindable decorator")
    );
    if (bindableRemovalWarning) {
      unusedImports.push("bindable");

      // If any bindables used BindingMode, that import is also now unused
      const usedBindingMode = bindables.some(b => b.mode !== undefined);
      if (usedBindingMode) {
        unusedImports.push("BindingMode");
      }
    }

    // Generate import cleanup edits
    trace.event("transform.cleanupImports");
    const importCleanupResult = generateImportCleanupEdits(source, unusedImports);

    // Generate template import statement edits
    const templateImportEdits = generateTemplateImportEdits(source, templateImportResult);

    // Add template import warnings
    if (templateImportResult.importStatements.length > 0) {
      warnings.push({
        code: "TRANSFORM_INFO",
        message: `Added ${templateImportResult.importStatements.length} template import(s)`,
        file: filePath,
      });
    }

    // Combine all edits
    const allEdits = [...templateImportEdits, ...injectionResult.edits, ...importCleanupResult.edits];

    // Add import cleanup warnings
    if (importCleanupResult.removedSpecifiers.length > 0) {
      warnings.push({
        code: "TRANSFORM_INFO",
        message: `Removed unused imports: ${importCleanupResult.removedSpecifiers.join(", ")}`,
        file: filePath,
      });
    }

    // Validate edits don't conflict
    if (!validateEdits(allEdits)) {
      throw new TransformError(
        "Generated edits have overlapping spans",
        TransformErrorCode.EDIT_CONFLICT,
        filePath
      );
    }

    // Apply edits to source
    trace.event("transform.applyEdits");
    const transformedCode = applyEdits(source, allEdits);

    // Build metadata
    const meta: TransformMeta = {
      className: resource.className,
      resourceName: resource.name,
      resourceType,
      prefix: emitResult.prefix,
      expressionTableVar: emitResult.expressionTableVar,
      definitionVar: emitResult.definitionVar,
      expressionCount: aot.expressions.length,
      instructionRowCount: aot.definition.instructions.length,
      originalForm,
    };

    trace.setAttributes({
      "transform.editCount": allEdits.length,
      "transform.warningCount": warnings.length,
      "transform.outputLength": transformedCode.length,
    });

    debug.transform("complete", {
      editCount: allEdits.length,
      warningCount: warnings.length,
      outputLength: transformedCode.length,
    });

    // Build result
    const result: TransformResult = {
      code: transformedCode,
      edits: allEdits,
      warnings,
      meta,
    };

    // TODO: Add source map generation when sourceMap option is enabled
    if (options.sourceMap) {
      warnings.push({
        code: "TRANSFORM_SOURCEMAP_NOT_IMPLEMENTED",
        message: "Source map generation is not yet implemented",
        file: filePath,
      });
    }

    return result;
  });
}

/* =============================================================================
 * HELPERS
 * ============================================================================= */

function getResourceType(resource: ResourceDefinition): TransformMeta["resourceType"] {
  switch (resource.kind) {
    case "custom-element":
      return "custom-element";
    case "custom-attribute":
    case "template-controller":
      return "custom-attribute";
    case "value-converter":
      return "value-converter";
    case "binding-behavior":
      return "binding-behavior";
  }
}

/* =============================================================================
 * TEMPLATE IMPORT PROCESSING
 * ============================================================================= */

/**
 * Result of processing template imports.
 */
interface TemplateImportProcessResult {
  /** Generated import statements to add at top of file */
  importStatements: string[];

  /**
   * Dependency entries to add to dependencies array.
   * Each entry is a string expression (e.g., "__dep0" or "aliasedResourcesRegistry(__dep0, 'bar')").
   */
  dependencyEntries: string[];

  /** Whether aliasedResourcesRegistry is needed */
  needsAliasedRegistry: boolean;
}

/**
 * Process template imports to generate import statements and dependency entries.
 *
 * For each template import:
 * - Generates `import * as __dep{n} from './path'`
 * - Generates dependency entry based on aliases:
 *   - No alias: `__dep{n}` (all exports)
 *   - Default alias: `aliasedResourcesRegistry(__dep{n}, 'alias')`
 *   - Named aliases: `aliasedResourcesRegistry(__dep{n}.Export, 'alias')`
 *
 * @param templateImports - Template imports from HTML template
 * @param prefix - Prefix for variable names (usually class name in camelCase)
 */
function processTemplateImports(
  templateImports: TemplateImport[],
  prefix: string
): TemplateImportProcessResult {
  const importStatements: string[] = [];
  const dependencyEntries: string[] = [];
  let needsAliasedRegistry = false;

  // Use a short prefix for dependency variables
  const depPrefix = `__${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}_dep`;

  for (let i = 0; i < templateImports.length; i++) {
    const imp = templateImports[i]!;
    const depVar = `${depPrefix}${i}`;

    // Generate import statement
    const moduleSpec = imp.moduleSpecifier;
    importStatements.push(`import * as ${depVar} from "${moduleSpec}";`);

    // Generate dependency entries based on aliases
    const hasDefaultAlias = imp.defaultAlias != null && imp.defaultAlias.length > 0;
    const hasNamedAliases = imp.namedAliases != null && imp.namedAliases.length > 0;

    if (!hasDefaultAlias && !hasNamedAliases) {
      // Simple import: all exports from module
      dependencyEntries.push(depVar);
    } else if (hasDefaultAlias && hasNamedAliases) {
      // Both default and named aliases:
      // - Register module with default alias for first resource
      // - Also register specific named exports with their aliases
      needsAliasedRegistry = true;
      dependencyEntries.push(`aliasedResourcesRegistry(${depVar}, "${imp.defaultAlias}")`);
      for (const alias of imp.namedAliases!) {
        dependencyEntries.push(
          `aliasedResourcesRegistry(${depVar}.${alias.exportName}, "${alias.alias}")`
        );
      }
    } else if (hasDefaultAlias) {
      // Default alias only: rename the first resource
      needsAliasedRegistry = true;
      dependencyEntries.push(`aliasedResourcesRegistry(${depVar}, "${imp.defaultAlias}")`);
    } else if (hasNamedAliases) {
      // Named aliases only: rename specific exports
      needsAliasedRegistry = true;
      for (const alias of imp.namedAliases!) {
        dependencyEntries.push(
          `aliasedResourcesRegistry(${depVar}.${alias.exportName}, "${alias.alias}")`
        );
      }
    }
  }

  return { importStatements, dependencyEntries, needsAliasedRegistry };
}

/**
 * Generate edits to insert template import statements.
 *
 * Inserts import statements after:
 * 1. Shebang line (#!/usr/bin/env node)
 * 2. "use strict" directive
 * 3. Leading comment blocks (license headers)
 * 4. Existing import statements (to group with them)
 *
 * If aliasedResourcesRegistry is needed, also adds the import for it.
 */
function generateTemplateImportEdits(
  source: string,
  result: TemplateImportProcessResult
): ReturnType<typeof insert>[] {
  if (result.importStatements.length === 0) {
    return [];
  }

  const lines: string[] = [];

  // Add aliasedResourcesRegistry import if needed
  if (result.needsAliasedRegistry) {
    lines.push(`import { aliasedResourcesRegistry } from "@aurelia/kernel";`);
  }

  // Add all template import statements
  lines.push(...result.importStatements);

  // Find the correct insertion position
  const insertPos = findImportInsertPosition(source);

  // Add appropriate spacing based on insertion point
  let textToInsert: string;
  if (insertPos.afterImports) {
    // After existing imports: just add the new imports with trailing newline
    textToInsert = lines.join("\n") + "\n";
  } else if (insertPos.position === 0) {
    // Beginning of file: add imports with trailing blank line
    textToInsert = lines.join("\n") + "\n\n";
  } else {
    // After preamble (shebang, use strict, comments): add blank line before and after
    textToInsert = "\n" + lines.join("\n") + "\n";
  }

  return [insert(insertPos.position, textToInsert)];
}

/**
 * Find the correct position to insert new import statements.
 *
 * Returns position after:
 * 1. Shebang line (#!/...)
 * 2. "use strict" directive
 * 3. Leading comment blocks (license headers)
 * 4. Existing import statements
 */
function findImportInsertPosition(source: string): { position: number; afterImports: boolean } {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Find the last import declaration
  let lastImportEnd = -1;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      lastImportEnd = statement.getEnd();
    } else if (lastImportEnd >= 0) {
      // Found a non-import after imports, stop here
      break;
    }
  }

  // If we found existing imports, insert after the last one
  if (lastImportEnd >= 0) {
    // Skip past any trailing whitespace on the same line, then position after the newline
    let pos = lastImportEnd;
    while (pos < source.length && source[pos] !== "\n" && /\s/.test(source[pos]!)) {
      pos++;
    }
    if (pos < source.length && source[pos] === "\n") {
      pos++;
    }
    return { position: pos, afterImports: true };
  }

  // No existing imports - find position after preamble
  let position = 0;

  // Skip shebang if present
  if (source.startsWith("#!")) {
    const newlineIndex = source.indexOf("\n");
    if (newlineIndex >= 0) {
      position = newlineIndex + 1;
    }
  }

  // Check for leading comments and "use strict"
  const statements = sourceFile.statements;
  if (statements.length > 0) {
    const firstStatement = statements[0]!;

    // Check for "use strict" directive
    if (
      ts.isExpressionStatement(firstStatement) &&
      ts.isStringLiteral(firstStatement.expression) &&
      firstStatement.expression.text === "use strict"
    ) {
      // Position after "use strict"
      let pos = firstStatement.getEnd();
      while (pos < source.length && source[pos] !== "\n" && /\s/.test(source[pos]!)) {
        pos++;
      }
      if (pos < source.length && source[pos] === "\n") {
        pos++;
      }
      position = pos;
    } else {
      // No "use strict", check for leading comments before first statement
      const leadingComments = ts.getLeadingCommentRanges(source, position);
      if (leadingComments && leadingComments.length > 0) {
        // Skip all leading comment blocks (license headers, etc.)
        const lastComment = leadingComments[leadingComments.length - 1]!;
        let pos = lastComment.end;
        // Skip past trailing whitespace and newline
        while (pos < source.length && source[pos] !== "\n" && /\s/.test(source[pos]!)) {
          pos++;
        }
        if (pos < source.length && source[pos] === "\n") {
          pos++;
        }
        position = pos;
      }
    }
  }

  return { position, afterImports: false };
}
