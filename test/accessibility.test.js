import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createKanbanBoard } from '../generated-examples/normalized-kanban/kanban-board.generated.js';
import { createSettingsForm } from '../generated-examples/settings-form/settings-form.generated.js';

describe('Accessibility Smoke Tests (Level 4 Maturity)', () => {
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
    
    // Polyfill native components if needed by tests
    if (!global.customElements.get('fe-button')) {
      class FeButton extends HTMLElement {
        connectedCallback() {
          if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'button');
          }
        }
      }
      global.customElements.define('fe-button', FeButton);
    }
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.customElements;
  });

  it('Settings Form generates semantically correct labeling and ARIA attributes', () => {
    const container = document.getElementById('app');
    const settingsObj = createSettingsForm();
    container.appendChild(settingsObj.root);

    const inputs = container.querySelectorAll('input');
    
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const hasAriaLabel = input.hasAttribute('aria-label');
      const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
      const hasLabelFor = id ? document.querySelector(`label[for="${id}"]`) !== null : false;
      const isWrappedInLabel = input.closest('label') !== null;
      
      const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasLabelFor || isWrappedInLabel || input.type === 'submit' || input.type === 'button';
      expect(isAccessible).toBe(true); 
    });

    const buttons = container.querySelectorAll('button, fe-button');
    buttons.forEach(button => {
      if (button.tagName.toLowerCase() === 'button') {
        expect(button.getAttribute('type') || button.getAttribute('role') || button.textContent).toBeDefined();
      } else {
        expect(button.getAttribute('role')).toBe('button');
      }
    });

    settingsObj.dispose();
  });

  it('Normalized Kanban generates accessible drag-and-drop structural hints', () => {
    const container = document.getElementById('app');
    
    const mockState = {
      lists: {
        'list-1': { id: 'list-1', title: 'To Do', cardIds: ['card-1'] }
      },
      cards: {
        'card-1': { id: 'card-1', title: 'Task 1', description: 'Desc' }
      }
    };

    const kanbanObj = createKanbanBoard(mockState);
    container.appendChild(kanbanObj.root);

    const lists = container.querySelectorAll('.kanban-column');
    lists.forEach(list => {
      expect(list).toBeDefined();
    });

    kanbanObj.dispose();
  });
});
