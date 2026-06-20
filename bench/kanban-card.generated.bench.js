import { bench, describe } from 'vitest';
import { createKanbanCard } from '../generated-examples/kanban-card/kanban-card.generated.js';

// 1. Generated Code Baseline
function generatedCard(state) {
  return createKanbanCard(state, () => {});
}

// 2. bindMorph Generic Runtime equivalent
function bindMorph(node, state) {
  // Ultra-simplified generic generic morph diffing simulation
  // True bindMorph walks the DOM tree and parses data-bind tags
  // but for the sake of a baseline, we'll simulate the cost of string diffing:
  const nextHtml = `<fe-card class="card" data-id="${state.id || ''}">
    <div class="drag-handle" draggable="true">:::</div>
    <div class="lock-badge" style="display: ${state.lockedBy ? 'inline-block' : 'none'}">🔒 Locked by ${state.lockedBy || ''}</div>
    <div class="card-title">${state.title || ''}</div>
    <p class="card-desc">${state.description || ''}</p>
    <div class="card-badges">
      <span class="badge-status status-${state.status}">${state.status || ''}</span>
      <span class="badge-priority priority-${state.priority}">${state.priority || ''}</span>
    </div>
    <div class="card-assignee">Assigned to: ${state.assignee || ''}</div>
    <div class="card-meta"><fe-time format="relative" datetime="${state.updatedAt || ''}"></fe-time></div>
    <div class="card-actions"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>
  </fe-card>`;

  // Generic morphing engines diff strings against DOM trees (like innerHTML)
  if (node.innerHTML !== nextHtml) {
    node.innerHTML = nextHtml;
  }
}

function bindMorphCard(state) {
  const root = document.createElement('div');
  bindMorph(root, state);
  return {
    root,
    patch: (nextState) => bindMorph(root, nextState),
    dispose: () => {}
  };
}

// 3. Vanilla DOM Baseline
function vanillaCard(state) {
  const root = document.createElement('fe-card');
  root.className = 'card';
  if (state.id) root.setAttribute('data-id', state.id);

  const drag = document.createElement('div');
  drag.className = 'drag-handle';
  drag.draggable = true;
  drag.textContent = ':::';
  root.appendChild(drag);

  const lock = document.createElement('div');
  lock.className = 'lock-badge';
  lock.style.display = state.lockedBy ? 'inline-block' : 'none';
  lock.textContent = state.lockedBy ? '🔒 Locked by ' + state.lockedBy : '';
  root.appendChild(lock);

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = state.title || '';
  root.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = state.description || '';
  root.appendChild(desc);

  const badges = document.createElement('div');
  badges.className = 'card-badges';
  const statusBadge = document.createElement('span');
  statusBadge.className = 'badge-status' + (state.status ? ' status-' + state.status : '');
  statusBadge.textContent = state.status || '';
  badges.appendChild(statusBadge);
  
  const prioBadge = document.createElement('span');
  prioBadge.className = 'badge-priority' + (state.priority ? ' priority-' + state.priority : '');
  prioBadge.textContent = state.priority || '';
  badges.appendChild(prioBadge);
  root.appendChild(badges);

  const assignee = document.createElement('div');
  assignee.className = 'card-assignee';
  assignee.textContent = state.assignee ? 'Assigned to: ' + state.assignee : '';
  root.appendChild(assignee);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const time = document.createElement('fe-time');
  time.setAttribute('format', 'relative');
  if (state.updatedAt) time.setAttribute('datetime', state.updatedAt);
  meta.appendChild(time);
  root.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = 'Edit';
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  root.appendChild(actions);

  let currentState = { ...state };

  function patch(nextState) {
    if (nextState.id !== undefined && nextState.id !== currentState.id) {
      root.setAttribute('data-id', nextState.id);
    }
    if (nextState.lockedBy !== undefined && nextState.lockedBy !== currentState.lockedBy) {
      lock.style.display = nextState.lockedBy ? 'inline-block' : 'none';
      lock.textContent = nextState.lockedBy ? '🔒 Locked by ' + nextState.lockedBy : '';
    }
    if (nextState.title !== undefined && nextState.title !== currentState.title) {
      title.textContent = nextState.title;
    }
    if (nextState.description !== undefined && nextState.description !== currentState.description) {
      desc.textContent = nextState.description;
    }
    if (nextState.status !== undefined && nextState.status !== currentState.status) {
      statusBadge.className = 'badge-status status-' + nextState.status;
      statusBadge.textContent = nextState.status;
    }
    if (nextState.priority !== undefined && nextState.priority !== currentState.priority) {
      prioBadge.className = 'badge-priority priority-' + nextState.priority;
      prioBadge.textContent = nextState.priority;
    }
    if (nextState.assignee !== undefined && nextState.assignee !== currentState.assignee) {
      assignee.textContent = 'Assigned to: ' + nextState.assignee;
    }
    if (nextState.updatedAt !== undefined && nextState.updatedAt !== currentState.updatedAt) {
      time.setAttribute('datetime', nextState.updatedAt);
    }
    currentState = { ...currentState, ...nextState };
  }

  return { root, patch, dispose: () => {} };
}

const mockState = {
  id: 'item-1',
  title: 'Implement Generator Pipeline',
  description: 'Write the machine readable contract and emit deterministic direct DOM patches.',
  status: 'in-progress',
  priority: 'high',
  assignee: 'Agent Alpha',
  lockedBy: null,
  updatedAt: '2026-06-20T00:00:00.000Z'
};

describe('Kanban Card Performance Comparison', () => {
  bench('Create 1 card (Generated vs Vanilla vs Generic)', () => {
    generatedCard(mockState);
  }, { time: 500 });

  bench('Create 1 card Vanilla DOM', () => {
    vanillaCard(mockState);
  }, { time: 500 });

  bench('Create 1 card bindMorph Generic (innerHTML diff simulation)', () => {
    bindMorphCard(mockState);
  }, { time: 500 });

  // Patch Title
  const instanceGenTitle = generatedCard(mockState);
  const instanceVanTitle = vanillaCard(mockState);
  const instanceMorphTitle = bindMorphCard(mockState);
  let counter1 = 0;

  bench('Patch single field (Title) 10,000 times: Generated Direct DOM', () => {
    instanceGenTitle.patch({ title: 'Update ' + (counter1++) });
  }, { time: 500 });

  bench('Patch single field (Title) 10,000 times: Vanilla DOM Baseline', () => {
    instanceVanTitle.patch({ title: 'Update ' + (counter1++) });
  }, { time: 500 });

  bench('Patch single field (Title) 10,000 times: Generic bindMorph (Reparses whole tree)', () => {
    instanceMorphTitle.patch({ ...mockState, title: 'Update ' + (counter1++) });
  }, { time: 500 });


  // Same-Value skip optimizations
  const instanceGenSkip = generatedCard(mockState);
  const instanceVanSkip = vanillaCard(mockState);
  const instanceMorphSkip = bindMorphCard(mockState);

  bench('Patch same-value (Skip optimization): Generated Direct DOM', () => {
    instanceGenSkip.patch({ title: mockState.title });
  }, { time: 500 });

  bench('Patch same-value (Skip optimization): Vanilla DOM', () => {
    instanceVanSkip.patch({ title: mockState.title });
  }, { time: 500 });

  bench('Patch same-value: Generic bindMorph (innerHTML equivalence check)', () => {
    instanceMorphSkip.patch(mockState);
  }, { time: 500 });

});
