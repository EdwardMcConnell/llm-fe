// Compiled deterministically from Product Catalog App IR
import { createProductCatalog } from './product-catalog.generated.js';
import { createProductCard } from './product-card.generated.js';
import { globalSharedMap } from '/src/store.js';
import { createEffect } from '/src/reactivity.js';
import { globalDemandManager } from '/src/data.js';

export function createCatalogApp() {
  const app = createProductCatalog({});
  const cards = new Map();

  // 1. Fetch data using demandData
  const [getProducts] = globalDemandManager.demand(globalSharedMap, 'catalog:products', async () => {
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

  function handleEvent(ev) {
    if (ev.type === 'catalog:add_to_cart') {
       const id = ev.sourceEvent.target.closest('[data-node="root"]')?.dataset?.id;
       if (!id) return;
       const currentCart = globalSharedMap.get('cart:items') || [];
       globalSharedMap.set('cart:items', [...currentCart, id]);
    }
  }

  // 2. React to CRDT cart state
  const cleanups = [];
  
  globalSharedMap.incrementSubscriber('cart:items');
  cleanups.push(() => globalSharedMap.decrementSubscriber('cart:items'));

  const unsub = globalSharedMap.subscribe((key, value) => {
    if (key === 'cart:items') {
      app.patch({ cartCount: (value || []).length });
    }
  });
  cleanups.push(unsub);
  
  const initialCart = globalSharedMap.get('cart:items') || [];
  app.patch({ cartCount: initialCart.length });

  // 3. Render Catalog Reactively
  const disposer = createEffect(() => {
    const products = getProducts();

    if (!products) {
      app.patch({ showLoading: true, showError: false, showGrid: false });
      return;
    }

    if (products.error) {
      app.patch({ showLoading: false, showError: true, showGrid: false });
      return;
    }

    app.patch({ showLoading: false, showError: false, showGrid: true });

    const currentIds = products.map(p => p.id);
    for (const product of products) {
      let card = cards.get(product.id);
      if (!card) {
        card = createProductCard(product, handleEvent);
        // Bind dataset id for event handling mapping
        card.root.dataset.id = product.id;
        cards.set(product.id, card);
        app.insertProducts(product.id, card);
      } else {
        card.patch(product);
      }
    }
    
    app.patch({ productsIndex: currentIds });
  });
  cleanups.push(disposer);

  return {
    root: app.root,
    dispose: () => {
      for (const card of cards.values()) card.dispose();
      cards.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
