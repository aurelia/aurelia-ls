# template-spread-capture-semantics hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...$bindables='spreadState'>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:31",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 30,
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
    "markdownCodePoints": 38,
    "range": {
      "end": {
        "character": 41,
        "line": 1
      },
      "start": {
        "character": 30,
        "line": 1
      }
    },
    "rangeText": "spreadState"
  }
}
```

### Hover markdown

````markdown
```ts
spreadState: SpreadCardState
```
````

## spread-inferred-member

### Probe

```json
{
  "anchor": "...$bindables='spreadContainer.details'",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:47",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 46,
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
    "markdownCodePoints": 84,
    "range": {
      "end": {
        "character": 53,
        "line": 2
      },
      "start": {
        "character": 46,
        "line": 2
      }
    },
    "rangeText": "details"
  }
}
```

### Hover markdown

````markdown
```ts
details: { title: string; count: number; tone: string; internal: string; }
```
````

## spread-repeat-local

### Probe

```json
{
  "anchor": "repeat.for=\"card of spreadCards\" ...card",
  "at": "card",
  "atOccurrence": 2,
  "displayPosition": "src/template-spread-capture-semantics-app.html:9:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
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
    "markdownCodePoints": 46,
    "range": {
      "end": {
        "character": 55,
        "line": 8
      },
      "start": {
        "character": 51,
        "line": 8
      }
    },
    "rangeText": "card"
  }
}
```

### Hover markdown

````markdown
```ts
card: SpreadCardState
```

Repeat local.
````

## spread-value-converter-resource

### Probe

```json
{
  "anchor": "spreadState | spreadIdentity",
  "at": "spreadIdentity",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:7:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
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
    "markdownCodePoints": 118,
    "range": {
      "end": {
        "character": 58,
        "line": 6
      },
      "start": {
        "character": 44,
        "line": 6
      }
    },
    "rangeText": "spreadIdentity"
  }
}
```

### Hover markdown

````markdown
```text
(value converter) spreadIdentity
```

Aurelia value converter. Implementation: `SpreadIdentityValueConverter`.
````

## captured-expression-member

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:31:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 30
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
    "markdownCodePoints": 31,
    "range": {
      "end": {
        "character": 29,
        "line": 30
      },
      "start": {
        "character": 16,
        "line": 30
      }
    },
    "rangeText": "capturedValue"
  }
}
```

### Hover markdown

````markdown
```ts
capturedValue: string
```
````

## captured-listener-event

### Probe

```json
{
  "anchor": "click.trigger=\"handleCaptured($event)\"",
  "at": "$event",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:33:35",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 34,
    "line": 32
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
    "markdownCodePoints": 58,
    "range": {
      "end": {
        "character": 40,
        "line": 32
      },
      "start": {
        "character": 34,
        "line": 32
      }
    },
    "rangeText": "$event"
  }
}
```

### Hover markdown

````markdown
```ts
$event: PointerEvent
```

Listener contextual value.
````

## receiver-local-custom-attribute

### Probe

```json
{
  "anchor": "input-mark=\"receiver-local-mark\"",
  "at": "input-mark",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:36:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
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
    "markdownCodePoints": 97,
    "range": {
      "end": {
        "character": 14,
        "line": 35
      },
      "start": {
        "character": 4,
        "line": 35
      }
    },
    "rangeText": "input-mark"
  }
}
```

### Hover markdown

````markdown
```text
(custom attribute) input-mark
```

Aurelia custom attribute. Implementation: `InputMark`.
````
