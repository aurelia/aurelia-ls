# template-spread-capture-semantics hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...spreadState>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:19",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 18,
    "line": 1
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
    "markdownCharacters": 130,
    "range": null
  }
}
```

### Hover markdown

````markdown
**spreadState**

```ts
spreadState: SpreadCardState
```

kind: `property`

---

**Resource** `spread-card`

kind: `custom-element`
````

## spread-inferred-member

### Probe

```json
{
  "anchor": "...spreadContainer.details",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:35",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 34,
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
    "markdownCharacters": 287,
    "range": null
  }
}
```

### Hover markdown

````markdown
**details**

```ts
details: { title: string; count: number; tone: string; internal: string; }
```

kind: `property`
owner: `{ details: { title: string; count: number; tone: string; internal: string; }; }`
owner shape: `object`

---

**Resource** `spread-card`

kind: `custom-element`
````

## spread-repeat-local

### Probe

```json
{
  "anchor": "repeat.for=\"card of spreadCards\" ...card",
  "at": "card",
  "atOccurrence": 2,
  "displayPosition": "src/template-spread-capture-semantics-app.html:8:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
    "line": 7
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
    "markdownCharacters": 116,
    "range": null
  }
}
```

### Hover markdown

````markdown
**card**

```ts
card: SpreadCardState
```

kind: `property`

---

**Resource** `spread-card`

kind: `custom-element`
````

## spread-value-converter-resource

### Probe

```json
{
  "anchor": "spreadState | spreadIdentity",
  "at": "spreadIdentity",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:6:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
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
    "markdownCharacters": 54,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Resource** `spreadIdentity`

kind: `value-converter`
```

## captured-expression-member

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:19:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 18
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
    "markdownCharacters": 127,
    "range": null
  }
}
```

### Hover markdown

````markdown
**capturedValue**

```ts
capturedValue: string
```

kind: `property`

---

**Resource** `capture-shell`

kind: `custom-element`
````

## captured-listener-event

### Probe

```json
{
  "anchor": "click.trigger=\"handleCaptured($event)\"",
  "at": "$event",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:21:35",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 34,
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
    "markdownCharacters": 119,
    "range": null
  }
}
```

### Hover markdown

````markdown
**$event**

```ts
$event: PointerEvent
```

kind: `property`

---

**Resource** `capture-shell`

kind: `custom-element`
````

## receiver-local-custom-attribute

### Probe

```json
{
  "anchor": "input-mark=\"receiver-local-mark\"",
  "at": "input-mark",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:24:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 23
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
**Resource** `input-mark`

kind: `custom-attribute`
```
