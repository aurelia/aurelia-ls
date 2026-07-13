# template-local-template-semantics hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-resource-use-before-declaration

### Probe

```json
{
  "anchor": "<mode-panel\n    one-time-value.bind",
  "at": "mode-panel",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:2:4",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 3,
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
    "markdownCharacters": 49,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Resource** `mode-panel`

kind: `custom-element`
```

## local-bindable-property-declaration

### Probe

```json
{
  "anchor": "<bindable name=\"oneTimeValue\"",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:21",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 20,
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
    "markdownCharacters": 198,
    "range": null
  }
}
```

### Hover markdown

````markdown
**oneTimeValue**

```ts
oneTimeValue: string
```

kind: `property`

---

**Bindable** `one-time-value`

name: `oneTimeValue`
mode: `oneTime`

---

**Resource** `mode-panel`

kind: `custom-element`
````

## local-bindable-property-use

### Probe

```json
{
  "anchor": "<h2>${oneTimeValue}</h2>",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:34:13",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 12,
    "line": 33
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
    "markdownCharacters": 66,
    "range": null
  }
}
```

### Hover markdown

````markdown
**oneTimeValue**

```ts
oneTimeValue: string
```

kind: `property`
````

## local-bindable-union-use

### Probe

```json
{
  "anchor": "<p>${mixedValue}</p>",
  "at": "mixedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:39:12",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 11,
    "line": 38
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
    "markdownCharacters": 71,
    "range": null
  }
}
```

### Hover markdown

````markdown
**mixedValue**

```ts
mixedValue: string | number
```

kind: `property`
````

## local-bindable-alias

### Probe

```json
{
  "anchor": "attribute=\"one-time-value\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:46",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 45,
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
    "markdownCharacters": 125,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Bindable** `one-time-value`

name: `oneTimeValue`
mode: `oneTime`

---

**Resource** `mode-panel`

kind: `custom-element`
```

## local-bindable-mode

### Probe

```json
{
  "anchor": "mode=\"oneTime\"",
  "at": "oneTime",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:68",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 67,
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
    "markdownCharacters": 125,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Bindable** `one-time-value`

name: `oneTimeValue`
mode: `oneTime`

---

**Resource** `mode-panel`

kind: `custom-element`
```

## nested-local-resource

### Probe

```json
{
  "anchor": "<nested-note note.bind",
  "at": "nested-note",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:41:8",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 7,
    "line": 40
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
    "markdownCharacters": 50,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Resource** `nested-note`

kind: `custom-element`
```
