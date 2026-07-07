# mixed-form-surfaces hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-member-label-silent-partial

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
    "markdownCharacters": 52,
    "range": null
  }
}
```

### Hover markdown

````markdown
**label**

```ts
label: string
```

kind: `property`
````

## open-member-option-label

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
    "markdownCharacters": 218,
    "range": null
  }
}
```

### Hover markdown

```markdown
**label**

owner: `unknown`  
owner shape: `unknown`

---

**information: weak-expression-member-owner**

The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.
```

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
    "markdownCharacters": 219,
    "range": null
  }
}
```

### Hover markdown

```markdown
**label**

owner: `"ticket-shell"`  
owner shape: `primitive`

---

**information: missing-expression-member**

The selected member is not projected on the owner type, so semantic tooling cannot validate or navigate it.
```
