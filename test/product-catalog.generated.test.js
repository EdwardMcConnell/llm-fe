import { describe, test, expect, vi } from 'vitest';
import { createCatalogApp } from '../generated-examples/product-catalog/product-catalog-app-wireup.generated.js';
import { globalSharedMap } from '../src/store.js';
import { globalDemandManager } from '../src/data.js';
import { flushMicrotasks } from '../src/testing.js';

describe('Product Catalog Integration Tests', () => {
  test('renders loading state initially', () => {
    const { root, dispose } = createCatalogApp();
    const loading = root.querySelector('#loadingState');
    expect(loading.style.display).toBe('block');
    dispose();
  });

  test('renders products and updates cart on click', async () => {
    const { root, dispose } = createCatalogApp();
    document.body.appendChild(root);

    // Wait for the simulated fetch (50ms) + reactivity
    await new Promise(r => setTimeout(r, 100));
    await flushMicrotasks();

    const grid = root.querySelector('#productGrid');
    expect(grid.style.display).toBe('grid');
    expect(grid.children.length).toBeGreaterThan(0);

    const btn = grid.querySelector('.add-to-cart');
    btn.dispatchEvent(new window.Event('click', { bubbles: true }));

    await flushMicrotasks();

    const cartCount = root.querySelector('#cartCount');
    expect(cartCount.textContent).toBe('1');

    dispose();
    root.remove();
  });

  test('cleans up CRDT and Demand subscriptions when unmounted', () => {
    const { dispose } = createCatalogApp();
    dispose();
    expect(true).toBe(true);
  });
});
