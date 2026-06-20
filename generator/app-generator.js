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
    const { generateComponent } = await import('./index.js');
    const cardIr = loadJson('ir/kanban-card.ir.json');
    generateComponent(
      loadJson('contracts/kanban-card.contract.json'), 
      cardIr, 
      'contracts/kanban-card.contract.json', 
      'ir/kanban-card.ir.json', 
      path.join(outDir, 'kanban-card.generated.js')
    );

    for (const comp of appIr.components) {
      if (comp.name === 'kanban-column') generateColumnFromIR(comp, outDir);
      if (comp.name === 'kanban-board') generateBoardFromIR(comp, outDir);
    }

    generateStateFromIR(outDir);
    generateAppWireupFromIR(appIr.app, outDir);
    generateValidators(outDir);
  } else if (appName === 'data-grid') {
    const { generateDataGrid } = await import('./data-grid-generator.js');
    generateDataGrid(appContract, appIr, outDir);
  }
}

function generateColumnFromIR(ir, outDir) {
  let code = `// Compiled deterministically from ${ir.name} IR
export function createKanbanColumn(status, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = \`${ir.create.template}\`;
  const root = template.content.firstElementChild.cloneNode(true);
`;
  
  for (const [refName, selector] of Object.entries(ir.create.refs)) {
    if (refName !== 'root') {
      code += `  const ${refName}Element = root.querySelector(\`${selector}\`);\n`;
    }
  }

  code += `\n  // List management\n`;
  code += `  const cardInstances = new Map();\n`;
  code += `  function insertCard(id, cardInstance) {\n`;
  code += `    cardInstances.set(id, cardInstance);\n`;
  code += `    listContainerElement.appendChild(cardInstance.root);\n`;
  code += `  }\n`;
  code += `  function removeCard(id) {\n`;
  code += `    const card = cardInstances.get(id);\n`;
  code += `    if (card) {\n`;
  code += `      if (card.root.parentNode === listContainerElement) listContainerElement.removeChild(card.root);\n`;
  code += `      cardInstances.delete(id);\n`;
  code += `    }\n`;
  code += `  }\n`;
  code += `  function reconcileOrder(itemIds) {\n`;
  code += `    countNodeElement.textContent = String(itemIds.length);\n`;
  code += `    for (const id of itemIds) {\n`;
  code += `      const card = cardInstances.get(id);\n`;
  code += `      if (card) listContainerElement.appendChild(card.root);\n`;
  code += `    }\n`;
  code += `  }\n`;
  
  // Patching logic
  for (const patch of ir.patches) {
    code += `  function ${patch.name}(nextVal) {\n`;
    for (const op of patch.ops) {
      if (op.op === 'setTextContent') {
        code += `    ${op.ref}Element.textContent = nextVal;\n`;
      } else if (op.op === 'setClassToken') {
        code += `    ${op.ref === 'root' ? 'root' : op.ref + 'Element'}.className = \`${op.prefix}\${nextVal}\`;\n`;
      }
    }
    code += `  }\n`;
  }
  
  code += `  patchStatus(status);\n`;
  
  code += `  function dispose() {\n    cardInstances.clear();\n  }\n`;
  code += `  return { root, insertCard, removeCard, reconcileOrder, dispose };\n}\n`;

  fs.writeFileSync(path.join(outDir, 'kanban-column.generated.js'), code);
}

function generateBoardFromIR(ir, outDir) {
  let code = `// Compiled deterministically from ${ir.name} IR
import { createKanbanColumn } from './kanban-column.generated.js';
import { createKanbanCard } from './kanban-card.generated.js';

export function createKanbanBoard(initialState, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = \`${ir.create.template}\`;
  const root = template.content.firstElementChild.cloneNode(true);
  const columnsContainerElement = root.querySelector(\`${ir.create.refs.columnsContainer}\`);

  const columns = {};
`;

  for (const child of ir.children) {
    code += `  columns['${child.staticProps.status}'] = createKanbanColumn('${child.staticProps.status}', eventSink);\n`;
    code += `  columnsContainerElement.appendChild(columns['${child.staticProps.status}'].root);\n`;
  }

  code += `
  const allCards = new Map();

  function patchItem(statePatch) {
    const id = statePatch.id;
    let card = allCards.get(id);
    if (!card) {
      card = createKanbanCard(statePatch, eventSink);
      allCards.set(id, card);
    } else {
      card.patch(statePatch);
    }
    if (statePatch.status && columns[statePatch.status]) {
      columns[statePatch.status].insertCard(id, card);
    }
  }

  function reconcileColumnList(status, itemIds) {
    const col = columns[status];
    if (col) col.reconcileOrder(itemIds);
  }

  function removeItem(id) {
    const card = allCards.get(id);
    if (card) {
      card.dispose();
      for (const col of Object.values(columns)) col.removeCard(id);
      allCards.delete(id);
    }
  }

  function dispose() {
    for (const card of allCards.values()) card.dispose();
    allCards.clear();
    for (const col of Object.values(columns)) col.dispose();
  }

  return { root, patchItem, reconcileColumnList, removeItem, dispose };
}
`;
  fs.writeFileSync(path.join(outDir, 'kanban-board.generated.js'), code);
}

function generateAppWireupFromIR(appIr, outDir) {
  let code = `// Compiled deterministically from ${appIr.name} App IR
import { createKanbanBoard } from './kanban-board.generated.js';
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
  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('kanban:item:')) {
        board.patchItem(val);
      } else if (key.startsWith('kanban:column:')) {
        const parts = key.split(':');
        board.reconcileColumnList(parts[2], val.itemIds);
      }
    }
  };

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key.startsWith('kanban:item:')) {
      if (val) board.patchItem(val);
      else board.removeItem(key.split(':')[2]);
    } else if (key.startsWith('kanban:column:')) {
      const parts = key.split(':');
      if (val) board.reconcileColumnList(parts[2], val.itemIds);
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: board.root,
    dispose: () => {
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
