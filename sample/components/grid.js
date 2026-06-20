import { FeElement } from '/src/component.js';
import { createSignal } from '/src/reactivity.js';

class SampleGrid extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          width: 100%;
          min-height: 0;
          min-width: 0;
          gap: 1rem;
        }

        .controls-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-shrink: 0;
        }

        .features-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .features-toggles label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          user-select: none;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-input {
          background: rgba(10, 15, 30, 0.5);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          outline: none;
          min-width: 250px;
        }

        .search-input:focus {
          border-color: var(--brand-primary);
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .pagination-controls select {
          background: rgba(10, 15, 30, 0.5);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 0.3rem 0.5rem;
          border-radius: 4px;
          outline: none;
        }

        .grid-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          padding: 0;
        }

        .header {
          display: flex;
          padding: 1rem 0;
          background: rgba(10, 15, 30, 0.8);
          border-bottom: 1px solid var(--glass-border);
          font-weight: 600;
          color: var(--text-secondary);
          user-select: none;
        }

        .header-cell {
          display: flex;
          align-items: center;
          padding: 0 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          position: relative;
          cursor: pointer;
        }
        
        .header-cell:hover {
          color: var(--text-primary);
        }

        .header-cell.sort-asc::after { content: ' \u25B2'; font-size: 0.7em; margin-left: 0.5rem; color: var(--brand-primary); }
        .header-cell.sort-desc::after { content: ' \u25BC'; font-size: 0.7em; margin-left: 0.5rem; color: var(--brand-primary); }

        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          cursor: col-resize;
          background: transparent;
          z-index: 10;
        }
        .resizer:hover, .resizer.dragging {
          background: var(--brand-primary);
        }

        /* Column Widths (dynamic via CSS vars) */
        .col-select { flex: 0 0 50px; justify-content: center; padding: 0; cursor: default; }
        .col-id { flex: 0 0 var(--col-id-w, 100px); }
        .col-name { flex: 0 0 var(--col-name-w, 200px); }
        .col-department { flex: 0 0 var(--col-department-w, 150px); }
        .col-role { flex: 0 0 var(--col-role-w, 150px); }
        .col-status { flex: 0 0 var(--col-status-w, 120px); }
        .col-actions { flex: 1; min-width: 100px; cursor: default; }

        fe-grid {
          flex: 1;
          width: 100%;
        }

        input[type="checkbox"] {
          accent-color: var(--brand-primary);
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .filter-row {
          display: flex;
          padding: 0.5rem 0;
          background: rgba(10, 15, 30, 0.6);
          border-bottom: 1px solid var(--glass-border);
        }
        .filter-row input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          outline: none;
        }
        .filter-row input:focus {
          border-color: var(--brand-primary);
        }
      </style>

      <fe-card class="controls-card">
        <fe-accordion class="features-accordion">
          <span slot="header" style="font-weight:600; color:var(--text-secondary);">Grid Features Configuration</span>
          <div class="features-toggles">
            <label><input type="checkbox" id="t-pagination" checked> Pagination</label>
            <label><input type="checkbox" id="t-sorting" checked> Column Sorting</label>
            <label><input type="checkbox" id="t-colfilter" checked> Column Filters</label>
            <label><input type="checkbox" id="t-search" checked> Quick Search</label>
            <label><input type="checkbox" id="t-select" checked> Selectable Rows</label>
            <label><input type="checkbox" id="t-edit" checked> Editable Cells</label>
            <label><input type="checkbox" id="t-resize" checked> Resizable Columns</label>
          </div>
        </fe-accordion>

        <div class="toolbar">
          <div id="search-container">
            <input type="text" class="search-input" id="quick-search" placeholder="Quick search globally...">
          </div>
          
          <div class="pagination-controls" id="pagination-container">
            <span>
              Show 
              <select id="page-size">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100" selected>100</option>
                <option value="1000">1000</option>
                <option value="all">All</option>
              </select>
            </span>
            <span id="page-info">1-100 of 100000</span>
            <fe-button variant="outline" id="btn-prev">&lt;</fe-button>
            <fe-button variant="outline" id="btn-next">&gt;</fe-button>
          </div>
        </div>
      </fe-card>
      
      <fe-card class="grid-card">
        <div class="header" id="grid-header"></div>
        <div class="filter-row" id="grid-filters" style="display: none;"></div>
        <fe-grid id="massive-grid"></fe-grid>
      </fe-card>
    `;
  }

  bind() {
    const grid = this.root.querySelector('#massive-grid');
    const headerEl = this.root.querySelector('#grid-header');
    const filterEl = this.root.querySelector('#grid-filters');
    const pageInfo = this.root.querySelector('#page-info');
    const btnPrev = this.root.querySelector('#btn-prev');
    const btnNext = this.root.querySelector('#btn-next');
    const searchInput = this.root.querySelector('#quick-search');
    const searchContainer = this.root.querySelector('#search-container');
    const paginationContainer = this.root.querySelector('#pagination-container');
    const pageSizeSelect = this.root.querySelector('#page-size');

    let features = {
      pagination: true, sorting: true, colFilter: true,
      search: true, select: true, edit: true, resize: true
    };

    let state = {
      pageSize: 100, currentPage: 1, globalSearch: '',
      colFilters: { id: '', name: '', department: '', role: '', status: '' },
      sortCol: null, sortDesc: false, selection: new Set()
    };

    // Generate 100,000 dummy records
    console.log('Generating 100,000 records for the advanced grid...');
    const massiveData = [];
    const depts = ['Engineering', 'Marketing', 'Sales', 'HR', 'Design'];
    const roles = ['Manager', 'Developer', 'Analyst', 'Director', 'Coordinator'];
    const statuses = ['active', 'pending', 'error'];

    for (let i = 0; i < 100000; i++) {
      massiveData.push({
        id: `USR-${10000 + i}`,
        name: `Employee User ${i}`,
        department: depts[Math.floor(Math.random() * depts.length)],
        role: roles[Math.floor(Math.random() * roles.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    }

    const [getViewData, setViewData] = createSignal([]);

    const gridStyles = `
      .row {
        display: flex;
        align-items: center;
        height: 100%;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.1s;
        color: var(--text-secondary, #94a3b8);
      }
      .row.selected {
        background: rgba(34, 197, 94, 0.1);
      }
      .row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .row span {
        padding: 0 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cell-edit {
        outline: none;
        border-bottom: 1px dashed transparent;
        transition: border 0.2s;
      }
      .cell-edit:focus {
        border-bottom-color: var(--brand-primary);
        background: rgba(0,0,0,0.2);
        color: var(--text-primary);
      }
      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .status-active { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
      .status-pending { background: rgba(234, 179, 8, 0.2); color: #facc15; }
      .status-error { background: rgba(239, 68, 68, 0.2); color: #f87171; }

      .col-select { flex: 0 0 50px; display: flex; justify-content: center; padding: 0 !important; }
      .col-id { flex: 0 0 var(--col-id-w, 100px); }
      .col-name { flex: 0 0 var(--col-name-w, 200px); }
      .col-department { flex: 0 0 var(--col-department-w, 150px); }
      .col-role { flex: 0 0 var(--col-role-w, 150px); }
      .col-status { flex: 0 0 var(--col-status-w, 120px); }
      .col-actions { flex: 1; min-width: 100px; }
    `;

    const cols = [
      { id: 'id', label: 'ID', sortable: true },
      { id: 'name', label: 'Name', sortable: true },
      { id: 'department', label: 'Department', sortable: true },
      { id: 'role', label: 'Role', sortable: true },
      { id: 'status', label: 'Status', sortable: true },
      { id: 'actions', label: '', sortable: false }
    ];

    const renderHeaderDOM = () => {
      let html = '';
      if (features.select) {
        html += `<div class="header-cell col-select"><input type="checkbox" id="select-all"></div>`;
      }
      
      cols.forEach(c => {
        let sortClass = '';
        if (features.sorting && c.sortable && state.sortCol === c.id) {
          sortClass = state.sortDesc ? 'sort-desc' : 'sort-asc';
        }
        let resizer = features.resize && c.id !== 'actions' ? `<div class="resizer" data-col="${c.id}"></div>` : '';
        let sortAttr = features.sorting && c.sortable ? `data-sort="${c.id}"` : '';
        html += `<div class="header-cell col-${c.id} ${sortClass}" ${sortAttr}>${c.label}${resizer}</div>`;
      });
      headerEl.innerHTML = html;

      // Filter row
      if (features.colFilter) {
        filterEl.style.display = 'flex';
        let fHtml = '';
        if (features.select) fHtml += `<div class="col-select"></div>`;
        cols.forEach(c => {
          if (c.id === 'actions') {
             fHtml += `<div class="col-actions"></div>`;
          } else {
             fHtml += `<div class="col-${c.id}" style="padding: 0 0.5rem;"><input type="text" data-filter="${c.id}" placeholder="Filter..." value="${state.colFilters[c.id] || ''}"></div>`;
          }
        });
        filterEl.innerHTML = fHtml;
      } else {
        filterEl.style.display = 'none';
        filterEl.innerHTML = '';
      }
      
      // Update check state for select-all
      const sa = this.root.querySelector('#select-all');
      if (sa) {
        sa.checked = state.selection.size > 0 && state.selection.size === massiveData.length;
      }
    };

    const updateView = () => {
      let result = massiveData;

      if (features.search && state.globalSearch) {
        const q = state.globalSearch.toLowerCase();
        result = result.filter(item => 
          item.id.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
        );
      }

      if (features.colFilter) {
        for (const [col, val] of Object.entries(state.colFilters)) {
          if (val) {
            const q = val.toLowerCase();
            result = result.filter(item => String(item[col]).toLowerCase().includes(q));
          }
        }
      }

      if (features.sorting && state.sortCol) {
        const col = state.sortCol;
        const desc = state.sortDesc ? -1 : 1;
        result = result.slice().sort((a, b) => {
          if (a[col] < b[col]) return -1 * desc;
          if (a[col] > b[col]) return 1 * desc;
          return 0;
        });
      }

      let total = result.length;
      let paginated = result;
      if (features.pagination && state.pageSize !== 'all') {
        const size = state.pageSize;
        const maxPage = Math.max(1, Math.ceil(total / size));
        if (state.currentPage > maxPage) state.currentPage = maxPage;
        
        const offset = (state.currentPage - 1) * size;
        paginated = result.slice(offset, offset + size);
        pageInfo.textContent = `${offset + 1}-${Math.min(offset + size, total)} of ${total}`;
        btnPrev.style.visibility = state.currentPage > 1 ? 'visible' : 'hidden';
        btnNext.style.visibility = state.currentPage < maxPage ? 'visible' : 'hidden';
      } else {
        pageInfo.textContent = `1-${total} of ${total}`;
        btnPrev.style.visibility = 'hidden';
        btnNext.style.visibility = 'hidden';
      }

      setViewData(paginated);
    };

    const fullRefresh = () => {
      searchContainer.style.display = features.search ? 'block' : 'none';
      paginationContainer.style.display = features.pagination ? 'flex' : 'none';
      renderHeaderDOM();
      updateView();
    };

    // Bind Toggles
    const toggleMap = {
      't-pagination': 'pagination',
      't-sorting': 'sorting',
      't-colfilter': 'colFilter',
      't-search': 'search',
      't-select': 'select',
      't-edit': 'edit',
      't-resize': 'resize'
    };
    
    Object.keys(toggleMap).forEach(id => {
      this.bindEvent('#' + id, 'change', (e) => {
        features[toggleMap[id]] = e.target.checked;
        fullRefresh();
      });
    });

    // Toolbar binds
    this.bindEvent('#quick-search', 'input', (e) => {
      state.globalSearch = e.target.value;
      updateView();
    });

    this.bindEvent('#page-size', 'change', (e) => {
      state.pageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
      state.currentPage = 1;
      updateView();
    });

    this.bindEvent('#btn-prev', 'click', () => {
      if (state.currentPage > 1) { state.currentPage--; updateView(); }
    });
    this.bindEvent('#btn-next', 'click', () => {
      state.currentPage++; updateView();
    });

    // Event Delegation on Header
    this.bindEvent('#grid-header', 'click', (e) => {
      const cell = e.target.closest('.header-cell[data-sort]');
      if (cell && features.sorting) {
        const col = cell.getAttribute('data-sort');
        if (state.sortCol === col) {
          if (state.sortDesc === false) {
            state.sortDesc = true;
          } else {
            state.sortCol = null;
            state.sortDesc = false;
          }
        } else {
          state.sortCol = col;
          state.sortDesc = false; // default asc
        }
        renderHeaderDOM();
        updateView();
      }
      
      if (e.target.id === 'select-all') {
        if (e.target.checked) {
          massiveData.forEach(i => state.selection.add(i.id));
        } else {
          state.selection.clear();
        }
        updateView(); // Re-render grid to show checkboxes
      }
    });

    // Event Delegation for Col Filters
    this.bindEvent('#grid-filters', 'input', (e) => {
      if (e.target.hasAttribute('data-filter')) {
        const col = e.target.getAttribute('data-filter');
        state.colFilters[col] = e.target.value;
        updateView();
      }
    });

    // Event Delegation on Grid (Checkboxes & Cell Edits)
    this.bindEvent('#massive-grid', 'change', (e) => {
      if (e.target.classList.contains('row-select')) {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) state.selection.add(id);
        else state.selection.delete(id);
        
        // update select-all checkbox visually
        const sa = this.root.querySelector('#select-all');
        if (sa) sa.checked = state.selection.size === massiveData.length;
        
        // Add selected class to row (hacky way without full re-render)
        const row = e.target.closest('.row');
        if (row) row.classList.toggle('selected', e.target.checked);
      }
    });

    this.bindEvent('#massive-grid', 'blur', (e) => {
      if (e.target.classList.contains('cell-edit')) {
        const id = e.target.getAttribute('data-id');
        const col = e.target.getAttribute('data-col');
        const val = e.target.textContent;
        const item = massiveData.find(i => i.id === id);
        if (item) {
          item[col] = val;
        }
      }
    }, true); // useCapture for blur

    // Resizing logic
    let isResizing = false;
    let currentResizer = null;
    let startX = 0;
    let startW = 0;
    let colName = '';

    this.bindEvent('#grid-header', 'mousedown', (e) => {
      if (e.target.classList.contains('resizer') && features.resize) {
        isResizing = true;
        currentResizer = e.target;
        currentResizer.classList.add('dragging');
        colName = currentResizer.getAttribute('data-col');
        startX = e.clientX;
        
        // Get current width from computed styles or fallback
        const th = currentResizer.parentElement;
        startW = th.getBoundingClientRect().width;
        
        e.preventDefault();
      }
    });

    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newW = Math.max(50, startW + (e.clientX - startX));
      // Instantly update the CSS variable on the host, which pierces the Shadow DOM natively
      this.style.setProperty(`--col-${colName}-w`, `${newW}px`);
    };
    document.addEventListener('mousemove', handleMouseMove);
    this._cleanups.push(() => document.removeEventListener('mousemove', handleMouseMove));

    const handleMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        if (currentResizer) currentResizer.classList.remove('dragging');
        currentResizer = null;
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    this._cleanups.push(() => document.removeEventListener('mouseup', handleMouseUp));

    // Initial render
    fullRefresh();

    grid.bindList(getViewData, (item, index) => {
      let html = `<div class="row ${state.selection.has(item.id) ? 'selected' : ''}">`;
      
      if (features.select) {
        html += `<span class="col-select"><input type="checkbox" class="row-select" data-id="${item.id}" ${state.selection.has(item.id) ? 'checked' : ''}></span>`;
      }
      
      html += `<span class="col-id">${item.id}</span>`;
      
      if (features.edit) {
        html += `<span class="col-name cell-edit" data-id="${item.id}" data-col="name" contenteditable="true">${item.name}</span>`;
        html += `<span class="col-department cell-edit" data-id="${item.id}" data-col="department" contenteditable="true">${item.department}</span>`;
        html += `<span class="col-role cell-edit" data-id="${item.id}" data-col="role" contenteditable="true">${item.role}</span>`;
      } else {
        html += `<span class="col-name">${item.name}</span>`;
        html += `<span class="col-department">${item.department}</span>`;
        html += `<span class="col-role">${item.role}</span>`;
      }
      
      html += `
        <span class="col-status">
          <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
        </span>
        <span class="col-actions"></span>
      </div>`;
      
      return html;
    }, { itemHeight: 48, overscan: 10, styles: gridStyles });
  }
}

customElements.define('sample-grid', SampleGrid);
