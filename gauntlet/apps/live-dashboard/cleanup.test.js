import { describe, it, expect } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import './dashboard.js';

describe('Live Dashboard Cleanup Proof', () => {
  it('cleans up reactive effects when disconnected', async () => {
    const element = document.createElement('sample-dashboard');
    document.body.appendChild(element);
    
    await flushMicrotasks();
    
    expect(element._cleanups.length).toBeGreaterThan(0);
    
    document.body.removeChild(element);
    await flushMicrotasks();
    
    // Garbage collection array should be emptied by base class
    expect(element._cleanups.length).toBe(0);
  });
});
