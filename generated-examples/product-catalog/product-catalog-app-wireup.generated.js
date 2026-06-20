// Compiled deterministically from product-catalog App IR
import { createProductCatalog } from './product-catalog.generated.js';
import { createProductCard } from './product-card.generated.js';
import { globalSharedMap } from '/src/store.js';
import { createEffect } from '/src/reactivity.js';
import { globalDemandManager } from '/src/data.js';

export function createCatalogApp(sharedMap = globalSharedMap) {
  const [getProducts] = globalDemandManager.demand(sharedMap, 'catalog:products', async () => {
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
      const currentCart = sharedMap.get('cart:items') || [];
       sharedMap.set('cart:items', [...currentCart, id]);
    }
  }

  const app = createProductCatalog({}, handleEvent);
  const initialCart = sharedMap.get('cart:items') || [];
  app.patch({ cartCount: initialCart.length });

  const productInstances = new Map();

  function patchProduct(statePatch) {
    const id = statePatch.id;
    let instance = productInstances.get(id);
    if (!instance) {
      instance = createProductCard(statePatch, handleEvent);
      productInstances.set(id, instance);
      if (instance.root) instance.root.dataset.id = id;
    } else {
      instance.patch(statePatch);
    }
    app.insertProducts(id, instance);
  }

  function removeProduct(id) {
    const instance = productInstances.get(id);
    if (instance) {
      instance.dispose();
      if (app.removeProducts) app.removeProducts(id);
      productInstances.delete(id);
    }
  }

  const cleanups = [];
  cleanups.push(createEffect(() => {
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
      patchProduct(product);
    }
    
    app.patch({ productsIndex: currentIds });
  }));

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key === 'cart:items') {
        app.patch({ cartCount: val.length });
      }
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key === 'cart:items') {
      if (val !== undefined) app.patch({ cartCount: val.length });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const instance of productInstances.values()) instance.dispose();
      productInstances.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
