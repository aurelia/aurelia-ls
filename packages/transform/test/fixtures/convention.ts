/**
 * Fixture: Convention-based naming
 *
 * Tests: Class name ends with CustomElement (no decorator needed)
 */

export class NavBarCustomElement {
  items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  activeIndex = 0;

  setActive(index: number) {
    this.activeIndex = index;
  }
}
