import { BindingBehavior, CustomAttribute, CustomElement, ValueConverter } from "@aurelia/runtime-html";

export class InfoPill {
  text = "";
  tone = "neutral";
}

export const InfoPillElement = CustomElement.define(
  {
    name: "info-pill",
    bindables: ["text", { name: "tone" }],
    template: `<template>
      <span class="info-pill \${tone}">\${text}</span>
    </template>`,
  },
  InfoPill,
);

export class CopyToClipboard {
  value = "";
  successClass = "";
}

export const CopyToClipboardAttribute = CustomAttribute.define(
  {
    name: "copy-to-clipboard",
    bindables: ["value", { name: "successClass", attribute: "success-class" }],
  },
  CopyToClipboard,
);

export class ShortenValueConverter {
  toView(value: string, max = 12): string {
    if (value.length <= max) return value;
    return value.slice(0, Math.max(0, max - 3)) + "...";
  }
}

export const Shorten = ValueConverter.define("shorten", ShortenValueConverter);

export class HighlightBindingBehavior {
  bind(): void {}
  unbind(): void {}
}

export const Highlight = BindingBehavior.define("highlight", HighlightBindingBehavior);
