# router-parameter-completion hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-parameter-completion`
Probe file: `packages/lane-harness/probes/router-parameter-completion.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## router-bound-literal-route-id

### Probe

```json
{
  "anchor": "route.bind: 'product-detail'; params.bind: { }",
  "at": "product-detail",
  "atOccurrence": 1,
  "displayPosition": "src/routes/parameter-workspace.html:7:25",
  "file": "src/routes/parameter-workspace.html",
  "lspPosition": {
    "character": 24,
    "line": 6
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
    "markdownCodePoints": 39,
    "range": {
      "end": {
        "character": 39,
        "line": 6
      },
      "start": {
        "character": 23,
        "line": 6
      }
    },
    "rangeText": "'product-detail'"
  }
}
```

### Hover markdown

````markdown
```text
(route id) 'product-detail'
```
````

## router-open-context-route-id

### Probe

```json
{
  "anchor": "route: product-detail; context.bind: alternateContext; params.bind: { }",
  "at": "product-detail",
  "atOccurrence": 1,
  "displayPosition": "src/routes/parameter-workspace.html:13:19",
  "file": "src/routes/parameter-workspace.html",
  "lspPosition": {
    "character": 18,
    "line": 12
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
    "markdownCodePoints": 21,
    "range": {
      "end": {
        "character": 32,
        "line": 12
      },
      "start": {
        "character": 18,
        "line": 12
      }
    },
    "rangeText": "product-detail"
  }
}
```

### Hover markdown

```markdown
Dynamic route target.
```
