import { createSignal } from './reactivity.js';
import { SharedMap } from './crdt.js';

class I18nManager {
  constructor() {
    /** @type {SharedMap} */
    this.dictionary = new SharedMap('translations');
    
    const initialLang = (typeof navigator !== 'undefined' && navigator.language) 
      ? navigator.language.split('-')[0] 
      : 'en';
      
    const [getLang, setLang] = createSignal(initialLang);
    this.getLanguage = getLang;
    this.setLanguage = setLang;

    // Reactivity Bridge
    const [getVersion, setVersion] = createSignal(0);
    this.getVersion = getVersion;
    this._triggerUpdate = () => setVersion(getVersion() + 1);
  }

  /**
   * Translates a key based on the current language signal.
   * If the key doesn't exist in the current language, it falls back to 'en'.
   * If it doesn't exist at all, it returns the key itself as a fallback.
   * 
   * @param {string} key 
   * @returns {string}
   */
  t(key) {
    this.getVersion(); // Track dependency for reactivity engine
    const lang = this.getLanguage();
    const langDict = this.dictionary.get(lang);
    
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    
    // Fallback to English
    const enDict = this.dictionary.get('en');
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    
    // Total failure fallback
    throw new Error(`FeI18n: Missing translation key "${key}" for language "${lang}" and no English fallback exists.`);
  }
  
  /**
   * Utility to load a bulk dictionary into the CRDT
   * @param {string} lang 
   * @param {Record<string, string>} translations 
   */
  loadTranslations(lang, translations) {
    const current = this.dictionary.get(lang) || {};
    this.dictionary.set(lang, { ...current, ...translations });
    this._triggerUpdate();
  }
}

export const globalI18n = new I18nManager();
