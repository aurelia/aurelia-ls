# mixed-form-surfaces hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-member-label

### Probe

```json
{
  "anchor": "${label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:2:5",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 4,
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
    "markdownCodePoints": 23,
    "range": {
      "end": {
        "character": 9,
        "line": 1
      },
      "start": {
        "character": 4,
        "line": 1
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

## parent-specialized-option-label

### Probe

```json
{
  "anchor": "${option.label || option}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:5:16",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 15,
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
    "markdownCodePoints": 32,
    "range": {
      "end": {
        "character": 20,
        "line": 4
      },
      "start": {
        "character": 15,
        "line": 4
      }
    },
    "rangeText": "label"
  }
}
```

### Hover markdown

````markdown
```ts
readonly label: string
```
````

## masked-member-shellTone-label

### Probe

```json
{
  "anchor": "${shellTone.label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:12:20",
  "file": "src/app.html",
  "lspPosition": {
    "character": 19,
    "line": 11
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
    "markdownCodePoints": 139,
    "range": {
      "end": {
        "character": 24,
        "line": 11
      },
      "start": {
        "character": 19,
        "line": 11
      }
    },
    "rangeText": "label"
  }
}
```

### Hover markdown

```markdown
Warning `missing-expression-member`: Member "label" is not projected on the owner type, so semantic tooling cannot validate or navigate it.
```

## weak-member-withheld-context

### Probe

```json
{
  "anchor": "${weakMetadata.source}",
  "at": "source",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:11:46",
  "file": "src/app.html",
  "lspPosition": {
    "character": 45,
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
    "markdownCodePoints": 25,
    "range": {
      "end": {
        "character": 51,
        "line": 10
      },
      "start": {
        "character": 45,
        "line": 10
      }
    },
    "rangeText": "source"
  }
}
```

### Hover markdown

````markdown
```ts
source: unknown
```
````
