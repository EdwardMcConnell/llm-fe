/**
 * Phase 12: Autonomous Testing Protocol
 * A frictionless harness for testing Fe UI components in Vitest/JSDOM.
 */

/**
 * Awaits the Javascript microtask queue to allow reactivity and CRDT patches to settle.
 * @returns {Promise<void>}
 */
export async function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Autonomously mounts an Fe Component into the JSDOM document.
 * Returns the instanced element.
 * 
 * @param {string} tagName - The custom element tag name (e.g. 'my-component')
 * @param {Record<string, string>} [attributes={}] - HTML attributes to apply
 * @returns {Promise<HTMLElement>}
 */
export async function mount(tagName, attributes = {}) {
  // Ensure the body is clean
  document.body.innerHTML = '';
  
  const el = document.createElement(tagName);
  
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
  
  document.body.appendChild(el);
  
  // Wait for `connectedCallback` and reactive bindings to initialize
  await flushMicrotasks();
  
  return el;
}

/**
 * Fires a synthetic event on an element and awaits reactivity.
 * 
 * @param {HTMLElement | Element} el - The DOM element
 * @param {string} eventName - e.g. 'click', 'input', 'submit'
 * @param {Record<string, any>} [eventInit={}] - Event parameters
 * @returns {Promise<void>}
 */
export async function fireEvent(el, eventName, eventInit = {}) {
  let event;
  if (eventName.startsWith('key')) {
    event = new KeyboardEvent(eventName, { bubbles: true, cancelable: true, ...eventInit });
  } else if (eventName.startsWith('mouse') || eventName === 'click') {
    event = new MouseEvent(eventName, { bubbles: true, cancelable: true, ...eventInit });
  } else {
    event = new Event(eventName, { bubbles: true, cancelable: true, ...eventInit });
  }
  
  el.dispatchEvent(event);
  
  // Wait for the framework to process the event, update the CRDT, and flush reactivity
  await flushMicrotasks();
}

/**
 * Helper to easily query elements deeply inside a Web Component's Shadow DOM.
 * @param {HTMLElement} rootComponent 
 * @param {string} selector 
 * @returns {HTMLElement | null}
 */
export function queryShadow(rootComponent, selector) {
  if (rootComponent.shadowRoot) {
    return rootComponent.shadowRoot.querySelector(selector);
  }
  return rootComponent.querySelector(selector);
}
