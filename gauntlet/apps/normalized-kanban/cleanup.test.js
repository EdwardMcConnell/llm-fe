import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { globalSharedMap } from '../../../src/store.js';

let dom;

beforeAll(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.customElements = dom.window.customElements;
  global.HTMLElement = dom.window.HTMLElement;
  global.Event = dom.window.Event;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  // Load component definitions
  // We need dynamic import because they depend on globals
});

afterAll(() => {
  dom.window.close();
});

describe('Kanban Cleanup Proof', () => {
  test('disconnecting the board prevents any stale DOM patches from firing', async () => {
    await import('../../../src/primitives.js');
    await import('../../../src/ui.js');
    await import('./board.js');

    // 1. Mount Board
    const board = document.createElement('sample-board');
    document.body.appendChild(board);
    
    // Allow microtasks to flush for connectedCallback
    await new Promise(r => setTimeout(r, 10));

    // 2. Simulate CRDT State changes
    globalSharedMap.set('kanban:column:todo:index', ['task-1']);
    globalSharedMap.set('kanban:item:task-1', {
      id: 'task-1',
      title: 'Cleanup Test Task',
      status: 'todo'
    });

    await new Promise(r => setTimeout(r, 10));

    // Verify it rendered
    const todoList = board.shadowRoot.querySelector('#list-todo');
    expect(todoList.children.length).toBe(1);
    
    // 3. Disconnect Board
    document.body.removeChild(board);
    
    // 4. Fire CRDT update
    globalSharedMap.set('kanban:item:task-1', {
      id: 'task-1',
      title: 'STALE UPDATE',
      status: 'todo'
    });

    await new Promise(r => setTimeout(r, 10));

    // The component is disconnected, it should have cleaned up subscriptions
    // If it didn't, it might throw an error trying to access its shadowRoot, 
    // or mutate stale DOM nodes. But we're mostly testing that it doesn't crash 
    // and `this._cleanups` length logic from FeElement successfully purged listeners.

    const subscribers = globalSharedMap.subscribers;
    // Ensure no subscribers remain attached to the keys (the board should have detached)
    // Board has global level subscribers for column indices.
    expect(subscribers.get('kanban:column:todo:index') || 0).toBe(0);
    expect(subscribers.get('kanban:item:task-1') || 0).toBe(0);
  });
});
