import { FeElement } from './component.js';

export class FeCard extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: block;
          contain: content; /* High performance layout isolation */
          background: var(--surface-1, rgba(255, 255, 255, 0.8));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
          padding: var(--spacing-md, 1rem);
          container-type: inline-size;
        }
      </style>
      <slot></slot>
    `;
  }
  bind() {}
}

export class FeAccordionGroup extends FeElement {
  template() {
    return `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }
  bind() {
    const groupName = this.getAttribute('name') || `accordion-group-${this.id || Math.random().toString(36).slice(2)}`;
    const slot = this.root.querySelector('slot');
    const onSlotChange = () => {
      const children = slot.assignedElements();
      children.forEach(child => {
        if (child.tagName.toLowerCase() === 'fe-accordion' && !child.hasAttribute('name')) {
          child.setAttribute('name', groupName);
        }
      });
    };
    slot.addEventListener('slotchange', onSlotChange);
    this._cleanups.push(() => slot.removeEventListener('slotchange', onSlotChange));
  }
}

export class FeAccordion extends FeElement {
  template() {
    return `
      <style>
        :host { 
          display: block; 
          interpolate-size: allow-keywords; 
        }
        details {
          border-bottom: 1px solid var(--border-color, #eee);
        }
        summary {
          cursor: pointer;
          list-style: none; /* Hide default triangle natively */
          padding: 1rem 0;
          font-weight: 500;
        }
        summary::-webkit-details-marker { display: none; }
        
        #content-wrapper {
          block-size: 0;
          overflow: hidden;
          transition: block-size 0.2s ease-out;
        }
        details[open] #content-wrapper {
          block-size: auto;
        }
        @starting-style {
          details[open] #content-wrapper {
            block-size: 0;
          }
        }
        .content-inner {
          padding-bottom: 1rem;
        }
      </style>
      <details id="details">
        <summary id="summary"><slot name="header"></slot></summary>
        <div id="content-wrapper">
           <div class="content-inner">
             <slot></slot>
           </div>
        </div>
      </details>
    `;
  }
  
  bind() {
    const details = this.root.querySelector('#details');
    const name = this.getAttribute('name');
    if (name) details.setAttribute('name', name);
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'open') {
          if (this.hasAttribute('open')) {
            details.setAttribute('open', '');
          } else {
            details.removeAttribute('open');
          }
        } else if (m.attributeName === 'name') {
           details.setAttribute('name', this.getAttribute('name'));
        }
      });
    });
    observer.observe(this, { attributes: true });
    this._cleanups.push(() => observer.disconnect());
    
    const onToggle = () => {
      if (details.open) {
        this.setAttribute('open', '');
      } else {
        this.removeAttribute('open');
      }
    };
    details.addEventListener('toggle', onToggle);
    this._cleanups.push(() => details.removeEventListener('toggle', onToggle));
  }
}

export class FeTooltip extends FeElement {
  template() {
    return `
      <style>
        :host { display: contents; }
        [popover] {
          margin: 0;
          padding: 0.5rem 0.75rem;
          background: var(--surface-inverse, #333);
          color: var(--text-inverse, #fff);
          border-radius: 6px;
          border: none;
          font-size: 0.875rem;
          pointer-events: none; /* Tooltips shouldn't interfere with clicks */
          
          /* Native anchor positioning */
          position-anchor: --fe-tooltip-anchor;
          inset-area: top;
          position-try-options: flip-block, flip-inline;
          
          /* Smooth animations */
          opacity: 0;
          transition: opacity 0.2s ease, display 0.2s allow-discrete, overlay 0.2s allow-discrete;
        }
        [popover]:popover-open {
          opacity: 1;
        }
        @starting-style {
          [popover]:popover-open {
            opacity: 0;
          }
        }
      </style>
      <!-- We use 'auto' natively if hint isn't supported, but hint is ideal for tooltips -->
      <div id="tooltip" popover="hint" role="tooltip">
        <slot></slot>
      </div>
    `;
  }
  
  bind() {
    const tooltip = this.root.querySelector('#tooltip');
    // Fast fallback if hint is unsupported
    if (!HTMLElement.prototype.hasOwnProperty("popover") || typeof tooltip.showPopover !== 'function') {
        tooltip.style.display = 'none';
        tooltip.showPopover = function() { this.style.display = 'block'; this.setAttribute('popover-open', ''); };
        tooltip.hidePopover = function() { this.style.display = 'none'; this.removeAttribute('popover-open'); };
    } else {
        // popover is supported, but hint might not be. The browser gracefully falls back to ignoring the invalid value, 
        // making it act like a normal div. We must force it to "auto" if it rejected "hint".
        if (tooltip.getAttribute('popover') !== 'hint') {
            tooltip.setAttribute('popover', 'auto');
        }
    }

    const triggerId = this.getAttribute('trigger');
    
    const setupTimer = setTimeout(() => {
      const rootNode = this.getRootNode();
      const triggerEl = triggerId ? rootNode.querySelector(`#${triggerId}`) : this.previousElementSibling;
      if (!triggerEl) return;
      
      let timeout;
      const show = () => {
        clearTimeout(timeout);
        if (!window.CSS || !CSS.supports('position-anchor', '--foo')) {
          const rect = triggerEl.getBoundingClientRect();
          tooltip.style.position = 'fixed';
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
          tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
        }
        try { tooltip.showPopover(); } catch(e) {}
      };
      const hide = () => {
        timeout = setTimeout(() => {
          try { tooltip.hidePopover(); } catch(e) {}
        }, 50);
      };

      triggerEl.addEventListener('mouseenter', show);
      triggerEl.addEventListener('mouseleave', hide);
      triggerEl.addEventListener('focus', show);
      triggerEl.addEventListener('blur', hide);

      this._cleanups.push(() => {
        triggerEl.removeEventListener('mouseenter', show);
        triggerEl.removeEventListener('mouseleave', hide);
        triggerEl.removeEventListener('focus', show);
        triggerEl.removeEventListener('blur', hide);
        clearTimeout(timeout);
      });
    }, 0);
    this._cleanups.push(() => clearTimeout(setupTimer));
  }
}

export class FeMenu extends FeElement {
  template() {
    return `
      <style>
        :host { display: contents; }
        [popover] {
          margin: 0;
          padding: 0.5rem;
          background: var(--surface-1, #fff);
          border: 1px solid var(--border-color, #ccc);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          
          position-anchor: --fe-menu-anchor;
          inset-area: bottom span-right;
          position-try-options: flip-block, flip-inline;
          
          opacity: 0;
          transition: opacity 0.2s ease, display 0.2s allow-discrete, overlay 0.2s allow-discrete;
        }
        [popover]:popover-open {
          opacity: 1;
        }
        @starting-style {
          [popover]:popover-open {
            opacity: 0;
          }
        }
      </style>
      <div id="menu" popover="auto">
        <slot></slot>
      </div>
    `;
  }

  bind() {
    const menu = this.root.querySelector('#menu');
    const triggerId = this.getAttribute('trigger');
    
    if (!HTMLElement.prototype.hasOwnProperty("popover") || typeof menu.showPopover !== 'function') {
        menu.style.display = 'none';
        menu.togglePopover = function() { 
            if (this.style.display === 'none') {
                this.style.display = 'block'; 
            } else {
                this.style.display = 'none';
            }
        };
    }

    const setupTimer = setTimeout(() => {
      const rootNode = this.getRootNode();
      const triggerEl = triggerId ? rootNode.querySelector(`#${triggerId}`) : this.previousElementSibling;
      if (!triggerEl) return;

      const toggle = () => {
        if (!window.CSS || !CSS.supports('position-anchor', '--foo')) {
          const rect = triggerEl.getBoundingClientRect();
          menu.style.position = 'fixed';
          menu.style.top = `${rect.bottom + 4}px`;
          menu.style.left = `${rect.left}px`;
        }
        try { menu.togglePopover(); } catch(e) {}
      };

      triggerEl.addEventListener('click', toggle);
      triggerEl.setAttribute('aria-haspopup', 'menu');
      
      const onToggle = (e) => {
        triggerEl.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false');
      };
      menu.addEventListener('toggle', onToggle);

      this._cleanups.push(() => {
        triggerEl.removeEventListener('click', toggle);
        menu.removeEventListener('toggle', onToggle);
      });
    }, 0);
    this._cleanups.push(() => clearTimeout(setupTimer));
  }
}

export class FeToast extends FeElement {
  template() {
    return `
      <style>
        :host { display: block; }
        [popover] {
          margin: 0;
          padding: 1rem;
          background: var(--surface-toast, #222);
          color: var(--text-toast, #fff);
          border-radius: 8px;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          
          bottom: calc(1rem + var(--toast-offset, 0rem));
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease, bottom 0.3s ease, display 0.3s allow-discrete, overlay 0.3s allow-discrete;
        }
        @supports (bottom: calc(sibling-index() * 1px)) {
          [popover] {
             bottom: calc(1rem + (sibling-index() * 4rem));
          }
        }
        [popover]:popover-open {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        @starting-style {
          [popover]:popover-open {
            opacity: 0;
            transform: translateX(-50%) translateY(1rem);
          }
        }
      </style>
      <div id="toast" popover="manual">
        <slot></slot>
      </div>
    `;
  }
  
  bind() {
    const toast = this.root.querySelector('#toast');
    const duration = parseInt(this.getAttribute('duration') || '3000', 10);
    
    if (!HTMLElement.prototype.hasOwnProperty("popover") || typeof toast.showPopover !== 'function') {
        toast.style.display = 'none';
        toast.showPopover = function() { this.style.display = 'block'; this.setAttribute('popover-open', ''); };
        toast.hidePopover = function() { this.style.display = 'none'; this.removeAttribute('popover-open'); };
    }

    // Give DOM a microtick to render
    const setupTimer = setTimeout(() => {
        try { toast.showPopover(); } catch(e) {}
        
        if (duration > 0) {
          const hideTimer = setTimeout(() => {
            try { toast.hidePopover(); } catch(e) {}
            const removeTimer = setTimeout(() => this.remove(), 300);
            this._cleanups.push(() => clearTimeout(removeTimer));
          }, duration);
          this._cleanups.push(() => clearTimeout(hideTimer));
        }
    }, 10);
    this._cleanups.push(() => clearTimeout(setupTimer));
  }
}

export const globalToast = {
  show(message, options = {}) {
    const toast = document.createElement('fe-toast');
    toast.textContent = message;
    if (options.duration) toast.setAttribute('duration', options.duration);
    
    if (!window.CSS || !CSS.supports('bottom: calc(sibling-index() * 1px)')) {
      const existing = document.querySelectorAll('fe-toast');
      toast.style.setProperty('--toast-offset', `${existing.length * 4}rem`);
    }
    
    document.body.appendChild(toast);
  }
};

export class FeTabs extends FeElement {
  template() {
    return `
      <style>
        :host { display: block; }
        .tab-list {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--border-color, #ccc);
          position: relative;
        }
        ::slotted([slot="tab"]) {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
        }
        ::slotted([slot="tab"][aria-selected="true"]) {
          anchor-name: --active-tab;
          color: var(--brand-primary, #005fcc);
        }
        
        .indicator {
          position: absolute;
          bottom: -1px;
          height: 2px;
          background: var(--brand-primary, #005fcc);
          transition: inset 0.2s ease, left 0.2s ease, width 0.2s ease;
        }
        @supports (position-anchor: --active-tab) {
          .indicator {
            position-anchor: --active-tab;
            inset-inline-start: anchor(left);
            inset-inline-end: anchor(right);
          }
        }
      </style>
      <div class="tab-list" role="tablist">
        <slot name="tab"></slot>
        <div class="indicator"></div>
      </div>
      <div class="tab-panels">
        <slot name="panel"></slot>
      </div>
    `;
  }

  bind() {
    const tabSlot = this.root.querySelector('slot[name="tab"]');
    const panelSlot = this.root.querySelector('slot[name="panel"]');
    const indicator = this.root.querySelector('.indicator');

    const updateIndicator = (tab) => {
      if (!window.CSS || !CSS.supports('position-anchor', '--foo')) {
        indicator.style.left = `${tab.offsetLeft}px`;
        indicator.style.width = `${tab.offsetWidth}px`;
      }
    };

    const updateTabs = () => {
      const tabs = tabSlot.assignedElements();
      const panels = panelSlot.assignedElements();

      tabs.forEach((tab, index) => {
        tab.setAttribute('role', 'tab');
        const panel = panels[index];
        if (panel) {
          panel.setAttribute('role', 'tabpanel');
          if (tab.getAttribute('aria-selected') !== 'true') {
            panel.setAttribute('hidden', 'until-found');
          } else {
            panel.removeAttribute('hidden');
            updateIndicator(tab);
          }
        }
      });
    };

    const onSlotChange = () => updateTabs();
    tabSlot.addEventListener('slotchange', onSlotChange);
    panelSlot.addEventListener('slotchange', onSlotChange);
    this._cleanups.push(() => {
      tabSlot.removeEventListener('slotchange', onSlotChange);
      panelSlot.removeEventListener('slotchange', onSlotChange);
    });

    const onClick = (e) => {
      const tabs = tabSlot.assignedElements();
      const panels = panelSlot.assignedElements();
      const tab = e.target.closest('[role="tab"]');
      if (!tab) return;
      const index = tabs.indexOf(tab);
      if (index === -1) return;

      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      
      panels.forEach(p => p.setAttribute('hidden', 'until-found'));
      const panel = panels[index];
      if (panel) panel.removeAttribute('hidden');

      updateIndicator(tab);
    };
    tabSlot.addEventListener('click', onClick);
    this._cleanups.push(() => tabSlot.removeEventListener('click', onClick));

    const onBeforeMatch = (e) => {
      const tabs = tabSlot.assignedElements();
      const panels = panelSlot.assignedElements();
      const panel = e.target.closest('[role="tabpanel"]');
      if (!panel) return;
      const index = panels.indexOf(panel);
      if (index === -1) return;

      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tabs[index].setAttribute('aria-selected', 'true');
      
      panels.forEach(p => {
        if (p !== panel) p.setAttribute('hidden', 'until-found');
      });

      updateIndicator(tabs[index]);
    };
    panelSlot.addEventListener('beforematch', onBeforeMatch);
    this._cleanups.push(() => panelSlot.removeEventListener('beforematch', onBeforeMatch));
    
    const onKeyDown = (e) => {
      const tabs = tabSlot.assignedElements();
      const selectedIndex = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      let nextIndex = selectedIndex;
      if (e.key === 'ArrowRight') {
        nextIndex = (selectedIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (selectedIndex - 1 + tabs.length) % tabs.length;
      }
      if (nextIndex !== selectedIndex && nextIndex >= 0) {
        tabs[nextIndex].click();
        tabs[nextIndex].focus();
      }
    };
    tabSlot.addEventListener('keydown', onKeyDown);
    this._cleanups.push(() => tabSlot.removeEventListener('keydown', onKeyDown));
  }
}

customElements.define('fe-card', FeCard);
customElements.define('fe-accordion-group', FeAccordionGroup);
customElements.define('fe-accordion', FeAccordion);
customElements.define('fe-tooltip', FeTooltip);
customElements.define('fe-menu', FeMenu);
customElements.define('fe-toast', FeToast);
customElements.define('fe-tabs', FeTabs);
