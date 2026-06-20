// Compiled deterministically from kanban-board IR
import { createKanbanColumn } from './kanban-column.generated.js';
import { createKanbanCard } from './kanban-card.generated.js';

export function createKanbanBoard(initialState, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = `<div class="board-root" data-node="root"><div class="columns-container" data-node="columnsContainer"></div></div>`;
  const root = template.content.firstElementChild.cloneNode(true);
  const columnsContainerElement = root.querySelector(`[data-node="columnsContainer"]`);

  const columns = {};
  columns['todo'] = createKanbanColumn('todo', eventSink);
  columnsContainerElement.appendChild(columns['todo'].root);
  columns['in-progress'] = createKanbanColumn('in-progress', eventSink);
  columnsContainerElement.appendChild(columns['in-progress'].root);
  columns['done'] = createKanbanColumn('done', eventSink);
  columnsContainerElement.appendChild(columns['done'].root);

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
