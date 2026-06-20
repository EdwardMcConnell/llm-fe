import { FeElement } from '/src/component.js';
import { globalSharedMap } from '/src/store.js';
import { createFormSignal } from '/src/form.js';
import { globalAuthManager } from '/src/auth.js';
import { globalToast } from '/src/ui.js';
import { createKanbanCard } from './kanban-card.generated.js';

function getCurrentUser() {
  const token = globalAuthManager.getToken();
  if (!token) return 'anonymous';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user || 'anonymous';
  } catch (e) {
    return 'anonymous';
  }
}

class SampleBoard extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
          height: 100%;
        }

        .board-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
        }

        .board-header h2 {
          color: var(--brand-primary);
        }

        /* Form Styles */
        .form-group {
          display: flex;
          gap: 1rem;
        }

        input {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.2);
          color: white;
          font-family: inherit;
          font-size: 1rem;
          width: 300px;
        }

        input:focus {
          outline: none;
          border-color: var(--brand-primary);
        }

        fe-button[type="submit"] {
          background: var(--brand-primary);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
        }

        .board-columns {
          display: flex;
          gap: 1.5rem;
          flex: 1;
          align-items: flex-start;
        }

        .column {
          flex: 1;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .column-header {
          font-weight: 600;
          font-size: 1.125rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
        }

        .col-todo .column-header { color: var(--kanban-todo); border-bottom-color: var(--kanban-todo); }
        .col-in-progress .column-header { color: var(--kanban-prog); border-bottom-color: var(--kanban-prog); }
        .col-done .column-header { color: var(--kanban-done); border-bottom-color: var(--kanban-done); }

        .card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: transform 0.2s, border-color 0.2s;
          cursor: grab;
          background: var(--surface-2);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: var(--brand-primary);
        }

        .card:active {
          cursor: grabbing;
        }

        .card.locked {
          opacity: 0.5;
          border-color: #ef4444;
          cursor: not-allowed;
        }

        .lock-badge {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.65rem;
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-weight: 500;
          color: var(--text-primary);
          outline: none;
        }

        .card-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .card-actions button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: background 0.2s;
        }

        .card-actions button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .card-actions button.delete-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .card-actions button.delete-btn:hover {
          background: rgba(239, 68, 68, 0.4);
        }

        .badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
        }
      </style>

      <fe-card class="board-header">
        <h2>Multiplayer Kanban</h2>
        
        <fe-form id="add-task-form">
          <div class="form-group">
            <input type="text" name="title" placeholder="What needs to be done?" autocomplete="off" id="task-input">
            <fe-button type="submit">Add Task</fe-button>
          </div>
        </fe-form>
      </fe-card>

      <div class="board-columns">
        <fe-card class="column col-todo">
          <div class="column-header">
            <span>To Do</span>
            <span class="badge" id="count-todo">0</span>
          </div>
          <div class="card-list" id="list-todo"></div>
        </fe-card>

        <fe-card class="column col-in-progress">
          <div class="column-header">
            <span>In Progress</span>
            <span class="badge" id="count-in-progress">0</span>
          </div>
          <div class="card-list" id="list-in-progress"></div>
        </fe-card>

        <fe-card class="column col-done">
          <div class="column-header">
            <span>Done</span>
            <span class="badge" id="count-done">0</span>
          </div>
          <div class="card-list" id="list-done"></div>
        </fe-card>
      </div>
    `;
  }

  bind() {
    // 1. Direct DOM Node Caching
    this.nodes = new Map();
    this.nodes.set('list-todo', this.root.querySelector('#list-todo'));
    this.nodes.set('list-in-progress', this.root.querySelector('#list-in-progress'));
    this.nodes.set('list-done', this.root.querySelector('#list-done'));
    this.nodes.set('count-todo', this.root.querySelector('#count-todo'));
    this.nodes.set('count-in-progress', this.root.querySelector('#count-in-progress'));
    this.nodes.set('count-done', this.root.querySelector('#count-done'));

    this.cards = new Map();

    // 2. CRDT Sync
    globalSharedMap.incrementSubscriber('kanban:items_index');
    this._cleanups.push(() => globalSharedMap.decrementSubscriber('kanban:items_index'));

    const unsub = globalSharedMap.subscribe((key, value) => {
      if (key === 'kanban:items_index') {
        const ids = value || [];
        for (const id of ids) {
          if (!this.cards.has(id)) {
            globalSharedMap.incrementSubscriber(`kanban:item:${id}`);
            // We can't easily push to cleanups here, but a real app would track sub counts.
          }
        }
      } else if (key.startsWith('kanban:item:')) {
        this.syncCard(key.replace('kanban:item:', ''), value);
      }
    });
    this._cleanups.push(unsub);

    // Initial load
    for (const [key, value] of globalSharedMap.state.entries()) {
      if (key.startsWith('kanban:item:')) {
        this.syncCard(key.replace('kanban:item:', ''), value);
      }
    }

    // 3. Form Setup
    const formSignalTuple = createFormSignal({ title: '' }, (values) => {
      const errors = {};
      if (!values.title || values.title.trim() === '') {
        errors.title = 'Task title is required';
      }
      return errors;
    });

    const [, actions] = formSignalTuple;

    this.bindForm('#add-task-form', formSignalTuple, async (values) => {
      const id = 'task-' + Math.random().toString(36).slice(2);
      const newItem = {
        id,
        title: values.title.trim(),
        status: 'todo',
        createdAt: new Date().toISOString()
      };
      
      const index = globalSharedMap.get('kanban:items_index') || [];
      globalSharedMap.set('kanban:items_index', [...index, id]);
      
      globalSharedMap.set(`kanban:item:${id}`, newItem);
      globalToast.show(`Task added: ${newItem.title}`);
      
      actions.resetForm();
    });

    // Workaround for fe-button not triggering native form submit
    this.bindEvent('#add-task-form fe-button', 'click', (e) => {
      e.preventDefault();
      const agForm = this.root.querySelector('#add-task-form');
      const formEl = agForm.root.querySelector('form');
      formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    // 4. Drag & Drop
    this.bindDragAndDrop({
      dropSelector: '.column',
      onDragStart: (dragEl, e) => {
        if (e.target.closest('.card-title') || e.target.closest('button')) return false;

        const id = dragEl.getAttribute('data-id');
        const item = globalSharedMap.get(`kanban:item:${id}`);
        if (!item || item.lockedBy) return false;

        // Broadcast lock
        globalSharedMap.set(`kanban:item:${id}`, { ...item, lockedBy: getCurrentUser(), lockedAt: new Date().toISOString() });
      },
      onDrop: (dragEl, dropZoneEl, e) => {
        const id = dragEl.getAttribute('data-id');
        console.log('onDrop fired, id:', id, 'dropZoneEl:', dropZoneEl?.className);
        let newStatus = null;
        if (dropZoneEl) {
          if (dropZoneEl.classList.contains('col-todo')) newStatus = 'todo';
          if (dropZoneEl.classList.contains('col-in-progress')) newStatus = 'in-progress';
          if (dropZoneEl.classList.contains('col-done')) newStatus = 'done';
        }

        const item = globalSharedMap.get(`kanban:item:${id}`);
        console.log('onDrop item found:', !!item, 'newStatus:', newStatus);
        if (item) {
          globalSharedMap.set(`kanban:item:${id}`, { 
            ...item, 
            lockedBy: null, 
            lockedAt: null, 
            status: newStatus ? newStatus : item.status 
          });
          if (newStatus) globalToast.show(`Task moved to ${newStatus}`);
        }
      }
    });
  }

  handleCardEvent(id, ev) {
    const item = globalSharedMap.get(`kanban:item:${id}`);
    if (!item) return;

    if (ev.type === 'card:delete') {
      globalSharedMap.delete(`kanban:item:${id}`);
      
      const index = globalSharedMap.get('kanban:items_index') || [];
      globalSharedMap.set('kanban:items_index', index.filter(i => i !== id));
      
      globalToast.show('Task deleted successfully');
    } else if (ev.type === 'card:editTitle') {
      const newTitle = ev.sourceEvent.target.textContent;
      globalSharedMap.set(`kanban:item:${id}`, { ...item, title: newTitle });
    }
  }

  syncCard(id, data) {
    if (!data) {
      // Deleted
      if (this.cards.has(id)) {
        const card = this.cards.get(id);
        card.root.remove();
        card.dispose();
        this.cards.delete(id);
        this.updateCounts();
      }
      return;
    }

    const currentUser = getCurrentUser();
    const now = Date.now();
    const isLocked = data.lockedBy && data.lockedAt && (now - new Date(data.lockedAt).getTime() < 60000);
    const lockedByOther = isLocked && data.lockedBy !== currentUser;

    const state = {
      id: data.id,
      title: data.title,
      status: data.status,
      createdAt: data.createdAt,
      lockedBy: data.lockedBy,
      isLocked: Boolean(lockedByOther),
      isoDate: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()
    };

    let card = this.cards.get(id);
    if (!card) {
      card = createKanbanCard(state, (ev) => this.handleCardEvent(id, ev));
      this.cards.set(id, card);
    } else {
      card.patch(state);
    }

    // Ensure correct DOM position based on status
    const listNode = this.nodes.get(`list-${data.status}`);
    if (listNode && card.root.parentElement !== listNode) {
      listNode.appendChild(card.root);
      this.updateCounts();
    }
  }

  updateCounts() {
    let counts = { 'todo': 0, 'in-progress': 0, 'done': 0 };
    for (const [id, card] of this.cards) {
      const item = globalSharedMap.get(`kanban:item:${id}`);
      if (item && counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    }
    
    this.nodes.get('count-todo').textContent = counts['todo'];
    this.nodes.get('count-in-progress').textContent = counts['in-progress'];
    this.nodes.get('count-done').textContent = counts['done'];
  }
}

customElements.define('sample-board', SampleBoard);
