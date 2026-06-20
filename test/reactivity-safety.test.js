import { describe, it, expect } from 'vitest';
import { createSignal, createEffect } from '../src/reactivity.js';

describe('Reactivity Safety Rules', () => {
  it('throws an error if an effect attempts to write to a signal without permission', () => {
    const [count, setCount] = createSignal(0);
    
    expect(() => {
      createEffect(() => {
        // Reads count, then writes. This is a common infinite loop anti-pattern.
        setCount(count() + 1);
      });
    }).toThrow('[Fe UI Dev] Signal write detected inside an active effect');
  });

  it('allows signal writes inside effects if explicitly opted in', () => {
    const [count, setCount] = createSignal(0);
    let runCount = 0;
    
    // Explicit opt in
    createEffect(() => {
      runCount++;
      if (count() < 3) {
        setCount(count() + 1);
      }
    }, { allowSignalWrites: true });

    expect(count()).toBe(3);
    expect(runCount).toBe(4); // 0, 1, 2, 3
  });

  it('allows asynchronous writes inside an effect (not in the active stack)', async () => {
    const [count, setCount] = createSignal(0);
    
    createEffect(() => {
      const val = count();
      if (val === 0) {
        queueMicrotask(() => {
          setCount(val + 1);
        });
      }
    });

    // Wait for microtask
    await new Promise(resolve => queueMicrotask(resolve));
    expect(count()).toBe(1);
  });
});
