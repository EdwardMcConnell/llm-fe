import { describe, it, expect } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import './settings.js';

describe('Settings Cleanup Proof', () => {
  it('cleans up reactive effects when disconnected', async () => {
    const element = document.createElement('sample-settings');
    document.body.appendChild(element);
    
    await flushMicrotasks();
    
    // The form creates multiple reactive effects and listeners
    expect(element._cleanups.length).toBeGreaterThan(0);
    
    document.body.removeChild(element);
    await flushMicrotasks();
    
    // Cleanup must be drained
    expect(element._cleanups.length).toBe(0);
  });
});
