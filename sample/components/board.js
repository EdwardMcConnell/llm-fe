import { FeElement } from '/src/component.js';
import { createSharedSignal } from '/src/shared.js';
import { globalSharedMap } from '/src/store.js';
import { createEffect, createTransitionEffect } from '/src/reactivity.js';
import { createFormSignal } from '/src/form.js';
import { globalAuthManager } from '/src/auth.js';

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
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
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
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          padding: 1rem;
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
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: transform 0.2s, border-color 0.2s;
          touch-action: none;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
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
          pointer-events: none;
        }

        .card.locked [contenteditable] {
          pointer-events: none;
        }

        .card.dragging {
          opacity: 0.3;
        }

        .dragging-clone {
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          transition: transform 0.1s ease;
        }

        .lock-badge {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.65rem;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-weight: 500;
          color: var(--text-primary);
        }

        .card-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
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

      <div class="board-header">
        <h2>Multiplayer Kanban</h2>
        
        <fe-form id="add-task-form">
          <div class="form-group">
            <input type="text" name="title" placeholder="What needs to be done?" autocomplete="off" id="task-input">
            <fe-button type="submit">Add Task</fe-button>
          </div>
        </fe-form>
      </div>

      <div class="board-columns">
        <div class="column col-todo">
          <div class="column-header">
            <span>To Do</span>
            <span class="badge" id="count-todo">0</span>
          </div>
          <div class="card-list" id="list-todo"></div>
        </div>

        <div class="column col-in-progress">
          <div class="column-header">
            <span>In Progress</span>
            <span class="badge" id="count-in-progress">0</span>
          </div>
          <div class="card-list" id="list-in-progress"></div>
        </div>

        <div class="column col-done">
          <div class="column-header">
            <span>Done</span>
            <span class="badge" id="count-done">0</span>
          </div>
          <div class="card-list" id="list-done"></div>
        </div>
      </div>
    `;
  }

  bind() {
    // 1. Reactive Network State via SharedMap (CRDT)
    const [getItems, setItems, unsubscribe] = createSharedSignal(globalSharedMap, 'board_items', []);
    this._cleanups.push(unsubscribe);

    // 2. Reactive UI with DOM Morphing
    this.bindMorph('.board-columns', () => {
      const items = getItems() || [];
      const statusCounts = { 'todo': 0, 'in-progress': 0, 'done': 0 };
      const sortedItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const listsHtml = { 'todo': '', 'in-progress': '', 'done': '' };

      sortedItems.forEach(item => {
        statusCounts[item.status]++;
        
        const currentUser = getCurrentUser();
        const isLocked = item.lockedBy && item.lockedAt && (Date.now() - new Date(item.lockedAt).getTime() < 60000);
        const lockedByOther = isLocked && item.lockedBy !== currentUser;
        
        const cardClass = lockedByOther ? 'card locked' : 'card';
        const lockHtml = lockedByOther ? `<div class="lock-badge">🔒 Locked by ${this.escapeHtml(item.lockedBy)}</div>` : '';
        const editableAttr = lockedByOther ? 'contenteditable="false"' : 'contenteditable="true"';
        const actionsStyle = lockedByOther ? 'style="display: none;"' : '';

        const isoDate = item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString();

        listsHtml[item.status] += `
          <div class="${cardClass}" data-id="${item.id}">
            ${lockHtml}
            <div class="card-title" ${editableAttr} spellcheck="false">${this.escapeHtml(item.title)}</div>
            <div class="card-meta">
              <fe-time datetime="${isoDate}" format="relative"></fe-time>
            </div>
            <div class="card-actions" ${actionsStyle}>
              <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </div>
        `;
      });

      return `
        <div class="column col-todo">
          <div class="column-header">
            <span>To Do</span>
            <span class="badge" id="count-todo">${statusCounts['todo']}</span>
          </div>
          <div class="card-list" id="list-todo">
            ${listsHtml['todo']}
          </div>
        </div>

        <div class="column col-in-progress">
          <div class="column-header">
            <span>In Progress</span>
            <span class="badge" id="count-in-progress">${statusCounts['in-progress']}</span>
          </div>
          <div class="card-list" id="list-in-progress">
            ${listsHtml['in-progress']}
          </div>
        </div>

        <div class="column col-done">
          <div class="column-header">
            <span>Done</span>
            <span class="badge" id="count-done">${statusCounts['done']}</span>
          </div>
          <div class="card-list" id="list-done">
            ${listsHtml['done']}
          </div>
        </div>
      `;
    });

    let activeDragId = null;
    let dragClone = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartRect = null;
    let isDraggingThresholdMet = false;

    this.bindEvent('.board-columns', 'pointerdown', (e) => {
      const card = e.target.closest('.card');
      if (!card || card.classList.contains('locked')) return;
      if (e.target.closest('button') || e.target.closest('.card-title')) return;

      const id = card.getAttribute('data-id');
      
      activeDragId = id;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartRect = card.getBoundingClientRect();
      isDraggingThresholdMet = false;

      // Capture pointer so we get move/up events everywhere
      card.setPointerCapture(e.pointerId);
    });

    this.bindEvent('.board-columns', 'pointermove', (e) => {
      if (!activeDragId) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      // Threshold to start drag (e.g. 5 pixels)
      if (!isDraggingThresholdMet && Math.abs(dx) + Math.abs(dy) > 5) {
        isDraggingThresholdMet = true;

        // Broadcast lock to network
        const items = getItems() || [];
        const currentUser = getCurrentUser();
        const updatedItems = items.map(i => i.id === activeDragId ? { ...i, lockedBy: currentUser, lockedAt: new Date().toISOString() } : i);
        setItems(updatedItems);

        // Create visual clone
        const card = this.root.querySelector(`.card[data-id="${activeDragId}"]`);
        if (card) {
          card.classList.add('dragging');
          dragClone = card.cloneNode(true);
          dragClone.classList.add('dragging-clone');
          dragClone.classList.remove('dragging');
          dragClone.style.position = 'fixed';
          dragClone.style.top = dragStartRect.top + 'px';
          dragClone.style.left = dragStartRect.left + 'px';
          dragClone.style.width = dragStartRect.width + 'px';
          dragClone.style.height = dragStartRect.height + 'px';
          this.root.appendChild(dragClone);
        }
      }

      if (isDraggingThresholdMet && dragClone) {
        dragClone.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
      }
    });

    this.bindEvent('.board-columns', 'pointerup', (e) => {
      if (!activeDragId) return;
      
      const card = e.target.closest('.card');
      if (card) {
        card.releasePointerCapture(e.pointerId);
        card.classList.remove('dragging');
      }

      if (isDraggingThresholdMet && dragClone) {
        // Find drop target. Hide clone first so elementFromPoint works.
        dragClone.style.display = 'none';
        const dropEl = this.root.elementFromPoint(e.clientX, e.clientY);
        const dropCol = dropEl?.closest('.column');
        
        let newStatus = null;
        if (dropCol) {
          if (dropCol.classList.contains('col-todo')) newStatus = 'todo';
          if (dropCol.classList.contains('col-in-progress')) newStatus = 'in-progress';
          if (dropCol.classList.contains('col-done')) newStatus = 'done';
        }

        const items = getItems() || [];
        const updatedItems = items.map(i => {
          if (i.id === activeDragId) {
            return { ...i, lockedBy: null, lockedAt: null, status: newStatus ? newStatus : i.status };
          }
          return i;
        });
        setItems(updatedItems);

        dragClone.remove();
        dragClone = null;
      } else {
        // Click without threshold met, just unlock
        const items = getItems() || [];
        const updatedItems = items.map(i => i.id === activeDragId ? { ...i, lockedBy: null, lockedAt: null } : i);
        setItems(updatedItems);
      }

      activeDragId = null;
      isDraggingThresholdMet = false;
    });

    // Delete Button Delegation
    this.bindEvent('.board-columns', 'click', (e) => {
      const delBtn = e.target.closest('.delete-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        this.deleteItem(id, getItems, setItems);
      }
    });

    // Event Delegation for live edits
    this.bindEvent('.board-columns', 'input', (e) => {
      if (e.target.matches('.card-title')) {
        const id = e.target.closest('.card').getAttribute('data-id');
        const newTitle = e.target.textContent;
        const currentItems = getItems() || [];
        const newItems = currentItems.map(i => i.id === id ? { ...i, title: newTitle } : i);
        setItems(newItems);
      }
    });

    // 3. Form Setup
    const formSignalTuple = createFormSignal({ title: '' }, (values) => {
      const errors = {};
      if (!values.title || values.title.trim() === '') {
        errors.title = 'Task title is required';
      }
      return errors;
    });

    const [getFormState, actions] = formSignalTuple;

    this.bindForm('#add-task-form', formSignalTuple, async (values) => {
      const items = getItems() || [];
      const newItem = {
        id: Math.random().toString(36).slice(2),
        title: values.title.trim(),
        status: 'todo',
        createdAt: new Date().toISOString()
      };
      
      setItems([...items, newItem]);
      
      actions.resetForm();
    });

    // Workaround for fe-button not triggering native form submit
    this.bindEvent('#add-task-form fe-button', 'click', (e) => {
      e.preventDefault();
      const agForm = this.root.querySelector('#add-task-form');
      const formEl = agForm.root.querySelector('form');
      formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  }

  escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  moveItem(id, newStatus, getItems, setItems) {
    const items = getItems() || [];
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    );
    setItems(updatedItems);
  }

  deleteItem(id, getItems, setItems) {
    const items = getItems() || [];
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
  }
}

customElements.define('sample-board', SampleBoard);
