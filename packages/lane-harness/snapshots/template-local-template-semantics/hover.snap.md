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
    "markdownCodePoints": 49,
    "range": {
      "end": {
        "character": 13,
        "line": 1
      },
      "start": {
        "character": 3,
        "line": 1
      }
    },
    "rangeText": "mode-panel"
  }
}
```

### Hover markdown

````markdown
```html
<mode-panel>
```

Aurelia custom element.
````

## local-bindable-one-time-usage

### Probe

```json
{
  "anchor": "one-time-value.bind=\"oneTimeValue\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:3:5",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 4,
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
    "markdownCodePoints": 143,
    "range": {
      "end": {
        "character": 18,
        "line": 2
      },
      "start": {
        "character": 4,
        "line": 2
      }
    },
    "rangeText": "one-time-value"
  }
}
```

### Hover markdown

````markdown
```ts
(bindable) one-time-value
```

Effective mode: one time (bindable default).
Maps to: `oneTimeValue`.

Type unavailable for this bindable.
````

## local-bindable-two-way-usage

### Probe

```json
{
  "anchor": "two-way-value.bind=\"twoWayValue\"",
  "at": "two-way-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:6:5",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 4,
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
    "markdownCodePoints": 140,
    "range": {
      "end": {
        "character": 17,
        "line": 5
      },
      "start": {
        "character": 4,
        "line": 5
      }
    },
    "rangeText": "two-way-value"
  }
}
```

### Hover markdown

````markdown
```ts
(bindable) two-way-value
```

Effective mode: two way (bindable default).
Maps to: `twoWayValue`.

Type unavailable for this bindable.
````

## local-bindable-default-sentinel-usage

### Probe

```json
{
  "anchor": "default-value.bind=\"defaultValue\"",
  "at": "default-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:7:5",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 4,
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
    "markdownCodePoints": 143,
    "range": {
      "end": {
        "character": 17,
        "line": 6
      },
      "start": {
        "character": 4,
        "line": 6
      }
    },
    "rangeText": "default-value"
  }
}
```

### Hover markdown

````markdown
```ts
(bindable) default-value
```

Effective mode: to view (framework fallback).
Maps to: `defaultValue`.

Type unavailable for this bindable.
````

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
    "markdownCodePoints": 102,
    "range": {
      "end": {
        "character": 32,
        "line": 23
      },
      "start": {
        "character": 20,
        "line": 23
      }
    },
    "rangeText": "oneTimeValue"
  }
}
```

### Hover markdown

````markdown
```ts
(bindable) oneTimeValue: string
```

Public attribute: `one-time-value`. Default mode: one time.
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
    "markdownCodePoints": 30,
    "range": {
      "end": {
        "character": 24,
        "line": 33
      },
      "start": {
        "character": 12,
        "line": 33
      }
    },
    "rangeText": "oneTimeValue"
  }
}
```

### Hover markdown

````markdown
```ts
oneTimeValue: string
```
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
    "markdownCodePoints": 37,
    "range": {
      "end": {
        "character": 21,
        "line": 38
      },
      "start": {
        "character": 11,
        "line": 38
      }
    },
    "rangeText": "mixedValue"
  }
}
```

### Hover markdown

````markdown
```ts
mixedValue: string | number
```
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
    "markdownCodePoints": 93,
    "range": {
      "end": {
        "character": 59,
        "line": 23
      },
      "start": {
        "character": 45,
        "line": 23
      }
    },
    "rangeText": "one-time-value"
  }
}
```

### Hover markdown

````markdown
```ts
(bindable) one-time-value: string
```

Maps to: `oneTimeValue`. Default mode: one time.
````

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
    "markdownCodePoints": 66,
    "range": {
      "end": {
        "character": 74,
        "line": 23
      },
      "start": {
        "character": 67,
        "line": 23
      }
    },
    "rangeText": "oneTime"
  }
}
```

### Hover markdown

````markdown
```text
(binding mode) oneTime
```

Default for: `one-time-value`.
````

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
    "markdownCodePoints": 50,
    "range": {
      "end": {
        "character": 18,
        "line": 40
      },
      "start": {
        "character": 7,
        "line": 40
      }
    },
    "rangeText": "nested-note"
  }
}
```

### Hover markdown

````markdown
```html
<nested-note>
```

Aurelia custom element.
````
