# template-expression-resource-combinators hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## nested-arrow-current-context

### Probe

```json
{
  "anchor": "group.items.map(item => $this.heading).join(', ')",
  "at": "heading",
  "atOccurrence": 1,
  "displayPosition": "src/scope-path-gallery.html:5:93",
  "file": "src/scope-path-gallery.html",
  "lspPosition": {
    "character": 92,
    "line": 4
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
    "markdownCharacters": 125,
    "range": null
  }
}
```

### Hover markdown

````markdown
**heading**

```ts
heading: "Scope paths"
```

kind: `property`
owner: `ScopePathGallery`
owner shape: `class`
readonly
````

## reserved-current-context-member

### Probe

```json
{
  "anchor": "${$this.$parent.toFixed()}",
  "at": "$parent",
  "atOccurrence": 1,
  "displayPosition": "src/scope-path-gallery.html:3:45",
  "file": "src/scope-path-gallery.html",
  "lspPosition": {
    "character": 44,
    "line": 2
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
    "markdownCharacters": 114,
    "range": null
  }
}
```

### Hover markdown

````markdown
**$parent**

```ts
$parent: 17
```

kind: `property`
owner: `ScopePathGallery`
owner shape: `class`
readonly
````
