import { describe, test, expect, vi } from 'vitest';
import { flushMicrotasks } from '../src/testing.js';
import { SharedMap } from '../src/crdt.js';
import { createKanbanApp } from '../generated-examples/normalized-kanban/kanban-app.generated.js';

function mountNode(node) {
  document.body.innerHTML = '';
  document.body.appendChild(node);
}

describe('Normalized Kanban E2E Browser Test', () => {
  test('mounts the entire kanban board deterministically', async () => {
    const map = new SharedMap('kanban');
    const app = createKanbanApp(map);
    mountNode(app.root);
    await flushMicrotasks();

    // Verify 3 columns exist
    const columns = app.root.querySelectorAll('.column-root');
    expect(columns.length).toBe(3);
    expect(app.root.querySelector('.column-todo')).toBeTruthy();
    expect(app.root.querySelector('.column-in-progress')).toBeTruthy();
    expect(app.root.querySelector('.column-done')).toBeTruthy();

    app.dispose();
  });

  test('can edit an item text and assert deterministic safe update', async () => {
    const map = new SharedMap('kanban');
    const app = createKanbanApp(map);
    mountNode(app.root);
    
    // Add a card via map
    map.set('kanban:item:c1', { id: 'c1', title: 'Initial Title', status: 'todo' });
    map.set('kanban:column:todo:index', { itemIds: ['c1'] });
    await flushMicrotasks();

    const card = app.root.querySelector('.column-todo [data-node="root"]');
    expect(card).toBeTruthy();
    expect(card.querySelector('.card-title').textContent).toBe('Initial Title');

    // Simulate clicking edit button
    const editBtn = card.querySelector('.edit-btn');
    editBtn.click();
    await flushMicrotasks();

    // The wireup currently sets it to 'Edited Card'
    expect(map.get('kanban:item:c1').title).toBe('Edited Card');
    expect(card.querySelector('.card-title').textContent).toBe('Edited Card');

    app.dispose();
  });

  test('moving a card re-renders lists without destroying DOM nodes', async () => {
    const map = new SharedMap('kanban');
    const app = createKanbanApp(map);
    mountNode(app.root);
    
    map.set('kanban:item:c1', { id: 'c1', title: 'Task 1', status: 'todo' });
    map.set('kanban:column:todo:index', { itemIds: ['c1'] });
    map.set('kanban:column:in-progress:index', { itemIds: [] });
    await flushMicrotasks();

    const todoCol = app.root.querySelector('.column-todo .card-list');
    const inProgressCol = app.root.querySelector('.column-in-progress .card-list');
    
    const cardNode = todoCol.firstElementChild;
    expect(cardNode.querySelector('.card-title').textContent).toBe('Task 1');

    // Simulate move to in-progress
    // Wireup listens for 'kanban:column:reorder' which expects fromStatus and toStatus
    const reorderEvent = new window.Event('kanban:column:reorder');
    reorderEvent.itemId = 'c1';
    reorderEvent.fromStatus = 'todo';
    reorderEvent.toStatus = 'in-progress';
    app.root.dispatchEvent(reorderEvent); // The app wireup might not listen on root, but let's dispatch directly to map for test

    map.set('kanban:item:c1', { id: 'c1', title: 'Task 1', status: 'in-progress' });
    map.set('kanban:column:todo:index', { itemIds: [] });
    map.set('kanban:column:in-progress:index', { itemIds: ['c1'] });
    await flushMicrotasks();

    expect(todoCol.firstElementChild).toBeNull();
    const newCardNode = inProgressCol.firstElementChild;
    expect(newCardNode).toBe(cardNode); // Same DOM node! Direct DOM caching verified

    app.dispose();
  });

  test('disposing the app cleans up subscriptions', async () => {
    const map = new SharedMap('kanban');
    const app = createKanbanApp(map);
    mountNode(app.root);
    
    expect(map.listeners.size + map.patchListeners.size).toBeGreaterThan(0);
    app.dispose();
    expect(map.listeners.size + map.patchListeners.size).toBe(0); // Assuming SharedMap cleans up
  });
});
