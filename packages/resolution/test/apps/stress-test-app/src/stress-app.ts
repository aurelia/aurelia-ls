import { customElement } from "@aurelia/runtime-html";
import template from "./stress-app.html";
import { SectionPanel } from "./components/section-panel.js";
import { FooterWidget } from "./components/footer-widget.js";

/**
 * Root stress test component.
 * Contains:
 * - Outer repeat (section-panel)
 * - Sibling custom element (footer-widget)
 * - Text interpolations
 */
@customElement({
  name: "stress-app",
  template,
  dependencies: [SectionPanel, FooterWidget],
})
export class StressApp {
  title = "Stress Test App";
  footerText = "End of content";

  sections = [
    {
      name: "Section Alpha",
      items: [
        { label: "Alpha-1", active: true },
        { label: "Alpha-2", active: false },
        { label: "Alpha-3", active: true },
      ],
    },
    {
      name: "Section Beta",
      items: [
        { label: "Beta-1", active: false },
        { label: "Beta-2", active: true },
      ],
    },
  ];
}
