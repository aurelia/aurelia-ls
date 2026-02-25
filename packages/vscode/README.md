# Aurelia 2

Language intelligence for Aurelia 2 templates.

The extension analyzes your Aurelia project to understand what your components are, what they accept, and where they came from. It handles decorators, conventions, `static $au`, `.define()` calls, third-party packages, and the full binding syntax.

When it can't fully analyze something — a dynamic registration pattern, a third-party package with opaque configuration — it tells you what it doesn't know and why, rather than guessing or staying silent.

## Features

### Hover — understand your templates

Hover over any Aurelia construct to see what it is, what it accepts, and where it came from. Custom elements show their bindable interface with types and binding modes. Expressions show resolved types. Template controllers show their contextual variables ($index, $first, $even, etc.).

### Diagnostics — catch real problems

Real-time error detection for unknown elements, unknown attributes, and binding mismatches. The extension only reports problems it's confident about — when analysis is incomplete, errors demote to warnings instead of producing false positives on valid code.

### Completions — discover what's available

Context-aware suggestions that reflect your actual project. Element tags, bindable attributes, binding commands, expression members, value converters, binding behaviors — all filtered by what's registered and visible in scope.

### Go to Definition — navigate across boundaries

Jump from template usage to source definition. Works for custom elements, attributes, template controllers, bindables, expression identifiers, and local scope variables. Crosses the HTML/TypeScript boundary.

### Find References

Find all usages of a component, attribute, or bindable across your templates.

### Rename — refactor safely

Rename a component, attribute, or bindable and all usages update across files. The extension checks that it can find all references before applying changes — if it can't, it tells you why rather than making partial edits.

### Semantic Tokens — see the meaning

Templates are colored by semantic meaning: custom elements look different from HTML elements, bindable attributes look different from plain attributes, resolved expressions look different from unresolved ones.

### Resource Explorer

Browse all Aurelia resources in your project from the sidebar — custom elements, attributes, template controllers, value converters, binding behaviors — organized by origin (local vs. package) and scope.

### Binding Mode Hints

Inline hints show the resolved binding mode so you can see whether `.bind` resolves to two-way or to-view for a given target.

## What Aurelia constructs are supported

- Custom elements (decorator, convention, `static $au`, and `.define()` forms)
- Custom attributes
- Template controllers (`if`, `else`, `repeat`, `switch`/`case`, `promise`/`pending`/`then`/`catch`, `with`, `portal`, `au-slot`, `au-compose`, and custom TCs)
- Value converters
- Binding behaviors
- All standard binding commands (`.bind`, `.to-view`, `.from-view`, `.two-way`, `.one-time`, `.trigger`, `.capture`, `.attr`, `.class`, `.style`, `.ref`)
- Template expressions (property access, member chains, optional chaining, pipes, behaviors)
- Third-party package resources

## How it handles uncertainty

Most framework tooling either achieves complete knowledge by restricting what you can write, or provides incomplete knowledge without telling you.

This extension takes a different approach: it analyzes what it can analyze, and when it reaches a limit (a dynamic registration pattern, a complex third-party package), it tells you what it doesn't know and why. Diagnostics downgrade to warnings when confidence is partial. Hover cards show confidence indicators. Completions mark when the list may be incomplete.

The goal is that you can trust what the extension tells you.

## Requirements

- Aurelia 2 project with `aurelia` or `@aurelia/*` in dependencies
- TypeScript 5.0+

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. The language server activates when it detects Aurelia dependencies
4. Check the "Aurelia Language Server" output channel for status

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| Aurelia: Find Resource | `Ctrl+Alt+A` (`Cmd+Alt+A`) | Search project resources by name |
| Aurelia: Inspect at Cursor | `Ctrl+Alt+I` (`Cmd+Alt+I`) | Show full semantic analysis at cursor |
| Aurelia: Show Available Resources | | List all resources visible in current scope |
| Aurelia: Diagnostics Report | | Summary of current diagnostics |
| Aurelia: Show Suppressed Diagnostics | | Show diagnostics suppressed by confidence rules |
| Aurelia: Show Compiled Template | | View TypeScript overlay for template (debug) |
| Aurelia: Show Overlay Mapping | | View expression position mapping (debug) |

## Troubleshooting

If features aren't working:

1. Check the "Aurelia Language Server" output channel for errors
2. Ensure your project has a `tsconfig.json`
3. Verify `aurelia` is in your `package.json` dependencies
4. Try reloading the VS Code window

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
