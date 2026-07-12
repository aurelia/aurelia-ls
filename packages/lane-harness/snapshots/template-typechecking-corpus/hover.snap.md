# template-typechecking-corpus hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus`
Probe file: `packages/lane-harness/probes/template-typechecking-corpus.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## optional-chain-member-type

### Probe

```json
{
  "anchor": "${maybeItem?.label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/read-expressions.html:4:42",
  "file": "src/read-expressions.html",
  "lspPosition": {
    "character": 41,
    "line": 3
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
    "markdownCharacters": 104,
    "range": null
  }
}
```

### Hover markdown

````markdown
**label**

```ts
label: string
```

kind: `property`
owner: `CorpusItem | null`
owner shape: `union`
````

## logical-and-narrowed-member-type

### Probe

```json
{
  "anchor": "${maybeItem && maybeItem.label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/read-expressions.html:12:64",
  "file": "src/read-expressions.html",
  "lspPosition": {
    "character": 63,
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
    "markdownCharacters": 101,
    "range": null
  }
}
```

### Hover markdown

````markdown
**label**

```ts
label: string
```

kind: `property`
owner: `CorpusItem`
owner shape: `interface`
````
