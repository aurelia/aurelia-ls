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
    "markdownCodePoints": 97,
    "range": {
      "end": {
        "character": 12,
        "line": 8
      },
      "start": {
        "character": 2,
        "line": 8
      }
    },
    "rangeText": "focus-ring"
  }
}
```

### Hover markdown

````markdown
```text
(custom attribute) focus-ring
```

Aurelia custom attribute. Implementation: `FocusRing`.
````

## keyboard-listener-event

### Probe

```json
{
  "anchor": "handleKeyboard($event)",
  "at": "$event",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:22:51",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 50,
    "line": 21
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
    "markdownCodePoints": 59,
    "range": {
      "end": {
        "character": 56,
        "line": 21
      },
      "start": {
        "character": 50,
        "line": 21
      }
    },
    "rangeText": "$event"
  }
}
```

### Hover markdown

````markdown
```ts
$event: KeyboardEvent
```

Listener contextual value.
````

## resource-alias-focus

### Probe

```json
{
  "anchor": "<ref-panel focus focus-ring.ref=\"aliasFocusRingController\"></ref-panel>",
  "at": "focus",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:13:12",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 11,
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
    "markdownCodePoints": 117,
    "range": {
      "end": {
        "character": 16,
        "line": 12
      },
      "start": {
        "character": 11,
        "line": 12
      }
    },
    "rangeText": "focus"
  }
}
```

### Hover markdown

````markdown
```text
(custom attribute) focus
```

Aurelia custom attribute. Alias for: `focus-ring`. Implementation: `FocusRing`.
````
