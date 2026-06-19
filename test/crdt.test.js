import { describe, it, expect, vi } from 'vitest';
import { SharedMap } from '../src/crdt.js';
import { createSharedSignal } from '../src/shared.js';
import { createEffect } from '../src/reactivity.js';

describe('LLM-Native JSON CRDT (SharedMap)', () => {
  it('should generate patches locally and increment clock', () => {
    const map = new SharedMap('client-A');
    const patches = [];
    map.onPatch(p => patches.push(p));

    map.set('title', 'Hello');
    
    expect(map.clock).toBe(1);
    expect(map.get('title')).toBe('Hello');
    expect(patches.length).toBe(1);
    expect(patches[0]).toEqual({
      type: 'set',
      key: 'title',
      value: 'Hello',
      clock: 1,
      client: 'client-A'
    });
  });

  it('should resolve conflicts using LWW (Last-Write-Wins) by Clock', () => {
    const mapA = new SharedMap('client-A');
    const mapB = new SharedMap('client-B');

    // B sets title at clock 10
    mapB.clock = 9;
    mapB.set('title', 'From B');

    // A receives B's patch
    mapA.merge({ type: 'set', key: 'title', value: 'From B', clock: 10, client: 'client-B' });
    
    expect(mapA.get('title')).toBe('From B');
    expect(mapA.clock).toBe(10); // A's clock syncs forward
    
    // A sets title, clock becomes 11
    mapA.set('title', 'From A');
    expect(mapA.get('title')).toBe('From A');
    expect(mapA.clock).toBe(11);
  });

  it('should resolve ties using ClientID string comparison', () => {
    const map = new SharedMap('client-A');
    
    // Current local state
    map.set('title', 'Local Title'); // clock is 1
    
    // Remote sends a patch with exactly the same clock (1) but a higher ClientID string 'client-B'
    map.merge({ type: 'set', key: 'title', value: 'Remote Title', clock: 1, client: 'client-B' });
    
    // 'client-B' > 'client-A', so remote wins
    expect(map.get('title')).toBe('Remote Title');
  });

  it('should NOT resolve ties if local ClientID is higher', () => {
    const map = new SharedMap('client-Z');
    
    map.set('title', 'Local Title'); // clock is 1
    
    // Remote sends patch with clock 1, but 'client-A' < 'client-Z'
    map.merge({ type: 'set', key: 'title', value: 'Remote Title', clock: 1, client: 'client-A' });
    
    // 'client-Z' > 'client-A', so local wins
    expect(map.get('title')).toBe('Local Title');
  });
});

describe('SharedSignal', () => {
  it('should sync Signal state with CRDT state transparently', () => {
    const map = new SharedMap('client-A');
    const [getTitle, setTitle] = createSharedSignal(map, 'title', 'Initial');
    
    // Initial value sets the CRDT
    expect(map.get('title')).toBe('Initial');
    
    // Reactive setter updates CRDT
    setTitle('Updated');
    expect(map.get('title')).toBe('Updated');
    
    // Remote patch automatically updates local Signal
    let effectFired = 0;
    createEffect(() => {
      getTitle();
      effectFired++;
    });
    
    expect(effectFired).toBe(1); // Fired on creation
    
    // Simulate incoming LCP patch
    map.merge({ type: 'set', key: 'title', value: 'From Network', clock: 10, client: 'client-B' });
    
    expect(getTitle()).toBe('From Network');
    expect(effectFired).toBe(2); // Reactivity engine picked up the network change
  });
});

describe('CRDT Memory Garbage Collector (Phase 10)', () => {
  it('should track subscribers natively when createSharedSignal is used', () => {
    const map = new SharedMap('client-A');
    
    // Subscriber count should increment
    const [, , unsubscribe] = createSharedSignal(map, 'invoices', []);
    expect(map.subscribers.get('invoices')).toBe(1);

    // Multiple signals on the same key
    const [, , unsubscribe2] = createSharedSignal(map, 'invoices', []);
    expect(map.subscribers.get('invoices')).toBe(2);

    unsubscribe();
    expect(map.subscribers.get('invoices')).toBe(1);

    unsubscribe2();
    expect(map.subscribers.get('invoices')).toBe(0);
  });

  it('should autonomously evict idle keys when GC Sweeper runs', () => {
    const map = new SharedMap('client-A');
    vi.useFakeTimers();

    map.set('temp_data', 'Hello World');
    
    // Simulate a component subscribing, then immediately unmounting
    map.incrementSubscriber('temp_data');
    map.decrementSubscriber('temp_data');

    let evicted = false;
    map.onEvict((key) => {
      if (key === 'temp_data') evicted = true;
    });

    // Start GC with 5-minute timeout, sweeping every 1 minute
    map.startGarbageCollector(300000, 60000);

    // Fast-forward 2 minutes
    vi.advanceTimersByTime(120000);
    expect(map.get('temp_data')).toBe('Hello World'); // Still in memory!

    // Fast-forward 4 more minutes (Total: 6 minutes idle)
    vi.advanceTimersByTime(240000);
    
    // GC should have fired
    expect(map.get('temp_data')).toBeUndefined();
    expect(evicted).toBe(true);

    vi.useRealTimers();
  });
});
