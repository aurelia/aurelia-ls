/**
 * ES2022 Decorator Extraction
 *
 * Parses compiled JavaScript that uses ES2022 decorator patterns to extract
 * Aurelia resource definitions. This handles packages that don't publish
 * TypeScript source but have decorator metadata preserved in compiled output.
 *
 * ES2022 decorator pattern (TypeScript output):
 * ```javascript
 * _dec = customAttribute('tooltip');
 * _dec2 = bindable({ primary: true });
 *
 * __esDecorate(null, _classDescriptor, [_dec], {
 *   kind: "class",
 *   name: "TooltipCustomAttribute",
 *   ...
 * }, null, _classExtraInitializers);
 * ```
 */

import * as ts from 'typescript';
import type { NormalizedPath, ResourceKind } from '../compiler.js';
import { buildBindableDefs, buildBindingBehaviorDef, buildCustomAttributeDef, buildCustomElementDef, buildTemplateControllerDef, buildValueConverterDef, type BindableInput } from '../25-semantics/resource-def.js';
import type { AnalysisResult, AnalysisGap } from './types.js';
import { highConfidence, partial } from './types.js';
import type { AnalyzedResource } from './types.js';
import { explicitEvidence } from './evidence.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A decorator call found in the compiled output.
 */
interface DecoratorCall {
  /** The variable name it's assigned to (e.g., '_dec', '_dec2') */
  variableName: string;
  /** The decorator function name (e.g., 'customAttribute', 'bindable') */
  decoratorName: string;
  /** Arguments passed to the decorator */
  args: DecoratorArg[];
}

type DecoratorArg =
  | { kind: 'string'; value: string }
  | { kind: 'object'; properties: Map<string, unknown> }
  | { kind: 'unknown'; text: string };

/**
 * An __esDecorate call's metadata.
 */
interface EsDecorateCall {
  /** 'class' or 'field' */
  kind: 'class' | 'field' | 'method' | 'accessor' | 'unknown';
  /** Target name (class name or field name) */
  name: string;
  /** Variable names of decorators applied (e.g., ['_dec']) */
  decoratorVars: string[];
  /** The class name from the enclosing static block (for field-to-class association) */
  enclosingClass: string | null;
}

/**
 * Intermediate representation of an extracted class.
 */
interface ExtractedClass {
  className: string;
  classDecorators: DecoratorCall[];
  fields: Map<string, DecoratorCall[]>;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Extract Aurelia resources from ES2022 compiled JavaScript.
 *
 * @param sourceText - The JavaScript source code
 * @param fileName - File name for error reporting
 * @returns Analysis result with extracted resources
 */
export function extractFromES2022(
  sourceText: string,
  fileName: string
): AnalysisResult<AnalyzedResource[]> {
  // Parse as JavaScript
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const gaps: AnalysisGap[] = [];
  const resources: AnalyzedResource[] = [];

  // Step 1: Find all decorator variable assignments (_dec = customAttribute('x'))
  const decoratorCalls = findDecoratorAssignments(sourceFile);

  // Step 2: Find all decorator array assignments (_init_content = [_dec2])
  const decoratorArrays = findDecoratorArrayAssignments(sourceFile);

  // Step 3: Find all __esDecorate calls
  const esDecorateCalls = findEsDecorateCalls(sourceFile);

  // Step 4: Group by class and build extracted classes
  const classes = buildExtractedClasses(esDecorateCalls, decoratorCalls, decoratorArrays);

  // Step 5: Convert to AnalyzedResource for each class that's an Aurelia resource
  for (const cls of classes.values()) {
    const resource = buildResource(cls, fileName, gaps);
    if (resource) {
      resources.push(resource);
    }
  }

  if (gaps.length > 0) {
    return partial(resources, 'high', gaps);
  }

  return highConfidence(resources);
}

// =============================================================================
// AST Walking
// =============================================================================

/**
 * Find decorator variable assignments like `_dec = customAttribute('tooltip')`.
 */
function findDecoratorAssignments(sourceFile: ts.SourceFile): Map<string, DecoratorCall> {
  const result = new Map<string, DecoratorCall>();

  function visit(node: ts.Node): void {
    // Look for: _dec = customAttribute('tooltip')
    // This can be either a BinaryExpression or VariableDeclaration
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      const right = node.right;

      if (ts.isIdentifier(left) && ts.isCallExpression(right)) {
        const varName = left.text;
        const decoratorCall = parseDecoratorCall(varName, right);
        if (decoratorCall && isAureliaDecorator(decoratorCall.decoratorName)) {
          result.set(varName, decoratorCall);
        }
      }
    }

    // Also check variable declarations: var _dec = customAttribute('tooltip')
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name) && ts.isCallExpression(node.initializer)) {
        const varName = node.name.text;
        const decoratorCall = parseDecoratorCall(varName, node.initializer);
        if (decoratorCall && isAureliaDecorator(decoratorCall.decoratorName)) {
          result.set(varName, decoratorCall);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Find decorator array assignments like `_init_content = [_dec2]`.
 */
function findDecoratorArrayAssignments(sourceFile: ts.SourceFile): Map<string, string[]> {
  const result = new Map<string, string[]>();

  function visit(node: ts.Node): void {
    // Look for: _init_content = [_dec2]
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      const right = node.right;

      if (ts.isIdentifier(left) && ts.isArrayLiteralExpression(right)) {
        const varName = left.text;
        const elements: string[] = [];

        for (const elem of right.elements) {
          if (ts.isIdentifier(elem)) {
            elements.push(elem.text);
          }
        }

        if (elements.length > 0) {
          result.set(varName, elements);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Find __esDecorate calls and extract metadata.
 * Tracks the enclosing class for proper field-to-class association.
 */
function findEsDecorateCalls(sourceFile: ts.SourceFile): EsDecorateCall[] {
  const result: EsDecorateCall[] = [];

  function visit(node: ts.Node, enclosingClass: string | null): void {
    // Track when we enter a class declaration
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      // Visit children with this class as the enclosing context
      ts.forEachChild(node, child => visit(child, className));
      return;
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;

      // Check for __esDecorate(...)
      if (ts.isIdentifier(callee) && callee.text === '__esDecorate') {
        const call = parseEsDecorateCall(node, enclosingClass);
        if (call) {
          result.push(call);
        }
      }
    }

    ts.forEachChild(node, child => visit(child, enclosingClass));
  }

  visit(sourceFile, null);
  return result;
}

// =============================================================================
// Parsing Helpers
// =============================================================================

/**
 * Parse a decorator call expression.
 */
function parseDecoratorCall(varName: string, call: ts.CallExpression): DecoratorCall | null {
  const callee = call.expression;

  // Get decorator name - handle both direct calls and property access
  let decoratorName: string;
  if (ts.isIdentifier(callee)) {
    decoratorName = callee.text;
  } else if (ts.isPropertyAccessExpression(callee)) {
    // e.g., aurelia.customAttribute
    decoratorName = callee.name.text;
  } else {
    return null;
  }

  // Parse arguments
  const args: DecoratorArg[] = [];
  for (const arg of call.arguments) {
    args.push(parseDecoratorArg(arg));
  }

  return { variableName: varName, decoratorName, args };
}

/**
 * Parse a decorator argument.
 */
function parseDecoratorArg(node: ts.Expression): DecoratorArg {
  if (ts.isStringLiteral(node)) {
    return { kind: 'string', value: node.text };
  }

  if (ts.isObjectLiteralExpression(node)) {
    const properties = new Map<string, unknown>();

    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const key = prop.name.text;
        const value = extractLiteralValue(prop.initializer);
        properties.set(key, value);
      }
    }

    return { kind: 'object', properties };
  }

  return { kind: 'unknown', text: node.getText() };
}

/**
 * Extract a literal value from an expression.
 */
function extractLiteralValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  // For complex expressions (like BindingMode.twoWay), return the text
  return node.getText();
}

/**
 * Parse an __esDecorate call to extract metadata.
 *
 * __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers)
 *
 * We care about:
 * - decorators (arg 2, 0-indexed) - array of decorator variables
 * - contextIn (arg 3) - object with { kind, name, ... }
 *
 * @param enclosingClass - The class name from the enclosing static block
 */
function parseEsDecorateCall(call: ts.CallExpression, enclosingClass: string | null): EsDecorateCall | null {
  const args = call.arguments;
  if (args.length < 4) {
    return null;
  }

  // Get decorator array (3rd argument, index 2)
  const decoratorsArg = args[2];
  const decoratorVars: string[] = [];

  if (decoratorsArg) {
    if (ts.isArrayLiteralExpression(decoratorsArg)) {
      // Direct array: [_dec]
      for (const elem of decoratorsArg.elements) {
        if (ts.isIdentifier(elem)) {
          decoratorVars.push(elem.text);
        }
      }
    } else if (ts.isIdentifier(decoratorsArg)) {
      // Variable reference: _init_content
      decoratorVars.push(decoratorsArg.text);
    }
  }

  // Get context object (4th argument, index 3)
  const contextArg = args[3];
  if (!contextArg || !ts.isObjectLiteralExpression(contextArg)) {
    return null;
  }

  let kind: EsDecorateCall['kind'] = 'unknown';
  let name = '';

  for (const prop of contextArg.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      const key = prop.name.text;

      if (key === 'kind' && ts.isStringLiteral(prop.initializer)) {
        const kindValue = prop.initializer.text;
        if (kindValue === 'class' || kindValue === 'field' || kindValue === 'method' || kindValue === 'accessor') {
          kind = kindValue;
        }
      }

      if (key === 'name' && ts.isStringLiteral(prop.initializer)) {
        name = prop.initializer.text;
      }
    }
  }

  if (!name) {
    return null;
  }

  return { kind, decoratorVars, name, enclosingClass };
}

// =============================================================================
// Resource Building
// =============================================================================

/**
 * Build extracted classes from __esDecorate calls.
 *
 * Uses the enclosingClass field (derived from static block context) to properly
 * associate field decorators with their owning class.
 */
function buildExtractedClasses(
  esDecorateCalls: EsDecorateCall[],
  decoratorCalls: Map<string, DecoratorCall>,
  decoratorArrays: Map<string, string[]>
): Map<string, ExtractedClass> {
  const classes = new Map<string, ExtractedClass>();

  /**
   * Helper to get or create a class entry.
   */
  function getOrCreateClass(className: string): ExtractedClass {
    let cls = classes.get(className);
    if (!cls) {
      cls = { className, classDecorators: [], fields: new Map() };
      classes.set(className, cls);
    }
    return cls;
  }

  /**
   * Helper to resolve decorator variables through arrays if needed.
   */
  function resolveDecorators(varNames: string[]): DecoratorCall[] {
    const result: DecoratorCall[] = [];
    for (const varName of varNames) {
      // Check if it's a direct decorator reference
      const directDecorator = decoratorCalls.get(varName);
      if (directDecorator) {
        result.push(directDecorator);
        continue;
      }

      // Check if it's an array reference (_init_content -> [_dec2])
      const arrayVars = decoratorArrays.get(varName);
      if (arrayVars) {
        for (const arrayVar of arrayVars) {
          const decorator = decoratorCalls.get(arrayVar);
          if (decorator) {
            result.push(decorator);
          }
        }
      }
    }
    return result;
  }

  // Process all __esDecorate calls
  for (const call of esDecorateCalls) {
    if (call.kind === 'class') {
      // Class decorator: the call.name is the class name
      const cls = getOrCreateClass(call.name);
      const decorators = resolveDecorators(call.decoratorVars);
      cls.classDecorators.push(...decorators);
    } else if (call.kind === 'field') {
      // Field decorator: use enclosingClass to associate with correct class
      // The enclosingClass comes from the static block context
      const className = call.enclosingClass;
      if (className) {
        const cls = getOrCreateClass(className);
        const decorators = resolveDecorators(call.decoratorVars);
        cls.fields.set(call.name, decorators);
      }
      // If no enclosingClass, the field is orphaned (shouldn't happen with proper ES2022 output)
    }
  }

  return classes;
}

/**
 * Build an AnalyzedResource from an extracted class.
 */
function buildResource(
  cls: ExtractedClass,
  fileName: string,
  _gaps: AnalysisGap[]
): AnalyzedResource | null {
  // Find the resource type decorator
  const resourceDecorator = cls.classDecorators.find(d =>
    isResourceTypeDecorator(d.decoratorName)
  );

  if (!resourceDecorator) {
    return null;
  }

  // Determine resource kind and name
  const kind = getResourceKind(resourceDecorator.decoratorName);
  if (!kind) {
    return null;
  }

  // Get resource name from decorator argument
  let resourceName: string;
  if (resourceDecorator.args.length > 0 && resourceDecorator.args[0]?.kind === 'string') {
    resourceName = resourceDecorator.args[0].value;
  } else if (resourceDecorator.args.length > 0 && resourceDecorator.args[0]?.kind === 'object') {
    // Object argument like @customElement({ name: 'foo' })
    const nameValue = resourceDecorator.args[0].properties.get('name');
    if (typeof nameValue === 'string') {
      resourceName = nameValue;
    } else {
      // Fall back to class name conversion
      resourceName = classNameToResourceName(cls.className, kind);
    }
  } else {
    // No argument - infer from class name
    resourceName = classNameToResourceName(cls.className, kind);
  }

  // Extract bindables from field decorators
  const bindables: BindableInput[] = [];
  for (const [fieldName, decorators] of cls.fields) {
    for (const decorator of decorators) {
      if (decorator.decoratorName === 'bindable') {
        const bindable = extractBindable(fieldName, decorator);
        bindables.push(bindable);
      }
    }
  }

  const file = fileName as NormalizedPath;
  const bindableInputs = bindables;
  const bindableDefs = buildBindableDefs(bindableInputs, file);
  const primaryBindable = findPrimaryBindableName(bindableInputs);
  const isTemplateController = resourceDecorator.decoratorName === 'templateController';

  let resource = null;
  switch (kind) {
    case 'custom-element':
      resource = buildCustomElementDef({
        name: resourceName,
        className: cls.className,
        file,
        bindables: bindableDefs,
        boundary: true,
      });
      break;
    case 'custom-attribute':
      if (isTemplateController) {
        resource = buildTemplateControllerDef({
          name: resourceName,
          className: cls.className,
          file,
          bindables: bindableDefs,
          noMultiBindings: false,
        });
      } else {
        resource = buildCustomAttributeDef({
          name: resourceName,
          className: cls.className,
          file,
          bindables: bindableDefs,
          primary: primaryBindable,
          noMultiBindings: false,
        });
      }
      break;
    case 'value-converter':
      resource = buildValueConverterDef({
        name: resourceName,
        className: cls.className,
        file,
      });
      break;
    case 'binding-behavior':
      resource = buildBindingBehaviorDef({
        name: resourceName,
        className: cls.className,
        file,
      });
      break;
  }

  if (!resource) {
    return null;
  }

  return {
    resource,
    evidence: explicitEvidence('decorator'),
  };
}

/**
 * Extract bindable info from a @bindable decorator.
 */
function extractBindable(
  fieldName: string,
  decorator: DecoratorCall
): BindableInput {
  let primary: boolean | undefined;
  let attribute: string | undefined;
  let mode: BindableInput["mode"];

  // Check for options object
  if (decorator.args.length > 0 && decorator.args[0]?.kind === 'object') {
    const props = decorator.args[0].properties;

    // Primary flag
    const primaryValue = props.get('primary');
    if (primaryValue === true) {
      primary = true;
    }

    // Attribute name
    const attributeValue = props.get('attribute');
    if (typeof attributeValue === 'string') {
      attribute = attributeValue;
    }

    // Binding mode
    const modeValue = props.get('mode');
    if (modeValue !== undefined) {
      let bindingMode: 'oneTime' | 'toView' | 'fromView' | 'twoWay' | undefined;
      if (typeof modeValue === 'string') {
        if (modeValue.includes('twoWay') || modeValue === '6') {
          bindingMode = 'twoWay';
        } else if (modeValue.includes('oneTime') || modeValue === '1') {
          bindingMode = 'oneTime';
        } else if (modeValue.includes('toView') || modeValue === '2') {
          bindingMode = 'toView';
        } else if (modeValue.includes('fromView') || modeValue === '4') {
          bindingMode = 'fromView';
        }
      } else if (typeof modeValue === 'number') {
        switch (modeValue) {
          case 1: bindingMode = 'oneTime'; break;
          case 2: bindingMode = 'toView'; break;
          case 4: bindingMode = 'fromView'; break;
          case 6: bindingMode = 'twoWay'; break;
        }
      }
      if (bindingMode) {
        mode = bindingMode;
      }
    }
  }

  return {
    name: fieldName,
    ...(primary ? { primary } : {}),
    ...(attribute ? { attribute } : {}),
    ...(mode ? { mode } : {}),
  };
}

function findPrimaryBindableName(bindables: BindableInput[]): string | undefined {
  for (const bindable of bindables) {
    if (bindable.primary) {
      return bindable.name;
    }
  }
  return bindables.length === 1 ? bindables[0]?.name : undefined;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a decorator name is an Aurelia resource/bindable decorator.
 */
function isAureliaDecorator(name: string): boolean {
  return [
    'customElement',
    'customAttribute',
    'templateController',
    'valueConverter',
    'bindingBehavior',
    'bindable',
  ].includes(name);
}

/**
 * Check if a decorator defines the resource type.
 */
function isResourceTypeDecorator(name: string): boolean {
  return [
    'customElement',
    'customAttribute',
    'templateController',
    'valueConverter',
    'bindingBehavior',
  ].includes(name);
}

/**
 * Map decorator name to resource kind.
 */
function getResourceKind(decoratorName: string): ResourceKind | null {
  switch (decoratorName) {
    case 'customElement':
      return 'custom-element';
    case 'customAttribute':
    case 'templateController':
      return 'custom-attribute';
    case 'valueConverter':
      return 'value-converter';
    case 'bindingBehavior':
      return 'binding-behavior';
    default:
      return null;
  }
}

/**
 * Convert class name to resource name.
 */
function classNameToResourceName(className: string, kind: ResourceKind): string {
  // Strip suffix based on kind
  let baseName = className;

  if (kind === 'custom-element') {
    baseName = className.replace(/CustomElement$/, '').replace(/Element$/, '');
  } else if (kind === 'custom-attribute' || kind === 'template-controller') {
    baseName = className.replace(/CustomAttribute$/, '').replace(/Attribute$/, '');
  } else if (kind === 'value-converter') {
    baseName = className.replace(/ValueConverter$/, '');
  } else if (kind === 'binding-behavior') {
    baseName = className.replace(/BindingBehavior$/, '');
  }

  // Convert to kebab-case for elements/attributes, camelCase for VC/BB
  if (kind === 'custom-element' || kind === 'custom-attribute' || kind === 'template-controller') {
    return toKebabCase(baseName);
  } else {
    // camelCase - first letter lowercase
    return baseName.charAt(0).toLowerCase() + baseName.slice(1);
  }
}

/**
 * Convert PascalCase to kebab-case.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
