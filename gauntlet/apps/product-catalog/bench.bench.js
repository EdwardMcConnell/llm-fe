import { bench, describe } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import './catalog.js';

describe('Product Catalog Benchmarks', () => {
  bench('Mount Catalog Component', async () => {
    globalSharedMap.state.clear();
    const el = document.createElement('sample-catalog');
    document.body.appendChild(el);
    await flushMicrotasks();
    document.body.removeChild(el);
  });

  bench('Patch Cart State Reactively', async () => {
    const el = document.createElement('sample-catalog');
    document.body.appendChild(el);
    await flushMicrotasks();

    globalSharedMap.set('cart:items', ['p1', 'p2', 'p3']);
    await flushMicrotasks();

    document.body.removeChild(el);
  });

  bench('Dispose Catalog', async () => {
    const el = document.createElement('sample-catalog');
    document.body.appendChild(el);
    await flushMicrotasks();
    
    document.body.removeChild(el);
    el.disconnectedCallback();
  });
});
