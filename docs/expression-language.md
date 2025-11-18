# Aurelia Binding Expression Language — Reference (2025)

Aurelia’s binding expression language is a JS‑like, expression‑only language with a few template‑specific affordances (scope hops, value converters, binding behaviors). Parsing produces a stable Aurelia Binding AST used by the runtime and tooling; evaluation semantics mirror JavaScript where applicable.

This document defines the **runtime** semantics and AST shape. For tooling/LSP parsers:

* Behavior on **valid expressions** should follow this spec.
* Behavior on **invalid expressions** (error recovery, exact diagnostics) is allowed to differ; a simple “fail-fast” or `BadExpression` strategy is acceptable in v1.

Sections 1–5 and 9–11 describe the **surface syntax and AST** (normative for tools). Sections 6–8 describe **runtime evaluation and error reporting** and are informative for tooling: LSP parsers do not need to reproduce these behaviors exactly.

---

## 1. Goals and scope

* **Familiar surface**: operator semantics follow JavaScript.
* **Binding‑aware**: special scope tokens (`$this`, `$parent`, `this`), observation, converter/behavior tails.
* **Toolable**: deterministic lowering to the canonical AST used across runtime, AOT, and LSP.
* **Deliberate subset**: excludes features that complicate the model or collide with binding syntax (e.g., bitwise/shift operators, `delete`).

The language is **expression‑only** (no statements).

---

## 2. Lexical elements

### 2.1 Identifiers (exact runtime set)

The runtime scanner implements a **BMP‑only** (U+0000–U+FFFF) table derived from **ECMA‑262 IdentifierStart** plus ASCII `$` and `_`, and uses **DecimalNumber** digits for identifier continuation. For compactness and speed, the table is stored as compressed ranges and decompressed at startup.

**Name for this set (used in this spec):** **IdentifierStart_BMP**
**IdentifierPart_BMP** = **IdentifierStart_BMP ∪ DecimalNumber**

**IdentifierStart_BMP** (all code points below are **inclusive ranges**, BMP only):

```
U+0024                      // $
U+0041–U+005A               // A–Z
U+005F                      // _
U+0061–U+007A               // a–z
U+00AA                      // ª
U+00BA                      // º
U+00C0–U+00D6
U+00D8–U+00F6
U+00F8–U+02B8
U+02E0–U+02E4
U+1D00–U+1D25
U+1D2C–U+1D5C
U+1D62–U+1D65
U+1D6B–U+1D77
U+1D79–U+1DBE
U+1E00–U+1EFF
U+2071
U+207F
U+2090–U+209C
U+212A–U+212B
U+2132
U+214E
U+2160–U+2188               // Roman numerals
U+2C60–U+2C7F
U+A722–U+A787
U+A78B–U+A7AE
U+A7B0–U+A7B7
U+A7F7–U+A7FF
U+AB30–U+AB5A
U+AB5C–U+AB64
U+FB00–U+FB06               // Latin ligatures
U+FF21–U+FF3A               // Fullwidth A–Z
U+FF41–U+FF5A               // Fullwidth a–z
```

**IdentifierPart_BMP** additionally allows **DecimalNumber**:

```
U+0030–U+0039               // 0–9
```

> Notes:
>
> * This is BMP‑only for performance (the scanner arrays are sized `0xFFFF`). Astral plane ID_Start/ID_Continue are not recognized.
> * Combining marks, ZWNJ/ZWJ, etc., are **not** included; the continuation set is limited to **digits + IdentifierStart_BMP**.
> * After a dot `.` the parser accepts **IdentifierName** (thus keywords such as `in`/`instanceof` may appear as property names).

### 2.2 Specials and keywords

* **Aurelia specials**
  `$this` → current binding scope
  `$parent` → one‑level parent hop; can chain with dots: `$parent.$parent`
  `this` → **boundary** scope (component boundary)

* **Disallowed** at top level where bare identifiers are classified as globals: `import`.
  (Property access like `x.import` is fine; only the bare identifier `import` is rejected.)

### 2.3 Literals

Numbers (integer/float; a leading dot is allowed), strings (`'...'` / `"..."` with `\` escapes), booleans, `null`, `undefined`.
Template literals and tagged templates are supported; RegExp/BigInt literals are not.

---

## 3. Entry points (runtime mapping)

The runtime parser exposes a single `parseExpression(input: string, expressionType?: ExpressionType)` and the domain/lowerer wraps it as `IExpressionParser.parse`.

Tooling (LSP, AOT) should use the **public subset** of modes:

* `'IsProperty'`
* `'IsFunction'`
* `'IsIterator'`
* `'Interpolation'`
* `'IsCustom'`

The runtime also defines a couple of **internal** modes used only inside the parser (`'IsChainable'`, `'None'`); LSP code should not depend on these.

At runtime, the modes behave as follows:

| `ExpressionType`             | Purpose                                               | Grammar differences                                                                                                       | Used by (examples)                                                                                                  |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **`'IsProperty'`** (default) | General binding expression                            | Full core + tails; no special terminal                                                                                    | Property bindings, attribute `.bind`/`.to-view`/`:prop`, style/class/attr overrides, `ref` values, `<let foo.bind>` |
| **`'Interpolation'`**        | Parses `${...}` blocks inside text/attr interpolation | Consumes until `}`; inner expressions are parsed in **Interpolation** mode (full grammar; early `}` terminates)           | Text nodes; plain attributes with interpolation (no explicit binding command)                                       |
| **`'IsIterator'`**           | Parses the complete `repeat.for` header               | Special LHS lowering; requires `of` and then parses RHS in **`'IsChainable'`** mode                                       | `repeat.for="lhs of rhs; tail..."`                                                                                  |
| **`'IsChainable'`**          | Internal to `IsIterator` for RHS                      | Same grammar as `IsProperty`, but **returns early on the first `;`** and records its index as `semiIdx`                   | *Internal only*                                                                                                     |
| **`'IsFunction'`**           | Event/command handler expressions                     | Same grammar as `IsProperty` (no extra restrictions in the current runtime); used for diagnostics/policy by higher layers | `.trigger` / `.capture` / `@event`                                                                                  |
| **`'None'`**                 | Internal recursive parses                             | Same grammar as `IsProperty`; used by sub‑parsers (arguments, ternary arms, etc.)                                         | *Internal only*                                                                                                     |
| **`'IsCustom'`**             | Treat the entire input as a `CustomExpression`        | No parse; returns `CustomExpression(value=input)`                                                                         | Rare/advanced scenarios                                                                                             |

**Observed call sites (current code):**

* **Lowerer** (`packages/domain/.../lower.ts`):

  * text interpolation → `'Interpolation'`
  * property/attr/style/class/ref/let `.bind` values → `'IsProperty'`
  * events (`.trigger`/`.capture`/`@event`) → `'IsFunction'`
  * `repeat.for` header → `'IsIterator'` (RHS uses `'IsChainable'` internally)
* **TemplateCompiler**: mirrors the same choices (events via binding command builders; interpolation for plain attrs/text; bindables use interpolation or explicit command).

---

## 4. Grammar (informative)

The runtime implements a Pratt/precedence parser with a JS‑like core and **Aurelia tails** (pipes/behaviors) at the lowest precedence. The following EBNF reflects the **accepted surface**, not the internal precedence masks:

```ebnf
// Entry (per ExpressionType):
PropertyExpression     ::= CoreExpression Tails EOF
FunctionExpression     ::= CoreExpression Tails EOF
InterpolationBlock     ::= CoreExpression Tails "}"          // invoked inside ${...}
IteratorHeader         ::= LhsBinding "of" CoreExpression Tails [ ";" ... ] EOF

// --- Core (JS‑like; precedence encoded in Token masks) ---
CoreExpression         ::= AssignExpr

AssignExpr             ::= ConditionalExpr
                         | LeftHandSide AssignmentOperator AssignExpr

ConditionalExpr        ::= BinaryExpr [ "?" AssignExpr ":" AssignExpr ]

BinaryExpr             ::= ...                                // supports ??, ||, &&, ==, ===, !=, !==,
                                                               // <, <=, >, >=, instanceof, in, +, -, *, /, %, **

UnaryExpr              ::= PostfixExpr
                         | ("!" | "+" | "-" | "typeof" | "void" | "++" | "--") UnaryExpr

PostfixExpr            ::= LeftHandSide ( "++" | "--" )?

LeftHandSide           ::= NewExpr | MemberExpr

NewExpr                ::= "new" MemberExpr [ Arguments ]

MemberExpr             ::= PrimaryExpr MemberTail*
MemberTail             ::= "." IdentifierName
                         | "?." ( IdentifierName | Arguments | "[" AssignExpr "]" )
                         | "[" AssignExpr "]"
                         | Arguments
                         | TemplateLiteral

Arguments              ::= "(" [ AssignExpr ( "," AssignExpr )* ] ")"

TemplateLiteral        ::=  "`" TemplateChars? "`"
                         |  "`" ( TemplateChars? "${" AssignExpr "}" )+ TemplateChars? "`"

// Primary (with Aurelia specials)
PrimaryExpr            ::= Identifier
                         | "$this"
                         | "$parent" ( "." "$parent" )*
                         | "this"
                         | Literal
                         | ArrayLiteral
                         | ObjectLiteral
                         | "(" ArrowOrParenExpr ")"
                         | /* bare TemplateTail handled as TemplateExpression */

ArrowOrParenExpr       ::= ArrowParams "=>" AssignExpr
                         | AssignExpr                            // parenthesized expression

ArrowParams            ::= Identifier
                         | "(" [ Identifier ( "," Identifier )*
                              [ "," "..." Identifier ] | "..." Identifier ] ")"
// (no defaults, no destructuring, no block body)

// Array/Object (data‑only objects; no spreads/computed/methods/getters/setters)
ArrayLiteral           ::= "[" [ ( /* elision */ | AssignExpr ) ( "," ( /* elision */ | AssignExpr ) )* ] "]"
ObjectLiteral          ::= "{" [ ( Identifier [ ":" AssignExpr ]
                               | StringLiteral ":" AssignExpr
                               | NumericLiteral ":" AssignExpr ) ( "," ... )* ] "}"

// LHS binding (iterator header)
LhsBinding             ::= Identifier | ArrayBindingPattern | ObjectBindingPattern
ArrayBindingPattern    ::= "[" ( /* elisions allowed */ | Identifier | "," )* "]"
ObjectBindingPattern   ::= "{" ( Identifier | StringLiteral | NumericLiteral ) ( "," ... )* "}"

// Aurelia tails (lowest precedence, left‑associative)
Tails                  ::= ( "|" Identifier ( ":" AssignExpr )* )*
                           ( "&" Identifier ( ":" AssignExpr )* )*

AssignmentOperator     ::= "=" | "/=" | "*=" | "+=" | "-="
```

**Notable constraints (enforced by the runtime):**

* No bitwise/shift operators; no `delete`.
* Optional chaining **cannot** be followed by a tagged template (e.g., `a?.b\`...`` → error).
* Arrow functions: expression body only; params are identifiers with optional final `...rest`; **no defaults**, **no destructuring**.

---

## 5. Lowering (surface → canonical AST)

AST shapes are exactly those defined in `ast.ts`. Key lowering rules (mirroring the runtime):

### 5.1 Scope specials

* `$this` → `AccessThis(0)`
* `$parent.$parent...` → `AccessThis(n)` where `n` is the number of segments
* `this` → `AccessBoundary`

Member of `$this`/`$parent` is a **scope access**, not a member access:
`$this.foo` → `AccessScope("foo", 0)`, `$parent.bar` → `AccessScope("bar", 1)`.

After a dot, `$this`/`$parent` are treated as **identifier names**:
`$this.$parent` → `AccessScope("$parent", 0)`.

### 5.2 Globals

The parser classifies a **bare** identifier as:

* `AccessGlobal(name)` if `name` is in the allow‑list:

  ```
  Infinity, NaN, isFinite, isNaN, parseFloat, parseInt,
  decodeURI, decodeURIComponent, encodeURI, encodeURIComponent,
  Array, BigInt, Boolean, Date, Map, Number, Object, RegExp, Set, String,
  JSON, Math, Intl
  ```
* otherwise `AccessScope(name, ancestor)`.

> Classification is syntactic and governed by the `$accessGlobal` flag in the parser to avoid classifying names that appear in non‑top‑level positions.

### 5.3 Calls and members

* `name(args)` where `name` lowered to `AccessScope` → `CallScope(name, args, ancestor, optional=false)`.
* `obj.method(args)` → `CallMember(obj, "method", args, optionalMember=false, optionalCall=false)`.
* Optional variants:

  * `obj?.method(args)` → `CallMember(..., optionalMember=true, optionalCall=false)`
  * `obj.method?.(args)` → `CallMember(..., optionalMember=false, optionalCall=true)`
  * `obj?.method?.(args)` → `CallMember(..., true, true)`
  * `func?.(args)` → `CallFunction(func, args, optional=true)`
* `parseInt(x)` where `parseInt` classified as global → `CallGlobal("parseInt", [x])`.
* `new callee(...)` → `New(callee, args)` (args optional).

### 5.4 Binary/Unary/Conditional/Assign

All supported JS operators lower to `Unary`, `Binary`, `Conditional`, `Assign` as expected. Supported assignment ops: `=`, `+=`, `-=`, `*=`, `/=`. LHS may be `AccessScope`, `AccessMember`, `AccessKeyed`, or a nested `Assign` node.

### 5.5 Arrow functions

`id => expr`, `(a, ...rest) => expr` → `ArrowFunction(args[], body, rest?: boolean)`.
Expression body only; no defaults; no destructuring; no block body.

### 5.6 Templates

* `` `a${b}c` `` → `Template(["a","c"], [b])`
* `tag\`a${b}``→`TaggedTemplate(cooked, cooked, tag, [b])`with`cooked.raw = cooked`

### 5.7 Arrays & objects

Array elisions become `PrimitiveLiteral(undefined)` holes.
Object literals accept only data properties with identifier/string/numeric keys; no spreads/computed/methods.

### 5.8 Value converters and binding behaviors

Parsed as **tails** (lowest precedence, left‑associative):

* `expr | conv : a : b` → `ValueConverter(expr, "conv", [a,b])`
* `expr & behavior : x : y` → `BindingBehavior(expr, "behavior", [x,y])`

> Implementation note: the runtime expects an **identifier** after `|`/`&`, but it only throws when at **EOF**. Non‑identifier tokens will bubble through as `name` text; tooling should enforce an identifier here.

### 5.9 Iterator header (`repeat.for`)

`lhs of rhs[; …]` lowers to:

```
ForOfStatement(
  declaration: BindingIdentifier | ArrayBindingPattern | ObjectBindingPattern
              | DestructuringAssignmentExpression (runtime internal),
  iterable: <expression parsed in 'IsChainable'>,
  semiIdx: index of first ';' or -1
)
```

* LHS lowering in `IsIterator` mode:

  * `Identifier` → `BindingIdentifier`
  * `[...]` → `ArrayBindingPattern`
  * `{...}` → `ObjectBindingPattern`
* RHS is parsed in `IsChainable` mode, which **returns early at `;`** and records `semiIdx`.
  A trailing `;` **must** be followed by additional content; otherwise the parser reports an unconsumed token error.

---

## 6. Evaluation semantics (informative, runtime)

(From `ast.eval.ts`; this is for runtime evaluation, not for the parser itself.)

* Operators behave like JS (`instanceof` requires a callable RHS; `in` requires an object/function RHS).
* Optional chaining yields `undefined` on nullish receivers; in **strict** mode, nullish access/call throws.
* Observation: `AccessScope`/`AccessMember`/`AccessKeyed` observe unless `accessGlobal===true`.
  Selected array methods trigger collection observation:

  ```
  at, map, filter, includes, indexOf, lastIndexOf, findIndex, find,
  flat, flatMap, join, reduce, reduceRight, slice, every, some, sort
  ```
* Assignments support `=`, `+=`, `-=`, `*=`, `/=`; array index/length writes use `splice` to notify; in non‑strict mode, assigning into a nullish receiver for `AccessMember`/`AccessKeyed` auto‑creates an object (v1‑compat).
* Value converters: reads call `useConverter(name, "toView", value, args)`; writes call `"fromView"`.
* Binding behaviors: participate via `bind/unbind` hooks; the wrapped expression value is otherwise unchanged.
* `boundFn` option: functions read through `AccessMember` (and scope functions) are `.bind(instance)` when returned.

---

## 7. Differences from JavaScript

* No bitwise/shift operators; `|` and `&` are reserved for converters/behaviors.
* No `delete` unary operator.
* No RegExp/BigInt literals.
* Object literals: data properties only.
* Arrow functions: expression body only; params are identifiers (optional final `...rest`); no defaults/destructuring.
* Optional chaining cannot be followed by a tagged template (runtime error).
* Special scope tokens `$this`, `$parent` (chainable), `this` (boundary) are Aurelia‑specific.

---

## 8. Diagnostics (runtime `ErrorNames.*`)

This section documents the **runtime parser’s** error names. It is primarily useful for understanding how the original implementation reports failures.

Tooling/LSP parsers **do not** need to reproduce these names or behaviors exactly. They are free to:

* use their own diagnostic codes/messages, and/or
* surface parse errors as `BadExpression` nodes without matching these names.

Concrete errors raised by the runtime parser (names exactly as emitted):

* `parse_invalid_start`
* `parse_no_spread`
* `parse_expected_identifier`
* `parse_invalid_member_expr`
* `parse_unexpected_end`
* `parse_unconsumed_token`
* `parse_invalid_empty` *(defined; rarely used in current paths)*
* `parse_left_hand_side_not_assignable`
* `parse_expected_converter_identifier`
* `parse_expected_behavior_identifier`
* `parse_unexpected_keyword_of`
* `parse_unexpected_keyword_import`
* `parse_invalid_identifier_in_forof`
* `parse_invalid_identifier_object_literal_key`
* `parse_unterminated_string`
* `parse_unterminated_template_string`
* `parse_missing_expected_token`
* `parse_unexpected_token_destructuring`
* `parse_unexpected_token_optional_chain`
* `parse_invalid_tag_in_optional_chain`
* `parse_invalid_arrow_params`
* `parse_no_arrow_param_default_value`
* `parse_no_arrow_param_destructuring`
* `parse_rest_must_be_last`
* `parse_no_arrow_fn_body`
* `parse_unexpected_double_dot`

> Numeric IDs, if any, are defined in `errors.ts`. This spec references the **symbolic names** the runtime uses.

---

## 9. Worked examples

* **Scope hops**
  Input: `$parent.$parent.fullName`
  AST: `AccessScope("fullName", 2)`

* **Optional access & call**
  `user?.profile?.getName?.()` → nested `AccessMember` and a final `CallMember(..., optionalMember=true, optionalCall=true)`

* **Globals**
  `parseInt(x)` → `CallGlobal("parseInt", [x])`
  `Math.max(a,b)` → `CallMember(AccessGlobal("Math"), "max", [a,b], false, false)`

* **Pipes/behaviors**
  `amount | currency:'USD' & throttle:100`
  → `BindingBehavior( ValueConverter(amount, "currency", ["USD"]), "throttle", [100] )`

* **Arrow in argument**
  `items.map(x => x.name)` → `CallMember(items, "map", [ArrowFunction([id("x")], AccessMember(AccessScope("x"), "name"))])`

* **Assignment chain**
  `a = b = c` → `Assign( AccessScope("a"), Assign( AccessScope("b"), AccessScope("c") ) )`

* **Iterator header with tail**
  `item of items; key: id`
  → `ForOfStatement( BindingIdentifier("item"), <expr "items">, semiIdx = indexOf(';') )`

---

## 10. Interop with attribute syntax & TemplateCompiler

* `.bind` / `.to-view` / `.from-view` / `.two-way` / `:prop` → parse in **`'IsProperty'`**.
* Event bindings `.trigger` / `.capture` / `@event` → parse in **`'IsFunction'`**.
* Plain attributes and text nodes with `${...}` → **`'Interpolation'`**.
* `<let foo.bind="...">` → **`'IsProperty'`** (or interpolation for literal cases).
* `repeat.for="lhs of rhs; ..."` → **`'IsIterator'`** for the header; RHS/semicolons handled as specified above (`semiIdx` recorded).

These match the calls from both the runtime TemplateCompiler and the domain lowerer.

---

## 11. Notes and nuances

* **Identifier policy is deliberate**: The BMP‑only **IdentifierStart_BMP** + digits delivers predictable performance and tooling across environments, while staying within an ES262‑compatible subset for common scripts (Latin/phonetic extensions/letterlikes/roman numerals/fullwidth). Astral code points and combining‑mark continuations are intentionally out of scope.
* **Interpolation**: The evaluator uses `safeString` for each sub‑expression in multi‑part interpolations; the single‑expression case concatenates the raw value (documented here for completeness).
* **Converters/behaviors**: Each `:` argument is a **full expression** (parsed with the same grammar), not an identifier‑only token.
