# typescript-related-member-closure hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/typescript-related-member-closure`
Probe file: `packages/lane-harness/probes/typescript-related-member-closure.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## selected-string-overload

### Probe

```json
{
  "anchor": "${overloaded('')}",
  "at": "overloaded",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:11:8",
  "file": "src/app.html",
  "lspPosition": {
    "character": 7,
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
    "markdownCodePoints": 57,
    "range": {
      "end": {
        "character": 17,
        "line": 10
      },
      "start": {
        "character": 7,
        "line": 10
      }
    },
    "rangeText": "overloaded"
  }
}
```

### Hover markdown

````markdown
```ts
overloaded(input: string): string (+1 overload)
```
````
