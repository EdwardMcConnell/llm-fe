export function applyItemEdit(map, id, patch) {
  const key = `kanban:item:${id}`;
  map.set(key, { ...(map.get(key) || { id }), ...patch });
}

export function applyItemMove(map, id, fromStatus, toStatus, toIndex) {
  const itemKey = `kanban:item:${id}`;
  const item = map.get(itemKey) || { id, status: fromStatus };
  map.set(itemKey, { ...item, status: toStatus });

  const fromKey = `kanban:column:${fromStatus}:index`;
  const toKey = `kanban:column:${toStatus}:index`;
  
  const fromList = (map.get(fromKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
  map.set(fromKey, { itemIds: fromList });

  const toList = (map.get(toKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
  toList.splice(toIndex, 0, id);
  map.set(toKey, { itemIds: toList });
}

export function applyItemDelete(map, id) {
  const itemKey = `kanban:item:${id}`;
  const item = map.get(itemKey);
  if (item && item.status) {
    const colKey = `kanban:column:${item.status}:index`;
    const list = (map.get(colKey) || { itemIds: [] }).itemIds.filter(i => i !== id);
    map.set(colKey, { itemIds: list });
  }
  map.delete(itemKey);
}

export function createInitialBoardState(map) {
  if (!map.get('kanban:board:metadata')) map.set('kanban:board:metadata', { title: 'Normalized Kanban', description: '' });
  if (!map.get('kanban:column:todo:index')) map.set('kanban:column:todo:index', { itemIds: [] });
  if (!map.get('kanban:column:in-progress:index')) map.set('kanban:column:in-progress:index', { itemIds: [] });
  if (!map.get('kanban:column:done:index')) map.set('kanban:column:done:index', { itemIds: [] });
}
