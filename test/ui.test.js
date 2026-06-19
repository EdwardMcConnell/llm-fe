import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushMicrotasks } from '../src/testing.js';
import '../src/ui.js';

describe('Fe UI Components', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('FeCard', () => {
    it('renders slotted content', async () => {
      const element = await mount('fe-card');
      element.innerHTML = '<div id="test-content">Hello</div>';
      await flushMicrotasks();
      
      const slot = element.root.querySelector('slot');
      expect(slot).toBeTruthy();
      expect(element.querySelector('#test-content').textContent).toBe('Hello');
    });
  });

  describe('FeAccordion', () => {
    it('toggles open state and syncs with inner details element', async () => {
      const element = await mount('fe-accordion', { name: 'test-group' });
      element.innerHTML = '<span slot="header">Test Header</span><p>Content</p>';
      await flushMicrotasks();
      
      const details = element.root.querySelector('#details');
      
      expect(details.hasAttribute('open')).toBe(false);
      
      element.setAttribute('open', '');
      await flushMicrotasks();
      expect(details.hasAttribute('open')).toBe(true);

      // Programmatic toggle
      details.open = false;
      details.dispatchEvent(new Event('toggle'));
      await flushMicrotasks();
      expect(element.hasAttribute('open')).toBe(false);
    });
  });

  describe('FeTabs', () => {
    it('manages aria-selected state and visibility natively', async () => {
      const element = await mount('fe-tabs');
      element.innerHTML = `
          <button slot="tab" aria-selected="true" id="tab1">Tab 1</button>
          <button slot="tab" aria-selected="false" id="tab2">Tab 2</button>
          <div slot="panel" id="panel1">Panel 1</div>
          <div slot="panel" id="panel2">Panel 2</div>
      `;
      
      const tab1 = element.querySelector('#tab1');
      const tab2 = element.querySelector('#tab2');
      const panel1 = element.querySelector('#panel1');
      const panel2 = element.querySelector('#panel2');

      // Wait for slotchange
      await flushMicrotasks();
      await new Promise(r => setTimeout(r, 10)); // Give slotchange event time to propagate

      expect(tab1.getAttribute('aria-selected')).toBe('true');
      expect(panel1.hasAttribute('hidden')).toBe(false);
      expect(panel2.hasAttribute('hidden')).toBe(true);

      // Click tab 2
      tab2.click();
      await flushMicrotasks();

      expect(tab2.getAttribute('aria-selected')).toBe('true');
      expect(tab1.getAttribute('aria-selected')).toBe('false');
      expect(panel2.hasAttribute('hidden')).toBe(false);
      expect(panel1.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('FeOverlay Primitives (Tooltip/Menu)', () => {
    it('initializes popover properties properly', async () => {
      const element = await mount('fe-tooltip', { id: 'tt1', trigger: 'btn1' });
      const tooltip = element.root.querySelector('#tooltip');
      expect(tooltip.getAttribute('popover')).toBeTruthy();
      
      const menuElement = await mount('fe-menu', { id: 'm1', trigger: 'btn2' });
      const menu = menuElement.root.querySelector('#menu');
      expect(menu.getAttribute('popover')).toBe('auto');
    });
  });
});
