import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import './dashboard.js';

describe('Live Dashboard', () => {
  let element;

  beforeEach(() => {
    // Reset global state
    globalSharedMap.state.clear();
    globalSharedMap.clocks.clear();
    
    // Create element
    element = document.createElement('sample-dashboard');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  });

  it('renders initial dashboard metrics at 0', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    expect(shadow.querySelector('#cpuValue').textContent).toBe('0.0%');
    expect(shadow.querySelector('#memoryValue').textContent).toBe('0.0%');
    expect(shadow.querySelector('#usersValue').textContent).toBe('0');
  });

  it('updates DOM reactively when shared map changes', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    // Simulate high frequency push
    globalSharedMap.set('dashboard:cpu', 45.5);
    globalSharedMap.set('dashboard:memory', 72.0);
    globalSharedMap.set('dashboard:users', 120);
    
    await flushMicrotasks();
    
    expect(shadow.querySelector('#cpuValue').textContent).toBe('45.5%');
    expect(shadow.querySelector('#cpuBar').style.width).toBe('45.5%');
    expect(shadow.querySelector('#cpuBar').className).toBe('bar-fill'); // not warning/danger
    
    expect(shadow.querySelector('#memoryValue').textContent).toBe('72.0%');
    expect(shadow.querySelector('#memoryBar').style.width).toBe('72%');
    expect(shadow.querySelector('#memoryBar').className).toBe('bar-fill warning');
    
    expect(shadow.querySelector('#usersValue').textContent).toBe('120');
  });

  it('applies danger class when CPU exceeds 85%', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    globalSharedMap.set('dashboard:cpu', 95.2);
    await flushMicrotasks();
    
    expect(shadow.querySelector('#cpuValue').textContent).toBe('95.2%');
    expect(shadow.querySelector('#cpuBar').className).toBe('bar-fill danger');
  });
});
