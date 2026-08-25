import type { ExpressionAstNode } from '../expression/ast.js';
import type {
  AddressHandle,
  HotDetailHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  RuntimeExpressionAccessForm,
} from './runtime-expression-access-use.js';

/**
 * One authored access token owned by a template expression parse.
 *
 * Runtime phase, tracking, reachability, scope interpretation, and target closure belong to later resolution/use
 * layers. Keeping this row syntax-only lets IDE consumers retain authored occurrences that Aurelia never evaluates.
 */
export class TemplateExpressionAccessOccurrence {
  constructor(
    /** Store-local handle for this parse-owned hot detail. */
    readonly detailHandle: HotDetailHandle,
    /** Canonical parser product whose AST owns the occurrence. */
    readonly expressionProductHandle: ProductHandle,
    /** Exact canonical AST node for context-specific target resolution. */
    readonly expression: ExpressionAstNode,
    /** Authored access syntax form. */
    readonly accessForm: RuntimeExpressionAccessForm,
    /** Exact authored access expression span. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Exact authored member/name token span. */
    readonly nameSourceAddressHandle: AddressHandle | null,
  ) {}
}
