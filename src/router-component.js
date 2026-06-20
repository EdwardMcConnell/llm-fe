import { FeElement } from './component.js';
import { globalRouter } from './router.js';
import { createTransitionEffect } from './reactivity.js';

export class FeRouter extends FeElement {
  constructor() {
    super();
    this.currentLayoutTag = null;
    this.layoutElement = null;
  }

  template() {
    // The router itself has no styling or UI, it just hosts the layout
    return `<div id="router-view"></div>`;
  }

  bind() {
    const viewContainer = this.root.querySelector('#router-view');

    // We use createTransitionEffect so that DOM swaps are hardware-accelerated morphs!
    createTransitionEffect(() => {
      const path = globalRouter.getPath();
      const route = globalRouter.matchRoute(path);

      if (!route) {
        viewContainer.innerHTML = '<h2>404 Not Found</h2>';
        this.currentLayoutTag = null;
        this.layoutElement = null;
        return;
      }

      // Check if we can preserve the current layout (Partial Navigation)
      if (this.currentLayoutTag === route.layout && this.layoutElement) {
        this._updateSlots(route.slots || {});
      } else {
        // Layout changed or no layout exists. We must unmount and build from scratch.
        this.currentLayoutTag = route.layout;
        viewContainer.innerHTML = ''; // Unmount old
        
        this.layoutElement = document.createElement(route.layout);
        this._updateSlots(route.slots || {});
        viewContainer.appendChild(this.layoutElement);
      }
    }, { allowSignalWrites: true });
  }

  /**
   * @private
   * @param {Record<string, string>} newSlots 
   */
  _updateSlots(newSlots) {
    if (!this.layoutElement) return;

    // Remove old slots that are no longer in the new route
    const currentChildren = Array.from(this.layoutElement.children);
    for (const child of currentChildren) {
      const slotName = child.getAttribute('slot');
      if (slotName && newSlots[slotName] !== child.tagName.toLowerCase()) {
        this.layoutElement.removeChild(child);
      }
    }

    // Add or swap new slots
    for (const [slotName, tag] of Object.entries(newSlots)) {
      const existingChild = this.layoutElement.querySelector(`[slot="${slotName}"]`);
      if (existingChild && existingChild.tagName.toLowerCase() === tag.toLowerCase()) {
        // Already exists and matches, do nothing!
        continue;
      }
      
      if (existingChild) {
        this.layoutElement.removeChild(existingChild);
      }

      const newChild = document.createElement(tag);
      newChild.setAttribute('slot', slotName);
      this.layoutElement.appendChild(newChild);
    }
  }
}

customElements.define('fe-router', FeRouter);
