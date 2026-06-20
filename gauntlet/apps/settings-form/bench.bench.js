import { bench, describe } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import './settings.js';

describe('Gauntlet App: Settings Form Benchmarks', () => {
  let element;

  bench('Render Form (Mount)', async () => {
    element = document.createElement('sample-settings');
    document.body.appendChild(element);
    await flushMicrotasks();
    document.body.removeChild(element);
  }, { time: 500 });

  let mountedElement;
  let usernameInput;

  bench('Patch Form Field (Hot Path)', async () => {
    if (!mountedElement) {
      mountedElement = document.createElement('sample-settings');
      document.body.appendChild(mountedElement);
      await flushMicrotasks();
      usernameInput = mountedElement.shadowRoot.querySelector('#usernameInput');
    }
    
    // Simulate user typing
    usernameInput.value = 'user' + Math.random();
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();
  }, { time: 500 });
});
