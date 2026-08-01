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
    "markdownCharacters": 57,
    "range": null
  }
}
```

### Hover markdown

````markdown
**item**

```ts
item: AccessUseItem
```

kind: `property`
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
    "markdownCharacters": 103,
    "range": null
  }
}
```

### Hover markdown

````markdown
**name**

```ts
name: string
```

kind: `property`
owner: `{ name: string; }`
owner shape: `object`
````
