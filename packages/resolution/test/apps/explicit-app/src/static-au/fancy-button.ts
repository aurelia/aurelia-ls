import type { BindingMode } from "@aurelia/runtime-html";

/**
 * Pattern: Custom element defined entirely via static $au
 *
 * This is an alternative to using decorators. The static $au property
 * contains all the metadata that would normally come from decorators.
 * Resolution must extract this metadata correctly.
 */
export class FancyButton {
  static $au = {
    type: "custom-element" as const,
    name: "fancy-button",
    template: `<template>
      <button class="fancy \${variant}" disabled.bind="disabled">
        \${label}
      </button>
    </template>`,
    bindables: [
      "label",
      { name: "disabled", mode: 1 satisfies BindingMode /* fromView */ },
      { name: "variant" },
    ],
    containerless: false,
    aliases: ["btn", "action-button"],
  };

  // Properties match bindables
  label: string = "Button";
  disabled: boolean = false;
  variant: string = "primary";

  handleClick(): void {
    if (!this.disabled) {
      console.log("Fancy button clicked!");
    }
  }
}
