import fs from 'fs';
import path from 'path';

const appContractPath = process.argv[2];

if (!appContractPath) {
  console.error("Usage: node generator/app-generator.js <path-to-app-contract.json>");
  process.exit(1);
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function generateApp() {
  const appContract = loadJson(appContractPath);
  const appName = appContract.app;
  const outDir = 'generated-examples/' + appName;
  fs.mkdirSync(outDir, { recursive: true });

  const appIr = loadJson(`ir/${appName}.ir.json`);
  
  if (appName === 'normalized-kanban') {
    const { generateComponent, validateRuntimeAPI } = await import('./index.js');
    const cardIr = loadJson('ir/kanban-card.ir.json');
    validateRuntimeAPI(cardIr);
    generateComponent(
      loadJson('contracts/kanban-card.contract.json'), 
      cardIr, 
      'contracts/kanban-card.contract.json', 
      'ir/kanban-card.ir.json', 
      path.join(outDir, 'kanban-card.generated.js')
    );

    validateRuntimeAPI(appIr);
    for (const comp of appIr.components) {
      if (comp.name === 'kanban-column') {
        generateComponent(
          loadJson('contracts/kanban-column.contract.json'), 
          comp, 
          'contracts/kanban-column.contract.json', 
          'ir/normalized-kanban.ir.json', 
          path.join(outDir, 'kanban-column.generated.js')
        );
      }
      if (comp.name === 'kanban-board') {
        generateComponent(
          loadJson('contracts/kanban-board.contract.json'), 
          comp, 
          'contracts/kanban-board.contract.json', 
          'ir/normalized-kanban.ir.json', 
          path.join(outDir, 'kanban-board.generated.js')
        );
      }
    }

    generateStateFromIR(outDir);
    generateAppWireupFromIR(appIr.app, outDir);
    generateValidators(outDir);
  } else if (appName === 'live-dashboard') {
    const { generateComponent, validateRuntimeAPI } = await import('./index.js');
    const widgetIr = loadJson('ir/live-dashboard-widget.ir.json');
    validateRuntimeAPI(widgetIr);
    generateComponent(
      loadJson('contracts/live-dashboard-widget.contract.json'), 
      widgetIr, 
      'contracts/live-dashboard-widget.contract.json', 
      'ir/live-dashboard-widget.ir.json', 
      path.join(outDir, 'live-dashboard-widget.generated.js')
    );

    validateRuntimeAPI(appIr);
    generateComponent(
      loadJson('contracts/live-dashboard-app.contract.json'), 
      appIr, 
      'contracts/live-dashboard-app.contract.json', 
      'ir/live-dashboard-app.ir.json', 
      path.join(outDir, 'live-dashboard-app.generated.js')
    );

    generateDashboardAppWireup(outDir);
  } else if (appName === 'settings-form') {
    const { generateComponent, validateRuntimeAPI } = await import('./index.js');
    validateRuntimeAPI(appIr);
    generateComponent(
      appContract, 
      appIr, 
      appContractPath, 
      `ir/settings-form.ir.json`, 
      path.join(outDir, 'settings-form.generated.js')
    );
    generateSettingsFormWireup(outDir);
  } else if (appName === 'data-grid') {
    const { generateDataGrid } = await import('./data-grid-generator.js');
    generateDataGrid(appContract, appIr, outDir);
  } else if (appName === 'product-catalog') {
    const { generateComponent, validateRuntimeAPI } = await import('./index.js');
    const cardIr = loadJson('ir/product-card.ir.json');
    validateRuntimeAPI(cardIr);
    generateComponent(
      loadJson('contracts/product-card.contract.json'), 
      cardIr, 
      'contracts/product-card.contract.json', 
      'ir/product-card.ir.json', 
      path.join(outDir, 'product-card.generated.js')
    );

    validateRuntimeAPI(appIr);
    generateComponent(
      appContract, 
      appIr, 
      appContractPath, 
      'ir/product-catalog.ir.json', 
      path.join(outDir, 'product-catalog.generated.js')
    );

    generateProductCatalogWireup(outDir);
  }
}

function generateAppWireupFromIR(appIr, outDir) {
  let code = `// Compiled deterministically from ${appIr.name} App IR
import { createKanbanBoard } from './kanban-board.generated.js';
import { createKanbanCard } from './kanban-card.generated.js';
import { applyItemEdit, applyItemMove, applyItemDelete, createInitialBoardState } from './kanban-state.generated.js';
import { safeText } from './kanban-validators.generated.js';

export function createKanbanApp(sharedMap) {
  createInitialBoardState(sharedMap);

  function handleEvent(ev) {
    if (ev.type === 'kanban:item:edit') {
      const id = ev.sourceEvent.target.dataset.id || ev.sourceEvent.target.closest('[data-id]')?.dataset.id;
      if (!id) return;
      applyItemEdit(sharedMap, id, { title: safeText('Edited Card') });
    } else if (ev.type === 'kanban:item:delete') {
      const id = ev.sourceEvent.target.closest('[data-node="root"]')?.dataset?.id;
      if (!id) return;
      applyItemDelete(sharedMap, id);
    } else if (ev.type === 'card:dragstart') {
      const id = ev.sourceEvent.target.closest('[data-node="root"]')?.dataset?.id;
      if (!id) return;
      ev.sourceEvent.dataTransfer.setData('text/plain', id);
    } else if (ev.type === 'kanban:column:reorder') {
      applyItemMove(sharedMap, ev.itemId, ev.fromStatus, ev.toStatus, 999);
    }
  }

  const board = createKanbanBoard({}, handleEvent);
  const allCards = new Map();

  function patchItem(statePatch) {
    const id = statePatch.id;
    let card = allCards.get(id);
    if (!card) {
      card = createKanbanCard(statePatch, handleEvent);
      allCards.set(id, card);
    } else {
      card.patch(statePatch);
    }
    if (statePatch.status && board.children) {
      const colName = statePatch.status === 'in-progress' ? 'inProgressCol' : statePatch.status + 'Col';
      if (board.children[colName]) {
        board.children[colName].insertCards(id, card);
      }
    }
  }

  function reconcileColumnList(status, itemIds) {
    if (board.children) {
      const colName = status === 'in-progress' ? 'inProgressCol' : status + 'Col';
      if (board.children[colName]) {
        board.children[colName].reconcileCardsOrder(itemIds);
      }
    }
  }

  function removeItem(id) {
    const card = allCards.get(id);
    if (card) {
      card.dispose();
      for (const col of Object.values(board.children || {})) {
        if (col.removeCards) col.removeCards(id);
      }
      allCards.delete(id);
    }
  }

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('kanban:item:')) {
        patchItem(val);
      } else if (key.startsWith('kanban:column:')) {
        const parts = key.split(':');
        reconcileColumnList(parts[2], val.itemIds);
      }
    }
  };

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key.startsWith('kanban:item:')) {
      if (val) patchItem(val);
      else removeItem(key.split(':')[2]);
    } else if (key.startsWith('kanban:column:')) {
      const parts = key.split(':');
      if (val) reconcileColumnList(parts[2], val.itemIds);
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: board.root,
    dispose: () => {
      for (const card of allCards.values()) card.dispose();
      allCards.clear();
      board.dispose();
      cleanups.forEach(c => c());
    }
  };
}
`;
  fs.writeFileSync(path.join(outDir, 'kanban-app.generated.js'), code);
}

function generateValidators(outDir) {
  let code = `export function safeText(val) { return val == null ? '' : String(val); }\n`;
  code += `export function safeClassToken(val) { return val == null ? '' : String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-'); }\n`;
  code += `export function normalizeEnum(val, allowed) { return allowed.includes(val) ? val : allowed[0]; }\n`;
  fs.writeFileSync(path.join(outDir, 'kanban-validators.generated.js'), code);
}

function generateStateFromIR(outDir) {
  let code = `export function applyItemEdit(map, id, patch) {
  const key = \`kanban:item:\${id}\`;
  map.set(key, { ...(map.get(key) || { id }), ...patch });
}

export function applyItemMove(map, id, fromStatus, toStatus, toIndex) {
  const itemKey = \`kanban:item:\${id}\`;
  const item = map.get(itemKey) || { id, status: fromStatus };
  map.set(itemKey, { ...item, status: toStatus });

  const fromKey = \`kanban:column:\${fromStatus}:index\`;
  const toKey = \`kanban:column:\${toStatus}:index\`;
  
  const fromList = (map.get(fromKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
  map.set(fromKey, { itemIds: fromList });

  const toList = (map.get(toKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
  toList.splice(toIndex, 0, id);
  map.set(toKey, { itemIds: toList });
}

export function applyItemDelete(map, id) {
  const itemKey = \`kanban:item:\${id}\`;
  const item = map.get(itemKey);
  if (item && item.status) {
    const colKey = \`kanban:column:\${item.status}:index\`;
    const list = (map.get(colKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
    map.set(colKey, { itemIds: list });
  }
  map.delete(itemKey);
}

export function createInitialBoardState(map) {
  if (!map.get('kanban:board:metadata')) map.set('kanban:board:metadata', { title: 'Normalized Kanban', description: '' });
  if (!map.get('kanban:column:todo:index')) map.set('kanban:column:todo:index', { itemIds: [] });
  if (!map.get('kanban:column:in-progress:index')) map.set('kanban:column:in-progress:index', { itemIds: [] });
  if (!map.get('kanban:column:done:index')) map.set('kanban:column:done:index', { itemIds: [] });
}
`;
  fs.writeFileSync(path.join(outDir, 'kanban-state.generated.js'), code);
}

try {
  await generateApp();
} catch (e) {
  console.error(e.stack);
  process.exit(1);
}

function generateDashboardAppWireup(outDir) {
  let code = `// Compiled deterministically from Live Dashboard App IR
import { createLiveDashboardApp } from './live-dashboard-app.generated.js';
import { createLiveDashboardWidget } from './live-dashboard-widget.generated.js';

export function createDashboard(sharedMap) {
  const app = createLiveDashboardApp({});
  const widgets = new Map();

  function patchWidget(statePatch) {
    const id = statePatch.id;
    let widget = widgets.get(id);
    if (!widget) {
      widget = createLiveDashboardWidget(statePatch);
      widgets.set(id, widget);
      app.insertWidgets(id, widget);
    } else {
      widget.patch(statePatch);
    }
  }

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('dashboard:widget:')) {
        patchWidget(val);
      } else if (key === 'dashboard:index') {
        app.patch({ widgetsIndex: val.itemIds });
      }
    }
  };

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key.startsWith('dashboard:widget:')) {
      if (val) patchWidget(val);
    } else if (key === 'dashboard:index') {
      if (val) app.patch({ widgetsIndex: val.itemIds });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const widget of widgets.values()) widget.dispose();
      widgets.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
`;
  fs.writeFileSync(path.join(outDir, 'live-dashboard-app-wireup.generated.js'), code);
}

function generateSettingsFormWireup(outDir) {
  let code = `// Compiled deterministically from Settings Form App IR
import { createSettingsForm } from './settings-form.generated.js';
import { createFormSignal } from '/src/form.js';
import { createEffect } from '/src/reactivity.js';
import { globalSharedMap } from '/src/store.js';
import { globalToast } from '/src/ui.js';

export function createSettingsApp() {
  const initialValues = { username: '', email: '', notificationsEnabled: false, theme: 'system' };
  const validate = (values) => {
    const errors = {};
    if (!values.username || values.username.length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!values.email || !values.email.includes('@')) errors.email = 'A valid email is required.';
    return errors;
  };

  const [getForm, formActions] = createFormSignal(initialValues, validate);
  
  const storedUsername = globalSharedMap.get('settings_username');
  const storedEmail = globalSharedMap.get('settings_email');
  const storedNotifications = globalSharedMap.get('settings_notifications');
  const storedTheme = globalSharedMap.get('settings_theme');
  
  if (storedUsername) formActions.setFieldValue('username', storedUsername);
  if (storedEmail) formActions.setFieldValue('email', storedEmail);
  if (storedNotifications !== undefined) formActions.setFieldValue('notificationsEnabled', storedNotifications);
  if (storedTheme) formActions.setFieldValue('theme', storedTheme);

  let comp;

  function handleEvent(ev) {
    if (ev.type === 'settings:submit') {
       ev.sourceEvent.preventDefault();
       formActions.submit(async (values) => {
         await new Promise(r => setTimeout(r, 600));
         globalSharedMap.set('settings_username', values.username);
         globalSharedMap.set('settings_email', values.email);
         globalSharedMap.set('settings_notifications', values.notificationsEnabled);
         globalSharedMap.set('settings_theme', values.theme);
         globalToast.show('Settings saved successfully', 'success');
       });
    } else if (ev.type === 'settings:input') {
       const target = ev.sourceEvent.target;
       const value = target.type === 'checkbox' ? target.checked : target.value;
       formActions.setFieldValue(target.name, value);
    }
  }

  comp = createSettingsForm({}, handleEvent);

  const cleanups = [];
  cleanups.push(createEffect(() => {
    const state = getForm();
    const patchObj = {
      username: state.values.username || '',
      email: state.values.email || '',
      notificationsEnabled: !!state.values.notificationsEnabled,
      theme: state.values.theme || 'system',
      usernameError: state.errors.username || '',
      usernameErrorVisible: !!state.errors.username,
      emailError: state.errors.email || '',
      emailErrorVisible: !!state.errors.email,
      isSubmitting: !!state.isSubmitting
    };
    comp.patch(patchObj);
  }));

  return {
    root: comp.root,
    dispose: () => {
      comp.dispose();
      cleanups.forEach(c => c());
    }
  };
}
`;
  fs.writeFileSync(path.join(outDir, 'settings-form-app-wireup.generated.js'), code);
}

function generateProductCatalogWireup(outDir) {
  let code = `// Compiled deterministically from Product Catalog App IR
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
`;
  fs.writeFileSync(path.join(outDir, 'product-catalog-app-wireup.generated.js'), code);
}
