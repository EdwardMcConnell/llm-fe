import { FeElement } from './component.js';
import { createEffect } from './reactivity.js';
import { globalTheme } from './theme.js';
import { globalTime } from './time.js';
import { globalI18n } from './i18n.js';
import { globalTelemetry } from './telemetry.js';

/**
 * Base Accessible Button Primitive.
 * LLMs should use <fe-button> instead of raw <button> or <div>.
 * Guarantees correct ARIA roles and keyboard interactions.
 */
export class FeButton extends FeElement {
  constructor() {
    super({ shadowOptions: { mode: 'open', delegatesFocus: true } });
  }

  template() {
    return `
      <style>
        :host {
          display: inline-flex;
        }
        button {
          all: inherit;
          cursor: pointer;
          user-select: none;
          /* Reset default button styling to inherit from host */
          border: none;
          background: none;
          padding: 0;
          font: inherit;
          color: inherit;
          outline: none;
        }
        /* The browser natively handles focus outlines on the button */
        button:focus-visible {
          outline: 2px solid var(--brand-primary, #005fcc);
          outline-offset: 2px;
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      </style>
      <button id="native-button"><slot></slot></button>
    `;
  }

  bind() {
    const btn = this.root.querySelector('#native-button');

    // Sync disabled attribute
    const observer = new MutationObserver(() => {
      if (this.hasAttribute('disabled')) {
        btn.setAttribute('disabled', 'true');
      } else {
        btn.removeAttribute('disabled');
      }
    });
    observer.observe(this, { attributes: true, attributeFilter: ['disabled'] });

    // Native Telemetry Hook (Phase 9)
    btn.addEventListener('click', (e) => {
      globalTelemetry.track('USER_ACTION', {
        component: 'fe-button',
        action: 'click',
        id: this.id || 'anonymous_button'
      });
    });
  }
}

/**
 * Base Accessible Dialog Primitive.
 * LLMs should use <fe-dialog> instead of raw modals.
 * Guarantees focus trapping, aria-modal, and Escape-to-close behavior.
 */
export class FeDialog extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: block;
        }
        dialog {
          padding: 1rem;
          border: none;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        /* Native backdrop styling! */
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }
      </style>
      <dialog id="native-dialog">
        <slot></slot>
      </dialog>
    `;
  }

  bind() {
    const dialog = this.root.querySelector('#native-dialog');
    
    // Light dismiss (Click outside to close)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  }

  open() {
    const dialog = this.root.querySelector('#native-dialog');
    if (dialog && !dialog.open) {
      dialog.showModal(); // Native focus trap and Escape handler
    }
  }

  close() {
    const dialog = this.root.querySelector('#native-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }
}

// Automatically define the custom elements for the framework
customElements.define('fe-button', FeButton);
customElements.define('fe-dialog', FeDialog);

import { globalRouter } from './router.js';

/**
 * Base Accessible Link Primitive for the Router.
 * Handles instantaneous traversal via hover-intent prefetching.
 */
export class FeLink extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: inline;
          cursor: pointer;
        }
        a {
          color: inherit;
          text-decoration: inherit;
        }
      </style>
      <a id="link"><slot></slot></a>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    const a = this.root.querySelector('#link');
    if (this.hasAttribute('href')) {
      a.setAttribute('href', this.getAttribute('href'));
    }
  }

  bind() {
    const a = this.root.querySelector('#link');
    let prefetchTimeout = null;

    // 1. Intercept Click
    this.addEventListener('click', (e) => {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href) {
        globalRouter.navigate(href);
      }
    });

    // 2. Hover Intent Pre-fetch
    this.addEventListener('mouseenter', () => {
      // If hovered for >50ms, prefetch the route data!
      prefetchTimeout = setTimeout(() => {
        const href = this.getAttribute('href');
        if (href) {
          globalRouter.preload(href);
        }
      }, 50);
    });

    this.addEventListener('mouseleave', () => {
      if (prefetchTimeout) {
        clearTimeout(prefetchTimeout);
      }
    });
  }
}

customElements.define('fe-link', FeLink);

/**
 * Base Accessible Form Primitive.
 * Automatically handles submit interception.
 */
export class FeForm extends FeElement {
  template() {
    return `
      <style>
        :host { display: block; }
      </style>
      <form id="fe-native-form" novalidate>
        <slot></slot>
      </form>
    `;
  }

  bind() {
    const form = this.root.querySelector('#fe-native-form');
    // The actual state binding happens in the parent component via this.bindForm()

    // Native Telemetry Hook (Phase 9)
    form.addEventListener('submit', () => {
      globalTelemetry.track('FORM_SUBMIT', {
        id: this.id || 'anonymous_form'
      });
    });
  }
}

customElements.define('fe-form', FeForm);

/**
 * Base Accessible Time Primitive.
 * Native localization and ticking relative formatting.
 */
export class FeTime extends FeElement {
  template() {
    return `
      <style>
        :host { display: inline; }
        time { font-variant-numeric: tabular-nums; }
      </style>
      <time id="time-node"></time>
    `;
  }

  bind() {
    const timeNode = this.root.querySelector('#time-node');
    const updateTime = () => {
      const iso = this.getAttribute('datetime');
      if (!iso) return;
      console.log('FeTime updateTime with iso:', iso);
      timeNode.setAttribute('datetime', iso);
      
      const format = this.getAttribute('format') || 'absolute';
      if (format === 'relative') {
        timeNode.textContent = globalTime.relativeTime(iso);
      } else {
        timeNode.textContent = globalTime.absoluteTime(iso);
      }
    };

    updateTime();

    // Auto-update if relative
    if (this.getAttribute('format') === 'relative') {
      const intervalId = setInterval(updateTime, 60000);
      this._cleanups.push(() => clearInterval(intervalId));
    }

    // React to attribute changes natively
    const observer = new MutationObserver(() => updateTime());
    observer.observe(this, { attributes: true, attributeFilter: ['datetime', 'format'] });
    this._cleanups.push(() => observer.disconnect());
  }
}

customElements.define('fe-time', FeTime);

/**
 * Base Accessible Data Grid Primitive.
 * Natively virtualizes massive datasets using mathematical DOM Recycling.
 * Guarantees zero memory leaks regardless of dataset size.
 */
export class FeGrid extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: block;
          overflow-y: auto;
          position: relative;
          contain: strict; /* High performance layout isolation */
        }
        #ghost {
          position: absolute;
          top: 0;
          left: 0;
          width: 1px;
          pointer-events: none;
        }
        #viewport {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          contain: layout paint style;
        }
      </style>
      <div id="ghost"></div>
      <div id="viewport"></div>
    `;
  }

  bind() {
    // Scroll listener is attached dynamically in bindList
  }

  /**
   * Binds a reactive array signal to the grid.
   * @param {() => Array<any>} getSignal 
   * @param {(item: any, index: number) => string} renderFn 
   * @param {{ itemHeight: number, overscan?: number, styles?: string }} options 
   */
  bindList(getSignal, renderFn, options) {
    if (options.styles) {
      // Autonomously construct and inject custom Shadow DOM styles exactly once
      let styleEl = this.root.querySelector('#injected-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'injected-styles';
        styleEl.textContent = options.styles;
        this.root.appendChild(styleEl);
      } else {
        styleEl.textContent = options.styles;
      }
    }

    const ghost = this.root.querySelector('#ghost');
    const viewport = this.root.querySelector('#viewport');
    
    const itemHeight = options.itemHeight || 40;
    const overscan = options.overscan || 5;
    
    let isTicking = false;
    let nodePool = [];
    let currentStartIndex = -1;

    const updatePool = (visibleCount) => {
      const requiredNodes = visibleCount + (overscan * 2);
      
      // Add missing nodes
      while (nodePool.length < requiredNodes) {
        const div = document.createElement('div');
        div.style.height = `${itemHeight}px`;
        div.style.overflow = 'hidden';
        viewport.appendChild(div);
        nodePool.push(div);
      }
      
      // Remove excess nodes
      while (nodePool.length > requiredNodes) {
        const div = nodePool.pop();
        viewport.removeChild(div);
      }
    };

    this._renderWindow = () => {
      const data = getSignal() || [];
      const total = data.length;
      
      // Set Ghost height to trigger native scrollbar
      ghost.style.height = `${total * itemHeight}px`;

      const hostHeight = this.clientHeight || 0;
      if (hostHeight === 0) return; // Not visible yet

      const visibleCount = Math.ceil(hostHeight / itemHeight);
      updatePool(visibleCount);

      const scrollTop = this.scrollTop;
      const rawStartIndex = Math.floor(scrollTop / itemHeight);
      let startIndex = Math.max(0, rawStartIndex - overscan);
      
      // Don't over-scroll past bottom
      if (startIndex + nodePool.length > total) {
        startIndex = Math.max(0, total - nodePool.length);
      }

      // Optimize: Only re-render DOM nodes if the index window actually shifted,
      // OR if the reactivity engine explicitly fired this cycle (data changed).
      // Wait, we need to re-render if data changed. So we always re-render here,
      // but we can optimize string diffing by only setting innerHTML if it changed.
      
      viewport.style.transform = `translateY(${startIndex * itemHeight}px)`;

      for (let i = 0; i < nodePool.length; i++) {
        const itemIndex = startIndex + i;
        const node = nodePool[i];
        
        if (itemIndex < total) {
          node.style.display = 'block';
          const newHtml = renderFn(data[itemIndex], itemIndex);
          if (node.innerHTML !== newHtml) {
            node.innerHTML = newHtml;
          }
        } else {
          node.style.display = 'none';
        }
      }
      
      currentStartIndex = startIndex;
      isTicking = false;
    };

    // We must wait for the component to actually have physical height
    // so we can calculate how many nodes to pool.
    const resizeObserver = new ResizeObserver(() => {
      if (this._renderWindow) this._renderWindow();
    });
    resizeObserver.observe(this);
    this._cleanups.push(() => resizeObserver.disconnect());

    const handleScroll = () => {
      if (!isTicking) {
        window.requestAnimationFrame(this._renderWindow);
        isTicking = true;
      }
    };

    this.addEventListener('scroll', handleScroll, { passive: true });
    this._cleanups.push(() => this.removeEventListener('scroll', handleScroll));

    // Reactivity Hook: Automatically re-run the full render logic when the array changes.
    createEffect(() => {
      // Just reading getSignal() registers this component as a subscriber to the CRDT list!
      getSignal();
      // Fire render frame
      window.requestAnimationFrame(this._renderWindow);
    });
  }
}

customElements.define('fe-grid', FeGrid);

/**
 * Autonomous Localization Primitive.
 * Automatically synchronizes with the CRDT translations namespace
 * and visually updates when the user's language preferences change.
 */
export class FeText extends FeElement {
  static get observedAttributes() {
    return ['t'];
  }

  constructor() {
    super();
    // Reactivity engine must be imported dynamically to avoid circular issues during class init, 
    // wait, we already imported createEffect statically at the top!
  }

  template() {
    return `<span id="text-node"></span>`;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 't' && this._setKey) {
      this._setKey(newVal);
    }
  }

  bind() {
    const textNode = this.root.querySelector('#text-node');
    
    // We must load createSignal statically or use a manual trigger.
    // Let's just import createSignal at the top.
    import('./reactivity.js').then(({ createSignal }) => {
      const [getKey, setKey] = createSignal(this.getAttribute('t') || '');
      this._setKey = setKey;

      createEffect(() => {
        const key = getKey();
        if (key) {
          textNode.textContent = globalI18n.t(key);
        } else {
          textNode.textContent = '';
        }
      });
    });
  }
}

customElements.define('fe-text', FeText);
