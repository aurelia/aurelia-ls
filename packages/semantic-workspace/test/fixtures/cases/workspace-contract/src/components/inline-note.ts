import { bindable, customElement } from "@aurelia/runtime-html";

@customElement({
  name: "inline-note",
  template: `<template>
    <aside class="inline-note \${tone}">
      <strong>\${title}</strong>
      <span>\${message}</span>
    </aside>
  </template>`,
})
export class InlineNote {
  @bindable message = "";
  @bindable title = "Note";
  @bindable tone: "info" | "warn" | "success" = "info";
}
