// Compiled deterministically from kanban-app App IR
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
