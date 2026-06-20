import { FeElement } from '/src/component.js';
import { globalSharedMap } from '/src/store.js';
import { globalDemandManager } from '/src/data.js';
import { createEffect } from '/src/reactivity.js';
import '/src/primitives.js';

/**
 * Product Catalog
 * Demonstrates async data fetching with demandData, lazy-loading, and CRDT-backed shopping cart.
 */
export class SampleCatalog extends FeElement {
  static get tag() { return 'sample-catalog'; }

  constructor() {
    super();
    this.nodes = new Map();
  }

  template() {
    return `
      <style>
        :host {
          display: block;
          padding: 2rem;
          background: var(--surface-1);
          color: var(--text-primary);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .header h2 {
          margin: 0;
          color: var(--brand-primary);
        }
        .cart-badge {
          background: var(--brand-primary);
          color: var(--text-inverse);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2rem;
        }
        .product-card {
          background: var(--surface-2);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .product-image-container {
          width: 100%;
          aspect-ratio: 1;
          background: var(--surface-3);
          border-radius: var(--radius-md);
          overflow: hidden;
          position: relative;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .product-image.loaded {
          opacity: 1;
        }
        .product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .product-title {
          font-weight: 600;
          font-size: 1.125rem;
          margin: 0;
        }
        .product-price {
          color: var(--brand-primary);
          font-weight: 700;
          font-size: 1.25rem;
        }
        .add-to-cart {
          margin-top: auto;
          width: 100%;
        }
        
        .loading-state, .error-state {
          text-align: center;
          padding: 4rem;
          color: var(--text-secondary);
        }
      </style>

      <div class="header">
        <h2>Product Catalog</h2>
        <div class="cart-badge">
          Cart: <span id="cartCount">0</span>
        </div>
      </div>

      <div id="contentArea"></div>
    `;
  }

  bind() {
    this.nodes.set('cartCount', this.root.querySelector('#cartCount'));
    this.nodes.set('contentArea', this.root.querySelector('#contentArea'));

    // 1. Fetch data using demandData
    const [getProducts] = this.demandData('catalog:products', async () => {
      // Mock fetch
      return new Promise(resolve => {
        setTimeout(() => {
          resolve([
            { id: 'p1', title: 'Ergonomic Keyboard', price: 129.99, img: 'https://placehold.co/400x400/png?text=Keyboard' },
            { id: 'p2', title: 'Wireless Mouse', price: 59.99, img: 'https://placehold.co/400x400/png?text=Mouse' },
            { id: 'p3', title: 'Ultra HD Monitor', price: 349.99, img: 'https://placehold.co/400x400/png?text=Monitor' },
            { id: 'p4', title: 'USB-C Hub', price: 45.00, img: 'https://placehold.co/400x400/png?text=Hub' }
          ]);
        }, 50);
      });
    });

    // 2. Sync Cart from CRDT
    globalSharedMap.incrementSubscriber('cart:items');
    this._cleanups.push(() => globalSharedMap.decrementSubscriber('cart:items'));

    const unsub = globalSharedMap.subscribe((key, value) => {
      if (key === 'cart:items') {
        const items = value || [];
        this.nodes.get('cartCount').textContent = items.length.toString();
      }
    });
    this._cleanups.push(unsub);
    
    // Initial cart load
    const initialCart = globalSharedMap.get('cart:items') || [];
    this.nodes.get('cartCount').textContent = initialCart.length.toString();

    // 3. Render Catalog Reactively
    const disposer = createEffect(() => {
      const products = getProducts();
      const contentArea = this.nodes.get('contentArea');

      if (!products) {
        contentArea.innerHTML = '<div class="loading-state">Loading products...</div>';
        return;
      }

      if (products.error) {
        contentArea.innerHTML = '<div class="error-state">Failed to load products.</div>';
        return;
      }

      // Render Grid
      contentArea.innerHTML = '<div class="grid"></div>';
      const grid = contentArea.querySelector('.grid');

      for (const product of products) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <div class="product-image-container">
            <!-- Using native lazy loading for performance -->
            <img src="${product.img}" alt="${product.title}" loading="lazy" class="product-image" onload="this.classList.add('loaded')">
          </div>
          <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <span class="product-price">$${product.price.toFixed(2)}</span>
          </div>
          <fe-button class="add-to-cart" data-id="${product.id}">Add to Cart</fe-button>
        `;
        
        // Add to cart event binding
        const btn = card.querySelector('.add-to-cart');
        btn.addEventListener('click', () => {
          const currentCart = globalSharedMap.get('cart:items') || [];
          globalSharedMap.set('cart:items', [...currentCart, product.id]);
        });

        grid.appendChild(card);
      }
    });
    this._cleanups.push(disposer);
  }
}

customElements.define('sample-catalog', SampleCatalog);
