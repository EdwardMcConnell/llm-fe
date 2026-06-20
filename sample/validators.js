export function safeClassToken(raw) {
  if (typeof raw !== 'string') return '';
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export function normalizeKanbanStatus(raw) {
  const allowed = ['todo', 'in-progress', 'done'];
  if (typeof raw === 'string' && allowed.includes(raw.toLowerCase())) {
    return raw.toLowerCase();
  }
  return 'todo';
}

export function normalizePriority(raw) {
  const allowed = ['low', 'medium', 'high', 'urgent'];
  if (typeof raw === 'string' && allowed.includes(raw.toLowerCase())) {
    return raw.toLowerCase();
  }
  return 'medium';
}

export function normalizeKanbanItemFromSharedState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || typeof raw.id !== 'string') return null;
  
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled Task',
    description: typeof raw.description === 'string' ? raw.description : '',
    status: normalizeKanbanStatus(raw.status),
    priority: normalizePriority(raw.priority),
    assignee: typeof raw.assignee === 'string' ? raw.assignee : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    lockedBy: typeof raw.lockedBy === 'string' ? raw.lockedBy : null,
    lockedAt: typeof raw.lockedAt === 'string' ? raw.lockedAt : null
  };
}

export function normalizeColumnIndexFromSharedState(raw) {
  if (!Array.isArray(raw)) return [];
  // Ensure we only keep valid strings and remove duplicates to maintain LWW integrity
  const validIds = raw.filter(item => typeof item === 'string');
  return [...new Set(validIds)];
}
