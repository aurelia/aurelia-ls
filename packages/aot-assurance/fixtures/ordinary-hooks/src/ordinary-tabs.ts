/* global Element, Document */
import { customElement } from 'aurelia';

// Grounded in Aurelia's process-content.spec.ts semi-real-life tabs example.
// Keep the ordinary selector and variadic DOM APIs: these are part of the use case.
@customElement({
  name: 'ordinary-tabs',
  template: '<div class="headers"><au-slot name="header"></au-slot></div><div class="panels"><au-slot name="content"></au-slot></div>',
  bindables: ['activeTabId'],
})
export class OrdinaryTabs {
  activeTabId = '';
  showTab(tabId: string): void { this.activeTabId = tabId; }

  static processContent(el: Element, platform: { document: Document }): void {
    const headerTemplate = platform.document.createElement('template');
    headerTemplate.setAttribute('au-slot', 'header');
    const contentTemplate = platform.document.createElement('template');
    contentTemplate.setAttribute('au-slot', 'content');
    const tabs = el.querySelectorAll('tab');
    const first = el.querySelector(':scope > tab');
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]!;
      const header = platform.document.createElement('button');
      header.setAttribute('class.bind', `$host.activeTabId=='${i}'?'active':''`);
      header.setAttribute('click.trigger', `$host.showTab('${i}')`);
      header.appendChild(platform.document.createTextNode(tab.getAttribute('header')!));
      headerTemplate.content.appendChild(header);
      const content = platform.document.createElement('div');
      content.setAttribute('if.bind', `$host.activeTabId=='${i}'`);
      content.append(...tab.childNodes);
      contentTemplate.content.appendChild(content);
      el.removeChild(tab);
    }
    el.setAttribute('data-selection', `${tabs.length}:${el.querySelectorAll('tab').length}:${first === tabs[0]}`);
    el.setAttribute('active-tab-id', '0');
    el.append(headerTemplate, contentTemplate);
  }
}
