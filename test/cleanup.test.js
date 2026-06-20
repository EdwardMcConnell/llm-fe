import { describe, it, expect, vi } from 'vitest';
import '../src/primitives.js';
import '../src/ui.js';
import { mount, flushMicrotasks } from '../src/testing.js';

describe('Global Lifecycle Cleanup Verification', () => {
  const allComponents = [
    'fe-button',
    'fe-dialog',
    'fe-link',
    'fe-form',
    'fe-time',
    'fe-grid',
    'fe-text',
    'fe-card',
    'fe-accordion-group',
    'fe-accordion',
    'fe-tooltip',
    'fe-menu',
    'fe-toast',
    'fe-tabs'
  ];

  allComponents.forEach(tag => {
    it(`should mechanically clean up ${tag} on unmount`, async () => {
      document.body.innerHTML = '';

      // Create a mock trigger for tooltip/menu
      const trigger = document.createElement('button');
      trigger.id = 'test-trigger';
      document.body.appendChild(trigger);

      const el = document.createElement(tag);
      el.id = 'test-el';
      el.setAttribute('trigger', 'test-trigger');
      
      document.body.appendChild(el);
      
      await flushMicrotasks();
      
      // Let any setTimeout from bind() run (e.g. tooltip setup)
      await new Promise(r => setTimeout(r, 20));

      expect(Array.isArray(el._cleanups)).toBe(true);
      
      // Disconnect cleanly
      if (document.body.contains(el)) {
        document.body.removeChild(el);
      }
      
      // Verification
      expect(el._cleanups.length).toBe(0);
      
      if (document.body.contains(trigger)) {
        document.body.removeChild(trigger);
      }
    });
  });
});
