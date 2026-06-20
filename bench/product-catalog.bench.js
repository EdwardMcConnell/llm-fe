import { bench, describe } from 'vitest';
import { createCatalogApp } from '../generated-examples/product-catalog/product-catalog-app-wireup.generated.js';
import { globalSharedMap } from '../src/store.js';

describe('Product Catalog Benchmarks', () => {
  bench('Mount Catalog Component', () => {
    const app = createCatalogApp();
    app.dispose();
  });

  const app = createCatalogApp();
  
  bench('Patch Cart State Reactively', () => {
    globalSharedMap.set('cart:items', ['p1', 'p2', 'p3', 'p4', 'p' + Math.random()]);
  });

  bench('Dispose Catalog', () => {
    const tempApp = createCatalogApp();
    tempApp.dispose();
  });
});
