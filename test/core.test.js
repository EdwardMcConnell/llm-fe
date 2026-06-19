import { describe, it, expect } from 'vitest';
import { createSignal, createEffect } from '../src/reactivity.js';
import { FeElement } from '../src/component.js';

describe('Reactivity System', () => {
  it('should get and set signal values', () => {
    const [getCount, setCount] = createSignal(0);
    expect(getCount()).toBe(0);
    setCount(1);
    expect(getCount()).toBe(1);
  });

  it('should run effects when signals change', () => {
    const [getCount, setCount] = createSignal(0);
    let effectRan = 0;
    
    createEffect(() => {
      getCount(); // Subscribe
      effectRan++;
    });

    expect(effectRan).toBe(1); // Runs immediately on creation
    
    setCount(1);
    expect(effectRan).toBe(2);
    
    setCount(1); // Value didn't change
    expect(effectRan).toBe(2);
  });
});

describe('FeElement Component Base', () => {
  // Create a mock component using the LLM "instruction manual" pattern
  class TestCounter extends FeElement {
    constructor() {
      super();
      this.count = createSignal(0);
    }

    template() {
      return `
        <div>
          <span id="counter-value"></span>
          <button id="increment-btn">Increment</button>
        </div>
      `;
    }

    bind() {
      const [getCount, setCount] = this.count;

      this.bindText('#counter-value', () => getCount().toString());
      this.bindEvent('#increment-btn', 'click', () => setCount(prev => prev + 1));
    }
  }

  customElements.define('test-counter', TestCounter);

  it('should render and bind signals to DOM updates', () => {
    const el = document.createElement('test-counter');
    document.body.appendChild(el);

    // Give Custom Element a moment to mount
    const root = el.shadowRoot;
    const valueSpan = root.querySelector('#counter-value');
    const btn = root.querySelector('#increment-btn');

    expect(valueSpan.textContent).toBe('0');

    // Simulate click
    btn.click();
    
    expect(valueSpan.textContent).toBe('1');
    
    document.body.removeChild(el);
  });
});
