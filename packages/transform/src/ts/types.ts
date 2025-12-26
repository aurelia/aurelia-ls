/**
 * Transform Package - TypeScript AST Types
 *
 * Types for working with TypeScript source transformations.
 * Designed to work with or without the TypeScript compiler API.
 */

/* =============================================================================
 * SOURCE LOCATION
 * ============================================================================= */

/**
 * A position in source code.
 */
export interface Position {
  /** Line number (0-based) */
  line: number;

  /** Column/character offset (0-based) */
  character: number;
}

/**
 * A span in source code.
 */
export interface Span {
  /** Start offset in characters */
  start: number;

  /** End offset in characters (exclusive) */
  end: number;
}

/**
 * A range in source code with line/column info.
 */
export interface Range {
  start: Position;
  end: Position;
}

/* =============================================================================
 * CLASS ANALYSIS
 * ============================================================================= */

/**
 * Information about a class declaration.
 */
export interface ClassInfo {
  /** Class name */
  name: string;

  /** Position of class declaration start */
  start: number;

  /** Position of class declaration end */
  end: number;

  /** Position of the opening brace */
  bodyStart: number;

  /** Position of the closing brace */
  bodyEnd: number;

  /** Whether the class has an existing static $au */
  hasStaticAu: boolean;

  /** Span of existing static $au (for replacement) */
  existingAuSpan?: Span;

  /** Decorators applied to this class */
  decorators: DecoratorInfo[];

  /** Export modifiers */
  exportType: "none" | "named" | "default";
}

/**
 * Information about a decorator.
 */
export interface DecoratorInfo {
  /** Decorator name (e.g., "customElement") */
  name: string;

  /** Full decorator span including @ and arguments */
  span: Span;

  /** Whether this is a call expression (has parentheses) */
  isCall: boolean;

  /** Arguments if it's a call expression */
  arguments?: DecoratorArgument[];
}

/**
 * Decorator argument info.
 */
export interface DecoratorArgument {
  /** Argument type */
  type: "string" | "identifier" | "object" | "other";

  /** Span of the argument */
  span: Span;

  /** String value if type is "string" */
  stringValue?: string;

  /** Identifier name if type is "identifier" */
  identifierName?: string;
}

/* =============================================================================
 * TRANSFORMATION OPERATIONS
 * ============================================================================= */

/**
 * A text edit operation.
 */
export interface TextEdit {
  /** Span to replace */
  span: Span;

  /** New text to insert */
  newText: string;
}

/**
 * An insertion operation.
 */
export interface Insertion {
  /** Position to insert at */
  position: number;

  /** Text to insert */
  text: string;
}

/**
 * A deletion operation.
 */
export interface Deletion {
  /** Span to delete */
  span: Span;
}

/**
 * Combined edit that may include multiple operations.
 */
export type SourceEdit = TextEdit | Insertion | Deletion;

/**
 * Edit with type discriminator.
 */
export interface TypedTextEdit {
  type: "replace";
  span: Span;
  newText: string;
}

export interface TypedInsertion {
  type: "insert";
  position: number;
  text: string;
}

export interface TypedDeletion {
  type: "delete";
  span: Span;
}

export type TypedSourceEdit = TypedTextEdit | TypedInsertion | TypedDeletion;

/* =============================================================================
 * INJECTION STRATEGY
 * ============================================================================= */

/**
 * Strategy for injecting the $au definition.
 */
export type InjectionStrategy =
  | { type: "append-after-class"; classEnd: number }
  | { type: "replace-static-au"; span: Span }
  | { type: "replace-decorator"; decoratorSpan: Span; classBodyStart: number }
  | { type: "insert-before-class"; classStart: number };

/**
 * Result of analyzing where to inject $au.
 */
export interface InjectionPoint {
  /** The determined strategy */
  strategy: InjectionStrategy;

  /** Class info used for analysis */
  classInfo: ClassInfo;

  /** Decorator to remove (if replacing decorator form) */
  decoratorToRemove?: DecoratorInfo;
}

/* =============================================================================
 * DECLARATION FORMS
 * ============================================================================= */

/**
 * Detected declaration form of a class.
 */
export type DetectedDeclarationForm =
  | { form: "decorator"; decorator: DecoratorInfo }
  | { form: "decorator-config"; decorator: DecoratorInfo }
  | { form: "static-au"; span: Span }
  | { form: "convention" }
  | { form: "unknown" };
