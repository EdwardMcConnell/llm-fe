import { describe, test, expect } from 'vitest';
import { 
  normalizeKanbanItemFromSharedState, 
  normalizeColumnIndexFromSharedState,
  normalizeKanbanStatus,
  normalizePriority,
  safeClassToken 
} from '../sample/validators.js';

describe('Kanban Boundary Validators', () => {
  test('safeClassToken should strip malicious HTML', () => {
    expect(safeClassToken('<script>alert()</script>')).toBe('-script-alert----script-');
    expect(safeClassToken('To Do')).toBe('to-do');
  });

  test('normalizeKanbanStatus should fallback to todo', () => {
    expect(normalizeKanbanStatus('in-progress')).toBe('in-progress');
    expect(normalizeKanbanStatus('HACKER_STATUS')).toBe('todo');
    expect(normalizeKanbanStatus(null)).toBe('todo');
  });

  test('normalizePriority should fallback to medium', () => {
    expect(normalizePriority('urgent')).toBe('urgent');
    expect(normalizePriority('random')).toBe('medium');
  });

  test('normalizeColumnIndexFromSharedState should strip non-strings and deduplicate', () => {
    expect(normalizeColumnIndexFromSharedState(['a', 'b', 123, 'a', null])).toEqual(['a', 'b']);
    expect(normalizeColumnIndexFromSharedState('not-an-array')).toEqual([]);
  });

  test('normalizeKanbanItemFromSharedState should enforce schema and return null for invalid base', () => {
    expect(normalizeKanbanItemFromSharedState(null)).toBeNull();
    expect(normalizeKanbanItemFromSharedState({ title: 'missing id' })).toBeNull();
    
    const valid = normalizeKanbanItemFromSharedState({
      id: 'task-1',
      title: 'Valid Task',
      status: 'done',
      priority: 'high',
      hackerField: 'should-be-dropped'
    });
    
    expect(valid.id).toBe('task-1');
    expect(valid.title).toBe('Valid Task');
    expect(valid.status).toBe('done');
    expect(valid.priority).toBe('high');
    expect(valid.hackerField).toBeUndefined();
  });
});
