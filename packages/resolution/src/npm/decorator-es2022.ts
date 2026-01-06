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
import type {
  AnalysisResult,
  AnalysisGap,
  ExtractedResource,
  ExtractedBindable,
  ResourceKind,
  ResourceSource,
} from './types.js';
import { highConfidence, partial, gap } from './types.js';

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
): AnalysisResult<ExtractedResource[]> {
  // Parse as JavaScript
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const gaps: AnalysisGap[] = [];
  const resources: ExtractedResource[] = [];

  // Step 1: Find all decorator variable assignments (_dec = customAttribute('x'))
  const decoratorCalls = findDecoratorAssignments(sourceFile);

  // Step 2: Find all decorator array assignments (_init_content = [_dec2])
  const decoratorArrays = findDecoratorArrayAssignments(sourceFile);

  // Step 3: Find all __esDecorate calls
  const esDecorateCalls = findEsDecorateCalls(sourceFile);

  // Step 4: Group by class and build extracted classes
  const classes = buildExtractedClasses(esDecorateCalls, decoratorCalls, decoratorArrays);

  // Step 5: Convert to ExtractedResource for each class that's an Aurelia resource
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
 */
function findEsDecorateCalls(sourceFile: ts.SourceFile): EsDecorateCall[] {
  const result: EsDecorateCall[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;

      // Check for __esDecorate(...)
      if (ts.isIdentifier(callee) && callee.text === '__esDecorate') {
        const call = parseEsDecorateCall(node);
        if (call) {
          result.push(call);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
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
 */
function parseEsDecorateCall(call: ts.CallExpression): EsDecorateCall | null {
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

  return { kind, decoratorVars, name };
}

// =============================================================================
// Resource Building
// =============================================================================

/**
 * Build extracted classes from __esDecorate calls.
 */
function buildExtractedClasses(
  esDecorateCalls: EsDecorateCall[],
  decoratorCalls: Map<string, DecoratorCall>,
  decoratorArrays: Map<string, string[]>
): Map<string, ExtractedClass> {
  const classes = new Map<string, ExtractedClass>();

  // Group by class - we identify class decorators by kind: "class"
  // and field decorators by kind: "field"
  for (const call of esDecorateCalls) {
    if (call.kind === 'class') {
      // This defines the class
      const className = call.name;
      let cls = classes.get(className);
      if (!cls) {
        cls = { className, classDecorators: [], fields: new Map() };
        classes.set(className, cls);
      }

      // Resolve decorators
      for (const varName of call.decoratorVars) {
        const decorator = decoratorCalls.get(varName);
        if (decorator) {
          cls.classDecorators.push(decorator);
        }
      }
    } else if (call.kind === 'field') {
      // This is a field decorator - we need to find which class it belongs to
      // In ES2022 output, field decorators appear before class decorator in static block
      // We'll associate with the most recently defined class or create placeholder
      const fieldName = call.name;

      // Resolve decorator variables through arrays if needed
      const resolvedDecorators: DecoratorCall[] = [];
      for (const varName of call.decoratorVars) {
        // Check if it's a direct decorator reference
        const directDecorator = decoratorCalls.get(varName);
        if (directDecorator) {
          resolvedDecorators.push(directDecorator);
          continue;
        }

        // Check if it's an array reference (_init_content -> [_dec2])
        const arrayVars = decoratorArrays.get(varName);
        if (arrayVars) {
          for (const arrayVar of arrayVars) {
            const decorator = decoratorCalls.get(arrayVar);
            if (decorator) {
              resolvedDecorators.push(decorator);
            }
          }
        }
      }

      // For now, store fields in a temporary holder - will associate later
      // Use a special key for orphaned fields
      let cls = classes.get('__pending__');
      if (!cls) {
        cls = { className: '__pending__', classDecorators: [], fields: new Map() };
        classes.set('__pending__', cls);
      }
      cls.fields.set(fieldName, resolvedDecorators);
    }
  }

  // Move pending fields to the actual class
  const pending = classes.get('__pending__');
  if (pending && pending.fields.size > 0) {
    // Find the actual class (the one with class decorators)
    for (const [name, cls] of classes) {
      if (name !== '__pending__' && cls.classDecorators.length > 0) {
        // Move fields to this class
        for (const [fieldName, decorators] of pending.fields) {
          cls.fields.set(fieldName, decorators);
        }
        break;
      }
    }
    classes.delete('__pending__');
  }

  return classes;
}

/**
 * Build an ExtractedResource from an extracted class.
 */
function buildResource(
  cls: ExtractedClass,
  fileName: string,
  gaps: AnalysisGap[]
): ExtractedResource | null {
  // Find the resource type decorator
  const resourceDecorator = cls.classDecorators.find(d =>
    isResourceTypeDecorator(d.decoratorName)
  );

  if (!resourceDecorator) {
    // No resource decorator found - not an Aurelia resource
    // Could try convention inference here, but that's separate
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
  const bindables: ExtractedBindable[] = [];
  for (const [fieldName, decorators] of cls.fields) {
    for (const decorator of decorators) {
      if (decorator.decoratorName === 'bindable') {
        const bindable = extractBindable(fieldName, decorator, gaps);
        bindables.push(bindable);
      }
    }
  }

  const source: ResourceSource = {
    file: fileName,
    format: 'javascript',
  };

  return {
    kind,
    name: resourceName,
    className: cls.className,
    bindables,
    aliases: [],
    source,
    evidence: { kind: 'decorator', decoratorName: resourceDecorator.decoratorName },
  };
}

/**
 * Extract bindable info from a @bindable decorator.
 */
function extractBindable(
  fieldName: string,
  decorator: DecoratorCall,
  _gaps: AnalysisGap[]
): ExtractedBindable {
  const bindable: ExtractedBindable = {
    name: fieldName,
    evidence: { kind: 'decorator', hasOptions: decorator.args.length > 0 },
  };

  // Check for options object
  if (decorator.args.length > 0 && decorator.args[0]?.kind === 'object') {
    const props = decorator.args[0].properties;

    // Primary flag
    const primary = props.get('primary');
    if (primary === true) {
      bindable.primary = true;
    }

    // Attribute name
    const attribute = props.get('attribute');
    if (typeof attribute === 'string') {
      bindable.attribute = attribute;
    }

    // Binding mode - this is tricky because it might be BindingMode.twoWay or a number
    const mode = props.get('mode');
    if (mode !== undefined) {
      // For now, store as string - could parse BindingMode enum values
      // BindingMode.twoWay = 6, oneTime = 1, toView = 2, fromView = 4
      if (typeof mode === 'string') {
        // Check for common patterns
        if (mode.includes('twoWay') || mode === '6') {
          bindable.mode = 'twoWay';
        } else if (mode.includes('oneTime') || mode === '1') {
          bindable.mode = 'oneTime';
        } else if (mode.includes('toView') || mode === '2') {
          bindable.mode = 'toView';
        } else if (mode.includes('fromView') || mode === '4') {
          bindable.mode = 'fromView';
        }
      } else if (typeof mode === 'number') {
        // Direct numeric value
        switch (mode) {
          case 1: bindable.mode = 'oneTime'; break;
          case 2: bindable.mode = 'toView'; break;
          case 4: bindable.mode = 'fromView'; break;
          case 6: bindable.mode = 'twoWay'; break;
        }
      }
    }
  }

  return bindable;
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
  } else if (kind === 'custom-attribute') {
    baseName = className.replace(/CustomAttribute$/, '').replace(/Attribute$/, '');
  } else if (kind === 'value-converter') {
    baseName = className.replace(/ValueConverter$/, '');
  } else if (kind === 'binding-behavior') {
    baseName = className.replace(/BindingBehavior$/, '');
  }

  // Convert to kebab-case for elements/attributes, camelCase for VC/BB
  if (kind === 'custom-element' || kind === 'custom-attribute') {
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
