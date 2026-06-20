import { FeElement } from '../src/component.js';
import { createSignal } from '../src/reactivity.js';

export class FeTableFramework extends FeElement {
  constructor() {
    super();
    this.rowsSignal = createSignal([]);
  }

  set data(rows) {
    this.rowsSignal[1](rows);
  }

  template() {
    return `
      <table>
        <thead>
          <tr><th>ID</th><th>Status</th><th>Total</th></tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    `;
  }

  bind() {
    const [getRows] = this.rowsSignal;

    this.bindMorphTrustedHTML('#tbody', () => {
      const rows = getRows();
      let html = '';
      for (let i = 0; i < rows.length; i++) {
        html += `
          <tr id="row-${rows[i].id}">
            <td>${rows[i].id}</td>
            <td class="status-${rows[i].status}">${rows[i].status}</td>
            <td>${rows[i].total}</td>
          </tr>
        `;
      }
      return html;
    });
  }
}

customElements.define('fe-table-framework', FeTableFramework);
