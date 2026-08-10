# runtime-expression-access-uses hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## callback-local-filter-item

### Probe

```json
{
  "anchor": "filter(item => item.label)",
  "at": "item",
  "atOccurrence": 2,
  "displayPosition": "src/runtime-expression-access-uses-app.html:6:28",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 27,
    "line": 5
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 50,
    "range": {
      "end": {
        "character": 31,
        "line": 5
      },
      "start": {
        "character": 27,
        "line": 5
      }
    },
    "rangeText": "item"
  }
}
```

### Hover markdown

````markdown
```ts
item: AccessUseItem
```

Callback parameter.
````

## form-name-member

### Probe

```json
{
  "anchor": "value.one-time=\"form.name\"",
  "at": "name",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:18:52",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 51,
    "line": 17
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 22,
    "range": {
      "end": {
        "character": 55,
        "line": 17
      },
      "start": {
        "character": 51,
        "line": 17
      }
    },
    "rangeText": "name"
  }
}
```

### Hover markdown

````markdown
```ts
name: string
```
````

## bare-current-context

### Probe

```json
{
  "anchor": "${$this} / ${items.map(item => $this).length}",
  "at": "$this",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:12:7",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 6,
    "line": 11
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 81,
    "range": {
      "end": {
        "character": 11,
        "line": 11
      },
      "start": {
        "character": 6,
        "line": 11
      }
    },
    "rangeText": "$this"
  }
}
```

### Hover markdown

````markdown
```ts
$this: RuntimeExpressionAccessUsesApp
```

Current Aurelia binding context.
````
