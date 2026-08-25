# hover-name-normalization hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/hover-name-normalization`
Probe file: `packages/lane-harness/probes/hover-name-normalization.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## mixed-case-custom-element-opening

### Probe

```json
{
  "anchor": "<PRODUCT-CARD>",
  "at": "PRODUCT-CARD",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:2:4",
  "file": "src/hover-name-normalization-app.html",
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
    "markdownCodePoints": 82,
    "range": {
      "end": {
        "character": 15,
        "line": 1
      },
      "start": {
        "character": 3,
        "line": 1
      }
    },
    "rangeText": "PRODUCT-CARD"
  }
}
```

### Hover markdown

````markdown
```html
<PRODUCT-CARD>
```

Aurelia custom element. Implementation: `ProductCard`.
````

## mixed-case-custom-element-closing

### Probe

```json
{
  "anchor": "</PrOdUcT-CaRd>",
  "at": "PrOdUcT-CaRd",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:2:19",
  "file": "src/hover-name-normalization-app.html",
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
    "markdownCodePoints": 82,
    "range": {
      "end": {
        "character": 30,
        "line": 1
      },
      "start": {
        "character": 18,
        "line": 1
      }
    },
    "rangeText": "PrOdUcT-CaRd"
  }
}
```

### Hover markdown

````markdown
```html
<PrOdUcT-CaRd>
```

Aurelia custom element. Implementation: `ProductCard`.
````

## mixed-case-custom-attribute

### Probe

```json
{
  "anchor": "<div FOCUS>",
  "at": "FOCUS",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:3:8",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 7,
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
    "markdownCodePoints": 117,
    "range": {
      "end": {
        "character": 12,
        "line": 2
      },
      "start": {
        "character": 7,
        "line": 2
      }
    },
    "rangeText": "FOCUS"
  }
}
```

### Hover markdown

````markdown
```text
(custom attribute) FOCUS
```

Aurelia custom attribute. Alias for: `focus-ring`. Implementation: `FocusRing`.
````

## mixed-case-binding-command

### Probe

```json
{
  "anchor": "VALUE.BIND=\"title\"",
  "at": "BIND",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:4:16",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 15,
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
    "markdownCodePoints": 60,
    "range": {
      "end": {
        "character": 19,
        "line": 3
      },
      "start": {
        "character": 15,
        "line": 3
      }
    },
    "rangeText": "BIND"
  }
}
```

### Hover markdown

````markdown
```text
(binding command) BIND
```

Aurelia binding command.
````

## svg-adjusted-custom-attribute

### Probe

```json
{
  "anchor": "<svg VIEWBOX=\"0 0 1 1\">",
  "at": "VIEWBOX",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:5:8",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 7,
    "line": 4
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
    "markdownCodePoints": 126,
    "range": {
      "end": {
        "character": 14,
        "line": 4
      },
      "start": {
        "character": 7,
        "line": 4
      }
    },
    "rangeText": "VIEWBOX"
  }
}
```

### Hover markdown

````markdown
```text
(custom attribute) VIEWBOX
```

Static value; no binding mode.
Aurelia custom attribute. Implementation: `SvgViewBox`.
````

## case-sensitive-value-converter-alias

### Probe

```json
{
  "anchor": "title | FormatName",
  "at": "FormatName",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:6:16",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 15,
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
    "markdownCodePoints": 135,
    "range": {
      "end": {
        "character": 25,
        "line": 5
      },
      "start": {
        "character": 15,
        "line": 5
      }
    },
    "rangeText": "FormatName"
  }
}
```

### Hover markdown

````markdown
```text
(value converter) FormatName
```

Aurelia value converter. Alias for: `formatName`. Implementation: `FormatNameValueConverter`.
````

## case-sensitive-binding-behavior-alias

### Probe

```json
{
  "anchor": "title & TrackEdit",
  "at": "TrackEdit",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:7:16",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 15,
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
    "markdownCodePoints": 135,
    "range": {
      "end": {
        "character": 24,
        "line": 6
      },
      "start": {
        "character": 15,
        "line": 6
      }
    },
    "rangeText": "TrackEdit"
  }
}
```

### Hover markdown

````markdown
```text
(binding behavior) TrackEdit
```

Aurelia binding behavior. Alias for: `trackEdit`. Implementation: `TrackEditBindingBehavior`.
````

## attribute-pattern-intentional-null

### Probe

```json
{
  "anchor": "PROMISE.RESOLVE=\"productPromise\"",
  "at": "RESOLVE",
  "atOccurrence": 1,
  "displayPosition": "src/hover-name-normalization-app.html:8:20",
  "file": "src/hover-name-normalization-app.html",
  "lspPosition": {
    "character": 19,
    "line": 7
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": null
}
```

### Hover markdown

_No hover markdown._
