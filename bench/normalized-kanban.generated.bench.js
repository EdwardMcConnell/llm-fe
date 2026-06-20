import { bench, describe } from 'vitest';
import { createKanbanApp } from '../generated-examples/normalized-kanban/kanban-app.generated.js';

class MockSharedMap {
  constructor() {
    this.store = new Map();
    this.listeners = new Set();
  }
  get(k) { return this.store.get(k); }
  set(k, v) { this.store.set(k, v); this.notify(k, v); }
  delete(k) { this.store.delete(k); this.notify(k, undefined); }
  entries() { return this.store.entries(); }
  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  notify(key, value) {
    this.listeners.forEach(cb => cb(key, value));
  }
}

describe('Normalized Kanban Architecture Performance', () => {

  bench('create board with 10 cards', () => {
    const map = new MockSharedMap();
    for (let i = 0; i < 10; i++) {
      map.set(`kanban:item:c${i}`, { id: `c${i}`, status: 'todo' });
    }
    map.set('kanban:column:todo:index', { itemIds: Array.from({length: 10}, (_, i) => `c${i}`) });
    createKanbanApp(map);
  });

  bench('create board with 100 cards', () => {
    const map = new MockSharedMap();
    for (let i = 0; i < 100; i++) {
      map.set(`kanban:item:c${i}`, { id: `c${i}`, status: 'todo' });
    }
    map.set('kanban:column:todo:index', { itemIds: Array.from({length: 100}, (_, i) => `c${i}`) });
    createKanbanApp(map);
  });

  bench('create board with 1,000 cards', () => {
    const map = new MockSharedMap();
    for (let i = 0; i < 1000; i++) {
      map.set(`kanban:item:c${i}`, { id: `c${i}`, status: 'todo' });
    }
    map.set('kanban:column:todo:index', { itemIds: Array.from({length: 1000}, (_, i) => `c${i}`) });
    createKanbanApp(map);
  });

  bench('patch one card title 10,000 times', () => {
    const map = new MockSharedMap();
    map.set('kanban:item:c1', { id: 'c1', status: 'todo', title: 'Start' });
    const app = createKanbanApp(map);
    for (let i = 0; i < 10000; i++) {
      map.set('kanban:item:c1', { id: 'c1', status: 'todo', title: `Update ${i}` });
    }
  });

  bench('move one card between columns 1,000 times', () => {
    const map = new MockSharedMap();
    map.set('kanban:item:c1', { id: 'c1', status: 'todo' });
    map.set('kanban:column:todo:index', { itemIds: ['c1'] });
    map.set('kanban:column:done:index', { itemIds: [] });
    const app = createKanbanApp(map);
    
    for (let i = 0; i < 1000; i++) {
      if (i % 2 === 0) {
        map.set('kanban:item:c1', { id: 'c1', status: 'done' });
        map.set('kanban:column:todo:index', { itemIds: [] });
        map.set('kanban:column:done:index', { itemIds: ['c1'] });
      } else {
        map.set('kanban:item:c1', { id: 'c1', status: 'todo' });
        map.set('kanban:column:todo:index', { itemIds: ['c1'] });
        map.set('kanban:column:done:index', { itemIds: [] });
      }
    }
  });

});
