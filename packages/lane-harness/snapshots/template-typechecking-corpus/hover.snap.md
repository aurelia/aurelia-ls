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
    "markdownCodePoints": 23,
    "range": {
      "end": {
        "character": 46,
        "line": 3
      },
      "start": {
        "character": 41,
        "line": 3
      }
    },
    "rangeText": "label"
  }
}
```

### Hover markdown

````markdown
```ts
label: string
```
````

## logical-and-narrowed-member-type

### Probe

```json
{
  "anchor": "${maybeItem && maybeItem.label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/read-expressions.html:13:64",
  "file": "src/read-expressions.html",
  "lspPosition": {
    "character": 63,
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
    "markdownCodePoints": 23,
    "range": {
      "end": {
        "character": 68,
        "line": 12
      },
      "start": {
        "character": 63,
        "line": 12
      }
    },
    "rangeText": "label"
  }
}
```

### Hover markdown

````markdown
```ts
label: string
```
````

## let-local-kebab-declaration

### Probe

```json
{
  "anchor": "<let upper-label.bind=\"item.label.toUpperCase()\">",
  "at": "upper-label",
  "atOccurrence": 1,
  "displayPosition": "src/scope-projections.html:11:12",
  "file": "src/scope-projections.html",
  "lspPosition": {
    "character": 11,
    "line": 10
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
    "markdownCodePoints": 41,
    "range": {
      "end": {
        "character": 22,
        "line": 10
      },
      "start": {
        "character": 11,
        "line": 10
      }
    },
    "rangeText": "upper-label"
  }
}
```

### Hover markdown

````markdown
```ts
upper-label: string
```

Let local.
````

## pathological-long-diagnostic-summary

### Probe

```json
{
  "anchor": "${describe(true)}",
  "at": "true",
  "atOccurrence": 1,
  "displayPosition": "src/read-expressions.html:21:42",
  "file": "src/read-expressions.html",
  "lspPosition": {
    "character": 41,
    "line": 20
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
    "markdownCodePoints": 237,
    "range": {
      "end": {
        "character": 45,
        "line": 20
      },
      "start": {
        "character": 41,
        "line": 20
      }
    },
    "rangeText": "true"
  }
}
```

### Hover markdown

```markdown
Error `TS2769`: No overload matches this call. Overload 1 of 2, '(value: string): string', gave the following error. Argument of type 'boolean' is not assignable to parameter of type 'string'. Overload 2 of 2, '(value: number): number',…
```
