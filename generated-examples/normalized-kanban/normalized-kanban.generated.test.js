// Generated App Tests
import { describe, test, expect, vi } from 'vitest';
import { createKanbanApp } from './kanban-app.generated.js';
import { applyItemEdit, applyItemDelete, applyItemMove, getItemKey, getColumnIndexKey, createInitialBoardState } from './kanban-state.generated.js';

class MockSharedMap {
  constructor() {
    this.store = new Map();
    this.listeners = [];
  }
  get(k) { return this.store.get(k); }
  set(k, v) { this.store.set(k, v); this.notify([k]); }
  delete(k) { this.store.delete(k); this.notify([k]); }
  entries() { return this.store.entries(); }
  observe(cb) { this.listeners.push(cb); }
  notify(keys) {
    const s = new Set(keys);
    this.listeners.forEach(cb => cb(s));
  }
}

describe('Normalized Kanban App Architecture Proof', () => {

  test('item edit updates only kanban:item:<id>', () => {
    const map = new MockSharedMap();
    applyItemEdit(map, 'c1', { title: 'Test', status: 'todo' });
    expect(map.get('kanban:item:c1')).toEqual({ id: 'c1', title: 'Test', status: 'todo' });
    // Columns should not be touched
    expect(map.get('kanban:column:todo:index')).toBeUndefined();
  });

  test('moving item updates affected column indexes and item status', () => {
    const map = new MockSharedMap();
    map.set('kanban:column:todo:index', { itemIds: ['c1'] });
    map.set('kanban:column:done:index', { itemIds: [] });
    
    applyItemMove(map, 'c1', 'todo', 'done', 0);
    
    expect(map.get('kanban:item:c1').status).toBe('done');
    expect(map.get('kanban:column:todo:index').itemIds).toEqual([]);
    expect(map.get('kanban:column:done:index').itemIds).toEqual(['c1']);
  });

  test('deleting item deletes item key and removes id from column indexes', () => {
    const map = new MockSharedMap();
    map.set('kanban:item:c1', { id: 'c1', status: 'todo' });
    map.set('kanban:column:todo:index', { itemIds: ['c1', 'c2'] });

    applyItemDelete(map, 'c1');

    expect(map.get('kanban:item:c1')).toBeUndefined();
    expect(map.get('kanban:column:todo:index').itemIds).toEqual(['c2']);
  });

  test('board creates columns once', () => {
    const map = new MockSharedMap();
    const app = createKanbanApp(map);
    expect(app.root.querySelectorAll('.column-root').length).toBe(3);
  });

  test('columns move existing card nodes instead of rebuilding all cards', () => {
    const map = new MockSharedMap();
    const app = createKanbanApp(map);
    
    applyItemEdit(map, 'c1', { title: 'Test 1', status: 'todo' });
    applyItemEdit(map, 'c2', { title: 'Test 2', status: 'todo' });
    map.set('kanban:column:todo:index', { itemIds: ['c1', 'c2'] });

    const firstCard = app.root.querySelector('.column-todo .card-list').firstElementChild;
    
    // Reorder
    map.set('kanban:column:todo:index', { itemIds: ['c2', 'c1'] });
    
    const lastCard = app.root.querySelector('.column-todo .card-list').lastElementChild;
    expect(firstCard).toBe(lastCard); // Same DOM node
  });

  test('board dispose unsubscribes from state and disposes cards', () => {
    const map = new MockSharedMap();
    const app = createKanbanApp(map);
    applyItemEdit(map, 'c1', { title: 'Test 1', status: 'todo' });
    
    expect(app.root.querySelector('[data-id="c1"]')).toBeTruthy();
    app.dispose();

    // After dispose, state patches shouldn't throw errors
    applyItemEdit(map, 'c1', { title: 'Test 2', status: 'todo' });
    // Root shouldn't update
    expect(app.root.querySelector('.card-title').textContent).not.toBe('Test 2');
  });

});
