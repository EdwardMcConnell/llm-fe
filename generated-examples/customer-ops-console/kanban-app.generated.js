// Compiled deterministically from createKanbanBoard App IR
import { createKanbanBoard } from './kanban-board.generated.js';
import { createKanbanCard } from './kanban-card.generated.js';
import { applyItemEdit, applyItemMove, applyItemDelete, createInitialBoardState } from './kanban-state.generated.js';
import { safeText } from './kanban-validators.generated.js';

export function createKanbanApp(sharedMap) {
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

  const app = createKanbanBoard({}, handleEvent);
  createInitialBoardState(sharedMap);

  const cardInstances = new Map();

  function patchCard(statePatch) {
    const id = statePatch.id;
    let instance = cardInstances.get(id);
    if (!instance) {
      instance = createKanbanCard(statePatch, handleEvent);
      cardInstances.set(id, instance);
      if (instance.root) instance.root.dataset.id = id;
    } else {
      instance.patch(statePatch);
    }
    if (statePatch.status && app.children) {
      let colName = null;
      if (statePatch.status === 'todo') colName = 'todoCol';
      if (statePatch.status === 'in-progress') colName = 'inProgressCol';
      if (statePatch.status === 'done') colName = 'doneCol';
      if (colName && app.children[colName] && app.children[colName].insertCards) {
        app.children[colName].insertCards(id, instance);
      }
    }
  }

  function removeCard(id) {
    const instance = cardInstances.get(id);
    if (instance) {
      instance.dispose();
      for (const col of Object.values(app.children || {})) {
        if (col.removeCards) col.removeCards(id);
      }
      cardInstances.delete(id);
    }
  }

  function reconcileCardsOrder(routeKey, itemKeys) {
    if (app.children) {
      let colName = null;
      if (routeKey === 'todo') colName = 'todoCol';
      if (routeKey === 'in-progress') colName = 'inProgressCol';
      if (routeKey === 'done') colName = 'doneCol';
      if (colName && app.children[colName] && app.children[colName].reconcileCardsOrder) {
        app.children[colName].reconcileCardsOrder(itemKeys);
      }
    }
  }

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('kanban:item:')) {
        patchCard(val);
      } else       if (key.startsWith('kanban:column:')) {
        reconcileCardsOrder(key.split(':')[2], val.itemIds);
      }
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key.startsWith('kanban:item:')) {
      if (val !== undefined) patchCard(val);
      else removeCard(key.split(':')[2]);
    } else     if (key.startsWith('kanban:column:')) {
      if (val !== undefined) reconcileCardsOrder(key.split(':')[2], val.itemIds);
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const instance of cardInstances.values()) instance.dispose();
      cardInstances.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
