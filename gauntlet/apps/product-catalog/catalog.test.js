import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import { globalSharedMap } from '../../../src/store.js';
import { globalDemandManager } from '../../../src/data.js';
import './catalog.js';

describe('Product Catalog', () => {
  let element;

  beforeEach(() => {
    globalSharedMap.state.clear();
    globalSharedMap.clocks.clear();
    globalDemandManager.inFlight.clear();
    
    element = document.createElement('sample-catalog');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  });

  it('renders loading state initially', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    expect(shadow.querySelector('.loading-state')).toBeTruthy();
  });

  it('renders products and updates cart on click', async () => {
    await flushMicrotasks();
    
    // Simulate async data load
    await new Promise(r => setTimeout(r, 60));
    await flushMicrotasks();
    
    const shadow = element.shadowRoot;
    const cards = shadow.querySelectorAll('.product-card');
    expect(cards.length).toBe(4);
    
    // Add to cart
    const btn = cards[0].querySelector('.add-to-cart');
    btn.click();
    
    await flushMicrotasks();
    expect(shadow.querySelector('#cartCount').textContent).toBe('1');
    expect(globalSharedMap.get('cart:items')).toEqual(['p1']);
  });
});
