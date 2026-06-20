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
  } else if (appName === 'data-grid') {
    const { generateDataGrid } = await import('./data-grid-generator.js');
    generateDataGrid(appContract, appIr, outDir);
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
  console.error(e.message);
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
