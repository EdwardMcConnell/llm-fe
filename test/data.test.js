import { describe, it, expect, vi } from 'vitest';
import { globalDemandManager } from '../src/data.js';
import { SharedMap } from '../src/crdt.js';

describe('Anti-Corruption Data Layer (DemandManager)', () => {
  it('should fetch data and store it in the CRDT', async () => {
    const map = new SharedMap('test-client');
    let fetchCount = 0;
    
    // Mock LLM resolver that pretends to hit an API
    const fetcher = async () => {
      fetchCount++;
      return new Promise(resolve => setTimeout(() => resolve({ name: 'Clean Data' }), 50));
    };

    const [getData] = globalDemandManager.demand(map, 'user:1', fetcher);
    
    // Initial state is null while fetching
    expect(getData()).toBeNull();
    
    // Wait for fetch to complete
    await new Promise(r => setTimeout(r, 60));
    
    // Data is now populated
    expect(getData()).toEqual({ name: 'Clean Data' });
    expect(map.get('user:1')).toEqual({ name: 'Clean Data' });
    expect(fetchCount).toBe(1);
  });

  it('should deduplicate simultaneous demands for the same key', async () => {
    const map = new SharedMap('test-client');
    let fetchCount = 0;
    
    // Slow fetcher
    const fetcher = async () => {
      fetchCount++;
      return new Promise(resolve => setTimeout(() => resolve({ name: 'Dedupe' }), 50));
    };

    // Simulate 3 components mounting at the exact same time and demanding the same data
    const [get1] = globalDemandManager.demand(map, 'user:2', fetcher);
    const [get2] = globalDemandManager.demand(map, 'user:2', fetcher);
    const [get3] = globalDemandManager.demand(map, 'user:2', fetcher);
    
    // Wait for the single fetch to complete
    await new Promise(r => setTimeout(r, 60));
    
    // All components receive the resolved data
    expect(get1()).toEqual({ name: 'Dedupe' });
    expect(get2()).toEqual({ name: 'Dedupe' });
    expect(get3()).toEqual({ name: 'Dedupe' });
    
    // Crucially, the network was only hit ONCE
    expect(fetchCount).toBe(1);
  });

  it('should immediately return cached data without fetching if it exists in CRDT', async () => {
    const map = new SharedMap('test-client');
    let fetchCount = 0;
    
    const fetcher = async () => {
      fetchCount++;
      return { name: 'Never Called' };
    };

    // Pre-populate the cache (e.g. from an earlier fetch or network sync)
    map.set('user:3', { name: 'Cached Data' });

    // Demand the data
    const [getData] = globalDemandManager.demand(map, 'user:3', fetcher);

    // Assert it returns synchronously
    expect(getData()).toEqual({ name: 'Cached Data' });
    expect(fetchCount).toBe(0);
  });
});
