import { bench, describe } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import './dashboard.js';

describe('Live Dashboard Benchmarks', () => {
  bench('Patch Dashboard High Frequency', async () => {
    const el = document.createElement('sample-dashboard');
    document.body.appendChild(el);
    await flushMicrotasks();
    
    // Simulate 100 rapid CRDT patches
    for (let i = 0; i < 100; i++) {
      globalSharedMap.set('dashboard:cpu', Math.random() * 100);
      globalSharedMap.set('dashboard:memory', Math.random() * 100);
      globalSharedMap.set('dashboard:users', Math.floor(Math.random() * 5000));
      await flushMicrotasks();
    }
    
    document.body.removeChild(el);
  });
});
