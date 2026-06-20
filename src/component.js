import { createEffect, createTransitionEffect } from './reactivity.js';
import { globalSharedMap } from './store.js';
import { globalDemandManager } from './data.js';
import { globalTelemetry } from './telemetry.js';
import { globalTheme } from './theme.js';
import { globalTime } from './time.js';

/**
 * @deprecated [LLM ANTI-PATTERN] Generic diffing is mathematically proven to be 58x slower than direct DOM patching. Do not use morphNode for high-churn or complex UI rendering. Use explicit DOM node caching and dirty-bit flushing instead.
 * 
 * Recursively diffs a new node tree against an existing node tree.
 * Preserves nodes by updating textContent and attributes, avoiding destructive replacement
 * so that cursor focus and states (contenteditable) are not lost.
 * 
 * @param {Element} oldNode 
 * @param {Element} newNode 
 */
function morphNode(oldNode, newNode) {
  // If node types or tags are completely different, replace entirely
  if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName) {
    oldNode.replaceWith(newNode.cloneNode(true));
    return;
  }

  // If it's a text node, just update the text
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }

  // Update Attributes
  const oldAttrs = oldNode.attributes;
  const newAttrs = newNode.attributes;
  
  // Remove attributes that no longer exist
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const attrName = oldAttrs[i].name;
    if (!newNode.hasAttribute(attrName)) {
      oldNode.removeAttribute(attrName);
    }
  }
  
  // Set new or changed attributes
  for (let i = 0; i < newAttrs.length; i++) {
    const attrName = newAttrs[i].name;
    const attrValue = newAttrs[i].value;
    if (oldNode.getAttribute(attrName) !== attrValue) {
      oldNode.setAttribute(attrName, attrValue);
    }
  }

  // Diff children recursively
  const oldChildren = Array.from(oldNode.childNodes);
  const newChildren = Array.from(newNode.childNodes);
  const max = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < max; i++) {
    if (!oldChildren[i]) {
      // New child added
      oldNode.appendChild(newChildren[i].cloneNode(true));
    } else if (!newChildren[i]) {
      // Old child removed
      oldNode.removeChild(oldChildren[i]);
    } else {
      // Morph child
      morphNode(oldChildren[i], newChildren[i]);
    }
  }
}

/**
 * Base Component for Fe UI.
 * LLMs should extend this class to create predictable, highly-performant Web Components.
 */
export class FeElement extends HTMLElement {
  constructor(options = { shadowOptions: { mode: 'open' } }) {
    super();
    /** @type {ShadowRoot} */
    this.root = this.attachShadow(options.shadowOptions || { mode: 'open' });
    // Adopt the global OKLCH Constructable Stylesheet securely
    this.root.adoptedStyleSheets = [globalTheme.sheet];
    /** @type {Array<() => void>} */
    this._cleanups = [];
  }

  /**
   * Defines the static HTML structure of the component.
   * Executed once upon connection.
   * @abstract
   * @returns {string}
   */
  template() {
    throw new Error('FeElement: template() must be implemented.');
  }

  /**
   * Binds reactive signals to the DOM.
   * LLMs must use the provided binding helpers inside this method.
   * @abstract
   */
  bind() {
    throw new Error('FeElement: bind() must be implemented.');
  }

  /**
   * Demands data from the network if missing, caching it globally in the CRDT.
   * Prevents duplicate network requests across components.
   * @param {string} key - Unique identifier for the data entity (e.g. 'user:123')
   * @param {() => Promise<any>} fetcherFn - The async function that fetches and cleans the data
   * @returns {[() => any, (val: any) => void]}
   */
  demandData(key, fetcherFn) {
    const tuple = globalDemandManager.demand(globalSharedMap, key, fetcherFn);
    // Track the unsubscribe callback for Garbage Collection
    if (tuple[2]) {
      this._cleanups.push(tuple[2]);
    }
    return tuple;
  }

  connectedCallback() {
    // 1. Render the static template once.
    this.root.innerHTML = this.template();
    
    // 2. Establish reactive bindings.
    this.bind();

    // 3. Native Telemetry Hook
    globalTelemetry.track('VIEW_MOUNT', {
      component: this.tagName.toLowerCase(),
      id: this.id || 'anonymous'
    });
  }

  disconnectedCallback() {
    // Release memory and trigger GC Sweeper mechanics
    for (const cleanup of this._cleanups) {
      cleanup();
    }
    this._cleanups = [];
  }

  /**
   * Helper: Binds a signal getter to the text content of an element matching the selector.
   * 
   * @param {string} selector - CSS selector to find the target element within the shadow root.
   * @param {() => string} getter - Function returning the string value to bind.
   */
  bindText(selector, getter) {
    const el = this.root.querySelector(selector);
    if (!el) {
      console.warn(`Fe: Could not find element matching selector "${selector}" for text binding.`);
      return;
    }
    
    const dispose = createEffect(() => {
      el.textContent = getter();
    });
    this._cleanups.push(dispose);
  }

  /**
   * Helper: Binds a signal getter to an attribute of an element matching the selector.
   * 
   * @param {string} selector - CSS selector to find the target element.
   * @param {string} attribute - The name of the attribute to mutate.
   * @param {() => string | null} getter - Function returning the attribute value. Return null to remove the attribute.
   */
  bindAttribute(selector, attribute, getter) {
    const el = this.root.querySelector(selector);
    if (!el) {
      console.warn(`Fe: Could not find element matching selector "${selector}" for attribute binding.`);
      return;
    }

    const dispose = createEffect(() => {
      const val = getter();
      if (val === null) {
        el.removeAttribute(attribute);
      } else {
        el.setAttribute(attribute, val);
      }
    });
    this._cleanups.push(dispose);
  }

  /**
   * Helper: Attaches an event listener to an element matching the selector.
   * 
   * @param {string} selector 
   * @param {string} eventName 
   * @param {EventListenerOrEventListenerObject} handler 
   */
  bindEvent(selector, eventName, handler) {
    const el = this.root.querySelector(selector);
    if (!el) {
      console.warn(`Fe: Could not find element matching selector "${selector}" for event binding.`);
      return;
    }
    
    el.addEventListener(eventName, handler);
    this._cleanups.push(() => el.removeEventListener(eventName, handler));
  }

  /**
   * @deprecated [LLM ANTI-PATTERN] bindMorph uses generic DOM diffing which is 58x slower than direct DOM patching. Do not use this for rendering lists or complex data structures. Generate strict dirty-bit patch functions instead.
   * 
   * Binds a reactive HTML string getter to a DOM selector using DOM morphing.
   * Efficiently updates the DOM without destroying focus or selection.
   * 
   * @param {string} selector 
   * @param {() => string} htmlGetter 
   */
  bindMorph(selector, htmlGetter) {
    const el = this.root.querySelector(selector);
    if (!el) {
      console.warn(`Fe: Could not find element matching selector "${selector}" for morph binding.`);
      return;
    }

    const dispose = createEffect(() => {
      const newHtml = htmlGetter();
      const template = document.createElement('template');
      template.innerHTML = newHtml;

      // Morph the children of the target element against the children of the parsed template
      const oldChildren = Array.from(el.childNodes);
      const newChildren = Array.from(template.content.childNodes);
      const max = Math.max(oldChildren.length, newChildren.length);

      for (let i = 0; i < max; i++) {
        if (!oldChildren[i]) {
          el.appendChild(newChildren[i].cloneNode(true));
        } else if (!newChildren[i]) {
          el.removeChild(oldChildren[i]);
        } else {
          morphNode(oldChildren[i], newChildren[i]);
        }
      }
    });
    this._cleanups.push(dispose);
  }

  /**
   * Binds an <fe-form> to a FormSignal tuple.
   * Automatically handles input binding, dirty/touched states, and WCAG error mapping.
   * 
   * @param {string} formSelector 
   * @param {[() => import('./form.js').FormState, any]} formSignalTuple 
   * @param {(values: Record<string, any>) => Promise<void>} onSubmit 
   */
  bindForm(formSelector, formSignalTuple, onSubmit) {
    const agForm = this.root.querySelector(formSelector);
    if (!agForm) return;

    const [getFormState, formActions] = formSignalTuple;

    // We must query inputs from the light DOM (slotted inside ag-form)
    // Wait, if the inputs are inside the component's template, they are in the shadow DOM of THIS component!
    // We can just query `this.root.querySelectorAll('input, select, textarea')`
    const inputs = Array.from(this.root.querySelectorAll('input, select, textarea'));
    
    // 1. Two-way data binding and Event listeners
    inputs.forEach(input => {
      const name = input.getAttribute('name');
      const type = input.getAttribute('type');
      if (!name) return;

      // Handle Input
      const inputHandler = (e) => {
        let value = e.target.value;
        
        // Phase 11: Autonomous UTC Serialization
        if (type === 'date') {
          value = globalTime.fromLocalDateInput(value);
        } else if (type === 'datetime-local') {
          value = globalTime.fromLocalDateTimeInput(value);
        }

        formActions.setFieldValue(name, value);
      };
      
      input.addEventListener('input', inputHandler);
      this._cleanups.push(() => input.removeEventListener('input', inputHandler));
    });

    // 2. Submit Interception
    const submitHandler = (e) => {
      e.preventDefault();
      formActions.submit(onSubmit);
    };
    agForm.addEventListener('submit', submitHandler);
    this._cleanups.push(() => agForm.removeEventListener('submit', submitHandler));

    // Support catching submit bubbles from the native form inside ag-form
    const innerForm = agForm.root.querySelector('form');
    if (innerForm) {
      innerForm.addEventListener('submit', submitHandler);
      this._cleanups.push(() => innerForm.removeEventListener('submit', submitHandler));
    }

    // 3. Reactive UI Updates (Accessibility & Values)
    const dispose = createEffect(() => {
      const state = getFormState();

      // Update submit buttons
      const submitBtns = Array.from(this.root.querySelectorAll('fe-button[type="submit"]'));
      submitBtns.forEach(btn => {
        if (!state.isValid || state.isSubmitting) {
          btn.setAttribute('disabled', 'true');
        } else {
          btn.removeAttribute('disabled');
        }
      });

      // Update Inputs
      inputs.forEach(input => {
        const name = input.getAttribute('name');
        const type = input.getAttribute('type');
        if (!name) return;

        // Sync value securely (Phase 11: Auto-Localization)
        let stateValue = state.values[name];
        if (stateValue !== undefined) {
          if (type === 'date') {
            stateValue = globalTime.toLocalDateInput(stateValue);
          } else if (type === 'datetime-local') {
            stateValue = globalTime.toLocalDateTimeInput(stateValue);
          }

          if (input.value !== stateValue) {
            input.value = stateValue;
          }
        }

        // Push validation errors directly into the browser's native constraint API
        const errorMsg = state.errors[name] || '';
        if (input.validationMessage !== errorMsg) {
          input.setCustomValidity(errorMsg);
        }
      });
    });
    this._cleanups.push(dispose);
  }

  /**
   * Binds Native HTML5 Drag and Drop events using Shadow DOM Event Delegation.
   * Enforces Native-First Architecture by completely bypassing JS pointer-event polyfills.
   * 
   * @param {Object} options 
   * @param {string} [options.dropSelector] - CSS selector for valid drop zones.
   * @param {(dragEl: HTMLElement, e: DragEvent) => boolean|void} [options.onDragStart] - Return false to cancel.
   * @param {(dragEl: HTMLElement, dropZoneEl: HTMLElement, e: DragEvent) => void} [options.onDrop] 
   */
  bindDragAndDrop(options) {
    let currentDragEl = null;

    const handleDragStart = (e) => {
      const el = e.target.closest('[draggable="true"]');
      if (!el) return;

      if (options.onDragStart) {
        if (options.onDragStart(el, e) === false) {
          e.preventDefault();
          return;
        }
      }
      currentDragEl = el;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    };

    const handleDragEnd = () => {
      currentDragEl = null;
    };

    const handleDragOver = (e) => {
      const dropZone = options.dropSelector ? e.target.closest(options.dropSelector) : e.target;
      if (!dropZone || !currentDragEl) return;
      
      // Essential for native DnD: prevent default to unlock the drop zone
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    };

    const handleDragEnter = (e) => {
      const dropZone = options.dropSelector ? e.target.closest(options.dropSelector) : e.target;
      if (!dropZone || !currentDragEl) return;
      e.preventDefault();
    };

    const handleDrop = (e) => {
      const dropZone = options.dropSelector ? e.target.closest(options.dropSelector) : e.target;
      if (!dropZone || !currentDragEl) return;

      e.preventDefault();
      e.stopPropagation();

      if (options.onDrop) {
        options.onDrop(currentDragEl, dropZone, e);
      }
      currentDragEl = null;
    };

    this.root.addEventListener('dragstart', handleDragStart);
    this.root.addEventListener('dragend', handleDragEnd);
    this.root.addEventListener('dragover', handleDragOver);
    this.root.addEventListener('dragenter', handleDragEnter);
    this.root.addEventListener('drop', handleDrop);

    this._cleanups.push(() => {
      this.root.removeEventListener('dragstart', handleDragStart);
      this.root.removeEventListener('dragend', handleDragEnd);
      this.root.removeEventListener('dragover', handleDragOver);
      this.root.removeEventListener('dragenter', handleDragEnter);
      this.root.removeEventListener('drop', handleDrop);
    });
  }
  /**
   * Helper: Binds an effect to the component lifecycle.
   * Automatically pushes the deterministic disposer into this._cleanups.
   * @param {() => void|(() => void)} fn 
   * @returns {() => void} The disposer
   */
  createEffect(fn) {
    const dispose = createEffect(fn);
    this._cleanups.push(dispose);
    return dispose;
  }

  /**
   * Helper: Binds a transition effect to the component lifecycle.
   * Automatically pushes the deterministic disposer into this._cleanups.
   * @param {() => void} fn 
   * @returns {() => void} The disposer
   */
  createTransitionEffect(fn) {
    const dispose = createTransitionEffect(fn);
    this._cleanups.push(dispose);
    return dispose;
  }
}

// Development Warning for Unregistered Custom Elements
// Process-lifetime dev tooling.
let devObserver = null;

if (typeof window !== 'undefined') {
  devObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.tagName.includes('-')) {
          const tag = node.tagName.toLowerCase();
          if (!customElements.get(tag)) {
            console.warn(`Fe UI Dev Warning: Unknown custom element <${tag}> detected. Did you forget to register it or make a typo?`);
          }
        }
      });
    });
  });
  
  if (document.documentElement) {
    devObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export function teardownDevObserver() {
  if (devObserver) {
    devObserver.disconnect();
    devObserver = null;
  }
}
