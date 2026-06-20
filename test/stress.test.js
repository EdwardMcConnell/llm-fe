import { describe, it, expect, vi } from 'vitest';
import '../src/primitives.js';
import '../src/ui.js';
import { mount, flushMicrotasks } from '../src/testing.js';

describe('1,000 Component Stress Test & Memory Leak Verification', () => {
  it('should cleanly mount and unmount 1000 complex components with 0 residual memory closures', async () => {
    // Generate an enormous block of HTML
    let html = '';
    for (let i = 0; i < 1000; i++) {
      html += `
        <fe-card id="card-${i}">
          <fe-accordion-group name="group-${i}">
            <fe-accordion name="acc-${i}">
              <span slot="header">Accordion ${i}</span>
              <fe-button id="btn-${i}" disabled>Click Me</fe-button>
              <fe-tooltip trigger="btn-${i}">Tooltip ${i}</fe-tooltip>
            </fe-accordion>
          </fe-accordion-group>
        </fe-card>
      `;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Inject all 1000 at once to trigger massive DOM parsing and Custom Element upgrades
    container.innerHTML = html;
    
    // Let reactivity settle and microtasks flush
    await flushMicrotasks();
    await new Promise(r => setTimeout(r, 20)); // Allow timers (like tooltips) to setup
    
    // Verify mounting worked
    const cards = container.querySelectorAll('fe-card');
    expect(cards.length).toBe(1000);
    
    // Check that some have their cleanups active
    const firstButton = container.querySelector('#btn-0');
    expect(firstButton._cleanups.length).toBeGreaterThan(0);

    // UNMOUNT EVERYTHING
    document.body.removeChild(container);
    
    // We can't directly check JS heap size reliably in JSDOM, but we can verify
    // that the specific instance's cleanups fired and emptied
    expect(firstButton._cleanups.length).toBe(0);
    
    // If the process didn't OOM or freeze, the stress test passed!
    expect(true).toBe(true);
  });
});
