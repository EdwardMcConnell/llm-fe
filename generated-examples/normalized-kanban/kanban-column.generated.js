// Compiled deterministically from kanban-column IR
export function createKanbanColumn(status, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = `<div class="column-root" data-node="root"><h2 class="column-title" data-node="titleNode"><span class="column-count" data-node="countNode">0</span></h2><div class="card-list" data-node="listContainer"></div></div>`;
  const root = template.content.firstElementChild.cloneNode(true);
  const titleNodeElement = root.querySelector(`[data-node="titleNode"]`);
  const countNodeElement = root.querySelector(`[data-node="countNode"]`);
  const listContainerElement = root.querySelector(`[data-node="listContainer"]`);

  // List management
  const cardInstances = new Map();
  function insertCard(id, cardInstance) {
    cardInstances.set(id, cardInstance);
    listContainerElement.appendChild(cardInstance.root);
  }
  function removeCard(id) {
    const card = cardInstances.get(id);
    if (card) {
      if (card.root.parentNode === listContainerElement) listContainerElement.removeChild(card.root);
      cardInstances.delete(id);
    }
  }
  function reconcileOrder(itemIds) {
    countNodeElement.textContent = String(itemIds.length);
    for (const id of itemIds) {
      const card = cardInstances.get(id);
      if (card) listContainerElement.appendChild(card.root);
    }
  }
  function patchStatus(nextVal) {
    titleNodeElement.textContent = nextVal;
    root.className = `column-root column-${nextVal}`;
  }
  patchStatus(status);
  function dispose() {
    cardInstances.clear();
  }
  return { root, insertCard, removeCard, reconcileOrder, dispose };
}
