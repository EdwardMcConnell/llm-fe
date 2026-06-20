import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import { globalSharedMap } from '../../../src/store.js';

let dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// We must import the elements AFTER setting globals
const { FeElement } = await import('../../../src/component.js');
await import('../../../src/primitives.js');
await import('./board.js');

describe('Gauntlet App: Normalized Kanban Benchmarks', () => {

  bench('Render 100 cards (Mount)', () => {
    const board = document.createElement('sample-board');
    
    // Seed 100 items
    const ids = [];
    for (let i = 0; i < 100; i++) {
      const id = 'task-' + i;
      ids.push(id);
      globalSharedMap.set('kanban:item:' + id, { id, title: 'Title', status: 'todo' });
    }
    globalSharedMap.set('kanban:column:todo:index', ids);
    
    document.body.appendChild(board);
    document.body.removeChild(board);
    
    // Clean up CRDT
    globalSharedMap.set('kanban:column:todo:index', []);
    for (const id of ids) {
      globalSharedMap.delete('kanban:item:' + id);
    }
  }, { time: 500 });

  let boardInstance;
  let counter = 0;

  bench('Patch Card Title (Hot Path)', () => {
    if (!boardInstance) {
      boardInstance = document.createElement('sample-board');
      globalSharedMap.set('kanban:column:todo:index', ['hot-task']);
      globalSharedMap.set('kanban:item:hot-task', { id: 'hot-task', title: 'Start', status: 'todo' });
      document.body.appendChild(boardInstance);
    }
    
    globalSharedMap.set('kanban:item:hot-task', { id: 'hot-task', title: 'Update ' + (counter++), status: 'todo' });
  }, { time: 500 });
  
  bench('Move Card Between Columns', () => {
    // Moves 'hot-task' between todo and done
    if (counter % 2 === 0) {
      globalSharedMap.set('kanban:column:todo:index', []);
      globalSharedMap.set('kanban:column:done:index', ['hot-task']);
    } else {
      globalSharedMap.set('kanban:column:done:index', []);
      globalSharedMap.set('kanban:column:todo:index', ['hot-task']);
    }
    counter++;
  }, { time: 500 });

});
