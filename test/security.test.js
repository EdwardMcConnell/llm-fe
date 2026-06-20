import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createKanbanCard } from '../generated-examples/normalized-kanban/kanban-card.generated.js';

describe('Security Trust Boundary Tests (Level 4 Maturity)', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body><div id="app"></div></body>', {
      url: 'http://localhost'
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.HTMLElement = window.HTMLElement;
    global.customElements = window.customElements;
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.customElements;
  });

  it('Direct DOM patcher is immune to Cross-Site Scripting (XSS) via injected CRDT state', () => {
    const container = document.getElementById('app');
    const maliciousPayload = '<script>window.XSS_TRIGGERED = true;</script><img src="x" onerror="window.XSS_TRIGGERED=true" />';
    
    const mockState = {
      id: 'card-1',
      title: maliciousPayload,
      description: maliciousPayload
    };

    // The generated kanban card will mount and patch its nodes
    // Using this.nodes.get('title').textContent = title
    // This should safely encode the payload as text, not HTML.
    const cardObj = createKanbanCard(mockState);
    container.appendChild(cardObj.root);

    // Verify the payload exists as text, not as elements
    const titleEl = container.querySelector('.card-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe(maliciousPayload);
    expect(titleEl.innerHTML).not.toContain('<script>');
    
    // HTML should be escaped
    expect(titleEl.innerHTML).toContain('&lt;script&gt;');

    // Global should not have been mutated
    expect(window.XSS_TRIGGERED).toBeUndefined();

    cardObj.dispose();
  });
});
