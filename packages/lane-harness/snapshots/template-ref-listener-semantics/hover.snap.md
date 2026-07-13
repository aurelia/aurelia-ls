# template-ref-listener-semantics hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-ref-listener-semantics`
Probe file: `packages/lane-harness/probes/template-ref-listener-semantics.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## named-custom-attribute-ref-target

### Probe

```json
{
  "anchor": "focus-ring.ref=\"focusRingController\"",
  "at": "focus-ring",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:9:3",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 2,
    "line": 8
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
    "markdownCharacters": 51,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Resource** `focus-ring`

kind: `custom-attribute`
```

## keyboard-listener-event

### Probe

```json
{
  "anchor": "handleKeyboard($event)",
  "at": "$event",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:21:51",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 50,
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
    "markdownCharacters": 61,
    "range": null
  }
}
```

### Hover markdown

````markdown
**$event**

```ts
$event: KeyboardEvent
```

kind: `property`
````
