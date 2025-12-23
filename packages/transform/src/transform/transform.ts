/**
 * Transform Package - Main Transform Function
 *
 * Orchestrates the transformation of TypeScript source with AOT artifacts.
 */

import type { AotCodeResult } from "@aurelia-ls/domain";
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
} from "./types.js";
import { TransformError, TransformErrorCode } from "./types.js";

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
    indent = "  ",
    removeDecorators = true,
    includeComments = true,
  } = options;

  const warnings: TransformWarning[] = [];

  // Find the class to transform
  const classInfo = findClassByName(source, resource.className);
  if (!classInfo) {
    throw new TransformError(
      `Class "${resource.className}" not found in source`,
      TransformErrorCode.CLASS_NOT_FOUND,
      filePath
    );
  }

  // Detect original declaration form
  const declForm = detectDeclarationForm(classInfo, resource.className);
  const originalForm = declForm.form;

  // Determine resource type for emit
  const resourceType = getResourceType(resource);

  // Extract dependencies from decorator config
  const extractedDeps = extractDependencies(source, classInfo);
  const dependencies = extractedDeps.map(dep => {
    if (dep.type === "identifier") {
      return dep.name;
    } else {
      // Dynamic expressions are emitted as-is
      return dep.expression;
    }
  });

  // Extract bindables from @bindable property decorators
  const bindables = extractBindables(source, classInfo);

  // Emit the AOT artifacts
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
  const importCleanupResult = generateImportCleanupEdits(source, unusedImports);

  // Combine all edits
  const allEdits = [...injectionResult.edits, ...importCleanupResult.edits];

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
