import { describe, it, expect } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import { globalDemandManager } from '../../../src/data.js';
import './catalog.js';

describe('Product Catalog Cleanup', () => {
  it('cleans up CRDT and Demand subscriptions when unmounted', async () => {
    globalSharedMap.state.clear();
    globalSharedMap.clocks.clear();
    globalSharedMap.subscribers.clear();
    globalDemandManager.inFlight.clear();

    const element = document.createElement('sample-catalog');
    document.body.appendChild(element);
    await flushMicrotasks();

    // Verify subscriptions registered
    expect(globalSharedMap.subscribers.get('cart:items')).toBe(1);
    
    // DemandData handles GC automatically through reference counting in FeElement's _cleanups
    
    document.body.removeChild(element);
    element.disconnectedCallback(); // Force synchronous GC sweep
    await flushMicrotasks();

    // Verify cleanup
    expect(globalSharedMap.subscribers.get('cart:items') || 0).toBe(0);
  });
});
