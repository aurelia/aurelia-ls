# observation-binding-lifecycle hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inert-attribute-source-member

### Probe

```json
{
  "anchor": "data-lifecycle.attr=\"attributeFromView & fromView\"",
  "at": "attributeFromView",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:8:61",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 60,
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
    "markdownCharacters": 141,
    "range": null
  }
}
```

### Hover markdown

````markdown
**attributeFromView**

```ts
attributeFromView: string
```

kind: `property`
owner: `ObservationBindingLifecycleApp`
owner shape: `class`
````

## reached-effective-two-way-assignment

### Probe

```json
{
  "anchor": "<p>${reachedChildValue}</p>",
  "at": "reachedChildValue",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:30:8",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 7,
    "line": 29
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
    "markdownCharacters": 141,
    "range": null
  }
}
```

### Hover markdown

````markdown
**reachedChildValue**

```ts
reachedChildValue: number
```

kind: `property`
owner: `ObservationBindingLifecycleApp`
owner shape: `class`
````

## blocked-effective-two-way-assignment

### Probe

```json
{
  "anchor": "<p>${blockedChildValue}</p>",
  "at": "blockedChildValue",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:32:8",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 7,
    "line": 31
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
    "markdownCharacters": 141,
    "range": null
  }
}
```

### Hover markdown

````markdown
**blockedChildValue**

```ts
blockedChildValue: string
```

kind: `property`
owner: `ObservationBindingLifecycleApp`
owner shape: `class`
````
