# Aurelia 2

Language tooling for Aurelia 2 templates — diagnostics, completions, go-to-definition, and more.

## Features

| Feature | Description |
|---------|-------------|
| **Diagnostics** | Type errors in bindings, unknown elements and attributes |
| **Completions** | Custom elements, bindable properties, expressions |
| **Hover** | Type information for template expressions |
| **Go to Definition** | Navigate from template usage to component class |
| **Find References** | Locate usages across templates |

## Requirements

- Aurelia 2 project with `aurelia` in dependencies
- TypeScript 5.0+

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. The language server activates when you open an HTML file
4. Check the "Aurelia Language Server" output channel for status

## Commands

| Command | Description |
|---------|-------------|
| `Aurelia: Show Generated Overlay` | View the TypeScript overlay for the current template |
| `Aurelia: Show Overlay Mapping` | View expression-to-overlay position mapping |
| `Aurelia: Show Template Info` | Debug info for cursor position |
| `Aurelia: Dump Server State` | Output server state to log |

## Troubleshooting

If features aren't working:

1. Check the "Aurelia Language Server" output channel for errors
2. Ensure your project has a `tsconfig.json`
3. Verify `aurelia` is in your `package.json` dependencies
4. Try reloading the VS Code window

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
