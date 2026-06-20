import { SharedMap } from './crdt.js';

// Generate a unique client ID for this browser tab
const clientId = SharedMap.generateClientId();

/**
 * The global singleton instance of the LLM-Native JSON CRDT.
 * All application state is stored here.
 */
export const globalSharedMap = new SharedMap(clientId);

if (typeof window !== 'undefined') {
  window.globalSharedMap = globalSharedMap;
}
