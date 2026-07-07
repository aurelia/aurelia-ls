# runtime-html-view-factory-provider-errors hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-view-factory-provider-errors`
Probe file: `packages/lane-harness/probes/runtime-html-view-factory-provider-errors.probes.json`
Lane: `hover`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## template-controller-view-factory-template

### Probe

```json
{
  "anchor": "<div view-factory-template>",
  "at": "view-factory-template",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-html-view-factory-provider-errors-app.html:2:6",
  "file": "src/runtime-html-view-factory-provider-errors-app.html",
  "lspPosition": {
    "character": 5,
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
    "markdownCharacters": 124,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Bindable** `value`

name: `value`
mode: `toView`

---

**Resource** `view-factory-template`

kind: `template-controller`
```
