import { createEffect } from './reactivity.js';
import { globalSharedMap } from './store.js';
import { globalDemandManager } from './data.js';
import { globalTelemetry } from './telemetry.js';
import { globalTheme } from './theme.js';
import { globalTime } from './time.js';

/**
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
    
    createEffect(() => {
      el.textContent = getter();
    });
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

    createEffect(() => {
      const val = getter();
      if (val === null) {
        el.removeAttribute(attribute);
      } else {
        el.setAttribute(attribute, val);
      }
    });
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
  }

  /**
   * Helper: Binds a signal getter to the DOM by morphing an HTML string.
   * This preserves cursor states and focus by surgically diffing the nodes instead of resetting innerHTML.
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

    createEffect(() => {
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
      input.addEventListener('input', (e) => {
        let value = e.target.value;
        
        // Phase 11: Autonomous UTC Serialization
        if (type === 'date') {
          value = globalTime.fromLocalDateInput(value);
        } else if (type === 'datetime-local') {
          value = globalTime.fromLocalDateTimeInput(value);
        }

        formActions.setFieldValue(name, value);
      });


    });

    // 2. Submit Interception
    agForm.addEventListener('submit', (e) => {
      e.preventDefault();
      formActions.submit(onSubmit);
    });

    // Support catching submit bubbles from the native form inside ag-form
    agForm.root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      formActions.submit(onSubmit);
    });

    // 3. Reactive UI Updates (Accessibility & Values)
    createEffect(() => {
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
  }
}

// Development Warning for Unregistered Custom Elements
if (typeof window !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
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
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}
