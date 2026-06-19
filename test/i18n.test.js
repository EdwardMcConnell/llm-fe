import { describe, it, expect, beforeEach } from 'vitest';
import { globalI18n } from '../src/i18n.js';
import { mount, flushMicrotasks } from '../src/testing.js';
import '../src/primitives.js';

describe('Deterministic Localization (Phase 14)', () => {
  beforeEach(() => {
    // Reset state
    globalI18n.setLanguage('en');
    globalI18n.dictionary.set('en', { greeting: 'Hello' });
    globalI18n.dictionary.set('es', { greeting: 'Hola' });
  });

  it('should fall back to English if target language key is missing', () => {
    globalI18n.setLanguage('fr');
    expect(globalI18n.t('greeting')).toBe('Hello');
  });

  it('should return the raw key if totally missing', () => {
    expect(globalI18n.t('missing_key')).toBe('missing_key');
  });

  it('should reactively update <fe-text> when language changes', async () => {
    const text = await mount('fe-text');
    text.setAttribute('t', 'greeting');
    
    await flushMicrotasks();
    
    const node = text.root.querySelector('#text-node');
    expect(node.textContent).toBe('Hello');
    
    // Switch language
    globalI18n.setLanguage('es');
    await flushMicrotasks();
    
    expect(node.textContent).toBe('Hola');
  });

  it('should reactively update <fe-text> when CRDT dictionary syncs', async () => {
    const text = await mount('fe-text');
    text.setAttribute('t', 'dynamic_key');
    
    await flushMicrotasks();
    
    const node = text.root.querySelector('#text-node');
    expect(node.textContent).toBe('dynamic_key'); // totally missing
    
    // Simulate network CRDT patch arriving
    globalI18n.loadTranslations('en', { dynamic_key: 'Network Loaded!' });
    await flushMicrotasks();
    
    expect(node.textContent).toBe('Network Loaded!');
  });
});
