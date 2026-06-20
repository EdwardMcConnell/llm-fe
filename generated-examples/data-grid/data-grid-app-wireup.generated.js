// Compiled deterministically from createDataGrid App IR
import { createDataGrid } from './data-grid.generated.js';

export function createGridApp(sharedMap) {
  function handleEvent(ev) {
    if (ev.type === 'grid:search:input') {
      sharedMap.set('grid:filter', ev.sourceEvent.target.value);
    } else if (ev.type === 'grid:sort') {
      sharedMap.set('grid:sortCol', ev.sortCol);
      sharedMap.set('grid:sortAsc', ev.sortAsc);
    } else if (ev.type === 'grid:select') {
      sharedMap.set('grid:selectedRows', ev.selectedRows);
      if (ev.focusedRow) sharedMap.set('grid:focusedRow', ev.focusedRow);
    } else if (ev.type === 'grid:focus') {
      sharedMap.set('grid:focusedRow', ev.focusedRow);
    }
  }

  const app = createDataGrid({}, handleEvent);
  app.patch({ cellAccessor: (r, c) => sharedMap.get(`grid:cell:${r}:${c}`) });


  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key === 'grid:columns') {
        app.patch({ columns: val });
      } else       if (key === 'grid:rows') {
        app.patch({ rows: val });
      } else       if (key === 'grid:filter') {
        app.patch({ filterText: val });
      } else       if (key === 'grid:sortCol') {
        app.patch({ sortCol: val });
      } else       if (key === 'grid:sortAsc') {
        app.patch({ sortAsc: val });
      } else       if (key === 'grid:selectedRows') {
        app.patch({ selectedRows: val });
      } else       if (key === 'grid:focusedRow') {
        app.patch({ focusedRow: val });
      } else       if (key.startsWith('grid:cell:')) {
        const parts = key.split(':'); app.patchVirtualCell(parts[2], parts[3], val);
      }
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key === 'grid:columns') {
      if (val) app.patch({ columns: val });
    } else     if (key === 'grid:rows') {
      if (val) app.patch({ rows: val });
    } else     if (key === 'grid:filter') {
      if (val) app.patch({ filterText: val });
    } else     if (key === 'grid:sortCol') {
      if (val) app.patch({ sortCol: val });
    } else     if (key === 'grid:sortAsc') {
      if (val) app.patch({ sortAsc: val });
    } else     if (key === 'grid:selectedRows') {
      if (val) app.patch({ selectedRows: val });
    } else     if (key === 'grid:focusedRow') {
      if (val) app.patch({ focusedRow: val });
    } else     if (key.startsWith('grid:cell:')) {
      const parts = key.split(':'); app.patchVirtualCell(parts[2], parts[3], val);
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
