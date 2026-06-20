import { bench, describe } from 'vitest';
import { createSignal, createEffect } from '../src/reactivity.js';

describe('Reactivity Performance Proof', () => {
  bench('Signal updates (1000 subscribers)', () => {
    const [getCount, setCount] = createSignal(0);
    const cleanups = [];
    
    // Subscribe 1000 effects
    for (let i = 0; i < 1000; i++) {
      cleanups.push(createEffect(() => {
        getCount();
      }));
    }

    // Trigger an update
    setCount(prev => prev + 1);

    // Clean up
    cleanups.forEach(c => c());
  });

  bench('Nested Signal dependency tracking', () => {
    const [getA, setA] = createSignal(1);
    const [getB, setB] = createSignal(2);
    const [getC, setC] = createSignal(3);
    
    const dispose = createEffect(() => {
      const a = getA();
      if (a % 2 === 0) {
        getB();
      } else {
        getC();
      }
    });

    setA(prev => prev + 1);
    setA(prev => prev + 1);

    dispose();
  });
});
